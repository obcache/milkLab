// Conservative token/scoping approach informed by obcache/obspiltMilk's preset importer.
// Comments, member names, engine uniforms and source originals are preserved.
import capabilities from './capabilities.json';
export interface Token { text: string; from: number; to: number }
export function tokenize(source: string): Token[] {
  const pattern = /\/\/[^\n]*|\/\*[\s\S]*?\*\/|^[ \t]*#[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[A-Za-z_][A-Za-z_0-9]*|(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?|[^\s]/gm;
  return [...source.matchAll(pattern)].filter(m => !/^(\/\/|\/\*|\s*#|["'])/.test(m[0])).map(m => ({ text: m[0], from: m.index!, to: m.index! + m[0].length }));
}
const reserved = new Set(('aspect texsize time fps frame progress bass mid treb vol bass_att mid_att treb_att vol_att roam_cos roam_sin slow_roam_cos slow_roam_sin mip_x mip_y mip_xy mip_avg blur1_min blur1_max blur2_min blur2_max blur3_min blur3_max rad ang uv uv_orig hue_shader M_PI M_PI_2 M_INV_PI_2 sampler_FC_main sampler_PC_main sampler_FW_main sampler_PW_main input output sample texture rand_frame rand_preset').split(' ').concat(Array.from({ length: 32 }, (_, i) => `q${i + 1}`)));
for (const name of capabilities.reserved) reserved.add(name);
const shaderType = /^(?:float|half|int|bool|double|uint)(?:[1-4](?:x[1-4])?)?$/;
const helpers: Record<string, string> = {
  tanh: 'float e=exp(-2.0*abs(v)); return sign(v)*(1.0-e)/(1.0+e);',
  sinh: 'return (exp(v)-exp(-v))*0.5;',
  cosh: 'return (exp(v)+exp(-v))*0.5;',
};
export interface Normalization { accepted: boolean; content: string; repairs: string[]; warnings: string[]; error?: string }
function repairShader(source: string, block: string, result: Normalization) {
  const tokens = tokenize(source), used = new Set(tokens.map(t => t.text));
  const unique = (name: string) => { while (used.has(name)) name += '_'; used.add(name); return name; };
  const functions = new Set<string>();
  let unsafe = false, depth = 0;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i].text;
    if (t === '(') depth++;
    if (t === ')') depth--;
    if (t === 'struct' || t === '#') unsafe = true;
    if (shaderType.test(t) && tokens[i + 1]) {
      const name = tokens[i + 1].text, fn = tokens[i + 2]?.text === '(';
      if (fn) functions.add(name);
      if (reserved.has(name) && (depth !== 0 || fn)) unsafe = true;
    }
  }
  // Macro expansion and nontrivial declaration scopes need compiler-aware review.
  if (/^\s*#/m.test(source)) unsafe = true;
  if (unsafe) result.warnings.push(`${block}: complex declaration or preprocessor scope requires manual reserved-name review.`);
  const allowedCalls = new Set([...capabilities.shader, ...Object.keys(helpers), 'if', 'for', 'while', 'switch', 'GetBlur1', 'GetBlur2', 'GetBlur3', 'GetPixel', 'GetMain', 'GetNoise', 'GetNoiseVol']);
  const unknown = new Set<string>();
  tokens.forEach((t, i) => {
    if (/^[A-Za-z_]/.test(t.text) && tokens[i + 1]?.text === '(' && !shaderType.test(t.text) && !functions.has(t.text) && !allowedCalls.has(t.text)) unknown.add(t.text);
  });
  for (const fn of unknown) result.warnings.push(`${block}: function ${fn} is not in the projectM shader intrinsic catalog; no proven automatic equivalent. Check the engine preview.`);
  const scopes: Map<string, string>[] = [new Map()];
  const replacements = new Map<number, string>(), renamed = new Set<string>(), needed = new Map<string, string>();
  let declaration = false, expectName = false, pendingName = '', pendingReplacement = '', pendingDepth = 0;
  depth = 0;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i].text;
    if (t === '{') scopes.push(new Map());
    if (t === '}' && scopes.length > 1) scopes.pop();
    if (t === '(') depth++;
    if (t === ')') depth--;
    if (declaration && (t === ';' || t === ',') && depth === pendingDepth) {
      if (pendingName) scopes.at(-1)!.set(pendingName, pendingReplacement);
      pendingName = ''; pendingReplacement = '';
      expectName = t === ','; declaration = expectName;
    }
    if (shaderType.test(t) && /^[A-Za-z_]/.test(tokens[i + 1]?.text || '')) {
      declaration = true; expectName = true; pendingDepth = depth; continue;
    }
    if (expectName && /^[A-Za-z_]/.test(t)) {
      expectName = false;
      if (!unsafe) {
        // Identity mappings also shadow repaired locals in nested scopes.
        pendingName = t; pendingReplacement = t;
        if (reserved.has(t)) {
          pendingReplacement = unique(`milklab_local_${t}`);
          replacements.set(i, pendingReplacement); renamed.add(t);
        }
      }
      continue;
    }
    if (tokens[i - 1]?.text === '.') continue;
    if (helpers[t] && !functions.has(t) && tokens[i + 1]?.text === '(') {
      if (!needed.has(t)) needed.set(t, unique(`milklab_${t}`));
      replacements.set(i, needed.get(t)!); continue;
    }
    for (let s = scopes.length - 1; s >= 0; s--) {
      if (scopes[s].has(t)) { replacements.set(i, scopes[s].get(t)!); break; }
    }
  }
  let repaired = '', last = 0;
  for (const [i, value] of [...replacements].sort((a, b) => a[0] - b[0])) {
    repaired += source.slice(last, tokens[i].from) + value; last = tokens[i].to;
  }
  repaired += source.slice(last);
  for (const name of renamed) result.repairs.push(`${block}: renamed local shader variable ${name}.`);
  let prelude = '';
  for (const [fn, name] of needed) {
    for (const type of ['float', 'float2', 'float3', 'float4']) prelude += `${type} ${name}(${type} v) { ${helpers[fn].replace('float e', `${type} e`)} }\n`;
    result.repairs.push(`${block}: replaced ${fn} with scalar/vector ${name} helper.`);
  }
  return prelude + repaired;
}
export function normalizePreset(input: string, filename = 'preset.milk'): Normalization {
  const result: Normalization = { accepted: false, content: '', repairs: [], warnings: [] };
  const fail = (error: string) => ({ ...result, error, content: '', accepted: false });
  if (!/\.milk$/i.test(filename)) return fail('Only single .milk presets are supported.');
  if (!input.trim() || new TextEncoder().encode(input).length > 2097152) return fail('Empty preset or file exceeds the 2 MiB import limit.');
  if (input.includes('\0')) return fail('Binary/UTF-16 preset. Convert to UTF-8 before importing.');
  if (input.charCodeAt(0) === 0xfeff) { input = input.slice(1); result.repairs.push('Removed UTF-8 byte order mark.'); }
  let recognized = false, sections = 0, spacing = false;
  const groups = new Map<string, Map<number, number>>();
  const lines = input.replace(/\r\n?/g, '\n').split('\n').map(text => {
    const trimmed = text.trim(), section = /^\[preset(\d+)\]$/i.exec(trimmed);
    if (section) { sections++; if (!/^0+$/.test(section[1])) sections = 100; }
    const kv = /^(\w+)\s*=([\s\S]*)$/.exec(trimmed);
    if (!kv || /^(\/\/|;)/.test(trimmed)) return { text, key: '', value: '', group: '' };
    const key = kv[1].toLowerCase(), value = kv[2];
    recognized ||= /^(?:fdecay|zoom|nwavemode|frating|milkdrop_preset_version|per_frame_\d+|wavecode_\d+_.+|shapecode_\d+_.+|warp_\d+|comp_\d+)$/.test(key);
    const normalized = `${kv[1]}=${value}`; spacing ||= text !== normalized;
    return { text: normalized, key, value, group: /^(warp_|comp_)\d+$/.exec(key)?.[1] || '' };
  });
  if (sections > 1) return fail('Multiple/invalid preset sections cannot be represented by one projectM preset.');
  if (!recognized) return fail('No recognized MilkDrop preset keys.');
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (!l.group) continue;
    const n = Number(l.key.slice(l.group.length));
    if (!groups.has(l.group)) groups.set(l.group, new Map());
    const group = groups.get(l.group)!;
    if (n < 1 || group.has(n)) return fail(`Invalid/duplicate shader line: ${l.key}.`);
    group.set(n, i);
  }
  const repaired = new Map<string, string>();
  for (const [group, entries] of groups) {
    const sorted = [...entries].sort((a, b) => a[0] - b[0]);
    if (sorted.some(([n], i) => n !== i + 1)) return fail(`Gap in numbered shader lines: ${group}.`);
    const source = sorted.map(([, i]) => lines[i].value.replace(/^\s*`/, '')).join('\n');
    repaired.set(group, repairShader(source, group.slice(0, -1), result));
  }
  const emitted = new Set<string>();
  result.content = lines.flatMap(l => {
    if (!l.group) return [l.text];
    if (emitted.has(l.group)) return [];
    emitted.add(l.group);
    return repaired.get(l.group)!.split('\n').map((line, i) => `${l.group}${i + 1}=\`${line}`);
  }).join('\n').replace(/\n*$/, '\n');
  if (spacing) result.repairs.push('Normalized preset key/value spacing.');
  if (tokenize(result.content).some(t => /^q\d+$/i.test(t.text) && Number(t.text.slice(1)) > 32)) result.warnings.push('q variables above q32 are not shared across projectM contexts. No safe automatic remapping.');
  const mode = lines.find(l => l.key === 'nwavemode');
  if (mode && (!/^\s*\d+\s*$/.test(mode.value) || Number(mode.value) > 15)) result.warnings.push('nWaveMode is outside projectM’s supported 0–15 range.');
  if (new TextEncoder().encode(result.content).length > 1048576) return fail('Normalized preset exceeds projectM’s 1 MiB parser limit.');
  result.accepted = true;
  return result;
}
