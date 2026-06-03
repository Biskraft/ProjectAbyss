# World No-Weapon Feedback Runtime

## Current State

- `game/src/scenes/world/WorldNoWeaponFeedbackRuntime.ts` owns the LDtk world "no weapon equipped" attack feedback cooldown.
- The runtime consumes `Player.attackBlockedNoWeaponPulse`, shows the localized `toast.no_weapon` message, and prevents toast spam for 1500 ms.
- `LdtkWorldScene` supplies only the current player and toast callback.

## Prevention Rules

- Do not reintroduce no-weapon toast cooldown fields directly into `LdtkWorldScene`.
- Keep `Player.attackBlockedNoWeaponPulse` as the signal source; the runtime should consume it exactly once per blocked attack pulse.
- Keep player-facing text localized through `toast.no_weapon`.
