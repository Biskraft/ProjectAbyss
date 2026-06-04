import { Container, Graphics, BitmapText, Assets, type Texture } from 'pixi.js';
import { Scene } from '@core/Scene';
import { Debug } from '@core/Debug';
import { SaveManager } from '@utils/SaveManager';
import { CameraZoneRuntime } from '@core/CameraZoneRuntime';
import { TilemapRenderer } from '@level/TilemapRenderer';
import { VISUAL_BOUNDS_BLEED_PX } from '@level/VisualBoundsBleed';
import { type UnifiedGridData, type UnifiedRoomCell } from '@level/RoomGrid';
import type { RoomGraphData } from '@level/RoomGraph';
import { CollisionDebugOverlay } from '@level/CollisionDebugOverlay';
import { generateUnifiedGridFromGraph } from '@level/RoomGraphAdapter';
import { archetypeFor } from '@level/RoomGraphArchetypes';
import { buildPrologueDive } from '@level/PrologueDive';
import { LdtkRenderer } from '@level/LdtkRenderer';
import { type LdtkLevel, type LdtkTile } from '@level/LdtkLoader';
import { collectLdtkTilesetPaths } from '@level/LdtkTilesetPaths';
import { getItemWorldTemplatesIfReady, prepareItemWorldTemplates } from '@level/ItemWorldTemplatePool';
import { Texture as PixiTexture, Rectangle } from 'pixi.js';
import { isInUpdraft, isSolid, TILE_AIR, TILE_WALL, TILE_OIL, TILE_MAGMA, TILE_WATER, TILE_METAL, TILE_ACID } from '@core/Physics';
import { TileMutator } from '@systems/TileMutator';
import { TileMutatorRenderer } from '@systems/TileMutatorRenderer';
import { MAGMA_BURN_DURATION_MS } from '@systems/TileHazards';
import { GameAction } from '@core/InputManager';
import { Player } from '@entities/Player';
import { createAnvilFlame } from '@entities/HealingPickup';
import { loadSpawnTable } from '@data/itemWorldSpawnTable';
import { getEnemyStats } from '@data/enemyStats';
import { LoreDisplay } from '@ui/LoreDisplay';
import { t } from '@i18n';
import {
  EGO_TRAPDOOR_THANKS,
  EGO_BOSS_KILLED,
  EGO_EVENT,
} from '@data/EgoDialogue';
import { Trapdoor } from '@entities/Trapdoor';
import { FloatingItemDrop } from '@entities/FloatingItemDrop';
import { HitManager } from '@combat/HitManager';
import { HUD } from '@ui/HUD';
import { AreaTitle } from '@ui/AreaTitle';
import { UISkin } from '@ui/UISkin';
import { KeyPrompt } from '@ui/KeyPrompt';
import { PIXEL_FONT } from '@ui/fonts';
import { DamageNumberManager } from '@ui/DamageNumber';
import { ToastManager } from '@ui/Toast';
import { OxygenOverlay } from '@ui/OxygenOverlay';
import { attachGamepadToast } from '@ui/GamepadToastBinding';
import { BossHpRuntime } from '@ui/BossHpRuntime';
import { TutorialHint } from '@ui/TutorialHint';
import { LowHpHealHintRuntime } from '@ui/LowHpHealHintRuntime';
import { SFX } from '@audio/Sfx';
import { BgmController } from '@audio/BgmController';
import { PRNG } from '@utils/PRNG';
import { getOrCreateWorldProgress, markItemCleared, resetItemForNextCycle, RARITY_COLOR, grantBossStageJump, getDisplayName, type ItemInstance, type ItemWorldProgress } from '@items/ItemInstance';
import { sacredSave } from '@save/PlayerSave';
import type { Inventory } from '@items/Inventory';
import { STRATA_BY_RARITY, TOPOLOGY_VALUES, type StrataConfig, type StratumDef, type TopologyKind } from '@data/StrataConfig';
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
import { applyFluidGenericResolution } from '@data/ItemWorldFluidMapping';
import { FluidSpawnerManager } from '@systems/FluidSpawner';
import { FluidCrestFoamManager } from '@effects/FluidCrestFoam';
import { EgoShardRuntime } from '@effects/EgoShardRuntime';
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
} from '@data/areaPalettes';
import { GAME_WIDTH, GAME_HEIGHT, type Game } from '../Game';
import {
  trackItemWorldEnter,
  trackItemWorldExit,
  trackItemWorldFloorClear,
  trackPlayerDeath,
} from '@utils/Analytics';
import { assetPath } from '@core/AssetLoader';
import { loadBundleOnce } from '@data/assetBundles';
import { UpdraftSystem } from '@systems/UpdraftSystem';
import { hashString } from '@level/ProceduralDecorator';
import { ParallaxBackground } from '@level/ParallaxBackground';
import { ItemWorldConst } from '@data/constData';
import { ItemWorldUiController } from './itemworld/ItemWorldUiController';
import { ItemWorldProgressController } from './itemworld/ItemWorldProgressController';
import { ItemWorldRoomTransitionRuntime } from './itemworld/ItemWorldRoomTransitionRuntime';
import { ItemWorldAbsorbDissolveRuntime } from './itemworld/ItemWorldAbsorbDissolveRuntime';
import { ItemWorldEntryCorridorVisibilityRuntime } from './itemworld/ItemWorldEntryCorridorVisibilityRuntime';
import { ItemWorldEntryCorridorRevealRuntime } from './itemworld/ItemWorldEntryCorridorRevealRuntime';
import { ItemWorldEntryCorridorVisualRuntime } from './itemworld/ItemWorldEntryCorridorVisualRuntime';
import { ItemWorldEntryCorridorState } from './itemworld/ItemWorldEntryCorridorState';
import { ItemWorldRunStats } from './itemworld/ItemWorldRunStats';
import { ItemWorldFlowState } from './itemworld/ItemWorldFlowState';
import { ItemWorldStratumStartSnapshot } from './itemworld/ItemWorldStratumStartSnapshot';
import { ItemWorldEntryGateState } from './itemworld/ItemWorldEntryGateState';
import { ItemWorldTrapdoorState } from './itemworld/ItemWorldTrapdoorState';
import { ItemWorldExitTelemetryState } from './itemworld/ItemWorldExitTelemetryState';
import { ItemWorldTrapdoorDescentRuntime } from './itemworld/ItemWorldTrapdoorDescentRuntime';
import { ItemWorldEgoDialogueRuntime } from './itemworld/ItemWorldEgoDialogueRuntime';
import { ItemWorldCaptureOrbRuntime } from './itemworld/ItemWorldCaptureOrbRuntime';
import { ItemWorldDevOverlayRuntime } from './itemworld/ItemWorldDevOverlayRuntime';
import { ItemWorldDebugInputRuntime } from './itemworld/ItemWorldDebugInputRuntime';
import { ItemWorldWeatherRuntime } from './itemworld/ItemWorldWeatherRuntime';
import { ItemWorldStratumPickerRuntime } from './itemworld/ItemWorldStratumPickerRuntime';
import { ItemWorldAnvilRuntime } from './itemworld/ItemWorldAnvilRuntime';
import { ItemWorldTrapdoorRuntime } from './itemworld/ItemWorldTrapdoorRuntime';
import { ItemWorldHudRuntime } from './itemworld/ItemWorldHudRuntime';
import { ItemWorldCameraRuntime } from './itemworld/ItemWorldCameraRuntime';
import { ItemWorldContainerCarryRuntime } from './itemworld/ItemWorldContainerCarryRuntime';
import { ItemWorldContainerRegistry } from './itemworld/ItemWorldContainerRegistry';
import { ItemWorldOnboardingRuntime } from './itemworld/ItemWorldOnboardingRuntime';
import { ItemWorldEscapeRuntime } from './itemworld/ItemWorldEscapeRuntime';
import { ItemWorldBossChoiceRuntime } from './itemworld/ItemWorldBossChoiceRuntime';
import { ItemWorldStratumClearRuntime } from './itemworld/ItemWorldStratumClearRuntime';
import { ItemWorldStratumClearPanelRuntime } from './itemworld/ItemWorldStratumClearPanelRuntime';
import { ItemWorldExitFadeRuntime } from './itemworld/ItemWorldExitFadeRuntime';
import { ItemWorldEgoShardCastRuntime } from './itemworld/ItemWorldEgoShardCastRuntime';
import { ItemWorldEgoShardProjectileRuntime } from './itemworld/ItemWorldEgoShardProjectileRuntime';
import { ItemWorldEgoShardCombatRuntime } from './itemworld/ItemWorldEgoShardCombatRuntime';
import { ItemWorldUnavailableInputRuntime } from './itemworld/ItemWorldUnavailableInputRuntime';
import { ItemWorldMovementVfxRuntime } from './itemworld/ItemWorldMovementVfxRuntime';
import { ItemWorldContainerPhysicsRuntime } from './itemworld/ItemWorldContainerPhysicsRuntime';
import { ItemWorldPickupRuntime } from './itemworld/ItemWorldPickupRuntime';
import { ItemWorldProjectileRuntime } from './itemworld/ItemWorldProjectileRuntime';
import { ItemWorldEnemyContactRuntime } from './itemworld/ItemWorldEnemyContactRuntime';
import { ItemWorldStaticEntityRuntime } from './itemworld/ItemWorldStaticEntityRuntime';
import { ItemWorldMemoryTriggerRuntime } from './itemworld/ItemWorldMemoryTriggerRuntime';
import { ItemWorldPrologueEndRuntime } from './itemworld/ItemWorldPrologueEndRuntime';
import { ItemWorldResidentRuntime } from './itemworld/ItemWorldResidentRuntime';
import { ItemWorldEnemyCombatRuntime } from './itemworld/ItemWorldEnemyCombatRuntime';
import { ItemWorldTileHazardRuntime } from './itemworld/ItemWorldTileHazardRuntime';
import { ItemWorldContainerFluidRuntime } from './itemworld/ItemWorldContainerFluidRuntime';
import { ItemWorldEgoShardImpactRuntime } from './itemworld/ItemWorldEgoShardImpactRuntime';
import { ItemWorldRuntimeCellSpawner } from './itemworld/ItemWorldRuntimeCellSpawner';
import { ItemWorldCellVisualRuntime } from './itemworld/ItemWorldCellVisualRuntime';
import { ItemWorldTemplatePickerRuntime } from './itemworld/ItemWorldTemplatePickerRuntime';
import { ItemWorldFullGridRuntime } from './itemworld/ItemWorldFullGridRuntime';
import { ItemWorldFullMapLayerRuntime } from './itemworld/ItemWorldFullMapLayerRuntime';
import { ItemWorldBoundaryVisualRuntime } from './itemworld/ItemWorldBoundaryVisualRuntime';
import { ItemWorldRoomStateRuntime } from './itemworld/ItemWorldRoomStateRuntime';
import { ItemWorldProceduralDecorRuntime } from './itemworld/ItemWorldProceduralDecorRuntime';
import { ItemWorldPlayerSpawnRuntime } from './itemworld/ItemWorldPlayerSpawnRuntime';
import { ItemWorldRoomTypeRuntime } from './itemworld/ItemWorldRoomTypeRuntime';
import { ItemWorldMemoryRoomPlacementRuntime } from './itemworld/ItemWorldMemoryRoomPlacementRuntime';
import { ItemWorldNeighborPreSpawnRuntime } from './itemworld/ItemWorldNeighborPreSpawnRuntime';
import { ItemWorldRoomSpawnRuntime } from './itemworld/ItemWorldRoomSpawnRuntime';
import { ItemWorldRoomSpawnState } from './itemworld/ItemWorldRoomSpawnState';
import { ItemWorldEnemyRegistry } from './itemworld/ItemWorldEnemyRegistry';
import { ItemWorldStaticEntitySpawner } from './itemworld/ItemWorldStaticEntitySpawner';
import { ItemWorldStaticEntityRegistry } from './itemworld/ItemWorldStaticEntityRegistry';
import { ItemWorldBurnablePropRegistry } from './itemworld/ItemWorldBurnablePropRegistry';
import { ItemWorldRoomRewardSpawner } from './itemworld/ItemWorldRoomRewardSpawner';
import { ItemWorldBreakablePropRuntime } from './itemworld/ItemWorldBreakablePropRuntime';
import { ContainerDestructionRuntime } from './shared/ContainerDestructionRuntime';
import { ItemWorldEnemySpawnRuntime } from './itemworld/ItemWorldEnemySpawnRuntime';
import { ItemWorldEnemyEncounterRuntime } from './itemworld/ItemWorldEnemyEncounterRuntime';
import { ItemWorldRoomClearRuntime } from './itemworld/ItemWorldRoomClearRuntime';
import { ItemWorldMemoryShardSpawnRuntime } from './itemworld/ItemWorldMemoryShardSpawnRuntime';
import { ItemWorldSafeRoomResidentSpawnRuntime } from './itemworld/ItemWorldSafeRoomResidentSpawnRuntime';
import {
  ENTRY_CORRIDOR_LEVEL_ID,
  ENTRY_CORRIDOR_LEVEL_PREFIX,
  buildEntryCorridorComposite,
  findEntryCorridorBottomExitY,
  findEntryCorridorLeftSpawn,
  selectEntryCorridorLevels,
} from './itemworld/ItemWorldEntryCorridorLayout';
import {
  TILE_SIZE as IW_TILE_SIZE,
  IW_GRID_W, IW_GRID_H,
  IW_ROOM_W_TILES, IW_ROOM_H_TILES,
  IW_ROOM_W_PX, IW_ROOM_H_PX,
  IW_DOOR_FLOOR_ROW,
} from './itemworld/ItemWorldMapController';
import { ItemWorldSpawnController } from './itemworld/ItemWorldSpawnController';

const TILE_SIZE = IW_TILE_SIZE;
const FADE_DURATION = 200;
// SSoT: Sheets/Content_ConstData.csv (ItemWorld.Entry.*, ItemWorld.Exp.*)
const ENTRY_FREEZE_MS = ItemWorldConst.EntryFreezeMs;
const BASE_EXP_PER_KILL = ItemWorldConst.BaseExpPerKill;

interface ItemWorldSceneOptions {
  entryCorridor?: boolean;
}

function cloneLdtkTile(tile: LdtkTile): LdtkTile {
  return {
    ...tile,
    px: [tile.px[0], tile.px[1]],
    src: [tile.src[0], tile.src[1]],
  };
}

function cloneLdtkLevel(level: LdtkLevel): LdtkLevel {
  return {
    ...level,
    collisionGrid: level.collisionGrid.map(row => [...row]),
    backgroundTiles: level.backgroundTiles.map(cloneLdtkTile),
    wallTiles: level.wallTiles.map(cloneLdtkTile),
    interiorTiles: level.interiorTiles.map(cloneLdtkTile),
    extraTileLayers: Object.fromEntries(
      Object.entries(level.extraTileLayers).map(([key, tiles]) => [key, tiles.map(cloneLdtkTile)]),
    ),
    shadowTiles: level.shadowTiles.map(cloneLdtkTile),
    entities: level.entities.map(entity => ({
      ...entity,
      px: [entity.px[0], entity.px[1]],
      grid: [entity.grid[0], entity.grid[1]],
      fields: { ...entity.fields },
    })),
    neighbors: [...level.neighbors],
    dirNeighbors: Object.fromEntries(
      Object.entries(level.dirNeighbors).map(([key, ids]) => [key, [...ids]]),
    ),
    doorAnchors: { ...level.doorAnchors },
    exits: [...level.exits],
  };
}

function cloneLdtkLevels(levels: LdtkLevel[]): LdtkLevel[] {
  return levels.map(cloneLdtkLevel);
}

