/**
 * LdtkWorldScene.ts
 *
 * World-space scene that loads hand-crafted LDtk levels instead of procedurally
 * generated rooms. Implements the World space of the 3-Space separation
 * model (Design_Architecture_2Space.md).
 *
 * Key differences from WorldScene:
 *  - No RoomGrid / ChunkAssembler: levels are loaded from a .ldtk project file.
 *  - LdtkLoader parses the project; LdtkRenderer draws the tiles.
 *  - Room data comes from level.collisionGrid (same 2D format the Player uses).
 *  - Room transitions use world-space coordinates and level.neighbors.
 *  - Variable level sizes ? camera bounds are set per level.
 *  - Player spawn position read from the LDtk "Player" entity.
 *
 * All combat, portal, altar, inventory, and game-over systems are copied
 * faithfully from WorldScene.ts.
 */

import { Container, Graphics, Assets, Texture, Rectangle } from 'pixi.js';
import { Scene } from '@core/Scene';
import { Debug } from '@core/Debug';
import { GameAction } from '@core/InputManager';
import { ProximityRouter, type ProximityInteraction } from '@core/ProximityRouter';
import { aabbOverlap, isOneWay, isSolid } from '@core/Physics';
import { CameraZoneRuntime } from '@core/CameraZoneRuntime';
import { LdtkLoader, isLdtkWallSlope2x1Tile } from '@level/LdtkLoader';
import { LdtkRenderer } from '@level/LdtkRenderer';
import { CollisionDebugOverlay } from '@level/CollisionDebugOverlay';
import type { LdtkLevel, LdtkTile } from '@level/LdtkLoader';
import { collectLdtkTilesetPaths } from '@level/LdtkTilesetPaths';
import { applyDefaultWorldAreaRetags } from '@level/LdtkAreaRetagHelpers';
import { filterWorldWallTilesForCollision } from './world/WorldLdtkTileFilterHelpers';
import { compactContainers } from '@scenes/shared/ContainerTargetHelpers';
import { addLdtkVisualBoundsBleed, VISUAL_BOUNDS_BLEED_PX } from '@level/VisualBoundsBleed';
import { destroyDisplayObject } from '@scenes/shared/DisplayObjectLifecycleHelpers';
import { Player } from '@entities/Player';
import type { Portal, PortalSourceType } from '@entities/Portal';
import type { Anvil } from '@entities/Anvil';
import { TILE_WALL, TILE_MAGMA, TILE_SPIKE } from '@core/Physics';
import { HitManager } from '@combat/HitManager';
import { COMBO_STEPS } from '@combat/CombatData';
import { HUD } from '@ui/HUD';
import { AreaTitle } from '@ui/AreaTitle';
import { TitleScene } from './TitleScene';
import { UISkin } from '@ui/UISkin';
import { InventoryUI } from '@ui/InventoryUI';
import { IdentityArchive } from '@ui/IdentityArchive';
import { PauseMenu } from '@ui/PauseMenu';
import { CharacterStats } from '@ui/CharacterStats';
import { DeathScreen } from '@ui/DeathScreen';
import { OxygenOverlay } from '@ui/OxygenOverlay';
import { attachGamepadToast } from '@ui/GamepadToastBinding';
import { BossHpRuntime } from '@ui/BossHpRuntime';
import { Inventory } from '@items/Inventory';
import { SWORD_DEFS } from '@data/weapons';
import { createItem } from '@items/ItemInstance';
import type { ItemInstance } from '@items/ItemInstance';
import { LorePopup } from '@ui/LorePopup';
import { LoreDisplay } from '@ui/LoreDisplay';
import { DivePreview } from '@ui/DivePreview';
import { t } from '@i18n';
import {
  EGO_INVENTORY_LOCKED,
} from '@data/EgoDialogue';
import { ThrowableContainer } from '@entities/ThrowableContainer';
import { ParallaxBackground } from '@level/ParallaxBackground';
import { hashString } from '@level/ProceduralDecorator';
import { seedItemWorldTemplates } from '@level/ItemWorldTemplatePool';
import {
  getAreaPalette,
  getAreaPaletteAtlas,
  getAreaPaletteRow,
  ensureAreaTilesetsLoaded,
} from '@data/areaPalettes';
import { SaveManager } from '@utils/SaveManager';
import { ToastManager } from '@ui/Toast';
import type { WorldMapOverlay } from '@ui/WorldMapOverlay';

import { PIXEL_FONT } from '@ui/fonts';
import type { TileMutator } from '@systems/TileMutator';
import {
  findNearestGrabbableContainer as findNearestContainerForGrab,
} from '@systems/ContainerInteraction';
import { getActivePlayerAttackHitbox } from '@systems/PlayerAttackHitbox';
import { TutorialHint } from '@ui/TutorialHint';
import { LowHpHealHintRuntime } from '@ui/LowHpHealHintRuntime';
import { PRNG } from '@utils/PRNG';
import { MAGMA_BURN_DURATION_MS } from '@systems/TileHazards';
import { WorldUiController } from './world/WorldUiController';
import { WorldTransitionController } from './world/WorldTransitionController';
import { WorldPlayerSpawnRuntime } from './world/WorldPlayerSpawnRuntime';
import { WorldAltarController } from './world/WorldAltarController';
import { AnvilPromptController } from './world/AnvilPromptController';
import { AnvilPlacementController } from './world/AnvilPlacementController';
import { ItemWorldEntryStreamRuntime } from './world/ItemWorldEntryStreamRuntime';
import { ItemWorldGrowthSnapshotController } from './world/ItemWorldGrowthSnapshotController';
import { ItemWorldGhostCollisionRuntime } from './world/ItemWorldGhostCollisionRuntime';
import { ItemWorldEntryPreloader } from './world/ItemWorldEntryPreloader';
import { ItemWorldEntryPushTransition } from './world/ItemWorldEntryPushTransition';
import { WorldItemWorldSceneFlowRuntime } from './world/WorldItemWorldSceneFlowRuntime';
import { WorldItemWorldSceneTransitionRuntime } from './world/WorldItemWorldSceneTransitionRuntime';
import { InventoryTutorialHintRuntime } from './world/InventoryTutorialHintRuntime';
import { ItemDeploymentTunnelRuntime } from './world/ItemDeploymentTunnelRuntime';
import { ItemWorldGhostStreamRuntime } from './world/ItemWorldGhostStreamRuntime';
import { FixedItemWorldRuntime } from './world/FixedItemWorldRuntime';
import { WorldFixedItemWorldFlowRuntime } from './world/WorldFixedItemWorldFlowRuntime';
import { WorldAnvilItemWorldFlowRuntime } from './world/WorldAnvilItemWorldFlowRuntime';
import { WorldAnvilReturnFlowRuntime } from './world/WorldAnvilReturnFlowRuntime';
import { WorldPortalItemWorldFlowRuntime } from './world/WorldPortalItemWorldFlowRuntime';
import { PortalEntryRuntime } from './world/PortalEntryRuntime';
import { AnvilItemWorldReturnState } from './world/AnvilReturnState';
import { ItemWorldTransitionRuntime } from './world/ItemWorldTransitionRuntime';
import { PortalRuntime } from './world/PortalRuntime';
import { SavePointRuntime } from './world/SavePointRuntime';
import { WorldSaveRuntime } from './world/WorldSaveRuntime';
import { WorldMinimapRuntime } from './world/WorldMinimapRuntime';
import { WorldMapRuntime } from './world/WorldMapRuntime';
import { WorldDebugWarpRuntime } from './world/WorldDebugWarpRuntime';
import { ItemWorldScene } from './ItemWorldScene';
import { WorldGameOverRuntime } from './world/WorldGameOverRuntime';
import { SaveRoomAudioRuntime } from './world/SaveRoomAudioRuntime';
import { AnvilCyclePromptRuntime } from './world/AnvilCyclePromptRuntime';
import { WorldTutorialHintRuntime } from './world/WorldTutorialHintRuntime';
import { WorldDeployBlurRuntime } from './world/WorldDeployBlurRuntime';
import { WorldLaserDesaturationRuntime } from './world/WorldLaserDesaturationRuntime';
import { WorldNoWeaponFeedbackRuntime } from './world/WorldNoWeaponFeedbackRuntime';
import { ItemWorldReturnFadeRuntime } from './world/ItemWorldReturnFadeRuntime';
import { WorldIntroHandoffRuntime } from './world/WorldIntroHandoffRuntime';
import { WorldBossLockRuntime } from './world/WorldBossLockRuntime';
import { WorldEndingRuntime } from './world/WorldEndingRuntime';
import { WorldDialogueTriggerRuntime } from './world/WorldDialogueTriggerRuntime';
import { WorldPrologueEndRuntime } from './world/WorldPrologueEndRuntime';
import { WorldVoidRuntime } from './world/WorldVoidRuntime';
import { WorldVoidReturnRuntime } from './world/WorldVoidReturnRuntime';
import { WorldExitGlowRuntime } from './world/WorldExitGlowRuntime';
import {
  WorldEdgeTransitionRuntime,
} from './world/WorldEdgeTransitionRuntime';
import { WorldEdgeTransitionFlowRuntime } from './world/WorldEdgeTransitionFlowRuntime';
import { WorldAnvilRetirementRuntime } from './world/WorldAnvilRetirementRuntime';
import { WorldAnvilInteractionRuntime } from './world/WorldAnvilInteractionRuntime';
import { WorldAnvilSpawnRuntime } from './world/WorldAnvilSpawnRuntime';
import { WorldAnvilItemRuntime } from './world/WorldAnvilItemRuntime';
import { WorldAnvilDeploymentRuntime } from './world/WorldAnvilDeploymentRuntime';
import { WorldItemDeploymentTunnelFlowRuntime } from './world/WorldItemDeploymentTunnelFlowRuntime';
import { WorldItemDeploymentAtmosphereFlowRuntime } from './world/WorldItemDeploymentAtmosphereFlowRuntime';
import { WorldAcquireOverlayRuntime } from './world/WorldAcquireOverlayRuntime';
import { WorldFrozenReturnRuntime } from './world/WorldFrozenReturnRuntime';
import { WorldAnvilDiveUiRuntime } from './world/WorldAnvilDiveUiRuntime';
import { WorldCameraInputRuntime } from './world/WorldCameraInputRuntime';
import { WorldDungeonAtmosphereRuntime } from './world/WorldDungeonAtmosphereRuntime';
import { WorldFrozenSnapshotRuntime } from './world/WorldFrozenSnapshotRuntime';
import { WorldBuilderStampRuntime } from './world/WorldBuilderStampRuntime';
import { WorldBuilderPlayerCollisionRuntime } from './world/WorldBuilderPlayerCollisionRuntime';
import { WorldBuilderStepFeedbackRuntime } from './world/WorldBuilderStepFeedbackRuntime';
import { WorldBuilderInteriorVisibilityRuntime } from './world/WorldBuilderInteriorVisibilityRuntime';
import { WorldBuilderPlayerStateRuntime } from './world/WorldBuilderPlayerStateRuntime';
import { WorldBuilderPersistenceRuntime } from './world/WorldBuilderPersistenceRuntime';
import { WorldBuilderAttachmentRuntime } from './world/WorldBuilderAttachmentRuntime';
import { WorldBuilderWeatherRuntime } from './world/WorldBuilderWeatherRuntime';
import { WorldWeatherRuntime } from './world/WorldWeatherRuntime';
import { WorldTerrainPaletteRuntime } from './world/WorldTerrainPaletteRuntime';
import { WorldUpdraftRuntime } from './world/WorldUpdraftRuntime';
import { WorldVoidFogRuntime } from './world/WorldVoidFogRuntime';
import { WorldSpawnState } from './world/WorldSpawnState';
import { WorldBuilderVisualFilterRuntime } from './world/WorldBuilderVisualFilterRuntime';
import { WorldBuilderLayerRuntime } from './world/WorldBuilderLayerRuntime';
import { WorldBuilderSpawnerRuntime } from './world/WorldBuilderSpawnerRuntime';
import { WorldBuilderFlowRuntime } from './world/WorldBuilderFlowRuntime';
import {
  createLdtkItemWorldSceneSaveAccess,
  type LdtkSceneSaveAccess,
} from './shared/SceneSaveAccess';
import {
  bindPlayerCollisionGrid,
  placePlayerAt,
  stopPlayerMotion,
  syncPlayerAndEnemyPreviousPositions,
} from './shared/PlayerPlacementHelpers';
import { WorldBuilderGrassRuntime } from './world/WorldBuilderGrassRuntime';
import { WorldBuilderSpriteRuntime } from './world/WorldBuilderSpriteRuntime';
import { WorldBuilderItemRuntime } from './world/WorldBuilderItemRuntime';
import { WorldBuilderStaticEntityRuntime } from './world/WorldBuilderStaticEntityRuntime';
import { WorldBuilderDoorSwitchRuntime } from './world/WorldBuilderDoorSwitchRuntime';
import { WorldBuilderEntranceRuntime } from './world/WorldBuilderEntranceRuntime';
import { WorldMaintainedContainerSpawnerRuntime } from './world/WorldMaintainedContainerSpawnerRuntime';
import { WorldContainerSpawnRuntime } from './world/WorldContainerSpawnRuntime';
import { WorldPickupRuntime } from './world/WorldPickupRuntime';
import { WorldRelicPickupRuntime } from './world/WorldRelicPickupRuntime';
import { WorldItemDropRuntime } from './world/WorldItemDropRuntime';
import { WorldHandPlacedItemRuntime } from './world/WorldHandPlacedItemRuntime';
import { WorldFixedItemSpawnRuntime } from './world/WorldFixedItemSpawnRuntime';
import { WorldProjectileRuntime } from './world/WorldProjectileRuntime';
import { WorldCommonSpriteRuntime } from './world/WorldCommonSpriteRuntime';
import { WorldEnemyRegistry } from './world/WorldEnemyRegistry';
import { WorldEnemyKillRuntime } from './world/WorldEnemyKillRuntime';
import { WorldEnemyUpdateRuntime } from './world/WorldEnemyUpdateRuntime';
import { WorldEnemyCombatRuntime } from './world/WorldEnemyCombatRuntime';
import { WorldEnemyContactRuntime } from './world/WorldEnemyContactRuntime';
import { WorldEnemyRenderRuntime } from './world/WorldEnemyRenderRuntime';
import { WorldEnemySpawnRuntime } from './world/WorldEnemySpawnRuntime';
import { WorldContainerRegistry } from './world/WorldContainerRegistry';
import { WorldSpikeRegistry } from './world/WorldSpikeRegistry';
import { WorldSpikeRuntime } from './world/WorldSpikeRuntime';
import { WorldBreakableRegistry } from './world/WorldBreakableRegistry';
import { WorldBreakableRuntime } from './world/WorldBreakableRuntime';
import { WorldBuildingRegistry } from './world/WorldBuildingRegistry';
import { WorldBuildingRuntime } from './world/WorldBuildingRuntime';
import { WorldCollapsingPlatformRegistry } from './world/WorldCollapsingPlatformRegistry';
import { WorldCollapsingPlatformRuntime } from './world/WorldCollapsingPlatformRuntime';
import { WorldBurnablePropRegistry } from './world/WorldBurnablePropRegistry';
import { WorldBurnablePropRuntime } from './world/WorldBurnablePropRuntime';
import { WorldBreakablePropRegistry } from './world/WorldBreakablePropRegistry';
import { WorldBreakablePropRuntime } from './world/WorldBreakablePropRuntime';
import { WorldSecretWallRegistry } from './world/WorldSecretWallRegistry';
import { WorldCrackedFloorRegistry } from './world/WorldCrackedFloorRegistry';
import { WorldCrackedFloorRuntime } from './world/WorldCrackedFloorRuntime';
import { WorldGrowingWallRegistry } from './world/WorldGrowingWallRegistry';
import { WorldGrowingWallRuntime } from './world/WorldGrowingWallRuntime';
import { WorldDoorSwitchRegistry } from './world/WorldDoorSwitchRegistry';
import { WorldDoorSwitchSpawnRuntime } from './world/WorldDoorSwitchSpawnRuntime';
import { WorldDoorSwitchInteractionRuntime } from './world/WorldDoorSwitchInteractionRuntime';
import { WorldProgressState } from './world/WorldProgressState';
import { WorldDoorAttackState } from './world/WorldDoorAttackState';
import { WorldFluidContactState } from './world/WorldFluidContactState';
import { WorldSolidifiedWallOverlay } from './world/WorldSolidifiedWallOverlay';
import { WorldProceduralDecorRuntime } from './world/WorldProceduralDecorRuntime';
import { WorldCollisionGridRuntime } from './world/WorldCollisionGridRuntime';
import { WorldFluidRuntime } from './world/WorldFluidRuntime';
import { WorldFluidFeedbackRuntime } from './world/WorldFluidFeedbackRuntime';
import { FluidReactionRuntime } from './shared/FluidReactionRuntime';
import { WorldTileMutationRuntime } from './world/WorldTileMutationRuntime';
import { WorldTileHazardRuntime } from './world/WorldTileHazardRuntime';
import { WorldContainerCarryRuntime } from './world/WorldContainerCarryRuntime';
import { WorldPickupVfxRuntime } from './world/WorldPickupVfxRuntime';
import { WorldContainerPhysicsRuntime } from './world/WorldContainerPhysicsRuntime';
import { ContainerDestructionRuntime } from './shared/ContainerDestructionRuntime';
import { WorldContainerFluidRuntime } from './world/WorldContainerFluidRuntime';
import { WorldContainerAttackRuntime } from './world/WorldContainerAttackRuntime';
import { WorldSecretWallRuntime } from './world/WorldSecretWallRuntime';
import { WorldPlayerImpactRuntime } from './world/WorldPlayerImpactRuntime';
import { WorldMovementVfxRuntime } from './world/WorldMovementVfxRuntime';
import { WorldCombatFeedbackRuntime } from './world/WorldCombatFeedbackRuntime';
import { WorldStatusFeedbackRuntime } from './world/WorldStatusFeedbackRuntime';
import { WorldGrassFireRuntime } from './world/WorldGrassFireRuntime';
import { EgoShardRuntime } from '@effects/EgoShardRuntime';
import { WorldEgoShardCastRuntime } from './world/WorldEgoShardCastRuntime';
import { WorldEgoShardCombatRuntime } from './world/WorldEgoShardCombatRuntime';
import { WorldEgoShardProjectileRuntime } from './world/WorldEgoShardProjectileRuntime';
import { WorldEgoShardImpactRuntime } from './world/WorldEgoShardImpactRuntime';
import { WorldEgoDialogueRuntime } from './world/WorldEgoDialogueRuntime';
import { WorldSacredPickupState } from './world/WorldSacredPickupState';
import { WorldSacredPickupRuntime } from './world/WorldSacredPickupRuntime';
import { WorldPlayerProgressionState } from './world/WorldPlayerProgressionState';
import { WorldPlayerStatRuntime } from './world/WorldPlayerStatRuntime';
import { WorldItemWorldEntryState } from './world/WorldItemWorldEntryState';
import { WorldItemDeploymentCollisionRuntime } from './world/WorldItemDeploymentCollisionRuntime';
import { GiantBuilder } from '@entities/GiantBuilder';
import type { Rarity } from '@data/weapons';
import type { Enemy } from '@entities/Enemy';
import { GAME_WIDTH, GAME_HEIGHT, type Game } from '../Game';
import { trackPlayerDeath } from '@utils/Analytics';
import { assetPath } from '@core/AssetLoader';
import { AmbientLayer } from '@audio/AmbientLayer';
import { BgmController } from '@audio/BgmController';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TILE_SIZE = 16;
const FADE_DURATION = 200;
const FROZEN_RETURN_ARM_DISTANCE = 4 * TILE_SIZE;
// FIRST_ANVIL_LEVEL_ID ???? (2026-05-24): LDtk Anvil entity ??
// RetireAfterFirstBoss field ?? u ??? ???¥è? ????????? ??u.
const LDTK_PATH = assetPath('assets/World_ProjectAbyss.ldtk');
// ItemTunnel world was removed from the LDtk project; tunnel descent flow is
// archived in WorldAnvilItemWorldFlowRuntime while the default anvil FX enters
// Item World directly.
const LDTK_WORLD_IDS: string[] = ['Overworld'];
const BUILDER_WORLD_ID = 'Builder';
// AreaIDs used by the overworld ? Content_System_Area_Palette.csv's Tileset
// column drives which atlases get loaded for this scene.
const WORLD_AREA_IDS = ['world_shaft_bg', 'world_shaft_wall', 'world_prologue_bg', 'world_prologue_wall'] as const;
const FALLBACK_ENTRANCE_LEVEL = 'World_Level_16';

// Parallax BG area per level. The prologue levels use their own pre-colored
// near art (world_prologue_bg in Content_System_Area_Palette.csv); every other
// level falls back to the shaft tone. SSoT for the tones is the CSV.
const DEFAULT_BG_AREA_ID = 'world_shaft_bg';
const PROLOGUE_BG_AREA_ID = 'world_prologue_bg';
const DEFAULT_WALL_AREA_ID = 'world_shaft_wall';
const PROLOGUE_WALL_AREA_ID = 'world_prologue_wall';
function bgAreaIdForLevel(identifier: string): string {
  return identifier.toLowerCase().startsWith('prologue_') ? PROLOGUE_BG_AREA_ID : DEFAULT_BG_AREA_ID;
}
function wallAreaIdForLevel(identifier: string): string {
  return identifier.toLowerCase().startsWith('prologue_') ? PROLOGUE_WALL_AREA_ID : DEFAULT_WALL_AREA_ID;
}

// Hand-authored levels that opt out of procedural decoration entirely.
const NO_PROCEDURAL_DECOR_LEVELS = new Set<string>(['Prologue_01']);

// save-access default is intentionally injected from bootstrap entrypoints (main.ts /
// TitleScene) to keep runtime code free of direct save singleton imports.

// ---------------------------------------------------------------------------
// LdtkWorldScene
// ---------------------------------------------------------------------------

