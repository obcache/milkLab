# Versioning Guide

## Policy

The root `package.json` version is the source of truth. `version-files.js` explicitly lists all first-party version locations: root package.json, package-lock.json (including packages[""]), VERSION, and installer/milkLab.iss (`MyAppVersion`). Electron metadata and the packaged package.json derive from the root version during packaging.

No recursive version walking is performed. Dependencies, native source archives, public engine provenance and vendor code keep their own versions. Vitest runs patch/minor/major bumps in disposable copies and verifies consistency and third-party isolation. Rebuild dist after a real version bump. `version:show` exits nonzero on missing/mismatched first-party locations.

## Commands

```powershell
npm run version:show
npm run version:bump:patch
npm run version:bump:minor
npm run version:bump:major
```

## Commit Convention

Freeform requests to "commit" should be treated as a patch release unless the requester explicitly asks for a minor or major release.

```powershell
npm run commit -- "message"
npm run commit:minor -- "message"
npm run commit:major -- "message"
```
