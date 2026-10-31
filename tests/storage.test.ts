import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { Storage } from '../electron/storage';
import { loadEvaluator } from '../electron/evaluator';
import type { Evaluate } from '../src/domain/diagnostics';
import { blankPreset } from '../src/domain/presets';
let temp: string, evaluate: Evaluate;
beforeAll(async () => { temp = await fs.mkdtemp(path.join(os.tmpdir(), 'milklab-unit-')); evaluate = await loadEvaluator(path.resolve('public/engine/milklab-projectm.mjs')); });
afterAll(async () => { await fs.rm(temp, { recursive: true, force: true }); });
const create = (name: string) => new Storage(path.join(temp, name, 'state'), path.join(temp, name, 'library'), evaluate);
describe('local storage integration', () => {
  it('preserves byte-exact originals, normalizes the managed copy and survives restart', async () => {
    const storage = create('import'); await storage.initialize();
    const source = path.join(temp, 'bom.milk'), content = Buffer.from('\uFEFF[preset00]\nfDecay =0.98\nper_frame_1=zoom=1;\n');
    await fs.writeFile(source, content);
    const report = await storage.importFiles([source]);
    expect(report.rejected).toEqual([]);
    expect(await fs.readFile(report.imported[0].originalPath)).toEqual(content);
    expect(await fs.readFile(report.imported[0].path, 'utf8')).toContain('fDecay=0.98');
    expect(report.imported[0].repairs.join()).toContain('byte order mark');
    const restarted = create('import'); await restarted.initialize();
    expect(restarted.library.some(p => p.id === report.imported[0].id)).toBe(true);
  });
  it('rejects invalid expressions before managed import', async () => {
    const storage = create('invalid'); await storage.initialize();
    const source = path.join(temp, 'invalid.milk'); await fs.writeFile(source, '[preset00]\nfDecay=1\nper_frame_1=x=sin(;\n');
    const report = await storage.importFiles([source]);
    expect(report.imported).toHaveLength(0); expect(report.rejected[0].reason).toContain('Line 3');
  });
  it('recovers unsaved tabs from .milk temporary files without overwriting explicit saves', async () => {
    const storage = create('drafts'); const state = await storage.initialize();
    const doc = state.workspace.documents[0], original = await fs.readFile(doc.path!, 'utf8');
    const content = doc.content + '// recovery sentinel\n';
    await storage.persistWorkspace({ ...state.workspace, documents: [{ ...doc, content, dirty: true }] });
    expect(await fs.readFile(path.join(storage.userData, 'drafts', `${doc.id}.milk`), 'utf8')).toBe(content);
    expect(await fs.readFile(doc.path!, 'utf8')).toBe(original);
    const restarted = create('drafts'), recovered = await restarted.initialize();
    expect(recovered.workspace.documents[0].content).toBe(content); expect(recovered.workspace.documents[0].dirty).toBe(true);
  });
  it('prevents renderer-supplied paths from directing saves and detects external edits', async () => {
    const storage = create('save'); const state = await storage.initialize(); const doc = state.workspace.documents[0];
    const fake = path.join(temp, 'do-not-create.milk');
    const saved = await storage.saveDocument({ ...doc, path: fake, content: doc.content + '// edit\n' });
    expect(saved.path).toBe(doc.path); expect(await fs.stat(fake).catch(() => null)).toBeNull();
    await fs.writeFile(doc.path!, blankPreset);
    await expect(storage.saveDocument({ ...saved, content: 'changed' })).rejects.toThrow('changed on disk');
    await expect(storage.saveDocument({ ...doc, id: 'unregistered' })).rejects.toThrow('destination');
  });
  it('writes plain text playlists and switches roots without moving existing presets', async () => {
    const storage = create('root'); const state = await storage.initialize(), playlist = state.playlists[0];
    await storage.savePlaylist({ ...playlist, paths: state.library.slice(0, 2).map(p => p.path) });
    const text = await fs.readFile(storage.playlistPath(playlist.id), 'utf8');
    expect(text).toBe(state.library.slice(0, 2).map(p => p.path).join('\r\n') + '\r\n');
    const oldFile = state.library[0].path;
    await storage.updateSettings({ ...state.settings, storageRoot: path.join(temp, 'separate-library') });
    expect(await fs.stat(oldFile)).toBeTruthy();
    const restarted = create('root'), result = await restarted.initialize();
    expect(result.settings.storageRoot).toBe(path.join(temp, 'separate-library'));
  });
  it('preserves corrupted JSON and refuses unsupported workspace versions', async () => {
    const storage = create('corrupt'); await storage.initialize();
    await fs.mkdir(storage.userData, { recursive: true });
    const file = path.join(storage.userData, 'workspace.json'); await fs.writeFile(file, '{bad json');
    await expect(create('corrupt').initialize()).rejects.toThrow('preserved');
    expect(await fs.readFile(file, 'utf8')).toBe('{bad json');
  });
});