export class ItemWorldScene extends Scene {
  /**
   * Production-safe scene-type marker. FeedbackPanel reads this to log the
   * correct `area` field (analytics) without relying on `constructor.name`,
   * which gets mangled by Vite/Rollup minification.
   */
  readonly isItemWorld = true;
  private tilemap!: TilemapRenderer;
  private atlas: Texture | null = null;
  /**
   * DEC-046 (2026-05-24): 보스 처치로 발생한 Recovery stage jump 정보.
   * ReturnResult 로 dive 결과와 함께 전달되어 Fragment 획득을 처리한다.
   * null = 이번 dive 에서 stage jump 가 발생하지 않음.
   */
  lastBossStageJump: {
    stratumIndex: number;
    newStage: number;
    fragmentId: string;
    itemName: string;
  } | null = null;
  /** Per-tileset atlas map keyed by LDtk __tilesetRelPath. */
  private atlases: Record<string, Texture> = {};
  private ldtkRenderer: LdtkRenderer | null = null;
  private ldtkTemplates: LdtkLevel[] = [];
  private outsideRenderer: LdtkRenderer | null = null;
  private outsideLevel: LdtkLevel | null = null;
  private player!: Player;
  private readonly enemyRegistry = new ItemWorldEnemyRegistry();
  /**
   * 월드-스페이스 layer 는 fullMapContainer(grid) 와
   * entityLayer(player/vfx) 로 나뉘다. grid 보다 위, entityLayer 보다 아래의 z 순서를 가진다.
   * (Residents 는 grid 위에 깔린다.)
   */
  private residentsLayer!: Container;
  /** Building layer — entityLayer 아래의 platform/wall 타일 컨테이너. */
  private buildingLayer!: Container;
  /**
   * LdtkRenderer 4 layer (bg/wall/special/shadow) 를 viewport 기준 cell 단위로
   * visible toggle 하여 화면 밖 cell 의 draw 를 건너뛴다 (2026-05-04,
   * Rare+ 대형 맵 성능 대응). PIXI 자체 culling/filter/aggregate 와 함께 동작한다.
   * cell 단위 visible 제어 런타임.
  */
  private cellVisualRuntime!: ItemWorldCellVisualRuntime;
  private templatePickerRuntime!: ItemWorldTemplatePickerRuntime;
  private fullGridRuntime!: ItemWorldFullGridRuntime;
  private fullMapLayerRuntime!: ItemWorldFullMapLayerRuntime;
  private boundaryVisualRuntime!: ItemWorldBoundaryVisualRuntime;
  private roomStateRuntime!: ItemWorldRoomStateRuntime;
  private proceduralDecorRuntime!: ItemWorldProceduralDecorRuntime;
  private playerSpawnRuntime!: ItemWorldPlayerSpawnRuntime;
  private roomTypeRuntime!: ItemWorldRoomTypeRuntime;
  private memoryRoomPlacementRuntime!: ItemWorldMemoryRoomPlacementRuntime;
  private neighborPreSpawnRuntime!: ItemWorldNeighborPreSpawnRuntime;
  private roomSpawnRuntime!: ItemWorldRoomSpawnRuntime;
  /**
   * DEC-039 Trapdoor: 보스 처치 시 D-down 위치에 spawn,
   * 플레이어 접근 시 다음 Plaza 로 하강하는 출구 (구 portal 대체).
   *
   * 2026-05-25 Step 1: 최종 지층 보스 처치(descentToWorld=true) 시 Trapdoor 대신
   * FloatingItemDrop 을 spawn 한다. 두 entity 는 동일한 인터페이스(isPlayerNear /
   * activate / update / destroy / x / y / width / height / active / consumed).
   */
  private trapdoor: Trapdoor | FloatingItemDrop | null = null;
  /**
   * LDtk-placed Anvils inside ItemStratum levels. Acts as an in-world exit:
   * approach — KeyPrompt — ATTACK opens EscapeConfirm (same flow as MENU/ESC).
   * One Anvil class per instance (visual halo + sparks); built-in symbol prompt
   * is suppressed in favor of the standard KeyPrompt pattern.
   */
  private itemWorldAnvilRuntime!: ItemWorldAnvilRuntime;
  /** 트랩도어 하강 진행 상태 = true. 보스 처치 시 하강 인터랙션 상태를 보관한다. */
  private readonly trapdoorState = new ItemWorldTrapdoorState();
  /**
   * Entry sequencing: 진입 시 Gatekeeper/Librarian + ambient 연출을 위한 게이트 상태.
   * 일정 시간 동안 입력을 막고(freeze), 이후 게임플레이를 시작한다.
   */
  private readonly entryGateState = new ItemWorldEntryGateState(ENTRY_FREEZE_MS);
  private dropRng = new PRNG(99999);
  private hitManager!: HitManager;
  private entityLayer!: Container;
  private collisionDebug!: CollisionDebugOverlay;
  private fluidLayer!: Container;
  private aboveFluidLayer!: Container;
  private weatherLayer!: Container;
  private weatherRuntime!: ItemWorldWeatherRuntime;
  private fluidSystem!: FluidSystem;
  private fluidSystemReady = false;
  private fluidSpawners!: FluidSpawnerManager;
  private fluidCrestFoam!: FluidCrestFoamManager;
  /** Oxygen vignette + bar overlays (lazy-created on first submersion). */
  private oxygenOverlay!: OxygenOverlay;
  private hud!: HUD;
  private areaTitle!: AreaTitle;
  private uiController!: ItemWorldUiController;
  private progressController!: ItemWorldProgressController;
  private spawnController!: ItemWorldSpawnController;
  private dmgNumbers!: DamageNumberManager;
  private hitSparks!: HitSparkManager;
  private propShatter!: PropShatterManager;
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
  private criticalHighlight!: CriticalHighlightManager;
  private hitBloodSpray!: HitBloodSprayManager;
  private diveLandImpact!: DiveLandImpactManager;
  private waterSplash!: WaterSplashManager;
  private steamPuff!: SteamPuffManager;
  private ashRemnant!: AshRemnantManager;
  private grassClumpFire = new GrassClumpFireSystem();
  private fluidResidue!: FluidResidueManager;
  private readonly egoShardRuntime = new EgoShardRuntime();
  private egoShardCastRuntime!: ItemWorldEgoShardCastRuntime;
  private egoShardProjectileRuntime!: ItemWorldEgoShardProjectileRuntime;
  private egoShardCombatRuntime!: ItemWorldEgoShardCombatRuntime;
  private unavailableInputRuntime!: ItemWorldUnavailableInputRuntime;
  private readonly containerRegistry = new ItemWorldContainerRegistry();
  private containerCarryRuntime!: ItemWorldContainerCarryRuntime;
  private arcTether: ArcTether | null = null;
  private waterBubbles!: WaterBubblesManager;
  private dropThroughDust!: DropThroughDustManager;
  private iceSkidStreak!: IceSkidStreakManager;
  private itemPickupGlow!: ItemPickupGlowManager;
  private lowHpVignette!: LowHpVignetteManager;
  private movementVfxRuntime!: ItemWorldMovementVfxRuntime;
  private containerPhysicsRuntime!: ItemWorldContainerPhysicsRuntime;
  private pickupRuntime!: ItemWorldPickupRuntime;
  private projectileRuntime!: ItemWorldProjectileRuntime;
  private enemyContactRuntime!: ItemWorldEnemyContactRuntime;
  private staticEntityRuntime!: ItemWorldStaticEntityRuntime;
  private memoryTriggerRuntime!: ItemWorldMemoryTriggerRuntime;
  private prologueEndRuntime!: ItemWorldPrologueEndRuntime;
  private residentRuntime!: ItemWorldResidentRuntime;
  private enemyCombatRuntime!: ItemWorldEnemyCombatRuntime;
  private tileHazardRuntime!: ItemWorldTileHazardRuntime;
  private containerFluidRuntime!: ItemWorldContainerFluidRuntime;
  private egoShardImpactRuntime!: ItemWorldEgoShardImpactRuntime;
  private runtimeCellSpawner!: ItemWorldRuntimeCellSpawner;
  private staticEntitySpawner!: ItemWorldStaticEntitySpawner;
  private roomRewardSpawner!: ItemWorldRoomRewardSpawner;
  private breakablePropRuntime!: ItemWorldBreakablePropRuntime;
  private containerDestructionRuntime!: ContainerDestructionRuntime;
  private enemySpawnRuntime!: ItemWorldEnemySpawnRuntime;
  private enemyEncounterRuntime!: ItemWorldEnemyEncounterRuntime;
  private roomClearRuntime!: ItemWorldRoomClearRuntime;
  private memoryShardSpawnRuntime!: ItemWorldMemoryShardSpawnRuntime;
  private safeRoomResidentSpawnRuntime!: ItemWorldSafeRoomResidentSpawnRuntime;
  private screenFlash!: ScreenFlash;
  private hudSkin: UISkin | null = null;
  private toast!: ToastManager;
  /** Gamepad hot-plug 토스트 unsubscribe (destroy 시 호출). */
  private _gpUnsub: (() => void) | null = null;
  private tutorialHint!: TutorialHint;
  private lowHpHealHint!: LowHpHealHintRuntime;
  private captureOrbRuntime!: ItemWorldCaptureOrbRuntime;
  private hudRuntime!: ItemWorldHudRuntime;
  private onboardingRuntime!: ItemWorldOnboardingRuntime;
  private escapeRuntime!: ItemWorldEscapeRuntime;
  private bossChoiceRuntime!: ItemWorldBossChoiceRuntime;
  private stratumClearRuntime!: ItemWorldStratumClearRuntime;
  private stratumClearPanelRuntime!: ItemWorldStratumClearPanelRuntime;
  private exitFadeRuntime!: ItemWorldExitFadeRuntime;
  // Item being explored
  private item!: ItemInstance;
  private inventory!: Inventory;
  private sourcePlayer!: Player;
  private sceneOptions!: ItemWorldSceneOptions;

  // Memory Strata state
  private strataConfig!: StrataConfig;
  private currentStratumIndex = 0;
  private currentStratumDef!: StratumDef;
  private progress!: ItemWorldProgress;
  private readonly stratumStartSnapshot = new ItemWorldStratumStartSnapshot();

  // Unified grid (all strata combined)
  private readonly runStats = new ItemWorldRunStats();
  private unifiedGrid!: UnifiedGridData;
  /** Per-stratum graphs from the adapter — node.layout.x/y carry grid (col,row). */
  private roomGraphs: RoomGraphData[] = [];
  private devOverlayRuntime!: ItemWorldDevOverlayRuntime;
  private debugInputRuntime!: ItemWorldDebugInputRuntime;
  private currentCol = 0;
  private currentRow = 0; // absolute row in unified grid
  private roomData: number[][] = [];
  private rng!: PRNG;
  private readonly entryCorridorState = new ItemWorldEntryCorridorState();
  private entryCorridorVisibilityRuntime!: ItemWorldEntryCorridorVisibilityRuntime;
  private entryCorridorRevealRuntime!: ItemWorldEntryCorridorRevealRuntime;
  private entryCorridorVisualRuntime!: ItemWorldEntryCorridorVisualRuntime;

  // Full-map rendering (all rooms rendered into one continuous grid)
  private fullGrid: number[][] = [];
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
  private _themeSlug = 'foundry';
  private parallaxBG!: ParallaxBackground;

  // Updraft (IntGrid value 4) ? particles + force handled per-frame
  private updraftSystem!: UpdraftSystem;
  /** Dynamic IntGrid state (frozen/burning/electric). Reset per floor. */
  private tileMutator = new TileMutator();
  /** Renders frozen/burning/electric overlays on top of static tile sprites. */
  private tileMutatorRenderer: TileMutatorRenderer | null = null;
  private readonly burnablePropRegistry = new ItemWorldBurnablePropRegistry();

  private readonly staticEntityRegistry = new ItemWorldStaticEntityRegistry();
  private cameraZoneRuntime!: CameraZoneRuntime;
  private bossHpRuntime!: BossHpRuntime;
  private readonly roomSpawnState = new ItemWorldRoomSpawnState();

  private loreDisplay: LoreDisplay | null = null;

  // Room transition
  private readonly flowState = new ItemWorldFlowState();
  private roomTransitionRuntime!: ItemWorldRoomTransitionRuntime;
  private trapdoorRuntime!: ItemWorldTrapdoorRuntime;
  private trapdoorDescentRuntime!: ItemWorldTrapdoorDescentRuntime;
  private absorbDissolveRuntime!: ItemWorldAbsorbDissolveRuntime;
  private cameraRuntime!: ItemWorldCameraRuntime;
  private egoDialogueRuntime!: ItemWorldEgoDialogueRuntime;

  private readonly exitTelemetryState = new ItemWorldExitTelemetryState();
  private fadeOverlay!: Graphics;

  // Escape confirm dialog

  // Stratum picker (shown on entry when player has unlocked >1 stratum)
  private stratumPickerRuntime!: ItemWorldStratumPickerRuntime;

  // Callback when done
  onComplete: (() => void) | null = null;
  // 프롤로그 종료 시퀀스 완료 → Ch.1 전환(앵빌 복귀 대신). 미설정 시 onComplete fallback.
  onPrologueEnd: (() => void) | null = null;

  /** Set to true if the global Item World tutorial has already been completed. */
  itemWorldTutorialDone = false;

  /** Passed from LdtkWorldScene — shared unlockedEvents for persistence. */
  egoUnlockedEvents: Set<string> = new Set();

  get earnedGold(): number {
    return this.runStats.earnedGold;
  }

  constructor(
    game: Game,
    item: ItemInstance,
    inventory: Inventory,
    sourcePlayer: Player,
    options: ItemWorldSceneOptions = {},
  ) {
    super(game);
    this.item = item;
    this.inventory = inventory;
    this.sourcePlayer = sourcePlayer;
    this.sceneOptions = options;
    this.wireTransitionAndCameraRuntimes();
    this.wireStratumAndPanelRuntimes();
    this.wireMemoryAndTriggerRuntimes();
    this.wireRoomStateAndSpawnRuntimes();
    this.wireEnemyAndHudRuntimes();
  }

  private wireTransitionAndCameraRuntimes(): void {
    this.oxygenOverlay = new OxygenOverlay(this.game);
    this.roomTransitionRuntime = new ItemWorldRoomTransitionRuntime({
      getFadeOverlay: () => this.fadeOverlay,
      fadeDurationMs: FADE_DURATION,
    });
    this.cameraRuntime = new ItemWorldCameraRuntime({
      game: this.game,
      getPlayer: () => this.player,
      getMapSizePx: () => ({
        width: this.unifiedGrid.totalWidth * IW_ROOM_W_PX,
        height: this.unifiedGrid.totalHeight * IW_ROOM_H_PX,
      }),
    });
    this.containerCarryRuntime = new ItemWorldContainerCarryRuntime({
      game: this.game,
      getPlayer: () => this.player,
      getContainers: () => this.containerRegistry.containers,
      getArcTether: () => this.arcTether,
    });
    this.trapdoorRuntime = new ItemWorldTrapdoorRuntime({
      game: this.game,
      getPlayer: () => this.player,
      getTrapdoor: () => this.trapdoor,
      isInteractionSuppressed: () => (
        this.flowState.isActive
        || this.roomTransitionRuntime.isActive
      ),
      onActivate: () => this.startTrapdoorDescent(),
    });
    this.trapdoorDescentRuntime = new ItemWorldTrapdoorDescentRuntime();
    this.itemWorldAnvilRuntime = new ItemWorldAnvilRuntime({
      game: this.game,
      getEntityLayer: () => this.entityLayer,
      getPlayer: () => this.player,
      isInteractionSuppressed: () => (
        this.shouldSuppressWorldPrompts()
        || this.escapeRuntime.isVisible()
        || this.flowState.isActive
        || this.roomTransitionRuntime.isActive
      ),
      onReturnRequest: () => this.escapeRuntime.show(),
    });
    this.hudRuntime = new ItemWorldHudRuntime({
      getHud: () => this.hud,
      getItem: () => this.item,
      getProgress: () => this.progress,
      getStrataConfig: () => this.strataConfig,
      getUnifiedGrid: () => this.unifiedGrid,
      getCurrentStratumIndex: () => this.currentStratumIndex,
      getEarnedExp: () => this.runStats.earnedExp,
    });
    this.onboardingRuntime = new ItemWorldOnboardingRuntime({
      game: this.game,
      getUiController: () => this.uiController,
      getHudSkin: () => this.hudSkin,
    });
    this.escapeRuntime = new ItemWorldEscapeRuntime({
      game: this.game,
      getUiController: () => this.uiController,
      getHudSkin: () => this.hudSkin,
      getItem: () => this.item,
      getRoomsCleared: () => this.runStats.roomsCleared,
      getTotalRooms: () => this.runStats.totalRooms,
      getEarnedExp: () => this.runStats.earnedExp,
      getEarnedGold: () => this.runStats.earnedGold,
      getTransitionState: () => this.flowState.value,
      onExitConfirmed: () => this.startExitFade(),
    });
    this.bossChoiceRuntime = new ItemWorldBossChoiceRuntime({
      game: this.game,
      getUiController: () => this.uiController,
      getHudSkin: () => this.hudSkin,
      onContinue: () => this._continueToNextStratum(),
      onExit: () => this._exitAfterBoss(),
    });
    this.stratumClearRuntime = new ItemWorldStratumClearRuntime({
      game: this.game,
      getUiController: () => this.uiController,
      getItem: () => this.item,
      getBeforeAtk: () => this.stratumStartSnapshot.atk,
      getAfterAtk: () => this.item.finalAtk,
      getBeforeInnocents: () => this.stratumStartSnapshot.innocentCount,
      getAfterInnocents: () => this.item.innocents.length,
      onHoldStarted: () => this.startPostClearHold(),
      onContinue: () => this._continueToNextStratum(),
      onExit: () => {
        this.cleanupForReturnResult();
        this.startExitFade();
      },
    });
  }

