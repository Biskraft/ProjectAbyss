/**
 * ReturnHint.ts
 *
 * Sacred Pickup T6 — 아이템계 최초 착지 시 좌상단에 표시되는
 * "[ESC] Return to Surface" HUD 힌트. 첫 입장에서는 아이콘이
 * 24×24로 1.5초 동안 12×12로 축소된 뒤 작은 상태로 상시 유지된다.
 * 2회차 이후는 축소 크기로 즉시 표시.
 */

import { Container, Graphics, BitmapText } from 'pixi.js';
import { PIXEL_FONT } from './fonts';
import { KeyPrompt } from './KeyPrompt';
import { sacredSave } from '@save/PlayerSave';

const START_SIZE = 24;
const FINAL_SIZE = 12;
const SHRINK_DURATION = 1500;
const HUD_X = 8;
const HUD_Y = 8;

export class ReturnHint {
  readonly container: Container;
  private iconContainer: Container | null = null;
  private label: BitmapText | null = null;
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
    this.iconContainer = null;
    this.label = null;

    const size = Math.max(1, Math.round(this.currentSize));
    // Dark background panel for legibility.
    const bg = new Graphics();
    const labelText = 'Return to Surface';
    const fontSize = 8;
    const label = new BitmapText({
      text: labelText,
      style: { fontFamily: PIXEL_FONT, fontSize, fill: 0xffffff },
    });
    const padding = 3;
    const gap = 3;
    const panelW = size + gap + label.width + padding * 2;
    const panelH = Math.max(size, label.height) + padding * 2;
    bg.roundRect(0, 0, panelW, panelH, 2).fill({ color: 0x000000, alpha: 0.55 });
    this.container.addChild(bg);

    const icon = KeyPrompt.createKeyIcon('ESC', size);
    icon.x = padding;
    icon.y = Math.floor((panelH - size) / 2);
    this.iconContainer = icon;
    this.container.addChild(icon);

    label.x = padding + size + gap;
    label.y = Math.floor((panelH - label.height) / 2);
    this.label = label;
    this.container.addChild(label);
  }

  destroy(): void {
    if (this.container.parent) this.container.parent.removeChild(this.container);
    this.container.destroy({ children: true });
  }
}
