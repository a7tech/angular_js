/*jslint node: true */

'use strict';
/**
 * Module dependencies.
 */
var _ = require("underscore");
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var PreparedDocument = mongoose.model('PreparedDocument');

var PackageLineItemSchema = new Schema({
    description: String,
    cost: {
        type: Number, default: 0
    },
    result: {
        type: Number,
        required: true,
        default: 0
    },
    isEfile: {
        type: Boolean,
        required: true,
        default: false
    }
});
mongoose.model('PackageLineItem', PackageLineItemSchema);

var PackageSchema = new Schema({
    name: String,
    purchased: { type:Boolean, default: false },
    line_items: [
        PackageLineItemSchema
    ],
    preparedDocuments: [
        PreparedDocument.schema
    ]
});
mongoose.model('Package', PackageSchema);
