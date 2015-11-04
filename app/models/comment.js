/*jslint node: true */

'use strict';
/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    Schema = mongoose.Schema;
var Document = mongoose.model('Document');

var CommentSchema = new Schema({
    text: {
        type: String, required: true
    },
    user: {
        type: Schema.Types.ObjectId, ref: 'User'
    },
    created: Date,
    documents: [Document.schema]
});

CommentSchema.pre('save', function(next) {
    if (this.isNew) {
        this.created = new Date();
    }
    next();
});


mongoose.model('Comment', CommentSchema);