import { Container, BitmapText, type Graphics, type Texture } from 'pixi.js';
import { Scene } from '@core/Scene';
import { Debug } from '@core/Debug';
import { CameraZoneRuntime, type CameraZone } from '@core/CameraZoneRuntime';
import type { TilemapRenderer } from '@level/TilemapRenderer';
import { VISUAL_BOUNDS_BLEED_PX } from '@level/VisualBoundsBleed';
import { type UnifiedGridData } from '@level/RoomGrid';
import type { RoomGraphData } from '@level/RoomGraph';
import type { CollisionDebugOverlay } from '@level/CollisionDebugOverlay';
import type { LdtkRenderer } from '@level/LdtkRenderer';
import { type LdtkEntity, type LdtkLevel } from '@level/LdtkLoader';
import { Texture as PixiTexture, Rectangle } from 'pixi.js';
import { isInUpdraft, TILE_AIR, TILE_WALL, TILE_OIL, TILE_MAGMA, TILE_WATER, TILE_METAL, TILE_ACID } from '@core/Physics';
import { TileMutator } from '@systems/TileMutator';
import type { TileMutatorRenderer } from '@systems/TileMutatorRenderer';
import { MAGMA_BURN_DURATION_MS } from '@systems/TileHazards';
import { GameAction } from '@core/InputManager';
import type { Player } from '@entities/Player';
import type { ThrowableContainer } from '@entities/ThrowableContainer';
import { loadSpawnTable } from '@data/itemWorldSpawnTable';
import { getEnemyStats } from '@data/enemyStats';
import type { LoreDisplay } from '@ui/LoreDisplay';
import { t } from '@i18n';
import {
  EGO_TRAPDOOR_THANKS,
  EGO_BOSS_KILLED,
  EGO_EVENT,
} from '@data/EgoDialogue';
import { Trapdoor } from '@entities/Trapdoor';
import { FloatingItemDrop } from '@entities/FloatingItemDrop';
import { HitManager } from '@combat/HitManager';
import type { HUD } from '@ui/HUD';
import type { AreaTitle } from '@ui/AreaTitle';
import { UISkin } from '@ui/UISkin';
import { KeyPrompt } from '@ui/KeyPrompt';
import { PIXEL_FONT } from '@ui/fonts';
import type { DamageNumberManager } from '@ui/DamageNumber';
import type { ToastManager } from '@ui/Toast';
import { OxygenOverlay } from '@ui/OxygenOverlay';
import { BossHpRuntime } from '@ui/BossHpRuntime';
import type { TutorialHint } from '@ui/TutorialHint';
import type { LowHpHealHintRuntime } from '@ui/LowHpHealHintRuntime';
import { SFX } from '@audio/Sfx';
import { BgmController } from '@audio/BgmController';
import { PRNG } from '@utils/PRNG';
import { getOrCreateWorldProgress, markItemCleared, getDisplayName, type ItemInstance, type ItemWorldProgress } from '@items/ItemInstance';
import {
  sacredSave,
  isLowHpHealToastFired,
  markLowHpHealToastFired,
} from '@save/PlayerSave';
import type { ItemWorldSceneSaveAccess } from '@scenes/shared/SceneSaveAccess';
import type { Inventory } from '@items/Inventory';
import { type StrataConfig, type StratumDef } from '@data/StrataConfig';
import type { ArcTether } from '@effects/ArcTether';
import type { HitSparkManager } from '@effects/HitSpark';
import type { PropShatterManager } from '@effects/PropShatter';
import type { DeathParticleManager } from '@effects/DeathParticles';
import type { LandingDustManager } from '@effects/LandingDust';
import type { DashAfterimageManager } from '@effects/DashAfterimage';
import type { DashBoostPuffManager } from '@effects/DashBoostPuff';
import type { DoubleJumpRingManager } from '@effects/DoubleJumpRing';
import type { WallJumpDustManager } from '@effects/WallJumpDust';
import type { JumpTakeoffPuffManager } from '@effects/JumpTakeoffPuff';
import type { WallSlideDustManager } from '@effects/WallSlideDust';
import type { FootstepPuffManager } from '@effects/FootstepPuff';
import type { FlaskHealBurstManager } from '@effects/FlaskHealBurst';
import type { SurgeVfxManager } from '@effects/SurgeVfx';
import type { CriticalHighlightManager } from '@effects/CriticalHighlight';
import type { HitBloodSprayManager } from '@effects/HitBloodSpray';
import type { DiveLandImpactManager } from '@effects/DiveLandImpact';
import type { WaterSplashManager } from '@effects/WaterSplash';
import type { WaterBubblesManager } from '@effects/WaterBubbles';
import { PUFF_TINT_TOXIC, PUFF_TINT_PLASMA, type SteamPuffManager } from '@effects/SteamPuff';
import type { AshRemnantManager } from '@effects/AshRemnant';
import { GrassClumpFireSystem } from '@effects/GrassClumpFire';
import type { FluidResidueManager } from '@effects/FluidResidue';
import type { FluidSystem } from '@effects/FluidSystem';
import type { FluidSpawnerManager } from '@systems/FluidSpawner';
import type { FluidCrestFoamManager } from '@effects/FluidCrestFoam';
import { EgoShardRuntime } from '@effects/EgoShardRuntime';
import type { DropThroughDustManager } from '@effects/DropThroughDust';
import type { IceSkidStreakManager } from '@effects/IceSkidStreak';
import type { ItemPickupGlowManager } from '@effects/ItemPickupGlow';
import type { LowHpVignetteManager } from '@effects/LowHpVignette';
import type { ScreenFlash } from '@effects/ScreenFlash';
import type { PaletteSwapFilter } from '@effects/PaletteSwapFilter';
import { GAME_WIDTH, GAME_HEIGHT, type Game } from '../Game';
import {
  trackItemWorldEnter,
  trackItemWorldExit,
} from '@utils/Analytics';
import type { UpdraftSystem } from '@systems/UpdraftSystem';
import type { ParallaxBackground } from '@level/ParallaxBackground';
import { ItemWorldConst } from '@data/constData';
import type { ItemWorldUiController } from './itemworld/ItemWorldUiController';
import type { ItemWorldProgressController } from './itemworld/ItemWorldProgressController';
import { bindPlayerCollisionGrid } from './shared/PlayerPlacementHelpers';
import { FluidReactionRuntime } from './shared/FluidReactionRuntime';
import { detachDisplayObject } from './shared/DisplayObjectLifecycleHelpers';
import { ItemWorldRoomTransitionRuntime } from './itemworld/ItemWorldRoomTransitionRuntime';
import { ItemWorldAbsorbDissolveRuntime } from './itemworld/ItemWorldAbsorbDissolveRuntime';
import { ItemWorldEntryCorridorRuntime, ENTRY_CORRIDOR_LEVEL_ID } from './itemworld/ItemWorldEntryCorridorRuntime';
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
import { ItemWorldBossClearRuntime } from './itemworld/ItemWorldBossClearRuntime';
import { ItemWorldBossDefeatRuntime } from './itemworld/ItemWorldBossDefeatRuntime';
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
import { ItemWorldFullMapLayerRuntime, type ItemWorldFullMapLayerSet } from './itemworld/ItemWorldFullMapLayerRuntime';
import { ItemWorldFullMapLayerBindingRuntime } from './itemworld/ItemWorldFullMapLayerBindingRuntime';
import { ItemWorldFullMapLayerRebuildRuntime } from './itemworld/ItemWorldFullMapLayerRebuildRuntime';
import { ItemWorldBuildStateRuntime } from './itemworld/ItemWorldBuildStateRuntime';
import { ItemWorldFullMapAttachRuntime } from './itemworld/ItemWorldFullMapAttachRuntime';
import { ItemWorldFullMapRoomApplyRuntime } from './itemworld/ItemWorldFullMapRoomApplyRuntime';
import { ItemWorldFullMapBuildRuntime } from './itemworld/ItemWorldFullMapBuildRuntime';
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
import { ItemWorldRoomProgressionRuntime } from './itemworld/ItemWorldRoomProgressionRuntime';
import { ItemWorldRoomRectRuntime } from './itemworld/ItemWorldRoomRectRuntime';
import { ItemWorldGenerationRuntime } from './itemworld/ItemWorldGenerationRuntime';
import { ItemWorldDebugMapRefreshRuntime } from './itemworld/ItemWorldDebugMapRefreshRuntime';
import { ItemWorldDebugMapStateRuntime } from './itemworld/ItemWorldDebugMapStateRuntime';
import { ItemWorldStratumJumpRuntime } from './itemworld/ItemWorldStratumJumpRuntime';
import { ItemWorldStratumJumpStateRuntime } from './itemworld/ItemWorldStratumJumpStateRuntime';
import { ItemWorldStratumContinueRuntime } from './itemworld/ItemWorldStratumContinueRuntime';
import { ItemWorldExitAfterBossRuntime } from './itemworld/ItemWorldExitAfterBossRuntime';
import { ItemWorldReturnResultCleanupRuntime } from './itemworld/ItemWorldReturnResultCleanupRuntime';
import { ItemWorldExitCleanupRuntime } from './itemworld/ItemWorldExitCleanupRuntime';
import { ItemWorldPrologueDeathRestartRuntime } from './itemworld/ItemWorldPrologueDeathRestartRuntime';
import { resetPrologueItemWorldRunProgress as resetPrologueRunProgress } from './itemworld/ItemWorldPrologueRunProgressReset';
import { ItemWorldFinalExitRuntime } from './itemworld/ItemWorldFinalExitRuntime';
import { ItemWorldTrapdoorActivationRuntime } from './itemworld/ItemWorldTrapdoorActivationRuntime';
import { ItemWorldTransitionUpdateRuntime } from './itemworld/ItemWorldTransitionUpdateRuntime';
import { ItemWorldEntityCleanupRuntime } from './itemworld/ItemWorldEntityCleanupRuntime';
import { ItemWorldDeathRuntime } from './itemworld/ItemWorldDeathRuntime';
import { ItemWorldInitialBuildRuntime } from './itemworld/ItemWorldInitialBuildRuntime';
import { ItemWorldGameplayStartRuntime } from './itemworld/ItemWorldGameplayStartRuntime';
import { ItemWorldLifecycleCleanupRuntime } from './itemworld/ItemWorldLifecycleCleanupRuntime';
import { ItemWorldDebugRenderRuntime } from './itemworld/ItemWorldDebugRenderRuntime';
import { ItemWorldCellVisibilityRuntime } from './itemworld/ItemWorldCellVisibilityRuntime';
import { showItemWorldDamageIncreaseToast } from './itemworld/ItemWorldDamageIncreaseToast';
import { ItemWorldPromptRuntime } from './itemworld/ItemWorldPromptRuntime';
import { ItemWorldRoomQueryRuntime } from './itemworld/ItemWorldRoomQueryRuntime';
import { ItemWorldFrameEffectsRuntime } from './itemworld/ItemWorldFrameEffectsRuntime';
import { ItemWorldPausedFrameRuntime } from './itemworld/ItemWorldPausedFrameRuntime';
import { ItemWorldBlockingTransitionRuntime } from './itemworld/ItemWorldBlockingTransitionRuntime';
import { ItemWorldPresentationFrameRuntime } from './itemworld/ItemWorldPresentationFrameRuntime';
import { ItemWorldGameplaySimulationRuntime } from './itemworld/ItemWorldGameplaySimulationRuntime';
import { ItemWorldModalGateRuntime } from './itemworld/ItemWorldModalGateRuntime';
import { ItemWorldAmbientFrameRuntime } from './itemworld/ItemWorldAmbientFrameRuntime';
import { setupItemWorldRenderLayers } from './itemworld/ItemWorldRenderLayerSetup';
import { createItemWorldPlayerEntity } from './itemworld/ItemWorldPlayerEntitySetup';
import { setupItemWorldUiBootstrap } from './itemworld/ItemWorldUiBootstrapSetup';
import { setupItemWorldScreenOverlays } from './itemworld/ItemWorldScreenOverlaySetup';
import { bootstrapItemWorldAssets, type ItemWorldAssetBootstrapResult } from './itemworld/ItemWorldAssetBootstrap';
import { createItemWorldFeedbackContext, type ItemWorldFeedbackContext } from './itemworld/ItemWorldFeedbackContext';
import { createRestartedPrologueItemWorldScene as createRestartedPrologueItemWorldSceneInstance } from './itemworld/ItemWorldSceneRestartFactory';
import { selectInitialItemWorldRoom } from './itemworld/ItemWorldInitialRoomSelection';
import { initializeItemWorldRunEntryState } from './itemworld/ItemWorldRunEntryState';
import { createItemWorldVfxManagers } from './itemworld/ItemWorldVfxManagersSetup';
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
  TILE_SIZE as IW_TILE_SIZE,
  IW_GRID_W, IW_GRID_H,
  IW_ROOM_W_TILES, IW_ROOM_H_TILES,
  IW_ROOM_W_PX, IW_ROOM_H_PX,
  IW_DOOR_FLOOR_ROW,
} from './itemworld/ItemWorldMapController';
import type { ItemWorldSpawnController } from './itemworld/ItemWorldSpawnController';

const TILE_SIZE = IW_TILE_SIZE;
const FADE_DURATION = 200;
// SSoT: Sheets/Content_ConstData.csv (ItemWorld.Entry.*, ItemWorld.Exp.*)
const ENTRY_FREEZE_MS = ItemWorldConst.EntryFreezeMs;
const BASE_EXP_PER_KILL = ItemWorldConst.BaseExpPerKill;

interface ItemWorldSceneOptions {
  entryCorridor?: boolean;
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
  private player!: Player;
  private readonly enemyRegistry = new ItemWorldEnemyRegistry();
  /**
   * 월드-스페이스 layer 는 fullMapContainer(grid) 와
   * entityLayer(player/vfx) 로 나뉘다. grid 보다 위, entityLayer 보다 아래의 z 순서를 가진다.
   * (Residents 는 grid 위에 깔린다.)
   */
  private residentsLayer!: Container;
  /** Building layer ? entityLayer 아래의 platform/wall 타일 컨테이너. */
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
  private fullMapLayerBindingRuntime!: ItemWorldFullMapLayerBindingRuntime;
  private fullMapLayerRebuildRuntime!: ItemWorldFullMapLayerRebuildRuntime;
  private buildStateRuntime!: ItemWorldBuildStateRuntime;
  private fullMapAttachRuntime!: ItemWorldFullMapAttachRuntime;
  private fullMapRoomApplyRuntime!: ItemWorldFullMapRoomApplyRuntime;
  private fullMapBuildRuntime!: ItemWorldFullMapBuildRuntime;
  private boundaryVisualRuntime!: ItemWorldBoundaryVisualRuntime;
  private roomStateRuntime!: ItemWorldRoomStateRuntime;
  private proceduralDecorRuntime!: ItemWorldProceduralDecorRuntime;
  private playerSpawnRuntime!: ItemWorldPlayerSpawnRuntime;
  private roomTypeRuntime!: ItemWorldRoomTypeRuntime;
  private memoryRoomPlacementRuntime!: ItemWorldMemoryRoomPlacementRuntime;
  private roomRectRuntime!: ItemWorldRoomRectRuntime;
  private neighborPreSpawnRuntime!: ItemWorldNeighborPreSpawnRuntime;
  private roomSpawnRuntime!: ItemWorldRoomSpawnRuntime;
  private roomProgressionRuntime!: ItemWorldRoomProgressionRuntime;
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
   * approach ? KeyPrompt ? ATTACK opens EscapeConfirm (same flow as MENU/ESC).
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
  private bossClearRuntime!: ItemWorldBossClearRuntime;
  private bossDefeatRuntime!: ItemWorldBossDefeatRuntime;
  private exitFadeRuntime!: ItemWorldExitFadeRuntime;
  private stratumJumpRuntime!: ItemWorldStratumJumpRuntime;
  private stratumJumpStateRuntime!: ItemWorldStratumJumpStateRuntime;
  private stratumContinueRuntime!: ItemWorldStratumContinueRuntime;
  private exitAfterBossRuntime!: ItemWorldExitAfterBossRuntime;
  private returnResultCleanupRuntime!: ItemWorldReturnResultCleanupRuntime;
  private exitCleanupRuntime!: ItemWorldExitCleanupRuntime;
  private prologueDeathRestartRuntime!: ItemWorldPrologueDeathRestartRuntime;
  private finalExitRuntime!: ItemWorldFinalExitRuntime;
  private trapdoorActivationRuntime!: ItemWorldTrapdoorActivationRuntime;
  private transitionUpdateRuntime!: ItemWorldTransitionUpdateRuntime;
  private entityCleanupRuntime!: ItemWorldEntityCleanupRuntime;
  private deathRuntime!: ItemWorldDeathRuntime;
  private initialBuildRuntime!: ItemWorldInitialBuildRuntime;
  private gameplayStartRuntime!: ItemWorldGameplayStartRuntime;
  private lifecycleCleanupRuntime!: ItemWorldLifecycleCleanupRuntime;
  private debugRenderRuntime!: ItemWorldDebugRenderRuntime;
  private cellVisibilityRuntime!: ItemWorldCellVisibilityRuntime;
  private promptRuntime!: ItemWorldPromptRuntime;
  private roomQueryRuntime!: ItemWorldRoomQueryRuntime;
  private frameEffectsRuntime!: ItemWorldFrameEffectsRuntime;
  private pausedFrameRuntime!: ItemWorldPausedFrameRuntime;
  private blockingTransitionRuntime!: ItemWorldBlockingTransitionRuntime;
  private presentationFrameRuntime!: ItemWorldPresentationFrameRuntime;
  private gameplaySimulationRuntime!: ItemWorldGameplaySimulationRuntime;
  private modalGateRuntime!: ItemWorldModalGateRuntime;
  private ambientFrameRuntime!: ItemWorldAmbientFrameRuntime;
  // Item being explored
  private item!: ItemInstance;
  private inventory!: Inventory;
  private sourcePlayer!: Player;
  private sceneOptions!: ItemWorldSceneOptions;
  private saveAccess!: ItemWorldSceneSaveAccess;

  // Memory Strata state
  private strataConfig!: StrataConfig;
  private currentStratumIndex = 0;
  private currentStratumDef!: StratumDef;
  private progress!: ItemWorldProgress;
  private readonly stratumStartSnapshot = new ItemWorldStratumStartSnapshot();

  // Unified grid (all strata combined)
  private readonly runStats = new ItemWorldRunStats();
  private readonly generationRuntime = new ItemWorldGenerationRuntime();
  private debugMapRefreshRuntime!: ItemWorldDebugMapRefreshRuntime;
  private debugMapStateRuntime!: ItemWorldDebugMapStateRuntime;
  private unifiedGrid!: UnifiedGridData;
  /** Per-stratum graphs from the adapter ? node.layout.x/y carry grid (col,row). */
  private roomGraphs: RoomGraphData[] = [];
  private devOverlayRuntime!: ItemWorldDevOverlayRuntime;
  private debugInputRuntime!: ItemWorldDebugInputRuntime;
  private debugGenerationSeedOffset = 0;
  private currentCol = 0;
  private currentRow = 0; // absolute row in unified grid
  private roomData: number[][] = [];
  private rng!: PRNG;
  private entryCorridorRuntime!: ItemWorldEntryCorridorRuntime;

  // Full-map rendering (all rooms rendered into one continuous grid)
  private fullGrid: number[][] = [];
  private fullMapContainer: Container | null = null;
  /** Palette-swap filter for background tiles (production default). */
  private bgPaletteFilter!: PaletteSwapFilter;
  /** Palette-swap filter for wall + shadow tiles (dark, cool row). */
  private wallPaletteFilter!: PaletteSwapFilter;
  /** Palette-swap filter for natural decorations (reduced strength). */
  private naturalPaletteFilter!: PaletteSwapFilter;
  /** Palette-swap filter for interior tiles (bg palette, dimmed ? recessed look). */
  private interiorPaletteFilter!: PaletteSwapFilter;
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

  /** Passed from LdtkWorldScene ? shared unlockedEvents for persistence. */
  egoUnlockedEvents: Set<string> = new Set();
  private prologueDeathRestarting = false;

  get earnedGold(): number {
    return this.runStats.earnedGold;
  }

  constructor(
    game: Game,
    item: ItemInstance,
    inventory: Inventory,
    sourcePlayer: Player,
    options: ItemWorldSceneOptions = {},
    saveAccess: ItemWorldSceneSaveAccess = {
      isPrologue: () => sacredSave.getScene() === 'prologue',
      isFirstItemWorldBossDefeated: () => sacredSave.isFirstItemWorldBossDefeated(),
      markFirstItemWorldBossDefeated: () => sacredSave.markFirstItemWorldBossDefeated(),
      isLowHpHealToastFired: () => isLowHpHealToastFired(),
      markLowHpHealToastFired: () => markLowHpHealToastFired(),
    },
  ) {
    super(game);
    this.item = item;
    this.inventory = inventory;
    this.sourcePlayer = sourcePlayer;
    this.sceneOptions = options;
    this.saveAccess = saveAccess;
    this.wireConstructorRuntimes();
  }



  private wireConstructorRuntimes(): void {
    this.wireFrameAndGateRuntimes();
    this.wireDebugMapAndStratumJumpRuntimes();
    this.wireExitFlowRuntimes();
    this.wireLifecycleAndBuildRuntimes();
    this.wireInteractionAndUiFlowRuntimes();
    this.wireBossAndStratumClearRuntimes();
    this.wireStratumAndPanelRuntimes();
    this.wireMemoryCombatAndHazardRuntimes();
    this.wireFullMapBuildRuntimes();
    this.wireRoomStateAndSpawnRuntimes();
    this.wireCellAndStaticEntityRuntimes();
    this.wireEnemyAndHudRuntimes();
  }
  private wireExitFlowRuntimes(): void {
    this.wireStratumContinueRuntime();
    this.wireBossExitAndReturnCleanupRuntimes();
    this.wireDeathRestartAndFinalExitRuntimes();
  }