export class LdtkWorldScene extends Scene {
  private debugPrologueCutsceneStarted = false;
  private readonly saveAccess: LdtkSceneSaveAccess;
  // LDtk level data
  private loader!: LdtkLoader;
  private builderLoader!: LdtkLoader;
  private itemStratumLoader: LdtkLoader | null = null;
  private activeBuilder: GiantBuilder | null = null;
  private readonly collisionGridRuntime = new WorldCollisionGridRuntime();
  private readonly builderPersistenceRuntime = new WorldBuilderPersistenceRuntime();
  /**
   * Drive the builder's footstep camera shake even when mode is 'patrol'.
   * BuilderSpawner can force this on for patrol-style routes that still need
   * the weighty "??" feedback.
   */
  private readonly builderStepFeedbackRuntime = new WorldBuilderStepFeedbackRuntime();
  private readonly builderPlayerStateRuntime = new WorldBuilderPlayerStateRuntime();
  private readonly builderInteriorVisibilityRuntime = new WorldBuilderInteriorVisibilityRuntime();
  private readonly builderStampRuntime = new WorldBuilderStampRuntime();
  private readonly builderPlayerCollisionRuntime = new WorldBuilderPlayerCollisionRuntime({
    getPlayer: () => this.player,
    getCollisionGrid: () => this.collisionGridRuntime.grid,
    getActiveBuilder: () => this.activeBuilder,
    getStampSet: () => this.builderStampRuntime.activeStampSet,
    hasOneWayDropThroughGrace: () => this.builderPlayerStateRuntime.hasOneWayDropThroughGrace,
    isEntryCinematicActive: () =>
      this.itemWorldTransitionRuntime.isActive
      || this.itemWorldEntryTransition.isActive
      || this.itemWorldEntryState.isDeploymentActive(),
  });
  private renderer!: LdtkRenderer;
  private readonly proceduralDecorRuntime = new WorldProceduralDecorRuntime();
  private readonly terrainPaletteRuntime = new WorldTerrainPaletteRuntime();
  private readonly builderVisualFilterRuntime = new WorldBuilderVisualFilterRuntime();
  private readonly builderLayerRuntime = new WorldBuilderLayerRuntime();
  private readonly builderSpawnerRuntime = new WorldBuilderSpawnerRuntime();
  private builderFlowRuntime!: WorldBuilderFlowRuntime;
  private readonly builderGrassRuntime = new WorldBuilderGrassRuntime();
  private readonly builderSpriteRuntime = new WorldBuilderSpriteRuntime();
  private builderItemRuntime!: WorldBuilderItemRuntime;
  private builderStaticEntityRuntime!: WorldBuilderStaticEntityRuntime;
  private builderDoorSwitchRuntime!: WorldBuilderDoorSwitchRuntime;
  private builderEntranceRuntime!: WorldBuilderEntranceRuntime;
  private parallaxBG!: ParallaxBackground;
  /** BG area id the parallax was last built for ? triggers rebuild on change. */
  private parallaxAreaId: string | null = null;
  private atlas!: Texture;
  /** Per-tileset atlas map keyed by LDtk __tilesetRelPath. */
  private atlases: Record<string, Texture> = {};
  private itemWorldEntryPreloader!: ItemWorldEntryPreloader;
  private currentLevel!: LdtkLevel;
  private cameraZoneRuntime!: CameraZoneRuntime;






  // Layers
  private entityLayer!: Container;
  private weatherLayer!: Container;
  private deploymentFxLayer!: Container;
  private vividLayer!: Container;
  private fluidLayer!: Container;
  private collisionDebug!: CollisionDebugOverlay;
  private readonly worldFluidRuntime = new WorldFluidRuntime();
  private readonly builderWeatherRuntime = new WorldBuilderWeatherRuntime();
  private worldWeatherRuntime!: WorldWeatherRuntime;
  private laserDesaturationRuntime!: WorldLaserDesaturationRuntime;
  private deployBlurRuntime!: WorldDeployBlurRuntime;
  private dungeonAtmosphereRuntime!: WorldDungeonAtmosphereRuntime;
  private readonly frozenSnapshotRuntime = new WorldFrozenSnapshotRuntime();
  private frozenReturnRuntime!: WorldFrozenReturnRuntime;

  // Entities
  private player!: Player;
  private readonly worldEnemyRegistry = new WorldEnemyRegistry();
  private worldEnemySpawnRuntime!: WorldEnemySpawnRuntime;
  private hitManager!: HitManager;
  private dropRng!: PRNG;

  // Items
  private inventory!: Inventory;
  private worldItemDropRuntime!: WorldItemDropRuntime;
  private worldFixedItemSpawnRuntime!: WorldFixedItemSpawnRuntime;
  private worldHandPlacedItemRuntime!: WorldHandPlacedItemRuntime;
  private worldProjectileRuntime!: WorldProjectileRuntime;
  private readonly worldCommonSpriteRuntime = new WorldCommonSpriteRuntime();
  /** Entities that ride the active GiantBuilder. Each frame their world
   *  coords are recomputed from the builder's current position so pickup /
   *  interaction hitboxes (which use world coords) stay in sync with the
   *  visual. Anything with `x`, `y`, `container` and an optional `baseY`
   *  (for bob-animated entities) can be attached. */
  private readonly builderAttachmentRuntime = new WorldBuilderAttachmentRuntime();
  private inventoryUI!: InventoryUI;
  /** DEC-046 Identity Archive (??? ??u?? ??? ????). JUMP ??? ????. */
  private identityArchive!: IdentityArchive;
  private hud!: HUD;
  private areaTitle!: AreaTitle;
  private introHandoffRuntime!: WorldIntroHandoffRuntime;
  private uiSkin: UISkin | null = null;
  private pauseMenu!: PauseMenu;
  private characterStats!: CharacterStats;
  private deathScreen!: DeathScreen;

  // Room transition
  private edgeTransitionRuntime!: WorldEdgeTransitionRuntime;
  private edgeTransitionFlowRuntime!: WorldEdgeTransitionFlowRuntime;
  private fadeOverlay!: Graphics;
  private itemWorldReturnFade!: ItemWorldReturnFadeRuntime;
  private readonly cameraInputRuntime = new WorldCameraInputRuntime();

  private bossLockRuntime!: WorldBossLockRuntime;

  // Tutorial hints
  private tutorialHint!: TutorialHint;
  private worldTutorialHints!: WorldTutorialHintRuntime;
  private lowHpHealHint!: LowHpHealHintRuntime;
  private inventoryTutorialHint!: InventoryTutorialHintRuntime;
  private uiController!: WorldUiController;
  private transitionController!: WorldTransitionController;
  private worldPlayerSpawnRuntime!: WorldPlayerSpawnRuntime;
  private worldMapRuntime!: WorldMapRuntime;
  private worldMinimap!: WorldMinimapRuntime;
  private debugWarpRuntime!: WorldDebugWarpRuntime;
  private readonly saveRoomAudioRuntime = new SaveRoomAudioRuntime();
  private worldSaveRuntime!: WorldSaveRuntime;
  private worldSpawnState!: WorldSpawnState;

  // Toast, damage numbers & Sakurai hit effects
  private toast!: ToastManager;
  /** Gamepad hot-plug ???? ?????? unsubscribe ? exit ?? ???. */
  private _gpUnsub: (() => void) | null = null;
  private noWeaponFeedbackRuntime!: WorldNoWeaponFeedbackRuntime;
  private bossHpRuntime!: BossHpRuntime;

  private readonly combatFeedbackRuntime = new WorldCombatFeedbackRuntime();
  private readonly movementVfxRuntime = new WorldMovementVfxRuntime();
  private readonly grassFireRuntime = new WorldGrassFireRuntime();
  private readonly egoShardRuntime = new EgoShardRuntime();
  private readonly itemWorldEntryStream = new ItemWorldEntryStreamRuntime();
  private worldEnemyUpdateRuntime!: WorldEnemyUpdateRuntime;
  private worldEnemyCombatRuntime!: WorldEnemyCombatRuntime;
  private worldEnemyKillRuntime!: WorldEnemyKillRuntime;
  private worldEnemyContactRuntime!: WorldEnemyContactRuntime;
  private readonly worldEnemyRenderRuntime = new WorldEnemyRenderRuntime({
    getEnemies: () => this.worldEnemyRegistry.enemies,
  });
  private worldEgoShardCastRuntime!: WorldEgoShardCastRuntime;
  private worldEgoShardCombatRuntime!: WorldEgoShardCombatRuntime;
  private worldEgoShardProjectileRuntime!: WorldEgoShardProjectileRuntime;
  private worldEgoShardImpactRuntime!: WorldEgoShardImpactRuntime;
  private readonly worldContainerRegistry = new WorldContainerRegistry();
  private maintainedContainerSpawnerRuntime!: WorldMaintainedContainerSpawnerRuntime;
  private worldContainerSpawnRuntime!: WorldContainerSpawnRuntime;
  private readonly worldContainerCarryRuntime = new WorldContainerCarryRuntime();
  private worldContainerDestructionRuntime!: ContainerDestructionRuntime;
  private worldContainerFluidRuntime!: WorldContainerFluidRuntime;
  private worldContainerPhysicsRuntime!: WorldContainerPhysicsRuntime;
  private worldContainerAttackRuntime!: WorldContainerAttackRuntime;
  private readonly worldFluidContactState = new WorldFluidContactState();
  private worldFluidFeedbackRuntime!: WorldFluidFeedbackRuntime;
  private readonly worldFluidReactionRuntime = new FluidReactionRuntime({
    getPlayer: () => this.player,
    getEnemies: () => this.worldEnemyRegistry.enemies,
    getContainers: () => this.worldContainerRegistry.getContainers(),
    getCollisionGrid: () => this.collisionGridRuntime.grid,
    getFluidSystem: () => this.worldFluidRuntime.system,
    getFluidResidue: () => this.worldFluidRuntime.residue,
    getTileMutator: () => this.worldTileMutationRuntime.mutator,
    getSteamPuff: () => this.movementVfxRuntime.steamPuff,
    getDamageNumbers: () => this.combatFeedbackRuntime.damageNumbers,
    getHitSparks: () => this.combatFeedbackRuntime.hitSparks,
    shakeCamera: (strength) => this.game.camera.shake(strength),
  });
  private readonly solidifiedWallOverlay = new WorldSolidifiedWallOverlay(TILE_SIZE);
  private readonly pickupVfxRuntime = new WorldPickupVfxRuntime();
  private readonly statusFeedbackRuntime = new WorldStatusFeedbackRuntime();
  private worldPlayerImpactRuntime!: WorldPlayerImpactRuntime;
  private savePointRuntime!: SavePointRuntime;

  // Game Over
  private gameOverRuntime!: WorldGameOverRuntime;

  // Portal system
  private portalRuntime!: PortalRuntime;
  private readonly portalEntryRuntime = new PortalEntryRuntime();
  private altarController!: WorldAltarController;
  private itemWorldTransitionRuntime!: ItemWorldTransitionRuntime;
  private anvilCyclePrompt!: AnvilCyclePromptRuntime;

  // Oxygen HUD
  private oxygenOverlay!: OxygenOverlay;

  
  // Anvil + Floor Collapse system
  private anvil: Anvil | null = null;
  private anvilPrompts!: AnvilPromptController;
  private anvilPlacement!: AnvilPlacementController;
  private anvilRetirementRuntime!: WorldAnvilRetirementRuntime;
  private anvilInteractionRuntime!: WorldAnvilInteractionRuntime;
  private anvilSpawnRuntime!: WorldAnvilSpawnRuntime;
  private anvilItemRuntime!: WorldAnvilItemRuntime;
  private anvilDeploymentRuntime!: WorldAnvilDeploymentRuntime;
  private readonly itemWorldEntryState = new WorldItemWorldEntryState();
  private itemWorldEntryTransition!: ItemWorldEntryPushTransition;
  private itemWorldSceneFlowRuntime!: WorldItemWorldSceneFlowRuntime;
  private itemWorldSceneTransitionRuntime!: WorldItemWorldSceneTransitionRuntime;
  private itemWorldGrowthSnapshot!: ItemWorldGrowthSnapshotController;
  private itemWorldGhostCollision!: ItemWorldGhostCollisionRuntime;
  private itemWorldGhostStream!: ItemWorldGhostStreamRuntime;
  private itemDeploymentTunnelRuntime!: ItemDeploymentTunnelRuntime;
  private itemDeploymentTunnelFlowRuntime!: WorldItemDeploymentTunnelFlowRuntime;
  private itemDeploymentAtmosphereFlowRuntime!: WorldItemDeploymentAtmosphereFlowRuntime;
  private readonly itemDeploymentCollisionRuntime = new WorldItemDeploymentCollisionRuntime();
  private readonly fixedItemWorld = new FixedItemWorldRuntime();
  private fixedItemWorldFlowRuntime!: WorldFixedItemWorldFlowRuntime;
  private anvilItemWorldFlowRuntime!: WorldAnvilItemWorldFlowRuntime;
  private anvilReturnFlowRuntime!: WorldAnvilReturnFlowRuntime;
  private portalItemWorldFlowRuntime!: WorldPortalItemWorldFlowRuntime;
  private anvilDiveUiRuntime!: WorldAnvilDiveUiRuntime;

  // Sacred Pickup ? weapon pickup cutscene + lore popup + dive preview.
  private lorePopup: LorePopup | null = null;
  private divePreview: DivePreview | null = null;
  /** Ceremonial overlay for relic / max HP+ acquisition. Replaces former toast.showBig. */
  private acquireOverlayRuntime!: WorldAcquireOverlayRuntime;
  private readonly sacredPickupState = new WorldSacredPickupState();
  private sacredPickupRuntime!: WorldSacredPickupRuntime;
  private readonly anvilReturnState = new AnvilItemWorldReturnState();

  private readonly worldProgressState = new WorldProgressState();
  private readonly worldDoorSwitchRegistry = new WorldDoorSwitchRegistry();
  private worldDoorSwitchSpawnRuntime!: WorldDoorSwitchSpawnRuntime;
  private worldDoorSwitchInteractionRuntime!: WorldDoorSwitchInteractionRuntime;
  private readonly worldDoorAttackState = new WorldDoorAttackState();
  private readonly worldCollapsingPlatformRegistry = new WorldCollapsingPlatformRegistry();
  private worldCollapsingPlatformRuntime!: WorldCollapsingPlatformRuntime;
  private readonly worldGrowingWallRegistry = new WorldGrowingWallRegistry();
  private worldGrowingWallRuntime!: WorldGrowingWallRuntime;
  private readonly worldCrackedFloorRegistry = new WorldCrackedFloorRegistry();
  private worldCrackedFloorRuntime!: WorldCrackedFloorRuntime;
  private readonly worldBreakablePropRegistry = new WorldBreakablePropRegistry();
  private worldBreakablePropRuntime!: WorldBreakablePropRuntime;
  /** ??? ?¡À???? Breakable (LDtk Entity 'Breakable') ?????????. ?¥ì????? props ?? ?? ??????? ????. */
  private readonly worldBreakableRegistry = new WorldBreakableRegistry();
  private worldBreakableRuntime!: WorldBreakableRuntime;
  /** ??? ?¡À???? Building (LDtk Entity 'Building') ?????????. ??? ????/??©ª? ????. */
  private readonly worldBuildingRegistry = new WorldBuildingRegistry();
  private worldBuildingRuntime!: WorldBuildingRuntime;
  private readonly worldSecretWallRegistry = new WorldSecretWallRegistry();
  private worldSecretWallRuntime!: WorldSecretWallRuntime;
  private readonly worldSpikeRegistry = new WorldSpikeRegistry();
  private worldSpikeRuntime!: WorldSpikeRuntime;
  // Updraft: IntGrid value 4 ? handled in WorldUpdraftRuntime
  private readonly worldUpdraftRuntime = new WorldUpdraftRuntime();
  /** Dynamic IntGrid state and overlay renderer for frozen/burning/electric cells. */
  private readonly worldTileMutationRuntime = new WorldTileMutationRuntime();
  private worldTileHazardRuntime!: WorldTileHazardRuntime;
  /** Tier B burnable entities spawned by BurnableZonePass. Reset per room. */
  private readonly worldBurnablePropRegistry = new WorldBurnablePropRegistry();
  private worldBurnablePropRuntime!: WorldBurnablePropRuntime;
  private voidRuntime!: WorldVoidRuntime;
  private voidReturnRuntime!: WorldVoidReturnRuntime;
  private readonly voidFogRuntime = new WorldVoidFogRuntime();
  private worldPickupRuntime!: WorldPickupRuntime;
  private worldRelicPickupRuntime!: WorldRelicPickupRuntime;
  private readonly worldPlayerProgressionState = new WorldPlayerProgressionState();
  private worldPlayerStatRuntime!: WorldPlayerStatRuntime;

  private endingRuntime!: WorldEndingRuntime;
  /**
   * Exit Light Bleed ? ???? ?????? ??????? ?? ???????? ???? ???? ?????? ???
   * ?¡À???? ???? ?????? ?¬Ö??? ???? ?????? ???.
   * (Documents/Research/RoomTransition_Readability_Research.md A2)
   */
  private exitGlowRuntime!: WorldExitGlowRuntime;
  private loreDisplay: LoreDisplay | null = null;
  private dialogueTriggerRuntime!: WorldDialogueTriggerRuntime;
  private prologueEndRuntime!: WorldPrologueEndRuntime;
  private worldEgoDialogueRuntime!: WorldEgoDialogueRuntime;

  /** Pattern D (proximity-interaction) ? ???? ?????? ?ÄØ???? ?????. */
  private proximity: ProximityRouter = new ProximityRouter();










  constructor(game: Game, saveAccess: LdtkSceneSaveAccess) {
    super(game);
    this.saveAccess = saveAccess;
    this.wireCoreAndAnvilRuntimes();
    this.wireEnvironmentRuntimes();
    this.wirePickupAndBuilderItemRuntimes();
    this.wireTerrainRuntimes();
    this.wireItemWorldFlowRuntimes();
    this.wireCombatAndTransitionRuntimes();
    this.wireBuilderFlowRuntime();
    this.registerProximityHandlers();
  }

