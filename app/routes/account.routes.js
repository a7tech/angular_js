/*jslint node: true */

'use strict';

// User routes use users controller
var account = require('../controllers/account');
var fs = require('fs');
var mv = require('mv');
var config = require('../../config/config');
var mkdirp = require('mkdirp');
var _ = require('underscore');
var mongoose = require('mongoose'),
    Account = mongoose.model('Account');
var User = mongoose.model('User');
var Questionnaire = mongoose.model('Questionnaire');
var Document = mongoose.model('Document');
var PDFDocument = require('pdfkit');
var htmlparser = require("htmlparser2");

module.exports = function(app, passport) {
    var getTargetFilePath = function(accountId, questionnaireId) {
        return config.uploadDir + "/a-" + accountId + "/qnr-" + questionnaireId;
    };

    app.get('/accounts/:id', passport.authenticate('bearer', { session: false }), account.read);
    app.post('/accounts', passport.authenticate('bearer', { session: false }), account.create);
    app.put('/accounts/:id/questionnaires', passport.authenticate('bearer', { session: false }), account.updateQuestionnaires);

    // package documents
    app.get('/accounts/:accountId/products/:productId/packages/:packageId/items/:itemId', account.packages.items.get);
    app.delete('/accounts/:accountId/products/:productId/packages/:packageId/items/:itemId', passport.authenticate('bearer', { session: false }), account.packages.items.del);
    app.post('/accounts/:accountId/products/:productId/packages/:packageId/items', passport.authenticate('bearer', { session: false }), account.packages.items.add);
    // package document signatures
    app.get('/accounts/:accountId/products/:productId/packages/:packageId/items/:itemId/signatures/:signatureId', account.packages.signatures.getSignature);
    app.delete('/accounts/:accountId/products/:productId/packages/:packageId/items/:itemId/signatures/:signatureId', passport.authenticate('bearer', { session: false }), account.packages.signatures.deleteSignature);
    app.put('/accounts/:accountId/products/:productId/packages/:packageId/items/:itemId/signatures/:signatureId', passport.authenticate('bearer', { session: false }), account.packages.signatures.updateSignature);
    app.post('/accounts/:accountId/products/:productId/packages/:packageId/items/:itemId/signatures', passport.authenticate('bearer', { session: false }), account.packages.signatures.addSignature);
    // package
    app.get('/accounts/:accountId/products/:productId/packages/:packageId', passport.authenticate('bearer', { session: false }), account.packages.read);
    app.put('/accounts/:accountId/products/:productId/packages/:packageId', passport.authenticate('bearer', { session: false }), account.packages.update);
    app.delete('/accounts/:accountId/products/:productId/packages/:packageId', passport.authenticate('bearer', { session: false }), account.packages.del);
    app.post('/accounts/:accountId/products/:productId/packages', passport.authenticate('bearer', { session: false }), account.packages.create);
    // package payment
    app.post('/accounts/:accountId/products/:productId/packages/:packageId/payments', passport.authenticate('bearer', { session: false }), account.packages.pay);

    app.get('/accounts/:accountId/products/:productId/questionnaires/:questionnaireId', passport.authenticate('bearer', { session: false }), account.getQuestionnaire);
    app.put('/accounts/:accountId/products/:productId/questionnaires/:questionnaireId', passport.authenticate('bearer', { session: false }), account.updateQuestionnaire);
    app.post('/accounts/:accountId/products/:productId/comments', passport.authenticate('bearer', { session: false }), account.addCommentToProduct);
    app.get('/accounts/:accountId/products/:productId/comments', passport.authenticate('bearer', { session: false }), account.getCommentsOnProduct);

    app.get('/accounts/:accountId/products/:returnId', passport.authenticate('bearer', { session: false }), account.getProduct);
    app.put('/accounts/:accountId/products/:returnId', passport.authenticate('bearer', { session: false }), account.updateProduct);
    app.post('/accounts/:accountId/products', passport.authenticate('bearer', { session: false }), account.addProduct);

    // Notifications
    app.put('/accounts/:accountId/products/:productId/notifications/:notificationId', passport.authenticate('bearer', { session: false }), account.notifications.update);

    app.get('/accounts/:accountId/products/:productId/questionnaires/:questionnaireId/checklist/:itemId/documents/:documentId', account.getChecklistItemDocument);

    app.get('/accounts/:accountId/products/:productId/questionnaires/:questionnaireId/checklist', function(req, res) {
        var accountId = req.params.accountId;
        var questionnaireId = req.params.questionnaireId;
        Account.findOne({_id: accountId}).exec(function(err, account) {
            if (account) {
                var productId = req.params.productId;
                var product = account.products.id(productId);
                if (product) {
                    var questionnaire = product.questionnaires.id(questionnaireId);

                    var doc = new PDFDocument({
                        Title: 'Export'
                    });

                    res.writeHead(200, {
                        'Content-Type': 'application/pdf',
                        'Access-Control-Allow-Origin': '*',
                        'Content-Disposition': 'attachment; filename=checklist.pdf'
                    });

                    doc.pipe(res);
                    doc.fontSize(14);
                    doc.moveDown();
                    doc.text('My TAXitem Checklist', {align: 'center'});
                    doc.moveDown();
                    doc.fontSize(12);
                    doc.text('This checklist is a guide based on the answers from your TAXprofile.  If there are other items you feel are relevant please send them as well.  You can upload and send us the items that apply to you by attaching them along with a comment on My Discussion Board.');
                    doc.moveDown();
                    var indent = doc.x + 20;
                    var checklistItems = _.filter(questionnaire.checklist, function(item) { return item.triggered_by.length > 0 || item.visible; });
                    _.each(checklistItems, function(item) {
                        doc.fontSize(12);
                        var r = Math.round((doc._font.ascender / 1000 * doc._fontSize) / 3);
                        doc.rect(indent + r - 20, doc.y, 10, 10).stroke();
                        doc.text(item.name, indent);
                        doc.fontSize(10);
                        doc.text(item.description, indent);
                        doc.moveDown();
                    });

                    doc.end();
                } else {
                    res.send(404);
                }
            } else {
                res.send(404);
            }
        });
    });

    var getInstructionAsText = function(question) {
        var instructions = '';
        var parser = new htmlparser.Parser({
            onopentag: function(name, attribs){
                if (name === 'a') {
                    instructions += "(" + attribs.href + ") ";
                }
            },
            ontext: function(text){
                instructions += text;
            },
            onclosetag: function(tagname){
            }
        });
        parser.write(question.instructions);
        parser.end();
        return instructions;
    };

    // TODO figure out how to write tests for this
    app.get('/accounts/:accountId/products/:productId/questionnaires/:questionnaireId/export', function(req, res) {
        var accountId = req.params.accountId;
        var questionnaireId = req.params.questionnaireId;
        User.findOne({"accounts": accountId}).exec(function(err, user) {
            Account.findOne({_id: accountId}).exec(function(err, account) {
                if (account._id == accountId) {
                    var productId = req.params.productId;
                    var product = account.products.id(productId);
                    if (product) {
                        var questionnaire = product.questionnaires.id(questionnaireId);

                        var doc = new PDFDocument({
                            Title: 'Export'
                        });

                        res.writeHead(200, {
                            'Content-Type': 'application/pdf',
                            'Access-Control-Allow-Origin': '*',
                            'Content-Disposition': 'attachment; filename=questionnaire.pdf'
                        });

                        doc.pipe(res);

                        doc.fontSize(16);
                        doc.text(user.name);
                        doc.fontSize(14);
                        doc.text(user.email);
                        doc.moveDown();
                        doc.fontSize(12);
                        if (user.address) {
                            doc.text(user.address);
                        }
                        doc.moveDown();
                        doc.moveDown();

                        doc.fontSize(18);
                        doc.text(questionnaire.name);
                        _.each(questionnaire.categories, function(category) {
                            if (category.hasQuestionWithAnswer()) {
                                doc.fontSize(14);
                                doc.text(category.name);
                                var questions = _.filter(category.questions, function(question) { return question.triggered_by.length > 0 || question.visible; });
                                _.each(questions, function(question, index) {
                                    if (question.hasAnswer()) {
                                        doc.fontSize(12);
                                        var questionNumber = (index + 1);
                                        doc.text(questionNumber + ". " + question.text);

                                        if (question.instructions) {
                                            doc.text(getInstructionAsText(question));
                                        }

                                        _.each(question.answer, function(answer) {

                                            if (answer.valueLabels.length > 0) {
                                                if (answer.type == 'Date') {
                                                    doc.text(answer.valueLabels[0]);
                                                    var year = answer.value[0] || '-';
                                                    var month = answer.value[1];
                                                    if (month) {
                                                        month = parseInt(month) + 1;
                                                    } else {
                                                        month = '-';
                                                    }
                                                    var day = answer.value[2] || '-';
                                                    doc.text(year + '/' + month + '/' + day);
                                                } else {
                                                    _.each(answer.valueLabels, function(label, index) {
                                                        doc.text(label);
                                                        var value = answer.value[index];
                                                        if (value) {
                                                            doc.text(value);
                                                        }
                                                    });
                                                }
                                            } else {
                                                _.each(answer.value, function(value, index) {
                                                    var label = answer.valueLabels[index];
                                                    if (label) {
                                                        doc.text(label);
                                                    }
                                                    doc.text(value);
                                                });
                                            }

                                            if (answer.value.length === 0) {
                                                doc.text("-");
                                            }
                                            doc.moveDown();
                                        });
                                    }
                                });
                            }
                        });

                        doc.end();
                    } else {
                        res.send(404);
                    }
                } else {
                    res.send(404);
                }
            });
        });

    });

    app.get('/accounts/:accountId/products/:productId/questionnaires/:questionnaireId/documents/:documentId', function(req, res) {
        var accountId = req.params.accountId;
        var productId = req.params.productId;
        var questionnaireId = req.params.questionnaireId;
        var documentId = req.params.documentId;

        var onAccountLoaded = function (err, account) {
            if (err) {
                return res.json(409, new Error(err.toString()));
            }

            if (!account) {
                return res.send(404);
            }

            var product = account.products.id(productId);
            var questionnaire = product.questionnaires.id(questionnaireId);
            var document = questionnaire.documents.id(documentId);
            var filePath = getTargetFilePath(accountId, questionnaireId);
            return res.download(filePath + "/" + document._id, document.name);
        };

        Account.findOne({
            "_id": accountId,
            "products._id": productId,
            "products.questionnaires._id": questionnaireId,
            "products.questionnaires.documents._id": documentId
        }).exec(onAccountLoaded);
    });

    app.delete('/accounts/:accountId/products/:productId/questionnaires/:questionnaireId/documents/:documentId',
        passport.authenticate('bearer', { session: false }),
        function(req, res) {
            var accountId = req.params.accountId;
            var productId = req.params.productId;
            var questionnaireId = req.params.questionnaireId;
            var documentId = req.params.documentId;

            var belongsToCurrentUser = function (account) {
                return req.user.accounts.indexOf(accountId) >= 0;
            };

            var onAccountLoaded = function (err, account) {
                if (err) {
                    return res.json(409, new Error(err.toString()));
                }

                if (!account) {
                    return res.send(404);
                }

                if (belongsToCurrentUser(account) || req.user.role == 'Admin') {
                    var filePath = getTargetFilePath(accountId, questionnaireId);

                    var product = account.products.id(productId);
                    var questionnaire = product.questionnaires.id(questionnaireId);
                    var document = questionnaire.documents.id(documentId);
                    questionnaire.documents.pull({_id: documentId});

                    var qualifiedFile = filePath + "/" + document.name;
                    fs.unlink(qualifiedFile, function () {
                        if (err) throw err;

                        account.save();

                        res.send(204);
                    });
                } else {
                    res.send(404);
                }
            };
            Account.findOne({
                "_id": accountId,
                "products._id": productId,
                "products.questionnaires._id": questionnaireId,
                "products.questionnaires.documents._id": documentId
            }).exec(onAccountLoaded);
    });

    app.post('/accounts/:accountId/products/:productId/questionnaires/:questionnaireId/documents', account.questionnaires.documents.add);
    app.get('/accounts/:accountId/products/:productId/questionnaires/:questionnaireId/documents',
        passport.authenticate('bearer', { session: false }),
        account.questionnaires.documents.get);

};
