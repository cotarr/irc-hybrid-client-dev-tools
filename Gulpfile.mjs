//
// Gulpfile for irc-hybrid-client V2 and later
//
'use strict';

import { src, dest, watch, series } from 'gulp';
import cleancss from 'gulp-clean-css';
import concat from 'gulp-concat';
import { deleteAsync } from 'del';
import htmlmin from 'gulp-html-minifier-terser';
import insert from 'gulp-insert';
import order from 'gulp-order3';
import rename from 'gulp-rename';
import replace from 'gulp-replace';
import uglify from 'gulp-uglify-es';

import fs from 'fs';

// To disable length limit, set maxLineLength = false
const maxLineLength = 200;

// 1 = single quote
// 3 = always use original style quotes
const jsQuoteStyle = 3;

const htmlMinifyOptions = {
  minifyCSS: ({
    format: {
      wrapAt: maxLineLength
    }
  }),
  collapseWhitespace: true,
  removeComments: true,
  maxLineLength: maxLineLength
};

const jsUglifyOptions = {
  mangle: false,
  compress: {
    defaults: false
  },
  output: {
    // comments: 'all',
    max_line_len: maxLineLength,
    quote_style: jsQuoteStyle,
    keep_quoted_props: true,
    keep_numbers: true,
    semicolons: true,
    braces: true
  }
};

const minifyCssOptions = {
  format: {
    wrapAt: maxLineLength
  }
};

//
// Clean build folder
//
const cleanDev = function () {
  return deleteAsync(
    [
      '../irc-hybrid-client/build-dev'
    ],
    {
       dryRun: false,
       force: true
    });
};

const cleanProd = function () {
  return deleteAsync(
    [
      '../irc-hybrid-client/build-prod'
    ],
    {
      dryRun: false,
      force: true
    });
};

const placeholderDev = function () {
  return src('../irc-hybrid-client/source-files/html/build-placeholder.html')
  .pipe(rename('webclient.html'))
  .pipe(dest('../irc-hybrid-client/build-dev'));
}

const placeholderProd = function () {
  return src('../irc-hybrid-client/source-files/html/build-placeholder.html')
  .pipe(rename('webclient.html'))
  .pipe(dest('../irc-hybrid-client/build-prod'));
}

