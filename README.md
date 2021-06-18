# irc-hybrid-client-dev-tools

# Other Contents

* postman/ folder contains some exported postman API test collections
* postman/API-Specs.md contains a description of the irc-hybrid-client API specification.

# Bundling and Minify Tools

This is a support repository used to minify and bundle the web page files for
repository [irc-hybrid-client](https://github.com/cotarr/irc-hybrid-client).

This repository is optional. It is not required to use irc-hybrid-client-dev-tools unless
you plan to edit irc-hybrid-client source files and regenerate replacement minified bundled files.
The irc-hybrid-client repository includes both minified and un-minified original files.
It can be cloned and deployed as-is, requiring only editing of the configurations files.

Running the gulp script will concatenate multiple files
into one HTML, one JavaScrpt and one CSS files.
It will remove comments and whitespace from the javascript code.
This will significantly reduce the download size of the files
and reduce bandwidth used by smartphones.

The minification process uses a development library called
[gulp](https://gulpjs.com/).
The gulp library files are listed in the package.json as development decencies.

Running `gulp minify` will source files from adjacent git repository folder
`../irc-hybrid-client/secure/`
and place output files in the `../irc-hybrid-client/secure-minify/`
folder.

Configuration for the minify and bundle process is stored in Gulpfile.js

The package.json files, configuration JSON files, and the /docs folder are not included in the bundle.
The secure-minify folder is erased during the build process.

# Security note

Running `npm audit` on this repository may generate a warning
due to legacy packages within the dependency tree having
polluted prototype issues or other minor vulnerabilities.

When you evaluate how this could impact your use of this repository,
consider that this is a development utility that is run within the
limited scope of a development environment, with data input limited
to repository source code files, and consider that
these tools are not directly exposed to the public internet.

# Installation

To use this repository to minify files in the `irc-hybrid-client` repository, it is necessary
to install this repository in the same parent folder that holds irc-hybrid-client.
After installation the two repository folders should be side by side.
It will look like this with the `ls` command.

```
ls
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

It is necessary to install gulp-cli globally.
The gulp-cli utility is used by gulp to manage multiple gulp versions.
This is not required if gulp-cli is already installed as a global npm package.
On your system, sudo or root permission may be required to install global packages.

```bash
npm install -g gulp-cli
```

To minify the files, change the working directory to this project's base folder.
Call the gulp process using `gulp minify`.

```bash
cd ../irc-hybrid-client-dev-tools
gulp minify
```

Some of this would vary depending on the specific deployment environments.
The above commands should be able to produce a minified version.
The deployment itself is left to you.
