import { Container, Graphics, BitmapText, Assets, type Texture } from 'pixi.js';
import { Scene } from '@core/Scene';
import { Debug } from '@core/Debug';
import { SaveManager } from '@utils/SaveManager';
import { TilemapRenderer } from '@level/TilemapRenderer';
import { type UnifiedGridData, type UnifiedRoomCell } from '@level/RoomGrid';
import type { RoomGraphData } from '@level/RoomGraph';
import { createRoomGraphDebugOverlay } from '@level/RoomGraphDebugOverlay';
import { generateUnifiedGridFromGraph } from '@level/RoomGraphAdapter';
import { archetypeFor } from '@level/RoomGraphArchetypes';
import { assembleRoom, getSpawnPosition, getDoorTriggers } from '@level/ChunkAssembler';
import type { RoomCell } from '@level/RoomGrid';
import { pickTemplate, resolveTiles, TEMPLATE_W, TEMPLATE_H, type RoomTemplate, type ExitDir } from '@level/ItemWorldTemplates';
import { LdtkLoader } from '@level/LdtkLoader';
import { LdtkRenderer } from '@level/LdtkRenderer';
import type { LdtkLevel, LdtkTile } from '@level/LdtkLoader';
import { Sprite, Texture as PixiTexture, Rectangle } from 'pixi.js';
import { aabbOverlap, isInUpdraft, isInSpike, isWater, isIce, getTile, isSolid, TILE_AIR, TILE_WALL, TILE_OIL, TILE_MAGMA, TILE_WATER, TILE_METAL, TILE_ACID, isInOil, isInMagma, isInAcid, isInCyro } from '@core/Physics';
import { TileMutator } from '@systems/TileMutator';
import { TileMutatorRenderer } from '@systems/TileMutatorRenderer';
import { applyTileHazards, CYRO_FROZEN_MS, CYRO_TICK_MS, CYRO_TICK_PCT, MAGMA_BURN_DURATION_MS } from '@systems/TileHazards';
import { hazardToElement, type ElementAffinity } from '@combat/ElementAffinity';
import { applyBurnableZones, type BurnableEntitySpec } from '@level/BurnableZonePass';
import { BurnableProp } from '@entities/BurnableProp';
import { GameAction, actionKey } from '@core/InputManager';
import { Player, OIL_SLIP_DURATION_MS, OIL_RESIDUE_DURATION_MS, ACID_RESIDUE_DURATION_MS, MAGMA_RESIDUE_DURATION_MS, WATER_RESIDUE_DURATION_MS, CYRO_RESIDUE_DURATION_MS, EGO_SHARD_MAX, SHARD_RECOVERY_MS } from '@entities/Player';
import { Ghost } from '@entities/Ghost';
import { Boss01 } from '@entities/Boss01';
import { GoldenMonster } from '@entities/GoldenMonster';
import { createEnemy } from '@entities/EnemyFactory';
import { HealingPickup, createEmberShard, createForgeEmber, createAnvilFlame } from '@entities/HealingPickup';
import { GoldPickup } from '@entities/GoldPickup';
import { Spike } from '@entities/Spike';
import { CrackedFloor } from '@entities/CrackedFloor';
import { BreakableProp } from '@entities/BreakableProp';
import { Building } from '@entities/Building';
import { spawnBreakableProps } from '@systems/BreakablePropSpawner';
import { CollapsingPlatform } from '@entities/CollapsingPlatform';
import { GrowingWall } from '@entities/GrowingWall';
import { Switch } from '@entities/Switch';
import { LockedDoor, type UnlockCondition } from '@entities/LockedDoor';
import { COMBO_STEPS, getAttackHitbox } from '@combat/CombatData';
import { loadSpawnTable, getSpawnTable, pickWeightedEnemy } from '@data/itemWorldSpawnTable';
import { getEnemyStats } from '@data/enemyStats';
import { getMemoryRoom } from '@data/memoryRoomTable';
import { LoreDisplay } from '@ui/LoreDisplay';
import { t } from '@i18n';
import {
  EGO_IW_ENTER, EGO_MONSTER_FIRST, EGO_FIRST_KILL, EGO_ROOM_CLEAR,
  EGO_INNOCENT_FOUND, EGO_INNOCENT_STABLE,
  EGO_PLAYER_DEATH, EGO_BOSS_KILLED,
  EGO_REENTRY_2, EGO_REENTRY_2_BOSS, EGO_REENTRY_3,
  EGO_SWAP_RETURN, EGO_AFFINITY_MAX,
  EGO_GATEKEEPER_FIRST, EGO_GATEKEEPER_FAMILIAR,
  EGO_ARCHIVIST_FIRST, EGO_ARCHIVIST_FAMILIAR,
  EGO_SHARD_RECALL, EGO_TRAPDOOR_THANKS,
  EGO_EVENT, hasEgo, egoEntryKey, getEgoEntryCount,
} from '@data/EgoDialogue';
import { MemoryShardNPC } from '@entities/MemoryShardNPC';
import { MemoryResident, type ResidentType } from '@entities/MemoryResident';
import { Trapdoor } from '@entities/Trapdoor';
import { Anvil } from '@entities/Anvil';
import { Projectile } from '@entities/Projectile';
import { HitManager } from '@combat/HitManager';
import { HUD } from '@ui/HUD';
import { AreaTitle } from '@ui/AreaTitle';
import { UISkin } from '@ui/UISkin';
import { KeyPrompt } from '@ui/KeyPrompt';
import { ControlsOverlay } from '@ui/ControlsOverlay';
import { PIXEL_FONT } from '@ui/fonts';
import { DamageNumberManager } from '@ui/DamageNumber';
import { ToastManager } from '@ui/Toast';
import { brandLabel } from '@core/input/padGlyphs';
import { TutorialHint } from '@ui/TutorialHint';
import { SFX } from '@audio/Sfx';
import { BgmController } from '@audio/BgmController';
import { PRNG } from '@utils/PRNG';
import { addItemExp, getOrCreateWorldProgress, markItemCleared, resetItemForNextCycle, EXP_PER_LEVEL, addInnocent, canAddInnocent, RARITY_COLOR, type ItemInstance, type ItemWorldProgress } from '@items/ItemInstance';
import { sacredSave, isLowHpHealToastFired, markLowHpHealToastFired } from '@save/PlayerSave';
import { formatActivePlayerBuffsDebug, removeBeginnerGraceFromStats } from '@systems/PlayerBuffSystem';
import { INNOCENT_SPAWN_CHANCE, createRandomInnocent } from '@data/memoryShards';
import type { Inventory } from '@items/Inventory';
import { STRATA_BY_RARITY, TOPOLOGY_VALUES, type StrataConfig, type StratumDef, type TopologyKind } from '@data/StrataConfig';
import type { Enemy } from '@entities/Enemy';
import type { CombatEntity } from '@combat/HitManager';
import { ArcTether } from '@effects/ArcTether';
import { HitSparkManager } from '@effects/HitSpark';
import { PropShatterManager } from '@effects/PropShatter';
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
import { SteamPuffManager, PUFF_TINT_TOXIC, PUFF_TINT_PLASMA } from '@effects/SteamPuff';
import { AshRemnantManager } from '@effects/AshRemnant';
import { GrassClumpFireSystem } from '@effects/GrassClumpFire';
import { FluidResidueManager } from '@effects/FluidResidue';
import { FluidSystem, type ArcLink } from '@effects/FluidSystem';
import { applyFluidGenericResolution, substituteSolidGenericSprites } from '@data/ItemWorldFluidMapping';
import { FluidSpawnerManager, readFluidSpawnerEntities } from '@systems/FluidSpawner';
import { FluidCrestFoamManager } from '@effects/FluidCrestFoam';
import { EgoShardManager, EgoShardPreview, CAST_MIN_GAP_MS, CAST_CHARGE_MAX_MS, getShardVelocity, type ShardElement } from '@effects/EgoShard';
import { ThrowableContainer, parseContainerKind, type ContainerKind } from '@entities/ThrowableContainer';
import { resolveContainerSlotKind } from '@data/ContainerPools';
import { readSpawnerEntity, runContainerSpawner } from '@systems/ContainerSpawner';
import { DropThroughDustManager } from '@effects/DropThroughDust';
import { IceSkidStreakManager } from '@effects/IceSkidStreak';
import { ItemPickupGlowManager } from '@effects/ItemPickupGlow';
import { LowHpVignetteManager } from '@effects/LowHpVignette';
import { ScreenFlash } from '@effects/ScreenFlash';
import {
  create9SlicePanel,
  drawSelectionPulse,
  drawSelectionRow,
  ROW_CHEVRON_COLOR,
  ROW_SELECTED_GLOW_ALPHA,
} from '@ui/ModalPanel';
import { PaletteSwapFilter } from '@effects/PaletteSwapFilter';
import { RimLightFilter } from '@effects/RimLightFilter';
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
import { loadBundleOnce } from '@data/assetBundles';
import { UpdraftSystem } from '@systems/UpdraftSystem';
import {
  findNearestGrabbableContainer as findNearestContainerForGrab,
  startContainerGrabPull,
  updateContainerArcTether,
  updateContainerPrompt as updateContainerPromptUi,
} from '@systems/ContainerInteraction';
import {
  getEnemyRoomKey,
  isEnemyExpGranted,
  markEnemyExpGranted,
  setEnemyRoomKey,
} from '@systems/EntityRuntimeMeta';
import { ProceduralDecorator, hashString } from '@level/ProceduralDecorator';
import { ParallaxBackground } from '@level/ParallaxBackground';
import { ItemWorldConst } from '@data/constData';
import { ItemWorldUiController } from './itemworld/ItemWorldUiController';
import { ItemWorldProgressController } from './itemworld/ItemWorldProgressController';
import {
  ItemWorldMapController,
  TILE_SIZE as IW_TILE_SIZE,
  IW_GRID_W, IW_GRID_H,
  IW_ROOM_W_TILES, IW_ROOM_H_TILES,
  IW_ROOM_W_PX, IW_ROOM_H_PX,
  IW_DOOR_DEPTH, IW_DOOR_H_HEIGHT, IW_DOOR_V_WIDTH, IW_DOOR_FLOOR_ROW,
  IW_BOUNDARY_THICKNESS,
  SEAL_DEPTH,
  type DoorMask,
} from './itemworld/ItemWorldMapController';
import { ItemWorldSpawnController } from './itemworld/ItemWorldSpawnController';

const TILE_SIZE = IW_TILE_SIZE;
const ROOM_W = 60;
const ROOM_H = 34;
const FADE_DURATION = 200;
// SSoT: Sheets/Content_ConstData.csv (ItemWorld.Entry.*, ItemWorld.Exp.*)
const ENTRY_FREEZE_MS = ItemWorldConst.EntryFreezeMs;
const BASE_EXP_PER_ROOM = ItemWorldConst.BaseExpPerRoom;
const BASE_BOSS_BONUS_EXP = ItemWorldConst.BossBonusExp;
const BASE_EXP_PER_KILL = ItemWorldConst.BaseExpPerKill;
const BASE_EXP_ROOM_PASS = ItemWorldConst.BaseExpRoomPass;

const STRATUM_PICKER_W = 560;
const STRATUM_PICKER_PAD = 12;
const STRATUM_PICKER_ROW_H = 18;
const STRATUM_PICKER_ROW_GAP = 2;
const STRATUM_PICKER_LIST_W = 342;
const STRATUM_PICKER_DETAIL_W = 174;
const STRATUM_PICKER_HEADER_H = 32;
const STRATUM_PICKER_FOOTER_H = 24;
const STRATUM_PICKER_BADGE_W = 34;
const STRATUM_PICKER_RIGHT_BADGE_W = 34;
const STRATUM_PICKER_COL_TEXT = 0xcccccc;
const STRATUM_PICKER_COL_DIM = 0xaaaaaa;
const STRATUM_PICKER_COL_MUTED = 0x777777;
const STRATUM_PICKER_COL_BORDER = 0x4a4a6a;
const STRATUM_PICKER_COL_ACCENT = 0x00ced1;
const STRATUM_PICKER_COL_POSITIVE = 0x44ff44;
const STRATUM_PICKER_COL_LOCKED = 0x666666;
const STRATUM_PICKER_COL_GOLD = 0xffd700;

// SurfaceOverlay is now spot-based, so it can run in item world without
// producing long diagonal shadow/stain streaks.
const ITEM_WORLD_SURFACE_OVERLAY_ENABLED = true;


type TransitionState = 'none' | 'fade_out' | 'fade_in' | 'exit_fade' | 'post_clear_hold' | 'descent_fall';

// DEC-039 Trapdoor 침강 시퀀스 타이밍 (ms).
//   1) descent_pan   = 카메라 다운 패닝 (페이드 알파 0 → 1)
//   2) descent_warp  = 텔레포트 직후 페이드 유지
//   3) descent_in    = 페이드 알파 1 → 0 (다음 Plaza 천장 등장)
const DESCENT_PAN_MS = 800;
const DESCENT_WARP_HOLD_MS = 200;
const DESCENT_IN_MS = 400;
const DESCENT_TOTAL_MS = DESCENT_PAN_MS + DESCENT_WARP_HOLD_MS + DESCENT_IN_MS;
const DESCENT_CAMERA_DROP_PX = 96;

export class ItemWorldScene extends Scene {
  /**
   * Production-safe scene-type marker. FeedbackPanel reads this to log the
   * correct `area` field (analytics) without relying on `constructor.name`,
   * which gets mangled by Vite/Rollup minification.
   */
  readonly isItemWorld = true;
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
  /**
   * Room-key (`${col}:${absRow}`) → ItemSpawner entity 의 unified-grid pixel
   * 위치 배열. buildFullMap 에서 LDtk 템플릿의 ItemSpawner 엔티티를 스캔해
   * 채운다. spawnRoomRewards 가 룸 입장 시 이 목록 위치에 보상을 spawn.
   * (2026-05-18 — 랜덤 위치 → designer-placed ItemSpawner 로 전환)
   */
  private roomItemSpawners: Map<string, Array<{ x: number; y: number }>> = new Map();
  /** DEC-038 Town of Orphaned Shadows — hub Gatekeeper / shrine Librarian. */
  private memoryResidents: MemoryResident[] = [];
  /**
   * 주민 전용 layer — fullMapContainer (grid) 바로 위, entityLayer (player/vfx)
   * 바로 아래. 주민이 grid 위로는 보이지만 player/이펙트 뒤로 가도록 z 정렬.
   * (사용자 요청 2026-05-02 — "주민 렌더링 순서를 grid 다음으로 올려")
   */
  private residentsLayer!: Container;
  /** Building layer — entityLayer 보다 뒤 (player 뒤로 렌더링). */
  private buildingLayer!: Container;
  /**
   * 셀별 LdtkRenderer 4 layer (bg/wall/special/shadow) 그룹 — 매 프레임 viewport
   * 검사 후 visible toggle 로 화면 밖 cell 의 draw 차단 (사용자 결정 2026-05-04,
   * Rare+ 의 sprite 수만 대응). PIXI 자동 culling 이 filter/aggregate 트리에서
   * 기대만큼 작동 안 해 명시 visible 로 강제.
   */
  private cellLayerGroups: Array<{
    col: number;
    row: number;
    layers: Container[];
  }> = [];
  private visibleCellWindowKey = '';
  /**
   * DEC-039 Trapdoor 침강. 보스 처치 시 보스 룸 바닥 D 위치에 spawn,
   * 공격 키 인터랙트로 다음 Plaza 천장으로 텔레포트 (마지막 지층은 월드 귀환).
   */
  private trapdoor: Trapdoor | null = null;
  /**
   * LDtk-placed Anvils inside ItemStratum levels. Acts as an in-world exit:
   * approach → KeyPrompt → ATTACK opens EscapeConfirm (same flow as MENU/ESC).
   * One Anvil class per instance (visual halo + sparks); built-in symbol prompt
   * is suppressed in favor of the standard KeyPrompt pattern.
   */
  private itemWorldAnvils: Anvil[] = [];
  private itemWorldAnvilPrompt: Container | null = null;
  /** 침강 시퀀스 진행 누적 ms. transitionState='descent_fall' 동안만 갱신. */
  private descentTimer = 0;
  /** 텔레포트 완료 표식 — 시퀀스 중 한 번만 수행 보장. */
  private descentWarpDone = false;
  /** 마지막 지층 보스 처치 후 = true. 침강 시퀀스 끝에서 월드 귀환으로 분기. */
  private descentToWorld = false;
  /** 카메라 다운 패닝 시작 시점 cam.y. */
  private descentStartCamY = 0;
  /**
   * Entry sequencing: 시작 룸의 Gatekeeper/Librarian + ambient 스폰을 입장 대사
   * 완료까지 보류한다. true 가 되면 hub/shrine 분기가 정상 스폰을 수행.
   */
  private startSpawnDone = false;
  private dropRng = new PRNG(99999);
  private hitManager!: HitManager;
  private entityLayer!: Container;
  private fluidLayer!: Container;
  private aboveFluidLayer!: Container;
  private fluidSystem!: FluidSystem;
  private fluidSpawners!: FluidSpawnerManager;
  private fluidCrestFoam!: FluidCrestFoamManager;
  /** Last frame's "player in non-water fluid (magma/oil/acid)" flag — used
   *  for entry/exit splash + impulse parity with LdtkWorldScene. */
  private prevPlayerInOtherFluid = false;
  /** Same as above but per-enemy (index-aligned with this.enemies). */
  private prevEnemyInOtherFluid: boolean[] = [];
  /** Set when TileMutator mutates a wall tile (ice melt, metal corrode,
   *  oil/wood burnout, etc). Cleared in update() after a single fluid
   *  refresh — coalesces many same-frame mutations into one rebuild. */
  private fluidGridDirty = false;
  /** Oxygen vignette + bar overlays (lazy-created on first submersion). */
  private oxygenOverlay: Graphics | null = null;
  private oxygenBar: Graphics | null = null;
  /**
   * Mutation mask — covers air cells that used to be wood/grass/oil with a
   * black rect so the wall sprite (which was baked into wallAggregate at
   * buildFullMap time) doesn't keep showing through after burnout. Mirrors
   * LdtkWorldScene's `rerenderTilemap` filter, but the ItemWorld aggregate
   * pipeline isn't per-cell, so a paint-over mask is the cheap parity.
   */
  private mutationMaskGfx: Graphics | null = null;
  /** Air cells produced by TileMutator burnout / corrode (key = "gx,gy"). */
  private mutatedCells: Set<string> = new Set();
  /** New WALL cells produced after aggregate bake, currently hardened magma. */
  private solidifiedWallGfx: Graphics | null = null;
  private solidifiedWallCells: Set<string> = new Set();
  private hud!: HUD;
  private areaTitle!: AreaTitle;
  private uiController!: ItemWorldUiController;
  private progressController!: ItemWorldProgressController;
  private mapController!: ItemWorldMapController;
  private spawnController!: ItemWorldSpawnController;
  private controlsOverlay!: ControlsOverlay;
  private dmgNumbers!: DamageNumberManager;
  private hitSparks!: HitSparkManager;
  private propShatter!: PropShatterManager;
  private containerFluidDirty = false;
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
  private steamPuff!: SteamPuffManager;
  private ashRemnant!: AshRemnantManager;
  private grassClumpFire = new GrassClumpFireSystem();
  private fluidResidue!: FluidResidueManager;
  private egoShard!: EgoShardManager;
  private egoShardPreview!: EgoShardPreview;
  private egoCastChargeMs = 0;
  private containers: ThrowableContainer[] = [];
  private heldContainer: ThrowableContainer | null = null;
  private containerPrompt: Container | null = null;
  /** Arc Tether pull animation state (mirrors LdtkWorldScene). */
  private pullingContainer: ThrowableContainer | null = null;
  private pullStartX = 0;
  private pullStartY = 0;
  private pullElapsedMs = 0;
  private arcTether: ArcTether | null = null;
  private waterBubbles!: WaterBubblesManager;
  private dropThroughDust!: DropThroughDustManager;
  private iceSkidStreak!: IceSkidStreakManager;
  private itemPickupGlow!: ItemPickupGlowManager;
  private lowHpVignette!: LowHpVignetteManager;
  private screenFlash!: ScreenFlash;
  private hudSkin: UISkin | null = null;
  private itemWorldReduceVisualCost = false;
  private toast!: ToastManager;
  /** Gamepad hot-plug 토스트 unsubscribe — destroy 시 호출. */
  private _gpUnsub: (() => void) | null = null;
  private tutorialHint!: TutorialHint;
  // A15: innocent capture seal orbs ? rise from capture point, home to player
  private captureOrbs: { gfx: Graphics; x: number; y: number; vx: number; vy: number; life: number; maxLife: number }[] = [];
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

  // Last non-boss room coords for first-entry respawn
  private lastSafeRoomCol = 0;
  private lastSafeRoomRow = 0;

  // Unified grid (all strata combined)
  private earnedExp = 0;
  earnedGold = 0;
  /** 아이템계 진입 시점의 보관된 골드 — HUD 표시는 baselineGold + earnedGold 누계. */
  private baselineGold = 0;
  private roomsCleared = 0;
  private totalRooms = 0;
  private unifiedGrid!: UnifiedGridData;
  /** Per-stratum graphs from the adapter — node.layout.x/y carry grid (col,row). */
  private roomGraphs: RoomGraphData[] = [];
  // DEC-037 PR-B debug overlay (?debug=graph + Shift+2 toggle). Untouched by gameplay.
  private roomGraphDebugContainer: Container | null = null;
  private roomGraphDebugVisible = false;
  private roomGraphDebugKeyHandler: ((e: KeyboardEvent) => void) | null = null;
  // Dev: Shift+L cycles ?topology= and reloads. Validation aid for 10 topologies on a single weapon.
  private topologyCycleKeyHandler: ((e: KeyboardEvent) => void) | null = null;
  // Dev: persistent label showing the active topology source + name (always visible).
  private topologyLabel: BitmapText | null = null;
  private currentCol = 0;
  private currentRow = 0; // absolute row in unified grid
  private roomData: number[][] = [];
  private rng!: PRNG;
  private entryFreezeTimer = ENTRY_FREEZE_MS;

  // Full-map rendering (all rooms rendered into one continuous grid)
  private fullGrid: number[][] = [];
  /** Cells written by door-mask seal (code-generated walls, not LDtk). */
  private sealedCells = new Set<string>();
  private fullMapContainer: Container | null = null;
  /** Palette-swap filter for background tiles (production default). */
  private bgPaletteFilter!: PaletteSwapFilter;
  /** Palette-swap filter for wall + shadow tiles (dark, cool row). */
  private wallPaletteFilter!: PaletteSwapFilter;
  /** Palette-swap filter for natural decorations (reduced strength). */
  private naturalPaletteFilter!: PaletteSwapFilter;
  /**
   * Aggregate layer containers sitting INSIDE fullMapContainer. All rooms'
   * bg/wall/shadow sub-layers are re-parented into these so the palette
   * filter sees ONE continuous target ? otherwise each per-room filter
   * instance has its own filter bounds and the depth gradient visibly
   * resets at every room seam. Rebuilt alongside fullMapContainer.
   */
  private bgAggregate: Container | null = null;
  private interiorAggregate: Container | null = null;
  private wallAggregate: Container | null = null;
  private shadowAggregate: Container | null = null;
  /** Filter-free aggregate for hazard/signal tiles (water/spike/updraft/...). */
  private specialAggregate: Container | null = null;
  private sealAggregate: Container | null = null;
  private decoAggregate: Container | null = null;
  private artificialDecoAggregate: Container | null = null;
  private structAggregate: Container | null = null;
  private _procDecoEnabled = false;
  private _themeSlug = 'habitat';
  private parallaxBG!: ParallaxBackground;

  // Updraft (IntGrid value 4) ? particles + force handled per-frame
  private updraftSystem!: UpdraftSystem;
  /** Dynamic IntGrid state (frozen/burning/electric). Reset per floor. */
  private tileMutator = new TileMutator();
  /** Renders frozen/burning/electric overlays on top of static tile sprites. */
  private tileMutatorRenderer: TileMutatorRenderer | null = null;
  /** Tier B burnable entities spawned by BurnableZonePass. Reset per floor. */
  private burnableProps: BurnableProp[] = [];

  // LDtk-placed static entities (Option A: 7 hazard/puzzle types)
  private spikes: Spike[] = [];
  private crackedFloors: CrackedFloor[] = [];
  private breakableProps: BreakableProp[] = [];
  private collapsingPlatforms: CollapsingPlatform[] = [];
  private growingWalls: GrowingWall[] = [];
  private switches: Switch[] = [];
  private lockedDoors: LockedDoor[] = [];
  /** 수동 배치 Building (LDtk Entity 'Building') — 시각 데코, 충돌 없음. */
  private buildings: Building[] = [];
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
  // Breakable tile (IntGrid 9) hit tracking ? 3 swings to destroy
  private breakableHits: Map<string, number> = new Map(); // "tileCol,tileRow" → hits taken
  private breakableHitThisSwing: Set<string> = new Set();
  private breakableLastCombo = -1;

  // Memory Room (Phase 0: lore pause rooms). Populated in init() for the current item.
  private memoryRoomPlacements: Map<string, LdtkLevel> = new Map(); // "col:absRow" → memory template

