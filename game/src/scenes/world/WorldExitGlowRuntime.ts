import type { Container } from 'pixi.js';
import { ExitGlow, type ExitGlowDir } from '@effects/ExitGlow';
import type { LdtkEntity, LdtkLevel } from '@level/LdtkLoader';

export interface EntranceGlowSpec {
  dir: ExitGlowDir;
  x: number;
  y: number;
  span: number;
}

interface WorldExitGlowRuntimeDeps {
  getEntityLayer: () => Container;
  getPlayerCenter: () => { x: number; y: number };
}

const TILE_SIZE = 16;

export class WorldExitGlowRuntime {
  private glows: ExitGlow[] = [];
  private builderEntranceGlows: ExitGlow[] = [];

  constructor(private readonly deps: WorldExitGlowRuntimeDeps) {}

  get builderEntranceCount(): number {
    return this.builderEntranceGlows.length;
  }

  includesBuilderEntranceGlow(glow: ExitGlow): boolean {
    return this.builderEntranceGlows.includes(glow);
  }

  loadLevel(level: LdtkLevel): void {
    this.clearAll();
    this.spawnLevelEdgeGlows(level);
    for (const ent of level.entities) {
      if (!this.isEntranceVfxEntity(ent)) continue;
      const spec = this.getEntranceGlowSpec(ent);
      this.addGlow(spec);
    }
  }

  addBuilderEntranceGlow(spec: EntranceGlowSpec): ExitGlow {
    const glow = this.addGlow(spec);
    this.builderEntranceGlows.push(glow);
    return glow;
  }

  setBuilderEntranceGlowAlpha(alpha: number): void {
    for (const glow of this.builderEntranceGlows) {
      glow.container.alpha = alpha;
    }
  }

  clearBuilderEntranceGlows(): void {
    for (const glow of this.builderEntranceGlows) {
      const idx = this.glows.indexOf(glow);
      if (idx >= 0) this.glows.splice(idx, 1);
      glow.destroy();
    }
    this.builderEntranceGlows = [];
  }

  update(dt: number): void {
    if (this.glows.length <= 0) return;
    const { x, y } = this.deps.getPlayerCenter();
    for (const glow of this.glows) {
      glow.setPlayer(x, y);
      glow.update(dt);
    }
  }

  clearAll(): void {
    for (const glow of this.glows) glow.destroy();
    this.glows = [];
    this.builderEntranceGlows = [];
  }

  isEntranceVfxEntity(ent: LdtkEntity): boolean {
    const type = ent.type.toLowerCase();
    return type === 'builderentrance' || type === 'builderentity';
  }

  getEntranceGlowSpec(ent: LdtkEntity): EntranceGlowSpec {
    const rightField = ent.fields.RightSide ?? ent.fields.rightSide;
    const rightSide = typeof rightField === 'boolean' ? rightField : false;
    return {
      dir: rightSide ? 'left' : 'right',
      x: ent.px[0] + (rightSide ? ent.width : 0),
      y: ent.px[1] - ent.height,
      span: Math.max(TILE_SIZE, ent.height),
    };
  }

  private spawnLevelEdgeGlows(level: LdtkLevel): void {
    const grid = level.collisionGrid;
    const width = level.gridW;
    const height = level.gridH;
    const passable = (tile: number | undefined) => tile === 0 || tile === 2;
    const hasNeighbor = (dir: 'n' | 's' | 'e' | 'w') =>
      (level.dirNeighbors[dir]?.length ?? 0) > 0;

    const addRuns = (
      dir: ExitGlowDir,
      count: number,
      isPassableAt: (i: number) => boolean,
      toWorld: (runStart: number, runLen: number) => EntranceGlowSpec,
    ) => {
      let i = 0;
      while (i < count) {
        if (!isPassableAt(i)) {
          i++;
          continue;
        }
        let j = i;
        while (j < count && isPassableAt(j)) j++;
        this.addGlow(toWorld(i, j - i));
        i = j;
      }
    };

    if (hasNeighbor('e')) {
      addRuns('right', height,
        (row) => passable(grid[row]?.[width - 1]),
        (runStart, runLen) => ({ dir: 'right', x: width * TILE_SIZE, y: runStart * TILE_SIZE, span: runLen * TILE_SIZE }),
      );
    }
    if (hasNeighbor('w')) {
      addRuns('left', height,
        (row) => passable(grid[row]?.[0]),
        (runStart, runLen) => ({ dir: 'left', x: 0, y: runStart * TILE_SIZE, span: runLen * TILE_SIZE }),
      );
    }
    if (hasNeighbor('s')) {
      addRuns('down', width,
        (col) => passable(grid[height - 1]?.[col]),
        (runStart, runLen) => ({ dir: 'down', x: runStart * TILE_SIZE, y: height * TILE_SIZE, span: runLen * TILE_SIZE }),
      );
    }
    if (hasNeighbor('n')) {
      addRuns('up', width,
        (col) => passable(grid[0]?.[col]),
        (runStart, runLen) => ({ dir: 'up', x: runStart * TILE_SIZE, y: 0, span: runLen * TILE_SIZE }),
      );
    }
  }

  private addGlow(spec: EntranceGlowSpec): ExitGlow {
    const glow = new ExitGlow(spec.dir, spec.x, spec.y, spec.span);
    this.deps.getEntityLayer().addChild(glow.container);
    this.glows.push(glow);
    return glow;
  }
}
