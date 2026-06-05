/**
 * PauseMenu ??ESC key pause overlay with menu navigation.
 *
 * Menu items: CONTINUE / SETTINGS / QUIT TO TITLE
 * Pattern A (Modal): game paused, arrow nav, C confirm, ESC back.
 */

import { Container, Graphics, type BitmapText, type Text } from 'pixi.js';
import { type Game } from '../Game';
import { t } from '@i18n';
import type { UISkin } from './UISkin';
import type { InputManager } from '@core/InputManager';
import { toggleFullscreen, isFullscreenActive } from '@core/Fullscreen';
import {
  applySettingsData,
  loadSettings,
  saveAudio,
  saveSettings,
} from '@core/SettingsStore';
import {
  AUDIO_ROWS,
  COL_BORDER,
  CONTROLS_ROWS,
  DISPLAY_ROWS,
  GAMEPLAY_ROWS,
  MENU_ITEMS,
  PANEL_H,
  PANEL_W,
  PRESETS_DATA,
  SETTINGS_AUDIO_ROWS,
  SETTINGS_TABS,
  type MenuItem,
  type SettingsRow,
  type SettingsTab,
} from './pause/PauseMenuConstants';
import {
  adjustAudioRowVolume,
  getAudioRowVolume,
  isSettingsAudioRow,
  toggleSettingsAudioMute,
} from './pause/PauseMenuAudio';
import { adjustSettingsRowValue, settingsRowValue } from './pause/PauseMenuSettings';
import { createPauseConfirmPanel } from './pause/PauseMenuConfirm';
import { createPausePresetSelectorPanel } from './pause/PauseMenuPresetSelector';
import { createPauseAudioPanel } from './pause/PauseMenuAudioPanel';
import { createPauseSettingsPanel } from './pause/PauseMenuSettingsPanel';
import {
  advancePauseMenuBaseCursor,
  createPauseMenuBasePanel,
  setPauseMenuBaseSelectionPulseSuppressed,
  updatePauseMenuCursor,
} from './pause/PauseMenuBasePanel';
import { advancePauseMenuPulseStates } from './pause/PauseMenuPulse';
import { destroyPauseModalPanelAndApply, mountPauseModalPanelAndRedraw } from './pause/PauseMenuModalLifecycle';

function resolveItemLabel(item: MenuItem): string {
  if (item.action === 'fullscreen') {
    return t(isFullscreenActive() ? 'ui.pause.fullscreen_on' : 'ui.pause.fullscreen_off');
  }
  return t(item.labelKey);
}

// ?ㅻ낫??preset 移대뱶 ??`Documents/UI` (game/docs/ui-components.html line 1389) ??// "Preset Selection (Phase 1)" 移대뱶 ?ㅽ럺???곕씪 ?쇰꺼 + ??以???誘몃━蹂닿린.

// ?ㅻ뵒???ㅼ젙 ?쒕툕紐⑤떖 ??AUDIO ??ぉ?먯꽌 吏꾩엯. AudioBus 5梨꾨꼸(master + bgm/ambient/
// sfx/voice) 蹂쇰ⅷ??醫뚯슦(???濡?짹10% 議곗젙, 利됱떆 ?곸슜 + SettingsStore ???
// 而댄룷?뚰듃??preset selector ? ?숈씪 移대끉(createModalPanel/drawSelectionRow/chevron/text).


/** 梨꾨꼸/留덉뒪??蹂쇰ⅷ ?쎄린 (0..1). */
/** 梨꾨꼸/留덉뒪??蹂쇰ⅷ ?곌린 (0..1). */
export class PauseMenu {
  readonly container: Container;
  visible = false;
  private selectedIndex = 0;
  private panel: Container;
  private menuTexts: (BitmapText | Text)[] = [];

  // Selection row layers (orange 4-layer canonical pattern)
  private selectionBg: Graphics | null = null;
  private selectionPulseG: Graphics | null = null;
  private chevronL: BitmapText | null = null;
  private chevronR: BitmapText | null = null;
  private selectionPulseTimer = 0;

  // Confirm-dialog selection pulse (YES / NO)
  private confirmPulseG: Graphics | null = null;
  private confirmPulseTimer = 0;

  // Quit confirmation
  private confirmActive = false;
  private confirmSelection = 1; // 0=YES, 1=NO (default NO)
  private confirmPanel: Container | null = null;

