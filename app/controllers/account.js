/*jslint node: true */

'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    Account = mongoose.model('Account');
var Questionnaire = mongoose.model('Questionnaire');
var User = mongoose.model('User');
var Comment = mongoose.model('Comment');
var Product = mongoose.model('Product');
var Package = mongoose.model('Package');
var PackagePayment = mongoose.model('PackagePayment');
var PreparedDocument = mongoose.model('PreparedDocument');
var Document = mongoose.model('Document');
var _ = require('underscore');
var config = require('../../config/config');
var mkdirp = require('mkdirp');
var fs = require('fs');
var mv = require('mv');
var stripe = require("stripe")(config.strip.secret);
var async = require("async");
var mail = require('../services/mail');
var jwt = require('jsonwebtoken');

var getCommentOptions = function(path) {
    return {
        path: path,
        select: 'email name _id created role'
    };
};

exports.create = function(req, res) {
    if (req.user.accounts.length === 0) {
        var account = new Account();
        account.save(function (err, acc) {
            req.user.accounts.push(acc);
            req.user.save(function (err, usr) {
                res.send(usr.accounts);
            });
        });
    } else {
        res.send(409, 'Unable to add account');
    }
};

exports.read = function(req, res) {
    var id = req.params.id;
    Account.findOne({
        _id: id
    }).exec(function (err, account) {
        res.send(account);
    });
};

exports.getQuestionnaire = function(req, res){
    var accountId = req.params.accountId;
    var questionnaireId = req.params.questionnaireId;
    var productId = req.params.productId;

    var onAccountLoaded = function(err, account){
        var product = account.products.id(productId);
        if (product) {
            var questionnaire = product.questionnaires.id(questionnaireId);
            if (questionnaire) {
                res.send(questionnaire);
            } else {
                res.send(404);
            }
        } else {
            res.send(404);
        }
    };

    Account.findOne({
        _id: accountId
    }).exec(onAccountLoaded);
};

// TODO should we use rich objects
// ex. Create a questionnaire object that can do the work
// then allow the questionnaire to be saved separately
// will allow a more object oriented approach. Adds another layer
// that can be used to better manage entities and provides
// a way to unit test business logic
exports.updateQuestionnaire = function(req, res) {
    var accountId = req.params.accountId;
    var questionnaireId = req.params.questionnaireId;
    var productId = req.params.productId;

    var onAccountSaved = function (err, account) {
        if (err) {
            return res.send(400);
        }

        var product = account.products.id(productId);
        var questionnaire = product.questionnaires.id(questionnaireId);
        return res.send(questionnaire);
    };

    var isUpdatableByCustomer = function(status) {
        return status == 'NotStarted' || status == 'InProgress';
    };

    var isStatusTransitionAllowed = function(questionnaire, status) {
        if (questionnaire.status == 'NotStarted') {
            return status == 'InProgress';
        } else if (questionnaire.status == 'InProgress') {
            return status == 'Finished';
        }
        return false;
    };

    var onAccountLoaded = function(err, account) {
        if (err) {
            return res.send(404);
        }

        var product = account.products.id(productId);
        if (product) {
            var questionnaireToUpdate = product.questionnaires.id(questionnaireId);
            if (questionnaireToUpdate) {
                var questionnaire = req.body;
                var previousStatus = questionnaireToUpdate.status;
                if (isUpdatableByCustomer(questionnaireToUpdate.status)) {
                    questionnaireToUpdate.current_category = questionnaire.current_category;
                    questionnaireToUpdate.categories = questionnaire.categories;
                    if (isStatusTransitionAllowed(questionnaireToUpdate, questionnaire.status)) {
                        questionnaireToUpdate.status = questionnaire.status;
                    } else if (questionnaireToUpdate.status == 'NotStarted') {
                        // If the questionnaire is being edited, automatically transition to InProgress
                        questionnaireToUpdate.status = 'InProgress';
                    }
                } else {
                    if (req.user.role == 'Admin') {
                        questionnaireToUpdate.status = questionnaire.status;
                    }
                }

                questionnaireToUpdate.documents = questionnaire.documents;

                // TODO only update completed status
                questionnaireToUpdate.checklist = questionnaire.checklist;
                var itemsById = _.indexBy(questionnaire.checklist._id);
                _.each(questionnaireToUpdate.checklist, function(itemToUpdate) {
                    var item = itemsById[itemToUpdate._id];
                    if (item) {
                        itemToUpdate.completed = item.completed;
                    }
                });

                if (previousStatus != questionnaireToUpdate.status) {
                    if (questionnaire.status == 'Finished') {
                        questionnaireToUpdate.finished_on = new Date();
                        // send email
                        var variables = {
                            user_name: req.user.name,
                            user_email: req.user.email
                        };
                        mail.send(config.email.templates.finish_questionnaire, config.email.admin, variables);
                    } else if (previousStatus == 'Finished'){
                        questionnaireToUpdate.finished_on = null;
                    }
                }

                if (!questionnaireToUpdate.submitted_documents_on &&
                    questionnaire.submitted_documents_on) {
                    questionnaireToUpdate.submitted_documents_on = new Date();
                    product.comments.push(new Comment({
                        text: 'Submitted documents to TAXplan',
                        user: req.user._id
                    }));
                } else if (req.user.isAdmin()) {
                    questionnaireToUpdate.submitted_documents_on = questionnaire.submitted_documents_on;
                }

                return account.save(onAccountSaved);
            } else {
                return res.send(404);
            }
        } else {
            res.send(404);
        }
    };

    Account.findOne({
        _id: accountId
    }).exec(onAccountLoaded);
};

