// basic-functions.js
//
// Warning: These test will connect to an actual IRC server.
// To avoid getting k-lined on a major IRC network, these
// tests should be run on a dedicated development IRC server.
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
 * Promise based sleep timer
 * @param {Object} chain - Chain object passed from promise to promise
 * @param {Boolean} chain.abortSleepTimer - Flag, abort time if true
 * @param {Number} timeSeconds - Timer expiration in seconds
 * @param {String} logMessage - Optional message to print into log
 * @returns {Promise} resolving to chain object
 */
const sleep = (chain, timeSeconds, logMessage) => {
  let messageStr = '';
  if ((logMessage != null) && (logMessage.length > 0)) {
    messageStr = ' (' + logMessage + ')';
  }
  if (chain.abortSleepTimer) {
    delete chain.abortSleepTimer;
    return Promise.resolve(chain);
  } else {
    console.log('\nWaiting for ' + timeSeconds.toString() + ' seconds' + messageStr);
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve(chain);
      }, timeSeconds * 1000);
    });
  }
}; // sleep ()

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
  // 52 GET /irc/webclient.html (get CSRF token)
  // -------------------------------
  .then((chain) => {
    chain.testDescription = '52 GET /irc/webclient.html (get CSRF token)';
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
    return Promise.resolve(chain);
  })

  // -------------------------------
  // 100 GET /secure (confirm authorized)
  // In web-server.mjs
  // -------------------------------
  .then((chain) => {
    chain.testDescription = '100 GET /secure (confirm authorized)';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/secure');
    chain.requestAcceptType = 'text/html';
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain);
    // console.log(chain.responseRawData);
    console.log('\tExpect: status === 200');
    assert.strictEqual(chain.responseStatus, 200);
    //
    // parse data 
    return Promise.resolve(chain);
  })

  // -------------------------------
  // 101 GET /userinfo (web login user matches)
  // -------------------------------
  .then((chain) => {
    chain.testDescription = '101 GET /userinfo (web login user matches)';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/userinfo');
    chain.requestAcceptType = 'application/json'
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain);
    // console.log(JSON.stringify(chain.responseRawData, null, 2));
    console.log('\tExpect: status === 200');
    assert.strictEqual(chain.responseStatus, 200);
    console.log('\tExpect: user is "' + testEnv.localUsername + '"');
    assert.strictEqual(chain.responseRawData.user, testEnv.localUsername);
    return Promise.resolve(chain);
  })


  // -----------------------------------------------
  // 102 POST /irc/server (server index set for test)
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '102 POST /irc/server (server index set for test)';
    chain.requestMethod = 'POST';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/server');
    chain.requestContentType = 'application/json';
    chain.requestAcceptType = 'application/json'
    chain.requestCsrfHeader = chain.parsedCsrfToken;
    chain.requestBody = {
      index: testEnv.ircServerIndex
    };
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain);
    // console.log(JSON.stringify(chain.responseRawData, null, 2));
    console.log('\tExpect: status === 200');
    assert.strictEqual(chain.responseStatus, 200);
    console.log('\tExpect: No errors');
    assert.ok(!chain.responseRawData.error);
    console.log('\tExpect: index is "' + testEnv.ircServerIndex + '"');
    assert.strictEqual(chain.responseRawData.index, testEnv.ircServerIndex);
    return Promise.resolve(chain);
  })

  // -----------------------------------------------
  // 103 POST /irc/connect (connect to IRC at specified index)
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '103 POST /irc/connect (connect to IRC at specified index)';
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
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain);
    // console.log(JSON.stringify(chain.responseRawData, null, 2));
    console.log('\tExpect: status === 200');
    assert.strictEqual(chain.responseStatus, 200);
    console.log('\tExpect: No errors');
    assert.ok(!chain.responseRawData.error);
    return Promise.resolve(chain);
  })

  // -----------------------------------------------
  // 105 GET /irc/getircstate (wait for connect)
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '105 GET /irc/getircstate';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/getircstate');
    chain.requestAcceptType = 'application/json'
    return Promise.resolve(chain);
  })
  .then((chain) => sleep(chain, 5, 'Delay - Waiting for host name lookup, ident lookup'))
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain);
    // console.log(JSON.stringify(chain.responseRawData, null, 2));
    console.log('\tExpect: status === 200');
    assert.strictEqual(chain.responseStatus, 200);
    console.log('\tExpect: ircConnected is true');  
    assert.ok(chain.responseRawData.ircConnected);
    console.log('\tExpect: ircRegistered is true');  
    assert.ok(chain.responseRawData.ircRegistered);
    console.log('\tExpect: nickname is "' + testEnv.ircNickname + '"');
    assert.strictEqual(chain.responseRawData.nickName, testEnv.ircNickname);

    return Promise.resolve(chain);
  })



  // -----------------------------------------------
  // 104 POST /irc/message ()
  // -----------------------------------------------
  // .then((chain) => {
  //   chain.testDescription = '104 POST /irc/message ()';
  //   chain.requestMethod = 'POST';
  //   chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/message');
  //   chain.requestContentType = 'application/json';
  //   chain.requestAcceptType = 'application/json'
  //   chain.requestCsrfHeader = chain.parsedCsrfToken;
  //   chain.requestBody = {
  //     message: "MOTD"
  //   };
  //   return Promise.resolve(chain);
  // })
  // .then((chain) => managedFetch(chain))
  // .then((chain) => validateRequestFail(chain, 403))

  // -----------------------------------------------
  // 500 POST /irc/disconnect
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '500 POST /irc/disconnect';
    chain.requestMethod = 'POST';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/disconnect');
    chain.requestContentType = 'application/json';
    chain.requestAcceptType = 'application/json'
    chain.requestCsrfHeader = chain.parsedCsrfToken;
    chain.requestBody = {};

    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain);
    // console.log(JSON.stringify(chain.responseRawData, null, 2));
    console.log('\tExpect: status === 200');
    assert.strictEqual(chain.responseStatus, 200);

    return Promise.resolve(chain);
  })

  // -----------------------------------------------
  // 501 GET /irc/getircstate (wait for disconnect)
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '501 GET /irc/getircstate (wait for disconnect)';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/getircstate');
    chain.requestAcceptType = 'application/json'
    return Promise.resolve(chain);
  })
  .then((chain) => sleep(chain, 4, 'Delay - Waiting to disconnect'))
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain);
    // console.log(JSON.stringify(chain.responseRawData, null, 2));
    console.log('\tExpect: status === 200');
    assert.strictEqual(chain.responseStatus, 200);
    console.log('\tExpect: ircConnected is false');  
    assert.ok(!chain.responseRawData.ircConnected);
    return Promise.resolve(chain);
  })

  // -----------------------------------------------
  // 502 POST /terminate (shutdown server)
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '502 POST /terminate (shutdown server)';
    chain.requestMethod = 'POST';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/terminate');
    chain.requestContentType = 'application/json';
    chain.requestAcceptType = 'application/json'
    chain.requestCsrfHeader = chain.parsedCsrfToken;
    chain.requestBody = {
      terminate: 'YES'
    };
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain);
    console.log(JSON.stringify(chain.responseRawData, null, 2));
    console.log('\tExpect: status === 200');
    assert.strictEqual(chain.responseStatus, 200);
    console.log('\tExpect: message "Terminate received"');
    assert.strictEqual(chain.responseRawData.message, 'Terminate received');
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
