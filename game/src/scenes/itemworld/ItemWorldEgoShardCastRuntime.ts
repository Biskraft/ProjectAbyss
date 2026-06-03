import { GameAction } from '@core/InputManager';
import { EGO_SHARD_MAX, SHARD_RECOVERY_MS, type Player } from '@entities/Player';
import { CAST_MIN_GAP_MS } from '@effects/EgoShard';
import type { EgoShardRuntime } from '@effects/EgoShardRuntime';
import type { Game } from '../../Game';

const TILE_SIZE = 16;

interface ItemWorldEgoShardCastRuntimeDeps {
  game: Game;
  getPlayer: () => Player;
  getCollisionGrid: () => number[][];
  getEgoShardRuntime: () => EgoShardRuntime;
  hasHeldContainer: () => boolean;
}

export class ItemWorldEgoShardCastRuntime {
  constructor(private readonly deps: ItemWorldEgoShardCastRuntimeDeps) {}

  update(dtMs: number): void {
    const player = this.deps.getPlayer();
    const egoShardRuntime = this.deps.getEgoShardRuntime();
    const shardAbilityOn = new URLSearchParams(window.location.search).has('debug');

    if (!shardAbilityOn) {
      egoShardRuntime.resetCharge();
      egoShardRuntime.hidePreview();
      player.isAiming = false;
    }

    const hasHeldContainer = this.deps.hasHeldContainer();
    const castDown = shardAbilityOn && !hasHeldContainer && this.deps.game.input.isDown(GameAction.CAST);
    const canCast = shardAbilityOn
      && !hasHeldContainer
      && player.egoCastCooldownMs <= 0
      && player.egoShardCount > 0;
    const facing: -1 | 1 = player.facingRight ? 1 : -1;
    const launchX = player.x + player.width / 2 + facing * 14;
    const launchY = player.y + player.height * 0.38 - 5;

    if (castDown && canCast) {
      egoShardRuntime.advanceCharge(dtMs);
      player.isAiming = true;
      const { vx, vy } = egoShardRuntime.getChargedVelocity(facing);
      egoShardRuntime.showPreview(
        launchX,
        launchY,
        vx,
        vy,
        player.activeEnchant,
        (x, y) => this.isSolidAt(x, y),
      );
    } else if (!castDown && egoShardRuntime.hasCharge) {
      if (canCast) {
        const { vx, vy } = egoShardRuntime.getChargedVelocity(facing);
        egoShardRuntime.spawn(launchX, launchY, vx, vy, player.activeEnchant);
        player.egoShardCount--;
        player.shardCooldowns.push(SHARD_RECOVERY_MS);
        player.egoCastCooldownMs = CAST_MIN_GAP_MS;
      }
      egoShardRuntime.resetCharge();
      egoShardRuntime.hidePreview();
      player.isAiming = false;
    } else {
      egoShardRuntime.hidePreview();
      player.isAiming = false;
    }

    this.tickCooldowns(dtMs, player, egoShardRuntime);
  }

  reset(): void {
    const egoShardRuntime = this.deps.getEgoShardRuntime();
    egoShardRuntime.resetCharge();
    egoShardRuntime.hidePreview();
    this.deps.getPlayer().isAiming = false;
  }

  private tickCooldowns(dtMs: number, player: Player, egoShardRuntime: EgoShardRuntime): void {
    if (player.egoCastCooldownMs > 0) {
      player.egoCastCooldownMs = Math.max(0, player.egoCastCooldownMs - dtMs);
    }

    const cooldowns = player.shardCooldowns;
    for (let i = cooldowns.length - 1; i >= 0; i--) {
      cooldowns[i] -= dtMs;
      if (cooldowns[i] <= 0) {
        cooldowns.splice(i, 1);
        player.egoShardCount = Math.min(player.egoShardCount + 1, EGO_SHARD_MAX);
        egoShardRuntime.removeOldestShard();
      }
    }
  }

  private isSolidAt(x: number, y: number): boolean {
    const gx = Math.floor(x / TILE_SIZE);
    const gy = Math.floor(y / TILE_SIZE);
    const tile = this.deps.getCollisionGrid()[gy]?.[gx] ?? 0;
    return tile === 1 || tile === 7 || tile === 9 || tile === 12 || tile === 15;
  }
}
