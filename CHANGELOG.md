# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Next

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