  /**
   * Player entity spawn (DEC-038): LDtk Start 템플릿의 Player entity 가 권위.
   * buildFullMap 가 각 stratum 의 startRoom ldtkLevel 에서 entity.type === 'Player'
   * 를 찾아 stratumIndex 키로 캐시. init() 의 첫 스폰과, jumpToStratum 으로
   * 지층을 내려갈 때(보스 처치 후 continue / stratum picker) 의 스폰 권위.
   */
  private playerSpawnByStratum: Map<number, { x: number; y: number }> = new Map();
  private memoryTriggers: Array<{
    x: number; y: number; w: number; h: number;
    text: string;
    speaker?: string;
    portrait?: string;
    active: boolean; // currently inside the trigger ? reset on exit to allow re-read
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
  private lookHoldTimer = 0;
  private transitionTimer = 0;
  private pendingDirection: 'left' | 'right' | 'up' | 'down' | null = null;

  private exitTracked = false;
  private fadeOverlay!: Graphics;
  private doorTriggers: ReturnType<typeof getDoorTriggers> = [];

  // Door markers
  private doorMarkers: Graphics[] = [];

  // Minimap
  private miniMapContainer!: Container;

  // Escape confirm dialog

  // Stratum picker (shown on entry when player has unlocked >1 stratum)
  private stratumPicker: Container | null = null;
  private stratumPickerVisible = false;
  private stratumPickerSelection = 0;
  private stratumPickerMax = 0;
  private stratumPickerPulseTimer = 0;
  private stratumPickerPulseG: Graphics | null = null;
  private stratumPickerPulseRect: { x: number; y: number; w: number; h: number } | null = null;

  // Onboarding — last line uses live keybindings via getter (preset-aware).
  private static getOnboardingMsgs(): string[] {
    return [
      t('ui.iw.onboarding_entered'),
      t('ui.iw.onboarding_descend'),
      t('ui.iw.onboarding_controls', {
        menu: actionKey(GameAction.MENU),
        jump: actionKey(GameAction.JUMP),
      }),
    ];
  }
  // Callback when done
  onComplete: (() => void) | null = null;

  /** Set to true if the global Item World tutorial has already been completed. */
  itemWorldTutorialDone = false;

  // ── Ego dialogue state (per-entry, not saved) ──
  private egoActive = false;          // true if current item has Ego
  private egoEntryCount = 0;          // how many times player entered this item's world
  private egoFlags = new Set<string>(); // fired triggers this entry (reset each entry)
  /** Passed from LdtkWorldScene — shared unlockedEvents for persistence. */
  egoUnlockedEvents: Set<string> = new Set();

  constructor(game: Game, item: ItemInstance, inventory: Inventory, sourcePlayer: Player) {
    super(game);
    this.item = item;
    this.inventory = inventory;
    this.sourcePlayer = sourcePlayer;
  }

  async init(): Promise<void> {
    // Resolve visual theme from weapon definition (themeId: "T-HABITAT" → "habitat")
    const themeSlug = (this.item.def.themeId ?? 'T-HABITAT').toLowerCase().replace('t-', '');
    this._themeSlug = themeSlug;
    const ua = navigator.userAgent || '';
    this.itemWorldReduceVisualCost =
      /iPad|iPhone|iPod/.test(ua) ||
      (/Macintosh/.test(ua) && (navigator.maxTouchPoints || 0) > 1);
    // ItemWorld 전용 적/주민/스위치 스프라이트를 entity 가 개별 Assets.load 로
    // 부르기 전에 그룹 prefetch — 첫 진입 hitch 회피 (pixijs-references P1).
    void loadBundleOnce('item_world');
    const hudSkin = new UISkin();
    this.hudSkin = hudSkin;
    const hudSkinLoad = hudSkin.load().catch((e) => {
      // eslint-disable-next-line no-console
      console.warn('[UISkin] load failed — falling back to Graphics HUD:', e);
    });
    // Lazy-load tilesets for this theme's palette rows
    const areaIds = [`iw_${themeSlug}_bg`, `iw_${themeSlug}_wall`];
    await ensureAreaTilesetsLoaded(areaIds, this.atlases);
    this.atlas =
      this.atlases['atlas/world_01.png'] ??
      Object.values(this.atlases)[0] ??
      null;
    try {
      const json = await fetch(assetPath('assets/World_ProjectAbyss.ldtk')).then(r => r.json());
      this.ldtkLoader = new LdtkLoader();
      this.ldtkLoader.load(json, 'ItemStratum');
      this.ldtkTemplates = this.ldtkLoader.getLevelIds().map(id => this.ldtkLoader!.getLevel(id)!);
      this.ldtkRenderer = new LdtkRenderer();

      // Manual Tiles layers (e.g. Buildings) reference tilesets that aren't
      // covered by area palettes. Load any tilesetPath used by extraTileLayers
      // so buildSprite can resolve them.
      const extraTilesetPaths = new Set<string>();
      for (const lvl of this.ldtkTemplates) {
        for (const tiles of Object.values(lvl.extraTileLayers)) {
          for (const t of tiles) {
            if (t.tilesetPath) extraTilesetPaths.add(t.tilesetPath);
          }
        }
      }
      await Promise.all(
        Array.from(extraTilesetPaths).map(async (relPath) => {
          if (this.atlases[relPath]) return;
          try {
            this.atlases[relPath] = (await Assets.load(assetPath(`assets/${relPath}`))) as Texture;
          } catch (err) {
            console.warn(`[ItemWorld] failed to load extra tileset "${relPath}":`, err);
          }
        }),
      );
    } catch (e) {
      console.warn('[ItemWorld] LDtk templates not found, using code templates');
    }

    // Procedural decorations (always on; ?noproc to disable)
    this._procDecoEnabled = !new URLSearchParams(window.location.search).has('noproc');

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
      Debug.log('[ItemWorld] Re-dive: progress reset for cycle', this.progress.cycle);
    }

    // ── Ego init ──
    this.egoActive = hasEgo(this.item.def.id);
    if (this.egoActive) {
      // Increment entry count
      this.egoEntryCount = getEgoEntryCount(this.egoUnlockedEvents) + 1;
      this.egoUnlockedEvents.add(egoEntryKey(this.egoEntryCount));
    }
    this.rng = new PRNG(this.item.uid * 1000);

    // Analytics: item world entry
    trackItemWorldEnter(this.item.rarity);

    this.hitManager = new HitManager(this.game);

    // First-dive 온보딩: 첫 아이템계 보스를 처치하기 전에는 모든 아이템이 1지층만 갖는다.
    // 레어리티 무관 (Normal/Magic/Rare/...) 의 글로벌 게이트.
    if (!sacredSave.isFirstItemWorldBossDefeated() && this.strataConfig.strata.length > 1) {
      this.strataConfig = { strata: [this.strataConfig.strata[0]] };
      Debug.log('[ItemWorld] First-boss onboarding: strata truncated to 1.');
    }

    // DEC-037: Radial Ant Colony topology — RoomGraph 어댑터가 단일 경로.
    // Phase 1: 무기별 topologyOverride 가 있으면 stratum 의 토폴로지를 강제 교체.
    // Dev: ?topology=ring 같은 쿼리스트링이 있으면 그것이 최우선 (검증용).
    const urlTopologyRaw = new URLSearchParams(window.location.search)
      .get('topology')?.trim().toLowerCase() ?? '';
    const urlTopology: TopologyKind | undefined = TOPOLOGY_VALUES.has(urlTopologyRaw as TopologyKind)
      ? (urlTopologyRaw as TopologyKind)
      : undefined;
    if (urlTopology) Debug.log(`[ItemWorld] URL topology override: ${urlTopology}`);
    // DEC-039 archetype 매핑 — 무기의 (주색, 부색) 기질 → 7 archetype 중 하나.
    // 미지정 시 'zigzag' fallback. URL ?archetype= 으로 dev 측 강제 가능.
    const urlArchRaw = new URLSearchParams(window.location.search)
      .get('archetype')?.trim().toLowerCase() ?? '';
    const validArchetypes = new Set([
      'direct', 'zigzag', 'switchback', 'spiral', 'wide_sprawl', 'crooked', 'branchy_maze',
    ]);
    const archetype = validArchetypes.has(urlArchRaw)
      ? (urlArchRaw as ReturnType<typeof archetypeFor>)
      : archetypeFor(this.item.def.temperamentPrimary, this.item.def.temperamentSecondary);
    Debug.log(`[ItemWorld] archetype: ${archetype} (primary=${this.item.def.temperamentPrimary ?? '-'} secondary=${this.item.def.temperamentSecondary ?? '-'})`);
    const adapterResult = generateUnifiedGridFromGraph(
      this.strataConfig.strata,
      this.item.uid,
      urlTopology ?? this.item.def.topologyOverride,
      archetype,
    );

    // Dev: persistent topology label (top-left). Shows which source picked the topology.
    this.initTopologyLabel(urlTopology);
    this.unifiedGrid = adapterResult.unifiedGrid;
    this.roomGraphs = adapterResult.graphs;

    // DEC-037 PR-B: optional graph debug overlay (?debug=1 또는 ?debug=graph). Shift+2 토글.
    this.maybeInitRoomGraphDebug();

    // Dev: Shift+L = cycle ?topology= and reload (검증용 핫키).
    this.initTopologyCycleKey();

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

    // Dead Cells-style palette swap ? production default.
    // Rarity picks BG+WALL palette pair; BG is hue-rich/warm, WALL is
    // dark/complementary. Built once; applied to aggregate containers each
    // rebuild so the gradient is continuous across all rooms.
    // See: Documents/Research/DeadCells_GrayscalePalette_Research.md
    {
      // Data-driven biome: weapon's ThemeID picks an AreaID pair.
      // Fallback to T-HABITAT if theme palette not found.
      const bgId = `iw_${this._themeSlug}_bg`;
      const wallId = `iw_${this._themeSlug}_wall`;
      const bgEntry = getAreaPalette(
        getAreaPaletteAtlas().rowIndex.has(bgId) ? bgId : 'iw_habitat_bg',
      );
      const wallEntry = getAreaPalette(
        getAreaPaletteAtlas().rowIndex.has(wallId) ? wallId : 'iw_habitat_wall',
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

      // VisualSeed micro-variation ? same theme, different weapon = subtly different feel
      const visualRng = new PRNG(hashString(this.item.def.id));
      const brightnessShift = visualRng.nextFloat(-0.08, 0.08);
      const depthBiasShift = visualRng.nextFloat(-0.05, 0.05);
      this.bgPaletteFilter.setBrightness((bgEntry.brightness ?? 1.0) + brightnessShift);
      this.bgPaletteFilter.setDepthBias((bgEntry.depthBias ?? 0.35) + depthBiasShift);
      this.wallPaletteFilter.setBrightness((wallEntry.brightness ?? 1.0) + brightnessShift * 0.5);
    }

    // Parallax background (behind everything ? index 0)
    this.parallaxBG = new ParallaxBackground();
    this.game.backgroundContainer.addChild(this.parallaxBG.container);
    {
      const bgEntry = getAreaPalette(`iw_${this._themeSlug}_bg`);
      const atlas = getAreaPaletteAtlas();
      // DEC-039 안 A: parallax 도 통일 좌표 전체 크기로 설정.
      const totalCols = this.unifiedGrid.totalWidth;
      const totalRows = this.unifiedGrid.totalHeight;
      this.parallaxBG.setup(bgEntry, totalCols * IW_ROOM_W_PX, totalRows * IW_ROOM_H_PX, {
        texture: atlas.texture,
        rowCount: atlas.rowCount,
        row: getAreaPaletteRow(bgEntry.id),
      });
    }

    // Building layer — fullMapContainer (platform/wall tile) 보다도 뒤로.
    // fullMapContainer 가 addChildAt(0) 으로 강제 삽입되므로 단순 addChild 순서로는
    // 뒤에 못 둠. sortableChildren + 음수 zIndex 로 강제.
    this.container.sortableChildren = true;
    this.buildingLayer = new Container();
    this.buildingLayer.zIndex = -1;
    this.container.addChild(this.buildingLayer);

    // Residents layer — grid 위, entityLayer 아래. addChild 순서가 z 결정.
    this.residentsLayer = new Container();
    this.container.addChild(this.residentsLayer);

    // Entity layer
    this.entityLayer = new Container();
    this.container.addChild(this.entityLayer);
    this.grassClumpFire.setFireLayer(this.entityLayer);

    // Tile mutator overlay (fire/ice/electric VFX).
    this.tileMutatorRenderer = new TileMutatorRenderer(this.entityLayer);

    // Dynamic fluid layer — flood-fill polygon mesh for water/oil/acid/magma
    // cells. Lives above the entity layer so fluid bodies cover the player
    // when submerged. Mirrors LdtkWorldScene wiring.
    this.fluidLayer = new Container();
    this.container.addChild(this.fluidLayer);
    this.fluidSystem = new FluidSystem(this.fluidLayer);
    {
      const _fsDebug = new URLSearchParams(window.location.search).has('debug');
      this.fluidSpawners = new FluidSpawnerManager(this.fluidLayer, _fsDebug ? this.entityLayer : null);
      const _reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
      this.fluidCrestFoam = new FluidCrestFoamManager(this.fluidLayer, _reduceMotion);
    }

    // Above-fluid overlay — fire sprites + ember + smoke render here so
    // they appear OVER oil pools / water surface.
    this.aboveFluidLayer = new Container();
    this.container.addChild(this.aboveFluidLayer);
    this.tileMutatorRenderer.setAboveFluidLayer(this.aboveFluidLayer);

    // Updraft system (shared physics + particles)
    this.updraftSystem = new UpdraftSystem(this.entityLayer);

    // Player (clone stats from world player)
    this.player = new Player(this.game);
    this.player.fluidOverlayQuery = (x, y, w, h) => this.fluidSpawners.queryTileAtAabb(x, y, w, h, this.fullGrid);
    this.player.hp = this.sourcePlayer.hp;
    this.player.maxHp = this.sourcePlayer.maxHp;
    this.player.atk = this.sourcePlayer.atk;
    this.player.def = this.sourcePlayer.def;
    this.player.equippedWeaponId = this.sourcePlayer.equippedWeaponId;
    this.player.equippedWeaponType = this.sourcePlayer.equippedWeaponType;
    this.player.equippedRarity = this.sourcePlayer.equippedRarity;
    this.player.attackHitboxMul = this.sourcePlayer.attackHitboxMul;
    this.player.abilities.dash = this.sourcePlayer.abilities.dash;
    this.player.abilities.diveAttack = this.sourcePlayer.abilities.diveAttack;
    this.player.abilities.surge = this.sourcePlayer.abilities.surge;
    this.player.abilities.waterBreathing = this.sourcePlayer.abilities.waterBreathing;
    this.player.abilities.wallJump = this.sourcePlayer.abilities.wallJump;
    this.player.abilities.doubleJump = this.sourcePlayer.abilities.doubleJump;
    // Flask fixed at 3 ? rarity scaling is a future upgrade element
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
    if (!this.arcTether) {
      this.arcTether = new ArcTether();
      this.entityLayer.addChild(this.arcTether.container);
    }

    // Damage numbers & Sakurai hit effects
    this.dmgNumbers = new DamageNumberManager(this.game.uiContainer, this.game.camera, this.game.uiScale);
    this.hitSparks = new HitSparkManager(this.entityLayer);
    this.propShatter = new PropShatterManager(this.entityLayer);
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
    this.steamPuff = new SteamPuffManager(this.entityLayer);
    this.ashRemnant = new AshRemnantManager(this.entityLayer);
    this.fluidResidue = new FluidResidueManager(this.entityLayer);
    this.egoShard = new EgoShardManager(this.entityLayer);
    this.egoShardPreview = new EgoShardPreview(this.entityLayer);
    // Fluid evaporation → drop residue stain (mirrors LdtkWorldScene).
    this.fluidSystem.onEvaporated = (gx, gy, type) => {
      if (type !== 'oil' && type !== 'acid' && type !== 'magma') return;
      const px = (gx + 0.5) * 16;
      const py = (gy + 1) * 16;
      this.fluidResidue.dropAt(type, px, py, 1.0);
    };

    // ─── Arc Scan Cycle (R-NEW-031 v2) ──────────────────────────────────────
    // charged FluidBody + electrified water FluidBody 가 주기적으로 주변
    // 도체 (player / enemies / metal containers / water cells / metal cells)
    // 를 검색해 전기선 연결 → 일정 시간 후 일제히 thunder 방전 + charged 상태
    // 부여 + chain trigger.
    this.fluidSystem.onArcScanRequest = (originX, originY, radiusPx): ArcLink[] => {
      const links: ArcLink[] = [];
      const r2 = radiusPx * radiusPx;
      // 1) Player
      {
        const px = this.player.x + this.player.width / 2;
        const py = this.player.y + this.player.height / 2;
        const dx = px - originX, dy = py - originY;
        if (dx * dx + dy * dy < r2) {
          links.push({ worldX: px, worldY: py, kind: 'entity', ref: this.player });
        }
      }
      // 2) Enemies
      for (const e of this.enemies) {
        if (!e.alive) continue;
        const ex = e.x + e.width / 2;
        const ey = e.y + e.height / 2;
        const dx = ex - originX, dy = ey - originY;
        if (dx * dx + dy * dy < r2) {
          links.push({ worldX: ex, worldY: ey, kind: 'entity', ref: e });
        }
      }
      // 3) Metal containers (MetalCrate)
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
      // 4) Grid conductor cells (water / metal / acid) — origin 셀 자기 자신 제외.
      const ogx = Math.floor(originX / 16);
      const ogy = Math.floor(originY / 16);
      const radCells = Math.ceil(radiusPx / 16) + 1;
      for (let dy = -radCells; dy <= radCells; dy++) {
        for (let dx = -radCells; dx <= radCells; dx++) {
          if (dx === 0 && dy === 0) continue;
          const gx = ogx + dx, gy = ogy + dy;
          if (gy < 0 || gy >= this.fullGrid.length) continue;
          const row = this.fullGrid[gy];
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
      // 최대 6 link 로 제한 (VFX + discharge 비용 안정)
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
          // Capacitor 충전 — 다음 thunder 적중 시 보너스 (필드는 추후 활용)
          const c = link.ref as { electricChargedMs?: number };
          if (c) c.electricChargedMs = Math.max(c.electricChargedMs ?? 0, FluidSystem.ARC_CHARGED_BUFF_MS);
        } else if (link.kind === 'fluid' || link.kind === 'cell') {
          // water / metal / acid 셀 → thunder chain BFS trigger.
          const cellRef = link.ref as { gx: number; gy: number } | undefined;
          if (cellRef) {
            this.tileMutator.applyThunderChain(this.fullGrid, cellRef.gx, cellRef.gy);
          }
        }
      }
    };
    this.tileMutator.onSteamEvent = (gx, gy) => {
      this.steamPuff.spawn((gx + 0.5) * 16, (gy + 0.5) * 16, 1.0);
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
      this.hitSparks.spawn((gx + 0.5) * 16, (gy + 0.5) * 16, false, 0);
    };
    this.tileMutator.onElectricAcidPulse = (gx, gy) => {
      this.steamPuff.spawn((gx + 0.5) * 16, (gy + 0.5) * 16, 0.8, PUFF_TINT_TOXIC);
    };
    // R-NEW-001 Exothermic Steam: acid+water 발열 반응 — 강한 증기 + vertical
    // burst. Horizontal 24px, vertical 64px 안 entity / 컨테이너 영향.
    this.tileMutator.onAcidSteamBurst = (gx, gy) => {
      const cx = (gx + 0.5) * 16;
      const cy = (gy + 0.5) * 16;
      // 강한 추가 증기 (onSteamEvent 의 표준 1.0 위에)
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
      // Player 데미지 + Burn
      const px = this.player.x + this.player.width / 2;
      const py = this.player.y + this.player.height / 2;
      if (inSteamBurst(px, py)) {
        const dmg = Math.max(1, Math.floor(this.player.maxHp * 0.05));
        this.player.hp = Math.max(0, this.player.hp - dmg);
        this.player.burnRemainingMs = Math.max(this.player.burnRemainingMs ?? 0, 5000);
        this.player.vy = Math.min(this.player.getVy(), -220);
      }
      // Enemies 데미지 + Burn + 살짝 위로
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
      // 컨테이너 위로 상승 (3s steam lift)
      for (const c of this.containers) {
        if (c.destroyed || c.held) continue;
        const ccx = c.colX + c.colW / 2;
        const ccy = c.colY + c.colH / 2;
        if (inSteamBurst(ccx, ccy)) {
          c.applySteamLift(3000);
        }
      }
    };
    // Wall-tile mutations (ice→water melt, acid→metal corrode, oil/wood
    // burnout) invalidate the static tile layer AND can introduce new
    // fluid cells (ice melt → water). Coalesce same-frame events into a
    // single refresh in update().
    this.tileMutator.onWallTileChanged = (gx, gy, originalTile) => {
      this.fluidGridDirty = true;
      // If the mutation produced an air cell, paint over the baked-in
      // wall sprite that was aggregated at buildFullMap. New fluid cells
      // (ice→water) don't need a mask — FluidSystem will draw over the
      // wall sprite via the fluid mesh. OIL also doesn't need a mask
      // because its wall sprite was filtered out of the aggregate at
      // bake time (isFluidHiddenTile) — masking would leave a fake
      // residue rectangle where the fluid simply evaporated.
      const v = this.fullGrid[gy]?.[gx];
      if (v === 0 && originalTile !== TILE_OIL) {
        this.mutatedCells.add(`${gx},${gy}`);
        this.rebuildMutationMask();
      } else if (v === TILE_WALL && originalTile === TILE_MAGMA) {
        this.solidifiedWallCells.add(`${gx},${gy}`);
        this.rebuildSolidifiedWallOverlay();
      }
    };
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

    // Minimap ? disabled (Spelunky-style blind exploration).
    // Container still exists for legacy code paths but is never rendered.
    this.miniMapContainer = new Container();
    this.miniMapContainer.visible = false;

    // HUD
    this.hud = new HUD(this.game.uiScale);
    this.hud.setMinimapFrameVisible(false);
    this.hud.setDebugInfoVisible(Debug.infoVisible);
    this.game.uiContainer.addChild(this.hud.container);

    // 아이템계 진입 시점의 저장된 gold — HUD 가 외부 세계와 동일한 총액을 표시하도록.
    // earnedGold 가 늘어날 때마다 baselineGold + earnedGold 로 갱신 (collectGold 분기 참조).
    const savedData = SaveManager.load();
    this.baselineGold = savedData?.gold ?? 0;
    this.hud.updateGold(this.baselineGold);

    // Area title banner — shows item name on entry.
    this.areaTitle = new AreaTitle();
    this.game.legacyUIContainer.addChild(this.areaTitle.container);
    this.areaTitle.show(this.item.def.name);
    this.uiController = new ItemWorldUiController(this.game);
    this.mapController = new ItemWorldMapController();
    this.spawnController = new ItemWorldSpawnController();
    this.progressController = new ItemWorldProgressController({
      jumpToStratum: (stratumIndex) => this.jumpToStratum(stratumIndex),
      persistRoomState: () => this.persistRoomState(),
      showBossChoice: (nextStratumIndex) => this.showBossChoice(nextStratumIndex),
      showA6DmgToast: (beforeAtk, afterAtk) => this._showA6DmgToast(beforeAtk, afterAtk),
      showStratumClearPanel: (snapshot, isFinal) => this._showStratumClearPanel(snapshot, isFinal),
      startPostClearHold: () => this.startPostClearHold(),
      startExitFade: () => this.startExitFade(),
      showToast: (message, color) => this.toast.show(message, color),
    });

    await hudSkinLoad;
    if (hudSkin.isLoaded) this.hud.applySkin(hudSkin);

    // Return result screen (9-slice from UISkin)
    this.uiController.createReturnResult(hudSkin.isLoaded ? hudSkin : null, () => {
      this.game.sceneManager.pop();
    });

    // Controls overlay (disabled)
    this.controlsOverlay = new ControlsOverlay();
    this.controlsOverlay.container.visible = false;

    // Toast
    this.toast = new ToastManager(this.game.legacyUIContainer);
    // Gamepad hot-plug → 토스트 (System_Input_Gamepad §8.1 Stage 3).
    {
      const off1 = this.game.gamepad.onConnectEvent((brand) => {
        this.toast.show(t('toast.gamepad_connected', { brand: brandLabel(brand) }), 0x88ddff);
      });
      const off2 = this.game.gamepad.onDisconnectEvent(() => {
        this.toast.show(t('toast.gamepad_disconnected'), 0xffaa44);
      });
      this._gpUnsub = () => { off1(); off2(); };
    }

    // Tutorial hint (used for low-HP heal cue, etc. — same UX as world scene)
    this.tutorialHint = new TutorialHint(this.game.input, this.game.legacyUIContainer);

    // Restore persistent exploration state & count rooms
    this.restoreRoomState();
    this.countTotalRooms();

    // Build full map (all rooms rendered into a single continuous grid)
    // Spawner state must be cleared BEFORE buildFullMap because the room
    // placement loop pushes into fluidSpawners as templates are placed.
    this.fluidSpawners.clear();
    this.fluidCrestFoam?.clear();
    this.containers.length = 0; // reset across stratum reloads
    this.buildFullMap();
    // Resolve FluidGeneric_A/B/C (17/18/19) -> concrete fluid tiles based on
    // this dive's weapon temperament (forge/iron/rust/spark/shadow). MUST run
    // before fluidSystem.attachGrid so flood-fill sees the resolved values.
    // Spec: Documents/System/System_World_Fluid.md §3.4
    applyFluidGenericResolution(this.fullGrid, this.item.def.temperamentPrimary);
    // Wire FluidSystem to the freshly built grid — flood-fills fluid bodies
    // for every water/oil/acid/magma cell that any room template placed.
    // Mirrors LdtkWorldScene's per-level attach but uses the unified grid
    // since ItemWorld has no single LdtkLevel wrapper.
    this.fluidSystem.attachGrid(this.fullGrid);
    // FluidSpawner wiring happens per-room inside buildFullMap (offsets
    // adjusted to the unified grid). Spawner state cleared before
    // buildFullMap, so here we just proceed to settle containers.
    // Settle every container that buildFullMap spawned (explicit + spawner
    // results combined) in dependency order — taller stacks land last.
    {
      const isContainerSolidCellFor = (c: ThrowableContainer) => (gx: number, gy: number): boolean => {
        const t = this.fullGrid[gy]?.[gx] ?? 0;
        if (t === 1 || t === 3 || t === 7 || t === 9 || t === 12 || t === 15) return true;
        return c.isWoodFamily() && (t === 2 || t === 6 || t === 8 || t === 11 || t === 13 || t === 20);
      };
      const sorted = [...this.containers].sort((a, b) => b.y - a.y);
      for (const c of sorted) {
        if (c.skipSettle) continue; // Drop-bias containers fall naturally.
        c.settleAtSpawn(isContainerSolidCellFor(c), this.containers, 1024, (gx, gy) => {
          const t = this.fullGrid[gy]?.[gx] ?? 0;
          return t === 2 || t === 6 || t === 8 || t === 11 || t === 13 || t === 20;
        });
      }
    }
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

    // Spawn player. DEC-038: LDtk Start 템플릿의 Player entity 가 권위 — 있으면
    // 그 위치(엔티티 pivot 은 LDtk 에서 bottom-center 가 표준)에 좌상단 정렬로
    // 배치한다. 없으면 절차적 floor 탐색으로 폴백.
    let spawnX: number;
    let spawnY: number;
    const initialLdtkSpawn = this.playerSpawnByStratum.get(this.currentStratumIndex);
    if (initialLdtkSpawn) {
      spawnX = Math.round(initialLdtkSpawn.x - this.player.width / 2);
      spawnY = Math.round(initialLdtkSpawn.y - this.player.height);
    } else {
      const spawn = this.getPlayerFloorSpawnPosition(this.currentCol, this.currentRow);
      spawnX = spawn.x;
      spawnY = spawn.y;
    }
    this.player.x = spawnX;
    this.player.y = spawnY;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.savePrevPosition();

    // Camera
    this.game.camera.snap(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2);

    // LoreDisplay for Memory Rooms — uiContainer(native) 직속 (UI native 1단계)
    this.loreDisplay = new LoreDisplay(this.game.input, this.game.uiScale);
    this.game.uiContainer.addChild(this.loreDisplay.container);

    this.initialized = true;

    // ── Ego T04: landing dialogue ──
    // 사용자 요청 (2026-05-02) — 타일 + 거주자 (Plaza Gatekeeper / ambient 20명)
    // 가 먼저 렌더링된 후 대사가 등장해야 한다 (대사 중 빈 광장 인상 방지).
    // 순서:
    //   1) startSpawnDone=true 즉시 → spawnEnemiesInRoom 가 거주자 spawn
    //   2) 한 박자 (500ms) 후 입장 대사 — player 가 광장 풍경을 인지한 후 발화
    this.startSpawnDone = true;
    this.spawnedRooms.add(`${this.currentCol},${this.currentRow}`);
    this.spawnEnemiesInRoom(this.currentCol, this.currentRow);
    setTimeout(() => {
      void this.fireEgoEnterAsync();
    }, 500);

    // Entry banner ? item name handled by AreaTitle; announce stratum only.
    const rarityColor = RARITY_COLOR[this.item.rarity];
    const stratumLabel = t('iw.stratum_banner', { n: this.currentStratumIndex + 1 });
    this.toast.show(stratumLabel, rarityColor);

    // Show stratum picker if player has unlocked more than one stratum on this item
    const totalStrata = this.strataConfig.strata.length;
    const maxSelectable = Math.min(this.progress.deepestUnlocked + 1, totalStrata);
    if (maxSelectable > 1) {
      this.showStratumPicker(maxSelectable);
    }
  }

  private countTotalRooms(): void {
    this.totalRooms = this.mapController.countTotalRooms(this.unifiedGrid);
  }

  private getCell(col: number, row: number): UnifiedRoomCell | null {
    return this.mapController.getCell(this.unifiedGrid, col, row);
  }

  private getCurrentCell(): UnifiedRoomCell {
    return this.mapController.getCurrentCell(this.unifiedGrid, this.currentCol, this.currentRow);
  }

  private restoreRoomState(): void {
    const restored = this.mapController.restoreRoomState(this.unifiedGrid, this.progress, this.spawnedRooms);
    this.roomsCleared = restored.roomsCleared;
  }

  private persistRoomState(): void {
    this.mapController.persistRoomState(this.unifiedGrid, this.progress, this.spawnedRooms);
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
   * Implements: System_ItemWorld_Core ? full-map rendering spec.
   */
  private buildFullMap(): void {
    // Clear previous full map
    if (this.fullMapContainer?.parent) {
      this.fullMapContainer.parent.removeChild(this.fullMapContainer);
      this.fullMapContainer.destroy({ children: true }); // free GPU textures
    }
    // Reset elemental tile overlays (frozen/burning/electric) + burnable
    // entity registry — old cell keys would otherwise leak into the freshly
    // built fullGrid coordinates.
    this.tileMutator.reset();
    for (const p of this.burnableProps) p.destroy();
    this.burnableProps.length = 0;
    this.ashRemnant?.clear();
    this.grassClumpFire.clear();
    this.fluidResidue?.clear();
    this.egoShard?.clear();
    for (const c of this.containers) c.destroy();
    this.containers.length = 0;
    this.heldContainer = null;
    this.pullingContainer = null;
    this.pullElapsedMs = 0;
    this.arcTether?.hide();
    this.roomItemSpawners.clear();
    this.fullMapContainer = new Container();
    // Create aggregate layer containers so the palette filter spans the
    // entire map in ONE pass (continuous gradient across all rooms).
    this.bgAggregate = new Container();
    this.interiorAggregate = new Container();
    this.wallAggregate = new Container();
    this.specialAggregate = new Container();
    this.shadowAggregate = new Container();
    this.sealAggregate = new Container();
    // Render order: bg -> LDtk interior/buildings -> structDeco -> walls -> special(hazards) -> naturalDeco -> artificialDeco -> shadows -> seal
    this.decoAggregate = new Container();         // natural detail (grass/roots) ? above walls
    this.artificialDecoAggregate = new Container(); // artificial detail (wiring/sensors) ? above walls
    this.structAggregate = new Container();        // structure (beams/concrete) ? behind walls
    this.fullMapContainer.addChild(this.bgAggregate);
    this.fullMapContainer.addChild(this.interiorAggregate);
    this.fullMapContainer.addChild(this.structAggregate);
    this.fullMapContainer.addChild(this.wallAggregate);
    // Mutation mask sits directly above the wall aggregate so burnout / corrode
    // cells can hide their baked-in wall sprite without re-aggregating.
    if (!this.mutationMaskGfx) this.mutationMaskGfx = new Graphics();
    this.mutationMaskGfx.clear();
    this.mutatedCells.clear();
    this.fullMapContainer.addChild(this.mutationMaskGfx);
    if (!this.solidifiedWallGfx) this.solidifiedWallGfx = new Graphics();
    this.solidifiedWallGfx.clear();
    this.solidifiedWallCells.clear();
    this.fullMapContainer.addChild(this.solidifiedWallGfx);
    this.fullMapContainer.addChild(this.specialAggregate);
    this.fullMapContainer.addChild(this.decoAggregate);
    this.fullMapContainer.addChild(this.artificialDecoAggregate);
    this.fullMapContainer.addChild(this.shadowAggregate);
    this.fullMapContainer.addChild(this.sealAggregate);
    this.bgAggregate.filters = [this.bgPaletteFilter];
    const wallFilters: any[] = [this.wallPaletteFilter];
    if (!this.itemWorldReduceVisualCost) {
      wallFilters.push(new RimLightFilter({ color: 0xff6633, alpha: 0.8, thickness: 2, topGuardPixels: 16 }));
    }
    this.wallAggregate.filters = wallFilters;
    // specialAggregate: NO filter ? hazard color cues (water/spike/updraft)
    // are gameplay-critical and must not be swept into the biome palette.
    // Decoration filter ? reduced strength so natural colors show through
    const wallEntry = getAreaPalette(`iw_${this._themeSlug}_wall`);
    const baseOpts = {
      paletteTex: getAreaPaletteAtlas().texture,
      rowCount: getAreaPaletteAtlas().rowCount,
      row: getAreaPaletteRow(wallEntry.id),
      depthBias: wallEntry.depthBias,
      depthCenter: wallEntry.depthCenter,
      brightness: wallEntry.brightness,
      tint: wallEntry.tint,
    };
    // Same palette filter as walls ? decorations get full depth gradient
    this.decoAggregate.filters = this.itemWorldReduceVisualCost ? null : [this.naturalPaletteFilter];
    this.artificialDecoAggregate.filters = this.itemWorldReduceVisualCost ? null : [this.wallPaletteFilter];
    this.structAggregate.filters = this.itemWorldReduceVisualCost ? null : [this.wallPaletteFilter];

    // Strata depth auto-transformation ? deeper = darker, more corroded
    const totalStrata = this.strataConfig.strata.length;
    const depthRatio = totalStrata > 1 ? this.currentStratumIndex / (totalStrata - 1) : 0;
    // Darken palette as depth increases
    this.bgPaletteFilter.setBrightness(
      (this.bgPaletteFilter as any).resources.paletteUniforms.uniforms.uBrightness * (1.0 - depthRatio * 0.3),
    );
    this.wallPaletteFilter.setBrightness(
      (this.wallPaletteFilter as any).resources.paletteUniforms.uniforms.uBrightness * (1.0 - depthRatio * 0.25),
    );
    // Strengthen depth gradient deeper down
    this.bgPaletteFilter.setDepthBias(
      (this.bgPaletteFilter as any).resources.paletteUniforms.uniforms.uDepthBias + depthRatio * 0.15,
    );
    this.shadowAggregate.filters = [this.wallPaletteFilter];
    // Seal walls use the wall filter so their brick pattern reads in the
    // same dark-cool silhouette family as LDtk wall tiles.
    this.sealAggregate.filters = [this.wallPaletteFilter];
    // PIXI v8 culling 활성 — Rare+ 의 sprite 폭증 (수만) 대응 (사용자 결정 2026-05-04).
    // 각 cell layer 에 cullable=true + cullArea 가 viewport 검사. 부모는
    // cullableChildren=true 로 자식 cull 검사 흐름 enable.
    this.bgAggregate.cullableChildren = true;
    this.interiorAggregate.cullableChildren = true;
    this.wallAggregate.cullableChildren = true;
    this.specialAggregate!.cullableChildren = true;
    this.shadowAggregate.cullableChildren = true;
    this.spawnedRooms.clear();
    this.roomTypeMap.clear();
    this.clearEnemies();
    this.cellLayerGroups = []; // 수동 culling 그룹 리셋 — buildFullMap 가 다시 push
    this.visibleCellWindowKey = '';

    // DEC-039 안 A: 통일 좌표계. 모든 지층의 모든 셀을 절대 absoluteRow 기반으로
    // 한 번에 렌더링. fullGrid 도 totalWidth×totalHeight 로 확장. 플레이어는 워프
    // 없이 unifiedGrid 전체를 자유롭게 이동.
    const totalCols = this.unifiedGrid.totalWidth;
    const totalRows = this.unifiedGrid.totalHeight;
    Debug.log(`[ItemWorld] buildFullMap UNIFIED totalGrid=${totalCols}x${totalRows} strata=${this.unifiedGrid.strataOffsets.length} templates=${this.ldtkTemplates.length}`);

    // Initialize full grid as solid (1) — unrendered regions remain impassable
    this.fullGrid = this.mapController.initFullGrid(totalCols, totalRows);
    this.sealedCells.clear();

    // Clear any previously spawned static entities (rebuild = fresh world)
    this.clearStaticEntities();

    // Place each room template into the full grid (entire unified space)
    const grid = this.unifiedGrid;
    let roomCount = 0;
    for (let absRow = 0; absRow < totalRows; absRow++) {
      for (let col = 0; col < totalCols; col++) {
        const cell = grid.cells[absRow]?.[col];
        if (!cell) continue;

        const rng = new PRNG(this.item.uid * 10000 + col * 100 + absRow);
        const ldtkLevel = this.pickLdtkTemplate(cell, rng);
        if (!ldtkLevel || !this.ldtkRenderer || !this.atlas) continue;

        // Boss/start are logical roles from RoomGrid. The LDtk template may be
        // a visual fallback for the same exit mask, so do not let its RoomType
        // erase required gameplay roles like boss spawning.
        const logicalRoomType = this.isStratumEndRoom(col, absRow)
          ? 'Boss'
          : cell.onCriticalPath
            ? 'Combat'
          : ldtkLevel.roomType ?? 'Combat';
        this.roomTypeMap.set(`${col}:${absRow}`, logicalRoomType);
        const roomGrid = ldtkLevel.collisionGrid;
        const roomH = roomGrid.length;
        const roomW = roomGrid[0]?.length ?? 0;

        // Copy room collision data into fullGrid at ABSOLUTE offset
        const offR = absRow * IW_ROOM_H_TILES;
        const offC = col * IW_ROOM_W_TILES;
        for (let tr = 0; tr < roomH && tr < IW_ROOM_H_TILES; tr++) {
          for (let tc = 0; tc < roomW && tc < IW_ROOM_W_TILES; tc++) {
            this.fullGrid[offR + tr][offC + tc] = roomGrid[tr][tc];
          }
        }

        // DEC-039: Boss ('no_down') 셀은 LDtk 템플릿이 D opening 을 가지고
        // 있더라도 collision 으로 강제 봉인. 자연 폴 다운 차단 — Trapdoor entity
        // 만이 유일한 전이 수단.
        //
        // Plaza ('force_up' / LRUD) 는 천장이 자연 open 이므로 별도 seal 불필요.
        // 위쪽 셀 (이전 stratum 보스) 가 'no_down' 으로 잠겨있어 양방향 통과는
        // 차단되며, Trapdoor 가 뚫는 hole 만 일방 다이브 통로로 작동.
        //
        // !cell.exits.up 분기는 plaza 가 force_up 으로 cell.exits.up=true 라
        // 자동 no-op. 일반 셀이 그래프상 위쪽 연결 없으면 여전히 작동.
        const SEAL = 2;
        if (!cell.exits.up) {
          for (let r = 0; r < SEAL; r++) {
            for (let c = 0; c < IW_ROOM_W_TILES; c++) {
              const gr = offR + r;
              const gc = offC + c;
              if (gr >= 0 && gr < this.fullGrid.length && gc >= 0 && gc < (this.fullGrid[0]?.length ?? 0)) {
                this.fullGrid[gr][gc] = 1;
              }
            }
          }
        }
        if (!cell.exits.down) {
          for (let r = IW_ROOM_H_TILES - SEAL; r < IW_ROOM_H_TILES; r++) {
            for (let c = 0; c < IW_ROOM_W_TILES; c++) {
              const gr = offR + r;
              const gc = offC + c;
              if (gr >= 0 && gr < this.fullGrid.length && gc >= 0 && gc < (this.fullGrid[0]?.length ?? 0)) {
                this.fullGrid[gr][gc] = 1;
              }
            }
          }
        }

        const roomX = col * IW_ROOM_W_PX;
        const roomY = absRow * IW_ROOM_H_PX;
        // Template-local cell origin → unified-grid cell offset for
        // Container / ContainerSpawner / FluidSpawner entity wiring.
        const offGx = roomX / 16;
        const offGy = roomY / 16;
        // ── Container entity (explicit Kind or Generic_A/B/C slot) ──
        // Kind=Crate/MetalCrate/OilDrum/... → 그대로 ThrowableContainer 생성
        // Kind=Generic_A/B/C → temperamentPrimary 와 slot 매핑으로 실제 kind
        //   resolve (ContainerPools.resolveContainerSlotKind). 무기 기질별로
        //   다른 ContainerKind 가 자연스럽게 등장.
        for (const ent of ldtkLevel.entities) {
          if (ent.type !== 'Container') continue;
          const kindRaw = ent.fields?.['Kind'];
          let kind = parseContainerKind(kindRaw);
          if (!kind) {
            const slotStr = typeof kindRaw === 'string' ? kindRaw.toLowerCase() : '';
            if (slotStr === 'generic_a' || slotStr === 'generic_b' || slotStr === 'generic_c') {
              kind = resolveContainerSlotKind(slotStr, this.item.def.temperamentPrimary);
            }
          }
          if (!kind) continue;
          const fvRaw = ent.fields?.['FluidVolume'];
          const fluidVolume = typeof fvRaw === 'number' && fvRaw >= 0 ? Math.floor(fvRaw) : undefined;
          const cx = (ent.grid[0] + offGx) * 16;
          const cy = (ent.grid[1] + offGy) * 16;
          const c = new ThrowableContainer(kind, cx, cy, fluidVolume);
          this.containers.push(c);
          this.entityLayer.addChild(c.container);
        }
        // ── ContainerSpawner entity (procedural fill, §12) ──
        // Each spawner runs against the unified grid window covered by this
        // template, with explicit Containers already pushed marking
        // occupancy so they don't double up.
        const occupied = new Set<string>();
        for (const c of this.containers) {
          const gx0 = Math.floor(c.x / 16);
          const gx1 = Math.floor((c.x + c.spec.width - 1) / 16);
          const gy0 = Math.floor(c.y / 16);
          const gy1 = Math.floor((c.y + c.spec.height - 1) / 16);
          for (let gy = gy0; gy <= gy1; gy++) {
            for (let gx = gx0; gx <= gx1; gx++) occupied.add(`${gx},${gy}`);
          }
        }
        for (const ent of ldtkLevel.entities) {
          if (ent.type !== 'ContainerSpawner') continue;
          const opts = readSpawnerEntity(ent, this.item.def.temperamentPrimary);
          // Translate template-local rect → unified-grid pixel rect.
          const rect = {
            x: opts.rect.x + roomX,
            y: opts.rect.y + roomY,
            w: opts.rect.w,
            h: opts.rect.h,
          };
          // Deterministic per-room seed when entity asks for "any".
          const autoSeed = opts.seed >= 0 ? opts.seed
            : (((this.item.uid | 0) * 73856093) ^ (col * 19349663) ^ (absRow * 83492791)) | 0;
          const spawned = runContainerSpawner({
            rect,
            collisionGrid: this.fullGrid,
            existing: this.containers,
            occupiedCells: occupied,
            pool: opts.pool,
            minCount: opts.minCount,
            maxCount: opts.maxCount,
            bias: opts.bias,
            seed: autoSeed,
            avoidEntity: opts.avoidEntity,
            fluidVolumeOverride: opts.fluidVolumeOverride,
          });
          for (const c of spawned) {
            this.containers.push(c);
            this.entityLayer.addChild(c.container);
            occupied.add(`${Math.floor(c.x / 16)},${Math.floor(c.y / 16)}`);
          }
        }
        // ── FluidSpawner entity (continuous emission, §13) ──
        // Template-local grid → unified grid via offGx/offGy.
        for (const ent of ldtkLevel.entities) {
          if (ent.type !== 'FluidSpawner') continue;
          for (const opt of readFluidSpawnerEntities(ent, this.item.def.temperamentPrimary)) {
            this.fluidSpawners.add({
              gx: opt.gx + offGx,
              gy: opt.gy + offGy,
              type: opt.type,
              intervalMs: opt.intervalMs,
            });
          }
        }
        // ── ItemSpawner entity (reward spawn point, 2026-05-18) ──
        // designer-placed 보상 위치. spawnRoomRewards 가 입장 시 각 위치마다
        // gold/heal 1개씩 spawn. 데이터 (gold:heal 비율, drop table 등) 는 추후
        // CSV 로 이전 예정 — 현재는 코드 내 상수 (REWARD_*).
        {
          const list: Array<{ x: number; y: number }> = [];
          for (const ent of ldtkLevel.entities) {
            if (ent.type !== 'ItemSpawner') continue;
            const sx = (ent.grid[0] + offGx) * 16;
            const sy = (ent.grid[1] + offGy) * 16;
            list.push({ x: sx, y: sy });
          }
          if (list.length > 0) {
            this.roomItemSpawners.set(`${col}:${absRow}`, list);
          }
        }
        const inBounds = (t: { px: [number, number] }) =>
          t.px[0] >= 0 && t.px[0] < IW_ROOM_W_PX &&
          t.px[1] >= 0 && t.px[1] < IW_ROOM_H_PX;
        const bgTiles = ldtkLevel.backgroundTiles.filter(inBounds);
        const wallTiles = ldtkLevel.wallTiles.filter(inBounds);
        const shadowTiles = ldtkLevel.shadowTiles.filter(inBounds);
        const interiorTiles = this.getInteriorTilesForRoom(ldtkLevel, inBounds);
        const renderer = new LdtkRenderer();
        // CSV Tileset is authoritative ? retag tiles to the CSV-derived atlas
        // key so BG and WALL never collide on LDtk's shared __tilesetRelPath.
        const bgAreaId = `iw_${this._themeSlug}_bg`;
        const wallAreaId = `iw_${this._themeSlug}_wall`;
        const wallTilesSub = substituteSolidGenericSprites(
          wallTiles, ldtkLevel.collisionGrid, this.item.def.temperamentPrimary,
        );
        applyAreaTilesetToLdtkTiles(bgAreaId, bgTiles);
        applyAreaTilesetToLdtkTiles(wallAreaId, wallTilesSub);
        applyAreaTilesetToLdtkTiles(wallAreaId, shadowTiles);
        renderer.renderLevel(bgTiles, wallTilesSub, shadowTiles, this.atlases, undefined, ldtkLevel.collisionGrid, interiorTiles);
        renderer.bgLayer.position.set(roomX, roomY);
        renderer.interiorLayer.position.set(roomX, roomY);
        renderer.wallLayer.position.set(roomX, roomY);
        renderer.specialLayer.position.set(roomX, roomY);
        renderer.shadowLayer.position.set(roomX, roomY);
        // PIXI v8 cell culling — viewport 밖 cell 의 모든 sprite draw skip.
        // cullArea 는 local coords (position 적용 후 world 로 변환). 각 cell 의
        // local box = (0, 0, IW_ROOM_W_PX, IW_ROOM_H_PX).
        const cellRect = new Rectangle(0, 0, IW_ROOM_W_PX, IW_ROOM_H_PX);
        renderer.bgLayer.cullable = true;       renderer.bgLayer.cullArea = cellRect;
        renderer.interiorLayer.cullable = true; renderer.interiorLayer.cullArea = cellRect;
        renderer.wallLayer.cullable = true;     renderer.wallLayer.cullArea = cellRect;
        renderer.specialLayer.cullable = true;  renderer.specialLayer.cullArea = cellRect;
        renderer.shadowLayer.cullable = true;   renderer.shadowLayer.cullArea = cellRect;
        this.bgAggregate!.addChild(renderer.bgLayer);
        this.interiorAggregate!.addChild(renderer.interiorLayer);
        this.wallAggregate!.addChild(renderer.wallLayer);
        this.specialAggregate!.addChild(renderer.specialLayer);
        this.shadowAggregate!.addChild(renderer.shadowLayer);
        // 수동 visible toggle 그룹 — updateCellVisibility 가 매 프레임 viewport 검사.
        this.cellLayerGroups.push({
          col,
          row: absRow,
          layers: [renderer.bgLayer, renderer.interiorLayer, renderer.wallLayer, renderer.specialLayer, renderer.shadowLayer],
        });

        // Hybrid procedural pass — populate grass/wood + spawn Tier B
        // BurnableProp entities inside LDtk BurnableZone rect entities.
        // Operates on the fullGrid with the room's cell offset so each room's
        // zones land in their correct fullGrid coordinates.
        // GDD: Documents/System/System_World_TileSystem.md §7
        const burnableSpecs: BurnableEntitySpec[] =
          applyBurnableZones(this.fullGrid, ldtkLevel.entities, 16, roomX, roomY);
        for (const s of burnableSpecs) {
          const prop = new BurnableProp(s.id, s.gx, s.gy);
          this.burnableProps.push(prop);
          this.tileMutator.registerBurnable(prop);
          this.entityLayer.addChild(prop.container);
        }

        // Spawn LDtk-placed static entities for this room (with world offset)
        this.spawnStaticEntitiesForRoom(ldtkLevel, roomX, roomY);

        // DEC-039 안 A: stratum 0 의 startRoom Player entity 만 init() 첫 스폰에
        // 사용. 다른 stratum 으로 워프하지 않으므로 별도 키 보관은 불필요하지만,
        // 호환성을 위해 모든 stratum start 의 절대 좌표를 보관해 둔다.
        const stratumStartMatch = this.unifiedGrid.stratumStartRooms?.find(
          s => s.col === col && s.absoluteRow === absRow,
        );
        if (stratumStartMatch) {
          const playerEnt = ldtkLevel.entities.find(e => e.type === 'Player');
          if (playerEnt) {
            this.playerSpawnByStratum.set(stratumStartMatch.stratumIndex, {
              x: playerEnt.px[0] + roomX,
              y: playerEnt.px[1] + roomY,
            });
          }
        }

        roomCount++;
        // Mark start room as visited
        if (cell && col === this.currentCol && absRow === this.currentRow) {
          cell.visited = true;
        }

        // Exit portal spawned on boss death, not pre-placed
      }
    }

    // Radial layout 은 null 셀이 다수 — parallax BG 가 그대로 보이므로 dark seal 로 메움.
    this.fillNullCellSeal(grid, totalCols, totalRows);

    this.addFullMapBoundaryCollision(totalCols, totalRows);
    this.addFullMapBoundaryVisuals(totalCols, totalRows);

    // Procedural decorations generated from the final LDtk-authored fullGrid.
    if (this._procDecoEnabled) {
      const decorator = new ProceduralDecorator({
        // Item world: 1/4 density of world decorations
        maxDecorations: 12,
        maxStructures: 4,
        density: undefined,       // will be overridden by setTheme (then scaled)
        structureDensity: undefined,
        surfaceOverlayEnabled: ITEM_WORLD_SURFACE_OVERLAY_ENABLED,
      });
      decorator.setTheme(this.item.def.themeId ?? 'T-HABITAT');
      // Scale density to 1/4 for item world
      decorator.boostDensity(-0.75 * decorator.getDensity());
      // Strata depth boosts decoration density
      decorator.boostDensity(depthRatio * 0.05);
      const seed = this.item.uid * 10000 + this.currentStratumIndex * 7919 + 777;
      decorator.generate(this.fullGrid, seed);
      this.decoAggregate!.addChild(decorator.naturalLayer);
      this.artificialDecoAggregate!.addChild(decorator.artificialLayer);
      this.structAggregate!.addChild(decorator.structureLayer);
      for (const prop of this.grassClumpFire.register(decorator.getGrassClumpsWithCells())) {
        this.tileMutator.registerBurnable(prop);
      }
    }

    // Insert map container into scene, then ensure parallax stays behind everything
    this.container.addChildAt(this.fullMapContainer, 0);
    // Set collision and camera to the active stratum size.
    this.roomData = this.fullGrid;
    this.player.roomData = this.fullGrid;
    this.game.camera.setBounds(0, 0, totalCols * IW_ROOM_W_PX, totalRows * IW_ROOM_H_PX);

    this.persistRoomState();
    this.drawMiniMap();

    // Breakable props (procedural, item world variants).
    // Reserve an 8-tile radius around the player's start room center so
    // entry/landing isn't cluttered by destructibles.
    for (const bp of this.breakableProps) bp.destroy();
    this.breakableProps = [];
    const bpSeed = (this.currentStratumIndex + 1) * 0x1337 + (this.item.def.id.length * 7);
    const bpExclude = new Set<string>();
    const RADIUS = 8;
    const startCol = this.currentCol * IW_ROOM_W_TILES + Math.floor(IW_ROOM_W_TILES / 2);
    const startRow = this.currentRow * IW_ROOM_H_TILES + IW_DOOR_FLOOR_ROW;
    for (let dr = -RADIUS; dr <= RADIUS; dr++) {
      for (let dc = -RADIUS; dc <= RADIUS; dc++) {
        bpExclude.add(`${startCol + dc},${startRow + dr}`);
      }
    }
    const bpList = spawnBreakableProps(this.fullGrid, bpSeed, true, bpExclude);
    for (const bp of bpList) {
      this.breakableProps.push(bp);
      this.entityLayer.addChild(bp.container);
      // Register so TileMutator.spreadOilFire can ignite via cell adjacency.
      this.tileMutator.registerBurnable(bp);
    }

    // DEC-039 안 A: 포털/exitTrigger 시스템 제거됨. 보스 처치 시 down exit 가
    // 자연스럽게 다음 stratum 으로 이어지므로 별도 복원 로직 불필요.
  }

  private sealCellExits(cell: UnifiedRoomCell, offC: number, offR: number, _size: number): void {
    // Safety net for tag-based template matching.
    //
    // With pickTemplate(exact=true), the chosen template's door set should equal
    // cell.exits, so every cell is sealed only on directions where the template
    // already has solid wall — making this a no-op in the happy path.
    //
    // If sealing actually flips any tile from non-solid to solid, that means
    // the template had a door the cell doesn't want (a coverage gap or a
    // mistagged template). We log it once per direction so missing tag
    // categories surface during playtest.
    const grid = this.fullGrid;
    const SEAL = SEAL_DEPTH;
    const FULL_H = grid.length;
    const FULL_W = grid[0]?.length ?? 0;
    const size = _size;

    const sealRect = (r0: number, r1: number, c0: number, c1: number): boolean => {
      let touched = false;
      for (let r = r0; r < r1 && r < FULL_H; r++) {
        for (let c = c0; c < c1 && c < FULL_W; c++) {
          if (grid[r][c] !== 1) touched = true;
          grid[r][c] = 1;
        }
      }
      return touched;
    };

    const warnGhost = (dir: 'L' | 'R' | 'U' | 'D'): void => {
      // eslint-disable-next-line no-console
      console.warn(
        `[ItemWorld] sealing ghost door ${dir} at cell (col=${cell.col}, row=${cell.absoluteRow}) — `
        + `template tag mismatch, no exact-match room available for this exit set.`,
      );
    };

    if (!cell.exits.left) {
      if (sealRect(offR, offR + size, offC, offC + SEAL)) warnGhost('L');
    }
    if (!cell.exits.right) {
      if (sealRect(offR, offR + size, offC + size - SEAL, offC + size)) warnGhost('R');
    }
    if (!cell.exits.up) {
      if (sealRect(offR, offR + SEAL, offC, offC + size)) warnGhost('U');
    }
    if (!cell.exits.down) {
      if (sealRect(offR + size - SEAL, offR + size, offC, offC + size)) warnGhost('D');
    }
  }

  /** Draw the outer frame of the active stratum so boundaries read as walls. */
  private addFullMapBoundaryVisuals(gridW: number, gridH: number): void {
    if (!this.sealAggregate) return;

    const layer = new Container();
    const fullW = gridW * IW_ROOM_W_PX;
    const fullH = gridH * IW_ROOM_H_PX;
    const thickness = IW_BOUNDARY_THICKNESS * TILE_SIZE;
    const frame = new Graphics();
    this.drawBoundaryWall(frame, 0, 0, fullW, thickness);
    this.drawBoundaryWall(frame, 0, fullH - thickness, fullW, thickness);
    this.drawBoundaryWall(frame, 0, 0, thickness, fullH);
    this.drawBoundaryWall(frame, fullW - thickness, 0, thickness, fullH);
    layer.addChild(frame);

    this.sealAggregate.addChild(layer);
  }

  private addFullMapBoundaryCollision(gridW: number, gridH: number): void {
    const widthTiles = gridW * IW_ROOM_W_TILES;
    const heightTiles = gridH * IW_ROOM_H_TILES;
    const thickness = IW_BOUNDARY_THICKNESS;
    for (let r = 0; r < heightTiles; r++) {
      for (let c = 0; c < widthTiles; c++) {
        const onBoundary = r < thickness
          || r >= heightTiles - thickness
          || c < thickness
          || c >= widthTiles - thickness;
        if (onBoundary && this.fullGrid[r]?.[c] !== undefined) {
          this.fullGrid[r][c] = 1;
        }
      }
    }
  }

  private drawBoundaryWall(gfx: Graphics, x: number, y: number, w: number, h: number): void {
    const mortar = 0x3f4148;
    const colors = [0x5c6068, 0x686c74, 0x52565f, 0x747881];
    gfx.rect(x, y, w, h).fill(mortar);
    for (let py = y; py < y + h; py += 8) {
      const row = Math.floor((py - y) / 8);
      const offset = row % 2 === 0 ? 0 : 8;
      for (let px = x - offset; px < x + w; px += 16) {
        const bx = Math.max(x, px + 1);
        const bw = Math.min(px + 15, x + w) - bx;
        if (bw <= 0) continue;
        const color = colors[(row * 5 + Math.floor(px / 16)) % colors.length];
        gfx.rect(bx, py + 1, bw, 6).fill(color);
      }
    }
  }

  /**
   * Designer-placed ItemSpawner 위치에 보상을 드롭한다. (2026-05-18)
   *
   * 룰:
   *   - 각 ItemSpawner 위치마다 gold or healing pickup 1개 (50:50 PRNG)
   *   - Gold 금액 = base × rarityMul × (1 + stratumDepth × 0.2) — 무기 rarity 가
   *     높을수록, stratum 깊을수록 점진 증가
   *   - Heal pickup 은 player.maxHp 비례 (createForgeEmber 가 25% maxHP)
   *
   * TODO: 보상 데이터 (gold 범위 / heal 종류 / 비율) 를 별도 CSV
   *   (Sheets/Content_ItemWorld_Rewards.csv) 로 이전. 현재는 코드 상수.
   */
  private spawnRoomRewards(col: number, row: number): void {
    const list = this.roomItemSpawners.get(`${col}:${row}`);
    if (!list || list.length === 0) return;

    // Rarity → 보상 multiplier (TODO: CSV 로 이전).
    const RARITY_MUL: Record<string, number> = {
      normal: 1.0, magic: 1.3, rare: 1.6, legendary: 2.0, ancient: 2.5,
    };
    const rarityMul = RARITY_MUL[this.item.rarity] ?? 1.0;
    const cell = this.unifiedGrid.cells[row]?.[col];
    const stratumDepth = cell?.stratumIndex ?? 0;
    const depthMul = 1 + stratumDepth * 0.2;

    const rng = new PRNG(this.item.uid * 999 + col * 77 + row * 33 + 7777);
    for (let i = 0; i < list.length; i++) {
      const pt = list[i];
      if (rng.next() < 0.5) {
        // Gold: base 50~150 × rarityMul × depthMul.
        const goldBase = 50 + rng.nextInt(0, 100);
        const goldAmount = Math.max(1, Math.floor(goldBase * rarityMul * depthMul));
        const gp = new GoldPickup(pt.x, pt.y, goldAmount);
        gp.enableTerrainPhysics(this.roomData);
        this.goldPickups.push(gp);
        this.entityLayer.addChild(gp.container);
      } else {
        // Healing — Forge Ember (25% maxHP). Rarity 가 높으면 추가로 1개 더 spawn.
        const heal = createForgeEmber(pt.x, pt.y, this.player.maxHp);
        this.healingPickups.push(heal);
        this.entityLayer.addChild(heal.container);
        if (rarityMul >= 2.0 && rng.next() < 0.5) {
          // legendary/ancient 보너스 — 같은 spawner 에서 추가 ember 1개 약간 옆에.
          const heal2 = createForgeEmber(pt.x + 8, pt.y, this.player.maxHp);
          this.healingPickups.push(heal2);
          this.entityLayer.addChild(heal2.container);
        }
      }
    }
  }

  /**
   * Spawn enemies in the given room cell (lazy ? triggered on first player entry).
   * Replaces the per-room spawnEnemies() used in loadRoom().
   */
  private spawnEnemiesInRoom(col: number, row: number): void {
    const cell = this.unifiedGrid.cells[row]?.[col];
    if (!cell) return;

    // DEC-038 Town of Orphaned Shadows: hub(Plaza) / shrine(Memorial) 은 안전
    // 지대다. 적 스폰을 차단하고 즉시 cleared 처리해 HUD 카운터/재진입 흐름을
    // 일반 클리어와 동일하게 유지한다. P0 invariant — 절대 적 1마리도 안 됨.
    // 대신 거주자 그림자(Gatekeeper / Librarian) 1명을 결정론적으로 spawn.
    if (cell.role === 'hub' || cell.role === 'shrine') {
      const wasCleared = cell.cleared;
      // Entry sequencing: 시작 룸은 입장 대사 완료까지 스폰 보류. cleared 마킹도
      // 함께 보류하여 대사 후 명시 호출에서 정상 경로로 처리되도록 한다.
      const isStartRoom = col === this.unifiedGrid.startRoom.col
        && row === this.unifiedGrid.startRoom.absoluteRow;
      if (isStartRoom && !this.startSpawnDone) return;
      // DEC-039 안 A: fullGrid 가 통일 좌표라 row 그대로 사용.
      const offXHs = col * IW_ROOM_W_PX;
      const offYHs = row * IW_ROOM_H_PX;
      const roomTopRowHs = Math.floor(offYHs / TILE_SIZE);
      const roomTopColHs = Math.floor(offXHs / TILE_SIZE);
      const rawPoints = this.spawnController.computeSpawnPoints(this.fullGrid, roomTopColHs, roomTopRowHs);
      // 2026-05-17: 문지기/주민/코어 보는 자는 *바닥 솔리드 위* 에만 spawn.
      // computeSpawnPoints 는 below>=1 만 검사해 fluid (water/oil/magma/acid/cyro)
      // 위 점도 포함시킨다. isSolid 로 wall/ice/breakable/metal/wood 만 허용.
      const pointsHs = rawPoints.filter(pt => {
        const tcBelow = Math.floor(pt.x / TILE_SIZE);
        const trBelow = Math.floor(pt.y / TILE_SIZE);
        const belowTile = this.fullGrid[trBelow]?.[tcBelow] ?? TILE_AIR;
        return isSolid(belowTile);
      });
      if (pointsHs.length > 0) {
        // 결정론 시드: itemUid + col + absRow → 같은 무기·같은 방이면 항상 동일 위치.
        const rngHs = new PRNG(this.item.uid * 31337 + col * 199 + row * 73);
        // 인덱스를 셔플해 인터랙티브 1명 + ambient N 명이 같은 점을 안 쓰게 함.
        const idxs = pointsHs.map((_, i) => i);
        for (let i = idxs.length - 1; i > 0; i--) {
          const j = rngHs.nextInt(0, i);
          [idxs[i], idxs[j]] = [idxs[j], idxs[i]];
        }
        // 인터랙티브 거주자 1명 (Plaza→Gatekeeper / Archive→Archivist)
        const mainPt = pointsHs[idxs[0]];
        const mainType: ResidentType = cell.role === 'hub' ? 'gatekeeper' : 'archivist';
        const main = new MemoryResident(mainPt.x, mainPt.y, mainType);
        this.memoryResidents.push(main);
        // residentsLayer — grid 위, entityLayer(player/vfx) 아래.
        this.residentsLayer.addChild(main.container);
        // Plaza 한정: 배경 그림자 20명. sprite 풀(64종) 에서 RNG 로 골라
        // 다양성 확보. spawn point 풀이 작아도 wrap + 넓은 x-jitter + 미세
        // y-jitter 로 겹침 회피.
        if (cell.role === 'hub') {
          const ambientCount = 20;
          const poolLen = idxs.length;
          for (let i = 0; i < ambientCount; i++) {
            const k = poolLen > 1 ? 1 + (i % (poolLen - 1)) : 0;
            const apt = pointsHs[idxs[k]];
            const lap = poolLen > 1 ? Math.floor(i / (poolLen - 1)) : i;
            const jx = lap > 0 ? rngHs.nextInt(-20, 20) : rngHs.nextInt(-4, 4);
            const jy = rngHs.nextInt(-2, 2);
            const variant = rngHs.nextInt(0, 63);
            const ambient = new MemoryResident(apt.x + jx, apt.y + jy, 'ambient', variant);
            this.memoryResidents.push(ambient);
            this.residentsLayer.addChild(ambient.container);
          }
        }
      }
      if (!wasCleared) {
        cell.cleared = true;
        this.roomsCleared++;
        this.persistRoomState();
      }
      return;
    }

    if (cell.cleared) return;

    // Stratum start room ? safe zone, no monsters. Mark cleared so re-entry
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

    // Memory Room ? lore pause, no enemies. Mark as cleared to keep it empty,
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
      setEnemyRoomKey(e, roomKey);
      this.roomEnemyCount.set(roomKey, (this.roomEnemyCount.get(roomKey) ?? 0) + 1);
    };

    const stratumDef = this.strataConfig.strata[cell.stratumIndex ?? 0];
    // DEC-039 안 A: fullGrid 가 통일 좌표계 — row 그대로 사용.
    const offX = col * IW_ROOM_W_PX;
    const offY = row * IW_ROOM_H_PX;

    const dist = Math.abs(col - this.unifiedGrid.startRoom.col)
               + Math.abs(row - this.unifiedGrid.startRoom.absoluteRow);
    const distScale = 1 + dist * 0.1;

    const roomTopRow = Math.floor(offY / TILE_SIZE);
    const roomTopCol = Math.floor(offX / TILE_SIZE);
    const spawnPoints = this.spawnController.computeSpawnPoints(this.fullGrid, roomTopCol, roomTopRow);

    const pickSpawn = (rng: PRNG, entityH: number) => {
      const pt = spawnPoints[rng.nextInt(0, spawnPoints.length - 1)];
      return { x: pt.x, y: pt.y - entityH };
    };

    const roomType = this.roomTypeMap.get(`${col}:${row}`) ?? 'Combat';
    const isBossRoom = roomType === 'Boss' || this.isStratumEndRoom(col, row);
    const stratumIndex = (cell.stratumIndex ?? 0) + 1; // 1-based for CSV
    const spawnTable = getSpawnTable(this.item.rarity, stratumIndex);

    // Cycle scaling ? bump CSV level by +cycle so each replay uses the next
    // row in Content_Stats_Enemy.csv (CSV jump is the "1 level stronger" feel).
    const cycle = this.progress?.cycle ?? 0;

    if (spawnPoints.length === 0 && !isBossRoom) return;

    // 모든 room type 에 대해 ItemSpawner-placed 보상 처리 (no-op if 없음).
    // 2026-05-18: 이전 random-position (corridor dead-end + Rest 1~2 heal) 폐기.
    // Combat/Treasure/Boss 도 designer 가 ItemSpawner 페인트 시 함께 작동.
    this.spawnRoomRewards(col, row);

    // Corridor cell (DEC-037 chain-length variable pattern) — 이동 전용, 적 미스폰.
    if (cell.kind === 'corridor') {
      if (!cell.cleared) {
        cell.cleared = true;
        this.roomsCleared++;
        this.persistRoomState();
      }
      return;
    }

    // ─── RoomType-specific branching ────────────────────────────────────────
    // Rest / Puzzle rooms carry zero enemies ? they break the combat rhythm.
    // Rest room — ItemSpawner 보상은 상단 spawnRoomRewards 가 이미 처리.
    if (roomType === 'Rest') {
      if (!cell.cleared) {
        cell.cleared = true;
        this.roomsCleared++;
        this.persistRoomState();
      }
      return;
    }

    if (roomType === 'Puzzle') {
      // Puzzle content (switches / locked doors) lives in the LDtk template.
      // Spawn nothing; do NOT auto-clear ? solving the puzzle clears it.
      return;
    }

    // Treasure room ? 1 GoldenMonster as an elite encounter.
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

    // Boss room is a logical stratum-end role and must always spawn a boss.
    if (isBossRoom && spawnTable.boss) {
      const bossEntry = spawnTable.boss;
      const boss = this.createEnemyFromType(bossEntry.enemyType, bossEntry.level + cycle);
      (boss as any)._isBoss = true;
      // Multiply CSV-based stats by stratum boss multipliers + distance scaling
      boss.hp = boss.maxHp = Math.max(1, Math.floor(boss.hp * stratumDef.bossHpMul * distScale));
      boss.atk = Math.max(1, Math.floor(boss.atk * stratumDef.bossAtkMul * distScale));
      const bossRng = new PRNG(this.item.uid * 999 + col * 77 + row * 33);
      // Prefer the center of a 16-tile continuous flat floor; fall back to
      // a random valid spawn point if no such run exists.
      const flat = this.findFlatFloorCenter(roomTopCol, roomTopRow, 16);
      let sp: { x: number; y: number };
      if (flat) {
        sp = { x: flat.x - boss.width / 2, y: flat.y - boss.height };
      } else if (spawnPoints.length > 0) {
        sp = pickSpawn(bossRng, boss.height);
      } else {
        sp = {
          x: offX + IW_ROOM_W_PX / 2 - boss.width / 2,
          y: offY + IW_ROOM_H_PX / 2 - boss.height,
        };
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

    // Normal room ? spawn from weighted table.
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

      // 15% chance to spawn an MemoryShardNPC instead of a regular enemy
      const innocentRoll = spawnRng.next();
      if (innocentRoll < INNOCENT_SPAWN_CHANCE && canAddInnocent(this.item)) {
        const seedForArchetype = this.item.uid + col * 13 + row * 7 + spawnIndex;
        const innocent = createRandomInnocent(seedForArchetype, cell.stratumIndex ?? 0);

        const npc = new MemoryShardNPC();
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
          // DLG-10: Memory Shard 회상 — 첫 회상 시점에 한 번만 발화 (사용자
          // 결정 2026-05-04). EGO_EVENT.SHARD_RECALL 표식으로 중복 차단.
          if (
            this.loreDisplay &&
            !this.egoUnlockedEvents.has(EGO_EVENT.SHARD_RECALL) &&
            !this.loreDisplay.isActive
          ) {
            this.egoUnlockedEvents.add(EGO_EVENT.SHARD_RECALL);
            void this.loreDisplay.showDialogue(EGO_SHARD_RECALL, false);
          }
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

  // DEC-039 안 A: spawnBossPortal / restorePortalIfStratumCleared /
  // getBossPortalFallbackPosition 제거됨. 보스 처치 후 down exit 가
  // 다음 stratum 으로 자연스럽게 이어진다.

  private getPlayerFloorSpawnPosition(col: number, absoluteRow: number): { x: number; y: number } {
    // DEC-039 안 A: 통일 좌표계 — absoluteRow 직접 사용.
    const roomLeftTile = col * IW_ROOM_W_TILES;
    const roomTopTile = absoluteRow * IW_ROOM_H_TILES;
    const roomLeftPx = col * IW_ROOM_W_PX;
    const roomRightPx = roomLeftPx + IW_ROOM_W_PX;
    const roomTopPx = absoluteRow * IW_ROOM_H_PX;
    const roomBottomPx = roomTopPx + IW_ROOM_H_PX;
    const targetCenterX = roomLeftPx + IW_ROOM_W_PX / 2;

    const floor = this.findPlayerSpawnFloor(roomLeftTile, roomTopTile, targetCenterX, roomBottomPx);
    const spawnCenterX = floor?.x ?? targetCenterX;
    const floorY = floor?.y ?? (roomTopPx + IW_ROOM_H_PX / 2);
    const minX = roomLeftPx + TILE_SIZE;
    const maxX = roomRightPx - TILE_SIZE - this.player.width;

    return {
      x: Math.round(Math.max(minX, Math.min(maxX, spawnCenterX - this.player.width / 2))),
      y: Math.round(Math.max(roomTopPx + TILE_SIZE, floorY - this.player.height)),
    };
  }

  private findPlayerSpawnFloor(
    roomLeftTile: number,
    roomTopTile: number,
    targetCenterX: number,
    roomBottomPx: number,
  ): { x: number; y: number } | null {
    let best: { x: number; y: number; score: number } | null = null;
    const chooseBetter = (
      current: { x: number; y: number; score: number } | null,
      centerX: number,
      floorY: number,
    ): { x: number; y: number; score: number } => {
      const horizontal = Math.abs(centerX - targetCenterX);
      const verticalPenalty = Math.max(0, roomBottomPx - floorY) * 0.25;
      const score = horizontal + verticalPenalty;
      if (!current || score < current.score) return { x: centerX, y: floorY, score };
      return current;
    };

    // Prefer established enemy-spawn floors: flat enough and inset from walls.
    for (const pt of this.spawnController.computeSpawnPoints(this.fullGrid, roomLeftTile, roomTopTile)) {
      best = chooseBetter(best, pt.x + TILE_SIZE / 2, pt.y);
    }
    if (best) return { x: best.x, y: best.y };

    // Fallback for unusual templates: any air tile with solid below.
    const colStart = roomLeftTile + 1;
    const colEnd = roomLeftTile + IW_ROOM_W_TILES - 1;
    const rowStart = roomTopTile + 1;
    const rowEnd = roomTopTile + IW_ROOM_H_TILES - 1;
    for (let tr = rowStart; tr < rowEnd; tr++) {
      for (let tc = colStart; tc < colEnd; tc++) {
        const here = this.fullGrid[tr]?.[tc] ?? 1;
        const below = this.fullGrid[tr + 1]?.[tc] ?? 1;
        if (here === 0 && below >= 1) {
          best = chooseBetter(best, tc * TILE_SIZE + TILE_SIZE / 2, (tr + 1) * TILE_SIZE);
        }
      }
    }
    return best ? { x: best.x, y: best.y } : null;
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
   * Memory Room placement ? for each stratum that has a memory room configured
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
      const height = offset.height;

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
      Debug.log(`[ItemWorld] Memory room placement stratum=${si} weapon=${weaponId} cell=(${picked.col},${picked.absRow}) template=${roomName}`);
    }
  }

  // ---------------------------------------------------------------------------
  // Door mask ? auto-carve exits + auto-seal unused edges, driven by cell.exits
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
  private computeDoorMask(cell: UnifiedRoomCell | null, ldtkLevel: LdtkLevel): DoorMask {
    return this.mapController.computeDoorMask(cell, ldtkLevel);
  }

  private applyDoorMaskToFullGrid(mask: DoorMask, offR: number, offC: number): void {
    this.mapController.applyDoorMaskToFullGrid(mask, this.fullGrid, this.sealedCells, offR, offC);
  }

  private filterWallTilesByCarves<T extends { px: [number, number] }>(
    wallTiles: T[],
    carveRectsLocal: DoorMask['carveRectsLocal'],
    collisionGrid?: number[][],
  ): T[] {
    return this.mapController.filterWallTilesByCarves(wallTiles, carveRectsLocal, collisionGrid);
  }

  /**
   * Paint code-generated seal walls with a mortar + 4×4 brick pattern per
   * sealed cell. The luma variation (mortar ~0.21, bricks ~0.37?0.45) feeds
   * the palette filter so each brick maps to a different palette position,
   * producing a natural wall silhouette instead of a flat black hole.
   * When the palette filter is off, the pattern still reads as a stone wall.
   * LDtk template tiles render as-is.
   */
  private drawUniformWalls(roomContainer: Container, offR: number, offC: number): void {
    this.mapController.drawUniformWalls(roomContainer, this.sealedCells, offR, offC);
  }


  /**
   * Draw stone-brick blocks over sealed edge strips so players read them as
   * solid walls, not holes. Each tile gets a mortar base + 4×4 brick grid
   * with 4 stone color variations (matches addSealSprites palette).
   */
  private drawSealOverlays(
    roomContainer: Container,
    sealRectsLocal: DoorMask['sealRectsLocal'],
  ): void {
    this.mapController.drawSealOverlays(roomContainer, sealRectsLocal);
  }

  /**
   * Pre-spawn enemies in the 4 neighboring rooms (N/S/E/W) of the given local
   * room coordinates so the player never sees a "pop-in" when crossing a doorway.
   * Skips already-spawned, out-of-bounds, and out-of-stratum rooms.
   */
  private preSpawnNeighborRooms(curCol: number, curAbsRow: number): void {
    // DEC-039 안 A: 통일 좌표계 — stratum 경계 클램프 없이 전체 unifiedGrid 범위로 검사.
    const totalCols = this.unifiedGrid.totalWidth;
    const totalRows = this.unifiedGrid.totalHeight;
    const directions = [
      { dc: -1, dr: 0, name: 'W' },
      { dc: 1, dr: 0, name: 'E' },
      { dc: 0, dr: -1, name: 'N' },
      { dc: 0, dr: 1, name: 'S' },
    ];
    Debug.log(`[ItemWorld] preSpawnNeighborRooms from (${curCol},${curAbsRow}) totalGrid=${totalCols}x${totalRows}`);
    let spawnedCount = 0;
    let skippedBounds = 0;
    let skippedSpawned = 0;
    let skippedNullCell = 0;
    for (const { dc, dr, name } of directions) {
      const ncLocal = curCol + dc;
      const nrAbs = curAbsRow + dr;
      if (ncLocal < 0 || ncLocal >= totalCols || nrAbs < 0 || nrAbs >= totalRows) {
        Debug.log(`  [${name}] skip: out of bounds (${ncLocal},${nrAbs})`);
        skippedBounds++;
        continue;
      }
      const nKey = `${ncLocal},${nrAbs}`;
      if (this.spawnedRooms.has(nKey)) {
        Debug.log(`  [${name}] skip: already spawned ${nKey}`);
        skippedSpawned++;
        continue;
      }
      const nCell = this.unifiedGrid.cells[nrAbs]?.[ncLocal];
      if (!nCell) {
        Debug.log(`  [${name}] skip: null cell ${nKey}`);
        skippedNullCell++;
        continue;
      }
      this.spawnedRooms.add(nKey);
      const beforeCount = this.enemies.length;
      this.spawnEnemiesInRoom(ncLocal, nrAbs);
      const spawned = this.enemies.length - beforeCount;
      Debug.log(`  [${name}] spawned ${spawned} enemies in ${nKey} (roomType=${this.roomTypeMap.get(`${ncLocal}:${nrAbs}`) ?? '?'}, cleared=${nCell.cleared})`);
      spawnedCount++;
    }
    Debug.log(`[ItemWorld] preSpawn result: ${spawnedCount} rooms spawned, ${skippedBounds} bounds, ${skippedSpawned} already, ${skippedNullCell} null`);
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
    return this.spawnController.findFlatFloorCenter(this.fullGrid, roomTopCol, roomTopRow, minLen);
  }

  private createEnemyFromType(type: string, level: number): Enemy<string> {
    const enemy = this.spawnController.createEnemyFromType(type, level);
    this.applyCycleScaling(enemy);
    return enemy;
  }

  /**
   * Replaced by direct level bump (cycle added to spawn level in spawnEnemiesInRoom).
   * Kept as a no-op so existing call sites in createEnemyFromType remain intact.
   */
  private applyCycleScaling(_enemy: Enemy<string>): void {
    // No-op ? cycle scaling now happens via level bump at spawn time.
  }

  private getInteriorTilesForRoom(
    ldtkLevel: LdtkLevel,
    filter?: (tile: LdtkTile) => boolean,
  ): LdtkTile[] {
    const tiles = [
      ...ldtkLevel.interiorTiles,
      ...Object.values(ldtkLevel.extraTileLayers).flat(),
    ];
    return filter ? tiles.filter(filter) : tiles;
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
        const bgAreaId = `iw_${this._themeSlug}_bg`;
        const wallAreaId = `iw_${this._themeSlug}_wall`;
        const bgTiles = ldtkLevel.backgroundTiles;
        const interiorTiles = this.getInteriorTilesForRoom(ldtkLevel);
        const shadowTiles = ldtkLevel.shadowTiles;
        // SolidGeneric_A/B 셀의 sprite 를 *resolved 솔리드 타입* 의 world_01 sprite
        // 로 치환 (2026-05-18). pre-resolution collisionGrid (값 21/22 살아있음)
        // 기준으로 치환 후 *복사된* 배열을 renderLevel 에 전달.
        const wallTilesSub = substituteSolidGenericSprites(
          ldtkLevel.wallTiles, ldtkLevel.collisionGrid, this.item.def.temperamentPrimary,
        );
        applyAreaTilesetToLdtkTiles(bgAreaId, bgTiles);
        applyAreaTilesetToLdtkTiles(wallAreaId, wallTilesSub);
        applyAreaTilesetToLdtkTiles(wallAreaId, shadowTiles);
        // 원본 collisionGrid 를 그대로 전달 — isFluidHiddenTile 의 `v === 17/18/19`
        // 가 fluid placeholder sprite 를 숨긴다. SolidGeneric_A/B (21/22) 는 hide
        // 대상 아님 — 위 substitute 단계에서 sprite 가 적절히 교체됨.
        this.ldtkRenderer.renderLevel(bgTiles, wallTilesSub, shadowTiles, this.atlases, undefined, ldtkLevel.collisionGrid, interiorTiles);
      }
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
      this.toast.show(t('toast.stratum_deeper', { n: this.currentStratumIndex + 1 }), 0xff4488);

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

    // Snap spawnY to the nearest air-above-solid tile in the spawn column so
    // the player never lands inside a wall or in a void hole when an LDtk
    // template doesn't have a floor at the canonical door height. Searches
    // outward from the candidate row.
    const spawnCol = Math.floor((spawnX + this.player.width / 2) / TILE_SIZE);
    const candidateRow = Math.floor((spawnY + this.player.height) / TILE_SIZE);
    for (let d = 0; d < rH; d++) {
      const rows = d === 0 ? [candidateRow] : [candidateRow + d, candidateRow - d];
      let found = -1;
      for (const tr of rows) {
        if (tr < 1 || tr >= rH - 1) continue;
        const here = this.roomData[tr]?.[spawnCol] ?? 1;
        const below = this.roomData[tr + 1]?.[spawnCol] ?? 1;
        if (here === 0 && below >= 1) { found = tr; break; }
      }
      if (found >= 0) { spawnY = (found + 1) * TILE_SIZE - this.player.height; break; }
    }

    this.player.x = spawnX;
    this.player.y = spawnY;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.savePrevPosition();

    // Generate door triggers based on actual room dimensions
    this.doorTriggers = this.buildDoorTriggers(cell);
    this.clearEnemies();
    // Note: sealGfx is cleared at TOP of loadRoom before sealUnusedExits creates new one

    if (!cell.cleared) {
      this.spawnEnemies();
    }

    // Door markers disabled ? LDtk passages are visible in the tilemap
    // this.drawDoorMarkers(cell);

    // Boss room ? check LDtk roomType, fallback to stratum end room
    const ldtkRoomType = this.currentLdtkLevel?.roomType ?? '';
    const isEndRoom = ldtkRoomType === 'Boss' || this.isStratumEndRoom(this.currentCol, this.currentRow);

    // DEC-039 안 A: 포털 시스템 제거됨. dead loadRoom 함수의 잔재 — 호출되지
    // 않으므로 추후 함수 통째로 정리 예정.
    if (isEndRoom && !cell.cleared) {
      this.spawnBoss();
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

  private sealGfx: Container | Graphics | null = null;
  private currentLdtkLevel: LdtkLevel | null = null;

  private sealUnusedExits(cell: UnifiedRoomCell): void {
    const changed = this.mapController.sealUnusedExits(cell, this.roomData);
    if (changed.length > 0) {
      const sealContainer = this.mapController.addSealSprites(changed);
      if (sealContainer) {
        this.sealGfx = sealContainer;
        this.container.addChild(sealContainer);
      }
    }
  }

  /** Find open tile (0) on a room edge closest to hint position. Returns row for L/R, col for U/D. */
  private findEdgeOpen(grid: number[][], edge: 'left'|'right'|'up'|'down', hint = -1): number {
    return this.mapController.findEdgeOpen(grid, edge, hint);
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
    if (!cell) return null;

    const required = this.getRequiredExits(cell);

    // Memory Room placement overrides procedural selection only when its
    // authored LDtk openings already match the logical room exits.
    const placed = this.memoryRoomPlacements.get(`${cell.col}:${cell.absoluteRow}`);
    if (placed) {
      if (this.sameExitSet(placed.exits, required)) return placed;
      console.warn(
        `[ItemWorld] memory room ${placed.identifier} exits=${this.formatExits(placed.exits)} `
        + `does not match cell exits=${this.formatExits(required)} at (${cell.col},${cell.absoluteRow}); using normal template.`,
      );
    }

    // Exclude memory room templates from the random pool so they only appear
    // where explicitly placed above. LDtk editor may capitalize the prefix
    // ("Memory_*") ? match case-insensitively.
    const pool = this.ldtkTemplates.filter(t => !/^memory_/i.test(t.identifier));

    // Determine desired RoomType based on cell role
    let desiredType: string;
    const isStart = cell.col === this.unifiedGrid.startRoom.col
      && cell.absoluteRow === this.unifiedGrid.startRoom.absoluteRow;
    const isBoss = this.isStratumEndRoom(cell.col, cell.absoluteRow);

    if (isStart) {
      desiredType = 'Start';
    } else if (isBoss) {
      desiredType = 'Boss';
    } else if (cell.role === 'hub') {
      // DEC-038 Town of Orphaned Shadows: hub = Plaza (광장). Start 템플릿
      // 재사용 — Gatekeeper 가 머무는 안전 광장. 적 스폰 0 (spawnEnemiesInRoom).
      desiredType = 'Start';
    } else if (cell.role === 'shrine') {
      // DEC-038: shrine = Memorial (기념탑). Rest 템플릿 재사용 — Librarian 의
      // 추모 공간. 적 스폰 0.
      desiredType = 'Rest';
    } else if (cell.kind === 'corridor') {
      // DEC-037 chain-length variable pattern: 통로 셀은 Corridor 템플릿 강제.
      // 매치 없으면 아래 fallback 단계에서 type 무시하고 exits 만 매치한다.
      desiredType = 'Corridor';
    } else if (!cell.onCriticalPath) {
      // Off-path spoke: Combat-weighted (70% Combat / 15% Treasure / 15% Puzzle).
      // DEC-038: Rest 15% 분기 제거 — Memorial(shrine)이 휴식 공간을 전담하므로
      // off-path 에서 추가 Rest 가 나오면 휴식 분포가 두꺼워져 전투 리듬이 깨진다.
      const roll = rng.next();
      if (roll < 0.15) desiredType = 'Treasure';
      else if (roll < 0.30) desiredType = 'Puzzle';
      else desiredType = 'Combat';
    } else {
      desiredType = 'Combat';
    }

    const exactByType = pool.filter(t => t.roomType === desiredType && this.sameExitSet(t.exits, required));
    if (exactByType.length > 0) {
      return exactByType[rng.nextInt(0, exactByType.length - 1)];
    }

    // Boss cells must remain visually distinct. Other cells prefer exit
    // correctness so the authored openings match the generated route.
    const roleIsMandatory = desiredType === 'Boss';
    if (roleIsMandatory) {
      const roleTemplates = pool.filter(t => t.roomType === desiredType);
      if (roleTemplates.length > 0) {
        const rankedRoleTemplates = [...roleTemplates].sort((a, b) =>
          this.exitMatchScore(b.exits, required) - this.exitMatchScore(a.exits, required),
        );
        const fallback = rankedRoleTemplates[0];
        console.warn(
          `[ItemWorld] no exact LDtk template for required role=${desiredType} exits=${this.formatExits(required)} `
          + `at (${cell.col},${cell.absoluteRow}); using ${fallback.identifier} exits=${this.formatExits(fallback.exits)}.`,
        );
        return fallback;
      }
    }

    const exactAnyType = pool.filter(t => this.sameExitSet(t.exits, required));
    if (exactAnyType.length > 0) {
      console.warn(
        `[ItemWorld] no exact LDtk template for type=${desiredType} exits=${this.formatExits(required)} `
        + `at (${cell.col},${cell.absoluteRow}); using another room type.`,
      );
      return exactAnyType[rng.nextInt(0, exactAnyType.length - 1)];
    }

    const fallbackPool = pool.length > 0 ? pool : this.ldtkTemplates;
    const ranked = [...fallbackPool].sort((a, b) =>
      this.exitMatchScore(b.exits, required) - this.exitMatchScore(a.exits, required),
    );
    const fallback = ranked[0] ?? null;
    if (!fallback) return null;

    console.warn(
      `[ItemWorld] Missing LDtk ItemStratum template exits=${this.formatExits(required)} `
      + `type=${desiredType} at (${cell.col},${cell.absoluteRow}); `
      + `fallback=${fallback.identifier} exits=${this.formatExits(fallback.exits)}. `
      + `Author this exit combination in LDtk to remove the fallback.`,
    );
    return fallback;
  }

  private getRequiredExits(cell: UnifiedRoomCell): ExitDir[] {
    const exits: ExitDir[] = [];
    if (cell.exits.left) exits.push('L');
    if (cell.exits.right) exits.push('R');
    if (cell.exits.up) exits.push('U');
    if (cell.exits.down) exits.push('D');
    return exits;
  }

  private sameExitSet(a: readonly ExitDir[], b: readonly ExitDir[]): boolean {
    if (a.length !== b.length) return false;
    const bSet = new Set(b);
    return a.every(d => bSet.has(d));
  }

  private exitMatchScore(candidate: readonly ExitDir[], required: readonly ExitDir[]): number {
    const candSet = new Set(candidate);
    const reqSet = new Set(required);
    let matches = 0;
    let extras = 0;
    let missing = 0;
    for (const d of reqSet) {
      if (candSet.has(d)) matches++;
      else missing++;
    }
    for (const d of candSet) {
      if (!reqSet.has(d)) extras++;
    }
    return matches * 10 - missing * 6 - extras * 2;
  }

  private formatExits(exits: readonly ExitDir[]): string {
    return exits.length > 0 ? exits.join('') : 'none';
  }

  /** Map cell exits to template exits and pick a matching template */
  private pickTemplateForCell(cell: UnifiedRoomCell, rng: PRNG): RoomTemplate | null {
    const exits: ExitDir[] = [];
    if (cell.exits.left) exits.push('L');
    if (cell.exits.right) exits.push('R');
    if (cell.exits.up) exits.push('U');
    if (cell.exits.down) exits.push('D');
    if (exits.length === 0) return null;
    // exact=true: tag-based matching — template's door set must equal cell's
    // exit set, so no "ghost doors" appear that lead to non-existent neighbors.
    // Falls back to superset internally if no exact-tag template exists.
    // kind: DEC-037 corridor/room 교번 패턴 힌트 (RoomGraphAdapter 가 셀에 부여).
    return pickTemplate(exits, rng, true, cell.kind);
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
    // Boss01 = 24-frame atlas 기반 신규 보스 (idle / attack1 / jump / charge).
    // Guardian 는 EnemyFactory 에 그대로 남아 있어 'Boss' 또는 'Guardian' 으로 폴백 가능.
    const boss = createEnemy('Boss01') as Boss01;
    boss.hp = boss.maxHp = Math.max(1, Math.floor(boss.hp * def.bossHpMul));
    boss.atk = Math.max(1, Math.floor(boss.atk * def.bossAtkMul));
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
    for (const r of this.memoryResidents) r.destroy();
    this.memoryResidents = [];
    // Reset pre-spawn cascade tracker so new stratum's neighbors get pre-spawned
    this.lastPreSpawnRoomKey = null;
  }

  /**
   * DEC-038 Town of Orphaned Shadows — 거주자 proximity 시 검 Ego 발화.
   *
   * 로직:
   *   - LoreDisplay 가 활성이면 무시 (중복 호출 방지).
   *   - 거주자별로 entry 당 최대 1회 발화 (egoFlags 키로 dedupe — entry 시 reset).
   *   - 단계: egoUnlockedEvents 에 *_SEEN 키 없으면 First, 있으면 Familiar.
   *   - First 발화 시 *_SEEN 키 set → 다음 entry 부터 Familiar 분기.
   */
  private updateResidentEgoTriggers(): void {
    if (!this.loreDisplay || this.loreDisplay.isActive) return;
    if (this.memoryResidents.length === 0) return;

    const px = this.player.x + this.player.width / 2;
    const py = this.player.y + this.player.height / 2;

    for (const r of this.memoryResidents) {
      if (r.type === 'ambient') continue; // 배경 그림자는 trigger 없음
      const flagKey = r.type === 'gatekeeper' ? '__town_gk_fired' : '__town_arc_fired';
      if (this.egoFlags.has(flagKey)) continue;
      if (!r.isPlayerNear(px, py)) continue;

      const seenKey = r.type === 'gatekeeper'
        ? EGO_EVENT.GATEKEEPER_SEEN
        : EGO_EVENT.ARCHIVIST_SEEN;
      const isFirst = !this.egoUnlockedEvents.has(seenKey);
      let lines;
      if (r.type === 'gatekeeper') {
        lines = isFirst ? EGO_GATEKEEPER_FIRST : EGO_GATEKEEPER_FAMILIAR;
      } else {
        lines = isFirst ? EGO_ARCHIVIST_FIRST : EGO_ARCHIVIST_FAMILIAR;
      }
      if (isFirst) this.egoUnlockedEvents.add(seenKey);
      this.egoFlags.add(flagKey);
      this.loreDisplay.showDialogue(lines, false);
      return; // 한 프레임에 한 명만
    }
  }

  /** Apply updraft force when player stands on IntGrid value 4, + render particles */
  private applyUpdrafts(dt: number): void {
    this.updraftSystem.update(dt, this.player, this.fullGrid, this.game.camera);
  }

  // ---------------------------------------------------------------------------
  // LDtk-placed static entities (Option A: hazards + puzzles + camera zones)
  // ---------------------------------------------------------------------------

  /**
   * Per-frame elemental tile hazards. Operates on fullGrid (procedural concat),
   * mirroring the LdtkWorldScene tickTileHazards but routed through this scene's
   * UI/feedback systems.
   *
   * GDD: Documents/System/System_World_TileSystem.md §2.6-2.13
   */
  private tickTileHazards(dt: number): void {
    if (!this.fullGrid || !this.fullGrid.length) return;
    this.tileMutator.tick(this.fullGrid, dt);

    // Tier B burnable entities: animation tick + destroy cleanup.
    for (let i = this.burnableProps.length - 1; i >= 0; i--) {
      const p = this.burnableProps[i];
      p.update(dt);
      if (p.destroyed) {
        if (p.spec.anchor !== 'ceiling') {
          this.ashRemnant.spawn(p.x + p.width / 2, p.y + p.height - 1, p.width);
        }
        this.tileMutator.unregisterBurnable(p);
        p.destroy();
        this.burnableProps.splice(i, 1);
      }
    }

    // Procedural grass clumps — fire ignition + chain to TILE_GRASS tiles.
    this.grassClumpFire.update(dt, this.tileMutator, this.fullGrid, this.ashRemnant, 16);

    // BreakableProp ignition runs through TileMutator.spreadOilFire (same as
    // BurnableProp / oil / wood / grass). Here we only handle burn-out
    // transition into the shatter/drop path.
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
    this.tileMutatorRenderer?.update(this.tileMutator, this.fullGrid, dt);

    // Wall-tile mutation coalesced refresh — re-flood-fills fluid bodies
    // so new water (from ice melt) or removed cells (oil burnout, metal
    // corrode) sync with the dynamic fluid mesh.
    if (this.fluidGridDirty) {
      this.fluidGridDirty = false;
      this.fluidSystem.refreshFromGrid(this.fullGrid);
    }
    // Dynamic fluid: spring physics + cellular gravity. Mirrors LdtkWorldScene.
    // FluidSpawner tick (V1: World 만 active. ItemWorld 는 V2 까지 no-op).
    this.fluidSpawners.update(dt, this.fullGrid, this.fluidSystem);
    this.fluidSystem.update(dt);
    this.fluidSystem.gravityTick(this.fullGrid, dt, this.tileMutator);
    this.fluidSpawners.pressureDrain(this.fullGrid, this.fluidSystem);
    this.fluidCrestFoam.update(dt, this.fluidSpawners.getActiveSegments(this.fullGrid));

    if (this.player.hp > 0) {
      applyTileHazards(this.player, this.fullGrid, this.tileMutator, dt, {
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
            this.screenFlash.flashDamage(true);
          }
        },
        onBurnApplied: () => this.player.triggerFlash(),
      });
      const waterfallType = this.fluidSpawners.queryFluidAtAabb(
        this.player.x, this.player.y, this.player.width, this.player.height, this.fullGrid,
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
        this.screenFlash.flashDamage(true);
      }
    }

    for (const enemy of this.enemies) {
      if (!enemy.alive || enemy.hp <= 0) continue;
      applyTileHazards(enemy, this.fullGrid, this.tileMutator, dt, {
        onDamage: (amount, src) => {
          const mult = enemy.elementMultiplier(hazardToElement(src));
          if (mult <= 0) return;
          const dmg = Math.max(1, Math.floor(amount * mult));
          enemy.hp -= dmg;
          enemy.showHpBarFlash();
          this.dmgNumbers.spawn(enemy.x + enemy.width / 2, enemy.y - 8, dmg, src === 'thunder');
          if (enemy.hp <= 0) { enemy.hp = 0; enemy.onDeath(); }
        },
      });
    }
  }

  /** Shared destroy path for BreakableProp — sword break & fire burn-out. */
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
        gp.roomData = this.roomData;
        this.goldPickups.push(gp);
        this.entityLayer.addChild(gp.container);
      }
    } else if (drop.type === 'flask') {
      this.player.flaskCharges = Math.min(this.player.flaskCharges + 1, this.player.flaskMaxCharges);
    }
    bp.destroy();
  }


