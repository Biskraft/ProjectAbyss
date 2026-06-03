# Archived Dive Transition Cleanup

- On 2026-06-02, `LdtkWorldScene` removed dead archived `MemoryDive` / `ScreenCrack` wiring.
- Removed scene fields: `screenCrack`, `memoryDive`, `diveTransitionActive`, `diveOverlay`, `diveIris`.
- Removed unused private methods: `runDiveTransition()` and `stepDiveBlackout()`.
- Current official anvil Item World entry uses `ItemWorldTransitionRuntime` and `ItemWorldEntrySequence`; do not reintroduce the old per-frame `diveTransitionActive` gate unless a new caller explicitly starts it.
- The effect classes `game/src/effects/MemoryDive.ts` and `game/src/effects/ScreenCrack.ts` still exist as standalone archived code, but LDtk world scene no longer imports or updates them.
- Verification: `npx tsc --noEmit`, `npm run build`, and `/play/?debug=1` Puppeteer smoke passed.
