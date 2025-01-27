#!/bin/bash

# Used with 'ps' command to check if server is running
PROCMATCH="bin/www.mjs"

# This script requires a directory to hold the PID file.
# The directory may be specified in the PID_DIR environment variable
if [ -z "$PID_DIR" ] ; then
  PID_DIR=~/tmp
fi

# PID filename, used to kill the server process
if [ -z "$PID_FILENAME" ] ; then
  PID_FILENAME=$PID_DIR/ircHybridClient.PID
fi

# Make filename available to nodejs web server as environment variable
export SERVER_PID_FILENAME="$PID_FILENAME"

# Used to log script failure when exit code not 0
LOG_DATE=$(date +%s)
LOG_FILENAME="$PID_DIR/irc-hybrid-client_runner_log_$LOG_DATE.txt"
echo "Script debug/runner.sh error log" > $LOG_FILENAME
echo "Date: $(date --rfc-3339=seconds)" >> $LOG_FILENAME
echo >> $LOG_FILENAME

# Unless debugging, ignore output
NODE_OUTPUT=/dev/null
#NODE_OUTPUT=/dev/stdout

#
# Function to set environment variable default values
#
function set_default_env
  {
    NODE_ENV=development

    SITE_SECURITY_CONTACT=mailto:bob@example.com
    SITE_SECURITY_EXPIRES="Thu, 22 Feb 2024 10:51:49 -0600"

    SESSION_SET_ROLLING_COOKIE=true
    SESSION_SECRET="the session secret"
    SESSION_ENABLE_REDIS=false

    OAUTH2_ENABLE_REMOTE_LOGIN=false

    IRC_DISABLE_LIST_EDITOR=false
    IRC_PERSIST_MESSAGE_CACHE=false
    IRC_SOCKET_LOCAL_ADDRESS=
    IRC_SERVE_HTML_HELP_DOCS=true
    IRC_CUSTOM_BEEP_SOUNDS=false

    IRC_ENABLE_SOCKS5_PROXY=false
  }

function show_default_env
  {
    echo "Config: NODE_ENV=development"

    echo "Config: SITE_SECURITY_CONTACT=mailto:bob@example.com"
    echo 'Config: SITE_SECURITY_EXPIRES="Thu, 22 Feb 2024 10:51:49 -0600"'

    echo "Config: SESSION_SET_ROLLING_COOKIE=true"
    echo 'Config: SESSION_SECRET= (runner value not shown)'
    echo "Config: SESSION_ENABLE_REDIS=false"

    echo "Config: OAUTH2_ENABLE_REMOTE_LOGIN=false"

    echo "Config: IRC_DISABLE_LIST_EDITOR=false"
    echo "Config: IRC_PERSIST_MESSAGE_CACHE=false"
    echo "Config: IRC_SOCKET_LOCAL_ADDRESS="
    echo "Config: IRC_SERVE_HTML_HELP_DOCS=true"
    echo "Config: IRC_CUSTOM_BEEP_SOUNDS=false"

    echo "Config: IRC_ENABLE_SOCKS5_PROXY=false"
  }

#
# Function to stop irc-hybrid-client server to change to alternate configuration
#
function stop_server
  {
    if ps ax | grep -v grep | grep "$PROCMATCH" &> /dev/null ; then
      echo "Server: Attempting to shutdown irc-hybrid-client server, PID $SERVER_PID"
      if kill $SERVER_PID
      then
        echo "Server: PID $SERVER_PID successfully terminated"
      else
        echo "Server: Unable to terminate PID $SERVER_PID"
        exit 1
      fi
    fi
  }

#
# Function to start irc-hybrid-client server to change to alternate configuration
#
function restart_server
  {
    echo "Server: Restarting irc-hybrid-client server, launching to background"
    node bin/www.mjs &> $NODE_OUTPUT &
    sleep 2
    if ! ps ax | grep -v grep | grep "$PROCMATCH" &> /dev/null ; then
      echo "Server: Unable to start irc-hybrid-client server"
      exit 1
    fi
    SERVER_PID=$(cat $PID_FILENAME)
    echo "Server: irc-hybrid-client server detected running, PID=$SERVER_PID"
  }

#
# Check previous function to see if return code shows error
#
function check_for_errors
  {
    RETURN_CODE=$?
    if [ $RETURN_CODE == 0 ] 
    then
      echo "Test: $1" >> $LOG_FILENAME
    else
      echo "Test: $1 (Errors detected)" >> $LOG_FILENAME
      # Show on console
      echo
      echo "=============================="
      echo "Test: $1"
      echo "returned non-zero error code"
      echo "=============================="
    fi
  }

#
#
if [ ! -e debug ] || [ ! -f package.json ]; then
  echo "Script must be run from repository base folder"
  exit 1
fi

if [ ! -e $PID_DIR ] ; then
  echo "This script requires a PID directory ($PID_DIR)"
  echo "The directory may be specified in the PID_DIR env variable"
  echo "   PID_DIR=~/tmp"
  echo
  exit 1
