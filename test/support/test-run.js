/**
 * A test runner for tests that need to check stdout contents.
 */
"use strict";
var suite = require('./suite'),
	git = require('../../'),
	tests = {
		status: function() {
			git(['status'], {cwd: suite.cwd}).pass();
		},
		prefixedStatus: function() {
			git(['status'], {cwd: suite.cwd})
				.pass({prefix: "Foo: "});
		},
		symbolicRefHEAD: function() {
			git(['symbolic-ref', 'HEAD'], {cwd: suite.cwd})
				.pass({prefix: "Foo: "})
		}
	};

tests[process.argv.slice(2)]();
