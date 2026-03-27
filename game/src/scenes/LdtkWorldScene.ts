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
import { GoldenMonster, getDifficultyTier } from '@entities/GoldenMonster';
import { Ghost } from '@entities/Ghost';
import { Projectile } from '@entities/Projectile';
import { Portal, type PortalSourceType } from '@entities/Portal';
import { Altar } from '@entities/Altar';
import { HitManager } from '@combat/HitManager';
import { HUD } from '@ui/HUD';
import { ControlsOverlay } from '@ui/ControlsOverlay';
import { InventoryUI } from '@ui/InventoryUI';
import { Inventory } from '@items/Inventory';
import { ItemDropEntity, rollDrop, rollGoldenDrop } from '@items/ItemDrop';
import { SWORD_DEFS } from '@data/weapons';
import { createItem } from '@items/ItemInstance';
import type { ItemInstance } from '@items/ItemInstance';
import { ItemWorldScene } from './ItemWorldScene';
import { PortalTransition } from '@effects/PortalTransition';
import { HitSparkManager } from '@effects/HitSpark';
import { ScreenFlash } from '@effects/ScreenFlash';
import { ToastManager } from '@ui/Toast';
import { PIXEL_FONT } from '@ui/fonts';
import { DamageNumberManager } from '@ui/DamageNumber';
import { PRNG } from '@utils/PRNG';
import type { Rarity } from '@data/weapons';
import type { Enemy } from '@entities/Enemy';
import type { CombatEntity } from '@combat/HitManager';
import type { Game } from '../Game';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TILE_SIZE = 16;
const FADE_DURATION = 200;

