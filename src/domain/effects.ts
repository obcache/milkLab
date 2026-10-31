export interface Effect { id: string; name: string; category: 'Motion' | 'Color' | 'Waves'; description: string; frame: string[]; pixel: string[]; art: 'spiral' | 'kaleidoscope' | 'rings' | 'ribbon' | 'rays' | 'color'; color: string }
export const effects: Effect[] = [
  { id: 'spiral', name: 'Spiral drift', category: 'Motion', description: 'Twist the feedback field', frame: ['rot=rot+0.004*sin(time*0.4);'], pixel: ['rot=rot+0.008*sin(ang*3+time*0.4);'], art: 'spiral', color: '#a58bfa' },
  { id: 'kaleidoscope', name: 'Kaleido fold', category: 'Motion', description: 'Six-fold angular symmetry', frame: [], pixel: ['rot=rot+0.018*sin(ang*6+time*0.2);', 'zoom=zoom+0.006*cos(ang*6);'], art: 'kaleidoscope', color: '#c18bff' },
  { id: 'pulse', name: 'Pulse rings', category: 'Motion', description: 'Audio-reactive radial ripples', frame: ['zoom=zoom+0.004*bass_att;'], pixel: ['zoom=zoom+0.007*sin(rad*24-time*2);'], art: 'rings', color: '#8d9dff' },
  { id: 'ribbon', name: 'Wave ribbon', category: 'Waves', description: 'A gently moving waveform', frame: ['wave_x=0.5+0.08*sin(time*0.6);', 'wave_y=0.5+0.08*cos(time*0.7);', 'wave_a=0.65+0.15*sin(time);'], pixel: [], art: 'ribbon', color: '#6ccadd' },
  { id: 'zoom', name: 'Radial zoom', category: 'Motion', description: 'Expand from the center', frame: ['zoom=zoom+0.006;'], pixel: ['zoom=zoom+0.004*rad;'], art: 'rays', color: '#a68cfa' },
  { id: 'color', name: 'Color drift', category: 'Color', description: 'Slow spectral color cycle', frame: ['wave_r=0.5+0.45*sin(time*0.35);', 'wave_g=0.5+0.45*sin(time*0.35+2.094);', 'wave_b=0.5+0.45*sin(time*0.35+4.188);'], pixel: [], art: 'color', color: '#d38cce' },
  { id: 'orbit', name: 'Orbit center', category: 'Motion', description: 'Move the feedback origin', frame: ['cx=0.5+0.06*sin(time*0.3);', 'cy=0.5+0.06*cos(time*0.3);'], pixel: [], art: 'spiral', color: '#6bc7c6' },
  { id: 'breath', name: 'Breathing field', category: 'Motion', description: 'A slow expansion and return', frame: ['zoom=zoom+0.006*sin(time*0.5);'], pixel: ['sx=1+0.01*sin(time+rad*8);', 'sy=1+0.01*cos(time+rad*8);'], art: 'rings', color: '#c797ba' },
  { id: 'bass', name: 'Bass glow', category: 'Color', description: 'Warm color driven by bass', frame: ['wave_r=min(1,0.3+0.5*bass_att);', 'wave_g=0.2+0.15*mid_att;', 'wave_b=0.6+0.2*treb_att;'], pixel: [], art: 'color', color: '#ed9c9c' },
  { id: 'tide', name: 'Tidal warp', category: 'Motion', description: 'Horizontal sinusoidal flow', frame: [], pixel: ['dx=dx+0.002*sin(y*18+time);', 'dy=dy+0.002*cos(x*18-time);'], art: 'ribbon', color: '#84b2eb' },
  { id: 'echo', name: 'Echo trails', category: 'Waves', description: 'Leave a softer waveform trail', frame: ['decay=0.975;', 'wave_a=0.5;', 'wave_r=0.5+0.3*sin(time);'], pixel: [], art: 'rays', color: '#a0c5bd' },
  { id: 'prism', name: 'Prism shift', category: 'Color', description: 'Three offset color oscillators', frame: ['wave_r=abs(sin(time*0.5));', 'wave_g=abs(sin(time*0.5+1));', 'wave_b=abs(sin(time*0.5+2));'], pixel: [], art: 'kaleidoscope', color: '#aea2eb' },
];
export function insertEffect(content: string, effect: Effect) {
  let lines = content.replace(/\r\n/g, '\n').split('\n');
  for (const [prefix, equations] of [['per_frame_', effect.frame], ['per_pixel_', effect.pixel]] as const) {
    if (!equations.length) continue;
    const regex = new RegExp(`^\\s*${prefix}(\\d+)\\s*=`);
    let max = 0, after = -1;
    lines.forEach((line, i) => { const m = regex.exec(line); if (m) { max = Math.max(max, Number(m[1])); after = i; } });
    const added = [`// ${effect.name} · ${effect.category.toLowerCase()}`, ...equations.map((code, i) => `${prefix}${max + i + 1}=${code}`)];
    if (after < 0) lines.push('', ...added);
    else lines.splice(after + 1, 0, ...added);
  }
  return lines.join('\n').replace(/\n*$/, '\n');
}
