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
import { aabbOverlap, isInUpdraft, isInSpike } from '@core/Physics';
import { GameAction } from '@core/InputManager';
import { Player } from '@entities/Player';
import { Ghost } from '@entities/Ghost';
import { Guardian } from '@entities/Guardian';
import { GoldenMonster } from '@entities/GoldenMonster';
import { createEnemy } from '@entities/EnemyFactory';
import { HealingPickup, createEmberShard, createForgeEmber, createAnvilFlame } from '@entities/HealingPickup';
import { GoldPickup } from '@entities/GoldPickup';
import { Spike } from '@entities/Spike';
import { CrackedFloor } from '@entities/CrackedFloor';
import { CollapsingPlatform } from '@entities/CollapsingPlatform';
import { GrowingWall } from '@entities/GrowingWall';
import { Switch } from '@entities/Switch';
import { LockedDoor, type UnlockCondition } from '@entities/LockedDoor';
import { COMBO_STEPS, getAttackHitbox } from '@combat/CombatData';
import { loadSpawnTable, getSpawnTable, pickWeightedEnemy } from '@data/itemWorldSpawnTable';
import { getEnemyStats } from '@data/enemyStats';
import { getMemoryRoom } from '@data/memoryRoomTable';
import { LoreDisplay } from '@ui/LoreDisplay';
import { ReturnHint } from '@ui/ReturnHint';
import { InnocentNPC } from '@entities/InnocentNPC';
import { Projectile } from '@entities/Projectile';
import { HitManager } from '@combat/HitManager';
import { HUD } from '@ui/HUD';
import { KeyPrompt } from '@ui/KeyPrompt';
import { ControlsOverlay } from '@ui/ControlsOverlay';
import { PIXEL_FONT } from '@ui/fonts';
import { DamageNumberManager } from '@ui/DamageNumber';
import { ToastManager } from '@ui/Toast';
import { SFX } from '@audio/Sfx';
import { PRNG } from '@utils/PRNG';
import { addItemExp, getOrCreateWorldProgress, markItemCleared, resetItemForNextCycle, EXP_PER_LEVEL, addInnocent, canAddInnocent, RARITY_COLOR, type ItemInstance, type ItemWorldProgress } from '@items/ItemInstance';
import { INNOCENT_SPAWN_CHANCE, createRandomInnocent } from '@data/innocents';
import type { Inventory } from '@items/Inventory';
import { STRATA_BY_RARITY, type StrataConfig, type StratumDef } from '@data/StrataConfig';
import type { Enemy } from '@entities/Enemy';
import type { CombatEntity } from '@combat/HitManager';
import { HitSparkManager } from '@effects/HitSpark';
import { DeathParticleManager } from '@effects/DeathParticles';
import { LandingDustManager } from '@effects/LandingDust';
import { DashAfterimageManager } from '@effects/DashAfterimage';
import { DashBoostPuffManager } from '@effects/DashBoostPuff';
import { DoubleJumpRingManager } from '@effects/DoubleJumpRing';
import { WallJumpDustManager } from '@effects/WallJumpDust';
import { JumpTakeoffPuffManager } from '@effects/JumpTakeoffPuff';
import { WallSlideDustManager } from '@effects/WallSlideDust';
import { FootstepPuffManager } from '@effects/FootstepPuff';
import { FlaskHealBurstManager } from '@effects/FlaskHealBurst';
import { SurgeVfxManager } from '@effects/SurgeVfx';
import { ComboFinisherBurstManager } from '@effects/ComboFinisherBurst';
import { CriticalHighlightManager } from '@effects/CriticalHighlight';
import { HitBloodSprayManager } from '@effects/HitBloodSpray';
import { DiveLandImpactManager } from '@effects/DiveLandImpact';
import { WaterSplashManager } from '@effects/WaterSplash';
import { WaterBubblesManager } from '@effects/WaterBubbles';
import { DropThroughDustManager } from '@effects/DropThroughDust';
import { IceSkidStreakManager } from '@effects/IceSkidStreak';
import { ItemPickupGlowManager } from '@effects/ItemPickupGlow';
import { LowHpVignetteManager } from '@effects/LowHpVignette';
import { ScreenFlash } from '@effects/ScreenFlash';
import { PaletteSwapFilter } from '@effects/PaletteSwapFilter';
import {
  getAreaPalette,
  getAreaPaletteAtlas,
  getAreaPaletteRow,
  ensureAreaTilesetsLoaded,
  applyAreaTilesetToLdtkTiles,
} from '@data/areaPalettes';
import { GAME_WIDTH, GAME_HEIGHT, type Game } from '../Game';
import {
  trackItemWorldEnter,
  trackItemWorldExit,
  trackItemWorldFloorClear,
  trackPlayerDeath,
  trackEnemyKill,
  trackItemLevelUp,
} from '@utils/Analytics';
import { assetPath } from '@core/AssetLoader';
import { UpdraftSystem } from '@systems/UpdraftSystem';

const TILE_SIZE = 16;
const ROOM_W = 60;
const ROOM_H = 34;
// Item World room geometry (2026-04-11: rooms compressed to 512×256 = 32×16 tiles)
const IW_GRID_W = 4;
const IW_GRID_H = 4;
const IW_ROOM_W_TILES = 32;                         // 512 px
const IW_ROOM_H_TILES = 16;                         // 256 px
const IW_ROOM_W_PX = IW_ROOM_W_TILES * TILE_SIZE;   // 512
const IW_ROOM_H_PX = IW_ROOM_H_TILES * TILE_SIZE;   // 256
const IW_FULL_W_TILES = IW_GRID_W * IW_ROOM_W_TILES; // 128
const IW_FULL_H_TILES = IW_GRID_H * IW_ROOM_H_TILES; // 64
// Door mask — auto carving / sealing at room edges based on cell.exits
const IW_DOOR_DEPTH = 2;        // tiles carved/sealed into the room from an edge
const IW_DOOR_H_HEIGHT = 3;     // horizontal door (LEFT/RIGHT): 3 tiles tall
const IW_DOOR_V_WIDTH = 3;      // vertical door (UP/DOWN): 3 tiles wide
// STANDARD horizontal door row — fixed across all templates so neighboring
// rooms align regardless of each template's natural floor level. Templates
// should be designed with walkable floor at (IW_DOOR_FLOOR_ROW..H-1).
const IW_DOOR_FLOOR_ROW = 13;   // floor is at row 13, door spans rows 11-13
const FADE_DURATION = 200;
const BASE_EXP_PER_ROOM = 120;
const BASE_BOSS_BONUS_EXP = 600;
const BASE_EXP_PER_KILL = 60;
const BASE_EXP_ROOM_PASS = 60;


type TransitionState = 'none' | 'fade_out' | 'fade_in' | 'exit_fade' | 'post_clear_hold';

export class ItemWorldScene extends Scene {
  private tilemap!: TilemapRenderer;
  private atlas: Texture | null = null;
  /** Per-tileset atlas map keyed by LDtk __tilesetRelPath. */
  private atlases: Record<string, Texture> = {};
  private ldtkLoader: LdtkLoader | null = null;
  private ldtkRenderer: LdtkRenderer | null = null;
  private ldtkTemplates: LdtkLevel[] = [];
  private outsideRenderer: LdtkRenderer | null = null;
  private outsideLevel: LdtkLevel | null = null;
  private player!: Player;
  private enemies: Enemy<string>[] = [];
  private projectiles: Projectile[] = [];
  private healingPickups: HealingPickup[] = [];
  private goldPickups: GoldPickup[] = [];
  private dropRng = new PRNG(99999);
  private hitManager!: HitManager;
  private entityLayer!: Container;
  private hud!: HUD;
  private returnHint: ReturnHint | null = null;
  private controlsOverlay!: ControlsOverlay;
  private dmgNumbers!: DamageNumberManager;
  private hitSparks!: HitSparkManager;
  private deathParticles!: DeathParticleManager;
  private landingDust!: LandingDustManager;
  private dashAfterimage!: DashAfterimageManager;
  private dashBoostPuff!: DashBoostPuffManager;
  private doubleJumpRing!: DoubleJumpRingManager;
  private wallJumpDust!: WallJumpDustManager;
  private jumpTakeoff!: JumpTakeoffPuffManager;
  private wallSlideDust!: WallSlideDustManager;
  private footstepPuff!: FootstepPuffManager;
  private flaskBurst!: FlaskHealBurstManager;
  private surgeVfx!: SurgeVfxManager;
  private comboFinisherBurst!: ComboFinisherBurstManager;
  private criticalHighlight!: CriticalHighlightManager;
  private hitBloodSpray!: HitBloodSprayManager;
  private diveLandImpact!: DiveLandImpactManager;
  private waterSplash!: WaterSplashManager;
  private waterBubbles!: WaterBubblesManager;
  private dropThroughDust!: DropThroughDustManager;
  private iceSkidStreak!: IceSkidStreakManager;
  private itemPickupGlow!: ItemPickupGlowManager;
  private lowHpVignette!: LowHpVignetteManager;
  private screenFlash!: ScreenFlash;
  private toast!: ToastManager;
  // A15: innocent capture seal orbs — rise from capture point, home to player
  private captureOrbs: { gfx: Graphics; x: number; y: number; vx: number; vy: number; life: number; maxLife: number }[] = [];
  // A16: before/after stratum-clear panel. Stays until player presses X.
  private stratumClearPanel: { container: Container; confirmed: boolean } | null = null;
  // A17: boss-kill choice panel (Continue deeper vs Exit safely).
  private bossChoicePanel: Container | null = null;
  private bossChoiceVisible = false;
  private _pendingStratumSnapshot: {
    a6BeforeAtk: number;
    a6AfterAtk: number;
    a16: { beforeAtk: number; afterAtk: number; beforeLevel: number; afterLevel: number; beforeInnocents: number; afterInnocents: number };
  } | null = null;
  private _pendingNextStratumIndex = -1;

  // Item being explored
  private item: ItemInstance;
  private inventory: Inventory;
  private sourcePlayer: Player;

  // Memory Strata state
  private strataConfig!: StrataConfig;
  private currentStratumIndex = 0;
  private currentStratumDef!: StratumDef;
  private progress!: ItemWorldProgress;
  // A6 (playtest 2026-04-17): captured item.finalAtk at the start of each
  // stratum so we can show "+X% DMG" when the stratum is cleared.
  private stratumStartAtk = 0;
  // A16 (playtest 2026-04-17): additional before-stratum snapshot for the
  // stratum-clear before/after panel.
  private stratumStartLevel = 0;
  private stratumStartInnocentCount = 0;

  // First Normal entry special (tutorial): 3x3 grid, boss HP x0.7, no enrage
  private isFirstNormalEntry = false;
  // Last non-boss room coords for first-entry respawn
  private lastSafeRoomCol = 0;
  private lastSafeRoomRow = 0;

  // Unified grid (all strata combined)
  private earnedExp = 0;
  earnedGold = 0;
  private roomsCleared = 0;
  private totalRooms = 0;
  private unifiedGrid!: UnifiedGridData;
  private currentCol = 0;
  private currentRow = 0; // absolute row in unified grid
  private roomData: number[][] = [];
  private rng!: PRNG;

  // Full-map rendering (all rooms rendered into one continuous grid)
  private fullGrid: number[][] = [];
  /** Cells written by door-mask seal (code-generated walls, not LDtk). */
  private sealedCells = new Set<string>();
  private fullMapContainer: Container | null = null;
  /** Palette-swap filter for background tiles (production default). */
  private bgPaletteFilter!: PaletteSwapFilter;
  /** Palette-swap filter for wall + shadow tiles (dark, cool row). */
  private wallPaletteFilter!: PaletteSwapFilter;
  /**
   * Aggregate layer containers sitting INSIDE fullMapContainer. All rooms'
   * bg/wall/shadow sub-layers are re-parented into these so the palette
   * filter sees ONE continuous target — otherwise each per-room filter
   * instance has its own filter bounds and the depth gradient visibly
   * resets at every room seam. Rebuilt alongside fullMapContainer.
   */
  private bgAggregate: Container | null = null;
  private wallAggregate: Container | null = null;
  private shadowAggregate: Container | null = null;
  /** Filter-free aggregate for hazard/signal tiles (water/spike/updraft/...). */
  private specialAggregate: Container | null = null;
  private sealAggregate: Container | null = null;

  // Updraft (IntGrid value 4) — particles + force handled per-frame
  private updraftSystem!: UpdraftSystem;

  // LDtk-placed static entities (Option A: 7 hazard/puzzle types)
  private spikes: Spike[] = [];
  private crackedFloors: CrackedFloor[] = [];
  private collapsingPlatforms: CollapsingPlatform[] = [];
  private growingWalls: GrowingWall[] = [];
  private switches: Switch[] = [];
  private lockedDoors: LockedDoor[] = [];
  private cameraZones: {
    x: number; y: number; w: number; h: number;
    zoom: number; deadZoneX: number; deadZoneY: number;
    lookAheadDistance: number; followLerp: number; zoomLerp: number;
    entireLevel: boolean;
  }[] = [];
  private activeCameraZone: typeof this.cameraZones[number] | null = null;
  private spawnedRooms: Set<string> = new Set(); // tracks which rooms have spawned enemies
  private roomTypeMap: Map<string, string> = new Map(); // "col:absRow" → LDtk roomType
  private roomEnemyCount: Map<string, number> = new Map(); // "col,absRow" → live enemy count for clear tracking
  private lastPreSpawnRoomKey: string | null = null; // last room that triggered preSpawnNeighborRooms
  // Breakable tile (IntGrid 9) hit tracking — 3 swings to destroy
  private breakableHits: Map<string, number> = new Map(); // "tileCol,tileRow" → hits taken
  private breakableHitThisSwing: Set<string> = new Set();
  private breakableLastCombo = -1;

  // Memory Room (Phase 0: lore pause rooms). Populated in init() for the current item.
  private memoryRoomPlacements: Map<string, LdtkLevel> = new Map(); // "col:absRow" → memory template
  private memoryTriggers: Array<{
    x: number; y: number; w: number; h: number;
    text: string;
    speaker?: string;
    portrait?: string;
    active: boolean; // currently inside the trigger — reset on exit to allow re-read
    // Visual (legendary-tier crystal, distinct from sword drops)
    anchorX: number; anchorY: number;           // visual anchor world pos
    container: Container;                        // holds glow + shard + particles
    shardGfx: Graphics;                          // rotated diamond
    glowGfx: Graphics;                           // outer radial glow
    particles: Array<{ x: number; y: number; vx: number; vy: number; life: number; maxLife: number; gfx: Graphics }>;
    spawnTimer: number;
    pulseTimer: number;
    bobTimer: number;
  }> = [];
  private loreDisplay: LoreDisplay | null = null;

  // Room transition
  private transitionState: TransitionState = 'none';
  private transitionTimer = 0;
  private pendingDirection: 'left' | 'right' | 'up' | 'down' | null = null;

  // Escape altar
  private altarTrigger: { x: number; y: number; width: number; height: number } | null = null;
  private altarVisual: Graphics | null = null;
  private altarHint: Container | null = null;
  private escapeConfirmFromAltar = false;
  private exitReason: 'escape' | 'clear' | 'death' = 'escape';
  private exitTracked = false;
  private fadeOverlay!: Graphics;
  private doorTriggers: ReturnType<typeof getDoorTriggers> = [];

  // Exit trigger (at stratum end rooms)
  private exitTrigger: { x: number; y: number; width: number; height: number } | null = null;
  private exitVisual: Graphics | null = null;
  private exitPrompt: Container | null = null;

  // Door markers
  private doorMarkers: Graphics[] = [];

  // Minimap
  private miniMapContainer!: Container;

  // Escape confirm dialog
  private escapeConfirm: Container | null = null;
  private escapeConfirmVisible = false;

  // Stratum picker (shown on entry when player has unlocked >1 stratum)
  private stratumPicker: Container | null = null;
  private stratumPickerVisible = false;
  private stratumPickerSelection = 0;
  private stratumPickerMax = 0;

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

  /** Set to true if the global Item World tutorial has already been completed. */
  itemWorldTutorialDone = false;

  constructor(game: Game, item: ItemInstance, inventory: Inventory, sourcePlayer: Player) {
    super(game);
    this.item = item;
    this.inventory = inventory;
    this.sourcePlayer = sourcePlayer;
  }

