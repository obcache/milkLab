import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { basicSetup } from 'codemirror';
import { EditorState, Compartment } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { StreamLanguage, syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { autocompletion, snippetCompletion } from '@codemirror/autocomplete';
import { setDiagnostics, type Diagnostic } from '@codemirror/lint';
import { tags } from '@lezer/highlight';
import { undo, redo } from '@codemirror/commands';
import capabilities from '../domain/capabilities.json';
import type { PresetDocument, PresetDiagnostic } from '../shared/contracts';

const milkLanguage = StreamLanguage.define({
  startState: () => ({ blockComment: false }),
  token(stream, state) {
    if (state.blockComment) { if (stream.skipTo('*/')) { stream.match('*/'); state.blockComment = false; } else stream.skipToEnd(); return 'comment'; }
    if (stream.eatSpace()) return null;
    if (stream.match('//') || (stream.sol() && stream.match(';'))) { stream.skipToEnd(); return 'comment'; }
    if (stream.match('/*')) { state.blockComment = true; return 'comment'; }
    if (stream.sol() && stream.match(/\[[^\]]+\]/)) return 'heading';
    if (stream.match(/(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/)) return 'number';
    const word = stream.match(/[a-zA-Z_][\w]*/);
    if (word) {
      const name = (word as RegExpMatchArray)[0];
      if (name in capabilities.eel || capabilities.shader.includes(name)) return 'function';
      if (/^(time|bass|mid|treb|bass_att|mid_att|treb_att|rad|ang|x|y|q\d+|frame|fps)$/.test(name)) return 'variableName';
      if (/^(per_frame_|per_pixel_|warp_|comp_|wavecode_|shapecode_)/.test(name)) return 'keyword';
      if (/^(float[234]?|int|return|if|else|shader_body)$/.test(name)) return 'keyword';
      return null;
    }
    stream.next(); return null;
  },
});
const highlighting = HighlightStyle.define([
  { tag: tags.comment, color: '#6a9955' }, { tag: tags.heading, color: '#d7ba7d' },
  { tag: tags.number, color: '#b5cea8' }, { tag: tags.keyword, color: '#c586c0' },
  { tag: tags.function(tags.variableName), color: '#dcdcaa' }, { tag: tags.variableName, color: '#9cdcfe' },
]);
const theme = EditorView.theme({
  '&': { height: '100%', backgroundColor: '#1e1e1e', color: '#d4d4d4' },
  '.cm-scroller': { fontFamily: 'Consolas, "Cascadia Code", monospace', lineHeight: '1.65' },
  '.cm-content': { padding: '16px 0 60px', caretColor: '#aeafad' },
  '.cm-gutters': { backgroundColor: '#1e1e1e', color: '#707070', border: 'none', paddingRight: '12px' },
  '.cm-lineNumbers .cm-gutterElement': { minWidth: '40px' },
  '.cm-activeLine, .cm-activeLineGutter': { backgroundColor: '#ffffff04' },
  '.cm-activeLine': { outline: '1px solid #ffffff0a' },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': { backgroundColor: '#264f78 !important' },
  '.cm-cursor': { borderLeftColor: '#aeafad' },
  '.cm-tooltip': { backgroundColor: '#252526', color: '#ccc', border: '1px solid #454545' },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': { backgroundColor: '#094771', color: '#eee' },
  '.cm-foldGutter': { width: '14px' },
}, { dark: true });
const variableInfo: Record<string, string> = { time: 'Elapsed seconds', bass: 'Bass energy', mid: 'Midrange energy', treb: 'Treble energy', bass_att: 'Smoothed bass', mid_att: 'Smoothed midrange', treb_att: 'Smoothed treble', rad: 'Distance from center (per-pixel)', ang: 'Polar angle (per-pixel)', zoom: 'Feedback zoom', rot: 'Feedback rotation', cx: 'Feedback center X', cy: 'Feedback center Y', dx: 'Translation X', dy: 'Translation Y', decay: 'Feedback persistence', wave_r: 'Waveform red', wave_g: 'Waveform green', wave_b: 'Waveform blue', wave_a: 'Waveform opacity', x: 'Pixel X', y: 'Pixel Y', frame: 'Frame number', fps: 'Frames per second' };
const font = new Compartment();
export interface EditorHandle { replace: (content: string) => void; goTo: (from: number) => void; focus: () => void; undo: () => void; redo: () => void }
export const CodeEditor = forwardRef<EditorHandle, { document: PresetDocument; fontSize: number; diagnostics: PresetDiagnostic[]; onChange: (content: string) => void; onCursor: (line: number, column: number) => void; onSave: (saveAs?: boolean) => void; onApply: () => void; onDropEffect: (id: string) => void }>(function CodeEditor(props, ref) {
  const parent = useRef<HTMLDivElement>(null), view = useRef<EditorView | null>(null);
  const cache = useRef(new Map<string, EditorState>()), callbacks = useRef(props);
  callbacks.current = props;
  useImperativeHandle(ref, () => ({
    replace(content) { const v = view.current; if (v) v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: content } }); },
    goTo(from) { const v = view.current; if (v) { v.dispatch({ selection: { anchor: Math.min(from, v.state.doc.length) }, effects: EditorView.scrollIntoView(Math.min(from, v.state.doc.length), { y: 'center' }) }); v.focus(); } },
    focus() { view.current?.focus(); },
    undo() { if (view.current) undo(view.current); },
    redo() { if (view.current) redo(view.current); },
  }));
  useEffect(() => {
    const cached = cache.current.get(props.document.id);
    const state = cached && cached.doc.toString() === props.document.content ? cached : EditorState.create({
      doc: props.document.content,
      extensions: [basicSetup, milkLanguage, syntaxHighlighting(highlighting), theme, font.of(EditorView.theme({ '&': { fontSize: `${callbacks.current.fontSize}px` } })),
        autocompletion({ override: [context => {
          const word = context.matchBefore(/[\w]*/);
          if (!word || (!context.explicit && word.from === word.to)) return null;
          const shader = /^\s*(warp|comp)_\d+/.test(context.state.doc.lineAt(context.pos).text);
          const functions = shader ? capabilities.shader.map(name => ({ label: name, type: 'function', detail: 'projectM HLSL' })) : Object.entries(capabilities.eel).filter(([name]) => !name.startsWith('_')).map(([name, count]) => snippetCompletion(`${name}(${Array.from({ length: count }, (_, i) => `\$\{arg${i + 1}\}`).join(', ')})`, { label: name, type: 'function', detail: `${count} argument${count > 1 ? 's' : ''} · projectM EEL` }));
          return { from: word.from, options: [...functions, ...Object.entries(variableInfo).map(([label, detail]) => ({ label, detail, type: 'variable' })), ...Array.from({ length: 32 }, (_, i) => ({ label: `q${i + 1}`, detail: 'Shared frame/pixel variable', type: 'variable' }))] };
        }] }),
        keymap.of([{ key: 'Mod-s', run: () => { callbacks.current.onSave(); return true; } }, { key: 'Mod-Shift-s', run: () => { callbacks.current.onSave(true); return true; } }, { key: 'Mod-Enter', run: () => { callbacks.current.onApply(); return true; } }]),
        EditorView.updateListener.of(update => {
          if (update.docChanged) callbacks.current.onChange(update.state.doc.toString());
          if (update.selectionSet || update.docChanged) { const pos = update.state.selection.main.head, line = update.state.doc.lineAt(pos); callbacks.current.onCursor(line.number, pos - line.from + 1); }
        }),
        EditorView.contentAttributes.of({ 'aria-label': 'Preset code editor', 'spellcheck': 'false' }),
      ],
    });
    const editor = new EditorView({ state, parent: parent.current! });
    view.current = editor;
    return () => { cache.current.set(props.document.id, editor.state); editor.destroy(); view.current = null; };
  }, [props.document.id]);
  useEffect(() => { view.current?.dispatch({ effects: font.reconfigure(EditorView.theme({ '&': { fontSize: `${props.fontSize}px` } })) }); }, [props.fontSize, props.document.id]);
  useEffect(() => {
    const v = view.current;
    if (v && v.state.doc.toString() !== props.document.content) v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: props.document.content } });
  }, [props.document.content]);
  useEffect(() => {
    const v = view.current;
    if (v) v.dispatch(setDiagnostics(v.state, props.diagnostics.map(d => ({ ...d, from: Math.min(d.from, v.state.doc.length), to: Math.min(d.to, v.state.doc.length) })) as Diagnostic[]));
  }, [props.diagnostics, props.document.id]);
  return <div className="editor-host" ref={parent} onDragOver={e => { if (e.dataTransfer.types.includes('application/x-milklab-effect')) e.preventDefault(); }} onDrop={e => { const id = e.dataTransfer.getData('application/x-milklab-effect'); if (id) { e.preventDefault(); e.stopPropagation(); props.onDropEffect(id); } }}/ >;
});
