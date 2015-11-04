/*jslint node: true */

'use strict';
/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    Schema = mongoose.Schema;
var Answer = mongoose.model('Answer');
var Rule = mongoose.model('Rule');
var _ = require('underscore');

/**
 * Use an answer object to describe how something is to be constructed
 * The question should have a type, it's how we answer that changes.
 */

var QuestionSchema = new Schema({
    required: {
        type: Boolean, default: false
    },
    visible: {
        type: Boolean, default: false
    },
    instructions: {
        type: String, default: ''
    },
    text: String,
    template: {
        type: String, default: null
    },
    hasMultipleAnswers: {
        type: Boolean, default: false
    },
    answer: [Answer.schema],
    triggered_by: [{type: Schema.Types.ObjectId, ref: 'Rule'}]
});

QuestionSchema.path('text').validate(function(text) {
    return text.length;
}, 'text cannot be blank');

QuestionSchema.pre('save', function(next) {
    return next();
});

QuestionSchema.methods = {
    hasAnswer: function() {
        return _.some(this.answer, function(answer) {
            return answer.value.length > 0;
        });
    }
};

mongoose.model('Question', QuestionSchema);