exports.getChecklistItemDocument =  function(req, res) {
    var questionnaireId = req.params.questionnaireId;
    var productId = req.params.productId;
    var accountId = req.params.accountId;
    var itemId = req.params.itemId;
    var documentId = req.params.documentId;

    var onAccountLoaded = function(err, account) {
        if (err) {
            return res.json(400, err.toString());
        }

        if (!account) {
            return res.send(404);
        }

        var product = account.products.id(productId);
        var questionnaire = product.questionnaires.id(questionnaireId);
        var item = questionnaire.checklist.id(itemId);
        var document = item.documents.id(documentId);

        var path = config.uploadDir + "/checklist/" + document._id;
        if (fs.existsSync(path)) {
            res.download(path, document.name);
        } else {
            res.send(404);
        }
    };

    Account.findOne({
        _id: accountId,
        "products._id": productId,
        "products.questionnaires._id": questionnaireId,
        "products.questionnaires.checklist._id": itemId,
        "products.questionnaires.checklist.documents._id": documentId
    }).exec(onAccountLoaded);

};

// TODO deprecate, update individual questionnaires
exports.updateQuestionnaires = function(req, res) {
    if (req.user) {
        var id = req.params.id;
        var questionnaires = req.body;
        Account.findOne({
            _id: id
        }).exec(function (err, account) {
                var questionnaireToSave = new Questionnaire(questionnaires[0]);
                account.questionnaires = [questionnaireToSave];
                account.save(function (err, account) {
                    res.send(account);
                });
            });
    } else {
        res.send(404);
    }
};

exports.getCommentsOnProduct = function(req, res) {
    var offset = req.query.offset || 0;
    var productId = req.params.productId;
    var accountId = req.params.accountId;

    async.waterfall([
        function(callback) {
            Account.findOne({
                _id: accountId,
                'products._id': productId
            }).exec(callback);
        },
    ], function(err, account) {
        if (err) {
            return res.json(409, new Error(err.toString()));
        }

        if (!account) {
            return res.json(400);
        }

        var product = account.products.id(productId);

        var opts = getCommentOptions('user');
        var comments = product.comments.slice(offset, offset + 5);
        Comment.populate(comments, opts, function(err, comments) {
            return res.json(comments);
        });
    });
};

