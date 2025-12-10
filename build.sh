#!/usr/bin/env bash
set -e
rm -rf dist
mkdir -p dist
npm ci
npm run build
echo "Build finished: dist/app.obf.js"
