// import-config.js
//
// The testing utility programs in the /debug/ folder will
// extract test values directly from the irc-hybrid-client server configuration.
//
// The local servers.json will be parsed to obtain values for comparisons during testing.
//
'use strict';

const fs = require('fs');

// Note: loading config will import the .env file into
// the process.env object for use in configuration
const config = require('../../../irc-hybrid-client/server/config/index.mjs');
// console.log('config', JSON.stringify(config, null, 2));

let servers = [];
try {
  servers = JSON.parse(fs.readFileSync('./servers.json', 'utf8'));
} catch (e) {
  console.log(e.message);
  process.exit(1);
}
// console.log('servers', JSON.stringify(servers, null, 2));


if (servers.length < 1) {
  console.log('Error, no servers defined in servers.json');
  process.exit(1);
}

// The following environment variables may be used to
// override the configuration settings for the purpose
// of performing ad-hoc testing without having to
// modify config files for each iteration
//
const testEnv = {};

testEnv.ircWebURL = 'http://localhost:' + config.server.port.toString();
if (process.env.TESTENV_IRCWEBURL) {
  testEnv.ircWebURL = process.env.TESTENV_IRCWEBURL;
}

testEnv.localUsername = 'user1';
  if (process.env.TESTENV_USERNAME) {
    testEnv.username = process.env.TESTENV_USERNAME;
  }

testEnv.localPassword = 'mysecret';
if (process.env.TESTENV_PASSWORD) {
  testEnv.password = process.env.TESTENV_PASSWORD;
}

testEnv.ircServerIndex = 0;
if (process.env.TESTENV_IRC_SERVERINDEX) {
  testEnv.ircServerIndex = process.env.TESTENV_IRC_SERVERINDEX;
}
testEnv.ircNickname = 'debug-nick';
if (process.env.TESTENV_IRC_NICKNAME) {
  testEnv.ircNickname = process.env.TESTENV_IRC_NICKNAME;
}
testEnv.ircRealname = 'test';
if (process.env.TESTENV_IRC_REALNAME) {
  testEnv.ircRealname = process.env.TESTENV_IRC_REALNAME;
}
testEnv.ircConnectMode = '+i';
if (process.env.TESTENV_IRC_CONNECTMODE) {
  testEnv.ircConnectMode = process.env.TESTENV_IRC_CONNECTMODE;
}
testEnv.ircChannel = '#test';
if (process.env.TESTENV_IRC_CHANNEL) {
  testEnv.ircChannel = process.env.TESTENV_IRC_CHANNEL;
}
// console.log('testEnv', JSON.stringify(testEnv, null, 2));

module.exports = { config, servers, testEnv };
