import { Container, Graphics } from 'pixi.js';
import { Scene } from '@core/Scene';
import { GameAction } from '@core/InputManager';
import { t } from '@i18n';
import { MODAL_BG, MODAL_BORDER, TEXT_PRIMARY } from '@ui/ModalPanel';
import { trackItemDrop } from '@utils/Analytics';
import { TilemapRenderer } from '@level/TilemapRenderer';
import { createBoundsGuard } from '@level/BoundsGuard';
import { generateRoomGrid, type RoomGridData, type RoomCell } from '@level/RoomGrid';
import { assembleRoom, getSpawnPosition, getDoorTriggers } from '@level/ChunkAssembler';
import { Player } from '@entities/Player';
import { Skeleton } from '@entities/Skeleton';
import { GoldenMonster } from '@entities/GoldenMonster';
import { Projectile } from '@entities/Projectile';
import { Portal, PORTAL_COLOR, type PortalSourceType } from '@entities/Portal';
import { Altar } from '@entities/Altar';
import { HitManager, BASE_HITBOX_W } from '@combat/HitManager';
import { HUD } from '@ui/HUD';
import { InventoryUI } from '@ui/InventoryUI';
import { Inventory } from '@items/Inventory';
import { ItemDropEntity, rollDrop, rollGoldenDrop } from '@items/ItemDrop';
import { createBrokenSwordStarterItem } from '@items/StarterItemFactory';
import { resolveItemDropSpawn } from '@items/DropSpawn';
import { getDisplayName } from '@items/ItemInstance';
import type { ItemInstance } from '@items/ItemInstance';
import { ItemWorldScene } from './ItemWorldScene';
import { spawnEnemyDeathParticles } from '@scenes/shared/EnemyDeathFeedbackHelpers';
import { applyEnemyMeleeAttackDamageForPlayer } from '@scenes/shared/EnemyMeleeAttackDamageHelpers';
import { applyPlayerAttackHitFeedback } from '@scenes/shared/PlayerAttackHitFeedbackHelpers';
import { processPickupsForPlayerCollection } from '@scenes/shared/PickupCollectionHelpers';
import {
  addEnemyToRegistry,
  clearEnemies as clearEnemyRegistry,
  getAliveEnemiesAsCombatTargets,
  removeEnemyAt,
  renderEnemies,
} from '@scenes/shared/EnemyRegistryHelpers';
import { updateEnemyDefeatLifecycle } from '@scenes/shared/EnemyDefeatProcessingHelpers';
import { createLegacyWorldRoomEnemies } from '@scenes/shared/LegacyWorldEnemySpawnHelpers';
import { markRoomClearedWhenNoAliveEnemies } from '@scenes/shared/WorldRoomClearHelpers';
import { createLegacyWorldDoorMarkers } from '@scenes/shared/LegacyWorldDoorMarkerHelpers';
import { getLegacyWorldAltarSpawnCandidate } from '@scenes/shared/LegacyWorldAltarSpawnHelpers';
import { createLegacyWorldPortalTransition } from '@scenes/shared/LegacyWorldPortalTransitionHelpers';
import { prepareLegacyWorldPortalDungeonEntry } from '@scenes/shared/LegacyWorldPortalPayloadHelpers';
import {
  destroyAndClearEntities,
  removeEntityAt,
} from '@scenes/shared/EntityLifecycleHelpers';
import {
  collectPendingGhostProjectiles,
  updateProjectileCollection,
} from '@scenes/shared/ProjectileCollectionHelpers';
import {
  updateAltarInteractions,
  updatePortalInteractions,
} from '@scenes/shared/ProximityInteractionHelpers';
import { updateItemSelectionInput } from '@scenes/shared/ItemSelectionInputHelpers';
import {
  handleInventoryUiToggle,
  updateInventoryUiInput,
} from '@scenes/shared/InventoryUiInputHelpers';
import {
  addAltarItemRows,
  createAltarItemSelectionShell,
} from '@scenes/shared/AltarItemSelectionUiHelpers';
import { placePlayerAt, respawnPlayerAt } from '@scenes/shared/PlayerPlacementHelpers';
import {
  updateEnemyKinematicVfx,
  updateCommonMovementVfxManagers,
  updatePlayerKinematicVfx,
} from '@scenes/shared/MovementVfxHelpers';
import {
  findDoorTransitionCandidate,
} from '@scenes/shared/WorldTransitionHelpers';
import { TransitionTokens } from '@effects/TransitionDirector';
import { drawLegacyWorldMiniMap } from '@scenes/shared/WorldMiniMapHelpers';
import { tryHitPlayerWithProjectile } from '@scenes/shared/ProjectileCollisionHelpers';
import {
  destroyDisplayObject,
  detachAndClearDisplayObjects,
  detachDisplayObject,
} from '@scenes/shared/DisplayObjectLifecycleHelpers';
import { applyPlayerStatBuffs } from '@systems/PlayerBuffSystem';
import { PortalTransition } from '@effects/PortalTransition';
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
import { CriticalHighlightManager } from '@effects/CriticalHighlight';
import { HitBloodSprayManager } from '@effects/HitBloodSpray';
import { DiveLandImpactManager } from '@effects/DiveLandImpact';
import { WaterSplashManager } from '@effects/WaterSplash';
import { WaterBubblesManager } from '@effects/WaterBubbles';
import { DropThroughDustManager } from '@effects/DropThroughDust';
import { IceSkidStreakManager } from '@effects/IceSkidStreak';
import { ItemPickupGlowManager } from '@effects/ItemPickupGlow';
import { LowHpVignetteManager } from '@effects/LowHpVignette';
import { getRarityConfig } from '@data/rarityConfig';
import { ScreenFlash } from '@effects/ScreenFlash';
import { ToastManager } from '@ui/Toast';
import { attachGamepadToast } from '@ui/GamepadToastBinding';
import { PIXEL_FONT } from '@ui/fonts';
import { DamageNumberManager } from '@ui/DamageNumber';
import { SFX } from '@audio/Sfx';
import { AmbientLayer } from '@audio/AmbientLayer';
import { PRNG } from '@utils/PRNG';
import type { Rarity } from '@data/weapons';
import { SaveManager } from '@utils/SaveManager';
import type { Enemy } from '@entities/Enemy';
import { GAME_WIDTH, GAME_HEIGHT, type Game } from '../Game';
import { ItemWorldEntryPushTransition } from './world/ItemWorldEntryPushTransition';
import { WorldScenePortalItemWorldFlowRuntime } from './world/WorldScenePortalItemWorldFlowRuntime';
import { WorldItemWorldSceneTransitionRuntime } from './world/WorldItemWorldSceneTransitionRuntime';
import {
  createLegacyItemWorldSceneSaveAccess,
  type WorldSceneSaveAccess,
} from './shared/SceneSaveAccess';
import {
  createLegacyWorldGameOverOverlay,
} from '@scenes/shared/LegacyWorldGameOverHelpers';
import { isGameOverRespawnPressed } from '@scenes/shared/GameOverInputHelpers';

