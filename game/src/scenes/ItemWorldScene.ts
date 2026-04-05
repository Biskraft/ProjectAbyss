import { Container, Graphics, BitmapText, Assets, type Texture } from 'pixi.js';
import { Scene } from '@core/Scene';
import { TilemapRenderer } from '@level/TilemapRenderer';
import { generateUnifiedGrid, type UnifiedGridData, type UnifiedRoomCell } from '@level/RoomGrid';
import { assembleRoom, getSpawnPosition, getDoorTriggers } from '@level/ChunkAssembler';
import type { RoomCell } from '@level/RoomGrid';
import { pickTemplate, resolveTiles, TEMPLATE_W, TEMPLATE_H, type RoomTemplate, type ExitDir } from '@level/ItemWorldTemplates';
import { LdtkLoader } from '@level/LdtkLoader';
import { LdtkRenderer } from '@level/LdtkRenderer';
import type { LdtkLevel } from '@level/LdtkLoader';
import { Sprite, Texture as PixiTexture, Rectangle } from 'pixi.js';
import { aabbOverlap } from '@core/Physics';
import { GameAction } from '@core/InputManager';
import { Player } from '@entities/Player';
import { Skeleton } from '@entities/Skeleton';
import { Guardian } from '@entities/Guardian';
import { Ghost } from '@entities/Ghost';
import { InnocentNPC } from '@entities/InnocentNPC';
import { Projectile } from '@entities/Projectile';
import { HitManager } from '@combat/HitManager';
import { HUD } from '@ui/HUD';
import { ControlsOverlay } from '@ui/ControlsOverlay';
import { PIXEL_FONT } from '@ui/fonts';
import { DamageNumberManager } from '@ui/DamageNumber';
import { ToastManager } from '@ui/Toast';
import { PRNG } from '@utils/PRNG';
import { addItemExp, itemLevelUp, getOrCreateWorldProgress, EXP_PER_LEVEL, addInnocent, canAddInnocent, type ItemInstance, type ItemWorldProgress } from '@items/ItemInstance';
import { INNOCENT_SPAWN_CHANCE, createRandomInnocent } from '@data/innocents';
import type { Inventory } from '@items/Inventory';
import { STRATA_BY_RARITY, type StrataConfig, type StratumDef } from '@data/StrataConfig';
import type { Enemy } from '@entities/Enemy';
import type { CombatEntity } from '@combat/HitManager';
import { HitSparkManager } from '@effects/HitSpark';
import { ScreenFlash } from '@effects/ScreenFlash';
import { ThoughtBubble } from '@ui/ThoughtBubble';
import { GAME_WIDTH, GAME_HEIGHT, type Game } from '../Game';

const TILE_SIZE = 16;
const ROOM_W = 60;
const ROOM_H = 34;
const FADE_DURATION = 200;
const BASE_EXP_PER_ROOM = 120;
const BASE_BOSS_BONUS_EXP = 600;
const BASE_EXP_PER_KILL = 60;
const BASE_EXP_ROOM_PASS = 60;

type TransitionState = 'none' | 'fade_out' | 'fade_in' | 'exit_fade';

export class ItemWorldScene extends Scene {
  private tilemap!: TilemapRenderer;
  private atlas: Texture | null = null;
  private ldtkLoader: LdtkLoader | null = null;
  private ldtkRenderer: LdtkRenderer | null = null;
  private ldtkTemplates: LdtkLevel[] = [];
  private outsideRenderer: LdtkRenderer | null = null;
  private outsideLevel: LdtkLevel | null = null;
  private player!: Player;
  private enemies: Enemy<string>[] = [];
  private projectiles: Projectile[] = [];
  private hitManager!: HitManager;
  private entityLayer!: Container;
  private hud!: HUD;
  private controlsOverlay!: ControlsOverlay;
  private dmgNumbers!: DamageNumberManager;
  private hitSparks!: HitSparkManager;
  private screenFlash!: ScreenFlash;
  private toast!: ToastManager;
  private thought!: ThoughtBubble;

  // Item being explored
  private item: ItemInstance;
  private inventory: Inventory;
  private sourcePlayer: Player;

  // Memory Strata state
  private strataConfig!: StrataConfig;
  private currentStratumIndex = 0;
  private currentStratumDef!: StratumDef;
  private progress!: ItemWorldProgress;

  // Unified grid (all strata combined)
  private earnedExp = 0;
  private roomsCleared = 0;
  private totalRooms = 0;
  private unifiedGrid!: UnifiedGridData;
  private currentCol = 0;
  private currentRow = 0; // absolute row in unified grid
  private roomData: number[][] = [];
  private rng!: PRNG;

  // Full-map rendering (all rooms rendered into one continuous grid)
  private fullGrid: number[][] = [];
  private fullMapContainer: Container | null = null;
  private spawnedRooms: Set<string> = new Set(); // tracks which rooms have spawned enemies

  // Room transition
  private transitionState: TransitionState = 'none';
  private transitionTimer = 0;
  private pendingDirection: 'left' | 'right' | 'up' | 'down' | null = null;

  // Escape altar
  private altarTrigger: { x: number; y: number; width: number; height: number } | null = null;
  private altarVisual: Graphics | null = null;
  private fadeOverlay!: Graphics;
  private doorTriggers: ReturnType<typeof getDoorTriggers> = [];

  // Exit trigger (at stratum end rooms)
  private exitTrigger: { x: number; y: number; width: number; height: number } | null = null;
  private exitVisual: Graphics | null = null;

  // Door markers
  private doorMarkers: Graphics[] = [];

  // Minimap
  private miniMapContainer!: Container;

  // Escape confirm dialog
  private escapeConfirm: Container | null = null;
  private escapeConfirmVisible = false;

  // Onboarding
  private onboardingPanel: Container | null = null;
  private onboardingStep = 0;
  private static readonly ONBOARDING_MSGS = [
    'You entered the Memory Strata!',
    'Each stratum goes deeper.\nDefeat the boss to descend.',
    'Find Escape Altars to\nleave safely with rewards.',
    'ESC to abandon. [Z] to proceed.',
  ];
  private onboardingDone = false;

  // Callback when done
  onComplete: (() => void) | null = null;

  constructor(game: Game, item: ItemInstance, inventory: Inventory, sourcePlayer: Player) {
    super(game);
    this.item = item;
    this.inventory = inventory;
    this.sourcePlayer = sourcePlayer;
  }