const LDTK_PATH = 'assets/World_ProjectAbyss_Layout.ldtk';
const ATLAS_PATH = 'assets/atlas/SunnyLand_by_Ansimuz-extended.png';
const ENTRANCE_LEVEL = 'Entrance';

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

  // Layers
  private entityLayer!: Container;

  // Entities
  private player!: Player;
  private enemies: Enemy[] = [];
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

  // Cleared level tracking
  private clearedLevels: Set<string> = new Set();
  private collectedRelics: Set<string> = new Set();
  private relicMarkers: Array<{ gfx: Graphics; abilityName: string; relicKey: string }> = [];

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
    this.fadeOverlay.rect(0, 0, 480, 270).fill(0x000000);
    this.fadeOverlay.alpha = 0;
    this.game.app.stage.addChild(this.fadeOverlay);

    // HUD
    this.hud = new HUD();
    this.game.app.stage.addChild(this.hud.container);

    // Controls overlay
    this.controlsOverlay = new ControlsOverlay();
    this.game.app.stage.addChild(this.controlsOverlay.container);

    // Toast, damage numbers, hit sparks, screen flash
    this.toast = new ToastManager(this.game.app.stage);
    this.dmgNumbers = new DamageNumberManager(this.entityLayer);
    this.hitSparks = new HitSparkManager(this.entityLayer);
    this.screenFlash = new ScreenFlash();
    this.game.app.stage.addChild(this.screenFlash.overlay);

    // Inventory UI
    this.inventoryUI = new InventoryUI(this.inventory);
    this.game.app.stage.addChild(this.inventoryUI.container);

    // Load the entrance level
    this.loadLevel(ENTRANCE_LEVEL, 'down');
    this.initialized = true;

  }

  enter(): void {
    // Re-show everything when returning from Item World
    this.container.visible = true;
    if (this.hud) this.hud.container.visible = true;
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

    // Toast always updates (even during transitions / game over)
    this.toast.update(dt);

    // Portal transition playing
    if (this.portalTransition) {
      this.portalTransition.update(dt);
      this.game.camera.update(dt);
      if (this.portalTransition.isDone) {
        this.completePendingPortalEntry();
      }
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

    // Altar selection UI
    if (this.altarSelectActive) {
      this.updateAltarInput();
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

      // Enemy just died — roll drop
      if (wasAlive && !enemy.alive) {
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
        }
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
        this.dmgNumbers.spawn(hit.hitX, hit.hitY - 8, hit.damage, hit.heavy);
        this.hitSparks.spawn(hit.hitX, hit.hitY, hit.heavy, hit.dirX);
        if (hit.heavy) this.screenFlash.flashHit(true);
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
        (enemy instanceof Skeleton || enemy instanceof GoldenMonster) &&
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
          this.toast.show(`Got ${drop.item.def.name} [${drop.item.rarity.toUpperCase()}]`, 0xffcc44);
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
        const heal = Math.floor(this.player.maxHp * 0.2);
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + heal);
        this.toast.show(`Room Clear! +${heal} HP`, 0x44ff44);
      }
    }

    // Portal & Altar interactions (portals take priority over altars)
    const portalEntered = this.updatePortals(dt);
    if (!portalEntered) {
      this.updateAltars(dt);
    }

    // Room transition detection — edge-based
    this.checkLevelEdges();

    // HUD
    this.hud.updateHP(this.player.hp, this.player.maxHp);
    this.hud.setFloorText(`${this.currentLevel?.identifier ?? ''} ATK:${this.player.atk}`);

    // Damage numbers & Sakurai hit effects
    this.dmgNumbers.update(dt);
    this.hitSparks.update(dt);
    this.screenFlash.update(dt);

    // Camera — pixel-perfect snap with deadzone (no lerp = no jitter)
    const cx = this.player.x + this.player.width / 2;
    const cy = this.player.y + this.player.height / 2;
    const cam = this.game.camera;
    const dz = cam.deadZoneX;
    const dzY = cam.deadZoneY;

    // Only move camera when player exits the deadzone
    const dx = cx - cam.x;
    const dy = cy - cam.y;
    if (Math.abs(dx) > dz) cam.x = cx - Math.sign(dx) * dz;
    if (Math.abs(dy) > dzY) cam.y = cy - Math.sign(dy) * dzY;

    // Bounds clamp
    cam.setBounds(0, 0, this.currentLevel.pxWid, this.currentLevel.pxHei);
    cam.target = { x: cx, y: cy };
    // Force renderX/Y to match (no shake during normal play)
    cam.snap(cam.x, cam.y);
  }

  render(alpha: number): void {
    if (!this.initialized) return;
    this.player.render(alpha);
    for (const enemy of this.enemies) enemy.render(alpha);
    // Portals and altars are static, no interpolation needed
  }

  exit(): void {
    this.toast.clear();
    if (this.hud?.container.parent) this.hud.container.parent.removeChild(this.hud.container);
    if (this.controlsOverlay?.container.parent) {
      this.controlsOverlay.container.parent.removeChild(this.controlsOverlay.container);
    }
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
    this.clearAltars();
    for (const r of this.relicMarkers) { if (r.gfx.parent) r.gfx.parent.removeChild(r.gfx); }
    this.relicMarkers = [];

    if (level.roomType !== 'Shop') {
      this.spawnEnemiesFromLdtk(level);
      this.spawnAltarsFromLdtk(level);
    }

    // Process other LDtk entities (Items, GameSaver, etc.)
    this.processLdtkEntities(level);

    // Camera: snap + set target to prevent lerp jitter on first frame
    const camX = this.player.x + this.player.width / 2;
    const camY = this.player.y + this.player.height / 2;
    this.game.camera.target = { x: camX, y: camY };
    this.game.camera.snap(camX, camY);

    // Update minimap
    this.drawMinimap();
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
    // Scan down from passage row to find first solid tile below
    for (let row = passageRow; row < grid.length; row++) {
      if (grid[row][clampedX] >= 1) {
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

    switch (edge) {
      case 'left':
        for (let row = 0; row < grid.length; row++) { if (grid[row][0] === 0) openTiles.push(row); }
        break;
      case 'right': {
        const col = (grid[0]?.length ?? 1) - 1;
        for (let row = 0; row < grid.length; row++) { if (grid[row][col] === 0) openTiles.push(row); }
        break;
      }
      case 'up':
        for (let col = 0; col < (grid[0]?.length ?? 0); col++) { if (grid[0]?.[col] === 0) openTiles.push(col); }
        break;
      case 'down': {
        const lastRow = grid[grid.length - 1] ?? [];
        for (let col = 0; col < lastRow.length; col++) { if (lastRow[col] === 0) openTiles.push(col); }
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

  /**
   * Spawn enemies from LDtk Enemy_Spawn entities. Falls back to random
   * spawning if no Enemy_Spawn entities are placed in the level.
   */
  private spawnEnemiesFromLdtk(level: LdtkLevel): void {
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

        let enemy: Enemy;
        if (enemyType === 'Golden') {
          const golden = new GoldenMonster(tier);
          golden.onDeathCallback = (x, y, rarity) => this.spawnPortal(x, y, rarity, 'monster');
          enemy = golden;
        } else if (enemyType === 'Ghost') {
          enemy = new Ghost();
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
          const itemType = ent.fields['type'] as string ?? 'Gold';
          const count = ent.fields['count'] as number ?? 1;
          // Map LDtk item types to game items
          if (itemType === 'Healing_potion') {
            // TODO: potion pickup — for now heal player directly on pickup
          } else {
            // Create a visible drop entity at the LDtk position
            const swordDef = SWORD_DEFS[0]; // default sword for now
            const item = createItem(swordDef);
            const drop = new ItemDropEntity(ent.px[0], ent.px[1], item);
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

    if (px + pw > level.pxWid - TILE_SIZE) {
      // Check if the rightmost column at player's height is open
      const edgeCol = level.gridW - 1;
      if (playerTileY >= 0 && playerTileY < level.gridH && grid[playerTileY]?.[edgeCol] === 0) {
        direction = 'right';
      }
    } else if (px < TILE_SIZE) {
      // Check leftmost column
      if (playerTileY >= 0 && playerTileY < level.gridH && grid[playerTileY]?.[0] === 0) {
        direction = 'left';
      }
    } else if (py + ph > level.pxHei - TILE_SIZE) {
      // Check bottom row
      const edgeRow = level.gridH - 1;
      if (playerTileX >= 0 && playerTileX < level.gridW && grid[edgeRow]?.[playerTileX] === 0) {
        direction = 'down';
      }
    } else if (py < TILE_SIZE) {
      // Check top row
      if (playerTileX >= 0 && playerTileX < level.gridW && grid[0]?.[playerTileX] === 0) {
        direction = 'up';
      }
    }

    if (direction === null) return;

    // Pass player's world position so we pick the correct neighbor
    // when multiple neighbors share the same edge (e.g. two rooms to the right)
    const playerWorldX = this.currentLevel.worldX + px;
    const playerWorldY = this.currentLevel.worldY + py;
    const neighborId = this.getNeighborInDirection(direction, playerWorldX, playerWorldY);
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
    if (candidates.length > 1) {
      for (const nId of candidates) {
        const nb = this.loader.getLevel(nId);
        if (!nb) continue;
        if (direction === 'left' || direction === 'right') {
          if (playerWorldY >= nb.worldY && playerWorldY < nb.worldY + nb.pxHei) return nId;
        } else {
          if (playerWorldX >= nb.worldX && playerWorldX < nb.worldX + nb.pxWid) return nId;
        }
      }
      return candidates[0]; // fallback to first
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
          if (playerWorldY >= nb.worldY && playerWorldY < nb.worldY + nb.pxHei) return nId;
        } else {
          if (playerWorldX >= nb.worldX && playerWorldX < nb.worldX + nb.pxWid) return nId;
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
        if (this.pendingLevelId) {
          // Invert direction: player traveled RIGHT → enters new room from LEFT
          const opposite: Record<string, 'left'|'right'|'up'|'down'> = {
            left: 'right', right: 'left', up: 'down', down: 'up',
          };
          const enterFrom = opposite[this.pendingDirection!] ?? 'down';
          this.loadLevel(this.pendingLevelId, enterFrom);
          // Immediately sync prev positions so render(alpha) doesn't interpolate
          // between old room coords and new room coords
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
    bg.rect(0, 0, 480, 270).fill({ color: 0x000000, alpha: 0.7 });
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

    // Return to entrance and place player from 'down' spawn
    this.loadLevel(ENTRANCE_LEVEL, 'down');
    this.player.respawn();
    this.player.savePrevPosition();
    this.game.camera.snap(this.player.x, this.player.y);
  }

  // ---------------------------------------------------------------------------
  // Inventory UI
  // ---------------------------------------------------------------------------

  private updatePlayerAtk(): void {
    const baseStr = 10; // Lv1 STR
    this.player.atk = baseStr + this.inventory.getWeaponAtk();
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
  }

  private enterPortal(portal: Portal): void {
    this.closeAltarUI();

    const cam = this.game.camera;
    const screenX = portal.x - cam.renderX + 480 / 2;
    const screenY = portal.y - cam.renderY + 270 / 2;

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

  private drawAltarUI(): void {
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
    const px = Math.floor((480 - panelW) / 2);
    const py = Math.floor((270 - panelH) / 2);
    bg.rect(0, 0, panelW, panelH).fill({ color: 0x1a1a2e, alpha: 0.95 });
    bg.rect(0, 0, panelW, panelH).stroke({ color: 0x4a4a6a, width: 1 });
    bg.x = px;
    bg.y = py;
    ui.addChild(bg);

    const title = new BitmapText({
      text: 'Offer item to altar:',
      style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0xaaccff },
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
        style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: selected ? 0xffff44 : 0xffffff },
      });
      t.x = px + 6;
      t.y = py + 16 + i * 12;
      ui.addChild(t);
    }

    this.altarUI = ui;
    this.game.app.stage.addChild(ui);
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

  private updateAltarInput(): void {
    const input = this.game.input;
    const items = this.inventory.items;

    if (input.isJustPressed(GameAction.LOOK_UP)) {
      this.altarSelectIndex = Math.max(0, this.altarSelectIndex - 1);
      this.drawAltarUI();
      return;
    }
    if (input.isJustPressed(GameAction.LOOK_DOWN)) {
      this.altarSelectIndex = Math.min(items.length - 1, this.altarSelectIndex + 1);
      this.drawAltarUI();
      return;
    }
    if (input.isJustPressed(GameAction.ATTACK) || input.isJustPressed(GameAction.JUMP)) {
      const item = items[this.altarSelectIndex];
      if (item && this.activeAltar) {
        const altar = this.activeAltar;
        altar.used = true;
        this.closeAltarUI();
        this.spawnPortal(altar.x, altar.y - 20, item.rarity, 'altar', item);
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

  private clearAltars(): void {
    for (const a of this.altars) a.destroy();
    this.altars = [];
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

    const worldMap = this.loader.getWorldMap();
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
    this.minimap.x = 480 - mapW - 8;
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
