import { Container, Graphics, BitmapText } from 'pixi.js';
import { Scene } from '@core/Scene';
import { GameAction } from '@core/InputManager';
import { aabbOverlap } from '@core/Physics';
import { TilemapRenderer } from '@level/TilemapRenderer';
import { generateRoomGrid, type RoomGridData, type RoomCell } from '@level/RoomGrid';
import { assembleRoom, getSpawnPosition, getDoorTriggers } from '@level/ChunkAssembler';
import { Player } from '@entities/Player';
import { Skeleton } from '@entities/Skeleton';
import { GoldenMonster, getDifficultyTier } from '@entities/GoldenMonster';
import { Portal, type PortalSourceType } from '@entities/Portal';
import { Altar } from '@entities/Altar';
import { HitManager } from '@combat/HitManager';
import { HUD } from '@ui/HUD';
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

const TILE_SIZE = 16;
const ROOM_W = 60;
const ROOM_H = 34;
const FADE_DURATION = 200;
const GRID_W = 4;
const GRID_H = 4;

type TransitionState = 'none' | 'fade_out' | 'fade_in';

export class WorldScene extends Scene {
  private tilemap!: TilemapRenderer;
  private player!: Player;
  private enemies: Enemy[] = [];
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
  private fadeOverlay!: Graphics;
  private doorTriggers: ReturnType<typeof getDoorTriggers> = [];

  // Door markers
  private doorMarkers: Graphics[] = [];

  // Toast & damage numbers & Sakurai effects
  private toast!: ToastManager;
  private dmgNumbers!: DamageNumberManager;
  private hitSparks!: HitSparkManager;
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

  constructor(game: Game) {
    super(game);
  }

  init(): void {
    this.rng = new PRNG(12345);
    this.dropRng = new PRNG(99999);
    this.hitManager = new HitManager(this.game);
    this.inventory = new Inventory();

    // Give starter weapon
    const starterSword = createItem(SWORD_DEFS[0]);
    this.inventory.add(starterSword);
    this.inventory.equip(starterSword.uid);

    // Generate room grid
    this.gridData = generateRoomGrid(GRID_W, GRID_H, this.rng);
    this.currentCol = this.gridData.startRoom.col;
    this.currentRow = this.gridData.startRoom.row;

    // Tilemap
    this.tilemap = new TilemapRenderer(TILE_SIZE);
    this.container.addChild(this.tilemap.container);

    // Entity layer
    this.entityLayer = new Container();
    this.container.addChild(this.entityLayer);

    // Player
    this.player = new Player(this.game);
    this.entityLayer.addChild(this.player.container);
    this.updatePlayerAtk();

    // Fade overlay
    this.fadeOverlay = new Graphics();
    this.fadeOverlay.rect(0, 0, ROOM_W * TILE_SIZE, ROOM_H * TILE_SIZE).fill(0x000000);
    this.fadeOverlay.alpha = 0;
    this.container.addChild(this.fadeOverlay);

    // Mini-map
    this.miniMapContainer = new Container();
    this.game.app.stage.addChild(this.miniMapContainer);

    // HUD
    this.hud = new HUD();
    this.game.app.stage.addChild(this.hud.container);

    // Toast, damage numbers & Sakurai hit effects
    this.toast = new ToastManager(this.game.app.stage);
    this.dmgNumbers = new DamageNumberManager(this.entityLayer);
    this.hitSparks = new HitSparkManager(this.entityLayer);
    this.screenFlash = new ScreenFlash();
    this.game.app.stage.addChild(this.screenFlash.overlay);

    // Inventory UI
    this.inventoryUI = new InventoryUI(this.inventory);
    this.game.app.stage.addChild(this.inventoryUI.container);

    // Load starting room
    this.loadRoom('down');

    // Camera
    this.game.camera.setBounds(0, 0, ROOM_W * TILE_SIZE, ROOM_H * TILE_SIZE);
    this.game.camera.x = this.player.x;
    this.game.camera.y = this.player.y;
  }

  private updatePlayerAtk(): void {
    const baseStr = 10; // Lv1 STR
    this.player.atk = baseStr + this.inventory.getWeaponAtk();
  }

