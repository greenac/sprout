'use strict';

let express = require('express');
let router = express.Router();
let _ = require('underscore');
let logger = require('./../utils/logger');
let jsonResponse = require('./../utils/json-response');
let userHandler = require('./../handlers/user-handler');
let responseCodes = require('./../response-codes/response-codes');
let ellipseErrors = require('./../errors/ellipse-errors');


router.route('/registration').post(function(req, res) {
    if (!userHandler.isUserValid(req.body)) {
        jsonResponse(res, responseCodes.BadRequest, ellipseErrors.missingParameter, null);
        return;
    }

    userHandler.processUser(req.body, function(error, userData) {
        if (error) {
            logger('Error: processing user:', error);
            jsonResponse(res, responseCodes.InternalServer, ellipseErrors.internalServer, null);
            return;
        }

        jsonResponse(res, responseCodes.OK, ellipseErrors.noError, userData);
    });
});

module.exports = router;
