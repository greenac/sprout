'use strict';

let mysql = require('mysql');
let config = require('./../config');
let logger = require('./../utils/logger');
let _ = require('underscore');
const ellipseErrors = require('./../errors/ellipse-errors');


module.exports = {
    _pools: null,

    initPool: function(shouldUseDatabase) {
        if (this._pools) {
            return;
        }

        let mainConfig;
        let usersConfig;
        if (shouldUseDatabase) {
            mainConfig = {
                host: config.databaseInfo.main.host,
                user: config.databaseInfo.main.userName,
                password: config.databaseInfo.main.password,
                database: config.databaseInfo.main.databaseName,
                port: config.databaseInfo.main.port
            };
            usersConfig = {
                host: config.databaseInfo.users.host,
                user: config.databaseInfo.users.userName,
                password: config.databaseInfo.users.password,
                database: config.databaseInfo.users.databaseName
            };
        } else {
            mainConfig = {
                host: config.databaseInfo.main.host,
                user: config.databaseInfo.main.userName,
                password: config.databaseInfo.main.password
            };
            usersConfig = {
                host: config.databaseInfo.users.host,
                user: config.databaseInfo.users.userName,
                password: config.databaseInfo.users.password
            };
        }

        this._pools = mysql.createPoolCluster();
        this._pools.add(config.databaseInfo.main.databaseName, mainConfig);
        this._pools.add(config.databaseInfo.users.databaseName, usersConfig);
    },

    _getPools: function() {
        if (!this._pools) {
            this.initPool(true);
        }

        return this._pools;
    },

    makeQuery: function(query, database, callback) {
        if (database === config.databaseInfo.main.databaseName ||
            database === config.databaseInfo.users.databaseName)
        {
            this._getPools().getConnection(database, function(error, connection) {
                if (error) {
                    logger('got error for database:', database, 'query:', query, 'error:', error);
                    connection.release();
                    callback(error, null);
                    return;
                }

                connection.query(query, function(error, rows) {
                    connection.release();
                    callback(error, rows);
                });
            });
        } else {
            logger('Error: the database provided:', database, 'does not exist.');
            callback(ellipseErrors.incorrectDatabase, null);
        }
    },

    destroyPool: function(callback) {
        this._pools.end(function (error) {
            if (error) {
                callback(error);
                return;
            }

            this._pools = null;
            callback(null);
        }.bind(this));
    }
};
