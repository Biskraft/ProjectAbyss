import type { Game } from '../../Game';
import { aabbOverlap } from '@core/Physics';
import type { Player } from '@entities/Player';
import type { ScreenFlash } from '@effects/ScreenFlash';
import { t } from '@i18n';
import { getActivePlayerAttackHitbox } from '@systems/PlayerAttackHitbox';
import { trackGateBreak } from '@utils/Analytics';
import { rumbleGamepad } from '@utils/GamepadRumble';
import type { WorldDoorAttackState } from './WorldDoorAttackState';
import type { WorldDoorSwitchRegistry } from './WorldDoorSwitchRegistry';
import { applyGateUnlockFeedback, applySwitchActivationFeedback } from '@scenes/shared/StaticEntityFeedbackHelpers';

interface Aabb {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface WorldDoorSwitchInteractionRuntimeDeps {
  game: Game;
  getPlayer: () => Player;
  getCollisionGrid: () => number[][];
  getRegistry: () => WorldDoorSwitchRegistry;
  getAttackState: () => WorldDoorAttackState;
  getScreenFlash: () => ScreenFlash;
  getUnlockedEvents: () => Set<string>;
  getCurrentLevelId: () => string | undefined;
  refreshBuilderGrid: (grid: number[][]) => void;
  showToast: (message: string, color: number) => void;
}

export class WorldDoorSwitchInteractionRuntime {
  constructor(private readonly deps: WorldDoorSwitchInteractionRuntimeDeps) {}

  isAttackBlocked(entity: Aabb): boolean {
    const doors = this.deps.getRegistry().doors;
    if (doors.length === 0) return false;

    const player = this.deps.getPlayer();
    const px = player.x + player.width / 2;
    const py = player.y + player.height / 2;
    const ex = entity.x + entity.width / 2;
    const ey = entity.y + entity.height / 2;
    const xMin = Math.min(px, ex);
    const xMax = Math.max(px, ex);
    const yMin = Math.min(py, ey);
    const yMax = Math.max(py, ey);

    for (const door of doors) {
      if (!door.locked) continue;
      const aabb = door.getHitAABB();
      if (aabb.x + aabb.width < xMin || aabb.x > xMax) continue;
      if (aabb.y + aabb.height < yMin || aabb.y > yMax) continue;
      return true;
    }
    return false;
  }

  maintainCollisions(): void {
    for (const door of this.deps.getRegistry().doors) {
      if (!door.locked) continue;
      const grid = this.deps.getRegistry().getDoorCollisionGrid(door, this.deps.getCollisionGrid());
      if (door.ensureCollision(grid)) {
        this.deps.refreshBuilderGrid(grid);
      }
    }
  }

  resolvePlayerCollision(): void {
    const player = this.deps.getPlayer();
    for (const door of this.deps.getRegistry().doors) {
      if (!door.locked) continue;
      const aabb = door.getHitAABB();
      const px0 = player.x;
      const py0 = player.y;
      const px1 = px0 + player.width;
      const py1 = py0 + player.height;
      if (px1 <= aabb.x || px0 >= aabb.x + aabb.width || py1 <= aabb.y || py0 >= aabb.y + aabb.height) continue;

      const prevX0 = player.prevX;
      const prevY0 = player.prevY;
      const prevX1 = prevX0 + player.width;
      const prevY1 = prevY0 + player.height;

      let dx = 0;
      let dy = 0;
      if (prevX1 <= aabb.x) dx = aabb.x - px1;
      else if (prevX0 >= aabb.x + aabb.width) dx = aabb.x + aabb.width - px0;
      else if (prevY1 <= aabb.y) dy = aabb.y - py1;
      else if (prevY0 >= aabb.y + aabb.height) dy = aabb.y + aabb.height - py0;
      else {
        const pushLeft = aabb.x - px1;
        const pushRight = aabb.x + aabb.width - px0;
        const pushUp = aabb.y - py1;
        const pushDown = aabb.y + aabb.height - py0;
        const bestX = Math.abs(pushLeft) < Math.abs(pushRight) ? pushLeft : pushRight;
        const bestY = Math.abs(pushUp) < Math.abs(pushDown) ? pushUp : pushDown;
        if (Math.abs(bestX) < Math.abs(bestY)) dx = bestX;
        else dy = bestY;
      }

      if (dx !== 0) {
        player.x += dx;
        player.prevX += dx;
        player.vx = 0;
      }
      if (dy !== 0) {
        player.y += dy;
        player.prevY += dy;
        player.vy = 0;
        if (dy < 0) player.forceGrounded(false, 'locked-door');
      }
    }
  }

