# Deployment Guide

Produce an unsigned local Windows distribution. No upload, publication, installation, or remote deployment occurs automatically.

## Prerequisites

- Build prerequisites in `build.md`; Inno Setup 6 for the installer.
- The projectM source must be clean and match `public/engine/provenance.json`; packaging includes that source and its evaluation submodule to support engine rebuild/replacement.

## Commands

```powershell
npm test
npm run package
npm run deploy:check
npm run test:packaged
npm run package:installer
```

`dist/win-unpacked/milkLab.exe` is the portable entry point. Inno Setup produces `dist/installer/milkLab-<version>-setup.exe`, installing per user under `%LOCALAPPDATA%/Programs/milkLab` without requiring elevation. Start menu and optional desktop shortcuts are created. Uninstall removes application files, retaining managed presets and user data.

`tools/package.cjs` builds from source, stages only runtime files, adds notices/native rebuild materials, and uses Electron Packager. It never stages the user's library, recovery files, node_modules or environment files. `deploy:check` verifies the artifact shape/version and data boundaries; it is not an upload command.

## Notes

No existing data migration is required for the initial schema-v1 release. JSON with unknown versions is rejected without overwriting it. Before external release, select a first-party license, finalize user-provided branding/icon assets, sign the executable/installer, and complete install/uninstall and real hardware/audio QA. No user brand asset was supplied beyond the style screenshot, so the UI uses a standard waveform symbol and the desktop build retains Electron's default executable icon.
