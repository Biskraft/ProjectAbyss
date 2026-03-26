import { Container, Graphics, BitmapText, Assets, type Texture } from 'pixi.js';
import { Scene } from '@core/Scene';
import { TilemapRenderer } from '@level/TilemapRenderer';
import { generateUnifiedGrid, type UnifiedGridData, type UnifiedRoomCell } from '@level/RoomGrid';
import { assembleRoom, getSpawnPosition, getDoorTriggers } from '@level/ChunkAssembler';
import type { RoomCell } from '@level/RoomGrid';
import { pickTemplate, TEMPLATE_W, TEMPLATE_H, type RoomTemplate, type ExitDir } from '@level/ItemWorldTemplates';
import { LdtkLoader } from '@level/LdtkLoader';
import { LdtkRenderer } from '@level/LdtkRenderer';
import type { LdtkLevel } from '@level/LdtkLoader';
import { Sprite, Texture as PixiTexture, Rectangle } from 'pixi.js';
import { aabbOverlap } from '@core/Physics';
import { GameAction } from '@core/InputManager';
import { Player } from '@entities/Player';
import { Skeleton } from '@entities/Skeleton';
import { Ghost } from '@entities/Ghost';
import { Projectile } from '@entities/Projectile';
import { HitManager } from '@combat/HitManager';
import { HUD } from '@ui/HUD';
import { ControlsOverlay } from '@ui/ControlsOverlay';
import { PIXEL_FONT } from '@ui/fonts';
import { DamageNumberManager } from '@ui/DamageNumber';
import { ToastManager } from '@ui/Toast';
import { PRNG } from '@utils/PRNG';
import { addItemExp, itemLevelUp, getOrCreateWorldProgress, EXP_PER_LEVEL, type ItemInstance, type ItemWorldProgress } from '@items/ItemInstance';
import type { Inventory } from '@items/Inventory';
import { STRATA_BY_RARITY, type StrataConfig, type StratumDef } from '@data/StrataConfig';
import type { Enemy } from '@entities/Enemy';
import type { CombatEntity } from '@combat/HitManager';
import { HitSparkManager } from '@effects/HitSpark';
import { ScreenFlash } from '@effects/ScreenFlash';
import type { Game } from '../Game';

const TILE_SIZE = 16;
const ROOM_W = 60;
const ROOM_H = 34;
const FADE_DURATION = 200;
const BASE_EXP_PER_ROOM = 120;
const BASE_BOSS_BONUS_EXP = 600;
const BASE_EXP_PER_KILL = 30;
const BASE_EXP_ROOM_PASS = 60;

type TransitionState = 'none' | 'fade_out' | 'fade_in' | 'exit_fade';