exports.addCommentToProduct = function(req, res) {
    var productId = req.params.productId;
    var accountId = req.params.accountId;

    var accountBelongsToUser = function() {
        return req.user.accounts.indexOf(accountId) >= 0;
    };

    var onAccountSaved = function(err, account) {
        if (err) {
            throw new Error(err);
        }

        async.parallel({
                ownersOfAccount: function(callback) {
                    User.find({'accounts': {
                        $in: [accountId]
                    }}).exec(callback);
                },
                comment: function(callback) {
                    var opts = getCommentOptions('user');
                    var comment = _.last(account.products.id(productId).comments);
                    Comment.populate(comment, opts, callback);
                }
            },
            function(err, results) {
                var variables = {
                    comment: results.comment.text,
                    commenter: results.comment.user.name,
                    login_url: config.domain + '/#!/login'
                };
                var asyncTasks = [];
                var recipients = [];

                if (accountBelongsToUser()) {
                    recipients = [{
                        name: 'TAXplan',
                        email: config.email.admin
                    }];
                } else {
                    recipients = results.ownersOfAccount;
                }

                if (recipients) {
                    recipients.forEach(function(recipient) {
                        asyncTasks.push(function(callback) {
                            variables.name = recipient.name;
                            mail.send(config.email.templates.comment, recipient.email, variables, callback);
                        });
                    });
                }

                async.parallel(asyncTasks, function(err, results) {
                    // TODO do something in the future
                });

                res.send(results.comment);
            }
        );
    };

    var addCommentToProduct = function(product) {
        var commentData = _.pick(req.body, 'text', 'documents');
        commentData.user = req.user._id;
        var comment = new Comment(commentData);

        product.comments.push(comment);
    };

    var onAccountLoaded = function(err, account) {
        if (err || !account) {
            res.send(404);
        }

        var product = account.products.id(productId);
        addCommentToProduct(product);
        account.save(onAccountSaved);
    };

    req.checkBody('text', 'text not provided').notEmpty();
    var errors = req.validationErrors();
    if (errors) {
        res.send(400, errors);
    } else if (accountBelongsToUser() || req.user.role == 'Admin') {
        Account.findOne({
            _id: accountId,
            'products._id': productId
        }).exec(onAccountLoaded);
    } else {
        res.send(404);
    }
};

/**
 * Returns
 */

exports.getProduct = function(req, res) {
    var accountId = req.params.accountId;

    var onAccountLoaded = function(err, account) {
        var returnId = req.params.returnId;
        if (account) {
            var taxReturn = account.products.id(returnId);
            if (taxReturn) {
                var opts = getCommentOptions('comments.user');
                Product.populate(taxReturn, opts, function(err, product) {
                    res.send(product);
                });
            } else {
                res.send(404);
            }
        } else {
            res.send(404);
        }
    };

    Account.findOne({
        _id: accountId
    }).exec(onAccountLoaded);
};

exports.updateProduct = function(req, res) {
    var returnId = req.params.returnId;

    var onAccountSaved = function(err, account) {
        var taxReturn = account.products.id(returnId);
        res.send(taxReturn);
    };

    var onAccountLoaded = function(err, account) {
        if (account) {
            var product = req.body;
            var productToUpdate = account.products.id(returnId);

            account.save(onAccountSaved);
        } else {
            res.send(404);
        }
    };

    var accountId = req.params.accountId;
    Account.findOne({
        _id: accountId
    }).exec(onAccountLoaded);
};

exports.addProduct = function(req, res) {
    var onAccountSaved = function(err, account) {
        res.send(_.last(account.products));
    };

    var onAccountLoaded = function(err, account) {
        var onProductLoaded = function(err, product) {
            if (err) {
                throw new Error(err);
            }

            if (product) {
                var taxReturn = new Product(product);
                account.products.push(taxReturn);
                account.save(onAccountSaved);
            } else {
                res.send(404);
            }
        };

        if (account) {
            Product.findOne({_id: req.query.productId}).exec(onProductLoaded);
        } else {
            res.send(404);
        }
    };

    var accountId = req.params.accountId;
    Account.findOne({
        _id: accountId
    }).exec(onAccountLoaded);
};

