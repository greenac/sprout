'use strict';

module.exports = {
    missingParameter: new Error('There is one or more parameters missing in the supplied request'),
    passwordDoesNotMatch: new Error('Passwords do not match'),
    internalServer: new Error('Internal server error'),
    incorrectDatabase: new Error('Incorrect database selected'),
    noError: null
};
