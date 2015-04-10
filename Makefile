
.PHONY: test
test:
	npm test

.PHONY: clean-test
clean-test:
	-rm -rf test/.tmp

.PHONY: lcov
lcov: clean-coverage
	npm run-script lcov

.PHONY: coverage
coverage: clean-coverage
	npm run-script coverage

.PHONY: clean
clean: clean-test clean-coverage

.PHONY: clean-coverage
clean-coverage:
	-rm -rf lcov.info
	-rm -rf lcov-report
	-rm -rf html-report
