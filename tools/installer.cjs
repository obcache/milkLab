const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const compiler = process.env.ISCC || ['C:/Program Files (x86)/Inno Setup 6/ISCC.exe', 'C:/Program Files/Inno Setup 6/ISCC.exe'].find(file => fs.existsSync(file));
if (!compiler) throw new Error('Install Inno Setup 6 or set ISCC to ISCC.exe.');
if (!fs.existsSync('dist/win-unpacked/milkLab.exe')) throw new Error('Run npm run package first.');
execFileSync(compiler, [path.resolve('installer/milkLab.iss')], { stdio: 'inherit', windowsHide: true });
