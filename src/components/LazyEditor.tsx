import { lazy, Suspense, forwardRef, type ComponentProps } from 'react';
import type { CodeEditor as Editor, EditorHandle } from './CodeEditor';
const LazyEditor = lazy(() => import('./CodeEditor').then(module => ({ default: module.CodeEditor })));
export type { EditorHandle } from './CodeEditor';
export const CodeEditor = forwardRef<EditorHandle, ComponentProps<typeof Editor>>(function CodeEditor(props, ref) {
  return <Suspense fallback={<div className="editor-host empty-state">Opening the code editor…</div>}><LazyEditor {...props} ref={ref}/></Suspense>;
});
