import { Container, Graphics, BitmapText } from 'pixi.js';
import { Scene } from '@core/Scene';
import { TilemapRenderer } from '@level/TilemapRenderer';
import { generateRoomGrid, type RoomGridData } from '@level/RoomGrid';
import { assembleRoom, getSpawnPosition, getDoorTriggers } from '@level/ChunkAssembler';
import type { RoomCell } from '@level/RoomGrid';
import { aabbOverlap } from '@core/Physics';
import { GameAction } from '@core/InputManager';
import { Player } from '@entities/Player';
import { Skeleton } from '@entities/Skeleton';
import { Ghost } from '@entities/Ghost';
import { Projectile } from '@entities/Projectile';
import { HitManager } from '@combat/HitManager';
import { HUD } from '@ui/HUD';
import { ControlsOverlay } from '@ui/ControlsOverlay';
import { PIXEL_FONT } from '@ui/fonts';
import { DamageNumberManager } from '@ui/DamageNumber';
import { ToastManager } from '@ui/Toast';
import { PRNG } from '@utils/PRNG';
import { addItemExp, itemLevelUp, getOrCreateWorldProgress, EXP_PER_LEVEL, type ItemInstance, type ItemWorldProgress } from '@items/ItemInstance';
import type { Inventory } from '@items/Inventory';
import { STRATA_BY_RARITY, type StrataConfig, type StratumDef } from '@data/StrataConfig';
import type { Enemy } from '@entities/Enemy';
import type { CombatEntity } from '@combat/HitManager';
import { HitSparkManager } from '@effects/HitSpark';
import { ScreenFlash } from '@effects/ScreenFlash';
import type { Game } from '../Game';

const TILE_SIZE = 16;
const ROOM_W = 60;
const ROOM_H = 34;
const FADE_DURATION = 200;
const BASE_EXP_PER_ROOM = 120;
const BASE_BOSS_BONUS_EXP = 600;
const BASE_EXP_PER_KILL = 30;
const BASE_EXP_ROOM_PASS = 60;

type TransitionState = 'none' | 'fade_out' | 'fade_in' | 'exit_fade';

export class ItemWorldScene extends Scene {
  private tilemap!: TilemapRenderer;
  private player!: Player;
  private enemies: Enemy[] = [];
  private projectiles: Projectile[] = [];
  private hitManager!: HitManager;
  private entityLayer!: Container;
  private hud!: HUD;
  private controlsOverlay!: ControlsOverlay;
  private dmgNumbers!: DamageNumberManager;
  private hitSparks!: HitSparkManager;
  private screenFlash!: ScreenFlash;
  private toast!: ToastManager;

  // Item being explored
  private item: ItemInstance;
  private inventory: Inventory;
  private sourcePlayer: Player;

  // Memory Strata state
  private strataConfig!: StrataConfig;
  private currentStratumIndex = 0;
  private currentStratumDef!: StratumDef;
  private progress!: ItemWorldProgress;

  // Dungeon state (current stratum)
  private earnedExp = 0;
  private roomsCleared = 0;
  private totalRooms = 0;
  private gridData!: RoomGridData;
  private currentCol = 0;
  private currentRow = 0;
  private roomData: number[][] = [];
  private rng!: PRNG;

  // Room transition
  private transitionState: TransitionState = 'none';
  private transitionTimer = 0;
  private pendingDirection: 'left' | 'right' | 'up' | 'down' | null = null;
  private pendingStratumTransition: number | null = null;

  // Escape altar
  private altarTrigger: { x: number; y: number; width: number; height: number } | null = null;
  private altarVisual: Graphics | null = null;
  private fadeOverlay!: Graphics;
  private doorTriggers: ReturnType<typeof getDoorTriggers> = [];

  // Exit trigger (at end room)
  private exitTrigger: { x: number; y: number; width: number; height: number } | null = null;
  private exitVisual: Graphics | null = null;