// -----------------
//   page01.html (previously index.html)
// -----------------
const htmlWebclientDev = function () {
  const templates = '\n' +
    fs.readFileSync('../irc-hybrid-client/source-files/web-components/websocket-panel.html', 'utf8') +
    fs.readFileSync('../irc-hybrid-client/source-files/web-components/nav-menu.html', 'utf8') +
    fs.readFileSync('../irc-hybrid-client/source-files/web-components/activity-spinner.html', 'utf8') +
    fs.readFileSync('../irc-hybrid-client/source-files/web-components/hamburger-icon.html', 'utf8') +
    fs.readFileSync('../irc-hybrid-client/source-files/web-components/header-bar.html', 'utf8') +
    fs.readFileSync('../irc-hybrid-client/source-files/web-components/error-panel.html', 'utf8') +
    fs.readFileSync('../irc-hybrid-client/source-files/web-components/help-panel.html', 'utf8') +
    fs.readFileSync('../irc-hybrid-client/source-files/web-components/license-panel.html', 'utf8') +
    fs.readFileSync('../irc-hybrid-client/source-files/web-components/logout-panel.html', 'utf8') +
    fs.readFileSync('../irc-hybrid-client/source-files/web-components/server-form-panel.html', 'utf8') +
    fs.readFileSync('../irc-hybrid-client/source-files/web-components/server-list-panel.html', 'utf8') +
    fs.readFileSync('../irc-hybrid-client/source-files/web-components/irc-controls-panel.html', 'utf8') +
    fs.readFileSync('../irc-hybrid-client/source-files/web-components/irc-server-panel.html', 'utf8') +
    fs.readFileSync('../irc-hybrid-client/source-files/web-components/wallops-panel.html', 'utf8') +
    fs.readFileSync('../irc-hybrid-client/source-files/web-components/notice-panel.html', 'utf8') +
    fs.readFileSync('../irc-hybrid-client/source-files/web-components/manage-pm-panels.html', 'utf8') +
    fs.readFileSync('../irc-hybrid-client/source-files/web-components/pm-panel.html', 'utf8') +
    fs.readFileSync('../irc-hybrid-client/source-files/web-components/manage-channels-panel.html', 'utf8') +
    fs.readFileSync('../irc-hybrid-client/source-files/web-components/channel-panel.html', 'utf8') +
    fs.readFileSync('../irc-hybrid-client/source-files/web-components/debug-panel.html', 'utf8') +
    fs.readFileSync('../irc-hybrid-client/source-files/web-components/show-raw.html', 'utf8') +
    fs.readFileSync('../irc-hybrid-client/source-files/web-components/show-events.html', 'utf8') +
    fs.readFileSync('../irc-hybrid-client/source-files/web-components/show-ircstate.html', 'utf8') +
    fs.readFileSync('../irc-hybrid-client/source-files/web-components/show-webstate.html', 'utf8');
  const jsFilenames = '\n' +
    '<script src="./js/_beforeLoad.js" defer></script>\n' +
    '<script src="./js/glob-vars.js" defer></script>\n' +
    '<script src="./js/display-utils.js" defer></script>\n' +
    '<script src="./js/beep-sounds.js" defer></script>\n' +
    '<script src="./js/local-command-parser.js" defer></script>\n' +
    '<script src="./js/remote-command-parser.js" defer></script>\n' +
    '<script src="./js/ctcp-parser.js" defer></script>\n' +
    '<script src="./js/user-info.js" defer></script>\n' +
    '<script src="./js/websocket-panel.js" defer></script>\n' +
    '<script src="./js/nav-menu.js" defer></script>\n' +
    '<script src="./js/activity-spinner.js" defer></script>\n' +
    '<script src="./js/hamburger-icon.js" defer></script>\n' +
    '<script src="./js/header-bar.js" defer></script>\n' +
    '<script src="./js/error-panel.js" defer></script>\n' +
    '<script src="./js/help-panel.js" defer></script>\n' +
    '<script src="./js/license-panel.js" defer></script>\n' +
    '<script src="./js/logout-panel.js" defer></script>\n' +
    '<script src="./js/server-form-panel.js" defer></script>\n' +
    '<script src="./js/server-list-panel.js" defer></script>\n' +
    '<script src="./js/irc-controls-panel.js" defer></script>\n' +
    '<script src="./js/irc-server-panel.js" defer></script>\n' +
    '<script src="./js/wallops-panel.js" defer></script>\n' +
    '<script src="./js/notice-panel.js" defer></script>\n' +
    '<script src="./js/manage-pm-panels.js" defer></script>\n' +
    '<script src="./js/pm-panel.js" defer></script>\n' +
    '<script src="./js/manage-channels-panel.js" defer></script>\n' +
    '<script src="./js/channel-panel.js" defer></script>\n' +
    '<script src="./js/debug-panel.js" defer></script>\n' +
    '<script src="./js/show-raw.js" defer></script>\n' +
    '<script src="./js/show-events.js" defer></script>\n' +
    '<script src="./js/show-ircstate.js" defer></script>\n' +
    '<script src="./js/show-webstate.js" defer></script>\n' +
    '<script src="./js/_afterLoad.js" defer></script>\n';
  const now = new Date();
  const compileDate = 'Build timestamp: ' + now.toGMTString();
  return src('../irc-hybrid-client/source-files/html/_index.html')
    .pipe(rename('webclient.html'))
    .pipe(replace('<!-- HTML TEMPLATES -->', templates))
    .pipe(replace('<!-- COMPILE-DATE -->', compileDate))
    .pipe(replace('<script src="./js/webclient.js" defer></script>', jsFilenames))
    .pipe(dest('../irc-hybrid-client/build-dev'));
}; // tmlWebclientDev()