  private wireCoreAndAnvilRuntimes(): void {
    this.oxygenOverlay = new OxygenOverlay(this.game);
    this.anvilDiveUiRuntime = new WorldAnvilDiveUiRuntime(this.game.uiContainer);
    this.anvilRetirementRuntime = new WorldAnvilRetirementRuntime({
      getUnlockedEvents: () => this.worldProgressState.unlockedEvents,
      isFirstItemWorldBossDefeated: () => this.saveAccess.isFirstItemWorldBossDefeated(),
      getAnvil: () => this.anvil,
      getReturnRetireAfterFirstBoss: () => this.anvilReturnState.retireAfterFirstBoss,
      clearReturnItem: () => this.anvilReturnState.setItem(null),
      hidePrompts: () => this.anvilPrompts.hideAll(),
      closeAnvilInventoryIfOpen: () => {
        this.inventoryUI.closeIfAnvilModeOpen();
      },
      flushInventoryHint: () => this.inventoryTutorialHint.flushDeferredFirstItemWorldReturnHint(500),
    });
    this.worldFluidFeedbackRuntime = new WorldFluidFeedbackRuntime({
      getPlayer: () => this.player,
      getEnemies: () => this.worldEnemyRegistry.enemies,
      getCollisionGrid: () => this.collisionGridRuntime.grid,
      getFluidSystem: () => this.worldFluidRuntime.system,
      getFluidSpawners: () => this.worldFluidRuntime.spawners,
      getFluidResidue: () => this.worldFluidRuntime.residue,
      getContactState: () => this.worldFluidContactState,
      getDamageNumbers: () => this.combatFeedbackRuntime.damageNumbers,
      getLandingDust: () => this.movementVfxRuntime.landingDust,
      getJumpTakeoff: () => this.movementVfxRuntime.jumpTakeoff,
      getSteamPuff: () => this.movementVfxRuntime.steamPuff,
      getWaterBubbles: () => this.movementVfxRuntime.waterBubbles,
      getWaterSplash: () => this.movementVfxRuntime.waterSplash,
      getIceSkidStreak: () => this.movementVfxRuntime.iceSkidStreak,
    });
    this.worldSaveRuntime = new WorldSaveRuntime({
      getPlayer: () => this.player,
      getLevelId: () => this.currentLevel?.identifier ?? this.worldSpawnState.currentLevelId,
      getInventory: () => this.inventory,
      getUnlockedEvents: () => this.worldProgressState.unlockedEvents,
      getCollectedRelics: () => this.worldProgressState.collectedRelics,
      getCollectedItems: () => this.worldProgressState.collectedItems,
      getVisitedLevels: () => this.worldProgressState.visitedLevels,
      getClearedLevels: () => this.worldProgressState.clearedLevels,
      getGold: () => this.worldPlayerProgressionState.gold,
      getPlaytimeMs: () => this.game.stats.playTimeMs,
      getHealthShardBonus: () => this.worldPlayerProgressionState.healthShardBonus,
      getCompletedTutorialHints: () => this.tutorialHint.getCompletedIds(),
      flashSaveFeedback: () => this.combatFeedbackRuntime.screenFlash.flash(0x44ffaa, 0.3, 200),
      setHitstopFrames: (frames) => { this.game.hitstopFrames = frames; },
      pulseNearestSavePoint: () => this.savePointRuntime.pulseNearest(),
      showToast: (message, color) => this.toast.show(message, color),
      updateHud: (hp, maxHp, gold) => {
        this.hud.updateHP(hp, maxHp);
        this.hud.updateGold(gold);
      },
    });
    this.worldPlayerStatRuntime = new WorldPlayerStatRuntime({
      getPlayer: () => this.player,
      getInventory: () => this.inventory,
      getHealthShardBonus: () => this.worldPlayerProgressionState.healthShardBonus,
    });
    this.worldEnemyKillRuntime = new WorldEnemyKillRuntime({
      getEnemies: () => this.worldEnemyRegistry.enemies,
      incrementEnemiesKilled: () => { this.game.stats.enemiesKilled++; },
      unlockDoorByIid: (iid) => this.worldDoorSwitchInteractionRuntime.unlockDoorByIid(iid),
      getUnlockedEvents: () => this.worldProgressState.unlockedEvents,
      flashBossKill: () => this.combatFeedbackRuntime.screenFlash.flash(0xffd700, 0.5, 300),
      setHitstopFrames: (frames) => { this.game.hitstopFrames = frames; },
      deactivateBossLock: () => this.bossLockRuntime.deactivate(),
      getFixedItemWorldItem: () => this.fixedItemWorld.currentItem,
      isFirstItemWorldBossDefeated: () => this.saveAccess.isFirstItemWorldBossDefeated(),
      markFirstItemWorldBossDefeated: () => this.saveAccess.markFirstItemWorldBossDefeated(),
      syncPlayerStats: () => this.worldPlayerStatRuntime.sync(),
      showBigToast: (message, color) => this.toast.showBig(message, color),
      isSceneInitialized: () => this.initialized,
      spawnPortal: (x, y, rarity, sourceType, item) => this.portalRuntime.spawn(x, y, rarity, sourceType, item),
      getCollisionGrid: () => this.collisionGridRuntime.grid,
      getPlayerMaxHp: () => this.player.maxHp,
      rollDrop: () => this.dropRng.next(),
      addGoldPickup: (pickup) => this.worldPickupRuntime.addGoldPickup(pickup),
      addHealingPickup: (pickup) => this.worldPickupRuntime.addHealingPickup(pickup),
      removeEnemyAt: (index) => this.worldEnemyRegistry.removeAt(index),
    });
    this.worldEnemyCombatRuntime = new WorldEnemyCombatRuntime({
      getPlayer: () => this.player,
      getEnemies: () => this.worldEnemyRegistry.enemies,
      getHitManager: () => this.hitManager,
      getDamageNumbers: () => this.combatFeedbackRuntime.damageNumbers,
      getHitSparks: () => this.combatFeedbackRuntime.hitSparks,
      getScreenFlash: () => this.combatFeedbackRuntime.screenFlash,
      isAttackBlocked: (enemy) => this.worldDoorSwitchInteractionRuntime.isAttackBlocked(enemy),
    });
    this.worldEnemyUpdateRuntime = new WorldEnemyUpdateRuntime({
      getEnemies: () => this.worldEnemyRegistry.enemies,
      getEntityLayer: () => this.entityLayer,
    });
    this.worldEnemyContactRuntime = new WorldEnemyContactRuntime({
      game: this.game,
      getPlayer: () => this.player,
      getEnemies: () => this.worldEnemyRegistry.enemies,
      getHud: () => this.hud,
      getDamageNumbers: () => this.combatFeedbackRuntime.damageNumbers,
      getHitSparks: () => this.combatFeedbackRuntime.hitSparks,
      getScreenFlash: () => this.combatFeedbackRuntime.screenFlash,
    });
    this.anvilInteractionRuntime = new WorldAnvilInteractionRuntime({
      getAnvil: () => this.anvil,
      getPlayer: () => this.player,
      getPrompts: () => this.anvilPrompts ?? null,
      isRetiredByBossClear: (anvil) => this.anvilRetirementRuntime.isRetiredByBossClear(anvil),
      isDeploymentActive: () => this.itemWorldEntryState.isDeploymentActive(),
      triggerFloorCollapse: () => this.anvilDeploymentRuntime.triggerFloorCollapse(),
    });
    this.anvilSpawnRuntime = new WorldAnvilSpawnRuntime({
      getAnvil: () => this.anvil,
      setAnvil: (anvil) => { this.anvil = anvil; },
      getEntityLayer: () => this.entityLayer,
      getPrompts: () => this.anvilPrompts ?? null,
      readRetireAfterBossFlag: (ent) => this.anvilRetirementRuntime.readRetireAfterBossFlag(ent),
      shouldSpawnDisabled: (retireAfterFirstBoss) => this.anvilRetirementRuntime.shouldSpawnDisabled(retireAfterFirstBoss),
    });
    this.anvilItemRuntime = new WorldAnvilItemRuntime({
      getAnvil: () => this.anvil,
      getInventory: () => this.inventory,
      closeInventory: () => this.inventoryUI.close(),
      openAnvilPlacement: () => this.anvilPlacement.open(),
      setEntryItem: (item) => { this.itemWorldEntryState.setEntryItem(item); },
      setReturnItem: (item) => this.anvilReturnState.setItem(item),
      suppressPrompts: (durationMs) => this.anvilPrompts.suppress(durationMs),
      showToast: (message, color) => this.toast.show(message, color),
      flushInventoryHint: (delayMs) => this.inventoryTutorialHint.flushDeferredFirstItemWorldReturnHint(delayMs),
      restoreUiAfterDiveTransition: () => this.anvilDiveUiRuntime.restore(),
      setSharedUiVisible: (visible) => { this.game.uiContainer.visible = visible; },
      hideUiForDiveTransition: () => this.anvilDiveUiRuntime.hide(),
      markFirstDiveDone: () => this.saveAccess.markFirstDiveDone(),
      triggerFloorCollapse: () => this.anvilDeploymentRuntime.triggerFloorCollapse(),
    });
    this.anvilDeploymentRuntime = new WorldAnvilDeploymentRuntime({
      game: this.game,
      getPlayer: () => this.player,
      getEntityLayer: () => this.entityLayer,
      getActiveBuilder: () => this.activeBuilder,
      getDeploymentFxLayer: () => this.deploymentFxLayer,
      getTunnelRightEdge: () => this.currentLevel.pxWid,
      getAnvil: () => this.anvil,
      getItem: () => this.itemWorldEntryState.getEntryItem(),
      getCurrentLevelId: () => this.currentLevel?.identifier ?? null,
      hidePrompts: () => this.anvilInteractionRuntime.hidePrompts(),
      hideSavePoint: () => this.savePointRuntime.hideForItemDeployment(),
      hideUiForDiveTransition: () => this.anvilDiveUiRuntime.hide(),
      recordReturnState: (anvil, levelId, item) => this.anvilReturnState.record(anvil, levelId, item),
      setPreTunnelLevelId: (levelId) => { this.itemWorldEntryState.setPreTunnelLevelId(levelId); },
      incrementDive: (itemDefId) => this.saveAccess.incrementDive(itemDefId),
      destroyDeployment: () => this.itemWorldEntryState.destroyDeployment(),
      setDeployment: (deployment) => { this.itemWorldEntryState.setDeployment(deployment); },
      enterItemWorld: () => this.anvilItemWorldFlowRuntime.enterFromTunnel({ entryCorridor: false }),
      spawnStrikeEffect: (x, y, strong, variant) => this.combatFeedbackRuntime.hitSparks.spawn(x, y, strong, variant),
      openTunnel: (x, y, w, h, options) => this.itemDeploymentTunnelFlowRuntime.openDeploymentTunnel(x, y, w, h, options ?? { scheduleGhost: false }),
      setLaserDesaturation: (active) => this.itemDeploymentAtmosphereFlowRuntime.setLaserDesaturation(active),
      // EGO_TUNNEL_OPEN dialogue intentionally disabled for first deployment path.
      showTunnelOpenDialogue: () => {},
      prepareStreamWorld: (options) => this.itemWorldGhostStream.prepareLevel36(options),
      loadStreamWorld: (options) => this.itemWorldGhostStream.loadLevel36(options),
      getEntranceAABB: () => this.itemWorldGhostStream.getEntranceAABB(),
      getPlatformStart: () => this.itemWorldGhostStream.getPlatformStart(),
      getPlatformVisualStart: () => this.itemWorldGhostStream.getPlatformVisualStart(this.itemWorldGrowthSnapshot.getProjection()),
    });
    this.worldWeatherRuntime = new WorldWeatherRuntime({
      game: this.game,
      tileSize: TILE_SIZE,
      debug: LdtkWorldScene.debugMode,
      getWeatherLayer: () => this.weatherLayer,
      getCollisionGrid: () => this.collisionGridRuntime.grid,
      getDynamicColliders: () => this.builderWeatherRuntime.getDynamicColliders(this.activeBuilder),
      isIgnoredCell: (col, row) => this.builderStampRuntime.isStampedCell(col, row, this.collisionGridRuntime.grid),
    });
  }

  private wireEnvironmentRuntimes(): void {
    this.maintainedContainerSpawnerRuntime = new WorldMaintainedContainerSpawnerRuntime({
      getCollisionGrid: () => this.collisionGridRuntime.grid,
      getContainers: () => this.worldContainerRegistry.getContainers(),
      getEntityLayer: () => this.entityLayer,
    });
    this.worldContainerSpawnRuntime = new WorldContainerSpawnRuntime({
      registry: this.worldContainerRegistry,
      maintainedSpawnerRuntime: this.maintainedContainerSpawnerRuntime,
      getCollisionGrid: () => this.collisionGridRuntime.grid,
      getEntityLayer: () => this.entityLayer,
      isDebugMode: () => LdtkWorldScene.debugMode,
    });
    this.worldContainerDestructionRuntime = new ContainerDestructionRuntime({
      game: this.game,
      getPropShatter: () => this.combatFeedbackRuntime.propShatter,
    });
    this.worldContainerFluidRuntime = new WorldContainerFluidRuntime({
      game: this.game,
      getCollisionGrid: () => this.collisionGridRuntime.grid,
      getTileMutator: () => this.worldTileMutationRuntime.mutator,
      getFluidSystem: () => this.worldFluidRuntime.system,
      getContainers: () => this.worldContainerRegistry.getContainers(),
      getEnemies: () => this.worldEnemyRegistry.enemies,
      getSteamPuff: () => this.movementVfxRuntime.steamPuff,
      rerenderTilemap: () => this.rerenderTilemap(),
    });
    this.worldContainerPhysicsRuntime = new WorldContainerPhysicsRuntime({
      getPlayer: () => this.player,
      getEnemies: () => this.worldEnemyRegistry.enemies,
      getContainers: () => this.worldContainerRegistry.getContainers(),
      getCollisionGrid: () => this.collisionGridRuntime.grid,
      getTileMutator: () => this.worldTileMutationRuntime.mutator,
      getDamageNumbers: () => this.combatFeedbackRuntime.damageNumbers,
      getHitSparks: () => this.combatFeedbackRuntime.hitSparks,
      paintContainerImpact: (kind, gx, gy, volume) => this.worldContainerFluidRuntime.paintImpact(kind, gx, gy, volume),
      applyContainerEffectToFluid: (container) => this.worldContainerFluidRuntime.applyContainerEffect(container),
      destroyContainerWithVFX: (container) => this.worldContainerDestructionRuntime.destroyWithVfx(container),
      removeContainerAt: (index) => this.worldContainerRegistry.removeAt(index),
      flushContainerFluidChanges: () => this.worldContainerFluidRuntime.flush(),
    });
    this.worldContainerAttackRuntime = new WorldContainerAttackRuntime({
      getPlayer: () => this.player,
      getContainers: () => this.worldContainerRegistry.getContainers(),
      getHitSparks: () => this.combatFeedbackRuntime.hitSparks,
      paintContainerImpact: (kind, gx, gy, volume) => this.worldContainerFluidRuntime.paintImpact(kind, gx, gy, volume),
      destroyContainerWithVFX: (container) => this.worldContainerDestructionRuntime.destroyWithVfx(container),
      removeContainerAt: (index) => this.worldContainerRegistry.removeAt(index),
    });
    this.worldPlayerImpactRuntime = new WorldPlayerImpactRuntime({
      game: this.game,
      getPlayer: () => this.player,
      getEnemies: () => this.worldEnemyRegistry.enemies,
      getDamageNumbers: () => this.combatFeedbackRuntime.damageNumbers,
      getHitSparks: () => this.combatFeedbackRuntime.hitSparks,
      getScreenFlash: () => this.combatFeedbackRuntime.screenFlash,
      shatterGrowingWallsOnSurge: (playerBox) => this.worldGrowingWallRuntime.shatterOnSurge(playerBox),
      shatterCrackedFloorsOnSurge: (playerBox) => this.worldCrackedFloorRuntime.shatterOnSurge(playerBox),
      shatterCrackedFloorsOnLanding: (px, py, radius) => this.worldCrackedFloorRuntime.shatterOnLanding(px, py, radius),
      shatterGrowingWallsOnLanding: (px, py, radius) => this.worldGrowingWallRuntime.shatterOnLanding(px, py, radius),
    });
    this.worldEgoShardCombatRuntime = new WorldEgoShardCombatRuntime({
      getPlayer: () => this.player,
      getEnemies: () => this.worldEnemyRegistry.enemies,
      getContainers: () => this.worldContainerRegistry.getContainers(),
      getCollisionGrid: () => this.collisionGridRuntime.grid,
      getTileMutator: () => this.worldTileMutationRuntime.mutator,
      getDamageNumbers: () => this.combatFeedbackRuntime.damageNumbers,
      getHitSparks: () => this.combatFeedbackRuntime.hitSparks,
      retrieveShardsInAABB: (x, y, width, height) => this.egoShardRuntime.retrieveInAABB(x, y, width, height),
      paintContainerImpact: (kind, gx, gy, volume) => this.worldContainerFluidRuntime.paintImpact(kind, gx, gy, volume),
      destroyContainerWithVFX: (container) => this.worldContainerDestructionRuntime.destroyWithVfx(container),
      removeContainerAt: (index) => this.worldContainerRegistry.removeAt(index),
    });
    this.worldEgoShardImpactRuntime = new WorldEgoShardImpactRuntime({
      game: this.game,
      getPlayer: () => this.player,
      getRoom: () => this.player.roomData,
      getCollisionGrid: () => this.collisionGridRuntime.grid,
      getTileMutator: () => this.worldTileMutationRuntime.mutator,
      getFluidSystem: () => this.worldFluidRuntime.system,
      getFluidResidue: () => this.worldFluidRuntime.residue,
      getSteamPuff: () => this.movementVfxRuntime.steamPuff,
      igniteGrassInCellAABB: (minGx, minGy, maxGx, maxGy) => this.grassFireRuntime.igniteInCellAABB(minGx, minGy, maxGx, maxGy),
      showToast: (message, color) => this.toast.show(message, color),
    });
    this.worldEgoShardProjectileRuntime = new WorldEgoShardProjectileRuntime({
      getPlayer: () => this.player,
      getCollisionGrid: () => this.collisionGridRuntime.grid,
      getEgoShardRuntime: () => this.egoShardRuntime,
      onImpact: (x, y, element) => this.worldEgoShardImpactRuntime.handleImpact(x, y, element),
      checkHit: (x, y, element) => this.worldEgoShardCombatRuntime.checkHit(x, y, element),
      flushContainerFluidChanges: () => this.worldContainerFluidRuntime.flush(),
    });
    this.worldEgoShardCastRuntime = new WorldEgoShardCastRuntime({
      game: this.game,
      getPlayer: () => this.player,
      getCollisionGrid: () => this.collisionGridRuntime.grid,
      getEgoShardRuntime: () => this.egoShardRuntime,
      hasHeldContainer: () => !!this.worldContainerCarryRuntime.heldContainer,
    });
  }

  private wirePickupAndBuilderItemRuntimes(): void {
    this.worldPickupRuntime = new WorldPickupRuntime({
      getPlayer: () => this.player,
      getEntityLayer: () => this.entityLayer,
      getDamageNumbers: () => this.combatFeedbackRuntime.damageNumbers,
      getItemPickupGlow: () => this.pickupVfxRuntime.itemGlow,
      getScreenFlash: () => this.combatFeedbackRuntime.screenFlash,
      showToast: (message, color) => this.toast.show(message, color),
      addGold: (amount) => {
        this.worldPlayerProgressionState.addGold(amount);
      },
      addCollectedItem: (key) => {
        this.worldProgressState.collectedItems.add(key);
      },
    });
    this.worldRelicPickupRuntime = new WorldRelicPickupRuntime({
      game: this.game,
      getPlayer: () => this.player,
      getEntityLayer: () => this.entityLayer,
      getRelicAuraBurst: () => this.pickupVfxRuntime.relicAura,
      getScreenFlash: () => this.combatFeedbackRuntime.screenFlash,
      getCurrentLevelId: () => this.currentLevel?.identifier,
      getAcquireOverlayRuntime: () => this.acquireOverlayRuntime,
      addCollectedRelic: (key) => this.worldProgressState.collectedRelics.add(key),
      addHealthShardBonus: (amount) => this.worldPlayerProgressionState.addHealthShardBonus(amount),
      updatePlayerAtk: () => this.worldPlayerStatRuntime.sync(),
      showBigToast: (message, color) => this.toast.showBig(message, color),
    });
    this.worldItemDropRuntime = new WorldItemDropRuntime({
      getPlayer: () => this.player,
      getEntityLayer: () => this.entityLayer,
      getInventory: () => this.inventory,
      recordItemCollectedStat: () => { this.game.stats.itemsCollected++; },
      showToast: (message, color) => this.toast.show(message, color),
      addCollectedItem: (key) => this.worldProgressState.collectedItems.add(key),
      spawnItemPickupGlow: (x, y, tint) => this.pickupVfxRuntime.itemGlow.spawn(x, y, tint),
      startSacredPickup: (item, x, y) => this.sacredPickupRuntime.startPickup(item, x, y),
    });
    this.worldFixedItemSpawnRuntime = new WorldFixedItemSpawnRuntime({
      getCollisionGrid: () => this.collisionGridRuntime.grid,
      addItemDrop: (drop) => this.worldItemDropRuntime.add(drop),
      addGoldPickup: (pickup) => this.worldPickupRuntime.addGoldPickup(pickup),
      showToast: (message, color) => this.toast.show(message, color),
    });
    this.builderItemRuntime = new WorldBuilderItemRuntime({
      attachments: this.builderAttachmentRuntime,
      fixedItemSpawn: this.worldFixedItemSpawnRuntime,
      itemDrops: this.worldItemDropRuntime,
      pickups: this.worldPickupRuntime,
      hasCollectedItem: (key) => this.worldProgressState.collectedItems.has(key),
      addCollectedItem: (key) => this.worldProgressState.collectedItems.add(key),
    });
    this.builderStaticEntityRuntime = new WorldBuilderStaticEntityRuntime({
      attachments: this.builderAttachmentRuntime,
      getEntityLayer: () => this.entityLayer,
      spikeRegistry: this.worldSpikeRegistry,
      breakableRegistry: this.worldBreakableRegistry,
      collapsingPlatformRegistry: this.worldCollapsingPlatformRegistry,
      getUnlockedEvents: () => this.worldProgressState.unlockedEvents,
    });
    this.builderDoorSwitchRuntime = new WorldBuilderDoorSwitchRuntime({
      attachments: this.builderAttachmentRuntime,
      getEntityLayer: () => this.entityLayer,
      registry: this.worldDoorSwitchRegistry,
      getUnlockedEvents: () => this.worldProgressState.unlockedEvents,
    });
    this.worldHandPlacedItemRuntime = new WorldHandPlacedItemRuntime({
      hasCollectedItem: (key) => this.worldProgressState.collectedItems.has(key),
      addCollectedItem: (key) => this.worldProgressState.collectedItems.add(key),
      spawnFixedItem: (x, y, itemId, itemKey) => this.worldFixedItemSpawnRuntime.spawn(x, y, itemId, itemKey),
    });
  }

  private wireTerrainRuntimes(): void {
    this.worldSecretWallRuntime = new WorldSecretWallRuntime({
      game: this.game,
      getPlayer: () => this.player,
      getCollisionGrid: () => this.collisionGridRuntime.grid,
      getRenderer: () => this.renderer,
      getRegistry: () => this.worldSecretWallRegistry,
      getUnlockedEvents: () => this.worldProgressState.unlockedEvents,
      getCurrentLevelId: () => this.currentLevel?.identifier,
      addItemDrop: (drop) => this.worldItemDropRuntime.add(drop),
      spawnFixedItem: (x, y, itemId) => this.worldFixedItemSpawnRuntime.spawn(x, y, itemId),
      showToast: (message, color) => this.toast.show(message, color),
    });
    this.worldCrackedFloorRuntime = new WorldCrackedFloorRuntime({
      game: this.game,
      getPlayer: () => this.player,
      getCollisionGrid: () => this.collisionGridRuntime.grid,
      getEntityLayer: () => this.entityLayer,
      getRegistry: () => this.worldCrackedFloorRegistry,
      getUnlockedEvents: () => this.worldProgressState.unlockedEvents,
      getScreenFlash: () => this.combatFeedbackRuntime.screenFlash,
      showToast: (message, color) => this.toast.show(message, color),
    });
    this.worldGrowingWallRuntime = new WorldGrowingWallRuntime({
      game: this.game,
      getPlayer: () => this.player,
      getCollisionGrid: () => this.collisionGridRuntime.grid,
      getEntityLayer: () => this.entityLayer,
      getRegistry: () => this.worldGrowingWallRegistry,
      getUnlockedEvents: () => this.worldProgressState.unlockedEvents,
      getHitSparks: () => this.combatFeedbackRuntime.hitSparks,
      getScreenFlash: () => this.combatFeedbackRuntime.screenFlash,
      addSpawnedSlime: (slime) => this.worldEnemyRegistry.add(slime, this.entityLayer),
      showToast: (message, color) => this.toast.show(message, color),
    });
    this.worldSpikeRuntime = new WorldSpikeRuntime({
      game: this.game,
      getPlayer: () => this.player,
      getEntityLayer: () => this.entityLayer,
      getRegistry: () => this.worldSpikeRegistry,
      getHud: () => this.hud,
      getScreenFlash: () => this.combatFeedbackRuntime.screenFlash,
      getDamageNumbers: () => this.combatFeedbackRuntime.damageNumbers,
    });
    this.worldBreakableRuntime = new WorldBreakableRuntime({
      game: this.game,
      getPlayer: () => this.player,
      getCollisionGrid: () => this.collisionGridRuntime.grid,
      getEntityLayer: () => this.entityLayer,
      getRegistry: () => this.worldBreakableRegistry,
      getPropShatter: () => this.combatFeedbackRuntime.propShatter,
      getHitSparks: () => this.combatFeedbackRuntime.hitSparks,
      addGoldPickup: (pickup) => this.worldPickupRuntime.addGoldPickup(pickup),
    });
    this.worldBuildingRuntime = new WorldBuildingRuntime({
      getEntityLayer: () => this.entityLayer,
      getRegistry: () => this.worldBuildingRegistry,
    });
    this.worldBreakablePropRuntime = new WorldBreakablePropRuntime({
      game: this.game,
      getPlayer: () => this.player,
      getCollisionGrid: () => this.collisionGridRuntime.grid,
      getEntityLayer: () => this.entityLayer,
      getRegistry: () => this.worldBreakablePropRegistry,
      getTileMutator: () => this.worldTileMutationRuntime.mutator,
      getPropShatter: () => this.combatFeedbackRuntime.propShatter,
      getHitSparks: () => this.combatFeedbackRuntime.hitSparks,
      findEdgePassage: (grid, direction, preferred) => this.transitionController.findEdgePassage(grid, direction, preferred),
      addGoldPickup: (pickup) => this.worldPickupRuntime.addGoldPickup(pickup),
    });
    this.worldCollapsingPlatformRuntime = new WorldCollapsingPlatformRuntime({
      getPlayer: () => this.player,
      getCollisionGrid: () => this.collisionGridRuntime.grid,
      getEntityLayer: () => this.entityLayer,
      getRegistry: () => this.worldCollapsingPlatformRegistry,
      getUnlockedEvents: () => this.worldProgressState.unlockedEvents,
      refreshBuilderGrid: (grid) => this.builderStampRuntime.refreshIfBuilderGrid(
        this.activeBuilder,
        grid,
        this.collisionGridRuntime.grid,
      ),
    });
    this.worldBurnablePropRuntime = new WorldBurnablePropRuntime({
      getCollisionGrid: () => this.collisionGridRuntime.grid,
      getEntityLayer: () => this.entityLayer,
      getRegistry: () => this.worldBurnablePropRegistry,
      getTileMutator: () => this.worldTileMutationRuntime.mutator,
      spawnAsh: (cx, baseY, footprintW) => this.grassFireRuntime.spawnAsh(cx, baseY, footprintW),
      isDebugMode: () => LdtkWorldScene.debugMode,
    });
    this.worldTileHazardRuntime = new WorldTileHazardRuntime({
      game: this.game,
      getPlayer: () => this.player,
      getEnemies: () => this.worldEnemyRegistry.enemies,
      getCollisionGrid: () => this.collisionGridRuntime.grid,
      getTileMutator: () => this.worldTileMutationRuntime.mutator,
      getBurnableRuntime: () => this.worldBurnablePropRuntime,
      getBreakableRuntime: () => this.worldBreakablePropRuntime,
      getGrassFireRuntime: () => this.grassFireRuntime,
      getTileMutationRuntime: () => this.worldTileMutationRuntime,
      getFluidSystem: () => this.worldFluidRuntime.system,
      getFluidSpawners: () => this.worldFluidRuntime.spawners,
      getFluidCrestFoam: () => this.worldFluidRuntime.crestFoam,
      rerenderTilemap: () => this.rerenderTilemap(),
      refreshFluidFromGrid: (collisionGrid) => this.worldFluidRuntime.system.refreshFromGrid(collisionGrid),
      getHud: () => this.hud,
      getDamageNumbers: () => this.combatFeedbackRuntime.damageNumbers,
      getScreenFlash: () => this.combatFeedbackRuntime.screenFlash,
    });
    this.worldDoorSwitchSpawnRuntime = new WorldDoorSwitchSpawnRuntime({
      getCollisionGrid: () => this.collisionGridRuntime.grid,
      getEntityLayer: () => this.entityLayer,
      getRegistry: () => this.worldDoorSwitchRegistry,
      getUnlockedEvents: () => this.worldProgressState.unlockedEvents,
    });
    this.worldDoorSwitchInteractionRuntime = new WorldDoorSwitchInteractionRuntime({
      game: this.game,
      getPlayer: () => this.player,
      getCollisionGrid: () => this.collisionGridRuntime.grid,
      getRegistry: () => this.worldDoorSwitchRegistry,
      getAttackState: () => this.worldDoorAttackState,
      getScreenFlash: () => this.combatFeedbackRuntime.screenFlash,
      getUnlockedEvents: () => this.worldProgressState.unlockedEvents,
      getCurrentLevelId: () => this.currentLevel?.identifier,
      refreshBuilderGrid: (grid) => this.builderStampRuntime.refreshIfBuilderGrid(
        this.activeBuilder,
        grid,
        this.collisionGridRuntime.grid,
      ),
      showToast: (message, color) => this.toast.show(message, color),
    });
    this.worldProjectileRuntime = new WorldProjectileRuntime({
      game: this.game,
      getPlayer: () => this.player,
      getEntityLayer: () => this.entityLayer,
      getEnemies: () => this.worldEnemyRegistry.enemies,
      getActiveAttackHitbox: () => getActivePlayerAttackHitbox(this.player),
      getHud: () => this.hud,
      getDamageNumbers: () => this.combatFeedbackRuntime.damageNumbers,
      getHitSparks: () => this.combatFeedbackRuntime.hitSparks,
      getScreenFlash: () => this.combatFeedbackRuntime.screenFlash,
    });
  }

