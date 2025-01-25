// csrf-routes.js
//
// This script will check routes that require valid CSRF tokens
//
// -----------------------------------------------------------
'use strict';

const assert = require('node:assert');
const fs = require('node:fs');

if (!fs.existsSync('./package.json')) {
  console.log('Must be run from repository base folder as: node debug/public-routes.js');
  process.exit(1);
}

const {
  testEnv,
  config
  // servers
} = require('./modules/import-config.js');

const managedFetch = require('./modules/managed-fetch').managedFetch;
const {
  logRequest,
  showChain,
  showHardError
  // showJwtToken,
  // showJwtMetaData
  // check404PossibleVhostError
} = require('./modules/test-utils');

/**
 * Validate failed request with CSRF token
 * @param {Object} chain - Chain object containing common variables
 * @param {Number} expectCode - Expected HTTP response code
 * @returns {Promise} resolving to chain object
 */
const validateCsrfTokenFail = (chain, expectCode) => {
  const code = expectCode || 403;
  logRequest(chain, { ignoreErrorStatus: code });
  // console.log(chain.responseRawData);
  // console.log(chain.responseErrorMessage);
  console.log('\tExpect: status === ' + code.toString());
  assert.strictEqual(chain.responseStatus, code);
  if (code === 302) {
    console.log('\tExpect: Redirect URI matches /login');
    assert.strictEqual(chain.parsedLocationHeader, '/login');
  }
  if (code === 403) {
    console.log('\tExpect: error response contains: "Forbidden"');
    assert.ok(chain.responseErrorMessage.indexOf('Forbidden') >= 0);
  }
  console.log('\tExpect: Error contains "invalid csrf token"');
  assert.ok(chain.responseErrorMessage.indexOf('invalid csrf token') >= 0);
  return Promise.resolve(chain);
};

const chainObj = Object.create(null);

/**
 * Initialize shared variables used in chain of promises
 * @param {Object} chain - Data variables passed from promise to promise.
 * @returns {Promise} resolving to chain object
 */
const setup = (chain) => {
  chain.requestAuthorization = 'cookie';
  chain.requestAcceptType = 'text/html';
  return Promise.resolve(chain);
};

