import { it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
it.each([['patch', '1.2.4'], ['minor', '1.3.0'], ['major', '2.0.0']])('synchronizes %s bumps only across first-party versions', (mode, expected) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'milklab-version-'));
  try {
    fs.mkdirSync(path.join(root, 'tools/project-mgmt'), { recursive: true }); fs.mkdirSync(path.join(root, 'installer')); fs.mkdirSync(path.join(root, 'vendor'));
    for (const script of ['version-files.js', 'version-sync.js', 'version-show.js', 'version-bump.js']) fs.copyFileSync(`tools/project-mgmt/${script}`, path.join(root, 'tools/project-mgmt', script));
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'test', version: '1.2.3' }));
    fs.writeFileSync(path.join(root, 'package-lock.json'), JSON.stringify({ version: '1.2.3', packages: { '': { version: '1.2.3' }, 'node_modules/third-party': { version: '9.9.9' } } }));
    fs.writeFileSync(path.join(root, 'VERSION'), '1.2.3'); fs.writeFileSync(path.join(root, 'installer/milkLab.iss'), '#define MyAppVersion "1.2.3"'); fs.writeFileSync(path.join(root, 'vendor/package.json'), '{"version":"9.9.9"}');
    execFileSync(process.execPath, ['tools/project-mgmt/version-bump.js', mode], { cwd: root, stdio: 'pipe', windowsHide: true });
    execFileSync(process.execPath, ['tools/project-mgmt/version-show.js'], { cwd: root, stdio: 'pipe', windowsHide: true });
    expect(JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version).toBe(expected);
    expect(fs.readFileSync(path.join(root, 'installer/milkLab.iss'), 'utf8')).toContain(`"${expected}"`);
    const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
    expect(lock.packages[''].version).toBe(expected); expect(lock.packages['node_modules/third-party'].version).toBe('9.9.9');
    expect(JSON.parse(fs.readFileSync(path.join(root, 'vendor/package.json'), 'utf8')).version).toBe('9.9.9');
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