  private wireItemWorldFlowRuntimes(): void {
    this.itemWorldEntryPreloader = new ItemWorldEntryPreloader(this.atlases);
    this.itemWorldEntryTransition = new ItemWorldEntryPushTransition(this.game);
    this.anvilReturnFlowRuntime = new WorldAnvilReturnFlowRuntime({
      entryState: this.itemWorldEntryState,
      returnState: this.anvilReturnState,
      getAnvil: () => this.anvil,
      getPlayer: () => this.player,
      snapCamera: (x, y) => this.game.camera.snap(x, y),
      resetEdgeTransition: () => this.edgeTransitionRuntime.reset(),
      loadLevel: (levelId, enterFrom) => {
        this.loadLevel(levelId, enterFrom);
      },
    });
    this.itemWorldSceneTransitionRuntime = new WorldItemWorldSceneTransitionRuntime({
      hideSceneDuringTransition: () => {
        this.container.visible = false;
      },
      detachSharedUiForItemWorld: () => {
        this.uiController.detachForItemWorld();
        // ????? hide. detachForItemWorld ?? ???? ???? UI ?? ??????, ?????? ?????? ????
        // ???? visible=true ?? a?? ?¥è? attach ???? ?????? ??????? ???? ????????? detach.
        this.worldMinimap.detach();
        this.altarController.destroyUi();
      },
      releaseWorldVisualsForItemWorld: () => {
        // iPad Safari can reload the page when the hidden overworld and the
        // procedural ItemWorld are both resident. Once the dive transition has
        // fully covered the screen, drop render-only overworld resources; return
        // flow calls loadLevel(), which rebuilds these layers from LDtk data.
        this.builderFlowRuntime.clearBuilder();
        this.renderer.clear();
        this.proceduralDecorRuntime.clearAll();
        this.grassFireRuntime.clearGrass();
        this.worldFluidRuntime.releaseWorldVisualsForItemWorld();
        this.worldWeatherRuntime.destroy();
        this.worldUpdraftRuntime.clear();
        this.voidFogRuntime.clear();
        this.pickupVfxRuntime.clear();
        this.combatFeedbackRuntime.clearDamageNumbers();
        this.itemDeploymentTunnelFlowRuntime.destroyGhostOverlay(true, false);
        this.itemDeploymentTunnelFlowRuntime.restoreDeploymentTunnel(false);
        this.itemDeploymentAtmosphereFlowRuntime.deactivateDungeonAtmosphere();
        this.itemWorldEntryState.destroyDeployment();
        this.itemWorldEntryState.setWorldVisualsReleased(true);
      },
      setCameraZoom: (zoom) => {
        this.game.camera.setZoom(zoom);
      },
    });

    this.itemWorldSceneFlowRuntime = new WorldItemWorldSceneFlowRuntime({
      popScene: () => this.game.sceneManager.pop(),
      getUnlockedEvents: () => this.worldProgressState.unlockedEvents,
      preloader: this.itemWorldEntryPreloader,
      pushTransition: this.itemWorldEntryTransition,
      createScene: this.createLdtkItemWorldScene.bind(this),
      startReturnFade: () => {
        this.itemWorldReturnFade.start();
      },
      preparePush: () => this.itemWorldSceneTransitionRuntime.preparePush(),
      restoreWorldAtAnvilReturnPoint: (resetAnvil) => this.anvilReturnFlowRuntime.restoreWorldAtReturnPoint(resetAnvil),
      updatePlayerAtk: () => this.worldPlayerStatRuntime.sync(),
      isFirstItemWorldBossDefeated: () => this.saveAccess.isFirstItemWorldBossDefeated(),
      showFirstItemWorldReturnInventoryHint: (hadFirstBossClear) => {
        this.inventoryTutorialHint.requestFirstItemWorldReturnHint(hadFirstBossClear);
      },
      onEarnedGold: (amount) => {
        this.worldPlayerProgressionState.addGold(amount);
        this.toast.show(t('toast.gold_gain', { amount }), 0xffd700);
      },
    });

    const createItemWorldScene = this.createLdtkItemWorldScene.bind(this);

    this.fixedItemWorldFlowRuntime = new WorldFixedItemWorldFlowRuntime({
      fixedItemWorld: this.fixedItemWorld,
      itemWorldSceneFlow: this.itemWorldSceneFlowRuntime,
      createItemWorldScene,
      returnState: this.anvilReturnState,
      getAnvil: () => this.anvil,
      getPlayer: () => this.player,
      snapCamera: (x, y) => this.game.camera.snap(x, y),
      restoreUiAfterDiveTransition: () => this.anvilDiveUiRuntime.restore(),
      hasLevel: (levelId) => !!this.loader.getLevel(levelId),
      loadLevel: (levelId, enterFrom) => {
        this.loadLevel(levelId, enterFrom);
      },
      setEntryItem: (item) => {
        this.itemWorldEntryState.setEntryItem(item);
      },
      clearEntryItem: () => this.itemWorldEntryState.clearItem(),
      setInTunnel: (inTunnel) => {
        this.itemWorldEntryState.setInTunnel(inTunnel);
      },
      getAnvilReturnLevelId: () => this.anvilReturnState.returnLevelId,
      getPreTunnelLevelId: () => this.itemWorldEntryState.getPreTunnelLevelId(),
      clearPreTunnelLevelId: () => {
        this.itemWorldEntryState.clearPreTunnelLevelId();
      },
      getFallbackLevelId: () => this.worldSpawnState.currentLevelId,
      setWorldVisualsReleased: (released) => {
        this.itemWorldEntryState.setWorldVisualsReleased(released);
      },
      resetEdgeTransition: () => this.edgeTransitionRuntime.reset(),
      isFirstItemWorldBossDefeated: () => this.saveAccess.isFirstItemWorldBossDefeated(),
      getUnlockedEvents: () => this.worldProgressState.unlockedEvents,
      showFirstItemWorldReturnInventoryHint: (hadFirstBossClear) => {
        this.inventoryTutorialHint.requestFirstItemWorldReturnHint(hadFirstBossClear);
      },
      showToast: (message, color) => this.toast.show(message, color),
      getPlayerAtk: () => this.player.atk,
      fireWorldReturnDialogue: (weaponDefId) => this.worldEgoDialogueRuntime.fireWorldReturnDialogue(weaponDefId),
      retireAfterBossClear: (hadFirstBossClear) => {
        this.anvilRetirementRuntime.retireAfterBossClear(hadFirstBossClear);
      },
    });
    this.anvilItemWorldFlowRuntime = new WorldAnvilItemWorldFlowRuntime({
      itemWorldSceneFlow: this.itemWorldSceneFlowRuntime,
      createItemWorldScene,
      fixedItemWorldFlow: this.fixedItemWorldFlowRuntime,
      getEntryItem: () => this.itemWorldEntryState.getEntryItem(),
      getPlayer: () => this.player,
      getCurrentLevelId: () => this.currentLevel?.identifier ?? null,
      setPreTunnelLevelId: (levelId) => {
        this.itemWorldEntryState.setPreTunnelLevelId(levelId);
      },
      setInTunnel: (inTunnel) => {
        this.itemWorldEntryState.setInTunnel(inTunnel);
      },
      hideMinimap: () => {
        this.worldMinimap.setVisible(false);
      },
      hasLevel: (levelId) => !!this.loader.getLevel(levelId),
      loadLevel: (levelId, enterFrom) => {
        this.loadLevel(levelId, enterFrom);
      },
      restoreUiAfterDiveTransition: () => this.anvilDiveUiRuntime.restore(),
      clearDamageNumbers: () => this.combatFeedbackRuntime.clearDamageNumbers(),
      isFirstItemWorldBossDefeated: () => this.saveAccess.isFirstItemWorldBossDefeated(),
      showToast: (message, color) => this.toast.show(message, color),
      fireWorldReturnDialogue: (weaponDefId) => this.worldEgoDialogueRuntime.fireWorldReturnDialogue(weaponDefId),
      retireAfterBossClear: (hadFirstBossClear) => {
        this.anvilRetirementRuntime.retireAfterBossClear(hadFirstBossClear);
      },
      enterChapter1FromPrologue: () => {
        this.itemWorldEntryState.setInTunnel(false);
        this.itemWorldEntryState.clearItem();
        this.game.sceneManager.pop();
        this.prologueEndRuntime.startFromItemWorldHandoff();
      },
    });
    this.portalItemWorldFlowRuntime = new WorldPortalItemWorldFlowRuntime({
      portalEntryRuntime: this.portalEntryRuntime,
      itemWorldSceneFlow: this.itemWorldSceneFlowRuntime,
      createItemWorldScene,
      isFixedItemWorldActive: () => this.fixedItemWorld.isActive,
      exitFixedItemWorldFlow: () => {
        this.fixedItemWorldFlowRuntime.exit();
      },
      getInventory: () => this.inventory,
      getPlayer: () => this.player,
      clearDamageNumbers: () => this.combatFeedbackRuntime.clearDamageNumbers(),
      showToast: (message, color) => this.toast.show(message, color),
      sacredPickupFlow: (item, x, y) => this.sacredPickupRuntime.startPickup(item, x, y),
      fireWorldReturnDialogue: (weaponDefId) => this.worldEgoDialogueRuntime.fireWorldReturnDialogue(weaponDefId),
      retireAfterBossClear: (hadFirstBossClear) => {
        this.anvilRetirementRuntime.retireAfterBossClear(hadFirstBossClear);
      },
      isFirstItemWorldBossDefeated: () => this.saveAccess.isFirstItemWorldBossDefeated(),
    });
    this.itemWorldGrowthSnapshot = new ItemWorldGrowthSnapshotController({
      game: this.game,
      sceneContainer: this.container,
      getEntityLayer: () => this.entityLayer,
      getPlayer: () => this.player,
      getItem: () => this.itemWorldEntryState.getEntryItem(),
      getHiddenTargets: () => [
        this.renderer?.container,
        this.fluidLayer,
        this.weatherLayer,
        this.deploymentFxLayer,
        this.vividLayer,
        ...this.builderLayerRuntime.getAuxiliaryTargets(this.activeBuilder),
      ],
    });
    this.deployBlurRuntime = new WorldDeployBlurRuntime({
      getTargets: () => compactContainers([
        this.game.backgroundContainer,
        this.renderer?.container,
        this.entityLayer,
        this.fluidLayer,
        this.deploymentFxLayer,
      ]),
    });
    this.dungeonAtmosphereRuntime = new WorldDungeonAtmosphereRuntime({
      getParallaxContainer: () => this.parallaxBG?.container ?? null,
      getFilterTargets: () => compactContainers([
        this.renderer?.bgLayer,
        this.renderer?.wallLayer,
        this.renderer?.interiorLayer,
        this.renderer?.shadowLayer,
        this.renderer?.specialLayer,
        this.proceduralDecorRuntime.naturalLayer,
        this.proceduralDecorRuntime.artificialLayer,
        this.proceduralDecorRuntime.structureLayer,
        this.entityLayer,
        this.fluidLayer,
        ...this.builderFlowRuntime.getBuilderAtmosphereTargets(),
      ]),
      getBuilderInteriorTargets: () => this.builderLayerRuntime.getInteriorTargets(this.activeBuilder),
    });
    this.laserDesaturationRuntime = new WorldLaserDesaturationRuntime({
      getTargets: () => compactContainers([
        this.game.backgroundContainer,
        this.renderer?.container,
        this.entityLayer,
        this.fluidLayer,
        ...this.builderFlowRuntime.getBuilderAtmosphereTargets(),
      ]),
    });
  }

  private createLdtkItemWorldScene(item: ItemInstance, entryCorridor: boolean): ItemWorldScene {
    this.player.attackInputEnabled = true;
    const itemWorldScene = new ItemWorldScene(
      this.game,
      item,
      this.inventory,
      this.player,
      { entryCorridor },
      createLdtkItemWorldSceneSaveAccess(this.saveAccess),
    );
    itemWorldScene.itemWorldTutorialDone = this.worldProgressState.unlockedEvents.has('__itemWorldTutorialDone');
    itemWorldScene.egoUnlockedEvents = this.worldProgressState.unlockedEvents;
    return itemWorldScene;
  }

  private wireCombatAndTransitionRuntimes(): void {
    this.noWeaponFeedbackRuntime = new WorldNoWeaponFeedbackRuntime({
      getPlayer: () => this.player,
      showToast: (message, color) => this.toast.show(message, color),
    });
    this.cameraZoneRuntime = new CameraZoneRuntime({
      camera: this.game.camera,
      getPlayerCenter: () => ({
        x: this.player.x + this.player.width / 2,
        y: this.player.y + this.player.height / 2,
      }),
      suppressZones: () => this.builderPlayerStateRuntime.isInBuilder,
      preferSpecificZones: true,
    });
    this.bossLockRuntime = new WorldBossLockRuntime({
      getCollisionGrid: () => this.collisionGridRuntime.grid,
      getEntityLayer: () => this.entityLayer,
      hideBossHp: () => this.hud.hideBossHP(),
    });
    this.worldEnemySpawnRuntime = new WorldEnemySpawnRuntime({
      getPlayer: () => this.player,
      getCollisionGrid: () => this.collisionGridRuntime.grid,
      getUnlockedEvents: () => this.worldProgressState.unlockedEvents,
      addEnemy: (enemy) => this.worldEnemyRegistry.add(enemy, this.entityLayer),
      activateBossLock: (level, bossKey) => this.bossLockRuntime.activate(level, bossKey),
    });
    this.bossHpRuntime = new BossHpRuntime({
      getHud: () => this.hud,
      getEnemies: () => this.worldEnemyRegistry.enemies,
      defaultBossName: 'GUARDIAN',
      isExtraEngaged: () => this.bossLockRuntime.isActive,
    });
    this.endingRuntime = new WorldEndingRuntime({
      game: this.game,
      getPlayer: () => this.player,
    });
    this.prologueEndRuntime = new WorldPrologueEndRuntime({
      game: this.game,
      getLevel: (levelId) => this.loader.getLevel(levelId),
      createRenderer: () => new LdtkRenderer(),
      getAtlases: () => this.atlases,
      getOverlayParent: () => this.container,
      getAreaPaletteIds: (levelId) => ({
        bgAreaId: bgAreaIdForLevel(levelId),
        wallAreaId: wallAreaIdForLevel(levelId),
      }),
      enterChapter1FromPrologue: () => {
        this.itemWorldEntryState.setInTunnel(false);
        this.itemWorldEntryState.clearItem();
        this.saveAccess.setScene('chapter_01');
        this.worldProgressState.unlockedEvents.add('__itemWorldTutorialDone');
        this.loadLevel('Start_Room_01', 'down');
      },
      holdWakeUpPose: () => this.player.holdWakeUpPose(),
      playWakeUp: () => this.player.playWakeUpOverride(900),
      isWakeMovementPressed: () => this.game.input.isDown(GameAction.MOVE_LEFT) || this.game.input.isDown(GameAction.MOVE_RIGHT),
      setCinematicUiVisible: (visible) => {
        this.game.uiContainer.visible = visible;
        this.game.feedbackOverlayContainer.visible = visible;
        this.hud.container.visible = visible && this.game.hudReady;
        this.worldMinimap.setVisible(visible && this.game.hudReady);
      },
      showToast: (message, color) => this.toast.show(message, color),
      isPrologueScene: () => this.saveAccess.isPrologueScene(),
    });
    this.dialogueTriggerRuntime = new WorldDialogueTriggerRuntime({
      game: this.game,
      getPlayer: () => this.player,
      getLoreDisplay: () => this.loreDisplay,
      getUnlockedEvents: () => this.worldProgressState.unlockedEvents,
      getEntityLayer: () => this.entityLayer,
    });
    this.worldEgoDialogueRuntime = new WorldEgoDialogueRuntime({
      getPlayer: () => this.player,
      getAnvil: () => this.anvil,
      getLoreDisplay: () => this.loreDisplay,
      getUnlockedEvents: () => this.worldProgressState.unlockedEvents,
      isFirstItemWorldBossDefeated: () => this.saveAccess.isFirstItemWorldBossDefeated(),
    });
    this.voidReturnRuntime = new WorldVoidReturnRuntime({
      game: this.game,
      getPlayer: () => this.player,
      getCollisionGrid: () => this.collisionGridRuntime.grid,
      getCurrentLevel: () => this.currentLevel ?? null,
      getActiveBuilder: () => this.activeBuilder,
      getBuilderStampSet: () => this.builderStampRuntime.activeStampSet,
      getLastSafePosition: () => this.voidRuntime.getLastSafePosition(),
      loadLevel: (levelId, enterDirection) => this.loadLevel(levelId, enterDirection),
    });
    this.voidRuntime = new WorldVoidRuntime({
      game: this.game,
      getPlayer: () => this.player,
      getFadeOverlay: () => this.fadeOverlay,
      getCurrentLevelId: () => this.currentLevel?.identifier ?? null,
      getFallbackLevelId: () => this.worldSpawnState.currentLevelId,
      resolveReturnPoint: () => this.voidReturnRuntime.resolveReturnPoint(),
      teleportTo: (levelId, x, y) => this.voidReturnRuntime.teleportTo(levelId, x, y),
    });
    this.exitGlowRuntime = new WorldExitGlowRuntime({
      getEntityLayer: () => this.entityLayer,
      getPlayerCenter: () => ({
        x: this.player.x + this.player.width / 2,
        y: this.player.y + this.player.height / 2,
      }),
    });
    this.builderEntranceRuntime = new WorldBuilderEntranceRuntime({
      attachments: this.builderAttachmentRuntime,
      exitGlowRuntime: this.exitGlowRuntime,
    });
    this.edgeTransitionRuntime = new WorldEdgeTransitionRuntime({
      getFadeOverlay: () => this.fadeOverlay,
      fadeDurationMs: FADE_DURATION,
    });
    this.acquireOverlayRuntime = new WorldAcquireOverlayRuntime({
      game: this.game,
      getHudContainer: () => this.hud.container,
      getMinimapContainer: () => this.worldMinimap.container,
      isInItemTunnel: () => this.itemWorldEntryState.isInTunnel(),
    });
    this.sacredPickupRuntime = new WorldSacredPickupRuntime({
      game: this.game,
      state: this.sacredPickupState,
      getPlayer: () => this.player,
      getEntityLayer: () => this.entityLayer,
      getUnlockedEvents: () => this.worldProgressState.unlockedEvents,
      getItemDrops: () => this.worldItemDropRuntime.itemDrops,
      getLoreDisplay: () => this.loreDisplay,
      getLorePopup: () => this.lorePopup,
      getDivePreview: () => this.divePreview,
      acquireOverlayRuntime: this.acquireOverlayRuntime,
      resolveAnvilTarget: (fromX, fromY) => this.anvilReturnState.resolveTarget(this.anvil, this.currentLevel, fromX, fromY),
      isFirstPickupDone: () => this.saveAccess.isFirstPickupDone(),
      hasSeenItem: (itemDefId) => this.saveAccess.hasSeenItem(itemDefId),
      markFirstPickupDone: () => this.saveAccess.markFirstPickupDone(),
      markItemSeen: (itemDefId) => this.saveAccess.markItemSeen(itemDefId),
    });
    this.frozenReturnRuntime = new WorldFrozenReturnRuntime({
      game: this.game,
      proximity: this.proximity,
      getPlayerContainer: () => this.player?.container ?? null,
      getSnapshot: () => this.frozenSnapshotRuntime.snapshot,
      getUiSkin: () => this.uiSkin,
      getItem: () => this.itemWorldEntryState.getEntryItem(),
      restoreUi: () => this.anvilDiveUiRuntime.restore(),
      deactivateAtmosphere: () => this.itemDeploymentAtmosphereFlowRuntime.deactivateDungeonAtmosphere(),
      cancelDeploymentState: () => this.itemDeploymentAtmosphereFlowRuntime.cancelFrozenReturnDeploymentState(),
      armDistancePx: FROZEN_RETURN_ARM_DISTANCE,
    });
    this.introHandoffRuntime = new WorldIntroHandoffRuntime({
      game: this.game,
      isInItemTunnel: () => this.itemWorldEntryState.isInTunnel(),
      setMinimapVisible: (visible) => {
        this.worldMinimap?.setVisible(visible);
      },
    });
    this.itemWorldGhostCollision = new ItemWorldGhostCollisionRuntime({
      getCollisionGrid: () => this.collisionGridRuntime.grid,
      setPlayerRoomData: (grid) => {
        bindPlayerCollisionGrid(this.player, grid);
      },
      camera: this.game.camera,
      getCurrentLevelSize: () => ({
        pxWid: this.currentLevel?.pxWid ?? 0,
        pxHei: this.currentLevel?.pxHei ?? 0,
      }),
      tileSize: TILE_SIZE,
      visualBoundsBleedPx: VISUAL_BOUNDS_BLEED_PX,
    });
    this.itemWorldGhostStream = new ItemWorldGhostStreamRuntime({
      sceneContainer: this.container,
      getEntityLayer: () => this.entityLayer,
      streamRuntime: this.itemWorldEntryStream,
      collisionRuntime: this.itemWorldGhostCollision,
      getDeploymentScope: () => this.itemDeploymentCollisionRuntime.currentScope,
      getItem: () => this.itemWorldEntryState.getEntryItem(),
      getLevel36: () => this.itemStratumLoader?.getLevel('ItemStratum_Level_36'),
      getPlayer: () => this.player,
      getLaserOrigin: () => this.anvil?.getGatePivotWorld(),
      isDungeonAtmosphereActive: () => this.dungeonAtmosphereRuntime.isActive,
      getDungeonAtmosphereFilter: () => this.dungeonAtmosphereRuntime.filter,
      addDungeonAtmosphereTarget: (target) => this.dungeonAtmosphereRuntime.addTarget(target),
      removeDungeonAtmosphereTarget: (target) => this.dungeonAtmosphereRuntime.removeTarget(target),
      tileSize: TILE_SIZE,
    });
    this.itemDeploymentTunnelRuntime = new ItemDeploymentTunnelRuntime({
      getCollisionGrid: () => this.collisionGridRuntime.grid,
      getRenderer: () => this.renderer,
      getActiveBuilder: () => this.activeBuilder,
      builderStampRuntime: this.builderStampRuntime,
      rerenderTilemap: () => this.rerenderTilemap(),
      tileSize: TILE_SIZE,
    });
    this.itemDeploymentTunnelFlowRuntime = new WorldItemDeploymentTunnelFlowRuntime({
      getAnvil: () => this.anvil,
      getPlayer: () => this.player,
      getCollisionGrid: () => this.collisionGridRuntime.grid,
      getLevelRightPx: (fallback) => this.currentLevel?.pxWid ?? fallback,
      getGrowthSnapshot: () => this.itemWorldGrowthSnapshot,
      getGhostStream: () => this.itemWorldGhostStream,
      getTunnelRuntime: () => this.itemDeploymentTunnelRuntime,
      getCollisionRuntime: () => this.itemDeploymentCollisionRuntime,
      setPendingGhostTunnelParams: (params) => {
        this.itemWorldEntryState.setPendingGhostTunnelParams(params);
      },
      rerenderTilemap: () => this.rerenderTilemap(),
    });
    this.itemDeploymentAtmosphereFlowRuntime = new WorldItemDeploymentAtmosphereFlowRuntime({
      getLaserDesaturationRuntime: () => this.laserDesaturationRuntime,
      getDungeonAtmosphereRuntime: () => this.dungeonAtmosphereRuntime,
      getFrozenSnapshotRuntime: () => this.frozenSnapshotRuntime,
      getFrozenReturnRuntime: () => this.frozenReturnRuntime,
      getPlayer: () => this.player,
      getEntityLayer: () => this.entityLayer,
      getVividLayer: () => this.vividLayer,
      restoreUiAfterDiveTransition: () => this.anvilDiveUiRuntime.restore(),
      getPendingGhostTunnelParams: () => this.itemWorldEntryState.getPendingGhostTunnelParams(),
      clearPendingGhostTunnelParams: () => {
        this.itemWorldEntryState.setPendingGhostTunnelParams(null);
      },
      getCollisionGrid: () => this.collisionGridRuntime.grid,
      getFadeOverlay: () => this.fadeOverlay,
      getParallaxContainer: () => this.parallaxBG?.container,
      getReturnVisualTargets: () => [
        this.renderer?.bgLayer,
        this.renderer?.wallLayer,
        this.renderer?.interiorLayer,
        this.renderer?.shadowLayer,
        this.renderer?.specialLayer,
        this.entityLayer,
        this.fluidLayer,
        this.parallaxBG?.container,
      ],
      destroyTunnelVisuals: () => this.itemDeploymentTunnelFlowRuntime.destroyGhostOverlay(true),
      restoreDeploymentTunnel: (rerender) => this.itemDeploymentTunnelFlowRuntime.restoreDeploymentTunnel(rerender),
      destroyDeployment: () => this.itemWorldEntryState.destroyDeployment(),
      clearInputLock: () => {
        this.game.input.inputLocked = false;
      },
      clearAnvilPlacement: () => this.anvil?.clearPlacedItem(),
      restoreAnvilDeploymentState: () => {
        if (this.anvil && !this.anvilRetirementRuntime.isRetiredByBossClear(this.anvil) && !(this.activeBuilder?.isMoving ?? false)) {
          void this.anvil.setDisabled(false);
        }
      },
      clearItem: () => this.itemWorldEntryState.clearItem(),
      setPlayerRoomData: (grid) => {
        bindPlayerCollisionGrid(this.player, grid);
      },
      scheduleGhostTunnel: (params) => {
        this.itemWorldGhostStream.scheduleForTunnel(
          params.x,
          params.y,
          params.w,
          params.h,
          params.ghostBirth ?? null,
        );
      },
    });
    this.itemWorldTransitionRuntime = new ItemWorldTransitionRuntime({
      game: this.game,
      getPlayer: () => this.player,
      getRealityGroups: () => [
        [this.parallaxBG?.container],
        [this.renderer?.bgLayer, this.renderer?.interiorLayer],
        [
          this.renderer?.wallLayer,
          this.renderer?.specialLayer,
          this.renderer?.shadowLayer,
          this.solidifiedWallOverlay.graphics,
          this.fluidLayer,
          this.proceduralDecorRuntime.naturalLayer,
          this.proceduralDecorRuntime.artificialLayer,
          this.proceduralDecorRuntime.structureLayer,
        ],
      ],
      getFxLayer: () => this.entityLayer,
      getOverlayLayer: () => this.game.legacyUIContainer,
    });
    this.portalRuntime = new PortalRuntime({
      game: this.game,
      getPlayer: () => this.player,
      getEntityLayer: () => this.entityLayer,
      showToast: (message, color) => this.toast.show(message, color),
      onEnter: (portal) => {
        this.altarController.close();

        this.portalRuntime.detach(portal);
        portal.setShowHint(false);

        this.portalEntryRuntime.begin(portal);

        this.itemWorldTransitionRuntime.start(portal, () => this.portalItemWorldFlowRuntime.completePendingEntry());
      },
    });
  }

