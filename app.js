'use strict';

let logger = require('./utils/logger');

if (process.argv.length > 2 && process.argv[process.argv.length - 1] === 'keys') {
    let encryptionHandler = require('./handlers/encryption-handler');
    logger('keys', encryptionHandler.createEllipticalKeys());
} else if (process.argv.length > 2 && process.argv[process.argv.length - 1] === 'query') {
    let queryHelper = require('./db/query-helper');
    let sqlPool = require('./db/sql-pool');
    let config = require('./config');
    let query = queryHelper.selectWithAnd('users', null, null);
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

    let lock = {
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
    let userHandler = require('./handlers/user-handler');
    userHandler.getUserWithId('5107171635', function(error, user) {
        logger(user);
    });
} else if (process.argv.length > 2 && process.argv[process.argv.length - 1] === 'sub') {
    let lockHandler = require('./handlers/lock-handler');
    lockHandler.createEllipticalKeys(function(error, keys) {
        if (error) {
            logger('Error creating elliptical keys:', error);
            return;
        }

        logger('got keys:', keys);
    });
} else {
    let config = require('./config');
    let bodyParser = require('body-parser');
    let morgan = require('morgan');
    let path = require('path');
    let favicon = require('serve-favicon');
    let express = require('express');
    let app = express();
    let userRoutes = require('./routes/user-routes');

    app.use(bodyParser.urlencoded({extended: true}));
    app.use(bodyParser.json());

    app.use(morgan('dev'));

    app.use(express.static(path.join(__dirname, 'public')));

    app.use('/api/user', userRoutes);

    app.listen(config.port, function(){
        logger('Listening on port ' + config.port);
    });
}