//
// Main Promise Chain
//
// Calling setup() returns a Promise to initialize variables.
// The resolved promise .then is used to call the next function
// returning the next promise in a chain of asynchronous promises.
// Each promise performs a testing function. Testing related values
// are stored in a shared object "chain".
// The chain object is the argument of each function.
// The modified chain object is returned by the resolved promise.
//
setup(chainObj)

  // -------------------------------
  // 10 GET /status (server is running)
  // In app.js
  // -------------------------------
  .then((chain) => {
    chain.testDescription = '10 GET /status (server is running)';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/status');
    chain.requestAcceptType = 'text/html';
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain);
    // console.log(JSON.stringify(chain.responseRawData, null, 2));

    console.log('\tExpect: status === 200');
    assert.strictEqual(chain.responseStatus, 200);
    console.log('\tExpect: status: "ok"');
    assert.strictEqual(chain.responseRawData.status, 'ok');
    return Promise.resolve(chain);
  })

  // -------------------------------
  // 50 GET /login - Get new nonce and CSRF token
  // -------------------------------
  .then((chain) => {
    chain.testDescription =
      '50 GET /login - Get new nonce and CSRF token';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/login');
    chain.parsedCsrfToken = null;
    chain.parsedLoginNonce = null;
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  //
  // Assertion Tests...
  //
  .then((chain) => {
    logRequest(chain);
    // console.log(chain.responseRawData);
    console.log('\tExpect: status === 200');
    assert.strictEqual(chain.responseStatus, 200);
    //
    // Parse Data
    //
    if (chain.responseStatus === 200) {
      chain.parsedCsrfToken =
        chain.responseRawData.split('name="_csrf"')[1].split('value="')[1].split('"')[0];
      chain.parsedLoginNonce = 
        chain.responseRawData.split('action="/login-authorize?nonce=')[1].split('"')[0];
    }
    return Promise.resolve(chain);
  })  

  // -----------------------------------------------
  // 51 POST /login-authorize - Get valid cookie (used in writing tests)
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '51 POST /login-authorize - Get valid cookie (used in writing tests)';
    // These values don't change, omit on future requests
    chain.requestMethod = 'POST';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/login-authorize?nonce=' + chain.parsedLoginNonce);
    chain.requestContentType = 'application/x-www-form-urlencoded';

    chain.requestBody = {
      user: testEnv.localUsername,
      password: testEnv.localPassword,
      _csrf: chain.parsedCsrfToken
    };
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain);
    // console.log(JSON.stringify(chain.responseRawData, null, 2));
    // console.log(chain.parsedLocationHeader);
    console.log('\tExpect: status === 302');
    assert.strictEqual(chain.responseStatus, 302);
    console.log('\tExpect: location header matches /irc/webclient.html');
    assert.strictEqual(chain.parsedLocationHeader, '/irc/webclient.html');

    // This is for use in developing tests.
    // First a route must be shown to work, then remove the cookie
    chain.savedCurrentSessionCookie = chain.currentSessionCookie;
    chain.savedCurrentSessionCookieExpires = chain.currentSessionCookieExpires;
    return Promise.resolve(chain);
  })

  // -------------------------------
  // 52 GET /irc/webclient.html (get CSRF)
  // -------------------------------
  .then((chain) => {
    chain.testDescription = '52 GET /irc/webclient.html (get CSRF)';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/webclient.html');
    chain.requestAcceptType = 'text/html';
    chain.parsedCsrfToken = null;
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain);
    // console.log(chain.responseRawData);

    console.log('\tExpect: status === 200');
    assert.strictEqual(chain.responseStatus, 200);
    console.log('\tExpect: body contains "name="csrf-token"');
    assert.ok(chain.responseRawData.indexOf('name="csrf-token"') >= 0)
    //
    // parse data 
    chain.parsedCsrfToken = chain.responseRawData
      .split('name="csrf-token"')[1]
      .split('content="')[1]
      .split('"')[0];
    chain.savedParsedCsrfToken = chain.parsedCsrfToken;
    console.log('parsedCsrfToken', chain.parsedCsrfToken);
    return Promise.resolve(chain);
  })

  // -----------------------------------------------
  // 100 POST /irc/server (No CSRF token)
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '100 POST /irc/server (No CSRF token)';
    chain.requestMethod = 'POST';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/server');
    chain.requestContentType = 'application/json';
    chain.requestAcceptType = 'application/json'
    chain.requestCsrfHeader = chain.savedParsedCsrfToken;
    // Remove CSRF token from request (this is the test)
    chain.requestCsrfHeader = null;
    chain.requestBody = {
      index: testEnv.ircServerIndex
    };
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => validateCsrfTokenFail(chain, 403))

  // -----------------------------------------------
  // 101 POST /irc/connect (No CSRF token)
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '101 POST /irc/connect (No CSRF token)';
    chain.requestMethod = 'POST';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/connect');
    chain.requestContentType = 'application/json';
    chain.requestAcceptType = 'application/json'
    chain.requestCsrfHeader = chain.savedParsedCsrfToken;
    // Remove CSRF token from request (this is the test)
    chain.requestCsrfHeader = null;
    chain.requestBody = {
      "nickName": testEnv.ircNickname,
      "realName": testEnv.ircRealname,
      "userMode": testEnv.ircConnectMode
    };
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => validateCsrfTokenFail(chain, 403))

  // -----------------------------------------------
  // 102 POST /irc/message (No CSRF token)
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '102 POST /irc/message (No CSRF token)';
    chain.requestMethod = 'POST';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/message');
    chain.requestContentType = 'application/json';
    chain.requestAcceptType = 'application/json'
    chain.requestCsrfHeader = chain.savedParsedCsrfToken;
    // Remove CSRF token from request (this is the test)
    chain.requestCsrfHeader = null;
    chain.requestBody = {
      message: "MOTD"
    };
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => validateCsrfTokenFail(chain, 403))

  // -----------------------------------------------
  // 103 POST /irc/prune (No CSRF token)
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '103 POST /irc/prune (No CSRF token)';
    chain.requestMethod = 'POST';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/prune');
    chain.requestContentType = 'application/json';
    chain.requestAcceptType = 'application/json'
    chain.requestCsrfHeader = chain.savedParsedCsrfToken;
    // Remove CSRF token from request (this is the test)
    chain.requestCsrfHeader = null;
    chain.requestBody = {
      channel: testEnv.ircChannel
    };
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => validateCsrfTokenFail(chain, 403))

  // -----------------------------------------------
  // 104 POST /irc/erase (No CSRF token)
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '104 POST /irc/erase (No CSRF token)';
    chain.requestMethod = 'POST';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/erase');
    chain.requestContentType = 'application/json';
    chain.requestAcceptType = 'application/json'
    chain.requestCsrfHeader = chain.savedParsedCsrfToken;
    // Remove CSRF token from request (this is the test)
    chain.requestCsrfHeader = null;
    chain.requestBody = {
      erase:"CACHE"
    };
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => validateCsrfTokenFail(chain, 403))

  // -----------------------------------------------
  // 105 POST /irc/disconnect (No CSRF token)
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '105 POST /irc/disconnect (No CSRF token)';
    chain.requestMethod = 'POST';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/disconnect');
    chain.requestContentType = 'application/json';
    chain.requestAcceptType = 'application/json'
    chain.requestCsrfHeader = chain.savedParsedCsrfToken;
    // Remove CSRF token from request (this is the test)
    chain.requestCsrfHeader = null;
    chain.requestBody = {};
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => validateCsrfTokenFail(chain, 403))

  // -----------------------------------------------
  // 106 POST /terminate (No CSRF token)
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '106 POST /terminate (No CSRF token)';
    chain.requestMethod = 'POST';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/terminate');
    chain.requestContentType = 'application/json';
    chain.requestCsrfHeader = chain.savedParsedCsrfToken;
    // Remove CSRF token from request (this is the test)
    chain.requestCsrfHeader = null;
    chain.requestBody = {
      terminate: 'YES'
    };
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => validateCsrfTokenFail(chain, 403))

  // -----------------------------------------------
  // 201 POST /irc/serverlist (No CSRF token)
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '201 POST /irc/serverlist (No CSRF token)';
    chain.requestMethod = 'POST';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/serverlist');
    chain.requestContentType = 'application/json';
    chain.requestAcceptType = 'application/json'
    chain.requestCsrfHeader = chain.savedParsedCsrfToken;
    // Remove CSRF token from request (this is the test)
    chain.requestCsrfHeader = null;
    chain.requestBody = {
      disabled: true,
      comment: 'rest of object properties omitted in test'
    };
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => validateCsrfTokenFail(chain, 403))

  // -----------------------------------------------
  // 202 PATCH /irc/serverlist?index=x (No CSRF token)
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '202 PATCH /irc/serverlist?index=x (No CSRF token)';
    chain.requestMethod = 'PATCH';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/serverlist?index=' + testEnv.ircServerIndex.toString());
    chain.requestContentType = 'application/json';
    chain.requestAcceptType = 'application/json'
    chain.requestCsrfHeader = chain.savedParsedCsrfToken;
    // Remove CSRF token from request (this is the test)
    chain.requestCsrfHeader = null;
    chain.requestBody = {
      index: testEnv.ircServerIndex,
      disabled: true,
      comment: 'rest of object properties omitted in test'
    };
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => validateCsrfTokenFail(chain, 403))

  // -----------------------------------------------
  // 203 COPY /irc/serverlist?index=x (No CSRF token)
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '203 COPY /irc/serverlist?index=x (No CSRF token)';
    chain.requestMethod = 'COPY';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/serverlist?index=' + testEnv.ircServerIndex.toString());
    chain.requestContentType = 'application/json';
    chain.requestAcceptType = 'application/json'
    chain.requestCsrfHeader = chain.savedParsedCsrfToken;
    // Remove CSRF token from request (this is the test)
    chain.requestCsrfHeader = null;
    chain.requestBody = {
      index: testEnv.ircServerIndex,
    };
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => validateCsrfTokenFail(chain, 403))

  // -----------------------------------------------
  // 204 DELETE /irc/serverlist?index=x (No CSRF token)
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '204 DELETE /irc/serverlist?index=x (No CSRF token)';
    chain.requestMethod = 'DELETE';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/serverlist?index=' + testEnv.ircServerIndex.toString());
    chain.requestContentType = 'application/json';
    chain.requestAcceptType = 'application/json'
    chain.requestCsrfHeader = chain.savedParsedCsrfToken;
    // Remove CSRF token from request (this is the test)
    chain.requestCsrfHeader = null;
    chain.requestBody = {
      index: testEnv.ircServerIndex,
    };
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => validateCsrfTokenFail(chain, 403))

  //
  // For Debug, show chain object
  //
  .then((chain) => showChain(chain))

  //
  // Assert did not exit, assume all tests passed
  //
  .then((chain) => {
    console.log('---------------------');
    console.log('  All Tests Passed');
    console.log('---------------------');
  })

  //
  // In normal testing, no errors should be rejected in the promise chain.
  // In the case of hardware network errors, catch the error.
  .catch((err) => showHardError(err));
