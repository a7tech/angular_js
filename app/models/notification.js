/*jslint node: true */

'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var NotificationSchema = new Schema({
    type: {
        type: String, enum: ['FTUX_Landing'], required: true
    },
    enabled: {
        type: Boolean, default: true
    }
});

mongoose.model('Notification', NotificationSchema);