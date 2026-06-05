import type { Container } from 'pixi.js';
import { t } from '@i18n';
import { aabbOverlap, isInSpike } from '@core/Physics';
import { getAttackHitbox } from '@combat/CombatData';
import type { Game } from '../../Game';
import type { Player } from '@entities/Player';
import type { Enemy } from '@entities/Enemy';
import type { CollapsingPlatform } from '@entities/CollapsingPlatform';
import type { GrowingWall } from '@entities/GrowingWall';
import type { ItemDisplay } from '@entities/ItemDisplay';
import type { LockedDoor } from '@entities/LockedDoor';
import type { CrackedFloor } from '@entities/CrackedFloor';
import type { BreakableProp } from '@entities/BreakableProp';
import type { Switch } from '@entities/Switch';
import { ThrowableContainer } from '@entities/ThrowableContainer';
import type { HUD } from '@ui/HUD';
import type { DamageNumberManager } from '@ui/DamageNumber';
import type { HitSparkManager } from '@effects/HitSpark';
import type { ScreenFlash } from '@effects/ScreenFlash';
import { addEntityToLayer } from '@scenes/shared/EntityLifecycleHelpers';
import { initializeEnemySpawnedEntity } from '@scenes/shared/EnemySpawnHelpers';
import { applyPlayerSpikeHitFeedback } from '@scenes/shared/TileHazardRuntimeHelpers';
import {
  applyCrackedFloorShatterFeedback,
  applyGateUnlockFeedback,
  applySwitchActivationFeedback,
} from '@scenes/shared/StaticEntityFeedbackHelpers';

interface ItemWorldStaticEntityRuntimeDeps {
  game: Game;
  getPlayer: () => Player;
  getCollisionGrid: () => number[][];
  getEnemies: () => Enemy<string>[];
  getEntityLayer: () => Container;
  getCollapsingPlatforms: () => CollapsingPlatform[];
  getGrowingWalls: () => GrowingWall[];
  getItemDisplays: () => ItemDisplay[];
  getLockedDoors: () => LockedDoor[];
  getCrackedFloors: () => CrackedFloor[];
  getBreakableProps: () => BreakableProp[];
  getSwitches: () => Switch[];
  getContainers: () => ThrowableContainer[];
  getHud: () => HUD;
  getDamageNumbers: () => DamageNumberManager;
  getHitSparks: () => HitSparkManager;
  getScreenFlash: () => ScreenFlash;
  showToast: (message: string, color: number) => void;
  tickTileHazards: (dtMs: number) => void;
  destroyBreakablePropWithEffects: (prop: BreakableProp, reason: 'sword') => void;
  paintContainerImpact: (kind: ThrowableContainer['kind'], gx: number, gy: number, volume: number) => void;
  destroyContainerWithVFX: (container: ThrowableContainer) => void;
  removeContainerAt: (index: number) => void;
  updateCameraZones: () => void;
}

export class ItemWorldStaticEntityRuntime {
  constructor(private readonly deps: ItemWorldStaticEntityRuntimeDeps) {}

  update(dtMs: number): void {
    this.deps.tickTileHazards(dtMs);
    this.applySpikeDamage();
    this.updateCollapsingPlatforms(dtMs);
    this.updateGrowingWalls(dtMs);
    this.updateItemDisplays(dtMs);
    this.updateLockedDoors(dtMs);
    this.updateAttackInteractions();
    this.deps.updateCameraZones();
  }

  private applySpikeDamage(): void {
    const player = this.deps.getPlayer();
    if (player.invincible || player.hp <= 0) return;
    if (!isInSpike(player.x, player.y, player.width, player.height, this.deps.getCollisionGrid())) return;

    applyPlayerSpikeHitFeedback({
      player,
      game: this.deps.game,
      hud: this.deps.getHud(),
      damageNumbers: this.deps.getDamageNumbers(),
      screenFlash: this.deps.getScreenFlash(),
    });
  }

  private updateCollapsingPlatforms(dtMs: number): void {
    const player = this.deps.getPlayer();
    for (const platform of this.deps.getCollapsingPlatforms()) {
      platform.update(dtMs);
      if (platform.isPlayerOnTop(player.x, player.y, player.width, player.height)) {
        platform.startShake();
      }
    }
  }

  private updateGrowingWalls(dtMs: number): void {
    const enemies = this.deps.getEnemies();
    const entityLayer = this.deps.getEntityLayer();
    const player = this.deps.getPlayer();
    for (const wall of this.deps.getGrowingWalls()) {
      wall.update(dtMs);
      if (wall.pendingSlimes.length === 0) continue;
      for (const slime of wall.pendingSlimes) {
        initializeEnemySpawnedEntity(slime, slime.x, slime.y, {
          getCollisionGrid: () => this.deps.getCollisionGrid(),
          getPlayer: () => player,
        });
        addEntityToLayer(enemies, slime, entityLayer);
      }
      wall.pendingSlimes.length = 0;
    }
  }

