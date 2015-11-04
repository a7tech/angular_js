/*jslint node: true */

'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    Schema = mongoose.Schema;
var User = mongoose.model('User');
/**
 * UserProfile Schema
 */
var UserSchema = new Schema({
    first_name: String,
    last_name: String,
    email: String,
    birthday: [Number],
    SIN :String,
    address: String,
    city: String,
    province: String,
    postal: String,
    phone: String,
    user_id: [{ type: Schema.Types.ObjectId, ref: 'User' }]
});

/**
 * Validations
 */
var validatePresenceOf = function(value) {
    return value && value.length;
};

// the below 4 validations only apply if you are signing up traditionally
UserSchema.path('first_name').validate(function(first_name) {
    // if you are authenticating by any of the oauth strategies, don't validate
    if (this.provider) return true;
    return (typeof first_name === 'string' && first_name.length > 0);
}, 'First Name cannot be blank');

// the below 4 validations only apply if you are signing up traditionally
UserSchema.path('last_name').validate(function(last_name) {
    // if you are authenticating by any of the oauth strategies, don't validate
    if (this.provider) return true;
    return (typeof last_name === 'string' && last_name.length > 0);
}, 'Last Name cannot be blank');

UserSchema.path('email').validate(function(email) {
    // if you are authenticating by any of the oauth strategies, don't validate
    if (!this.provider) return true;
    return (typeof email === 'string' && email.length > 0);
}, 'Email cannot be blank');


/**
 * Pre-save hook
 */
UserSchema.pre('save', function(next) {
    if (!this.isNew) return next();
    if(!validatePresenceOf(this.email)) {
        next(new Error('No email provided'));
    } else {
        next();
    }
});

UserSchema.pre('save', function(next) {
    if (this.isNew) {
        var user = this;
        user.email = user.email.toLowerCase();
        next();
    }
});

/**
 * Methods
 */
UserSchema.methods = {
};

mongoose.model('UserProfile', UserSchema);