  private wireBuilderFlowRuntime(): void {
    this.builderFlowRuntime = new WorldBuilderFlowRuntime({
      getBuilderLevel: (builderLevelId) => this.builderLoader.getLevel(builderLevelId),
      getActiveBuilder: () => this.activeBuilder,
      setActiveBuilder: (builder) => {
        this.activeBuilder = builder;
      },
      getCollisionGrid: () => this.collisionGridRuntime.grid,
      getRendererContainer: () => this.renderer.container,
      getShadowLayer: () => this.renderer.shadowLayer,
      getSceneContainer: () => this.container,
      getRendererAtlases: () => this.atlases,
      getTileMutator: () => this.worldTileMutationRuntime.mutator,
      getGrassFireSystem: () => this.grassFireRuntime.system,
      getBuilderHasPrimaryDecor: () => this.proceduralDecorRuntime.hasPrimary,
      getTerrainRimFilter: () => this.terrainPaletteRuntime.rimFilter,
      builderPersistenceRuntime: this.builderPersistenceRuntime,
      builderSpawnerRuntime: this.builderSpawnerRuntime,
      builderLayerRuntime: this.builderLayerRuntime,
      builderInteriorVisibilityRuntime: this.builderInteriorVisibilityRuntime,
      builderVisualFilterRuntime: this.builderVisualFilterRuntime,
      builderStepFeedbackRuntime: this.builderStepFeedbackRuntime,
      builderWeatherRuntime: this.builderWeatherRuntime,
      worldWeatherRuntime: this.worldWeatherRuntime,
      builderGrassRuntime: this.builderGrassRuntime,
      builderItemRuntime: this.builderItemRuntime,
      builderStaticEntityRuntime: this.builderStaticEntityRuntime,
      builderDoorSwitchRuntime: this.builderDoorSwitchRuntime,
      builderEntranceRuntime: this.builderEntranceRuntime,
      anvilSpawnRuntime: this.anvilSpawnRuntime,
      builderSpriteRuntime: this.builderSpriteRuntime,
      builderAttachmentRuntime: this.builderAttachmentRuntime,
      builderStampRuntime: this.builderStampRuntime,
      builderPlayerStateRuntime: this.builderPlayerStateRuntime,
      exitGlowRuntime: this.exitGlowRuntime,
    });
  }

