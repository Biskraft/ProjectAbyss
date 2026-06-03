import type { Player } from '@entities/Player';
import type { Enemy } from '@entities/Enemy';
import { ThrowableContainer } from '@entities/ThrowableContainer';
import type { TileMutator } from '@systems/TileMutator';
import type { DamageNumberManager } from '@ui/DamageNumber';
import type { HitSparkManager } from '@effects/HitSpark';

interface ItemWorldContainerPhysicsRuntimeDeps {
  getPlayer: () => Player;
  getEnemies: () => Enemy<string>[];
  getContainers: () => ThrowableContainer[];
  getFullGrid: () => number[][];
  getTileMutator: () => TileMutator;
  getDamageNumbers: () => DamageNumberManager;
  getHitSparks: () => HitSparkManager;
  paintContainerImpact: (kind: ThrowableContainer['kind'], gx: number, gy: number, volume: number) => void;
  applyContainerEffectToFluid: (container: ThrowableContainer) => void;
  destroyContainerWithVFX: (container: ThrowableContainer) => void;
  flushContainerFluidChanges: () => void;
}

export class ItemWorldContainerPhysicsRuntime {
  constructor(private readonly deps: ItemWorldContainerPhysicsRuntimeDeps) {}

  update(dtMs: number): void {
    this.updateContainerBodies(dtMs);
    this.checkThrownContainerEnemyHit();
    this.resolveEnemyContainerOverlaps();
    this.resolvePlayerContainerOverlaps();
    this.deps.flushContainerFluidChanges();
  }

  private updateContainerBodies(dtMs: number): void {
    const containers = this.deps.getContainers();
    for (let i = containers.length - 1; i >= 0; i--) {
      const container = containers[i];
      const envImpact = container.tickEnvironment(dtMs, this.createEnvironment());
      if (envImpact) {
        if (this.containerOverlapsFluid(container)) {
          this.deps.paintContainerImpact(container.kind, envImpact.gx, envImpact.gy, container.fluidVolume);
        }
        this.deps.applyContainerEffectToFluid(container);
        this.deps.destroyContainerWithVFX(container);
        containers.splice(i, 1);
        continue;
      }

      const impact = container.update(
        dtMs,
        (gx, gy) => this.isContainerSolidCellFor(container, gx, gy),
        containers,
        (gx, gy) => this.isContainerFluidCell(gx, gy),
      );
      if (impact) {
        this.deps.paintContainerImpact(container.kind, impact.gx, impact.gy, container.fluidVolume);
        this.deps.destroyContainerWithVFX(container);
        containers.splice(i, 1);
        continue;
      }
      this.deps.applyContainerEffectToFluid(container);
    }
  }

  private resolveEnemyContainerOverlaps(): void {
    const containers = this.deps.getContainers();
    for (const enemy of this.deps.getEnemies()) {
      if (!enemy.alive) continue;
      for (const container of containers) {
        if (container.destroyed || container.held) continue;
        const cx0 = container.colX;
        const cy0 = container.colY;
        const cx1 = container.colX + container.colW;
        const cy1 = container.colY + container.colH;
        const ex0 = enemy.x;
        const ey0 = enemy.y;
        const ex1 = enemy.x + enemy.width;
        const ey1 = enemy.y + enemy.height;
        if (ex1 <= cx0 || ex0 >= cx1 || ey1 <= cy0 || ey0 >= cy1) continue;

        const oL = ex1 - cx0;
        const oR = cx1 - ex0;
        const oT = ey1 - cy0;
        const oB = cy1 - ey0;
        const minE = Math.min(oL, oR, oT, oB);
        if (minE === oT) {
          enemy.y = cy0 - enemy.height;
          if (enemy.vy > 0) enemy.vy = 0;
        } else if (minE === oB) {
          container.y -= oB;
          if (container.vy > 0) container.vy = 0;
          container.container.x = container.x;
          container.container.y = container.y;
          if (enemy.vy < 0) enemy.vy = 0;
        } else if (minE === oL) {
          enemy.x = cx0 - enemy.width;
          if (enemy.vx > 0) enemy.vx = 0;
        } else if (minE === oR) {
          enemy.x = cx1;
          if (enemy.vx < 0) enemy.vx = 0;
        }
      }
    }
  }

