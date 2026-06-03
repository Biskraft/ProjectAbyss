# BossHpRuntime

`game/src/ui/BossHpRuntime.ts` owns shared boss HP bar reveal/update policy for LDtk World and Item World scenes.

Invariants:

- A boss is any alive enemy with `_isBoss === true`.
- The HP bar appears when the boss FSM is no longer `idle`/`death`, when the boss has already taken damage, or when a scene passes an extra engaged condition. `LdtkWorldScene` uses that extra condition for active boss arena locks.
- The runtime sets `_bossBarShown` on the boss instance and then calls `HUD.showBossHP()` once, followed by `HUD.updateBossHP()` while visible.
- The runtime does not hide the boss HP bar. Existing scene boundaries still hide it on boss clear, level load, room changes, and other explicit teardown points.

Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, and `/play/?debug=1` browser smoke on `127.0.0.1:5178` passed.
