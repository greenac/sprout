'use strict';

const childProcess = require('child_process');
const path = require('path');
const config = require('./../config');
const logger = require('./../utils/logger');
const async = require('async');
const _ = require('underscore');
const fs = require('fs');

/**
 * This is the KeyHandler class constructor. The class will create elliptical
 * keys for the given curve.
 *
 * @param {string} curve
 * @constructor
 */
function KeyHandler(curve='secp256k1') {
    this._fileName = (new Date().getTime() + Math.floor(Math.random()*1000)).toString();
    this._keysText = null;
    this._keys = {publicKey: null, privateKey: null};
    this._curve = curve;
}

/**
 * This method creates elliptical keys for the given curve. It is the
 * entry point for a user to use this class.
 *
 * @param {Function} callback - Parameters of error and elliptical keys.
 */
KeyHandler.prototype.createEllipticalKeys = function(callback) {
    async.series(
        [
            this._createKeys.bind(this),
            this._readEllipticalKeys.bind(this),
            this._parseKeysText.bind(this),
            this._cleanUp.bind(this)
        ], function(error) {
            if (error) {
                logger('Creating elliptical keys failed with error:', error);
                callback(error, null);
                return;
            }

            callback(null, this._keys);
        }.bind(this)
    );
};

/**
 * This method will get the raw text of a pem file.
 *
 * @param {Function} callback
 */
KeyHandler.prototype.getRawKeys = function(callback) {
    async.series(
        [
            this._createKeys.bind(this),
            this._readEllipticalKeys.bind(this)
        ], function(error) {
            if (error) {
                logger('Getting raw elliptical keys failed with error:', error);
                callback(error, null);
                return;
            }

            callback(null, this._keysText);
        }.bind(this)
    );
};

/**
 * This method parses the text (string) of a pem file.
 *
 * @param {string} rawText - The text of a pem file
 * @param {Function} callback
 */
KeyHandler.prototype.getKeysFromRawText = function(rawText, callback) {
    this._keysText = rawText;
    async.series(
        [
            this._parseKeysText.bind(this),
            this._cleanUp.bind(this)
        ], function(error) {
            if (error) {
                logger('Getting elliptical keys from raw text failed with error:', error);
                callback(error, null);
                return;
            }

            callback(null, this._keys);
        }.bind(this)
    );
};

/**
 * Creates keys by running openssl as a child process.
 *
 * @param {Function} callback
 * @private
 */
KeyHandler.prototype._createKeys = function(callback) {
    const command = 'openssl ecparam -out ' +  path.join(config.paths.ellipticalKeyDirPath, this._fileName)
        + '.pem -name ' + this._curve + ' -genkey';
    childProcess.exec(command, function(error, stdout, stderr) {
        if (error) {
            logger('Error: creating elliptical keys with child process.');
            callback(error);
            return;
        }

        callback();
    });
};

/**
 * This method gets the key file from disk.
 *
 * @param callback
 * @private
 */
KeyHandler.prototype._readEllipticalKeys = function(callback) {
    const command = 'openssl ec -in ' +  this._filePath() + ' -text -noout';
    childProcess.exec(command, function(error, stdout, stderr) {
        if (error) {
            logger('Error: reading elliptical keys with child process.');
            callback(error);
            return;
        }

        this._keysText = stdout;
        callback();
    }.bind(this));
};

/**
 * This method creates the file path for the elliptical key pem file.
 *
 * @returns {string}
 * @private
 */
KeyHandler.prototype._filePath = function() {
    return path.join(config.paths.ellipticalKeyDirPath, this._fileName) + '.pem';
};

/**
 *
 * @param {Function} callback
 * @private
 */
KeyHandler.prototype._parseKeysText = function(callback) {
    if (!this._keysText) {
        callback(new Error('Error parsing keys. No text to parse'));
        return;
    }

    const lines = this._keysText.split('\n');
    let privateKey = '';
    let publicKey = '';
    let lineNumber = 0;
    while (lineNumber < lines.length) {
        let line = lines[lineNumber];
        if (line.toLowerCase().indexOf('priv:') !== -1) {
            break;
        }

        lineNumber += 1;
    }

    if (lineNumber !== lines.length) {
        lineNumber += 1;
        let line = lines[lineNumber];
        while (line.toLowerCase().indexOf('pub:') === -1) {
            line = line.replace(/\s/g, '');
            let bytes = line.split(':');
            if (bytes[bytes.length - 1] === '') {
                bytes.splice(bytes.length - 1);
            }
            privateKey += bytes.join('');
            lineNumber += 1;
            line = lines[lineNumber];
        }

        lineNumber += 1;
        line = lines[lineNumber];
        while (line.toLowerCase().indexOf(this._curve) === -1) {
            line = line.replace(/\s/g, '');
            let bytes = line.split(':');
            if (bytes[bytes.length - 1] === '') {
                bytes.splice(bytes.length - 1);
            }
            publicKey += bytes.join('');
            lineNumber += 1;
            line = lines[lineNumber];
        }
    }

    if (privateKey !== '' && publicKey !== '') {
        this._keys.publicKey = publicKey;
        this._keys.privateKey = privateKey;
    }

    callback();
};

KeyHandler.prototype._cleanUp = function(callback) {
    fs.stat(this._filePath(), function(error, fileStatus) {
            if (error) {
                callback(error);
                return;
            }

            if (fileStatus.isFile()) {
                fs.unlink(this._filePath(), function(error) {
                    error ? callback(error) : callback();
                });
            } else {
                // Leaving this as a soft error. If we're not able to find the key
                // file on disk, we should probably throw an exception.
                logger('Not able to find elliptical keys file, ', this._fileName, ' to delete:');
                callback();
            }
        }.bind(this)
    );
};

module.exports = KeyHandler;