  private wireStratumContinueRuntime(): void {
    this.stratumContinueRuntime = new ItemWorldStratumContinueRuntime({
      ...this.createStratumContinueFlowDeps(),
      ...this.createStratumContinueTrapdoorDeps(),
      ...this.createStratumContinueHoleDeps(),
      ...this.createStratumContinueFeedbackDeps(),
      ...this.createStratumContinueProgressDeps(),
    });
  }

  private createStratumContinueFlowDeps() {
    return {
      showGameplayHud: () => this.hudRuntime.showGameplayHud(),
      resetFlowState: () => this.flowState.reset(),
    };
  }

  private createStratumContinueTrapdoorDeps() {
    return {
      getTrapdoorDescentRuntime: () => this.trapdoorDescentRuntime,
      getTrapdoorDescentSnapshot: () => this.trapdoorState.pendingDescentSnapshot,
    };
  }

  private createStratumContinueHoleDeps() {
    return {
      getFullGrid: () => this.fullGrid,
      getHoleAggregates: () => ({
        wall: this.wallAggregate,
        shadow: this.shadowAggregate,
        naturalDeco: this.decoAggregate,
        artificialDeco: this.artificialDecoAggregate,
        structure: this.structAggregate,
        background: this.bgAggregate,
        seal: this.sealAggregate,
      }),
    };
  }

  private createStratumContinueFeedbackDeps() {
    return {
      flashScreen: (color: number, alpha: number, durationMs: number) => this.screenFlash.flash(color, alpha, durationMs),
      shakeCamera: (intensity: number) => this.game.camera.shake(intensity),
      setHitstopFrames: (frames: number) => { this.game.hitstopFrames = frames; },
      clearDamageNumbers: () => this.dmgNumbers?.clear(),
      showToast: (message: string, color?: number) => this.toast.show(message, color),
    };
  }

  private createStratumContinueProgressDeps() {
    return {
      getCurrentStratumIndex: () => this.currentStratumIndex,
      getTotalStrata: () => this.strataConfig.strata.length,
    };
  }

  private wireBossExitAndReturnCleanupRuntimes(): void {
    this.exitAfterBossRuntime = new ItemWorldExitAfterBossRuntime({
      ...this.createExitAfterBossProgressDeps(),
      ...this.createExitAfterBossCleanupDeps(),
      ...this.createExitAfterBossFadeDeps(),
    });
    this.returnResultCleanupRuntime = new ItemWorldReturnResultCleanupRuntime({
      ...this.createReturnResultCleanupHudDeps(),
      ...this.createReturnResultCleanupPromptDeps(),
      ...this.createReturnResultCleanupOverlayDeps(),
      ...this.createReturnResultCleanupChoiceDeps(),
    });
  }

  private createExitAfterBossProgressDeps() {
    return {
      setLastSafeStratum: () => { this.progress.lastSafeStratum = this.currentStratumIndex; },
      requestEscapeExit: () => this.progressController.requestExitWithReason('escape'),
      persistRoomState: () => this.persistRoomState(),
    };
  }

  private createExitAfterBossCleanupDeps() {
    return {
      cleanupForReturnResult: () => this.returnResultCleanupRuntime.cleanup(),
    };
  }

  private createExitAfterBossFadeDeps() {
    return {
      startExitFade: () => {
        this.flowState.startExitFade();
        this.exitFadeRuntime.start();
      },
    };
  }

  private createReturnResultCleanupHudDeps() {
    return {
      hideGameplayHud: () => this.hudRuntime.hideForCinematic(),
      clearToast: () => this.toast.clear(),
    };
  }

  private createReturnResultCleanupPromptDeps() {
    return {
      hideWorldPrompts: () => this.promptRuntime.hideWorldPrompts(),
    };
  }

  private createReturnResultCleanupOverlayDeps() {
    return {
      hasStratumClearOverlay: () => this.uiController.hasStratumClearOverlay(),
      destroyStratumClearOverlay: () => this.uiController.destroyStratumClearOverlay(),
    };
  }

  private createReturnResultCleanupChoiceDeps() {
    return {
      isBossChoiceVisible: () => this.uiController.isBossChoiceVisible(),
      hideBossChoice: () => this.uiController.hideBossChoice(),
      isEscapeConfirmVisible: () => this.uiController.isEscapeConfirmVisible(),
      hideEscapeConfirm: () => this.uiController.hideEscapeConfirm(),
    };
  }

  private wireDeathRestartAndFinalExitRuntimes(): void {
    this.exitCleanupRuntime = new ItemWorldExitCleanupRuntime({
      ...this.createExitCleanupTelemetryDeps(),
      ...this.createExitCleanupPlayerDeps(),
      ...this.createExitCleanupUiDeps(),
      ...this.createExitCleanupHudDeps(),
    });
    this.prologueDeathRestartRuntime = new ItemWorldPrologueDeathRestartRuntime({
      ...this.createPrologueDeathRestartCoreDeps(),
      ...this.createPrologueDeathRestartProgressDeps(),
      ...this.createPrologueDeathRestartSceneDeps(),
    });
    this.finalExitRuntime = new ItemWorldFinalExitRuntime({
      ...this.createFinalExitCleanupDeps(),
      ...this.createFinalExitCallbackDeps(),
    });
  }

  private createExitCleanupTelemetryDeps() {
    return {
      trackExitIfNeeded: () => {
        if (this.exitTelemetryState.tryMarkExitTracked()) {
          trackItemWorldExit(this.progressController.getExitReason(), this.currentStratumIndex);
        }
      },
    };
  }

  private createExitCleanupPlayerDeps() {
    return {
      syncSourcePlayerHp: () => { this.sourcePlayer.hp = this.player.hp; },
    };
  }

  private createExitCleanupUiDeps() {
    return {
      hideEscapeConfirm: () => this.uiController.hideEscapeConfirm(),
      cleanupAbsorbDissolve: () => this.absorbDissolveRuntime.cleanup(true),
      clearUiContainer: () => this.game.uiContainer.removeChildren(),
    };
  }

  private createExitCleanupHudDeps() {
    return {
      hideHudDepthGauge: () => this.hud.hideDepthGauge(),
      hideHudItemExp: () => this.hud.hideItemExp(),
      detachHudContainer: () => detachDisplayObject(this.hud.container),
    };
  }

  private createPrologueDeathRestartCoreDeps() {
    return {
      game: this.game,
      isRestarting: () => this.prologueDeathRestarting,
      markRestarting: () => { this.prologueDeathRestarting = true; },
      firePlayerDeathDialogue: () => this.egoDialogueRuntime.firePlayerDeath(),
    };
  }

  private createPrologueDeathRestartProgressDeps() {
    return {
      resetRunProgress: () => resetPrologueRunProgress(getOrCreateWorldProgress(this.item)),
      respawnSourcePlayer: () => this.sourcePlayer.respawn(),
    };
  }

  private createPrologueDeathRestartSceneDeps() {
    return {
      createRestartedScene: () => this.createRestartedPrologueItemWorldScene(),
    };
  }

  private createFinalExitCleanupDeps() {
    return {
      cleanupForExit: () => this.exitCleanupRuntime.cleanup(),
    };
  }

  private createFinalExitCallbackDeps() {
    return {
      onComplete: () => this.onComplete?.(),
      onPrologueEnd: () => this.onPrologueEnd?.(),
    };
  }

  private wireLifecycleAndBuildRuntimes(): void {
    this.wireTrapdoorAndTransitionRuntimes();
    this.wireDeathAndInitialBuildRuntimes();
    this.wireGameplayStartAndCleanupRuntimes();
    this.wireDebugRenderRuntime();
  }

  private wireTrapdoorAndTransitionRuntimes(): void {
    this.trapdoorActivationRuntime = new ItemWorldTrapdoorActivationRuntime({
      getTrapdoor: () => this.trapdoor,
      captureDescentFromTrapdoor: (trapdoor) => this.trapdoorState.captureDescentFromTrapdoor(trapdoor, IW_ROOM_H_PX),
      isDescentToWorld: () => this.trapdoorState.descentToWorld,
      clearTrapdoor: () => { this.trapdoor = null; },
      hideTrapdoorPrompt: () => this.trapdoorRuntime.hidePrompt(),
      clearDamageNumbers: () => this.dmgNumbers?.clear(),
      clearToast: () => this.toast.clear(),
      hideWorldPrompts: () => this.promptRuntime.hideWorldPrompts(),
      hideCinematicHud: () => this.hudRuntime.hideForCinematic(),
      markFinalClear: () => {
        this.progressController.requestExitWithReason('clear');
        markItemCleared(this.item);
        this.persistRoomState();
      },
      startAbsorbDissolve: () => {
        this.hudRuntime.setGameplayHudBlock('absorb', true);
        this.absorbDissolveRuntime.start();
      },
      showStratumClearOverlay: (isFinal, hasNextStratum) => this.stratumClearRuntime.showOverlay(isFinal, hasNextStratum),
    });
    this.transitionUpdateRuntime = new ItemWorldTransitionUpdateRuntime({
      isExitFade: () => this.flowState.isExitFade,
      isPostClearHold: () => this.flowState.isPostClearHold,
      updateExitFade: (dt) => this.exitFadeRuntime.update(dt),
      resetFlowState: () => this.flowState.reset(),
      exitItemWorld: () => this.finalExitRuntime.exitToWorld(),
      updatePostClearHold: (dt) => this.stratumClearRuntime.updateHold(dt),
    });
  }

  private wireDeathAndInitialBuildRuntimes(): void {
    this.wireDeathRuntime();
    this.wireInitialBuildRuntime();
  }

  private wireDeathRuntime(): void {
    this.deathRuntime = new ItemWorldDeathRuntime({
      ...this.createDeathActorDeps(),
      ...this.createDeathPrologueDeps(),
      ...this.createDeathTelemetryDeps(),
      ...this.createDeathUiDeps(),
      ...this.createDeathResultDeps(),
    });
  }

  private createDeathActorDeps() {
    return {
      getPlayer: () => this.player,
    };
  }

  private createDeathPrologueDeps() {
    return {
      isPrologue: () => this.saveAccess.isPrologue(),
      restartPrologueAfterDeath: () => this.prologueDeathRestartRuntime.restart(),
    };
  }

  private createDeathTelemetryDeps() {
    return {
      getCurrentRoomForAnalytics: () => {
        const cell = this.roomStateRuntime.getCurrentCell(this.unifiedGrid, this.currentCol, this.currentRow);
        return { col: cell?.col ?? 0, row: cell?.row ?? 0 };
      },
      requestDeathExit: () => this.progressController.requestExitWithReason('death'),
      getCurrentStratumIndex: () => this.currentStratumIndex,
      markExitTracked: () => this.exitTelemetryState.markExitTracked(),
    };
  }

  private createDeathUiDeps() {
    return {
      firePlayerDeathDialogue: () => this.egoDialogueRuntime.firePlayerDeath(),
      hideBossHp: () => this.hud.hideBossHP(),
      clearUiContainer: () => this.game.uiContainer.removeChildren(),
      addHudContainer: () => this.game.uiContainer.addChild(this.hud.container),
    };
  }

  private createDeathResultDeps() {
    return {
      getRunStats: () => this.runStats,
      getProgress: () => this.progress,
      persistRoomState: () => this.persistRoomState(),
      cleanupForReturnResult: () => this.returnResultCleanupRuntime.cleanup(),
      getItem: () => this.item,
      getStratumStartSnapshot: () => this.stratumStartSnapshot,
      getEnemiesDefeated: () => this.enemyRegistry.defeatedCount(),
      getTotalStrata: () => this.strataConfig.strata.length,
      showReturnResult: (result: any, onDismiss: any) => this.uiController.showReturnResult(result, onDismiss),
      exitItemWorld: () => this.finalExitRuntime.exitToWorld(),
    };
  }

  private wireInitialBuildRuntime(): void {
    this.initialBuildRuntime = new ItemWorldInitialBuildRuntime({
      ...this.createInitialBuildRunStateDeps(),
      ...this.createInitialBuildEnvironmentDeps(),
      ...this.createInitialBuildPresentationDeps(),
    });
  }

  private createInitialBuildRunStateDeps() {
    return {
      restoreRoomState: () => this.restoreRoomState(),
      setRoomsCleared: (amount: number) => this.runStats.setRoomsCleared(amount),
      countTotalRooms: () => this.roomStateRuntime.countTotalRooms(this.unifiedGrid),
      setTotalRooms: (amount: number) => this.runStats.setTotalRooms(amount),
    };
  }

  private createInitialBuildEnvironmentDeps() {
    return {
      clearFluidSpawners: () => this.fluidSpawners.clear(),
      clearFluidCrestFoam: () => this.fluidCrestFoam?.clear(),
      resetContainerRegistry: () => this.containerRegistry.reset(),
      setFluidSystemReady: (ready: boolean) => { this.fluidSystemReady = ready; },
      buildFullMap: () => this.fullMapBuildRuntime.build({
        roomWidthPx: IW_ROOM_W_PX,
        roomHeightPx: IW_ROOM_H_PX,
        visualBoundsBleedPx: VISUAL_BOUNDS_BLEED_PX,
      }),
      getFullGrid: () => this.fullGrid,
      getTemperament: () => this.item.def.temperamentPrimary,
      initWeather: () => this.weatherRuntime.init(),
      attachFluidSystem: () => this.fluidSystem.attachGrid(this.fullGrid, [], this.tileHazardRuntime.getActiveTileBounds()),
      settleContainers: () => this.containerRegistry.settleAll(this.fullGrid),
    };
  }

  private createInitialBuildPresentationDeps() {
    return {
      showGameplayHud: () => this.hudRuntime.showGameplayHud(),
      setCameraZoom: (zoom: number) => this.game.camera.setZoom(zoom),
      placePlayerAtCurrentRoom: () => this.playerSpawnRuntime.placeAtRoom(
        this.currentStratumIndex,
        this.currentCol,
        this.currentRow,
        { snapCamera: true },
      ),
      shouldActivateEntryCorridor: () => !!this.sceneOptions.entryCorridor,
      activateEntryCorridor: () => this.activateEntryCorridor(),
    };
  }
  private wireGameplayStartAndCleanupRuntimes(): void {
    this.wireGameplayStartRuntime();
    this.wireLifecycleCleanupRuntime();
  }

  private wireGameplayStartRuntime(): void {
    this.gameplayStartRuntime = new ItemWorldGameplayStartRuntime({
      ...this.createGameplayStartEntryDeps(),
      ...this.createGameplayStartRoomDeps(),
      ...this.createGameplayStartProgressDeps(),
      ...this.createGameplayStartUiDeps(),
    });
  }

  private createGameplayStartEntryDeps() {
    return {
      getEntryGateState: () => this.entryGateState,
      getCurrentStratumIndex: () => this.currentStratumIndex,
    };
  }

  private createGameplayStartRoomDeps() {
    return {
      getCurrentRoom: () => ({ col: this.currentCol, row: this.currentRow }),
      getRoomSpawnState: () => this.roomSpawnState,
      getRoomSpawnRuntime: () => this.roomSpawnRuntime,
    };
  }

  private createGameplayStartProgressDeps() {
    return {
      getItem: () => this.item,
      getProgress: () => this.progress,
      getStrataConfig: () => this.strataConfig,
    };
  }

  private createGameplayStartUiDeps() {
    return {
      getStratumPickerRuntime: () => this.stratumPickerRuntime,
      showToast: (message: string, color?: number) => this.toast.show(message, color),
    };
  }

  private wireLifecycleCleanupRuntime(): void {
    this.lifecycleCleanupRuntime = new ItemWorldLifecycleCleanupRuntime({
      ...this.createLifecycleCleanupInputAndUiDeps(),
      ...this.createLifecycleCleanupWorldRuntimeDeps(),
      ...this.createLifecycleCleanupDisplayDetachDeps(),
      ...this.createLifecycleCleanupDestroyDeps(),
    });
  }

  private createLifecycleCleanupInputAndUiDeps() {
    return {
      unsubscribeGamepadToast: () => {
        if (this._gpUnsub) {
          this._gpUnsub();
          this._gpUnsub = null;
        }
      },
      hideParallax: () => {
        if (this.parallaxBG) this.parallaxBG.container.visible = false;
      },
      clearToast: () => this.toast.clear(),
      destroyUiController: () => this.uiController.destroy(),
      hideCollisionHud: () => {
        if (this.collisionDebug) this.collisionDebug.hud.visible = false;
      },
    };
  }

  private createLifecycleCleanupWorldRuntimeDeps() {
    return {
      destroyContainerCarry: () => this.containerCarryRuntime.destroy(),
      updateEntryCorridorSceneExit: () => this.entryCorridorRuntime.updateSceneExit(),
      cleanupAbsorbDissolve: () => this.absorbDissolveRuntime.cleanup(true),
      destroyTrapdoorRuntime: () => this.trapdoorRuntime.destroy(),
      clearAnvils: () => this.itemWorldAnvilRuntime.clear(),
      clearCaptureOrbs: () => this.captureOrbRuntime.clear(),
      clearStaticEntities: () => this.clearStaticEntities(),
    };
  }

  private createLifecycleCleanupDisplayDetachDeps() {
    return {
      closeAndDetachLoreDisplay: () => {
        if (!this.loreDisplay) return;
        this.loreDisplay.close();
        detachDisplayObject(this.loreDisplay.container);
        this.loreDisplay = null;
      },
      detachHud: () => detachDisplayObject(this.hud.container),
      detachAndDestroyAreaTitle: () => {
        if (this.areaTitle) detachDisplayObject(this.areaTitle.container);
        this.areaTitle?.destroy();
      },
      detachScreenFlash: () => {
        if (this.screenFlash) detachDisplayObject(this.screenFlash.overlay);
      },
      destroyLowHpVignette: () => this.lowHpVignette?.destroy(),
      destroyTutorialHint: () => this.tutorialHint?.destroy(),
    };
  }

  private createLifecycleCleanupDestroyDeps() {
    return {
      destroyDevOverlay: () => this.devOverlayRuntime.destroy(),
      destroyBossClear: () => this.bossClearRuntime.destroy(),
      destroyWeather: () => this.weatherRuntime.destroy(),
      destroyStratumPicker: () => this.stratumPickerRuntime.destroy(),
      destroyEntryCorridor: () => this.entryCorridorRuntime.destroy(),
      destroyOxygenOverlay: () => this.oxygenOverlay.destroy(),
      destroyAnvilRuntime: () => this.itemWorldAnvilRuntime.destroy(),
      destroyParallax: () => this.parallaxBG?.destroy(),
      clearDamageNumbers: () => this.dmgNumbers?.clear(),
      destroyCollisionHud: () => this.collisionDebug?.hud.destroy({ children: true }),
    };
  }
  private wireDebugRenderRuntime(): void {
    this.debugRenderRuntime = new ItemWorldDebugRenderRuntime({
      ...this.createDebugRenderActorDeps(),
      ...this.createDebugRenderWorldDeps(),
      ...this.createDebugRenderCameraDeps(),
    });
  }

  private createDebugRenderActorDeps(): any {
    return {
      getPlayer: () => this.player,
      getEnemies: () => this.enemyRegistry.enemies,
    };
  }

  private createDebugRenderWorldDeps(): any {
    return {
      getRoomData: () => this.roomData,
      getCollisionDebug: () => this.collisionDebug,
    };
  }

  private createDebugRenderCameraDeps(): any {
    return {
      getCamera: () => this.game.camera,
    };
  }

  private wireDebugMapAndStratumJumpRuntimes(): void {
    this.wireDebugMapRuntimes();
    this.wireStratumJumpRuntimes();
  }

  private wireDebugMapRuntimes(): void {
    this.wireDebugMapStateRuntime();
    this.wireDebugMapRefreshRuntime();
  }

  private wireDebugMapStateRuntime(): void {
    this.debugMapStateRuntime = new ItemWorldDebugMapStateRuntime({
      ...this.createDebugMapGenerationStateDeps(),
      ...this.createDebugMapMutationDeps(),
      ...this.createDebugMapRunResetDeps(),
      ...this.createDebugMapSpawnActivationDeps(),
    });
  }

  private createDebugMapGenerationStateDeps() {
    return {
      getTemplates: () => this.ldtkTemplates,
      getUnifiedGrid: () => this.unifiedGrid,
      getStrataConfig: () => this.strataConfig,
      getWeaponId: () => this.item.def.id,
      computeMemoryPlacements: (options: Parameters<ItemWorldMemoryRoomPlacementRuntime['compute']>[0]) => this.memoryRoomPlacementRuntime.compute(options),
    };
  }

  private createDebugMapMutationDeps() {
    return {
      setStrataConfig: (value: StrataConfig) => { this.strataConfig = value; },
      setDebugGenerationSeedOffset: (value: number) => { this.debugGenerationSeedOffset = value; },
      setUnifiedGrid: (value: UnifiedGridData) => { this.unifiedGrid = value; },
      setRoomGraphs: (value: RoomGraphData[]) => { this.roomGraphs = value; },
      setCurrentRoomState: (col: number, row: number, stratumIndex: number, stratumDef: StratumDef) => {
        this.currentCol = col;
        this.currentRow = row;
        this.currentStratumIndex = stratumIndex;
        this.currentStratumDef = stratumDef;
      },
      initDevOverlay: (topology: Parameters<ItemWorldDevOverlayRuntime['init']>[0]) => this.devOverlayRuntime.init(topology),
    };
  }

  private createDebugMapRunResetDeps() {
    return {
      resetTrapdoorState: () => this.trapdoorState.resetForStratum(),
      resetNeighborPreSpawn: () => this.roomSpawnState.resetNeighborPreSpawn(),
      restoreRoomState: () => { this.restoreRoomState(); },
      setRoomsCleared: (value: number) => this.runStats.setRoomsCleared(value),
      countTotalRooms: () => this.roomStateRuntime.countTotalRooms(this.unifiedGrid),
      setTotalRooms: (value: number) => this.runStats.setTotalRooms(value),
      rebuildEnvironment: () => this.initialBuildRuntime.rebuildEnvironment(),
      placePlayerAtCurrentRoom: () => this.playerSpawnRuntime.placeAtRoom(
        this.currentStratumIndex,
        this.currentCol,
        this.currentRow,
        { snapCamera: true },
      ),
      showGameplayHud: () => this.hudRuntime.showGameplayHud(),
    };
  }

