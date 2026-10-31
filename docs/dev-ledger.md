# Dev Ledger

This ledger is the development journal and changelog source for the project. Use it to preserve decisions, rationale, validation, rollback plans, and handoff context.

## Purpose

- Track meaningful development progress before and after commits.
- Preserve why a change was made, not only what changed.
- Keep rollback and follow-up tasks close to the work that created them.
- Provide source material for commit messages, release notes, and session handoffs.

## How To Use

- Add an entry for behavior changes, build changes, dependency updates, infrastructure work, or important investigations.
- Use `Status: Planned`, `Status: Draft`, or `Status: Complete`.
- Set entries to `Complete` when they should be considered ready for commit/release tooling.
- Include validation commands and rollback notes whenever practical.

## Entry Template

### [YYYY-MM-DD] Entry Title (Status: Planned)
Author: <name/initials>

Summary
- What changed and why.

Impact
- Areas/modules: <paths or systems>
- Risk: Low | Medium | High

Validation
- [ ] Command or manual check.

Follow-ups
- [ ] Remaining work.

Rollback Strategy
- How to revert or disable the change.

## Entries

### [2026-10-31] Prepare local 0.1.1 commit (Status: Complete)
Author: Codex

Summary
- User authorized committing the implemented IDE and development startup fixes. Applied the required patch bump from 0.1.0 to 0.1.1 using `npm run version:bump:patch`; package, lock root metadata, VERSION and Inno definition agree. Dependency and projectM versions are unchanged.
- Commit scope includes the Electron/React IDE, projectM assets/native wrapper, managed storage and normalization, effects/playlists/editor, build/test/installer tooling and durable documentation. Exclude the pre-existing machine-specific `.vscode/settings.json` edit; preserve it in the working tree.
- The repository's combined commit helper would automatically push to origin. Use its package version-bump step followed by a local Git commit so this request does not publish changes.
- Packaging's clean-source guard initially rejected an existing one-character edit in the sibling projectM `BUILDING.md`. Preserved that checkout and packaged from a temporary clean local clone at the exact compiled engine revision, including its recorded projectm-eval submodule. The shipped rebuild archives contain committed matching source.

Validation
- [x] Revised `npm run test:dev`: real npm command, cold/warm caches, native visibility before CDP attachment, rendered editor/WebGL2 frames, settings on disk, tabs, reload, diagnostics and clean close passed. Clears the previously pending launch regression.
- [x] `npm test`: all 25 unit/integration/version tests passed; `npm run version:show` verifies all four first-party locations at 0.1.1.
- [x] `npm run test:startup` and `npm run test:desktop`: identity isolation/foreign settings preservation and all 15 desktop workflow groups passed.
- [x] Packaging from the matching clean source and `npm run deploy:check` passed. Rebuilt `dist/win-unpacked` at 0.1.1; no runtime data or secrets in artifacts, and packaged runtime hashes match `build/`.
- [x] `npm run test:packaged`: all 15 workflow groups passed with no renderer errors, including crash recovery, native engine diagnostics, normalized import, panel layout and 1060x720/1600x1000 fitting.
- [x] `npm run package:installer`: Inno Setup compiled the unsigned `dist/installer/milkLab-0.1.1-setup.exe` successfully in 101.578 seconds. No installation was performed.
- [x] Manifest paths, package test commands, foundation/runtime assumptions and artifact exclusions reviewed against real files. No schema or migration changes; no install, publish or deployment authorized.
- [x] Staged-file review excludes local editor settings, build/dist outputs and temporary QA data. First-party whitespace checks pass; verbatim third-party license texts retain their upstream trailing blank lines. The isolated source clone was removed after packaging; the original projectM edit remains intact.

Rollback Strategy
- Revert the local commit if needed and rebuild artifacts from that source version. Preserve all user state, managed libraries and the unrelated editor/projectM edits. Do not reset or delete runtime data.

### [2026-10-31] Fix hidden native window in ordinary development launches (Status: Complete)
Author: Codex

Summary
- User confirmed all automation launches worked while `npm run dev` continued showing gray. The preceding test invoked Playwright's Electron launcher directly, bypassing the real runner's process options; successful renderer screenshots did not prove native window visibility.
- Confirmed the defect using the actual npm command without Playwright's loader: React rendered the full editor/preview and persisted the workspace, but `BrowserWindow.isVisible()` returned false. `tools/dev.cjs` incorrectly spawned the interactive Electron GUI with `windowsHide: true`.
- Changed that spawn option to false. The same capture then returned true; the user explicitly confirmed the app works. No CSP, GPU, projectM, settings or storage changes were required. Temporary capture/GPU diagnostics were removed from the source.
- Added a dev-only native visibility report and optional `--inspect-renderer` loopback endpoint. Reworked `test:dev` to spawn the real npm command and assert native visibility before CDP attachment, retaining isolated cold/warm caches and UI/disk/preview checks. `MILKLAB_VITE_CACHE_DIR` supports isolated cache coverage.
- Windows Computer Use helper was unavailable (`failed to connect native pipe`, OS error 2, including retry/reset); used Electron's own capture/visibility APIs and raw-process CDP attachment. Browser plugin unavailable. No Windows UI automation fallback or user settings reset was performed.

