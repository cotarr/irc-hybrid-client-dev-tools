# irc-hybrid-client Debug Test Scripts

## Description

The debug test script feature is a collection of various irc-hybrid-client web server API tests that are written in native javascript using the Node.js assertion library.

The primary purpose of the debug test scripts is to check the operation of the irc-hybrid-client web server following installation of NPM dependency package updates. Often these dependency module upgrades include major version revisions that may contain breaking changes. Following installation of updates, these provide a quick check that noting within the web server has been broken by the updates.

## Scope

Overall, the irc-hybrid-client application involves 3 parts: the web browser, the web server, and the IRC server. The tests in this utility are primarily intended to test the web server as it listens for incoming HTTP requests from the internet. The scope of these tests is limited to the web server routes related to security, authentication and basic function.

- This does not test the web browser code as it relates to being an IRC client..
- This does not test the IRC client interface between the web server and the IRC server.

Additional manual debugging should be used to test overall functionality as an IRC client, such as parsing IRC commands for changing an IRC nickname, or sending a message to an IRC channel.

## API Documentation

This docs page contains further instructions related to the API

[cotarr.github.io/irc-hybrid-client/api.html](https://cotarr.github.io/irc-hybrid-client/api.html)

## Installation of test environment

A private development IRC server is recommended to avoid k-line from tests. The irc-hybrid-client was written using the "ngircd" Debian apt repository.

The test scripts are located in a separate repository "irc-hybrid-client-dev-tools" In order to run the tests both irc-hybrid-client and irc-hybrid-client-dev-tools repositories must both be installed in the same parent folder.

Example of side by side repositories:

```txt
drwxr-xr-x 13 user user 4096 Jan 23 14:13 irc-hybrid-client
drwxr-xr-x  5 user user 4096 Jan 23 09:52 irc-hybrid-client-dev-tools
```

Since the debug scripts are in an alternate folder location, a symbolic link inside the irc-hybrid-client repository is needed to make the remote /debug/ folder visible inside the irc-hybrid-client repository folder.

Example commands to install both repositories and create symlink:

```bash
# Clone GitHub repositories.
git clone https://github.com/cotarr/irc-hybrid-client.git
git clone https://github.com/cotarr/irc-hybrid-client-dev-tools.git

cd irc-hybrid-client

# install dependencies
npm install

# Create symbolic link from irc-hybrid-client repository to the testing folder
ln -s ../irc-hybrid-client-dev-tools/debug debug
```

## Configure irc-hybrid-client .env file for testing

A private development IRC server is recommended to avoid k-line from tests. The irc-hybrid-client was written using the "ngircd" Debian apt repository. If possible, an isolated virtual machine is preferred where the VM contains both the test instance of the IRC server and the irc-hybric-client web server.

Install the irc-hybrid-client web server in accordance with the Installation Instructions in the irc-hybrid-client /docs/ folder.

Configure irc-hybrid-client .env file for testing

- For testing, the irc-hybrid-client configuration must use the ".env file" (Not the legacy "credentials.js" file)
- In the base folder of the irc-hybrid-client repository, create a new .env file.
- Configure generic web server settings such as port number in the .env file using the "example-.env" as a template.

Example minimum configuration for testing.

```bash
ENV_VAR_CONFIG_VERSION=2
SERVER_TLS_KEY=/home/user/.tls/key.pem
SERVER_TLS_CERT=/home/user/.tls/cert.pem
SERVER_TLS=false
SERVER_PORT=3003
SERVER_PID_FILENAME=/home/user/tmp/ircHybridClient.PID
SERVER_INSTANCE_NUMBER=0
SESSION_SECRET="---cookie-secret-goes-here--"
```

The following variables must NOT be defined in the .env file during testing. The test runner (debug/runner.sh) will restart the irc-hybrid-client server several times with different values for these variables. The .env file will over-write these ad-hoc environment variables and cause the tests to fail.

```bash
# Not allowed in .env during testing.
NODE_ENV=
SESSION_SET_ROLLING_COOKIE=
SESSION_EXPIRE_SEC=
OAUTH2_ENABLE_REMOTE_LOGIN=
IRC_DISABLE_LIST_EDITOR=
IRC_SERVE_HTML_HELP_DOCS=
```

If necessary, update .env file for the web server's login username and password using the irc-hybrid-client utility found in "tools/genEnvVarAuthForUser_1.mjs". The .env file should look similar to this:
  
```bash
LOGIN_USER_USERID=1
LOGIN_USER_USER=user1
LOGIN_USER_NAME="Bob Smith"
LOGIN_USER_HASH="---BCRYPT-HASH-GOES-HERE---"
```

- Start the web server from the irc-hybrid-client directory `npm start`
- Using a web browser, login to the web server at route "/irc/webclient.html" and confirm username and password are working correctly.
- Create at least one definition for a development IRC server to be used for testing (see documentation).
- Using the web browser, connect to the IRC network and confirm the testing instance of the irc-hybrid-client web server are working as expected.
- Close the web browser

## Test script (.env) Environment Variables

Environment variables that begin with "TESTENV_" are used to configure the testing script. They are located in the same .env file as the irc-hybrid-client configuration.

The irc-hybrid-client .env file must include setting for the testing instance of the irc-hybrid-client web server including the web server URL, web login username and web login password. You should substitute values that were configured for your web server.

```bash
TESTENV_WEB_URL=http://localhost:3003
TESTENV_WEB_USERNAME=user1
TESTENV_WEB_PASSWORD=mysecret
```

By default the test script will use the first IRC server definition. If you prefer to use one of the other IRC server definitions, set the TESTENV_IRC_SERVERINDEX to an integer starting with zero.

```bash
TESTENV_IRC_SERVERINDEX=0
```

Various IRC related data values are required for use in testing. These must be specified using environment variables. Add the following definitions the the .env file, but substitute different data values as needed for your specific test environment.

```bash
TESTENV_IRC_REGISTERDELAY=5
TESTENV_IRC_NICKNAME=debug-nick
TESTENV_IRC_REALNAME=test
TESTENV_IRC_CONNECTMODE="+i"
TESTENV_IRC_CHANNEL="#test"
```

## Sample output from a Debug Test Script

Enter the following command in the terminal:

```bash
node ./debug/public-routes.js
```

The debug/public-routes.js script will confirm some un-protected public routes that do not require a user's login session cookie.

```txt
Test: 100 GET /status (server is running)
  200 GET http://localhost:3003/status
  Expect: status === 200
  Expect: status: "ok"

Test: 101 GET /.well-known/security.txt
  200 GET http://localhost:3003/.well-known/security.txt
  Expect: status === 200
  Expect: response include security contact email

Test: 102 GET /robots.txt
  200 GET http://localhost:3003/robots.txt
  Expect: status === 200
  Expect: response include "Disallow: /"

Test: 103 GET /favicon.ico
  204 GET http://localhost:3003/favicon.ico
  Expect: status === 204

Test: 300 GET /not-found.html (Error handler)
  404 GET http://localhost:3003/not-found.html
  Expect: status === 404
  Expect: Error response includes "Not Found"
---------------------
  All Tests Passed
---------------------
```

## Command line examples

The tests should be run from the base folder of the "irc-hybrid-client" repository using the symlink to the debug folder.

Example CLI commands:

```bash
node debug/public-routes.js
node debug/protected-routes.js
node debug/csrf-routes.js
node debug/user-auth-login.js
node debug/websocket-auth.js
node debug/response-headers.js
node debug/basic-functions.js
node debug/cookie-tests.js
node debug/disabled-routes.js
node debug/user-auth-count.js
node debug/serverlist-edit.js
```

## Description of test files

### public-routes.js

This script will confirm that routes intended to be public are accessible when the browser does not provide a valid cookie.

Required Configuration:

```bash
SITE_SECURITY_CONTACT=security@example.com
SITE_SECURITY_EXPIRES="Fri, 1 Apr 2022 08:00:00 -0600"
```

```txt
Test: 100 GET /status (server is running)
Test: 101 GET /.well-known/security.txt
Test: 102 GET /robots.txt
Test: 103 GET /favicon.ico
Test: 300 GET /not-found.html (Error handler)
```

### protected-routes.js

This script will confirm that protected routes are not available without a valid login cookie

```txt
Test: 10 GET /status (server is running)
Test: 50 GET /login - Get new nonce and CSRF token
Test: 51 POST /login-authorize - Get valid cookie (used in writing tests)
Test: 52 GET /irc/webclient.html (get CSRF)
Test: 100 GET /secure (no cookie)
Test: 101 GET /userinfo (no cookie)
Test: 102 POST /irc/server (no cookie)
Test: 103 POST /irc/connect (no cookie)
Test: 104 POST /irc/message (no cookie)
Test: 105 GET /irc/getircstate (no cookie)
Test: 106 POST /irc/prune (no cookie)
Test: 107 GET /irc/cache (no cookie)
Test: 108 POST /irc/erase (no cookie)
Test: 109 POST /irc/disconnect (no cookie)
Test: 110 POST /terminate (no cookie)
Test: 200 GET /irc/serverlist (no cookie)
Test: 201 POST /irc/serverlist (no cookie)
Test: 202 PATCH /irc/serverlist?index=x (no cookie)
Test: 203 COPY /irc/serverlist (no cookie)
Test: 204 DELETE /irc/serverlist (no cookie)
Test: 300 GET /irc/webclient.html (custom route, no cookie)
Test: 301 GET /irc/css/styles.css (from web root, no cookie)
Test: 302 GET /irc/js/webclient.js (from web root, no cookie)
Test: 303 GET /irc/sounds/short-beep1.mp3 (from web root, no redirect)
Test: 400 GET /irc/docs/ (from /docs/ root, no redirect)
Test: 401 GET /irc/docs/installation.html (from /docs/ root, no redirect)
```

### csrf-routes.js

This script will check routes that require valid CSRF tokens

```txt
Test: 10 GET /status (server is running)
Test: 50 GET /login - Get new nonce and CSRF token
Test: 51 POST /login-authorize - Get valid cookie (used in writing tests)
Test: 52 GET /irc/webclient.html (get CSRF)
Test: 100 POST /irc/server (No CSRF token)
Test: 101 POST /irc/connect (No CSRF token)
Test: 102 POST /irc/message (No CSRF token)
Test: 103 POST /irc/prune (No CSRF token)
Test: 104 POST /irc/erase (No CSRF token)
Test: 105 POST /irc/disconnect (No CSRF token)
Test: 106 POST /terminate (No CSRF token)
Test: 201 POST /irc/serverlist (No CSRF token)
Test: 202 PATCH /irc/serverlist?index=x (No CSRF token)
Test: 203 COPY /irc/serverlist?index=x (No CSRF token)
Test: 204 DELETE /irc/serverlist?index=x (No CSRF token)
```

### user-auth-login.js

This script will emulate the browser submission of the HTML form data for user password entry

```txt
Test: 100 GET /status (server is running)
Test: 101 GET /irc/webclient.html (no cookie)
Test: 102 GET /login - Login form with csrf token and nonce
Test: 103 POST /login-authorize - Expect successful result
Test: 104 GET /irc/webclient.html (with valid cookie)
Test: 105 GET /logout
Test: 106 GET /irc/webclient.html (previous cookie after logout)
Test: 200 GET /login - Get new nonce and CSRF token
Test: 201 POST /login-authorize - Success 1 of 2 in a row
Test: 202 POST /login-authorize - Re-post same (double POST, expect fail)
Test: 300 GET /login - Get new nonce and CSRF token
Test: 301 POST /login-authorize - Missing nonce
Test: 302 GET /login - Get new nonce and CSRF token
Test: 303 POST /login-authorize - Invalid nonce
Test: 304 GET /login - Get new nonce and CSRF token
Test: 305 POST /login-authorize - Missing CSRF token
Test: 306 GET /login - Get new nonce and CSRF token
Test: 307 POST /login-authorize - Invalid CSRF token
Test: 400 GET /login - Get new nonce and CSRF token
Test: 401 POST /login-authorize - Missing user
Test: 402 GET /login - Get new nonce and CSRF token
Test: 403 POST /login-authorize - Invalid user
Test: 404 GET /login - Get new nonce and CSRF token
Test: 405 POST /login-authorize - Missing password
Test: 406 GET /login - Get new nonce and CSRF token
Test: 407 POST /login-authorize - Invalid password
Test: 500 GET /login - Get new nonce and CSRF token
Test: 501 POST /login-authorize - oversize user
Test: 502 GET /login - Get new nonce and CSRF token
Test: 503 POST /login-authorize - oversize password
Test: 504 GET /login - Get new nonce and CSRF token
Test: 505 POST /login-authorize - oversize nonce
Test: 600 GET /login - Get new nonce and CSRF token
Test: 601 PATCH /login-authorize - wrong method PATCH
Test: 602 GET /login - Get new nonce and CSRF token
Test: 603 PUT /login-authorize - wrong method PUT
Test: 700 GET /login.css
Test: 701 GET /logout
Test: 702 GET /blocked
Test: 703 GET /disabled
Test: 800 GET /login - Get new nonce and CSRF token
Test: 801 POST /login-authorize - Get valid cookie
Test: 802 GET /irc/webclient.html (final test is success)
```

### websocket-auth.js

This is a testing utility used specifically to test irc-hybrid-client application use of a RFC-4655 websocket connection including authentication.

```txt
Test: 10 GET /status (server is running)
Test: 50 GET /login - Get new nonce and CSRF token
Test: 51 POST /login-authorize - Get valid cookie (used in writing tests)
Test: 52 GET /irc/webclient.html (get CSRF Token)
Test: 100 POST /irc/wsauth (enable timer, no CSRF token)
Test: 101 UPGRADE /irc/wsauth (websocket upgrade, timer not active)
Test: 102 POST /irc/wsauth (enable timer, no cookie)
Test: 103 UPGRADE /irc/wsauth (websocket upgrade, timer not active)
Test: 110 POST /irc/wsauth (Enable server websocket timer)
Test: 111 UPGRADE /irc/wsauth (websocket upgrade, wait for timer to expire)
Test: 112 POST /irc/wsauth (Enable server websocket timer)
Test: 113 UPGRADE /irc/wsauth (websocket upgrade, without cookie)
Test: 114 POST /irc/wsauth (Enable server websocket timer)
Test: 115 UPGRADE /irc/wsauth (websocket upgrade, expect HEARTBEAT messages)
```

### response.headers.js

Check HTTP security headers provided by Helmet middleware

```txt
Test: 10 GET /status (server is running)
Test: 50 GET /login - Get new nonce and CSRF token
Test: 51 POST /login-authorize - Get valid cookie (used in writing tests)
Test: 100 GET /irc/webclient.html (validate HTTP response headers)
```

### basic-functions.js

This script will execute an IRC network connect.

Warning: These test will connect to an actual IRC server. To avoid getting k-lined on a major IRC network, these tests should be run on a dedicated development IRC server.

```txt
Test: 10 GET /status (server is running)
Test: 50 GET /login - Get new nonce and CSRF token
Test: 51 POST /login-authorize - Get valid cookie (used in writing tests)
Test: 52 GET /irc/webclient.html (get CSRF token)
Test: 100 GET /secure (confirm authorized)
Test: 101 GET /userinfo (web login user matches)
Test: 102 POST /irc/server (server index set for test)
Test: 103 POST /irc/connect (connect to IRC at specified index)
Test: 105 GET /irc/getircstate
Test: 500 POST /irc/disconnect
Test: 501 GET /irc/getircstate (wait for disconnect)
Test: 502 POST /terminate (shutdown server)
```

### cookie-tests.js

The irc-hybrid-client web server uses session cookies to
authorize access to the website. The sessions and cookies
are created by the express-session middleware.
The script includes two options for cookies with fixed
expiration cookies and rolling cookies, where rolling
cookies will extend the cookie expiration with each request.

```bash
  # Recommended test configuration
  SESSION_EXPIRE_SEC=8

  # Option 1 of 2
  SESSION_SET_ROLLING_COOKIE=false
  # Option 1 of 2
  SESSION_SET_ROLLING_COOKIE=true
```

```txt
Test: 10 GET /status (server is running)
Test: 40 GET /irc/webclient.html - Unauthenticated request to protected route.
Test: 50 GET /login - Get new nonce and CSRF token
Test: 51 POST /login-authorize - Get valid cookie
Test: 52 GET /irc/webclient.html (Confirm access to protected route)
Test: 100 GET /secure - Confirm access prior to logout
Test: 101 GET /logout - Call to remove session from session store
Test: 102 GET /secure - Confirm old cookie not accepted
Test: 200 GET /login - Get new nonce and CSRF token
Test: 201 POST /login-authorize - Get valid cookie
Test: 202 GET /irc/webclient.html (Confirm access to protected route with cookie)
Test: 203 GET /irc/webclient.html - Send raw cookie SID without signature
Test: 204 GET /irc/webclient.html - Submit ad-hoc cookie with different cookie name
Test: 205 GET /irc/webclient.html - Submit ad-hoc cookie signed with wrong secret
Test: 206 GET /irc/webclient.html - Submit ad-hoc cookie, random SID with valid signature
Test: 207 GET /irc/webclient.html - Submit original cookie, confirm original cookie still accepted
Test: 300 GET /login - Get new nonce and CSRF token
Test: 301 POST /login-authorize - Get valid cookie
Test: 302 GET /secure - Elapsed time 3 seconds, check if expired
Test: 303 GET /secure - Elapsed time 3 + 3 = 6 seconds, check if expired
Test: 304 GET /secure - Elapsed time 3 + 3 + 4 = 10 seconds, check if expired
Test: 105 GET /secure - Elapsed time 3 + 3 + 4 + 10 = 20 seconds, check if expired
Test: 106 GET /secure - Elapsed time 3 + 3 + 4 + 10 + 4 = 24 seconds, Done
```

### disabled-routes.js

The /docs/ folder and the server list editor are capable of being disabled in the configuration.

```txt
Test: 10 GET /status (server is running)
Test: 50 GET /login - Get new nonce and CSRF token
Test: 51 POST /login-authorize - Get valid cookie (used in writing tests)
Test: 52 GET /irc/webclient.html (get CSRF)
Test: 200 GET /irc/serverlist (no cookie)
Test: 201 POST /irc/serverlist (disabled route)
Test: 202 PATCH /irc/serverlist?index=x (disabled route)
Test: 203 COPY /irc/serverlist (disabled route)
Test: 204 DELETE /irc/serverlist (disabled route)
Test: 400 GET /irc/docs/ (directory /docs/ disabled)
Test: 401 GET /irc/docs/installation.html (directory /docs/ disabled)
```

### user-auth-count.js

This script will emulate the browser submission multiple bad
password attempts, challenging the counter.
With NODE_ENV=production maximum allowed tries is 5

Run with environment variables: `NODE_ENV=production` Restart node server before test to reset counter

```txt
Test: 100 GET /status (server is running)
Test: 110 GET /login - Get a new csrf token and nonce
Test: 111 POST /login-authorize - Failed login 1 of 5
Test: 120 GET /login - Get a new csrf token and nonce
Test: 121 POST /login-authorize - Failed login 2 of 5
Test: 130 GET /login - Get a new csrf token and nonce
Test: 131 POST /login-authorize - Failed login 3 of 5
Test: 140 GET /login - Get a new csrf token and nonce
Test: 141 POST /login-authorize - Failed login 4 of 5
Test: 150 GET /login - Get a new csrf token and nonce
Test: 151 POST /login-authorize - Failed login 5 of 5
Test: 160 GET /login - Get a new csrf token and nonce
Test: 161 POST /login-authorize - Failed login 6 (expect count exceeded)
Test: 200 GET /login - Get a new csrf token and nonce
Test: 201 POST /login-authorize - Try valid login while expired
Test: 202 GET /irc/webclient.html (confirm no access)
```

### serverlist-edit.js

This script will test the API calls used to edit the list of IRC servers.

```txt
Test: 10 GET /status (server is running)
Test: 50 GET /login - Get new nonce and CSRF token
Test: 51 POST /login-authorize - Get valid cookie (used in writing tests)
Test: 52 GET /irc/webclient.html (get CSRF token)
Test: 100 GET /irc/getircstate (Not connected to IRC)
Test: 101 POST /irc/server (server index set to zero)
Test: 102 GET /irc/serverlist (Retrieve full sever list)
Test: 103 GET /irc/serverlist (Retrieve a server, clear edit lock)
Test: 104 GET /irc/serverlist (Set edit lock),
Test: 105 POST /irc/serverlist (Conflict, create new while locked, expect 409)
Test: 106 GET /irc/serverlist (Conflict, attempt lock while locked, expect 409)
Test: 107 GET /irc/serverlist (Clear edit lock)
Test: 108 PATCH /irc/serverlist (Conflict, modify while locked, expect 409)
Test: 109 POST /irc/serverlist (Create new IRC server definition)
Test: 110 GET /irc/serverlist (Check new server values, lock database)
Test: 111 PATCH /irc/serverlist (Modify with invalid locked index value, expect 409)
Test: 112 GET /irc/serverlist (Conflict, attempt lock while locked)
Test: 113 PATCH /irc/serverlist (Modify definition of created server)
Test: 114 GET /irc/serverlist (Check modified values, keep locked)
Test: 115 DELETE /irc/serverliar (Delete while locked, expect 409)
Test: 116 GET /irc/serverlist (Remove database lock)
Test: 117 DELETE /irc/serverlist (Delete the created server definition)
Test: 200 GET /irc/serverlist (Set edit lock at index 0),
Test: 201 COPY /irc/serverlist (Copy server, expect unlocked, fail 409)
Test: 202 GET /irc/serverlist (Remove database lock)
Test: 203 COPY /irc/serverlist (Copy server from Index 0 to 1)
Test: 204 POST /irc/serverlist (Move up from Index 1 to 0)
Test: 205 POST /irc/serverlist/tools (Toggle Disabled)
Test: 206 GET /irc/serverlist (Get server, confirm is disabled)
Test: 207 DELETE /irc/serverlist (Delete the copied server definition)
Test: 208 GET /irc/serverlist (Confirm original record at index 0) 
Test: 300 POST /irc/serverlist (Input validation error: host)
Test: 301 POST /irc/serverlist (Input validation error: port number)
Test: 302 POST /irc/serverlist (Input validation error: missing name)
Test: 303 POST /irc/serverlist (Input validation error: missing nick)
Test: 304 POST /irc/serverlist (Input validation error: missing user)
Test: 400 POST /irc/server (set server index for connect to IRC)
Test: 401 POST /irc/connect (connect to IRC before testing serverlist edit)
Test: 402 GET /irc/getircstate (Confirm connected to IRC)
Test: 403 POST /irc/serverlist (Attempt create new while connected to IRC)
Test: 404 GET /irc/serverlist (Attempt lock while connected to IRC)
Test: 405 PATCH /irc/serverlist (Attempt modify while connected to IRC)
Test: 406 DELETE /irc/serverlist (Attempt delete while connected to IRC)
Test: 407 COPY /irc/serverlist (Attempt copy while connected to IRC)
Test: 408 GET /irc/serverlist (Retrieve full list is allowed while connected IRC)
Test: 409 POST /irc/disconnect (Done server list tests, disconnect from IRC)
```

## (Optional) remote authentication

The irc-hybrid-client may be configured to use optional remote authentication. The debug/remote/ folder contains separate tests that may be used with optional remote authentication. See debug/remote/README.md for instructions.

## Test runner.sh bash script

The `debug/runner.sh` bash script will run all the test modules in sequence. The script will pause for 5 seconds between each test to provide an opportunity to review data and/or to abort the tests using ctrl-C.

For various different test configurations, the script will stop the irc-hybrid-client server, issue new environment variables, then restart the server. For this to work properly, a folder is needed to store the server process PID. The default is `~/tmp` in the user's home directory. The PID folder must exist. An alternate PID folder may be specified as an environment variables, such as `PID_DIR=/home/user/somewhere`

The runner.sh script will create log files in the PID_DIR folder (~/tmp by default).

Do not start the web server. The runner.sh script will start the web server automatically. Start the script from the repository base folder using:

```bash
./debug/runner.sh
```

## Command line arguments

Execution of the debug test scripts will basically list a passing result for each test. Setting these environment variables from the command line will show additional information during test execution.

| Environment     | Description                                |
| --------------- | ------------------------------------------ |
| SHOWRES=1       | Print raw response body for each request   |
| SHOWRES=2       | Print response headers for each request    |
| SHOWRES=3       | Print both body and headers each request   |
| SHOWCOOKIE=1    | Print request, response cookie             |
| SHOWWEBSOCKET=1 | Print websocket connect state changes      |

### For debugging writing of new tests

| Environment  | Description                                |
| ------------ | ------------------------------------------ |
| SHOWCHAIN=1  | Print chain object at end of tests (debug) |
| SHOWCHAIN=2  | Print chain object after each test (debug) |
| SHOWSTACK=1  | Error handler print stack                  |

Command line example:

```bash
SHOWRES=3 SHOWCOOKIE=1 SHOWSTACK=1 node debug/public-routes.js
```

## Structure of JavaScript test files

Each test file contains a series of tests that are run sequentially. The results of each test are available for use in subsequent tests. Since the network fetch operations are run asynchronously, the network requests are embedded in a chain of promises, where various promises resolve after the network request has been completed and the response values parsed. The following pseudo code shows the approach to a chain of tests.

```js
  // ...
  //
  // Part 1 of 3, configuration
  //
  .then((chain) => {
    // Set various fetch related variables
    chain.requestMethod = 'GET';
    chain.requestFetchURL = '/some/route/
    chain.requestAcceptType = 'text/html';

    // Set any relevant testing variables
    chain.someVariables = someValue;

    // Resolved promise passes chain object to managedFetch function
    return Promise.resolve(chain)

  //
  // Part 2 of 3, Perform HTTP fetch request
  //
  .then((chain) => managedFetch(chain))

  //
  // Part 3 of 3, Evaluate HTTP response data
  //
  .then((chain) => {
    logRequest(chain);

    // Assertion testing
    console.log('\tExpect: status === 302');
    assert.strictEqual(chain.responseStatus, 302);

    // Parse data for future requests
    chain.parsedCsrfToken =
      chain.responseRawData.split('name="_csrf"')[1].split('value="')[1].split('">')[0];

    // Continue to the next test
    return Promise.resolve(chain)
  })
  // ...
```

## Legacy tests collections

The legacy postman collections can be found in the "postman/" folder in commit ca1bec034ca2500251bd67387d94c650b3620db1 from 2023-07-17.

The legacy ThunderClient collections (vscode extension) can be found in then "thunderclient/" folder in commit 4521f164eb84767447eaa5566b8ca6209f53b966 for version v2.0.23 from 2025-01-22