const TILE_SIZE = 16;
const ROOM_W = 60;
const ROOM_H = 34;
const FADE_DURATION = 200;
const GRID_W = 6;
const GRID_H = 6;

type TransitionState = 'none' | 'fade_out' | 'fade_in';

export class WorldScene extends Scene {
  private readonly saveAccess: WorldSceneSaveAccess;
  private tilemap!: TilemapRenderer;
  private boundsGuard: Graphics | null = null;
  private player!: Player;
  private enemies: Enemy[] = [];
  private projectiles: Projectile[] = [];
  private hitManager!: HitManager;
  private rng!: PRNG;
  private dropRng!: PRNG;

  // Layers
  private entityLayer!: Container;

  // Items
  private inventory!: Inventory;
  private drops: ItemDropEntity[] = [];
  private inventoryUI!: InventoryUI;
  private hud!: HUD;

  // Room grid
  private gridData!: RoomGridData;
  private currentCol = 0;
  private currentRow = 0;
  private roomData: number[][] = [];

  // Room transition
  private transitionState: TransitionState = 'none';
  private transitionTimer = 0;
  private pendingDirection: 'left' | 'right' | 'up' | 'down' | null = null;
  private doorTriggers: ReturnType<typeof getDoorTriggers> = [];

  // Door markers
  private doorMarkers: Graphics[] = [];

  // Toast & damage numbers & Sakurai effects
  private toast!: ToastManager;
  /** Gamepad hot-plug ?좎뒪??unsubscribe ??exit ???몄텧. */
  private _gpUnsub: (() => void) | null = null;
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

  // Game Over
  private gameOverOverlay: Container | null = null;
  private gameOverActive = false;

  // Mini-map
  private miniMapContainer!: Container;

  // Portal system
  private portals: Portal[] = [];
  private altars: Altar[] = [];
  private portalTransition: PortalTransition | null = null;
  private pendingPortalData: { rarity: Rarity; sourceType: PortalSourceType; sourceItem?: ItemInstance } | null = null;
  private altarSelectActive = false;
  private altarSelectIndex = 0;
  private activeAltar: Altar | null = null;
  private altarUI: Container | null = null;
  private worldSeed = 12345;
  private playtime = 0;
  private itemWorldEntryTransition!: ItemWorldEntryPushTransition;
  private itemWorldSceneTransitionRuntime!: WorldItemWorldSceneTransitionRuntime;
  private portalItemWorldFlowRuntime!: WorldScenePortalItemWorldFlowRuntime;