  // Door markers
  private doorMarkers: Graphics[] = [];

  // Minimap
  private miniMapContainer!: Container;

  // Escape confirm dialog
  private escapeConfirm: Container | null = null;
  private escapeConfirmVisible = false;

  // Onboarding
  private onboardingPanel: Container | null = null;
  private onboardingStep = 0;
  private static readonly ONBOARDING_MSGS = [
    'You entered the Memory Strata!',
    'Each stratum goes deeper.\nDefeat the boss to descend.',
    'Find Escape Altars to\nleave safely with rewards.',
    'ESC to abandon. [Z] to proceed.',
  ];
  private onboardingDone = false;

  // Callback when done
  onComplete: (() => void) | null = null;

  constructor(game: Game, item: ItemInstance, inventory: Inventory, sourcePlayer: Player) {
    super(game);
    this.item = item;
    this.inventory = inventory;
    this.sourcePlayer = sourcePlayer;
  }

  init(): void {
    // Memory Strata setup
    this.strataConfig = STRATA_BY_RARITY[this.item.rarity];
    this.progress = getOrCreateWorldProgress(this.item);
    this.currentStratumIndex = Math.min(
      this.progress.lastSafeStratum,
      this.progress.deepestUnlocked,
    );
    this.currentStratumDef = this.strataConfig.strata[this.currentStratumIndex];
    this.rng = new PRNG(this.item.uid * 1000 + this.currentStratumIndex * 7919);

    this.hitManager = new HitManager(this.game);

    // Tilemap
    this.tilemap = new TilemapRenderer(TILE_SIZE);
    this.tilemap.setTheme(this.currentStratumDef.theme);
    this.container.addChild(this.tilemap.container);

    // Entity layer
    this.entityLayer = new Container();
    this.container.addChild(this.entityLayer);

    // Player (clone stats from world player)
    this.player = new Player(this.game);
    this.player.hp = this.sourcePlayer.hp;
    this.player.maxHp = this.sourcePlayer.maxHp;
    this.player.atk = this.sourcePlayer.atk;
    this.player.def = this.sourcePlayer.def;
    this.entityLayer.addChild(this.player.container);

    // Damage numbers & Sakurai hit effects
    this.dmgNumbers = new DamageNumberManager(this.entityLayer);
    this.hitSparks = new HitSparkManager(this.entityLayer);
    this.screenFlash = new ScreenFlash();
    this.game.app.stage.addChild(this.screenFlash.overlay);

    // Fade overlay
    this.fadeOverlay = new Graphics();
    this.fadeOverlay.rect(0, 0, ROOM_W * TILE_SIZE, ROOM_H * TILE_SIZE).fill(0x000000);
    this.fadeOverlay.alpha = 0;
    this.container.addChild(this.fadeOverlay);

    // Minimap
    this.miniMapContainer = new Container();
    this.game.app.stage.addChild(this.miniMapContainer);

    // HUD
    this.hud = new HUD();
    this.game.app.stage.addChild(this.hud.container);

    // Controls overlay
    this.controlsOverlay = new ControlsOverlay();
    this.game.app.stage.addChild(this.controlsOverlay.container);

    // Toast
    this.toast = new ToastManager(this.game.app.stage);

    // Generate current stratum dungeon
    this.generateDungeon();

    // Camera
    this.game.camera.setBounds(0, 0, ROOM_W * TILE_SIZE, ROOM_H * TILE_SIZE);
    this.game.camera.snap(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2);
  }

