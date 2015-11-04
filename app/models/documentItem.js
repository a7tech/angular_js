/*jslint node: true */

'use strict';
/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var DocumentItemSchema = new Schema({
    _id: false,
    id: false,
    type: {
        name: String,
        value: String
    },
    quantity: Number
});

mongoose.model('DocumentItem', DocumentItemSchema);
