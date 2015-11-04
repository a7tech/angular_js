/*jslint node: true */

'use strict';
/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    Schema = mongoose.Schema;
var util = require('util');

function RuleSchema() {
    Schema.apply(this, arguments);

    this.add({
        value: String,
        category: {
            type: Schema.ObjectId,
            ref: 'Category'
        },
        questions: [{
            type: Schema.ObjectId,
            ref: 'Question'
        }],
        item: {
            type: Schema.ObjectId,
            ref: 'ChecklistItem'
        }
    });
}

util.inherits(RuleSchema, Schema);

var Rule = mongoose.model('Rule', new RuleSchema());
