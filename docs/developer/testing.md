# Testing Guide

Verify import integrity, editor/engine agreement, local persistence, and the key desktop workflows.

## Prerequisites

- `npm ci`, committed engine module and a Windows desktop session.
- `npm run build` before source desktop smoke; `npm run package` before packaged smoke.
- Browser plugin not available in the implementation session. Tests use Playwright's Electron support against the actual app, rather than a browser imitation of the desktop bridge.

## Commands

```powershell
npm test
npm run build
npm run test:startup
npm run test:dev
npm run test:desktop
npm run test:packaged
npm run version:show
npm run deploy:check
```

Vitest suites cover scoped normalization (initializer visibility, nested scopes, comments, collision avoidance, helper overloads and idempotence), invalid inputs and unsafe cases, actual projectM-Eval syntax/arity checks and source locations, all effect recipes, playlist rows, byte-exact original preservation, normalized copies, restart recovery, untrusted path rejection, external-write conflicts, root switching, corrupt-record preservation, and isolated patch/minor/major version synchronization.

`tools/smoke.cjs` runs with isolated `MILKLAB_USER_DATA` and `MILKLAB_STORAGE_ROOT` temporary folders. It tests tabs, saves, library-to-playlist add/drag, playlist reorder, effect insertion, completion, compiler underlines, panel menus/resize/collapse, settings, a repaired HLSL preset rendered by projectM, invalid import rejection, process-tree termination and restart recovery, playback, and 1600×1000 / 1060×720 desktop layouts. Native dialogs are supplied test fixtures. HTML drag events carry a real DataTransfer through source/target handlers; Electron's pointer-based Playwright drag was inconsistent, so automated assertions test the HTML drag contracts directly. Pointer resizing is exercised with mouse input.

Screenshots, fixtures and state are printed under an OS temporary `milklab-smoke-*` directory, never committed. The smoke script does not touch the user's real library. Unit/version tests remove their own isolated temporary directories. Desktop evidence remains outside the repository for inspection.

`test:startup` launches the built main entry through a temporary harness with Electron's generic identity and an incompatible `Electron/settings.json` fixture. Without a userData override it verifies milkLab's dedicated path, successful bootstrap, persistence/restart, and byte-exact preservation of the foreign settings and directory contents. A separate case verifies the explicit override and its Chromium session directory. The application-data parent and managed library are isolated temporary folders; the test never reads the user's actual shared Electron settings.

`test:dev` spawns the real `npm run dev -- --inspect-renderer` command with isolated cache/state/library paths. It first asserts the main process's native visibility report, before any debugger attachment or screenshot. It then attaches via loopback CDP to inspect `http://127.0.0.1:5173/`. Using Playwright's Electron launcher here would bypass `tools/dev.cjs` process options and alter Chromium flags/readiness, masking launcher defects such as `windowsHide: true`.

Stop any dev server first; an occupied port is an intentional failure. The check covers cold/warm caches, the native bridge, editor, actual WebGL2 frames, preset tabs, settings written to disk, reload, port-conflict rejection and clean GUI/server exit. Startup renderer/preload errors are mirrored by the main process. After asserting a clean console the check emits one deliberate diagnostic fixture and verifies stderr forwarding. Screenshots and state remain in the printed OS-temp `milklab-dev-smoke-*` folder. Both command-level phases passed before the 0.1.1 commit. A separate raw Electron A/B verification also passed native visibility before attachment, editor/preview rendering, tabs and clean close.

## Notes

Use `docs/manual-qa.md` for remaining microphone/local-file playback, large preset/texture-library, physical drag, GPU variation and installer lifecycle checks. An initial WebGL frame can be slow while Chromium warms up; measured FPS is displayed honestly. HLSL compilation is checked by the engine preview; EEL underlines do not imply a full standalone HLSL language server.

projectM may emit `Modifier function used at start of tag` while loading a starter preset. The cold/warm development checks observed this parser warning with successful rendering and no renderer errors; it is distinct from the deliberately emitted diagnostic fixture.
