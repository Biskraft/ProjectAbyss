# WorldPickupVfxRuntime

`game/src/scenes/world/WorldPickupVfxRuntime.ts` owns LDtk world pickup/acquire VFX manager instances.

- Creates, updates, and clears `ItemPickupGlowManager` and `RelicAuraBurstManager`.
- `LdtkWorldScene`, `WorldPickupRuntime`, and `WorldRelicPickupRuntime` still own item/relic collection policy and decide when to spawn the effects. `WorldRelicPickupRuntime` owns HealthShard/AbilityRelic reward side effects.
- `releaseWorldVisualsForItemWorld()` should clear this runtime before pushing Item World so glow particles do not remain in the hidden overworld.

Verification: 2026-06-03 `npx tsc --noEmit`, `npm run build`, and Puppeteer smoke against `http://localhost:3000/play/?debug=1` passed.
