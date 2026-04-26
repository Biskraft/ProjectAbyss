/**
 * LdtkWorldScene.ts
 *
 * World-space scene that loads hand-crafted LDtk levels instead of procedurally
 * generated rooms. Implements the World (?�험) space of the 3-Space separation
 * model (Design_Architecture_2Space.md).
 *
 * Key differences from WorldScene:
 *  - No RoomGrid / ChunkAssembler: levels are loaded from a .ldtk project file.
 *  - LdtkLoader parses the project; LdtkRenderer draws the tiles.
 *  - Room data comes from level.collisionGrid (same 2D format the Player uses).
 *  - Room transitions use world-space coordinates and level.neighbors.
 *  - Variable level sizes ??camera bounds are set per level.
 *  - Player spawn position read from the LDtk "Player" entity.
 *
 * All combat, portal, altar, inventory, and game-over systems are copied
 * faithfully from WorldScene.ts.
 */

import { Container, Graphics, BitmapText, Assets, Texture, Sprite } from 'pixi.js';
import { Scene } from '@core/Scene';
import { GameAction } from '@core/InputManager';
import { ProximityRouter, type ProximityInteraction } from '@core/ProximityRouter';
import { aabbOverlap } from '@core/Physics';
import { LdtkLoader } from '@level/LdtkLoader';
import { LdtkRenderer } from '@level/LdtkRenderer';
import type { LdtkLevel } from '@level/LdtkLoader';
import { Player } from '@entities/Player';
import { Skeleton } from '@entities/Skeleton';
import { Ghost } from '@entities/Ghost';
import { Slime } from '@entities/Slime';
import { Guardian } from '@entities/Guardian';
import { GoldenMonster } from '@entities/GoldenMonster';
import { createEnemy } from '@entities/EnemyFactory';
import { Projectile } from '@entities/Projectile';
import { Portal, type PortalSourceType } from '@entities/Portal';
import { Altar } from '@entities/Altar';
import { Anvil } from '@entities/Anvil';
import { LockedDoor, type UnlockCondition } from '@entities/LockedDoor';
import { Switch } from '@entities/Switch';
import { GrowingWall } from '@entities/GrowingWall';
import { CrackedFloor } from '@entities/CrackedFloor';
import { SecretWall } from '@entities/SecretWall';
import { getMasterItem } from '@data/itemMaster';
import { Spike } from '@entities/Spike';
import { isInUpdraft, isInSpike } from '@core/Physics';
import { CollapsingPlatform } from '@entities/CollapsingPlatform';
import { HealthShard } from '@entities/HealthShard';
import { HealingPickup, createEmberShard, createForgeEmber } from '@entities/HealingPickup';
import { GoldPickup } from '@entities/GoldPickup';
import { HitManager, BASE_HITBOX_W } from '@combat/HitManager';
import { COMBO_STEPS, getAttackHitbox } from '@combat/CombatData';
import { HUD } from '@ui/HUD';
import { AreaTitle } from '@ui/AreaTitle';
import { TITLE_FADE_OVERLAY_LABEL } from './TitleScene';
import { UISkin } from '@ui/UISkin';
import { KeyPrompt } from '@ui/KeyPrompt';
import { ControlsOverlay } from '@ui/ControlsOverlay';
import { InventoryUI } from '@ui/InventoryUI';
import { PauseMenu } from '@ui/PauseMenu';
import { CharacterStats } from '@ui/CharacterStats';
import { DeathScreen, type DeathStats } from '@ui/DeathScreen';
import { Inventory } from '@items/Inventory';
import { ItemDropEntity } from '@items/ItemDrop';
import { SWORD_DEFS, STARTER_ONLY_IDS, type WeaponDef } from '@data/weapons';
import { LORE_WEAPONS, loreWeaponToWeaponDef } from '@data/loreWeapons';
import { createItem, calcInnocentBonus, itemLevelUp, isItemFullyCleared, resetItemForNextCycle } from '@items/ItemInstance';
import { getPlayerBaseStats } from '@data/playerStats';
import type { ItemInstance } from '@items/ItemInstance';
import { ItemWorldScene } from './ItemWorldScene';
import { PortalTransition } from '@effects/PortalTransition';
import { FloorCollapse } from '@effects/FloorCollapse';
import { ScreenCrack } from '@effects/ScreenCrack';
import { MemoryDive } from '@effects/MemoryDive';
import { WeaponPulse } from '@effects/WeaponPulse';
import { AnvilTether } from '@effects/AnvilTether';
import { ExitGlow, type ExitGlowDir } from '@effects/ExitGlow';
import { LorePopup } from '@ui/LorePopup';
import { LoreDisplay, type LoreLine } from '@ui/LoreDisplay';
import { DivePreview } from '@ui/DivePreview';
import { sacredSave } from '@save/PlayerSave';
import {
  EGO_WAKE, EGO_FIRST_WALK, EGO_ANVIL, EGO_WEAPON_SWAP,
  EGO_WORLD_RETURN, EGO_EVENT, hasEgo,
} from '@data/EgoDialogue';
import { HitSparkManager } from '@effects/HitSpark';
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
import { RelicAuraBurstManager } from '@effects/RelicAuraBurst';
import { SavepointPulseManager } from '@effects/SavepointPulse';
import { LowHpVignetteManager } from '@effects/LowHpVignette';
import { getRarityConfig } from '@data/rarityConfig';
import { ScreenFlash } from '@effects/ScreenFlash';
import { PaletteSwapFilter } from '@effects/PaletteSwapFilter';
import { RimLightFilter } from '@effects/RimLightFilter';
import { ParallaxBackground } from '@level/ParallaxBackground';
import { ProceduralDecorator, hashString } from '@level/ProceduralDecorator';
import {
  getAreaPalette,
  getAreaPaletteAtlas,
  getAreaPaletteRow,
  ensureAreaTilesetsLoaded,
  applyAreaTilesetToLdtkTiles,
} from '@data/areaPalettes';
import { SaveManager } from '@utils/SaveManager';
import { ToastManager } from '@ui/Toast';
import { WorldMapOverlay } from '@ui/WorldMapOverlay';

import { PIXEL_FONT } from '@ui/fonts';
import { EndingSequence, type EndingTrigger } from '@systems/EndingSequence';
import { UpdraftSystem } from '@systems/UpdraftSystem';
import { DamageNumberManager } from '@ui/DamageNumber';
import { TutorialHint } from '@ui/TutorialHint';
import { PRNG } from '@utils/PRNG';
import { WorldUiController } from './world/WorldUiController';
import { WorldTransitionController } from './world/WorldTransitionController';
import { GiantBuilder } from '@entities/GiantBuilder';
import type { Rarity } from '@data/weapons';
import type { Enemy } from '@entities/Enemy';
import type { CombatEntity } from '@combat/HitManager';
import { GAME_WIDTH, GAME_HEIGHT, type Game } from '../Game';
import {
  trackPlayerDeath,
  trackSave,
  trackEnemyKill,
  trackGateBreak,
  trackRelicAcquire,
  trackItemLevelUp,
  trackBossFight,
  trackItemDrop,
} from '@utils/Analytics';
import { assetPath } from '@core/AssetLoader';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TILE_SIZE = 16;
const FADE_DURATION = 200;

const LDTK_PATH = assetPath('assets/World_ProjectAbyss.ldtk');
// ItemTunnel world was removed from the LDtk project; tunnel descent flow
// is archived (enterItemWorldFromTunnel() is called directly after anvil FX).
const LDTK_WORLD_IDS: string[] = ['Overworld'];
const BUILDER_WORLD_ID = 'Builder';
// AreaIDs used by the overworld ??Content_System_Area_Palette.csv's Tileset
// column drives which atlases get loaded for this scene.
const WORLD_AREA_IDS = ['world_shaft_bg', 'world_shaft_wall'] as const;
const FALLBACK_ENTRANCE_LEVEL = 'World_Level_16';

type TransitionState = 'none' | 'fade_out' | 'fade_in';

/** Anything that can be attached to a moving GiantBuilder. The entity's
 *  visual `container` is reparented under builder.container at spawn time
 *  so the builder's transform carries it. World coords (x/y) — used by
 *  pickup/interaction hitbox tests — are recomputed each frame from
 *  builder.container + (localX, localY). `isAlive` lets the sync loop
 *  drop dead refs (e.g. picked-up drops). */
interface BuilderAttachable {
  x: number;
  y: number;
  container: Container;
  baseY?: number;
}
interface BuilderAttachment {
  entity: BuilderAttachable;
  localX: number;
  localY: number;
  isAlive: () => boolean;
}

// ---------------------------------------------------------------------------
// LdtkWorldScene
// ---------------------------------------------------------------------------

export class LdtkWorldScene extends Scene {
  // LDtk level data
  private loader!: LdtkLoader;
  private builderLoader!: LdtkLoader;
  private activeBuilder: GiantBuilder | null = null;
  private activeBuilderMode: 'cinematic' | 'patrol' | null = null;
  // Shaft_01 cinematic builder is a one-shot — the ascent plays only on the
  // first time the player enters the room this session. Re-entries skip it.
  private shaft01CinematicPlayed = false;
  // Tracks the builder's moving state across frames so we can emit a single
  // heavy "landing" shake on the exact frame it transitions to idle.
  private builderWasMoving = false;
  // Counts tile crossings so we can emit shakes on every other crossing
  // (half the cadence of raw 16-px steps — slower, weightier rhythm).
  private builderStepCounter = 0;
  /** Cells in host collisionGrid currently overwritten by builder (row, col). Only cells that were 0 are stamped. */
  private builderStamps: Array<{ r: number; c: number }> = [];
  /** True if, after last physics step, the player was grounded on a builder-stamped tile. Used to carry the player vertically with the builder. */
  private playerOnBuilder = false;
  /** True if the player's AABB overlaps the builder's world-space rectangle (airborne too). Used for camera override. */
  private playerInBuilder = false;
  private renderer!: LdtkRenderer;
  private procDecorator: ProceduralDecorator | null = null;
  private _extraDecorators: ProceduralDecorator[] = [];
  private wallPaletteFilter: PaletteSwapFilter | null = null;
  private naturalPaletteFilter: PaletteSwapFilter | null = null;
  private wallRimFilter: RimLightFilter | null = null;
  private bgPaletteFilter: PaletteSwapFilter | null = null;
  private interiorPaletteFilter: PaletteSwapFilter | null = null;
  // Builder-specific palette filters (cool steel tone, contrasts the host's
  // crimson shaft). Built alongside the host filters in init().
  private builderBgPaletteFilter: PaletteSwapFilter | null = null;
  private builderWallPaletteFilter: PaletteSwapFilter | null = null;
  private builderInteriorPaletteFilter: PaletteSwapFilter | null = null;
  private builderNaturalPaletteFilter: PaletteSwapFilter | null = null;
  private parallaxBG!: ParallaxBackground;
  private atlas!: Texture;
  /** Per-tileset atlas map keyed by LDtk __tilesetRelPath. */
  private atlases: Record<string, Texture> = {};
  private currentLevel!: LdtkLevel;
  private collisionGrid: number[][] = [];
  private cameraZones: {
    x: number; y: number; w: number; h: number;
    zoom: number; deadZoneX: number; deadZoneY: number;
    lookAheadDistance: number; followLerp: number; zoomLerp: number;
    entireLevel: boolean;
  }[] = [];
  private activeCameraZone: typeof this.cameraZones[number] | null = null;

  // Layers
  private entityLayer!: Container;

  // Entities
  private player!: Player;
  private enemies: Enemy<string>[] = [];
  private projectiles: Projectile[] = [];
  private hitManager!: HitManager;
  private dropRng!: PRNG;

  // Items
  private inventory!: Inventory;
  private drops: ItemDropEntity[] = [];
  /** Entities that ride the active GiantBuilder. Each frame their world
   *  coords are recomputed from the builder's current position so pickup /
   *  interaction hitboxes (which use world coords) stay in sync with the
   *  visual. Anything with `x`, `y`, `container` and an optional `baseY`
   *  (for bob-animated entities) can be attached. */
  private builderAttachments: BuilderAttachment[] = [];
  private inventoryUI!: InventoryUI;
  private hud!: HUD;
  private areaTitle!: AreaTitle;
  // Title→game fade-in overlay (handed off from TitleScene via game.uiContainer).
  private titleFadeInOverlay: Graphics | null = null;
  private titleFadeInTimer = 0;
  private readonly TITLE_FADE_IN_MS = 1400;
  // Game-start intro sequence: fade-in → area title → reveal HUD.
  // 'none' = skip sequence (e.g. pop return from sub-scenes).
  private introPhase: 'none' | 'fadeIn' | 'title' | 'done' = 'none';
  // Area title queued during intro fade-in; shown once the fade completes.
  private pendingAreaTitle: string | null = null;
  // Edge detector: when areaTitle transitions active→inactive while HUD is
  // still hidden (intro), that's the signal to reveal HUD.
  private wasAreaTitleActive = false;
  private uiSkin: UISkin | null = null;
  private controlsOverlay!: ControlsOverlay;
  private pauseMenu!: PauseMenu;
  private characterStats!: CharacterStats;
  private deathScreen!: DeathScreen;
  private isPaused = false;

  // Room transition
  private transitionState: TransitionState = 'none';
  private transitionTimer = 0;
  private pendingDirection: 'left' | 'right' | 'up' | 'down' | null = null;
  private pendingLevelId: string | null = null;
  private pendingPlayerTileY = 0;
  private pendingPlayerTileX = 0;
  private fadeOverlay!: Graphics;
  private postTransitionSnapFrames = 0;  // force camera snap for N frames after transition
  private lookHoldTimer = 0; // ms holding UP/DOWN while idle

  // Boss lock
  private bossActive = false;
  private bossLockDoors: LockedDoor[] = [];
  /** Telemetry: boss_id captured when arena lock engages so clear event matches start. */
  private bossLockId = '';
  private bossLockLevelId = '';

  // Tutorial hints
  private tutorialHint!: TutorialHint;
  private uiController!: WorldUiController;
  private transitionController!: WorldTransitionController;
  private playerSpawnLevelId = '';

  // Toast, damage numbers & Sakurai hit effects
  private toast!: ToastManager;
  private dmgNumbers!: DamageNumberManager;
  private hitSparks!: HitSparkManager;
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
  private relicAuraBurst!: RelicAuraBurstManager;
  private savepointPulse!: SavepointPulseManager;
  private lowHpVignette!: LowHpVignetteManager;
  private screenFlash!: ScreenFlash;

  // Game Over
  private gameOverOverlay: Container | null = null;
  private gameOverActive = false;

  // Portal system
  private portals: Portal[] = [];
  private altars: Altar[] = [];
  private portalTransition: PortalTransition | null = null;
  private pendingPortalData: { rarity: Rarity; sourceType: PortalSourceType; sourceItem?: ItemInstance } | null = null;
  private altarSelectActive = false;
  private altarSelectIndex = 0;
  private activeAltar: Altar | null = null;
  private altarUI: Container | null = null;
  /** When set, anvil UI is showing a re-dive confirmation for this cleared item. */
  private cyclePromptItem: ItemInstance | null = null;
  private cyclePromptUI: Container | null = null;

  // Oxygen HUD
  private oxygenOverlay: Graphics | null = null;
  private oxygenBar: Graphics | null = null;

  // Anvil + Floor Collapse system
  private anvil: Anvil | null = null;
  private anvilPrompt: Container | null = null;
  private floorCollapse: FloorCollapse | null = null;
  private screenCrack: ScreenCrack | null = null;
  private memoryDive: MemoryDive | null = null; // ARCHIVED — kept for type compat
  private diveTransitionActive = false;
  private collapseItem: ItemInstance | null = null;

  // Sacred Pickup ??weapon pickup cutscene + lore popup + dive preview.
  private lorePopup: LorePopup | null = null;
  /** Item awaiting its LorePopup (set by sacredPickupFlow, consumed once pulse finishes). */
  private lorePopupItem: ItemInstance | null = null;
  /** Item currently displayed by LorePopup (used by confirm key handler). */
  private activeLorePopupItem: ItemInstance | null = null;
  private divePreview: DivePreview | null = null;
  private activeWeaponPulse: WeaponPulse | null = null;
  private activeAnvilTether: AnvilTether | null = null;
  private pickupZoomOverride = 1.0;
  /** LDtk iid of the currently-spawned anvil (null when no anvil exists). */
  private currentAnvilIid: string | null = null;
  /**
   * Snapshot of the used anvil's position so the player can be returned next
   * to it after clearing the item world, even though the anvil itself is
   * gone by then.
   */
  private lastUsedAnvilPos: { x: number; y: number; width: number; height: number } | null = null;
  /** True while player is inside an ItemTunnel level, heading to Item World. */
  private inItemTunnel = false;
  /** The level to return to after exiting Item World via tunnel. */
  private preTunnelLevelId: string | null = null;
  /** True while inside a fixed (hand-crafted) item world level. */
  private inFixedItemWorld = false;
  private fixedItemWorldItem: ItemInstance | null = null;

  // Debug: Shift+U UI mockup toggle
  private debugUIHidden = false;
  private debugHudMockup: Sprite | null = null;

  // Level tracking
  private visitedLevels: Set<string> = new Set(); // entered at least once ??revealed on minimap
  private clearedLevels: Set<string> = new Set();
  private collectedItems: Set<string> = new Set();
  private collectedRelics: Set<string> = new Set();
  private relicMarkers: Array<{ gfx: Graphics; abilityName: string; relicKey: string }> = [];
  private lockedDoors: LockedDoor[] = [];
  private switches: Switch[] = [];
  private growingWalls: GrowingWall[] = [];
  private crackedFloors: CrackedFloor[] = [];
  private secretWalls: SecretWall[] = [];
  private spikes: Spike[] = [];
  // Updraft: IntGrid value 4 ??handled in applyUpdrafts()
  private updraftSystem!: UpdraftSystem;
  // Breakable tile (IntGrid 9) hit tracking ??3 hits to destroy
  private breakableHits: Map<string, number> = new Map();
  private breakableHitThisSwing: Set<string> = new Set();
  private breakableLastCombo = -1;
  private collapsingPlatforms: CollapsingPlatform[] = [];
  private healthShards: HealthShard[] = [];
  private healingPickups: HealingPickup[] = [];
  private goldPickups: GoldPickup[] = [];
  private gold = 0;
  private healthShardBonus = 0;

  // Ending sequence
  private endingTriggers: EndingTrigger[] = [];
  private ending!: EndingSequence;
  private savePoints: Array<{ x: number; y: number; gfx: Graphics; prompt?: Container }> = [];
  /**
   * Exit Light Bleed ??�?가?�자리의 ?�린 구간(?�웃 방이 ?�는 �???주황 글로우�?
   * ?�워 "?�곳??출구"?�는 공통 ?�각 ?�어�??�공?�다.
   * (Documents/Research/RoomTransition_Readability_Research.md A2)
   */
  private exitGlows: ExitGlow[] = [];
  /** Events that have been triggered globally (persists across level loads). */
  private unlockedEvents: Set<string> = new Set();

  // Dialogue / Lore triggers from LDtk entities
  private loreDisplay: LoreDisplay | null = null;
  private dialogueTriggers: Array<{
    x: number; y: number; w: number; h: number;
    lines: LoreLine[];
    triggerType: 'area' | 'interact';
    once: boolean;
    freezePlayer: boolean;
    eventName: string | null;
    active: boolean;    // player currently inside trigger zone
    fired: boolean;     // for once-only triggers
    cooldown: number;   // ms remaining before re-trigger (once=false only)
    prompt: Container | null;
  }> = [];

  /** Pattern D (proximity-interaction) ?�우?????�이�??�빌/?�단 ?�합 관�? */
  private proximity: ProximityRouter = new ProximityRouter();

  constructor(game: Game) {
    super(game);
    this.registerProximityHandlers();
  }

  /**
   * Pattern D ?�들???�록. ?�선?�위 규약:
   *   Altar(30) > Anvil(20) > SavePoint(10)
   * ?�들?�는 `this.*` �?closure �?참조?��?�??�등�?불요.
   */
  private registerProximityHandlers(): void {
    const anvil: ProximityInteraction = {
      label: 'Anvil',
      priority: 20,
      canInteract: () =>
        !!this.anvil && !this.anvil.used && !this.anvil.hasItem() &&
        !this.altarSelectActive &&
        this.anvil.overlaps(this.player.x, this.player.y, this.player.width, this.player.height),
      onInteract: () => this.openAnvilUI(),
    };
    const savePoint: ProximityInteraction = {
      label: 'SavePoint',
      priority: 10,
      canInteract: () => {
        if (this.altarSelectActive) return false;
        const pcx = this.player.x + this.player.width / 2;
        const pcy = this.player.y + this.player.height / 2;
        const RANGE = 32;
        for (const sp of this.savePoints) {
          if (Math.abs(pcx - sp.x) < RANGE && Math.abs(pcy - sp.y) < RANGE) return true;
        }
        return false;
      },
      onInteract: () => this.performSave(),
    };
    this.proximity.register(anvil);
    this.proximity.register(savePoint);
  }

  // ---------------------------------------------------------------------------
  // Scene lifecycle
  // ---------------------------------------------------------------------------

  async init(): Promise<void> {
    this.hitManager = new HitManager(this.game);
    this.dropRng = new PRNG(99999);

    // Detect the title→game fade handoff overlay BEFORE any UI is created.
    // When present, every HUD/minimap will be created hidden so nothing
    // leaks above the black fade during async init frames. The overlay
    // itself is picked up below for fade-out in update().
    const introHandoff = this.game.uiContainer.getChildByLabel(TITLE_FADE_OVERLAY_LABEL);
    const startHidden = introHandoff instanceof Graphics;
    if (startHidden) {
      this.introPhase = 'fadeIn';
    }

    // Fetch and parse LDtk project (multi-world ??pick Overworld)
    const json = await fetch(LDTK_PATH).then((r) => r.json()) as Record<string, unknown>;
    this.loader = new LdtkLoader();
    this.loader.load(json, LDTK_WORLD_IDS);

    // Builder world — separate loader so builder levels don't mix with navigation
    this.builderLoader = new LdtkLoader();
    this.builderLoader.load(json, BUILDER_WORLD_ID);

    // Load save or create fresh inventory
    const saveData = SaveManager.load();
    if (saveData) {
      this.inventory = SaveManager.loadInventory(saveData);
      this.unlockedEvents = new Set(saveData.unlockedEvents);
      this.collectedRelics = new Set(saveData.collectedRelics);
      this.collectedItems = new Set(saveData.collectedItems);
      this.visitedLevels = new Set(saveData.visitedLevels ?? []);
      this.clearedLevels = new Set(saveData.clearedLevels);
      this.gold = saveData.gold ?? 0;
      this.game.stats.playTimeMs = saveData.playtime;
    } else {
      // Empty start — the player begins unarmed. The Broken Sword is now
      // discovered as an ItemDrop inside the Giant Builder, which is what
      // triggers the first pickup cutscene and the [I] inventory pulse.
      this.inventory = new Inventory();
    }

    // Lazy-load only the tilesets this area needs. Driven by the Tileset
    // column of Content_System_Area_Palette.csv.  Additional tilesets are
    // loaded on demand when the player enters a new area.
    await ensureAreaTilesetsLoaded(WORLD_AREA_IDS as unknown as string[], this.atlases);

    // Pre-load ALL tilesets referenced by any layer in any level.
    // CSV-managed tilesets are already loaded above; this catches level-
    // specific overrides (builder_01, world_interior_01, etc.) so adding
    // a new tileset in LDtk never requires a code change.
    {
      const allTilesets = new Set<string>();
      const allLoaderIds = [
        ...this.loader.getLevelIds(),
        ...this.builderLoader.getLevelIds(),
      ];
      for (const id of allLoaderIds) {
        const level = this.loader.getLevel(id) ?? this.builderLoader.getLevel(id);
        if (!level) continue;
        const allTiles = [
          ...level.backgroundTiles,
          ...level.wallTiles,
          ...level.interiorTiles,
          ...level.shadowTiles,
          ...Object.values(level.extraTileLayers).flat(),
        ];
        for (const t of allTiles) {
          if (t.tilesetPath) allTilesets.add(t.tilesetPath);
        }
      }
      await Promise.all([...allTilesets]
        .filter((rel) => !this.atlases[rel])
        .map(async (rel) => {
          try {
            this.atlases[rel] = await Assets.load(`assets/${rel}`) as Texture;
          } catch { /* silently skip */ }
        }));
    }

    // Primary atlas kept for any legacy single-atlas paths.
    this.atlas =
      this.atlases['atlas/SunnyLand_by_Ansimuz-extended.png'] ??
      Object.values(this.atlases)[0];

    // Parallax background ??behind everything
    this.parallaxBG = new ParallaxBackground();
    this.container.addChild(this.parallaxBG.container);

    // LDtk renderer ??tiles only, no entity markers in production
    this.renderer = new LdtkRenderer();
    this.container.addChild(this.renderer.container);

    // Dead Cells-style palette swap filter ??production default.
    // Data-driven via Sheets/Content_System_Area_Palette.csv: rows for
    // "world_shaft_bg" / "world_shaft_wall" supply stops + depth/brightness
    // params. Atlas is a single shared GPU texture with one row per AreaID.
    // See: Documents/Research/DeadCells_GrayscalePalette_Research.md
    {
      const atlas = getAreaPaletteAtlas();
      const bgEntry = getAreaPalette('world_shaft_bg');
      const wallEntry = getAreaPalette('world_shaft_wall');
      const bgFilter = new PaletteSwapFilter({
        paletteTex: atlas.texture,
        rowCount: atlas.rowCount,
        row: getAreaPaletteRow(bgEntry.id),
        strength: 1.0,
        depthBias: bgEntry.depthBias,
        depthCenter: bgEntry.depthCenter,
        brightness: bgEntry.brightness,
        tint: bgEntry.tint,
      });
      this.bgPaletteFilter = bgFilter;
      const wallFilter = new PaletteSwapFilter({
        paletteTex: atlas.texture,
        rowCount: atlas.rowCount,
        row: getAreaPaletteRow(wallEntry.id),
        strength: 1.0,
        depthBias: wallEntry.depthBias,
        depthCenter: wallEntry.depthCenter,
        brightness: wallEntry.brightness,
        tint: wallEntry.tint,
      });
      this.wallPaletteFilter = wallFilter;
      this.naturalPaletteFilter = new PaletteSwapFilter({
        paletteTex: atlas.texture,
        rowCount: atlas.rowCount,
        row: getAreaPaletteRow(wallEntry.id),
        strength: 0.5,
        depthBias: wallEntry.depthBias,
        depthCenter: wallEntry.depthCenter,
        brightness: wallEntry.brightness,
        tint: wallEntry.tint,
      });
      const rimFilter = new RimLightFilter({ color: 0xff6633, alpha: 1.0, thickness: 3 });
      this.wallRimFilter = rimFilter;
      const interiorFilter = new PaletteSwapFilter({
        paletteTex: atlas.texture,
        rowCount: atlas.rowCount,
        row: getAreaPaletteRow(bgEntry.id),
        strength: 1.0,
        depthBias: bgEntry.depthBias,
        depthCenter: bgEntry.depthCenter,
        brightness: (bgEntry.brightness ?? 1.0) * 0.65,
        tint: bgEntry.tint,
      });
      this.interiorPaletteFilter = interiorFilter;
      this.renderer.bgLayer.filters = [bgFilter];
      this.renderer.wallLayer.filters = [wallFilter, rimFilter];
      this.renderer.interiorLayer.filters = [interiorFilter];
      this.renderer.shadowLayer.filters = [wallFilter];

      // Builder-specific palette filters — same atlas, different rows.
      // Lets the giant builder body read as cool steel against the warm
      // crimson shaft. Rim filter stays shared so the orange forge glow
      // still highlights the builder's silhouette.
      const builderBgEntry = getAreaPalette('world_shaft_builder_bg');
      const builderWallEntry = getAreaPalette('world_shaft_builder_wall');
      this.builderBgPaletteFilter = new PaletteSwapFilter({
        paletteTex: atlas.texture,
        rowCount: atlas.rowCount,
        row: getAreaPaletteRow(builderBgEntry.id),
        strength: 1.0,
        depthBias: builderBgEntry.depthBias,
        depthCenter: builderBgEntry.depthCenter,
        brightness: builderBgEntry.brightness,
        tint: builderBgEntry.tint,
      });
      this.builderWallPaletteFilter = new PaletteSwapFilter({
        paletteTex: atlas.texture,
        rowCount: atlas.rowCount,
        row: getAreaPaletteRow(builderWallEntry.id),
        strength: 1.0,
        depthBias: builderWallEntry.depthBias,
        depthCenter: builderWallEntry.depthCenter,
        brightness: builderWallEntry.brightness,
        tint: builderWallEntry.tint,
      });
      // Builder interior intentionally keeps the full BG brightness (no
      // dampening multiplier the host uses) so the forge-orange interior
      // reads as a hot core rather than a recessed shadow.
      this.builderInteriorPaletteFilter = new PaletteSwapFilter({
        paletteTex: atlas.texture,
        rowCount: atlas.rowCount,
        row: getAreaPaletteRow(builderBgEntry.id),
        strength: 1.0,
        depthBias: builderBgEntry.depthBias,
        depthCenter: builderBgEntry.depthCenter,
        brightness: builderBgEntry.brightness,
        tint: builderBgEntry.tint,
      });
      this.builderNaturalPaletteFilter = new PaletteSwapFilter({
        paletteTex: atlas.texture,
        rowCount: atlas.rowCount,
        row: getAreaPaletteRow(builderWallEntry.id),
        strength: 0.5,
        depthBias: builderWallEntry.depthBias,
        depthCenter: builderWallEntry.depthCenter,
        brightness: builderWallEntry.brightness,
        tint: builderWallEntry.tint,
      });
    }

    // Entity layer (enemies, drops, portals, altars)
    this.entityLayer = new Container();
    this.container.addChild(this.entityLayer);

    // Updraft system (shared physics + particles)
    this.updraftSystem = new UpdraftSystem(this.entityLayer);

    // Player
    this.player = new Player(this.game);
    this.player.onFlaskHeal = (amount) => {
      this.screenFlash.flash(0x44ff44, 0.3, 150);
      this.dmgNumbers.spawnSpecial(
        this.player.x + this.player.width / 2,
        this.player.y - 16,
        `+${amount}`, 0x44ff44,
      );
      // VFX: healing burst
      this.flaskBurst.spawn(
        this.player.x + this.player.width / 2,
        this.player.y + this.player.height / 2,
        Math.min(1, amount / Math.max(1, this.player.maxHp * 0.4)),
      );
    };
    this.entityLayer.addChild(this.player.container);
    if (saveData) {
      this.player.hp = saveData.player.hp;
      this.player.maxHp = saveData.player.maxHp;
      this.player.abilities.dash = saveData.abilities.dash;
      this.player.abilities.diveAttack = saveData.abilities.diveAttack ?? false;
      this.player.abilities.surge = saveData.abilities.surge ?? false;
      this.player.abilities.waterBreathing = saveData.abilities.waterBreathing ?? false;
      this.player.abilities.wallJump = saveData.abilities.wallJump;
      this.player.abilities.doubleJump = saveData.abilities.doubleJump;
      this.player.abilities.cheat = saveData.abilities.cheat ?? false;
      this.healthShardBonus = saveData.healthShardBonus ?? 0;
    }
    this.updatePlayerAtk();

    // Fade overlay ??on stage (camera-independent) so it always covers the full screen
    this.fadeOverlay = new Graphics();
    this.fadeOverlay.rect(0, 0, GAME_WIDTH, GAME_HEIGHT).fill(0x000000);
    this.fadeOverlay.alpha = 0;
    this.game.legacyUIContainer.addChild(this.fadeOverlay);

    // HUD
    this.hud = new HUD(this.game.uiScale);
    this.game.uiContainer.addChild(this.hud.container);
    // Hide HUD immediately during the intro sequence so it can't flash above
    // the fade overlay while async init is still running. Revealed after
    // the area title completes.
    if (startHidden) this.hud.container.visible = false;

    // Area title banner — Elden Ring style. Rides on legacyUIContainer so it
    // inherits uiScale with the rest of the overlay UI.
    this.areaTitle = new AreaTitle();
    this.game.legacyUIContainer.addChild(this.areaTitle.container);

    // Load & apply UI skin (async, non-blocking)
    const hudSkin = new UISkin();
    this.uiSkin = hudSkin;
    hudSkin.load().then(() => this.hud.applySkin(hudSkin));

    // Controls overlay (disabled)
    // this.controlsOverlay = new ControlsOverlay();
    // this.game.legacyUIContainer.addChild(this.controlsOverlay.container);

    // Toast, damage numbers, hit sparks, screen flash
    this.toast = new ToastManager(this.game.legacyUIContainer);
    this.dmgNumbers = new DamageNumberManager(this.game.uiContainer, this.game.camera, this.game.uiScale);
    this.hitSparks = new HitSparkManager(this.entityLayer);
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
    this.relicAuraBurst = new RelicAuraBurstManager(this.entityLayer);
    this.savepointPulse = new SavepointPulseManager(this.entityLayer);
    this.lowHpVignette = new LowHpVignetteManager(this.game.legacyUIContainer);
    this.lowHpVignette.setViewport(GAME_WIDTH, GAME_HEIGHT);
    this.screenFlash = new ScreenFlash();
    this.game.legacyUIContainer.addChild(this.screenFlash.overlay);

    // Pause menu (9-slice from UISkin)
    this.pauseMenu = new PauseMenu(this.uiSkin);
    this.pauseMenu.onAction = (action) => {
      if (action === 'continue') { this.isPaused = false; }
      else if (action === 'status') { this.openCharacterStats(); }
      else if (action === 'quit_confirmed') {
        this.isPaused = false;
        import('./TitleScene').then(({ TitleScene }) => {
          this.game.sceneManager.replace(new TitleScene(this.game));
        });
      }
    };
    this.game.legacyUIContainer.addChild(this.pauseMenu.container);

    // Character stats overlay (opened from pause menu STATUS)
    this.characterStats = new CharacterStats(this.uiSkin);
    this.characterStats.onVisibilityChanged = (vis) => {
      this.hud.container.visible = !vis;
      if (this.minimap) this.minimap.visible = !vis;
    };
    this.game.legacyUIContainer.addChild(this.characterStats.container);

    // Death screen
    this.deathScreen = new DeathScreen(this.uiSkin);
    this.deathScreen.onRespawn = () => {
      // Reload from last save point
      this.loadLevel(this.playerSpawnLevelId, 'down');
      this.player.hp = this.player.maxHp;
    };
    this.game.legacyUIContainer.addChild(this.deathScreen.container);

    // Tutorial hints
    this.tutorialHint = new TutorialHint(this.game.input, this.game.legacyUIContainer);

    // Ending sequence
    this.ending = new EndingSequence({
      uiContainer: this.game.legacyUIContainer,
      camera: this.game.camera,
      input: this.game.input,
    });

    // Inventory UI
    this.inventoryUI = new InventoryUI(this.inventory);
    this.inventoryUI.setSkin(this.uiSkin!);
    this.game.legacyUIContainer.addChild(this.inventoryUI.container);

    // Sacred Pickup ??LorePopup + DivePreview sit in the legacy UI layer so
    // they render above gameplay but under debug overlays.
    this.lorePopup = new LorePopup(this.uiSkin);
    this.game.legacyUIContainer.addChild(this.lorePopup.container);
    this.loreDisplay = new LoreDisplay(this.game.input);
    this.game.legacyUIContainer.addChild(this.loreDisplay.container);
    this.divePreview = new DivePreview(this.uiSkin);
    this.game.legacyUIContainer.addChild(this.divePreview.container);

    // World Map overlay
    this.worldMap = new WorldMapOverlay(this.uiSkin);
    this.worldMap.setLoader(this.loader);
    this.worldMap.setRooms(this.loader.getWorldMap().filter(r => !r.id.startsWith('Debug_')));
    this.game.legacyUIContainer.addChild(this.worldMap.container);

    this.transitionController = new WorldTransitionController();
    this.uiController = new WorldUiController(this.game, {
      hud: this.hud,
      pauseMenu: this.pauseMenu,
      deathScreen: this.deathScreen,
      tutorialHint: this.tutorialHint,
      inventoryUI: this.inventoryUI,
      worldMap: this.worldMap,
      toast: this.toast,
      minimap: this.minimap,
      fadeOverlay: this.fadeOverlay,
    });

    // Stash the handoff overlay for the fade-out tween in update().
    // (introPhase was already set at the top of init() via startHidden.)
    if (introHandoff instanceof Graphics) {
      this.titleFadeInOverlay = introHandoff;
      this.titleFadeInTimer = 0;
    }

    // Spawn level ??saved level or default Player entity level
    if (saveData && saveData.levelId) {
      this.playerSpawnLevelId = saveData.levelId;
    } else {
      this.playerSpawnLevelId = this.findPlayerSpawnLevel();
    }
    this.loadLevel(this.playerSpawnLevelId, 'down');

    // If loading from save, snap player to save point
    if (saveData && this.savePoints.length > 0) {
      this.snapPlayerToSavePoint();
    }

    this.initialized = true;
    // Controls guidance handled by tutorialHint.tryShow('hint_combat') in
    // update() ??fires once per session with auto-dismiss. No unconditional
    // toast here so returning from item world doesn't re-spam controls.
  }