  async init(): Promise<void> {
    // Lazy-load only the tilesets this item world needs. Driven by the
    // Tileset column of Content_System_Area_Palette.csv — the rarity of the
    // current item determines which rows (iw_{rarity}_bg/wall) are consulted.
    const rarityId = this.item.rarity;
    const areaIds = [`iw_${rarityId}_bg`, `iw_${rarityId}_wall`];
    await ensureAreaTilesetsLoaded(areaIds, this.atlases);
    this.atlas =
      this.atlases['atlas/SunnyLand_by_Ansimuz-extended.png'] ??
      Object.values(this.atlases)[0] ??
      null;
    try {
      const json = await fetch(assetPath('assets/World_ProjectAbyss.ldtk')).then(r => r.json());
      this.ldtkLoader = new LdtkLoader();
      this.ldtkLoader.load(json, 'ItemStratum');
      this.ldtkTemplates = this.ldtkLoader.getLevelIds().map(id => this.ldtkLoader!.getLevel(id)!);
      this.ldtkRenderer = new LdtkRenderer();
    } catch (e) {
      console.warn('[ItemWorld] LDtk templates not found, using code templates');
    }

    // Load spawn table CSV
    await loadSpawnTable();

    // Memory Strata setup
    this.strataConfig = STRATA_BY_RARITY[this.item.rarity];
    this.progress = getOrCreateWorldProgress(this.item);
    // If the item was previously fully cleared, this entry is a "re-dive":
    // reset all per-cycle progress (cleared rooms, deepest unlocked, etc.)
    // so monsters respawn fresh. Item level / innocents are preserved.
    if (this.progress.cleared) {
      resetItemForNextCycle(this.item);
      this.progress = getOrCreateWorldProgress(this.item);
      console.log('[ItemWorld] Re-dive: progress reset for cycle', this.progress.cycle);
    }

    // First Normal entry special: 2x2 grid, boss HP x0.7, no enrage
    // Condition: global tutorial not yet done + Normal rarity + cycle 0 + no strata cleared
    this.isFirstNormalEntry = !this.itemWorldTutorialDone
      && this.item.rarity === 'normal'
      && this.progress.cycle === 0
      && this.progress.deepestUnlocked === 0
      && this.progress.clearedRooms.length === 0;
    if (this.isFirstNormalEntry) {
      // Override: 1 stratum only, 2x2 grid, boss HP x0.7
      const first = this.strataConfig.strata[0];
      this.strataConfig = {
        strata: [{
          ...first,
          gridWidth: 2,
          gridHeight: 2,
          bossHpMul: first.bossHpMul * 0.7,
        }],
      };
      console.log('[ItemWorld] First Normal entry special: 1 stratum, 2x2 grid, boss HP x0.7, no enrage');
    }
    this.rng = new PRNG(this.item.uid * 1000);

    // Analytics: item world entry
    trackItemWorldEnter(this.item.rarity);

    this.hitManager = new HitManager(this.game);

    // Generate unified grid (all strata at once)
    this.unifiedGrid = generateUnifiedGrid(this.strataConfig.strata, this.item.uid);

    // Pre-compute Memory Room placements per stratum (from CSV lookup)
    this.computeMemoryRoomPlacements();

    // Determine starting position based on progress
    const startStratumIndex = Math.min(
      this.progress.lastSafeStratum,
      this.progress.deepestUnlocked,
    );
    if (startStratumIndex > 0 && startStratumIndex < this.unifiedGrid.strataOffsets.length) {
      // Use the stratum's actual critical path origin (not the leftmost row-0 scan)
      const stratumStart = this.unifiedGrid.stratumStartRooms?.[startStratumIndex];
      const offset = this.unifiedGrid.strataOffsets[startStratumIndex];
      this.currentCol = stratumStart?.col ?? 0;
      this.currentRow = stratumStart?.absoluteRow ?? offset.rowOffset;
    } else {
      this.currentCol = this.unifiedGrid.startRoom.col;
      this.currentRow = this.unifiedGrid.startRoom.absoluteRow;
    }

    // Derive current stratum from cell
    const startCell = this.unifiedGrid.cells[this.currentRow][this.currentCol];
    this.currentStratumIndex = startCell?.stratumIndex ?? 0;
    this.currentStratumDef = this.strataConfig.strata[this.currentStratumIndex];
    this.stratumStartAtk = this.item.finalAtk;
    this.stratumStartLevel = this.item.level;
    this.stratumStartInnocentCount = this.item.innocents.length;

    // Tilemap
    this.tilemap = new TilemapRenderer(TILE_SIZE);
    this.tilemap.setTheme(this.currentStratumDef.theme);
    this.container.addChild(this.tilemap.container);

    // Dead Cells-style palette swap — production default.
    // Rarity picks BG+WALL palette pair; BG is hue-rich/warm, WALL is
    // dark/complementary. Built once; applied to aggregate containers each
    // rebuild so the gradient is continuous across all rooms.
    // See: Documents/Research/DeadCells_GrayscalePalette_Research.md
    {
      // Data-driven biome: rarity picks an AreaID pair in
      // Sheets/Content_System_Area_Palette.csv. Missing rarity falls back to
      // the Normal pair.
      const rarity = this.item.rarity;
      const bgId = `iw_${rarity}_bg`;
      const wallId = `iw_${rarity}_wall`;
      const bgEntry = getAreaPalette(
        getAreaPaletteAtlas().rowIndex.has(bgId) ? bgId : 'iw_normal_bg',
      );
      const wallEntry = getAreaPalette(
        getAreaPaletteAtlas().rowIndex.has(wallId) ? wallId : 'iw_normal_wall',
      );
      const atlas = getAreaPaletteAtlas();
      this.bgPaletteFilter = new PaletteSwapFilter({
        paletteTex: atlas.texture,
        rowCount: atlas.rowCount,
        row: getAreaPaletteRow(bgEntry.id),
        strength: 1.0,
        depthBias: bgEntry.depthBias,
        depthCenter: bgEntry.depthCenter,
        brightness: bgEntry.brightness,
        tint: bgEntry.tint,
      });
      this.wallPaletteFilter = new PaletteSwapFilter({
        paletteTex: atlas.texture,
        rowCount: atlas.rowCount,
        row: getAreaPaletteRow(wallEntry.id),
        strength: 1.0,
        depthBias: wallEntry.depthBias,
        depthCenter: wallEntry.depthCenter,
        brightness: wallEntry.brightness,
        tint: wallEntry.tint,
      });
    }

    // Entity layer
    this.entityLayer = new Container();
    this.container.addChild(this.entityLayer);

    // Updraft system (shared physics + particles)
    this.updraftSystem = new UpdraftSystem(this.entityLayer);

    // Player (clone stats from world player)
    this.player = new Player(this.game);
    this.player.hp = this.sourcePlayer.hp;
    this.player.maxHp = this.sourcePlayer.maxHp;
    this.player.atk = this.sourcePlayer.atk;
    this.player.def = this.sourcePlayer.def;
    this.player.equippedWeaponType = this.sourcePlayer.equippedWeaponType;
    this.player.equippedRarity = this.sourcePlayer.equippedRarity;
    this.player.attackHitboxMul = this.sourcePlayer.attackHitboxMul;
    this.player.abilities.dash = this.sourcePlayer.abilities.dash;
    this.player.abilities.diveAttack = this.sourcePlayer.abilities.diveAttack;
    this.player.abilities.surge = this.sourcePlayer.abilities.surge;
    this.player.abilities.waterBreathing = this.sourcePlayer.abilities.waterBreathing;
    this.player.abilities.wallJump = this.sourcePlayer.abilities.wallJump;
    this.player.abilities.doubleJump = this.sourcePlayer.abilities.doubleJump;
    // Flask fixed at 3 — rarity scaling is a future upgrade element
    this.player.flaskCharges = 3;
    // Flask/combo heal toast
    this.player.onFlaskHeal = (amount) => {
      this.screenFlash.flash(0x44ff44, 0.3, 150);
      this.dmgNumbers.spawnSpecial(
        this.player.x + this.player.width / 2,
        this.player.y - 16,
        `+${amount}`, 0x44ff44,
      );
      this.flaskBurst?.spawn(
        this.player.x + this.player.width / 2,
        this.player.y + this.player.height / 2,
        Math.min(1, amount / Math.max(1, this.player.maxHp * 0.4)),
      );
    };
    this.entityLayer.addChild(this.player.container);

    // Damage numbers & Sakurai hit effects
    this.dmgNumbers = new DamageNumberManager(this.game.uiContainer, this.game.camera, this.game.uiScale);
    this.hitSparks = new HitSparkManager(this.entityLayer);
    this.deathParticles = new DeathParticleManager(this.entityLayer);
    this.landingDust = new LandingDustManager(this.entityLayer);
    this.dashAfterimage = new DashAfterimageManager(this.entityLayer);
    this.dashBoostPuff = new DashBoostPuffManager(this.entityLayer);
    this.doubleJumpRing = new DoubleJumpRingManager(this.entityLayer);
    this.wallJumpDust = new WallJumpDustManager(this.entityLayer);
    this.jumpTakeoff = new JumpTakeoffPuffManager(this.entityLayer);
    this.wallSlideDust = new WallSlideDustManager(this.entityLayer);
    this.footstepPuff = new FootstepPuffManager(this.entityLayer);
    this.flaskBurst = new FlaskHealBurstManager(this.entityLayer);
    this.surgeVfx = new SurgeVfxManager(this.entityLayer);
    this.comboFinisherBurst = new ComboFinisherBurstManager(this.entityLayer);
    this.criticalHighlight = new CriticalHighlightManager(this.entityLayer);
    this.hitBloodSpray = new HitBloodSprayManager(this.entityLayer);
    this.diveLandImpact = new DiveLandImpactManager(this.entityLayer);
    this.waterSplash = new WaterSplashManager(this.entityLayer);
    this.waterBubbles = new WaterBubblesManager(this.entityLayer);
    this.dropThroughDust = new DropThroughDustManager(this.entityLayer);
    this.iceSkidStreak = new IceSkidStreakManager(this.entityLayer);
    this.itemPickupGlow = new ItemPickupGlowManager(this.entityLayer);
    this.lowHpVignette = new LowHpVignetteManager(this.game.legacyUIContainer);
    this.lowHpVignette.setViewport(GAME_WIDTH, GAME_HEIGHT);
    this.screenFlash = new ScreenFlash();
    this.game.legacyUIContainer.addChild(this.screenFlash.overlay);

    // Fade overlay
    this.fadeOverlay = new Graphics();
    this.fadeOverlay.rect(0, 0, 960, 544).fill(0x000000); // large enough for any room
    this.fadeOverlay.alpha = 0;
    this.container.addChild(this.fadeOverlay);

    // Minimap — disabled (Spelunky-style blind exploration).
    // Container still exists for legacy code paths but is never rendered.
    this.miniMapContainer = new Container();
    this.miniMapContainer.visible = false;

    // HUD
    this.hud = new HUD(this.game.uiScale);
    this.game.uiContainer.addChild(this.hud.container);

    // Controls overlay (disabled)
    this.controlsOverlay = new ControlsOverlay();
    this.controlsOverlay.container.visible = false;

    // Toast
    this.toast = new ToastManager(this.game.legacyUIContainer);

    // Restore persistent exploration state & count rooms
    this.restoreRoomState();
    this.countTotalRooms();

    // Build full map (all rooms rendered into a single continuous grid)
    this.buildFullMap();
    // Initialize depth gauge
    {
      const n = this.strataConfig.strata.length;
      this.hud.showDepthGauge(n, this.currentStratumIndex, new Array(n).fill(false));
    }
    // Initialize item EXP bar
    this.hud.showItemExp(
      this.item.def.name,
      RARITY_COLOR[this.item.rarity],
      this.item.level,
      this.item.exp,
      EXP_PER_LEVEL,
    );
    this.updateHudText();

    // Spawn player at start cell — find first air-above-solid in the center
    // column (template's natural floor).
    const startCol = this.currentCol;
    const stratumStart = this.unifiedGrid.strataOffsets[this.currentStratumIndex]?.rowOffset ?? 0;
    const localStartRow = this.currentRow - stratumStart;
    const spawnCenterX = startCol * IW_ROOM_W_PX + IW_ROOM_W_PX / 2;
    const spawnTileCol = Math.floor(spawnCenterX / TILE_SIZE);
    const roomTopTile = localStartRow * IW_ROOM_H_TILES;

    // Fallback: just below the top of the room
    let spawnY = roomTopTile * TILE_SIZE + 2;
    for (let tr = roomTopTile + 1; tr < roomTopTile + IW_ROOM_H_TILES - 1; tr++) {
      const here = this.fullGrid[tr]?.[spawnTileCol] ?? 1;
      const below = this.fullGrid[tr + 1]?.[spawnTileCol] ?? 1;
      if (here === 0 && below >= 1) {
        spawnY = (tr + 1) * TILE_SIZE - this.player.height;
        break;
      }
    }
    this.player.x = spawnCenterX;
    this.player.y = spawnY;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.savePrevPosition();

    // Camera
    this.game.camera.snap(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2);

    // LoreDisplay for Memory Rooms — displays item memory fragments
    this.loreDisplay = new LoreDisplay(this.game.input);
    this.game.legacyUIContainer.addChild(this.loreDisplay.container);

    this.initialized = true;

    // Sacred Pickup T6 — Return hint HUD. First-ever landing: big-to-small
    // shrink tween. Subsequent landings: small icon straight away.
    this.returnHint = new ReturnHint();
    this.game.uiContainer.addChild(this.returnHint.container);
    this.returnHint.show();

    // Entry banner — announce item name + stratum
    const rarityColor = RARITY_COLOR[this.item.rarity];
    const stratumLabel = `Memory Stratum ${this.currentStratumIndex + 1}`;
    this.toast.showBig(this.item.def.name, rarityColor, 3000);
    this.toast.show(stratumLabel, rarityColor);

    // Show stratum picker if player has unlocked more than one stratum on this item
    const totalStrata = this.strataConfig.strata.length;
    const maxSelectable = Math.min(this.progress.deepestUnlocked + 1, totalStrata);
    if (maxSelectable > 1) {
      this.showStratumPicker(maxSelectable);
    }
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

    // Restore spawned rooms set so previously-entered rooms don't re-spawn enemies.
    // Also use roomKey format "playerRoomCol,playerRoomRow" used by lazy spawn check.
    this.spawnedRooms.clear();
    for (const key of this.progress.spawnedRooms ?? []) {
      this.spawnedRooms.add(key);
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
    this.progress.spawnedRooms = Array.from(this.spawnedRooms);
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
    // Create aggregate layer containers so the palette filter spans the
    // entire map in ONE pass (continuous gradient across all rooms).
    this.bgAggregate = new Container();
    this.wallAggregate = new Container();
    this.specialAggregate = new Container();
    this.shadowAggregate = new Container();
    this.sealAggregate = new Container();
    // Render order: bg -> walls -> special(hazards) -> shadows -> seal overlays
    this.fullMapContainer.addChild(this.bgAggregate);
    this.fullMapContainer.addChild(this.wallAggregate);
    this.fullMapContainer.addChild(this.specialAggregate);
    this.fullMapContainer.addChild(this.shadowAggregate);
    this.fullMapContainer.addChild(this.sealAggregate);
    this.bgAggregate.filters = [this.bgPaletteFilter];
    this.wallAggregate.filters = [this.wallPaletteFilter];
    // specialAggregate: NO filter — hazard color cues (water/spike/updraft)
    // are gameplay-critical and must not be swept into the biome palette.
    this.shadowAggregate.filters = [this.wallPaletteFilter];
    // Seal walls use the wall filter so their brick pattern reads in the
    // same dark-cool silhouette family as LDtk wall tiles.
    this.sealAggregate.filters = [this.wallPaletteFilter];
    this.spawnedRooms.clear();
    this.roomTypeMap.clear();
    this.clearEnemies();
    this.clearEscapeAltar();
    this.exitTrigger = null;

    const _dbgRowStart = this.unifiedGrid.strataOffsets[this.currentStratumIndex]?.rowOffset ?? 0;
    const _dbgHeight = this.strataConfig.strata[this.currentStratumIndex]?.gridHeight ?? 4;
    console.log(`[ItemWorld] buildFullMap stratum=${this.currentStratumIndex} rowStart=${_dbgRowStart} gridSize=${this.unifiedGrid.totalWidth}x${_dbgHeight} templates=${this.ldtkTemplates.length}`);

    // Initialize full grid as solid (1) — unrendered regions remain impassable
    // fullGrid is IW_FULL_H_TILES rows × IW_FULL_W_TILES cols (128 wide × 64 tall)
    this.fullGrid = [];
    this.sealedCells.clear();
    for (let r = 0; r < IW_FULL_H_TILES; r++) {
      this.fullGrid[r] = new Array(IW_FULL_W_TILES).fill(1);
    }

    // Clear any previously spawned static entities (rebuild = fresh world)
    this.clearStaticEntities();

    // Place each room template into the full grid (current stratum only)
    const grid = this.unifiedGrid;
    const stratumRowStart = grid.strataOffsets[this.currentStratumIndex]?.rowOffset ?? 0;

    let roomCount = 0;
    for (let localRow = 0; localRow < IW_GRID_H; localRow++) {
      const absRow = stratumRowStart + localRow;
      for (let col = 0; col < IW_GRID_W; col++) {
        const cell = grid.cells[absRow]?.[col];
        // Fill ALL 16 cells with rooms (critical path + filler rooms)
        const rng = new PRNG(this.item.uid * 10000 + col * 100 + absRow);
        const ldtkLevel = this.pickLdtkTemplate(cell ?? null as any, rng);
        if (!ldtkLevel || !this.ldtkRenderer || !this.atlas) continue;

        // Store roomType for spawn logic
        this.roomTypeMap.set(`${col}:${absRow}`, ldtkLevel.roomType ?? 'Combat');

        const roomGrid = ldtkLevel.collisionGrid;
        const roomH = roomGrid.length;
        const roomW = roomGrid[0]?.length ?? 0;

        // Copy room collision data into fullGrid at LOCAL offset
        const offR = localRow * IW_ROOM_H_TILES;
        const offC = col * IW_ROOM_W_TILES;
        for (let tr = 0; tr < roomH && tr < IW_ROOM_H_TILES; tr++) {
          for (let tc = 0; tc < roomW && tc < IW_ROOM_W_TILES; tc++) {
            this.fullGrid[offR + tr][offC + tc] = roomGrid[tr][tc];
          }
        }

        // Door mask: carve openings where the cell has a logical exit,
        // seal the full edge strip where it doesn't. Without this, every
        // template's 4-way doors stay open and the critical path collapses
        // into a direct shortcut to the boss.
        const mask = this.computeDoorMask(cell ?? null, ldtkLevel);
        this.applyDoorMaskToFullGrid(mask, offR, offC);

        // Render room tiles — ALL layers including wallTiles so that LDtk
        // auto-tile rules for platform(3), updraft(4), etc. render properly.
        // Each room's layers are re-parented into the aggregate containers
        // so the palette filter runs ONCE over the full map (continuous
        // gradient, no per-room seams).
        const roomX = col * IW_ROOM_W_PX;
        const roomY = localRow * IW_ROOM_H_PX;
        const inBounds = (t: { px: [number, number] }) =>
          t.px[0] >= 0 && t.px[0] < IW_ROOM_W_PX &&
          t.px[1] >= 0 && t.px[1] < IW_ROOM_H_PX;
        const bgTiles = ldtkLevel.backgroundTiles.filter(inBounds);
        const wallTiles = ldtkLevel.wallTiles.filter(inBounds);
        const shadowTiles = ldtkLevel.shadowTiles.filter(inBounds);
        const renderer = new LdtkRenderer();
        // CSV Tileset is authoritative — retag tiles to the CSV-derived atlas
        // key so BG and WALL never collide on LDtk's shared __tilesetRelPath.
        const bgAreaId = `iw_${this.item.rarity}_bg`;
        const wallAreaId = `iw_${this.item.rarity}_wall`;
        applyAreaTilesetToLdtkTiles(bgAreaId, bgTiles);
        applyAreaTilesetToLdtkTiles(wallAreaId, wallTiles);
        applyAreaTilesetToLdtkTiles(wallAreaId, shadowTiles);
        renderer.renderLevel(bgTiles, wallTiles, shadowTiles, this.atlases, undefined, ldtkLevel.collisionGrid);
        renderer.bgLayer.position.set(roomX, roomY);
        renderer.wallLayer.position.set(roomX, roomY);
        renderer.specialLayer.position.set(roomX, roomY);
        renderer.shadowLayer.position.set(roomX, roomY);
        this.bgAggregate!.addChild(renderer.bgLayer);
        this.wallAggregate!.addChild(renderer.wallLayer);
        this.specialAggregate!.addChild(renderer.specialLayer);
        this.shadowAggregate!.addChild(renderer.shadowLayer);

        // Seal-wall overlays (code-generated 0x101010 fills on door-mask cells).
        // Drawn on the seal aggregate so they render above tiles and are
        // NOT swept by the wall palette (flat black seam look intentional).
        const sealContainer = new Container();
        sealContainer.position.set(roomX, roomY);
        this.drawUniformWalls(sealContainer, offR, offC);
        this.sealAggregate!.addChild(sealContainer);

        // Spawn LDtk-placed static entities for this room (with world offset)
        this.spawnStaticEntitiesForRoom(ldtkLevel, col * IW_ROOM_W_PX, localRow * IW_ROOM_H_PX);

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

    // Set collision and camera to full map (128w × 64h tiles)
    this.roomData = this.fullGrid;
    this.player.roomData = this.fullGrid;
    this.game.camera.setBounds(0, 0, IW_FULL_W_TILES * TILE_SIZE, IW_FULL_H_TILES * TILE_SIZE);

    this.persistRoomState();
    this.drawMiniMap();

    // Restore boss portal if the current stratum's boss was previously killed.
    // Clean up stale portal from prior stratum.
    this.exitTrigger = null;
    if (this.exitVisual?.parent) this.exitVisual.parent.removeChild(this.exitVisual);
    this.exitVisual = null;
    if (this.exitPrompt?.parent) this.exitPrompt.parent.removeChild(this.exitPrompt);
    this.exitPrompt = null;
    this.restorePortalIfStratumCleared();
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

    // Stratum start room — safe zone, no monsters. Mark cleared so re-entry
    // skips the spawn path entirely.
    const si = cell.stratumIndex ?? 0;
    const stratumStartCell = this.unifiedGrid.stratumStartRooms?.[si];
    if (stratumStartCell &&
        stratumStartCell.col === col &&
        stratumStartCell.absoluteRow === row) {
      if (!cell.cleared) {
        cell.cleared = true;
        this.roomsCleared++;
        this.persistRoomState();
      }
      return;
    }

    // Memory Room — lore pause, no enemies. Mark as cleared to keep it empty,
    // mirroring the normal clear path (counter bump + persist). HUD refreshes
    // automatically every frame via update()'s updateHudText() call.
    if (this.memoryRoomPlacements.has(`${col}:${row}`)) {
      if (!cell.cleared) {
        cell.cleared = true;
        this.roomsCleared++;
        this.persistRoomState();
      }
      return;
    }

    const roomKey = `${col},${row}`;
    // Helper to tag a freshly-spawned enemy with its room and bump live count
    const trackEnemy = (e: Enemy<string>) => {
      (e as any)._roomKey = roomKey;
      this.roomEnemyCount.set(roomKey, (this.roomEnemyCount.get(roomKey) ?? 0) + 1);
    };

    const stratumDef = this.strataConfig.strata[cell.stratumIndex ?? 0];
    const stratumStart = this.unifiedGrid.strataOffsets[this.currentStratumIndex]?.rowOffset ?? 0;
    const localRow = row - stratumStart;
    const offX = col * IW_ROOM_W_PX;
    const offY = localRow * IW_ROOM_H_PX;

    const dist = Math.abs(col - this.unifiedGrid.startRoom.col)
               + Math.abs(row - this.unifiedGrid.startRoom.absoluteRow);
    const distScale = 1 + dist * 0.1;

    // Pre-compute all valid spawn positions: air tile with solid tile below.
    // Scan the room's tile range (32 cols × 16 rows), leaving a 2-tile margin.
    const roomTopRow = Math.floor(offY / TILE_SIZE);
    const roomTopCol = Math.floor(offX / TILE_SIZE);
    const spawnPoints: Array<{ x: number; y: number }> = [];

    for (let tc = roomTopCol + 2; tc < roomTopCol + IW_ROOM_W_TILES - 2; tc++) {
      for (let tr = roomTopRow + 2; tr < roomTopRow + IW_ROOM_H_TILES - 2; tr++) {
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

    const roomType = this.roomTypeMap.get(`${col}:${row}`) ?? 'Combat';
    const isBossRoom = roomType === 'Boss';
    const stratumIndex = (cell.stratumIndex ?? 0) + 1; // 1-based for CSV
    const spawnTable = getSpawnTable(this.item.rarity, stratumIndex);

    // Cycle scaling — bump CSV level by +cycle so each replay uses the next
    // row in Content_Stats_Enemy.csv (CSV jump is the "1 level stronger" feel).
    const cycle = this.progress?.cycle ?? 0;

    // ─── RoomType-specific branching ────────────────────────────────────────
    // Rest / Puzzle rooms carry zero enemies — they break the combat rhythm.
    // Rest also drops 1-2 HealingPickups. Mark cleared so HUD counters update.
    if (roomType === 'Rest') {
      const restRng = new PRNG(this.item.uid * 999 + col * 77 + row * 33 + 42);
      const healCount = 1 + restRng.nextInt(0, 1); // 1-2 pickups
      for (let i = 0; i < healCount && spawnPoints.length > 0; i++) {
        const pt = spawnPoints[restRng.nextInt(0, spawnPoints.length - 1)];
        const heal = createForgeEmber(pt.x, pt.y, this.player.maxHp);
        this.healingPickups.push(heal);
        this.entityLayer.addChild(heal.container);
      }
      if (!cell.cleared) {
        cell.cleared = true;
        this.roomsCleared++;
        this.persistRoomState();
      }
      return;
    }

    if (roomType === 'Puzzle') {
      // Puzzle content (switches / locked doors) lives in the LDtk template.
      // Spawn nothing; do NOT auto-clear — solving the puzzle clears it.
      return;
    }

    // Treasure room — 1 GoldenMonster as an elite encounter.
    if (roomType === 'Treasure') {
      const gold = this.createEnemyFromType('GoldenMonster', 1 + cycle);
      gold.hp = gold.maxHp = Math.max(1, Math.floor(gold.hp * stratumDef.hpMul));
      gold.atk = Math.max(1, Math.floor(gold.atk * stratumDef.atkMul));
      const goldRng = new PRNG(this.item.uid * 999 + col * 77 + row * 33 + 99);
      const sp = pickSpawn(goldRng, gold.height);
      gold.x = sp.x;
      gold.y = sp.y;
      gold.roomData = this.fullGrid;
      gold.target = this.player;
      this.enemies.push(gold);
      this.entityLayer.addChild(gold.container);
      trackEnemy(gold);
      return;
    }
    // ────────────────────────────────────────────────────────────────────────

    // Boss room — only spawn boss when LDtk template is 'Boss' type
    if (isBossRoom && spawnTable.boss) {
      const bossEntry = spawnTable.boss;
      const boss = this.createEnemyFromType(bossEntry.enemyType, bossEntry.level + cycle);
      (boss as any)._isBoss = true;
      // Multiply CSV-based stats by stratum boss multipliers + distance scaling
      boss.hp = boss.maxHp = Math.max(1, Math.floor(boss.hp * stratumDef.bossHpMul * distScale));
      boss.atk = Math.max(1, Math.floor(boss.atk * stratumDef.bossAtkMul * distScale));
      // First Normal entry special: charge only, no enrage, ATK halved
      if (this.isFirstNormalEntry && boss instanceof Guardian) {
        boss.noEnrage = true;
        boss.chargeOnly = true;
        boss.atk = Math.max(1, Math.floor(boss.atk * 0.5));
      }
      const bossRng = new PRNG(this.item.uid * 999 + col * 77 + row * 33);
      // Prefer the center of a 16-tile continuous flat floor; fall back to
      // a random valid spawn point if no such run exists.
      const flat = this.findFlatFloorCenter(roomTopCol, roomTopRow, 16);
      let sp: { x: number; y: number };
      if (flat) {
        sp = { x: flat.x - boss.width / 2, y: flat.y - boss.height };
      } else {
        sp = pickSpawn(bossRng, boss.height);
      }
      boss.x = sp.x;
      boss.y = sp.y;
      boss.roomData = this.fullGrid;
      boss.target = this.player;
      this.enemies.push(boss);
      this.entityLayer.addChild(boss.container);
      trackEnemy(boss);
      return;
    }

    // Normal room — spawn from weighted table.
    // Single-entry weighted pick per room: CSV weights sum to 100 per
    // (rarity,stratum) group with per-entry deltas (10..70), which matches
    // pickWeightedEnemy's "pick one" semantics. GoldenMonster's 10% weight
    // should only trigger 10% of the time, not every room.
    const normalEntries = spawnTable.normal;
    if (normalEntries.length === 0) return;

    const pickSeed = this.item.uid * 999 + col * 77 + row * 33;
    const pickRng = new PRNG(pickSeed);
    const picked = pickWeightedEnemy(normalEntries, pickRng.next());
    if (!picked) return;

    // Count roll for the picked entry
    const countSeed = pickSeed + picked.enemyType.charCodeAt(0) * 17;
    const countRng = new PRNG(countSeed);
    const range = picked.maxCount - picked.minCount;
    const rolledCount = range > 0
      ? picked.minCount + countRng.nextInt(0, range)
      : picked.minCount;

    let spawnIndex = 0;
    for (let i = 0; i < rolledCount; i++) {
      const spawnRng = new PRNG(pickSeed + spawnIndex);
      spawnIndex++;

      // 15% chance to spawn an InnocentNPC instead of a regular enemy
      const innocentRoll = spawnRng.next();
      if (innocentRoll < INNOCENT_SPAWN_CHANCE && canAddInnocent(this.item)) {
        const seedForArchetype = this.item.uid + col * 13 + row * 7 + spawnIndex;
        const innocent = createRandomInnocent(seedForArchetype, cell.stratumIndex ?? 0);

        const npc = new InnocentNPC();
        npc.innocent = innocent;
        npc.onSubdued = () => {
          innocent.isSubdued = true;
          addInnocent(this.item, innocent);
          this.dmgNumbers.spawnSpecial(
            npc.x + npc.width / 2, npc.y - 16,
            `${innocent.name} +${innocent.value} ${innocent.stat}`, 0xffdd44,
          );
          this.updateHudText();
          // A15 (playtest 2026-04-17): capture ceremony.
          // - Cyan screen flash (matches innocent aesthetic, distinct from kill)
          // - Capture SFX (rising sweep + crystal ping)
          // - Seal orb VFX that rises from the innocent and implodes toward the
          //   player, representing "sealed into the item".
          this.screenFlash.flash(0x88ddff, 0.35, 180);
          SFX.play('capture');
          this.spawnCaptureOrb(
            npc.x + npc.width / 2,
            npc.y + npc.height / 2,
          );
        };

        const sp = pickSpawn(spawnRng, npc.height);
        npc.x = sp.x;
        npc.y = sp.y;
        npc.roomData = this.fullGrid;
        npc.target = this.player;
        this.enemies.push(npc);
        this.entityLayer.addChild(npc.container);
        trackEnemy(npc);
        continue;
      }

      // Spawn the picked entry's enemy type
      const enemy = this.createEnemyFromType(picked.enemyType, picked.level + cycle);
      // Multiply CSV-based stats by stratum + distance scaling
      enemy.hp = enemy.maxHp = Math.max(1, Math.floor(enemy.hp * stratumDef.hpMul * distScale));
      enemy.atk = Math.max(1, Math.floor(enemy.atk * stratumDef.atkMul * distScale));
      const sp = pickSpawn(spawnRng, enemy.height);
      enemy.x = sp.x;
      enemy.y = sp.y;
      enemy.roomData = this.fullGrid;
      enemy.target = this.player;
      this.enemies.push(enemy);
      this.entityLayer.addChild(enemy.container);
      trackEnemy(enemy);
    }
  }

  /**
   * Create the boss-exit red portal at a pixel position, register it as the
   * exitTrigger, and add graphics to entityLayer. Shared by fresh boss kills
   * and by re-entry into already-cleared boss rooms.
   */
  private spawnBossPortal(px: number, py: number): void {
    // Clean up previous portal if any
    if (this.exitVisual?.parent) this.exitVisual.parent.removeChild(this.exitVisual);
    this.exitVisual = null;

    const portalGfx = new Graphics();
    portalGfx.rect(-28, -32, 56, 48).fill({ color: 0xff0000, alpha: 0.25 });
    portalGfx.rect(-20, -28, 40, 40).fill(0xcc0000);
    portalGfx.rect(-14, -24, 28, 32).fill(0xff2222);
    portalGfx.rect(-8, -20, 16, 24).fill(0xff6666);
    portalGfx.rect(-4, -16, 8, 16).fill(0xffaaaa);
    portalGfx.x = px;
    portalGfx.y = py;
    this.entityLayer.addChild(portalGfx);
    this.exitVisual = portalGfx;

    this.exitTrigger = {
      x: px - 24, y: py - 32,
      width: 48, height: 48,
    };

    // Context prompt for portal
    if (this.exitPrompt?.parent) this.exitPrompt.parent.removeChild(this.exitPrompt);
    this.exitPrompt = KeyPrompt.createPrompt('\u2191', 'Descend', this.game.uiScale);
    this.exitPrompt.visible = false;
    this.game.uiContainer.addChild(this.exitPrompt);
  }

  /**
   * On stratum load, if the current stratum's boss room is already cleared
   * (player killed it in a previous session and re-entered via the stratum
   * picker), restore the exit portal so the player can descend again.
   */
  private restorePortalIfStratumCleared(): void {
    const endRoom = this.unifiedGrid.stratumEndRooms.find(
      e => e.stratumIndex === this.currentStratumIndex,
    );
    if (!endRoom) return;
    const cell = this.unifiedGrid.cells[endRoom.absoluteRow]?.[endRoom.col];
    if (!cell || !cell.cleared) return;

    // Compute portal anchor at boss room's center-bottom in fullGrid space
    const stratumOffset = this.unifiedGrid.strataOffsets[this.currentStratumIndex]?.rowOffset ?? 0;
    const localRow = endRoom.absoluteRow - stratumOffset;
    const roomCenterX = endRoom.col * IW_ROOM_W_PX + IW_ROOM_W_PX / 2;
    // Find a solid floor tile in the boss room to place the portal just above
    const roomTopTile = localRow * IW_ROOM_H_TILES;
    const centerTileCol = Math.floor(roomCenterX / TILE_SIZE);
    let portalTileY = roomTopTile + IW_ROOM_H_TILES - 4;
    for (let tr = roomTopTile + 2; tr < roomTopTile + IW_ROOM_H_TILES - 2; tr++) {
      if ((this.fullGrid[tr]?.[centerTileCol] ?? 1) === 0 &&
          (this.fullGrid[tr + 1]?.[centerTileCol] ?? 1) >= 1) {
        portalTileY = tr; break;
      }
    }
    const portalX = roomCenterX;
    const portalY = (portalTileY + 1) * TILE_SIZE;
    this.spawnBossPortal(portalX, portalY);
    this.toast.show('Boss room cleared — red portal ready.', 0xff8844);
  }

  /**
   * Check if the player has entered any Memory Room trigger area. Shows the
   * dialogue once per entry; the trigger resets to "inactive" when the player
   * leaves the area, so re-reading is possible (AC5).
   */
  private checkMemoryTriggers(dt: number = 16): void {
    // Animate every memory shard (bob, pulse, particles) regardless of dialogue state
    for (const t of this.memoryTriggers) {
      // Bob up/down
      t.bobTimer += dt;
      const bobOffset = Math.sin(t.bobTimer * 0.0025) * 2;
      t.container.y = t.anchorY + bobOffset;

      // Pulse scale + glow alpha
      t.pulseTimer += dt;
      const pulse = Math.sin(t.pulseTimer * 0.004);
      const scale = 1.0 + pulse * 0.18;
      t.shardGfx.scale.set(scale);
      t.shardGfx.rotation = Math.sin(t.pulseTimer * 0.002) * 0.08; // gentle rotation sway
      t.glowGfx.alpha = 0.7 + pulse * 0.3;

      // Particle spawn (3 per cycle, 400ms interval)
      t.spawnTimer -= dt;
      if (t.spawnTimer <= 0) {
        t.spawnTimer = 400;
        for (let i = 0; i < 3; i++) {
          const pgfx = new Graphics();
          const size = 1 + Math.random() * 1.5;
          pgfx.rect(-size / 2, -size / 2, size, size)
            .fill({ color: i % 2 === 0 ? 0xff8000 : 0xffcc66 });
          const px = (Math.random() - 0.5) * 16;
          const py = 4 + Math.random() * 4;
          pgfx.x = px;
          pgfx.y = py;
          t.container.addChild(pgfx);
          const maxLife = 900 + Math.random() * 500;
          t.particles.push({
            x: px, y: py,
            vx: (Math.random() - 0.5) * 20,
            vy: -(20 + Math.random() * 20),
            life: maxLife, maxLife,
            gfx: pgfx,
          });
        }
      }

      // Update existing particles
      for (let i = t.particles.length - 1; i >= 0; i--) {
        const p = t.particles[i];
        p.life -= dt;
        p.x += p.vx * (dt / 1000) + Math.sin(p.life * 0.01) * 0.3;
        p.y += p.vy * (dt / 1000);
        p.gfx.x = p.x;
        p.gfx.y = p.y;
        p.gfx.alpha = Math.max(0, p.life / p.maxLife) * 0.9;
        if (p.life <= 0) {
          if (p.gfx.parent) p.gfx.parent.removeChild(p.gfx);
          t.particles.splice(i, 1);
        }
      }
    }

    // Dialogue trigger check
    if (!this.loreDisplay) return;
    if (this.loreDisplay.isActive) return;
    const pcx = this.player.x + this.player.width / 2;
    const pcy = this.player.y + this.player.height / 2;
    for (const t of this.memoryTriggers) {
      const inside = pcx >= t.x && pcx < t.x + t.w && pcy >= t.y && pcy < t.y + t.h;
      if (inside && !t.active) {
        t.active = true;
        this.loreDisplay.showDialogue([{
          text: t.text,
          speaker: t.speaker,
          portrait: t.portrait,
        }], false);
        break;
      }
      if (!inside && t.active) {
        t.active = false;
      }
    }
  }

  /**
   * Memory Room placement — for each stratum that has a memory room configured
   * for the current weapon (Sheets/Content_ItemWorld_MemoryRooms.csv), reserve
   * a branch cell in that stratum so the template is inserted deterministically
   * into the procedural grid.
   *
   * Prefers off-critical-path rooms. Falls back to any non-boss, non-start cell.
   */
  private computeMemoryRoomPlacements(): void {
    this.memoryRoomPlacements.clear();
    if (!this.ldtkTemplates || this.ldtkTemplates.length === 0) return;

    const weaponId = this.item.def.id;
    for (let si = 0; si < this.strataConfig.strata.length; si++) {
      const roomName = getMemoryRoom(weaponId, si);
      if (!roomName) continue;
      const template = this.ldtkTemplates.find(t => t.identifier === roomName);
      if (!template) {
        console.warn(`[ItemWorld] Memory room template "${roomName}" not found for ${weaponId} stratum ${si}`);
        continue;
      }

      const offset = this.unifiedGrid.strataOffsets[si];
      if (!offset) continue;
      const height = this.strataConfig.strata[si].gridHeight;

      const startCol = this.unifiedGrid.startRoom.col;
      const startAbsRow = this.unifiedGrid.startRoom.absoluteRow;

      // First pass: prefer off-critical-path branch rooms
      const branchCandidates: { col: number; absRow: number }[] = [];
      // Second pass fallback: any non-boss, non-start cell
      const anyCandidates: { col: number; absRow: number }[] = [];

      for (let localRow = 0; localRow < height; localRow++) {
        for (let col = 0; col < this.unifiedGrid.totalWidth; col++) {
          const absRow = offset.rowOffset + localRow;
          const cell = this.unifiedGrid.cells[absRow]?.[col];
          if (!cell) continue;
          if (this.isStratumEndRoom(col, absRow)) continue;
          if (col === startCol && absRow === startAbsRow) continue;
          if (!cell.onCriticalPath) branchCandidates.push({ col, absRow });
          anyCandidates.push({ col, absRow });
        }
      }

      const pool = branchCandidates.length > 0 ? branchCandidates : anyCandidates;
      if (pool.length === 0) continue;

      const rng = new PRNG(this.item.uid * 131 + si * 7 + 13);
      const picked = pool[rng.nextInt(0, pool.length - 1)];
      const key = `${picked.col}:${picked.absRow}`;
      this.memoryRoomPlacements.set(key, template);
      console.log(`[ItemWorld] Memory room placement stratum=${si} weapon=${weaponId} cell=(${picked.col},${picked.absRow}) template=${roomName}`);
    }
  }

  // ---------------------------------------------------------------------------
  // Door mask — auto-carve exits + auto-seal unused edges, driven by cell.exits
  // ---------------------------------------------------------------------------

  /**
   * Compute carve/seal rectangles in room-local tile coords.
   * - carveRectsLocal: passable openings (fullGrid → 0) where the logical
   *   exit is required. Horizontal doors use the template's floor row so
   *   the player can walk through; vertical doors use the midpoint column.
   * - sealRectsLocal: solid strips (fullGrid → 1) across the full edge when
   *   the direction has no exit, blocking any natural template openings.
   * Rectangles are `{c0, r0, cN, rN}` in room-local tile units.
   */
  private computeDoorMask(
    cell: UnifiedRoomCell | null,
    ldtkLevel: LdtkLevel,
  ): {
    carveRectsLocal: Array<{ c0: number; r0: number; cN: number; rN: number }>;
    sealRectsLocal: Array<{ c0: number; r0: number; cN: number; rN: number }>;
  } {
    const carveRectsLocal: Array<{ c0: number; r0: number; cN: number; rN: number }> = [];
    const sealRectsLocal: Array<{ c0: number; r0: number; cN: number; rN: number }> = [];

    if (!cell) return { carveRectsLocal, sealRectsLocal };

    // Suppress ldtkLevel unused-warning — the loader-computed doorAnchors
    // are retained for future per-template tuning but door row is now fixed
    // across all templates so adjacent rooms align perfectly.
    void ldtkLevel;

    const W = IW_ROOM_W_TILES;
    const H = IW_ROOM_H_TILES;
    const D = IW_DOOR_DEPTH;
    const DH = IW_DOOR_H_HEIGHT;
    const DV = IW_DOOR_V_WIDTH;

    // Fixed horizontal door position — door sits ABOVE the floor row.
    // For DH=3 and IW_DOOR_FLOOR_ROW=13 → door rows 10..12, floor row 13
    // stays solid so the player has something to walk on through the door.
    const hDoorR0 = Math.max(0, IW_DOOR_FLOOR_ROW - DH);
    // Vertical door horizontal span (centered on midpoint)
    const midC = Math.floor(W / 2);
    const vDoorC0 = Math.max(0, midC - Math.floor(DV / 2));

    // LEFT
    if (cell.exits.left) {
      carveRectsLocal.push({ c0: 0, r0: hDoorR0, cN: D, rN: hDoorR0 + DH });
    } else {
      sealRectsLocal.push({ c0: 0, r0: 0, cN: D, rN: H });
    }
    // RIGHT
    if (cell.exits.right) {
      carveRectsLocal.push({ c0: W - D, r0: hDoorR0, cN: W, rN: hDoorR0 + DH });
    } else {
      sealRectsLocal.push({ c0: W - D, r0: 0, cN: W, rN: H });
    }
    // UP
    if (cell.exits.up) {
      carveRectsLocal.push({ c0: vDoorC0, r0: 0, cN: vDoorC0 + DV, rN: D });
    } else {
      // Seal the ceiling edge strip — templates have open U doorways that
      // need to be physically closed when there's no logical up connection.
      sealRectsLocal.push({ c0: 0, r0: 0, cN: W, rN: D });
    }
    // DOWN
    if (cell.exits.down) {
      carveRectsLocal.push({ c0: vDoorC0, r0: H - D, cN: vDoorC0 + DV, rN: H });
    } else {
      // Same rationale as UP: close any floor pit the template left open.
      sealRectsLocal.push({ c0: 0, r0: H - D, cN: W, rN: H });
    }

    return { carveRectsLocal, sealRectsLocal };
  }

  /** Write the door mask into fullGrid at a given room offset. */
  private applyDoorMaskToFullGrid(
    mask: {
      carveRectsLocal: Array<{ c0: number; r0: number; cN: number; rN: number }>;
      sealRectsLocal: Array<{ c0: number; r0: number; cN: number; rN: number }>;
    },
    offR: number,
    offC: number,
  ): void {
    const H = this.fullGrid.length;
    const W = this.fullGrid[0]?.length ?? 0;
    // Seals first (solid), then carves (passable) — carves win on overlap
    for (const rect of mask.sealRectsLocal) {
      for (let r = rect.r0; r < rect.rN; r++) {
        for (let c = rect.c0; c < rect.cN; c++) {
          const gr = offR + r, gc = offC + c;
          if (gr >= 0 && gr < H && gc >= 0 && gc < W) {
            this.fullGrid[gr][gc] = 1;
            this.sealedCells.add(`${gr},${gc}`);
          }
        }
      }
    }
    // Carves: only overwrite SOLID tiles (wall/ice/breakable) to air.
    // Non-solid tiles (platform, water, updraft, spike, air) are preserved
    // so template-placed platforms near door edges don't get destroyed.
    for (const rect of mask.carveRectsLocal) {
      for (let r = rect.r0; r < rect.rN; r++) {
        for (let c = rect.c0; c < rect.cN; c++) {
          const gr = offR + r, gc = offC + c;
          if (gr >= 0 && gr < H && gc >= 0 && gc < W) {
            const v = this.fullGrid[gr][gc];
            if (v === 1 || v === 7 || v === 9) this.fullGrid[gr][gc] = 0;
          }
        }
      }
    }
  }

  /** Remove wall tiles whose pixel position falls inside any carve rect. */
  private filterWallTilesByCarves<T extends { px: [number, number] }>(
    wallTiles: T[],
    carveRectsLocal: Array<{ c0: number; r0: number; cN: number; rN: number }>,
  ): T[] {
    if (carveRectsLocal.length === 0) return wallTiles;
    return wallTiles.filter(t => {
      const tc = Math.floor(t.px[0] / TILE_SIZE);
      const tr = Math.floor(t.px[1] / TILE_SIZE);
      for (const rect of carveRectsLocal) {
        if (tr >= rect.r0 && tr < rect.rN && tc >= rect.c0 && tc < rect.cN) return false;
      }
      return true;
    });
  }

  /**
   * Paint code-generated seal walls with a mortar + 4×4 brick pattern per
   * sealed cell. The luma variation (mortar ~0.21, bricks ~0.37–0.45) feeds
   * the palette filter so each brick maps to a different palette position,
   * producing a natural wall silhouette instead of a flat black hole.
   * When the palette filter is off, the pattern still reads as a stone wall.
   * LDtk template tiles render as-is.
   */
  private drawUniformWalls(roomContainer: Container, offR: number, offC: number): void {
    const gfx = new Graphics();
    const T = TILE_SIZE;
    const BRICK_W = 4;
    const BRICK_H = 4;
    // Palette-friendly mid-luma stone tones. Chosen so filter output spans
    // the wall palette's dark-to-mid range for brick texture readability.
    const brickColors = [0x6a6a80, 0x5c5c74, 0x727288, 0x64647c];
    const mortar = 0x33334a;

    for (let lr = 0; lr < IW_ROOM_H_TILES; lr++) {
      for (let lc = 0; lc < IW_ROOM_W_TILES; lc++) {
        const gr = offR + lr;
        const gc = offC + lc;
        if (!this.sealedCells.has(`${gr},${gc}`)) continue;

        const x = lc * T;
        const y = lr * T;
        // Mortar base
        gfx.rect(x, y, T, T).fill(mortar);
        // 4×4 brick grid with row-offset stagger for masonry look
        for (let by = 0; by < 4; by++) {
          const offset = (by + lr) % 2 === 0 ? 0 : 2;
          for (let bx = 0; bx < 4; bx++) {
            const bxPos = x + ((bx * BRICK_W + offset) % T);
            const byPos = y + by * BRICK_H;
            // Deterministic color pick per brick so the pattern is stable
            // across rebuilds (breakable tile destruction re-invokes this).
            const colorIdx = (lc * 7 + lr * 13 + bx * 3 + by) % brickColors.length;
            gfx.rect(bxPos + 1, byPos + 1, BRICK_W - 1, BRICK_H - 1)
               .fill(brickColors[colorIdx]);
          }
        }
      }
    }
    roomContainer.addChild(gfx);
  }

  /**
   * Draw stone-brick blocks over sealed edge strips so players read them as
   * solid walls, not holes. Each tile gets a mortar base + 4×4 brick grid
   * with 4 stone color variations (matches addSealSprites palette).
   */
  private drawSealOverlays(
    roomContainer: Container,
    sealRectsLocal: Array<{ c0: number; r0: number; cN: number; rN: number }>,
  ): void {
    if (sealRectsLocal.length === 0) return;
    const gfx = new Graphics();
    const T = TILE_SIZE;
    const BRICK_W = 4;
    const BRICK_H = 4;
    const colors = [0x6a6a80, 0x5c5c74, 0x727288, 0x64647c];
    const mortar = 0x33334a;

    for (const rect of sealRectsLocal) {
      for (let r = rect.r0; r < rect.rN; r++) {
        for (let c = rect.c0; c < rect.cN; c++) {
          const x = c * T;
          const y = r * T;
          // Mortar base
          gfx.rect(x, y, T, T).fill(mortar);
          // 4×4 brick grid with row-offset stagger
          for (let by = 0; by < 4; by++) {
            const offset = (by + r) % 2 === 0 ? 0 : 2;
            for (let bx = 0; bx < 4; bx++) {
              const brickX = x + ((bx * BRICK_W + offset * (BRICK_W / 2)) % T);
              const brickY = y + by * BRICK_H;
              const color = colors[(bx + by + c + r) % colors.length];
              gfx.rect(brickX, brickY, BRICK_W - 1, BRICK_H - 1).fill(color);
            }
          }
        }
      }
    }
    roomContainer.addChild(gfx);
  }

  /**
   * Pre-spawn enemies in the 4 neighboring rooms (N/S/E/W) of the given local
   * room coordinates so the player never sees a "pop-in" when crossing a doorway.
   * Skips already-spawned, out-of-bounds, and out-of-stratum rooms.
   */
  private preSpawnNeighborRooms(localCol: number, localRow: number): void {
    const stratumOffset = this.unifiedGrid.strataOffsets[this.currentStratumIndex]?.rowOffset ?? 0;
    const stratumHeight = this.strataConfig.strata[this.currentStratumIndex]?.gridHeight ?? 4;
    const directions = [
      { dc: -1, dr: 0, name: 'W' },
      { dc: 1, dr: 0, name: 'E' },
      { dc: 0, dr: -1, name: 'N' },
      { dc: 0, dr: 1, name: 'S' },
    ];
    console.log(`[ItemWorld] preSpawnNeighborRooms from (${localCol},${localRow}) stratumOffset=${stratumOffset} stratumHeight=${stratumHeight}`);
    let spawnedCount = 0;
    let skippedBounds = 0;
    let skippedSpawned = 0;
    let skippedNullCell = 0;
    for (const { dc, dr, name } of directions) {
      const ncLocal = localCol + dc;
      const nrLocal = localRow + dr;
      if (ncLocal < 0 || ncLocal > 3 || nrLocal < 0 || nrLocal >= stratumHeight) {
        console.log(`  [${name}] skip: out of bounds (${ncLocal},${nrLocal})`);
        skippedBounds++;
        continue;
      }
      const nrAbs = stratumOffset + nrLocal;
      const nKey = `${ncLocal},${nrAbs}`;
      if (this.spawnedRooms.has(nKey)) {
        console.log(`  [${name}] skip: already spawned ${nKey}`);
        skippedSpawned++;
        continue;
      }
      const nCell = this.unifiedGrid.cells[nrAbs]?.[ncLocal];
      if (!nCell) {
        console.log(`  [${name}] skip: null cell ${nKey}`);
        skippedNullCell++;
        continue;
      }
      this.spawnedRooms.add(nKey);
      const beforeCount = this.enemies.length;
      this.spawnEnemiesInRoom(ncLocal, nrAbs);
      const spawned = this.enemies.length - beforeCount;
      console.log(`  [${name}] spawned ${spawned} enemies in ${nKey} (roomType=${this.roomTypeMap.get(`${ncLocal}:${nrAbs}`) ?? '?'}, cleared=${nCell.cleared})`);
      spawnedCount++;
    }
    console.log(`[ItemWorld] preSpawn result: ${spawnedCount} rooms spawned, ${skippedBounds} bounds, ${skippedSpawned} already, ${skippedNullCell} null`);
    this.persistRoomState();
  }

  /**
   * Find the center of the longest continuous horizontal flat floor inside a
   * single 32×32 room, requiring at least `minLen` tiles in a row. The floor
   * is a row where each tile has `fullGrid[r][c] === 0` (air) AND
   * `fullGrid[r+1][c] >= 1` (solid tile directly below).
   *
   * Returns the world-pixel center (x = center tile × TILE + TILE/2, y = top
   * of the row × TILE) of the best run, or null if no run of minLen exists.
   * Prefers the row closer to the bottom of the room (where boss arenas feel
   * natural) and, within ties, the longest run.
   */
  private findFlatFloorCenter(
    roomTopCol: number,
    roomTopRow: number,
    minLen: number,
  ): { x: number; y: number } | null {
    let best: { row: number; startCol: number; length: number } | null = null;

    // Scan each row (from bottom to top so ties prefer lower rows)
    for (let localRow = IW_ROOM_H_TILES - 1; localRow >= 0; localRow--) {
      const tr = roomTopRow + localRow;
      if (tr < 0 || tr + 1 >= this.fullGrid.length) continue;

      let runStart = -1;
      let runLen = 0;
      for (let localCol = 0; localCol < IW_ROOM_W_TILES; localCol++) {
        const tc = roomTopCol + localCol;
        const here = this.fullGrid[tr]?.[tc] ?? 1;
        const below = this.fullGrid[tr + 1]?.[tc] ?? 1;
        const isFloor = here === 0 && below >= 1;

        if (isFloor) {
          if (runStart < 0) runStart = tc;
          runLen++;
          // Check and update best on extension
          if (runLen >= minLen) {
            if (!best || runLen > best.length) {
              best = { row: tr, startCol: runStart, length: runLen };
            }
          }
        } else {
          runStart = -1;
          runLen = 0;
        }
      }
    }

    if (!best) return null;
    const centerTile = best.startCol + Math.floor(best.length / 2);
    return {
      x: centerTile * TILE_SIZE + TILE_SIZE / 2,
      y: best.row * TILE_SIZE + TILE_SIZE, // top of the air row + one tile = floor line
    };
  }

  /** Create an enemy instance by type name and level. */
  private createEnemyFromType(type: string, level: number): Enemy<string> {
    const enemy = createEnemy(type, level);
    this.applyCycleScaling(enemy);
    return enemy;
  }

  /**
   * Replaced by direct level bump (cycle added to spawn level in spawnEnemiesInRoom).
   * Kept as a no-op so existing call sites in createEnemyFromType remain intact.
   */
  private applyCycleScaling(_enemy: Enemy<string>): void {
    // No-op — cycle scaling now happens via level bump at spawn time.
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
      {
        const bgAreaId = `iw_${this.item.rarity}_bg`;
        const wallAreaId = `iw_${this.item.rarity}_wall`;
        applyAreaTilesetToLdtkTiles(bgAreaId, ldtkLevel.backgroundTiles);
        applyAreaTilesetToLdtkTiles(wallAreaId, ldtkLevel.wallTiles);
        applyAreaTilesetToLdtkTiles(wallAreaId, ldtkLevel.shadowTiles);
      }
      this.ldtkRenderer.renderLevel(ldtkLevel.backgroundTiles, ldtkLevel.wallTiles, ldtkLevel.shadowTiles, this.atlases, undefined, ldtkLevel.collisionGrid);
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

    // Boss room — check LDtk roomType, fallback to stratum end room
    const ldtkRoomType = this.currentLdtkLevel?.roomType ?? '';
    const isEndRoom = ldtkRoomType === 'Boss' || this.isStratumEndRoom(this.currentCol, this.currentRow);

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

    // Memory Room placement overrides procedural selection — deterministic.
    if (cell) {
      const placed = this.memoryRoomPlacements.get(`${cell.col}:${cell.absoluteRow}`);
      if (placed) return placed;
    }

    // Exclude memory room templates from the random pool so they only appear
    // where explicitly placed above. LDtk editor may capitalize the prefix
    // ("Memory_*") — match case-insensitively.
    const pool = this.ldtkTemplates.filter(t => !/^memory_/i.test(t.identifier));

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
        // Off-path rooms: equal 25% for Treasure / Rest / Puzzle / Combat
        const roll = rng.next();
        if (roll < 0.25) desiredType = 'Treasure';
        else if (roll < 0.50) desiredType = 'Rest';
        else if (roll < 0.75) desiredType = 'Puzzle';
        else desiredType = 'Combat';
      } else {
        desiredType = 'Combat';
      }
    }

    // Filter templates by roomType
    const matching = pool.filter(t => t.roomType === desiredType);
    if (matching.length > 0) {
      return matching[rng.nextInt(0, matching.length - 1)];
    }

    // Fallback: any non-memory template
    if (pool.length === 0) return null;
    return pool[rng.nextInt(0, pool.length - 1)];
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
      const enemy = createEnemy(isGhost ? 'Ghost' : 'Skeleton');
      // Multiply CSV-based stats (from constructor applyStats) by stratum + dist
      enemy.hp = enemy.maxHp = Math.max(1, Math.floor(enemy.hp * def.hpMul * distScale));
      enemy.atk = Math.max(1, Math.floor(enemy.atk * def.atkMul * distScale));

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
    const boss = createEnemy('Guardian') as Guardian;
    boss.hp = boss.maxHp = Math.max(1, Math.floor(boss.hp * def.bossHpMul));
    boss.atk = Math.max(1, Math.floor(boss.atk * def.bossAtkMul));
    // First Normal entry special: charge only, no enrage, ATK halved
    if (this.isFirstNormalEntry) {
      boss.noEnrage = true;
      boss.chargeOnly = true;
      boss.atk = Math.max(1, Math.floor(boss.atk * 0.5));
    }
    boss.x = (this.roomW / 2) * TILE_SIZE;
    boss.y = floorY - boss.height;
    boss.roomData = this.roomData;
    boss.target = this.player;
    (boss as any)._isBoss = true;
    this.enemies.push(boss);
    this.entityLayer.addChild(boss.container);
    // Boss HP bar shown when boss detects player (in update loop)
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
    for (const hp of this.healingPickups) hp.destroy();
    this.healingPickups = [];
    for (const gp of this.goldPickups) gp.destroy();
    this.goldPickups = [];
    // Reset pre-spawn cascade tracker so new stratum's neighbors get pre-spawned
    this.lastPreSpawnRoomKey = null;
  }

  /** Apply updraft force when player stands on IntGrid value 4, + render particles */
  private applyUpdrafts(dt: number): void {
    this.updraftSystem.update(dt, this.player, this.fullGrid, this.game.camera);
  }

  // ---------------------------------------------------------------------------
  // LDtk-placed static entities (Option A: hazards + puzzles + camera zones)
  // ---------------------------------------------------------------------------

  /** Spawn hazard/puzzle entities from a room template, offset to fullGrid space. */
  private spawnStaticEntitiesForRoom(level: LdtkLevel, offX: number, offY: number): void {
    // Per-room iid prefix — when the same template is reused in multiple rooms,
    // we must keep entity iids unique so Switch→LockedDoor matching is room-scoped.
    const roomPrefix = `r${offX}_${offY}:`;

    for (const ent of level.entities) {
      const ax = ent.px[0] + offX;
      const ay = ent.px[1] + offY;

      switch (ent.type) {
        case 'Spike': {
          const spike = new Spike(ax, ay, ent.width, ent.height);
          this.spikes.push(spike);
          this.entityLayer.addChild(spike.container);
          break;
        }
        case 'CrackedFloor': {
          const cf = new CrackedFloor(ax, ay, ent.width, ent.height);
          cf.injectCollision(this.fullGrid);
          this.crackedFloors.push(cf);
          this.entityLayer.addChild(cf.container);
          break;
        }
        case 'CollapsingPlatform': {
          const respawns = (ent.fields['Respawn'] ?? ent.fields['respawn'] ?? true) as boolean;
          const respawnTime = (ent.fields['RespawnTime'] ?? ent.fields['respawnTime'] ?? 3.0) as number;
          const cp = new CollapsingPlatform(ax, ay, ent.width, ent.height, respawns, respawnTime);
          cp.injectCollision(this.fullGrid);
          this.collapsingPlatforms.push(cp);
          this.entityLayer.addChild(cp.container);
          break;
        }
        case 'GrowingWall': {
          const wall = new GrowingWall(ax, ay, ent.width, ent.height);
          wall.injectCollision(this.fullGrid);
          this.growingWalls.push(wall);
          this.entityLayer.addChild(wall.container);
          break;
        }
        case 'Switch': {
          const ref = (ent.fields['TargetDoor'] ?? ent.fields['targetDoor']) as { entityIid: string } | null;
          if (!ref?.entityIid) break;
          // Remap target iid to room-scoped iid (matches room's LockedDoor)
          const targetIid = roomPrefix + ref.entityIid;
          const sw = new Switch(ax, ay, ent.width, ent.height, targetIid);
          sw.injectCollision(this.fullGrid);
          this.switches.push(sw);
          this.entityLayer.addChild(sw.container);
          break;
        }
        case 'LockedDoor': {
          const rawCondition = (ent.fields['UnlockCondition'] as string) || (ent.fields['unlockCondition'] as string) || '';
          const unlockCondition = (rawCondition.toLowerCase() as UnlockCondition) || 'event';
          const unlockEvent = (ent.fields['unlockEvent'] as string) || '';
          const statType = ((ent.fields['StatType'] as string) || (ent.fields['statType'] as string) || 'atk').toLowerCase();
          const statThreshold = (ent.fields['StatThreshold'] as number) ?? (ent.fields['statThreshold'] as number) ?? 0;
          // Room-scoped iid so multi-room template reuse doesn't cause cross-room unlocks
          const scopedIid = roomPrefix + ent.iid;
          const door = new LockedDoor(
            ax, ay, ent.width, ent.height,
            scopedIid,
            unlockCondition,
            unlockCondition === 'event' ? unlockEvent : scopedIid,
            statType,
            statThreshold,
          );
          door.injectCollision(this.fullGrid);
          this.lockedDoors.push(door);
          this.entityLayer.addChild(door.container);
          break;
        }
        case 'Memory': {
          const text = (ent.fields['text'] as string) ?? '';
          if (!text) break;
          const speaker = (ent.fields['speaker'] as string) || undefined;
          const portrait = (ent.fields['portrait'] as string) || undefined;
          // Anchor the visual at the entity pivot (LDtk Memory pivot is bottom-left)
          const anchorX = offX + ent.px[0] + ent.width / 2;
          const anchorY = offY + ent.px[1] - ent.height / 2;

          // Build the Memory Shard visual — legendary-tier but distinct:
          //   - Larger than item drops (shard ≈ 16×16 vs item 8×8)
          //   - Rotated diamond shape (45°) — clear visual contrast vs sword's square
          //   - Double outline (bright orange → pale gold)
          //   - Wide radial glow
          //   - Orange particles that drift UP with horizontal sway
          const shardContainer = new Container();
          shardContainer.x = anchorX;
          shardContainer.y = anchorY;

          const glowGfx = new Graphics();
          glowGfx.circle(0, 0, 24).fill({ color: 0xff8000, alpha: 0.22 });
          glowGfx.circle(0, 0, 14).fill({ color: 0xffaa33, alpha: 0.35 });
          shardContainer.addChild(glowGfx);

          const shardGfx = new Graphics();
          // Rotated diamond = square rotated 45°. Draw as polygon.
          //   Points: top(0,-11) right(11,0) bottom(0,11) left(-11,0)
          shardGfx.poly([0, -11, 11, 0, 0, 11, -11, 0]).fill({ color: 0xff8000 });
          shardGfx.poly([0, -11, 11, 0, 0, 11, -11, 0]).stroke({ color: 0xffcc66, width: 1 });
          // Inner bright diamond
          shardGfx.poly([0, -6, 6, 0, 0, 6, -6, 0]).fill({ color: 0xffe6b3, alpha: 0.85 });
          // Tiny white center pip
          shardGfx.poly([0, -2, 2, 0, 0, 2, -2, 0]).fill({ color: 0xffffff });
          shardContainer.addChild(shardGfx);

          this.entityLayer.addChild(shardContainer);

          this.memoryTriggers.push({
            x: anchorX - 20,
            y: anchorY - 20,
            w: 40,
            h: 40,
            text,
            speaker,
            portrait,
            active: false,
            anchorX,
            anchorY,
            container: shardContainer,
            shardGfx,
            glowGfx,
            particles: [],
            spawnTimer: Math.random() * 300,
            pulseTimer: Math.random() * 2000,
            bobTimer: Math.random() * 3000,
          });
          break;
        }
        case 'Camera': {
          this.cameraZones.push({
            x: ax,
            y: ay - ent.height,
            w: ent.width,
            h: ent.height,
            zoom: (ent.fields['zoom'] as number) ?? 1.0,
            deadZoneX: (ent.fields['deadZoneX'] as number) ?? 32,
            deadZoneY: (ent.fields['deadZoneY'] as number) ?? 24,
            lookAheadDistance: (ent.fields['lookAheadDistance'] as number) ?? 0,
            followLerp: (ent.fields['followLerp'] as number) ?? 0.08,
            zoomLerp: (ent.fields['zoomLerp'] as number) ?? 0.05,
            entireLevel: (ent.fields['entireLevel'] as boolean) ?? false,
          });
          break;
        }
        // Other entity types intentionally not handled in ItemWorldScene
      }
    }
  }

  /** Destroy and clear all LDtk-placed static entities. Called on rebuild + exit. */
  private clearStaticEntities(): void {
    for (const e of this.spikes) e.destroy();
    this.spikes = [];
    for (const e of this.crackedFloors) e.destroy();
    this.crackedFloors = [];
    for (const e of this.collapsingPlatforms) e.destroy();
    this.collapsingPlatforms = [];
    for (const e of this.growingWalls) e.destroy();
    this.growingWalls = [];
    for (const e of this.switches) e.destroy();
    this.switches = [];
    for (const e of this.lockedDoors) e.destroy();
    this.lockedDoors = [];
    this.cameraZones = [];
    this.activeCameraZone = null;
    // Destroy memory shard visuals + particles
    for (const t of this.memoryTriggers) {
      for (const p of t.particles) {
        if (p.gfx.parent) p.gfx.parent.removeChild(p.gfx);
      }
      t.particles = [];
      if (t.container.parent) t.container.parent.removeChild(t.container);
    }
    this.memoryTriggers = [];
  }

  /** Per-frame: IntGrid spike check + collapsing platforms + entity update logic. */
  private updateStaticEntities(dt: number): void {
    // IntGrid spike (value 5) — contact damage + safe-ground respawn.
    // Replaces the old Entity-based Spike AABB check with fullGrid tile scan.
    if (!this.player.invincible && this.player.hp > 0) {
      if (isInSpike(this.player.x, this.player.y, this.player.width, this.player.height, this.fullGrid)) {
        const dmg = Math.max(1, Math.floor(this.player.maxHp * 0.2));
        this.player.lastDamageSource = 'spike';
        this.player.hp -= dmg;
        this.hud.flashDamage();
        this.player.invincible = true;
        this.player.invincibleTimer = 1000;
        this.game.hitstopFrames = 16;
        this.game.camera.shake(5);
        this.screenFlash.flashDamage(true);
        this.player.triggerFlash();
        this.dmgNumbers.spawn(
          this.player.x + this.player.width / 2,
          this.player.y - 8, dmg, true,
        );
        this.player.x = this.player.lastSafeX;
        this.player.y = this.player.lastSafeY;
        this.player.vx = 0;
        this.player.vy = 0;
        this.player.savePrevPosition();
        if (this.player.hp <= 0) {
          this.player.hp = 0;
          this.player.onDeath();
        }
      }
    }

    // Collapsing platforms — shake when stood on, may collapse + respawn
    for (let i = this.collapsingPlatforms.length - 1; i >= 0; i--) {
      const cp = this.collapsingPlatforms[i];
      cp.update(dt);
      if (cp.isPlayerOnTop(this.player.x, this.player.y, this.player.width, this.player.height)) {
        cp.startShake();
      }
    }

    // Growing walls — pulse, grow/shrink cycle, slime/dust spawn
    for (const wall of this.growingWalls) {
      wall.update(dt);
      // Promote any pending slimes spawned by the wall into the enemy list
      if (wall.pendingSlimes.length > 0) {
        for (const slime of wall.pendingSlimes) {
          slime.roomData = this.fullGrid;
          slime.target = this.player;
          this.enemies.push(slime);
          this.entityLayer.addChild(slime.container);
        }
        wall.pendingSlimes.length = 0;
      }
    }

    // Locked doors — reject animation timer
    for (const door of this.lockedDoors) {
      door.update(dt);
    }

    // Player attack vs CrackedFloors / Switches / Breakables
    if (this.player.isAttackActive()) {
      // Reset breakable swing tracking on new combo step
      if (this.player.comboIndex !== this.breakableLastCombo) {
        this.breakableHitThisSwing.clear();
        this.breakableLastCombo = this.player.comboIndex;
      }
      const step = this.player.getAttackStep(this.player.comboIndex);
      if (step) {
        const hitbox = getAttackHitbox(
          this.player.x, this.player.y, this.player.width, this.player.height,
          this.player.facingRight ?? true, step,
        );
        // Cracked floors
        for (let i = this.crackedFloors.length - 1; i >= 0; i--) {
          const cf = this.crackedFloors[i];
          if (cf.destroyed) continue;
          if (!aabbOverlap(hitbox, cf.getAABB())) continue;
          cf.shatter(this.fullGrid);
          this.game.hitstopFrames += 4;
          this.screenFlash.flash(0xffffff, 0.4, 150);
          this.game.camera.shake(6);
          cf.destroy();
          this.crackedFloors.splice(i, 1);
        }
        // Switches
        for (const sw of this.switches) {
          if (sw.activated) continue;
          if (!aabbOverlap(hitbox, sw.getHitAABB())) continue;
          if (sw.activate(this.fullGrid)) {
            this.game.camera.shake(3);
            this.screenFlash.flashHit(false);
            this.unlockDoorByIidLocal(sw.targetDoorIid);
          }
        }
        // Breakable tiles (IntGrid 9) — 3 hits to destroy → air(0)
        this.checkAttackOnBreakables(hitbox);
      }
    } else {
      // Attack ended — reset breakable swing tracking
      if (this.breakableHitThisSwing.size > 0) {
        this.breakableHitThisSwing.clear();
        this.breakableLastCombo = -1;
      }
    }

    // Camera zone tracking
    this.updateCameraZones();
  }

  /** Scan breakable tiles overlapping the attack hitbox. 3 SWINGS → air.
   *  Each swing counts once per tile; subsequent frames of the same swing
   *  are ignored so the player must land 3 distinct combo hits. */
  private checkAttackOnBreakables(hitbox: { x: number; y: number; width: number; height: number }): void {
    const T = TILE_SIZE;
    const HITS_TO_BREAK = 3;
    const l = Math.floor(hitbox.x / T);
    const r = Math.floor((hitbox.x + hitbox.width - 1) / T);
    const t = Math.floor(hitbox.y / T);
    const b = Math.floor((hitbox.y + hitbox.height - 1) / T);
    let broken = false;
    for (let row = t; row <= b; row++) {
      for (let col = l; col <= r; col++) {
        const v = this.fullGrid[row]?.[col];
        if (v !== 9) continue;
        const key = `${col},${row}`;
        if (this.breakableHitThisSwing.has(key)) continue; // already counted this swing
        this.breakableHitThisSwing.add(key);
        const hits = (this.breakableHits.get(key) ?? 0) + 1;
        if (hits >= HITS_TO_BREAK) {
          this.fullGrid[row][col] = 0;
          this.breakableHits.delete(key);
          broken = true;
        } else {
          this.breakableHits.set(key, hits);
        }
      }
    }
    if (broken) {
      this.game.hitstopFrames += 4;
      this.game.camera.shake(4);
      this.screenFlash.flash(0xffffff, 0.3, 100);
      this.rebuildRoomVisuals();
    }
  }

  /** Re-render all room containers with updated fullGrid state. */
  private rebuildRoomVisuals(): void {
    if (!this.fullMapContainer || !this.atlas) return;
    if (!this.bgAggregate || !this.wallAggregate || !this.shadowAggregate || !this.sealAggregate) return;
    // Clear aggregate children (preserves the aggregate containers and their
    // palette filters, so the continuous gradient is maintained).
    this.bgAggregate.removeChildren();
    this.wallAggregate.removeChildren();
    this.specialAggregate?.removeChildren();
    this.shadowAggregate.removeChildren();
    this.sealAggregate.removeChildren();

    const grid = this.unifiedGrid;
    const stratumRowStart = grid.strataOffsets[this.currentStratumIndex]?.rowOffset ?? 0;

    for (let localRow = 0; localRow < IW_GRID_H; localRow++) {
      const absRow = stratumRowStart + localRow;
      for (let col = 0; col < IW_GRID_W; col++) {
        const cell = grid.cells[absRow]?.[col];
        const rng = new PRNG(this.item.uid * 10000 + col * 100 + absRow);
        const ldtkLevel = this.pickLdtkTemplate(cell ?? null as any, rng);
        if (!ldtkLevel || !this.ldtkRenderer || !this.atlas) continue;

        const offR = localRow * IW_ROOM_H_TILES;
        const offC = col * IW_ROOM_W_TILES;
        const roomX = col * IW_ROOM_W_PX;
        const roomY = localRow * IW_ROOM_H_PX;

        const inBounds = (t: { px: [number, number] }) =>
          t.px[0] >= 0 && t.px[0] < IW_ROOM_W_PX &&
          t.px[1] >= 0 && t.px[1] < IW_ROOM_H_PX;
        const bgTiles = ldtkLevel.backgroundTiles.filter(inBounds);
        const shadowTiles = ldtkLevel.shadowTiles.filter(inBounds);
        const renderer = new LdtkRenderer();
        {
          const bgAreaId = `iw_${this.item.rarity}_bg`;
          const wallAreaId = `iw_${this.item.rarity}_wall`;
          applyAreaTilesetToLdtkTiles(bgAreaId, bgTiles);
          applyAreaTilesetToLdtkTiles(wallAreaId, shadowTiles);
        }
        renderer.renderLevel(bgTiles, [], shadowTiles, this.atlases, undefined, ldtkLevel.collisionGrid);
        renderer.bgLayer.position.set(roomX, roomY);
        renderer.wallLayer.position.set(roomX, roomY);
        renderer.specialLayer.position.set(roomX, roomY);
        renderer.shadowLayer.position.set(roomX, roomY);
        this.bgAggregate.addChild(renderer.bgLayer);
        this.wallAggregate.addChild(renderer.wallLayer);
        this.specialAggregate?.addChild(renderer.specialLayer);
        this.shadowAggregate.addChild(renderer.shadowLayer);

        const sealContainer = new Container();
        sealContainer.position.set(roomX, roomY);
        this.drawUniformWalls(sealContainer, offR, offC);
        this.sealAggregate.addChild(sealContainer);
      }
    }
  }

  /** Unlock a door in this scene by its LDtk iid (mirrors LdtkWorldScene logic). */
  private unlockDoorByIidLocal(iid: string): void {
    for (let i = this.lockedDoors.length - 1; i >= 0; i--) {
      const door = this.lockedDoors[i];
      if (door.iid === iid) {
        door.unlock(this.fullGrid);
        this.game.camera.shake(6);
        this.screenFlash.flashHit(true);
        this.toast.show('Gate Opened!', 0x44ffaa);
        door.destroy();
        this.lockedDoors.splice(i, 1);
        return;
      }
    }
  }

  /** Apply Camera entity zoom/dead-zone settings when player enters a zone. */
  private updateCameraZones(): void {
    if (this.cameraZones.length === 0 && !this.activeCameraZone) return;
    const pcx = this.player.x + this.player.width / 2;
    const pcy = this.player.y + this.player.height / 2;
    const cam = this.game.camera;

    let insideZone: typeof this.cameraZones[number] | null = null;
    for (const zone of this.cameraZones) {
      if (zone.entireLevel ||
          (pcx >= zone.x && pcx <= zone.x + zone.w &&
           pcy >= zone.y && pcy <= zone.y + zone.h)) {
        insideZone = zone;
        break;
      }
    }

    if (insideZone && insideZone !== this.activeCameraZone) {
      this.activeCameraZone = insideZone;
      cam.deadZoneX = insideZone.deadZoneX;
      cam.deadZoneY = insideZone.deadZoneY;
      cam.lookAheadDistance = insideZone.lookAheadDistance;
      cam.followLerp = insideZone.followLerp;
      cam.zoomTo(insideZone.zoom, insideZone.zoomLerp);
    } else if (!insideZone && this.activeCameraZone) {
      this.activeCameraZone = null;
      cam.deadZoneX = 32;
      cam.deadZoneY = 24;
      cam.lookAheadDistance = 0;
      cam.followLerp = 0.08;
      cam.zoomTo(1.0, 0.05);
    }
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
    // Onboarding disabled
    this.onboardingDone = true;
  }

  private initialized = false;

  update(dt: number): void {
    if (!this.initialized) return;

    // Toast always updates
    this.toast.update(dt);

    // Return hint shrink tween (first-entry only).
    this.returnHint?.update(dt);

    // Onboarding blocks gameplay
    if (!this.onboardingDone) {
      if (this.game.input.isJustPressed(GameAction.ATTACK)) {
        this.advanceOnboarding();
      }
      return;
    }

    // Stratum picker blocks gameplay
    if (this.stratumPickerVisible) {
      this.handleStratumPickerInput();
      return;
    }

    // LoreDisplay (Memory Room lore) — when active, pause gameplay
    if (this.loreDisplay?.isActive) {
      this.loreDisplay.update(dt);
      // Sync prev position so render interpolation doesn't cause jitter
      this.player.savePrevPosition();
      return;
    }

    // ESC to toggle escape confirm. bossChoice 패널이 열려 있을 땐 여기서
    // 가로채지 않고 아래 bossChoice 핸들러가 ESC 를 Exit Safely 로 처리하도록
    // 양보한다 (Pattern A — 해당 모달의 취소 키).
    if (!this.bossChoiceVisible && this.game.input.isJustPressed(GameAction.MENU)) {
      if (this.escapeConfirmVisible) {
        this.hideEscapeConfirm();
      } else {
        this.showEscapeConfirm();
      }
      return;
    }

    if (this.escapeConfirmVisible) {
      if (this.game.input.isJustPressed(GameAction.ATTACK)) {
        const fromAltar = this.escapeConfirmFromAltar;
        this.hideEscapeConfirm();
        if (fromAltar) {
          this.useEscapeAltar();
        } else {
          this.startExitFade();
        }
        return;
      }
      if (this.game.input.isJustPressed(GameAction.DASH) ||
          this.game.input.isJustPressed(GameAction.JUMP)) {
        this.hideEscapeConfirm();
      }
      return;
    }

    // 모달/전이 상태에서는 매 프레임 world-space 프롬프트를 숨겨
    // 결과 패널 뒤에 "\u2191 Descend" 등이 잔존하는 것을 방지.
    if (this.shouldSuppressWorldPrompts()) {
      this.hideWorldPrompts();
    }

    // A17 (playtest 2026-04-17): boss-kill choice panel. After a non-final
    // stratum boss, the portal would auto-advance; now the player explicitly
    // chooses CONTINUE (deeper) or EXIT (bank progress and leave).
    // Pattern A(Modal, UI_Interaction_Patterns.md): C(ATTACK)=확인(Continue
    // Deeper), ESC(MENU)=취소(Exit Safely). Z/X 는 UI 에서 사용 금지 — 점프/
    // 대시 액션과 근육 기억 충돌을 막기 위함.
    if (this.bossChoiceVisible) {
      if (this.game.input.isJustPressed(GameAction.ATTACK)) {
        this.hideBossChoice();
        this._continueToNextStratum();
        return;
      }
      if (this.game.input.isJustPressed(GameAction.MENU)) {
        this.hideBossChoice();
        this._exitAfterBoss();
        return;
      }
      return;
    }

    if (this.transitionState !== 'none') {
      this.updateTransition(dt);
      return;
    }

    // World Map / Inventory are unavailable inside Item World — surface a
    // short English toast so the player understands the key was recognised
    // but intentionally disabled here.
    if (this.game.input.isJustPressed(GameAction.MAP)) {
      this.game.input.consumeJustPressed(GameAction.MAP);
      this.toast.show('Currently unavailable', 0xaaaaaa);
    }
    if (this.game.input.isJustPressed(GameAction.INVENTORY)) {
      this.game.input.consumeJustPressed(GameAction.INVENTORY);
      this.toast.show('Currently unavailable', 0xaaaaaa);
    }

    this.player.update(dt);

    // Updraft wind zones (IntGrid value 4 in fullGrid)
    this.applyUpdrafts(dt);

    // LDtk-placed static entities (spikes, cracked floors, switches, etc.)
    this.updateStaticEntities(dt);

    // Memory Room triggers — animate shards + show dialogue on entry
    this.checkMemoryTriggers(dt);

    if (this.player.isDead) {
      // First Normal entry special: respawn in last safe room, full HP, no penalty
      if (this.isFirstNormalEntry) {
        this.player.respawn();
        this.player.hp = this.player.maxHp;
        // Teleport to last safe (non-boss) room — convert absolute row to local
        const stratumOffset = this.unifiedGrid.strataOffsets[this.currentStratumIndex]?.rowOffset ?? 0;
        const localRow = this.lastSafeRoomRow - stratumOffset;
        const respawnX = this.lastSafeRoomCol * IW_ROOM_W_PX + IW_ROOM_W_PX / 2;
        const respawnY = localRow * IW_ROOM_H_PX + IW_ROOM_H_PX / 2;
        this.player.x = respawnX - this.player.width / 2;
        this.player.y = respawnY - this.player.height;
        this.player.vx = 0;
        this.player.vy = 0;
        this.player.savePrevPosition();
        this.hud.hideBossHP();
        // Refresh EXP bar to current item state (prevents visual reset to 0)
        this.hud.updateItemExp(this.item.level, this.item.exp, EXP_PER_LEVEL, false);
        this.toast.show('Respawn — Try again!', 0x88ccff);
        return;
      }

      // Analytics: death in item world
      const cell = this.getCurrentCell();
      trackPlayerDeath({
        area: 'itemworld',
        room_col: cell?.col ?? 0,
        room_row: cell?.row ?? 0,
        enemy_type: this.player.lastDamageSource,
      });
      this.exitReason = 'death';
      trackItemWorldExit('death', this.currentStratumIndex);
      this.exitTracked = true;

      // Clear all UI overlays on death
      this.hud.hideBossHP();
      this.game.uiContainer.removeChildren();
      this.game.uiContainer.addChild(this.hud.container);

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
        if (hit.critical) this.criticalHighlight.spawn(hit.hitX, hit.hitY);
        if (hit.heavy) {
          this.screenFlash.flashHit(true);
          this.comboFinisherBurst.spawn(hit.hitX, hit.hitY, hit.dirX);
        }
        if (hit.damage >= 100 && SFX.fireMilestone100Once()) {
          this.screenFlash.flashHit(true);
          this.dmgNumbers.spawnSpecial(hit.hitX, hit.hitY - 24, '100 DMG!', 0xffcc44);
        }
      }
    }

    // Check for kills AFTER combat (checkHits may have set alive=false)
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (!enemy.alive && !(enemy as any)._expGranted) {
        (enemy as any)._expGranted = true;

        // Analytics: enemy kill distribution (excludes Innocents — capture, not kill)
        if (!(enemy instanceof InnocentNPC)) {
          trackEnemyKill({
            area: 'itemworld',
            enemy_type: enemy.constructor.name.toLowerCase(),
            is_boss: !!(enemy as any)._isBoss,
            is_elite: enemy instanceof GoldenMonster,
          });
        }

        // A11: enhanced death burst. Innocents are "captured" (A15 handles
        // them separately) so skip the burst for them to avoid double-fx.
        if (!(enemy instanceof InnocentNPC)) {
          const heavy = !!(enemy as any)._isBoss;
          this.deathParticles.spawn(
            enemy.x + enemy.width / 2,
            enemy.y + enemy.height / 2,
            heavy,
          );
        }

        // Decrement room enemy count; if it reaches zero, mark room cleared
        const rk = (enemy as any)._roomKey as string | undefined;
        if (rk) {
          const remaining = (this.roomEnemyCount.get(rk) ?? 1) - 1;
          if (remaining <= 0) {
            this.roomEnemyCount.delete(rk);
            const [colStr, rowStr] = rk.split(',');
            const c = parseInt(colStr, 10);
            const r = parseInt(rowStr, 10);
            const clearedCell = this.unifiedGrid.cells[r]?.[c];
            if (clearedCell && !clearedCell.cleared) {
              clearedCell.cleared = true;
              this.roomsCleared++;
              this.persistRoomState();
            }
          } else {
            this.roomEnemyCount.set(rk, remaining);
          }
        }

        if (!(enemy instanceof InnocentNPC)) {
          // CSV-driven kill EXP (Sheets/Content_Stats_Enemy.csv -> Exp column).
          // Falls back to BASE_EXP_PER_KILL if the enemy lacks an exp value.
          const baseExp = enemy.exp > 0 ? enemy.exp : BASE_EXP_PER_KILL;
          const killExp = Math.floor(baseExp * this.currentStratumDef.expMultiplier);
          const leveled = addItemExp(this.item, killExp);
          this.earnedExp += killExp;
          this.dmgNumbers.spawnEXP(
            enemy.x + enemy.width / 2, enemy.y - 16,
            `+${killExp} EXP`,
          );
          // Update EXP bar with lerp animation
          this.hud.updateItemExp(this.item.level, this.item.exp, EXP_PER_LEVEL, leveled);
          // A2: auditory reward on in-run level up (pairs with EXP bar flash)
          if (leveled) {
            SFX.play('upgrade');
            trackItemLevelUp({
              source: 'itemworld_exp',
              item_rarity: this.item.rarity,
              new_level: this.item.level,
            });
          }

          // HEL-05: Tiered healing drops (GDD §4.1)
          const dropX = enemy.x + enemy.width / 2 - 8;
          const dropY = enemy.y + enemy.height;
          const isGolden = enemy instanceof GoldenMonster;
          if (isGolden && this.dropRng.next() < 0.5) {
            // Elite: 50% Forge Ember (25% maxHP)
            const heal = createForgeEmber(dropX, dropY, this.player.maxHp);
            this.healingPickups.push(heal);
            this.entityLayer.addChild(heal.container);
          } else if (!isGolden && this.dropRng.next() < 0.2) {
            // Normal: 20% Ember Shard (10% maxHP)
            const heal = createEmberShard(dropX, dropY, this.player.maxHp);
            this.healingPickups.push(heal);
            this.entityLayer.addChild(heal.container);
          }

          // Gold drop on kill
          const baseGold = Math.floor((enemy.exp > 0 ? enemy.exp : 40) * 0.5);
          const goldAmount = isGolden ? baseGold * 3 : baseGold;
          if (goldAmount > 0) {
            const gp = new GoldPickup(dropX, dropY, goldAmount);
            this.goldPickups.push(gp);
            this.entityLayer.addChild(gp.container);
          }
        }
      }
      if (enemy.shouldRemove) {
        if (enemy.container.parent) enemy.container.parent.removeChild(enemy.container);
        this.enemies.splice(i, 1);
      }
    }

    // Healing pickups — collect on overlap
    for (let i = this.healingPickups.length - 1; i >= 0; i--) {
      const hp = this.healingPickups[i];
      if (hp.collected) {
        hp.destroy();
        this.healingPickups.splice(i, 1);
        continue;
      }
      hp.update(dt);
      const dx = Math.abs((this.player.x + this.player.width / 2) - (hp.x + hp.width / 2));
      const dy = Math.abs((this.player.y + this.player.height / 2) - (hp.y + hp.height / 2));
      if (dx < 16 && dy < 16) {
        const healed = Math.min(hp.healAmount, this.player.maxHp - this.player.hp);
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + hp.healAmount);
        this.screenFlash.flash(0x44ff44, 0.3, 150);
        if (healed > 0) this.toast.show(`HP +${healed}`, 0x44ff44);
        this.itemPickupGlow.spawn(hp.x + hp.width / 2, hp.y + hp.height / 2, 0x44ff44);
        hp.collect();
        hp.destroy();
        this.healingPickups.splice(i, 1);
      }
    }

    // Gold pickups — collect on overlap
    for (let i = this.goldPickups.length - 1; i >= 0; i--) {
      const gp = this.goldPickups[i];
      if (gp.collected) continue;
      gp.update(dt);
      const dx = Math.abs((this.player.x + this.player.width / 2) - (gp.x + gp.width / 2));
      const dy = Math.abs((this.player.y + this.player.height / 2) - (gp.y + gp.height / 2));
      if (dx < 16 && dy < 16) {
        gp.collect();
        this.earnedGold += gp.amount;
        this.dmgNumbers.spawnEXP(gp.x + gp.width / 2, gp.y - 16, `+${gp.amount} G`);
        this.itemPickupGlow.spawn(gp.x + gp.width / 2, gp.y + gp.height / 2, 0xffd700);
        gp.destroy();
        this.goldPickups.splice(i, 1);
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

    // Update projectiles — player attack can destroy them
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.update(dt);
      if (!proj.alive) {
        proj.destroy();
        this.projectiles.splice(i, 1);
        continue;
      }
      // Player attack deflects projectile
      if (this.player.isAttackActive()) {
        const step = this.player.getAttackStep(this.player.comboIndex);
        if (step) {
          const hitbox = getAttackHitbox(
            this.player.x, this.player.y, this.player.width, this.player.height,
            this.player.facingRight ?? true, step,
          );
          if (aabbOverlap(hitbox, { x: proj.x, y: proj.y, width: proj.width, height: proj.height })) {
            this.hitSparks.spawn(proj.x + proj.width / 2, proj.y + proj.height / 2, true, proj.vx > 0 ? -1 : 1);
            proj.alive = false;
            proj.destroy();
            this.projectiles.splice(i, 1);
            continue;
          }
        }
      }
      if (!this.player.invincible && this.player.hp > 0) {
        const overlap = aabbOverlap(
          { x: proj.x, y: proj.y, width: proj.width, height: proj.height },
          { x: this.player.x, y: this.player.y, width: this.player.width, height: this.player.height },
        );
        if (overlap) {
          const dir = proj.vx > 0 ? 1 : -1;
          const dmg = Math.max(1, Math.floor(proj.atk - this.player.def * 0.5));
          this.player.onHit(dir * 80, -40, 150);
          this.player.lastDamageSource = 'projectile';
          this.player.hp -= dmg;
          this.hud.flashDamage();
          this.player.invincible = true;
          this.player.invincibleTimer = 1000;
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

    // Enemy contact damage — all enemies deal damage on body overlap
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      if (this.player.invincible || this.player.hp <= 0) continue;

      const overlap = aabbOverlap(
        { x: this.player.x, y: this.player.y, width: this.player.width, height: this.player.height },
        { x: enemy.x, y: enemy.y, width: enemy.width, height: enemy.height },
      );
      if (!overlap) continue;

      const dir = enemy.x + enemy.width / 2 > this.player.x + this.player.width / 2 ? -1 : 1;
      const dmg = Math.max(1, Math.floor(enemy.atk - this.player.def * 0.5));
      this.player.onHit(dir * 100, -50, 200);
      this.player.lastDamageSource = enemy.constructor.name.toLowerCase();
      this.player.hp -= dmg;
      this.hud.flashDamage();
      this.player.invincible = true;
      this.player.invincibleTimer = 1000;

      // Sakurai feedback
      this.player.startVibrate(4, 5, true);
      this.player.triggerFlash();
      this.game.hitstopFrames = 3;
      this.game.camera.shakeDirectional(3, -dir, -0.3);
      this.screenFlash.flashDamage(dmg > 20);
      const hitX = this.player.x + this.player.width / 2;
      const hitY = this.player.y + this.player.height * 0.4;
      this.dmgNumbers.spawn(hitX, hitY - 8, dmg, false);
      this.hitSparks.spawn(hitX, hitY, false, dir);

      if (this.player.hp <= 0) {
        this.player.hp = 0;
        this.player.onDeath();
        this.game.hitstopFrames = 8;
        this.screenFlash.flashDamage(true);
      }
      break;
    }

    // Boss killed check — spawn exit portal at boss death location
    // Check ALL dead bosses regardless of exitTrigger state
    for (const enemy of this.enemies) {
      if (!enemy.alive && (enemy as any)._isBoss && !(enemy as any)._portalSpawned) {
        (enemy as any)._portalSpawned = true;
        this.hud.hideBossHP();
        const cell = this.getCurrentCell();
        cell.cleared = true;

        // Analytics: stratum boss defeated
        trackItemWorldFloorClear(this.currentStratumIndex, this.item.rarity);

        // Boss EXP is granted via normal kill EXP path (CSV Exp column = 1200).
        // No forced itemLevelUp() — SSoT: Content_Stats_Enemy.csv

        // Boss clear heal: 30% maxHP (GDD HEL-03)
        const bossHeal = Math.floor(this.player.maxHp * 0.30);
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + bossHeal);
        if (bossHeal > 0) {
          this.toast.show(`HP +${bossHeal}`, 0x44ff44);
          this.hud.flashBossHeal();
        }

        // HEL-05: Boss drops Anvil Flame (50% maxHP) 100% chance
        const anvilX = enemy.x + enemy.width / 2 - 8;
        const anvilY = enemy.y + enemy.height;
        const anvil = createAnvilFlame(anvilX, anvilY, this.player.maxHp);
        this.healingPickups.push(anvil);
        this.entityLayer.addChild(anvil.container);

        // Remove any existing escape altar so portal is the only interactable
        this.clearEscapeAltar();

        const px = enemy.x + enemy.width / 2;
        const py = enemy.y + enemy.height;
        this.spawnBossPortal(px, py);

        // A12 (playtest 2026-04-17): boss kills previously used the same
        // feedback as regular kills (hitstop 12, shake 4, small toast). Upgrade
        // to a short cinematic: heavy hitstop + double screen flash + massive
        // shake + large centered "BOSS DEFEATED" banner, then a follow-up info
        // toast after the flash clears. Secondary burst (gold flash + extra
        // particles) fires ~160ms later for a two-beat "hit, then reward".
        const bossCx = enemy.x + enemy.width / 2;
        const bossCy = enemy.y + enemy.height / 2;
        this.game.hitstopFrames = 24;
        this.game.camera.shake(9);
        this.screenFlash.flash(0xffffff, 0.55, 180);
        this.toast.showBig('BOSS DEFEATED', 0xffd35a, 2200);
        this.toast.show('Red portal opened — press UP', 0xff7744);
        // Follow-up burst: ember-gold flash + second particle layer
        setTimeout(() => {
          this.screenFlash.flash(0xffaa22, 0.35, 220);
          this.deathParticles.spawn(bossCx, bossCy, true);
          this.game.camera.shake(5);
        }, 160);
        break;
      }
    }

    // Exit trigger — walk into boss portal
    if (this.exitTrigger) {
      const pb = { x: this.player.x, y: this.player.y, width: this.player.width, height: this.player.height };
      const nearPortal = aabbOverlap(pb, this.exitTrigger);

      // Show/hide prompt
      if (this.exitPrompt) {
        this.exitPrompt.visible = nearPortal;
        if (nearPortal) {
          const us = this.game.uiScale;
          const cam = this.game.camera;
          const cx = this.exitTrigger.x + this.exitTrigger.width / 2;
          const sx = (cx - cam.renderX + GAME_WIDTH / 2) * us - this.exitPrompt.width / 2;
          const sy = (this.exitTrigger.y - cam.renderY + GAME_HEIGHT / 2 - 56) * us;
          this.exitPrompt.x = Math.round(sx);
          this.exitPrompt.y = Math.round(sy);
        }
      }

      if (nearPortal && this.game.input.isJustPressed(GameAction.LOOK_UP)) {
        this.handleStratumExit();
        return;
      }
    }

    // Escape altar interaction — UP to open confirmation dialog
    if (this.altarTrigger) {
      const pb = { x: this.player.x, y: this.player.y, width: this.player.width, height: this.player.height };
      const overlapping = aabbOverlap(pb, this.altarTrigger);
      if (this.altarHint) {
        this.altarHint.visible = overlapping;
        if (overlapping) {
          const us = this.game.uiScale;
          const cam = this.game.camera;
          const sx = (this.altarTrigger.x + 16 - cam.renderX + GAME_WIDTH / 2) * us - this.altarHint.width / 2;
          const sy = (this.altarTrigger.y - cam.renderY + GAME_HEIGHT / 2 - 56) * us;
          this.altarHint.x = Math.round(sx);
          this.altarHint.y = Math.round(sy);
        }
      }
      if (overlapping && this.game.input.isJustPressed(GameAction.LOOK_UP)) {
        this.showEscapeConfirm(true);
        return;
      }
    }

    // Track which room the player is in and lazy-spawn enemies on first entry
    // Clamp to grid bounds to prevent out-of-range access
    const curGridW = this.strataConfig.strata[this.currentStratumIndex]?.gridWidth ?? IW_GRID_W;
    const curGridH = this.strataConfig.strata[this.currentStratumIndex]?.gridHeight ?? IW_GRID_H;
    const playerRoomCol = Math.max(0, Math.min(curGridW - 1, Math.floor(this.player.x / IW_ROOM_W_PX)));
    const playerRoomRow = Math.max(0, Math.min(curGridH - 1, Math.floor(this.player.y / IW_ROOM_H_PX)));
    // Convert local row (0-3) to absolute row so room keys are globally unique
    // across strata and survive exit/re-entry persistence.
    const _stratumOffset = this.unifiedGrid.strataOffsets[this.currentStratumIndex]?.rowOffset ?? 0;
    const playerAbsRow = _stratumOffset + playerRoomRow;
    const roomKey = `${playerRoomCol},${playerAbsRow}`;

    // Spawn enemies in this room if not yet spawned (first-ever visit)
    if (!this.spawnedRooms.has(roomKey)) {
      this.spawnedRooms.add(roomKey);
      this.currentCol = playerRoomCol;
      this.currentRow = playerAbsRow;
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
          // Remember last non-boss room for first-entry respawn
          this.lastSafeRoomCol = this.currentCol;
          this.lastSafeRoomRow = this.currentRow;
        }
      }
      this.spawnEnemiesInRoom(this.currentCol, this.currentRow);
    }

    // Pre-spawn neighbors whenever player enters a DIFFERENT room (first time
    // that room triggers pre-spawn this session). This must run INDEPENDENTLY
    // of spawnedRooms so that walking into a pre-spawned room still cascades
    // pre-spawn to its own neighbors.
    if (this.lastPreSpawnRoomKey !== roomKey) {
      this.lastPreSpawnRoomKey = roomKey;
      this.preSpawnNeighborRooms(playerRoomCol, playerRoomRow);
    }

    // HUD, damage numbers, toast & Sakurai effects
    this.hud.updateHP(this.player.hp, this.player.maxHp);
    this.hud.updateFlask(this.player.flaskCharges, this.player.flaskMaxCharges);
    this.hud.updateATK(this.player.atk);
    // Boss HP bar — 교전 감지 2중 트리거.
    //  1) FSM 상태 ≠ idle/death
    //  2) hp < maxHp — superArmor 보스는 타격해도 FSM 이 hit 으로 전이되지 않으므로
    //     데미지 기록을 직접 본다.
    const activeBoss = this.enemies.find(e => (e as any)._isBoss && e.alive);
    if (activeBoss) {
      const st = activeBoss.fsm.currentState;
      const fsmEngaged = st !== null && st !== 'idle' && st !== 'death';
      const wasHit = activeBoss.hp < activeBoss.maxHp;
      const engaged = fsmEngaged || wasHit;
      if (engaged && !(activeBoss as any)._bossBarShown) {
        (activeBoss as any)._bossBarShown = true;
        this.hud.showBossHP((activeBoss as any).enemyType ?? 'Boss', activeBoss.hp, activeBoss.maxHp);
      }
      if ((activeBoss as any)._bossBarShown) {
        this.hud.updateBossHP(activeBoss.hp);
      }
    }
    this.hud.update(dt);
    this.updateHudText();
    this.dmgNumbers.update(dt);
    this.hitSparks.update(dt);
    this.deathParticles.update(dt);
    this.updateCaptureOrbs(dt);
    this._updateStratumClearPanel(dt);
    this.screenFlash.update(dt);

    // Movement VFX (consume player one-shot events + trail updates)
    this.updateMovementVfx(dt);

    // Clamp player to map bounds (gridW rooms × 512px)
    const gridW = this.strataConfig.strata[this.currentStratumIndex]?.gridWidth ?? IW_GRID_W;
    const gridH = this.strataConfig.strata[this.currentStratumIndex]?.gridHeight ?? IW_GRID_H;
    const MAP_SIZE = Math.max(gridW, gridH) * IW_ROOM_W_PX;
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

  /**
   * Drain player VFX one-shot events and tick the per-frame trails
   * (landing dust / dash afterimage / dash boost / double jump / wall jump).
   */
  private updateMovementVfx(dt: number): void {
    const p = this.player;

    const landedSpeed = p.consumeLandedEvent();
    if (landedSpeed !== null) {
      this.landingDust.spawn(p.x + p.width / 2, p.y + p.height, landedSpeed);
    }
    const dashDir = p.consumeDashedEvent();
    if (dashDir !== null) {
      this.dashBoostPuff.spawn(p.x + p.width / 2, p.y + p.height, dashDir);
    }
    if (p.consumeDoubleJumpEvent()) {
      this.doubleJumpRing.spawn(p.x + p.width / 2, p.y + p.height);
    }
    const kickDir = p.consumeWallJumpEvent();
    if (kickDir !== null) {
      const wallX = kickDir > 0 ? p.x : p.x + p.width;
      const wallY = p.y + p.height * 0.45;
      this.wallJumpDust.spawn(wallX, wallY, kickDir);
    }

    this.dashAfterimage.tick(dt, p.isDashing(), () => ({
      x: p.x, y: p.y, w: p.width, h: p.height,
      facingRight: p.facingRight,
      texture: p.getCurrentErdaTexture(),
      spriteCenterX: p.x + p.width / 2,
      spriteFootY: p.y + p.height,
    }));

    // --- Batch B ---
    if (p.consumeGroundJumpEvent()) {
      this.jumpTakeoff.spawn(p.x + p.width / 2, p.y + p.height);
    }
    // (Drop-through handled in Batch D section below)
    if (p.isWallSliding()) {
      const wallSide = p.wallContactDir();
      const wallX = wallSide < 0 ? p.x : p.x + p.width;
      const outDir = -wallSide;
      this.wallSlideDust.emit(wallX, p.y + p.height * 0.55, outDir, dt);
    }
    this.footstepPuff.stepIfMoving(
      dt, p.isGrounded(),
      p.x + p.width / 2, p.y + p.height,
      p.getVx(), p.facingRight,
    );
    if (p.isSurgeCharging()) {
      this.surgeVfx.tickCharge(dt, p.x + p.width / 2, p.y + p.height, p.getSurgeChargeRatio());
    } else if (p.isSurgeFlying()) {
      this.surgeVfx.tickFly(dt, p.x + p.width / 2, p.y + p.height / 2);
    } else {
      this.surgeVfx.idleTick(dt);
    }

    // --- Batch C ---
    const hitDir = p.consumePlayerHitEvent();
    if (hitDir !== null) {
      this.hitBloodSpray.spawn(p.x + p.width / 2, p.y + p.height * 0.4, hitDir);
    }

    // --- Batch D ---
    if (p.diveLanded) {
      const severity = Math.max(0.8, Math.min(1.6, p.diveFallDistance / 240));
      this.diveLandImpact.spawn(p.x + p.width / 2, p.y + p.height, severity);
    } else if (landedSpeed !== null && landedSpeed > 520) {
      this.diveLandImpact.spawn(p.x + p.width / 2, p.y + p.height, 0.9);
    }
    const waterT = p.consumeWaterTransitionEvent();
    if (waterT !== null) {
      const strength = waterT > 0 ? 1.0 : 0.8;
      this.waterSplash.spawn(p.x + p.width / 2, p.y + p.height, strength);
    }
    this.waterBubbles.emit(p.x + p.width / 2, p.y + p.height * 0.35, dt, p.submerged);
    if (p.consumeDropThroughEvent()) {
      this.dropThroughDust.spawn(p.x + p.width / 2, p.y + p.height, p.width * 0.9);
    }
    this.iceSkidStreak.emit(dt, p.isStandingOnIce(), p.x + p.width / 2, p.y + p.height, p.getVx());

    // --- Enemies: 환경 VFX 재사용 (water/ice + land/jump dust) ---
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      if (!e.alive) continue;
      const ex = e.x + e.width / 2;
      const ey = e.y + e.height;
      if (e.waterTransition !== 0) {
        const strength = e.waterTransition > 0 ? 1.0 : 0.8;
        this.waterSplash.spawn(ex, ey, strength);
      }
      const key = `enemy_${i}`;
      this.waterBubbles.emit(ex, e.y + e.height * 0.35, dt, e.submerged, key);
      this.iceSkidStreak.emit(dt, e.isStandingOnIce(), ex, ey, e.getVx(), key);
      const eLanded = e.consumeLandedEvent();
      if (eLanded !== null) this.landingDust.spawn(ex, ey, eLanded);
      if (e.consumeGroundJumpEvent()) this.jumpTakeoff.spawn(ex, ey);
    }

    this.landingDust.update(dt);
    this.dashBoostPuff.update(dt);
    this.doubleJumpRing.update(dt);
    this.wallJumpDust.update(dt);
    this.jumpTakeoff.update(dt);
    this.wallSlideDust.update(dt);
    this.footstepPuff.update(dt);
    this.flaskBurst.update(dt);
    this.comboFinisherBurst.update(dt);
    this.criticalHighlight.update(dt);
    this.hitBloodSpray.update(dt);
    this.diveLandImpact.update(dt);
    this.waterSplash.update(dt);
    this.waterBubbles.update(dt);
    this.dropThroughDust.update(dt);
    this.iceSkidStreak.update(dt);
    this.itemPickupGlow.update(dt);
    const hpRatio = this.player.maxHp > 0 ? this.player.hp / this.player.maxHp : 0;
    this.lowHpVignette.update(dt, hpRatio);
  }

