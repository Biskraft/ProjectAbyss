/**
 * TitleScene.ts — Title screen with control preset selection.
 *
 * Flow:
 *   1. Logo fade-in (1s)
 *   2. If saved preset exists → skip to step 3 after "PRESS ANY KEY"
 *      If no saved preset → show preset selection cards
 *   3. Fade-out (0.5s) → game start
 */

import { Text, TextStyle, Sprite, Assets, Container, Graphics } from 'pixi.js';
import { Scene } from '@core/Scene';
import { PIXEL_FONT } from '@ui/fonts';
import { GAME_WIDTH, GAME_HEIGHT } from '../Game';
import { LdtkWorldScene } from './LdtkWorldScene';
import type { Game } from '../Game';
import { assetPath } from '@core/AssetLoader';
import { PRESET_INFOS, PRESET_NAMES, type PresetName, GameAction, actionKey } from '@core/InputManager';
import { drawSelectionRow, drawSelectionPulse, ROW_SELECTED_GLOW_ALPHA } from '@ui/ModalPanel';
import { getInputDevice } from '@core/input/InputDeviceTracker';
import { GP } from '@core/input/gamepadStandard';

const LOGO_PATH = assetPath('assets/ui/title_logo.png');

// Presentation palette
const COL_VOID = 0x0a0a0a;
const COL_ACCENT = 0xe87830;
const COL_TEAL = 0x4a8a8a;
const COL_WHITE = 0xf0f0f0;
const COL_DIM = 0x3a3a48;

const FADE_OUT_MS = 500;
export const TITLE_FADE_OVERLAY_LABEL = '__title_fade_overlay__';

type TitlePhase = 'logo' | 'presskey' | 'presets' | 'confirm' | 'fadeout';

export class TitleScene extends Scene {
  private phase: TitlePhase = 'logo';
  private transitioning = false;
  private elapsed = 0;
  private uiRoot!: Container;
  private fadeOverlay!: Graphics;
  private fadeTimer = 0;

  // Logo elements
  private hintText!: Text;
  private pulseGfx!: Graphics;
  private accentLine!: Graphics;
  /** "Gamepad Recommended" / "🎮 Gamepad Detected" 자막 — 50% alpha base. */
  private gamepadHint!: Text;
  /** gamepadconnected 후 자막 fade-swap 잔여 시간 (ms). 0 이면 base 상태. */
  private gamepadHintSwapMs = 0;

  // Preset selection
  private presetContainer!: Container;
  private presetIndex = 0;
  private presetCards: Container[] = [];
  private presetSelectHint!: Text;
  /** "🎮 Gamepad detected — Press [Menu] to skip" 힌트. presets phase 에서 패드 감지 시 visible. */
  private presetsPadHint!: Text;
  private presetsPadHintBg!: Graphics;

  // Confirm modal
  private confirmModal!: Container;

  constructor(game: Game) {
    super(game);
  }

  /** gamepadconnected → 자막 1.5s fade swap ("🎮 Gamepad Detected"). */
  private _onGamepadConnect = (): void => {
    if (this.gamepadHint) {
      this.gamepadHint.text = '🎮 Gamepad Detected';
    }
    this.gamepadHintSwapMs = 1500;
  };

