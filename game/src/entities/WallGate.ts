import { Container } from 'pixi.js';
import { destroyDisplayObject } from '../scenes/shared/DisplayObjectLifecycleHelpers';

/**
 * Invisible exit trigger at the far end of the deployment tunnel.
 * Visual is provided by ItemWorldLeakageLayer.
 * Width is one tile so players trigger entry only at the tunnel end.
 */
export class WallGate {
  readonly container: Container;

  private readonly triggerW = 16;
  private readonly h: number;

  constructor(worldX: number, worldY: number, h: number) {
    this.h = h;
    this.container = new Container();
    this.container.x = worldX;
    this.container.y = worldY;
  }

  /** No-op until 4-stage sprites land in M3 asset pass. */
  setStage(_s: 0 | 1 | 2 | 3): void {}

  /** World-space AABB for player-entry overlap. */
  getEntranceAABB(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.container.x - this.triggerW / 2,
      y: this.container.y - this.h,
      width: this.triggerW,
      height: this.h,
    };
  }

  destroy(): void {
    destroyDisplayObject(this.container, { children: true });
  }
}
