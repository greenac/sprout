'use strict';

let queryHelper = require('./../db/query-helper');
let sqlPool = require('./../db/sql-pool');
let config = require('./../config');
let _ = require('underscore');
let ellipseErrors = require('./../errors/ellipse-errors');
let encryptionHandler = require('./../handlers/encryption-handler');
let logger = require('./../utils/logger');


/**
 * This method fetches a user with the given `userId` from the database.
 *
 * @param {String} userId
 * @param {Function} callback
 */
let getUserWithId = function(userId, callback) {
    _fetchUserWithUserId(userId, function(error, users) {
        if (error) {
            logger('Error: failed to make query for user id:', userId, '. Failed with error:', error);
            callback(error, null);
            return;
        }

        if (!users || users.length === 0) {
            logger('No user found with user_id:', userId);
            callback(null, null);
            return;
        }

        callback(null, _formatUserForWire(users[0]));
    });
};

/**
 * This method creates an auth (rest) token for a user.
 *
 * @param {String} userId
 * @param {String} password
 * @returns {String}
 */
let basicAuthTokenForUser = function(userId, password) {
    return (new Buffer(userId + ':' + password)).toString('base64');
};

/**
 * This method takes a authorization token (rest token) and returns the username
 * and password.
 *
 * @param basicToken
 * @returns {{userName: null | String, password: null | String}}
 */
let decodeAuthToken = function(basicToken) {
    let userNameAndPW = {
        userName: null,
        password: null
    };

    const parts = basicToken.split(' ');
    if (parts.length === 2) {
        const usernameAndPassword = new Buffer(parts[1], 'base64').toString('ascii');
        const userAndPWArray = usernameAndPassword.split(':');
        if (userAndPWArray.length === 2) {
            userNameAndPW.userName = userAndPWArray[0];
            userNameAndPW.password = userAndPWArray[1];
        }
    }

    return userNameAndPW;
};

/**
 * This method checks if all the fields are set on a User object such that the
 * User can be processed.
 *
 * @param {Object} user
 * @returns {boolean}
 */
let isUserValid = function(user) {
    return (
        _.has(user, 'user_id') &&
        _.has(user, 'user_type') &&
        _.has(user, 'reg_id') &&
        _.has(user, 'password')
    );
};

/**
 * This method handles the registration/update of a user.
 *
 * @param {Object} incomingUser - The user that the client is sending to the server
 * @param {Function} callback
 */
let processUser = function(incomingUser, callback) {
    _fetchUserWithUserId(incomingUser.user_id, function(error, users) {
        if (error) {
            logger('Error: failed to fetch user with id:', incomingUser.user_id, 'with error', error);
            callback(error, null);
            return;
        }

        // This is the case where the user is already in the database.
        if(users && users.length > 0) {
            let dbUser = users[0];
            // Let's try and compare the password of the incoming user with the password
            // of the user in the database.
            // TODO: We'll probably want to throttle this method so that an attacker cannot
            // try a brute force attack.
            if (encryptionHandler.verifyPassword(incomingUser.password, dbUser.password)) {
                _saveUser(incomingUser, false, function(error) {
                    if (error) {
                        callback(error, null);
                        return;
                    }

                    getUserWithId(dbUser.user_id, callback);
                });
            } else {
                logger('Failed to verify password for', dbUser.user_id);
                callback(ellipseErrors.passwordDoesNotMatch, null);
            }
        } else {
            // This case occurs when the user is not in the database.
            const keys = encryptionHandler.getNewEllipticalKeys();
            incomingUser.password = encryptionHandler.newPassword(incomingUser.password);
            incomingUser.public_key = keys.publicKey;
            incomingUser.rest_token = encryptionHandler.encryptValue(
                incomingUser.user_id + '::' + ((new Date().getTime()) + 28*24*3600*1000).toString(),
                keys.publicKey,
                config.ellipticalDBKeys.privateKey
            );

            _saveUser(incomingUser, true, function(error) {
                logger('error:', error);
                if (error) {
                    callback(error, null);
                    return;
                }

                getUserWithId(incomingUser.user_id, callback);
            });
        }
    });
};

/**
 * Saves the user to the database and, through the callback function, gives the updated
 * user object that can be returned for consumption by the client.
 *
 * @param {Object} user
 * @param {boolean} isNewUser
 * @param {Function} callback
 * @private
 */
let _saveUser = function(user, isNewUser, callback) {
    let query;
    if (isNewUser) {
        query = queryHelper.insertSingle('users', user);
    } else if (_.has(user, 'id')) {
        let userId = user.id;
        query = queryHelper.updateSingle('users', _.omit(user, 'id'), 'id', userId);
    } else {
        query = queryHelper.updateSingle('users', user, 'user_id', user.user_id);
    }

    logger('query:', query);

    sqlPool.makeQuery(query, config.databaseInfo.users.databaseName, function(error) {
        if (error) {
           logger('Error saving new user to', config.databaseInfo.users.databaseName, 'error:', error);
           callback(error, null);
           return;
        }

        logger('Successfully saved user:', user);
        callback(null);
    });
};

let _formatUserForWire = function(user) {
    return _.pick(user, [
        'id',
        'user_id',
        'rest_token',
        'username',
        'user_type',
        'verified',
        'max_locks',
        'rest_token',
        'title',
        'first_name',
        'last_name',
        'phone_number',
        'email',
        'country_code'
    ]);
};

let _fetchUserWithUserId = function(userId, callback) {
    let query = queryHelper.selectWithAnd('users', null, null);
    sqlPool.makeQuery(query, config.databaseInfo.users.databaseName, callback);
};

module.exports = {
    getUserWithId: getUserWithId,

    basicAuthTokenForUser: basicAuthTokenForUser,

    decodeAuthToken: decodeAuthToken,

    isUserValid: isUserValid,
    
    processUser: processUser
};