  async init(): Promise<void> {
    // Load tileset atlas + LDtk item world templates
    this.atlas = await Assets.load('assets/atlas/SunnyLand_by_Ansimuz-extended.png');
    try {
      const json = await fetch('assets/World_ProjectAbyss_ItemStratum.ldtk').then(r => r.json());
      this.ldtkLoader = new LdtkLoader();
      this.ldtkLoader.load(json);
      this.ldtkTemplates = this.ldtkLoader.getLevelIds().map(id => this.ldtkLoader!.getLevel(id)!);
      this.ldtkRenderer = new LdtkRenderer();
    } catch (e) {
      console.warn('[ItemWorld] LDtk templates not found, using code templates');
    }

    // Load outside frame
    try {
      const outsideJson = await fetch('assets/World_ProjectAbyss_ItemStratum_Outside.ldtk').then(r => r.json());
      const outsideLoader = new LdtkLoader();
      outsideLoader.load(outsideJson);
      const ids = outsideLoader.getLevelIds();
      if (ids.length > 0) {
        this.outsideLevel = outsideLoader.getLevel(ids[0])!;
        this.outsideRenderer = new LdtkRenderer();
      }
    } catch (e) {
      console.warn('[ItemWorld] Outside frame not found');
    }

    // Memory Strata setup
    this.strataConfig = STRATA_BY_RARITY[this.item.rarity];
    this.progress = getOrCreateWorldProgress(this.item);
    this.rng = new PRNG(this.item.uid * 1000);

    this.hitManager = new HitManager(this.game);

    // Generate unified grid (all strata at once)
    this.unifiedGrid = generateUnifiedGrid(this.strataConfig.strata, this.item.uid);

    // Determine starting position based on progress
    const startStratumIndex = Math.min(
      this.progress.lastSafeStratum,
      this.progress.deepestUnlocked,
    );
    if (startStratumIndex > 0 && startStratumIndex < this.unifiedGrid.strataOffsets.length) {
      const offset = this.unifiedGrid.strataOffsets[startStratumIndex];
      // Find the start room of the target stratum (first row, search for a non-null critical path cell)
      const startRow = offset.rowOffset;
      let startCol = 0;
      for (let c = 0; c < this.unifiedGrid.totalWidth; c++) {
        const cell = this.unifiedGrid.cells[startRow][c];
        if (cell && cell.onCriticalPath) { startCol = c; break; }
      }
      this.currentCol = startCol;
      this.currentRow = startRow;
    } else {
      this.currentCol = this.unifiedGrid.startRoom.col;
      this.currentRow = this.unifiedGrid.startRoom.absoluteRow;
    }

    // Derive current stratum from cell
    const startCell = this.unifiedGrid.cells[this.currentRow][this.currentCol];
    this.currentStratumIndex = startCell?.stratumIndex ?? 0;
    this.currentStratumDef = this.strataConfig.strata[this.currentStratumIndex];

    // Tilemap
    this.tilemap = new TilemapRenderer(TILE_SIZE);
    this.tilemap.setTheme(this.currentStratumDef.theme);
    this.container.addChild(this.tilemap.container);

    // Entity layer
    this.entityLayer = new Container();
    this.container.addChild(this.entityLayer);

    // Player (clone stats from world player)
    this.player = new Player(this.game);
    this.player.hp = this.sourcePlayer.hp;
    this.player.maxHp = this.sourcePlayer.maxHp;
    this.player.atk = this.sourcePlayer.atk;
    this.player.def = this.sourcePlayer.def;
    this.player.abilities.wallJump = this.sourcePlayer.abilities.wallJump;
    this.player.abilities.doubleJump = this.sourcePlayer.abilities.doubleJump;
    this.entityLayer.addChild(this.player.container);

    // Damage numbers & Sakurai hit effects
    this.dmgNumbers = new DamageNumberManager(this.entityLayer);
    this.hitSparks = new HitSparkManager(this.entityLayer);
    this.screenFlash = new ScreenFlash();
    this.game.app.stage.addChild(this.screenFlash.overlay);

    // Fade overlay
    this.fadeOverlay = new Graphics();
    this.fadeOverlay.rect(0, 0, 960, 544).fill(0x000000); // large enough for any room
    this.fadeOverlay.alpha = 0;
    this.container.addChild(this.fadeOverlay);

    // Minimap
    // Minimap — always visible for debug/navigation
    this.miniMapContainer = new Container();
    this.game.app.stage.addChild(this.miniMapContainer);

    // HUD
    this.hud = new HUD();
    this.game.app.stage.addChild(this.hud.container);

    // Controls overlay
    this.controlsOverlay = new ControlsOverlay();
    this.game.app.stage.addChild(this.controlsOverlay.container);

    // Toast
    this.toast = new ToastManager(this.game.app.stage);

    // Thought bubble (monologue above player)
    this.thought = new ThoughtBubble();
    this.entityLayer.addChild(this.thought.container);

    // Restore persistent exploration state & count rooms
    this.restoreRoomState();
    this.countTotalRooms();

    // Build full map (all rooms rendered into a single continuous grid)
    this.buildFullMap();
    this.updateHudText();

    // Spawn player at start cell — find valid floor tile in fullGrid
    const startCol = this.currentCol;
    const stratumStart = this.unifiedGrid.strataOffsets[this.currentStratumIndex]?.rowOffset ?? 0;
    const localStartRow = this.currentRow - stratumStart;
    const spawnCenterX = startCol * 512 + 256;
    const spawnTileCol = Math.floor(spawnCenterX / TILE_SIZE);
    const roomTopTile = localStartRow * 32;

    // Spawn at the very top of the room and let player fall
    const spawnY = roomTopTile * TILE_SIZE + 2;
    this.player.x = spawnCenterX;
    this.player.y = spawnY;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.savePrevPosition();

    // Camera
    this.game.camera.snap(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2);

    // First item world entry — landing monologue (Screen 10)
    if (this.game.stats.firstEchoStrike && !this.game.stats.firstItemWorldLanding) {
      this.game.stats.firstItemWorldLanding = true;
      setTimeout(() => {
        this.thought.show('...Where am I.', 3000);
        setTimeout(() => {
          this.thought.show("The crystal structure on these walls...\nit's the same as that sword.", 4000);
          setTimeout(() => {
            this.thought.show('Am I really inside it?', 3000);
          }, 4200);
        }, 3200);
      }, 1500);
    }

    this.initialized = true;
  }

  private countTotalRooms(): void {
    this.totalRooms = 0;
    for (let r = 0; r < this.unifiedGrid.totalHeight; r++) {
      for (let c = 0; c < this.unifiedGrid.totalWidth; c++) {
        const cell = this.unifiedGrid.cells[r][c];
        if (cell && cell.type !== 0) this.totalRooms++;
      }
    }
  }

  private getCell(col: number, row: number): UnifiedRoomCell | null {
    if (row < 0 || row >= this.unifiedGrid.totalHeight) return null;
    if (col < 0 || col >= this.unifiedGrid.totalWidth) return null;
    return this.unifiedGrid.cells[row][col];
  }

  private getCurrentCell(): UnifiedRoomCell {
    const row = this.unifiedGrid.cells[this.currentRow];
    if (!row) return this.unifiedGrid.cells[0][0]!; // fallback
    return row[this.currentCol] ?? this.unifiedGrid.cells[0][0]!;
  }

  private restoreRoomState(): void {
    const visited = new Set(this.progress.visitedRooms);
    const cleared = new Set(this.progress.clearedRooms);

    this.roomsCleared = 0;
    for (let r = 0; r < this.unifiedGrid.totalHeight; r++) {
      for (let c = 0; c < this.unifiedGrid.totalWidth; c++) {
        const cell = this.unifiedGrid.cells[r][c];
        if (!cell) continue;
        const key = `${c},${r}`;
        cell.visited = visited.has(key);
        cell.cleared = cleared.has(key);
        if (cell.cleared) this.roomsCleared++;
      }
    }
  }

  private persistRoomState(): void {
    const visited: string[] = [];
    const cleared: string[] = [];
    for (let r = 0; r < this.unifiedGrid.totalHeight; r++) {
      for (let c = 0; c < this.unifiedGrid.totalWidth; c++) {
        const cell = this.unifiedGrid.cells[r][c];
        if (!cell) continue;
        const key = `${c},${r}`;
        if (cell.visited) visited.push(key);
        if (cell.cleared) cleared.push(key);
      }
    }
    this.progress.visitedRooms = visited;
    this.progress.clearedRooms = cleared;
  }

  /** Check if a cell is a stratum end room (boss room) */
  private isStratumEndRoom(col: number, row: number): boolean {
    return this.unifiedGrid.stratumEndRooms.some(
      e => e.col === col && e.absoluteRow === row,
    );
  }

  /** Check if this is the final end room (deepest stratum boss) */
  private isFinalEndRoom(col: number, row: number): boolean {
    return col === this.unifiedGrid.endRoom.col &&
           row === this.unifiedGrid.endRoom.absoluteRow;
  }

  /**
   * Build the full map for the current stratum state.
   * Renders all room templates into a single continuous 2048×2048px grid.
   * Called from init() and on stratum transitions (replaces loadRoom).
   * Implements: System_ItemWorld_Core — full-map rendering spec.
   */
  private buildFullMap(): void {
    // Clear previous full map
    if (this.fullMapContainer?.parent) {
      this.fullMapContainer.parent.removeChild(this.fullMapContainer);
      this.fullMapContainer.destroy({ children: true }); // free GPU textures
    }
    this.fullMapContainer = new Container();
    this.spawnedRooms.clear();
    this.clearEnemies();
    this.clearEscapeAltar();
    this.exitTrigger = null;

    const GRID_W = 4, GRID_H = 4;   // 4×4 room grid
    const ROOM_TILES = 32;           // 32×32 tiles per room
    const FULL_TILES = GRID_W * ROOM_TILES; // 128 tiles total

    const _dbgRowStart = this.unifiedGrid.strataOffsets[this.currentStratumIndex]?.rowOffset ?? 0;
    const _dbgHeight = this.strataConfig.strata[this.currentStratumIndex]?.gridHeight ?? 4;
    console.log(`[ItemWorld] buildFullMap stratum=${this.currentStratumIndex} rowStart=${_dbgRowStart} gridSize=${this.unifiedGrid.totalWidth}x${_dbgHeight} templates=${this.ldtkTemplates.length}`);

    // Initialize full grid as solid (1) — unrendered regions remain impassable
    this.fullGrid = [];
    for (let r = 0; r < FULL_TILES; r++) {
      this.fullGrid[r] = new Array(FULL_TILES).fill(1);
    }

    // Place each room template into the full grid (current stratum only)
    const grid = this.unifiedGrid;
    const stratumRowStart = grid.strataOffsets[this.currentStratumIndex]?.rowOffset ?? 0;

    let roomCount = 0;
    for (let localRow = 0; localRow < GRID_H; localRow++) {
      const absRow = stratumRowStart + localRow;
      for (let col = 0; col < GRID_W; col++) {
        const cell = grid.cells[absRow]?.[col];
        // Fill ALL 16 cells with rooms (critical path + filler rooms)
        const rng = new PRNG(this.item.uid * 10000 + col * 100 + absRow);
        const ldtkLevel = this.pickLdtkTemplate(cell ?? null as any, rng);
        if (!ldtkLevel || !this.ldtkRenderer || !this.atlas) continue;

        const roomGrid = ldtkLevel.collisionGrid;
        const roomH = roomGrid.length;
        const roomW = roomGrid[0]?.length ?? 0;

        // Copy room collision data into fullGrid at LOCAL offset
        const offR = localRow * ROOM_TILES;
        const offC = col * ROOM_TILES;
        for (let tr = 0; tr < roomH && tr < ROOM_TILES; tr++) {
          for (let tc = 0; tc < roomW && tc < ROOM_TILES; tc++) {
            this.fullGrid[offR + tr][offC + tc] = roomGrid[tr][tc];
          }
        }

        // No sealing — all passages open in full-map mode

        // Render room tiles at pixel offset within fullMapContainer
        const roomContainer = new Container();
        roomContainer.x = col * 512;
        roomContainer.y = localRow * 512;
        const renderer = new LdtkRenderer();
        renderer.renderLevel(ldtkLevel.backgroundTiles, ldtkLevel.wallTiles, ldtkLevel.shadowTiles, this.atlas);
        roomContainer.addChild(renderer.container);
        this.fullMapContainer.addChild(roomContainer);

        roomCount++;
        // Mark start room as visited
        if (cell && col === this.currentCol && absRow === this.currentRow) {
          cell.visited = true;
        }

        // Exit portal spawned on boss death, not pre-placed
      }
    }

    // Seal visuals: dark background = already black where no tiles rendered.
    // Explicit visual pass handles remaining details.
    this.addFullMapSealVisuals();

    // Insert map container at bottom of scene (below entity layer)
    this.container.addChildAt(this.fullMapContainer, 0);

    // Set collision and camera to full 128×128 tile map
    this.roomData = this.fullGrid;
    this.player.roomData = this.fullGrid;
    this.game.camera.setBounds(0, 0, FULL_TILES * TILE_SIZE, FULL_TILES * TILE_SIZE);

    this.persistRoomState();
    this.drawMiniMap();
  }

