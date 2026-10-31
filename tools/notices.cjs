const fs = require('node:fs');
const path = require('node:path');
const lock = require('../package-lock.json');
fs.mkdirSync('public/licenses', { recursive: true });
let text = 'milkLab bundled npm dependencies\n\n';
for (const [location, data] of Object.entries(lock.packages).filter(([location, data]) => location && !data.dev)) {
  const pkg = JSON.parse(fs.readFileSync(path.join(location, 'package.json'), 'utf8'));
  text += `\n===== ${pkg.name} ${pkg.version} (${pkg.license}) =====\n`;
  for (const file of fs.readdirSync(location).filter(file => /^(licen[sc]e|copying|notice)(?:\.|$)/i.test(file))) {
    const full = path.join(location, file);
    if (fs.statSync(full).isFile()) text += '\n' + fs.readFileSync(full, 'utf8') + '\n';
  }
}
fs.writeFileSync('public/licenses/npm.txt', text);
const source = path.resolve(process.env.PROJECTM_SOURCE || '../projectm');
let native = 'projectM native dependency notices. Complete corresponding sources are included in the desktop package under rebuild/.\n\n';
for (const file of ['COPYING', 'LICENSE.txt', 'vendor/hlslparser/LICENSE', 'vendor/projectm-eval/LICENSE.md']) native += `\n===== ${file} =====\n` + fs.readFileSync(path.join(source, file), 'utf8') + '\n';
const stb = fs.readFileSync(path.join(source, 'vendor/stb_image/stb_image.h'), 'utf8');
native += '\n===== stb_image =====\n' + stb.slice(stb.lastIndexOf('ALTERNATIVE A - MIT License'));
native += '\n===== image_DXT =====\nJonathan Dummer, 2007. Public domain.\n';
native += '\n===== GLAD / Khronos =====\nSPDX-License-Identifier: (WTFPL OR CC0-1.0) AND Apache-2.0. Generated source and Khronos headers with embedded notices are in rebuild/projectM-source.tar.\n';
for (const file of ['vendor/stb_image/wfETC.h', 'vendor/glad/include/KHR/khrplatform.h']) if (fs.existsSync(path.join(source, file))) native += `\n===== ${file} header notice =====\n` + fs.readFileSync(path.join(source, file), 'utf8').split('\n').slice(0, 65).join('\n') + '\n';
fs.writeFileSync('public/licenses/native.txt', native);
console.log('[notices] Generated bundled dependency licenses.');
