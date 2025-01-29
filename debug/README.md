# irc-hybrid-client Debug Tests

WORK IN PROGRESS

## Description

The /debug/ folder contains various irc-hybrid-client web
server API tests that are written in native javascript using
the Node.js assertion library.

## Scope

Overall, the irc-hybrid-client application involves 3 parts: the web browser, the
web server, and the IRC server. The tests in this debug utility are primarily
intended to test the web server as it listens for incoming HTTP requests
from the internet. The scope of these tests is limited to the web server routes
related to security, authentication and basic function.

- This does not test the web browser code as it relates to being an IRC client..
- This does not test the IRC client interface between the web server and the IRC server.

Manual should be used to test specific functionality as an IRC client,
such as parsing IRC commands for changing an IRC nickname, or sending a message to an IRC channel.

## API Documentation

This docs page contains further instructions related to testing of the API
in combination with the websocket.

[cotarr.github.io/irc-hybrid-client/api.html](https://cotarr.github.io/irc-hybrid-client/api.html)

## setup

The tests are located in a separate repository "irc-hybrid-client-dev-tools"
In order to run the tests both irc-hybrid-client and irc-hybrid-client-dev-tools
repositories must both be installed in the same parent folder.

Example side by side repositories

```txt
drwxr-xr-x 13 user user 4096 Jan 23 14:13 irc-hybrid-client
drwxr-xr-x  5 user user 4096 Jan 23 09:52 irc-hybrid-client-dev-tools
```

A symbolic link is required to run testing JavaScript files from the irc-hybrid-client directory.

- Change directory to the base folder of the irc-hybrid-client repository.
- Create a symbolic link to the debug folder in the irc-hybrid-client-dev-tools repository

```bash
ln -s ../irc-hybrid-client-dev-tools/debug debug
```

- In order to keep the two repositories separate, the "debug" folder filename will be added to the irc-hybrid-client .gitignore.

## Test environment setup

- A private development IRC server is recommended to avoid k-line from tests.
- The irc-hybrid-client was written using the "ngircd" Debian apt repository. (recommend: ngircd)
- The irc-hybrid-client repository should setup and tested using the web browser as follows:
  - Clone the irc-hybrid-client repository
  - Install irc-hybrid-client's npm modules using `npm install`
  - For testing, the irc-hybrid-client configuration must use the ".env file" (Not the "credentials.js" file)
  - Update .env file for the web server's login username and password using the irc-hybrid-client utility found in "tools/genEnvVarAuthForUser_1.mjs"
  - Depending on your test setup, configure any other web server settings, such as port number, in the .env file (see documentation)
  - Start the web server from the irc-hybrid-client directory `npm start`
  - Using a web browser, login to the web server and confirm username and password are working correctly
  - Create at least one definition for an IRC server to be used for testing (see documentation).
  - Using the web browser, connect to the IRC network and confirm the testing instance of the irc-hybrid-client web server has basic IRC functionality working correctly.
- Configure mandatory testing variables in the ".env" file in the irc-hybrid-client directory
  - Configure the irc-hybrid-client for local authentication: `OAUTH2_ENABLE_REMOTE_LOGIN=false`
  - Configure a testing URL in the .env file, example: `TESTENV_WEB_URL=http://localhost:3003`
  - Configure a testing web login username in the .env file, example: `TESTENV_WEB_USERNAME=user1`
  - Configure a testing web login password in the .env file, example: `TESTENV_WEB_PASSWORD=mysecret`
- Review and update optional test configuration variables as necessary.
  - By default the first server is used in testing (index = 0), override with `TESTENV_IRC_SERVERINDEX=0`

## Required (.env) Environment Variables

The irc-hybrid-client .env file must include credentials for the testing instance of the irc-hybrid-client web server including the web server URL, web login username and web login password. You should substitute values that were configured for your web server.


```bash
OAUTH2_ENABLE_REMOTE_LOGIN=false
TESTENV_WEB_URL=http://localhost:3003
TESTENV_WEB_USERNAME=user1
TESTENV_WEB_PASSWORD=mysecret
```

## Environment (.env) Configuration Variables

The following environment variables may be used to supply data values used in the tests. Changing these values will not impact the actual server configuration. Rather, it is intended to allow adhoc substitution of expected test result values. In order to allow adhoc testing without having to change the configuration files each time, adhoc values may be prepended on the command line.

```bash
TESTENV_WEB_URL=http://localhost:3003
TESTENV_WEB_USERNAME=user1
TESTENV_WEB_PASSWORD=mysecret
TESTENV_IRC_SERVERINDEX=0
TESTENV_IRC_REGISTERDELAY=5
TESTENV_IRC_NICKNAME=debug-nick
TESTENV_IRC_REALNAME=test
TESTENV_IRC_CONNECTMODE="+i"
TESTENV_IRC_CHANNEL="#test"
```

## Command line examples

The tests should be run from the base folder of the "irc-hybrid-client" repository
using the symlink to the debug folder.

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
./debug/runner.sh
```

## Description of test files

### public-routes.js

This script will confirm that routes intended to be public are
accessible when the browser does not provide a valid cookie.

Required Configuration:

```bash
SITE_SECURITY_CONTACT=security@example.com
SITE_SECURITY_EXPIRES="Fri, 1 Apr 2022 08:00:00 -0600"
```

### protected-routes.js

This script will confirm that protected routes are not available
without a valid login cookie

### csrf-routes.js

This script will check routes that require valid CSRF tokens

### user-auth-login.js

This script will emulate the browser submission of
the HTML form data for user password entry

### websocket-auth.js

This is a testing utility used specifically to test irc-hybrid-client application
use of a RFC-4655 websocket connection including authentication.

### response.headers.js

Check HTTP security headers provided by Helmet middleware

### basic-functions.js

This script will execute an IRC network connect.

Warning: These test will connect to an actual IRC server.
To avoid getting k-lined on a major IRC network, these
tests should be run on a dedicated development IRC server.

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

### disabled-routes.js

The /docs/ folder and the server list editor are capable of
being disabled in the configuration.

### user-auth-count.js

This script will emulate the browser submission multiple bad
password attempts, challenging the counter.
With NODE_ENV=production maximum allowed tries is 5

Run with environment variables: `NODE_ENV=production`
Restart node server before test to reset counter

## (Optional) remote authentication

The irc-hybrid-client may be configured to use optional
remote authentication. The /remote/ folder contains
separate tests that may be used with optional remote authentication.
See debug/remote/README.md for instructions.

## Test runner.sh bash script

The folder includes a bash script that will run all the test modules in sequence.
The script will pause for 5 seconds between each test to provide an opportunity
to review data and/or to abort the tests using ctrl-C.

For various different test configurations, the script will stop the irc-hybrid-client
server, issue new environment variables, then restart the server.
For this to work properly, a folder is needed to store the server process PID.
The default is `~/tmp` in the user's home directory.
The PID folder must exist. An alternate PID folder may be specified
as an environment variables, such as `PID_DIR=/home/user/somewhere`

The runner.sh script will create log files in the PID_DIR folder (~/tmp by default).

Do not start the web server. The runner.sh script will start the web server automatically.
Start the script from the repository base folder using:

```bash
./debug/runner.sh
```

## Command line arguments

Execution of the debug test scripts will basically list
a passing result for each test. Setting these environment
variables from the command line will show additional
information during test execution.

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
SHOWRES=3 SHOWCOOKIE=1 SHOWSTACK=1 node debug/access-token-client.js
```

## Structure of JavaScript test files

Each test file contains a series of tests that are run sequentially.
The results of each test are available for use in subsequent tests.
Since the network fetch operations are run asynchronously,
the network requests are embedded in a chain of promises, where
various promises resolve after the network request has been
completed and the response values parsed. The following pseudo code
shows the approach to a chain of tests.

```js

// ...
  .then((chain) => {
    // Set various fetch related variables
    chain.requestMethod = 'GET';
    chain.requestFetchURL = '/some/route/

    // Set any relevant testing variables
    chain.someVariables = someValue;

    // Resolved promise passes chain object to managedFetch function
    return Promise.resolve(chain)

  // The debug/modules/managed-fetch.js module is called.
  .then((chain) => managedFetch(chain))

  .then((chain) => {
    // Evaluate the results of the fetch operation
    if (chain.someValue === 'expected result') {
      doSomething()
    }

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

The legacy postman collections can be found in the "postman/" folder in commit 
ca1bec034ca2500251bd67387d94c650b3620db1 from 2023-07-17.

The legacy ThunderClient collections (vscode extension) can be found in then
"thunderclient/" folder in commit 866fb05e88af042d72bcc9156263538d8ba86b70
from 2024-12-10.