  private resolvePlayerContainerOverlaps(): void {
    const player = this.deps.getPlayer();
    for (const container of this.deps.getContainers()) {
      if (container.destroyed || container.held) continue;
      const cx0 = container.colX;
      const cy0 = container.colY;
      const cx1 = container.colX + container.colW;
      const cy1 = container.colY + container.colH;
      const px0 = player.x;
      const py0 = player.y;
      const px1 = player.x + player.width;
      const py1 = player.y + player.height;
      if (px1 <= cx0 || px0 >= cx1 || py1 <= cy0 || py0 >= cy1) continue;

      const overlapLeft = px1 - cx0;
      const overlapRight = cx1 - px0;
      const overlapTop = py1 - cy0;
      const overlapBottom = cy1 - py0;
      const min = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
      if (min === overlapTop) {
        player.y = cy0 - player.height;
        if (player.getVy() > 0) player.vy = 0;
        player.forceGrounded(true, 'container');
      } else if (min === overlapBottom) {
        container.y -= overlapBottom;
        if (container.vy > 0) container.vy = 0;
        container.container.x = container.x;
        container.container.y = container.y;
        if (player.getVy() < 0) player.vy = 0;
      } else if (min === overlapLeft) {
        if (Math.abs(player.getVx()) > 20) {
          const newX = container.x + Math.max(0, overlapLeft - 1);
          if (this.canContainerOccupyX(container, newX)) {
            container.x = newX;
            container.container.x = container.x;
          }
        }
        player.x = cx0 - player.width;
      } else if (min === overlapRight) {
        if (Math.abs(player.getVx()) > 20) {
          const newX = container.x - Math.max(0, overlapRight - 1);
          if (this.canContainerOccupyX(container, newX)) {
            container.x = newX;
            container.container.x = container.x;
          }
        }
        player.x = cx1;
      }
    }
  }

  private checkThrownContainerEnemyHit(): void {
    const containers = this.deps.getContainers();
    for (let i = containers.length - 1; i >= 0; i--) {
      const container = containers[i];
      if (container.destroyed || container.held) continue;
      if (!container.wasThrown || container.hasDealtImpact) continue;
      if (Math.abs(container.vx) < 60 && container.vy < 80) continue;

      const ax = container.colX;
      const ay = container.colY;
      const aw = container.colW;
      const ah = container.colH;
      for (const enemy of this.deps.getEnemies()) {
        if (!enemy.alive) continue;
        if (ax + aw <= enemy.x || ax >= enemy.x + enemy.width) continue;
        if (ay + ah <= enemy.y || ay >= enemy.y + enemy.height) continue;

        const baseDmg = Math.max(2, Math.floor(this.deps.getPlayer().atk));
        const mult = container.kind === 'MetalCrate' ? 1.8 : 1.0;
        const dmg = Math.max(1, Math.floor(baseDmg * mult));
        enemy.hp -= dmg;

        const dir = container.vx >= 0 ? 1 : -1;
        const isBoss = (enemy as any)._isBoss === true;
        if (isBoss) enemy.onHit(dir * 60, -40, 0);
        else enemy.onHit(dir * 220, -160, 400);

        this.deps.getDamageNumbers().spawn(enemy.x + enemy.width / 2, enemy.y - 8, dmg, container.kind === 'MetalCrate');
        this.deps.getHitSparks().spawn(ax + aw / 2, ay + ah / 2, true, 0);
        if (enemy.hp <= 0) {
          enemy.hp = 0;
          enemy.onDeath();
        }

        container.hasDealtImpact = true;
        const impactGx = Math.floor((ax + aw / 2) / 16);
        const impactGy = Math.floor((ay + ah / 2) / 16);
        if (container.spec.paintTile !== 0 && container.fluidVolume > 0) {
          this.deps.paintContainerImpact(container.kind, impactGx, impactGy, container.fluidVolume);
        }
        this.deps.destroyContainerWithVFX(container);
        containers.splice(i, 1);
        break;
      }
    }
  }