exports.packages = function() {
    var getTotalCostOfPackage = function(packg) {
        var total = 0;
        var lineItemCosts = _.pluck(packg.line_items, 'cost');
        if (lineItemCosts.length > 0) {
            total = _.reduce(lineItemCosts, function(memo, num){ return memo + num; });
        }
        return total;
    };

    return {
        pay: function(req, res) {
            var productId = req.params.productId;
            var packageId = req.params.packageId;

            var onAccountSaved = function(err, account) {
                var product = account.products.id(productId);
                var packg = product.packages.id(packageId);
                var payment = _.last(account.payments);
                var variables = {
                    user_name: req.user.name,
                    user_email: req.user.email,
                    amount: payment.amount,
                    brand: payment.brand,
                    package_name: packg.name
                };
                mail.send(config.email.templates.payment, config.email.admin, variables);

                res.send(200, packg);
            };

            var onAccountLoaded = function(err, account) {
                if (account) {
                    var product = account.products.id(productId);
                    if (product) {
                        var packg = product.packages.id(packageId);
                        if (packg.purchased) {
                            res.send(200, packg);
                        } else {
                            var total = getTotalCostOfPackage(packg);

                            var stripeToken = req.body;

                            stripe.charges.create({
                                amount: Math.round(total * 100), // amount in cents
                                currency: "cad",
                                source: stripeToken.id,
                                description: "Tax Return"
                            }, function(err, charge) {
                                console.log(err, charge);
                                if (err && err.type === 'StripeCardError') {
                                    res.send(400);
                                } else if (err && err.type === 'StripeInvalidRequest') {
                                    res.send(400);
                                } else {
                                    var payment = new PackagePayment({
                                        charge_id: charge.source.id,
                                        amount: total,
                                        brand: charge.source.brand,
                                        funding: charge.source.funding,
                                        last4: charge.source.last4,
                                        name: charge.source.name,
                                        'package': packg._id
                                    });
                                    account.payments.push(payment);
                                    packg.purchased = true;
                                    account.save(onAccountSaved);
                                }
                            });
                        }
                    } else {
                        res.send(404);
                    }
                } else {
                    res.send(404);
                }
            };

            var accountId = req.params.accountId;
            Account.findOne({
                _id: accountId
            }).exec(onAccountLoaded);
        },
        read: function(req, res) {
            var accountId = req.params.accountId;
            var productId = req.params.productId;
            var packageId = req.params.packageId;

            var onAccountLoaded = function(err, account) {
                if (account) {
                    var product = account.products.id(productId);
                    if (product) {
                        var packg = product.packages.id(packageId);
                        if (packg) {
                            res.send(packg);
                        } else {
                            res.send(404);
                        }
                    } else {
                        res.send(404);
                    }
                } else {
                    res.send(404);
                }
            };

            Account.findOne({
                _id: accountId
            }).exec(onAccountLoaded);
        },
        del: function(req, res) {
            var accountId = req.params.accountId;
            var productId = req.params.productId;
            var packageId = req.params.packageId;

            var onAccountLoaded = function(err, account) {
                if (account) {
                    var product = account.products.id(productId);
                    if (product) {
                        var packg = product.packages.id(packageId);
                        if (packg.purchased) {
                            res.send(409, {msg: 'Cannot alter a purchased package'});
                        } else {
                            product.packages.pull(packageId);
                            account.save();
                            res.send(204);
                        }
                    } else {
                        res.send(404);
                    }
                } else {
                    res.send(404);
                }
            };

            if (req.user.isAdmin()) {
                Account.findOne({
                    _id: accountId
                }).exec(onAccountLoaded);
            } else {
                res.send(404);
            }
        },
        update: function(req, res) {
            var accountId = req.params.accountId;
            var productId = req.params.productId;
            var packageId = req.params.packageId;

            var onAccountSaved = function(err, account) {
                var product = account.products.id(productId);
                var packg = product.packages.id(packageId);
                res.send(packg);
            };

            var onAccountLoaded = function(err, account) {
                if (account) {
                    var product = account.products.id(productId);
                    if (product) {
                        var packg = req.body;
                        var packageToUpdate = product.packages.id(packageId);

                        if (req.user.isAdmin()) {
                            packageToUpdate.name = packg.name;
                            packageToUpdate.purchased = packg.purchased;
                            packageToUpdate.line_items = packg.line_items;

                            // TODO write tests
                            var preparedDocuments = _.indexBy(packg.preparedDocuments, '_id');
                            _.each(packageToUpdate.preparedDocuments, function(preparedDocument) {
                                var document = preparedDocuments[preparedDocument._id];
                                preparedDocument.requiresSignature = document.requiresSignature;
                            });
                        }

                        account.save(onAccountSaved);
                    } else {
                        res.send(404);
                    }
                } else {
                    res.send(404);
                }
            };

            Account.findOne({
                _id: accountId
            }).exec(onAccountLoaded);
        },
        create: function(req, res) {

            var accountId = req.params.accountId;
            var productId = req.params.productId;

            var onAccountSaved = function(err, account) {
                var product = account.products.id(productId);
                res.send(_.last(product.packages));
            };

            var onAccountLoaded = function(err, account) {
                if (account) {
                    var product = account.products.id(productId);
                    if (product) {
                        var packg = req.body;
                        product.packages.push(packg);
                        account.save(onAccountSaved);
                    } else {
                        res.send(404);
                    }
                } else {
                    res.send(404);
                }
            };

            Account.findOne({
                _id: accountId
            }).exec(onAccountLoaded);
        }
    };
}();

