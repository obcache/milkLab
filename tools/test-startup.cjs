const { _electron: electron } = require('playwright');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');

(async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'milklab-startup-'));
  const appData = path.join(root, 'Roaming');
  const foreign = path.join(appData, 'Electron');
  const owned = path.join(appData, 'milkLab');
  const override = path.join(root, 'custom milkLab state');
  const library = path.join(root, 'library');
  await fs.mkdir(foreign, { recursive: true });
  const foreignContent = '{"otherProject":true,"theme":"dark"}\n';
  await fs.writeFile(path.join(foreign, 'settings.json'), foreignContent);
  // Reproduce launching a built entry directly, without package-derived identity.
  const harness = path.join(root, 'launch.cjs');
  await fs.writeFile(harness, [
    "const { app } = require('electron');",
    "app.setName('Electron');",
    `app.setPath('appData', ${JSON.stringify(appData)});`,
    `app.setPath('userData', ${JSON.stringify(foreign)});`,
    `app.setPath('sessionData', ${JSON.stringify(foreign)});`,
    `require(${JSON.stringify(path.resolve('build/electron/main.cjs'))});`,
  ].join('\n'));

  async function launch(stateRoot, expected, expectedFontSize) {
    const env = { ...process.env, MILKLAB_STORAGE_ROOT: library };
    delete env.ELECTRON_RUN_AS_NODE;
    delete env.MILKLAB_DEV_URL;
    delete env.MILKLAB_USER_DATA;
    if (stateRoot) env.MILKLAB_USER_DATA = stateRoot;
    const application = await electron.launch({ args: [`--user-data-dir=${foreign}`, harness], env, timeout: 30000 });
    try {
      const window = await application.firstWindow();
      await window.getByRole('tab', { name: 'Spectral drift.milk' }).waitFor({ timeout: 30000 });
      const runtime = await application.evaluate(({ app }) => ({ name: app.getName(), userData: app.getPath('userData'), sessionData: app.getPath('sessionData') }));
      assert.deepEqual(runtime, { name: 'milkLab', userData: expected, sessionData: path.join(expected, 'chromium') });
      const snapshot = await window.evaluate(() => window.milkLab.bootstrap());
      assert.equal(snapshot.settings.fontSize, expectedFontSize);
      assert.equal(snapshot.settings.storageRoot, library);
      await window.evaluate(settings => window.milkLab.updateSettings({ ...settings, fontSize: 15 }), snapshot.settings);
      assert.equal(JSON.parse(await fs.readFile(path.join(expected, 'settings.json'), 'utf8')).fontSize, 15);
    } finally { await application.close(); }
    assert.equal(await fs.readFile(path.join(foreign, 'settings.json'), 'utf8'), foreignContent);
    assert.deepEqual(await fs.readdir(foreign), ['settings.json']);
  }
  try {
    await launch(undefined, owned, 13);
    await launch(undefined, owned, 15); // Existing milkLab preferences survive restart.
    await launch(override, override, 13); // Explicit QA/custom overrides still work.
    assert.equal(JSON.parse(await fs.readFile(path.join(owned, 'settings.json'), 'utf8')).fontSize, 15);
    console.log('[test:startup] Dedicated default path, existing preferences, explicit override and foreign-data preservation passed.');
  } finally {
    // Only remove the unique directory created by this test, beneath the OS temp root.
    const relative = path.relative(path.resolve(os.tmpdir()), path.resolve(root));
    if (relative.startsWith('..') || path.isAbsolute(relative) || !path.basename(root).startsWith('milklab-startup-')) throw new Error('Unexpected test cleanup path.');
    await fs.rm(root, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
