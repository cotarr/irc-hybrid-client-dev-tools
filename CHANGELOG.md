# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
