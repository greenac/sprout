'use strict';

let _ = require('underscore');

module.exports = {
    _users: {},

    hasUser: function(emailCode) {
        return _.has(this._users, emailCode);
    },

    addUser: function(user) {
        if (user && _.has(user, 'email_code')) {
            this._users[user.email_code] = user;
        }
    },

    getUser: function(emailCode) {
        if (this.hasUser(emailCode)) {
            return this._users[emailCode];
        }

        return null;
    },

    removeUser: function(emailCode) {
        if (_.has(this._users, emailCode)) {
            delete this._users[emailCode];
        }
    }
};
