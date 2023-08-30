//
// Gulpfile for irc-hybrid-client
//
const { src, dest, watch, series, parallel } = require('gulp');
const del = require('del');
const concat = require('gulp-concat');
const insert = require('gulp-insert');
const minify = require('gulp-minify');
const htmlmin = require('gulp-htmlmin');
const cleancss = require('gulp-clean-css');
const replace = require('gulp-replace');
const rename = require('gulp-rename');
const fs = require('fs');

// For configuration see: https://www.npmjs.com/package/terser#compress-options

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

const jsMinifyOptions = {
  ext: '.js',
  noSource: true,
  mangle: false,
  compress: {
    defaults: false 
  },
  output: {
    max_line_len: maxLineLength,
    quote_style: jsQuoteStyle
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
  return del(
    [
      '../irc-hybrid-client/build-dev'
    ],
    {
      dryRun: false,
      force: true
    });
};

const cleanProd = function () {
  return del(
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
    fs.readFileSync('../irc-hybrid-client/source-files/web-components/show-ircstate.html', 'utf8') +
    fs.readFileSync('../irc-hybrid-client/source-files/web-components/show-webstate.html', 'utf8');
  const jsFilenames = '\n' +
    '<script src="./js/_beforeLoad.js" defer></script>\n' +
    '<script src="./js/temp-placeholder.js" defer></script>\n' +
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
};

const htmlWebclientProd = function () {
  const templates = '' +
  fs.readFileSync('../irc-hybrid-client/source-files/web-components/websocket-panel.html', 'utf8') +
  fs.readFileSync('../irc-hybrid-client/source-files/web-components/nav-menu.html', 'utf8') +
  fs.readFileSync('../irc-hybrid-client/source-files/web-components/activity-spinner.html', 'utf8') +
  fs.readFileSync('../irc-hybrid-client/source-files/web-components/hamburger-icon.html', 'utf8') +
  fs.readFileSync('../irc-hybrid-client/source-files/web-components/header-bar.html', 'utf8') +
  fs.readFileSync('../irc-hybrid-client/source-files/web-components/error-panel.html', 'utf8') +
  fs.readFileSync('../irc-hybrid-client/source-files/web-components/help-panel.html', 'utf8') +
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
};
const jsWebclientDev = function () {
  return src(
    [
      '../irc-hybrid-client/source-files/js/_beforeLoad.js',
      '../irc-hybrid-client/source-files/web-components/temp-placeholder.js',
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
      '../irc-hybrid-client/source-files/web-components/show-ircstate.js',
      '../irc-hybrid-client/source-files/web-components/show-webstate.js',
      '../irc-hybrid-client/source-files/js/_afterLoad.js'
    ])
    .pipe(dest('../irc-hybrid-client/build-dev/js'));
};

const jsWebclientProd = function () {
  const license = '/*\n' + fs.readFileSync('LICENSE', 'utf8') + '*/\n\n';
  const jsStrict = '\'use strict\';\n\n';
  return src(
    [
      '../irc-hybrid-client/source-files/js/_beforeLoad.js',
      '../irc-hybrid-client/source-files/web-components/temp-placeholder.js',
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
      '../irc-hybrid-client/source-files/web-components/show-ircstate.js',
      '../irc-hybrid-client/source-files/web-components/show-webstate.js',
      '../irc-hybrid-client/source-files/js/_afterLoad.js'
    ])
    .pipe(replace('\'use strict\';\n', ''))
    .pipe(concat('webclient.js'))
    .pipe(minify(jsMinifyOptions))
    .pipe(insert.prepend(jsStrict))
    .pipe(insert.prepend(license))
    .pipe(dest('../irc-hybrid-client/build-prod/js'));
};

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
      '../irc-hybrid-client/source-files/web-components/show-ircstate.css',
      '../irc-hybrid-client/source-files/web-components/show-webstate.css'
    ])
    .pipe(concat('styles.css'))
    .pipe(dest('../irc-hybrid-client/build-dev/css'));
};

const cssWebclientProd = function () {
  return src('../irc-hybrid-client/build-dev/css/styles.css')
  .pipe(cleancss(minifyCssOptions))
  .pipe(dest('../irc-hybrid-client/build-prod/css'));
}


// ------------------------------
// copy sound files
// ------------------------------
const soundsCopyDev = function() {
  return src('../irc-hybrid-client/source-files/sounds/short-beep*')
    .pipe(dest('../irc-hybrid-client/build-dev/sounds'));
};
const soundsCopyProd = function() {
  return src('../irc-hybrid-client/source-files/sounds/short-beep*')
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

exports.cleanDev = series(
  cleanDev,
  placeholderDev,
);
exports.cleanDist = series(
  cleanProd,
  placeholderProd
);
exports.cleanAll = series(
  cleanDev,
  placeholderDev,
  cleanProd,
  placeholderProd
);
exports.default = series(
  cleanDev,
  buildDev,
  watchHtml
);
exports.dev = series(
  cleanDev,
  buildDev
);
exports.dist = series(
  cleanDev,
  cleanProd,
  buildDev,
  buildProd,
);