  /**
   * Seal passages in fullGrid at the edges of a room cell that have no neighbor.
   * Writes solid tiles (1) over the passage area (SEAL_DEPTH tiles deep).
   */
  private sealCellExits(cell: UnifiedRoomCell, offC: number, offR: number, size: number): void {
    const SEAL = ItemWorldScene.SEAL_DEPTH;
    const FULL_H = this.fullGrid.length;
    const FULL_W = this.fullGrid[0]?.length ?? 0;

    if (!cell.exits.left) {
      for (let r = offR; r < offR + size && r < FULL_H; r++)
        for (let c = offC; c < offC + SEAL && c < FULL_W; c++)
          this.fullGrid[r][c] = 1;
    }
    if (!cell.exits.right) {
      for (let r = offR; r < offR + size && r < FULL_H; r++)
        for (let c = offC + size - SEAL; c < offC + size && c < FULL_W; c++)
          this.fullGrid[r][c] = 1;
    }
    if (!cell.exits.up) {
      for (let r = offR; r < offR + SEAL && r < FULL_H; r++)
        for (let c = offC; c < offC + size && c < FULL_W; c++)
          this.fullGrid[r][c] = 1;
    }
    if (!cell.exits.down) {
      for (let r = offR + size - SEAL; r < offR + size && r < FULL_H; r++)
        for (let c = offC; c < offC + size && c < FULL_W; c++)
          this.fullGrid[r][c] = 1;
    }
  }

  /**
   * Add seal visuals over passages that have no neighbor.
   * Unrendered cells are already dark (scene background). This is a no-op for now
   * because the dark background naturally covers solid regions.
   */
  private addFullMapSealVisuals(): void {
    if (!this.fullMapContainer) return;
    // No explicit graphics needed: solid tiles in fullGrid have no tile sprites rendered,
    // so they show as the dark scene background color. This keeps them visually sealed.
  }

  /**
   * Spawn enemies in the given room cell (lazy — triggered on first player entry).
   * Replaces the per-room spawnEnemies() used in loadRoom().
   */
  private spawnEnemiesInRoom(col: number, row: number): void {
    const cell = this.unifiedGrid.cells[row]?.[col];
    if (!cell || cell.cleared) return;

    const stratumDef = this.strataConfig.strata[cell.stratumIndex ?? 0];
    const stratumStart = this.unifiedGrid.strataOffsets[this.currentStratumIndex]?.rowOffset ?? 0;
    const localRow = row - stratumStart;
    const offX = col * 512;
    const offY = localRow * 512;

    const dist = Math.abs(col - this.unifiedGrid.startRoom.col)
               + Math.abs(row - this.unifiedGrid.startRoom.absoluteRow);
    const count = 2 + Math.floor(dist * 0.5) + stratumDef.enemyCountBonus;
    const distScale = 1 + dist * 0.1;

    // Pre-compute all valid spawn positions: air tile with solid tile below
    const roomTopRow = Math.floor(offY / TILE_SIZE);
    const roomTopCol = Math.floor(offX / TILE_SIZE);
    const spawnPoints: Array<{ x: number; y: number }> = [];

    for (let tc = roomTopCol + 2; tc < roomTopCol + 30; tc++) {
      for (let tr = roomTopRow + 2; tr < roomTopRow + 30; tr++) {
        const here = this.fullGrid[tr]?.[tc] ?? 1;
        const below = this.fullGrid[tr + 1]?.[tc] ?? 1;
        // Air tile with solid floor below = valid spawn
        if (here === 0 && below >= 1) {
          spawnPoints.push({ x: tc * TILE_SIZE, y: (tr + 1) * TILE_SIZE });
        }
      }
    }

    if (spawnPoints.length === 0) return;

    const pickSpawn = (rng: PRNG, entityH: number) => {
      const pt = spawnPoints[rng.nextInt(0, spawnPoints.length - 1)];
      return { x: pt.x, y: pt.y - entityH };
    };

    const isEndRoom = this.isStratumEndRoom(col, row);
    console.log(`[ItemWorld] spawnEnemiesInRoom col=${col} row=${row} stratum=${cell.stratumIndex} isEndRoom=${isEndRoom} endRooms=${JSON.stringify(this.unifiedGrid.stratumEndRooms)}`);
    if (isEndRoom) {
      const boss = new Skeleton();
      (boss as any)._isBoss = true;
      boss.hp = boss.maxHp = stratumDef.bossHp;
      boss.atk = stratumDef.bossAtk;
      const visualScale = 1.5 + (cell.stratumIndex ?? 0) * 0.2;
      boss.container.scale.set(visualScale);
      const bossRng = new PRNG(this.item.uid * 999 + col * 77 + row * 33);
      const sp = pickSpawn(bossRng, boss.height * visualScale);
      boss.x = sp.x;
      boss.y = sp.y;
      boss.roomData = this.fullGrid;
      boss.target = this.player;
      this.enemies.push(boss);
      this.entityLayer.addChild(boss.container);
      return;
    }

    for (let i = 0; i < count; i++) {
      const spawnRng = new PRNG(this.item.uid * 999 + col * 77 + row * 33 + i);

      // 15% chance to spawn an InnocentNPC instead of a regular enemy.
      // Only spawn if the item still has open innocent slots.
      const innocentRoll = spawnRng.next();
      if (innocentRoll < INNOCENT_SPAWN_CHANCE && canAddInnocent(this.item)) {
        const stratumIndex = cell.stratumIndex ?? 0;
        const seedForArchetype = this.item.uid + col * 13 + row * 7 + i;
        const innocent = createRandomInnocent(seedForArchetype, stratumIndex);

        const npc = new InnocentNPC();
        npc.innocent = innocent;
        npc.onSubdued = () => {
          innocent.isSubdued = true;
          addInnocent(this.item, innocent);
          this.toast.show(`${innocent.name} subdued! +${innocent.value} ${innocent.stat}`, 0xffdd44);
          this.updateHudText();
        };

        const sp = pickSpawn(spawnRng, npc.height);
        npc.x = sp.x;
        npc.y = sp.y;
        npc.roomData = this.fullGrid;
        npc.target = this.player;
        this.enemies.push(npc);
        this.entityLayer.addChild(npc.container);
        continue;
      }

      const isGhost = spawnRng.next() < 0.3;
      const enemy = isGhost ? new Ghost() : new Skeleton();
      enemy.hp = enemy.maxHp = Math.floor(stratumDef.enemyHp * distScale);
      enemy.atk = Math.floor(stratumDef.enemyAtk * distScale);
      const sp = pickSpawn(spawnRng, enemy.height);
      enemy.x = sp.x;
      enemy.y = sp.y;
      enemy.roomData = this.fullGrid;
      enemy.target = this.player;
      this.enemies.push(enemy);
      this.entityLayer.addChild(enemy.container);
    }
  }