  private createDebugMapSpawnActivationDeps() {
    return {
      markRoomSpawned: (key: string) => this.roomSpawnState.markSpawned(key),
      spawnRoom: (col: number, row: number) => this.roomSpawnRuntime.spawnForRoom(col, row),
    };
  }
  private wireDebugMapRefreshRuntime(): void {
    this.debugMapRefreshRuntime = new ItemWorldDebugMapRefreshRuntime({
      ...this.createDebugMapRefreshGenerationDeps(),
      ...this.createDebugMapRefreshApplyDeps(),
      ...this.createDebugMapRefreshResetDeps(),
      ...this.createDebugMapRefreshFeedbackDeps(),
    });
  }

  private createDebugMapRefreshGenerationDeps() {
    return {
      isInitialized: () => this.initialized,
      generateDebugMap: () => this.generationRuntime.generateDebug({
        itemUid: this.item.uid,
        templates: this.ldtkTemplates,
      }),
    };
  }

  private createDebugMapRefreshApplyDeps() {
    return {
      applyGeneratedMap: (result: Parameters<ItemWorldDebugMapStateRuntime['applyGeneratedMap']>[0]) => this.debugMapStateRuntime.applyGeneratedMap(result),
      computeMemoryPlacements: (debugSeed: number) => this.debugMapStateRuntime.computeMemoryPlacements(debugSeed),
    };
  }

  private createDebugMapRefreshResetDeps() {
    return {
      resetToStartRoom: () => this.debugMapStateRuntime.resetToStartRoom(),
      resetRunState: () => this.debugMapStateRuntime.resetRunState(),
      rebuildEnvironment: () => this.debugMapStateRuntime.rebuildEnvironment(),
      placePlayerAtCurrentRoom: () => this.debugMapStateRuntime.placePlayerAtCurrentRoom(),
      activateStartRoom: () => this.debugMapStateRuntime.activateStartRoom(),
    };
  }

  private createDebugMapRefreshFeedbackDeps() {
    return {
      showToast: (message: string, color: number) => this.toast.show(message, color),
    };
  }
  private wireStratumJumpRuntimes(): void {
    this.wireStratumJumpStateRuntime();
    this.wireStratumJumpRuntime();
  }

  private wireStratumJumpStateRuntime(): void {
    this.stratumJumpStateRuntime = new ItemWorldStratumJumpStateRuntime({
      ...this.createStratumJumpStateGridDeps(),
      ...this.createStratumJumpStateProgressDeps(),
      ...this.createStratumJumpStateSpawnDeps(),
    });
  }

  private createStratumJumpStateGridDeps() {
    return {
      getUnifiedGrid: () => this.unifiedGrid,
      getStrataConfig: () => this.strataConfig,
      setCurrentRoomState: (stratumIndex: number, col: number, row: number, stratumDef: StratumDef) => {
        this.currentStratumIndex = stratumIndex;
        this.currentStratumDef = stratumDef;
        this.currentCol = col;
        this.currentRow = row;
      },
      resetNeighborPreSpawn: () => this.roomSpawnState.resetNeighborPreSpawn(),
    };
  }

  private createStratumJumpStateProgressDeps() {
    return {
      getDeepestUnlocked: () => this.progress.deepestUnlocked,
      setDeepestUnlocked: (value: number) => { this.progress.deepestUnlocked = value; },
      setLastSafeStratum: (value: number) => { this.progress.lastSafeStratum = value; },
      persistRoomState: () => this.persistRoomState(),
      showToast: (message: string, color: number) => this.toast.show(message, color),
    };
  }

  private createStratumJumpStateSpawnDeps() {
    return {
      hasSpawnedRoom: (key: string) => this.roomSpawnState.hasSpawned(key),
      markRoomSpawned: (key: string) => this.roomSpawnState.markSpawned(key),
      spawnRoom: (col: number, row: number) => this.roomSpawnRuntime.spawnForRoom(col, row),
    };
  }

  private wireStratumJumpRuntime(): void {
    this.stratumJumpRuntime = new ItemWorldStratumJumpRuntime({
      ...this.createStratumJumpRuntimeStateDeps(),
      ...this.createStratumJumpRuntimeFlowDeps(),
      ...this.createStratumJumpRuntimePlayerDeps(),
    });
  }

  private createStratumJumpRuntimeStateDeps() {
    return {
      getCurrentStratumIndex: () => this.currentStratumIndex,
      getStrataCount: () => this.strataConfig.strata.length,
      resolveStartRoom: (stratumIndex: number) => this.stratumJumpStateRuntime.resolveStartRoom(stratumIndex),
    };
  }

  private createStratumJumpRuntimeFlowDeps() {
    return {
      clearEnemies: () => this.clearEnemies(),
      applyStratumState: (stratumIndex: number, col: number, row: number) => this.stratumJumpStateRuntime.applyStratumState(stratumIndex, col, row),
      updateProgress: (prevStratum: number, stratumIndex: number) => this.stratumJumpStateRuntime.updateProgress(prevStratum, stratumIndex),
      resetTrapdoorState: () => this.trapdoorState.resetForStratum(),
      activateStartRoom: (col: number, row: number) => this.stratumJumpStateRuntime.activateStartRoom(col, row),
      showDepthToast: (stratumIndex: number) => this.stratumJumpStateRuntime.showDepthToast(stratumIndex),
    };
  }

  private createStratumJumpRuntimePlayerDeps() {
    return {
      placePlayer: (stratumIndex: number, col: number, row: number) => {
        this.playerSpawnRuntime.placeAtRoom(stratumIndex, col, row, { snapCamera: true });
        this.hudRuntime.showGameplayHud();
      },
    };
  }
  private wireFrameAndGateRuntimes(): void {
    this.wireFrameQueryAndEffectsRuntimes();
    this.wirePausedAndBlockingGateRuntimes();
    this.wirePresentationAndSimulationRuntimes();
    this.wireModalAndAmbientGateRuntimes();
  }
  private wireFrameQueryAndEffectsRuntimes(): void {
    this.wireRoomQueryRuntime();
    this.wireFrameEffectsRuntime();
  }

  private wireRoomQueryRuntime(): void {
    this.roomQueryRuntime = new ItemWorldRoomQueryRuntime({
      ...this.createRoomQueryGridDeps(),
      ...this.createRoomQueryCurrentRoomDeps(),
      ...this.createRoomQueryEnemyDeps(),
    });
  }

  private createRoomQueryGridDeps() {
    return {
      getUnifiedGrid: () => this.unifiedGrid,
    };
  }

  private createRoomQueryCurrentRoomDeps() {
    return {
      getCurrentRoom: () => ({ col: this.currentCol, row: this.currentRow }),
    };
  }

  private createRoomQueryEnemyDeps() {
    return {
      getEnemyRegistry: () => this.enemyRegistry,
    };
  }

  private wireFrameEffectsRuntime(): void {
    this.frameEffectsRuntime = new ItemWorldFrameEffectsRuntime({
      ...this.createFrameEffectsLocomotionDeps(),
      ...this.createFrameEffectsProjectileDeps(),
      ...this.createFrameEffectsAmbientVfxDeps(),
      ...this.createFrameEffectsHudDeps(),
    });
  }

  private createFrameEffectsLocomotionDeps() {
    return {
      updateMovementVfx: (dt: number) => this.movementVfxRuntime.update(dt),
      updateContainerPhysics: (dt: number) => this.containerPhysicsRuntime.update(dt),
    };
  }

  private createFrameEffectsProjectileDeps() {
    return {
      updateEgoShardProjectile: (dt: number) => this.egoShardProjectileRuntime.update(dt),
    };
  }

  private createFrameEffectsAmbientVfxDeps() {
    return {
      updateWaterBubbles: (dt: number) => this.waterBubbles.update(dt),
      updateDropThroughDust: (dt: number) => this.dropThroughDust.update(dt),
      updateIceSkidStreak: (dt: number) => this.iceSkidStreak.update(dt),
      updateItemPickupGlow: (dt: number) => this.itemPickupGlow.update(dt),
    };
  }

  private createFrameEffectsHudDeps() {
    return {
      updateLowHpVignette: (dt: number, hpRatio: number) => this.lowHpVignette.update(dt, hpRatio),
      getPlayerHpRatio: () => this.player.maxHp > 0 ? this.player.hp / this.player.maxHp : 0,
    };
  }
  private wirePausedAndBlockingGateRuntimes(): void {
    this.wirePausedFrameRuntime();
    this.wireBlockingTransitionRuntime();
  }

  private wirePausedFrameRuntime(): void {
    this.pausedFrameRuntime = new ItemWorldPausedFrameRuntime({
      ...this.createPausedFrameGateDeps(),
      ...this.createPausedFramePlayerFreezeDeps(),
      ...this.createPausedFrameFeedbackDeps(),
      ...this.createPausedFrameCameraDeps(),
    });
  }

  private createPausedFrameGateDeps() {
    return {
      tickEntryFreeze: (dt: number) => this.entryGateState.tickFreeze(dt),
      updatePrologueEnd: (dt: number) => this.prologueEndRuntime.update(dt),
    };
  }

  private createPausedFramePlayerFreezeDeps() {
    return {
      freezePlayerVelocity: () => {
        this.player.vx = 0;
        this.player.vy = 0;
      },
      savePlayerPreviousPosition: () => this.player.savePrevPosition(),
    };
  }

  private createPausedFrameFeedbackDeps() {
    return {
      updateHud: (dt: number) => this.hud.update(dt),
      updateHudText: () => this.hudRuntime.updateText(),
      updateDamageNumbers: (dt: number) => this.dmgNumbers.update(dt),
      updateScreenFlash: (dt: number) => this.screenFlash.update(dt),
    };
  }

  private createPausedFrameCameraDeps() {
    return {
      targetCameraToPlayer: () => {
        this.game.camera.target = {
          x: this.player.x + this.player.width / 2,
          y: this.player.y + this.player.height / 2,
        };
      },
      updateCamera: (dt: number) => this.game.camera.update(dt),
    };
  }
  private wireBlockingTransitionRuntime(): void {
    this.blockingTransitionRuntime = new ItemWorldBlockingTransitionRuntime({
      ...this.createBlockingTransitionRoomDeps(),
      ...this.createBlockingTransitionAbsorbDeps(),
      ...this.createBlockingTransitionFlowHoldDeps(),
      ...this.createBlockingTransitionHudDeps(),
    });
  }

  private createBlockingTransitionRoomDeps() {
    return {
      isRoomTransitionActive: () => this.roomTransitionRuntime.isActive,
      updateRoomTransition: (dt: number) => this.roomTransitionRuntime.update(dt, {
        placePlayerInRoom: (col: number, row: number) => this.playerSpawnRuntime.placeAtFloor(col, row),
      }),
    };
  }

  private createBlockingTransitionAbsorbDeps() {
    return {
      isAbsorbActive: () => this.absorbDissolveRuntime.isActive,
      updateAbsorb: (dt: number) => this.absorbDissolveRuntime.update(dt),
    };
  }

  private createBlockingTransitionFlowHoldDeps() {
    return {
      isFlowHoldActive: () => this.flowState.isExitFade || this.flowState.isPostClearHold,
      updateFlowHold: (dt: number) => this.transitionUpdateRuntime.update(dt),
    };
  }

  private createBlockingTransitionHudDeps() {
    return {
      setGameplayHudBlock: (reason: string, blocked: boolean) => this.hudRuntime.setGameplayHudBlock(reason, blocked),
    };
  }
  private wirePresentationAndSimulationRuntimes(): void {
    this.wirePresentationFrameRuntime();
    this.wireGameplaySimulationRuntime();
  }

  private wirePresentationFrameRuntime(): void {
    this.presentationFrameRuntime = new ItemWorldPresentationFrameRuntime({
      ...this.createPresentationFrameHudDeps(),
      ...this.createPresentationFrameCombatFeedbackDeps(),
      ...this.createPresentationFrameWorldVfxDeps(),
      ...this.createPresentationFrameCameraDeps(),
    });
  }

  private createPresentationFrameHudDeps() {
    return {
      reconcileGameplayHudVisibility: () => this.hudRuntime.reconcileGameplayHudVisibility(),
      updateHudStats: () => {
        this.hud.updateHP(this.player.hp, this.player.maxHp);
        this.hud.updateFlask(this.player.flaskCharges, this.player.flaskMaxCharges);
        this.hud.updateATK(this.player.atk);
        this.hud.setBurnStatus(this.player.burnRemainingMs ?? 0, MAGMA_BURN_DURATION_MS);
        this.hud.setEgoShards(this.player.egoShardCount, 3, this.player.activeEnchant);
      },
      updateOxygen: () => this.oxygenOverlay.update(this.player),
      updateBossHp: () => this.bossHpRuntime.update(),
      updateHud: (dt: number) => this.hud.update(dt),
      updateHudText: () => this.hudRuntime.updateText(),
    };
  }

  private createPresentationFrameCombatFeedbackDeps() {
    return {
      updateDamageNumbers: (dt: number) => this.dmgNumbers.update(dt),
      updateHitSparks: (dt: number) => this.hitSparks.update(dt),
      updatePropShatter: (dt: number) => this.propShatter.update(dt),
      updateDeathParticles: (dt: number) => this.deathParticles.update(dt),
    };
  }

  private createPresentationFrameWorldVfxDeps() {
    return {
      updateCaptureOrb: (dt: number) => this.captureOrbRuntime.update(dt),
      updateBossClear: (dt: number) => this.bossClearRuntime.update(dt),
      updateScreenFlash: (dt: number) => this.screenFlash.update(dt),
      updateFrameEffects: (dt: number) => this.frameEffectsRuntime.update(dt),
    };
  }

  private createPresentationFrameCameraDeps() {
    return {
      updateCamera: (dt: number) => this.cameraRuntime.update(dt),
    };
  }
  private wireGameplaySimulationRuntime(): void {
    this.gameplaySimulationRuntime = new ItemWorldGameplaySimulationRuntime({
      ...this.createGameplaySimulationPlayerDeps(),
      ...this.createGameplaySimulationWorldDeps(),
      ...this.createGameplaySimulationCombatDeps(),
      ...this.createGameplaySimulationProgressionDeps(),
    });
  }

  private createGameplaySimulationPlayerDeps() {
    return {
      updateUnavailableInput: () => this.unavailableInputRuntime.update(),
      isPlayerStandingOnContainer: () => this.containerPhysicsRuntime.isPlayerStandingOnTop(),
      forcePlayerGroundedOnContainer: () => this.player.forceGrounded(true, 'container'),
      updatePlayer: (dt: number) => this.player.update(dt),
      updateLowHpHealHint: () => this.lowHpHealHint.update(),
      updateJumpTutorialHint: () => this.onboardingRuntime.updateJumpTutorialHint(),
      updateTutorialHint: (dt: number) => this.tutorialHint.update(dt),
      updateUpdraft: (dt: number) => this.updraftSystem.update(dt, this.player, this.fullGrid, this.game.camera),
      updateDebugInput: () => this.debugInputRuntime.update(),
    };
  }

  private createGameplaySimulationWorldDeps() {
    return {
      updateEgoShardCast: (dt: number) => this.egoShardCastRuntime.update(dt),
      updateContainerCarry: (dt: number) => this.containerCarryRuntime.update(dt),
      updateStaticEntities: (dt: number) => this.staticEntityRuntime.update(dt),
      updateMemoryTriggers: (dt: number) => this.memoryTriggerRuntime.update(dt),
      updateDeath: () => this.deathRuntime.update(),
      updateEnemies: (dt: number) => this.enemyRegistry.update(dt, this.entityLayer),
      updateResidents: (dt: number) => this.residentRuntime.update(dt),
      updateTrapdoor: (dt: number) => this.trapdoorRuntime.update(dt),
      updateAnvils: (dt: number) => this.itemWorldAnvilRuntime.update(dt),
      updateCellVisibility: () => this.updateCellVisibility(),
    };
  }

  private createGameplaySimulationCombatDeps() {
    return {
      updatePlayerAttack: () => this.enemyCombatRuntime.updatePlayerAttack(),
      processDefeatedEnemies: () => this.enemyCombatRuntime.processDefeatedEnemies(),
      updateHealingPickups: (dt: number) => this.pickupRuntime.updateHealing(dt),
      updateBreakableProps: (dt: number) => this.breakablePropRuntime.update(dt),
      updateGoldPickups: (dt: number) => this.pickupRuntime.updateGold(dt),
      updateProjectiles: (dt: number) => this.projectileRuntime.update(dt),
      updateEnemyContact: () => this.enemyContactRuntime.update(),
    };
  }

  private createGameplaySimulationProgressionDeps() {
    return {
      consumeBossDefeat: () => this.bossDefeatRuntime.consumeAndHandle(),
      updateRoomProgression: () => this.roomProgressionRuntime.update(),
    };
  }
  private wireModalAndAmbientGateRuntimes(): void {
    this.wireModalGateRuntime();
    this.wireAmbientFrameRuntime();
  }

  private wireModalGateRuntime(): void {
    this.modalGateRuntime = new ItemWorldModalGateRuntime({
      ...this.createModalGatePassiveUiDeps(),
      ...this.createModalGateReturnResultDeps(),
      ...this.createModalGateDebugAndOnboardingDeps(),
      ...this.createModalGateOverlayDeps(),
      ...this.createModalGateGameplayHoldDeps(),
    });
  }

  private createModalGatePassiveUiDeps() {
    return {
      isFeedbackOpen: () => this.game.feedbackOpen,
      updateToast: (dt: number) => this.toast.update(dt),
      updateAreaTitle: (dt: number) => this.areaTitle.update(dt),
    };
  }

  private createModalGateReturnResultDeps() {
    return {
      isReturnResultVisible: () => this.uiController.isReturnResultVisible(),
      updateReturnResult: (dt: number) => this.uiController.updateReturnResult(dt),
      confirmReturnResultIfRequested: () => {
        if (this.game.input.isJustPressed(GameAction.ATTACK)) {
          this.uiController.confirmReturnResult();
        }
      },
    };
  }

  private createModalGateDebugAndOnboardingDeps() {
    return {
      setHudDebugInfoVisible: () => this.hud.setDebugInfoVisible(Debug.infoVisible),
      updateOnboardingBlockingInput: () => this.onboardingRuntime.updateBlockingInput(),
    };
  }

  private createModalGateOverlayDeps() {
    return {
      isStratumPickerVisible: () => this.stratumPickerRuntime.isVisible,
      updateStratumPicker: (dt: number) => this.stratumPickerRuntime.update(dt),
      isLoreActive: () => !!this.loreDisplay?.isActive,
      updateLore: (dt: number) => this.loreDisplay?.update(dt),
    };
  }

  private createModalGateGameplayHoldDeps() {
    return {
      savePlayerPreviousPosition: () => this.player.savePrevPosition(),
      isEntryCorridorActive: () => this.entryCorridorRuntime.isActive,
      updateEntryCorridor: (dt: number) => this.updateEntryCorridor(dt),
      updateBossChoiceInput: () => this.bossChoiceRuntime.updateInput(),
    };
  }

  private wireAmbientFrameRuntime(): void {
    this.ambientFrameRuntime = new ItemWorldAmbientFrameRuntime({
      ...this.createAmbientFrameInputDeps(),
      ...this.createAmbientFrameWeatherDeps(),
      ...this.createAmbientFrameEntryCorridorDeps(),
    });
  }

  private createAmbientFrameInputDeps() {
    return {
      beginInteractionFrame: () => this.game.input.beginInteractionFrame(),
    };
  }

  private createAmbientFrameWeatherDeps() {
    return {
      updateWeather: (dt: number) => this.weatherRuntime.update(dt),
    };
  }

  private createAmbientFrameEntryCorridorDeps() {
    return {
      updateEntryCorridorColorRestore: (dt: number) => this.entryCorridorRuntime.updateColorRestore(dt),
    };
  }

  private wireInteractionAndUiFlowRuntimes(): void {
    this.wireScreenAndCameraFlowRuntimes();
    this.wireWorldInteractionPromptRuntimes();
    this.wireHudOnboardingAndEscapeRuntimes();
  }
  private wireScreenAndCameraFlowRuntimes(): void {
    this.wireOxygenOverlay();
    this.wireRoomTransitionRuntime();
    this.wireItemWorldCameraRuntime();
  }

  private wireOxygenOverlay(): void {
    this.oxygenOverlay = new OxygenOverlay(this.game);
  }

  private wireRoomTransitionRuntime(): void {
    this.roomTransitionRuntime = new ItemWorldRoomTransitionRuntime({
      ...this.createRoomTransitionOverlayDeps(),
    });
  }

  private createRoomTransitionOverlayDeps(): any {
    return {
      getFadeOverlay: () => this.fadeOverlay,
      fadeDurationMs: FADE_DURATION,
    };
  }

  private wireItemWorldCameraRuntime(): void {
    this.cameraRuntime = new ItemWorldCameraRuntime({
      ...this.createItemWorldCameraCoreDeps(),
      ...this.createItemWorldCameraTargetDeps(),
      ...this.createItemWorldCameraBoundsDeps(),
    });
  }

  private createItemWorldCameraCoreDeps() {
    return {
      game: this.game,
    };
  }

  private createItemWorldCameraTargetDeps() {
    return {
      getPlayer: () => this.player,
    };
  }

  private createItemWorldCameraBoundsDeps() {
    return {
      getMapSizePx: () => ({
        width: this.unifiedGrid.totalWidth * IW_ROOM_W_PX,
        height: this.unifiedGrid.totalHeight * IW_ROOM_H_PX,
      }),
    };
  }

