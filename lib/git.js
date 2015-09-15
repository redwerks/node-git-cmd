"use strict";
var Promise = require('bluebird'),
	fmt = require('util').format,
	child_process = require('child_process'),
	LineWrapper = require('stream-line-wrapper'),
	streamToArray = Promise.promisify(require('stream-to-array')),
	getRawBody = Promise.promisify(require('raw-body'));

module.exports = git;

function error(message, code) {
	var err = new Error(message);
	err.code = 'GITERROR';
	err.exitCode = code;
	throw err;
}

function git(args, opts) {
	var _pipes = [],
		_inputEncoding,
		_captureArray = false;
	opts = opts || {};

	function normalizeOptions(opts) {
		opts = opts || {};
		opts.prefix = opts.prefix || '';
		return opts;
	}

	function run(runOpts) {
		runOpts = runOpts || {};
		return new Promise(function(resolve, reject) {
			var env = process.env;
			if ( opts.GIT_DIR ) {
				env = Object.create(env);
				env.GIT_DIR = opts.GIT_DIR;
			}

			var child = child_process.spawn(opts.git || 'git', args, {
					cwd: opts.cwd,
					env: env,
					stdio: ['ignore', runOpts.output === 'ignore' ? 'ignore' : 'pipe', runOpts.output === 'ignore' ? 'ignore' : 'pipe']
				}),
				_capturePromise;

			if ( runOpts.output === 'capture' ) {
				var stream = child.stdout;

				if ( _captureArray ) {
					stream.setEncoding('utf8');
				}

				_pipes.forEach(function(pipe) {
					stream = stream.pipe(pipe);
				});

				if ( _captureArray ) {
					_capturePromise = streamToArray(stream);
				} else {
					_capturePromise = getRawBody(stream, {encoding: runOpts.encoding});
				}
			} else if ( runOpts.output === 'pass' ) {
				child.stdout
					.pipe(new LineWrapper({ prefix: runOpts.prefix || '' }))
					.pipe(process.stdout);
			}

			if ( runOpts.output !== 'ignore' && !runOpts.silenceErrors ) {
				child.stderr
					.pipe(new LineWrapper({ prefix: runOpts.prefix || '' }))
					.pipe(process.stderr);
			}

			child.on('error', function(err) {
				reject(err);
			});

			child.on('close', function(code) {
				if ( _capturePromise ) {
					_capturePromise
						.then(function(output) {
							return {
								proc: child,
								code: code,
								output: output
							};
						})
						.then(resolve, reject);
				} else {
					resolve({
						proc: child,
						code: code
					});
				}
			});
		});
	}

	return {
		push: function(arg) {
			args.push(arg);
			return this;
		},
		pipe: function(stream) {
			_pipes.push(stream);
			return this;
		},
		ok: function(opts) {
			opts = normalizeOptions(opts);
			opts.output = 'ignore';
			return run(opts)
				.then(function(c) {
					return c.code === 0;
				});
		},
		pass: function(opts) {
			opts = normalizeOptions(opts);
			opts.output = 'pass';
			return run(opts)
				.then(function(c) {
					if ( c.code === 0 ) {
						return true;
					} else {
						error(opts.prefix + fmt('git returned exit code %d', c.code), c.code);
					}
				});
		},
		capture: function(opts) {
			opts = normalizeOptions(opts);
			opts.output = 'capture';
			return run(opts)
				.then(function(c) {
					if ( c.code === 0 ) {
						return c.output;
					} else {
						error(opts.prefix + fmt('git returned exit code %d', c.code), c.code);
					}
				});
		},
		oneline: function(opts) {
			opts = normalizeOptions(opts);
			opts.encoding = 'utf8';
			return this.capture(opts)
				.then(function(text) {
					return String(text).replace(/\n+$/, '');
				});
		},
		array: function() {
			_captureArray = true;
			_inputEncoding = 'utf8';
			return this.capture();
		}
	};
}
