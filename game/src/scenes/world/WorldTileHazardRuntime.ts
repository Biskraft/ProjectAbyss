import type { Game } from '../../Game';
import type { FluidCrestFoamManager } from '@effects/FluidCrestFoam';
import type { TileMutator } from '@systems/TileMutator';
import type { Enemy } from '@entities/Enemy';
import type { Player } from '@entities/Player';
import type { HUD } from '@ui/HUD';
import type { DamageNumberManager } from '@ui/DamageNumber';
import type { ScreenFlash } from '@effects/ScreenFlash';
import type { FluidSystem } from '@effects/FluidSystem';
import type { FluidSpawnerManager } from '@systems/FluidSpawner';
import type { WorldBurnablePropRuntime } from './WorldBurnablePropRuntime';
import type { WorldBreakablePropRuntime } from './WorldBreakablePropRuntime';
import type { WorldGrassFireRuntime } from './WorldGrassFireRuntime';
import type { WorldTileMutationRuntime } from './WorldTileMutationRuntime';
import {
  applyEnemyTileHazardsWithFeedback,
  applyPlayerTileHazardsWithFeedback,
  applyPlayerWaterfallHazardsWithFeedback,
} from '@scenes/shared/TileHazardRuntimeHelpers';

interface WorldTileHazardRuntimeDeps {
  game: Game;
  getPlayer: () => Player;
  getEnemies: () => Enemy<string>[];
  getCollisionGrid: () => number[][];
  getTileMutator: () => TileMutator;
  getBurnableRuntime: () => WorldBurnablePropRuntime;
  getBreakableRuntime: () => WorldBreakablePropRuntime;
  getGrassFireRuntime: () => WorldGrassFireRuntime;
  getTileMutationRuntime: () => WorldTileMutationRuntime;
  getFluidSystem: () => FluidSystem;
  getFluidSpawners: () => FluidSpawnerManager;
  getFluidCrestFoam: () => FluidCrestFoamManager;
  rerenderTilemap: () => void;
  refreshFluidFromGrid: (collisionGrid: number[][]) => void;
  getHud: () => HUD;
  getDamageNumbers: () => DamageNumberManager;
  getScreenFlash: () => ScreenFlash;
}

export class WorldTileHazardRuntime {
  constructor(private readonly deps: WorldTileHazardRuntimeDeps) {}

  update(dt: number): void {
    const player = this.deps.getPlayer();
    const room = player.roomData;
    if (!room) return;

    const collisionGrid = this.deps.getCollisionGrid();
    const tileMutator = this.deps.getTileMutator();

    // Advance frozen/burning/electric timers + oil-spread + passive interactions.
    tileMutator.tick(room, dt);

    this.deps.getBurnableRuntime().update(dt);

    // Procedural grass clumps — fire ignition + chain to TILE_GRASS tiles.
    this.deps.getGrassFireRuntime().update(dt, tileMutator, collisionGrid, 16);

    this.deps.getBreakableRuntime().cleanupBurnedOut();

    // Render overlay for fire / ice / electric cell states.
    this.deps.getTileMutationRuntime().updateRenderer(collisionGrid, dt);

    // Wall layer refresh — ice melted to water, wood/grass burned out, metal
    // corroded. rerenderTilemap reads the current collisionGrid and skips
    // tiles whose cell is now air or a fluid type.
    if (this.deps.getTileMutationRuntime().consumeWallLayerDirty()) {
      this.deps.rerenderTilemap();
      // New water cells (from ice melt) need a fluid body.
      this.deps.refreshFluidFromGrid(collisionGrid);
    }

    this.applyPlayerHazards(dt, room);
    this.applyEnemyHazards(dt, room);

    const fluidSystem = this.deps.getFluidSystem();
    const fluidSpawners = this.deps.getFluidSpawners();
    fluidSpawners.update(dt, collisionGrid, fluidSystem);
    fluidSystem.update(dt);
    fluidSystem.gravityTick(collisionGrid, dt, tileMutator);
    fluidSpawners.pressureDrain(collisionGrid, fluidSystem);
    this.deps.getFluidCrestFoam().update(dt, fluidSpawners.getActiveSegments(collisionGrid));
  }

  private applyPlayerHazards(dt: number, room: number[][]): void {
    const player = this.deps.getPlayer();
    if (player.hp <= 0) return;

    applyPlayerTileHazardsWithFeedback({
      player,
      grid: room,
      tileMutator: this.deps.getTileMutator(),
      dtMs: dt,
      game: this.deps.game,
      hud: this.deps.getHud(),
      damageNumbers: this.deps.getDamageNumbers(),
      screenFlash: this.deps.getScreenFlash(),
      setDeathHitstopFrames: (frames) => {
        this.deps.game.hitstopFrames = frames;
      },
    });

    applyPlayerWaterfallHazardsWithFeedback({
      player,
      grid: this.deps.getCollisionGrid(),
      fluidSpawners: this.deps.getFluidSpawners(),
      dtMs: dt,
      game: this.deps.game,
      hud: this.deps.getHud(),
      damageNumbers: this.deps.getDamageNumbers(),
      screenFlash: this.deps.getScreenFlash(),
    });
  }

  private applyEnemyHazards(dt: number, room: number[][]): void {
    applyEnemyTileHazardsWithFeedback({
      enemies: this.deps.getEnemies(),
      grid: room,
      tileMutator: this.deps.getTileMutator(),
      damageNumbers: this.deps.getDamageNumbers(),
      dtMs: dt,
    });
  }
}
