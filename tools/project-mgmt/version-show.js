#!/usr/bin/env node
const fs = require('node:fs');
const files = require('./version-files');
const expected = JSON.parse(fs.readFileSync('package.json', 'utf8')).version;
for (const file of files) {
  if (!fs.existsSync(file)) { console.error(`${file}: MISSING`); process.exitCode = 1; continue; }
  const content = fs.readFileSync(file, 'utf8');
  const version = file.endsWith('.json') ? JSON.parse(content).version : file.endsWith('.iss') ? /#define\s+MyAppVersion\s+"([^"]+)"/.exec(content)?.[1] : content.trim();
  console.log(`${file}: ${version}`);
  if (version !== expected) process.exitCode = 1;
  if (file === 'package-lock.json' && JSON.parse(content).packages?.['']?.version !== expected) process.exitCode = 1;
}