  private loadRoom(enterFrom: 'left' | 'right' | 'up' | 'down'): void {
    const cell = this.gridData.cells[this.currentRow][this.currentCol];
    const roomRng = new PRNG(this.currentCol * 1000 + this.currentRow * 100 + 42);
    this.roomData = assembleRoom(cell, roomRng);
    this.tilemap.loadRoom(this.roomData);

    this.player.roomData = this.roomData;
    const spawnSide = this.getOppositeDirection(enterFrom);
    const spawn = getSpawnPosition(spawnSide);
    this.player.x = spawn.x;
    this.player.y = spawn.y;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.savePrevPosition();

    this.doorTriggers = getDoorTriggers(cell);
    this.clearEnemies();
    this.clearDrops();
    this.clearPortals();
    this.clearAltars();

    if (!cell.cleared) {
      this.spawnEnemies(cell);
    }

    this.drawDoorMarkers(cell);

    this.game.camera.x = this.player.x;
    this.game.camera.y = this.player.y;
    cell.visited = true;
    this.drawMiniMap();
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
    const overlay = new Container();

    const bg = new Graphics();
    bg.rect(0, 0, 480, 270).fill({ color: 0x000000, alpha: 0.7 });
    overlay.addChild(bg);

    const title = new BitmapText({ text: 'GAME OVER', style: { fontFamily: PIXEL_FONT, fontSize: 12, fill: 0xff4444 } });
    title.anchor.set(0.5);
    title.x = 240;
    title.y = 120;
    overlay.addChild(title);

    const hint = new BitmapText({ text: 'Press Z or X to respawn', style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0xaaaaaa } });
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