  enter(): void {
    this.container.visible = true;
    // Area banner is triggered from loadLevel on Shaft_01 entry (not here).
    // On pop return from sub-scenes (ItemWorld) the current level is still
    // the one the player left from, so no banner replay is needed.
    this.uiController.enter({
      showMinimap: !this.inItemTunnel,
      goldBelowMinimap: !this.inItemTunnel,
      playerHp: this.player.hp,
      playerMaxHp: this.player.maxHp,
      highlightItemKey:
        this.unlockedEvents.has('__itemWorldTutorialDone')
        && !this.unlockedEvents.has('__itemKeyPressedAfterItemWorld'),
    });
    // Hide HUD + minimap until the Shaft_01 area title completes. Covers
    // both the initial intro ('fadeIn') and the post-fade 'title' waiting
    // state (player may roam non-Shaft rooms before first entering Shaft_01).
    if (this.introPhase === 'fadeIn' || this.introPhase === 'title') {
      this.hud.container.visible = false;
      if (this.minimap) this.minimap.visible = false;
    }
    if (!this.currentLevel) return; // first init ??loadLevel handles setup

    // Clean up dive/collapse effect
    if (this.memoryDive) {
      this.memoryDive.destroy();
      this.memoryDive = null;
    }
    if (this.floorCollapse) {
      this.floorCollapse.destroy();
      this.floorCollapse = null;
    }

    // Re-sync collision grid and tilemap (deep copy to restore original state)
    this.collisionGrid = this.currentLevel.collisionGrid.map(row => [...row]);
    this.player.roomData = this.collisionGrid;
    this.rerenderTilemap();

    this.updatePlayerAtk();
    this.game.camera.snap(
      this.player.x + this.player.width / 2,
      this.player.y + this.player.height / 2,
    );
  }

  private detachSharedUiForItemWorld(): void {
    this.uiController.detachForItemWorld();
    if (this.altarUI?.parent) {
      this.altarUI.parent.removeChild(this.altarUI);
    }
  }

  private initialized = false;

  update(dt: number): void {
    // Guard: init() is async ??game loop may call update() before it completes
    if (!this.initialized || !this.currentLevel) return;

    // Title→game fade-in handoff overlay.
    if (this.titleFadeInOverlay) {
      this.titleFadeInTimer += dt;
      const t = Math.min(1, this.titleFadeInTimer / this.TITLE_FADE_IN_MS);
      this.titleFadeInOverlay.alpha = 1 - t;
      if (t >= 1) {
        this.titleFadeInOverlay.parent?.removeChild(this.titleFadeInOverlay);
        this.titleFadeInOverlay.destroy();
        this.titleFadeInOverlay = null;
        // Screen is now visible. Flush any queued area title and advance to
        // the waiting-for-title phase. HUD stays hidden until the Shaft_01
        // title actually completes (see edge detector below).
        if (this.introPhase === 'fadeIn') {
          this.introPhase = 'title';
          if (this.pendingAreaTitle) {
            this.areaTitle.show(this.pendingAreaTitle);
            this.pendingAreaTitle = null;
          }
        }
      }
    }

    // HUD reveal: fires the frame an area title transitions active→inactive
    // while HUD is still hidden. This is the moment the player finishes
    // watching "THE SHAFT" (or any future intro banner) and gameplay UI
    // should appear. If the player spawns outside Shaft_01, HUD stays
    // hidden until they walk in and trigger the banner via loadLevel.
    const areaTitleActive = this.areaTitle.isActive;
    if (
      this.wasAreaTitleActive &&
      !areaTitleActive &&
      this.introPhase === 'title'
    ) {
      this.hud.container.visible = true;
      if (this.minimap && !this.inItemTunnel) this.minimap.visible = true;
      this.introPhase = 'done';
    }
    this.wasAreaTitleActive = areaTitleActive;

    // Ending sequence active ??block everything
    if (this.ending.isActive) {
      this.ending.update(dt);
      if (this.ending.isDone) {
        this.game.camera.setZoom(1.0);
        this.game.camera.clearBounds();
        // Reset save on ending completion
        SaveManager.deleteSave();
        import('./TitleScene').then(({ TitleScene }) => {
          this.game.sceneManager.replace(new TitleScene(this.game));
        });
      }
      return;
    }

    // Character stats overlay (blocks all input while open)
    if (this.characterStats.visible) {
      if (this.game.input.isJustPressed(GameAction.STATUS) ||
          this.game.input.isJustPressed(GameAction.MENU) ||
          this.game.input.isJustPressed(GameAction.JUMP) ||
          this.game.input.isJustPressed(GameAction.DASH)) {
        this.characterStats.hide();
      }
      return;
    }

    // TAB key → open character stats (same pattern as I=inventory, M=map)
    if (this.game.input.isJustPressed(GameAction.STATUS)) {
      this.game.input.consumeJustPressed(GameAction.STATUS);
      this.openCharacterStats();
      return;
    }

    const pauseOrDeath = this.uiController.handlePauseAndDeath({
      dt,
      canOpenPause: !this.inventoryUI.visible && !this.worldMap.visible && !(this.lorePopup as any)?.visible,
      onPauseOpened: () => { this.isPaused = true; },
      onPauseClosed: () => { this.isPaused = false; },
    });
    if (pauseOrDeath !== 'none') {
      return;
    }

    // Dialogue / Lore display — blocks gameplay while active
    if (this.loreDisplay?.isActive) {
      this.loreDisplay.update(dt);
      this.player.savePrevPosition();
      this.game.camera.update(dt);
      return;
    }

    // Toast & tutorial hints update after gameplay input is processed
    this.uiController.updatePersistent(dt);

    // Sacred Pickup cutscene + LorePopup + DivePreview. When blocking, abort
    // gameplay input for this frame (player stays put, camera override still
    // applied below).
    const sacredBlocking = this.updateSacredPickup(dt);
    if (sacredBlocking) {
      // T2 cutscene drives camera zoom via onZoom callback.
      if (this.activeWeaponPulse?.isBlocking) {
        this.game.camera.setZoom(this.pickupZoomOverride);
      }
      this.game.camera.update(dt);
      this.hitSparks.update(dt);
      this.screenFlash.update(dt);
      // Keep LoreDisplay alive during sacred pickup blocking (Ego T01 dialogue)
      if (this.loreDisplay?.isActive) {
        this.loreDisplay.update(dt);
      }
      return;
    }

    // Tutorial hints ??only show after dialogue finishes
    if (this.currentLevel?.identifier === this.playerSpawnLevelId) {
      // hint removed ??key prompts shown in HUD
    }

    // Portal transition playing
    if (this.portalTransition) {
      this.portalTransition.update(dt);
      this.game.camera.update(dt);
      if (this.portalTransition.isDone) {
        this.completePendingPortalEntry();
      }
      return;
    }

    // Dive transition in progress — all input blocked
    if (this.diveTransitionActive) {
      this.hitSparks.update(dt);
      this.screenFlash.update(dt);
      return;
    }

    // Screen crack effect update
    if (this.screenCrack && !this.screenCrack.isDone) {
      this.screenCrack.update(dt);
    }

    // Floor collapse in progress ??all input blocked, camera frozen
    if (this.floorCollapse && this.floorCollapse.phase !== 'idle') {
      this.floorCollapse.update(dt);

      const ph = this.floorCollapse.phase;
      if (ph === 'anvil_fall' || ph === 'fade_out' || ph === 'done') {
        // 충돌 무시 ???�레?�어가 ?�면 밖으�??�유 ?�하 (?�연?�러??중력)
        if (this.player.vy == null || this.player.vy === 0) this.player.vy = 0.5;
        this.player.vy = this.player.vy + 0.02 * dt;
        this.player.y += this.player.vy * (dt / 16.67);
      }

      if (this.floorCollapse.shouldTransition) {
        this.completeFloorCollapseEntry();
        return;
      }

      this.hitSparks.update(dt);
      this.screenFlash.update(dt);
      return;
    }

    // Game Over state
    if (this.gameOverActive) {
      if (
        this.game.input.isJustPressed(GameAction.ATTACK) ||
        this.game.input.isJustPressed(GameAction.JUMP)
      ) {
        this.respawnPlayer();
      }
      return;
    }

    // Altar selection UI (anvil now uses the unified InventoryUI in anvil mode)
    if (this.altarSelectActive) {
      this.updateAltarInput();
      return;
    }

    // World Map toggle (M key) ??disabled inside item tunnels
    this.uiController.handleWorldMapToggle({
      canToggle: !this.inItemTunnel,
      onBeforeOpen: () => {
        this.worldMap.setExplorationState(this.visitedLevels, this.currentLevel?.identifier ?? '');
        this.worldMap.setMarkers(this.collectMapMarkers());
        if (this.currentLevel) {
          this.worldMap.setPlayerPosition(
            this.player.x + this.currentLevel.worldX,
            this.player.y + this.currentLevel.worldY,
          );
        }
      },
    });
    if (this.worldMap.visible && this.currentLevel) {
      this.uiController.updateWorldMap({
        dt,
        playerWorldX: this.player.x + this.currentLevel.worldX,
        playerWorldY: this.player.y + this.currentLevel.worldY,
      });
    }

    // Inventory UI toggle ??disabled inside item tunnels, Shift+I is debug
    this.uiController.handleInventoryToggle({
      canToggle: !this.inItemTunnel && !this.game.input.shiftDown,
      onToggled: () => {
        // Clear the [I] pulse on first inventory open. The pulse can be
        // raised by either the first pickup (Broken Sword) or returning
        // from an Item World, so the original __itemWorldTutorialDone
        // gate is no longer required here.
        if (!this.unlockedEvents.has('__itemKeyPressedAfterItemWorld')) {
          this.unlockedEvents.add('__itemKeyPressedAfterItemWorld');
          this.hud.setItemKeyHighlight(false);
        }
      },
    });

    if (this.inventoryUI.visible) {
      // Re-dive confirmation prompt overlays the inventory (anvil mode only)
      if (this.cyclePromptItem) {
        this.updateCyclePromptInput();
        return;
      }
      const inventoryResult = this.uiController.handleInventoryInput();
      if (inventoryResult === 'confirmed_equipment_change') {
        this.updatePlayerAtk();
        this.hud.updateATK(this.player.atk);
      }
      return; // Pause game while inventory open
    }

    // Room transition fade
    if (this.transitionState !== 'none') {
      this.updateTransition(dt);

      if (this.transitionState as string !== 'none') return;
      // Transition just ended
      this.postTransitionSnapFrames = 15; // ~250ms snap after fade ends
      this.player.savePrevPosition();
      for (const e of this.enemies) e.savePrevPosition();
      return;
    }

    // Pattern D (proximity-interaction): ?�이�??�빌/?�단 ?�력 ?�점.
    // 반드??player.update() ?�에 ?�행?�어??같�? ?�레???�스??방�???
    // ?�들???�록?� registerProximityHandlers() 참조.
    if (this.proximity.tryInteract(this.game.input)) return;

    // Giant Builder — moving platform pattern.
    //   Builder container.y moves sub-pixel smooth (visual continuity).
    //   Stamp position is tile-aligned (physics stability) and only changes
    //   when the builder crosses a tile boundary. The player is carried
    //   only on tile crossings, by a whole TILE amount (prevents jitter).
    //   The visual sub-pixel remainder is applied to the player as a render
    //   offset so they appear glued to the builder smoothly.
    if (this.activeBuilder) {
      // Stamp math MUST mirror stampBuilder(), which reads container.y
      // (integer). Using posY (float) here would disagree at the half-pixel
      // boundary where Math.round flips, producing a "stamp jumped but
      // player wasn't carried" frame that looks like a jump in place.
      const prevStampY = Math.round(this.activeBuilder.container.y / 16) * 16;
      this.activeBuilder.update(dt);
      const newStampY = Math.round(this.activeBuilder.container.y / 16) * 16;
      const stampDelta = newStampY - prevStampY;
      if (this.playerOnBuilder && stampDelta !== 0) {
        this.player.y += stampDelta;
        // Keep interpolation consistent so the carry doesn't flicker.
        this.player.prevY += stampDelta;
      }
      this.unstampBuilder();
      this.stampBuilder();
      this.syncBuilderAttachments();

      // Cinematic builder (Shaft_01) — emit camera shakes to sell the weight
      // of the descent. Rhythmic "쿵" every two tile crossings while moving,
      // then a single heavy "쿠웅" on the frame the builder comes to rest.
      if (this.activeBuilderMode === 'cinematic') {
        const nowMoving = this.activeBuilder.isMoving;
        if (nowMoving && stampDelta !== 0) {
          this.builderStepCounter++;
          if (this.builderStepCounter % 2 === 0) {
            this.game.camera.shake(3);
          }
        }
        if (this.builderWasMoving && !nowMoving) {
          this.game.camera.shake(9);
          this.builderStepCounter = 0;
        }
        this.builderWasMoving = nowMoving;
      }
    }

    // Player
    this.player.update(dt);

    // After physics: is the player now grounded on a builder-stamped tile?
    this.playerOnBuilder = this.activeBuilder ? this.isPlayerOnBuilderStamp() : false;

    // Volume check: is the player's AABB inside the builder's rectangle?
    // (includes airborne — used for camera override that must persist on jump.)
    this.playerInBuilder = this.activeBuilder ? this.isPlayerInBuilderVolume() : false;

    // Visual sync: while riding, mirror the builder's render offset from its
    // tile-aligned stamp. Use container.y (integer) so the offset matches
    // exactly what stampBuilder() sees — the player visual steps in lockstep
    // with the builder visual, no subpixel disagreement.
    if (this.playerOnBuilder && this.activeBuilder) {
      const by = this.activeBuilder.container.y;
      this.player.visualYOffset = by - Math.round(by / 16) * 16;
    } else {
      this.player.visualYOffset = 0;
    }

    // Check drowning
    if (this.player.drowned && !this.gameOverActive) {
      this.player.hp = 0;
      this.player.lastDamageSource = 'drown';
      this.player.onDeath();
      this.game.hitstopFrames = 8;
      this.screenFlash.flashDamage(true);
      trackPlayerDeath({
        area: 'world',
        level_id: this.currentLevel?.identifier ?? this.playerSpawnLevelId,
        room_col: Math.floor((this.player.x + this.player.width / 2) / TILE_SIZE),
        room_row: Math.floor((this.player.y + this.player.height / 2) / TILE_SIZE),
        enemy_type: 'drown',
      });
      this.showGameOver();
      return;
    }

    // Check player death
    if (this.player.isDead && !this.gameOverActive) {
      trackPlayerDeath({
        area: 'world',
        level_id: this.currentLevel?.identifier ?? this.playerSpawnLevelId,
        room_col: Math.floor((this.player.x + this.player.width / 2) / TILE_SIZE),
        room_row: Math.floor((this.player.y + this.player.height / 2) / TILE_SIZE),
        enemy_type: this.player.lastDamageSource,
      });
      this.showGameOver();
      return;
    }

    // Update enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      const wasAlive = enemy.alive;
      enemy.update(dt);

      // Track which enemies were alive before combat resolution
      if (wasAlive && !enemy.alive) {
        // died during enemy.update() (e.g. DOT) ??handle drop now
        this.handleEnemyKill(enemy);
      }

      if (enemy.shouldRemove) {
        if (enemy.container.parent) enemy.container.parent.removeChild(enemy.container);
        this.enemies.splice(i, 1);
      }
    }

    // Player attacks ??Sakurai full feedback chain
    if (this.player.isAttackActive()) {
      const targets = this.enemies.filter((e) => e.alive) as CombatEntity[];
      const hits = this.hitManager.checkHits(
        this.player,
        this.player.comboIndex,
        this.player.hitList,
        targets,
      );
      for (const hit of hits) {
        this.dmgNumbers.spawn(hit.hitX, hit.hitY - 8, hit.damage, hit.heavy, hit.critical);
        this.hitSparks.spawn(hit.hitX, hit.hitY, hit.heavy, hit.dirX);
        if (hit.critical) this.criticalHighlight.spawn(hit.hitX, hit.hitY);
        if (hit.heavy) {
          this.screenFlash.flashHit(true);
          this.comboFinisherBurst.spawn(hit.hitX, hit.hitY, hit.dirX);
        }
      }
      // Check kills after combat resolution
      for (const enemy of this.enemies) {
        if (!enemy.alive && !enemy.shouldRemove && !(enemy as any).__killHandled) {
          (enemy as any).__killHandled = true;
          this.handleEnemyKill(enemy);
        }
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

    // Update projectiles ??player attack can destroy them
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
          const hitX = this.player.x + this.player.width / 2;
          const hitY = this.player.y + this.player.height * 0.4;
          this.dmgNumbers.spawn(hitX, hitY - 8, dmg, false);
          this.hitSparks.spawn(hitX, hitY, false, -dir);
          this.dmgNumbers.spawn(hitX, hitY - 8, dmg, false);
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

    // Enemy contact damage ??all enemies deal damage on body overlap
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

      // Sakurai feedback: victim vibrates, flash, directional shake
      this.player.startVibrate(4, 5, this.player.vy === 0);
      this.player.triggerFlash();
      this.game.hitstopFrames = 3;
      this.game.camera.shakeDirectional(3, -dir, -0.3);
      this.screenFlash.flashDamage(dmg > 20);

      // Damage number on player
      const hitX = this.player.x + this.player.width / 2;
      const hitY = this.player.y + this.player.height * 0.4;
      this.dmgNumbers.spawn(hitX, hitY - 8, dmg, false);

      // Hit spark at player position
      this.hitSparks.spawn(hitX, hitY, false, dir);

      if (this.player.hp <= 0) {
        this.player.hp = 0;
        this.player.onDeath();
        this.game.hitstopFrames = 8;
        this.screenFlash.flashDamage(true);
      }
      break; // one hit per frame
    }

    // Gold pickups
    for (let i = this.goldPickups.length - 1; i >= 0; i--) {
      const gp = this.goldPickups[i];
      if (gp.collected) continue;
      gp.update(dt);
      const dx = Math.abs((this.player.x + this.player.width / 2) - (gp.x + gp.width / 2));
      const dy = Math.abs((this.player.y + this.player.height / 2) - (gp.y + gp.height / 2));
      if (dx < 16 && dy < 16) {
        // LDtk-placed pickups have _key for permanent collection state.
        // Monster drops have no _key ??collected once on pickup but not persisted.
        const key = (gp as any)._key as string | undefined;
        if (key) this.collectedItems.add(key);
        gp.collect();
        this.gold += gp.amount;
        this.dmgNumbers.spawnEXP(gp.x + gp.width / 2, gp.y - 16, `+${gp.amount} G`);
        gp.destroy();
        this.goldPickups.splice(i, 1);
      }
    }

    // Healing pickups
    for (let i = this.healingPickups.length - 1; i >= 0; i--) {
      const hp = this.healingPickups[i];
      if (hp.collected) continue;
      hp.update(dt);
      const dx = Math.abs((this.player.x + this.player.width / 2) - (hp.x + hp.width / 2));
      const dy = Math.abs((this.player.y + this.player.height / 2) - (hp.y + hp.height / 2));
      if (dx < 16 && dy < 16) {
        const key = (hp as any)._key as string | undefined;
        if (key) this.collectedItems.add(key);
        hp.collect();
        const healed = Math.min(hp.healAmount, this.player.maxHp - this.player.hp);
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + hp.healAmount);
        this.screenFlash.flash(0x44ff44, 0.3, 150);
        this.toast.show(`HP +${healed}`, 0x44ff44);
        hp.destroy();
        this.healingPickups.splice(i, 1);
      }
    }

    // Health Shard pickups
    for (let i = this.healthShards.length - 1; i >= 0; i--) {
      const shard = this.healthShards[i];
      if (shard.collected) continue;
      shard.update(dt);
      const dx = Math.abs((this.player.x + this.player.width / 2) - (shard.x + shard.width / 2));
      const dy = Math.abs((this.player.y + this.player.height / 2) - (shard.y + shard.height / 2));
      if (dx < 16 && dy < 16) {
        const key = (shard as any)._key as string;
        this.collectedRelics.add(key);
        shard.collect();
        this.healthShardBonus += shard.hpBonus;
        this.updatePlayerAtk(); // recalc maxHp with shard bonus
        this.player.hp = this.player.maxHp; // full heal on pickup
        this.game.hitstopFrames = 8;
        this.screenFlash.flash(0xff4488, 0.4, 200);
        this.game.camera.shake(4);
        this.toast.showBig(`MAX HP +${shard.hpBonus}`, 0xff4488);
        shard.destroy();
        this.healthShards.splice(i, 1);
      }
    }

    // Ability Relic pickups
    for (let i = this.relicMarkers.length - 1; i >= 0; i--) {
      const { gfx, abilityName, relicKey } = this.relicMarkers[i];
      const dx = Math.abs((this.player.x + this.player.width / 2) - gfx.x);
      const dy = Math.abs((this.player.y + this.player.height / 2) - gfx.y);
      if (dx < 16 && dy < 16) {
        this.collectedRelics.add(relicKey);
        trackRelicAcquire(abilityName, this.currentLevel?.identifier);
        if (abilityName === 'dash') {
          this.player.abilities.dash = true;
          this.toast.showBig('Dash unlocked!', 0xffd700);
        } else if (abilityName === 'diveAttack') {
          this.player.abilities.diveAttack = true;
          this.toast.showBig('Dive Attack unlocked!', 0xffd700);
        } else if (abilityName === 'surge') {
          this.player.abilities.surge = true;
          this.toast.showBig('Counter-Current Surge unlocked!', 0xffd700);
        } else if (abilityName === 'waterBreathing') {
          this.player.abilities.waterBreathing = true;
          this.toast.showBig('Water Breathing unlocked!', 0x4488ff);
        } else if (abilityName === 'wallJump') {
          this.player.abilities.wallJump = true;
          this.toast.showBig('Wall Jump unlocked!', 0xffd700);
        } else if (abilityName === 'doubleJump') {
          this.player.abilities.doubleJump = true;
          this.toast.showBig('Double Jump unlocked!', 0xffd700);
        } else if (abilityName === 'cheat') {
          // DEC-010: ?�버�?치트 ?�릭.
          // Gate: Debug_ 방에 배치 ???debug URL ?�라미터 ?�이???�근 불�?.
          // ?�반 ?��??�게 ?�출?��? ?�음. 추�? gate 불필??
          this.player.abilities.cheat = true;
          this.updatePlayerAtk(); // re-applies +99999 via cheat branch
          this.player.hp = this.player.maxHp; // full heal to new cap
          this.toast.showBig('CHEAT: ATK/HP +99999', 0xff00ff);
        }
        this.game.hitstopFrames = 8;
        this.game.camera.shake(3);
        // Batch E: relic aura burst ??tinted per ability family
        const relicTint = abilityName === 'waterBreathing' ? 0x4488ff : 0xffd700;
        this.relicAuraBurst.spawn(gfx.x, gfx.y, relicTint);
        if (gfx.parent) gfx.parent.removeChild(gfx);
        this.relicMarkers.splice(i, 1);
      }
    }