exports.packages.items = function() {
    var getTargetFilePath = function() {
        return config.uploadDir + '/prepared_documents';
    };

    return {
        del: function(req, res) {
            var accountId = req.params.accountId;
            var productId = req.params.productId;
            var packageId = req.params.packageId;
            var itemId = req.params.itemId;

            var onAccountLoaded = function(err, account) {
                if (err) {
                    return res.json(409, new Error(err.toString()));
                }

                if (!account) {
                    return res.send(404);
                }

                var product = account.products.id(productId);
                if (!product) {
                    return res.send(404);
                }

                var packg = product.packages.id(packageId);
                if (!packg) {
                    return res.send(404);
                }

                var item = packg.preparedDocuments.id(itemId);
                if (!item) {
                    return res.send(404);
                }

                var qualifiedFile = getTargetFilePath() + "/" + item._id;
                fs.unlink(qualifiedFile, function () {
                    if (err) throw err;

                    packg.preparedDocuments.pull(itemId);
                    account.save();

                    res.send(204);
                });
            };

            Account.findOne({
                _id: accountId
            }).exec(onAccountLoaded);
        },
        add: function(req, res) {
            var accountId = req.params.accountId;
            var productId = req.params.productId;
            var packageId = req.params.packageId;

            var onAccountSaved = function(err, account) {
                var product = account.products.id(productId);
                var packg = product.packages.id(packageId);
                var item = _.last(packg.preparedDocuments);

                var tmp_path = req.files.file.path;
                var target_path = getTargetFilePath();
                var target_file = target_path + "/" + item._id;

                mkdirp.sync(target_path);
                mv(tmp_path, target_file, function(err) {
                    if (err) throw err;

                    fs.unlink(tmp_path, function() {
                        if (err) throw err;

                        res.send(packg.preparedDocuments);
                    });
                });
            };

            var onAccountLoaded = function(err, account) {
                if (err) {
                    return res.json(409, new Error(err.toString()));
                }

                if (!account) {
                    return res.send(404);
                }

                var product = account.products.id(productId);
                if (!product) {
                    return res.send(404);
                }

                var packg = product.packages.id(packageId);
                if (!packg) {
                    return res.send(404);
                }

                var document = new PreparedDocument({
                    name: req.files.file.name,
                    size: req.files.file.size,
                    uploaded: new Date()
                });
                packg.preparedDocuments.push(document);
                account.save(onAccountSaved);
            };

            // TODO for some reason this doesn't work when ading multiple ids
            Account.findOne({
                _id: accountId,
            }).exec(onAccountLoaded);
        },
        get: function(req, res) {
            var accountId = req.params.accountId;
            var productId = req.params.productId;
            var packageId = req.params.packageId;
            var itemId = req.params.itemId;

            var onAccountLoaded = function(err, account) {
                if (err) {
                    return res.json(409, new Error(err.toString()));
                }

                if (!account) {
                    return res.send(404);
                }

                var product = account.products.id(productId);
                var packg = product.packages.id(packageId);
                var item = packg.preparedDocuments.id(itemId);
                if (packg.purchased || item.requiresSignature) {
                    var filePath = getTargetFilePath();
                    res.download(filePath + "/" + item._id, item.name);
                } else {
                    res.send(404);
                }
            };

            Account.findOne({
                _id: accountId,
                'products._id': productId,
                'products.packages._id': packageId,
                'products.packages.preparedDocuments._id': itemId
            }).exec(onAccountLoaded);
        }
    };
}();

