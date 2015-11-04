/*jslint node: true */

'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    User = mongoose.model('User'),
    UserProfile = mongoose.model('UserProfile');
var Account = mongoose.model('Account');
var passport = require('passport');
var jwt = require('jsonwebtoken');
var _ = require('underscore');
var config = require('../../config/config');
var mail = require('../services/mail');
var async = require("async");

/**
 * Auth callback
 */
exports.authCallback = function(req, res) {
    res.redirect('/');
};

/**
 * Show login form
 */
exports.signin = function(req, res) {
    res.render('users/signin', {
        title: 'Signin',
        message: req.flash('error')
    });
};

exports.createResetKey = function(req, res) {
    var userToReset = req.body;

    var onUserLoaded = function(err, user) {
        var sendResetEmailTo = function(user) {
            var callback = {
                success: function(response, object) {
                },
                error: function(response, object) {
                }
            };
            var variables = {
                name: user.name,
                reset_url: config.domain + '/#!/set_password/' + user.reset_key
            };
            mail.send(config.email.templates.password_reset, user.email, variables, callback);
        };

        var onUserSaved = function(err, user) {
            sendResetEmailTo(user);
        };

        if (user) {
            user.reset_key = user.createResetKey();
            user.save(onUserSaved);
        }
        res.send(200,{msg: 'Email has sent.'});
    };

    if (userToReset.email) {
        User.findOne({email: userToReset.email}).exec(onUserLoaded);
    } else {
        res.send(400, {msg: 'No email provided'});
    }
};

exports.resetPassword = function(req, res) {
    var password = req.body.password;

    var onUserLoaded = function(err, user) {
        if (user) {
            user.password = password;
            user.reset_key = null;
            user.save();
            res.send(200);
        } else {
            res.send(404);
        }
    };

    if (password) {
        var reset_key = req.params.reset_key;
        User.findOne({reset_key: reset_key}).exec(onUserLoaded);
    } else {
        res.send(400);
    }
};

/**
 * Show sign up form
 */
exports.signup = function(req, res) {
    res.render('users/signup', {
        title: 'Sign up',
        user: new User()
    });
};

/**
 * Logout
 */
exports.signout = function(req, res) {
    req.logout();
    return res.json({ message : "Logout" });
    //res.redirect('/');
};

/**
 * Session
 */
exports.session = function(req, res) {
    res.redirect('/');
};

var createToken = function (user) {
    return jwt.sign(user, config.secret);
};

exports.logUserIn = function(req, res, next) {
    req.checkBody('email', 'Email not provided').notEmpty();
    req.checkBody('password', 'Password not provided').notEmpty();

    var errors = req.validationErrors();
    if (errors) {
        res.send(400, errors);
    } else {
        passport.authenticate('local', function(err, user, info) {
            if (err) {
                return next(err);
            }
            if (!user) {
                return res.json(400, [{msg: 'Invalid username or password'}]);
            }
            var token = createToken(user);
            return res.json({ token : token,user_id:user._id });
        })(req, res, next);
    }
};

/**
 * Create user
 */
exports.create = function(req, res, next) {
    req.checkBody('email', 'Email not provided').notEmpty();
    req.checkBody('email', 'Email is invalid').isEmail();
    req.checkBody('first_name', 'First name not provided').notEmpty();
    req.checkBody('last_name', 'Last name not provided').notEmpty();
    req.checkBody('username', 'Username not provided').notEmpty();
    req.checkBody('password', 'Password not provided').notEmpty();

    var errors = req.validationErrors();
    if (errors) {
        return res.json({ message : errors });
        //res.json({ message : errors });
    } else {
        var user = new User(req.body);
        var message = null;
        user.provider = 'local';
        user.save(function(err) {
            if (err) {
                switch (err.code) {
                    case 11000:
                    case 11001:
                        message = {"param":"", "msg" :'Email or Username is already exists','value':''};
                        return res.json({ message : message });
                    default:
                        message = {"param":"", "msg" :'please fill all mandatory fields','value':''};
                        return res.json({ message : message });
                }
                return next(new Error(message));
            }

            var sendWelcomeEmailTo = function(user) {
                var variables = {
                    name: user.first_name+" "+user.last_name
                };
                mail.send(config.email.templates.welcome, user.email, variables);
            };

            var notifyAdminAbout = function(user) {
                var variables = {
                    name: user.first_name+" "+user.last_name,
                    email: user.email
                };
                mail.send(config.email.templates.profile_created, config.email.admin, variables);
            };

            User.findOne({_id: user._id}).select("-hashed_password -salt -provider").exec(function(err, user) {
                sendWelcomeEmailTo(user);
                notifyAdminAbout(user);
                var token = createToken(user);
                res.json({ token : token, user_id : user._id });
            });
        });
    }
};

/**
 * Create createProfile
 */
