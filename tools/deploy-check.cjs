const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const pkg = require('../package.json');
const root = 'dist/win-unpacked';
for (const file of ['milkLab.exe', 'resources/app/package.json', 'resources/app/electron/main.cjs', 'resources/app/electron/preload.cjs', 'resources/app/renderer/index.html', 'resources/app/renderer/engine/milklab-projectm.mjs', 'resources/app/renderer/engine/milklab-projectm.wasm', 'resources/app/renderer/engine/projectM-LICENSE.txt', 'resources/app/rebuild/projectM-source.tar', 'resources/app/rebuild/projectM-eval-source.tar', 'resources/app/THIRD_PARTY_NOTICES.md']) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing shipped artifact: ${file}`);
}
if (JSON.parse(fs.readFileSync(path.join(root, 'resources/app/package.json'))).version !== pkg.version) throw new Error('Packaged app version is stale.');
for (const forbidden of ['drafts', 'settings.json', 'workspace.json', 'library.json', '.env', 'node_modules']) if (fs.existsSync(path.join(root, 'resources/app', forbidden))) throw new Error(`Runtime/development data found in package: ${forbidden}`);
const digest = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const runtimeFiles = ['electron/main.cjs', 'electron/preload.cjs', 'renderer/index.html', ...fs.readdirSync('build/renderer/assets').map(file => `renderer/assets/${file}`), 'renderer/engine/milklab-projectm.mjs', 'renderer/engine/milklab-projectm.wasm'];
for (const file of runtimeFiles) if (digest(path.join('build', file)) !== digest(path.join(root, 'resources/app', file))) throw new Error(`Packaged runtime differs from build: ${file}`);
console.log('[deploy:check] Windows artifact, engine, source archives and data boundaries verified.');
