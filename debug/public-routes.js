// public-routes.js
//
// This script will confirm that routes intended to be public are
// accessible when the browser does not provide a valid cookie.
//
//  Required Configuration:
//    SITE_SECURITY_CONTACT=security@example.com
//    SITE_SECURITY_EXPIRES="Fri, 1 Apr 2022 08:00:00 -0600"
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

const chainObj = Object.create(null);

/**
 * Initialize shared variables used in chain of promises
 * @param {Object} chain - Data variables passed from promise to promise.
 * @returns {Promise} resolving to chain object
 */
const setup = (chain) => {
  chain.requestAuthorization = 'cookie';
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
  // 101 GET /.well-known/security.txt
  // In web-server.mjs
  // -------------------------------
  .then((chain) => {
    chain.testDescription = '101 GET /.well-known/security.txt';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/.well-known/security.txt');
    chain.requestAcceptType = 'text/html';
    if (config.site.securityContact === '') {
      chain.abortManagedFetch = true;
      chain.skipInlineTests = true;
    }
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    if (chain.skipInlineTests) {
      delete chain.skipInlineTests;
      return Promise.resolve(chain);
    } else {
      logRequest(chain);
      // console.log(chain.responseRawData);
      console.log('\tExpect: status === 200');
      assert.strictEqual(chain.responseStatus, 200);

      console.log('\tExpect: response include security contact email');
      assert.ok(chain.responseRawData.indexOf(config.site.securityContact) >= 0);
      return Promise.resolve(chain);
    }
  })

  // -------------------------------
  // 102 GET /robots.txt
  // In web-server.mjs
  // -------------------------------
  .then((chain) => {
    chain.testDescription = '102 GET /robots.txt';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/robots.txt');
    chain.requestAcceptType = 'text/html';
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain);
    // console.log(chain.responseRawData);
    console.log('\tExpect: status === 200');
    assert.strictEqual(chain.responseStatus, 200);

    console.log('\tExpect: response include "Disallow: /"');
    assert.ok(chain.responseRawData.indexOf('Disallow: /') >= 0);
    return Promise.resolve(chain);
  })

  // -------------------------------
  // 103 GET /favicon.ico
  // In web-server.mjs
  // -------------------------------
  .then((chain) => {
    chain.testDescription = '103 GET /favicon.ico';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/favicon.ico');
    chain.requestAcceptType = 'text/html';
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain);
    // console.log(chain.responseRawData);
    console.log('\tExpect: status === 204');
    assert.strictEqual(chain.responseStatus, 204);
    return Promise.resolve(chain);
  })


  // -------------------------------
  // 300 GET /not-found.html
  // Error Handler in web-server.mjs
  // -------------------------------
  .then((chain) => {
    chain.testDescription = '300 GET /not-found.html (Error handler)';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/not-found.html');
    chain.requestAcceptType = 'text/html';
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain, { ignoreErrorStatus: 404 });
    // console.log(chain.responseErrorMessage);

    console.log('\tExpect: status === 404');
    assert.strictEqual(chain.responseStatus, 404);
    console.log('\tExpect: Error response includes "Not Found"');
    assert.ok(chain.responseErrorMessage.indexOf('Not Found') >= 0);
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
