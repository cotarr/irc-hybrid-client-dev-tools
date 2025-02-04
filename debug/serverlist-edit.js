// serverlist-edit.js
//
// This script will test the API calls used to edit the list of IRC servers.
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


  // 9.5 (Previous Thunder Client test ID)
  // -------------------------------
  // 100 GET /irc/getircstate (Not connected to IRC)
  // -------------------------------
  .then((chain) => {
    chain.testDescription = '100 GET /irc/getircstate (Not connected to IRC)';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/getircstate');
    chain.requestAcceptType = 'application/json';
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain);
    // console.log(JSON.stringify(chain.responseRawData, null, 2));
    console.log('\tExpect: status === 200');
    console.log('\tExpect: ircConnected is false');  
    assert.ok(!chain.responseRawData.ircConnected);
    assert.strictEqual(chain.responseStatus, 200);
    return Promise.resolve(chain);
  })

  // 9.6
  // -----------------------------------------------
  // 101 POST /irc/server (server index set to zero)
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '101 POST /irc/server (server index set to zero)';
    chain.requestMethod = 'POST';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/server');
    chain.requestContentType = 'application/json';
    chain.requestAcceptType = 'application/json'
    chain.requestCsrfHeader = chain.parsedCsrfToken;
    chain.requestBody = {
      index: 0
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

  // 9.7
  // -------------------------------
  // 102 GET /irc/serverlist (Retrieve full sever list)
  // -------------------------------
  .then((chain) => {
    chain.testDescription = '102 GET /irc/serverlist (Retrieve full sever list)';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/serverlist');
    chain.requestAcceptType = 'application/json';
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain);
    // console.log(JSON.stringify(chain.responseRawData, null, 2));
    console.log('\tExpect: status === 200');
    assert.strictEqual(chain.responseStatus, 200);
    console.log('\tExpect: Server list array length > 0');
    assert.ok(chain.responseRawData.length > 0);
    //
    // Parse data
    // This will be used to check increment of index after create new record
    chain.tempServerlistArrayLength = chain.responseRawData.length;
    return Promise.resolve(chain);
  })

  // 9.8
  // -------------------------------
  // 103 GET /irc/serverlist (Retrieve a server, clear edit lock)
  // -------------------------------
  .then((chain) => {
    chain.testDescription = '103 GET /irc/serverlist (Retrieve a server, clear edit lock)';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/serverlist?index=0&lock=0');
    chain.requestAcceptType = 'application/json';
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain);
    // console.log(JSON.stringify(chain.responseRawData, null, 2));
    console.log('\tExpect: status === 200');
    assert.strictEqual(chain.responseStatus, 200);
    console.log('\tExpect: Index === 0');
    assert.strictEqual(chain.responseRawData.index, 0);
    //
    // Parse data
    chain.tempServerNameAtIdx0 = chain.responseRawData.name;
    return Promise.resolve(chain);
  })

  // 9.9
  // -------------------------------
  // 104 GET /irc/serverlist (Set edit lock),
  // -------------------------------
  .then((chain) => {
    chain.testDescription = '104 GET /irc/serverlist (Set edit lock),';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/serverlist?index=0&lock=1');
    chain.requestAcceptType = 'application/json';
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain);
    // console.log(JSON.stringify(chain.responseRawData, null, 2));
    console.log('\tExpect: status === 200');
    assert.strictEqual(chain.responseStatus, 200);
    console.log('\tExpect: Index === 0');
    assert.strictEqual(chain.responseRawData.index, 0);
    return Promise.resolve(chain);
  })

  // 9.10
  // -----------------------------------------------
  // 105 POST /irc/serverlist (Conflict, create new while locked, expect 409)
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '105 POST /irc/serverlist (Conflict, create new while locked, expect 409)';
    chain.requestMethod = 'POST';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/serverlist');
    chain.requestContentType = 'application/json';
    chain.requestAcceptType = 'application/json'
    chain.requestCsrfHeader = chain.parsedCsrfToken;
    chain.requestBody = {
      disabled: false,
      group: 0,
      name: 'local-server',
      host: '127.0.0.1',
      port: 6667,
      tls: false,
      verify: false,
      proxy: false,
      reconnect: false,
      logging: false,
      password: '',
      saslUsername: '',
      saslPassword: '',
      identifyNick: '',
      identifyCommand: '',
      nick: 'myNick',
      altNick: 'myNick2',
      recoverNick: false,
      user: 'myUser',
      real: 'myRealName',
      modes: '+iw',
      channelList: '#test, #test2, #test3'
    };
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain, { ignoreErrorStatus: 409 });
    // console.log(JSON.stringify(chain.responseRawData, null, 2));
    // console.log(chain.responseErrorMessage);
    console.log('\tExpect: status === 409');
    assert.strictEqual(chain.responseStatus, 409);
    console.log('\tExpect: Error essage contains "Attempt to modify locked data table"');
    assert.ok(chain.responseErrorMessage.indexOf('Attempt to modify locked data table') >= 0);
    return Promise.resolve(chain);
  })

  // 9.11
  // -------------------------------
  // 106 GET /irc/serverlist (Conflict, attempt lock while locked)
  // -------------------------------
  .then((chain) => {
    chain.testDescription = '106 GET /irc/serverlist (Conflict, attempt lock while locked, expect 409)';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/serverlist?index=0&lock=1');
    chain.requestAcceptType = 'application/json';
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain, { ignoreErrorStatus: 409 });
    // console.log(JSON.stringify(chain.responseRawData, null, 2));
    // console.log(chain.responseErrorMessage);
    console.log('\tExpect: status === 409');
    assert.strictEqual(chain.responseStatus, 409);
    console.log('\tExpect: Error essage contains "Lock already set"');
    assert.ok(chain.responseErrorMessage.indexOf('Lock already set') >= 0);

    return Promise.resolve(chain);
  })

  // 9.12
    // -------------------------------
  // 107 GET /irc/serverlist (Clear edit lock)
  // -------------------------------
  .then((chain) => {
    chain.testDescription = '107 GET /irc/serverlist (Clear edit lock)';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/serverlist?index=0&lock=0');
    chain.requestAcceptType = 'application/json';
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain);
    // console.log(JSON.stringify(chain.responseRawData, null, 2));
    console.log('\tExpect: status === 200');
    assert.strictEqual(chain.responseStatus, 200);
    console.log('\tExpect: Index === 0');
    assert.strictEqual(chain.responseRawData.index, 0);
    return Promise.resolve(chain);
  })

  // 9.13
  // -----------------------------------------------
  // 108 PATCH /irc/serverlist (Conflict, modify while locked, expect 409)
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '108 PATCH /irc/serverlist (Conflict, modify while locked, expect 409)';
    chain.requestMethod = 'PATCH';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/serverlist?index=0');
    chain.requestContentType = 'application/json';
    chain.requestAcceptType = 'application/json'
    chain.requestCsrfHeader = chain.parsedCsrfToken;
    chain.requestBody = {
      index: 0,
      disabled: false,
      group: 0,
      name: 'local-server',
      host: '127.0.0.1',
      port: 6667,
      tls: false,
      verify: false,
      proxy: false,
      reconnect: false,
      logging: false,
      password: '',
      saslUsername: '',
      saslPassword: '',
      identifyNick: '',
      identifyCommand: '',
      nick: 'myNick',
      altNick: 'myNick2',
      recoverNick: false,
      user: 'myUser',
      real: 'myRealName',
      modes: '+iw',
      channelList: '#test, #test2, #test3'
    };
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain, { ignoreErrorStatus: 409 });
    // console.log(JSON.stringify(chain.responseRawData, null, 2));
    // console.log(chain.responseErrorMessage);
    console.log('\tExpect: status === 409');
    assert.strictEqual(chain.responseStatus, 409);
    console.log('\tExpect: Error essage contains "Attempt to modify unlocked data table"');
    assert.ok(chain.responseErrorMessage.indexOf('Attempt to modify unlocked data table') >= 0);
    return Promise.resolve(chain);
  })

  // 9.14
  // -----------------------------------------------
  // 109 POST /irc/serverlist (Create new IRC server definition)
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '109 POST /irc/serverlist (Create new IRC server definition)';
    chain.requestMethod = 'POST';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/serverlist');
    chain.requestContentType = 'application/json';
    chain.requestAcceptType = 'application/json'
    chain.requestCsrfHeader = chain.parsedCsrfToken;
    chain.requestBody = {
      disabled: false,
      group: 0,
      name: 'local-server',
      host: '127.0.0.1',
      port: 6667,
      tls: false,
      verify: false,
      proxy: false,
      reconnect: false,
      logging: false,
      password: '',
      saslUsername: '',
      saslPassword: '',
      identifyNick: '',
      identifyCommand: '',
      nick: 'myNick',
      altNick: 'myNick2',
      recoverNick: false,
      user: 'myUser',
      real: 'myRealName',
      modes: '+iw',
      channelList: '#test, #test2, #test3'
    };
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain);
    // console.log(JSON.stringify(chain.responseRawData, null, 2));
    // console.log(chain.responseErrorMessage);
    console.log('\tExpect: status === 200');
    assert.strictEqual(chain.responseStatus, 200);
    console.log('\tExpect: response.status === "success"');
    assert.strictEqual(chain.responseRawData.status, 'success');
    console.log('\tExpect: response.method === "POST"');
    assert.strictEqual(chain.responseRawData.method, 'POST');
    console.log('\tExpect: response object has "index" property');
    assert.ok(Object.hasOwn(chain.responseRawData, 'index'));
    // chain.tempServerlistArrayLength is array length before adding any new definitions
    console.log('\tExpect: index has incremented to expected value');
    assert.strictEqual(chain.tempServerlistArrayLength, chain.responseRawData.index);
    //
    // Parse data
    chain.tempNewServerIndex = parseInt(chain.responseRawData.index);
    return Promise.resolve(chain);
  })

  // 9.15
  // -------------------------------
  // 110 GET /irc/serverlist (Check new server values, lock database)
  // -------------------------------
  .then((chain) => {
    chain.testDescription = '110 GET /irc/serverlist (Check new server values, lock database)';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/serverlist?index=' +
      chain.tempNewServerIndex.toString() + '&lock=1');
    chain.requestAcceptType = 'application/json';
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain);
    // console.log(JSON.stringify(chain.responseRawData, null, 2));
    console.log('\tExpect: status === 200');
    assert.strictEqual(chain.responseStatus, 200);
    console.log('\tExpect: response.index is expected value');
    assert.strictEqual(chain.responseRawData.index, chain.tempServerlistArrayLength);

    console.log('\tExpect: response.name === "local-server"');
    assert.strictEqual(chain.responseRawData.name, 'local-server');
    console.log('\tExpect: response.host === "127.0.0.1"');
    assert.strictEqual(chain.responseRawData.host, '127.0.0.1');
    console.log('\tExpect: response.port === 6667');
    assert.strictEqual(chain.responseRawData.port, 6667);
    console.log('\tExpect: response.nick === "myNick"');
    assert.strictEqual(chain.responseRawData.nick, 'myNick');
    return Promise.resolve(chain);
  })

  // 9.16
  // -------------------------------
  // 111 PATCH /irc/serverlist (Modify with invalid locked index value, expect 409)
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '111 PATCH /irc/serverlist (Modify with invalid locked index value, expect 409)';
    chain.requestMethod = 'PATCH';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/serverlist?index=9999');
    chain.requestContentType = 'application/json';
    chain.requestAcceptType = 'application/json'
    chain.requestCsrfHeader = chain.parsedCsrfToken;
    chain.requestBody = {
      index: 9999,
      disabled: false,
      group: 0,
      name: 'local-server',
      host: '127.0.0.1',
      port: 6667,
      tls: false,
      verify: false,
      proxy: false,
      reconnect: false,
      logging: false,
      password: '',
      saslUsername: '',
      saslPassword: '',
      identifyNick: '',
      identifyCommand: '',
      nick: 'myNick',
      altNick: 'myNick2',
      recoverNick: false,
      user: 'myUser',
      real: 'myRealName',
      modes: '+iw',
      channelList: '#test, #test2, #test3'
    };
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain, { ignoreErrorStatus: 409 });
    // console.log(JSON.stringify(chain.responseRawData, null, 2));
    // console.log(chain.responseErrorMessage);
    console.log('\tExpect: status === 409');
    assert.strictEqual(chain.responseStatus, 409);
    console.log('\tExpect: Error essage contains "Index mismatch (edit lock value)"');
    assert.ok(chain.responseErrorMessage.indexOf('Index mismatch (edit lock value)') >= 0);
    return Promise.resolve(chain);
  })

  // 9.17
  // -------------------------------
  // 112 GET /irc/serverlist (Conflict, attempt lock while locked)
  // -------------------------------
  .then((chain) => {
    chain.testDescription = '112 GET /irc/serverlist (Conflict, attempt lock while locked)';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/serverlist?index=' +
      chain.tempNewServerIndex.toString() + '&lock=1');
    chain.requestAcceptType = 'application/json';
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain, { ignoreErrorStatus: 409 });
    // console.log(JSON.stringify(chain.responseRawData, null, 2));
    // console.log(chain.responseErrorMessage);
    console.log('\tExpect: status === 409');
    assert.strictEqual(chain.responseStatus, 409);
    console.log('\tExpect: Error essage contains "Lock already set"');
    assert.ok(chain.responseErrorMessage.indexOf('Lock already set') >= 0);

    return Promise.resolve(chain);
  })

  // 9.18
  // -----------------------------------------------
  // 113 PATCH /irc/serverlist (Modify definition of created server)
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '113 PATCH /irc/serverlist (Modify definition of created server)';
    chain.requestMethod = 'PATCH';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/serverlist?index=' + chain.tempNewServerIndex.toString());
    chain.requestContentType = 'application/json';
    chain.requestAcceptType = 'application/json'
    chain.requestCsrfHeader = chain.parsedCsrfToken;
    chain.requestBody = {
      index: chain.tempNewServerIndex,
      disabled: true,
      group: 2,
      name: 'local-server2',
      host: '127.0.0.2',
      port: 6668,
      tls: true,
      verify: true,
      proxy: true,
      reconnect: true,
      logging: true,
      password: 'test1',
      saslUsername: 'testsp1',
      saslPassword: 'testsp2',
      identifyNick: 'test2',
      identifyCommand: 'test3',
      nick: 'myNick2',
      altNick: 'myNick3',
      recoverNick: true,
      user: 'myUser2',
      real: 'myRealName2',
      modes: '+iwww',
      channelList: '#test, #test2, #test3, #test4'
    };
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain);
    // console.log(JSON.stringify(chain.responseRawData, null, 2));
    // console.log(chain.responseErrorMessage);
    console.log('\tExpect: status === 200');
    assert.strictEqual(chain.responseStatus, 200);
    console.log('\tExpect: response.status === "success"');
    assert.strictEqual(chain.responseRawData.status, 'success');
    console.log('\tExpect: response.method === "PATCH"');
    assert.strictEqual(chain.responseRawData.method, 'PATCH');
    console.log('\tExpect: response object has "index" property');
    assert.ok(Object.hasOwn(chain.responseRawData, 'index'));
    // chain.tempServerlistArrayLength is array length before adding any new definitions
    console.log('\tExpect: index has expected value');
    assert.strictEqual(chain.tempNewServerIndex, chain.responseRawData.index);
    return Promise.resolve(chain);
  })

  // 9.19
  // -------------------------------
  // 114 GET /irc/serverlist (Check modified values, keep locked)';
  // -------------------------------
  .then((chain) => {
    chain.testDescription = '114 GET /irc/serverlist (Check modified values, keep locked)';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/serverlist?index=' +
      chain.tempNewServerIndex.toString() + '&lock=1');
    chain.requestAcceptType = 'application/json';
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain);
    // console.log(JSON.stringify(chain.responseRawData, null, 2));
    console.log('\tExpect: status === 200');
    assert.strictEqual(chain.responseStatus, 200);
    console.log('\tExpect: response.index is expected value');
    assert.strictEqual(chain.responseRawData.index, chain.tempServerlistArrayLength);

    console.log('\tExpect: response.name === "local-server2"');
    assert.strictEqual(chain.responseRawData.name, 'local-server2');
    console.log('\tExpect: response.host === "127.0.0.2"');
    assert.strictEqual(chain.responseRawData.host, '127.0.0.2');
    console.log('\tExpect: response.port === 6668');
    assert.strictEqual(chain.responseRawData.port, 6668);
    console.log('\tExpect: response.nick === "myNick2"');
    assert.strictEqual(chain.responseRawData.nick, 'myNick2');
    return Promise.resolve(chain);
  }) 

  // 9.20
  // -----------------------------------------------
  // 115 DELETE /irc/serverliar (Delete while locked, expect 409)
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '115 DELETE /irc/serverliar (Delete while locked, expect 409)';
    chain.requestMethod = 'DELETE';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/serverlist?index=' + chain.tempNewServerIndex.toString());
    chain.requestContentType = 'application/json';
    chain.requestAcceptType = 'application/json'
    chain.requestCsrfHeader = chain.parsedCsrfToken;
    chain.requestBody = {
      index: chain.tempNewServerIndex,
      disabled: true,
      group: 2,
      name: 'local-server2',
      host: '127.0.0.2',
      port: 6668,
      tls: true,
      verify: true,
      proxy: true,
      reconnect: true,
      logging: true,
      password: 'test1',
      saslUsername: 'testsp1',
      saslPassword: 'testsp2',
      identifyNick: 'test2',
      identifyCommand: 'test3',
      nick: 'myNick2',
      altNick: 'myNick3',
      recoverNick: true,
      user: 'myUser2',
      real: 'myRealName2',
      modes: '+iwww',
      channelList: '#test, #test2, #test3, #test4'
    };
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain, { ignoreErrorStatus: 409 });
    // console.log(JSON.stringify(chain.responseRawData, null, 2));
    // console.log(chain.responseErrorMessage);
    console.log('\tExpect: status === 409');
    assert.strictEqual(chain.responseStatus, 409)
    console.log('\tExpect: Error essage contains "Attempt to modify locked data table"');
    assert.ok(chain.responseErrorMessage.indexOf('Attempt to modify locked data table') >= 0);
    return Promise.resolve(chain);
  })
  
  // 9.21
  // -------------------------------
  // 116 GET /irc/serverlist (Remove database lock)';
  // -------------------------------
  .then((chain) => {
    chain.testDescription = '116 GET /irc/serverlist (Remove database lock)';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/serverlist?index=' +
      chain.tempNewServerIndex.toString() + '&lock=0');
    chain.requestAcceptType = 'application/json';
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain);
    // console.log(JSON.stringify(chain.responseRawData, null, 2));
    console.log('\tExpect: status === 200');
    assert.strictEqual(chain.responseStatus, 200);
    console.log('\tExpect: response.index is expected value');
    assert.strictEqual(chain.responseRawData.index, chain.tempServerlistArrayLength);
    return Promise.resolve(chain);
  }) 

  // 9.22
  // -----------------------------------------------
  // 117 DELETE /irc/serverlist (Delete the created server definition)
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '117 DELETE /irc/serverlist (Delete the created server definition)';
    chain.requestMethod = 'DELETE';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/serverlist?index=' + chain.tempNewServerIndex.toString());
    chain.requestContentType = 'application/json';
    chain.requestAcceptType = 'application/json'
    chain.requestCsrfHeader = chain.parsedCsrfToken;
    chain.requestBody = {
      index: chain.tempNewServerIndex,
      disabled: true,
      group: 2,
      name: 'local-server2',
      host: '127.0.0.2',
      port: 6668,
      tls: true,
      verify: true,
      proxy: true,
      reconnect: true,
      logging: true,
      password: 'test1',
      saslUsername: 'testsp1',
      saslPassword: 'testsp2',
      identifyNick: 'test2',
      identifyCommand: 'test3',
      nick: 'myNick2',
      altNick: 'myNick3',
      recoverNick: true,
      user: 'myUser2',
      real: 'myRealName2',
      modes: '+iwww',
      channelList: '#test, #test2, #test3, #test4'
    };
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain);
    // console.log(JSON.stringify(chain.responseRawData, null, 2));
    console.log('\tExpect: status === 200');
    assert.strictEqual(chain.responseStatus, 200);
    console.log('\tExpect: response.status === "success"');
    assert.strictEqual(chain.responseRawData.status, 'success');
    console.log('\tExpect: response.method === "DELETE"');
    assert.strictEqual(chain.responseRawData.method, 'DELETE');
    console.log('\tExpect: response object has "index" property');
    assert.ok(Object.hasOwn(chain.responseRawData, 'index'));
    // chain.tempServerlistArrayLength is array length before adding any new definitions
    console.log('\tExpect: index decremented by 1 to expected value');
    assert.strictEqual(chain.tempNewServerIndex -1, chain.responseRawData.index);
    return Promise.resolve(chain);
  })  

  // 9.23
  // -------------------------------
  // 200 GET /irc/serverlist (Set edit lock at index 0),
  // -------------------------------
  .then((chain) => {
    chain.testDescription = '200 GET /irc/serverlist (Set edit lock at index 0),';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/serverlist?index=0&lock=1');
    chain.requestAcceptType = 'application/json';
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain);
    // console.log(JSON.stringify(chain.responseRawData, null, 2));
    console.log('\tExpect: status === 200');
    assert.strictEqual(chain.responseStatus, 200);
    console.log('\tExpect: Index === 0');
    assert.strictEqual(chain.responseRawData.index, 0);
    return Promise.resolve(chain);
  })

  // 9.24
  // -----------------------------------------------
  // 201 COPY /irc/serverlist (Copy server, expect unlocked, fail 409)
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '201 COPY /irc/serverlist (Copy server, expect unlocked, fail 409)';
    chain.requestMethod = 'COPY';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/serverlist?index=0');
    chain.requestContentType = 'application/json';
    chain.requestAcceptType = 'application/json'
    chain.requestCsrfHeader = chain.parsedCsrfToken;
    chain.requestBody = {
      index: 0
    };
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain, { ignoreErrorStatus: 409 });
    // console.log(JSON.stringify(chain.responseRawData, null, 2));
    // console.log(chain.responseErrorMessage);
    console.log('\tExpect: status === 409');
    assert.strictEqual(chain.responseStatus, 409)
    console.log('\tExpect: Error essage contains "Attempt to modify locked data table"');
    assert.ok(chain.responseErrorMessage.indexOf('Attempt to modify locked data table') >= 0);
    return Promise.resolve(chain);
  }) 

  // 9.25
  // -------------------------------
  // 202 GET /irc/serverlist (Remove database lock)';
  // -------------------------------
  .then((chain) => {
    chain.testDescription = '202 GET /irc/serverlist (Remove database lock)';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/serverlist?index=0&lock=0');
    chain.requestAcceptType = 'application/json';
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain);
    // console.log(JSON.stringify(chain.responseRawData, null, 2));
    console.log('\tExpect: status === 200');
    assert.strictEqual(chain.responseStatus, 200);
    console.log('\tExpect: response.index is expected value');
    assert.strictEqual(chain.responseRawData.index, 0);
    return Promise.resolve(chain);
  }) 

  // 9.26
  // -----------------------------------------------
  // 203 COPY /irc/serverlist (Copy server from Index 0 to 1)
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '203 COPY /irc/serverlist (Copy server from Index 0 to 1)';
    chain.requestMethod = 'COPY';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/serverlist?index=0');
    chain.requestContentType = 'application/json';
    chain.requestAcceptType = 'application/json'
    chain.requestCsrfHeader = chain.parsedCsrfToken;
    chain.requestBody = {
      index: 0
    };
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain);
    // console.log(JSON.stringify(chain.responseRawData, null, 2));
    console.log('\tExpect: status === 200');
    assert.strictEqual(chain.responseStatus, 200);
    console.log('\tExpect: response.status === "success"');
    assert.strictEqual(chain.responseRawData.status, 'success');
    console.log('\tExpect: response.method === "COPY"');
    assert.strictEqual(chain.responseRawData.method, 'COPY');
    console.log('\tExpect: response object has "index" property');
    assert.ok(Object.hasOwn(chain.responseRawData, 'index'));
    // chain.tempServerlistArrayLength is array length before adding any new definitions
    console.log('\tExpect: index incremented from 0 to 1');
    assert.strictEqual(chain.responseRawData.index, 1);
    //
    // Parse data
    chain.tempCopiedServerIndex = parseInt(chain.responseRawData.index);
    return Promise.resolve(chain);
  }) 

  // 9.27
  // -----------------------------------------------
  // 204 POST /irc/serverlist/tools (Move up from Index 1 to 0)
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '204 POST /irc/serverlist (Move up from Index 1 to 0)';
    chain.requestMethod = 'POST';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL +
      '/irc/serverlist/tools?index=' + chain.tempCopiedServerIndex);
    chain.requestContentType = 'application/json';
    chain.requestAcceptType = 'application/json'
    chain.requestCsrfHeader = chain.parsedCsrfToken;
    chain.requestBody = {
      index: chain.tempCopiedServerIndex,
      action: 'move-up'
    };
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain);
    // console.log(JSON.stringify(chain.responseRawData, null, 2));
    // console.log(chain.responseErrorMessage);
    console.log('\tExpect: status === 200');
    assert.strictEqual(chain.responseStatus, 200);
    console.log('\tExpect: response.status === "success"');
    assert.strictEqual(chain.responseRawData.status, 'success');
    console.log('\tExpect: response.method === "POST"');
    assert.strictEqual(chain.responseRawData.method, 'POST');
    console.log('\tExpect: response object has "index" property');
    assert.ok(Object.hasOwn(chain.responseRawData, 'index'));
    // chain.tempServerlistArrayLength is array length before adding any new definitions
    console.log('\tExpect: index has expected value of 0');
    assert.strictEqual(chain.responseRawData.index, 0);
    //
    // Parse data
    chain.tempMovedServerIndex = parseInt(chain.responseRawData.index);
    return Promise.resolve(chain);
    return Promise.resolve(chain);
  })   

  // 9.28
  // -----------------------------------------------
  // 205 POST /irc/serverlist/tools (Toggle Disabled)
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '205 POST /irc/serverlist/tools (Toggle Disabled)';
    chain.requestMethod = 'POST';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL +
      '/irc/serverlist/tools?index=' + chain.tempMovedServerIndex);
    chain.requestContentType = 'application/json';
    chain.requestAcceptType = 'application/json'
    chain.requestCsrfHeader = chain.parsedCsrfToken;
    chain.requestBody = {
      index: chain.tempMovedServerIndex,
      action: 'toggle-disabled'
    };
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain);
    // console.log(JSON.stringify(chain.responseRawData, null, 2));
    // console.log(chain.responseErrorMessage);
    console.log('\tExpect: status === 200');
    assert.strictEqual(chain.responseStatus, 200);
    console.log('\tExpect: response.status === "success"');
    assert.strictEqual(chain.responseRawData.status, 'success');
    console.log('\tExpect: response.method === "POST"');
    assert.strictEqual(chain.responseRawData.method, 'POST');
    console.log('\tExpect: response object has "index" property');
    assert.ok(Object.hasOwn(chain.responseRawData, 'index'));
    // chain.tempServerlistArrayLength is array length before adding any new definitions
    console.log('\tExpect: index has expected value');
    assert.strictEqual(chain.responseRawData.index, chain.tempMovedServerIndex);
    console.log('\tExpect: iresponse.value true');
    assert.strictEqual(chain.responseRawData.value, true);
    //
    // Parse data
    chain.tempMovedServerIndex = parseInt(chain.responseRawData.index);
    return Promise.resolve(chain);
    return Promise.resolve(chain);
  })   

  // 9.29
  // -------------------------------
  // 206 GET /irc/serverlist (Get server, confirm is disabled)';
  // -------------------------------
  .then((chain) => {
    chain.testDescription = '206 GET /irc/serverlist (Get server, confirm is disabled)';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL +
      '/irc/serverlist?index=' + chain.tempMovedServerIndex);
    chain.requestAcceptType = 'application/json';
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain);
    // console.log(JSON.stringify(chain.responseRawData, null, 2));
    console.log('\tExpect: status === 200');
    assert.strictEqual(chain.responseStatus, 200);
    console.log('\tExpect: response.index is expected value');
    assert.strictEqual(chain.responseRawData.index, chain.tempMovedServerIndex);
    console.log('\tExpect: response.disabled === true');
    assert.strictEqual(chain.responseRawData.disabled, true);
    return Promise.resolve(chain);
  }) 

  // 9.30
  // -----------------------------------------------
  // 207 DELETE /irc/serverlist (Delete the copied server definition)
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '207 DELETE /irc/serverlist (Delete the copied server definition)';
    chain.requestMethod = 'DELETE';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL +
      '/irc/serverlist?index=' + chain.tempMovedServerIndex.toString());
    chain.requestContentType = 'application/json';
    chain.requestAcceptType = 'application/json'
    chain.requestCsrfHeader = chain.parsedCsrfToken;
    chain.requestBody = {
      index: chain.tempMovedServerIndex,


    };
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain);
    // console.log(JSON.stringify(chain.responseRawData, null, 2));
    console.log('\tExpect: status === 200');
    assert.strictEqual(chain.responseStatus, 200);
    console.log('\tExpect: response.status === "success"');
    assert.strictEqual(chain.responseRawData.status, 'success');
    console.log('\tExpect: response.method === "DELETE"');
    assert.strictEqual(chain.responseRawData.method, 'DELETE');
    return Promise.resolve(chain);
  })    

  // 9.x (new)
  // -----------------------------------------------
  // 208 GET /irc/serverlist (Confirm original record at index 0)
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '208 GET /irc/serverlist (Confirm original record at index 0) ';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/serverlist?index=0');
    chain.requestAcceptType = 'application/json';
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain);
    // console.log(JSON.stringify(chain.responseRawData, null, 2));
    console.log('\tExpect: status === 200');
    assert.strictEqual(chain.responseStatus, 200);
    console.log('\tExpect: response.index === 0');
    assert.strictEqual(chain.responseRawData.index, 0);
    console.log('\tExpect: response.name equals original server at index 0');
    assert.strictEqual(chain.responseRawData.name, chain.tempServerNameAtIdx0);
    return Promise.resolve(chain);
  })

  // 9.31
  // -----------------------------------------------
  // 300 POST /irc/serverlist (Input validation error: host)
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '300 POST /irc/serverlist (Input validation error: host)';
    chain.requestMethod = 'POST';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/serverlist');
    chain.requestContentType = 'application/json';
    chain.requestAcceptType = 'application/json'
    chain.requestCsrfHeader = chain.parsedCsrfToken;
    chain.requestBody = {
      disabled: false,
      group: 0,
      name: 'local-server',
      host: 'invalid',
      port: 6667,
      tls: false,
      verify: false,
      proxy: false,
      reconnect: false,
      logging: false,
      password: '',
      saslUsername: '',
      saslPassword: '',
      identifyNick: '',
      identifyCommand: '',
      nick: 'myNick',
      altNick: 'myNick2',
      recoverNick: false,
      user: 'myUser',
      real: 'myRealName',
      modes: '+iw',
      channelList: '#test, #test2, #test3'
    };
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain, { ignoreErrorStatus: 422 });
    // console.log(JSON.stringify(chain.responseRawData, null, 2));
    // console.log(chain.responseErrorMessage);
    console.log('\tExpect: status === 422');
    assert.strictEqual(chain.responseStatus, 422);
    console.log('\tExpect: Error essage contains "Host must be domain name or IP"');
    assert.ok(chain.responseErrorMessage.indexOf('Host must be domain name or IP') >= 0);

    return Promise.resolve(chain);
  })

  // 9.32
  // -----------------------------------------------
  // 301 POST /irc/serverlist (Input validation error: port number)
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '301 POST /irc/serverlist (Input validation error: port number)';
    chain.requestMethod = 'POST';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/serverlist');
    chain.requestContentType = 'application/json';
    chain.requestAcceptType = 'application/json'
    chain.requestCsrfHeader = chain.parsedCsrfToken;
    chain.requestBody = {
      disabled: false,
      group: 0,
      name: 'local-server',
      host: '127.0.0.1',
      port: 'invalid',
      tls: false,
      verify: false,
      proxy: false,
      reconnect: false,
      logging: false,
      password: '',
      saslUsername: '',
      saslPassword: '',
      identifyNick: '',
      identifyCommand: '',
      nick: 'myNick',
      altNick: 'myNick2',
      recoverNick: false,
      user: 'myUser',
      real: 'myRealName',
      modes: '+iw',
      channelList: '#test, #test2, #test3'
    };
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain, { ignoreErrorStatus: 422 });
    // console.log(JSON.stringify(chain.responseRawData, null, 2));
    // console.log(chain.responseErrorMessage);
    console.log('\tExpect: status === 422');
    assert.strictEqual(chain.responseStatus, 422);
    console.log('\tExpect: Error essage contains "Invalid socket port number"');
    assert.ok(chain.responseErrorMessage.indexOf('Invalid socket port number') >= 0);

    return Promise.resolve(chain);
  })
  // 9.33
  // -----------------------------------------------
  // 302 POST /irc/serverlist (Input validation error: missing name)
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '302 POST /irc/serverlist (Input validation error: missing name)';
    chain.requestMethod = 'POST';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/serverlist');
    chain.requestContentType = 'application/json';
    chain.requestAcceptType = 'application/json'
    chain.requestCsrfHeader = chain.parsedCsrfToken;
    chain.requestBody = {
      disabled: false,
      group: 0,
      name: '',
      host: '127.0.0.1',
      port: 6667,
      tls: false,
      verify: false,
      proxy: false,
      reconnect: false,
      logging: false,
      password: '',
      saslUsername: '',
      saslPassword: '',
      identifyNick: '',
      identifyCommand: '',
      nick: 'myNick',
      altNick: 'myNick2',
      recoverNick: false,
      user: 'myUser',
      real: 'myRealName',
      modes: '+iw',
      channelList: '#test, #test2, #test3'
    };
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain, { ignoreErrorStatus: 422 });
    // console.log(JSON.stringify(chain.responseRawData, null, 2));
    // console.log(chain.responseErrorMessage);
    console.log('\tExpect: status === 422');
    assert.strictEqual(chain.responseStatus, 422);
    console.log('\tExpect: Error essage contains "No empty strings","path":"name"');
    assert.ok(chain.responseErrorMessage.indexOf('"No empty strings","path":"name"') >= 0);

    return Promise.resolve(chain);
  })

  // 9.34
  // -----------------------------------------------
  // 303 POST /irc/serverlist (Input validation error: missing nick)
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '303 POST /irc/serverlist (Input validation error: missing nick)';
    chain.requestMethod = 'POST';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/serverlist');
    chain.requestContentType = 'application/json';
    chain.requestAcceptType = 'application/json'
    chain.requestCsrfHeader = chain.parsedCsrfToken;
    chain.requestBody = {
      disabled: false,
      group: 0,
      name: 'server-name',
      host: '127.0.0.1',
      port: 6667,
      tls: false,
      verify: false,
      proxy: false,
      reconnect: false,
      logging: false,
      password: '',
      saslUsername: '',
      saslPassword: '',
      identifyNick: '',
      identifyCommand: '',
      nick: '',
      altNick: 'myNick2',
      recoverNick: false,
      user: 'myUser',
      real: 'myRealName',
      modes: '+iw',
      channelList: '#test, #test2, #test3'
    };
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain, { ignoreErrorStatus: 422 });
    // console.log(JSON.stringify(chain.responseRawData, null, 2));
    // console.log(chain.responseErrorMessage);
    console.log('\tExpect: status === 422');
    assert.strictEqual(chain.responseStatus, 422);
    console.log('\tExpect: Error essage contains "No empty strings","path":"nick"');
    assert.ok(chain.responseErrorMessage.indexOf('"No empty strings","path":"nick"') >= 0);

    return Promise.resolve(chain);
  })

  // 9.35
  // -----------------------------------------------
  // 304 POST /irc/serverlist (Input validation error: missing user)
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '304 POST /irc/serverlist (Input validation error: missing user)';
    chain.requestMethod = 'POST';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/serverlist');
    chain.requestContentType = 'application/json';
    chain.requestAcceptType = 'application/json'
    chain.requestCsrfHeader = chain.parsedCsrfToken;
    chain.requestBody = {
      disabled: false,
      group: 0,
      name: 'server-name',
      host: '127.0.0.1',
      port: 6667,
      tls: false,
      verify: false,
      proxy: false,
      reconnect: false,
      logging: false,
      password: '',
      saslUsername: '',
      saslPassword: '',
      identifyNick: '',
      identifyCommand: '',
      nick: 'myNick',
      altNick: 'myNick2',
      recoverNick: false,
      user: '',
      real: 'myRealName',
      modes: '+iw',
      channelList: '#test, #test2, #test3'
    };
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain, { ignoreErrorStatus: 422 });
    // console.log(JSON.stringify(chain.responseRawData, null, 2));
    // console.log(chain.responseErrorMessage);
    console.log('\tExpect: status === 422');
    assert.strictEqual(chain.responseStatus, 422);
    console.log('\tExpect: Error essage contains "No empty strings","path":"user"');
    assert.ok(chain.responseErrorMessage.indexOf('"No empty strings","path":"user"') >= 0);

    return Promise.resolve(chain);
  })

  // -----------------------------------------------
  // 400 POST /irc/server (set server index for connect to IRC)
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '400 POST /irc/server (set server index for connect to IRC)';
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
  // 401 POST /irc/connect (connect to IRC before testing serverlist edit)
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '401 POST /irc/connect (connect to IRC before testing serverlist edit)';
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
  
  // -------------------------------
  // 402 GET /irc/getircstate (Confirm connected to IRC)
  // -------------------------------
  .then((chain) => {
    chain.testDescription = '402 GET /irc/getircstate (Confirm connected to IRC)';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/getircstate');
    chain.requestAcceptType = 'application/json';
    return Promise.resolve(chain);
  })
  .then((chain) => sleep(chain, testEnv.ircRegisterDelay, 'Delay - Wait for IRC to register'))
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain);
    // console.log(JSON.stringify(chain.responseRawData, null, 2));

    console.log('\tExpect: status === 200');
    assert.strictEqual(chain.responseStatus, 200);
    console.log('\tExpect: ircConnected is true');  
    assert.ok(chain.responseRawData.ircConnected);
    return Promise.resolve(chain);
  })


  // -----------------------------------------------
  // 403 POST /irc/serverlist (Attempt create new while connected to IRC)
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '403 POST /irc/serverlist (Attempt create new while connected to IRC)';
    chain.requestMethod = 'POST';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/serverlist');
    chain.requestContentType = 'application/json';
    chain.requestAcceptType = 'application/json'
    chain.requestCsrfHeader = chain.parsedCsrfToken;
    chain.requestBody = {
      disabled: false,
      group: 0,
      name: 'server-name',
      host: '127.0.0.1',
      port: 6667,
      tls: false,
      verify: false,
      proxy: false,
      reconnect: false,
      logging: false,
      password: '',
      saslUsername: '',
      saslPassword: '',
      identifyNick: '',
      identifyCommand: '',
      nick: 'myNick',
      altNick: 'myNick2',
      recoverNick: false,
      user: 'myUser',
      real: 'myRealName',
      modes: '+iw',
      channelList: '#test, #test2, #test3'
    };
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain, { ignoreErrorStatus: 409 });
    // console.log(JSON.stringify(chain.responseRawData, null, 2));
    // console.log(chain.responseErrorMessage);
    console.log('\tExpect: status === 409');
    assert.strictEqual(chain.responseStatus, 409);
    console.log('\tExpect: Error essage contains "Editing server list requires IRC client to disconnect from IRC');
    assert.ok(chain.responseErrorMessage.indexOf('Editing server list requires IRC client to disconnect from IRC') >= 0);
    return Promise.resolve(chain);
  })

  // -------------------------------
  // 404 GET /irc/serverlist (Attempt lock while connected to IRC)
  // -------------------------------
  .then((chain) => {
    chain.testDescription = '404 GET /irc/serverlist (Attempt lock while connected to IRC)';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/serverlist?index=0&lock=1');
    chain.requestAcceptType = 'application/json';
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain, { ignoreErrorStatus: 409 });
    // console.log(JSON.stringify(chain.responseRawData, null, 2));
    console.log('\tExpect: status === 409');
    assert.strictEqual(chain.responseStatus, 409);
    console.log('\tExpect: Error essage contains "Editing server list requires IRC client to disconnect from IRC');
    assert.ok(chain.responseErrorMessage.indexOf('Editing server list requires IRC client to disconnect from IRC') >= 0);
    return Promise.resolve(chain);
  })


  // -----------------------------------------------
  // 405 PATCH /irc/serverlist (Attempt modify while connected to IRC)
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '405 PATCH /irc/serverlist (Attempt modify while connected to IRC)';
    chain.requestMethod = 'PATCH';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/serverlist?index=0');
    chain.requestContentType = 'application/json';
    chain.requestAcceptType = 'application/json'
    chain.requestCsrfHeader = chain.parsedCsrfToken;
    chain.requestBody = {
      index: 0,
      disabled: false,
      group: 0,
      name: 'local-server',
      host: '127.0.0.1',
      port: 6667,
      tls: false,
      verify: false,
      proxy: false,
      reconnect: false,
      logging: false,
      password: '',
      saslUsername: '',
      saslPassword: '',
      identifyNick: '',
      identifyCommand: '',
      nick: 'myNick',
      altNick: 'myNick2',
      recoverNick: false,
      user: 'myUser',
      real: 'myRealName',
      modes: '+iw',
      channelList: '#test, #test2, #test3'
    };
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain, { ignoreErrorStatus: 409 });
    // console.log(JSON.stringify(chain.responseRawData, null, 2));
    // console.log(chain.responseErrorMessage);
    console.log('\tExpect: status === 409');
    assert.strictEqual(chain.responseStatus, 409);
    console.log('\tExpect: Error essage contains "Editing server list requires IRC client to disconnect from IRC');
    assert.ok(chain.responseErrorMessage.indexOf('Editing server list requires IRC client to disconnect from IRC') >= 0);
    return Promise.resolve(chain);
  })

  // -----------------------------------------------
  // 406 DELETE /irc/serverlist (Attempt delete while connected to IRC)
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '406 DELETE /irc/serverlist (Attempt delete while connected to IRC)';
    chain.requestMethod = 'DELETE';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL +
      '/irc/serverlist?index=' + chain.tempMovedServerIndex.toString());
    chain.requestContentType = 'application/json';
    chain.requestAcceptType = 'application/json'
    chain.requestCsrfHeader = chain.parsedCsrfToken;
    chain.requestBody = {
      index: chain.tempMovedServerIndex,


    };
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain, { ignoreErrorStatus: 409 });
    // console.log(JSON.stringify(chain.responseRawData, null, 2));
    console.log('\tExpect: status === 409');
    assert.strictEqual(chain.responseStatus, 409);
    console.log('\tExpect: Error essage contains "Editing server list requires IRC client to disconnect from IRC');
    assert.ok(chain.responseErrorMessage.indexOf('Editing server list requires IRC client to disconnect from IRC') >= 0);
    return Promise.resolve(chain);
  })   

  // -----------------------------------------------
  // 407 COPY /irc/serverlist (Attempt copy while connected to IRC)
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '407 COPY /irc/serverlist (Attempt copy while connected to IRC)';
    chain.requestMethod = 'COPY';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/serverlist?index=0');
    chain.requestContentType = 'application/json';
    chain.requestAcceptType = 'application/json'
    chain.requestCsrfHeader = chain.parsedCsrfToken;
    chain.requestBody = {
      index: 0
    };
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain, { ignoreErrorStatus: 409 });
    // console.log(JSON.stringify(chain.responseRawData, null, 2));
    // console.log(chain.responseErrorMessage);
    console.log('\tExpect: status === 409');
    assert.strictEqual(chain.responseStatus, 409);
    console.log('\tExpect: Error essage contains "Editing server list requires IRC client to disconnect from IRC');
    assert.ok(chain.responseErrorMessage.indexOf('Editing server list requires IRC client to disconnect from IRC') >= 0);
    return Promise.resolve(chain);
  }) 

  // -------------------------------
  // 408 GET /irc/serverlist (Retrieve full list is allowed while connected IRC)
  // -------------------------------
  .then((chain) => {
    chain.testDescription = '408 GET /irc/serverlist (Retrieve full list is allowed while connected IRC)';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/serverlist');
    chain.requestAcceptType = 'application/json';
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain);
    // console.log(JSON.stringify(chain.responseRawData, null, 2));
    console.log('\tExpect: status === 200');
    assert.strictEqual(chain.responseStatus, 200);
    console.log('\tExpect: Server list array length > 0');
    assert.ok(chain.responseRawData.length > 0);
    return Promise.resolve(chain);
  })

  // -----------------------------------------------
  // 409 POST /irc/disconnect (Done server list tests, disconnect from IRC)
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '409 POST /irc/disconnect (Done server list tests, disconnect from IRC)';
    chain.requestMethod = 'POST';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/disconnect');
    chain.requestContentType = 'application/json';
    chain.requestAcceptType = 'application/json'
    chain.requestCsrfHeader = chain.parsedCsrfToken;
    chain.requestBody = {};

    return Promise.resolve(chain);
  })
  .then((chain) => sleep(chain, 5, 'Delay - Waiting to disconnect'))
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain);
    // console.log(JSON.stringify(chain.responseRawData, null, 2));
    console.log('\tExpect: status === 200');
    assert.strictEqual(chain.responseStatus, 200);
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
