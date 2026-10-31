import { useState } from 'react';
import { Search, GripVertical } from 'lucide-react';
import { effects, type Effect } from '../domain/effects';
import { EffectArt } from './EffectArt';
export function EffectsPanel({ onInsert }: { onInsert: (effect: Effect) => void }) {
  const [query, setQuery] = useState(''), [category, setCategory] = useState('All');
  const filtered = effects.filter(e => (category === 'All' || e.category === category) && `${e.name} ${e.description}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="effects-content"><label className="search-input"><Search size={13}/><input aria-label="Search effects" placeholder="Search effects…" value={query} onChange={e => setQuery(e.target.value)}/></label>
    <div className="effect-categories" role="tablist" aria-label="Effect categories">{['All', 'Motion', 'Color', 'Waves'].map(c => <button role="tab" aria-selected={category === c} key={c} className={category === c ? 'active' : ''} onClick={() => setCategory(c)}>{c}</button>)}</div>
    <div className="effect-grid">{filtered.map(effect => <button key={effect.id} className="effect-tile" draggable onDragStart={e => { e.dataTransfer.setData('application/x-milklab-effect', effect.id); e.dataTransfer.effectAllowed = 'copy'; }} onDoubleClick={() => onInsert(effect)} onKeyDown={e => { if (e.key === 'Enter') onInsert(effect); }} title={`${effect.description}\nDouble-click or drag into the editor to insert real ${effect.frame.length ? 'per-frame' : ''}${effect.frame.length && effect.pixel.length ? ' and ' : ''}${effect.pixel.length ? 'per-pixel' : ''} equations.\n\n${[...effect.frame, ...effect.pixel].join('\n')}`}>
      <EffectArt effect={effect}/><span className="effect-name">{effect.name}<GripVertical size={11}/></span><span className="effect-description">{effect.description}</span>
    </button>)}{!filtered.length && <div className="empty-state">No matching effects.</div>}</div>
    <div className="panel-footnote">Drag or double-click to insert · illustrations show style</div>
  </div>;
}
