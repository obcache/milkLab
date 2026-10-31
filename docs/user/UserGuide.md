# milkLab User Guide

## Overview

milkLab is a local Windows editor for single `.milk` presets. The code editor is the center workspace; Preset library, Playlist, projectM preview, and Effects dock on either side. There is no account or login.

## Getting Started

1. Launch the portable `milkLab.exe` or install the Windows setup executable.
2. A new managed library starts with three milkLab-original examples. Double-click a library row to open it in an editor tab.
3. Choose **Import presets…** for files, or File → Import preset folder for recursive folder import. Only `.milk` files are supported; `.milk2` is excluded.
4. Select Test signal, Silence, Microphone, or Audio file in the preview panel. The test signal drives visuals silently. Local audio files play through your speakers; microphone input is only requested when selected.

## Core Workflows

### Edit and preview

Each tab has its own code, undo history and unsaved dot. Ctrl+N creates a preset. Ctrl+Space opens function/variable completion. projectM's actual expression compiler supplies EEL errors in the Problems panel and underlines their location in the editor. Click a problem to jump to it. The preview engine reports shader compilation failures; underlines are not a full HLSL semantic checker.

Valid edits apply automatically when that setting is enabled. Ctrl+Enter or **Apply to preview** applies manually. Switching tabs selects that preset for the preview. Pause freezes rendering; the fullscreen button appears over the preview when you hover. Escape leaves fullscreen.

Ctrl+S saves to the tab's existing file, or asks for a destination for a new draft. Ctrl+Shift+S uses Save As. An external file edit is detected before overwriting: use Save As to keep both versions. Explicit saves can contain work in progress, so check Problems before using the result elsewhere.

### Recover unsaved work

Unsaved changes are written to temporary `.milk` files in your Windows application data folder after a short pause in typing. **Drafts saved** means the recovery write completed; the original preset is changed only with Save. Closing the application flushes these writes. Reopening restores the open tabs and unsaved dots, even after a crash, up to the last completed recovery write. The most recent keystrokes during a sudden power loss may not have reached disk.

Closing a dirty tab offers Save and close, Keep open, or Discard and close. Closed-tab recovery files are retained on disk but no longer listed as open tabs. Back up the application-data and managed-library folders together for complete recovery.

### Use effect recipes

Filter Effects by Motion, Color, or Waves, or search by name. Drag a tile into the editor, double-click it, or focus it and press Enter. milkLab inserts the actual equations into numbered per-frame/per-pixel records, preserving existing code and avoiding duplicate numbered keys. Undo reverses an insertion. Hover a tile to inspect the equations. SVG illustrations show an expected style; the result depends on the existing preset and audio.

### Arrange the workspace

Drag a panel's grip onto another header to reorder, or into the opposite column to move it. The **…** panel menu also has Move up, Move down, and Move to left/right column. Drag the separator between panels to resize height; drag column separators to resize width. Click a panel title to collapse/expand. The activity rail also toggles panels. View → Reset workspace layout restores the defaults. Layout survives restart.

### Build a playlist

Select a playlist in the Playlist panel, or use **+** to create one. Drag library presets into the panel, or select a library row and click the **Add to playlist** button in the library header. Drag playlist rows to reorder, or select a row and use the up/down buttons. The trash control removes an entry from that playlist only.

Playlists save immediately under `<managed root>/playlists/<name>.txt`. Every row is one preset's full path and filename, with no JSON, quotes, or header. Import/export controls read/write path-only text playlists; relative imported paths resolve against the source playlist's directory. External entries can remain in playlists, but must be imported into the library before editing. Managed copies use a short hash suffix to avoid filename collisions.

### Inspect imports

The import report lists accepted/rejected presets and repairs. Original bytes are kept in `originals/`; normalized working copies live in `presets/`. Duplicate normalized contents reuse their existing managed copy. Status markers indicate ready, repaired, or review; the library's bottom detail row expands repair/compatibility notes. The validation filter finds presets needing attention.

The normalizer handles ordinary local shader-name collisions and missing hyperbolic shader intrinsics using supported functions. Complex scopes, unknown functions, unsupported wave modes, or q variables above q32 receive explicit notes when there is no proven safe automatic rewrite. Review these in the real preview. Presets requiring custom external textures need those assets handled separately; texture import is not implemented.

### Exchange a workspace

File → Export workspace writes versioned JSON containing open documents and layout. Import workspace adds its documents as unsaved drafts with fresh identifiers; stored paths are stripped so importing cannot silently overwrite files. This export is not a backup of all library originals, playlists or audio files. Unknown schema versions are rejected.

## Settings

Open File → Settings or press Ctrl+Comma. Choose a managed library folder, adjust editor font size, or enable automatic preview. The default library is `milkLab` inside the Windows Documents folder. Changing folders opens a separate library; existing files stay where they are and open drafts remain recoverable. Settings and workspace recovery use `%APPDATA%/milkLab` on Windows in both development and packaged builds (unless `MILKLAB_USER_DATA` explicitly overrides it). Chromium caches use its `chromium` subfolder. Runtime data is outside the installed app and survives uninstall.

## Troubleshooting

### A workflow fails

- If an import is rejected, read its report. Binary/UTF-16 files, malformed shader numbering, multiple preset sections, files over the size limits, and invalid EEL need correction before import.
- If preview compilation fails, the Problems panel shows projectM's message. The previous working visual may remain visible; it is not proof the current code compiled.
- If a preset is black, try Test signal, inspect diagnostics and check external texture requirements. Preview performance depends on GPU/driver and preset complexity.
- If recovery/settings JSON is damaged, milkLab preserves it and reports the path. Close the app, back up both data folders, then restore that record's `.bak` copy. Do not delete originals to fix a workspace problem.
- If Save reports an external change, use Save As to avoid overwriting another edit.
- Development builds use the dedicated milkLab folder and ignore `%APPDATA%/Electron/settings.json`; that file may belong to another app and should not be deleted or restored to fix milkLab. Restart `npm run dev` after updating the main process.
- If the native development window is blank while the browser preview works, check the terminal for `[milkLab renderer]` or `[milkLab preload]` errors. Ctrl+Shift+I or F12 opens native DevTools. Stop the existing dev command before restarting `npm run dev`; port 5173 must be available. Preserve library/settings/recovery files while diagnosing the failure. The browser's localStorage preview is a separate storage path and does not prove desktop bootstrap succeeded.
- The Windows development launcher must keep `windowsHide: false` for Electron itself. A hidden GUI process can render correctly internally while its native window remains hidden/gray. The corrected launcher reports `Native window visible.`; no settings reset or GPU changes are needed for this issue.

## FAQ

**Does this require internet?** No. The desktop runtime and engine are bundled.

**Does it edit MilkDrop 2 shaders?** Yes, inside single `.milk` files. The excluded `.milk2` format is dual-preset support, not a blanket exclusion of single-preset shader code.

**Does every MilkDrop function convert perfectly?** No. Known safe rewrites are automatic; other incompatibilities are reported for review rather than silently changing their behavior.
