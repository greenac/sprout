'use strict';

const childProcess = require('child_process');
const path = require('path');
const config = require('./../config');
const logger = require('./../utils/logger');
const async = require('async');
const fs = require('fs');


/**
 * This is the KeyHandler class constructor. The class will create elliptical
 * keys for the given curve.
 *
 * @param {string} curve
 * @constructor
 */
function KeyHandler(curve='prime256v1', hash='sha256') {
    this._fileName = (new Date().getTime()).toString();
    this._curve = curve;
    this._encodedEllipticalKeys = null;
    this._keys = {publicKey: null, privateKey: null};
    this._keysText = null;
    this._decodedKeysText = null;
    this._signature = null;
    this._textToSign = null;
    this._signingHash = hash;
}

/**
 * This method creates elliptical keys for the given curve. It is the
 * entry point for a user to use this class.
 *
 * @param {Function} callback - Parameters of error and elliptical keys.
 */
KeyHandler.prototype.createEncodedEllipticalKeys = function(callback) {
    async.series(
        [
            this._createKeys.bind(this),
            this._readEncodedEllipticalKeys.bind(this),
            this._cleanUpKeyFile.bind(this)
        ], function(error) {
            if (error) {
                logger('Creating elliptical keys failed with error:', error);
                callback(error, null);
                return;
            }

            callback(null, this._encodedEllipticalKeys);
        }.bind(this)
    );
};

/**
 * This method parses the text (string) of a pem file.
 *
 * @param {string} encodedText - The text of a pem file
 * @param {Function} callback
 */
