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
- Public fonts referenced from `index.html` should use absolute public paths such as `/fonts/PressStart2P.woff2`; relative `fonts/...` URLs make Vite report unresolved asset warnings.

## Verification

- 2026-05-28: `npm run build:offline:ko` passed CSV generation, validation, TypeScript, and Vite build. Existing warnings: 3 LDtk/CSV tileset warnings and the existing large chunk warning.
- 2026-05-28: `npx electron-builder --win dir --x64` produced `game/release/win-unpacked`.
- 2026-05-28: `ECHORIS.exe` from `game/release/ECHORIS_Demo_Offline_Windows_2026-05-28/` started successfully in a smoke test.
- 2026-06-02: Normal `npm run build` no longer reports the unresolved `PressStart2P.woff2` warning after changing the `@font-face` URL to `/fonts/PressStart2P.woff2`. Browser smoke also confirms the font is loaded and the inline SVG favicon prevents favicon 404 noise.
- 2026-06-02: Normal `npm run build` no longer reports LDtk/CSV tileset warnings. `Sheets/tools/validate.mjs` now allowlists intentional LDtk-authored override tilesets and validates their asset files directly.
- 2026-06-02: Normal `npm run build` no longer reports Vite chunk-size warnings after `game/vite.config.ts` adopted the explicit 1024 KB scene chunk warning budget documented in `features/BuildChunkBudget.md`.
