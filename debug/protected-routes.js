// protected-routes.js
//
// This script will confirm that protected routes are not available 
// without a valid login cookie
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
 * Validate failed request
 * @param {Object} chain - Chain object containing common variables
 * @param {Number} expectCode - Expected HTTP response code
 * @returns {Promise} resolving to chain object
 */
const validateRequestFail = (chain, expectCode) => {
  const code = expectCode || 302;
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
    // console.log('parsedCsrfToken', chain.parsedCsrfToken);
    //
    // Reset of tests will not use cookie, unless added to debug specific test
    //
    delete chain.currentSessionCookie;
    delete chain.currentSessionCookieExpires
    return Promise.resolve(chain);
  })

  // -------------------------------
  // 100 GET /secure (no cookie)
  // In web-server.mjs
  // -------------------------------
  .then((chain) => {
    chain.testDescription = '100 GET /secure (no cookie)';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/secure');
    chain.requestAcceptType = 'text/html';
    // Make sure the route works, then remove cookie
    // chain.currentSessionCookie = chain.savedCurrentSessionCookie;
    // chain.currentSessionCookieExpires = chain.savedCurrentSessionCookieExpires;
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => validateRequestFail(chain, 403))

  // -------------------------------
  // 101 GET /userinfo (no cookie)
  // -------------------------------
  .then((chain) => {
    chain.testDescription = '101 GET /userinfo (no cookie)';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/userinfo');
    chain.requestAcceptType = 'application/json'
    // Make sure the route works, then remove cookie
    // chain.currentSessionCookie = chain.savedCurrentSessionCookie;
    // chain.currentSessionCookieExpires = chain.savedCurrentSessionCookieExpires;
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => validateRequestFail(chain, 403))

  // -----------------------------------------------
  // 102 POST /irc/server (no cookie)
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '102 POST /irc/server (no cookie)';
    chain.requestMethod = 'POST';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/server');
    chain.requestContentType = 'application/json';
    chain.requestAcceptType = 'application/json'
    chain.requestCsrfHeader = chain.parsedCsrfToken;
    chain.requestBody = {
      index: testEnv.ircServerIndex
    };
    // Make sure the route works, then remove cookie
    // chain.currentSessionCookie = chain.savedCurrentSessionCookie;
    // chain.currentSessionCookieExpires = chain.savedCurrentSessionCookieExpires;
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => validateRequestFail(chain, 403))

  // -----------------------------------------------
  // 103 POST /irc/connect (no cookie)
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '103 POST /irc/connect (no cookie)';
    chain.requestMethod = 'POST';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/connect');
    chain.requestContentType = 'application/json';
    chain.requestAcceptType = 'application/json'
    chain.requestCsrfHeader = chain.parsedCsrfToken;
    chain.requestBody = {
      "nickName": testEnv.ircNickname,
      "realName": testEnv.ircRealname,
      "userMode": testEnv.ircConnectMode
    };
    // Make sure the route works, then remove cookie
    // chain.currentSessionCookie = chain.savedCurrentSessionCookie;
    // chain.currentSessionCookieExpires = chain.savedCurrentSessionCookieExpires;
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => validateRequestFail(chain, 403))

  // -----------------------------------------------
  // 104 POST /irc/message (no cookie)
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '104 POST /irc/message (no cookie)';
    chain.requestMethod = 'POST';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/message');
    chain.requestContentType = 'application/json';
    chain.requestAcceptType = 'application/json'
    chain.requestCsrfHeader = chain.parsedCsrfToken;
    chain.requestBody = {
      message: "MOTD"
    };
    // Make sure the route works, then remove cookie
    // chain.currentSessionCookie = chain.savedCurrentSessionCookie;
    // chain.currentSessionCookieExpires = chain.savedCurrentSessionCookieExpires;
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => validateRequestFail(chain, 403))

  // -----------------------------------------------
  // 105 GET /irc/getircstate (no cookie)
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '105 GET /irc/getircstate (no cookie)';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/getircstate');
    chain.requestAcceptType = 'application/json'
    // Make sure the route works, then remove cookie
    // chain.currentSessionCookie = chain.savedCurrentSessionCookie;
    // chain.currentSessionCookieExpires = chain.savedCurrentSessionCookieExpires;
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => validateRequestFail(chain, 403))

  // -----------------------------------------------
  // 106 POST /irc/prune (no cookie)
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '106 POST /irc/prune (no cookie)';
    chain.requestMethod = 'POST';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/prune');
    chain.requestContentType = 'application/json';
    chain.requestAcceptType = 'application/json'
    chain.requestCsrfHeader = chain.parsedCsrfToken;
    chain.requestBody = {
      channel: testEnv.ircChannel
    };
    // Make sure the route works, then remove cookie
    // chain.currentSessionCookie = chain.savedCurrentSessionCookie;
    // chain.currentSessionCookieExpires = chain.savedCurrentSessionCookieExpires;
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => validateRequestFail(chain, 403))

  // -----------------------------------------------
  // 107 GET /irc/cache (no cookie)
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '107 GET /irc/cache (no cookie)';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/cache');
    chain.requestAcceptType = 'application/json'
    // Make sure the route works, then remove cookie
    // chain.currentSessionCookie = chain.savedCurrentSessionCookie;
    // chain.currentSessionCookieExpires = chain.savedCurrentSessionCookieExpires;
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => validateRequestFail(chain, 403))

  // -----------------------------------------------
  // 108 POST /irc/erase (no cookie)
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '108 POST /irc/erase (no cookie)';
    chain.requestMethod = 'POST';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/erase');
    chain.requestContentType = 'application/json';
    chain.requestAcceptType = 'application/json'
    chain.requestCsrfHeader = chain.parsedCsrfToken;
    chain.requestBody = {
      erase:"CACHE"
    };
    // Make sure the route works, then remove cookie
    // chain.currentSessionCookie = chain.savedCurrentSessionCookie;
    // chain.currentSessionCookieExpires = chain.savedCurrentSessionCookieExpires;
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => validateRequestFail(chain, 403))

  // -----------------------------------------------
  // 109 POST /irc/disconnect (no cookie)
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '109 POST /irc/disconnect (no cookie)';
    chain.requestMethod = 'POST';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/disconnect');
    chain.requestContentType = 'application/json';
    chain.requestAcceptType = 'application/json'
    chain.requestCsrfHeader = chain.parsedCsrfToken;
    chain.requestBody = {};
    // Make sure the route works, then remove cookie
    // chain.currentSessionCookie = chain.savedCurrentSessionCookie;
    // chain.currentSessionCookieExpires = chain.savedCurrentSessionCookieExpires;
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => validateRequestFail(chain, 403))

  // -----------------------------------------------
  // 110 POST /terminate (no cookie)
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '110 POST /terminate (no cookie)';
    chain.requestMethod = 'POST';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/terminate');
    chain.requestContentType = 'application/json';
    chain.requestAcceptType = 'application/json'
    chain.requestCsrfHeader = chain.parsedCsrfToken;
    chain.requestBody = {
      terminate: 'YES'
    };
    // Make sure the route works, then remove cookie
    // chain.currentSessionCookie = chain.savedCurrentSessionCookie;
    // chain.currentSessionCookieExpires = chain.savedCurrentSessionCookieExpires;
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => validateRequestFail(chain, 403))

  // -----------------------------------------------
  // 200 GET /irc/serverlist (no cookie)
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '200 GET /irc/serverlist (no cookie)';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/serverlist');
    chain.requestAcceptType = 'application/json'
    // Delete cookie for series of tests
    delete chain.currentSessionCookie;
    delete chain.currentSessionCookieExpires
    // Make sure the route works, then remove cookie
    // chain.currentSessionCookie = chain.savedCurrentSessionCookie;
    // chain.currentSessionCookieExpires = chain.savedCurrentSessionCookieExpires;
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => validateRequestFail(chain, 403))

  // -----------------------------------------------
  // 201 POST /irc/serverlist (no cookie)
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '201 POST /irc/serverlist (no cookie)';
    chain.requestMethod = 'POST';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/serverlist');
    chain.requestContentType = 'application/json';
    chain.requestAcceptType = 'application/json'
    chain.requestCsrfHeader = chain.parsedCsrfToken;
    chain.requestBody = {
      disabled: true,
      comment: 'rest of object properties omitted in test'
    };
    // Make sure the route works, then remove cookie
    // chain.currentSessionCookie = chain.savedCurrentSessionCookie;
    // chain.currentSessionCookieExpires = chain.savedCurrentSessionCookieExpires;
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => validateRequestFail(chain, 403))

  // -----------------------------------------------
  // 202 PATCH /irc/serverlist?index=x (no cookie)
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '202 PATCH /irc/serverlist?index=x (no cookie)';
    chain.requestMethod = 'PATCH';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/serverlist?index=' + testEnv.ircServerIndex.toString());
    chain.requestContentType = 'application/json';
    chain.requestAcceptType = 'application/json'
    chain.requestCsrfHeader = chain.parsedCsrfToken;
    chain.requestBody = {
      index: testEnv.ircServerIndex,
      disabled: true,
      comment: 'rest of object properties omitted in test'
    };
    // Make sure the route works, then remove cookie
    // chain.currentSessionCookie = chain.savedCurrentSessionCookie;
    // chain.currentSessionCookieExpires = chain.savedCurrentSessionCookieExpires;
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => validateRequestFail(chain, 403))

  // -----------------------------------------------
  // 203 COPY /irc/serverlist (no cookie)
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '203 COPY /irc/serverlist (no cookie)';
    chain.requestMethod = 'COPY';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/serverlist?index=' + testEnv.ircServerIndex.toString());
    chain.requestContentType = 'application/json';
    chain.requestAcceptType = 'application/json'
    chain.requestCsrfHeader = chain.parsedCsrfToken;
    chain.requestBody = {
      index: testEnv.ircServerIndex,
    };
    // Make sure the route works, then remove cookie
    // chain.currentSessionCookie = chain.savedCurrentSessionCookie;
    // chain.currentSessionCookieExpires = chain.savedCurrentSessionCookieExpires;
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => validateRequestFail(chain, 403))

  // -----------------------------------------------
  // 204 DELETE /irc/serverlist (no cookie)
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '204 DELETE /irc/serverlist (no cookie)';
    chain.requestMethod = 'DELETE';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/serverlist?index=' + testEnv.ircServerIndex.toString());
    chain.requestContentType = 'application/json';
    chain.requestAcceptType = 'application/json'
    chain.requestCsrfHeader = chain.parsedCsrfToken;
    chain.requestBody = {
      index: testEnv.ircServerIndex,
    };
    // Make sure the route works, then remove cookie
    // chain.currentSessionCookie = chain.savedCurrentSessionCookie;
    // chain.currentSessionCookieExpires = chain.savedCurrentSessionCookieExpires;
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => validateRequestFail(chain, 403))

  // -------------------------------
  // 300 GET /irc/webclient.html (custom route, expect redirect)
  // -------------------------------
  .then((chain) => {
    chain.testDescription = '300 GET /irc/webclient.html (custom route, no cookie)';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/webclient.html');
    chain.requestAcceptType = 'text/html';
    // Make sure the route works, then remove cookie
    // chain.currentSessionCookie = chain.savedCurrentSessionCookie;
    // chain.currentSessionCookieExpires = chain.savedCurrentSessionCookieExpires
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => validateRequestFail(chain, 302))

  // -------------------------------
  // 301 GET /irc/css/styles.css (from web root, no redirect)
  // -------------------------------
  .then((chain) => {
    chain.testDescription = '301 GET /irc/css/styles.css (from web root, no cookie)';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/css/styles.css');
    chain.requestAcceptType = 'text/html';
    // Make sure the route works, then remove cookie
    // chain.currentSessionCookie = chain.savedCurrentSessionCookie;
    // chain.currentSessionCookieExpires = chain.savedCurrentSessionCookieExpires
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => validateRequestFail(chain, 403))

  // -------------------------------
  // 302 GET /irc/js/webclient.js (from web root, no redirect)
  // -------------------------------
  .then((chain) => {
    chain.testDescription = '302 GET /irc/js/webclient.js (from web root, no cookie)';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/js/webclient.js');
    chain.requestAcceptType = 'text/html';
    // Make sure the route works, then remove cookie
    // chain.currentSessionCookie = chain.savedCurrentSessionCookie;
    // chain.currentSessionCookieExpires = chain.savedCurrentSessionCookieExpires
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => validateRequestFail(chain, 403))

  // -------------------------------
  // 303 GET /irc/sounds/short-beep1.mp3 (from web root, no redirect)
  // -------------------------------
  .then((chain) => {
    chain.testDescription = '303 GET /irc/sounds/short-beep1.mp3 (from web root, no redirect)';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/sounds/short-beep1.mp3');
    chain.requestAcceptType = 'text/html';
    // Make sure the route works, then remove cookie
    // chain.currentSessionCookie = chain.savedCurrentSessionCookie;
    // chain.currentSessionCookieExpires = chain.savedCurrentSessionCookieExpires
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => validateRequestFail(chain, 403))

 // -------------------------------
  // 400 GET /irc/docs/ (from /docs/ root, no redirect)
  // -------------------------------
  .then((chain) => {
    chain.testDescription = '400 GET /irc/docs/ (from /docs/ root, no redirect)';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/docs/');
    chain.requestAcceptType = 'text/html';
    // Make sure the route works, then remove cookie
    // chain.currentSessionCookie = chain.savedCurrentSessionCookie;
    // chain.currentSessionCookieExpires = chain.savedCurrentSessionCookieExpires
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => validateRequestFail(chain, 403))

 // -------------------------------
  // 401 GET /irc/docs/installation.html (from /docs/ root, no redirect)
  // -------------------------------
  .then((chain) => {
    chain.testDescription = '401 GET /irc/docs/installation.html (from /docs/ root, no redirect)';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/docs/installation.html');
    chain.requestAcceptType = 'text/html';
    // Make sure the route works, then remove cookie
    // chain.currentSessionCookie = chain.savedCurrentSessionCookie;
    // chain.currentSessionCookieExpires = chain.savedCurrentSessionCookieExpires
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => validateRequestFail(chain, 403))

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
