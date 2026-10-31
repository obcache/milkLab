const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const source = path.resolve(process.env.PROJECTM_SOURCE || '../projectm');
if (!fs.existsSync(path.join(source, 'CMakeLists.txt'))) throw new Error('Set PROJECTM_SOURCE to your projectM source checkout.');
require('./update-capabilities.cjs')(source);
function run(exe, args) { execFileSync(exe, args, { stdio: 'inherit', windowsHide: true }); }
run('emcmake', ['cmake', '-S', 'native', '-B', 'build/projectm-web', '-G', 'Ninja', '-DCMAKE_BUILD_TYPE=Release', `-DPROJECTM_SOURCE_DIR=${source.replace(/\\/g, '/')}`]);
run('cmake', ['--build', 'build/projectm-web', '--target', 'milklab-projectm', '--parallel', '6']);
fs.mkdirSync('public/engine', { recursive: true });
for (const ext of ['mjs', 'wasm']) fs.copyFileSync(`build/projectm-web/milklab-projectm.${ext}`, `public/engine/milklab-projectm.${ext}`);
for (const name of ['LICENSE.txt', 'COPYING']) if (fs.existsSync(path.join(source, name))) fs.copyFileSync(path.join(source, name), `public/engine/projectM-${name}`);
const revision = execFileSync('git', ['-C', source, 'rev-parse', 'HEAD'], { encoding: 'utf8', windowsHide: true }).trim();
fs.writeFileSync('public/engine/provenance.json', JSON.stringify({ engine: 'projectM', version: '4.2.0', source: 'https://github.com/projectM-visualizer/projectm', revision, webgl: 2, build: 'npm run build:projectm', license: 'LGPL-2.1-or-later' }, null, 2) + '\n');
