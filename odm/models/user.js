var env    = process.env.NODE_ENV || 'development',
    config = require('./../../config'),
    B      = require('bluebird'),
    odm    = require('../../odm'),
    Schema = require('../schemas/user'),
    L      = require('./../../logger'),
    _      = require('underscore');

var Model = odm.model('User', Schema);
B.promisifyAll(Model);
B.promisifyAll(Model.prototype);
module.exports = Model;