  updateDoors(dt: number): void {
    for (const door of this.deps.getRegistry().doors) {
      door.update(dt);
    }
  }

  unlockDoors(eventName: string): void {
    this.deps.getUnlockedEvents().add(eventName);
    for (const door of this.deps.getRegistry().doors) {
      if (door.unlockEvent !== eventName) continue;
      const grid = this.deps.getRegistry().getDoorCollisionGrid(door, this.deps.getCollisionGrid());
      door.unlock(grid);
      this.deps.refreshBuilderGrid(grid);
      trackGateBreak({
        gate_type: 'event',
        level_id: this.deps.getCurrentLevelId(),
      });
    }
  }

  unlockDoorByIid(iid: string): void {
    this.deps.getUnlockedEvents().add(iid);
    for (const door of this.deps.getRegistry().doors) {
      if (door.iid !== iid) continue;
      const grid = this.deps.getRegistry().getDoorCollisionGrid(door, this.deps.getCollisionGrid());
      door.unlock(grid);
      this.deps.refreshBuilderGrid(grid);
      trackGateBreak({
        gate_type: door.unlockCondition === 'switch' ? 'switch' : 'event',
        level_id: this.deps.getCurrentLevelId(),
      });
      applyGateUnlockFeedback({
        game: this.deps.game,
        screenFlash: this.deps.getScreenFlash(),
        onRumble: () => {
          rumbleGamepad(180, 0.6, 1.0);
        },
        showToast: () => {
          this.deps.showToast(t('toast.gate_opened'), 0x44ffaa);
        },
      });
      return;
    }
  }

  checkDoorAttack(): void {
    const player = this.deps.getPlayer();
    const attackState = this.deps.getAttackState();
    if (attackState.resetWhenAttackEnds(player.isAttackActive())) return;

    attackState.prepareCombo(player.comboIndex);

    const hitbox = getActivePlayerAttackHitbox(player);
    if (!hitbox) return;

    for (const door of this.deps.getRegistry().doors) {
      if (!door.locked) continue;
      if (attackState.hasRejected(door.iid)) continue;
      if (!aabbOverlap(hitbox, door.getHitAABB())) continue;

      const playerStats: Record<string, number> = {
        atk: player.atk,
        def: player.def,
      };
      const grid = this.deps.getRegistry().getDoorCollisionGrid(door, this.deps.getCollisionGrid());
      const result = door.tryAttackUnlock(playerStats, grid);

      if (result === 'unlocked') {
        this.deps.refreshBuilderGrid(grid);
        this.deps.getUnlockedEvents().add(door.iid);
        trackGateBreak({
          gate_type: 'stat',
          stat_type: door.statType,
          stat_threshold: door.statThreshold,
          level_id: this.deps.getCurrentLevelId(),
        });
        applyGateUnlockFeedback({
          game: this.deps.game,
          screenFlash: this.deps.getScreenFlash(),
          onRumble: () => {
            rumbleGamepad(180, 0.6, 1.0);
          },
          showToast: () => {
            this.deps.showToast(t('toast.gate_destroyed'), 0x44ffaa);
          },
        });
        continue;
      }

      if (result !== 'rejected') continue;
      attackState.markRejected(door.iid);
      this.deps.game.camera.shake(2);
      if (door.unlockCondition === 'stat') {
        const threshold = door.statThreshold;
        const current = playerStats[door.statType] ?? 0;
        const statKey = `stat.${door.statType.toLowerCase()}`;
        const statLabel = t(statKey);
        const statText = statLabel === statKey ? door.statType.toUpperCase() : statLabel;
        this.deps.showToast(
          t('toast.stat_gate_locked', { stat: statText, current, required: threshold }),
          0xff4444,
        );
      }
      break;
    }
  }

  checkSwitchAttack(): void {
    const hitbox = getActivePlayerAttackHitbox(this.deps.getPlayer());
    if (!hitbox) return;

    for (const sw of this.deps.getRegistry().switches) {
      if (sw.activated) continue;
      if (!aabbOverlap(hitbox, sw.getHitAABB())) continue;

      const grid = this.deps.getRegistry().getSwitchCollisionGrid(sw, this.deps.getCollisionGrid());
      if (!sw.activate(grid)) continue;
      this.deps.refreshBuilderGrid(grid);
      applySwitchActivationFeedback({
        game: this.deps.game,
        screenFlash: this.deps.getScreenFlash(),
      });
      this.unlockDoorByIid(sw.targetDoorIid);
      this.deps.showToast(t('toast.switch_destroyed'), 0x44ffaa);
    }
  }

}
