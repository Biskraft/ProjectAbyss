import { ColorMatrixFilter, type Container } from 'pixi.js';
import type { Player } from '@entities/Player';
import { RGBSplitFilter } from '@effects/RGBSplitFilter';

export class WorldFrozenSnapshotRuntime {
  private snapshotContainer: Container | null = null;
  private rgbFilter: RGBSplitFilter | null = null;
  private grayFilter: ColorMatrixFilter | null = null;

  get snapshot(): Container | null {
    return this.snapshotContainer;
  }

  createFromPlayer(player: Player, targetLayer: Container): boolean {
    if (this.snapshotContainer) return false;

    const snap = player.getFreezeSnapshot();
    snap.x = player.container.x;
    snap.y = player.container.y;

    const rgb = new RGBSplitFilter();
    const gray = new ColorMatrixFilter();
    snap.filters = [rgb, gray];

    this.rgbFilter = rgb;
    this.grayFilter = gray;
    this.snapshotContainer = snap;
    targetLayer.addChild(snap);
    return true;
  }

  update(player: Player | null | undefined): void {
    const snapshot = this.snapshotContainer;
    if (!snapshot || !player) return;

    const dx = player.container.x - snapshot.x;
    const dy = player.container.y - snapshot.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    this.rgbFilter?.setOffset(Math.min(12, dist * 0.06));

    if (this.grayFilter) {
      const t = Math.min(1, Math.max(0, (dist - 128) / 200));
      const l = 0.2126;
      const m = 0.7152;
      const s = 0.0722;
      this.grayFilter.matrix = [
        1 - (1 - l) * t, m * t, s * t, 0, 0,
        l * t, 1 - (1 - m) * t, s * t, 0, 0,
        l * t, m * t, 1 - (1 - s) * t, 0, 0,
        0, 0, 0, 1, 0,
      ];
    }
  }

  destroySnapshot(): void {
    if (this.snapshotContainer) {
      this.snapshotContainer.parent?.removeChild(this.snapshotContainer);
      this.snapshotContainer.destroy({ children: true });
      this.snapshotContainer = null;
    }
    this.rgbFilter = null;
    this.grayFilter = null;
  }
}