  private loadRoom(enterFrom: 'left' | 'right' | 'up' | 'down'): void {
    const cell = this.getCurrentCell();
    const roomRng = new PRNG(this.item.uid * 10000 + this.currentCol * 100 + this.currentRow);

    // Clear previous seal BEFORE creating new one
    if (this.sealGfx?.parent) this.sealGfx.parent.removeChild(this.sealGfx);
    this.sealGfx = null;

    // Pick room: LDtk template → code template → ChunkAssembler fallback
    const ldtkLevel = this.pickLdtkTemplate(cell, roomRng);
    this.currentLdtkLevel = ldtkLevel;
    if (ldtkLevel && this.ldtkRenderer && this.atlas) {
      // Use LDtk hand-crafted template with tile rendering
      this.roomData = ldtkLevel.collisionGrid.map(row => [...row]);
      this.tilemap.container.visible = false;
      this.ldtkRenderer.clear();
      this.ldtkRenderer.renderLevel(ldtkLevel.backgroundTiles, ldtkLevel.wallTiles, ldtkLevel.shadowTiles, this.atlas);
      if (!this.ldtkRenderer.container.parent) {
        this.container.addChildAt(this.ldtkRenderer.container, 0);
      }
    } else {
      // Code template or ChunkAssembler fallback
      const template = this.pickTemplateForCell(cell, roomRng);
      if (template) {
        this.roomData = resolveTiles(template.grid, roomRng);
      } else {
        this.roomData = assembleRoom(cell, roomRng);
      }
      if (this.ldtkRenderer) this.ldtkRenderer.clear();
      this.tilemap.container.visible = true;
      this.tilemap.loadRoom(this.roomData);
    }
    // Seal passages that don't connect to a neighbor cell
    this.sealUnusedExits(cell);
    this.player.roomData = this.roomData;

    // Update camera bounds for current room size (template rooms are 32×16, legacy 60×34)
    // Camera bounds = single room (offset applied by entityLayer)
    this.game.camera.setBounds(0, 0, this.roomW * TILE_SIZE, this.roomH * TILE_SIZE);

    // Update stratum context from cell
    const prevStratumIndex = this.currentStratumIndex;
    this.currentStratumIndex = cell.stratumIndex;
    this.currentStratumDef = this.strataConfig.strata[this.currentStratumIndex];
    this.tilemap.setTheme(this.currentStratumDef.theme);

    // Stratum change toast
    if (prevStratumIndex !== this.currentStratumIndex) {
      this.toast.show(`Stratum ${this.currentStratumIndex + 1} — Deeper...`, 0xff4488);

      // Update progress on stratum descent
      if (this.currentStratumIndex > prevStratumIndex) {
        if (this.progress.deepestUnlocked < this.currentStratumIndex) {
          this.progress.deepestUnlocked = this.currentStratumIndex;
        }
        this.progress.lastSafeStratum = this.currentStratumIndex;
      }
    }

    const spawnSide = this.getOppositeDirection(enterFrom);
    // Fixed spawn at standardized door positions (center of 32×32 room)
    const DOOR_POS = 15; // tile 15 = center of row/col 14~17 range
    const rW = this.roomW;
    const rH = this.roomH;
    let spawnX: number, spawnY: number;
    switch (spawnSide) {
      case 'left':  spawnX = 2 * TILE_SIZE;          spawnY = DOOR_POS * TILE_SIZE; break;
      case 'right': spawnX = (rW - 3) * TILE_SIZE;   spawnY = DOOR_POS * TILE_SIZE; break;
      case 'up':    spawnX = DOOR_POS * TILE_SIZE;    spawnY = 2 * TILE_SIZE;        break;
      case 'down': default: spawnX = DOOR_POS * TILE_SIZE; spawnY = (rH - 3) * TILE_SIZE; break;
    }
    this.player.x = spawnX;
    this.player.y = spawnY;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.savePrevPosition();

    // Generate door triggers based on actual room dimensions
    this.doorTriggers = this.buildDoorTriggers(cell);
    this.clearEnemies();
    this.clearEscapeAltar();
    // Note: sealGfx is cleared at TOP of loadRoom before sealUnusedExits creates new one

    if (!cell.cleared) {
      this.spawnEnemies();
    }

    // Door markers disabled — LDtk passages are visible in the tilemap
    // this.drawDoorMarkers(cell);

    // Stratum end room — boss + descent/exit trigger
    const isEndRoom = this.isStratumEndRoom(this.currentCol, this.currentRow);

    if (this.exitVisual?.parent) this.exitVisual.parent.removeChild(this.exitVisual);
    this.exitVisual = null;

    if (isEndRoom) {
      if (!cell.cleared) {
        this.spawnBoss();
      }
      const exitX = (this.roomW / 2 - 1) * TILE_SIZE;
      const exitY = (this.roomH - 4) * TILE_SIZE;
      this.exitTrigger = { x: exitX, y: exitY, width: 3 * TILE_SIZE, height: 3 * TILE_SIZE };

      // Visual: blue for descent, gold for final exit
      const isFinal = this.isFinalEndRoom(this.currentCol, this.currentRow);
      const baseColor = isFinal ? 0xcc8844 : 0x4444cc;
      const midColor = isFinal ? 0xddaa55 : 0x5555dd;
      const topColor = isFinal ? 0xeebb66 : 0x6666ff;

      this.exitVisual = new Graphics();
      this.exitVisual.rect(0, 24, 48, 16).fill(baseColor);
      this.exitVisual.rect(8, 16, 32, 8).fill(midColor);
      this.exitVisual.rect(16, 8, 16, 8).fill(topColor);
      this.exitVisual.rect(18, -4, 12, 10).fill(0xffff44);
      this.exitVisual.rect(22, -10, 4, 6).fill(0xffff88);
      this.exitVisual.x = exitX;
      this.exitVisual.y = exitY;
      this.entityLayer.addChild(this.exitVisual);
    } else {
      this.exitTrigger = null;
      // Escape altar — spawn in non-start, non-end, critical path rooms
      this.trySpawnEscapeAltar(cell);
    }

    this.game.camera.snap(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2);
    cell.visited = true;
    this.persistRoomState();
    this.drawMiniMap();
  }

  /** Build door triggers matching actual room size + template door positions */
  private buildDoorTriggers(cell: UnifiedRoomCell): Array<{ x: number; y: number; width: number; height: number; direction: 'left'|'right'|'up'|'down' }> {
    const triggers: Array<{ x: number; y: number; width: number; height: number; direction: 'left'|'right'|'up'|'down' }> = [];
    const rW = this.roomW;
    const rH = this.roomH;
    const grid = this.roomData;
    const T = TILE_SIZE;
    const doorThick = 2 * T;
    const doorLen = 6 * T;

    // Fixed door positions at center (tiles 13~18)
    const DOOR_START = 13 * T;
    const DOOR_SIZE = 6 * T;

    if (cell.exits.left) {
      triggers.push({ x: 0, y: DOOR_START, width: T, height: DOOR_SIZE, direction: 'left' });
    }
    if (cell.exits.right) {
      triggers.push({ x: (rW - 1) * T, y: DOOR_START, width: T, height: DOOR_SIZE, direction: 'right' });
    }
    if (cell.exits.up) {
      triggers.push({ x: DOOR_START, y: 0, width: DOOR_SIZE, height: T, direction: 'up' });
    }
    if (cell.exits.down) {
      triggers.push({ x: DOOR_START, y: (rH - 1) * T, width: DOOR_SIZE, height: T, direction: 'down' });
    }
    return triggers;
  }

  /** Seal depth for blocked passages (4 tiles thick) */
  private static readonly SEAL_DEPTH = 2;
  private sealGfx: Container | Graphics | null = null;
  private currentLdtkLevel: LdtkLevel | null = null;

  /**
   * Seal passages on edges that don't connect to a neighbor cell.
   * Fills 4 tiles deep with walls (1) in collision grid + renders auto-tiled sprites.
   */
  private sealUnusedExits(cell: UnifiedRoomCell): void {
    const grid = this.roomData;
    const h = grid.length;
    const w = grid[0]?.length ?? 0;
    const D = ItemWorldScene.SEAL_DEPTH;


    // Track which tiles change from open(0) to wall(1)
    const changed: Array<[number, number]> = []; // [col, row]

    const seal = (r: number, c: number) => {
      if (r >= 0 && r < h && c >= 0 && c < w && grid[r][c] === 0) {
        grid[r][c] = 1;
        changed.push([c, r]);
      }
    };

    if (!cell.exits.left) {
      for (let r = 0; r < h; r++) for (let c = 0; c < D; c++) seal(r, c);
    }
    if (!cell.exits.right) {
      for (let r = 0; r < h; r++) for (let c = w - D; c < w; c++) seal(r, c);
    }
    if (!cell.exits.up) {
      for (let r = 0; r < D; r++) for (let c = 0; c < w; c++) seal(r, c);
    }
    if (!cell.exits.down) {
      for (let r = h - D; r < h; r++) for (let c = 0; c < w; c++) seal(r, c);
    }


    if (changed.length > 0) {
      this.addSealSprites(changed);
    }
  }

  /** Render seal visuals */
  private addSealSprites(changed: Array<[number, number]>): void {
    if (changed.length === 0) return;
    const T = TILE_SIZE;

    const sealContainer = new Container();
    const gfx = new Graphics();
    // 4×4 pixel brick pattern (each cell = 4×4 px, tile = 16×16 px = 4×4 cells)
    const BRICK_W = 4;
    const BRICK_H = 4;
    const colors = [0x3a3a4a, 0x33334a, 0x404050, 0x383848]; // stone variations
    const mortar = 0x222233;

    for (const [c, r] of changed) {
      const x = c * T;
      const y = r * T;

      // Fill mortar background
      gfx.rect(x, y, T, T).fill(mortar);

      // Draw 4×4 brick grid (4 bricks per row, 4 rows)
      for (let by = 0; by < 4; by++) {
        const offset = (by + r) % 2 === 0 ? 0 : 2; // offset every other row
        for (let bx = 0; bx < 4; bx++) {
          const brickX = x + ((bx * BRICK_W + offset * (BRICK_W / 2)) % T);
          const brickY = y + by * BRICK_H;
          const color = colors[(bx + by + c + r) % colors.length];
          gfx.rect(brickX, brickY, BRICK_W - 1, BRICK_H - 1).fill(color);
        }
      }
    }
    sealContainer.addChild(gfx);

    this.sealGfx = sealContainer;
    this.container.addChild(sealContainer);
  }

