/*jslint node: true */

'use strict';
/**
 * Module dependencies.
 */
var _ = require("underscore");
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var ImageSchema = new Schema(_.extend({
    name: String,
    size: Number
}));
mongoose.model('Image', ImageSchema);
