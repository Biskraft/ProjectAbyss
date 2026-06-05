# ContainerTargetHelpers

## Current State

- `game/src/scenes/shared/ContainerTargetHelpers.ts` owns nullable `Container` target compaction through `compactContainers(...)`.
- `LdtkWorldScene` runtime wiring and `WorldBuilderFlowRuntime.getBuilderAtmosphereTargets()` use the helper.

## Boundaries

- The helper only removes `null`/`undefined` entries while preserving target order.
- Do not put filter application, layer ownership, or runtime-specific target selection rules in this helper.

## Verification

- 2026-06-05: `npx tsc --noEmit` and `npm run build` passed from `game/`; build retained only the known LDtk/CSV `atlas/prologue_01.png` warning.
