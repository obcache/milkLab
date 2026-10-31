#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const files = require('./version-files');
const root = process.cwd(), args = process.argv.slice(2);
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const version = String((args[0] === '--set' ? args[1] : args[0]) || pkg.version);
if (!/^\d+\.\d+\.\d+(?:-[\w.-]+)?(?:\+[\w.-]+)?$/.test(version)) throw new Error(`Invalid semver: ${version}`);
for (const relative of files) {
  const file = path.join(root, relative);
  if (!fs.existsSync(file)) continue;
  const previous = fs.readFileSync(file, 'utf8');
  let next;
  if (relative.endsWith('.json')) {
    const value = JSON.parse(previous); value.version = version;
    if (relative === 'package-lock.json' && value.packages?.['']) value.packages[''].version = version;
    next = JSON.stringify(value, null, 2) + '\n';
  } else if (relative.endsWith('.iss')) next = previous.replace(/(#define\s+MyAppVersion\s+")[^"]+(")/g, `$1${version}$2`);
  else next = version + '\n';
  if (previous !== next) { fs.writeFileSync(file, next); console.log(`[version-sync] ${relative}: ${version}`); }
}
console.log(`[version-sync] Version: ${version}`);
