# (Optional) API Tests for irc-hybrid-client - Remote Login

The purpose of the debug/remote/remote-auth.js test script in this folder is to exercise the optional remote login workflow using the [collab-auth](https://github.com/cotarr/collab-auth) authorization server as an OAuth 2.0 remote login server for irc-hybrid-client program.

It is not intended comprehensive test for security vulnerabilities. These instructions use temporary passwords that are not intended for use in a server that is visible on the internet.

## Remote Authorization Script

The remote-auth.sh script is located in a separate "debug/remote/" folder of the git repository, along with this README.md file.

## irc-hybrid-client .env configuration

This assumes the irc-hybrid-client ad been previously configured for the basic API tests in the debug/ folder, and these tests have passed.

This configuration change substitutes a different user password authentication service.

For the cookies to work properly, the domain name of the irc web server and the authorization server must be different. One uses "127.0.0.1" the other "localhost".

Add this configuration to the .env file:

```bash
OAUTH2_ENABLE_REMOTE_LOGIN=true
OAUTH2_REMOTE_AUTH_HOST=http://127.0.0.1:3500
OAUTH2_REMOTE_CALLBACK_HOST=http://localhost:3003
OAUTH2_REMOTE_CLIENT_ID=irc_client_1
OAUTH2_REMOTE_CLIENT_SECRET="ssh-secret"
OAUTH2_REMOTE_SCOPE=irc.all

TESTENV_RUNNER_REMOTE_AUTH=enabled
TESTENV_REMOTE_TRUSTED_CLIENT=false
TESTENV_REMOTE_AUTH_USERNAME=bob
TESTENV_REMOTE_AUTH_PASSWORD=bobssecret
```

The variable OAUTH2_ENABLE_REMOTE_LOGIN is a special case. When using the stand alone debug/remote/remote-auth.sh script, the "OAUTH2_ENABLE_REMOTE_LOGIN" variable should be set to "true' in the .env file as shown above.

However, when using the test runner script located at debug/runner.sh, the "OAUTH2_ENABLE_REMOTE_LOGIN" should be disabled with "#" comment character in the .env file. An additional variable "TESTENV_RUNNER_REMOTE_AUTH=enabled" should be added to enable remote testing in the runner script as follows:

```bash
# OAUTH2_ENABLE_REMOTE_LOGIN=true
TESTENV_RUNNER_REMOTE_AUTH=enabled
```

## collab-auth configuration

Install a copy of the collab-auth server in a protected development environment that does not have access to the internet, such as a virtual machine or behind a NAT router.

Follow the instructions in the documentation for collab-auth to configure collab-auth in demonstration mode. After it is up and running,
make the following changes:

* Locate the users-db.json file.
* Locate the user with username "bob"
* Add the role `irc.all` as shown below (note comma after user.admin)
* Save the file.

users-db.json

```json
  {
    "id": "05d3649f-2bdc-4e0e-aaf7-848dd1516ca0",
    "number": 1,
    "username": "bob",
    "password": "bobssecret",
    "name": "Bob Smith",
    "loginDisabled": false,
    "role": [
      "auth.token",
      "api.write",
      "user.admin",
      "irc.all"
    ],
    "lastLogin": null,
    "createdAt": "2021-08-22T18:38:29.250Z",
    "updatedAt": "2021-08-22T18:38:29.250Z"
  }
```

* Locate the client-db.json file
* Add a comma after the curly brace in the last client definition `},`
* Copy/paste the following temporary client definition into client-db-json.
* Save the file

client-db.json

```json
  {
    "id": "73cf2ee6-308e-4be5-ac1f-37ba73e214cd",
    "name": "irc-hybrid-client 1",
    "clientId": "irc_client_1",
    "clientSecret": "ssh-secret",
    "trustedClient": false,
    "allowedScope": [
      "auth.token",
      "irc.all"
    ],
    "allowedRedirectURI": [
      "http://localhost:3003/login/callback"
    ],
    "createdAt": "2021-08-22T18:38:29.250Z",
    "updatedAt": "2021-08-22T18:38:29.250Z"
  }
```

Open a separate terminal window for collab-auth. Start collab-auth using `npm start`

Open a separate terminal window for irc-hybrid-client. Start irc-hybrid-client using `npm start`

The servers may be stopped in each terminal window by using Ctrl-C.

## Request Descriptions

The authorization server client account provides credentials for the web server to interact directly with the authorization server, independent of any user's permissions. For the case where a client account is configured with `trustedClient": false`, the authorization server will present the user with a access decision form. The browser will submit a POST request for the user to "Accept" or "Deny" the permission to access the resource. This will redirect the browser back to the web server with an authorization code. In the case of `trustedClient: true`, the decision form is skipped, and the server will redirect browser immediately back to the web server with an authorization code.

The login process involves two different browser cookies, one for the IRC client web server and the other for the authorization server login/password form. During normal login with no valid cookies, first the browser obtains a cookie from the web server, then after redirect to the authorization server, a second cookie is obtained. It is possible to be logged out (no cookie) of the IRC client web server, but still have an unexpired cookie for the authorization server. In this case, password entry is not required, and the authorization code grant workflow will return immediately with an authorization code. For the case where the web server is logged out (invalid cookie), but the user still has a valid cookie to the authorization server, user password entry will be skipped.

| Folder Name                         | Trusted | Auth Cookie |
| ----------------------------------- | ------- | ----------- |
| Untrusted Client Login              | False   |             |
| Untrusted Client (with auth cookie) | False   | Valid       |
| Trusted Client Login                | True    |             |
| Trusted Client (with auth cookie)   | True    | Valid       |

Note: Only one case of Trusted Client can be configured at one time. in order to test both cases, the authorization server client account must be changed between trusted and untrusted client, and the authorization server restarted. The irc-hybrid-client .env file must be changed to match.

## Log of remote-auth.sh requests

```txt
Test: 10 (local) GET /status (confirm irc-hybrid-client web server is running)
Test: 20 (remote) GET /status (confirm OAuth 2.0 authorization server is running)
Test: 100 (local) GET /irc/webclient.html (no cookie)
Test: 101 (local) GET /login (Expect redirect to authorization server)
Test: 200 (Remote) GET /dialog/authorize - Authorization Check #1 (before login)
Test: 201 (remote) GET /login (Get login form)
Test: 202 (Remote) POST /login (Submit username and password)
Test: 203 (Remote) /dialog/authorize - Authorization Check #2 (after login)
Test: 204 (Remote) POST /dialog/authorize/decision (Submit accept/deny)
Test: 300 (local) GET /login/callback (submit auth code)
Test: 301 (local) GET /irc/webclient.html (Access to web site granted)
Test: 400 (local) GET /login/callback (repeat callback URI, expect fail)
Test: 401 (local) GET /login (Get new cookie and new state nonce)
Test: 402 (local) GET /login/callback (repeat auth code, new state nonce, expect fail))
Test: 403 (local) GET /login/callback (Input validation, code missing)
Test: 404 (local) GET /login/callback (Input validation, state missing)
Test: 500 (local) GET /irc/webclient.html (original cookie still valid)
Test: 501 (local) GET /logout
Test: 502 (local) GET /irc/webclient.html (no access after logout)
Test: 503 (local) GET /logout (logout without cookie)
Test: 600 (local) GET /login (Redirect to auth server with cookie)
Test: 601 (Remote) /dialog/authorize (Previous auth cookie still valid)
Test: 602 (Remote) POST /dialog/authorize/decision (Submit accept/deny)
Test: 603 (local) GET /login/callback (submit auth code)
Test: 604 (local) GET /irc/webclient.html (Access to web site granted)
```
