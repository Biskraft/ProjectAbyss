import type { Container } from 'pixi.js';
import {
  CAST_CHARGE_MAX_MS,
  EgoShardManager,
  EgoShardPreview,
  getShardVelocity,
  type ShardElement,
  type ShardImpactInfo,
} from '@effects/EgoShard';

type ShardUpdateParams = Parameters<EgoShardManager['update']>;
type PreviewShowParams = Parameters<EgoShardPreview['show']>;

/**
 * Shared Ego Shard subsystem façade: owns the shard manager, the aim preview,
 * and the cast-charge timer. Used by both the world scene and the item-world
 * scene so charge/manager/preview state lives in one place instead of being
 * duplicated per scene.
 */
export class EgoShardRuntime {
  private shardManager: EgoShardManager | null = null;
  private shardPreview: EgoShardPreview | null = null;
  private castChargeMs = 0;

  get hasCharge(): boolean {
    return this.castChargeMs > 0;
  }

  /** The underlying manager, for callers that still operate on it directly. */
  get managerInstance(): EgoShardManager {
    return this.requireManager();
  }

  /** The underlying aim preview, for callers that still operate on it directly. */
  get previewInstance(): EgoShardPreview {
    return this.requirePreview();
  }

  initialize(entityLayer: Container): void {
    this.shardManager = new EgoShardManager(entityLayer);
    this.shardPreview = new EgoShardPreview(entityLayer);
  }

  resetCharge(): void {
    this.castChargeMs = 0;
  }

  advanceCharge(dtMs: number): number {
    this.castChargeMs = Math.min(this.castChargeMs + dtMs, CAST_CHARGE_MAX_MS);
    return this.castChargeMs;
  }

  getChargedVelocity(facing: -1 | 1): { vx: number; vy: number } {
    return getShardVelocity(this.castChargeMs, facing);
  }

  spawn(x: number, y: number, vx: number, vy: number, element: ShardElement): void {
    this.requireManager().spawn(x, y, vx, vy, element);
  }

  update(
    dtMs: number,
    onImpact: (info: ShardImpactInfo) => void,
    isSolidAt: ShardUpdateParams[2],
    checkEnemyHit?: ShardUpdateParams[3],
  ): void {
    this.requireManager().update(dtMs, onImpact, isSolidAt, checkEnemyHit);
  }

  retrieveInAABB(ax: number, ay: number, aw: number, ah: number, maxRetrieve?: number): number {
    return this.requireManager().retrieveInAABB(ax, ay, aw, ah, maxRetrieve);
  }

  removeOldestShard(): boolean {
    return this.requireManager().removeOldestShard();
  }

  showPreview(...args: PreviewShowParams): void {
    this.requirePreview().show(...args);
  }

  hidePreview(): void {
    this.shardPreview?.hide();
  }

  clear(): void {
    this.shardManager?.clear();
    this.shardPreview?.hide();
    this.resetCharge();
  }

  private requireManager(): EgoShardManager {
    if (!this.shardManager) throw new Error('EgoShardRuntime.manager used before initialize()');
    return this.shardManager;
  }

  private requirePreview(): EgoShardPreview {
    if (!this.shardPreview) throw new Error('EgoShardRuntime.preview used before initialize()');
    return this.shardPreview;
  }
}
