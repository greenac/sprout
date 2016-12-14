'use strict';

const encryptionHandler = require('./encryption-handler');
const config = require('./../config');
const dbEncryptionHandler = require('../db/db-encryption-handler');
const logger = require('./../utils/logger');
const fs = require('fs');
const childProcess = require('child_process');
const path = require('path');
const KeyHandler = require('./key-handler');


// private variables
const timeStampDefaultValue = 'ffffffff';

// private methods
const _randomDataForLock = function(lock, additionalInfo) {
    return encryptionHandler.encryptValue(
        decryptDbValue(lock.mac_id) + additionalInfo,
        decryptDbValue(lock.public_key),
        decryptDbValue(lock.private_key)
    );
};

// public methods
const createSignedMessage = function(lock, timeStamp, isOwner, otherInfo) {
    if (!timeStamp) {
        timeStamp = timeStampDefaultValue;
    }

    const userType = isOwner ? '00' : '01';
    const securityOption = '00';
    const randomData = _randomDataForLock(lock, otherInfo).substring(0, 62);
    const message = userType + randomData + timeStamp + securityOption;
    const signature = encryptionHandler.ellipticallySign(
        message,
        this.decryptDbValue(lock.private_key)
    );

    logger('message length:', message.length);
    logger('signature length:', signature.length);
    logger('signature:', signature.toString('hex'));
    return message + signature.toString('hex');
};

const decryptDbValue = function(encryptedDbValue) {
    return dbEncryptionHandler.decryptValue(encryptedDbValue);
};

const encryptValueForDb = function(value) {
    return dbEncryptionHandler.encryptValue(value);
};

const createEllipticalKeys = function(callback) {
    const keyHandler = new KeyHandler();
    keyHandler.createEllipticalKeys(callback);
};

module.exports = {
    createSignedMessage: createSignedMessage,
    decryptDbValue: decryptDbValue,
    encryptValueForDb: encryptValueForDb,
    createEllipticalKeys: createEllipticalKeys
};
