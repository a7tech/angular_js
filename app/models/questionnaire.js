/*jslint node: true */

'use strict';
/**
 * Module dependencies.
 */
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Category = mongoose.model('Category');
var ChecklistItem = mongoose.model('ChecklistItem');
var Document = mongoose.model('Document');
var Comment = mongoose.model('Comment');

var QuestionnaireSchema = new Schema({
    name: 'string',
    // TODO move up a level to Product?
    // makes more sense for the product to have a checklist as opposed to the questionnaire
    checklist: [
        ChecklistItem.schema
    ],
    documents: [
        Document.schema
    ],
    categories: [
        Category.schema
    ],
    current_category: {
        type: Schema.Types.ObjectId,
        ref: 'Category'
    },
    comments: [
        Comment.schema
    ],
    status: {
        type: String, enum: ['NotStarted', 'InProgress', 'Finished'], required: true, default: 'NotStarted'
    },
    created: Date,
    finished_on: Date,
    last_updated: Date,
    submitted_documents_on: Date
});

QuestionnaireSchema.pre('save', function(next) {
    if (this.isNew) {
        this.created = new Date();
    }
    this.last_updated = new Date();
    next();
});

mongoose.model('Questionnaire', QuestionnaireSchema);
