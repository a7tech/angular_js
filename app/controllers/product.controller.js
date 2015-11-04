/*jslint node: true */

'use strict';

var mongoose = require('mongoose');
var Product = mongoose.model('Product');
var Questionnaire = mongoose.model('Questionnaire');
var ChecklistItem = mongoose.model('ChecklistItem');
var Document = mongoose.model('Document');
var Image = mongoose.model('Image');
var config = require('../../config/config');
var sanitizeHtml = require('sanitize-html');

var fs = require('fs');
var mkdirp = require('mkdirp');
var mv = require('mv');

var _ = require('underscore');

var async = require("async");

var sanitizeOpts = {
    allowedTags: [ 'b', 'i', 'em', 'strong', 'a' ],
    allowedAttributes: {
        'a': [ 'href' ]
    }
};

var formatErrors = function(err) {
    var errorsToReport = [];
    var errors = err.errors;
    for (var key in errors) {
        if (errors.hasOwnProperty(key)) {
            errorsToReport.push({msg: key + ': ' + errors[key].message});
        }
    }
    return errorsToReport;
};

exports.list = function(req, res) {
    Product.find().exec(function(err, products) {
        res.send(products);
    });
};

exports.create = function(req, res) {
    if (req.user.isAdmin()) {
        var onProductSaved = function(err, product) {
            if (err) {
                throw new Error(err);
            }

            res.send(product);
        };

        var product = new Product();
        product.save(onProductSaved);
    } else {
        res.send(404);
    }
};

exports.read = function(req, res) {
    var onProductLoaded = function(err, product) {
        if (err) {
            res.send(404);
        }

        if (product) {
            res.send(product);
        } else {
            res.send(404);
        }
    };

    var productId = req.params.productId;
    Product.findOne({_id: productId}).exec(onProductLoaded);
};

exports.update = function(req, res) {
    if (req.user.isAdmin()) {
        var onProductSaved = function(err, product) {
            if (err) {
                throw new Error(err);
            }

            res.send(product);
        };

        var onProductLoaded = function(err, productToUpdate) {
            if (err) {
                throw new Error(err);
            }

            if (productToUpdate) {
                var product = req.body;

                productToUpdate.save(onProductSaved);
            } else {
                res.send(404);
            }
        };

        var productId = req.params.productId;
        Product.findOne({_id: productId}).exec(onProductLoaded);
    } else {
        res.send(404);
    }
};

exports.remove = function(req, res) {
    if (req.user.isAdmin()) {
        // TODO
        res.send(204);
    } else {
        res.send(404);
    }
};

exports.getQuestionnaire = function(req, res) {
    var questionnaireId = req.params.questionnaireId;

    var onProductLoaded = function(err, product) {
        if (err) {
            return res.send(404);
        }

        if (!product) {
            return res.send(404);
        }

        var questionnaire = product.questionnaires.id(questionnaireId);
        return res.send(questionnaire);
    };

    var productId = req.params.productId;
    Product.findOne({
        _id: productId,
        'questionnaires._id': questionnaireId
    }).exec(onProductLoaded);
};

exports.createQuestionnaire = function(req, res) {
    if (req.user.isAdmin()) {
        var onProductSaved = function(err, product) {
            if (err) {
                throw new Error(err);
            }

            var questionnaire = _.last(product.questionnaires);
            res.send(questionnaire);
        };

        var onProductLoaded = function(err, product) {
            var questionnaireData = req.body;

            var questionnaire = new Questionnaire(questionnaireData);
            product.questionnaires.push(questionnaire);
            product.save(onProductSaved);
        };

        var productId = req.params.productId;
        Product.findOne({_id: productId}).exec(onProductLoaded);
    } else {
        res.send(404);
    }
};

exports.updateQuestionnaire = function(req, res) {
    if (req.user.isAdmin()) {
        var questionnaireId = req.params.questionnaireId;

        var onProductSaved = function(err, product) {
            if (err) {
                var errorsToReport = formatErrors(err);
                res.json(400, errorsToReport);
            } else {
                var questionnaire = product.questionnaires.id(questionnaireId);
                res.send(questionnaire);
            }
        };

        var onProductLoaded = function(err, product) {
            if (err) {
                var errorsToReport = formatErrors(err);
                return res.json(400, errorsToReport);
            }

            if (!product) {
                return res.send(404);
            }

            var questionnaireData = req.body;

            var questionnaire = product.questionnaires.id(questionnaireId);
            questionnaire.name = questionnaireData.name;
            questionnaire.categories = questionnaireData.categories;

            _.each(questionnaire.categories, function(category) {
                _.each(category.questions, function(question) {
                    question.instructions = sanitizeHtml(question.instructions, sanitizeOpts);
                });
            });

            product.save(onProductSaved);
        };

        var productId = req.params.productId;
        Product.findOne({
            _id: productId,
            'questionnaires._id': questionnaireId
        }).exec(onProductLoaded);
    } else {
        res.send(404);
    }
};

