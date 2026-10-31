const { buildSync } = require('esbuild');
buildSync({ entryPoints: ['electron/main.ts'], bundle: true, platform: 'node', format: 'cjs', outfile: 'build/electron/main.cjs', external: ['electron'], sourcemap: true });
buildSync({ entryPoints: ['electron/preload.ts'], bundle: true, platform: 'node', format: 'cjs', outfile: 'build/electron/preload.cjs', external: ['electron'] });