KeyHandler.prototype.getKeysFromEncodedText = function(encodedText, callback) {
    this._keysText = encodedText;
    async.series(
        [
            this._createPemFileFromRawText.bind(this),
            this._readEllipticalKeys.bind(this),
            this._parseKeysText.bind(this),
            this._cleanUpKeyFile.bind(this)
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
 *
 * @param {string} toSign
 * @param {string} keyText
 * @param {Function} callback
 */
KeyHandler.prototype.sign = function(toSign, keyText, callback) {
    this._keysText = keyText;
    this._textToSign = toSign;
    async.series(
        [
            this._createPemFileFromRawText.bind(this),
            this._createTextToSignFile.bind(this),
            this._createSignatureFile.bind(this),
            this._readSignatureFile.bind(this),
            this._cleanUpSignatureFile.bind(this)
        ], function(error) {
            if (error) {
                logger('Error signing:', toSign, '. Failed with error:', error);
                callback(error, null);
                return;
            }

            callback(null, this._signature);
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
    const command = 'openssl ecparam -name ' + this._curve + ' -genkey -noout -out ' + this._filePath();
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
 *  This method reads encoded keys from a file.
 *
 * @param {Function} callback
 * @private
 */
KeyHandler.prototype._readEncodedEllipticalKeys = function(callback) {
    fs.stat(this._filePath(), function(error, fileStatus) {
            if (error) {
                callback(error);
                return;
            }

            if (!fileStatus.isFile()) {
                callback(new Error('No keys file at: ' + this._filePath()));
                return;
            }

            fs.readFile(this._filePath(), function(error, keys) {
                this._encodedEllipticalKeys = keys.toString('utf8');
                callback();
            }.bind(this));
        }.bind(this)
    );
};

/**
 * This method gets the key file from disk.
 *
 * @param {Function} callback
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

        this._decodedKeysText = stdout;
        callback();
    }.bind(this));
};

/**
 * This method parses the text of a raw pem file into raw public and private elliptical keys.
 *
 * @param {Function} callback
 * @private
 */
KeyHandler.prototype._parseKeysText = function(callback) {
    if (!this._decodedKeysText) {
        callback(new Error('Error parsing keys. No text to parse'));
        return;
    }

    const lines = this._decodedKeysText.split('\n');
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

/**
 * This method takes the string stored in `_keysText` and writes it to disk.
 *
 * @param {Function} callback
 * @private
 */
KeyHandler.prototype._createPemFileFromRawText = function(callback) {
    if (!this._keysText) {
        callback(new Error('Cannot create signature. No pem file text has been set.'));
        return;
    }

    fs.writeFile(this._filePath(), this._keysText, function(error) {
            if (error) {
                callback(error);
                return;
            }

            callback();
        }.bind(this)
    );
};

/**
 * Creates a signature file from an elliptical key file.
 *
 * @param {Function} callback
 * @private
 */
KeyHandler.prototype._createSignatureFile = function(callback) {
    const command = 'openssl dgst -' + this._signingHash + ' -sign ' + this._filePath() + ' -out '
        + this._signatureFilePath() + ' ' + this._textToSignFilePath();
    childProcess.exec(command, function(error, stdout, stderr) {
        if (error) {
            logger('Error: creating elliptical keys with child process.');
            callback(error);
            return;
        }

        callback();
    });
};

KeyHandler.prototype._readSignatureFile = function(callback) {
    fs.stat(this._signatureFilePath(), function(error, fileStatus) {
            if (error) {
                callback(error);
                return;
            }

            if (!fileStatus.isFile()) {
                callback(new Error('No signature file at: ' + this._signatureFilePath()));
                return;
            }

            fs.readFile(this._signatureFilePath(), function(error, signature) {
                this._signature = signature;
                callback();
            }.bind(this));
        }.bind(this)
    );
};

KeyHandler.prototype._createTextToSignFile = function(callback) {
    if (!this._textToSign) {
        callback(new Error('No text to sign provided'));
        return;
    }

    fs.writeFile(this._textToSignFilePath(), this._textToSign, function(error) {
        if (error) {
            logger('Error: creating text file to sign');
            callback(error);
            return;
        }

        callback();
    });
};

/**
 * Cleans up files created while creating ellipticl keys.
 *
 * @param {Function} callback
 * @private
 */
KeyHandler.prototype._cleanUpKeyFile = function(callback) {
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
                logger('Not able to find elliptical keys file, ', this._fileName, ' to delete');
                callback();
            }
        }.bind(this)
    );
};

KeyHandler.prototype._cleanUpSignatureFile = function(callback) {
    fs.stat(this._signatureFilePath(), function(error, fileStatus) {
            if (error) {
                callback(error);
                return;
            }

            if (fileStatus.isFile()) {
                fs.unlink(this._signatureFilePath(), function(error) {
                    error ? callback(error) : callback();
                });
            } else {
                // Leaving this as a soft error. If we're not able to find the key
                // file on disk, we should probably throw an exception.
                logger('Not able to find signature file to delete');
                callback();
            }
        }.bind(this)
    );
};

KeyHandler.prototype._cleanUpSignatureTextFile = function(callback) {
    fs.stat(this._textToSignFilePath(), function(error, fileStatus) {
            if (error) {
                callback(error);
                return;
            }

            if (fileStatus.isFile()) {
                fs.unlink(this._textToSignFilePath(), function(error) {
                    error ? callback(error) : callback();
                });
            } else {
                // Leaving this as a soft error. If we're not able to find the key
                // file on disk, we should probably throw an exception.
                logger('Not able to find text to sign file to delete');
                callback();
            }
        }.bind(this)
    );
};

KeyHandler.prototype.cleanedSignedData = function(signedData) {
    const firstKey = signedData.slice(4, 36);
    const secondKey = signedData.slice(signedData.length - 32, signedData.length);
    return Buffer.concat([firstKey, secondKey]);
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
 * This method creates the file path for a file that contains a signature for the private
 * key stored in the file whose name is returned by '_filePath`
 *
 * @returns {string}
 * @private
 */
KeyHandler.prototype._signatureFilePath = function() {
    return path.join(config.paths.ellipticalKeyDirPath, this._fileName) + '-signature.pem';
};

/**
 * This method creates a file path for the text file that will be used as input
 * in the signing function.
 *
 * @returns {string}
 * @private
 */
KeyHandler.prototype._textToSignFilePath = function() {
    return path.join(config.paths.ellipticalKeyDirPath, this._fileName) + '.text';
};

module.exports = KeyHandler;