  private generateDungeon(): void {
    const def = this.currentStratumDef;
    const stratumRng = new PRNG(this.item.uid * 1000 + this.currentStratumIndex * 7919);
    this.gridData = generateRoomGrid(def.gridWidth, def.gridHeight, stratumRng);
    this.currentCol = this.gridData.startRoom.col;
    this.currentRow = this.gridData.startRoom.row;

    // Restore persistent exploration state
    this.restoreRoomState();

    // Count total traversable rooms
    this.totalRooms = 0;
    for (let r = 0; r < def.gridHeight; r++) {
      for (let c = 0; c < def.gridWidth; c++) {
        if (this.gridData.cells[r][c].type !== 0) this.totalRooms++;
      }
    }

    this.loadRoom('down');
    this.updateHudText();
  }

  private restoreRoomState(): void {
    const visited = new Set(this.progress.visitedRooms[this.currentStratumIndex] ?? []);
    const cleared = new Set(this.progress.clearedRooms[this.currentStratumIndex] ?? []);

    this.roomsCleared = 0;
    for (const row of this.gridData.cells) {
      for (const cell of row) {
        const key = `${cell.col},${cell.row}`;
        cell.visited = visited.has(key);
        cell.cleared = cleared.has(key);
        if (cell.cleared) this.roomsCleared++;
      }
    }
  }

  private persistRoomState(): void {
    const si = this.currentStratumIndex;
    const visited: string[] = [];
    const cleared: string[] = [];
    for (const row of this.gridData.cells) {
      for (const cell of row) {
        const key = `${cell.col},${cell.row}`;
        if (cell.visited) visited.push(key);
        if (cell.cleared) cleared.push(key);
      }
    }
    this.progress.visitedRooms[si] = visited;
    this.progress.clearedRooms[si] = cleared;
  }

  private loadRoom(enterFrom: 'left' | 'right' | 'up' | 'down'): void {
    const cell = this.gridData.cells[this.currentRow][this.currentCol];
    const roomRng = new PRNG(this.item.uid * 10000 + this.currentCol * 100 + this.currentRow + this.currentStratumIndex * 1000000);
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
    this.clearEscapeAltar();

    if (!cell.cleared) {
      this.spawnEnemies();
    }

    this.drawDoorMarkers(cell);

    // End room — boss + descent/exit trigger
    const isEndRoom = this.currentCol === this.gridData.endRoom.col &&
                      this.currentRow === this.gridData.endRoom.row;

    if (this.exitVisual?.parent) this.exitVisual.parent.removeChild(this.exitVisual);
    this.exitVisual = null;

    if (isEndRoom) {
      if (!cell.cleared) {
        this.spawnBoss();
      }
      const exitX = (ROOM_W / 2 - 1) * TILE_SIZE;
      const exitY = (ROOM_H - 6) * TILE_SIZE;
      this.exitTrigger = { x: exitX, y: exitY, width: 3 * TILE_SIZE, height: 3 * TILE_SIZE };

      // Visual: blue for descent, gold for final exit
      const hasNext = this.currentStratumIndex + 1 < this.strataConfig.strata.length;
      const baseColor = hasNext ? 0x4444cc : 0xcc8844;
      const midColor = hasNext ? 0x5555dd : 0xddaa55;
      const topColor = hasNext ? 0x6666ff : 0xeebb66;

      this.exitVisual = new Graphics();
      this.exitVisual.rect(0, 24, 48, 16).fill(baseColor);
      this.exitVisual.rect(8, 16, 32, 8).fill(midColor);
      this.exitVisual.rect(16, 8, 16, 8).fill(topColor);
      this.exitVisual.rect(18, -4, 12, 10).fill(0xffff44);
      this.exitVisual.rect(22, -10, 4, 6).fill(0xffff88);
      this.exitVisual.x = exitX;
      this.exitVisual.y = exitY;
      this.entityLayer.addChild(this.exitVisual);
    } else {
      this.exitTrigger = null;
      // Escape altar — spawn in non-start, non-end, critical path rooms
      this.trySpawnEscapeAltar(cell);
    }

    this.game.camera.snap(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2);
    cell.visited = true;
    this.persistRoomState();
    this.drawMiniMap();
  }

