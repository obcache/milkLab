# Project Plan And To-Do

This file is the planning mechanism for active work. Keep it current enough that a new developer or a fresh chat session can understand the next move without reconstructing the whole project history.

## Current Objective

- [x] Fix the confirmed native development-window visibility bug: launch Electron with `windowsHide: false`, verify raw-process visibility before debugger attachment, and obtain user confirmation.
- [x] Fix development startup using the shared Electron user-data folder; verify dedicated milkLab storage and preservation of unrelated settings.
- [x] Build the first usable Windows milkLab IDE for single `.milk` presets, using local projectM with WebGL2.

## Next Actions

- [x] Run the revised command-level `npm run test:dev`: cold/warm real-command launches, native visibility before attachment, editor, WebGL2, settings, reload, diagnostics and clean close passed before the 0.1.1 commit.
- [x] Implement Electron/React/Vite/TypeScript shell with persisted panel ordering, column swaps, resizing and collapse.
- [x] Implement tabbed code editing, completion, diagnostics, explicit saves and recoverable temporary drafts.
- [x] Implement managed preset import with audited normalization based on obspiltMilk; preserve originals and report unsafe cases.
- [x] Implement plain text playlists and library drag/add workflows.
- [x] Implement categorized vector effect thumbnails that insert context-appropriate preset code.
- [x] Compile local projectM via Emscripten, render active code through WebGL2, provide audio input and engine errors.
- [x] Build Windows portable artifact and Inno Setup packaging commands; validate unit/integration and key desktop workflows.
- [x] Reconcile version tooling, package scripts, manifest, foundation and docs, then generate handoff.

The local implementation milestone is complete. See `docs/dev-ledger.md` for checks and artifact paths. Future work below concerns broader preset compatibility and release preparation.

## Backlog

- [ ] Optional minimize-to-tray support and additional effect recipes.
- [ ] User-provided executable icon/branding, first-party license and signing before external release.
- [ ] Physical Windows install/upgrade/uninstall, microphone/audio-file, drag and multi-GPU QA (`docs/manual-qa.md`).
- [ ] Custom texture ingestion/search paths and a broader corpus of shader compatibility cases.

## Risks And Questions

- Previous development smoke checks bypassed the actual Electron spawn options. The revised check invokes the real npm command and asserts native visibility before attaching CDP. The `windowsHide` cause is confirmed by raw-process A/B and the user.
- No automatic rewrite can preserve every unknown shader intrinsic. Proven equivalents are repaired; remaining incompatibilities are reported explicitly.
- Source imports are preserved separately; changing roots selects another library without moving/deleting existing data.
- No `.milk2` dual-preset support. No third-party preset pack or textures are bundled as library content.
- Installer requires Inno Setup. External distribution still needs first-party licensing/signing decisions and the manual checks above.

## Done

- [x] Initial planning file created.
- [x] 2026-10-30: Core app, engine, storage, effects, packaging and automated verification implemented.
- [x] 2026-10-31: Explicit milkLab userData/sessionData selection before startup; real Electron regression verifies foreign settings preservation, preference recovery, and explicit overrides.
- [x] 2026-10-31: Replaced dev port polling with awaited Vite startup; added native renderer diagnostics, DevTools shortcuts and `test:dev` for cold/warm caches, reload, disk-backed settings and live WebGL2 frames.
- [x] 2026-10-31: Corrected Electron's Windows launch visibility; user confirmed the app now works. Replaced the development test's Electron launcher with real-command/CDP validation.
