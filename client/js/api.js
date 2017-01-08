'use strict';

const nprogress = require('nprogress');
const cookies = require('js-cookie');
const request = require('superagent');
const config = require('./config.js');
const events = require('./events.js');

// TODO: fix abort misery

class Api extends events.EventTarget {
    constructor() {
        super();
        this.user = null;
        this.userName = null;
        this.userPassword = null;
        this.cache = {};
        this.allRanks = [
            'anonymous',
            'restricted',
            'regular',
            'power',
            'moderator',
            'administrator',
            'nobody',
        ];
        this.rankNames = new Map([
            ['anonymous', 'Anonymous'],
            ['restricted', 'Restricted user'],
            ['regular', 'Regular user'],
            ['power', 'Power user'],
            ['moderator', 'Moderator'],
            ['administrator', 'Administrator'],
            ['nobody', 'Nobody'],
        ]);
    }

    get(url, options) {
        if (url in this.cache) {
            return new Promise((resolve, reject) => {
                resolve(this.cache[url]);
            });
        }
        return this._wrappedRequest(url, request.get, {}, {}, options)
            .then(response => {
                this.cache[url] = response;
                return Promise.resolve(response);
            });
    }

    post(url, data, files, options) {
        this.cache = {};
        return this._wrappedRequest(url, request.post, data, files, options);
    }

    put(url, data, files, options) {
        this.cache = {};
        return this._wrappedRequest(url, request.put, data, files, options);
    }

    delete(url, data, options) {
        this.cache = {};
        return this._wrappedRequest(url, request.delete, data, {}, options);
    }

    hasPrivilege(lookup) {
        let minViableRank = null;
        for (let privilege of Object.keys(config.privileges)) {
            if (!privilege.startsWith(lookup)) {
                continue;
            }
            const rankName = config.privileges[privilege];
            const rankIndex = this.allRanks.indexOf(rankName);
            if (minViableRank === null || rankIndex < minViableRank) {
                minViableRank = rankIndex;
            }
        }
        if (minViableRank === null) {
            throw `Bad privilege name: ${lookup}`;
        }
        let myRank = this.user !== null ?
            this.allRanks.indexOf(this.user.rank) :
            0;
        return myRank >= minViableRank;
    }

    loginFromCookies() {
        const auth = cookies.getJSON('auth');
        return auth && auth.user && auth.password ?
            this.login(auth.user, auth.password, true) :
            Promise.resolve();
    }

    login(userName, userPassword, doRemember) {
        this.cache = {};
        return new Promise((resolve, reject) => {
            this.userName = userName;
            this.userPassword = userPassword;
            this.get('/user/' + userName + '?bump-login=true')
                .then(response => {
                    const options = {};
                    if (doRemember) {
                        options.expires = 365;
                    }
                    cookies.set(
                        'auth',
                        {'user': userName, 'password': userPassword},
                        options);
                    this.user = response;
                    resolve();
                    this.dispatchEvent(new CustomEvent('login'));
                }, error => {
                    reject(error);
                    this.logout();
                });
        });
    }

    logout() {
        this.user = null;
        this.userName = null;
        this.userPassword = null;
        this.dispatchEvent(new CustomEvent('logout'));
    }

    forget() {
        cookies.remove('auth');
    }

    isLoggedIn(user) {
        if (user) {
            return this.userName !== null &&
                this.userName.toLowerCase() === user.name.toLowerCase();
        } else {
            return this.userName !== null;
        }
    }

    _getFullUrl(url) {
        const fullUrl =
            (config.apiUrl + '/' + url).replace(/([^:])\/+/g, '$1/');
        const matches = fullUrl.match(/^([^?]*)\??(.*)$/);
        const baseUrl = matches[1];
        const request = matches[2];
        return [baseUrl, request];
    }

    _wrappedRequest(url, requestFactory, data, files, options) {
        // transform the request: upload each file, then make the request use
        // its tokens.
        data = Object.assign({}, data);
        let promise = Promise.resolve();
        let abortFunction = () => {};
        if (files) {
            for (let key of Object.keys(files)) {
                let file = files[key];
                if (file.token) {
                    data[key + 'Token'] = file.token;
                } else {
                    promise = promise
                        .then(() => {
                            let returnedPromise = this._upload(file);
                            abortFunction = () => { returnedPromise.abort(); };
                            return returnedPromise;
                        })
                        .then(token => {
                            abortFunction = () => {};
                            file.token = token;
                            data[key + 'Token'] = token;
                            return Promise.resolve();
                        });
                }
            }
        }
        promise = promise.then(() => {
            return this._rawRequest(url, requestFactory, data, {}, options);
        }, error => {
            // TODO: check if the error is because of expired uploads
            return Promise.reject(error);
        });
        promise.abort = () => abortFunction();
        return promise;
    }

    _upload(file, options) {
        let abortFunction = () => {};
        let returnedPromise = new Promise((resolve, reject) => {
            let apiPromise = this._rawRequest(
                    '/uploads', request.post, {}, {content: file}, options);
            abortFunction = () => apiPromise.abort();
            return apiPromise.then(
                response => {
                    resolve(response.token);
                    abortFunction = () => {};
                },
                reject);
        });
        returnedPromise.abort = () => abortFunction();
        return returnedPromise;
    }

    _rawRequest(url, requestFactory, data, files, options) {
        options = options || {};
        data = Object.assign({}, data);
        const [fullUrl, query] = this._getFullUrl(url);

        let abortFunction = null;

        let promise = new Promise((resolve, reject) => {
            let req = requestFactory(fullUrl);

            req.set('Accept', 'application/json');

            if (query) {
                req.query(query);
            }

            if (files) {
                for (let key of Object.keys(files)) {
                    const value = files[key];
                    if (value.constructor === String) {
                        data[key + 'Url'] = value;
                    } else {
                        req.attach(key, value || new Blob());
                    }
                }
            }

            if (data) {
                if (files && Object.keys(files).length) {
                    req.attach('metadata', new Blob([JSON.stringify(data)]));
                } else {
                    req.set('Content-Type', 'application/json');
                    req.send(data);
                }
            }

            try {
                if (this.userName && this.userPassword) {
                    req.auth(
                        this.userName,
                        encodeURIComponent(this.userPassword)
                            .replace(/%([0-9A-F]{2})/g, (match, p1) => {
                                return String.fromCharCode('0x' + p1);
                            }));
                }
            } catch (e) {
                reject(
                    new Error('Authentication error (malformed credentials)'));
            }

            if (!options.noProgress) {
                nprogress.start();
            }

            abortFunction = () => {
                req.abort();  // does *NOT* call the callback passed in .end()
                nprogress.done();
                reject(
                    new Error('The request was aborted due to user cancel.'));
            };

            req.end((error, response) => {
                nprogress.done();
                if (error) {
                    if (response && response.body) {
                        error = new Error(
                            response.body.description || 'Unknown error');
                        error.response = response.body;
                    }
                    reject(error);
                } else {
                    resolve(response.body);
                }
            });
        });

        promise.abort = () => abortFunction();

        return promise;
    }
}

module.exports = new Api();