exports.removeQuestionnaire = function(req, res) {
    var onProductLoaded = function(err, product) {
        var questionnaireId = req.params.questionnaireId;
        product.questionnaires.pull(questionnaireId);
        product.save();
        res.send(204);
    };

    var productId = req.params.productId;
    Product.findOne({_id: productId}).exec(onProductLoaded);
};

exports.progress = function() {

    var uploadDir = config.uploadDir + '/progress';

    return {
        create: function(req, res) {
            if (req.user.isAdmin()) {
                var questionnaireId = req.params.questionnaireId;
                var categoryId = req.params.categoryId;
                var tmp_path = req.files.file.path;

                var onProductSaved = function (err, product) {
                    var questionnaire = product.questionnaires.id(questionnaireId);
                    mkdirp.sync(uploadDir);
                    var category = questionnaire.categories.id(categoryId);
                    var progressImage = category.progress[0];
                    var target_file = uploadDir + "/" + progressImage._id;
                    mv(tmp_path, target_file, function(err) {
                        if (err) throw err;

                        fs.unlink(tmp_path, function() {
                            if (err) throw err;

                            res.send(category.progress);
                        });
                    });
                };

                var onProductLoaded = function(err, product) {
                    var questionnaire = product.questionnaires.id(questionnaireId);
                    if (questionnaire) {
                        var category = questionnaire.categories.id(categoryId);
                        if (category) {
                            if (category.progress.length === 0) {
                                var image = new Image({
                                    name: req.files.file.name,
                                    size: req.files.file.size
                                });

                                category.progress.push(image);

                                product.save(onProductSaved);
                            } else {
                                res.send(409, {msg: 'A progress image already exists'});
                            }
                        } else {
                            res.send(404);
                        }
                    } else {
                        res.send(404);
                    }
                };

                var productId = req.params.productId;
                Product.findOne({_id: productId}).exec(onProductLoaded);
            }
        },
        read: function(req, res) {
            var questionnaireId = req.params.questionnaireId;
            var categoryId = req.params.categoryId;
            var imageId = req.params.imageId;

            var onProductLoaded = function(err, product) {
                var questionnaire = product.questionnaires.id(questionnaireId);
                if (questionnaire) {
                    var category = questionnaire.categories.id(categoryId);
                    if (category) {
                        var image = category.progress.id(imageId);
                        if (image) {
                            res.download(uploadDir + "/" + image._id, image.name);
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

            var productId = req.params.productId;
            Product.findOne({_id: productId}).exec(onProductLoaded);
        },
        delete: function(req, res) {
            if (req.user.isAdmin()) {
                var questionnaireId = req.params.questionnaireId;
                var categoryId = req.params.categoryId;
                var imageId = req.params.imageId;

                var onProductLoaded = function(err, product) {
                    var questionnaire = product.questionnaires.id(questionnaireId);
                    if (questionnaire) {
                        var category = questionnaire.categories.id(categoryId);
                        if (category) {
                            var image = category.progress.id(imageId);
                            if (image) {
                                category.progress.pull(imageId);

                                product.save();
                                res.send(204);
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

                var productId = req.params.productId;
                Product.findOne({_id: productId}).exec(onProductLoaded);
            }
        }
    };
}();

exports.questionnaire = function() {
    return {
        createChecklistItem: function(req, res) {
            if (req.user.isAdmin()) {
                var questionnaireId = req.params.questionnaireId;

                var onProductSaved = function (err, product) {
                    var questionnaire = product.questionnaires.id(questionnaireId);
                    res.send(_.last(questionnaire.checklist));
                };

                var onProductLoaded = function(err, product) {
                    var questionnaire = product.questionnaires.id(questionnaireId);
                    if (questionnaire) {
                        questionnaire.checklist.push(new ChecklistItem(req.body));
                        product.save(onProductSaved);
                    } else {
                        res.send(404);
                    }
                };

                var productId = req.params.productId;
                Product.findOne({_id: productId}).exec(onProductLoaded);
            } else {
                res.send(404);
            }
        },

        getChecklistItem: function(req, res) {
            if (req.user.isAdmin()) {
                var questionnaireId = req.params.questionnaireId;

                var onProductLoaded = function(err, product) {
                    var questionnaire = product.questionnaires.id(questionnaireId);
                    if (questionnaire) {
                        var itemId = req.params.itemId;
                        var item = questionnaire.checklist.id(itemId);
                        if (item) {
                            res.send(item);
                        } else {
                            res.send(404);
                        }
                    } else {
                        res.send(404);
                    }
                };

                var productId = req.params.productId;
                Product.findOne({_id: productId}).exec(onProductLoaded);
            } else {
                res.send(404);
            }
        },

        removeChecklistItem: function(req, res) {
            if (req.user.isAdmin()) {
                var questionnaireId = req.params.questionnaireId;

                var onProductLoaded = function(err, product) {
                    var questionnaire = product.questionnaires.id(questionnaireId);
                    if (questionnaire) {
                        var itemId = req.params.itemId;
                        questionnaire.checklist.pull(itemId);
                        product.save();
                        res.send(204);
                    } else {
                        res.send(404);
                    }
                };

                var productId = req.params.productId;
                Product.findOne({_id: productId}).exec(onProductLoaded);
            } else {
                res.send(404);
            }
        },

        getChecklistItemDocument: function(req, res) {
            var questionnaireId = req.params.questionnaireId;

            var getDocumentById = function(item, documentId) {
                var document = null;
                for (var i = 0; i < item.documents.length; i++) {
                    if (item.documents[i]._id == documentId) {
                        document = item.documents[i];
                        break;
                    }
                }
                return document;
            };

            var onProductLoaded = function(err, product) {
                var questionnaire = product.questionnaires.id(questionnaireId);
                if (questionnaire) {
                    var itemId = req.params.itemId;
                    var item = questionnaire.checklist.id(itemId);
                    if (item) {
                        var documentId = req.params.documentId;
                        var document = getDocumentById(item, documentId);
                        if (document) {
                            var path = config.uploadDir + "/checklist/" + document._id;
                            if (fs.existsSync(path)) {
                                res.download(path, document.name);
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

            var productId = req.params.productId;
            Product.findOne({_id: productId}).exec(onProductLoaded);
        },

        updateChecklistItem: function(req, res) {
            if (req.user.isAdmin()) {
                var questionnaireId = req.params.questionnaireId;
                var itemId = req.params.itemId;

                var onProductSaved = function (err, product) {
                    var questionnaire = product.questionnaires.id(questionnaireId);
                    res.send(questionnaire.checklist.id(itemId));
                };

                var onProductLoaded = function(err, product) {
                    var questionnaire = product.questionnaires.id(questionnaireId);
                    if (questionnaire) {
                        var item = req.body;
                        var itemToUpdate = questionnaire.checklist.id(itemId);

                        itemToUpdate.name = item.name;
                        itemToUpdate.type = item.type;
                        itemToUpdate.description = item.description;
                        itemToUpdate.visible = item.visible;
                        itemToUpdate.completed = item.completed;

                        product.save(onProductSaved);
                    } else {
                        res.send(404);
                    }
                };

                var productId = req.params.productId;
                Product.findOne({_id: productId}).exec(onProductLoaded);
            } else {
                res.send(404);
            }
        },

        uploadChecklistItemDocument: function (req, res) {
            if (req.user.isAdmin()) {
                var itemId = req.params.itemId;
                var questionnaireId = req.params.questionnaireId;
                var productId = req.params.productId;

                var tmp_path = req.files.file.path;
                var nameOfFileToSave = req.files.file.name;
                var target_path = config.uploadDir + "/checklist";

                var onProductSaved = function (err, product) {
                    var questionnaire = product.questionnaires.id(questionnaireId);
                    mkdirp.sync(target_path);
                    var item = questionnaire.checklist.id(itemId);
                    var document = _.last(item.documents);
                    var target_file = target_path + "/" + document._id;
                    mv(tmp_path, target_file, function(err) {
                        if (err) throw err;

                        fs.unlink(tmp_path, function() {
                            if (err) throw err;

                            res.send(item);
                        });
                    });
                };

                var onProductLoaded = function (err, product) {
                    var questionnaire = product.questionnaires.id(questionnaireId);
                    if (questionnaire) {
                        var item = questionnaire.checklist.id(itemId);
                        if (item) {
                            var document = new Document({
                                name: nameOfFileToSave,
                                size: req.files.file.size
                            });
                            item.documents.push(document);
                            product.save(onProductSaved);
                        } else {
                            res.send(404);
                        }
                    } else {
                        res.send(404);
                    }
                };

                Product.findOne({_id: productId}).exec(onProductLoaded);
            } else {
                res.send(404);
            }
        },

        deleteChecklistItemDocument: function(req, res) {
            if (req.user.isAdmin()) {
                var onProductLoaded = function(err, product) {
                    var questionnaireId = req.params.questionnaireId;
                    var questionnaire = product.questionnaires.id(questionnaireId);
                    if (questionnaire) {
                        var itemId = req.params.itemId;
                        var item = questionnaire.checklist.id(itemId);

                        if (item) {
                            var documentId = req.params.documentId;
                            var document = item.documents.id(documentId);
                            if (document) {
                                // files can be linked to questionnaires already started, can't remove files
                                item.documents.pull({_id: documentId});
                                product.save();
                                res.send(204);
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

                var productId = req.params.productId;
                Product.findOne({_id: productId}).exec(onProductLoaded);

            } else {
                res.send(404);
            }
        }
    };
}();