  // Keyboard preset selector (sub-modal)
  private presetActive = false;
  private presetIndex = 0;
  private presetPanel: Container | null = null;
  private presetPulseG: Graphics | null = null;
  private presetPulseTimer = 0;
  private presetPulseRect = { w: 0, h: 0 };
  private input: InputManager | null = null;

  // Audio settings (sub-modal)
  private audioActive = false;
  private audioIndex = 0;
  private audioPanel: Container | null = null;
  private audioPulseG: Graphics | null = null;
  private audioPulseTimer = 0;
  private audioPulseRect = { w: 0, h: 0 };

  // GDD settings menu (4 tabs)
  private settingsActive = false;
  private settingsTabIndex = 0;
  private settingsIndex = 0; // 0 = tab row, 1..n = rows
  private settingsPanel: Container | null = null;
  private settingsPulseG: Graphics | null = null;
  private settingsPulseTimer = 0;
  private settingsPulseRect = { w: 0, h: 0 };
  private settings = loadSettings();

  /** Callback: 'continue' | 'status' | 'quit_confirmed' */
  onAction: ((action: string) => void) | null = null;

  private skin: UISkin | null = null;
  private overlay: Graphics | null = null;

  /** UI native 留덉씠洹몃젅?댁뀡 1?④퀎: uiContainer(scale=1) 吏곸냽 留덉슫?몄슜 ?먯껜 scale.
   *  inputManager ??SELECT KEYBOARD ?쒕툕紐⑤떖?먯꽌 preset 利됱떆 ?곸슜/?꾩옱 preset 議고쉶?? */
  constructor(skin?: UISkin | null, uiScale: number = 1, input?: InputManager | null, private readonly game?: Game | null) {
    this.skin = skin ?? null;
    this.input = input ?? null;
    this.container = new Container();
    this.container.scale.set(uiScale);
    this.container.visible = false;
    this.panel = new Container();
  }

  /** Rebuild panel each open ??ensures UISkin is loaded by the time ESC is pressed */
  private buildPanel(): void {
    this.container.removeChildren();
    const basePanel = createPauseMenuBasePanel(this.skin, resolveItemLabel);
    this.overlay = basePanel.overlay;
    this.panel = basePanel.panel;
    this.menuTexts = basePanel.menuTexts;
    this.selectionBg = basePanel.selectionBg;
    this.selectionPulseG = basePanel.selectionPulseG;
    this.chevronL = basePanel.chevronL;
    this.chevronR = basePanel.chevronR;
    this.container.addChild(this.overlay);
    this.container.addChild(this.panel);
  }

  open(): void {
    this.settings = loadSettings();
    this.buildPanel(); // Rebuild with latest skin state
    this.visible = true;
    this.container.visible = true;
    this.selectedIndex = 0;
    this.confirmActive = false;
    this.hideConfirm();
    updatePauseMenuCursor({
      parts: {
        menuTexts: this.menuTexts,
        selectionBg: this.selectionBg,
        selectionPulseG: this.selectionPulseG,
        chevronL: this.chevronL,
        chevronR: this.chevronR,
      },
      selectedIndex: this.selectedIndex,
      selectionPulseTimer: this.selectionPulseTimer,
    });
  }

  close(): void {
    this.visible = false;
    this.container.visible = false;
    this.hideConfirm();
    this.hidePresetSelector();
    this.hideSettings();
    this.hideAudioSettings();
  }

  navigate(dir: 'up' | 'down' | 'left' | 'right'): void {
    if (this.confirmActive) {
      if (dir === 'left' || dir === 'right') {
        this.confirmSelection = this.confirmSelection === 0 ? 1 : 0;
        this.drawConfirm();
      }
      return;
    }
    if (this.presetActive) {
      if (dir === 'up') this.presetIndex = (this.presetIndex - 1 + PRESETS_DATA.length) % PRESETS_DATA.length;
      if (dir === 'down') this.presetIndex = (this.presetIndex + 1) % PRESETS_DATA.length;
      this.drawPresetSelector();
      return;
    }
    if (this.settingsActive) {
      this.navigateSettings(dir);
      return;
    }
    if (this.audioActive) {
      if (dir === 'up') this.audioIndex = (this.audioIndex - 1 + AUDIO_ROWS.length) % AUDIO_ROWS.length;
      if (dir === 'down') this.audioIndex = (this.audioIndex + 1) % AUDIO_ROWS.length;
      if (dir === 'left') this.adjustAudio(-1);
      if (dir === 'right') this.adjustAudio(1);
      this.drawAudioSettings();
      return;
    }
    if (dir === 'up') this.selectedIndex = (this.selectedIndex - 1 + MENU_ITEMS.length) % MENU_ITEMS.length;
    if (dir === 'down') this.selectedIndex = (this.selectedIndex + 1) % MENU_ITEMS.length;
    updatePauseMenuCursor({
      parts: {
        menuTexts: this.menuTexts,
        selectionBg: this.selectionBg,
        selectionPulseG: this.selectionPulseG,
        chevronL: this.chevronL,
        chevronR: this.chevronR,
      },
      selectedIndex: this.selectedIndex,
      selectionPulseTimer: this.selectionPulseTimer,
    });
  }

