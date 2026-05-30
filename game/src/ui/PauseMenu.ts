/**
 * PauseMenu — ESC key pause overlay with menu navigation.
 *
 * Menu items: CONTINUE / SETTINGS / QUIT TO TITLE
 * Pattern A (Modal): game paused, arrow nav, C confirm, ESC back.
 */

import { Container, Graphics, BitmapText, Text } from 'pixi.js';
import { GAME_WIDTH, GAME_HEIGHT, type Game } from '../Game';
import { PIXEL_FONT } from './fonts';
import { createUiText } from './factories';
import { t } from '@i18n';
import {
  createModalPanel,
  drawSelectionRow,
  drawSelectionPulse,
  ROW_CHEVRON_COLOR,
  ROW_SELECTED_GLOW_ALPHA,
  ROW_SELECTED_EDGE,
  MODAL_BG, MODAL_BORDER, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_NEGATIVE, TEXT_WARNING,
  MODAL_OVERLAY, MODAL_OVERLAY_ALPHA,
} from './ModalPanel';
import type { UISkin } from './UISkin';
import type { InputManager, PresetName } from '@core/InputManager';
import { toggleFullscreen, isFullscreenActive } from '@core/Fullscreen';
import { AudioBus, type AudioChannel } from '@audio/AudioBus';
import {
  applySettingsData,
  loadSettings,
  saveAudio,
  saveSettings,
  type SettingsData,
} from '@core/SettingsStore';

const PANEL_W = 200;
const PANEL_H = 174;
const PANEL_X = Math.floor((GAME_WIDTH - PANEL_W) / 2);
const PANEL_Y = Math.floor((GAME_HEIGHT - PANEL_H) / 2);
const ITEM_START_Y = 36;
const ITEM_SPACING = 18;
const ROW_PAD_X = 10;          // left/right padding inside the selection row
const ROW_H = 14;              // selection row height
const CHEVRON_INSET = 4;       // distance from row edge to ▶ / ◀

const COL_BG = MODAL_BG;
const COL_BORDER = MODAL_BORDER;
const COL_TEXT = TEXT_PRIMARY;
const COL_DIM = TEXT_SECONDARY;
const COL_DANGER = TEXT_NEGATIVE;
const COL_WARNING = TEXT_WARNING;
const COL_ACCENT = ROW_CHEVRON_COLOR;

type MenuItem = { labelKey: string; action: string; color?: number };

const MENU_ITEMS: MenuItem[] = [
  { labelKey: 'ui.pause.continue', action: 'continue' },
  { labelKey: 'ui.pause.settings', action: 'settings' },
  { labelKey: 'ui.pause.status', action: 'status' },
  { labelKey: 'ui.pause.quit_to_title', action: 'quit', color: COL_DANGER },
];

function resolveItemLabel(item: MenuItem): string {
  if (item.action === 'fullscreen') {
    return t(isFullscreenActive() ? 'ui.pause.fullscreen_on' : 'ui.pause.fullscreen_off');
  }
  return t(item.labelKey);
}

// 키보드 preset 카드 — `Documents/UI` (game/docs/ui-components.html line 1389) 의
// "Preset Selection (Phase 1)" 카드 스펙을 따라 라벨 + 한 줄 키 미리보기.
const PRESETS_DATA: { name: PresetName; labelKey: string; descKey: string }[] = [
  { name: 'classic', labelKey: 'ui.pause.preset_classic_label', descKey: 'ui.pause.preset_classic_desc' },
  { name: 'modern',  labelKey: 'ui.pause.preset_modern_label',  descKey: 'ui.pause.preset_modern_desc' },
  { name: 'wasd',    labelKey: 'ui.pause.preset_wasd_label',    descKey: 'ui.pause.preset_wasd_desc' },
];

const PRESET_PANEL_W = 280;
const PRESET_PANEL_H = 156;
const PRESET_ROW_H = 28;
const PRESET_ROW_PAD_X = 10;
const PRESET_LIST_Y = 30;

// 오디오 설정 서브모달 — AUDIO 항목에서 진입. AudioBus 5채널(master + bgm/ambient/
// sfx/voice) 볼륨을 좌우(◀▶)로 ±10% 조정, 즉시 적용 + SettingsStore 저장.
// 컴포넌트는 preset selector 와 동일 카논(createModalPanel/drawSelectionRow/chevron/text).
type AudioRow =
  | { kind: 'master'; labelKey: string }
  | { kind: 'channel'; channel: AudioChannel; labelKey: string };

const AUDIO_ROWS: AudioRow[] = [
  { kind: 'master',  labelKey: 'ui.settings.audio.master' },
  { kind: 'channel', channel: 'bgm',     labelKey: 'ui.settings.audio.bgm' },
  { kind: 'channel', channel: 'ambient', labelKey: 'ui.settings.audio.ambient' },
  { kind: 'channel', channel: 'sfx',     labelKey: 'ui.settings.audio.sfx' },
  { kind: 'channel', channel: 'voice',   labelKey: 'ui.settings.audio.voice' },
];

const AUDIO_PANEL_W = 240;
const AUDIO_PANEL_H = 178;
const AUDIO_ROW_H = 22;
const AUDIO_ROW_PAD_X = 12;
const AUDIO_LIST_Y = 30;

