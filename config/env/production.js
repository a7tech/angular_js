'use strict';

module.exports = {
    db: process.env.OPENSHIFT_MONGODB_DB_URL,
    port: process.env.OPENSHIFT_NODEJS_PORT,
    ipaddr: process.env.OPENSHIFT_NODEJS_IP,
    app: {
        name: 'TAXplan'
    },
    domain: 'https://app.taxplancanada.ca',
    uploadDir: process.env.OPENSHIFT_DATA_DIR,
    secret: 'lsdfkjsasli12j31lkjl1231l23kj1l21l12j31lsdfla',
    strip: {
        secret: 'sk_live_fnOvkMTL8nSei3qXjw6hyvhQ',
        key: 'pk_live_7mhLgjUIiVz2CgpOG9y7Ndns'
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
