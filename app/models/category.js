/*jslint node: true */

'use strict';
/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    Schema = mongoose.Schema;
var Question = mongoose.model('Question');
var Image = mongoose.model('Image');
var _ = require('underscore');

var CategorySchema = new Schema({
    name: '',
    visible: {type: Boolean, default: true},
    questions: [
        Question.schema
    ],
    progress: [Image.schema],
    triggered_by: [{type: Schema.Types.ObjectId, ref: 'Rule'}]
});

CategorySchema.methods = {
    hasQuestionWithAnswer: function() {
        return _.some(this.questions, function(question) {
            return question.hasAnswer();
        });
    }
};

mongoose.model('Category', CategorySchema);