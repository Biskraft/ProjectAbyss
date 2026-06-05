import { Container, Sprite } from 'pixi.js';
import { getDistanceSquared } from '@scenes/shared/DistanceHelpers';

interface EntryCorridorTileVisual {
  node: Container;
  cx: number;
  cy: number;
  reveal: number;
  target: boolean;
}

interface ItemWorldEntryCorridorRevealRuntimeOptions {
  tileSize: number;
  revealRadiusPx: number;
  revealMs: number;
}

export class ItemWorldEntryCorridorRevealRuntime {
  private tiles: EntryCorridorTileVisual[] = [];

  constructor(private readonly options: ItemWorldEntryCorridorRevealRuntimeOptions) {}

  get hasTiles(): boolean {
    return this.tiles.length > 0;
  }

  clear(): void {
    this.tiles = [];
  }

  registerRenderedTileNode(node: Container): void {
    if (node instanceof Sprite) {
      node.tint = 0x000000;
      node.alpha = 1;
    }

    const half = this.options.tileSize / 2;
    const cx = node.x + half;
    const cy = node.y + half;
    node.pivot.set(half, half);
    node.position.set(cx, cy);
    node.scale.set(0);
    this.tiles.push({ node, cx, cy, reveal: 0, target: false });
  }

  registerCenteredTileNode(node: Container, cx: number, cy: number): void {
    node.scale.set(0);
    this.tiles.push({ node, cx, cy, reveal: 0, target: false });
  }

  update(dt: number, playerCenterX: number, playerCenterY: number): void {
    const radiusSq = this.options.revealRadiusPx * this.options.revealRadiusPx;
    const step = this.options.revealMs <= 0 ? 1 : dt / this.options.revealMs;

    for (const tile of this.tiles) {
      if (!tile.target) {
        if (getDistanceSquared(tile.cx, tile.cy, playerCenterX, playerCenterY) <= radiusSq) tile.target = true;
      }
      if (!tile.target || tile.reveal >= 1) continue;
      tile.reveal = Math.min(1, tile.reveal + step);
      const eased = 1 - Math.pow(1 - tile.reveal, 3);
      tile.node.scale.set(eased);
    }
  }
}
