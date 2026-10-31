import { Fragment, useState, type ReactNode, type PointerEvent as ReactPointerEvent } from 'react';
import { ChevronDown, ChevronRight, GripVertical, MoreHorizontal, ArrowLeftRight, ArrowUp, ArrowDown } from 'lucide-react';
import type { Layout, PanelId, PanelState } from '../shared/contracts';
const titles: Record<PanelId, string> = { library: 'Preset library', playlist: 'Playlist', preview: 'projectM preview', effects: 'Effects' };
export function fitColumns(layout: Layout, windowWidth: number) {
  const available = Math.max(460, windowWidth - 382);
  if (layout.leftWidth + layout.rightWidth <= available) return { left: layout.leftWidth, right: layout.rightWidth };
  const extra = available - 460, preferredExtra = layout.leftWidth - 200 + layout.rightWidth - 260;
  const left = 200 + (preferredExtra ? extra * (layout.leftWidth - 200) / preferredExtra : extra / 2);
  return { left, right: available - left };
}
export function beginDrag(event: ReactPointerEvent, move: (dx: number, dy: number) => void) {
  event.preventDefault();
  const x = event.clientX, y = event.clientY;
  const onMove = (e: PointerEvent) => move(e.clientX - x, e.clientY - y);
  const end = () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', end); document.body.classList.remove('resizing'); };
  document.body.classList.add('resizing'); window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', end, { once: true });
}
export function SideColumn({ side, layout, onChange, renderPanel, headers }: { side: 'left' | 'right'; layout: Layout; onChange: (layout: Layout) => void; renderPanel: (id: PanelId, visible: boolean) => ReactNode; headers: Partial<Record<PanelId, ReactNode>> }) {
  const [menu, setMenu] = useState<PanelId | null>(null);
  const panels = layout[side];
  function move(id: PanelId, destination: 'left' | 'right', index?: number) {
    const panel = [...layout.left, ...layout.right].find(p => p.id === id)!;
    const next = { ...layout, left: layout.left.filter(p => p.id !== id), right: layout.right.filter(p => p.id !== id) };
    const list = next[destination]; list.splice(index ?? list.length, 0, panel); onChange(next); setMenu(null);
  }
  function update(id: PanelId, changes: Partial<PanelState>) { onChange({ ...layout, [side]: panels.map(p => p.id === id ? { ...p, ...changes } : p) }); }
  return <aside className={`side-column ${side}`} aria-label={`${side} panels`} onDragOver={e => { if (e.dataTransfer.types.includes('application/x-milklab-panel')) e.preventDefault(); }} onDrop={e => { const id = e.dataTransfer.getData('application/x-milklab-panel') as PanelId; if (id) { e.preventDefault(); move(id, side); } }}>
    {!panels.length && <div className="empty-column">Drop a panel here</div>}
    {panels.map((panel, index) => <Fragment key={panel.id}>
      {index > 0 && <div className="panel-splitter" role="separator" aria-label={`Resize ${titles[panels[index - 1].id]} and ${titles[panel.id]}`} aria-orientation="horizontal" onPointerDown={event => {
        const column = event.currentTarget.parentElement!, a = column.querySelector<HTMLElement>(`[data-panel="${panels[index - 1].id}"]`)!, b = column.querySelector<HTMLElement>(`[data-panel="${panel.id}"]`)!;
        const heights = panels.map(p => ({ ...p, weight: column.querySelector<HTMLElement>(`[data-panel="${p.id}"]`)!.getBoundingClientRect().height }));
        const ah = a.getBoundingClientRect().height, bh = b.getBoundingClientRect().height;
        if (panel.collapsed || panels[index - 1].collapsed) return;
        beginDrag(event, (_, dy) => { const delta = Math.max(100 - ah, Math.min(bh - 100, dy)); onChange({ ...layout, [side]: heights.map((p, i) => ({ ...p, weight: Math.max(1, i === index - 1 ? ah + delta : i === index ? bh - delta : p.weight) })) }); });
      }}/ >}
      <section className={`dock-panel ${panel.collapsed ? 'collapsed' : ''}`} data-panel={panel.id} style={{ flex: panel.collapsed ? '0 0 33px' : `${panel.weight} 1 0px` }}>
        <div className="panel-header" onDragOver={e => { if (e.dataTransfer.types.includes('application/x-milklab-panel')) { e.preventDefault(); e.stopPropagation(); } }} onDrop={e => { const id = e.dataTransfer.getData('application/x-milklab-panel') as PanelId; if (id) { e.preventDefault(); e.stopPropagation(); if (id !== panel.id) move(id, side, index); } }}>
          <span className="panel-grip" draggable title="Drag to reorder or move between columns" onDragStart={e => { e.dataTransfer.setData('application/x-milklab-panel', panel.id); e.dataTransfer.effectAllowed = 'move'; }}><GripVertical size={12}/></span>
          <button className="panel-title" aria-expanded={!panel.collapsed} onClick={() => update(panel.id, { collapsed: !panel.collapsed })}>{panel.collapsed ? <ChevronRight size={13}/> : <ChevronDown size={13}/>}<span>{titles[panel.id]}</span></button>
          <div className="panel-header-actions">{headers[panel.id]}<button className="icon-button" title={`${titles[panel.id]} panel options`} aria-expanded={menu === panel.id} onClick={() => setMenu(menu === panel.id ? null : panel.id)}><MoreHorizontal size={16}/></button></div>
          {menu === panel.id && <><button className="menu-scrim" aria-label="Close panel options" onClick={() => setMenu(null)}/><div className="panel-menu menu-popover">
            <button onClick={() => move(panel.id, side === 'left' ? 'right' : 'left')}><ArrowLeftRight size={13}/>Move to {side === 'left' ? 'right' : 'left'} column</button>
            <button disabled={index === 0} onClick={() => move(panel.id, side, index - 1)}><ArrowUp size={13}/>Move up</button>
            <button disabled={index === panels.length - 1} onClick={() => move(panel.id, side, index + 1)}><ArrowDown size={13}/>Move down</button>
            <button onClick={() => { update(panel.id, { collapsed: !panel.collapsed }); setMenu(null); }}>{panel.collapsed ? 'Expand' : 'Collapse'} panel</button>
          </div></>}
        </div>
        <div className="panel-body" hidden={panel.collapsed}>{renderPanel(panel.id, !panel.collapsed)}</div>
      </section>
    </Fragment>)}
  </aside>;
}
