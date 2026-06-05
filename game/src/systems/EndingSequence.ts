/**
 * EndingSequence — simplified per user direction 2026-05-17.
 *
 *   T+0                  EndingTrigger 터치 — input.inputLocked = true.
 *                        World keeps running; only player control is frozen.
 *   T+0   ~ T+2000 ms    아무 연출 없음 — 환경만 계속 움직임 (Builder 등).
 *   T+2000 ~ T+3000 ms   검정 fade-in 0 → 1 (1 s linear).
 *   T+3000               isDone → host scene swaps to EndingScene.
 *
 * The host is responsible for releasing inputLocked + calling dispose() once
 * it routes into EndingScene.
 */

import { Graphics } from 'pixi.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../Game';
import type { InputManager } from '@core/InputManager';
import type { Camera } from '@core/Camera';
import type { Container } from 'pixi.js';
import { destroyDisplayObject } from '@scenes/shared/DisplayObjectLifecycleHelpers';

const FREEZE_END_MS = 2000;
const FADE_END_MS   = 3000;

export interface EndingTrigger { x: number; y: number; w: number; h: number; }

export class EndingSequence {
  private overlay: Graphics | null = null;
  private active = false;
  private _done = false;
  private timer = 0;

  private readonly uiContainer: Container;
  private readonly input: InputManager;
  private readonly onStart?: () => void;

  constructor(deps: {
    uiContainer: Container;
    camera: Camera;  // accepted for API parity; sequence is camera-quiet
    input: InputManager;
    onStart?: () => void;
  }) {
    this.uiContainer = deps.uiContainer;
    this.input = deps.input;
    this.onStart = deps.onStart;
    void deps.camera;
  }

  get isActive(): boolean { return this.active; }
  get isDone(): boolean { return this._done; }

  checkTrigger(playerCX: number, playerCY: number, triggers: EndingTrigger[]): boolean {
    for (const tr of triggers) {
      if (playerCX >= tr.x && playerCX <= tr.x + tr.w &&
          playerCY >= tr.y && playerCY <= tr.y + tr.h) {
        this.start();
        return true;
      }
    }
    return false;
  }

  private start(): void {
    if (this.active) return;
    this.active = true;
    this.timer = 0;
    this.input.inputLocked = true;
    this.onStart?.();
  }

  update(dt: number): void {
    if (!this.active || this._done) return;
    this.timer += dt;

    if (this.timer < FREEZE_END_MS) return;

    if (!this.overlay) {
      this.overlay = new Graphics();
      this.overlay.rect(0, 0, GAME_WIDTH, GAME_HEIGHT).fill(0x000000);
      this.overlay.alpha = 0;
      this.overlay.eventMode = 'none';
      this.uiContainer.addChild(this.overlay);
    }

    if (this.timer < FADE_END_MS) {
      const t = (this.timer - FREEZE_END_MS) / (FADE_END_MS - FREEZE_END_MS);
      this.overlay.alpha = t;
      return;
    }

    this.overlay.alpha = 1;
    this._done = true;
  }

  dispose(): void {
    if (this.overlay) destroyDisplayObject(this.overlay);
    this.overlay = null;
  }
}