  private spawnEnemies(): void {
    const floorY = (ROOM_H - 3) * TILE_SIZE;
    const def = this.currentStratumDef;
    const dist = Math.abs(this.currentCol - this.gridData.startRoom.col)
               + Math.abs(this.currentRow - this.gridData.startRoom.row);
    const count = 2 + Math.floor(dist * 0.5) + def.enemyCountBonus;
    const hpScale = (1 + dist * 0.2) * def.enemyHpScale;
    const atkScale = (1 + dist * 0.2) * def.enemyAtkScale;

    for (let i = 0; i < count; i++) {
      const spawnRng = new PRNG(this.item.uid * 999 + this.currentCol * 77 + this.currentRow * 33 + i + this.currentStratumIndex * 500000);
      const isGhost = spawnRng.next() < 0.3;
      const enemy = isGhost ? new Ghost() : new Skeleton();
      enemy.hp = enemy.maxHp = Math.floor(enemy.maxHp * hpScale);
      enemy.atk = Math.floor(enemy.atk * atkScale);

      enemy.x = spawnRng.nextInt(4, ROOM_W - 5) * TILE_SIZE;
      enemy.y = floorY - enemy.height;
      enemy.roomData = this.roomData;
      enemy.target = this.player;
      this.enemies.push(enemy);
      this.entityLayer.addChild(enemy.container);
    }
  }

  private spawnBoss(): void {
    const floorY = (ROOM_H - 3) * TILE_SIZE;
    const def = this.currentStratumDef;
    const boss = new Skeleton();
    boss.hp = boss.maxHp = Math.floor(boss.maxHp * def.bossHpScale);
    boss.atk = Math.floor(boss.atk * def.bossAtkScale);
    const visualScale = 1.5 + this.currentStratumIndex * 0.2;
    boss.container.scale.set(visualScale);
    boss.x = (ROOM_W / 2) * TILE_SIZE;
    boss.y = floorY - boss.height * visualScale;
    boss.roomData = this.roomData;
    boss.target = this.player;
    this.enemies.push(boss);
    this.entityLayer.addChild(boss.container);
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
    for (const p of this.projectiles) p.destroy();
    this.projectiles = [];
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
    this.showOnboarding();
  }

