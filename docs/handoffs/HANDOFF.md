# Project Handoff

Generated: 2026-10-31T14:48:20.139Z

## Summary

Ready for local v0.1.1 commit: full milkLab IDE plus isolated userData and visible Windows Electron launch. Real-command test:dev cold/warm passed, 25 tests passed, startup/source/packaged desktop workflows passed; portable and unsigned 0.1.1 Inno installer rebuilt and artifact checks passed. No migrations, install or publication. Preserve uncommitted .vscode/settings.json and sibling projectM BUILDING.md edit. Packaging used and then removed an isolated clean matching source clone. Stage reviewed source/docs/engine/tooling only; commit locally without auto-push. Remaining release work: manual audio/physical drag/GPU/installer lifecycle, first-party license/branding/signing, texture compatibility.

## Current Branch

main

## Working Tree

M  .env.example
 M .vscode/settings.json
M  README.md
A  THIRD_PARTY_NOTICES.md
M  VERSION
M  docs/PROJECT_FOUNDATION.md
MM docs/dev-ledger.md
A  docs/developer/architecture.md
M  docs/developer/build.md
M  docs/developer/deployment.md
M  docs/developer/handoff.md
M  docs/developer/testing.md
M  docs/developer/versioning.md
M  docs/developer/workflow.md
A  docs/handoffs/HANDOFF.md
M  docs/manual-qa.md
M  docs/planning/To-do.md
M  docs/user/UserGuide.md
A  electron/evaluator.ts
A  electron/main.ts
A  electron/preload.ts
A  electron/storage.ts
A  index.html
A  installer/milkLab.iss
A  native/CMakeLists.txt
A  native/preview.cpp
A  package-lock.json
M  package.json
A  public/engine/milklab-projectm.mjs
A  public/engine/milklab-projectm.wasm
A  public/engine/projectM-COPYING
A  public/engine/projectM-LICENSE.txt
A  public/engine/provenance.json
A  public/licenses/Apache-2.0.txt
A  public/licenses/GLAD.txt
A  public/licenses/GLM.txt
A  public/licenses/native.txt
A  public/licenses/npm.txt
AM src/App.tsx
A  src/browser-api.ts
A  src/components/CodeEditor.tsx
A  src/components/EffectArt.tsx
A  src/components/EffectsPanel.tsx
A  src/components/LazyEditor.tsx
A  src/components/LibraryPanel.tsx
A  src/components/PanelLayout.tsx
A  src/components/PlaylistPanel.tsx
A  src/components/PreviewPanel.tsx
A  src/components/SettingsDialog.tsx
A  src/domain/capabilities.json
A  src/domain/diagnostics.ts
A  src/domain/effects.ts
A  src/domain/normalize.ts
A  src/domain/presets.ts
A  src/main.tsx
A  src/shared/contracts.ts
A  src/styles.css
A  tests/domain.test.ts
A  tests/storage.test.ts
A  tests/versioning.test.ts
A  tools/build-electron.cjs
A  tools/build-projectm.cjs
A  tools/deploy-check.cjs
A  tools/dev.cjs
A  tools/installer.cjs
A  tools/notices.cjs
A  tools/package.cjs
M  tools/project-mgmt/README.md
M  tools/project-mgmt/foundation.json
M  tools/project-mgmt/manifest.json
A  tools/project-mgmt/version-files.js
M  tools/project-mgmt/version-show.js
M  tools/project-mgmt/version-sync.js
A  tools/smoke.cjs
A  tools/test-dev.cjs
A  tools/test-startup.cjs
A  tools/update-capabilities.cjs
A  tsconfig.json
A  vite.config.mts
A  vitest.config.mts

## Recent Commits

5f821e7 chore: add milkLab.code-workspace to .gitignore
2ddb21c chore: bootstrap project foundation

## Foundation

# milkLab: Project Foundation

These selections were supplied through Reponator's creation wizard. They define
the implementation environment. The user's feature request supplies application
functionality. Scaffolding these decisions does not implement an application or login.

## Application and delivery

- stack: Electron / React / Vite / TypeScript
- platform: Windows desktop
- deployment: Desktop distribution
- packaging: Windows installer (Inno Setup)
- connectivity: Offline-first / local operation

## UX and branding

- theme: VS Code-inspired dark
- density: Dense information workspace
- layout: Resizable workspace with collapsible panels
- primarySurface: Tabbed preset code editor, docked library, playlists, projectM preview and effect recipes
- overlays: Click-open drawers and dialogs
- chrome: Custom themed titlebar and window controls
- scrollbars: Themed scrollbars and form controls
- tray: Optional minimize to tray
- branding: Use user-provided brand assets
- iconStates: Single application icon
- visualStyle: Quiet utilitarian controls
- settings: Persist settings and workspace layout

## Storage and data exchange

- storage: Local JSON files
- interchange: Versioned JSON import / export

## Users and access

- users: Single user
- authentication: No application login
- authorization: No role system
- adminSetup: No administrator account

## Verification

