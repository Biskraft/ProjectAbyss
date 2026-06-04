import { Debug } from '@core/Debug';
import type { Player } from '@entities/Player';
import type { ItemInstance } from '@items/ItemInstance';
import type { LdtkLoader, LdtkLevel } from '@level/LdtkLoader';
import { sacredSave } from '@save/PlayerSave';
import {
  ITEM_WORLD_TRANSITION_LEVEL_ID,
  WorldEdgeTransitionRuntime,
  type WorldEdgeTransitionDirection,
} from './WorldEdgeTransitionRuntime';
import type { WorldTransitionController } from './WorldTransitionController';

const TILE_SIZE = 16;

// Prologue stratum is a strict one-way chain: 01→(right)→02→(down)→03→(left)→04.
// Only the forward edge is allowed; 04 (no entry) blocks all transitions (the
// prologue-end sequence takes over there). Active only while scene='prologue'.
const PROLOGUE_FORWARD_DIR: Record<string, WorldEdgeTransitionDirection> = {
  ItemStratum_Prologue_01: 'right',
  ItemStratum_Prologue_02: 'down',
  ItemStratum_Prologue_03: 'left',
};

const LDTK_DIRECTION_KEY: Record<WorldEdgeTransitionDirection, 'w' | 'e' | 'n' | 's'> = {
  left: 'w',
  right: 'e',
  up: 'n',
  down: 's',
};

interface WorldEdgeTransitionFlowRuntimeDeps {
  loader: LdtkLoader;
  transitionController: WorldTransitionController;
  edgeTransitionRuntime: WorldEdgeTransitionRuntime;
  getPlayer: () => Player;
  getCurrentLevel: () => LdtkLevel | null;
  getCollisionGrid: () => number[][];
  getEntryItem: () => ItemInstance | null;
  isDeploymentActive: () => boolean;
  isInTunnel: () => boolean;
  isEntryTransitionActive: () => boolean;
  isDebugMode: () => boolean;
  prestreamItemWorldEntry: (item: ItemInstance, reason: string) => void;
  enterItemWorld: (entryCorridor: boolean) => void;
  loadLevelForTransition: (levelId: string, enterFrom: WorldEdgeTransitionDirection) => void;
}

export class WorldEdgeTransitionFlowRuntime {
  constructor(private readonly deps: WorldEdgeTransitionFlowRuntimeDeps) {}

  get isActive(): boolean {
    return this.deps.edgeTransitionRuntime.isActive;
  }

  checkLevelEdges(): void {
    if (this.deps.edgeTransitionRuntime.isActive) return;
    if (this.deps.isDeploymentActive()) return;

    const player = this.deps.getPlayer();
    const level = this.deps.getCurrentLevel();
    if (!level) return;

    const grid = this.deps.getCollisionGrid();
    const direction = this.detectDirection(player, level, grid);
    if (direction === null) return;

    // Prologue chain: forward-only (no backtrack / branch); 04 blocks all.
    if (sacredSave.getScene() === 'prologue' && level.identifier.startsWith('ItemStratum_Prologue_')) {
      if (direction !== PROLOGUE_FORWARD_DIR[level.identifier]) return;
    }

    if (this.deps.isInTunnel() && direction === 'down') {
      this.startTunnelExitTransition();
      return;
    }

    const playerWorldX = level.worldX + player.x + player.width / 2;
    const playerWorldY = level.worldY + player.y + player.height / 2;
    Debug.log(
      `[EdgeTransition] dir=${direction} level=${level.identifier} localY=${player.y.toFixed(0)} worldY=${playerWorldY.toFixed(0)} candidates=${JSON.stringify(level.dirNeighbors[LDTK_DIRECTION_KEY[direction]])}`,
    );
    const neighborId = this.deps.transitionController.getNeighborInDirection(
      this.deps.loader,
      level,
      direction,
      playerWorldX,
      playerWorldY,
      this.deps.isDebugMode(),
    );
    Debug.log(`[EdgeTransition] neighborId=${neighborId}`);

    if (!neighborId) {
      if (direction === 'right' && this.startItemWorldCorridorFromWorldRightEdge()) return;
      return;
    }

    this.startTransition(direction, neighborId);
  }

  startTransition(
    direction: WorldEdgeTransitionDirection,
    levelId: string,
    options: { entryCorridor?: boolean } = {},
  ): void {
    const player = this.deps.getPlayer();
    const level = this.deps.getCurrentLevel();
    if (!level) return;

    this.deps.edgeTransitionRuntime.start(direction, levelId, {
      playerWorldTileY: Math.floor((level.worldY + player.y + player.height / 2) / TILE_SIZE),
      playerWorldTileX: Math.floor((level.worldX + player.x + player.width / 2) / TILE_SIZE),
      entryCorridor: options.entryCorridor,
    });
  }

  update(dt: number): boolean {
    return this.deps.edgeTransitionRuntime.update(dt, {
      enterItemWorld: (entryCorridor) => {
        this.deps.enterItemWorld(entryCorridor);
      },
      loadLevel: (levelId, enterFrom) => {
        this.deps.loadLevelForTransition(levelId, enterFrom);
      },
    });
  }

  private detectDirection(
    player: Player,
    level: LdtkLevel,
    grid: number[][],
  ): WorldEdgeTransitionDirection | null {
    const px = player.x;
    const py = player.y;
    const pw = player.width;
    const ph = player.height;
    const playerTileY = Math.floor((py + ph / 2) / TILE_SIZE);
    const playerTileX = Math.floor((px + pw / 2) / TILE_SIZE);
    const passable = (tile: number | undefined) => tile === 0 || tile === 2;

    if (px + pw > level.pxWid - TILE_SIZE) {
      const edgeCol = level.gridW - 1;
      if (playerTileY >= 0 && playerTileY < level.gridH && passable(grid[playerTileY]?.[edgeCol])) {
        return 'right';
      }
    } else if (px < TILE_SIZE) {
      if (playerTileY >= 0 && playerTileY < level.gridH && passable(grid[playerTileY]?.[0])) {
        return 'left';
      }
    } else if (py + ph > level.pxHei - TILE_SIZE) {
      const edgeRow = level.gridH - 1;
      if (playerTileX >= 0 && playerTileX < level.gridW && passable(grid[edgeRow]?.[playerTileX])) {
        return 'down';
      }
    } else if (py < TILE_SIZE) {
      if (playerTileX >= 0 && playerTileX < level.gridW && passable(grid[0]?.[playerTileX])) {
        return 'up';
      }
    }

    return null;
  }

  private startItemWorldCorridorFromWorldRightEdge(): boolean {
    const item = this.deps.getEntryItem();
    if (!item || this.deps.isInTunnel() || this.deps.isEntryTransitionActive()) return false;

    const level = this.deps.getCurrentLevel();
    if (!level || level.pxWid <= 0) return false;

    const player = this.deps.getPlayer();
    const playerRight = player.x + player.width;
    if (playerRight < level.pxWid - TILE_SIZE) return false;

    this.deps.prestreamItemWorldEntry(item, 'world-right-edge');
    this.startTransition('right', ITEM_WORLD_TRANSITION_LEVEL_ID, {
      entryCorridor: !this.deps.isDeploymentActive(),
    });
    return true;
  }

  private startTunnelExitTransition(): void {
    const item = this.deps.getEntryItem();
    if (item) this.deps.prestreamItemWorldEntry(item, 'item-tunnel-exit');
    this.startTransition('down', ITEM_WORLD_TRANSITION_LEVEL_ID, { entryCorridor: true });
  }
}