  /** Find open tile (0) on a room edge closest to hint position. Returns row for L/R, col for U/D. */
  private findEdgeOpen(grid: number[][], edge: 'left'|'right'|'up'|'down', hint = -1): number {
    const h = grid.length;
    const w = grid[0]?.length ?? 0;
    const openTiles: number[] = [];

    switch (edge) {
      case 'left':
        for (let r = 0; r < h; r++) if (grid[r][0] === 0) openTiles.push(r);
        break;
      case 'right':
        for (let r = 0; r < h; r++) if (grid[r][w - 1] === 0) openTiles.push(r);
        break;
      case 'up':
        for (let c = 0; c < w; c++) if (grid[0][c] === 0) openTiles.push(c);
        break;
      case 'down':
        for (let c = 0; c < w; c++) if (grid[h - 1][c] === 0) openTiles.push(c);
        break;
    }

    if (openTiles.length === 0) {
      const len = (edge === 'left' || edge === 'right') ? h : w;
      return Math.floor(len / 2);
    }

    // Pick closest to hint (player's previous position)
    if (hint >= 0) {
      let best = openTiles[0];
      for (const t of openTiles) if (Math.abs(t - hint) < Math.abs(best - hint)) best = t;
      return best;
    }

    // No hint: pick middle of open range
    return openTiles[Math.floor(openTiles.length / 2)];
  }

  /** Find floor Y in current room at given tile column */
  private findFloorY(tileX: number): number {
    const grid = this.roomData;
    const cx = Math.max(0, Math.min(tileX, (grid[0]?.length ?? 1) - 1));
    for (let row = grid.length - 1; row >= 0; row--) {
      if (grid[row][cx] >= 1) return row * TILE_SIZE - this.player.height;
    }
    return (grid.length - 2) * TILE_SIZE - this.player.height;
  }

  /** Current room dimensions in tiles (varies with template vs legacy) */
  private get roomW(): number { return this.roomData[0]?.length ?? ROOM_W; }
  private get roomH(): number { return this.roomData.length ?? ROOM_H; }

  /**
   * Pick an LDtk template based on the cell's role → RoomType enum.
   * Start room → "Start", boss room → "Boss", otherwise → "Combat" (with small
   * chance for Treasure/Rest/Puzzle on non-critical-path rooms).
   */
  private pickLdtkTemplate(cell: UnifiedRoomCell | null, rng: PRNG): LdtkLevel | null {
    if (this.ldtkTemplates.length === 0) return null;

    // Determine desired RoomType based on cell role
    let desiredType: string;
    if (!cell) {
      desiredType = 'Combat';
    } else {
      const isStart = cell.col === this.unifiedGrid.startRoom.col
        && cell.absoluteRow === this.unifiedGrid.startRoom.absoluteRow;
      const isBoss = this.isStratumEndRoom(cell.col, cell.absoluteRow);

      if (isStart) {
        desiredType = 'Start';
      } else if (isBoss) {
        desiredType = 'Boss';
      } else if (!cell.onCriticalPath) {
        // Off-path rooms: 60% Combat, 20% Treasure, 10% Rest, 10% Puzzle
        const roll = rng.next();
        if (roll < 0.20) desiredType = 'Treasure';
        else if (roll < 0.30) desiredType = 'Rest';
        else if (roll < 0.40) desiredType = 'Puzzle';
        else desiredType = 'Combat';
      } else {
        desiredType = 'Combat';
      }
    }

    // Filter templates by roomType
    const matching = this.ldtkTemplates.filter(t => t.roomType === desiredType);
    if (matching.length > 0) {
      return matching[rng.nextInt(0, matching.length - 1)];
    }

    // Fallback: any template
    return this.ldtkTemplates[rng.nextInt(0, this.ldtkTemplates.length - 1)];
  }

  /** Map cell exits to template exits and pick a matching template */
  private pickTemplateForCell(cell: UnifiedRoomCell, rng: PRNG): RoomTemplate | null {
    const exits: ExitDir[] = [];
    if (cell.exits.left) exits.push('L');
    if (cell.exits.right) exits.push('R');
    if (cell.exits.up) exits.push('U');
    if (cell.exits.down) exits.push('D');
    if (exits.length === 0) return null;
    return pickTemplate(exits, rng);
  }

  private spawnEnemies(): void {
    const floorY = (this.roomH - 3) * TILE_SIZE;
    const def = this.currentStratumDef;
    // Distance from the unified start room
    const dist = Math.abs(this.currentCol - this.unifiedGrid.startRoom.col)
               + Math.abs(this.currentRow - this.unifiedGrid.startRoom.absoluteRow);
    const count = 2 + Math.floor(dist * 0.5) + def.enemyCountBonus;
    // Distance scaling: +10% HP/ATK per tile from start
    const distScale = 1 + dist * 0.1;

    for (let i = 0; i < count; i++) {
      const spawnRng = new PRNG(this.item.uid * 999 + this.currentCol * 77 + this.currentRow * 33 + i);
      const isGhost = spawnRng.next() < 0.3;
      const enemy = isGhost ? new Ghost() : new Skeleton();
      // Use absolute stats from StrataConfig instead of scaling base enemy stats
      enemy.hp = enemy.maxHp = Math.floor(def.enemyHp * distScale);
      enemy.atk = Math.floor(def.enemyAtk * distScale);

      enemy.x = spawnRng.nextInt(4, this.roomW - 5) * TILE_SIZE;
      enemy.y = floorY - enemy.height;
      enemy.roomData = this.roomData;
      enemy.target = this.player;
      this.enemies.push(enemy);
      this.entityLayer.addChild(enemy.container);
    }
  }

  private spawnBoss(): void {
    const floorY = (this.roomH - 3) * TILE_SIZE;
    const def = this.currentStratumDef;
    const boss = new Guardian();
    boss.hp = boss.maxHp = def.bossHp;
    boss.atk = def.bossAtk;
    boss.x = (this.roomW / 2) * TILE_SIZE;
    boss.y = floorY - boss.height;
    boss.roomData = this.roomData;
    boss.target = this.player;
    this.enemies.push(boss);
    this.entityLayer.addChild(boss.container);
  }

  private drawDoorMarkers(cell: RoomCell): void {
    for (const m of this.doorMarkers) {
      if (m.parent) m.parent.removeChild(m);
    }
    this.doorMarkers = [];

    const doorH = 4 * TILE_SIZE;
    const markerW = 4;

    if (cell.exits.left) {
      const marker = new Graphics();
      marker.rect(0, 0, markerW, doorH).fill({ color: 0x44ff44, alpha: 0.6 });
      marker.x = 0;
      marker.y = 6 * TILE_SIZE;
      this.entityLayer.addChild(marker);
      this.doorMarkers.push(marker);
    }

    if (cell.exits.right) {
      const marker = new Graphics();
      marker.rect(0, 0, markerW, doorH).fill({ color: 0x44ff44, alpha: 0.6 });
      marker.x = (this.roomW - 1) * TILE_SIZE;
      marker.y = 6 * TILE_SIZE;
      this.entityLayer.addChild(marker);
      this.doorMarkers.push(marker);
    }

    if (cell.exits.down) {
      const cx = Math.floor(this.roomW / 2) * TILE_SIZE;
      const marker = new Graphics();
      marker.rect(0, 0, 3 * TILE_SIZE, markerW).fill({ color: 0x44ff44, alpha: 0.6 });
      marker.rect(TILE_SIZE, markerW, TILE_SIZE, 6).fill({ color: 0x44ff44, alpha: 0.8 });
      marker.x = cx - TILE_SIZE;
      marker.y = (this.roomH - 1) * TILE_SIZE - markerW;
      this.entityLayer.addChild(marker);
      this.doorMarkers.push(marker);
    }

    if (cell.exits.up) {
      const cx = Math.floor(this.roomW / 2) * TILE_SIZE;
      const marker = new Graphics();
      marker.rect(0, 0, 3 * TILE_SIZE, markerW).fill({ color: 0x44ff44, alpha: 0.6 });
      marker.rect(TILE_SIZE, -6, TILE_SIZE, 6).fill({ color: 0x44ff44, alpha: 0.8 });
      marker.x = cx - TILE_SIZE;
      marker.y = 0;
      this.entityLayer.addChild(marker);
      this.doorMarkers.push(marker);
    }
  }

  private clearEnemies(): void {
    for (const e of this.enemies) {
      if (e.container.parent) e.container.parent.removeChild(e.container);
    }
    this.enemies = [];
    for (const p of this.projectiles) p.destroy();
    this.projectiles = [];
  }

  private getOppositeDirection(dir: 'left' | 'right' | 'up' | 'down'): 'left' | 'right' | 'up' | 'down' {
    switch (dir) {
      case 'left': return 'right';
      case 'right': return 'left';
      case 'up': return 'down';
      case 'down': return 'up';
    }
  }