  confirm(): void {
    if (this.confirmActive) {
      if (this.confirmSelection === 0) {
        // YES ??quit
        this.close();
        this.onAction?.('quit_confirmed');
      } else {
        // NO ??cancel
        this.hideConfirm();
      }
      return;
    }

    if (this.presetActive) {
      // ?꾩옱 ?좏깮??preset 利됱떆 ?곸슜 + ACTIVE 諭껋? 媛깆떊. 紐⑤떖? ESC 濡??ル뒗 ?먮쫫.
      const sel = PRESETS_DATA[this.presetIndex];
      this.input?.applyPreset(sel.name);
      this.drawPresetSelector();
      return;
    }

    if (this.settingsActive) {
      this.confirmSettings();
      return;
    }

    if (this.audioActive) {
      // ?ㅻ뵒???쒕툕紐⑤떖?먯꽌 C ??臾대룞????議곗젙? ??? ?リ린??ESC.
      return;
    }

    const action = MENU_ITEMS[this.selectedIndex].action;
    if (action === 'quit') {
      this.showConfirm();
      return;
    }
    if (action === 'select_keyboard') {
      this.showPresetSelector();
      return;
    }
    if (action === 'settings') {
      this.showSettings();
      return;
    }
    if (action === 'fullscreen') {
      // Manual toggle. Promise resolves with the resulting state ??refresh
      // the menu label so the player sees "FULLSCREEN: ON/OFF" flip.
      // Stays inside the pause menu (no close, no onAction propagation).
      toggleFullscreen().then(() => this.refreshFullscreenLabel());
      return;
    }
    if (action === 'continue') {
      this.close();
    }
    this.onAction?.(action);
  }

  /** Rewrite the label of the fullscreen menu row (if present). */
  private refreshFullscreenLabel(): void {
    for (let i = 0; i < MENU_ITEMS.length; i++) {
      if (MENU_ITEMS[i].action !== 'fullscreen') continue;
      const t = this.menuTexts[i];
      if (!t) return;
      t.text = resolveItemLabel(MENU_ITEMS[i]);
      // Re-center horizontally ??label width changed.
      t.x = Math.floor((PANEL_W - t.width) / 2);
      return;
    }
  }

  cancel(): void {
    if (this.confirmActive) {
      this.hideConfirm();
      return;
    }
    if (this.presetActive) {
      this.hidePresetSelector();
      return;
    }
    if (this.settingsActive) {
      this.hideSettings();
      return;
    }
    if (this.audioActive) {
      this.hideAudioSettings();
      return;
    }
    this.close();
    this.onAction?.('continue');
  }



  /** Per-frame pulse driver ??call from the scene update loop while visible. */
  update(dt: number): void {
    if (!this.visible) return;
    this.selectionPulseTimer = advancePauseMenuBaseCursor({
      parts: {
        menuTexts: this.menuTexts,
        selectionBg: this.selectionBg,
        selectionPulseG: this.selectionPulseG,
        chevronL: this.chevronL,
        chevronR: this.chevronR,
      },
      selectedIndex: this.selectedIndex,
      selectionPulseTimer: this.selectionPulseTimer,
      dt,
    });
    const modalPulseTimers = advancePauseMenuPulseStates({
      confirm: {
        active: this.confirmActive,
        gfx: this.confirmPulseG,
        rect: this.confirmPulseRect,
        timerMs: this.confirmPulseTimer,
      },
      preset: {
        active: this.presetActive,
        gfx: this.presetPulseG,
        rect: this.presetPulseRect,
        timerMs: this.presetPulseTimer,
      },
      settings: {
        active: this.settingsActive,
        gfx: this.settingsPulseG,
        rect: this.settingsPulseRect,
        timerMs: this.settingsPulseTimer,
      },
      audio: {
        active: this.audioActive,
        gfx: this.audioPulseG,
        rect: this.audioPulseRect,
        timerMs: this.audioPulseTimer,
      },
    }, dt);
    this.confirmPulseTimer = modalPulseTimers.confirm;
    this.presetPulseTimer = modalPulseTimers.preset;
    this.settingsPulseTimer = modalPulseTimers.settings;
    this.audioPulseTimer = modalPulseTimers.audio;
  }


