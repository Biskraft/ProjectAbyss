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

import { Container, Graphics, BitmapText, Assets, Texture, Sprite, Rectangle } from 'pixi.js';
import { Scene } from '@core/Scene';
import { Debug } from '@core/Debug';
import { GameAction, actionKey } from '@core/InputManager';
import { ProximityRouter, type ProximityInteraction } from '@core/ProximityRouter';
import { aabbOverlap } from '@core/Physics';
import { LdtkLoader } from '@level/LdtkLoader';
import { LdtkRenderer } from '@level/LdtkRenderer';
import type { LdtkLevel } from '@level/LdtkLoader';
import { Player, OIL_SLIP_DURATION_MS, OIL_RESIDUE_DURATION_MS, ACID_RESIDUE_DURATION_MS, MAGMA_RESIDUE_DURATION_MS, WATER_RESIDUE_DURATION_MS, CYRO_RESIDUE_DURATION_MS, EGO_SHARD_MAX, SHARD_RECOVERY_MS } from '@entities/Player';
import { Skeleton } from '@entities/Skeleton';
import { Ghost } from '@entities/Ghost';
import { Slime } from '@entities/Slime';
import { Boss01 } from '@entities/Boss01';
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
import { BreakableProp, type PropDrop } from '@entities/BreakableProp';
import { Breakable, isBreakableSpriteId, type BreakableSpriteId } from '@entities/Breakable';
import { Building } from '@entities/Building';
import { spawnBreakableProps } from '@systems/BreakablePropSpawner';
import { SecretWall } from '@entities/SecretWall';
import { getMasterItem } from '@data/itemMaster';
import { Spike } from '@entities/Spike';
import { isInUpdraft, isInSpike, isInVoid, isWater, isIce, getTile, TILE_AIR, TILE_WALL, TILE_MAGMA, TILE_WATER, TILE_METAL, TILE_ACID, isInMagma, isInOil, isInAcid, isInCyro } from '@core/Physics';
import { CollapsingPlatform } from '@entities/CollapsingPlatform';
import { HealthShard } from '@entities/HealthShard';
import { HealingPickup, createEmberShard, createForgeEmber } from '@entities/HealingPickup';
import { GoldPickup } from '@entities/GoldPickup';
import { HitManager, BASE_HITBOX_W } from '@combat/HitManager';
import { COMBO_STEPS, getAttackHitbox } from '@combat/CombatData';
import { HUD } from '@ui/HUD';
import { AreaTitle } from '@ui/AreaTitle';
import { TITLE_FADE_OVERLAY_LABEL, TitleScene } from './TitleScene';
import { UISkin } from '@ui/UISkin';
import { KeyPrompt } from '@ui/KeyPrompt';
import {
  MODAL_BG, MODAL_BG_ALPHA, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_WARNING, FONT_HINT,
} from '@ui/ModalPanel';
import { ControlsOverlay } from '@ui/ControlsOverlay';
import { InventoryUI } from '@ui/InventoryUI';
import { PauseMenu } from '@ui/PauseMenu';
import { CharacterStats } from '@ui/CharacterStats';
import { DeathScreen, type DeathStats } from '@ui/DeathScreen';
import { Inventory } from '@items/Inventory';
import { ItemDropEntity } from '@items/ItemDrop';
import { resolveBottomLeftPickupSpawn, resolveItemDropSpawn } from '@items/DropSpawn';
import { SWORD_DEFS, STARTER_ONLY_IDS, type WeaponDef } from '@data/weapons';
import { LORE_WEAPONS, loreWeaponToWeaponDef } from '@data/loreWeapons';
import { createItem, calcInnocentBonus, itemLevelUp, isItemFullyCleared, resetItemForNextCycle, DEMO_BLOCK_REDIVE } from '@items/ItemInstance';
import { getPlayerBaseStats } from '@data/playerStats';
import type { ItemInstance } from '@items/ItemInstance';
import { ItemWorldScene } from './ItemWorldScene';
import { PortalTransition } from '@effects/PortalTransition';
import { FloorCollapse } from '@effects/FloorCollapse';
import { ScreenCrack } from '@effects/ScreenCrack';
import { MemoryDive } from '@effects/MemoryDive';
import { WeaponPulse } from '@effects/WeaponPulse';
import { AnvilTether } from '@effects/AnvilTether';
import { ArcTether } from '@effects/ArcTether';
import { ExitGlow, type ExitGlowDir } from '@effects/ExitGlow';
import { LorePopup } from '@ui/LorePopup';
import { AcquireOverlay } from '@ui/AcquireOverlay';
import { LoreDisplay, type LoreLine } from '@ui/LoreDisplay';
import { DivePreview } from '@ui/DivePreview';
import { sacredSave, isLowHpHealToastFired, markLowHpHealToastFired } from '@save/PlayerSave';
import { applyPlayerStatBuffs } from '@systems/PlayerBuffSystem';
import { t } from '@i18n';
import { createUiText } from '@ui/factories';
import {
  EGO_WAKE, EGO_FIRST_WALK, EGO_ANVIL, EGO_WEAPON_SWAP,
  EGO_RUSTBORN_AWAKEN,
  EGO_WORLD_RETURN, EGO_INVENTORY_LOCKED, getEgoAnvilRetired, EGO_EVENT, hasEgo,
} from '@data/EgoDialogue';
import { HitSparkManager } from '@effects/HitSpark';
import { PropShatterManager } from '@effects/PropShatter';
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
import { SteamPuffManager, PUFF_TINT_TOXIC, PUFF_TINT_PLASMA } from '@effects/SteamPuff';
import { AshRemnantManager } from '@effects/AshRemnant';
import { GrassClumpFireSystem } from '@effects/GrassClumpFire';
import { FluidResidueManager } from '@effects/FluidResidue';
import { EgoShardManager, EgoShardPreview, CAST_MIN_GAP_MS, CAST_CHARGE_MAX_MS, getShardVelocity, type ShardElement } from '@effects/EgoShard';
import { ThrowableContainer, parseContainerKind, type ContainerKind } from '@entities/ThrowableContainer';
import { readSpawnerEntity, runContainerSpawner } from '@systems/ContainerSpawner';
import { resolveContainerSlotKind } from '@data/ContainerPools';
import { FluidSpawnerManager, readFluidSpawnerEntities } from '@systems/FluidSpawner';
import { FluidCrestFoamManager } from '@effects/FluidCrestFoam';
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
import { brandLabel } from '@core/input/padGlyphs';
import { WorldMapOverlay } from '@ui/WorldMapOverlay';

import { PIXEL_FONT } from '@ui/fonts';
import { EndingSequence, type EndingTrigger } from '@systems/EndingSequence';
import { UpdraftSystem } from '@systems/UpdraftSystem';
import { VoidFogSystem } from '@systems/VoidFogSystem';
import { TileMutator } from '@systems/TileMutator';
import { TileMutatorRenderer } from '@systems/TileMutatorRenderer';
import {
  findNearestGrabbableContainer as findNearestContainerForGrab,
  startContainerGrabPull,
  updateContainerArcTether,
  updateContainerPrompt as updateContainerPromptUi,
} from '@systems/ContainerInteraction';
import { isEnemyKillHandled, markEnemyKillHandled } from '@systems/EntityRuntimeMeta';
import { applyTileHazards, CYRO_FROZEN_MS, CYRO_TICK_MS, CYRO_TICK_PCT, MAGMA_BURN_DURATION_MS } from '@systems/TileHazards';
import { hazardToElement, type ElementAffinity } from '@combat/ElementAffinity';
import { applyBurnableZones, type BurnableEntitySpec } from '@level/BurnableZonePass';
import { BurnableProp } from '@entities/BurnableProp';
import { DamageNumberManager } from '@ui/DamageNumber';
import { TutorialHint } from '@ui/TutorialHint';
import { FluidSystem, type ArcLink } from '@effects/FluidSystem';
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
  trackSecretWallBreak,
} from '@utils/Analytics';
import { assetPath } from '@core/AssetLoader';
import { AmbientLayer } from '@audio/AmbientLayer';
import { SFX } from '@audio/Sfx';
import { rumbleGamepad } from '@utils/GamepadRumble';
import { BgmController } from '@audio/BgmController';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TILE_SIZE = 16;
const FADE_DURATION = 200;
/**
 * Void touch sequence (Victor spec 2026-05-15):
 *   0–200 ms     — fade OUT (alpha 0 → 1)
 *   200 ms       — teleport player to last safe ground, force-grounded.
 *                  (scene + camera continue to tick; only player input is
 *                  locked, so VFX / fluids / enemies keep simulating.)
 *   200–1200 ms  — hold black 1000 ms (deferred scene work window)
 *   1200–1700 ms — fade IN (alpha 1 → 0, 500 ms)
 *   1700–2200 ms — extra input-lock dwell (~500 ms reveal beat)
 * Total input lock = 2000 ms past the teleport tick.
 */