  constructor(game: Game, saveAccess: WorldSceneSaveAccess) {
    super(game);
    this.saveAccess = saveAccess;
  }

  init(): void {
    this.hitManager = new HitManager(this.game);

    // Procgen mode ??no save/load, fresh start
    {
      this.worldSeed = 12345;
      this.rng = new PRNG(this.worldSeed);
      this.dropRng = new PRNG(99999);
      this.inventory = new Inventory();
      const starterSword = createBrokenSwordStarterItem();
      this.inventory.add(starterSword);
      this.inventory.equip(starterSword.uid, true);
      this.gridData = generateRoomGrid(GRID_W, GRID_H, this.rng);
      this.currentCol = this.gridData.startRoom.col;
      this.currentRow = this.gridData.startRoom.row;
    }

    // Tilemap
    this.tilemap = new TilemapRenderer(TILE_SIZE);
    this.boundsGuard = createBoundsGuard(ROOM_W * TILE_SIZE, ROOM_H * TILE_SIZE, 0x192433);
    this.container.addChild(this.boundsGuard);
    this.container.addChild(this.tilemap.container);

    // Entity layer
    this.entityLayer = new Container();
    this.container.addChild(this.entityLayer);

    // Player
    this.player = new Player(this.game);
    this.entityLayer.addChild(this.player.container);
    this.updatePlayerAtk();

    // Mini-map
    this.miniMapContainer = new Container();
    this.game.legacyUIContainer.addChild(this.miniMapContainer);

    // HUD
    this.hud = new HUD(this.game.uiScale);
    this.game.uiContainer.addChild(this.hud.container);

    // Toast, damage numbers & Sakurai hit effects
    this.toast = new ToastManager(this.game.legacyUIContainer);
    // Gamepad hot-plug ???좎뒪??(System_Input_Gamepad 짠8.1 Stage 3).
    this._gpUnsub = attachGamepadToast(this.game, this.toast);
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
    this.itemWorldEntryTransition = new ItemWorldEntryPushTransition(this.game);
    this.itemWorldSceneTransitionRuntime = new WorldItemWorldSceneTransitionRuntime({
      hideSceneDuringTransition: () => {
        this.container.visible = false;
      },
      detachSharedUiForItemWorld: () => {
        if (this.inventoryUI) {
          if (this.inventoryUI.visible) {
            this.inventoryUI.close();
          }
          detachDisplayObject(this.inventoryUI.container);
        }
        if (this.altarUI) detachDisplayObject(this.altarUI);
        if (this.miniMapContainer) detachDisplayObject(this.miniMapContainer);
        if (this.hud) detachDisplayObject(this.hud.container);
      },
    });
    this.portalItemWorldFlowRuntime = new WorldScenePortalItemWorldFlowRuntime({
      createItemWorldScene: this.createLegacyItemWorldScene.bind(this),
      pushTransition: this.itemWorldEntryTransition,
      preparePush: () => this.itemWorldSceneTransitionRuntime.preparePush(),
      popScene: () => this.game.sceneManager.pop(),
      updatePlayerAtk: () => {
        this.updatePlayerAtk();
      },
      getPlayerAtk: () => this.player.atk,
      isFirstItemWorldBossDefeated: () => this.saveAccess.isFirstItemWorldBossDefeated(),
      grantDungeonItem: (item) => this.inventory.add(item),
      awardWeaponLevelUpToast: (item) => {
        this.toast.show(t('toast.weapon_level_up', { name: getDisplayName(item), level: item.level }), 0xff88ff);
        SFX.play('upgrade');
      },
      awardDungeonItemToast: (item) => {
        this.toast.show(
          t('toast.item_acquired', {
            name: getDisplayName(item),
            rarity: item.rarity.toUpperCase(),
          }),
          0xffcc44,
        );
      },
      awardAtkChangeToast: (prevAtk, nextAtk) => {
        this.toast.show(t('toast.atk_change', { prev: prevAtk, next: nextAtk }), 0xffff44);
      },
      saveProgress: () => {
        // Procgen mode: no save persistence
      },
    });

    // Inventory UI ??uiContainer(native) 吏곸냽 (UI native 留덉씠洹몃젅?댁뀡 1?④퀎)
    this.inventoryUI = new InventoryUI(this.inventory, this.game.uiScale, this.saveAccess);
    this.game.uiContainer.addChild(this.inventoryUI.container);
    // ?몃깽?좊━ ?대┝ ??HUD ?④? (?ъ슜??寃곗젙 2026-05-24).
    this.inventoryUI.onVisibilityChange = (vis: boolean) => {
      this.hud.container.visible = !vis;
    };

    // Load starting room
    this.loadRoom('down');

    // Camera
    this.game.camera.setBounds(0, 0, ROOM_W * TILE_SIZE, ROOM_H * TILE_SIZE);
    this.game.camera.snap(
      this.player.x + this.player.width / 2,
      this.player.y + this.player.height / 2,
    );

    // Tier 3 ambient bed demo (Plan_Audio_Demo 짠3-1 #1A + #1C, DEC-040 짠13-2.4 吏꾩쿃)
    AmbientLayer.startWorldTier3Demo();
  }

