const { chromium } = require('playwright');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const { spawn, execFileSync } = require('node:child_process');
const { startServer } = require('./dev.cjs');

// Launch the real npm command. Attaching via CDP does not inject Playwright's
// Electron loader, Chromium switches, or replacement ready-event lifecycle.
(async () => {
  assert(process.env.npm_execpath, 'Run this check through npm run test:dev.');
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'milklab-dev-smoke-'));
  const env = { ...process.env, MILKLAB_USER_DATA: path.join(root, 'state'), MILKLAB_STORAGE_ROOT: path.join(root, 'library'), MILKLAB_VITE_CACHE_DIR: path.join(root, 'vite-cache') };
  delete env.ELECTRON_RUN_AS_NODE;
  delete env.MILKLAB_DEV_URL;
  let command;
  let browser;
  let output = '';
  let exit;
  async function until(check, label, timeout = 30000) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const result = check();
      if (result) return result;
      if (exit) throw new Error(`${label}: dev exited ${JSON.stringify(exit)}\n${output}`);
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    throw new Error(`${label}: timed out\n${output}`);
  }
  try {
    // An occupied port must fail instead of starting another desktop against it.
    const occupied = await startServer({ cacheDir: path.join(root, 'occupied-cache') });
    try { await assert.rejects(startServer({ cacheDir: path.join(root, 'other-cache') }), /5173.*already in use/); }
    finally { await occupied.close(); }

    for (const phase of ['cold', 'warm']) {
      output = ''; exit = undefined;
      command = spawn(process.execPath, [process.env.npm_execpath, 'run', 'dev', '--', '--inspect-renderer'], { env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
      command.stdout.on('data', data => { output += String(data); });
      command.stderr.on('data', data => { output += String(data); });
      command.once('error', error => { exit = { error: String(error) }; });
      command.once('exit', (code, signal) => { exit = { code, signal }; });
      await until(() => /\[milkLab dev\] Native window (visible|hidden)\./.test(output), 'Native window startup');
      // This assertion runs BEFORE attaching a debugger or taking a screenshot.
      assert(output.includes('[milkLab dev] Native window visible.'), `The ordinary dev command hid the native window.\n${output}`);
      const endpoint = await until(() => output.match(/DevTools listening on (ws:\/\/127\.0\.0\.1:\d+\/\S+)/)?.[1], 'Loopback inspection endpoint');
      browser = await chromium.connectOverCDP(endpoint);
      const context = browser.contexts()[0];
      const window = context.pages()[0] || await context.waitForEvent('page');
      const errors = [];
      window.on('pageerror', error => errors.push(error.message));
      window.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      await window.getByRole('tab', { name: 'Spectral drift.milk' }).waitFor({ timeout: 30000 });
      await window.getByRole('textbox', { name: 'Preset code editor' }).waitFor();
      await window.getByText('projectM · WebGL2', { exact: true }).waitFor({ timeout: 30000 });
      assert.equal(window.url(), 'http://127.0.0.1:5173/');
      assert.match(await window.title(), /milkLab/);
      assert.equal(await window.locator('vite-error-overlay').count(), 0);
      assert.equal(await window.evaluate(() => typeof window.milkLab?.bootstrap), 'function');
      assert.equal(await window.getByText('Browser preview · localStorage', { exact: true }).count(), 0);
      await window.getByRole('listbox', { name: 'Managed preset library' }).getByRole('option').filter({ hasText: 'Orbit study.milk' }).dblclick();
      await window.getByRole('tab', { name: 'Orbit study.milk' }).waitFor();
      await window.getByRole('button', { name: 'File', exact: true }).click();
      await window.getByRole('button', { name: /^Settings…/ }).click();
      await window.getByLabel('Editor font size').fill('14');
      await window.getByRole('button', { name: 'Save settings', exact: true }).click();
      await window.getByRole('dialog').waitFor({ state: 'hidden' });
      assert.equal(JSON.parse(await fs.readFile(path.join(root, 'state/settings.json'), 'utf8')).fontSize, 14);
      await window.reload({ waitUntil: 'domcontentloaded' });
      await window.getByRole('tab', { name: 'Spectral drift.milk' }).waitFor();
      await window.getByRole('textbox', { name: 'Preset code editor' }).waitFor();
      await window.getByText('projectM · WebGL2', { exact: true }).waitFor();
      await window.getByText('Drafts saved', { exact: true }).waitFor();
      await window.waitForFunction(() => Number.parseInt(document.querySelector('.fps')?.textContent || '0', 10) > 0);
      await window.screenshot({ path: path.join(root, `${phase}.png`) });
      assert.deepEqual(errors, []);
      assert(!/\[milkLab (renderer|preload)\]/.test(output), output);
      // Deliberate fixture follows the clean-console assertions.
      const sentinel = 'milkLab diagnostic fixture';
      await window.evaluate(message => console.error(message), sentinel);
      await until(() => output.includes(`[milkLab renderer] ${sentinel}`), 'Terminal diagnostics');
      await window.getByTitle('Close window', { exact: true }).click();
      // Normal close must also stop the Vite server and npm command.
      const deadline = Date.now() + 10000;
      while (!exit && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 50));
      assert.deepEqual(exit, { code: 0, signal: null }, output);
      await browser.close(); browser = undefined;
      command = undefined;
      console.log(`[test:dev] ${phase}: real npm run dev, native visibility before attachment, editor, WebGL2 frames, disk settings, reload, diagnostics and clean close passed.`);
    }
    console.log(`[test:dev] Evidence: ${root}`);
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (command && !exit) {
      // Only this test's isolated command tree is terminated on failure.
      if (process.platform === 'win32') execFileSync('taskkill', ['/PID', String(command.pid), '/T', '/F'], { windowsHide: true, stdio: 'pipe' });
      else command.kill('SIGKILL');
    }
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