const VOID_FADE_OUT_DURATION = 200;
const VOID_HOLD_DURATION = 1000;
const VOID_FADE_IN_DURATION = 500;
const VOID_INPUT_LOCK_MS = 2000;
const SAVE_INTERACT_DELAY_MS = 500;
const FIRST_ANVIL_LEVEL_ID = 'FirstAnvil';
const INVENTORY_KEY_HINT_ID = 'inventory_key';
const INVENTORY_KEY_AFTER_FIRST_IW_HINT_ID = 'inventory_key_after_first_item_world';
const INVENTORY_KEY_AFTER_FIRST_IW_EVENT = '__inventoryKeyAfterFirstItemWorldShown';

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
  /**
   * 사용자 결정 (2026-05-03): "Open Inventory" tutorialHint 는 픽업 cutscene +
   * EGO 대사가 모두 끝난 후 표시. firstEver 픽업 시 flag 만 set, update() 가
   * 매 프레임 cutscene/dialogue 종료 검사 후 실제 표시.
   */
  private pendingInventoryHint: 'first_pickup' | 'first_iw_return' | null = null;
  /** Drop-through 튜토리얼 1회 발사 가드. 사용자가 직접 dropthrough 하면 학습됐으니 발사 안 함. */
  private dropThroughHintHandled = false;
  /** 점프 튜토리얼 — 사용자가 화살표(MOVE_LEFT/RIGHT)로 처음 움직였을 때 1회 발사, JUMP 입력 시 dismiss. */
  private jumpHintHandled = false;
  /** 점프 hint 트리거 가드 — 사용자가 horizontal 이동 입력을 한 번이라도 누른 적 있는가. */
  private hasMovedHorizontally = false;
  /** 첫 horizontal 입력 후 점프 hint 발사까지의 잔여 지연(ms). */
  private jumpHintDelayMs = 2000;
  /** 공격 튜토리얼 — 카메라 안에 적이 처음 등장하는 프레임에 1회 발사, ATTACK 입력 시 dismiss. */
  private attackHintHandled = false;
  /** 대시 튜토리얼 — Overworld_Level_36 진입 1초 후 발사, DASH 입력 시 dismiss. */
  private dashHintHandled = false;
  /** Dash 룸 진입 후 hint 발사까지의 잔여 ms. -1 = 방 밖(리셋). */
  private dashHintDelayMs = -1;
  private activeBuilder: GiantBuilder | null = null;
  private activeBuilderMode: 'cinematic' | 'patrol' | null = null;
  /**
   * Drive the builder's footstep camera shake even when mode is 'patrol'.
   * spawnBuilder sets this true for 'cinematic', false for plain 'patrol';
   * one-off helpers (spawnDemoEndBuilder) can force it on for patrol-style
   * routes that still need the weighty "쿵" feedback.
   */
  private builderShakeEnabled = false;
  // Shaft_01 cinematic builder is a one-shot — the ascent plays only on the
  // first time the player enters the room this session. Re-entries skip it.
  private shaft01CinematicPlayed = false;
  // Tracks the builder's moving state across frames so we can emit a single
  // heavy "landing" shake on the exact frame it transitions to idle.
  private builderWasMoving = false;
  // Counts tile crossings so we can emit shakes on every other crossing
  // (half the cadence of raw 16-px steps — slower, weightier rhythm).
  private builderStepCounter = 0;
  /** Cells in host collisionGrid currently overwritten by builder, packed as row * gridWidth + col. Only cells that were 0 are stamped. */
  private builderStamps: number[] = [];
  private builderStampOriginX: number | null = null;
  private builderStampOriginY: number | null = null;
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
  private fluidLayer!: Container;
  private fluidSystem!: FluidSystem;
  private fluidSpawners!: FluidSpawnerManager;
  private fluidCrestFoam!: FluidCrestFoamManager;

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
  private introPhase: 'none' | 'fadeIn' | 'title' | 'awaitingHud' | 'done' = 'none';
  /** Shaft_01 영화적 비트 — AreaTitle 종료 후 HUD 노출까지의 잔여 ms. */
  private hudRevealTimer = 0;
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
  /** Gamepad hot-plug 토스트 unsubscribe — exit 시 호출. */
  private _gpUnsub: (() => void) | null = null;
  /** Cooldown (ms) before another "No Weapon Equipped" toast can fire. */
  private noWeaponToastCooldown = 0;

  private dmgNumbers!: DamageNumberManager;
  private hitSparks!: HitSparkManager;
  private propShatter!: PropShatterManager;
  private containerFluidDirty = false;
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
  private steamPuff!: SteamPuffManager;
  private ashRemnant!: AshRemnantManager;
  private grassClumpFire = new GrassClumpFireSystem();
  private fluidResidue!: FluidResidueManager;
  private egoShard!: EgoShardManager;
  private egoShardPreview!: EgoShardPreview;
  /** Time the player has been holding CAST this charge (ms). 0 = not charging. */
  private egoCastChargeMs = 0;
  private containers: ThrowableContainer[] = [];
  /**
   * ContainerSpawners with Maintain=true — re-emit containers whenever the
   * live count in their rect drops below minCount. Cleared on room load.
   */
  private maintainedSpawners: Array<{
    rect: { x: number; y: number; w: number; h: number };
    pool: ReturnType<typeof readSpawnerEntity>['pool'];
    minCount: number;
    maxCount: number;
    bias: ReturnType<typeof readSpawnerEntity>['bias'];
    seed: number;
    avoidEntity: boolean;
    fluidVolumeOverride: number;
    checkAccum: number;
    /**
     * Containers this spawner emitted. Tracked so the refill rule (refill
     * only when *all* owned containers are gone) can ignore unrelated
     * containers that happen to drift into the spawner rect — and so the
     * spawner's "current spawn count" is queryable as `owned.length` after
     * pruning destroyed entries.
     */
    owned: ThrowableContainer[];
  }> = [];
  /** Maintained-spawner re-check interval (ms). */
  private static readonly MAINTAIN_CHECK_MS = 500;
  /** Currently held container (Spelunky-style — one at a time). */
  private heldContainer: ThrowableContainer | null = null;
  private containerPrompt: Container | null = null;
  /**
   * Container currently being *pulled* by the arc tether toward the player's
   * shoulder. Equals heldContainer during the 200 ms pull animation, then
   * clears to null while heldContainer stays set (hold phase).
   */
  private pullingContainer: ThrowableContainer | null = null;
  private pullStartX = 0;
  private pullStartY = 0;
  private pullElapsedMs = 0;
  /** Arc Tether VFX — drives hover spark / pull arc / hold tether. */
  private arcTether: ArcTether | null = null;
  private prevPlayerInOtherFluid = false;
  private prevEnemyInOtherFluid: boolean[] = [];
  /** Set true when a TileMutator mutation invalidates the wall layer sprites. */
  private wallLayerDirty = false;
  /** Runtime WALL cells that do not have LDtk baked wall sprites, currently hardened magma. */
  private solidifiedWallGfx: Graphics | null = null;
  private solidifiedWallCells: Set<string> = new Set();
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
  private anvilDisabledPrompt: Container | null = null;
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
  /** Ceremonial overlay for relic / max HP+ acquisition. Replaces former toast.showBig. */
  private acquireOverlay: AcquireOverlay | null = null;
  private activeWeaponPulse: WeaponPulse | null = null;
  private activeAnvilTether: AnvilTether | null = null;
  private pickupZoomOverride = 1.0;
  /** Rustborn pre-pickup discovery — true while the proximity cutscene + dialogue is playing. Blocks pickup. */
  private discoveryActive = false;
  /** Set once the discovery pulse starts; cleared after EGO_FIRST_WALK is dispatched. */
  private discoveryDialoguePending = false;
  /** LDtk iid of the currently-spawned anvil (null when no anvil exists). */
  private currentAnvilIid: string | null = null;
  /**
   * Snapshot of the used anvil's position so the player can be returned next
   * to it after clearing the item world, even though the anvil itself is
   * gone by then.
   */
  private lastUsedAnvilPos: { x: number; y: number; width: number; height: number } | null = null;
  private lastUsedAnvilLevelId: string | null = null;
  /** True while player is inside an ItemTunnel level, heading to Item World. */
  private inItemTunnel = false;
  /** The level to return to after exiting Item World via tunnel. */
  private preTunnelLevelId: string | null = null;
  /** True while inside a fixed (hand-crafted) item world level. */
  private inFixedItemWorld = false;
  private fixedItemWorldItem: ItemInstance | null = null;

  // ── Debug warp (` 백틱 = 뷰포트 클릭 워프, Shift+M = 전 맵 클릭 워프) ────────
  private warpModeActive = false;
  private warpHintText: BitmapText | null = null;
  private warpClickHandler: ((e: PointerEvent) => void) | null = null;

  // ── BGM dim 상태 — save 룸 진입 시 음악을 0 으로, 떠나면 풀 볼륨 복귀 ──────
  private bgmDimmedForSaveRoom = false;

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
  private breakableProps: BreakableProp[] = [];
  /** 수동 배치 Breakable (LDtk Entity 'Breakable') — 절차 생성 props 와 분리 추적. */
  private breakables: Breakable[] = [];
  /** 수동 배치 Building (LDtk Entity 'Building') — 시각 데코, 충돌 없음. */
  private buildings: Building[] = [];
  private secretWalls: SecretWall[] = [];
  private spikes: Spike[] = [];
  // Updraft: IntGrid value 4 ??handled in applyUpdrafts()
  private updraftSystem!: UpdraftSystem;
  /** Dynamic IntGrid state — frozen/burning/electric overlays. Reset per room. */
  private tileMutator = new TileMutator();
  /** Renders frozen/burning/electric overlays on top of static tile sprites. */
  private tileMutatorRenderer: TileMutatorRenderer | null = null;
  /** Tier B burnable entities spawned by BurnableZonePass. Reset per room. */
  private burnableProps: BurnableProp[] = [];
  // Void: IntGrid value 10 -- short fade out/in and return to last safe ground.
  private voidDropActive = false;
  private voidFadePhase: 'none' | 'out' | 'hold' | 'in' = 'none';
  private voidFadeTimer = 0;
  /** Ms remaining before input is restored (separate from fade animation
   *  so we can hold the lock past fade-in for the "natural reveal" beat). */
  private voidInputLockMs = 0;
  /** True after the teleport tick has fired — prevents repeated teleports
   *  if updateVoidFade gets called multiple times mid-phase. */
  private voidTeleported = false;
  private voidReturnLevelId = '';
  private voidReturnX = 0;
  private voidReturnY = 0;
  private voidFogSystem!: VoidFogSystem;
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
  /** isDone 분기가 매 프레임 재진입해 replace 가 2회 발사되는 것을 막는 게이트. */
  private endingTransitionStarted = false;
  private savePoints: Array<{ x: number; y: number; gfx: Graphics; sprite?: Sprite; prompt?: Container }> = [];
  private saveDelayTimer = 0;
  private saveQueued = false;
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
        !!this.anvil && !this.anvil.used && !this.anvil.disabled && !this.anvil.hasItem() &&
        !this.altarSelectActive &&
        this.isPlayerNearAnvil(),
      onInteract: () => this.openAnvilUI(),
    };
    const savePoint: ProximityInteraction = {
      label: 'SavePoint',
      priority: 10,
      canInteract: () => {
        if (this.saveQueued) return false;
        if (this.altarSelectActive) return false;
        const pcx = this.player.x + this.player.width / 2;
        const pcy = this.player.y + this.player.height / 2;
        const RANGE = 32;
        for (const sp of this.savePoints) {
          if (Math.abs(pcx - sp.x) < RANGE && Math.abs(pcy - sp.y) < RANGE) return true;
        }
        return false;
      },
      onInteract: () => this.queueSave(),
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

    // Fetch and parse LDtk project (multi-world — pick Overworld).
    // cache:'no-store' + cache-bust query — 모든 캐시 (브라우저 / Vite / SW / proxy)
    // 우회. 정적 파일이라 prod 영향 미미 (씬 init 1 회).
    const cacheBust = `?t=${Date.now()}`;
    const json = await fetch(LDTK_PATH + cacheBust, { cache: 'no-store' }).then((r) => r.json()) as Record<string, unknown>;
    if (import.meta.env.DEV) {
      const builderLvl1Raw = (() => {
        const worlds = json['worlds'] as Array<{ identifier: string; levels: Array<{ identifier: string; layerInstances?: unknown[] }> }> | undefined;
        const w = worlds?.find(w => w.identifier === 'Builder');
        return w?.levels.find(l => l.identifier === 'Builder_Level_1');
      })();
      const layerCount = builderLvl1Raw?.layerInstances?.length ?? 0;
      // eslint-disable-next-line no-console
      console.info(`[LDtk] fetched at ${new Date().toISOString()} — Builder_Level_1 layers=${layerCount}`);
    }
    this.loader = new LdtkLoader();
    this.loader.load(json, LDTK_WORLD_IDS);

    // Builder world — separate loader so builder levels don't mix with navigation
    this.builderLoader = new LdtkLoader();
    this.builderLoader.load(json, BUILDER_WORLD_ID);

    // Load save or create fresh inventory
    const saveData = SaveManager.load();
    if (saveData) {
      if (this.introPhase === 'fadeIn') this.introPhase = 'none';
      this.inventory = SaveManager.loadInventory(saveData);
      this.unlockedEvents = new Set(saveData.unlockedEvents);
      this.collectedRelics = new Set(saveData.collectedRelics);
      this.collectedItems = new Set(saveData.collectedItems);
      this.visitedLevels = new Set(saveData.visitedLevels ?? []);
      this.clearedLevels = new Set(saveData.clearedLevels);
      this.gold = saveData.gold ?? 0;
      this.game.stats.playTimeMs = saveData.playtime;
    } else {
      // 사용자 결정 (2026-05-03): Broken Sword 를 시작 시 자동 지급. 이전 Builder
      // 안 ItemDrop 픽업 패턴 폐기. 첫 픽업 cutscene + "Open Inventory" hint
      // 도 함께 폐기 (sacredSave flags 미리 set 으로 firstEver 분기 미진입).
      // IW 보스 클리어 후 귀환 시 hint (INVENTORY_KEY_AFTER_FIRST_IW_HINT_ID) 는
      // 별도 플로우라 그대로 유지.
      this.inventory = new Inventory();
      const starterDef = SWORD_DEFS.find(d => d.id === 'sword_broken') ?? SWORD_DEFS[0];
      const starterSword = createItem(starterDef, 'normal');
      this.inventory.add(starterSword);
      this.inventory.equip(starterSword.uid, true);
      sacredSave.markFirstPickupDone();
      sacredSave.markItemSeen('sword_broken');
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
      this.atlases['atlas/world_01.png'] ??
      Object.values(this.atlases)[0];

    // Parallax background ??behind everything
    this.parallaxBG = new ParallaxBackground();
    this.game.backgroundContainer.addChild(this.parallaxBG.container);

    // LDtk renderer ??tiles only, no entity markers in production
    this.renderer = new LdtkRenderer();
    this.container.addChild(this.renderer.container);
    this.solidifiedWallGfx = new Graphics();
    this.renderer.container.addChild(this.solidifiedWallGfx);

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
      const rimFilter = new RimLightFilter({ color: 0xff6633, alpha: 1.0, thickness: 3, topGuardPixels: 16 });
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
    this.grassClumpFire.setFireLayer(this.entityLayer);

    // Tile mutator overlay (fire/ice/electric VFX on top of static tile sprites).
    this.tileMutatorRenderer = new TileMutatorRenderer(this.entityLayer);

    // Fluid layer — entity layer 앞에 위치. player/enemy 가 fluid 안에 들어가면
    // 잠긴 부분이 자연스럽게 fluid 색으로 가려진다 (실제 잠수 효과).
    this.fluidLayer = new Container();
    this.container.addChild(this.fluidLayer);
    this.fluidSystem = new FluidSystem(this.fluidLayer);
    // FluidSpawner debug overlay lives above entity layer so designers see
    // the source cell even when fluid covers it. ?debug gates visibility.
    const _fsDebug = new URLSearchParams(window.location.search).has('debug');
    this.fluidSpawners = new FluidSpawnerManager(this.fluidLayer, _fsDebug ? this.entityLayer : null);
    const _reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    this.fluidCrestFoam = new FluidCrestFoamManager(this.fluidLayer, _reduceMotion);
    // Oil flame tongues need to render ABOVE the fluid polygon, so we give
    // the mutator renderer a Graphics child of a container drawn after fluid.
    const aboveFluidLayer = new Container();
    this.container.addChild(aboveFluidLayer);
    this.tileMutatorRenderer.setAboveFluidLayer(aboveFluidLayer);

    // Updraft system (shared physics + particles)
    this.updraftSystem = new UpdraftSystem(this.entityLayer);
    // Void fog particles (black mist rising from void tiles)
    this.voidFogSystem = new VoidFogSystem(this.entityLayer);

    // Player
    this.player = new Player(this.game);
    this.player.fluidOverlayQuery = (x, y, w, h) => this.fluidSpawners.queryTileAtAabb(x, y, w, h, this.collisionGrid);
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
    // Arc Tether — Spark-기질 시그니처 픽업 VFX. Player layer 와 같은 entityLayer 에
    // 추가하되 player 보다 *뒤*에 add (검에서 뻗어나가는 톤을 위해 player 위에 그린다).
    if (!this.arcTether) {
      this.arcTether = new ArcTether();
      this.entityLayer.addChild(this.arcTether.container);
    }
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
    this.hud.setDebugInfoVisible(Debug.infoVisible);
    this.game.uiContainer.addChild(this.hud.container);
    // Hide HUD immediately during the intro sequence so it can't flash above
    // the fade overlay while async init is still running. Revealed after
    // the area title completes. Mirror to Game.hudReady so global UI (e.g.
    // FeedbackPanel hint) follows the same gate.
    if (startHidden && !saveData) {
      this.hud.container.visible = false;
      this.game.hudReady = false;
    } else {
      this.game.hudReady = true;
    }

    // Area title banner — Elden Ring style. Rides on legacyUIContainer so it
    // inherits uiScale with the rest of the overlay UI.
    this.areaTitle = new AreaTitle();
    this.game.legacyUIContainer.addChild(this.areaTitle.container);

    // Load & apply UI skin (async, non-blocking)
    const hudSkin = new UISkin();
    this.uiSkin = hudSkin;
    hudSkin.load().then(() => this.hud.applySkin(hudSkin))
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.warn('[UISkin] load failed — falling back to Graphics HUD:', e);
      });

    // Controls overlay (disabled)
    // this.controlsOverlay = new ControlsOverlay();
    // this.game.legacyUIContainer.addChild(this.controlsOverlay.container);

    // Toast, damage numbers, hit sparks, screen flash
    this.toast = new ToastManager(this.game.legacyUIContainer);
    this._gpUnsub = this._attachGamepadToast();
    this.dmgNumbers = new DamageNumberManager(this.game.uiContainer, this.game.camera, this.game.uiScale);
    this.hitSparks = new HitSparkManager(this.entityLayer);
    this.propShatter = new PropShatterManager(this.entityLayer);
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
    this.steamPuff = new SteamPuffManager(this.entityLayer);
    this.ashRemnant = new AshRemnantManager(this.entityLayer);
    this.fluidResidue = new FluidResidueManager(this.entityLayer);
    this.egoShard = new EgoShardManager(this.entityLayer);
    this.egoShardPreview = new EgoShardPreview(this.entityLayer);
    // Fluid evaporation → drop permanent residue on the floor cell.
    this.fluidSystem.onEvaporated = (gx, gy, type) => {
      if (type !== 'oil' && type !== 'acid' && type !== 'magma') return;
      const px = (gx + 0.5) * 16;
      const py = (gy + 1) * 16;        // bottom of cell
      this.fluidResidue.dropAt(type, px, py, 1.0);
    };

    // ─── Arc Scan Cycle (R-NEW-031 v2) — 월드 씬 동일 처리 ─────────────────
    this.fluidSystem.onArcScanRequest = (originX, originY, radiusPx): ArcLink[] => {
      const links: ArcLink[] = [];
      const r2 = radiusPx * radiusPx;
      {
        const px = this.player.x + this.player.width / 2;
        const py = this.player.y + this.player.height / 2;
        const dx = px - originX, dy = py - originY;
        if (dx * dx + dy * dy < r2) {
          links.push({ worldX: px, worldY: py, kind: 'entity', ref: this.player });
        }
      }
      for (const e of this.enemies) {
        if (!e.alive) continue;
        const ex = e.x + e.width / 2;
        const ey = e.y + e.height / 2;
        const dx = ex - originX, dy = ey - originY;
        if (dx * dx + dy * dy < r2) {
          links.push({ worldX: ex, worldY: ey, kind: 'entity', ref: e });
        }
      }
      for (const c of this.containers) {
        if (c.destroyed || c.held) continue;
        if (c.kind !== 'MetalCrate') continue;
        const ccx = c.colX + c.colW / 2;
        const ccy = c.colY + c.colH / 2;
        const dx = ccx - originX, dy = ccy - originY;
        if (dx * dx + dy * dy < r2) {
          links.push({ worldX: ccx, worldY: ccy, kind: 'container', ref: c });
        }
      }
      const ogx = Math.floor(originX / 16);
      const ogy = Math.floor(originY / 16);
      const radCells = Math.ceil(radiusPx / 16) + 1;
      for (let dy = -radCells; dy <= radCells; dy++) {
        for (let dx = -radCells; dx <= radCells; dx++) {
          if (dx === 0 && dy === 0) continue;
          const gx = ogx + dx, gy = ogy + dy;
          if (gy < 0 || gy >= this.collisionGrid.length) continue;
          const row = this.collisionGrid[gy];
          if (!row || gx < 0 || gx >= row.length) continue;
          const t = row[gx];
          if (t !== TILE_WATER && t !== TILE_METAL && t !== TILE_ACID) continue;
          const cx = (gx + 0.5) * 16;
          const cy = (gy + 0.5) * 16;
          const ddx = cx - originX, ddy = cy - originY;
          if (ddx * ddx + ddy * ddy > r2) continue;
          links.push({
            worldX: cx, worldY: cy,
            kind: t === TILE_WATER ? 'fluid' : 'cell',
            ref: { gx, gy, tile: t },
          });
        }
      }
      if (links.length > 6) {
        links.sort((a, b) => {
          const da = (a.worldX - originX) ** 2 + (a.worldY - originY) ** 2;
          const db = (b.worldX - originX) ** 2 + (b.worldY - originY) ** 2;
          return da - db;
        });
        links.length = 6;
      }
      return links;
    };

    this.fluidSystem.onArcDischarge = (_originX, _originY, links) => {
      if (links.length === 0) return;
      this.game.camera.shake(3);
      for (const link of links) {
        if (link.kind === 'entity') {
          const ent = link.ref as { hp: number; maxHp: number; chargedStateMs?: number; alive?: boolean };
          if (!ent) continue;
          if (ent.alive === false) continue;
          const dmg = Math.max(1, Math.floor(ent.maxHp * FluidSystem.ARC_DAMAGE_PCT));
          ent.hp = Math.max(0, ent.hp - dmg);
          ent.chargedStateMs = Math.max(ent.chargedStateMs ?? 0, FluidSystem.ARC_CHARGED_BUFF_MS);
          this.dmgNumbers.spawn(link.worldX, link.worldY - 8, dmg, false);
        } else if (link.kind === 'container') {
          const c = link.ref as { electricChargedMs?: number };
          if (c) c.electricChargedMs = Math.max(c.electricChargedMs ?? 0, FluidSystem.ARC_CHARGED_BUFF_MS);
        } else if (link.kind === 'fluid' || link.kind === 'cell') {
          const cellRef = link.ref as { gx: number; gy: number } | undefined;
          if (cellRef) {
            this.tileMutator.applyThunderChain(this.collisionGrid, cellRef.gx, cellRef.gy);
          }
        }
      }
    };
    // TileMutator emits steam events when hot-meets-wet cells mutate
    // (magma→ice melt, acid+magma vapor). Convert cell coords → pixel.
    this.tileMutator.onSteamEvent = (gx, gy) => {
      const px = (gx + 0.5) * 16;
      const py = (gy + 0.5) * 16;
      this.steamPuff.spawn(px, py, 1.0);
    };
    this.tileMutator.onSteamBurst = (gx, gy) => {
      const cx = (gx + 0.5) * 16;
      const cy = (gy + 0.5) * 16;
      this.steamPuff.spawn(cx, cy, 2.1);
      this.steamPuff.spawn(cx - 10, cy - 6, 1.6);
      this.steamPuff.spawn(cx + 10, cy - 6, 1.6);
      this.steamPuff.spawn(cx, cy - 18, 1.4, PUFF_TINT_PLASMA);
      this.game.camera.shake(4);
    };
    this.tileMutator.onElectricInsulated = (gx, gy) => {
      const px = (gx + 0.5) * 16;
      const py = (gy + 0.5) * 16;
      this.hitSparks.spawn(px, py, false, 0);
    };
    this.tileMutator.onElectricAcidPulse = (gx, gy) => {
      const px = (gx + 0.5) * 16;
      const py = (gy + 0.5) * 16;
      this.steamPuff.spawn(px, py, 0.8, PUFF_TINT_TOXIC);
    };
    // R-NEW-001 Exothermic Steam: acid+water 발열 반응 — 강한 증기 + vertical
    // burst. Horizontal 24px, vertical 64px 영향.
    this.tileMutator.onAcidSteamBurst = (gx, gy) => {
      const cx = (gx + 0.5) * 16;
      const cy = (gy + 0.5) * 16;
      const steamBaseY = (gy + 1) * 16;
      this.steamPuff.spawn(cx, steamBaseY, 1.5);
      this.steamPuff.spawn(cx, steamBaseY - 22, 1.3);
      this.steamPuff.spawn(cx, steamBaseY - 44, 1.1);
      this.game.camera.shake(2);
      const radiusX = 24;
      const radiusY = 64;
      const inSteamBurst = (x: number, y: number): boolean => {
        const dx = (x - cx) / radiusX;
        const dy = (y - cy) / radiusY;
        return dx * dx + dy * dy < 1;
      };
      const px = this.player.x + this.player.width / 2;
      const py = this.player.y + this.player.height / 2;
      if (inSteamBurst(px, py)) {
        const dmg = Math.max(1, Math.floor(this.player.maxHp * 0.05));
        this.player.hp = Math.max(0, this.player.hp - dmg);
        this.player.burnRemainingMs = Math.max(this.player.burnRemainingMs ?? 0, 5000);
        this.player.vy = Math.min(this.player.getVy(), -220);
      }
      for (const e of this.enemies) {
        if (!e.alive) continue;
        const ex = e.x + e.width / 2;
        const ey = e.y + e.height / 2;
        if (inSteamBurst(ex, ey)) {
          const dmg = Math.max(1, Math.floor(e.maxHp * 0.05));
          e.hp -= dmg;
          e.burnRemainingMs = Math.max(e.burnRemainingMs ?? 0, 5000);
          e.onHit(0, -260, 120);
          this.dmgNumbers.spawn(ex, e.y - 8, dmg, false);
        }
      }
      for (const c of this.containers) {
        if (c.destroyed || c.held) continue;
        const ccx = c.colX + c.colW / 2;
        const ccy = c.colY + c.colH / 2;
        if (inSteamBurst(ccx, ccy)) {
          c.applySteamLift(3000);
        }
      }
    };
    // Ice melt / wood-grass burnout / metal corrosion all invalidate the
    // static wall tile sprites at the mutated cell. Coalesce many mutations
    // per frame into a single rerenderTilemap call.
    this.tileMutator.onWallTileChanged = (gx, gy, originalTile) => {
      if (this.collisionGrid[gy]?.[gx] === TILE_WALL && originalTile === TILE_MAGMA) {
        this.solidifiedWallCells.add(`${gx},${gy}`);
        this.rebuildSolidifiedWallOverlay();
      }
      this.wallLayerDirty = true;
    };
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

    // Pause menu (9-slice from UISkin) — uiContainer(native) 직속 (UI native 1단계).
    // input 전달 — SELECT KEYBOARD 서브모달이 preset 즉시 적용.
    this.pauseMenu = new PauseMenu(this.uiSkin, this.game.uiScale, this.game.input);
    this.pauseMenu.onAction = (action) => {
      if (action === 'continue') { this.isPaused = false; }
      else if (action === 'status') { this.openCharacterStats(); }
      else if (action === 'quit_confirmed') {
        this.isPaused = false;
        this.game.sceneManager.replace(new TitleScene(this.game));
      }
    };
    this.game.uiContainer.addChild(this.pauseMenu.container);

    // Character stats overlay (opened from pause menu STATUS) — uiContainer(native)
    this.characterStats = new CharacterStats(this.uiSkin, this.game.uiScale);
    this.characterStats.onVisibilityChanged = (vis) => {
      this.hud.container.visible = !vis;
      if (this.minimap) this.minimap.visible = !vis;
    };
    this.game.uiContainer.addChild(this.characterStats.container);

    // Death screen — uiContainer(native)
    this.deathScreen = new DeathScreen(this.uiSkin, this.game.uiScale);
    this.deathScreen.onRespawn = () => {
      // Reload from last save point
      this.loadLevel(this.playerSpawnLevelId, 'down');
      this.player.hp = this.player.maxHp;
    };
    this.game.uiContainer.addChild(this.deathScreen.container);

    // Tutorial hints — restore "already-seen" ids from save so loaded games
    // don't re-show hints the player already completed.
    this.tutorialHint = new TutorialHint(this.game.input, this.game.legacyUIContainer);
    if (saveData) this.tutorialHint.hydrate(saveData.completedTutorialHints);

    // Ending sequence — EndingTrigger 터치 시 player 입력만 잠그고 환경은 계속
    // 움직임. HUD 가시성은 Shaft_DemoEnd 룸 진입 시점에 별도로 hide 되므로 여기
    // onStart 콜백은 비워둔다.
    this.ending = new EndingSequence({
      uiContainer: this.game.legacyUIContainer,
      camera: this.game.camera,
      input: this.game.input,
    });

    // Inventory UI — uiContainer(native) 직속. InventoryUI 내부에서 scale.set(uiScale)
    // 으로 640 좌표 레이아웃을 화면 채우는 크기로 보정. (UI native 마이그레이션 1단계)
    this.inventoryUI = new InventoryUI(this.inventory, this.game.uiScale);
    this.inventoryUI.setSkin(this.uiSkin!);
    this.game.uiContainer.addChild(this.inventoryUI.container);

    // Sacred Pickup — LorePopup + DivePreview + LoreDisplay 모두 uiContainer(native) 직속 (UI native 1단계)
    this.lorePopup = new LorePopup(this.uiSkin, this.game.uiScale);
    this.game.uiContainer.addChild(this.lorePopup.container);
    this.loreDisplay = new LoreDisplay(this.game.input, this.game.uiScale);
    this.game.uiContainer.addChild(this.loreDisplay.container);
    this.divePreview = new DivePreview(this.uiSkin, this.game.uiScale);
    this.game.uiContainer.addChild(this.divePreview.container);

    // AcquireOverlay — relic / max HP+ ceremonial modal (vignette only, no panel box).
    this.acquireOverlay = new AcquireOverlay(this.game.uiScale);
    this.game.uiContainer.addChild(this.acquireOverlay.container);

    // World Map overlay — uiContainer(native)
    this.worldMap = new WorldMapOverlay(this.uiSkin, this.game.uiScale);
    this.worldMap.setLoader(this.loader);
    // identifier "Debug_*" prefix 도 안전망으로 함께 차단 — LDtk 에서 RoomType
    // 태그가 빈 배열로 비어있는 Debug 룸이 클리어율에 섞여드는 것을 방지
    // (2026-05-17: Debug_7/8/9 누수로 max 75% 에서 멈추던 버그 픽스).
    this.worldMap.setRooms(this.loader.getWorldMap().filter(r =>
      r.roomType !== 'Debug' && r.roomType !== 'Cinematic' && !r.id.startsWith('Debug_')
    ));
    // Shift+M 디버그 워프용: Debug 룸 포함(Cinematic 만 제외) 풀 리스트 별도 등록.
    this.worldMap.setDebugRooms(this.loader.getWorldMap().filter(r => r.roomType !== 'Cinematic'));
    this.game.uiContainer.addChild(this.worldMap.container);

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

    // Spawn level: prefer the saved level, but fall back if the LDtk project
    // changed since the save was written. A stale save level used to leave the
    // scene initialized with only HUD visible and no currentLevel.
    this.playerSpawnLevelId = this.resolveSpawnLevelId(saveData?.levelId);
    if (!this.loadLevel(this.playerSpawnLevelId, 'down')) {
      const fallbackLevelId = this.findPlayerSpawnLevel();
      if (fallbackLevelId !== this.playerSpawnLevelId) {
        console.warn(
          `[LdtkWorldScene] Failed to load spawn level "${this.playerSpawnLevelId}", falling back to "${fallbackLevelId}"`,
        );
        this.playerSpawnLevelId = fallbackLevelId;
        this.loadLevel(this.playerSpawnLevelId, 'down');
      }
    }

    // If loading from save, snap player to save point
    if (saveData && this.savePoints.length > 0) {
      this.snapPlayerToSavePoint();
    }

    this.initialized = true;

    // Tier 3 ambient bed demo (Plan_Audio_Demo §3-1 #1A + #1C, DEC-040 §13-2.4 진척)
    AmbientLayer.startWorldTier3Demo();

    // Controls guidance handled by tutorialHint.tryShow('hint_combat') in
    // update() ??fires once per session with auto-dismiss. No unconditional
    // toast here so returning from item world doesn't re-spam controls.
  }

  enter(): void {
    this.container.visible = true;
    if (this.parallaxBG) this.parallaxBG.container.visible = true;
    this.reattachPersistentUi();
    // 월드 BGM — intro 1 회 → loop 반복. 5 초 fade-in 으로 부드러운 진입.
    // ItemWorld 에서 pop 으로 돌아온 경우 BgmController 가 같은 trackKey 면
    // no-op 하므로 안전하게 매번 호출.
    BgmController.play(
      'mus_world_main',
      { intro: 'mus_world_main_intro', loop: 'mus_world_main_loop' },
      { fadeInMs: 5000 },
    );
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
    if (this.introPhase === 'fadeIn' || this.introPhase === 'title' || this.introPhase === 'awaitingHud') {
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
    this.solidifiedWallCells.clear();
    this.rebuildSolidifiedWallOverlay();
    this.rerenderTilemap();

    this.updatePlayerAtk();
    this.game.camera.snap(
      this.player.x + this.player.width / 2,
      this.player.y + this.player.height / 2,
    );
  }

  private reattachPersistentUi(): void {
    const ui = this.game.uiContainer;
    if (this.pauseMenu && !this.pauseMenu.container.parent) ui.addChild(this.pauseMenu.container);
    if (this.characterStats && !this.characterStats.container.parent) ui.addChild(this.characterStats.container);
    if (this.deathScreen && !this.deathScreen.container.parent) ui.addChild(this.deathScreen.container);
    if (this.lorePopup && !this.lorePopup.container.parent) ui.addChild(this.lorePopup.container);
    if (this.loreDisplay && !this.loreDisplay.container.parent) ui.addChild(this.loreDisplay.container);
    if (this.divePreview && !this.divePreview.container.parent) ui.addChild(this.divePreview.container);
  }

  private detachSharedUiForItemWorld(): void {
    this.uiController.detachForItemWorld();
    // 명시적 hide. detachForItemWorld가 부모에서 제거하지만, 일부 전환 프레임에서
    // 잠깐 visible=true 상태로 다시 attach되는 경로를 대비한 방어적 처리.
    if (this.minimap) {
      if (this.minimap.parent) this.minimap.parent.removeChild(this.minimap);
      this.minimap.visible = false;
    }
    if (this.altarUI?.parent) {
      this.altarUI.parent.removeChild(this.altarUI);
    }
  }

  private initialized = false;

  /**
   * Snapshot for FeedbackPanel auto-context. Implements IFeedbackContextProvider
   * structurally — runtime duck-typing checks for this method.
   */
  getFeedbackContext(): {
    area: 'world' | 'itemworld';
    level_id?: string;
    room_col: number;
    room_row: number;
    equipped_weapon_id?: string;
    hp_pct: number;
  } {
    const cx = this.player.x + this.player.width / 2;
    const cy = this.player.y + this.player.height / 2;
    const equipped = this.inventory?.equipped;
    return {
      area: 'world',
      level_id: this.currentLevel?.identifier,
      room_col: Math.floor(cx / TILE_SIZE),
      room_row: Math.floor(cy / TILE_SIZE),
      equipped_weapon_id: equipped?.def.id ?? undefined,
      hp_pct: this.player.maxHp > 0
        ? Math.floor((this.player.hp / this.player.maxHp) * 100)
        : 0,
    };
  }

  update(dt: number): void {
    // Guard: init() is async ??game loop may call update() before it completes
    if (!this.initialized || !this.currentLevel) return;


    // Feedback panel open — block scene update but keep toasts animating.
    if (this.game.feedbackOpen) {
      this.toast?.update(dt);
      return;
    }

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

    // HUD reveal: AreaTitle 이 inactive 되는 프레임에 5초 timer 를 시작해 Shaft_01
    // 영화적 비트(거대 빌더가 누비는 대공동 - 잠시 침묵) 를 살린 뒤 HUD/미니맵 노출.
    // 'awaitingHud' 상태 동안 위 강제 숨김 분기가 HUD 를 가린다.
    const areaTitleActive = this.areaTitle.isActive;
    if (
      this.wasAreaTitleActive &&
      !areaTitleActive &&
      this.introPhase === 'title'
    ) {
      this.introPhase = 'awaitingHud';
      this.hudRevealTimer = 5000;
    }
    if (this.introPhase === 'awaitingHud') {
      this.hudRevealTimer -= dt;
      if (this.hudRevealTimer <= 0) {
        this.hud.container.visible = true;
        if (this.minimap && !this.inItemTunnel) this.minimap.visible = true;
        this.introPhase = 'done';
        // FeedbackPanel hint / 점프 튜토리얼 등 글로벌 UI 가 HUD 노출과 동시에 등장.
        this.game.hudReady = true;
      }
    }
    this.wasAreaTitleActive = areaTitleActive;

    // Ending sequence — 환경은 계속 update 되어야 하므로 early-return 하지 않는다.
    // inputLocked 가 켜져 있어 player 만 멈춘다. isDone 시점에 한 번만 정리 +
    // replace 한다 (import().then() 비동기 대기 중 동일 분기가 재진입해 두 번째
    // replace 가 발사되면 EndingScene 이 fade-in 중 새 인스턴스로 즉시 교체되어
    // 사용자에겐 "팝업"처럼 보이는 문제가 있었음).
    //
    // overlay dispose 는 EndingScene init/enter 가 끝난 *다음*에 한다.
    // 이전엔 dispose 후 동적 import 가 resolve 되기 전 한 frame 갭에 worldSprite
    // 의 이전 RT(빌더/player 가 그려진 게임 화면)가 노출되어 흰색 픽셀이
    // 새어 보이는 증상이 있었음.
    if (this.ending.isActive) {
      this.ending.update(dt);
      if (this.ending.isDone && !this.endingTransitionStarted) {
        this.endingTransitionStarted = true;
        this.game.camera.setZoom(1.0);
        this.game.camera.clearBounds();
        SaveManager.deleteSave();
        this.game.input.inputLocked = false;
        const endingRef = this.ending;
        const game = this.game;
        import('./EndingScene').then(async ({ EndingScene }) => {
          await game.sceneManager.replace(new EndingScene(game));
          endingRef.dispose();
        });
        return;
      }
      if (this.endingTransitionStarted) return;
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

    // Debug warp must remain reachable from death/game-over UI, which can
    // early-return through handlePauseAndDeath before normal gameplay input.
    if (this.deathScreen?.visible || this.gameOverActive) {
      this.handleDebugWarp();
    }

    const pauseOrDeath = this.uiController.handlePauseAndDeath({
      dt,
      canOpenPause: !this.inventoryUI.visible && !this.worldMap.visible && !(this.lorePopup as any)?.visible && !this.acquireOverlay?.isBlocking(),
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
      this.propShatter.update(dt);
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

    // 사용자 결정 (2026-05-03): "Open Inventory" hint 는 픽업 cutscene + EGO
    // 대사가 모두 끝난 후 표시. pendingInventoryHint flag 가 set 되어 있으면
    // 매 프레임 종료 조건 검사 후 표시.
    if (this.pendingInventoryHint) {
      const cutsceneBlocking =
        this.activeWeaponPulse?.isBlocking ||
        this.lorePopup?.isBlocking() ||
        this.lorePopupItem !== null ||
        this.acquireOverlay?.isBlocking() ||
        this.loreDisplay?.isActive;
      if (!cutsceneBlocking) {
        const hintId = this.pendingInventoryHint === 'first_pickup'
          ? INVENTORY_KEY_HINT_ID
          : INVENTORY_KEY_AFTER_FIRST_IW_HINT_ID;
        this.tutorialHint.tryShow(
          hintId,
          { keyLabel: actionKey(GameAction.INVENTORY), text: t('tutorial.open_inventory'), persistent: true },
        );
        this.pendingInventoryHint = null;
      }
    }

    // 첫 platform 위 grounded → drop-through 튜토리얼 hint 1회 발사.
    // 가드 플래그는 사용자가 직접 dropthrough 시에도 set 되므로 학습 후 재발사 안 됨.
    // 모든 hint 는 학습 입력 감지 후 dismissAfter(1000ms) — 사용자가 실수로 키를 눌러도
    // hint 가 1초간 유지되어 인지/무시할 수 있도록.
    const HINT_LINGER_MS = 1000;

    // Drop-through 튜토리얼 — platform 위 grounded 시 tryShow. handled set 은
    // consumeDropThroughEvent 분기에서만 — panel busy 로 발사 못 한 경우 다음 platform
    // 진입 시 재시도 가능.
    if (!this.dropThroughHintHandled && this.player.isOnOneWayPlatform()) {
      this.tutorialHint.tryShow('hint_drop_through', {
        actions: [GameAction.LOOK_DOWN, GameAction.JUMP],
        text: t('tutorial.drop_through'),
        persistent: true,
      });
    }

    // 점프 튜토리얼 — 게임 시작 지점(playerSpawnLevelId) 에서 사용자가 화살표
    // (MOVE_LEFT/RIGHT) 로 한 번이라도 움직인 후 2초 지연 후 발사. Shaft_01 등 다른
    // 룸에서는 절대 발사하지 않는다. JUMP 입력 시 2초 linger 후 fade.
    if (!this.jumpHintHandled) {
      const isInSpawnRoom = this.currentLevel?.identifier === this.playerSpawnLevelId;
      if (isInSpawnRoom && !this.hasMovedHorizontally
          && (this.game.input.isDown(GameAction.MOVE_LEFT)
            || this.game.input.isDown(GameAction.MOVE_RIGHT))) {
        this.hasMovedHorizontally = true;
      }
      if (this.hasMovedHorizontally && this.jumpHintDelayMs > 0) {
        this.jumpHintDelayMs -= dt;
      }
      if (isInSpawnRoom && this.hasMovedHorizontally && this.jumpHintDelayMs <= 0) {
        this.tutorialHint.tryShow('hint_jump', {
          actions: [GameAction.JUMP],
          text: t('tutorial.jump'),
          persistent: true,
        });
      }
      if (this.tutorialHint.isShowing('hint_jump')
          && this.game.input.isJustPressed(GameAction.JUMP)) {
        this.tutorialHint.dismissAfter('hint_jump', HINT_LINGER_MS);
        this.jumpHintHandled = true;
      }
    }

    // 공격 튜토리얼 — 살아있는 적이 4타일 이내로 접근한 프레임에 1회 발사.
    // dismiss 는 hint 가 표시 중일 때 ATTACK 입력 시. 4초 linger.
    if (!this.attackHintHandled) {
      if (this.hasEnemyNearby()) {
        this.tutorialHint.tryShow('hint_attack', {
          actions: [GameAction.ATTACK],
          text: t('tutorial.attack'),
          persistent: true,
        });
      }
      if (this.tutorialHint.isShowing('hint_attack')
          && this.game.input.isJustPressed(GameAction.ATTACK)) {
        this.tutorialHint.dismissAfter('hint_attack', HINT_LINGER_MS);
        this.attackHintHandled = true;
      }
    }

    // 대시 튜토리얼 — Tutorial_Dash 진입 1초 후 발사. 룸을 떠나면 timer 리셋.
    // 사용자 결정 2026-05-16 — 다른 룸에서는 절대 표시되지 않도록 단일 식별자만 허용.
    if (!this.dashHintHandled) {
      const inDashRoom = this.currentLevel?.identifier === 'Tutorial_Dash';
      if (inDashRoom) {
        if (this.dashHintDelayMs < 0) this.dashHintDelayMs = 1000;
        else if (this.dashHintDelayMs > 0) this.dashHintDelayMs -= dt;
        if (this.dashHintDelayMs <= 0) {
          this.tutorialHint.tryShow('hint_dash', {
            actions: [GameAction.DASH],
            text: t('tutorial.dash'),
            persistent: true,
          });
        }
      } else {
        this.dashHintDelayMs = -1;
      }
      if (this.tutorialHint.isShowing('hint_dash')
          && this.game.input.isJustPressed(GameAction.DASH)) {
        this.tutorialHint.dismissAfter('hint_dash', HINT_LINGER_MS);
        this.dashHintHandled = true;
      }
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
      this.player.vx = 0;
      this.player.vy = 0;
      this.player.savePrevPosition();
      this.game.camera.update(dt);
      this.hitSparks.update(dt);
      this.propShatter.update(dt);
      this.screenFlash.update(dt);
      return;
    }

    // Screen crack effect update
    if (this.screenCrack && !this.screenCrack.isDone) {
      this.screenCrack.update(dt);
    }

    // Void fade in progress — input locked but the rest of the scene keeps
    // simulating (fluid, particles, camera, enemies all tick normally).
    // updateVoidFade itself bumps the fade timer + force-grounds the player.
    if (this.voidDropActive) {
      this.updateVoidFade(dt);
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
      this.propShatter.update(dt);
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
      this.hideAnvilPrompts();
      this.updateAltarInput();
      return;
    }

    // Debug warp:
    //   Shift+M  → 모든 룸 풀 디테일 + 클릭 워프 모드로 월드맵 오픈
    //   Backtick → 뷰포트 클릭 워프 토글 (현재 화면 안 임의 위치로 즉시 점프)
    this.handleDebugWarp();

    // World Map toggle (M key) ??disabled inside item tunnels.
    // Shift+M 은 위 handleDebugWarp 가 먼저 consume 하므로 여기 일반 M 분기엔 도달 안 함.
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
      this.hideAnvilPrompts();
      this.uiController.updateWorldMap({
        dt,
        playerWorldX: this.player.x + this.currentLevel.worldX,
        playerWorldY: this.player.y + this.currentLevel.worldY,
      });
    }

    // 사용자 결정 (2026-05-03): 첫 IW 보스 처치 전엔 인벤토리 잠금. INVENTORY
    // 키 입력 시 Rustborn 보유 여부에 따라 Ego 대사 또는 'Locked' 토스트.
    // shiftDown / inItemTunnel 분기는 기존 통과 (debug / 진입 컷신).
    if (
      !sacredSave.isFirstItemWorldBossDefeated() &&
      !this.inItemTunnel &&
      !this.game.input.shiftDown &&
      !this.inventoryUI.visible &&
      this.game.input.isJustPressed(GameAction.INVENTORY)
    ) {
      this.game.input.consumeJustPressed(GameAction.INVENTORY);
      const hasRustborn = this.inventory.items.some(it => it.def.id === 'sword_rustborn');
      if (hasRustborn) {
        if (this.loreDisplay && !this.loreDisplay.isActive) {
          void this.loreDisplay.showDialogue(EGO_INVENTORY_LOCKED, false);
        }
      } else {
        this.toast.show(t('toast.locked'), 0xaaaaaa);
      }
      return;
    }

    // Inventory UI toggle ??disabled inside item tunnels, Shift+I is debug
    this.uiController.handleInventoryToggle({
      canToggle: !this.inItemTunnel && !this.game.input.shiftDown && sacredSave.isFirstItemWorldBossDefeated(),
      onToggled: () => {
        // Broken Sword 픽업 전엔 인벤토리 토글을 "가이드 학습 완료"로 인정하지 않는다.
        // 인벤토리에 줄 게 없는 시점에 I 를 누르는 건 대개 우발적 입력이고,
        // 진짜 가이드는 첫 무기 픽업 직후에 처음 띄워야 의미가 있다.
        if (!sacredSave.isFirstPickupDone()) return;
        this.unlockedEvents.add('__itemKeyPressedAfterItemWorld');
        this.hud.setItemKeyHighlight(false);
        // 2026-05-18: tutorialHint.dismiss 는 *Rustborn 실제 착용 후* equip 분기에서만
        // 실행한다. I 키만 누르면 인벤토리 보고 끄는 케이스 → 사용자가 튜토리얼을
        // 잊는 문제. HUD pulse 는 여기서 멈추지만 hint 텍스트는 유지.
      },
    });

    if (this.inventoryUI.visible) {
      this.hideAnvilPrompts();
      this.inventoryUI.update(dt); // selection pulse animation (runs even behind cycle prompt)
      // Re-dive confirmation prompt overlays the inventory (anvil mode only)
      if (this.cyclePromptItem) {
        this.updateCyclePromptInput();
        return;
      }
      const inventoryResult = this.uiController.handleInventoryInput();
      if (inventoryResult === 'confirmed_equipment_change') {
        this.updatePlayerAtk();
        this.hud.updateATK(this.player.atk);
        // 2026-05-18: 튜토리얼 hint 는 *Rustborn 실제 착용 시점* 에만 dismiss.
        // 사용자가 다른 무기로 갈아끼우는 케이스에선 hint 유지 — 튜토리얼 목적은
        // "Rustborn 착용" 학습이므로 그 행동이 끝나야 학습 완료로 인정.
        const equipped = this.inventory.equipped;
        if (equipped?.def.id === 'sword_rustborn') {
          this.tutorialHint.dismiss(INVENTORY_KEY_HINT_ID);
          this.tutorialHint.dismiss(INVENTORY_KEY_AFTER_FIRST_IW_HINT_ID);
        }
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
    this.updateQueuedSave(dt);

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
      const nextStampX = Math.round(this.activeBuilder.container.x / 16);
      const nextStampY = Math.round(this.activeBuilder.container.y / 16);
      if (this.builderStampOriginX !== nextStampX || this.builderStampOriginY !== nextStampY) {
        this.unstampBuilder();
        this.stampBuilder();
      }
      this.syncBuilderAttachments();

      // Cinematic builder (Shaft_01) — emit camera shakes to sell the weight
      // of the descent. Rhythmic "쿵" every two tile crossings while moving,
      // then a single heavy "쿠웅" on the frame the builder comes to rest.
      // `builderShakeEnabled` lets patrol-mode builders opt in to the same
      // feedback (e.g. Shaft_DemoEnd's Builder_Level_2).
      if (this.activeBuilderMode === 'cinematic' || this.builderShakeEnabled) {
        const nowMoving = this.activeBuilder.isMoving;
        if (nowMoving && stampDelta !== 0) {
          this.builderStepCounter++;
          if (this.builderStepCounter % 2 === 0) {
            this.game.camera.shake(6);
          }
        }
        if (this.builderWasMoving && !nowMoving) {
          this.game.camera.shake(18);
          this.builderStepCounter = 0;
        }
        this.builderWasMoving = nowMoving;
      }
    }

    // Player
    // 직전 프레임의 playerOnBuilder 값을 onCarrier 로 전달해, 빌더 위
    // grounding 이 lastSafeX/Y 갱신을 건너뛰도록 한다. 빌더에서 내려선
    // 다음 프레임에 1틱 늦게 safe ground 가 잡히는데 시각적으로 무시 가능.
    this.player.onCarrier = this.playerOnBuilder;
    this.player.update(dt);

    // No-weapon attack feedback — Player flags the pulse, scene shows toast
    // with cooldown so spamming C doesn't spam toasts.
    if (this.player.attackBlockedNoWeaponPulse) {
      this.player.attackBlockedNoWeaponPulse = false;
      if (this.noWeaponToastCooldown <= 0) {
        this.toast.show(t('toast.no_weapon'), 0xFF8000);
        this.noWeaponToastCooldown = 1500;
      }
    }
    if (this.noWeaponToastCooldown > 0) {
      this.noWeaponToastCooldown = Math.max(0, this.noWeaponToastCooldown - dt);
    }

    // First time HP drops to/under 40% — surface a tutorial hint pointing at
    // the heal key. Shared one-shot flag with ItemWorldScene.
    if (
      !isLowHpHealToastFired() &&
      this.player.maxHp > 0 &&
      this.player.hp > 0 &&
      this.player.hp / this.player.maxHp <= 0.4
    ) {
      markLowHpHealToastFired();
      this.tutorialHint.tryShow('low_hp_heal', {
        keyLabel: actionKey(GameAction.FLASK),
        text: t('tutorial.heal'),
      });
    }

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
      // Locked door 가 player 와 enemy 사이에 있으면 hit 차단 — attack 이 door 를 투과 안 함.
      const targets = this.enemies
        .filter((e) => e.alive)
        .filter((e) => !this.isAttackBlockedByDoor(e)) as CombatEntity[];
      const hits = this.hitManager.checkHits(
        this.player,
        this.player.comboIndex,
        this.player.hitList,
        targets,
      );
      for (const hit of hits) {
        this.dmgNumbers.spawn(hit.hitX, hit.hitY - 8, hit.damage, hit.heavy, hit.critical);
        this.hitSparks.spawn(hit.hitX, hit.hitY, hit.heavy, hit.dirX);
        SFX.play('attack_hit');
        if (hit.critical) this.criticalHighlight.spawn(hit.hitX, hit.hitY);
        if (hit.heavy) {
          this.screenFlash.flashHit(true);
          this.comboFinisherBurst.spawn(hit.hitX, hit.hitY, hit.dirX);
        }
      }
      // Check kills after combat resolution
      for (const enemy of this.enemies) {
        if (!enemy.alive && !enemy.shouldRemove && !isEnemyKillHandled(enemy)) {
          markEnemyKillHandled(enemy);
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

    // Breakable props (sway animation)
    for (const bp of this.breakableProps) bp.update(dt);
    // 수동 배치 Breakable (LDtk Entity).
    for (const b of this.breakables) b.update(dt);
    // Decorative grass sway
    this.procDecorator?.update(dt);

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
        this.itemPickupGlow.spawn(gp.x + gp.width / 2, gp.y + gp.height / 2, 0xffd700);
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
        this.toast.show(t('toast.hp_gain', { amount: healed }), 0x44ff44);
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
        this.acquireOverlay?.show({
          type: 'hp',
          name: t('ui.acquire.hp.name', { amount: shard.hpBonus }),
          description: t('ui.acquire.hp.description'),
        });
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
          this.acquireOverlay?.show({
            type: 'relic', iconKey: 'dash',
            name: t('ui.acquire.relic.dash.name'),
            usage: t('ui.acquire.relic.dash.usage', { key: '{key}' }),
            keyAction: GameAction.DASH,
          });
        } else if (abilityName === 'diveAttack') {
          this.player.abilities.diveAttack = true;
          this.acquireOverlay?.show({
            type: 'relic', iconKey: 'diveAttack',
            name: t('ui.acquire.relic.diveAttack.name'),
            usage: t('ui.acquire.relic.diveAttack.usage', { key: '{key}' }),
            keyAction: GameAction.ATTACK,
          });
        } else if (abilityName === 'surge') {
          this.player.abilities.surge = true;
          this.acquireOverlay?.show({
            type: 'relic', iconKey: 'surge',
            name: t('ui.acquire.relic.surge.name'),
            usage: t('ui.acquire.relic.surge.usage', { key: '{key}' }),
            keyAction: GameAction.JUMP,
          });
        } else if (abilityName === 'waterBreathing') {
          this.player.abilities.waterBreathing = true;
          this.acquireOverlay?.show({
            type: 'relic', iconKey: 'waterBreathing',
            name: t('ui.acquire.relic.waterBreathing.name'),
            usage: t('ui.acquire.relic.waterBreathing.usage'),
            // No keyAction — passive ability
            tint: 0x4488ff,
          });
        } else if (abilityName === 'wallJump') {
          this.player.abilities.wallJump = true;
          this.acquireOverlay?.show({
            type: 'relic', iconKey: 'wallJump',
            name: t('ui.acquire.relic.wallJump.name'),
            usage: t('ui.acquire.relic.wallJump.usage', { key: '{key}' }),
            keyAction: GameAction.JUMP,
          });
        } else if (abilityName === 'doubleJump') {
          this.player.abilities.doubleJump = true;
          this.acquireOverlay?.show({
            type: 'relic', iconKey: 'doubleJump',
            name: t('ui.acquire.relic.doubleJump.name'),
            usage: t('ui.acquire.relic.doubleJump.usage', { key: '{key}' }),
            keyAction: GameAction.JUMP,
          });
        } else if (abilityName === 'cheat') {
          // DEC-010: ?�버�?치트 ?�릭.
          // Gate: Debug_ 방에 배치 ???debug URL ?�라미터 ?�이???�근 불�?.
          // ?�반 ?��??�게 ?�출?��? ?�음. 추�? gate 불필??
          this.player.abilities.cheat = true;
          this.updatePlayerAtk(); // re-applies +99999 via cheat branch
          this.player.hp = this.player.maxHp; // full heal to new cap
          this.toast.showBig(t('toast.cheat_atk_hp'), 0xff00ff);
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
          this.toast.show(t('toast.item_acquired', { name: drop.item.def.name, rarity: drop.item.rarity.toUpperCase() }), 0xffcc44);
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
    this.checkAttackOnBreakableProps();
    this.checkAttackOnSecretWalls();
    this.checkAttackOnBreakables();
    this.checkAttackOnBreakableEntities();
    this.checkAttackOnContainers();
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

    // Void contact check (sequence handled by early-return above)
    if (this.voidCooldown > 0) this.voidCooldown -= dt;
    this.checkVoidContact();

    // Elemental tile hazards (magma · charged · acid · fire · thunder · burn)
    // GDD: Documents/System/System_World_TileSystem.md §2.6-2.13
    this.tickTileHazards(dt);

    // Updraft wind zones
    this.applyUpdrafts(dt);

    // Void fog particles (visual only)
    this.voidFogSystem.update(dt, this.collisionGrid, this.game.camera);

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

    // Shift+P 전역 리셋은 Game.ts 단에서 처리 — 어떤 씬에서도 작동.

    // Shift+I 전역 UI 토글은 Game.ts 에서 처리 — INVENTORY 가 거기서 consume 되므로
    // 여기 인벤토리 토글 핸들러는 자동으로 통과한다.

    // Debug commands ??only active with ?debug=1 in URL
    if (new URLSearchParams(window.location.search).has('debug')) {
      // Shift+O — unified cheat toggle. ON: all relic abilities, maxHp/atk
      // inflated to 99999, HP locked at ≥ 1 (immortal clamp). OFF: restore
      // the snapshot taken at toggle-on.
      if (this.game.input.shiftDown && this.game.input.isJustPressed(GameAction.DEBUG_CHEAT)) {
        if (this.player.debugCheatActive) {
          this.player.disableCheatBundle();
          this.toast.show('CHEAT OFF', 0x44ff44);
        } else {
          this.player.enableCheatBundle();
          this.toast.show('CHEAT ON — relics + HP/ATK 99999 + immortal', 0xffaa00);
        }
      }

      // Shift+1 = Ignite plant/oil/wood at player feet + 4-neighbours.
      // Verifies grass/wood/oil propagation (TileMutator) without enchant system.
      if (this.game.input.shiftDown && this.game.input.isJustPressed(GameAction.DEBUG_FIRE)) {
        this.debugIgniteAtPlayer();
      }
      // Shift+2 = Freeze water/magma at player + 4-neighbours (3s temp wall).
      if (this.game.input.shiftDown && this.game.input.isJustPressed(GameAction.DEBUG_ICE)) {
        this.debugFreezeAtPlayer();
      }
      // Shift+3 = Thunder chain at player + 4-neighbours (water/metal/acid flood-fill).
      if (this.game.input.shiftDown && this.game.input.isJustPressed(GameAction.DEBUG_THUNDER)) {
        this.debugThunderAtPlayer();
      }
      // Digit 1/2/3 (without shift) — switch active enchant (Hades-style Boon swap).
      if (!this.game.input.shiftDown) {
        if (this.game.input.isJustPressed(GameAction.DEBUG_FIRE))    this.player.activeEnchant = 'fire';
        else if (this.game.input.isJustPressed(GameAction.DEBUG_ICE))    this.player.activeEnchant = 'ice';
        else if (this.game.input.isJustPressed(GameAction.DEBUG_THUNDER)) this.player.activeEnchant = 'thunder';
      }
      // Shift+G — spawn 4 debug containers near player (until LDtk Entity wiring lands).
      if (this.game.input.shiftDown && this.game.input.isJustPressedKeyCode('KeyG')) {
        this.debugSpawnContainers();
      }
    }

    // ── Hold-and-release Cast (V / Y) — charge a shard, release to fire.
    // While held, render a trajectory preview matching the charged power.
    //
    // Shipping gate (Victor 2026-05-15): the shard cast ability is debug-only
    // for now. Without `?debug` in the URL we short-circuit the entire
    // charge / preview / fire flow so the action is invisible to players in
    // shipped builds. Pre-existing cooldown / preview state is also cleared
    // each frame so a debug→shipping URL flip mid-session doesn't leave
    // ghost previews on screen.
    const _shardAbilityOn = new URLSearchParams(window.location.search).has('debug');
    if (!_shardAbilityOn) {
      this.egoCastChargeMs = 0;
      this.egoShardPreview.hide();
      this.player.isAiming = false;
    }
    const castDown = _shardAbilityOn && !this.heldContainer && this.game.input.isDown(GameAction.CAST);
    const canCast = _shardAbilityOn && !this.heldContainer && this.player.egoCastCooldownMs <= 0 && this.player.egoShardCount > 0;
    const facing: -1 | 1 = this.player.facingRight ? 1 : -1;
    // Launch from the aim-pose gun muzzle. The aim sprite extends the gun
    // ~14 px past the player's body center; launchY sits at the arm/shoulder
    // line where the gun is held, raised by 5 px to match the sprite.
    const launchX = this.player.x + this.player.width / 2 + facing * 14;
    const launchY = this.player.y + this.player.height * 0.38 - 5;
    if (castDown && canCast) {
      this.egoCastChargeMs = Math.min(this.egoCastChargeMs + dt, CAST_CHARGE_MAX_MS);
      this.player.isAiming = true;
      const { vx, vy } = getShardVelocity(this.egoCastChargeMs, facing);
      const grid = this.collisionGrid;
      this.egoShardPreview.show(
        launchX, launchY, vx, vy, this.player.activeEnchant,
        (x, y) => {
          const gx = Math.floor(x / 16);
          const gy = Math.floor(y / 16);
          const t = grid[gy]?.[gx] ?? 0;
          return t === 1 || t === 7 || t === 9 || t === 12 || t === 15;
        },
      );
    } else if (!castDown && this.egoCastChargeMs > 0) {
      // Released — fire shard with whatever charge accumulated.
      if (canCast) {
        const { vx, vy } = getShardVelocity(this.egoCastChargeMs, facing);
        this.egoShard.spawn(launchX, launchY, vx, vy, this.player.activeEnchant);
        this.player.egoShardCount--;
        this.player.shardCooldowns.push(SHARD_RECOVERY_MS);
        this.player.egoCastCooldownMs = CAST_MIN_GAP_MS;
      }
      this.egoCastChargeMs = 0;
      this.egoShardPreview.hide();
      this.player.isAiming = false;
    } else {
      this.egoShardPreview.hide();
      this.player.isAiming = false;
    }
    if (this.player.egoCastCooldownMs > 0) {
      this.player.egoCastCooldownMs = Math.max(0, this.player.egoCastCooldownMs - dt);
    }
    // Tick all in-flight cooldowns. When one expires, the OLDEST living
    // shard in the world is called back to the Ego sword — visually
    // disappears with a ring burst. This keeps the world from accumulating
    // forgotten shards as the player keeps firing.
    {
      const cd = this.player.shardCooldowns;
      for (let i = cd.length - 1; i >= 0; i--) {
        cd[i] -= dt;
        if (cd[i] <= 0) {
          cd.splice(i, 1);
          this.player.egoShardCount = Math.min(this.player.egoShardCount + 1, EGO_SHARD_MAX);
          this.egoShard.removeOldestShard();
        }
      }
    }

    // ── Grab / Throw (B / RB) — Arc Tether 원격 픽업 + Spelunky 던지기. ──
    // 픽업 단계:
    //   1) GRAB 입력 → findNearestGrabbableContainer (facing × cone × 6타일)
    //   2) 후보 found → startGrabPull : pickUp() 즉시 호출 (held=true → no gravity)
    //      + pullingContainer 설정 + arcTether.startPull(boosted)
    //   3) 200ms 동안 컨테이너가 어깨로 ease-out 보간 (아래 held 위치 갱신 블록)
    //   4) 보간 완료 → pullingContainer=null, arcTether → hold 페이즈
    // 던지기 단계는 종전과 동일 — pull 진행 중에는 던지기 입력 무시.
    if (this.game.input.isJustPressed(GameAction.GRAB)) {
      if (this.heldContainer) {
        if (!this.pullingContainer) {
          const facing = this.player.facingRight ? 1 : -1;
          this.heldContainer.release(facing * 160, -170);
          this.heldContainer = null;
          this.arcTether?.hide();
        }
      } else {
        const best = this.findNearestGrabbableContainer();
        if (best) this.startGrabPull(best);
      }
    } else if (this.heldContainer && !this.pullingContainer && this.game.input.isJustPressed(GameAction.ATTACK)) {
      // 들고 있을 때만 ATTACK 도 throw. 검 휘두름이 같은 프레임에 발생하지 않도록
      // 입력 consume. (2026-05-17 — GRAB/ATTACK 양쪽으로 throw 가능)
      const facing = this.player.facingRight ? 1 : -1;
      this.heldContainer.release(facing * 160, -170);
      this.heldContainer = null;
      this.arcTether?.hide();
      this.game.input.consumeJustPressed(GameAction.ATTACK);
    }
    // Held container tracks player. During the pull phase, lerp from spawn
    // origin to the shoulder anchor with an ease-out so the crate visibly
    // "flies in" along the arc rather than teleporting to the shoulder.
    if (this.heldContainer && !this.heldContainer.destroyed) {
      const h = this.heldContainer;
      const targetX = this.player.x + (this.player.width - h.width) / 2;
      const targetY = this.player.y - h.height - 2;
      if (this.pullingContainer === h) {
        this.pullElapsedMs += dt;
        const PULL_DURATION_MS = 200;
        const t = Math.min(1, this.pullElapsedMs / PULL_DURATION_MS);
        const easeT = 1 - Math.pow(1 - t, 3);
        h.x = this.pullStartX + (targetX - this.pullStartX) * easeT;
        h.y = this.pullStartY + (targetY - this.pullStartY) * easeT;
        if (t >= 1) {
          this.pullingContainer = null;
          this.pullElapsedMs = 0;
        }
      } else {
        h.x = targetX;
        h.y = targetY;
      }
      h.container.x = h.x;
      h.container.y = h.y;
      this.player.isLifting = true;
    } else {
      this.player.isLifting = false;
    }
    this.updateContainerPrompt();
    this.updateArcTether(dt);

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
    this.hud.setBurnStatus(this.player.burnRemainingMs ?? 0, MAGMA_BURN_DURATION_MS);
    this.hud.setEgoShards(this.player.egoShardCount, 3, this.player.activeEnchant);

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
    this.hud.setDebugInfoVisible(Debug.infoVisible);
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
    this.propShatter.update(dt);
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
      // Land thud — 낙하 속도가 의미 있을 때만 (작은 점프 후 착지 noise 회피).
      // 무거운 낙하일수록 slower playback (deeper pitch).
      if (landedSpeed > 120) {
        const t = Math.min(1, (landedSpeed - 120) / 380);
        SFX.play('land', 0, { speed: 1.1 - t * 0.25 });
      }
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
    // Footstep puff on ground movement + sound. speed 0.92~1.08 무작위로 단조로움 감소.
    if (this.footstepPuff.stepIfMoving(
      dt, p.isGrounded(),
      p.x + p.width / 2, p.y + p.height,
      p.getVx(), p.facingRight,
    )) {
      SFX.play('footstep', 0, { speed: 0.92 + Math.random() * 0.16 });
    }
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
      // Dynamic fluid surface ripple — 진입(+) 시 큰 임펄스, 탈출(-) 시 약한 반대 임펄스.
      const impulseVy = waterT > 0 ? Math.max(80, p.getVy()) : -120;
      this.fluidSystem.applyImpulse(p.x + p.width / 2, p.y + p.height, impulseVy);
    }
    // Non-water fluid (magma/oil/acid) entry/exit ripple — same impulse pattern
    // as water but no swim physics / oxygen handling (those are water-only).
    const playerWaterfallType = this.fluidSpawners.queryFluidAtAabb(p.x, p.y, p.width, p.height, this.collisionGrid);
    const inMagma_ = isInMagma(p.x, p.y, p.width, p.height, this.collisionGrid) || playerWaterfallType === 'magma';
    const inOil_   = isInOil  (p.x, p.y, p.width, p.height, this.collisionGrid) || playerWaterfallType === 'oil';
    const inAcid_  = isInAcid (p.x, p.y, p.width, p.height, this.collisionGrid) || playerWaterfallType === 'acid';
    const inCyro_  = isInCyro (p.x, p.y, p.width, p.height, this.collisionGrid) || playerWaterfallType === 'cyro';
    const inAnyOther = inMagma_ || inOil_ || inAcid_ || inCyro_;
    if (inAnyOther !== this.prevPlayerInOtherFluid) {
      const type: 'magma' | 'oil' | 'acid' | 'cyro' = inCyro_ ? 'cyro' : inOil_ ? 'oil' : inAcid_ ? 'acid' : 'magma';
      const strength = inAnyOther ? 1.0 : 0.8;
      this.waterSplash.spawn(p.x + p.width / 2, p.y + p.height, strength, type);
      const impulseVy = inAnyOther ? Math.max(80, p.getVy()) : -120;
      this.fluidSystem.applyImpulse(p.x + p.width / 2, p.y + p.height, impulseVy);
      // Magma entry → also emit a single steam puff (water-on-skin sizzle).
      if (inAnyOther && inMagma_) {
        this.steamPuff.spawn(p.x + p.width / 2, p.y + p.height, 1.2);
      }
      this.prevPlayerInOtherFluid = inAnyOther;
    }
    // ── Residue trail timers (oil/acid/magma) ───────────────────────────
    // Each timer = remaining ms during which the player's feet still leave
    // a residue blot. Touching the source fluid refreshes to full duration.
    // Oil additionally drives the slip debuff (Player.update reads it).
    if (inOil_) {
      p.oilSlipRemainingMs = OIL_SLIP_DURATION_MS;
      p.oilResidueRemainingMs = OIL_RESIDUE_DURATION_MS;
    } else {
      if (p.oilSlipRemainingMs > 0) p.oilSlipRemainingMs = Math.max(0, p.oilSlipRemainingMs - dt);
      if (p.oilResidueRemainingMs > 0) p.oilResidueRemainingMs = Math.max(0, p.oilResidueRemainingMs - dt);
    }
    p.prevInOil = inOil_;

    if (inAcid_) p.acidResidueRemainingMs = ACID_RESIDUE_DURATION_MS;
    else if (p.acidResidueRemainingMs > 0) p.acidResidueRemainingMs = Math.max(0, p.acidResidueRemainingMs - dt);
    p.prevInAcid = inAcid_;

    if (inMagma_) p.magmaResidueRemainingMs = MAGMA_RESIDUE_DURATION_MS;
    else if (p.magmaResidueRemainingMs > 0) p.magmaResidueRemainingMs = Math.max(0, p.magmaResidueRemainingMs - dt);
    p.prevInMagma = inMagma_;

    // Water/Cyro 시각-only residue (2026-05-18).
    if (p.inWater) p.waterResidueRemainingMs = WATER_RESIDUE_DURATION_MS;
    else if (p.waterResidueRemainingMs > 0) p.waterResidueRemainingMs = Math.max(0, p.waterResidueRemainingMs - dt);

    if (inCyro_) p.cyroResidueRemainingMs = CYRO_RESIDUE_DURATION_MS;
    else if (p.cyroResidueRemainingMs > 0) p.cyroResidueRemainingMs = Math.max(0, p.cyroResidueRemainingMs - dt);
    p.prevInCyro = inCyro_;

    const footX = p.x + p.width / 2;
    const footY = p.y + p.height;
    const grounded = p.isGrounded();
    this.fluidResidue.emit('oil',   footX, footY, p.oilResidueRemainingMs > 0, grounded, p.oilResidueRemainingMs / OIL_RESIDUE_DURATION_MS);
    this.fluidResidue.emit('acid',  footX, footY, p.acidResidueRemainingMs > 0, grounded, p.acidResidueRemainingMs / ACID_RESIDUE_DURATION_MS);
    this.fluidResidue.emit('magma', footX, footY, p.magmaResidueRemainingMs > 0, grounded, p.magmaResidueRemainingMs / MAGMA_RESIDUE_DURATION_MS);
    this.fluidResidue.emit('water', footX, footY, p.waterResidueRemainingMs > 0, grounded, p.waterResidueRemainingMs / WATER_RESIDUE_DURATION_MS);
    this.fluidResidue.emit('cyro',  footX, footY, p.cyroResidueRemainingMs > 0, grounded, p.cyroResidueRemainingMs / CYRO_RESIDUE_DURATION_MS);

    // ── Residue contact effects: standing on a blot triggers the matching
    // hazard. Oil = slip refresh. Acid = damage tick. Magma = burn DOT.
    // Burning oil blot = fire DOT + Burn refresh.
    this.fluidResidue.applyEffects(p.x, p.y, p.width, p.height, {
      refreshOilSlip: (_remainingMs) => {
        // No-op (2026-05-17): residue blot → player 전이 차단. 플레이어가 자기
        // 발자국 위를 걸으면 oilResidueRemainingMs 가 무한 refresh 되어 발바닥
        // 기름이 영원히 안 사라지는 버그 픽스. TILE_OIL 원본 셀만 player 에 전이.
      },
      onAcidContact: () => {
        let acc = p.acidTickAccum ?? 0;
        acc += dt;
        while (acc >= 100 /* ACID_TICK_MS */) {
          acc -= 100;
          const dmg = Math.max(1, Math.floor(p.maxHp * 0.005));
          if (!p.invincible) p.hp = Math.max(0, p.hp - dmg);
        }
        p.acidTickAccum = acc;
      },
      onMagmaContact: () => {
        if (p.inWater) {
          p.extinguishFireDebuffs();
          return;
        }
        // Refresh Burn DOT (mirrors magma cell behavior — initial hit + 15s burn).
        const wasBurning = (p.burnRemainingMs ?? 0) > 0;
        p.burnRemainingMs = 15000;
        if (!wasBurning && !p.invincible) {
          const dmg = Math.max(1, Math.floor(p.maxHp * 0.02));
          p.hp = Math.max(0, p.hp - dmg);
        }
      },
      onFireContact: () => {
        if (p.inWater) {
          p.extinguishFireDebuffs();
          return;
        }
        // Burning oil residue — same per-frame fire DOT as fire overlay.
        if (!p.invincible) {
          const dmg = Math.max(1, Math.floor(p.maxHp * 0.03 * (dt / 1000)));
          p.hp = Math.max(0, p.hp - dmg);
        }
        // Refresh Burn DOT so the player keeps cooking after stepping off.
        p.burnRemainingMs = Math.max(p.burnRemainingMs ?? 0, 10000);
      },
    });
    if (p.inWater) p.extinguishFireDebuffs();
    // Continuous rising bubbles while submerged
    this.waterBubbles.emit(p.x + p.width / 2, p.y + p.height * 0.35, dt, p.submerged);
    // Drop-through dust streak
    if (p.consumeDropThroughEvent()) {
      this.dropThroughDust.spawn(p.x + p.width / 2, p.y + p.height, p.width * 0.9);
      // 사용자가 직접 drop-through 학습 완료 — hint 가 표시 중이면 1초 후 자동 fade,
      // 재발사 방지 위해 handled flag 도 set.
      this.tutorialHint.dismissAfter('hint_drop_through', 1000);
      this.dropThroughHintHandled = true;
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
        this.waterSplash.spawn(ex, ey, strength, 'water');
        const impulseVy = e.waterTransition > 0 ? 150 : -100;
        this.fluidSystem.applyImpulse(ex, ey, impulseVy);
      }
      // Magma / oil / acid entry-exit splash (same as player handler).
      const inOther = isInMagma(e.x, e.y, e.width, e.height, this.collisionGrid)
                   || isInOil  (e.x, e.y, e.width, e.height, this.collisionGrid)
                   || isInAcid (e.x, e.y, e.width, e.height, this.collisionGrid);
      const prevOther = this.prevEnemyInOtherFluid[i] ?? false;
      if (inOther !== prevOther) {
        // Pick the fluid actually under the enemy for splash color.
        let type: 'magma' | 'oil' | 'acid' = 'magma';
        if (isInOil (e.x, e.y, e.width, e.height, this.collisionGrid)) type = 'oil';
        else if (isInAcid(e.x, e.y, e.width, e.height, this.collisionGrid)) type = 'acid';
        const strength = inOther ? 1.0 : 0.8;
        this.waterSplash.spawn(ex, ey, strength, type);
        const impulseVy = inOther ? 150 : -100;
        this.fluidSystem.applyImpulse(ex, ey, impulseVy);
        this.prevEnemyInOtherFluid[i] = inOther;
      }
      const key = `enemy_${i}`;
      this.waterBubbles.emit(ex, e.y + e.height * 0.35, dt, e.submerged, key);
      this.iceSkidStreak.emit(dt, e.isStandingOnIce(), ex, ey, e.getVx(), key);
      const eLanded = e.consumeLandedEvent();
      if (eLanded !== null) this.landingDust.spawn(ex, ey, eLanded);
      if (e.consumeGroundJumpEvent()) this.jumpTakeoff.spawn(ex, ey);

      // ── Residue contact effects: enemies share the player's residue
      // hazard surface. Element multiplier applies — magma-affined enemies
      // shrug off the magma blot; fire-affined ignore burning oil; etc.
      // Burn DOT refresh is skipped when the source element has 0 multiplier.
      if (e.oilSlipRemainingMs > 0) e.oilSlipRemainingMs = Math.max(0, e.oilSlipRemainingMs - dt);
      const eAcidM  = e.elementMultiplier('acid');
      const eMagmaM = e.elementMultiplier('magma');
      const eFireM  = e.elementMultiplier('fire');
      this.fluidResidue.applyEffects(e.x, e.y, e.width, e.height, {
        refreshOilSlip: (remainingMs) => {
          e.oilSlipRemainingMs = Math.max(e.oilSlipRemainingMs, remainingMs);
        },
        onAcidContact: () => {
          if (eAcidM <= 0) return;
          let acc = e.acidTickAccum;
          acc += dt;
          let totalDmg = 0;
          while (acc >= 100) {
            acc -= 100;
            const dmg = Math.max(1, Math.floor(e.maxHp * 0.005 * eAcidM));
            e.hp = Math.max(0, e.hp - dmg);
            totalDmg += dmg;
          }
          e.acidTickAccum = acc;
          if (totalDmg > 0) {
            e.showHpBarFlash();
            this.dmgNumbers.spawn(e.x + e.width / 2, e.y - 8, totalDmg, false);
          }
          if (e.hp <= 0) e.onDeath();
        },
        onMagmaContact: () => {
          if (eMagmaM <= 0) return;
          const wasBurning = e.burnRemainingMs > 0;
          e.burnRemainingMs = 15000;
          if (!wasBurning) {
            const dmg = Math.max(1, Math.floor(e.maxHp * 0.02 * eMagmaM));
            e.hp = Math.max(0, e.hp - dmg);
            e.showHpBarFlash();
            this.dmgNumbers.spawn(e.x + e.width / 2, e.y - 8, dmg, false);
            if (e.hp <= 0) e.onDeath();
          }
        },
        onFireContact: () => {
          if (eFireM <= 0) return;
          const dmg = Math.max(1, Math.floor(e.maxHp * 0.03 * eFireM * (dt / 1000)));
          e.hp = Math.max(0, e.hp - dmg);
          e.burnRemainingMs = Math.max(e.burnRemainingMs, 10000);
          if (e.hp <= 0) e.onDeath();
        },
      });
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
    this.steamPuff.update(dt);
    this.fluidResidue.update(dt);
    this.waterBubbles.update(dt);
    // ── Maintained spawners: refill when live count drops below minCount ──
    this.tickMaintainedSpawners(dt);
    // ── Throwable containers: gravity tick + impact paint + stacking ──
    const isContainerSolidCell = (gx: number, gy: number): boolean => {
      const t = this.collisionGrid[gy]?.[gx] ?? 0;
      return t === 1 || t === 3 || t === 7 || t === 9 || t === 12 || t === 15;
    };
    const env = {
      isAcidCell:  (gx: number, gy: number) => (this.collisionGrid[gy]?.[gx] ?? 0) === 13,
      isMagmaCell: (gx: number, gy: number) => (this.collisionGrid[gy]?.[gx] ?? 0) === 6,
      isFireCell:  (gx: number, gy: number) => this.tileMutator.aabbHasOverlay(gx * 16, gy * 16, 16, 16, 'fire'),
      // R-NEW-049/050/051/052/053: 신규 환경 노출 hook
      isWaterCell: (gx: number, gy: number) => (this.collisionGrid[gy]?.[gx] ?? 0) === 2,
      isOilCell:   (gx: number, gy: number) => (this.collisionGrid[gy]?.[gx] ?? 0) === 11,
      isFrozenOrIceCell: (gx: number, gy: number) =>
        (this.collisionGrid[gy]?.[gx] ?? 0) === 7 || this.tileMutator.isFrozen(gx, gy),
      isChargedCell: (gx: number, gy: number) => (this.collisionGrid[gy]?.[gx] ?? 0) === 8,
    };
    for (let i = this.containers.length - 1; i >= 0; i--) {
      const c = this.containers[i];
      const envImpact = c.tickEnvironment(dt, env);
      if (envImpact) {
        this.paintContainerImpact(c.kind, envImpact.gx, envImpact.gy, c.fluidVolume);
        this.destroyContainerWithVFX(c);
        this.containers.splice(i, 1);
        continue;
      }
      const impact = c.update(dt, isContainerSolidCell, this.containers);
      if (impact) {
        this.paintContainerImpact(c.kind, impact.gx, impact.gy, c.fluidVolume);
        this.destroyContainerWithVFX(c);
        this.containers.splice(i, 1);
      }
    }
    // ── Thrown container × enemy impact (one hit per throw) ──
    this.checkThrownContainerEnemyHit();
    // ── Player ↔ container collision (push / stack / block) ──
    this.resolvePlayerContainerCollision();
    // ── Enemy ↔ container collision (stack / block, no damage) ──
    this.resolveEnemyContainerCollision();
    // ── Container ↔ container overlap resolve (push or stop) ──
    this.resolveContainerContainerCollision();
    this.flushContainerFluidChanges();

    // ── Ego Shards: flight tick + impact dispatch + retrieval scan ──
    this.egoShard.update(
      dt,
      (info) => this.onEgoShardImpact(info.x, info.y, info.element),
      (x, y) => {
        const gx = Math.floor(x / 16);
        const gy = Math.floor(y / 16);
        const row = this.collisionGrid[gy];
        const t = row?.[gx] ?? 0;
        return t === 1 || t === 7 || t === 9 || t === 12 || t === 15;
      },
      (x, y, element) => this.checkShardEnemyHit(x, y, element) || this.checkShardContainerHit(x, y),
    );
    this.flushContainerFluidChanges();
    // Wider retrieval hit-zone — 24px padding around the player AABB so
    // shards stuck on adjacent walls / floor edges are easily grabbed.
    const pad = 24;
    const retrieved = this.egoShard.retrieveInAABB(
      this.player.x - pad,
      this.player.y - pad,
      this.player.width + pad * 2,
      this.player.height + pad * 2,
    );
    // Each manually-retrieved shard consumes one cooldown entry (whichever
    // has the most time remaining, so the player saves the biggest wait).
    for (let i = 0; i < retrieved; i++) {
      const cd = this.player.shardCooldowns;
      if (cd.length > 0) {
        let maxIdx = 0;
        for (let j = 1; j < cd.length; j++) if (cd[j] > cd[maxIdx]) maxIdx = j;
        cd.splice(maxIdx, 1);
      }
      this.player.egoShardCount = Math.min(this.player.egoShardCount + 1, EGO_SHARD_MAX);
    }
    // FluidSpawner tick — injects fluid cells before the gravity pass so
    // newly-spawned cells immediately begin falling this frame.
    this.fluidSpawners.update(dt, this.collisionGrid, this.fluidSystem);
    this.fluidSystem.update(dt);
    // Cellular gravity — water cells fall + spread to merge after mutations
    // (fire on water creates holes; gravity refills them from above).
    this.fluidSystem.gravityTick(this.collisionGrid, dt, this.tileMutator);
    this.fluidSpawners.pressureDrain(this.collisionGrid, this.fluidSystem);
    this.fluidCrestFoam.update(dt, this.fluidSpawners.getActiveSegments(this.collisionGrid));
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

  /** GamepadManager 연결/분리 이벤트 → 토스트 (System_Input_Gamepad §8.1 Stage 3). */
  private _attachGamepadToast(): () => void {
    const off1 = this.game.gamepad.onConnectEvent((brand) => {
      this.toast.show(t('toast.gamepad_connected', { brand: brandLabel(brand) }), 0x88ddff);
    });
    const off2 = this.game.gamepad.onDisconnectEvent(() => {
      this.toast.show(t('toast.gamepad_disconnected'), 0xffaa44);
    });
    return () => { off1(); off2(); };
  }

  exit(): void {
    if (this._gpUnsub) { this._gpUnsub(); this._gpUnsub = null; }
    if (this.parallaxBG) this.parallaxBG.container.visible = false;
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

  override destroy(): void {
    this.parallaxBG?.destroy();
    this.dmgNumbers?.clear();
    super.destroy();
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

  /** locked door 가 player center 와 entity center 사이에 끼어 있는지 — attack 차단용. */
  private isAttackBlockedByDoor(entity: { x: number; y: number; width: number; height: number }): boolean {
    if (this.lockedDoors.length === 0) return false;
    const px = this.player.x + this.player.width / 2;
    const py = this.player.y + this.player.height / 2;
    const ex = entity.x + entity.width / 2;
    const ey = entity.y + entity.height / 2;
    const xMin = Math.min(px, ex);
    const xMax = Math.max(px, ex);
    const yMin = Math.min(py, ey);
    const yMax = Math.max(py, ey);
    for (const door of this.lockedDoors) {
      if (!door.locked) continue;
      const a = door.getHitAABB();
      if (a.x + a.width < xMin || a.x > xMax) continue;
      if (a.y + a.height < yMin || a.y > yMax) continue;
      return true;
    }
    return false;
  }

  /** Returns true when at least one alive enemy is within 4 tiles (64px) of the player. */
  private hasEnemyNearby(): boolean {
    if (!this.enemies || this.enemies.length === 0) return false;
    const RANGE = 4 * 16; // 4 tiles
    const px = this.player.x;
    const py = this.player.y;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (Math.abs(e.x - px) < RANGE && Math.abs(e.y - py) < RANGE) return true;
    }
    return false;
  }

  private canLoadWorldLevel(levelId: string | null | undefined): levelId is string {
    if (!levelId) return false;
    const level = this.loader.getLevel(levelId);
    if (!level) return false;
    return level.roomType !== 'Debug' || LdtkWorldScene.debugMode;
  }

  private resolveSpawnLevelId(savedLevelId: string | null | undefined): string {
    if (this.canLoadWorldLevel(savedLevelId)) return savedLevelId;
    const fallbackLevelId = this.findPlayerSpawnLevel();
    if (savedLevelId) {
      console.warn(
        `[LdtkWorldScene] Saved level "${savedLevelId}" is missing or inaccessible; using "${fallbackLevelId}"`,
      );
    }
    return fallbackLevelId;
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
      // 사용자 피드백 2026-05-05: boss-lock door 의 시각 (16px×룸높이 brown bar)
      // 이 룸 가장자리에 어두운 세로 기둥으로 노출돼 misplaced asset 처럼 보임.
      // collision-only 로 처리 — 시각 숨김. 향후 arena 진입 폴리시 (energy
      // barrier 등) 추가 시 여기서 다른 styled 시각 부착.
      door.container.visible = false;
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
          this.toast.showBig(t('toast.atk_gain', { amount: atkGain }), 0xffd700);
        }

        // Spawn portal after delay
        setTimeout(async () => {
          if (!this.initialized) return;
          this.spawnPortal(bossX, bossY, rarity, 'altar', sourceItem);
        }, 1500);
      } else {
        // World boss (test) ??no portal, just big toast
        this.toast.showBig(t('toast.boss_defeated_excl'), 0xffd700);
      }
    } else if (enemy instanceof Slime) {
      // setTimeout(() => this.dialogueManager.fireEvent('first_slime_kill'), 1000);
    } else if (enemy instanceof Skeleton) {
      // setTimeout(() => this.dialogueManager.fireEvent('first_skeleton_kill'), 1000);
    }
    // Gold drop on kill (Elden Ring style ??items are hand-placed, not monster drops)
    const isGolden = enemy instanceof GoldenMonster;
    const baseGold = Math.floor((enemy.exp > 0 ? enemy.exp : 40) * 0.1);
    const goldAmount = isGolden ? baseGold * 3 : baseGold;
    if (goldAmount > 0) {
      const burst = resolveBottomLeftPickupSpawn(
        enemy.x + enemy.width / 2 - 8,
        enemy.y + enemy.height,
        this.collisionGrid,
      );
      for (const gp of GoldPickup.spawnBurst(burst.x, burst.y, goldAmount)) {
        gp.roomData = this.collisionGrid;
        this.goldPickups.push(gp);
        this.entityLayer.addChild(gp.container);
      }
    }

    // HEL-05: Tiered healing drops (GDD §4.1)
    const healDrop = resolveBottomLeftPickupSpawn(
      enemy.x + enemy.width / 2 - 8,
      enemy.y + enemy.height,
      this.collisionGrid,
    );
    if (isGolden && this.dropRng.next() < 0.5) {
      const heal = createForgeEmber(healDrop.x, healDrop.y, this.player.maxHp);
      this.healingPickups.push(heal);
      this.entityLayer.addChild(heal.container);
    } else if (!isGolden && this.dropRng.next() < 0.2) {
      const heal = createEmberShard(healDrop.x, healDrop.y, this.player.maxHp);
      this.healingPickups.push(heal);
      this.entityLayer.addChild(heal.container);
    }
  }

  private static readonly debugMode = (() => {
    const p = new URLSearchParams(window.location.search);
    return p.has('debug');
  })();

  private loadLevel(levelId: string, enterDirection: 'left' | 'right' | 'up' | 'down'): boolean {
    // Debug rooms (RoomType=Debug) only accessible with ?debug in URL
    if (this.loader.getLevel(levelId)?.roomType === 'Debug' && !LdtkWorldScene.debugMode) {
      console.warn(`[LdtkWorldScene] Debug level blocked without ?debug: "${levelId}"`);
      return false;
    }
    const level = this.loader.getLevel(levelId);
    if (!level) {
      console.error(`[LdtkWorldScene] Level not found: "${levelId}"`);
      return false;
    }

    // Drop the previous builder before replacing collisionGrid. Its stamped
    // cells belong to the previous level and must be restored there, not in
    // the newly loaded room.
    this.clearBuilder();

    this.currentLevel = level;
    this.visitedLevels.add(level.identifier);

    // Collision grid ??deep copy so runtime modifications don't persist across reloads
    this.collisionGrid = level.collisionGrid.map(row => [...row]);

    // Reset elemental tile overlays + burnable entities — frozen timers and
    // entity registry from the previous room would otherwise leak across
    // rooms with different layouts.
    this.tileMutator.reset();
    for (const p of this.burnableProps) p.destroy();
    this.burnableProps.length = 0;
    this.ashRemnant?.clear();
    this.fluidResidue?.clear();
    this.egoShard?.clear();
    this.solidifiedWallCells.clear();
    this.rebuildSolidifiedWallOverlay();
    for (const c of this.containers) c.destroy();
    this.containers.length = 0;
    this.heldContainer = null;
    this.pullingContainer = null;
    this.pullElapsedMs = 0;
    this.arcTether?.hide();

    // Hybrid procedural pass — populate grass/wood inside LDtk-painted
    // BurnableZone rect entities + spawn Tier B BurnableProp entities.
    // Density + seed come from entity fields.
    // GDD: Documents/System/System_World_TileSystem.md §7
    const burnableSpecs: BurnableEntitySpec[] = applyBurnableZones(this.collisionGrid, level.entities);
    for (const s of burnableSpecs) {
      const prop = new BurnableProp(s.id, s.gx, s.gy);
      this.burnableProps.push(prop);
      this.tileMutator.registerBurnable(prop);
      this.entityLayer.addChild(prop.container);
    }
    if (LdtkWorldScene.debugMode) {
      const zoneCount = level.entities.filter(e => e.type === 'BurnableZone').length;
      // eslint-disable-next-line no-console
      Debug.log(`[BurnableZone] level="${level.identifier}" zones=${zoneCount} props=${burnableSpecs.length}`);
    }

    // Throwable Container entities — LDtk-placed Box props player can grab/throw.
    //   Entity type:  "Container"
    //   Fields:
    //     Kind         (Enum or String) — Crate / OilDrum / WaterBarrel /
    //                                     MagmaCrucible / AcidVial
    //     FluidVolume  (Integer, optional) — number of cells flooded on
    //                                        break. If omitted or < 0,
    //                                        falls back to spec default.
    // Position uses the entity's px[] top-left.
    const containerEnts = level.entities.filter(e => e.type === 'Container');
    let spawnedCount = 0;
    const spawnLog: string[] = [];
    for (const ent of containerEnts) {
      const fields = ent.fields ?? {};
      const kindRaw = fields['Kind'];
      let kind = parseContainerKind(kindRaw);
      if (!kind) {
        // Generic_A/B/C — World 룸은 temperament 컨텍스트가 없으므로 default
        // (forge) 슬롯 풀에서 뽑힘. 룸별 톤이 필요하면 explicit Kind 사용.
        const slotStr = typeof kindRaw === 'string' ? kindRaw.toLowerCase() : '';
        if (slotStr === 'generic_a' || slotStr === 'generic_b' || slotStr === 'generic_c') {
          kind = resolveContainerSlotKind(slotStr, null);
        }
      }
      if (!kind) {
        // eslint-disable-next-line no-console
        console.warn(`[Container] level="${level.identifier}" Kind="${String(fields['Kind'])}" at (${ent.px[0]}, ${ent.px[1]}) — invalid, skipped. Valid values: Crate / MetalCrate / OilDrum / WaterBarrel / MagmaCrucible / AcidVial / Generic_A / Generic_B / Generic_C`);
        continue;
      }
      const fvRaw = fields['FluidVolume'];
      const fluidVolume = typeof fvRaw === 'number' && fvRaw >= 0 ? Math.floor(fvRaw) : undefined;
      // Use the entity's GRID position (cell coords) for a pivot-independent
      // top-left. LDtk's `px` depends on the entity definition's pivot
      // (center vs top-left) which we can't see from the loader; `grid`
      // is always the cell containing the entity, so `grid * 16` is the
      // unambiguous top-left of the cell.
      const cx = ent.grid[0] * 16;
      const cy = ent.grid[1] * 16;
      const c = new ThrowableContainer(kind, cx, cy, fluidVolume);
      this.containers.push(c);
      this.entityLayer.addChild(c.container);
      spawnLog.push(`  ${kind}@(${cx},${cy}) px=(${ent.px[0]},${ent.px[1]}) grid=(${ent.grid[0]},${ent.grid[1]}) vol=${c.fluidVolume}`);
      spawnedCount++;
    }
    // ── ContainerSpawner entities — procedural fill (System_World_Container §12) ──
    // Explicit Container entities are always honored first; spawners only
    // create boxes in *remaining* free cells (avoidEntity defaults to true).
    const spawnerEnts = level.entities.filter(e => e.type === 'ContainerSpawner');
    let spawnerSpawned = 0;
    const occupiedCells = new Set<string>();
    for (const c of this.containers) {
      const gx0 = Math.floor(c.x / 16);
      const gx1 = Math.floor((c.x + c.spec.width - 1) / 16);
      const gy0 = Math.floor(c.y / 16);
      const gy1 = Math.floor((c.y + c.spec.height - 1) / 16);
      for (let gy = gy0; gy <= gy1; gy++) {
        for (let gx = gx0; gx <= gx1; gx++) occupiedCells.add(`${gx},${gy}`);
      }
    }
    const debugOn = new URLSearchParams(window.location.search).has('debug');
    this.maintainedSpawners.length = 0;
    for (const spw of spawnerEnts) {
      const opts = readSpawnerEntity(spw);
      // Debug overlay — outline the spawner rect so designers can sanity-
      // check coverage in-game without reloading LDtk. Gated by ?debug.
      if (debugOn) {
        const dbg = new Graphics();
        dbg.rect(opts.rect.x, opts.rect.y, opts.rect.w, opts.rect.h)
          .stroke({ color: 0xff44ff, width: 1, alpha: 0.8 });
        this.entityLayer.addChild(dbg);
      }
      // Auto-seed when entity asks for non-deterministic: stable per level so
      // re-entries give the same layout. -1 stays -1 (truly random).
      const autoSeed = opts.seed >= 0
        ? opts.seed
        : (level.identifier.split('').reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) | 0, 0));
      const spawned = runContainerSpawner({
        rect: opts.rect,
        collisionGrid: this.collisionGrid,
        existing: this.containers,
        occupiedCells,
        pool: opts.pool,
        minCount: opts.minCount,
        maxCount: opts.maxCount,
        bias: opts.bias,
        seed: opts.seed >= 0 ? opts.seed : autoSeed,
        avoidEntity: opts.avoidEntity,
        fluidVolumeOverride: opts.fluidVolumeOverride,
      });
      for (const c of spawned) {
        this.containers.push(c);
        this.entityLayer.addChild(c.container);
        occupiedCells.add(`${Math.floor(c.x / 16)},${Math.floor(c.y / 16)}`);
        spawnerSpawned++;
      }
      // Register for runtime refill if Maintain=true. Refill check runs
      // every MAINTAIN_CHECK_MS in update(). `owned` starts as the initial
      // spawn batch — refill targets only spawners whose owned list is
      // fully depleted (all containers destroyed).
      if (opts.maintain && opts.pool.length > 0) {
        this.maintainedSpawners.push({
          rect: opts.rect,
          pool: opts.pool,
          minCount: opts.minCount,
          maxCount: opts.maxCount,
          bias: opts.bias,
          seed: opts.seed,
          avoidEntity: opts.avoidEntity,
          fluidVolumeOverride: opts.fluidVolumeOverride,
          checkAccum: 0,
          owned: [...spawned],
        });
      }
    }
    // Settle all spawned containers in dependency order — bottom containers
    // first so containers placed above them detect the proper resting
    // position. Loop is small (typically < 20) so cost is negligible.
    {
      const isContainerSolidCell = (gx: number, gy: number): boolean => {
        const t = this.collisionGrid[gy]?.[gx] ?? 0;
        return t === 1 || t === 3 || t === 7 || t === 9 || t === 12 || t === 15;
      };
      const sorted = [...this.containers].sort((a, b) => b.y - a.y);
      for (const c of sorted) {
        if (c.skipSettle) continue; // Drop-bias containers fall naturally.
        c.settleAtSpawn(isContainerSolidCell, this.containers);
      }
    }
    // Always log how many Container entities were seen vs spawned + where —
    // helps diagnose camera-out-of-view, off-grid, etc.
    // eslint-disable-next-line no-console
    Debug.log(`[Container] level="${level.identifier}" explicit=${spawnedCount}/${containerEnts.length} spawner=${spawnerSpawned} (from ${spawnerEnts.length} spawners)\n${spawnLog.join('\n')}`);

    // Dynamic fluid — value=2 flood-fill + FluidVolume entity 매칭. 룸 전환 시 detach 후 재attach.
    this.fluidSystem.attach(level);
    // FluidSpawner entities — continuous emission sources (Container.md §12 sibling).
    // Each tick injects 1 cell of the configured type at the spawn grid;
    // cellular gravity in FluidSystem then carries it downward.
    this.fluidSpawners.clear();
    this.fluidCrestFoam?.clear();
    for (const ent of level.entities) {
      if (ent.type !== 'FluidSpawner') continue;
      // Expand rect → per-cell spawners. width=16,height=16 → 1 cell; wider
      // rect → wider waterfall. Each cell ticks independently.
      for (const opt of readFluidSpawnerEntities(ent)) this.fluidSpawners.add(opt);
    }
    // Reset breakable hit tracking on level transition
    this.breakableHits.clear();
    // 보스 HP �?초기?????�전 ?�벨?�서 ?�아?�을 가?�성(?�망·?�프 ?? 차단.
    // ???�벨??보스방이�?activateBossLock ??update 루프?�서 ?�시 ?�시?�다.
    this.hud.hideBossHP();

    // Render tiles ??filter wall tiles by collision grid (destroyed tiles stay gone).
    // value=2 (water) 정적 sprite 는 dynamic FluidSystem 이 대신 표현하므로 제외.
    this.renderer.clear();
    const filteredWalls = level.wallTiles.filter(t => {
      const col = Math.floor(t.px[0] / TILE_SIZE);
      const row = Math.floor(t.px[1] / TILE_SIZE);
      const v = this.collisionGrid[row]?.[col] ?? 0;
      return v !== 0 && v !== 2;
    });
    // Retag BG/WALL tiles to CSV-derived atlas — but ONLY if the tile's
    // current tilesetPath matches the LDtk default for that layer. Levels
    // that override the tileset (e.g. Builder with builder_01) keep theirs.
    const defaultWallTileset = 'atlas/world_01.png';
    const defaultBgTileset = 'atlas/world_01.png';
    const bgToRetag = level.backgroundTiles.filter(t => t.tilesetPath === defaultBgTileset);
    const wallToRetag = filteredWalls.filter(t => t.tilesetPath === defaultWallTileset);
    applyAreaTilesetToLdtkTiles('world_shaft_bg', bgToRetag);
    applyAreaTilesetToLdtkTiles('world_shaft_wall', wallToRetag);
    // All other tiles (Interior, extras, overridden tilesets) keep their
    // original LDtk tilesetPath. Tilesets are pre-loaded in init().
    const allExtraTiles = Object.values(level.extraTileLayers).flat();
    const combinedInterior = level.interiorTiles.concat(allExtraTiles);
    this.renderer.renderLevel(level.backgroundTiles, filteredWalls, level.shadowTiles, this.atlases, undefined, this.collisionGrid, combinedInterior);
    this.applyTerrainFilterAreas(level.pxWid, level.pxHei);

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
      this.grassClumpFire.clear();
      this.procDecorator.generate(this.collisionGrid, hashString(level.identifier));
      for (const prop of this.grassClumpFire.register(this.procDecorator.getGrassClumpsWithCells())) {
        this.tileMutator.registerBurnable(prop);
      }
      if (this.wallPaletteFilter) {
        this.procDecorator.naturalLayer.filters = [this.naturalPaletteFilter!];
        this.procDecorator.artificialLayer.filters = [this.wallPaletteFilter];
        this.procDecorator.structureLayer.filters = [this.wallPaletteFilter];
        this.applyTerrainFilterAreas(level.pxWid, level.pxHei);
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


    // Area title on entry. During the intro fade-in we must defer the banner
    // until the screen is actually visible, otherwise it plays behind black.
    if (level.identifier === 'Shaft_01') {
      if (this.introPhase === 'fadeIn') {
        this.pendingAreaTitle = t('area.the_shaft');
      } else {
        this.areaTitle.show(t('area.the_shaft'));
      }
    }

    // Patch collisionGrid for already-unlocked SecretWalls/CrackedFloors
    // BEFORE placing the player. findEdgePassage scans collisionGrid to pick
    // an entry passage, so any wall the player already broke (e.g. re-entering
    // via a SecretWall passage) must be cleared first or the player spawns on
    // the wrong edge and floats in empty space.
    this.spawnCrackedFloors(level);
    this.spawnSecretWalls(level);
    this.spawnBreakablePropsForLevel(level);
    this.spawnBreakableEntitiesForLevel(level);
    this.spawnBuildingEntitiesForLevel(level);

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
      if (sp.sprite?.parent) sp.sprite.parent.removeChild(sp.sprite);
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
    } else if (level.identifier === 'Shaft_02') {
      // 사용자 결정 2026-05-07 — Shaft_02 좌측 벽 + 16 cell 위치에 Builder_02
      // 배치, y=0..100 무한 왕복.
      this.spawnShaft02Builder(level);
    } else if (level.identifier === 'Shaft_DemoEnd') {
      // 사용자 결정 2026-05-16 — Shaft_DemoEnd 좌측 끝(x=18px, y=130px)에
      // Builder_Level_2 배치, y 방향 무한 왕복. 종료 시퀀스는 별도 LDtk
      // `EndingTrigger` entity 가 처리한다 — 이 함수는 빌더만 띄움.
      this.spawnDemoEndBuilder(level);
    } else if (level.identifier === 'Debug_Shaft_01') {
      this.spawnBuilder(level, 'patrol', 'Builder_Level_1');
    } else if (level.identifier === 'Debug_Shaft_2') {
      this.spawnBuilder(level, 'patrol', 'Builder_Level_1');
    }

    // HUD/minimap visibility — Shaft_DemoEnd 룸 안에서는 항상 가린다 (사용자
    // 결정 2026-05-17). 워프 등으로 다른 룸으로 빠지면 intro 완료(hudReady) 시점
    // 의 정상 가시성으로 복원한다.
    if (level.identifier === 'Shaft_DemoEnd') {
      this.hud.container.visible = false;
      if (this.minimap) this.minimap.visible = false;
    } else if (this.game.hudReady) {
      this.hud.container.visible = true;
      if (this.minimap) this.minimap.visible = true;
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

    // BGM dim — save 포인트 있는 룸은 음악을 잠시 0 으로 페이드 (사용자 결정 2026-05-08).
    // 진입: 800 ms 페이드 아웃. 떠남: 1500 ms 페이드 인.
    const isSaveRoom = this.savePoints.length > 0;
    if (isSaveRoom !== this.bgmDimmedForSaveRoom) {
      this.bgmDimmedForSaveRoom = isSaveRoom;
      BgmController.setVolumeFactor(isSaveRoom ? 0 : 1, isSaveRoom ? 800 : 1500);
    }

    return true;
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
      const isAlreadyUnlocked = this.unlockedEvents.has(doorKey);

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
      // 이미 unlocked 된 문 — spawn 직후 instant unlock 으로 caps(top/bottom) 만 남김.
      // collision 도 즉시 0 으로 되돌려 진행 막힘 없음.
      if (isAlreadyUnlocked) {
        door.unlock(this.collisionGrid, true);
      }
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
        rumbleGamepad(180, 0.6, 1.0);
        this.screenFlash.flashHit(true);
        this.toast.show(t('toast.gate_opened'), 0x44ffaa);
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
        rumbleGamepad(180, 0.6, 1.0);
        this.screenFlash.flashHit(true);
        this.toast.show(t('toast.gate_destroyed'), 0x44ffaa);
      } else if (result === 'rejected') {
        this.doorRejectSet.add(door.iid);
        this.game.camera.shake(2);
        // Stat door 만 stat 요구 toast — event/switch 는 shake 피드백만.
        if (door.unlockCondition === 'stat') {
          const threshold = door.statThreshold;
          const current = playerStats[door.statType] ?? 0;
          // Resolve stat name via i18n so KO reads "공격력" instead of "ATK".
          // Falls back to upper-cased type code if no translation key exists.
          const statKey = `stat.${door.statType.toLowerCase()}`;
          const statLabel = t(statKey);
          const statText = (statLabel === statKey) ? door.statType.toUpperCase() : statLabel;
          this.toast.show(t('toast.stat_gate_locked', { stat: statText, current: current, required: threshold }), 0xff4444);
        }
        break;
      }
    }
  }

  /**
   * Arc Tether 픽업 후보 탐색 — facing 방향 cone (반각 60°) × 최대 6 타일.
   * LOOK_UP / LOOK_DOWN 누른 채로 GRAB 하면 cone 이 위/아래로 회전 (stack/위층 픽업).
   * 인접 거리(< 24px)는 cone 밖이라도 무조건 후보로 채택 (기존 동작 호환).
   */
  private findNearestGrabbableContainer(): ThrowableContainer | null {
    return findNearestContainerForGrab({
      player: this.player,
      containers: this.containers,
      input: this.game.input,
    });
  }

  /**
   * Begin a tethered pull on `target`. Marks the container as held immediately
   * (suspends gravity + own collision), records spawn origin for lerp, and
   * triggers the arc VFX + zap SFX. The 200 ms ease-out lerp runs in the
   * held-position block of update().
   */
  private startGrabPull(target: ThrowableContainer): void {
    const state = startContainerGrabPull(target, this.arcTether);
    this.pullStartX = state.pullStartX;
    this.pullStartY = state.pullStartY;
    this.pullElapsedMs = state.pullElapsedMs;
    this.pullingContainer = state.pullingContainer;
    this.heldContainer = state.heldContainer;
  }

  /**
   * Drive arc tether visibility + phase per frame.
   *   - heldContainer + pullingContainer : pull (started by startGrabPull)
   *   - heldContainer + no pulling       : hold (thin tether + breathing pulse)
   *   - no held + hover target           : hover (small sparks above target)
   *   - none                              : hidden
   */
  private updateArcTether(dtMs: number): void {
    updateContainerArcTether({
      dtMs,
      player: this.player,
      arcTether: this.arcTether,
      heldContainer: this.heldContainer,
      pullingContainer: this.pullingContainer,
      findHover: () => this.findNearestGrabbableContainer(),
    });
  }

  private updateContainerPrompt(): void {
    this.containerPrompt = updateContainerPromptUi({
      game: this.game,
      prompt: this.containerPrompt,
      heldContainer: this.heldContainer,
      findTarget: () => this.findNearestGrabbableContainer(),
      promptText: t('prompt.lift'),
    });
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
        const a = 0.6 + Math.sin(Date.now() * 0.005) * 0.4;
        sp.gfx.alpha = a;
        if (sp.sprite) sp.sprite.alpha = a;
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
        if (sp.sprite) sp.sprite.alpha = 1.0;
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

  private queueSave(): void {
    if (this.saveQueued) return;
    this.saveQueued = true;
    this.saveDelayTimer = SAVE_INTERACT_DELAY_MS;
  }

  private updateQueuedSave(dt: number): void {
    if (!this.saveQueued) return;
    this.saveDelayTimer -= dt;
    if (this.saveDelayTimer > 0) return;

    this.saveQueued = false;
    this.saveDelayTimer = 0;
    this.performSave();
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
      completedTutorialHints: this.tutorialHint.getCompletedIds(),
    });
    this.toast.show(t('toast.game_saved'), 0x44ffaa);
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
        const prompt = KeyPrompt.createPrompt(actionKey(GameAction.ATTACK), t('prompt.talk'), this.game.uiScale);
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

    const addRuns = (
      dir: ExitGlowDir,
      count: number,
      isPassableAt: (i: number) => boolean,
      toWorld: (runStart: number, runLen: number) => { x: number; y: number; span: number },
    ) => {
      let i = 0;
      while (i < count) {
        if (!isPassableAt(i)) { i++; continue; }
        let j = i;
        while (j < count && isPassableAt(j)) j++;
        const { x, y, span } = toWorld(i, j - i);
        const glow = new ExitGlow(dir, x, y, span);
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
      );
    }
    // Left edge: column 0
    if (hasNeighbor('w')) {
      addRuns('left', H,
        (r) => passable(grid[r]?.[0]),
        (rs, rl) => ({ x: 0, y: rs * TS, span: rl * TS }),
      );
    }
    // Bottom edge: row H-1
    if (hasNeighbor('s')) {
      addRuns('down', W,
        (c) => passable(grid[H - 1]?.[c]),
        (cs, cl) => ({ x: cs * TS, y: H * TS, span: cl * TS }),
      );
    }
    // Top edge: row 0
    if (hasNeighbor('n')) {
      addRuns('up', W,
        (c) => passable(grid[0]?.[c]),
        (cs, cl) => ({ x: cs * TS, y: 0, span: cl * TS }),
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
    rumbleGamepad(160, 0.55, 1.0);
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

  /**
   * Per-frame tile hazard tick: TileMutator state + DOT on player & enemies.
   * Mirrors checkSpikeContact pattern but channels through TileHazards.applyTileHazards
   * so magma/charged/acid/fire/thunder/burn share one code path.
   *
   * GDD: Documents/System/System_World_TileSystem.md §2.6-2.13
   */
  private tickTileHazards(dt: number): void {
    const room = this.player.roomData;
    if (!room) return;

    // Advance frozen/burning/electric timers + oil-spread + passive interactions.
    this.tileMutator.tick(room, dt);

    // Tick burnable entities (Tier B) — flame VFX + burnRemainingMs countdown.
    // Destroyed ones are unregistered + removed from scene graph.
    for (let i = this.burnableProps.length - 1; i >= 0; i--) {
      const p = this.burnableProps[i];
      p.update(dt);
      if (p.destroyed) {
        // Drop ash remnant — only for props that were actually burnt out
        // (still had burn remaining when they reached 0). Floor/free anchors
        // leave ash; ceiling props (curtains, vines) vanish without remnant
        // because falling ash would clip mid-air without a hanger.
        if (p.spec.anchor !== 'ceiling') {
          const cx = p.x + p.width / 2;
          const baseY = p.y + p.height - 1;
          this.ashRemnant.spawn(cx, baseY, p.width);
        }
        this.tileMutator.unregisterBurnable(p);
        p.destroy();
        this.burnableProps.splice(i, 1);
      }
    }

    // Procedural grass clumps — fire ignition + chain to TILE_GRASS tiles.
    this.grassClumpFire.update(dt, this.tileMutator, this.collisionGrid, this.ashRemnant, 16);

    // BreakableProp ignition is driven by TileMutator.spreadOilFire (same
    // pipeline as BurnableProp / oil / wood / grass). Here we only handle
    // the burn-out → shatter/drop transition for props that finished burning.
    for (let i = this.breakableProps.length - 1; i >= 0; i--) {
      const bp = this.breakableProps[i];
      if (bp.destroyed) {
        this.tileMutator.unregisterBurnable(bp);
        this.breakableProps.splice(i, 1);
        continue;
      }
      if (bp.burnedOut) {
        this.tileMutator.unregisterBurnable(bp);
        this.destroyBreakablePropWithEffects(bp, 'fire');
        this.breakableProps.splice(i, 1);
      }
    }

    // Advance timed-fade ash remnants (grass clump leftovers fade out).
    this.ashRemnant.update(dt);

    // Render overlay for fire / ice / electric cell states.
    this.tileMutatorRenderer?.update(this.tileMutator, this.collisionGrid, dt);

    // Wall layer refresh — ice melted to water, wood/grass burned out, metal
    // corroded. rerenderTilemap reads the current collisionGrid and skips
    // tiles whose cell is now air or a fluid type (handled by LdtkRenderer).
    if (this.wallLayerDirty) {
      this.wallLayerDirty = false;
      this.rerenderTilemap();
      // New water cells (from ice melt) need a fluid body — rebuild from grid.
      this.fluidSystem.refreshFromGrid(this.collisionGrid);
    }

    // Player hazards (only when not already dead)
    if (this.player.hp > 0) {
      applyTileHazards(this.player, room, this.tileMutator, dt, {
        onDamage: (amount, src) => {
          if (this.player.invincible) return;
          const dmg = Math.max(1, Math.floor(amount));
          this.player.hp -= dmg;
          this.player.lastDamageSource = src;
          this.hud.flashDamage();
          this.dmgNumbers.spawn(
            this.player.x + this.player.width / 2,
            this.player.y - 8, dmg, src === 'thunder',
          );
          if (src === 'thunder') {
            this.game.camera.shake(6);
            this.game.hitstopFrames = 8;
            this.screenFlash.flashDamage(true);
          } else if (src === 'magma' || src === 'fire') {
            this.game.camera.shake(2);
          }
          if (this.player.hp <= 0) {
            this.player.hp = 0;
            this.player.onDeath();
            this.game.hitstopFrames = 8;
            this.screenFlash.flashDamage(true);
          }
        },
        onBurnApplied: () => this.player.triggerFlash(),
      });
      const waterfallType = this.fluidSpawners.queryFluidAtAabb(
        this.player.x, this.player.y, this.player.width, this.player.height, this.collisionGrid,
      );
      if (waterfallType === 'water') {
        this.player.extinguishFireDebuffs();
      } else if (waterfallType === 'acid' && !this.player.invincible) {
        let acc = this.player.acidTickAccum ?? 0;
        acc += dt;
        while (acc >= 100) {
          acc -= 100;
          const dmg = Math.max(1, Math.floor(this.player.maxHp * 0.005));
          this.player.hp -= dmg;
          this.player.lastDamageSource = 'acid';
          this.hud.flashDamage();
          this.dmgNumbers.spawn(this.player.x + this.player.width / 2, this.player.y - 8, dmg, false);
        }
        this.player.acidTickAccum = acc;
      } else if (waterfallType === 'magma') {
        const wasBurning = (this.player.burnRemainingMs ?? 0) > 0;
        this.player.burnRemainingMs = MAGMA_BURN_DURATION_MS;
        if (!wasBurning && !this.player.invincible) {
          const dmg = Math.max(1, Math.floor(this.player.maxHp * 0.10));
          this.player.hp -= dmg;
          this.player.lastDamageSource = 'magma';
          this.hud.flashDamage();
          this.dmgNumbers.spawn(this.player.x + this.player.width / 2, this.player.y - 8, dmg, false);
          this.game.camera.shake(2);
          this.player.triggerFlash();
        }
      } else if (waterfallType === 'cyro') {
        this.player.extinguishFireDebuffs();
        this.player.cyroSlowRemainingMs = CYRO_FROZEN_MS;
        let acc = this.player.cyroTickAccum ?? 0;
        acc += dt;
        while (acc >= CYRO_TICK_MS) {
          acc -= CYRO_TICK_MS;
          if (!this.player.invincible) {
            const dmg = Math.max(1, Math.floor(this.player.maxHp * CYRO_TICK_PCT));
            this.player.hp -= dmg;
            this.player.lastDamageSource = 'cyro';
            this.hud.flashDamage();
            this.dmgNumbers.spawn(this.player.x + this.player.width / 2, this.player.y - 8, dmg, false);
          }
        }
        this.player.cyroTickAccum = acc;
      }
      if (this.player.hp <= 0) {
        this.player.hp = 0;
        this.player.onDeath();
        this.game.hitstopFrames = 8;
        this.screenFlash.flashDamage(true);
      }
    }

    // Enemy hazards (every alive enemy). Element multiplier scales raw
    // amount per source. Multiplier 0 = immune (skip). Otherwise damage
    // is floored at 1 so tiny-maxHp enemies still take chip damage from
    // residue ticks (without the floor, maxHp×0.005 etc rounds to 0).
    // HP bar flashes + damage number floats on every applied tick so the
    // player sees the elemental damage land.
    for (const enemy of this.enemies) {
      if (!enemy.alive || enemy.hp <= 0) continue;
      applyTileHazards(enemy, room, this.tileMutator, dt, {
        onDamage: (amount, src) => {
          const mult = enemy.elementMultiplier(hazardToElement(src));
          if (mult <= 0) return; // immune
          const dmg = Math.max(1, Math.floor(amount * mult));
          enemy.hp -= dmg;
          enemy.showHpBarFlash();
          this.dmgNumbers.spawn(enemy.x + enemy.width / 2, enemy.y - 8, dmg, src === 'thunder');
          if (enemy.hp <= 0) { enemy.hp = 0; enemy.onDeath(); }
        },
      });
    }
  }

  /** Public accessor for attack hooks (Fire/Ice/Thunder enchants land in this mutator). */
  getTileMutator(): TileMutator { return this.tileMutator; }

  /**
   * DEBUG: ignite the player's feet cell + 4-neighbours. Tries every adjacent
   * cell so it works regardless of which side the player is touching the
   * flammable terrain (e.g. standing next to a grass patch).
   *
   * URL-gated: only callable when ?debug is present. Bound to KeyF.
   */
  /**
   * Compute the elemental attack hitbox AABB.
   * Covers player AABB expanded 8px each side + 24px sword reach in facing
   * direction. Vertical extension reaches the floor cell BELOW feet (so ice
   * underfoot is hit) and ceiling cell ABOVE head (Vine entities).
   */
  private getDebugAttackHitbox(): { ax: number; ay: number; aw: number; ah: number } {
    const reach = 24;
    const expand = 8;
    const ax = this.player.facingRight
      ? this.player.x - expand
      : this.player.x - expand - reach;
    return {
      ax,
      ay: this.player.y - expand,
      aw: this.player.width + expand * 2 + reach,
      ah: this.player.height + expand * 2 + 8, // extra +8 below so floor cells reliably hit
    };
  }

  /**
   * Per-shard container-hit test. Returns true if the shard at (x, y)
   * overlaps any container AABB. Applies takeAttack damage and breaks
   * the container on kill (BFS-paint via paintContainerImpact).
   */
  private checkShardContainerHit(x: number, y: number): boolean {
    for (let i = this.containers.length - 1; i >= 0; i--) {
      const c = this.containers[i];
      if (c.destroyed || c.held) continue;
      if (x < c.colX || x > c.colX + c.colW || y < c.colY || y > c.colY + c.colH) continue;
      // MetalCrate is immune to direct attack damage — only acid corrosion
      // (handled in tickEnvironment) can dissolve it. The shard still gets
      // "stuck" (return true) so it can be retrieved like any wall hit.
      if (c.kind === 'MetalCrate') {
        // R-NEW-054 Brittle Crate: ice/frozen 셀 위면 1 hit 즉파
        const lx = Math.floor(c.colX / 16);
        const rx = Math.floor((c.colX + c.colW - 1) / 16);
        const by = Math.floor((c.colY + c.colH - 1) / 16);
        let isBrittle = false;
        for (let gx = lx; gx <= rx; gx++) {
          const below = this.collisionGrid[by + 1]?.[gx];
          if (below === 7 /* ice */ || this.tileMutator.isFrozen(gx, by + 1)) {
            isBrittle = true; break;
          }
        }
        if (isBrittle) {
          const impact = c.shatterBrittle();
          this.hitSparks.spawn(c.colX + c.colW / 2, c.colY + c.colH / 2, true, 0);
          if (impact) {
            this.destroyContainerWithVFX(c);
            this.containers.splice(i, 1);
          }
          return true;
        }
        this.hitSparks.spawn(c.colX + c.colW / 2, c.colY + c.colH / 2, true, 0);
        return true;
      }
      const impact = c.takeAttack(Math.max(2, Math.floor(this.player.atk * 0.6)));
      this.hitSparks.spawn(c.colX + c.colW / 2, c.colY + c.colH / 2, true, 0);
      if (impact) {
        this.paintContainerImpact(c.kind, impact.gx, impact.gy, c.fluidVolume);
        this.destroyContainerWithVFX(c);
        this.containers.splice(i, 1);
      }
      return true;
    }
    return false;
  }

  /**
   * Per-shard enemy-hit test. Returns true if the shard at (x, y) overlaps
   * a living enemy's AABB — manager then transitions the shard to STUCK.
   * Damage + element status applied immediately. Killing an enemy with a
   * lodged shard auto-retrieves all shards inside its bounding box (Hades
   * Bloodstone return-on-kill).
   */
  private checkShardEnemyHit(x: number, y: number, element: ShardElement): boolean {
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (x < e.x || x > e.x + e.width || y < e.y || y > e.y + e.height) continue;
      // Element multiplier applies to BOTH the base shard hit damage and to
      // the element-specific status (fire-affined enemies ignore Burn, ice-
      // affined ignore Freeze, thunder-affined ignore chain pulse).
      const elemMult = e.elementMultiplier(element as ElementAffinity);
      const baseDmg = Math.max(1, Math.floor(this.player.atk * 0.6 * elemMult));
      if (elemMult > 0) e.hp -= baseDmg;
      e.onHit(this.player.facingRight ? 60 : -60, -40, 160);
      this.dmgNumbers.spawn(e.x + e.width / 2, e.y - 8, baseDmg, false);
      this.hitSparks.spawn(x, y, false, 0);
      // Element side-effects — gated by multiplier > 0.
      if (element === 'fire' && elemMult > 0) {
        e.burnRemainingMs = Math.max(e.burnRemainingMs ?? 0, 8000);
      } else if (element === 'ice' && elemMult > 0) {
        // 2s 정식 빙결 — AI tick 중지 + vx=0 + 푸른 tint (Enemy.frozenRemainingMs).
        e.frozenRemainingMs = Math.max(e.frozenRemainingMs ?? 0, 2000);
      } else if (element === 'thunder' && elemMult > 0) {
        // 즉발 추가 데미지 + 적의 위치 셀이 도체 풀(water/metal/acid) 이면
        // flood-fill thunder chain 트리거 — 단일 표적이 풀 위에 서있을 때
        // 풀 전체 점등이라는 대형 시너지로 이어짐.
        e.hp -= Math.max(1, Math.floor(this.player.atk * 0.4 * elemMult));
        const room = this.player.roomData;
        if (room) {
          // 2×2 corner-snap centered on enemy AABB center — keeps thunder
          // chain footprint consistent with shard impact (2×2 cells).
          const ax = Math.round((e.x + e.width / 2) / 16);
          const ay = Math.round((e.y + e.height / 2) / 16);
          const chainCells: Array<[number, number]> = [
            [ax - 1, ay - 1], [ax, ay - 1],
            [ax - 1, ay],     [ax, ay],
          ];
          for (const [nx, ny] of chainCells) {
            if (this.tileMutator.isElectric(nx, ny)) continue;
            this.tileMutator.applyThunderChain(room, nx, ny);
          }
        }
      }
      if (e.hp <= 0) {
        e.hp = 0;
        e.onDeath();
        // Auto-retrieve any lodged shards inside the dying enemy's AABB.
        const got = this.egoShard.retrieveInAABB(e.x, e.y, e.width, e.height);
        if (got > 0) {
          this.player.egoShardCount = Math.min(this.player.egoShardCount + got, 99);
        }
      }
      return true;
    }
    return false;
  }

  /**
   * Common container break VFX/SFX — propShatter chunks + breakable sound
   * + small camera shake. Mirrors the existing BreakableProp destruction
   * routine so containers feel like the same family.
   */
  /**
   * Thrown containers deal a single impact hit on first contact with any
   * living enemy AABB. Triggered when the container is `wasThrown` and has
   * meaningful kinetic velocity (so a sitting crate that happens to touch
   * an enemy doesn't pop). Damage scales like a normal sword strike; the
   * MetalCrate gets a 1.8× bonus (no paint, heavy-steel trade). Bosses
   * take damage but skip stun (super-armor preserved).
   */
  private checkThrownContainerEnemyHit(): void {
    for (let i = this.containers.length - 1; i >= 0; i--) {
      const c = this.containers[i];
      if (c.destroyed || c.held) continue;
      if (!c.wasThrown || c.hasDealtImpact) continue;
      // Velocity gate — keep low-energy contact (e.g. a crate barely
      // sliding over a stunned enemy) from auto-popping the throw.
      if (Math.abs(c.vx) < 60 && c.vy < 80) continue;
      const ax = c.colX, ay = c.colY, aw = c.colW, ah = c.colH;
      for (const e of this.enemies) {
        if (!e.alive) continue;
        if (ax + aw <= e.x || ax >= e.x + e.width) continue;
        if (ay + ah <= e.y || ay >= e.y + e.height) continue;
        const baseDmg = Math.max(2, Math.floor(this.player.atk));
        const mult = c.kind === 'MetalCrate' ? 1.8 : 1.0;
        const dmg = Math.max(1, Math.floor(baseDmg * mult));
        e.hp -= dmg;
        const dir = c.vx >= 0 ? 1 : -1;
        // Bosses keep super-armor (no stun), but still take damage and
        // a soft knockback that respects the throw direction.
        const isBoss = (e as any)._isBoss === true;
        if (isBoss) {
          e.onHit(dir * 60, -40, 0);
        } else {
          e.onHit(dir * 220, -160, 400);
        }
        this.dmgNumbers.spawn(e.x + e.width / 2, e.y - 8, dmg, c.kind === 'MetalCrate');
        this.hitSparks.spawn(ax + aw / 2, ay + ah / 2, true, 0);
        if (e.hp <= 0) {
          e.hp = 0;
          e.onDeath();
        }
        c.hasDealtImpact = true;
        // Paint + destroy the container at the hit point.
        const impactGx = Math.floor((ax + aw / 2) / 16);
        const impactGy = Math.floor((ay + ah / 2) / 16);
        if (c.spec.paintTile !== 0 && c.fluidVolume > 0) {
          this.paintContainerImpact(c.kind, impactGx, impactGy, c.fluidVolume);
        }
        this.destroyContainerWithVFX(c);
        this.containers.splice(i, 1);
        break;
      }
    }
  }

  /**
   * Maintained-spawner refill pass. For every spawner with Maintain=true,
   * count live containers inside its rect and emit shortfall back up to
   * minCount when the player destroys boxes. Throttled by MAINTAIN_CHECK_MS
   * so we don't recompute every frame.
   */
  private tickMaintainedSpawners(dtMs: number): void {
    if (this.maintainedSpawners.length === 0) return;
    for (const ms of this.maintainedSpawners) {
      ms.checkAccum += dtMs;
      if (ms.checkAccum < LdtkWorldScene.MAINTAIN_CHECK_MS) continue;
      ms.checkAccum = 0;

      // Prune destroyed containers from the owned set. `owned.length` after
      // this is the spawner's current spawn count.
      for (let i = ms.owned.length - 1; i >= 0; i--) {
        if (ms.owned[i].destroyed) ms.owned.splice(i, 1);
      }
      // Refill rule (user spec): only when *all* owned containers are gone.
      // Partial losses are left alone so destroying one box doesn't force
      // an immediate replacement.
      if (ms.owned.length > 0) continue;

      // Build occupancy map of all live containers globally so the refill
      // placement doesn't collide with boxes outside the rect either.
      const occupiedCells = new Set<string>();
      for (const c of this.containers) {
        if (c.destroyed) continue;
        const gx0 = Math.floor(c.x / 16);
        const gx1 = Math.floor((c.x + c.spec.width - 1) / 16);
        const gy0 = Math.floor(c.y / 16);
        const gy1 = Math.floor((c.y + c.spec.height - 1) / 16);
        for (let gy = gy0; gy <= gy1; gy++) {
          for (let gx = gx0; gx <= gx1; gx++) occupiedCells.add(`${gx},${gy}`);
        }
      }

      // Non-deterministic refill seed so successive depletions don't land
      // in identical spots.
      const refillSeed = ms.seed >= 0
        ? (ms.seed ^ ((performance.now() | 0) >>> 0))
        : ((performance.now() | 0) >>> 0);
      // Refill batch size = minCount~maxCount (matches the initial spawn
      // distribution — "keep min" semantically guaranteed, max as ceiling).
      const refilled = runContainerSpawner({
        rect: ms.rect,
        collisionGrid: this.collisionGrid,
        existing: this.containers,
        occupiedCells,
        pool: ms.pool,
        minCount: ms.minCount,
        maxCount: ms.maxCount,
        bias: ms.bias,
        seed: refillSeed,
        avoidEntity: ms.avoidEntity,
        fluidVolumeOverride: ms.fluidVolumeOverride,
      });
      if (refilled.length === 0) continue;
      const isContainerSolidCell = (gx: number, gy: number): boolean => {
        const t = this.collisionGrid[gy]?.[gx] ?? 0;
        return t === 1 || t === 3 || t === 7 || t === 9 || t === 12 || t === 15;
      };
      for (const c of refilled) {
        this.containers.push(c);
        this.entityLayer.addChild(c.container);
        if (!c.skipSettle) c.settleAtSpawn(isContainerSolidCell, this.containers);
        ms.owned.push(c);
      }
    }
  }

  private destroyContainerWithVFX(c: ThrowableContainer): void {
    this.propShatter.spawn(
      c.x, c.y, c.spec.width, c.spec.height,
      c.getShatterColor(), c.getShatterAccent(),
      c.getShatterTexture(),
    );
    SFX.play('breakable_destroy', 0, { speed: 1 / (1 + Math.random() * 0.5) });
    this.game.hitstopFrames += 3;
    this.game.camera.shake(2);
    c.destroy();
  }

  /**
   * Resolve container ↔ container overlaps. When two containers occupy the
   * same pixel space, push them apart along the smaller penetration axis.
   * Runs after player push so a pushed crate can shove another crate.
   */
  private resolveContainerContainerCollision(): void {
    const cs = this.containers;
    for (let i = 0; i < cs.length; i++) {
      const a = cs[i];
      if (a.destroyed || a.held) continue;
      for (let j = i + 1; j < cs.length; j++) {
        const b = cs[j];
        if (b.destroyed || b.held) continue;
        // Use collision rects (inset-aware), not sprite frames.
        const ax0 = a.colX, ay0 = a.colY, ax1 = a.colX + a.colW, ay1 = a.colY + a.colH;
        const bx0 = b.colX, by0 = b.colY, bx1 = b.colX + b.colW, by1 = b.colY + b.colH;
        if (ax1 <= bx0 || ax0 >= bx1 || ay1 <= by0 || ay0 >= by1) continue;
        const overlapL = ax1 - bx0;
        const overlapR = bx1 - ax0;
        const aCenter = ax0 + (ax1 - ax0) / 2;
        const bCenter = bx0 + (bx1 - bx0) / 2;
        if (aCenter <= bCenter) {
          const ax = a.x - overlapL * 0.5;
          const bx = b.x + overlapL * 0.5;
          if (this.canContainerOccupyX(a, ax, b)) a.x = ax; else a.vx = 0;
          if (this.canContainerOccupyX(b, bx, a)) b.x = bx; else b.vx = 0;
        } else {
          const ax = a.x + overlapR * 0.5;
          const bx = b.x - overlapR * 0.5;
          if (this.canContainerOccupyX(a, ax, b)) a.x = ax; else a.vx = 0;
          if (this.canContainerOccupyX(b, bx, a)) b.x = bx; else b.vx = 0;
        }
        a.container.x = a.x; a.container.y = a.y;
        b.container.x = b.x; b.container.y = b.y;
      }
    }
  }

  /**
   * Resolve player AABB vs every container AABB. Smallest penetration axis
   * decides: horizontal contact pushes the container (passing the player's
   * vx through) or stops the player; vertical contact lets the player stand
   * on top or get bonked from below.
   */
  /**
   * Mirror of resolvePlayerContainerCollision for every alive enemy. Enemies
   * are blocked / stacked on containers exactly like the player, but cannot
   * push containers (passive interaction — only the player has hands). No
   * impact damage either: thrown-container damage is handled separately by
   * checkThrownContainerEnemyHit. Enemies that would clip into a container
   * from below push the container UP, mirroring the bury-fix on player.
   */
  private resolveEnemyContainerCollision(): void {
    for (const e of this.enemies) {
      if (!e.alive) continue;
      for (const c of this.containers) {
        if (c.destroyed || c.held) continue;
        const cx0 = c.colX, cy0 = c.colY, cx1 = c.colX + c.colW, cy1 = c.colY + c.colH;
        const ex0 = e.x, ey0 = e.y, ex1 = e.x + e.width, ey1 = e.y + e.height;
        if (ex1 <= cx0 || ex0 >= cx1 || ey1 <= cy0 || ey0 >= cy1) continue;
        const overlapLeft   = ex1 - cx0;
        const overlapRight  = cx1 - ex0;
        const overlapTop    = ey1 - cy0;
        const overlapBottom = cy1 - ey0;
        const min = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
        if (min === overlapTop) {
          e.y = cy0 - e.height;
          if (e.vy > 0) e.vy = 0;
        } else if (min === overlapBottom) {
          c.y -= overlapBottom;
          if (c.vy > 0) c.vy = 0;
          c.container.x = c.x;
          c.container.y = c.y;
          if (e.vy < 0) e.vy = 0;
        } else if (min === overlapLeft) {
          e.x = cx0 - e.width;
          if (e.vx > 0) e.vx = 0;
        } else if (min === overlapRight) {
          e.x = cx1;
          if (e.vx < 0) e.vx = 0;
        }
      }
    }
  }

  /**
   * Would the container's collision rect overlap a solid IntGrid cell if
   * its sprite origin were placed at `newX` (Y unchanged)? Used by the
   * player-push + container-↔-container resolvers to gate horizontal
   * movement, preventing crates from tunneling through walls.
   */
  private canContainerOccupyX(c: ThrowableContainer, newX: number, ignore: ThrowableContainer | null = null): boolean {
    const inset = c.spec.collisionInset;
    const colX = newX + inset.left;
    const colW = c.colW;
    const colY = c.colY;
    const colH = c.colH;
    const lgx = Math.floor(colX / 16);
    const rgx = Math.floor((colX + colW - 1) / 16);
    const tgy = Math.floor(colY / 16);
    const bgy = Math.floor((colY + colH - 1) / 16);
    for (let gy = tgy; gy <= bgy; gy++) {
      for (let gx = lgx; gx <= rgx; gx++) {
        const t = this.collisionGrid[gy]?.[gx] ?? 0;
        if (t === 1 || t === 3 || t === 7 || t === 9 || t === 12 || t === 15) return false;
      }
    }
    for (const o of this.containers) {
      if (o === c || o === ignore || o.destroyed || o.held) continue;
      if (colX + colW <= o.colX || colX >= o.colX + o.colW) continue;
      if (colY + colH <= o.colY || colY >= o.colY + o.colH) continue;
      return false;
    }
    return true;
  }

  private resolvePlayerContainerCollision(): void {
    const p = this.player;
    for (const c of this.containers) {
      if (c.destroyed || c.held) continue;
      // Use container's collision rect (sprite frame minus inset).
      const cx0 = c.colX, cy0 = c.colY, cx1 = c.colX + c.colW, cy1 = c.colY + c.colH;
      const px0 = p.x, py0 = p.y, px1 = p.x + p.width, py1 = p.y + p.height;
      if (px1 <= cx0 || px0 >= cx1 || py1 <= cy0 || py0 >= cy1) continue;
      const overlapLeft   = px1 - cx0;
      const overlapRight  = cx1 - px0;
      const overlapTop    = py1 - cy0;
      const overlapBottom = cy1 - py0;
      const min = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
      if (min === overlapTop) {
        // Stand on physical top of the container (= cy0).
        p.y = cy0 - p.height;
        if (p.getVy() > 0) p.vy = 0;
        p.forceGrounded();
      } else if (min === overlapBottom) {
        // Container pressed down onto player head — push container UP.
        c.y -= overlapBottom;
        if (c.vy > 0) c.vy = 0;
        c.container.x = c.x;
        c.container.y = c.y;
        if (p.getVy() < 0) p.vy = 0;
      } else if (min === overlapLeft) {
        if (Math.abs(p.getVx()) > 20) {
          const newX = c.x + Math.max(0, overlapLeft - 1);
          if (this.canContainerOccupyX(c, newX)) {
            c.x = newX;
            c.container.x = c.x;
          }
        }
        p.x = cx0 - p.width;
      } else if (min === overlapRight) {
        if (Math.abs(p.getVx()) > 20) {
          const newX = c.x - Math.max(0, overlapRight - 1);
          if (this.canContainerOccupyX(c, newX)) {
            c.x = newX;
            c.container.x = c.x;
          }
        }
        p.x = cx1;
      }
    }
  }

  /**
   * Apply container splash paint: fill a small cell radius around the impact
   * point with the container's fluid type. Cells that are currently solid
   * (wall/wood/metal) are not painted — only AIR cells flip.
   */
  private paintContainerImpact(kind: ContainerKind, gx: number, gy: number, quantity: number): void {
    const grid = this.collisionGrid;
    const tile: number = (() => {
      switch (kind) {
        case 'OilDrum':       return 11;
        case 'WaterBarrel':   return 2;
        case 'MagmaCrucible': return 6;
        case 'AcidVial':      return 13;
        case 'ChargedCrate':  return 8;
        case 'ChargedCell':   return 8;
        case 'CyroCanister':  return 20;
        case 'Crate':         return 0;
        case 'MetalCrate':    return 0;
      }
    })();
    if (tile > 0 && quantity > 0) {
      this.paintFluidSplash(grid, gx, gy, tile, quantity);
      this.containerFluidDirty = true;
    }
    if (kind === 'MagmaCrucible') {
      this.steamPuff.spawn((gx + 0.5) * 16, (gy + 0.5) * 16, 1.6);
    }
    // R-NEW-011 Impact Solidification: WaterBarrel + magma → WALL 굳음
    if (kind === 'WaterBarrel') {
      let solidified = 0;
      for (let dy2 = -1; dy2 <= 1; dy2++) {
        for (let dx2 = -1; dx2 <= 1; dx2++) {
          const nx = gx + dx2, ny = gy + dy2;
          if (grid[ny]?.[nx] === 6) {
            grid[ny][nx] = 1;
            this.tileMutator.onWallTileChanged?.(nx, ny, 6);
            solidified++;
          }
        }
      }
      if (solidified > 0) {
        this.steamPuff.spawn((gx + 0.5) * 16, (gy + 0.5) * 16, 2.0);
        this.game.camera.shake(4);
        this.containerFluidDirty = true;
      }
    }
    // R-NEW-012 Acid Container Chain: AcidVial + 2-tile radius 컨테이너 가속
    if (kind === 'AcidVial') {
      const reachSq = 32 * 32;
      const cx = (gx + 0.5) * 16;
      const cy = (gy + 0.5) * 16;
      for (const other of this.containers) {
        if (other.destroyed) continue;
        const dx = (other.colX + other.colW / 2) - cx;
        const dy = (other.colY + other.colH / 2) - cy;
        if (dx * dx + dy * dy < reachSq) {
          other.acidExposureMs += 1000;
        }
      }
    }
  }

  private flushContainerFluidChanges(): void {
    if (!this.containerFluidDirty) return;
    this.containerFluidDirty = false;
    this.fluidSystem.refreshFromGrid(this.collisionGrid);
    this.rerenderTilemap();
  }

  /**
   * BFS-flood paint up to `quantity` cells starting from (sx, sy). Cells
   * that get overwritten:
   *   air(0) · grass(16) · existing fluids (water/oil/acid/magma)
   * Solid cells (wall/ice/breakable/metal/wood) block both paint and
   * expansion — natural splash bounded by terrain. Painting magma over
   * flammable neighbours immediately ignites them so the user sees fire
   * rather than waiting for the slower 600ms passive spread tick.
   */
  private paintFluidSplash(grid: number[][], sx: number, sy: number, tile: number, quantity: number): void {
    if (quantity <= 0) return;
    const W = grid[0]?.length ?? 0;
    if (!W) return;
    const isPaintable = (t: number) =>
      t === 0 || t === 16 || t === 2 || t === 6 || t === 8 || t === 11 || t === 13 || t === 20;
    const key = (x: number, y: number) => y * W + x;
    const visited = new Set<number>();
    const queue: Array<[number, number]> = [[sx, sy]];
    visited.add(key(sx, sy));
    let painted = 0;
    const paintedCells: Array<[number, number]> = [];
    while (queue.length > 0 && painted < quantity) {
      const [x, y] = queue.shift()!;
      const row = grid[y];
      if (!row) continue;
      const t = row[x] ?? -1;
      if (isPaintable(t)) {
        row[x] = tile;
        painted++;
        paintedCells.push([x, y]);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy;
          const k = key(nx, ny);
          if (!visited.has(k)) {
            visited.add(k);
            queue.push([nx, ny]);
          }
        }
      }
    }
    // Magma paint → immediately ignite adjacent flammable cells so the
    // user sees a chain reaction the same frame the container breaks.
    if (tile === 6) {
      for (const [px, py] of paintedCells) {
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          this.tileMutator.tryIgnite(grid, px + dx, py + dy);
        }
      }
    }
  }

  /**
   * Debug helper — spawn a few containers near the player for testing.
   * Bound to Shift+G via debug input until LDtk Entity spawning is wired.
   */
  private debugSpawnContainers(): void {
    const baseX = Math.floor(this.player.x / 16) * 16 + 32;
    const baseY = Math.floor(this.player.y / 16) * 16;
    const kinds: ContainerKind[] = ['OilDrum', 'WaterBarrel', 'MagmaCrucible', 'AcidVial'];
    for (let i = 0; i < kinds.length; i++) {
      const c = new ThrowableContainer(kinds[i], baseX + i * 20, baseY);
      this.containers.push(c);
      this.entityLayer.addChild(c.container);
    }
  }

  /**
   * Ego Shard impact dispatcher — runs the element's effect at the impact
   * point. Damage footprint = 2×2 cells whose shared corner is nearest to
   * the impact pixel (nearest-corner snap). Compact, picks the most-likely
   * intended 4 cells without overshooting into unrelated terrain.
   */
  private onEgoShardImpact(px: number, py: number, element: ShardElement): void {
    const room = this.player.roomData;
    if (!room) return;
    const ax = Math.round(px / 16);   // grid corner nearest the impact pixel
    const ay = Math.round(py / 16);
    const cells: Array<[number, number]> = [
      [ax - 1, ay - 1], [ax, ay - 1],
      [ax - 1, ay],     [ax, ay],
    ];
    if (element === 'fire') {
      const fireHitSize = 24;
      const fireHalf = fireHitSize / 2;
      const fireCells: Array<[number, number]> = [];
      this.forEachCellInAABB(px - fireHalf, py - fireHalf, fireHitSize, fireHitSize, (gx, gy) => {
        if (room[gy]?.[gx] === undefined) return;
        fireCells.push([gx, gy]);
      });
      for (const [gx, gy] of fireCells) {
        const t = (room[gy]?.[gx] ?? 0);
        if (t === 7 /* ice */) this.tileMutator.tryMeltIce(room, gx, gy);
        else if (t === 2 /* water */ && room[gy]) {
          room[gy][gx] = 0;
          this.fluidSystem.removeCell(gx, gy);
          this.steamPuff.spawn((gx + 0.5) * 16, (gy + 0.5) * 16, 1.2);
        } else if (t === 13 /* acid */ && room[gy]) {
          // R-NEW-003 Toxic Acid Flash
          room[gy][gx] = 0;
          this.fluidSystem.removeCell(gx, gy);
          this.steamPuff.spawn((gx + 0.5) * 16, (gy + 0.5) * 16, 1.4, PUFF_TINT_TOXIC);
        } else if (t === 6 /* magma */ && room[gy]) {
          // R-NEW-020 Magma Surge
          const ns: Array<[number, number]> = [[gx + 1, gy], [gx - 1, gy], [gx, gy + 1], [gx, gy - 1]];
          for (const [nx, ny] of ns) {
            if ((room[ny]?.[nx] ?? -1) === 0 && Math.random() < 0.40) {
              room[ny][nx] = 6;
            }
          }
          this.fluidSystem.refreshFromGrid(this.collisionGrid);
        } else if (t === 12 /* metal */) {
          // R-NEW-019 Heat Metal: metal cell 유지 + 4s fire overlay
          this.tileMutator.tryIgniteOverlayOnly(gx, gy, 4000);
        } else {
          this.tileMutator.tryIgnite(room, gx, gy);
        }
      }
      // Residue ignite box matches the 2×2 cell footprint, anchored at the
      // snap corner so it's centered exactly on the same 4 cells.
      this.fluidResidue.ignite(px - fireHalf, py - fireHalf, fireHitSize, fireHitSize);
      // BreakableProp ignition happens inside `tryIgnite` above (BreakableProp
      // is registered as IgnitableEntity, same path as BurnableProp).
      // Procedural grass clumps inside the impact cells → direct ignite
      // (clumps are NOT TileMutator-registered yet — separate fire system).
      if (fireCells.length > 0) {
        let minGx = fireCells[0][0], maxGx = fireCells[0][0];
        let minGy = fireCells[0][1], maxGy = fireCells[0][1];
        for (const [gx, gy] of fireCells) {
          minGx = Math.min(minGx, gx);
          maxGx = Math.max(maxGx, gx);
          minGy = Math.min(minGy, gy);
          maxGy = Math.max(maxGy, gy);
        }
        this.grassClumpFire.igniteInCellAABB(minGx, minGy, maxGx, maxGy);
      }
    } else if (element === 'ice') {
      for (const [gx, gy] of cells) {
        const t = (room[gy]?.[gx] ?? 0);
        if (t === 12 /* metal */) this.tileMutator.tryFreezeMetal(room, gx, gy);
        else this.tileMutator.tryFreeze(room, gx, gy);
      }
    } else if (element === 'thunder') {
      for (const [gx, gy] of cells) {
        const t = (room[gy]?.[gx] ?? 0);
        if (t === 6 /* magma */) {
          // R-NEW-018 Magma Detonation
          this.steamPuff.spawn((gx + 0.5) * 16, (gy + 0.5) * 16, 2.0, PUFF_TINT_PLASMA);
          this.game.camera.shake(4);
          this.tileMutator.applyThunderChain(room, gx, gy);
          continue;
        }
        if (t === 7 /* ice */ && room[gy]) {
          // R-NEW-022 Shatter Pulse
          room[gy][gx] = 0;
          this.tileMutator.clearFrozen(gx, gy);
          this.steamPuff.spawn((gx + 0.5) * 16, (gy + 0.5) * 16, 1.4);
          this.game.camera.shake(2);
          continue;
        }
        if (this.tileMutator.isElectric(gx, gy)) continue;
        this.tileMutator.applyThunderChain(room, gx, gy);
      }
    }
  }

  /** Iterate every grid cell overlapped by an AABB. */
  private forEachCellInAABB(
    ax: number, ay: number, aw: number, ah: number,
    cb: (gx: number, gy: number) => void,
  ): void {
    const lx = Math.floor(ax / 16);
    const rx = Math.floor((ax + aw - 1) / 16);
    const ty = Math.floor(ay / 16);
    const by = Math.floor((ay + ah - 1) / 16);
    for (let gy = ty; gy <= by; gy++) {
      for (let gx = lx; gx <= rx; gx++) cb(gx, gy);
    }
  }

  /**
   * DEBUG Shift+1 — Fire enchant attack. Sweeps the hitbox AABB:
   *   - oil/wood/grass cell → ignite (cascading via TileMutator)
   *   - ice cell → melt to water (permanent)
   *   - water cell → steam (cell → AIR)
   *   - BurnableProp footprint → ignite entity (via tryIgnite fallback)
   */
  private debugIgniteAtPlayer(): void {
    const room = this.player.roomData;
    if (!room) return;
    const hb = this.getDebugAttackHitbox();
    let actions = 0;
    this.forEachCellInAABB(hb.ax, hb.ay, hb.aw, hb.ah, (gx, gy) => {
      const tile = getTile(room, gx, gy);
      if (isIce(tile)) {
        if (this.tileMutator.tryMeltIce(room, gx, gy)) actions++;
      } else if (isWater(tile)) {
        if (room[gy]) {
          room[gy][gx] = TILE_AIR;
          this.fluidSystem.removeCell(gx, gy); // sync fluid body
          this.steamPuff.spawn((gx + 0.5) * 16, (gy + 0.5) * 16, 1.2);
          actions++;
        }
      } else {
        // flammable tile OR BurnableProp footprint
        if (this.tileMutator.tryIgnite(room, gx, gy)) actions++;
      }
    });
    // Fire on oil residue → ignite the blot. Blots burn in place + emit fire DOT.
    const igniteN = this.fluidResidue.ignite(hb.ax, hb.ay, hb.aw, hb.ah);
    actions += igniteN;
    // eslint-disable-next-line no-console
    Debug.log(
      `[DebugFire] hitbox=(${hb.ax},${hb.ay},${hb.aw},${hb.ah}) actions=${actions} burning=${this.tileMutator.burningCount} residueIgnited=${igniteN}`,
    );
    this.toast.show(`fire: ${actions}`, 0xff8844);
  }

  /**
   * DEBUG Shift+2 — Ice enchant attack. Sweeps the hitbox AABB:
   *   - water/magma cell → freeze 15s (temp wall)
   */
  private debugFreezeAtPlayer(): void {
    const room = this.player.roomData;
    if (!room) return;
    const hb = this.getDebugAttackHitbox();
    let frozen = 0;
    this.forEachCellInAABB(hb.ax, hb.ay, hb.aw, hb.ah, (gx, gy) => {
      if (this.tileMutator.tryFreeze(room, gx, gy)) frozen++;
    });
    // eslint-disable-next-line no-console
    Debug.log(
      `[DebugIce] hitbox=(${hb.ax},${hb.ay},${hb.aw},${hb.ah}) frozen=${frozen} total=${this.tileMutator.frozenCount}`,
    );
    this.toast.show(`ice: ${frozen}`, 0x88ccff);
  }

  /**
   * DEBUG Shift+3 — Thunder enchant attack. Sweeps the hitbox AABB:
   *   - For each conductor cell (water/metal/acid) not yet electric,
   *     flood-fill connected conductor body. Multiple disconnected pools
   *     in the hitbox all get lit. Per-pulse damage handled by TileHazards
   *     transition detection (prevInElectric).
   */
  private debugThunderAtPlayer(): void {
    const room = this.player.roomData;
    if (!room) return;
    const hb = this.getDebugAttackHitbox();
    let totalLit = 0;
    this.forEachCellInAABB(hb.ax, hb.ay, hb.aw, hb.ah, (gx, gy) => {
      if (this.tileMutator.isElectric(gx, gy)) return;
      totalLit += this.tileMutator.applyThunderChain(room, gx, gy);
    });
    // eslint-disable-next-line no-console
    Debug.log(
      `[DebugThunder] hitbox=(${hb.ax},${hb.ay},${hb.aw},${hb.ah}) lit=${totalLit} electric=${this.tileMutator.electricCount}`,
    );
    this.toast.show(`thunder: ${totalLit}`, 0xffee44);
  }

  /** IntGrid void (value 10) -- fade out/in, return to last safe ground. */
  private voidCooldown = 0;

  private checkVoidContact(): void {
    if (this.voidDropActive || this.voidCooldown > 0 || this.player.hp <= 0) return;
    if (!isInVoid(this.player.x, this.player.y, this.player.width, this.player.height, this.player.roomData)) return;

    this.voidDropActive = true;
    this.voidReturnLevelId = this.currentLevel?.identifier ?? this.playerSpawnLevelId;
    this.voidReturnX = this.player.lastSafeX;
    this.voidReturnY = this.player.lastSafeY;
    this.voidFadePhase = 'out';
    this.voidFadeTimer = 0;
    this.voidInputLockMs = VOID_INPUT_LOCK_MS;
    this.voidTeleported = false;
    this.fadeOverlay.alpha = 0;
    // Soft input lock — player loses control immediately, but every other
    // system (camera, fluid, particles, enemies) keeps simulating.
    this.game.input.inputLocked = true;
  }

  /**
   * Snap the player to last safe ground + (re)load level if it differs.
   * Forces a landed pose so the reveal doesn't show the player floating.
   */
  private performVoidTeleport(): void {
    const sameLevel = this.currentLevel?.identifier === this.voidReturnLevelId;
    if (!sameLevel) {
      this.loadLevel(this.voidReturnLevelId, 'down');
    }
    this.player.x = this.voidReturnX;
    this.player.y = this.voidReturnY;
    this.player.lastSafeX = this.voidReturnX;
    this.player.lastSafeY = this.voidReturnY;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.roomData = this.collisionGrid;
    this.player.savePrevPosition();
    this.player.forceGrounded(); // sticky-grounded for this + next frame
    // FSM nudge so the reveal frame shows idle/land pose, not 'fall'.
    if ((this.player.fsm as any).currentState !== 'idle') {
      try { (this.player.fsm as any).transition('idle'); } catch {}
    }
    this.game.camera.snap(
      this.player.x + this.player.width / 2,
      this.player.y + this.player.height / 2,
    );
  }

  private updateVoidFade(dt: number): void {
    if (this.voidInputLockMs > 0) this.voidInputLockMs = Math.max(0, this.voidInputLockMs - dt);
    this.voidFadeTimer += dt;

    if (this.voidFadePhase === 'out') {
      const t = Math.min(1, this.voidFadeTimer / VOID_FADE_OUT_DURATION);
      this.fadeOverlay.alpha = t;
      if (t >= 1) {
        // Teleport at the moment of full black — player + scene swap is
        // invisible to the user. forceGrounded keeps the reveal landed.
        if (!this.voidTeleported) {
          this.performVoidTeleport();
          this.voidTeleported = true;
        }
        this.voidFadePhase = 'hold';
        this.voidFadeTimer = 0;
      }
    } else if (this.voidFadePhase === 'hold') {
      this.fadeOverlay.alpha = 1;
      // Keep stamping forceGrounded so player FSM doesn't fall mid-hold
      // (gravity would have already been integrated this frame).
      this.player.forceGrounded();
      if (this.voidFadeTimer >= VOID_HOLD_DURATION) {
        this.voidFadePhase = 'in';
        this.voidFadeTimer = 0;
      }
    } else if (this.voidFadePhase === 'in') {
      const t = Math.min(1, this.voidFadeTimer / VOID_FADE_IN_DURATION);
      this.fadeOverlay.alpha = 1 - t;
      this.player.forceGrounded();
      if (t >= 1) {
        this.fadeOverlay.alpha = 0;
        this.voidFadePhase = 'none';
      }
    }

    // Input lock outlasts fade-in by ~500 ms — natural reveal beat.
    if (this.voidInputLockMs <= 0 && this.voidFadePhase === 'none') {
      this.voidDropActive = false;
      this.voidCooldown = 500;
      this.game.input.inputLocked = false;
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

  /**
   * Player sword swing → container damage. Mirrors checkAttackOnSecretWalls
   * pattern: get current combo step hitbox, AABB-overlap each container,
   * apply atk damage. On destroy → BFS fluid paint + container teardown.
   */
  private checkAttackOnContainers(): void {
    if (!this.player.isAttackActive()) return;
    const step = this.player.getAttackStep(this.player.comboIndex);
    if (!step) return;
    const hitbox = getAttackHitbox(
      this.player.x, this.player.y, this.player.width, this.player.height,
      this.player.facingRight ?? true, step,
    );
    const dmg = Math.max(1, Math.floor(this.player.atk));
    for (let i = this.containers.length - 1; i >= 0; i--) {
      const c = this.containers[i];
      if (c.destroyed || c.held) continue;
      const cBox = { x: c.colX, y: c.colY, width: c.colW, height: c.colH };
      if (!aabbOverlap(hitbox, cBox)) continue;
      if (c.kind === 'MetalCrate') {
        this.hitSparks.spawn(c.colX + c.colW / 2, c.colY + c.colH / 2, true, 0);
        continue;
      }
      const impact = c.takeAttack(dmg);
      this.hitSparks.spawn(c.colX + c.colW / 2, c.colY + c.colH / 2, true, 0);
      if (impact) {
        this.paintContainerImpact(c.kind, impact.gx, impact.gy, c.fluidVolume);
        this.destroyContainerWithVFX(c);
        this.containers.splice(i, 1);
      }
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

        // TEL-19: Track secret wall discovery (fires once per wall, proxy for exploration depth).
        trackSecretWallBreak({
          mode: wall.mode,
          level_id: this.currentLevel?.identifier,
          item_id: wall.mode === 'item' ? ((wall as any)._itemId as string | undefined) : undefined,
        });

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
            const spawn = resolveItemDropSpawn(wall.centerX, wall.centerY, this.collisionGrid);
            const drop = new ItemDropEntity(spawn.x, spawn.y, item);
            this.drops.push(drop);
            this.entityLayer.addChild(drop.container);
          }
          this.toast.show(t('toast.secret_found'), 0xffd700);
        } else {
          this.toast.show(t('toast.path_opened'), 0x44ffaa);
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
      const spawn = resolveItemDropSpawn(x, y, this.collisionGrid);
      const drop = new ItemDropEntity(spawn.x, spawn.y, item);
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
        const spawn = resolveItemDropSpawn(x, y, this.collisionGrid);
        const drop = new ItemDropEntity(spawn.x, spawn.y, item);
        if (itemKey) (drop as any)._itemKey = itemKey;
        this.drops.push(drop);
        this.entityLayer.addChild(drop.container);
        break;
      }
      case 'currency': {
        // Parse amount from the itemId suffix (e.g. "gold_500" → 500). Regex on
        // master.name was locale-fragile — translators may not preserve "(N)".
        const idMatch = itemId.match(/_(\d+)$/);
        const amount = Math.max(1, Math.floor((idMatch ? parseInt(idMatch[1], 10) : 100) * 0.1));
        const gp = new GoldPickup(x, y, amount);
        gp.enableTerrainPhysics(this.collisionGrid);
        if (itemKey) (gp as any)._key = itemKey;
        this.goldPickups.push(gp);
        this.entityLayer.addChild(gp.container);
        break;
      }
      case 'consumable': {
        this.toast.show(t('toast.consumable_acquired', { name: master.name }), 0x44ff88);
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
        this.toast.show(t('toast.wall_shattered'), 0xffaa44);
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
        this.toast.show(t('toast.floor_destroyed'), 0xffaa44);
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
        this.toast.show(t('toast.floor_destroyed'), 0xffaa44);
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
        this.toast.show(t('toast.wall_shattered'), 0xffaa44);
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
      this.toast.show(t('toast.wall_destroyed'), 0xffaa44);
      cf.destroy();
      this.crackedFloors.splice(i, 1);
    }
  }

  /**
   * LDtk Entity 'Breakable' 직접 배치본 spawn — 사용자가 LDtk Editor 에서
   * 'Sprite' enum 으로 카탈로그 ID 선택. 기본값 SignBoard_Save.
   */
  private spawnBreakableEntitiesForLevel(level: LdtkLevel): void {
    for (const b of this.breakables) b.destroy();
    this.breakables = [];
    const ents = level.entities.filter(e => e.type === 'Breakable');
    for (const ent of ents) {
      const rawSprite = (ent.fields['Sprite'] ?? ent.fields['sprite']) as string | undefined;
      const spriteId: BreakableSpriteId = rawSprite && isBreakableSpriteId(rawSprite)
        ? rawSprite
        : 'SignBoard_Save';
      // LDtk px[0/1] 은 entity 의 pivot 점 좌표. Breakable 은 pivot=(0.5,1) 가정.
      const b = new Breakable(ent.px[0], ent.px[1], spriteId);
      this.breakables.push(b);
      this.entityLayer.addChild(b.container);
    }
  }

  /**
   * LDtk Entity 'Building' spawn — 시각 데코.
   * 사용자가 LDtk Editor 의 tile picker 로 선택한 사각형(__tile)을
   * 시트에서 잘라 그대로 배치. 충돌 없음. Pivot=(0.5,1) 가정 — 바닥 라인 정렬.
   */
  private spawnBuildingEntitiesForLevel(level: LdtkLevel): void {
    for (const b of this.buildings) b.destroy();
    this.buildings = [];
    const ents = level.entities.filter(e => e.type === 'Building');
    for (const ent of ents) {
      if (!ent.tile || !ent.tile.tilesetPath) {
        console.warn(`[Building] entity at (${ent.px[0]}, ${ent.px[1]}) has no tile — skipped. LDtk Editor 에서 tile 을 선택해 주십시오.`);
        continue;
      }
      const b = new Building(
        ent.px[0],
        ent.px[1],
        ent.tile.tilesetPath,
        ent.tile.src[0],
        ent.tile.src[1],
        ent.tile.w,
        ent.tile.h,
      );
      this.buildings.push(b);
      this.entityLayer.addChild(b.container);
    }
  }

  private spawnBreakablePropsForLevel(level: LdtkLevel): void {
    for (const bp of this.breakableProps) bp.destroy();
    this.breakableProps = [];

    // Reserve an 8-tile radius around save points and room entries so the
    // player has clean ground to land/save without props blocking the read.
    const exclude = new Set<string>();
    const RADIUS = 8;
    const addRadius = (col: number, row: number) => {
      for (let dr = -RADIUS; dr <= RADIUS; dr++) {
        for (let dc = -RADIUS; dc <= RADIUS; dc++) {
          exclude.add(`${col + dc},${row + dr}`);
        }
      }
    };
    for (const ent of level.entities) {
      if (ent.type === 'GameSaver' || ent.type === 'Player') {
        const col = Math.floor(ent.px[0] / TILE_SIZE);
        const row = Math.floor(ent.px[1] / TILE_SIZE);
        addRadius(col, row);
      }
    }
    const grid = this.collisionGrid;
    const cols = grid[0]?.length ?? 0;
    const rows = grid.length;
    const lp = this.findEdgePassage(grid, 'left',  -1); if (lp >= 0) addRadius(0,        lp);
    const rp = this.findEdgePassage(grid, 'right', -1); if (rp >= 0) addRadius(cols - 1, rp);
    const up = this.findEdgePassage(grid, 'up',    -1); if (up >= 0) addRadius(up, 0);
    const dp = this.findEdgePassage(grid, 'down',  -1); if (dp >= 0) addRadius(dp, rows - 1);

    const seed = hashString(level.identifier + '_props');
    const props = spawnBreakableProps(this.collisionGrid, seed, false, exclude);
    for (const prop of props) {
      this.breakableProps.push(prop);
      this.entityLayer.addChild(prop.container);
      // Register with TileMutator so cell-level fire propagation can ignite
      // this prop the same way BurnableProp / oil / wood / grass tiles chain.
      this.tileMutator.registerBurnable(prop);
    }
  }

  /**
   * 플레이어 공격 vs 수동 배치 Breakable Entity (LDtk).
   * 기존 IntGrid 9-tile 기반 checkAttackOnBreakables 와 별개.
   * BreakableProp 와 동일한 shatter / drop / 카메라 흔들림 처리.
   */
  private checkAttackOnBreakableEntities(): void {
    if (!this.player.isAttackActive()) return;
    const step = this.player.getAttackStep(this.player.comboIndex);
    if (!step) return;

    const hitbox = getAttackHitbox(
      this.player.x, this.player.y, this.player.width, this.player.height,
      this.player.facingRight ?? true, step,
    );

    for (let i = this.breakables.length - 1; i >= 0; i--) {
      const b = this.breakables[i];
      if (b.destroyed) continue;
      if (b.width === 0) continue; // texture 미로드 — 충돌 비활성.
      if (!aabbOverlap(hitbox, b.getAABB())) continue;

      const drop = b.break();
      this.game.hitstopFrames += 4;
      this.game.camera.shake(4);

      this.propShatter.spawn(
        b.x, b.y, b.width, b.height,
        b.getParticleColor(), b.getAccentColor(),
        b.getArtifactTexture(),
      );
      // speed 1.0 / (1.0~1.5) → 길이 100~150% 랜덤 (반복감 감소).
      SFX.play('breakable_destroy', 0, { speed: 1 / (1 + Math.random() * 0.5) });
      this.hitSparks.spawn(
        b.x + b.width / 2, b.y + b.height / 2,
        false, this.player.facingRight ? 1 : -1,
      );

      if (drop.type === 'gold' && drop.amount > 0) {
        const burstX = b.x + b.width / 2 - 8;
        const burstY = b.y + b.height;
        for (const gp of GoldPickup.spawnBurst(burstX, burstY, drop.amount)) {
          gp.roomData = this.collisionGrid;
          this.goldPickups.push(gp);
          this.entityLayer.addChild(gp.container);
        }
      } else if (drop.type === 'flask') {
        this.player.flaskCharges = Math.min(this.player.flaskCharges + 1, this.player.flaskMaxCharges);
      }

      b.destroy();
      this.breakables.splice(i, 1);
    }
  }

  private checkAttackOnBreakableProps(): void {
    if (!this.player.isAttackActive()) return;
    const step = this.player.getAttackStep(this.player.comboIndex);
    if (!step) return;

    const hitbox = getAttackHitbox(
      this.player.x, this.player.y, this.player.width, this.player.height,
      this.player.facingRight ?? true, step,
    );

    for (let i = this.breakableProps.length - 1; i >= 0; i--) {
      const bp = this.breakableProps[i];
      if (bp.destroyed) continue;
      if (!aabbOverlap(hitbox, bp.getAABB())) continue;
      this.destroyBreakablePropWithEffects(bp, 'sword');
      this.breakableProps.splice(i, 1);
    }
  }

  /**
   * Shared destroy path for BreakableProp — invoked by sword hits and by fire
   * burn-out. `source` controls camera shake / hitstop / hit-spark (we skip
   * those for fire to avoid spurious feedback during ambient burns).
   *
   * Caller is responsible for splicing the prop out of `this.breakableProps`.
   */
  private destroyBreakablePropWithEffects(bp: BreakableProp, source: 'sword' | 'fire'): void {
    const drop = bp.break();
    if (source === 'sword') {
      this.game.hitstopFrames += 4;
      this.game.camera.shake(4);
    }
    this.propShatter.spawn(
      bp.x, bp.y, bp.width, bp.height,
      bp.getParticleColor(), bp.getAccentColor(),
      bp.getArtifactTexture(),
    );
    SFX.play('breakable_destroy', 0, { speed: 1 / (1 + Math.random() * 0.5) });
    if (source === 'sword') {
      this.hitSparks.spawn(
        bp.x + bp.width / 2, bp.y + bp.height / 2,
        false, this.player.facingRight ? 1 : -1,
      );
    }
    if (drop.type === 'gold' && drop.amount > 0) {
      const burstX = bp.x + bp.width / 2 - 8;
      const burstY = bp.y + bp.height;
      for (const gp of GoldPickup.spawnBurst(burstX, burstY, drop.amount)) {
        gp.roomData = this.collisionGrid;
        this.goldPickups.push(gp);
        this.entityLayer.addChild(gp.container);
      }
    } else if (drop.type === 'flask') {
      this.player.flaskCharges = Math.min(this.player.flaskCharges + 1, this.player.flaskMaxCharges);
    }
    bp.destroy();
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
        this.toast.show(t('toast.switch_destroyed'), 0x44ffaa);
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
    const ty = Math.floor(hitbox.y / T);
    const b = Math.floor((hitbox.y + hitbox.height - 1) / T);
    let broken = false;
    for (let row = ty; row <= b; row++) {
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
      this.toast.show(t('toast.wall_destroyed'), 0xffaa44);
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

      const boss = new Boss01();
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
        // 필드 GoldenMonster 처치 시 포탈 스폰 — 사용자 요청으로 비활성.
        // if (enemy instanceof GoldenMonster) {
        //   enemy.onDeathCallback = (x, y, rarity) => this.spawnPortal(x, y, rarity, 'monster');
        // }
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
          // 사용자 결정 (2026-05-03): Broken Sword 는 시작 시 자동 지급되므로
          // LDtk 측 ItemDrop 은 중복. skip + collected 처리해 재방문 시 재spawn 방지.
          if (itemId === 'sword_broken') {
            this.collectedItems.add(itemKey);
            break;
          }
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
          // Save point — pivot bottom-left, center the marker on entity
          const spx = ent.px[0] + ent.width / 2;
          const spy = ent.px[1] - ent.height / 2;
          const floorY = ent.px[1]; // LDtk entity bottom = floor surface
          const marker = new Graphics();
          marker.rect(-12, -12, 24, 24).fill({ color: 0x2244cc, alpha: 0.85 });
          marker.rect(-12, -12, 24, 24).stroke({ color: 0x3366ff, width: 2 });
          // Pulsing diamond inside
          marker.moveTo(0, -7).lineTo(7, 0).lineTo(0, 7).lineTo(-7, 0).closePath()
            .fill({ color: 0x88aaff, alpha: 0.5 });
          marker.x = spx;
          marker.y = spy;
          this.entityLayer.addChild(marker);
          // Context prompt — rendered in uiContainer for crisp text
          const us = this.game.uiScale;
          const prompt = KeyPrompt.createPrompt(actionKey(GameAction.ATTACK), t('prompt.save'), us);
          prompt.visible = false;
          this.game.uiContainer.addChild(prompt);
          const entry: { x: number; y: number; gfx: Graphics; sprite?: Sprite; prompt?: Container } =
            { x: spx, y: spy, gfx: marker, prompt };
          this.savePoints.push(entry);
          // Attach the totem sprite (save_point_01.png). Async load — until it
          // resolves, the placeholder marker stays visible. Once loaded, hide
          // the marker so only the sprite is shown.
          //
          // Guard: if the entry was already cleared by a level transition (or
          // the marker was detached), drop the load result. Without this, late-
          // arriving textures attach orphan sprites to entityLayer and pile up
          // across levels.
          Assets.load<Texture>(assetPath('assets/sprites/save_point_01.png'))
            .then((tex) => {
              if (!tex) return;
              if (!this.savePoints.includes(entry)) return; // stale — entry cleared
              if (!marker.parent) return;                   // marker already removed
              tex.source.scaleMode = 'nearest';
              const sp = new Sprite(tex);
              sp.anchor.set(0.5, 1); // bottom-center: totem base sits on floor
              sp.x = spx;
              sp.y = floorY;
              this.entityLayer.addChild(sp);
              entry.sprite = sp;
              marker.visible = false;
            })
            .catch(() => { /* sprite missing — keep placeholder marker */ });
          break;
        }
        case 'GoldPickup': {
          const goldKey = `gold_${level.identifier}_${ent.px[0]}_${ent.px[1]}`;
          if (this.collectedItems.has(goldKey)) break;
          const amount = Math.max(1, Math.floor(((ent.fields['Amount'] ?? ent.fields['amount'] ?? 10) as number) * 0.1));
          const gp = new GoldPickup(ent.px[0], ent.px[1], amount);
          gp.enableTerrainPhysics(this.collisionGrid);
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
    //
    // Priority (사용자 결정 2026-05-03):
    //   1) 에디터 zone (entireLevel=false, AABB 영역) — LDtk 에서 직접 배치한 zone.
    //      에디터 측에서 겹치지 않게 배치하므로 first match 안전.
    //   2) entireLevel zone — 레벨 전체 fallback.
    // 두 단계 분리로 entireLevel 이 먼저 entity 추가되어도 에디터 zone 이 player
    // AABB 안에 있으면 우선 채택.
    let insideZone: typeof this.cameraZones[number] | null = null;
    if (!this.playerInBuilder) {
      // P1 — 에디터 zone (AABB 안)
      for (const zone of this.cameraZones) {
        if (zone.entireLevel) continue;
        if (pcx >= zone.x && pcx <= zone.x + zone.w &&
            pcy >= zone.y && pcy <= zone.y + zone.h) {
          insideZone = zone;
          break;
        }
      }
      // P2 — entireLevel fallback
      if (!insideZone) {
        for (const zone of this.cameraZones) {
          if (zone.entireLevel) {
            insideZone = zone;
            break;
          }
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
    Debug.log(`[EdgeTransition] dir=${direction} level=${level.identifier} localY=${py.toFixed(0)} worldY=${playerWorldY.toFixed(0)} candidates=${JSON.stringify(this.currentLevel.dirNeighbors[{left:'w',right:'e',up:'n',down:'s'}[direction]])}`);
    const neighborId = this.getNeighborInDirection(direction, playerWorldX, playerWorldY);
    Debug.log(`[EdgeTransition] ??neighborId=${neighborId}`);
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
   * restored when the builder crosses a tile boundary by unstampBuilder().
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
          this.builderStamps.push(r * gridW + c);
        }
      }
    }
    this.builderStampOriginX = tileOriginX;
    this.builderStampOriginY = tileOriginY;
  }

  /** Restore cells previously stamped by the builder back to empty (0). */
  private unstampBuilder(): void {
    const gridW = this.collisionGrid[0]?.length ?? 0;
    for (const stamp of this.builderStamps) {
      const r = gridW > 0 ? Math.floor(stamp / gridW) : 0;
      const c = gridW > 0 ? stamp - r * gridW : 0;
      const row = this.collisionGrid[r];
      if (row) row[c] = 0;
    }
    this.builderStamps.length = 0;
    this.builderStampOriginX = null;
    this.builderStampOriginY = null;
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
    const gridW = this.collisionGrid[0]?.length ?? 0;
    if (gridW <= 0) return false;
    for (const stamp of this.builderStamps) {
      const r = Math.floor(stamp / gridW);
      const c = stamp - r * gridW;
      if (r === footRow && c >= leftCol && c <= rightCol) return true;
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

  /**
   * Debug 워프 핸들러 — update() 에서 매 프레임 호출.
   *   ` (Backquote)  → 뷰포트 클릭 워프 모드 토글
   *   Shift+M        → 전 맵 풀 디테일 + 룸 클릭 워프 모달
   *
   * `?debug=1` URL 플래그 가 있을 때만 활성. 일반 플레이어 실수 워프 방지.
   * Shift+M 은 일반 M (월드맵) 보다 먼저 처리해 MAP 액션을 consume 한다.
   */
  private handleDebugWarp(): void {
    if (!new URLSearchParams(window.location.search).has('debug')) return;
    const input = this.game.input;

    // Shift+M → 전 맵 워프 모달
    if (input.shiftDown && input.isJustPressed(GameAction.MAP) && !this.inItemTunnel) {
      input.consumeJustPressed(GameAction.MAP);
      if (this.warpModeActive) this.toggleWarpMode(); // 백틱 모드와 충돌 방지
      this.openDebugWorldMap();
    }

    // Backtick → 뷰포트 클릭 워프 토글
    if (input.isRawKeyJustPressed('Backquote')) {
      // 월드맵이 열려있으면 우선 닫기 (모달 충돌 방지)
      if (this.worldMap.visible) this.worldMap.close();
      this.toggleWarpMode();
    }

    // ESC 로 워프 모드 해제 (월드맵 esc 와 별도 처리 — 월드맵이 닫혀있을 때만)
    if (this.warpModeActive && !this.worldMap.visible
        && input.isJustPressed(GameAction.MENU)) {
      input.consumeJustPressed(GameAction.MENU);
      this.toggleWarpMode();
    }
  }

  private openDebugWorldMap(): void {
    this.worldMap.setExplorationState(this.visitedLevels, this.currentLevel?.identifier ?? '');
    this.worldMap.setMarkers(this.collectMapMarkers());
    if (this.currentLevel) {
      this.worldMap.setPlayerPosition(
        this.player.x + this.currentLevel.worldX,
        this.player.y + this.currentLevel.worldY,
      );
    }
    this.worldMap.onRoomClick = (roomId, localX, localY) => {
      this.worldMap.close();
      // If we opened debug warp from the death screen, revive in place so
      // the warp destination is playable — otherwise the player would land
      // dead and the game-over UI would immediately re-cover the new room.
      if (this.gameOverActive) this.reviveFromGameOver();
      this.warpToRoom(roomId, Math.floor(localX), Math.floor(localY));
    };
    this.worldMap.openDebug();
    this.hud.container.visible = false;
    if (this.minimap) this.minimap.visible = false;
  }

  /** Clear death state without going through SaveManager — debug warp only. */
  private reviveFromGameOver(): void {
    this.gameOverActive = false;
    if (this.gameOverOverlay?.parent) {
      this.gameOverOverlay.parent.removeChild(this.gameOverOverlay);
    }
    this.gameOverOverlay = null;
    this.player.hp = this.player.maxHp;
    this.player.isDead = false;
    this.player.drowned = false;
    this.hud.container.visible = true;
    if (this.minimap) this.minimap.visible = true;
  }

  private toggleWarpMode(): void {
    this.warpModeActive = !this.warpModeActive;
    if (this.warpModeActive) {
      // HUD 상단 중앙에 라벨
      const us = this.game.uiScale;
      this.warpHintText = new BitmapText({
        text: t('ui.debug.warp_mode_hint'),
        style: { fontFamily: PIXEL_FONT, fontSize: 8 * us, fill: 0xffe060 },
      });
      this.warpHintText.x = Math.floor((this.game.app.canvas.width - this.warpHintText.width) / 2);
      this.warpHintText.y = 6 * us;
      this.game.uiContainer.addChild(this.warpHintText);

      // 캔버스 클릭 핸들러
      this.warpClickHandler = (e: PointerEvent) => this.warpToScreenClick(e);
      this.game.app.canvas.addEventListener('pointerdown', this.warpClickHandler);
      this.game.app.canvas.style.cursor = 'crosshair';
    } else {
      if (this.warpHintText && this.warpHintText.parent) {
        this.warpHintText.parent.removeChild(this.warpHintText);
        this.warpHintText.destroy();
        this.warpHintText = null;
      }
      if (this.warpClickHandler) {
        this.game.app.canvas.removeEventListener('pointerdown', this.warpClickHandler);
        this.warpClickHandler = null;
      }
      this.game.app.canvas.style.cursor = '';
    }
  }

  private warpToScreenClick(e: PointerEvent): void {
    if (!this.currentLevel) return;
    const canvas = this.game.app.canvas;
    const rect = canvas.getBoundingClientRect();
    const fractionX = (e.clientX - rect.left) / rect.width;
    const fractionY = (e.clientY - rect.top) / rect.height;
    // 좌표 변환 — Game.ts 의 gameContainer 배치 식을 역산:
    //   gameContainer.x = -cam.renderX + rtW/2  (rtW = GAME_WIDTH / zoom)
    //   화면 중앙(fraction=0.5) → cam.renderX
    //   따라서 level-local x = cam.renderX - rtW/2 + fraction × rtW
    // cam.setBounds(0, 0, level.pxWid, level.pxHei) 로 cam 은 이미 level-local.
    // currentLevel.worldX 는 빼지 않는다.
    const cam = this.game.camera;
    const rtW = GAME_WIDTH / cam.zoom;
    const rtH = GAME_HEIGHT / cam.zoom;
    const localX = cam.renderX - rtW / 2 + fractionX * rtW;
    const localY = cam.renderY - rtH / 2 + fractionY * rtH;
    this.warpPlayerToLocal(localX, localY);
    this.toast.show(t('toast.warped'), 0xffe060);
  }

  private warpToRoom(roomId: string, localX: number, localY: number): void {
    if (this.currentLevel?.identifier !== roomId) {
      this.loadLevel(roomId, 'down');
    }
    this.warpPlayerToLocal(localX, localY);
    this.hud.container.visible = true;
    if (this.minimap) this.minimap.visible = true;
    this.toast.show(t('toast.warped_to', { room: roomId }), 0xffe060);
  }

  /**
   * 플레이어를 현재 레벨 로컬 좌표 (clickX, clickY) 로 워프 + 정상 착지 보장.
   *   1) clickX 컬럼에서 clickY 부터 아래로 첫 solid 행 탐색 — collision bottom 이
   *      해당 floor 윗면 위에 +1px 오버랩되도록 배치 (resolveY 가 1px 밀어내며 grounded=true 트리거)
   *   2) 솔리드 못 찾으면 clickY 그대로 — 떨어지면서 자연 착지
   *   3) vx/vy = 0, prevPos 동기화, 5 프레임 물리 시뮬 (loadLevel 과 동일) →
   *      FSM 가 grounded/idle 로 안정화, animation 도 정상화
   *   4) 카메라 snap
   */
  private warpPlayerToLocal(clickX: number, clickY: number): void {
    if (!this.currentLevel) return;
    const grid = this.currentLevel.collisionGrid;
    const TS = 16;
    const col = Math.floor(clickX / TS);
    const startRow = Math.floor(clickY / TS);
    const maxRow = grid.length - 1;

    // 클릭 지점 아래로 첫 solid (1) 행 탐색.
    // collisionH = 24 (Player), collision bottom = player.y + player.height.
    // 1px 오버랩으로 resolveY 가 위로 밀어 올리며 grounded=true 즉시 세팅.
    let footY = clickY;
    if (col >= 0 && grid[0] && col < grid[0].length) {
      for (let r = Math.max(0, startRow); r <= maxRow; r++) {
        const cell = grid[r]?.[col] ?? 0;
        if (cell === 1) {
          footY = r * TS + 1; // 1px 오버랩
          break;
        }
      }
    }

    this.player.x = clickX - this.player.width / 2;
    this.player.y = footY - this.player.height;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.savePrevPosition();

    // 5 프레임 물리 시뮬레이션 — resolveY 가 floor 위 정상 착지 처리, FSM 이 jump/fall
    // 잔재 상태에서 idle/grounded 로 자연 전이 (loadLevel 의 settle 패턴 재사용).
    for (let i = 0; i < 5; i++) {
      this.player.update(16.667);
    }

    // 카메라 즉시 추적.
    this.game.camera.snap(
      this.player.x + this.player.width / 2,
      this.player.y + this.player.height / 2,
    );
  }

  private spawnBuilder(hostLevel: LdtkLevel, mode: 'cinematic' | 'patrol', builderLevelId: string): void {
    const builderLevel = this.builderLoader.getLevel(builderLevelId);
    if (!builderLevel) return;
    const topY = 64;
    const bottomY = hostLevel.pxHei - builderLevel.pxHei - 64;
    const px = mode === 'cinematic'
      ? hostLevel.pxWid - builderLevel.pxWid - 31 * 16
      : hostLevel.pxWid - builderLevel.pxWid - 16 * 16;
    const initialY = mode === 'cinematic' && this.shaft01CinematicPlayed ? topY : bottomY;

    const builder = new GiantBuilder(
      builderLevel,
      this.atlases,
      'world_shaft_builder_bg',
      'world_shaft_builder_wall',
      { hostLevel, builderX: px, builderY: initialY },
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
      builder.setLegFilters([this.builderWallPaletteFilter, this.wallRimFilter]);
    }

    if (mode === 'cinematic') {
      // Shaft_01 — right wall minus 31 tiles (사용자 결정 2026-05-03). First
      // entry: one-shot bottom→top ascent. Re-entries: spawn at the dormant
      // top pose with no route so the builder stays parked where the
      // cinematic left it.
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
    this.registerBuilderGrassClumps(builder);
  }

  /**
   * Shaft_02 의 빌더 배치 — 좌측 벽 + 15 tile, y=0..768 무한 왕복.
   * spawnBuilder 의 cinematic/patrol preset 외 1회성 케이스라 별도 헬퍼.
   * Shaft_02 intentionally uses Builder_Level_1.
   */
  private spawnShaft02Builder(hostLevel: LdtkLevel): void {
    const builderLevel = this.builderLoader.getLevel('Builder_Level_1');
    if (!builderLevel) return;
    const builderX = 15 * 16;
    const initialY = 832;

    const builder = new GiantBuilder(
      builderLevel,
      this.atlases,
      'world_shaft_builder_bg',
      'world_shaft_builder_wall',
      { hostLevel, builderX, builderY: initialY },
    );

    // 빌더 데코 / 본체 팔레트 — Shaft_01 patrol 과 동일.
    if (this.builderWallPaletteFilter) {
      builder.decorator.naturalLayer.filters    = [this.builderNaturalPaletteFilter!];
      builder.decorator.artificialLayer.filters = [this.builderWallPaletteFilter];
      builder.decorator.structureLayer.filters  = [this.builderWallPaletteFilter];
    }
    if (this.builderBgPaletteFilter && this.builderWallPaletteFilter && this.builderInteriorPaletteFilter && this.wallRimFilter) {
      builder.bodyLayers.bg.filters       = [this.builderBgPaletteFilter];
      builder.bodyLayers.wall.filters     = [this.builderWallPaletteFilter, this.wallRimFilter];
      builder.bodyLayers.interior.filters = [this.builderInteriorPaletteFilter];
      builder.bodyLayers.shadow.filters   = [this.builderWallPaletteFilter];
      builder.setLegFilters([this.builderWallPaletteFilter, this.wallRimFilter]);
    }

    const px = 15 * 16; // 좌측 벽 + 15 tile (1 tile = 16 px).
    // 시작 위치 = patrol 의 아래쪽 끝 (y=832). 8 tile 아래 → 4 tile 위로 보정.
    // 플레이어가 Shaft_02 진입 시 빌더가 아래에서부터 천천히 올라오는 인상.
    builder.placeInLevel(px, initialY);

    // 렌더 순서: 빌더는 host wallLayer 앞 + procDecorator 자연/인공 데코 뒤.
    // procDecorator.naturalLayer 인덱스 직전에 삽입 → 데코가 빌더 위로 그려져
    // 자연 디테일이 빌더 실루엣에 가려지지 않음. 빌더는 host wallLayer 위에 있어
    // 본체는 또렷이 보임.
    const insertIdx = this.procDecorator
      ? this.renderer.container.getChildIndex(this.procDecorator.naturalLayer)
      : this.renderer.container.children.length;
    this.renderer.container.addChildAt(builder.container, insertIdx);

    // 아래(832) → 위(64) 무한 왕복. 각 끝점 5초 대기, 33 px/s 속도.
    builder.setRoute([
      { y: 832, waitMs: 5000 },
      { y: 64,  waitMs: 5000 },
    ], 33, true);

    this.activeBuilder = builder;
    this.activeBuilderMode = 'patrol';
    this.builderWasMoving = false;
    this.builderStepCounter = 0;

    this.spawnBuilderEntities(builderLevel, 'Builder_Level_1', builder);
    this.registerBuilderGrassClumps(builder);
    void hostLevel;
  }

  /**
   * Shaft_DemoEnd 의 빌더 배치 — 좌측 끝(x=18px), 초기 y=130px, y 방향 무한 왕복.
   * Builder_Level_2 사용. spawnShaft02Builder 패턴을 그대로 따른다.
   */
  private spawnDemoEndBuilder(hostLevel: LdtkLevel): void {
    const builderLevel = this.builderLoader.getLevel('Builder_Level_2');
    if (!builderLevel) return;
    const initialY = 135;         // px, 사용자 결정 2026-05-16.
    const bottomY = Math.max(initialY + 64, hostLevel.pxHei - builderLevel.pxHei - 64);

    // Left-wall hug: read the host IntGrid and place builder's left edge
    // flush against the rightmost wall column the builder will touch as it
    // travels y=initialY..bottomY. For every row the builder occupies at any
    // y stop on its route, walk left→right counting consecutive TILE_WALL
    // (1) cells; the largest such prefix across all those rows is the
    // builder's flush x in cells. Multiply by 16 for px.
    const builderHeightCells = Math.ceil(builderLevel.pxHei / 16);
    const topRow = Math.floor(initialY / 16);
    const bottomRowIncl = Math.floor(bottomY / 16) + builderHeightCells;
    let wallPrefixMax = 0;
    for (let r = topRow; r <= bottomRowIncl; r++) {
      const row = hostLevel.collisionGrid[r];
      if (!row) continue;
      let x = 0;
      while (x < row.length && row[x] === 1) x++;  // 1 = TILE_WALL
      if (x > wallPrefixMax) wallPrefixMax = x;
    }
    const builderX = wallPrefixMax * 16;

    const builder = new GiantBuilder(
      builderLevel,
      this.atlases,
      'world_shaft_builder_bg',
      'world_shaft_builder_wall',
      { hostLevel, builderX, builderY: initialY },
    );

    // Decorator/Body 팔레트 — Shaft_02 patrol 과 동일 필터 스택.
    if (this.builderWallPaletteFilter) {
      builder.decorator.naturalLayer.filters    = [this.builderNaturalPaletteFilter!];
      builder.decorator.artificialLayer.filters = [this.builderWallPaletteFilter];
      builder.decorator.structureLayer.filters  = [this.builderWallPaletteFilter];
    }
    if (this.builderBgPaletteFilter && this.builderWallPaletteFilter && this.builderInteriorPaletteFilter && this.wallRimFilter) {
      builder.bodyLayers.bg.filters       = [this.builderBgPaletteFilter];
      builder.bodyLayers.wall.filters     = [this.builderWallPaletteFilter, this.wallRimFilter];
      builder.bodyLayers.interior.filters = [this.builderInteriorPaletteFilter];
      builder.bodyLayers.shadow.filters   = [this.builderWallPaletteFilter];
      builder.setLegFilters([this.builderWallPaletteFilter, this.wallRimFilter]);
    }

    builder.placeInLevel(builderX, initialY);

    // 렌더 순서: 빌더는 host wallLayer 앞 + procDecorator 자연/인공 데코 뒤.
    const insertIdx = this.procDecorator
      ? this.renderer.container.getChildIndex(this.procDecorator.naturalLayer)
      : this.renderer.container.children.length;
    this.renderer.container.addChildAt(builder.container, insertIdx);

    // y 방향 무한 왕복. 시작은 즉시 이동(사용자 결정 2026-05-17 — 플레이어가
    // Shaft_DemoEnd 진입 즉시 빌더 무게감 연출), 이후 양 끝점 5초 대기.
    builder.setRoute([
      { y: initialY, waitMs: 0 },
      { y: bottomY,  waitMs: 5000 },
    ], 33, true);
    // setRoute 는 첫 entry 에서 waiting 상태로 시작 — waitMs=0 라도 다음 frame
    // update 까지 1 tick 대기. activate() 로 dormant→moving 만 직행하므로,
    // 여기서 직접 첫 wait 을 건너뛴다.
    builder.skipInitialWait();

    this.activeBuilder = builder;
    this.activeBuilderMode = 'patrol';
    // Shaft_01 처럼 발걸음 카메라 쉐이크 — patrol 모드지만 무게감 연출은 동일.
    this.builderShakeEnabled = true;
    this.builderWasMoving = false;
    this.builderStepCounter = 0;

    this.spawnBuilderEntities(builderLevel, 'Builder_Level_2', builder);
    this.registerBuilderGrassClumps(builder);
  }

  private registerBuilderGrassClumps(builder: GiantBuilder): void {
    const registered = this.grassClumpFire.registerWithCellResolver(
      builder.decorator.getGrassClumpsWithCells(),
      (clump) => {
        const bx = Math.round(builder.container.x / 16);
        const by = Math.round(builder.container.y / 16);
        return { gx: bx + clump.gx, gy: by + clump.gy };
      },
    );
    for (const prop of registered) this.tileMutator.registerBurnable(prop);
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
          // 사용자 결정 (2026-05-03): Broken Sword 시작 시 자동 지급. Builder 안
          // ItemDrop 도 중복 — skip + collected 처리.
          if (itemId === 'sword_broken') {
            this.collectedItems.add(itemKey);
            break;
          }

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
        case 'Anvil': {
          // Builder-mounted anvil. Single-instance policy: if the host level
          // already spawned an anvil via spawnAnvilFromLdtk, skip — no double
          // anvil in the same room. Builder anvil reuses Anvil class so all
          // prompts / dialogue / IW entry routing work unchanged once the
          // attachment makes its world coords track the builder.
          if (this.anvil) break;
          const anvilDisabled = (
            this.currentLevel?.identifier === FIRST_ANVIL_LEVEL_ID &&
            (this.unlockedEvents.has(EGO_EVENT.ANVIL_RETIRED) ||
             sacredSave.isFirstItemWorldBossDefeated())
          );
          const anvil = new Anvil(wx, wy, anvilDisabled);
          this.anvil = anvil;
          this.currentAnvilIid = ent.iid;
          // attachToBuilder reparents container.parent → builder.container,
          // sets container.x/y to local coords. World x/y are then refreshed
          // each frame in syncBuilderAttachments() for prompt/interaction tests.
          this.attachToBuilder(builder, anvil, localX, localY, () => this.anvil === anvil);
          break;
        }
        case 'Builder': {
          // LDtk Builder entity — 정적 데코레이션 sprite. tile (인스턴스 Tile field
          // 또는 entity def 기본 tile) 의 native w×h 로 렌더 — entity bounds 32×32
          // 에 맞추지 않음 (LDtk tileRenderMode = FullSizeUncropped 동작 모방).
          // pivot = bottom-center (LDtk entity def: pivotX=0.5, pivotY=1).
          const tile = ent.tile;
          if (!tile || !tile.tilesetPath) break;
          const url = assetPath(`assets/${tile.tilesetPath}`);
          Assets.load<Texture>(url).then((tex) => {
            if (!tex) return;
            tex.source.scaleMode = 'nearest';
            const frameTex = new Texture({
              source: tex.source,
              frame: new Rectangle(tile.src[0], tile.src[1], tile.w, tile.h),
            });
            const sprite = new Sprite(frameTex);
            sprite.anchor.set(0.5, 1);
            sprite.x = localX;
            sprite.y = localY;
            // tile native 크기로 렌더. wallLayer 의 자식으로 추가해 builder body
            // 와 동일한 PaletteSwap + RimLight 필터를 자동 상속 (별도 filter 지정 X).
            builder.bodyLayers.wall.addChild(sprite);
          });
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
    this.builderShakeEnabled = false;
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

    const title = createUiText(t('ui.death.youdied_world'), {
      fontFamily: PIXEL_FONT, fontSize: 14, fill: 0xff2222,
    });
    title.anchor.set(0.5);
    title.x = GAME_WIDTH / 2;
    title.y = GAME_HEIGHT / 2 - 20;
    overlay.addChild(title);

    const hint = createUiText(
      t('ui.death.return_save_point', { jump: actionKey(GameAction.JUMP), dash: actionKey(GameAction.DASH) }),
      { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0x888888 },
    );
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
      const respawnLevelId = this.resolveSpawnLevelId(saveData.levelId);
      this.playerSpawnLevelId = respawnLevelId;
      this.loadLevel(respawnLevelId, 'down');
    } else {
      // No save ??return to spawn level
      this.healthShardBonus = 0;
      const respawnLevelId = this.resolveSpawnLevelId(this.playerSpawnLevelId);
      this.playerSpawnLevelId = respawnLevelId;
      this.loadLevel(respawnLevelId, 'down');
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

    const buffedStats = applyPlayerStatBuffs({
      atk: base.atk + weaponAtk + innocentAtk + cheatBonus,
      def: base.def + (equippedItem ? Math.floor(calcInnocentBonus(equippedItem, 'def')) : 0),
    });
    this.player.atk = buffedStats.atk;

    // Sync equipped weapon properties for FX + attack hitbox scaling.
    this.player.equippedWeaponId = equippedItem ? equippedItem.def.id : null;
    this.player.equippedWeaponType = equippedItem ? equippedItem.def.type : null;
    this.player.equippedRarity = equippedItem ? equippedItem.rarity : null;
    this.player.attackHitboxMul = equippedItem
      ? equippedItem.def.hitboxW / BASE_HITBOX_W
      : 1;

    // DEF: base from CSV + innocent bonus
    this.player.def = buffedStats.def;

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
      this.toast.show(t('toast.portal_appeared', { rarity: rarity.toUpperCase() }), 0xffcc44);
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

  private showFirstItemWorldReturnInventoryHint(hadFirstBossClear: boolean): void {
    const firstBossClearedThisRun = !hadFirstBossClear && sacredSave.isFirstItemWorldBossDefeated();
    if (!firstBossClearedThisRun) return;
    if (this.unlockedEvents.has(INVENTORY_KEY_AFTER_FIRST_IW_EVENT)) return;

    this.unlockedEvents.add(INVENTORY_KEY_AFTER_FIRST_IW_EVENT);
    this.hud.setItemKeyHighlight(true);
    // 사용자 결정 (2026-05-03): hint 는 EGO 대사 (fireWorldReturnDialogue) 종료 후
    // 표시. flag 만 set, update() 가 cutscene/dialogue 종료 검사 후 실제 표시.
    this.pendingInventoryHint = 'first_iw_return';
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
    const hadFirstBossClear = sacredSave.isFirstItemWorldBossDefeated();

    if (this.portalTransition) {
      this.portalTransition.destroy();
      this.portalTransition = null;
    }

    // Hide world while in Item World and detach shared UI from global containers.
    this.container.visible = false;
    this.detachSharedUiForItemWorld();
    // 월드 씬은 push 로 유지 (destroy 안 됨). 직전에 떠있는 골드/EXP 플로팅
    // 텍스트는 update tick 정지로 영구 잔류하므로 명시 clear.
    this.dmgNumbers?.clear();

    const itemWorldScene = new ItemWorldScene(this.game, targetItem, this.inventory, this.player);
    itemWorldScene.itemWorldTutorialDone = this.unlockedEvents.has('__itemWorldTutorialDone');
    itemWorldScene.egoUnlockedEvents = this.unlockedEvents;
    itemWorldScene.onComplete = () => {
      this.game.sceneManager.pop();
      this.updatePlayerAtk();
      // Mark global Item World tutorial as done — ONLY after the player
      // actually defeated the first IW boss. ESC / escape-altar exits before
      // the boss kill must keep the tutorial flag off so the 1-stratum 2x2
      // override and onboarding dialogue persist on re-entry.
      if (sacredSave.isFirstItemWorldBossDefeated()) {
        this.unlockedEvents.add('__itemWorldTutorialDone');
      }
      // Second and final inventory cue: only after the first IW boss clear.
      this.showFirstItemWorldReturnInventoryHint(hadFirstBossClear);

      // Collect earned gold from Item World
      if (itemWorldScene.earnedGold > 0) {
        this.gold += itemWorldScene.earnedGold;
        this.toast.show(t('toast.gold_gain', { amount: itemWorldScene.earnedGold }), 0xffd700);
      }

      // ── Ego T14 / Anvil retirement (Playtest 2026-04-26) ──
      // After the first IW boss clear, replace the standard "또 올 거야?"
      // line with the anvil-retired + inventory tutorial dialogue, then
      // disable the current anvil once the dialogue finishes. Otherwise the
      // T14 line plays once as before.
      this.fireWorldReturnDialogue(targetItem.def.id);
      this.retireFirstAnvilAfterBossClear(hadFirstBossClear);

      if (isAltar) {
        if (targetItem.level > prevLevel) {
          this.toast.show(t('toast.weapon_level_up', { name: targetItem.def.name, level: targetItem.level }), 0xff88ff);
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
        this.toast.show(t('toast.atk_change', { prev: prevAtk, next: this.player.atk }), 0xffff44);
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
      // 사용자 결정 (2026-05-03): "Open Inventory" first-pickup hint 폐기.
      // Broken Sword 가 시작 시 자동 지급되어 firstEver 분기는 일반 케이스에선
      // 도달하지 않지만, 다른 경로 (save reset 등) 안전 위해 hint 트리거 자체
      // 제거. IW 보스 클리어 후 'first_iw_return' hint 는 별도 플로우라 유지.
    }

    // Tear down any lingering pulse / tether so rapid pickups don't stack.
    if (this.activeWeaponPulse) { this.activeWeaponPulse.destroy(); this.activeWeaponPulse = null; }
    if (this.activeAnvilTether) { this.activeAnvilTether.destroy(); this.activeAnvilTether = null; }

    if (isFirstSeen) {
      // Rustborn은 사전 발견(discovery) 컷신에서 이미 T2_QUICK 펄스를 재생했으므로
      // 픽업 시점의 T2 펄스는 생략하고 곧바로 LorePopup → EGO_WAKE 로 진입한다.
      // 그 외 신규 아이템은 기존대로 2s T2_QUICK 펄스를 보여 준다.
      const isRustborn = item.def.id === 'sword_rustborn';
      const skipPulse = isRustborn && this.unlockedEvents.has(EGO_EVENT.FIRST_WALK);
      if (!skipPulse) {
        const mode = isRustborn ? 'T2_FULL_CUTSCENE' : 'T2_QUICK_CUTSCENE';
        const pulse = new WeaponPulse(wx, wy, item.rarity, mode);
        this.entityLayer.addChild(pulse.container);
        pulse.onZoom = (scale) => { this.pickupZoomOverride = scale; };
        // Tether??LorePopup ?�힘 ?�후 지??모드�??�성?��?�??�스 중엔 발동?��? ?�음.
        pulse.start();
        this.activeWeaponPulse = pulse;
      }
    }

    // Lore popup — open on first-seen items (or always-on setting).
    // Deferred behind the pulse (if any) so the cutscene completes first.
    // For already-seen items without the alwaysShowLore option this resolves
    // to a no-op in LorePopup.showIfNew().
    this.lorePopupItem = item;

    // ── Ego wake dialogue (EGO_WAKE) 폐기 (사용자 결정 2026-05-03) ──
    // 픽업 후 대사를 모두 없앤다. discovery 시점의 EGO_RUSTBORN_AWAKEN 으로
    // Rustborn 인지·각성 메타포가 이미 봉합되었고, 픽업 후엔 게임 컨트롤로
    // 즉시 복귀해야 호흡이 깔끔. EGO_EVENT.WAKE 표식만 한 번 set 해 다른
    // 분기 (예: 무기 swap 시) 에서 "WAKE 이미 발생" 로 인식되도록 유지.
    if (!this.unlockedEvents.has(EGO_EVENT.WAKE) && hasEgo(item.def.id)) {
      this.unlockedEvents.add(EGO_EVENT.WAKE);
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

    // ── Rustborn pre-pickup discovery ───────────────────────────────
    // When the player walks within 5 tiles of an un-encountered Rustborn drop,
    // freeze input, run a 2 s discovery pulse, then dispatch EGO_FIRST_WALK
    // (3 lines). Pickup itself is blocked until this completes; the existing
    // pickup flow then runs without the on-pickup T2 pulse and only fires
    // EGO_WAKE (2 lines), matching the "approach → pulse → 3 lines → pickup
    // → 2 lines" beat structure.
    if (
      !this.discoveryActive
      && !this.unlockedEvents.has(EGO_EVENT.FIRST_WALK)
      && this.loreDisplay && !this.loreDisplay.isActive
      && !this.activeWeaponPulse
    ) {
      const PROXIMITY_PX = 80; // 5 tiles × 16
      const proxSq = PROXIMITY_PX * PROXIMITY_PX;
      const px = this.player.x + this.player.width / 2;
      const py = this.player.y + this.player.height / 2;
      for (const drop of this.drops) {
        if (drop.item.def.id !== 'sword_rustborn') continue;
        const dx = px - drop.x;
        const dy = py - drop.y;
        if (dx * dx + dy * dy > proxSq) continue;

        this.discoveryActive = true;
        this.discoveryDialoguePending = true;
        this.unlockedEvents.add(EGO_EVENT.FIRST_WALK);
        const pulse = new WeaponPulse(drop.x, drop.y, drop.item.rarity, 'T2_QUICK_CUTSCENE');
        this.entityLayer.addChild(pulse.container);
        pulse.onZoom = (s) => { this.pickupZoomOverride = s; };
        pulse.start();
        this.activeWeaponPulse = pulse;
        break;
      }
    }

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
        // 첫 Anvil 조우 시의 가이드 라인(persistent tether) 비활성화.
        // 검 Ego 내러티브가 온보딩을 전달하므로 시각 가이드가 중복.
        // if (!sacredSave.isFirstDiveDone()) {
        //   this.spawnPersistentAnvilTether(item.rarity);
        // }
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

    // AcquireOverlay — relic / max HP+ ceremonial modal. Same pattern as LorePopup:
    // 1000ms 입력 잠금 후 ATTACK 으로 dismiss. 잠금 중 ATTACK 은 소비만 하고 통과시키지 않음.
    if (this.acquireOverlay?.isBlocking()) {
      this.acquireOverlay.update(dt);
      blocking = true;
      const input = this.game.input;
      if (this.acquireOverlay.canConfirm() && input.isJustPressed(GameAction.ATTACK)) {
        input.consumeJustPressed(GameAction.ATTACK);
        this.acquireOverlay.confirm();
      } else if (!this.acquireOverlay.canConfirm() && input.isJustPressed(GameAction.ATTACK)) {
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

    // Discovery — once the pulse finishes, dispatch Rustborn awaken dialogue
    // (사용자 결정 2026-05-03: 기존 EGO_FIRST_WALK 대체).
    if (this.discoveryDialoguePending && !this.activeWeaponPulse) {
      this.discoveryDialoguePending = false;
      this.loreDisplay?.showDialogue(EGO_RUSTBORN_AWAKEN, true);
    }

    // Discovery stays "active" (blocks pickup) until both pulse + dialogue end.
    if (this.discoveryActive) {
      const dialogueDone = !this.discoveryDialoguePending && !this.loreDisplay?.isActive;
      if (this.activeWeaponPulse || !dialogueDone) {
        blocking = true;
      } else {
        this.discoveryActive = false;
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
      this.toast.show(t('toast.no_items_to_offer'), 0xff4444);
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
    bg.rect(0, 0, panelW, panelH).fill({ color: MODAL_BG, alpha: MODAL_BG_ALPHA });
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
          this.toast.show(t('toast.cannot_dive_broken'), 0xff4444);
          return;
        }
        // Demo build: block re-dive on fully cleared items (parity with anvil).
        if (DEMO_BLOCK_REDIVE && isItemFullyCleared(item)) {
          this.toast.show(t('toast.memory_exhausted'), 0xff8844);
          this.closeAltarUI();
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
    if (this.anvilDisabledPrompt?.parent) {
      this.anvilDisabledPrompt.parent.removeChild(this.anvilDisabledPrompt);
      this.anvilDisabledPrompt = null;
    }
    this.currentAnvilIid = null;

    const anvilEnts = level.entities.filter(
      e => e.type === 'Anvil',
    );
    // Anvil retires after the EGO_ANVIL_RETIRED dialogue plays once
    // (which itself fires on the first world-return after first IW boss clear).
    // Until that dialogue plays, the anvil stays active even if the boss has
    // been defeated — Rustborn explains the retirement before the visual changes.
    const anvilDisabled = (
      level.identifier === FIRST_ANVIL_LEVEL_ID &&
      (this.unlockedEvents.has(EGO_EVENT.ANVIL_RETIRED) || sacredSave.isFirstItemWorldBossDefeated())
    );
    if (anvilEnts.length > 0) {
      const ent = anvilEnts[0]; // One anvil per level
      this.anvil = new Anvil(ent.px[0], ent.px[1], anvilDisabled);
      this.currentAnvilIid = ent.iid;
      this.entityLayer.addChildAt(this.anvil.container, 0);
      return;
    }

    // Prototype fallback: spawn anvil at first altar position
    const altarEnts = level.entities.filter(e => e.type === 'Altar');
    if (altarEnts.length > 0) {
      console.warn(`[LdtkWorldScene] No Anvil entity in "${level.identifier}" ??using first Altar position as fallback`);
      const ent = altarEnts[0];
      this.anvil = new Anvil(ent.px[0], ent.px[1], anvilDisabled);
      this.currentAnvilIid = ent.iid;
      this.entityLayer.addChildAt(this.anvil.container, 0);
    }
  }

  private isPlayerNearAnvil(): boolean {
    if (!this.anvil) return false;
    const promptRange = 16;
    return this.anvil.overlaps(
      this.player.x - promptRange,
      this.player.y - promptRange,
      this.player.width + promptRange * 2,
      this.player.height + promptRange * 2,
    );
  }

  private updateAnvil(dt: number): void {
    if (!this.anvil) {
      if (this.anvilPrompt) this.anvilPrompt.visible = false;
      if (this.anvilDisabledPrompt) this.anvilDisabledPrompt.visible = false;
      return;
    }
    if (this.anvil.used || this.anvil.disabled) {
      this.anvil.update(dt);
      if (this.anvilPrompt) this.anvilPrompt.visible = false;
      if (this.anvil.disabled && this.isPlayerNearAnvil()) {
        this.showAnvilDisabledPrompt();
      } else if (this.anvilDisabledPrompt) {
        this.anvilDisabledPrompt.visible = false;
      }
      return;
    }

    this.anvil.update(dt);
    if (this.anvilDisabledPrompt) this.anvilDisabledPrompt.visible = false;

    const near = this.isPlayerNearAnvil();
    this.anvil.setShowHint(false); // disable built-in hint ??use KeyPrompt instead

    // KeyPrompt — create lazily, show/hide + position in uiContainer.
    // Pattern A(Modal): C(ATTACK) 키로 인벤토리(Anvil 모드) 열기 → 아이템
    // 선택 즉시 Item World 진입 (strike 단계 없음). 무기 장착 여부와 무관하게
    // 다가가면 항상 prompt 를 띄워 "C 로 진행 가능"을 일관되게 알린다.
    if (near) {
      if (!this.anvilPrompt) {
        this.anvilPrompt = KeyPrompt.createPrompt(actionKey(GameAction.ATTACK), t('prompt.place_weapon'), this.game.uiScale);
      }
      if (!this.anvilPrompt.parent) {
        this.game.uiContainer.addChild(this.anvilPrompt);
      }
      this.anvilPrompt.visible = true;
      const us = this.game.uiScale;
      const cam = this.game.camera;
      const ax = this.anvil.container.x;
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

  private showAnvilDisabledPrompt(): void {
    if (!this.anvil) return;
    if (!this.anvilDisabledPrompt) {
      const us = this.game.uiScale;
      const prompt = new Container();
      const bg = new Graphics();
      bg.roundRect(0, 0, 72 * us, 18 * us, 3 * us)
        .fill({ color: 0x151515, alpha: 0.82 })
        .stroke({ color: 0x777777, width: Math.max(1, us), alpha: 0.9 });
      const label = createUiText(t('ui.world.disabled'), {
        fontFamily: PIXEL_FONT, fontSize: 7 * us, fill: 0xb8b8b8,
      });
      label.x = Math.round((72 * us - label.width) / 2);
      label.y = Math.round((18 * us - label.height) / 2);
      prompt.addChild(bg, label);
      this.anvilDisabledPrompt = prompt;
    }
    if (!this.anvilDisabledPrompt.parent) {
      this.game.uiContainer.addChild(this.anvilDisabledPrompt);
    }
    this.anvilDisabledPrompt.visible = true;

    const us = this.game.uiScale;
    const cam = this.game.camera;
    const ax = this.anvil.container.x;
    const ay = this.anvil.container.y;
    const sx = (ax - cam.renderX + GAME_WIDTH / 2) * us - this.anvilDisabledPrompt.width / 2;
    const sy = (ay - cam.renderY + GAME_HEIGHT / 2 - 56) * us;
    this.anvilDisabledPrompt.x = Math.round(sx);
    this.anvilDisabledPrompt.y = Math.round(sy);
  }

  private hideAnvilPrompts(): void {
    if (this.anvilPrompt) this.anvilPrompt.visible = false;
    if (this.anvilDisabledPrompt) this.anvilDisabledPrompt.visible = false;
  }

  /**
   * Open the unified inventory UI in "anvil" mode. The player sees the same
   * grid inventory as the regular INVENTORY key but confirming an item places
   * it on the anvil instead of equipping.
   */
  private openAnvilUI(): void {
    // Playtest 2026-04-26: retired anvil ignores all approach interaction.
    if (!this.anvil || this.anvil.disabled) return;
    if (this.inventory.items.length === 0) {
      this.toast.show(t('toast.no_items_to_place'), 0xff4444);
      return;
    }
    // ?�레?�어가 ?�빌???�달 ???�내??tether ?�무 ?�료.
    this.activeAnvilTether?.requestFadeOut();
    // Hide the approach prompt while the inventory is open ??it would
    // otherwise bleed through the translucent inventory overlay. If the
    // player cancels, updateAnvil re-shows it on the next frame.
    this.hideAnvilPrompts();
    this.inventoryUI.openForAnvil((item) => {
      // Cannot place equipped weapon on anvil
      if (this.inventory.equipped?.uid === item.uid) {
        this.toast.show(t('toast.unequip_first'), 0xff4444);
        return;
      }
      // Starter-only weapons (e.g. the Broken Sword) have no item world ??
      // they are story props, not dive-able loot. Block placement outright.
      if (STARTER_ONLY_IDS.has(item.def.id)) {
        this.toast.show(t('toast.cannot_dive_broken'), 0xff4444);
        return;
      }
      // Fully cleared item — demo blocks re-dive (DEMO_BLOCK_REDIVE).
      // In Phase 3+ full builds, fall through to the cycle-prompt overlay.
      if (isItemFullyCleared(item)) {
        if (DEMO_BLOCK_REDIVE) {
          this.toast.show(t('toast.memory_exhausted'), 0xff8844);
          this.inventoryUI.close();
          return;
        }
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
    bg.rect(0, 0, panelW, panelH).fill({ color: MODAL_BG, alpha: 0.96 });
    bg.rect(0, 0, panelW, panelH).stroke({ color: 0xff8844, width: 1 });
    bg.x = px;
    bg.y = py;
    ui.addChild(bg);

    const title = new BitmapText({
      text: t('ui.cycle.already_echoed'),
      style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0xff8844 },
    });
    title.x = px + 8;
    title.y = py + 6;
    ui.addChild(title);

    const nextCycle = (item.worldProgress?.cycle ?? 0) + 1;
    const lines = [
      `${item.def.name}`,
      '',
      t('ui.cycle.dive_again_prompt'),
      t('ui.cycle.enemies_sharper'),
      '',
      t('ui.cycle.label', { n: nextCycle }),
      '',
      `[${actionKey(GameAction.ATTACK)}] ${t('ui.cycle.dive_action')}   [${actionKey(GameAction.MENU)}] ${t('ui.cycle.cancel_action')}`,
    ];
    for (let i = 0; i < lines.length; i++) {
      const fill = i === 0 ? TEXT_WARNING : i === lines.length - 1 ? TEXT_SECONDARY : TEXT_PRIMARY;
      const tx = new BitmapText({
        text: lines[i],
        style: { fontFamily: PIXEL_FONT, fontSize: FONT_HINT, fill },
      });
      tx.x = px + 8;
      tx.y = py + 18 + i * 8;
      ui.addChild(tx);
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
      this.toast.show(t('toast.cycle_rewind', { n: item.worldProgress?.cycle ?? 0 }), 0xff8844);
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
    this.renderer.rebuildWallLayer(filteredTiles, this.atlases, this.collisionGrid);
    this.applyTerrainFilterAreas(this.currentLevel.pxWid, this.currentLevel.pxHei);
  }

  /**
   * Runtime solidification can create WALL cells where LDtk has no baked wall
   * auto-tile. Draw those cells explicitly so hardened magma is opaque.
   */
  private rebuildSolidifiedWallOverlay(): void {
    const g = this.solidifiedWallGfx;
    if (!g) return;
    g.clear();
    for (const key of this.solidifiedWallCells) {
      const ix = key.indexOf(',');
      const gx = +key.slice(0, ix);
      const gy = +key.slice(ix + 1);
      if (this.collisionGrid[gy]?.[gx] !== TILE_WALL) continue;
      const x = gx * TILE_SIZE;
      const y = gy * TILE_SIZE;
      g.rect(x, y, TILE_SIZE, TILE_SIZE).fill({ color: 0x2b2520, alpha: 1 });
      g.rect(x, y, TILE_SIZE, 2).fill({ color: 0x8a4c2b, alpha: 1 });
      g.rect(x + 2, y + 4, TILE_SIZE - 4, 1).fill({ color: 0x4d382c, alpha: 0.9 });
      g.rect(x + 1, y + TILE_SIZE - 2, TILE_SIZE - 2, 1).fill({ color: 0x171310, alpha: 0.85 });
    }
  }

  private applyTerrainFilterAreas(width: number, height: number): void {
    // Pixi's automatic filter bounds can drift when filtered world layers are
    // rendered into the camera RT under a translated parent. The failure mode
    // is severe: palette-filtered terrain disappears and the screen looks
    // almost black while unfiltered sprites remain. Pin the filter/bounds area
    // in each layer's local level coordinates so camera movement cannot affect
    // the computed filter input.
    const area = new Rectangle(0, 0, width, height);
    const apply = (layer?: Container | null) => {
      if (!layer) return;
      layer.filterArea = area;
      layer.boundsArea = area;
    };
    apply(this.renderer.bgLayer);
    apply(this.renderer.wallLayer);
    apply(this.renderer.interiorLayer);
    apply(this.renderer.shadowLayer);
    apply(this.procDecorator?.naturalLayer);
    apply(this.procDecorator?.artificialLayer);
    apply(this.procDecorator?.structureLayer);
  }

  private triggerFloorCollapse(): void {
    if (!this.anvil || !this.collapseItem) return;

    this.diveTransitionActive = true;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.savePrevPosition();
    this.anvil.used = true;
    this.anvil.setShowHint(false);

    // All anvils are reusable ??snapshot position for player return point.
    this.lastUsedAnvilPos = {
      x: this.anvil.x,
      y: this.anvil.y,
      width: this.anvil.width,
      height: this.anvil.height,
    };
    this.lastUsedAnvilLevelId = this.currentLevel?.identifier ?? null;

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
    const hadFirstBossClear = sacredSave.isFirstItemWorldBossDefeated();

    this.container.visible = false;
    this.detachSharedUiForItemWorld();
    // 월드 씬은 push 로 유지 (destroy 안 됨). 직전에 떠있는 골드/EXP 플로팅
    // 텍스트는 update tick 정지로 영구 잔류하므로 명시 clear.
    this.dmgNumbers?.clear();

    const itemWorldScene = new ItemWorldScene(this.game, targetItem, this.inventory, this.player);
    itemWorldScene.itemWorldTutorialDone = this.unlockedEvents.has('__itemWorldTutorialDone');
    itemWorldScene.egoUnlockedEvents = this.unlockedEvents;
    itemWorldScene.onComplete = () => {
      this.game.sceneManager.pop();
      this.updatePlayerAtk();
      // Only set after first IW boss kill — see other onComplete site for rationale.
      if (sacredSave.isFirstItemWorldBossDefeated()) {
        this.unlockedEvents.add('__itemWorldTutorialDone');
      }
      // Second and final inventory cue: only after the first IW boss clear.
      this.showFirstItemWorldReturnInventoryHint(hadFirstBossClear);

      // Collect earned gold from Item World
      if (itemWorldScene.earnedGold > 0) {
        this.gold += itemWorldScene.earnedGold;
        this.toast.show(t('toast.gold_gain', { amount: itemWorldScene.earnedGold }), 0xffd700);
      }

      if (targetItem.level > prevLevel) {
        this.toast.show(t('toast.weapon_level_up', { name: targetItem.def.name, level: targetItem.level }), 0xff88ff);
      }
      if (this.player.atk !== prevAtk) {
        this.toast.show(t('toast.atk_change', { prev: prevAtk, next: this.player.atk }), 0xffff44);
      }

      // ── Ego T14 / Anvil retirement (Playtest 2026-04-26) ──
      this.fireWorldReturnDialogue(targetItem.def.id);
      this.retireFirstAnvilAfterBossClear(hadFirstBossClear);

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
      const hadFirstBossClear = sacredSave.isFirstItemWorldBossDefeated();
      const itemWorldScene = new ItemWorldScene(this.game, item, this.inventory, this.player);
      itemWorldScene.itemWorldTutorialDone = this.unlockedEvents.has('__itemWorldTutorialDone');
      itemWorldScene.egoUnlockedEvents = this.unlockedEvents;
      itemWorldScene.onComplete = () => {
        this.game.sceneManager.pop();
        this.updatePlayerAtk();
        // Only set after first IW boss kill — see other onComplete site for rationale.
        if (sacredSave.isFirstItemWorldBossDefeated()) {
          this.unlockedEvents.add('__itemWorldTutorialDone');
        }
        // Second and final inventory cue: only after the first IW boss clear.
        this.showFirstItemWorldReturnInventoryHint(hadFirstBossClear);
        // Collect earned gold from Item World
        if (itemWorldScene.earnedGold > 0) {
          this.gold += itemWorldScene.earnedGold;
          this.toast.show(t('toast.gold_gain', { amount: itemWorldScene.earnedGold }), 0xffd700);
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
      .filter(r => r.roomType !== 'Debug' && r.roomType !== 'Cinematic' && !r.id.startsWith('Debug_'));
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

    // Fog of war: visited + adjacent (outlined). Secret 방은 *방문 전 outline 비공개*
    // — adjacentIds 에 추가되지 않게 필터. 방문 후엔 visited 분기에서 정상 렌더.
    const visitedIds = this.visitedLevels;
    const clearedIds = this.clearedLevels;
    const adjacentIds = new Set<string>();
    for (const id of visitedIds) {
      const level = this.loader.getLevel(id);
      if (level) {
        for (const nb of level.neighbors) {
          if (visitedIds.has(nb)) continue;
          const nbLevel = this.loader.getLevel(nb);
          if (nbLevel?.secret) continue;     // Secret 방 — adjacent 표시 제외
          adjacentIds.add(nb);
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

    // T02 (FIRST_WALK) — 이전에는 픽업 후 첫 이동 시 발화했으나, 신규 흐름에서는
    // 픽업 직전 discovery 컷신(updateSacredPickup)이 EGO_FIRST_WALK 를 사용한다.
    // 따라서 walk-trigger 는 제거됨. FIRST_WALK 키는 discovery 발화 표식으로 재사용.

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

  private retireFirstAnvilAfterBossClear(hadFirstBossClear: boolean): void {
    if (hadFirstBossClear) return;
    if (!sacredSave.isFirstItemWorldBossDefeated()) return;
    if (this.lastUsedAnvilLevelId !== FIRST_ANVIL_LEVEL_ID) return;

    this.unlockedEvents.add(EGO_EVENT.ANVIL_RETIRED);
    this.unlockedEvents.add(EGO_EVENT.WORLD_RETURN);

    if (this.anvil) {
      this.anvil.used = false;
      this.anvil.item = null;
      void this.anvil.setDisabled(true);
    }
    if (this.anvilPrompt) this.anvilPrompt.visible = false;
    if (this.inventoryUI.visible && this.inventoryUI.isAnvilMode()) {
      this.inventoryUI.close();
    }
  }

  /**
   * Fire the appropriate dialogue on world return after exiting Item World.
   *
   * Branches:
   *  - First IW boss already cleared & anvil-retired dialogue not yet shown
   *      → EGO_ANVIL_RETIRED (replaces T14), then disables current anvil
   *  - Otherwise, the standard T14 "또 올 거야?" line plays once
   *
   * Both branches are gated to Ego-bearing weapons (currently Rustborn only).
   */
  private fireWorldReturnDialogue(weaponDefId: string): void {
    if (!hasEgo(weaponDefId)) return;

    const anvilRetiring = (
      sacredSave.isFirstItemWorldBossDefeated()
      && this.lastUsedAnvilLevelId === FIRST_ANVIL_LEVEL_ID
      && !this.unlockedEvents.has(EGO_EVENT.ANVIL_RETIRED)
    );

    if (anvilRetiring) {
      this.unlockedEvents.add(EGO_EVENT.ANVIL_RETIRED);
      // Suppress the T14 line permanently — anvil-retired replaces it.
      this.unlockedEvents.add(EGO_EVENT.WORLD_RETURN);
      // freeze=true — dialogue 동안 player 입력 잠금 (anvil 인터랙트 차단).
      // setTimeout 짧게 (200ms) — 화면 전환/카메라 snap 직후 발화. 1000ms 갭 동안
      // anvil 인터랙트 가능했던 사용자 피드백 (2026-05-02) 대응.
      setTimeout(async () => {
        if (this.loreDisplay && !this.loreDisplay.isActive) {
          await this.loreDisplay.showDialogue(getEgoAnvilRetired(), true);
        }
        // Disable the current anvil only after Rustborn explains it.
        await this.anvil?.setDisabled(true);
      }, 200);
      return;
    }

    if (!this.unlockedEvents.has(EGO_EVENT.WORLD_RETURN)) {
      this.unlockedEvents.add(EGO_EVENT.WORLD_RETURN);
      // freeze=true — dialogue 동안 anvil/이동 입력 차단.
      setTimeout(() => {
        if (!this.loreDisplay?.isActive) {
          void this.loreDisplay?.showDialogue(EGO_WORLD_RETURN, true);
        }
      }, 200);
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
