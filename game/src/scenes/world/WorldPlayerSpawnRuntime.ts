import type { Player } from '@entities/Player';
import type { LdtkLevel } from '@level/LdtkLoader';
import { sacredSave } from '@save/PlayerSave';
import type { WorldTransitionController } from './WorldTransitionController';

const TILE_SIZE = 16;

type WorldEnterDirection = 'left' | 'right' | 'up' | 'down';

interface WorldPlayerSpawnRuntimeDeps {
  transitionController: WorldTransitionController;
  getPlayer: () => Player;
  getCollisionGrid: () => number[][];
  getPendingPlayerTileX: () => number;
  getPendingPlayerTileY: () => number;
  recordSafePosition: (x: number, y: number) => void;
}

export class WorldPlayerSpawnRuntime {
  constructor(private readonly deps: WorldPlayerSpawnRuntimeDeps) {}

  place(level: LdtkLevel, enterFrom: WorldEnterDirection): void {
    const player = this.deps.getPlayer();
    const pw = player.width;
    const ph = player.height;
    const grid = this.deps.getCollisionGrid();

    let spawnX: number;
    let spawnY: number;

    const hintRow = this.deps.getPendingPlayerTileY() - Math.floor(level.worldY / TILE_SIZE);
    const hintCol = this.deps.getPendingPlayerTileX() - Math.floor(level.worldX / TILE_SIZE);
    const inset = 2 * TILE_SIZE;

    switch (enterFrom) {
      case 'left': {
        const passageY = this.deps.transitionController.findEdgePassage(grid, 'left', hintRow);
        spawnX = inset;
        spawnY = this.deps.transitionController.snapToFloor(grid, Math.floor(inset / TILE_SIZE), passageY, ph);
        break;
      }
      case 'right': {
        const passageY = this.deps.transitionController.findEdgePassage(grid, 'right', hintRow);
        spawnX = level.pxWid - inset - pw;
        spawnY = this.deps.transitionController.snapToFloor(grid, level.gridW - 3, passageY, ph);
        break;
      }
      case 'up': {
        const passageX = this.deps.transitionController.findEdgePassage(grid, 'up', hintCol);
        spawnX = passageX * TILE_SIZE;
        spawnY = inset;
        break;
      }
      case 'down':
      default: {
        // Pick the Player spawn tagged for the current scene (LDtk Player.Scene),
        // e.g. 'prologue' vs 'chapter01'; fall back to the first spawn.
        const spawns = level.entities.filter((e) => e.type === 'Player');
        const scene = sacredSave.getScene();
        const playerEntity = spawns.find((e) => e.fields['Scene'] === scene) ?? spawns[0];
        if (playerEntity) {
          spawnX = playerEntity.px[0];
          spawnY = playerEntity.px[1] - ph;
        } else {
          const passageX = this.deps.transitionController.findEdgePassage(grid, 'down', hintCol);
          spawnX = passageX * TILE_SIZE;
          spawnY = level.pxHei - inset - ph;
        }
        break;
      }
    }

    player.x = spawnX;
    player.y = spawnY;
    player.vx = 0;
    player.vy = 0;
    player.roomData = grid;
    player.savePrevPosition();
    this.deps.recordSafePosition(spawnX, spawnY);
  }
}