  private updateHudText(): void {
    const cycleTag = this.progress.cycle > 0 ? `C${this.progress.cycle} ` : '';
    // DEBUG: first entry special conditions
    const dbg = `[1st:${this.isFirstNormalEntry ? 'Y' : 'N'} r=${this.item.rarity} cy=${this.progress.cycle} deep=${this.progress.deepestUnlocked} clr=${this.progress.clearedRooms.length}]`;
    this.hud.setFloorText(
      `${cycleTag}${this.item.def.name} Lv${this.item.level} EXP:${this.item.exp}/${EXP_PER_LEVEL} +${this.earnedExp} ${dbg}`
    );

    // Update depth gauge
    const totalStrata = this.strataConfig.strata.length;
    const cleared: boolean[] = [];
    for (let i = 0; i < totalStrata; i++) {
      const endRoom = this.unifiedGrid.stratumEndRooms.find(e => e.stratumIndex === i);
      if (endRoom) {
        const cell = this.unifiedGrid.cells[endRoom.absoluteRow]?.[endRoom.col];
        cleared.push(cell?.cleared ?? false);
      } else {
        cleared.push(false);
      }
    }
    this.hud.updateDepthGauge(this.currentStratumIndex, cleared);
  }

  private showEscapeConfirm(fromAltar = false): void {
    this.escapeConfirmVisible = true;
    this.escapeConfirmFromAltar = fromAltar;
    this.hideWorldPrompts();

    const panelW = 260;
    const panelH = 72;
    const panel = new Container();
    const bg = new Graphics();
    bg.rect(0, 0, panelW, panelH).fill({ color: 0x1a1a2e, alpha: 0.95 });
    bg.rect(0, 0, panelW, panelH).stroke({ color: 0x4a4a6a, width: 1 });
    panel.addChild(bg);

    const titleText = fromAltar ? 'Use Escape Altar?' : 'Leave Item World?';
    const title = new BitmapText({ text: titleText, style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0xffffff } });
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
      text: `Rooms ${this.roomsCleared}/${this.totalRooms}  +${this.earnedExp} EXP  +${this.earnedGold} G`,
      style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0xaaaaaa },
    });
    floorInfo.x = 12;
    floorInfo.y = 33;
    panel.addChild(floorInfo);

    const controls = new BitmapText({ text: '[C] Yes   [Z/X] No', style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0xaaaaaa } });
    controls.x = 12;
    controls.y = 48;
    panel.addChild(controls);

    panel.x = Math.floor((GAME_WIDTH - panelW) / 2);
    panel.y = Math.floor((GAME_HEIGHT - panelH) / 2);

    this.escapeConfirm = panel;
    this.game.legacyUIContainer.addChild(panel);
  }

  private hideEscapeConfirm(): void {
    this.escapeConfirmVisible = false;
    this.escapeConfirmFromAltar = false;
    if (this.escapeConfirm?.parent) {
      this.escapeConfirm.parent.removeChild(this.escapeConfirm);
    }
    this.escapeConfirm = null;
  }

  // ---------------------------------------------------------------------------
  // Stratum picker — choose starting stratum on re-entry (after first clear)
  // ---------------------------------------------------------------------------

  private showStratumPicker(maxSelectable: number): void {
    this.stratumPickerVisible = true;
    this.stratumPickerMax = maxSelectable;
    // Default selection = lowest cleared (or current default behavior)
    this.stratumPickerSelection = Math.min(this.currentStratumIndex, maxSelectable - 1);
    this.drawStratumPicker();
  }

  private drawStratumPicker(): void {
    if (this.stratumPicker?.parent) {
      this.stratumPicker.parent.removeChild(this.stratumPicker);
    }

    const panelW = 300;
    const rowH = 14;
    const headerH = 28;
    const footerH = 18;
    const panelH = headerH + rowH * this.stratumPickerMax + footerH + 12;

    const panel = new Container();
    const bg = new Graphics();
    bg.rect(0, 0, panelW, panelH).fill({ color: 0x1a1a2e, alpha: 0.96 });
    bg.rect(0, 0, panelW, panelH).stroke({ color: 0x6a6a9a, width: 1 });
    panel.addChild(bg);

    const title = new BitmapText({
      text: 'Select Starting Stratum',
      style: { fontFamily: PIXEL_FONT, fontSize: 10, fill: 0xffffff },
    });
    title.x = 12;
    title.y = 8;
    panel.addChild(title);

    for (let i = 0; i < this.stratumPickerMax; i++) {
      const isSel = i === this.stratumPickerSelection;
      const y = headerH + i * rowH;

      if (isSel) {
        const hl = new Graphics();
        hl.rect(6, y - 2, panelW - 12, rowH).fill({ color: 0x4444aa, alpha: 0.6 });
        panel.addChild(hl);
      }

      const stratumDef = this.strataConfig.strata[i];
      const label = new BitmapText({
        text: `${isSel ? '> ' : '  '}Stratum ${i + 1}  HP x${stratumDef.hpMul.toFixed(1)} ATK x${stratumDef.atkMul.toFixed(1)}`,
        style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: isSel ? 0xffff88 : 0xaaaaaa },
      });
      label.x = 14;
      label.y = y;
      panel.addChild(label);
    }

    const controls = new BitmapText({
      text: '[<-/->] Change   [C] Confirm   [ESC] Cancel',
      style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0x88aacc },
    });
    controls.x = 12;
    controls.y = panelH - footerH;
    panel.addChild(controls);

    panel.x = Math.floor((GAME_WIDTH - panelW) / 2);
    panel.y = Math.floor((GAME_HEIGHT - panelH) / 2);

    this.stratumPicker = panel;
    this.game.legacyUIContainer.addChild(panel);
  }

  private hideStratumPicker(): void {
    this.stratumPickerVisible = false;
    if (this.stratumPicker?.parent) {
      this.stratumPicker.parent.removeChild(this.stratumPicker);
    }
    this.stratumPicker = null;
  }

  private handleStratumPickerInput(): void {
    const input = this.game.input;

    if (input.isJustPressed(GameAction.MOVE_LEFT)) {
      this.stratumPickerSelection = (this.stratumPickerSelection - 1 + this.stratumPickerMax) % this.stratumPickerMax;
      this.drawStratumPicker();
      return;
    }
    if (input.isJustPressed(GameAction.MOVE_RIGHT)) {
      this.stratumPickerSelection = (this.stratumPickerSelection + 1) % this.stratumPickerMax;
      this.drawStratumPicker();
      return;
    }
    if (input.isJustPressed(GameAction.LOOK_UP)) {
      this.stratumPickerSelection = (this.stratumPickerSelection - 1 + this.stratumPickerMax) % this.stratumPickerMax;
      this.drawStratumPicker();
      return;
    }
    if (input.isJustPressed(GameAction.LOOK_DOWN)) {
      this.stratumPickerSelection = (this.stratumPickerSelection + 1) % this.stratumPickerMax;
      this.drawStratumPicker();
      return;
    }
    if (input.isJustPressed(GameAction.ATTACK)) {
      const picked = this.stratumPickerSelection;
      this.hideStratumPicker();
      this.jumpToStratum(picked);
      return;
    }
    if (input.isJustPressed(GameAction.MENU) || input.isJustPressed(GameAction.JUMP)) {
      // Cancel — keep default starting stratum
      this.hideStratumPicker();
      return;
    }
  }

  /** Jump to the specified stratum's start room and rebuild the full map. */
  private jumpToStratum(stratumIndex: number): void {
    if (stratumIndex === this.currentStratumIndex) return;
    if (stratumIndex < 0 || stratumIndex >= this.strataConfig.strata.length) return;

    this.currentStratumIndex = stratumIndex;
    this.currentStratumDef = this.strataConfig.strata[stratumIndex];

    // Use the stratum's actual critical path origin
    const stratumStart = this.unifiedGrid.stratumStartRooms?.[stratumIndex];
    const offset = this.unifiedGrid.strataOffsets[stratumIndex];
    if (!offset) return;
    const startRow = stratumStart?.absoluteRow ?? offset.rowOffset;
    const startCol = stratumStart?.col ?? 0;

    this.toast.show(`Stratum ${stratumIndex + 1} — Beginning...`, 0x88ccff);
    this.startTransition('down', startCol, startRow);
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
      text: `[C] Next  ${step}`,
      style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0x888888 },
    });
    prompt.x = padX;
    prompt.y = panelH - padY - 8;
    panel.addChild(prompt);

    panel.x = Math.floor((GAME_WIDTH - panelW) / 2);
    panel.y = Math.floor((GAME_HEIGHT - panelH) / 2) - 20;

    this.onboardingPanel = panel;
    this.game.legacyUIContainer.addChild(panel);
  }

  private advanceOnboarding(): void {
    this.onboardingStep++;
    this.showOnboardingStep();
  }

  /**
   * 월드 공간(world-space)에 떠 있는 컨텍스트 프롬프트를 일괄 숨긴다.
   * modal 패널(bossChoice / stratumClearPanel / escapeConfirm / post_clear_hold)이
   * 활성화된 프레임에 update 루프가 early-return 하면, 프롬프트의 가시성
   * 토글 분기에 도달하지 못해 마지막 visible=true 상태가 결과 패널 위에
   * 잔존한다. 모달 진입 시점과 update 선두에서 이 함수를 호출해 방지.
   */
  private hideWorldPrompts(): void {
    if (this.exitPrompt) this.exitPrompt.visible = false;
    if (this.altarHint) this.altarHint.visible = false;
  }

  /** 현재 프레임에서 world-space 프롬프트가 숨겨져 있어야 하는지 판정. */
  private shouldSuppressWorldPrompts(): boolean {
    return (
      this.bossChoiceVisible ||
      this.escapeConfirmVisible ||
      this.stratumClearPanel !== null ||
      this.transitionState !== 'none'
    );
  }

  private handleStratumExit(): void {
    this.hideWorldPrompts();
    const isFinal = this.isFinalEndRoom(this.currentCol, this.currentRow);

    // A6 + A16: capture before/after snapshot (we're still on the stratum
    // that just ended — no state changes yet). A6 renders a one-line toast;
    // A16 shows a structured before/after panel that auto-dismisses.
    const _a6BeforeAtk = this.stratumStartAtk;
    const _a6AfterAtk = this.item.finalAtk;
    const _a16Snapshot = {
      beforeAtk: this.stratumStartAtk,
      afterAtk: this.item.finalAtk,
      beforeLevel: this.stratumStartLevel,
      afterLevel: this.item.level,
      beforeInnocents: this.stratumStartInnocentCount,
      afterInnocents: this.item.innocents.length,
    };

    if (!isFinal) {
      const nextStratumIndex = this.currentStratumIndex + 1;
      const hasNextStratum = !!this.unifiedGrid.strataOffsets[nextStratumIndex];

      if (!hasNextStratum) {
        // No more strata — auto-exit (no choice offered; there's nothing to descend into)
        this.progress.lastSafeStratum = this.currentStratumIndex;
        this.persistRoomState();
        this.toast.show(`${this.item.def.name} Lv${this.item.level} — Strata Complete!`, 0xffaa00);
        this._showA6DmgToast(_a6BeforeAtk, _a6AfterAtk);
        this._showStratumClearPanel(_a16Snapshot, true);
        this.startPostClearHold();
        return;
      }

      // A17: offer a choice instead of auto-descending. Stash the snapshot so
      // the chosen branch can surface it in toasts/panels. Also pre-compute
      // the "peek" at next stratum difficulty so the player can make an
      // informed call.
      this._pendingStratumSnapshot = { a6BeforeAtk: _a6BeforeAtk, a6AfterAtk: _a6AfterAtk, a16: _a16Snapshot };
      this.showBossChoice(nextStratumIndex);
      return;
    } else {
      // Deepest stratum cleared — exit item world
      this.exitReason = 'clear';
      this.progress.lastSafeStratum = this.currentStratumIndex;
      markItemCleared(this.item);
      this.persistRoomState();
      // Level up already happened on boss kill — just show result
      this.toast.show(`${this.item.def.name} Lv${this.item.level} — Strata Complete!`, 0xffaa00);
      this._showA6DmgToast(_a6BeforeAtk, _a6AfterAtk);
      this._showStratumClearPanel(_a16Snapshot, true);
      this.startPostClearHold();
    }
  }

  /** A6: show "+X% DMG (before → after)" when a stratum completes. Silent when atk did not change. */
  private _showA6DmgToast(beforeAtk: number, afterAtk: number): void {
    if (afterAtk <= beforeAtk || beforeAtk <= 0) return;
    const pct = Math.round(((afterAtk - beforeAtk) / beforeAtk) * 100);
    if (pct <= 0) return;
    this.toast.show(`+${pct}% DMG  (${beforeAtk} \u2192 ${afterAtk})`, 0xffcc44);
  }

  /**
   * A16 (playtest 2026-04-17): structured before/after stats panel shown on
   * stratum clear. Displays ATK, item Lv, and Innocent count deltas side-by-
   * side. The toast stack gives a running log, but this panel gives a single
   * readable "progress snapshot" the player can parse at a glance.
   */
  private _showStratumClearPanel(
    snap: { beforeAtk: number; afterAtk: number; beforeLevel: number; afterLevel: number; beforeInnocents: number; afterInnocents: number },
    isFinal: boolean,
  ): void {
    // Replace any existing panel (e.g. rapid back-to-back clears)
    if (this.stratumClearPanel) {
      const p = this.stratumClearPanel;
      if (p.container.parent) p.container.parent.removeChild(p.container);
      p.container.destroy({ children: true });
      this.stratumClearPanel = null;
    }

    const container = new Container();

    // Panel geometry — doubled for readability
    const W = 400;
    const H = 172;
    const x = Math.floor((GAME_WIDTH - W) / 2);
    const y = Math.floor((GAME_HEIGHT - H) / 2);
    const bg = new Graphics();
    bg.roundRect(0, 0, W, H, 6).fill({ color: 0x0c0c18, alpha: 0.92 });
    bg.roundRect(0, 0, W, H, 6).stroke({ color: 0xffcc44, width: 2, alpha: 0.9 });
    container.addChild(bg);

    const title = new BitmapText({
      text: isFinal ? 'ITEM CLEARED' : `STRATUM ${this.currentStratumIndex + 1} CLEAR`,
      style: { fontFamily: PIXEL_FONT, fontSize: 16, fill: 0xffd35a },
    });
    title.x = Math.floor(W / 2 - title.width / 2);
    title.y = 12;
    container.addChild(title);

    const rowY = 44;
    const rowH = 24;
    const labelX = 20;
    const valueX = 148;
    const arrowX = 240;
    const afterX = 280;
    const deltaX = 352;

    const rows: [string, number, number][] = [
      ['ATK',       snap.beforeAtk,       snap.afterAtk],
      ['Lv',        snap.beforeLevel,     snap.afterLevel],
      ['Innocents', snap.beforeInnocents, snap.afterInnocents],
    ];

    for (let i = 0; i < rows.length; i++) {
      const [label, before, after] = rows[i];
      const ry = rowY + i * rowH;
      const delta = after - before;
      const hasDelta = delta !== 0;
      const deltaColor = delta > 0 ? 0x88ff88 : (delta < 0 ? 0xff8888 : 0x666677);

      const lbl = new BitmapText({ text: label, style: { fontFamily: PIXEL_FONT, fontSize: 16, fill: 0xbbbbcc } });
      lbl.x = labelX; lbl.y = ry;
      container.addChild(lbl);

      const bef = new BitmapText({ text: String(before), style: { fontFamily: PIXEL_FONT, fontSize: 16, fill: 0x888899 } });
      bef.x = valueX; bef.y = ry;
      container.addChild(bef);

      const arrow = new BitmapText({ text: '\u2192', style: { fontFamily: PIXEL_FONT, fontSize: 16, fill: 0x888899 } });
      arrow.x = arrowX; arrow.y = ry;
      container.addChild(arrow);

      const aft = new BitmapText({
        text: String(after),
        style: { fontFamily: PIXEL_FONT, fontSize: 16, fill: hasDelta ? 0xffffff : 0x888899 },
      });
      aft.x = afterX; aft.y = ry;
      container.addChild(aft);

      if (hasDelta) {
        const sign = delta > 0 ? '+' : '';
        const d = new BitmapText({
          text: `${sign}${delta}`,
          style: { fontFamily: PIXEL_FONT, fontSize: 16, fill: deltaColor },
        });
        d.x = deltaX; d.y = ry;
        container.addChild(d);
      }
    }

    // [C] confirm hint at bottom center
    const hint = new BitmapText({
      text: '[C] OK',
      style: { fontFamily: PIXEL_FONT, fontSize: 16, fill: 0x888899 },
    });
    hint.x = Math.floor(W / 2 - hint.width / 2);
    hint.y = H - 30;
    container.addChild(hint);

    container.x = x;
    container.y = y;
    this.game.legacyUIContainer.addChild(container);
    this.stratumClearPanel = { container, confirmed: false };
  }

  private _updateStratumClearPanel(_dt: number): void {
    const p = this.stratumClearPanel;
    if (!p) return;
    // Wait for X key confirmation
    if (this.game.input.isJustPressed(GameAction.ATTACK)) {
      this.game.input.consumeJustPressed(GameAction.ATTACK);
      p.confirmed = true;
      if (p.container.parent) p.container.parent.removeChild(p.container);
      p.container.destroy({ children: true });
      this.stratumClearPanel = null;
    }
  }

  /**
   * A15: Spawn a seal orb at the capture position. The orb briefly rises, then
   * homes toward the player while shrinking — reads as "sealed into the weapon".
   * Pure VFX, no hit logic. Parented under entityLayer so world-space transform
   * matches the player, making the homing motion accurate under camera moves.
   */
  private spawnCaptureOrb(x: number, y: number): void {
    // Outer glow + inner core
    const gfx = new Graphics();
    gfx.circle(0, 0, 5).fill({ color: 0x88ddff, alpha: 0.35 });
    gfx.circle(0, 0, 3).fill({ color: 0xffffff, alpha: 0.9 });
    gfx.x = x;
    gfx.y = y;
    this.entityLayer.addChild(gfx);
    // Initial upward drift (40 px/s), gravity is handled in update via homing.
    this.captureOrbs.push({
      gfx, x, y, vx: 0, vy: -40,
      life: 520, maxLife: 520,
    });
  }

  private updateCaptureOrbs(dt: number): void {
    if (this.captureOrbs.length === 0) return;
    const dtSec = dt / 1000;
    const targetX = this.player.x + this.player.width / 2;
    const targetY = this.player.y + this.player.height / 2;
    for (let i = this.captureOrbs.length - 1; i >= 0; i--) {
      const o = this.captureOrbs[i];
      o.life -= dt;
      const k = Math.max(0, o.life / o.maxLife);
      // In the last 70% of lifetime, blend drift into homing toward player.
      // Early: float up. Late: accelerate toward player.
      const homeBlend = 1 - k; // 0..1
      const dx = targetX - o.x;
      const dy = targetY - o.y;
      const dist = Math.max(1, Math.hypot(dx, dy));
      const homeSpeed = 240 * homeBlend;
      o.vx = o.vx * 0.9 + (dx / dist) * homeSpeed * homeBlend;
      o.vy = o.vy * 0.9 + (dy / dist) * homeSpeed * homeBlend - 30 * k; // still a bit of rise early
      o.x += o.vx * dtSec;
      o.y += o.vy * dtSec;
      o.gfx.x = o.x;
      o.gfx.y = o.y;
      // Shrink + fade-in-fade-out (hold alpha, shrink at the end)
      const s = 0.6 + k * 0.4;
      o.gfx.scale.set(s);
      o.gfx.alpha = k > 0.1 ? 1 : k / 0.1;
      if (o.life <= 0 || dist < 6) {
        // Implode flash on arrival
        this.screenFlash.flash(0xaaeeff, 0.2, 90);
        if (o.gfx.parent) o.gfx.parent.removeChild(o.gfx);
        o.gfx.destroy();
        this.captureOrbs.splice(i, 1);
      }
    }
  }

  /**
   * A17 (playtest 2026-04-17): after a non-final stratum boss, offer the
   * player a choice — Continue deeper, or Exit safely with progress banked.
   * Previously the portal auto-advanced, which felt like the player had no
   * agency over their run length.
   */
  private showBossChoice(nextStratumIndex: number): void {
    this._pendingNextStratumIndex = nextStratumIndex;
    this.hideBossChoice();

    const panelW = 220;
    const panelH = 84;
    const panel = new Container();

    const bg = new Graphics();
    bg.roundRect(0, 0, panelW, panelH, 4).fill({ color: 0x0a0a1e, alpha: 0.95 });
    bg.roundRect(0, 0, panelW, panelH, 4).stroke({ color: 0xffcc66, width: 1 });
    panel.addChild(bg);

    const title = new BitmapText({
      text: 'BOSS DEFEATED',
      style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0xffcc66 },
    });
    title.x = Math.floor((panelW - title.width) / 2);
    title.y = 8;
    panel.addChild(title);

    const info = new BitmapText({
      text: `Next: Stratum ${nextStratumIndex + 1}`,
      style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0xcccccc },
    });
    info.x = Math.floor((panelW - info.width) / 2);
    info.y = 24;
    panel.addChild(info);

    const goPrompt = new BitmapText({
      text: '[C] Continue Deeper',
      style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0x88ff88 },
    });
    goPrompt.x = Math.floor((panelW - goPrompt.width) / 2);
    goPrompt.y = 44;
    panel.addChild(goPrompt);

    const exitPrompt = new BitmapText({
      text: '[ESC] Exit Safely',
      style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0xffaa44 },
    });
    exitPrompt.x = Math.floor((panelW - exitPrompt.width) / 2);
    exitPrompt.y = 60;
    panel.addChild(exitPrompt);

    panel.x = Math.floor((GAME_WIDTH - panelW) / 2);
    panel.y = Math.floor((GAME_HEIGHT - panelH) / 2) - 20;

    this.bossChoicePanel = panel;
    this.bossChoiceVisible = true;
    this.game.legacyUIContainer.addChild(panel);
  }

  private hideBossChoice(): void {
    if (this.bossChoicePanel) {
      if (this.bossChoicePanel.parent) this.bossChoicePanel.parent.removeChild(this.bossChoicePanel);
      this.bossChoicePanel.destroy({ children: true });
      this.bossChoicePanel = null;
    }
    this.bossChoiceVisible = false;
  }

  /** A17: player chose to continue — descend into the next stratum. */
  private _continueToNextStratum(): void {
    const snap = this._pendingStratumSnapshot;
    const next = this._pendingNextStratumIndex;
    this._pendingStratumSnapshot = null;
    this._pendingNextStratumIndex = -1;
    if (snap) {
      this._showA6DmgToast(snap.a6BeforeAtk, snap.a6AfterAtk);
      this._showStratumClearPanel(snap.a16, false);
    }
    if (next >= 0) {
      this.jumpToStratum(next);
    }
  }

  /** A17: player chose to exit — bank progress, leave the item world. */
  private _exitAfterBoss(): void {
    const snap = this._pendingStratumSnapshot;
    this._pendingStratumSnapshot = null;
    this._pendingNextStratumIndex = -1;
    this.progress.lastSafeStratum = this.currentStratumIndex;
    this.persistRoomState();
    this.toast.show(`${this.item.def.name} Lv${this.item.level} — Returning with progress...`, 0xffaa00);
    if (snap) {
      this._showA6DmgToast(snap.a6BeforeAtk, snap.a6AfterAtk);
      this._showStratumClearPanel(snap.a16, false);
    }
    this.startPostClearHold();
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
    const roomTopTile = localRow * IW_ROOM_H_TILES;
    const roomLeftTile = this.currentCol * IW_ROOM_W_TILES;
    // Random X column within room (avoid edges: +4 to +(W-4))
    const altarTC = roomLeftTile + 4 + altarRng.nextInt(0, IW_ROOM_W_TILES - 8);
    let altarTileY = roomTopTile + IW_ROOM_H_TILES - 4; // default near bottom
    for (let tr = roomTopTile + 2; tr < roomTopTile + IW_ROOM_H_TILES - 2; tr++) {
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

    // Context prompt — rendered in uiContainer for crisp text
    const hint = KeyPrompt.createPrompt('\u2191', 'Exit', this.game.uiScale);
    hint.visible = false;
    this.altarHint = hint;
    this.game.uiContainer.addChild(hint);
  }

  private clearEscapeAltar(): void {
    if (this.altarVisual?.parent) this.altarVisual.parent.removeChild(this.altarVisual);
    this.altarVisual = null;
    this.altarTrigger = null;
    if (this.altarHint?.parent) this.altarHint.parent.removeChild(this.altarHint);
    this.altarHint = null;
  }

  private startExitFade(): void {
    this.transitionState = 'exit_fade';
    this.transitionTimer = FADE_DURATION * 2;
  }

  /**
   * Hold on the StratumClearPanel until the player presses X to confirm,
   * then kick off the exit fade.
   */
  private startPostClearHold(): void {
    this.transitionState = 'post_clear_hold';
    this.transitionTimer = 0; // not timer-based; waits for panel confirm
  }

  private exitItemWorld(): void {
    // Analytics: guard against double-fire (death path tracks exit earlier)
    if (!this.exitTracked) {
      trackItemWorldExit(this.exitReason, this.currentStratumIndex);
    }

    this.sourcePlayer.hp = this.player.hp;

    this.hideEscapeConfirm();
    if (this.miniMapContainer.parent) this.miniMapContainer.parent.removeChild(this.miniMapContainer);
    // Clean up all UI owned by this scene
    this.hud.hideDepthGauge();
    this.hud.hideItemExp();
    if (this.hud.container.parent) this.hud.container.parent.removeChild(this.hud.container);
    if (this.returnHint) { this.returnHint.destroy(); this.returnHint = null; }
    if (this.altarHint?.parent) this.altarHint.parent.removeChild(this.altarHint);
    if (this.exitPrompt?.parent) this.exitPrompt.parent.removeChild(this.exitPrompt);
    // Remove any lingering damage numbers / prompts from uiContainer
    // (keep only persistent items — world scene re-adds its own in enter())
    this.game.uiContainer.removeChildren();

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
        const spawnCX = this.currentCol * IW_ROOM_W_PX + IW_ROOM_W_PX / 2;
        const spawnTileC = Math.floor(spawnCX / TILE_SIZE);
        const roomTopT = localRow * IW_ROOM_H_TILES;
        let spawnY = localRow * IW_ROOM_H_PX + IW_ROOM_H_PX / 2;
        for (let tr = roomTopT + 2; tr < roomTopT + IW_ROOM_H_TILES - 2; tr++) {
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
    } else if (this.transitionState === 'post_clear_hold') {
      // Wait for the player to confirm the StratumClearPanel with X key.
      // _updateStratumClearPanel handles input and sets confirmed + destroys panel.
      this._updateStratumClearPanel(dt);
      if (!this.stratumClearPanel) {
        this.startExitFade();
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
    this.clearStaticEntities();
    if (this.loreDisplay) {
      this.loreDisplay.close();
      if (this.loreDisplay.container.parent) {
        this.loreDisplay.container.parent.removeChild(this.loreDisplay.container);
      }
      this.loreDisplay = null;
    }
    if (this.onboardingPanel?.parent) this.onboardingPanel.parent.removeChild(this.onboardingPanel);
    if (this.miniMapContainer?.parent) this.miniMapContainer.parent.removeChild(this.miniMapContainer);
    if (this.hud?.container.parent) this.hud.container.parent.removeChild(this.hud.container);
    if (this.controlsOverlay?.container.parent) this.controlsOverlay.container.parent.removeChild(this.controlsOverlay.container);
    if (this.screenFlash?.overlay.parent) this.screenFlash.overlay.parent.removeChild(this.screenFlash.overlay);
    // LowHpVignette 는 legacyUIContainer 에 attach 되므로 scene exit 시 반드시 destroy.
    // 누락 시 저체력 사망 후 WORLD 로 복귀해도 붉은 vignette 이 그대로 남는 버그 발생.
    if (this.lowHpVignette) {
      this.lowHpVignette.destroy();
    }
    if (this.stratumClearPanel) {
      const p = this.stratumClearPanel;
      if (p.container.parent) p.container.parent.removeChild(p.container);
      p.container.destroy({ children: true });
      this.stratumClearPanel = null;
    }
  }

  /**
   * Minimap rendering — disabled for Spelunky-style blind exploration.
   * Kept as a no-op so existing call sites (buildFullMap, room transition,
   * lazy spawn) remain valid without branching.
   */
  private drawMiniMap(): void {
    // intentionally empty
  }
}
