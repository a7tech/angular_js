/*jslint node: true */

'use strict';
/**
 * Module dependencies.
 */
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Package = mongoose.model('Package');

var PackagePaymentSchema = new Schema({
    charge_id: String,
    brand: String,
    funding: String,
    last4: Number,
    name: String,
    amount: Number,
    'package': {
        type: Schema.Types.ObjectId,
        ref: 'Package'
    }
});
mongoose.model('PackagePayment', PackagePaymentSchema);