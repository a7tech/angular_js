/*jslint node: true */

'use strict';
/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    Schema = mongoose.Schema;
var util = require('util');
var Choice = mongoose.model('Choice');
var Rule = mongoose.model('Rule');

/*
questionnaire: {
    categories: [
        {
            sections: [
                {
                    template: {
                        layout: {
                            rows: [
                                {
                                    columns: [
                                        {
                                             fields: [
                                                 {
                                                     _id: String,
                                                     required: Boolean,
                                                     visible: Boolean,
                                                     instructions: String,
                                                     type: Text,
                                                     rules: [],
                                                     choices: []
                                                     display: enum
                                                 }
                                             ]
                                        }
                                    ]
                                }
                            ]
                        }
                    },
                    fields: [
                        {
                            field_id: String,
                            answers: [
                                {
                                    values: []
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    ]
}

type: 'Dependent'
--> on the front end you know the questions/add answers to the question
type: 'Personal Info'


 */

function AnswerSchema() {
    Schema.apply(this, arguments);

    this.add({
        // multiple answers need some way to group answers
        // either group them in questions, or somehow here, not a good idea to do it here
        _id: false,
        id: false,
        valueLabels: [String],
        value: [String],
        rules: [Rule.schema],
        // TODO rename to 'method'
        type: {
            // TODO distinguish between single line input and multiline input
            // Text vs something else
            type: String, enum: ['Text', 'TextArea', 'Choice', 'Date', 'Number', 'Address', 'Email', 'Phone', 'Sin'], required: true
        },
        choices: [Choice.schema],
        // TODO rename to 'choiceDisplay'
        display: {
            type: String, enum: ['Radio', 'Dropdown', 'Checkbox']
        }
    });
}

util.inherits(AnswerSchema, Schema);

var Answer = mongoose.model('Answer', new AnswerSchema());

Answer.schema.pre('save', function(next) {
    if (!this.isNew) return next();

    if (this.type == 'Choice' && !this.display) {
        this.display = 'Radio';
    }

    return next();
});

Answer.schema.pre('save', function(next) {
    if (this.type === 'Number') {
        // TODO make sure it's a number
    }
    // TODO add validation for other types
    return next();
});
