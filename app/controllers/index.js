/*jslint node: true */

'use strict';

var config = require('../../config/config');

exports.render = function(req, res) {
    res.render('index', {
        user: req.user ? JSON.stringify(req.user) : 'null',
        stripe_publishable_key: config.strip.key
    });
};
