'use strict';

let sqlPool = require('./../db/sql-pool');
let queryHelper = require('./../db/query-helper');
let _ = require('underscore');
let logger = require('./../utils/logger');

module.exports = {
    verifyUser: function(user, code, callback) {
        let query = 'SELECT `code`, `has_updated` FROM `email_code` WHERE `email_code_id`='
            + sqlPool.escape(user.email_code_id);
        sqlPool.makeQuery(query, function(error, dbUsers) {
            if (error) {
                logger('failed making query:', error);
                callback(error, null);
                return;
            }

            if (dbUsers.length === 0) {
                logger('No user for code', user.email_code_id);
                callback(null, null);
                return;
            }

            // TODO: this check is here in case the user has already updated.
            // Currently we don't have the proper UI to handle this, so we're
            // just falling back to the error state. A more elegant solution
            // would be preferable though.
            if (dbUsers[0].has_updated) {
                logger('Email code user', user.email_code_id, 'has already been verified');
                callback(null, 'already_verified');
                return;
            }

            logger('Verified:', dbUsers[0].code.toString() === code ? 'verified': 'not_verified');
            callback(null, dbUsers[0].code.toString() === code ? 'verified': 'not_verified');
        });
    },

    getUserInfoForCode: function(code, callback) {
        var self = this;
        let query = 'SELECT * FROM `email_code` WHERE `email_code`=' + sqlPool.escape(code);
        sqlPool.makeQuery(query, function(error, rows) {
            if (error) {
                logger('Error getting user information for code:', code, 'error:', error);
                callback(error, null);
                return;
            }

            if (rows.length === 0) {
                logger('There is no user for code:', code);
                callback(null, null);
                return;
            }

            self._getAddressForUser(rows[0], callback);
        });
    },

    updateUser: function(user, callback) {
        let address = user.address;
        delete user.address;
        delete user.code;
        user.has_updated = true;
        user.colors = JSON.stringify(user.colors);

        let query = queryHelper.updateSingle('email_code', user, {email_code_id: user.email_code_id});
        logger('user update query:', query);
        sqlPool.makeQuery(query, function(error, rows) {
            if (error) {
                logger('Error updating user:', error);
                callback(new Error('Error updating user'), null);
                return;
            }

            let updateInfo = {};
            if (user.shopify_customer_id) {
                updateInfo['shopify_customer_id'] = user.shopify_customer_id;
            } else if (user.indiegogo_order_number) {
                updateInfo['indiegogo_customer_id'] = user.indiegogo_order_number;
            } else if (user.stripe_customer_id) {
                updateInfo['stripe_customer_id'] = user.stripe_customer_id;
            } else {
                callback(new Error('Error: customer is not shopify, indiegogo, or stripe'), null);
                return;
            }

            if (_.has(address, 'address_id')) {
                delete address['address_id'];
            }

            query = queryHelper.updateSingle('address', address, updateInfo);
            sqlPool.makeQuery(query, function(error, rows) {
                callback(error, null);
            });
        });
    },

    _getAddressForUser: function(user, callback) {
        let column;
        let value;
        if (user.shopify_customer_id) {
            column = '`shopify_customer_id`';
            value = user.shopify_customer_id;
        } else if (user.indiegogo_order_number) {
            column = '`indiegogo_customer_id`';
            value = user.indiegogo_order_number;
        } else if (user.stripe_customer_id) {
            column = '`stripe_customer_id`';
            value = user.stripe_customer_id;
        } else {
            callback(new Error('Error: customer is not shopify, indiegogo, or stripe'), null);
            return;
        }

        let query = 'SELECT * FROM `address` WHERE ' + column + '=' + sqlPool.escape(value);
        sqlPool.makeQuery(query, function(error, rows) {
            if (error) {
                callback(error, null);
                return;
            }


            // Removing the code from the user object since it should not be
            // sent to the client before authentication is complete.
            user.code = null;
            delete user.has_updated;
            user['address'] = rows.length === 0 ? null : rows[0];
            callback(null, user);
        });
    }
};
