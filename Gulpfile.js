//
// Gulpfile for irc-hybrid-client
//
const {src, dest, watch, series, parallel} = require('gulp');
const del = require('del');
const concat = require('gulp-concat');
const insert = require('gulp-insert');
const minify = require('gulp-minify');
const htmlmin = require('gulp-htmlmin');
const cleancss = require('gulp-clean-css');
const replace = require('gulp-replace');
const rename = require('gulp-rename');
const fs = require('fs');

// For configuratino see: https://www.npmjs.com/package/terser#compress-options

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
  compress: false,
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
// Clean secure-minify folder
//
const clean = function() {
  return del(
    [
      '../irc-hybrid-client/secure-minify'
    ],
    {dryRun: false, force: true});
};

const htmlMinify = function() {
  return src('../irc-hybrid-client/secure/webclient.html')
    // these files have been bundled into one file, so they are being removed
    .pipe(replace('<script src="./js/webclient02.js" defer></script>', ''))
    .pipe(replace('<script src="./js/webclient03.js" defer></script>', ''))
    .pipe(replace('<script src="./js/webclient04.js" defer></script>', ''))
    .pipe(replace('<script src="./js/webclient05.js" defer></script>', ''))
    .pipe(replace('<script src="./js/webclient06.js" defer></script>', ''))
    .pipe(replace('<script src="./js/webclient07.js" defer></script>', ''))
    .pipe(replace('<script src="./js/webclient08.js" defer></script>', ''))
    .pipe(replace('<script src="./js/webclient09.js" defer></script>', ''))
    .pipe(replace('<script src="./js/webclient10.js" defer></script>', ''))
    .pipe(htmlmin(htmlMinifyOptions))
    .pipe(dest('../irc-hybrid-client/secure-minify'));
};
const jsMinify = function () {
  const license = '/*\n' +
    fs.readFileSync('LICENSE', 'utf8') +
    '*/\n\n';
  const jsStrict = '\'use strict\';\n\n';
  return src(
    [
      '../irc-hybrid-client/secure/js/webclient.js',
      '../irc-hybrid-client/secure/js/webclient02.js',
      '../irc-hybrid-client/secure/js/webclient03.js',
      '../irc-hybrid-client/secure/js/webclient04.js',
      '../irc-hybrid-client/secure/js/webclient05.js',
      '../irc-hybrid-client/secure/js/webclient06.js',
      '../irc-hybrid-client/secure/js/webclient07.js',
      '../irc-hybrid-client/secure/js/webclient08.js',
      '../irc-hybrid-client/secure/js/webclient09.js',
      '../irc-hybrid-client/secure/js/webclient10.js'
    ])
    .pipe(replace('\'use strict\';\n', ''))
    .pipe(concat('webclient.js'))
    .pipe(minify(jsMinifyOptions))
    .pipe(insert.prepend(jsStrict))
    .pipe(insert.prepend(license))
    .pipe(dest('../irc-hybrid-client/secure-minify/js'));
};

// -----------
//    CSS
// -----------
const cssMinify = function() {
  return src(
    [
      '../irc-hybrid-client/secure/css/styles.css'
    ])
    .pipe(concat('styles.css'))
    .pipe(cleancss(minifyCssOptions))
    .pipe(dest('../irc-hybrid-client/secure-minify/css'));
};

// ------------------------------
// copy sound files
// ------------------------------
const soundsCopy = function() {
  return src('../irc-hybrid-client/secure/sounds/*')
    .pipe(dest('../irc-hybrid-client/secure-minify/sounds'));
};

// ---------------------------------------------
// Check for existence of irc-hybrid-client
// ---------------------------------------------
const verifyFoldersExist = function (cb) {
  if (!fs.existsSync('../irc-hybrid-client')) {
    throw new Error('Folder ../irc-hybrid-client/ does not exist');
  }
  if (!fs.existsSync('../irc-hybrid-client/secure')) {
    throw new Error('Folder ../irc-hybrid-client/secure/ does not exist');
  }
  cb();
};

//
// default using 'gulp' command
//
const defaultTask = function (cb) {
  console.log('\n\nTo Minify HTML file use: npx gulp minify\n\n');
  cb();
};

//
// Process Production secure-minify folder
//
const minifyProd = series(
  htmlMinify,
  jsMinify,
  cssMinify,
  soundsCopy
);

exports.default = defaultTask;
exports.clean = series(verifyFoldersExist, clean);
exports.minify = series(verifyFoldersExist, clean, minifyProd);
exports.dist = series(verifyFoldersExist, clean, minifyProd);
