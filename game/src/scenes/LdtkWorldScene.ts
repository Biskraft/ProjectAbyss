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
import type { LdtkLevel, LdtkTile } from '@level/LdtkLoader';
import { Player } from '@entities/Player';
import { Skeleton } from '@entities/Skeleton';
import { GoldenMonster, getDifficultyTier } from '@entities/GoldenMonster';
import { Ghost } from '@entities/Ghost';
import { Slime } from '@entities/Slime';
import { Guardian } from '@entities/Guardian';
import { Projectile } from '@entities/Projectile';
import { Portal, type PortalSourceType } from '@entities/Portal';
import { Altar } from '@entities/Altar';
import { Anvil } from '@entities/Anvil';
import { LockedDoor, type UnlockCondition } from '@entities/LockedDoor';
import { Switch } from '@entities/Switch';
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
import { HitSparkManager } from '@effects/HitSpark';
import { ScreenFlash } from '@effects/ScreenFlash';
import { ToastManager } from '@ui/Toast';
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

  // Anvil + Floor Collapse system
  private anvil: Anvil | null = null;
  private floorCollapse: FloorCollapse | null = null;
  private collapseItem: ItemInstance | null = null;
  /** True while player is inside an ItemTunnel level, heading to Item World. */
  private inItemTunnel = false;
  /** The level to return to after exiting Item World via tunnel. */
  private preTunnelLevelId: string | null = null;
  /** True while inside a fixed (hand-crafted) item world level. */
  private inFixedItemWorld = false;
  private fixedItemWorldItem: ItemInstance | null = null;

  // Cleared level tracking
  private clearedLevels: Set<string> = new Set();
  private collectedItems: Set<string> = new Set();
  private collectedRelics: Set<string> = new Set();
  private relicMarkers: Array<{ gfx: Graphics; abilityName: string; relicKey: string }> = [];
  private lockedDoors: LockedDoor[] = [];
  private switches: Switch[] = [];
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
    this.inventory = new Inventory();
    const starterSword = createItem(SWORD_DEFS[0]);
    this.inventory.add(starterSword);
    this.inventory.equip(starterSword.uid);

    // Commission: the old sword from the opening note (Magic grade, anvil-only)
    const commissionSword = createItem(SWORD_DEFS[1]); // Magic grade
    commissionSword.commission = true;
    commissionSword.fixedLevelId = 'ItemWorld_FirstSword';
    (commissionSword.def as any) = { ...commissionSword.def, name: 'Old Sword (Commission)' };
    this.inventory.add(commissionSword);

    // Fetch and parse LDtk project
    const json = await fetch(LDTK_PATH).then((r) => r.json()) as Record<string, unknown>;
    this.loader = new LdtkLoader();
    this.loader.load(json);

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

    // Find the level containing a Player entity; fall back to hardcoded level
    this.playerSpawnLevelId = this.findPlayerSpawnLevel();
    this.loadLevel(this.playerSpawnLevelId, 'down');
    this.initialized = true;

  }

  enter(): void {
    this.container.visible = true;
    if (this.hud) this.hud.container.visible = true;

    // Restore collision + tileset if collapse was active
    if (this.floorCollapse) {
      this.floorCollapse.restore();
      this.floorCollapse.destroy();
      this.floorCollapse = null;
    }

    // Always re-sync collision grid and tilemap from current level data
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
    if (!this.initialized) return;

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
      this.tutorialHint.tryShow('hint_combat', 'Arrow: Move  Z: Jump  X: Attack  C: Dash');
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

    // Floor collapse in progress — all input blocked, camera frozen
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
      // Transition just ended — force snap for several frames to prevent lerp jitter
      this.postTransitionSnapFrames = 30; // ~0.5s snap to let physics settle
    }

    // Player
    this.player.update(dt);

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
          const dmg = Math.max(1, proj.atk - this.player.def * 0.5);
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

    // Enemy attacks — Sakurai: player hit feedback (vibration + flash + directional shake)
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      const isAttacking =
        (enemy instanceof Skeleton || enemy instanceof GoldenMonster || enemy instanceof Guardian) &&
        enemy.isAttackActive();
      if (isAttacking) {
        if (this.player.invincible || this.player.hp <= 0) continue;
        const dx = Math.abs(
          (enemy.x + enemy.width / 2) - (this.player.x + this.player.width / 2),
        );
        const dy = Math.abs(
          (enemy.y + enemy.height / 2) - (this.player.y + this.player.height / 2),
        );
        if (
          dx < enemy.width + this.player.width &&
          dy < Math.max(enemy.height, this.player.height)
        ) {
          const dir = enemy.facingRight ? 1 : -1;
          const dmg = Math.max(1, enemy.atk - this.player.def * 0.5);
          this.player.onHit(dir * 100, -50, 200);
          this.player.hp -= dmg;
          this.player.invincible = true;
          this.player.invincibleTimer = 500;
          // if (enemy instanceof Skeleton) {
          //   this.dialogueManager.fireEvent('first_skeleton_hit');
          // }

          // Sakurai feedback: victim vibrates, flash, directional shake
          this.player.startVibrate(4, 5, this.player.vy === 0);
          this.player.triggerFlash();
          this.game.hitstopFrames = 3;
          this.game.camera.shakeDirectional(3, dir, -0.3);
          this.screenFlash.flashDamage(dmg > 20);

          // Hit spark at player position
          const hitX = this.player.x + this.player.width / 2;
          const hitY = this.player.y + this.player.height * 0.4;
          this.hitSparks.spawn(hitX, hitY, false, -dir);

          if (this.player.hp <= 0) {
            this.player.hp = 0;
            this.player.onDeath();
            // Kill = extra hitstop + heavy screen flash
            this.game.hitstopFrames = 8;
            this.screenFlash.flashDamage(true);
          }
        }
      }
    }

    // Ability Relic pickups
    for (let i = this.relicMarkers.length - 1; i >= 0; i--) {
      const { gfx, abilityName, relicKey } = this.relicMarkers[i];
      const dx = Math.abs((this.player.x + this.player.width / 2) - gfx.x);
      const dy = Math.abs((this.player.y + this.player.height / 2) - gfx.y);
      if (dx < 16 && dy < 16) {
        this.collectedRelics.add(relicKey);
        if (abilityName === 'wallJump') {
          this.player.abilities.wallJump = true;
          this.toast.show('Wall Jump unlocked!', 0xffd700);
        } else if (abilityName === 'doubleJump') {
          this.player.abilities.doubleJump = true;
          this.toast.show('Double Jump unlocked!', 0xffd700);
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
    for (const door of this.lockedDoors) door.update(dt);

    // Portal interactions
    this.updatePortals(dt);

    // Area dialogue triggers
    if (this.currentLevel) {
      this.dialogueManager.checkAreaTriggers(
        this.player.x, this.player.y, this.currentLevel.identifier,
      );
    }

    // Room transition detection — edge-based
    this.checkLevelEdges();

    // Camera zone detection — check if player entered/exited a camera area
    this.updateCameraZones();

    // HUD
    this.hud.updateHP(this.player.hp, this.player.maxHp);
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
  }

  render(alpha: number): void {
    if (!this.initialized) return;
    this.player.render(alpha);
    for (const enemy of this.enemies) enemy.render(alpha);
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
    if ((enemy as any)._isBoss) {
      const bossX = enemy.x + enemy.width / 2;
      const bossY = enemy.y + enemy.height - 4;

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

    // Render tiles
    this.renderer.clear();
    this.renderer.renderLevel(level.backgroundTiles, level.wallTiles, level.shadowTiles, this.atlas);

    // Collision grid — same format as WorldScene.roomData
    this.collisionGrid = level.collisionGrid;

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

    if (level.roomType !== 'Shop') {
      this.spawnEnemiesFromLdtk(level);
    }
    this.spawnAnvilFromLdtk(level);

    // Spawn locked doors and switches
    this.spawnLockedDoors(level);
    this.spawnSwitches(level);

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

    const camX = this.player.x + this.player.width / 2;
    const camY = this.player.y + this.player.height / 2;
    cam.target = { x: camX, y: camY };
    cam.snap(camX, camY);

    // Update minimap
    this.drawMinimap();

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

  /** Check player attack against locked doors (stat conditions only). */
  private checkAttackOnDoors(): void {
    if (!this.player.isAttackActive()) return;

    const step = COMBO_STEPS[this.player.comboIndex];
    if (!step) return;

    const hitbox = getAttackHitbox(
      this.player.x, this.player.y, this.player.width, this.player.height,
      this.player.facingRight ?? true, step,
    );

    for (let i = this.lockedDoors.length - 1; i >= 0; i--) {
      const door = this.lockedDoors[i];
      if (!door.locked) continue;
      if (!aabbOverlap(hitbox, door.getHitAABB())) continue;

      const playerStats: Record<string, number> = {
        atk: this.player.atk,
        def: this.player.def,
      };

      const result = door.tryAttackUnlock(playerStats, this.collisionGrid);

      if (result === 'unlocked') {
        this.unlockedEvents.add(door.iid);
        // Break effect — camera shake + flash
        this.game.camera.shake(6);
        this.screenFlash.flashHit(true);
        this.toast.show('Gate Destroyed!', 0x44ffaa);
        door.destroy();
        this.lockedDoors.splice(i, 1);
      } else if (result === 'rejected') {
        // Brief shake + feedback
        this.game.camera.shake(2);
        const threshold = door.statThreshold;
        const current = playerStats[door.statType] ?? 0;
        this.toast.show(`${door.statType.toUpperCase()} ${current} / ${threshold} required`, 0xff4444);
      }
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

    // Boss entities — Guardian (기억의 수문장)
    const bossEntities = level.entities.filter(e => e.type === 'Boss');
    for (const ent of bossEntities) {
      const boss = new Guardian();
      (boss as any)._isBoss = true;
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
      // Use LDtk-placed spawners
      const grid = level.collisionGrid;
      const levelSeed = (level.worldX * 31 + level.worldY * 17) >>> 0;
      const dist = Math.round(Math.sqrt(level.worldX ** 2 + level.worldY ** 2) / 200);
      const scale = 1 + dist * 0.15;
      const tier = getDifficultyTier(dist);

      for (const spawner of spawners) {
        const enemyType = (spawner.fields['type'] as string) ?? 'Skeleton';
        const enemyLevel = (spawner.fields['level'] as number) ?? 1;
        const localScale = scale * (1 + (enemyLevel - 1) * 0.1);

        let enemy: Enemy<string>;
        if (enemyType === 'Golden') {
          const golden = new GoldenMonster(tier);
          golden.onDeathCallback = (x, y, rarity) => this.spawnPortal(x, y, rarity, 'monster');
          enemy = golden;
        } else if (enemyType === 'Ghost') {
          enemy = new Ghost();
        } else if (enemyType === 'Slime') {
          enemy = new Slime();
        } else if (enemyType === 'Boss') {
          const g = new Guardian();
          (g as any)._isBoss = true;
          enemy = g;
        } else {
          enemy = new Skeleton();
        }

        enemy.hp = enemy.maxHp = Math.floor(enemy.maxHp * localScale);
        enemy.atk = Math.floor(enemy.atk * localScale);
        enemy.x = spawner.px[0];
        enemy.y = spawner.px[1] - enemy.height;
        enemy.roomData = this.collisionGrid;
        enemy.target = this.player;
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

          const itemType = ent.fields['type'] as string ?? 'Gold';
          if (itemType === 'Healing_potion') {
            // TODO: potion pickup
          } else {
            const swordDef = SWORD_DEFS[0];
            const item = createItem(swordDef);
            const drop = new ItemDropEntity(ent.px[0], ent.px[1], item);
            (drop as any)._itemKey = itemKey;
            this.drops.push(drop);
            this.entityLayer.addChild(drop.container);
          }
          break;
        }
        case 'GameSaver': {
          // Save point — show a visual marker, save on interaction
          const marker = new Graphics();
          marker.rect(-6, -6, 12, 12).fill({ color: 0x44ffaa, alpha: 0.6 });
          marker.rect(-6, -6, 12, 12).stroke({ color: 0x44ffaa, width: 1 });
          marker.x = ent.px[0];
          marker.y = ent.px[1];
          this.entityLayer.addChild(marker);
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
        case 'Teleport': {
          // TODO: teleport to destination entity
          break;
        }
        case 'Exit': {
          // Exits are handled by edge detection, not entity interaction
          break;
        }
        case 'Camera': {
          const pivotX = ent.px[0];
          const pivotY = ent.px[1];
          this.cameraZones.push({
            x: pivotX - ent.width / 2,
            y: pivotY - ent.height / 2,
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

    const bg = new Graphics();
    bg.rect(0, 0, GAME_WIDTH, GAME_HEIGHT).fill({ color: 0x000000, alpha: 0.7 });
    overlay.addChild(bg);

    const title = new BitmapText({
      text: 'GAME OVER',
      style: { fontFamily: PIXEL_FONT, fontSize: 12, fill: 0xff4444 },
    });
    title.anchor.set(0.5);
    title.x = 240;
    title.y = 120;
    overlay.addChild(title);

    const hint = new BitmapText({
      text: 'Press Z or X to respawn',
      style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0xaaaaaa },
    });
    hint.anchor.set(0.5);
    hint.x = 240;
    hint.y = 150;
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

    // First item world (commission sword) — respawn inside, no penalty
    if (this.inFixedItemWorld && this.fixedItemWorldItem?.commission) {
      // 50% HP, no EXP loss, no stratum rollback
      this.player.respawn();
      this.player.hp = Math.floor(this.player.maxHp * 0.5);
      // Reload same level (boss HP preserved via enemy persistence)
      this.loadLevel(this.fixedItemWorldItem.fixedLevelId!, 'down');
      this.player.savePrevPosition();
      this.game.camera.snap(this.player.x, this.player.y);
      return;
    }

    // Clear fixed item world / tunnel state
    this.inFixedItemWorld = false;
    this.fixedItemWorldItem = null;
    this.inItemTunnel = false;
    this.collapseItem = null;

    // Return to player spawn level
    this.loadLevel(this.playerSpawnLevelId, 'down');
    this.player.respawn();
    this.player.savePrevPosition();
    this.game.camera.snap(this.player.x, this.player.y);
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

  private rerenderTilemap(): void {
    const collapsed = this.floorCollapse?.collapsedPositions;

    // Only rebuild the wall layer — background and shadows stay intact
    this.renderer.rebuildWallLayer(
      collapsed && collapsed.size > 0
        ? this.currentLevel.wallTiles.filter(t => {
            const col = Math.floor(t.px[0] / TILE_SIZE);
            const row = Math.floor(t.px[1] / TILE_SIZE);
            return !collapsed.has(`${col},${row}`) && !collapsed.has(`${col},${row + 1}`);
          })
        : this.currentLevel.wallTiles,
      this.atlas,
    );
  }

  private triggerFloorCollapse(): void {
    if (!this.anvil || !this.collapseItem) return;

    this.anvil.used = true;
    this.anvil.setShowHint(false);

    // Deep-copy collision grid so the original level data stays intact for restore
    const gridW = this.collisionGrid[0]?.length ?? 0;
    const workingGrid = this.collisionGrid.map(row => row.slice());
    // Extend downward so player can fall past the map bottom
    for (let i = 0; i < 30; i++) {
      workingGrid.push(new Array(gridW).fill(0));
    }
    this.collisionGrid = workingGrid;
    this.player.roomData = workingGrid;

    const collapse = new FloorCollapse(
      this.anvil.x,
      this.anvil.y,
      this.collapseItem.rarity,
      workingGrid,
    );

    collapse.onShake = (intensity) => this.game.camera.shake(intensity);
    collapse.onHitstop = (frames) => { this.game.hitstopFrames += frames; };
    collapse.onScreenFlash = (color, intensity) => this.screenFlash.flash(color, intensity);
    collapse.onTilesRemoved = () => this.rerenderTilemap();

    this.floorCollapse = collapse;
    this.entityLayer.addChild(collapse.container);

    // Hit sparks at anvil position
    this.hitSparks.spawn(this.anvil.x, this.anvil.y - 10, true, 0);

    // First echo strike — extended hitstop (10 frames vs normal)
    if (this.collapseItem.commission && !this.game.stats.firstEchoStrike) {
      this.game.stats.firstEchoStrike = true;
      this.game.hitstopFrames = 10;
    }

    collapse.start();
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

    // Clean up collapse effect
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

    // Fixed (hand-crafted) item world — load LDtk level directly
    if (targetItem.fixedLevelId) {
      this.enterFixedItemWorld(targetItem);
      return;
    }

    const prevLevel = targetItem.level;
    const prevAtk = this.player.atk;

    this.container.visible = false;
    this.hud.container.visible = false;

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
      };
      this.container.visible = false;
      this.hud.container.visible = false;
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

  private drawMinimap(): void {
    if (this.minimap) {
      if (this.minimap.parent) this.minimap.parent.removeChild(this.minimap);
    }
    this.minimap = new Container();

    const worldMap = this.loader.getWorldMap()
      .filter(r => !r.id.startsWith('ItemTunnel') && !r.id.startsWith('ItemWorld'));
    if (worldMap.length === 0) return;

    // Find bounds
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const r of worldMap) {
      minX = Math.min(minX, r.x);
      minY = Math.min(minY, r.y);
      maxX = Math.max(maxX, r.x + r.w);
      maxY = Math.max(maxY, r.y + r.h);
    }

    const worldW = maxX - minX;
    const worldH = maxY - minY;
    const mapW = 80;
    const mapH = 50;
    const scale = Math.min(mapW / worldW, mapH / worldH);

    // Background
    const bg = new Graphics();
    bg.rect(0, 0, mapW + 4, mapH + 4).fill({ color: 0x000000, alpha: 0.6 });
    this.minimap.addChild(bg);

    for (const r of worldMap) {
      const rx = (r.x - minX) * scale + 2;
      const ry = (r.y - minY) * scale + 2;
      const rw = Math.max(2, r.w * scale);
      const rh = Math.max(2, r.h * scale);

      const isCurrent = r.id === this.currentLevel?.identifier;
      const visited = this.clearedLevels.has(r.id);
      const color = isCurrent ? 0x44ff44 : visited ? 0x6688aa : 0x334455;

      const g = new Graphics();
      g.rect(rx, ry, rw, rh).fill(color);
      g.rect(rx, ry, rw, rh).stroke({ color: 0x88aacc, width: 0.5 });
      this.minimap.addChild(g);
    }

    // Position at top-right corner
    this.minimap.x = GAME_WIDTH - mapW - 8;
    this.minimap.y = 4;
    this.game.app.stage.addChild(this.minimap);
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
