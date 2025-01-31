# Bruno API Tests for irc-hybrid-client

## Description

The /bruno/ folder contains various tests to exercise the general functionality
of the IRC client backend API for the irc-hybrid-client web server.

To run these tests it is necessary to install the BRUNO API testing client
available from [www.usebruno.com/](https://www.usebruno.com/).

## Scope

Overall, the irc-hybrid-client application involves 3 parts: the web browser, the
web server, and the IRC server. The tests in this utility are primarily
intended to test the web server as it listens for incoming HTTP requests
from the internet. The test set represents a general overview of API functinality.

- This does not test the web browser code as it relates to being an IRC client..
- This does not test the IRC client interface between the web server and the IRC server.

Additional manual debugging should be used to test overall functionality as an IRC client,
such as parsing IRC commands for changing an IRC nickname, or sending a message to an IRC channel.

## API Documentation

This docs page contains further instructions related to testing of the irc-hybrid-client API.

[cotarr.github.io/irc-hybrid-client/api.html](https://cotarr.github.io/irc-hybrid-client/api.html)

## Warning

Running the tests can cause the web server to initiate IRC
connections and issue IRC commands WITHOUT display of the IRC server responses.
This is because IRC server responses are returned asynchronously
in the websocket stream which is not visible in Bruno.
It is recommended to use a dedicated development IRC server.

## Installation of test environment

A private development IRC server is recommended to avoid k-line from tests.
The irc-hybrid-client was written using the "ngircd" Debian apt repository.

The Bruno test scripts are located in a separate repository "irc-hybrid-client-dev-tools"
In order to run the tests both irc-hybrid-client and irc-hybrid-client-dev-tools
repositories must both be installed in the same parent folder.

Example of side by side repositories:

```txt
drwxr-xr-x 13 user user 4096 Jan 23 14:13 irc-hybrid-client
drwxr-xr-x  5 user user 4096 Jan 23 09:52 irc-hybrid-client-dev-tools
```

Example commands to install both repositories:

```bash
# Clone GitHub repositories.
git clone https://github.com/cotarr/irc-hybrid-client.git
git clone https://github.com/cotarr/irc-hybrid-client-dev-tools.git
cd irc-hybrid-client
# install dependencies
npm install
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
- Create at least one definition for a development IRC server to be used for testing 
(see [documentation](https://cotarr.github.io/irc-hybrid-client/login-config.html)).
- Using the web browser, connect to the IRC network and confirm the testing instance of the irc-hybrid-client web server are working as expected.
- Close the web browser

## Bruno Test Collection Setup

In Debian, Bruno is installed as a Debian APT package from the Bruno web site following
the instructions at [www.usebruno.com/](https://www.usebruno.com/).
For other distributions of Linux follow the instruction on the Bruno web site.

The default settings should be sufficient for these tests.

In Bruno, a test collection is loaded from a git repository by select the disk folder
that contains the collection. For irc-hybrid-client, the Bruno collection is saved in a
separate repository irc-hybrid-client-dev-tools.

- Open Bruno
- Select `Open collection`, it will expect a disk folder name.
- Navigate to the irc-hybrid-client-dev-tools repository
- Select the "irc-hybrid-client" folder in the "irc-hybrid-client-dev-tools/bruno/" folder.

## Bruno .env Environment Variables

When Bruno starts, it will look for an ".env" file in the collection folder.
There are two ways to do this. A dedicated .env file may be put into
the collection folder as "irc-hybrid-client/bruno/irc-hybrid-client/.env".
The second way is to create a symbolic link to the .env file in the irc-hybrid-client repository.

Use caution to avoid committing the symlink of the .env file to a git repository by adjusting the .gitignore if needed.

The advantage of using a symbolic link as the Bruno tests can use the same test configuration as the debug test scripts in the /debug/ folder of the dev tools repository.

- Change directory to: "irc-hybrid-client/bruno/irc-hybrid-client/" folder.
- Execute a 'ln' command using the full path of the .env file in the irc-hybrid-client repository as follows but using the proper folder locations for your system.

Example:

```bash
# Go to Bruno's collection folder
cd /home/user/some-folder/irc-hybrid-client-dev-tools/bruno/irc-hybrid-client/
# Create a linkn to the irc-hybrid-client .env file.
ln -s /home/user/some-folder/irc-hybrid-client/.env  .env
```

Environment variables that begin with "TESTENV_" are used to configure the testing script. They are located in the .env file.

The .env file must include setting for the testing instance of the irc-hybrid-client web server including the web server URL, web login username and web login password. You should substitute values that were configured for your web server.


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

## Bruno Collections

- Each request includes 'docs' tab with a detailed test description.

### Folder: 100-misc-server

| Request Name              | Description                       |
| ------------------------- | --------------------------------- |
| 110-server-status         | Confirm web server is running     |
| 120-secure-route          | Confirm user's cookie is valid    |
| 130-robots-txt            | View robot exclusion policy       |
| 140-security-txt          | View security contact             |
| 197-web-logout            | User logout (deactivate cookie)   |
| 198-force-disconnect      | Force disconnect from IRC network |
| 199-die-server            | Shut down the web server          |

### Folder: 200-web-login

| Request Name              | Description                       |
| ------------------------- | --------------------------------- |
| 210-login-form            | Web login (1 of 3 steps)          |
| 220-submit-password       | Web login (2 of 3 steps)          |
| 230-get-csrf-token        | Web login (3 of 3 steps)          |

### Folder: 300-irc-commands

| Request Name              | Description                       |
| ------------------------- | --------------------------------- |
| 310-set-index-number      | Set IRC definition index number   |
| 311-irc-getIrcState       | Verify not connected to IRC       |
| 320-irc-connect           | Connect to the IRC network        |
| 321-irc-getIrcState       | Verify connected to IRC           |
| 330-irc-join-channel      | Join an IRC channel               |
| 331-irc-getIrcState       | Confirm presence in channel       |
| 340-irc-message           | Send text message to IRC channel  |
| 350-irc-cache             | Retrieve IRC message buffer       |
| 360-irc-part-channel      | Leave from an IRC channel         |
| 361-irc-getIrcState       | Confirm depated from IRC channel  |
| 370-irc-prune-channel     | Remove channel object from memory |
| 371-irc-getIrcState       | Confirm removal                   |
| 380-irc-erase-cache       | Erase the IRC message cache       |
| 390-irc-quit              | Command /QUIT for IRC disconnect  |
| 391-irc-getIrcState       | Verify disconnected               |

### Folder: 400-server-list

| Request Name              | Description                       |
| ------------------------- | --------------------------------- |
| 410-get-all-serv          | Download full IRC server list     |
| 420-unlock-and-get-idx-0  | Download one IRC server           |
| 430-create-new-serv       | Create new IRC server definition  |
| 440-lock-and-get-new-serv | Lock database before edit         |
| 450-modify-new-serv       | Edit one IRC server definition    |
| 460-unlock-new-serv       | Unlock database before delete     |
| 470-delete-new-serv       | Delete one server definition      |

## Legacy postman collections

The legacy postman collections can be found in the "postman/" folder in commit
ca1bec034ca2500251bd67387d94c650b3620db1 from 2023-07-17.

The legacy ThunderClient collections (vscode extension) can be found in then "thunderclient/" folder in commit 866fb05e88af042d72bcc9156263538d8ba86b70 from 2024-12-10.

