import { Graphics } from 'pixi.js';
import { GAME_HEIGHT, GAME_WIDTH, type Game } from '../Game';
import type { Player } from '@entities/Player';
import { destroyDisplayObject } from '@scenes/shared/DisplayObjectLifecycleHelpers';

export class OxygenOverlay {
  private vignette: Graphics | null = null;
  private bar: Graphics | null = null;

  constructor(private readonly game: Game) {}

  update(player: Player): void {
    const ratio = player.oxygenRatio;
    const visible = player.submerged && !player.abilities.waterBreathing && ratio < 1;

    if (!visible) {
      this.hide();
      return;
    }

    this.updateVignette(ratio);
    this.updateBar(ratio);
  }

  hide(): void {
    if (this.vignette) this.vignette.visible = false;
    if (this.bar) this.bar.visible = false;
  }

  destroy(): void {
    if (this.vignette) destroyDisplayObject(this.vignette);
    this.vignette = null;

    if (this.bar) destroyDisplayObject(this.bar);
    this.bar = null;
  }

  private updateVignette(ratio: number): void {
    const overlay = this.ensureVignette();
    overlay.clear();

    const color = ratio > 0.5 ? 0x1122aa : ratio > 0.25 ? 0x882244 : 0xaa2222;
    const intensity = (1 - ratio) * 0.5;
    const pulse = ratio < 0.5 ? Math.sin(Date.now() * (ratio < 0.15 ? 0.015 : 0.008)) * 0.1 : 0;
    const alpha = Math.min(0.6, intensity + pulse);

    overlay.rect(0, 0, GAME_WIDTH, GAME_HEIGHT).fill({ color, alpha });
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const r = GAME_WIDTH * 0.35 * (0.5 + ratio * 0.5);
    overlay.circle(cx, cy, r).cut();
    overlay.visible = true;
  }

  private updateBar(ratio: number): void {
    const bar = this.ensureBar();
    bar.clear();

    const barW = 60;
    const barH = 4;
    const bx = GAME_WIDTH / 2 - barW / 2;
    const by = GAME_HEIGHT - 20;
    bar.rect(bx, by, barW, barH).fill({ color: 0x111133, alpha: 0.7 });
    const fillColor = ratio > 0.5 ? 0x4488ff : ratio > 0.25 ? 0xff8844 : 0xff2222;
    bar.rect(bx, by, barW * ratio, barH).fill(fillColor);
    bar.rect(bx, by, barW, barH).stroke({ color: 0x446688, width: 0.5 });
    bar.visible = true;
  }

  private ensureVignette(): Graphics {
    if (!this.vignette) {
      this.vignette = new Graphics();
      this.vignette.eventMode = 'none';
      this.game.legacyUIContainer.addChild(this.vignette);
    }
    return this.vignette;
  }

  private ensureBar(): Graphics {
    if (!this.bar) {
      this.bar = new Graphics();
      this.bar.eventMode = 'none';
      this.game.legacyUIContainer.addChild(this.bar);
    }
    return this.bar;
  }
}
