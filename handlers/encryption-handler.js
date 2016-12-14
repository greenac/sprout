'use strict';

let crypto = require('crypto');
let logger = require('./../utils/logger');
let config = require('./../config');
let jws = require ('jws');
const fs = require('fs');


module.exports = {
    /**
     * Length of the salt for passwords.
     */
    _saltLength: 16,

    /**
     * Set of characters used when creating a salt for passwords.
     */
    _saltSet: '0123456789abcdefghijklmnopqurstuvwxyzABCDEFGHIJKLMNOPQURSTUVWXYZ',

    /**
     * The encryption algorithm used in the `crypto` module.
     */
    _ellipticalEncryptionAlgorithm: 'secp256k1',

    /**
     * The encryption algorithm used in the `crypto` module.
     */
    _cipherEncryptionAlgorithm: 'aes-256-ecb',

    /**
     * The encoding used when encrypting data.
     */
    _encryptionEncoding: 'hex',

    /**
     * The decryption used when decrypting data.
     */
    _decryptionEncoding: 'utf8',

    /**
     * This method creates and returns public and private elliptical keys.
     *
     * @returns {{publicKey: string, privateKey: string}}
     */
    getNewEllipticalKeys: function() {
        const keyCreator = crypto.createECDH(this._ellipticalEncryptionAlgorithm);
        keyCreator.generateKeys(this._encryptionEncoding);

        return {
            publicKey: keyCreator.getPublicKey(this._encryptionEncoding),
            privateKey: keyCreator.getPrivateKey(this._encryptionEncoding)
        };
    },

    /**
     * Encrypts a value for transfer on the wire or storage in database.
     *
     * @param {string} value - Value to encrypt
     * @param {string} publicKey
     * @param {string} privateKey
     * @returns {string} - The encrypted value of the original value
     */
    encryptValue: function(value, publicKey, privateKey) {
        const cipher = crypto.createCipher(
            this._cipherEncryptionAlgorithm,
            this._ellipticalSecret(publicKey, privateKey).toString('utf8')
        );

        return cipher.update(
                value,
                this._decryptionEncoding,
                this._encryptionEncoding
            ) + cipher.final(this._encryptionEncoding);
    },

    /**
     * Decrypts a value.
     *
     * @param {string} encryptedValue
     * @param {string} publicKey
     * @param {string} privateKey
     * @returns {string}
     */
    decryptedValue: function(encryptedValue, publicKey, privateKey) {
        const decipher = crypto.createDecipher(
            this._cipherEncryptionAlgorithm,
            this._ellipticalSecret(publicKey, privateKey).toString('utf8')
        );

        return decipher.update(
                encryptedValue,
                this._encryptionEncoding,
                this._decryptionEncoding
            ) + decipher.final(this._decryptionEncoding);
    },

    /**
     * This method returns a singed value with SHA256 hash encoded with ECDSA.
     *
     * @param {String} value - Value to be encoded
     * @param {String} privateKey - 32 byte elliptical private key
     * @returns {string|String|*}
     */
    signedSHA256Value: function(value, privateKey) {
        return jws.sign({
            header: {
                alg: 'ES256'
            },
            payload: value,
            secret: privateKey
        });
    },

    /**
     *
     * @param publicKey
     * @param privateKey
     * @returns {string}
     * @private
     */
    _ellipticalSecret: function(publicKey, privateKey) {
        const keyCreator = crypto.createECDH(this._ellipticalEncryptionAlgorithm);
        keyCreator.setPrivateKey(privateKey, this._encryptionEncoding);
        return keyCreator.computeSecret(publicKey, this._encryptionEncoding);
    },

    /**
     * This method creates a new password hash.
     *
     * @param {string} pwToHashAndSalt
     * @returns {string}
     */
    newPassword: function(pwToHashAndSalt) {
        return this._createSHA256Hash(pwToHashAndSalt, this._salt());
    },

    /**
     * This method creates a new password hash.
     *
     * @param password
     * @param salt
     * @returns {string}
     * @private
     */
    _createSHA256Hash: function(password, salt) {
        let saltedPW = crypto.createHash('sha256').update(
            !!salt ? salt + password : password
        ).digest(this._encryptionEncoding);

        return !!salt ? salt + saltedPW : saltedPW;
    },

    /**
     * This method verifies a plain text password against a hashed password.
     *
     * @param incomingPW
     * @param hashedPw
     * @returns {boolean}
     */
    verifyPassword: function(incomingPW, hashedPw) {
        return this._createSHA256Hash(incomingPW, this._getSalt(hashedPw)) === hashedPw;
    },

    /**
     * This method assembles a salt for password hashing.
     *
     * @returns {string}
     * @private
     */
    _salt: function() {
        var saltString = '';
        for(let i = 0; i < this._saltLength; i++) {
            let target = Math.floor(Math.random() * this._saltSet.length);
            saltString += this._saltSet[target];
        }

        return saltString;
    },

    /**
     * This method extracts the salt from a password that has been hashed and salted.
     *
     * @param hashedAndSaltedPassword
     * @returns {string}
     * @private
     */
    _getSalt: function(hashedAndSaltedPassword) {
        return hashedAndSaltedPassword.substring(0, this._saltLength);
    },
    
    ellipticallySign: function(value, privateKey) {
        const sign = crypto.createSign('sha256');
        sign.write(value);
        sign.end();

        logger('value to encode:', value);
        logger('original private key:', privateKey);
        logger('private key length:', privateKey.length/2);
        //const privateBuffer = new Buffer(privateKey, 'hex');
        const privateBuffer = fs.readFileSync('/Users/andre/Desktop/secp256k1-key.pem');
        // let newPrivateKey = this._createSHA256Hash(privateBuffer.toString('hex'));
        // logger('sha256 private key:', newPrivateKey);
        // newPrivateKey = (new Buffer(newPrivateKey)).toString('base64');
        // logger('private key length:', newPrivateKey.length/2);
        // const totalPrivateKey = '-----BEGIN EC PRIVATE KEY-----\n'
        //     + newPrivateKey + '\n-----END EC PRIVATE KEY-----';
        // logger('private key:', totalPrivateKey);
        //return sign.sign(totalPrivateKey, 'hex');
        const rawSignature = sign.sign(privateBuffer);
        logger('raw signature:', rawSignature.toString('hex'));
        const prefix = rawSignature.slice(0, 4);
        logger('prefix:', prefix.toString('hex'));
        const firstKey = rawSignature.slice(4, 36);
        logger('first key:', firstKey.toString('hex'));
        const secondKey = rawSignature.slice(rawSignature.length - 32, rawSignature.length);
        logger('second key:', secondKey.toString('hex'));
        const middleFix = rawSignature.slice(36, rawSignature.length - 32);
        logger('middle junk:', middleFix.toString('hex'));
        return Buffer.concat([firstKey, secondKey]);
    }
};
