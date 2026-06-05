# ProximityInteractionHelpers

## Current State

- `game/src/scenes/shared/ProximityInteractionHelpers.ts` owns the shared proximity/hint/interact iteration for portal and altar-like entities.
- `WorldScene`, `PortalRuntime`, and `WorldAltarController` call the helper while keeping scene/runtime-owned side effects local.

## Boundaries

- The helper may call `update(dtMs)`, evaluate near/full overlap against the actor, set the hint flag, and invoke callbacks.
- Do not move portal detach/destroy, item-world transition setup, altar UI drawing, item validation, or portal spawning into this helper.
- Keep input binding at the caller boundary by passing `isInteractPressed`; do not import scene-specific input state into the helper.

## Verification

- 2026-06-05: `npx tsc --noEmit` and `npm run build` passed from `game/`; build retained only the known LDtk/CSV `atlas/prologue_01.png` warning.