  enter(): void {
    this.showOnboarding();
  }

  private initialized = false;

  update(dt: number): void {
    if (!this.initialized) return;

    // Toast & thought bubble always update
    this.toast.update(dt);
    this.thought.update(dt);
    this.thought.updatePosition(
      this.player.x + this.player.width / 2,
      this.player.y,
    );

    // Onboarding blocks gameplay
    if (!this.onboardingDone) {
      if (this.game.input.isJustPressed(GameAction.ATTACK)) {
        this.advanceOnboarding();
      }
      return;
    }

    // ESC to toggle escape confirm
    if (this.game.input.isJustPressed(GameAction.MENU)) {
      if (this.escapeConfirmVisible) {
        this.hideEscapeConfirm();
      } else {
        this.showEscapeConfirm();
      }
      return;
    }

    if (this.escapeConfirmVisible) {
      if (this.game.input.isJustPressed(GameAction.ATTACK)) {
        this.hideEscapeConfirm();
        this.startExitFade();
        return;
      }
      if (this.game.input.isJustPressed(GameAction.DASH) ||
          this.game.input.isJustPressed(GameAction.JUMP)) {
        this.hideEscapeConfirm();
      }
      return;
    }

    if (this.transitionState !== 'none') {
      this.updateTransition(dt);
      return;
    }

    this.player.update(dt);

    if (this.player.isDead) {
      // Death penalty: lose 30% earned EXP, drop back one stratum
      const penalty = Math.floor(this.earnedExp * 0.3);
      this.earnedExp = Math.max(0, this.earnedExp - penalty);
      if (this.currentStratumIndex > 0) {
        this.progress.lastSafeStratum = this.currentStratumIndex - 1;
      }
      this.persistRoomState();
      this.player.respawn();
      this.startExitFade();
      return;
    }

    // Update enemies
    for (const enemy of this.enemies) enemy.update(dt);

    // Player attacks — Sakurai full feedback chain
    if (this.player.isAttackActive()) {
      const targets = this.enemies.filter(e => e.alive) as CombatEntity[];
      const hits = this.hitManager.checkHits(this.player, this.player.comboIndex, this.player.hitList, targets);
      for (const hit of hits) {
        this.dmgNumbers.spawn(hit.hitX, hit.hitY - 8, hit.damage, hit.heavy, hit.critical);
        this.hitSparks.spawn(hit.hitX, hit.hitY, hit.heavy, hit.dirX);
        if (hit.heavy) this.screenFlash.flashHit(true);
      }
    }

    // Check for kills AFTER combat (checkHits may have set alive=false)
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (!enemy.alive && !(enemy as any)._expGranted) {
        (enemy as any)._expGranted = true;
        if (!(enemy instanceof InnocentNPC)) {
          const killExp = Math.floor(BASE_EXP_PER_KILL * this.currentStratumDef.expMultiplier);
          addItemExp(this.item, killExp);
          this.earnedExp += killExp;
          this.toast.show(`+${killExp} EXP`, 0x88ccff);
        }
      }
      if (enemy.shouldRemove) {
        if (enemy.container.parent) enemy.container.parent.removeChild(enemy.container);
        this.enemies.splice(i, 1);
      }
    }

    // Collect Ghost projectiles
    for (const enemy of this.enemies) {
      if (enemy instanceof Ghost && enemy.alive) {
        for (const proj of enemy.pendingProjectiles) {
          this.projectiles.push(proj);
          this.entityLayer.addChild(proj.container);
        }
        enemy.pendingProjectiles.length = 0;
      }
    }

