import { app, BrowserWindow, dialog, ipcMain, Menu } from 'electron';
import fs from 'node:fs/promises';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { Storage, atomicWrite, parsePlaylist } from './storage';
import { loadEvaluator } from './evaluator';
import { diagnosePreset } from '../src/domain/diagnostics';
import { documentSchema, idSchema, playlistSchema, settingsSchema, sourceSchema, workspaceSchema } from '../src/shared/contracts';

let window: BrowserWindow;
let storage: Storage;
let readyToClose = false;
let pending: Promise<unknown> = Promise.resolve();
const devURL = process.env.MILKLAB_DEV_URL;
const stateRoot = process.env.MILKLAB_USER_DATA;
// Direct development launches have Electron's generic name/path. Choose our
// identity before taking the single-instance lock or initializing any session.
app.setName('milkLab');
const userData = stateRoot ? path.resolve(stateRoot) : path.join(app.getPath('appData'), 'milkLab');
const sessionData = path.join(userData, 'chromium');
mkdirSync(sessionData, { recursive: true });
app.setPath('userData', userData);
app.setPath('sessionData', sessionData);
if (!app.requestSingleInstanceLock()) app.quit();
app.on('second-instance', () => { window?.restore(); window?.focus(); });

function handle(name: string, fn: (...args: any[]) => unknown, serialize = true) {
  ipcMain.handle(name, async (event, ...args) => {
    if (event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame) throw new Error('Untrusted IPC sender.');
    if (!serialize) return fn(...args);
    const result = pending.then(() => fn(...args));
    pending = result.catch(() => {});
    return result;
  });
}
async function listPresets(folder: string): Promise<string[]> {
  const files: string[] = [];
  async function walk(dir: string, depth: number) {
    if (depth > 30) throw new Error('Folder nesting exceeds the import limit.');
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      if (files.length >= 10000) throw new Error('Import at most 10,000 presets at a time.');
      if (entry.isSymbolicLink()) continue;
      const target = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(target, depth + 1);
      else if (/\.milk$/i.test(entry.name)) files.push(target);
    }
  }
  await walk(folder, 0);
  return files;
}
async function start() {
  await app.whenReady();
  Menu.setApplicationMenu(null);
  const enginePath = path.join(__dirname, devURL ? '../../public/engine/milklab-projectm.mjs' : '../renderer/engine/milklab-projectm.mjs');
  const evaluate = await loadEvaluator(enginePath);
  storage = new Storage(app.getPath('userData'), process.env.MILKLAB_STORAGE_ROOT || path.join(app.getPath('documents'), 'milkLab'), evaluate);
  let initialized = false;
  handle('bootstrap', async () => { if (!initialized) { await storage.initialize(); initialized = true; } return storage.snapshot(); });
  handle('lint', (content: unknown) => diagnosePreset(sourceSchema.parse(content), evaluate), false);
  handle('import-presets', async (folder: unknown) => {
    const isFolder = z.boolean().parse(folder);
    const selection = await dialog.showOpenDialog(window, { title: isFolder ? 'Import preset folder' : 'Import .milk presets', properties: isFolder ? ['openDirectory'] : ['openFile', 'multiSelections'], filters: [{ name: 'MilkDrop presets', extensions: ['milk'] }] });
    if (selection.canceled) return { imported: [], rejected: [] };
    return storage.importFiles(isFolder ? await listPresets(selection.filePaths[0]) : selection.filePaths);
  });
  handle('read-preset', (id: unknown) => storage.readPreset(idSchema.parse(id)));
  handle('save-document', async (input: unknown, saveAs: unknown) => {
    const doc = documentSchema.parse(input);
    if (z.boolean().parse(saveAs) || !doc.path) {
      const result = await dialog.showSaveDialog(window, { title: 'Save preset', defaultPath: doc.name, filters: [{ name: 'MilkDrop preset', extensions: ['milk'] }] });
      if (result.canceled || !result.filePath) return null;
      return storage.saveDocument(doc, result.filePath);
    }
    return storage.saveDocument(doc);
  });
  handle('persist-workspace', (input: unknown) => storage.persistWorkspace(workspaceSchema.parse(input)));
  handle('choose-storage', async () => {
    const result = await dialog.showOpenDialog(window, { title: 'Managed preset storage', properties: ['openDirectory', 'createDirectory'] });
    return result.canceled ? null : result.filePaths[0];
  });
  handle('update-settings', (input: unknown) => storage.updateSettings(settingsSchema.parse(input)));
  handle('save-playlist', (input: unknown) => storage.savePlaylist(playlistSchema.parse(input)));
  handle('add-preset-to-playlist', (playlistId: unknown, presetId: unknown) => storage.addPresetToPlaylist(idSchema.parse(playlistId), idSchema.parse(presetId)));
  handle('create-playlist', (name: unknown) => storage.createPlaylist(z.string().min(1).max(80).parse(name)));
  handle('import-playlist', async () => {
    const result = await dialog.showOpenDialog(window, { title: 'Import plain text playlist', properties: ['openFile'], filters: [{ name: 'MilkDrop playlist', extensions: ['txt', 'dat', 'm3u'] }] });
    if (result.canceled) return null;
    const source = result.filePaths[0];
    if ((await fs.stat(source)).size > 10 * 1024 * 1024) throw new Error('Playlist exceeds 10 MiB.');
    const paths = parsePlaylist(await fs.readFile(source, 'utf8'), path.dirname(source));
    const playlist = await storage.createPlaylist(path.basename(source, path.extname(source)));
    return storage.savePlaylist({ ...playlist, paths });
  });
  handle('export-playlist', async (id: unknown) => {
    const file = storage.playlistPath(idSchema.parse(id));
    const result = await dialog.showSaveDialog(window, { defaultPath: path.basename(file), filters: [{ name: 'Plain text playlist', extensions: ['txt'] }] });
    if (result.canceled || !result.filePath) return false;
    await atomicWrite(result.filePath, await fs.readFile(file, 'utf8'));
    return true;
  });
  handle('export-workspace', async (input: unknown) => {
    const workspace = workspaceSchema.parse(input);
    const result = await dialog.showSaveDialog(window, { defaultPath: 'milkLab-workspace.json', filters: [{ name: 'milkLab workspace v1', extensions: ['json'] }] });
    if (result.canceled || !result.filePath) return false;
    await atomicWrite(result.filePath, JSON.stringify(workspace, null, 2) + '\n');
    return true;
  });
  handle('import-workspace', async () => {
    const result = await dialog.showOpenDialog(window, { properties: ['openFile'], filters: [{ name: 'milkLab workspace v1', extensions: ['json'] }] });
    if (result.canceled) return null;
    const file = result.filePaths[0];
    if ((await fs.stat(file)).size > 30 * 1024 * 1024) throw new Error('Workspace exceeds 30 MiB.');
    const parsed = workspaceSchema.parse(JSON.parse(await fs.readFile(file, 'utf8')));
    if (new Set(parsed.documents.map(d => d.id)).size !== parsed.documents.length) throw new Error('Workspace document IDs must be unique.');
    const ids = new Map(parsed.documents.map(doc => [doc.id, randomUUID()]));
    return { ...parsed, activeId: ids.get(parsed.activeId || '') || null, documents: parsed.documents.map(doc => ({ ...doc, id: ids.get(doc.id), path: null, dirty: true })) };
  });
  window = new BrowserWindow({ width: 1600, height: 1000, minWidth: 1060, minHeight: 680, backgroundColor: '#1e1e1e', frame: false, title: 'milkLab', show: false, webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, sandbox: true, nodeIntegration: false, spellcheck: false } });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', event => event.preventDefault());
  if (devURL) {
    // A renderer failure should be visible in the terminal that launched dev.
    window.webContents.on('console-message', event => {
      if (event.level === 'error') console.error(`[milkLab renderer] ${event.message} (${event.sourceId}:${event.lineNumber})`);
    });
    window.webContents.on('preload-error', (_event, preload, error) => console.error(`[milkLab preload] ${preload}`, error));
    window.webContents.on('did-fail-load', (_event, code, description, url, isMainFrame) => {
      if (isMainFrame) console.error(`[milkLab renderer] Failed to load ${url}: ${description} (${code})`);
    });
    window.webContents.on('render-process-gone', (_event, details) => console.error('[milkLab renderer] Process exited:', details));
    window.webContents.on('before-input-event', (event, input) => {
      if (input.type === 'keyDown' && (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i'))) {
        event.preventDefault();
        window.webContents.toggleDevTools();
      }
    });
    console.log(`[milkLab dev] Loading ${devURL}; Ctrl+Shift+I or F12 opens DevTools.`);
  }
  window.webContents.session.setPermissionRequestHandler((_web, permission, callback) => callback(permission === 'media'));
  ipcMain.on('window-control', (event, action: unknown) => {
    if (event.sender !== window.webContents) return;
    if (action === 'minimize') window.minimize();
    if (action === 'maximize') window.isMaximized() ? window.unmaximize() : window.maximize();
    if (action === 'close') window.close();
    if (action === 'close-ready') { readyToClose = true; window.close(); }
  });
  window.on('close', event => { if (!readyToClose) { event.preventDefault(); window.webContents.send('closing'); } });
  window.once('ready-to-show', () => {
    window.show();
    if (devURL) console.log(`[milkLab dev] Native window ${window.isVisible() ? 'visible' : 'hidden'}.`);
  });
  if (devURL) {
    if (devURL !== 'http://127.0.0.1:5173') throw new Error('Unexpected development URL.');
    await window.loadURL(devURL);
  } else await window.loadFile(path.join(__dirname, '../renderer/index.html'));
}
start().catch(error => { dialog.showErrorBox('milkLab could not start', String(error)); app.exit(1); });
app.on('window-all-closed', () => app.quit());