  private wireWorldInteractionPromptRuntimes(): void {
    this.wireContainerCarryRuntime();
    this.wireTrapdoorRuntime();
    this.wireTrapdoorDescentRuntime();
    this.wireItemWorldAnvilRuntime();
    this.wirePromptRuntime();
  }

  private wireContainerCarryRuntime(): void {
    this.containerCarryRuntime = new ItemWorldContainerCarryRuntime({
      ...this.createContainerCarryCoreDeps(),
      ...this.createContainerCarryActorDeps(),
      ...this.createContainerCarryFeedbackDeps(),
    });
  }

  private createContainerCarryCoreDeps() {
    return {
      game: this.game,
    };
  }

  private createContainerCarryActorDeps() {
    return {
      getPlayer: () => this.player,
      getContainers: () => this.containerRegistry.getContainers(),
    };
  }

  private createContainerCarryFeedbackDeps() {
    return {
      getArcTether: () => this.arcTether,
    };
  }

  private wireTrapdoorRuntime(): void {
    this.trapdoorRuntime = new ItemWorldTrapdoorRuntime({
      ...this.createTrapdoorCoreDeps(),
      ...this.createTrapdoorInteractionGateDeps(),
      ...this.createTrapdoorActivationDeps(),
    });
  }

  private createTrapdoorCoreDeps() {
    return {
      game: this.game,
      getPlayer: () => this.player,
      getTrapdoor: () => this.trapdoor,
    };
  }

  private createTrapdoorInteractionGateDeps() {
    return {
      isInteractionSuppressed: () => (
        this.flowState.isExitFade
        || this.flowState.isPostClearHold
        || this.roomTransitionRuntime.isActive
      ),
    };
  }

  private createTrapdoorActivationDeps() {
    return {
      onActivate: () => this.trapdoorActivationRuntime.start(),
    };
  }

  private wireTrapdoorDescentRuntime(): void {
    this.trapdoorDescentRuntime = new ItemWorldTrapdoorDescentRuntime();
  }

  private wireItemWorldAnvilRuntime(): void {
    this.itemWorldAnvilRuntime = new ItemWorldAnvilRuntime({
      ...this.createAnvilCoreDeps(),
      ...this.createAnvilInteractionGateDeps(),
      ...this.createAnvilReturnDeps(),
    });
  }

  private createAnvilCoreDeps() {
    return {
      game: this.game,
      getEntityLayer: () => this.entityLayer,
      getPlayer: () => this.player,
    };
  }

  private createAnvilInteractionGateDeps() {
    return {
      isInteractionSuppressed: () => (
        this.promptRuntime.shouldSuppressWorldPrompts()
        || this.uiController.isEscapeConfirmVisible()
        || this.flowState.isExitFade
        || this.flowState.isPostClearHold
        || this.roomTransitionRuntime.isActive
      ),
    };
  }

  private createAnvilReturnDeps() {
    return {
      onReturnRequest: () => this.escapeRuntime.show(),
    };
  }

  private wirePromptRuntime(): void {
    this.promptRuntime = new ItemWorldPromptRuntime({
      ...this.createPromptTargetDeps(),
      ...this.createPromptSuppressionDeps(),
    });
  }

  private createPromptTargetDeps() {
    return {
      getUiController: () => this.uiController,
      getTrapdoorRuntime: () => this.trapdoorRuntime,
      getAnvilRuntime: () => this.itemWorldAnvilRuntime,
    };
  }

  private createPromptSuppressionDeps() {
    return {
      isRoomTransitionActive: () => this.roomTransitionRuntime.isActive,
      isAbsorbActive: () => this.absorbDissolveRuntime.isActive,
      isExitFade: () => this.flowState.isExitFade,
      isPostClearHold: () => this.flowState.isPostClearHold,
    };
  }

  private wireHudOnboardingAndEscapeRuntimes(): void {
    this.wireHudRuntime();
    this.wireOnboardingRuntime();
    this.wireEscapeRuntime();
  }

  private wireHudRuntime(): void {
    this.hudRuntime = new ItemWorldHudRuntime({
      ...this.createHudDisplayDeps(),
      ...this.createHudProgressDeps(),
      ...this.createHudBlockStateDeps(),
    });
  }

  private createHudDisplayDeps() {
    return {
      getHud: () => this.hud,
      getItem: () => this.item,
    };
  }

  private createHudProgressDeps() {
    return {
      getProgress: () => this.progress,
      getStrataConfig: () => this.strataConfig,
      getUnifiedGrid: () => this.unifiedGrid,
      getCurrentStratumIndex: () => this.currentStratumIndex,
      getEarnedExp: () => this.runStats.earnedExp,
    };
  }

  private createHudBlockStateDeps() {
    return {
      isAbsorbActive: () => this.absorbDissolveRuntime.isActive,
      isExitFade: () => this.flowState.isExitFade,
      isPostClearHold: () => this.flowState.isPostClearHold,
      isRoomTransitionActive: () => this.roomTransitionRuntime.isActive,
      isEscapeConfirmVisible: () => this.uiController.isEscapeConfirmVisible(),
    };
  }

  private wireOnboardingRuntime(): void {
    this.onboardingRuntime = new ItemWorldOnboardingRuntime({
      ...this.createOnboardingCoreDeps(),
      ...this.createOnboardingUiDeps(),
      ...this.createOnboardingHintDeps(),
    });
  }

  private createOnboardingCoreDeps() {
    return {
      game: this.game,
    };
  }

  private createOnboardingUiDeps() {
    return {
      getUiController: () => this.uiController,
      getHudSkin: () => this.hudSkin,
    };
  }

  private createOnboardingHintDeps() {
    return {
      getTutorialHint: () => this.tutorialHint,
    };
  }

  private wireEscapeRuntime(): void {
    this.escapeRuntime = new ItemWorldEscapeRuntime({
      ...this.createEscapeCoreDeps(),
      ...this.createEscapeRunSummaryDeps(),
      ...this.createEscapeFlowDeps(),
    });
  }

  private createEscapeCoreDeps() {
    return {
      game: this.game,
      getUiController: () => this.uiController,
      getHudSkin: () => this.hudSkin,
      getItem: () => this.item,
    };
  }

  private createEscapeRunSummaryDeps() {
    return {
      getRoomsCleared: () => this.runStats.roomsCleared,
      getTotalRooms: () => this.runStats.totalRooms,
      getEarnedExp: () => this.runStats.earnedExp,
      getEarnedGold: () => this.runStats.earnedGold,
    };
  }

  private createEscapeFlowDeps() {
    return {
      isPostClearHold: () => this.flowState.isPostClearHold,
      onExitConfirmed: () => {
        this.flowState.startExitFade();
        this.exitFadeRuntime.start();
      },
    };
  }

  private wireBossAndStratumClearRuntimes(): void {
    this.wireBossChoiceAndStratumClearRuntimes();
    this.wireBossDefeatFlowRuntimes();
  }
  private wireBossChoiceAndStratumClearRuntimes(): void {
    this.wireBossChoiceRuntime();
    this.wireStratumClearRuntime();
  }

  private wireBossChoiceRuntime(): void {
    this.bossChoiceRuntime = new ItemWorldBossChoiceRuntime({
      ...this.createBossChoiceCoreDeps(),
      ...this.createBossChoiceActionDeps(),
    });
  }

  private createBossChoiceCoreDeps() {
    return {
      game: this.game,
      getUiController: () => this.uiController,
      getHudSkin: () => this.hudSkin,
    };
  }

  private createBossChoiceActionDeps() {
    return {
      onContinue: () => this.stratumContinueRuntime.continueToNextStratum(),
      onExit: () => this.exitAfterBossRuntime.exitAfterBoss(),
    };
  }

  private wireStratumClearRuntime(): void {
    this.stratumClearRuntime = new ItemWorldStratumClearRuntime({
      ...this.createStratumClearCoreDeps(),
      ...this.createStratumClearStatDeps(),
      ...this.createStratumClearFlowDeps(),
    });
  }

  private createStratumClearCoreDeps() {
    return {
      game: this.game,
      getUiController: () => this.uiController,
      getItem: () => this.item,
    };
  }

  private createStratumClearStatDeps() {
    return {
      getBeforeAtk: () => this.stratumStartSnapshot.atk,
      getAfterAtk: () => this.item.finalAtk,
      getBeforeInnocents: () => this.stratumStartSnapshot.innocentCount,
      getAfterInnocents: () => this.item.innocents.length,
    };
  }

  private createStratumClearFlowDeps() {
    return {
      onHoldStarted: () => this.flowState.startPostClearHold(),
      onContinue: () => this.stratumContinueRuntime.continueToNextStratum(),
      onExit: () => {
        this.returnResultCleanupRuntime.cleanup();
        this.flowState.startExitFade();
        this.exitFadeRuntime.start();
      },
    };
  }

  private wireBossDefeatFlowRuntimes(): void {
    this.wireBossClearRuntime();
    this.wireBossDefeatRuntime();
  }

  private wireBossClearRuntime(): void {
    this.bossClearRuntime = new ItemWorldBossClearRuntime({
      ...this.createBossClearCoreDeps(),
    });
  }

  private createBossClearCoreDeps(): any {
    return {
      getTimeScale: () => 1,
    };
  }

  private wireBossDefeatRuntime(): void {
    this.bossDefeatRuntime = new ItemWorldBossDefeatRuntime({
      ...this.createBossDefeatRuntimeCoreDeps(),
      ...this.createBossDefeatProgressionDeps(),
      ...this.createBossDefeatFeedbackDeps(),
      ...this.createBossDefeatTrapdoorDeps(),
      ...this.createBossDefeatDialogueDeps(),
      ...this.createBossDefeatRewardDeps(),
    });
  }

  private createBossDefeatRuntimeCoreDeps() {
    return {
      tileSize: TILE_SIZE,
      getEnemies: () => this.enemyRegistry.enemies,
      getBossClearRuntime: () => this.bossClearRuntime,
      getItem: () => this.item,
      getProgress: () => this.progress,
      getPlayer: () => this.player,
      getCurrentStratumIndex: () => this.currentStratumIndex,
      getTotalStrata: () => this.strataConfig.strata.length,
      getCurrentCell: () => this.roomStateRuntime.getCurrentCell(this.unifiedGrid, this.currentCol, this.currentRow),
    };
  }

  private createBossDefeatProgressionDeps() {
    return {
      hideBossHp: () => this.hud.hideBossHP(),
      isFirstItemWorldBossDefeated: () => this.saveAccess.isFirstItemWorldBossDefeated(),
      markFirstItemWorldBossDefeated: () => this.saveAccess.markFirstItemWorldBossDefeated(),
      setLastBossStageJump: (value: { stratumIndex: number; newStage: number; fragmentId: string; itemName: string }) => { this.lastBossStageJump = value; },
      showToast: (message: string, color: number) => this.toast.show(message, color),
      showBigToast: (message: string, color: number, durationMs: number) => this.toast.showBig(message, color, durationMs),
      flashBossHeal: () => this.hud.flashBossHeal(),
      persistRoomState: () => this.persistRoomState(),
    };
  }

  private createBossDefeatFeedbackDeps() {
    return {
      setHitstopFrames: (frames: number) => { this.game.hitstopFrames = frames; },
      shakeCamera: (intensity: number) => this.game.camera.shake(intensity),
      flashScreen: (color: number, alpha: number, durationMs: number) => this.screenFlash.flash(color, alpha, durationMs),
      spawnDeathParticles: (x: number, y: number, isBoss: boolean) => this.deathParticles.spawn(x, y, isBoss),
    };
  }

  private createBossDefeatTrapdoorDeps() {
    return {
      getTrapdoor: () => this.trapdoor,
      setTrapdoor: (trapdoor: NonNullable<typeof this.trapdoor>) => { this.trapdoor = trapdoor; },
      getEntityLayer: () => this.entityLayer,
      prepareAbsorbFilter: () => this.absorbDissolveRuntime.prepareFilter(),
      setTrapdoorDescentToWorld: (descentToWorld: boolean) => this.trapdoorState.setDescentToWorld(descentToWorld),
      findRoomAtPixel: (x: number, y: number) => this.roomRectRuntime.findRoomAtPixel(x, y),
      getRoomRectTiles: (col: number, absRow: number) => this.roomRectRuntime.getRoomRectTiles(col, absRow),
      getFullGrid: () => this.fullGrid,
      isFinalEndRoom: (col: number, absRow: number) => this.roomQueryRuntime.isFinalEndRoom(col, absRow),
    };
  }

  private createBossDefeatDialogueDeps() {
    return {
      isFirstBossOnboarding: () => this.egoDialogueRuntime.isFirstBossOnboarding(),
      showBossKilledDialogue: async () => {
        this.egoUnlockedEvents.add(EGO_EVENT.BOSS_KILLED);
        await this.loreDisplay?.showDialogue(EGO_BOSS_KILLED, true);
      },
      showTrapdoorThanksIfReady: () => {
        if (
          this.loreDisplay
          && !this.egoUnlockedEvents.has(EGO_EVENT.TRAPDOOR_THANKS)
          && !this.loreDisplay.isActive
        ) {
          this.egoUnlockedEvents.add(EGO_EVENT.TRAPDOOR_THANKS);
          void this.loreDisplay.showDialogue(EGO_TRAPDOOR_THANKS, false);
        }
      },
    };
  }

  private createBossDefeatRewardDeps() {
    return {
      addHealingPickup: (pickup: Parameters<ItemWorldPickupRuntime['addHealingPickup']>[0]) => this.pickupRuntime.addHealingPickup(pickup),
    };
  }
  private wireStratumAndPanelRuntimes(): void {
    this.wireStratumTransitionAndEgoShardRuntimes();
    this.wireInputAndAbsorbRuntimes();
    this.wireEntryCorridorRuntime();
    this.wireCaptureAndDialogueRuntimes();
  }
  private wireStratumTransitionAndEgoShardRuntimes(): void {
    this.wireItemWorldExitFadeRuntime();
    this.wireEgoShardCastRuntime();
    this.wireEgoShardCombatRuntime();
    this.wireEgoShardProjectileRuntime();
  }

  private wireItemWorldExitFadeRuntime(): void {
    this.exitFadeRuntime = new ItemWorldExitFadeRuntime({
      ...this.createItemWorldExitFadeOverlayDeps(),
    });
  }

  private createItemWorldExitFadeOverlayDeps(): any {
    return {
      getFadeOverlay: () => this.fadeOverlay,
      durationMs: FADE_DURATION * 2,
    };
  }

  private wireEgoShardCastRuntime(): void {
    this.egoShardCastRuntime = new ItemWorldEgoShardCastRuntime({
      ...this.createEgoShardCastCoreDeps(),
      ...this.createEgoShardCastActorDeps(),
      ...this.createEgoShardCastWorldDeps(),
      ...this.createEgoShardCastRuntimeDeps(),
      ...this.createEgoShardCastGateDeps(),
    });
  }

  private createEgoShardCastCoreDeps() {
    return {
      game: this.game,
    };
  }

  private createEgoShardCastActorDeps() {
    return {
      getPlayer: () => this.player,
    };
  }

  private createEgoShardCastWorldDeps() {
    return {
      getCollisionGrid: () => this.fullGrid,
    };
  }

  private createEgoShardCastRuntimeDeps() {
    return {
      getEgoShardRuntime: () => this.egoShardRuntime,
    };
  }

  private createEgoShardCastGateDeps() {
    return {
      hasHeldContainer: () => this.containerCarryRuntime.hasHeldContainer(),
    };
  }

  private wireEgoShardCombatRuntime(): void {
    this.egoShardCombatRuntime = new ItemWorldEgoShardCombatRuntime({
      ...this.createEgoShardCombatActorDeps(),
      ...this.createEgoShardCombatWorldDeps(),
      ...this.createEgoShardCombatFeedbackDeps(),
      ...this.createEgoShardCombatShardDeps(),
      ...this.createEgoShardCombatContainerDeps(),
    });
  }

  private createEgoShardCombatActorDeps() {
    return {
      getPlayer: () => this.player,
      getEnemies: () => this.enemyRegistry.enemies,
      getContainers: () => this.containerRegistry.getContainers(),
    };
  }

  private createEgoShardCombatWorldDeps() {
    return {
      getCollisionGrid: () => this.fullGrid,
      getTileMutator: () => this.tileMutator,
    };
  }

  private createEgoShardCombatFeedbackDeps() {
    return {
      getDamageNumbers: () => this.dmgNumbers,
      getHitSparks: () => this.hitSparks,
    };
  }

  private createEgoShardCombatShardDeps() {
    return {
      retrieveShardsInAABB: (x: number, y: number, width: number, height: number) => this.egoShardRuntime.retrieveInAABB(x, y, width, height),
    };
  }

  private createEgoShardCombatContainerDeps() {
    return {
      paintContainerImpact: (kind: any, gx: number, gy: number, volume: number) => this.containerFluidRuntime.paintImpact(kind, gx, gy, volume),
      destroyContainerWithVFX: (container: any) => this.containerDestructionRuntime.destroyWithVfx(container),
      removeContainerAt: (index: number) => this.containerRegistry.removeAt(index),
    };
  }

  private wireEgoShardProjectileRuntime(): void {
    this.egoShardProjectileRuntime = new ItemWorldEgoShardProjectileRuntime({
      ...this.createEgoShardProjectileActorDeps(),
      ...this.createEgoShardProjectileWorldDeps(),
      ...this.createEgoShardProjectileRuntimeDeps(),
      ...this.createEgoShardProjectileImpactDeps(),
    });
  }

  private createEgoShardProjectileActorDeps() {
    return {
      getPlayer: () => this.player,
    };
  }

  private createEgoShardProjectileWorldDeps() {
    return {
      getCollisionGrid: () => this.fullGrid,
    };
  }

  private createEgoShardProjectileRuntimeDeps() {
    return {
      getEgoShardRuntime: () => this.egoShardRuntime,
    };
  }

  private createEgoShardProjectileImpactDeps() {
    return {
      onImpact: (x: number, y: number, element: any) => this.egoShardImpactRuntime.handleImpact(x, y, element),
      checkHit: (x: number, y: number, element: any) => this.egoShardCombatRuntime.checkHit(x, y, element),
      flushContainerFluidChanges: () => this.containerFluidRuntime.flush(),
    };
  }

  private wireInputAndAbsorbRuntimes(): void {
    this.wireUnavailableInputRuntime();
    this.wireAbsorbDissolveRuntime();
  }

  private wireUnavailableInputRuntime(): void {
    this.unavailableInputRuntime = new ItemWorldUnavailableInputRuntime({
      ...this.createUnavailableInputCoreDeps(),
      ...this.createUnavailableInputFeedbackDeps(),
    });
  }

  private createUnavailableInputCoreDeps(): any {
    return {
      game: this.game,
    };
  }

  private createUnavailableInputFeedbackDeps(): any {
    return {
      showToast: (message: string, color?: number) => this.toast.show(message, color),
    };
  }

  private wireAbsorbDissolveRuntime(): void {
    this.absorbDissolveRuntime = new ItemWorldAbsorbDissolveRuntime({
      ...this.createAbsorbDissolveCoreDeps(),
      ...this.createAbsorbDissolveLayerDeps(),
      ...this.createAbsorbDissolveActorDeps(),
      ...this.createAbsorbDissolveOverlayDeps(),
      ...this.createAbsorbDissolveCompletionDeps(),
    });
  }

  private createAbsorbDissolveCoreDeps() {
    return {
      game: this.game,
    };
  }

  private createAbsorbDissolveLayerDeps() {
    return {
      getTilemapContainer: () => this.tilemap.container,
      getFullMapContainer: () => this.fullMapContainer,
      getBgAggregate: () => this.bgAggregate,
      getBuildingLayer: () => this.buildingLayer,
      getResidentsLayer: () => this.residentsLayer,
      getFluidLayer: () => this.fluidLayer,
      getAboveFluidLayer: () => this.aboveFluidLayer,
      getEntityLayer: () => this.entityLayer,
    };
  }

  private createAbsorbDissolveActorDeps() {
    return {
      getPlayerContainer: () => this.player.container,
      getTrapdoor: () => this.trapdoor,
    };
  }

  private createAbsorbDissolveOverlayDeps() {
    return {
      getFadeOverlayParent: () => this.fadeOverlay.parent ?? null,
    };
  }

  private createAbsorbDissolveCompletionDeps() {
    return {
      onComplete: () => {
        this.flowState.startExitFade();
        this.exitFadeRuntime.start();
      },
    };
  }

  private wireEntryCorridorRuntime(): void {
    this.entryCorridorRuntime = new ItemWorldEntryCorridorRuntime({
      ...this.createEntryCorridorCoreDeps(),
      ...this.createEntryCorridorWorldDeps(),
      ...this.createEntryCorridorPlayerFrameDeps(),
      ...this.createEntryCorridorCameraDeps(),
      ...this.createEntryCorridorVisibilityDeps(),
      ...this.createEntryCorridorFlowDeps(),
    });
  }

  private createEntryCorridorCoreDeps(): any {
    return {
      game: this.game,
      tileSize: TILE_SIZE,
    };
  }

  private createEntryCorridorWorldDeps() {
    return {
      getSceneContainer: () => this.container,
      getLdtkTemplates: () => this.ldtkTemplates,
      getItemUid: () => this.item.uid,
      getCurrentStratumIndex: () => this.currentStratumIndex,
      getCurrentRoom: () => ({ col: this.currentCol, row: this.currentRow }),
      getPlayerStartForRoom: (stratumIndex: number, col: number, row: number) => this.playerSpawnRuntime.resolveForRoom(stratumIndex, col, row),
      getCollisionGrid: () => this.fullGrid,
      getUnifiedGridPixelBounds: () => ({
        widthPx: this.unifiedGrid.totalWidth * IW_ROOM_W_PX,
        heightPx: this.unifiedGrid.totalHeight * IW_ROOM_H_PX,
      }),
      setRoomData: (grid: number[][]) => {
        this.roomData = grid;
        bindPlayerCollisionGrid(this.player, grid);
      },
      getAtlases: () => this.atlases,
      getTemperament: () => this.item.def.temperamentPrimary,
    };
  }

