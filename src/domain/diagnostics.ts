import type { PresetDiagnostic } from '../shared/contracts';
export interface EvalResult { message: string; line: number; column: number }
export type Evaluate = (code: string) => EvalResult;
export function diagnosePreset(content: string, evaluate?: Evaluate): PresetDiagnostic[] {
  const diagnostics: PresetDiagnostic[] = [];
  const groups = new Map<string, { code: string; from: number; line: number; number: number }[]>();
  let offset = 0, sections = 0;
  const keys = new Set<string>();
  content.split('\n').forEach((text, i) => {
    const line = i + 1;
    const add = (message: string, severity: 'error' | 'warning' = 'error') => diagnostics.push({ from: offset, to: offset + Math.max(1, text.length), line, message, severity });
    const trimmed = text.trim();
    if (/^\[preset/i.test(trimmed)) {
      sections++;
      if (!/^\[preset0+\]$/i.test(trimmed) || sections > 1) add('Only one [preset00] section is supported.');
    } else if (trimmed && !/^(\/\/|;|\/\*|\*)/.test(trimmed)) {
      const kv = /^\s*(\w+)\s*=/.exec(text);
      if (!kv) add('Expected a preset key followed by =.');
      else {
        const key = kv[1].toLowerCase();
        const duplicate = keys.has(key);
        if (duplicate) add(`Duplicate preset key: ${kv[1]}; projectM uses the first occurrence.`, 'warning');
        keys.add(key);
        const group = /^(per_frame_init_|per_frame_|per_pixel_|wave_\d+_init|wave_\d+_per_frame|wave_\d+_per_point|shape_\d+_init|shape_\d+_per_frame)\d+$/.exec(key)?.[1];
        if (group && !duplicate) {
          if (!groups.has(group)) groups.set(group, []);
          groups.get(group)!.push({ code: text.slice(kv[0].length).replace(/^`/, ''), from: offset + kv[0].length, line, number: Number(key.slice(group.length)) });
        }
      }
    }
    offset += text.length + 1;
  });
  for (const [name, unsorted] of groups) {
    const lines = unsorted.sort((a, b) => a.number - b.number);
    const gap = lines.findIndex((line, i) => line.number !== i + 1);
    if (gap !== -1) {
      const entry = lines[gap];
      diagnostics.push({ from: entry.from, to: Math.min(content.length, entry.from + entry.code.length), line: entry.line, severity: 'warning', message: `${name}: numbering must be consecutive from 1. projectM ignores code after the gap.` });
    }
    if (!evaluate) continue;
    const result = evaluate(lines.map(l => l.code).join('\n'));
    if (!result.message) continue;
    const line = lines[Math.max(0, Math.min(lines.length - 1, result.line - 1))];
    // This projectM-Eval scanner starts the first line at 0; its newline
    // action leaves subsequent lines starting at 1. Preserve source locations.
    const col = Math.max(0, Math.min(line.code.length, result.column - (result.line > 1 ? 1 : 0)));
    const from = line.from + col;
    diagnostics.push({ from, to: Math.min(content.length, from + Math.max(1, /^[A-Za-z_0-9]+/.exec(line.code.slice(col))?.[0].length || 1)), line: line.line, severity: 'error', message: `${name}: ${result.message}` });
  }
  if (!sections) diagnostics.push({ from: 0, to: Math.min(1, content.length), line: 1, severity: 'warning', message: 'Add [preset00] to identify the single preset section.' });
  return diagnostics;
}