  private wireStratumAndPanelRuntimes(): void {
    this.stratumClearPanelRuntime = new ItemWorldStratumClearPanelRuntime({
      game: this.game,
      getUiController: () => this.uiController,
      getHudSkin: () => this.hudSkin,
    });
    this.exitFadeRuntime = new ItemWorldExitFadeRuntime({
      getFadeOverlay: () => this.fadeOverlay,
      durationMs: FADE_DURATION * 2,
    });
    this.egoShardCastRuntime = new ItemWorldEgoShardCastRuntime({
      game: this.game,
      getPlayer: () => this.player,
      getCollisionGrid: () => this.fullGrid,
      getEgoShardRuntime: () => this.egoShardRuntime,
      hasHeldContainer: () => this.containerCarryRuntime.hasHeldContainer(),
    });
    this.egoShardCombatRuntime = new ItemWorldEgoShardCombatRuntime({
      getPlayer: () => this.player,
      getEnemies: () => this.enemyRegistry.enemies,
      getContainers: () => this.containerRegistry.containers,
      getFullGrid: () => this.fullGrid,
      getTileMutator: () => this.tileMutator,
      getShardManager: () => this.egoShardRuntime.managerInstance,
      getDamageNumbers: () => this.dmgNumbers,
      getHitSparks: () => this.hitSparks,
      paintContainerImpact: (kind, gx, gy, volume) => this.containerFluidRuntime.paintImpact(kind, gx, gy, volume),
      destroyContainerWithVFX: (container) => this.containerDestructionRuntime.destroyWithVfx(container),
    });
    this.egoShardProjectileRuntime = new ItemWorldEgoShardProjectileRuntime({
      getPlayer: () => this.player,
      getCollisionGrid: () => this.fullGrid,
      getEgoShardRuntime: () => this.egoShardRuntime,
      onImpact: (x, y, element) => this.egoShardImpactRuntime.handleImpact(x, y, element),
      checkHit: (x, y, element) => this.egoShardCombatRuntime.checkHit(x, y, element),
      flushContainerFluidChanges: () => this.containerFluidRuntime.flush(),
    });
    this.unavailableInputRuntime = new ItemWorldUnavailableInputRuntime({
      game: this.game,
      showToast: (message, color) => this.toast.show(message, color),
    });
    this.absorbDissolveRuntime = new ItemWorldAbsorbDissolveRuntime({
      game: this.game,
      getTilemapContainer: () => this.tilemap.container,
      getFullMapContainer: () => this.fullMapContainer,
      getBgAggregate: () => this.bgAggregate,
      getBuildingLayer: () => this.buildingLayer,
      getResidentsLayer: () => this.residentsLayer,
      getFluidLayer: () => this.fluidLayer,
      getAboveFluidLayer: () => this.aboveFluidLayer,
      getEntityLayer: () => this.entityLayer,
      getPlayerContainer: () => this.player.container,
      getTrapdoor: () => this.trapdoor,
      getFadeOverlayParent: () => this.fadeOverlay.parent ?? null,
      onComplete: () => this.startExitFade(),
    });
    this.entryCorridorVisibilityRuntime = new ItemWorldEntryCorridorVisibilityRuntime({
      game: this.game,
      getHideTargets: () => [
        this.tilemap.container,
        this.fullMapContainer,
        this.buildingLayer,
        this.residentsLayer,
        this.fluidLayer,
        this.aboveFluidLayer,
        ...this.entityLayer.children.map(child => child as Container),
      ],
      getColorRestoreTargets: () => [
        this.fullMapContainer,
        this.tilemap?.container,
        this.buildingLayer,
        this.residentsLayer,
        this.fluidLayer,
        this.aboveFluidLayer,
        this.entityLayer,
        this.weatherLayer,
        this.game.backgroundContainer,
      ],
      getPlayerContainer: () => this.player.container,
      getParallaxContainer: () => this.parallaxBG.container,
      hideHud: () => {
        this.hud.container.visible = false;
        this.hud.hideBossHP();
      },
    });
    this.entryCorridorRevealRuntime = new ItemWorldEntryCorridorRevealRuntime({
      tileSize: TILE_SIZE,
      revealRadiusPx: TILE_SIZE * 7,
      revealMs: 180,
    });
    this.entryCorridorVisualRuntime = new ItemWorldEntryCorridorVisualRuntime({
      atlases: this.atlases,
      revealRuntime: this.entryCorridorRevealRuntime,
      tileSize: TILE_SIZE,
      getTemperament: () => this.item.def.temperamentPrimary,
    });
    this.captureOrbRuntime = new ItemWorldCaptureOrbRuntime({
      getEntityLayer: () => this.entityLayer,
      getTargetCenter: () => ({
        x: this.player.x + this.player.width / 2,
        y: this.player.y + this.player.height / 2,
      }),
      flashOnArrival: () => this.screenFlash.flash(0xaaeeff, 0.2, 90),
    });
    this.egoDialogueRuntime = new ItemWorldEgoDialogueRuntime({
      getLoreDisplay: () => this.loreDisplay,
      getUnlockedEvents: () => this.egoUnlockedEvents,
    });
  }

  private wireMemoryAndTriggerRuntimes(): void {
    this.memoryTriggerRuntime = new ItemWorldMemoryTriggerRuntime({
      getEntityLayer: () => this.entityLayer,
      getPlayer: () => this.player,
      getLoreDisplay: () => this.loreDisplay,
    });
    this.prologueEndRuntime = new ItemWorldPrologueEndRuntime({
      getPlayer: () => this.player,
      getFadeOverlay: () => this.fadeOverlay,
      getEntityLayer: () => this.entityLayer,
      isPrologue: () => sacredSave.getScene() === 'prologue',
      shake: (intensity) => this.game.camera.shake(intensity),
      flash: () => this.screenFlash.flash(0xffffff, 0.5, 90),
      onDone: () => {
        // 아이템계를 빠져나가 Ch.1 로. onPrologueEnd 미설정 시 일반 종료로 fallback.
        if (this.onPrologueEnd) {
          this.exitItemWorldToPrologueEnd();
        } else {
          this.exitItemWorld();
        }
      },
    });
    this.residentRuntime = new ItemWorldResidentRuntime({
      getResidentsLayer: () => this.residentsLayer,
      getPlayer: () => this.player,
      getLoreDisplay: () => this.loreDisplay,
      getEgoFlags: () => this.egoDialogueRuntime.getFlags(),
      getEgoUnlockedEvents: () => this.egoUnlockedEvents,
    });
    this.safeRoomResidentSpawnRuntime = new ItemWorldSafeRoomResidentSpawnRuntime({
      getItemUid: () => this.item.uid,
      getFullGrid: () => this.fullGrid,
      createPrng: (seed) => new PRNG(seed),
      getSpawnController: () => this.spawnController,
      getResidentRuntime: () => this.residentRuntime,
    });
    this.enemyCombatRuntime = new ItemWorldEnemyCombatRuntime({
      getPlayer: () => this.player,
      getEnemies: () => this.enemyRegistry.enemies,
      getHitManager: () => this.hitManager,
      getDamageNumbers: () => this.dmgNumbers,
      getHitSparks: () => this.hitSparks,
      getScreenFlash: () => this.screenFlash,
      getDeathParticles: () => this.deathParticles,
      getHud: () => this.hud,
      getItem: () => this.item,
      getExpMultiplier: () => this.currentStratumDef.expMultiplier,
      getRoomEnemyCount: () => this.roomSpawnState.roomEnemyCount,
      getUnifiedGrid: () => this.unifiedGrid,
      getRoomData: () => this.roomData,
      baseExpPerKill: BASE_EXP_PER_KILL,
      fireEgoFirstKill: () => this.egoDialogueRuntime.fireFirstKill(),
      addEarnedExp: (amount) => this.runStats.addEarnedExp(amount),
      incrementRoomsCleared: () => this.runStats.incrementRoomsCleared(),
      persistRoomState: () => this.persistRoomState(),
      rollDrop: () => this.dropRng.next(),
      addHealingPickup: (pickup) => this.pickupRuntime.addHealingPickup(pickup),
      addGoldPickup: (pickup) => this.pickupRuntime.addGoldPickup(pickup),
    });
    this.tileHazardRuntime = new ItemWorldTileHazardRuntime({
      game: this.game,
      getFullGrid: () => this.fullGrid,
      getCurrentRoom: () => ({ col: this.currentCol, row: this.currentRow }),
      getTileMutator: () => this.tileMutator,
      getTileMutatorRenderer: () => this.tileMutatorRenderer,
      getBurnableProps: () => this.burnablePropRegistry.props,
      getBreakableProps: () => this.staticEntityRegistry.breakableProps,
      getAshRemnant: () => this.ashRemnant,
      getGrassClumpFire: () => this.grassClumpFire,
      getFluidSystem: () => this.fluidSystem,
      getFluidSpawners: () => this.fluidSpawners,
      getFluidCrestFoam: () => this.fluidCrestFoam,
      getPlayer: () => this.player,
      getEnemies: () => this.enemyRegistry.enemies,
      getHud: () => this.hud,
      getDamageNumbers: () => this.dmgNumbers,
      getScreenFlash: () => this.screenFlash,
      destroyBreakablePropWithEffects: (prop, source) => this.breakablePropRuntime.destroyWithEffects(prop, source),
    });
    this.containerFluidRuntime = new ItemWorldContainerFluidRuntime({
      game: this.game,
      getFullGrid: () => this.fullGrid,
      getTileMutator: () => this.tileMutator,
      getFluidSystem: () => this.fluidSystem,
      getActiveTileBounds: () => this.tileHazardRuntime.getActiveTileBounds(),
      getContainers: () => this.containerRegistry.containers,
      getEnemies: () => this.enemyRegistry.enemies,
      getSteamPuff: () => this.steamPuff,
    });
    this.egoShardImpactRuntime = new ItemWorldEgoShardImpactRuntime({
      game: this.game,
      getPlayer: () => this.player,
      getFullGrid: () => this.fullGrid,
      getTileMutator: () => this.tileMutator,
      getFluidSystem: () => this.fluidSystem,
      getActiveTileBounds: () => this.tileHazardRuntime.getActiveTileBounds(),
      getSteamPuff: () => this.steamPuff,
      getFluidResidue: () => this.fluidResidue,
      getGrassClumpFire: () => this.grassClumpFire,
    });
    this.memoryRoomPlacementRuntime = new ItemWorldMemoryRoomPlacementRuntime({
      isStratumEndRoom: (col, absRow) => this.isStratumEndRoom(col, absRow),
    });
    this.templatePickerRuntime = new ItemWorldTemplatePickerRuntime({
      getTemplates: () => this.ldtkTemplates,
      getMemoryRoomPlacements: () => this.memoryRoomPlacementRuntime.getPlacements(),
      getStartRoom: () => this.unifiedGrid.startRoom,
      isStratumEndRoom: (col, absRow) => this.isStratumEndRoom(col, absRow),
    });
    this.fullGridRuntime = new ItemWorldFullGridRuntime();
    this.fullMapLayerRuntime = new ItemWorldFullMapLayerRuntime();
    this.boundaryVisualRuntime = new ItemWorldBoundaryVisualRuntime();
  }

  private wireRoomStateAndSpawnRuntimes(): void {
    this.roomStateRuntime = new ItemWorldRoomStateRuntime();
    this.playerSpawnRuntime = new ItemWorldPlayerSpawnRuntime({
      getFullGrid: () => this.fullGrid,
      getPlayerSize: () => ({ width: this.player.width, height: this.player.height }),
      computeSpawnPoints: (grid, roomLeftTile, roomTopTile) => (
        this.spawnController.computeSpawnPoints(grid, roomLeftTile, roomTopTile)
      ),
    });
    this.roomTypeRuntime = new ItemWorldRoomTypeRuntime({
      isStratumEndRoom: (col, absRow) => this.isStratumEndRoom(col, absRow),
    });
    this.neighborPreSpawnRuntime = new ItemWorldNeighborPreSpawnRuntime({
      getUnifiedGrid: () => this.unifiedGrid,
      getSpawnedRooms: () => this.roomSpawnState.spawnedRooms,
      getEnemyCount: () => this.enemyRegistry.enemies.length,
      spawnRuntimeCell: (col, absRow) => this.runtimeCellSpawner.spawnForCell(col, absRow),
      spawnEnemiesInRoom: (col, absRow) => this.spawnEnemiesInRoom(col, absRow),
      getRoomDebugLabel: (col, absRow) => this.roomTypeRuntime.getDebugLabel(col, absRow),
      persistRoomState: () => this.persistRoomState(),
    });
    this.roomSpawnRuntime = new ItemWorldRoomSpawnRuntime({
      getUnifiedGrid: () => this.unifiedGrid,
      isStartSpawnDone: () => this.entryGateState.startSpawnDone,
      isStratumEndRoom: (col, absRow) => this.isStratumEndRoom(col, absRow),
      spawnAmbientForSafeRoom: (role, col, absRow) => {
        this.safeRoomResidentSpawnRuntime.spawnAmbientForRoom(role, col, absRow);
      },
      markCleared: (cell, recoveryBonus) => this.roomClearRuntime.markCleared(cell, recoveryBonus),
      hasMemoryRoom: (col, absRow) => this.memoryRoomPlacementRuntime.has(col, absRow),
      getRoomType: (col, absRow) => this.roomTypeRuntime.get(col, absRow),
      createSpawnContext: (col, absRow, isBossRoom) => this.enemySpawnRuntime.createContext(col, absRow, isBossRoom),
      spawnRoomRewards: (col, absRow) => this.roomRewardSpawner.spawnForRoom(col, absRow),
      spawnEncounter: (args) => this.enemyEncounterRuntime.spawnForRoom(args),
    });
    this.proceduralDecorRuntime = new ItemWorldProceduralDecorRuntime({
      getNaturalAggregate: () => this.decoAggregate,
      getArtificialAggregate: () => this.artificialDecoAggregate,
      getStructureAggregate: () => this.structAggregate,
      getGrassClumpFire: () => this.grassClumpFire,
      getTileMutator: () => this.tileMutator,
    });
    this.cellVisualRuntime = new ItemWorldCellVisualRuntime({
      getFullGrid: () => this.fullGrid,
      getAtlases: () => this.atlases,
      getThemeSlug: () => this._themeSlug,
      getTemperament: () => this.item.def.temperamentPrimary,
      getMapSize: () => ({
        totalCols: this.unifiedGrid.totalWidth,
        totalRows: this.unifiedGrid.totalHeight,
      }),
      getAggregates: () => ({
        bg: this.bgAggregate,
        interior: this.interiorAggregate,
        wall: this.wallAggregate,
        special: this.specialAggregate,
        shadow: this.shadowAggregate,
        seal: this.sealAggregate,
      }),
    });
    this.runtimeCellSpawner = new ItemWorldRuntimeCellSpawner({
      getCellRecord: (key) => this.cellVisualRuntime.getRecord(key),
      getFullGrid: () => this.fullGrid,
      getContainers: () => this.containerRegistry.containers,
      getBurnableProps: () => this.burnablePropRegistry.props,
      getFluidSpawners: () => this.fluidSpawners,
      getTileMutator: () => this.tileMutator,
      getEntityLayer: () => this.entityLayer,
      getTemperament: () => this.item.def.temperamentPrimary,
      getItemUid: () => this.item.uid,
      spawnStaticEntitiesForRoom: (level, roomX, roomY) => this.staticEntitySpawner.spawnForRoom(level, roomX, roomY),
    });
    this.staticEntitySpawner = new ItemWorldStaticEntitySpawner({
      getFullGrid: () => this.fullGrid,
      getEntityLayer: () => this.entityLayer,
      getBuildingLayer: () => this.buildingLayer,
      getWallPaletteFilter: () => this.wallPaletteFilter,
      getItem: () => this.item,
      getBuildings: () => this.staticEntityRegistry.buildings,
      getSpikes: () => this.staticEntityRegistry.spikes,
      getCrackedFloors: () => this.staticEntityRegistry.crackedFloors,
      getCollapsingPlatforms: () => this.staticEntityRegistry.collapsingPlatforms,
      getGrowingWalls: () => this.staticEntityRegistry.growingWalls,
      getSwitches: () => this.staticEntityRegistry.switches,
      getLockedDoors: () => this.staticEntityRegistry.lockedDoors,
      getItemDisplays: () => this.staticEntityRegistry.itemDisplays,
      spawnMemoryFromEntity: (entity, offX, offY) => {
        this.memoryTriggerRuntime.spawnFromEntity(entity, offX, offY);
      },
      registerPrologueEndTrigger: (entity, offX, offY) => {
        this.prologueEndRuntime.register(entity, offX, offY);
      },
      addCameraZone: (zone) => this.cameraZoneRuntime.addZone(zone),
      spawnAnvil: (x, y) => {
        this.itemWorldAnvilRuntime.spawn(x, y);
      },
    });
    this.roomRewardSpawner = new ItemWorldRoomRewardSpawner({
      getUnifiedGrid: () => this.unifiedGrid,
      getItem: () => this.item,
      getPlayerMaxHp: () => this.player.maxHp,
      getRoomData: () => this.roomData,
      addHealingPickup: (pickup) => this.pickupRuntime.addHealingPickup(pickup),
      addGoldPickup: (pickup) => this.pickupRuntime.addGoldPickup(pickup),
    });
    this.breakablePropRuntime = new ItemWorldBreakablePropRuntime({
      game: this.game,
      getPlayer: () => this.player,
      getRoomData: () => this.roomData,
      getEntityLayer: () => this.entityLayer,
      getBreakableProps: () => this.staticEntityRegistry.breakableProps,
      addGoldPickup: (pickup) => this.pickupRuntime.addGoldPickup(pickup),
      getPropShatter: () => this.propShatter,
      getHitSparks: () => this.hitSparks,
      getTileMutator: () => this.tileMutator,
    });
    this.containerDestructionRuntime = new ContainerDestructionRuntime({
      game: this.game,
      getPropShatter: () => this.propShatter,
    });
  }