const htmlWebclientProd = function () {
  const templates = '' +
  fs.readFileSync('../irc-hybrid-client/source-files/web-components/websocket-panel.html', 'utf8') +
  fs.readFileSync('../irc-hybrid-client/source-files/web-components/nav-menu.html', 'utf8') +
  fs.readFileSync('../irc-hybrid-client/source-files/web-components/activity-spinner.html', 'utf8') +
  fs.readFileSync('../irc-hybrid-client/source-files/web-components/hamburger-icon.html', 'utf8') +
  fs.readFileSync('../irc-hybrid-client/source-files/web-components/header-bar.html', 'utf8') +
  fs.readFileSync('../irc-hybrid-client/source-files/web-components/error-panel.html', 'utf8') +
  fs.readFileSync('../irc-hybrid-client/source-files/web-components/help-panel.html', 'utf8') +
  fs.readFileSync('../irc-hybrid-client/source-files/web-components/license-panel.html', 'utf8') +
  fs.readFileSync('../irc-hybrid-client/source-files/web-components/logout-panel.html', 'utf8') +
  fs.readFileSync('../irc-hybrid-client/source-files/web-components/server-form-panel.html', 'utf8') +
  fs.readFileSync('../irc-hybrid-client/source-files/web-components/server-list-panel.html', 'utf8') +
  fs.readFileSync('../irc-hybrid-client/source-files/web-components/irc-controls-panel.html', 'utf8') +
  fs.readFileSync('../irc-hybrid-client/source-files/web-components/irc-server-panel.html', 'utf8') +
  fs.readFileSync('../irc-hybrid-client/source-files/web-components/wallops-panel.html', 'utf8') +
  fs.readFileSync('../irc-hybrid-client/source-files/web-components/notice-panel.html', 'utf8') +
  fs.readFileSync('../irc-hybrid-client/source-files/web-components/manage-pm-panels.html', 'utf8') +
  fs.readFileSync('../irc-hybrid-client/source-files/web-components/pm-panel.html', 'utf8') +
  fs.readFileSync('../irc-hybrid-client/source-files/web-components/manage-channels-panel.html', 'utf8') +
  fs.readFileSync('../irc-hybrid-client/source-files/web-components/channel-panel.html', 'utf8') +
  fs.readFileSync('../irc-hybrid-client/source-files/web-components/debug-panel.html', 'utf8') +
  fs.readFileSync('../irc-hybrid-client/source-files/web-components/show-raw.html', 'utf8') +
  fs.readFileSync('../irc-hybrid-client/source-files/web-components/show-events.html', 'utf8') +
  fs.readFileSync('../irc-hybrid-client/source-files/web-components/show-ircstate.html', 'utf8') +
  fs.readFileSync('../irc-hybrid-client/source-files/web-components/show-webstate.html', 'utf8');
  const now = new Date();
  const compileDate = 'Build timestamp: ' + now.toGMTString();
  return src('../irc-hybrid-client/source-files/html/_index.html')
    .pipe(rename('webclient.html'))
    .pipe(replace('<!-- HTML TEMPLATES -->', templates))
    .pipe(replace('<!-- COMPILE-DATE -->', compileDate))
    .pipe(htmlmin(htmlMinifyOptions))
    .pipe(dest('../irc-hybrid-client/build-prod'));
}; // htmlWebclientProd()

const jsWebclientDev = function () {
  return src(
    [
      '../irc-hybrid-client/source-files/js/_beforeLoad.js',
      '../irc-hybrid-client/source-files/web-components/glob-vars.js',
      '../irc-hybrid-client/source-files/web-components/display-utils.js',
      '../irc-hybrid-client/source-files/web-components/beep-sounds.js',
      '../irc-hybrid-client/source-files/web-components/local-command-parser.js',
      '../irc-hybrid-client/source-files/web-components/remote-command-parser.js',
      '../irc-hybrid-client/source-files/web-components/ctcp-parser.js',
      '../irc-hybrid-client/source-files/web-components/user-info.js',
      '../irc-hybrid-client/source-files/web-components/websocket-panel.js',
      '../irc-hybrid-client/source-files/web-components/nav-menu.js',
      '../irc-hybrid-client/source-files/web-components/activity-spinner.js',
      '../irc-hybrid-client/source-files/web-components/hamburger-icon.js',
      '../irc-hybrid-client/source-files/web-components/header-bar.js',
      '../irc-hybrid-client/source-files/web-components/error-panel.js',
      '../irc-hybrid-client/source-files/web-components/help-panel.js',
      '../irc-hybrid-client/source-files/web-components/license-panel.js',
      '../irc-hybrid-client/source-files/web-components/logout-panel.js',
      '../irc-hybrid-client/source-files/web-components/server-form-panel.js',
      '../irc-hybrid-client/source-files/web-components/server-list-panel.js',
      '../irc-hybrid-client/source-files/web-components/irc-controls-panel.js',
      '../irc-hybrid-client/source-files/web-components/irc-server-panel.js',
      '../irc-hybrid-client/source-files/web-components/wallops-panel.js',
      '../irc-hybrid-client/source-files/web-components/notice-panel.js',
      '../irc-hybrid-client/source-files/web-components/manage-pm-panels.js',
      '../irc-hybrid-client/source-files/web-components/pm-panel.js',
      '../irc-hybrid-client/source-files/web-components/manage-channels-panel.js',
      '../irc-hybrid-client/source-files/web-components/channel-panel.js',
      '../irc-hybrid-client/source-files/web-components/debug-panel.js',
      '../irc-hybrid-client/source-files/web-components/show-raw.js',
      '../irc-hybrid-client/source-files/web-components/show-events.js',
      '../irc-hybrid-client/source-files/web-components/show-ircstate.js',
      '../irc-hybrid-client/source-files/web-components/show-webstate.js',
      '../irc-hybrid-client/source-files/js/_afterLoad.js'
    ])
    .pipe(dest('../irc-hybrid-client/build-dev/js'));
}; // jsWebclientDev()

