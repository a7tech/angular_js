/*jslint node: true */

'use strict';

var product = require('../controllers/product.controller');
var fs = require('fs');
var config = require('../../config/config');
var mkdirp = require('mkdirp');
var _ = require('underscore');
var mongoose = require('mongoose'),
    Account = mongoose.model('Account');
var User = mongoose.model('User');
var Questionnaire = mongoose.model('Questionnaire');

module.exports = function(app, passport) {
    // use middleware to protect these resources from non-admins

    app.get('/products/:productId', passport.authenticate('bearer', { session: false }), product.read);
    app.get('/products', passport.authenticate('bearer', { session: false }), product.list);
    app.post('/products', passport.authenticate('bearer', { session: false }), product.create);
    app.put('/products/:productId', passport.authenticate('bearer', { session: false }), product.update);
    app.delete('/products/:productId', passport.authenticate('bearer', { session: false }), product.remove);

    // progress images
    app.post('/products/:productId/questionnaires/:questionnaireId/categories/:categoryId/progress', passport.authenticate('bearer', { session: false }), product.progress.create);
    app.get('/products/:productId/questionnaires/:questionnaireId/categories/:categoryId/progress/:imageId', product.progress.read);
    app.delete('/products/:productId/questionnaires/:questionnaireId/categories/:categoryId/progress/:imageId', passport.authenticate('bearer', { session: false }), product.progress.delete);

    // questionnaires
    app.post('/products/:productId/questionnaires', passport.authenticate('bearer', {session: false}), product.createQuestionnaire);
    app.get('/products/:productId/questionnaires/:questionnaireId', passport.authenticate('bearer', { session: false }), product.getQuestionnaire);
    app.put('/products/:productId/questionnaires/:questionnaireId', passport.authenticate('bearer', { session: false }), product.updateQuestionnaire);
    app.delete('/products/:productId/questionnaires/:questionnaireId', passport.authenticate('bearer', { session: false }), product.removeQuestionnaire);
    app.post('/products/:productId/questionnaires/:questionnaireId/checklist', passport.authenticate('bearer', { session: false }), product.questionnaire.createChecklistItem);
    app.put('/products/:productId/questionnaires/:questionnaireId/checklist/:itemId', passport.authenticate('bearer', { session: false }), product.questionnaire.updateChecklistItem);
    app.get('/products/:productId/questionnaires/:questionnaireId/checklist/:itemId', passport.authenticate('bearer', { session: false }), product.questionnaire.getChecklistItem);
    app.delete('/products/:productId/questionnaires/:questionnaireId/checklist/:itemId', passport.authenticate('bearer', { session: false }), product.questionnaire.removeChecklistItem);
    app.get('/products/:productId/questionnaires/:questionnaireId/checklist/:itemId/documents/:documentId', product.questionnaire.getChecklistItemDocument);
    app.post('/products/:productId/questionnaires/:questionnaireId/checklist/:itemId/documents', passport.authenticate('bearer', { session: false }), product.questionnaire.uploadChecklistItemDocument);
    app.delete('/products/:productId/questionnaires/:questionnaireId/checklist/:itemId/documents/:documentId', passport.authenticate('bearer', { session: false }), product.questionnaire.deleteChecklistItemDocument);
};