  private wireEnemyAndHudRuntimes(): void {
    this.enemySpawnRuntime = new ItemWorldEnemySpawnRuntime({
      getFullGrid: () => this.fullGrid,
      getPlayer: () => this.player,
      getEnemies: () => this.enemyRegistry.enemies,
      getEntityLayer: () => this.entityLayer,
      getRoomEnemyCount: () => this.roomSpawnState.roomEnemyCount,
      getSpawnController: () => this.spawnController,
    });
    this.enemyEncounterRuntime = new ItemWorldEnemyEncounterRuntime({
      getItem: () => this.item,
      getCycle: () => this.progress?.cycle ?? 0,
      getStrataConfig: () => this.strataConfig,
      getStartRoom: () => this.unifiedGrid.startRoom,
      getSpawnController: () => this.spawnController,
      getEnemySpawnRuntime: () => this.enemySpawnRuntime,
      getMemoryShardSpawnRuntime: () => this.memoryShardSpawnRuntime,
    });
    this.roomClearRuntime = new ItemWorldRoomClearRuntime({
      getItem: () => this.item,
      incrementRoomsCleared: () => this.runStats.incrementRoomsCleared(),
      persistRoomState: () => this.persistRoomState(),
    });
    this.memoryShardSpawnRuntime = new ItemWorldMemoryShardSpawnRuntime({
      getItem: () => this.item,
      getDamageNumbers: () => this.dmgNumbers,
      updateHudText: () => this.hudRuntime.updateText(),
      getScreenFlash: () => this.screenFlash,
      getCaptureOrbRuntime: () => this.captureOrbRuntime,
      getLoreDisplay: () => this.loreDisplay,
      getEgoUnlockedEvents: () => this.egoUnlockedEvents,
      getEnemySpawnRuntime: () => this.enemySpawnRuntime,
    });
    this.devOverlayRuntime = new ItemWorldDevOverlayRuntime({
      game: this.game,
      getRoomGraphs: () => this.roomGraphs,
      getItemRarity: () => this.item.rarity,
      getItemUid: () => this.item.uid,
      getWeaponTopologyOverride: () => this.item.def.topologyOverride,
      getStrataConfig: () => this.strataConfig,
    });
    this.debugInputRuntime = new ItemWorldDebugInputRuntime({
      game: this.game,
      getPlayer: () => this.player,
      getEntityLayer: () => this.entityLayer,
      getContainers: () => this.containerRegistry.containers,
      showToast: (message, color) => this.toast.show(message, color),
      onDebugIgniteAtPlayer: () => this.egoShardImpactRuntime.debugIgniteAtPlayer(),
      onDebugFreezeAtPlayer: () => this.egoShardImpactRuntime.debugFreezeAtPlayer(),
      onDebugThunderAtPlayer: () => this.egoShardImpactRuntime.debugThunderAtPlayer(),
    });
    this.weatherRuntime = new ItemWorldWeatherRuntime({
      game: this.game,
      tileSize: TILE_SIZE,
      getWeatherLayer: () => this.weatherLayer,
      getThemeSlug: () => this._themeSlug,
      getFullGrid: () => this.fullGrid,
      getTemperament: () => this.item.def.temperamentPrimary,
    });
    this.stratumPickerRuntime = new ItemWorldStratumPickerRuntime({
      game: this.game,
      getHudSkin: () => this.hudSkin,
      getItem: () => this.item,
      getProgress: () => this.progress,
      getStrataConfig: () => this.strataConfig,
      getClearedStrataFlags: () => this.hudRuntime.getClearedStrataFlags(),
      onPick: (stratumIndex) => this.jumpToStratum(stratumIndex),
    });
    this.cameraZoneRuntime = new CameraZoneRuntime({
      camera: this.game.camera,
      getPlayerCenter: () => ({
        x: this.player.x + this.player.width / 2,
        y: this.player.y + this.player.height / 2,
      }),
    });
    this.bossHpRuntime = new BossHpRuntime({
      getHud: () => this.hud,
      getEnemies: () => this.enemyRegistry.enemies,
      defaultBossName: t('ui.hud.boss_default'),
    });
  }

