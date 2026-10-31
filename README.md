# milkLab

An offline Windows IDE for single MilkDrop `.milk` presets, with an embedded projectM WebGL2 preview.

## Project Status

- Electron / React / Vite / TypeScript. Version: `VERSION`.
- Local development build; no login, server, or network connection required at runtime.
- Windows portable build and per-user Inno Setup installer under `dist/`.

## Overview

Import presets into a managed library, open several in editor tabs, and use the Effects panel to insert working equations. Preview the active code with projectM, then arrange presets in MilkDrop-compatible plain text playlists. The dense dark workspace follows the supplied Curationist style reference.

## Features

- Move panels up/down or between left/right columns, drag headers to dock, resize panel heights and column widths, and collapse panels. Layout survives restart.
- CodeMirror editing with syntax colors, projectM-aware completion, actual projectM-Eval error underlines, undo/redo, and per-tab unsaved indicators.
- Automatic recovery through temporary `.milk` files; explicit Save controls when preset files change.
- Managed imports with preserved original bytes, scoped reserved-name repair, missing hyperbolic shader function helpers, repair reports, and explicit compatibility notes.
- Path-only, CRLF plain text playlists in the managed `playlists/` folder, with library drag/add and entry reordering.
- Twelve categorized effect recipes with generated SVG illustrations; drag or double-click to insert numbered per-frame/per-pixel code.
- projectM 4.2.0 compiled from the sibling checkout to WebAssembly, using WebGL2. Test signal, silence, microphone, and local audio file input.
- File-menu settings and versioned workspace JSON import/export.

## Installation

Use Node.js 24+ and npm on Windows:

```powershell
npm ci
npm run dev
```

The compiled engine is included in `public/engine/`. To rebuild it, install Emscripten, CMake, and Ninja, and keep projectM at `../projectm` (or set `PROJECTM_SOURCE`). Run `npm run build:projectm`. See [build instructions](docs/developer/build.md).

## Usage

Use **Import presets…** or File → Import preset folder. Double-click a library entry to open it. Drag an Effects tile into the code editor. Ctrl+Enter applies code; Ctrl+S saves; Ctrl+N starts a preset. The [user guide](docs/user/UserGuide.md) covers storage, recovery, and playlists.

New libraries include three original starter presets. `.milk2` dual presets are excluded. Unknown shader functions without a proven equivalent are flagged for review, rather than silently replaced. Custom external textures are not imported automatically.

## Development

Project workflow files live under `docs/` and reusable automation lives under `tools/project-mgmt/`.
Agent-facing startup instructions live in `AGENTS.md`.
The selected stack, UX, storage, users and delivery decisions are in `docs/PROJECT_FOUNDATION.md`.

```powershell
npm run todo
npm run ledger:message
npm run handoff
npm run version:show
```

## Testing

```powershell
npm test
npm run build
npm run test:dev
npm run test:desktop
```

Tests cover the real expression compiler, normalization, persistence, playlists, versioning, and desktop workflows including crash recovery. `test:dev` checks the live Vite renderer in Electron with cold/warm caches; stop an existing dev server first. Test data and screenshots go into isolated OS temporary folders. See [testing](docs/developer/testing.md).

## Build And Release

```powershell
npm run package
npm run deploy:check
npm run test:packaged
npm run package:installer
```

Launch `dist/win-unpacked/milkLab.exe` or use `dist/installer/milkLab-0.1.1-setup.exe`. Builds are unsigned. Packaging includes engine licenses and rebuild sources. No deployment or publication happens automatically. [Delivery details](docs/developer/deployment.md).

## Contributing

Use the planning file and ledger. When a commit is requested, the package commit scripts default to a patch bump; minor/major commands are explicit. These commands can push when a remote exists, so use them only for an authorized release.

## License

A first-party license has not been selected. Third-party terms and rebuild materials are documented in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). No third-party preset pack is bundled.
