interface ItemWorldFrameEffectsRuntimeDeps {
  updateMovementVfx: (dt: number) => void;
  updateContainerPhysics: (dt: number) => void;
  updateEgoShardProjectile: (dt: number) => void;
  updateWaterBubbles: (dt: number) => void;
  updateDropThroughDust: (dt: number) => void;
  updateIceSkidStreak: (dt: number) => void;
  updateItemPickupGlow: (dt: number) => void;
  updateLowHpVignette: (dt: number, hpRatio: number) => void;
  getPlayerHpRatio: () => number;
}

export class ItemWorldFrameEffectsRuntime {
  constructor(private readonly deps: ItemWorldFrameEffectsRuntimeDeps) {}

  update(dt: number): void {
    this.deps.updateMovementVfx(dt);
    this.deps.updateContainerPhysics(dt);
    this.deps.updateEgoShardProjectile(dt);
    this.deps.updateWaterBubbles(dt);
    this.deps.updateDropThroughDust(dt);
    this.deps.updateIceSkidStreak(dt);
    this.deps.updateItemPickupGlow(dt);
    this.deps.updateLowHpVignette(dt, this.deps.getPlayerHpRatio());
  }
}