const jsWebclientProd = function () {
  const license = '/*\n' + fs.readFileSync('LICENSE', 'utf8') + '*/\n\n';
  const jsStrict = '\'use strict\';\n\n';
  return src(
    [
      '../irc-hybrid-client/source-files/js/_beforeLoad.js',
      '../irc-hybrid-client/source-files/web-components/glob-vars.js',
      '../irc-hybrid-client/source-files/web-components/display-utils.js',
      '../irc-hybrid-client/source-files/web-components/beep-sounds.js',
      '../irc-hybrid-client/source-files/web-components/local-command-parser.js',
      '../irc-hybrid-client/source-files/web-components/remote-command-parser.js',
      '../irc-hybrid-client/source-files/web-components/ctcp-parser.js',
      '../irc-hybrid-client/source-files/web-components/user-info.js',
      '../irc-hybrid-client/source-files/web-components/websocket-panel.js',
      '../irc-hybrid-client/source-files/web-components/nav-menu.js',
      '../irc-hybrid-client/source-files/web-components/activity-spinner.js',
      '../irc-hybrid-client/source-files/web-components/hamburger-icon.js',
      '../irc-hybrid-client/source-files/web-components/header-bar.js',
      '../irc-hybrid-client/source-files/web-components/error-panel.js',
      '../irc-hybrid-client/source-files/web-components/help-panel.js',
      '../irc-hybrid-client/source-files/web-components/license-panel.js',
      '../irc-hybrid-client/source-files/web-components/logout-panel.js',
      '../irc-hybrid-client/source-files/web-components/server-form-panel.js',
      '../irc-hybrid-client/source-files/web-components/server-list-panel.js',
      '../irc-hybrid-client/source-files/web-components/irc-controls-panel.js',
      '../irc-hybrid-client/source-files/web-components/irc-server-panel.js',
      '../irc-hybrid-client/source-files/web-components/wallops-panel.js',
      '../irc-hybrid-client/source-files/web-components/notice-panel.js',
      '../irc-hybrid-client/source-files/web-components/manage-pm-panels.js',
      '../irc-hybrid-client/source-files/web-components/pm-panel.js',
      '../irc-hybrid-client/source-files/web-components/manage-channels-panel.js',
      '../irc-hybrid-client/source-files/web-components/channel-panel.js',
      '../irc-hybrid-client/source-files/web-components/debug-panel.js',
      '../irc-hybrid-client/source-files/web-components/show-raw.js',
      '../irc-hybrid-client/source-files/web-components/show-events.js',
      '../irc-hybrid-client/source-files/web-components/show-ircstate.js',
      '../irc-hybrid-client/source-files/web-components/show-webstate.js',
      '../irc-hybrid-client/source-files/js/_afterLoad.js'
    ])
    .pipe(order([
      '_beforeLoad.js',
      'glob-vars.js',
      'display-utils.js',
      'beep-sounds.js',
      'local-command-parser.js',
      'remote-command-parser.js',
      'ctcp-parser.js',
      'user-info.js',
      'websocket-panel.js',
      'nav-menu.js',
      'activity-spinner.js',
      'hamburger-icon.js',
      'header-bar.js',
      'error-panel.js',
      'help-panel.js',
      'license-panel.js',
      'logout-panel.js',
      'server-form-panel.js',
      'server-list-panel.js',
      'irc-controls-panel.js',
      'irc-server-panel.js',
      'wallops-panel.js',
      'notice-panel.js',
      'manage-pm-panels.js',
      'pm-panel.js',
      'manage-channels-panel.js',
      'channel-panel.js',
      'debug-panel.js',
      'show-raw.js',
      'show-events.js',
      'show-ircstate.js',
      'show-webstate.js',
      '_afterLoad.js'      
    ]))
    .pipe(replace('\'use strict\';\n', ''))
    .pipe(concat('webclient.js'))
    .pipe(uglify.default(jsUglifyOptions))
    .pipe(insert.prepend(jsStrict))
    .pipe(insert.prepend(license))
    .pipe(dest('../irc-hybrid-client/build-prod/js'));
}; // jsWebclientProd()

