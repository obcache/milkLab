const { spawn } = require('node:child_process');
// Shared with test:dev so the smoke test exercises the same server startup.
async function startServer(overrides = {}) {
  const { createServer } = await import('vite');
  const server = await createServer(overrides);
  try {
    await server.listen();
    return server;
  } catch (error) {
    await server.close();
    throw error;
  }
}

async function start() {
  require('./build-electron.cjs');
  // Await this server's readiness. Polling a port could accept an old/foreign
  // server, and previously launched Electron even after Vite failed to start.
  const server = await startServer(process.env.MILKLAB_VITE_CACHE_DIR ? { cacheDir: process.env.MILKLAB_VITE_CACHE_DIR } : {});
  server.printUrls();
  const env = { ...process.env, MILKLAB_DEV_URL: 'http://127.0.0.1:5173' };
  delete env.ELECTRON_RUN_AS_NODE;
  // Electron is the interactive GUI, so Windows must not hide its native window.
  // Optional loopback inspection attaches to this ordinary launch, without an
  // automation loader replacing Chromium flags or the app's ready lifecycle.
  const inspection = process.argv.includes('--inspect-renderer') ? ['--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0'] : [];
  const desktop = spawn(require('electron'), [...inspection, 'build/electron/main.cjs'], { stdio: 'inherit', env, windowsHide: false });
  let stopping = false;
  async function stop(code) {
    if (stopping) return;
    stopping = true;
    desktop.kill();
    await server.close();
    process.exitCode = code;
  }
  desktop.once('error', error => { console.error('[milkLab dev] Electron failed to start:', error); void stop(1); });
  desktop.once('exit', (code, signal) => { void stop(code ?? (signal ? 1 : 0)); });
  process.once('SIGINT', () => { void stop(0); });
  process.once('SIGTERM', () => { void stop(0); });
}

module.exports = { startServer };
if (require.main === module) start().catch(error => { console.error('[milkLab dev] Startup failed:', error); process.exitCode = 1; });