  update(dt: number): void {
    // Toast always updates (even during transitions / menus)
    this.toast.update(dt);

    // Onboarding blocks gameplay
    if (!this.onboardingDone) {
      if (this.game.input.isJustPressed(GameAction.ATTACK)) {
        this.advanceOnboarding();
      }
      return;
    }

    // ESC to toggle escape confirm
    if (this.game.input.isJustPressed(GameAction.MENU)) {
      if (this.escapeConfirmVisible) {
        this.hideEscapeConfirm();
      } else {
        this.showEscapeConfirm();
      }
      return;
    }

    if (this.escapeConfirmVisible) {
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

    if (this.transitionState !== 'none') {
      this.updateTransition(dt);
      return;
    }

    this.player.update(dt);

    if (this.player.isDead) {
      // Death penalty: lose 30% earned EXP, drop back one stratum
      const penalty = Math.floor(this.earnedExp * 0.3);
      this.earnedExp = Math.max(0, this.earnedExp - penalty);
      if (this.currentStratumIndex > 0) {
        this.progress.lastSafeStratum = this.currentStratumIndex - 1;
      }
      this.persistRoomState();
      this.player.respawn();
      this.startExitFade();
      return;
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      const wasAlive = enemy.alive;
      enemy.update(dt);

      // Monster killed — grant EXP (scaled by stratum)
      if (wasAlive && !enemy.alive) {
        const killExp = Math.floor(BASE_EXP_PER_KILL * this.currentStratumDef.expMultiplier);
        addItemExp(this.item, killExp);
        this.earnedExp += killExp;
        this.toast.show(`+${killExp} EXP`, 0x88ccff);
        this.updateHudText();
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

    // Enemy attacks — Sakurai: player hit feedback
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      if (enemy instanceof Skeleton && enemy.isAttackActive()) {
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

          // Sakurai feedback
          this.player.startVibrate(4, 5, true);
          this.player.triggerFlash();
          this.game.hitstopFrames = 3;
          this.game.camera.shakeDirectional(3, dir, -0.3);
          this.screenFlash.flashDamage(dmg > 20);
          this.hitSparks.spawn(
            this.player.x + this.player.width / 2,
            this.player.y + this.player.height * 0.4,
            false, -dir,
          );

          if (this.player.hp <= 0) {
            this.player.hp = 0;
            this.player.onDeath();
            this.game.hitstopFrames = 8;
            this.screenFlash.flashDamage(true);
          }
        }
      }
    }

    // Room cleared
    const cell = this.gridData.cells[this.currentRow][this.currentCol];
    if (!cell.cleared && this.enemies.filter(e => e.alive).length === 0) {
      cell.cleared = true;
      this.roomsCleared++;

      // EXP per room (scaled by stratum)
      const isEndRoom = this.currentCol === this.gridData.endRoom.col &&
                        this.currentRow === this.gridData.endRoom.row;
      const baseExp = isEndRoom ? BASE_EXP_PER_ROOM + BASE_BOSS_BONUS_EXP : BASE_EXP_PER_ROOM;
      const expGain = Math.floor(baseExp * this.currentStratumDef.expMultiplier);
      addItemExp(this.item, expGain);
      this.earnedExp += expGain;

      // Heal 20%
      const heal = Math.floor(this.player.maxHp * 0.2);
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + heal);

      // Boss kill → bonus level up
      if (isEndRoom) {
        itemLevelUp(this.item);
        this.toast.show(`BOSS CLEAR! +${expGain} EXP`, 0xffaa00);
        this.toast.show(`HP +${heal} recovered`, 0x44ff44);
      } else {
        this.toast.show(`Room Clear! +${expGain} EXP`, 0x88ccff);
        this.toast.show(`HP +${heal} recovered`, 0x44ff44);
      }

      this.updateHudText();
      this.drawMiniMap();
    }

    // Exit trigger (end room, after cleared) → descend or exit
    if (this.exitTrigger && cell.cleared) {
      const pb = { x: this.player.x, y: this.player.y, width: this.player.width, height: this.player.height };
      if (aabbOverlap(pb, this.exitTrigger)) {
        this.handleStratumExit();
        return;
      }
    }

    // Escape altar interaction
    if (this.altarTrigger) {
      const pb = { x: this.player.x, y: this.player.y, width: this.player.width, height: this.player.height };
      if (aabbOverlap(pb, this.altarTrigger) && this.game.input.isJustPressed(GameAction.JUMP)) {
        this.useEscapeAltar();
        return;
      }
    }

    // Door triggers
    this.checkDoorTriggers();

    // HUD, damage numbers, toast & Sakurai effects
    this.hud.updateHP(this.player.hp, this.player.maxHp);
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

  private updateHudText(): void {
    const stratumLabel = `Stratum ${this.currentStratumIndex + 1}/${this.strataConfig.strata.length}`;
    this.hud.setFloorText(
      `${stratumLabel}  ${this.roomsCleared}/${this.totalRooms}  +${this.earnedExp}EXP`
    );
  }

  private showEscapeConfirm(): void {
    this.escapeConfirmVisible = true;

    const panelW = 260;
    const panelH = 72;
    const panel = new Container();
    const bg = new Graphics();
    bg.rect(0, 0, panelW, panelH).fill({ color: 0x1a1a2e, alpha: 0.95 });
    bg.rect(0, 0, panelW, panelH).stroke({ color: 0x4a4a6a, width: 1 });
    panel.addChild(bg);

    const title = new BitmapText({ text: 'Leave Item World?', style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0xffffff } });
    title.x = 12;
    title.y = 6;
    panel.addChild(title);

    const expInfo = new BitmapText({
      text: `${this.item.def.name} Lv${this.item.level}  EXP: ${this.item.exp}/${EXP_PER_LEVEL}`,
      style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0x88ccff },
    });
    expInfo.x = 12;
    expInfo.y = 20;
    panel.addChild(expInfo);

