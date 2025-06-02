// user-auth-login
//
// This script will emulate the browser submission of 
// the HTML form data for user password entry.
//
// -----------------------------------------------------------
'use strict';

const assert = require('node:assert');
const fs = require('node:fs');

// From csurf v1.14.1
// const Tokens = require('../../irc-hybrid-client/node_modules/@dr.pogodin/csurf/tokens.js');
// const tokens = new Tokens({});

// Updated imports to address csurf 1.16.4
const Tokens = require("../../irc-hybrid-client/node_modules/@dr.pogodin/csurf/build/cjs/tokens")
const tokens = new Tokens.default({});

if (!fs.existsSync('./package.json')) {
  console.log('Must be run from repository base folder as: node debug/user-auth-login.js');
  process.exit(1);
}

const {
  testEnv,
  config
  // servers
} = require('./modules/import-config.js');

if (config.oauth2.enableRemoteLogin) {
  console.log();
  console.log('The irc-hybrid-client web server is configured for remote authentication');
  console.log('Local authentication tests: skipped');
  console.log
  console.log('---------------------');
  console.log('  All Tests Passed');
  console.log('---------------------');
  process.exit(0);
}

const managedFetch = require('./modules/managed-fetch').managedFetch;
const {
  logRequest,
  showChain,
  showHardError
  // showJwtToken,
  // showJwtMetaData
  // check404PossibleVhostError
} = require('./modules/test-utils');

const chainObj = Object.create(null);

/**
 * Validate login response data assertions.
 * @param {Object} chain - Chain object containing common variables
 * @returns {Promise} resolving to chain object
 */
const validateLoginResponsePass = (chain) => {
  logRequest(chain);
  // console.log(chain.responseRawData);
  // console.log('parsedLoctionHeader', chain.parsedLocationHeader);
  console.log('\tExpect: status === 302');
  assert.strictEqual(chain.responseStatus, 302);
  console.log('\tExpect: Redirect URI matches /irc/webclient.html');
  assert.strictEqual(chain.parsedLocationHeader, '/irc/webclient.html');
  return Promise.resolve(chain);
};

/**
 * Validate failed access request
 * @param {Object} chain - Chain object containing common variables
 * @param {Number} expectCode - Expected HTTP response code
 * @returns {Promise} resolving to chain object
 */
