'use strict';

module.exports = {
    db: 'mongodb://localhost/taxq-test',
    port: 3001,
    app: {
        name: 'TAXplan'
    },
    uploadDir: './uploads',
    secret: 'secret',
    strip: {
        secret: 'sk_test_a6QgXMSpCK5CNYuRH1GUq0fx'
    },
    postageapp: {
        api_key: '5Ea1PqjbAXn8V4Z639bPDSGx4DuLPXVh'
    },
    facebook: {
        clientID: 'APP_ID',
        clientSecret: 'APP_SECRET',
        callbackURL: 'http://localhost:3000/auth/facebook/callback'
    },
    twitter: {
        clientID: 'CONSUMER_KEY',
        clientSecret: 'CONSUMER_SECRET',
        callbackURL: 'http://localhost:3000/auth/twitter/callback'
    },
    github: {
        clientID: 'APP_ID',
        clientSecret: 'APP_SECRET',
        callbackURL: 'http://localhost:3000/auth/github/callback'
    },
    google: {
        clientID: 'APP_ID',
        clientSecret: 'APP_SECRET',
        callbackURL: 'http://localhost:3000/auth/google/callback'
    }
};