type SettingsTab = 'gameplay' | 'display' | 'audio' | 'controls';
type SettingsRowId =
  | 'language'
  | 'window_mode'
  | 'scale'
  | 'scale_filter'
  | 'shake'
  | 'show_fps'
  | 'audio_master'
  | 'audio_bgm'
  | 'audio_ambient'
  | 'audio_sfx'
  | 'audio_voice'
  | 'keyboard_preset'
  | 'rumble'
  | 'back';

interface SettingsRow {
  id: SettingsRowId;
  labelKey: string;
}

const SETTINGS_TABS: Array<{ id: SettingsTab; labelKey: string }> = [
  { id: 'gameplay', labelKey: 'ui.settings.tab.gameplay' },
  { id: 'display', labelKey: 'ui.settings.tab.display' },
  { id: 'audio', labelKey: 'ui.settings.tab.audio' },
  { id: 'controls', labelKey: 'ui.settings.tab.controls' },
];

const SETTINGS_PANEL_W = 300;
const SETTINGS_PANEL_H = 226;
const SETTINGS_ROW_H = 18;
const SETTINGS_ROW_PAD_X = 12;
const SETTINGS_TAB_Y = 30;
const SETTINGS_LIST_Y = 56;

const GAMEPLAY_ROWS: SettingsRow[] = [
  { id: 'language', labelKey: 'ui.settings.gameplay.language' },
  { id: 'back', labelKey: 'ui.settings.back' },
];

const DISPLAY_ROWS: SettingsRow[] = [
  { id: 'window_mode', labelKey: 'ui.settings.display.window_mode' },
  { id: 'scale', labelKey: 'ui.settings.display.scale' },
  { id: 'scale_filter', labelKey: 'ui.settings.display.scale_filter' },
  { id: 'shake', labelKey: 'ui.settings.display.shake' },
  { id: 'show_fps', labelKey: 'ui.settings.display.show_fps' },
  { id: 'back', labelKey: 'ui.settings.back' },
];

const SETTINGS_AUDIO_ROWS: SettingsRow[] = [
  { id: 'audio_master', labelKey: 'ui.settings.audio.master' },
  { id: 'audio_bgm', labelKey: 'ui.settings.audio.bgm' },
  { id: 'audio_ambient', labelKey: 'ui.settings.audio.ambient' },
  { id: 'audio_sfx', labelKey: 'ui.settings.audio.sfx' },
  { id: 'audio_voice', labelKey: 'ui.settings.audio.voice' },
  { id: 'back', labelKey: 'ui.settings.back' },
];

const CONTROLS_ROWS: SettingsRow[] = [
  { id: 'keyboard_preset', labelKey: 'ui.settings.controls.keyboard_preset' },
  { id: 'rumble', labelKey: 'ui.settings.controls.rumble' },
  { id: 'back', labelKey: 'ui.settings.back' },
];

/** 채널/마스터 볼륨 읽기 (0..1). */
function getRowVol(row: AudioRow): number {
  return row.kind === 'master' ? AudioBus.getMasterVolume() : AudioBus.getChannelVolume(row.channel);
}
/** 채널/마스터 볼륨 쓰기 (0..1). */
function setRowVol(row: AudioRow, v01: number): void {
  if (row.kind === 'master') AudioBus.setMasterVolume(v01);
  else AudioBus.setChannelVolume(row.channel, v01);
}

