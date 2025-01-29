// remote-auth.js
//
// The remote-auth script in this folder is to exercise the
// optional remote login workflow using the 
// https://github.com/cotarr/collab-auth authorization server.
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
} = require('../modules/import-config.js');

if (!config.oauth2.enableRemoteLogin) {
  console.log();
  console.log('The irc-hybrid-client web server is configured for remote authentication');
  console.log('Local authentication tests: skipped');
  console.log
  console.log('---------------------');
  console.log('  All Tests Passed');
  console.log('---------------------');
  process.exit(0);
}

//
// Validate configuration for OAuth 2.0 configuration variables
//

// console.log(testEnv)
// console.log(config.oauth2)

if (!config.oauth2.enableRemoteLogin) {
  console.log(`

Error: The remote-auth.sh script requires that irc-hybrid-client be
configured from remote authentication in the .env file. Example:

OAUTH2_ENABLE_REMOTE_LOGIN=true

`);
  process.exit(1);
}

if ((!config.oauth2.remoteAuthHost) ||
  (!config.oauth2.remoteCallbackHost) ||
  (!config.oauth2.remoteClientId) ||
  (!config.oauth2.remoteClientSecret) ||
  (!config.oauth2.remoteScope)) {
  console.log(`

Error: The remote-auth.sh script requires that oauth2 credentials for the 
irc-hybrid-client web server to connect to the remote oauth2 server be configured in the 
irc-hybrid-client .env file. Example:

OAUTH2_REMOTE_AUTH_HOST=http://127.0.0.1:3500
OAUTH2_REMOTE_CALLBACK_HOST=http://localhost:3003
OAUTH2_REMOTE_CLIENT_ID=irc_client_1
OAUTH2_REMOTE_CLIENT_SECRET="xxxxxxxxxxxx"
OAUTH2_REMOTE_SCOPE=irc.all

`);
  process.exit(1);
}

if ((testEnv.remoteAuthUsername.length === 0) ||
  (testEnv.remoteAuthPassword.length === 0) ||
  (testEnv.remoteAuthTrustedClient === null)) {
  console.log(`

Error: The remote-auth.sh script requires that user's credentials for
user login to the remote authentication server be configured in the 
irc-hybrid-client .env file. Example:

TESTENV_REMOTE_TRUSTED_CLIENT=true
TESTENV_REMOTE_AUTH_USERNAME=remote1
TESTENV_REMOTE_AUTH_PASSWORD=xxxxxxxxxxxx

`);
  process.exit(1);
}

const managedFetch = require('../modules/managed-fetch').managedFetch;