  private confirmPulseRect = { w: 0, h: 0 };

  private showConfirm(): void {
    this.confirmActive = true;
    this.confirmSelection = 1; // Default NO
    this.drawConfirm();
  }

  private hideConfirm(): void {
    this.confirmActive = false;
    destroyPauseModalPanelAndApply(this.confirmPanel, () => {
      this.confirmPanel = null;
      this.confirmPulseG = null; // destroyed with confirmPanel
    });
    setPauseMenuBaseSelectionPulseSuppressed(this.selectionPulseG, false);
  }

  private drawConfirm(): void {
    mountPauseModalPanelAndRedraw(
      this.container,
      this.confirmPanel,
      createPauseConfirmPanel(this.confirmSelection),
      (mounted) => {
        this.confirmPanel = mounted.panel;
        this.confirmPulseG = mounted.pulseG;
        this.confirmPulseRect = mounted.pulseRect;
        this.confirmPulseTimer = mounted.pulseTimer;
      },
    );

    // Mute the suppressed-by-confirm-dialog ambient row pulse so the eye
    // jumps to the confirm choice instead of the menu underneath.
    setPauseMenuBaseSelectionPulseSuppressed(this.selectionPulseG, true);
  }

  // ?? Keyboard preset selector ????????????????????????????????????????????????

  private showPresetSelector(): void {
    this.presetActive = true;
    // ?꾩옱 ?쒖꽦 preset ?쇰줈 而ㅼ꽌 珥덇린?????ъ슜?먭? 利됱떆 鍮꾧탳 媛??
    const cur = this.input?.currentPreset ?? 'classic';
    const idx = PRESETS_DATA.findIndex(p => p.name === cur);
    this.presetIndex = idx >= 0 ? idx : 0;
    this.drawPresetSelector();
  }

  private hidePresetSelector(): void {
    this.presetActive = false;
    destroyPauseModalPanelAndApply(this.presetPanel, () => {
      this.presetPanel = null;
      this.presetPulseG = null;
    });
    if (this.settingsActive) {
      setPauseMenuBaseSelectionPulseSuppressed(this.selectionPulseG, true);
      this.drawSettings();
    } else {
      setPauseMenuBaseSelectionPulseSuppressed(this.selectionPulseG, false);
    }
  }

  private drawPresetSelector(): void {
    mountPauseModalPanelAndRedraw(
      this.container,
      this.presetPanel,
      createPausePresetSelectorPanel(this.skin, this.presetIndex, this.input?.currentPreset ?? 'classic'),
      (mounted) => {
        this.presetPanel = mounted.panel;
        this.presetPulseG = mounted.pulseG;
        this.presetPulseRect = mounted.pulseRect;
        this.presetPulseTimer = mounted.pulseTimer;
      },
    );

    setPauseMenuBaseSelectionPulseSuppressed(this.selectionPulseG, true);
  }


  // ?? Audio settings ???????????????????????????????????????????????????????????

  // -- GDD settings menu -------------------------------------------------------

  private showSettings(): void {
    this.settings = loadSettings();
    this.settingsActive = true;
    this.settingsTabIndex = 0;
    this.settingsIndex = 0;
    this.drawSettings();
  }

  private hideSettings(): void {
    this.settingsActive = false;
    destroyPauseModalPanelAndApply(this.settingsPanel, () => {
      this.settingsPanel = null;
      this.settingsPulseG = null;
    });
    setPauseMenuBaseSelectionPulseSuppressed(this.selectionPulseG, false);
  }

  private activeSettingsTab(): SettingsTab {
    return SETTINGS_TABS[this.settingsTabIndex]?.id ?? 'gameplay';
  }

  private settingsRows(): SettingsRow[] {
    switch (this.activeSettingsTab()) {
      case 'display': return DISPLAY_ROWS;
      case 'audio': return SETTINGS_AUDIO_ROWS;
      case 'controls': return CONTROLS_ROWS;
      default: return GAMEPLAY_ROWS;
    }
  }

