import { useState } from 'react';
import { X, FolderOpen } from 'lucide-react';
import type { MilkLabAPI, Settings } from '../shared/contracts';
export function SettingsDialog({ settings, api, onSave, onClose }: { settings: Settings; api: MilkLabAPI; onSave: (settings: Settings) => Promise<void>; onClose: () => void }) {
  const [draft, setDraft] = useState(settings), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget && !busy) onClose(); }}><section role="dialog" aria-modal="true" aria-labelledby="settings-title" className="settings-dialog dialog" onKeyDown={e => { if (e.key === 'Escape' && !busy) onClose(); }}>
    <header><h2 id="settings-title">Settings</h2><button className="icon-button" title="Close settings" onClick={onClose}><X size={17}/></button></header>
    <form onSubmit={e => { e.preventDefault(); setBusy(true); void onSave(draft).catch(e => setError((e as Error).message)).finally(() => setBusy(false)); }}>
      <h3>Managed storage</h3><p>Imported presets, preserved originals, and playlists live in this folder.</p>
      <label htmlFor="storage-path">Library folder</label><div className="path-field"><input id="storage-path" autoFocus value={draft.storageRoot} onChange={e => setDraft({ ...draft, storageRoot: e.target.value })}/><button type="button" title="Choose managed storage folder" onClick={() => void api.chooseStorage().then(storageRoot => { if (storageRoot) setDraft({ ...draft, storageRoot }); }).catch(e => setError(String(e)))}><FolderOpen size={15}/></button></div>
      <p className="help-text">Changing folders opens a separate managed library. Existing files stay in their current location. Open drafts remain recoverable.</p>
      <h3>Editor & preview</h3><label className="setting-row"><span>Editor font size</span><input aria-label="Editor font size" type="number" min="11" max="22" value={draft.fontSize} onChange={e => setDraft({ ...draft, fontSize: Number(e.target.value) })}/></label>
      <label className="checkbox-row"><input type="checkbox" checked={draft.autoPreview} onChange={e => setDraft({ ...draft, autoPreview: e.target.checked })}/>Apply valid edits to preview automatically</label>
      <p className="help-text">Unsaved tabs are recovered from temporary .milk files in your Windows application data folder.</p>
      {error && <div className="inline-error">{error}</div>}
      <footer><button type="button" onClick={onClose} disabled={busy}>Cancel</button><button className="primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</button></footer>
    </form>
  </section></div>;
}
