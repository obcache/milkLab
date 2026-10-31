import { useEffect, useRef, useState } from 'react';
import { Play, Pause, Maximize, AudioLines, CircleAlert } from 'lucide-react';

interface Module { ccall: (name: string, result: string | null, types: string[], args: unknown[]) => any; _malloc: (size: number) => number; _free: (pointer: number) => void; HEAPF32: Float32Array }
export function PreviewPanel({ content, revision, visible, onState, onError }: { content: string; revision: number; visible: boolean; onState: (state: string) => void; onError: (error: string) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null), host = useRef<HTMLDivElement>(null), engine = useRef<Module | null>(null);
  const [ready, setReady] = useState(false), [error, setError] = useState(''), [playing, setPlaying] = useState(true);
  const [source, setSource] = useState('tone'), [audioName, setAudioName] = useState(''), [fps, setFps] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null), audioElement = useRef<HTMLAudioElement | null>(null);
  const audio = useRef<{ context: AudioContext; analyser: AnalyserNode; stream?: MediaStream; url?: string } | null>(null);
  const runtime = useRef({ playing, visible, source }), latest = useRef({ content, onState, onError });
  runtime.current = { playing, visible, source }; latest.current = { content, onState, onError };
  const stopAudio = () => { audio.current?.stream?.getTracks().forEach(t => t.stop()); if (audio.current?.url) URL.revokeObjectURL(audio.current.url); void audio.current?.context.close(); audio.current = null; if (audioElement.current) { audioElement.current.pause(); audioElement.current.removeAttribute('src'); } };
  const report = (message: string) => { setError(message); latest.current.onError(message); };
  useEffect(() => {
    let disposed = false, frame = 0, pointer = 0, module: Module | null = null, observer: ResizeObserver | null = null;
    let frames = 0, lastReport = performance.now(), lastFrame = 0, sample = 0;
    const samples = new Float32Array(512);
    async function initialize() {
      try {
        latest.current.onState('Starting projectM…');
        const url = new URL('engine/milklab-projectm.mjs', window.location.href).href;
        const { default: createProjectM } = await import(/* @vite-ignore */ url);
        const loaded: Module = await createProjectM({ canvas: canvas.current, print: () => {}, printErr: (message: string) => { if (/error|failed/i.test(message)) console.warn('[projectM]', message); } });
        if (disposed) return;
        module = loaded; engine.current = loaded;
        if (!loaded.ccall('ml_create', 'number', [], [])) throw new Error(loaded.ccall('ml_error', 'string', [], []));
        pointer = loaded._malloc(512 * 4);
        const resize = () => {
          if (!canvas.current || !module) return;
          const rect = canvas.current.getBoundingClientRect();
          if (rect.width < 2 || rect.height < 2) return;
          const dpr = Math.min(window.devicePixelRatio, 1.5);
          module.ccall('ml_resize', null, ['number', 'number'], [Math.round(rect.width * dpr), Math.round(rect.height * dpr)]);
        };
        observer = new ResizeObserver(resize); observer.observe(canvas.current!); resize();
        setReady(true); latest.current.onState('projectM · WebGL2');
        if (!loaded.ccall('ml_load', 'number', ['string'], [latest.current.content])) report(loaded.ccall('ml_error', 'string', [], []));
        const render = (now: number) => {
          frame = requestAnimationFrame(render);
          if (!module || !runtime.current.playing || !runtime.current.visible || now - lastFrame < 15) return;
          lastFrame = now;
          try {
            if (runtime.current.source === 'tone') {
              for (let i = 0; i < 512; i++, sample++) samples[i] = (Math.sin(sample / 44100 * Math.PI * 2 * 70) * 0.35 + Math.sin(sample / 44100 * Math.PI * 2 * 220) * 0.15) * (0.4 + 0.6 * Math.pow(Math.max(0, Math.sin(now / 280)), 4));
            } else if (audio.current) audio.current.analyser.getFloatTimeDomainData(samples);
            else samples.fill(0);
            module.HEAPF32.set(samples, pointer / 4);
            module.ccall('ml_pcm', null, ['number', 'number'], [pointer, 512]);
            module.ccall('ml_frame', null, [], []);
            frames++;
            if (now - lastReport > 1000) { setFps(Math.round(frames * 1000 / (now - lastReport))); frames = 0; lastReport = now; }
          } catch (e) { cancelAnimationFrame(frame); report(String(e)); latest.current.onState('Preview error'); }
        };
        frame = requestAnimationFrame(render);
      } catch (e) { if (!disposed) { report((e as Error).message); latest.current.onState('Preview unavailable'); } }
    }
    void initialize();
    return () => { disposed = true; cancelAnimationFrame(frame); observer?.disconnect(); if (module) { if (pointer) module._free(pointer); module.ccall('ml_destroy', null, [], []); } engine.current = null; stopAudio(); };
  }, []);
  useEffect(() => {
    if (!ready || !engine.current) return;
    try {
      if (!engine.current.ccall('ml_load', 'number', ['string'], [content])) report(engine.current.ccall('ml_error', 'string', [], []));
      else { report(''); latest.current.onState('projectM · WebGL2'); }
    } catch (e) { report(String(e)); }
  }, [content, revision, ready]);
  async function changeSource(value: string, file?: File) {
    stopAudio(); setSource(value); report('');
    if (value === 'tone' || value === 'silence') return;
    try {
      const context = new AudioContext(), analyser = context.createAnalyser(); analyser.fftSize = 1024;
      audio.current = { context, analyser };
      if (value === 'mic') {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
        audio.current.stream = stream; context.createMediaStreamSource(stream).connect(analyser);
      } else if (file) {
        const url = URL.createObjectURL(file); audio.current.url = url;
        const element = new Audio(); audioElement.current = element;
        // Use a fresh media element node per context/source selection.
        element.src = url;
        const node = context.createMediaElementSource(element); node.connect(analyser); analyser.connect(context.destination);
        await element.play(); setAudioName(file.name);
      }
      await context.resume();
    } catch (e) { stopAudio(); setSource('silence'); report(`Audio input: ${(e as Error).message}`); }
  }
  return <div className="preview-content">
    <div className="preview-canvas-wrap" ref={host}>
      <canvas id="projectm-canvas" ref={canvas} aria-label="Live projectM WebGL2 preset preview"/>
      {!ready && !error && <div className="preview-overlay">Compiling the first frame…</div>}
      {!playing && <div className="preview-pause"><Pause size={20}/><span>Preview paused</span></div>}
      <span className="renderer-label">{ready ? 'WebGL2' : 'projectM'}</span>
      <button className="canvas-expand icon-button" title="Fullscreen preview" onClick={() => void host.current?.requestFullscreen().catch(e => report(String(e)))}><Maximize size={14}/></button>
    </div>
    <div className="preview-controls">
      <button className="icon-button" title={playing ? 'Pause preview' : 'Play preview'} onClick={() => { setPlaying(p => !p); if (audioElement.current && source === 'file') playing ? audioElement.current.pause() : void audioElement.current.play(); }}>{playing ? <Pause size={15}/> : <Play size={15}/>}</button>
      <AudioLines size={14} className="muted"/>
      <select aria-label="Preview audio source" value={source} onChange={e => { if (e.target.value === 'file') fileInput.current?.click(); else void changeSource(e.target.value); }}>
        <option value="tone">Test signal</option><option value="silence">Silence</option><option value="mic">Microphone</option><option value="file">Audio file…</option>
      </select>
      <span className="fps">{ready && playing ? `${fps} fps` : '—'}</span>
    </div>
    <input ref={fileInput} className="visually-hidden" type="file" accept="audio/*" onChange={e => { const file = e.target.files?.[0]; if (file) void changeSource('file', file); e.target.value = ''; }}/>
    {source === 'file' && <div className="audio-file-row"><button title="Choose another audio file" onClick={() => fileInput.current?.click()}>{audioName || 'Choose audio…'}</button><input aria-label="Audio file volume" type="range" min="0" max="1" step="0.05" defaultValue="1" onChange={e => { if (audioElement.current) audioElement.current.volume = Number(e.target.value); }}/></div>}
    {error && <div className="inline-error"><CircleAlert size={13}/><span>{error}</span></div>}
  </div>;
}
