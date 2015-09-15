[![npm version](https://badge.fury.io/js/git-cmd.svg)](http://badge.fury.io/js/git-cmd)
[![Build Status](https://travis-ci.org/redwerks/node-git-cmd.svg?branch=master)](https://travis-ci.org/redwerks/node-git-cmd)
[![Dependency Status](https://david-dm.org/redwerks/node-git-cmd.svg)](https://david-dm.org/redwerks/node-git-cmd)
[![devDependency Status](https://david-dm.org/redwerks/node-git-cmd/dev-status.svg)](https://david-dm.org/redwerks/node-git-cmd#info=devDependencies)

git-cmd
=======
git-cmd is a node.js command builder meant to be used to build your own functions to interact with git repositories through the `git` command.

git-cmd executes the git command with a set of arguments for you, gives you an interface to extract this data, and then returns the result as a Bluebird promise.

## Installation

```console
$ npm install git-cmd
```

## API documentation

```js
var git = require('git-cmd');
```

### git(args, options) => *cmd*
Construct a git command. The command is not executed at this point.

* **args** (array): The args to pass to the `git` command.
* **options** (options):
  * **git** (string) [default=`"git"`] the path to the `git` executable.
  * **cwd** (string) [default=`process.cwd`] the git directory.
  * **GIT_DIR** (string) the GIT_DIR environment variable.

### **cmd** chained methods

#### cmd.push(arg) => *cmd*
This adds a single argument to the args list. This allows you to construct complex conditional commands.

```js
function clone(url, path, opts) {
    opts = opts || {};
    var cmd = git(['clone']);
    if ( opts.bare ) {
        cmd.push('--bare');
    }

    cmd.push(url);
    cmd.push(path);

    return cmd.pass({prefix: opts.prefix});
}
```

#### cmd.pipe(stream) => *cmd*
Add a transform stream to pipe stdout through for the `.capture()`, `.oneline()`, and `.array()` run methods.

```js
var LineStream = require('byline').LineStream;

function tags() {
    return git(['tag'], {cwd: cwd})
        .pipe(new LineStream())
        .array();
}
```

### **cmd** run methods
These commands execute the git command and return the result in various ways.

#### cmd.ok() => *promise*
Execute the command and resolve with a boolean indicating whether the command succeeded (error code=0, true) or failed (error code > 0, false).

stdout and stderr will be ignored.

This result is useful if you're doing a boolean test for the presence of something in the git repository and git exits with an error code when it's missing.

##### Example

```js
function hasRef(ref) {
    return git(['rev-parse', ref], {cwd: cwd}).ok();
}
```

#### cmd.pass(options) => *promise*
Execute the command and pass all stdout and stderr output through. The promise is resolved simply with true when the process exits.

This result is useful when running long running commands like `fetch` and `clone` that output progress information to the terminal.

##### Options

* **prefix** (string) [default=`""`] prefix for every line piped to stdout and stderr.
  * If you are executing multiple git commands in parallel this can identify what output is from what command.
* **silenceErrors** (boolean) [default=`false`] don't pass through stderr output.

##### Example

```js
function fetchOrigin(ref) {
    return git(['fetch', 'origin'], {cwd: cwd}).pass();
}

function fetchRepo(name) {
    return git(['fetch', 'origin'], {cwd: nameToPath(name)}).pass({prefix: name + ': '});
}
```

#### cmd.capture(options) => *promise*
Execute the command and capture the output into a single buffer or string.

Any stderr output is passed through to to the terminal.

This is useful for any command you are capturing binary or multi-line data. Especially raw output such as that from cat-file.

##### Options

* **prefix** (string) [default=`""`] prefix for every line piped to stderr.
* **encoding** (string|`undefined`|`false`) [default=`undefined`] the character encoding of the data to decode.
* **silenceErrors** (boolean) [default=`false`] don't pass through stderr output.

##### Example

```js
function catBinaryFile(file) {
    return git(['cat-file', 'blob', util.format('HEAD:%s', file)], {cwd: cwd})
        .capture();
}

function catTextFile(file) {
    return git(['cat-file', 'blob', util.format('HEAD:%s', file)], {cwd: cwd})
        .capture({encoding: 'utf8'});
}
```

#### cmd.oneline(options) => *promise*
Execute the command and capture the output as a string without a trailing line feed.

Any stderr output is passed through to to the terminal.

This is useful for any command that simply returns a simple one-line string.

##### Options

* **prefix** (string) [default=`""`] prefix for every line piped to stderr.
* **silenceErrors** (boolean) [default=`false`] don't pass through stderr output.

##### Example

```js
function getRefHash(ref) {
    return git(['show-ref', '--hash', ref], {cwd: suite.cwd})
        .oneline();
}

function getSymbolicRef(ref) {
    return git(['symbolic-ref', ref], {cwd: cwd})
        .oneline();
}
```

#### cmd.array(options) => *promise*
Execute the command and return the result as an array. This method only works when you pipe the output through a transform stream that outputs data in objectMode.

Any stderr output is passed through to to the terminal.

This is useful when you want to return a list of objects processed through transformation streams.

##### Options

* **prefix** (string) [default=`""`] prefix for every line piped to stderr.
* **silenceErrors** (boolean) [default=`false`] don't pass through stderr output.

##### Example

```js
var LineStream = require('byline').LineStream,
    es = require('event-stream');

function getRefs() {
    return git(['show-ref'], {cwd: cwd})
        .pipe(new LineStream())
        .pipe(es.mapSync(function(line) {
            var m = line.match(/^([0-9a-f]+) (.+)$/);
            return {
                sha1: m[1],
                ref: m[2]
            };
        }))
        .array();
}

function lsTree(treeIsh) {
    return git(['ls-tree', treeIsh], {cwd: cwd})
        .pipe(new LineStream())
        .pipe(es.mapSync(function(line) {
            var m = line.match(/^(\d+) ([^ ]+) ([0-9a-f]+)\t(.+)$/);
            return {
                mode: parseInt(m[1], 10),
                type: m[2],
                sha1: m[3],
                name: m[4]
            };
        }))
        .array();
}
```