  private canContainerOccupyX(container: ThrowableContainer, newX: number): boolean {
    const inset = container.spec.collisionInset;
    const colX = newX + inset.left;
    const colW = container.colW;
    const colY = container.colY;
    const colH = container.colH;
    const left = Math.floor(colX / 16);
    const right = Math.floor((colX + colW - 1) / 16);
    const top = Math.floor(colY / 16);
    const bottom = Math.floor((colY + colH - 1) / 16);
    const grid = this.deps.getFullGrid();

    for (let gy = top; gy <= bottom; gy++) {
      for (let gx = left; gx <= right; gx++) {
        const tile = grid[gy]?.[gx] ?? 0;
        if (tile === 1 || tile === 3 || tile === 7 || tile === 9 || tile === 12 || tile === 15) return false;
      }
    }

    for (const other of this.deps.getContainers()) {
      if (other === container || other.destroyed || other.held) continue;
      if (colX + colW <= other.colX || colX >= other.colX + other.colW) continue;
      if (colY + colH <= other.colY || colY >= other.colY + other.colH) continue;
      return false;
    }
    return true;
  }

  private createEnvironment() {
    return {
      isAcidCell: (gx: number, gy: number) => (this.deps.getFullGrid()[gy]?.[gx] ?? 0) === 13,
      isMagmaCell: (gx: number, gy: number) => (this.deps.getFullGrid()[gy]?.[gx] ?? 0) === 6,
      isFireCell: (gx: number, gy: number) => this.deps.getTileMutator().aabbHasOverlay(gx * 16, gy * 16, 16, 16, 'fire'),
      isWaterCell: (gx: number, gy: number) => (this.deps.getFullGrid()[gy]?.[gx] ?? 0) === 2,
      isOilCell: (gx: number, gy: number) => (this.deps.getFullGrid()[gy]?.[gx] ?? 0) === 11,
      isFrozenOrIceCell: (gx: number, gy: number) =>
        (this.deps.getFullGrid()[gy]?.[gx] ?? 0) === 7 || this.deps.getTileMutator().isFrozen(gx, gy),
      isChargedCell: (gx: number, gy: number) => (this.deps.getFullGrid()[gy]?.[gx] ?? 0) === 8,
    };
  }

  private isContainerSolidCellFor(container: ThrowableContainer, gx: number, gy: number): boolean {
    const tile = this.deps.getFullGrid()[gy]?.[gx] ?? 0;
    if (tile === 1 || tile === 3 || tile === 7 || tile === 9 || tile === 12 || tile === 15) return true;
    return container.isWoodFamily() && this.isContainerFluidCell(gx, gy);
  }

  private containerOverlapsFluid(container: ThrowableContainer): boolean {
    const left = Math.floor(container.colX / 16);
    const right = Math.floor((container.colX + container.colW - 1) / 16);
    const top = Math.floor(container.colY / 16);
    const bottom = Math.floor((container.colY + container.colH - 1) / 16);
    for (let gy = top; gy <= bottom; gy++) {
      for (let gx = left; gx <= right; gx++) {
        if (this.isContainerFluidCell(gx, gy)) return true;
      }
    }
    return false;
  }

  private isContainerFluidCell(gx: number, gy: number): boolean {
    const tile = this.deps.getFullGrid()[gy]?.[gx] ?? 0;
    return tile === 2 || tile === 6 || tile === 8 || tile === 11 || tile === 13 || tile === 20;
  }
}
