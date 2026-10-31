const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
module.exports = function updateCapabilities(source) {
  const read = file => fs.readFileSync(path.join(source, file), 'utf8');
  const parser = read('vendor/hlslparser/src/HLSLParser.cpp');
  const eelSource = read('vendor/projectm-eval/projectm-eval/TreeFunctions.c');
  const header = read('src/libprojectM/MilkdropPreset/Shaders/PresetShaderHeaderGlsl330.inc');
  const shader = [...new Set([...parser.matchAll(/(?:Intrinsic|INTRINSIC_[A-Z0-9_]+|SAMPLER_INTRINSIC_FUNCTION)\(\s*"([^"]+)"/g)].map(m => m[1]))];
  const eel = Object.fromEntries([...eelSource.matchAll(/\{\s*"([a-z_0-9]+)"\s*,\s*\w+\s*,\s*(\d+)/g)].map(m => [m[1], +m[2]]));
  const macros = [...header.matchAll(/^\s*#define\s+([A-Za-z_]\w*)/gm)].map(m => m[1]);
  const uniforms = [...header.matchAll(/uniform\s+\w+\s+([^;]+);/g)].flatMap(m => m[1].split(',').map(n => n.trim().match(/^\w+/)?.[0]).filter(Boolean));
  const revision = execFileSync('git', ['-C', source, 'rev-parse', 'HEAD'], { encoding: 'utf8', windowsHide: true }).trim();
  fs.writeFileSync('src/domain/capabilities.json', JSON.stringify({ revision, eel, shader, reserved: [...new Set([...macros, ...uniforms])] }, null, 2) + '\n');
};
if (require.main === module) module.exports(path.resolve(process.env.PROJECTM_SOURCE || '../projectm'));