  private navigateSettings(dir: 'up' | 'down' | 'left' | 'right'): void {
    const rows = this.settingsRows();
    const maxIndex = rows.length;
    if (dir === 'up') this.settingsIndex = (this.settingsIndex - 1 + maxIndex + 1) % (maxIndex + 1);
    if (dir === 'down') this.settingsIndex = (this.settingsIndex + 1) % (maxIndex + 1);
    if (dir === 'left' || dir === 'right') {
      if (this.settingsIndex === 0) this.switchSettingsTab(dir === 'right' ? 1 : -1);
      else this.adjustSettingsRow(rows[this.settingsIndex - 1], dir === 'right' ? 1 : -1);
    }
    this.drawSettings();
  }

  private confirmSettings(): void {
    if (this.settingsIndex === 0) {
      this.switchSettingsTab(1);
      this.drawSettings();
      return;
    }
    const row = this.settingsRows()[this.settingsIndex - 1];
    if (!row) return;
    if (row.id === 'back') {
      this.hideSettings();
      return;
    }
    if (row.id === 'keyboard_preset') {
      this.showPresetSelector();
      return;
    }
    if (row.id === 'window_mode') {
      this.toggleWindowMode();
      return;
    }
    if (isSettingsAudioRow(row.id)) {
      toggleSettingsAudioMute(this.settings, row.id);
      this.persistSettings();
      this.drawSettings();
      return;
    }
    this.adjustSettingsRow(row, 1);
    this.drawSettings();
  }

  private switchSettingsTab(dir: number): void {
    this.settingsTabIndex = (this.settingsTabIndex + dir + SETTINGS_TABS.length) % SETTINGS_TABS.length;
    this.settingsIndex = 0;
  }

  private adjustSettingsRow(row: SettingsRow, dir: number): void {
    if (row.id === 'window_mode') {
      this.toggleWindowMode();
      return;
    }
    if (!adjustSettingsRowValue(this.settings, row, dir)) return;
    this.persistSettings();
  }

  private toggleWindowMode(): void {
    toggleFullscreen().then(() => {
      this.settings.display.windowMode = isFullscreenActive() ? 'fullscreen' : 'windowed';
      this.persistSettings();
      if (this.settingsActive) this.drawSettings();
      this.refreshFullscreenLabel();
    });
  }

  private persistSettings(): void {
    applySettingsData(this.settings);
    this.game?.applySettings(this.settings);
    saveSettings(this.settings);
  }

  private drawSettings(): void {
    mountPauseModalPanelAndRedraw(
      this.container,
      this.settingsPanel,
      createPauseSettingsPanel(
      this.skin,
      this.settingsTabIndex,
      this.settingsIndex,
      this.settingsRows(),
      (row) => settingsRowValue(this.settings, row, this.input?.currentPreset),
    ),
      (mounted) => {
        this.settingsPanel = mounted.panel;
        this.settingsPulseG = mounted.pulseG;
        this.settingsPulseRect = mounted.pulseRect;
        this.settingsPulseTimer = mounted.pulseTimer;
      },
    );

    setPauseMenuBaseSelectionPulseSuppressed(this.selectionPulseG, true);
  }


  private showAudioSettings(): void {
    this.audioActive = true;
    this.audioIndex = 0;
    this.drawAudioSettings();
  }

  private hideAudioSettings(): void {
    this.audioActive = false;
    destroyPauseModalPanelAndApply(this.audioPanel, () => {
      this.audioPanel = null;
      this.audioPulseG = null;
    });
    setPauseMenuBaseSelectionPulseSuppressed(this.selectionPulseG, false);
  }

  /** ???濡??좏깮 梨꾨꼸 蹂쇰ⅷ??10% ?⑥쐞濡?議곗젙 ??利됱떆 ?곸슜 + ?곸냽 ??? */
  private adjustAudio(dir: number): void {
    adjustAudioRowVolume(AUDIO_ROWS[this.audioIndex], dir);
    saveAudio();
  }

  private drawAudioSettings(): void {
    mountPauseModalPanelAndRedraw(
      this.container,
      this.audioPanel,
      createPauseAudioPanel(this.skin, this.audioIndex, getAudioRowVolume),
      (mounted) => {
        this.audioPanel = mounted.panel;
        this.audioPulseG = mounted.pulseG;
        this.audioPulseRect = mounted.pulseRect;
        this.audioPulseTimer = mounted.pulseTimer;
      },
    );

    setPauseMenuBaseSelectionPulseSuppressed(this.selectionPulseG, true);
  }

}
