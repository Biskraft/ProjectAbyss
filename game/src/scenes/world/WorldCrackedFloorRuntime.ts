import type { Container } from 'pixi.js';
import type { Game } from '../../Game';
import { aabbOverlap } from '@core/Physics';
import type { Player } from '@entities/Player';
import { CrackedFloor } from '@entities/CrackedFloor';
import type { ScreenFlash } from '@effects/ScreenFlash';
import { getActivePlayerAttackHitbox } from '@systems/PlayerAttackHitbox';
import type { LdtkLevel } from '@level/LdtkLoader';
import { t } from '@i18n';
import { getWallRuntimeKey, setWallRuntimeKey } from '@entities/WallMetadata';
import type { WorldCrackedFloorRegistry } from './WorldCrackedFloorRegistry';
import { applyCrackedFloorShatterFeedback } from '@scenes/shared/StaticEntityFeedbackHelpers';

interface WorldCrackedFloorRuntimeDeps {
  game: Game;
  getPlayer: () => Player;
  getCollisionGrid: () => number[][];
  getEntityLayer: () => Container;
  getRegistry: () => WorldCrackedFloorRegistry;
  getUnlockedEvents: () => Set<string>;
  getScreenFlash: () => ScreenFlash;
  showToast: (message: string, color: number) => void;
}

type BreakStyle = 'attack' | 'surge' | 'landing';

export class WorldCrackedFloorRuntime {
  constructor(private readonly deps: WorldCrackedFloorRuntimeDeps) {}

  spawn(level: LdtkLevel): void {
    const registry = this.deps.getRegistry();
    registry.clear();

    const entities = level.entities.filter(entity => entity.type === 'CrackedFloor');
    for (const entity of entities) {
      const key = `crack_${level.identifier}_${entity.px[0]}_${entity.px[1]}`;
      if (this.deps.getUnlockedEvents().has(key)) continue;

      const floor = new CrackedFloor(entity.px[0], entity.px[1], entity.width, entity.height);
      setWallRuntimeKey(floor, key);
      floor.injectCollision(this.deps.getCollisionGrid());
      registry.add(floor, this.deps.getEntityLayer());
    }
  }

  checkAttack(): void {
    const player = this.deps.getPlayer();
    if (!player.isAttackActive()) return;

    const hitbox = getActivePlayerAttackHitbox(player);
    if (!hitbox) return;
    this.shatterOverlapping(hitbox, 'attack');
  }

  shatterOnSurge(playerBox: { x: number; y: number; width: number; height: number }): void {
    this.shatterOverlapping(playerBox, 'surge');
  }

  shatterOnLanding(px: number, py: number, radius: number): void {
    const landBox = { x: px - radius, y: py - 4, width: radius * 2, height: 8 };
    this.shatterOverlapping(landBox, 'landing');
  }

  private shatterOverlapping(
    hitbox: { x: number; y: number; width: number; height: number },
    style: BreakStyle,
  ): void {
    const registry = this.deps.getRegistry();
    const floors = registry.floors;
    for (let i = floors.length - 1; i >= 0; i--) {
      const floor = floors[i];
      if (floor.destroyed) continue;
      if (!aabbOverlap(hitbox, floor.getAABB())) continue;

      floor.shatter(this.deps.getCollisionGrid());
      const key = getWallRuntimeKey(floor);
      if (key) this.deps.getUnlockedEvents().add(key);
      this.playBreakFeedback(style);
      registry.removeAt(i);
    }
  }

  private playBreakFeedback(style: BreakStyle): void {
    applyCrackedFloorShatterFeedback({
      game: this.deps.game,
      screenFlash: this.deps.getScreenFlash(),
      cameraShake: style === 'attack' ? 6 : 10,
      showToast: () => {
        this.deps.showToast(
          style === 'attack' ? t('toast.wall_destroyed') : t('toast.floor_destroyed'),
          0xffaa44,
        );
      },
    });
  }
}
