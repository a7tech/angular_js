/*jslint node: true */

'use strict';
/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    Schema = mongoose.Schema;
var Questionnaire = mongoose.model('Questionnaire');
var Product = mongoose.model('Product');
var PackagePayment = mongoose.model('PackagePayment');

var AccountSchema = new Schema({
    questionnaires: [Questionnaire.schema],
    products: [Product.schema],
    payments: [PackagePayment.schema]
});

mongoose.model('Account', AccountSchema);