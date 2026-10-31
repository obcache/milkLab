const fs = require('node:fs/promises');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { packager } = require('@electron/packager');
const pkg = require('../package.json');
const root = path.resolve(__dirname, '..');
function run(executable, args) { return execFileSync(executable, args, { stdio: 'inherit', windowsHide: true }); }
(async () => {
  process.chdir(root);
  require('./notices.cjs');
  run(process.execPath, ['node_modules/typescript/bin/tsc', '--noEmit']);
  run(process.execPath, ['node_modules/vite/bin/vite.js', 'build']);
  require('./build-electron.cjs');
  const staging = path.join(root, 'build/package-input');
  // This resolved, fixed build subdirectory is exclusively owned by packaging.
  if (path.relative(root, staging) !== path.join('build', 'package-input')) throw new Error('Unexpected package staging path.');
  await fs.rm(staging, { recursive: true, force: true });
  await fs.mkdir(staging, { recursive: true });
  for (const folder of ['electron', 'renderer']) await fs.cp(path.join(root, 'build', folder), path.join(staging, folder), { recursive: true, filter: file => !file.endsWith('.map') });
  await fs.writeFile(path.join(staging, 'package.json'), JSON.stringify({ name: pkg.name, productName: 'milkLab', version: pkg.version, description: pkg.description, main: 'electron/main.cjs', private: true }));
  await fs.copyFile('THIRD_PARTY_NOTICES.md', path.join(staging, 'THIRD_PARTY_NOTICES.md'));
  const source = path.resolve(process.env.PROJECTM_SOURCE || '../projectm'), provenance = require('../public/engine/provenance.json');
  const git = args => execFileSync('git', ['-C', source, ...args], { encoding: 'utf8', windowsHide: true }).trim();
  if (git(['rev-parse', 'HEAD']) !== provenance.revision || git(['status', '--porcelain', '--untracked-files=no'])) throw new Error('projectM source must be clean and match the compiled engine provenance. Rebuild with npm run build:projectm.');
  const rebuild = path.join(staging, 'rebuild'); await fs.mkdir(rebuild);
  run('git', ['-C', source, 'archive', '--format=tar', `--output=${path.join(rebuild, 'projectM-source.tar')}`, 'HEAD']);
  run('git', ['-C', path.join(source, 'vendor/projectm-eval'), 'archive', '--format=tar', `--output=${path.join(rebuild, 'projectM-eval-source.tar')}`, 'HEAD']);
  await fs.cp('native', path.join(rebuild, 'native'), { recursive: true });
  await fs.copyFile('tools/build-projectm.cjs', path.join(rebuild, 'build-projectm.cjs'));
  await fs.writeFile(path.join(rebuild, 'README.txt'), 'projectM LGPL-2.1-or-later rebuild materials\n\nExtract projectM-source.tar into a projectm source folder. Extract projectM-eval-source.tar into projectm/vendor/projectm-eval. Install Emscripten, CMake and Ninja. Configure this native directory with emcmake cmake -S native -B build -G Ninja -DPROJECTM_SOURCE_DIR=<absolute projectm source path>. Then cmake --build build --target milklab-projectm --parallel 6. Replace renderer/engine/milklab-projectm.mjs and .wasm with the resulting files. No first-party source changes to projectM were made.\n');
  const output = await packager({ dir: staging, out: path.join(root, 'dist'), name: 'milkLab', platform: 'win32', arch: 'x64', overwrite: true, asar: false, prune: false, appVersion: pkg.version, buildVersion: pkg.version, executableName: 'milkLab', win32metadata: { ProductName: 'milkLab', FileDescription: pkg.description } });
  const destination = path.join(root, 'dist/win-unpacked');
  if (path.relative(root, destination) !== path.join('dist', 'win-unpacked')) throw new Error('Unexpected package destination.');
  await fs.rm(destination, { recursive: true, force: true });
  await fs.rename(output[0], destination);
  console.log(`[package] ${destination}`);
})().catch(error => { console.error(error); process.exitCode = 1; });