    // Update projectiles & check player collision
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.update(dt);
      if (!proj.alive) {
        proj.destroy();
        this.projectiles.splice(i, 1);
        continue;
      }
      if (!this.player.invincible && this.player.hp > 0) {
        const overlap = aabbOverlap(
          { x: proj.x, y: proj.y, width: proj.width, height: proj.height },
          { x: this.player.x, y: this.player.y, width: this.player.width, height: this.player.height },
        );
        if (overlap) {
          const dir = proj.vx > 0 ? 1 : -1;
          const dmg = Math.max(1, proj.atk - this.player.def * 0.5);
          this.player.onHit(dir * 80, -40, 150);
          this.player.hp -= dmg;
          this.player.invincible = true;
          this.player.invincibleTimer = 500;
          this.player.startVibrate(3, 4, true);
          this.player.triggerFlash();
          this.game.hitstopFrames = 2;
          this.game.camera.shakeDirectional(2, dir, -0.2);
          this.screenFlash.flashDamage(false);
          this.hitSparks.spawn(this.player.x + this.player.width / 2, this.player.y + this.player.height * 0.4, false, -dir);
          this.dmgNumbers.spawn(this.player.x + this.player.width / 2, this.player.y + this.player.height * 0.4 - 8, dmg, false);
          if (this.player.hp <= 0) {
            this.player.hp = 0;
            this.player.onDeath();
            this.game.hitstopFrames = 8;
            this.screenFlash.flashDamage(true);
          }
          proj.alive = false;
          proj.destroy();
          this.projectiles.splice(i, 1);
        }
      }
    }

    // Enemy attacks — Sakurai: player hit feedback
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      if ((enemy instanceof Skeleton || enemy instanceof Guardian) && enemy.isAttackActive()) {
        if (this.player.invincible || this.player.hp <= 0) continue;
        const dx = Math.abs((enemy.x + enemy.width / 2) - (this.player.x + this.player.width / 2));
        const dy = Math.abs((enemy.y + enemy.height / 2) - (this.player.y + this.player.height / 2));
        if (dx < enemy.width + this.player.width && dy < Math.max(enemy.height, this.player.height)) {
          const dir = enemy.facingRight ? 1 : -1;
          const dmg = Math.max(1, enemy.atk - this.player.def * 0.5);
          this.player.onHit(dir * 100, -50, 200);
          this.player.hp -= dmg;
          this.player.invincible = true;
          this.player.invincibleTimer = 500;

          // Sakurai feedback
          this.player.startVibrate(4, 5, true);
          this.player.triggerFlash();
          this.game.hitstopFrames = 3;
          this.game.camera.shakeDirectional(3, dir, -0.3);
          this.screenFlash.flashDamage(dmg > 20);
          this.hitSparks.spawn(
            this.player.x + this.player.width / 2,
            this.player.y + this.player.height * 0.4,
            false, -dir,
          );

          if (this.player.hp <= 0) {
            this.player.hp = 0;
            this.player.onDeath();
            this.game.hitstopFrames = 8;
            this.screenFlash.flashDamage(true);
          }
        }
      }
    }

    // Boss killed check — spawn exit portal at boss death location
    // Check ALL dead bosses regardless of exitTrigger state
    for (const enemy of this.enemies) {
      if (!enemy.alive && (enemy as any)._isBoss && !(enemy as any)._portalSpawned) {
        (enemy as any)._portalSpawned = true;
        const cell = this.getCurrentCell();
        cell.cleared = true;

        // Level up
        const prevLevel = this.item.level;
        itemLevelUp(this.item);
        if (this.item.level > prevLevel) {
          this.toast.show(`${this.item.def.name} Level Up! Lv${this.item.level}`, 0xffaa00);
        }

        // Remove any existing escape altar so portal is the only interactable
        this.clearEscapeAltar();

        // Spawn red portal at boss death position
        const portalGfx = new Graphics();
        // Outer glow
        portalGfx.rect(-28, -32, 56, 48).fill({ color: 0xff0000, alpha: 0.25 });
        // Portal body
        portalGfx.rect(-20, -28, 40, 40).fill(0xcc0000);
        portalGfx.rect(-14, -24, 28, 32).fill(0xff2222);
        // Inner bright core
        portalGfx.rect(-8, -20, 16, 24).fill(0xff6666);
        portalGfx.rect(-4, -16, 8, 16).fill(0xffaaaa);
        const px = enemy.x + enemy.width / 2;
        const py = enemy.y + enemy.height;
        portalGfx.x = px;
        portalGfx.y = py;
        this.entityLayer.addChild(portalGfx);

        this.exitTrigger = {
          x: px - 24, y: py - 32,
          width: 48, height: 48,
        };

        console.log(`[ItemWorld] Boss portal spawned at (${px}, ${py}) exitTrigger=`, this.exitTrigger);
        this.toast.show('BOSS DEFEATED! Red portal opened — press UP.', 0xff4444);
        this.game.hitstopFrames = 12;
        this.game.camera.shake(4);
        break;
      }
    }

    // Exit trigger — walk into boss portal
    if (this.exitTrigger) {
      const pb = { x: this.player.x, y: this.player.y, width: this.player.width, height: this.player.height };
      if (aabbOverlap(pb, this.exitTrigger) && this.game.input.isJustPressed(GameAction.LOOK_UP)) {
        this.handleStratumExit();
        return;
      }
    }

    // Escape altar interaction
    if (this.altarTrigger) {
      const pb = { x: this.player.x, y: this.player.y, width: this.player.width, height: this.player.height };
      if (aabbOverlap(pb, this.altarTrigger) && this.game.input.isJustPressed(GameAction.JUMP)) {
        this.useEscapeAltar();
        return;
      }
    }

    // Track which room the player is in and lazy-spawn enemies on first entry
    // Clamp to grid bounds to prevent out-of-range access
    const playerRoomCol = Math.max(0, Math.min(3, Math.floor(this.player.x / 512)));
    const playerRoomRow = Math.max(0, Math.min(3, Math.floor(this.player.y / 512)));
    const roomKey = `${playerRoomCol},${playerRoomRow}`;
    if (!this.spawnedRooms.has(roomKey)) {
      this.spawnedRooms.add(roomKey);
      this.currentCol = playerRoomCol;
      // Convert local row (0-3) to absolute row for unifiedGrid access
      const stratumOffset = this.unifiedGrid.strataOffsets[this.currentStratumIndex]?.rowOffset ?? 0;
      this.currentRow = stratumOffset + playerRoomRow;
      const enteredCell = this.getCurrentCell();
      if (enteredCell) {
        enteredCell.visited = true;
        this.currentStratumIndex = enteredCell.stratumIndex ?? 0;
        this.currentStratumDef = this.strataConfig.strata[this.currentStratumIndex];
        this.persistRoomState();
        this.drawMiniMap();
        // Escape altar chance: skip start rooms (per stratum) and boss rooms
        const absRow = this.currentRow;
        const sOff = this.unifiedGrid.strataOffsets[this.currentStratumIndex];
        const isStratumStart = sOff && playerRoomRow === 0 && enteredCell.onCriticalPath;
        if (!isStratumStart && !this.isStratumEndRoom(this.currentCol, absRow)) {
          this.trySpawnEscapeAltar(enteredCell);
        }
      }
      this.spawnEnemiesInRoom(this.currentCol, this.currentRow);
    }

    // HUD, damage numbers, toast & Sakurai effects
    this.hud.updateHP(this.player.hp, this.player.maxHp);
    this.updateHudText();
    this.dmgNumbers.update(dt);
    this.hitSparks.update(dt);
    this.screenFlash.update(dt);

    // Clamp player to map bounds (4×4 rooms × 512px = 2048px)
    const MAP_SIZE = 2048;
    if (this.player.x < 0) this.player.x = 0;
    if (this.player.y < 0) this.player.y = 0;
    if (this.player.x > MAP_SIZE - this.player.width) this.player.x = MAP_SIZE - this.player.width;
    if (this.player.y > MAP_SIZE - this.player.height) this.player.y = MAP_SIZE - this.player.height;

    // Camera
    this.game.camera.target = {
      x: this.player.x + this.player.width / 2,
      y: this.player.y + this.player.height / 2,
    };
    this.game.camera.update(dt);
  }

  private updateHudText(): void {
    const stratumLabel = `S${this.currentStratumIndex + 1}`;
    this.hud.setFloorText(
      `${stratumLabel} ${this.item.def.name} Lv${this.item.level} EXP:${this.item.exp}/${EXP_PER_LEVEL} +${this.earnedExp}`
    );
  }

  private showEscapeConfirm(): void {
    this.escapeConfirmVisible = true;

    const panelW = 260;
    const panelH = 72;
    const panel = new Container();
    const bg = new Graphics();
    bg.rect(0, 0, panelW, panelH).fill({ color: 0x1a1a2e, alpha: 0.95 });
    bg.rect(0, 0, panelW, panelH).stroke({ color: 0x4a4a6a, width: 1 });
    panel.addChild(bg);

    const title = new BitmapText({ text: 'Leave Item World?', style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0xffffff } });
    title.x = 12;
    title.y = 6;
    panel.addChild(title);

    const expInfo = new BitmapText({
      text: `${this.item.def.name} Lv${this.item.level}  EXP: ${this.item.exp}/${EXP_PER_LEVEL}`,
      style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0x88ccff },
    });
    expInfo.x = 12;
    expInfo.y = 20;
    panel.addChild(expInfo);

    const floorInfo = new BitmapText({
      text: `Rooms ${this.roomsCleared}/${this.totalRooms}  Earned: +${this.earnedExp} EXP`,
      style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0xaaaaaa },
    });
    floorInfo.x = 12;
    floorInfo.y = 33;
    panel.addChild(floorInfo);

    const controls = new BitmapText({ text: '[Z] Yes   [X/C] No', style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0xaaaaaa } });
    controls.x = 12;
    controls.y = 48;
    panel.addChild(controls);

    panel.x = Math.floor((GAME_WIDTH - panelW) / 2);
    panel.y = Math.floor((GAME_HEIGHT - panelH) / 2);

    this.escapeConfirm = panel;
    this.game.app.stage.addChild(panel);
  }

  private hideEscapeConfirm(): void {
    this.escapeConfirmVisible = false;
    if (this.escapeConfirm?.parent) {
      this.escapeConfirm.parent.removeChild(this.escapeConfirm);
    }
    this.escapeConfirm = null;
  }

  // --- Onboarding ---
  private showOnboarding(): void {
    this.onboardingStep = 0;
    this.onboardingDone = false;
    this.showOnboardingStep();
  }

  private showOnboardingStep(): void {
    if (this.onboardingPanel?.parent) {
      this.onboardingPanel.parent.removeChild(this.onboardingPanel);
    }

    const msgs = ItemWorldScene.ONBOARDING_MSGS;
    if (this.onboardingStep >= msgs.length) {
      this.onboardingPanel = null;
      this.onboardingDone = true;
      return;
    }

    const msg = msgs[this.onboardingStep];
    const lines = msg.split('\n');

    const panelW = 280;
    const lineH = 12;
    const padY = 10;
    const padX = 14;
    const panelH = padY * 2 + lines.length * lineH + 16; // +16 for prompt line

    const panel = new Container();
    const bg = new Graphics();
    bg.roundRect(0, 0, panelW, panelH, 4).fill({ color: 0x0a0a1e, alpha: 0.92 });
    bg.roundRect(0, 0, panelW, panelH, 4).stroke({ color: 0x6666aa, width: 1 });
    panel.addChild(bg);

    for (let i = 0; i < lines.length; i++) {
      const t = new BitmapText({
        text: lines[i],
        style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0xffffff },
      });
      t.x = padX;
      t.y = padY + i * lineH;
      panel.addChild(t);
    }

    const step = `${this.onboardingStep + 1}/${msgs.length}`;
    const prompt = new BitmapText({
      text: `[Z] Next  ${step}`,
      style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0x888888 },
    });
    prompt.x = padX;
    prompt.y = panelH - padY - 8;
    panel.addChild(prompt);

    panel.x = Math.floor((GAME_WIDTH - panelW) / 2);
    panel.y = Math.floor((GAME_HEIGHT - panelH) / 2) - 20;

    this.onboardingPanel = panel;
    this.game.app.stage.addChild(panel);
  }

  private advanceOnboarding(): void {
    this.onboardingStep++;
    this.showOnboardingStep();
  }

  private handleStratumExit(): void {
    const isFinal = this.isFinalEndRoom(this.currentCol, this.currentRow);

    if (!isFinal) {
      // Find the next stratum's start room in unified grid
      const nextStratumIndex = this.currentStratumIndex + 1;
      const nextOffset = this.unifiedGrid.strataOffsets[nextStratumIndex];
      const nextStartRow = nextOffset.rowOffset;

      // Find the start room column (first critical path cell in that row)
      let nextStartCol = 0;
      for (let c = 0; c < this.unifiedGrid.totalWidth; c++) {
        const cell = this.unifiedGrid.cells[nextStartRow][c];
        if (cell && cell.onCriticalPath) { nextStartCol = c; break; }
      }

      // Advance stratum BEFORE transition so buildFullMap uses the new stratum
      this.currentStratumIndex = nextStratumIndex;
      this.currentStratumDef = this.strataConfig.strata[nextStratumIndex];
      this.progress.lastSafeStratum = this.currentStratumIndex;

      this.toast.show(`Stratum ${nextStratumIndex + 1} — Descending...`, 0x8888ff);
      this.startTransition('down', nextStartCol, nextStartRow);
    } else {
      // Deepest stratum cleared — exit item world
      this.progress.lastSafeStratum = this.currentStratumIndex;
      this.persistRoomState();
      // Level up already happened on boss kill — just show result
      this.toast.show(`${this.item.def.name} Lv${this.item.level} — Strata Complete!`, 0xffaa00);
      this.startExitFade();
    }
  }

  private useEscapeAltar(): void {
    this.progress.lastSafeStratum = this.currentStratumIndex;
    this.persistRoomState();
    this.toast.show('Escape Altar — Returning safely...', 0xaaaaff);
    this.startExitFade();
  }

  private trySpawnEscapeAltar(cell: RoomCell): void {
    const isStartRoom = this.currentCol === this.unifiedGrid.startRoom.col &&
                        this.currentRow === this.unifiedGrid.startRoom.absoluteRow;
    if (isStartRoom) return;
    if (!cell.onCriticalPath) return;

    const altarRng = new PRNG(this.item.uid * 50000 + this.currentRow * 100 + this.currentCol * 10);
    if (altarRng.next() >= 0.25) return; // 25% chance

    // Local row within current stratum (full-map renders stratum locally at 0-3)
    const stratumOffset = this.unifiedGrid.strataOffsets[this.currentStratumIndex]?.rowOffset ?? 0;
    const localRow = this.currentRow - stratumOffset;

    // Find a valid floor position inside the room for altar placement (randomized X)
    const roomTopTile = localRow * 32;
    const roomLeftTile = this.currentCol * 32;
    // Random X column within room (avoid edges: +4 to +28)
    const altarTC = roomLeftTile + 4 + altarRng.nextInt(0, 24);
    let altarTileY = roomTopTile + 28; // default near bottom
    for (let tr = roomTopTile + 4; tr < roomTopTile + 30; tr++) {
      if ((this.fullGrid[tr]?.[altarTC] ?? 1) === 0 && (this.fullGrid[tr + 1]?.[altarTC] ?? 1) >= 1) {
        altarTileY = tr; break;
      }
    }
    const altarX = altarTC * TILE_SIZE;
    const altarY = (altarTileY + 1) * TILE_SIZE - 40;
    this.altarTrigger = { x: altarX, y: altarY, width: 2 * TILE_SIZE, height: 3 * TILE_SIZE };

    this.altarVisual = new Graphics();
    this.altarVisual.rect(0, 24, 32, 16).fill(0x666688);
    this.altarVisual.rect(4, 16, 24, 8).fill(0x7777aa);
    this.altarVisual.rect(10, 8, 12, 8).fill(0xaaaaff);
    this.altarVisual.x = altarX;
    this.altarVisual.y = altarY;
    this.entityLayer.addChild(this.altarVisual);
  }

  private clearEscapeAltar(): void {
    if (this.altarVisual?.parent) this.altarVisual.parent.removeChild(this.altarVisual);
    this.altarVisual = null;
    this.altarTrigger = null;
  }

  private startExitFade(): void {
    this.transitionState = 'exit_fade';
    this.transitionTimer = FADE_DURATION * 2;
  }

  private exitItemWorld(): void {
    this.sourcePlayer.hp = this.player.hp;

    this.hideEscapeConfirm();
    if (this.miniMapContainer.parent) this.miniMapContainer.parent.removeChild(this.miniMapContainer);
    if (this.hud.container.parent) this.hud.container.parent.removeChild(this.hud.container);

    this.onComplete?.();
  }

  private checkDoorTriggers(): void {
    const pb = { x: this.player.x, y: this.player.y, width: this.player.width, height: this.player.height };
    for (const trigger of this.doorTriggers) {
      if (aabbOverlap(pb, trigger)) {
        const nextCol = this.currentCol + (trigger.direction === 'right' ? 1 : trigger.direction === 'left' ? -1 : 0);
        const nextRow = this.currentRow + (trigger.direction === 'down' ? 1 : trigger.direction === 'up' ? -1 : 0);
        const nextCell = this.getCell(nextCol, nextRow);
        if (nextCell && nextCell.type !== 0) {
          this.startTransition(trigger.direction, nextCol, nextRow);
          return;
        }
      }
    }
  }

  private startTransition(direction: 'left' | 'right' | 'up' | 'down', nextCol: number, nextRow: number): void {
    // Grant pass-through EXP if room wasn't cleared (skipping enemies)
    const cell = this.getCurrentCell();
    if (!cell.cleared) {
      // Room pass EXP removed — only monster kills grant EXP
    }

    this.transitionState = 'fade_out';
    this.transitionTimer = FADE_DURATION;
    this.pendingDirection = direction;
    this.currentCol = nextCol;
    this.currentRow = nextRow;
  }

  private updateTransition(dt: number): void {
    this.transitionTimer -= dt;
    if (this.transitionState === 'fade_out') {
      this.fadeOverlay.alpha = Math.min(1, 1 - this.transitionTimer / FADE_DURATION);
      if (this.transitionTimer <= 0) {
        // Rebuild full map for the new stratum
        this.buildFullMap();
        // Spawn at start cell using floor scan (same as init)
        const stOff = this.unifiedGrid.strataOffsets[this.currentStratumIndex]?.rowOffset ?? 0;
        const localRow = this.currentRow - stOff;
        const spawnCX = this.currentCol * 512 + 256;
        const spawnTileC = Math.floor(spawnCX / TILE_SIZE);
        const roomTopT = localRow * 32;
        let spawnY = localRow * 512 + 256;
        for (let tr = roomTopT + 2; tr < roomTopT + 30; tr++) {
          if ((this.fullGrid[tr]?.[spawnTileC] ?? 1) === 0 && (this.fullGrid[tr+1]?.[spawnTileC] ?? 1) >= 1) {
            spawnY = (tr + 1) * TILE_SIZE - this.player.height; break;
          }
        }
        this.player.x = spawnCX;
        this.player.y = spawnY;
        this.player.vx = 0;
        this.player.vy = 0;
        this.player.savePrevPosition();
        this.transitionState = 'fade_in';
        this.transitionTimer = FADE_DURATION;
        this.fadeOverlay.alpha = 1;
      }
    } else if (this.transitionState === 'fade_in') {
      this.fadeOverlay.alpha = Math.max(0, this.transitionTimer / FADE_DURATION);
      if (this.transitionTimer <= 0) {
        this.transitionState = 'none';
        this.fadeOverlay.alpha = 0;
        this.pendingDirection = null;
      }
    } else if (this.transitionState === 'exit_fade') {
      const duration = FADE_DURATION * 2;
      this.fadeOverlay.alpha = Math.min(1, 1 - this.transitionTimer / duration);
      if (this.transitionTimer <= 0) {
        this.transitionState = 'none';
        this.exitItemWorld();
      }
    }
  }

  render(alpha: number): void {
    if (!this.initialized) return;
    this.player.render(alpha);
    for (const enemy of this.enemies) enemy.render(alpha);
  }

  exit(): void {
    this.toast.clear();
    this.hideEscapeConfirm();
    if (this.onboardingPanel?.parent) this.onboardingPanel.parent.removeChild(this.onboardingPanel);
    if (this.miniMapContainer?.parent) this.miniMapContainer.parent.removeChild(this.miniMapContainer);
    if (this.hud?.container.parent) this.hud.container.parent.removeChild(this.hud.container);
    if (this.controlsOverlay?.container.parent) this.controlsOverlay.container.parent.removeChild(this.controlsOverlay.container);
    if (this.screenFlash?.overlay.parent) this.screenFlash.overlay.parent.removeChild(this.screenFlash.overlay);
  }

  private drawMiniMap(): void {
    this.miniMapContainer.removeChildren();
    const cellSize = 6;
    const gap = 1;
    const padding = 4;
    const grid = this.unifiedGrid;

    // Calculate minimap dimensions accounting for variable-width strata
    const bgW = grid.totalWidth * (cellSize + gap) + gap + padding * 2;
    // Add extra pixels for stratum dividers
    const dividerCount = grid.strataOffsets.length - 1;
    const bgH = grid.totalHeight * (cellSize + gap) + gap + padding * 2 + dividerCount * 2;

    const bg = new Graphics();
    bg.rect(0, 0, bgW, bgH).fill({ color: 0x220000, alpha: 0.6 });
    this.miniMapContainer.addChild(bg);

    // Draw stratum divider lines
    let yAccum = padding;
    for (let si = 0; si < grid.strataOffsets.length; si++) {
      const bound = grid.strataOffsets[si];
      if (si > 0) {
        // Draw divider line
        const divider = new Graphics();
        divider.rect(padding, yAccum - 1, bgW - padding * 2, 1).fill({ color: 0x663366, alpha: 0.8 });
        this.miniMapContainer.addChild(divider);
        yAccum += 2; // divider spacing
      }

      for (let localRow = 0; localRow < bound.height; localRow++) {
        const absRow = bound.rowOffset + localRow;
        for (let col = 0; col < grid.totalWidth; col++) {
          const cell = grid.cells[absRow]?.[col];

          const x = padding + col * (cellSize + gap);
          const y = yAccum + localRow * (cellSize + gap);

          const isEndRoom = cell ? this.isStratumEndRoom(col, absRow) : false;
          let color = 0x222222; // default: dark (room exists but unvisited)
          let alpha = 0.5;

          if (!cell || cell.type === 0) {
            color = 0x444444; // filler room (no critical path)
            alpha = 0.3;
          } else if (cell.visited) {
            alpha = 1;
            color = cell.cleared ? 0x6a2a2a : 0x6a4a4a;
          }
          if (isEndRoom) {
            color = (cell?.visited) ? 0x4444cc : 0x2222aa;
            alpha = 1;
          }

          // Player position — based on actual player coords, not currentCol/Row
          const playerCellCol = Math.floor(this.player.x / 512);
          const playerCellRow = Math.floor(this.player.y / 512);
          if (col === playerCellCol && localRow === playerCellRow) {
            color = 0xe74c3c; // red = player here
            alpha = 1;
          }

          const cellGfx = new Graphics();
          cellGfx.rect(0, 0, cellSize, cellSize).fill({ color, alpha });
          cellGfx.x = x;
          cellGfx.y = y;
          this.miniMapContainer.addChild(cellGfx);
        }
      }

      yAccum += bound.height * (cellSize + gap);
    }

    this.miniMapContainer.x = 4;
    this.miniMapContainer.y = 4;
  }
}