  private updatePlayerAtk(): void {
    const baseStr = 10; // Lv1 STR
    const buffedStats = applyPlayerStatBuffs({
      atk: baseStr + this.inventory.getWeaponAtk(),
      def: 5,
    });
    this.player.atk = buffedStats.atk;
    this.player.def = buffedStats.def;
    const eq = this.inventory.equipped;
    this.player.equippedWeaponId = eq ? eq.def.id : null;
    this.player.equippedWeaponType = eq ? eq.def.type : null;
    this.player.equippedRarity = eq ? eq.rarity : null;
    this.player.attackHitboxMul = eq ? eq.def.hitboxW / BASE_HITBOX_W : 1;
  }


  private loadRoom(enterFrom: 'left' | 'right' | 'up' | 'down'): void {
    const cell = this.gridData.cells[this.currentRow][this.currentCol];
    const roomRng = new PRNG(this.currentCol * 1000 + this.currentRow * 100 + 42);
    this.roomData = assembleRoom(cell, roomRng);
    this.tilemap.loadRoom(this.roomData);

    const spawnSide = this.getOppositeDirection(enterFrom);
    const spawn = getSpawnPosition(spawnSide);
    placePlayerAt(this.player, spawn.x, spawn.y, {
      collisionGrid: this.roomData,
      resetVelocity: true,
      savePreviousPosition: true,
    });

    this.doorTriggers = getDoorTriggers(cell);
    clearEnemyRegistry(this.enemies);
    destroyAndClearEntities(this.projectiles);
    destroyAndClearEntities(this.drops);
    destroyAndClearEntities(this.portals);
    destroyAndClearEntities(this.altars);

    if (!cell.cleared) {
      this.spawnEnemies(cell);
    }

    this.drawDoorMarkers(cell);

    this.game.camera.snap(
      this.player.x + this.player.width / 2,
      this.player.y + this.player.height / 2,
    );
    cell.visited = true;
    drawLegacyWorldMiniMap({
      container: this.miniMapContainer,
      gridData: this.gridData,
      currentCol: this.currentCol,
      currentRow: this.currentRow,
      mapCols: GRID_W,
      mapRows: GRID_H,
    });
  }

  private getOppositeDirection(dir: 'left' | 'right' | 'up' | 'down'): 'left' | 'right' | 'up' | 'down' {
    switch (dir) {
      case 'left': return 'right';
      case 'right': return 'left';
      case 'up': return 'down';
      case 'down': return 'up';
    }
  }

  private showGameOver(): void {
    this.gameOverActive = true;
    // ?泥대젰 寃쎄퀬 VFX 利됱떆 珥덇린????gameOverActive ?숈븞 hud.update(dt) 媛
    // ?몄텧?섏? ?딆븘 ?붿긽???쇱뼱遺숇뒗 寃껋쓣 諛⑹? (LdtkWorldScene 怨??숈씪 ?⑦꽩).
    this.hud.resetLowHpEffects();
    const overlay = createLegacyWorldGameOverOverlay();
    this.gameOverOverlay = overlay;
    this.game.legacyUIContainer.addChild(overlay);
  }

  private createLegacyItemWorldScene(item: ItemInstance, entryCorridor: boolean): ItemWorldScene {
    return new ItemWorldScene(
      this.game,
      item,
      this.inventory,
      this.player,
      { entryCorridor },
      createLegacyItemWorldSceneSaveAccess(this.saveAccess),
    );
  }

  private respawnPlayer(): void {
    this.gameOverActive = false;
    if (this.gameOverOverlay?.parent) {
      detachDisplayObject(this.gameOverOverlay);
    }
    this.gameOverOverlay = null;

    const spawn = getSpawnPosition('down');
    respawnPlayerAt(this.player, spawn.x, spawn.y, { savePreviousPosition: true });
    this.game.camera.snap(this.player.x, this.player.y);
  }

