# irc-hybrid-client-dev-tools

This is a support repository of development tools intended for use with the repository [irc-hybrid-client](https://github.com/cotarr/irc-hybrid-client).

## Part 1 of 3 - Bruno API tests

The /bruno/ folder contains various irc-hybrid-client web server API tests that demonstrate the general functionality of the IRC client backend API for the irc-hybrid-client web server.

See: /bruno/README.md

## Part 2 of 3 - Debug API test scripts

The /debug/ folder contains various irc-hybrid-client web server API tests that are written in native javascript using the Node.js assertion library.

See /debug/README.md

## Part 3 of 3 Bundling and Minify Tools

The bundling and minify utilities are described here in the main README.md file.

This is a support repository used to minify and bundle the web page files for repository [irc-hybrid-client](https://github.com/cotarr/irc-hybrid-client).

This repository is optional. It is not required to use irc-hybrid-client-dev-tools unless you plan to edit irc-hybrid-client source files and regenerate replacement minified bundled files. The irc-hybrid-client repository includes both minified and un-minified original files. It can be cloned and deployed as-is, requiring only editing of the configurations files.

Running the gulp script will concatenate multiple files into one HTML, one JavaScript and one CSS files. It will remove comments and whitespace from the javascript code. This will significantly reduce the download size of the files and reduce bandwidth used by smartphones.

The minification process uses a development library called [gulp](https://gulpjs.com/). The gulp library files are listed in the package.json as development decencies.

Configuration for the minify and bundle process is stored in Gulpfile.mjs

The package.json files, configuration JSON files, and the /docs folder are not included in the bundle. However, the /docs folder can be enabled as a help web page in the configuration using unbundled files. The build-dev and build-prod folders are erased during the build process if they don't exist.

### Breaking Change Sept 2023

The Gulpfile.js in this repository was re-written for irc-hybrid-client Version v2 (~Sept 2023). The new Gulpfile.js is designated as irc-hybrid-client-dev-tools Version 2.0.0.

For users who want to bundle irc-hybrid-client Version v0.2.53 or Version v1.0.0 should roll this repository back to irc-hybrid-client-dev-tools Version v0.0.8 (2023-01-15, commit hash 73a9185)

### Security note

Some of the dependencies of the GulpJs bundler appear to be no longer maintained or deprecated. This has produced occasional npm audit dependency issues. When possible, upgraded versions have been implemented in the package-lock.json. Therefore, running `npm audit` on this repository may generate a warning due to legacy packages within the dependency tree.

When you evaluate how this could impact your use of this repository, consider that this is a development utility that is run within the limited scope of a development environment, with data input limited to repository source code files, and consider that these tools can be used in a way that is not directly exposed to the public internet, such as a virtual machine.

### Installation

To use this repository to minify files in the `irc-hybrid-client` repository, it is necessary to install this repository in the same parent folder that holds irc-hybrid-client. After installation the two repository folders should be side by side. It will look like this with the `ls` command.

```txt
ls -l
drwxr-xr-x 12 user user 4096 May 22 05:33 irc-hybrid-client
drwxr-xr-x  4 user user 4096 May 22 05:01 irc-hybrid-client-dev-tools
```

Clone the git repository and install npm dependencies.

```bash
git clone https://github.com/cotarr/irc-hybrid-client-dev-tools.git
cd irc-hybrid-client-dev-tools

export NODE_ENV=development
npm install
```

### Run to bundle and minify

| Command                |  build-dev/...              |  build-prod/...   |
| --------------------   | --------------------------- | ----------------- |
|  npx gulp cleanDev     | Remove Files                |                   |
|  npx gulp cleanProd    |                             | Remove Files      |
|  npx gulp cleanAll     | Remove files                | Remove Files      |
|  npx gulp dev          | Build dev files for debug   |                   |
|  npx gulp dist         | Temp use, then remove files | Bundle and Minify |
|  npx gulp              | Monitor for source changes  |                   |

Example: To bundle and minify the production version into build-prod/

```bash
cd ../irc-hybrid-client-dev-tools
npx gulp dist
```

Some of this would vary depending on the specific deployment environments. The above commands should be able to produce a minified version. The deployment itself is left to you.

### File Structure

| Source Files                                  | Development Build (multiple js)    |Bundled, Minified (3 files) |
| --------------------------------------------- | -----------------------------------| -------------------------- |
| source-files/html/*.html                      | build-dev/webclient.html           | build-prod/webclient.html  |
| source-files/css/*.css (shared css)           | build-dev/css/styles.css           | build-prod/css/styles.css  |
| source-files/js/*.js (loads page)             | build-dev/js/(*multiple files*).js | build-prod/js/webclient.js |
| source-files/web-components/*.html,*.css,*.js |                                    |                            |
