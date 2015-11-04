/*jslint node: true */

'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var ChoiceSchema = new Schema({
    _id: false,
    id: false,
    value: String
});

var Choice = mongoose.model('Choice', ChoiceSchema);