Validation
- [x] Actual `npm run dev` A/B captures with the existing user state: `windowsHide: true` -> native visible false; false -> native visible true. User confirmation: "that worked great".
- [x] Independent raw Electron A/B with isolated state, native visibility asserted before debugger attachment: hidden/visible results reproduced. The visible ordinary process rendered the editor, native bridge and WebGL2 frames, opened another preset tab, captured a screenshot and closed cleanly against the user's existing Vite server.
- [x] `npm run build` and `npm test`: TypeScript/build and all 25 existing tests passed. No changes to first-party version/schema values.
- [x] Full revised `npm run test:dev` command: initially blocked by the user's active Vite listener on 5173; cold/warm real-command phases subsequently passed during 0.1.1 commit preparation. Previous launcher-based results are not used as validation of this revision.
- Review: package commands and manifest remain valid; foundation/storage/offline decisions are unchanged; testing/build/user docs and plan now describe actual launch visibility and the revised coverage. `build/` rebuilt; `dist/` and installer not rebuilt. No migration, installation, publication or deployment.

Rollback Strategy
- Reverting the Electron spawn option would restore the confirmed Windows visibility defect. Other dev-only logging/inspection/test changes can be reverted independently. Keep runtime data intact; no data rollback is required.

### [2026-10-31] Investigate blank native development window (Status: Complete)
Author: Codex

Summary
- User reported an empty native Electron window while the localhost browser adapter rendered normally. Restarted only the identified milkLab development process tree, preserving library and recovery files. Native launches then rendered with both the existing milkLab state and isolated cold/warm Vite caches. The original trigger was not reproduced and is not claimed fixed by a confirmed root-cause change. No evidence established a CSP or settings-schema cause for this report.
- Replaced `tools/dev.cjs` port polling with Vite's awaited server API. Previously an occupied/foreign listener could satisfy readiness, and Electron still launched after timeout or Vite startup failure. Startup errors now terminate the dev command before launch; normal desktop exit closes the server.
- Development-only main-process hooks mirror renderer errors, preload failures, failed main-frame loads and renderer exits to the launching terminal. Native Ctrl+Shift+I/F12 shortcuts open DevTools without requiring React to mount.
- Added `test:dev`, sharing the actual server startup and loading the live module graph through sandboxed Electron. Tests isolate cache/state/library paths, reject port conflicts, exercise meaningful controls and reload, verify frames and disk persistence, and prove that a deliberate error fixture reaches stderr. Existing source settings, user library and shared Electron settings were not reset or migrated.

Impact
- Areas/modules: `tools/dev.cjs`, `tools/test-dev.cjs`, `electron/main.ts`, package scripts, testing/build/user docs and manifest.
- Risk: Low; main-process diagnostics and shortcuts are gated by the development URL. Production renderer/CSP and storage schemas are unchanged.

Validation
- [x] `npm run build`: TypeScript, production renderer and main/preload passed.
- [x] `npm test`: all 25 existing unit/integration tests passed.
- [x] `npm run test:startup`: default identity, preference restart, custom override and foreign settings preservation passed.
- [x] `npm run test:dev`: cold/warm cache launches, native bridge, rendered editor, WebGL2 frames, tab selection, settings on disk, DevTools, clean reload, occupied-port rejection and terminal error forwarding passed. Browser plugin unavailable; used Playwright Electron support. projectM's existing `Modifier function used at start of tag` warning accompanied successful rendering; no application errors before the deliberate diagnostic fixture.
- [x] Inspected the native development screenshot at 1600x1000; editor, panels and preview render without a framework overlay. QA evidence lives outside the repository in OS temporary storage.
- [x] `git diff --check` and manifest path/entrypoint/package-command checks passed. Reviewed package scripts, manifest, foundation and affected docs against source: offline desktop/storage decisions and schemas still match. Restarted the actual `npm run dev` command after verification; no renderer errors were reported.
- `build/` rebuilt; `dist/` and the installer were not rebuilt. No schema migration, version bump, install or deployment performed.

Follow-ups
- If the original blank screen recurs, capture the new terminal diagnostics or native DevTools console before restarting. Original cause remains unconfirmed.

Rollback Strategy
- Restore the previous development runner and remove the dev-only main hooks, test script and package entry. No runtime-data changes are needed; preserve application data and the managed library.

### [2026-10-31] Isolate development user data from other Electron apps (Status: Complete)
Author: Codex

Summary
- Confirmed that launching `build/electron/main.cjs` directly leaves the generic Electron userData path in place when `MILKLAB_USER_DATA` is unset. The prior smoke tests always supplied an override, masking collision with another project's incompatible settings.json.
- Set the application name and dedicated default `appData/milkLab` userData path synchronously before the single-instance lock or ready event. Preserve explicit overrides, create the directories first, and isolate sessionData in `<userData>/chromium`.
- Do not read, delete, restore, or migrate settings from the shared Electron folder. Existing settings in the dedicated milkLab folder remain usable. No schema or data migration is introduced.
- Added `npm run test:startup`, exercising the actual built Electron entry with a simulated foreign Electron settings file, default identity, restart recovery and custom override. Updated storage/testing docs, foundation and manifest to match the implementation. Preserved the user's existing workspace/editor configuration changes.

Validation
- [x] `npm run build`: TypeScript, renderer and main/preload build passed; development entry is updated.
- [x] `npm run test:startup`: three actual Electron launches passed. Dedicated paths, successful bootstrap, saved preferences on restart, custom override and byte-exact unchanged foreign settings/directory contents verified.
- [x] `npm test`: all 25 existing unit/integration/version tests passed.
- [x] Package command, manifest paths and documented storage assumptions reconciled. No change to version metadata or library location.
- Distribution status: `dist/` and the installer were not rebuilt for this development-startup fix. No installation, publication or data migration performed. Restart `npm run dev` to use the rebuilt main process; repackage when an updated distributable is needed.

Rollback Strategy
- Revert the dedicated path initialization and its regression test/docs. Leave all app-data directories intact; never overwrite the shared Electron settings. Dedicated milkLab settings remain on disk if this code is rolled back.

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