  private createEntryCorridorPlayerFrameDeps() {
    return {
      getPlayer: () => this.player,
      isPlayerStandingOnTop: () => this.containerPhysicsRuntime.isPlayerStandingOnTop(),
      setPlayerGrounded: (grounded: boolean, source: 'container') => this.player.forceGrounded(grounded, source),
      isPlayerGrounded: () => this.player.isGrounded(),
      updatePlayer: (dt: number) => this.player.update(dt),
      updateMovementVfx: (dt: number) => this.frameEffectsRuntime.update(dt),
      updateDmgNumbers: (dt: number) => this.dmgNumbers.update(dt),
      updateScreenFlash: (dt: number) => this.screenFlash.update(dt),
      isAabbClearInGrid: (grid: number[][], x: number, y: number, w: number, h: number) => this.roomQueryRuntime.isAabbClearInGrid(grid, x, y, w, h),
    };
  }

  private createEntryCorridorCameraDeps() {
    return {
      setCameraForEntryBounds: (widthPx: number, heightPx: number) => this.game.camera.setBounds(0, 0, widthPx, heightPx, VISUAL_BOUNDS_BLEED_PX),
      setCameraForWorldBounds: (widthPx: number, heightPx: number) => this.game.camera.setBounds(0, 0, widthPx, heightPx, VISUAL_BOUNDS_BLEED_PX),
      setCameraTarget: (x: number, y: number) => { this.game.camera.target = { x, y }; },
      snapCamera: (x: number, y: number) => this.game.camera.snap(x, y),
      updateCamera: (dt: number) => this.game.camera.update(dt),
    };
  }

  private createEntryCorridorVisibilityDeps() {
    return {
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
      hideHud: () => this.hudRuntime.hideForCinematic(),
    };
  }

  private createEntryCorridorFlowDeps() {
    return {
      clearEntryGateFreeze: () => this.entryGateState.clearFreeze(),
      startGameplayAfterEntry: () => {
        this.hudRuntime.showGameplayHud();
        this.startItemWorldGameplayAfterEntry();
      },
      beginEntryDialogueAfterTransition: () => this.beginEntryDialogueAfterTransition(),
    };
  }
  private wireCaptureAndDialogueRuntimes(): void {
    this.wireCaptureOrbRuntime();
    this.wireEgoDialogueRuntime();
  }

  private wireCaptureOrbRuntime(): void {
    this.captureOrbRuntime = new ItemWorldCaptureOrbRuntime({
      ...this.createCaptureOrbRenderDeps(),
      ...this.createCaptureOrbTargetDeps(),
      ...this.createCaptureOrbFeedbackDeps(),
    });
  }

  private createCaptureOrbRenderDeps() {
    return {
      getEntityLayer: () => this.entityLayer,
    };
  }

  private createCaptureOrbTargetDeps() {
    return {
      getTargetCenter: () => ({
        x: this.player.x + this.player.width / 2,
        y: this.player.y + this.player.height / 2,
      }),
    };
  }

  private createCaptureOrbFeedbackDeps() {
    return {
      flashOnArrival: () => this.screenFlash.flash(0xaaeeff, 0.2, 90),
    };
  }

  private wireEgoDialogueRuntime(): void {
    this.egoDialogueRuntime = new ItemWorldEgoDialogueRuntime({
      ...this.createEgoDialogueDisplayDeps(),
      ...this.createEgoDialogueEventStateDeps(),
    });
  }

  private createEgoDialogueDisplayDeps() {
    return {
      getLoreDisplay: () => this.loreDisplay,
    };
  }

  private createEgoDialogueEventStateDeps() {
    return {
      getUnlockedEvents: () => this.egoUnlockedEvents,
    };
  }

  private wireMemoryCombatAndHazardRuntimes(): void {
    this.wireMemoryAndPrologueRuntimes();
    this.wireResidentRuntimes();
    this.wireEnemyCombatRuntime();
    this.wireHazardAndFluidImpactRuntimes();
  }

  private wireMemoryAndPrologueRuntimes(): void {
    this.wireMemoryTriggerRuntime();
    this.wirePrologueEndRuntime();
  }

  private wireMemoryTriggerRuntime(): void {
    this.memoryTriggerRuntime = new ItemWorldMemoryTriggerRuntime({
      ...this.createMemoryTriggerRenderDeps(),
      ...this.createMemoryTriggerActorDeps(),
      ...this.createMemoryTriggerLoreDeps(),
    });
  }

  private createMemoryTriggerRenderDeps() {
    return {
      getEntityLayer: () => this.entityLayer,
    };
  }

  private createMemoryTriggerActorDeps() {
    return {
      getPlayer: () => this.player,
    };
  }

  private createMemoryTriggerLoreDeps() {
    return {
      getLoreDisplay: () => this.loreDisplay,
    };
  }

  private wirePrologueEndRuntime(): void {
    this.prologueEndRuntime = new ItemWorldPrologueEndRuntime({
      ...this.createPrologueEndCoreDeps(),
      ...this.createPrologueEndActorDeps(),
      ...this.createPrologueEndGateDeps(),
      ...this.createPrologueEndFeedbackDeps(),
      ...this.createPrologueEndExitDeps(),
    });
  }

  private createPrologueEndCoreDeps() {
    return {
      game: this.game,
    };
  }

  private createPrologueEndActorDeps() {
    return {
      getPlayer: () => this.player,
      getFadeOverlay: () => this.fadeOverlay,
      getEntityLayer: () => this.entityLayer,
    };
  }

  private createPrologueEndGateDeps() {
    return {
      isPrologue: () => this.saveAccess.isPrologue(),
    };
  }

  private createPrologueEndFeedbackDeps() {
    return {
      shake: (intensity: number) => this.game.camera.shake(intensity),
      flash: () => this.screenFlash.flash(0xffffff, 0.5, 90),
    };
  }

  private createPrologueEndExitDeps() {
    return {
      onDone: () => {
        // 아이템계를 빠져나가 Ch.1 로. onPrologueEnd 미설정 시 일반 종료로 fallback.
        if (this.onPrologueEnd) {
          this.finalExitRuntime.exitToPrologueEnd();
        } else {
          this.finalExitRuntime.exitToWorld();
        }
      },
    };
  }

  private wireResidentRuntimes(): void {
    this.wireResidentRuntime();
    this.wireSafeRoomResidentSpawnRuntime();
  }

  private wireResidentRuntime(): void {
    this.residentRuntime = new ItemWorldResidentRuntime({
      ...this.createResidentRenderDeps(),
      ...this.createResidentActorDeps(),
      ...this.createResidentLoreDeps(),
      ...this.createResidentEgoStateDeps(),
    });
  }

  private createResidentRenderDeps() {
    return {
      getResidentsLayer: () => this.residentsLayer,
    };
  }

  private createResidentActorDeps() {
    return {
      getPlayer: () => this.player,
    };
  }

  private createResidentLoreDeps() {
    return {
      getLoreDisplay: () => this.loreDisplay,
    };
  }

  private createResidentEgoStateDeps() {
    return {
      getEgoFlags: () => this.egoDialogueRuntime.getFlags(),
      getEgoUnlockedEvents: () => this.egoUnlockedEvents,
    };
  }

  private wireSafeRoomResidentSpawnRuntime(): void {
    this.safeRoomResidentSpawnRuntime = new ItemWorldSafeRoomResidentSpawnRuntime({
      ...this.createSafeRoomResidentSpawnSeedDeps(),
      ...this.createSafeRoomResidentSpawnWorldDeps(),
      ...this.createSafeRoomResidentSpawnRandomDeps(),
      ...this.createSafeRoomResidentSpawnControllerDeps(),
      ...this.createSafeRoomResidentSpawnRuntimeDeps(),
    });
  }

  private createSafeRoomResidentSpawnSeedDeps() {
    return {
      getItemUid: () => this.item.uid,
    };
  }

  private createSafeRoomResidentSpawnWorldDeps() {
    return {
      getCollisionGrid: () => this.fullGrid,
    };
  }

  private createSafeRoomResidentSpawnRandomDeps() {
    return {
      createPrng: (seed: number) => new PRNG(seed),
    };
  }

  private createSafeRoomResidentSpawnControllerDeps() {
    return {
      getSpawnController: () => this.spawnController,
    };
  }

  private createSafeRoomResidentSpawnRuntimeDeps() {
    return {
      getResidentRuntime: () => this.residentRuntime,
    };
  }

  private wireEnemyCombatRuntime(): void {
    this.enemyCombatRuntime = new ItemWorldEnemyCombatRuntime({
      ...this.createEnemyCombatWorldDeps(),
      ...this.createEnemyCombatFeedbackDeps(),
      ...this.createEnemyCombatProgressionDeps(),
      ...this.createEnemyCombatRewardDeps(),
    });
  }

  private createEnemyCombatWorldDeps() {
    return {
      getPlayer: () => this.player,
      getEnemies: () => this.enemyRegistry.enemies,
      getHitManager: () => this.hitManager,
      getItem: () => this.item,
      getRoomEnemyCount: () => this.roomSpawnState.roomEnemyCount,
      getUnifiedGrid: () => this.unifiedGrid,
      getRoomData: () => this.roomData,
    };
  }

  private createEnemyCombatFeedbackDeps() {
    return {
      getDamageNumbers: () => this.dmgNumbers,
      getHitSparks: () => this.hitSparks,
      getScreenFlash: () => this.screenFlash,
      getDeathParticles: () => this.deathParticles,
      getHud: () => this.hud,
    };
  }

  private createEnemyCombatProgressionDeps() {
    return {
      getExpMultiplier: () => this.currentStratumDef.expMultiplier,
      baseExpPerKill: BASE_EXP_PER_KILL,
      fireEgoFirstKill: () => this.egoDialogueRuntime.fireFirstKill(),
      addEarnedExp: (amount: number) => this.runStats.addEarnedExp(amount),
      incrementRoomsCleared: () => this.runStats.incrementRoomsCleared(),
      persistRoomState: () => this.persistRoomState(),
      removeEnemyAt: (index: number) => this.enemyRegistry.removeAt(index),
      onBossDefeated: () => {},
    };
  }

  private createEnemyCombatRewardDeps() {
    return {
      rollDrop: () => this.dropRng.next(),
      addHealingPickup: (pickup: Parameters<ItemWorldPickupRuntime['addHealingPickup']>[0]) => this.pickupRuntime.addHealingPickup(pickup),
      addGoldPickup: (pickup: Parameters<ItemWorldPickupRuntime['addGoldPickup']>[0]) => this.pickupRuntime.addGoldPickup(pickup),
    };
  }
  private wireHazardAndFluidImpactRuntimes(): void {
    this.wireTileHazardRuntime();
    this.wireContainerFluidRuntime();
    this.wireEgoShardImpactRuntime();
  }

  private wireTileHazardRuntime(): void {
    this.tileHazardRuntime = new ItemWorldTileHazardRuntime({
      ...this.createTileHazardWorldDeps(),
      ...this.createTileHazardMutationDeps(),
      ...this.createTileHazardFluidDeps(),
      ...this.createTileHazardCombatFeedbackDeps(),
    });
  }

  private createTileHazardWorldDeps() {
    return {
      game: this.game,
      getCollisionGrid: () => this.fullGrid,
      getCurrentRoom: () => ({ col: this.currentCol, row: this.currentRow }),
      getCurrentRoomRect: () => this.roomRectRuntime.getRoomRectTiles(this.currentCol, this.currentRow),
    };
  }

  private createTileHazardMutationDeps() {
    return {
      getTileMutator: () => this.tileMutator,
      getTileMutatorRenderer: () => this.tileMutatorRenderer,
      getBurnableProps: () => this.burnablePropRegistry.props,
      getBreakableProps: () => this.staticEntityRegistry.breakableProps,
      getAshRemnant: () => this.ashRemnant,
      getGrassClumpFire: () => this.grassClumpFire,
      destroyBreakablePropWithEffects: (prop: Parameters<ItemWorldBreakablePropRuntime['destroyWithEffects']>[0], source: Parameters<ItemWorldBreakablePropRuntime['destroyWithEffects']>[1]) => this.breakablePropRuntime.destroyWithEffects(prop, source),
    };
  }

  private createTileHazardFluidDeps() {
    return {
      getFluidSystem: () => this.fluidSystem,
      getFluidSpawners: () => this.fluidSpawners,
      getFluidCrestFoam: () => this.fluidCrestFoam,
    };
  }

  private createTileHazardCombatFeedbackDeps() {
    return {
      getPlayer: () => this.player,
      getEnemies: () => this.enemyRegistry.enemies,
      getHud: () => this.hud,
      getDamageNumbers: () => this.dmgNumbers,
      getScreenFlash: () => this.screenFlash,
    };
  }
  private wireContainerFluidRuntime(): void {
    this.containerFluidRuntime = new ItemWorldContainerFluidRuntime({
      ...this.createContainerFluidWorldDeps(),
      ...this.createContainerFluidRefreshDeps(),
      ...this.createContainerFluidEntityDeps(),
      ...this.createContainerFluidFeedbackDeps(),
    });
  }

  private createContainerFluidWorldDeps() {
    return {
      game: this.game,
      getCollisionGrid: () => this.fullGrid,
      getTileMutator: () => this.tileMutator,
    };
  }

  private createContainerFluidRefreshDeps() {
    return {
      getFluidSystem: () => this.fluidSystem,
      getActiveTileBounds: () => this.tileHazardRuntime.getActiveTileBounds(),
    };
  }

  private createContainerFluidEntityDeps() {
    return {
      getContainers: () => this.containerRegistry.getContainers(),
      getEnemies: () => this.enemyRegistry.enemies,
    };
  }

  private createContainerFluidFeedbackDeps() {
    return {
      getSteamPuff: () => this.steamPuff,
    };
  }
  private wireEgoShardImpactRuntime(): void {
    this.egoShardImpactRuntime = new ItemWorldEgoShardImpactRuntime({
      ...this.createEgoShardImpactWorldDeps(),
      ...this.createEgoShardImpactTileFluidDeps(),
      ...this.createEgoShardImpactFeedbackDeps(),
    });
  }

  private createEgoShardImpactWorldDeps() {
    return {
      game: this.game,
      getPlayer: () => this.player,
      getCollisionGrid: () => this.fullGrid,
    };
  }

  private createEgoShardImpactTileFluidDeps() {
    return {
      getTileMutator: () => this.tileMutator,
      getFluidSystem: () => this.fluidSystem,
      getActiveTileBounds: () => this.tileHazardRuntime.getActiveTileBounds(),
      getFluidResidue: () => this.fluidResidue,
      getGrassClumpFire: () => this.grassClumpFire,
    };
  }

  private createEgoShardImpactFeedbackDeps() {
    return {
      getSteamPuff: () => this.steamPuff,
    };
  }
  private wireFullMapBuildRuntimes(): void {
    this.wireFullMapTemplateRuntimes();
    this.wireFullMapBuildStateRuntime();
    this.wireFullMapLayerRuntimes();
    this.wireFullMapRoomApplyRuntime();
    this.wireFullMapBuildPipelineRuntime();
    this.boundaryVisualRuntime = new ItemWorldBoundaryVisualRuntime();
  }
  private wireFullMapTemplateRuntimes(): void {
    this.wireMemoryRoomPlacementRuntime();
    this.wireTemplatePickerRuntime();
    this.wireFullGridRuntime();
  }

  private wireMemoryRoomPlacementRuntime(): void {
    this.memoryRoomPlacementRuntime = new ItemWorldMemoryRoomPlacementRuntime({
      ...this.createMemoryRoomPlacementQueryDeps(),
    });
  }

  private createMemoryRoomPlacementQueryDeps(): any {
    return {
      isStratumEndRoom: (col: number, absRow: number) => this.roomQueryRuntime.isStratumEndRoom(col, absRow),
    };
  }

  private wireTemplatePickerRuntime(): void {
    this.templatePickerRuntime = new ItemWorldTemplatePickerRuntime({
      ...this.createTemplatePickerSourceDeps(),
      ...this.createTemplatePickerRoomRoleDeps(),
    });
  }

  private createTemplatePickerSourceDeps() {
    return {
      getTemplates: () => this.ldtkTemplates,
      getMemoryRoomPlacements: () => this.memoryRoomPlacementRuntime.getPlacements(),
    };
  }

  private createTemplatePickerRoomRoleDeps() {
    return {
      getStartRoom: () => this.unifiedGrid.startRoom,
      isStratumEndRoom: (col: number, absRow: number) => this.roomQueryRuntime.isStratumEndRoom(col, absRow),
    };
  }

  private wireFullGridRuntime(): void {
    this.fullGridRuntime = new ItemWorldFullGridRuntime();
  }

  private wireFullMapBuildStateRuntime(): void {
    this.buildStateRuntime = new ItemWorldBuildStateRuntime({
      ...this.createBuildStateTileAndFluidCleanupDeps(),
      ...this.createBuildStateEntityCleanupDeps(),
      ...this.createBuildStateRoomCleanupDeps(),
      ...this.createBuildStateVisualCleanupDeps(),
    });
  }

  private createBuildStateTileAndFluidCleanupDeps() {
    return {
      resetTileMutator: () => this.tileMutator.reset(),
      clearBurnableProps: () => this.burnablePropRegistry.clear(),
      clearAshRemnant: () => this.ashRemnant?.clear(),
      clearGrassClumpFire: () => this.grassClumpFire.clear(),
      clearFluidResidue: () => this.fluidResidue?.clear(),
      clearEgoShardRuntime: () => this.egoShardRuntime.clear(),
    };
  }

  private createBuildStateEntityCleanupDeps() {
    return {
      clearContainerRegistry: () => this.containerRegistry.clear(),
      resetContainerCarry: () => this.containerCarryRuntime.reset(),
      clearEnemies: () => this.clearEnemies(),
    };
  }

  private createBuildStateRoomCleanupDeps() {
    return {
      clearRewardSpawnerPoints: () => this.roomRewardSpawner.clearSpawnerPoints(),
      clearSpawnedRooms: () => this.roomSpawnState.clearSpawnedRooms(),
      clearRoomTypes: () => this.roomTypeRuntime.clear(),
      clearPlayerSpawns: () => this.playerSpawnRuntime.clear(),
    };
  }

  private createBuildStateVisualCleanupDeps() {
    return {
      clearCellVisualRecords: () => this.cellVisualRuntime.clearRecords(),
      resetCellVisualRenderedState: () => this.cellVisualRuntime.resetRenderedState(),
      clearRuntimeCellSpawns: () => this.runtimeCellSpawner.clearSpawnedCells(),
    };
  }

  private wireFullMapLayerRuntimes(): void {
    this.wireFullMapLayerRuntime();
    this.wireFullMapLayerBindingRuntime();
    this.wireFullMapLayerRebuildRuntime();
    this.wireFullMapAttachRuntime();
  }

  private wireFullMapLayerRuntime(): void {
    this.fullMapLayerRuntime = new ItemWorldFullMapLayerRuntime();
  }

  private wireFullMapLayerBindingRuntime(): void {
    this.fullMapLayerBindingRuntime = new ItemWorldFullMapLayerBindingRuntime({
      ...this.createFullMapCoreLayerBindingDeps(),
      ...this.createFullMapTerrainLayerBindingDeps(),
      ...this.createFullMapDetailLayerBindingDeps(),
    });
  }

  private createFullMapCoreLayerBindingDeps() {
    return {
      setFullMapContainer: (container: ItemWorldFullMapLayerSet['fullMapContainer']) => { this.fullMapContainer = container; },
      setBgAggregate: (container: ItemWorldFullMapLayerSet['bgAggregate']) => { this.bgAggregate = container; },
      setInteriorAggregate: (container: ItemWorldFullMapLayerSet['interiorAggregate']) => { this.interiorAggregate = container; },
    };
  }

  private createFullMapTerrainLayerBindingDeps() {
    return {
      setWallAggregate: (container: ItemWorldFullMapLayerSet['wallAggregate']) => { this.wallAggregate = container; },
      setSpecialAggregate: (container: ItemWorldFullMapLayerSet['specialAggregate']) => { this.specialAggregate = container; },
      setShadowAggregate: (container: ItemWorldFullMapLayerSet['shadowAggregate']) => { this.shadowAggregate = container; },
      setSealAggregate: (container: ItemWorldFullMapLayerSet['sealAggregate']) => { this.sealAggregate = container; },
    };
  }

  private createFullMapDetailLayerBindingDeps() {
    return {
      setDecoAggregate: (container: ItemWorldFullMapLayerSet['decoAggregate']) => { this.decoAggregate = container; },
      setArtificialDecoAggregate: (container: ItemWorldFullMapLayerSet['artificialDecoAggregate']) => { this.artificialDecoAggregate = container; },
      setStructAggregate: (container: ItemWorldFullMapLayerSet['structAggregate']) => { this.structAggregate = container; },
    };
  }
  private wireFullMapLayerRebuildRuntime(): void {
    this.fullMapLayerRebuildRuntime = new ItemWorldFullMapLayerRebuildRuntime({
      ...this.createFullMapLayerRebuildContainerDeps(),
      ...this.createFullMapLayerRebuildPaletteDeps(),
    }, this.fullMapLayerRuntime, this.fullMapLayerBindingRuntime);
  }

  private createFullMapLayerRebuildContainerDeps() {
    return {
      getPreviousContainer: () => this.fullMapContainer,
    };
  }

  private createFullMapLayerRebuildPaletteDeps() {
    return {
      getBgPaletteFilter: () => this.bgPaletteFilter,
      getWallPaletteFilter: () => this.wallPaletteFilter,
      getNaturalPaletteFilter: () => this.naturalPaletteFilter,
      getInteriorPaletteFilter: () => this.interiorPaletteFilter,
    };
  }