const cssWebclientDev = function () {
  return src(
    [
      '../irc-hybrid-client/source-files/css/_global.css',
      '../irc-hybrid-client/source-files/web-components/websocket-panel.css',
      '../irc-hybrid-client/source-files/web-components/nav-menu.css',
      '../irc-hybrid-client/source-files/web-components/activity-spinner.css',
      '../irc-hybrid-client/source-files/web-components/hamburger-icon.css',
      '../irc-hybrid-client/source-files/web-components/header-bar.css',
      '../irc-hybrid-client/source-files/web-components/error-panel.css',
      '../irc-hybrid-client/source-files/web-components/help-panel.css',
      '../irc-hybrid-client/source-files/web-components/license-panel.css',
      '../irc-hybrid-client/source-files/web-components/logout-panel.css',
      '../irc-hybrid-client/source-files/web-components/server-form-panel.css',
      '../irc-hybrid-client/source-files/web-components/server-list-panel.css',
      '../irc-hybrid-client/source-files/web-components/irc-controls-panel.css',
      '../irc-hybrid-client/source-files/web-components/irc-server-panel.css',
      '../irc-hybrid-client/source-files/web-components/wallops-panel.css',
      '../irc-hybrid-client/source-files/web-components/notice-panel.css',
      '../irc-hybrid-client/source-files/web-components/manage-pm-panels.css',
      '../irc-hybrid-client/source-files/web-components/manage-channels-panel.css',
      '../irc-hybrid-client/source-files/web-components/debug-panel.css',
      '../irc-hybrid-client/source-files/web-components/show-raw.css',
      '../irc-hybrid-client/source-files/web-components/show-events.css',
      '../irc-hybrid-client/source-files/web-components/show-ircstate.css',
      '../irc-hybrid-client/source-files/web-components/show-webstate.css'
    ])
    .pipe(concat('styles.css'))
    .pipe(dest('../irc-hybrid-client/build-dev/css'));
}; // cssWebclientDev

const cssWebclientProd = function () {
  return src('../irc-hybrid-client/build-dev/css/styles.css')
  .pipe(cleancss(minifyCssOptions))
  .pipe(dest('../irc-hybrid-client/build-prod/css'));
} // cssWebclientProd()


// ------------------------------
// copy sound files
// ------------------------------
const soundsCopyDev = function() {
  return src('../irc-hybrid-client/source-files/sounds/short-beep*.mp3', { encoding: false })
    .pipe(dest('../irc-hybrid-client/build-dev/sounds'));
};
const soundsCopyProd = function() {
  return src('../irc-hybrid-client/source-files/sounds/short-beep*.mp3', { encoding: false })
    .pipe(dest('../irc-hybrid-client/build-prod/sounds'));
};

//
// Process Production build folder
//
const buildProd = series(
  htmlWebclientProd,
  jsWebclientProd,
  cssWebclientDev,
  cssWebclientProd,
  soundsCopyProd
);
//
// Process HTML files
//
const buildDev = series(
  htmlWebclientDev,
  jsWebclientDev,
  cssWebclientDev,
  soundsCopyDev
);

//
// dynamically rebuild index.html as needed
//
const watchHtml = function () {
  console.log('watchHtml, waiting for html changes to rebuild index.html');
  return watch(
    [
      '../irc-hybrid-client/source-files/html/*.html',
      '../irc-hybrid-client/source-files/css/*.css',
      '../irc-hybrid-client/source-files/js/*.js',
      '../irc-hybrid-client/source-files/web-components/*.html',
      '../irc-hybrid-client/source-files/web-components/*.js',
      '../irc-hybrid-client/source-files/web-components/*.css'
    ],
    {
      ignoreInitial: true
    },
    buildDev);
};

const cleanDevTask = series(
  cleanDev,
  placeholderDev,
);
const cleanDistTask = series(
  cleanProd,
  placeholderProd
);
const cleanAllTask = series(
  cleanDev,
  placeholderDev,
  cleanProd,
  placeholderProd
);
const defaultTask = series(
  cleanDev,
  buildDev,
  watchHtml
);
const devTask = series(
  cleanDev,
  buildDev
);
const distTask = series(
  cleanDev,
  cleanProd,
  buildDev,
  buildProd,
  cleanDev,
  placeholderDev
);

export { cleanDevTask as cleanDev };
export { cleanDistTask as cleanDist };
export { cleanAllTask as cleanAll };
export { devTask as dev };
export { distTask as dist };
export default defaultTask;
