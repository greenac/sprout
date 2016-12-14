'use strict';

const _ = require('underscore');
const fs = require('fs');
const logger = require('./utils/logger');

if (!process.env.SKYFLEET_USERS_DB_USERNAME ||
    !process.env.SKYFLEET_USERS_DB_PASSWORD ||
    !process.env.SKYFLEET_USERS_DB_NAME ||
    !process.env.SKYFLEET_USERS_DB_HOST ||
    !process.env.SKYFLEET_MAIN_DB_USERNAME ||
    !process.env.SKYFLEET_MAIN_DB_PASSWORD ||
    !process.env.SKYFLEET_MAIN_DB_NAME ||
    !process.env.SKYFLEET_MAIN_DB_HOST ||
    !process.env.SKYFLEET_LOG_PATH ||
    !process.env.SKYFLEET_PORT ||
    !process.env.ELLIPSE_ELLIPTICAL_DB_PRIVATE_KEY ||
    !process.env.ELLIPSE_ELLIPTICAL_DB_PUBLIC_KEY ||
    !process.env.ELLIPSE_ELLIPTICAL_KEYS_DIR_PATH)
{
    logger(
        'Error: system variables have not been properly setup.',
        'The following variables should be exported to your environment:',
        'SKYFLEET_USERS_DB_USERNAME',
        'SKYFLEET_USERS_DB_PASSWORD',
        'SKYFLEET_USERS_DB_NAME',
        'SKYFLEET_USERS_DB_HOST',
        'SKYFLEET_MAIN_DB_USERNAME',
        'SKYFLEET_MAIN_DB_PASSWORD',
        'SKYFLEET_MAIN_DB_NAME',
        'SKYFLEET_MAIN_DB_HOST',
        'SKYFLEET_LOG_PATH',
        'SKYFLEET_PORT',
        'ELLIPSE_ELLIPTICAL_DB_PRIVATE_KEY',
        'ELLIPSE_ELLIPTICAL_DB_PUBLIC_KEY',
        'ELLIPSE_ELLIPTICAL_KEYS_DIR_PATH'
    );

    throw new Error('No database info found');
}

module.exports = {
    appName: 'oval',

    port: '7854',

    databaseInfo: {
        main: {
            userName: process.env.SKYFLEET_MAIN_DB_USERNAME,
            password: process.env.SKYFLEET_MAIN_DB_PASSWORD,
            databaseName: process.env.SKYFLEET_MAIN_DB_NAME,
            host: process.env.SKYFLEET_MAIN_DB_HOST,
            port: process.env.SKYFLEET_MAIN_DB_PORT
        },

        users: {
            userName: process.env.SKYFLEET_USERS_DB_USERNAME,
            password: process.env.SKYFLEET_USERS_DB_PASSWORD,
            databaseName: process.env.SKYFLEET_USERS_DB_NAME,
            host: process.env.SKYFLEET_USERS_DB_HOST,
            port: process.env.SKYFLEET_USERS_DB_PORT
        }
    },

    httpStatusCodes: {
        success: 200,
        unauthorisedAccess: 401,
        internalServerError: 500,
        badRequest: 400
    },

    ellipticalDBKeys: {
        privateKey: process.env.ELLIPSE_ELLIPTICAL_DB_PRIVATE_KEY,
        publicKey: process.env.ELLIPSE_ELLIPTICAL_DB_PUBLIC_KEY
    },

    paths: {
        logPath: process.env.SKYFLEET_LOG_PATH,
        ellipticalKeyDirPath: process.env.ELLIPSE_ELLIPTICAL_KEYS_DIR_PATH
    }
};
