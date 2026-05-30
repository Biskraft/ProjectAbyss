---
feature: Settings Options
status: in-progress
last_updated: 2026-05-31
---
# Settings Options

## Current State

- Source GDD: `Documents/System/System_Settings_Options.md`; settings menu chrome follows `Documents/UI/UI_Menu_System.md` section 3.5.
- Runtime settings persist as one JSON object in localStorage key `echoris-settings`. Older audio-only objects are migrated by merging missing fields with defaults in `game/src/core/SettingsStore.ts`.
- Pause menu `SETTINGS` opens a 4-tab menu in `game/src/ui/PauseMenu.ts`: GAMEPLAY, DISPLAY, AUDIO, CONTROLS.
- Wired options:
  - GAMEPLAY: language EN/KO. Runtime dictionaries are bundled in `game/src/i18n/index.ts`; existing rendered UI redraws only when its owner rebuilds.
  - DISPLAY: windowed/fullscreen toggle, Auto/1x/2x/3x CSS display scale, sharp/smooth scale filter, screen shake Off/Low/Full, FPS display.
  - AUDIO: master/BGM/ambient/SFX/voice volume and per-channel mute via `AudioBus`; changes are applied live to active Pixi sound instances, WebAudio BGM gain, and synth SFX gain.
  - CONTROLS: existing keyboard preset selector and rumble Off/Low/Full via `GamepadRumble`.
- Boot applies settings in `game/src/main.ts` after `Game.init()` and before scene creation.

## Prevention Rules

- Keep player-facing setting labels in `Sheets/Content_Localization.csv`; do not hardcode UI labels in `PauseMenu`.
- Keep `echoris-settings` as the storage key unless a migration is added. The GDD mentions `echoris_settings`, but the codebase already shipped the hyphenated key.
- Do not route long-running audio by play-time volume only. `AudioBus` tracks active `@pixi/sound` instances, and direct WebAudio systems such as `BgmController` must subscribe to `AudioBus.onSettingsChanged()` so sliders/mutes affect already-playing audio.
- Do not expose key rebinding, pad glyph forcing, deadzone, parallax, HUD, minimap, or damage-number toggles as functional settings until the owning systems actually consume them.
