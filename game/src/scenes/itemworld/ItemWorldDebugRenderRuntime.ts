import type { Camera } from '@core/Camera';
import type { CollisionDebugBox, CollisionDebugOverlay } from '@level/CollisionDebugOverlay';

interface DebugPlayer {
  x: number;
  y: number;
  width: number;
  height: number;
  collisionW: number;
  collisionH: number;
  groundSource: string;
  groundSourceDetail: string;
  getHurtAABB(): { x: number; y: number; width: number; height: number };
  isGrounded(): boolean;
}

interface DebugEnemy {
  alive: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  getHurtAABB?: () => { x: number; y: number; width: number; height: number };
}

interface ItemWorldDebugRenderRuntimeDeps {
  getPlayer: () => DebugPlayer;
  getEnemies: () => Iterable<DebugEnemy>;
  getRoomData: () => number[][];
  getCamera: () => Camera;
  getCollisionDebug: () => CollisionDebugOverlay;
}

export class ItemWorldDebugRenderRuntime {
  constructor(private readonly deps: ItemWorldDebugRenderRuntimeDeps) {}

  updateCollisionDebug(): void {
    const player = this.deps.getPlayer();
    const collisionOffsetX = (player.width - player.collisionW) / 2;
    const collisionOffsetY = player.height - player.collisionH;
    const playerCollision = {
      x: player.x + collisionOffsetX,
      y: player.y + collisionOffsetY,
      w: player.collisionW,
      h: player.collisionH,
    };
    const boxes: CollisionDebugBox[] = [
      { ...playerCollision, kind: 'collision', owner: 'player' },
      this.toPlayerHurtBox(player),
    ];

    for (const enemy of this.deps.getEnemies()) {
      if (!enemy.alive) continue;
      boxes.push(
        { x: enemy.x, y: enemy.y, w: enemy.width, h: enemy.height, kind: 'collision', owner: 'enemy' },
        this.toEnemyHurtBox(enemy),
      );
    }

    this.deps.getCollisionDebug().update(this.deps.getRoomData(), this.deps.getCamera(), {
      ...playerCollision,
      grounded: player.isGrounded(),
      source: player.groundSource,
      detail: player.groundSourceDetail,
    }, undefined, boxes);
  }

  private toPlayerHurtBox(player: DebugPlayer): CollisionDebugBox {
    const hurt = player.getHurtAABB();
    return {
      x: hurt.x,
      y: hurt.y,
      w: hurt.width,
      h: hurt.height,
      kind: 'hurtbox',
      owner: 'player',
    };
  }

  private toEnemyHurtBox(enemy: DebugEnemy): CollisionDebugBox {
    const hurt = enemy.getHurtAABB?.();
    return {
      x: hurt?.x ?? enemy.x,
      y: hurt?.y ?? enemy.y,
      w: hurt?.width ?? enemy.width,
      h: hurt?.height ?? enemy.height,
      kind: 'hurtbox',
      owner: 'enemy',
    };
  }
}