exports.createProfile = function(req, res, next) {
    req.checkBody('email', 'Email not provided').notEmpty();
    req.checkBody('first_name', 'First name not provided').notEmpty();
    req.checkBody('last_name', 'Last name not provided').notEmpty();
    req.checkBody('phone', 'Pphone number is not provided').notEmpty();
    req.checkBody('SIN', 'SIN not provided').notEmpty();

    var errors = req.validationErrors();
    if (errors) {
        return res.json({ message : errors });
    } else {
        var user = new UserProfile(req.body);
        var message = null;
        user.provider = 'local';
        var userId = req.params.userId;
        user.user_id = userId;
        var profileId = req.body.profileId;
        var birthday = [req.body.year,req.body.month,req.body.date]; 
        user.birthday = birthday;
        if(profileId!='' && (profileId)){
            UserProfile.update(
                { '_id' : profileId }, 
                {
                    $set:{
                        'email': req.body.email,
                        'first_name': req.body.first_name,
                        'last_name': req.body.last_name,
                        'phone': req.body.phone,
                        'SIN': req.body.SIN,
                        'postal': req.body.postal,
                        'province': req.body.province,
                        //'birthday': [req.body.year,req.body.month,req.body.date],
                        'birthday': birthday,
                        'address': req.body.address,
                        'city': req.body.city
                    }
                },function (err, result) {
                    if (err) throw err;
                }
            );
            return res.json(user);
        }else{
            user.save(function(err) {
                if (err) {
                    switch (err.code) {
                        case 11000:
                        case 11001:
                            message = {"param":"", "msg" :'Email or Username is already exists','value':''};
                            return res.json({ message : message });
                        default:
                            message = {"param":"", "msg" :'please fill all mandatory fields','value':''};
                            return res.json({ message : message });
                    }
                    return next(new Error(message));
                }
                return res.json(user);
            });
        }
    }
};

/*
Send List of all profiles
*/
exports.profileList = function(req, res) {
    var userId = req.params.userId;
    if (userId) {
        UserProfile.find({user_id: userId})
            .exec(function (err, users) {
            res.send(users);
        });    
    } else {
        return res.json({ message : "Please login first." });
    }
};

/*
Send Profile detail
*/

exports.findProfile = function(req, res, err) {
    // TODO figure out how to get errors from next
    var userId = req.params.userId;
    var profileId = req.params.profileId;
    if (profileId != '' && userId!='') {
        UserProfile.findOne({_id: profileId,user_id: userId}).exec(function(err, userProfile) {
            res.send(userProfile);
        });
    }else{
        return res.json({ message : "Please user profile id." });
    }
};

/**
 * Send User
 */
exports.me = function(req, res) {
    res.jsonp(req.user || null);
};

exports.list = function(req, res) {
    // TODO look into passport and roles
    if (req.user.role == 'Admin') {
        User.find()
            .populate('accounts', '-products.questionnaires -products.comments -products.notifications')
            .exec(function (err, users) {
            res.send(users);
        });
    } else {
        res.send(404);
    }
};

/**
 * Find user by id
 */
exports.user = function(req, res, next, id) {
    User
        .findOne({
            _id: id
        })
        .exec(function(err, user) {
            if (err) return next(err);
            if (!user) return next({msg: 'Failed to load User ' + id});
            req.user = user;
            next();
        });
};

// Change passwprd
exports.update_password = function(req,res,err){
    var userId = req.params.userId;
    var user = req.body;

    if(req.user._id == userId){
        var keys = ['password'];
        var params = _.pick(user, keys);
        // ToDO check with old password
        async.waterfall([
            function(callback) {
                User.findById(userId).exec(callback);
            },
            function(user, callback) {
                if(user){
                    _.each(params, function(value, key) {
                        user[key] = value;
                    });
                    user.save(function(err) {
                        callback(err, user);
                    });
                }else{
                    // revalidate the user id
                    var message = "Invalid user id";
                    return res.json({ message : message });
                }
            }
        ], function(err, user) {
            if (err) {
                return res.json(409, new Error(err.toString()));
            }
            var message = "Password update";
            return res.json({ message : message });
        });
    }else{
        var message = "Invalid user id";
        return res.json({ message : message });
    }
}


// TODO write tests
exports.find = function(req, res, err) {
    // TODO figure out how to get errors from next
    var userId = req.params.userId;
    if (req.user._id == userId) {
        res.send(req.user);
    } else {
        // TODO need service for this
        User.findOne({_id: userId}).select("-hashed_password -salt -provider").exec(function(err, user) {
            res.send(user);
        });
    }
};


exports.delete = function(req, res, next) {
    if (req.user.isAdmin()) {
        var userId = req.params.userId;
        if (req.user._id == userId) {
            res.send(400, {msg: 'Unable to remove yourself'});
        } else {
            User.findOne({_id: userId}).exec(function(err, user) {
                user.remove();
                res.send(204);
            });
        }
    } else {
        res.send(404);
    }
};

exports.update = function(req, res, next) {
    var userId = req.params.userId;
    var user = req.body;
    if (req.user._id == userId || req.user.role == 'Admin') {
        var keys = ['name', 'birthday', 'address', 'phone'];
        if (req.user.isAdmin()) {
            keys.push('role');
        }
        var params = _.pick(user, keys);

        async.waterfall([
            function(callback) {
                User.findById(userId).exec(callback);
            },
            function(user, callback) {
                _.each(params, function(value, key) {
                    user[key] = value;
                });
                user.save(function(err) {
                    callback(err, user);
                });
            }
        ], function(err, user) {
            if (err) {
                return res.json(409, new Error(err.toString()));
            }
            return res.json(user);
        });
    } else {
        res.send(404);
    }
};