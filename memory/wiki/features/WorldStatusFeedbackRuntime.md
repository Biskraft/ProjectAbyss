# WorldStatusFeedbackRuntime

`game/src/scenes/world/WorldStatusFeedbackRuntime.ts` owns LDtk world status feedback manager instances.

- Creates and updates `SavepointPulseManager` and `LowHpVignetteManager`.
- `LdtkWorldScene` still owns save-point interaction policy through `SavePointRuntime`; it passes the runtime-owned savepoint pulse manager into that runtime.
- Low-HP vignette viewport setup belongs to this runtime so `LdtkWorldScene` only supplies the current HP ratio each frame.

Verification: 2026-06-03 `npx tsc --noEmit`, `npm run build`, Puppeteer smoke against `http://localhost:3000/play/?debug=1`, and `git diff --check` passed. `git diff --check` only printed existing line-ending warnings.