const {
  logRequest,
  showChain,
  showHardError
} = require('../modules/test-utils');

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
// ----------- Cookie Jar ------------
//  chain.preAuthLocalSessionCookie
//  chain.authRemoteSessionCookie
//  chain.loggedInRemoteSessionCookie
//  chain.loggedInLocalSessionCookie
//  

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
  // 10 (local) GET /status (confirm irc-hybrid-client web server is running)
  // -------------------------------
  .then((chain) => {
    chain.testDescription = '10 (local) GET /status (confirm irc-hybrid-client web server is running)';
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
  // 20 (remote) GET /status (confirm OAuth 2.0 authorization server is running)
  // -------------------------------
  .then((chain) => {
    chain.testDescription = '20 (remote) GET /status (confirm OAuth 2.0 authorization server is running)';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(config.oauth2.remoteAuthHost + '/status');
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
  // 100 (local) GET /irc/webclient.html (no cookie)
  //
  // The request to load the irc-hybrid-client web page will fail.
  // The browser will be redirected to the /login URL on the local server
  // -------------------------------
  .then((chain) => {
    chain.testDescription = '100 (local) GET /irc/webclient.html (no cookie)';
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
    console.log('\tExpect: Response doe not have a set-cookie header');
    assert.ok(!Object.hasOwn(chain.responseHeaders, 'set-cookie'));
    return Promise.resolve(chain);
  })

  // -------------------------------
  // 101 (local) GET /login (Expect redirect to authorization server)
  //
  // This is the handoff between the irc-hybrid-client web server
  // and the remote authorization server. The web browser will receive
  // a http status 302 redirect to the remote authorization server
  // so the user can enter their username and password.
  // -------------------------------
  .then((chain) => {
    chain.testDescription =
      '101 (local) GET /login (Expect redirect to authorization server)';
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
    // console.log(chain.parsedLocationHeader);

    console.log('\tExpect: status === 302');
    assert.strictEqual(chain.responseStatus, 302);
    console.log('\tExpect: Response includes set-cookie header');
    assert.ok(Object.hasOwn(chain.responseHeaders, 'set-cookie'));
    //
    // Parse Data
    //
    chain.parsedRedirectHost = chain.parsedLocationHeader.split("/dialog")[0];
    chain.parsedRedirectUrl = chain.parsedLocationHeader;
    chain.parsedLocalRedirectUrl = chain.parsedRedirectUrl.replace(chain.parsedRedirectHost, ''); 
    chain.parsedRedirectRoute = chain.parsedLocationHeader.replace(chain.parsedRedirectHost, '').split('?')[0];
    chain.parsedRedirectUri = chain.parsedLocationHeader.split('redirect_uri=')[1];
    chain.parsedResponseType = chain.parsedRedirectUri.split('response_type=')[1].split('&')[0];
    chain.parsedClientId = chain.parsedRedirectUri.split('client_id=')[1].split('&')[0];
    chain.parsedScope = chain.parsedRedirectUri.split('scope=')[1].split('&')[0];
    chain.parsedState = chain.parsedRedirectUri.split('state=')[1];
    // console.log('state: ', chain.parsedState);
    // console.log(chain);

    console.log('\tExpect: parsed redirect hostname matches configuration ("' +
      config.oauth2.remoteAuthHost + '")');
    assert.strictEqual(chain.parsedRedirectHost, config.oauth2.remoteAuthHost);
    console.log('\tExpect: OAuth 2.0 redirect route ("/dialog/authorize")');
    assert.strictEqual(chain.parsedRedirectRoute, '/dialog/authorize');
    console.log('\tExpect: OAuth 2.0 grant type matches authorization code grant ("code")');
    assert.strictEqual(chain.parsedResponseType, 'code');
    console.log('\tExpect: OAuth 2.0 client ID matches configuration ("' +
      config.oauth2.remoteClientId + '")');
    assert.strictEqual(chain.parsedClientId, config.oauth2.remoteClientId);
    return Promise.resolve(chain);
  })

  // ----------------------------------------------------------
  // 200 (Remote) GET /dialog/authorize - Authorization Check #1 (before login)
  //
  // At this stage, the request is made WITHOUT a valid cookie.
  // The authorization server will store full request URL with query parameters
  // into the user's session. A 302 redirect will tell the browser
  // to load the login password entry form. The 302 redirect response
  // will include a cookie to identify the session.
  // ----------------------------------------------------------
  .then((chain) => {
    chain.testDescription =
      '200 (Remote) GET /dialog/authorize - Authorization Check #1 (before login)';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = config.oauth2.remoteAuthHost + chain.parsedLocalRedirectUrl;
    chain.requestAuthorization = 'cookie';
    chain.requestAcceptType = 'text/html';
    // The (remote) authorization server will use a different cookie.
    // The (local) irc-hybrid-client cookie is saved for use in the future
    // when the authorization code is received.
    chain.preAuthLocalSessionCookie = chain.currentSessionCookie;
    chain.preAuthLocalSessionCookieExpires = chain.currentSessionCookieExpires;
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
    // console.log(JSON.stringify(chain.responseRawData, null, 2));
    // check404PossibleVhostError(chain);
    console.log('\tExpect: status === 302');
    assert.strictEqual(chain.responseStatus, 302);
    console.log('\tExpect: parsedLocationHeader === "/login"');
    assert.strictEqual(chain.parsedLocationHeader, '/login');
    console.log('\tExpect: response returned set-cookie');
    assert.ok((chain.parsedSetCookieHeader != null) && (chain.parsedSetCookieHeader.length > 0));
    //
    // Parse Data
    //
    return Promise.resolve(chain);
  })

  // -------------------------------
  // 201 (remote) GET /login (Get login form)
  //
  // This request is expected to return a HTML login form for
  // the user to enter username and password. The form will
  // include an embedded CSRF token that must be submitted
  // with the username, password form submission. If the request
  // included a valid cookie, it will be returned in the response,
  // else a new cookie will be generated.
  // -------------------------------
  .then((chain) => {
    chain.testDescription = '201 (remote) GET /login (Get login form)';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = config.oauth2.remoteAuthHost + '/login';
    chain.requestAuthorization = 'cookie';
    chain.requestAcceptType = 'text/html';
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  //
  // Assertion Tests...
  //
  .then((chain) => {
    logRequest(chain);
    // console.log(JSON.stringify(chain.responseRawData, null, 2));

    console.log('\tExpect: status === 200');
    assert.strictEqual(chain.responseStatus, 200);
    console.log('\tExpect: body contains "<title>collab-auth</title>"');
    assert.ok(chain.responseRawData.indexOf('<title>collab-auth</title>') >= 0);
    console.log('\tExpect: body contains "name="_csrf""');
    assert.ok(chain.responseRawData.indexOf('name="_csrf"') >= 0);
    //
    // Parse Data
    //
    if (chain.responseStatus === 200) {
      chain.parsedCsrfToken =
        chain.responseRawData.split('name="_csrf"')[1].split('value="')[1].split('">')[0];
      return Promise.resolve(chain);
    }
  })

  // -----------------------------------------------
  // 202 (Remote) POST /login (Submit username and password)
  //
  // The submit button in the HTML form is intended
  // to submit the username, password, and CSRF token
  // to the authorization server using x-www-form-urlencoded
  // POST request. If the password is not valid, then a 302
  // redirect will tell the browser to reload a
  // new login form. If credentials are validated,
  // a 302 redirect will send the browser back to the original
  // authorization URL. The cookie will be used to retrieve
  // the original URL with query parameters from the user session.
  // Since the user authentication represents a change in
  // authentication identity, a new cookie and session will be created
  // and the new cookie sent in the 302 redirect response headers.
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription =
      '202 (Remote) POST /login (Submit username and password)';
    chain.requestMethod = 'POST';
    chain.requestFetchURL = config.oauth2.remoteAuthHost + '/login';
    chain.requestAuthorization = 'cookie';
    chain.requestAcceptType = 'text/html';
    chain.requestContentType = 'application/x-www-form-urlencoded';
    chain.requestBody = {
      username: testEnv.remoteAuthUsername,
      password: testEnv.remoteAuthPassword,
      _csrf: chain.parsedCsrfToken
    };
    // The user login represents a change in user authentication status
    // so a new session cookie will be issued. The old cookie is saved
    // to verify that in fact a new cookie was issued.
    chain.authRemoteSessionCookie = chain.currentSessionCookie;
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  //
  // Assertion Tests...
  //
  .then((chain) => {
    logRequest(chain);
    // console.log(JSON.stringify(chain.responseRawData, null, 2));

    console.log('\tExpect: status === 302');
    assert.strictEqual(chain.responseStatus, 302);
    console.log('\tExpect: Response includes set-cookie header');
    assert.ok(((chain.parsedSetCookieHeader != null) &&
      (chain.parsedSetCookieHeader.length > 0)));
    console.log('\tExpect: Session cookie replaced after successful login');
    assert.notEqual(
      chain.authRemoteSessionCookie,
      chain.parsedSetCookieHeader);
    console.log('\tExpect: Redirect URI to match previously saved value');
    // console.log(chain.parsedLocationHeader)
    // console.log(chain.parsedLocalRedirectUrl)
    assert.strictEqual(
      chain.parsedLocalRedirectUrl,
      chain.parsedLocationHeader);
    // Temporary variable no longer needed after confirming cookie did change
    delete chain.authRemoteSessionCookie;
    // The cookie received from the POST request will be designated as a
    // long term user session cookie. The authorization server will maintain this 
    // cookie until it expires or the user does a /logout wit the cookie.
    // The valid long term cookie will be saved for use in future tests.
    chain.loggedInRemoteSessionCookie = chain.currentSessionCookie;
    chain.loggedInRemoteSessionCookieExpires = chain.currentSessionCookieExpires;
    return Promise.resolve(chain);
  })

  // ----------------------------------------------------------
  // 203 (Remote) /dialog/authorize - Authorization Check #2 (after login)
  //
  // In this case, the authorization request is made with a valid cookie.
  // Depending on the configuration of the client account, two different
  // responses are possible. If the client is configured with
  // trustedClient=true, a 302 redirect to the Oauth 2.0 callback URI
  // with an authorization code included in the 302 Location header.
  // This is done by skipping to the next test.
  // Alternately, if the client is configured with trustedClient=false,
  // the authentication request will return a HTML form for the user
  // to 'Accept' or 'Deny' the application to access the specified resource.
  // The form will also include an embedded CSRF token. An OAuth2.0
  // transaction code (random nonce) is also embedded in the form to
  // validate that the response is from the intended user.
  // ----------------------------------------------------------
  .then((chain) => {
    chain.testDescription =
      '203 (Remote) /dialog/authorize - Authorization Check #2 (after login)';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = config.oauth2.remoteAuthHost + chain.parsedLocalRedirectUrl;
    chain.requestAuthorization = 'cookie';
    chain.requestAcceptType = 'text/html';
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  //
  // Assertion Tests...
  //
  .then((chain) => {
    if (testEnv.remoteAuthTrustedClient) {
      return Promise.resolve(chain);
    } else {
      logRequest(chain);
      // console.log(JSON.stringify(chain.responseRawData, null, 2));

      console.log('\tExpect: status === 200');
      assert.strictEqual(chain.responseStatus, 200);
      console.log('\tExpect: body contains "<title>Resource Decision</title>"');
      assert.ok(chain.responseRawData.indexOf('<title>Resource Decision</title>') >= 0);
      console.log('\tExpect: body contains "name="_csrf""');
      assert.ok(chain.responseRawData.indexOf('name="_csrf"') >= 0);
      console.log('\tExpect: body contains "name="transaction_id""');
      assert.ok(chain.responseRawData.indexOf('name="transaction_id"') >= 0);

      //
      // Parse Data
      //
      chain.parsedCsrfToken =
        chain.responseRawData.split('name="_csrf"')[1].split('value="')[1].split('">')[0];
      chain.parsedTransactionId =
        chain.responseRawData.split('name="transaction_id"')[1].split('value="')[1].split('">')[0];
      return Promise.resolve(chain);
    } // untrusted client
  })

  // --------------------------------------------------------
  // 204 (Remote) POST /dialog/authorize/decision (Submit accept/deny)
  //
  // This request will confirm the user's acceptance
  // by submitting the transaction code and CSRF token.
  // The response will be a 302 redirect to the Oauth 2.0 callback URI
  // with an authorization code included in the 302 Location header.
  // --------------------------------------------------------
  .then((chain) => {
    if (testEnv.remoteAuthTrustedClient) {
      return Promise.resolve(chain);
    } else {
      chain.testDescription =
        '204 (Remote) POST /dialog/authorize/decision (Submit accept/deny)';
      chain.requestMethod = 'POST';
      chain.requestFetchURL = config.oauth2.remoteAuthHost + '/dialog/authorize/decision';
      chain.requestAuthorization = 'cookie';
      chain.requestAcceptType = 'text/html';
      chain.requestContentType = 'application/x-www-form-urlencoded';
      chain.requestBody = {
        transaction_id: chain.parsedTransactionId,
        _csrf: chain.parsedCsrfToken
        // Uncomment to emulate cancel button
        // cancel: 'deny'
      };
      delete chain.parsedTransactionId;
      return Promise.resolve(chain);
    } // untrusted client
  })
  .then((chain) => {
    if (testEnv.remoteAuthTrustedClient) {
      return Promise.resolve(chain);
    } else {
      return managedFetch(chain);
    }
  })
  //
  // Assertion Tests...
  //
  .then((chain) => {
    logRequest(chain);
    // console.log(JSON.stringify(chain.responseRawData, null, 2));

    console.log('\tExpect: status === 302');
    assert.strictEqual(chain.responseStatus, 302);
    // console.log('parsedLocationHeader: ', chain.parsedLocationHeader);
    console.log('\tExpect: parsedLocationHeader has authorization code');
    assert.ok(chain.parsedLocationHeader.indexOf('code=') >= 0);
    console.log('\tExpect: parsedLocationHeader header has state nonce');
    assert.ok(chain.parsedLocationHeader.indexOf('state=') >= 0);

    //
    // Parse Data
    //
    chain.parsedAuthCode =
      chain.parsedLocationHeader.split('code=')[1].split('&state')[0];
    chain.parsedStateNonce =
      chain.parsedLocationHeader.split('state=')[1];
    console.log('\tExpect: parsed state nonce match previous');
    assert.deepEqual(chain.parsedStateNonce, chain.parsedState);
    if (testEnv.remoteAuthTrustedClient) {
      console.log('\nTest: 204 (Remote) POST /dialog/authorize/decision (Submit accept/deny)');
      console.log('\tTest aborted, client account configuration trustedClient=true');
    }
    return Promise.resolve(chain);
  })

  // -------------------------------
  // 300 (local) GET /login/callback (submit auth code)
  //
  // This request will use the OAuth 2.0 authorization code grant workflow to 
  // submit an authorization code to the local irc-hybrid-client web server.
  // When the web server receives the request, it will use the web server's
  // client credentials to exchange the authorization code for an access token.
  // The access token is used only one time to confirm the identity
  // of the user for access to the site. The access token is submitted by the 
  // irc-hybrid-client web server to the authorization server.
  // After validating the token, the token's metadata is returned to the
  // irc-hybrid-client web server. The token's scope value is checked
  // to see if the user has sufficient scope to use irc-hybrid-client.
  // After confirming the validity of the access token and scope, a cookie
  // is issued to the web browser granting access to the web site.
  // -------------------------------
  .then((chain) => {
    chain.testDescription = '300 (local) GET /login/callback (submit auth code)';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = chain.parsedLocationHeader;
    chain.requestAcceptType = 'text/html';
    // The previous series of requests were using the authorization server's cookie.
    // The test sequence is not switching back to the irc-hybrid-client web server.
    // The cookie generated during the /login request will be restored here.
    // The /login/callback must be submitted using the same cooke as the /dialog/authorize request
    chain.currentSessionCookie = chain.preAuthLocalSessionCookie;
    chain.currentSessionCookieExpires = chain.preAuthLocalSessionCookieExpires;
    chain.forRetryRequestFetchURL = chain.requestFetchURL;

    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain);
    // console.log(JSON.stringify(chain.responseRawData, null, 2));
    // console.log(chain.parsedLocationHeader);

    console.log('\tExpect: status === 302');
    assert.strictEqual(chain.responseStatus, 302);
    console.log('\tExpect: Redirect URI matches /irc/webclient.html');
    assert.strictEqual(chain.parsedLocationHeader, '/irc/webclient.html');
    console.log('\tExpect: Response includes a set-cookie header');
    assert.ok(Object.hasOwn(chain.responseHeaders, 'set-cookie'));
    console.log('\tExpect: Previous cookie changed to new value after authentication');
    assert.notEqual(chain.preAuthLocalSessionCookie , chain.parsedSetCookieHeader);
    return Promise.resolve(chain);
  })

  // -------------------------------
  // 301 (local) GET /irc/webclient.html (Access to web site granted)
  // -------------------------------
  .then((chain) => {
    chain.testDescription = '301 (local) GET /irc/webclient.html (Access to web site granted)';
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
    // This (local) cookie for the irc-hybrid-client is now confirmed to be valid.
    // It will be designated as a valid long term cookie for use in future tests.
    // The cookie will be stored in the irc-hybrid-client server in the user's session
    // for use in future tests.
    chain.loggedInLocalSessionCookie = chain.currentSessionCookie;
    chain.loggedInLocalSessionCookieExpires = chain.currentSessionCookieExpires;
    return Promise.resolve(chain);
  })


  // -------------------------------------------------------------------------
  // This section will challenge several security failure modes.
  // These are basic tests. It is not a comprehensive security evaluation
  // -------------------------------------------------------------------------


  // -------------------------------
  // 400 (local) GET /login/callback (repeat callback URI, expect fail)
  // -------------------------------
  .then((chain) => {
    chain.testDescription =
      '400 (local) GET /login/callback (repeat callback URI, expect fail)';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = chain.forRetryRequestFetchURL;
    chain.requestAcceptType = 'text/html';
    // In order to repeat the previous http request, it is necessary to
    // restore the same cookie, previously generated by the /dialog/authorize request.
    chain.currentSessionCookie = chain.preAuthLocalSessionCookie;
    chain.currentSessionCookieExpires = chain.preAuthLocalSessionCookieExpires;

    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain, { ignoreErrorStatus: 401 });
    // console.log(JSON.stringify(chain.responseRawData, null, 2));
    // console.log(chain.responseErrorMessage);

    console.log('\tExpect: status === 401');
    assert.strictEqual(chain.responseStatus, 401);
    console.log('\tExpect: Response doe not have a set-cookie header');
    assert.ok(!Object.hasOwn(chain.responseHeaders, 'set-cookie'));
    console.log('\tExpect: error response contains "invalid state parameter"');
    assert.ok(chain.responseErrorMessage.indexOf('invalid state parameter') >= 0);
    return Promise.resolve(chain);
  })

  // -------------------------------
  // 401 (local) GET /login (Get new cookie and new state nonce)
  // -------------------------------
  .then((chain) => {
    chain.testDescription =
      '401 (local) GET /login (Get new cookie and new state nonce)';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/login');
    chain.parsedCsrfToken = null;
    chain.parsedLoginNonce = null;
    // In order to obtain a new (original) state nonce,
    // a new request must be made without a previous cookie.
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
    // console.log(chain.parsedLocationHeader);

    console.log('\tExpect: status === 302');
    assert.strictEqual(chain.responseStatus, 302);
    console.log('\tExpect: Response includes set-cookie header');
    assert.ok(Object.hasOwn(chain.responseHeaders, 'set-cookie'));
    //
    // Parse Data
    //
    chain.parsedRedirectHost = chain.parsedLocationHeader.split("/dialog")[0];
    chain.parsedRedirectUrl = chain.parsedLocationHeader;
    chain.parsedLocalRedirectUrl = chain.parsedRedirectUrl.replace(chain.parsedRedirectHost, ''); 
    chain.parsedRedirectRoute = chain.parsedLocationHeader.replace(chain.parsedRedirectHost, '').split('?')[0];
    chain.parsedRedirectUri = chain.parsedLocationHeader.split('redirect_uri=')[1];
    chain.parsedResponseType = chain.parsedRedirectUri.split('response_type=')[1].split('&')[0];
    chain.parsedClientId = chain.parsedRedirectUri.split('client_id=')[1].split('&')[0];
    chain.parsedScope = chain.parsedRedirectUri.split('scope=')[1].split('&')[0];
    chain.parsedState = chain.parsedRedirectUri.split('state=')[1];

    console.log('\tExpect: parsed redirect hostname matches configuration ("' +
      config.oauth2.remoteAuthHost + '")');
    assert.strictEqual(chain.parsedRedirectHost, config.oauth2.remoteAuthHost);
    console.log('\tExpect: OAuth 2.0 redirect route ("/dialog/authorize")');
    assert.strictEqual(chain.parsedRedirectRoute, '/dialog/authorize');
    console.log('\tExpect: OAuth 2.0 grant type matches authorization code grant ("code")');
    assert.strictEqual(chain.parsedResponseType, 'code');
    console.log('\tExpect: OAuth 2.0 client ID matches configuration ("' +
      config.oauth2.remoteClientId + '")');
    assert.strictEqual(chain.parsedClientId, config.oauth2.remoteClientId);
    return Promise.resolve(chain);
  })

  // -------------------------------
  // 402 (local) GET /login/callback (repeat auth code, new state nonce, expect fail)
  // -------------------------------
  .then((chain) => {
    chain.testDescription =
      '402 (local) GET /login/callback (repeat auth code, new state nonce, expect fail))';
    chain.requestMethod = 'GET';
    chain.requestFetchURL =  config.oauth2.remoteCallbackHost +
      '/login/callback?code=' + chain.parsedAuthCode + '&state=' + chain.parsedState;
    chain.requestAcceptType = 'text/html';
    // In order test the authorization code for expiration, it is necessary to
    // restore the same cookie, previously generated by the /login/authorize request.
    chain.preAuthLocalSessionCookie = chain.currentSessionCookie;
    chain.preAuthLocalSessionCookieExpires = chain.currentSessionCookieExpires;
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain, { ignoreErrorStatus: 403 });
    // console.log(JSON.stringify(chain.responseRawData, null, 2));
    // console.log(chain.responseErrorMessage);

    console.log('\tExpect: status === 403');
    assert.strictEqual(chain.responseStatus, 403);
    console.log('\tExpect: error response contains "invalid_grant"');
    assert.ok(chain.responseErrorMessage.indexOf('invalid_grant') >= 0);
    console.log('\tExpect: error response contains "Invalid authorization code"');
    assert.ok(chain.responseErrorMessage.indexOf('Invalid authorization code') >= 0);
    console.log('\tExpect: Response includes a set-cookie header');
    assert.ok(Object.hasOwn(chain.responseHeaders, 'set-cookie'));
    console.log('\tExpect: Previous cookie changed to new value after authentication');
    assert.notEqual(chain.preAuthLocalSessionCookie , chain.parsedSetCookieHeader);
    return Promise.resolve(chain);
  })

  // -------------------------------
  // 403 (local) GET /login/callback (Input validation, code missing)
  // -------------------------------
  .then((chain) => {
    chain.testDescription =
      '403 (local) GET /login/callback (Input validation, code missing)';
    chain.requestMethod = 'GET';
    chain.requestFetchURL =  config.oauth2.remoteCallbackHost +
      '/login/callback?state=' + chain.parsedState;
    chain.requestAcceptType = 'text/html';

    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain, { ignoreErrorStatus: 400 });
    // console.log(JSON.stringify(chain.responseRawData, null, 2));
    // console.log(chain.responseErrorMessage);

    console.log('\tExpect: status === 400');
    assert.strictEqual(chain.responseStatus, 400);
    console.log('\tExpect: error response contains "code is a required URL query parameter"');
    assert.ok(chain.responseErrorMessage.indexOf('code is a required URL query parameter') >= 0);
    return Promise.resolve(chain);
  })

  // -------------------------------
  // 404 (local) GET /login/callback (Input validation, state missing)
  // -------------------------------
  .then((chain) => {
    chain.testDescription =
      '404 (local) GET /login/callback (Input validation, state missing)';
    chain.requestMethod = 'GET';
    chain.requestFetchURL =  config.oauth2.remoteCallbackHost +
      '/login/callback?code=' + chain.parsedAuthCode;
    chain.requestAcceptType = 'text/html';

    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain, { ignoreErrorStatus: 400 });
    // console.log(JSON.stringify(chain.responseRawData, null, 2));
    // console.log(chain.responseErrorMessage);

    console.log('\tExpect: status === 400');
    assert.strictEqual(chain.responseStatus, 400);
    console.log('\tExpect: error response contains "state is a required URL query parameter"');
    assert.ok(chain.responseErrorMessage.indexOf('state is a required URL query parameter') >= 0);
    return Promise.resolve(chain);
  })

  // -------------------------------
  // 500 (local) GET /irc/webclient.html (original cookie still valid)
  // -------------------------------
  .then((chain) => {
    chain.testDescription = '500 (local) GET /irc/webclient.html (original cookie still valid)';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/webclient.html');
    chain.requestAcceptType = 'text/html';
    // In order to test the /logout route, it is necessary to perform this
    // test from a logged in state. This is done by restoring the cookie
    // from the previous /login/callback request.
    chain.currentSessionCookie = chain.loggedInLocalSessionCookie;
    chain.currentSessionCookieExpires = chain.loggedInLocalSessionCookieExpires;
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
  // 501 (local) GET /logout
  // -------------------------------
  .then((chain) => {
    chain.testDescription = '501 (local) GET /logout';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = testEnv.ircWebURL + '/logout';
    chain.requestAcceptType = 'text/html';
    // keep using same cookie
    chain.currentSessionCookie = chain.loggedInLocalSessionCookie;
    chain.currentSessionCookieExpires = chain.loggedInLocalSessionCookieExpires;
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain);
    // console.log(JSON.stringify(chain.responseRawData, null, 2));

    console.log('\tExpect: status === 200');
    assert.strictEqual(chain.responseStatus, 200);
    
    console.log('\tExpect: body contains "Logout successful');
    assert.ok(chain.responseRawData.indexOf('Logout successful') >= 0)
    return Promise.resolve(chain);
  })

  // -------------------------------
  // 502 (local) GET /irc/webclient.html (no access after logout)
  // -------------------------------
  .then((chain) => {
    chain.testDescription = '502 (local) GET /irc/webclient.html (no access after logout)';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/irc/webclient.html');
    chain.requestAcceptType = 'text/html';
    // keep using same cookie
    chain.currentSessionCookie = chain.loggedInLocalSessionCookie;
    chain.currentSessionCookieExpires = chain.loggedInLocalSessionCookieExpires;
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
    console.log('\tExpect: Response doe not have a set-cookie header');
    assert.ok(!Object.hasOwn(chain.responseHeaders, 'set-cookie'));
    return Promise.resolve(chain);
  })

  // -------------------------------
  // 503 (local) GET /logout (logout without cookie)
  // -------------------------------
  .then((chain) => {
    chain.testDescription = '503 (local) GET /logout (logout without cookie)';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = testEnv.ircWebURL + '/logout';
    chain.requestAcceptType = 'text/html';
    // New request without previous cookies
    delete chain.currentSessionCookie;
    delete chain.currentSessionCookieExpires;
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain);
    // console.log(JSON.stringify(chain.responseRawData, null, 2));

    console.log('\tExpect: status === 200');
    assert.strictEqual(chain.responseStatus, 200);
    
    console.log('\tExpect: body contains "Browser was not logged in');
    assert.ok(chain.responseRawData.indexOf('Browser was not logged in') >= 0)
    return Promise.resolve(chain);
  })

  // -------------------------------------------------------------------------
  // This next section covers the case where the irc-hybrid-client browser
  // does not have a valid cookie (logged out), but upon redirect
  // the browser still has a valid session cookie for the authorization server.
  // In this case, entry of username and password is skipped.
  // -------------------------------------------------------------------------

  // -------------------------------
  // 600 (local) GET /login (Redirect to auth server with cookie)
  // -------------------------------
  .then((chain) => {
    chain.testDescription =
      '600 (local) GET /login (Redirect to auth server with cookie)';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.ircWebURL + '/login');
    chain.parsedCsrfToken = null;
    chain.parsedLoginNonce = null;
    // This assumes the user is not logged into the (local) irc-hybrid-client web server
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
    // console.log(chain.parsedLocationHeader);

    console.log('\tExpect: status === 302');
    assert.strictEqual(chain.responseStatus, 302);
    console.log('\tExpect: Response includes set-cookie header');
    assert.ok(Object.hasOwn(chain.responseHeaders, 'set-cookie'));
    //
    // Parse Data
    //
    chain.parsedRedirectHost = chain.parsedLocationHeader.split("/dialog")[0];
    chain.parsedRedirectUrl = chain.parsedLocationHeader;
    chain.parsedLocalRedirectUrl = chain.parsedRedirectUrl.replace(chain.parsedRedirectHost, ''); 
    chain.parsedRedirectRoute = chain.parsedLocationHeader.replace(chain.parsedRedirectHost, '').split('?')[0];
    chain.parsedRedirectUri = chain.parsedLocationHeader.split('redirect_uri=')[1];
    chain.parsedResponseType = chain.parsedRedirectUri.split('response_type=')[1].split('&')[0];
    chain.parsedClientId = chain.parsedRedirectUri.split('client_id=')[1].split('&')[0];
    chain.parsedScope = chain.parsedRedirectUri.split('scope=')[1].split('&')[0];
    chain.parsedState = chain.parsedRedirectUri.split('state=')[1];
    // console.log('state: ', chain.parsedState);
    // console.log(chain);

    console.log('\tExpect: parsed redirect hostname matches configuration ("' +
      config.oauth2.remoteAuthHost + '")');
    assert.strictEqual(chain.parsedRedirectHost, config.oauth2.remoteAuthHost);
    console.log('\tExpect: OAuth 2.0 redirect route ("/dialog/authorize")');
    assert.strictEqual(chain.parsedRedirectRoute, '/dialog/authorize');
    console.log('\tExpect: OAuth 2.0 grant type matches authorization code grant ("code")');
    assert.strictEqual(chain.parsedResponseType, 'code');
    console.log('\tExpect: OAuth 2.0 client ID matches configuration ("' +
      config.oauth2.remoteClientId + '")');
    assert.strictEqual(chain.parsedClientId, config.oauth2.remoteClientId);
    return Promise.resolve(chain);
  })

  // ----------------------------------------------------------
  // 601 (Remote) /dialog/authorize (Previous auth cookie still valid)
  // ----------------------------------------------------------
  .then((chain) => {
    chain.testDescription =
      '601 (Remote) /dialog/authorize (Previous auth cookie still valid)';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = config.oauth2.remoteAuthHost + chain.parsedLocalRedirectUrl;
    chain.requestAuthorization = 'cookie';
    chain.requestAcceptType = 'text/html';
    // switching from (local) to (remote), exchange the cookies
    chain.preAuthLocalSessionCookie = chain.currentSessionCookie;
    chain.preAuthLocalSessionCookieExpires = chain.currentSessionCookieExpires;
    chain.currentSessionCookie = chain.loggedInRemoteSessionCookie;
    chain.currentSessionCookieExpires = chain.loggedInRemoteSessionCookieExpires;
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  //
  // Assertion Tests...
  //
  .then((chain) => {
    if (testEnv.remoteAuthTrustedClient) {
      return Promise.resolve(chain);
    } else {
      logRequest(chain);
      // console.log(JSON.stringify(chain.responseRawData, null, 2));

      console.log('\tExpect: status === 200');
      assert.strictEqual(chain.responseStatus, 200);
      console.log('\tExpect: body contains "<title>Resource Decision</title>"');
      assert.ok(chain.responseRawData.indexOf('<title>Resource Decision</title>') >= 0);
      console.log('\tExpect: body contains "name="_csrf""');
      assert.ok(chain.responseRawData.indexOf('name="_csrf"') >= 0);
      console.log('\tExpect: body contains "name="transaction_id""');
      assert.ok(chain.responseRawData.indexOf('name="transaction_id"') >= 0);

      //
      // Parse Data
      //
      chain.parsedCsrfToken =
        chain.responseRawData.split('name="_csrf"')[1].split('value="')[1].split('">')[0];
      chain.parsedTransactionId =
        chain.responseRawData.split('name="transaction_id"')[1].split('value="')[1].split('">')[0];
      return Promise.resolve(chain);
    } // untrusted client
  })

  // --------------------------------------------------------
  // 602 (Remote) POST /dialog/authorize/decision (Submit accept/deny)
  // --------------------------------------------------------
  .then((chain) => {
    if (testEnv.remoteAuthTrustedClient) {
      return Promise.resolve(chain);
    } else {
      chain.testDescription =
        '602 (Remote) POST /dialog/authorize/decision (Submit accept/deny)';
      chain.requestMethod = 'POST';
      chain.requestFetchURL = config.oauth2.remoteAuthHost + '/dialog/authorize/decision';
      chain.requestAuthorization = 'cookie';
      chain.requestAcceptType = 'text/html';
      chain.requestContentType = 'application/x-www-form-urlencoded';
      chain.requestBody = {
        transaction_id: chain.parsedTransactionId,
        _csrf: chain.parsedCsrfToken
        // Uncomment to emulate cancel button
        // cancel: 'deny'
      };
      delete chain.parsedTransactionId;
      return Promise.resolve(chain);
    } // untrusted client
  })
  .then((chain) => {
    if (testEnv.remoteAuthTrustedClient) {
      return Promise.resolve(chain);
    } else {
      return managedFetch(chain);
    }
  })
  //
  // Assertion Tests...
  //
  .then((chain) => {
    logRequest(chain);
    // console.log(JSON.stringify(chain.responseRawData, null, 2));

    console.log('\tExpect: status === 302');
    assert.strictEqual(chain.responseStatus, 302);
    // console.log('parsedLocationHeader: ', chain.parsedLocationHeader);
    console.log('\tExpect: parsedLocationHeader has authorization code');
    assert.ok(chain.parsedLocationHeader.indexOf('code=') >= 0);
    console.log('\tExpect: parsedLocationHeader header has state nonce');
    assert.ok(chain.parsedLocationHeader.indexOf('state=') >= 0);

    //
    // Parse Data
    //
    chain.parsedAuthCode =
      chain.parsedLocationHeader.split('code=')[1].split('&state')[0];
    chain.parsedStateNonce =
      chain.parsedLocationHeader.split('state=')[1];
    console.log('\tExpect: parsed state nonce match previous');
    assert.deepEqual(chain.parsedStateNonce, chain.parsedState);
    if (testEnv.remoteAuthTrustedClient) {
      console.log('\nTest: 602 (Remote) POST /dialog/authorize/decision (Submit accept/deny)');
      console.log('\tTest aborted, client account configuration trustedClient=true');
    }
    return Promise.resolve(chain);
  })

  // -------------------------------
  // 603 (local) GET /login/callback (submit auth code)
  // -------------------------------
  .then((chain) => {
    chain.testDescription = '603 (local) GET /login/callback (submit auth code)';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = chain.parsedLocationHeader;
    chain.requestAcceptType = 'text/html';
    // Switching from (remote) back to (local), exchange cookies
    chain.currentSessionCookie = chain.preAuthLocalSessionCookie;
    chain.currentSessionCookieExpires = chain.preAuthLocalSessionCookieExpires;
    chain.forRetryRequestFetchURL = chain.requestFetchURL;

    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    logRequest(chain);
    // console.log(JSON.stringify(chain.responseRawData, null, 2));
    // console.log(chain.parsedLocationHeader);

    console.log('\tExpect: status === 302');
    assert.strictEqual(chain.responseStatus, 302);
    console.log('\tExpect: Redirect URI matches /irc/webclient.html');
    assert.strictEqual(chain.parsedLocationHeader, '/irc/webclient.html');
    console.log('\tExpect: Response includes a set-cookie header');
    assert.ok(Object.hasOwn(chain.responseHeaders, 'set-cookie'));
    console.log('\tExpect: Previous cookie changed to new value after authentication');
    assert.notEqual(chain.preAuthLocalSessionCookie , chain.parsedSetCookieHeader);
    return Promise.resolve(chain);
  })

  // -------------------------------
  // 604 (local) GET /irc/webclient.html (Access to web site granted)
  // -------------------------------
  .then((chain) => {
    chain.testDescription = '604 (local) GET /irc/webclient.html (Access to web site granted)';
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