    // Item pickups
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const drop = this.drops[i];
      drop.update(dt);
      if (drop.overlapsPlayer(this.player.x, this.player.y, this.player.width, this.player.height)) {
        if (this.inventory.add(drop.item)) {
          this.game.stats.itemsCollected++;
          this.toast.show(`Got ${drop.item.def.name} [${drop.item.rarity.toUpperCase()}]`, 0xffcc44);
          // hint removed
          const key = (drop as any)._itemKey as string | undefined;
          if (key) this.collectedItems.add(key);
          const pickedItem = drop.item;
          const pickupX = drop.x;
          const pickupY = drop.y;
          // Batch E: rarity-tinted pickup glow
          this.itemPickupGlow.spawn(pickupX, pickupY, getRarityConfig(pickedItem.rarity).fxTint);
          drop.destroy();
          this.drops.splice(i, 1);
          this.sacredPickupFlow(pickedItem, pickupX, pickupY);
        }
      }
    }

    // Level cleared
    const aliveCount = this.enemies.filter((e) => e.alive).length;
    if (aliveCount === 0) {
      const id = this.currentLevel.identifier;
      if (!this.clearedLevels.has(id)) {
        this.clearedLevels.add(id);
      }
    }

    // Dialogue / Lore triggers
    this.updateDialogueTriggers(dt);

    // ── Ego dialogue triggers (code-driven, not LDtk) ──
    this.updateEgoTriggers(dt);

    // Anvil interaction + attack hit detection
    this.updateAnvil(dt);

    // Locked door & switch attack detection + update
    this.checkAttackOnDoors();
    this.checkAttackOnSwitches();
    this.checkAttackOnCrackedFloors();
    this.checkAttackOnSecretWalls();
    this.checkAttackOnBreakables();
    for (const door of this.lockedDoors) door.update(dt);
    for (const wall of this.growingWalls) {
      wall.update(dt);
      // Pick up spawned slimes
      for (const slime of wall.pendingSlimes) {
        slime.roomData = this.collisionGrid;
        slime.target = this.player;
        this.enemies.push(slime);
        this.entityLayer.addChild(slime.container);
      }
      wall.pendingSlimes.length = 0;
    }

    // Dive attack landing ??area damage + cracked floor check
    if (this.player.diveLanded) {
      this.handleDiveLanding();
    }

    // Surge flight ??break walls/floors on contact
    if (this.player.surgeActive) {
      this.handleSurgeContact();
    }

    // Collapsing platforms ??check if player is standing on them
    for (let i = this.collapsingPlatforms.length - 1; i >= 0; i--) {
      const cp = this.collapsingPlatforms[i];
      const wasSolid = (cp as any).state !== 'collapsed' && (cp as any).state !== 'respawning';
      cp.update(dt);
      if (cp.isPlayerOnTop(this.player.x, this.player.y, this.player.width, this.player.height)) {
        cp.startShake();
      }
      // Save permanent collapse for non-respawning platforms
      const isCollapsed = (cp as any).state === 'collapsed';
      if (wasSolid && isCollapsed && !(cp as any)._respawns) {
        const key = (cp as any)._key as string;
        if (key) this.unlockedEvents.add(key);
        cp.destroy();
        this.collapsingPlatforms.splice(i, 1);
      }
    }

    // Spike hazard contact
    this.checkSpikeContact();

    // Updraft wind zones
    this.applyUpdrafts(dt);

    // Exit Light Bleed pulse + ?�레?�어 거리 기반 ?�께 ?�장.
    if (this.exitGlows.length > 0) {
      const pcx = this.player.x + this.player.width / 2;
      const pcy = this.player.y + this.player.height / 2;
      for (const g of this.exitGlows) {
        g.setPlayer(pcx, pcy);
        g.update(dt);
      }
    }

    // Save point interaction ??UP key near save point
    this.checkSavePoints();

    // Shift+P: reset save & reload. Always available so playtesters can
    // recover from stuck states without needing a debug URL flag.
    if (this.game.input.shiftDown && this.game.input.isJustPressed(GameAction.DEBUG_RESET)) {
      SaveManager.deleteSave();
      window.location.reload();
    }

    // Debug commands ??only active with ?debug=1 in URL
    if (new URLSearchParams(window.location.search).has('debug')) {
      // Shift+U: toggle all UI off and show HUD mockup image
      if (this.game.input.shiftDown && this.game.input.isJustPressed(GameAction.DEBUG_UI_TOGGLE)) {
        this.game.input.consumeJustPressed(GameAction.DEBUG_UI_TOGGLE);
        this.debugUIHidden = !this.debugUIHidden;
        // Hide/show real UI layers
        this.game.uiContainer.visible = !this.debugUIHidden;
        this.game.legacyUIContainer.visible = !this.debugUIHidden;
        // Show/hide mockup
        if (this.debugUIHidden) {
          const showMockup = (tex: Texture) => {
            tex.source.scaleMode = 'nearest';
            this.debugHudMockup = new Sprite(tex);
            this.debugHudMockup.zIndex = 99999;
            this.debugHudMockup.width = this.game.app.canvas.width;
            this.debugHudMockup.height = this.game.app.canvas.height;
            this.game.app.stage.addChild(this.debugHudMockup);
          };
          if (this.debugHudMockup) {
            this.debugHudMockup.width = this.game.app.canvas.width;
            this.debugHudMockup.height = this.game.app.canvas.height;
            this.debugHudMockup.visible = true;
          } else {
            const url = assetPath('assets/ui/ui_hud_01.png');
            Assets.load<Texture>(url).then((tex) => {
              if (this.debugUIHidden) showMockup(tex);
            });
          }
          this.toast.show('UI MOCKUP ON', 0x44aaff);
        } else {
          if (this.debugHudMockup) this.debugHudMockup.visible = false;
          this.toast.show('UI MOCKUP OFF', 0x44aaff);
        }
      }
      // Shift+I: toggle debug info (floor text, coordinates)
      if (this.game.input.shiftDown && this.game.input.isJustPressed(GameAction.INVENTORY)) {
        this.game.input.consumeJustPressed(GameAction.INVENTORY);
        this.hud.toggleDebugInfo();
        this.toast.show('DEBUG INFO TOGGLE', 0x44aaff);
      }
      if (this.game.input.shiftDown && this.game.input.isJustPressed(GameAction.DEBUG_CHEAT)) {
        const a = this.player.abilities;
        const allOn = a.cheat;
        if (allOn) {
          // Toggle off ??reset all to false except dash (default ability)
          for (const key of Object.keys(a)) {
            (a as Record<string, boolean>)[key] = key === 'dash';
          }
          this.toast.show('CHEAT OFF ??abilities reset', 0xff4444);
        } else {
          // All on ??set every ability to true
          for (const key of Object.keys(a)) {
            (a as Record<string, boolean>)[key] = true;
          }
          this.toast.show('CHEAT ON ??all relics unlocked', 0xff4444);
        }
        this.updatePlayerAtk();
      }
    }

    // Portal interactions
    this.updatePortals(dt);

    // Ending trigger check
    if (!this.ending.isActive) {
      const pcx = this.player.x + this.player.width / 2;
      const pcy = this.player.y + this.player.height / 2;
      this.ending.checkTrigger(pcx, pcy, this.endingTriggers);
      if (this.ending.isActive) {
        this.player.vx = 0;
        this.player.vy = 0;
        this.player.savePrevPosition();
      }
    }

    // Room transition detection — edge-based
    this.checkLevelEdges();

    // Camera zone detection — check if player entered/exited a camera area
    this.updateCameraZones();

    // HUD
    this.hud.updateHP(this.player.hp, this.player.maxHp);
    this.hud.updateFlask(this.player.flaskCharges, this.player.flaskMaxCharges);
    this.hud.updateATK(this.player.atk);
    this.hud.updateGold(this.gold);

    // Boss HP bar ??교전 감�? 3�??�리�?
    //  1) FSM ?�태 ?�이 (detect/chase/hit/...) ???�반 경우 커버
    //  2) hp < maxHp ??Guardian ?� superArmor=true ???�격해??FSM ??hit ?�로
    //     ?�이?��? ?�아 idle ??머무�????�다. ?��?지 기록??"맞았?? ??직접 증거.
    //  3) bossActive(arena lock) ??보스�?진입 ?�간부???�시. ?�레?�어가 ?�직
    //     ?��? 범위 밖이?�도 '갇혔?? ???�점??바�? ?�워 교전 컨텍?�트�?명시.
    const activeBoss = this.enemies.find(e => (e as any)._isBoss && e.alive);
    if (activeBoss) {
      const st = activeBoss.fsm.currentState;
      const fsmEngaged = st !== null && st !== 'idle' && st !== 'death';
      const wasHit = activeBoss.hp < activeBoss.maxHp;
      const engaged = fsmEngaged || wasHit || this.bossActive;
      if (engaged) {
        if (!(activeBoss as any)._bossBarShown) {
          (activeBoss as any)._bossBarShown = true;
          const name = (activeBoss as any).enemyType ?? 'GUARDIAN';
          this.hud.showBossHP(name, activeBoss.hp, activeBoss.maxHp);
        }
        this.hud.updateBossHP(activeBoss.hp);
      }
    }

    this.hud.update(dt);
    this.hud.setFloorText(this.currentLevel?.identifier ?? '');
    this.areaTitle.update(dt);

    // Hide minimap + adjust gold in item tunnel
    if (this.inItemTunnel && this.minimap) this.minimap.visible = false;
    this.hud.setGoldBelowMinimap(!this.inItemTunnel && !!this.minimap?.visible);

    // Minimap: real-time dot tracking + blink + combat opacity
    if (this.minimap && this.minimap.visible && this.currentLevel) {
      this.minimapBlinkTimer = (this.minimapBlinkTimer + dt) % 800;
      if (this.minimapDot) {
        this.minimapDot.alpha = this.minimapBlinkTimer < 400 ? 1.0 : 0.3;
        const dotSize = 3 * this.game.uiScale;
        const px = Math.min(this.minimapPW - dotSize, Math.max(dotSize, (this.player.x + this.currentLevel.worldX - this.minimapVpLeft) * this.minimapScaleX));
        const py = Math.min(this.minimapPH - dotSize, Math.max(dotSize, (this.player.y + this.currentLevel.worldY - this.minimapVpTop) * this.minimapScaleY));
        this.minimapDot.x = px - dotSize / 2;
        this.minimapDot.y = py - dotSize / 2;
      }
      const inCombat = this.enemies.some(e => e.hp > 0 && !e.shouldRemove);
      this.minimap.alpha = inCombat ? 0.4 : 0.7;
    }

    // Damage numbers & Sakurai hit effects
    this.dmgNumbers.update(dt);
    this.hitSparks.update(dt);
    this.screenFlash.update(dt);

    // Movement VFX (consume player one-shot events + trail updates)
    this.updateMovementVfx(dt);

    // Camera — deadzone follow + zoom lerp. Player is always in world coords.
    // While riding the builder, include visualYOffset so the camera tracks the
    // player's *visual* position. Without this, the physics +16 tile crossing
    // jump (see builder update above) propagates to the camera target and
    // causes a "툭 툭" rocking as the camera snaps to each crossing.
    //
    // The offset is rounded to an integer pixel: a fractional target would
    // make the rounded camera renderY oscillate near .5 boundaries every
    // frame, producing a rapid 1px "덜덜덜" shake. Tile-crossing cancellation
    // still works because the offset is symmetric (~+8 → ~-8 at crossing).
    const cam = this.game.camera;
    const cx = this.player.x + this.player.width / 2;
    const cy = this.player.y + this.player.height / 2 + Math.round(this.player.visualYOffset);

    cam.setBounds(0, 0, this.currentLevel.pxWid, this.currentLevel.pxHei);
    cam.target = { x: cx, y: cy };

    // Vertical look: hold UP/DOWN while idle to peek after a delay
    const playerIdle = this.player.fsm.currentState === 'idle'
      && Math.abs(this.player.vx) < 1 && this.player.hp > 0;
    const lookUp = this.game.input.isDown(GameAction.LOOK_UP);
    const lookDown = this.game.input.isDown(GameAction.LOOK_DOWN);
    const wantLook = playerIdle && (lookUp || lookDown);
    if (wantLook) {
      this.lookHoldTimer += dt;
    } else {
      this.lookHoldTimer = 0;
    }
    const LOOK_HOLD_THRESHOLD = 400; // ms before peek activates
    cam.lookDirection = (wantLook && this.lookHoldTimer >= LOOK_HOLD_THRESHOLD)
      ? (lookUp ? -1 : 1)
      : 0;

    cam.update(dt);

    // Parallax background scroll
    this.parallaxBG.updateScroll(cam.renderX, cam.renderY);

    // Oxygen overlay ??vignette + bar when submerged
    this.updateOxygenOverlay();
  }

  /**
   * Drain player VFX one-shot events and tick the per-frame trails
   * (landing dust / dash afterimage / dash boost / double jump / wall jump).
   * Called each frame after player.update().
   */
  private updateMovementVfx(dt: number): void {
    const p = this.player;

    // Landing dust ??on grounded edge
    const landedSpeed = p.consumeLandedEvent();
    if (landedSpeed !== null) {
      this.landingDust.spawn(p.x + p.width / 2, p.y + p.height, landedSpeed);
    }

    // Dash boost puff ??on dash start
    const dashDir = p.consumeDashedEvent();
    if (dashDir !== null) {
      this.dashBoostPuff.spawn(p.x + p.width / 2, p.y + p.height, dashDir);
    }

    // Double jump ring ??on mid-air second jump
    if (p.consumeDoubleJumpEvent()) {
      this.doubleJumpRing.spawn(p.x + p.width / 2, p.y + p.height);
    }

    // Wall jump dust ??wall side = -kickDir
    const kickDir = p.consumeWallJumpEvent();
    if (kickDir !== null) {
      const wallX = kickDir > 0 ? p.x : p.x + p.width;
      const wallY = p.y + p.height * 0.45;
      this.wallJumpDust.spawn(wallX, wallY, kickDir);
    }

    // Dash afterimage trail ??continuous while dashing
    this.dashAfterimage.tick(dt, p.isDashing(), () => ({
      x: p.x, y: p.y, w: p.width, h: p.height,
      facingRight: p.facingRight,
      texture: p.getCurrentErdaTexture(),
      spriteCenterX: p.x + p.width / 2,
      spriteFootY: p.y + p.height,
    }));

    // --- Batch B ---
    // Ground takeoff puff
    if (p.consumeGroundJumpEvent()) {
      this.jumpTakeoff.spawn(p.x + p.width / 2, p.y + p.height);
    }
    // (Drop-through handled in Batch D section below)
    // Wall slide continuous dust
    if (p.isWallSliding()) {
      const wallSide = p.wallContactDir(); // -1 left, +1 right
      const wallX = wallSide < 0 ? p.x : p.x + p.width;
      const outDir = -wallSide;
      this.wallSlideDust.emit(wallX, p.y + p.height * 0.55, outDir, dt);
    }
    // Footstep puff on ground movement
    this.footstepPuff.stepIfMoving(
      dt, p.isGrounded(),
      p.x + p.width / 2, p.y + p.height,
      p.getVx(), p.facingRight,
    );
    // Surge VFX ??drive by state
    if (p.isSurgeCharging()) {
      this.surgeVfx.tickCharge(dt, p.x + p.width / 2, p.y + p.height, p.getSurgeChargeRatio());
    } else if (p.isSurgeFlying()) {
      this.surgeVfx.tickFly(dt, p.x + p.width / 2, p.y + p.height / 2);
    } else {
      this.surgeVfx.idleTick(dt);
    }

    // --- Batch D ---
    // Dive landing impact ??fires on diveLanded OR any fast fall land
    if (p.diveLanded) {
      const severity = Math.max(0.8, Math.min(1.6, p.diveFallDistance / 240));
      this.diveLandImpact.spawn(p.x + p.width / 2, p.y + p.height, severity);
    } else if (landedSpeed !== null && landedSpeed > 520) {
      this.diveLandImpact.spawn(p.x + p.width / 2, p.y + p.height, 0.9);
    }
    // Water enter/exit splash
    const waterT = p.consumeWaterTransitionEvent();
    if (waterT !== null) {
      const strength = waterT > 0 ? 1.0 : 0.8;
      this.waterSplash.spawn(p.x + p.width / 2, p.y + p.height, strength);
    }
    // Continuous rising bubbles while submerged
    this.waterBubbles.emit(p.x + p.width / 2, p.y + p.height * 0.35, dt, p.submerged);
    // Drop-through dust streak
    if (p.consumeDropThroughEvent()) {
      this.dropThroughDust.spawn(p.x + p.width / 2, p.y + p.height, p.width * 0.9);
    }
    // Ice skid streak
    this.iceSkidStreak.emit(dt, p.isStandingOnIce(), p.x + p.width / 2, p.y + p.height, p.getVx());

    // --- Enemies: ?�경 VFX ?�사??(water/ice + land/jump dust) ---
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

    // --- Batch C ---
    // Player hit blood spray
    const hitDir = p.consumePlayerHitEvent();
    if (hitDir !== null) {
      this.hitBloodSpray.spawn(p.x + p.width / 2, p.y + p.height * 0.4, hitDir);
    }

    // Tick all particle managers
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
    this.relicAuraBurst.update(dt);
    this.savepointPulse.update(dt);
    const hpRatio = this.player.maxHp > 0 ? this.player.hp / this.player.maxHp : 0;
    this.lowHpVignette.update(dt, hpRatio);
  }

  private updateOxygenOverlay(): void {
    const ratio = this.player.oxygenRatio;
    const submerged = this.player.submerged && !this.player.abilities.waterBreathing;

    // Vignette overlay
    if (submerged && ratio < 1) {
      if (!this.oxygenOverlay) {
        this.oxygenOverlay = new Graphics();
        this.oxygenOverlay.eventMode = 'none';
        this.game.legacyUIContainer.addChild(this.oxygenOverlay);
      }

      this.oxygenOverlay.clear();
      // Blue ??red vignette based on oxygen
      const color = ratio > 0.5 ? 0x1122aa : ratio > 0.25 ? 0x882244 : 0xaa2222;
      const intensity = (1 - ratio) * 0.5;
      // Pulse effect when low
      const pulse = ratio < 0.5 ? Math.sin(Date.now() * (ratio < 0.15 ? 0.015 : 0.008)) * 0.1 : 0;
      const alpha = Math.min(0.6, intensity + pulse);

      // Draw border vignette
      this.oxygenOverlay.rect(0, 0, GAME_WIDTH, GAME_HEIGHT)
        .fill({ color, alpha });
      // Clear center to create vignette effect
      const cx = GAME_WIDTH / 2;
      const cy = GAME_HEIGHT / 2;
      const r = GAME_WIDTH * 0.35 * (0.5 + ratio * 0.5);
      this.oxygenOverlay.circle(cx, cy, r).cut();

      this.oxygenOverlay.visible = true;
    } else {
      if (this.oxygenOverlay) {
        this.oxygenOverlay.visible = false;
      }
    }

    // Oxygen bar (bottom center, only when submerged)
    if (submerged && ratio < 1) {
      if (!this.oxygenBar) {
        this.oxygenBar = new Graphics();
        this.oxygenBar.eventMode = 'none';
        this.game.legacyUIContainer.addChild(this.oxygenBar);
      }

      this.oxygenBar.clear();
      const barW = 60;
      const barH = 4;
      const bx = GAME_WIDTH / 2 - barW / 2;
      const by = GAME_HEIGHT - 20;
      // BG
      this.oxygenBar.rect(bx, by, barW, barH).fill({ color: 0x111133, alpha: 0.7 });
      // Fill
      const fillColor = ratio > 0.5 ? 0x4488ff : ratio > 0.25 ? 0xff8844 : 0xff2222;
      this.oxygenBar.rect(bx, by, barW * ratio, barH).fill(fillColor);
      // Border
      this.oxygenBar.rect(bx, by, barW, barH).stroke({ color: 0x446688, width: 0.5 });

      this.oxygenBar.visible = true;
    } else {
      if (this.oxygenBar) {
        this.oxygenBar.visible = false;
      }
    }
  }

  render(alpha: number): void {
    if (!this.initialized) return;
    // During post-transition snap, disable interpolation to prevent 1-frame jitter
    const a = this.postTransitionSnapFrames > 0 ? 1 : alpha;
    this.player.render(a);
    for (const enemy of this.enemies) enemy.render(a);
    // Portals and altars are static, no interpolation needed
  }

  exit(): void {
    this.toast.clear();
    this.uiController.destroy();
    // if (this.controlsOverlay?.container.parent) {
    //   this.controlsOverlay.container.parent.removeChild(this.controlsOverlay.container);
    // }
    // Close and detach modal overlays so they don't bleed into the next scene.
    // (Previously: M/I 가 ?�린 �??�이?�계�?진입?�면 overlay 가 legacyUIContainer
    //  ??그�?�??�아 ItemWorldScene ?�서 ?�을 ???�는 "stuck" ?�태가 ??)
    if (this.altarUI?.parent) this.altarUI.parent.removeChild(this.altarUI);
    if (this.portalTransition) { this.portalTransition.destroy(); this.portalTransition = null; }
  }

  // ---------------------------------------------------------------------------
  // Level loading
  // ---------------------------------------------------------------------------

  /**
   * Load a level by its LDtk identifier.
   *
   * @param levelId        - Identifier string from the .ldtk file (e.g. "Entrance").
   * @param enterDirection - Direction from which the player arrives, used to
   *                         place the player on the opposite edge.
   */
  private findPlayerSpawnLevel(): string {
    return this.transitionController.findPlayerSpawnLevel(this.loader, FALLBACK_ENTRANCE_LEVEL);
  }

  /** Seal level exits with temporary collision doors when boss fight starts. */
  private activateBossLock(level: LdtkLevel, bossId: string = 'unknown'): void {
    if (this.bossActive) return; // already locked; avoid double start event
    this.bossActive = true;
    this.bossLockId = bossId;
    this.bossLockLevelId = level.identifier;
    trackBossFight({
      phase: 'start',
      area: 'world',
      boss_id: bossId,
      level_id: level.identifier,
    });
    // Create barrier doors at each edge opening
    const w = level.pxWid;
    const h = level.pxHei;
    const doorThick = 16;
    const positions = [
      { x: doorThick / 2, y: h / 2, dw: doorThick, dh: h },           // left
      { x: w - doorThick / 2, y: h / 2, dw: doorThick, dh: h },       // right
      { x: w / 2, y: doorThick, dw: w, dh: doorThick },               // top (pivot bottom-center)
      { x: w / 2, y: h, dw: w, dh: doorThick },                       // bottom
    ];
    for (const pos of positions) {
      const door = new LockedDoor(
        pos.x, pos.y + pos.dh / 2, // adjust for bottom-center pivot
        pos.dw, pos.dh,
        '', 'event', '', 'atk', 0,
      );
      door.injectCollision(this.collisionGrid);
      this.bossLockDoors.push(door);
      this.entityLayer.addChild(door.container);
    }
  }

  /** Remove boss lock doors when boss is defeated. */
  private deactivateBossLock(): void {
    if (!this.bossActive) return;
    this.bossActive = false;
    for (const door of this.bossLockDoors) {
      door.unlock(this.collisionGrid);
      door.destroy();
    }
    this.bossLockDoors = [];
    // arena ?�제 = 보스 처치 직후?��?�?HP 바도 ?�린??
    this.hud.hideBossHP();
    trackBossFight({
      phase: 'clear',
      area: 'world',
      boss_id: this.bossLockId || 'unknown',
      level_id: this.bossLockLevelId || undefined,
    });
    this.bossLockId = '';
    this.bossLockLevelId = '';
  }

  private handleEnemyKill(enemy: Enemy<string>): void {
    this.game.stats.enemiesKilled++;

    // Analytics: enemy kill distribution
    trackEnemyKill({
      area: 'world',
      enemy_type: enemy.constructor.name.toLowerCase(),
      is_boss: !!(enemy as any)._isBoss,
      is_elite: enemy instanceof GoldenMonster,
    });

    // Unlock linked LockedDoors if this enemy had targets
    const unlockIids = (enemy as any)._unlockTargetIids as string[] | undefined;
    if (unlockIids) {
      for (const iid of unlockIids) {
        this.unlockDoorByIid(iid);
      }
    }
    if ((enemy as any)._isBoss) {
      const bossX = enemy.x + enemy.width / 2;
      const bossY = enemy.y + enemy.height - 4;

      // Mark boss as permanently killed
      const bossKey = (enemy as any)._bossKey as string;
      if (bossKey) this.unlockedEvents.add(bossKey);

      // Gold flash on boss kill + unlock arena
      this.screenFlash.flash(0xffd700, 0.5, 300);
      this.game.hitstopFrames = 12;
      if (this.bossActive) this.deactivateBossLock();

      // Level up item if inside fixed item world
      if (this.fixedItemWorldItem) {
        const rarity = this.fixedItemWorldItem.rarity;
        const sourceItem = this.fixedItemWorldItem;
        const prevAtk = this.fixedItemWorldItem.finalAtk;
        itemLevelUp(this.fixedItemWorldItem);
        trackItemLevelUp({
          source: 'itemworld_boss',
          item_rarity: rarity,
          new_level: this.fixedItemWorldItem.level,
        });
        this.updatePlayerAtk();
        const atkGain = this.fixedItemWorldItem.finalAtk - prevAtk;
        if (atkGain > 0) {
          this.toast.showBig(`ATK +${atkGain}`, 0xffd700);
        }

        // Spawn portal after delay
        setTimeout(async () => {
          if (!this.initialized) return;
          this.spawnPortal(bossX, bossY, rarity, 'altar', sourceItem);
        }, 1500);
      } else {
        // World boss (test) ??no portal, just big toast
        this.toast.showBig('BOSS DEFEATED!', 0xffd700);
      }
    } else if (enemy instanceof Slime) {
      // setTimeout(() => this.dialogueManager.fireEvent('first_slime_kill'), 1000);
    } else if (enemy instanceof Skeleton) {
      // setTimeout(() => this.dialogueManager.fireEvent('first_skeleton_kill'), 1000);
    }
    // Gold drop on kill (Elden Ring style ??items are hand-placed, not monster drops)
    const isGolden = enemy instanceof GoldenMonster;
    const baseGold = Math.floor((enemy.exp > 0 ? enemy.exp : 40) * 0.5);
    const goldAmount = isGolden ? baseGold * 3 : baseGold;
    if (goldAmount > 0) {
      const gp = new GoldPickup(
        enemy.x + enemy.width / 2 - 8,
        enemy.y + enemy.height,
        goldAmount,
      );
      this.goldPickups.push(gp);
      this.entityLayer.addChild(gp.container);
    }

    // HEL-05: Tiered healing drops (GDD §4.1)
    const healDropX = enemy.x + enemy.width / 2 - 8;
    const healDropY = enemy.y + enemy.height;
    if (isGolden && this.dropRng.next() < 0.5) {
      const heal = createForgeEmber(healDropX, healDropY, this.player.maxHp);
      this.healingPickups.push(heal);
      this.entityLayer.addChild(heal.container);
    } else if (!isGolden && this.dropRng.next() < 0.2) {
      const heal = createEmberShard(healDropX, healDropY, this.player.maxHp);
      this.healingPickups.push(heal);
      this.entityLayer.addChild(heal.container);
    }
  }

  private static readonly debugMode = new URLSearchParams(window.location.search).has('debug');

  private loadLevel(levelId: string, enterDirection: 'left' | 'right' | 'up' | 'down'): void {
    // Debug_ rooms only accessible with ?debug in URL
    if (levelId.startsWith('Debug_') && !LdtkWorldScene.debugMode) {
      return;
    }
    const level = this.loader.getLevel(levelId);
    if (!level) {
      console.error(`[LdtkWorldScene] Level not found: "${levelId}"`);
      return;
    }
    this.currentLevel = level;
    this.visitedLevels.add(level.identifier);

    // Collision grid ??deep copy so runtime modifications don't persist across reloads
    this.collisionGrid = level.collisionGrid.map(row => [...row]);
    // Reset breakable hit tracking on level transition
    this.breakableHits.clear();
    // 보스 HP �?초기?????�전 ?�벨?�서 ?�아?�을 가?�성(?�망·?�프 ?? 차단.
    // ???�벨??보스방이�?activateBossLock ??update 루프?�서 ?�시 ?�시?�다.
    this.hud.hideBossHP();

    // Render tiles ??filter wall tiles by collision grid (destroyed tiles stay gone)
    this.renderer.clear();
    const filteredWalls = level.wallTiles.filter(t => {
      const col = Math.floor(t.px[0] / TILE_SIZE);
      const row = Math.floor(t.px[1] / TILE_SIZE);
      return (this.collisionGrid[row]?.[col] ?? 0) !== 0;
    });
    // Retag BG/WALL tiles to CSV-derived atlas — but ONLY if the tile's
    // current tilesetPath matches the LDtk default for that layer. Levels
    // that override the tileset (e.g. Builder with builder_01) keep theirs.
    const defaultWallTileset = 'atlas/world_01.png';
    const defaultBgTileset = 'atlas/SunnyLand_by_Ansimuz-extended.png';
    const bgToRetag = level.backgroundTiles.filter(t => t.tilesetPath === defaultBgTileset);
    const wallToRetag = filteredWalls.filter(t => t.tilesetPath === defaultWallTileset);
    applyAreaTilesetToLdtkTiles('world_shaft_bg', bgToRetag);
    applyAreaTilesetToLdtkTiles('world_shaft_wall', wallToRetag);
    // All other tiles (Interior, extras, overridden tilesets) keep their
    // original LDtk tilesetPath. Tilesets are pre-loaded in init().
    const allExtraTiles = Object.values(level.extraTileLayers).flat();
    const combinedInterior = level.interiorTiles.concat(allExtraTiles);
    this.renderer.renderLevel(level.backgroundTiles, filteredWalls, level.shadowTiles, this.atlases, undefined, undefined, combinedInterior);

    // Procedural decorations (always on; ?noproc to disable, ?theme=X for testing)
    if (!new URLSearchParams(window.location.search).has('noproc')) {
      // Clear previous
      if (this.procDecorator) {
        if (this.procDecorator.naturalLayer.parent) this.procDecorator.naturalLayer.parent.removeChild(this.procDecorator.naturalLayer);
        if (this.procDecorator.artificialLayer.parent) this.procDecorator.artificialLayer.parent.removeChild(this.procDecorator.artificialLayer);
        if (this.procDecorator.structureLayer.parent) this.procDecorator.structureLayer.parent.removeChild(this.procDecorator.structureLayer);
      }
      for (const old of this._extraDecorators) {
        if (old.naturalLayer.parent) old.naturalLayer.parent.removeChild(old.naturalLayer);
        if (old.artificialLayer.parent) old.artificialLayer.parent.removeChild(old.artificialLayer);
        if (old.structureLayer.parent) old.structureLayer.parent.removeChild(old.structureLayer);
      }
      this._extraDecorators = [];

      this.procDecorator ??= new ProceduralDecorator();
      // Only apply theme if explicitly requested via URL (?theme=T-FOUNDRY)
      const themeParam = new URLSearchParams(window.location.search).get('theme');
      if (themeParam) this.procDecorator.setTheme(themeParam);
      this.procDecorator.clear();
      this.procDecorator.generate(this.collisionGrid, hashString(level.identifier));
      if (this.wallPaletteFilter) {
        this.procDecorator.naturalLayer.filters = [this.naturalPaletteFilter!];
        this.procDecorator.artificialLayer.filters = [this.wallPaletteFilter];
        this.procDecorator.structureLayer.filters = [this.wallPaletteFilter];
      }
      const structIdx = this.renderer.container.getChildIndex(this.renderer.wallLayer);
      this.renderer.container.addChildAt(this.procDecorator.structureLayer, structIdx);
      const detailIdx = this.renderer.container.getChildIndex(this.renderer.shadowLayer);
      this.renderer.container.addChildAt(this.procDecorator.naturalLayer, detailIdx);
      this.renderer.container.addChildAt(this.procDecorator.artificialLayer, detailIdx + 1);
    }

    // Parallax background ??only rebuild on first load (skip on room transitions
    // within the same area to prevent jarring position resets).
    if (!this.parallaxBG.isReady) {
      const bgEntry = getAreaPalette('world_shaft_bg');
      const atlas = getAreaPaletteAtlas();
      this.parallaxBG.setup(bgEntry, level.pxWid, level.pxHei, {
        texture: atlas.texture,
        rowCount: atlas.rowCount,
        row: getAreaPaletteRow(bgEntry.id),
      });
    }

    // Camera bounds
    this.game.camera.setBounds(0, 0, level.pxWid, level.pxHei);


    // Drop the previous builder before entity collections are cleared below.
    // The new builder is spawned after clearDrops()/processLdtkEntities() so
    // builder-owned item drops are not immediately destroyed by level reload
    // cleanup.
    this.clearBuilder();

    // Area title on entry. During the intro fade-in we must defer the banner
    // until the screen is actually visible, otherwise it plays behind black.
    if (level.identifier === 'Shaft_01') {
      if (this.introPhase === 'fadeIn') {
        this.pendingAreaTitle = 'The Shaft';
      } else {
        this.areaTitle.show('The Shaft');
      }
    }

    // Patch collisionGrid for already-unlocked SecretWalls/CrackedFloors
    // BEFORE placing the player. findEdgePassage scans collisionGrid to pick
    // an entry passage, so any wall the player already broke (e.g. re-entering
    // via a SecretWall passage) must be cleared first or the player spawns on
    // the wrong edge and floats in empty space.
    this.spawnCrackedFloors(level);
    this.spawnSecretWalls(level);

    // Place player
    this.placePlayer(level, enterDirection);

    // Spawn enemies (skip for Shop rooms)
    this.clearEnemies();
    this.clearDrops();
    this.clearPortals();
    for (const r of this.relicMarkers) { if (r.gfx.parent) r.gfx.parent.removeChild(r.gfx); }
    this.relicMarkers = [];
    for (const sp of this.savePoints) {
      if (sp.gfx.parent) sp.gfx.parent.removeChild(sp.gfx);
      if (sp.prompt?.parent) sp.prompt.parent.removeChild(sp.prompt);
    }
    this.savePoints = [];
    this.saveHintShown = false;
    for (const g of this.exitGlows) g.destroy();
    this.exitGlows = [];
    for (const sh of this.healthShards) sh.destroy();
    this.healthShards = [];
    for (const hp of this.healingPickups) hp.destroy();
    this.healingPickups = [];
    for (const gp of this.goldPickups) gp.destroy();
    this.goldPickups = [];
    this.endingTriggers = [];

    if (level.roomType !== 'Shop') {
      this.spawnEnemiesFromLdtk(level);
    }
    this.spawnAnvilFromLdtk(level);

    // Spawn locked doors and switches
    this.spawnLockedDoors(level);
    this.spawnSwitches(level);
    this.spawnGrowingWalls(level);
    this.spawnSpikes(level);
    this.spawnCollapsingPlatforms(level);
    this.spawnDialogueTriggers(level);

    // Camera: reset zones and defaults before entity processing
    const cam = this.game.camera;
    this.cameraZones = [];
    this.activeCameraZone = null;
    cam.deadZoneX = 32;
    cam.deadZoneY = 24;
    cam.lookAheadDistance = 0;
    cam.followLerp = 0.08;
    cam.zoomTo(1.0);

    // Process other LDtk entities (Items, GameSaver, Camera zones, etc.)
    this.processLdtkEntities(level);

    // Giant Builder:
    //   Shaft_01       — Builder_Level_0 cinematic one-shot descent
    //   Debug_Shaft_01 — Builder_Level_1 infinite patrol (gameplay/testing)
    //   Debug_Shaft_2  — Builder_Level_1 infinite patrol (gameplay/testing)
    if (level.identifier === 'Shaft_01') {
      // Always spawn — first visit plays the ascent cinematic, subsequent
      // visits place the builder at its final dormant pose at the top.
      // (clearBuilder() runs on level unload, so the instance must be
      // recreated on every entry.)
      this.spawnBuilder(level, 'cinematic', 'Builder_Level_0');
    } else if (level.identifier === 'Debug_Shaft_01') {
      this.spawnBuilder(level, 'patrol', 'Builder_Level_1');
    } else if (level.identifier === 'Debug_Shaft_2') {
      this.spawnBuilder(level, 'patrol', 'Builder_Level_1');
    }

    // Exit Light Bleed ???�웃 방이 ?�는 방향???�린 ?�??구간??주황 글로우.
    this.spawnExitGlows(level);

    // Settle player physics (gravity snap to floor) before camera snap
    for (let i = 0; i < 5; i++) {
      this.player.update(16.667);
    }
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.savePrevPosition();

    const camX = this.player.x + this.player.width / 2;
    const camY = this.player.y + this.player.height / 2;
    cam.target = { x: camX, y: camY };
    cam.snap(camX, camY);
    // Run one camera.update() so cam position matches what update() would produce.
    // This prevents a 1-frame jump when transitioning from snap to normal update.
    cam.update(16.667);

    // Update minimap + world map (skip in item tunnel)
    if (!this.inItemTunnel) {
      this.drawMinimap();
    } else if (this.minimap) {
      this.minimap.visible = false;
    }
    // When the world map is open, the freshly-drawn minimap must stay hidden.
    if (this.worldMap?.visible && this.minimap) {
      this.minimap.visible = false;
    }
    if (this.worldMap?.visible) {
      this.worldMap.setExplorationState(this.visitedLevels, this.currentLevel?.identifier ?? '');
      this.worldMap.setMarkers(this.collectMapMarkers());
      this.worldMap.redraw();
    }

  }

  /**
   * Position the player in the freshly loaded level.
   * Priority:
   *  1. If entering from a specific direction, place on the opposite edge.
   *  2. Otherwise use the LDtk "Player" entity spawn point.
   *  3. Fallback: center-bottom of the level.
   */
  private placePlayer(level: LdtkLevel, enterFrom: 'left' | 'right' | 'up' | 'down'): void {
    const pw = this.player.width;
    const ph = this.player.height;
    // Use the RUNTIME collisionGrid (this.collisionGrid), not the LDtk master
    // (level.collisionGrid). The runtime grid has been patched for already-
    // broken SecretWalls / CrackedFloors by spawnSecretWalls/spawnCrackedFloors
    // above; using the master would treat broken passages as solid and spawn
    // the player inside a wall on re-entry.
    const grid = this.collisionGrid;

    let spawnX: number;
    let spawnY: number;

    // pendingPlayerTileY/X are in WORLD tile coords. Convert to this level's local tiles.
    const hintRow = this.pendingPlayerTileY - Math.floor(level.worldY / TILE_SIZE);
    const hintCol = this.pendingPlayerTileX - Math.floor(level.worldX / TILE_SIZE);

    // GridVania: find the closest open passage on the entry edge to where
    // the player was in the previous room.
    // Spawn 3 tiles inward from the edge to avoid immediately re-triggering
    // the transition back to the previous room.
    const INSET = 2 * TILE_SIZE;

    switch (enterFrom) {
      case 'left': {
        const passageY = this.findEdgePassage(grid, 'left', hintRow);
        spawnX = INSET;
        spawnY = this.snapToFloor(grid, Math.floor(INSET / TILE_SIZE), passageY, ph);
        break;
      }
      case 'right': {
        const passageY = this.findEdgePassage(grid, 'right', hintRow);
        spawnX = level.pxWid - INSET - pw;
        spawnY = this.snapToFloor(grid, level.gridW - 3, passageY, ph);
        break;
      }
      case 'up': {
        const passageX = this.findEdgePassage(grid, 'up', hintCol);
        spawnX = passageX * TILE_SIZE;
        spawnY = INSET;
        break;
      }
      case 'down':
      default: {
        const playerEntity = level.entities.find((e) => e.type === 'Player');
        if (playerEntity) {
          spawnX = playerEntity.px[0];
          spawnY = playerEntity.px[1] - ph;
        } else {
          const passageX = this.findEdgePassage(grid, 'down', hintCol);
          spawnX = passageX * TILE_SIZE;
          spawnY = level.pxHei - INSET - ph;
        }
        break;
      }
    }

    this.player.x = spawnX;
    this.player.y = spawnY;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.roomData = this.collisionGrid;
    this.player.savePrevPosition();
  }

  /**
   * Find the tile coordinate of an open passage (0) on the given edge.
   * For left/right edges: returns the Y tile row of the passage.
   * For up/down edges: returns the X tile column of the passage.
   * Falls back to the middle of the edge if no passage found.
   */
  /**
   * From a passage row, scan downward to find the floor, then place entity
   * directly on top of it. Prevents spawning inside the floor.
   */
  private snapToFloor(grid: number[][], tileX: number, passageRow: number, entityHeight: number): number {
    return this.transitionController.snapToFloor(grid, tileX, passageRow, entityHeight);
  }

  private findEdgePassage(grid: number[][], edge: 'left' | 'right' | 'up' | 'down', hintTile = -1): number {
    return this.transitionController.findEdgePassage(grid, edge, hintTile);
  }

  private findFloorY(grid: number[][], tileX: number, entityHeight: number): number {
    return this.transitionController.findFloorY(grid, tileX, entityHeight);
  }

  // ---------------------------------------------------------------------------
  // Enemy spawning
  // ---------------------------------------------------------------------------

  private spawnLockedDoors(level: LdtkLevel): void {
    // Clean up previous doors
    for (const door of this.lockedDoors) door.destroy();
    this.lockedDoors = [];

    const doorEntities = level.entities.filter(e => e.type === 'LockedDoor');
    for (const ent of doorEntities) {
      // LDtk field names are PascalCase; enum values are PascalCase too
      const rawCondition = (ent.fields['UnlockCondition'] as string) || (ent.fields['unlockCondition'] as string) || '';
      const unlockCondition = rawCondition.toLowerCase() as UnlockCondition || 'event';
      const unlockEvent = (ent.fields['unlockEvent'] as string) || '';
      const statType = ((ent.fields['StatType'] as string) || (ent.fields['statType'] as string) || 'atk').toLowerCase();
      const statThreshold = (ent.fields['StatThreshold'] as number) ?? (ent.fields['statThreshold'] as number) ?? 0;

      // Build a persistent key for tracking unlocked state
      const doorKey = unlockCondition === 'event'
        ? unlockEvent
        : ent.iid; // use entity IID as unique key
      if (this.unlockedEvents.has(doorKey)) continue;

      const door = new LockedDoor(
        ent.px[0], ent.px[1],
        ent.width, ent.height,
        ent.iid,
        unlockCondition,
        unlockCondition === 'event' ? unlockEvent : doorKey,
        statType,
        statThreshold,
      );
      door.injectCollision(this.collisionGrid);
      this.lockedDoors.push(door);
      this.entityLayer.addChild(door.container);
    }
  }

  /** Unlock all doors matching the given event name. */
  unlockDoors(eventName: string): void {
    this.unlockedEvents.add(eventName);
    for (let i = this.lockedDoors.length - 1; i >= 0; i--) {
      const door = this.lockedDoors[i];
      if (door.unlockEvent === eventName) {
        door.unlock(this.collisionGrid);
        trackGateBreak({
          gate_type: 'event',
          level_id: this.currentLevel?.identifier,
        });
        door.destroy();
        this.lockedDoors.splice(i, 1);
      }
    }
  }

  /** Unlock a single door by its LDtk entity IID. */
  private unlockDoorByIid(iid: string): void {
    this.unlockedEvents.add(iid);
    for (let i = this.lockedDoors.length - 1; i >= 0; i--) {
      const door = this.lockedDoors[i];
      if (door.iid === iid) {
        door.unlock(this.collisionGrid);
        trackGateBreak({
          gate_type: door.unlockCondition === 'switch' ? 'switch' : 'event',
          level_id: this.currentLevel?.identifier,
        });
        // Break effect
        this.game.camera.shake(6);
        this.screenFlash.flashHit(true);
        this.toast.show('Gate Opened!', 0x44ffaa);
        door.destroy();
        this.lockedDoors.splice(i, 1);
        return;
      }
    }
  }

  /** Track doors already rejected during current attack to prevent spam. */
  private doorRejectSet = new Set<string>();
  private lastDoorCheckCombo = -1;

  /** Check player attack against locked doors (stat conditions only). */
  private checkAttackOnDoors(): void {
    if (!this.player.isAttackActive()) {
      // Reset reject tracking when attack ends
      if (this.doorRejectSet.size > 0) {
        this.doorRejectSet.clear();
        this.lastDoorCheckCombo = -1;
      }
      return;
    }

    // Reset on new combo hit
    if (this.player.comboIndex !== this.lastDoorCheckCombo) {
      this.doorRejectSet.clear();
      this.lastDoorCheckCombo = this.player.comboIndex;
    }

    const step = this.player.getAttackStep(this.player.comboIndex);
    if (!step) return;

    const hitbox = getAttackHitbox(
      this.player.x, this.player.y, this.player.width, this.player.height,
      this.player.facingRight ?? true, step,
    );

    for (let i = this.lockedDoors.length - 1; i >= 0; i--) {
      const door = this.lockedDoors[i];
      if (!door.locked) continue;
      if (this.doorRejectSet.has(door.iid)) continue; // already rejected this attack
      if (!aabbOverlap(hitbox, door.getHitAABB())) continue;

      const playerStats: Record<string, number> = {
        atk: this.player.atk,
        def: this.player.def,
      };

      const result = door.tryAttackUnlock(playerStats, this.collisionGrid);

      if (result === 'unlocked') {
        this.unlockedEvents.add(door.iid);
        trackGateBreak({
          gate_type: 'stat',
          stat_type: door.statType,
          stat_threshold: door.statThreshold,
          level_id: this.currentLevel?.identifier,
        });
        this.game.camera.shake(6);
        this.screenFlash.flashHit(true);
        this.toast.show('Gate Destroyed!', 0x44ffaa);
        door.destroy();
        this.lockedDoors.splice(i, 1);
      } else if (result === 'rejected') {
        this.doorRejectSet.add(door.iid);
        this.game.camera.shake(2);
        const threshold = door.statThreshold;
        const current = playerStats[door.statType] ?? 0;
        this.toast.show(`${door.statType.toUpperCase()} ${current} / ${threshold} required`, 0xff4444);
        break;
      }
    }
  }

  /** Check if player is near a save point ??show hint, save on UP. */
  private checkSavePoints(): void {
    const pcx = this.player.x + this.player.width / 2;
    const pcy = this.player.y + this.player.height / 2;
    const RANGE = 32;

    let nearSave = false;
    let nearSavePt: { x: number; y: number } | null = null;
    for (const sp of this.savePoints) {
      const dx = Math.abs(pcx - sp.x);
      const dy = Math.abs(pcy - sp.y);
      if (dx < RANGE && dy < RANGE) {
        nearSave = true;
        nearSavePt = { x: sp.x, y: sp.y };
        sp.gfx.alpha = 0.6 + Math.sin(Date.now() * 0.005) * 0.4;
        // Show context prompt ??convert world pos to native screen pos
        if (sp.prompt) {
          sp.prompt.visible = true;
          const us = this.game.uiScale;
          const cam = this.game.camera;
          const sx = (sp.x - cam.renderX + GAME_WIDTH / 2) * us - sp.prompt.width / 2;
          const sy = (sp.y - cam.renderY + GAME_HEIGHT / 2 - 56) * us;
          sp.prompt.x = Math.round(sx);
          sp.prompt.y = Math.round(sy);
        }

        // ?�력 처리??update() ??save point ?�점 블록?�서 ?�행 (C/ATTACK, pre-player.update).
      } else {
        sp.gfx.alpha = 0.6;
        if (sp.prompt) sp.prompt.visible = false;
      }
    }

    if (nearSave) {
      if (!this.saveHintShown) {
        this.saveHintShown = true;
      }
      if (nearSavePt) this.savepointPulse.attach(nearSavePt.x, nearSavePt.y);
    } else {
      if (this.saveHintShown) this.saveHintShown = false;
      this.savepointPulse.detach();
    }
  }

  private saveHintShown = false;

  /** Place player next to the nearest save point in the current level. */
  private snapPlayerToSavePoint(): void {
    if (this.savePoints.length === 0) return;
    // Find closest save point
    const pcx = this.player.x + this.player.width / 2;
    let closest = this.savePoints[0];
    let bestDist = Infinity;
    for (const sp of this.savePoints) {
      const d = Math.abs(sp.x - pcx);
      if (d < bestDist) { bestDist = d; closest = sp; }
    }
    // Place player next to save point, on the ground
    this.player.x = closest.x - this.player.width / 2;
    this.player.y = closest.y - this.player.height;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.savePrevPosition();
    this.game.camera.snap(
      this.player.x + this.player.width / 2,
      this.player.y + this.player.height / 2,
    );
  }

  private performSave(): void {
    // Full heal + Flask refill at save point (GDD HEL-04)
    this.player.hp = this.player.maxHp;
    this.player.flaskCharges = this.player.flaskMaxCharges;

    // Visual feedback
    this.screenFlash.flash(0x44ffaa, 0.3, 200);
    this.game.hitstopFrames = 4;
    // Batch E: pulse ring at nearest savepoint
    {
      const pcx = this.player.x + this.player.width / 2;
      let closest = this.savePoints[0];
      let bestDist = Infinity;
      for (const sp of this.savePoints) {
        const d = Math.abs(sp.x - pcx);
        if (d < bestDist) { bestDist = d; closest = sp; }
      }
      if (closest) this.savepointPulse.pulse(closest.x, closest.y);
    }

    SaveManager.save({
      player: {
        hp: this.player.hp,
        maxHp: this.player.maxHp,
        atk: this.player.atk,
        def: this.player.def,
      },
      levelId: this.currentLevel?.identifier ?? this.playerSpawnLevelId,
      inventory: this.inventory,
      abilities: { ...this.player.abilities },
      unlockedEvents: this.unlockedEvents,
      collectedRelics: this.collectedRelics,
      collectedItems: this.collectedItems,
      visitedLevels: this.visitedLevels,
      clearedLevels: this.clearedLevels,
      gold: this.gold,
      playtime: this.game.stats.playTimeMs,
      healthShardBonus: this.healthShardBonus,
    });
    this.toast.show('Game Saved!', 0x44ffaa);
    trackSave(
      this.currentLevel?.identifier ?? this.playerSpawnLevelId,
      Math.floor(this.game.stats.playTimeMs / 1000),
    );
    // Heal to full on save
    this.player.hp = this.player.maxHp;
    this.hud.updateHP(this.player.hp, this.player.maxHp);
    this.hud.updateGold(this.gold);
  }

  private spawnCollapsingPlatforms(level: LdtkLevel): void {
    for (const cp of this.collapsingPlatforms) cp.destroy();
    this.collapsingPlatforms = [];

    const entities = level.entities.filter(e => e.type === 'CollapsingPlatform');
    for (const ent of entities) {
      const respawns = (ent.fields['Respawn'] ?? ent.fields['respawn'] ?? true) as boolean;
      const respawnTime = (ent.fields['RespawnTime'] ?? ent.fields['respawnTime'] ?? 3.0) as number;
      const key = `cplat_${level.identifier}_${ent.px[0]}_${ent.px[1]}`;

      // Non-respawning platform already collapsed ??skip
      if (!respawns && this.unlockedEvents.has(key)) continue;

      const cp = new CollapsingPlatform(
        ent.px[0], ent.px[1], ent.width, ent.height,
        respawns, respawnTime,
      );
      (cp as any)._key = key;
      (cp as any)._respawns = respawns;
      cp.injectCollision(this.collisionGrid);
      this.collapsingPlatforms.push(cp);
      this.entityLayer.addChild(cp.container);
    }
  }

  /**
   * Spawn Dialogue and Memory triggers from LDtk entities.
   */
  private spawnDialogueTriggers(level: LdtkLevel): void {
    for (const t of this.dialogueTriggers) {
      if (t.prompt?.parent) t.prompt.parent.removeChild(t.prompt);
    }
    this.dialogueTriggers = [];

    const TRIGGER_W = 48;
    const TRIGGER_H = 48;

    for (const ent of level.entities.filter(e => e.type === 'Dialogue')) {
      const text = (ent.fields['text'] ?? '') as string;
      if (!text) continue;
      const speaker = (ent.fields['speaker'] ?? undefined) as string | undefined;
      const portrait = (ent.fields['portrait'] ?? undefined) as string | undefined;
      const speakerColor = (ent.fields['speakerColor'] ?? undefined) as number | undefined;
      const triggerType = ((ent.fields['triggerType'] ?? 'area') as string) === 'interact' ? 'interact' as const : 'area' as const;
      const once = (ent.fields['once'] ?? true) as boolean;
      const autoCloseMs = (ent.fields['autoCloseMs'] ?? 0) as number;
      const eventName = (ent.fields['eventName'] ?? null) as string | null;
      const freezePlayer = (ent.fields['freezePlayer'] ?? true) as boolean;

      const eventKey = eventName ?? `dialogue_${level.identifier}_${ent.iid}`;
      if (once && this.unlockedEvents.has(eventKey)) continue;

      const line: LoreLine = {
        text,
        speaker,
        portrait,
        speakerColor,
        autoCloseMs: autoCloseMs > 0 ? autoCloseMs : undefined,
      };

      const trigger = {
        x: ent.px[0] - TRIGGER_W / 2,
        y: ent.px[1] - TRIGGER_H,
        w: TRIGGER_W,
        h: TRIGGER_H,
        lines: [line],
        triggerType,
        once,
        freezePlayer,
        eventName: eventKey,
        active: false,
        fired: false,
        cooldown: 0,
        prompt: null as Container | null,
      };

      if (triggerType === 'interact') {
        const prompt = KeyPrompt.createPrompt('C', 'Talk', this.game.uiScale);
        prompt.visible = false;
        this.game.uiContainer.addChild(prompt);
        trigger.prompt = prompt;
      }

      this.dialogueTriggers.push(trigger);
    }

    for (const ent of level.entities.filter(e => e.type === 'Memory')) {
      const text = (ent.fields['text'] ?? '') as string;
      if (!text) continue;
      const speaker = (ent.fields['speaker'] ?? undefined) as string | undefined;
      const portrait = (ent.fields['portrait'] ?? undefined) as string | undefined;

      const eventKey = `memory_${level.identifier}_${ent.iid}`;
      if (this.unlockedEvents.has(eventKey)) continue;

      this.dialogueTriggers.push({
        x: ent.px[0] - TRIGGER_W / 2,
        y: ent.px[1] - TRIGGER_H,
        w: TRIGGER_W,
        h: TRIGGER_H,
        lines: [{ text, speaker, portrait }],
        triggerType: 'area',
        once: true,
        freezePlayer: true,
        eventName: eventKey,
        active: false,
        fired: false,
        cooldown: 0,
        prompt: null,
      });
    }
  }

  /** Check dialogue triggers each frame. */
  private updateDialogueTriggers(dt: number): void {
    if (!this.loreDisplay) return;
    if (this.loreDisplay.isActive) {
      this.loreDisplay.update(dt);
      return;
    }

    const pcx = this.player.x + this.player.width / 2;
    const pcy = this.player.y + this.player.height / 2;

    for (const t of this.dialogueTriggers) {
      if (t.fired) continue;
      if (t.cooldown > 0) { t.cooldown -= dt; continue; }
      const inside = pcx >= t.x && pcx < t.x + t.w && pcy >= t.y && pcy < t.y + t.h;

      if (t.triggerType === 'area') {
        if (inside && !t.active) {
          t.active = true;
          this.loreDisplay.showDialogue(t.lines, t.freezePlayer);
          if (t.once) {
            t.fired = true;
            if (t.eventName) this.unlockedEvents.add(t.eventName);
          } else {
            t.cooldown = 1000;
          }
          break;
        }
        if (!inside && t.active) t.active = false;
      } else {
        if (t.prompt) {
          t.prompt.visible = inside;
          if (inside) {
            const us = this.game.uiScale;
            const cam = this.game.camera;
            const sx = (t.x + t.w / 2 - cam.renderX + GAME_WIDTH / 2) * us - t.prompt.width / 2;
            const sy = (t.y - cam.renderY + GAME_HEIGHT / 2 - 16) * us;
            t.prompt.x = Math.round(sx);
            t.prompt.y = Math.round(sy);
          }
        }
        if (inside && this.game.input.isJustPressed(GameAction.ATTACK)) {
          this.game.input.consumeJustPressed(GameAction.ATTACK);
          this.loreDisplay.showDialogue(t.lines, t.freezePlayer);
          if (t.once) {
            t.fired = true;
            if (t.eventName) this.unlockedEvents.add(t.eventName);
            if (t.prompt?.parent) { t.prompt.parent.removeChild(t.prompt); t.prompt = null; }
          } else {
            t.cooldown = 1000;
          }
          break;
        }
      }
    }
  }

  /**
   * (Documents/Research/RoomTransition_Readability_Research.md A2)
   *
   * ?�평 ?��?(w/e): ??0 ?�는 gridW-1???�로�??�캔 ???�속 passable run 마다 글로우 1�?
   * ?�직 ?��?(n/s): ??0 ?�는 gridH-1??가로로 ?�캔 ???�일.
   * passable ?�정?� checkLevelEdges() ?� ?�일(빈칸 0 ?�는 �?2).
   */
  private spawnExitGlows(level: LdtkLevel): void {
    const TS = 16;
    const grid = level.collisionGrid;
    const W = level.gridW;
    const H = level.gridH;
    const passable = (t: number | undefined) => t === 0 || t === 2;

    const hasNeighbor = (dir: 'n' | 's' | 'e' | 'w') =>
      (level.dirNeighbors[dir]?.length ?? 0) > 0;

    // Check if any neighbor in a direction has a save point
    const neighborHasSave = (dir: 'n' | 's' | 'e' | 'w'): boolean => {
      const neighbors = level.dirNeighbors[dir] ?? [];
      for (const nId of neighbors) {
        const nLevel = this.loader.getLevel(nId);
        if (nLevel?.entities.some(e => e.type === 'SavePoint')) return true;
      }
      return false;
    };

    const addRuns = (
      dir: ExitGlowDir,
      count: number,
      isPassableAt: (i: number) => boolean,
      toWorld: (runStart: number, runLen: number) => { x: number; y: number; span: number },
      isSaveRoom: boolean,
    ) => {
      let i = 0;
      while (i < count) {
        if (!isPassableAt(i)) { i++; continue; }
        let j = i;
        while (j < count && isPassableAt(j)) j++;
        const { x, y, span } = toWorld(i, j - i);
        const glow = new ExitGlow(dir, x, y, span, isSaveRoom);
        this.entityLayer.addChild(glow.container);
        this.exitGlows.push(glow);
        i = j;
      }
    };

    // Right edge: column W-1, rows 0..H-1
    if (hasNeighbor('e')) {
      addRuns('right', H,
        (r) => passable(grid[r]?.[W - 1]),
        (rs, rl) => ({ x: W * TS, y: rs * TS, span: rl * TS }),
        neighborHasSave('e'),
      );
    }
    // Left edge: column 0
    if (hasNeighbor('w')) {
      addRuns('left', H,
        (r) => passable(grid[r]?.[0]),
        (rs, rl) => ({ x: 0, y: rs * TS, span: rl * TS }),
        neighborHasSave('w'),
      );
    }
    // Bottom edge: row H-1
    if (hasNeighbor('s')) {
      addRuns('down', W,
        (c) => passable(grid[H - 1]?.[c]),
        (cs, cl) => ({ x: cs * TS, y: H * TS, span: cl * TS }),
        neighborHasSave('s'),
      );
    }
    // Top edge: row 0
    if (hasNeighbor('n')) {
      addRuns('up', W,
        (c) => passable(grid[0]?.[c]),
        (cs, cl) => ({ x: cs * TS, y: 0, span: cl * TS }),
        neighborHasSave('n'),
      );
    }
  }

  private spawnSpikes(level: LdtkLevel): void {
    for (const sp of this.spikes) sp.destroy();
    this.spikes = [];

    const spikeEnts = level.entities.filter(e => e.type === 'Spike');
    for (const ent of spikeEnts) {
      const spike = new Spike(ent.px[0], ent.px[1], ent.width, ent.height);
      this.spikes.push(spike);
      this.entityLayer.addChild(spike.container);
    }
  }

  /** Apply updraft force when player stands on IntGrid value 4, + render particles */
  private applyUpdrafts(dt: number): void {
    // Use player's active roomData (builder grid when riding, host grid otherwise)
    this.updraftSystem.update(dt, this.player, this.player.roomData, this.game.camera);
  }

  /** Check player overlap with spikes ??damage + teleport to last safe ground. */
  /** IntGrid spike (value 5) check ??replaces Entity-based Spike AABB loop. */
  private checkSpikeContact(): void {
    if (this.player.invincible || this.player.hp <= 0) return;

    if (!isInSpike(this.player.x, this.player.y, this.player.width, this.player.height, this.player.roomData)) return;

    // 20% max HP damage
    const dmg = Math.max(1, Math.floor(this.player.maxHp * 0.2));
    this.player.lastDamageSource = 'spike';
    this.player.hp -= dmg;
    this.hud.flashDamage();
    this.player.invincible = true;
    this.player.invincibleTimer = 1000;

    // Feedback ??strong hitstop for spike pain
    this.game.hitstopFrames = 16;
    this.game.camera.shake(5);
    this.screenFlash.flashDamage(true);
    this.player.triggerFlash();
    this.dmgNumbers.spawn(
      this.player.x + this.player.width / 2,
      this.player.y - 8, dmg, true,
    );

    // Teleport to last safe ground
    this.player.x = this.player.lastSafeX;
    this.player.y = this.player.lastSafeY;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.savePrevPosition();

    if (this.player.hp <= 0) {
      this.player.hp = 0;
      this.player.onDeath();
      this.game.hitstopFrames = 8;
      this.screenFlash.flashDamage(true);
    }
  }

  private spawnCrackedFloors(level: LdtkLevel): void {
    for (const cf of this.crackedFloors) cf.destroy();
    this.crackedFloors = [];

    const entities = level.entities.filter(e => e.type === 'CrackedFloor');
    for (const ent of entities) {
      const key = `crack_${level.identifier}_${ent.px[0]}_${ent.px[1]}`;
      // Already destroyed in a previous session
      if (this.unlockedEvents.has(key)) continue;

      const cf = new CrackedFloor(ent.px[0], ent.px[1], ent.width, ent.height);
      (cf as any)._key = key;
      cf.injectCollision(this.collisionGrid);
      this.crackedFloors.push(cf);
      this.entityLayer.addChild(cf.container);
    }
  }

  private spawnSecretWalls(level: LdtkLevel): void {
    for (const sw of this.secretWalls) sw.destroy();
    this.secretWalls = [];

    const entities = level.entities.filter(e => e.type === 'SecretWall');
    for (const ent of entities) {
      const key = `secret_${level.identifier}_${ent.px[0]}_${ent.px[1]}`;
      // Already destroyed in a previous session — re-apply the break side
      // effects to the freshly-cloned level state (collisionGrid was restored
      // from LDtk's master IntGrid in loadLevel, and AutoTile sprites were
      // re-rendered). Without this, the invisible wall tile still blocks
      // the player and traps them on re-entry.
      if (this.unlockedEvents.has(key)) {
        // LDtk SecretWall pivot = [0,1] (bottom-left). Convert to top-left
        // to match SecretWall constructor / recordCollision math.
        const topLeftX = ent.px[0];
        const topLeftY = ent.px[1] - ent.height;
        const startCol = Math.floor(topLeftX / 16);
        const startRow = Math.floor(topLeftY / 16);
        const cols = Math.ceil(ent.width / 16);
        const rows = Math.ceil(ent.height / 16);
        const gridH = this.collisionGrid.length;
        const gridW = gridH > 0 ? this.collisionGrid[0].length : 0;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const gr = startRow + r;
            const gc = startCol + c;
            if (gr >= 0 && gr < gridH && gc >= 0 && gc < gridW) {
              this.collisionGrid[gr][gc] = 0;
            }
          }
        }
        this.renderer.clearTilesInRect(topLeftX, topLeftY, ent.width, ent.height);
        continue;
      }

      const mode = ((ent.fields['Mode'] ?? 'Item') as string).toLowerCase() as 'item' | 'passage';
      const hintAlpha = (ent.fields['HintAlpha'] as number) ?? 0.08;
      // LDtk enum uses PascalCase (Sword_rustborn), master sheet uses lowercase (sword_rustborn)
      const rawItemId = (ent.fields['ItemId'] as string) ?? null;
      const itemId = rawItemId ? rawItemId.toLowerCase() : null;

      const wall = new SecretWall({
        x: ent.px[0],
        y: ent.px[1],
        width: ent.width,
        height: ent.height,
        mode,
        hintAlpha,
      });
      (wall as any)._key = key;
      (wall as any)._itemId = itemId;
      // IntGrid is already solid(1) ??just record which cells to clear on break
      wall.recordCollision(this.collisionGrid);
      this.secretWalls.push(wall);
      // Add to wallLayer so PaletteSwapFilter applies to hint cracks
      this.renderer.wallLayer.addChild(wall.container);
    }
  }

  private checkAttackOnSecretWalls(): void {
    if (!this.player.isAttackActive()) return;

    const step = this.player.getAttackStep(this.player.comboIndex);
    if (!step) return;

    const hitbox = getAttackHitbox(
      this.player.x, this.player.y, this.player.width, this.player.height,
      this.player.facingRight ?? true, step,
    );

    const dirX = (this.player.facingRight ?? true) ? 1 : -1;

    for (let i = this.secretWalls.length - 1; i >= 0; i--) {
      const wall = this.secretWalls[i];
      if (wall.destroyed) continue;
      if (!aabbOverlap(hitbox, wall.getHitAABB())) continue;

      // Break the wall
      if (wall.break(this.collisionGrid, this.game, dirX)) {
        const key = (wall as any)._key as string;
        if (key) this.unlockedEvents.add(key);

        // Erase the AutoTile wall sprites at this position
        this.renderer.clearTilesInRect(wall.x, wall.y, wall.width, wall.height);

        // Mode=Item: spawn item drop at wall center
        if (wall.mode === 'item') {
          const itemId = (wall as any)._itemId as string | null;
          if (itemId) {
            this.spawnFixedItemAt(wall.centerX, wall.centerY, itemId);
          } else {
            // No ItemId set ??random weapon drop (minimum Rare)
            const pool = SWORD_DEFS.filter(d => d.rarity !== 'normal');
            const def = pool[Math.floor(Math.random() * pool.length)] ?? SWORD_DEFS[0];
            const item = createItem(def, def.rarity);
            const drop = new ItemDropEntity(wall.centerX, wall.centerY, item);
            this.drops.push(drop);
            this.entityLayer.addChild(drop.container);
          }
          this.toast.show('Secret Found!', 0xffd700);
        } else {
          this.toast.show('Path Opened!', 0x44ffaa);
        }

        wall.destroy();
        this.secretWalls.splice(i, 1);
      }
    }
  }

  /**
   * Spawn an item by master ItemID. Handles weapons, currency, consumables.
   * Uses Content_Item_Master.csv as the unified registry.
   */
  private spawnFixedItemAt(x: number, y: number, itemId: string, itemKey?: string): void {
    const master = getMasterItem(itemId);
    if (!master) {
      // Fallback: try direct weapon lookup for backwards compatibility
      const loreDef = LORE_WEAPONS.get(itemId);
      const def: WeaponDef = loreDef
        ? loreWeaponToWeaponDef(loreDef)
        : (SWORD_DEFS.find(d => d.id === itemId) ?? SWORD_DEFS[0]);
      const item = createItem(def, def.rarity);
      const drop = new ItemDropEntity(x, y, item);
      if (itemKey) (drop as any)._itemKey = itemKey;
      this.drops.push(drop);
      this.entityLayer.addChild(drop.container);
      return;
    }

    switch (master.category) {
      case 'weapon': {
        const key = master.sourceKey;
        const loreDef = master.sourceSheet === 'Weapon_Lore' ? LORE_WEAPONS.get(key) : null;
        const def: WeaponDef = loreDef
          ? loreWeaponToWeaponDef(loreDef)
          : (SWORD_DEFS.find(d => d.id === key) ?? SWORD_DEFS[0]);
        const item = createItem(def, def.rarity);
        const drop = new ItemDropEntity(x, y, item);
        if (itemKey) (drop as any)._itemKey = itemKey;
        this.drops.push(drop);
        this.entityLayer.addChild(drop.container);
        break;
      }
      case 'currency': {
        const match = master.name.match(/\((\d+)\)/);
        const amount = match ? parseInt(match[1], 10) : 100;
        const gp = new GoldPickup(x, y, amount);
        if (itemKey) (gp as any)._key = itemKey;
        this.goldPickups.push(gp);
        this.entityLayer.addChild(gp.container);
        break;
      }
      case 'consumable': {
        this.toast.show(master.name, 0x44ff88);
        break;
      }
      default:
        break;
    }
  }

  /** Handle dive attack landing ??area damage + cracked floor shatter. */
  /** Surge flight ??break GrowingWalls and CrackedFloors on body contact. */
  private handleSurgeContact(): void {
    const pBox = {
      x: this.player.x, y: this.player.y,
      width: this.player.width, height: this.player.height,
    };

    // Break growing walls
    for (let i = this.growingWalls.length - 1; i >= 0; i--) {
      const wall = this.growingWalls[i];
      if (wall.destroyed) continue;
      if (aabbOverlap(pBox, wall.getAABB())) {
        wall.shatter(this.collisionGrid);
        const key = (wall as any)._key as string;
        if (key) this.unlockedEvents.add(key);
        this.game.hitstopFrames += 4;
        this.screenFlash.flash(0xffffff, 0.4, 150);
        this.game.camera.shake(8);
        this.toast.show('Wall Shattered!', 0xffaa44);
        for (let j = 0; j < 6; j++) {
          this.hitSparks.spawn(
            wall.x + Math.random() * wall.width,
            wall.y + Math.random() * wall.height,
            true, 0,
          );
        }
        wall.destroy();
        this.growingWalls.splice(i, 1);
      }
    }

    // Break cracked floors
    for (let i = this.crackedFloors.length - 1; i >= 0; i--) {
      const cf = this.crackedFloors[i];
      if (cf.destroyed) continue;
      if (aabbOverlap(pBox, cf.getAABB())) {
        cf.shatter(this.collisionGrid);
        const key = (cf as any)._key as string;
        if (key) this.unlockedEvents.add(key);
        this.game.hitstopFrames += 4;
        this.screenFlash.flash(0xffffff, 0.4, 150);
        this.game.camera.shake(10);
        this.toast.show('Floor Destroyed!', 0xffaa44);
        cf.destroy();
        this.crackedFloors.splice(i, 1);
      }
    }
  }

  private handleDiveLanding(): void {
    const dist = this.player.diveFallDistance;
    const px = this.player.x + this.player.width / 2;
    const py = this.player.y + this.player.height;

    // Damage tier based on fall distance
    let dmgMult: number;
    let radius: number;
    if (dist > 128) {
      dmgMult = 2.5; radius = 32;
    } else if (dist > 64) {
      dmgMult = 1.5; radius = 24;
    } else {
      dmgMult = 1.0; radius = 16;
    }

    // Camera shake + hitstop proportional to fall distance
    const shakeIntensity = Math.min(8, 3 + dist / 32);
    this.game.camera.shake(shakeIntensity);
    this.game.hitstopFrames = dist > 128 ? 8 : dist > 64 ? 6 : 4;
    this.screenFlash.flashHit(dist > 64);

    // Dust particles at landing point
    for (let i = 0; i < 4; i++) {
      this.hitSparks.spawn(px + (Math.random() - 0.5) * radius, py - 4, dist > 64, 0);
    }

    // Area damage to enemies
    const impactBox = { x: px - radius, y: py - 8, width: radius * 2, height: 16 };
    const dmg = Math.floor(this.player.atk * dmgMult);
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      const enemyBox = { x: enemy.x, y: enemy.y, width: enemy.width, height: enemy.height };
      if (aabbOverlap(impactBox, enemyBox)) {
        enemy.hp -= dmg;
        enemy.onHit(0, -80, 200);
        if (enemy.hp <= 0) {
          enemy.hp = 0;
          enemy.onDeath();
        }
        this.dmgNumbers.spawn(enemy.x + enemy.width / 2, enemy.y - 8, dmg, true);
        this.hitSparks.spawn(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, true, 0);
      }
    }

    // Shatter cracked floors
    for (let i = this.crackedFloors.length - 1; i >= 0; i--) {
      const cf = this.crackedFloors[i];
      if (cf.destroyed) continue;
      const cfBox = cf.getAABB();
      // Check if landing point is on or near the cracked floor
      const landBox = { x: px - radius, y: py - 4, width: radius * 2, height: 8 };
      if (aabbOverlap(landBox, cfBox)) {
        cf.shatter(this.collisionGrid);
        const key = (cf as any)._key as string;
        if (key) this.unlockedEvents.add(key);
        // Extra effects for floor break
        this.game.hitstopFrames += 4;
        this.screenFlash.flash(0xffffff, 0.4, 150);
        this.game.camera.shake(10);
        this.toast.show('Floor Destroyed!', 0xffaa44);
        cf.destroy();
        this.crackedFloors.splice(i, 1);
      }
    }

    // Shatter growing walls
    const wallBox = { x: px - radius, y: py - 12, width: radius * 2, height: 16 };
    for (let i = this.growingWalls.length - 1; i >= 0; i--) {
      const wall = this.growingWalls[i];
      if (wall.destroyed) continue;
      if (aabbOverlap(wallBox, wall.getAABB())) {
        wall.shatter(this.collisionGrid);
        const wkey = (wall as any)._key as string;
        if (wkey) this.unlockedEvents.add(wkey);
        this.game.hitstopFrames += 4;
        this.screenFlash.flash(0xffffff, 0.4, 150);
        this.game.camera.shake(10);
        this.toast.show('Wall Shattered!', 0xffaa44);
        // Spawn debris particles
        for (let j = 0; j < 6; j++) {
          this.hitSparks.spawn(
            wall.x + Math.random() * wall.width,
            wall.y + Math.random() * wall.height,
            true, 0,
          );
        }
        wall.destroy();
        this.growingWalls.splice(i, 1);
      }
    }
  }

  private spawnGrowingWalls(level: LdtkLevel): void {
    for (const wall of this.growingWalls) wall.destroy();
    this.growingWalls = [];

    const wallEntities = level.entities.filter(e => e.type === 'GrowingWall');
    for (const ent of wallEntities) {
      const key = `gwall_${level.identifier}_${ent.px[0]}_${ent.px[1]}`;
      if (this.unlockedEvents.has(key)) continue; // already destroyed

      const wall = new GrowingWall(ent.px[0], ent.px[1], ent.width, ent.height);
      (wall as any)._key = key;
      wall.injectCollision(this.collisionGrid);
      this.growingWalls.push(wall);
      this.entityLayer.addChild(wall.container);
    }
  }

  private spawnSwitches(level: LdtkLevel): void {
    for (const sw of this.switches) sw.destroy();
    this.switches = [];

    const switchEntities = level.entities.filter(e => e.type === 'Switch');
    for (const ent of switchEntities) {
      // targetDoor / TargetDoor is an EntityRef: { entityIid: "...", ... } or null
      const ref = (ent.fields['TargetDoor'] ?? ent.fields['targetDoor']) as { entityIid: string } | null;
      if (!ref?.entityIid) continue;

      const sw = new Switch(
        ent.px[0], ent.px[1],
        ent.width, ent.height,
        ref.entityIid,
      );
      // Already activated ??skip collision injection, just show as broken
      if (this.unlockedEvents.has(ref.entityIid)) {
        sw.activate(this.collisionGrid);
      } else {
        sw.injectCollision(this.collisionGrid);
      }
      this.switches.push(sw);
      this.entityLayer.addChild(sw.container);
    }
  }

  /** Check player attack against switches. */
  /** Check player attack against cracked floors/walls ??normal attack can break them. */
  private checkAttackOnCrackedFloors(): void {
    if (!this.player.isAttackActive()) return;

    const step = this.player.getAttackStep(this.player.comboIndex);
    if (!step) return;

    const hitbox = getAttackHitbox(
      this.player.x, this.player.y, this.player.width, this.player.height,
      this.player.facingRight ?? true, step,
    );

    for (let i = this.crackedFloors.length - 1; i >= 0; i--) {
      const cf = this.crackedFloors[i];
      if (cf.destroyed) continue;
      if (!aabbOverlap(hitbox, cf.getAABB())) continue;

      cf.shatter(this.collisionGrid);
      const key = (cf as any)._key as string;
      if (key) this.unlockedEvents.add(key);
      this.game.hitstopFrames += 4;
      this.screenFlash.flash(0xffffff, 0.4, 150);
      this.game.camera.shake(6);
      this.toast.show('Wall Destroyed!', 0xffaa44);
      cf.destroy();
      this.crackedFloors.splice(i, 1);
    }
  }

  private checkAttackOnSwitches(): void {
    if (!this.player.isAttackActive()) return;

    const step = this.player.getAttackStep(this.player.comboIndex);
    if (!step) return;

    const hitbox = getAttackHitbox(
      this.player.x, this.player.y, this.player.width, this.player.height,
      this.player.facingRight ?? true, step,
    );

    for (const sw of this.switches) {
      if (sw.activated) continue;
      if (!aabbOverlap(hitbox, sw.getHitAABB())) continue;

      if (sw.activate(this.collisionGrid)) {
        this.game.camera.shake(3);
        this.screenFlash.flashHit(false);
        this.unlockDoorByIid(sw.targetDoorIid);
        this.toast.show('Switch Destroyed!', 0x44ffaa);
      }
    }
  }

  /** IntGrid breakable (9) ??3 SWINGS to destroy ??air(0).
   *  Each attack swing (combo step) counts as 1 hit per tile. Subsequent
   *  frames of the same swing are ignored so holding attack doesn't insta-break. */
  private checkAttackOnBreakables(): void {
    if (!this.player.isAttackActive()) {
      // Attack ended ??reset swing tracking
      if (this.breakableHitThisSwing.size > 0) {
        this.breakableHitThisSwing.clear();
        this.breakableLastCombo = -1;
      }
      return;
    }
    // New combo step = new swing opportunity
    if (this.player.comboIndex !== this.breakableLastCombo) {
      this.breakableHitThisSwing.clear();
      this.breakableLastCombo = this.player.comboIndex;
    }
    const step = this.player.getAttackStep(this.player.comboIndex);
    if (!step) return;
    const hitbox = getAttackHitbox(
      this.player.x, this.player.y, this.player.width, this.player.height,
      this.player.facingRight ?? true, step,
    );
    const T = 16;
    const HITS_TO_BREAK = 3;
    const l = Math.floor(hitbox.x / T);
    const r = Math.floor((hitbox.x + hitbox.width - 1) / T);
    const t = Math.floor(hitbox.y / T);
    const b = Math.floor((hitbox.y + hitbox.height - 1) / T);
    let broken = false;
    for (let row = t; row <= b; row++) {
      for (let col = l; col <= r; col++) {
        if ((this.collisionGrid[row]?.[col] ?? 0) !== 9) continue;
        const key = `${col},${row}`;
        if (this.breakableHitThisSwing.has(key)) continue; // already hit this swing
        this.breakableHitThisSwing.add(key);
        const hits = (this.breakableHits.get(key) ?? 0) + 1;
        if (hits >= HITS_TO_BREAK) {
          this.collisionGrid[row][col] = 0;
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
      this.toast.show('Wall Destroyed!', 0xffaa44);
      this.rerenderTilemap();
    }
  }

  /**
   * Spawn enemies from LDtk Enemy_Spawn entities. Falls back to random
   * spawning if no Enemy_Spawn entities are placed in the level.
   */
  private spawnEnemiesFromLdtk(level: LdtkLevel): void {
    // Direct entity types (Slime, Boss, etc.) ??spawn without Enemy_Spawn wrapper
    const directEnemies = level.entities.filter(e => e.type === 'Slime');
    for (const ent of directEnemies) {
      const enemy = new Slime();
      enemy.x = ent.px[0];
      enemy.y = ent.px[1] - enemy.height;
      enemy.roomData = this.collisionGrid;
      enemy.target = this.player;
      this.enemies.push(enemy);
      this.entityLayer.addChild(enemy.container);
    }

    // Boss entities ??Guardian (기억???�문??. Skip if already killed.
    const bossEntities = level.entities.filter(e => e.type === 'Boss');
    for (const ent of bossEntities) {
      const bossKey = `boss_${level.identifier}_${ent.px[0]}_${ent.px[1]}`;
      if (this.unlockedEvents.has(bossKey)) continue; // already killed permanently

      const boss = new Guardian();
      (boss as any)._isBoss = true;
      (boss as any)._bossKey = bossKey;
      boss.x = ent.px[0] - boss.width / 2;
      boss.y = ent.px[1] - boss.height;
      boss.roomData = this.collisionGrid;
      boss.target = this.player;
      this.enemies.push(boss);
      this.entityLayer.addChild(boss.container);

      // Activate boss lock ??seal exits with temporary doors
      this.activateBossLock(level, bossKey);
    }

    const spawners = level.entities.filter(e => e.type === 'Enemy_Spawn');

    if (spawners.length > 0) {
      for (const spawner of spawners) {
        const enemyType = (spawner.fields['type'] as string) ?? 'Skeleton';
        const enemyLevel = (spawner.fields['level'] as number) ?? 1;

        // Boss type needs special handling (bossKey + skip if killed)
        let enemy: Enemy<string>;
        if (enemyType === 'Boss') {
          const bossKey = `boss_${level.identifier}_${spawner.px[0]}_${spawner.px[1]}`;
          if (this.unlockedEvents.has(bossKey)) continue;
          enemy = createEnemy('Boss', enemyLevel);
          (enemy as any)._bossKey = bossKey;
          // Arena lock ??direct 'Boss' ?�티??경로?� ?�일?�게 Enemy_Spawn 경로?�서??
          // 보스�??�출??봉쇄?�다. ?�락 ???�레?�어가 교전 ??방에???�탈 가??
          this.activateBossLock(level, bossKey);
        } else {
          enemy = createEnemy(enemyType, enemyLevel);
        }
        // Golden monster portal callback
        if (enemy instanceof GoldenMonster) {
          enemy.onDeathCallback = (x, y, rarity) => this.spawnPortal(x, y, rarity, 'monster');
        }
        enemy.x = spawner.px[0];
        enemy.y = spawner.px[1] - enemy.height;
        enemy.roomData = this.collisionGrid;
        enemy.target = this.player;

        // Link to LockedDoors ??killing this enemy unlocks target doors
        const targetField = spawner.fields['TargetDoor'] ?? spawner.fields['targetDoor'];
        const targetRefs: string[] = [];
        if (Array.isArray(targetField)) {
          for (const ref of targetField) {
            if (ref?.entityIid) targetRefs.push(ref.entityIid);
          }
        } else if (targetField && (targetField as any).entityIid) {
          targetRefs.push((targetField as any).entityIid);
        }
        if (targetRefs.length > 0) {
          (enemy as any)._unlockTargetIids = targetRefs;
        }

        this.enemies.push(enemy);
        this.entityLayer.addChild(enemy.container);
      }
      return;
    }
    // No fallback ??only LDtk-placed enemies spawn in the world
  }

  /**
   * Convert LDtk entity instances into gameplay objects.
   * Player entity is handled separately in placePlayer().
   */
  private processLdtkEntities(level: LdtkLevel): void {
    for (const ent of level.entities) {
      switch (ent.type) {
        case 'Item': {
          const itemKey = `${level.identifier}:${ent.px[0]},${ent.px[1]}`;
          if (this.collectedItems.has(itemKey)) break;

          const rawItemId = (ent.fields['ItemId'] ?? ent.fields['itemId'] ?? ent.fields['itemID'] ?? '') as string;
          const itemId = rawItemId.toLowerCase();
          // Use unified spawnFixedItemAt which handles weapons, currency,
          // consumables via Content_Item_Master.csv lookup.
          this.spawnFixedItemAt(ent.px[0], ent.px[1], itemId, itemKey);
          trackItemDrop({
            source: 'hand_placed',
            item_id: itemId,
            item_rarity: getMasterItem(itemId)?.rarity ?? 'normal',
            level_id: level.identifier,
          });
          break;
        }
        case 'GameSaver': {
          // Save point ??pivot bottom-left, center the marker on entity
          const spx = ent.px[0] + ent.width / 2;
          const spy = ent.px[1] - ent.height / 2;
          const marker = new Graphics();
          marker.rect(-12, -12, 24, 24).fill({ color: 0x2244cc, alpha: 0.85 });
          marker.rect(-12, -12, 24, 24).stroke({ color: 0x3366ff, width: 2 });
          // Pulsing diamond inside
          marker.moveTo(0, -7).lineTo(7, 0).lineTo(0, 7).lineTo(-7, 0).closePath()
            .fill({ color: 0x88aaff, alpha: 0.5 });
          marker.x = spx;
          marker.y = spy;
          this.entityLayer.addChild(marker);
          // Context prompt ??rendered in uiContainer for crisp text
          const us = this.game.uiScale;
          const prompt = KeyPrompt.createPrompt('C', 'Save', us);
          prompt.visible = false;
          this.game.uiContainer.addChild(prompt);
          this.savePoints.push({ x: spx, y: spy, gfx: marker, prompt });
          break;
        }
        case 'GoldPickup': {
          const goldKey = `gold_${level.identifier}_${ent.px[0]}_${ent.px[1]}`;
          if (this.collectedItems.has(goldKey)) break;
          const amount = (ent.fields['Amount'] ?? ent.fields['amount'] ?? 10) as number;
          const gp = new GoldPickup(ent.px[0], ent.px[1], amount);
          (gp as any)._key = goldKey;
          this.goldPickups.push(gp);
          this.entityLayer.addChild(gp.container);
          break;
        }
        case 'HealingPickup': {
          const healKey = `heal_${level.identifier}_${ent.px[0]}_${ent.px[1]}`;
          if (this.collectedItems.has(healKey)) break;
          const healAmount = (ent.fields['HealAmount'] ?? ent.fields['healAmount'] ?? 30) as number;
          const heal = new HealingPickup(ent.px[0], ent.px[1], healAmount);
          (heal as any)._key = healKey;
          this.healingPickups.push(heal);
          this.entityLayer.addChild(heal.container);
          break;
        }
        case 'HealthShard': {
          const shardKey = `shard_${level.identifier}_${ent.px[0]}_${ent.px[1]}`;
          if (this.collectedRelics.has(shardKey)) break;
          const hpBonus = (ent.fields['HpBonus'] ?? ent.fields['hpBonus'] ?? 10) as number;
          const shard = new HealthShard(ent.px[0], ent.px[1], hpBonus);
          (shard as any)._key = shardKey;
          this.healthShards.push(shard);
          this.entityLayer.addChild(shard.container);
          break;
        }
        case 'AbilityRelic': {
          // Ability pickup ??golden glowing marker
          const abilityName = ent.fields['ability'] as string ?? 'wallJump';
          const relicKey = `relic_${level.identifier}_${ent.px[0]}_${ent.px[1]}`;
          if (!this.collectedRelics.has(relicKey)) {
            const relic = new Graphics();
            relic.circle(0, 0, 8).fill({ color: 0xffd700, alpha: 0.8 });
            relic.circle(0, 0, 5).fill({ color: 0xffffff, alpha: 0.6 });
            relic.x = ent.px[0];
            relic.y = ent.px[1];
            this.entityLayer.addChild(relic);
            this.relicMarkers.push({ gfx: relic, abilityName, relicKey });
          }
          break;
        }
        case 'SecretArea': {
          // TODO: secret area trigger with jingle
          break;
        }
        case 'EndingTrigger': {
          this.endingTriggers.push({
            x: ent.px[0],
            y: ent.px[1] - ent.height,
            w: ent.width,
            h: ent.height,
          });
          break;
        }
        case 'Teleport': {
          // TODO: teleport to destination entity
          break;
        }
        case 'Exit': {
          // Exits are handled by edge detection, not entity interaction
          break;
        }
        case 'Camera': {
          // Pivot bottom-left
          this.cameraZones.push({
            x: ent.px[0],
            y: ent.px[1] - ent.height,
            w: ent.width,
            h: ent.height,
            zoom: ent.fields['zoom'] as number ?? 1.0,
            deadZoneX: ent.fields['deadZoneX'] as number ?? 32,
            deadZoneY: ent.fields['deadZoneY'] as number ?? 24,
            lookAheadDistance: ent.fields['lookAheadDistance'] as number ?? 0,
            followLerp: ent.fields['followLerp'] as number ?? 0.08,
            zoomLerp: ent.fields['zoomLerp'] as number ?? 0.05,
            entireLevel: ent.fields['entireLevel'] as boolean ?? false,
          });
          break;
        }
        // Player handled in placePlayer()
        // Ladder removed
      }
    }
  }

  /**
   * Spawn altars from LDtk Altar entities. Falls back to random if none placed.
   */
  private spawnAltarsFromLdtk(level: LdtkLevel): void {
    const altarEnts = level.entities.filter(e => e.type === 'Altar');

    if (altarEnts.length > 0) {
      for (const ent of altarEnts) {
        const altar = new Altar(ent.px[0], ent.px[1]);
        this.altars.push(altar);
        this.entityLayer.addChild(altar.container);
      }
      return;
    }
    // No fallback ??only LDtk-placed altars in the world
  }

  // ---------------------------------------------------------------------------
  // Room transition ??edge detection
  // ---------------------------------------------------------------------------

  /**
   * Check if player is inside a Camera zone and apply/restore settings with lerp.
   */
  private updateCameraZones(): void {
    const pcx = this.player.x + this.player.width / 2;
    const pcy = this.player.y + this.player.height / 2;
    const cam = this.game.camera;

    // Being inside the Giant Builder's volume forces zoom 1.0 (ignore level
    // camera zones). Uses AABB overlap so the override persists while the
    // player is airborne (jumping) inside the builder.
    let insideZone: typeof this.cameraZones[number] | null = null;
    if (!this.playerInBuilder) {
      for (const zone of this.cameraZones) {
        if (zone.entireLevel ||
            (pcx >= zone.x && pcx <= zone.x + zone.w &&
             pcy >= zone.y && pcy <= zone.y + zone.h)) {
          insideZone = zone;
          break;
        }
      }
    }

    if (insideZone && insideZone !== this.activeCameraZone) {
      // Entered a new camera zone ??apply with lerp
      this.activeCameraZone = insideZone;
      cam.deadZoneX = insideZone.deadZoneX;
      cam.deadZoneY = insideZone.deadZoneY;
      cam.lookAheadDistance = insideZone.lookAheadDistance;
      cam.followLerp = insideZone.followLerp;
      cam.zoomTo(insideZone.zoom, insideZone.zoomLerp);
    } else if (!insideZone && this.activeCameraZone) {
      // Exited all camera zones ??restore defaults with lerp
      this.activeCameraZone = null;
      cam.deadZoneX = 32;
      cam.deadZoneY = 24;
      cam.lookAheadDistance = 0;
      cam.followLerp = 0.08;
      cam.zoomTo(1.0, 0.05);
    }
  }

  /**
   * Detect when the player crosses a level edge and find the adjacent level to
   * transition into. Thresholds use ±4 px tolerance to give a comfortable feel.
   */
  private checkLevelEdges(): void {
    if (this.transitionState !== 'none') return;

    const px = this.player.x;
    const py = this.player.y;
    const pw = this.player.width;
    const ph = this.player.height;
    const level = this.currentLevel;
    const grid = this.collisionGrid;

    let direction: 'left' | 'right' | 'up' | 'down' | null = null;

    // GridVania transition: detect player near open edge tiles (0 = passage)
    // Check right edge: player near right side + last column has open tiles
    const playerTileY = Math.floor((py + ph / 2) / TILE_SIZE);
    const playerTileX = Math.floor((px + pw / 2) / TILE_SIZE);

    // Edge tile is passable if empty (0) or water (2)
    const passable = (tile: number | undefined) => tile === 0 || tile === 2;

    if (px + pw > level.pxWid - TILE_SIZE) {
      const edgeCol = level.gridW - 1;
      if (playerTileY >= 0 && playerTileY < level.gridH && passable(grid[playerTileY]?.[edgeCol])) {
        direction = 'right';
      }
    } else if (px < TILE_SIZE) {
      if (playerTileY >= 0 && playerTileY < level.gridH && passable(grid[playerTileY]?.[0])) {
        direction = 'left';
      }
    } else if (py + ph > level.pxHei - TILE_SIZE) {
      const edgeRow = level.gridH - 1;
      if (playerTileX >= 0 && playerTileX < level.gridW && passable(grid[edgeRow]?.[playerTileX])) {
        direction = 'down';
      }
    } else if (py < TILE_SIZE) {
      if (playerTileX >= 0 && playerTileX < level.gridW && passable(grid[0]?.[playerTileX])) {
        direction = 'up';
      }
    }

    if (direction === null) return;

    // In a tunnel: reaching the bottom edge ??warp to Item World
    if (this.inItemTunnel && direction === 'down') {
      this.startTunnelExitTransition();
      return;
    }

    // Pass player's world position (center) so we pick the correct neighbor
    // when multiple neighbors share the same edge (e.g. two rooms to the right)
    const playerWorldX = this.currentLevel.worldX + px + pw / 2;
    const playerWorldY = this.currentLevel.worldY + py + ph / 2;
    console.log(`[EdgeTransition] dir=${direction} level=${level.identifier} localY=${py.toFixed(0)} worldY=${playerWorldY.toFixed(0)} candidates=${JSON.stringify(this.currentLevel.dirNeighbors[{left:'w',right:'e',up:'n',down:'s'}[direction]])}`);
    const neighborId = this.getNeighborInDirection(direction, playerWorldX, playerWorldY);
    console.log(`[EdgeTransition] ??neighborId=${neighborId}`);
    if (!neighborId) return;

    this.startTransition(direction, neighborId);
  }

  private getNeighborInDirection(
    direction: 'left' | 'right' | 'up' | 'down',
    playerWorldX: number,
    playerWorldY: number,
  ): string | null {
    return this.transitionController.getNeighborInDirection(
      this.loader, this.currentLevel, direction, playerWorldX, playerWorldY, LdtkWorldScene.debugMode,
    );
  }

  private startTransition(direction: 'left' | 'right' | 'up' | 'down', levelId: string): void {
    const cam = this.game.camera;
    this.transitionState = 'fade_out';
    this.transitionTimer = FADE_DURATION;
    this.pendingDirection = direction;
    this.pendingLevelId = levelId;
    // Remember player's WORLD position for spawn hint in next room
    this.pendingPlayerTileY = Math.floor((this.currentLevel.worldY + this.player.y + this.player.height / 2) / TILE_SIZE);
    this.pendingPlayerTileX = Math.floor((this.currentLevel.worldX + this.player.x + this.player.width / 2) / TILE_SIZE);
  }

  private updateTransition(dt: number): void {
    this.transitionTimer -= dt;
    if (this.transitionState === 'fade_out') {
      this.fadeOverlay.alpha = Math.min(1, 1 - this.transitionTimer / FADE_DURATION);
      if (this.transitionTimer <= 0) {
        if (this.pendingLevelId === '__item_world__') {
          // Tunnel exit ??enter Item World (no fade_in, scene push handles it)
          this.transitionState = 'none';
          this.fadeOverlay.alpha = 0;
          this.pendingDirection = null;
          this.pendingLevelId = null;
          this.enterItemWorldFromTunnel();
          return;
        }
        if (this.pendingLevelId) {
          const prevCamX = this.game.camera.renderX;
          const prevCamY = this.game.camera.renderY;
          const opposite: Record<string, 'left'|'right'|'up'|'down'> = {
            left: 'right', right: 'left', up: 'down', down: 'up',
          };
          const enterFrom = opposite[this.pendingDirection!] ?? 'down';
          this.loadLevel(this.pendingLevelId, enterFrom);
          this.parallaxBG.onRoomTransition(prevCamX, prevCamY, this.game.camera.renderX, this.game.camera.renderY);
          this.player.savePrevPosition();
          for (const e of this.enemies) e.savePrevPosition();
        }
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
        this.pendingLevelId = null;
        // Sync all entity prev positions to prevent render interpolation jitter
        this.player.savePrevPosition();
        for (const e of this.enemies) e.savePrevPosition();
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Game Over
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // Giant Builder
  // ---------------------------------------------------------------------------

  /**
   * Stamp the active builder's solid tiles into the host collisionGrid.
   *
   * Only cells where the host grid is EMPTY (0) get stamped, so runtime
   * terrain changes (broken walls, open doors) and special tiles (updraft,
   * spikes) are preserved. Stamped cells are recorded so they can be
   * restored next frame by unstampBuilder().
   */
  private stampBuilder(): void {
    const b = this.activeBuilder;
    if (!b) return;
    const tileOriginX = Math.round(b.container.x / 16);
    const tileOriginY = Math.round(b.container.y / 16);
    const gridH = this.collisionGrid.length;
    const gridW = gridH > 0 ? this.collisionGrid[0].length : 0;
    for (let br = 0; br < b.heightTiles; br++) {
      const r = tileOriginY + br;
      if (r < 0 || r >= gridH) continue;
      const bRow = b.collisionGrid[br];
      const hostRow = this.collisionGrid[r];
      if (!bRow || !hostRow) continue;
      for (let bc = 0; bc < b.widthTiles; bc++) {
        const v = bRow[bc];
        if (!v) continue;
        const c = tileOriginX + bc;
        if (c < 0 || c >= gridW) continue;
        if (hostRow[c] === 0) {
          hostRow[c] = v;
          this.builderStamps.push({ r, c });
        }
      }
    }
  }

  /** Restore cells previously stamped by the builder back to empty (0). */
  private unstampBuilder(): void {
    for (const s of this.builderStamps) {
      const row = this.collisionGrid[s.r];
      if (row) row[s.c] = 0;
    }
    this.builderStamps.length = 0;
  }

  /**
   * After physics: is the player standing on a tile that the builder
   * currently stamps? Used to carry them with the builder on the next
   * frame's vertical movement.
   */
  private isPlayerOnBuilderStamp(): boolean {
    if (this.builderStamps.length === 0) return false;
    if (!this.player.isGrounded()) return false;
    const feetY = this.player.y + this.player.height;
    const footRow = Math.floor((feetY + 1) / 16);
    const leftCol = Math.floor(this.player.x / 16);
    const rightCol = Math.floor((this.player.x + this.player.width - 1) / 16);
    for (const s of this.builderStamps) {
      if (s.r === footRow && s.c >= leftCol && s.c <= rightCol) return true;
    }
    return false;
  }

  /**
   * AABB overlap between the player and the builder's world-space rectangle.
   * Used for the camera override so it persists while the player is airborne
   * inside the builder (jumping, double-jumping, etc.).
   */
  private isPlayerInBuilderVolume(): boolean {
    const b = this.activeBuilder;
    if (!b) return false;
    const bx = b.container.x;
    const by = b.container.y;
    const px = this.player.x;
    const py = this.player.y;
    return (
      px + this.player.width  > bx &&
      px                      < bx + b.widthPx &&
      py + this.player.height > by &&
      py                      < by + b.heightPx
    );
  }

  private spawnBuilder(hostLevel: LdtkLevel, mode: 'cinematic' | 'patrol', builderLevelId: string): void {
    const builderLevel = this.builderLoader.getLevel(builderLevelId);
    if (!builderLevel) return;

    const builder = new GiantBuilder(
      builderLevel,
      this.atlases,
      'world_shaft_builder_bg',
      'world_shaft_builder_wall',
    );

    // Builder decorations use the builder-specific palette so the structure
    // reads as a cool steel mass against the warm crimson shaft.
    if (this.builderWallPaletteFilter) {
      builder.decorator.naturalLayer.filters    = [this.builderNaturalPaletteFilter!];
      builder.decorator.artificialLayer.filters = [this.builderWallPaletteFilter];
      builder.decorator.structureLayer.filters  = [this.builderWallPaletteFilter];
    }

    // Builder body layers receive a parallel filter stack to the host level,
    // but with builder-specific palette rows. Rim filter is shared so the
    // forge-orange highlight still glows along the builder's top edge.
    if (this.builderBgPaletteFilter && this.builderWallPaletteFilter && this.builderInteriorPaletteFilter && this.wallRimFilter) {
      builder.bodyLayers.bg.filters       = [this.builderBgPaletteFilter];
      builder.bodyLayers.wall.filters     = [this.builderWallPaletteFilter, this.wallRimFilter];
      builder.bodyLayers.interior.filters = [this.builderInteriorPaletteFilter];
      builder.bodyLayers.shadow.filters   = [this.builderWallPaletteFilter];
    }

    const topY = 64;                                          // 4 tiles from top
    const bottomY = hostLevel.pxHei - builder.heightPx - 64;  // 4 tiles from bottom

    if (mode === 'cinematic') {
      // Shaft_01 — right wall minus 7 tiles. First entry: one-shot
      // bottom→top ascent. Re-entries: spawn at the dormant top pose
      // with no route so the builder stays parked where the cinematic
      // left it.
      const px = hostLevel.pxWid - builder.widthPx - 7 * 16;
      if (this.shaft01CinematicPlayed) {
        builder.placeInLevel(px, topY);
        this.renderer.container.addChild(builder.container);
        // No setRoute → state remains 'dormant', builder visible & still.
      } else {
        builder.placeInLevel(px, bottomY);
        this.renderer.container.addChild(builder.container);
        builder.setRoute([
          { y: bottomY, waitMs: 0 },
          { y: topY,    waitMs: 0 },
        ], 45, false); // 45 px/s, no loop
        this.shaft01CinematicPlayed = true;
      }
    } else {
      // Debug_Shaft_01 — infinite patrol; spawn at bottom, climb up first.
      const px = hostLevel.pxWid - builder.widthPx - 16 * 16;
      builder.placeInLevel(px, bottomY);
      this.renderer.container.addChild(builder.container);
      builder.setRoute([
        { y: bottomY, waitMs: 3000 },
        { y: topY,    waitMs: 3000 },
        { y: bottomY, waitMs: 3000 },
      ], 22, true); // 22 px/s, loop
    }

    this.activeBuilder = builder;
    this.activeBuilderMode = mode;
    this.builderWasMoving = false;
    this.builderStepCounter = 0;

    // Spawn entities placed inside the builder level so they ride the
    // builder. Each spawn registers a BuilderAttachment whose world coords
    // are recomputed every frame in syncBuilderAttachments().
    this.spawnBuilderEntities(builderLevel, builderLevelId, builder);
  }

  /** Walk a builder level's LDtk entities and spawn the gameplay objects
   *  that make sense inside a moving builder. Add new cases here for any
   *  entity type that needs to be supported (Anvil, GoldPickup, etc.). */
  private spawnBuilderEntities(
    builderLevel: LdtkLevel,
    builderLevelId: string,
    builder: GiantBuilder,
  ): void {
    const bx0 = builder.container.x;
    const by0 = builder.container.y;
    for (const ent of builderLevel.entities) {
      const localX = ent.px[0];
      const localY = ent.px[1];
      const wx = bx0 + localX;
      const wy = by0 + localY;

      switch (ent.type) {
        case 'Item': {
          const itemKey = `${builderLevelId}:${localX},${localY}`;
          if (this.collectedItems.has(itemKey)) break;
          const rawItemId = (ent.fields['ItemId'] ?? ent.fields['itemId'] ?? ent.fields['itemID'] ?? '') as string;
          const itemId = rawItemId.toLowerCase();
          if (!itemId) break;

          // Snapshot all collections that spawnFixedItemAt may push into;
          // any collection that grew owns the new entity for attachment.
          // Consumables don't spawn an entity (toast only) — those leave
          // every length unchanged and are silently skipped.
          const beforeDrops = this.drops.length;
          const beforeGold = this.goldPickups.length;
          const beforeHeal = this.healingPickups.length;
          this.spawnFixedItemAt(wx, wy, itemId, itemKey);

          if (this.drops.length > beforeDrops) {
            const drop = this.drops[this.drops.length - 1];
            // ItemDropEntity lifts visuals 8px above the bottom-center
            // pivot in its constructor; mirror that here so builder-
            // attached drops aren't half-buried after re-anchoring.
            const liftedLocalY = localY - 8;
            this.attachToBuilder(builder, drop, localX, liftedLocalY, () => this.drops.includes(drop));
            drop.baseY = liftedLocalY;
          } else if (this.goldPickups.length > beforeGold) {
            const gp = this.goldPickups[this.goldPickups.length - 1];
            this.attachToBuilder(builder, gp, gp.x - bx0, gp.y - by0, () => this.goldPickups.includes(gp));
          } else if (this.healingPickups.length > beforeHeal) {
            const hp = this.healingPickups[this.healingPickups.length - 1];
            this.attachToBuilder(builder, hp, hp.x - bx0, hp.y - by0, () => this.healingPickups.includes(hp));
          }
          break;
        }
        // Future entity types: Anvil, ...
        // Each case spawns the entity at (wx, wy) and pushes a
        // BuilderAttachment with isAlive pointing at the owning collection.
        default:
          break;
      }
    }
  }

  /** Reparent a freshly-spawned entity under the builder's container and
   *  register a BuilderAttachment so its world coords (x/y) follow the
   *  builder each frame via syncBuilderAttachments(). */
  private attachToBuilder(
    builder: GiantBuilder,
    entity: BuilderAttachable,
    localX: number,
    localY: number,
    isAlive: () => boolean,
  ): void {
    if (entity.container.parent) {
      entity.container.parent.removeChild(entity.container);
    }
    builder.container.addChild(entity.container);
    entity.container.x = localX;
    entity.container.y = localY;
    if (typeof entity.baseY === 'number') {
      entity.baseY = localY;
    }
    this.builderAttachments.push({ entity, localX, localY, isAlive });
  }

  /** Sync world coords (entity.x/y) of builder-attached entities so
   *  interaction hitboxes track the moving builder. The visual position is
   *  handled by the parent builder.container transform — we only update
   *  the world-coord fields used by pickup/interaction logic. */
  private syncBuilderAttachments(): void {
    if (!this.activeBuilder || this.builderAttachments.length === 0) return;
    const bx = this.activeBuilder.container.x;
    const by = this.activeBuilder.container.y;
    for (let i = this.builderAttachments.length - 1; i >= 0; i--) {
      const a = this.builderAttachments[i];
      if (!a.isAlive()) {
        this.builderAttachments.splice(i, 1);
        continue;
      }
      a.entity.x = bx + a.localX;
      a.entity.y = by + a.localY;
    }
  }

  private clearBuilder(): void {
    this.unstampBuilder();
    this.playerOnBuilder = false;
    this.playerInBuilder = false;
    if (this.activeBuilder) {
      if (this.activeBuilder.container.parent) {
        this.activeBuilder.container.parent.removeChild(this.activeBuilder.container);
      }
      this.activeBuilder = null;
    }
    this.activeBuilderMode = null;
    this.builderWasMoving = false;
    // Attached entities themselves are cleared with the level via their
    // owning collections (this.drops, etc.); just drop our tracking refs.
    this.builderAttachments = [];
  }

  private openCharacterStats(): void {
    const a = this.player.abilities;
    this.characterStats.setData(
      this.inventory,
      1, 0, 100,  // playerLevel, exp, maxExp — placeholder until growth system
      this.player.hp, this.player.maxHp,
      [a.dash, a.wallJump, a.doubleJump, false /* mist */, a.waterBreathing, false /* gravity */],
    );
    this.characterStats.show();
    this.pauseMenu.close();
    this.isPaused = false;
  }

  private showGameOver(): void {
    this.gameOverActive = true;
    // Clear floating UI (damage numbers, prompts) on death
    this.game.uiContainer.removeChildren();
    this.game.uiContainer.addChild(this.hud.container);
    if (this.minimap) this.game.uiContainer.addChild(this.minimap);
    // ?�체력 경고 VFX(Flask R pulse, glow, vignette, HP bar pulse) 즉시 ?�거.
    // gameOverActive=true ?�선 update() 가 early-return ?�여 hud.update(dt) 가
    // ?�출?��? ?�으므�? ?�기??명시?�으�?초기?�하지 ?�으�?Game Over ?�면??
    // ?�스 ?�상???�어붙�? �??�는??
    this.hud.resetLowHpEffects();
    const overlay = new Container();

    // Desaturated dark overlay
    const bg = new Graphics();
    bg.rect(0, 0, GAME_WIDTH, GAME_HEIGHT).fill({ color: 0x111111, alpha: 0.8 });
    overlay.addChild(bg);

    const title = new BitmapText({
      text: 'YOU DIED',
      style: { fontFamily: PIXEL_FONT, fontSize: 14, fill: 0xff2222 },
    });
    title.anchor.set(0.5);
    title.x = GAME_WIDTH / 2;
    title.y = GAME_HEIGHT / 2 - 20;
    overlay.addChild(title);

    const hint = new BitmapText({
      text: 'Press Z or X to return to save point',
      style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0x888888 },
    });
    hint.anchor.set(0.5);
    hint.x = GAME_WIDTH / 2;
    hint.y = GAME_HEIGHT / 2 + 10;
    overlay.addChild(hint);

    this.gameOverOverlay = overlay;
    this.game.legacyUIContainer.addChild(overlay);
  }

  private respawnPlayer(): void {
    this.gameOverActive = false;
    if (this.gameOverOverlay?.parent) {
      this.gameOverOverlay.parent.removeChild(this.gameOverOverlay);
    }
    this.gameOverOverlay = null;

    // Clear fixed item world / tunnel state
    this.inFixedItemWorld = false;
    this.fixedItemWorldItem = null;
    this.inItemTunnel = false;
    this.collapseItem = null;

    // Load save data ??return to last save point
    const saveData = SaveManager.load();
    if (saveData) {
      // Restore inventory and progress from save
      this.inventory = SaveManager.loadInventory(saveData);
      this.inventoryUI.setInventory(this.inventory);
      this.unlockedEvents = new Set(saveData.unlockedEvents);
      this.collectedRelics = new Set(saveData.collectedRelics);
      this.collectedItems = new Set(saveData.collectedItems);
      this.visitedLevels = new Set(saveData.visitedLevels ?? []);
      this.clearedLevels = new Set(saveData.clearedLevels);
      this.player.abilities.dash = saveData.abilities.dash;
      this.player.abilities.diveAttack = saveData.abilities.diveAttack ?? false;
      this.player.abilities.surge = saveData.abilities.surge ?? false;
      this.player.abilities.waterBreathing = saveData.abilities.waterBreathing ?? false;
      this.player.abilities.wallJump = saveData.abilities.wallJump;
      this.player.abilities.doubleJump = saveData.abilities.doubleJump;
      this.healthShardBonus = saveData.healthShardBonus ?? 0;
      this.loadLevel(saveData.levelId, 'down');
    } else {
      // No save ??return to spawn level
      this.healthShardBonus = 0;
      this.loadLevel(this.playerSpawnLevelId, 'down');
    }

    // Full HP restore + snap to save point
    this.player.respawn();
    this.updatePlayerAtk();
    this.player.hp = this.player.maxHp;
    this.snapPlayerToSavePoint();
    // ?�체력 경고 VFX(Flask R pulse, glow, HP bar pulse, vignette) ?�상 ?�거.
    this.hud.resetLowHpEffects();
    this.hud.updateHP(this.player.hp, this.player.maxHp);
  }

  // ---------------------------------------------------------------------------
  // Inventory UI
  // ---------------------------------------------------------------------------

  private updatePlayerAtk(): void {
    // Base stats from CSV (SSoT: Sheets/Content_Stats_Character_Base.csv)
    const base = getPlayerBaseStats(1); // Lv1 for now (no player leveling yet)
    const weaponAtk = this.inventory.getWeaponAtk();

    // Innocent bonus ATK ??flat bonus from all subdued/wild innocent 'atk' slots
    const equippedItem = this.inventory.equipped;
    const innocentAtk = equippedItem ? Math.floor(calcInnocentBonus(equippedItem, 'atk')) : 0;

    // DEBUG cheat relic ??flat +99999 on top of everything
    const cheatBonus = this.player.abilities.cheat ? 99999 : 0;

    this.player.atk = base.atk + weaponAtk + innocentAtk + cheatBonus;

    // Sync equipped weapon properties for FX + attack hitbox scaling.
    this.player.equippedWeaponType = equippedItem ? equippedItem.def.type : null;
    this.player.equippedRarity = equippedItem ? equippedItem.rarity : null;
    this.player.attackHitboxMul = equippedItem
      ? equippedItem.def.hitboxW / BASE_HITBOX_W
      : 1;

    // DEF: base from CSV + innocent bonus
    const innocentDef = equippedItem ? Math.floor(calcInnocentBonus(equippedItem, 'def')) : 0;
    this.player.def = base.def + innocentDef;

    // MaxHP: base from CSV + HealthShard bonus + innocent bonus + cheat
    const innocentHp = equippedItem ? Math.floor(calcInnocentBonus(equippedItem, 'hp')) : 0;
    const newMaxHp = base.hp + this.healthShardBonus + innocentHp + cheatBonus;
    if (newMaxHp !== this.player.maxHp) {
      const hpRatio = this.player.maxHp > 0 ? this.player.hp / this.player.maxHp : 1;
      this.player.maxHp = newMaxHp;
      this.player.hp = Math.round(newMaxHp * hpRatio);
    }
  }

  // ---------------------------------------------------------------------------
  // Portal System
  // ---------------------------------------------------------------------------

  private spawnPortal(
    x: number,
    y: number,
    rarity: Rarity,
    sourceType: PortalSourceType,
    sourceItem?: ItemInstance,
  ): void {
    const portal = new Portal(x, y, rarity, sourceType, sourceItem);
    this.portals.push(portal);
    this.entityLayer.addChild(portal.container);

    // Spawn effects (Sakurai: Stop for Big Moments)
    this.game.hitstopFrames += portal.spawnHitstop;
    this.game.camera.shake(portal.spawnShake);

    if (rarity !== 'normal') {
      this.toast.show(`${rarity.toUpperCase()} Portal appeared!`, 0xffcc44);
    }
    // hint removed
  }

  private enterPortal(portal: Portal): void {
    this.closeAltarUI();

    const cam = this.game.camera;
    const screenX = portal.x - cam.renderX + GAME_WIDTH / 2;
    const screenY = portal.y - cam.renderY + GAME_HEIGHT / 2;

    const transition = new PortalTransition(
      screenX, screenY,
      portal.rarity, portal.sourceType, portal.sourceItem,
    );
    this.portalTransition = transition;
    this.game.legacyUIContainer.addChild(transition.container);

    transition.onShake = (intensity) => this.game.camera.shake(intensity);
    transition.onHitstop = (frames) => { this.game.hitstopFrames += frames; };

    const idx = this.portals.indexOf(portal);
    if (idx >= 0) this.portals.splice(idx, 1);
    portal.destroy();

    this.pendingPortalData = {
      rarity: portal.rarity,
      sourceType: portal.sourceType,
      sourceItem: portal.sourceItem,
    };
  }

  private completePendingPortalEntry(): void {
    const data = this.pendingPortalData;
    if (!data) return;
    this.pendingPortalData = null;

    // In fixed item world ??portal = return to forge
    if (this.inFixedItemWorld) {
      this.exitFixedItemWorld();
      return;
    }

    const isAltar = data.sourceType === 'altar';

    let dungeonItem: ItemInstance | undefined;
    if (!isAltar) {
      const defs = SWORD_DEFS.filter((d) => d.rarity === data.rarity);
      const def = defs.length > 0 ? defs[0] : SWORD_DEFS[0];
      dungeonItem = createItem(def, data.rarity);
    }

    const targetItem = isAltar ? data.sourceItem! : dungeonItem!;
    const prevLevel = targetItem.level;
    const prevAtk = this.player.atk;

    if (this.portalTransition) {
      this.portalTransition.destroy();
      this.portalTransition = null;
    }

    // Hide world while in Item World and detach shared UI from global containers.
    this.container.visible = false;
    this.detachSharedUiForItemWorld();

    const itemWorldScene = new ItemWorldScene(this.game, targetItem, this.inventory, this.player);
    itemWorldScene.itemWorldTutorialDone = this.unlockedEvents.has('__itemWorldTutorialDone');
    itemWorldScene.egoUnlockedEvents = this.unlockedEvents;
    itemWorldScene.onComplete = () => {
      this.game.sceneManager.pop();
      this.updatePlayerAtk();
      // Mark global Item World tutorial as done
      this.unlockedEvents.add('__itemWorldTutorialDone');
      // �??�이?�계 ?�리?????�직 I �????��??�면 HUD [I] ???�스 강조 ON.
      if (!this.unlockedEvents.has('__itemKeyPressedAfterItemWorld')) {
        this.hud.setItemKeyHighlight(true);
      }

      // Collect earned gold from Item World
      if (itemWorldScene.earnedGold > 0) {
        this.gold += itemWorldScene.earnedGold;
        this.toast.show(`+${itemWorldScene.earnedGold} G`, 0xffd700);
      }

      // ── Ego T14: "또 올 거야?" after first item world return ──
      if (
        hasEgo(targetItem.def.id)
        && !this.unlockedEvents.has(EGO_EVENT.WORLD_RETURN)
      ) {
        this.unlockedEvents.add(EGO_EVENT.WORLD_RETURN);
        setTimeout(() => {
          if (!this.loreDisplay?.isActive) {
            this.loreDisplay?.showDialogue(EGO_WORLD_RETURN, false);
          }
        }, 1000);
      }

      if (isAltar) {
        if (targetItem.level > prevLevel) {
          this.toast.show(`${targetItem.def.name} Level Up! Lv${targetItem.level}`, 0xff88ff);
        }
      } else {
        if (this.inventory.add(dungeonItem!)) {
          this.toast.show(
            `Got ${dungeonItem!.def.name} [${dungeonItem!.rarity.toUpperCase()}]`,
            0xffcc44,
          );
          this.sacredPickupFlow(
            dungeonItem!,
            this.player.x + this.player.width / 2,
            this.player.y + this.player.height / 2,
          );
        }
      }
      if (this.player.atk !== prevAtk) {
        this.toast.show(`ATK ${prevAtk} -> ${this.player.atk}`, 0xffff44);
      }
    };

    this.game.sceneManager.push(itemWorldScene, true);
  }

  // ---------------------------------------------------------------------------
  // Sacred Pickup flow
  // ---------------------------------------------------------------------------

  /**
   * Dispatch the appropriate pickup cutscene tier based on sacredSave flags.
   * Starter-only items are silently marked seen without VFX.
   */
  private sacredPickupFlow(item: ItemInstance, wx: number, wy: number): void {
    // Ego wake (T01) is dispatched at the *end* of this function so the
    // wait loop sees the fully-populated activeWeaponPulse / lorePopupItem
    // state — otherwise it can pass the gate before the cutscene starts
    // and fire dialogue on top of the pulse/popup.

    // "처음 보는 ?�이?? ??�??�이?�과 ?�일?�게 T2 컷신(줌인 + ?�력 차단 +
    // LorePopup ?��??�로 처리. ?��? �?def �??�시 주울 ?�는 ?�스/컷신 ?�이
    // 조용???�벤?�리???�어간다 ??반복 ?�득?�서 리듬???��? ?�도�?
    const firstEver = !sacredSave.isFirstPickupDone();
    const isFirstSeen = !sacredSave.hasSeenItem(item.def.id);
    if (firstEver) {
      sacredSave.markFirstPickupDone();
      // The very first pickup (Broken Sword inside the Builder) advertises
      // the [I] inventory key. The pulse stays ON until the player presses
      // I, at which point the toggle handler clears it (see updateInput).
      if (!this.unlockedEvents.has('__itemKeyPressedAfterItemWorld')) {
        this.hud.setItemKeyHighlight(true);
      }
    }

    // Tear down any lingering pulse / tether so rapid pickups don't stack.
    if (this.activeWeaponPulse) { this.activeWeaponPulse.destroy(); this.activeWeaponPulse = null; }
    if (this.activeAnvilTether) { this.activeAnvilTether.destroy(); this.activeAnvilTether = null; }

    if (isFirstSeen) {
      // Rustborn?��? ?�체 4.8s 컷신, ?�머지 ?�규 ?�이?��? ?�일 ?�로?��? 2s�?���?
      const isRustborn = item.def.id === 'sword_rustborn';
      const mode = isRustborn ? 'T2_FULL_CUTSCENE' : 'T2_QUICK_CUTSCENE';
      const pulse = new WeaponPulse(wx, wy, item.rarity, mode);
      this.entityLayer.addChild(pulse.container);
      pulse.onZoom = (scale) => { this.pickupZoomOverride = scale; };
      // Tether??LorePopup ?�힘 ?�후 지??모드�??�성?��?�??�스 중엔 발동?��? ?�음.
      pulse.start();
      this.activeWeaponPulse = pulse;
    }

    // Lore popup — open on first-seen items (or always-on setting).
    // Deferred behind the pulse (if any) so the cutscene completes first.
    // For already-seen items without the alwaysShowLore option this resolves
    // to a no-op in LorePopup.showIfNew().
    this.lorePopupItem = item;

    // ── Ego wake dialogue (T01) — fires after pickup cutscene completes ──
    // Dispatched here at function tail so the wait loop sees the freshly
    // assigned activeWeaponPulse (T2 cutscene) and lorePopupItem before
    // its first poll.
    if (!this.unlockedEvents.has(EGO_EVENT.WAKE) && hasEgo(item.def.id)) {
      this.unlockedEvents.add(EGO_EVENT.WAKE);
      console.log('[Ego] T01 queued for', item.def.id);
      const waitForPickupDone = () => {
        // Block on: active T2 pulse, an open lore popup, OR a queued
        // lorePopupItem that has not yet been opened by the popup loop.
        if (
          this.activeWeaponPulse?.isBlocking ||
          this.lorePopup?.isBlocking() ||
          this.lorePopupItem !== null
        ) {
          setTimeout(waitForPickupDone, 100);
          return;
        }
        const waitForFree = () => {
          if (this.loreDisplay?.isActive) {
            setTimeout(waitForFree, 100);
            return;
          }
          this.loreDisplay?.showDialogue(EGO_WAKE, true);
        };
        setTimeout(waitForFree, 300);
      };
      waitForPickupDone();
    }
  }

  /**
   * ?�레?�어 ??가??가까운 ?�빌까�???벡터�??�석. ?�빌??찾�? 못하�?null.
   *
   * ?�빌 좌표�? Anvil ?�래?�는 container�?bottom-center pivot ?�로 그리므�?
   * `anvil.x`???�각???�평 중앙, `anvil.y`???�각??바닥???�다.
   * Tether ?�착?��? ?�빌??**top-center**(머리 ?��?�?�?가리켜??
   * ?�선???�하??모서리�? ?�닌 ?�빌 �??기로 ?�연?�럽�?꽂힌??
   */
  private resolveAnvilTarget(fromX: number, fromY: number): { x: number; y: number } | null {
    if (this.anvil) {
      return { x: this.anvil.x, y: this.anvil.y - this.anvil.height };
    }
    if (this.currentLevel?.entities) {
      let best: { d: number; x: number; y: number } | null = null;
      for (const ent of this.currentLevel.entities) {
        if (ent.type !== 'Anvil') continue;
        // LDtk Anvil entity ??pivot ??bottom-center �??�정???�어
        // ent.px[1] ???�각??바닥. top-center �??�어?�린??
        const ex = ent.px[0];
        const ey = ent.px[1] - ent.height;
        const d = (ex - fromX) * (ex - fromX) + (ey - fromY) * (ey - fromY);
        if (!best || d < best.d) best = { d, x: ex, y: ey };
      }
      if (best) return { x: best.x, y: best.y };
    }
    if (this.lastUsedAnvilPos) {
      return {
        x: this.lastUsedAnvilPos.x,
        y: this.lastUsedAnvilPos.y - this.lastUsedAnvilPos.height,
      };
    }
    return null;
  }

  /**
   * LorePopup ?�힘 ?�후 ?�출?�어 지??tether�??�성. ?�레?�어가 ?�빌??
   * ?�달??openAnvilUI�??�출?�면 requestFadeOut?�로 ?�진 ?�멸?�다.
   */
  private spawnPersistentAnvilTether(rarity: Rarity): void {
    const fromX = this.player.x + this.player.width / 2;
    const fromY = this.player.y + this.player.height / 2;
    const target = this.resolveAnvilTarget(fromX, fromY);
    if (!target) return;

    if (this.activeAnvilTether) {
      this.activeAnvilTether.destroy();
      this.activeAnvilTether = null;
    }
    const tether = new AnvilTether(fromX, fromY, target.x, target.y, rarity);
    this.entityLayer.addChild(tether.container);
    this.activeAnvilTether = tether;
  }

  /**
   * Advance pulse + tether. Returns true while input must remain blocked for
   * this frame (i.e. T2 cutscene or LorePopup is up).
   */
  private updateSacredPickup(dt: number): boolean {
    let blocking = false;

    if (this.activeWeaponPulse) {
      this.activeWeaponPulse.update(dt);
      if (this.activeWeaponPulse.isBlocking) blocking = true;
      if (this.activeWeaponPulse.isDone) {
        this.activeWeaponPulse.destroy();
        this.activeWeaponPulse = null;
        this.pickupZoomOverride = 1.0;
      }
    }
    if (this.activeAnvilTether) {
      // Endpoint�?�??�레???�레?�어 중심 ???�재 ?�빌 ?�치�?갱신.
      const fx = this.player.x + this.player.width / 2;
      const fy = this.player.y + this.player.height / 2;
      const target = this.resolveAnvilTarget(fx, fy);
      if (target) {
        this.activeAnvilTether.setEndpoints(fx, fy, target.x, target.y);
      }
      this.activeAnvilTether.update(dt);
      if (this.activeAnvilTether.isDone) {
        this.activeAnvilTether.destroy();
        this.activeAnvilTether = null;
      }
    }

    // Once the pulse finishes (or immediately for S4), open LorePopup for
    // items not yet seen. Cache the item so the confirm key-handler below
    // knows which defId to mark as seen on close.
    if (this.lorePopupItem && !this.activeWeaponPulse && this.lorePopup) {
      const item = this.lorePopupItem;
      const shown = this.lorePopup.showIfNew(item, () => {
        this.activeLorePopupItem = null;
        // LorePopup ?�힘 ???�직 �??�이�??�이�?persistent tether�??�워
        // ?�빌까�???경로�??��?. ?��? ?�이�??�봤?�면 건너?�다.
        if (!sacredSave.isFirstDiveDone()) {
          this.spawnPersistentAnvilTether(item.rarity);
        }
      });
      if (shown) {
        this.activeLorePopupItem = item;
      } else {
        sacredSave.markItemSeen(item.def.id);
        this.activeLorePopupItem = null;
      }
      this.lorePopupItem = null;
    }

    if (this.lorePopup?.isBlocking()) {
      // ?�?�머(?�력 ?�금)???�업?????�는 ?�안 ??�� 진행.
      this.lorePopup.update(dt);
      blocking = true;
      const input = this.game.input;
      // 초기 1�??�력 ?�금???��??�에�?X ?�인??받는??
      if (this.lorePopup.canConfirm() && input.isJustPressed(GameAction.ATTACK)) {
        input.consumeJustPressed(GameAction.ATTACK);
        const item = this.activeLorePopupItem;
        if (item) this.lorePopup.confirm(item);
        else this.lorePopup.close();
      } else if (!this.lorePopup.canConfirm() && input.isJustPressed(GameAction.ATTACK)) {
        // ?�금 ?�안 ?�어??X ???�비???�른 루프(?? 공격)�??��? ?�도�?
        input.consumeJustPressed(GameAction.ATTACK);
      }
    }

    // Dive preview modal takes priority over other UI input.
    if (this.divePreview?.isBlocking()) {
      blocking = true;
      const input = this.game.input;
      if (input.isJustPressed(GameAction.ATTACK)) {
        input.consumeJustPressed(GameAction.ATTACK);
        this.divePreview.confirm();
      } else if (input.isJustPressed(GameAction.MENU) || input.isJustPressed(GameAction.DASH)) {
        this.divePreview.cancel();
      }
    }

    return blocking;
  }

  /** Returns true if player entered a portal this frame */
  private updatePortals(dt: number): boolean {
    for (const portal of this.portals) {
      portal.update(dt);

      const near = portal.overlaps(
        this.player.x - 8, this.player.y - 8,
        this.player.width + 16, this.player.height + 16,
      );
      portal.setShowHint(near);

      if (portal.overlaps(this.player.x, this.player.y, this.player.width, this.player.height)) {
        if (this.game.input.isJustPressed(GameAction.LOOK_UP)) {
          this.enterPortal(portal);
          return true;
        }
      }
    }
    return false;
  }

  private clearPortals(): void {
    for (const p of this.portals) p.destroy();
    this.portals = [];
  }

  // ---------------------------------------------------------------------------
  // Altar System
  // ---------------------------------------------------------------------------

  private updateAltars(dt: number): void {
    for (const altar of this.altars) {
      altar.update(dt);

      if (altar.used) {
        altar.setShowHint(false);
        continue;
      }

      const near = altar.overlaps(
        this.player.x - 8, this.player.y - 8,
        this.player.width + 16, this.player.height + 16,
      );
      altar.setShowHint(near);

      if (altar.overlaps(this.player.x, this.player.y, this.player.width, this.player.height)) {
        if (this.game.input.isJustPressed(GameAction.LOOK_UP) && !this.altarSelectActive) {
          this.openAltarUI(altar);
          return;
        }
      }
    }
  }

  private openAltarUI(altar: Altar): void {
    if (this.inventory.items.length === 0) {
      this.toast.show('No items to offer', 0xff4444);
      return;
    }
    this.altarSelectActive = true;
    this.altarSelectIndex = 0;
    this.activeAltar = altar;
    this.drawAltarUI();
  }

  /** Shared item-selection panel used by both Altar and Anvil. */
  private drawItemSelectUI(titleText: string, accentColor: number): void {
    if (this.altarUI) {
      if (this.altarUI.parent) this.altarUI.parent.removeChild(this.altarUI);
      this.altarUI.destroy({ children: true });
      this.altarUI = null;
    }

    const items = this.inventory.items;
    const ui = new Container();

    const bg = new Graphics();
    const panelW = 260;
    const panelH = 20 + items.length * 12;
    const px = Math.floor((GAME_WIDTH - panelW) / 2);
    const py = Math.floor((GAME_HEIGHT - panelH) / 2);
    bg.rect(0, 0, panelW, panelH).fill({ color: 0x1a1a2e, alpha: 0.95 });
    bg.rect(0, 0, panelW, panelH).stroke({ color: accentColor, width: 1 });
    bg.x = px;
    bg.y = py;
    ui.addChild(bg);

    const title = new BitmapText({
      text: titleText,
      style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: accentColor },
    });
    title.x = px + 6;
    title.y = py + 4;
    ui.addChild(title);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const selected = i === this.altarSelectIndex;
      const prefix = selected ? '> ' : '  ';
      const equipped = this.inventory.equipped?.uid === item.uid ? ' [E]' : '';
      const label = `${prefix}${item.def.name} Lv${item.level} ${item.rarity.toUpperCase()}${equipped}`;
      const t = new BitmapText({
        text: label,
        style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: selected ? 0xffcc44 : 0xffffff },
      });
      t.x = px + 6;
      t.y = py + 16 + i * 12;
      ui.addChild(t);
    }

    this.altarUI = ui;
    this.game.legacyUIContainer.addChild(ui);
  }

  private drawAltarUI(): void {
    this.drawItemSelectUI('Offer item to altar:', 0xaaccff);
  }

  private closeAltarUI(): void {
    this.altarSelectActive = false;
    this.activeAltar = null;
    if (this.altarUI) {
      if (this.altarUI.parent) this.altarUI.parent.removeChild(this.altarUI);
      this.altarUI.destroy({ children: true });
      this.altarUI = null;
    }
    this.closeCyclePromptUI();
  }

  /** Shared input handler for item selection (Altar / Anvil). */
  private updateItemSelectInput(
    onConfirm: (item: ItemInstance) => void,
    redrawFn: () => void,
  ): void {
    const input = this.game.input;
    const items = this.inventory.items;

    if (input.isJustPressed(GameAction.LOOK_UP)) {
      this.altarSelectIndex = Math.max(0, this.altarSelectIndex - 1);
      redrawFn();
      return;
    }
    if (input.isJustPressed(GameAction.LOOK_DOWN)) {
      this.altarSelectIndex = Math.min(items.length - 1, this.altarSelectIndex + 1);
      redrawFn();
      return;
    }
    if (input.isJustPressed(GameAction.ATTACK) || input.isJustPressed(GameAction.JUMP)) {
      const item = items[this.altarSelectIndex];
      if (item) {
        onConfirm(item);
      } else {
        this.closeAltarUI();
      }
      return;
    }
    if (input.isJustPressed(GameAction.MENU) || input.isJustPressed(GameAction.DASH)) {
      this.closeAltarUI();
      return;
    }
  }

  private updateAltarInput(): void {
    this.updateItemSelectInput(
      (item) => {
        // Starter-only weapons (e.g. the Broken Sword) have no item world ??
        // altar must refuse to spawn a dive portal for them.
        if (STARTER_ONLY_IDS.has(item.def.id)) {
          this.toast.show('Cannot dive ??too broken', 0xff4444);
          return;
        }
        if (this.activeAltar) {
          const altar = this.activeAltar;
          altar.used = true;
          this.closeAltarUI();
          this.spawnPortal(altar.x, altar.y - 20, item.rarity, 'altar', item);
        } else {
          this.closeAltarUI();
        }
      },
      () => this.drawAltarUI(),
    );
  }

  private clearAltars(): void {
    for (const a of this.altars) a.destroy();
    this.altars = [];
  }

  // ---------------------------------------------------------------------------
  // Anvil + Floor Collapse System
  // ---------------------------------------------------------------------------

  private spawnAnvilFromLdtk(level: LdtkLevel): void {
    // Clean up existing anvil
    if (this.anvil) {
      this.anvil.destroy();
      this.anvil = null;
    }
    if (this.anvilPrompt?.parent) {
      this.anvilPrompt.parent.removeChild(this.anvilPrompt);
      this.anvilPrompt = null;
    }
    this.currentAnvilIid = null;

    const anvilEnts = level.entities.filter(
      e => e.type === 'Anvil',
    );
    if (anvilEnts.length > 0) {
      const ent = anvilEnts[0]; // One anvil per level
      this.anvil = new Anvil(ent.px[0], ent.px[1]);
      this.currentAnvilIid = ent.iid;
      this.entityLayer.addChildAt(this.anvil.container, 0);
      return;
    }

    // Prototype fallback: spawn anvil at first altar position
    const altarEnts = level.entities.filter(e => e.type === 'Altar');
    if (altarEnts.length > 0) {
      console.warn(`[LdtkWorldScene] No Anvil entity in "${level.identifier}" ??using first Altar position as fallback`);
      const ent = altarEnts[0];
      this.anvil = new Anvil(ent.px[0], ent.px[1]);
      this.currentAnvilIid = ent.iid;
      this.entityLayer.addChildAt(this.anvil.container, 0);
    }
  }

  private updateAnvil(dt: number): void {
    if (!this.anvil || this.anvil.used) return;

    this.anvil.update(dt);

    // Proximity check
    const near = this.anvil.overlaps(
      this.player.x - 8, this.player.y - 8,
      this.player.width + 16, this.player.height + 16,
    );
    this.anvil.setShowHint(false); // disable built-in hint ??use KeyPrompt instead

    // KeyPrompt ??create lazily, show/hide + position in uiContainer.
    // Pattern A(Modal): C(ATTACK) �??�벤?�리(Anvil 모드) ?�기. ??LOOK_UP)?�
    // 방향 ?�력?�라 ?�인 ?�로 부?�합(UI_Interaction_Patterns.md).
    if (near && !this.anvil.hasItem()) {
      if (!this.anvilPrompt) {
        this.anvilPrompt = KeyPrompt.createPrompt('C', 'Place Weapon', this.game.uiScale);
        this.anvilPrompt.visible = false;
        this.game.uiContainer.addChild(this.anvilPrompt);
      }
      this.anvilPrompt.visible = true;
      const us = this.game.uiScale;
      const cam = this.game.camera;
      const ax = this.anvil.container.x + 16;
      const ay = this.anvil.container.y;
      const sx = (ax - cam.renderX + GAME_WIDTH / 2) * us - this.anvilPrompt.width / 2;
      const sy = (ay - cam.renderY + GAME_HEIGHT / 2 - 56) * us;
      this.anvilPrompt.x = Math.round(sx);
      this.anvilPrompt.y = Math.round(sy);
    } else if (this.anvilPrompt) {
      this.anvilPrompt.visible = false;
    }

    // ?�빌 UI ?�기??update() ?�입부???�점 분기?�서 처리?�다
    // (player.update ?�에 C ?�력???�비?�야 ?�스?�을 막을 ???�음).
    if (this.anvil.hasItem() && this.player.isAttackActive()) {
      const step = this.player.getAttackStep(this.player.comboIndex);
      if (step) {
        const hitbox = getAttackHitbox(
          this.player.x, this.player.y, this.player.width, this.player.height,
          this.player.facingRight ?? true, step,
        );
        if (aabbOverlap(hitbox, this.anvil.getHitAABB())) {
          this.triggerFloorCollapse();
        }
      }
    }
  }

  /**
   * Open the unified inventory UI in "anvil" mode. The player sees the same
   * grid inventory as the regular INVENTORY key but confirming an item places
   * it on the anvil instead of equipping.
   */
  private openAnvilUI(): void {
    if (this.inventory.items.length === 0) {
      this.toast.show('No items to place', 0xff4444);
      return;
    }
    // ?�레?�어가 ?�빌???�달 ???�내??tether ?�무 ?�료.
    this.activeAnvilTether?.requestFadeOut();
    // Hide the approach prompt while the inventory is open ??it would
    // otherwise bleed through the translucent inventory overlay. If the
    // player cancels, updateAnvil re-shows it on the next frame.
    if (this.anvilPrompt) this.anvilPrompt.visible = false;
    this.inventoryUI.openForAnvil((item) => {
      // Cannot place equipped weapon on anvil
      if (this.inventory.equipped?.uid === item.uid) {
        this.toast.show('Unequip first', 0xff4444);
        return;
      }
      // Starter-only weapons (e.g. the Broken Sword) have no item world ??
      // they are story props, not dive-able loot. Block placement outright.
      if (STARTER_ONLY_IDS.has(item.def.id)) {
        this.toast.show('Cannot dive ??too broken', 0xff4444);
        return;
      }
      // Fully cleared item ??confirm re-dive (increments cycle, resets strata).
      // Reuse the existing cycle-prompt overlay; it draws on top of the
      // inventory and steals input via the updateCyclePromptInput path.
      if (isItemFullyCleared(item)) {
        this.cyclePromptItem = item;
        this.drawCyclePromptUI(item);
        return;
      }
      this.placeItemOnAnvil(item);
    });
  }

  /** Shared "commit item to anvil" path. */
  private placeItemOnAnvil(item: ItemInstance): void {
    if (!this.anvil) {
      this.inventoryUI.close();
      return;
    }
    // Sacred Pickup S6 / T5 ??show preview before committing.
    // �??�이�??�후?�도 ?�일??full 모달 ?�용 (compact ?�트�??�기).
    if (this.divePreview) {
      const confirm = () => {
        if (!this.anvil) return;
        sacredSave.markFirstDiveDone();
        this.anvil.placeItem(item);
        this.collapseItem = item;
        this.inventoryUI.close();
        // 공격 ?�계 ?�략 ???�이???�택 즉시 ?�이�?진입
        this.triggerFloorCollapse();
      };
      const cancel = () => {
        // Reopen the inventory in anvil mode so user can pick another item.
        this.inventoryUI.refresh();
      };
      this.divePreview.showFull(item, confirm, cancel);
      return;
    }
    // Fallback path if preview unavailable.
    sacredSave.markFirstDiveDone();
    this.anvil.placeItem(item);
    this.collapseItem = item;
    this.inventoryUI.close();
    // 공격 ?�계 ?�략 ???�이???�택 즉시 ?�이�?진입
    this.triggerFloorCollapse();
  }

  private drawCyclePromptUI(item: ItemInstance): void {
    if (this.cyclePromptUI) {
      if (this.cyclePromptUI.parent) this.cyclePromptUI.parent.removeChild(this.cyclePromptUI);
      this.cyclePromptUI.destroy({ children: true });
      this.cyclePromptUI = null;
    }

    const ui = new Container();
    const panelW = 220;
    const panelH = 80;
    const px = Math.floor((GAME_WIDTH - panelW) / 2);
    const py = Math.floor((GAME_HEIGHT - panelH) / 2);

    const bg = new Graphics();
    bg.rect(0, 0, panelW, panelH).fill({ color: 0x1a1a2e, alpha: 0.96 });
    bg.rect(0, 0, panelW, panelH).stroke({ color: 0xff8844, width: 1 });
    bg.x = px;
    bg.y = py;
    ui.addChild(bg);

    const title = new BitmapText({
      text: '[MEMORY ALREADY ECHOED]',
      style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0xff8844 },
    });
    title.x = px + 8;
    title.y = py + 6;
    ui.addChild(title);

    const nextCycle = (item.worldProgress?.cycle ?? 0) + 1;
    const lines = [
      `${item.def.name}`,
      '',
      'Dive again? Memories rewind.',
      'Enemies grow sharper.',
      '',
      `Cycle ${nextCycle}`,
      '',
      '[C] Dive Again   [ESC] Cancel',
    ];
    for (let i = 0; i < lines.length; i++) {
      const fill = i === 0 ? 0xffcc44 : i === lines.length - 1 ? 0xaaaaaa : 0xffffff;
      const t = new BitmapText({
        text: lines[i],
        style: { fontFamily: PIXEL_FONT, fontSize: 8, fill },
      });
      t.x = px + 8;
      t.y = py + 18 + i * 8;
      ui.addChild(t);
    }

    this.cyclePromptUI = ui;
    this.game.legacyUIContainer.addChild(ui);
  }

  private closeCyclePromptUI(): void {
    this.cyclePromptItem = null;
    if (this.cyclePromptUI) {
      if (this.cyclePromptUI.parent) this.cyclePromptUI.parent.removeChild(this.cyclePromptUI);
      this.cyclePromptUI.destroy({ children: true });
      this.cyclePromptUI = null;
    }
  }

  private updateCyclePromptInput(): void {
    const input = this.game.input;
    const item = this.cyclePromptItem;
    if (!item) return;

    // Pattern A(Modal): C = ?�인, ESC = 취소. Z/X ??UI ?�서 ?�용 금�?
    // (UI_Interaction_Patterns.md). Jump/Dash 게임 ?�션�?충돌?��? ?�도�?분리.
    if (input.isJustPressed(GameAction.ATTACK)) {
      // Confirm re-dive ??reset progress, close prompt, proceed to anvil strike
      resetItemForNextCycle(item);
      this.closeCyclePromptUI();
      this.toast.show(`Cycle ${item.worldProgress?.cycle ?? 0} ??Memories rewind`, 0xff8844);
      this.placeItemOnAnvil(item);
      return;
    }
    if (input.isJustPressed(GameAction.MENU)) {
      // Cancel ??return to the item select UI.
      // Anvil path uses the unified InventoryUI (already open in anvil mode),
      // while the altar path uses the legacy drawItemSelectUI overlay.
      this.closeCyclePromptUI();
      if (this.inventoryUI.visible && this.inventoryUI.isAnvilMode()) {
        this.inventoryUI.refresh();
      } else {
        this.drawItemSelectUI('Offer item to altar:', 0xaaccff);
      }
      return;
    }
  }

  // ---------------------------------------------------------------------------
  // Ending sequence ??delegated to EndingSequence class
  // ---------------------------------------------------------------------------

  private rerenderTilemap(): void {
    // Filter out wall tiles where collision grid is 0 (destroyed floors/walls)
    const grid = this.collisionGrid;
    const filteredTiles = this.currentLevel.wallTiles.filter(t => {
      const col = Math.floor(t.px[0] / TILE_SIZE);
      const row = Math.floor(t.px[1] / TILE_SIZE);
      // Keep tile only if collision cell is still solid (1) or water (2)
      return (grid[row]?.[col] ?? 0) !== 0;
    });
    this.renderer.rebuildWallLayer(filteredTiles, this.atlases);
  }

  private triggerFloorCollapse(): void {
    if (!this.anvil || !this.collapseItem) return;

    this.anvil.used = true;
    this.anvil.setShowHint(false);

    // All anvils are reusable ??snapshot position for player return point.
    this.lastUsedAnvilPos = {
      x: this.anvil.x,
      y: this.anvil.y,
      width: this.anvil.width,
      height: this.anvil.height,
    };

    // ARCHIVED: MemoryDive sequence ??replaced by anvil gate FX019 activation
    // The anvil's placeItem() already triggers FX019 + item icon display.
    // We just need hitstop + flash + delayed entry.
    sacredSave.incrementDive(this.collapseItem.def.id);

    // Hitstop freeze so player sees the FX + icon on the gate
    this.game.hitstopFrames = 8; // short hit freeze

    // Short hit feedback + zoom into anvil
    this.game.camera.shake(3);
    this.game.camera.zoomTo(2, 0.03);
    this.hitSparks.spawn(this.anvil.x, this.anvil.y - 10, true, 0);

    // Warp when FX019 animation completes: custom screen transition
    // Keep zoom-in during transition — reset only after full blackout
    this.anvil.onFxComplete = () => {
      this.runDiveTransition();
    };
  }

  /** Rarity ??ItemTunnel level name mapping. */
  private static readonly TUNNEL_BY_RARITY: Record<Rarity, string> = {
    normal: 'ItemTunnel_01',
    magic: 'ItemTunnel_02',
    rare: 'ItemTunnel_03',
    legendary: 'ItemTunnel_04',
    ancient: 'ItemTunnel_05',
  };

  /** After floor collapse fade-out, proceed to Item World.
   *
   * Currently skips the tunnel descent and jumps straight into Item World
   * after the anvil FX. The tunnel flow is preserved in
   * `completeFloorCollapseEntryViaTunnel()` (archived) for future restoration.
   */
  private completeFloorCollapseEntry(): void {
    if (!this.collapseItem) return;

    // Clean up dive/collapse/crack effects
    if (this.screenCrack) {
      this.screenCrack.destroy();
      this.screenCrack = null;
    }
    if (this.memoryDive) {
      this.memoryDive.destroy();
      this.memoryDive = null;
    }
    if (this.floorCollapse) {
      this.floorCollapse.destroy();
      this.floorCollapse = null;
    }

    // Remember where we came from so we can return after exiting Item World.
    this.preTunnelLevelId = this.currentLevel.identifier;

    // ARCHIVED — tunnel descent disabled. Player enters Item World directly
    // after the anvil FX. To restore the tunnel flow, call
    // `this.completeFloorCollapseEntryViaTunnel()` instead of the line below.
    // this.completeFloorCollapseEntryViaTunnel();
    this.enterItemWorldFromTunnel();
  }

  /**
   * ARCHIVED — original tunnel descent entry.
   *
   * Loads an `ItemTunnel_*` level (rarity-mapped) where the player walks down
   * to the bottom edge, which then triggers `enterItemWorldFromTunnel()`.
   * Kept intact so the tunnel presentation can be re-enabled by swapping the
   * call site in `completeFloorCollapseEntry()`.
   */
  private completeFloorCollapseEntryViaTunnel(): void {
    if (!this.collapseItem) return;
    this.inItemTunnel = true;
    if (this.minimap) this.minimap.visible = false;

    const tunnelId = LdtkWorldScene.TUNNEL_BY_RARITY[this.collapseItem.rarity];
    const tunnelExists = this.loader.getLevel(tunnelId);
    const targetTunnel = tunnelExists ? tunnelId : 'ItemTunnel_01';
    this.loadLevel(targetTunnel, 'up');
  }

  /** Fade out at the bottom of the tunnel, then enter Item World. */
  private startTunnelExitTransition(): void {
    this.transitionState = 'fade_out';
    this.transitionTimer = FADE_DURATION;
    this.pendingDirection = 'down';
    this.pendingLevelId = '__item_world__';
  }

  /** Called when player reaches the end of an ItemTunnel ??enter Item World. */
  private enterItemWorldFromTunnel(): void {
    if (!this.collapseItem) return;

    const targetItem = this.collapseItem;

    // Hand-crafted item world (disabled ??using procedural generation by rarity)
    // if (!targetItem.fixedLevelId) {
    //   targetItem.fixedLevelId = 'ItemWorld_FirstSword';
    // }
    // this.enterFixedItemWorld(targetItem);
    // return;

    // Fixed level override (if set on item)
    if (targetItem.fixedLevelId) {
      this.enterFixedItemWorld(targetItem);
      return;
    }

    const prevLevel = targetItem.level;
    const prevAtk = this.player.atk;

    this.container.visible = false;
    this.detachSharedUiForItemWorld();

    const itemWorldScene = new ItemWorldScene(this.game, targetItem, this.inventory, this.player);
    itemWorldScene.itemWorldTutorialDone = this.unlockedEvents.has('__itemWorldTutorialDone');
    itemWorldScene.egoUnlockedEvents = this.unlockedEvents;
    itemWorldScene.onComplete = () => {
      this.game.sceneManager.pop();
      this.updatePlayerAtk();
      this.unlockedEvents.add('__itemWorldTutorialDone');
      // �??�이?�계 ?�리?????�직 I �????��??�면 HUD [I] ???�스 강조 ON.
      if (!this.unlockedEvents.has('__itemKeyPressedAfterItemWorld')) {
        this.hud.setItemKeyHighlight(true);
      }

      // Collect earned gold from Item World
      if (itemWorldScene.earnedGold > 0) {
        this.gold += itemWorldScene.earnedGold;
        this.toast.show(`+${itemWorldScene.earnedGold} G`, 0xffd700);
      }

      if (targetItem.level > prevLevel) {
        this.toast.show(`${targetItem.def.name} Level Up! Lv${targetItem.level}`, 0xff88ff);
      }
      if (this.player.atk !== prevAtk) {
        this.toast.show(`ATK ${prevAtk} -> ${this.player.atk}`, 0xffff44);
      }

      // ── Ego T14: "또 올 거야?" after first item world return ──
      if (
        hasEgo(targetItem.def.id)
        && !this.unlockedEvents.has(EGO_EVENT.WORLD_RETURN)
      ) {
        this.unlockedEvents.add(EGO_EVENT.WORLD_RETURN);
        setTimeout(() => {
          if (!this.loreDisplay?.isActive) {
            this.loreDisplay?.showDialogue(EGO_WORLD_RETURN, false);
          }
        }, 1000);
      }

      // Return to the forge room (not the tunnel)
      this.inItemTunnel = false;
      if (this.preTunnelLevelId) {
        this.loadLevel(this.preTunnelLevelId, 'down');
        this.preTunnelLevelId = null;
      }
      this.collapseItem = null;

      // Reset anvil so it can be reused for repeated Item World dives
      if (this.anvil) {
        this.anvil.used = false;
        this.anvil.item = null;
      }

      // Spawn next to the (now-removed) anvil using the snapshot position.
      this.placePlayerAtReturnPoint();
    };

    this.game.sceneManager.push(itemWorldScene, true);
  }

  /**
   * Position the player at the used-anvil snapshot after returning from the
   * item world. Falls back to the current anvil position if the snapshot is
   * missing (shouldn't happen in normal flow but keeps the scene coherent).
   */
  private placePlayerAtReturnPoint(): void {
    const snap = this.lastUsedAnvilPos ?? (this.anvil
      ? { x: this.anvil.x, y: this.anvil.y, width: this.anvil.width, height: this.anvil.height }
      : null);
    if (!snap) return;
    this.player.x = snap.x + snap.width / 2 + 8;
    this.player.y = snap.y - this.player.height;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.savePrevPosition();
    this.game.camera.snap(this.player.x, this.player.y);
  }

  /**
   * Enter a hand-crafted item world level (fixedLevelId).
   * Uses the same LdtkWorldScene level loading ??player spawns at Player entity.
   * Navigates back via portal or edge transition.
   */
  private enterFixedItemWorld(item: ItemInstance): void {
    const levelId = item.fixedLevelId!;
    const level = this.loader.getLevel(levelId);
    if (!level) {
      console.error(`[LdtkWorldScene] Fixed item world level not found: "${levelId}"`);
      // Fallback to procedural
      this.collapseItem = item;
      const itemWorldScene = new ItemWorldScene(this.game, item, this.inventory, this.player);
      itemWorldScene.itemWorldTutorialDone = this.unlockedEvents.has('__itemWorldTutorialDone');
      itemWorldScene.egoUnlockedEvents = this.unlockedEvents;
      itemWorldScene.onComplete = () => {
        this.game.sceneManager.pop();
        this.updatePlayerAtk();
        this.unlockedEvents.add('__itemWorldTutorialDone');
        // �??�이?�계 ?�리?????�직 I �????��??�면 HUD [I] ???�스 강조 ON.
        if (!this.unlockedEvents.has('__itemKeyPressedAfterItemWorld')) {
          this.hud.setItemKeyHighlight(true);
        }
        // Collect earned gold from Item World
        if (itemWorldScene.earnedGold > 0) {
          this.gold += itemWorldScene.earnedGold;
          this.toast.show(`+${itemWorldScene.earnedGold} G`, 0xffd700);
        }
        this.inItemTunnel = false;
        if (this.preTunnelLevelId) {
          this.loadLevel(this.preTunnelLevelId, 'down');
          this.preTunnelLevelId = null;
        }
        this.collapseItem = null;
        // Spawn next to the (now-removed) anvil using the snapshot position.
        this.placePlayerAtReturnPoint();
      };
      this.container.visible = false;
      this.detachSharedUiForItemWorld();
      this.game.sceneManager.push(itemWorldScene, true);
      return;
    }

    // Track that we're in a fixed item world (for return logic)
    this.inFixedItemWorld = true;
    this.fixedItemWorldItem = item;

    // Load the hand-crafted level ??'down' uses Player entity spawn
    this.inItemTunnel = false;
    this.loadLevel(levelId, 'down');
  }

  /** Exit fixed item world ??return to the forge room. */
  private exitFixedItemWorld(): void {
    if (this.portalTransition) {
      this.portalTransition.destroy();
      this.portalTransition = null;
    }

    this.inFixedItemWorld = false;
    this.fixedItemWorldItem = null;
    this.collapseItem = null;

    // Return to forge
    const returnLevel = this.preTunnelLevelId ?? this.playerSpawnLevelId;
    this.preTunnelLevelId = null;
    this.loadLevel(returnLevel, 'down');

    // Place player next to the (possibly-removed) anvil snapshot.
    this.placePlayerAtReturnPoint();
  }

  // ---------------------------------------------------------------------------
  // Narrative event chains
  // ---------------------------------------------------------------------------

  /**
   * Fire a narrative event. Handles chained events:
   * - echo_shelved ??marta_note_complete (with silhouette)
   */
  async fireNarrativeEvent(eventName: string): Promise<void> {
    // await this.dialogueManager.fireEvent(eventName);

    // // Chain: after Marta's note, fire silhouette event
    // if (eventName === 'echo_shelved') {
    //   await this.showSeraSilhouette();
    // }
  }

  /**
   * T-12: Sera silhouette sequence.
   * 1. Echo vibrates (player sprite shakes 1s)
   * 2. Silhouette appears on rooftop
   * 3. "...Who was that?" dialogue
   * 4. Silhouette fades out
   */
  private async showSeraSilhouette(): Promise<void> {
    // 1. Echo vibration ??shake player for 1 second
    this.player.startVibrate(2, 60, false); // amplitude=2px, 60 frames ??1s

    await this.delay(1000);

    // 2. Draw silhouette above the scene (rooftop position relative to player)
    const silhouette = new Graphics();
    // Simple dark figure: head (circle) + body (rect)
    silhouette.circle(0, -20, 5).fill({ color: 0x111122, alpha: 0.7 });
    silhouette.rect(-4, -15, 8, 18).fill({ color: 0x111122, alpha: 0.7 });
    silhouette.x = this.player.x + 60;
    silhouette.y = this.player.y - 48;
    silhouette.alpha = 0.6;
    this.entityLayer.addChild(silhouette);

    // 3. Fire the dialogue
    // await this.dialogueManager.fireEvent('marta_note_complete');

    // 4. Fade out silhouette
    const fadeMs = 500;
    const startAlpha = silhouette.alpha;
    const startTime = performance.now();
    await new Promise<void>((resolve) => {
      const fadeStep = () => {
        const elapsed = performance.now() - startTime;
        const t = Math.min(1, elapsed / fadeMs);
        silhouette.alpha = startAlpha * (1 - t);
        if (t >= 1) {
          if (silhouette.parent) silhouette.parent.removeChild(silhouette);
          silhouette.destroy();
          resolve();
        } else {
          requestAnimationFrame(fadeStep);
        }
      };
      requestAnimationFrame(fadeStep);
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ---------------------------------------------------------------------------
  // Minimap
  // ---------------------------------------------------------------------------

  private minimap: Container | null = null;
  private minimapDot: Graphics | null = null;
  private minimapBlinkTimer = 0;
  private minimapVpLeft = 0;
  private minimapVpTop = 0;
  private minimapScaleX = 1;
  private minimapScaleY = 1;
  private minimapPW = 0;
  private minimapPH = 0;
  private worldMap!: WorldMapOverlay;

  /**
   * Fixed-viewport HUD minimap (GDD System_UI_Minimap.md §1).
   * - Panel: 128x72 px (16:9). Position: top-right.
   * - Viewport: current room centered, +-3 cells shown.
   * - Background: alpha 0.6 black. Border: 1px #666666.
   * - Current room: white 2px border + blinking player dot.
   * - Visited: tier theme color. Adjacent: dim. Undiscovered: hidden.
   * - Cleared: visited + check. Markers: save(red), boss(orange), anvil(gold).
   * - Opacity: 70% normal, 40% during combat.
   */
  private drawMinimap(): void {
    if (this.minimap) {
      if (this.minimap.parent) this.minimap.parent.removeChild(this.minimap);
    }
    this.minimap = new Container();
    this.minimapDot = null;

    if (!this.currentLevel) return;

    const worldMap = this.loader.getWorldMap()
      .filter(r => !r.id.startsWith('ItemTunnel') && !r.id.startsWith('ItemWorld') && !r.id.startsWith('Debug_'));
    if (worldMap.length === 0) return;

    // Panel size matches skin hud_map_frame inner area (center: 112x60 at 640x360)
    const us = this.game.uiScale;
    const PW = 112 * us;
    const PH = 60 * us;

    // Viewport: 16:9 world-space window centered on current room.
    // 5 cells wide (~3840px) to show more surrounding rooms comfortably.
    const VP_W = 3840;
    const VP_H = VP_W * (PH / PW); // maintain 16:9 -> 1296

    const curCX = this.currentLevel.worldX + this.currentLevel.pxWid / 2;
    const curCY = this.currentLevel.worldY + this.currentLevel.pxHei / 2;
    const vpLeft = curCX - VP_W / 2;
    const vpTop  = curCY - VP_H / 2;
    const scaleX = PW / VP_W;
    const scaleY = PH / VP_H;

    // Cache for real-time dot tracking in update()
    this.minimapVpLeft = vpLeft;
    this.minimapVpTop = vpTop;
    this.minimapScaleX = scaleX;
    this.minimapScaleY = scaleY;
    this.minimapPW = PW;
    this.minimapPH = PH;

    // Fog of war: visited + adjacent (outlined)
    const visitedIds = this.visitedLevels;
    const clearedIds = this.clearedLevels;
    const adjacentIds = new Set<string>();
    for (const id of visitedIds) {
      const level = this.loader.getLevel(id);
      if (level) {
        for (const nb of level.neighbors) {
          if (!visitedIds.has(nb)) adjacentIds.add(nb);
        }
      }
    }

    // No background ??skin hud_map_frame provides the panel chrome

    const content = new Container();
    // Clip content to panel bounds (rooms keep correct proportions)
    const clipMask = new Graphics();
    clipMask.rect(0, 0, PW, PH).fill(0xffffff);
    this.minimap.addChild(clipMask);
    content.mask = clipMask;

    // Helper: project world rect to panel coords (no clamping ??mask handles overflow)
    const project = (r: { x: number; y: number; w: number; h: number }) => {
      const rx = (r.x - vpLeft) * scaleX;
      const ry = (r.y - vpTop) * scaleY;
      const rw = Math.max(1, r.w * scaleX);
      const rh = Math.max(1, r.h * scaleY);
      const visible = rx + rw > 0 && rx < PW && ry + rh > 0 && ry < PH;
      return { rx, ry, rw, rh, visible };
    };

    // GDD tier colors (§1.4)
    const TIER_COLORS: Record<string, number> = {
      'Tier1': 0x4A8A4A, 'Tier2': 0x5A7A8C, 'Tier3': 0x4A3A2A,
      'Tier4': 0x2A4A6C, 'Tier5': 0x6A4A8C, 'Tier6': 0x4AACCC, 'Tier7': 0x8C2A2A,
    };
    const DEFAULT_TIER_COLOR = 0x5A7A8C;

    // Infer tier from level id prefix (e.g. "Tier2_CentralHall")
    const getTierColor = (id: string): number => {
      for (const key of Object.keys(TIER_COLORS)) {
        if (id.startsWith(key)) return TIER_COLORS[key];
      }
      return DEFAULT_TIER_COLOR;
    };

    // Draw rooms ??visited rooms show internal tile structure
    for (const r of worldMap) {
      if (r.x + r.w < vpLeft || r.x > vpLeft + VP_W) continue;
      if (r.y + r.h < vpTop  || r.y > vpTop + VP_H) continue;

      const isCurrent = r.id === this.currentLevel.identifier;
      const visited = visitedIds.has(r.id);
      const cleared = clearedIds.has(r.id);
      const adjacent = adjacentIds.has(r.id);
      if (!isCurrent && !visited && !adjacent) continue;

      const p = project(r);
      if (!p.visible) continue;

      const g = new Graphics();

      if (isCurrent || visited) {
        const tierColor = getTierColor(r.id);
        const level = this.loader.getLevel(r.id);

        if (level && level.collisionGrid.length > 0) {
          // Render tile-level detail for visited rooms
          const grid = level.collisionGrid;
          const gridH = grid.length;
          const gridW = grid[0]?.length ?? 0;
          const tileW = p.rw / gridW;
          const tileH = p.rh / gridH;

          // Background (air = dark)
          g.rect(p.rx, p.ry, p.rw, p.rh).fill({ color: 0x111118, alpha: isCurrent ? 0.9 : 0.7 });

          // Solid tiles
          for (let ty = 0; ty < gridH; ty++) {
            for (let tx = 0; tx < gridW; tx++) {
              const v = grid[ty][tx];
              if (v === 0) continue; // air ??skip
              const px = p.rx + tx * tileW;
              const py = p.ry + ty * tileH;
              const tw = Math.max(0.5, tileW);
              const th = Math.max(0.5, tileH);
              let tileColor = tierColor;
              let tileAlpha = isCurrent ? 0.9 : 0.7;
              if (v === 1) { tileColor = tierColor; } // wall
              else if (v === 2) { tileColor = 0x2244aa; tileAlpha = 0.5; } // water
              else if (v === 3) { tileColor = tierColor; tileAlpha *= 0.6; } // platform
              else if (v === 5) { tileColor = 0xcc3333; } // spike
              else { tileColor = tierColor; tileAlpha *= 0.5; } // other
              g.rect(px, py, tw, th).fill({ color: tileColor, alpha: tileAlpha });
            }
          }
        } else {
          // Fallback: solid fill
          g.rect(p.rx, p.ry, p.rw, p.rh).fill({ color: tierColor, alpha: isCurrent ? 1.0 : 0.8 });
        }

        if (visited) {
          g.rect(p.rx, p.ry, p.rw, p.rh).stroke({ color: 0x556688, width: us });
        }
      } else {
        // Adjacent/outlined: dim outline only
        g.rect(p.rx, p.ry, p.rw, p.rh).fill({ color: 0x333344, alpha: 0.4 });
      }

      // Current room: white border
      if (isCurrent) {
        g.rect(p.rx, p.ry, p.rw, p.rh).stroke({ color: 0xffffff, width: 2 * us });
      }
      content.addChild(g);
    }

    // Auto markers (GDD §2) ??save, boss, anvil
    for (const r of worldMap) {
      if (!visitedIds.has(r.id)) continue;
      if (r.x + r.w < vpLeft || r.x > vpLeft + VP_W) continue;
      if (r.y + r.h < vpTop  || r.y > vpTop + VP_H) continue;
      const level = this.loader.getLevel(r.id);
      if (!level) continue;

      const mx = Math.min(PW - 2 * us, Math.max(2 * us, (r.x - vpLeft) * scaleX + (r.w * scaleX) / 2));
      const my = Math.min(PH - 2 * us, Math.max(2 * us, (r.y - vpTop) * scaleY + (r.h * scaleY) / 2));

      // Save point: red circle
      if (level.entities.some(e => e.type === 'GameSaver')) {
        const marker = new Graphics();
        marker.circle(mx, my, 2 * us).fill(0xff4444);
        content.addChild(marker);
      }
      // Anvil: gold circle
      if (level.entities.some(e => e.type === 'Anvil' || e.type === 'ItemTunnelEntrance')) {
        const marker = new Graphics();
        marker.circle(mx + 3 * us, my, 1.5 * us).fill(0xffd700);
        content.addChild(marker);
      }
      // Boss room: orange/gray circle
      if (level.entities.some(e => e.type === 'Boss' || e.type === 'BossSpawn')) {
        const defeated = clearedIds.has(r.id);
        const marker = new Graphics();
        marker.circle(mx, my - 3 * us, 2 * us).fill(defeated ? 0x666666 : 0xff8800);
        content.addChild(marker);
      }
    }

    // Player dot (blinking) ??GDD §1.5
    // Drawn at origin; position updated every frame in update()
    {
      const dotSize = 3 * us;
      const dot = new Graphics();
      dot.rect(0, 0, dotSize, dotSize).fill(0xffffff);
      const px = Math.min(PW - dotSize, Math.max(dotSize, (this.player.x + this.currentLevel.worldX - vpLeft) * scaleX));
      const py = Math.min(PH - dotSize, Math.max(dotSize, (this.player.y + this.currentLevel.worldY - vpTop) * scaleY));
      dot.x = px - dotSize / 2;
      dot.y = py - dotSize / 2;
      this.minimapDot = dot;
      content.addChild(dot);
    }

    this.minimap.addChild(content);

    // Position: inside skin hud_map_frame (bounds x=515,y=6, center x=6,y=5)
    this.minimap.scale.set(1);
    this.minimap.x = (515 + 6) * us;
    this.minimap.y = (6 + 5 - 3) * us;

    // Opacity: 70% normal, 40% during combat (GDD §1.1)
    const inCombat = this.enemies.some(e => e.hp > 0 && !e.shouldRemove);
    this.minimap.alpha = inCombat ? 0.4 : 0.7;

    // Keep minimap hidden during the intro fade-in/title sequence. Revealed
    // together with the HUD once the area title completes.
    if (this.introPhase === 'fadeIn' || this.introPhase === 'title') {
      this.minimap.visible = false;
    }

    this.game.uiContainer.addChild(this.minimap);
  }

  // ---------------------------------------------------------------------------
  // World Map markers
  // ---------------------------------------------------------------------------

  private collectMapMarkers(): { roomId: string; type: 'save' | 'anvil' | 'boss' | 'gate'; label?: string }[] {
    const markers: { roomId: string; type: 'save' | 'anvil' | 'boss' | 'gate'; label?: string }[] = [];

    for (const id of this.visitedLevels) {
      const level = this.loader.getLevel(id);
      if (!level) continue;

      for (const e of level.entities) {
        if (e.type === 'GameSaver') {
          markers.push({ roomId: id, type: 'save' });
        } else if (e.type === 'Anvil') {
          markers.push({ roomId: id, type: 'anvil' });
        } else if (e.type === 'Enemy_Spawn') {
          const enemyType = (e.fields['type'] as string) ?? '';
          if (enemyType === 'Boss') {
            markers.push({ roomId: id, type: 'boss' });
          }
        } else if (e.type === 'LockedDoor') {
          const condition = (e.fields['UnlockCondition'] as string) ?? '';
          if (condition === 'Stat') {
            const statType = (e.fields['StatType'] as string) ?? 'atk';
            const threshold = (e.fields['StatThreshold'] as number) ?? 0;
            markers.push({ roomId: id, type: 'gate', label: `${statType.toUpperCase()} ${threshold}` });
          }
        }
      }
    }

    return markers;
  }

  // ---------------------------------------------------------------------------
  // Entity cleanup helpers
  // ---------------------------------------------------------------------------

  private clearEnemies(): void {
    for (const e of this.enemies) {
      if (e.container.parent) e.container.parent.removeChild(e.container);
    }
    this.enemies = [];
    for (const p of this.projectiles) p.destroy();
    this.projectiles = [];
  }

  private clearDrops(): void {
    for (const d of this.drops) d.destroy();
    this.drops = [];
  }

  // ── Ego dialogue triggers ───────────────────────────────────────
  // Code-driven triggers for Rustborn Ego that can't be placed as LDtk entities.

  /**
   * T02: First movement after Ego wake — non-blocking auto-close dialogue.
   * T03: Anvil proximity hint — non-blocking.
   * S01: Weapon swap — Rustborn unequipped.
   */
  private updateEgoTriggers(_dt: number): void {
    if (!this.loreDisplay || this.loreDisplay.isActive) return;

    // T02: First walk after Ego wake
    if (
      this.unlockedEvents.has(EGO_EVENT.WAKE)
      && !this.unlockedEvents.has(EGO_EVENT.FIRST_WALK)
      && (this.player.vx !== 0 || this.player.vy !== 0)
    ) {
      this.unlockedEvents.add(EGO_EVENT.FIRST_WALK);
      this.loreDisplay.showDialogue(EGO_FIRST_WALK, true);
      return;
    }

    // T03: Anvil proximity (first time after Ego wake)
    if (
      this.anvil
      && this.unlockedEvents.has(EGO_EVENT.WAKE)
      && !this.unlockedEvents.has(EGO_EVENT.ANVIL_HINT)
    ) {
      const dx = (this.player.x + this.player.width / 2) - this.anvil.x;
      const dy = (this.player.y + this.player.height / 2) - (this.anvil.y - this.anvil.height / 2);
      if (dx * dx + dy * dy < 60 * 60) {
        this.unlockedEvents.add(EGO_EVENT.ANVIL_HINT);
        this.loreDisplay.showDialogue(EGO_ANVIL, false);
        return;
      }
    }
  }

  /**
   * S01: Call when player equips a weapon that is NOT an Ego weapon,
   * while previously having an Ego weapon equipped.
   * Should be called from equipWeapon() or inventory UI confirm.
   */
  fireEgoWeaponSwap(): void {
    if (
      this.loreDisplay
      && !this.unlockedEvents.has(EGO_EVENT.WEAPON_SWAP)
    ) {
      this.unlockedEvents.add(EGO_EVENT.WEAPON_SWAP);
      this.loreDisplay.showDialogue(EGO_WEAPON_SWAP, false);
    }
  }

  // ── Dive transition (replaces MemoryDive) ─────────────────────────
  // step 1: hitstop 10f + screen flash (공명)
  // step 2: color drain + iris shrink toward anvil center (800ms)
  // step 3: black screen 500ms → scene switch

  private diveOverlay: Graphics | null = null;
  private diveIris: Graphics | null = null;

  private runDiveTransition(): void {
    this.diveTransitionActive = true;
    const anvilCx = this.anvil!.x;
    const anvilCy = this.anvil!.y - this.anvil!.height / 2;
    const cam = this.game.camera;

    // ── Step 1: 공명 (hitstop + flash) ──
    this.game.hitstopFrames = 10;
    this.screenFlash.flash(0xffffff, 0.6, 200);
    this.game.camera.shake(4);

    // ── Step 2: 색상 드레인 + 아이리스 축소 (800ms) ──
    setTimeout(() => {
      // Desaturation overlay
      this.diveOverlay = new Graphics();
      this.diveOverlay.rect(0, 0, GAME_WIDTH, GAME_HEIGHT)
        .fill({ color: 0x000000, alpha: 0 });
      this.game.legacyUIContainer.addChild(this.diveOverlay);

      // Iris circle mask effect (shrinking circle toward anvil)
      this.diveIris = new Graphics();
      this.game.legacyUIContainer.addChild(this.diveIris);

      const IRIS_DURATION = 800;
      const startTime = performance.now();
      const maxRadius = Math.max(GAME_WIDTH, GAME_HEIGHT);

      // Convert anvil world coords to screen coords
      const screenCx = anvilCx - cam.renderX + GAME_WIDTH / 2;
      const screenCy = anvilCy - cam.renderY + GAME_HEIGHT / 2;

      const animateIris = () => {
        const elapsed = performance.now() - startTime;
        const t = Math.min(1, elapsed / IRIS_DURATION);
        const eased = t * t; // ease-in

        // Darken overlay (desaturation effect)
        if (this.diveOverlay) {
          this.diveOverlay.clear();
          this.diveOverlay.rect(0, 0, GAME_WIDTH, GAME_HEIGHT)
            .fill({ color: 0x000000, alpha: eased * 0.6 });
        }

        // Iris: black screen with shrinking transparent circle
        if (this.diveIris) {
          const radius = maxRadius * (1 - eased);
          this.diveIris.clear();
          // Full black rect
          this.diveIris.rect(0, 0, GAME_WIDTH, GAME_HEIGHT)
            .fill({ color: 0x000000, alpha: eased * 0.8 });
          // Cut transparent circle
          if (radius > 2) {
            this.diveIris.circle(screenCx, screenCy, radius)
              .cut();
          }
        }

        if (t < 1) {
          requestAnimationFrame(animateIris);
        } else {
          // ── Step 3: 검은 화면 500ms → 씬 전환 ──
          this.stepDiveBlackout();
        }
      };
      requestAnimationFrame(animateIris);
    }, 200); // wait for hitstop to finish
  }

  private stepDiveBlackout(): void {
    // Full black screen
    if (this.diveOverlay) {
      this.diveOverlay.clear();
      this.diveOverlay.rect(0, 0, GAME_WIDTH, GAME_HEIGHT)
        .fill({ color: 0x000000, alpha: 1 });
    }
    if (this.diveIris) {
      this.diveIris.clear();
      this.diveIris.rect(0, 0, GAME_WIDTH, GAME_HEIGHT)
        .fill({ color: 0x000000, alpha: 1 });
    }

    // Hold black for 500ms, then transition
    setTimeout(() => {
      // Cleanup overlays
      if (this.diveOverlay?.parent) this.diveOverlay.parent.removeChild(this.diveOverlay);
      if (this.diveIris?.parent) this.diveIris.parent.removeChild(this.diveIris);
      this.diveOverlay = null;
      this.diveIris = null;
      this.diveTransitionActive = false;

      // Reset zoom now — screen is fully black so player won't see the snap
      this.game.camera.setZoom(1.0);

      // Enter item world
      this.completeFloorCollapseEntry();
    }, 500);
  }
}
