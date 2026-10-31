import { useId } from 'react';
import type { Effect } from '../domain/effects';
export function EffectArt({ effect }: { effect: Effect }) {
  const id = useId().replace(/:/g, '');
  const paths: string[] = [];
  if (effect.art === 'spiral') {
    for (let k = 0; k < 7; k++) {
      const points = Array.from({ length: 100 }, (_, i) => { const a = i * 0.075 + k * Math.PI * 2 / 7, r = 2 + i * 0.66; return `${80 + Math.cos(a) * r},${42 + Math.sin(a) * r * 0.6}`; });
      paths.push(`M${points.join(' L')}`);
    }
  } else if (effect.art === 'ribbon' || effect.art === 'color') {
    for (let k = 0; k < 14; k++) paths.push(`M${Array.from({ length: 81 }, (_, i) => { const x = i * 2; return `${x},${42 + Math.sin(x * 0.04 + k * 0.12) * (12 + k * 0.9) + (k - 7) * 1.3}`; }).join(' L')}`);
  } else if (effect.art === 'kaleidoscope') {
    for (let k = 0; k < 12; k++) {
      const a = k * Math.PI / 6;
      const p = (r: number, angle: number) => `${80 + Math.cos(angle) * r},${42 + Math.sin(angle) * r * 0.58}`;
      paths.push(`M80,42 L${p(72, a)} L${p(29, a + 0.22)} L${p(70, a + 0.42)} Z`);
    }
  } else if (effect.art === 'rays') {
    for (let k = 0; k < 40; k++) { const a = k * Math.PI / 20; paths.push(`M${80 + Math.cos(a) * 12},${42 + Math.sin(a) * 7} L${80 + Math.cos(a) * 100},${42 + Math.sin(a) * 60}`); }
  }
  return <svg viewBox="0 0 160 84" role="img" aria-label={`${effect.name} vector style illustration`}>
    <defs><linearGradient id={id} x1="0" y1="1" x2="1" y2="0"><stop stopColor="#61cbda"/><stop offset=".5" stopColor={effect.color}/><stop offset="1" stopColor="#b065dc"/></linearGradient></defs>
    <rect width="160" height="84" fill="#141419"/>
    <path d="M0 42H160M80 0V84" stroke="#24242c" strokeWidth=".5"/>
    {effect.art === 'rings' ? Array.from({ length: 8 }, (_, i) => <ellipse key={i} cx="80" cy="42" rx={7 + i * 9} ry={5 + i * 5} fill="none" stroke={`url(#${id})`} strokeWidth={i % 2 ? 0.7 : 1.5} opacity={1 - i * 0.07}/>) : paths.map((d, i) => <path key={i} d={d} fill={effect.art === 'kaleidoscope' ? `${effect.color}0c` : 'none'} stroke={`url(#${id})`} strokeWidth={i % 3 === 0 ? 1.2 : 0.6} opacity={0.55 + (i % 4) * 0.1}/>)}
  </svg>;
}
