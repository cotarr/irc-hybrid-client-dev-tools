// display-config.js
//
// This file is intended to inclusion in the test running.
// It will print relevant configuration file contents related to the testing.
//
// -----------------------------------------------------------
'use strict';

const fs = require('node:fs');

if (!fs.existsSync('./package.json')) {
  console.log('Must be run from repository base folder as: node debug/display-config.js');
  process.exit(1);
}

const testEnv = require('./modules/import-config.js').testEnv;
const {
  config
  // servers  
} = require('./modules/import-config.js');

console.log('\n--------------------');
console.log('Server configuration');
console.log('--------------------\n');

console.log('server.tls: ' + config.server.tls);
console.log('server.port: ' + config.server.port);
console.log('server.instanceNumber: ' + config.server.instanceNumber);
console.log('session.rollingCookie: ' + config.session.rollingCookie);
console.log('session.ttl: ' + config.session.ttl + ' seconds');
console.log('session.enableRedis: ' + config.session.enableRedis);
console.log('oauth2.enableRemoteLogin: ' + config.oauth2.enableRemoteLogin);
if (config.oauth2.enableRemoteLogin) {
  console.log('oauth2.remoteAuthHost ' + config.oauth2.remoteAuthHost);
  console.log('oauth2.remoteCallbackHost ' + config.oauth2.remoteCallbackHost);
  console.log('oauth2.remoteClientId: ' + config.oauth2.remoteClientId);
  console.log('oauth2.remoteScope ' + config.oauth2.remoteScope);
}

console.log('\n--------------------');
console.log('Test Environment');
console.log('--------------------\n');

const filteredTestEnv = Object.assign({}, testEnv);
// Passwords and secrets removed from log.
filteredTestEnv.localPassword = '(redacted)';
filteredTestEnv.remoteAuthPassword = '(redacted)';

console.log('testEnv ' + JSON.stringify(filteredTestEnv, null, 2));

console.log('---------------------');
console.log(' Display Config Done');
console.log('---------------------');
