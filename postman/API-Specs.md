# irc-hybrid-client API Specification.

API specification for [irc-hybrid-client](https://github.com/cotarr/irc-hybrid-client)

Generally, the browser communication is split. Messages from the web server to browser
are passed over the websocket as RFC 2812 IRC server messages.
Messages from browser to web server are passed over web API using POST and GET requests.
More specifically, IRC server messages (such as PRIVMSG) are passed over
the /irc/message route as UTF-8 strings as a POST web API request.

```
              <-- Websocket <--
 [Browser]  {                   } [NodeJs Backend] <--> [ IRC Server]
              --> Web API   -->
```

The web browser client operates on IRC messages received from the backend
NodeJs web server. These are RFC 2812 standard IRC messages.
Some non-standard (outside RFC 2812) messages are passed over the websocket
as described below.

In most cases, the API requests return a web response showing
only the asynchronous request was accepted. Successful API requests return an error flag
in the body of the API response as a JSON object.

General state errors, such as "IRC Server not connected" are returned
within API response body with status 200 and description of the error as a JSON object.

Data validation or parsing errors are returned as status 400 Bad Request.

Errors occurring over IRC network are returned within the websocket stream
prefixed with "webError: ".

Example API Responses:

```
# API Response for successful request
{
  "error": false
}

# API response for miscellaneous state error
{
  "error": true,
  "message": "IRC server not connected"
}
```

Example Websocket Messages:

```
# Error due to IRC function returned asychronously over websocket stream:
"webError: IRC server timeout while connecting\n"

# General info messages over the websocket appear as follows:
"webServer: Opening socket to test-server 192.168.1.127:6667\n"

```

# ----- API Routes -----

## POST /irc/server

The backend NodeJs web server maintains a list of available IRC servers.
This list is loaded from a configuration file and is not editable from the browser.
Calls to /irc/server are used to select a specific server.
A value of -1 is used to rotate to the next server in the configuration.

When the web server configuration is updated to the desired server,
an "UPDATE" command is sent to the browser over the websocket stream.
Upon receipt of the UPDATE request, the browser should perform a GET request /irc/getircstate
and update the user interface from information returned in the state object.
(see getircstate below)

Request Body:
```
{
  "index": -1
}
```

Success Response:
```
{
    "error": true
}
```
Error Response:
```
{
    "error": true,
    "message": "Can not change servers while connected or connecting"
}
```

## POST /irc/connect

Calls to this API are used to request the backend NodeJs web server
to initiate an IRC server client connection.

The nickName and realName are required properties of type UTF-8 string.

The IRC user name (identd alternate user) is not editable from the browser and
therefore excluded from this schema.

The initial userMode property is optional.

Connection to an IRC server involves several steps, such as opening a TCP socket,
sending commands to set nickname, and other IRC formation. As the connection is
established, the irc state object located in the web server is updated.
Each time the state changes, an "UPDATE" command is sent to the browser
over the web socket stream.
Upon receipt of the UPDATE request, the browser should perform a GET request /irc/getircstate
and update the user interface from information returned in the state object.
(see getircstate below)

Request Body:
```
{
  "nickName": "myNickName",
  "realName": "John Doe",
  "userMode": ""
}
```

Success Response:
```
{
    "error": true
}
```

Error Response:
```
{
    "error": true,
    "message": "Error: already connected to IRC server."
}
```

## POST /irc/message

Calls to this API are used to send RFC 2812 IRC messages from web browser
to the NodeJs backend server for re-transmission to the IRC server.

Assuming the IRC command is accepted by the IRC server, the IRC response is
sent to the browser via the websocket stream as a standard RFC 2812 IRC message.
This messages are UTF-8 text and delimited by return and end-of-line
characters 0x10 and 0x13 ("\r\n"). See RFC 2812 for specification of these messages.

Issuing some commands to the IRC server may result in a state change of the IRC client.
One example would be a command to JOIN an IRC channel.
Some commands, such as PRIVMSG may not cause a state change.
Each time the state changes, an "UPDATE" command is sent to the browser
over the web socket stream.
Upon receipt of the UPDATE request, the browser should perform a GET request /irc/getircstate
and update the user interface from information returned in the state object.
(see getircstate below)

Request Example:
```
{
  "message": "PRIVMSG #mychannel :Hello World"
}
```

Success Response:
```
{
    "error": true
}
```

Error Response:
```
{
    "error": true,
    "message": "Error parsing PRIVMSG message before send to IRC server."
}
```

Websocket Respose (stream)
```
@time=2021-06-18T20:09:38.944Z :myNickName!*@* PRIVMSG #test :hello, how are you
```

Example Request causing IRC error
```
{
  "message": "TIME invalid.server.name"
}
```

Websocket Error Response (stream)
```
@time=2021-06-18T20:05:26.538Z :irc.server.com 402 myNickName invalid.server.name :No such server
```

## GET /irc/getircstate

The actual IRC client is located within the NodeJs backend web server.
Calls to /irc/getircstate will retrieve a JSON object containing
all relevant state information for the IRC server connection and IRC channel membership.

The web browser should listen for websocket stream message containing a string matching "UPDATE".
When an UPDATE is received as a single line message delimited by 0x10,0x13, (...\r\nUPDATE\r\n...)
the browser javascript should fetch a GET request to the /irc/getircstate route.
The browser should then parse the state object for change and update the user interface as needed.

API response: IRC state object
```
{
    "ircConnectOn": true,
    "ircConnecting": false,
    "ircConnected": true,
    "ircRegistered": true,
    "ircIsAway": false,
    "ircAutoReconnect": true,
    "ircServerName": "freenode",
    "ircServerHost": "chat.freenode.net",
    "ircServerPort": 7000,
    "ircTLSEnabled": true,
    "ircServerIndex": 3,
    "ircServerPrefix": "tildes.freenode.net",
    "channelList": [],
    "nickName": "myNickName",
    "userName": "myNickName",
    "realName": "myNickName",
    "userMode": "+i",
    "userHost": "~someuser@somewhere.att.net",
    "channels": [],
    "channelStates": [],
    "progVersion": "0.1.7",
    "progName": "irc-hybrid-client",
    "times": {
        "programRun": "1624047717",
        "ircConnect": "1624047739"
    },
    "count": {
        "ircConnect": 1,
        "ircConnectError": 0
    },
    "websocketCount": 1
}
```

## POST /irc/prune

This is used to remove a non-joined IRC channel from the active channel list.
Trying to prune a channel while present in the channel will cause an error.
The body should contain the channel name as in this example:

```
{
  "channel": "#test"
}
```

## GET /irc/cache

The web server maintains a cache of the last 100 IRC server
messages (lines of text) in RFC 2812 format.
Performing a GET request to /irc/cache will return a response containing
and array of up to 100 strings. Each array string element represents
a previous cached IRC server message.

When using this IRC client on an iPhone, there are issues where the websocket
is disconnected when the screen lock is enabled. Using this API, the smartphone
browser can clear all previous channel messages, private messages and server messages.
After clearing everything, the strings in the cache array can be parsed one by one
as if they had just arrived from the IRC server. This will restore the
user interface to show messages that may have arrived while the websocket was disconnected.

The size of the cache at 100 messages is intended to ride out a screen lock.
it is not meant to be an offline client. Over time messages will cycle out of the
cache after 100 messages are received.

Example API response:
```
[
  "@time=2021-06-18T21:13:06.949Z :myNickName!*@* PRIVMSG #test :Hello, how are you doing",
  "@time=2021-06-18T21:14:16.949Z :otherName!*@* PRIVMSG #test :I am doing fine, how are you",
  "@time=2021-06-18T21:15:26.949Z :myNickName!*@* PRIVMSG #test :I am fine also, I have to run",
  "@time=2021-06-18T21:16:03.949Z :otherName!*@* PRIVMSG #test :OK, bye for now"
]
```

## POST /irc/erase

This API is used to delete the contents of the message cache.
The web server client must be disconnected from IRC to clear the cache.
A confirmation flag is required in the POST body.

Request Body
```
{
  "erase": "YES"
}

```


## POST /irc/disconnect

This is an emergency function used to forcibly close the socket to the IRC server.
In routine operation the QUIT irc command should be sent to the server as a normal
IRC command. The body of the request should contain an empty JSON object "{}".

## POST /terminate

This is essentially sending a hard "die" function to forcibly shutdown the NodeJs web server.
The request body should include a confirmation property as follows.

```
{
  "terminate": "YES"
}
```
