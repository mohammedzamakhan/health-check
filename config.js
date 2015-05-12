var path = require('path'),
    pkg = require('./package.json'),
    env = process.env.NODE_ENV || 'development';

var config = {};
config.development = {
    rootPath: __dirname,
    app: {
        name: pkg.name,
        fullName: 'Health Check',
        version: pkg.version,
        frontend: '//development.health-check.divshot.io'
    },
    mail: {
        port: 25,
        host: 'smtp.mailgun.org',
        auth: {
            user: 'postmaster@sandbox6b182246ef0f454c9a739cdcba2ba9e0.mailgun.org',
            pass: '0adb4032d268d74f2a50c22800c01bb6'
        }
    },
    mongo: {
        url: 'mongodb://heroku_app35515501:ck2jd4t6mq9dgsapr4saau66r4@ds059651.mongolab.com:59651/heroku_app35515501',
        options: {
            debug: false
        }
    },
    casper: {
        absolutePath: '/usr/bin/casperjs'
    },
    session: {
        secret: '8Kh862PMMabR'
    }
};

module.exports = config;