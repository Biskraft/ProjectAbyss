/**
 * Spike.ts — Environmental hazard that damages the player on contact.
 *
 * On touch:
 *  - Deal 20% of max HP as damage
 *  - Teleport player to last safe ground position
 *  - Camera shake + screen flash + hitstop
 *  - 500ms invincibility (standard i-frames)
 *
 * LDtk entity: Spike (resizable, pivot bottom-left)
 */

import { Container, Graphics } from 'pixi.js';

const TILE_SIZE = 16;
const SPIKE_COLOR = 0x884444;
const SPIKE_TIP_COLOR = 0xcc6666;

export class Spike {
  container: Container;
  x: number;
  y: number;
  width: number;
  height: number;

  private gfx: Graphics;

  constructor(x: number, y: number, width: number, height: number) {
    // Pivot bottom-left
    this.x = x;
    this.y = y - height;
    this.width = width;
    this.height = height;

    this.container = new Container();
    this.container.x = this.x;
    this.container.y = this.y;

    this.gfx = new Graphics();
    this.drawSpikes();
    this.container.addChild(this.gfx);
  }

  private drawSpikes(): void {
    this.gfx.clear();
    // Base
    this.gfx.rect(0, this.height - 4, this.width, 4)
      .fill({ color: SPIKE_COLOR, alpha: 0.8 });

    // Triangle spikes
    const spikeW = 8;
    const spikeH = this.height;
    const count = Math.floor(this.width / spikeW);
    for (let i = 0; i < count; i++) {
      const sx = i * spikeW + spikeW / 2;
      this.gfx.moveTo(sx - spikeW / 2, this.height)
        .lineTo(sx, 0)
        .lineTo(sx + spikeW / 2, this.height)
        .closePath()
        .fill({ color: SPIKE_COLOR, alpha: 0.9 });
      // Tip highlight
      this.gfx.moveTo(sx - 2, spikeH * 0.3)
        .lineTo(sx, 0)
        .lineTo(sx + 2, spikeH * 0.3)
        .closePath()
        .fill({ color: SPIKE_TIP_COLOR, alpha: 0.8 });
    }
  }

  getAABB(): { x: number; y: number; width: number; height: number } {
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }

  destroy(): void {
    if (this.container.parent) {
      this.container.parent.removeChild(this.container);
    }
  }
}