  private updateItemDisplays(dtMs: number): void {
    for (const display of this.deps.getItemDisplays()) {
      display.update(dtMs);
    }
  }

  private updateLockedDoors(dtMs: number): void {
    const player = this.deps.getPlayer();
    for (const door of this.deps.getLockedDoors()) {
      door.update(dtMs);
      if (!door.locked) continue;
      door.ensureCollision(this.deps.getCollisionGrid());
      const aabb = door.getHitAABB();
      const px0 = player.x;
      const py0 = player.y;
      const pw = player.width;
      const ph = player.height;
      const overlapsX = px0 + pw > aabb.x && px0 < aabb.x + aabb.width;
      const overlapsY = py0 + ph > aabb.y && py0 < aabb.y + aabb.height;
      if (!overlapsX || !overlapsY) continue;
      const playerCx = px0 + pw / 2;
      const doorCx = aabb.x + aabb.width / 2;
      player.x = playerCx < doorCx ? aabb.x - pw : aabb.x + aabb.width;
    }
  }

  private updateAttackInteractions(): void {
    const player = this.deps.getPlayer();
    if (!player.isAttackActive()) return;
    const step = player.getAttackStep(player.comboIndex);
    if (!step) return;

    const hitbox = getAttackHitbox(
      player.x,
      player.y,
      player.width,
      player.height,
      player.facingRight ?? true,
      step,
    );

    this.hitCrackedFloors(hitbox);
    this.hitBreakableProps(hitbox);
    this.hitSwitches(hitbox);
    this.hitContainers(hitbox);
  }

  private hitCrackedFloors(hitbox: { x: number; y: number; width: number; height: number }): void {
    const crackedFloors = this.deps.getCrackedFloors();
    for (let i = crackedFloors.length - 1; i >= 0; i--) {
      const floor = crackedFloors[i];
      if (floor.destroyed) continue;
      if (!aabbOverlap(hitbox, floor.getAABB())) continue;
      floor.shatter(this.deps.getCollisionGrid());
      applyCrackedFloorShatterFeedback({
        game: this.deps.game,
        screenFlash: this.deps.getScreenFlash(),
        cameraShake: 6,
      });
      floor.destroy();
      crackedFloors.splice(i, 1);
    }
  }

  private hitBreakableProps(hitbox: { x: number; y: number; width: number; height: number }): void {
    const breakableProps = this.deps.getBreakableProps();
    for (let i = breakableProps.length - 1; i >= 0; i--) {
      const prop = breakableProps[i];
      if (prop.destroyed) continue;
      if (!aabbOverlap(hitbox, prop.getAABB())) continue;
      this.deps.destroyBreakablePropWithEffects(prop, 'sword');
      breakableProps.splice(i, 1);
    }
  }

  private hitSwitches(hitbox: { x: number; y: number; width: number; height: number }): void {
    for (const sw of this.deps.getSwitches()) {
      if (sw.activated) continue;
      if (!aabbOverlap(hitbox, sw.getHitAABB())) continue;
      if (sw.activate(this.deps.getCollisionGrid())) {
        applySwitchActivationFeedback({
          game: this.deps.game,
          screenFlash: this.deps.getScreenFlash(),
        });
        this.unlockDoorByIidLocal(sw.targetDoorIid);
      }
    }
  }

  private unlockDoorByIidLocal(iid: string): void {
    const lockedDoors = this.deps.getLockedDoors();
    for (let i = lockedDoors.length - 1; i >= 0; i--) {
      const door = lockedDoors[i];
      if (door.iid !== iid) continue;

      door.unlock(this.deps.getCollisionGrid());
      applyGateUnlockFeedback({
        game: this.deps.game,
        screenFlash: this.deps.getScreenFlash(),
        showToast: () => {
          this.deps.showToast(t('toast.gate_opened'), 0x44ffaa);
        },
      });
      door.destroy();
      lockedDoors.splice(i, 1);
      return;
    }
  }

  private hitContainers(hitbox: { x: number; y: number; width: number; height: number }): void {
    const containers = this.deps.getContainers();
    for (let i = containers.length - 1; i >= 0; i--) {
      const container = containers[i];
      if (container.destroyed || container.held) continue;
      const cBox = { x: container.colX, y: container.colY, width: container.colW, height: container.colH };
      if (!aabbOverlap(hitbox, cBox)) continue;
      if (container.kind === 'MetalCrate') {
        this.deps.getHitSparks().spawn(container.colX + container.colW / 2, container.colY + container.colH / 2, true, 0);
        continue;
      }
      const impact = container.takeAttack(Math.max(1, Math.floor(this.deps.getPlayer().atk)));
      this.deps.getHitSparks().spawn(container.colX + container.colW / 2, container.colY + container.colH / 2, true, 0);
      if (impact) {
        this.deps.paintContainerImpact(container.kind, impact.gx, impact.gy, container.fluidVolume);
        this.deps.destroyContainerWithVFX(container);
        this.deps.removeContainerAt(i);
      }
    }
  }
}
