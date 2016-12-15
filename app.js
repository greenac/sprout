'use strict';

const logger = require('./utils/logger');

if (process.argv.length > 2 && process.argv[process.argv.length - 1] === 'query') {
    const queryHelper = require('./db/query-helper');
    const sqlPool = require('./db/sql-pool');
    const config = require('./config');
    const query = queryHelper.selectWithAnd('users', null, null);
    sqlPool.makeQuery(query, config.databaseInfo.usersDatabaseName, function(error, users) {
        if (error) {
            logger('error making query', error);
            return;
        }

        logger('got users:', users);
        sqlPool.destroyPool(function(error) {
            if (error) {
                logger('error destroying pools:', error);
                return;
            }

            logger('destroyed pools');
        });
    });
} else if (process.argv.length > 2 && process.argv[process.argv.length - 1] === 'message') {
    const lockHandler = require('./handlers/lock-handler');
    const encryptionHandler = require('./handlers/encryption-handler');
    const keys = encryptionHandler.getNewEllipticalKeys();
    logger('public key bytes length:', keys.publicKey.length/2);
    logger('private key bytes length:', keys.privateKey.length/2);

    const lock = {
        mac_id: lockHandler.encryptValueForDb('C73E7F7F6572'),
        public_key: lockHandler.encryptValueForDb(keys.publicKey),
        private_key: lockHandler.encryptValueForDb(keys.privateKey)
    };

    const signedMessage = lockHandler.createSignedMessage(
        lock,
        null,
        true,
        '+15107171635'
    );

    logger('got signed message', signedMessage);
    logger('signed message length:', signedMessage.length/2);
} else if (process.argv.length > 2 && process.argv[process.argv.length - 1] === 'auth') {
    const userHandler = require('./handlers/user-handler');
    userHandler.getUserWithId('5107171635', function(error, user) {
        logger(user);
    });
} else if (process.argv.length > 2 && process.argv[process.argv.length - 1] === 'keys') {
    const KeyHandler = require('./handlers/key-handler');
    const keyHandler = new KeyHandler();
    keyHandler.createEncodedEllipticalKeys(function(error, keys) {
        if (error) {
            logger(error);
            return;
        }

        logger(keys);

        const keyHandler2 = new KeyHandler();
        keyHandler2.sign('I saw the sign!', keys, function(error, signedData) {
            if (error) {
                logger(error);
                return;
            }

            logger('signed data:', signedData.toString('hex'));
            logger('signed data length:', signedData.length);

            const cleanedData = keyHandler2.cleanedSignedData(signedData);
            logger('cleaned data:', cleanedData.toString('hex'));
            logger('cleaned data length:', cleanedData.length);
        });

    });
} else if (process.argv.length > 2 && process.argv[process.argv.length - 1] === 'sign') {
    const KeyHandler = require('./handlers/key-handler');
    const async = require('async');

    const keyHandler = new KeyHandler();
    keyHandler.getRawKeys(function(error, keysText) {
        if (error) {
            logger(error);
            return;
        }

        const otherKeyHandler = new KeyHandler();
        otherKeyHandler.sign("Hi I'm some data to sign!", keysText, function(error, signedData) {
            if (error) {
                logger(error);
                return;
            }

            logger('got text from file:', keysText);
            logger('got signed data:', signedData);
        });
    });
} else {
    const config = require('./config');
    const bodyParser = require('body-parser');
    const morgan = require('morgan');
    const path = require('path');
    const favicon = require('serve-favicon');
    const express = require('express');
    const app = express();
    const userRoutes = require('./routes/user-routes');

    app.use(bodyParser.urlencoded({extended: true}));
    app.use(bodyParser.json());

    app.use(morgan('dev'));

    app.use(express.static(path.join(__dirname, 'public')));

    app.use('/api/user', userRoutes);

    app.listen(config.port, function(){
        logger('Listening on port ' + config.port);
    });
}
