import type { Player } from '@entities/Player';

const BUILDER_ONE_WAY_DROP_THROUGH_GRACE_MS = 260;

export class WorldBuilderPlayerStateRuntime {
  private onBuilder = false;
  private inBuilder = false;
  private carrierVelocityY = 0;
  private oneWayDropThroughGraceMs = 0;

  get isOnBuilder(): boolean {
    return this.onBuilder;
  }

  get isInBuilder(): boolean {
    return this.inBuilder;
  }

  get hasOneWayDropThroughGrace(): boolean {
    return this.oneWayDropThroughGraceMs > 0;
  }

  setCarrierVelocityY(velocityY: number): void {
    this.carrierVelocityY = velocityY;
  }

  clearCarrierVelocity(): void {
    this.carrierVelocityY = 0;
  }

  beginPlayerUpdate(player: Player): boolean {
    const wasOnBuilder = this.onBuilder;
    player.onCarrier = wasOnBuilder;
    player.carrierVelocityY = wasOnBuilder ? this.carrierVelocityY : 0;
    return wasOnBuilder;
  }

  setOnBuilder(player: Player, onBuilder: boolean): void {
    this.onBuilder = onBuilder;
    if (!this.onBuilder) player.carrierVelocityY = 0;
  }

  setInBuilder(inBuilder: boolean): void {
    this.inBuilder = inBuilder;
  }

  startDropThroughGrace(durationMs = BUILDER_ONE_WAY_DROP_THROUGH_GRACE_MS): void {
    this.oneWayDropThroughGraceMs = durationMs;
  }

  update(dtMs: number): void {
    if (this.oneWayDropThroughGraceMs > 0) {
      this.oneWayDropThroughGraceMs = Math.max(0, this.oneWayDropThroughGraceMs - dtMs);
    }
  }

  reset(): void {
    this.onBuilder = false;
    this.inBuilder = false;
    this.carrierVelocityY = 0;
    this.oneWayDropThroughGraceMs = 0;
  }
}
