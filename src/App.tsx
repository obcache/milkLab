import { useCallback, useEffect, useRef, useState } from 'react';
import { AudioWaveform, Files, SlidersHorizontal, Sparkles, ListMusic, Settings2, Plus, X, Minus, Square, Play, Save, ChevronRight, CircleAlert, CircleCheck, AlertTriangle, Check, ArrowDownToLine, RotateCcw } from 'lucide-react';
import { defaultLayout, type Bootstrap, type ImportReport, type Layout, type MilkLabAPI, type PanelId, type Playlist, type PresetDiagnostic, type PresetDocument, type Settings, type Workspace } from './shared/contracts';
import { blankPreset } from './domain/presets';
import { effects, insertEffect, type Effect } from './domain/effects';
import { CodeEditor, type EditorHandle } from './components/LazyEditor';
import { SideColumn, beginDrag, fitColumns } from './components/PanelLayout';
import { LibraryPanel } from './components/LibraryPanel';
import { PlaylistPanel } from './components/PlaylistPanel';
import { EffectsPanel } from './components/EffectsPanel';
import { PreviewPanel } from './components/PreviewPanel';
import { SettingsDialog } from './components/SettingsDialog';
import { browserAPI } from './browser-api';

const api: MilkLabAPI = window.milkLab || browserAPI();
type Modal = { kind: 'message'; title: string; message: string } | { kind: 'report'; report: ImportReport } | { kind: 'close'; document: PresetDocument } | { kind: 'playlist' } | null;
const filename = (value: string) => value.split(/[\\/]/).pop() || value;
export default function App() {
  const [snapshot, setSnapshot] = useState<Bootstrap | null>(null), [workspace, setWorkspace] = useState<Workspace | null>(null), [startupError, setStartupError] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false), [modal, setModal] = useState<Modal>(null), [menu, setMenu] = useState<string | null>(null), [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<PresetDiagnostic[]>([]), [engineError, setEngineError] = useState(''), [engineState, setEngineState] = useState('Starting projectM…');
  const [preview, setPreview] = useState({ content: blankPreset, revision: 0 }), [cursor, setCursor] = useState({ line: 1, column: 1 });
  const [draftStatus, setDraftStatus] = useState('Loading workspace…'), [busy, setBusy] = useState(false), [notice, setNotice] = useState(''), [bottomTab, setBottomTab] = useState('Problems'), [playlistName, setPlaylistName] = useState('');
  const [logs, setLogs] = useState<{ time: string; text: string }[]>([]);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const editor = useRef<EditorHandle>(null), latest = useRef(workspace), persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null), lastPersist = useRef<Promise<void>>(Promise.resolve());
  const closing = useRef(false), previewDocumentId = useRef<string | null>(null);
  latest.current = workspace;
  useEffect(() => { const resize = () => setWindowWidth(window.innerWidth); window.addEventListener('resize', resize); return () => window.removeEventListener('resize', resize); }, []);
  const active = workspace?.documents.find(d => d.id === workspace.activeId);
  const log = useCallback((text: string) => { setLogs(logs => [...logs.slice(-99), { time: new Date().toLocaleTimeString(), text }]); setNotice(text); }, []);
  const error = useCallback((e: unknown) => { const message = e instanceof Error ? e.message : String(e); setModal({ kind: 'message', title: 'Action could not be completed', message }); log(message); }, [log]);
  const persist = useCallback(async (value: Workspace) => {
    setDraftStatus('Saving recovery files…');
    const promise = api.persistWorkspace(value);
    lastPersist.current = promise;
    await promise; setDraftStatus('Drafts saved');
  }, []);
  useEffect(() => {
    void api.bootstrap().then(state => { setSnapshot(state); setWorkspace(state.workspace); setSelectedPreset(state.library[0]?.id || null); log(state.recoveryWarning || 'Workspace restored. Draft recovery is enabled.'); }).catch(e => setStartupError(String(e)));
  }, [log]);
  useEffect(() => {
    if (!workspace) return;
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => { void persist(workspace).catch(e => { setDraftStatus('Recovery save failed'); error(e); }); }, 350);
    return () => { if (persistTimer.current) clearTimeout(persistTimer.current); };
  }, [workspace, persist, error]);
  useEffect(() => api.onClosing(() => {
    if (closing.current) return;
    closing.current = true;
    if (persistTimer.current) clearTimeout(persistTimer.current);
    void (async () => { if (latest.current) await persist(latest.current); await lastPersist.current; api.windowControl('close-ready'); })().catch(e => { closing.current = false; error(e); });
  }), [persist, error]);
  useEffect(() => { if (!notice) return; const id = setTimeout(() => setNotice(''), 6000); return () => clearTimeout(id); }, [notice]);
  useEffect(() => {
    let canceled = false;
    if (!active) { setDiagnostics([]); return; }
    const timer = setTimeout(() => { void api.lintPreset(active.content).then(next => { if (!canceled) setDiagnostics(next); }).catch(e => { if (!canceled) error(e); }); }, 220);
    return () => { canceled = true; clearTimeout(timer); };
  }, [active?.id, active?.content, error]);
  useEffect(() => {
    if (!active) return;
    if (previewDocumentId.current !== active.id) { previewDocumentId.current = active.id; setPreview(p => ({ content: active.content, revision: p.revision + 1 })); }
    if (!snapshot?.settings.autoPreview) return;
    let canceled = false;
    const timer = setTimeout(() => { void api.lintPreset(active.content).then(next => { if (!canceled && !next.some(d => d.severity === 'error')) setPreview(p => ({ content: active.content, revision: p.revision + 1 })); }).catch(e => { if (!canceled) error(e); }); }, 650);
    return () => { canceled = true; clearTimeout(timer); };
  }, [active?.id, active?.content, snapshot?.settings.autoPreview]);
  const newDocument = useCallback(() => {
    if ((latest.current?.documents.length || 0) >= 100) { error(new Error('Close a tab before opening more than 100 presets.')); return; }
    const id = crypto.randomUUID();
    setWorkspace(w => w ? { ...w, documents: [...w.documents, { id, name: `Untitled ${w.documents.filter(d => !d.path).length + 1}.milk`, path: null, content: blankPreset, savedContent: '', dirty: true }], activeId: id } : w);
  }, [error]);
  async function saveDocument(doc = active, saveAs = false) {
    if (!doc) return;
    try {
      const saved = await api.saveDocument(doc, saveAs);
      if (!saved) return false;
      // If typing continued while a dialog was open, keep newer edits dirty.
      setWorkspace(w => w ? { ...w, documents: w.documents.map(current => current.id === saved.id ? { ...saved, content: current.content, dirty: current.content !== saved.savedContent } : current) } : w);
      log(`Saved ${saved.name}`);
      const state = await api.bootstrap(); setSnapshot(s => s ? { ...s, library: state.library } : s);
      return true;
    } catch (e) { error(e); return false; }
  }
  function closeDocument(doc: PresetDocument, discard = false) {
    if (doc.dirty && !discard) { setModal({ kind: 'close', document: doc }); return; }
    setWorkspace(w => { if (!w) return w; const index = w.documents.findIndex(d => d.id === doc.id), documents = w.documents.filter(d => d.id !== doc.id); return { ...w, documents, activeId: w.activeId === doc.id ? documents[Math.max(0, index - 1)]?.id || null : w.activeId }; });
    setModal(null);
  }
  const openPreset = useCallback(async (id: string) => {
    try {
      const doc = await api.readPreset(id);
      if ((latest.current?.documents.length || 0) >= 100 && !latest.current?.documents.some(d => d.path === doc.path)) throw new Error('Close a tab before opening more than 100 presets.');
      setWorkspace(w => { if (!w) return w; const existing = w.documents.find(d => d.path === doc.path); return existing ? { ...w, activeId: existing.id } : { ...w, documents: [...w.documents, doc], activeId: doc.id }; });
      setSelectedPreset(id);
    } catch (e) { error(e); }
  }, [error]);
  async function importPresets(folder = false) {
    setBusy(true);
    try {
      const report = await api.importPresets(folder);
      if (report.imported.length || report.rejected.length) {
        const state = await api.bootstrap(); setSnapshot(s => s ? { ...s, library: state.library } : s);
        setModal({ kind: 'report', report }); log(`Import finished: ${report.imported.length} accepted, ${report.rejected.length} rejected.`);
      }
    } catch (e) { error(e); } finally { setBusy(false); }
  }
  async function updatePlaylist(playlist: Playlist) {
    setSnapshot(s => s ? { ...s, playlists: s.playlists.map(p => p.id === playlist.id ? playlist : p) } : s);
    try { const saved = await api.savePlaylist(playlist); setSnapshot(s => s ? { ...s, playlists: s.playlists.map(p => p.id === saved.id ? saved : p) } : s); }
    catch (e) { error(e); }
  }
  async function addToPlaylist(id = selectedPreset) {
    const preset = snapshot?.library.find(p => p.id === id), playlist = snapshot?.playlists.find(p => p.id === workspace?.activePlaylist);
    if (!preset || !playlist) return;
    try {
      const saved = await api.addPresetToPlaylist(playlist.id, preset.id);
      setSnapshot(s => s ? { ...s, playlists: s.playlists.map(p => p.id === saved.id ? saved : p) } : s);
      log(`Added ${preset.name} to ${playlist.name}`);
    } catch (e) { error(e); }
  }
  function insert(effect: Effect) {
    if (!active) { log('Create or open a preset before inserting an effect.'); return; }
    const content = insertEffect(active.content, effect);
    editor.current?.replace(content); editor.current?.focus(); log(`Inserted ${effect.name} equations into ${active.name}`);
  }
  function applyPreview() { if (active) { setPreview(p => ({ content: active.content, revision: p.revision + 1 })); log(`Applied ${active.name} to projectM`); } }
  async function applySettings(settings: Settings) {
    const state = await api.updateSettings(settings);
    if (settings.storageRoot !== snapshot?.settings.storageRoot) setSelectedPreset(state.library[0]?.id || null);
    setSnapshot(state); setWorkspace(w => w ? { ...w, activePlaylist: state.workspace.activePlaylist } : w); setSettingsOpen(false); log('Settings saved.');
  }
  function showPanel(id: PanelId) { setWorkspace(w => w ? { ...w, layout: { ...w.layout, left: w.layout.left.map(p => p.id === id ? { ...p, collapsed: !p.collapsed } : p), right: w.layout.right.map(p => p.id === id ? { ...p, collapsed: !p.collapsed } : p) } } : w); }
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.key === 'n') { event.preventDefault(); newDocument(); }
      if (event.key.toLowerCase() === 'o') { event.preventDefault(); void importPresets(event.shiftKey); }
      if (event.key === ',') { event.preventDefault(); setSettingsOpen(true); }
      if (event.key.toLowerCase() === 's' && !(event.target as HTMLElement)?.closest('.cm-editor')) { event.preventDefault(); void saveDocument(active, event.shiftKey); }
      if (event.key === 'Enter' && !(event.target as HTMLElement)?.closest('.cm-editor')) { event.preventDefault(); applyPreview(); }
    };
    window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler);
  });
  if (startupError) return <div className="startup-error"><CircleAlert size={30}/><h1>milkLab could not open the workspace</h1><p>{startupError}</p><button onClick={() => location.reload()}>Retry</button><button onClick={() => api.windowControl('close-ready')}>Close</button></div>;
  if (!snapshot || !workspace) return <div className="loading-screen"><AudioWaveform size={34}/><h1>milkLab</h1><p>Opening your workspace…</p></div>;
  const setLayout = (layout: Layout) => setWorkspace(w => w ? { ...w, layout } : w);
  const columnWidths = fitColumns(workspace.layout, windowWidth);
  const errorCount = diagnostics.filter(d => d.severity === 'error').length + (engineError ? 1 : 0), warningCount = diagnostics.filter(d => d.severity === 'warning').length;
  const headers = {
    library: <button className="icon-button add-playlist" title="Add selected preset to active playlist" aria-label="Add to playlist" disabled={!selectedPreset} onClick={() => void addToPlaylist()}><ListMusic size={13}/><Plus size={10}/></button>,
    playlist: <span className="header-count">{snapshot.playlists.find(p => p.id === workspace.activePlaylist)?.paths.length || 0}</span>,
    effects: <span className="header-count">{effects.length}</span>,
  };
  const renderPanel = (id: PanelId, visible: boolean) => {
    if (id === 'library') return <LibraryPanel library={snapshot.library} selected={selectedPreset} activePath={active?.path} onSelect={setSelectedPreset} onOpen={id => void openPreset(id)} onImport={folder => void importPresets(folder)}/>;
    if (id === 'playlist') return <PlaylistPanel playlists={snapshot.playlists} activeId={workspace.activePlaylist} onActivate={activePlaylist => setWorkspace(w => w ? { ...w, activePlaylist } : w)} onCreate={() => { setPlaylistName(''); setModal({ kind: 'playlist' }); }} onUpdate={p => void updatePlaylist(p)} onAddPreset={id => void addToPlaylist(id)} onOpenPath={path => { const p = snapshot.library.find(p => p.path === path); if (p) void openPreset(p.id); else setModal({ kind: 'message', title: 'Preset is outside managed storage', message: `Import this preset into your library before editing it:\n${path}` }); }} onImport={() => void api.importPlaylist().then(p => { if (p) { setSnapshot(s => s ? { ...s, playlists: [...s.playlists, p] } : s); setWorkspace(w => w ? { ...w, activePlaylist: p.id } : w); } }).catch(error)} onExport={() => { if (workspace.activePlaylist) void api.exportPlaylist(workspace.activePlaylist).then(saved => saved && log('Playlist exported.')).catch(error); }}/>;
    if (id === 'effects') return <EffectsPanel onInsert={insert}/>;
    return <PreviewPanel content={preview.content} revision={preview.revision} visible={visible} onState={setEngineState} onError={setEngineError}/>;
  };
  return <div className="app-shell">
    <header className="titlebar"><div className="brand"><AudioWaveform size={23}/><strong>milkLab</strong></div><nav className="app-menu" aria-label="Application menu">{['File', 'Edit', 'View'].map(item => <button key={item} className={menu === item ? 'active' : ''} onClick={() => setMenu(menu === item ? null : item)}>{item}</button>)}</nav><div className="window-title">{active?.name || 'Preset workspace'}{active?.dirty && <span className="unsaved-dot"/>}</div><div className="window-controls"><button title="Minimize window" onClick={() => api.windowControl('minimize')}><Minus size={14}/></button><button title="Maximize or restore window" onClick={() => api.windowControl('maximize')}><Square size={11}/></button><button className="window-close" title="Close window" onClick={() => api.windowControl('close')}><X size={16}/></button></div></header>
    {menu && <><button className="menu-scrim" aria-label="Close application menu" onClick={() => setMenu(null)}/><div className="app-menu-popover menu-popover" style={{ left: menu === 'File' ? 128 : menu === 'Edit' ? 166 : 204 }}>
      {menu === 'File' && <>
        <button onClick={() => { newDocument(); setMenu(null); }}><Plus size={14}/>New preset<span>Ctrl+N</span></button>
        <button onClick={() => { void importPresets(); setMenu(null); }}><Files size={14}/>Import presets…<span>Ctrl+O</span></button>
        <button onClick={() => { void importPresets(true); setMenu(null); }}>Import preset folder…</button><hr/>
        <button disabled={!active} onClick={() => { void saveDocument(); setMenu(null); }}><Save size={14}/>Save preset<span>Ctrl+S</span></button>
        <button disabled={!active} onClick={() => { void saveDocument(active, true); setMenu(null); }}>Save preset as…<span>Ctrl+Shift+S</span></button><hr/>
        <button onClick={() => { void api.exportWorkspace(workspace).then(saved => saved && log('Workspace exported.')).catch(error); setMenu(null); }}>Export workspace…</button>
        <button onClick={() => { void api.importWorkspace().then(imported => { if (!imported) return; setWorkspace(w => w ? { ...w, documents: [...w.documents, ...imported.documents], activeId: imported.activeId || w.activeId, layout: imported.layout } : w); log('Imported workspace as unsaved drafts.'); }).catch(error); setMenu(null); }}>Import workspace…</button><hr/>
        <button onClick={() => { setSettingsOpen(true); setMenu(null); }}><Settings2 size={14}/>Settings…<span>Ctrl+,</span></button>
        <button onClick={() => { api.windowControl('close'); setMenu(null); }}>Exit</button>
      </>}
      {menu === 'Edit' && <><button disabled={!active} onClick={() => { editor.current?.undo(); setMenu(null); }}>Undo<span>Ctrl+Z</span></button><button disabled={!active} onClick={() => { editor.current?.redo(); setMenu(null); }}>Redo<span>Ctrl+Y</span></button><hr/><button disabled={!active} onClick={() => { applyPreview(); setMenu(null); }}><Play size={14}/>Apply to preview<span>Ctrl+Enter</span></button></>}
      {menu === 'View' && <>{(['library', 'playlist', 'preview', 'effects'] as PanelId[]).map(id => <button key={id} onClick={() => { showPanel(id); setMenu(null); }}>{[...workspace.layout.left, ...workspace.layout.right].find(p => p.id === id)?.collapsed ? <span className="menu-icon-space"/> : <Check size={13}/>}{{ library: 'Preset library', playlist: 'Playlist', preview: 'projectM preview', effects: 'Effects' }[id]}</button>)}<hr/><button onClick={() => { setLayout({ ...workspace.layout, problems: !workspace.layout.problems }); setMenu(null); }}>Toggle problems panel</button><button onClick={() => { setLayout(structuredClone(defaultLayout)); setMenu(null); }}><RotateCcw size={13}/>Reset workspace layout</button></>}
    </div></>}
    <div className="workspace-shell"><div className="activity-rail"><button className="active" title="Toggle preset library" onClick={() => showPanel('library')}><Files size={22}/></button><button title="Toggle effects" onClick={() => showPanel('effects')}><Sparkles size={21}/></button><button title="Toggle playlist" onClick={() => showPanel('playlist')}><ListMusic size={21}/></button><button title="Toggle preview" onClick={() => showPanel('preview')}><Play size={21}/></button><div className="rail-spacer"/><button title="Settings" onClick={() => setSettingsOpen(true)}><Settings2 size={21}/></button></div>
      <div className="dock-workspace" style={{ gridTemplateColumns: `${columnWidths.left}px 5px minmax(320px,1fr) 5px ${columnWidths.right}px` }}>
        <SideColumn side="left" layout={workspace.layout} onChange={setLayout} renderPanel={renderPanel} headers={headers}/>
        <div className="column-splitter" role="separator" aria-label="Resize left column" aria-orientation="vertical" onPointerDown={e => { const width = columnWidths.left; beginDrag(e, dx => setLayout({ ...workspace.layout, rightWidth: columnWidths.right, leftWidth: Math.max(200, Math.min(500, width + dx, window.innerWidth - columnWidths.right - 382)) })); }}/>
        <main className="center-workspace"><div className="editor-tabs" role="tablist" aria-label="Open presets">{workspace.documents.map(doc => <div className={`editor-tab ${doc.id === workspace.activeId ? 'active' : ''}`} key={doc.id}><button role="tab" aria-selected={doc.id === workspace.activeId} title={doc.path || 'Unsaved draft · recovery enabled'} onClick={() => { setWorkspace(w => w ? { ...w, activeId: doc.id } : w); setEngineError(''); }}><Files size={13}/><span>{doc.name}</span>{doc.dirty && <span className="unsaved-dot" aria-label="Unsaved changes"/>}</button><button className="tab-close" title={`Close ${doc.name}`} onClick={() => closeDocument(doc)}><X size={13}/></button></div>)}<button className="new-tab icon-button" title="New preset" onClick={newDocument}><Plus size={17}/></button></div>
          {active ? <><div className="editor-toolbar"><div className="breadcrumbs"><span>{active.path ? 'presets' : 'drafts'}</span><ChevronRight size={12}/><span>{active.name}</span></div><button className="apply-button" title="Apply to preview (Ctrl+Enter)" onClick={applyPreview}><Play size={12} fill="currentColor"/>Apply to preview</button></div><CodeEditor ref={editor} document={active} fontSize={snapshot.settings.fontSize} diagnostics={diagnostics} onChange={content => setWorkspace(w => w ? { ...w, documents: w.documents.map(d => d.id === active.id ? { ...d, content, dirty: !d.path || content !== d.savedContent } : d) } : w)} onCursor={(line, column) => setCursor({ line, column })} onSave={saveAs => void saveDocument(active, saveAs)} onApply={applyPreview} onDropEffect={id => { const effect = effects.find(e => e.id === id); if (effect) insert(effect); }}/></> : <div className="workspace-empty"><AudioWaveform size={48}/><h1>Your next visual starts here</h1><p>Open a preset from the library, or start with a new sketch.</p><button onClick={newDocument}><Plus size={14}/>New preset</button><span>Ctrl+N</span></div>}
          <div className={`bottom-panel ${workspace.layout.problems ? '' : 'collapsed'}`}><div className="bottom-tabs">{['Problems', 'Output'].map(tab => <button key={tab} className={bottomTab === tab ? 'active' : ''} onClick={() => { setBottomTab(tab); setLayout({ ...workspace.layout, problems: true }); }}>{tab}{tab === 'Problems' && errorCount + warningCount > 0 && <span className="count-badge">{errorCount + warningCount}</span>}</button>)}<span className="bottom-summary">{errorCount ? `${errorCount} error${errorCount > 1 ? 's' : ''}` : 'No errors'}</span><button className="icon-button" title={workspace.layout.problems ? 'Collapse bottom panel' : 'Expand bottom panel'} onClick={() => setLayout({ ...workspace.layout, problems: !workspace.layout.problems })}>{workspace.layout.problems ? <Minus size={13}/> : <Plus size={13}/>}</button></div>
            {workspace.layout.problems && <div className="bottom-content">{bottomTab === 'Problems' ? <>{!diagnostics.length && !engineError ? <div className="clean-diagnostics"><CircleCheck size={14}/><span>No problems detected in the active preset.</span></div> : <>{diagnostics.map((d, i) => <button key={i} className={`diagnostic-row ${d.severity}`} onClick={() => editor.current?.goTo(d.from)}>{d.severity === 'error' ? <CircleAlert size={13}/> : <AlertTriangle size={13}/>}<span>{active?.name}</span><span className="diagnostic-line">Ln {d.line}</span><span>{d.message}</span></button>)}{engineError && <div className="diagnostic-row error"><CircleAlert size={13}/><span>projectM</span><span>{engineError}</span></div>}</>}</> : logs.map((entry, i) => <div className="output-row" key={i}><time>{entry.time}</time><span>{entry.text}</span></div>)}</div>}
          </div>
        </main>
        <div className="column-splitter" role="separator" aria-label="Resize right column" aria-orientation="vertical" onPointerDown={e => { const width = columnWidths.right; beginDrag(e, dx => setLayout({ ...workspace.layout, leftWidth: columnWidths.left, rightWidth: Math.max(260, Math.min(650, width - dx, window.innerWidth - columnWidths.left - 382)) })); }}/>
        <SideColumn side="right" layout={workspace.layout} onChange={setLayout} renderPanel={renderPanel} headers={headers}/>
      </div>
    </div>
    <footer className="statusbar"><span className={`engine-dot ${engineError ? 'error' : ''}`}/><span>{engineState}</span><span className="status-divider"/><ArrowDownToLine size={12}/><span>{draftStatus}</span>{!window.milkLab && <span className="browser-mode">Browser preview · localStorage</span>}<span className="status-notice">{busy ? 'Importing and validating presets…' : notice}</span><button title="Open problems" onClick={() => { setLayout({ ...workspace.layout, problems: true }); setBottomTab('Problems'); }}><CircleAlert size={11}/>{errorCount}<AlertTriangle size={11}/>{warningCount}</button><span>Ln {cursor.line}, Col {cursor.column}</span><span className="status-divider"/><span>UTF-8</span><span>MilkDrop</span><span>LF</span></footer>
    {settingsOpen && <SettingsDialog settings={snapshot.settings} api={api} onSave={applySettings} onClose={() => setSettingsOpen(false)}/>}
    {modal && <div className="modal-backdrop"><section className={`dialog ${modal.kind === 'report' ? 'import-dialog' : ''}`} role="dialog" aria-modal="true" aria-labelledby="modal-title"><header><h2 id="modal-title">{modal.kind === 'message' ? modal.title : modal.kind === 'close' ? 'Close unsaved preset?' : modal.kind === 'playlist' ? 'New playlist' : 'Preset import report'}</h2><button className="icon-button" title="Close dialog" onClick={() => setModal(null)}><X size={17}/></button></header>
      {modal.kind === 'message' && <><p className="message-body">{modal.message}</p><footer><button className="primary" onClick={() => setModal(null)}>OK</button></footer></>}
      {modal.kind === 'close' && <><p><strong>{modal.document.name}</strong> has unsaved changes. Keeping the tab open preserves its recovery file.</p><footer><button onClick={() => closeDocument(modal.document, true)}>Discard and close</button><button onClick={() => setModal(null)}>Keep open</button><button className="primary" onClick={() => void saveDocument(modal.document).then(saved => { if (saved) closeDocument(modal.document, true); })}>Save and close</button></footer></>}
      {modal.kind === 'playlist' && <form onSubmit={e => { e.preventDefault(); void api.createPlaylist(playlistName).then(p => { setSnapshot(s => s ? { ...s, playlists: [...s.playlists, p] } : s); setWorkspace(w => w ? { ...w, activePlaylist: p.id } : w); setModal(null); }).catch(error); }}><label htmlFor="playlist-name">Playlist name</label><input autoFocus id="playlist-name" required maxLength={80} value={playlistName} onChange={e => setPlaylistName(e.target.value)}/><footer><button type="button" onClick={() => setModal(null)}>Cancel</button><button className="primary" disabled={!playlistName.trim()}>Create playlist</button></footer></form>}
      {modal.kind === 'report' && <><p>{modal.report.imported.length} presets accepted · {modal.report.rejected.length} rejected. Source originals are preserved in managed storage.</p><div className="import-results">{modal.report.imported.map((p, i) => <div className="import-result" key={`${p.id}-${i}`}><strong><Check size={13}/>{p.name}<span className={`import-status ${p.status}`}>{p.status}</span></strong>{[...p.repairs, ...p.warnings].map((note, n) => <p key={n}>{note}</p>)}</div>)}{modal.report.rejected.map((p, i) => <div className="import-result rejected" key={i}><strong><CircleAlert size={13}/>{p.name}</strong><p>{p.reason}</p></div>)}</div><footer><button className="primary" onClick={() => setModal(null)}>Done</button></footer></>}
    </section></div>}
  </div>;
}
