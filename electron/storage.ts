import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { defaultLayout, settingsSchema, workspaceSchema, presetSchema, playlistSchema, type Bootstrap, type Settings, type Workspace, type Preset, type PresetDocument, type Playlist, type ImportReport } from '../src/shared/contracts';
import { normalizePreset } from '../src/domain/normalize';
import { diagnosePreset, type Evaluate } from '../src/domain/diagnostics';
import { starterPresets } from '../src/domain/presets';

export async function atomicWrite(target: string, content: string | Uint8Array) {
  await fs.mkdir(path.dirname(target), { recursive: true });
  const temporary = `${target}.${randomUUID()}.tmp`;
  try {
    await fs.writeFile(temporary, content, 'utf8');
    try { await fs.copyFile(target, `${target}.bak`); } catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; }
    await fs.rename(temporary, target);
  } finally { await fs.rm(temporary, { force: true }).catch(() => {}); }
}
export async function readJson<T>(file: string, schema: z.ZodType<T>, fallback: T): Promise<T> {
  try { return schema.parse(JSON.parse(await fs.readFile(file, 'utf8'))); }
  catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return fallback;
    // Do not silently overwrite a damaged local record.
    throw new Error(`Cannot read ${file}. The file has been preserved; restore its .bak copy. ${String(e)}`);
  }
}
const hash = (content: string) => createHash('sha256').update(content).digest('hex');
const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
const librarySchema = z.object({ version: z.literal(1), presets: z.array(presetSchema) });
const workspaceRecordSchema = workspaceSchema.omit({ documents: true }).extend({ documents: z.array(z.object({ id: z.string(), name: z.string(), path: z.string().nullable(), savedContent: z.string(), dirty: z.boolean() })) });
export function safeName(name: string) {
  const clean = name.trim().replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/[. ]+$/, '');
  if (!clean || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(clean)) throw new Error('Choose a valid Windows filename.');
  return clean.slice(0, 180);
}
export function serializePlaylist(paths: string[]) {
  for (const entry of paths) if (/[\r\n\0]/.test(entry) || !/\.milk$/i.test(entry)) throw new Error('Playlist entries must be single .milk file paths.');
  return paths.length ? paths.join('\r\n') + '\r\n' : '';
}
export function parsePlaylist(text: string, base: string) {
  return text.replace(/^\uFEFF/, '').split(/\r?\n/).map(row => row.trim()).filter(Boolean).map(row => {
    if (/[\0\r\n]/.test(row) || !/\.milk$/i.test(row)) throw new Error(`Invalid playlist entry: ${row}`);
    return path.isAbsolute(row) ? row : path.resolve(base, row);
  });
}
export class Storage {
  settings!: Settings;
  workspace: Workspace = { version: 1, documents: [], activeId: null, layout: structuredClone(defaultLayout), activePlaylist: null };
  library: Preset[] = [];
  playlists: Playlist[] = [];
  private documentPaths = new Map<string, string>();
  private draftContents = new Map<string, string>();
  constructor(readonly userData: string, readonly defaultRoot: string, readonly evaluate?: Evaluate) {}
  private get root() { return this.settings.storageRoot; }
  private libraryFile() { return path.join(this.root, 'library.json'); }
  private async writeLibrary() { await atomicWrite(this.libraryFile(), json({ version: 1, presets: this.library })); }
  async initialize(): Promise<Bootstrap> {
    this.settings = await readJson(path.join(this.userData, 'settings.json'), settingsSchema, { version: 1, storageRoot: this.defaultRoot, autoPreview: true, fontSize: 13 });
    await this.loadLibrary();
    const file = path.join(this.userData, 'workspace.json');
    const record = await readJson(file, workspaceRecordSchema, { ...this.workspace, documents: [] });
    const documents: PresetDocument[] = [];
    let recoveryWarning = '';
    for (const doc of record.documents) {
      // Persisted identifiers are checked before constructing recovery paths.
      if (!/^[a-zA-Z0-9_-]{1,100}$/.test(doc.id)) throw new Error('Invalid recovery document identifier.');
      let content: string;
      try { content = await fs.readFile(path.join(this.userData, 'drafts', `${doc.id}.milk`), 'utf8'); }
      catch {
        content = doc.savedContent;
        recoveryWarning = 'A draft file was missing. Its last explicit saved content was restored.';
      }
      const restored = { ...doc, content, dirty: doc.dirty || content !== doc.savedContent };
      documents.push(restored);
      if (doc.path) this.documentPaths.set(doc.id, doc.path);
    }
    this.workspace = workspaceSchema.parse({ ...record, documents });
    if (!documents.length && this.library.length && !(await fs.stat(file).catch(() => null))) {
      const doc = await this.readPreset(this.library[0].id);
      this.workspace = { ...this.workspace, documents: [doc], activeId: doc.id };
    }
    if (!this.workspace.activePlaylist) this.workspace.activePlaylist = this.playlists[0]?.id || null;
    return { ...this.snapshot(), recoveryWarning };
  }
  snapshot(): Bootstrap { return { settings: this.settings, workspace: this.workspace, library: this.library, playlists: this.playlists }; }
  private async loadLibrary() {
    for (const folder of ['presets', 'originals', 'playlists']) await fs.mkdir(path.join(this.root, folder), { recursive: true });
    const exists = await fs.stat(this.libraryFile()).catch(() => null);
    this.library = (await readJson(this.libraryFile(), librarySchema, { version: 1, presets: [] })).presets;
    // Index paths may never redirect library reads outside the selected managed root.
    this.library = this.library.map(p => ({ ...p, path: path.join(this.root, 'presets', path.basename(p.path)), originalPath: path.join(this.root, 'originals', path.basename(p.originalPath)) }));
    if (!exists) {
      for (const starter of starterPresets) await this.importContent(starter.name, starter.content);
      await this.writeLibrary();
    }
    const entries = await fs.readdir(path.join(this.root, 'playlists'));
    this.playlists = [];
    for (const entry of entries.filter(e => /\.txt$/i.test(e))) {
      const id = path.basename(entry, path.extname(entry));
      if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id)) continue;
      const full = path.join(this.root, 'playlists', entry);
      this.playlists.push({ id, name: id.replace(/_/g, ' '), paths: parsePlaylist(await fs.readFile(full, 'utf8'), path.dirname(full)) });
    }
    if (!this.playlists.length) await this.createPlaylist('Studio session');
  }
  async updateSettings(input: Settings) {
    const settings = settingsSchema.parse(input);
    if (!path.isAbsolute(settings.storageRoot)) throw new Error('Managed storage must use an absolute folder path.');
    settings.storageRoot = path.resolve(settings.storageRoot);
    if (settings.storageRoot !== this.root) {
      const old = this.settings;
      this.settings = settings;
      try { await this.loadLibrary(); }
      catch (e) { this.settings = old; await this.loadLibrary(); throw e; }
      this.workspace.activePlaylist = this.playlists[0]?.id || null;
    } else this.settings = settings;
    await atomicWrite(path.join(this.userData, 'settings.json'), json(settings));
    return this.snapshot();
  }
  private async importContent(name: string, source: string, originalBytes?: Uint8Array, convertedEncoding = false): Promise<Preset> {
    const normalized = normalizePreset(source, name);
    if (!normalized.accepted) throw new Error(normalized.error);
    if (convertedEncoding) normalized.repairs.push('Converted Windows-1252 source text to UTF-8; original bytes preserved.');
    const diagnostics = diagnosePreset(normalized.content, this.evaluate);
    const errors = diagnostics.filter(d => d.severity === 'error');
    if (errors.length) throw new Error(errors.map(d => `Line ${d.line}: ${d.message}`).join('\n'));
    normalized.warnings.push(...diagnostics.filter(d => d.severity === 'warning').map(d => d.message));
    const digest = hash(normalized.content);
    const duplicate = this.library.find(p => p.hash === digest);
    if (duplicate) return duplicate;
    const id = randomUUID(), filename = `${safeName(path.basename(name, path.extname(name)))}-${digest.slice(0, 10)}.milk`;
    const target = path.join(this.root, 'presets', filename), original = path.join(this.root, 'originals', `${id}.milk`);
    await atomicWrite(original, originalBytes || source);
    await atomicWrite(target, normalized.content);
    const preset: Preset = { id, name: path.basename(name), path: target, originalPath: original, hash: digest, importedAt: new Date().toISOString(), status: normalized.warnings.length ? 'review' : normalized.repairs.length ? 'repaired' : 'ready', repairs: normalized.repairs, warnings: normalized.warnings };
    this.library.push(preset);
    await this.writeLibrary();
    return preset;
  }
  async importFiles(files: string[]): Promise<ImportReport> {
    const result: ImportReport = { imported: [], rejected: [] };
    for (const file of files) {
      try {
        if ((await fs.stat(file)).size > 2097152) throw new Error('Preset exceeds the 2 MiB import limit.');
        const bytes = await fs.readFile(file);
        let content: string, converted = false;
        try { content = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes); }
        catch { content = new TextDecoder('windows-1252').decode(bytes); converted = true; }
        result.imported.push(await this.importContent(path.basename(file), content, bytes, converted));
      } catch (e) { result.rejected.push({ name: path.basename(file), reason: (e as Error).message }); }
    }
    return result;
  }
  async readPreset(id: string): Promise<PresetDocument> {
    const preset = this.library.find(p => p.id === id);
    if (!preset) throw new Error('Preset not found in managed storage.');
    const content = await fs.readFile(preset.path, 'utf8');
    const doc = { id: randomUUID(), name: preset.name, path: preset.path, content, savedContent: content, dirty: false };
    this.documentPaths.set(doc.id, preset.path);
    return doc;
  }
  async saveDocument(doc: PresetDocument, destination?: string): Promise<PresetDocument> {
    const target = destination || this.documentPaths.get(doc.id);
    if (!target || !/\.milk$/i.test(target)) throw new Error('Choose a .milk save destination.');
    if (!destination) {
      const disk = await fs.readFile(target, 'utf8');
      if (disk !== doc.savedContent) throw new Error('This file changed on disk. Use Save As to preserve both versions.');
    }
    await atomicWrite(target, doc.content);
    this.documentPaths.set(doc.id, target);
    const preset = this.library.find(p => p.path === target);
    if (preset) {
      preset.hash = hash(doc.content);
      preset.status = diagnosePreset(doc.content, this.evaluate).some(d => d.severity === 'error') ? 'review' : 'ready';
      await this.writeLibrary();
    }
    const next = { ...doc, path: target, name: destination ? path.basename(target) : doc.name, savedContent: doc.content, dirty: false };
    return next;
  }
  async persistWorkspace(input: Workspace) {
    const workspace = workspaceSchema.parse(input);
    if (new Set(workspace.documents.map(d => d.id)).size !== workspace.documents.length) throw new Error('Workspace document IDs must be unique.');
    const documents = workspace.documents.map(doc => ({ ...doc, path: this.documentPaths.get(doc.id) || null }));
    // Draft contents are real .milk files, independent of the explicit save path.
    for (const doc of documents) if (this.draftContents.get(doc.id) !== doc.content) {
      await atomicWrite(path.join(this.userData, 'drafts', `${doc.id}.milk`), doc.content);
      this.draftContents.set(doc.id, doc.content);
    }
    const metadata = documents.map(({ content: _, ...doc }) => doc);
    await atomicWrite(path.join(this.userData, 'workspace.json'), json({ ...workspace, documents: metadata }));
    this.workspace = { ...workspace, documents };
  }
  async createPlaylist(name: string) {
    const base = safeName(name).replace(/[^a-zA-Z0-9_-]/g, '_');
    let id = base;
    for (let i = 2; this.playlists.some(p => p.id === id); i++) id = `${base}_${i}`;
    const playlist = { id, name: id.replace(/_/g, ' '), paths: [] };
    await this.savePlaylist(playlist, true);
    return playlist;
  }
  async addPresetToPlaylist(playlistId: string, presetId: string) {
    const playlist = this.playlists.find(p => p.id === playlistId), preset = this.library.find(p => p.id === presetId);
    if (!playlist || !preset) throw new Error('Choose a managed preset and playlist.');
    return this.savePlaylist({ ...playlist, paths: [...playlist.paths, preset.path] });
  }
  async savePlaylist(input: Playlist, create = false) {
    const playlist = playlistSchema.parse(input);
    if (!create && !this.playlists.some(p => p.id === playlist.id)) throw new Error('Playlist is not managed by this library.');
    const text = serializePlaylist(playlist.paths);
    await atomicWrite(path.join(this.root, 'playlists', `${playlist.id}.txt`), text);
    this.playlists = [...this.playlists.filter(p => p.id !== playlist.id), playlist];
    return playlist;
  }
  playlistPath(id: string) {
    if (!this.playlists.some(p => p.id === id)) throw new Error('Playlist not found.');
    return path.join(this.root, 'playlists', `${id}.txt`);
  }
}