- testing: Unit + integration + key workflow smoke tests

## Local User Model

One local user, no login, administrator bootstrap, roles, credentials, or remote service.

## Delivery And Data Boundaries

Use package.json as the command surface and dist/ as the distribution boundary.
Keep mutable user data outside the installed application. Use migrations for
relational data, and test backup/restore. Shared databases live behind a trusted
server API; desktop/browser clients must not contain database credentials.
Electron implementations isolate the renderer from Node with a typed preload
bridge and validated IPC. Any settings, tray, icon and overlay decisions above
are foundation preferences; feature-specific behavior comes from the user request.

## Additional User Constraints

- Single `.milk` presets only; no `.milk2` dual-preset support.
- Panel ordering, left/right placement, height, width, and collapse state persist.
- Unsaved tabs use temporary `.milk` recovery files outside the installed application.
- Imported originals remain byte-exact; managed working copies are normalized with an audit report.
- Unknown/unsafe rewrites and q variables above q32 require review.
- Playlists are path-only plain text files in a `playlists` subfolder.
- projectM is compiled from `E:/Production/Coding/projectm` (portable default: `../projectm`) into replaceable WebAssembly/JavaScript assets with WebGL2 only.
- Vector effect thumbnails illustrate style and insert actual EEL equations.
- Default managed root: Electron's Documents folder plus `milkLab`; configurable in File → Settings. Settings/recovery use Electron's per-user application-data folder.
- JSON records and workspace exports use schema version 1; unsupported versions/corrupt records are preserved and rejected.
- Settings/recovery always use a dedicated milkLab userData folder, including development launches: `%APPDATA%/milkLab` on Windows, with an explicit `MILKLAB_USER_DATA` override. The shared Electron folder is not read or migrated.

## Implementation Handoff

The application, build and packaging commands are implemented. See `docs/developer/architecture.md`, build/testing/deployment guides, the active plan and the ledger for evidence and remaining release work. First-party version locations are explicitly listed in `tools/project-mgmt/version-files.js`; third-party engine versions are excluded.

## Decision Sources

The original example separated Electron/React/Vite/TypeScript, local SQLite, dense
VS Code dark styling, collapsible panels, pinnable in-page previews, custom chrome,
tray lifecycle, logo/icons and state variants from product-specific monitoring rules.
This foundation generalizes those environmental decisions. It does not seed the
example application's features or its transcript.

