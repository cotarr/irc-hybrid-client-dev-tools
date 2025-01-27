// response-headers.js
//
// Check HTTP security headers provided by Helmet middleware
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
const exp = require('node:constants');

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
  // 100 GET /irc/webclient.html (validate HTTP response headers)
  // -------------------------------
  .then((chain) => {
    chain.testDescription = '100 GET /irc/webclient.html (validate HTTP response headers)';
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
    // console.log(JSON.stringify(chain.responseHeaders, null, 2));

    console.log('\tExpect: status === 200');
    assert.strictEqual(chain.responseStatus, 200);

    const keyFilter = [
      'connection',
      'content-length',
      'content-security-policy',
      'content-type',
      'date',
      'etag',
      'keep-alive',
      'x-powered-by'
    ]

    const expectHeaders = [
      ['cross-origin-opener-policy', 'same-origin'],
      ['cross-origin-resource-policy', 'same-origin'],
      ['origin-agent-cluster', '?1'],
      ['referrer-policy', 'no-referrer'],
      ['strict-transport-security', 'max-age=31536000; includeSubDomains'],
      ['x-content-type-options', 'nosniff'],
      ['x-dns-prefetch-control', 'off'],
      ['x-download-options', 'noopen'],
      ['x-frame-options', 'DENY'],
      ['x-permitted-cross-domain-policies', 'none'],
      ['x-xss-protection', '0'],  
    ]

    //
    // Check each header generated by Helmet middleware
    //
    expectHeaders.forEach((header) => {
      console.log('\tExpect: HTTP header: ' + header[0] + ': ' + header[1]);
      assert.strictEqual(chain.responseHeaders[header[0]], header[1]);
    });
    //
    // Check for extraneous headers
    //
    const expectedKeys = [];
    expectHeaders.forEach((header) => {
      expectedKeys.push(header[0]);
    });
    const responseHeaderKeys = Object.keys(chain.responseHeaders);
    const extraneousHeaders = [];
    responseHeaderKeys.forEach((key) => {
      if ((keyFilter.indexOf(key) < 0) &&
        ((expectedKeys.indexOf(key) < 0))) {
        extraneousHeaders.push([key, chain.responseHeaders[key]]);
      }
    });
    // console.log(extraneousHeaders);
    console.log('\tExpect: No unanticipated extraneous HTTP headers in response');
    assert.deepStrictEqual(extraneousHeaders, []);

    const expectCspRules = [
      'default-src \'none\'',
      'base-uri \'self\'',
      'script-src \'self\'',
      'style-src \'self\'',
      'media-src \'self\'',
      'frame-ancestors \'none\'',
      'img-src \'self\'',
      'form-action \'self\'',
      'connect-src \'self\' ws:'
    ]
    const contentSecurityPolicyItems = chain.responseHeaders['content-security-policy'].split(';');
    // console.log(contentSecurityPolicyItems);
    expectCspRules.forEach((cspRule) => {
      console.log('\tExpect: CSP Rule: ' + cspRule);
      assert.ok(contentSecurityPolicyItems.indexOf(cspRule) >= 0 )
    })
    console.log('\tExpect: CSP, no unexpected extraneous rules');
    assert.strictEqual(expectCspRules.length, contentSecurityPolicyItems.length);

    return Promise.resolve(chain);
  })





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
