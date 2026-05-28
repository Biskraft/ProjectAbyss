# Offline Windows Build

## Current State

- `game/package.json` has `build:offline`, `build:offline:ko`, and `package:win`.
- Offline Vite modes contain `offline` in the mode name and use `base: './'` in `game/vite.config.ts`; normal web builds keep `/play/`.
- `ko-offline` keeps Korean locale selection while stripping remote Google Fonts and Google Analytics from `index.html`.
- The Windows package uses Electron with `game/electron/main.cjs` and outputs `game/release/win-unpacked`.
- Submission zip is created from `game/release/ECHORIS_Demo_Offline_Windows_YYYY-MM-DD/` after copying `game/offline/README_KR.txt` and `README_EN.txt` to the package root.

## Prevention Rules

- Do not ship plain `game/dist` as the offline Windows build; asset `fetch()` calls are not reliable from `file://` in browsers.
- Do not use the normal `/play/` web base for offline packaging. Use `npm run build:offline:ko` or another `*-offline` Vite mode.
- Keep `win.signAndEditExecutable` disabled unless code signing is intentionally configured. On this Windows setup, electron-builder's code-sign helper extraction failed because symlink creation required elevated privileges.
- Keep `game/release/` ignored; it is generated output and can contain hundreds of MB of Electron binaries and game assets.

## Verification

- 2026-05-28: `npm run build:offline:ko` passed CSV generation, validation, TypeScript, and Vite build. Existing warnings: 3 LDtk/CSV tileset warnings and the existing large chunk warning.
- 2026-05-28: `npx electron-builder --win dir --x64` produced `game/release/win-unpacked`.
- 2026-05-28: `ECHORIS.exe` from `game/release/ECHORIS_Demo_Offline_Windows_2026-05-28/` started successfully in a smoke test.

