/*jslint node: true */

'use strict';
/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    Schema = mongoose.Schema;
// Supporting Document
var Document = mongoose.model('Document');

var ChecklistItemSchema = new Schema({
    name: String,
    type: String,
    description: String,
    visible: {type: Boolean, default: true},
    completed: {type: Boolean, default: false},
    documents: [
        Document.schema
    ],
    triggered_by: [{type: Schema.Types.ObjectId, ref: 'Rule'}]
});

mongoose.model('ChecklistItem', ChecklistItemSchema);