/*jslint node: true */

'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    crypto = require('crypto');
var Account = mongoose.model('Account');

/**
 * User Schema
 */
var UserSchema = new Schema({
    first_name: String,
    last_name: String,
    name :String,
    username: {
        type: String,
        unique: true
    },
    phone: String,
    email: {
        type: String,
        unique: true
    },
    hashed_password: {
        type: String,
        select: false
    },
    provider: {
        type: String,
        select: false
    },
    salt: {
        type: String,
        select: false
    },
    reset_key: {
        type: String,
        select: false
    },
    role: {
        type: String,
        enum: ['Admin', 'Customer', '3rd Party']
    },
    birthday: [Number],
    address: String,

    accounts: [{ type: Schema.Types.ObjectId, ref: 'Account' }]
});

/**
 * Virtuals
 */
UserSchema.virtual('password').set(function(password) {
    this._password = password;
    this.salt = this.makeSalt();
    this.hashed_password = this.encryptPassword(password);
}).get(function() {
    return this._password;
});

/**
 * Validations
 */
var validatePresenceOf = function(value) {
    return value && value.length;
};

// the below 4 validations only apply if you are signing up traditionally
UserSchema.path('username').validate(function(username) {
    // if you are authenticating by any of the oauth strategies, don't validate
    if (this.provider) return true;
    return (typeof username === 'string' && username.length > 0);
}, 'Username cannot be blank');

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

UserSchema.path('hashed_password').validate(function(hashed_password) {
    // if you are authenticating by any of the oauth strategies, don't validate
    if (!this.provider) return true;
    return (typeof hashed_password === 'string' && hashed_password.length > 0);
}, 'Password cannot be blank');


/**
 * Pre-save hook
 */
UserSchema.pre('save', function(next) {
    if (!this.isNew) return next();

    if (!validatePresenceOf(this.password)) {
        next(new Error('Invalid password'));
    } else if(!validatePresenceOf(this.email)) {
        next(new Error('No email provided'));
    } else {
        next();
    }
});

UserSchema.pre('save', function(next) {
    if (this.isNew) {
        this.role = 'Customer';
        var user = this;
        user.name = user.first_name+" "+user.last_name;
        user.email = user.email.toLowerCase();
        var account = new Account();
        account.save(function(err, account) {
            if (err) { next(err); }
            user.accounts.push(account._id);
            next();
        });
    } else {
        next();
    }
});

UserSchema.pre('remove', function(next) {
    Account.find({
        '_id': { $in: this.accounts }
    }).remove().exec();
    next();
});

/**
 * Methods
 */
UserSchema.methods = {
    isAdmin: function() {
        return this.role == 'Admin';
    },

    /**
     * Authenticate - check if the passwords are the same
     *
     * @param {String} plainText
     * @return {Boolean}
     * @api public
     */
    authenticate: function(plainText) {
        return this.encryptPassword(plainText) === this.hashed_password;
    },

    /**
     * Make salt
     *
     * @return {String}
     * @api public
     */
    makeSalt: function() {
        return crypto.randomBytes(16).toString('base64');
    },

    /**
     * Encrypt password
     *
     * @param {String} password
     * @return {String}
     * @api public
     */
    encryptPassword: function(password) {
        if (!password || !this.salt) return '';
        var salt = new Buffer(this.salt, 'base64');
        return crypto.pbkdf2Sync(password, salt, 10000, 64).toString('base64');
    },

    createResetKey: function() {
        return crypto.createHash('sha256').update(this.makeSalt()).digest('hex');
    }
};

mongoose.model('User', UserSchema);