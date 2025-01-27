// cookie-tests.js
//
// The irc-hybrid-client web server uses session cookies to 
// authorize access to the website. The sessions and cookies 
// are created by the express-session middleware.
// The script includes two options for cookies with fixed 
// expiration cookies and rolling cookies, where rolling 
// cookies will extend the cookie expiration with each request.
//
//    # Recommended test configuration
//    SESSION_EXPIRE_SEC=8
//        # Option 1 of 2
//        SESSION_SET_ROLLING_COOKIE=false
//        # Option 1 of 2
//        SESSION_SET_ROLLING_COOKIE=true
//
// ---------------------------------------------------------------
'use strict';

const assert = require('node:assert');
const fs = require('node:fs');

// This is in local node_modules folder as dependency of express-session
const signature = require('../../irc-hybrid-client/node_modules/cookie-signature');
const uid = require('../../irc-hybrid-client/node_modules/uid-safe').sync;

if (!fs.existsSync('./package.json')) {
  console.log('Must be run from repository base folder as: node debug/cookie-tests.js');
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
  showHardError,
  // showJwtToken,
  // showJwtMetaData
  // check404PossibleVhostError
} = require('./modules/test-utils');

const chainObj = Object.create(null);

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
    console.log('\tExpect: Response doe not have a set-cookie header');
    assert.ok(!Object.hasOwn(chain.responseHeaders, 'set-cookie'));
    return Promise.resolve(chain);
  })

  // -------------------------------
  // 1 GET /irc/webclient.html - Unauthenticated request to protected route.
  //
  // This is an initial test to a protected route for cookie testing.
  //
  // This first request represents an initial first connection
  // to the web server for there case where the
  // user's browser does not have a session cookie.
  //
  // The request is expected to fail with a 302 FOUND response
  // with the Location header containing a new URL for the login form.
  //
  // This test also confirms that no cookie is issued to the browser
  // -------------------------------
  .then((chain) => {
    chain.testDescription = '1 GET /irc/webclient.html - No access to protected route.';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/webclient.html');
    delete chain.currentSessionCookie;
    delete chain.currentSessionCookieExpires;
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  //
  // Assertion Tests...
  //
  .then((chain) => {
    logRequest(chain);
    // console.log(chain.responseRawData);
    // check404PossibleVhostError(chain);
    console.log('\tExpect: status === 302 (Redirect)');
    assert.strictEqual(chain.responseStatus, 302);
    console.log('\tExpect: Location header redirects to GET /login');
    assert.strictEqual(chain.parsedLocationHeader, '/login');
    console.log('\tExpect: Response doe not have a set-cookie header');
    assert.ok(!Object.hasOwn(chain.responseHeaders, 'set-cookie'));
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
    console.log('\tExpect: Response includes set-cookie header');
    assert.ok(Object.hasOwn(chain.responseHeaders, 'set-cookie'));
    //
    // Parse Data
    //
    chain.parsedCsrfToken =
      chain.responseRawData.split('name="_csrf"')[1].split('value="')[1].split('"')[0];
    chain.parsedLoginNonce = 
      chain.responseRawData.split('action="/login-authorize?nonce=')[1].split('"')[0];
    chain.tempLoginFormCookie = chain.parsedSetCookieHeader;
    return Promise.resolve(chain);
  })  

  // -----------------------------------------------
  // 51 POST /login-authorize - Get valid cookie
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '51 POST /login-authorize - Get valid cookie';
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
    console.log('\tExpect: Response includes set-cookie header');
    assert.ok(Object.hasOwn(chain.responseHeaders, 'set-cookie'));
    console.log('\tExpect: Issued cookie different from login form');
    assert.notEqual(chain.parsedSetCookieHeader, chain.tempLoginFormCookie)
    chain.tempLoginFormCookie = chain.parsedSetCookieHeader;
    //
    // Parse Data
    //
    delete chain.tempLoginFormCookie;
    delete chain.parsedCsrfToken;
    delete chain.parsedLoginNonce;
    chain.savedCurrentSessionCookie = chain.currentSessionCookie;
    chain.savedCurrentSessionCookieExpires = chain.currentSessionCookieExpires;
    return Promise.resolve(chain);
  })

  // -------------------------------
  // 52 GET /irc/webclient.html (Confirm access to protected route with cookie)
  // -------------------------------
  .then((chain) => {
    chain.testDescription = '52 GET /irc/webclient.html (Confirm access to protected route)';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/webclient.html');
    chain.requestAcceptType = 'text/html';
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    // console.log(chain.responseRawData);

    console.log('\tExpect: status === 200');
    assert.strictEqual(chain.responseStatus, 200);
    if (config.session.rollingCookie) {
      console.log('\tExpect: Response includes set-cookie header (Rolling cookie)');
      assert.ok(Object.hasOwn(chain.responseHeaders, 'set-cookie'));
      console.log('\tExpect: Issued cookie same as password login response cookie');
      assert.strictEqual(chain.parsedSetCookieHeader, chain.savedCurrentSessionCookie)
    } else {
      console.log('\tExpect: Response doe not have a set-cookie header (Not rolling cookie)');
      assert.ok(!Object.hasOwn(chain.responseHeaders, 'set-cookie')); 
    }
    return Promise.resolve(chain);
  })


  // -------------------------------
  // 100 GET /secure - Confirm access prior to logout
  // -------------------------------
  .then((chain) => {
    chain.testDescription = '100 GET /secure - Confirm access prior to logout';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/secure');
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain);
    // console.log(chain.responseRawData);
    console.log('\tExpect: status === 200');
    assert.strictEqual(chain.responseStatus, 200);
    if (config.session.rollingCookie) {
      console.log('\tExpect: Response includes set-cookie header (Rolling cookie)');
      assert.ok(Object.hasOwn(chain.responseHeaders, 'set-cookie'));
      console.log('\tExpect: Issued cookie same as password login response cookie');
      assert.strictEqual(chain.parsedSetCookieHeader, chain.savedCurrentSessionCookie)
    } else {
      console.log('\tExpect: Response doe not have a set-cookie header (Not rolling cookie)');
      assert.ok(!Object.hasOwn(chain.responseHeaders, 'set-cookie')); 
    }
    return Promise.resolve(chain);
  })



  // -------------------------------
  // 101 GET /logout - Call to remove session from session store';
  // -------------------------------
  .then((chain) => {
    chain.testDescription = '101 GET /logout - Call to remove session from session store';
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
  // 102 GET /secure - Confirm old cookie not accepted
  // -------------------------------
  .then((chain) => {
    chain.testDescription = '102 GET /secure - Confirm old cookie not accepted';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/secure');
    chain.currentSessionCookie = chain.tempLastCurrentSessionCookie;
    chain.currentSessionCookieExpires = chain.tempLastCurrentSessionCookieExpires
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain, { ignoreErrorStatus: 403 });
    // console.log(chain.responseRawData);
    console.log('\tExpect: status === 403');
    assert.strictEqual(chain.responseStatus, 403);
    console.log('\tExpect: Error response doe not have a set-cookie header (Not authenticated)');
    assert.ok(!Object.hasOwn(chain.responseHeaders, 'set-cookie')); 
    delete chain.tempLastCurrentSessionCookie;
    delete chain.tempLastCurrentSessionCookieExpires;
    return Promise.resolve(chain);
  })

  // -------------------------------
  // 200 GET /login - Get new nonce and CSRF token
  // -------------------------------
  .then((chain) => {
    chain.testDescription = '200 GET /login - Get new nonce and CSRF token';
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
    chain.parsedCsrfToken =
      chain.responseRawData.split('name="_csrf"')[1].split('value="')[1].split('"')[0];
    chain.parsedLoginNonce = 
      chain.responseRawData.split('action="/login-authorize?nonce=')[1].split('"')[0];
    return Promise.resolve(chain);
  })  

  // -----------------------------------------------
  // 201 POST /login-authorize - Get valid cookie
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '201 POST /login-authorize - Get valid cookie';
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
    //
    // Parse Data
    //
    delete chain.parsedCsrfToken;
    delete chain.parsedLoginNonce;
    chain.savedCurrentSessionCookie = chain.currentSessionCookie;
    chain.savedCurrentSessionCookieExpires = chain.currentSessionCookieExpires;
    return Promise.resolve(chain);
  })

  // -------------------------------
  // 202 GET /irc/webclient.html (Confirm access to protected route with cookie)
  // -------------------------------
  .then((chain) => {
    chain.testDescription = '202 GET /irc/webclient.html (Confirm access to protected route with cookie)';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/webclient.html');
    chain.requestAcceptType = 'text/html';
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    // console.log(chain.responseRawData);

    console.log('\tExpect: status === 200');
    assert.strictEqual(chain.responseStatus, 200);
    if (config.session.rollingCookie) {
      console.log('\tExpect: Response includes set-cookie header (Rolling cookie)');
      assert.ok(Object.hasOwn(chain.responseHeaders, 'set-cookie'));
      console.log('\tExpect: Issued cookie same as password login response cookie');
      assert.strictEqual(chain.parsedSetCookieHeader, chain.savedCurrentSessionCookie)
    } else {
      console.log('\tExpect: Response doe not have a set-cookie header (Not rolling cookie)');
      assert.ok(!Object.hasOwn(chain.responseHeaders, 'set-cookie')); 
    }
    return Promise.resolve(chain);
  })



  // ----------------------------1
  // Parse cookie components
  //
  // This are saved temporarily for use in various tests.
  // ----------------------------
  .then((chain) => {
    // Assert that cookie exists before attempting to decode it
    console.log('\tExpect: Saved cookie available');
    assert.ok((chain.currentSessionCookie != null) && (chain.currentSessionCookie.length > 0));
    chain.validCookie = {};
    chain.validCookie.cookie = chain.currentSessionCookie;
    console.log('\tExpect: response cookie decodes without error');
    chain.validCookie.name = chain.validCookie.cookie.split('=')[0];
    chain.validCookie.rawValue = chain.validCookie.cookie.split('=')[1];
    chain.validCookie.decoded = decodeURIComponent(chain.validCookie.cookie.split('=')[1]).slice(2);
    assert.ok((typeof chain.validCookie.decoded === 'string') &&
      (chain.validCookie.decoded.length > 0));
    console.log('\tExpect: response cookie has valid signature');
    chain.validCookie.unsigned = signature.unsign(chain.validCookie.decoded, config.session.secret);
    if ((chain.validCookie.unsigned == null) || (chain.validCookie.unsigned === false)) {
      throw new Error('Invalid cookie signature');
    }
    // console.log('validCookie', chain.validCookie);
    return Promise.resolve(chain);
  })

  // -------------------------------
  // 203 GET /irc/webclient.html - Send raw cookie SID without signature
  // -------------------------------
  .then((chain) => {
    chain.testDescription =
      '203 GET /irc/webclient.html - Send raw cookie SID without signature';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/webclient.html');
    chain.requestAcceptType = 'text/html';
    chain.currentSessionCookie = chain.validCookie.name + '=' + chain.validCookie.unsigned;
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain);
    console.log('\tExpect: status === 302');
    assert.strictEqual(chain.responseStatus, 302);
    console.log('\tExpect: Location header redirects to GET /login');
    assert.strictEqual(chain.parsedLocationHeader, '/login');
    return Promise.resolve(chain);
  })


  // -------------------------------
  // 203 GET /irc/webclient.html - Submit ad-hoc cookie with different cookie name
  // -------------------------------
  .then((chain) => {
    chain.testDescription =
      '14 GET /secure - Submit ad-hoc cookie with different cookie name';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/webclient.html');
    chain.requestAcceptType = 'text/html';
    chain.currentSessionCookie = 'changed.sid' + '=' + chain.validCookie.rawValue;
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain);
    console.log('\tExpect: status === 302');
    assert.strictEqual(chain.responseStatus, 302);
    console.log('\tExpect: Location header redirects to GET /login');
    assert.strictEqual(chain.parsedLocationHeader, '/login');
    return Promise.resolve(chain);
  })

  // -------------------------------
  // 204 GET /irc/webclient.html - Submit ad-hoc cookie signed with wrong secret
  // -------------------------------
  .then((chain) => {
    chain.testDescription =
      '204 GET /irc/webclient.html - Submit ad-hoc cookie signed with wrong secret';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/webclient.html');
    chain.requestAcceptType = 'text/html';
    // This is valid (before using different signature)
    // const signed = signature.sign(chain.validCookie.unsigned, config.session.secret);
    // This is altered
    const signed = signature.sign(chain.validCookie.unsigned, 'a' + config.session.secret);
    // console.log('\nsigned', signed);
    const encoded = encodeURIComponent('s:' + signed);
    // console.log('encoded', encoded);
    const named = chain.validCookie.name + '=' + encoded;
    // console.log('named', named);
    chain.currentSessionCookie = named;
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain);
    console.log('\tExpect: status === 302');
    assert.strictEqual(chain.responseStatus, 302);
    console.log('\tExpect: Location header redirects to GET /login');
    assert.strictEqual(chain.parsedLocationHeader, '/login');
    return Promise.resolve(chain);
  })

  // -------------------------------
  // 205 GET /irc/webclient.html - Submit ad-hoc cookie, random SID with valid signature
  // -------------------------------
  .then((chain) => {
    chain.testDescription =
      '205 GET /irc/webclient.html - Submit ad-hoc cookie, random SID with valid signature';
      chain.requestMethod = 'GET';
      chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/webclient.html');
      chain.requestAcceptType = 'text/html';
      // Used in express-session
    const alternateSid = uid(24);
    // console.log('alternateSid', alternateSid);
    // this is valid (before replacing SID)
    // const signed = signature.sign(chain.validCookie.unsigned, config.session.secret);
    // this is altered
    const signed = signature.sign(alternateSid, config.session.secret);
    // console.log('\nsigned', signed);
    const encoded = encodeURIComponent('s:' + signed);
    // console.log('encoded', encoded);
    const named = chain.validCookie.name + '=' + encoded;
    // console.log('named', named);
    chain.currentSessionCookie = named;
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain);
    console.log('\tExpect: status === 302');
    assert.strictEqual(chain.responseStatus, 302);
    console.log('\tExpect: Location header redirects to GET /login');
    assert.strictEqual(chain.parsedLocationHeader, '/login');
    return Promise.resolve(chain);
  })

  // -------------------------------
  // 206 GET /irc/webclient.html - Submit original cookie, confirm original cookie still accepted
  // -------------------------------
  .then((chain) => {
    chain.testDescription =
      '206 GET /irc/webclient.html - Confirm original cookie still accepted';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/webclient.html');
    chain.requestAcceptType = 'text/html';
    chain.currentSessionCookie = chain.validCookie.cookie;
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain);
    console.log('\tExpect: status === 200');
    assert.strictEqual(chain.responseStatus, 200);
    // not needed any more
    delete chain.validCookie;
    return Promise.resolve(chain);
  })


  // -------------------------------
  // 300 GET /login - Get new nonce and CSRF token
  // -------------------------------
  .then((chain) => {
    chain.testDescription = '300 GET /login - Get new nonce and CSRF token';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/login');
    chain.parsedCsrfToken = null;
    chain.parsedLoginNonce = null;
    delete chain.currentSessionCookie;
    delete chain.currentSessionCookieExpires;
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
    chain.parsedCsrfToken =
      chain.responseRawData.split('name="_csrf"')[1].split('value="')[1].split('"')[0];
    chain.parsedLoginNonce = 
      chain.responseRawData.split('action="/login-authorize?nonce=')[1].split('"')[0];
    return Promise.resolve(chain);
  })  

  // -----------------------------------------------
  // 301 POST /login-authorize - Get valid cookie
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '301 POST /login-authorize - Get valid cookie';
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
    //
    // Parse Data
    //
    delete chain.parsedCsrfToken;
    delete chain.parsedLoginNonce;
    chain.savedCurrentSessionCookie = chain.currentSessionCookie;
    chain.savedCurrentSessionCookieExpires = chain.currentSessionCookieExpires;
    return Promise.resolve(chain);
  })

  // -------------------------------
  // 302 GET /secure - Elapsed time 3 seconds, check if expired
  //
  // Assuming the configuration in .env SESSION_EXPIRE_SEC=8, these tests will run
  //
  // Session will be set to expire in 8 seconds
  //
  // At 3 seconds:
  //     Session cookie:   accept (session will expire in 7 seconds)
  //     Fixed expiration: accept (session will expire in 7 seconds)
  //     Rolling cookie:   accept (session will expire in 10 seconds)
  //
  // -------------------------------
  .then((chain) => {
    chain.testDescription =
      '302 GET /secure - Elapsed time 3 seconds, check if expired';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/webclient.html');
    chain.requestAcceptType = 'text/html';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/secure');
    if ((config.session.ttl === 8)) {
      // Save the expiration time of the previous cookie (UNIX seconds)
      chain.tempLastSessionCookie = chain.currentSessionCookie;
      chain.tempLastSessionCookieExpires = chain.currentSessionCookieExpires;
      return Promise.resolve(chain);
    } else {
      chain.abortSleepTimer = true;
      chain.abortManagedFetch = true;
      chain.skipInlineTests = true;
      return Promise.resolve(chain);
    }
  })
  .then((chain) => sleep(chain, 3, 'Delay - Waiting for cookie to expire'))
  .then((chain) => managedFetch(chain))
  //
  // Assertion Tests...
  //
  .then((chain) => {
    if (chain.skipInlineTests) {
      delete chain.skipInlineTests;
      return Promise.resolve(chain);
    } else {
      logRequest(chain);
      // console.log(JSON.stringify(chain.responseRawData, null, 2));
      const expiresDelta = chain.currentSessionCookieExpires - chain.tempLastSessionCookieExpires;
      if (config.session.rollingCookie === true) {
        console.log('\tExpect: status === 200');
        assert.strictEqual(chain.responseStatus, 200);
        console.log('\tExpect: set-cookie header (because rollingCookie=true)');
        assert.ok(Object.hasOwn(chain.responseHeaders, 'set-cookie')); 
        console.log('\tExpect: Cookie not changed');
        assert.strictEqual(chain.tempLastSessionCookie, chain.currentSessionCookie);
        console.log('\tExpect: Cookie expires value incremented by 3 seconds after time delay');
        assert.ok((expiresDelta >= 2) && (expiresDelta <= 4));
      } else {
        console.log('\tExpect: status === 200');
        assert.strictEqual(chain.responseStatus, 200);
      }
      return Promise.resolve(chain);
    }
  })

  // -------------------------------
  // 303 GET /secure - Elapsed time 3 + 3 = 6 seconds, check if expired
  // Session will be set to expire in 8 seconds
  //
  // At 3 + 3 = 6 seconds:
  //     Session cookie:   accept (session will expire in 4 seconds)
  //     Fixed expiration: accept (session will expire in 4 seconds)
  //     Rolling cookie:   accept (session will expire in 10 seconds)
  //
  // -------------------------------
  .then((chain) => {
    chain.testDescription =
      '303 GET /secure - Elapsed time 3 + 3 = 6 seconds, check if expired';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/secure');
    if (config.session.ttl === 8) {
      return Promise.resolve(chain);
    } else {
      chain.abortSleepTimer = true;
      chain.abortManagedFetch = true;
      chain.skipInlineTests = true;
      return Promise.resolve(chain);
    }
  })
  .then((chain) => sleep(chain, 3, 'Delay - Waiting for cookie to expire'))
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    if (chain.skipInlineTests) {
      delete chain.skipInlineTests;
      return Promise.resolve(chain);
    } else {
      logRequest(chain);
      const expiresDelta = chain.currentSessionCookieExpires - chain.tempLastSessionCookieExpires;
      if (config.session.rollingCookie === true) {
        console.log('\tExpect: status === 200');
        assert.strictEqual(chain.responseStatus, 200);
        console.log('\tExpect: set-cookie header (because rollingCookie=true)');
        assert.ok((chain.parsedSetCookieHeader != null) &&
          (chain.parsedSetCookieHeader.length > 0));
        console.log('\tExpect: Cookie not changed');
        assert.strictEqual(chain.tempLastSessionCookie, chain.currentSessionCookie);
        console.log('\tExpect: Cookie expires value incremented by 6 seconds after time delay');
        assert.ok((expiresDelta >= 5) && (expiresDelta <= 7));
      } else {
        console.log('\tExpect: status === 200');
        assert.strictEqual(chain.responseStatus, 200);
      }
      return Promise.resolve(chain);
    }
  })

  // -------------------------------
  // 304 GET /secure - Elapsed time 3 + 3 + 4 = 10 seconds, check if expired
  //
  // At this time, there will be a difference in acceptance for different cookies
  //
  // At 3 + 3 + 4 = 10 seconds:
  //     Session cookie:   reject (session expired 2 seconds ago)
  //     Fixed expiration: reject (session expired 2 seconds ago)
  //     Rolling cookie:   accept (session will expire in 10 seconds)
  //
  // -------------------------------
  .then((chain) => {
    chain.testDescription =
      '304 GET /secure - Elapsed time 3 + 3 + 4 = 10 seconds, check if expired';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/secure');
    if (config.session.ttl === 8) {
      return Promise.resolve(chain);
    } else {
      chain.abortSleepTimer = true;
      chain.abortManagedFetch = true;
      chain.skipInlineTests = true;
      return Promise.resolve(chain);
    }
  })
  .then((chain) => sleep(chain, 4, chain.sleepDelayMessage))
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    if (chain.skipInlineTests) {
      delete chain.skipInlineTests;
      return Promise.resolve(chain);
    } else {
      logRequest(chain, { ignoreErrorStatus: 403 });
      const expiresDelta = chain.currentSessionCookieExpires - chain.tempLastSessionCookieExpires;
      if (config.session.rollingCookie === true) {
        console.log('\tExpect: status === 200');
        assert.strictEqual(chain.responseStatus, 200);
        console.log('\tExpect: set-cookie header (because rollingCookie=true)');
        assert.ok((chain.parsedSetCookieHeader != null) &&
          (chain.parsedSetCookieHeader.length > 0));
        console.log('\tExpect: Cookie not changed');
        assert.strictEqual(chain.tempLastSessionCookie, chain.currentSessionCookie);
        console.log('\tExpect: Cookie expires value incremented by 10 seconds after time delay');
        assert.ok((expiresDelta >= 9) && (expiresDelta <= 11));
      } else {
        console.log('\tExpect: status === 403');
        assert.strictEqual(chain.responseStatus, 403);
      }
      return Promise.resolve(chain);
    }
  })

  // -------------------------------
  // 105 GET /secure - Elapsed time 3 + 3 + 4 + 10 = 20 seconds, check if expired
  //
  // In this case, an interval of 10 seconds without any request will expire all cookies
  //
  // At 3 + 3 + 4 + 10 = 20 seconds:
  //     Session cookie:   reject (session expired 12 seconds ago)
  //     Fixed expiration: reject (session expired 12 seconds ago)
  //     Rolling cookie:   reject (session expired 2 seconds ago)
  //
  // -------------------------------
  .then((chain) => {
    chain.testDescription =
      '105 GET /secure - Elapsed time 3 + 3 + 4 + 10 = 20 seconds, check if expired';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/secure');
    if (config.session.ttl === 8) {
      return Promise.resolve(chain);
    } else {
      chain.abortSleepTimer = true;
      chain.abortManagedFetch = true;
      chain.skipInlineTests = true;
      return Promise.resolve(chain);
    }
  })
  .then((chain) => sleep(chain, 10, 'Delay - Expecting cookie to be expired'))
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    if (chain.skipInlineTests) {
      delete chain.skipInlineTests;
      return Promise.resolve(chain);
    } else {
      logRequest(chain, { ignoreErrorStatus: 403 });
      console.log('\tExpect: status === 403');
      assert.strictEqual(chain.responseStatus, 403);
      return Promise.resolve(chain);
    }
  })


  // -------------------------------
  // 106 GET /secure - Elapsed time 3 + 3 + 4 + 10 + 4 = 24 seconds, Done
  //
  // In the previous test #105, all sessions were expired, they should continue to reject
  // At 3 + 3 + 4 +10 + 4 = 24 seconds:
  //     Session cookie:   reject
  //     Fixed expiration: reject
  //     Rolling cookie:   reject
  // -------------------------------
  .then((chain) => {
    chain.testDescription =
      '106 GET /secure - Elapsed time 3 + 3 + 4 + 10 + 4 = 24 seconds, Done';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/secure');
    if (config.session.ttl === 8) {
      return Promise.resolve(chain);
    } else {
      chain.abortSleepTimer = true;
      chain.abortManagedFetch = true;
      chain.skipInlineTests = true;
      return Promise.resolve(chain);
    }
  })
  .then((chain) => sleep(chain, 4, 'Delay - Expecting cookie to be expired'))
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    // Temporary variables no longer needed
    delete chain.tempLastSessionCookie;
    delete chain.tempLastSessionCookieExpires;
    if (chain.skipInlineTests) {
      delete chain.skipInlineTests;
      return Promise.resolve(chain);
    } else {
      logRequest(chain, { ignoreErrorStatus: 403 });
      console.log('\tExpect: status === 403');
      assert.strictEqual(chain.responseStatus, 403);
      return Promise.resolve(chain);
    }
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
