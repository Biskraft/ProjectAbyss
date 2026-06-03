import type { Container } from 'pixi.js';
import { ItemPickupGlowManager } from '@effects/ItemPickupGlow';
import { RelicAuraBurstManager } from '@effects/RelicAuraBurst';

export class WorldPickupVfxRuntime {
  private itemPickupGlow: ItemPickupGlowManager | null = null;
  private relicAuraBurst: RelicAuraBurstManager | null = null;

  get itemGlow(): ItemPickupGlowManager {
    if (!this.itemPickupGlow) throw new Error('WorldPickupVfxRuntime.itemGlow used before initialize()');
    return this.itemPickupGlow;
  }

  get relicAura(): RelicAuraBurstManager {
    if (!this.relicAuraBurst) throw new Error('WorldPickupVfxRuntime.relicAura used before initialize()');
    return this.relicAuraBurst;
  }

  initialize(entityLayer: Container): void {
    this.itemPickupGlow = new ItemPickupGlowManager(entityLayer);
    this.relicAuraBurst = new RelicAuraBurstManager(entityLayer);
  }

  clear(): void {
    this.itemPickupGlow?.clear();
    this.relicAuraBurst?.clear();
  }

  update(dt: number): void {
    this.itemPickupGlow?.update(dt);
    this.relicAuraBurst?.update(dt);
  }
}