Selection guidance: [Electron security](https://www.electronjs.org/docs/latest/tutorial/security/),
[SQLite deployment tradeoffs](https://www.sqlite.org/whentouse.html),
[OWASP authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html).


## Planning Snapshot

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


## Dev Ledger Tail

k if this code is rolled back.

### [2026-10-30] Implement local milkLab preset IDE (Status: Complete)
Author: Codex

Summary
- Replaced scaffold build/test/package placeholders with Electron/React/Vite/TypeScript implementation, portable packaging, Inno Setup, artifact validation and durable docs.
- Built a dense charcoal workspace from the user's Curationist screenshot and a generated full-screen concept. Added custom window chrome, File/Edit/View menus, persisted docking/order/column placement/height/width/collapse, and width fitting when the window narrows.
- Added CodeMirror tabs, per-tab dirty state/undo, completion from the actual projectM function catalog, real compiler diagnostics/underlines, explicit saves, external-write conflict checks, and atomic temporary .milk recovery files. Close flushes recovery; crash restoration was exercised.
- Added managed import with byte-exact originals, normalized working copies, content deduplication, scoped reserved uniform/macro renames, supported scalar/vector hyperbolic helpers, invalid input/EEL rejection, and repair/review reports. The user's local `../obspiltMilk/src/preset-import.cpp` informed scoping and normalization behavior; the connected public repository README was also inspected. Unsafe complex scopes/unknown functions are reported, not silently substituted.
- Added immediate-save plain text CRLF playlists, library header add and drag contracts, entry ordering/removal, native import/export, and twelve original SVG effect recipes that insert real numbered equation records in the correct contexts.
- Compiled unmodified projectM 4.2.0 at 2f244141320f6b97b09bf99964cc72a4efdfcfd3 from the sibling checkout with Emscripten. The 1,058,174-byte WASM module uses WebGL2 and supplies both the render engine and the Node-side EEL compiler. Added test signal/silence/mic/local-file audio controls and actual engine compilation errors. No .milk2 feature or external texture ingestion is claimed.
- Kept runtime data outside artifacts, restricted renderer file access behind typed validated IPC, blocked navigation/new windows, and kept Node disabled with sandbox/context isolation enabled.
- Added explicit version targets (package, lock root metadata, VERSION, Inno definition), excluding third-party code and engine versions. The app remains 0.1.0; no commit, bump, push, installation or publication was requested/performed.
- Reviewed package.json, manifest/foundation, all scaffold docs, source paths, commands and runtime assumptions. Manifest seed hashes remain labeled as creation-time history; its implementation record and 28 expected paths match real files. Removed inapplicable admin/bootstrap documentation and environment placeholders.

Impact
- Areas/modules: `src/`, `electron/`, `native/`, `public/`, `installer/`, `tests/`, `tools/`, package/lock/TypeScript/Vite configs, README and docs.
- Risk: Medium. Initial local desktop release; native/graphics behavior varies by driver and preset.
- Storage: initial version-1 JSON settings/library/workspace and path-only playlist text. No relational migrations or existing-data migration. Corrupt/unknown-version records are preserved and rejected; prior write backups remain as .bak files. Root changes never move/delete the prior library.
- Artifacts: dist rebuilt; portable `dist/win-unpacked/milkLab.exe`; unsigned Inno installer `dist/installer/milkLab-0.1.0-setup.exe`. Native source archives and relink/rebuild instructions accompany replaceable engine files.

Validation
- [x] `npm run build:projectm`: full native build/link, no changes to external projectM. CMake's shared-library warning does not apply to this static build; upstream unused-field/format/tag warnings did not prevent linking.
- [x] `npm test`: 25 tests across domain, persistence integration and disposable patch/minor/major versioning suites passed. Includes exact original bytes, scoped rewrites, helper idempotence, native EEL arity/errors and multi-line column mapping, every effect recipe, conflict/path protection, draft recovery, roots, corrupt records and narrow-window fitting.
- [x] `npm run build`: TypeScript and production renderer/main/preload passed. Lazy CodeMirror chunk removes the initial oversized-chunk warning.
- [x] `npm run test:desktop` and final `npm run test:packaged`: actual Electron 45.1.0, file:// runtime, 1600x1000 and 1060x720. Identity, nonblank screen, no framework overlay, no renderer console/page errors, screenshot inspection and 15 workflow groups passed. Tested tab/save, native completion/underlines, library add/HTML drag, playlist reorder/text, effect insertion, panel relocation/order/collapse/pointer resizing, settings, normalized HLSL rendering/invalid import rejection, forced process-tree crash recovery and preview playback. Pointer drag proved inconsistent in Electron automation; deterministic HTML DataTransfer events validate drag handlers, with physical drag listed for manual QA.
- [x] `npm run package` and `npm run deploy:check`: runtime shape/version, engine/licenses/source archives, absence of user data and byte equality between built and packaged runtime files passed.
- [x] `npm run package:installer`: final Inno Setup 6.7.0 compile completed successfully (127.516 seconds), producing the unsigned Windows installer. No installation/uninstallation was performed.
- [x] `npm run version:show`: all four first-party version locations agree at 0.1.0; root lock metadata checked; major/minor/patch isolated tests preserve dependency versions.
- [x] `git diff --check`; manifest path and source-entrypoint existence checks; external projectM Git status clean. Concept and rendered screenshots inspected directly; actual presets/vector tiles replace illustrative concept content.
- Desktop QA artifacts are outside the repository under OS-temp `milklab-smoke-*`; final packaged screenshots and fixtures: `milklab-smoke-FGI4Jo`. No temporary QA source/report was committed.

Follow-ups
- [ ] Complete the physical audio, drag, GPU and installer lifecycle checks in `docs/manual-qa.md` before external release.
- [ ] Select first-party license/signing and provide final executable icon/brand assets. Current executable uses the default Electron icon; builds are unsigned and unpublished.
- [ ] Expand shader compatibility corpus and custom texture support. q33+ and unsafe/unknown rewrites remain explicit review cases. HLSL semantic diagnostics come from engine preview; there is no standalone HLSL language server.

Rollback Strategy
- Restore the prior source revision or remove the new app/native/public/installer/test sources and restore package scripts/docs. Do not remove Documents/milkLab or Electron userData. Back up both data folders before any manual rollback; restore damaged records from their .bak copies. The sibling projectM checkout is unchanged.

### [2026-10-30] Initial Project Bootstrap (Status: Complete)
Author: reponator

Summary
- Created the initial project-management, documentation, handoff, and versioning scaffold.

Impact
- Areas/modules: docs, tools/project-mgmt, package.json
- Risk: Low

Validation
- [ ] Run `npm run version:show`.
- [ ] Run `npm run handoff`.

Follow-ups
- [ ] Replace README outline text with project-specific content.
- [ ] Add build, test, and deployment commands once the application stack is chosen.
- [ ] After choosing the application stack, update version tooling for all real version locations.
- [ ] Reconcile package.json, manifest.json, foundation and docs once the structure is finalized.

Rollback Strategy
- Revert the initial scaffold commit or remove generated workflow files.

## Changelog

Committed ledger entries can be moved here by project tooling.

## Rollback Task Template

### Rollback: <Title/ID>

Prereqs
- Current branch/commit: <ref>
- Backups/snapshots: <paths or links>

Steps
- [ ] Step 1.
- [ ] Step 2.

Verification
- [ ] Build/test pass: <commands>
- [ ] Manual checks: <list>

Restore Plan
- Outline how to recover if the rollback fails.


## Next Session

Read AGENTS.md and its startup documents. Validate current state before editing.
