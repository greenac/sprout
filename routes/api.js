'use strict';

let sqlPool = require('./../db/sql-pool');
let express = require('express');
let router = express.Router();
let _ = require('underscore');
let jsonResponse = require('./../utils/json-response');
let updateHandler = require('./../handlers/update-handler');

router.route('/get-user').post(function(req, res) {
    if (!user) {
        jsonResponse(res, 401, new Error('Required parameter missing'), null);
        return;
    }

    updateHandler.getUserInfoForCode(req.body.userCode, function(error, user) {
        jsonResponse(res, error ? 500 : 200, error, user);
    });
});

router.route('/verify-user').post(function(req, res) {
    if (!_.has(req.body, 'user') || !_.has(req.body, 'enteredCode')) {
        jsonResponse(res, 401, new Error('Required parameter missing'), null);
        return;
    }

    updateHandler.verifyUser(req.body.user, req.body.enteredCode, function(error, verifiedValue) {
        if (error) {
            jsonResponse(res, 500, new Error('Internal Server Error'), null);
            return;
        }

        jsonResponse(res, 200, null, {verified: verifiedValue})
    });
});

router.route('/update-user').post(function(req, res) {
    if (!_.has(req.body, 'user')) {
        jsonResponse(res, 401, new Error('Required parameter missing'), null);
        return;
    }

    updateHandler.updateUser(req.body.user, function(error, rows) {
        jsonResponse(res, 200, error, {updated: !error})
    });
});

module.exports = router;
