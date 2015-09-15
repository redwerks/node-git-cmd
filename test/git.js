"use strict";
var chai = require('chai'),
	expect = chai.expect,
	suite = require('./support/suite'),
	path = require('path'),
	fs = require('fs'),
	execFile = require('child-process-promise').execFile,
	es = require('event-stream'),
	{LineStream} = require('byline'),
	git = require('../');
chai.use(require('chai-as-promised'));

describe('git()', function() {
	describe('.ok()', function() {
		function hasRef(ref) {
			return git(['rev-parse', ref], {cwd: suite.cwd}).ok();
		}

		it('should eventually return true when successful', function() {
			return expect(hasRef('master')).to.eventually.equal(true);
		});

		it('should eventually return false when failed', function() {
			return expect(hasRef('null')).to.eventually.equal(false);
		});
	});

	describe('.pass()', function() {
		it('shouldpass  output to stdout and stdout', function() {
			return execFile('node', [path.join(__dirname, 'support', 'test-run.js'), 'status'])
				.then(function(result) {
					// Ignore minor differences in status output between different git versions
					result.stdout = result.stdout.replace('# ', '')
					expect(result.stdout).to.equal('On branch master\nnothing to commit, working directory clean\n');
					expect(result.stderr).to.equal('');
				});
		});
	});

	describe('.capture()', function() {
		it("should capture the command's output to a string when passed {encoding: 'utf8'}", function() {
			return expect(git(['cat-file', 'blob', 'HEAD:README.md'], {cwd: suite.cwd}).capture({encoding: 'utf8'}))
				.to.eventually.equal(fs.readFileSync(path.join(suite.cwd, 'README.md'), 'utf8'));
		});
	});

	describe('.oneline()', function() {
		it("should capture the command's output without a newline", function() {
			return expect(git(['show-ref', '--hash', 'master'], {cwd: suite.cwd}).oneline())
				.to.eventually.match(/^[0-9a-f]{40}$/);
		});
	});

	describe('.pipe(...).oneline()', function() {
		function HEAD() {
			return git(['symbolic-ref', 'HEAD'], {cwd: suite.cwd})
				.pipe(es.replace('master', 'branch'))
				.oneline({encoding: 'utf8'});
		}

		it("should capture output modified by the through stream", function() {
			return expect(HEAD())
				.to.eventually.equal('refs/heads/branch');
		});
	});

	describe('.pipe(...).array()', function() {
		function tags() {
			return git(['tag'], {cwd: suite.cwd})
				.pipe(new LineStream())
				.array();
		}
		it("should capture the command's output to an array", function() {
			return expect(tags())
				.to.eventually.eql(['v0.0.1']);
		});
	});

	describe('.pass({prefix: "Foo: "})', function() {
		it('should prefix output', function() {
			return execFile('node', [path.join(__dirname, 'support', 'test-run.js'), 'symbolicRefHEAD'])
				.then(function(result) {
					// Ignore minor differences in status output between different git versions
					result.stdout = result.stdout.replace('# ', '')
					expect(result.stdout).to.equal('Foo: refs/heads/master\n');
					expect(result.stderr).to.equal('');
				});
		});

		it('should prefix every line of output', function() {
			return execFile('node', [path.join(__dirname, 'support', 'test-run.js'), 'prefixedStatus'])
				.then(function(result) {
					// Ignore minor differences in status output between different git versions
					result.stdout = result.stdout.replace('# ', '')
					expect(result.stdout).to.equal('Foo: On branch master\nFoo: nothing to commit, working directory clean\n');
					expect(result.stderr).to.equal('');
				});
		});

		it('should prefix errors', function() {
			return execFile('node', [path.join(__dirname, 'support', 'test-run.js'), 'symbolicRefNULL'])
				.then(function(result) {
					// Ignore minor differences in status output between different git versions
					result.stdout = result.stdout.replace('# ', '')
					expect(result.stdout).to.equal('');
					expect(result.stderr).to.equal('Foo: fatal: ref NULL is not a symbolic ref\nthrown\n');
				});
		});
	});

	describe('.oneline({silenceErrors: true})', function() {
		it('should not pass through errors', function() {
			return execFile('node', [path.join(__dirname, 'support', 'test-run.js'), 'symbolicRefNULLSilent'])
				.then(function(result) {
					// Ignore minor differences in status output between different git versions
					result.stdout = result.stdout.replace('# ', '')
					expect(result.stdout).to.equal('');
					expect(result.stderr).to.equal('thrown\n');
				});
		});
	});

	describe('{GIT_DIR: "/"}', function() {
		it('should change the GIT_DIR to the wrong path', function() {
			return expect(
				git(['show-ref', '--hash', 'master'], {cwd: suite.cwd, GIT_DIR: '/'}).oneline({silenceErrors: true}))
				.to.eventually.be.rejected;
		});
	});
});

describe('Git error', function() {
	var state = {};
	before(function() {
		return git(['symbolic-ref', 'NULL'], {cwd: suite.cwd})
			.oneline({silenceErrors: true})
			.catch(function(err) {
				state.err = err;
			});
	});

	it('should have the GITERROR code', function() {
		expect(state.err.code)
			.to.be.a('string')
			.and.to.equal('GITERROR');
	});

	it('should expose the exit code as exitCode', function() {
		expect(state.err.exitCode)
			.to.be.a('number')
			.and.to.equal(128);
	});
});