export class ItemWorldScene extends Scene {
  private tilemap!: TilemapRenderer;
  private atlas: Texture | null = null;
  private ldtkLoader: LdtkLoader | null = null;
  private ldtkRenderer: LdtkRenderer | null = null;
  private ldtkTemplates: LdtkLevel[] = [];
  private player!: Player;
  private enemies: Enemy[] = [];
  private projectiles: Projectile[] = [];
  private hitManager!: HitManager;
  private entityLayer!: Container;
  private hud!: HUD;
  private controlsOverlay!: ControlsOverlay;
  private dmgNumbers!: DamageNumberManager;
  private hitSparks!: HitSparkManager;
  private screenFlash!: ScreenFlash;
  private toast!: ToastManager;

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
      console.log(`[ItemWorld] Loaded ${this.ldtkTemplates.length} LDtk templates`);
    } catch (e) {
      console.warn('[ItemWorld] LDtk templates not found, using code templates');
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

    // Restore persistent exploration state & count rooms
    this.restoreRoomState();
    this.countTotalRooms();

    // Load first room
    this.loadRoom('down');
    this.updateHudText();

    // Camera
    // Camera bounds set dynamically in loadRoom()
    this.game.camera.snap(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2);
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
    return this.unifiedGrid.cells[this.currentRow][this.currentCol]!;
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

  private loadRoom(enterFrom: 'left' | 'right' | 'up' | 'down'): void {
    const cell = this.getCurrentCell();
    const roomRng = new PRNG(this.item.uid * 10000 + this.currentCol * 100 + this.currentRow);

    // Pick room: LDtk template → code template → ChunkAssembler fallback
    const ldtkLevel = this.pickLdtkTemplate(cell, roomRng);
    this.currentLdtkLevel = ldtkLevel;
    if (ldtkLevel && this.ldtkRenderer && this.atlas) {
      // Use LDtk hand-crafted template with tile rendering
      this.roomData = ldtkLevel.collisionGrid.map(row => [...row]);
      console.log(`[ItemWorld] Using LDtk "${ldtkLevel.identifier}" grid=${this.roomData.length}x${this.roomData[0]?.length} bg=${ldtkLevel.backgroundTiles.length} wall=${ldtkLevel.wallTiles.length}`);
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
        this.roomData = template.grid.map(row => [...row]);
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
    if (this.sealGfx?.parent) this.sealGfx.parent.removeChild(this.sealGfx);
    this.sealGfx = null;

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

    console.log(`[ItemWorld] sealUnusedExits: cell(${this.currentCol},${this.currentRow}) exits: L=${cell.exits.left} R=${cell.exits.right} U=${cell.exits.up} D=${cell.exits.down}`);

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

    console.log(`[ItemWorld] Sealed ${changed.length} tiles. Grid sample row14: ${this.roomData[14]?.slice(0,5)} col0: ${[0,1,2,3,4].map(r=>this.roomData[r]?.[0])}`);

    if (changed.length > 0) {
      this.addSealSprites(changed);
    }
  }

  /** Render seal visuals — copies nearby wall tiles, falls back to solid block */
  private addSealSprites(changed: Array<[number, number]>): void {
    if (changed.length === 0) return;
    const T = TILE_SIZE;
    const gfx = new Graphics();

    // Draw bright red blocks so they're impossible to miss (debug)
    for (const [c, r] of changed) {
      gfx.rect(c * T, r * T, T, T).fill(0xff0000);
    }
    console.log(`[ItemWorld] addSealSprites: ${changed.length} blocks, entityLayer children before=${this.entityLayer.children.length}`);

    // If we have LDtk tiles, overlay matching wall tiles
    if (this.atlas && this.currentLdtkLevel) {
      const src = this.atlas.source;
      const tileLookup = new Map<string, [number, number]>();
      for (const tile of this.currentLdtkLevel.wallTiles) {
        tileLookup.set(`${Math.floor(tile.px[0]/T)},${Math.floor(tile.px[1]/T)}`, tile.src);
      }

      const texCache = new Map<string, PixiTexture>();
      for (const [c, r] of changed) {
        // Find nearest wall tile
        let tileSrc: [number, number] | null = null;
        for (let rad = 1; rad <= 3 && !tileSrc; rad++) {
          for (let dr = -rad; dr <= rad && !tileSrc; dr++) {
            for (let dc = -rad; dc <= rad && !tileSrc; dc++) {
              const s = tileLookup.get(`${c+dc},${r+dr}`);
              if (s) tileSrc = s;
            }
          }
        }
        if (!tileSrc) tileSrc = [64, 16];

        const key = `${tileSrc[0]},${tileSrc[1]}`;
        let tex = texCache.get(key);
        if (!tex) { tex = new PixiTexture({ source: src, frame: new Rectangle(tileSrc[0], tileSrc[1], T, T) }); texCache.set(key, tex); }

        const sprite = new Sprite(tex);
        sprite.x = c * T;
        sprite.y = r * T;
        gfx.addChild(sprite);
      }
    }

    this.sealGfx = gfx;
    this.container.addChild(gfx); // top of scene container (above everything)
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

  /** Pick a random LDtk template from loaded templates */
  private pickLdtkTemplate(cell: UnifiedRoomCell, rng: PRNG): LdtkLevel | null {
    if (this.ldtkTemplates.length === 0) return null;
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
    const boss = new Skeleton();
    boss.hp = boss.maxHp = def.bossHp;
    boss.atk = def.bossAtk;
    const visualScale = 1.5 + this.currentStratumIndex * 0.2;
    boss.container.scale.set(visualScale);
    boss.x = (this.roomW / 2) * TILE_SIZE;
    boss.y = floorY - boss.height * visualScale;
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

    // Toast always updates (even during transitions / menus)
    this.toast.update(dt);

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

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      const wasAlive = enemy.alive;
      enemy.update(dt);

      // Monster killed — grant EXP (scaled by stratum)
      if (wasAlive && !enemy.alive) {
        const killExp = Math.floor(BASE_EXP_PER_KILL * this.currentStratumDef.expMultiplier);
        addItemExp(this.item, killExp);
        this.earnedExp += killExp;
        this.toast.show(`+${killExp} EXP`, 0x88ccff);
        this.updateHudText();
      }

      if (enemy.shouldRemove) {
        if (enemy.container.parent) enemy.container.parent.removeChild(enemy.container);
        this.enemies.splice(i, 1);
      }
    }

    // Player attacks — Sakurai full feedback chain
    if (this.player.isAttackActive()) {
      const targets = this.enemies.filter(e => e.alive) as CombatEntity[];
      const hits = this.hitManager.checkHits(this.player, this.player.comboIndex, this.player.hitList, targets);
      for (const hit of hits) {
        this.dmgNumbers.spawn(hit.hitX, hit.hitY - 8, hit.damage, hit.heavy);
        this.hitSparks.spawn(hit.hitX, hit.hitY, hit.heavy, hit.dirX);
        if (hit.heavy) this.screenFlash.flashHit(true);
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
      if (enemy instanceof Skeleton && enemy.isAttackActive()) {
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

    // Room cleared
    const cell = this.getCurrentCell();
    if (!cell.cleared && this.enemies.filter(e => e.alive).length === 0) {
      cell.cleared = true;
      this.roomsCleared++;

      // EXP per room (scaled by stratum)
      const isEndRoom = this.isStratumEndRoom(this.currentCol, this.currentRow);
      const baseExp = isEndRoom ? BASE_EXP_PER_ROOM + BASE_BOSS_BONUS_EXP : BASE_EXP_PER_ROOM;
      const expGain = Math.floor(baseExp * this.currentStratumDef.expMultiplier);
      addItemExp(this.item, expGain);
      this.earnedExp += expGain;

      // Heal 20%
      const heal = Math.floor(this.player.maxHp * 0.2);
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + heal);

      // Boss kill → bonus level up
      if (isEndRoom) {
        itemLevelUp(this.item);
        this.toast.show(`BOSS CLEAR! +${expGain} EXP`, 0xffaa00);
        this.toast.show(`HP +${heal} recovered`, 0x44ff44);
      } else {
        this.toast.show(`Room Clear! +${expGain} EXP`, 0x88ccff);
        this.toast.show(`HP +${heal} recovered`, 0x44ff44);
      }

      this.updateHudText();
      this.drawMiniMap();
    }

    // Exit trigger (stratum end room, after cleared)
    if (this.exitTrigger && cell.cleared) {
      const pb = { x: this.player.x, y: this.player.y, width: this.player.width, height: this.player.height };
      if (aabbOverlap(pb, this.exitTrigger)) {
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

    // Door triggers
    this.checkDoorTriggers();

    // HUD, damage numbers, toast & Sakurai effects
    this.hud.updateHP(this.player.hp, this.player.maxHp);
    this.dmgNumbers.update(dt);
    this.hitSparks.update(dt);
    this.screenFlash.update(dt);

    // Camera
    this.game.camera.target = {
      x: this.player.x + this.player.width / 2,
      y: this.player.y + this.player.height / 2,
    };
    this.game.camera.update(dt);
  }

  private updateHudText(): void {
    const stratumLabel = `Stratum ${this.currentStratumIndex + 1}/${this.strataConfig.strata.length}`;
    this.hud.setFloorText(
      `${stratumLabel}  ${this.roomsCleared}/${this.totalRooms}  +${this.earnedExp}EXP`
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

    panel.x = Math.floor((480 - panelW) / 2);
    panel.y = Math.floor((270 - panelH) / 2);

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

    panel.x = Math.floor((480 - panelW) / 2);
    panel.y = Math.floor((270 - panelH) / 2) - 20;

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

      // Use regular room transition — the key change!
      this.startTransition('down', nextStartCol, nextStartRow);
    } else {
      // Deepest stratum cleared — exit item world
      this.progress.lastSafeStratum = this.currentStratumIndex;
      this.persistRoomState();
      itemLevelUp(this.item);
      this.toast.show('All Strata cleared! Item Level UP!', 0xffaa00);
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

    const altarX = (this.roomW / 2 + 4) * TILE_SIZE;
    const altarY = (this.roomH - 4) * TILE_SIZE;
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
      const passExp = Math.floor(BASE_EXP_ROOM_PASS * this.currentStratumDef.expMultiplier);
      addItemExp(this.item, passExp);
      this.earnedExp += passExp;
      this.toast.show(`Room passed +${passExp} EXP`, 0xaaaaaa);
      this.updateHudText();
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
        this.loadRoom(this.pendingDirection!);
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
          const cell = grid.cells[absRow][col];
          if (!cell || cell.type === 0) continue;

          const x = padding + col * (cellSize + gap);
          const y = yAccum + localRow * (cellSize + gap);

          const isEndRoom = this.isStratumEndRoom(col, absRow);
          let color = 0x333333;
          let alpha = 0.3;

          // Stratum-based tint
          const stratumTint = cell.stratumIndex * 0.15;

          if (cell.visited) {
            alpha = 1;
            color = cell.cleared ? 0x6a2a2a : 0x6a4a4a;
          }
          if (isEndRoom) {
            color = cell.visited ? 0x4444cc : 0x2222aa;
            alpha = 1;
          }
          if (col === this.currentCol && absRow === this.currentRow) {
            color = 0xe74c3c;
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