const validateLoginResponseFail = (chain, expectCode) => {
  const code = expectCode || 302;
  logRequest(chain, { ignoreErrorStatus: code });
  // console.log(chain.responseRawData);
  console.log('\tExpect: status === ' + code.toString());
  assert.strictEqual(chain.responseStatus, code);
  if (code === 302) {
    console.log('\tExpect: Redirect URI matches /login');
    assert.strictEqual(chain.parsedLocationHeader, '/login');
  }
  return Promise.resolve(chain);
};

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
  // 100 GET /status (server is running)
  // In web-server.mjs
  // -------------------------------
  .then((chain) => {
    chain.testDescription = '100 GET /status (server is running)';
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
  // 101 GET /irc/webclient.html (no cookie)
  // -------------------------------
  .then((chain) => {
    chain.testDescription = '101 GET /irc/webclient.html (no cookie)';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/webclient.html');
    chain.requestAcceptType = 'text/html';
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain);
    // console.log(JSON.stringify(chain.responseRawData, null, 2));
    // console.log(chain.parsedLocationHeader);

    console.log('\tExpect: status === 302');
    assert.strictEqual(chain.responseStatus, 302);
    console.log('\tExpect: Redirect URI matches /login');
    assert.strictEqual(chain.parsedLocationHeader, '/login');
    return Promise.resolve(chain);
  })

  // -------------------------------
  // 102 GET /login - Login form with csrf token and nonce
  // -------------------------------
  .then((chain) => {
    chain.testDescription =
      '102 GET /login - Login form with csrf token and nonce';
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
    console.log('\tExpect: body contains "<h2 class="center">irc-hybrid-client</h2>"');
    assert.ok(chain.responseRawData.indexOf('<h2 class="center">irc-hybrid-client</h2>') >= 0);
    console.log('\tExpect: body contains "name="_csrf""');
    assert.ok(chain.responseRawData.indexOf('name="_csrf"') >= 0);
    console.log('\tExpect: body contains "/login-authorize?nonce="');
    assert.ok(chain.responseRawData.indexOf('/login-authorize?nonce=') >= 0);
    //
    // Parse Data
    //
    if (chain.responseStatus === 200) {
      chain.parsedCsrfToken =
        chain.responseRawData.split('name="_csrf"')[1].split('value="')[1].split('"')[0];
      chain.parsedLoginNonce = 
        chain.responseRawData.split('action="/login-authorize?nonce=')[1].split('"')[0];
    }
    // console.log('parsedCsrfToken', chain.parsedCsrfToken);
    // console.log('parsedLoginNonce', chain.parsedLoginNonce);
    return Promise.resolve(chain);
  })

  // -----------------------------------------------
  // 103 POST /login-authorize - Expect successful result
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '103 POST /login-authorize - Expect successful result';
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
  .then((chain) => validateLoginResponsePass(chain))

  // -------------------------------
  // 104 GET /irc/webclient.html (with valid cookie)
  // -------------------------------
  .then((chain) => {
    chain.testDescription = '104 GET /irc/webclient.html (with valid cookie)';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/webclient.html');
    chain.requestAcceptType = 'text/html';
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain);
    // console.log(JSON.stringify(chain.responseRawData, null, 2));
    // console.log(chain.parsedLocationHeader);

    console.log('\tExpect: status === 200');
    assert.strictEqual(chain.responseStatus, 200);
    
    console.log('\tExpect: body contains "<title>irc-hybrid-client</title>');
    assert.ok(chain.responseRawData.indexOf('<title>irc-hybrid-client</title>') >= 0)
    return Promise.resolve(chain);
  })


  // -------------------------------
  // 105 GET /logout
  // -------------------------------
  .then((chain) => {
    chain.testDescription =
      '105 GET /logout';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/logout');
    // Save to test after logout
    chain.tempLastCurrentSessionCookie = chain.currentSessionCookie;
    chain.tempLastCurrentSessionCookieExpires = chain.currentSessionCookieExpires;
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
    console.log('\tExpect: body contains "<h2 class="center">irc-hybrid-client</h2>"');
    assert.ok(chain.responseRawData.indexOf('<h2 class="center">irc-hybrid-client</h2>') >= 0);
    console.log('\tExpect: body contains "successfully logged out"');
    assert.ok(chain.responseRawData.indexOf('successfully logged out') >= 0);
    //
    // Parse Data
    //

    return Promise.resolve(chain);
  })

  // -------------------------------
  // 106 GET /irc/webclient.html (previous cookie after logout)
  // -------------------------------
  .then((chain) => {
    chain.testDescription = '106 GET /irc/webclient.html (previous cookie after logout)';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/webclient.html');
    chain.requestAcceptType = 'text/html';
    chain.currentSessionCookie = chain.tempLastCurrentSessionCookie;
    chain.currentSessionCookieExpires = chain.tempLastCurrentSessionCookieExpires;
    delete chain.tempLastCurrentSessionCookie;
    delete chain.tempLastCurrentSessionCookieExpires;
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain);
    // console.log(JSON.stringify(chain.responseRawData, null, 2));
    // console.log(chain.parsedLocationHeader);

    console.log('\tExpect: status === 302');
    assert.strictEqual(chain.responseStatus, 302);
    console.log('\tExpect: Redirect URI matches /login');
    assert.strictEqual(chain.parsedLocationHeader, '/login');

    return Promise.resolve(chain);
  })



  // -------------------------------
  // 200 GET /login - Get new nonce and CSRF token
  // -------------------------------
  .then((chain) => {
    chain.testDescription =
      '200 GET /login - Get new nonce and CSRF token';
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
  // 201 POST /login-authorize - Success 1 of 2 in a row
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '201 POST /login-authorize - Success 1 of 2 in a row';
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
  .then((chain) => validateLoginResponsePass(chain))

  // -----------------------------------------------
  // 202 POST /login-authorize - Re-post same (double POST, expect fail)
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '202 POST /login-authorize - Re-post same (double POST, expect fail)';
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
  .then((chain) => validateLoginResponseFail(chain))

  // -------------------------------
  // 300 GET /login - Get new nonce and CSRF token
  // -------------------------------
  .then((chain) => {
    chain.testDescription =
      '300 GET /login - Get new nonce and CSRF token';
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
  // 301 POST /login-authorize - Missing nonce
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '301 POST /login-authorize - Missing nonce';
    // These values don't change, omit on future requests
    chain.requestMethod = 'POST';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/login-authorize');
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
    logRequest(chain, { ignoreErrorStatus: 400 });
    // console.log(chain.responseRawData);
    // console.log(chain.responseErrorMessage);
    console.log('\tExpect: status === 400');
    assert.strictEqual(chain.responseStatus, 400);
    console.log('\tExpect: Error contains "Bad Request"');
    assert.ok(chain.responseErrorMessage.indexOf('Bad Request') >= 0);
    return Promise.resolve(chain);
  })

  // -------------------------------
  // 302 GET /login - Get new nonce and CSRF token
  // -------------------------------
  .then((chain) => {
    chain.testDescription =
      '302 GET /login - Get new nonce and CSRF token';
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
  // 303 POST /login-authorize - Invalid nonce
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '303 POST /login-authorize - Invalid nonce';
    // These values don't change, omit on future requests
    chain.requestMethod = 'POST';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/login-authorize?nonce=4INVALID');
    chain.requestContentType = 'application/x-www-form-urlencoded';

    chain.requestBody = {
      user: testEnv.localUsername,
      password: testEnv.localPassword,
      _csrf: chain.parsedCsrfToken
    };
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => validateLoginResponseFail(chain))

  // -------------------------------
  // 304 GET /login - Get new nonce and CSRF token
  // -------------------------------
  .then((chain) => {
    chain.testDescription =
      '304 GET /login - Get new nonce and CSRF token';
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
  // 305 POST /login-authorize - Missing CSRF token
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '305 POST /login-authorize - Missing CSRF token';
    // These values don't change, omit on future requests
    chain.requestMethod = 'POST';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/login-authorize?nonce=' + chain.parsedLoginNonce);
    chain.requestContentType = 'application/x-www-form-urlencoded';

    chain.requestBody = {
      user: testEnv.localUsername,
      password: testEnv.localPassword
      // _csrf: chain.parsedCsrfToken
    };
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain, { ignoreErrorStatus: 403 });
    // console.log(chain.responseRawData);
    // console.log(chain.responseErrorMessage);
    console.log('\tExpect: status === 403');
    assert.strictEqual(chain.responseStatus, 403);
    console.log('\tExpect: Error contains "invalid csrf token"');
    assert.ok(chain.responseErrorMessage.indexOf('invalid csrf token') >= 0);
    return Promise.resolve(chain);
  })

  // -------------------------------
  // 306 GET /login - Get new nonce and CSRF token
  // -------------------------------
  .then((chain) => {
    chain.testDescription =
      '306 GET /login - Get new nonce and CSRF token';
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
  // 307 POST /login-authorize - Invalid CSRF token
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '307 POST /login-authorize - Invalid CSRF token';
    // These values don't change, omit on future requests
    chain.requestMethod = 'POST';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/login-authorize?nonce=' + chain.parsedLoginNonce);
    chain.requestContentType = 'application/x-www-form-urlencoded';

    chain.requestBody = {
      user: testEnv.localUsername,
      password: testEnv.localPassword,
      // This created a token using different signature key
      _csrf: tokens.create('abcdefghijklmnop')
    };
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain, { ignoreErrorStatus: 403 });
    // console.log(chain.responseRawData);
    // console.log(chain.responseErrorMessage);
    console.log('\tExpect: status === 403');
    assert.strictEqual(chain.responseStatus, 403);
    console.log('\tExpect: Error contains "invalid csrf token"');
    assert.ok(chain.responseErrorMessage.indexOf('invalid csrf token') >= 0);
    return Promise.resolve(chain);
  })

  // -------------------------------
  // 400 GET /login - Get new nonce and CSRF token
  // -------------------------------
  .then((chain) => {
    chain.testDescription =
      '400 GET /login - Get new nonce and CSRF token';
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
  // 401 POST /login-authorize - Missing user
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '401 POST /login-authorize - Missing user';
    // These values don't change, omit on future requests
    chain.requestMethod = 'POST';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/login-authorize?nonce=' + chain.parsedLoginNonce);
    chain.requestContentType = 'application/x-www-form-urlencoded';

    chain.requestBody = {
      // user: testEnv.localUsername,
      password: testEnv.localPassword,
      _csrf: chain.parsedCsrfToken
    };
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain, { ignoreErrorStatus: 400 });
    // console.log(chain.responseRawData);
    // console.log(chain.responseErrorMessage);
    console.log('\tExpect: status === 400');
    assert.strictEqual(chain.responseStatus, 400);
    console.log('\tExpect: Error contains "Bad Request"');
    assert.ok(chain.responseErrorMessage.indexOf('Bad Request') >= 0);
    return Promise.resolve(chain);
  })

  // -------------------------------
  // 402 GET /login - Get new nonce and CSRF token
  // -------------------------------
  .then((chain) => {
    chain.testDescription =
      '402 GET /login - Get new nonce and CSRF token';
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
  // 403 POST /login-authorize - Invalid user
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '403 POST /login-authorize - Invalid user';
    // These values don't change, omit on future requests
    chain.requestMethod = 'POST';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/login-authorize?nonce=' + chain.parsedLoginNonce);
    chain.requestContentType = 'application/x-www-form-urlencoded';

    chain.requestBody = {
      user: 'invalid',
      password: testEnv.localPassword,
      _csrf: chain.parsedCsrfToken
    };
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => validateLoginResponseFail(chain))

  // -------------------------------
  // 404 GET /login - Get new nonce and CSRF token
  // -------------------------------
  .then((chain) => {
    chain.testDescription =
      '404 GET /login - Get new nonce and CSRF token';
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
  // 405 POST /login-authorize - Missing password
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '405 POST /login-authorize - Missing password';
    // These values don't change, omit on future requests
    chain.requestMethod = 'POST';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/login-authorize?nonce=' + chain.parsedLoginNonce);
    chain.requestContentType = 'application/x-www-form-urlencoded';

    chain.requestBody = {
      user: testEnv.localUsername,
      // password: testEnv.localPassword,
      _csrf: chain.parsedCsrfToken
    };
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain, { ignoreErrorStatus: 400 });
    // console.log(chain.responseRawData);
    // console.log(chain.responseErrorMessage);
    console.log('\tExpect: status === 400');
    assert.strictEqual(chain.responseStatus, 400);
    console.log('\tExpect: Error contains "Bad Request"');
    assert.ok(chain.responseErrorMessage.indexOf('Bad Request') >= 0);
    return Promise.resolve(chain);
  })

  // -------------------------------
  // 406 GET /login - Get new nonce and CSRF token
  // -------------------------------
  .then((chain) => {
    chain.testDescription =
      '406 GET /login - Get new nonce and CSRF token';
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
  // 407 POST /login-authorize - Invalid password
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '407 POST /login-authorize - Invalid password';
    // These values don't change, omit on future requests
    chain.requestMethod = 'POST';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/login-authorize?nonce=' + chain.parsedLoginNonce);
    chain.requestContentType = 'application/x-www-form-urlencoded';

    chain.requestBody = {
      user: testEnv.localUsername,
      password: 'invalid',
      _csrf: chain.parsedCsrfToken
    };
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => validateLoginResponseFail(chain))


  // -------------------------------
  // 500 GET /login - Get new nonce and CSRF token
  // -------------------------------
  .then((chain) => {
    chain.testDescription =
      '500 GET /login - Get new nonce and CSRF token';
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
  // 501 POST /login-authorize - oversize user
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '501 POST /login-authorize - oversize user';
    // These values don't change, omit on future requests
    chain.requestMethod = 'POST';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/login-authorize?nonce=' + chain.parsedLoginNonce);
    chain.requestContentType = 'application/x-www-form-urlencoded';

    let tempUser = '';
    for (let i = 0; i < 100; i++) {
      tempUser += 'abcdefghij'
    }
    chain.requestBody = {
      user: tempUser,
      password: testEnv.localPassword,
      _csrf: chain.parsedCsrfToken
    };
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain, { ignoreErrorStatus: 400 });
    // console.log(chain.responseRawData);
    // console.log(chain.responseErrorMessage);
    console.log('\tExpect: status === 400');
    assert.strictEqual(chain.responseStatus, 400);
    console.log('\tExpect: Error contains "Bad Request"');
    assert.ok(chain.responseErrorMessage.indexOf('Bad Request') >= 0);
    return Promise.resolve(chain);
  })


  // -------------------------------
  // 502 GET /login - Get new nonce and CSRF token
  // -------------------------------
  .then((chain) => {
    chain.testDescription =
      '502 GET /login - Get new nonce and CSRF token';
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
  // 503 POST /login-authorize - oversize password
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '503 POST /login-authorize - oversize password';
    // These values don't change, omit on future requests
    chain.requestMethod = 'POST';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/login-authorize?nonce=' + chain.parsedLoginNonce);
    chain.requestContentType = 'application/x-www-form-urlencoded';

    let tempPass = '';
    for (let i = 0; i < 100; i++) {
      tempPass += 'abcdefghij'
    }
    chain.requestBody = {
      user: testEnv.localUsername,
      password: tempPass,
      _csrf: chain.parsedCsrfToken
    };
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain, { ignoreErrorStatus: 400 });
    // console.log(chain.responseRawData);
    // console.log(chain.responseErrorMessage);
    console.log('\tExpect: status === 400');
    assert.strictEqual(chain.responseStatus, 400);
    console.log('\tExpect: Error contains "Bad Request"');
    assert.ok(chain.responseErrorMessage.indexOf('Bad Request') >= 0);
    return Promise.resolve(chain);
  })

  // -------------------------------
  // 504 GET /login - Get new nonce and CSRF token
  // -------------------------------
  .then((chain) => {
    chain.testDescription =
      '504 GET /login - Get new nonce and CSRF token';
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
  // 505 POST /login-authorize - oversize nonce
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '505 POST /login-authorize - oversize nonce';
    // These values don't change, omit on future requests
    chain.requestMethod = 'POST';

    let tempNonce = '';
    for (let i = 0; i < 100; i++) {
      tempNonce += 'abcdefghij'
    }
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/login-authorize?nonce=' + tempNonce);
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
    logRequest(chain, { ignoreErrorStatus: 400 });
    // console.log(chain.responseRawData);
    // console.log(chain.responseErrorMessage);
    console.log('\tExpect: status === 400');
    assert.strictEqual(chain.responseStatus, 400);
    console.log('\tExpect: Error contains "Bad Request"');
    assert.ok(chain.responseErrorMessage.indexOf('Bad Request') >= 0);
    return Promise.resolve(chain);
  })


  // -------------------------------
  // 600 GET /login - Get new nonce and CSRF token
  // -------------------------------
  .then((chain) => {
    chain.testDescription =
      '600 GET /login - Get new nonce and CSRF token';
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
  // 601 PATCH /login-authorize - wrong method PATCH
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '601 PATCH /login-authorize - wrong method PATCH';
    // These values don't change, omit on future requests
    chain.requestMethod = 'PATCH';

    let tempNonce = '';
    for (let i = 0; i < 100; i++) {
      tempNonce += 'abcdefghij'
    }
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
    logRequest(chain, { ignoreErrorStatus: 404 });
    // console.log(chain.responseRawData);
    // console.log(chain.responseErrorMessage);
    console.log('\tExpect: status === 404');
    assert.strictEqual(chain.responseStatus, 404);
    return Promise.resolve(chain);
  })

  // -------------------------------
  // 602 GET /login - Get new nonce and CSRF token
  // -------------------------------
  .then((chain) => {
    chain.testDescription =
      '602 GET /login - Get new nonce and CSRF token';
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
  // 603 PUT /login-authorize - wrong method PUT
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '603 PUT /login-authorize - wrong method PUT';
    // These values don't change, omit on future requests
    chain.requestMethod = 'PUT';

    let tempNonce = '';
    for (let i = 0; i < 100; i++) {
      tempNonce += 'abcdefghij'
    }
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
    logRequest(chain, { ignoreErrorStatus: 404 });
    // console.log(chain.responseRawData);
    // console.log(chain.responseErrorMessage);
    console.log('\tExpect: status === 404');
    assert.strictEqual(chain.responseStatus, 404);
    return Promise.resolve(chain);
  })

  // -------------------------------
  // 700 GET /login.css
  // In web-server.mjs
  // -------------------------------
  .then((chain) => {
    chain.testDescription = '700 GET /login.css';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/login.css');
    chain.requestAcceptType = 'text/html';
    // unauthenticated
    delete chain.tempLastCurrentSessionCookie;
    delete chain.tempLastCurrentSessionCookieExpires;
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain);
    // console.log(JSON.stringify(chain.responseRawData, null, 2));

    console.log('\tExpect: status === 200');
    assert.strictEqual(chain.responseStatus, 200);
    
    console.log('\tExpect: body contains "background-color');
    assert.ok(chain.responseRawData.indexOf('background-color') >= 0)
    return Promise.resolve(chain);
  })

  // -------------------------------
  // 701 GET /logout
  // In web-server.mjs
  // -------------------------------
  .then((chain) => {
    chain.testDescription = '701 GET /logout';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/logout');
    chain.requestAcceptType = 'text/html';
    // unauthenticated
    delete chain.tempLastCurrentSessionCookie;
    delete chain.tempLastCurrentSessionCookieExpires;
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain);
    // console.log(JSON.stringify(chain.responseRawData, null, 2));

    console.log('\tExpect: status === 200');
    assert.strictEqual(chain.responseStatus, 200);
    
    console.log('\tExpect: body contains "Browser was not logged in.');
    assert.ok(chain.responseRawData.indexOf('Browser was not logged in.') >= 0)
    return Promise.resolve(chain);
  })

  // -------------------------------
  // 702 GET /blocked
  // In web-server.mjs
  // -------------------------------
  .then((chain) => {
    chain.testDescription = '702 GET /blocked';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/blocked');
    chain.requestAcceptType = 'text/html';
    // unauthenticated
    delete chain.tempLastCurrentSessionCookie;
    delete chain.tempLastCurrentSessionCookieExpires;
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain);
    // console.log(JSON.stringify(chain.responseRawData, null, 2));

    console.log('\tExpect: status === 200');
    assert.strictEqual(chain.responseStatus, 200);
    
    console.log('\tExpect: body contains "blocking cookies');
    assert.ok(chain.responseRawData.indexOf('blocking cookies') >= 0)
    return Promise.resolve(chain);
  })

  // -------------------------------
  // 703 GET /disabled
  // In web-server.mjs
  // -------------------------------
  .then((chain) => {
    chain.testDescription = '703 GET /disabled';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/disabled');
    chain.requestAcceptType = 'text/html';
    // unauthenticated
    delete chain.tempLastCurrentSessionCookie;
    delete chain.tempLastCurrentSessionCookieExpires;
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain, { ignoreErrorStatus: 403 });
    // console.log(JSON.stringify(chain.responseRawData, null, 2));
    // console.log(chain.responseErrorMessage)

    console.log('\tExpect: status === 403');
    assert.strictEqual(chain.responseStatus, 403);
    
    console.log('\tExpect: body contains "login count exceeds limit');
    assert.ok(chain.responseErrorMessage.indexOf('login count exceeds limit') >= 0)
    return Promise.resolve(chain);
  })


  // -------------------------------
  // 800 GET /login - Get new nonce and CSRF token
  // -------------------------------
  .then((chain) => {
    chain.testDescription =
      '800 GET /login - Get new nonce and CSRF token';
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
  // 801 POST /login-authorize - Get valid cookie
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '801 POST /login-authorize - Get valid cookie';
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
  .then((chain) => validateLoginResponsePass(chain))

  // -------------------------------
  // 802 GET /irc/webclient.html (final test is success)
  // -------------------------------
  .then((chain) => {
    chain.testDescription = '802 GET /irc/webclient.html (final test is success)';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/webclient.html');
    chain.requestAcceptType = 'text/html';
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain);
    // console.log(JSON.stringify(chain.responseRawData, null, 2));
    // console.log(chain.parsedLocationHeader);

    console.log('\tExpect: status === 200');
    assert.strictEqual(chain.responseStatus, 200);
    
    console.log('\tExpect: body contains "<title>irc-hybrid-client</title>');
    assert.ok(chain.responseRawData.indexOf('<title>irc-hybrid-client</title>') >= 0)
    return Promise.resolve(chain);
  })




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
