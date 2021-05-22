# irc-hybrid-client-minifyer

This is a gulp bunder for repository irc-hybrid-client.

- css (minify)
- js (concatenate JavaScript files to single file and minify)
- html (minify and update script tags)

To use this, first clone irc-hybrid-client, then clone this
repository (irc-hybrid-client-minifier) into the same parent folder as irc-hybrid-client.
It is necessary to install these two repositories in the same parent folder.

```
../irc-hybrid-client
../irc/hybrid-client-minifier
```

To install and minify the irc-hybrid-client repository in adjacent folder.

```
git clone https://github.com/cotarr/irc-hybrid-client-minifyer.git
cd irc-hybrid-client-minifyer

gulp minify
```
