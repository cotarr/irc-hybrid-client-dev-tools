# irc-hybrid-client Debug Test Scripts

## Description

The /debug/ folder contains various irc-hybrid-client web
server API tests that are written in native javascript using
the Node.js assertion library.

## Scope

Overall, the irc-hybrid-client application involves 3 parts: the web browser, the
web server, and the IRC server. The tests in this utility are primarily
intended to test the web server as it listens for incoming HTTP requests
from the internet. The scope of these tests is limited to the web server routes
related to security, authentication and basic function.

- This does not test the web browser code as it relates to being an IRC client..
- This does not test the IRC client interface between the web server and the IRC server.

Additional manual debugging should be used to test overall functionality as an IRC client,
such as parsing IRC commands for changing an IRC nickname, or sending a message to an IRC channel.

## API Documentation

This docs page contains further instructions related to the API

[cotarr.github.io/irc-hybrid-client/api.html](https://cotarr.github.io/irc-hybrid-client/api.html)

## Installation of test environment

A private development IRC server is recommended to avoid k-line from tests.
The irc-hybrid-client was written using the "ngircd" Debian apt repository.

The test scripts are located in a separate repository "irc-hybrid-client-dev-tools"
In order to run the tests both irc-hybrid-client and irc-hybrid-client-dev-tools
repositories must both be installed in the same parent folder.

A symbolic link is required to run testing JavaScript files from the irc-hybrid-client directory.

Example of side by side repositories:

```txt
drwxr-xr-x 13 user user 4096 Jan 23 14:13 irc-hybrid-client
drwxr-xr-x  5 user user 4096 Jan 23 09:52 irc-hybrid-client-dev-tools
```

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

The following variables must NOT be defined in the .env file during testing.
The test runner (debug/runner.sh) will restart the irc-hybrid-client
server several times with different values for these variables.
The .env file will over-rise these ad-hoc environment variables and cause the
tests to fail.

```bash
# Not allowed in .env during testing.
NODE_ENV=
SESSION_SET_ROLLING_COOKIE=
SESSION_EXPIRE_SEC=
OAUTH2_ENABLE_REMOTE_LOGIN=
IRC_DISABLE_LIST_EDITOR=
IRC_SERVE_HTML_HELP_DOCS=
```

Update .env file for the web server's login username and password using the
irc-hybrid-client utility found in "tools/genEnvVarAuthForUser_1.mjs".
The .env file should look similar to this:
  
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

The following test variables added to the .env to specify IRC network related test data.

```bash
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
remote authentication. The debug/remote/ folder contains
separate tests that may be used with optional remote authentication.
See debug/remote/README.md for instructions.

## Test runner.sh bash script

The `debug/runner.sh` bash script will run all the test modules in sequence.
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
SHOWRES=3 SHOWCOOKIE=1 SHOWSTACK=1 node debug/public-routes.js
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

The legacy ThunderClient collections (vscode extension) can be found in then "thunderclient/" folder in commit 866fb05e88af042d72bcc9156263538d8ba86b70 from 2024-12-10.