    const floorInfo = new BitmapText({
      text: `Rooms ${this.roomsCleared}/${this.totalRooms}  Earned: +${this.earnedExp} EXP`,
      style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0xaaaaaa },
    });
    floorInfo.x = 12;
    floorInfo.y = 33;
    panel.addChild(floorInfo);

    const controls = new BitmapText({ text: '[Z] Yes   [X/C] No', style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0xaaaaaa } });
    controls.x = 12;
    controls.y = 48;
    panel.addChild(controls);

    panel.x = Math.floor((480 - panelW) / 2);
    panel.y = Math.floor((270 - panelH) / 2);

    this.escapeConfirm = panel;
    this.game.app.stage.addChild(panel);
  }

  private hideEscapeConfirm(): void {
    this.escapeConfirmVisible = false;
    if (this.escapeConfirm?.parent) {
      this.escapeConfirm.parent.removeChild(this.escapeConfirm);
    }
    this.escapeConfirm = null;
  }

  // --- Onboarding ---
  private showOnboarding(): void {
    this.onboardingStep = 0;
    this.onboardingDone = false;
    this.showOnboardingStep();
  }

  private showOnboardingStep(): void {
    if (this.onboardingPanel?.parent) {
      this.onboardingPanel.parent.removeChild(this.onboardingPanel);
    }

    const msgs = ItemWorldScene.ONBOARDING_MSGS;
    if (this.onboardingStep >= msgs.length) {
      this.onboardingPanel = null;
      this.onboardingDone = true;
      return;
    }

    const msg = msgs[this.onboardingStep];
    const lines = msg.split('\n');

    const panelW = 280;
    const lineH = 12;
    const padY = 10;
    const padX = 14;
    const panelH = padY * 2 + lines.length * lineH + 16; // +16 for prompt line

    const panel = new Container();
    const bg = new Graphics();
    bg.roundRect(0, 0, panelW, panelH, 4).fill({ color: 0x0a0a1e, alpha: 0.92 });
    bg.roundRect(0, 0, panelW, panelH, 4).stroke({ color: 0x6666aa, width: 1 });
    panel.addChild(bg);

    for (let i = 0; i < lines.length; i++) {
      const t = new BitmapText({
        text: lines[i],
        style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0xffffff },
      });
      t.x = padX;
      t.y = padY + i * lineH;
      panel.addChild(t);
    }

    const step = `${this.onboardingStep + 1}/${msgs.length}`;
    const prompt = new BitmapText({
      text: `[Z] Next  ${step}`,
      style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0x888888 },
    });
    prompt.x = padX;
    prompt.y = panelH - padY - 8;
    panel.addChild(prompt);

    panel.x = Math.floor((480 - panelW) / 2);
    panel.y = Math.floor((270 - panelH) / 2) - 20;

    this.onboardingPanel = panel;
    this.game.app.stage.addChild(panel);
  }

  private advanceOnboarding(): void {
    this.onboardingStep++;
    this.showOnboardingStep();
  }

  private handleStratumExit(): void {
    const nextIndex = this.currentStratumIndex + 1;
    const hasNextStratum = nextIndex < this.strataConfig.strata.length;

    if (hasNextStratum) {
      // Boss cleared → unlock next stratum permanently
      if (this.progress.deepestUnlocked < nextIndex) {
        this.progress.deepestUnlocked = nextIndex;
      }
      this.progress.lastSafeStratum = nextIndex;
      this.persistRoomState();

      // Trigger stratum descent transition
      this.transitionState = 'fade_out';
      this.transitionTimer = FADE_DURATION;
      this.pendingStratumTransition = nextIndex;
      this.pendingDirection = null;
    } else {
      // Deepest stratum cleared — exit item world
      this.progress.lastSafeStratum = this.currentStratumIndex;
      this.persistRoomState();
      itemLevelUp(this.item);
      this.toast.show('All Strata cleared! Item Level UP!', 0xffaa00);
      this.startExitFade();
    }
  }

  private useEscapeAltar(): void {
    this.progress.lastSafeStratum = this.currentStratumIndex;
    this.persistRoomState();
    this.toast.show('Escape Altar — Returning safely...', 0xaaaaff);
    this.startExitFade();
  }

  private trySpawnEscapeAltar(cell: RoomCell): void {
    const isStartRoom = this.currentCol === this.gridData.startRoom.col &&
                        this.currentRow === this.gridData.startRoom.row;
    if (isStartRoom) return;
    if (!cell.onCriticalPath) return;

    const altarRng = new PRNG(this.item.uid * 50000 + this.currentStratumIndex * 100 + this.currentCol * 10 + this.currentRow);
    if (altarRng.next() >= 0.25) return; // 25% chance

    const altarX = (ROOM_W / 2 + 8) * TILE_SIZE;
    const altarY = (ROOM_H - 6) * TILE_SIZE;
    this.altarTrigger = { x: altarX, y: altarY, width: 2 * TILE_SIZE, height: 3 * TILE_SIZE };

    this.altarVisual = new Graphics();
    this.altarVisual.rect(0, 24, 32, 16).fill(0x666688);
    this.altarVisual.rect(4, 16, 24, 8).fill(0x7777aa);
    this.altarVisual.rect(10, 8, 12, 8).fill(0xaaaaff);
    this.altarVisual.x = altarX;
    this.altarVisual.y = altarY;
    this.entityLayer.addChild(this.altarVisual);
  }

  private clearEscapeAltar(): void {
    if (this.altarVisual?.parent) this.altarVisual.parent.removeChild(this.altarVisual);
    this.altarVisual = null;
    this.altarTrigger = null;
  }

  private startExitFade(): void {
    this.transitionState = 'exit_fade';
    this.transitionTimer = FADE_DURATION * 2;
  }

  private exitItemWorld(): void {
    this.sourcePlayer.hp = this.player.hp;

    this.hideEscapeConfirm();
    if (this.miniMapContainer.parent) this.miniMapContainer.parent.removeChild(this.miniMapContainer);
    if (this.hud.container.parent) this.hud.container.parent.removeChild(this.hud.container);

    this.onComplete?.();
  }

  private checkDoorTriggers(): void {
    const pb = { x: this.player.x, y: this.player.y, width: this.player.width, height: this.player.height };
    for (const trigger of this.doorTriggers) {
      if (aabbOverlap(pb, trigger)) {
        const nextCol = this.currentCol + (trigger.direction === 'right' ? 1 : trigger.direction === 'left' ? -1 : 0);
        const nextRow = this.currentRow + (trigger.direction === 'down' ? 1 : trigger.direction === 'up' ? -1 : 0);
        if (nextRow >= 0 && nextRow < this.gridData.height &&
            nextCol >= 0 && nextCol < this.gridData.width) {
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
    // Grant pass-through EXP if room wasn't cleared (skipping enemies)
    const cell = this.gridData.cells[this.currentRow][this.currentCol];
    if (!cell.cleared) {
      const passExp = Math.floor(BASE_EXP_ROOM_PASS * this.currentStratumDef.expMultiplier);
      addItemExp(this.item, passExp);
      this.earnedExp += passExp;
      this.toast.show(`Room passed +${passExp} EXP`, 0xaaaaaa);
      this.updateHudText();
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
        if (this.pendingStratumTransition !== null) {
          // Descend to next stratum
          this.currentStratumIndex = this.pendingStratumTransition;
          this.currentStratumDef = this.strataConfig.strata[this.currentStratumIndex];
          this.pendingStratumTransition = null;
          this.clearEnemies();
          this.clearEscapeAltar();
          this.generateDungeon();
          this.toast.show(`Stratum ${this.currentStratumIndex + 1} — Deeper...`, 0xff4488);
        } else {
          this.loadRoom(this.pendingDirection!);
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
      }
    } else if (this.transitionState === 'exit_fade') {
      const duration = FADE_DURATION * 2;
      this.fadeOverlay.alpha = Math.min(1, 1 - this.transitionTimer / duration);
      if (this.transitionTimer <= 0) {
        this.transitionState = 'none';
        this.exitItemWorld();
      }
    }
  }

  render(alpha: number): void {
    this.player.render(alpha);
    for (const enemy of this.enemies) enemy.render(alpha);
  }

  exit(): void {
    this.toast.clear();
    this.hideEscapeConfirm();
    if (this.onboardingPanel?.parent) this.onboardingPanel.parent.removeChild(this.onboardingPanel);
    if (this.miniMapContainer?.parent) this.miniMapContainer.parent.removeChild(this.miniMapContainer);
    if (this.hud?.container.parent) this.hud.container.parent.removeChild(this.hud.container);
    if (this.controlsOverlay?.container.parent) this.controlsOverlay.container.parent.removeChild(this.controlsOverlay.container);
    if (this.screenFlash?.overlay.parent) this.screenFlash.overlay.parent.removeChild(this.screenFlash.overlay);
  }

  private drawMiniMap(): void {
    this.miniMapContainer.removeChildren();
    const cellSize = 6;
    const gap = 1;
    const padding = 4;
    const gridW = this.gridData.width;
    const gridH = this.gridData.height;

    const bg = new Graphics();
    const bgW = gridW * (cellSize + gap) + gap + padding * 2;
    const bgH = gridH * (cellSize + gap) + gap + padding * 2 + 10; // +10 for stratum indicator
    bg.rect(0, 0, bgW, bgH).fill({ color: 0x220000, alpha: 0.6 });
    this.miniMapContainer.addChild(bg);

    // Stratum depth indicator
    for (let s = 0; s < this.strataConfig.strata.length; s++) {
      const dotX = padding + s * 7;
      const dotY = bgH - 8;
      const dotColor = s <= this.currentStratumIndex ? 0xff4488 : 0x444444;
      const dot = new Graphics();
      dot.circle(0, 0, 2.5).fill(dotColor);
      dot.x = dotX + 3;
      dot.y = dotY;
      this.miniMapContainer.addChild(dot);
    }

    for (let row = 0; row < gridH; row++) {
      for (let col = 0; col < gridW; col++) {
        const cell = this.gridData.cells[row][col];
        if (cell.type === 0) continue;

        const x = padding + col * (cellSize + gap);
        const y = padding + row * (cellSize + gap);

        const isEndRoom = col === this.gridData.endRoom.col && row === this.gridData.endRoom.row;
        let color = 0x333333;
        let alpha = 0.3;

        if (cell.visited) {
          alpha = 1;
          color = cell.cleared ? 0x6a2a2a : 0x6a4a4a;
        }
        if (isEndRoom) {
          color = cell.visited ? 0x4444cc : 0x2222aa;
          alpha = 1;
        }
        if (col === this.currentCol && row === this.currentRow) {
          color = 0xe74c3c;
          alpha = 1;
        }

        const cellGfx = new Graphics();
        cellGfx.rect(0, 0, cellSize, cellSize).fill({ color, alpha });
        cellGfx.x = x;
        cellGfx.y = y;
        this.miniMapContainer.addChild(cellGfx);
      }
    }

    this.miniMapContainer.x = 4;
    this.miniMapContainer.y = 4;
  }
}