exports.packages.signatures = function() {
    var getSignatureUploadDir = function() {
        return config.uploadDir + '/signatures';
    };
    var getSignatureFilePath = function(signatureId) {
        return  getSignatureUploadDir() + '/' + signatureId;
    };

    return {
        getSignature: function(req, res) {
            var productId = req.params.productId;
            var packageId = req.params.packageId;
            var itemId = req.params.itemId;
            var signatureId = req.params.signatureId;
            var accountId = req.params.accountId;

            var onAccountLoaded = function(err, account) {
                if (err) {
                    return res.json(409, new Error(err.toString()));
                }

                if (!account) {
                    return res.send(404);
                }

                var product = account.products.id(productId);
                var packg = product.packages.id(packageId);
                var item = packg.preparedDocuments.id(itemId);
                var signature = item.signatures.id(signatureId);

                res.download(getSignatureFilePath(signature.id), signature.name);
            };

            Account.findOne({
                _id: accountId,
                'products._id': productId,
                'products.packages._id': packageId,
                'products.packages.preparedDocuments._id': itemId,
                'products.packages.preparedDocuments.signatures._id': signatureId
            }).exec(onAccountLoaded);
        },
        updateSignature: function(req, res) {
            var onAccountLoaded = function(err, account) {
                var productId = req.params.productId;
                var product = account.products.id(productId);
                if (product) {
                    var packageId = req.params.packageId;
                    var packg = product.packages.id(packageId);
                    if (packg) {
                        var itemId = req.params.itemId;
                        var item = packg.preparedDocuments.id(itemId);
                        if (item) {
                            var signatureId = req.params.signatureId;
                            var signature = item.signatures.id(signatureId);
                            if (signature) {
                                var signatureToSave = req.body;
                                if (signatureToSave) {
                                    if (req.user.isAdmin()) {
                                        signature.verified = signatureToSave.verified;
                                    }
                                    account.save(function(err, account) {
                                        res.send(signature);
                                    });
                                } else {
                                    res.send(400);
                                }
                            } else {
                                res.send(404);
                            }
                        } else {
                            res.send(404);
                        }
                    } else {
                        res.send(404);
                    }

                } else {
                    res.send(404);
                }
            };

            var accountId = req.params.accountId;
            Account.findOne({_id: accountId}).exec(onAccountLoaded);
        },
        deleteSignature: function(req, res) {
            var accountId = req.params.accountId;
            var productId = req.params.productId;
            var packageId = req.params.packageId;
            var itemId = req.params.itemId;

            var onAccountLoaded = function(err, account) {
                var product = account.products.id(productId);
                if (product) {
                    var packg = product.packages.id(packageId);
                    if (packg) {
                        var item = packg.preparedDocuments.id(itemId);
                        if (item) {
                            var signatureId = req.params.signatureId;
                            var signature = item.signatures.id(signatureId);
                            if (signature) {
                                if (!signature.verified || req.user.isAdmin()) {
                                    fs.unlink(getSignatureFilePath(signature.id), function () {
                                        if (err) throw err;

                                        item.signatures.pull(signatureId);
                                        account.save();

                                        res.send(204);
                                    });
                                } else {
                                    res.send(400, {msg: 'Cannot remove a verified signature'});
                                }
                            } else {
                                res.send(404);
                            }
                        } else {
                            res.send(404);
                        }
                    } else {
                        res.send(404);
                    }
                } else {
                    res.send(404);
                }
            };

            Account.findOne({_id: accountId}).exec(onAccountLoaded);
        },
        addSignature: function(req, res) {
            var accountId = req.params.accountId;
            var productId = req.params.productId;
            var packageId = req.params.packageId;
            var itemId = req.params.itemId;

            var nameOfFileToSave = req.files.file.name;

            var onAccountSaved = function(err, account) {
                mkdirp.sync(getSignatureUploadDir());
                var product = account.products.id(productId);
                var packg = product.packages.id(packageId);
                var preparedDocument = packg.preparedDocuments.id(itemId);
                var signature = _.last(preparedDocument.signatures);

                var tmp_path = req.files.file.path;
                mv(tmp_path, getSignatureFilePath(signature._id), function(err) {
                    if (err) throw err;

                    fs.unlink(tmp_path, function() {
                        if (err) throw err;
                        res.send(preparedDocument.signatures);
                    });
                });
            };

            var onAccountLoaded = function(err, account) {
                var product = account.products.id(productId);
                if (product) {
                    var packg = product.packages.id(packageId);
                    if (packg) {
                        var preparedDocument = packg.preparedDocuments.id(itemId);
                        var signature = new Document({
                            name: nameOfFileToSave,
                            size: req.files.file.size,
                            uploaded: new Date()
                        });
                        preparedDocument.signatures.push(signature);

                        account.save(onAccountSaved);
                    } else {
                        res.send(404);
                    }

                } else {
                    res.send(404);
                }
            };

            Account.findOne({_id: accountId}).exec(onAccountLoaded);
        }
    };
}();

