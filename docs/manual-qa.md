# Manual QA

Run these checks on a physical Windows desktop before external distribution. Automated evidence is recorded in the ledger.

## Prerequisites

- A packaged app from `npm run package`; an installer from `npm run package:installer`.
- A representative user-owned .milk collection and any required external textures. Use a separate test managed folder.

## Commands

- Drag panel grips vertically and across both columns; use panel menu alternatives. Resize separators, collapse/expand, restart, and verify placement.
- Drag library entries into a playlist; add with the header button; reorder/remove; inspect `playlists/*.txt` for path-only rows.
- Import UTF-8, BOM and Windows-1252 files, invalid .milk, and shader collisions. Check preserved original bytes and repair notes. Verify unknown functions/q33+ are flagged.
- Open several presets, edit/undo/complete, verify error underlines, save, close dirty tabs with each choice, terminate/restart and inspect recovered drafts.
- Use Test signal, Silence, Microphone (including permission denial), and two different local audio files in sequence. Pause/resume and adjust file volume. Check real GPU WebGL2 behavior and fullscreen exit.
- Change storage root; confirm previous files remain and drafts persist. Export/import workspace JSON; confirm imported tabs are unsaved and cannot silently overwrite their old destinations.
- Resize to the 1060×680 minimum and a wide monitor. Verify legibility, keyboard focus, scrollbars, menu/dialog positioning and window controls.
- Install into a temporary per-user destination, launch offline, uninstall, and confirm managed data remains. Repeat an upgrade over an existing installation.

## Notes

No tray feature, custom brand icon, external texture import pipeline or `.milk2` support is claimed. First-party licensing and code signing remain release decisions. Installation/uninstallation is not performed automatically by the build scripts.