  async init(): Promise<void> {
    const s = this.game.uiScale;
    const sw = GAME_WIDTH * s;
    const sh = GAME_HEIGHT * s;
    const cx = sw / 2;
    const cy = sh / 2;

    this.uiRoot = new Container();
    this.game.uiContainer.addChild(this.uiRoot);

    // Background
    const bg = new Graphics();
    bg.rect(0, 0, sw, sh).fill(COL_VOID);
    this.uiRoot.addChild(bg);

    // Grid lines
    const gridGfx = new Graphics();
    for (let ly = 0; ly < sh; ly += 80 * s) {
      gridGfx.rect(0, ly, sw, s).fill({ color: 0x1a3a3a, alpha: 0.15 });
    }
    this.uiRoot.addChild(gridGfx);

    // Pulse glow
    this.pulseGfx = new Graphics();
    this.uiRoot.addChild(this.pulseGfx);

    // Logo
    let logoLoaded = false;
    try {
      const tex = await Assets.load(LOGO_PATH);
      if (tex && tex.width > 1) {
        const logo = new Sprite(tex);
        logo.anchor.set(0.5);
        logo.scale.set(s);
        logo.x = cx;
        logo.y = cy - 50 * s;
        this.uiRoot.addChild(logo);
        logoLoaded = true;
      }
    } catch { /* no logo */ }

    if (!logoLoaded) {
      const titleText = new Text({
        text: 'ECHORIS',
        style: new TextStyle({
          fontFamily: '"Cinzel", serif',
          fontSize: 48 * s,
          fontWeight: '900',
          fill: COL_WHITE,
          letterSpacing: 12 * s,
        }),
      });
      titleText.anchor.set(0.5);
      titleText.x = cx;
      titleText.y = cy - 55 * s;
      this.uiRoot.addChild(titleText);
    }

    // Accent line
    this.accentLine = new Graphics();
    this.accentLine.rect(cx - 80 * s, cy - 25 * s, 160 * s, s).fill({ color: COL_ACCENT, alpha: 0.7 });
    this.uiRoot.addChild(this.accentLine);

    // Subtitle
    const subtitle = new Text({
      text: 'A WORLD INSIDE EVERY BLADE',
      style: new TextStyle({
        fontFamily: '"Rajdhani", sans-serif',
        fontSize: 9 * s,
        fontWeight: '600',
        fill: COL_TEAL,
        letterSpacing: 3 * s,
      }),
    });
    subtitle.anchor.set(0.5);
    subtitle.x = cx;
    subtitle.y = cy - 10 * s;
    this.uiRoot.addChild(subtitle);

    // "Press Any Key or Button to Continue" hint + 키보드/패드 글리프
    // (System_Input_Gamepad §8.1 Stage 1 — 키↔패드 동시 표기)
    this.hintText = new Text({
      text: 'Press Any Key or Button to Continue',
      style: new TextStyle({
        fontFamily: '"Rajdhani", sans-serif',
        fontSize: 9 * s,
        fontWeight: '700',
        fill: COL_DIM,
        letterSpacing: 2 * s,
      }),
    });
    this.hintText.anchor.set(0.5);
    this.hintText.x = cx;
    this.hintText.y = cy + 50 * s;
    this.hintText.visible = false;
    this.uiRoot.addChild(this.hintText);

    // 자막 "🎮 Gamepad Recommended" — hint 아래, 50% alpha base.
    // gamepadconnected 시 "🎮 Gamepad Detected" 로 1.5s fade swap.
    // Pixi Text (canvas) 사용 — emoji 렌더 위해 BitmapText 회피.
    this.gamepadHint = new Text({
      text: '🎮 Gamepad Recommended',
      style: new TextStyle({
        fontFamily: '"Rajdhani", sans-serif',
        fontSize: 8 * s,
        fontWeight: '500',
        fill: COL_DIM,
        letterSpacing: 1.5 * s,
      }),
    });
    this.gamepadHint.anchor.set(0.5);
    this.gamepadHint.x = cx;
    this.gamepadHint.y = cy + 66 * s;
    this.gamepadHint.alpha = 0.5;
    this.gamepadHint.visible = false;
    this.uiRoot.addChild(this.gamepadHint);

    // gamepadconnected 발생 시 자막 fade swap (Stage 1 spec).
    window.addEventListener('gamepadconnected', this._onGamepadConnect);

    // ── Preset selection container (hidden initially) ──
    this.presetContainer = new Container();
    this.presetContainer.visible = false;
    this.uiRoot.addChild(this.presetContainer);

    // "SELECT CONTROLS" label
    const selectLabel = new Text({
      text: 'SELECT CONTROLS',
      style: new TextStyle({
        fontFamily: '"Rajdhani", sans-serif',
        fontSize: 8 * s,
        fontWeight: '600',
        fill: COL_DIM,
        letterSpacing: 2 * s,
      }),
    });
    selectLabel.anchor.set(0.5);
    selectLabel.x = cx;
    selectLabel.y = cy + 10 * s;
    this.presetContainer.addChild(selectLabel);

    // Preset cards (3 horizontal)
    const cardW = 100 * s;
    const cardH = 80 * s;
    const cardGap = 10 * s;
    const totalW = PRESET_INFOS.length * cardW + (PRESET_INFOS.length - 1) * cardGap;
    const startX = cx - totalW / 2;

    for (let i = 0; i < PRESET_INFOS.length; i++) {
      const info = PRESET_INFOS[i];
      const card = new Container();
      card.x = startX + i * (cardW + cardGap);
      card.y = cy + 22 * s;

      // Card background (drawn in updatePresetCards)
      const cardBg = new Graphics();
      cardBg.label = 'bg';
      card.addChild(cardBg);

      // Pulse overlay (animated each frame in update() for selected card only)
      const cardPulse = new Graphics();
      cardPulse.label = 'pulse';
      card.addChild(cardPulse);

      // Preset label
      const label = new Text({
        text: info.label,
        style: new TextStyle({
          fontFamily: '"Rajdhani", sans-serif',
          fontSize: 11 * s,
          fontWeight: '700',
          fill: COL_WHITE,
          letterSpacing: 1 * s,
        }),
      });
      label.anchor.set(0.5, 0);
      label.x = cardW / 2;
      label.y = 6 * s;
      card.addChild(label);

      // Key bindings (4 rows)
      const rows = [
        { key: info.move, action: 'Move' },
        { key: info.jump, action: 'Jump' },
        { key: info.dash, action: 'Dash' },
        { key: info.attack, action: 'Attack' },
      ];
      for (let r = 0; r < rows.length; r++) {
        const row = rows[r];
        const ry = (22 + r * 13) * s;

        // Key box
        const keyBox = new Graphics();
        keyBox.roundRect(10 * s, ry, 24 * s, 11 * s, 2 * s)
          .fill({ color: 0x1a1a1a, alpha: 0.85 });
        keyBox.roundRect(10 * s, ry, 24 * s, 11 * s, 2 * s)
          .stroke({ color: 0x666666, width: s });
        card.addChild(keyBox);

        const keyText = new Text({
          text: row.key,
          style: new TextStyle({
            fontFamily: '"Rajdhani", sans-serif',
            fontSize: 7 * s,
            fontWeight: '700',
            fill: 0xcccccc,
          }),
        });
        keyText.x = 22 * s - keyText.width / 2;
        keyText.y = ry + 1 * s;
        card.addChild(keyText);

        const actionText = new Text({
          text: row.action,
          style: new TextStyle({
            fontFamily: '"Rajdhani", sans-serif',
            fontSize: 7 * s,
            fontWeight: '500',
            fill: 0x888888,
          }),
        });
        actionText.x = 40 * s;
        actionText.y = ry + 1 * s;
        card.addChild(actionText);
      }

      this.presetCards.push(card);
      this.presetContainer.addChild(card);
    }

    // Bottom hint for preset selection
    this.presetSelectHint = new Text({
      text: '[←→] Select    [Enter] Confirm',
      style: new TextStyle({
        fontFamily: '"Rajdhani", sans-serif',
        fontSize: 7 * s,
        fontWeight: '500',
        fill: COL_DIM,
        letterSpacing: 1 * s,
      }),
    });
    this.presetSelectHint.anchor.set(0.5);
    this.presetSelectHint.x = cx;
    this.presetSelectHint.y = cy + 108 * s;
    this.presetContainer.addChild(this.presetSelectHint);

    // Pad-detected skip hint — kb 로 cards 진입 후 패드 잡으면 visible.
    // 명확히 보이도록 강한 알파(1.0) + accent color + bg pill.
    const PAD_HINT_W = 340 * s;
    const PAD_HINT_H = 22 * s;
    const padHintY = cy + 122 * s;
    this.presetsPadHintBg = new Graphics();
    this.presetsPadHintBg.roundRect(-PAD_HINT_W / 2, 0, PAD_HINT_W, PAD_HINT_H, 4 * s)
      .fill({ color: 0x1a3a3a, alpha: 0.85 })
      .stroke({ color: COL_ACCENT, width: s, alpha: 0.9 });
    this.presetsPadHintBg.x = cx;
    this.presetsPadHintBg.y = padHintY;
    this.presetsPadHintBg.visible = false;
    this.presetContainer.addChild(this.presetsPadHintBg);
    this.presetsPadHint = new Text({
      text: '🎮 [A] Select keyboard    [B] Skip',
      style: new TextStyle({
        fontFamily: '"Rajdhani", sans-serif',
        fontSize: 10 * s,
        fontWeight: '700',
        fill: COL_ACCENT,
        letterSpacing: 1.5 * s,
      }),
    });
    this.presetsPadHint.anchor.set(0.5);
    this.presetsPadHint.x = cx;
    this.presetsPadHint.y = padHintY + PAD_HINT_H / 2;
    this.presetsPadHint.visible = false;
    this.presetContainer.addChild(this.presetsPadHint);

    // ── Confirm modal (hidden initially) ──
    this.confirmModal = new Container();
    this.confirmModal.visible = false;
    this.uiRoot.addChild(this.confirmModal);

    // Dim overlay behind modal
    const confirmOverlay = new Graphics();
    confirmOverlay.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.5 });
    this.confirmModal.addChild(confirmOverlay);

    // Modal panel (will be redrawn in showConfirmModal)
    const modalBg = new Graphics();
    modalBg.label = 'modal-bg';
    this.confirmModal.addChild(modalBg);

    // Modal texts (created as placeholders, updated in showConfirmModal)
    // Modal texts — using ui-components.html tokens only:
    // FONT_TITLE=12px, FONT_BODY=10px, FONT_HINT=8px
    // TEXT_PRIMARY=#ffffff, TEXT_SECONDARY=#aaaaaa, TEXT_ACCENT=#00ced1
    const modalTitle = new Text({
      text: '',
      style: new TextStyle({ fontFamily: '"Rajdhani", sans-serif', fontSize: 12 * s, fontWeight: '700', fill: COL_WHITE, letterSpacing: 2 * s }),
    });
    modalTitle.label = 'modal-title';
    modalTitle.anchor.set(0.5, 0);
    this.confirmModal.addChild(modalTitle);

    const modalKeys = new Text({
      text: '',
      style: new TextStyle({ fontFamily: '"Rajdhani", sans-serif', fontSize: 10 * s, fontWeight: '500', fill: 0xaaaaaa }),
    });
    modalKeys.label = 'modal-keys';
    modalKeys.anchor.set(0.5, 0);
    this.confirmModal.addChild(modalKeys);

    const modalHint = new Text({
      text: `[Enter] Start    [${actionKey(GameAction.MENU)}] Back`,
      style: new TextStyle({ fontFamily: '"Rajdhani", sans-serif', fontSize: 8 * s, fontWeight: '500', fill: 0x00ced1, letterSpacing: 1 * s }),
    });
    modalHint.label = 'modal-hint';
    modalHint.anchor.set(0.5, 0);
    this.confirmModal.addChild(modalHint);

    // Fade overlay
    this.fadeOverlay = new Graphics();
    this.fadeOverlay.rect(0, 0, sw, sh).fill(COL_VOID);
    this.fadeOverlay.alpha = 0;
    this.fadeOverlay.label = TITLE_FADE_OVERLAY_LABEL;
    this.game.uiContainer.addChild(this.fadeOverlay);

    // Set initial preset index to current
    const curIdx = PRESET_NAMES.indexOf(this.game.input.currentPreset);
    this.presetIndex = curIdx >= 0 ? curIdx : 0;
  }

  enter(): void {
    if (this.uiRoot) this.uiRoot.visible = true;
    this.game.camera.snap(GAME_WIDTH / 2, GAME_HEIGHT / 2);
    this.game.camera.target = { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 };
  }

  update(dt: number): void {
    this.elapsed += dt;
    const s = this.game.uiScale;
    const cx = (GAME_WIDTH / 2) * s;
    const cy = (GAME_HEIGHT / 2) * s;
    const input = this.game.input;

    // Pulse glow
    if (this.pulseGfx) {
      this.pulseGfx.clear();
      const pulse = 0.3 + Math.sin(this.elapsed / 3000 * Math.PI * 2) * 0.15;
      const radius = (120 + Math.sin(this.elapsed / 3000 * Math.PI * 2) * 15) * s;
      this.pulseGfx.circle(cx, cy - 40 * s, radius).fill({ color: COL_ACCENT, alpha: pulse * 0.08 });
      this.pulseGfx.circle(cx, cy - 40 * s, radius * 0.6).fill({ color: COL_ACCENT, alpha: pulse * 0.12 });
    }

    // Accent line pulse
    if (this.accentLine) {
      this.accentLine.alpha = 0.5 + Math.sin(this.elapsed / 2000 * Math.PI * 2) * 0.3;
    }

    switch (this.phase) {
      case 'logo':
        // 1초 페이드 후 press-any-key 프롬프트 + 자막 표시. 입력 대기.
        // 키보드 키 OR 패드 버튼 (setVirtualAction 으로 keyState 진입) 모두 anyKeyJustPressed 가 검출.
        if (this.elapsed >= 1000) {
          this.hintText.visible = true;
          this.gamepadHint.visible = true;
          // hint blink
          this.hintText.alpha = 0.3 + Math.sin(this.elapsed / 500) * 0.4;
          // 자막 alpha — base 0.5, swap 후 1.5s 동안 1.0 → 0.5 fade.
          if (this.gamepadHintSwapMs > 0) {
            this.gamepadHintSwapMs = Math.max(0, this.gamepadHintSwapMs - dt);
            const t = 1 - this.gamepadHintSwapMs / 1500; // 0 → 1
            this.gamepadHint.alpha = 1 - 0.5 * t; // 1.0 → 0.5
          } else {
            this.gamepadHint.alpha = 0.5;
          }
          // Shift+P → 저장된 preset 강제 reset 후 cards 진입 (재선택 통로).
          if (input.shiftDown && input.isRawKeyJustPressed('KeyP')) {
            localStorage.removeItem('echoris-keybindings');
            this.hintText.visible = false;
            this.gamepadHint.visible = false;
            this.phase = 'presets';
            this.presetContainer.visible = true;
            const savedIdx = PRESET_NAMES.indexOf(input.currentPreset);
            if (savedIdx >= 0) this.presetIndex = savedIdx;
            this.updatePresetCards();
            break;
          }
          // 입력 시 분기 (Shift 단독 입력 무시).
          //   - 패드로 입력 → fadeout (키보드 layout 무관).
          //   - 키보드 + 저장된 preset → fadeout (재선택 안 함).
          //   - 키보드 + 저장 없음 → presets phase (cards 표시).
          // Shift+P 로만 재선택 가능 — 사용자 결정 2026-05-04.
          if (input.anyKeyJustPressed()
            && !input.isRawKeyJustPressed('ShiftLeft')
            && !input.isRawKeyJustPressed('ShiftRight')) {
            this.hintText.visible = false;
            this.gamepadHint.visible = false;
            if (getInputDevice() === 'gamepad' || input.hasSavedPreset()) {
              this.startFadeOut();
            } else {
              this.phase = 'presets';
              this.presetContainer.visible = true;
              const savedIdx = PRESET_NAMES.indexOf(input.currentPreset);
              if (savedIdx >= 0) this.presetIndex = savedIdx;
              this.updatePresetCards();
            }
          }
        }
        break;

      case 'presskey':
        // Blink hint
        this.hintText.alpha = 0.3 + Math.sin(this.elapsed / 500) * 0.4;
        // Shift+P: reset saved preset → go to preset selection
        if (input.shiftDown && input.isRawKeyJustPressed('KeyP')) {
          localStorage.removeItem('echoris-keybindings');
          this.phase = 'presets';
          this.hintText.visible = false;
          this.presetContainer.visible = true;
          this.updatePresetCards();
          break;
        }
        // Skip Shift-only press (modifier keys shouldn't trigger "any key")
        if (input.anyKeyJustPressed() && !input.isRawKeyJustPressed('ShiftLeft') && !input.isRawKeyJustPressed('ShiftRight')) {
          this.startFadeOut();
        }
        break;

      case 'presets':
        // 패드 감지 시 명시적 hint 표시 — A=Select / B=Skip.
        //   A (FACE_DOWN) = 표준 "확인" — confirm modal 진입 (kb Enter 와 동일 경로)
        //   B (FACE_RIGHT) = 표준 "취소/뒤" — kb layout 선택 건너뛰고 바로 fadeout
        // "Menu" 버튼은 처음 쓰는 사람이 모를 수 있어 face button 채택.
        {
          const padActive = getInputDevice() === 'gamepad';
          this.presetsPadHint.visible = padActive;
          this.presetsPadHintBg.visible = padActive;
          if (padActive) {
            // B = skip
            if (this.game.gamepad.isButtonJustPressed(GP.FACE_RIGHT)) {
              input.applyPreset(PRESET_NAMES[this.presetIndex]);
              this.startFadeOut();
              break;
            }
            // A = confirm modal (아래 confirm 분기에서 isJustPressed(JUMP) 로 흡수됨).
          }
        }
        // Navigate presets — kb raw 또는 패드 GameAction (LS/DPad → MOVE_LEFT/RIGHT).
        if (input.isRawKeyJustPressed('ArrowLeft') || input.isRawKeyJustPressed('KeyA')
          || input.isJustPressed(GameAction.MOVE_LEFT)) {
          this.presetIndex = (this.presetIndex + PRESET_NAMES.length - 1) % PRESET_NAMES.length;
          this.updatePresetCards();
        }
        if (input.isRawKeyJustPressed('ArrowRight') || input.isRawKeyJustPressed('KeyD')
          || input.isJustPressed(GameAction.MOVE_RIGHT)) {
          this.presetIndex = (this.presetIndex + 1) % PRESET_NAMES.length;
          this.updatePresetCards();
        }
        this.updatePresetPulse();
        // Confirm — kb 또는 패드 A (= JUMP 매핑).
        if (input.isRawKeyJustPressed('Enter')
          || input.isRawKeyJustPressed('KeyC')
          || input.isRawKeyJustPressed('KeyZ')
          || input.isRawKeyJustPressed('Space')
          || input.isRawKeyJustPressed('KeyJ')
          || input.isJustPressed(GameAction.JUMP)) {
          this.showConfirmModal();
        }
        break;

      case 'confirm':
        // Confirm — kb Enter/C/Z/Space/J 또는 패드 A (= JUMP).
        if (input.isRawKeyJustPressed('Enter')
          || input.isRawKeyJustPressed('KeyC')
          || input.isRawKeyJustPressed('KeyZ')
          || input.isRawKeyJustPressed('Space')
          || input.isRawKeyJustPressed('KeyJ')
          || input.isJustPressed(GameAction.JUMP)) {
          input.applyPreset(PRESET_NAMES[this.presetIndex]);
          this.confirmModal.visible = false;
          this.startFadeOut();
        }
        // Cancel/back — kb Esc 또는 패드 B (FACE_RIGHT, 표준 "뒤로/취소").
        if (input.isRawKeyJustPressed('Escape') || this.game.gamepad.isButtonJustPressed(GP.FACE_RIGHT)) {
          this.confirmModal.visible = false;
          this.phase = 'presets';
        }
        break;

      case 'fadeout':
        this.fadeTimer += dt;
        const t = Math.min(1, this.fadeTimer / FADE_OUT_MS);
        this.fadeOverlay.alpha = t;
        if (t >= 1) {
          this.game.sceneManager.replace(new LdtkWorldScene(this.game));
        }
        break;
    }
  }

  private showConfirmModal(): void {
    this.phase = 'confirm';
    this.confirmModal.visible = true;

    const s = this.game.uiScale;
    const sw = GAME_WIDTH * s;
    const sh = GAME_HEIGHT * s;
    const cx = sw / 2;
    const cy = sh / 2;
    const info = PRESET_INFOS[this.presetIndex];

    const mw = 260 * s;
    const mh = 90 * s;
    const mx = cx - mw / 2;
    const my = cy - mh / 2 + 10 * s;

    // Modal background
    const bg = this.confirmModal.getChildByLabel('modal-bg') as Graphics;
    if (bg) {
      bg.clear();
      // MODAL_BG=#1a1a2e, MODAL_BORDER=#4a4a6a (ui-components.html tokens)
      bg.roundRect(mx, my, mw, mh, 3 * s).fill({ color: 0x1a1a2e, alpha: 0.95 });
      bg.roundRect(mx, my, mw, mh, 3 * s).stroke({ color: 0x4a4a6a, width: s });
    }

    // Title
    const title = this.confirmModal.getChildByLabel('modal-title') as Text;
    if (title) {
      title.text = info.label;
      title.x = cx;
      title.y = my + 8 * s;
    }

    // Key summary — 2줄로 분리하여 박스 안에 맞춤
    const keys = this.confirmModal.getChildByLabel('modal-keys') as Text;
    if (keys) {
      keys.text = `${info.move}=Move   ${info.jump}=Jump   ${info.dash}=Dash   ${info.attack}=Attack`;
      keys.x = cx;
      keys.y = my + 30 * s;
      // wordWrap으로 박스 초과 방지
      keys.style.wordWrap = true;
      keys.style.wordWrapWidth = (mw - 20 * s);
      keys.style.align = 'center';
    }

    // Hint
    const hint = this.confirmModal.getChildByLabel('modal-hint') as Text;
    if (hint) {
      hint.text = `[Enter] Start    [${actionKey(GameAction.MENU)}] Back`;
      hint.x = cx;
      hint.y = my + 62 * s;
    }
  }

  private startFadeOut(): void {
    this.phase = 'fadeout';
    this.fadeTimer = 0;
    this.hintText.visible = false;
    this.presetContainer.visible = false;
  }

  private updatePresetCards(): void {
    const s = this.game.uiScale;
    const cardW = 100 * s;
    const cardH = 80 * s;

    for (let i = 0; i < this.presetCards.length; i++) {
      const card = this.presetCards[i];
      const isSelected = i === this.presetIndex;

      // Find and redraw background — selected uses canonical 4-layer base.
      // SSoT: docs/ui-components.html#selection-state. Pulse layer is
      // animated per-frame in update() below.
      const bg = card.getChildByLabel('bg') as Graphics | null;
      if (bg) {
        bg.clear();
        if (isSelected) {
          drawSelectionRow(bg, cardW, cardH, 'soft');
        } else {
          bg.roundRect(0, 0, cardW, cardH, 3 * s)
            .fill({ color: 0x000000, alpha: 0 });
          bg.roundRect(0, 0, cardW, cardH, 3 * s)
            .stroke({ color: 0x2a2a3e, width: s });
        }
      }

      // Clear pulse overlay on non-selected cards
      const pulse = card.getChildByLabel('pulse') as Graphics | null;
      if (pulse && !isSelected) pulse.clear();

      // Adjust label brightness — children: [bg, pulse, label, ...]
      const label = card.children[2] as Text | undefined;
      if (label && label instanceof Text) {
        label.style.fill = isSelected ? COL_WHITE : COL_DIM;
      }
    }
  }

  /** Per-frame pulse update for the selected preset card halo. */
  private updatePresetPulse(): void {
    const s = this.game.uiScale;
    const cardW = 100 * s;
    const cardH = 80 * s;
    const t = this.elapsed / 1000;
    // Soft tier: slow 0.8 Hz breathing, 0.50..1.00 of base alpha
    const a = ROW_SELECTED_GLOW_ALPHA * (0.75 + 0.25 * Math.sin(t * Math.PI * 2 * 0.8));
    const card = this.presetCards[this.presetIndex];
    if (!card) return;
    const pulse = card.getChildByLabel('pulse') as Graphics | null;
    if (!pulse) return;
    pulse.clear();
    drawSelectionPulse(pulse, cardW, cardH, a, 'soft');
  }

  render(_alpha: number): void {}

  exit(): void {
    window.removeEventListener('gamepadconnected', this._onGamepadConnect);
    if (this.uiRoot) {
      if (this.uiRoot.parent) this.uiRoot.parent.removeChild(this.uiRoot);
      this.uiRoot.destroy({ children: true });
    }
  }
}
