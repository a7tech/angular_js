/*jslint node: true */

'use strict';
/**
 * Module dependencies.
 */
var _ = require("underscore");
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var DocumentItem = mongoose.model('DocumentItem');

var document  = {
    name: String,
    size: Number,
    uploaded: Date
};

var DocumentSchema = new Schema(_.extend({
    verified: Date,
    items: [
        DocumentItem.Schema
    ]
}, document));
mongoose.model('Document', DocumentSchema);

var PreparedDocumentSchema = new Schema(_.extend({
    requiresSignature: {
        type: Boolean,
        default: false
    },
    signatures: [DocumentSchema]
}, document));
mongoose.model('PreparedDocument', PreparedDocumentSchema);
