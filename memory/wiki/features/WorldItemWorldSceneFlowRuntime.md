# WorldItemWorldSceneFlowRuntime

`game/src/scenes/world/WorldItemWorldSceneFlowRuntime.ts` owns the common LDtk world-to-`ItemWorldScene` push and return flow.

Current state:

- Owns Item World entry prestream delegation through `ItemWorldEntryPreloader`.
- Accepts an injected `createScene()` factory for LDtk world entry paths, so the runtime no longer imports or constructs `ItemWorldScene` directly.
- Delegates `itemWorldTutorialDone` hydration and shared `egoUnlockedEvents` setup to the caller factory boundary.
- Owns the shared prepared-scene push closure: hide overworld container, detach shared UI, release render-only overworld visuals, and reset camera zoom before `ItemWorldEntryPushTransition.push()`.
- Owns the common procedural Item World return block: optional anvil return restoration, scene pop, return fade callback, player attack stat refresh, first-boss tutorial flag, inventory hint, and earned-gold callback.
- `preparePush` and `startReturnFade` are injected as direct callbacks to keep push/return orchestration scene-independent.

Boundaries:

- `WorldFixedItemWorldFlowRuntime` owns fixed Item World fallback/load/return policy.
- `WorldAnvilItemWorldFlowRuntime` owns anvil/tunnel entry completion and anvil-path return reward/dialogue policy.
- `WorldAnvilReturnFlowRuntime` owns anvil-return level restore and player placement when `completeReturn()` receives `restoreAtAnvil`.
- `WorldPortalItemWorldFlowRuntime` owns portal/altar reward and fixed-exit completion policy.
- `LdtkWorldScene` still owns world return dialogue dispatch callbacks, anvil retirement callbacks, and the actual `loadLevel()` implementation.
- `ItemWorldEntryPreloader` still owns asset warming details.
- `ItemWorldEntryPushTransition` still owns the black overlay fade, push, reveal, and input lock.
- `WorldItemWorldEntryState` still owns entry item/deployment state storage.
- `WorldScenePortalItemWorldFlowRuntime` is a legacy `WorldScene` path and does not use this runtime; keep that exception documented in its own feature page.
- `LdtkWorldScene` now uses one private `createLdtkItemWorldScene(...)` helper and one shared `createItemWorldScene` factory reference for fixed/anvil/portal flow runtimes, so `ItemWorldScene` construction and item-world init hydration stay single-source in scene scope.

Prevention rules:

- Do not add scene-local `prestreamItemWorldEntry()`, `createItemWorldScene()`, `completeItemWorldSceneReturn()`, or `pushPreparedItemWorldScene()` helpers back to `LdtkWorldScene`.
- Keep path-specific reward/dialogue/anvil retirement code outside this runtime; call `completeReturn()` first, then apply path-specific side effects in the owning path runtime.
- Keep shared overworld visual release before pushing the Item World scene so hidden overworld resources do not remain resident.
- Keep `preparePush` and `startReturnFade` as explicit callbacks. Non-LDtk callers must pass an intentional no-op rather than relying on scene-local fallback behavior.
- Kept a compatibility `createScene(...)` method on `WorldItemWorldSceneFlowRuntime` (delegating to the injected `deps.createScene`) so older callsites like `LdtkWorldScene` can keep using runtime-owned scene construction without introducing a breaking API change; this restores scene compilation while preserving injection ownership.


Verification on 2026-06-03: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed; diff check only printed existing line-ending warnings.