    const spawn = getSpawnPosition('down');
    this.player.x = spawn.x;
    this.player.y = spawn.y;
    this.player.respawn();
    this.player.savePrevPosition();
    this.game.camera.x = this.player.x;
    this.game.camera.y = this.player.y;
  }

  private drawDoorMarkers(cell: RoomCell): void {
    for (const m of this.doorMarkers) {
      if (m.parent) m.parent.removeChild(m);
    }
    this.doorMarkers = [];

    const floorY = (ROOM_H - 3) * TILE_SIZE;
    const doorH = 4 * TILE_SIZE;
    const markerW = 4;

    if (cell.exits.left) {
      const marker = new Graphics();
      marker.rect(0, 0, markerW, doorH).fill({ color: 0x44ff44, alpha: 0.6 });
      marker.rect(-6, doorH / 2 - 3, 6, 6).fill({ color: 0x44ff44, alpha: 0.8 });
      marker.x = 0;
      marker.y = floorY - doorH;
      this.entityLayer.addChild(marker);
      this.doorMarkers.push(marker);
    }

    if (cell.exits.right) {
      const marker = new Graphics();
      marker.rect(0, 0, markerW, doorH).fill({ color: 0x44ff44, alpha: 0.6 });
      marker.rect(markerW, doorH / 2 - 3, 6, 6).fill({ color: 0x44ff44, alpha: 0.8 });
      marker.x = (ROOM_W - 1) * TILE_SIZE;
      marker.y = floorY - doorH;
      this.entityLayer.addChild(marker);
      this.doorMarkers.push(marker);
    }

    if (cell.exits.down) {
      const cx = Math.floor(ROOM_W / 2) * TILE_SIZE;
      const marker = new Graphics();
      marker.rect(0, 0, 3 * TILE_SIZE, markerW).fill({ color: 0x44ff44, alpha: 0.6 });
      marker.rect(TILE_SIZE, markerW, TILE_SIZE, 6).fill({ color: 0x44ff44, alpha: 0.8 });
      marker.x = cx - TILE_SIZE;
      marker.y = (ROOM_H - 1) * TILE_SIZE - markerW;
      this.entityLayer.addChild(marker);
      this.doorMarkers.push(marker);
    }

    if (cell.exits.up) {
      const cx = Math.floor(ROOM_W / 2) * TILE_SIZE;
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
  }

  private clearDrops(): void {
    for (const d of this.drops) d.destroy();
    this.drops = [];
  }

  private spawnEnemies(cell: RoomCell): void {
    const floorY = (ROOM_H - 3) * TILE_SIZE;
    const count = cell.onCriticalPath ? 2 : 3;

    // Distance from start room → difficulty scaling
    const dist = Math.abs(this.currentCol - this.gridData.startRoom.col)
               + Math.abs(this.currentRow - this.gridData.startRoom.row);
    const scale = 1 + dist * 0.15; // +15% per tile distance
    const tier = getDifficultyTier(dist);

    for (let i = 0; i < count; i++) {
      const skeleton = new Skeleton();
      skeleton.hp = skeleton.maxHp = Math.floor(skeleton.maxHp * scale);
      skeleton.atk = Math.floor(skeleton.atk * scale);

      const spawnRng = new PRNG(this.currentCol * 777 + this.currentRow * 333 + i * 111);
      skeleton.x = spawnRng.nextInt(4, ROOM_W - 5) * TILE_SIZE;
      skeleton.y = floorY - skeleton.height;
      skeleton.roomData = this.roomData;
      skeleton.target = this.player;
      this.enemies.push(skeleton);
      this.entityLayer.addChild(skeleton.container);
    }

    // Golden Monster: 0~1 per room, ~20% chance
    const goldenRng = new PRNG(this.currentCol * 555 + this.currentRow * 222 + 77);
    if (goldenRng.next() < 0.2) {
      const golden = new GoldenMonster(tier);
      golden.hp = golden.maxHp = Math.floor(golden.maxHp * scale);
      golden.atk = Math.floor(golden.atk * scale);
      golden.x = goldenRng.nextInt(6, ROOM_W - 7) * TILE_SIZE;
      golden.y = floorY - golden.height;
      golden.roomData = this.roomData;
      golden.target = this.player;
      golden.onDeathCallback = (x, y, rarity) => {
        this.spawnPortal(x, y, rarity, 'monster');
      };
      this.enemies.push(golden);
      this.entityLayer.addChild(golden.container);
    }

    // Altar: spawn in some rooms
    this.spawnAltarInRoom();
  }

  enter(): void {
    // Re-show everything when returning from item world
    this.container.visible = true;
    if (this.miniMapContainer) this.miniMapContainer.visible = true;
    if (this.hud) this.hud.container.visible = true;
    this.updatePlayerAtk();
  }

  update(dt: number): void {
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
      if (this.game.input.isJustPressed(GameAction.ATTACK) ||
          this.game.input.isJustPressed(GameAction.JUMP)) {
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
    if (this.game.input.isJustPressed(GameAction.INVENTORY)) {
      this.game.input.consumeJustPressed(GameAction.INVENTORY);
      this.inventoryUI.toggle();
    }

    if (this.inventoryUI.visible) {
      this.updateInventoryInput();
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

    // Update enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      const wasAlive = enemy.alive;
      enemy.update(dt);

      // Enemy just died — roll drop
      if (wasAlive && !enemy.alive) {
        const isGolden = enemy instanceof GoldenMonster;
        const drop = isGolden
          ? rollGoldenDrop(this.dropRng)    // guaranteed rare+ drop
          : rollDrop(this.dropRng);         // normal drop chance
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
      const targets = this.enemies.filter(e => e.alive) as CombatEntity[];
      const hits = this.hitManager.checkHits(this.player, this.player.comboIndex, this.player.hitList, targets);
      for (const hit of hits) {
        this.dmgNumbers.spawn(hit.hitX, hit.hitY - 8, hit.damage, hit.heavy);
        this.hitSparks.spawn(hit.hitX, hit.hitY, hit.heavy, hit.dirX);
        if (hit.heavy) this.screenFlash.flashHit(true);
      }
    }

    // Enemy attacks — Sakurai: player hit feedback (vibration + flash + directional shake)
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      const isAttacking = (enemy instanceof Skeleton || enemy instanceof GoldenMonster) && enemy.isAttackActive();
      if (isAttacking) {
        if (this.player.invincible || this.player.hp <= 0) continue;
        const dx = Math.abs((enemy.x + enemy.width / 2) - (this.player.x + this.player.width / 2));
        const dy = Math.abs((enemy.y + enemy.height / 2) - (this.player.y + this.player.height / 2));
        if (dx < enemy.width + this.player.width && dy < Math.max(enemy.height, this.player.height)) {
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

    // Room cleared
    const aliveCount = this.enemies.filter(e => e.alive).length;
    if (aliveCount === 0) {
      const cell = this.gridData.cells[this.currentRow][this.currentCol];
      if (!cell.cleared) {
        cell.cleared = true;
        // Heal 20% on room clear
        const heal = Math.floor(this.player.maxHp * 0.2);
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + heal);
        this.toast.show(`Room Clear! +${heal} HP`, 0x44ff44);
        this.drawMiniMap();
      }
    }

    // Portal & Altar interactions (portals take priority over altars)
    const portalEntered = this.updatePortals(dt);
    if (!portalEntered) {
      this.updateAltars(dt);
    }

    // Door triggers
    this.checkDoorTriggers();

    // HUD
    this.hud.updateHP(this.player.hp, this.player.maxHp);
    this.hud.setFloorText(`ATK:${this.player.atk} Items:${this.inventory.items.length}`);

    // Toast, damage numbers & Sakurai hit effects
    this.toast.update(dt);
    this.dmgNumbers.update(dt);
    this.hitSparks.update(dt);
    this.screenFlash.update(dt);

    // Camera
    this.game.camera.target = {
      x: this.player.x + this.player.width / 2,
      y: this.player.y + this.player.height / 2,
    };
    this.game.camera.update(dt);
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
      this.hud.setFloorText(`ATK:${this.player.atk} Items:${this.inventory.items.length}`);
    }
    if (input.isJustPressed(GameAction.MENU)) this.inventoryUI.close();
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
    if (rarity !== 'common') {
      this.toast.show(`${rarity.toUpperCase()} Portal appeared!`, 0xffcc44);
    }
  }

  private enterPortal(portal: Portal): void {
    // Close altar UI if open
    this.closeAltarUI();

    // Calculate portal screen position for transition
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

    // Remove portal from world
    const idx = this.portals.indexOf(portal);
    if (idx >= 0) this.portals.splice(idx, 1);
    portal.destroy();

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

    const isAltar = data.sourceType === 'altar';

    // For monster portals, create the dungeon reward item
    let dungeonItem: ItemInstance | undefined;
    if (!isAltar) {
      const defs = SWORD_DEFS.filter(d => d.rarity === data.rarity);
      const def = defs.length > 0 ? defs[0] : SWORD_DEFS[0];
      dungeonItem = createItem(def, data.rarity);
    }

    const targetItem = isAltar ? data.sourceItem! : dungeonItem!;
    const prevLevel = targetItem.level;
    const prevAtk = this.player.atk;

    // Clean up transition
    if (this.portalTransition) {
      this.portalTransition.destroy();
      this.portalTransition = null;
    }

    // Hide world
    this.container.visible = false;
    this.miniMapContainer.visible = false;
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
          this.toast.show(`Got ${dungeonItem!.def.name} [${dungeonItem!.rarity.toUpperCase()}]`, 0xffcc44);
        }
      }
      if (this.player.atk !== prevAtk) {
        this.toast.show(`ATK ${prevAtk} -> ${this.player.atk}`, 0xffff44);
      }
    };

    this.game.sceneManager.push(itemWorldScene, true);
  }

  private spawnAltarInRoom(): void {
    // Spawn altar in ~30% of rooms (capped at 2 total in the grid)
    const totalAltars = this.altars.length;
    if (totalAltars >= 2) return;
    if (Math.random() > 0.3) return;

    const floorY = (ROOM_H - 3) * TILE_SIZE;
    const altarX = (ROOM_W / 2) * TILE_SIZE + (Math.random() - 0.5) * 6 * TILE_SIZE;
    const altar = new Altar(altarX, floorY);
    this.altars.push(altar);
    this.entityLayer.addChild(altar.container);
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
    // Destroy previous UI completely before creating new one
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

    const title = new BitmapText({ text: 'Offer item to altar:', style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0xaaccff } });
    title.x = px + 6;
    title.y = py + 4;
    ui.addChild(title);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const selected = i === this.altarSelectIndex;
      const prefix = selected ? '> ' : '  ';
      const equipped = this.inventory.equipped?.uid === item.uid ? ' [E]' : '';
      const label = `${prefix}${item.def.name} Lv${item.level} ${item.rarity.toUpperCase()}${equipped}`;
      const t = new BitmapText({ text: label, style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: selected ? 0xffff44 : 0xffffff } });
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
        altar.used = true; // prevent re-opening
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

  /** Returns true if player entered a portal this frame */
  private updatePortals(dt: number): boolean {
    for (const portal of this.portals) {
      portal.update(dt);

      // Check proximity for hint
      const near = portal.overlaps(
        this.player.x - 8, this.player.y - 8,
        this.player.width + 16, this.player.height + 16,
      );
      portal.setShowHint(near);

      // Check enter
      if (portal.overlaps(this.player.x, this.player.y, this.player.width, this.player.height)) {
        if (this.game.input.isJustPressed(GameAction.LOOK_UP)) {
          this.enterPortal(portal);
          return true;
        }
      }
    }
    return false;
  }

  private updateAltars(dt: number): void {
    for (const altar of this.altars) {
      altar.update(dt);

      // Skip used altars (already spawned a portal)
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

  private clearPortals(): void {
    for (const p of this.portals) p.destroy();
    this.portals = [];
  }

  private clearAltars(): void {
    for (const a of this.altars) a.destroy();
    this.altars = [];
  }

  private checkDoorTriggers(): void {
    const pb = { x: this.player.x, y: this.player.y, width: this.player.width, height: this.player.height };
    for (const trigger of this.doorTriggers) {
      if (aabbOverlap(pb, trigger)) {
        const nextCol = this.currentCol + (trigger.direction === 'right' ? 1 : trigger.direction === 'left' ? -1 : 0);
        const nextRow = this.currentRow + (trigger.direction === 'down' ? 1 : trigger.direction === 'up' ? -1 : 0);
        if (nextRow >= 0 && nextRow < this.gridData.height && nextCol >= 0 && nextCol < this.gridData.width) {
          const nextCell = this.gridData.cells[nextRow][nextCol];
          if (nextCell.type !== 0) {
            this.startTransition(trigger.direction, nextCol, nextRow);
            return;
          }
        }
      }
    }
  }

  private startTransition(direction: 'left' | 'right' | 'up' | 'down', nextCol: number, nextRow: number): void {
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
        this.loadRoom(this.pendingDirection!);
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
    }
  }

  render(alpha: number): void {
    this.player.render(alpha);
    for (const enemy of this.enemies) enemy.render(alpha);
    // Portals and altars are static, no interpolation needed
  }

  exit(): void {
    if (this.miniMapContainer?.parent) this.miniMapContainer.parent.removeChild(this.miniMapContainer);
    if (this.hud?.container.parent) this.hud.container.parent.removeChild(this.hud.container);
    if (this.inventoryUI?.container.parent) this.inventoryUI.container.parent.removeChild(this.inventoryUI.container);
    if (this.altarUI?.parent) this.altarUI.parent.removeChild(this.altarUI);
    if (this.portalTransition) { this.portalTransition.destroy(); this.portalTransition = null; }
  }

  private drawMiniMap(): void {
    this.miniMapContainer.removeChildren();
    const cellSize = 8;
    const gap = 1;
    const padding = 4;

    const bg = new Graphics();
    const bgW = GRID_W * (cellSize + gap) + gap + padding * 2;
    const bgH = GRID_H * (cellSize + gap) + gap + padding * 2;
    bg.rect(0, 0, bgW, bgH).fill({ color: 0x000000, alpha: 0.6 });
    this.miniMapContainer.addChild(bg);

    for (let row = 0; row < this.gridData.height; row++) {
      for (let col = 0; col < this.gridData.width; col++) {
        const cell = this.gridData.cells[row][col];
        const x = padding + col * (cellSize + gap);
        const y = padding + row * (cellSize + gap);

        let color = 0x333333;
        let a = 0.3;
        if (cell.visited) {
          a = 1;
          if (cell.type === 0) color = 0x333333;
          else if (cell.cleared) color = 0x2a6a2a;
          else color = 0x4a4a6a;
        }
        if (col === this.currentCol && row === this.currentRow) {
          color = 0xe74c3c;
          a = 1;
        }

        const cellGfx = new Graphics();
        cellGfx.rect(0, 0, cellSize, cellSize).fill({ color, alpha: a });
        cellGfx.x = x;
        cellGfx.y = y;
        this.miniMapContainer.addChild(cellGfx);

        if (cell.visited && cell.type !== 0) {
          if (cell.exits.right && col < GRID_W - 1) {
            const line = new Graphics();
            line.rect(0, 0, gap, 2).fill(0x666666);
            line.x = x + cellSize;
            line.y = y + cellSize / 2 - 1;
            this.miniMapContainer.addChild(line);
          }
          if (cell.exits.down && row < GRID_H - 1) {
            const line = new Graphics();
            line.rect(0, 0, 2, gap).fill(0x666666);
            line.x = x + cellSize / 2 - 1;
            line.y = y + cellSize;
            this.miniMapContainer.addChild(line);
          }
        }
      }
    }

    this.miniMapContainer.x = 4;
    this.miniMapContainer.y = 4;
  }
}