  private wireFullMapAttachRuntime(): void {
    this.fullMapAttachRuntime = new ItemWorldFullMapAttachRuntime({
      ...this.createFullMapAttachContainerDeps(),
      ...this.createFullMapAttachStateDeps(),
      ...this.createFullMapAttachSpawnDeps(),
      ...this.createFullMapAttachCameraDeps(),
    });
  }

  private createFullMapAttachContainerDeps() {
    return {
      getSceneContainer: () => this.container,
      getFullMapContainer: () => this.fullMapContainer,
      getPlayer: () => this.player,
    };
  }

  private createFullMapAttachStateDeps() {
    return {
      setRoomData: (grid: any) => { this.roomData = grid; },
    };
  }

  private createFullMapAttachSpawnDeps() {
    return {
      spawnCurrentCell: () => this.runtimeCellSpawner.spawnForCell(this.currentCol, this.currentRow),
      updateCellVisibility: () => this.updateCellVisibility(),
    };
  }

  private createFullMapAttachCameraDeps() {
    return {
      getCamera: () => this.game.camera,
    };
  }

  private wireFullMapRoomApplyRuntime(): void {
    this.fullMapRoomApplyRuntime = new ItemWorldFullMapRoomApplyRuntime({
      ...this.createFullMapRoomApplyGridDeps(),
      ...this.createFullMapRoomApplyMaterializationDeps(),
      ...this.createFullMapRoomApplySpawnCaptureDeps(),
    });
  }

  private createFullMapRoomApplyGridDeps() {
    return {
      getUnifiedGrid: () => this.unifiedGrid,
      getFullGrid: () => this.fullGrid,
      getCurrentCell: () => ({ col: this.currentCol, absRow: this.currentRow }),
    };
  }

  private createFullMapRoomApplyMaterializationDeps() {
    return {
      assignRoomType: (room: Parameters<ItemWorldFullMapRoomApplyRuntime['apply']>[0]) => {
        const { cell, ldtkLevel, col, absRow } = room;
        this.roomTypeRuntime.assign(cell, ldtkLevel, col, absRow);
      },
      applyRoomCollision: (room: Parameters<ItemWorldFullMapRoomApplyRuntime['apply']>[0], fullGrid: number[][]) => {
        const { cell, ldtkLevel, col, absRow } = room;
        this.fullGridRuntime.applyRoomCollision(fullGrid, cell, ldtkLevel, col, absRow);
      },
      setCellVisualRecord: (record: Parameters<ItemWorldCellVisualRuntime['setRecord']>[0]) => this.cellVisualRuntime.setRecord(record),
    };
  }

  private createFullMapRoomApplySpawnCaptureDeps() {
    return {
      captureRewardSpawners: (room: Parameters<ItemWorldFullMapRoomApplyRuntime['apply']>[0]) => {
        const { ldtkLevel, col, absRow, roomX, roomY } = room;
        this.roomRewardSpawner.captureSpawnersForRoom(ldtkLevel, col, absRow, roomX, roomY);
      },
      capturePlayerSpawn: (
        unifiedGrid: Parameters<ItemWorldPlayerSpawnRuntime['captureFromRoom']>[0],
        ldtkLevel: Parameters<ItemWorldPlayerSpawnRuntime['captureFromRoom']>[1],
        col: number,
        absRow: number,
        roomX: number,
        roomY: number,
      ) => {
        this.playerSpawnRuntime.captureFromRoom(unifiedGrid, ldtkLevel, col, absRow, roomX, roomY);
      },
    };
  }
  private wireFullMapBuildPipelineRuntime(): void {
    this.wireProceduralDecorRuntime();
    this.wireFullMapBuildRuntime();
  }

  private wireProceduralDecorRuntime(): void {
    this.proceduralDecorRuntime = new ItemWorldProceduralDecorRuntime({
      ...this.createProceduralDecorAggregateDeps(),
      ...this.createProceduralDecorMutationDeps(),
    });
  }

  private createProceduralDecorAggregateDeps() {
    return {
      getNaturalAggregate: () => this.decoAggregate,
      getArtificialAggregate: () => this.artificialDecoAggregate,
      getStructureAggregate: () => this.structAggregate,
    };
  }

  private createProceduralDecorMutationDeps() {
    return {
      getGrassClumpFire: () => this.grassClumpFire,
      getTileMutator: () => this.tileMutator,
    };
  }

  private wireFullMapBuildRuntime(): void {
    this.fullMapBuildRuntime = new ItemWorldFullMapBuildRuntime({
      ...this.createFullMapBuildGenerationDeps(),
      ...this.createFullMapBuildTemplateAndLayerDeps(),
      ...this.createFullMapBuildGridStateDeps(),
      ...this.createFullMapBuildFinalizeDeps(),
    },
    this.buildStateRuntime,
    this.fullGridRuntime,
    this.proceduralDecorRuntime,
    this.fullMapAttachRuntime,
    this.fullMapRoomApplyRuntime);
  }

  private createFullMapBuildGenerationDeps() {
    return {
      getUnifiedGrid: () => this.unifiedGrid,
      getItemUid: () => this.item.uid,
      getDebugGenerationSeedOffset: () => this.debugGenerationSeedOffset,
      getCurrentStratumIndex: () => this.currentStratumIndex,
      getTotalStrata: () => this.strataConfig.strata.length,
      getThemeId: () => this.item.def.themeId,
      isProceduralDecoEnabled: () => this._procDecoEnabled,
    };
  }

  private createFullMapBuildTemplateAndLayerDeps() {
    return {
      getTemplateCount: () => this.ldtkTemplates.length,
      hasRequiredTemplateRenderingState: () => !!this.ldtkRenderer && !!this.atlas,
      pickTemplate: (
        cell: Parameters<ItemWorldTemplatePickerRuntime['pick']>[0],
        rng: Parameters<ItemWorldTemplatePickerRuntime['pick']>[1],
      ) => this.templatePickerRuntime.pick(cell, rng),
      rebuildFullMapLayers: (depthRatio: number) => this.fullMapLayerRebuildRuntime.rebuild(depthRatio),
    };
  }

  private createFullMapBuildGridStateDeps() {
    return {
      setFullGrid: (grid: number[][]) => { this.fullGrid = grid; },
      getFullGrid: () => this.fullGrid,
      clearStaticEntities: () => this.clearStaticEntities(),
      persistRoomState: () => {
        this.persistRoomState();
      },
    };
  }

  private createFullMapBuildFinalizeDeps() {
    return {
      resetAndSpawnBreakableProps: () => {
        this.breakablePropRuntime.resetAndSpawnProcedural({
          currentStratumIndex: this.currentStratumIndex,
          itemIdLength: this.item.def.id.length,
          currentCol: this.currentCol,
          currentRow: this.currentRow,
        });
      },
      log: (message: string) => Debug.log(message),
    };
  }
  private wireRoomStateAndSpawnRuntimes(): void {
    this.wireRoomStateAndPlayerSpawnRuntimes();
    this.wireRoomSpawnFlowRuntimes();
  }
  private wireRoomStateAndPlayerSpawnRuntimes(): void {
    this.wireRoomStateRuntime();
    this.wirePlayerSpawnRuntime();
    this.wireRoomTypeRuntime();
  }

  private wireRoomStateRuntime(): void {
    this.roomStateRuntime = new ItemWorldRoomStateRuntime();
  }

  private wirePlayerSpawnRuntime(): void {
    this.playerSpawnRuntime = new ItemWorldPlayerSpawnRuntime({
      ...this.createPlayerSpawnWorldDeps(),
      ...this.createPlayerSpawnActorDeps(),
      ...this.createPlayerSpawnCameraDeps(),
      ...this.createPlayerSpawnResolverDeps(),
    });
  }

  private createPlayerSpawnWorldDeps() {
    return {
      getCollisionGrid: () => this.fullGrid,
    };
  }

  private createPlayerSpawnActorDeps() {
    return {
      getPlayer: () => this.player,
      getPlayerSize: () => ({ width: this.player.width, height: this.player.height }),
    };
  }

  private createPlayerSpawnCameraDeps() {
    return {
      snapCamera: (x: number, y: number) => this.game.camera.snap(x, y),
    };
  }

  private createPlayerSpawnResolverDeps() {
    return {
      computeSpawnPoints: (grid: number[][], roomLeftTile: number, roomTopTile: number, roomWidthTiles?: number, roomHeightTiles?: number) => (
        this.spawnController.computeSpawnPoints(grid, roomLeftTile, roomTopTile, roomWidthTiles, roomHeightTiles)
      ),
    };
  }

  private wireRoomTypeRuntime(): void {
    this.roomTypeRuntime = new ItemWorldRoomTypeRuntime({
      ...this.createRoomTypeQueryDeps(),
    });
  }

  private createRoomTypeQueryDeps(): any {
    return {
      isStratumEndRoom: (col: number, absRow: number) => this.roomQueryRuntime.isStratumEndRoom(col, absRow),
    };
  }

  private wireRoomSpawnFlowRuntimes(): void {
    this.wireNeighborPreSpawnRuntime();
    this.wireRoomSpawnRuntime();
  }

  private wireNeighborPreSpawnRuntime(): void {
    this.neighborPreSpawnRuntime = new ItemWorldNeighborPreSpawnRuntime({
      ...this.createNeighborPreSpawnGridDeps(),
      ...this.createNeighborPreSpawnPressureDeps(),
      ...this.createNeighborPreSpawnSpawnDeps(),
      ...this.createNeighborPreSpawnStateDeps(),
    });
  }

  private createNeighborPreSpawnGridDeps() {
    return {
      getUnifiedGrid: () => this.unifiedGrid,
      getSpawnedRooms: () => this.roomSpawnState.spawnedRooms,
    };
  }

  private createNeighborPreSpawnPressureDeps() {
    return {
      getEnemyCount: () => this.enemyRegistry.enemies.length,
    };
  }

  private createNeighborPreSpawnSpawnDeps() {
    return {
      spawnRuntimeCell: (col: number, absRow: number) => this.runtimeCellSpawner.spawnForCell(col, absRow),
      spawnEnemiesInRoom: (col: number, absRow: number) => this.roomSpawnRuntime.spawnForRoom(col, absRow),
    };
  }

  private createNeighborPreSpawnStateDeps() {
    return {
      getRoomDebugLabel: (col: number, absRow: number) => this.roomTypeRuntime.getDebugLabel(col, absRow),
      persistRoomState: () => this.persistRoomState(),
    };
  }

  private wireRoomSpawnRuntime(): void {
    this.roomSpawnRuntime = new ItemWorldRoomSpawnRuntime({
      ...this.createRoomSpawnStateDeps(),
      ...this.createRoomSpawnSafeRoomDeps(),
      ...this.createRoomSpawnEnemyDeps(),
      ...this.createRoomSpawnRewardDeps(),
    });
  }

  private createRoomSpawnStateDeps() {
    return {
      getUnifiedGrid: () => this.unifiedGrid,
      isStartSpawnDone: () => this.entryGateState.startSpawnDone,
      isStratumEndRoom: (col: number, absRow: number) => this.roomQueryRuntime.isStratumEndRoom(col, absRow),
      markCleared: (cell: any, recoveryBonus: any) => this.roomClearRuntime.markCleared(cell, recoveryBonus),
      hasMemoryRoom: (col: number, absRow: number) => this.memoryRoomPlacementRuntime.has(col, absRow),
      getRoomType: (col: number, absRow: number) => this.roomTypeRuntime.get(col, absRow),
    };
  }

  private createRoomSpawnSafeRoomDeps() {
    return {
      spawnAmbientForSafeRoom: (role: any, col: number, absRow: number) => {
        this.safeRoomResidentSpawnRuntime.spawnAmbientForRoom(role, col, absRow, this.roomRectRuntime.getRoomRectTiles(col, absRow));
      },
    };
  }

  private createRoomSpawnEnemyDeps() {
    return {
      createSpawnContext: (col: number, absRow: number, isBossRoom: boolean) => (
        this.enemySpawnRuntime.createContext(col, absRow, isBossRoom, this.roomRectRuntime.getRoomRectTiles(col, absRow))
      ),
      spawnAuthoredMonsters: (col: number, absRow: number) => {
        const record = this.cellVisualRuntime.getRecord(col + ':' + absRow);
        if (!record) return 0;
        return this.enemySpawnRuntime.spawnAuthoredPrologueMonsters(record.ldtkLevel, col, absRow, record.roomX, record.roomY);
      },
      spawnEncounter: (args: any) => this.enemyEncounterRuntime.spawnForRoom(args),
    };
  }

  private createRoomSpawnRewardDeps() {
    return {
      spawnRoomRewards: (col: number, absRow: number) => this.roomRewardSpawner.spawnForRoom(col, absRow),
    };
  }

  private wireCellAndStaticEntityRuntimes(): void {
    this.wireCellGeometryRuntimes();
    this.wireRuntimeCellVisibilityRuntimes();
    this.wireStaticEntitySpawnerRuntime();
    this.wireRewardAndDestructionRuntimes();
  }
  private wireCellGeometryRuntimes(): void {
    this.wireCellVisualRuntime();
    this.wireRoomRectRuntime();
  }

  private wireCellVisualRuntime(): void {
    this.cellVisualRuntime = new ItemWorldCellVisualRuntime({
      ...this.createCellVisualWorldDeps(),
      ...this.createCellVisualThemeDeps(),
      ...this.createCellVisualMapDeps(),
      ...this.createCellVisualAggregateDeps(),
    });
  }

  private createCellVisualWorldDeps() {
    return {
      getCollisionGrid: () => this.fullGrid,
    };
  }

  private createCellVisualThemeDeps() {
    return {
      getAtlases: () => this.atlases,
      getThemeSlug: () => this._themeSlug,
      getTemperament: () => this.item.def.temperamentPrimary,
    };
  }

  private createCellVisualMapDeps() {
    return {
      getMapSize: () => ({
        totalCols: this.unifiedGrid.totalWidth,
        totalRows: this.unifiedGrid.totalHeight,
      }),
    };
  }

  private createCellVisualAggregateDeps() {
    return {
      getAggregates: () => ({
        bg: this.bgAggregate,
        interior: this.interiorAggregate,
        wall: this.wallAggregate,
        special: this.specialAggregate,
        shadow: this.shadowAggregate,
        seal: this.sealAggregate,
      }),
    };
  }

  private wireRoomRectRuntime(): void {
    this.roomRectRuntime = new ItemWorldRoomRectRuntime(
      this.createRoomRectSourceDeps(),
      this.createRoomRectFallbackConfig(),
    );
  }

  private createRoomRectSourceDeps() {
    return {
      getUnifiedGrid: () => this.unifiedGrid,
      getCellVisualRecord: (key: string) => this.cellVisualRuntime.getRecord(key),
    };
  }

  private createRoomRectFallbackConfig() {
    return {
      tileSize: TILE_SIZE,
      fallbackRoomWidthTiles: IW_ROOM_W_TILES,
      fallbackRoomHeightTiles: IW_ROOM_H_TILES,
      fallbackRoomWidthPx: IW_ROOM_W_PX,
      fallbackRoomHeightPx: IW_ROOM_H_PX,
    };
  }

  private wireRuntimeCellVisibilityRuntimes(): void {
    this.wireRuntimeCellSpawner();
    this.wireCellVisibilityRuntime();
  }

  private wireRuntimeCellSpawner(): void {
    this.runtimeCellSpawner = new ItemWorldRuntimeCellSpawner({
      getCellRecord: (key) => this.cellVisualRuntime.getRecord(key),
      getCollisionGrid: () => this.fullGrid,
      getContainers: () => this.containerRegistry.getContainers(),
      getBurnableProps: () => this.burnablePropRegistry.props,
      getFluidSpawners: () => this.fluidSpawners,
      getTileMutator: () => this.tileMutator,
      getEntityLayer: () => this.entityLayer,
      getTemperament: () => this.item.def.temperamentPrimary,
      getItemUid: () => this.item.uid,
      spawnStaticEntitiesForRoom: (level, roomX, roomY) => this.staticEntitySpawner.spawnForRoom(level, roomX, roomY),
    });
  }

  private wireCellVisibilityRuntime(): void {
    this.cellVisibilityRuntime = new ItemWorldCellVisibilityRuntime({
      ...this.createCellVisibilityVisualDeps(),
      ...this.createCellVisibilityCameraDeps(),
      ...this.createCellVisibilityFluidDeps(),
      ...this.createCellVisibilityHazardDeps(),
    });
  }

  private createCellVisibilityVisualDeps() {
    return {
      getCellVisualRuntime: () => this.cellVisualRuntime,
      getRuntimeCellSpawner: () => this.runtimeCellSpawner,
    };
  }

  private createCellVisibilityCameraDeps() {
    return {
      getCamera: () => this.game.camera,
    };
  }

  private createCellVisibilityFluidDeps() {
    return {
      isFluidSystemReady: () => this.fluidSystemReady,
      getFluidSystem: () => this.fluidSystem,
      getFullGrid: () => this.fullGrid,
    };
  }

  private createCellVisibilityHazardDeps() {
    return {
      getTileHazardRuntime: () => this.tileHazardRuntime,
    };
  }

  private wireStaticEntitySpawnerRuntime(): void {
    this.staticEntitySpawner = new ItemWorldStaticEntitySpawner({
      ...this.createStaticEntityWorldDeps(),
      ...this.createStaticEntityRegistryDeps(),
      ...this.createStaticEntitySpecialSpawnDeps(),
    });
  }

  private createStaticEntityWorldDeps() {
    return {
      getCollisionGrid: () => this.fullGrid,
      getEntityLayer: () => this.entityLayer,
      getBuildingLayer: () => this.buildingLayer,
      getWallPaletteFilter: () => this.wallPaletteFilter,
      getItem: () => this.item,
    };
  }

  private createStaticEntityRegistryDeps() {
    return {
      getBuildings: () => this.staticEntityRegistry.buildings,
      getSpikes: () => this.staticEntityRegistry.spikes,
      getCrackedFloors: () => this.staticEntityRegistry.crackedFloors,
      getCollapsingPlatforms: () => this.staticEntityRegistry.collapsingPlatforms,
      getGrowingWalls: () => this.staticEntityRegistry.growingWalls,
      getSwitches: () => this.staticEntityRegistry.switches,
      getLockedDoors: () => this.staticEntityRegistry.lockedDoors,
      getItemDisplays: () => this.staticEntityRegistry.itemDisplays,
    };
  }

  private createStaticEntitySpecialSpawnDeps() {
    return {
      spawnMemoryFromEntity: (entity: LdtkEntity, offX: number, offY: number) => {
        this.memoryTriggerRuntime.spawnFromEntity(entity, offX, offY);
      },
      registerPrologueEndTrigger: (entity: LdtkEntity, offX: number, offY: number) => {
        this.prologueEndRuntime.register(entity, offX, offY);
      },
      addCameraZone: (zone: CameraZone) => this.cameraZoneRuntime.addZone(zone),
      spawnAnvil: (x: number, y: number) => {
        this.itemWorldAnvilRuntime.spawn(x, y);
      },
    };
  }

  private wireRewardAndDestructionRuntimes(): void {
    this.wireRoomRewardSpawner();
    this.wireBreakablePropRuntime();
    this.wireContainerDestructionRuntime();
  }

  private wireRoomRewardSpawner(): void {
    this.roomRewardSpawner = new ItemWorldRoomRewardSpawner({
      getUnifiedGrid: () => this.unifiedGrid,
      getItem: () => this.item,
      getPlayerMaxHp: () => this.player.maxHp,
      getRoomData: () => this.roomData,
      addHealingPickup: (pickup) => this.pickupRuntime.addHealingPickup(pickup),
      addGoldPickup: (pickup) => this.pickupRuntime.addGoldPickup(pickup),
    });
  }

  private wireBreakablePropRuntime(): void {
    this.breakablePropRuntime = new ItemWorldBreakablePropRuntime({
      ...this.createBreakablePropWorldDeps(),
      ...this.createBreakablePropRegistryDeps(),
      ...this.createBreakablePropRewardDeps(),
      ...this.createBreakablePropFeedbackDeps(),
      ...this.createBreakablePropMutationDeps(),
    });
  }

  private createBreakablePropWorldDeps() {
    return {
      game: this.game,
      getPlayer: () => this.player,
      getRoomData: () => this.roomData,
      getEntityLayer: () => this.entityLayer,
    };
  }

  private createBreakablePropRegistryDeps() {
    return {
      getBreakableProps: () => this.staticEntityRegistry.breakableProps,
    };
  }

  private createBreakablePropRewardDeps() {
    return {
      addGoldPickup: (pickup: any) => this.pickupRuntime.addGoldPickup(pickup),
    };
  }

  private createBreakablePropFeedbackDeps() {
    return {
      getPropShatter: () => this.propShatter,
      getHitSparks: () => this.hitSparks,
    };
  }

  private createBreakablePropMutationDeps() {
    return {
      getTileMutator: () => this.tileMutator,
    };
  }

  private wireContainerDestructionRuntime(): void {
    this.containerDestructionRuntime = new ContainerDestructionRuntime({
      ...this.createContainerDestructionCoreDeps(),
      ...this.createContainerDestructionFeedbackDeps(),
    });
  }

  private createContainerDestructionCoreDeps(): any {
    return {
      game: this.game,
    };
  }

  private createContainerDestructionFeedbackDeps(): any {
    return {
      getPropShatter: () => this.propShatter,
    };
  }

  private wireEnemyAndHudRuntimes(): void {
    this.wireEnemyRoomRuntimes();
    this.wireDevWeatherAndPickerRuntimes();
    this.wireCameraHudProgressionRuntimes();
  }
  private wireEnemyRoomRuntimes(): void {
    this.wireEnemySpawnRuntime();
    this.wireEnemyEncounterRuntime();
    this.wireRoomClearRuntime();
    this.wireMemoryShardSpawnRuntime();
  }

