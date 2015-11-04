'use strict';

module.exports = {
    db: 'mongodb://localhost/taxqdev',
    domain: 'http://localhost:3000',
    app: {
        name: 'Local TAXplan'
    },
    uploadDir: process.env.PWD + "/" + './uploads',
    secret: 'secret',
    strip: {
        secret: 'sk_test_3mBHxfjUosUc8FA6Pvxl2bOb',
        key: 'pk_test_ZdvYCcHL5ZP14KFYhAlMthXy'
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
    },
    linkedin: {
        clientID: 'API_KEY',
        clientSecret: 'SECRET_KEY',
        callbackURL: 'http://localhost:3000/auth/linkedin/callback'
    },
    email: {
        admin: 'info@taxplancanada.ca',
        templates: {
            welcome: 'welcome',
            password_reset: 'password_reset',
            comment: 'comment',
            finish_questionnaire: 'questionnaire_finished',
            payment: 'payment',
            profile_created: 'profile_created',
            document_uploaded: 'document_uploaded'
        }
    }
};
