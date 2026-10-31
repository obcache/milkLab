export const blankPreset = `MILKDROP_PRESET_VERSION=201
PSVERSION=2
PSVERSION_WARP=0
PSVERSION_COMP=0
[preset00]
// A new sketch. Drop an effect from the Effects panel to begin.
fRating=3.000
fGammaAdj=1.000
fDecay=0.970
fVideoEchoZoom=1.000
fVideoEchoAlpha=0.000
nWaveMode=0
bAdditiveWaves=1
bWaveDots=0
bWaveThick=1
fWaveAlpha=0.800
fWaveScale=1.000
zoom=1.010
rot=0.000
cx=0.500
cy=0.500
dx=0.000
dy=0.000
wave_r=0.600
wave_g=0.400
wave_b=1.000
wave_x=0.500
wave_y=0.500
// Per-frame equations
per_frame_1=wave_r=0.5+0.4*sin(time*0.7);
per_frame_2=wave_g=0.5+0.4*sin(time*0.9+2);
per_frame_3=wave_b=0.5+0.4*sin(time*0.6+4);
// Per-pixel equations
per_pixel_1=zoom=zoom+0.003*sin(rad*12-time);
`;
export const starterPresets = [
  { name: 'Spectral drift.milk', content: blankPreset.replace('// A new sketch. Drop an effect from the Effects panel to begin.', '// Spectral drift · milkLab original\n// Slowly rotating, audio-reactive feedback with a shifting palette.')
    .replace('rot=0.000', 'rot=0.006').replace('per_pixel_1=zoom=zoom+0.003*sin(rad*12-time);', 'per_frame_4=rot=0.006+0.003*sin(time*0.3);\nper_frame_5=zoom=1.012+0.003*bass_att;\nper_pixel_1=rot=rot+0.008*sin(ang*3+time*0.4);\nper_pixel_2=zoom=zoom+0.005*sin(rad*14-time*0.6);') },
  { name: 'Orbit study.milk', content: blankPreset.replace('nWaveMode=0', 'nWaveMode=1').replace('rot=0.000', 'rot=0.012').replace('per_pixel_1=zoom=zoom+0.003*sin(rad*12-time);', 'per_frame_4=cx=0.5+0.05*sin(time*0.4);\nper_frame_5=cy=0.5+0.05*cos(time*0.4);\nper_pixel_1=rot=rot+0.004*cos(rad*10-time);') },
  { name: 'Pulse field.milk', content: blankPreset.replace('nWaveMode=0', 'nWaveMode=7').replace('per_pixel_1=zoom=zoom+0.003*sin(rad*12-time);', 'per_frame_4=zoom=1.005+0.015*bass_att;\nper_pixel_1=zoom=zoom+0.008*sin(rad*24-time*2);') },
];
