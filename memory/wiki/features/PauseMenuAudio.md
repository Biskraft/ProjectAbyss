# PauseMenuAudio

## 2026-06-05

- `game/src/ui/pause/PauseMenuAudio.ts` owns pause-menu audio row volume access, mute toggles, and shared 10% snapped volume adjustment.
- Use `adjustAudioRowVolume` for the standalone audio sub-modal and `adjustSettingsAudioVolume` for `SettingsData` rows so snap/clamp behavior does not drift.
- `PauseMenu.ts` remains responsible for persistence calls such as `saveAudio()` after immediate AudioBus mutation.
