import { EGO_SHARD_MAX, type Player } from '@entities/Player';
import type { ShardElement } from '@effects/EgoShard';
import type { EgoShardRuntime } from '@effects/EgoShardRuntime';

const TILE_SIZE = 16;

interface ItemWorldEgoShardProjectileRuntimeDeps {
  getPlayer: () => Player;
  getCollisionGrid: () => number[][];
  getEgoShardRuntime: () => EgoShardRuntime;
  onImpact: (x: number, y: number, element: ShardElement) => void;
  checkHit: (x: number, y: number, element: ShardElement) => boolean;
  flushContainerFluidChanges: () => void;
}

export class ItemWorldEgoShardProjectileRuntime {
  constructor(private readonly deps: ItemWorldEgoShardProjectileRuntimeDeps) {}

  update(dtMs: number): void {
    const egoShardRuntime = this.deps.getEgoShardRuntime();
    egoShardRuntime.update(
      dtMs,
      (info) => this.deps.onImpact(info.x, info.y, info.element),
      (x, y) => this.isSolidAt(x, y),
      (x, y, element) => this.deps.checkHit(x, y, element),
    );
    this.deps.flushContainerFluidChanges();
    this.retrieveNearPlayer();
  }

  private retrieveNearPlayer(): void {
    const player = this.deps.getPlayer();
    const pad = 24;
    const retrieved = this.deps.getEgoShardRuntime().retrieveInAABB(
      player.x - pad,
      player.y - pad,
      player.width + pad * 2,
      player.height + pad * 2,
    );
    for (let i = 0; i < retrieved; i++) {
      this.removeLongestRecoveryCooldown(player);
      player.egoShardCount = Math.min(player.egoShardCount + 1, EGO_SHARD_MAX);
    }
  }

  private removeLongestRecoveryCooldown(player: Player): void {
    const cooldowns = player.shardCooldowns;
    if (cooldowns.length === 0) return;

    let maxIdx = 0;
    for (let i = 1; i < cooldowns.length; i++) {
      if (cooldowns[i] > cooldowns[maxIdx]) maxIdx = i;
    }
    cooldowns.splice(maxIdx, 1);
  }

  private isSolidAt(x: number, y: number): boolean {
    const gx = Math.floor(x / TILE_SIZE);
    const gy = Math.floor(y / TILE_SIZE);
    const tile = this.deps.getCollisionGrid()[gy]?.[gx] ?? 0;
    return tile === 1 || tile === 7 || tile === 9 || tile === 12 || tile === 15;
  }
}
