// websocket-auth.js
//
// This is a testing utility used specifically to test irc-hybrid-client application
// use of a RFC-4655 websocket connection including authentication.
// 
// Further details of the authentication handshake workflow can be found in the
// irc-hybrid-client repository in the /server/middlewares/ws-authorize.mjs file.
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

const { testIrcHybridClientWebsocket } = require('./modules/test-websocket.js');

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
    console.log('        Waiting for ' + timeSeconds.toString() + ' seconds' + messageStr);
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

  chain.websocketOptions = {
    port: 3003,
    host: 'localhost',
    wsPath: '/irc/ws',
    wsOrigin: 'http://localhost:3003',
    tls: false,
    verifyTlsHost: true
  };
  
  if (chain.websocketOptions.tls) {
    chain.websocketOptions.servername = chain.websocketOptions.host;
    chain.websocketOptions.rejectUnauthorized = chain.websocketOptions.verifyTlsHost;
    chain.websocketOptions.minVersion = 'TLSv1.2';
  }
  
  // Optional: Case of self signed client certificate required by API
  /*
  if (chain.websocketOptions.tls) {
    chain.websocketOptions.key = fs.readFileSync('key.pem');
    chain.websocketOptions.cert = fs.readFileSync('cert.pem');
    chain.websocketOptions.ca = [ fs.readFileSync('ca.pem') ];
    chain.websocketOptions.checkServerIdentity = () => { return null; };
  }
  */
  
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
  // 52 GET /irc/webclient.html (get CSRF Token)
  // -------------------------------
  .then((chain) => {
    chain.testDescription = '52 GET /irc/webclient.html (get CSRF Token)';
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
    // console.log('parsedCsrfToken', chain.parsedCsrfToken);
    return Promise.resolve(chain);
  })

  // -----------------------------------------------
  // 100 POST /irc/wsauth (enable timer, no CSRF token)
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '100 POST /irc/wsauth (enable timer, no CSRF token)';
    chain.requestMethod = 'POST';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/wsauth');
    chain.requestContentType = 'application/json';
    chain.requestAcceptType = 'application/json'
    // chain.requestCsrfHeader = chain.savedParsedCsrfToken;
    // delete CSRF token
    delete chain.requestCsrfHeader;
    chain.currentSessionCookie = chain.savedCurrentSessionCookie;
    chain.requestBody = {
      index: testEnv.ircServerIndex
    };
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain, { ignoreErrorStatus: 403 });
    // console.log('responseRawData:', chain.responseRawData);
    // console.log('responseErrorMessage:', chain.responseErrorMessage);
    console.log('\tExpect: status === 403');
    assert.strictEqual(chain.responseStatus, 403);
    console.log('\tExpect: Error contains "invalid csrf token"');
    assert.ok(chain.responseErrorMessage.indexOf('invalid csrf token') >= 0);
    return Promise.resolve(chain);
  })

  // -----------------------------------------------
  // 101 UPGRADE /irc/wsauth (websocket upgrade, timer not active)
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '101 UPGRADE /irc/wsauth (websocket upgrade, timer not active)';
    chain.requestMethod = 'UPGRADE';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/ws');
    chain.requestCsrfHeader = chain.savedParsedCsrfToken;
    chain.requestBody = {};
    chain.currentSessionCookie = chain.savedCurrentSessionCookie;
    console.log('\nTest: ' + chain.testDescription);
    return Promise.resolve(chain);
  })
  .then((chain) => testIrcHybridClientWebsocket(chain))
  .then((chain) => {
    // console.log('websocketError:', chain.websocketError);
    // console.log('websocketErrorMessage:', chain.websocketErrorMessage);

    console.log('\tExpect: error exists');
    assert.ok(chain.websocketError);
    console.log('\tExpect: websocket error contains: "401 Unauthorized"');
    assert.ok(chain.websocketErrorMessage.indexOf('401 Unauthorized') >= 0);
    return Promise.resolve(chain);
  })

  // -----------------------------------------------
  // 102 POST /irc/wsauth (enable timer, no cookie)
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '102 POST /irc/wsauth (enable timer, no cookie)';
    chain.requestMethod = 'POST';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/wsauth');
    chain.requestContentType = 'application/json';
    chain.requestAcceptType = 'application/json'
    chain.requestCsrfHeader = chain.savedParsedCsrfToken;
    // delete the cookie
    delete chain.currentSessionCookie;
    chain.requestBody = {
      index: testEnv.ircServerIndex
    };
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain, { ignoreErrorStatus: 403 });
    // console.log('responseRawData:', chain.responseRawData);
    // console.log('responseErrorMessage:', chain.responseErrorMessage);
    console.log('\tExpect: status === 403');
    assert.strictEqual(chain.responseStatus, 403);
    console.log('\tExpect: Error contains "Forbidden"');
    assert.ok(chain.responseErrorMessage.indexOf('Forbidden') >= 0);
    return Promise.resolve(chain);
  })

  // -----------------------------------------------
  // 103 UPGRADE /irc/wsauth (websocket upgrade, timer not active)
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '103 UPGRADE /irc/wsauth (websocket upgrade, timer not active)';
    chain.requestMethod = 'UPGRADE';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/ws');
    chain.requestCsrfHeader = chain.savedParsedCsrfToken;
    chain.requestBody = {};
    chain.currentSessionCookie = chain.savedCurrentSessionCookie;
    console.log('\nTest: ' + chain.testDescription);
    return Promise.resolve(chain);
  })
  .then((chain) => testIrcHybridClientWebsocket(chain))
  .then((chain) => {
    // console.log('websocketError:', chain.websocketError);
    // console.log('websocketErrorMessage:', chain.websocketErrorMessage);

    console.log('\tExpect: error exists');
    assert.ok(chain.websocketError);
    console.log('\tExpect: websocket error contains: "401 Unauthorized"');
    assert.ok(chain.websocketErrorMessage.indexOf('401 Unauthorized') >= 0);
    return Promise.resolve(chain);
  })



  // -----------------------------------------------
  // 110 POST /irc/wsauth (Enable server websocket timer)
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '110 POST /irc/wsauth (Enable server websocket timer)';
    chain.requestMethod = 'POST';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/wsauth');
    chain.requestContentType = 'application/json';
    chain.requestAcceptType = 'application/json'
    chain.requestCsrfHeader = chain.savedParsedCsrfToken;
    chain.currentSessionCookie = chain.savedCurrentSessionCookie;
    chain.requestBody = {
      index: testEnv.ircServerIndex
    };
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain);
    // console.log('responseRawData:', chain.responseRawData);
    // console.log('responseErrorMessage:', chain.responseErrorMessage);

    console.log('\tExpect: status === 200');
    assert.strictEqual(chain.responseStatus, 200);
    console.log('\tExpect: response contains error === false');
    assert.strictEqual(chain.responseRawData.error, false);
    return Promise.resolve(chain);
  })


  // -----------------------------------------------
  // 111 UPGRADE /irc/wsauth (websocket upgrade, wait for timer to expire)
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '111 UPGRADE /irc/wsauth (websocket upgrade, wait for timer to expire)';
    chain.requestMethod = 'UPGRADE';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/ws');
    chain.requestCsrfHeader = chain.savedParsedCsrfToken;
    chain.requestBody = {};
    chain.currentSessionCookie = chain.savedCurrentSessionCookie;
    console.log('\nTest: ' + chain.testDescription);
    return Promise.resolve(chain);
  })
  .then((chain) => sleep(chain, 15, 'Delay - Waiting for websocket timer to expire'))
  .then((chain) => testIrcHybridClientWebsocket(chain))
  .then((chain) => {
    // console.log('websocketError:', chain.websocketError);
    // console.log('websocketErrorMessage:', chain.websocketErrorMessage);

    console.log('\tExpect: error exists');
    assert.ok(chain.websocketError);
    console.log('\tExpect: websocket error contains: "401 Unauthorized"');
    assert.ok(chain.websocketErrorMessage.indexOf('401 Unauthorized') >= 0);

    return Promise.resolve(chain);
  })  

  // -----------------------------------------------
  // 112 POST /irc/wsauth (Enable server websocket timer)
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '112 POST /irc/wsauth (Enable server websocket timer)';
    chain.requestMethod = 'POST';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/wsauth');
    chain.requestContentType = 'application/json';
    chain.requestAcceptType = 'application/json'
    chain.requestCsrfHeader = chain.savedParsedCsrfToken;
    chain.currentSessionCookie = chain.savedCurrentSessionCookie;
    chain.requestBody = {
      index: testEnv.ircServerIndex
    };
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain);
    // console.log('responseRawData:', chain.responseRawData);
    // console.log('responseErrorMessage:', chain.responseErrorMessage);

    console.log('\tExpect: status === 200');
    assert.strictEqual(chain.responseStatus, 200);
    console.log('\tExpect: response contains error === false');
    assert.strictEqual(chain.responseRawData.error, false);
    return Promise.resolve(chain);
  })


  // -----------------------------------------------
  // 113 UPGRADE /irc/wsauth (websocket upgrade, without cookie)
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '113 UPGRADE /irc/wsauth (websocket upgrade, without cookie)';
    chain.requestMethod = 'UPGRADE';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/ws');
    chain.requestCsrfHeader = chain.savedParsedCsrfToken;
    chain.requestBody = {};
    // remove the cookie
    delete chain.currentSessionCookie;
    console.log('\nTest: ' + chain.testDescription);
    return Promise.resolve(chain);
  })
  .then((chain) => testIrcHybridClientWebsocket(chain))
  .then((chain) => {
    // console.log('websocketError:', chain.websocketError);
    // console.log('websocketErrorMessage:', chain.websocketErrorMessage);

    console.log('\tExpect: error exists');
    assert.ok(chain.websocketError);
    console.log('\tExpect: websocket error contains: "401 Unauthorized"');
    assert.ok(chain.websocketErrorMessage.indexOf('401 Unauthorized') >= 0);

    return Promise.resolve(chain);
  })  

  // -----------------------------------------------
  // 114 POST /irc/wsauth (Enable server websocket timer)
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '114 POST /irc/wsauth (Enable server websocket timer)';
    chain.requestMethod = 'POST';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/wsauth');
    chain.requestContentType = 'application/json';
    chain.requestAcceptType = 'application/json'
    chain.requestCsrfHeader = chain.savedParsedCsrfToken;
    chain.currentSessionCookie = chain.savedCurrentSessionCookie;
    chain.requestBody = {
      index: testEnv.ircServerIndex
    };
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain);
    // console.log('responseRawData:', chain.responseRawData);
    // console.log('responseErrorMessage:', chain.responseErrorMessage);
    console.log('\tExpect: status === 200');
    assert.strictEqual(chain.responseStatus, 200);
    console.log('\tExpect: response contains error === false');
    assert.strictEqual(chain.responseRawData.error, false);
    return Promise.resolve(chain);
  })


  // -----------------------------------------------
  // 115 UPGRADE /irc/wsauth (websocket upgrade, expect HEARTBEAT messages)
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '115 UPGRADE /irc/wsauth (websocket upgrade, expect HEARTBEAT messages)';
    chain.requestMethod = 'UPGRADE';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/ws');
    chain.requestCsrfHeader = chain.savedParsedCsrfToken;
    chain.requestBody = {};
    chain.currentSessionCookie = chain.savedCurrentSessionCookie;
    console.log('\nTest: ' + chain.testDescription);
    return Promise.resolve(chain);
  })
  .then((chain) => testIrcHybridClientWebsocket(chain))
  .then((chain) => {
    // console.log('websocketError:', chain.websocketError);
    // console.log('websocketErrorMessage:', chain.websocketErrorMessage);

    console.log('\tExpect: no errors');
    assert.ok(!chain.websocketError);

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
