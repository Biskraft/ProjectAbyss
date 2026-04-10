/**
 * LdtkWorldScene.ts
 *
 * World-space scene that loads hand-crafted LDtk levels instead of procedurally
 * generated rooms. Implements the World (탐험) space of the 3-Space separation
 * model (Design_Architecture_3Space.md).
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

import { Container, Graphics, BitmapText, Assets, Texture } from 'pixi.js';
import { Scene } from '@core/Scene';
import { GameAction } from '@core/InputManager';
import { aabbOverlap } from '@core/Physics';
import { LdtkLoader } from '@level/LdtkLoader';
import { LdtkRenderer } from '@level/LdtkRenderer';
import type { LdtkLevel } from '@level/LdtkLoader';
import { Player } from '@entities/Player';
import { Skeleton } from '@entities/Skeleton';
import { GoldenMonster } from '@entities/GoldenMonster';
// Enemy stats are now applied in each Enemy subclass constructor via applyStats()
import { Ghost } from '@entities/Ghost';
import { Slime } from '@entities/Slime';
import { Guardian } from '@entities/Guardian';
import { Projectile } from '@entities/Projectile';
import { Portal, type PortalSourceType } from '@entities/Portal';
import { Altar } from '@entities/Altar';
import { Anvil } from '@entities/Anvil';
import { LockedDoor, type UnlockCondition } from '@entities/LockedDoor';
import { Switch } from '@entities/Switch';
import { GrowingWall } from '@entities/GrowingWall';
import { CrackedFloor } from '@entities/CrackedFloor';
import { Spike } from '@entities/Spike';
import { isInUpdraft } from '@core/Physics';
import { CollapsingPlatform } from '@entities/CollapsingPlatform';
import { HealthShard } from '@entities/HealthShard';
import { HealingPickup } from '@entities/HealingPickup';
import { GoldPickup } from '@entities/GoldPickup';
import { HitManager } from '@combat/HitManager';
import { COMBO_STEPS, getAttackHitbox } from '@combat/CombatData';
import { HUD } from '@ui/HUD';
import { ControlsOverlay } from '@ui/ControlsOverlay';
import { InventoryUI } from '@ui/InventoryUI';
import { Inventory } from '@items/Inventory';
import { ItemDropEntity, rollDrop, rollGoldenDrop } from '@items/ItemDrop';
import { SWORD_DEFS } from '@data/weapons';
import { createItem, calcInnocentBonus, itemLevelUp } from '@items/ItemInstance';
import type { ItemInstance } from '@items/ItemInstance';
import { ItemWorldScene } from './ItemWorldScene';
import { PortalTransition } from '@effects/PortalTransition';
import { FloorCollapse } from '@effects/FloorCollapse';
import { MemoryDive } from '@effects/MemoryDive';
import { HitSparkManager } from '@effects/HitSpark';
import { ScreenFlash } from '@effects/ScreenFlash';
import { SaveManager } from '@utils/SaveManager';
import { ToastManager } from '@ui/Toast';
import { WorldMapOverlay } from '@ui/WorldMapOverlay';
import { DialogueManager } from '@systems/DialogueManager';
import { PIXEL_FONT } from '@ui/fonts';
import { DamageNumberManager } from '@ui/DamageNumber';
import { TutorialHint } from '@ui/TutorialHint';
import { PRNG } from '@utils/PRNG';
import type { Rarity } from '@data/weapons';
import type { Enemy } from '@entities/Enemy';
import type { CombatEntity } from '@combat/HitManager';
import { GAME_WIDTH, GAME_HEIGHT, type Game } from '../Game';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TILE_SIZE = 16;
const FADE_DURATION = 200;

const LDTK_PATH = 'assets/World_ProjectAbyss_Layout.ldtk';
const ATLAS_PATH = 'assets/atlas/SunnyLand_by_Ansimuz-extended.png';
const FALLBACK_ENTRANCE_LEVEL = 'World_Level_16';

type TransitionState = 'none' | 'fade_out' | 'fade_in';

// ---------------------------------------------------------------------------
// LdtkWorldScene
// ---------------------------------------------------------------------------

export class LdtkWorldScene extends Scene {
  // LDtk level data
  private loader!: LdtkLoader;
  private renderer!: LdtkRenderer;
  private atlas!: Texture;
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
  private inventoryUI!: InventoryUI;
  private hud!: HUD;
  private controlsOverlay!: ControlsOverlay;

  // Room transition
  private transitionState: TransitionState = 'none';
  private transitionTimer = 0;
  private pendingDirection: 'left' | 'right' | 'up' | 'down' | null = null;
  private pendingLevelId: string | null = null;
  private pendingPlayerTileY = 0;
  private pendingPlayerTileX = 0;
  private fadeOverlay!: Graphics;
  private postTransitionSnapFrames = 0;  // force camera snap for N frames after transition

  // Boss lock
  private bossActive = false;
  private bossLockDoors: LockedDoor[] = [];

  // Dialogue
  private dialogueManager!: DialogueManager;

  // Tutorial hints
  private tutorialHint!: TutorialHint;
  private playerSpawnLevelId = '';

  // Toast, damage numbers & Sakurai hit effects
  private toast!: ToastManager;
  private dmgNumbers!: DamageNumberManager;
  private hitSparks!: HitSparkManager;
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

  // Oxygen HUD
  private oxygenOverlay: Graphics | null = null;
  private oxygenBar: Graphics | null = null;

  // Anvil + Floor Collapse system
  private anvil: Anvil | null = null;
  private floorCollapse: FloorCollapse | null = null;
  private memoryDive: MemoryDive | null = null;
  private collapseItem: ItemInstance | null = null;
  /** True while player is inside an ItemTunnel level, heading to Item World. */
  private inItemTunnel = false;
  /** The level to return to after exiting Item World via tunnel. */
  private preTunnelLevelId: string | null = null;
  /** True while inside a fixed (hand-crafted) item world level. */
  private inFixedItemWorld = false;
  private fixedItemWorldItem: ItemInstance | null = null;

  // Level tracking
  private visitedLevels: Set<string> = new Set(); // entered at least once → revealed on minimap
  private clearedLevels: Set<string> = new Set();
  private collectedItems: Set<string> = new Set();
  private collectedRelics: Set<string> = new Set();
  private relicMarkers: Array<{ gfx: Graphics; abilityName: string; relicKey: string }> = [];
  private lockedDoors: LockedDoor[] = [];
  private switches: Switch[] = [];
  private growingWalls: GrowingWall[] = [];
  private crackedFloors: CrackedFloor[] = [];
  private spikes: Spike[] = [];
  // Updraft: IntGrid value 4 — handled in applyUpdrafts()
  private updraftParticles: { x: number; y: number; speed: number; alpha: number; len: number; wobble: number }[] = [];
  private updraftGfx: Graphics | null = null;
  private collapsingPlatforms: CollapsingPlatform[] = [];
  private healthShards: HealthShard[] = [];
  private healingPickups: HealingPickup[] = [];
  private goldPickups: GoldPickup[] = [];
  private gold = 0;

  // Ending sequence
  private endingTriggers: Array<{ x: number; y: number; w: number; h: number }> = [];
  private endingActive = false;
  private endingTimer = 0;
  private endingPhase: 'idle' | 'rumble' | 'fade' | 'title' | 'done' = 'idle';
  private endingOverlay: Graphics | null = null;
  private endingTitle: BitmapText | null = null;
  private endingHint: BitmapText | null = null;
  private savePoints: Array<{ x: number; y: number; gfx: Graphics }> = [];
  /** Events that have been triggered globally (persists across level loads). */
  private unlockedEvents: Set<string> = new Set();

  constructor(game: Game) {
    super(game);
  }

  // ---------------------------------------------------------------------------
  // Scene lifecycle
  // ---------------------------------------------------------------------------

  async init(): Promise<void> {
    this.hitManager = new HitManager(this.game);
    this.dropRng = new PRNG(99999);

    // Fetch and parse LDtk project
    const json = await fetch(LDTK_PATH).then((r) => r.json()) as Record<string, unknown>;
    this.loader = new LdtkLoader();
    this.loader.load(json);

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
      this.inventory = new Inventory();
      const starterSword = createItem(SWORD_DEFS[0]);
      this.inventory.add(starterSword);
      this.inventory.equip(starterSword.uid);
    }

    // Load tileset atlas
    this.atlas = await Assets.load(ATLAS_PATH);

    // LDtk renderer — tiles only, no entity markers in production
    this.renderer = new LdtkRenderer();
    this.container.addChild(this.renderer.container);

    // Entity layer (enemies, drops, portals, altars)
    this.entityLayer = new Container();
    this.container.addChild(this.entityLayer);

    // Player
    this.player = new Player(this.game);
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
    }
    this.updatePlayerAtk();

    // Fade overlay — on stage (camera-independent) so it always covers the full screen
    this.fadeOverlay = new Graphics();
    this.fadeOverlay.rect(0, 0, GAME_WIDTH, GAME_HEIGHT).fill(0x000000);
    this.fadeOverlay.alpha = 0;
    this.game.app.stage.addChild(this.fadeOverlay);

    // HUD
    this.hud = new HUD();
    this.game.app.stage.addChild(this.hud.container);

    // Controls overlay (disabled)
    // this.controlsOverlay = new ControlsOverlay();
    // this.game.app.stage.addChild(this.controlsOverlay.container);

    // Toast, damage numbers, hit sparks, screen flash
    this.toast = new ToastManager(this.game.app.stage);
    this.dmgNumbers = new DamageNumberManager(this.entityLayer);
    this.hitSparks = new HitSparkManager(this.entityLayer);
    this.screenFlash = new ScreenFlash();
    this.game.app.stage.addChild(this.screenFlash.overlay);

    // Dialogue
    this.dialogueManager = new DialogueManager(this.game.input, this.game.app.stage, this.entityLayer);

    // Tutorial hints
    this.tutorialHint = new TutorialHint(this.game.input, this.game.app.stage);

    // Inventory UI
    this.inventoryUI = new InventoryUI(this.inventory);
    this.game.app.stage.addChild(this.inventoryUI.container);

    // World Map overlay
    this.worldMap = new WorldMapOverlay();
    this.worldMap.setRooms(this.loader.getWorldMap());
    this.game.app.stage.addChild(this.worldMap.container);

    // Spawn level — saved level or default Player entity level
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

    // Show controls toast on first load
    this.toast.show('Z:Attack  X:Jump  C:Dash', 0xaaaaaa);
  }

  enter(): void {
    this.container.visible = true;
    if (this.hud) this.hud.container.visible = true;
    if (this.minimap) this.minimap.visible = true;
    if (!this.currentLevel) return; // first init — loadLevel handles setup

    // Clean up dive/collapse effect
    if (this.memoryDive) {
      this.memoryDive.destroy();
      this.memoryDive = null;
    }
    if (this.floorCollapse) {
      this.floorCollapse.destroy();
      this.floorCollapse = null;
    }

    // Re-sync collision grid and tilemap (collapsed tiles remain at 0)
    this.collisionGrid = this.currentLevel.collisionGrid;
    this.player.roomData = this.collisionGrid;
    this.rerenderTilemap();

    this.updatePlayerAtk();
    this.game.camera.snap(
      this.player.x + this.player.width / 2,
      this.player.y + this.player.height / 2,
    );
  }

  private initialized = false;

  update(dt: number): void {
    // Guard: init() is async — game loop may call update() before it completes
    if (!this.initialized || !this.currentLevel) return;

    // Ending sequence active — block everything
    if (this.endingActive) {
      this.updateEnding(dt);
      return;
    }

    // Dialogue box active — block game input (NPC dialogue blocks movement)
    // Check dialogue FIRST, before UI consumes input
    this.dialogueManager.update(dt);
    this.dialogueManager.updateThoughtPosition(
      this.player.x + this.player.width / 2,
      this.player.y,
    );
    if (this.dialogueManager.box.isActive) {
      this.toast.update(dt);
      if (!this.dialogueManager.blocksMovement()) {
        this.player.update(dt);
      }
      this.game.camera.update(dt);
      return;
    }

    // Toast & tutorial hints update after gameplay input is processed
    this.toast.update(dt);
    this.tutorialHint.update(dt);

    // Tutorial hints — only show after dialogue finishes
    if (this.currentLevel?.identifier === this.playerSpawnLevelId) {
      this.tutorialHint.tryShow('hint_combat', 'Arrow: Move  Z: Jump  X: Attack');
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

    // Memory Dive in progress — all input blocked
    if (this.memoryDive && this.memoryDive.phase !== 'idle') {
      this.memoryDive.update(dt);

      if (this.memoryDive.shouldTransition) {
        this.completeFloorCollapseEntry();
        return;
      }

      this.hitSparks.update(dt);
      this.screenFlash.update(dt);
      return;
    }

    // Floor collapse in progress (legacy) — all input blocked, camera frozen
    if (this.floorCollapse && this.floorCollapse.phase !== 'idle') {
      this.floorCollapse.update(dt);

      const ph = this.floorCollapse.phase;
      if (ph === 'anvil_fall' || ph === 'fade_out' || ph === 'done') {
        this.player.update(dt);
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

    // Altar / Anvil selection UI
    if (this.altarSelectActive) {
      // Anvil mode: activeAltar is null, anvil exists without item
      if (!this.activeAltar && this.anvil) {
        this.updateAnvilInput();
      } else {
        this.updateAltarInput();
      }
      return;
    }

    // World Map toggle (M key)
    if (this.game.input.isJustPressed(GameAction.MAP)) {
      this.game.input.consumeJustPressed(GameAction.MAP);
      if (this.worldMap.visible) {
        this.worldMap.close();
      } else {
        // Update exploration state before opening
        this.worldMap.setExplorationState(this.visitedLevels, this.currentLevel?.identifier ?? '');
        this.worldMap.setMarkers(this.collectMapMarkers());
        this.worldMap.toggle();
      }
    }
    if (this.worldMap.visible) {
      this.worldMap.update(dt);
    }

    // Inventory UI toggle
    if (this.game.input.isJustPressed(GameAction.INVENTORY)) {
      this.game.input.consumeJustPressed(GameAction.INVENTORY);
      this.inventoryUI.toggle();
    }

    if (this.inventoryUI.visible) {
      this.updateInventoryInput();
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

    // Player
    this.player.update(dt);

    // Check drowning
    if (this.player.drowned && !this.gameOverActive) {
      this.player.hp = 0;
      this.player.onDeath();
      this.game.hitstopFrames = 8;
      this.screenFlash.flashDamage(true);
      this.showGameOver();
      return;
    }

    // Check player death
    if (this.player.isDead && !this.gameOverActive) {
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
        // died during enemy.update() (e.g. DOT) — handle drop now
        this.handleEnemyKill(enemy);
      }

      if (enemy.shouldRemove) {
        if (enemy.container.parent) enemy.container.parent.removeChild(enemy.container);
        this.enemies.splice(i, 1);
      }
    }

    // Player attacks — Sakurai full feedback chain
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
        if (hit.heavy) this.screenFlash.flashHit(true);
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
          const dmg = Math.max(1, Math.floor(proj.atk - this.player.def * 0.5));
          this.player.onHit(dir * 80, -40, 150);
          this.player.hp -= dmg;
          this.player.invincible = true;
          this.player.invincibleTimer = 500;
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
      this.player.hp -= dmg;
      this.player.invincible = true;
      this.player.invincibleTimer = 500;

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
        const key = (gp as any)._key as string;
        this.collectedItems.add(key);
        gp.collect();
        this.gold += gp.amount;
        this.toast.show(`+${gp.amount} G`, 0xffd700);
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
        const key = (hp as any)._key as string;
        this.collectedItems.add(key);
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
        this.player.maxHp += shard.hpBonus;
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
        }
        this.game.hitstopFrames = 8;
        this.game.camera.shake(3);
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
          this.tutorialHint.tryShow('hint_inventory', 'I: Open Inventory  X: Equip/Unequip');
          const key = (drop as any)._itemKey as string | undefined;
          if (key) this.collectedItems.add(key);
          drop.destroy();
          this.drops.splice(i, 1);
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

    // Anvil interaction + attack hit detection
    this.updateAnvil(dt);

    // Locked door & switch attack detection + update
    this.checkAttackOnDoors();
    this.checkAttackOnSwitches();
    this.checkAttackOnCrackedFloors();
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

    // Dive attack landing — area damage + cracked floor check
    if (this.player.diveLanded) {
      this.handleDiveLanding();
    }

    // Surge flight — break walls/floors on contact
    if (this.player.surgeActive) {
      this.handleSurgeContact();
    }

    // Collapsing platforms — check if player is standing on them
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

    // Save point interaction — UP key near save point
    this.checkSavePoints();

    // Debug: R key to reset save and reload
    if (this.game.input.isJustPressed(GameAction.DEBUG_RESET)) {
      SaveManager.deleteSave();
      window.location.reload();
    }

    // Portal interactions
    this.updatePortals(dt);

    // Area dialogue triggers
    if (this.currentLevel) {
      this.dialogueManager.checkAreaTriggers(
        this.player.x, this.player.y, this.currentLevel.identifier,
      );
    }

    // Ending trigger check
    if (!this.endingActive) {
      this.checkEndingTrigger();
    }

    // Room transition detection — edge-based
    this.checkLevelEdges();

    // Camera zone detection — check if player entered/exited a camera area
    this.updateCameraZones();

    // HUD
    this.hud.updateHP(this.player.hp, this.player.maxHp);
    this.hud.updateGold(this.gold);
    this.hud.setFloorText(`${this.currentLevel?.identifier ?? ''} ATK:${this.player.atk}`);

    // Damage numbers & Sakurai hit effects
    this.dmgNumbers.update(dt);
    this.hitSparks.update(dt);
    this.screenFlash.update(dt);

    // Camera — deadzone follow + zoom lerp
    const cx = this.player.x + this.player.width / 2;
    const cy = this.player.y + this.player.height / 2;
    const cam = this.game.camera;

    cam.setBounds(0, 0, this.currentLevel.pxWid, this.currentLevel.pxHei);
    cam.target = { x: cx, y: cy };

    cam.update(dt);

    // Oxygen overlay — vignette + bar when submerged
    this.updateOxygenOverlay();
  }

  private updateOxygenOverlay(): void {
    const ratio = this.player.oxygenRatio;
    const submerged = this.player.submerged && !this.player.abilities.waterBreathing;

    // Vignette overlay
    if (submerged && ratio < 1) {
      if (!this.oxygenOverlay) {
        this.oxygenOverlay = new Graphics();
        this.oxygenOverlay.eventMode = 'none';
        this.game.app.stage.addChild(this.oxygenOverlay);
      }

      this.oxygenOverlay.clear();
      // Blue → red vignette based on oxygen
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
        this.game.app.stage.addChild(this.oxygenBar);
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
    this.tutorialHint.destroy();
    this.dialogueManager.destroy();
    if (this.hud?.container.parent) this.hud.container.parent.removeChild(this.hud.container);
    // if (this.controlsOverlay?.container.parent) {
    //   this.controlsOverlay.container.parent.removeChild(this.controlsOverlay.container);
    // }
    if (this.inventoryUI?.container.parent) {
      this.inventoryUI.container.parent.removeChild(this.inventoryUI.container);
    }
    if (this.altarUI?.parent) this.altarUI.parent.removeChild(this.altarUI);
    if (this.portalTransition) { this.portalTransition.destroy(); this.portalTransition = null; }
    if (this.minimap?.parent) this.minimap.parent.removeChild(this.minimap);
    if (this.fadeOverlay?.parent) this.fadeOverlay.parent.removeChild(this.fadeOverlay);
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
    for (const id of this.loader.getLevelIds()) {
      // Skip non-world levels (item tunnels, fixed item worlds)
      if (id.startsWith('ItemTunnel') || id.startsWith('ItemWorld')) continue;
      const level = this.loader.getLevel(id);
      if (level?.entities.some((e) => e.type === 'Player')) {
        return id;
      }
    }
    return FALLBACK_ENTRANCE_LEVEL;
  }

  /** Seal level exits with temporary collision doors when boss fight starts. */
  private activateBossLock(level: LdtkLevel): void {
    this.bossActive = true;
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
    this.bossActive = false;
    for (const door of this.bossLockDoors) {
      door.unlock(this.collisionGrid);
      door.destroy();
    }
    this.bossLockDoors = [];
  }

  private handleEnemyKill(enemy: Enemy<string>): void {
    this.game.stats.enemiesKilled++;

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
        // World boss (test) — no portal, just big toast
        this.toast.showBig('BOSS DEFEATED!', 0xffd700);
      }
    } else if (enemy instanceof Slime) {
      // setTimeout(() => this.dialogueManager.fireEvent('first_slime_kill'), 1000);
    } else if (enemy instanceof Skeleton) {
      // setTimeout(() => this.dialogueManager.fireEvent('first_skeleton_kill'), 1000);
    }
    const isGolden = enemy instanceof GoldenMonster;
    const drop = isGolden
      ? rollGoldenDrop(this.dropRng)
      : rollDrop(this.dropRng);
    if (drop) {
      const dropEntity = new ItemDropEntity(
        enemy.x + enemy.width / 2,
        enemy.y + enemy.height - 4,
        drop,
      );
      this.drops.push(dropEntity);
      this.entityLayer.addChild(dropEntity.container);
      this.tutorialHint.tryShow('hint_item', 'Walk over items to pick them up');
    }
  }

  private loadLevel(levelId: string, enterDirection: 'left' | 'right' | 'up' | 'down'): void {
    const level = this.loader.getLevel(levelId);
    if (!level) {
      console.error(`[LdtkWorldScene] Level not found: "${levelId}"`);
      return;
    }
    this.currentLevel = level;
    this.visitedLevels.add(level.identifier);

    // Collision grid — same format as WorldScene.roomData
    this.collisionGrid = level.collisionGrid;

    // Render tiles — filter wall tiles by collision grid (destroyed tiles stay gone)
    this.renderer.clear();
    const filteredWalls = level.wallTiles.filter(t => {
      const col = Math.floor(t.px[0] / TILE_SIZE);
      const row = Math.floor(t.px[1] / TILE_SIZE);
      return (this.collisionGrid[row]?.[col] ?? 0) !== 0;
    });
    this.renderer.renderLevel(level.backgroundTiles, filteredWalls, level.shadowTiles, this.atlas);

    // Camera bounds
    this.game.camera.setBounds(0, 0, level.pxWid, level.pxHei);


    // Place player
    this.placePlayer(level, enterDirection);

    // Spawn enemies (skip for Shop rooms)
    this.clearEnemies();
    this.clearDrops();
    this.clearPortals();
    for (const r of this.relicMarkers) { if (r.gfx.parent) r.gfx.parent.removeChild(r.gfx); }
    this.relicMarkers = [];
    for (const sp of this.savePoints) { if (sp.gfx.parent) sp.gfx.parent.removeChild(sp.gfx); }
    this.savePoints = [];
    this.saveHintShown = false;
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
    this.spawnCrackedFloors(level);
    this.spawnSpikes(level);
    this.spawnCollapsingPlatforms(level);

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

    // Register LDtk Dialogue entities as triggers
    if (this.dialogueManager) {
      this.dialogueManager.registerLdtkDialogues(level.entities, level.identifier);
    }

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

    // Update minimap + world map
    this.drawMinimap();
    if (this.worldMap?.visible) {
      this.worldMap.setExplorationState(this.visitedLevels, this.currentLevel?.identifier ?? '');
      this.worldMap.setMarkers(this.collectMapMarkers());
      this.worldMap.redraw();
    }

    // Auto dialogue triggers for this level
    if (this.dialogueManager) {
      this.dialogueManager.checkAutoTriggers(level.identifier);
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
    const grid = level.collisionGrid;

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
    const clampedX = Math.max(0, Math.min(tileX, (grid[0]?.length ?? 1) - 1));
    // Scan down from passage row to find first solid (non-water) tile below
    for (let row = passageRow; row < grid.length; row++) {
      if (grid[row][clampedX] === 1) {
        // Floor found — place entity on top of it
        return row * TILE_SIZE - entityHeight;
      }
    }
    // No floor below — use passage row directly
    return passageRow * TILE_SIZE;
  }

  /**
   * @param hintTile - preferred tile index (row for left/right, col for up/down).
   *                   Picks the closest open passage to this hint.
   */
  private findEdgePassage(grid: number[][], edge: 'left' | 'right' | 'up' | 'down', hintTile = -1): number {
    const openTiles: number[] = [];
    // 0 = empty, 2 = water — both are passable
    const isPassable = (v: number) => v === 0 || v === 2;

    switch (edge) {
      case 'left':
        for (let row = 0; row < grid.length; row++) { if (isPassable(grid[row][0])) openTiles.push(row); }
        break;
      case 'right': {
        const col = (grid[0]?.length ?? 1) - 1;
        for (let row = 0; row < grid.length; row++) { if (isPassable(grid[row][col])) openTiles.push(row); }
        break;
      }
      case 'up':
        for (let col = 0; col < (grid[0]?.length ?? 0); col++) { if (isPassable(grid[0]?.[col])) openTiles.push(col); }
        break;
      case 'down': {
        const lastRow = grid[grid.length - 1] ?? [];
        for (let col = 0; col < lastRow.length; col++) { if (isPassable(lastRow[col])) openTiles.push(col); }
        break;
      }
    }

    if (openTiles.length === 0) {
      const len = (edge === 'left' || edge === 'right') ? grid.length : (grid[0]?.length ?? 1);
      return Math.floor(len / 2);
    }

    // Pick closest to hint
    if (hintTile >= 0) {
      let best = openTiles[0];
      let bestDist = Math.abs(best - hintTile);
      for (const t of openTiles) {
        const d = Math.abs(t - hintTile);
        if (d < bestDist) { best = t; bestDist = d; }
      }
      return best;
    }

    return openTiles[0];
  }

  /**
   * Find a safe floor Y coordinate for an entity at the given tile column.
   * Scans from the bottom of the collision grid upward to find the first solid
   * tile, then returns a Y position one entity-height above it.
   */
  private findFloorY(grid: number[][], tileX: number, entityHeight: number): number {
    const clampedX = Math.max(0, Math.min(tileX, (grid[0]?.length ?? 1) - 1));
    for (let row = grid.length - 1; row >= 0; row--) {
      if (grid[row][clampedX] >= 1) {
        return row * TILE_SIZE - entityHeight;
      }
    }
    // No floor found — place near bottom
    return (grid.length - 2) * TILE_SIZE - entityHeight;
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

    const step = COMBO_STEPS[this.player.comboIndex];
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

  /** Check if player is near a save point — show hint, save on UP. */
  private checkSavePoints(): void {
    const pcx = this.player.x + this.player.width / 2;
    const pcy = this.player.y + this.player.height / 2;
    const RANGE = 32;

    let nearSave = false;
    for (const sp of this.savePoints) {
      const dx = Math.abs(pcx - sp.x);
      const dy = Math.abs(pcy - sp.y);
      if (dx < RANGE && dy < RANGE) {
        nearSave = true;
        // Pulse the save marker
        sp.gfx.alpha = 0.6 + Math.sin(Date.now() * 0.005) * 0.4;

        if (this.game.input.isJustPressed(GameAction.LOOK_UP)) {
          this.performSave();
          return;
        }
      } else {
        sp.gfx.alpha = 0.6;
      }
    }

    // Show/hide persistent save hint
    if (nearSave) {
      if (!this.saveHintShown) {
        this.saveHintShown = true;
        this.hud.setFloorText('UP: Save');
      }
    } else if (this.saveHintShown) {
      this.saveHintShown = false;
      this.hud.setFloorText(`${this.currentLevel?.identifier ?? ''} ATK:${this.player.atk}`);
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
    // Visual feedback
    this.screenFlash.flash(0x44ffaa, 0.3, 200);
    this.game.hitstopFrames = 4;

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
    });
    this.toast.show('Game Saved!', 0x44ffaa);
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

      // Non-respawning platform already collapsed — skip
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
    const dtSec = dt / 1000;
    const TILE = 16;
    const UPDRAFT_FORCE = 980 * 2.2;
    const MAX_UPDRAFT_VY = -250;
    const P_COLOR = 0x66ddff;
    const P_SPEED = 140;
    const P_MAX = 50;

    // --- Physics ---
    if (this.player.fsm.currentState !== 'dash') {
      const inUpdraft = isInUpdraft(
        this.player.x, this.player.y, this.player.width, this.player.height,
        this.collisionGrid,
      );
      if (inUpdraft) {
        this.player.vy -= UPDRAFT_FORCE * dtSec;
        if (this.player.vy < MAX_UPDRAFT_VY) this.player.vy = MAX_UPDRAFT_VY;
      }
    }

    // --- Particles ---
    // Lazy-create graphics
    if (!this.updraftGfx) {
      this.updraftGfx = new Graphics();
      this.entityLayer.addChild(this.updraftGfx);
    }

    // Spawn particles in visible updraft tiles (camera viewport)
    const cam = this.game.camera;
    const viewL = cam.x;
    const viewT = cam.y;
    const viewR = viewL + GAME_WIDTH / cam.zoom;
    const viewB = viewT + GAME_HEIGHT / cam.zoom;

    const colL = Math.max(0, Math.floor(viewL / TILE));
    const colR = Math.min((this.collisionGrid[0]?.length ?? 1) - 1, Math.ceil(viewR / TILE));
    const rowT = Math.max(0, Math.floor(viewT / TILE));
    const rowB = Math.min(this.collisionGrid.length - 1, Math.ceil(viewB / TILE));

    // Spawn new particles from updraft tiles
    if (this.updraftParticles.length < P_MAX) {
      for (let row = rowT; row <= rowB; row++) {
        for (let col = colL; col <= colR; col++) {
          if ((this.collisionGrid[row]?.[col] ?? 0) !== 4) continue;
          // ~5% chance per tile per frame to spawn
          if (Math.random() > 0.05) continue;
          if (this.updraftParticles.length >= P_MAX) break;

          this.updraftParticles.push({
            x: col * TILE + Math.random() * TILE,
            y: row * TILE + TILE,  // spawn at bottom of tile
            speed: P_SPEED * (0.6 + Math.random() * 0.8),
            alpha: 0.3 + Math.random() * 0.5,
            len: 2 + Math.random() * 3,
            wobble: Math.random() * Math.PI * 2,
          });
        }
        if (this.updraftParticles.length >= P_MAX) break;
      }
    }

    // Update + draw particles
    this.updraftGfx.clear();
    const alive: typeof this.updraftParticles = [];

    for (const p of this.updraftParticles) {
      p.y -= p.speed * dtSec;
      const wx = p.x + Math.sin(p.y * 0.06 + p.wobble) * 1.5;

      // Check if still inside an updraft tile
      const tCol = Math.floor(p.x / TILE);
      const tRow = Math.floor(p.y / TILE);
      const stillInUpdraft = (this.collisionGrid[tRow]?.[tCol] ?? 0) === 4;

      if (!stillInUpdraft || p.y < viewT - 20) continue; // kill particle

      // Fade at edges
      const rowInTile = (p.y % TILE) / TILE;
      let alpha = p.alpha;
      if (rowInTile < 0.2) alpha *= rowInTile / 0.2;
      if (rowInTile > 0.8) alpha *= (1 - rowInTile) / 0.2;

      this.updraftGfx
        .moveTo(wx, p.y)
        .lineTo(wx, p.y - p.len)
        .stroke({ color: P_COLOR, width: 1, alpha });

      alive.push(p);
    }

    this.updraftParticles = alive;
  }

  /** Check player overlap with spikes — damage + teleport to last safe ground. */
  private checkSpikeContact(): void {
    if (this.player.invincible || this.player.hp <= 0) return;

    const playerBox = {
      x: this.player.x, y: this.player.y,
      width: this.player.width, height: this.player.height,
    };

    for (const spike of this.spikes) {
      if (!aabbOverlap(playerBox, spike.getAABB())) continue;

      // 20% max HP damage
      const dmg = Math.max(1, Math.floor(this.player.maxHp * 0.2));
      this.player.hp -= dmg;
      this.player.invincible = true;
      this.player.invincibleTimer = 500;

      // Feedback — strong hitstop for spike pain
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
      return; // one spike per frame
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

  /** Handle dive attack landing — area damage + cracked floor shatter. */
  /** Surge flight — break GrowingWalls and CrackedFloors on body contact. */
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
      // Already activated — skip collision injection, just show as broken
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
  /** Check player attack against cracked floors/walls — normal attack can break them. */
  private checkAttackOnCrackedFloors(): void {
    if (!this.player.isAttackActive()) return;

    const step = COMBO_STEPS[this.player.comboIndex];
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

    const step = COMBO_STEPS[this.player.comboIndex];
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

  /**
   * Spawn enemies from LDtk Enemy_Spawn entities. Falls back to random
   * spawning if no Enemy_Spawn entities are placed in the level.
   */
  private spawnEnemiesFromLdtk(level: LdtkLevel): void {
    // Direct entity types (Slime, Boss, etc.) — spawn without Enemy_Spawn wrapper
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

    // Boss entities — Guardian (기억의 수문장). Skip if already killed.
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

      // Activate boss lock — seal exits with temporary doors
      this.activateBossLock(level);
    }

    const spawners = level.entities.filter(e => e.type === 'Enemy_Spawn');

    if (spawners.length > 0) {
      for (const spawner of spawners) {
        const enemyType = (spawner.fields['type'] as string) ?? 'Skeleton';
        const enemyLevel = (spawner.fields['level'] as number) ?? 1;

        let enemy: Enemy<string>;
        if (enemyType === 'Golden') {
          const golden = new GoldenMonster('mid', enemyLevel);
          golden.onDeathCallback = (x, y, rarity) => this.spawnPortal(x, y, rarity, 'monster');
          enemy = golden;
        } else if (enemyType === 'Ghost') {
          enemy = new Ghost(enemyLevel);
        } else if (enemyType === 'Slime') {
          enemy = new Slime(enemyLevel);
        } else if (enemyType === 'Boss') {
          const bossKey = `boss_${level.identifier}_${spawner.px[0]}_${spawner.px[1]}`;
          if (this.unlockedEvents.has(bossKey)) continue;
          const g = new Guardian(enemyLevel);
          (g as any)._bossKey = bossKey;
          enemy = g;
        } else {
          enemy = new Skeleton(enemyLevel);
        }
        enemy.x = spawner.px[0];
        enemy.y = spawner.px[1] - enemy.height;
        enemy.roomData = this.collisionGrid;
        enemy.target = this.player;

        // Link to LockedDoors — killing this enemy unlocks target doors
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
    // No fallback — only LDtk-placed enemies spawn in the world
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
          const swordDef = (itemId ? SWORD_DEFS.find(d => d.id === itemId) : null) ?? SWORD_DEFS[0];
          const item = createItem(swordDef, swordDef.rarity);
          const drop = new ItemDropEntity(ent.px[0], ent.px[1], item);
          (drop as any)._itemKey = itemKey;
          this.drops.push(drop);
          this.entityLayer.addChild(drop.container);
          break;
        }
        case 'GameSaver': {
          // Save point — pivot bottom-left, center the marker on entity
          const spx = ent.px[0] + ent.width / 2;
          const spy = ent.px[1] - ent.height / 2;
          const marker = new Graphics();
          marker.rect(-8, -8, 16, 16).fill({ color: 0x44ffaa, alpha: 0.6 });
          marker.rect(-8, -8, 16, 16).stroke({ color: 0x44ffaa, width: 1 });
          // Pulsing diamond inside
          marker.moveTo(0, -5).lineTo(5, 0).lineTo(0, 5).lineTo(-5, 0).closePath()
            .fill({ color: 0xffffff, alpha: 0.4 });
          marker.x = spx;
          marker.y = spy;
          this.entityLayer.addChild(marker);
          this.savePoints.push({ x: spx, y: spy, gfx: marker });
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
          // Ability pickup — golden glowing marker
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
    // No fallback — only LDtk-placed altars in the world
  }

  // ---------------------------------------------------------------------------
  // Room transition — edge detection
  // ---------------------------------------------------------------------------

  /**
   * Check if player is inside a Camera zone and apply/restore settings with lerp.
   */
  private updateCameraZones(): void {
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
      // Entered a new camera zone — apply with lerp
      this.activeCameraZone = insideZone;
      cam.deadZoneX = insideZone.deadZoneX;
      cam.deadZoneY = insideZone.deadZoneY;
      cam.lookAheadDistance = insideZone.lookAheadDistance;
      cam.followLerp = insideZone.followLerp;
      cam.zoomTo(insideZone.zoom, insideZone.zoomLerp);
    } else if (!insideZone && this.activeCameraZone) {
      // Exited all camera zones — restore defaults with lerp
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

    // In a tunnel: reaching the bottom edge → warp to Item World
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
    console.log(`[EdgeTransition] → neighborId=${neighborId}`);
    if (!neighborId) return;

    this.startTransition(direction, neighborId);
  }

  /**
   * Find the neighbor level identifier in the given direction.
   *
   * Uses world-space bounding rectangles to determine which neighbor lies in
   * the requested direction and whose Y (or X) intervals overlap.
   *
   * Direction semantics:
   *   right  → neighbor whose left edge aligns with current level's right edge
   *   left   → neighbor whose right edge aligns with current level's left edge
   *   down   → neighbor whose top edge aligns with current level's bottom edge
   *   up     → neighbor whose bottom edge aligns with current level's top edge
   */
  /**
   * LDtk __neighbours dir codes:
   *   'n'=north(up), 's'=south(down), 'e'=east(right), 'w'=west(left)
   *   '>'=deeper depth, '<'=shallower depth
   */
  private getNeighborInDirection(
    direction: 'left' | 'right' | 'up' | 'down',
    playerWorldX: number,
    playerWorldY: number,
  ): string | null {
    const cur = this.currentLevel;
    const dirMap: Record<string, string> = { left: 'w', right: 'e', up: 'n', down: 's' };
    const ldtkDir = dirMap[direction];
    const candidates: string[] = cur.dirNeighbors[ldtkDir] ?? [];

    // Single candidate — return immediately
    if (candidates.length === 1) return candidates[0];

    // Multiple candidates — pick the one whose rect contains the player position
    // Use half-open intervals but pick the CLOSEST candidate as fallback
    // instead of blindly returning candidates[0].
    if (candidates.length > 1) {
      let bestId: string | null = null;
      let bestDist = Infinity;
      for (const nId of candidates) {
        const nb = this.loader.getLevel(nId);
        if (!nb) continue;
        if (direction === 'left' || direction === 'right') {
          const nbMidY = nb.worldY + nb.pxHei / 2;
          const dist = Math.abs(playerWorldY - nbMidY);
          if (playerWorldY >= nb.worldY && playerWorldY <= nb.worldY + nb.pxHei) return nId;
          if (dist < bestDist) { bestDist = dist; bestId = nId; }
        } else {
          const nbMidX = nb.worldX + nb.pxWid / 2;
          const dist = Math.abs(playerWorldX - nbMidX);
          if (playerWorldX >= nb.worldX && playerWorldX <= nb.worldX + nb.pxWid) return nId;
          if (dist < bestDist) { bestDist = dist; bestId = nId; }
        }
      }
      return bestId ?? candidates[0];
    }

    // No dirNeighbors — geometric fallback with player position check
    const curRight = cur.worldX + cur.pxWid;
    const curBottom = cur.worldY + cur.pxHei;
    const T = 4;
    for (const nId of cur.neighbors) {
      const nb = this.loader.getLevel(nId);
      if (!nb) continue;
      const nbR = nb.worldX + nb.pxWid;
      const nbB = nb.worldY + nb.pxHei;
      let edge = false;
      if (direction === 'right') edge = Math.abs(nb.worldX - curRight) <= T && cur.worldY < nbB && curBottom > nb.worldY;
      if (direction === 'left')  edge = Math.abs(nbR - cur.worldX) <= T && cur.worldY < nbB && curBottom > nb.worldY;
      if (direction === 'down')  edge = Math.abs(nb.worldY - curBottom) <= T && cur.worldX < nbR && curRight > nb.worldX;
      if (direction === 'up')    edge = Math.abs(nbB - cur.worldY) <= T && cur.worldX < nbR && curRight > nb.worldX;
      if (edge) {
        if (direction === 'left' || direction === 'right') {
          if (playerWorldY >= nb.worldY && playerWorldY <= nb.worldY + nb.pxHei) return nId;
        } else {
          if (playerWorldX >= nb.worldX && playerWorldX <= nb.worldX + nb.pxWid) return nId;
        }
      }
    }
    return null;
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
          // Tunnel exit → enter Item World (no fade_in, scene push handles it)
          this.transitionState = 'none';
          this.fadeOverlay.alpha = 0;
          this.pendingDirection = null;
          this.pendingLevelId = null;
          this.enterItemWorldFromTunnel();
          return;
        }
        if (this.pendingLevelId) {
          const opposite: Record<string, 'left'|'right'|'up'|'down'> = {
            left: 'right', right: 'left', up: 'down', down: 'up',
          };
          const enterFrom = opposite[this.pendingDirection!] ?? 'down';
          this.loadLevel(this.pendingLevelId, enterFrom);
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

  private showGameOver(): void {
    this.gameOverActive = true;
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
    this.game.app.stage.addChild(overlay);
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

    // Load save data — return to last save point
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
      this.loadLevel(saveData.levelId, 'down');
    } else {
      // No save — return to spawn level
      this.loadLevel(this.playerSpawnLevelId, 'down');
    }

    // Full HP restore + snap to save point
    this.player.respawn();
    this.player.hp = this.player.maxHp;
    this.updatePlayerAtk();
    this.snapPlayerToSavePoint();
  }

  // ---------------------------------------------------------------------------
  // Inventory UI
  // ---------------------------------------------------------------------------

  private updatePlayerAtk(): void {
    const baseStr = 10; // Lv1 STR
    const weaponAtk = this.inventory.getWeaponAtk();

    // Innocent bonus ATK — flat bonus from all subdued/wild innocent 'atk' slots
    const equippedItem = this.inventory.equipped;
    const innocentAtk = equippedItem ? Math.floor(calcInnocentBonus(equippedItem, 'atk')) : 0;

    this.player.atk = baseStr + weaponAtk + innocentAtk;

    // Innocent bonus DEF — base 5 + innocent 'def' bonus
    const innocentDef = equippedItem ? Math.floor(calcInnocentBonus(equippedItem, 'def')) : 0;
    this.player.def = 5 + innocentDef;

    // Innocent bonus MaxHP — base 100 + innocent 'hp' bonus
    const innocentHp = equippedItem ? Math.floor(calcInnocentBonus(equippedItem, 'hp')) : 0;
    const newMaxHp = 100 + innocentHp;
    if (newMaxHp !== this.player.maxHp) {
      // Scale current HP proportionally when max changes (standard RPG convention)
      const hpRatio = this.player.maxHp > 0 ? this.player.hp / this.player.maxHp : 1;
      this.player.maxHp = newMaxHp;
      this.player.hp = Math.round(newMaxHp * hpRatio);
    }
  }

  private updateInventoryInput(): void {
    const input = this.game.input;
    if (input.isJustPressed(GameAction.MOVE_LEFT)) this.inventoryUI.navigate('left');
    if (input.isJustPressed(GameAction.MOVE_RIGHT)) this.inventoryUI.navigate('right');
    if (input.isJustPressed(GameAction.LOOK_UP)) this.inventoryUI.navigate('up');
    if (input.isJustPressed(GameAction.LOOK_DOWN)) this.inventoryUI.navigate('down');
    if (input.isJustPressed(GameAction.ATTACK)) {
      this.inventoryUI.equipSelected();
      this.updatePlayerAtk();
      this.hud.setFloorText(`${this.currentLevel?.identifier ?? ''} ATK:${this.player.atk}`);
    }
    if (input.isJustPressed(GameAction.MENU)) this.inventoryUI.close();
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
    this.tutorialHint.tryShow('hint_portal', 'UP: Enter the Memory Strata');
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
    this.game.app.stage.addChild(transition.container);

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

    // In fixed item world — portal = return to forge
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

    // Hide world while in Item World
    this.container.visible = false;
    this.hud.container.visible = false;
    if (this.minimap) this.minimap.visible = false;

    const itemWorldScene = new ItemWorldScene(this.game, targetItem, this.inventory, this.player);
    itemWorldScene.onComplete = () => {
      this.game.sceneManager.pop();
      this.updatePlayerAtk();

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
        }
      }
      if (this.player.atk !== prevAtk) {
        this.toast.show(`ATK ${prevAtk} -> ${this.player.atk}`, 0xffff44);
      }
    };

    this.game.sceneManager.push(itemWorldScene, true);
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
    this.game.app.stage.addChild(ui);
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

    const anvilEnts = level.entities.filter(e => e.type === 'Anvil');
    if (anvilEnts.length > 0) {
      const ent = anvilEnts[0]; // One anvil per level
      this.anvil = new Anvil(ent.px[0], ent.px[1]);
      this.entityLayer.addChild(this.anvil.container);
      return;
    }

    // Prototype fallback: spawn anvil at first altar position
    const altarEnts = level.entities.filter(e => e.type === 'Altar');
    if (altarEnts.length > 0) {
      console.warn(`[LdtkWorldScene] No Anvil entity in "${level.identifier}" — using first Altar position as fallback`);
      const ent = altarEnts[0];
      this.anvil = new Anvil(ent.px[0], ent.px[1]);
      this.entityLayer.addChild(this.anvil.container);
    }
  }

  private updateAnvil(dt: number): void {
    if (!this.anvil || this.anvil.used) return;

    this.anvil.update(dt);

    // Proximity check — show hint
    const near = this.anvil.overlaps(
      this.player.x - 8, this.player.y - 8,
      this.player.width + 16, this.player.height + 16,
    );
    this.anvil.setShowHint(near);

    // UP key — place weapon on anvil (if no weapon placed yet)
    if (!this.anvil.hasItem() && this.anvil.overlaps(
      this.player.x, this.player.y, this.player.width, this.player.height,
    )) {
      if (this.game.input.isJustPressed(GameAction.LOOK_UP) && !this.altarSelectActive) {
        this.openAnvilUI();
        return;
      }
    }

    if (this.anvil.hasItem() && this.player.isAttackActive()) {
      const step = COMBO_STEPS[this.player.comboIndex];
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

  private openAnvilUI(): void {
    if (this.inventory.items.length === 0) {
      this.toast.show('No items to place', 0xff4444);
      return;
    }
    this.altarSelectActive = true;
    this.altarSelectIndex = 0;
    this.activeAltar = null; // null = anvil mode
    this.drawAnvilUI();
  }

  private drawAnvilUI(): void {
    this.drawItemSelectUI('Place weapon on anvil:', 0xff8844);
  }

  private updateAnvilInput(): void {
    this.updateItemSelectInput(
      (item) => {
        // Cannot place equipped weapon on anvil
        if (this.inventory.equipped?.uid === item.uid) {
          this.toast.show('Unequip first', 0xff4444);
          return;
        }
        if (this.anvil) {
          this.anvil.placeItem(item);
          this.collapseItem = item;
          this.closeAltarUI();

          // First commission sword placement — Screen 8 dialogue
          if (item.commission) {
            // this.dialogueManager.fireEvent('first_anvil_commission');
          } else {
            this.toast.show('Strike the anvil!', 0xff8844);
          }
        } else {
          this.closeAltarUI();
        }
      },
      () => this.drawAnvilUI(),
    );
  }

  // ---------------------------------------------------------------------------
  // Ending sequence (Screen 17 — balcony)
  // ---------------------------------------------------------------------------

  private checkEndingTrigger(): void {
    const pcx = this.player.x + this.player.width / 2;
    const pcy = this.player.y + this.player.height / 2;
    for (const t of this.endingTriggers) {
      if (pcx >= t.x && pcx <= t.x + t.w && pcy >= t.y && pcy <= t.y + t.h) {
        this.startEnding();
        return;
      }
    }
  }

  private startEnding(): void {
    this.endingActive = true;
    this.endingPhase = 'rumble';
    this.endingTimer = 0;

    // Lock player and sync position to prevent render jitter
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.savePrevPosition();
  }

  private updateEnding(dt: number): void {
    this.endingTimer += dt;

    // Phase 1: Echo rumble (0~2000ms) — camera micro-shake
    if (this.endingPhase === 'rumble') {
      const intensity = Math.min(3, this.endingTimer / 500);
      this.game.camera.shake(intensity * 0.3);

      if (this.endingTimer >= 1000) {
        this.endingPhase = 'fade';
        this.endingTimer = 0;
        this.endingOverlay = new Graphics();
        this.endingOverlay.rect(0, 0, GAME_WIDTH, GAME_HEIGHT).fill(0x000000);
        this.endingOverlay.alpha = 0;
        this.endingOverlay.eventMode = 'none';
        this.game.app.stage.addChild(this.endingOverlay);
      }
    }

    // Phase 2: Slow fade out (0~3000ms)
    else if (this.endingPhase === 'fade') {
      const progress = Math.min(1, this.endingTimer / 1500);
      if (this.endingOverlay) this.endingOverlay.alpha = progress;

      if (this.endingTimer >= 1500) {
        this.endingPhase = 'title';
        this.endingTimer = 0;

        // Show ECHORIS title + To be continued
        this.endingTitle = new BitmapText({
          text: 'ECHORIS',
          style: { fontFamily: PIXEL_FONT, fontSize: 24, fill: 0xdddddd },
        });
        this.endingTitle.anchor.set(0.5);
        this.endingTitle.x = GAME_WIDTH / 2;
        this.endingTitle.y = GAME_HEIGHT / 2 - 20;
        this.endingTitle.alpha = 0;
        this.game.app.stage.addChild(this.endingTitle);

        const tbc = new BitmapText({
          text: 'To be continued...',
          style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0x888888 },
        });
        tbc.anchor.set(0.5);
        tbc.x = GAME_WIDTH / 2;
        tbc.y = GAME_HEIGHT / 2 + 10;
        tbc.alpha = 0;
        this.game.app.stage.addChild(tbc);
        (this as any)._tbcText = tbc;
      }
    }

    // Phase 3: Title display (0~4000ms) — fade in title, then show hint
    else if (this.endingPhase === 'title') {
      // Title + tbc fade in (0~1500ms)
      if (this.endingTitle) {
        this.endingTitle.alpha = Math.min(1, this.endingTimer / 1500);
      }
      const tbc = (this as any)._tbcText as BitmapText | undefined;
      if (tbc) {
        tbc.alpha = Math.min(1, Math.max(0, (this.endingTimer - 500) / 1500));
      }

      // Show hint after 2500ms
      if (this.endingTimer >= 2500 && !this.endingHint) {
        this.endingHint = new BitmapText({
          text: 'PRESS ANY KEY',
          style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0x666666 },
        });
        this.endingHint.anchor.set(0.5);
        this.endingHint.x = GAME_WIDTH / 2;
        this.endingHint.y = GAME_HEIGHT / 2 + 35;
        this.game.app.stage.addChild(this.endingHint);
      }

      // Blink hint
      if (this.endingHint) {
        this.endingHint.alpha = 0.5 + Math.sin(this.endingTimer / 400) * 0.5;
      }

      // Wait for key press → fade out title → transition
      if (this.endingTimer >= 2500 && this.game.input.anyKeyJustPressed()) {
        this.endingPhase = 'done';
        this.endingTimer = 0;
      }
    }

    // Phase 4: Fade out title text (0~1500ms) → replace scene
    else if (this.endingPhase === 'done') {
      const progress = Math.min(1, this.endingTimer / 3000);
      if (this.endingTitle) this.endingTitle.alpha = 1 - progress;
      if (this.endingHint) this.endingHint.alpha = (1 - progress) * 0.5;
      const tbc2 = (this as any)._tbcText as BitmapText | undefined;
      if (tbc2) tbc2.alpha = 1 - progress;

      if (this.endingTimer >= 3000) {
        // Clean up
        if (this.endingOverlay?.parent) this.endingOverlay.parent.removeChild(this.endingOverlay);
        if (this.endingTitle?.parent) this.endingTitle.parent.removeChild(this.endingTitle);
        if (this.endingHint?.parent) this.endingHint.parent.removeChild(this.endingHint);
        if (tbc2?.parent) tbc2.parent.removeChild(tbc2);
        this.endingOverlay = null;
        this.endingTitle = null;
        this.endingHint = null;

        // Reset camera and return to title
        this.game.camera.setZoom(1.0);
        this.game.camera.clearBounds();
        import('./TitleScene').then(({ TitleScene }) => {
          this.game.sceneManager.replace(new TitleScene(this.game));
        });
      }
    }
  }

  private rerenderTilemap(): void {
    // Filter out wall tiles where collision grid is 0 (destroyed floors/walls)
    const grid = this.collisionGrid;
    const filteredTiles = this.currentLevel.wallTiles.filter(t => {
      const col = Math.floor(t.px[0] / TILE_SIZE);
      const row = Math.floor(t.px[1] / TILE_SIZE);
      // Keep tile only if collision cell is still solid (1) or water (2)
      return (grid[row]?.[col] ?? 0) !== 0;
    });
    this.renderer.rebuildWallLayer(filteredTiles, this.atlas);
  }

  private triggerFloorCollapse(): void {
    if (!this.anvil || !this.collapseItem) return;

    this.anvil.used = true;
    this.anvil.setShowHint(false);

    // Use MemoryDive instead of FloorCollapse
    const dive = new MemoryDive(
      this.anvil.x + this.anvil.width / 2,
      this.anvil.y,
      this.collapseItem.rarity,
    );

    dive.onShake = (intensity) => this.game.camera.shake(intensity);
    dive.onHitstop = (frames) => { this.game.hitstopFrames += frames; };
    dive.onScreenFlash = (color, intensity) => this.screenFlash.flash(color, intensity);

    this.memoryDive = dive;
    this.entityLayer.addChild(dive.container);

    // Hit sparks at anvil position
    this.hitSparks.spawn(this.anvil.x, this.anvil.y - 10, true, 0);

    dive.start();
  }

  /** Rarity → ItemTunnel level name mapping. */
  private static readonly TUNNEL_BY_RARITY: Record<Rarity, string> = {
    normal: 'ItemTunnel_01',
    magic: 'ItemTunnel_02',
    rare: 'ItemTunnel_03',
    legendary: 'ItemTunnel_04',
    ancient: 'ItemTunnel_05',
  };

  /** After floor collapse fade-out, load the tunnel level. */
  private completeFloorCollapseEntry(): void {
    if (!this.collapseItem) return;

    // Clean up dive/collapse effect
    if (this.memoryDive) {
      this.memoryDive.destroy();
      this.memoryDive = null;
    }
    if (this.floorCollapse) {
      this.floorCollapse.destroy();
      this.floorCollapse = null;
    }

    // Remember where we came from so we can return
    this.preTunnelLevelId = this.currentLevel.identifier;
    this.inItemTunnel = true;

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

  /** Called when player reaches the end of an ItemTunnel → enter Item World. */
  private enterItemWorldFromTunnel(): void {
    if (!this.collapseItem) return;

    const targetItem = this.collapseItem;

    // Hand-crafted item world (disabled — using procedural generation by rarity)
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
    this.hud.container.visible = false;
    if (this.minimap) this.minimap.visible = false;

    const itemWorldScene = new ItemWorldScene(this.game, targetItem, this.inventory, this.player);
    itemWorldScene.onComplete = () => {
      this.game.sceneManager.pop();
      this.updatePlayerAtk();

      if (targetItem.level > prevLevel) {
        this.toast.show(`${targetItem.def.name} Level Up! Lv${targetItem.level}`, 0xff88ff);
      }
      if (this.player.atk !== prevAtk) {
        this.toast.show(`ATK ${prevAtk} -> ${this.player.atk}`, 0xffff44);
      }

      // Return to the forge room (not the tunnel)
      this.inItemTunnel = false;
      if (this.preTunnelLevelId) {
        this.loadLevel(this.preTunnelLevelId, 'down');
        this.preTunnelLevelId = null;
      }
      this.collapseItem = null;

      // Spawn next to anvil (collapse point)
      if (this.anvil) {
        this.player.x = this.anvil.x + this.anvil.width / 2 + 8;
        this.player.y = this.anvil.y - this.player.height;
        this.player.vx = 0;
        this.player.vy = 0;
        this.player.savePrevPosition();
        this.game.camera.snap(this.player.x, this.player.y);
      }
    };

    this.game.sceneManager.push(itemWorldScene, true);
  }

  /**
   * Enter a hand-crafted item world level (fixedLevelId).
   * Uses the same LdtkWorldScene level loading — player spawns at Player entity.
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
      itemWorldScene.onComplete = () => {
        this.game.sceneManager.pop();
        this.inItemTunnel = false;
        if (this.preTunnelLevelId) {
          this.loadLevel(this.preTunnelLevelId, 'down');
          this.preTunnelLevelId = null;
        }
        this.collapseItem = null;
        // Spawn next to anvil
        if (this.anvil) {
          this.player.x = this.anvil.x + this.anvil.width / 2 + 8;
          this.player.y = this.anvil.y - this.player.height;
          this.player.vx = 0;
          this.player.vy = 0;
          this.player.savePrevPosition();
          this.game.camera.snap(this.player.x, this.player.y);
        }
      };
      this.container.visible = false;
      this.hud.container.visible = false;
      if (this.minimap) this.minimap.visible = false;
      this.game.sceneManager.push(itemWorldScene, true);
      return;
    }

    // Track that we're in a fixed item world (for return logic)
    this.inFixedItemWorld = true;
    this.fixedItemWorldItem = item;

    // Load the hand-crafted level — 'down' uses Player entity spawn
    this.inItemTunnel = false;
    this.loadLevel(levelId, 'down');

    // First entry landing dialogue (Screen 10)
    if (this.game.stats.firstEchoStrike && !this.game.stats.firstItemWorldLanding) {
      this.game.stats.firstItemWorldLanding = true;
      // setTimeout(() => this.dialogueManager.fireEvent('first_itemworld_landing'), 1500);
    }
  }

  /** Exit fixed item world — return to the forge room. */
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

    // Place player next to anvil if it exists
    if (this.anvil) {
      this.player.x = this.anvil.x + this.anvil.width / 2 + 8;
      this.player.y = this.anvil.y - this.player.height;
      this.player.vx = 0;
      this.player.vy = 0;
      this.player.savePrevPosition();
      this.game.camera.snap(this.player.x, this.player.y);
    }

    // First commission return — trigger Screen 15~17 sequence
    if (this.game.stats.firstEchoStrike && !this.game.stats.forgeReturnSequenceDone) {
      this.game.stats.forgeReturnSequenceDone = true;
      setTimeout(() => this.runForgeReturnSequence(), 1000);
    }
  }

  /**
   * Screen 15~17 auto sequence after first item world return.
   * freezePlayer dialogues chained sequentially.
   */
  private async runForgeReturnSequence(): Promise<void> {
    // // Screen 15 — check sword stats
    // await this.dialogueManager.fireEvent('forge_return_check');
    // // Screen 15 — refusal
    // await this.dialogueManager.fireEvent('forge_return_refusal');
    // // Screen 16 — Marta's note (echo_shelved)
    // await this.dialogueManager.fireEvent('echo_shelved');
    // // Screen 17 — Sera silhouette
    // await this.dialogueManager.fireEvent('marta_note_complete');
    // Unlock the door
    this.unlockDoors('marta_sequence_complete');
    // // Hint to leave
    // setTimeout(() => {
    //   this.dialogueManager.fireEvent('forge_return_hint');
    // }, 500);
  }

  // ---------------------------------------------------------------------------
  // Narrative event chains
  // ---------------------------------------------------------------------------

  /**
   * Fire a narrative event. Handles chained events:
   * - echo_shelved → marta_note_complete (with silhouette)
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
    // 1. Echo vibration — shake player for 1 second
    this.player.startVibrate(2, 60, false); // amplitude=2px, 60 frames ≈ 1s

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
  private worldMap!: WorldMapOverlay;

  private drawMinimap(): void {
    if (this.minimap) {
      if (this.minimap.parent) this.minimap.parent.removeChild(this.minimap);
    }
    this.minimap = new Container();

    const worldMap = this.loader.getWorldMap()
      .filter(r => !r.id.startsWith('ItemTunnel') && !r.id.startsWith('ItemWorld'));
    if (worldMap.length === 0) return;

    // Only show visited rooms + their immediate neighbors (as silhouettes)
    const visibleIds = new Set<string>();
    const adjacentIds = new Set<string>();
    for (const id of this.visitedLevels) {
      visibleIds.add(id);
      const level = this.loader.getLevel(id);
      if (level) {
        for (const nb of level.neighbors) {
          if (!visibleIds.has(nb)) adjacentIds.add(nb);
        }
      }
    }

    const relevantMap = worldMap.filter(r => visibleIds.has(r.id) || adjacentIds.has(r.id));
    if (relevantMap.length === 0) return;

    // Find bounds of visible area
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const r of relevantMap) {
      minX = Math.min(minX, r.x);
      minY = Math.min(minY, r.y);
      maxX = Math.max(maxX, r.x + r.w);
      maxY = Math.max(maxY, r.y + r.h);
    }

    const worldW = maxX - minX;
    const worldH = maxY - minY;
    const mapW = 80;
    const mapH = 60;
    const scale = Math.min(mapW / worldW, mapH / worldH);
    const actualW = worldW * scale + 4;
    const actualH = worldH * scale + 4;

    // Background
    const bg = new Graphics();
    bg.rect(0, 0, actualW, actualH).fill({ color: 0x000000, alpha: 0.5 });
    bg.rect(0, 0, actualW, actualH).stroke({ color: 0x445566, width: 0.5 });
    this.minimap.addChild(bg);

    // Draw rooms
    for (const r of relevantMap) {
      const rx = (r.x - minX) * scale + 2;
      const ry = (r.y - minY) * scale + 2;
      const rw = Math.max(2, r.w * scale);
      const rh = Math.max(2, r.h * scale);

      const isCurrent = r.id === this.currentLevel?.identifier;
      const visited = this.visitedLevels.has(r.id);
      const adjacent = adjacentIds.has(r.id);

      let color: number;
      let alpha: number;
      if (isCurrent) {
        color = 0x44ff44; alpha = 1.0;
      } else if (visited) {
        color = 0x5577aa; alpha = 0.8;
      } else if (adjacent) {
        color = 0x333344; alpha = 0.4;
      } else {
        continue;
      }

      const g = new Graphics();
      g.rect(rx, ry, rw, rh).fill({ color, alpha });
      if (visited || isCurrent) {
        g.rect(rx, ry, rw, rh).stroke({ color: 0x88aacc, width: 0.5 });
      }
      this.minimap.addChild(g);
    }

    // Markers — save points
    for (const r of relevantMap) {
      if (!this.visitedLevels.has(r.id)) continue;
      const level = this.loader.getLevel(r.id);
      if (!level) continue;
      const hasSave = level.entities.some(e => e.type === 'GameSaver');
      if (hasSave) {
        const rx = (r.x - minX) * scale + 2 + (r.w * scale) / 2;
        const ry = (r.y - minY) * scale + 2 + (r.h * scale) / 2;
        const marker = new Graphics();
        marker.circle(rx, ry, 1.5).fill(0xff4444);
        this.minimap.addChild(marker);
      }
    }

    // Position at top-right corner
    this.minimap.x = GAME_WIDTH - actualW - 4;
    this.minimap.y = 4;
    this.minimap.alpha = 0.85;
    this.game.app.stage.addChild(this.minimap);
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
}
