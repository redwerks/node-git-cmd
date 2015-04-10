"use strict";
var Promise = require('bluebird'),
	rimraf = Promise.promisify(require('rimraf')),
	path = require('path'),
	fs = Promise.promisifyAll(require('fs')),
	execFile = require('child-process-promise').execFile,
	suite = require('./support/suite');


before(function() {
	return rimraf(suite.cwd)
		.then(() => fs.mkdirAsync(suite.cwd))
		.then(() => execFile(path.join(__dirname, 'support', 'setup.sh'), {cwd: suite.cwd}));
});

after(function() {
	return rimraf(suite.cwd);
});
