import { describe, it, expect, beforeAll } from 'vitest';
import path from 'node:path';
import { normalizePreset } from '../src/domain/normalize';
import { effects, insertEffect } from '../src/domain/effects';
import { blankPreset } from '../src/domain/presets';
import { diagnosePreset, type Evaluate } from '../src/domain/diagnostics';
import { loadEvaluator } from '../electron/evaluator';
import { parsePlaylist, serializePlaylist, safeName } from '../electron/storage';
import { fitColumns } from '../src/components/PanelLayout';
import { defaultLayout } from '../src/shared/contracts';

let evaluate: Evaluate;
beforeAll(async () => { evaluate = await loadEvaluator(path.resolve('public/engine/milklab-projectm.mjs')); });
const shader = (body: string) => `[preset00]\nfDecay=0.98\n${body.split('\n').map((line, i) => `comp_${i + 1}=\`${line}`).join('\n')}\n`;
describe('import normalization', () => {
  it('renames shader locals after initializers and preserves engine uniforms, members, comments and nested scope', () => {
    const result = normalizePreset(shader('shader_body\n{\nfloat aspect = aspect.x/aspect.y;\nret = float3(aspect, time, 1);\n{ float time=2; ret.x=time; }\nret.y=time; // time aspect\n}'));
    expect(result.accepted).toBe(true);
    expect(result.content).toContain('float milklab_local_aspect = aspect.x/aspect.y;');
    expect(result.content).toContain('float3(milklab_local_aspect, time, 1)');
    expect(result.content).toContain('ret.x=milklab_local_time;');
    expect(result.content).toContain('ret.y=time; // time aspect');
  });
  it('avoids colliding with existing helper/variable names and leaves user-defined functions intact', () => {
    const result = normalizePreset(shader('float tanh(float v) { return v; }\nshader_body { float milklab_local_time=1; float time=2; ret=float3(tanh(time),0,0); }'));
    expect(result.content).toContain('float milklab_local_time_=2');
    expect(result.content).toContain('tanh(milklab_local_time_)');
    expect(result.repairs.some(r => r.includes('scalar/vector'))).toBe(false);
  });
  it('uses stable overloaded helpers for missing hyperbolic shader intrinsics', () => {
    const result = normalizePreset(shader('shader_body { ret=tanh(float3(uv,0)); }'));
    expect(result.content).toContain('float4 milklab_tanh(float4 v)');
    expect(result.content).toContain('exp(-2.0*abs(v))');
    expect(result.content).toContain('ret=milklab_tanh(float3(uv,0))');
    expect(normalizePreset(result.content).repairs).toEqual([]);
  });
  it('reports unsupported calls and complex scopes instead of silently changing their meaning', () => {
    const result = normalizePreset(shader('float fn(float time) { return time; }\nshader_body { ret=unknown_intrinsic(uv); }'));
    expect(result.warnings.join('\n')).toMatch(/manual reserved-name review/);
    expect(result.warnings.join('\n')).toMatch(/unknown_intrinsic/);
    expect(result.content).toContain('float fn(float time)');
  });
  it.each(['[preset00]\n[preset01]\nfDecay=1', '[preset00]\nfDecay=1\ncomp_1=`a\ncomp_3=`b', '[preset00]\nfDecay=1\nwarp_1=`a\nwarp_1=`b', 'not a preset', '\0fDecay=1'])('rejects malformed input %#', source => {
    expect(normalizePreset(source).accepted).toBe(false);
  });
  it('rejects milk2 and oversized normalized files; warns on expanded q variables', () => {
    expect(normalizePreset(blankPreset, 'dual.milk2').accepted).toBe(false);
    expect(normalizePreset(blankPreset + ' '.repeat(1048576)).accepted).toBe(false);
    expect(normalizePreset(blankPreset + 'per_frame_99=q40=bass;\n').warnings.join()).toMatch(/above q32/);
  });
});
describe('real projectM expression validation', () => {
  it('underlines syntax and unknown functions at the original document line/column', () => {
    const source = '[preset00]\nfDecay=0.98\nper_frame_1=zoom=sin(;\nper_pixel_1=rot=nonexistent(time);\n';
    const diagnostics = diagnosePreset(source, evaluate).filter(d => d.severity === 'error');
    expect(diagnostics).toHaveLength(2);
    expect(diagnostics[0].line).toBe(3);
    expect(source.slice(diagnostics[0].from, diagnostics[0].to)).toBe(';');
    expect(diagnostics[1].line).toBe(4);
    expect(diagnosePreset(blankPreset, evaluate)).toEqual([]);
    const multiline = '[preset00]\nfDecay=0.98\nper_frame_1=x=1;\nper_frame_2=zoom=sin(;\n';
    const second = diagnosePreset(multiline, evaluate).find(d => d.severity === 'error')!;
    expect(second.line).toBe(4);
    expect(multiline.slice(second.from, second.to)).toBe(';');
  });
  it('inserts all recipes without duplicate numbered keys and compiles with the actual engine', () => {
    let content = blankPreset;
    for (const effect of effects) content = insertEffect(content, effect);
    expect(diagnosePreset(content, evaluate)).toEqual([]);
    expect(content).toContain('// Spiral drift');
    expect(content.match(/per_frame_1=/g)).toHaveLength(1);
  });
  it('supports functions actually present in this projectM revision', () => {
    expect(evaluate('x=atan2(1,2)+sigmoid(1,2)+log10(10);').message).toBe('');
    expect(evaluate('x=sin(1,2);').message).not.toBe('');
  });
});
describe('MilkDrop playlists and filenames', () => {
  it('round-trips path-only CRLF rows, preserving spaces and sequence', () => {
    const entries = [path.resolve('a preset.milk'), path.resolve('b.milk')];
    expect(serializePlaylist(entries)).toBe(entries.join('\r\n') + '\r\n');
    expect(parsePlaylist(serializePlaylist(entries), process.cwd())).toEqual(entries);
    expect(parsePlaylist('\uFEFFrelative.milk\r\n', process.cwd())).toEqual([path.resolve('relative.milk')]);
    expect(() => serializePlaylist(['a.milk\nb.milk'])).toThrow();
    expect(() => parsePlaylist('dual.milk2', process.cwd())).toThrow();
  });
  it('rejects Windows device filenames and sanitizes path separators', () => {
    expect(() => safeName('CON')).toThrow();
    expect(safeName('../foo')).not.toContain('/');
  });
});
it('keeps a usable editor when a window with wide preferred columns is shrunk', () => {
  const preferred = { ...defaultLayout, leftWidth: 500, rightWidth: 650 };
  expect(fitColumns(preferred, 1600)).toEqual({ left: 500, right: 650 });
  const narrow = fitColumns(preferred, 1060);
  expect(narrow.left).toBeGreaterThanOrEqual(200);
  expect(narrow.right).toBeGreaterThanOrEqual(260);
  expect(narrow.left + narrow.right + 382).toBeLessThanOrEqual(1060);
});
