#!/bin/bash
set -e

git init .

echo "Test\
====\
This is a dummy repository for testing." > README.md

git add README.md

git commit -m "First test commit"

git tag v0.0.1
