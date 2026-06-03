# WorldDoorAttackState

`game/src/scenes/world/WorldDoorAttackState.ts` owns the temporary per-attack reject tracking for LDtk world locked doors.

Current state:
- The state tracks which door IIDs already rejected the current attack, plus the last combo index used to reset that reject set between combo hits.
- `WorldDoorSwitchInteractionRuntime` owns door attack policy, stat-gate feedback text, camera shake, analytics, unlock side effects, and builder stamp refresh callbacks.
- `WorldDoorSwitchInteractionRuntime.checkDoorAttack()` delegates temporary duplicate-reject suppression to this state.

Prevention rules:
- Do not add `doorRejectSet` or `lastDoorCheckCombo` back to `LdtkWorldScene`.
- Keep user-facing stat-gate feedback in `WorldDoorSwitchInteractionRuntime`; do not move door attack policy back to the scene.

Verification on 2026-06-03: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed with only existing line-ending warnings.
