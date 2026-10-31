# milkLab architecture

`electron/main.ts` owns windows, dialogs and validated IPC. The renderer runs with sandboxing, context isolation, and Node integration disabled. `electron/preload.ts` exposes only the typed operations in `src/shared/contracts.ts`. The main process rejects non-main-frame IPC senders, blocks navigation and new windows, and serializes disk mutations. There is no authentication or remote backend.

`electron/storage.ts` owns managed imports, library indexing, plain text playlists, settings and draft recovery. The renderer cannot supply arbitrary read paths. Save destinations come from native dialogs or a main-process document registry. Existing saved content is compared with disk before overwrite, so an external edit requires Save As. Original imported bytes are stored separately from normalized working copies. Atomic replacement retains the previous file as `.bak`; failed/corrupt JSON reads stop with a preserved-file message. Settings changes select another root without moving old files.

`src/domain/normalize.ts` tokenizes HLSL, respects comments/member accesses, and tracks declaration scopes. A declaration's new local binding becomes visible after its initializer. Simple collisions with projectM uniforms/macros are renamed; function/loop/struct/preprocessor scopes needing more analysis get compatibility notes. Missing `tanh`, `sinh`, and `cosh` calls get scalar/vector helpers using supported intrinsics. User-defined functions remain intact. Unknown calls get review notes. Expanded q variables are never clamped or aliased. Invalid encoding, duplicate/gapped shader keys, multiple preset sections, oversized content and actual EEL compile errors are rejected. Windows-1252 text can be converted for the working copy while original bytes remain intact.

`native/` builds the unmodified sibling projectM as a CMake subproject using Emscripten. The wrapper owns one WebGL2 context and projectM instance, feeds PCM, resizes the framebuffer, loads source text, and reports load errors. The same module can compile EEL in Node without creating an OpenGL context. `electron/evaluator.ts` uses this for import checks and live diagnostics. `src/domain/diagnostics.ts` maps numbered equation groups back to document locations, including this revision's different first/subsequent-line column bases. Shader parsing/GLSL compilation is performed by the actual preview engine; lightweight diagnostics do not claim complete HLSL semantic analysis.

`src/App.tsx` coordinates tabs, drafts, menus, settings and panels. Focused components own code editing, preview, docking, effects, library and playlist UI. CodeMirror loads as a separate chunk and retains per-tab editor state/undo history. Effect insertion produces complete numbered preset records in their own equation contexts, so dropping a recipe cannot accidentally insert EEL into a shader string. SVG thumbnails are illustrative, not exact render predictions. No custom texture import pipeline exists yet.

Docking uses persisted ordered arrays for the left/right columns. Panel menu actions provide a keyboard-operable alternative to HTML drag. Pointer separators resize columns and adjacent expanded panels. Collapsing retains the mounted panel's state, and preview rendering pauses while hidden. Closing flushes recovery writes before allowing the window to exit; abnormal termination restores the last completed recovery write (350 ms debounce, not a guarantee for the latest keystroke during power loss).

## Storage layout

Before acquiring its single-instance lock or initializing Chromium, the main process sets its name to `milkLab` and explicitly selects `path.join(app.getPath('appData'), 'milkLab')` as userData. This is `%APPDATA%/milkLab` on Windows, including direct development entry launches that otherwise inherit Electron's generic identity. `MILKLAB_USER_DATA` remains an explicit override. Both directories are created first; sessionData is set to `<userData>/chromium` before ready. The shared `Electron` directory is never inspected or automatically migrated.

```text
<Documents>/milkLab/              # configurable managed root
  library.json                  # schema v1, managed paths, hashes and repair notes
  presets/*.milk                # normalized working copies
  originals/*.milk              # imported original bytes, UUID filenames
  playlists/*.txt               # CRLF path-only rows
<Electron userData>/
  settings.json                 # schema v1, selected root and preferences
  workspace.json                # schema v1, tab metadata and dock layout
  drafts/<document-id>.milk      # current recovered contents, separate from explicit save
  chromium/                     # isolated Chromium session/cache data
```

Files have `.bak` siblings after replacement. Closed-tab recovery files are retained on disk; workspace metadata lists the currently open tabs. The app does not automatically delete managed originals or migrate storage roots. Versioned JSON workspace exports carry documents/layout only; importing adds unsaved drafts with new IDs and strips destination paths. They are not full library backups. Back up both folders for complete recovery.

## Build boundary

Source: `src/`, `electron/`, `native/`, `tools/`, `installer/`. Intermediates: ignored `build/`. Immutable distribution: ignored `dist/`. Replaceable engine assets/licenses: `public/engine/`, `public/licenses/`. Packaging includes corresponding native source archives and wrapper/build instructions under `resources/app/rebuild/`. No user library, drafts, credentials, or development node_modules are included. The browser-only adapter is labeled as a development preview and uses localStorage; the shipped Electron renderer always uses preload IPC.