  /**
   * Pattern D ???? ?????? ?ÄØ????:
   *   Altar(30) > Anvil(20) > SavePoint(10)
   * ????? `this.*` ?? closure ?? ©§o?? ??????.
   */
  private registerProximityHandlers(): void {
    const anvil: ProximityInteraction = {
      label: 'Anvil',
      priority: 20,
      canInteract: () => {
        if (!this.anvil || this.altarController.isSelectActive || !this.anvilInteractionRuntime.isPlayerNearAnvil()) return false;
        if (this.itemWorldEntryState.isDeploymentActive()) return false;
        // Step 5 (2026-05-25): anvil ?? ???????? ??? ?????? *??? ?????? ????* ?? ???????(IW ?????? ??????)
        // ?? ????? ??? ???¥è? ??????. retire(disabled)/used ?? ?????.
        if (this.anvil.hasItem()) return true;
        const prompts = this.anvilPrompts;
        if (prompts?.isSuppressed) return false;
        return !this.anvil.used && !this.anvil.disabled;
      },
      onInteract: () => {
        if (this.anvil?.hasItem()) {
          this.anvilItemRuntime.reclaimItem();
          return;
        }
        this.anvilItemRuntime.openInventory();
      },
    };
    const savePoint: ProximityInteraction = {
      label: 'SavePoint',
      priority: 10,
      canInteract: () => {
        if (this.savePointRuntime?.isSaveQueued) return false;
        if (this.altarController.isSelectActive) return false;
        return this.savePointRuntime?.isPlayerNear() ?? false;
      },
      onInteract: () => this.savePointRuntime.queueSave(),
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

    // Detect the title-scene fade handoff before UI creation so HUD/minimap
    // can stay hidden during async init frames.
    const startHidden = this.introHandoffRuntime.captureTitleHandoff();

    // Fetch and parse LDtk project (multi-world ? pick Overworld).
    // cache:'no-store' + cache-bust query ?? ©¦?o? ?? ??????(?????? / Vite / SW / proxy)
    // ?? ????? ??? ??? .ldtk ?? ??¢¥?. prod ??????? ???? (init 1?).
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
      console.info(`[LDtk] fetched at ${new Date().toISOString()} ? Builder_Level_1 layers=${layerCount}`);
    }
    this.loader = new LdtkLoader();
    this.loader.load(json, LDTK_WORLD_IDS);

    // Builder world ? separate loader so builder levels don't mix with navigation
    this.builderLoader = new LdtkLoader();
    this.builderLoader.load(json, BUILDER_WORLD_ID);

    // ItemStratum levels ? only used for ghost overlay preview (same JSON, different world filter)
    this.itemStratumLoader = new LdtkLoader();
    this.itemStratumLoader.load(json, 'ItemStratum');
    seedItemWorldTemplates(this.itemStratumLoader.getLevelIds().map(id => this.itemStratumLoader!.getLevel(id)!));

    // Load save or create fresh inventory
    const saveData = SaveManager.load();
    if (saveData) {
      this.introHandoffRuntime.skipIntroSequence();
      this.inventory = SaveManager.loadInventory(saveData);
      this.worldProgressState.replaceFromSave(saveData);
      this.worldPlayerProgressionState.replaceFromSave(saveData);
      this.game.stats.playTimeMs = saveData.playtime;
    } else {
      // Fresh start keeps the original early-world inventory seed. The later
      // Start_Room_01 chapter handoff normalizes to Rustborn after the first
      // Item World event is complete.
      this.inventory = new Inventory();
      const starterDef = SWORD_DEFS.find(d => d.id === 'sword_scalpel') ?? SWORD_DEFS[0];
      const starterSword = createItem(starterDef, 'normal');
      this.inventory.add(starterSword);
      this.inventory.equip(starterSword.uid, true);
      const halfbladeDef = SWORD_DEFS.find(d => d.id === 'sword_halfblade');
      if (halfbladeDef) {
        this.inventory.add(createItem(halfbladeDef, 'normal'));
        this.saveAccess.markItemSeen('sword_halfblade');
      }
      this.saveAccess.markFirstPickupDone();
      this.saveAccess.markItemSeen('sword_scalpel');
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
      const levels = [
        ...this.loader.getLevelIds().map((id) => this.loader.getLevel(id)),
        ...this.builderLoader.getLevelIds().map((id) => this.builderLoader.getLevel(id)),
      ].filter((level): level is LdtkLevel => !!level);
      const allTilesets = collectLdtkTilesetPaths(levels);
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

    // Parallax background ? behind everything
    this.parallaxBG = new ParallaxBackground();
    this.game.backgroundContainer.addChild(this.parallaxBG.container);

    // LDtk renderer ? tiles only, no entity markers in production
    this.renderer = new LdtkRenderer();
    this.container.addChild(this.renderer.container);
    this.solidifiedWallOverlay.attach(this.renderer.container);

    // Dead Cells-style palette swap filter ? production default.
    // Data-driven via Sheets/Content_System_Area_Palette.csv: rows for
    // "world_shaft_bg" / "world_shaft_wall" supply stops + depth/brightness
    // params. Atlas is a single shared GPU texture with one row per AreaID.
    // See: Documents/Research/DeadCells_GrayscalePalette_Research.md
    this.terrainPaletteRuntime.initializeRenderer(this.renderer);
    this.builderVisualFilterRuntime.initialize(getAreaPaletteAtlas());

    // Entity layer (enemies, drops, portals, altars)
    this.entityLayer = new Container();
    this.container.addChild(this.entityLayer);
    this.grassFireRuntime.initialize(this.entityLayer);

    // Tile mutator overlay (fire/ice/electric VFX on top of static tile sprites).
    this.worldTileMutationRuntime.initializeRenderer(this.entityLayer);

    // Fluid layer ? entity layer ???? ??? ??? player/enemy ?? fluid ???? ????? ????? ???.
    // ?? ??? ????? ?? ??? ?????? fluid ?? ?????? ???? (????? ???? ?????).
    this.fluidLayer = new Container();
    this.container.addChild(this.fluidLayer);
    // FluidSpawner debug overlay lives above entity layer so designers see
    // the source cell even when fluid covers it. ?debug gates visibility.
    const _fsDebug = new URLSearchParams(window.location.search).has('debug');
    const _reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    this.worldFluidRuntime.initializeFluidLayer({
      fluidLayer: this.fluidLayer,
      entityLayer: this.entityLayer,
      debug: _fsDebug,
      reduceMotion: _reduceMotion,
    });
    // Oil flame tongues need to render ABOVE the fluid polygon, so we give
    // the mutator renderer a Graphics child of a container drawn after fluid.
    const aboveFluidLayer = new Container();
    this.container.addChild(aboveFluidLayer);
    this.worldTileMutationRuntime.setAboveFluidLayer(aboveFluidLayer);

    this.weatherLayer = new Container();
    this.container.addChild(this.weatherLayer);

    this.deploymentFxLayer = new Container();
    this.container.addChild(this.deploymentFxLayer);

    this.vividLayer = new Container();
    this.container.addChild(this.vividLayer);

    // Shift+I ?úô ????? ???????? ? ???? ??/AABB ?? ???? ?????, ???? ???? ??? ?????.
    // hud ?? app.stage ????(FpsCounter ?? ????) ? uiContainer.visible ???(???????
    // ???? anvil dive ??)?? ??????? ??? ??? ????? ????? ??o????.
    this.collisionDebug = new CollisionDebugOverlay(this.game.uiScale);
    this.container.addChild(this.collisionDebug.container);
    this.game.app.stage.addChild(this.collisionDebug.hud);

    // Updraft system (shared physics + particles)
    this.worldUpdraftRuntime.initialize(this.entityLayer);
    // Void fog particles (black mist rising from void tiles)
    this.voidFogRuntime.initialize(this.entityLayer);

    // Player
    this.player = new Player(this.game);
    this.player.attackInputEnabled = false;
    this.player.fluidOverlayQuery = (x, y, w, h) => this.worldFluidRuntime.spawners.queryTileAtAabb(x, y, w, h, this.collisionGridRuntime.grid);
    this.player.onFlaskHeal = (amount) => {
      this.combatFeedbackRuntime.screenFlash.flash(0x44ff44, 0.3, 150);
      this.combatFeedbackRuntime.damageNumbers.spawnSpecial(
        this.player.x + this.player.width / 2,
        this.player.y - 16,
        `+${amount}`, 0x44ff44,
      );
      // VFX: healing burst
      this.movementVfxRuntime.flaskBurst.spawn(
        this.player.x + this.player.width / 2,
        this.player.y + this.player.height / 2,
        Math.min(1, amount / Math.max(1, this.player.maxHp * 0.4)),
      );
    };
    this.entityLayer.addChild(this.player.container);
    // Arc Tether ? Spark ??©­??? ?????? ???? ??? VFX. Player layer ??, entityLayer ??
    // ???? ?¥å? player ???? *???* add (????? ??? ??¥ïÂô player ???? ???????).
    this.worldContainerCarryRuntime.initialize(this.entityLayer);
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
      this.worldPlayerProgressionState.setHealthShardBonus(saveData.healthShardBonus ?? 0);
    }
    this.worldPlayerStatRuntime.sync();

    // Fade overlay ? on stage (camera-independent) so it always covers the full screen
    this.fadeOverlay = new Graphics();
    this.fadeOverlay.rect(0, 0, GAME_WIDTH, GAME_HEIGHT).fill(0x000000);
    this.fadeOverlay.alpha = 0;
    this.game.legacyUIContainer.addChild(this.fadeOverlay);

    this.itemWorldReturnFade = new ItemWorldReturnFadeRuntime(this.game, {
      normalizeWorldVisuals: () => this.itemDeploymentAtmosphereFlowRuntime.prepareWorldVisualsAfterItemWorldReturn(),
    });

    // HUD
    this.hud = new HUD(this.game.uiScale);
    this.hud.setDebugInfoVisible(Debug.infoVisible);
    this.game.uiContainer.addChild(this.hud.container);
    this.introHandoffRuntime.bindHud(this.hud);
    this.introHandoffRuntime.applyInitialHudGate(startHidden && !saveData);

    // Area title banner ? Elden Ring style. Rides on legacyUIContainer so it
    // inherits uiScale with the rest of the overlay UI.
    this.areaTitle = new AreaTitle();
    this.game.legacyUIContainer.addChild(this.areaTitle.container);
    this.introHandoffRuntime.bindAreaTitle(this.areaTitle);

    // Load & apply UI skin (async, non-blocking)
    const hudSkin = new UISkin();
    this.uiSkin = hudSkin;
    hudSkin.load().then(() => this.hud.applySkin(hudSkin))
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.warn('[UISkin] load failed ? falling back to Graphics HUD:', e);
      });

    // Toast, damage numbers, hit sparks, screen flash
    this.toast = new ToastManager(this.game.legacyUIContainer);
    this.anvilPrompts = new AnvilPromptController(this.game);
    this.anvilCyclePrompt = new AnvilCyclePromptRuntime({
      game: this.game,
      showToast: (message, color) => this.toast.show(message, color),
      placeItem: (item) => this.anvilItemRuntime.placeItem(item),
      closeMenu: () => {
        this.inventoryUI.handleAnvilCyclePromptCancel(() => {
          this.altarController.drawItemSelectUI('Offer item to altar:', 0xaaccff);
        });
      },
    });
    this.altarController = new WorldAltarController({
      game: this.game,
      player: this.player,
      inventory: () => this.inventory,
      toast: this.toast,
      entityLayer: this.entityLayer,
      spawnPortal: (x, y, rarity, sourceType, item) => this.portalRuntime.spawn(x, y, rarity, sourceType, item),
      closeCyclePrompt: () => this.anvilCyclePrompt.close(),
    });
    this.anvilPlacement = new AnvilPlacementController({
      getAnvil: () => this.anvil,
      inventory: () => this.inventory,
      inventoryUI: () => this.inventoryUI,
      toast: this.toast,
      requestTetherFadeOut: () => this.sacredPickupRuntime.requestTetherFadeOut(),
      hidePrompts: () => this.anvilInteractionRuntime.hidePrompts(),
      showCyclePrompt: (item) => this.anvilCyclePrompt.open(item),
      placeItem: (item) => this.anvilItemRuntime.placeItem(item),
    });
    this._gpUnsub = attachGamepadToast(this.game, this.toast);
    this.combatFeedbackRuntime.initialize({
      uiContainer: this.game.uiContainer,
      legacyUiContainer: this.game.legacyUIContainer,
      camera: this.game.camera,
      uiScale: this.game.uiScale,
      entityLayer: this.entityLayer,
    });
    this.movementVfxRuntime.initialize(this.entityLayer);
    this.worldFluidRuntime.initializeResidue(this.entityLayer);
    this.egoShardRuntime.initialize(this.entityLayer);
    this.worldFluidReactionRuntime.bind();
    // Ice melt / wood-grass burnout / metal corrosion all invalidate the
    // static wall tile sprites at the mutated cell. Coalesce many mutations
    // per frame into a single rerenderTilemap call.
    this.worldTileMutationRuntime.mutator.onWallTileChanged = (gx, gy, originalTile) => {
      if (this.collisionGridRuntime.grid[gy]?.[gx] === TILE_WALL && originalTile === TILE_MAGMA) {
        this.solidifiedWallOverlay.addCell(gx, gy, this.collisionGridRuntime.grid);
      }
      this.worldTileMutationRuntime.markWallLayerDirty();
    };
    this.pickupVfxRuntime.initialize(this.entityLayer);
    this.statusFeedbackRuntime.initialize({
      entityLayer: this.entityLayer,
      legacyUiContainer: this.game.legacyUIContainer,
      viewportWidth: GAME_WIDTH,
      viewportHeight: GAME_HEIGHT,
    });
    this.savePointRuntime = new SavePointRuntime({
      game: this.game,
      getPlayer: () => this.player,
      savepointPulse: this.statusFeedbackRuntime.savepointPulse,
      onSave: () => this.worldSaveRuntime.save(),
    });

    // Pause menu (9-slice from UISkin) ? uiContainer(native) ??? (UI native 1?? ??????).
    // input ??????? SELECT KEYBOARD ?? ??? preset ?? ??¢¥?.
    this.pauseMenu = new PauseMenu(this.uiSkin, this.game.uiScale, this.game.input, this.game);
    this.pauseMenu.onAction = (action) => {
      if (action === 'status') {
        const a = this.player.abilities;
        this.characterStats.setData(
          this.inventory,
          1, 0, 100,  // playerLevel, exp, maxExp ? placeholder until growth system
          this.player.hp, this.player.maxHp,
          [a.dash, a.wallJump, a.doubleJump, false /* mist */, a.waterBreathing, false /* gravity */],
        );
        this.characterStats.show();
        this.pauseMenu.close();
      }
      else if (action === 'quit_confirmed') {
        this.game.sceneManager.replace(new TitleScene(this.game));
      }
    };
    this.game.uiContainer.addChild(this.pauseMenu.container);

    // Character stats overlay (opened from pause menu STATUS) ? uiContainer(native)
    this.characterStats = new CharacterStats(this.uiSkin, this.game.uiScale);
    this.characterStats.onVisibilityChanged = (vis) => {
      this.hud.container.visible = !vis;
      this.worldMinimap.setVisible(!vis);
    };
    this.game.uiContainer.addChild(this.characterStats.container);

    // Death screen ? uiContainer(native)
    this.deathScreen = new DeathScreen(this.uiSkin, this.game.uiScale);
    this.deathScreen.onRespawn = () => {
      // Reload from last save point
      this.loadLevel(this.worldSpawnState.currentLevelId, 'down');
      this.player.hp = this.player.maxHp;
    };
    this.game.uiContainer.addChild(this.deathScreen.container);

    // Tutorial hints ? restore "already-seen" ids from save so loaded games
    // don't re-show hints the player already completed.
    this.tutorialHint = new TutorialHint(this.game.input, this.game.legacyUIContainer, this.uiSkin);
    if (saveData) this.tutorialHint.hydrate(saveData.completedTutorialHints);
    this.worldTutorialHints = new WorldTutorialHintRuntime({
      game: this.game,
      tutorialHint: this.tutorialHint,
      getPlayer: () => this.player,
      getCurrentLevelId: () => this.currentLevel?.identifier ?? null,
      getPlayerSpawnLevelId: () => this.worldSpawnState.currentLevelId,
      hasEnemyNearby: () => this.worldEnemyRegistry.hasAliveWithin(this.player.x, this.player.y, 4 * TILE_SIZE),
    });
    this.lowHpHealHint = new LowHpHealHintRuntime({
      tutorialHint: this.tutorialHint,
      getHp: () => ({ hp: this.player.hp, maxHp: this.player.maxHp }),
      saveAccess: {
        isLowHpHealToastFired: () => this.saveAccess.isLowHpHealToastFired(),
        markLowHpHealToastFired: () => this.saveAccess.markLowHpHealToastFired(),
      },
    });
    this.inventoryTutorialHint = new InventoryTutorialHintRuntime({
      tutorialHint: this.tutorialHint,
      getInventory: () => this.inventory,
      hud: this.hud,
      getUnlockedEvents: () => this.worldProgressState.unlockedEvents,
      getRetireAfterFirstBoss: () => this.anvilReturnState.retireAfterFirstBoss,
      hasBlockingAnvilItem: () => !!(this.anvil?.hasItem() || this.anvilReturnState.hasItem),
      isFirstItemWorldBossDefeated: () => this.saveAccess.isFirstItemWorldBossDefeated(),
    });

    // Inventory UI ? uiContainer(native) ???. InventoryUI ???¥ï??? scale.set(uiScale)
    // ???? 640 ???? ???????? ??? ?¡Æ? ???????? (UI native ???????? ?????? 1??).
    this.inventoryUI = new InventoryUI(this.inventory, this.game.uiScale, this.saveAccess);
    this.inventoryUI.setSkin(this.uiSkin!);
    this.game.uiContainer.addChild(this.inventoryUI.container);
    // ?¥ê??? ????/?????? ???? Anvil UI o?? HUD + minimap ??? (??? ??? 2026-05-24).
    this.inventoryUI.onVisibilityChange = (vis: boolean) => {
      this.hud.container.visible = !vis;
      this.worldMinimap.setVisible(!vis);
    };

    // DEC-046 Identity Archive ? ?¥ê????? ????. JUMP ??? ????.
    this.identityArchive = new IdentityArchive(this.inventory, this.uiSkin, this.game.uiScale);
    this.game.uiContainer.addChild(this.identityArchive.container);

    // Sacred Pickup ? LorePopup + DivePreview + LoreDisplay ??? uiContainer(native) ??? (UI native 1?? ??????).
    this.lorePopup = new LorePopup(this.saveAccess, this.uiSkin, this.game.uiScale);
    this.game.uiContainer.addChild(this.lorePopup.container);
    this.loreDisplay = new LoreDisplay(this.game.input, this.game.uiScale);
    this.game.uiContainer.addChild(this.loreDisplay.container);
    this.divePreview = new DivePreview(this.uiSkin, this.game.uiScale);
    this.game.uiContainer.addChild(this.divePreview.container);

    this.worldMapRuntime = new WorldMapRuntime({
      loader: this.loader,
      skin: this.uiSkin,
      uiScale: this.game.uiScale,
      getVisitedLevels: () => this.worldProgressState.visitedLevels,
      getCurrentLevel: () => this.currentLevel ?? null,
      getPlayer: () => this.player,
      getActiveBuilder: () => this.activeBuilder,
    });
    this.game.uiContainer.addChild(this.worldMapRuntime.overlay.container);
    this.worldMinimap = new WorldMinimapRuntime({
      game: this.game,
      loader: this.loader,
      getCurrentLevel: () => this.currentLevel ?? null,
      getPlayer: () => this.player,
      getVisitedLevels: () => this.worldProgressState.visitedLevels,
      getClearedLevels: () => this.worldProgressState.clearedLevels,
      getEnemies: () => this.worldEnemyRegistry.enemies,
      getActiveBuilder: () => this.activeBuilder,
      isIntroHidden: () => this.introHandoffRuntime.isMinimapIntroHidden,
    });
    this.gameOverRuntime = new WorldGameOverRuntime({
      game: this.game,
      hud: this.hud,
      getMinimap: () => this.worldMinimap.container,
      onRespawn: () => {
        this.gameOverRuntime.clear();

        // Clear fixed item world / tunnel state
        this.fixedItemWorldFlowRuntime.clear();
        this.itemWorldEntryState.setInTunnel(false);
        this.itemWorldEntryState.clearItem();

        // Load save data ? return to last save point
        const saveData = SaveManager.load();
        if (saveData) {
          // Restore inventory and progress from save
          this.inventory = SaveManager.loadInventory(saveData);
          this.inventoryUI.setInventory(this.inventory);
          this.worldProgressState.replaceFromSave(saveData);
          this.player.abilities.dash = saveData.abilities.dash;
          this.player.abilities.diveAttack = saveData.abilities.diveAttack ?? false;
          this.player.abilities.surge = saveData.abilities.surge ?? false;
          this.player.abilities.waterBreathing = saveData.abilities.waterBreathing ?? false;
          this.player.abilities.wallJump = saveData.abilities.wallJump;
          this.player.abilities.doubleJump = saveData.abilities.doubleJump;
          this.worldPlayerProgressionState.setHealthShardBonus(saveData.healthShardBonus ?? 0);
          const respawnLevelId = this.worldSpawnState.resolveLevelId(saveData.levelId);
          this.worldSpawnState.setCurrentLevelId(respawnLevelId);
          this.loadLevel(respawnLevelId, 'down');
        } else {
          // No save ? return to spawn level
          this.worldPlayerProgressionState.setHealthShardBonus(0);
          const respawnLevelId = this.worldSpawnState.resolveLevelId(this.worldSpawnState.currentLevelId);
          this.worldSpawnState.setCurrentLevelId(respawnLevelId);
          this.loadLevel(respawnLevelId, 'down');
        }

        // Full HP restore + snap to save point
        this.player.respawn();
        this.worldPlayerStatRuntime.sync();
        this.player.hp = this.player.maxHp;
        this.savePointRuntime.snapPlayerToNearest();
        // ???? ?? HP VFX(Flask R pulse, glow, HP bar pulse, vignette) ?? ???????.
        this.hud.resetLowHpEffects();
        this.hud.updateHP(this.player.hp, this.player.maxHp);
      },
    });
    this.debugWarpRuntime = new WorldDebugWarpRuntime({
      game: this.game,
      toast: this.toast,
      worldMapRuntime: this.worldMapRuntime,
      getCurrentLevel: () => this.currentLevel ?? null,
      getPlayer: () => this.player,
      isInItemTunnel: () => this.itemWorldEntryState.isInTunnel(),
      isGameOverActive: () => this.gameOverRuntime.isActive,
      reviveFromGameOver: () => {
        this.gameOverRuntime.clear();
        this.player.hp = this.player.maxHp;
        this.player.isDead = false;
        this.player.drowned = false;
        this.hud.container.visible = true;
        this.worldMinimap.setVisible(true);
      },
      loadLevel: (roomId) => { this.loadLevel(roomId, 'down'); },
      setHudVisible: (visible) => { this.hud.container.visible = visible; },
      setMinimapVisible: (visible) => { this.worldMinimap.setVisible(visible); },
    });

    this.transitionController = new WorldTransitionController();
    this.worldPlayerSpawnRuntime = new WorldPlayerSpawnRuntime({
      transitionController: this.transitionController,
      getPlayer: () => this.player,
      getCollisionGrid: () => this.collisionGridRuntime.grid,
      getPendingPlayerTileX: () => this.edgeTransitionRuntime.pendingPlayerTileX,
      getPendingPlayerTileY: () => this.edgeTransitionRuntime.pendingPlayerTileY,
      getScene: () => this.saveAccess.getScene(),
      recordSafePosition: (x, y) => this.voidRuntime.recordSafePosition(x, y),
    });
    this.edgeTransitionFlowRuntime = new WorldEdgeTransitionFlowRuntime({
      loader: this.loader,
      transitionController: this.transitionController,
      edgeTransitionRuntime: this.edgeTransitionRuntime,
      getPlayer: () => this.player,
      getCurrentLevel: () => this.currentLevel ?? null,
      getCollisionGrid: () => this.collisionGridRuntime.grid,
      getEntryItem: () => this.itemWorldEntryState.getEntryItem(),
      isDeploymentActive: () => this.itemWorldEntryState.isDeploymentActive(),
      isInTunnel: () => this.itemWorldEntryState.isInTunnel(),
      isEntryTransitionActive: () => this.itemWorldEntryTransition.isActive,
      isDebugMode: () => LdtkWorldScene.debugMode,
      isPrologueScene: () => this.saveAccess.isPrologueScene(),
      prestreamItemWorldEntry: (item, reason) => this.itemWorldSceneFlowRuntime.prestream(item, reason),
      enterItemWorld: (entryCorridor) => {
        this.anvilItemWorldFlowRuntime.enterFromTunnel({ entryCorridor });
      },
      loadLevelForTransition: (levelId, enterFrom) => {
        const prevCamX = this.game.camera.renderX;
        const prevCamY = this.game.camera.renderY;
        this.loadLevel(levelId, enterFrom);
        this.parallaxBG.onRoomTransition(prevCamX, prevCamY, this.game.camera.renderX, this.game.camera.renderY);
        syncPlayerAndEnemyPreviousPositions(this.player, this.worldEnemyRegistry.enemies);
      },
    });
    this.worldSpawnState = new WorldSpawnState({
      loader: this.loader,
      transitionController: this.transitionController,
      fallbackLevelId: FALLBACK_ENTRANCE_LEVEL,
      isDebugMode: () => LdtkWorldScene.debugMode,
      getScene: () => this.saveAccess.getScene(),
    });
    this.uiController = new WorldUiController(this.game, {
      hud: this.hud,
      pauseMenu: this.pauseMenu,
      deathScreen: this.deathScreen,
      tutorialHint: this.tutorialHint,
      inventoryUI: this.inventoryUI,
      identityArchive: this.identityArchive,
      worldMap: this.worldMapRuntime.overlay,
      toast: this.toast,
      getMinimap: () => this.worldMinimap.container,
      fadeOverlay: this.fadeOverlay,
    });

    // Spawn level: prefer the saved level, but fall back if the LDtk project
    // changed since the save was written. A stale save level used to leave the
    // scene initialized with only HUD visible and no currentLevel.
    this.worldSpawnState.setCurrentLevelId(this.worldSpawnState.resolveLevelId(saveData?.levelId));
    if (!this.loadLevel(this.worldSpawnState.currentLevelId, 'down')) {
      const fallbackLevelId = this.worldSpawnState.findFallbackLevelId();
      if (fallbackLevelId !== this.worldSpawnState.currentLevelId) {
        console.warn(
          `[LdtkWorldScene] Failed to load spawn level "${this.worldSpawnState.currentLevelId}", falling back to "${fallbackLevelId}"`,
        );
        this.worldSpawnState.setCurrentLevelId(fallbackLevelId);
        this.loadLevel(this.worldSpawnState.currentLevelId, 'down');
      }
    }

    // If loading from save, snap player to save point
    if (saveData && this.savePointRuntime.hasAny) {
      this.savePointRuntime.snapPlayerToNearest();
    }

    this.initialized = true;

    // Tier 3 ambient bed demo (Plan_Audio_Demo ??-1 #1A + #1C, DEC-040 ??3-2.4 ï§žê??ì¿?
    AmbientLayer.startWorldTier3Demo();

    // Controls guidance handled by tutorialHint.tryShow('hint_combat') in
    // update() ? fires once per session with auto-dismiss. No unconditional
    // toast here so returning from item world doesn't re-spam controls.
  }

  enter(): void {
    this.container.visible = true;
    if (this.parallaxBG) this.parallaxBG.container.visible = true;
    const ui = this.game.uiContainer;
    if (this.pauseMenu && !this.pauseMenu.container.parent) ui.addChild(this.pauseMenu.container);
    if (this.characterStats && !this.characterStats.container.parent) ui.addChild(this.characterStats.container);
    if (this.deathScreen && !this.deathScreen.container.parent) ui.addChild(this.deathScreen.container);
    if (this.lorePopup && !this.lorePopup.container.parent) ui.addChild(this.lorePopup.container);
    if (this.loreDisplay && !this.loreDisplay.container.parent) ui.addChild(this.loreDisplay.container);
    if (this.divePreview && !this.divePreview.container.parent) ui.addChild(this.divePreview.container);
    // ???? BGM ? intro 1? ?? loop. 5?? fade-in ???? ?¥å÷é?? ??????.
    // ItemWorld ???? pop ???? ??????? BgmController ?? ??? ???? trackKey ??
    // no-op ???? ????? ?????? ??¢¥?.
    BgmController.play(
      'mus_world_main',
      { intro: 'mus_world_main_intro', loop: 'mus_world_main_loop' },
      { fadeInMs: 5000 },
    );
    // Area banner is triggered from loadLevel on Shaft_01 entry (not here).
    // On pop return from sub-scenes (ItemWorld) the current level is still
    // the one the player left from, so no banner replay is needed.
    this.uiController.enter({
      showMinimap: !this.itemWorldEntryState.isInTunnel(),
      goldBelowMinimap: !this.itemWorldEntryState.isInTunnel(),
      playerHp: this.player.hp,
      playerMaxHp: this.player.maxHp,
      highlightItemKey:
        this.worldProgressState.unlockedEvents.has('__itemWorldTutorialDone')
        && !this.worldProgressState.unlockedEvents.has('__itemKeyPressedAfterItemWorld'),
    });
    this.introHandoffRuntime.hideHudForIntroIfNeeded();
    if (!this.currentLevel) return; // first init ? loadLevel handles setup
    this.normalizeStartRoomInventoryAfterItemWorld();

    if (this.itemWorldEntryState.consumeWorldVisualsReleased()) {
      const levelId = this.currentLevel.identifier;
      const px = this.player.x;
      const py = this.player.y;
      // Step 4/5 (2026-05-25): loadLevel ?? spawnAnvilFromLdtk ?? ?? Anvil ?? ????????
      // ?? ???? placedItem sprite ?? ?????? ?¬Õ?. ?????? + ?????? ???? (disabled bypass).
      const preservedAnvilItem = this.anvilReturnState.getPreservedItem(this.anvil, this.itemWorldEntryState.getEntryItem());
      this.loadLevel(levelId, 'down');
      if (preservedAnvilItem && this.anvil) {
        const wasDisabled = this.anvil.disabled;
        this.anvil.disabled = false;
        this.anvil.placeItem(preservedAnvilItem);
        this.anvil.used = false;
        this.anvil.disabled = wasDisabled;
      }
      placePlayerAt(this.player, px, py, {
        collisionGrid: this.collisionGridRuntime.grid,
        resetVelocity: true,
        savePreviousPosition: true,
      });
      this.worldPlayerStatRuntime.sync();
      this.game.camera.snap(
        this.player.x + this.player.width / 2,
        this.player.y + this.player.height / 2,
      );
      return;
    }

    // Re-sync collision grid and tilemap (deep copy to restore original state)
    this.collisionGridRuntime.cloneFrom(this.currentLevel.collisionGrid);
    bindPlayerCollisionGrid(this.player, this.collisionGridRuntime.grid);
    this.solidifiedWallOverlay.clear();
    this.rerenderTilemap();

    this.worldPlayerStatRuntime.sync();
    this.game.camera.snap(
      this.player.x + this.player.width / 2,
      this.player.y + this.player.height / 2,
    );
  }

  private initialized = false;

  /**
   * Snapshot for FeedbackPanel auto-context. Implements IFeedbackContextProvider
   * structurally ? runtime duck-typing checks for this method.
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
    // Guard: init() is async ? game loop may call update() before it completes
    if (!this.initialized || !this.currentLevel) return;

    this.deployBlurRuntime.update(dt, this.itemWorldEntryState.isDeploymentGrowing());

    // Feedback panel open ? block scene update but keep toasts animating.
    if (this.game.feedbackOpen) {
      this.toast?.update(dt);
      return;
    }

    this.introHandoffRuntime.update(dt);

    if (this.endingRuntime.update(dt)) return;

    // Ch.0 prologue end sequence (P2.1~P6). Blocks gameplay while running.
    const prologueBlocksScene = this.prologueEndRuntime.update(dt);
    const prologuePlayerLocked = this.prologueEndRuntime.isPlayerLocked;
    if (prologueBlocksScene) return;

    if (this.acquireOverlayRuntime.update(dt)) {
      this.game.camera.update(dt);
      this.worldWeatherRuntime.update(dt);
      this.combatFeedbackRuntime.updateImpactOnly(dt);
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

    // TAB key ? open character stats (same pattern as I=inventory, M=map)
    if (this.game.input.isJustPressed(GameAction.STATUS)) {
      this.game.input.consumeJustPressed(GameAction.STATUS);
      const a = this.player.abilities;
      this.characterStats.setData(
        this.inventory,
        1, 0, 100,  // playerLevel, exp, maxExp ? placeholder until growth system
        this.player.hp, this.player.maxHp,
        [a.dash, a.wallJump, a.doubleJump, false /* mist */, a.waterBreathing, false /* gravity */],
      );
      this.characterStats.show();
      this.pauseMenu.close();
      return;
    }

    // Debug warp must remain reachable from death/game-over UI, which can
    // early-return through handlePauseAndDeath before normal gameplay input.
    if (this.deathScreen?.visible || this.gameOverRuntime.isActive) {
      this.debugWarpRuntime.update();
    }

    const pauseOrDeath = this.uiController.handlePauseAndDeath({
      dt,
      canOpenPause: !this.inventoryUI.visible && !this.worldMapRuntime.overlay.visible && !this.lorePopup?.isBlocking() && !this.acquireOverlayRuntime.isBlocking,
    });
    if (pauseOrDeath !== 'none') {
      return;
    }

    // Dialogue / Lore display ? blocks gameplay while active
    if (this.loreDisplay?.isActive) {
      this.loreDisplay.update(dt);
      this.player.savePrevPosition();
      this.game.camera.update(dt);
      this.worldWeatherRuntime.update(dt);
      return;
    }

    // Toast & tutorial hints update after gameplay input is processed
    this.uiController.updatePersistent(dt);

    // Sacred Pickup cutscene + LorePopup + DivePreview. When blocking, abort
    // gameplay input for this frame (player stays put, camera override still
    // applied below).
    const sacredBlocking = this.sacredPickupRuntime.update(dt);
    if (sacredBlocking) {
      this.sacredPickupRuntime.applyCameraZoomOverride();
      this.game.camera.update(dt);
      this.worldWeatherRuntime.update(dt);
      this.combatFeedbackRuntime.updateImpactOnly(dt);
      // Keep LoreDisplay alive during sacred pickup blocking (Ego T01 dialogue)
      if (this.loreDisplay?.isActive) {
        this.loreDisplay.update(dt);
      }
      return;
    }

    // Tutorial hints ? only show after dialogue finishes
    if (this.currentLevel?.identifier === this.worldSpawnState.currentLevelId) {
      // hint removed ? key prompts shown in HUD
    }

    // Open Inventory hints wait until pickup/world-return dialogue and cutscenes finish.
    this.inventoryTutorialHint.clearIfRustbornEquipped();
    this.inventoryTutorialHint.update(dt, this.sacredPickupRuntime.isInventoryHintBlocked());

    // One-time movement/combat tutorial hints.
    this.worldTutorialHints.update(dt);

    // Item World transition playing
    if (this.itemWorldTransitionRuntime.update(dt)) {
      this.game.camera.update(dt);
      this.worldWeatherRuntime.update(dt);
      return;
    }

    // ItemDeployment only blocks during the final handoff fade; growth plays during normal gameplay.
    if (this.itemWorldEntryState.isDeploymentBlocking()) {
      this.itemWorldEntryState.updateDeployment(dt);
      this.anvil?.update(dt);
      stopPlayerMotion(this.player, { savePreviousPosition: true });
      this.game.camera.update(dt);
      this.worldWeatherRuntime.update(dt);
      this.combatFeedbackRuntime.updateImpactOnly(dt);
      return;
    }

    // Void fade locks input while the rest of the scene keeps simulating.
    if (this.voidRuntime.isActive) {
      this.voidRuntime.update(dt);
    }

    this.itemWorldReturnFade.update(dt);

    // Game Over state
    if (this.gameOverRuntime.updateInput()) {
      return;
    }

    // Altar selection UI (anvil now uses the unified InventoryUI in anvil mode)
    if (this.altarController.isSelectActive) {
      this.anvilInteractionRuntime.hidePrompts();
      this.altarController.updateInput();
      return;
    }

    // Debug warp:
    //   Shift+M  ? ????? ?????? + ??????? ????? ????? ????
    //   Backtick ? ??u?? ????? ???? (????? ???? ???)
    this.debugWarpRuntime.update();

    // World Map toggle (M key) ? disabled inside item tunnels.
    // Shift+M ?? ?? handleDebugWarp ?? ???? consume ???? ??? M ???? ?úô???? ??¢¥?.
    this.uiController.handleWorldMapToggle({
      canToggle: !this.itemWorldEntryState.isInTunnel(),
      onBeforeOpen: () => {
        this.worldMapRuntime.sync({ includePlayerPosition: true });
      },
    });
    if (this.worldMapRuntime.overlay.visible && this.currentLevel) {
      this.anvilInteractionRuntime.hidePrompts();
      this.worldMapRuntime.syncDynamicGrids();
      this.uiController.updateWorldMap({
        dt,
        playerWorldX: this.player.x + this.currentLevel.worldX,
        playerWorldY: this.player.y + this.currentLevel.worldY,
      });
    }

    // ??? ??? (2026-05-03): u IW ???? ?????? ?¥ê??? ?????? ???? INVENTORY
    // ??? ?????? Rustborn ???? ????? Ego ??? ??? 'Locked' ?îí??? ????.
    // shiftDown / inItemTunnel ?? ???? ?? ?????? ????? (debug / ??? ?? ???).
    if (
      !this.saveAccess.isFirstItemWorldBossDefeated() &&
      !this.itemWorldEntryState.isInTunnel() &&
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

    // Inventory UI toggle ? disabled inside item tunnels, Shift+I is debug
    this.uiController.handleInventoryToggle({
      canToggle: !this.itemWorldEntryState.isInTunnel() && !this.game.input.shiftDown && this.saveAccess.isFirstItemWorldBossDefeated(),
      onToggled: () => {
        // Broken Sword ??? ???? ?¥ê??????? "??? ??? ???? ????" ???? ???? ??????.
        // ?¥ê????? o?? ???? ???? I ? ????? ?????? ??? ???? ?????? ??????.
        // u ????? ?????? ??? ??? ???? ????????? ?¥ê??? ?????? ???????.
        if (!this.saveAccess.isFirstPickupDone()) return;
        this.worldProgressState.unlockedEvents.add('__itemKeyPressedAfterItemWorld');
        this.hud.setItemKeyHighlight(false);
        // 2026-05-18: tutorialHint.dismiss ?? *Rustborn ??? ?????? equip ???? ??*?? ???.
        // ???? ?????. I ? ??¢¬????? ?¥ê??? ???????? ??? ??????? ??? ???? ???????.
        // u ???? ?????? HUD pulse ?? ???????? hint ?? ????? ???? ??¢¥?.
      },
    });

    if (this.inventoryUI.visible) {
      this.anvilInteractionRuntime.hidePrompts();
      this.inventoryUI.update(dt); // selection pulse animation (runs even behind cycle prompt)
      // Re-dive confirmation prompt overlays the inventory (anvil mode only)
      if (this.anvilCyclePrompt.hasActivePrompt) {
        this.anvilCyclePrompt.updateInput();
        return;
      }
      const previousWeaponDefId = this.inventory.equipped?.def.id ?? null;
      const inventoryResult = this.uiController.handleInventoryInput();
      if (inventoryResult === 'confirmed_equipment_change') {
        const currentWeaponDefId = this.inventory.equipped?.def.id ?? null;
        this.worldEgoDialogueRuntime.notifyWeaponSwap(previousWeaponDefId, currentWeaponDefId);
        this.worldPlayerStatRuntime.sync();
        this.hud.updateATK(this.player.atk);
        // 2026-05-18: ?¥ê??? hint ?? *Rustborn ??? ?????? ?????? ????*???? dismiss.
        // ?? ????? ???? ??u?????¥ä? ???? ??????? ??? ?????? ??????? hint ?? ???????.
        // "Rustborn ????" ?? ??? ???????? ?? ?? ????¥ä? ???? ??¢¥?.
        this.inventoryTutorialHint.clearIfRustbornEquipped();
      }
      return; // Pause game while inventory open
    }

    // Room transition fade
    if (this.edgeTransitionRuntime.isActive) {
      const completed = this.edgeTransitionFlowRuntime.update(dt);

      if (!completed) return;
      // Transition just ended
      this.cameraInputRuntime.armPostTransitionSnap();
      syncPlayerAndEnemyPreviousPositions(this.player, this.worldEnemyRegistry.enemies);
      return;
    }

    // Pattern D (proximity-interaction): ???? ?????? ?ÄØ???? o??.
    // ???? player.update() ???? ????? ? ?? ???? ????????? ???????
    // ???? ???????? registerProximityHandlers() ???? ??????.
    this.savePointRuntime.updateQueuedSave(dt);

    this.frozenReturnRuntime.updatePrompt();
    if (this.proximity.tryInteract(this.game.input)) return;

    // Giant Builder ? moving platform pattern.
    //   Builder container.y moves sub-pixel smooth (visual continuity).
    //   Stamp position is tile-aligned (physics stability) and only changes
    //   when the builder crosses a tile boundary. The player is carried
    //   only on tile crossings, by a whole TILE amount (prevents jitter).
    //   The visual sub-pixel remainder is applied to the player as a render
    //   offset so they appear glued to the builder smoothly.
    if (this.activeBuilder) {
      // Stamp math MUST mirror WorldBuilderStampRuntime.stamp(), which reads container.y
      // (integer). Using posY (float) here would disagree at the half-pixel
      // boundary where Math.round flips, producing a "stamp jumped but
      // player wasn't carried" frame that looks like a jump in place.
      const prevStampY = Math.round(this.activeBuilder.container.y / 16) * 16;
      this.activeBuilder.update(dt);
      this.builderLayerRuntime.sync(this.activeBuilder);
      this.builderPlayerStateRuntime.setCarrierVelocityY(
        dt > 0 ? this.activeBuilder.lastDeltaY / (dt / 1000) : 0,
      );
      this.worldDoorSwitchInteractionRuntime.maintainCollisions();
      const newStampY = Math.round(this.activeBuilder.container.y / 16) * 16;
      const stampDelta = newStampY - prevStampY;
      if (this.builderPlayerStateRuntime.isOnBuilder && stampDelta !== 0) {
        this.builderPlayerCollisionRuntime.carryPlayerWithBuilderY(stampDelta);
      }
      if (this.builderStampRuntime.hasOriginChanged(this.activeBuilder)) {
        this.builderStampRuntime.restamp(this.activeBuilder, this.collisionGridRuntime.grid);
      }
      this.builderFlowRuntime.syncBuilderAttachments();
      if (this.builderPlayerStateRuntime.isOnBuilder) {
        this.builderPlayerCollisionRuntime.resolvePlayerSolidOverlapAfterBuilder(stampDelta);
      }

      const nowMoving = this.activeBuilder.isMoving;

      if (this.anvil && !this.anvil.used) {
        const shouldDisableAnvil = nowMoving || this.anvilRetirementRuntime.isRetiredByBossClear(this.anvil);
        if (this.anvil.disabled !== shouldDisableAnvil) {
          void this.anvil.setDisabled(shouldDisableAnvil);
        }
      }

      {
        const hidden = this.builderPlayerCollisionRuntime.isPlayerInBuilderVolume() && this.activeBuilder.isPlayerInInteriorCells(
          this.player.x,
          this.player.y,
          this.player.width,
          this.player.height,
        );
        this.builderInteriorVisibilityRuntime.update({
          builder: this.activeBuilder,
          hidden,
          setEntranceGlowAlpha: (alpha) => this.builderFlowRuntime.setBuilderEntranceGlowAlpha(alpha),
        });
      }


      this.builderStepFeedbackRuntime.update({
        cinematic: this.builderPersistenceRuntime.isActiveCinematic,
        moving: nowMoving,
        stampDelta,
        shake: (strength) => this.game.camera.shake(strength),
      });
    } else {
      this.builderPlayerStateRuntime.clearCarrierVelocity();
      this.worldDoorSwitchInteractionRuntime.maintainCollisions();
    }

    // Player
    // ??? ???? ?????? playerOnBuilder ?? onCarrier ?? ?????? ©¦????
    // grounding ?? lastSafeX/Y o???? ?????? ???.
    // 1?? ???? ?o? (2026-05-24): ?? ?????? ??? ?????? onCarrier ??
    // false ?? lastSafe ?? *???? cell* ?? ????????, ????? ?????? ???? ?? ?
    // ???? ??? ???? ????? safe ????? ?????? ?????? ?????. ??? update ???? lastSafe ?? ??????
    // post-snap ??????? *???? ??*?? ????, playerOnBuilder=true ?? ???????.
    const wasPlayerOnBuilder = this.builderPlayerStateRuntime.beginPlayerUpdate(this.player);
    const preUpdateLastSafeX = this.player.lastSafeX;
    const preUpdateLastSafeY = this.player.lastSafeY;
    if (this.worldContainerPhysicsRuntime.isPlayerStandingOnTop()) {
      this.player.forceGrounded(true, 'container');
    }
    // Commit last frame's interaction-prompt accumulation before the player
    // reads it (attack suppression buffer).
    this.game.input.beginInteractionFrame();
    if (prologuePlayerLocked) {
      if (this.prologueEndRuntime.shouldTickWakeUpAnimation) {
        this.player.tickWakeUpOverrideAnimation(dt);
      } else {
        this.player.holdWakeUpPose();
        stopPlayerMotion(this.player, { savePreviousPosition: true });
      }
    } else {
      this.player.update(dt);
      this.worldDoorSwitchInteractionRuntime.resolvePlayerCollision();
    }    this.builderPlayerStateRuntime.update(dt);

    this.noWeaponFeedbackRuntime.update(dt);

    this.lowHpHealHint.update();

    // After physics: keep riders aligned to the builder's tile-quantized
    // collision surface. This prevents the moving stamp from slowly burying
    // or dropping the player through the carried floor.
    const snappedToBuilder = this.activeBuilder && (wasPlayerOnBuilder || this.builderPlayerCollisionRuntime.isPlayerInBuilderVolume())
      ? this.builderPlayerCollisionRuntime.snapPlayerToBuilderSurface()
      : false;
    this.builderPlayerStateRuntime.setOnBuilder(
      this.player,
      this.activeBuilder ? (snappedToBuilder || this.builderStampRuntime.isPlayerOnStamp(this.player, this.collisionGridRuntime.grid)) : false,
    );
    // ???? safe ???? ???????. ??? ???? ????? ???? player.update ?? ????
    // lastSafeX/Y(=???? cell)?? ??????, ??? ?? world ?? ???? ???? a safe ground
    // ?? ?????? void ???? ?? ????? world ????? ???????? grounded ?????? ???????.
    if (this.builderPlayerStateRuntime.isOnBuilder) {
      this.player.lastSafeX = preUpdateLastSafeX;
      this.player.lastSafeY = preUpdateLastSafeY;
    }

    // Volume check: is the player's AABB inside the builder's rectangle?
    // (includes airborne ? used for camera override that must persist on jump.)
    this.builderPlayerStateRuntime.setInBuilder(
      this.activeBuilder ? this.builderPlayerCollisionRuntime.isPlayerInBuilderVolume() : false,
    );
    if (
      this.player.isGrounded() &&
      !this.builderPlayerStateRuntime.isOnBuilder &&
      !this.builderPlayerStateRuntime.isInBuilder &&
      this.voidReturnRuntime.isWorldFloorUnderPlayerAt(this.player.x, this.player.y)
    ) {
      this.voidRuntime.recordSafePosition(this.player.x, this.player.y);
    }

    // Visual sync: while riding, mirror the builder's render offset from its
    // tile-aligned stamp. Use container.y (integer) so the offset matches
    // exactly what WorldBuilderStampRuntime.stamp() sees ? the player visual steps in lockstep
    // with the builder visual, no subpixel disagreement.
    if (this.builderPlayerStateRuntime.isOnBuilder && this.activeBuilder) {
      const by = this.activeBuilder.container.y;
      this.player.visualYOffset = by - Math.round(by / 16) * 16;
    } else {
      this.player.visualYOffset = 0;
    }
    // Check drowning
    if (this.player.drowned && !this.gameOverRuntime.isActive) {
      this.player.hp = 0;
      this.player.lastDamageSource = 'drown';
      this.player.onDeath();
      this.game.hitstopFrames = 8;
      this.combatFeedbackRuntime.screenFlash.flashDamage(true);
      trackPlayerDeath({
        area: 'world',
        level_id: this.currentLevel?.identifier ?? this.worldSpawnState.currentLevelId,
        room_col: Math.floor((this.player.x + this.player.width / 2) / TILE_SIZE),
        room_row: Math.floor((this.player.y + this.player.height / 2) / TILE_SIZE),
        enemy_type: 'drown',
      });
      this.gameOverRuntime.show();
      return;
    }

    // Check player death
    if (this.player.isDead && !this.gameOverRuntime.isActive) {
      trackPlayerDeath({
        area: 'world',
        level_id: this.currentLevel?.identifier ?? this.worldSpawnState.currentLevelId,
        room_col: Math.floor((this.player.x + this.player.width / 2) / TILE_SIZE),
        room_row: Math.floor((this.player.y + this.player.height / 2) / TILE_SIZE),
        enemy_type: this.player.lastDamageSource,
      });
      this.gameOverRuntime.show();
      return;
    }

    this.worldEnemyUpdateRuntime.update(dt);
    this.worldEnemyCombatRuntime.updatePlayerAttack();

    this.worldEnemyKillRuntime.processDefeatedEnemies();

    this.worldProjectileRuntime.update(dt);
    this.worldCommonSpriteRuntime.update(dt);
    this.worldEnemyContactRuntime.update();

    // Breakable props (sway animation)
    this.worldBreakablePropRuntime.update(dt);
    // ??? ?¡À???? Breakable (LDtk Entity).
    this.worldBreakableRuntime.update(dt);
    // Decorative grass sway
    this.proceduralDecorRuntime.update(dt);

    this.worldPickupRuntime.update(dt);
    this.worldRelicPickupRuntime.update(dt);

    this.worldItemDropRuntime.update(dt);

    // Level cleared
    const aliveCount = this.worldEnemyRegistry.aliveCount();
    if (aliveCount === 0) {
      const id = this.currentLevel.identifier;
      if (!this.worldProgressState.clearedLevels.has(id)) {
        this.worldProgressState.clearedLevels.add(id);
      }
    }

    // Dialogue / Lore triggers
    this.dialogueTriggerRuntime.update(dt);

    // ???? Ego dialogue triggers (code-driven, not LDtk) ????
    this.worldEgoDialogueRuntime.update(dt);
    this.worldEnemyKillRuntime.update(dt);

    // Anvil interaction + attack hit detection
    this.anvilInteractionRuntime.update(dt);
    this.altarController.updateAltars(dt);

    // Locked door & switch attack detection + update
    this.worldDoorSwitchInteractionRuntime.checkDoorAttack();
    this.worldDoorSwitchInteractionRuntime.checkSwitchAttack();
    this.worldCrackedFloorRuntime.checkAttack();
    this.worldBreakablePropRuntime.checkAttack();
    this.worldSecretWallRuntime.checkAttack();
    this.worldBreakableRuntime.checkAttack();
    this.worldContainerAttackRuntime.checkAttack();
    this.worldDoorSwitchInteractionRuntime.updateDoors(dt);
    this.worldGrowingWallRuntime.update(dt);

    this.worldPlayerImpactRuntime.update();

    this.worldCollapsingPlatformRuntime.update(dt);

    // Spike hazard contact
    this.worldSpikeRuntime.checkContact();

    // Void contact check (sequence handled by early-return above)
    this.voidRuntime.updateCooldown(dt);
    this.voidRuntime.checkContact();

    // Elemental tile hazards (magma, charged, acid, fire, thunder, burn)
    // GDD: Documents/System/System_World_TileSystem.md ??2.6-2.13
    this.worldTileHazardRuntime.update(dt);

    // Updraft wind zones
    this.worldUpdraftRuntime.update({
      dt,
      player: this.player,
      baseGrid: this.player.roomData,
      camera: this.game.camera,
      activeBuilder: this.activeBuilder,
    });

    // Void fog particles (visual only)
    this.voidFogRuntime.update(dt, this.collisionGridRuntime.grid, this.game.camera);

    this.exitGlowRuntime.update(dt);

    // Save point interaction ? UP key near save point
    this.savePointRuntime.updateProximity(this.itemWorldEntryState.isDeploymentActive());

    // Shift+P ????? ?????? Game.ts ?????? ???? o?????? ?????? ????? ??¢¥?.

    // Shift+I ????? UI ????? Game.ts ???? ???? o?????? INVENTORY ?? ??? consume ???
    // ?¥ê??? ????? ?úô???? ??? ???.

    // Debug commands ? only active with ?debug=1 in URL
    if (new URLSearchParams(window.location.search).has('debug')) {
      // Shift+O ? unified cheat toggle. ON: all relic abilities, maxHp/atk
      // inflated to 99999, HP locked at >=1 (immortal clamp). OFF: restore
      // the snapshot taken at toggle-on.
      if (this.game.input.shiftDown && this.game.input.isJustPressed(GameAction.DEBUG_CHEAT)) {
        if (this.player.debugCheatActive) {
          this.player.disableCheatBundle();
          this.toast.show(t('toast.cheat_off'), 0x44ff44);
        } else {
          this.player.enableCheatBundle();
          this.toast.show(t('toast.cheat_on'), 0xffaa00);
        }
      }

      // Shift+1 = Ignite plant/oil/wood at player feet + 4-neighbours.
      // Verifies grass/wood/oil propagation (TileMutator) without enchant system.
      if (this.game.input.shiftDown && this.game.input.isJustPressed(GameAction.DEBUG_FIRE)) {
        this.worldEgoShardImpactRuntime.debugIgniteAtPlayer();
      }
      // Shift+2 = Freeze water/magma at player + 4-neighbours (3s temp wall).
      if (this.game.input.shiftDown && this.game.input.isJustPressed(GameAction.DEBUG_ICE)) {
        this.worldEgoShardImpactRuntime.debugFreezeAtPlayer();
      }
      // Shift+3 = Thunder chain at player + 4-neighbours (water/metal/acid flood-fill).
      if (this.game.input.shiftDown && this.game.input.isJustPressed(GameAction.DEBUG_THUNDER)) {
        this.worldEgoShardImpactRuntime.debugThunderAtPlayer();
      }
      // Digit 1/2/3 (without shift) ? switch active enchant (Hades-style Boon swap).
      if (!this.game.input.shiftDown) {
        if (this.game.input.isJustPressed(GameAction.DEBUG_FIRE))    this.player.activeEnchant = 'fire';
        else if (this.game.input.isJustPressed(GameAction.DEBUG_ICE))    this.player.activeEnchant = 'ice';
        else if (this.game.input.isJustPressed(GameAction.DEBUG_THUNDER)) this.player.activeEnchant = 'thunder';
      }
      // Shift+G ? spawn 4 debug containers near player (until LDtk Entity wiring lands).
      if (this.game.input.shiftDown && this.game.input.isJustPressedKeyCode('KeyG')) {
        this.worldContainerSpawnRuntime.debugSpawnNear(this.player.x, this.player.y);
      }
    }

    this.worldEgoShardCastRuntime.update(dt);

    // ???? Grab / Throw (B / RB) ? Arc Tether ?? ??????? ??? + Spelunky ?? ??? ????
    // ???? ????:
    //   1) GRAB ??? ?? findNearestGrabbableContainer (facing ??, 6?)
    //   2) a???? startGrabPull : pickUp() ???? ??? (held=true ?? no gravity)
    //      + pullingContainer ???? + arcTether.startPull(boosted)
    //   3) 200ms ???? ?????? ? ease-out ???? (?? ???? held ?? ???????)
    //   4) ???? ?????? pullingContainer=null, arcTether ?? hold ?? ???¢¥?.
    // ????? ??? ??? ???????? pull ?????? ????????? ??? ?????? ???.
    this.worldContainerCarryRuntime.update({
      dtMs: dt,
      game: this.game,
      player: this.player,
      findTarget: () => findNearestContainerForGrab({
        player: this.player,
        containers: this.worldContainerRegistry.getContainers(),
        input: this.game.input,
      }),
      promptText: t('prompt.lift'),
    });

    // Portal interactions
    this.portalRuntime.update(dt);

    this.endingRuntime.checkTrigger();

    // Room transition detection ? edge-based
    this.edgeTransitionFlowRuntime.checkLevelEdges();

    // Camera zone detection: check if player entered/exited a camera area.
    this.cameraZoneRuntime.update();

    // HUD
    this.hud.updateHP(this.player.hp, this.player.maxHp);
    this.hud.updateFlask(this.player.flaskCharges, this.player.flaskMaxCharges);
    this.hud.updateATK(this.player.atk);
    this.hud.updateGold(this.worldPlayerProgressionState.gold);
    this.hud.setBurnStatus(this.player.burnRemainingMs ?? 0, MAGMA_BURN_DURATION_MS);
    this.hud.setEgoShards(this.player.egoShardCount, 3, this.player.activeEnchant);

    this.bossHpRuntime.update();

    this.hud.update(dt);
    this.hud.setDebugInfoVisible(Debug.infoVisible);
    this.hud.setFloorText(this.buildDebugFloorText());
    this.areaTitle.update(dt);

    // Hide minimap + adjust gold in item tunnel and in the fixed item world
    // (prologue stratum is an item world ? no overworld minimap).
    const hideMinimap = this.itemWorldEntryState.isInTunnel() || this.fixedItemWorld.isActive;
    if (hideMinimap) this.worldMinimap.setVisible(false);
    this.hud.setGoldBelowMinimap(!hideMinimap && this.worldMinimap.isVisible);

    // Minimap: real-time dot tracking + blink + combat opacity
    this.worldMinimap.update(dt);

    // Damage numbers & Sakurai hit effects
    this.combatFeedbackRuntime.update(dt);

    // Movement VFX (consume player one-shot events + trail updates)
    this.updateMovementVfx(dt);

    // ItemDeployment cinematic-state update: growth, player pull, and final handoff fade.
    this.itemWorldEntryState.updateDeployment(dt);
    this.itemWorldGrowthSnapshot.update(dt);
    this.itemWorldGhostStream.update(dt, () => this.itemWorldEntryState.releaseDeploymentBirthPieces());

    this.frozenSnapshotRuntime.update(this.player);

    this.frozenReturnRuntime.updateConfirmInput();

    // Camera ? deadzone follow + zoom lerp. Player is always in world coords.
    // While riding the builder, include visualYOffset so the camera tracks the
    // player's *visual* position. Without this, the physics +16 tile crossing
    // jump (see builder update above) propagates to the camera target and
    // causes a "???" rocking as the camera snaps to each crossing.
    //
    // The offset is rounded to an integer pixel: a fractional target would
    // make the rounded camera renderY oscillate near .5 boundaries every
    // frame, producing a rapid 1px "????" shake. Tile-crossing cancellation
    // still works because the offset is symmetric (~+8 ? ~-8 at crossing).
    const cam = this.game.camera;
    const cx = this.player.x + this.player.width / 2;
    const cy = this.player.y + this.player.height / 2 + Math.round(this.player.visualYOffset);

    cam.setBounds(0, 0, this.currentLevel.pxWid, this.currentLevel.pxHei, VISUAL_BOUNDS_BLEED_PX);
    cam.target = { x: cx, y: cy };

    // Vertical look: hold UP/DOWN while idle to peek after a delay
    const playerIdle = this.player.fsm.currentState === 'idle'
      && Math.abs(this.player.vx) < 1 && this.player.hp > 0;
    const lookUp = this.game.input.isDown(GameAction.LOOK_UP);
    const lookDown = this.game.input.isDown(GameAction.LOOK_DOWN);
    cam.lookDirection = this.cameraInputRuntime.updateLookDirection({
      dtMs: dt,
      playerIdle,
      lookUp,
      lookDown,
    });

    cam.update(dt);
    this.worldWeatherRuntime.update(dt);

    // Parallax background scroll ? frozen while dungeon atmosphere is active
    if (!this.dungeonAtmosphereRuntime.isActive) {
      this.parallaxBG.updateScroll(cam.renderX, cam.renderY);
    }

    // Oxygen overlay ? vignette + bar when submerged
    this.oxygenOverlay.update(this.player);
  }

  /**
   * Coordinates movement/environment VFX after player.update().
   * Player kinematic and fluid/residue feedback are delegated; scene-local logic
   * still owns drop-through tutorial hooks and manager update ordering.
   */
  private updateMovementVfx(dt: number): void {
    const p = this.player;

    this.movementVfxRuntime.updatePlayerKinematicFeedback(dt, p);
    this.worldFluidFeedbackRuntime.updatePlayer(dt);

    // Drop-through dust streak
    if (p.consumeDropThroughEvent()) {
      this.builderPlayerStateRuntime.startDropThroughGrace();
      this.movementVfxRuntime.dropThroughDust.spawn(p.x + p.width / 2, p.y + p.height, p.width * 0.9);
      // ???? u drop-through ???¨¨? ???? hint ?? ??? ??????? 1?? ?? fade,
      // ???¨¨??? handled flag ?? set.
      this.worldTutorialHints.handleDropThroughEvent();
    }
    // Ice skid streak
    this.movementVfxRuntime.iceSkidStreak.emit(dt, p.isStandingOnIce(), p.x + p.width / 2, p.y + p.height, p.getVx());

    this.worldFluidFeedbackRuntime.updateEnemies(dt);

    // --- Batch C ---
    // Player hit blood spray
    const hitDir = p.consumePlayerHitEvent();
    if (hitDir !== null) {
      this.movementVfxRuntime.hitBloodSpray.spawn(p.x + p.width / 2, p.y + p.height * 0.4, hitDir);
    }

    // Tick all particle managers
    this.movementVfxRuntime.updateCharacterFeedback(dt);
    this.worldFluidRuntime.residue.update(dt);
    this.movementVfxRuntime.waterBubbles.update(dt);
    // ???? Maintained spawners: refill when live count drops below minCount ????
    this.maintainedContainerSpawnerRuntime.update(dt);
    this.worldContainerPhysicsRuntime.update(dt);

    this.worldEgoShardProjectileRuntime.update(dt);
    this.movementVfxRuntime.updateLate(dt);
    this.pickupVfxRuntime.update(dt);
    const hpRatio = this.player.maxHp > 0 ? this.player.hp / this.player.maxHp : 0;
    this.statusFeedbackRuntime.update(dt, hpRatio);
  }

  private buildDebugFloorText(): string {
    const level = this.currentLevel;
    if (!level) {
      return '';
    }

    const monsterTypes = new Set<string>();
    const npcNames = new Set<string>();
    for (const entity of level.entities) {
      if (entity.type === 'Enemy_Spawn') {
        const monsterType = (entity.fields['type'] as string | undefined) ?? 'Skeleton';
        if (monsterType.trim().length > 0) {
          monsterTypes.add(monsterType.trim());
        }
        continue;
      }

      if (entity.type === 'Slime' || entity.type === 'Boss') {
        monsterTypes.add(entity.type);
        continue;
      }

      if (entity.type === 'NPC') {
        const speaker = entity.fields['speaker'];
        const character = entity.fields['character'];
        const npcName = typeof speaker === 'string' && speaker.trim().length > 0
          ? speaker.trim()
          : typeof character === 'string' && character.trim().length > 0
            ? character.trim()
            : '';
        if (npcName.length > 0) {
          npcNames.add(npcName);
        }
      }
    }

    const monsterText = monsterTypes.size > 0 ? [...monsterTypes].join(',') : '-';
    const npcText = npcNames.size > 0 ? [...npcNames].join(',') : '-';
    return `${level.identifier} | MonsterType:${monsterText} | NPC:${npcText}`;
  }

  render(alpha: number): void {
    if (!this.initialized) return;
    // During post-transition snap, disable interpolation to prevent 1-frame jitter
    const a = this.cameraInputRuntime.resolveRenderAlpha(alpha);
    this.player.render(a);
    this.worldEnemyRenderRuntime.render(a);
    // Portals and altars are static, no interpolation needed
    const p = this.player;
    const colOffX = (p.width - p.collisionW) / 2;
    const colOffY = p.height - p.collisionH;
    // ??? ????? ?????? ?? ??u ?úô ????? ??? 'builder-surface' ????? ?©£??.
    const b = this.activeBuilder;
    const builderGrid = b ? {
      grid: b.collisionGrid,
      originTileX: Math.round(b.container.x / 16),
      originTileY: Math.round(b.container.y / 16),
    } : undefined;
    this.collisionDebug.update(this.collisionGridRuntime.grid, this.game.camera, {
      x: p.x + colOffX, y: p.y + colOffY, w: p.collisionW, h: p.collisionH,
      grounded: p.isGrounded(), source: p.groundSource, detail: p.groundSourceDetail,
    }, builderGrid);
  }

  exit(): void {
    this.anvilDiveUiRuntime.restore();
    if (this._gpUnsub) { this._gpUnsub(); this._gpUnsub = null; }
    if (this.parallaxBG) this.parallaxBG.container.visible = false;
    this.toast.clear();
    this.uiController.destroy();
    this.anvilCyclePrompt?.destroy();
    // Close and detach modal overlays so they don't bleed into the next scene.
    // (Previously: M/I ?? ????? a ???? ?????? overlay ?? legacyUIContainer
    //  ?? ???? ItemWorldScene ???? "stuck" ???¡¤? ?? ?????.)
    this.altarController.destroyUi();
    this.deployBlurRuntime.clear();
    this.dialogueTriggerRuntime.clear();
    this.prologueEndRuntime.clear();
    // ??????? ???????? ???? ???? ???? ??? ??????? ????? ????.
    if (this.collisionDebug) this.collisionDebug.hud.visible = false;
    this.oxygenOverlay.hide();
    this.itemWorldTransitionRuntime.destroy();
    this.portalRuntime.clear();
    this.portalEntryRuntime.clear();
    this.worldEnemyKillRuntime.clear();
    this.worldEgoDialogueRuntime.clear();
    this.debugWarpRuntime?.destroy();
    this.gameOverRuntime?.destroy();
    this.acquireOverlayRuntime.destroy();
    this.frozenReturnRuntime.destroy();
  }

  override destroy(): void {
    this.itemDeploymentAtmosphereFlowRuntime.setLaserDesaturation(false);
    this.itemDeploymentAtmosphereFlowRuntime.deactivateDungeonAtmosphere();
    this.itemDeploymentTunnelFlowRuntime.destroyGhostOverlay(true);
    this.itemDeploymentTunnelFlowRuntime.restoreDeploymentTunnel(true);
    this.itemWorldEntryState.destroyDeployment();
    this.anvilCyclePrompt?.destroy();
    this.itemWorldTransitionRuntime.destroy();
    this.portalRuntime.clear();
    this.portalEntryRuntime.clear();
    this.debugWarpRuntime?.destroy();
    this.gameOverRuntime?.destroy();
    this.acquireOverlayRuntime.destroy();
    this.frozenReturnRuntime.destroy();
    this.dungeonAtmosphereRuntime.destroy();
    this.oxygenOverlay.destroy();
    this.itemWorldReturnFade?.destroy();
    this.introHandoffRuntime.destroy();
    this.endingRuntime.destroy();
    this.worldEnemyKillRuntime.clear();
    this.worldEgoDialogueRuntime.clear();
    this.dialogueTriggerRuntime.clear();
    this.prologueEndRuntime.clear();
    this.worldWeatherRuntime.destroy();
    this.worldUpdraftRuntime.destroy();
    this.voidFogRuntime.destroy();
    this.anvilDiveUiRuntime.restore();
    this.builderFlowRuntime.clearBuilder();
    this.parallaxBG?.destroy();
    this.combatFeedbackRuntime.clearDamageNumbers();
    this.deployBlurRuntime.destroy();
    this.renderer?.destroy();
    // hud ?? game.uiContainer(?? ???) ?????? super.destroy() ?? ???????? ???? ? ???? ????.
    if (this.collisionDebug) destroyDisplayObject(this.collisionDebug.hud, { children: true });
    super.destroy();
  }

  private static readonly debugMode = (() => {
    const p = new URLSearchParams(window.location.search);
    return p.has('debug');
  })();

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
    this.builderFlowRuntime.clearBuilder();

    this.currentLevel = level;
    this.worldProgressState.visitedLevels.add(level.identifier);

    // Collision grid ? deep copy so runtime modifications don't persist across reloads
    this.collisionGridRuntime.cloneFrom(level.collisionGrid);

    // Reset elemental tile overlays + burnable entities ? frozen timers and
    // entity registry from the previous room would otherwise leak across
    // rooms with different layouts.
    this.worldTileMutationRuntime.reset();
    this.worldBurnablePropRuntime.clear();
    this.grassFireRuntime.clearAsh();
    this.worldFluidRuntime.clearResidue();
    this.egoShardRuntime.clear();
    this.solidifiedWallOverlay.clear();
    this.worldContainerRegistry.clear();
    this.worldContainerCarryRuntime.reset();

    this.worldBurnablePropRuntime.spawnFromBurnableZones(level);
    this.worldContainerSpawnRuntime.spawnForLevel(level);

    this.worldFluidRuntime.attachLevel(level);
    this.worldWeatherRuntime.configureForLevel(level);
    // ???? HP ??? ?????. ?? ?? ???? ?? ???? ???? ???? ?? ???¢¬? ???
    // ???? ?????? ?ë¡?? activateBossLock ?? update ?? ??? ????? ???.
    this.hud.hideBossHP();

    // Render tiles ? filter wall tiles by collision grid (destroyed tiles stay gone).
    // value=2 (water) ?? ???? sprite ?? dynamic FluidSystem ?? ?????? ???? ???????? ?????.
    this.renderer.clear();
    const filteredWalls = filterWorldWallTilesForCollision({
      wallTiles: level.wallTiles,
      collisionGrid: this.collisionGridRuntime.grid,
      excludeWaterCells: true,
    });
    // Retag BG/WALL tiles to CSV-derived atlas ? but ONLY if the tile's
    // current tilesetPath matches the LDtk default for that layer. Levels
    // that override the tileset (e.g. Builder with builder_01) keep theirs.
    const bgAreaId = bgAreaIdForLevel(level.identifier);
    const wallAreaId = wallAreaIdForLevel(level.identifier);
    applyDefaultWorldAreaRetags({
      bgAreaId,
      wallAreaId,
      bgTiles: level.backgroundTiles,
      wallTiles: filteredWalls,
    });
    this.terrainPaletteRuntime.applyAreaPalette(bgAreaId, wallAreaId);
    // All other tiles (Interior, extras, overridden tilesets) keep their
    // original LDtk tilesetPath. Tilesets are pre-loaded in init().
    const allExtraTiles = Object.values(level.extraTileLayers).flat();
    const combinedInterior = level.interiorTiles.concat(allExtraTiles);
    this.renderer.renderLevel(level.backgroundTiles, filteredWalls, level.shadowTiles, this.atlases, undefined, this.collisionGridRuntime.grid, combinedInterior);
    addLdtkVisualBoundsBleed({
      target: {
        bgLayer: this.renderer.bgLayer,
        interiorLayer: this.renderer.interiorLayer,
        wallLayer: this.renderer.wallLayer,
        specialLayer: this.renderer.specialLayer,
        shadowLayer: this.renderer.shadowLayer,
      },
      atlases: this.atlases,
      boundsWidth: level.pxWid,
      boundsHeight: level.pxHei,
      bgTiles: level.backgroundTiles,
      wallTiles: filteredWalls,
      shadowTiles: level.shadowTiles,
      interiorTiles: combinedInterior,
      collisionGrid: this.collisionGridRuntime.grid,
    });
    this.terrainPaletteRuntime.applyWorldFilterAreas(level.pxWid, level.pxHei, this.renderer, this.proceduralDecorRuntime);

    // Procedural decorations (always on; ?noproc to disable, ?theme=X for testing)
    if (!new URLSearchParams(window.location.search).has('noproc')) {
      const procDecorator = this.proceduralDecorRuntime.preparePrimary();
      // Only apply theme if explicitly requested via URL (?theme=T-FOUNDRY)
      const themeParam = new URLSearchParams(window.location.search).get('theme');
      if (themeParam) procDecorator.setTheme(themeParam);
      // clear() always runs so entering an opted-out level wipes any decor
      // carried over from the previous level; generate() is what we skip.
      procDecorator.clear();
      this.grassFireRuntime.clearGrass();
      const isPrologueLevel = level.identifier.toLowerCase().startsWith('prologue_');
      if (!NO_PROCEDURAL_DECOR_LEVELS.has(level.identifier) && !isPrologueLevel) {
        procDecorator.generate(this.collisionGridRuntime.grid, hashString(level.identifier));
        this.grassFireRuntime.registerProceduralBurnables(procDecorator.getGrassClumpsWithCells(), this.worldTileMutationRuntime.mutator);
        if (this.terrainPaletteRuntime.applyProceduralDecorFilters(this.proceduralDecorRuntime)) {
          this.terrainPaletteRuntime.applyWorldFilterAreas(level.pxWid, level.pxHei, this.renderer, this.proceduralDecorRuntime);
        }
      }
      const structIdx = this.renderer.container.getChildIndex(this.renderer.wallLayer);
      this.renderer.container.addChildAt(procDecorator.structureLayer, structIdx);
      const detailIdx = this.renderer.container.getChildIndex(this.renderer.shadowLayer);
      this.renderer.container.addChildAt(procDecorator.naturalLayer, detailIdx);
      this.renderer.container.addChildAt(procDecorator.artificialLayer, detailIdx + 1);
    }

    // Parallax background ? rebuild on first load or when the BG area changes
    // (e.g. prologue ?? shaft). Room transitions within the same area skip the
    // rebuild to prevent jarring position resets.
    if (!this.parallaxBG.isReady || this.parallaxAreaId !== bgAreaId) {
      const bgEntry = getAreaPalette(bgAreaId);
      const atlas = getAreaPaletteAtlas();
      this.parallaxBG.setup(bgEntry, level.pxWid, level.pxHei, {
        texture: atlas.texture,
        rowCount: atlas.rowCount,
        row: getAreaPaletteRow(bgEntry.id),
      }, { nearNativeScale: bgAreaId === PROLOGUE_BG_AREA_ID });
      this.parallaxAreaId = bgAreaId;
    }

    // Camera bounds
    this.game.camera.setBounds(0, 0, level.pxWid, level.pxHei, VISUAL_BOUNDS_BLEED_PX);


    // Area title on entry. During the intro fade-in we must defer the banner
    // until the screen is actually visible, otherwise it plays behind black.
    if (level.identifier === 'Shaft_01') {
      this.introHandoffRuntime.showOrQueueAreaTitle(t('area.the_shaft'));
    }

    // Patch collisionGrid for already-unlocked SecretWalls/CrackedFloors
    // BEFORE placing the player. findEdgePassage scans collisionGrid to pick
    // an entry passage, so any wall the player already broke (e.g. re-entering
    // via a SecretWall passage) must be cleared first or the player spawns on
    // the wrong edge and floats in empty space.
    this.worldCrackedFloorRuntime.spawn(level);
    this.worldSecretWallRuntime.spawn(level);
    this.worldBreakablePropRuntime.spawnForLevel(level);
    this.worldBreakableRuntime.spawn(level);
    this.worldBuildingRuntime.spawn(level);
    this.worldCommonSpriteRuntime.spawnForLevel(level, this.renderer.interiorLayer);

    // Place player
    this.worldPlayerSpawnRuntime.place(level, enterDirection);
    this.normalizeStartRoomInventoryAfterItemWorld();

    // Spawn enemies (skip for Shop rooms)
    this.worldEnemyRegistry.clear();
    this.worldProjectileRuntime.clear();
    this.worldItemDropRuntime.clear();
    this.portalRuntime.clear();
    this.altarController.clear();
    this.savePointRuntime.loadLevel(level, this.entityLayer);
    this.exitGlowRuntime.clearAll();
    this.worldRelicPickupRuntime.loadLevel(level, this.worldProgressState.collectedRelics);
    this.worldPickupRuntime.loadLevel(level, this.collisionGridRuntime.grid, this.worldProgressState.collectedItems);
    this.endingRuntime.loadLevel(level);

    if (level.roomType !== 'Shop') {
      this.worldEnemySpawnRuntime.spawnFromLevel(level);
    }
    this.anvilSpawnRuntime.spawnFromLdtk(level);
    this.altarController.spawnFromLdtk(level);

    // Spawn locked doors and switches
    this.worldDoorSwitchSpawnRuntime.spawnDoors(level);
    this.worldDoorSwitchSpawnRuntime.spawnSwitches(level);
    this.worldGrowingWallRuntime.spawn(level);
    this.worldSpikeRuntime.spawn(level);
    this.worldCollapsingPlatformRuntime.spawn(level);
    this.dialogueTriggerRuntime.loadLevel(level);
    this.prologueEndRuntime.loadLevel(level);
    if (!this.debugPrologueCutsceneStarted && new URLSearchParams(window.location.search).has('prologueCutscene')) {
      this.debugPrologueCutsceneStarted = true;
      this.prologueEndRuntime.startFromItemWorldHandoff();
    }

    this.cameraZoneRuntime.loadLevel(level, { resetToDefaults: true });

    this.worldHandPlacedItemRuntime.loadLevel(level);

    // Exit Light Bleed ? ?? ???? ?? ???? ????? ???? ?ë¡ ?¡Æ? ?¥å????.
    // ??? ???????? *????* ??????: loadLevel() ???? clearAll() ?? ??? ??¥ï®œ
    // ?????, ??? ????? ??¥ï?(spawnBuilderEntities)?? ?? *????* ???????
    // ?????¢¥?. (?????? ????? ????? ??¥ïÂô ??? ?????? ??o??? ????.)
    this.exitGlowRuntime.loadLevel(level);

    const builderSpawner = level.entities.find((e) => e.type === 'BuilderSpawner' && e.fields.Enabled !== false);
    if (builderSpawner) {
      this.builderFlowRuntime.spawnBuilderFromSpawner(level, builderSpawner);
    }

    // HUD/minimap visibility ? Shaft_DemoEnd ?????? ????? (????
    // ???? 2026-05-17). ?? ????? ?????? ???? hudReady ?? ??? intro ????
    // ??? ??????.
    if (level.identifier === 'Shaft_DemoEnd') {
      this.hud.container.visible = false;
      this.worldMinimap.setVisible(false);
    } else if (this.game.hudReady) {
      this.hud.container.visible = true;
      this.worldMinimap.setVisible(true);
    }

    // Settle player physics (gravity snap to floor) before camera snap
    for (let i = 0; i < 5; i++) {
      this.player.update(16.667);
    }
    stopPlayerMotion(this.player, { savePreviousPosition: true });

    const cam = this.game.camera;
    const camX = this.player.x + this.player.width / 2;
    const camY = this.player.y + this.player.height / 2;
    cam.target = { x: camX, y: camY };
    cam.snap(camX, camY);
    // Run one camera.update() so cam position matches what update() would produce.
    // This prevents a 1-frame jump when transitioning from snap to normal update.
    cam.update(16.667);

    // Update minimap + world map (skip in item tunnel AND in the fixed item
    // world ? the prologue stratum is an item world, not the overworld map).
    if (!this.itemWorldEntryState.isInTunnel() && !this.fixedItemWorld.isActive) {
      this.worldMinimap.draw();
    } else {
      this.worldMinimap.setVisible(false);
    }
    // When the world map is open, the freshly-drawn minimap must stay hidden.
    if (this.worldMapRuntime.overlay.visible) {
      this.worldMinimap.setVisible(false);
    }
    this.worldMapRuntime.syncVisibleRedraw();

    this.saveRoomAudioRuntime.syncForLevel(this.savePointRuntime.hasAny);

    return true;
  }

  private keepOnlyRustbornEquipped(): void {
    const rustbornDef = SWORD_DEFS.find(d => d.id === 'sword_rustborn') ?? SWORD_DEFS[0];
    this.inventory = new Inventory();
    const rustborn = createItem(rustbornDef, 'normal');
    this.inventory.add(rustborn);
    this.inventory.equip(rustborn.uid, true);
    this.inventoryUI?.setInventory(this.inventory);
    this.saveAccess.markItemSeen(rustborn.def.id);
    this.worldPlayerStatRuntime?.sync();
  }

  private normalizeStartRoomInventoryAfterItemWorld(): void {
    if (this.currentLevel?.identifier !== 'Start_Room_01') return;
    if (!this.worldProgressState.unlockedEvents.has('__itemWorldTutorialDone')) return;

    this.keepOnlyRustbornEquipped();
  }

  // ---------------------------------------------------------------------------
  // Enemy spawning
  // ---------------------------------------------------------------------------

  /**
   * Arc Tether ??? ????? a?? ?? player facing ???? cone (?? 60??, ??? 6?) ????? ?????.
   * LOOK_UP / LOOK_DOWN ??? ?? ?? ???????? GRAB ???? ?????? (stack/??? ???).
   * ????? ???????(< 24px)?? cone ????? ?ÄØ ??¢¥? (???? ???? ???? ???).
   */
  /**
   * Spawn Dialogue and Memory triggers from LDtk entities.
   */
  /**
   * (Documents/Research/RoomTransition_Readability_Research.md A2)
   *
   * ???? ???? (w/e): col 0 ??? gridW-1 ???? ??????? passable run ?? a?? 1? ?????? ??? ????.
   * ???? ???? (n/s): row 0 ??? gridH-1 ???? ?¢¯?? passable ???? ??????.
   * passable ?????? checkLevelEdges() ?? ?????? (?? 0 ??? 2).
   */
  // ---------------------------------------------------------------------------
  // Ending sequence ? delegated to EndingSequence class
  // ---------------------------------------------------------------------------

  private rerenderTilemap(): void {
    // Filter out wall tiles where collision grid is 0 (destroyed floors/walls)
    const grid = this.collisionGridRuntime.grid;
    const filteredTiles = filterWorldWallTilesForCollision({
      wallTiles: this.currentLevel.wallTiles,
      collisionGrid: grid,
    });
    this.renderer.rebuildWallLayer(filteredTiles, this.atlases, this.collisionGridRuntime.grid);
    addLdtkVisualBoundsBleed({
      target: {
        wallLayer: this.renderer.wallLayer,
        specialLayer: this.renderer.specialLayer,
      },
      atlases: this.atlases,
      boundsWidth: this.currentLevel.pxWid,
      boundsHeight: this.currentLevel.pxHei,
      wallTiles: filteredTiles,
      collisionGrid: this.collisionGridRuntime.grid,
    });
    this.terrainPaletteRuntime.applyWorldFilterAreas(this.currentLevel.pxWid, this.currentLevel.pxHei, this.renderer, this.proceduralDecorRuntime);
  }

}




