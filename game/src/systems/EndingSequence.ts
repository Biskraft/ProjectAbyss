/**
 * EndingSequence.ts
 *
 * Self-contained ending cinematic sequence extracted from LdtkWorldScene.
 * Phases: rumble -> fade -> title display -> key wait -> scene transition.
 */

import { Graphics, BitmapText, Text } from 'pixi.js';
import { PIXEL_FONT } from '@ui/fonts';
import { createUiText } from '@ui/factories';
import { t } from '@i18n';
import { GAME_WIDTH, GAME_HEIGHT } from '../Game';
import type { InputManager } from '@core/InputManager';
import type { Camera } from '@core/Camera';
import type { Container } from 'pixi.js';

export interface EndingTrigger {
  x: number;
  y: number;
  w: number;
  h: number;
}

type EndingPhase = 'idle' | 'rumble' | 'fade' | 'title' | 'done';

export class EndingSequence {
  private phase: EndingPhase = 'idle';
  private timer = 0;
  private overlay: Graphics | null = null;
  private titleText: BitmapText | Text | null = null;
  private tbcText: BitmapText | Text | null = null;
  private hintText: BitmapText | Text | null = null;

  /** True while ending sequence is running */
  get isActive(): boolean { return this.phase !== 'idle'; }
  /** True when the sequence has finished and scene should transition */
  get isDone(): boolean { return this._done; }
  private _done = false;

  private readonly uiContainer: Container;
  private readonly camera: Camera;
  private readonly input: InputManager;

  /** Fires once when an EndingTrigger first activates — host scene wires
   *  HUD/minimap hide here so the sequence stage is clean. */
  private readonly onStart?: () => void;

  constructor(deps: {
    uiContainer: Container;
    camera: Camera;
    input: InputManager;
    onStart?: () => void;
  }) {
    this.uiContainer = deps.uiContainer;
    this.camera = deps.camera;
    this.input = deps.input;
    this.onStart = deps.onStart;
  }

  /** Check if player overlaps any ending trigger */
  checkTrigger(
    playerCX: number, playerCY: number,
    triggers: EndingTrigger[],
  ): boolean {
    for (const t of triggers) {
      if (playerCX >= t.x && playerCX <= t.x + t.w &&
          playerCY >= t.y && playerCY <= t.y + t.h) {
        this.start();
        return true;
      }
    }
    return false;
  }

  private start(): void {
    this.phase = 'rumble';
    this.timer = 0;
    this.onStart?.();
  }

  update(dt: number): void {
    if (this.phase === 'idle') return;
    this.timer += dt;

    if (this.phase === 'rumble') {
      const intensity = Math.min(3, this.timer / 500);
      this.camera.shake(intensity * 0.3);

      if (this.timer >= 1000) {
        this.phase = 'fade';
        this.timer = 0;
        this.overlay = new Graphics();
        this.overlay.rect(0, 0, GAME_WIDTH, GAME_HEIGHT).fill(0x000000);
        this.overlay.alpha = 0;
        this.overlay.eventMode = 'none';
        this.uiContainer.addChild(this.overlay);
      }
    }

    else if (this.phase === 'fade') {
      const progress = Math.min(1, this.timer / 1500);
      if (this.overlay) this.overlay.alpha = progress;

      if (this.timer >= 1500) {
        this.phase = 'title';
        this.timer = 0;

        this.titleText = createUiText(t('ui.ending.echoris'), {
          fontFamily: PIXEL_FONT, fontSize: 24, fill: 0xdddddd,
        });
        this.titleText.anchor.set(0.5);
        this.titleText.x = GAME_WIDTH / 2;
        this.titleText.y = GAME_HEIGHT / 2 - 20;
        this.titleText.alpha = 0;
        this.uiContainer.addChild(this.titleText);

        this.tbcText = createUiText(t('ui.ending.to_be_continued'), {
          fontFamily: PIXEL_FONT, fontSize: 8, fill: 0x888888,
        });
        this.tbcText.anchor.set(0.5);
        this.tbcText.x = GAME_WIDTH / 2;
        this.tbcText.y = GAME_HEIGHT / 2 + 10;
        this.tbcText.alpha = 0;
        this.uiContainer.addChild(this.tbcText);
      }
    }

    else if (this.phase === 'title') {
      if (this.titleText) {
        this.titleText.alpha = Math.min(1, this.timer / 1500);
      }
      if (this.tbcText) {
        this.tbcText.alpha = Math.min(1, Math.max(0, (this.timer - 500) / 1500));
      }

      if (this.timer >= 2500 && !this.hintText) {
        this.hintText = createUiText(t('ui.ending.press_any'), {
          fontFamily: PIXEL_FONT, fontSize: 8, fill: 0x666666,
        });
        this.hintText.anchor.set(0.5);
        this.hintText.x = GAME_WIDTH / 2;
        this.hintText.y = GAME_HEIGHT / 2 + 35;
        this.uiContainer.addChild(this.hintText);
      }

      if (this.hintText) {
        this.hintText.alpha = 0.5 + Math.sin(this.timer / 400) * 0.5;
      }

      if (this.timer >= 2500 && this.input.anyKeyJustPressed()) {
        this.phase = 'done';
        this.timer = 0;
      }
    }

    else if (this.phase === 'done') {
      const progress = Math.min(1, this.timer / 3000);
      if (this.titleText) this.titleText.alpha = 1 - progress;
      if (this.hintText) this.hintText.alpha = (1 - progress) * 0.5;
      if (this.tbcText) this.tbcText.alpha = 1 - progress;

      if (this.timer >= 3000) {
        this.cleanup();
        this._done = true;
      }
    }
  }

  private cleanup(): void {
    if (this.overlay?.parent) this.overlay.parent.removeChild(this.overlay);
    if (this.titleText?.parent) this.titleText.parent.removeChild(this.titleText);
    if (this.hintText?.parent) this.hintText.parent.removeChild(this.hintText);
    if (this.tbcText?.parent) this.tbcText.parent.removeChild(this.tbcText);
    this.overlay = null;
    this.titleText = null;
    this.hintText = null;
    this.tbcText = null;
  }
}
