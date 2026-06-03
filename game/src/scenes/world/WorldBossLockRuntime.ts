import type { Container } from 'pixi.js';
import { LockedDoor } from '@entities/LockedDoor';
import { trackBossFight } from '@utils/Analytics';

interface BossLockLevel {
  identifier: string;
  pxWid: number;
  pxHei: number;
}

interface WorldBossLockRuntimeDeps {
  getCollisionGrid: () => number[][];
  getEntityLayer: () => Container;
  hideBossHp: () => void;
}

export class WorldBossLockRuntime {
  private active = false;
  private doors: LockedDoor[] = [];
  private bossId = '';
  private levelId = '';

  constructor(private readonly deps: WorldBossLockRuntimeDeps) {}

  get isActive(): boolean {
    return this.active;
  }

  activate(level: BossLockLevel, bossId = 'unknown'): void {
    if (this.active) return;
    this.active = true;
    this.bossId = bossId;
    this.levelId = level.identifier;
    trackBossFight({
      phase: 'start',
      area: 'world',
      boss_id: bossId,
      level_id: level.identifier,
    });

    const w = level.pxWid;
    const h = level.pxHei;
    const doorThick = 16;
    const positions = [
      { x: doorThick / 2, y: h / 2, dw: doorThick, dh: h },
      { x: w - doorThick / 2, y: h / 2, dw: doorThick, dh: h },
      { x: w / 2, y: doorThick, dw: w, dh: doorThick },
      { x: w / 2, y: h, dw: w, dh: doorThick },
    ];
    const collisionGrid = this.deps.getCollisionGrid();
    const entityLayer = this.deps.getEntityLayer();
    for (const pos of positions) {
      const door = new LockedDoor(
        pos.x, pos.y + pos.dh / 2,
        pos.dw, pos.dh,
        '', 'event', '', 'atk', 0,
      );
      door.injectCollision(collisionGrid);
      door.container.visible = false;
      this.doors.push(door);
      entityLayer.addChild(door.container);
    }
  }

  deactivate(): void {
    if (!this.active) return;
    this.active = false;
    const collisionGrid = this.deps.getCollisionGrid();
    for (const door of this.doors) {
      door.unlock(collisionGrid);
      door.destroy();
    }
    this.doors = [];
    this.deps.hideBossHp();
    trackBossFight({
      phase: 'clear',
      area: 'world',
      boss_id: this.bossId || 'unknown',
      level_id: this.levelId || undefined,
    });
    this.bossId = '';
    this.levelId = '';
  }
}