  async init(): Promise<void> {
    // Resolve visual theme from weapon definition (themeId: "T-FOUNDRY" -> "foundry").
    // 5종 테마 슬러그(foundry/command/malfunction/coolant/echo). 매칭 실패 시 foundry 폴백.
    const themeSlug = (this.item.def.themeId ?? 'T-FOUNDRY').toLowerCase().replace('t-', '');
    this._themeSlug = themeSlug;
    // ItemWorld 테마 타일셋/UI 스킨 등 entity 에셋을 Assets.load 로
    // 먼저 prefetch 하여 진입 시 hitch 를 방지한다 (pixijs-references P1).
    await loadBundleOnce('item_world');
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
      const cachedTemplates = getItemWorldTemplatesIfReady() ?? await prepareItemWorldTemplates();
      // ItemWorldScene retags LDtk tile paths per item theme, so keep the
      // shared template pool immutable across entries.
      this.ldtkTemplates = cloneLdtkLevels(cachedTemplates);
      this.ldtkRenderer = new LdtkRenderer();

      // Load authored LDtk tilesets that are not covered by area palettes.
      // ItemStratum can intentionally use atlas/itemstratum_01.png on normal
      // wall/background layers, so this must include more than extra layers.
      const authoredTilesetPaths = collectLdtkTilesetPaths(this.ldtkTemplates);
      await Promise.all(
        Array.from(authoredTilesetPaths).map(async (relPath) => {
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
    // 프롤로그 강제 다이브는 단일 지층(보스 04 = 최종). totalStrata 가 1 이어야
    // 보스 처치 = 아이템계 완료로 처리된다.
    const forcePrologue = sacredSave.getScene() === 'prologue';
    if (forcePrologue) {
      this.strataConfig = { ...this.strataConfig, strata: [this.strataConfig.strata[0]] };
    }
    this.progress = getOrCreateWorldProgress(this.item);
    // If the item was previously fully cleared, this entry is a "re-dive":
    // reset all per-cycle progress (cleared rooms, deepest unlocked, etc.)
    // so monsters respawn fresh. Item level / innocents are preserved.
    if (this.progress.cleared) {
      resetItemForNextCycle(this.item);
      this.progress = getOrCreateWorldProgress(this.item);
      Debug.log('[ItemWorld] Re-dive: progress reset for cycle', this.progress.cycle);
    }

    this.egoDialogueRuntime.init(this.item.def.id);
    this.rng = new PRNG(this.item.uid * 1000);

    // Analytics: item world entry
    trackItemWorldEnter(this.item.rarity);

    this.hitManager = new HitManager(this.game);

    // First-dive 진입 시 토폴로지/아키타입을 결정하고 unifiedGrid 를 생성한다.
    // 레어리티(Normal/Magic/Rare/...) 별 지층 수가 다르다.
    // DEC-037: Radial Ant Colony topology 를 RoomGraph 로 생성한다.
    // Phase 1: 무기 정의의 topologyOverride 가 있으면 우선, 없으면 stratum 별 기본값.
    // Dev: ?topology=ring 등 URL 파라미터로 강제 지정 가능.
    const urlTopologyRaw = new URLSearchParams(window.location.search)
      .get('topology')?.trim().toLowerCase() ?? '';
    const urlTopology: TopologyKind | undefined = TOPOLOGY_VALUES.has(urlTopologyRaw as TopologyKind)
      ? (urlTopologyRaw as TopologyKind)
      : undefined;
    if (urlTopology) Debug.log(`[ItemWorld] URL topology override: ${urlTopology}`);
    // DEC-039 archetype: 무기 기질(temperament) 조합으로 7 archetype 중 하나를 선택.
    // 매칭 실패 시 'zigzag' fallback. URL ?archetype= 로 dev 오버라이드 가능.
    const urlArchRaw = new URLSearchParams(window.location.search)
      .get('archetype')?.trim().toLowerCase() ?? '';
    const validArchetypes = new Set([
      'direct', 'zigzag', 'switchback', 'spiral', 'wide_sprawl', 'crooked', 'branchy_maze',
    ]);
    const archetype = validArchetypes.has(urlArchRaw)
      ? (urlArchRaw as ReturnType<typeof archetypeFor>)
      : archetypeFor(this.item.def.temperamentPrimary, this.item.def.temperamentSecondary);
    Debug.log(`[ItemWorld] archetype: ${archetype} (primary=${this.item.def.temperamentPrimary ?? '-'} secondary=${this.item.def.temperamentSecondary ?? '-'})`);
    // 프롤로그: 손으로 authoring 한 4 룸 사슬(01→02→03→04)을 강제. 실패(템플릿
    // 누락) 시 절차 생성으로 자연 fallback.
    const forcedDive = forcePrologue ? buildPrologueDive(this.ldtkTemplates) : null;
    const adapterResult = forcedDive
      ? { unifiedGrid: forcedDive.unifiedGrid, graphs: forcedDive.graphs }
      : generateUnifiedGridFromGraph(
          this.strataConfig.strata,
          this.item.uid,
          urlTopology ?? this.item.def.topologyOverride,
          archetype,
        );
    if (forcedDive) Debug.log('[ItemWorld] PROLOGUE forced dive (01→02→03→04)');

    // Dev: persistent topology label (top-left). Shows which source picked the topology.
    this.unifiedGrid = adapterResult.unifiedGrid;
    this.roomGraphs = adapterResult.graphs;
    this.devOverlayRuntime.init(urlTopology);

    // DEC-037 PR-B: optional graph debug overlay (?debug=1 또는 ?debug=graph). Shift+2 토글.

    // Dev: Shift+L = cycle ?topology= and reload (디버그 전용).

    // Pre-compute Memory Room placements per stratum (from CSV lookup).
    // 프롤로그는 고정 placement 사슬을 직접 주입 (memory-room 로직 우회).
    if (forcedDive) {
      this.memoryRoomPlacementRuntime.inject(forcedDive.placements);
    } else {
      this.memoryRoomPlacementRuntime.compute({
        templates: this.ldtkTemplates,
        unifiedGrid: this.unifiedGrid,
        strataCount: this.strataConfig.strata.length,
        weaponId: this.item.def.id,
        itemUid: this.item.uid,
      });
    }

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
    this.stratumStartSnapshot.capture(this.item);

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
        getAreaPaletteAtlas().rowIndex.has(bgId) ? bgId : 'iw_foundry_bg',
      );
      const wallEntry = getAreaPalette(
        getAreaPaletteAtlas().rowIndex.has(wallId) ? wallId : 'iw_foundry_wall',
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
      // DEC-039 — A: parallax 배경을 unifiedGrid 전체 크기에 맞춘다.
      const totalCols = this.unifiedGrid.totalWidth;
      const totalRows = this.unifiedGrid.totalHeight;
      this.parallaxBG.setup(bgEntry, totalCols * IW_ROOM_W_PX, totalRows * IW_ROOM_H_PX, {
        texture: atlas.texture,
        rowCount: atlas.rowCount,
        row: getAreaPaletteRow(bgEntry.id),
      });
    }

    // Building layer = fullMapContainer (platform/wall tile) 를 담는다.
    // fullMapContainer 는 addChildAt(0) 대신 zIndex 로 정렬되도록 addChild 한다.
    // 컨테이너 sortableChildren + zIndex 로 z 순서를 제어한다.
    this.container.sortableChildren = true;
    this.buildingLayer = new Container();
    this.buildingLayer.zIndex = -1;
    this.container.addChild(this.buildingLayer);

    // Residents layer — grid 위, entityLayer 아래에 addChild 하여 z 순서를 맞춘다.
    this.residentsLayer = new Container();
    this.container.addChild(this.residentsLayer);

    // Entity layer
    this.entityLayer = new Container();
    this.container.addChild(this.entityLayer);
    this.grassClumpFire.setFireLayer(this.entityLayer);

    // Shift+I 등 디버그 입력으로 충돌/AABB 디버그 오버레이를 토글한다.
    // hud 는 app.stage 에 붙어 FpsCounter 와 함께 uiContainer.visible 과 무관하게 표시된다.
    // 디버그 전용.
    this.collisionDebug = new CollisionDebugOverlay(this.game.uiScale);
    this.container.addChild(this.collisionDebug.container);
    this.game.app.stage.addChild(this.collisionDebug.hud);

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

    // Item Stratum ambient weather (residue drift) — driven by the area
    // palette's Weather/WeatherParams columns. Topmost world-space layer so
    // motes + breathing haze read over terrain/entities (below HUD).
    this.weatherLayer = new Container();
    this.container.addChild(this.weatherLayer);

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
    this.criticalHighlight = new CriticalHighlightManager(this.entityLayer);
    this.hitBloodSpray = new HitBloodSprayManager(this.entityLayer);
    this.diveLandImpact = new DiveLandImpactManager(this.entityLayer);
    this.waterSplash = new WaterSplashManager(this.entityLayer);
    this.steamPuff = new SteamPuffManager(this.entityLayer);
    this.ashRemnant = new AshRemnantManager(this.entityLayer);
    this.fluidResidue = new FluidResidueManager(this.entityLayer);
    this.egoShardRuntime.initialize(this.entityLayer);
    // Fluid evaporation — drop residue stain (mirrors LdtkWorldScene).
    this.fluidSystem.onEvaporated = (gx, gy, type) => {
      if (type !== 'oil' && type !== 'acid' && type !== 'magma') return;
      const px = (gx + 0.5) * 16;
      const py = (gy + 1) * 16;
      this.fluidResidue.dropAt(type, px, py, 1.0);
    };

    // ----- Arc Scan Cycle (R-NEW-031 v2) ----------------------------------
    // charged FluidBody + electrified water FluidBody 가 주변 도체를
    // 스캔한다 (player / enemies / metal containers / water cells / metal cells)
    // 반경 내 도체에 thunder chain + charged 버프를 적용하고
    // VFX + chain trigger 한다.
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
      for (const e of this.enemyRegistry.enemies) {
        if (!e.alive) continue;
        const ex = e.x + e.width / 2;
        const ey = e.y + e.height / 2;
        const dx = ex - originX, dy = ey - originY;
        if (dx * dx + dy * dy < r2) {
          links.push({ worldX: ex, worldY: ey, kind: 'entity', ref: e });
        }
      }
      // 3) Metal containers (MetalCrate)
      for (const c of this.containerRegistry.containers) {
        if (c.destroyed || c.held) continue;
        if (c.kind !== 'MetalCrate') continue;
        const ccx = c.colX + c.colW / 2;
        const ccy = c.colY + c.colH / 2;
        const dx = ccx - originX, dy = ccy - originY;
        if (dx * dx + dy * dy < r2) {
          links.push({ worldX: ccx, worldY: ccy, kind: 'container', ref: c });
        }
      }
      // 4) Grid conductor cells (water / metal / acid) — origin 주변 셀 스캔
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
      // 가장 가까운 6 link 로 제한한다 (VFX + discharge 비용 절감).
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
          // Capacitor 도 충전 상태로 만들어 thunder 전파 대상에 포함한다 (도체 취급).
          const c = link.ref as { electricChargedMs?: number };
          if (c) c.electricChargedMs = Math.max(c.electricChargedMs ?? 0, FluidSystem.ARC_CHARGED_BUFF_MS);
        } else if (link.kind === 'fluid' || link.kind === 'cell') {
          // water / metal / acid 셀 — thunder chain BFS trigger.
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
    // R-NEW-001 Exothermic Steam: acid+water 반응으로 독성 증기 폭발(steam burst) + vertical
    // burst. Horizontal 24px, vertical 64px 범위의 entity / 컨테이너에 영향.
    this.tileMutator.onAcidSteamBurst = (gx, gy) => {
      const cx = (gx + 0.5) * 16;
      const cy = (gy + 0.5) * 16;
      // 발생 위치에서 독성 증기(steam) 분출 (onSteamEvent 보다 강한 1.0 강도).
      const steamBaseY = (gy + 1) * 16;
      this.steamPuff.spawn(cx, steamBaseY - 12, 1.1, PUFF_TINT_TOXIC);
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
      // Enemies 데미지 + Burn + 넓백.
      for (const e of this.enemyRegistry.enemies) {
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
      // 주변 컨테이너 부양 (3s steam lift)
      for (const c of this.containerRegistry.containers) {
        if (c.destroyed || c.held) continue;
        const ccx = c.colX + c.colW / 2;
        const ccy = c.colY + c.colH / 2;
        if (inSteamBurst(ccx, ccy)) {
          c.applySteamLift(3000);
        }
      }
    };
    // Wall-tile mutations (ice -> 물로 melt, acid -> 벽 corrode, oil/wood
    // burnout) invalidate the static tile layer AND can introduce new
    // fluid cells (ice melt -> water). Coalesce same-frame events into a
    // single refresh in update().
    this.tileMutator.onWallTileChanged = (gx, gy, originalTile) => {
      this.tileHazardRuntime.markFluidGridDirty();
      // If the mutation produced an air cell, paint over the baked-in
      // wall sprite that was aggregated at buildFullMap. New fluid cells
      // (ice 가 녹은 물) don't need a mask — FluidSystem will draw over the
      // wall sprite via the fluid mesh. OIL also doesn't need a mask
      // because its wall sprite was filtered out of the aggregate at
      // bake time (isFluidHiddenTile) — masking would leave a fake
      // residue rectangle where the fluid simply evaporated.
      const v = this.fullGrid[gy]?.[gx];
      if (v === 0 && originalTile !== TILE_OIL) {
        this.fullMapLayerRuntime.markAirMutation(gx, gy);
      } else if (v === TILE_WALL && originalTile === TILE_MAGMA) {
        this.fullMapLayerRuntime.markSolidifiedWall(gx, gy, this.fullGrid, TILE_WALL);
      }
    };
    this.waterBubbles = new WaterBubblesManager(this.entityLayer);
    this.dropThroughDust = new DropThroughDustManager(this.entityLayer);
    this.iceSkidStreak = new IceSkidStreakManager(this.entityLayer);
    this.itemPickupGlow = new ItemPickupGlowManager(this.entityLayer);
    this.lowHpVignette = new LowHpVignetteManager(this.game.legacyUIContainer);
    this.lowHpVignette.setViewport(GAME_WIDTH, GAME_HEIGHT);
    this.movementVfxRuntime = new ItemWorldMovementVfxRuntime({
      getPlayer: () => this.player,
      getEnemies: () => this.enemyRegistry.enemies,
      getFullGrid: () => this.fullGrid,
      getFluidSystem: () => this.fluidSystem,
      getFluidSpawners: () => this.fluidSpawners,
      getDamageNumbers: () => this.dmgNumbers,
      managers: {
        landingDust: this.landingDust,
        dashAfterimage: this.dashAfterimage,
        dashBoostPuff: this.dashBoostPuff,
        doubleJumpRing: this.doubleJumpRing,
        wallJumpDust: this.wallJumpDust,
        jumpTakeoff: this.jumpTakeoff,
        wallSlideDust: this.wallSlideDust,
        footstepPuff: this.footstepPuff,
        surgeVfx: this.surgeVfx,
        hitBloodSpray: this.hitBloodSpray,
        diveLandImpact: this.diveLandImpact,
        waterSplash: this.waterSplash,
        fluidResidue: this.fluidResidue,
        waterBubbles: this.waterBubbles,
        dropThroughDust: this.dropThroughDust,
        iceSkidStreak: this.iceSkidStreak,
        flaskBurst: this.flaskBurst,
        criticalHighlight: this.criticalHighlight,
        steamPuff: this.steamPuff,
      },
    });
    this.containerPhysicsRuntime = new ItemWorldContainerPhysicsRuntime({
      getPlayer: () => this.player,
      getEnemies: () => this.enemyRegistry.enemies,
      getContainers: () => this.containerRegistry.containers,
      getFullGrid: () => this.fullGrid,
      getTileMutator: () => this.tileMutator,
      getDamageNumbers: () => this.dmgNumbers,
      getHitSparks: () => this.hitSparks,
      paintContainerImpact: (kind, gx, gy, volume) => this.containerFluidRuntime.paintImpact(kind, gx, gy, volume),
      applyContainerEffectToFluid: (container) => this.containerFluidRuntime.applyContainerEffect(container),
      destroyContainerWithVFX: (container) => this.containerDestructionRuntime.destroyWithVfx(container),
      flushContainerFluidChanges: () => this.containerFluidRuntime.flush(),
    });
    this.pickupRuntime = new ItemWorldPickupRuntime({
      getPlayer: () => this.player,
      getEntityLayer: () => this.entityLayer,
      getDamageNumbers: () => this.dmgNumbers,
      getItemPickupGlow: () => this.itemPickupGlow,
      getScreenFlash: () => this.screenFlash,
      showToast: (message, color) => this.toast.show(message, color),
      onGoldCollected: (amount) => {
        this.runStats.addEarnedGold(amount);
        this.hud.updateGold(this.runStats.displayGold);
      },
    });
    this.projectileRuntime = new ItemWorldProjectileRuntime({
      game: this.game,
      getPlayer: () => this.player,
      getEnemies: () => this.enemyRegistry.enemies,
      getEntityLayer: () => this.entityLayer,
      getHud: () => this.hud,
      getDamageNumbers: () => this.dmgNumbers,
      getHitSparks: () => this.hitSparks,
      getScreenFlash: () => this.screenFlash,
    });
    this.enemyContactRuntime = new ItemWorldEnemyContactRuntime({
      game: this.game,
      getPlayer: () => this.player,
      getEnemies: () => this.enemyRegistry.enemies,
      getHud: () => this.hud,
      getDamageNumbers: () => this.dmgNumbers,
      getHitSparks: () => this.hitSparks,
      getScreenFlash: () => this.screenFlash,
    });
    this.staticEntityRuntime = new ItemWorldStaticEntityRuntime({
      game: this.game,
      getPlayer: () => this.player,
      getFullGrid: () => this.fullGrid,
      getEnemies: () => this.enemyRegistry.enemies,
      getEntityLayer: () => this.entityLayer,
      getCollapsingPlatforms: () => this.staticEntityRegistry.collapsingPlatforms,
      getGrowingWalls: () => this.staticEntityRegistry.growingWalls,
      getItemDisplays: () => this.staticEntityRegistry.itemDisplays,
      getLockedDoors: () => this.staticEntityRegistry.lockedDoors,
      getCrackedFloors: () => this.staticEntityRegistry.crackedFloors,
      getBreakableProps: () => this.staticEntityRegistry.breakableProps,
      getSwitches: () => this.staticEntityRegistry.switches,
      getContainers: () => this.containerRegistry.containers,
      getHud: () => this.hud,
      getDamageNumbers: () => this.dmgNumbers,
      getHitSparks: () => this.hitSparks,
      getScreenFlash: () => this.screenFlash,
      showToast: (message, color) => this.toast.show(message, color),
      tickTileHazards: (dt) => this.tileHazardRuntime.update(dt),
      destroyBreakablePropWithEffects: (prop, reason) => this.breakablePropRuntime.destroyWithEffects(prop, reason),
      paintContainerImpact: (kind, gx, gy, volume) => this.containerFluidRuntime.paintImpact(kind, gx, gy, volume),
      destroyContainerWithVFX: (container) => this.containerDestructionRuntime.destroyWithVfx(container),
      updateCameraZones: () => this.cameraZoneRuntime.update(),
    });
    this.screenFlash = new ScreenFlash();
    this.game.legacyUIContainer.addChild(this.screenFlash.overlay);

    // Fade overlay
    this.fadeOverlay = new Graphics();
    this.fadeOverlay.rect(0, 0, 960, 544).fill(0x000000); // large enough for any room
    this.fadeOverlay.alpha = 0;
    this.container.addChild(this.fadeOverlay);

    // HUD
    this.hud = new HUD(this.game.uiScale);
    this.hud.setMinimapFrameVisible(false);
    this.hud.setDebugInfoVisible(Debug.infoVisible);
    this.game.uiContainer.addChild(this.hud.container);

    // 세이브 데이터의 gold 를 HUD 배이스라인으로 설정한다.
    // earnedGold 는 런 중 누적되어 baselineGold + earnedGold 로 표시된다(collectGold 경로).
    const savedData = SaveManager.load();
    this.runStats.setBaselineGold(savedData?.gold ?? 0);
    this.hud.updateGold(this.runStats.baselineGold);

    // Area title banner — shows item name on entry.
    this.areaTitle = new AreaTitle();
    this.game.legacyUIContainer.addChild(this.areaTitle.container);
    this.areaTitle.show(getDisplayName(this.item));
    this.uiController = new ItemWorldUiController(this.game);
    this.spawnController = new ItemWorldSpawnController();
    this.progressController = new ItemWorldProgressController({
      jumpToStratum: (stratumIndex) => this.jumpToStratum(stratumIndex),
      persistRoomState: () => this.persistRoomState(),
      showBossChoice: (nextStratumIndex) => this.bossChoiceRuntime.show(nextStratumIndex),
      showA6DmgToast: (beforeAtk, afterAtk) => this._showA6DmgToast(beforeAtk, afterAtk),
      showStratumClearPanel: (snapshot, isFinal) => this.stratumClearPanelRuntime.show(snapshot, isFinal),
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

    // Toast
    this.toast = new ToastManager(this.game.legacyUIContainer);
    // Gamepad hot-plug 토스트 (System_Input_Gamepad Stage 3).
    this._gpUnsub = attachGamepadToast(this.game, this.toast);

    // Tutorial hint (used for low-HP heal cue, etc. — same UX as world scene)
    this.tutorialHint = new TutorialHint(this.game.input, this.game.legacyUIContainer, this.hudSkin);
    this.lowHpHealHint = new LowHpHealHintRuntime({
      tutorialHint: this.tutorialHint,
      getHp: () => ({ hp: this.player.hp, maxHp: this.player.maxHp }),
    });

    // Restore persistent exploration state & count rooms
    this.restoreRoomState();
    this.countTotalRooms();

    // Build full map (all rooms rendered into a single continuous grid)
    // Spawner state must be cleared BEFORE buildFullMap because the room
    // placement loop pushes into fluidSpawners as templates are placed.
    this.fluidSpawners.clear();
    this.fluidCrestFoam?.clear();
    this.containerRegistry.reset(); // reset across stratum reloads
    this.fluidSystemReady = false;
    this.buildFullMap();
    // Resolve FluidGeneric_A/B/C (17/18/19) -> concrete fluid tiles based on
    // this dive's weapon temperament (forge/iron/rust/spark/shadow). MUST run
    // before fluidSystem.attachGrid so flood-fill sees the resolved values.
    // Spec: Documents/System/System_World_Fluid.md
    applyFluidGenericResolution(this.fullGrid, this.item.def.temperamentPrimary);
    this.weatherRuntime.init();
    // Wire FluidSystem to the freshly built grid — flood-fills fluid bodies
    // for every water/oil/acid/magma cell that any room template placed.
    // Mirrors LdtkWorldScene's per-level attach but uses the unified grid
    // since ItemWorld has no single LdtkLevel wrapper.
    this.fluidSystem.attachGrid(this.fullGrid, [], this.tileHazardRuntime.getActiveTileBounds());
    this.fluidSystemReady = true;
    // FluidSpawner wiring happens per-room inside buildFullMap (offsets
    // adjusted to the unified grid). Spawner state cleared before
    // buildFullMap, so here we just proceed to settle containers.
    this.containerRegistry.settleAll(this.fullGrid);
    this.hudRuntime.showGameplayHud();

    // Spawn player. DEC-038: LDtk Start 마커가 있으면 Player entity 스폰 위치로 사용.
    // Player pivot 은 LDtk bottom-center 기준이므로 동기화한다.
    // 진입 시 가장 가까운 floor 위에 배치한다.
    const initialSpawn = this.playerSpawnRuntime.resolveForRoom(
      this.currentStratumIndex,
      this.currentCol,
      this.currentRow,
    );
    this.player.x = initialSpawn.x;
    this.player.y = initialSpawn.y;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.savePrevPosition();

    // Camera
    this.game.camera.setZoom(1.0);
    this.game.camera.snap(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2);
    if (this.sceneOptions.entryCorridor) {
      this.activateEntryCorridor();
    }

    // LoreDisplay for Memory Rooms — uiContainer(native) 에 추가 (UI native 1).
    this.loreDisplay = new LoreDisplay(this.game.input, this.game.uiScale);
    this.game.uiContainer.addChild(this.loreDisplay.container);

    this.initialized = true;
    if (!this.entryCorridorState.active) {
      this.startItemWorldGameplayAfterEntry();
    }
  }

  private startItemWorldGameplayAfterEntry(): void {
    if (!this.entryGateState.tryMarkStartSpawnDone()) return;

    // ----- Ego T04: landing dialogue -----
    // 진입(2026-05-02): Plaza Gatekeeper / ambient 연출과 함께
    // landing dialogue 를 발화한다 (자아 대사).
    // 순서:
    //   1) startSpawnDone=true 로 마킹 후 spawnEnemiesInRoom 으로 현재 방을 spawn
    //   2) 일정 freeze(500ms) 후 player 입력을 받는다.
    this.roomSpawnState.markSpawned(`${this.currentCol},${this.currentRow}`);
    this.spawnEnemiesInRoom(this.currentCol, this.currentRow);
    // Entry banner ? item name handled by AreaTitle; announce stratum only.
    const rarityColor = RARITY_COLOR[this.item.rarity];
    const stratumLabel = t('iw.stratum_banner', { n: this.currentStratumIndex + 1 });
    this.toast.show(stratumLabel, rarityColor);

    // Show stratum picker if player has unlocked more than one stratum on this item
    const totalStrata = this.strataConfig.strata.length;
    const maxSelectable = Math.min(this.progress.deepestUnlocked + 1, totalStrata);
    if (maxSelectable > 1) {
      this.stratumPickerRuntime.show(maxSelectable);
    }
  }

  beginEntryDialogueAfterTransition(): void {
    if (this.entryCorridorState.active) {
      this.entryCorridorState.requestDialogueAfterCompletion();
      return;
    }
    if (!this.egoDialogueRuntime.tryMarkEntryDialogueStarted()) return;
    setTimeout(() => {
      if (!this.initialized) return;
      void this.fireEgoEnterAsync();
    }, 250);
  }

  private activateEntryCorridor(): void {
    const levels = selectEntryCorridorLevels(this.ldtkTemplates, this.item.uid, this.currentStratumIndex);
    if (levels.length === 0) {
      console.warn(`[ItemWorld] Missing LDtk entry corridor "${ENTRY_CORRIDOR_LEVEL_PREFIX}*"; starting directly in ItemStratum.`);
      return;
    }

    const composite = buildEntryCorridorComposite(levels, TILE_SIZE);
    const bottomExitY = findEntryCorridorBottomExitY(composite.grid, TILE_SIZE);
    const corridorVisuals = this.entryCorridorVisualRuntime.create(composite);
    this.container.addChildAt(corridorVisuals, Math.min(1, this.container.children.length));
    this.entryCorridorVisibilityRuntime.suppressWorld();

    const spawn = findEntryCorridorLeftSpawn({
      grid: composite.grid,
      tileSize: TILE_SIZE,
      playerWidth: this.player.width,
      playerHeight: this.player.height,
      isAabbClear: (x, y, w, h) => this.isAabbClearInGrid(composite.grid, x, y, w, h),
    });
    this.roomData = composite.grid;
    this.player.roomData = composite.grid;
    this.player.x = spawn.x;
    this.player.y = spawn.y;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.facingRight = true;
    this.player.savePrevPosition();

    this.entryGateState.clearFreeze();
    this.entryCorridorState.activate(bottomExitY);
    this.game.camera.setBounds(
      0,
      0,
      composite.widthPx,
      composite.heightPx,
      VISUAL_BOUNDS_BLEED_PX,
    );
    this.game.camera.snap(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2);
    this.game.camera.target = {
      x: this.player.x + this.player.width / 2,
      y: this.player.y + this.player.height / 2,
    };
    this.updateEntryCorridorTileReveal(0);
  }

  private updateEntryCorridor(dt: number): void {
    if (this.containerRegistry.isPlayerStandingOnTop(this.player)) {
      this.player.forceGrounded(true, 'container');
    }
    this.player.update(dt);
    this.updateEntryCorridorTileReveal(dt);
    this.updateMovementVfx(dt);
    this.dmgNumbers.update(dt);
    this.screenFlash.update(dt);

    const playerCenterX = this.player.x + this.player.width / 2;
    const bottomReached = this.player.isGrounded()
      && this.entryCorridorState.bottomExitY > 0
      && this.player.y + this.player.height >= this.entryCorridorState.bottomExitY - 1;
    if (bottomReached) {
      this.completeEntryCorridor();
      return;
    }

    this.game.camera.target = {
      x: playerCenterX,
      y: this.player.y + this.player.height / 2,
    };
    this.game.camera.update(dt);
  }

  private updateEntryCorridorTileReveal(dt: number): void {
    const px = this.player.x + this.player.width / 2;
    const py = this.player.y + this.player.height / 2;
    this.entryCorridorRevealRuntime.update(dt, px, py);
  }

  private completeEntryCorridor(): void {
    this.entryCorridorState.complete();
    this.roomData = this.fullGrid;
    this.player.roomData = this.fullGrid;
    this.entryCorridorVisibilityRuntime.restoreWorld();
    this.entryCorridorVisualRuntime.destroy();

    const spawn = this.playerSpawnRuntime.resolveForRoom(
      this.currentStratumIndex,
      this.currentCol,
      this.currentRow,
    );
    this.player.x = spawn.x;
    this.player.y = spawn.y;
    this.player.vx = 0;
    this.player.vy = 60;
    this.player.savePrevPosition();

    this.game.camera.setBounds(
      0,
      0,
      this.unifiedGrid.totalWidth * IW_ROOM_W_PX,
      this.unifiedGrid.totalHeight * IW_ROOM_H_PX,
      VISUAL_BOUNDS_BLEED_PX,
    );
    this.game.camera.snap(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2);
    this.game.camera.target = {
      x: this.player.x + this.player.width / 2,
      y: this.player.y + this.player.height / 2,
    };
    this.entryGateState.clearFreeze();
    this.hudRuntime.showGameplayHud();
    this.startItemWorldGameplayAfterEntry();

    if (this.entryCorridorState.consumeDialogueAfterCompletion()) {
      this.beginEntryDialogueAfterTransition();
    }
  }

  private isAabbClearInGrid(grid: number[][], x: number, y: number, w: number, h: number): boolean {
    const left = Math.floor(x / TILE_SIZE);
    const right = Math.floor((x + w - 1) / TILE_SIZE);
    const top = Math.floor(y / TILE_SIZE);
    const bottom = Math.floor((y + h - 1) / TILE_SIZE);
    for (let row = top; row <= bottom; row++) {
      for (let col = left; col <= right; col++) {
        if (isSolid(grid[row]?.[col] ?? TILE_WALL)) return false;
      }
    }
    return true;
  }

  private countTotalRooms(): void {
    this.runStats.setTotalRooms(this.roomStateRuntime.countTotalRooms(this.unifiedGrid));
  }

  private getCell(col: number, row: number): UnifiedRoomCell | null {
    return this.roomStateRuntime.getCell(this.unifiedGrid, col, row);
  }

  private getCurrentCell(): UnifiedRoomCell {
    return this.roomStateRuntime.getCurrentCell(this.unifiedGrid, this.currentCol, this.currentRow);
  }

  private restoreRoomState(): void {
    const restored = this.roomStateRuntime.restoreRoomState(this.unifiedGrid, this.progress, this.roomSpawnState.spawnedRooms);
    this.runStats.setRoomsCleared(restored.roomsCleared);
  }

  private persistRoomState(): void {
    this.roomStateRuntime.persistRoomState(this.unifiedGrid, this.progress, this.roomSpawnState.spawnedRooms);
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
   * Renders all room templates into a single continuous 2048x2048px grid.
   * Called from init() and on stratum transitions (replaces loadRoom).
   * Implements: System_ItemWorld_Core ? full-map rendering spec.
   */
  private buildFullMap(): void {
    // Reset elemental tile overlays (frozen/burning/electric) + burnable
    // entity registry — old cell keys would otherwise leak into the freshly
    // built fullGrid coordinates.
    this.tileMutator.reset();
    this.burnablePropRegistry.clear();
    this.ashRemnant?.clear();
    this.grassClumpFire.clear();
    this.fluidResidue?.clear();
    this.egoShardRuntime.clear();
    this.containerRegistry.clear();
    this.containerCarryRuntime.reset();
    this.roomRewardSpawner.clearSpawnerPoints();

    // Strata depth auto-transformation: deeper = darker, more corroded.
    const totalStrata = this.strataConfig.strata.length;
    const depthRatio = totalStrata > 1 ? this.currentStratumIndex / (totalStrata - 1) : 0;
    const layers = this.fullMapLayerRuntime.rebuild({
      previousContainer: this.fullMapContainer,
      bgPaletteFilter: this.bgPaletteFilter,
      wallPaletteFilter: this.wallPaletteFilter,
      naturalPaletteFilter: this.naturalPaletteFilter,
      depthRatio,
    });
    this.fullMapContainer = layers.fullMapContainer;
    this.bgAggregate = layers.bgAggregate;
    this.interiorAggregate = layers.interiorAggregate;
    this.wallAggregate = layers.wallAggregate;
    this.specialAggregate = layers.specialAggregate;
    this.shadowAggregate = layers.shadowAggregate;
    this.sealAggregate = layers.sealAggregate;
    this.decoAggregate = layers.decoAggregate;
    this.artificialDecoAggregate = layers.artificialDecoAggregate;
    this.structAggregate = layers.structAggregate;
    this.roomSpawnState.clearSpawnedRooms();
    this.roomTypeRuntime.clear();
    this.clearEnemies();
    this.playerSpawnRuntime.clear();
    this.cellVisualRuntime.clearRecords();
    this.cellVisualRuntime.resetRenderedState();
    this.runtimeCellSpawner.clearSpawnedCells();

    // DEC-039 — A: 통합 그리드는 strata 를 absoluteRow 로 이어붙인다.
    // fullGrid 의 totalWidth x totalHeight 로 전체 크기를 잡는다.
    // unifiedGrid 기준으로 처리한다.
    const totalCols = this.unifiedGrid.totalWidth;
    const totalRows = this.unifiedGrid.totalHeight;
    Debug.log(`[ItemWorld] buildFullMap UNIFIED totalGrid=${totalCols}x${totalRows} strata=${this.unifiedGrid.strataOffsets.length} templates=${this.ldtkTemplates.length}`);

    // Initialize full grid as solid (1) — unrendered regions remain impassable
    this.fullGrid = this.fullGridRuntime.createInitialGrid(totalCols, totalRows);
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

        this.roomTypeRuntime.assign(cell, ldtkLevel, col, absRow);
        this.fullGridRuntime.applyRoomCollision(this.fullGrid, cell, ldtkLevel, col, absRow);
        const roomX = col * IW_ROOM_W_PX;
        const roomY = absRow * IW_ROOM_H_PX;
        this.roomRewardSpawner.captureSpawnersForRoom(ldtkLevel, col, absRow, roomX, roomY);
        this.cellVisualRuntime.setRecord({
          col,
          row: absRow,
          ldtkLevel,
          roomX,
          roomY,
        });

        // PIXI v8 cell culling — viewport 밖 cell 의 sprite draw skip.
        // cullArea 는 local coords (position 과 무관한 world 기준이 아님). 각 cell 의
        // local box = (0, 0, IW_ROOM_W_PX, IW_ROOM_H_PX).
        // visible toggle 은 updateCellVisibility 가 viewport 기준으로 처리한다.

        // DEC-039 — A: stratum 0 의 startRoom Player entity 는 init() 에서 처리.
        // 다른 stratum 은 jumpToStratum 에서 처리한다.
        // stratum start 좌표를 기록해 둔다.
        this.playerSpawnRuntime.captureFromRoom(this.unifiedGrid, ldtkLevel, col, absRow, roomX, roomY);

        roomCount++;
        // Mark start room as visited
        if (cell && col === this.currentCol && absRow === this.currentRow) {
          cell.visited = true;
        }

        // Exit portal spawned on boss death, not pre-placed
      }
    }

    this.fullGridRuntime.addBoundaryCollision(this.fullGrid, totalCols, totalRows);
    this.boundaryVisualRuntime.addBoundaryFrame(this.sealAggregate, totalCols, totalRows);

    this.proceduralDecorRuntime.generate({
      enabled: this._procDecoEnabled,
      fullGrid: this.fullGrid,
      themeId: this.item.def.themeId,
      itemUid: this.item.uid,
      currentStratumIndex: this.currentStratumIndex,
      depthRatio,
    });

    // Insert map container into scene, then ensure parallax stays behind everything
    this.container.addChildAt(this.fullMapContainer, 0);
    this.runtimeCellSpawner.spawnForCell(this.currentCol, this.currentRow);
    this.updateCellVisibility();
    // Set collision and camera to the active stratum size.
    this.roomData = this.fullGrid;
    this.player.roomData = this.fullGrid;
    this.game.camera.setBounds(0, 0, totalCols * IW_ROOM_W_PX, totalRows * IW_ROOM_H_PX, VISUAL_BOUNDS_BLEED_PX);

    this.persistRoomState();
    this.breakablePropRuntime.resetAndSpawnProcedural({
      currentStratumIndex: this.currentStratumIndex,
      itemIdLength: this.item.def.id.length,
      currentCol: this.currentCol,
      currentRow: this.currentRow,
    });

    // DEC-039 — A: exitTrigger 대신 down exit 를 사용한다.
    // stratum 경계를 넘으면 down exit 로 처리한다.
  }

  /**
   * Spawn enemies in the given room cell (lazy ? triggered on first player entry).
   * Full-map room spawning: the legacy per-room loadRoom path was removed.
   */
  private spawnEnemiesInRoom(col: number, row: number): void {
    this.roomSpawnRuntime.spawnForRoom(col, row);
  }
  // DEC-039 — A: spawnBossPortal / restorePortalIfStratumCleared /
  // getBossPortalFallbackPosition 은 제거됨. down exit 로 대체.
  // stratum 전환은 down exit 로 처리한다.

  private pickLdtkTemplate(cell: UnifiedRoomCell | null, rng: PRNG): LdtkLevel | null {
    return this.templatePickerRuntime.pick(cell, rng);
  }
  private clearEnemies(): void {
    this.enemyRegistry.clear();
    this.projectileRuntime.clear();
    this.pickupRuntime.clear();
    this.residentRuntime.clear();
    // Reset pre-spawn cascade tracker so new stratum's neighbors get pre-spawned
    this.roomSpawnState.resetNeighborPreSpawn();
  }

  /** Apply updraft force when player stands on IntGrid value 4, + render particles */
  private applyUpdrafts(dt: number): void {
    this.updraftSystem.update(dt, this.player, this.fullGrid, this.game.camera);
  }

  /** Destroy and clear all LDtk-placed static entities. Called on rebuild + exit. */
  private clearStaticEntities(): void {
    this.staticEntityRegistry.clear();
    this.cameraZoneRuntime.clear();
    this.memoryTriggerRuntime.clear();
    this.prologueEndRuntime.clear();
    this.residentRuntime.clear();
    // DEC-039 Trapdoor 도 buildFullMap 시 함께 정리한다.
    if (this.trapdoor) {
      this.trapdoorRuntime.hidePrompt();
      this.trapdoor.destroy();
      this.trapdoor = null;
    }
    // ItemWorld exit-anvils 도 rebuild/stratum 전환 시 함께 정리한다.
    this.itemWorldAnvilRuntime.clear();
  }

  enter(): void {
    if (this.parallaxBG) this.parallaxBG.container.visible = true;
    this.entryGateState.restartFreeze();
    // 월드 BGM 의 outro 1 회 재생 후 silence. Item World 의 BGM
    // (mus_iw_lane_rust_loop) 은 별도 BgmController.play 로 재생한다.
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
      level_id: this.entryCorridorState.active ? ENTRY_CORRIDOR_LEVEL_ID : undefined,
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

    // Commit last frame's interaction-prompt accumulation before any player
    // update reads it (attack suppression buffer; once per frame).
    this.game.input.beginInteractionFrame();

    // Ambient stratum weather animates in every state (gameplay, modals,
    // transitions) so the residue field never freezes mid-dive.
    this.weatherRuntime.update(dt);
    this.entryCorridorVisibilityRuntime.updateColorRestore(dt);

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
    if (this.onboardingRuntime.updateBlockingInput()) {
      return;
    }

    // Stratum picker blocks gameplay
    if (this.stratumPickerRuntime.isVisible) {
      this.stratumPickerRuntime.update(dt);
      return;
    }

    // LoreDisplay (Memory Room lore) ? when active, pause gameplay
    if (this.loreDisplay?.isActive) {
      this.loreDisplay.update(dt);
      // Sync prev position so render interpolation doesn't cause jitter
      this.player.savePrevPosition();
      return;
    }

    if (this.entryCorridorState.active) {
      this.updateEntryCorridor(dt);
      return;
    }

    if (this.entryGateState.tickFreeze(dt)) {
      this.player.vx = 0;
      this.player.vy = 0;
      this.player.savePrevPosition();
      this.hud.update(dt);
      this.hudRuntime.updateText();
      this.dmgNumbers.update(dt);
      this.screenFlash.update(dt);
      this.game.camera.target = {
        x: this.player.x + this.player.width / 2,
        y: this.player.y + this.player.height / 2,
      };
      this.game.camera.update(dt);
      return;
    }

    if (this.escapeRuntime.updateInput()) {
      return;
    }

    // 프롤로그 종료 시퀀스 — prologue_end 트리거 터치 시 말소자 등장 → 위상 찢김
    // → 암전 → Ch.1 전환. 시퀀스 중 게임플레이를 멈춘다(흔들림·플래시는 유지).
    if (this.prologueEndRuntime.update(dt)) {
      this.player.vx = 0;
      this.player.vy = 0;
      this.player.savePrevPosition();
      this.screenFlash.update(dt);
      this.hud.update(dt);
      this.game.camera.update(dt);
      return;
    }

    // Hide world prompts while modal/transition flows suppress interaction prompts.
    if (this.shouldSuppressWorldPrompts()) {
      this.hideWorldPrompts();
    }

    // A17 (playtest 2026-04-17): boss-kill choice panel. After a non-final
    // stratum boss, the portal would auto-advance; now the player explicitly
    // chooses CONTINUE (deeper) or EXIT (bank progress and leave).
    // Pattern A(Modal, UI_Interaction_Patterns.md): C(ATTACK)=Continue
    // Deeper), ESC(MENU)=Exit Safely). Z/X 등 다른 UI 입력은 무시한다.
    // 선택 전에는 게임플레이를 멈춘다.
    if (this.bossChoiceRuntime.updateInput()) {
      return;
    }

    if (this.roomTransitionRuntime.isActive) {
      this.roomTransitionRuntime.update(dt, {
        placePlayerInRoom: (col, row) => this.placePlayerForRoomTransition(col, row),
      });
      return;
    }

    if (this.absorbDissolveRuntime.isActive) {
      this.absorbDissolveRuntime.update(dt);
      return;
    }

    if (this.flowState.isActive) {
      this.updateTransition(dt);
      return;
    }

    // World Map / Inventory are unavailable inside Item World ? surface a
    // short English toast so the player understands the key was recognised
    // but intentionally disabled here. Shift+I 는 Game.ts 에서 INVENTORY 로
    // consume 되어 UI 가 열리지 않는다.
    this.unavailableInputRuntime.update();

    if (this.containerRegistry.isPlayerStandingOnTop(this.player)) {
      this.player.forceGrounded(true, 'container');
    }
    this.player.update(dt);

    this.lowHpHealHint.update();
    this.tutorialHint.update(dt);

    // Updraft wind zones (IntGrid value 4 in fullGrid)
    this.applyUpdrafts(dt);

    this.debugInputRuntime.update();

    this.egoShardCastRuntime.update(dt);

    // ----- Grab / Throw (B / RB) — Arc Tether + Spelunky 스타일 -----
    // LdtkWorldScene 과 동일한 로직을 LdtkWorldScene update() 에서 공유한다.
    this.containerCarryRuntime.update(dt);

    // LDtk-placed static entities (spikes, cracked floors, switches, etc.)
    this.staticEntityRuntime.update(dt);

    // Memory Room triggers ? animate shards + show dialogue on entry
    this.memoryTriggerRuntime.update(dt);

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
      this.exitTelemetryState.markExitTracked();

      // ----- Ego T11: player death -----
      this.fireEgoPlayerDeath();

      // Clear all UI overlays on death
      this.hud.hideBossHP();
      this.game.uiContainer.removeChildren();
      this.game.uiContainer.addChild(this.hud.container);

      // Death penalty: lose 30% earned EXP, drop back one stratum
      this.runStats.applyExpPenalty(0.3);
      if (this.currentStratumIndex > 0) {
        this.progress.lastSafeStratum = this.currentStratumIndex - 1;
      }
      this.persistRoomState();
      this.player.respawn();

      // Show death result modal before exiting
      this.cleanupForReturnResult();
      if (!this.uiController.showReturnResult({
        item: this.item,
        prevLevel: this.stratumStartSnapshot.level,
        prevAtk: this.stratumStartSnapshot.atk,
        goldEarned: 0,
        enemiesDefeated: this.enemyRegistry.defeatedCount(),
        innocentsCaptured: this.stratumStartSnapshot.innocentsCapturedBy(this.item),
        strataCleared: this.currentStratumIndex,
        totalStrata: this.strataConfig.strata.length,
        isDeath: true,
      }, () => {
        // accept 콜백: ReturnResult 닫힌 뒤 아이템 월드를 종료한다. startExitFade(400ms) + LdtkWorld
        // return fade-in(250ms) 으로 자연스럽게 fade 전환한다.
        this.exitItemWorld();
      })) {
        this.exitItemWorld();
      }
      return;
    }

    this.enemyRegistry.update(dt);
    // DEC-038 Town residents — idle anim + proximity 시 Ego 대사를 발화.
    this.residentRuntime.update(dt);
    // DEC-039 Trapdoor — idle anim + proximity prompt + ATTACK 상호작용.
    this.trapdoorRuntime.update(dt);
    // ItemWorld exit Anvil — proximity prompt + ATTACK 상호작용, ESC 로도 종료한다.
    this.itemWorldAnvilRuntime.update(dt);
    // cell culling — viewport 밖 cell 의 4 layer 를 visible=false 로 draw skip.
    this.updateCellVisibility();

    this.enemyCombatRuntime.updatePlayerAttack();
    this.enemyCombatRuntime.processDefeatedEnemies();
    this.pickupRuntime.updateHealing(dt);

    // Breakable props (sway animation)
    for (const bp of this.staticEntityRegistry.breakableProps) bp.update(dt);

    this.pickupRuntime.updateGold(dt);
    this.projectileRuntime.update(dt);

    this.enemyContactRuntime.update();

    // Boss killed check ? spawn exit portal at boss death location
    // Check ALL dead bosses regardless of exitTrigger state
    for (const enemy of this.enemyRegistry.enemies) {
      if (!enemy.alive && (enemy as any)._isBoss && !(enemy as any)._portalSpawned) {
        (enemy as any)._portalSpawned = true;
        this.hud.hideBossHP();
        const cell = this.getCurrentCell();
        cell.cleared = true;

        // Playtest 2026-04-26 #1: anvil retires after first IW boss clear
        // (any rarity, any weapon). One-shot — repeat boss kills do nothing.
        if (!sacredSave.isFirstItemWorldBossDefeated()) {
          sacredSave.markFirstItemWorldBossDefeated();
        }

        // Analytics: stratum boss defeated
        trackItemWorldFloorClear(this.currentStratumIndex, this.item.rarity);

        // Boss EXP is granted via normal kill EXP path (CSV Exp column = 1200).
        // No forced itemLevelUp() ? SSoT: Content_Stats_Enemy.csv

        // DEC-046 (2026-05-24): 보스 처치 시 Recovery stage jump + Fragment 획득을 처리한다.
        // stage 가 바뀔면 stratumIndex 와 stageJumpTarget 을 기록한다.
        // this.lastBossStageJump 에 저장해 ReturnResult 에서 표시한다.
        const totalStrata = this.strataConfig.strata.length;
        const stageJumpResult = grantBossStageJump(
          this.item,
          this.currentStratumIndex,
          totalStrata,
        );
        if (stageJumpResult.stageChanged) {
          this.lastBossStageJump = {
            stratumIndex: this.currentStratumIndex,
            newStage: stageJumpResult.newStage,
            fragmentId: stageJumpResult.fragmentId,
            itemName: getDisplayName(this.item),
          };
          // 토스트로 Fragment 획득을 알린다 (ReturnResult 와 연동).
          this.toast.show(
            `??${getDisplayName(this.item)}`,
            0xffd700,
          );
        }

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
        this.pickupRuntime.addHealingPickup(anvil);

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

        // ----- DEC-039 — D: Trapdoor 처리 -----
        // D-down 이 'no_down' 으로 표시된 방(RoomGraphAdapter)
        // 에서는 하강이 불가하므로 Trapdoor 대신 다른 출구를 사용한다.
        // (Trapdoor) 처리.
        //
        // 진입(2026-05-02): Trapdoor 는 Rustborn 등 보스 처치
        // 위치에 spawn. descentToWorld 면 최종 지층이므로 FloatingItemDrop 으로 스폰.
        // entity 가 dialogue 후 spawnTrapdoorEntity() 로 생성된다.
        //
        // enemy 가 죽은 cell 의 enemy 위치를 기준으로
        // fullGrid 의 floor 를 찾아 배치한다 (currentRow stale 방지).
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

        // Trapdoor entity 는 dialogue 후 생성된다.
        // Step 1 (2026-05-25): 최종 지층 보스 처치(pendingDescentToWorld=true) 시 Trapdoor 대신
        // FloatingItemDrop spawn 한다.
        const spawnTrapdoorEntity = (): void => {
          if (this.trapdoor) return;
          if (pendingDescentToWorld) {
            this.trapdoor = new FloatingItemDrop(pendingTrapX, pendingTrapY, this.item);
            // 2026-05-25: spawn 시 grayscale + intensity 필터를 준비한다 (interact 시 적용).
            this.absorbDissolveRuntime.prepareFilter();
          } else {
            this.trapdoor = new Trapdoor(pendingTrapX, pendingTrapY);
          }
          this.entityLayer.addChild(this.trapdoor.container);
          this.trapdoorState.setDescentToWorld(pendingDescentToWorld);
          this.toast.show(t('toast.trapdoor_opens'), 0xff7744);
          Debug.log(`[Trapdoor] spawned post-dialogue at (${pendingTrapX.toFixed(0)}, ${pendingTrapY.toFixed(0)}) ${pendingDescentToWorld ? '(FloatingItemDrop)' : '(Trapdoor)'}`);
          // DLG-11: Trapdoor spawn 직후 자아 대사를 발화한다
          // (2026-05-04). EGO_EVENT.TRAPDOOR_THANKS 를 한 번만 발화한다.
          if (
            this.loreDisplay &&
            !this.egoUnlockedEvents.has(EGO_EVENT.TRAPDOOR_THANKS) &&
            !this.loreDisplay.isActive
          ) {
            this.egoUnlockedEvents.add(EGO_EVENT.TRAPDOOR_THANKS);
            void this.loreDisplay.showDialogue(EGO_TRAPDOOR_THANKS, false);
          }
        };

        // ----- Ego T12: boss killed dialogue -----
        // First-clear (boss never killed before): clear FX -> Ego dialogue
        //   (freeze) -> Trapdoor spawn. 진입(2026-05-02) 의 Trapdoor 는
        //   Rustborn 보스 처치 후 생성된다.
        const wasOnboarding = this.isFirstBossOnboarding();
        if (wasOnboarding) {
          this.egoUnlockedEvents.add(EGO_EVENT.BOSS_KILLED);
          setTimeout(async () => {
            await this.loreDisplay?.showDialogue(EGO_BOSS_KILLED, true);
            spawnTrapdoorEntity();
          }, 2500);
        } else {
          // Non-onboarding: ego dialogue 없이 cinematic (BOSS DEFEATED
          // 2.2초) 후 trapdoor spawn 한다.
          setTimeout(() => {
            spawnTrapdoorEntity();
          }, 2500);
        }
        break;
      }
    }

    // DEC-039 — A: 플레이어가 stratum 경계를 넘으면 down exit
    // 로 다음 stratum 으로 전환한다.

    // DEC-039 — A: 플레이어 좌표를 totalGrid 범위로 clamp.
    const totalCols = this.unifiedGrid.totalWidth;
    const totalRows = this.unifiedGrid.totalHeight;
    const playerRoomCol = Math.max(0, Math.min(totalCols - 1, Math.floor(this.player.x / IW_ROOM_W_PX)));
    const playerAbsRow = Math.max(0, Math.min(totalRows - 1, Math.floor(this.player.y / IW_ROOM_H_PX)));
    const roomKey = `${playerRoomCol},${playerAbsRow}`;

    // 현재 방을 플레이어 실제 셀과 동기화한다. spawn-once 게이트와 분리 — 작은
    // 그리드(프롤로그 4방)는 이웃 전부가 pre-spawn 되므로, 갱신을 아래 spawn
    // 블록에만 의존하면 currentCol/Row 가 진입 셀에 고정되어 isFinalEndRoom(보스
    // 최종방 판정)·미니맵 추적이 깨진다.
    if ((playerRoomCol !== this.currentCol || playerAbsRow !== this.currentRow)
        && this.unifiedGrid.cells[playerAbsRow]?.[playerRoomCol]) {
      this.currentCol = playerRoomCol;
      this.currentRow = playerAbsRow;
      const syncedCell = this.unifiedGrid.cells[playerAbsRow][playerRoomCol];
      if (syncedCell && !syncedCell.visited) {
        syncedCell.visited = true;
        this.persistRoomState();
      }
    }

    // DEC-039 — A: stratum 전환 시 토스트로 알리고
    // stratumIndex 갱신 + DEPTH 표시 + progress 저장.
    // spawn-once 가드로 중복 spawn 을 막는다.
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
        // (2026-05-04): progress 가 갱신되면 stratum
        // picker 의 deepestUnlocked 선택 범위가 늘어난다.
        // stratum 1 plaza 로의 hole 진행을 막지 않는다.
        this.persistRoomState();
      }
    }

    // Spawn enemies in this room if not yet spawned (first-ever visit)
    if (!this.roomSpawnState.hasSpawned(roomKey)) {
      this.roomSpawnState.markSpawned(roomKey);
      this.currentCol = playerRoomCol;
      this.currentRow = playerAbsRow;
      const enteredCell = this.getCurrentCell();
      if (enteredCell) {
        enteredCell.visited = true;
        this.persistRoomState();
      }
      this.spawnEnemiesInRoom(this.currentCol, this.currentRow);

      // ----- Ego T05: first monster visible (fire on first room with enemies) -----
      if (this.enemyRegistry.hasAny()) {
        this.fireEgoMonsterVisible();
      }
    }

    // Pre-spawn neighbors whenever player enters a DIFFERENT room.
    if (this.roomSpawnState.shouldPreSpawnNeighbors(roomKey)) {
      this.neighborPreSpawnRuntime.preSpawn(playerRoomCol, playerAbsRow);
    }

    // HUD, damage numbers, toast & Sakurai effects
    this.hud.updateHP(this.player.hp, this.player.maxHp);
    this.hud.updateFlask(this.player.flaskCharges, this.player.flaskMaxCharges);
    this.hud.updateATK(this.player.atk);
    this.hud.setBurnStatus(this.player.burnRemainingMs ?? 0, MAGMA_BURN_DURATION_MS);
    this.oxygenOverlay.update(this.player);
    this.hud.setEgoShards(this.player.egoShardCount, 3, this.player.activeEnchant);
    // Boss HP bar — 다음 2 조건일 때 표시한다.
    //  1) FSM 상태가 idle/death 가 아님
    //  2) hp < maxHp 또는 superArmor 중. FSM 의 hit 상태에서도 표시한다.
    //     보스 데미지 시 표시한다.
    this.bossHpRuntime.update();
    this.hud.update(dt);
    this.hudRuntime.updateText();
    this.dmgNumbers.update(dt);
    this.hitSparks.update(dt);
    this.propShatter.update(dt);
    this.deathParticles.update(dt);
    this.captureOrbRuntime.update(dt);
    this.stratumClearPanelRuntime.updateInput();
    this.screenFlash.update(dt);

    // Movement VFX (consume player one-shot events + trail updates)
    this.updateMovementVfx(dt);

    // DEC-039 — A: 카메라를 totalGrid 범위로 clamp.
    this.cameraRuntime.update(dt);
  }

  private updateMovementVfx(dt: number): void {
    this.movementVfxRuntime.update(dt);

    this.containerPhysicsRuntime.update(dt);
    this.egoShardProjectileRuntime.update(dt);
    this.waterBubbles.update(dt);
    this.dropThroughDust.update(dt);
    this.iceSkidStreak.update(dt);
    this.itemPickupGlow.update(dt);
    const hpRatio = this.player.maxHp > 0 ? this.player.hp / this.player.maxHp : 0;
    this.lowHpVignette.update(dt, hpRatio);
  }

  // ---------------------------------------------------------------------------
  // Stratum picker ? choose starting stratum on re-entry (after first clear)
  // ---------------------------------------------------------------------------


  private jumpToStratum(stratumIndex: number): void {
    if (stratumIndex === this.currentStratumIndex) return;
    if (stratumIndex < 0 || stratumIndex >= this.strataConfig.strata.length) return;

    const stratumStart = this.unifiedGrid.stratumStartRooms?.[stratumIndex];
    const offset = this.unifiedGrid.strataOffsets[stratumIndex];
    if (!offset) return;
    const startRow = stratumStart?.absoluteRow ?? offset.rowOffset;
    const startCol = stratumStart?.col ?? 0;

    // 적/Trapdoor 등을 정리한다 (Trapdoor 는 보스 처치 후 Plaza 진입 시 정리).
    this.clearEnemies();

    const prevStratum = this.currentStratumIndex;
    this.currentStratumIndex = stratumIndex;
    this.currentStratumDef = this.strataConfig.strata[stratumIndex];
    this.currentCol = startCol;
    this.currentRow = startRow;
    this.roomSpawnState.resetNeighborPreSpawn();

    // Progress 갱신 (deepest / last safe).
    if (stratumIndex > prevStratum) {
      if (this.progress.deepestUnlocked < stratumIndex) {
        this.progress.deepestUnlocked = stratumIndex;
      }
      this.progress.lastSafeStratum = stratumIndex;
      this.persistRoomState();
    }

    // 새 stratum 진입 시 Trapdoor spawn 관련 flag 를 초기화한다.
    this.trapdoorState.resetForStratum();

    const spawn = this.playerSpawnRuntime.resolveForRoom(
      stratumIndex,
      startCol,
      startRow,
    );
    this.player.x = spawn.x;
    this.player.y = spawn.y;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.savePrevPosition();
    this.game.camera.snap(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2);
    this.hudRuntime.showGameplayHud();

    // Plaza 연출(Gatekeeper + ambient) 의 spawn 을 jumpToStratum 에서 plaza
    // 진입 시 보장하는 fix (2026-05-04). 새 stratum 진입 시
    // spawnedRooms 트리거를 보장한다.
    const hubKey = `${startCol},${startRow}`;
    if (!this.roomSpawnState.hasSpawned(hubKey)) {
      this.roomSpawnState.markSpawned(hubKey);
      this.spawnEnemiesInRoom(startCol, startRow);
    }

    // Stratum 2+ 진입 시 DEPTH 토스트 (ULTRAKILL 스타일).
    if (stratumIndex > 0) {
      const totalStrata = this.strataConfig.strata.length;
      this.toast.show(t('toast.depth', { n: stratumIndex + 1, total: totalStrata }), 0xff4488);
    }
  }

  /**
   * 월드-스페이스 prompt 를 숨긴다.
   * modal (bossChoice / stratumClearPanel / escapeConfirm / post_clear_hold) 중이거나
   * 전환 중에는 update 가 early-return 하므로 prompt 를 숨긴다.
   * 그렇지 않으면 prompt 가 visible=true 인 채로 남는다.
   * 매 update 마다 호출한다.
   */
  private hideWorldPrompts(): void {
    this.uiController.hideWorldPrompts({
      exitPrompt: null,
    });
    this.trapdoorRuntime.hidePrompt();
    this.itemWorldAnvilRuntime.hidePrompt();
  }

  /** 월드-스페이스 prompt 를 숨겨야 하는지 (modal/전환 상태 기준) 판정한다. */
  private shouldSuppressWorldPrompts(): boolean {
    return this.uiController.shouldSuppressWorldPrompts({
      hasStratumClearPanel: this.uiController.hasStratumClearPanel(),
      transitionState: this.roomTransitionRuntime.isActive
        ? this.roomTransitionRuntime.suppressionState
        : this.absorbDissolveRuntime.isActive
          ? this.absorbDissolveRuntime.suppressionState
          : this.flowState.value,
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

    // EXP 등 누적값을 처리한다.
    // tick 후 timer 를 정리한다 (P0).
    this.dmgNumbers?.clear();

    this.stratumClearRuntime.showOverlay(isFinal, hasNextStratum);
  }

  /** A6: show "+X% DMG (before -> after)" when a stratum completes. Silent when atk did not change. */
  private _showA6DmgToast(beforeAtk: number, afterAtk: number): void {
    if (afterAtk <= beforeAtk || beforeAtk <= 0) return;
    const pct = Math.round(((afterAtk - beforeAtk) / beforeAtk) * 100);
    if (pct <= 0) return;
    this.toast.show(t('toast.damage_increase', { pct, before: beforeAtk, after: afterAtk }), 0xffcc44);
  }

  /**
   * Player 가 StratumClearOverlay 에서 Continue 를 선택했을 때 (DEC-039 — D).
   * 다음 plaza 로 하강하고 jumpToStratum 한다.
   * jumpToStratum 한다.
   *
   * pendingTrapX/Y 는 startTrapdoorDescent 에서 stash 한다.
   * currentStratumIndex / player 위치를 plaza 로 갱신하고 update() 에서
   * 다음 stratum 으로 진행 + DEPTH 표시.
   */
  private _continueToNextStratum(): void {
    // HUD 표시 (overlay 정리 후).
    this.hudRuntime.showGameplayHud();
    this.flowState.reset();

    this.trapdoorDescentRuntime.punchBossFloorHole({
      fullGrid: this.fullGrid,
      trapdoorX: this.trapdoorState.pendingDescentSnapshot.trapdoorX,
      trapdoorY: this.trapdoorState.pendingDescentSnapshot.trapdoorY,
      bossCellRow: this.trapdoorState.pendingDescentSnapshot.bossCellRow,
      aggregates: {
        wall: this.wallAggregate,
        shadow: this.shadowAggregate,
        naturalDeco: this.decoAggregate,
        artificialDeco: this.artificialDecoAggregate,
        structure: this.structAggregate,
        background: this.bgAggregate,
        seal: this.sealAggregate,
      },
    });

    // 클리어 연출.
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
      itemName: getDisplayName(this.item),
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
      this.stratumClearPanelRuntime.forceClose();
    }
    // Hide boss choice if showing
    if (this.bossChoiceRuntime.isVisible()) {
      this.bossChoiceRuntime.hide();
    }
    // Hide escape confirm if showing
    if (this.escapeRuntime.isVisible()) {
      this.escapeRuntime.hide();
    }
  }

  private startExitFade(): void {
    this.flowState.startExitFade();
    this.exitFadeRuntime.start();
  }

  private startAbsorbSequence(): void {
    this.absorbDissolveRuntime.start();
  }

  /**
   * Hold on the StratumClearPanel until the player presses X to confirm,
   * then kick off the exit fade.
   */
  private startPostClearHold(): void {
    this.flowState.startPostClearHold();
  }

  private exitItemWorld(): void {
    this.cleanupForExit();
    this.onComplete?.();
  }

  /** 프롤로그 종료 — 앵빌 복귀 대신 Ch.1(Start_Room_01)로 전환. */
  private exitItemWorldToPrologueEnd(): void {
    this.cleanupForExit();
    this.onPrologueEnd?.();
  }

  private cleanupForExit(): void {
    // Analytics: guard against double-fire (death path tracks exit earlier)
    if (this.exitTelemetryState.tryMarkExitTracked()) {
      trackItemWorldExit(this.progressController.getExitReason(), this.currentStratumIndex);
    }

    this.sourcePlayer.hp = this.player.hp;

    this.escapeRuntime.hide();
    this.absorbDissolveRuntime.cleanup(true);
    // Clean up all UI owned by this scene
    this.hud.hideDepthGauge();
    this.hud.hideItemExp();
    if (this.hud.container.parent) this.hud.container.parent.removeChild(this.hud.container);
    // Remove any lingering damage numbers / prompts from uiContainer
    // (keep only persistent items ? world scene re-adds its own in enter())
    this.game.uiContainer.removeChildren();
  }

  private placePlayerForRoomTransition(col: number, row: number): void {
    const spawn = this.playerSpawnRuntime.resolveFloorSpawn(col, row);
    this.player.x = spawn.x;
    this.player.y = spawn.y;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.savePrevPosition();
  }

  private updateTransition(dt: number): void {
    if (this.flowState.isExitFade) {
      if (this.exitFadeRuntime.update(dt)) {
        this.flowState.reset();
        this.exitItemWorld();
      }
    } else if (this.flowState.isPostClearHold) {
      this.stratumClearRuntime.updateHold(dt);
    }
  }

  // ---------------------------------------------------------------------------
  // DEC-039 Trapdoor — 보스 처치 후 다음 지층 하강 출구.
  // ---------------------------------------------------------------------------

  /**
   * Trapdoor 상호작용으로 하강을 시작한다.
   *
   * StratumClearOverlay (지층 클리어) 를 두 경우로 분기한다.
   *   - 중간 지층(descentToWorld=false): isFinal=false, hasNextStratum=true.
   *     Continue 시 _continueToNextStratum 으로 다음 지층 하강 +
   *     다음 plaza 로 진행한다.
   *   - 최종 지층(descentToWorld=true): isFinal=true, hasNextStratum=false.
   *     Continue 가 곧 Exit. Exit 선택 시 startExitFade 한다.
   *
   * Continue 시 hole 좌표(tdX/Y) 로 overlay 를 정리하고
   * trapdoor entity 를 dispose 한다. pendingTrapX/Y 는 stash.
   */
  private startTrapdoorDescent(): void {
    if (!this.trapdoor) return;
    const td = this.trapdoor;
    this.trapdoorState.captureDescentFromTrapdoor(td, IW_ROOM_H_PX);

    // Final FloatingItemDrop is the singularity target; keep it alive through
    // the whole pull-in so the world visibly collapses into the weapon.
    if (!this.trapdoorState.descentToWorld) {
      this.disposeTrapdoor();
    } else {
      this.trapdoorRuntime.hidePrompt();
    }
    this.dmgNumbers?.clear();
    this.toast.clear();
    this.hideWorldPrompts();
    this.hud.container.visible = false;
    this.hud.hideBossHP();
    this.hud.hideDepthGauge();
    this.hud.hideItemExp();

    // 최종 지층이면 markItemCleared / progress / exitReason 을 처리한다.
    if (this.trapdoorState.descentToWorld) {
      this.progressController.setExitReason('clear');
      markItemCleared(this.item);
      this.persistRoomState();
      // Step 2 (2026-05-25): 흡수 연출 grayscale 100% + intensity 0.5,
      // 1000ms tween. 이후 startExitFade 한다 (update 에서 진행).
      this.startAbsorbSequence();
      return;
    }

    this.stratumClearRuntime.showOverlay(this.trapdoorState.descentToWorld, !this.trapdoorState.descentToWorld);
  }

  /**
   * cell culling (2026-05-04 — Ancient 24 FPS 대응).
   * viewport + 1 cell buffer 안의 cell 만 visible=true, 나머지는 false.
   * PIXI 자체 culling/filter 와 함께 cell 단위 visible 을 제어한다.
   *
   * aggregate 의 filterArea 를 viewport 로 제한한다 (50->60 FPS 대응,
   * 2026-05-04). filter 없음 = filterArea 도 없음. unifiedGrid
   * 기준으로 viewport 안의 cell 만 처리한다.
   */
  private updateCellVisibility(): void {
    this.cellVisualRuntime.updateVisibility({
      camera: this.game.camera,
      viewportWidth: GAME_WIDTH,
      viewportHeight: GAME_HEIGHT,
      spawnForCell: (col, row) => this.runtimeCellSpawner.spawnForCell(col, row),
      onWindowChanged: () => {
        if (this.fluidSystemReady) {
          this.fluidSystem.refreshFromGrid(this.fullGrid, this.tileHazardRuntime.getActiveTileBounds());
        }
      },
    });
  }

  /** Trapdoor entity + KeyPrompt UI 를 정리한다 (uiContainer 에서 제거). */
  private disposeTrapdoor(): void {
    this.trapdoorRuntime.hidePrompt();
    if (!this.trapdoor) return;
    this.trapdoor.destroy();
    this.trapdoor = null;
  }

  render(alpha: number): void {
    if (!this.initialized) return;
    this.player.render(alpha);
    this.enemyRegistry.render(alpha);
    const cam = this.game.camera;
    this.parallaxBG.updateScroll(cam.renderX, cam.renderY);
    const p = this.player;
    const colOffX = (p.width - p.collisionW) / 2;
    const colOffY = p.height - p.collisionH;
    this.collisionDebug.update(this.roomData, cam, {
      x: p.x + colOffX, y: p.y + colOffY, w: p.collisionW, h: p.collisionH,
      grounded: p.isGrounded(), source: p.groundSource, detail: p.groundSourceDetail,
    });
  }

  exit(): void {
    if (this._gpUnsub) { this._gpUnsub(); this._gpUnsub = null; }
    if (this.parallaxBG) this.parallaxBG.container.visible = false;
    this.toast.clear();
    this.uiController.destroy();
    this.containerCarryRuntime.destroy();
    if (this.collisionDebug) this.collisionDebug.hud.visible = false;
    this.entryCorridorState.reset();
    this.entryCorridorVisibilityRuntime.clearColorRestore();
    this.entryCorridorVisibilityRuntime.restoreWorld(false);
    this.entryCorridorVisualRuntime.destroy();
    if (this.parallaxBG) this.parallaxBG.container.visible = false;
    this.absorbDissolveRuntime.cleanup(true);
    this.trapdoorRuntime.destroy();
    this.itemWorldAnvilRuntime.clear();
    this.captureOrbRuntime.clear();
    this.clearStaticEntities();
    if (this.loreDisplay) {
      this.loreDisplay.close();
      if (this.loreDisplay.container.parent) {
        this.loreDisplay.container.parent.removeChild(this.loreDisplay.container);
      }
      this.loreDisplay = null;
    }
    if (this.hud?.container.parent) this.hud.container.parent.removeChild(this.hud.container);
    if (this.areaTitle?.container.parent) this.areaTitle.container.parent.removeChild(this.areaTitle.container);
    this.areaTitle?.destroy();
    if (this.screenFlash?.overlay.parent) this.screenFlash.overlay.parent.removeChild(this.screenFlash.overlay);
    // LowHpVignette 는 legacyUIContainer 에 attach 되므로 scene exit 시 직접 destroy.
    // WORLD 복귀 시 vignette 가 남지 않도록 정리한다.
    if (this.lowHpVignette) {
      this.lowHpVignette.destroy();
    }
    if (this.tutorialHint) {
      this.tutorialHint.destroy();
    }
    this.devOverlayRuntime.destroy();
    this.weatherRuntime.destroy();
    this.stratumPickerRuntime.destroy();
  }

  override destroy(): void {
    this.entryCorridorVisibilityRuntime.clearColorRestore();
    this.entryCorridorVisibilityRuntime.restoreBackgroundFilter();
    this.weatherRuntime.destroy();
    this.oxygenOverlay.destroy();
    this.devOverlayRuntime.destroy();
    this.captureOrbRuntime.clear();
    this.stratumPickerRuntime.destroy();
    this.containerCarryRuntime.destroy();
    this.itemWorldAnvilRuntime.destroy();
    this.parallaxBG?.destroy();
    this.dmgNumbers?.clear();
    // hud 는 game.uiContainer(공유) 라서 super.destroy() 가 처리하므로 여기서는 제외한다.
    this.collisionDebug?.hud.destroy({ children: true });
    super.destroy();
  }

  // ----- Ego dialogue helpers -----

  private isFirstBossOnboarding(): boolean {
    return this.egoDialogueRuntime.isFirstBossOnboarding();
  }

  fireEgoEnter(): void {
    this.egoDialogueRuntime.fireEnter();
  }

  async fireEgoEnterAsync(): Promise<void> {
    await this.egoDialogueRuntime.fireEnterAsync();
  }

  fireEgoMonsterVisible(): void {
    this.egoDialogueRuntime.fireMonsterVisible();
  }

  fireEgoFirstKill(): void {
    this.egoDialogueRuntime.fireFirstKill();
  }

  fireEgoRoomClear(roomIndex: number): void {
    this.egoDialogueRuntime.fireRoomClear(roomIndex);
  }

  fireEgoInnocentFound(): void {
    this.egoDialogueRuntime.fireInnocentFound();
  }

  fireEgoInnocentStable(): void {
    this.egoDialogueRuntime.fireInnocentStable();
  }

  fireEgoPlayerDeath(): void {
    this.egoDialogueRuntime.firePlayerDeath();
  }

  fireEgoBossKilled(): void {
    this.egoDialogueRuntime.fireBossKilled();
  }

  fireEgoAffinityMax(): void {
    this.egoDialogueRuntime.fireAffinityMax();
  }
}
