'use strict';

const config = require('./../config');
const encryptionHandler = require('./../handlers/encryption-handler');


module.exports = {
    encryptValue: function(value) {
        return encryptionHandler.encryptValue(
            value,
            config.ellipticalDBKeys.publicKey,
            config.ellipticalDBKeys.privateKey
        );
    },

    decryptValue: function(value) {
        return encryptionHandler.decryptedValue(
            value,
            config.ellipticalDBKeys.publicKey,
            config.ellipticalDBKeys.privateKey
        );
    }
};