  /** Public accessor for attack hooks. */
  getTileMutator(): TileMutator { return this.tileMutator; }

  /**
   * DEBUG: ignite cells around the player. Bound to KeyF when ?debug is set.
   * Verifies fire propagation through grass/oil/wood without the enchant system.
   */
  /** Compute the elemental attack hitbox AABB (player AABB + 8px expansion + 24px reach forward). */
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
      ah: this.player.height + expand * 2 + 8,
    };
  }

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

  /** DEBUG Shift+1 — Fire enchant sweep. See LdtkWorldScene for full spec. */
  private checkShardContainerHit(x: number, y: number): boolean {
    for (let i = this.containers.length - 1; i >= 0; i--) {
      const c = this.containers[i];
      if (c.destroyed || c.held) continue;
      if (x < c.colX || x > c.colX + c.colW || y < c.colY || y > c.colY + c.colH) continue;
      if (c.kind === 'MetalCrate') {
        // R-NEW-054 Brittle Crate: MetalCrate 가 ice/frozen 셀 위면 1 hit 즉파.
        // footprint 의 *바로 아래 한 줄* (by+1) 검사 — 컨테이너 발판이 ice/frozen 이면 brittle.
        const lx = Math.floor(c.colX / 16);
        const rx = Math.floor((c.colX + c.colW - 1) / 16);
        const by = Math.floor((c.colY + c.colH - 1) / 16);
        let isBrittle = false;
        for (let gx = lx; gx <= rx; gx++) {
          const below = this.fullGrid[by + 1]?.[gx];
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
   * Wall-tunnel guard for player-pushed containers — returns true only
   * when the container's collision rect at newX stays inside non-solid
   * cells. Mirror of LdtkWorldScene's identical helper.
   */
  private canContainerOccupyX(c: ThrowableContainer, newX: number): boolean {
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
        const t = this.fullGrid[gy]?.[gx] ?? 0;
        if (t === 1 || t === 3 || t === 7 || t === 9 || t === 12 || t === 15) return false;
      }
    }
    for (const o of this.containers) {
      if (o === c || o.destroyed || o.held) continue;
      if (colX + colW <= o.colX || colX >= o.colX + o.colW) continue;
      if (colY + colH <= o.colY || colY >= o.colY + o.colH) continue;
      return false;
    }
    return true;
  }

  private checkThrownContainerEnemyHit(): void {
    for (let i = this.containers.length - 1; i >= 0; i--) {
      const c = this.containers[i];
      if (c.destroyed || c.held) continue;
      if (!c.wasThrown || c.hasDealtImpact) continue;
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
        const isBoss = (e as any)._isBoss === true;
        if (isBoss) e.onHit(dir * 60, -40, 0);
        else        e.onHit(dir * 220, -160, 400);
        this.dmgNumbers.spawn(e.x + e.width / 2, e.y - 8, dmg, c.kind === 'MetalCrate');
        this.hitSparks.spawn(ax + aw / 2, ay + ah / 2, true, 0);
        if (e.hp <= 0) {
          e.hp = 0;
          e.onDeath();
        }
        c.hasDealtImpact = true;
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

  /** Same VFX/SFX bundle as LdtkWorldScene container break. */
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
   * Shard ↔ Enemy hit test (ItemWorld). Mirror of LdtkWorldScene helper —
   * applies element side-effect + auto-retrieve on kill.
   */
  private checkShardEnemyHit(x: number, y: number, element: ShardElement): boolean {
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (x < e.x || x > e.x + e.width || y < e.y || y > e.y + e.height) continue;
      const elemMult = e.elementMultiplier(element as ElementAffinity);
      const baseDmg = Math.max(1, Math.floor(this.player.atk * 0.6 * elemMult));
      if (elemMult > 0) e.hp -= baseDmg;
      e.onHit(this.player.facingRight ? 60 : -60, -40, 160);
      this.dmgNumbers.spawn(e.x + e.width / 2, e.y - 8, baseDmg, false);
      this.hitSparks.spawn(x, y, false, 0);
      if (element === 'fire' && elemMult > 0) {
        e.burnRemainingMs = Math.max(e.burnRemainingMs ?? 0, 8000);
      } else if (element === 'ice' && elemMult > 0) {
        e.frozenRemainingMs = Math.max(e.frozenRemainingMs ?? 0, 2000);
      } else if (element === 'thunder' && elemMult > 0) {
        e.hp -= Math.max(1, Math.floor(this.player.atk * 0.4 * elemMult));
        const room = this.fullGrid;
        if (room?.length) {
          const gx = Math.floor((e.x + e.width / 2) / 16);
          const gy = Math.floor((e.y + e.height / 2) / 16);
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const nx = gx + dx, ny = gy + dy;
              if (this.tileMutator.isElectric(nx, ny)) continue;
              this.tileMutator.applyThunderChain(room, nx, ny);
            }
          }
        }
      }
      if (e.hp <= 0) {
        e.hp = 0;
        e.onDeath();
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
   * Container splash paint at impact cell. Mutates fullGrid + (since
   * FluidSystem integration) refreshes the fluid body mesh so the painted
   * fluid cells get the dynamic surface / wave visuals. Magma paint also
   * ignites adjacent flammable cells.
   */
  private paintContainerImpact(kind: ContainerKind, gx: number, gy: number, quantity: number): void {
    const grid = this.fullGrid;
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
      const W = grid[0]?.length ?? 0;
      if (W) {
        const key = (x: number, y: number) => y * W + x;
        const visited = new Set<number>();
        const queue: Array<[number, number]> = [[gx, gy]];
        visited.add(key(gx, gy));
        let painted = 0;
        while (queue.length > 0 && painted < quantity) {
          const [x, y] = queue.shift()!;
          const row = grid[y];
          if (!row) continue;
          const t = row[x] ?? -1;
          // Paint over: air / grass / any fluid (water/magma/oil/acid/charged/cyro).
          // Solid cells block paint. charged (8) 포함 — ChargedCrate splash 가
          // 기존 charged 풀 위 다시 칠해도 무해 (셀 값 그대로).
          if (t === 0 || t === 16 || t === 2 || t === 6 || t === 8 || t === 11 || t === 13 || t === 20) {
            row[x] = tile;
            painted++;
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
      }
    }
    // Magma paint → ignite adjacent flammable cells immediately. Scan
    // radius scales with quantity so larger splashes also light a wider
    // ring of oil/wood/grass.
    if (tile === 6) {
      const r = Math.max(2, Math.ceil(Math.sqrt(quantity)) + 1);
      for (let dy2 = -r; dy2 <= r; dy2++) {
        for (let dx2 = -r; dx2 <= r; dx2++) {
          this.tileMutator.tryIgnite(grid, gx + dx2, gy + dy2);
        }
      }
    }
    if (kind === 'MagmaCrucible') {
      this.steamPuff.spawn((gx + 0.5) * 16, (gy + 0.5) * 16, 1.6);
    }
    // R-NEW-011 Impact Solidification: WaterBarrel 깨짐 → impact 반경 1 tile
    // 안의 magma 셀들을 WALL 로 굳힘 + 강한 plasma 증기 + camera shake.
    if (kind === 'WaterBarrel') {
      let solidified = 0;
      for (let dy2 = -1; dy2 <= 1; dy2++) {
        for (let dx2 = -1; dx2 <= 1; dx2++) {
          const nx = gx + dx2, ny = gy + dy2;
          if (grid[ny]?.[nx] === 6) {
            grid[ny][nx] = 1; // WALL (굳은 magma)
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
    // R-NEW-012 Acid Container Chain: AcidVial 깨짐 → 2-tile radius 안
    // 다른 컨테이너의 acidExposureMs 가속 (도미노 파괴 setup).
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
    // Refresh fluid mesh so the newly-painted cells get dynamic surface.
    if (tile === 2 || tile === 6 || tile === 11 || tile === 13) {
      this.containerFluidDirty = true;
    }
  }

  private flushContainerFluidChanges(): void {
    if (!this.containerFluidDirty) return;
    this.containerFluidDirty = false;
    this.fluidSystem.refreshFromGrid(this.fullGrid);
  }

  private applyContainerEffectToFluid(c: ThrowableContainer): void {
    if (
      c.kind === 'OilDrum' ||
      c.kind === 'WaterBarrel' ||
      c.kind === 'Crate' ||
      c.kind === 'MetalCrate'
    ) return;
    const grid = this.fullGrid;
    const left = Math.floor(c.colX / 16);
    const right = Math.floor((c.colX + c.colW - 1) / 16);
    const foot = Math.floor((c.colY + c.colH) / 16);
    let changed = false;
    let shocked = false;
    for (let gy = foot - 1; gy <= foot; gy++) {
      for (let gx = left; gx <= right; gx++) {
        const row = grid[gy];
        if (!row) continue;
        const t = row[gx] ?? -1;
        if (t !== 2 && t !== 6 && t !== 8 && t !== 11 && t !== 13 && t !== 20) continue;
        switch (c.kind) {
          case 'MagmaCrucible':
            this.tileMutator.tryIgniteOverlayOnly(gx, gy, 1800);
            this.tileMutator.tryIgnite(grid, gx, gy);
            this.tileMutator.tryIgnite(grid, gx + 1, gy);
            this.tileMutator.tryIgnite(grid, gx - 1, gy);
            this.tileMutator.tryIgnite(grid, gx, gy + 1);
            this.tileMutator.tryIgnite(grid, gx, gy - 1);
            break;
          case 'AcidVial':
            this.steamPuff.spawn((gx + 0.5) * 16, (gy + 0.5) * 16, 0.8, PUFF_TINT_TOXIC);
            break;
          case 'ChargedCrate':
          case 'ChargedCell':
            if (this.tileMutator.applyThunderChain(grid, gx, gy) === 0 && t === 11) {
              this.tileMutator.onElectricInsulated?.(gx, gy);
            }
            shocked = true;
            break;
          case 'CyroCanister':
            changed = this.freezeConnectedFluidFrom(grid, gx, gy) || changed;
            break;
        }
      }
    }
    if (changed) this.containerFluidDirty = true;
    if (changed && c.kind === 'CyroCanister') this.freezeEnemiesInFrozenCells(4000);
    void shocked;
  }

  private freezeConnectedFluidFrom(grid: number[][], sx: number, sy: number): boolean {
    const seed = grid[sy]?.[sx] ?? -1;
    if (seed !== 2 && seed !== 6 && seed !== 8 && seed !== 11 && seed !== 13 && seed !== 20) return false;
    const W = grid[0]?.length ?? 0;
    if (!W) return false;
    const visited = new Set<number>();
    const queue: Array<[number, number]> = [[sx, sy]];
    const key = (gx: number, gy: number) => gy * W + gx;
    let changed = false;
    while (queue.length) {
      const [gx, gy] = queue.shift()!;
      const k = key(gx, gy);
      if (visited.has(k)) continue;
      visited.add(k);
      if ((grid[gy]?.[gx] ?? -1) !== seed) continue;
      changed = this.tileMutator.tryFreeze(grid, gx, gy) || changed;
      queue.push([gx + 1, gy], [gx - 1, gy], [gx, gy + 1], [gx, gy - 1]);
    }
    return changed;
  }

  private freezeEnemiesInFrozenCells(durationMs: number): void {
    for (const enemy of this.enemies) {
      if (!enemy.alive || enemy.hp <= 0) continue;
      if (!this.tileMutator.aabbHasOverlay(enemy.x, enemy.y, enemy.width, enemy.height, 'frozen')) continue;
      enemy.frozenRemainingMs = Math.max(enemy.frozenRemainingMs ?? 0, durationMs);
      enemy.vx = 0;
      enemy.vy = 0;
      enemy.showHpBarFlash();
    }
  }

  /** Spawn 4 debug containers near player. Shift+G binding under ?debug. */
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
   * Ego Shard impact dispatcher for ItemWorld — same logic as LdtkWorldScene
   * but reads/writes fullGrid instead of collisionGrid. fluidSystem branch
   * skipped because ItemWorld doesn't render fluid bodies.
   */
  private onEgoShardImpact(px: number, py: number, element: ShardElement): void {
    const room = this.fullGrid;
    if (!room?.length) return;
    const ax = Math.round(px / 16);
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
        if (t === 7) this.tileMutator.tryMeltIce(room, gx, gy);
        else if (t === 2 && room[gy]) {
          room[gy][gx] = 0;
          this.fluidSystem.removeCell(gx, gy);
          this.steamPuff.spawn((gx + 0.5) * 16, (gy + 0.5) * 16, 1.2);
        } else if (t === 13 && room[gy]) {
          // R-NEW-003 Toxic Acid Flash: acid → AIR + 녹색 toxic 증기
          room[gy][gx] = 0;
          this.fluidSystem.removeCell(gx, gy);
          this.steamPuff.spawn((gx + 0.5) * 16, (gy + 0.5) * 16, 1.4, PUFF_TINT_TOXIC);
        } else if (t === 6 && room[gy]) {
          // R-NEW-020 Magma Surge: magma 1-tile 확장 (40% per AIR neighbor)
          const ns: Array<[number, number]> = [[gx + 1, gy], [gx - 1, gy], [gx, gy + 1], [gx, gy - 1]];
          for (const [nx, ny] of ns) {
            if ((room[ny]?.[nx] ?? -1) === 0 && Math.random() < 0.40) {
              room[ny][nx] = 6;
            }
          }
          this.fluidSystem.refreshFromGrid(this.fullGrid);
        } else if (t === 12) {
          // R-NEW-019 Heat Metal: metal cell 유지 + 4s fire overlay
          this.tileMutator.tryIgniteOverlayOnly(gx, gy, 4000);
        } else {
          this.tileMutator.tryIgnite(room, gx, gy);
        }
      }
      this.fluidResidue.ignite(px - fireHalf, py - fireHalf, fireHitSize, fireHitSize);
      // BreakableProp ignition happens inside `tryIgnite` above (registered
      // as IgnitableEntity, same chain pipeline as BurnableProp).
      // Procedural grass clumps still use their own fire system.
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
        // R-NEW-021 Frozen Steel: metal cell → frozen WALL (Brittle 준비)
        if (t === 12) this.tileMutator.tryFreezeMetal(room, gx, gy);
        // R-NEW-048 Reinforced Ice: ice cell 에 Ice 재타격 시 강화 (단순 — 단지 시각 효과만)
        // tryFreeze 는 water/magma/oil/acid/wood/grass 모두 지원
        // (R-NEW-004/006/044/045 포함)
        else this.tileMutator.tryFreeze(room, gx, gy);
      }
    } else if (element === 'thunder') {
      for (const [gx, gy] of cells) {
        const t = (room[gy]?.[gx] ?? 0);
        // R-NEW-018 Magma Detonation: magma cell hit → 큰 plasma 폭발 + camera shake
        if (t === 6) {
          this.steamPuff.spawn((gx + 0.5) * 16, (gy + 0.5) * 16, 2.0, PUFF_TINT_PLASMA);
          this.game.camera.shake(4);
          this.tileMutator.applyThunderChain(room, gx, gy);
          continue;
        }
        // R-NEW-022 Shatter Pulse: ice cell hit → AIR + 약한 폭발 시각
        if (t === 7 && room[gy]) {
          room[gy][gx] = 0;
          this.tileMutator.clearFrozen(gx, gy);
          this.steamPuff.spawn((gx + 0.5) * 16, (gy + 0.5) * 16, 1.4);
          this.game.camera.shake(2);
          continue;
        }
        // R-NEW-046 Wooden Static / R-NEW-047 Grass Static:
        // wood/grass 셀에 Thunder 적중 시 1.5s electric overlay 부여
        // → tick 의 electric 만료 시점에 R-NEW-034 Static Ignition 발화
        if (t === 15 /* wood */ || t === 16 /* grass */) {
          this.tileMutator.giveElectricOverlay(gx, gy, 1500);
          continue;
        }
        if (this.tileMutator.isElectric(gx, gy)) continue;
        this.tileMutator.applyThunderChain(room, gx, gy);
      }
    }
  }

  private debugIgniteAtPlayer(): void {
    if (!this.fullGrid?.length) return;
    const hb = this.getDebugAttackHitbox();
    let actions = 0;
    this.forEachCellInAABB(hb.ax, hb.ay, hb.aw, hb.ah, (gx, gy) => {
      const tile = getTile(this.fullGrid, gx, gy);
      if (isIce(tile)) {
        if (this.tileMutator.tryMeltIce(this.fullGrid, gx, gy)) actions++;
      } else if (isWater(tile)) {
        if (this.fullGrid[gy]) {
          this.fullGrid[gy][gx] = TILE_AIR;
          this.fluidSystem.removeCell(gx, gy);
          this.steamPuff.spawn((gx + 0.5) * 16, (gy + 0.5) * 16, 1.2);
          actions++;
        }
      } else {
        if (this.tileMutator.tryIgnite(this.fullGrid, gx, gy)) actions++;
      }
    });
    const igniteN = this.fluidResidue.ignite(hb.ax, hb.ay, hb.aw, hb.ah);
    actions += igniteN;
    // eslint-disable-next-line no-console
    Debug.log(`[DebugFire] actions=${actions} burning=${this.tileMutator.burningCount} residueIgnited=${igniteN}`);
  }

  /** DEBUG Shift+2 — Ice enchant sweep. */
  private debugFreezeAtPlayer(): void {
    if (!this.fullGrid?.length) return;
    const hb = this.getDebugAttackHitbox();
    let frozen = 0;
    this.forEachCellInAABB(hb.ax, hb.ay, hb.aw, hb.ah, (gx, gy) => {
      if (this.tileMutator.tryFreeze(this.fullGrid, gx, gy)) frozen++;
    });
    // eslint-disable-next-line no-console
    Debug.log(`[DebugIce] frozen=${frozen} total=${this.tileMutator.frozenCount}`);
  }

  /** DEBUG Shift+3 — Thunder enchant sweep. */
  private debugThunderAtPlayer(): void {
    if (!this.fullGrid?.length) return;
    const hb = this.getDebugAttackHitbox();
    let totalLit = 0;
    this.forEachCellInAABB(hb.ax, hb.ay, hb.aw, hb.ah, (gx, gy) => {
      if (this.tileMutator.isElectric(gx, gy)) return;
      totalLit += this.tileMutator.applyThunderChain(this.fullGrid, gx, gy);
    });
    // eslint-disable-next-line no-console
    Debug.log(`[DebugThunder] lit=${totalLit} electric=${this.tileMutator.electricCount}`);
  }

  /** Spawn hazard/puzzle entities from a room template, offset to fullGrid space. */
  private spawnStaticEntitiesForRoom(level: LdtkLevel, offX: number, offY: number): void {
    // Per-room iid prefix ? when the same template is reused in multiple rooms,
    // we must keep entity iids unique so Switch→LockedDoor matching is room-scoped.
    const roomPrefix = `r${offX}_${offY}:`;

    for (const ent of level.entities) {
      const ax = ent.px[0] + offX;
      const ay = ent.px[1] + offY;

      switch (ent.type) {
        case 'Building': {
          if (!ent.tile || !ent.tile.tilesetPath) {
            console.warn(`[Building] entity at (${ax}, ${ay}) has no tile — skipped. LDtk Editor 에서 tile picker 로 사각형을 선택해 주십시오.`);
            break;
          }
          const b = new Building(
            ax, ay,
            ent.tile.tilesetPath,
            ent.tile.src[0], ent.tile.src[1],
            ent.tile.w, ent.tile.h,
          );
          // BG/wall SSoT 톤 매핑 — wall row 기준 (전경 데코 톤).
          if (this.wallPaletteFilter) {
            b.container.filters = [this.wallPaletteFilter];
          }
          this.buildings.push(b);
          // buildingLayer 로 추가 — entityLayer 보다 뒤라 player 뒤로 렌더링.
          this.buildingLayer.addChild(b.container);
          break;
        }
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

          // Build the Memory Shard visual ? legendary-tier but distinct:
          //   - Larger than item drops (shard ? 16×16 vs item 8×8)
          //   - Rotated diamond shape (45°) ? clear visual contrast vs sword's square
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
        case 'Anvil': {
          // ItemStratum 안의 Anvil = "맵 밖으로 나가기" 거점. Overworld Anvil 의
          // place-weapon/strike 흐름은 사용하지 않고, 근접 시 KeyPrompt 를 띄워
          // ATTACK 입력으로 EscapeConfirm(ESC 다이얼로그) 을 연다.
          const anvil = new Anvil(ax, ay, false);
          anvil.setShowHint(false); // 자체 symbol prompt 비활성 — KeyPrompt 만 사용
          this.itemWorldAnvils.push(anvil);
          this.entityLayer.addChild(anvil.container);
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
    for (const e of this.breakableProps) e.destroy();
    this.breakableProps = [];
    for (const e of this.collapsingPlatforms) e.destroy();
    this.collapsingPlatforms = [];
    for (const e of this.growingWalls) e.destroy();
    this.growingWalls = [];
    for (const e of this.switches) e.destroy();
    this.switches = [];
    for (const e of this.lockedDoors) e.destroy();
    this.lockedDoors = [];
    for (const e of this.buildings) e.destroy();
    this.buildings = [];
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
    // DEC-038 Town residents
    for (const r of this.memoryResidents) r.destroy();
    this.memoryResidents = [];
    // DEC-039 Trapdoor — buildFullMap 재실행 시 잔류 방지.
    if (this.trapdoor) {
      this.trapdoor.destroy();
      this.trapdoor = null;
    }
    // ItemWorld exit-anvils — rebuild/stratum 전환 시 잔류 방지.
    for (const a of this.itemWorldAnvils) a.destroy();
    this.itemWorldAnvils = [];
    this.destroyItemWorldAnvilPrompt();
  }

  /** Per-frame: IntGrid spike check + collapsing platforms + entity update logic. */
  private updateStaticEntities(dt: number): void {
    // Elemental tile hazards (magma · charged · acid · fire · thunder · burn).
    // Mutator must tick before hazard check so frozen reverts are visible this frame.
    this.tickTileHazards(dt);

    // IntGrid spike (value 5) ? contact damage + safe-ground respawn.
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

    // Collapsing platforms ? shake when stood on, may collapse + respawn
    for (let i = this.collapsingPlatforms.length - 1; i >= 0; i--) {
      const cp = this.collapsingPlatforms[i];
      cp.update(dt);
      if (cp.isPlayerOnTop(this.player.x, this.player.y, this.player.width, this.player.height)) {
        cp.startShake();
      }
    }

    // Growing walls ? pulse, grow/shrink cycle, slime/dust spawn
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

    // Locked doors ? reject animation timer
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
        // Breakable props
        for (let i = this.breakableProps.length - 1; i >= 0; i--) {
          const bp = this.breakableProps[i];
          if (bp.destroyed) continue;
          if (!aabbOverlap(hitbox, bp.getAABB())) continue;
          this.destroyBreakablePropWithEffects(bp, 'sword');
          this.breakableProps.splice(i, 1);
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
        // Breakable tiles (IntGrid 9) ? 3 hits to destroy → air(0)
        this.checkAttackOnBreakables(hitbox);
        // Throwable containers — sword damage breaks them, except MetalCrate
        // which is immune (acid only).
        for (let i = this.containers.length - 1; i >= 0; i--) {
          const c = this.containers[i];
          if (c.destroyed || c.held) continue;
          const cBox = { x: c.colX, y: c.colY, width: c.colW, height: c.colH };
          if (!aabbOverlap(hitbox, cBox)) continue;
          if (c.kind === 'MetalCrate') {
            this.hitSparks.spawn(c.colX + c.colW / 2, c.colY + c.colH / 2, true, 0);
            continue;
          }
          const impact = c.takeAttack(Math.max(1, Math.floor(this.player.atk)));
          this.hitSparks.spawn(c.colX + c.colW / 2, c.colY + c.colH / 2, true, 0);
          if (impact) {
            this.paintContainerImpact(c.kind, impact.gx, impact.gy, c.fluidVolume);
            this.destroyContainerWithVFX(c);
            this.containers.splice(i, 1);
          }
        }
      }
    } else {
      // Attack ended ? reset breakable swing tracking
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
    this.destroyAggregateChildren(this.bgAggregate);
    if (this.interiorAggregate) this.destroyAggregateChildren(this.interiorAggregate);
    this.destroyAggregateChildren(this.wallAggregate);
    if (this.specialAggregate) this.destroyAggregateChildren(this.specialAggregate);
    this.destroyAggregateChildren(this.shadowAggregate);
    this.destroyAggregateChildren(this.sealAggregate);
    this.cellLayerGroups = []; // 수동 culling 그룹 리셋 — 아래 loop 가 다시 push
    this.visibleCellWindowKey = '';

    const grid = this.unifiedGrid;
    const totalCols = grid.totalWidth;
    const totalRows = grid.totalHeight;

    for (let absRow = 0; absRow < totalRows; absRow++) {
      for (let col = 0; col < totalCols; col++) {
        const cell = grid.cells[absRow]?.[col];
        if (!cell) continue;

        const rng = new PRNG(this.item.uid * 10000 + col * 100 + absRow);
        const ldtkLevel = this.pickLdtkTemplate(cell, rng);
        if (!ldtkLevel || !this.ldtkRenderer || !this.atlas) continue;

        const roomX = col * IW_ROOM_W_PX;
        const roomY = absRow * IW_ROOM_H_PX;

        const inBounds = (t: { px: [number, number] }) =>
          t.px[0] >= 0 && t.px[0] < IW_ROOM_W_PX &&
          t.px[1] >= 0 && t.px[1] < IW_ROOM_H_PX;
        const bgTiles = ldtkLevel.backgroundTiles.filter(inBounds);
        const wallTiles = ldtkLevel.wallTiles.filter((t) => {
          if (!inBounds(t)) return false;
          const tr = Math.floor(t.px[1] / TILE_SIZE);
          const tc = Math.floor(t.px[0] / TILE_SIZE);
          return (this.fullGrid[absRow * IW_ROOM_H_TILES + tr]?.[col * IW_ROOM_W_TILES + tc] ?? 1) !== 0;
        });
        const shadowTiles = ldtkLevel.shadowTiles.filter(inBounds);
        const interiorTiles = this.getInteriorTilesForRoom(ldtkLevel, inBounds);
        const renderer = new LdtkRenderer();
        {
          const bgAreaId = `iw_${this._themeSlug}_bg`;
          const wallAreaId = `iw_${this._themeSlug}_wall`;
          applyAreaTilesetToLdtkTiles(bgAreaId, bgTiles);
          applyAreaTilesetToLdtkTiles(wallAreaId, wallTiles);
          applyAreaTilesetToLdtkTiles(wallAreaId, shadowTiles);
        }
        const wallTilesSub = substituteSolidGenericSprites(
          wallTiles, ldtkLevel.collisionGrid, this.item.def.temperamentPrimary,
        );
        renderer.renderLevel(bgTiles, wallTilesSub, shadowTiles, this.atlases, undefined, ldtkLevel.collisionGrid, interiorTiles);
        renderer.bgLayer.position.set(roomX, roomY);
        renderer.interiorLayer.position.set(roomX, roomY);
        renderer.wallLayer.position.set(roomX, roomY);
        renderer.specialLayer.position.set(roomX, roomY);
        renderer.shadowLayer.position.set(roomX, roomY);
        // Cell culling — buildFullMap 과 동일 패턴 (사용자 결정 2026-05-04).
        const cellRect = new Rectangle(0, 0, IW_ROOM_W_PX, IW_ROOM_H_PX);
        renderer.bgLayer.cullable = true;       renderer.bgLayer.cullArea = cellRect;
        renderer.interiorLayer.cullable = true; renderer.interiorLayer.cullArea = cellRect;
        renderer.wallLayer.cullable = true;     renderer.wallLayer.cullArea = cellRect;
        renderer.specialLayer.cullable = true;  renderer.specialLayer.cullArea = cellRect;
        renderer.shadowLayer.cullable = true;   renderer.shadowLayer.cullArea = cellRect;
        this.bgAggregate.addChild(renderer.bgLayer);
        this.interiorAggregate?.addChild(renderer.interiorLayer);
        this.wallAggregate.addChild(renderer.wallLayer);
        this.specialAggregate?.addChild(renderer.specialLayer);
        this.shadowAggregate.addChild(renderer.shadowLayer);
        this.cellLayerGroups.push({
          col,
          row: absRow,
          layers: [renderer.bgLayer, renderer.interiorLayer, renderer.wallLayer, renderer.specialLayer, renderer.shadowLayer],
        });
      }
    }

    this.fillNullCellSeal(grid, totalCols, totalRows);
  }

  private destroyAggregateChildren(layer: Container): void {
    const children = layer.removeChildren();
    for (const child of children) {
      child.destroy({ children: true, texture: true, textureSource: false, context: true });
    }
  }

  /**
   * Fill non-placed (null) cells in the radial layout with a dark seal block so the
   * parallax background does not bleed through. Drawn into sealAggregate (wallPaletteFilter).
   */
  private fillNullCellSeal(
    grid: UnifiedGridData,
    totalCols: number,
    totalRows: number,
  ): void {
    if (!this.sealAggregate) return;
    const gfx = new Graphics();
    let count = 0;
    for (let absRow = 0; absRow < totalRows; absRow++) {
      for (let col = 0; col < totalCols; col++) {
        if (grid.cells[absRow]?.[col]) continue;
        gfx.rect(col * IW_ROOM_W_PX, absRow * IW_ROOM_H_PX, IW_ROOM_W_PX, IW_ROOM_H_PX);
        count++;
      }
    }
    if (count > 0) {
      gfx.fill(0x101010);
      this.sealAggregate.addChild(gfx);
    } else {
      gfx.destroy();
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
        this.toast.show(t('toast.gate_opened'), 0x44ffaa);
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
    if (this.parallaxBG) this.parallaxBG.container.visible = true;
    this.entryFreezeTimer = ENTRY_FREEZE_MS;
    // 월드 BGM 종료 — outro 1 회 재생 후 silence. Item World 자체 BGM 은
    // 추후 mus_iw_lane_rust_loop 등 도착 시 BgmController.play 로 교체 예정.
    BgmController.stop('mus_world_main_outro');
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
      area: 'itemworld',
      // ItemWorld is procedural — no LDtk level_id.
      level_id: undefined,
      room_col: Math.floor(cx / TILE_SIZE),
      room_row: Math.floor(cy / TILE_SIZE),
      equipped_weapon_id: equipped?.def.id ?? undefined,
      hp_pct: this.player.maxHp > 0
        ? Math.floor((this.player.hp / this.player.maxHp) * 100)
        : 0,
    };
  }

  update(dt: number): void {
    if (!this.initialized) return;

    // Feedback panel open — block scene update but keep toasts animating.
    if (this.game.feedbackOpen) {
      this.toast?.update(dt);
      return;
    }

    this.areaTitle.update(dt);

    // Return result modal (blocks all input while visible)
    if (this.uiController.isReturnResultVisible()) {
      this.uiController.updateReturnResult(dt);
      if (this.game.input.isJustPressed(GameAction.ATTACK)) this.uiController.confirmReturnResult();
      return;
    }

    // Toast always updates
    this.toast.update(dt);

    this.hud.setDebugInfoVisible(Debug.infoVisible);

    // Onboarding blocks gameplay
    if (!this.uiController.isOnboardingDone()) {
      if (this.game.input.isJustPressed(GameAction.ATTACK)) {
        this.advanceOnboarding();
      }
      return;
    }

    // Stratum picker blocks gameplay
    if (this.stratumPickerVisible) {
      this.stratumPickerPulseTimer += dt;
      this.redrawStratumPickerPulse();
      this.handleStratumPickerInput();
      return;
    }

    // LoreDisplay (Memory Room lore) ? when active, pause gameplay
    if (this.loreDisplay?.isActive) {
      this.loreDisplay.update(dt);
      // Sync prev position so render interpolation doesn't cause jitter
      this.player.savePrevPosition();
      return;
    }

    if (this.entryFreezeTimer > 0) {
      this.entryFreezeTimer = Math.max(0, this.entryFreezeTimer - dt);
      this.player.vx = 0;
      this.player.vy = 0;
      this.player.savePrevPosition();
      this.hud.update(dt);
      this.updateHudText();
      this.dmgNumbers.update(dt);
      this.screenFlash.update(dt);
      this.game.camera.target = {
        x: this.player.x + this.player.width / 2,
        y: this.player.y + this.player.height / 2,
      };
      this.game.camera.update(dt);
      return;
    }

    // ESC to toggle escape confirm. bossChoice 패널이 열려 있을 땐 여기서
    // 가로채지 않고 아래 bossChoice 핸들러가 ESC 를 Exit Safely 로 처리하도록
    // 양보한다 (Pattern A ? 해당 모달의 취소 키).
    // post_clear_hold 동안 StratumClearOverlay 가 단일 키(C) 흐름을 책임지므로
    // ESC 가 EscapeConfirm 팝업을 띄우지 않도록 가로챈다.
    if (this.transitionState === 'post_clear_hold') {
      // fall through to the post_clear_hold handler below; do nothing here.
    } else if (!this.uiController.isBossChoiceVisible() && this.game.input.isJustPressed(GameAction.MENU)) {
      if (this.uiController.isEscapeConfirmVisible()) {
        this.hideEscapeConfirm();
        return;
      }
      // Pad B (CANCEL 동시 발화) 는 EscapeConfirm 을 *띄우지* 못한다.
      // START · Escape 만 open 트리거 (사용자 요구 2026-05-17).
      if (!this.game.input.isJustPressed(GameAction.CANCEL)) {
        this.showEscapeConfirm();
      }
      return;
    }

    if (this.uiController.isEscapeConfirmVisible()) {
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

    // 모달/전이 상태에서는 매 프레임 world-space 프롬프트를 숨겨
    // 결과 패널 뒤에 "\u2191 Descend" 등이 잔존하는 것을 방지.
    if (this.shouldSuppressWorldPrompts()) {
      this.hideWorldPrompts();
    }

    // A17 (playtest 2026-04-17): boss-kill choice panel. After a non-final
    // stratum boss, the portal would auto-advance; now the player explicitly
    // chooses CONTINUE (deeper) or EXIT (bank progress and leave).
    // Pattern A(Modal, UI_Interaction_Patterns.md): C(ATTACK)=확인(Continue
    // Deeper), ESC(MENU)=취소(Exit Safely). Z/X 는 UI 에서 사용 금지 ? 점프/
    // 대시 액션과 근육 기억 충돌을 막기 위함.
    if (this.uiController.isBossChoiceVisible()) {
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

    // World Map / Inventory are unavailable inside Item World ? surface a
    // short English toast so the player understands the key was recognised
    // but intentionally disabled here. Shift+I 는 Game.ts 가 INVENTORY 를
    // consume 해 전역 UI 토글로 사용 — 여기로 도달하지 않는다.
    if (this.game.input.isJustPressed(GameAction.MAP)) {
      this.game.input.consumeJustPressed(GameAction.MAP);
      this.toast.show(t('toast.currently_unavailable'), 0xaaaaaa);
    }
    if (this.game.input.isJustPressed(GameAction.INVENTORY)) {
      this.game.input.consumeJustPressed(GameAction.INVENTORY);
      this.toast.show(t('toast.currently_unavailable'), 0xaaaaaa);
    }

    this.player.update(dt);

    // First time HP drops to/under 40% — surface a tutorial hint pointing at
    // the heal key. Shared one-shot flag with LdtkWorldScene; survives scene
    // swaps in-session.
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
    this.tutorialHint.update(dt);

    // Updraft wind zones (IntGrid value 4 in fullGrid)
    this.applyUpdrafts(dt);

    // DEBUG: Shift+1/2/3 = Fire / Ice / Thunder, Shift+O = unified cheat
    // bundle (all relics + HP/ATK 99999 + immortal). ?debug URL gated.
    const debugOn = new URLSearchParams(window.location.search).has('debug');
    if (debugOn && this.game.input.shiftDown) {
      if (this.game.input.isJustPressed(GameAction.DEBUG_FIRE)) this.debugIgniteAtPlayer();
      if (this.game.input.isJustPressed(GameAction.DEBUG_ICE)) this.debugFreezeAtPlayer();
      if (this.game.input.isJustPressed(GameAction.DEBUG_THUNDER)) this.debugThunderAtPlayer();
      if (this.game.input.isJustPressed(GameAction.DEBUG_CHEAT)) {
        if (this.player.debugCheatActive) {
          this.player.disableCheatBundle();
          this.toast.show('CHEAT OFF', 0x44ff44);
        } else {
          this.player.enableCheatBundle();
          this.toast.show('CHEAT ON — relics + HP/ATK 99999 + immortal', 0xffaa00);
        }
      }
      if (this.game.input.isJustPressedKeyCode('KeyG')) this.debugSpawnContainers();
    }
    // 1/2/3 (no shift) → active enchant swap (Hades Boon style).
    if (!this.game.input.shiftDown) {
      if (this.game.input.isJustPressed(GameAction.DEBUG_FIRE))    this.player.activeEnchant = 'fire';
      else if (this.game.input.isJustPressed(GameAction.DEBUG_ICE))    this.player.activeEnchant = 'ice';
      else if (this.game.input.isJustPressed(GameAction.DEBUG_THUNDER)) this.player.activeEnchant = 'thunder';
    }

    // ── Hold-and-release Cast — debug-only ability (Victor 2026-05-15).
    //   ?debug in URL → ability live (charge/preview/fire all enabled)
    //   no ?debug     → ability fully suppressed, leftover state cleared
    const _shardAbilityOn = new URLSearchParams(window.location.search).has('debug');
    if (!_shardAbilityOn) {
      this.egoCastChargeMs = 0;
      this.egoShardPreview.hide();
      this.player.isAiming = false;
    }
    const castDown = _shardAbilityOn && !this.heldContainer && this.game.input.isDown(GameAction.CAST);
    const canCast = _shardAbilityOn && !this.heldContainer && this.player.egoCastCooldownMs <= 0 && this.player.egoShardCount > 0;
    const facing: -1 | 1 = this.player.facingRight ? 1 : -1;
    const launchX = this.player.x + this.player.width / 2 + facing * 14;
    const launchY = this.player.y + this.player.height * 0.38 - 5;
    if (castDown && canCast) {
      this.egoCastChargeMs = Math.min(this.egoCastChargeMs + dt, CAST_CHARGE_MAX_MS);
      this.player.isAiming = true;
      const { vx, vy } = getShardVelocity(this.egoCastChargeMs, facing);
      const grid = this.fullGrid;
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
    // Tick recovery queue (persists across rooms). On expiry the oldest
    // living world-shard is called back with a ring burst.
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
    // LdtkWorldScene 와 동일 흐름. 자세한 주석은 LdtkWorldScene update() 참조.
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
      // (2026-05-17 — GRAB/ATTACK 양쪽으로 throw 가능)
      const facing = this.player.facingRight ? 1 : -1;
      this.heldContainer.release(facing * 160, -170);
      this.heldContainer = null;
      this.arcTether?.hide();
      this.game.input.consumeJustPressed(GameAction.ATTACK);
    }
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

    // LDtk-placed static entities (spikes, cracked floors, switches, etc.)
    this.updateStaticEntities(dt);

    // Memory Room triggers ? animate shards + show dialogue on entry
    this.checkMemoryTriggers(dt);

    if (this.player.isDead) {

      // Analytics: death in item world
      const cell = this.getCurrentCell();
      trackPlayerDeath({
        area: 'itemworld',
        room_col: cell?.col ?? 0,
        room_row: cell?.row ?? 0,
        enemy_type: this.player.lastDamageSource,
      });
      this.progressController.setExitReason('death');
      trackItemWorldExit('death', this.currentStratumIndex);
      this.exitTracked = true;

      // ── Ego T11: player death ──
      this.fireEgoPlayerDeath();

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

      // Show death result modal before exiting
      this.cleanupForReturnResult();
      if (!this.uiController.showReturnResult({
        item: this.item,
        prevLevel: this.stratumStartLevel,
        prevAtk: this.stratumStartAtk,
        goldEarned: 0,
        enemiesDefeated: this.enemies.filter(e => !e.alive).length,
        innocentsCaptured: this.item.innocents.length - this.stratumStartInnocentCount,
        strataCleared: this.currentStratumIndex,
        totalStrata: this.strataConfig.strata.length,
        isDeath: true,
      }, () => {
        this.startExitFade();
      })) {
        this.startExitFade();
      }
      return;
    }

    // Update enemies
    for (const enemy of this.enemies) enemy.update(dt);
    // DEC-038 Town residents — idle anim + proximity 진입 시 검 Ego 발화.
    for (const r of this.memoryResidents) r.update(dt);
    this.updateResidentEgoTriggers();
    // DEC-039 Trapdoor — idle anim + proximity prompt + ATTACK 인터랙트.
    this.updateTrapdoor(dt);
    // ItemWorld exit Anvil — proximity prompt + ATTACK 인터랙트로 ESC 다이얼로그.
    this.updateItemWorldAnvils(dt);
    // 수동 cell culling — viewport 밖 cell 의 4 layer 는 visible=false 로 draw skip.
    this.updateCellVisibility();

    // Player attacks ? Sakurai full feedback chain
    if (this.player.isAttackActive()) {
      const targets = this.enemies.filter(e => e.alive) as CombatEntity[];
      const hits = this.hitManager.checkHits(this.player, this.player.comboIndex, this.player.hitList, targets);
      for (const hit of hits) {
        this.dmgNumbers.spawn(hit.hitX, hit.hitY - 8, hit.damage, hit.heavy, hit.critical);
        this.hitSparks.spawn(hit.hitX, hit.hitY, hit.heavy, hit.dirX);
        SFX.play('attack_hit');
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
      if (!enemy.alive && !isEnemyExpGranted(enemy)) {
        markEnemyExpGranted(enemy);

        // ── Ego T06: first enemy kill ──
        if (!(enemy instanceof MemoryShardNPC) && !(enemy as any)._isBoss) {
          this.fireEgoFirstKill();
        }

        // Analytics: enemy kill distribution (excludes Innocents ? capture, not kill)
        if (!(enemy instanceof MemoryShardNPC)) {
          trackEnemyKill({
            area: 'itemworld',
            enemy_type: enemy.constructor.name.toLowerCase(),
            is_boss: !!(enemy as any)._isBoss,
            is_elite: enemy instanceof GoldenMonster,
          });
        }

        // A11: enhanced death burst. Innocents are "captured" (A15 handles
        // them separately) so skip the burst for them to avoid double-fx.
        if (!(enemy instanceof MemoryShardNPC)) {
          const heavy = !!(enemy as any)._isBoss;
          this.deathParticles.spawn(
            enemy.x + enemy.width / 2,
            enemy.y + enemy.height / 2,
            heavy,
          );
        }

        // Decrement room enemy count; if it reaches zero, mark room cleared
        const rk = getEnemyRoomKey(enemy);
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

        if (!(enemy instanceof MemoryShardNPC)) {
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

          // Gold drop on kill — confetti burst of mixed denominations.
          const baseGold = Math.floor((enemy.exp > 0 ? enemy.exp : 40) * 0.1);
          const goldAmount = isGolden ? baseGold * 3 : baseGold;
          if (goldAmount > 0) {
            for (const gp of GoldPickup.spawnBurst(dropX, dropY, goldAmount)) {
              gp.roomData = this.roomData;
              this.goldPickups.push(gp);
              this.entityLayer.addChild(gp.container);
            }
          }
        }
      }
      if (enemy.shouldRemove) {
        if (enemy.container.parent) enemy.container.parent.removeChild(enemy.container);
        this.enemies.splice(i, 1);
      }
    }

    // Healing pickups ? collect on overlap
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
        if (healed > 0) this.toast.show(t('toast.hp_gain', { amount: healed }), 0x44ff44);
        this.itemPickupGlow.spawn(hp.x + hp.width / 2, hp.y + hp.height / 2, 0x44ff44);
        hp.collect();
        hp.destroy();
        this.healingPickups.splice(i, 1);
      }
    }

    // Breakable props (sway animation)
    for (const bp of this.breakableProps) bp.update(dt);

    // Gold pickups ? collect on overlap
    for (let i = this.goldPickups.length - 1; i >= 0; i--) {
      const gp = this.goldPickups[i];
      if (gp.collected) continue;
      gp.update(dt);
      const dx = Math.abs((this.player.x + this.player.width / 2) - (gp.x + gp.width / 2));
      const dy = Math.abs((this.player.y + this.player.height / 2) - (gp.y + gp.height / 2));
      if (dx < 16 && dy < 16) {
        gp.collect();
        this.earnedGold += gp.amount;
        // HUD 총액 갱신 — 외부 세계와 통일성 (baseline + earned).
        this.hud.updateGold(this.baselineGold + this.earnedGold);
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

    // Update projectiles ? player attack can destroy them
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

    // Enemy contact damage ? all enemies deal damage on body overlap
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

    // Boss killed check ? spawn exit portal at boss death location
    // Check ALL dead bosses regardless of exitTrigger state
    for (const enemy of this.enemies) {
      if (!enemy.alive && (enemy as any)._isBoss && !(enemy as any)._portalSpawned) {
        (enemy as any)._portalSpawned = true;
        this.hud.hideBossHP();
        const cell = this.getCurrentCell();
        cell.cleared = true;

        // Playtest 2026-04-26 #1: anvil retires after first IW boss clear
        // (any rarity, any weapon). One-shot — repeat boss kills do nothing.
        if (!sacredSave.isFirstItemWorldBossDefeated()) {
          sacredSave.markFirstItemWorldBossDefeated();
          const unbuffed = removeBeginnerGraceFromStats({
            atk: this.player.atk,
            def: this.player.def,
          });
          this.player.atk = unbuffed.atk;
          this.player.def = unbuffed.def;
        }

        // Analytics: stratum boss defeated
        trackItemWorldFloorClear(this.currentStratumIndex, this.item.rarity);

        // Boss EXP is granted via normal kill EXP path (CSV Exp column = 1200).
        // No forced itemLevelUp() ? SSoT: Content_Stats_Enemy.csv

        // Boss clear heal: 30% maxHP (GDD HEL-03)
        const bossHeal = Math.floor(this.player.maxHp * 0.30);
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + bossHeal);
        if (bossHeal > 0) {
          this.toast.show(t('toast.hp_gain', { amount: bossHeal }), 0x44ff44);
          this.hud.flashBossHeal();
        }

        // HEL-05: Boss drops Anvil Flame (50% maxHP) 100% chance
        const anvilX = enemy.x + enemy.width / 2 - 8;
        const anvilY = enemy.y + enemy.height;
        const anvil = createAnvilFlame(anvilX, anvilY, this.player.maxHp);
        this.healingPickups.push(anvil);
        this.entityLayer.addChild(anvil.container);

        const px = enemy.x + enemy.width / 2;
        const py = enemy.y + enemy.height;
        // Pin portal to boss death position so re-entry never strands the
        // portal in mid-air on LDtk templates with sparse floors.
        cell.bossPortalX = px;
        cell.bossPortalY = py;
        this.progress.bossPortals[String(this.currentStratumIndex)] = { x: px, y: py };
        this.persistRoomState();

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
        this.toast.showBig(t('toast.boss_defeated'), 0xffd35a, 2200);
        // Follow-up burst: ember-gold flash + second particle layer
        setTimeout(() => {
          this.screenFlash.flash(0xffaa22, 0.35, 220);
          this.deathParticles.spawn(bossCx, bossCy, true);
          this.game.camera.shake(5);
        }, 160);

        // ── DEC-039 안 D: Trapdoor 위치 미리 계산만 ──
        // 보스 룸 D 출구는 'no_down' 태그로 영구 잠겼으므로 (RoomGraphAdapter)
        // 자연 폴 다운은 발생하지 않는다. 대신 보스가 죽은 자리에 능동 인터랙트
        // 포탈(Trapdoor) 을 띄운다.
        //
        // 사용자 요청 (2026-05-02): Trapdoor 는 Rustborn 의 보스 처치 대사가
        // 끝난 후 spawn. 그러므로 위치/descentToWorld 만 미리 계산하고, 실제
        // entity 생성은 dialogue 종료 후 spawnTrapdoorEntity() 콜백에서.
        //
        // 위치 보정 — enemy 픽셀 좌표 → cell 도출 → enemy 발 라인 아래로
        // fullGrid 스캔해 floor 라인을 찾는다 (currentRow stale 회피).
        let pendingTrapX = 0;
        let pendingTrapY = 0;
        let pendingDescentToWorld = false;
        if (!this.trapdoor) {
          const enemyCx = enemy.x + enemy.width / 2;
          const enemyFootY = enemy.y + enemy.height;
          const bossCellCol = Math.max(0, Math.floor(enemyCx / IW_ROOM_W_PX));
          const bossCellRow = Math.max(0, Math.floor(enemyFootY / IW_ROOM_H_PX));
          const cellTopRow = bossCellRow * IW_ROOM_H_TILES;
          const cellBottomRow = cellTopRow + IW_ROOM_H_TILES;
          const probeCol = Math.floor(enemyCx / TILE_SIZE);
          let probeRow = Math.max(cellTopRow, Math.floor(enemyFootY / TILE_SIZE));
          let floorTileRow = cellBottomRow - 1;
          while (probeRow < cellBottomRow) {
            const v = this.fullGrid[probeRow]?.[probeCol];
            if (v === 1) { floorTileRow = probeRow; break; }
            probeRow++;
          }
          const cellLeftPx = bossCellCol * IW_ROOM_W_PX;
          const cellRightPx = cellLeftPx + IW_ROOM_W_PX;
          pendingTrapX = Math.min(cellRightPx - 16, Math.max(cellLeftPx + 16, enemyCx));
          pendingTrapY = floorTileRow * TILE_SIZE;
          pendingDescentToWorld = this.isFinalEndRoom(bossCellCol, bossCellRow);
          Debug.log(`[Trapdoor] queued at (${pendingTrapX.toFixed(0)}, ${pendingTrapY.toFixed(0)}) cell=(${bossCellCol},${bossCellRow}) descentToWorld=${pendingDescentToWorld}`);
        }

        // Trapdoor entity 생성 콜백 — dialogue 종료 후 호출.
        const spawnTrapdoorEntity = (): void => {
          if (this.trapdoor) return;
          this.trapdoor = new Trapdoor(pendingTrapX, pendingTrapY);
          this.entityLayer.addChild(this.trapdoor.container);
          this.descentToWorld = pendingDescentToWorld;
          this.toast.show(t('toast.trapdoor_opens'), 0xff7744);
          Debug.log(`[Trapdoor] spawned post-dialogue at (${pendingTrapX.toFixed(0)}, ${pendingTrapY.toFixed(0)})`);
          // DLG-11: Trapdoor 포탈 — 첫 spawn 시점에 한 번만 발화 (사용자
          // 결정 2026-05-04). EGO_EVENT.TRAPDOOR_THANKS 표식으로 중복 차단.
          if (
            this.loreDisplay &&
            !this.egoUnlockedEvents.has(EGO_EVENT.TRAPDOOR_THANKS) &&
            !this.loreDisplay.isActive
          ) {
            this.egoUnlockedEvents.add(EGO_EVENT.TRAPDOOR_THANKS);
            void this.loreDisplay.showDialogue(EGO_TRAPDOOR_THANKS, false);
          }
        };

        // ── Ego T12: boss killed dialogue ──
        // First-clear (boss never killed before): clear FX → Ego dialogue
        //   (freeze) → Trapdoor spawn. 사용자 요청 (2026-05-02) — Trapdoor 는
        //   Rustborn 대사가 끝난 후 등장.
        const wasOnboarding = this.isFirstBossOnboarding();
        if (this.egoActive && wasOnboarding) {
          this.egoUnlockedEvents.add(EGO_EVENT.BOSS_KILLED);
          setTimeout(async () => {
            await this.loreDisplay?.showDialogue(EGO_BOSS_KILLED, true);
            spawnTrapdoorEntity();
          }, 2500);
        } else {
          // Non-onboarding: ego dialogue 없음. 보스 처치 cinematic (BOSS DEFEATED
          // 토스트 2.2초) 후 trapdoor spawn 으로 호흡 한 박자.
          setTimeout(() => {
            spawnTrapdoorEntity();
          }, 2500);
        }
        break;
      }
    }

    // DEC-039 안 A: 보스 처치 시 포털 워프 분기 제거됨. 플레이어는 down exit
    // 으로 자연스럽게 다음 stratum 으로 걸어간다.

    // DEC-039 안 A: 통일 좌표계 — totalGrid 전체로 clamp.
    const totalCols = this.unifiedGrid.totalWidth;
    const totalRows = this.unifiedGrid.totalHeight;
    const playerRoomCol = Math.max(0, Math.min(totalCols - 1, Math.floor(this.player.x / IW_ROOM_W_PX)));
    const playerAbsRow = Math.max(0, Math.min(totalRows - 1, Math.floor(this.player.y / IW_ROOM_H_PX)));
    const roomKey = `${playerRoomCol},${playerAbsRow}`;

    // DEC-039 안 A: stratum 경계 가로지르기 감지 — 셀이 바뀔 때마다 평가하고,
    // stratumIndex 가 변하면 DEPTH 토스트 + progress 갱신. 재방문 시에도 토스트가
    // 떠야 하므로 spawn-once 가드 바깥에 둔다.
    const prevStratumIndex = this.currentStratumIndex;
    const cellAtCursor = this.unifiedGrid.cells[playerAbsRow]?.[playerRoomCol] ?? null;
    if (cellAtCursor && cellAtCursor.stratumIndex !== prevStratumIndex) {
      const totalStrata = this.strataConfig.strata.length;
      this.currentStratumIndex = cellAtCursor.stratumIndex;
      this.currentStratumDef = this.strataConfig.strata[this.currentStratumIndex];
      this.toast.show(t('toast.depth', { n: this.currentStratumIndex + 1, total: totalStrata }), 0xff4488);
      if (this.currentStratumIndex > prevStratumIndex) {
        if (this.progress.deepestUnlocked < this.currentStratumIndex) {
          this.progress.deepestUnlocked = this.currentStratumIndex;
        }
        this.progress.lastSafeStratum = this.currentStratumIndex;
        // 사용자 결정 (2026-05-04): progress 영구 저장 — 사망 후 재진입 시 stratum
        // picker 가 deepestUnlocked 까지 select 가능하게. 누락되면 picker 가 안 떠
        // stratum 1 plaza 부터 시작 → 보스 hole 복구로 진행 막힘.
        this.persistRoomState();
      }
    }

    // Spawn enemies in this room if not yet spawned (first-ever visit)
    if (!this.spawnedRooms.has(roomKey)) {
      this.spawnedRooms.add(roomKey);
      this.currentCol = playerRoomCol;
      this.currentRow = playerAbsRow;
      const enteredCell = this.getCurrentCell();
      if (enteredCell) {
        enteredCell.visited = true;
        this.persistRoomState();
        this.drawMiniMap();
        // Track last non-boss / non-stratum-start room for first-entry respawn
        const sOff = this.unifiedGrid.strataOffsets[this.currentStratumIndex];
        const isStratumStart = sOff && playerAbsRow === sOff.rowOffset && enteredCell.onCriticalPath;
        if (!isStratumStart && !this.isStratumEndRoom(this.currentCol, this.currentRow)) {
          this.lastSafeRoomCol = this.currentCol;
          this.lastSafeRoomRow = this.currentRow;
        }
      }
      this.spawnEnemiesInRoom(this.currentCol, this.currentRow);

      // ── Ego T05: first monster visible (fire on first room with enemies) ──
      if (this.enemies.length > 0) {
        this.fireEgoMonsterVisible();
      }
    }

    // Pre-spawn neighbors whenever player enters a DIFFERENT room.
    if (this.lastPreSpawnRoomKey !== roomKey) {
      this.lastPreSpawnRoomKey = roomKey;
      this.preSpawnNeighborRooms(playerRoomCol, playerAbsRow);
    }

    // HUD, damage numbers, toast & Sakurai effects
    this.hud.updateHP(this.player.hp, this.player.maxHp);
    this.hud.updateFlask(this.player.flaskCharges, this.player.flaskMaxCharges);
    this.hud.updateATK(this.player.atk);
    this.hud.setBurnStatus(this.player.burnRemainingMs ?? 0, MAGMA_BURN_DURATION_MS);
    this.updateOxygenOverlay();
    this.hud.setEgoShards(this.player.egoShardCount, 3, this.player.activeEnchant);
    // Boss HP bar ? 교전 감지 2중 트리거.
    //  1) FSM 상태 ≠ idle/death
    //  2) hp < maxHp ? superArmor 보스는 타격해도 FSM 이 hit 으로 전이되지 않으므로
    //     데미지 기록을 직접 본다.
    const activeBoss = this.enemies.find(e => (e as any)._isBoss && e.alive);
    if (activeBoss) {
      const st = activeBoss.fsm.currentState;
      const fsmEngaged = st !== null && st !== 'idle' && st !== 'death';
      const wasHit = activeBoss.hp < activeBoss.maxHp;
      const engaged = fsmEngaged || wasHit;
      if (engaged && !(activeBoss as any)._bossBarShown) {
        (activeBoss as any)._bossBarShown = true;
        this.hud.showBossHP((activeBoss as any).enemyType ?? t('ui.hud.boss_default'), activeBoss.hp, activeBoss.maxHp);
      }
      if ((activeBoss as any)._bossBarShown) {
        this.hud.updateBossHP(activeBoss.hp);
      }
    }
    this.hud.update(dt);
    this.updateHudText();
    this.dmgNumbers.update(dt);
    this.hitSparks.update(dt);
    this.propShatter.update(dt);
    this.deathParticles.update(dt);
    this.updateCaptureOrbs(dt);
    this._updateStratumClearPanel(dt);
    this.screenFlash.update(dt);

    // Movement VFX (consume player one-shot events + trail updates)
    this.updateMovementVfx(dt);

    // DEC-039 안 A: 플레이어를 통일 좌표 전체로 clamp.
    const mapW = this.unifiedGrid.totalWidth * IW_ROOM_W_PX;
    const mapH = this.unifiedGrid.totalHeight * IW_ROOM_H_PX;
    if (this.player.x < 0) this.player.x = 0;
    if (this.player.y < 0) this.player.y = 0;
    if (this.player.x > mapW - this.player.width) this.player.x = mapW - this.player.width;
    if (this.player.y > mapH - this.player.height) this.player.y = mapH - this.player.height;

    // Camera
    this.game.camera.target = {
      x: this.player.x + this.player.width / 2,
      y: this.player.y + this.player.height / 2,
    };
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
    const LOOK_HOLD_THRESHOLD = 400;
    this.game.camera.lookDirection = (wantLook && this.lookHoldTimer >= LOOK_HOLD_THRESHOLD)
      ? (lookUp ? -1 : 1)
      : 0;
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
      // Land thud — 낙하 속도가 의미 있을 때만 (작은 점프 후 착지 noise 회피).
      // 무거운 낙하일수록 slower playback (deeper pitch) 로 묵직한 느낌.
      if (landedSpeed > 120) {
        const t = Math.min(1, (landedSpeed - 120) / 380);
        SFX.play('land', 0, { speed: 1.1 - t * 0.25 });
      }
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
    if (this.footstepPuff.stepIfMoving(
      dt, p.isGrounded(),
      p.x + p.width / 2, p.y + p.height,
      p.getVx(), p.facingRight,
    )) {
      SFX.play('footstep', 0, { speed: 0.92 + Math.random() * 0.16 });
    }
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
      const impulseVy = waterT > 0 ? Math.max(80, p.getVy()) : -120;
      this.fluidSystem.applyImpulse(p.x + p.width / 2, p.y + p.height, impulseVy);
    }
    // ── Residue trail timers (oil/acid/magma) ───────────────────────────
    const playerWaterfallType = this.fluidSpawners.queryFluidAtAabb(p.x, p.y, p.width, p.height, this.fullGrid);
    const inOil_   = isInOil  (p.x, p.y, p.width, p.height, this.fullGrid) || playerWaterfallType === 'oil';
    const inAcid_  = isInAcid (p.x, p.y, p.width, p.height, this.fullGrid) || playerWaterfallType === 'acid';
    const inMagma_ = isInMagma(p.x, p.y, p.width, p.height, this.fullGrid) || playerWaterfallType === 'magma';
    const inCyro_  = isInCyro (p.x, p.y, p.width, p.height, this.fullGrid) || playerWaterfallType === 'cyro';
    // Non-water fluid entry / exit splash — same impulse pattern as water.
    const inAnyOther = inMagma_ || inOil_ || inAcid_ || inCyro_;
    if (inAnyOther !== this.prevPlayerInOtherFluid) {
      const type: 'magma' | 'oil' | 'acid' | 'cyro' = inCyro_ ? 'cyro' : inOil_ ? 'oil' : inAcid_ ? 'acid' : 'magma';
      const strength = inAnyOther ? 1.0 : 0.8;
      this.waterSplash.spawn(p.x + p.width / 2, p.y + p.height, strength, type);
      const impulseVy = inAnyOther ? Math.max(80, p.getVy()) : -120;
      this.fluidSystem.applyImpulse(p.x + p.width / 2, p.y + p.height, impulseVy);
      if (inAnyOther && inMagma_) {
        this.steamPuff.spawn(p.x + p.width / 2, p.y + p.height, 1.2);
      }
      this.prevPlayerInOtherFluid = inAnyOther;
    }
    if (inOil_) {
      p.oilSlipRemainingMs = OIL_SLIP_DURATION_MS;
      p.oilResidueRemainingMs = OIL_RESIDUE_DURATION_MS;
    } else {
      if (p.oilSlipRemainingMs > 0) p.oilSlipRemainingMs = Math.max(0, p.oilSlipRemainingMs - dt);
      if (p.oilResidueRemainingMs > 0) p.oilResidueRemainingMs = Math.max(0, p.oilResidueRemainingMs - dt);
    }
    p.prevInOil = inOil_;
    if (inAcid_)  p.acidResidueRemainingMs = ACID_RESIDUE_DURATION_MS;
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

    this.fluidResidue.applyEffects(p.x, p.y, p.width, p.height, {
      refreshOilSlip: (_remainingMs) => {
        // No-op (2026-05-17): residue blot → player 전이 차단. 발자국 자가-재오일
        // 루프로 "발바닥 기름이 영원히 안 사라지던" 버그 픽스. TILE_OIL 원본만 전이.
      },
      onAcidContact: () => {
        let acc = p.acidTickAccum ?? 0;
        acc += dt;
        while (acc >= 100) {
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
        if (!p.invincible) {
          const dmg = Math.max(1, Math.floor(p.maxHp * 0.03 * (dt / 1000)));
          p.hp = Math.max(0, p.hp - dmg);
        }
        p.burnRemainingMs = Math.max(p.burnRemainingMs ?? 0, 10000);
      },
    });
    if (p.inWater) p.extinguishFireDebuffs();
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
        this.waterSplash.spawn(ex, ey, strength, 'water');
        const impulseVy = e.waterTransition > 0 ? 150 : -100;
        this.fluidSystem.applyImpulse(ex, ey, impulseVy);
      }
      // Non-water fluid transition for enemies (magma/oil/acid).
      const eInOther = isInMagma(e.x, e.y, e.width, e.height, this.fullGrid)
                    || isInOil  (e.x, e.y, e.width, e.height, this.fullGrid)
                    || isInAcid (e.x, e.y, e.width, e.height, this.fullGrid);
      const ePrevOther = this.prevEnemyInOtherFluid[i] ?? false;
      if (eInOther !== ePrevOther) {
        let type: 'magma' | 'oil' | 'acid' = 'magma';
        if (isInOil (e.x, e.y, e.width, e.height, this.fullGrid)) type = 'oil';
        else if (isInAcid(e.x, e.y, e.width, e.height, this.fullGrid)) type = 'acid';
        const strength = eInOther ? 1.0 : 0.8;
        this.waterSplash.spawn(ex, ey, strength, type);
        const impulseVy = eInOther ? 150 : -100;
        this.fluidSystem.applyImpulse(ex, ey, impulseVy);
        this.prevEnemyInOtherFluid[i] = eInOther;
      }
      const key = `enemy_${i}`;
      this.waterBubbles.emit(ex, e.y + e.height * 0.35, dt, e.submerged, key);
      this.iceSkidStreak.emit(dt, e.isStandingOnIce(), ex, ey, e.getVx(), key);
      const eLanded = e.consumeLandedEvent();
      if (eLanded !== null) this.landingDust.spawn(ex, ey, eLanded);
      if (e.consumeGroundJumpEvent()) this.jumpTakeoff.spawn(ex, ey);

      // Residue contact effects — element multiplier per source.
      if (e.oilSlipRemainingMs > 0) e.oilSlipRemainingMs = Math.max(0, e.oilSlipRemainingMs - dt);
      const eAcidM2  = e.elementMultiplier('acid');
      const eMagmaM2 = e.elementMultiplier('magma');
      const eFireM2  = e.elementMultiplier('fire');
      this.fluidResidue.applyEffects(e.x, e.y, e.width, e.height, {
        refreshOilSlip: (remainingMs) => {
          e.oilSlipRemainingMs = Math.max(e.oilSlipRemainingMs, remainingMs);
        },
        onAcidContact: () => {
          if (eAcidM2 <= 0) return;
          let acc = e.acidTickAccum;
          acc += dt;
          let totalDmg = 0;
          while (acc >= 100) {
            acc -= 100;
            const dmg = Math.max(1, Math.floor(e.maxHp * 0.005 * eAcidM2));
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
          if (eMagmaM2 <= 0) return;
          const wasBurning = e.burnRemainingMs > 0;
          e.burnRemainingMs = 15000;
          if (!wasBurning) {
            const dmg = Math.max(1, Math.floor(e.maxHp * 0.02 * eMagmaM2));
            e.hp = Math.max(0, e.hp - dmg);
            e.showHpBarFlash();
            this.dmgNumbers.spawn(e.x + e.width / 2, e.y - 8, dmg, false);
            if (e.hp <= 0) e.onDeath();
          }
        },
        onFireContact: () => {
          if (eFireM2 <= 0) return;
          const dmg = Math.max(1, Math.floor(e.maxHp * 0.03 * eFireM2 * (dt / 1000)));
          e.hp = Math.max(0, e.hp - dmg);
          e.burnRemainingMs = Math.max(e.burnRemainingMs, 10000);
          if (e.hp <= 0) e.onDeath();
        },
      });
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
    this.steamPuff.update(dt);
    this.fluidResidue.update(dt);
    // Throwable containers: gravity + impact paint (ItemWorld uses fullGrid).
    const isContainerFluidCell = (gx: number, gy: number): boolean => {
      const t = this.fullGrid[gy]?.[gx] ?? 0;
      return t === 2 || t === 6 || t === 8 || t === 11 || t === 13 || t === 20;
    };
    const isContainerSolidCellFor = (c: ThrowableContainer) => (gx: number, gy: number): boolean => {
      const t = this.fullGrid[gy]?.[gx] ?? 0;
      if (t === 1 || t === 3 || t === 7 || t === 9 || t === 12 || t === 15) return true;
      return c.isWoodFamily() && isContainerFluidCell(gx, gy);
    };
    const containerOverlapsFluid = (c: ThrowableContainer): boolean => {
      const left = Math.floor(c.colX / 16);
      const right = Math.floor((c.colX + c.colW - 1) / 16);
      const top = Math.floor(c.colY / 16);
      const bottom = Math.floor((c.colY + c.colH - 1) / 16);
      for (let gy = top; gy <= bottom; gy++) {
        for (let gx = left; gx <= right; gx++) {
          if (isContainerFluidCell(gx, gy)) return true;
        }
      }
      return false;
    };
    const env = {
      isAcidCell:  (gx: number, gy: number) => (this.fullGrid[gy]?.[gx] ?? 0) === 13,
      isMagmaCell: (gx: number, gy: number) => (this.fullGrid[gy]?.[gx] ?? 0) === 6,
      isFireCell:  (gx: number, gy: number) => this.tileMutator.aabbHasOverlay(gx * 16, gy * 16, 16, 16, 'fire'),
      // R-NEW-049/050/051/052/053: 신규 환경 노출 hook
      isWaterCell: (gx: number, gy: number) => (this.fullGrid[gy]?.[gx] ?? 0) === 2,
      isOilCell:   (gx: number, gy: number) => (this.fullGrid[gy]?.[gx] ?? 0) === 11,
      isFrozenOrIceCell: (gx: number, gy: number) =>
        (this.fullGrid[gy]?.[gx] ?? 0) === 7 || this.tileMutator.isFrozen(gx, gy),
      isChargedCell: (gx: number, gy: number) => (this.fullGrid[gy]?.[gx] ?? 0) === 8,
    };
    for (let i = this.containers.length - 1; i >= 0; i--) {
      const c = this.containers[i];
      const envImpact = c.tickEnvironment(dt, env);
      if (envImpact) {
        if (containerOverlapsFluid(c)) {
          this.paintContainerImpact(c.kind, envImpact.gx, envImpact.gy, c.fluidVolume);
        }
        this.applyContainerEffectToFluid(c);
        this.destroyContainerWithVFX(c);
        this.containers.splice(i, 1);
        continue;
      }
      const impact = c.update(dt, isContainerSolidCellFor(c), this.containers, isContainerFluidCell);
      if (impact) {
        this.paintContainerImpact(c.kind, impact.gx, impact.gy, c.fluidVolume);
        this.destroyContainerWithVFX(c);
        this.containers.splice(i, 1);
        continue;
      }
      this.applyContainerEffectToFluid(c);
    }
    // ── Thrown container × enemy impact (one hit per throw) ──
    this.checkThrownContainerEnemyHit();
    // ── Enemy ↔ container collision (stack / block, no damage) ──
    for (const e of this.enemies) {
      if (!e.alive) continue;
      for (const c of this.containers) {
        if (c.destroyed || c.held) continue;
        const cx0 = c.colX, cy0 = c.colY, cx1 = c.colX + c.colW, cy1 = c.colY + c.colH;
        const ex0 = e.x, ey0 = e.y, ex1 = e.x + e.width, ey1 = e.y + e.height;
        if (ex1 <= cx0 || ex0 >= cx1 || ey1 <= cy0 || ey0 >= cy1) continue;
        const oL = ex1 - cx0;
        const oR = cx1 - ex0;
        const oT = ey1 - cy0;
        const oB = cy1 - ey0;
        const minE = Math.min(oL, oR, oT, oB);
        if (minE === oT) {
          e.y = cy0 - e.height;
          if (e.vy > 0) e.vy = 0;
        } else if (minE === oB) {
          c.y -= oB;
          if (c.vy > 0) c.vy = 0;
          c.container.x = c.x; c.container.y = c.y;
          if (e.vy < 0) e.vy = 0;
        } else if (minE === oL) {
          e.x = cx0 - e.width;
          if (e.vx > 0) e.vx = 0;
        } else if (minE === oR) {
          e.x = cx1;
          if (e.vx < 0) e.vx = 0;
        }
      }
    }
    // Player ↔ container resolve (same as world scene). Uses collision rect.
    const p2 = this.player;
    for (const c of this.containers) {
      if (c.destroyed || c.held) continue;
      const cx0 = c.colX, cy0 = c.colY, cx1 = c.colX + c.colW, cy1 = c.colY + c.colH;
      const px0 = p2.x, py0 = p2.y, px1 = p2.x + p2.width, py1 = p2.y + p2.height;
      if (px1 <= cx0 || px0 >= cx1 || py1 <= cy0 || py0 >= cy1) continue;
      const overlapLeft   = px1 - cx0;
      const overlapRight  = cx1 - px0;
      const overlapTop    = py1 - cy0;
      const overlapBottom = cy1 - py0;
      const min = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
      if (min === overlapTop) {
        p2.y = cy0 - p2.height;
        if (p2.getVy() > 0) p2.vy = 0;
        p2.forceGrounded();
      } else if (min === overlapBottom) {
        // Container above — push container UP (never bury player into floor).
        c.y -= overlapBottom;
        if (c.vy > 0) c.vy = 0;
        c.container.x = c.x;
        c.container.y = c.y;
        if (p2.getVy() < 0) p2.vy = 0;
      } else if (min === overlapLeft) {
        if (Math.abs(p2.getVx()) > 20) {
          const newX = c.x + Math.max(0, overlapLeft - 1);
          if (this.canContainerOccupyX(c, newX)) {
            c.x = newX;
            c.container.x = c.x;
          }
        }
        p2.x = cx0 - p2.width;
      } else if (min === overlapRight) {
        if (Math.abs(p2.getVx()) > 20) {
          const newX = c.x - Math.max(0, overlapRight - 1);
          if (this.canContainerOccupyX(c, newX)) {
            c.x = newX;
            c.container.x = c.x;
          }
        }
        p2.x = cx1;
      }
    }
    this.flushContainerFluidChanges();
    // Ego shards: flight + impact + retrieval (uses fullGrid for solid check).
    this.egoShard.update(
      dt,
      (info) => this.onEgoShardImpact(info.x, info.y, info.element),
      (x, y) => {
        const gx = Math.floor(x / 16);
        const gy = Math.floor(y / 16);
        const t = this.fullGrid[gy]?.[gx] ?? 0;
        return t === 1 || t === 7 || t === 9 || t === 12 || t === 15;
      },
      (x, y, element) => this.checkShardEnemyHit(x, y, element) || this.checkShardContainerHit(x, y),
    );
    this.flushContainerFluidChanges();
    const pad = 24;
    const retrieved = this.egoShard.retrieveInAABB(
      this.player.x - pad,
      this.player.y - pad,
      this.player.width + pad * 2,
      this.player.height + pad * 2,
    );
    for (let i = 0; i < retrieved; i++) {
      const cd = this.player.shardCooldowns;
      if (cd.length > 0) {
        let maxIdx = 0;
        for (let j = 1; j < cd.length; j++) if (cd[j] > cd[maxIdx]) maxIdx = j;
        cd.splice(maxIdx, 1);
      }
      this.player.egoShardCount = Math.min(this.player.egoShardCount + 1, EGO_SHARD_MAX);
    }
    this.waterBubbles.update(dt);
    this.dropThroughDust.update(dt);
    this.iceSkidStreak.update(dt);
    this.itemPickupGlow.update(dt);
    const hpRatio = this.player.maxHp > 0 ? this.player.hp / this.player.maxHp : 0;
    this.lowHpVignette.update(dt, hpRatio);
  }

  private getClearedStrataFlags(): boolean[] {
    const totalStrata = this.strataConfig.strata.length;
    const cleared: boolean[] = [];
    for (let i = 0; i < totalStrata; i++) {
      const endRoom = this.unifiedGrid.stratumEndRooms.find(e => e.stratumIndex === i);
      if (endRoom) {
        const cell = this.unifiedGrid.cells[endRoom.absoluteRow]?.[endRoom.col];
        cleared.push(
          (cell?.cleared ?? false) ||
          !!this.progress.bossPortals?.[String(i)] ||
          this.progress.deepestUnlocked > i,
        );
      } else {
        cleared.push(false);
      }
    }
    return cleared;
  }

  private restoreGameplayHud(): void {
    this.hud.container.visible = true;
    this.hud.hideBossHP();
    this.hud.showDepthGauge(
      this.strataConfig.strata.length,
      this.currentStratumIndex,
      this.getClearedStrataFlags(),
    );
    this.hud.showItemExp(
      this.item.def.name,
      RARITY_COLOR[this.item.rarity],
      this.item.level,
      this.item.exp,
      EXP_PER_LEVEL,
    );
    this.updateHudText();
  }

  private updateHudText(): void {
    const cycleTag = this.progress.cycle > 0 ? `C${this.progress.cycle} ` : '';
    const dbg = `[r=${this.item.rarity} cy=${this.progress.cycle} deep=${this.progress.deepestUnlocked} clr=${this.progress.clearedRooms.length}]`;
    const buffDbg = new URLSearchParams(window.location.search).get('debug') === '1'
      ? ` ${formatActivePlayerBuffsDebug()}`
      : '';
    this.hud.setFloorText(
      `${cycleTag}${this.item.def.name} Lv${this.item.level} EXP:${this.item.exp}/${EXP_PER_LEVEL} +${this.earnedExp} ${dbg}${buffDbg}`
    );

    // Update depth gauge
    const cleared = this.getClearedStrataFlags();
    this.hud.updateDepthGauge(this.currentStratumIndex, cleared);
  }

  private showEscapeConfirm(): void {
    this.uiController.showEscapeConfirm({
      hudSkin: this.hudSkin,
      itemName: this.item.def.name,
      itemLevel: this.item.level,
      itemExp: this.item.exp,
      expPerLevel: EXP_PER_LEVEL,
      roomsCleared: this.roomsCleared,
      totalRooms: this.totalRooms,
      earnedExp: this.earnedExp,
      earnedGold: this.earnedGold,
      prompts: {
        exitPrompt: null,
      },
    });
  }

  private hideEscapeConfirm(): void {
    this.uiController.hideEscapeConfirm();
  }

  // ---------------------------------------------------------------------------
  // Stratum picker ? choose starting stratum on re-entry (after first clear)
  // ---------------------------------------------------------------------------

  private showStratumPicker(maxSelectable: number): void {
    this.stratumPickerVisible = true;
    this.stratumPickerMax = Math.max(1, Math.min(maxSelectable, this.strataConfig.strata.length));
    // Default selection = deepest unlocked stratum (사용자 결정 2026-05-04).
    // 사망 후 재진입 시 사용자가 ↓ 키 안 눌러도 가장 깊이 도달한 plaza 로 자동
    // 가도록. stratum 1 default 였을 땐 보스 hole 복구로 진행 막혔음.
    this.stratumPickerSelection = Math.min(
      this.progress.deepestUnlocked,
      this.stratumPickerMax - 1,
    );
    this.stratumPickerPulseTimer = 0;
    this.drawStratumPicker();
  }

  private drawStratumPicker(): void {
    if (this.stratumPicker?.parent) {
      this.stratumPicker.parent.removeChild(this.stratumPicker);
    }
    this.stratumPicker?.destroy({ children: true });
    this.stratumPickerPulseG = null;
    this.stratumPickerPulseRect = null;

    const totalStrata = this.strataConfig.strata.length;
    const rowHeaderH = 12;
    const rowsH = totalStrata * STRATUM_PICKER_ROW_H + Math.max(0, totalStrata - 1) * STRATUM_PICKER_ROW_GAP;
    const contentH = Math.max(104, rowHeaderH + rowsH);
    const panelH = STRATUM_PICKER_PAD + STRATUM_PICKER_HEADER_H + 6 + contentH + 8 + STRATUM_PICKER_FOOTER_H + STRATUM_PICKER_PAD;

    const root = new Container();
    const dim = new Graphics();
    dim.rect(0, 0, GAME_WIDTH, GAME_HEIGHT).fill({ color: 0x000000, alpha: 0.5 });
    root.addChild(dim);

    const panel = new Container();
    panel.x = Math.floor((GAME_WIDTH - STRATUM_PICKER_W) / 2);
    panel.y = Math.floor((GAME_HEIGHT - panelH) / 2);
    root.addChild(panel);

    const frame = this.hudSkin?.isLoaded ? create9SlicePanel(this.hudSkin, STRATUM_PICKER_W, panelH) : null;
    if (frame) { panel.addChild(frame); } else {
      const bg = new Graphics();
      bg.rect(0, 0, STRATUM_PICKER_W, panelH).fill({ color: 0x1a1a2e, alpha: 0.96 });
      bg.rect(0, 0, STRATUM_PICKER_W, panelH).stroke({ color: STRATUM_PICKER_COL_BORDER, width: 1 });
      panel.addChild(bg);
    }

    const rarityColor = RARITY_COLOR[this.item.rarity] ?? 0xffffff;
    this.addStratumPickerText(panel, 'SELECT ITEM WORLD START', STRATUM_PICKER_PAD, 8, 10, 0xffffff);
    const cycleTag = this.progress.cycle > 0 ? ` / CYCLE ${this.progress.cycle}` : '';
    this.addStratumPickerText(
      panel,
      `${this.item.def.name} / ${this.item.rarity.toUpperCase()} / Lv.${this.item.level}${cycleTag}`,
      STRATUM_PICKER_PAD,
      23,
      7,
      rarityColor,
      360,
    );
    const depthText = this.addStratumPickerText(
      panel,
      `${this.stratumPickerMax} / ${totalStrata} STRATA`,
      0,
      23,
      7,
      STRATUM_PICKER_COL_ACCENT,
    );
    depthText.x = STRATUM_PICKER_W - STRATUM_PICKER_PAD - depthText.width;

    const headerLine = new Graphics();
    headerLine.moveTo(STRATUM_PICKER_PAD, STRATUM_PICKER_PAD + STRATUM_PICKER_HEADER_H - 1);
    headerLine.lineTo(STRATUM_PICKER_W - STRATUM_PICKER_PAD, STRATUM_PICKER_PAD + STRATUM_PICKER_HEADER_H - 1);
    headerLine.stroke({ width: 1, color: STRATUM_PICKER_COL_BORDER });
    panel.addChild(headerLine);

    const contentY = STRATUM_PICKER_PAD + STRATUM_PICKER_HEADER_H + 6;
    const listX = STRATUM_PICKER_PAD;
    const listY = contentY + rowHeaderH;
    const detailX = listX + STRATUM_PICKER_LIST_W + 14;

    this.addStratumPickerText(panel, 'MEMORY STRATA', listX, contentY, 7, STRATUM_PICKER_COL_MUTED);

    for (let i = 0; i < totalStrata; i++) {
      const y = listY + i * (STRATUM_PICKER_ROW_H + STRATUM_PICKER_ROW_GAP);
      this.drawStratumPickerRow(panel, i, listX, y, STRATUM_PICKER_LIST_W);
    }

    const selectedY = listY + this.stratumPickerSelection * (STRATUM_PICKER_ROW_H + STRATUM_PICKER_ROW_GAP);
    this.stratumPickerPulseG = new Graphics();
    this.stratumPickerPulseG.x = listX;
    this.stratumPickerPulseG.y = selectedY;
    panel.addChild(this.stratumPickerPulseG);
    this.stratumPickerPulseRect = { x: listX, y: selectedY, w: STRATUM_PICKER_LIST_W, h: STRATUM_PICKER_ROW_H };
    this.redrawStratumPickerPulse();

    const detailDivider = new Graphics();
    detailDivider.moveTo(detailX - 9, contentY);
    detailDivider.lineTo(detailX - 9, contentY + contentH - 2);
    detailDivider.stroke({ width: 1, color: STRATUM_PICKER_COL_BORDER });
    panel.addChild(detailDivider);

    this.drawStratumPickerDetail(panel, detailX, contentY, STRATUM_PICKER_DETAIL_W, contentH);

    const footerLine = new Graphics();
    const footerY = panelH - STRATUM_PICKER_PAD - STRATUM_PICKER_FOOTER_H - 2;
    footerLine.moveTo(STRATUM_PICKER_PAD, footerY);
    footerLine.lineTo(STRATUM_PICKER_W - STRATUM_PICKER_PAD, footerY);
    footerLine.stroke({ width: 1, color: STRATUM_PICKER_COL_BORDER });
    panel.addChild(footerLine);
    this.drawStratumPickerControls(panel, STRATUM_PICKER_PAD, footerY + 8);

    this.stratumPicker = root;
    this.game.legacyUIContainer.addChild(root);
  }

  private drawStratumPickerRow(parent: Container, index: number, x: number, y: number, w: number): void {
    const isSelected = index === this.stratumPickerSelection;
    const isLocked = index >= this.stratumPickerMax;
    const cleared = this.getClearedStrataFlags()[index] ?? false;
    const stratumDef = this.strataConfig.strata[index];
    const row = new Graphics();
    row.x = x;
    row.y = y;

    if (isSelected) {
      drawSelectionRow(row, w, STRATUM_PICKER_ROW_H);
    } else if (isLocked) {
      row.rect(0, 0, w, STRATUM_PICKER_ROW_H).fill({ color: 0x000000, alpha: 0.18 });
      row.rect(0, 0, w, STRATUM_PICKER_ROW_H).stroke({ color: 0x2a2a3e, width: 1, alpha: 0.7 });
    } else if (cleared) {
      row.rect(0, 0, w, STRATUM_PICKER_ROW_H).fill({ color: STRATUM_PICKER_COL_POSITIVE, alpha: 0.05 });
    }
    parent.addChild(row);

    if (isSelected) {
      const left = new BitmapText({ text: '\u25B6', style: { fontFamily: PIXEL_FONT, fontSize: 10, fill: ROW_CHEVRON_COLOR } });
      left.x = x + 4;
      left.y = y + 4;
      parent.addChild(left);
      const right = new BitmapText({ text: '\u25C0', style: { fontFamily: PIXEL_FONT, fontSize: 10, fill: ROW_CHEVRON_COLOR } });
      right.x = x + w - 11;
      right.y = y + 4;
      parent.addChild(right);
    }

    const leftBadge = isLocked
      ? t('iw.picker.lock')
      : (isSelected ? t('iw.picker.start') : (cleared ? t('iw.picker.clear') : t('iw.picker.open')));
    const leftBadgeColor = isLocked ? STRATUM_PICKER_COL_LOCKED : (cleared && !isSelected ? STRATUM_PICKER_COL_POSITIVE : STRATUM_PICKER_COL_ACCENT);
    this.drawStratumPickerBadge(parent, x + 20, y + 3, STRATUM_PICKER_BADGE_W, leftBadge, leftBadgeColor, isLocked);

    const nameColor = isLocked
      ? STRATUM_PICKER_COL_MUTED
      : isSelected
        ? 0xffffff
        : cleared
          ? STRATUM_PICKER_COL_POSITIVE
          : STRATUM_PICKER_COL_DIM;
    const suffix = isLocked ? 'Locked' : cleared ? 'Gate Restored' : 'Open';
    this.addStratumPickerText(parent, `Stratum ${index + 1} - ${suffix}`, x + 60, y + 5, 8, nameColor, 150);

    this.addStratumPickerText(
      parent,
      `HP x${stratumDef.hpMul.toFixed(1)}`,
      x + w - 98,
      y + 5,
      7,
      isLocked ? STRATUM_PICKER_COL_MUTED : STRATUM_PICKER_COL_TEXT,
      54,
    );

    const rightBadge = isLocked ? 'LOCK' : (cleared ? 'GATE' : 'OPEN');
    const rightBadgeColor = isLocked ? STRATUM_PICKER_COL_LOCKED : (cleared ? STRATUM_PICKER_COL_POSITIVE : STRATUM_PICKER_COL_ACCENT);
    this.drawStratumPickerBadge(parent, x + w - 42, y + 3, STRATUM_PICKER_RIGHT_BADGE_W, rightBadge, rightBadgeColor, isLocked);
  }

  private drawStratumPickerDetail(parent: Container, x: number, y: number, w: number, h: number): void {
    const index = this.stratumPickerSelection;
    const def = this.strataConfig.strata[index];
    const cleared = this.getClearedStrataFlags()[index] ?? false;
    const gateReady = cleared || !!this.progress.bossPortals?.[String(index)];
    const title = this.addStratumPickerText(parent, `STRATUM ${index + 1}`, x, y, 10, STRATUM_PICKER_COL_ACCENT);
    title.x = x;
    this.addStratumPickerText(parent, 'Current re-entry point', x, y + 13, 7, STRATUM_PICKER_COL_MUTED, w);

    const line = new Graphics();
    line.moveTo(x, y + 28);
    line.lineTo(x + w, y + 28);
    line.stroke({ width: 1, color: STRATUM_PICKER_COL_BORDER });
    parent.addChild(line);

    let sy = y + 36;
    sy = this.drawStratumPickerStat(parent, x, sy, w, 'Boss gate', gateReady ? 'Ready' : 'Uncleared', gateReady ? STRATUM_PICKER_COL_POSITIVE : STRATUM_PICKER_COL_MUTED);
    sy = this.drawStratumPickerStat(parent, x, sy, w, 'Enemy HP', `x${def.hpMul.toFixed(1)}`, STRATUM_PICKER_COL_TEXT);
    sy = this.drawStratumPickerStat(parent, x, sy, w, 'Enemy ATK', `x${def.atkMul.toFixed(1)}`, STRATUM_PICKER_COL_TEXT);
    sy = this.drawStratumPickerStat(parent, x, sy, w, 'EXP', `x${def.expMultiplier.toFixed(1)}`, STRATUM_PICKER_COL_GOLD);

    this.drawStratumPickerDepthGauge(parent, x, y + h - 18, w);
  }

  private drawStratumPickerStat(parent: Container, x: number, y: number, w: number, label: string, value: string, valueColor: number): number {
    this.addStratumPickerText(parent, label, x, y, 8, STRATUM_PICKER_COL_DIM, Math.floor(w * 0.58));
    const valueText = this.addStratumPickerText(parent, value, 0, y, 8, valueColor, Math.floor(w * 0.42));
    valueText.x = x + w - valueText.width;
    return y + 13;
  }

  private drawStratumPickerDepthGauge(parent: Container, x: number, y: number, w: number): void {
    const total = this.strataConfig.strata.length;
    if (total <= 0) return;
    const gap = 3;
    const segW = Math.max(10, Math.floor((w - gap * (total - 1)) / total));
    const cleared = this.getClearedStrataFlags();
    const gauge = new Graphics();
    for (let i = 0; i < total; i++) {
      const sx = x + i * (segW + gap);
      const locked = i >= this.stratumPickerMax;
      const selected = i === this.stratumPickerSelection;
      const color = selected
        ? STRATUM_PICKER_COL_ACCENT
        : cleared[i]
          ? STRATUM_PICKER_COL_POSITIVE
          : locked
            ? STRATUM_PICKER_COL_LOCKED
            : STRATUM_PICKER_COL_DIM;
      gauge.rect(sx, y, segW, 7).fill({ color, alpha: locked ? 0.42 : 0.85 });
      if (selected) {
        gauge.rect(sx - 1, y - 1, segW + 2, 9).stroke({ color: 0xffffff, width: 1, alpha: 0.75 });
      }
    }
    parent.addChild(gauge);
  }

  private drawStratumPickerControls(parent: Container, x: number, y: number): void {
    let cx = x;
    cx = this.drawStratumPickerKey(parent, cx, y, actionKey(GameAction.MOVE_LEFT));
    cx = this.drawStratumPickerKey(parent, cx, y, actionKey(GameAction.MOVE_RIGHT));
    cx = this.addStratumPickerControlText(parent, 'Change', cx + 2, y + 3) + 12;
    cx = this.drawStratumPickerKey(parent, cx, y, actionKey(GameAction.ATTACK));
    cx = this.addStratumPickerControlText(parent, 'Enter', cx + 2, y + 3) + 12;
    cx = this.drawStratumPickerKey(parent, cx, y, actionKey(GameAction.MENU));
    this.addStratumPickerControlText(parent, 'Cancel', cx + 2, y + 3);
  }

  private drawStratumPickerKey(parent: Container, x: number, y: number, label: string): number {
    const w = Math.max(14, label.length * 6 + 8);
    const keyBg = new Graphics();
    keyBg.roundRect(x, y, w, 14, 2)
      .fill({ color: 0x1a1a1a, alpha: 0.85 })
      .stroke({ color: STRATUM_PICKER_COL_LOCKED, width: 1 });
    parent.addChild(keyBg);
    const text = this.addStratumPickerText(parent, label, x, y + 3, 8, 0xffffff, w - 4);
    text.x = x + Math.floor((w - text.width) / 2);
    return x + w + 4;
  }

  private addStratumPickerControlText(parent: Container, text: string, x: number, y: number): number {
    const label = this.addStratumPickerText(parent, text, x, y, 8, STRATUM_PICKER_COL_DIM);
    return x + label.width;
  }

  private drawStratumPickerBadge(parent: Container, x: number, y: number, w: number, text: string, color: number, outlineOnly = false): void {
    const badge = new Graphics();
    if (outlineOnly) {
      badge.roundRect(x, y, w, 12, 2).stroke({ color, width: 1 });
    } else {
      badge.roundRect(x, y, w, 12, 2).fill(color);
    }
    parent.addChild(badge);

    const label = this.addStratumPickerText(parent, text, x, y + 2, 7, outlineOnly ? color : 0x000000, w - 4);
    label.x = x + Math.floor((w - label.width) / 2);
  }

  private addStratumPickerText(parent: Container, text: string, x: number, y: number, size: number, fill: number, maxW?: number): BitmapText {
    const label = new BitmapText({
      text,
      style: { fontFamily: PIXEL_FONT, fontSize: size, fill },
    });
    label.x = x;
    label.y = y;
    if (maxW && label.width > maxW) {
      const scale = Math.max(0.55, maxW / label.width);
      label.scale.set(scale, scale);
    }
    parent.addChild(label);
    return label;
  }

  private redrawStratumPickerPulse(): void {
    if (!this.stratumPickerPulseG || !this.stratumPickerPulseRect) return;
    const t = this.stratumPickerPulseTimer / 1000;
    const a = ROW_SELECTED_GLOW_ALPHA * (0.65 + 0.35 * Math.sin(t * Math.PI * 2 * 1.4));
    this.stratumPickerPulseG.clear();
    drawSelectionPulse(this.stratumPickerPulseG, this.stratumPickerPulseRect.w, this.stratumPickerPulseRect.h, a);
  }

  private hideStratumPicker(): void {
    this.stratumPickerVisible = false;
    if (this.stratumPicker?.parent) {
      this.stratumPicker.parent.removeChild(this.stratumPicker);
    }
    this.stratumPicker?.destroy({ children: true });
    this.stratumPicker = null;
    this.stratumPickerPulseG = null;
    this.stratumPickerPulseRect = null;
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
      // Cancel ? keep default starting stratum
      this.hideStratumPicker();
      return;
    }
  }

  /**
   * Stratum picker / Trapdoor 침강 시퀀스 결과를 적용해 플레이어를 해당 stratum
   * 시작 셀(Plaza 천장 위치) 로 이동. DEC-039 안 D — Trapdoor 가 유일한 지층
   * 전이 수단이며 본 메서드는 텔레포트만 수행 (페이드/카메라 패닝은 호출 측이
   * 책임).
   *
   * 부수 효과:
   *   - 이전 stratum 의 살아있는 적 정리 (다음 지층에 잔류 방지)
   *   - DEPTH N / MAX 토스트 (Stratum 2+ 진입 시)
   *   - progress.deepestUnlocked / lastSafeStratum 갱신
   */
  private jumpToStratum(stratumIndex: number): void {
    if (stratumIndex === this.currentStratumIndex) return;
    if (stratumIndex < 0 || stratumIndex >= this.strataConfig.strata.length) return;

    const stratumStart = this.unifiedGrid.stratumStartRooms?.[stratumIndex];
    const offset = this.unifiedGrid.strataOffsets[stratumIndex];
    if (!offset) return;
    const startRow = stratumStart?.absoluteRow ?? offset.rowOffset;
    const startCol = stratumStart?.col ?? 0;

    // 이전 지층 잔류 적 정리 (Trapdoor 침강 후 다음 Plaza 에 따라가지 않도록).
    this.clearEnemies();

    const prevStratum = this.currentStratumIndex;
    this.currentStratumIndex = stratumIndex;
    this.currentStratumDef = this.strataConfig.strata[stratumIndex];
    this.currentCol = startCol;
    this.currentRow = startRow;
    this.lastPreSpawnRoomKey = null;

    // Progress 갱신 (deepest / last safe).
    if (stratumIndex > prevStratum) {
      if (this.progress.deepestUnlocked < stratumIndex) {
        this.progress.deepestUnlocked = stratumIndex;
      }
      this.progress.lastSafeStratum = stratumIndex;
      this.persistRoomState();
    }

    // 새 stratum 의 보스 처치 시 다음 Trapdoor 를 spawn 할 준비 — flag 리셋.
    this.descentToWorld = false;

    // LDtk Plaza 의 Player entity 우선, 없으면 절차적 floor 탐색.
    const ldtkSpawn = this.playerSpawnByStratum.get(stratumIndex);
    if (ldtkSpawn) {
      this.player.x = Math.round(ldtkSpawn.x - this.player.width / 2);
      this.player.y = Math.round(ldtkSpawn.y - this.player.height);
    } else {
      const spawn = this.getPlayerFloorSpawnPosition(startCol, startRow);
      this.player.x = spawn.x;
      this.player.y = spawn.y;
    }
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.savePrevPosition();
    this.game.camera.snap(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2);
    this.restoreGameplayHud();

    // Plaza 거주자 (Gatekeeper + ambient) 강제 spawn — jumpToStratum 직후 plaza
    // 가 비어있는 문제 fix (사용자 결정 2026-05-04). 자동 stratum 감지 분기는 한
    // 프레임 늦거나 spawnedRooms 캐시 때문에 trigger 안 될 수 있어 명시 호출.
    const hubKey = `${startCol},${startRow}`;
    if (!this.spawnedRooms.has(hubKey)) {
      this.spawnedRooms.add(hubKey);
      this.spawnEnemiesInRoom(startCol, startRow);
    }

    // Stratum 2+ 진입 시 DEPTH 표기 (ULTRAKILL 패턴).
    if (stratumIndex > 0) {
      const totalStrata = this.strataConfig.strata.length;
      this.toast.show(t('toast.depth', { n: stratumIndex + 1, total: totalStrata }), 0xff4488);
    }
  }

  // --- Onboarding ---
  private showOnboarding(): void {
    this.uiController.startOnboarding({
      hudSkin: this.hudSkin,
      messages: ItemWorldScene.getOnboardingMsgs(),
    });
  }

  private advanceOnboarding(): void {
    this.uiController.advanceOnboarding({
      hudSkin: this.hudSkin,
      messages: ItemWorldScene.getOnboardingMsgs(),
    });
  }

  /**
   * 월드 공간(world-space)에 떠 있는 컨텍스트 프롬프트를 일괄 숨긴다.
   * modal 패널(bossChoice / stratumClearPanel / escapeConfirm / post_clear_hold)이
   * 활성화된 프레임에 update 루프가 early-return 하면, 프롬프트의 가시성
   * 토글 분기에 도달하지 못해 마지막 visible=true 상태가 결과 패널 위에
   * 잔존한다. 모달 진입 시점과 update 선두에서 이 함수를 호출해 방지.
   */
  private hideWorldPrompts(): void {
    this.uiController.hideWorldPrompts({
      exitPrompt: null,
    });
  }

  /** 현재 프레임에서 world-space 프롬프트가 숨겨져 있어야 하는지 판정. */
  private shouldSuppressWorldPrompts(): boolean {
    return this.uiController.shouldSuppressWorldPrompts({
      hasStratumClearPanel: this.uiController.hasStratumClearPanel(),
      transitionState: this.transitionState,
    });
  }

  private handleStratumExit(): void {
    this.hideWorldPrompts();
    const isFinal = this.isFinalEndRoom(this.currentCol, this.currentRow);
    const nextStratumIndex = this.currentStratumIndex + 1;
    const hasNextStratum = !isFinal && !!this.unifiedGrid.strataOffsets[nextStratumIndex];

    this.progress.lastSafeStratum = this.currentStratumIndex;
    if (hasNextStratum) {
      this.progress.deepestUnlocked = Math.max(this.progress.deepestUnlocked, nextStratumIndex);
    }
    this.persistRoomState();

    if (isFinal) {
      this.progressController.setExitReason('clear');
      markItemCleared(this.item);
      this.persistRoomState();
    }

    // Hide HUD during cinematic
    this.hud.container.visible = false;
    this.hud.hideBossHP();
    this.hud.hideDepthGauge();
    this.hud.hideItemExp();

    // 보스 처치 직후 떠있는 골드/EXP 플로팅 텍스트 제거. 오버레이가 게임플레이
    // tick 을 멈추므로 timer 가 줄지 않아 영구 잔류한다 (P0).
    this.dmgNumbers?.clear();

    // Show unified stratum clear overlay (replaces BossChoice + StratumClearPanel + ReturnResult)
    this.uiController.showStratumClearOverlay({
      item: this.item,
      beforeAtk: this.stratumStartAtk,
      afterAtk: this.item.finalAtk,
      beforeInnocents: this.stratumStartInnocentCount,
      afterInnocents: this.item.innocents.length,
      isFinal,
      hasNextStratum,
    });
    this.startPostClearHold();
  }

  /** A6: show "+X% DMG (before → after)" when a stratum completes. Silent when atk did not change. */
  private _showA6DmgToast(beforeAtk: number, afterAtk: number): void {
    if (afterAtk <= beforeAtk || beforeAtk <= 0) return;
    const pct = Math.round(((afterAtk - beforeAtk) / beforeAtk) * 100);
    if (pct <= 0) return;
    this.toast.show(t('toast.damage_increase', { pct, before: beforeAtk, after: afterAtk }), 0xffcc44);
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
    this.uiController.showStratumClearPanel({
      beforeAtk: snap.beforeAtk,
      afterAtk: snap.afterAtk,
      beforeLevel: snap.beforeLevel,
      afterLevel: snap.afterLevel,
      beforeInnocents: snap.beforeInnocents,
      afterInnocents: snap.afterInnocents,
    }, this.hudSkin, isFinal);
  }

  private _updateStratumClearPanel(_dt: number): void {
    const confirmPressed = this.game.input.isJustPressed(GameAction.ATTACK);
    this.uiController.updateStratumClearPanel(confirmPressed);
    if (confirmPressed && !this.uiController.hasStratumClearPanel()) {
      this.game.input.consumeJustPressed(GameAction.ATTACK);
    }
  }


  /**
   * A15: Spawn a seal orb at the capture position. The orb briefly rises, then
   * homes toward the player while shrinking ? reads as "sealed into the weapon".
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
   * player a choice ? Continue deeper, or Exit safely with progress banked.
   * Previously the portal auto-advanced, which felt like the player had no
   * agency over their run length.
   */
  private showBossChoice(nextStratumIndex: number): void {
    this.uiController.showBossChoice({
      hudSkin: this.hudSkin,
      nextStratumIndex,
    });
  }

  private hideBossChoice(): void {
    this.uiController.hideBossChoice();
  }

  /**
   * Player 가 StratumClearOverlay 에서 Continue 선택 시 호출. DEC-039 안 D —
   * 보스 룸 바닥을 물리 파괴하고 자유 낙하로 다음 plaza 천장을 통과해 도착.
   * jumpToStratum 텔레포트는 폐기.
   *
   * pendingTrapX/Y 는 startTrapdoorDescent 에서 stash 한 보스 시신 위치.
   * currentStratumIndex 는 player 가 다음 plaza 셀에 들어가는 순간 update() 의
   * 자동 stratum 감지 분기가 갱신 + DEPTH 토스트.
   */
  private _continueToNextStratum(): void {
    // HUD 복원 (overlay 가 숨겼었음).
    this.restoreGameplayHud();
    this.transitionState = 'none';

    this.breakBossFloor(this.pendingTrapX, this.pendingTrapY);

    // 파괴 피드백.
    this.screenFlash.flash(0xffaa22, 0.4, 200);
    this.game.camera.shake(7);
    this.game.hitstopFrames = 6;
    this.dmgNumbers?.clear();

    const nextStratum = this.currentStratumIndex + 1;
    const totalStrata = this.strataConfig.strata.length;
    this.toast.show(t('toast.descending_depth', { n: nextStratum + 1, total: totalStrata }), 0xffa41b);
  }

  /** A17: player chose to exit ? bank progress, leave the item world. */
  private _exitAfterBoss(): void {
    this.progress.lastSafeStratum = this.currentStratumIndex;
    this.progressController.exitAfterBoss({
      currentStratumIndex: this.currentStratumIndex,
      itemName: this.item.def.name,
      itemLevel: this.item.level,
    });
  }

  /** Hide all gameplay UI before showing the return result modal. */
  private cleanupForReturnResult(): void {
    this.hud.container.visible = false;
    this.hud.hideBossHP();
    this.hud.hideDepthGauge();
    this.hud.hideItemExp();
    this.toast.clear();
    this.uiController.hideWorldPrompts({ exitPrompt: null });
    // Hide stratum clear panel if still showing
    if (this.uiController.hasStratumClearPanel()) {
      this.uiController.updateStratumClearPanel(true);
    }
    // Hide boss choice if showing
    if (this.uiController.isBossChoiceVisible()) {
      this.uiController.hideBossChoice();
    }
    // Hide escape confirm if showing
    if (this.uiController.isEscapeConfirmVisible()) {
      this.uiController.hideEscapeConfirm();
    }
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
      trackItemWorldExit(this.progressController.getExitReason(), this.currentStratumIndex);
    }

    this.sourcePlayer.hp = this.player.hp;

    this.hideEscapeConfirm();
    if (this.miniMapContainer.parent) this.miniMapContainer.parent.removeChild(this.miniMapContainer);
    // Clean up all UI owned by this scene
    this.hud.hideDepthGauge();
    this.hud.hideItemExp();
    if (this.hud.container.parent) this.hud.container.parent.removeChild(this.hud.container);
    // Remove any lingering damage numbers / prompts from uiContainer
    // (keep only persistent items ? world scene re-adds its own in enter())
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
      // Room pass EXP removed ? only monster kills grant EXP
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
        const spawn = this.getPlayerFloorSpawnPosition(this.currentCol, this.currentRow);
        this.player.x = spawn.x;
        this.player.y = spawn.y;
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
      // Unified overlay handles animation + input.
      const atkPressed = this.game.input.isJustPressed(GameAction.ATTACK);
      const menuPressed = this.game.input.isJustPressed(GameAction.MENU);
      this.uiController.updateStratumClearOverlay(dt, atkPressed, menuPressed);

      const choice = this.uiController.getStratumClearChoice();
      if (choice === 'continue') {
        if (atkPressed) this.game.input.consumeJustPressed(GameAction.ATTACK);
        this.uiController.destroyStratumClearOverlayPublic();
        this._continueToNextStratum();
      } else if (choice === 'exit') {
        if (menuPressed) this.game.input.consumeJustPressed(GameAction.MENU);
        if (atkPressed) this.game.input.consumeJustPressed(GameAction.ATTACK);
        this.uiController.destroyStratumClearOverlayPublic();
        this.cleanupForReturnResult();
        this.startExitFade();
      }
    }
    // 'descent_fall' 분기 폐기 (DEC-039 물리 낙하 모델로 전환). transitionState
    // 타입에는 호환을 위해 남아있지만 startTrapdoorDescent 가 더 이상 설정하지 않음.
  }

  // ---------------------------------------------------------------------------
  // DEC-039 Trapdoor 침강 시퀀스
  // ---------------------------------------------------------------------------

  /** Arc Tether 픽업 후보 — 자세한 명세는 LdtkWorldScene.findNearestGrabbableContainer 참조. */
  private findNearestGrabbableContainer(): ThrowableContainer | null {
    return findNearestContainerForGrab({
      player: this.player,
      containers: this.containers,
      input: this.game.input,
    });
  }

  private startGrabPull(target: ThrowableContainer): void {
    const state = startContainerGrabPull(target, this.arcTether);
    this.pullStartX = state.pullStartX;
    this.pullStartY = state.pullStartY;
    this.pullElapsedMs = state.pullElapsedMs;
    this.pullingContainer = state.pullingContainer;
    this.heldContainer = state.heldContainer;
  }

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

  /**
   * 매 프레임 — Trapdoor 의 idle 갱신 + KeyPrompt UI + ATTACK 입력 인터랙트.
   *
   * KeyPrompt 는 Anvil/Save/Talk 표준 패턴:
   *   - lazy create (KeyPrompt.createPrompt + game.uiScale)
   *   - game.uiContainer 에 추가 (화면 좌표, world 변환 X)
   *   - 매 프레임 trapdoor world 좌표 → screen 좌표 변환해 위치 갱신
   * 이로써 Anvil 의 [C] Place Weapon 과 동일한 해상도/사이즈로 렌더.
   */
  private trapdoorPrompt: Container | null = null;
  private updateTrapdoor(dt: number): void {
    const td = this.trapdoor;
    if (!td) {
      this.hideTrapdoorPrompt();
      return;
    }
    td.update(dt);
    if (!td.active || this.transitionState !== 'none') {
      this.hideTrapdoorPrompt();
      return;
    }
    const px = this.player.x + this.player.width / 2;
    const py = this.player.y + this.player.height / 2;
    const near = td.isPlayerNear(px, py);

    if (near) {
      this.showTrapdoorPromptAt(td.x, td.y - td.height);
    } else {
      this.hideTrapdoorPrompt();
    }

    if (near && this.game.input.isJustPressed(GameAction.ATTACK)) {
      this.game.input.consumeJustPressed(GameAction.ATTACK);
      td.activate();
      this.hideTrapdoorPrompt();
      this.startTrapdoorDescent();
    }
  }

  /** Anvil prompt 패턴 — uiContainer 에 lazy create + world→screen 변환. */
  private showTrapdoorPromptAt(worldX: number, worldY: number): void {
    if (!this.trapdoorPrompt) {
      this.trapdoorPrompt = KeyPrompt.createPrompt(
        actionKey(GameAction.ATTACK),
        t('prompt.descend'),
        this.game.uiScale,
      );
    }
    if (!this.trapdoorPrompt.parent) {
      this.game.uiContainer.addChild(this.trapdoorPrompt);
    }
    this.trapdoorPrompt.visible = true;
    const us = this.game.uiScale;
    const cam = this.game.camera;
    const sx = (worldX - cam.renderX + GAME_WIDTH / 2) * us - this.trapdoorPrompt.width / 2;
    const sy = (worldY - cam.renderY + GAME_HEIGHT / 2 - 24) * us;
    this.trapdoorPrompt.x = Math.round(sx);
    this.trapdoorPrompt.y = Math.round(sy);
  }

  private hideTrapdoorPrompt(): void {
    if (this.trapdoorPrompt) this.trapdoorPrompt.visible = false;
  }

  /**
   * ItemStratum Anvil — proximity + KeyPrompt + ATTACK 인터랙트.
   *
   * Anvil 동작 = ESC 키와 동일: 다가가서 [C] 누르면 EscapeConfirm 모달이 열린다.
   * 모달 안에서 ATTACK 한 번 더 누르면 startExitFade → exitItemWorld 로 월드 귀환.
   *
   * 인풋 충돌 방지: showEscapeConfirm 후 ATTACK 을 consume 해서 같은 프레임의
   * EscapeConfirm 핸들러가 즉시 confirm 으로 폭주하지 않도록 한다.
   */
  private updateItemWorldAnvils(dt: number): void {
    if (this.itemWorldAnvils.length === 0) {
      this.hideItemWorldAnvilPrompt();
      return;
    }
    // Modal/transition 진행 중에는 prompt 숨김 (다른 UI 위에 겹치지 않게).
    const suppressed = this.shouldSuppressWorldPrompts()
      || this.uiController.isEscapeConfirmVisible()
      || this.transitionState !== 'none';

    let nearest: Anvil | null = null;
    for (const a of this.itemWorldAnvils) {
      a.update(dt);
      if (suppressed) continue;
      const promptRange = 16;
      if (a.overlaps(
        this.player.x - promptRange,
        this.player.y - promptRange,
        this.player.width + promptRange * 2,
        this.player.height + promptRange * 2,
      )) {
        nearest = a;
      }
    }

    if (!nearest) {
      this.hideItemWorldAnvilPrompt();
      return;
    }

    // World→screen prompt placement (Anvil/Save/Talk 표준 패턴).
    if (!this.itemWorldAnvilPrompt) {
      this.itemWorldAnvilPrompt = KeyPrompt.createPrompt(
        actionKey(GameAction.ATTACK),
        t('prompt.return'),
        this.game.uiScale,
      );
    }
    if (!this.itemWorldAnvilPrompt.parent) {
      this.game.uiContainer.addChild(this.itemWorldAnvilPrompt);
    }
    this.itemWorldAnvilPrompt.visible = true;
    const us = this.game.uiScale;
    const cam = this.game.camera;
    const ax = nearest.container.x;
    const ay = nearest.container.y - nearest.height;
    const sx = (ax - cam.renderX + GAME_WIDTH / 2) * us - this.itemWorldAnvilPrompt.width / 2;
    const sy = (ay - cam.renderY + GAME_HEIGHT / 2 - 24) * us;
    this.itemWorldAnvilPrompt.x = Math.round(sx);
    this.itemWorldAnvilPrompt.y = Math.round(sy);

    if (this.game.input.isJustPressed(GameAction.ATTACK)) {
      this.game.input.consumeJustPressed(GameAction.ATTACK);
      this.hideItemWorldAnvilPrompt();
      this.showEscapeConfirm();
    }
  }

  private hideItemWorldAnvilPrompt(): void {
    if (this.itemWorldAnvilPrompt) this.itemWorldAnvilPrompt.visible = false;
  }

  private destroyItemWorldAnvilPrompt(): void {
    if (!this.itemWorldAnvilPrompt) return;
    if (this.itemWorldAnvilPrompt.parent) {
      this.itemWorldAnvilPrompt.parent.removeChild(this.itemWorldAnvilPrompt);
    }
    this.itemWorldAnvilPrompt.destroy({ children: true });
    this.itemWorldAnvilPrompt = null;
  }

  private destroyTrapdoorPrompt(): void {
    if (!this.trapdoorPrompt) return;
    if (this.trapdoorPrompt.parent) this.trapdoorPrompt.parent.removeChild(this.trapdoorPrompt);
    this.trapdoorPrompt.destroy({ children: true });
    this.trapdoorPrompt = null;
  }

  /**
   * Trapdoor 인터랙트 진입.
   *
   * StratumClearOverlay (레벨업/클리어 페이지) 를 *모든 지층에서* 표시한다.
   *   - 중간 지층 (descentToWorld=false): isFinal=false, hasNextStratum=true.
   *     Continue 선택 시 _continueToNextStratum 가 보스 룸 바닥을 물리 파괴 +
   *     자유 낙하로 다음 plaza 도착.
   *   - 마지막 지층 (descentToWorld=true): isFinal=true, hasNextStratum=false.
   *     Continue 비활성, Exit 만 가능. Exit 선택 시 startExitFade 로 월드 귀환.
   *
   * 보스 시신 위치(tdX/Y) 는 Continue 시 hole 위치로 사용 — overlay 가 떠있는
   * 동안 trapdoor entity 는 미리 dispose. pendingTrapX/Y 에 stash.
   */
  private pendingTrapX = 0;
  private pendingTrapY = 0;
  private pendingTrapBossCellRow = 0;
  private startTrapdoorDescent(): void {
    if (!this.trapdoor) return;
    const td = this.trapdoor;
    this.pendingTrapX = td.x;
    this.pendingTrapY = td.y;
    // 보스 셀 row — _continueToNextStratum 에서 hole rN 결정용.
    this.pendingTrapBossCellRow = Math.max(0,
      Math.floor((td.y - 1) / IW_ROOM_H_PX));

    // overlay 떠있는 동안 trapdoor entity 는 시각 잔재 방지 위해 미리 dispose.
    this.disposeTrapdoor();
    this.dmgNumbers?.clear();
    this.toast.clear();
    this.hideWorldPrompts();
    this.hud.container.visible = false;
    this.hud.hideBossHP();
    this.hud.hideDepthGauge();
    this.hud.hideItemExp();

    // 마지막 지층 처리 — markItemCleared / progress / exitReason 설정.
    if (this.descentToWorld) {
      this.progressController.setExitReason('clear');
      markItemCleared(this.item);
      this.persistRoomState();
    }

    this.uiController.showStratumClearOverlay({
      item: this.item,
      beforeAtk: this.stratumStartAtk,
      afterAtk: this.item.finalAtk,
      beforeInnocents: this.stratumStartInnocentCount,
      afterInnocents: this.item.innocents.length,
      isFinal: this.descentToWorld,
      hasNextStratum: !this.descentToWorld,
    });
    this.startPostClearHold();
  }

  /**
   * Trapdoor 인터랙트 시 보스 룸 바닥 → 다음 plaza 천장 사이를 뚫는다.
   *
   * 폭:
   *   IW_DOOR_V_WIDTH (=4 타일) + 2 타일 여유 = 6 타일. trapdoor 의 X 가 셀
   *   중앙(+/- 시신 오프셋) 이고 plaza 의 ceiling D-opening 위치도 mid-col 에
   *   정렬되어 있어 player 가 자연 낙하 가능.
   *
   * 깊이 (보스 floor 시작 → plaza ceiling 끝, 측정 기반):
   *   r0 = trapdoor.y / TILE_SIZE             (보스 floor 라인 = IW_DOOR_FLOOR_ROW 부근)
   *   rN = (bossCellRow + 1) * H + IW_DOOR_DEPTH (다음 plaza 천장 strip 끝)
   *
   *   = 보스 floor (IW_DOOR_DEPTH ~3 타일) + 다음 plaza ceiling (IW_DOOR_DEPTH ~3 타일)
   *   = 약 6~8 타일 깊이. 다음 plaza 의 *내부 floor* 까지는 절대 뚫지 않으므로
   *     player 는 plaza 천장 통과 직후 plaza 의 floor 위에 안착.
   *
   * 시각 잔재 제거 (LDtk wall/shadow/deco/bg 타일):
   *   각 aggregate 컨테이너에 'erase' blend mode Graphics 를 추가해 hole 영역의
   *   픽셀을 destination-out 한다. 그 결과 hole 영역만 투명 → 그 뒤의 parallax
   *   배경이 그대로 노출되어 "통로" 처럼 자연스럽게 보인다.
   */
  private breakBossFloor(tdX: number, tdY: number): void {
    if (!this.fullGrid || this.fullGrid.length === 0) return;
    const fullW = this.fullGrid[0]?.length ?? 0;
    const fullH = this.fullGrid.length;

    // 폭 계산 — IW_DOOR_V_WIDTH 기반 + 1 타일 여유 좌우.
    const tdTileX = Math.floor(tdX / TILE_SIZE);
    const halfW = Math.ceil(IW_DOOR_V_WIDTH / 2) + 1; // ±3
    const c0 = Math.max(0, tdTileX - halfW);
    const cN = Math.min(fullW, tdTileX + halfW);

    // 깊이 계산 — 보스 floor 시작 ~ 다음 plaza 천장 strip 끝.
    // Plaza 출구 = LRU (사용자 결정 2026-05-03, force_up 적용 후) 로 천장 자연
    // open. 따라서 hole 은 보스 floor strip + 다음 plaza 천장 strip (~3타일) 만
    // 뚫으면 player 가 plaza 안으로 자유 낙하 → plaza floor 위에 자연 안착.
    const r0 = Math.max(0, Math.floor(tdY / TILE_SIZE));
    const bossCellRow = this.pendingTrapBossCellRow;
    const nextCellTopRow = (bossCellRow + 1) * IW_ROOM_H_TILES;
    const rN = Math.min(fullH, nextCellTopRow + IW_DOOR_DEPTH);

    for (let r = r0; r < rN; r++) {
      for (let c = c0; c < cN; c++) {
        this.fullGrid[r][c] = 0;
      }
    }

    // 시각 잔재 제거 — erase blend mode 로 wall/shadow/deco/bg/struct/seal 모두
    // hole 영역에서 destination-out. parallax 배경이 자연 노출.
    const holePxX = c0 * TILE_SIZE;
    const holePxY = r0 * TILE_SIZE;
    const holePxW = (cN - c0) * TILE_SIZE;
    const holePxH = (rN - r0) * TILE_SIZE;
    const eraseAt = (parent: Container | null | undefined): void => {
      if (!parent) return;
      const g = new Graphics();
      g.rect(holePxX, holePxY, holePxW, holePxH).fill(0xffffff);
      g.blendMode = 'erase';
      parent.addChild(g);
    };
    eraseAt(this.wallAggregate);
    eraseAt(this.shadowAggregate);
    eraseAt(this.decoAggregate);
    eraseAt(this.artificialDecoAggregate);
    eraseAt(this.structAggregate);
    eraseAt(this.bgAggregate);
    eraseAt(this.sealAggregate);

    Debug.log(`[Trapdoor] hole punched: cols ${c0}..${cN} rows ${r0}..${rN} bossCellRow=${bossCellRow} nextCellTop=${nextCellTopRow}`);
  }

  /** 매 프레임 재사용 — GC 방지. filterArea + viewport 검사 공용. */
  private _viewportRect = new Rectangle(0, 0, 1, 1);

  /**
   * 수동 cell culling (사용자 결정 2026-05-04 — Ancient 24 FPS 문제 대응).
   * 카메라 viewport ± 1 cell buffer 안의 cell 만 visible=true. 그 외 false.
   * PIXI 자동 culling 이 filter 트리에서 약해 명시 visible 로 강제.
   *
   * 동시에 aggregate 의 filterArea 를 viewport 로 제한 (50→60 FPS 향상 목적,
   * 사용자 결정 2026-05-04). filter 비용 = filterArea 픽셀 수에 비례. unifiedGrid
   * 전체가 아닌 viewport 만 처리하도록 매 프레임 갱신.
   */
  private updateCellVisibility(): void {
    const cam = this.game.camera;
    const halfW = (GAME_WIDTH / cam.zoom) * 0.5;
    const halfH = (GAME_HEIGHT / cam.zoom) * 0.5;
    // 1 cell 여유 — cell 경계 통과 시 깜빡임 방지.
    const viewL = cam.renderX - halfW - IW_ROOM_W_PX;
    const viewR = cam.renderX + halfW + IW_ROOM_W_PX;
    const viewT = cam.renderY - halfH - IW_ROOM_H_PX;
    const viewB = cam.renderY + halfH + IW_ROOM_H_PX;
    const minCol = Math.floor(viewL / IW_ROOM_W_PX);
    const maxCol = Math.floor(viewR / IW_ROOM_W_PX);
    const minRow = Math.floor(viewT / IW_ROOM_H_PX);
    const maxRow = Math.floor(viewB / IW_ROOM_H_PX);
    const windowKey = `${minCol},${maxCol},${minRow},${maxRow}`;
    if (windowKey !== this.visibleCellWindowKey) {
      this.visibleCellWindowKey = windowKey;
      for (const g of this.cellLayerGroups) {
        const visible =
          g.col >= minCol &&
          g.col <= maxCol &&
          g.row >= minRow &&
          g.row <= maxRow;
        for (const layer of g.layers) layer.visible = visible;
      }
    }
    // Filter area culling — aggregate 의 filter 가 viewport 만 처리하도록 제한.
    const fa = this._viewportRect;
    fa.x = viewL;
    fa.y = viewT;
    fa.width = viewR - viewL;
    fa.height = viewB - viewT;
    if (this.bgAggregate) this.bgAggregate.filterArea = fa;
    if (this.interiorAggregate) this.interiorAggregate.filterArea = fa;
    if (this.wallAggregate) this.wallAggregate.filterArea = fa;
    if (this.shadowAggregate) this.shadowAggregate.filterArea = fa;
    if (this.sealAggregate) this.sealAggregate.filterArea = fa;
  }

  /** Trapdoor entity 정리 + KeyPrompt UI 숨김 (uiContainer 잔류 방지). */
  private disposeTrapdoor(): void {
    this.hideTrapdoorPrompt();
    if (!this.trapdoor) return;
    this.trapdoor.destroy();
    this.trapdoor = null;
  }

  /**
   * Repaint the mutation mask covering every air cell produced by tile
   * burnout / corrode. Each entry is a 16×16 rect drawn above the wall
   * aggregate. Color matches the AshRemnant dark tone (#1f1a16) instead of
   * pure black so the burnout site reads as "scorched residue" rather than
   * a hole punched in the world. Lazy — only re-fills the Graphics when the
   * cell set has actually changed.
   */
  private rebuildMutationMask(): void {
    const g = this.mutationMaskGfx;
    if (!g) return;
    g.clear();
    for (const key of this.mutatedCells) {
      const ix = key.indexOf(',');
      const gx = +key.slice(0, ix);
      const gy = +key.slice(ix + 1);
      // Sepia-charred tone — same palette as AshRemnantManager COLOR_ASH_DARK.
      // Reads as scorched residue, not a void.
      g.rect(gx * 16, gy * 16, 16, 16).fill({ color: 0x1f1a16, alpha: 0.92 });
    }
  }

  /**
   * ItemWorld bakes walls into an aggregate, so runtime WALL creation needs a
   * small overlay. Used by water+magma Steam Burst hardened magma.
   */
  private rebuildSolidifiedWallOverlay(): void {
    const g = this.solidifiedWallGfx;
    if (!g) return;
    g.clear();
    for (const key of this.solidifiedWallCells) {
      const ix = key.indexOf(',');
      const gx = +key.slice(0, ix);
      const gy = +key.slice(ix + 1);
      if (this.fullGrid[gy]?.[gx] !== TILE_WALL) continue;
      const x = gx * 16;
      const y = gy * 16;
      g.rect(x, y, 16, 16).fill({ color: 0x2b2520, alpha: 1 });
      g.rect(x, y, 16, 2).fill({ color: 0x7a4a2a, alpha: 0.95 });
      g.rect(x + 2, y + 4, 12, 1).fill({ color: 0x4a3528, alpha: 0.8 });
    }
  }

  /**
   * Oxygen overlay — vignette + bottom-center bar shown while submerged
   * (without the waterBreathing ability). Lazy-creates the Graphics on
   * first need. Direct mirror of LdtkWorldScene's implementation.
   */
  private updateOxygenOverlay(): void {
    const ratio = this.player.oxygenRatio;
    const submerged = this.player.submerged && !this.player.abilities.waterBreathing;

    if (submerged && ratio < 1) {
      if (!this.oxygenOverlay) {
        this.oxygenOverlay = new Graphics();
        this.oxygenOverlay.eventMode = 'none';
        this.game.legacyUIContainer.addChild(this.oxygenOverlay);
      }
      this.oxygenOverlay.clear();
      const color = ratio > 0.5 ? 0x1122aa : ratio > 0.25 ? 0x882244 : 0xaa2222;
      const intensity = (1 - ratio) * 0.5;
      const pulse = ratio < 0.5 ? Math.sin(Date.now() * (ratio < 0.15 ? 0.015 : 0.008)) * 0.1 : 0;
      const alpha = Math.min(0.6, intensity + pulse);
      this.oxygenOverlay.rect(0, 0, GAME_WIDTH, GAME_HEIGHT).fill({ color, alpha });
      const cx = GAME_WIDTH / 2;
      const cy = GAME_HEIGHT / 2;
      const r = GAME_WIDTH * 0.35 * (0.5 + ratio * 0.5);
      this.oxygenOverlay.circle(cx, cy, r).cut();
      this.oxygenOverlay.visible = true;
    } else if (this.oxygenOverlay) {
      this.oxygenOverlay.visible = false;
    }

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
      this.oxygenBar.rect(bx, by, barW, barH).fill({ color: 0x111133, alpha: 0.7 });
      const fillColor = ratio > 0.5 ? 0x4488ff : ratio > 0.25 ? 0xff8844 : 0xff2222;
      this.oxygenBar.rect(bx, by, barW * ratio, barH).fill(fillColor);
      this.oxygenBar.rect(bx, by, barW, barH).stroke({ color: 0x446688, width: 0.5 });
      this.oxygenBar.visible = true;
    } else if (this.oxygenBar) {
      this.oxygenBar.visible = false;
    }
  }

  render(alpha: number): void {
    if (!this.initialized) return;
    this.player.render(alpha);
    for (const enemy of this.enemies) enemy.render(alpha);
    const cam = this.game.camera;
    this.parallaxBG.updateScroll(cam.renderX, cam.renderY);
  }

  exit(): void {
    if (this._gpUnsub) { this._gpUnsub(); this._gpUnsub = null; }
    if (this.parallaxBG) this.parallaxBG.container.visible = false;
    this.toast.clear();
    this.uiController.destroy();
    this.destroyTrapdoorPrompt();
    this.destroyItemWorldAnvilPrompt();
    this.clearStaticEntities();
    if (this.loreDisplay) {
      this.loreDisplay.close();
      if (this.loreDisplay.container.parent) {
        this.loreDisplay.container.parent.removeChild(this.loreDisplay.container);
      }
      this.loreDisplay = null;
    }
    if (this.miniMapContainer?.parent) this.miniMapContainer.parent.removeChild(this.miniMapContainer);
    if (this.hud?.container.parent) this.hud.container.parent.removeChild(this.hud.container);
    if (this.areaTitle?.container.parent) this.areaTitle.container.parent.removeChild(this.areaTitle.container);
    this.areaTitle?.destroy();
    if (this.controlsOverlay?.container.parent) this.controlsOverlay.container.parent.removeChild(this.controlsOverlay.container);
    if (this.screenFlash?.overlay.parent) this.screenFlash.overlay.parent.removeChild(this.screenFlash.overlay);
    // LowHpVignette 는 legacyUIContainer 에 attach 되므로 scene exit 시 반드시 destroy.
    // 누락 시 저체력 사망 후 WORLD 로 복귀해도 붉은 vignette 이 그대로 남는 버그 발생.
    if (this.lowHpVignette) {
      this.lowHpVignette.destroy();
    }
    if (this.tutorialHint) {
      this.tutorialHint.destroy();
    }
    this.destroyRoomGraphDebug();
    this.destroyTopologyCycleKey();
    this.destroyTopologyLabel();
  }

  override destroy(): void {
    this.parallaxBG?.destroy();
    this.dmgNumbers?.clear();
    super.destroy();
  }

  /**
   * Minimap rendering ? disabled for Spelunky-style blind exploration.
   * Kept as a no-op so existing call sites (buildFullMap, room transition,
   * lazy spawn) remain valid without branching.
   */
  private drawMiniMap(): void {
    // intentionally empty
  }

  // ── DEC-037 PR-B: RoomGraph debug overlay ─────────────────────
  /**
   * If ?debug=graph is in the URL, generate a RoomGraph for every stratum
   * and build the debug overlay container. Hidden by default; F2 toggles.
   */
  private maybeInitRoomGraphDebug(): void {
    const params = new URLSearchParams(window.location.search);
    const dbg = params.get('debug');
    // Enabled by ?debug=1 또는 ?debug=graph. Shift+2 토글.
    const enabled = dbg === '1' || (dbg?.includes('graph') ?? false);
    if (!enabled) return;

    // Reuse adapter-built graphs so layout.x/y reflects actual grid placements.
    const graphs = this.roomGraphs;
    if (graphs.length === 0) return;

    const canvas = this.game.app.canvas;
    this.roomGraphDebugContainer = createRoomGraphDebugOverlay(
      graphs,
      this.item.rarity,
      this.item.uid,
      canvas.width,
      canvas.height,
    );
    this.roomGraphDebugContainer.visible = false;
    // Attach to uiContainer (unscaled native) so the debug overlay covers the
    // full screen rather than the virtual 640x360 viewport.
    this.game.uiContainer.addChild(this.roomGraphDebugContainer);

    this.roomGraphDebugKeyHandler = (e: KeyboardEvent) => {
      // Shift+2 (Digit2 key with shift). Code 'Digit2' is keyboard-layout independent.
      if (e.code !== 'Digit2' || !e.shiftKey) return;
      e.preventDefault();
      this.roomGraphDebugVisible = !this.roomGraphDebugVisible;
      if (this.roomGraphDebugContainer) {
        this.roomGraphDebugContainer.visible = this.roomGraphDebugVisible;
      }
    };
    window.addEventListener('keydown', this.roomGraphDebugKeyHandler, true);
    Debug.log(`[RoomGraph debug] mounted ${graphs.length} stratum graph(s). Press Shift+2 to toggle.`);
  }

  private destroyRoomGraphDebug(): void {
    if (this.roomGraphDebugKeyHandler) {
      window.removeEventListener('keydown', this.roomGraphDebugKeyHandler, true);
      this.roomGraphDebugKeyHandler = null;
    }
    if (this.roomGraphDebugContainer?.parent) {
      this.roomGraphDebugContainer.parent.removeChild(this.roomGraphDebugContainer);
    }
    this.roomGraphDebugContainer?.destroy({ children: true });
    this.roomGraphDebugContainer = null;
    this.roomGraphDebugVisible = false;
  }

  // ── Dev: Shift+L topology cycle ───────────────────────────────
  /**
   * Press Shift+L to cycle ?topology= through all kinds and reload the page.
   * Lets a single weapon validate every topology builder without CSV edits.
   * After reload the player must re-enter the item world manually.
   */
  private initTopologyCycleKey(): void {
    const TOPOLOGIES: TopologyKind[] = [
      'hub_spoke', 'multi_hub',
      'linear_right',
      'y_fork', 't_junction', 'layer_cake', 'ring', 'spine_pockets',
      'two_arc_pocketed',
    ];
    this.topologyCycleKeyHandler = (e: KeyboardEvent) => {
      // Diagnostic: log every Shift-modified L press to verify reachability.
      if (e.code === 'KeyL' && e.shiftKey) {
        Debug.log('[ItemWorld] Shift+L caught.');
      }
      if (e.code !== 'KeyL' || !e.shiftKey) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const params = new URLSearchParams(window.location.search);
      const cur = (params.get('topology') ?? '').trim().toLowerCase();
      const idx = TOPOLOGIES.indexOf(cur as TopologyKind);
      const next = TOPOLOGIES[(idx + 1) % TOPOLOGIES.length];
      params.set('topology', next);
      const url = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
      Debug.log(`[ItemWorld] Topology cycle: ${cur || '(none)'} → ${next}. Reloading...`);
      window.history.replaceState(null, '', url);
      window.location.reload();
    };
    window.addEventListener('keydown', this.topologyCycleKeyHandler, true);
    Debug.log('[ItemWorld] Shift+L ready: cycle ?topology= through 8 kinds (page reload).');
  }

  private destroyTopologyCycleKey(): void {
    if (this.topologyCycleKeyHandler) {
      window.removeEventListener('keydown', this.topologyCycleKeyHandler, true);
      this.topologyCycleKeyHandler = null;
    }
  }

  /**
   * Dev: Always-visible label at top-left showing which topology is active and
   * where it came from (URL > weapon override > stratum default).
   */
  private initTopologyLabel(urlTopology: TopologyKind | undefined): void {
    let source: 'URL' | 'WEAPON' | 'STRATUM';
    let text: string;
    if (urlTopology) {
      source = 'URL';
      text = urlTopology;
    } else if (this.item.def.topologyOverride) {
      source = 'WEAPON';
      text = this.item.def.topologyOverride;
    } else {
      source = 'STRATUM';
      text = this.strataConfig.strata.map(s => s.topology).join('/');
    }
    this.topologyLabel = new BitmapText({
      text: `TOPO[${source}]: ${text}`,
      style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0xFFA41B },
    });
    this.topologyLabel.x = 4;
    this.topologyLabel.y = 4;
    this.game.uiContainer.addChild(this.topologyLabel);
  }

  private destroyTopologyLabel(): void {
    if (this.topologyLabel?.parent) this.topologyLabel.parent.removeChild(this.topologyLabel);
    this.topologyLabel?.destroy();
    this.topologyLabel = null;
  }

  // ── Ego dialogue helpers ──────────────────────────────────────

  /** Fire an Ego dialogue line if conditions are met. Returns true if fired. */
  private fireEgo(key: string, lines: import('@ui/LoreDisplay').LoreLine[], freeze = false): boolean {
    if (!this.egoActive) return false;
    if (this.egoFlags.has(key)) return false;
    if (this.loreDisplay?.isActive) return false;
    this.egoFlags.add(key);
    this.loreDisplay?.showDialogue(lines, freeze);
    return true;
  }

  /**
   * True while the player is still in the first-clear onboarding window for
   * this Ego item (boss not yet killed). Once BOSS_KILLED is persisted, this
   * flips to false and subsequent re-entries use decay dialogue instead.
   * Used so ESC-exit + re-entry doesn't drop onboarding mid-tutorial.
   */
  private isFirstBossOnboarding(): boolean {
    return this.egoActive && !this.egoUnlockedEvents.has(EGO_EVENT.BOSS_KILLED);
  }

  /** T04: Called after floor start / landing. */
  fireEgoEnter(): void {
    if (this.isFirstBossOnboarding()) {
      this.fireEgo('iw_enter', EGO_IW_ENTER, true);
    } else if (this.egoEntryCount === 2) {
      // Check S02: weapon swap return
      if (this.egoUnlockedEvents.has(EGO_EVENT.WEAPON_SWAP)
        && !this.egoUnlockedEvents.has(EGO_EVENT.SWAP_RETURN)) {
        this.egoUnlockedEvents.add(EGO_EVENT.SWAP_RETURN);
        this.fireEgo('swap_return', EGO_SWAP_RETURN, false);
      } else {
        this.fireEgo('reentry_2', EGO_REENTRY_2, false);
      }
    } else if (this.egoEntryCount === 3) {
      this.fireEgo('reentry_3', EGO_REENTRY_3, false);
    }
    // 4+ : silence
  }

  /**
   * fireEgoEnter 의 await-able 변종. 발화한 대사가 있다면 그 종료까지 await.
   * 대사 미발생(이미 발화·비활성·4 회차+) 시 즉시 resolve.
   * 시작 룸 거주자 스폰을 대사 뒤로 미루기 위해 사용.
   */
  async fireEgoEnterAsync(): Promise<void> {
    this.fireEgoEnter();
    const ld = this.loreDisplay;
    if (!ld?.isActive) return;
    // showDialogue 자체 promise 를 잡지 못하므로 isActive 폴링.
    await new Promise<void>((resolve) => {
      const check = () => {
        if (!ld.isActive) resolve();
        else setTimeout(check, 100);
      };
      check();
    });
  }

  /** T05: First distortion monster visible on camera. */
  fireEgoMonsterVisible(): void {
    if (!this.isFirstBossOnboarding()) return;
    this.fireEgo('monster_first', EGO_MONSTER_FIRST, false);
  }

  /** T06: First enemy killed this entry (1s delay). */
  fireEgoFirstKill(): void {
    if (!this.isFirstBossOnboarding()) return;
    if (this.egoFlags.has('first_kill')) return;
    this.egoFlags.add('first_kill');
    setTimeout(() => {
      if (!this.loreDisplay?.isActive) {
        this.loreDisplay?.showDialogue(EGO_FIRST_KILL, false);
      }
    }, 1000);
  }

  /** T07: Room clear (3rd room in first entry). */
  fireEgoRoomClear(roomIndex: number): void {
    if (!this.isFirstBossOnboarding()) return;
    if (roomIndex >= 2) { // 0-indexed, room 3 = index 2
      this.fireEgo('room_clear', EGO_ROOM_CLEAR, false);
    }
  }

  /** T08: Innocent NPC visible on camera for the first time. */
  fireEgoInnocentFound(): void {
    if (!this.isFirstBossOnboarding()) return;
    this.fireEgo('innocent_found', EGO_INNOCENT_FOUND, false);
  }

  /** T09: Innocent stabilized. */
  fireEgoInnocentStable(): void {
    if (!this.isFirstBossOnboarding()) return;
    this.fireEgo('innocent_stable', EGO_INNOCENT_STABLE, false);
  }

  // T10: Boss appear — removed

  /** T11: Player died and respawned. */
  fireEgoPlayerDeath(): void {
    if (!this.isFirstBossOnboarding()) return;
    this.fireEgo('player_death', EGO_PLAYER_DEATH, false);
  }

  /** T12: Boss killed — call AFTER reward UI is shown. */
  fireEgoBossKilled(): void {
    if (this.isFirstBossOnboarding()) {
      this.fireEgo('boss_killed', EGO_BOSS_KILLED, true);
    } else if (this.egoEntryCount === 2) {
      this.fireEgo('reentry_2_boss', EGO_REENTRY_2_BOSS, false);
    }
  }

  /** S03: Stratum 2 clear — affinity max. */
  fireEgoAffinityMax(): void {
    if (!this.egoUnlockedEvents.has(EGO_EVENT.AFFINITY_MAX)) {
      this.egoUnlockedEvents.add(EGO_EVENT.AFFINITY_MAX);
      this.fireEgo('affinity_max', EGO_AFFINITY_MAX, true);
    }
  }
}
