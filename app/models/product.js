/*jslint node: true */

'use strict';
/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    Schema = mongoose.Schema;
var Package = mongoose.model('Package');
var Questionnaire = mongoose.model('Questionnaire');
var Comment = mongoose.model('Comment');
var Notification = mongoose.model('Notification');
var _ = require('underscore');

var ProductSchema = new Schema({
    // Preferences/Notifications
    packages: [
        Package.schema
    ],
    cost: Number,
    created: Date,
    questionnaires: [Questionnaire.schema],
    comments: [
        Comment.schema
    ],
    notifications: [Notification.schema]
});

ProductSchema.pre('save', function(next) {
    if (this.isNew) {
        this.created = new Date();
    }
    next();
});

ProductSchema.pre('save', function(next) {
    if (this.isNew && this.notifications.length === 0) {
        this.notifications.push(new Notification({type: 'FTUX_Landing'}));
    }
    next();
});

ProductSchema.methods = {
    getTotalCost: function() {
        var total = 0;
        _.each(this.packages, function(packg) {

        });
    }
};

mongoose.model('Product', ProductSchema);