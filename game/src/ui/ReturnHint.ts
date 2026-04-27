/**
 * ReturnHint.ts
 *
 * Sacred Pickup T6 — 아이템계 최초 착지 시 좌상단에 표시되는
 * "[ESC] Return to Surface" HUD 힌트. 첫 입장에서는 아이콘이
 * 24×24로 1.5초 동안 12×12로 축소된 뒤 작은 상태로 상시 유지된다.
 * 2회차 이후는 축소 크기로 즉시 표시.
 */

import { Container } from 'pixi.js';
import { KeyPrompt } from './KeyPrompt';
import { sacredSave } from '@save/PlayerSave';
import { GameAction, actionKey } from '@core/InputManager';

// Visual scale references KeyPrompt's CONTEXT_KEY_SIZE (14) so size/14 = scale.
const KEY_BASE_SIZE = 14;
const START_SIZE = 24;
const FINAL_SIZE = 12;
const SHRINK_DURATION = 1500;
const HUD_X = 8;
const HUD_Y = 8;
const PROMPT_LABEL = 'Return to Surface';

export class ReturnHint {
  readonly container: Container;
  private shrinkTimer = 0;
  private shrinking = false;
  private currentSize = FINAL_SIZE;

  constructor() {
    this.container = new Container();
    this.container.visible = false;
    this.container.x = HUD_X;
    this.container.y = HUD_Y;
  }

  /**
   * 표시 시작. 첫 진입이면 큰 아이콘 → 축소 트윈, 이후는 작은 크기로 고정.
   * 첫 진입이었다면 sacredSave에 플래그를 남긴다.
   */
  show(): void {
    const firstTime = !sacredSave.isFirstReturnShown();
    this.container.visible = true;

    if (firstTime) {
      this.currentSize = START_SIZE;
      this.shrinking = true;
      this.shrinkTimer = 0;
      sacredSave.markFirstReturnShown();
    } else {
      this.currentSize = FINAL_SIZE;
      this.shrinking = false;
    }
    this.redraw();
  }

  /** Hide (scene teardown helper). */
  hide(): void {
    this.container.visible = false;
  }

  update(dt: number): void {
    if (!this.shrinking) return;
    this.shrinkTimer += dt;
    const t = Math.min(1, this.shrinkTimer / SHRINK_DURATION);
    const newSize = START_SIZE + (FINAL_SIZE - START_SIZE) * t;
    this.currentSize = newSize;
    this.redraw();
    if (t >= 1) {
      this.shrinking = false;
      this.currentSize = FINAL_SIZE;
      this.redraw();
    }
  }

  private redraw(): void {
    // Reset children.
    for (const child of [...this.container.children]) {
      this.container.removeChild(child);
      child.destroy?.({ children: true });
    }

    const scale = Math.max(0.1, this.currentSize / KEY_BASE_SIZE);
    const prompt = KeyPrompt.createPrompt(actionKey(GameAction.MENU), PROMPT_LABEL, scale);
    this.container.addChild(prompt);
  }

  destroy(): void {
    if (this.container.parent) this.container.parent.removeChild(this.container);
    this.container.destroy({ children: true });
  }
}