  private wireEnemySpawnRuntime(): void {
    this.enemySpawnRuntime = new ItemWorldEnemySpawnRuntime({
      ...this.createEnemySpawnWorldDeps(),
      ...this.createEnemySpawnActorDeps(),
      ...this.createEnemySpawnRegistryDeps(),
      ...this.createEnemySpawnRoomStateDeps(),
      ...this.createEnemySpawnControllerDeps(),
    });
  }

  private createEnemySpawnWorldDeps() {
    return {
      getCollisionGrid: () => this.fullGrid,
    };
  }

  private createEnemySpawnActorDeps() {
    return {
      getPlayer: () => this.player,
    };
  }

  private createEnemySpawnRegistryDeps() {
    return {
      addEnemy: (enemy: any) => this.enemyRegistry.add(enemy, this.entityLayer),
    };
  }

  private createEnemySpawnRoomStateDeps() {
    return {
      getRoomEnemyCount: () => this.roomSpawnState.roomEnemyCount,
    };
  }

  private createEnemySpawnControllerDeps() {
    return {
      getSpawnController: () => this.spawnController,
    };
  }

  private wireEnemyEncounterRuntime(): void {
    this.enemyEncounterRuntime = new ItemWorldEnemyEncounterRuntime({
      ...this.createEnemyEncounterProgressDeps(),
      ...this.createEnemyEncounterSpatialDeps(),
      ...this.createEnemyEncounterSpawnerDeps(),
    });
  }

  private createEnemyEncounterProgressDeps() {
    return {
      getItem: () => this.item,
      getCycle: () => this.progress?.cycle ?? 0,
      getStrataConfig: () => this.strataConfig,
    };
  }

  private createEnemyEncounterSpatialDeps() {
    return {
      getStartRoom: () => this.unifiedGrid.startRoom,
      getCollisionGrid: () => this.fullGrid,
    };
  }

  private createEnemyEncounterSpawnerDeps() {
    return {
      getSpawnController: () => this.spawnController,
      getEnemySpawnRuntime: () => this.enemySpawnRuntime,
      getMemoryShardSpawnRuntime: () => this.memoryShardSpawnRuntime,
    };
  }

  private wireRoomClearRuntime(): void {
    this.roomClearRuntime = new ItemWorldRoomClearRuntime({
      ...this.createRoomClearItemDeps(),
      ...this.createRoomClearStatsDeps(),
      ...this.createRoomClearPersistenceDeps(),
    });
  }

  private createRoomClearItemDeps() {
    return {
      getItem: () => this.item,
    };
  }

  private createRoomClearStatsDeps() {
    return {
      incrementRoomsCleared: () => this.runStats.incrementRoomsCleared(),
    };
  }

  private createRoomClearPersistenceDeps() {
    return {
      persistRoomState: () => this.persistRoomState(),
    };
  }

  private wireMemoryShardSpawnRuntime(): void {
    this.memoryShardSpawnRuntime = new ItemWorldMemoryShardSpawnRuntime({
      ...this.createMemoryShardSpawnItemDeps(),
      ...this.createMemoryShardSpawnFeedbackDeps(),
      ...this.createMemoryShardSpawnCaptureDeps(),
      ...this.createMemoryShardSpawnLoreDeps(),
      ...this.createMemoryShardSpawnEnemyDeps(),
    });
  }

  private createMemoryShardSpawnItemDeps() {
    return {
      getItem: () => this.item,
    };
  }

  private createMemoryShardSpawnFeedbackDeps() {
    return {
      getDamageNumbers: () => this.dmgNumbers,
      updateHudText: () => this.hudRuntime.updateText(),
      getScreenFlash: () => this.screenFlash,
    };
  }

  private createMemoryShardSpawnCaptureDeps() {
    return {
      getCaptureOrbRuntime: () => this.captureOrbRuntime,
    };
  }

  private createMemoryShardSpawnLoreDeps() {
    return {
      getLoreDisplay: () => this.loreDisplay,
      getEgoUnlockedEvents: () => this.egoUnlockedEvents,
    };
  }

  private createMemoryShardSpawnEnemyDeps() {
    return {
      getEnemySpawnRuntime: () => this.enemySpawnRuntime,
    };
  }

  private wireDevWeatherAndPickerRuntimes(): void {
    this.wireDevOverlayRuntime();
    this.wireDebugInputRuntime();
    this.wireWeatherRuntime();
    this.wireStratumPickerRuntime();
  }

  private wireDevOverlayRuntime(): void {
    this.devOverlayRuntime = new ItemWorldDevOverlayRuntime({
      ...this.createDevOverlayCoreDeps(),
      ...this.createDevOverlayGraphDeps(),
      ...this.createDevOverlayItemDeps(),
      ...this.createDevOverlayConfigDeps(),
    });
  }

  private createDevOverlayCoreDeps(): any {
    return {
      game: this.game,
    };
  }

  private createDevOverlayGraphDeps(): any {
    return {
      getRoomGraphs: () => this.roomGraphs,
    };
  }

  private createDevOverlayItemDeps(): any {
    return {
      getItemRarity: () => this.item.rarity,
      getItemUid: () => this.item.uid,
      getWeaponTopologyOverride: () => this.item.def.topologyOverride,
    };
  }

  private createDevOverlayConfigDeps(): any {
    return {
      getStrataConfig: () => this.strataConfig,
    };
  }

  private wireDebugInputRuntime(): void {
    this.debugInputRuntime = new ItemWorldDebugInputRuntime({
      ...this.createDebugInputCoreDeps(),
      ...this.createDebugInputWorldDeps(),
      ...this.createDebugInputFeedbackDeps(),
      ...this.createDebugInputElementDeps(),
      ...this.createDebugInputMapDeps(),
    });
  }

  private createDebugInputCoreDeps() {
    return {
      game: this.game,
    };
  }

  private createDebugInputWorldDeps() {
    return {
      getPlayer: () => this.player,
      getEntityLayer: () => this.entityLayer,
      getContainers: () => this.containerRegistry.getContainers(),
    };
  }

  private createDebugInputFeedbackDeps() {
    return {
      showToast: (message: string, color?: number) => this.toast.show(message, color),
    };
  }

  private createDebugInputElementDeps() {
    return {
      onDebugIgniteAtPlayer: () => this.egoShardImpactRuntime.debugIgniteAtPlayer(),
      onDebugFreezeAtPlayer: () => this.egoShardImpactRuntime.debugFreezeAtPlayer(),
      onDebugThunderAtPlayer: () => this.egoShardImpactRuntime.debugThunderAtPlayer(),
    };
  }

  private createDebugInputMapDeps() {
    return {
      onDebugRegenerateMap: () => this.debugMapRefreshRuntime.regenerate(),
    };
  }

  private wireWeatherRuntime(): void {
    this.weatherRuntime = new ItemWorldWeatherRuntime({
      ...this.createWeatherCoreDeps(),
      ...this.createWeatherRenderDeps(),
      ...this.createWeatherThemeDeps(),
      ...this.createWeatherWorldDeps(),
    });
  }

  private createWeatherCoreDeps() {
    return {
      game: this.game,
      tileSize: TILE_SIZE,
    };
  }

  private createWeatherRenderDeps() {
    return {
      getWeatherLayer: () => this.weatherLayer,
    };
  }

  private createWeatherThemeDeps() {
    return {
      getThemeSlug: () => this._themeSlug,
      getTemperament: () => this.item.def.temperamentPrimary,
    };
  }

  private createWeatherWorldDeps() {
    return {
      getCollisionGrid: () => this.fullGrid,
    };
  }

  private wireStratumPickerRuntime(): void {
    this.stratumPickerRuntime = new ItemWorldStratumPickerRuntime({
      ...this.createStratumPickerCoreDeps(),
      ...this.createStratumPickerProgressDeps(),
      ...this.createStratumPickerActionDeps(),
    });
  }

  private createStratumPickerCoreDeps() {
    return {
      game: this.game,
      getHudSkin: () => this.hudSkin,
    };
  }

  private createStratumPickerProgressDeps() {
    return {
      getItem: () => this.item,
      getProgress: () => this.progress,
      getStrataConfig: () => this.strataConfig,
      getClearedStrataFlags: () => this.hudRuntime.getClearedStrataFlags(),
    };
  }

  private createStratumPickerActionDeps() {
    return {
      onPick: (stratumIndex: number) => this.stratumJumpRuntime.jumpTo(stratumIndex),
    };
  }

  private wireCameraHudProgressionRuntimes(): void {
    this.wireCameraZoneRuntime();
    this.wireBossHpRuntime();
    this.wireRoomProgressionRuntime();
  }

  private wireCameraZoneRuntime(): void {
    this.cameraZoneRuntime = new CameraZoneRuntime({
      ...this.createCameraZoneCoreDeps(),
      ...this.createCameraZoneTargetDeps(),
    });
  }

  private createCameraZoneCoreDeps(): any {
    return {
      camera: this.game.camera,
    };
  }

  private createCameraZoneTargetDeps(): any {
    return {
      getPlayerCenter: () => ({
        x: this.player.x + this.player.width / 2,
        y: this.player.y + this.player.height / 2,
      }),
    };
  }

  private wireBossHpRuntime(): void {
    this.bossHpRuntime = new BossHpRuntime({
      ...this.createBossHpHudDeps(),
      ...this.createBossHpEnemyDeps(),
      ...this.createBossHpEngagementDeps(),
    });
  }

  private createBossHpHudDeps(): any {
    return {
      getHud: () => this.hud,
      defaultBossName: t('ui.hud.boss_default'),
    };
  }

  private createBossHpEnemyDeps(): any {
    return {
      getEnemies: () => this.enemyRegistry.enemies,
    };
  }

  private createBossHpEngagementDeps(): any {
    return {
      isExtraEngaged: () => this.roomQueryRuntime.isCurrentRoomBossRoom() && this.roomQueryRuntime.hasAliveBossEnemy(),
    };
  }

  private wireRoomProgressionRuntime(): void {
    this.roomProgressionRuntime = new ItemWorldRoomProgressionRuntime({
      ...this.createRoomProgressionSpatialDeps(),
      ...this.createRoomProgressionStateDeps(),
      ...this.createRoomProgressionSpawnDeps(),
      ...this.createRoomProgressionFeedbackDeps(),
    });
  }

  private createRoomProgressionSpatialDeps() {
    return {
      getPlayerFootPoint: () => ({
        x: this.player.x + this.player.width / 2,
        y: this.player.y + this.player.height,
      }),
      findRoomAtPixel: (x: number, y: number) => this.roomRectRuntime.findRoomAtPixel(x, y),
      getUnifiedGrid: () => this.unifiedGrid,
    };
  }

  private createRoomProgressionStateDeps() {
    return {
      getCurrentRoom: () => ({ col: this.currentCol, row: this.currentRow }),
      setCurrentRoom: (col: number, row: number) => {
        this.currentCol = col;
        this.currentRow = row;
      },
      getCurrentStratumIndex: () => this.currentStratumIndex,
      setCurrentStratum: (stratumIndex: number) => {
        this.currentStratumIndex = stratumIndex;
        this.currentStratumDef = this.strataConfig.strata[stratumIndex];
      },
      getTotalStrata: () => this.strataConfig.strata.length,
      getProgress: () => this.progress,
      persistRoomState: () => this.persistRoomState(),
    };
  }

  private createRoomProgressionSpawnDeps() {
    return {
      getRoomSpawnState: () => this.roomSpawnState,
      getRoomSpawnRuntime: () => this.roomSpawnRuntime,
      getNeighborPreSpawnRuntime: () => this.neighborPreSpawnRuntime,
      hasAnyEnemy: () => this.enemyRegistry.hasAny(),
    };
  }

  private createRoomProgressionFeedbackDeps() {
    return {
      fireMonsterVisible: () => this.egoDialogueRuntime.fireMonsterVisible(),
      showToast: (message: string, color: number) => this.toast.show(message, color),
    };
  }
  private wireVfxAndFluidReaction(): void {
    const vfxManagers = createItemWorldVfxManagers(this.game, this.entityLayer, GAME_WIDTH, GAME_HEIGHT);
    this.assignCoreVfxManagers(vfxManagers);
    this.egoShardRuntime.initialize(this.entityLayer);
    this.bindFluidReactionRuntime();
    this.bindTileMutationReactions();
    this.assignAmbientVfxManagers(vfxManagers);
  }

  private assignCoreVfxManagers(vfxManagers: ReturnType<typeof createItemWorldVfxManagers>): void {
    this.assignCombatVfxManagers(vfxManagers);
    this.assignMovementVfxManagers(vfxManagers);
    this.assignFluidImpactVfxManagers(vfxManagers);
  }

  private assignCombatVfxManagers(vfxManagers: ReturnType<typeof createItemWorldVfxManagers>): void {
    this.dmgNumbers = vfxManagers.dmgNumbers;
    this.hitSparks = vfxManagers.hitSparks;
    this.propShatter = vfxManagers.propShatter;
    this.deathParticles = vfxManagers.deathParticles;
    this.flaskBurst = vfxManagers.flaskBurst;
    this.surgeVfx = vfxManagers.surgeVfx;
    this.criticalHighlight = vfxManagers.criticalHighlight;
    this.hitBloodSpray = vfxManagers.hitBloodSpray;
  }

  private assignMovementVfxManagers(vfxManagers: ReturnType<typeof createItemWorldVfxManagers>): void {
    this.landingDust = vfxManagers.landingDust;
    this.dashAfterimage = vfxManagers.dashAfterimage;
    this.dashBoostPuff = vfxManagers.dashBoostPuff;
    this.doubleJumpRing = vfxManagers.doubleJumpRing;
    this.wallJumpDust = vfxManagers.wallJumpDust;
    this.jumpTakeoff = vfxManagers.jumpTakeoff;
    this.wallSlideDust = vfxManagers.wallSlideDust;
    this.footstepPuff = vfxManagers.footstepPuff;
    this.diveLandImpact = vfxManagers.diveLandImpact;
  }

  private assignFluidImpactVfxManagers(vfxManagers: ReturnType<typeof createItemWorldVfxManagers>): void {
    this.waterSplash = vfxManagers.waterSplash;
    this.steamPuff = vfxManagers.steamPuff;
    this.ashRemnant = vfxManagers.ashRemnant;
    this.fluidResidue = vfxManagers.fluidResidue;
  }

  private bindFluidReactionRuntime(): void {
    new FluidReactionRuntime({
      getPlayer: () => this.player,
      getEnemies: () => this.enemyRegistry.enemies,
      getContainers: () => this.containerRegistry.getContainers(),
      getCollisionGrid: () => this.fullGrid,
      getFluidSystem: () => this.fluidSystem,
      getFluidResidue: () => this.fluidResidue,
      getTileMutator: () => this.tileMutator,
      getSteamPuff: () => this.steamPuff,
      getDamageNumbers: () => this.dmgNumbers,
      getHitSparks: () => this.hitSparks,
      shakeCamera: (strength) => this.game.camera.shake(strength),
    }).bind();
  }

  private bindTileMutationReactions(): void {
    // Wall-tile mutations (ice -> 물로 melt, acid -> 벽 corrode, oil/wood
    // burnout) invalidate the static tile layer AND can introduce new
    // fluid cells (ice melt -> water). Coalesce same-frame events into a
    // single refresh in update().
    this.tileMutator.onWallTileChanged = (gx, gy, originalTile) => {
      this.tileHazardRuntime.markFluidGridDirty();
      // If the mutation produced an air cell, paint over the baked-in
      // wall sprite that was aggregated at buildFullMap. New fluid cells
      // (ice 가 녹은 물) don't need a mask ? FluidSystem will draw over the
      // wall sprite via the fluid mesh. OIL also doesn't need a mask
      // because its wall sprite was filtered out of the aggregate at
      // bake time (isFluidHiddenTile) ? masking would leave a fake
      // residue rectangle where the fluid simply evaporated.
      const v = this.fullGrid[gy]?.[gx];
      if (v === 0 && originalTile !== TILE_OIL) {
        this.fullMapLayerRuntime.markAirMutation(gx, gy);
      } else if (v === TILE_WALL && originalTile === TILE_MAGMA) {
        this.fullMapLayerRuntime.markSolidifiedWall(gx, gy, this.fullGrid, TILE_WALL);
      }
    };
  }

  private assignAmbientVfxManagers(vfxManagers: ReturnType<typeof createItemWorldVfxManagers>): void {
    this.waterBubbles = vfxManagers.waterBubbles;
    this.dropThroughDust = vfxManagers.dropThroughDust;
    this.iceSkidStreak = vfxManagers.iceSkidStreak;
    this.itemPickupGlow = vfxManagers.itemPickupGlow;
    this.lowHpVignette = vfxManagers.lowHpVignette;
  }
  private wireGameplayEntityRuntimes(): void {
    this.wireMovementVfxRuntime();
    this.wireContainerPhysicsRuntime();
    this.wirePickupAndProjectileRuntimes();
    this.wireEntityCleanupRuntime();
    this.wireEnemyContactRuntime();
    this.wireStaticEntityRuntime();
  }
  private wireMovementVfxRuntime(): void {
    this.movementVfxRuntime = new ItemWorldMovementVfxRuntime({
      ...this.createMovementVfxActorDeps(),
      ...this.createMovementVfxWorldDeps(),
      ...this.createMovementVfxManagerDeps(),
    });
  }

  private createMovementVfxManagerDeps(): any {
    return {
      managers: this.createMovementVfxManagers(),
    };
  }

  private createMovementVfxActorDeps() {
    return {
      getPlayer: () => this.player,
      getEnemies: () => this.enemyRegistry.enemies,
    };
  }

  private createMovementVfxWorldDeps() {
    return {
      getCollisionGrid: () => this.fullGrid,
      getFluidSystem: () => this.fluidSystem,
      getFluidSpawners: () => this.fluidSpawners,
      getDamageNumbers: () => this.dmgNumbers,
    };
  }

  private createMovementVfxManagers() {
    return {
      ...this.createMovementVfxLocomotionManagers(),
      ...this.createMovementVfxCombatManagers(),
      ...this.createMovementVfxFluidManagers(),
      ...this.createMovementVfxPassiveManagers(),
    };
  }

  private createMovementVfxLocomotionManagers() {
    return {
      landingDust: this.landingDust,
      dashAfterimage: this.dashAfterimage,
      dashBoostPuff: this.dashBoostPuff,
      doubleJumpRing: this.doubleJumpRing,
      wallJumpDust: this.wallJumpDust,
      jumpTakeoff: this.jumpTakeoff,
      wallSlideDust: this.wallSlideDust,
      footstepPuff: this.footstepPuff,
      diveLandImpact: this.diveLandImpact,
    };
  }

  private createMovementVfxCombatManagers() {
    return {
      surgeVfx: this.surgeVfx,
      hitBloodSpray: this.hitBloodSpray,
      flaskBurst: this.flaskBurst,
      criticalHighlight: this.criticalHighlight,
    };
  }

  private createMovementVfxFluidManagers() {
    return {
      waterSplash: this.waterSplash,
      fluidResidue: this.fluidResidue,
      steamPuff: this.steamPuff,
    };
  }

  private createMovementVfxPassiveManagers() {
    return {
      waterBubbles: this.waterBubbles,
      dropThroughDust: this.dropThroughDust,
      iceSkidStreak: this.iceSkidStreak,
    };
  }
  private wireContainerPhysicsRuntime(): void {
    this.containerPhysicsRuntime = new ItemWorldContainerPhysicsRuntime({
      ...this.createContainerPhysicsActorDeps(),
      ...this.createContainerPhysicsWorldDeps(),
      ...this.createContainerPhysicsFeedbackDeps(),
      ...this.createContainerPhysicsFluidDeps(),
      ...this.createContainerPhysicsMutationDeps(),
    });
  }

  private createContainerPhysicsActorDeps() {
    return {
      getPlayer: () => this.player,
      getEnemies: () => this.enemyRegistry.enemies,
      getContainers: () => this.containerRegistry.getContainers(),
    };
  }

  private createContainerPhysicsWorldDeps() {
    return {
      getCollisionGrid: () => this.fullGrid,
      getTileMutator: () => this.tileMutator,
    };
  }

  private createContainerPhysicsFeedbackDeps() {
    return {
      getDamageNumbers: () => this.dmgNumbers,
      getHitSparks: () => this.hitSparks,
    };
  }

  private createContainerPhysicsFluidDeps() {
    return {
      paintContainerImpact: (
        kind: Parameters<ItemWorldContainerFluidRuntime['paintImpact']>[0],
        gx: number,
        gy: number,
        volume: number,
      ) => this.containerFluidRuntime.paintImpact(kind, gx, gy, volume),
      applyContainerEffectToFluid: (container: Parameters<ItemWorldContainerFluidRuntime['applyContainerEffect']>[0]) => this.containerFluidRuntime.applyContainerEffect(container),
      flushContainerFluidChanges: () => this.containerFluidRuntime.flush(),
    };
  }

  private createContainerPhysicsMutationDeps() {
    return {
      destroyContainerWithVFX: (container: Parameters<ContainerDestructionRuntime['destroyWithVfx']>[0]) => this.containerDestructionRuntime.destroyWithVfx(container),
      removeContainerAt: (index: number) => this.containerRegistry.removeAt(index),
    };
  }
  private wirePickupAndProjectileRuntimes(): void {
    this.wirePickupRuntime();
    this.wireProjectileRuntime();
  }

  private wirePickupRuntime(): void {
    this.pickupRuntime = new ItemWorldPickupRuntime({
      ...this.createPickupWorldDeps(),
      ...this.createPickupFeedbackDeps(),
      ...this.createPickupRewardDeps(),
    });
  }

  private createPickupWorldDeps() {
    return {
      getPlayer: () => this.player,
      getEntityLayer: () => this.entityLayer,
    };
  }

  private createPickupFeedbackDeps() {
    return {
      getDamageNumbers: () => this.dmgNumbers,
      getItemPickupGlow: () => this.itemPickupGlow,
      getScreenFlash: () => this.screenFlash,
      showToast: (message: string, color: number) => this.toast.show(message, color),
    };
  }