/**
 * Notifications
 */

exports.notifications = function() {
    return {
        update: function(req, res) {
            var productId = req.params.productId;
            var notificationId = req.params.notificationId;

            var onAccountSaved = function(err, account) {
                var product = account.products.id(productId);
                var notification = product.notifications.id(notificationId);
                res.send(notification);
            };

            var onAccountLoaded = function(err, account) {
                if (account) {
                    var product = account.products.id(productId);
                    var notification = req.body;
                    var notificationToUpdate = product.notifications.id(notificationId);

                    if (notificationToUpdate) {
                        if (notification.hasOwnProperty('enabled')) {
                            notificationToUpdate.enabled = notification.enabled;
                        }
                        account.save(onAccountSaved);
                    } else {
                        res.send(404);
                    }
                } else {
                    res.send(404);
                }
            };

            var accountId = req.params.accountId;
            Account.findOne({
                _id: accountId
            }).exec(onAccountLoaded);
        }
    };
}();

exports.questionnaires = function() {
    return {

    };
}();

exports.questionnaires.documents = function() {
    var getTargetFilePath = function(accountId, questionnaireId) {
        return config.uploadDir + "/a-" + accountId + "/qnr-" + questionnaireId;
    };

    var getUser = function(token, done) {
        jwt.verify(token, config.secret, function(err, decoded) {
            User.findOne({ email: decoded.email }, function (err, user) {
                if (err) {
                    return done(err);
                }

                if (!user) {
                    return done(null, false); //no such user
                } else {
                    return done(null, user); //allows the call chain to continue to the intended route
                }
            });
        });
    };

    return {
        get: function (req, res) {
            var accountId = req.params.accountId;
            var productId = req.params.productId;
            var questionnaireId = req.params.questionnaireId;

            var onAccountLoaded = function (err, account) {
                if (err) {
                    return res.json(409, new Error(err.toString()));
                }

                if (!account) {
                    return res.send(404);
                }

                var product = account.products.id(productId);
                var questionnaire = product.questionnaires.id(questionnaireId);
                res.send(questionnaire.documents);
            };

            Account.findOne({
                _id: accountId,
                "products._id": productId,
                "products.questionnaires._id": questionnaireId
            }).exec(onAccountLoaded);
        },
        add: function (req, res) {
            var accountId = req.params.accountId;
            var productId = req.params.productId;
            var questionnaireId = req.params.questionnaireId;

            var tmp_path = req.files.file.path;
            var target_path = getTargetFilePath(accountId, questionnaireId);

            var onAccountSaved = function(err, account) {
                var product = account.products.id(productId);
                var questionnaire = product.questionnaires.id(questionnaireId);
                var document = _.last(questionnaire.documents);
                var target_file = target_path + "/" + document._id;

                mkdirp.sync(target_path);
                mv(tmp_path, target_file, function(err) {
                    if (err) throw err;

                    fs.unlink(tmp_path, function() {
                        if (err) throw err;

                        var variables = {
                            user_name: req.user.name,
                            user_email: req.user.email,
                            document_name: document.name
                        };
                        mail.send(config.email.templates.document_uploaded, config.email.admin, variables);

                        res.send(200);
                        // document_uploaded
                    });
                });
            };

            var onAccountLoaded = function (err, account) {
                if (err) {
                    return res.json(409, new Error(err.toString()));
                }

                if (!account) {
                    return res.send(404);
                }

                var product = account.products.id(productId);
                var questionnaire = product.questionnaires.id(questionnaireId);
                var nameOfFileToSave = req.files.file.name;
                var document = new Document({
                    name: nameOfFileToSave,
                    size: req.files.file.size,
                    uploaded: new Date()
                });
                questionnaire.documents.push(document);

                account.save(onAccountSaved);
            };

            var token = req.body.token;

            getUser(token, function(err, user) {
                if (err) {
                    return res.json(409, new Error(err.toString()));
                }

                if (!user) {
                    return res.send(404);
                }

                req.user = user;
                Account.findOne({
                    _id: accountId,
                    "products._id": productId,
                    "products.questionnaires._id": questionnaireId
                }).exec(onAccountLoaded);
            });
        }
    };
}();