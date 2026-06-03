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
 *  - Variable level sizes — camera bounds are set per level.
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
import type { LdtkEntity, LdtkLevel } from '@level/LdtkLoader';
import { addLdtkVisualBoundsBleed, VISUAL_BOUNDS_BLEED_PX } from '@level/VisualBoundsBleed';
import { Player } from '@entities/Player';
import type { Portal, PortalSourceType } from '@entities/Portal';
import type { Anvil } from '@entities/Anvil';
import { TILE_WALL, TILE_MAGMA, TILE_WATER, TILE_METAL, TILE_ACID, TILE_SPIKE } from '@core/Physics';
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
import { sacredSave } from '@save/PlayerSave';
import { t } from '@i18n';
import {
  EGO_INVENTORY_LOCKED,
} from '@data/EgoDialogue';
import { PUFF_TINT_TOXIC, PUFF_TINT_PLASMA } from '@effects/SteamPuff';
import { ThrowableContainer } from '@entities/ThrowableContainer';
import { ParallaxBackground } from '@level/ParallaxBackground';
import { hashString } from '@level/ProceduralDecorator';
import { seedItemWorldTemplates } from '@level/ItemWorldTemplatePool';
import {
  getAreaPalette,
  getAreaPaletteAtlas,
  getAreaPaletteRow,
  ensureAreaTilesetsLoaded,
  applyAreaTilesetToLdtkTiles,
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
import { isEnemyKillHandled, markEnemyKillHandled } from '@systems/EntityRuntimeMeta';
import { applyTileHazards, CYRO_FROZEN_MS, CYRO_TICK_MS, CYRO_TICK_PCT, MAGMA_BURN_DURATION_MS } from '@systems/TileHazards';
import { hazardToElement } from '@combat/ElementAffinity';
import { TutorialHint } from '@ui/TutorialHint';
import { LowHpHealHintRuntime } from '@ui/LowHpHealHintRuntime';
import { FluidSystem, type ArcLink } from '@effects/FluidSystem';
import { PRNG } from '@utils/PRNG';
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
import { WorldEnemyRegistry } from './world/WorldEnemyRegistry';
import { WorldEnemyKillRuntime } from './world/WorldEnemyKillRuntime';
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
import { WorldTileMutationRuntime } from './world/WorldTileMutationRuntime';
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
import type { CombatEntity } from '@combat/HitManager';
import { GAME_WIDTH, GAME_HEIGHT, type Game } from '../Game';
import { trackPlayerDeath } from '@utils/Analytics';
import { assetPath } from '@core/AssetLoader';
import { AmbientLayer } from '@audio/AmbientLayer';
import { SFX } from '@audio/Sfx';
import { BgmController } from '@audio/BgmController';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TILE_SIZE = 16;
const FADE_DURATION = 200;
const FROZEN_RETURN_ARM_DISTANCE = 4 * TILE_SIZE;
// FIRST_ANVIL_LEVEL_ID 제거 (2026-05-24): LDtk Anvil entity 의
// RetireAfterFirstBoss field 로 첫 앤빌 여부를 판정하도록 대체.
const LDTK_PATH = assetPath('assets/World_ProjectAbyss.ldtk');
// ItemTunnel world was removed from the LDtk project; tunnel descent flow is
// archived in WorldAnvilItemWorldFlowRuntime while the default anvil FX enters
// Item World directly.
const LDTK_WORLD_IDS: string[] = ['Overworld'];
const BUILDER_WORLD_ID = 'Builder';
// AreaIDs used by the overworld — Content_System_Area_Palette.csv's Tileset
// column drives which atlases get loaded for this scene.
const WORLD_AREA_IDS = ['world_shaft_bg', 'world_shaft_wall'] as const;
const FALLBACK_ENTRANCE_LEVEL = 'World_Level_16';

// ---------------------------------------------------------------------------
// LdtkWorldScene
// ---------------------------------------------------------------------------

export class LdtkWorldScene extends Scene {
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
   * the weighty "쿵" feedback.
   */
  private readonly builderStepFeedbackRuntime = new WorldBuilderStepFeedbackRuntime();
  private readonly builderPlayerStateRuntime = new WorldBuilderPlayerStateRuntime();
  private readonly builderInteriorVisibilityRuntime = new WorldBuilderInteriorVisibilityRuntime();
  private readonly builderStampRuntime = new WorldBuilderStampRuntime();
  private readonly builderPlayerCollisionRuntime = new WorldBuilderPlayerCollisionRuntime({
    getPlayer: () => this.player,
    getCollisionGrid: () => this.collisionGrid,
    getActiveBuilder: () => this.activeBuilder,
    getStampSet: () => this.builderStampRuntime.activeStampSet,
    hasOneWayDropThroughGrace: () => this.builderPlayerStateRuntime.hasOneWayDropThroughGrace,
    isEntryCinematicActive: () => this.isItemWorldEntryCinematicActive(),
  });
  private renderer!: LdtkRenderer;
  private readonly proceduralDecorRuntime = new WorldProceduralDecorRuntime();
  private readonly terrainPaletteRuntime = new WorldTerrainPaletteRuntime();
  private readonly builderVisualFilterRuntime = new WorldBuilderVisualFilterRuntime();
  private readonly builderLayerRuntime = new WorldBuilderLayerRuntime();
  private readonly builderSpawnerRuntime = new WorldBuilderSpawnerRuntime();
  private readonly builderGrassRuntime = new WorldBuilderGrassRuntime();
  private readonly builderSpriteRuntime = new WorldBuilderSpriteRuntime();
  private builderItemRuntime!: WorldBuilderItemRuntime;
  private builderStaticEntityRuntime!: WorldBuilderStaticEntityRuntime;
  private builderDoorSwitchRuntime!: WorldBuilderDoorSwitchRuntime;
  private builderEntranceRuntime!: WorldBuilderEntranceRuntime;
  private parallaxBG!: ParallaxBackground;
  private atlas!: Texture;
  /** Per-tileset atlas map keyed by LDtk __tilesetRelPath. */
  private atlases: Record<string, Texture> = {};
  private itemWorldEntryPreloader!: ItemWorldEntryPreloader;
  private currentLevel!: LdtkLevel;
  private cameraZoneRuntime!: CameraZoneRuntime;

  private get collisionGrid(): number[][] {
    return this.collisionGridRuntime.grid;
  }

  private get fluidSystem() {
    return this.worldFluidRuntime.system;
  }

  private get fluidSpawners() {
    return this.worldFluidRuntime.spawners;
  }

  private get fluidCrestFoam() {
    return this.worldFluidRuntime.crestFoam;
  }

  private get fluidResidue() {
    return this.worldFluidRuntime.residue;
  }

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
  /** Entities that ride the active GiantBuilder. Each frame their world
   *  coords are recomputed from the builder's current position so pickup /
   *  interaction hitboxes (which use world coords) stay in sync with the
   *  visual. Anything with `x`, `y`, `container` and an optional `baseY`
   *  (for bob-animated entities) can be attached. */
  private readonly builderAttachmentRuntime = new WorldBuilderAttachmentRuntime();
  private inventoryUI!: InventoryUI;
  /** DEC-046 Identity Archive (장비 정체성 기록 보관). JUMP 키로 연다. */
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
  /** Gamepad hot-plug 구독 해제용 unsubscribe — exit 시 호출. */
  private _gpUnsub: (() => void) | null = null;
  private noWeaponFeedbackRuntime!: WorldNoWeaponFeedbackRuntime;
  private bossHpRuntime!: BossHpRuntime;

  private readonly combatFeedbackRuntime = new WorldCombatFeedbackRuntime();
  private readonly movementVfxRuntime = new WorldMovementVfxRuntime();
  private readonly grassFireRuntime = new WorldGrassFireRuntime();
  private readonly egoShardRuntime = new EgoShardRuntime();
  private readonly itemWorldEntryStream = new ItemWorldEntryStreamRuntime();
  private worldEnemyKillRuntime!: WorldEnemyKillRuntime;
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

  private get minimap(): Container | null {
    return this.worldMinimap?.container ?? null;
  }

  private get worldMap(): WorldMapOverlay {
    return this.worldMapRuntime.overlay;
  }

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

  // Sacred Pickup — weapon pickup cutscene + lore popup + dive preview.
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
  /** 핸드 플레이스 Breakable (LDtk Entity 'Breakable') 레지스트리. 부서지는 props 와 그 런타임을 관리. */
  private readonly worldBreakableRegistry = new WorldBreakableRegistry();
  private worldBreakableRuntime!: WorldBreakableRuntime;
  /** 핸드 플레이스 Building (LDtk Entity 'Building') 레지스트리. 건물 진입/표시를 관리. */
  private readonly worldBuildingRegistry = new WorldBuildingRegistry();
  private worldBuildingRuntime!: WorldBuildingRuntime;
  private readonly worldSecretWallRegistry = new WorldSecretWallRegistry();
  private worldSecretWallRuntime!: WorldSecretWallRuntime;
  private readonly worldSpikeRegistry = new WorldSpikeRegistry();
  private worldSpikeRuntime!: WorldSpikeRuntime;
  // Updraft: IntGrid value 4 — handled in WorldUpdraftRuntime
  private readonly worldUpdraftRuntime = new WorldUpdraftRuntime();
  /** Dynamic IntGrid state and overlay renderer for frozen/burning/electric cells. */
  private readonly worldTileMutationRuntime = new WorldTileMutationRuntime();
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
   * Exit Light Bleed — 다음 방으로 이어지는 출구 방향으로 빛이 새어 나오게 하여
   * 플레이어가 진행 방향을 읽도록 돕는 가독성 효과.
   * (Documents/Research/RoomTransition_Readability_Research.md A2)
   */
  private exitGlowRuntime!: WorldExitGlowRuntime;
  private loreDisplay: LoreDisplay | null = null;
  private dialogueTriggerRuntime!: WorldDialogueTriggerRuntime;
  private worldEgoDialogueRuntime!: WorldEgoDialogueRuntime;

  /** Pattern D (proximity-interaction) — 근접 상호작용 우선순위 라우터. */
  private proximity: ProximityRouter = new ProximityRouter();

  private get enemies(): Enemy<string>[] {
    return this.worldEnemyRegistry.enemies;
  }

  private get containers(): ThrowableContainer[] {
    return this.worldContainerRegistry.containers;
  }

  private get heldContainer(): ThrowableContainer | null {
    return this.worldContainerCarryRuntime.heldContainer;
  }

  private get flaskBurst() { return this.movementVfxRuntime.flaskBurst; }
  private get criticalHighlight() { return this.movementVfxRuntime.criticalHighlight; }
  private get hitBloodSpray() { return this.movementVfxRuntime.hitBloodSpray; }
  private get waterBubbles() { return this.movementVfxRuntime.waterBubbles; }
  private get steamPuff() { return this.movementVfxRuntime.steamPuff; }
  private get dropThroughDust() { return this.movementVfxRuntime.dropThroughDust; }
  private get iceSkidStreak() { return this.movementVfxRuntime.iceSkidStreak; }

  private get dmgNumbers() { return this.combatFeedbackRuntime.damageNumbers; }
  private get hitSparks() { return this.combatFeedbackRuntime.hitSparks; }
  private get propShatter() { return this.combatFeedbackRuntime.propShatter; }
  private get screenFlash() { return this.combatFeedbackRuntime.screenFlash; }
  private get savepointPulse() { return this.statusFeedbackRuntime.savepointPulse; }

  private get itemPickupGlow() {
    return this.pickupVfxRuntime.itemGlow;
  }

  private get relicAuraBurst() {
    return this.pickupVfxRuntime.relicAura;
  }

  private get tileMutator(): TileMutator {
    return this.worldTileMutationRuntime.mutator;
  }

  private get visitedLevels(): Set<string> {
    return this.worldProgressState.visitedLevels;
  }

  private get clearedLevels(): Set<string> {
    return this.worldProgressState.clearedLevels;
  }

  private get collectedItems(): Set<string> {
    return this.worldProgressState.collectedItems;
  }

  private get collectedRelics(): Set<string> {
    return this.worldProgressState.collectedRelics;
  }

  private get unlockedEvents(): Set<string> {
    return this.worldProgressState.unlockedEvents;
  }

  constructor(game: Game) {
    super(game);
    this.wireCoreAndAnvilRuntimes();
    this.wireEnvironmentRuntimes();
    this.wirePickupAndBuilderItemRuntimes();
    this.wireTerrainRuntimes();
    this.wireItemWorldFlowRuntimes();
    this.wireCombatAndTransitionRuntimes();
    this.registerProximityHandlers();
  }

  private wireCoreAndAnvilRuntimes(): void {
    this.oxygenOverlay = new OxygenOverlay(this.game);
    this.anvilDiveUiRuntime = new WorldAnvilDiveUiRuntime(this.game.uiContainer);
    this.anvilRetirementRuntime = new WorldAnvilRetirementRuntime({
      getUnlockedEvents: () => this.unlockedEvents,
      isFirstItemWorldBossDefeated: () => sacredSave.isFirstItemWorldBossDefeated(),
      getAnvil: () => this.anvil,
      getReturnRetireAfterFirstBoss: () => this.anvilReturnState.retireAfterFirstBoss,
      clearReturnItem: () => this.anvilReturnState.setItem(null),
      hidePrompts: () => this.anvilPrompts.hideAll(),
      closeAnvilInventoryIfOpen: () => {
        if (this.inventoryUI.visible && this.inventoryUI.isAnvilMode()) {
          this.inventoryUI.close();
        }
      },
      flushInventoryHint: () => this.inventoryTutorialHint.flushDeferredFirstItemWorldReturnHint(500),
    });
    this.worldFluidFeedbackRuntime = new WorldFluidFeedbackRuntime({
      getPlayer: () => this.player,
      getEnemies: () => this.enemies,
      getCollisionGrid: () => this.collisionGrid,
      getFluidSystem: () => this.fluidSystem,
      getFluidSpawners: () => this.fluidSpawners,
      getFluidResidue: () => this.fluidResidue,
      getContactState: () => this.worldFluidContactState,
      getDamageNumbers: () => this.dmgNumbers,
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
      getUnlockedEvents: () => this.unlockedEvents,
      getCollectedRelics: () => this.collectedRelics,
      getCollectedItems: () => this.collectedItems,
      getVisitedLevels: () => this.visitedLevels,
      getClearedLevels: () => this.clearedLevels,
      getGold: () => this.worldPlayerProgressionState.gold,
      getPlaytimeMs: () => this.game.stats.playTimeMs,
      getHealthShardBonus: () => this.worldPlayerProgressionState.healthShardBonus,
      getCompletedTutorialHints: () => this.tutorialHint.getCompletedIds(),
      flashSaveFeedback: () => this.screenFlash.flash(0x44ffaa, 0.3, 200),
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
      incrementEnemiesKilled: () => { this.game.stats.enemiesKilled++; },
      unlockDoorByIid: (iid) => this.worldDoorSwitchInteractionRuntime.unlockDoorByIid(iid),
      getUnlockedEvents: () => this.unlockedEvents,
      flashBossKill: () => this.screenFlash.flash(0xffd700, 0.5, 300),
      setHitstopFrames: (frames) => { this.game.hitstopFrames = frames; },
      deactivateBossLock: () => this.bossLockRuntime.deactivate(),
      getFixedItemWorldItem: () => this.fixedItemWorldFlowRuntime.currentItem,
      isFirstItemWorldBossDefeated: () => sacredSave.isFirstItemWorldBossDefeated(),
      markFirstItemWorldBossDefeated: () => sacredSave.markFirstItemWorldBossDefeated(),
      syncPlayerStats: () => this.worldPlayerStatRuntime.sync(),
      showBigToast: (message, color) => this.toast.showBig(message, color),
      isSceneInitialized: () => this.initialized,
      spawnPortal: (x, y, rarity, sourceType, item) => this.spawnPortal(x, y, rarity, sourceType, item),
      getCollisionGrid: () => this.collisionGrid,
      getPlayerMaxHp: () => this.player.maxHp,
      rollDrop: () => this.dropRng.next(),
      addGoldPickup: (pickup) => this.worldPickupRuntime.addGoldPickup(pickup),
      addHealingPickup: (pickup) => this.worldPickupRuntime.addHealingPickup(pickup),
    });
    this.anvilInteractionRuntime = new WorldAnvilInteractionRuntime({
      getAnvil: () => this.anvil,
      getPlayer: () => this.player,
      getPrompts: () => this.anvilPrompts ?? null,
      isRetiredByBossClear: (anvil) => this.anvilRetirementRuntime.isRetiredByBossClear(anvil),
      isDeploymentActive: () => !!this.itemWorldEntryState.deployment?.isActive,
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
      setEntryItem: (item) => { this.itemWorldEntryState.item = item; },
      setReturnItem: (item) => this.anvilReturnState.setItem(item),
      suppressPrompts: (durationMs) => this.anvilPrompts.suppress(durationMs),
      showToast: (message, color) => this.toast.show(message, color),
      flushInventoryHint: (delayMs) => this.inventoryTutorialHint.flushDeferredFirstItemWorldReturnHint(delayMs),
      restoreUiAfterDiveTransition: () => this.anvilDiveUiRuntime.restore(),
      setSharedUiVisible: (visible) => { this.game.uiContainer.visible = visible; },
      hideUiForDiveTransition: () => this.anvilDiveUiRuntime.hide(),
      markFirstDiveDone: () => sacredSave.markFirstDiveDone(),
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
      getItem: () => this.itemWorldEntryState.item,
      getCurrentLevelId: () => this.currentLevel?.identifier ?? null,
      hidePrompts: () => this.anvilInteractionRuntime.hidePrompts(),
      hideSavePoint: () => this.savePointRuntime.hideForItemDeployment(),
      hideUiForDiveTransition: () => this.anvilDiveUiRuntime.hide(),
      recordReturnState: (anvil, levelId, item) => this.anvilReturnState.record(anvil, levelId, item),
      setPreTunnelLevelId: (levelId) => { this.itemWorldEntryState.preTunnelLevelId = levelId; },
      incrementDive: (itemDefId) => sacredSave.incrementDive(itemDefId),
      destroyDeployment: () => this.itemWorldEntryState.destroyDeployment(),
      setDeployment: (deployment) => { this.itemWorldEntryState.deployment = deployment; },
      enterItemWorld: () => this.anvilItemWorldFlowRuntime.enterFromTunnel({ entryCorridor: false }),
      spawnStrikeEffect: (x, y, strong, variant) => this.hitSparks.spawn(x, y, strong, variant),
      openTunnel: (x, y, w, h, options) => this.itemDeploymentTunnelFlowRuntime.openDeploymentTunnel(x, y, w, h, options ?? { scheduleGhost: false }),
      setLaserDesaturation: (active) => this.itemDeploymentAtmosphereFlowRuntime.setLaserDesaturation(active),
      showTunnelOpenDialogue: () => this.showTunnelOpenDialogueAfterDeployment(),
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
      getCollisionGrid: () => this.collisionGrid,
      getDynamicColliders: () => this.builderWeatherRuntime.getDynamicColliders(this.activeBuilder),
      isIgnoredCell: (col, row) => this.builderStampRuntime.isStampedCell(col, row, this.collisionGrid),
    });
  }

  private wireEnvironmentRuntimes(): void {
    this.maintainedContainerSpawnerRuntime = new WorldMaintainedContainerSpawnerRuntime({
      getCollisionGrid: () => this.collisionGrid,
      getContainers: () => this.containers,
      getEntityLayer: () => this.entityLayer,
    });
    this.worldContainerSpawnRuntime = new WorldContainerSpawnRuntime({
      registry: this.worldContainerRegistry,
      maintainedSpawnerRuntime: this.maintainedContainerSpawnerRuntime,
      getCollisionGrid: () => this.collisionGrid,
      getEntityLayer: () => this.entityLayer,
      isDebugMode: () => LdtkWorldScene.debugMode,
    });
    this.worldContainerDestructionRuntime = new ContainerDestructionRuntime({
      game: this.game,
      getPropShatter: () => this.propShatter,
    });
    this.worldContainerFluidRuntime = new WorldContainerFluidRuntime({
      game: this.game,
      getCollisionGrid: () => this.collisionGrid,
      getTileMutator: () => this.tileMutator,
      getFluidSystem: () => this.fluidSystem,
      getContainers: () => this.containers,
      getEnemies: () => this.enemies,
      getSteamPuff: () => this.steamPuff,
      rerenderTilemap: () => this.rerenderTilemap(),
    });
    this.worldContainerPhysicsRuntime = new WorldContainerPhysicsRuntime({
      getPlayer: () => this.player,
      getEnemies: () => this.enemies,
      getContainers: () => this.containers,
      getCollisionGrid: () => this.collisionGrid,
      getTileMutator: () => this.tileMutator,
      getDamageNumbers: () => this.dmgNumbers,
      getHitSparks: () => this.hitSparks,
      paintContainerImpact: (kind, gx, gy, volume) => this.worldContainerFluidRuntime.paintImpact(kind, gx, gy, volume),
      applyContainerEffectToFluid: (container) => this.worldContainerFluidRuntime.applyContainerEffect(container),
      destroyContainerWithVFX: (container) => this.worldContainerDestructionRuntime.destroyWithVfx(container),
      removeContainerAt: (index) => this.worldContainerRegistry.removeAt(index),
      flushContainerFluidChanges: () => this.worldContainerFluidRuntime.flush(),
    });
    this.worldContainerAttackRuntime = new WorldContainerAttackRuntime({
      getPlayer: () => this.player,
      getContainers: () => this.containers,
      getHitSparks: () => this.hitSparks,
      paintContainerImpact: (kind, gx, gy, volume) => this.worldContainerFluidRuntime.paintImpact(kind, gx, gy, volume),
      destroyContainerWithVFX: (container) => this.worldContainerDestructionRuntime.destroyWithVfx(container),
      removeContainerAt: (index) => this.worldContainerRegistry.removeAt(index),
    });
    this.worldPlayerImpactRuntime = new WorldPlayerImpactRuntime({
      game: this.game,
      getPlayer: () => this.player,
      getEnemies: () => this.enemies,
      getDamageNumbers: () => this.dmgNumbers,
      getHitSparks: () => this.hitSparks,
      getScreenFlash: () => this.screenFlash,
      shatterGrowingWallsOnSurge: (playerBox) => this.worldGrowingWallRuntime.shatterOnSurge(playerBox),
      shatterCrackedFloorsOnSurge: (playerBox) => this.worldCrackedFloorRuntime.shatterOnSurge(playerBox),
      shatterCrackedFloorsOnLanding: (px, py, radius) => this.worldCrackedFloorRuntime.shatterOnLanding(px, py, radius),
      shatterGrowingWallsOnLanding: (px, py, radius) => this.worldGrowingWallRuntime.shatterOnLanding(px, py, radius),
    });
    this.worldEgoShardCombatRuntime = new WorldEgoShardCombatRuntime({
      getPlayer: () => this.player,
      getEnemies: () => this.enemies,
      getContainers: () => this.containers,
      getCollisionGrid: () => this.collisionGrid,
      getTileMutator: () => this.tileMutator,
      getDamageNumbers: () => this.dmgNumbers,
      getHitSparks: () => this.hitSparks,
      retrieveShardsInAABB: (x, y, width, height) => this.egoShardRuntime.retrieveInAABB(x, y, width, height),
      paintContainerImpact: (kind, gx, gy, volume) => this.worldContainerFluidRuntime.paintImpact(kind, gx, gy, volume),
      destroyContainerWithVFX: (container) => this.worldContainerDestructionRuntime.destroyWithVfx(container),
      removeContainerAt: (index) => this.worldContainerRegistry.removeAt(index),
    });
    this.worldEgoShardImpactRuntime = new WorldEgoShardImpactRuntime({
      game: this.game,
      getPlayer: () => this.player,
      getRoom: () => this.player.roomData,
      getCollisionGrid: () => this.collisionGrid,
      getTileMutator: () => this.tileMutator,
      getFluidSystem: () => this.fluidSystem,
      getFluidResidue: () => this.fluidResidue,
      getSteamPuff: () => this.steamPuff,
      igniteGrassInCellAABB: (minGx, minGy, maxGx, maxGy) => this.grassFireRuntime.igniteInCellAABB(minGx, minGy, maxGx, maxGy),
      showToast: (message, color) => this.toast.show(message, color),
    });
    this.worldEgoShardProjectileRuntime = new WorldEgoShardProjectileRuntime({
      getPlayer: () => this.player,
      getCollisionGrid: () => this.collisionGrid,
      getEgoShardRuntime: () => this.egoShardRuntime,
      onImpact: (x, y, element) => this.worldEgoShardImpactRuntime.handleImpact(x, y, element),
      checkHit: (x, y, element) => this.worldEgoShardCombatRuntime.checkHit(x, y, element),
      flushContainerFluidChanges: () => this.worldContainerFluidRuntime.flush(),
    });
    this.worldEgoShardCastRuntime = new WorldEgoShardCastRuntime({
      game: this.game,
      getPlayer: () => this.player,
      getCollisionGrid: () => this.collisionGrid,
      getEgoShardRuntime: () => this.egoShardRuntime,
      hasHeldContainer: () => !!this.heldContainer,
    });
  }

  private wirePickupAndBuilderItemRuntimes(): void {
    this.worldPickupRuntime = new WorldPickupRuntime({
      getPlayer: () => this.player,
      getEntityLayer: () => this.entityLayer,
      getDamageNumbers: () => this.dmgNumbers,
      getItemPickupGlow: () => this.itemPickupGlow,
      getScreenFlash: () => this.screenFlash,
      showToast: (message, color) => this.toast.show(message, color),
      addGold: (amount) => {
        this.worldPlayerProgressionState.addGold(amount);
      },
      addCollectedItem: (key) => {
        this.collectedItems.add(key);
      },
    });
    this.worldRelicPickupRuntime = new WorldRelicPickupRuntime({
      game: this.game,
      getPlayer: () => this.player,
      getEntityLayer: () => this.entityLayer,
      getRelicAuraBurst: () => this.relicAuraBurst,
      getScreenFlash: () => this.screenFlash,
      getCurrentLevelId: () => this.currentLevel?.identifier,
      getAcquireOverlayRuntime: () => this.acquireOverlayRuntime,
      addCollectedRelic: (key) => this.collectedRelics.add(key),
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
      addCollectedItem: (key) => this.collectedItems.add(key),
      spawnItemPickupGlow: (x, y, tint) => this.itemPickupGlow.spawn(x, y, tint),
      startSacredPickup: (item, x, y) => this.sacredPickupRuntime.startPickup(item, x, y),
    });
    this.worldFixedItemSpawnRuntime = new WorldFixedItemSpawnRuntime({
      getCollisionGrid: () => this.collisionGrid,
      addItemDrop: (drop) => this.worldItemDropRuntime.add(drop),
      addGoldPickup: (pickup) => this.worldPickupRuntime.addGoldPickup(pickup),
      showToast: (message, color) => this.toast.show(message, color),
    });
    this.builderItemRuntime = new WorldBuilderItemRuntime({
      attachments: this.builderAttachmentRuntime,
      fixedItemSpawn: this.worldFixedItemSpawnRuntime,
      itemDrops: this.worldItemDropRuntime,
      pickups: this.worldPickupRuntime,
      hasCollectedItem: (key) => this.collectedItems.has(key),
      addCollectedItem: (key) => this.collectedItems.add(key),
    });
    this.builderStaticEntityRuntime = new WorldBuilderStaticEntityRuntime({
      attachments: this.builderAttachmentRuntime,
      getEntityLayer: () => this.entityLayer,
      spikeRegistry: this.worldSpikeRegistry,
      breakableRegistry: this.worldBreakableRegistry,
      collapsingPlatformRegistry: this.worldCollapsingPlatformRegistry,
      getUnlockedEvents: () => this.unlockedEvents,
    });
    this.builderDoorSwitchRuntime = new WorldBuilderDoorSwitchRuntime({
      attachments: this.builderAttachmentRuntime,
      getEntityLayer: () => this.entityLayer,
      registry: this.worldDoorSwitchRegistry,
      getUnlockedEvents: () => this.unlockedEvents,
    });
    this.worldHandPlacedItemRuntime = new WorldHandPlacedItemRuntime({
      hasCollectedItem: (key) => this.collectedItems.has(key),
      addCollectedItem: (key) => this.collectedItems.add(key),
      spawnFixedItem: (x, y, itemId, itemKey) => this.worldFixedItemSpawnRuntime.spawn(x, y, itemId, itemKey),
    });
  }

  private wireTerrainRuntimes(): void {
    this.worldSecretWallRuntime = new WorldSecretWallRuntime({
      game: this.game,
      getPlayer: () => this.player,
      getCollisionGrid: () => this.collisionGrid,
      getRenderer: () => this.renderer,
      getRegistry: () => this.worldSecretWallRegistry,
      getUnlockedEvents: () => this.unlockedEvents,
      getCurrentLevelId: () => this.currentLevel?.identifier,
      addItemDrop: (drop) => this.worldItemDropRuntime.add(drop),
      spawnFixedItem: (x, y, itemId) => this.worldFixedItemSpawnRuntime.spawn(x, y, itemId),
      showToast: (message, color) => this.toast.show(message, color),
    });
    this.worldCrackedFloorRuntime = new WorldCrackedFloorRuntime({
      game: this.game,
      getPlayer: () => this.player,
      getCollisionGrid: () => this.collisionGrid,
      getEntityLayer: () => this.entityLayer,
      getRegistry: () => this.worldCrackedFloorRegistry,
      getUnlockedEvents: () => this.unlockedEvents,
      getScreenFlash: () => this.screenFlash,
      showToast: (message, color) => this.toast.show(message, color),
    });
    this.worldGrowingWallRuntime = new WorldGrowingWallRuntime({
      game: this.game,
      getPlayer: () => this.player,
      getCollisionGrid: () => this.collisionGrid,
      getEntityLayer: () => this.entityLayer,
      getRegistry: () => this.worldGrowingWallRegistry,
      getUnlockedEvents: () => this.unlockedEvents,
      getHitSparks: () => this.hitSparks,
      getScreenFlash: () => this.screenFlash,
      addSpawnedSlime: (slime) => this.worldEnemyRegistry.add(slime, this.entityLayer),
      showToast: (message, color) => this.toast.show(message, color),
    });
    this.worldSpikeRuntime = new WorldSpikeRuntime({
      game: this.game,
      getPlayer: () => this.player,
      getEntityLayer: () => this.entityLayer,
      getRegistry: () => this.worldSpikeRegistry,
      getHud: () => this.hud,
      getScreenFlash: () => this.screenFlash,
      getDamageNumbers: () => this.dmgNumbers,
    });
    this.worldBreakableRuntime = new WorldBreakableRuntime({
      game: this.game,
      getPlayer: () => this.player,
      getCollisionGrid: () => this.collisionGrid,
      getEntityLayer: () => this.entityLayer,
      getRegistry: () => this.worldBreakableRegistry,
      getPropShatter: () => this.propShatter,
      getHitSparks: () => this.hitSparks,
      addGoldPickup: (pickup) => this.worldPickupRuntime.addGoldPickup(pickup),
    });
    this.worldBuildingRuntime = new WorldBuildingRuntime({
      getEntityLayer: () => this.entityLayer,
      getRegistry: () => this.worldBuildingRegistry,
    });
    this.worldBreakablePropRuntime = new WorldBreakablePropRuntime({
      game: this.game,
      getPlayer: () => this.player,
      getCollisionGrid: () => this.collisionGrid,
      getEntityLayer: () => this.entityLayer,
      getRegistry: () => this.worldBreakablePropRegistry,
      getTileMutator: () => this.tileMutator,
      getPropShatter: () => this.propShatter,
      getHitSparks: () => this.hitSparks,
      findEdgePassage: (grid, direction, preferred) => this.transitionController.findEdgePassage(grid, direction, preferred),
      addGoldPickup: (pickup) => this.worldPickupRuntime.addGoldPickup(pickup),
    });
    this.worldCollapsingPlatformRuntime = new WorldCollapsingPlatformRuntime({
      getPlayer: () => this.player,
      getCollisionGrid: () => this.collisionGrid,
      getEntityLayer: () => this.entityLayer,
      getRegistry: () => this.worldCollapsingPlatformRegistry,
      getUnlockedEvents: () => this.unlockedEvents,
      refreshBuilderGrid: (grid) => this.builderStampRuntime.refreshIfBuilderGrid(
        this.activeBuilder,
        grid,
        this.collisionGrid,
      ),
    });
    this.worldBurnablePropRuntime = new WorldBurnablePropRuntime({
      getCollisionGrid: () => this.collisionGrid,
      getEntityLayer: () => this.entityLayer,
      getRegistry: () => this.worldBurnablePropRegistry,
      getTileMutator: () => this.tileMutator,
      spawnAsh: (cx, baseY, footprintW) => this.grassFireRuntime.spawnAsh(cx, baseY, footprintW),
      isDebugMode: () => LdtkWorldScene.debugMode,
    });
    this.worldDoorSwitchSpawnRuntime = new WorldDoorSwitchSpawnRuntime({
      getCollisionGrid: () => this.collisionGrid,
      getEntityLayer: () => this.entityLayer,
      getRegistry: () => this.worldDoorSwitchRegistry,
      getUnlockedEvents: () => this.unlockedEvents,
    });
    this.worldDoorSwitchInteractionRuntime = new WorldDoorSwitchInteractionRuntime({
      game: this.game,
      getPlayer: () => this.player,
      getCollisionGrid: () => this.collisionGrid,
      getRegistry: () => this.worldDoorSwitchRegistry,
      getAttackState: () => this.worldDoorAttackState,
      getScreenFlash: () => this.screenFlash,
      getUnlockedEvents: () => this.unlockedEvents,
      getCurrentLevelId: () => this.currentLevel?.identifier,
      refreshBuilderGrid: (grid) => this.builderStampRuntime.refreshIfBuilderGrid(
        this.activeBuilder,
        grid,
        this.collisionGrid,
      ),
      showToast: (message, color) => this.toast.show(message, color),
    });
    this.worldProjectileRuntime = new WorldProjectileRuntime({
      game: this.game,
      getPlayer: () => this.player,
      getEntityLayer: () => this.entityLayer,
      getEnemies: () => this.enemies,
      getActiveAttackHitbox: () => getActivePlayerAttackHitbox(this.player),
      getHud: () => this.hud,
      getDamageNumbers: () => this.dmgNumbers,
      getHitSparks: () => this.hitSparks,
      getScreenFlash: () => this.screenFlash,
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
    this.itemWorldSceneFlowRuntime = new WorldItemWorldSceneFlowRuntime({
      game: this.game,
      getInventory: () => this.inventory,
      getPlayer: () => this.player,
      getUnlockedEvents: () => this.unlockedEvents,
      preloader: this.itemWorldEntryPreloader,
      pushTransition: this.itemWorldEntryTransition,
      preparePush: () => {
        this.container.visible = false;
        this.detachSharedUiForItemWorld();
        this.releaseWorldVisualsForItemWorld();
        this.game.camera.setZoom(1.0);
      },
      restoreWorldAtAnvilReturnPoint: (resetAnvil) => this.anvilReturnFlowRuntime.restoreWorldAtReturnPoint(resetAnvil),
      startItemWorldReturnFadeIn: () => this.startItemWorldReturnFadeIn(),
      updatePlayerAtk: () => this.worldPlayerStatRuntime.sync(),
      isFirstItemWorldBossDefeated: () => sacredSave.isFirstItemWorldBossDefeated(),
      showFirstItemWorldReturnInventoryHint: (hadFirstBossClear) => {
        this.inventoryTutorialHint.requestFirstItemWorldReturnHint(hadFirstBossClear);
      },
      onEarnedGold: (amount) => {
        this.worldPlayerProgressionState.addGold(amount);
        this.toast.show(t('toast.gold_gain', { amount }), 0xffd700);
      },
    });
    this.fixedItemWorldFlowRuntime = new WorldFixedItemWorldFlowRuntime({
      fixedItemWorld: this.fixedItemWorld,
      itemWorldSceneFlow: this.itemWorldSceneFlowRuntime,
      restoreUiAfterDiveTransition: () => this.anvilDiveUiRuntime.restore(),
      hasLevel: (levelId) => !!this.loader.getLevel(levelId),
      loadLevel: (levelId, enterFrom) => {
        this.loadLevel(levelId, enterFrom);
      },
      setEntryItem: (item) => {
        this.itemWorldEntryState.item = item;
      },
      clearEntryItem: () => this.itemWorldEntryState.clearItem(),
      setInTunnel: (inTunnel) => {
        this.itemWorldEntryState.inTunnel = inTunnel;
      },
      getAnvilReturnLevelId: () => this.anvilReturnState.returnLevelId,
      getPreTunnelLevelId: () => this.itemWorldEntryState.preTunnelLevelId,
      clearPreTunnelLevelId: () => {
        this.itemWorldEntryState.preTunnelLevelId = null;
      },
      getFallbackLevelId: () => this.worldSpawnState.currentLevelId,
      setWorldVisualsReleased: (released) => {
        this.itemWorldEntryState.worldVisualsReleased = released;
      },
      resetEdgeTransition: () => this.edgeTransitionRuntime.reset(),
      placePlayerAtReturnPoint: () => this.anvilReturnFlowRuntime.placePlayerAtReturnPoint(),
      isFirstItemWorldBossDefeated: () => sacredSave.isFirstItemWorldBossDefeated(),
      getUnlockedEvents: () => this.unlockedEvents,
      showFirstItemWorldReturnInventoryHint: (hadFirstBossClear) => {
        this.inventoryTutorialHint.requestFirstItemWorldReturnHint(hadFirstBossClear);
      },
      fireWorldReturnDialogue: (weaponDefId) => this.worldEgoDialogueRuntime.fireWorldReturnDialogue(weaponDefId),
      retireAfterBossClear: (hadFirstBossClear) => {
        this.anvilRetirementRuntime.retireAfterBossClear(hadFirstBossClear);
      },
    });
    this.anvilItemWorldFlowRuntime = new WorldAnvilItemWorldFlowRuntime({
      itemWorldSceneFlow: this.itemWorldSceneFlowRuntime,
      fixedItemWorldFlow: this.fixedItemWorldFlowRuntime,
      getEntryItem: () => this.itemWorldEntryState.item,
      getPlayer: () => this.player,
      getCurrentLevelId: () => this.currentLevel?.identifier ?? null,
      setPreTunnelLevelId: (levelId) => {
        this.itemWorldEntryState.preTunnelLevelId = levelId;
      },
      setInTunnel: (inTunnel) => {
        this.itemWorldEntryState.inTunnel = inTunnel;
      },
      hideMinimap: () => {
        if (this.minimap) this.minimap.visible = false;
      },
      hasLevel: (levelId) => !!this.loader.getLevel(levelId),
      loadLevel: (levelId, enterFrom) => {
        this.loadLevel(levelId, enterFrom);
      },
      restoreUiAfterDiveTransition: () => this.anvilDiveUiRuntime.restore(),
      clearDamageNumbers: () => this.combatFeedbackRuntime.clearDamageNumbers(),
      isFirstItemWorldBossDefeated: () => sacredSave.isFirstItemWorldBossDefeated(),
      showToast: (message, color) => this.toast.show(message, color),
      fireWorldReturnDialogue: (weaponDefId) => this.worldEgoDialogueRuntime.fireWorldReturnDialogue(weaponDefId),
      retireAfterBossClear: (hadFirstBossClear) => {
        this.anvilRetirementRuntime.retireAfterBossClear(hadFirstBossClear);
      },
    });
    this.portalItemWorldFlowRuntime = new WorldPortalItemWorldFlowRuntime({
      portalEntryRuntime: this.portalEntryRuntime,
      fixedItemWorldFlow: this.fixedItemWorldFlowRuntime,
      itemWorldSceneFlow: this.itemWorldSceneFlowRuntime,
      getInventory: () => this.inventory,
      getPlayer: () => this.player,
      clearDamageNumbers: () => this.combatFeedbackRuntime.clearDamageNumbers(),
      showToast: (message, color) => this.toast.show(message, color),
      sacredPickupFlow: (item, x, y) => this.sacredPickupRuntime.startPickup(item, x, y),
      fireWorldReturnDialogue: (weaponDefId) => this.worldEgoDialogueRuntime.fireWorldReturnDialogue(weaponDefId),
      retireAfterBossClear: (hadFirstBossClear) => {
        this.anvilRetirementRuntime.retireAfterBossClear(hadFirstBossClear);
      },
    });
    this.itemWorldGrowthSnapshot = new ItemWorldGrowthSnapshotController({
      game: this.game,
      sceneContainer: this.container,
      getEntityLayer: () => this.entityLayer,
      getPlayer: () => this.player,
      getItem: () => this.itemWorldEntryState.item,
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
      getTargets: () => [
        this.game.backgroundContainer,
        this.renderer?.container,
        this.entityLayer,
        this.fluidLayer,
        this.deploymentFxLayer,
      ].filter((target): target is Container => !!target),
    });
    this.dungeonAtmosphereRuntime = new WorldDungeonAtmosphereRuntime({
      getParallaxContainer: () => this.parallaxBG?.container ?? null,
      getFilterTargets: () => [
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
        ...this.getBuilderAtmosphereTargets(),
      ].filter((target): target is Container => !!target),
      getBuilderInteriorTargets: () => this.builderLayerRuntime.getInteriorTargets(this.activeBuilder),
    });
    this.laserDesaturationRuntime = new WorldLaserDesaturationRuntime({
      getTargets: () => [
        this.game.backgroundContainer,
        this.renderer?.container,
        this.entityLayer,
        this.fluidLayer,
        ...this.getBuilderAtmosphereTargets(),
      ].filter((target): target is Container => !!target),
    });
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
      getCollisionGrid: () => this.collisionGrid,
      getEntityLayer: () => this.entityLayer,
      hideBossHp: () => this.hud.hideBossHP(),
    });
    this.worldEnemySpawnRuntime = new WorldEnemySpawnRuntime({
      getPlayer: () => this.player,
      getCollisionGrid: () => this.collisionGrid,
      getUnlockedEvents: () => this.unlockedEvents,
      addEnemy: (enemy) => this.worldEnemyRegistry.add(enemy, this.entityLayer),
      activateBossLock: (level, bossKey) => this.bossLockRuntime.activate(level, bossKey),
    });
    this.bossHpRuntime = new BossHpRuntime({
      getHud: () => this.hud,
      getEnemies: () => this.enemies,
      defaultBossName: 'GUARDIAN',
      isExtraEngaged: () => this.bossLockRuntime.isActive,
    });
    this.endingRuntime = new WorldEndingRuntime({
      game: this.game,
      getPlayer: () => this.player,
    });
    this.dialogueTriggerRuntime = new WorldDialogueTriggerRuntime({
      game: this.game,
      getPlayer: () => this.player,
      getLoreDisplay: () => this.loreDisplay,
      getUnlockedEvents: () => this.unlockedEvents,
    });
    this.worldEgoDialogueRuntime = new WorldEgoDialogueRuntime({
      getPlayer: () => this.player,
      getAnvil: () => this.anvil,
      getLoreDisplay: () => this.loreDisplay,
      getUnlockedEvents: () => this.unlockedEvents,
    });
    this.voidReturnRuntime = new WorldVoidReturnRuntime({
      game: this.game,
      getPlayer: () => this.player,
      getCollisionGrid: () => this.collisionGrid,
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
      getMinimapContainer: () => this.minimap,
      isInItemTunnel: () => this.itemWorldEntryState.inTunnel,
    });
    this.sacredPickupRuntime = new WorldSacredPickupRuntime({
      game: this.game,
      state: this.sacredPickupState,
      getPlayer: () => this.player,
      getEntityLayer: () => this.entityLayer,
      getUnlockedEvents: () => this.unlockedEvents,
      getItemDrops: () => this.worldItemDropRuntime.itemDrops,
      getLoreDisplay: () => this.loreDisplay,
      getLorePopup: () => this.lorePopup,
      getDivePreview: () => this.divePreview,
      acquireOverlayRuntime: this.acquireOverlayRuntime,
      resolveAnvilTarget: (fromX, fromY) => this.anvilReturnState.resolveTarget(this.anvil, this.currentLevel, fromX, fromY),
    });
    this.frozenReturnRuntime = new WorldFrozenReturnRuntime({
      game: this.game,
      proximity: this.proximity,
      getPlayerContainer: () => this.player?.container ?? null,
      getSnapshot: () => this.frozenSnapshotRuntime.snapshot,
      getUiSkin: () => this.uiSkin,
      getItem: () => this.itemWorldEntryState.item,
      restoreUi: () => this.anvilDiveUiRuntime.restore(),
      deactivateAtmosphere: () => this.itemDeploymentAtmosphereFlowRuntime.deactivateDungeonAtmosphere(),
      cancelDeploymentState: () => this.cancelFrozenReturnDeploymentState(),
      armDistancePx: FROZEN_RETURN_ARM_DISTANCE,
    });
    this.introHandoffRuntime = new WorldIntroHandoffRuntime({
      game: this.game,
      isInItemTunnel: () => this.itemWorldEntryState.inTunnel,
      setMinimapVisible: (visible) => {
        this.worldMinimap?.setVisible(visible);
      },
    });
    this.itemWorldGhostCollision = new ItemWorldGhostCollisionRuntime({
      getCollisionGrid: () => this.collisionGrid,
      setPlayerRoomData: (grid) => {
        this.player.roomData = grid;
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
      getItem: () => this.itemWorldEntryState.item,
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
      getCollisionGrid: () => this.collisionGrid,
      getRenderer: () => this.renderer,
      getActiveBuilder: () => this.activeBuilder,
      builderStampRuntime: this.builderStampRuntime,
      rerenderTilemap: () => this.rerenderTilemap(),
      tileSize: TILE_SIZE,
    });
    this.itemDeploymentTunnelFlowRuntime = new WorldItemDeploymentTunnelFlowRuntime({
      getAnvil: () => this.anvil,
      getPlayer: () => this.player,
      getCollisionGrid: () => this.collisionGrid,
      getLevelRightPx: (fallback) => this.currentLevel?.pxWid ?? fallback,
      getGrowthSnapshot: () => this.itemWorldGrowthSnapshot,
      getGhostStream: () => this.itemWorldGhostStream,
      getTunnelRuntime: () => this.itemDeploymentTunnelRuntime,
      getCollisionRuntime: () => this.itemDeploymentCollisionRuntime,
      setPendingGhostTunnelParams: (params) => {
        this.itemWorldEntryState.pendingGhostTunnelParams = params;
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
      getPendingGhostTunnelParams: () => this.itemWorldEntryState.pendingGhostTunnelParams,
      clearPendingGhostTunnelParams: () => {
        this.itemWorldEntryState.pendingGhostTunnelParams = null;
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
      onEnter: (portal) => this.enterPortal(portal),
    });
  }

  /**
   * Pattern D 근접 상호작용 우선순위:
   *   Altar(30) > Anvil(20) > SavePoint(10)
   * 핸들러는 `this.*` 를 closure 로 캡처해 등록한다.
   */
  private registerProximityHandlers(): void {
    const anvil: ProximityInteraction = {
      label: 'Anvil',
      priority: 20,
      canInteract: () => {
        if (!this.anvil || this.altarController.isSelectActive || !this.anvilInteractionRuntime.isPlayerNearAnvil()) return false;
        if (this.itemWorldEntryState.deployment?.isActive) return false;
        // Step 5 (2026-05-25): anvil 이 아이템을 들고 있으면 *항상 재진입 가능* 한 프롬프트(IW 재다이브 진입점)
        // 그 외에는 사용 여부를 따른다. retire(disabled)/used 면 비활성.
        if (this.anvil.hasItem()) return true;
        if (this.anvilInteractionRuntime.isPromptSuppressed) return false;
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

    // Fetch and parse LDtk project (multi-world — pick Overworld).
    // cache:'no-store' + cache-bust query 로 캐시된 옛 데이터(브라우저 / Vite / SW / proxy)
    // 를 우회해 항상 최신 .ldtk 를 받는다. prod 빌드에서도 동일 (init 1회).
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

    // ItemStratum levels — only used for ghost overlay preview (same JSON, different world filter)
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
      // 신규 세이브 (2026-05-03): Broken Sword 를 들고 시작. 인벤토리에 넣고 장착하면 Builder
      // 의 ItemDrop 픽업 컷신과 동일한 픽업 cutscene + "Open Inventory" hint
      // 흐름을 탄다 (sacredSave flags 를 set 하여 firstEver 픽업으로 처리).
      // IW 진입 전까지 인벤토리 키 hint (INVENTORY_KEY_AFTER_FIRST_IW_HINT_ID) 는
      // 첫 픽업 직후 인벤토리를 열도록 유도한다.
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

    // Parallax background — behind everything
    this.parallaxBG = new ParallaxBackground();
    this.game.backgroundContainer.addChild(this.parallaxBG.container);

    // LDtk renderer — tiles only, no entity markers in production
    this.renderer = new LdtkRenderer();
    this.container.addChild(this.renderer.container);
    this.solidifiedWallOverlay.attach(this.renderer.container);

    // Dead Cells-style palette swap filter — production default.
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

    // Fluid layer — entity layer 보다 뒤에 둬서 player/enemy 가 fluid 위에 그려져 보이게 한다.
    // 단 잔류 잉크는 더 뒤에 깔리도록 fluid 와 별개로 다룬다 (잔류는 별도 레이어).
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

    // Shift+I 충돌 디버그 오버레이 — 월드 셀/AABB 는 월드 레이어, 진단 라벨은 화면 레이어.
    // hud 는 app.stage 직속(FpsCounter 와 동일) — uiContainer.visible 토글(아이템계
    // 진입 anvil dive 등)에 영향받지 않고 항상 최상단에 또렷이 표시되도록.
    this.collisionDebug = new CollisionDebugOverlay(this.game.uiScale);
    this.container.addChild(this.collisionDebug.container);
    this.game.app.stage.addChild(this.collisionDebug.hud);

    // Updraft system (shared physics + particles)
    this.worldUpdraftRuntime.initialize(this.entityLayer);
    // Void fog particles (black mist rising from void tiles)
    this.voidFogRuntime.initialize(this.entityLayer);

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
    // Arc Tether — Spark 인첸트로 발동하는 전기 픽업 VFX. Player layer 위, entityLayer 에
    // 그대로 두되 player 진입 *뒤에* add (그래야 픽업 글로우가 player 위로 그려진다).
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

    // Fade overlay — on stage (camera-independent) so it always covers the full screen
    this.fadeOverlay = new Graphics();
    this.fadeOverlay.rect(0, 0, GAME_WIDTH, GAME_HEIGHT).fill(0x000000);
    this.fadeOverlay.alpha = 0;
    this.game.legacyUIContainer.addChild(this.fadeOverlay);

    this.itemWorldReturnFade = new ItemWorldReturnFadeRuntime(this.game);

    // HUD
    this.hud = new HUD(this.game.uiScale);
    this.hud.setDebugInfoVisible(Debug.infoVisible);
    this.game.uiContainer.addChild(this.hud.container);
    this.introHandoffRuntime.bindHud(this.hud);
    this.introHandoffRuntime.applyInitialHudGate(startHidden && !saveData);

    // Area title banner — Elden Ring style. Rides on legacyUIContainer so it
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
        console.warn('[UISkin] load failed — falling back to Graphics HUD:', e);
      });

    // Toast, damage numbers, hit sparks, screen flash
    this.toast = new ToastManager(this.game.legacyUIContainer);
    this.anvilPrompts = new AnvilPromptController(this.game);
    this.anvilCyclePrompt = new AnvilCyclePromptRuntime({
      game: this.game,
      showToast: (message, color) => this.toast.show(message, color),
      placeItem: (item) => this.anvilItemRuntime.placeItem(item),
      refreshAnvilInventory: () => this.inventoryUI.refresh(),
      reopenAltarSelect: () => this.altarController.drawItemSelectUI('Offer item to altar:', 0xaaccff),
      isAnvilInventoryOpen: () => this.inventoryUI.visible && this.inventoryUI.isAnvilMode(),
    });
    this.altarController = new WorldAltarController({
      game: this.game,
      player: this.player,
      inventory: () => this.inventory,
      toast: this.toast,
      entityLayer: this.entityLayer,
      spawnPortal: (x, y, rarity, sourceType, item) => this.spawnPortal(x, y, rarity, sourceType, item),
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
    // Fluid evaporation — drop permanent residue on the floor cell.
    this.fluidSystem.onEvaporated = (gx, gy, type) => {
      if (type !== 'oil' && type !== 'acid' && type !== 'magma') return;
      const px = (gx + 0.5) * 16;
      const py = (gy + 1) * 16;        // bottom of cell
      this.fluidResidue.dropAt(type, px, py, 1.0);
    };

    // ── Arc Scan Cycle (R-NEW-031 v2): 원점에서 반경 내 엔티티/타일을 스캔해 아크 링크를 만든다. ──
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
    // (magma+ice melt, acid+magma vapor). Convert cell coords — pixel.
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
    // R-NEW-001 Exothermic Steam: acid+water 가 만나면 발열 증기 — horizontal + vertical
    // burst. Horizontal 24px, vertical 64px 규모.
    this.tileMutator.onAcidSteamBurst = (gx, gy) => {
      const cx = (gx + 0.5) * 16;
      const cy = (gy + 0.5) * 16;
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
        this.solidifiedWallOverlay.addCell(gx, gy, this.collisionGrid);
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
      savepointPulse: this.savepointPulse,
      onSave: () => this.worldSaveRuntime.save(),
    });

    // Pause menu (9-slice from UISkin) — uiContainer(native) 자식 (UI native 1배 스케일).
    // input 콜백으로 SELECT KEYBOARD 등 입력 preset 을 받는다.
    this.pauseMenu = new PauseMenu(this.uiSkin, this.game.uiScale, this.game.input, this.game);
    this.pauseMenu.onAction = (action) => {
      if (action === 'status') { this.openCharacterStats(); }
      else if (action === 'quit_confirmed') {
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
      this.loadLevel(this.worldSpawnState.currentLevelId, 'down');
      this.player.hp = this.player.maxHp;
    };
    this.game.uiContainer.addChild(this.deathScreen.container);

    // Tutorial hints — restore "already-seen" ids from save so loaded games
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
    });
    this.inventoryTutorialHint = new InventoryTutorialHintRuntime({
      tutorialHint: this.tutorialHint,
      getInventory: () => this.inventory,
      hud: this.hud,
      getUnlockedEvents: () => this.unlockedEvents,
      getRetireAfterFirstBoss: () => this.anvilReturnState.retireAfterFirstBoss,
      hasBlockingAnvilItem: () => !!(this.anvil?.hasItem() || this.anvilReturnState.hasItem),
    });

    // Inventory UI — uiContainer(native) 자식. InventoryUI 내부에서 scale.set(uiScale)
    // 하므로 640 기준 레이아웃이 화면에 맞게 스케일된다 (UI native 컨테이너는 스케일 1배).
    this.inventoryUI = new InventoryUI(this.inventory, this.game.uiScale);
    this.inventoryUI.setSkin(this.uiSkin!);
    this.game.uiContainer.addChild(this.inventoryUI.container);
    // 인벤토리 열림/닫힘에 맞춰 Anvil UI 처럼 HUD + minimap 토글 (신규 추가 2026-05-24).
    this.inventoryUI.onVisibilityChange = (vis: boolean) => {
      this.hud.container.visible = !vis;
      if (this.minimap) this.minimap.visible = !vis;
    };

    // DEC-046 Identity Archive — 인벤토리와 별도. JUMP 키로 연다.
    this.identityArchive = new IdentityArchive(this.inventory, this.uiSkin, this.game.uiScale);
    this.game.uiContainer.addChild(this.identityArchive.container);

    // Sacred Pickup — LorePopup + DivePreview + LoreDisplay 모두 uiContainer(native) 자식 (UI native 1배 스케일).
    this.lorePopup = new LorePopup(this.uiSkin, this.game.uiScale);
    this.game.uiContainer.addChild(this.lorePopup.container);
    this.loreDisplay = new LoreDisplay(this.game.input, this.game.uiScale);
    this.game.uiContainer.addChild(this.loreDisplay.container);
    this.divePreview = new DivePreview(this.uiSkin, this.game.uiScale);
    this.game.uiContainer.addChild(this.divePreview.container);

    // AcquireOverlay — relic / max HP+ ceremonial modal (vignette only, no panel box).
    this.acquireOverlayRuntime.attach();

    this.worldMapRuntime = new WorldMapRuntime({
      loader: this.loader,
      skin: this.uiSkin,
      uiScale: this.game.uiScale,
      getVisitedLevels: () => this.visitedLevels,
      getCurrentLevel: () => this.currentLevel ?? null,
      getPlayer: () => this.player,
      getActiveBuilder: () => this.activeBuilder,
    });
    this.game.uiContainer.addChild(this.worldMap.container);
    this.worldMinimap = new WorldMinimapRuntime({
      game: this.game,
      loader: this.loader,
      getCurrentLevel: () => this.currentLevel ?? null,
      getPlayer: () => this.player,
      getVisitedLevels: () => this.visitedLevels,
      getClearedLevels: () => this.clearedLevels,
      getEnemies: () => this.enemies,
      getActiveBuilder: () => this.activeBuilder,
      isIntroHidden: () => this.introHandoffRuntime.isMinimapIntroHidden,
    });
    this.gameOverRuntime = new WorldGameOverRuntime({
      game: this.game,
      hud: this.hud,
      getMinimap: () => this.minimap,
      onRespawn: () => this.respawnPlayer(),
    });
    this.debugWarpRuntime = new WorldDebugWarpRuntime({
      game: this.game,
      toast: this.toast,
      worldMapRuntime: this.worldMapRuntime,
      getCurrentLevel: () => this.currentLevel ?? null,
      getPlayer: () => this.player,
      isInItemTunnel: () => this.itemWorldEntryState.inTunnel,
      isGameOverActive: () => this.gameOverRuntime.isActive,
      reviveFromGameOver: () => this.reviveFromGameOver(),
      loadLevel: (roomId) => { this.loadLevel(roomId, 'down'); },
      setHudVisible: (visible) => { this.hud.container.visible = visible; },
      setMinimapVisible: (visible) => { this.worldMinimap.setVisible(visible); },
    });

    this.transitionController = new WorldTransitionController();
    this.worldPlayerSpawnRuntime = new WorldPlayerSpawnRuntime({
      transitionController: this.transitionController,
      getPlayer: () => this.player,
      getCollisionGrid: () => this.collisionGrid,
      getPendingPlayerTileX: () => this.edgeTransitionRuntime.pendingPlayerTileX,
      getPendingPlayerTileY: () => this.edgeTransitionRuntime.pendingPlayerTileY,
      recordSafePosition: (x, y) => this.voidRuntime.recordSafePosition(x, y),
    });
    this.edgeTransitionFlowRuntime = new WorldEdgeTransitionFlowRuntime({
      loader: this.loader,
      transitionController: this.transitionController,
      edgeTransitionRuntime: this.edgeTransitionRuntime,
      getPlayer: () => this.player,
      getCurrentLevel: () => this.currentLevel ?? null,
      getCollisionGrid: () => this.collisionGrid,
      getEntryItem: () => this.itemWorldEntryState.item,
      isDeploymentActive: () => !!this.itemWorldEntryState.deployment?.isActive,
      isInTunnel: () => this.itemWorldEntryState.inTunnel,
      isEntryTransitionActive: () => this.itemWorldEntryTransition.isActive,
      isDebugMode: () => LdtkWorldScene.debugMode,
      prestreamItemWorldEntry: (item, reason) => this.itemWorldSceneFlowRuntime.prestream(item, reason),
      enterItemWorld: (entryCorridor) => {
        this.anvilItemWorldFlowRuntime.enterFromTunnel({ entryCorridor });
      },
      loadLevelForTransition: (levelId, enterFrom) => {
        const prevCamX = this.game.camera.renderX;
        const prevCamY = this.game.camera.renderY;
        this.loadLevel(levelId, enterFrom);
        this.parallaxBG.onRoomTransition(prevCamX, prevCamY, this.game.camera.renderX, this.game.camera.renderY);
        this.player.savePrevPosition();
        for (const e of this.enemies) e.savePrevPosition();
      },
    });
    this.worldSpawnState = new WorldSpawnState({
      loader: this.loader,
      transitionController: this.transitionController,
      fallbackLevelId: FALLBACK_ENTRANCE_LEVEL,
      isDebugMode: () => LdtkWorldScene.debugMode,
    });
    this.uiController = new WorldUiController(this.game, {
      hud: this.hud,
      pauseMenu: this.pauseMenu,
      deathScreen: this.deathScreen,
      tutorialHint: this.tutorialHint,
      inventoryUI: this.inventoryUI,
      identityArchive: this.identityArchive,
      worldMap: this.worldMap,
      toast: this.toast,
      getMinimap: () => this.minimap,
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

    // Tier 3 ambient bed demo (Plan_Audio_Demo 筌?-1 #1A + #1C, DEC-040 筌?3-2.4 嶺뚯쉳?닺뜎?
    AmbientLayer.startWorldTier3Demo();

    // Controls guidance handled by tutorialHint.tryShow('hint_combat') in
    // update() — fires once per session with auto-dismiss. No unconditional
    // toast here so returning from item world doesn't re-spam controls.
  }

  enter(): void {
    this.container.visible = true;
    if (this.parallaxBG) this.parallaxBG.container.visible = true;
    this.reattachPersistentUi();
    // 월드 BGM — intro 1회 후 loop. 5초 fade-in 으로 부드럽게 전환된다.
    // ItemWorld 등에서 pop 으로 돌아오면 BgmController 가 이미 같은 trackKey 라
    // no-op 이므로 재생이 끊기지 않는다.
    BgmController.play(
      'mus_world_main',
      { intro: 'mus_world_main_intro', loop: 'mus_world_main_loop' },
      { fadeInMs: 5000 },
    );
    // Area banner is triggered from loadLevel on Shaft_01 entry (not here).
    // On pop return from sub-scenes (ItemWorld) the current level is still
    // the one the player left from, so no banner replay is needed.
    this.uiController.enter({
      showMinimap: !this.itemWorldEntryState.inTunnel,
      goldBelowMinimap: !this.itemWorldEntryState.inTunnel,
      playerHp: this.player.hp,
      playerMaxHp: this.player.maxHp,
      highlightItemKey:
        this.unlockedEvents.has('__itemWorldTutorialDone')
        && !this.unlockedEvents.has('__itemKeyPressedAfterItemWorld'),
    });
    this.introHandoffRuntime.hideHudForIntroIfNeeded();
    if (!this.currentLevel) return; // first init — loadLevel handles setup

    if (this.itemWorldEntryState.worldVisualsReleased) {
      const levelId = this.currentLevel.identifier;
      const px = this.player.x;
      const py = this.player.y;
      this.itemWorldEntryState.worldVisualsReleased = false;
      // Step 4/5 (2026-05-25): loadLevel 의 spawnAnvilFromLdtk 가 새 Anvil 을 생성하므로
      // 그 전에 placedItem sprite 를 복원해 둔다. 아이템 + 진입점 복원 (disabled bypass).
      const preservedAnvilItem = this.anvilReturnState.getPreservedItem(this.anvil, this.itemWorldEntryState.item);
      this.loadLevel(levelId, 'down');
      if (preservedAnvilItem && this.anvil) {
        const wasDisabled = this.anvil.disabled;
        this.anvil.disabled = false;
        this.anvil.placeItem(preservedAnvilItem);
        this.anvil.used = false;
        this.anvil.disabled = wasDisabled;
      }
      this.player.x = px;
      this.player.y = py;
      this.player.vx = 0;
      this.player.vy = 0;
      this.player.roomData = this.collisionGrid;
      this.player.savePrevPosition();
      this.worldPlayerStatRuntime.sync();
      this.game.camera.snap(
        this.player.x + this.player.width / 2,
        this.player.y + this.player.height / 2,
      );
      return;
    }

    // Re-sync collision grid and tilemap (deep copy to restore original state)
    this.collisionGridRuntime.cloneFrom(this.currentLevel.collisionGrid);
    this.player.roomData = this.collisionGrid;
    this.solidifiedWallOverlay.clear();
    this.rerenderTilemap();

    this.worldPlayerStatRuntime.sync();
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
    // 미니맵도 hide. detachForItemWorld 가 월드 공유 UI 를 떼지만, 미니맵은 별도로 다뤄야
    // 하므로 visible=true 인 채로 두면 attach 복원 시점에 어긋나므로 여기서 명시적으로 detach.
    this.worldMinimap.detach();
    this.altarController.destroyUi();
  }

  private releaseWorldVisualsForItemWorld(): void {
    // iPad Safari can reload the page when the hidden overworld and the
    // procedural ItemWorld are both resident. Once the dive transition has
    // fully covered the screen, drop render-only overworld resources; return
    // flow calls loadLevel(), which rebuilds these layers from LDtk data.
    this.clearBuilder();
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
    this.itemWorldEntryState.worldVisualsReleased = true;
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
    // Guard: init() is async — game loop may call update() before it completes
    if (!this.initialized || !this.currentLevel) return;

    this.deployBlurRuntime.update(dt, this.itemWorldEntryState.deployment?.isGrowing ?? false);

    // Feedback panel open — block scene update but keep toasts animating.
    if (this.game.feedbackOpen) {
      this.toast?.update(dt);
      return;
    }

    this.introHandoffRuntime.update(dt);

    if (this.endingRuntime.update(dt)) return;

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

    // TAB key — open character stats (same pattern as I=inventory, M=map)
    if (this.game.input.isJustPressed(GameAction.STATUS)) {
      this.game.input.consumeJustPressed(GameAction.STATUS);
      this.openCharacterStats();
      return;
    }

    // Debug warp must remain reachable from death/game-over UI, which can
    // early-return through handlePauseAndDeath before normal gameplay input.
    if (this.deathScreen?.visible || this.gameOverRuntime.isActive) {
      this.debugWarpRuntime.update();
    }

    const pauseOrDeath = this.uiController.handlePauseAndDeath({
      dt,
      canOpenPause: !this.inventoryUI.visible && !this.worldMap.visible && !(this.lorePopup as any)?.visible && !this.acquireOverlayRuntime.isBlocking,
    });
    if (pauseOrDeath !== 'none') {
      return;
    }

    // Dialogue / Lore display — blocks gameplay while active
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

    // Tutorial hints — only show after dialogue finishes
    if (this.currentLevel?.identifier === this.worldSpawnState.currentLevelId) {
      // hint removed — key prompts shown in HUD
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
    if (this.itemWorldEntryState.deployment?.isBlocking) {
      this.itemWorldEntryState.deployment.update(dt);
      this.anvil?.update(dt);
      this.player.vx = 0;
      this.player.vy = 0;
      this.player.savePrevPosition();
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
    //   Shift+M  — 월드맵 위에서 + 방향키로 월드맵 디버그 워프
    //   Backtick — 정체성 디버그 워프 (개발용 빠른 이동)
    this.debugWarpRuntime.update();

    // World Map toggle (M key) — disabled inside item tunnels.
    // Shift+M 은 위 handleDebugWarp 가 먼저 consume 하므로 일반 M 토글과 충돌하지 않는다.
    this.uiController.handleWorldMapToggle({
      canToggle: !this.itemWorldEntryState.inTunnel,
      onBeforeOpen: () => {
        this.worldMapRuntime.syncForOpen();
      },
    });
    if (this.worldMap.visible && this.currentLevel) {
      this.anvilInteractionRuntime.hidePrompts();
      this.worldMapRuntime.syncDynamicGrids();
      this.uiController.updateWorldMap({
        dt,
        playerWorldX: this.player.x + this.currentLevel.worldX,
        playerWorldY: this.player.y + this.currentLevel.worldY,
      });
    }

    // 신규 추가 (2026-05-03): 첫 IW 보스 전까지 인벤토리 진입을 막아 INVENTORY
    // 키를 누르면 Rustborn 진입 전이면 Ego 대사 또는 'Locked' 토스트를 띄운다.
    // shiftDown / inItemTunnel 일 때는 이 차단을 건너뛴다 (debug / 자식 씬 보호).
    if (
      !sacredSave.isFirstItemWorldBossDefeated() &&
      !this.itemWorldEntryState.inTunnel &&
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

    // Inventory UI toggle — disabled inside item tunnels, Shift+I is debug
    this.uiController.handleInventoryToggle({
      canToggle: !this.itemWorldEntryState.inTunnel && !this.game.input.shiftDown && sacredSave.isFirstItemWorldBossDefeated(),
      onToggled: () => {
        // Broken Sword 픽업 직후 인벤토리에서 "들고 있는 것을 장착" 하라는 흐름을 안내한다.
        // 인벤토리를 처음 여는 단계라 I 키 입력을 추적해 픽업 직후 흐름인지 판단한다.
        // 첫 다이브 전까지 들고 있는 무기를 장착하도록 인벤토리 진입을 유도한다.
        if (!sacredSave.isFirstPickupDone()) return;
        this.unlockedEvents.add('__itemKeyPressedAfterItemWorld');
        this.hud.setItemKeyHighlight(false);
        // 2026-05-18: tutorialHint.dismiss 는 *Rustborn 장비를 실제로 equip 했을 때*만 호출.
        // 아니면 멈춘다. I 키 입력만으로 인벤토리 진입했다면 토글 닫힘이라 픽업 흐름은 유지한다.
        // 첫 장착 전까지 HUD pulse 를 유지하므로 hint 를 임의로 끄지 않는다.
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
        // 2026-05-18: 인벤토리 hint 는 *Rustborn 장비를 실제로 장착한 직후*에만 dismiss.
        // 그 외에는 무기 교체만으로는 끄지 않으므로 토글 닫힘과 무관하게 hint 가 유지된다.
        // "Rustborn 장착" 이 핵심 조건이므로 그 외 무기로는 끄지 않는다.
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
      this.player.savePrevPosition();
      for (const e of this.enemies) e.savePrevPosition();
      return;
    }

    // Pattern D (proximity-interaction): 근접 상호작용 우선순위 처리.
    // 먼저 player.update() 전에 세이브 큐 등 근접 프롬프트를 갱신하고
    // 근접 상호작용은 registerProximityHandlers() 에서 등록한다.
    this.savePointRuntime.updateQueuedSave(dt);

    this.frozenReturnRuntime.updatePrompt();
    if (this.proximity.tryInteract(this.game.input)) return;

    // Giant Builder — moving platform pattern.
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
        this.builderStampRuntime.restamp(this.activeBuilder, this.collisionGrid);
      }
      this.syncBuilderAttachments();
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
          setEntranceGlowAlpha: (alpha) => this.setBuilderEntranceGlowAlpha(alpha),
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
    // 빌더 위에 있으면 playerOnBuilder 와 onCarrier 를 갱신해 캐리어
    // grounding 과 lastSafeX/Y 처리를 일관되게 한다.
    // 1차 수정 시도 (2026-05-24): 매 프레임 빌더 위에서 onCarrier 가
    // false 면 lastSafe 를 *현재 cell* 로 잡으려다, 빌더가 진입한 직후 빈 칸
    // 위를 밟는 순간 잘못된 safe 위치가 잡히는 문제가 있었음. 이번 update 에서 lastSafe 를 보존해
    // post-snap 단계에서도 *직전 값*을 유지, playerOnBuilder=true 면 되돌린다.
    const wasPlayerOnBuilder = this.builderPlayerStateRuntime.beginPlayerUpdate(this.player);
    const preUpdateLastSafeX = this.player.lastSafeX;
    const preUpdateLastSafeY = this.player.lastSafeY;
    if (this.worldContainerPhysicsRuntime.isPlayerStandingOnTop()) {
      this.player.forceGrounded(true, 'container');
    }
    this.player.update(dt);
    this.worldDoorSwitchInteractionRuntime.resolvePlayerCollision();
    this.builderPlayerStateRuntime.update(dt);

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
      this.activeBuilder ? (snappedToBuilder || this.builderStampRuntime.isPlayerOnStamp(this.player, this.collisionGrid)) : false,
    );
    // 직전 safe 값을 유지한다. 빌더 위에 머무는 동안 player.update 가 잡은
    // lastSafeX/Y(=현재 cell)로 덮어쓰면, 빌더 밖 world 를 밟지 않은 채 safe ground
    // 로 오인해 void 진입 시 잘못된 world 위치로 복귀하므로 grounded 판정을 보정한다.
    if (this.builderPlayerStateRuntime.isOnBuilder) {
      this.player.lastSafeX = preUpdateLastSafeX;
      this.player.lastSafeY = preUpdateLastSafeY;
    }

    // Volume check: is the player's AABB inside the builder's rectangle?
    // (includes airborne — used for camera override that must persist on jump.)
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
    // exactly what WorldBuilderStampRuntime.stamp() sees — the player visual steps in lockstep
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
      this.screenFlash.flashDamage(true);
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

    // Update enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      const wasAlive = enemy.alive;
      enemy.update(dt);

      // Track which enemies were alive before combat resolution
      if (wasAlive && !enemy.alive) {
        // died during enemy.update() (e.g. DOT) — handle drop now
        this.worldEnemyKillRuntime.handle(enemy);
      }

      if (enemy.shouldRemove) {
        this.worldEnemyRegistry.removeAt(i);
      }
    }

    // Player attacks — Sakurai full feedback chain
    if (this.player.isAttackActive()) {
      // Locked door 는 player 와 enemy 사이를 막으므로 hit 대상에서 빼고 attack 이 door 를 관통하지 않게 한다.
      const targets = this.enemies
        .filter((e) => e.alive)
        .filter((e) => !this.worldDoorSwitchInteractionRuntime.isAttackBlocked(e)) as CombatEntity[];
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
        if (hit.heavy) {
          this.screenFlash.flashHit(true);
        }
      }
      // Check kills after combat resolution
      for (const enemy of this.enemies) {
        if (!enemy.alive && !enemy.shouldRemove && !isEnemyKillHandled(enemy)) {
          markEnemyKillHandled(enemy);
          this.worldEnemyKillRuntime.handle(enemy);
        }
      }
    }

    this.worldProjectileRuntime.update(dt);

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
    this.worldBreakablePropRuntime.update(dt);
    // 핸드 플레이스 Breakable (LDtk Entity).
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
      if (!this.clearedLevels.has(id)) {
        this.clearedLevels.add(id);
      }
    }

    // Dialogue / Lore triggers
    this.dialogueTriggerRuntime.update(dt);

    // ── Ego dialogue triggers (code-driven, not LDtk) ──
    this.worldEgoDialogueRuntime.update(dt);

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

    // Elemental tile hazards (magma 鸚?charged 鸚?acid 鸚?fire 鸚?thunder 鸚?burn)
    // GDD: Documents/System/System_World_TileSystem.md 筌?.6-2.13
    this.tickTileHazards(dt);

    // Updraft wind zones
    this.worldUpdraftRuntime.update({
      dt,
      player: this.player,
      baseGrid: this.player.roomData,
      camera: this.game.camera,
      activeBuilder: this.activeBuilder,
    });

    // Void fog particles (visual only)
    this.voidFogRuntime.update(dt, this.collisionGrid, this.game.camera);

    this.exitGlowRuntime.update(dt);

    // Save point interaction — UP key near save point
    this.savePointRuntime.updateProximity(this.itemWorldEntryState.deployment?.isActive ?? false);

    // Shift+P 디버그 워프는 Game.ts 측에서 먼저 처리하므로 여기서는 다루지 않는다.

    // Shift+I 디버그 UI 토글은 Game.ts 에서 먼저 처리하므로 INVENTORY 를 미리 consume 하여
    // 인벤토리 진입과 충돌하지 않게 한다.

    // Debug commands — only active with ?debug=1 in URL
    if (new URLSearchParams(window.location.search).has('debug')) {
      // Shift+O — unified cheat toggle. ON: all relic abilities, maxHp/atk
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
      // Digit 1/2/3 (without shift) — switch active enchant (Hades-style Boon swap).
      if (!this.game.input.shiftDown) {
        if (this.game.input.isJustPressed(GameAction.DEBUG_FIRE))    this.player.activeEnchant = 'fire';
        else if (this.game.input.isJustPressed(GameAction.DEBUG_ICE))    this.player.activeEnchant = 'ice';
        else if (this.game.input.isJustPressed(GameAction.DEBUG_THUNDER)) this.player.activeEnchant = 'thunder';
      }
      // Shift+G — spawn 4 debug containers near player (until LDtk Entity wiring lands).
      if (this.game.input.shiftDown && this.game.input.isJustPressedKeyCode('KeyG')) {
        this.worldContainerSpawnRuntime.debugSpawnNear(this.player.x, this.player.y);
      }
    }

    this.worldEgoShardCastRuntime.update(dt);

    // ── Grab / Throw (B / RB) — Arc Tether 로 끌어당기는 픽업 + Spelunky 식 들기 ──
    // 동작 순서:
    //   1) GRAB 입력 시 findNearestGrabbableContainer (facing 콘, 6칸)
    //   2) 찾으면 startGrabPull : pickUp() 으로 든다 (held=true 면 no gravity)
    //      + pullingContainer 지정 + arcTether.startPull(boosted)
    //   3) 200ms 동안 끌어당김 — ease-out 진입 (그 동안 held 가 유지된다)
    //   4) 진입 끝나면 pullingContainer=null, arcTether 의 hold 를 끊는다.
    // 그래서 멀리 있는 컨테이너도 pull 시점에 자연스럽게 손에 들어오게 한다.
    this.worldContainerCarryRuntime.update({
      dtMs: dt,
      game: this.game,
      player: this.player,
      findTarget: () => findNearestContainerForGrab({
        player: this.player,
        containers: this.containers,
        input: this.game.input,
      }),
      promptText: t('prompt.lift'),
    });

    // Portal interactions
    this.portalRuntime.update(dt);

    this.endingRuntime.checkTrigger();

    // Room transition detection — edge-based
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
    this.hud.setFloorText(this.currentLevel?.identifier ?? '');
    this.areaTitle.update(dt);

    // Hide minimap + adjust gold in item tunnel
    if (this.itemWorldEntryState.inTunnel) this.worldMinimap.setVisible(false);
    this.hud.setGoldBelowMinimap(!this.itemWorldEntryState.inTunnel && this.worldMinimap.isVisible);

    // Minimap: real-time dot tracking + blink + combat opacity
    this.worldMinimap.update(dt);

    // Damage numbers & Sakurai hit effects
    this.combatFeedbackRuntime.update(dt);

    // Movement VFX (consume player one-shot events + trail updates)
    this.updateMovementVfx(dt);

    // ItemDeployment cinematic-state update: growth, player pull, and final handoff fade.
    this.itemWorldEntryState.deployment?.update(dt);
    this.itemWorldGrowthSnapshot.update(dt);
    this.itemWorldGhostStream.update(dt, () => this.itemWorldEntryState.deployment?.releaseItemBirthPieces());

    this.frozenSnapshotRuntime.update(this.player);

    this.frozenReturnRuntime.updateConfirmInput();

    // Camera — deadzone follow + zoom lerp. Player is always in world coords.
    // While riding the builder, include visualYOffset so the camera tracks the
    // player's *visual* position. Without this, the physics +16 tile crossing
    // jump (see builder update above) propagates to the camera target and
    // causes a "튀는" rocking as the camera snaps to each crossing.
    //
    // The offset is rounded to an integer pixel: a fractional target would
    // make the rounded camera renderY oscillate near .5 boundaries every
    // frame, producing a rapid 1px "지터" shake. Tile-crossing cancellation
    // still works because the offset is symmetric (~+8 — ~-8 at crossing).
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

    // Parallax background scroll — frozen while dungeon atmosphere is active
    if (!this.dungeonAtmosphereRuntime.isActive) {
      this.parallaxBG.updateScroll(cam.renderX, cam.renderY);
    }

    // Oxygen overlay — vignette + bar when submerged
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
      this.dropThroughDust.spawn(p.x + p.width / 2, p.y + p.height, p.width * 0.9);
      // ── 첫 drop-through 직후엔 관련 hint 를 잠깐 보여주고 1초 뒤 fade,
      // 이후에는 handled flag 를 set.
      this.worldTutorialHints.handleDropThroughEvent();
    }
    // Ice skid streak
    this.iceSkidStreak.emit(dt, p.isStandingOnIce(), p.x + p.width / 2, p.y + p.height, p.getVx());

    this.worldFluidFeedbackRuntime.updateEnemies(dt);

    // --- Batch C ---
    // Player hit blood spray
    const hitDir = p.consumePlayerHitEvent();
    if (hitDir !== null) {
      this.hitBloodSpray.spawn(p.x + p.width / 2, p.y + p.height * 0.4, hitDir);
    }

    // Tick all particle managers
    this.movementVfxRuntime.updateCharacterFeedback(dt);
    this.fluidResidue.update(dt);
    this.waterBubbles.update(dt);
    // ── Maintained spawners: refill when live count drops below minCount ──
    this.maintainedContainerSpawnerRuntime.update(dt);
    this.worldContainerPhysicsRuntime.update(dt);

    this.worldEgoShardProjectileRuntime.update(dt);
    // FluidSpawner tick — injects fluid cells before the gravity pass so
    // newly-spawned cells immediately begin falling this frame.
    this.fluidSpawners.update(dt, this.collisionGrid, this.fluidSystem);
    this.fluidSystem.update(dt);
    // Cellular gravity — water cells fall + spread to merge after mutations
    // (fire on water creates holes; gravity refills them from above).
    this.fluidSystem.gravityTick(this.collisionGrid, dt, this.tileMutator);
    this.fluidSpawners.pressureDrain(this.collisionGrid, this.fluidSystem);
    this.fluidCrestFoam.update(dt, this.fluidSpawners.getActiveSegments(this.collisionGrid));
    this.movementVfxRuntime.updateLate(dt);
    this.pickupVfxRuntime.update(dt);
    const hpRatio = this.player.maxHp > 0 ? this.player.hp / this.player.maxHp : 0;
    this.statusFeedbackRuntime.update(dt, hpRatio);
  }

  render(alpha: number): void {
    if (!this.initialized) return;
    // During post-transition snap, disable interpolation to prevent 1-frame jitter
    const a = this.cameraInputRuntime.resolveRenderAlpha(alpha);
    this.player.render(a);
    for (const enemy of this.enemies) enemy.render(a);
    // Portals and altars are static, no interpolation needed
    const p = this.player;
    const colOffX = (p.width - p.collisionW) / 2;
    const colOffY = p.height - p.collisionH;
    // 이동 빌더가 활성이면 그 자체 충돌 그리드도 넘겨 'builder-surface' 바닥을 시각화.
    const b = this.activeBuilder;
    const builderGrid = b ? {
      grid: b.collisionGrid,
      originTileX: Math.round(b.container.x / 16),
      originTileY: Math.round(b.container.y / 16),
    } : undefined;
    this.collisionDebug.update(this.collisionGrid, this.game.camera, {
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
    // (Previously: M/I 를 열어둔 채 씬을 전환하면 overlay 가 legacyUIContainer
    //  에 남아 ItemWorldScene 위로 "stuck" 상태로 떠 있었다.)
    this.altarController.destroyUi();
    this.deployBlurRuntime.clear();
    this.dialogueTriggerRuntime.clear();
    // 백그라운드로 내려가는 동안 진단 라벨이 화면에 잔류하지 않도록 숨김.
    if (this.collisionDebug) this.collisionDebug.hud.visible = false;
    this.oxygenOverlay.hide();
    this.itemWorldTransitionRuntime.destroy();
    this.portalRuntime.clear();
    this.portalEntryRuntime.clear();
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
    this.dialogueTriggerRuntime.clear();
    this.worldWeatherRuntime.destroy();
    this.worldUpdraftRuntime.destroy();
    this.voidFogRuntime.destroy();
    this.anvilDiveUiRuntime.restore();
    this.clearBuilder();
    this.parallaxBG?.destroy();
    this.combatFeedbackRuntime.clearDamageNumbers();
    this.deployBlurRuntime.destroy();
    this.renderer?.destroy();
    // hud 는 game.uiContainer(씬 외부) 자식이라 super.destroy() 가 정리하지 않음 — 직접 해제.
    this.collisionDebug?.hud.destroy({ children: true });
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
    this.clearBuilder();

    this.currentLevel = level;
    this.visitedLevels.add(level.identifier);

    // Collision grid — deep copy so runtime modifications don't persist across reloads
    this.collisionGridRuntime.cloneFrom(level.collisionGrid);

    // Reset elemental tile overlays + burnable entities — frozen timers and
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
    // 보스 HP 바를 숨긴다. 새 방 진입 시 이전 방의 보스 락 상태를 끄고
    // 이후 진입한 방에서 activateBossLock 이 update 로 다시 켜도록 한다.
    this.hud.hideBossHP();

    // Render tiles — filter wall tiles by collision grid (destroyed tiles stay gone).
    // value=2 (water) 인 셀의 sprite 는 dynamic FluidSystem 이 그리므로 정적 렌더에서 건너뛴다.
    this.renderer.clear();
    const filteredWalls = level.wallTiles.filter(t => {
      const col = Math.floor(t.px[0] / TILE_SIZE);
      const row = Math.floor(t.px[1] / TILE_SIZE);
      const v = this.collisionGrid[row]?.[col] ?? 0;
      if (isLdtkWallSlope2x1Tile(t)) return true;
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
      collisionGrid: this.collisionGrid,
    });
    this.terrainPaletteRuntime.applyWorldFilterAreas(level.pxWid, level.pxHei, this.renderer, this.proceduralDecorRuntime);

    // Procedural decorations (always on; ?noproc to disable, ?theme=X for testing)
    if (!new URLSearchParams(window.location.search).has('noproc')) {
      const procDecorator = this.proceduralDecorRuntime.preparePrimary();
      // Only apply theme if explicitly requested via URL (?theme=T-FOUNDRY)
      const themeParam = new URLSearchParams(window.location.search).get('theme');
      if (themeParam) procDecorator.setTheme(themeParam);
      procDecorator.clear();
      this.grassFireRuntime.clearGrass();
      procDecorator.generate(this.collisionGrid, hashString(level.identifier));
      for (const prop of this.grassFireRuntime.registerProceduralClumps(procDecorator.getGrassClumpsWithCells())) {
        this.tileMutator.registerBurnable(prop);
      }
      if (this.terrainPaletteRuntime.applyProceduralDecorFilters(this.proceduralDecorRuntime)) {
        this.terrainPaletteRuntime.applyWorldFilterAreas(level.pxWid, level.pxHei, this.renderer, this.proceduralDecorRuntime);
      }
      const structIdx = this.renderer.container.getChildIndex(this.renderer.wallLayer);
      this.renderer.container.addChildAt(procDecorator.structureLayer, structIdx);
      const detailIdx = this.renderer.container.getChildIndex(this.renderer.shadowLayer);
      this.renderer.container.addChildAt(procDecorator.naturalLayer, detailIdx);
      this.renderer.container.addChildAt(procDecorator.artificialLayer, detailIdx + 1);
    }

    // Parallax background — only rebuild on first load (skip on room transitions
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

    // Place player
    this.worldPlayerSpawnRuntime.place(level, enterDirection);

    // Spawn enemies (skip for Shop rooms)
    this.worldEnemyRegistry.clear();
    this.worldProjectileRuntime.clear();
    this.worldItemDropRuntime.clear();
    this.portalRuntime.clear();
    this.altarController.clear();
    this.savePointRuntime.loadLevel(level, this.entityLayer);
    this.exitGlowRuntime.clearAll();
    this.worldRelicPickupRuntime.loadLevel(level, this.collectedRelics);
    this.worldPickupRuntime.loadLevel(level, this.collisionGrid, this.collectedItems);
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

    this.cameraZoneRuntime.loadLevel(level, { resetToDefaults: true });

    this.worldHandPlacedItemRuntime.loadLevel(level);

    const builderSpawner = level.entities.find((e) => e.type === 'BuilderSpawner' && e.fields.Enabled !== false);
    if (builderSpawner) {
      this.spawnBuilderFromSpawner(level, builderSpawner);
    }

    // HUD/minimap visibility — Shaft_DemoEnd 에서는 숨긴다 (엔딩
    // 연출 2026-05-17). 그 외에는 인트로가 끝나 hudReady 가 되면 intro 직후
    // 다시 표시한다.
    if (level.identifier === 'Shaft_DemoEnd') {
      this.hud.container.visible = false;
      if (this.minimap) this.minimap.visible = false;
    } else if (this.game.hudReady) {
      this.hud.container.visible = true;
      if (this.minimap) this.minimap.visible = true;
    }

    // Exit Light Bleed — 출구 방향 빛 번짐 효과를 현재 방에 맞게 로드한다.
    this.exitGlowRuntime.loadLevel(level);

    // Settle player physics (gravity snap to floor) before camera snap
    for (let i = 0; i < 5; i++) {
      this.player.update(16.667);
    }
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.savePrevPosition();

    const cam = this.game.camera;
    const camX = this.player.x + this.player.width / 2;
    const camY = this.player.y + this.player.height / 2;
    cam.target = { x: camX, y: camY };
    cam.snap(camX, camY);
    // Run one camera.update() so cam position matches what update() would produce.
    // This prevents a 1-frame jump when transitioning from snap to normal update.
    cam.update(16.667);

    // Update minimap + world map (skip in item tunnel)
    if (!this.itemWorldEntryState.inTunnel) {
      this.worldMinimap.draw();
    } else if (this.minimap) {
      this.minimap.visible = false;
    }
    // When the world map is open, the freshly-drawn minimap must stay hidden.
    if (this.worldMap?.visible && this.minimap) {
      this.minimap.visible = false;
    }
    this.worldMapRuntime.syncVisibleRedraw();

    this.saveRoomAudioRuntime.syncForLevel(this.savePointRuntime.hasAny);

    return true;
  }

  // ---------------------------------------------------------------------------
  // Enemy spawning
  // ---------------------------------------------------------------------------

  /** Unlock all doors matching the given event name. */
  unlockDoors(eventName: string): void {
    this.worldDoorSwitchInteractionRuntime.unlockDoors(eventName);
  }

  /**
   * Arc Tether 픽업 대상을 찾을 때 player facing 방향 cone (약 60도, 반경 6칸) 안에서 고른다.
   * LOOK_UP / LOOK_DOWN 입력 시 그 방향으로 GRAB 콘을 회전한다 (stack/들기 픽업).
   * 가까운 컨테이너(< 24px)는 cone 밖이어도 우선 잡는다 (방향 무관 근접 잡기).
   */
  /**
   * Spawn Dialogue and Memory triggers from LDtk entities.
   */
  /**
   * (Documents/Research/RoomTransition_Readability_Research.md A2)
   *
   * 가로 모서리 (w/e): col 0 또는 gridW-1 에서 위아래로 passable run 을 찾아 1칸 이상이면 통과 가능.
   * 세로 모서리 (n/s): row 0 또는 gridH-1 에서 좌우로 passable 한지 검사한다.
   * passable 판정은 checkLevelEdges() 가 사용한다 (값 0 또는 2).
   */
  /**
   * Per-frame tile hazard tick: TileMutator state + DOT on player & enemies.
   * Mirrors the spike-runtime hazard pattern but channels through TileHazards.applyTileHazards
   * so magma/charged/acid/fire/thunder/burn share one code path.
   *
   * GDD: Documents/System/System_World_TileSystem.md §2.6-2.13
   */
  private tickTileHazards(dt: number): void {
    const room = this.player.roomData;
    if (!room) return;

    // Advance frozen/burning/electric timers + oil-spread + passive interactions.
    this.tileMutator.tick(room, dt);

    this.worldBurnablePropRuntime.update(dt);

    // Procedural grass clumps — fire ignition + chain to TILE_GRASS tiles.
    this.grassFireRuntime.update(dt, this.tileMutator, this.collisionGrid, TILE_SIZE);

    this.worldBreakablePropRuntime.cleanupBurnedOut();

    // Render overlay for fire / ice / electric cell states.
    this.worldTileMutationRuntime.updateRenderer(this.collisionGrid, dt);

    // Wall layer refresh — ice melted to water, wood/grass burned out, metal
    // corroded. rerenderTilemap reads the current collisionGrid and skips
    // tiles whose cell is now air or a fluid type (handled by LdtkRenderer).
    if (this.worldTileMutationRuntime.consumeWallLayerDirty()) {
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
    // residue ticks (without the floor, maxHp*0.005 etc rounds to 0).
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
   * ItemWorld 진입 시 덮은 검은 화면에서 복귀하며 overlay alpha 1 — 0.
   * onComplete 에서 진입처(portal / floor collapse / fixed level)를 정리한다.
   */
  private startItemWorldReturnFadeIn(): void {
    this.normalizeWorldVisualsAfterItemWorldReturn();
    this.itemWorldReturnFade.start();
  }

  private normalizeWorldVisualsAfterItemWorldReturn(): void {
    this.itemDeploymentAtmosphereFlowRuntime.deactivateDungeonAtmosphere();
    this.itemDeploymentTunnelFlowRuntime.destroyGhostOverlay(true);
    this.itemDeploymentTunnelFlowRuntime.restoreDeploymentTunnel(true);
    this.itemWorldEntryState.pendingGhostTunnelParams = null;
    this.fadeOverlay.alpha = 0;
    if (this.parallaxBG?.container) {
      this.parallaxBG.container.alpha = 1;
    }
    const filteredLayers = [
      this.renderer?.bgLayer,
      this.renderer?.wallLayer,
      this.renderer?.interiorLayer,
      this.renderer?.shadowLayer,
      this.renderer?.specialLayer,
      this.entityLayer,
      this.fluidLayer,
      this.parallaxBG?.container,
    ].filter((layer): layer is Container => !!layer);
    for (const layer of filteredLayers) {
      if (!layer.filters) continue;
      this.dungeonAtmosphereRuntime.removeKnownFiltersFrom([layer]);
    }
    this.laserDesaturationRuntime.removeFromTargets(filteredLayers);
  }

  // ---------------------------------------------------------------------------
  // Game Over
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // Giant Builder
  // ---------------------------------------------------------------------------

  private spawnBuilderFromSpawner(hostLevel: LdtkLevel, spawner: LdtkEntity): void {
    const builderLevelId = this.builderSpawnerRuntime.readLevelId(spawner);
    const builderLevel = this.builderLoader.getLevel(builderLevelId);
    if (!builderLevel) return;

    const config = this.builderSpawnerRuntime.resolveConfig(spawner, hostLevel, builderLevel);
    const spawnState = this.builderPersistenceRuntime.resolveSpawnState(
      config.builderLevelId,
      config.runOnceKey,
      config.replayAtEnd,
      config.startY,
      config.endY,
    );
    const { savedState, spawnY } = spawnState;

    const builder = new GiantBuilder(
      builderLevel,
      this.atlases,
      'world_shaft_builder_bg',
      'world_shaft_builder_wall',
      { hostLevel, builderX: config.builderX, builderY: spawnY },
    );

    this.builderVisualFilterRuntime.apply(builder, this.terrainPaletteRuntime.rimFilter);
    builder.placeInLevel(config.builderX, spawnY);
    this.builderLayerRuntime.attachBody(
      this.renderer.container,
      this.renderer.shadowLayer,
      builder,
      config.insertBeforeNaturalDecor && this.proceduralDecorRuntime.hasPrimary,
    );
    this.builderLayerRuntime.attach(this.container, builder);
    this.builderInteriorVisibilityRuntime.reset(builder);

    const shouldBuildRoute = this.builderSpawnerRuntime.shouldBuildRoute(config, spawnState);
    if (shouldBuildRoute) {
      builder.setRoute(this.builderSpawnerRuntime.createRoute(config), config.speed, config.loop);
      if (savedState) {
        builder.restoreSnapshot(savedState);
      } else if (config.skipInitialWait) {
        builder.skipInitialWait();
      }
      this.builderPersistenceRuntime.markRunOnce(config.runOnceKey);
    } else if (savedState) {
      builder.restoreSnapshot(savedState);
    }

    this.activeBuilder = builder;
    this.builderPersistenceRuntime.setActive(config.builderLevelId, config.cameraShake ? 'cinematic' : 'patrol');
    this.builderStepFeedbackRuntime.reset(config.cameraShake);

    this.spawnBuilderEntities(builderLevel, config.builderLevelId, builder);
    this.builderGrassRuntime.register(builder, this.grassFireRuntime.system, this.tileMutator);
  }


  /** 아이템계 진입 연출(딥/포탈/필링/엔트리 페이드/아이템 디플로이 성장)이 진행 중인가. */
  private isItemWorldEntryCinematicActive(): boolean {
    return (
      this.itemWorldTransitionRuntime.isActive ||
      this.itemWorldEntryTransition.isActive ||
      (this.itemWorldEntryState.deployment?.isActive ?? false)
    );
  }
  /** Clear death state without going through SaveManager — debug warp only. */
  private reviveFromGameOver(): void {
    this.gameOverRuntime.clear();
    this.player.hp = this.player.maxHp;
    this.player.isDead = false;
    this.player.drowned = false;
    this.hud.container.visible = true;
    if (this.minimap) this.minimap.visible = true;
  }

  // ---------------------------------------------------------------------------
  // Giant Builder
  // ---------------------------------------------------------------------------

  /** Walk a builder level's LDtk entities and delegate gameplay objects
   *  that make sense inside a moving builder. */
  private spawnBuilderEntities(
    builderLevel: LdtkLevel,
    builderLevelId: string,
    builder: GiantBuilder,
  ): void {
    for (const ent of builderLevel.entities) {
      if (this.builderItemRuntime.spawnIfItem(builderLevelId, builder, ent)) continue;
      if (this.builderStaticEntityRuntime.spawnIfStaticEntity(builderLevelId, builder, ent)) continue;
      if (this.builderDoorSwitchRuntime.spawnIfDoorSwitch(builder, ent)) continue;
      if (this.builderEntranceRuntime.spawnIfEntrance(builder, ent)) continue;
      if (this.anvilSpawnRuntime.spawnBuilderMounted(builder, ent, this.builderAttachmentRuntime)) continue;
      if (this.builderSpriteRuntime.spawnIfSprite(builder, ent)) continue;
    }
  }

  /** Sync world coords (entity.x/y) of builder-attached entities so
   *  interaction hitboxes track the moving builder. The visual position is
   *  handled by the parent builder.container transform — we only update
   *  the world-coord fields used by pickup/interaction logic. */
  private syncBuilderAttachments(): void {
    this.builderAttachmentRuntime.sync(this.activeBuilder);
  }

  private setBuilderEntranceGlowAlpha(alpha: number): void {
    this.exitGlowRuntime.setBuilderEntranceGlowAlpha(alpha);
  }

  private clearBuilder(): void {
    this.builderPersistenceRuntime.saveActive(this.activeBuilder);
    this.exitGlowRuntime.clearBuilderEntranceGlows();
    this.builderStampRuntime.unstamp(this.collisionGrid);
    this.worldWeatherRuntime.clearDynamicColliders();
    this.builderWeatherRuntime.clear();
    this.builderPlayerStateRuntime.reset();
    if (this.activeBuilder) {
      this.builderLayerRuntime.destroy(this.activeBuilder);
      this.activeBuilder.destroy();
      this.activeBuilder = null;
    }
    this.builderPersistenceRuntime.clearActive();
    this.builderStepFeedbackRuntime.reset();
    this.builderInteriorVisibilityRuntime.reset();
    this.builderAttachmentRuntime.clear();
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
  }

  private respawnPlayer(): void {
    this.gameOverRuntime.clear();

    // Clear fixed item world / tunnel state
    this.fixedItemWorldFlowRuntime.clear();
    this.itemWorldEntryState.inTunnel = false;
    this.itemWorldEntryState.clearItem();

    // Load save data — return to last save point
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
      // No save — return to spawn level
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
    // 복귀 후 HP VFX(Flask R pulse, glow, HP bar pulse, vignette) 를 리셋한다.
    this.hud.resetLowHpEffects();
    this.hud.updateHP(this.player.hp, this.player.maxHp);
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
    this.portalRuntime.spawn(x, y, rarity, sourceType, sourceItem);
  }

  private enterPortal(portal: Portal): void {
    this.altarController.close();

    this.portalRuntime.detach(portal);
    portal.setShowHint(false);

    this.portalEntryRuntime.begin(portal);

    this.itemWorldTransitionRuntime.start(portal, () => this.portalItemWorldFlowRuntime.completePendingEntry());
  }

  // ---------------------------------------------------------------------------
  // Ending sequence — delegated to EndingSequence class
  // ---------------------------------------------------------------------------

  private rerenderTilemap(): void {
    // Filter out wall tiles where collision grid is 0 (destroyed floors/walls)
    const grid = this.collisionGrid;
    const filteredTiles = this.currentLevel.wallTiles.filter(t => {
      const col = Math.floor(t.px[0] / TILE_SIZE);
      const row = Math.floor(t.px[1] / TILE_SIZE);
      // Keep slope stamps even when their visual tile sits over an air cell.
      return isLdtkWallSlope2x1Tile(t) || (grid[row]?.[col] ?? 0) !== 0;
    });
    this.renderer.rebuildWallLayer(filteredTiles, this.atlases, this.collisionGrid);
    addLdtkVisualBoundsBleed({
      target: {
        wallLayer: this.renderer.wallLayer,
        specialLayer: this.renderer.specialLayer,
      },
      atlases: this.atlases,
      boundsWidth: this.currentLevel.pxWid,
      boundsHeight: this.currentLevel.pxHei,
      wallTiles: filteredTiles,
      collisionGrid: this.collisionGrid,
    });
    this.terrainPaletteRuntime.applyWorldFilterAreas(this.currentLevel.pxWid, this.currentLevel.pxHei, this.renderer, this.proceduralDecorRuntime);
  }

  private showTunnelOpenDialogueAfterDeployment(): void {
    // EGO_TUNNEL_OPEN 다이얼로그 트리거 제거 (사용자 요청 2026-06-02).
    // 첫 회 앤빌 디플로이 직후 이 대사가 anvilDiveUiRuntime.hide() 로 UI 가
    // 숨겨진 채 활성화되어, 화면엔 안 보이지만 loreDisplay.isActive early-return
    // (update 1892) 이 플레이어를 대사 자동표시 시간(~3초) 동안 잠그던 문제.
    // 첫 회에만 발생한 것도 '__ego_tunnel_open_first' 게이트 때문. 트리거 자체 제거.
  }

  private cancelFrozenReturnDeploymentState(): void {
    this.itemWorldEntryState.destroyDeployment();
    this.game.input.inputLocked = false;
    this.anvil?.clearPlacedItem();
    if (this.anvil && !this.anvilRetirementRuntime.isRetiredByBossClear(this.anvil) && !(this.activeBuilder?.isMoving ?? false)) {
      void this.anvil.setDisabled(false);
    }
    this.itemWorldEntryState.clearItem();
    this.itemDeploymentTunnelFlowRuntime.destroyGhostOverlay(true);
    this.itemDeploymentTunnelFlowRuntime.restoreDeploymentTunnel(true);
    this.itemWorldEntryState.pendingGhostTunnelParams = null;
    this.player.roomData = this.collisionGrid;
  }

  private getBuilderAtmosphereTargets(): Container[] {
    return this.builderLayerRuntime.getAtmosphereTargets(this.activeBuilder);
  }

}
