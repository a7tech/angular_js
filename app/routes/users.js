/*jslint node: true */

'use strict';

// User routes use users controller
var users = require('../controllers/users');
var _ = require('underscore');

module.exports = function(app, passport, jwt) {

    app.get('/signin', users.signin);
    app.get('/signup', users.signup);
    app.get('/signout', users.signout);
    app.put('/users/reset', users.createResetKey);
    app.put('/users/reset/:reset_key', users.resetPassword);
    app.get('/users/me', passport.authenticate('bearer', { session: false }), users.me);
    //app.get('/users/:userId', passport.authenticate('bearer', { session: false }), users.find);
    app.get('/users/:userId', users.find);
    app.get('/users', passport.authenticate('bearer', { session: false }), users.list);
    app.put('/users/:userId', passport.authenticate('bearer', { session: false }), users.update);
    app.delete('/users/:userId', passport.authenticate('bearer', { session: false }), users.delete);

    // Setting up the users api
    app.post('/users', users.create);

    // Create User profile
    app.post('/users/profile/:userId', users.createProfile);
    app.get('/users/profile/:userId', users.profileList);
    app.get('/users/profile/:userId/:profileId', users.findProfile);

    // change password
    app.put('/users/change_password/:userId', users.update_password);

    // Setting up the userId param
    app.param('userId', users.user);

    // Setting the local strategy route
    app.post('/users/session', passport.authenticate('local', {
        failureRedirect: '/signin',
        failureFlash: true
    }), users.session);

    // jwt
    app.post('/login', users.logUserIn);

    // Setting the facebook oauth routes
    app.get('/auth/facebook', passport.authenticate('facebook', {
        scope: ['email', 'user_about_me'],
        failureRedirect: '/signin'
    }), users.signin);

    app.get('/auth/facebook/callback', passport.authenticate('facebook', {
        failureRedirect: '/signin'
    }), users.authCallback);

    // Setting the github oauth routes
    app.get('/auth/github', passport.authenticate('github', {
        failureRedirect: '/signin'
    }), users.signin);

    app.get('/auth/github/callback', passport.authenticate('github', {
        failureRedirect: '/signin'
    }), users.authCallback);

    // Setting the twitter oauth routes
    app.get('/auth/twitter', passport.authenticate('twitter', {
        failureRedirect: '/signin'
    }), users.signin);

    app.get('/auth/twitter/callback', passport.authenticate('twitter', {
        failureRedirect: '/signin'
    }), users.authCallback);

    // Setting the google oauth routes
    app.get('/auth/google', passport.authenticate('google', {
        failureRedirect: '/signin',
        scope: [
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/userinfo.email'
        ]
    }), users.signin);

    app.get('/auth/google/callback', passport.authenticate('google', {
        failureRedirect: '/signin'
    }), users.authCallback);

    // Setting the linkedin oauth routes
    app.get('/auth/linkedin', passport.authenticate('linkedin', {
        failureRedirect: '/signin',
        scope: [ 'r_emailaddress' ]
    }), users.signin);

    app.get('/auth/linkedin/callback', passport.authenticate('linkedin', {
        failureRedirect: '/siginin'
    }), users.authCallback);

};