  private drawDoorMarkers(cell: RoomCell): void {
    detachAndClearDisplayObjects(this.doorMarkers);

    for (const marker of createLegacyWorldDoorMarkers(cell, {
      roomWidth: ROOM_W,
      roomHeight: ROOM_H,
      tileSize: TILE_SIZE,
    })) {
      this.entityLayer.addChild(marker);
      this.doorMarkers.push(marker);
    }
  }

  private spawnEnemies(cell: RoomCell): void {
    for (const enemy of createLegacyWorldRoomEnemies({
      currentCol: this.currentCol,
      currentRow: this.currentRow,
      startCol: this.gridData.startRoom.col,
      startRow: this.gridData.startRoom.row,
      onCriticalPath: cell.onCriticalPath,
      roomWidth: ROOM_W,
      roomHeight: ROOM_H,
      tileSize: TILE_SIZE,
      collisionGrid: this.roomData,
      player: this.player,
    })) {
      addEnemyToRegistry(this.enemies, enemy, this.entityLayer);
    }

    // Altar: spawn in some rooms
    this.spawnAltarInRoom();
  }

  enter(): void {
    // Re-show everything when returning from item world
    this.container.visible = true;
    if (this.miniMapContainer) {
      if (!this.miniMapContainer.parent) this.game.legacyUIContainer.addChild(this.miniMapContainer);
      this.miniMapContainer.visible = true;
    }
    if (this.hud) {
      if (!this.hud.container.parent) this.game.uiContainer.addChild(this.hud.container);
      this.hud.container.visible = true;
    }
    this.updatePlayerAtk();
    // Snap camera to player position on re-enter
    this.game.camera.snap(
      this.player.x + this.player.width / 2,
      this.player.y + this.player.height / 2,
    );
  }

