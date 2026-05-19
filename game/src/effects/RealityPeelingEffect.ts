import type { Container } from 'pixi.js';

interface LayerSnapshot {
  layer: Container;
  alpha: number;
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
}

export class RealityPeelingEffect {
  private snapshots: LayerSnapshot[] = [];
  private readonly groups: Array<Container[]>;

  constructor(groups: Array<Array<Container | null | undefined>>) {
    this.groups = groups.map((group) => group.filter((layer): layer is Container => !!layer));
  }

  start(): void {
    this.snapshots = [];
    for (const group of this.groups) {
      for (const layer of group) {
      this.snapshots.push({
        layer,
        alpha: layer.alpha,
        x: layer.x,
        y: layer.y,
        scaleX: layer.scale.x,
        scaleY: layer.scale.y,
      });
      }
    }
  }

  update(t: number): void {
    const p = Math.max(0, Math.min(1, t));
    for (let groupIndex = 0; groupIndex < this.groups.length; groupIndex++) {
      const start = groupIndex / this.groups.length;
      const end = (groupIndex + 1) / this.groups.length;
      const local = Math.max(0, Math.min(1, (p - start) / (end - start)));
      const eased = local * local * (3 - 2 * local);
      const drift = groupIndex === 0 ? 8 : groupIndex === 1 ? 4 : 0;
      const scaleAdd = groupIndex === this.groups.length - 1 ? 0.01 : 0;

      for (const layer of this.groups[groupIndex]) {
        const snap = this.findSnapshot(layer);
        if (!snap) continue;
        layer.alpha = snap.alpha * (1 - eased);
        layer.y = snap.y + drift * eased;
        const scale = 1 + scaleAdd * eased;
        layer.scale.set(snap.scaleX * scale, snap.scaleY * scale);
      }
    }
  }

  reset(): void {
    for (const snapshot of this.snapshots) {
      snapshot.layer.alpha = snapshot.alpha;
      snapshot.layer.x = snapshot.x;
      snapshot.layer.y = snapshot.y;
      snapshot.layer.scale.set(snapshot.scaleX, snapshot.scaleY);
    }
    this.snapshots = [];
  }

  private findSnapshot(layer: Container | null): LayerSnapshot | undefined {
    if (!layer) return undefined;
    return this.snapshots.find((snapshot) => snapshot.layer === layer);
  }
}