  private createPickupRewardDeps() {
    return {
      onGoldCollected: (amount: number) => {
        this.runStats.addEarnedGold(amount);
        this.hud.updateGold(this.runStats.displayGold);
      },
    };
  }
  private wireProjectileRuntime(): void {
    this.projectileRuntime = new ItemWorldProjectileRuntime({
      ...this.createProjectileWorldDeps(),
      ...this.createProjectileActorDeps(),
      ...this.createProjectileFeedbackDeps(),
    });
  }

  private createProjectileWorldDeps() {
    return {
      game: this.game,
      getEntityLayer: () => this.entityLayer,
    };
  }

  private createProjectileActorDeps() {
    return {
      getPlayer: () => this.player,
      getEnemies: () => this.enemyRegistry.enemies,
    };
  }

  private createProjectileFeedbackDeps() {
    return {
      getHud: () => this.hud,
      getDamageNumbers: () => this.dmgNumbers,
      getHitSparks: () => this.hitSparks,
      getScreenFlash: () => this.screenFlash,
    };
  }
  private wireEnemyContactRuntime(): void {
    this.enemyContactRuntime = new ItemWorldEnemyContactRuntime({
      ...this.createEnemyContactWorldDeps(),
      ...this.createEnemyContactActorDeps(),
      ...this.createEnemyContactFeedbackDeps(),
    });
  }

  private createEnemyContactWorldDeps() {
    return {
      game: this.game,
    };
  }

  private createEnemyContactActorDeps() {
    return {
      getPlayer: () => this.player,
      getEnemies: () => this.enemyRegistry.enemies,
    };
  }

  private createEnemyContactFeedbackDeps() {
    return {
      getHud: () => this.hud,
      getDamageNumbers: () => this.dmgNumbers,
      getHitSparks: () => this.hitSparks,
      getScreenFlash: () => this.screenFlash,
    };
  }
  private wireStaticEntityRuntime(): void {
    this.staticEntityRuntime = new ItemWorldStaticEntityRuntime({
      ...this.createStaticEntityRuntimeWorldDeps(),
      ...this.createStaticEntityRuntimeRegistryDeps(),
      ...this.createStaticEntityRuntimeCombatDeps(),
      ...this.createStaticEntityRuntimeSideEffectDeps(),
    });
  }

  private createStaticEntityRuntimeWorldDeps() {
    return {
      game: this.game,
      getPlayer: () => this.player,
      getCollisionGrid: () => this.fullGrid,
      getEnemies: () => this.enemyRegistry.enemies,
      getEntityLayer: () => this.entityLayer,
      getContainers: () => this.containerRegistry.getContainers(),
    };
  }

  private createStaticEntityRuntimeRegistryDeps() {
    return {
      getCollapsingPlatforms: () => this.staticEntityRegistry.collapsingPlatforms,
      getGrowingWalls: () => this.staticEntityRegistry.growingWalls,
      getItemDisplays: () => this.staticEntityRegistry.itemDisplays,
      getLockedDoors: () => this.staticEntityRegistry.lockedDoors,
      getCrackedFloors: () => this.staticEntityRegistry.crackedFloors,
      getBreakableProps: () => this.staticEntityRegistry.breakableProps,
      getSwitches: () => this.staticEntityRegistry.switches,
    };
  }

  private createStaticEntityRuntimeCombatDeps() {
    return {
      getHud: () => this.hud,
      getDamageNumbers: () => this.dmgNumbers,
      getHitSparks: () => this.hitSparks,
      getScreenFlash: () => this.screenFlash,
      showToast: (message: string, color?: number) => this.toast.show(message, color),
    };
  }

  private createStaticEntityRuntimeSideEffectDeps() {
    return {
      tickTileHazards: (dt: number) => this.tileHazardRuntime.update(dt),
      destroyBreakablePropWithEffects: (prop: Parameters<ItemWorldBreakablePropRuntime['destroyWithEffects']>[0], reason: Parameters<ItemWorldBreakablePropRuntime['destroyWithEffects']>[1]) => this.breakablePropRuntime.destroyWithEffects(prop, reason),
      paintContainerImpact: (kind: ThrowableContainer['kind'], gx: number, gy: number, volume: number) => this.containerFluidRuntime.paintImpact(kind, gx, gy, volume),
      destroyContainerWithVFX: (container: Parameters<ContainerDestructionRuntime['destroyWithVfx']>[0]) => this.containerDestructionRuntime.destroyWithVfx(container),
      removeContainerAt: (index: number) => this.containerRegistry.removeAt(index),
      updateCameraZones: () => this.cameraZoneRuntime.update(),
    };
  }

  private wireEntityCleanupRuntime(): void {
    this.entityCleanupRuntime = new ItemWorldEntityCleanupRuntime({
      ...this.createEntityCleanupRegistryDeps(),
      ...this.createEntityCleanupRuntimeDeps(),
      ...this.createEntityCleanupInteractiveDeps(),
    });
  }

  private createEntityCleanupRegistryDeps(): any {
    return {
      enemyRegistry: this.enemyRegistry,
      staticEntityRegistry: this.staticEntityRegistry,
      roomSpawnState: this.roomSpawnState,
    };
  }

  private createEntityCleanupRuntimeDeps(): any {
    return {
      projectileRuntime: this.projectileRuntime,
      pickupRuntime: this.pickupRuntime,
      residentRuntime: this.residentRuntime,
      cameraZoneRuntime: this.cameraZoneRuntime,
      memoryTriggerRuntime: this.memoryTriggerRuntime,
      prologueEndRuntime: this.prologueEndRuntime,
    };
  }

  private createEntityCleanupInteractiveDeps(): any {
    return {
      trapdoorRuntime: this.trapdoorRuntime,
      itemWorldAnvilRuntime: this.itemWorldAnvilRuntime,
      getTrapdoor: () => this.trapdoor,
      clearTrapdoor: () => { this.trapdoor = null; },
    };
  }

  private assignInitialRenderLayers(): void {
    this.applyInitialRenderLayerBundle(this.createInitialRenderLayerBundle());
  }

  private createInitialRenderLayerBundle(): ReturnType<typeof setupItemWorldRenderLayers> {
    return setupItemWorldRenderLayers({
      game: this.game,
      sceneContainer: this.container,
      stratumTheme: this.currentStratumDef.theme,
      themeSlug: this._themeSlug,
      visualSeedId: this.item.def.id,
      totalCols: this.unifiedGrid.totalWidth,
      totalRows: this.unifiedGrid.totalHeight,
      setFireLayer: (layer) => this.grassClumpFire.setFireLayer(layer),
    });
  }

  private applyInitialRenderLayerBundle(renderLayers: ReturnType<typeof setupItemWorldRenderLayers>): void {
    this.tilemap = renderLayers.tilemap;
    this.bgPaletteFilter = renderLayers.bgPaletteFilter;
    this.wallPaletteFilter = renderLayers.wallPaletteFilter;
    this.naturalPaletteFilter = renderLayers.naturalPaletteFilter;
    this.interiorPaletteFilter = renderLayers.interiorPaletteFilter;
    this.parallaxBG = renderLayers.parallaxBG;
    this.buildingLayer = renderLayers.buildingLayer;
    this.residentsLayer = renderLayers.residentsLayer;
    this.entityLayer = renderLayers.entityLayer;
    this.collisionDebug = renderLayers.collisionDebug;
    this.tileMutatorRenderer = renderLayers.tileMutatorRenderer;
    this.fluidLayer = renderLayers.fluidLayer;
    this.fluidSystem = renderLayers.fluidSystem;
    this.fluidSpawners = renderLayers.fluidSpawners;
    this.fluidCrestFoam = renderLayers.fluidCrestFoam;
    this.aboveFluidLayer = renderLayers.aboveFluidLayer;
    this.weatherLayer = renderLayers.weatherLayer;
    this.updraftSystem = renderLayers.updraftSystem;
  }

  private createInitialPlayerEntity(): void {
    const playerEntity = createItemWorldPlayerEntity({
      game: this.game,
      entityLayer: this.entityLayer,
      sourcePlayer: this.sourcePlayer,
      existingArcTether: this.arcTether,
      fluidOverlayQuery: (x, y, w, h) => this.fluidSpawners.queryTileAtAabb(x, y, w, h, this.fullGrid),
      onFlaskHeal: (amount) => this.handlePlayerFlaskHeal(amount),
    });
    this.player = playerEntity.player;
    this.arcTether = playerEntity.arcTether;
  }

  private handlePlayerFlaskHeal(amount: number): void {
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
  }

  private initializeRunEntryState(): boolean {
    const entryState = initializeItemWorldRunEntryState({
      item: this.item,
      forcePrologue: this.saveAccess.isPrologue(),
    });
    this.strataConfig = entryState.strataConfig;
    this.progress = entryState.progress;
    if (entryState.resetCycle !== null) {
      Debug.log('[ItemWorld] Re-dive: progress reset for cycle', entryState.resetCycle);
    }

    this.egoDialogueRuntime.init(this.item.def.id);
    this.rng = new PRNG(this.item.uid * 1000);
    trackItemWorldEnter(this.item.rarity);
    this.hitManager = new HitManager(this.game);
    return entryState.forcePrologue;
  }

  private buildInitialGridAndMemoryPlacements(forcePrologue: boolean): void {
    const generationResult = this.generateInitialGrid(forcePrologue);
    this.applyInitialGenerationResult(generationResult);
    this.initializeInitialMemoryPlacements(generationResult);
  }

  private generateInitialGrid(forcePrologue: boolean): ReturnType<ItemWorldGenerationRuntime['generateInitial']> {
    return this.generationRuntime.generateInitial({
      item: this.item,
      strataConfig: this.strataConfig,
      templates: this.ldtkTemplates,
      forcePrologue,
    });
  }

  private applyInitialGenerationResult(generationResult: ReturnType<ItemWorldGenerationRuntime['generateInitial']>): void {
    this.unifiedGrid = generationResult.unifiedGrid;
    this.roomGraphs = generationResult.graphs;
    this.devOverlayRuntime.init(generationResult.topologyOverride);
  }

  private initializeInitialMemoryPlacements(generationResult: ReturnType<ItemWorldGenerationRuntime['generateInitial']>): void {
    if (generationResult.forcedPlacements) {
      this.memoryRoomPlacementRuntime.inject(generationResult.forcedPlacements);
      return;
    }

    this.memoryRoomPlacementRuntime.compute({
      templates: this.ldtkTemplates,
      unifiedGrid: this.unifiedGrid,
      strataCount: this.strataConfig.strata.length,
      weaponId: this.item.def.id,
      itemUid: this.item.uid,
    });
  }

  private selectInitialRoomFromProgress(): void {
    const selection = selectInitialItemWorldRoom({
      progress: this.progress,
      unifiedGrid: this.unifiedGrid,
      strataConfig: this.strataConfig,
    });
    this.currentCol = selection.col;
    this.currentRow = selection.row;
    this.currentStratumIndex = selection.stratumIndex;
    this.currentStratumDef = selection.stratumDef;
    this.stratumStartSnapshot.capture(this.item);
  }

  private applyAssetBootstrap(assetBootstrap: ItemWorldAssetBootstrapResult): Promise<void> {
    this.applyAssetBootstrapFields(assetBootstrap);
    return assetBootstrap.hudSkinLoad;
  }

  private applyAssetBootstrapFields(assetBootstrap: ItemWorldAssetBootstrapResult): void {
    this._themeSlug = assetBootstrap.themeSlug;
    this.hudSkin = assetBootstrap.hudSkin;
    this.atlas = assetBootstrap.atlas;
    this.ldtkTemplates = assetBootstrap.ldtkTemplates;
    this.ldtkRenderer = assetBootstrap.ldtkRenderer;
  }

  private finishInitialBootstrap(assetBootstrap: ItemWorldAssetBootstrapResult): void {
    this.applyLoadedHudSkin(assetBootstrap);
    this.createInitialReturnResultUi(assetBootstrap);
    this.initialBuildRuntime.initialize();
    this.markInitialBootstrapComplete();
    this.startGameplayIfEntryCorridorInactive();
  }

  private applyLoadedHudSkin(assetBootstrap: ItemWorldAssetBootstrapResult): void {
    if (assetBootstrap.hudSkin.isLoaded) this.hud.applySkin(assetBootstrap.hudSkin);
  }

  private createInitialReturnResultUi(assetBootstrap: ItemWorldAssetBootstrapResult): void {
    this.uiController.createReturnResult(assetBootstrap.hudSkin.isLoaded ? assetBootstrap.hudSkin : null, () => {
      this.game.sceneManager.pop();
    });
  }

  private markInitialBootstrapComplete(): void {
    this.initialized = true;
  }

  private startGameplayIfEntryCorridorInactive(): void {
    if (!this.entryCorridorRuntime.isActive) {
      this.startItemWorldGameplayAfterEntry();
    }
  }
  private assignInitialScreenOverlays(): void {
    this.applyInitialScreenOverlayBundle(this.createInitialScreenOverlayBundle());
  }

  private createInitialScreenOverlayBundle(): ReturnType<typeof setupItemWorldScreenOverlays> {
    return setupItemWorldScreenOverlays(this.game, this.container);
  }

  private applyInitialScreenOverlayBundle(screenOverlays: ReturnType<typeof setupItemWorldScreenOverlays>): void {
    this.screenFlash = screenOverlays.screenFlash;
    this.fadeOverlay = screenOverlays.fadeOverlay;
  }

  private assignInitialUiBootstrap(): void {
    this.applyInitialUiBootstrapBundle(this.createInitialUiBootstrapBundle());
  }

  private createInitialUiBootstrapBundle(): ReturnType<typeof setupItemWorldUiBootstrap> {
    return setupItemWorldUiBootstrap({
      game: this.game,
      hudSkin: this.hudSkin,
      itemDisplayName: getDisplayName(this.item),
      runStats: this.runStats,
      saveAccess: this.saveAccess,
      getHp: () => ({ hp: this.player.hp, maxHp: this.player.maxHp }),
      showDamageIncreaseToast: (beforeAtk, afterAtk, toast) => {
        showItemWorldDamageIncreaseToast(beforeAtk, afterAtk, (message, color) => toast.show(message, color));
      },
      continueToNextStratum: () => this.stratumContinueRuntime.continueToNextStratum(),
      exitFromStratumClear: () => {
        this.returnResultCleanupRuntime.cleanup();
        this.flowState.startExitFade();
        this.exitFadeRuntime.start();
      },
    });
  }

  private applyInitialUiBootstrapBundle(uiBootstrap: ReturnType<typeof setupItemWorldUiBootstrap>): void {
    this.hud = uiBootstrap.hud;
    this.areaTitle = uiBootstrap.areaTitle;
    this.uiController = uiBootstrap.uiController;
    this.spawnController = uiBootstrap.spawnController;
    this.progressController = uiBootstrap.progressController;
    this.toast = uiBootstrap.toast;
    this._gpUnsub = uiBootstrap.gamepadToastUnsubscribe;
    this.tutorialHint = uiBootstrap.tutorialHint;
    this.lowHpHealHint = uiBootstrap.lowHpHealHint;
    this.loreDisplay = uiBootstrap.loreDisplay;
  }

  private async prepareInitialData(): Promise<void> {
    this._procDecoEnabled = !new URLSearchParams(window.location.search).has('noproc');
    await loadSpawnTable();
  }

  async init(): Promise<void> {
    const { assetBootstrap, hudSkinLoad } = await this.bootstrapInitialAssetsAndData();
    this.initializeInitialRunAndGrid();
    this.initializeInitialRenderAndGameplay();
    this.initializeInitialOverlaysAndUi();

    await hudSkinLoad;
    this.finishInitialBootstrap(assetBootstrap);
  }

  private async bootstrapInitialAssetsAndData(): Promise<{
    assetBootstrap: ItemWorldAssetBootstrapResult;
    hudSkinLoad: Promise<void>;
  }> {
    const assetBootstrap = await bootstrapItemWorldAssets(this.item.def.themeId, this.atlases);
    const hudSkinLoad = this.applyAssetBootstrap(assetBootstrap);
    await this.prepareInitialData();
    return { assetBootstrap, hudSkinLoad };
  }

  private initializeInitialRunAndGrid(): void {
    const forcePrologue = this.initializeRunEntryState();
    this.buildInitialGridAndMemoryPlacements(forcePrologue);
    this.selectInitialRoomFromProgress();
  }

  private initializeInitialRenderAndGameplay(): void {
    this.assignInitialRenderLayers();
    this.createInitialPlayerEntity();
    this.wireVfxAndFluidReaction();
    this.wireGameplayEntityRuntimes();
  }

  private initializeInitialOverlaysAndUi(): void {
    this.assignInitialScreenOverlays();
    this.assignInitialUiBootstrap();
  }

  private startItemWorldGameplayAfterEntry(): void {
    this.gameplayStartRuntime.start();
  }

  beginEntryDialogueAfterTransition(): void {
    if (this.entryCorridorRuntime.isActive) {
      this.entryCorridorRuntime.requestDialogueAfterCompletion();
      return;
    }
    if (!this.egoDialogueRuntime.tryMarkEntryDialogueStarted()) return;
    this.bossClearRuntime.startDelay({
      delayMs: 250,
      action: () => {
        if (!this.initialized) return;
        void this.egoDialogueRuntime.fireEnterAsync();
      },
    });
  }

  private activateEntryCorridor(): void {
    this.entryCorridorRuntime.activate();
  }

  private updateEntryCorridor(dt: number): void {
    this.entryCorridorRuntime.update(dt);
  }

  // DEC-039 ? A: spawnBossPortal / restorePortalIfStratumCleared /
  // getBossPortalFallbackPosition 은 제거됨. down exit 로 대체.
  // stratum 전환은 down exit 로 처리한다.

  private restoreRoomState(): { roomsCleared: number } {
    return this.roomStateRuntime.restoreRoomState(
      this.unifiedGrid,
      this.progress,
      this.roomSpawnState.spawnedRooms,
    );
  }

  private persistRoomState(): void {
    this.roomStateRuntime.persistRoomState(
      this.unifiedGrid,
      this.progress,
      this.roomSpawnState.spawnedRooms,
    );
  }

  private clearEnemies(): void {
    this.entityCleanupRuntime.clearEnemies();
  }

  /** Destroy and clear all LDtk-placed static entities. Called on rebuild + exit. */
  private clearStaticEntities(): void {
    this.entityCleanupRuntime.clearStaticEntities();
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
   * structurally ? runtime duck-typing checks for this method.
   */
  getFeedbackContext(): ItemWorldFeedbackContext {
    return createItemWorldFeedbackContext({
      player: this.player,
      inventory: this.inventory,
      entryCorridorActive: this.entryCorridorRuntime.isActive,
      entryCorridorLevelId: ENTRY_CORRIDOR_LEVEL_ID,
      tileSize: TILE_SIZE,
    });
  }

  update(dt: number): void {
    if (!this.initialized) return;

    if (this.updatePreGameplayFrame(dt)) {
      return;
    }

    // Hide world prompts while modal/transition flows suppress interaction prompts.
    this.promptRuntime.hideIfSuppressed();

    if (this.updateBlockingGameplayFrame(dt)) {
      return;
    }

    this.presentationFrameRuntime.update(dt);
  }

  private updatePreGameplayFrame(dt: number): boolean {
    this.ambientFrameRuntime.update(dt);

    if (this.modalGateRuntime.updatePreGameplay(dt)) {
      return true;
    }

    if (this.pausedFrameRuntime.updateEntryFreeze(dt)) {
      return true;
    }

    if (this.escapeRuntime.updateInput()) {
      return true;
    }

    // 프롤로그 종료 시퀀스 ? prologue_end 트리거 터치 시 말소자 등장 → 위상 찢김
    // → 암전 → Ch.1 전환. 시퀀스 중 게임플레이를 멈춘다(흔들림·플래시는 유지).
    if (this.pausedFrameRuntime.updatePrologueEnd(dt)) {
      return true;
    }

    return false;
  }

  private updateBlockingGameplayFrame(dt: number): boolean {
    if (this.modalGateRuntime.updateBossChoice()) {
      return true;
    }

    if (this.blockingTransitionRuntime.update(dt)) {
      return true;
    }

    if (this.gameplaySimulationRuntime.update(dt)) {
      return true;
    }

    return false;
  }

  // ---------------------------------------------------------------------------
  // Stratum picker ? choose starting stratum on re-entry (after first clear)
  // ---------------------------------------------------------------------------


  private createRestartedPrologueItemWorldScene(): ItemWorldScene {
    return createRestartedPrologueItemWorldSceneInstance({
      createScene: () => new ItemWorldScene(
        this.game,
        this.item,
        this.inventory,
        this.sourcePlayer,
        { ...this.sceneOptions },
        this.saveAccess,
      ),
      continuation: this,
    });
  }

  /**
   * cell culling (2026-05-04 ? Ancient 24 FPS 대응).
   * viewport + 1 cell buffer 안의 cell 만 visible=true, 나머지는 false.
   * PIXI 자체 culling/filter 와 함께 cell 단위 visible 을 제어한다.
   *
   * aggregate 의 filterArea 를 viewport 로 제한한다 (50->60 FPS 대응,
   * 2026-05-04). filter 없음 = filterArea 도 없음. unifiedGrid
   * 기준으로 viewport 안의 cell 만 처리한다.
   */
  private updateCellVisibility(): void {
    this.cellVisibilityRuntime.update();
  }

  render(alpha: number): void {
    if (!this.initialized) return;
    this.player.render(alpha);
    this.enemyRegistry.render(alpha);
    const cam = this.game.camera;
    this.parallaxBG.updateScroll(cam.renderX, cam.renderY);
    this.debugRenderRuntime.updateCollisionDebug();
  }

  exit(): void {
    this.lifecycleCleanupRuntime.exit();
  }

  override destroy(): void {
    this.lifecycleCleanupRuntime.destroy();
    // hud 는 game.uiContainer(공유) 라서 super.destroy() 가 처리하므로 여기서는 제외한다.
    super.destroy();
  }

}



