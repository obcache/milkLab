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
