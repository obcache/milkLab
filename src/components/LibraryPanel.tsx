import { useState } from 'react';
import { Search, FileCode2, Check, Wrench, AlertTriangle, FolderOpen, FolderPlus } from 'lucide-react';
import type { Preset } from '../shared/contracts';
export function LibraryPanel({ library, selected, activePath, onSelect, onOpen, onImport }: { library: Preset[]; selected: string | null; activePath?: string | null; onSelect: (id: string) => void; onOpen: (id: string) => void; onImport: (folder: boolean) => void }) {
  const [query, setQuery] = useState(''), [filter, setFilter] = useState('all'), [details, setDetails] = useState(false);
  const filtered = library.filter(p => p.name.toLowerCase().includes(query.toLowerCase()) && (filter === 'all' || p.status === filter));
  const preset = library.find(p => p.id === selected);
  return <div className="library-content">
    <div className="library-import"><button onClick={() => onImport(false)}><FolderOpen size={13}/>Import presets…</button><button className="icon-button outlined" title="Import folder recursively" onClick={() => onImport(true)}><FolderPlus size={14}/></button></div>
    <label className="search-input"><Search size={13}/><input aria-label="Search presets" placeholder="Search presets…" value={query} onChange={e => setQuery(e.target.value)}/></label>
    <div className="list-toolbar"><select aria-label="Filter validation status" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All presets</option><option value="ready">Ready</option><option value="repaired">Repaired</option><option value="review">Needs review</option></select><span>{filtered.length} presets</span></div>
    <div className="preset-list" role="listbox" aria-label="Managed preset library">
      {filtered.map(p => <div key={p.id} className={`preset-row ${selected === p.id ? 'selected' : ''} ${activePath === p.path ? 'opened' : ''}`} role="option" aria-selected={selected === p.id} tabIndex={0} draggable onDragStart={e => { e.dataTransfer.setData('application/x-milklab-preset', p.id); e.dataTransfer.effectAllowed = 'copy'; onSelect(p.id); }} onClick={() => onSelect(p.id)} onDoubleClick={() => onOpen(p.id)} onKeyDown={e => { if (e.key === 'Enter') onOpen(p.id); if (e.key === ' ') { e.preventDefault(); onSelect(p.id); } }} title={`${p.path}\n${p.status === 'ready' ? 'Validated by projectM expression compiler' : [...p.repairs, ...p.warnings].join('\n')}`}>
        <FileCode2 size={14}/><span className="preset-name">{p.name}</span><span className={`preset-status ${p.status}`}>{p.status === 'ready' ? <Check size={12}/> : p.status === 'repaired' ? <Wrench size={12}/> : <AlertTriangle size={12}/>}</span>
      </div>)}
      {!filtered.length && <div className="empty-state">{query ? 'No matching presets.' : 'Import .milk files to build your library.'}</div>}
    </div>
    {preset && <div className="library-details"><button className="details-toggle" onClick={() => setDetails(d => !d)}><span className={`status-dot ${preset.status}`}/><span>{preset.status === 'ready' ? 'Ready for projectM' : preset.status === 'repaired' ? `${preset.repairs.length} automatic repairs` : `${preset.warnings.length} compatibility notes`}</span><span>{details ? '−' : '+'}</span></button>{details && <div className="details-body"><p title={preset.path}>{preset.path}</p>{preset.repairs.map((r, i) => <p key={`r${i}`}><Wrench size={11}/>{r}</p>)}{preset.warnings.map((r, i) => <p key={`w${i}`} className="warning"><AlertTriangle size={11}/>{r}</p>)}<button onClick={() => onOpen(preset.id)}>Open preset</button></div>}</div>}
    <div className="panel-footnote">Double-click to edit · drag to playlist</div>
  </div>;
}
