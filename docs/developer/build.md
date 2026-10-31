# Build Guide

Build the Electron desktop application and its projectM engine.

## Prerequisites

- Windows x64, Node.js 24+, npm, Git.
- Engine rebuild only: Emscripten, CMake 3.21+, Ninja, sibling projectM checkout with populated projectm-eval submodule. The current environment has these tools installed.
- Installer only: Inno Setup 6 (`ISCC` may override its path).

## Commands

```powershell
npm ci
npm run dev                 # Vite + rebuilt main/preload + Electron
npm run dev:web             # browser development adapter, not disk-backed desktop storage
npm run build               # TypeScript + renderer + main/preload -> build/
npm run build:projectm      # native source -> public/engine/; updates capability catalog
npm run licenses:generate   # npm and native license text -> public/licenses/
npm run package             # builds and packages -> dist/win-unpacked/
npm run package:installer   # -> dist/installer/
```

The committed WebAssembly engine allows normal JavaScript development without Emscripten. Set `$env:PROJECTM_SOURCE` when the source checkout is not at `../projectm`. `native/CMakeLists.txt` adds that source as a subdirectory; it does not edit it. The engine links only WebGL2 and exposes a small C ABI; JS and WASM are modular, replaceable loose assets. No npm runtime dependency reaches out to a service.

Emscripten configuration on the current machine warns about CMake 4.2.3 shared-library support; this build uses static libraries and completed. Upstream compiler warnings are recorded in the ledger. Missing Flex/Bison is acceptable because the projectM-Eval checkout includes generated scanner/parser source.

## Notes

`npm run dev` fixes the development host to `127.0.0.1:5173`. Restart it after main/preload edits. `npm run build` does not recompile C++; run `build:projectm` when the native wrapper or external source changes. Intermediate output is ignored under `build/`; only `dist/` is distributable. Source maps are excluded from the desktop artifact.

The development runner awaits its own Vite server before launching Electron. An occupied port or server startup error stops the command; it does not reuse another listener. Renderer console errors, preload failures, navigation failures and renderer exits are reported in the launching terminal. In the native development window, Ctrl+Shift+I or F12 toggles DevTools, including when React has not mounted. These diagnostics and shortcuts are development-only.

Electron is launched with `windowsHide: false`: it is the interactive GUI, and hiding its Windows process can leave the native window invisible despite a fully rendered DOM. The terminal reports `Native window visible.` after showing it. `npm run dev -- --inspect-renderer` optionally opens an ephemeral loopback CDP endpoint for attaching diagnostics to the ordinary process; it does not inject an automation loader. `MILKLAB_VITE_CACHE_DIR` overrides Vite's cache directory for isolated QA.