  update(dt: number): void {
    this.playtime += dt;

    // Toast always updates (even during transitions / game over)
    this.toast.update(dt);

    // Portal transition playing
    if (this.portalTransition) {
      this.portalTransition.update(dt);
      this.game.camera.update(dt);
      if (this.portalTransition.isDone) {
        const started = this.game.transitionDirector.startCoverSwapReveal({
          cover: 'black',
          startCovered: true,
          durationOutMs: 0,
          durationInMs: 0,
          holdFrames: 1,
          onSwap: () => this.completePendingPortalEntry(),
        });
        if (!started) this.completePendingPortalEntry();
      }
      return;
    }

    // Game Over state
    if (this.gameOverActive) {
      if (isGameOverRespawnPressed(this.game.input)) {
        this.respawnPlayer();
      }
      return;
    }

    // Altar selection UI
    if (this.altarSelectActive) {
      this.updateAltarInput();
      return;
    }

    // Inventory UI
    handleInventoryUiToggle({
      input: this.game.input,
      canToggle: true,
      toggle: () => this.inventoryUI.toggle(),
    });

    if (this.inventoryUI.visible) {
      this.updateInventoryInput();
      this.inventoryUI.update(dt); // selection pulse animation
      return; // Pause game while inventory open
    }

    if (this.transitionState !== 'none') {
      this.updateTransition(dt);
      return;
    }

    this.player.update(dt);

    // Check player death
    if (this.player.isDead && !this.gameOverActive) {
      this.showGameOver();
      return;
    }

    this.updateEnemies(dt);

    this.updatePlayerAttackHitFeedback();

    this.updateProjectiles(dt);

    applyEnemyMeleeAttackDamageForPlayer({
      player: this.player,
      enemies: this.enemies,
      game: this.game,
      hitSparks: this.hitSparks,
      screenFlash: this.screenFlash,
      isMeleeAttacking: (enemy) => (
        (enemy instanceof Skeleton || enemy instanceof GoldenMonster) && enemy.isAttackActive()
      ),
    });

    processPickupsForPlayerCollection({
      pickups: this.drops,
      player: this.player,
      dtMs: dt,
      isNearPlayer: (drop, player) => (
        drop.overlapsPlayer(player.x, player.y, player.width, player.height)
      ),
      onPickup: (drop) => {
        if (!this.inventory.add(drop.item)) return false;
        this.toast.show(
          t('toast.item_acquired', { name: drop.item.def.name, rarity: drop.item.rarity.toUpperCase() }),
          0xffcc44,
        );
        this.itemPickupGlow.spawn(drop.x, drop.y, getRarityConfig(drop.item.rarity).fxTint);
      },
    });

    // Room cleared
    markRoomClearedWhenNoAliveEnemies({
      enemies: this.enemies,
      cell: this.gridData.cells[this.currentRow][this.currentCol],
      onCleared: () => {
        this.toast.show(t('toast.room_clear'), 0x44ff44);
        drawLegacyWorldMiniMap({
          container: this.miniMapContainer,
          gridData: this.gridData,
          currentCol: this.currentCol,
          currentRow: this.currentRow,
          mapCols: GRID_W,
          mapRows: GRID_H,
        });
      },
    });

    // Portal & Altar interactions (portals take priority over altars)
    const portalEntered = this.updatePortals(dt);
    if (!portalEntered) {
      this.updateAltars(dt);
    }

    // Door triggers
    this.checkDoorTriggers();

    // HUD
    this.hud.updateHP(this.player.hp, this.player.maxHp);
    this.hud.updateFlask(this.player.flaskCharges, this.player.flaskMaxCharges);
    this.hud.updateATK(this.player.atk);
    this.hud.update(dt);
    this.hud.setFloorText(t('ui.hud.items_count', { count: this.inventory.items.length }));

    // Damage numbers & Sakurai hit effects
    this.dmgNumbers.update(dt);
    this.hitSparks.update(dt);
    this.deathParticles.update(dt);
    this.screenFlash.update(dt);

    // Movement VFX (consume player one-shot events + trail updates)
    this.updateMovementVfx(dt);

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
  private updateProjectiles(dt: number): void {
    collectPendingGhostProjectiles(this.enemies, this.projectiles, this.entityLayer);

    updateProjectileCollection({
      projectiles: this.projectiles,
      dtMs: dt,
      tryHitPlayer: (projectile) => tryHitPlayerWithProjectile({
        projectile,
        player: this.player,
        game: this.game,
        hud: this.hud,
        screenFlash: this.screenFlash,
        damageNumbers: this.dmgNumbers,
        hitSparks: this.hitSparks,
        flashHud: false,
        setLastDamageSource: false,
        floorDamage: false,
      }),
    });
  }

  private updatePlayerAttackHitFeedback(): void {
    if (!this.player.isAttackActive()) return;

    const targets = getAliveEnemiesAsCombatTargets(this.enemies);
    const hits = this.hitManager.checkHits(this.player, this.player.comboIndex, this.player.hitList, targets);
    applyPlayerAttackHitFeedback({
      hits,
      damageNumbers: this.dmgNumbers,
      hitSparks: this.hitSparks,
      screenFlash: this.screenFlash,
      enableMilestone100: true,
    });
  }

  private updateEnemies(dt: number): void {
    updateEnemyDefeatLifecycle({
      enemies: this.enemies,
      dtMs: dt,
      processNewDefeat: (enemy) => this.processEnemyJustDied(enemy),
      removeEnemyAt: (index) => removeEnemyAt(this.enemies, index),
    });
  }

  private processEnemyJustDied(enemy: Enemy<string>): void {
    // A11: death particle burst
    spawnEnemyDeathParticles(this.deathParticles, enemy, false);
    const isGolden = enemy instanceof GoldenMonster;
    const drop = isGolden
      ? rollGoldenDrop(this.dropRng)    // guaranteed rare+ drop
      : rollDrop(this.dropRng);         // normal drop chance
    if (!drop) return;

    const spawn = resolveItemDropSpawn(
      enemy.x + enemy.width / 2,
      enemy.y + enemy.height - 4,
      this.roomData,
    );
    const dropEntity = new ItemDropEntity(
      spawn.x,
      spawn.y,
      drop,
    );
    this.drops.push(dropEntity);
    this.entityLayer.addChild(dropEntity.container);
    trackItemDrop({
      source: isGolden ? 'golden' : 'enemy',
      item_id: drop.def.id,
      item_rarity: drop.rarity,
    });
  }

  private updateMovementVfx(dt: number): void {
    const p = this.player;

    updatePlayerKinematicVfx(dt, p, {
      landingDust: this.landingDust,
      dashAfterimage: this.dashAfterimage,
      dashBoostPuff: this.dashBoostPuff,
      doubleJumpRing: this.doubleJumpRing,
      wallJumpDust: this.wallJumpDust,
      jumpTakeoff: this.jumpTakeoff,
      wallSlideDust: this.wallSlideDust,
      footstepPuff: this.footstepPuff,
      surgeVfx: this.surgeVfx,
      diveLandImpact: this.diveLandImpact,
    }, { playSfx: false });

    // --- Batch C ---
    const hitDir = p.consumePlayerHitEvent();
    if (hitDir !== null) {
      this.hitBloodSpray.spawn(p.x + p.width / 2, p.y + p.height * 0.4, hitDir);
    }

    // --- Batch D ---
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

    updateEnemyKinematicVfx(dt, this.enemies, {
      waterSplash: this.waterSplash,
      waterBubbles: this.waterBubbles,
      iceSkidStreak: this.iceSkidStreak,
      landingDust: this.landingDust,
      jumpTakeoff: this.jumpTakeoff,
    });

    updateCommonMovementVfxManagers(dt, {
      landingDust: this.landingDust,
      dashBoostPuff: this.dashBoostPuff,
      doubleJumpRing: this.doubleJumpRing,
      wallJumpDust: this.wallJumpDust,
      jumpTakeoff: this.jumpTakeoff,
      wallSlideDust: this.wallSlideDust,
      footstepPuff: this.footstepPuff,
      flaskBurst: this.flaskBurst,
      criticalHighlight: this.criticalHighlight,
      hitBloodSpray: this.hitBloodSpray,
      diveLandImpact: this.diveLandImpact,
      waterSplash: this.waterSplash,
    });
    this.waterBubbles.update(dt);
    this.dropThroughDust.update(dt);
    this.iceSkidStreak.update(dt);
    this.itemPickupGlow.update(dt);
    const hpRatio = this.player.maxHp > 0 ? this.player.hp / this.player.maxHp : 0;
    this.lowHpVignette.update(dt, hpRatio);
  }

  private updateInventoryInput(): void {
    const inputResult = updateInventoryUiInput({
      input: this.game.input,
      target: this.inventoryUI,
      onAttack: () => this.inventoryUI.handleAttackInput(),
      onMenu: () => this.inventoryUI.handleMenuInput(),
    });

    if (inputResult.attackResult === 'confirmed_equipment_change') {
      this.updatePlayerAtk();
      this.hud.setFloorText(t('ui.hud.items_count', { count: this.inventory.items.length }));
    }
  }

  // --- Portal System ---

  private spawnPortal(x: number, y: number, rarity: Rarity, sourceType: PortalSourceType, sourceItem?: ItemInstance): void {
    const portal = new Portal(x, y, rarity, sourceType, sourceItem);
    this.portals.push(portal);
    this.entityLayer.addChild(portal.container);

    // Spawn effects (Sakurai: Stop for Big Moments)
    this.game.hitstopFrames += portal.spawnHitstop;
    this.game.camera.shake(portal.spawnShake);

    // Flash for rare+ portals
    if (rarity !== 'normal') {
      this.toast.show(t('toast.portal_appeared', { rarity: rarity.toUpperCase() }), 0xffcc44);
    }
  }

  private enterPortal(portal: Portal): void {
    // Close altar UI if open
    this.closeAltarUI();

    const transition = createLegacyWorldPortalTransition(portal, this.game.camera);
    this.portalTransition = transition;
    this.game.legacyUIContainer.addChild(transition.container);

    transition.onShake = (intensity) => this.game.camera.shake(intensity);
    transition.onHitstop = (frames) => { this.game.hitstopFrames += frames; };

    // Remove portal from world
    const idx = this.portals.indexOf(portal);
    if (idx >= 0) removeEntityAt(this.portals, idx);

    // Store portal info for scene transition
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

    const {
      targetItem,
      dungeonItem,
      isAltar,
      prevLevel,
      prevAtk,
    } = prepareLegacyWorldPortalDungeonEntry(data, this.player.atk);

    // Clean up transition
    if (this.portalTransition) {
      this.portalTransition.destroy();
      this.portalTransition = null;
    }

    this.portalItemWorldFlowRuntime.enterPortalDungeon(
      targetItem,
      dungeonItem,
      isAltar,
      prevLevel,
      prevAtk,
      {
        alreadyBlack: true,
        revealMs: 0,
      },
    );
  }

  private spawnAltarInRoom(): void {
    // Spawn altar in ~30% of rooms (capped at 2 total in the grid)
    const spawn = getLegacyWorldAltarSpawnCandidate({
      existingAltarCount: this.altars.length,
      roomWidth: ROOM_W,
      roomHeight: ROOM_H,
      tileSize: TILE_SIZE,
    });
    if (!spawn) return;

    const altar = new Altar(spawn.x, spawn.y);
    this.altars.push(altar);
    this.entityLayer.addChild(altar.container);
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

  private drawAltarUI(): void {
    // Destroy previous UI completely before creating new one
    if (this.altarUI) {
      destroyDisplayObject(this.altarUI, { children: true });
      this.altarUI = null;
    }

    const items = this.inventory.items;
    const ui = createAltarItemSelectionShell({
      itemCount: items.length,
      titleText: t('ui.world.offer_item'),
      titleFill: 0xaaccff,
      backgroundFill: MODAL_BG,
      backgroundAlpha: 0.95,
      borderFill: MODAL_BORDER,
    });

    addAltarItemRows({
      container: ui.container,
      items,
      selectedIndex: this.altarSelectIndex,
      equippedUid: this.inventory.equipped?.uid,
      x: ui.rowX,
      y: ui.rowY,
      rowHeight: ui.rowHeight,
      selectedFill: 0xffff44,
      normalFill: TEXT_PRIMARY,
    });

    this.altarUI = ui.container;
    this.game.legacyUIContainer.addChild(ui.container);
  }

  private closeAltarUI(): void {
    this.altarSelectActive = false;
    this.activeAltar = null;
    if (this.altarUI) {
      destroyDisplayObject(this.altarUI, { children: true });
      this.altarUI = null;
    }
  }

  private updateAltarInput(): void {
    const items = this.inventory.items;
    updateItemSelectionInput({
      input: this.game.input,
      items,
      selectedIndex: this.altarSelectIndex,
      setSelectedIndex: (index) => { this.altarSelectIndex = index; },
      redraw: () => this.drawAltarUI(),
      onConfirm: (item) => {
        if (this.activeAltar) {
        const altar = this.activeAltar;
        altar.used = true; // prevent re-opening
        this.closeAltarUI();
        this.spawnPortal(altar.x, altar.y - 20, item.rarity, 'altar', item);
      } else {
        this.closeAltarUI();
      }
      },
      onEmptyConfirm: () => this.closeAltarUI(),
      onCancel: () => this.closeAltarUI(),
    });
  }

  /** Returns true if player entered a portal this frame */
  private updatePortals(dt: number): boolean {
    return updatePortalInteractions({
      portals: this.portals,
      actor: this.player,
      dtMs: dt,
      isInteractPressed: () => this.game.input.isJustPressed(GameAction.LOOK_UP),
      onEnter: (portal) => this.enterPortal(portal),
    });
  }

  private updateAltars(dt: number): void {
    updateAltarInteractions({
      altars: this.altars,
      actor: this.player,
      dtMs: dt,
      isInteractPressed: () => this.game.input.isJustPressed(GameAction.LOOK_UP),
      isSelectActive: () => this.altarSelectActive,
      onOpen: (altar) => this.openAltarUI(altar),
    });
  }

  private checkDoorTriggers(): void {
    const transition = findDoorTransitionCandidate({
      triggers: this.doorTriggers,
      actorBounds: { x: this.player.x, y: this.player.y, width: this.player.width, height: this.player.height },
      currentCol: this.currentCol,
      currentRow: this.currentRow,
      gridWidth: this.gridData.width,
      gridHeight: this.gridData.height,
      getCell: (col, row) => this.gridData.cells[row]?.[col],
    });

    if (!transition) return;

    this.transitionState = 'fade_out';
    this.transitionTimer = FADE_DURATION;
    this.pendingDirection = transition.direction;
    this.currentCol = transition.nextCol;
    this.currentRow = transition.nextRow;
    this.game.transitionDirector.startCoverSwapReveal({
      cover: 'black',
      durationOutMs: TransitionTokens.ROOM_SWAP,
      durationInMs: TransitionTokens.ROOM_SWAP,
      onSwap: () => {
        if (this.pendingDirection) this.loadRoom(this.pendingDirection);
      },
      onComplete: () => {
        this.transitionState = 'none';
        this.transitionTimer = 0;
        this.pendingDirection = null;
      },
    });
  }

  private updateTransition(dt: number): void {
    this.transitionTimer += dt;
  }

  render(alpha: number): void {
    if (this.boundsGuard) this.boundsGuard.visible = this.game.camera.isShaking;
    this.player.render(alpha);
    renderEnemies(this.enemies, alpha);
    // Portals and altars are static, no interpolation needed
  }

  exit(): void {
    if (this._gpUnsub) { this._gpUnsub(); this._gpUnsub = null; }
    this.toast.clear();
    if (this.miniMapContainer) detachDisplayObject(this.miniMapContainer);
    if (this.hud) detachDisplayObject(this.hud.container);
    if (this.inventoryUI) detachDisplayObject(this.inventoryUI.container);
    if (this.altarUI) detachDisplayObject(this.altarUI);
    if (this.portalTransition) { this.portalTransition.destroy(); this.portalTransition = null; }
  }

}