fi

# ---------------------
# Display Server Config
# ---------------------
echo
echo "Executing: node debug/display-config.js"
sleep 1
node ./debug/display-config.js
sleep 5
echo

#
# Case of previous script aborted, leaving server running in background, stop the server
#
if [ -e $PID_FILENAME ] ; then
  KILL_PID=$(cat $PID_FILENAME)
  echo "Server: PID file found, PID=$KILL_PID, checking if server is running."
  if [ -n "$KILL_PID" ] ; then
    if ps ax | grep -v grep | grep "$PROCMATCH" &> /dev/null ; then
      echo "Server: Found server running, attempting to kill PID $KILL_PID"
      if kill $KILL_PID
      then
        echo "Server: PID $KILL_PID successfully terminated"
      else
        echo "Server: Unable to terminate PID $KILL_PID"
        exit 1
      fi
    fi
  else
    echo "Server: confirmed, server not running at start of script, as expected."
  fi
fi
sleep 2
if [ -f $PID_FILENAME ] ; then
  rm -v $PID_FILENAME
fi

#
# Prerequisite - server must not be running
#
if ps ax | grep -v grep | grep "$PROCMATCH" &> /dev/null ; then
  echo "Server: irc-hybrid-client server must be stopped before running script"
  exit 1
fi

#
# Start irc-hybrid-client server running
#
echo
show_default_env
echo
set_default_env
echo "Server: starting irc-hybrid-client server, launching to background"
node bin/www.mjs &> $NODE_OUTPUT &
sleep 2

#
# Check process name 'bin/www.mjs' exists as running process
#
if ! ps ax | grep -v grep | grep "$PROCMATCH" &> /dev/null ; then
  echo "Server: unable to start irc-hybrid-client server"
  exit 1
fi

#
# Check that PID file created, needed to restart server during tests
#
if [ ! -e $PID_FILENAME ] ; then
  echo "Server: irc-hybrid-client PID file not found at $PID_FILENAME"
  exit 1
fi
#
# The PID number is used by functions to restart the server
#
SERVER_PID=$(cat $PID_FILENAME)
echo "Server: irc-hybrid-client server detected running, PID=$SERVER_PID"


# ---------------------
# Test: public-routes.js
# ---------------------
echo
echo "Executing: node public-routes.js"
sleep 5
node ./debug/public-routes.js
check_for_errors 1-public-routes
sleep 5

# ---------------------
# Test: protected-routes.js
# ---------------------
echo
echo "Executing: node protected-routes.js"
sleep 5
node ./debug/protected-routes.js
check_for_errors 2-protected-routes
sleep 5

# ---------------------
# Test: csrf-routes.js
# ---------------------
echo
echo "Executing: node csrf-routes.js"
sleep 5
node ./debug/csrf-routes.js
check_for_errors 3-csrf-routes
sleep 5

# ---------------------
# Test: user-auth-login.js
# ---------------------
echo
echo "Executing: node debug/user-auth-login.js"
sleep 5
node ./debug/user-auth-login.js
check_for_errors 4-user-auth-login
sleep 5

# ---------------------
# Test: websocket-auth.js
# ---------------------
echo
echo "Executing: node debug/websocket-auth.js"
sleep 5
node ./debug/websocket-auth.js
check_for_errors 5-websocket-auth
sleep 5


# ---------------------
# Test: basic-functions.js
# ---------------------
echo
echo "Executing: node debug/basic-functions.js"
sleep 5
node ./debug/basic-functions.js
check_for_errors 6-basic-functions
sleep 5
# The basic function will shutdown server with /terminate route

# -------------------------------------------------
# Restart node server with alternate configuration
# -------------------------------------------------
echo
stop_server
set_default_env
export IRC_DISABLE_LIST_EDITOR=true
export IRC_SERVE_HTML_HELP_DOCS=false
echo "Config: IRC_DISABLE_LIST_EDITOR=true"
echo "Config: IRC_SERVE_HTML_HELP_DOCS=false"
restart_server
sleep 5

# ---------------------
# Test: disabled-routes.js
# ---------------------
echo
echo "Executing: node disabled-routes.js"
sleep 5
node ./debug/disabled-routes.js
check_for_errors 7-disabled-routes
sleep 5

# -------------------------------------------------
# Restart node server with alternate configuration
# -------------------------------------------------
echo
stop_server
set_default_env
export NODE_ENV=production
echo "Config: NODE_ENV=production"

restart_server
sleep 5

# ---------------------
# Test: user-auth-count.js
# ---------------------
echo
echo "Executing: node debug/user-auth-count.js"
sleep 5
node ./debug/user-auth-count.js
check_for_errors 8-user-auth-count
sleep 5

# --------
#   DONE
# --------
echo
echo "All tests completed, stopping server"
stop_server
echo
echo >> $LOG_FILENAME
echo "runner.sh - End of log" >> $LOG_FILENAME
echo
cat $LOG_FILENAME
echo
echo "Script runner.sh completed"
echo
exit 0
