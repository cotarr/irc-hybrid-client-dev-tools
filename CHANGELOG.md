# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Next v3.0.0-dev (Draft)

Recently the gulp project has released Gulp v5 to replace Gulp v4. 
My thanks to the gulp team for the new release.
The previous Gulp v4 release had been idle for many year leading to 
deprecated dependencies that were no longer maintained.
In addition, the gulp-htmlmin module was recently flagged 
with a GitHub dependabot security alert.

To address this, the full set of Gulp npm packages have been upgraded to current.
The Gulpfile.js has been upgraded to address breaking 
changes introduced by the replacement packages.

### Breaking Change

- Upgrade gulp package from v4 to v5.0.0 (Breaking Change)
- Converted Gulpfile.js from CommonJs Require() to ESM import() modules, with new filename Gulpfile.mjs
- Upgrade del from v6 to 7.1.0 (Breaking change, CommonJS to ESM version)
- Replace gulp-htmlmin with gulp-html-minifier-terser to address npm audit warning in unmaintained gulp-htmlmin.
- Replace gulp-minify with gulp-uglify-es to address unmaintained dependencies in gulp-minify.
- Added gulp-order3 because gulp v5 does not preserve order of src() to pipe like gulp v4 (Breaking change).
- Removed package gulp-cli, not needed, dependency of gulp5
- Upgraded options passed to several functions to align with the new versions.

Deleted "node-modules" folder. Deleted "package-lock.json". Performed clean `npm install`. 
This produced a clean install with no deprecated package warning or security audit warning.

Results:

When running the gulp runner, the contents bundled html and css files were not changed.

When running the gulp runner, the contents of bundled javascript files 
show minor changes due to replacement of the minify library.
The changes appear to be limited to minor optimization variations, 
such as optimization of extraneous parenthesis () and braces {}.
The goal of the configuration is to remove white space and comments.
Deeper minify capabilities involving mangling and compressing are disabled 
in the options, so no major variations were expected.

## [v2.0.1](https://github.com/cotarr/irc-hybrid-client-dev-tools/releases/tag/v2.0.1) 2024-03-13

Update npm dependency es5-ext to v0.10.64 to address npm audit warning.

## [v2.0.0](https://github.com/cotarr/irc-hybrid-client-dev-tools/releases/tag/v2.0.0) 2023-09-12

Replacement Gulpfile.js to bundle irc-hybrid-client v2.0.0 and higher

### Breaking Change

This is a breaking change. 

To bundle the older version irc-hybrid-client Version v0.2.53 or Version v1.0.0
roll this repository back to irc-hybrid-client-dev-tools 
Version v0.0.8 (2023-01-15, commit hash 73a9185)

### Changes

- Rewrite Gulpfile.js to accommodate web component version of irc-hybrid-client
- Added NPM package: gulp-rename
- Update NPM dependencies
- Requires `npm install`
- Update README.md with new instructions

New folder structure:

| Command                |  build-dev/...              |  build-prod/...   |
| --------------------   | --------------------------- | ----------------- |
|  npx gulp cleanDev     | Remove Files                |                   |
|  npx gulp cleanProd    |                             | Remove Files      |
|  npx gulp cleanAll     | Remove files                | Remove Files      |
|  npx gulp dev          | Build dev files for debug   |                   |
|  npx gulp dist         | Temp use, then remove files | Bundle and Minify |
|  npx gulp              | Monitor for source changes  |                   |


## [v0.0.8](https://github.com/cotarr/irc-hybrid-client-dev-tools/releases/tag/v0.0.8) 2023-01-15

- Gulpfile.js - Update /secure/sounds rules to exclude custom sound files.
- Remove eslint from project
- Regenerate a new package-lock.json

## [v0.0.7](https://github.com/cotarr/irc-hybrid-client-dev-tools/releases/tag/v0.0.7) 2022-12-30

- package-lock.json -Bump decode-uri-component v0.2.0 to v0.2.2 to address npm audit security alert.

## [v0.0.6](https://github.com/cotarr/irc-hybrid-client-dev-tools/releases/tag/v0.0.6) 2022-11-13

### Changed

- package-lock.json - Bump minimatch 3.0.4 to 3.1.2 to address github dependabot alert

## [v0.0.5](https://github.com/cotarr/irc-hybrid-client-dev-tools/releases/tag/v0.0.5) 2022-07-31

### Changed

- package-lock.json - Manually edited package-lock.json to bump glob-parent@5.1.2 to address github dependabot alert. Glob-parent is a dependency in 4 packages.
- package-lock.json - Manually edited package-lock.json to bump terser@4.8.1 to address github dependabot alert. Terser is a dependency of gulp-minify.
- The terser version upgrade caused some minor differences in the minified javascript code. The terser compress options have been modified due to the version change. This has resulted in some minor changes in the minified javascript in webclient.js and serverlist.js in the irc-hybrid-client repository.

## v0.0.4 2022-07-30

### Changed

- Update some package dependencies

## v0.0.3 2022-07-30

### Changed

- Gulpfile.js - Add second bundled file set for serverlist.html, serverlist.js and serverlist.css to use with 
web page to edit list of IRC server definitions at /irc/serverlist.html. This is a separate web page from the
IRC web client.