function cycle<const T extends string>(values: readonly T[], current: T, dir: number): T {
  const idx = Math.max(0, values.indexOf(current));
  return values[(idx + dir + values.length) % values.length];
}

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
  private presetPulseRowY = 0;
  private input: InputManager | null = null;

  // Audio settings (sub-modal)
  private audioActive = false;
  private audioIndex = 0;
  private audioPanel: Container | null = null;
  private audioPulseG: Graphics | null = null;
  private audioPulseTimer = 0;

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

  /** UI native 마이그레이션 1단계: uiContainer(scale=1) 직속 마운트용 자체 scale.
   *  inputManager 는 SELECT KEYBOARD 서브모달에서 preset 즉시 적용/현재 preset 조회용. */
  constructor(skin?: UISkin | null, uiScale: number = 1, input?: InputManager | null, private readonly game?: Game | null) {
    this.skin = skin ?? null;
    this.input = input ?? null;
    this.container = new Container();
    this.container.scale.set(uiScale);
    this.container.visible = false;
    this.panel = new Container();
  }

  /** Rebuild panel each open — ensures UISkin is loaded by the time ESC is pressed */
  private buildPanel(): void {
    // Clear previous
    this.container.removeChildren();
    this.menuTexts = [];
    this.selectionBg = null;
    this.selectionPulseG = null;
    this.chevronL = null;
    this.chevronR = null;

    // Overlay
    this.overlay = new Graphics();
    this.overlay.rect(0, 0, GAME_WIDTH, GAME_HEIGHT).fill({ color: MODAL_OVERLAY, alpha: MODAL_OVERLAY_ALPHA });
    this.container.addChild(this.overlay);

    // Panel with 9-slice or fallback
    const { panel } = createModalPanel(this.skin, PANEL_W, PANEL_H);
    this.panel = panel;
    this.container.addChild(this.panel);

    // Title
    const title = createUiText(t('ui.pause.title'), { fontSize: 10, fill: COL_TEXT });
    title.x = Math.floor((PANEL_W - title.width) / 2);
    title.y = 10;
    this.panel.addChild(title);

    // Divider
    const divider = new Graphics();
    divider.moveTo(12, 28); divider.lineTo(PANEL_W - 12, 28);
    divider.stroke({ width: 1, color: COL_BORDER });
    this.panel.addChild(divider);

    // Selection row background (drawn beneath labels). Position updated in updateCursor.
    const rowW = PANEL_W - ROW_PAD_X * 2;
    this.selectionBg = new Graphics();
    this.selectionBg.x = ROW_PAD_X;
    drawSelectionRow(this.selectionBg, rowW, ROW_H, 'soft');
    this.panel.addChild(this.selectionBg);

    // Menu items (drawn on top of selection bg)
    for (let i = 0; i < MENU_ITEMS.length; i++) {
      const item = MENU_ITEMS[i];
      const labelText = createUiText(resolveItemLabel(item), {
        fontSize: 8,
        fill: item.color ?? COL_TEXT,
      });
      // Center label horizontally inside the selection row band
      labelText.x = Math.floor((PANEL_W - labelText.width) / 2);
      labelText.y = ITEM_START_Y + i * ITEM_SPACING;
      this.panel.addChild(labelText);
      this.menuTexts.push(labelText);
    }

    // Symmetric chevrons — orange accent
    this.chevronL = new BitmapText({
      text: '\u25B6',
      style: { fontFamily: PIXEL_FONT, fontSize: 10, fill: ROW_CHEVRON_COLOR },
    });
    this.chevronR = new BitmapText({
      text: '\u25C0',
      style: { fontFamily: PIXEL_FONT, fontSize: 10, fill: ROW_CHEVRON_COLOR },
    });
    this.panel.addChild(this.chevronL);
    this.panel.addChild(this.chevronR);

    // Outer pulse halo — drawn last so it sits above the selection fill
    this.selectionPulseG = new Graphics();
    this.selectionPulseG.x = ROW_PAD_X;
    this.panel.addChild(this.selectionPulseG);
  }

  open(): void {
    this.settings = loadSettings();
    this.buildPanel(); // Rebuild with latest skin state
    this.visible = true;
    this.container.visible = true;
    this.selectedIndex = 0;
    this.confirmActive = false;
    this.hideConfirm();
    this.updateCursor();
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
    this.updateCursor();
  }

  confirm(): void {
    if (this.confirmActive) {
      if (this.confirmSelection === 0) {
        // YES — quit
        this.close();
        this.onAction?.('quit_confirmed');
      } else {
        // NO — cancel
        this.hideConfirm();
      }
      return;
    }

    if (this.presetActive) {
      // 현재 선택한 preset 즉시 적용 + ACTIVE 뱃지 갱신. 모달은 ESC 로 닫는 흐름.
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
      // 오디오 서브모달에서 C 는 무동작 — 조정은 ◀▶, 닫기는 ESC.
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
      // Manual toggle. Promise resolves with the resulting state — refresh
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
      // Re-center horizontally — label width changed.
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

  private updateCursor(): void {
    if (!this.selectionBg || !this.selectionPulseG || !this.chevronL || !this.chevronR) return;
    // Vertically center the row band on the active label baseline
    const labelY = ITEM_START_Y + this.selectedIndex * ITEM_SPACING;
    const rowY = labelY - 3;
    this.selectionBg.y = rowY;
    this.selectionPulseG.y = rowY;
    // Chevrons align to row, sit at row edges
    const rowW = PANEL_W - ROW_PAD_X * 2;
    this.chevronL.x = ROW_PAD_X + CHEVRON_INSET;
    this.chevronL.y = rowY + 3;
    this.chevronR.x = ROW_PAD_X + rowW - CHEVRON_INSET - 7;
    this.chevronR.y = rowY + 3;
    // Highlight the selected label, dim the rest
    for (let i = 0; i < this.menuTexts.length; i++) {
      const t = this.menuTexts[i];
      const item = MENU_ITEMS[i];
      const isSel = i === this.selectedIndex;
      t.style.fill = isSel ? COL_TEXT : (item.color ?? COL_DIM);
    }
    this.redrawSelectionPulse();
  }

  private redrawSelectionPulse(): void {
    if (!this.selectionPulseG) return;
    const t = this.selectionPulseTimer / 1000;
    // Soft, slow breathing: 0.8 Hz, 0.50..1.00 of base alpha
    const a = ROW_SELECTED_GLOW_ALPHA * (0.75 + 0.25 * Math.sin(t * Math.PI * 2 * 0.8));
    const rowW = PANEL_W - ROW_PAD_X * 2;
    this.selectionPulseG.clear();
    drawSelectionPulse(this.selectionPulseG, rowW, ROW_H, a, 'soft');
  }

  /** Per-frame pulse driver — call from the scene update loop while visible. */
  update(dt: number): void {
    if (!this.visible) return;
    this.selectionPulseTimer += dt;
    this.redrawSelectionPulse();
    if (this.confirmActive && this.confirmPulseG) {
      this.confirmPulseTimer += dt;
      this.redrawConfirmPulse();
    }
    if (this.presetActive && this.presetPulseG) {
      this.presetPulseTimer += dt;
      this.redrawPresetPulse();
    }
    if (this.settingsActive && this.settingsPulseG) {
      this.settingsPulseTimer += dt;
      this.redrawSettingsPulse();
    }
    if (this.audioActive && this.audioPulseG) {
      this.audioPulseTimer += dt;
      this.redrawAudioPulse();
    }
  }

  private redrawConfirmPulse(): void {
    if (!this.confirmPulseG) return;
    const t = this.confirmPulseTimer / 1000;
    const a = ROW_SELECTED_GLOW_ALPHA * (0.75 + 0.25 * Math.sin(t * Math.PI * 2 * 0.8));
    this.confirmPulseG.clear();
    drawSelectionPulse(this.confirmPulseG, this.confirmPulseRect.w, this.confirmPulseRect.h, a, 'soft');
  }

  private confirmPulseRect = { w: 0, h: 0 };

  private showConfirm(): void {
    this.confirmActive = true;
    this.confirmSelection = 1; // Default NO
    this.drawConfirm();
  }

  private hideConfirm(): void {
    this.confirmActive = false;
    if (this.confirmPanel) {
      this.container.removeChild(this.confirmPanel);
      this.confirmPanel.destroy({ children: true });
      this.confirmPanel = null;
    }
    this.confirmPulseG = null; // destroyed with confirmPanel
    if (this.selectionPulseG) this.selectionPulseG.alpha = 1;
  }

  private drawConfirm(): void {
    if (this.confirmPanel) {
      this.container.removeChild(this.confirmPanel);
      this.confirmPanel.destroy({ children: true });
    }

    const cw = 160, ch = 60;
    const cx = Math.floor((GAME_WIDTH - cw) / 2);
    const cy = Math.floor((GAME_HEIGHT - ch) / 2);

    this.confirmPanel = new Container();
    this.confirmPanel.x = cx;
    this.confirmPanel.y = cy;

    const bg = new Graphics();
    bg.rect(0, 0, cw, ch).fill({ color: COL_BG, alpha: 0.97 });
    bg.rect(0, 0, cw, ch).stroke({ color: COL_DANGER, width: 1 });
    this.confirmPanel.addChild(bg);

    const warning = createUiText(t('ui.pause.quit_confirm_title'), {
      fontSize: 8, fill: COL_WARNING, wordWrap: true, wordWrapWidth: cw - 20,
    });
    warning.x = Math.floor((cw - warning.width) / 2);
    warning.y = 10;
    this.confirmPanel.addChild(warning);

    const sub = createUiText(t('ui.pause.quit_confirm_warn'), {
      fontSize: 8, fill: COL_DIM, wordWrap: true, wordWrapWidth: cw - 20,
    });
    sub.x = Math.floor((cw - sub.width) / 2);
    sub.y = 24;
    this.confirmPanel.addChild(sub);

    // YES / NO buttons
    const btnW = 50, btnH = 16;
    const btnY = 38;
    let selectedBtnX = 0;
    for (let b = 0; b < 2; b++) {
      const bx = b === 0 ? 20 : cw - 20 - btnW;
      const selected = b === this.confirmSelection;
      const label = b === 0 ? t('ui.confirm.yes') : t('ui.confirm.no');

      const btnBg = new Graphics();
      btnBg.x = bx;
      btnBg.y = btnY;
      if (selected) {
        // Orange canonical selection (soft tier — confirm dialog is ambient)
        drawSelectionRow(btnBg, btnW, btnH, 'soft');
        selectedBtnX = bx;
      } else {
        btnBg.rect(0, 0, btnW, btnH).fill(0x1a1a2e);
        btnBg.rect(0, 0, btnW, btnH).stroke({ color: 0x333333, width: 1 });
      }
      this.confirmPanel.addChild(btnBg);

      const btnText = createUiText(label, { fontSize: 8, fill: selected ? COL_TEXT : COL_DIM });
      btnText.x = bx + Math.floor((btnW - btnText.width) / 2);
      btnText.y = btnY + 4;
      this.confirmPanel.addChild(btnText);
    }

    // YES (left) gets a danger-tinted edge accent over the orange base, since
    // it is destructive. The NO (right) button uses pure orange selection.
    if (this.confirmSelection === 0) {
      const dangerEdge = new Graphics();
      dangerEdge.rect(selectedBtnX, btnY, btnW, btnH).stroke({ color: COL_DANGER, width: 2, alpha: 0.6 });
      this.confirmPanel.addChild(dangerEdge);
    }

    // Pulse halo overlay, positioned over the selected button
    this.confirmPulseG = new Graphics();
    this.confirmPulseG.x = selectedBtnX;
    this.confirmPulseG.y = btnY;
    this.confirmPulseRect = { w: btnW, h: btnH };
    this.confirmPanel.addChild(this.confirmPulseG);
    this.confirmPulseTimer = 0;
    this.redrawConfirmPulse();

    // Mute the suppressed-by-confirm-dialog ambient row pulse so the eye
    // jumps to the confirm choice instead of the menu underneath.
    if (this.selectionPulseG) this.selectionPulseG.alpha = 0.15;

    this.container.addChild(this.confirmPanel);
  }

  // ── Keyboard preset selector ────────────────────────────────────────────────

  private showPresetSelector(): void {
    this.presetActive = true;
    // 현재 활성 preset 으로 커서 초기화 — 사용자가 즉시 비교 가능.
    const cur = this.input?.currentPreset ?? 'classic';
    const idx = PRESETS_DATA.findIndex(p => p.name === cur);
    this.presetIndex = idx >= 0 ? idx : 0;
    this.drawPresetSelector();
  }

  private hidePresetSelector(): void {
    this.presetActive = false;
    if (this.presetPanel) {
      this.container.removeChild(this.presetPanel);
      this.presetPanel.destroy({ children: true });
      this.presetPanel = null;
    }
    this.presetPulseG = null;
    if (this.settingsActive) {
      if (this.selectionPulseG) this.selectionPulseG.alpha = 0.15;
      this.drawSettings();
    } else if (this.selectionPulseG) {
      this.selectionPulseG.alpha = 1;
    }
  }

  private drawPresetSelector(): void {
    if (this.presetPanel) {
      this.container.removeChild(this.presetPanel);
      this.presetPanel.destroy({ children: true });
    }

    const cw = PRESET_PANEL_W;
    const ch = PRESET_PANEL_H;
    const cx = Math.floor((GAME_WIDTH - cw) / 2);
    const cy = Math.floor((GAME_HEIGHT - ch) / 2);

    this.presetPanel = new Container();
    this.presetPanel.x = cx;
    this.presetPanel.y = cy;

    // 9-slice 패널 — Pause/Inventory 와 동일 카논 (createModalPanel).
    const { panel } = createModalPanel(this.skin, cw, ch);
    this.presetPanel.addChild(panel);

    // Title
    const title = createUiText(t('ui.pause.controls'), { fontSize: 10, fill: COL_TEXT });
    title.x = Math.floor((cw - title.width) / 2);
    title.y = 8;
    panel.addChild(title);

    // Divider
    const divider = new Graphics();
    divider.moveTo(12, 22); divider.lineTo(cw - 12, 22);
    divider.stroke({ width: 1, color: COL_BORDER });
    panel.addChild(divider);

    const cur = this.input?.currentPreset ?? 'classic';
    const rowW = cw - PRESET_ROW_PAD_X * 2;
    let selectedRowY = 0;

    for (let i = 0; i < PRESETS_DATA.length; i++) {
      const p = PRESETS_DATA[i];
      const isSel = i === this.presetIndex;
      const isActive = p.name === cur;
      const rowY = PRESET_LIST_Y + i * (PRESET_ROW_H + 2);

      // Selection background — 선택 row 만 orange canonical (soft tier).
      if (isSel) {
        const rowBg = new Graphics();
        rowBg.x = PRESET_ROW_PAD_X;
        rowBg.y = rowY;
        drawSelectionRow(rowBg, rowW, PRESET_ROW_H, 'soft');
        panel.addChild(rowBg);
        selectedRowY = rowY;
      }

      // Chevron — 선택 row 에만 좌측 ▶
      const chevron = new BitmapText({
        text: isSel ? '▶' : ' ',
        style: { fontFamily: PIXEL_FONT, fontSize: 10, fill: COL_ACCENT },
      });
      chevron.x = PRESET_ROW_PAD_X + 4;
      chevron.y = rowY + 5;
      panel.addChild(chevron);

      // Label (CLASSIC / MODERN / WASD)
      const label = createUiText(t(p.labelKey), {
        fontFamily: PIXEL_FONT, fontSize: 10, fill: isSel ? COL_TEXT : COL_DIM,
      });
      label.x = PRESET_ROW_PAD_X + 18;
      label.y = rowY + 4;
      panel.addChild(label);

      // ACTIVE badge — 현재 적용된 preset 만 우측에 노란 라벨.
      if (isActive) {
        const badge = createUiText(t('ui.pause.active'), { fontSize: 8, fill: COL_WARNING });
        badge.x = PRESET_ROW_PAD_X + rowW - badge.width - 6;
        badge.y = rowY + 5;
        panel.addChild(badge);
      }

      // Description (한 줄 키 미리보기)
      const desc = createUiText(t(p.descKey), {
        fontFamily: PIXEL_FONT, fontSize: 8, fill: isSel ? COL_DIM : 0x666677,
      });
      desc.x = PRESET_ROW_PAD_X + 18;
      desc.y = rowY + 16;
      panel.addChild(desc);
    }

    // Bottom hint
    const hint = createUiText(t('ui.pause.preset_hint'), {
      fontFamily: PIXEL_FONT, fontSize: 8, fill: COL_DIM,
    });
    hint.x = Math.floor((cw - hint.width) / 2);
    hint.y = ch - 12;
    panel.addChild(hint);

    // Pulse halo on the selected row (last child so it overlays)
    this.presetPulseG = new Graphics();
    this.presetPulseG.x = PRESET_ROW_PAD_X;
    this.presetPulseG.y = selectedRowY;
    panel.addChild(this.presetPulseG);
    this.presetPulseRowY = selectedRowY;
    this.presetPulseTimer = 0;
    this.redrawPresetPulse();

    // 메뉴 row pulse 음소거 (confirm 처럼).
    if (this.selectionPulseG) this.selectionPulseG.alpha = 0.15;

    this.container.addChild(this.presetPanel);
  }

  private redrawPresetPulse(): void {
    if (!this.presetPulseG) return;
    const t = this.presetPulseTimer / 1000;
    const a = ROW_SELECTED_GLOW_ALPHA * (0.75 + 0.25 * Math.sin(t * Math.PI * 2 * 0.8));
    const rowW = PRESET_PANEL_W - PRESET_ROW_PAD_X * 2;
    this.presetPulseG.clear();
    drawSelectionPulse(this.presetPulseG, rowW, PRESET_ROW_H, a, 'soft');
  }

  // ── Audio settings ───────────────────────────────────────────────────────────

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
    if (this.settingsPanel) {
      this.container.removeChild(this.settingsPanel);
      this.settingsPanel.destroy({ children: true });
      this.settingsPanel = null;
    }
    this.settingsPulseG = null;
    if (this.selectionPulseG) this.selectionPulseG.alpha = 1;
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
    if (this.isAudioRow(row.id)) {
      this.toggleAudioMute(row.id);
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
    switch (row.id) {
      case 'language':
        this.settings.gameplay.language = cycle(['ko', 'en'] as const, this.settings.gameplay.language, dir);
        break;
      case 'scale':
        this.settings.display.scale = cycle(['auto', '1x', '2x', '3x'] as const, this.settings.display.scale, dir);
        break;
      case 'scale_filter':
        this.settings.display.scaleFilter = cycle(['sharp', 'smooth'] as const, this.settings.display.scaleFilter, dir);
        break;
      case 'shake':
        this.settings.display.shake = cycle(['off', 'low', 'full'] as const, this.settings.display.shake, dir);
        break;
      case 'show_fps':
        this.settings.display.showFps = !this.settings.display.showFps;
        break;
      case 'rumble':
        this.settings.controls.rumble = cycle(['off', 'low', 'full'] as const, this.settings.controls.rumble, dir);
        break;
      case 'window_mode':
        this.toggleWindowMode();
        return;
      default:
        if (this.isAudioRow(row.id)) this.adjustSettingsAudio(row.id, dir);
        else return;
    }
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
    if (this.settingsPanel) {
      this.container.removeChild(this.settingsPanel);
      this.settingsPanel.destroy({ children: true });
    }

    const cw = SETTINGS_PANEL_W;
    const ch = SETTINGS_PANEL_H;
    const cx = Math.floor((GAME_WIDTH - cw) / 2);
    const cy = Math.floor((GAME_HEIGHT - ch) / 2);
    const rows = this.settingsRows();

    this.settingsPanel = new Container();
    this.settingsPanel.x = cx;
    this.settingsPanel.y = cy;

    const { panel } = createModalPanel(this.skin, cw, ch);
    this.settingsPanel.addChild(panel);

    const title = createUiText(t('ui.settings.title'), { fontSize: 10, fill: COL_TEXT });
    title.x = Math.floor((cw - title.width) / 2);
    title.y = 8;
    panel.addChild(title);

    const divider = new Graphics();
    divider.moveTo(12, 24); divider.lineTo(cw - 12, 24);
    divider.stroke({ width: 1, color: COL_BORDER });
    panel.addChild(divider);

    const rowW = cw - SETTINGS_ROW_PAD_X * 2;
    let pulseY = SETTINGS_TAB_Y - 3;
    let pulseH = SETTINGS_ROW_H - 2;

    if (this.settingsIndex === 0) {
      const rowBg = new Graphics();
      rowBg.x = SETTINGS_ROW_PAD_X;
      rowBg.y = pulseY;
      drawSelectionRow(rowBg, rowW, pulseH, 'soft');
      panel.addChild(rowBg);
    }

    const tabGap = 6;
    const tabW = Math.floor((rowW - tabGap * (SETTINGS_TABS.length - 1)) / SETTINGS_TABS.length);
    for (let i = 0; i < SETTINGS_TABS.length; i++) {
      const tab = SETTINGS_TABS[i];
      const active = i === this.settingsTabIndex;
      const label = createUiText(t(tab.labelKey), { fontSize: 7, fill: active ? COL_ACCENT : COL_DIM });
      const tx = SETTINGS_ROW_PAD_X + i * (tabW + tabGap);
      label.x = tx + Math.floor((tabW - label.width) / 2);
      label.y = SETTINGS_TAB_Y + 2;
      panel.addChild(label);
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const isSel = this.settingsIndex === i + 1;
      const rowY = SETTINGS_LIST_Y + i * SETTINGS_ROW_H;
      if (isSel) {
        const rowBg = new Graphics();
        rowBg.x = SETTINGS_ROW_PAD_X;
        rowBg.y = rowY;
        drawSelectionRow(rowBg, rowW, SETTINGS_ROW_H - 2, 'soft');
        panel.addChild(rowBg);
        pulseY = rowY;
        pulseH = SETTINGS_ROW_H - 2;
      }

      const label = createUiText(t(row.labelKey), { fontSize: 8, fill: isSel ? COL_TEXT : COL_DIM });
      label.x = SETTINGS_ROW_PAD_X + 8;
      label.y = rowY + 4;
      panel.addChild(label);

      const valueText = this.settingsValue(row);
      if (valueText) {
        const value = createUiText(valueText, { fontSize: 8, fill: isSel ? COL_TEXT : COL_DIM });
        value.x = SETTINGS_ROW_PAD_X + rowW - value.width - 8;
        value.y = rowY + 4;
        panel.addChild(value);
      }
    }

    const hintKey = this.settingsIndex === 0 ? 'ui.settings.tab_hint' : 'ui.settings.hint';
    const hint = createUiText(t(hintKey), { fontSize: 7, fill: COL_DIM });
    hint.x = Math.floor((cw - hint.width) / 2);
    hint.y = ch - 14;
    panel.addChild(hint);

    this.settingsPulseG = new Graphics();
    this.settingsPulseG.x = SETTINGS_ROW_PAD_X;
    this.settingsPulseG.y = pulseY;
    this.settingsPulseRect = { w: rowW, h: pulseH };
    panel.addChild(this.settingsPulseG);
    this.settingsPulseTimer = 0;
    this.redrawSettingsPulse();

    if (this.selectionPulseG) this.selectionPulseG.alpha = 0.15;
    this.container.addChild(this.settingsPanel);
  }

  private redrawSettingsPulse(): void {
    if (!this.settingsPulseG) return;
    const tSec = this.settingsPulseTimer / 1000;
    const a = ROW_SELECTED_GLOW_ALPHA * (0.75 + 0.25 * Math.sin(tSec * Math.PI * 2 * 0.8));
    this.settingsPulseG.clear();
    drawSelectionPulse(this.settingsPulseG, this.settingsPulseRect.w, this.settingsPulseRect.h, a, 'soft');
  }

  private settingsValue(row: SettingsRow): string {
    switch (row.id) {
      case 'language':
        return t(this.settings.gameplay.language === 'ko' ? 'ui.settings.value.ko' : 'ui.settings.value.en');
      case 'window_mode':
        return t(isFullscreenActive() ? 'ui.settings.value.fullscreen' : 'ui.settings.value.windowed');
      case 'scale':
        return t(`ui.settings.value.${this.settings.display.scale}`);
      case 'scale_filter':
        return t(this.settings.display.scaleFilter === 'sharp' ? 'ui.settings.value.sharp' : 'ui.settings.value.smooth');
      case 'shake':
        return t(`ui.settings.value.${this.settings.display.shake}`);
      case 'show_fps':
        return t(this.settings.display.showFps ? 'ui.settings.value.on' : 'ui.settings.value.off');
      case 'keyboard_preset':
        return t(PRESETS_DATA.find(p => p.name === this.input?.currentPreset)?.labelKey ?? 'ui.pause.preset_modern_label');
      case 'rumble':
        return t(`ui.settings.value.${this.settings.controls.rumble}`);
      case 'back':
        return '';
      default:
        if (this.isAudioRow(row.id)) return this.audioSettingValue(row.id);
        return '';
    }
  }

  private isAudioRow(id: SettingsRowId): id is Extract<SettingsRowId, 'audio_master' | 'audio_bgm' | 'audio_ambient' | 'audio_sfx' | 'audio_voice'> {
    return id === 'audio_master' || id === 'audio_bgm' || id === 'audio_ambient' || id === 'audio_sfx' || id === 'audio_voice';
  }

  private audioSettingValue(id: Extract<SettingsRowId, 'audio_master' | 'audio_bgm' | 'audio_ambient' | 'audio_sfx' | 'audio_voice'>): string {
    const pct = Math.round(this.audioVolume(id) * 100);
    return this.audioMuted(id) ? `${pct} ${t('ui.settings.value.muted')}` : String(pct);
  }

  private audioVolume(id: Extract<SettingsRowId, 'audio_master' | 'audio_bgm' | 'audio_ambient' | 'audio_sfx' | 'audio_voice'>): number {
    switch (id) {
      case 'audio_master': return this.settings.audio.master;
      case 'audio_bgm': return this.settings.audio.bgm;
      case 'audio_ambient': return this.settings.audio.ambient;
      case 'audio_sfx': return this.settings.audio.sfx;
      case 'audio_voice': return this.settings.audio.voice;
    }
  }

  private audioMuted(id: Extract<SettingsRowId, 'audio_master' | 'audio_bgm' | 'audio_ambient' | 'audio_sfx' | 'audio_voice'>): boolean {
    switch (id) {
      case 'audio_master': return this.settings.audio.masterMuted;
      case 'audio_bgm': return this.settings.audio.bgmMuted;
      case 'audio_ambient': return this.settings.audio.ambientMuted;
      case 'audio_sfx': return this.settings.audio.sfxMuted;
      case 'audio_voice': return this.settings.audio.voiceMuted;
    }
  }

  private setAudioVolume(id: Extract<SettingsRowId, 'audio_master' | 'audio_bgm' | 'audio_ambient' | 'audio_sfx' | 'audio_voice'>, value: number): void {
    switch (id) {
      case 'audio_master': this.settings.audio.master = value; break;
      case 'audio_bgm': this.settings.audio.bgm = value; break;
      case 'audio_ambient': this.settings.audio.ambient = value; break;
      case 'audio_sfx': this.settings.audio.sfx = value; break;
      case 'audio_voice': this.settings.audio.voice = value; break;
    }
  }

  private toggleAudioMute(id: Extract<SettingsRowId, 'audio_master' | 'audio_bgm' | 'audio_ambient' | 'audio_sfx' | 'audio_voice'>): void {
    switch (id) {
      case 'audio_master': this.settings.audio.masterMuted = !this.settings.audio.masterMuted; break;
      case 'audio_bgm': this.settings.audio.bgmMuted = !this.settings.audio.bgmMuted; break;
      case 'audio_ambient': this.settings.audio.ambientMuted = !this.settings.audio.ambientMuted; break;
      case 'audio_sfx': this.settings.audio.sfxMuted = !this.settings.audio.sfxMuted; break;
      case 'audio_voice': this.settings.audio.voiceMuted = !this.settings.audio.voiceMuted; break;
    }
  }

  private adjustSettingsAudio(id: Extract<SettingsRowId, 'audio_master' | 'audio_bgm' | 'audio_ambient' | 'audio_sfx' | 'audio_voice'>, dir: number): void {
    const curPct = Math.round(this.audioVolume(id) * 100);
    const snapped = Math.round(curPct / 10) * 10;
    const nextPct = Math.max(0, Math.min(100, snapped + dir * 10));
    this.setAudioVolume(id, nextPct / 100);
  }

  private showAudioSettings(): void {
    this.audioActive = true;
    this.audioIndex = 0;
    this.drawAudioSettings();
  }

  private hideAudioSettings(): void {
    this.audioActive = false;
    if (this.audioPanel) {
      this.container.removeChild(this.audioPanel);
      this.audioPanel.destroy({ children: true });
      this.audioPanel = null;
    }
    this.audioPulseG = null;
    if (this.selectionPulseG) this.selectionPulseG.alpha = 1;
  }

  /** ◀▶ 로 선택 채널 볼륨을 10% 단위로 조정 — 즉시 적용 + 영속 저장. */
  private adjustAudio(dir: number): void {
    const row = AUDIO_ROWS[this.audioIndex];
    const curPct = Math.round(getRowVol(row) * 100);
    const snapped = Math.round(curPct / 10) * 10;
    const nextPct = Math.max(0, Math.min(100, snapped + dir * 10));
    setRowVol(row, nextPct / 100);
    saveAudio();
  }

  private drawAudioSettings(): void {
    if (this.audioPanel) {
      this.container.removeChild(this.audioPanel);
      this.audioPanel.destroy({ children: true });
    }

    const cw = AUDIO_PANEL_W;
    const ch = AUDIO_PANEL_H;
    const cx = Math.floor((GAME_WIDTH - cw) / 2);
    const cy = Math.floor((GAME_HEIGHT - ch) / 2);

    this.audioPanel = new Container();
    this.audioPanel.x = cx;
    this.audioPanel.y = cy;

    // 9-slice 패널 — Pause/Preset 와 동일 카논.
    const { panel } = createModalPanel(this.skin, cw, ch);
    this.audioPanel.addChild(panel);

    // Title
    const title = createUiText(t('ui.settings.audio.title'), { fontSize: 10, fill: COL_TEXT });
    title.x = Math.floor((cw - title.width) / 2);
    title.y = 8;
    panel.addChild(title);

    // Divider
    const divider = new Graphics();
    divider.moveTo(12, 22); divider.lineTo(cw - 12, 22);
    divider.stroke({ width: 1, color: COL_BORDER });
    panel.addChild(divider);

    const rowW = cw - AUDIO_ROW_PAD_X * 2;
    let selectedRowY = 0;

    for (let i = 0; i < AUDIO_ROWS.length; i++) {
      const row = AUDIO_ROWS[i];
      const isSel = i === this.audioIndex;
      const rowY = AUDIO_LIST_Y + i * AUDIO_ROW_H;

      // Selection background — 선택 row 만 orange canonical (soft tier).
      if (isSel) {
        const rowBg = new Graphics();
        rowBg.x = AUDIO_ROW_PAD_X;
        rowBg.y = rowY;
        drawSelectionRow(rowBg, rowW, AUDIO_ROW_H - 2, 'soft');
        panel.addChild(rowBg);
        selectedRowY = rowY;

        // ◀ ▶ chevrons — 선택 row 에만, 값 양옆에 조정 affordance.
        const chL = new BitmapText({
          text: '◀',
          style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: COL_ACCENT },
        });
        chL.x = AUDIO_ROW_PAD_X + rowW - 54;
        chL.y = rowY + 4;
        panel.addChild(chL);
        const chR = new BitmapText({
          text: '▶',
          style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: COL_ACCENT },
        });
        chR.x = AUDIO_ROW_PAD_X + rowW - 10;
        chR.y = rowY + 4;
        panel.addChild(chR);
      }

      // Label (left)
      const label = createUiText(t(row.labelKey), { fontSize: 8, fill: isSel ? COL_TEXT : COL_DIM });
      label.x = AUDIO_ROW_PAD_X + 6;
      label.y = rowY + 4;
      panel.addChild(label);

      // Value 0..100 (right, centered between chevrons)
      const pct = Math.round(getRowVol(row) * 100);
      const value = createUiText(String(pct), { fontSize: 8, fill: isSel ? COL_TEXT : COL_DIM });
      value.x = AUDIO_ROW_PAD_X + rowW - 32 - Math.floor(value.width / 2);
      value.y = rowY + 4;
      panel.addChild(value);
    }

    // Bottom hint (◀▶ ADJUST  ESC BACK)
    const hint = createUiText(t('ui.settings.audio.hint'), { fontSize: 8, fill: COL_DIM });
    hint.x = Math.floor((cw - hint.width) / 2);
    hint.y = ch - 14;
    panel.addChild(hint);

    // Pulse halo on the selected row (last child so it overlays)
    this.audioPulseG = new Graphics();
    this.audioPulseG.x = AUDIO_ROW_PAD_X;
    this.audioPulseG.y = selectedRowY;
    panel.addChild(this.audioPulseG);
    this.audioPulseTimer = 0;
    this.redrawAudioPulse();

    // 메뉴 row pulse 음소거 (confirm/preset 처럼).
    if (this.selectionPulseG) this.selectionPulseG.alpha = 0.15;

    this.container.addChild(this.audioPanel);
  }

  private redrawAudioPulse(): void {
    if (!this.audioPulseG) return;
    const t = this.audioPulseTimer / 1000;
    const a = ROW_SELECTED_GLOW_ALPHA * (0.75 + 0.25 * Math.sin(t * Math.PI * 2 * 0.8));
    const rowW = AUDIO_PANEL_W - AUDIO_ROW_PAD_X * 2;
    this.audioPulseG.clear();
    drawSelectionPulse(this.audioPulseG, rowW, AUDIO_ROW_H - 2, a, 'soft');
  }
}
