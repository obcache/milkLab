// Explicit browser-only development adapter. The shipped desktop always uses preload IPC.
import { defaultLayout, workspaceSchema, type Bootstrap, type MilkLabAPI, type PresetDocument, type Workspace } from './shared/contracts';
import { starterPresets } from './domain/presets';
import { normalizePreset } from './domain/normalize';
import { diagnosePreset, type Evaluate } from './domain/diagnostics';
const key = 'milklab-browser-preview-v1';
const download = (name: string, content: string) => { const url = URL.createObjectURL(new Blob([content], { type: 'text/plain' })); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
function pick(accept: string, multiple = false): Promise<File[]> { return new Promise(resolve => { const input = document.createElement('input'); input.type = 'file'; input.accept = accept; input.multiple = multiple; input.onchange = () => resolve([...input.files || []]); input.oncancel = () => resolve([]); input.click(); }); }
export function browserAPI(): MilkLabAPI {
  const docs: Record<string, string> = {};
  const library = starterPresets.map((p, i) => { docs[`sample-${i}`] = p.content; return { id: `sample-${i}`, name: p.name, path: `browser/presets/${p.name}`, originalPath: '', importedAt: '', hash: '', status: 'ready' as const, repairs: [], warnings: [] }; });
  const first: PresetDocument = { id: 'document-0', name: library[0].name, path: library[0].path, content: starterPresets[0].content, savedContent: starterPresets[0].content, dirty: false };
  let workspace: Workspace = { version: 1, documents: [first], activeId: first.id, layout: structuredClone(defaultLayout), activePlaylist: 'Studio_session' };
  try { const stored = localStorage.getItem(key); if (stored) workspace = workspaceSchema.parse(JSON.parse(stored)); } catch { /* Keep damaged development data intact. */ }
  const state: Bootstrap = { workspace, library, settings: { version: 1, storageRoot: 'Browser preview (desktop uses local folders)', autoPreview: true, fontSize: 13 }, playlists: [{ id: 'Studio_session', name: 'Studio session', paths: [] }] };
  let evaluate: Evaluate | undefined;
  const evaluator = import(/* @vite-ignore */ new URL('engine/milklab-projectm.mjs', window.location.href).href).then(async ({ default: create }) => { const m = await create({ print: () => {}, printErr: () => {} }); evaluate = code => ({ message: m.ccall('ml_validate', 'string', ['string'], [code]), line: m.ccall('ml_line', 'number', [], []), column: m.ccall('ml_column', 'number', [], []) }); });
  return {
    bootstrap: async () => state,
    lintPreset: async content => { await evaluator; return diagnosePreset(content, evaluate); },
    importPresets: async () => {
      const result: Awaited<ReturnType<MilkLabAPI['importPresets']>> = { imported: [], rejected: [] };
      for (const file of await pick('.milk', true)) {
        const normalized = normalizePreset(await file.text(), file.name);
        if (!normalized.accepted) { result.rejected.push({ name: file.name, reason: normalized.error! }); continue; }
        const id = crypto.randomUUID(); docs[id] = normalized.content;
        const preset = { id, name: file.name, path: `browser/presets/${file.name}`, originalPath: '', importedAt: new Date().toISOString(), hash: '', status: normalized.warnings.length ? 'review' as const : normalized.repairs.length ? 'repaired' as const : 'ready' as const, repairs: normalized.repairs, warnings: normalized.warnings };
        state.library.push(preset); result.imported.push(preset);
      }
      return result;
    },
    readPreset: async id => { const p = state.library.find(p => p.id === id)!; return { id: crypto.randomUUID(), name: p.name, path: p.path, content: docs[id], savedContent: docs[id], dirty: false }; },
    saveDocument: async doc => { download(doc.name, doc.content); return { ...doc, savedContent: doc.content, dirty: false }; },
    persistWorkspace: async workspace => { state.workspace = workspace; localStorage.setItem(key, JSON.stringify(workspace)); },
    chooseStorage: async () => { throw new Error('Choose managed storage in the desktop application.'); },
    updateSettings: async settings => { state.settings = settings; return state; },
    savePlaylist: async playlist => { state.playlists = [...state.playlists.filter(p => p.id !== playlist.id), playlist]; return playlist; },
    addPresetToPlaylist: async (playlistId, presetId) => { const p = state.playlists.find(p => p.id === playlistId)!, preset = state.library.find(p => p.id === presetId)!; p.paths = [...p.paths, preset.path]; return p; },
    createPlaylist: async name => { const p = { id: crypto.randomUUID(), name, paths: [] }; state.playlists.push(p); return p; },
    importPlaylist: async () => { throw new Error('Import path-based playlists in the desktop application.'); },
    exportPlaylist: async id => { const p = state.playlists.find(p => p.id === id)!; download(`${p.name}.txt`, p.paths.join('\r\n') + (p.paths.length ? '\r\n' : '')); return true; },
    exportWorkspace: async workspace => { download('milkLab-workspace.json', JSON.stringify(workspace, null, 2)); return true; },
    importWorkspace: async () => { const [file] = await pick('.json'); if (!file) return null; const parsed = workspaceSchema.parse(JSON.parse(await file.text())); return { ...parsed, documents: parsed.documents.map(d => ({ ...d, path: null, dirty: true })) }; },
    windowControl: () => {}, onClosing: () => () => {},
  };
}
