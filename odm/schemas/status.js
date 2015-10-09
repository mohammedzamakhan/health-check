'use strict';
var env = process.env.NODE_ENV || 'development',
    config = require('./../../config')[env],
    B = require('bluebird'),
    Schema = require('mongoose').Schema,
    odm = require('../../odm'),
    L = require('./../../logger'),
    _ = require('underscore');


var Schema = new odm.Schema({
    days: {
        type: Object,
        dates: [String],
        total: Number
    },
    months: {
        type: Object,
        dates: [String],
        total: Number
    }
});


module.exports = Schema;