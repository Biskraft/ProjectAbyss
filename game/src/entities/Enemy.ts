import { Graphics } from 'pixi.js';
import { Entity } from './Entity';
import { resolveX, resolveY } from '@core/Physics';
import { StateMachine } from '@utils/StateMachine';
import type { CombatEntity } from '@combat/HitManager';
import { getEnemyStats, type MovementType } from '@data/enemyStats';

const GRAVITY = 980;
const MAX_FALL_SPEED = 576;
const TILE_SIZE = 16;

export type EnemyState = 'idle' | 'patrol' | 'detect' | 'chase' | 'retreat' | 'attack' | 'cooldown' | 'hit' | 'death';

export abstract class Enemy<S extends string = EnemyState> extends Entity implements CombatEntity {
  fsm: StateMachine<S>;
  protected sprite: Graphics;

  // Stats
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  /** EXP awarded to player on kill (from CSV; 0 = use scene fallback) */
  exp = 0;
  /** Movement type from CSV: 'ground' = wall/floor collision, 'flying' = solids only */
  movementType: MovementType = 'ground';
  facingRight = false;
  alive = true;

  // Physics
  protected grounded = false;

  // AI
  protected detectRange: number;
  protected attackRange: number;
  protected moveSpeed: number;
  protected attackCooldown: number;
  protected cooldownTimer = 0;

  // Super armor — if true, hits don't interrupt actions (no hitstun/knockback)
  superArmor = false;

  // Navigation jump — when blocked by wall during chase, jump to clear obstacle
  /** Max jump height in tiles (0 = no jumping). Override in subclass. */
  protected jumpTiles = 0;
  private wallBlockedTimer = 0;
  private static readonly WALL_BLOCK_THRESHOLD = 150; // ms blocked before jumping
  private static readonly JUMP_COOLDOWN = 500; // ms between jumps
  private jumpCooldownTimer = 0;

  // Target reference
  target: CombatEntity | null = null;
  roomData: number[][] = [];

  // Hit
  private _hitstunTimer = 0;

  // HP bar
  private hpBarContainer: Graphics;
  private hpBarVisible = false;
  private hpBarTimer = 0;
  private readonly HP_BAR_SHOW_DURATION = 3000; // 3s

  // Death
  private deathTimer = 0;
  private readonly DEATH_FADE = 500;

  // Sakurai: Flash overlay for hit feedback
  private flashOverlay: Graphics | null = null;

  constructor(config: {
    width: number; height: number; color: number;
    hp: number; atk: number; def: number;
    detectRange: number; attackRange: number;
    moveSpeed: number; attackCooldown: number;
  }) {
    super();
    this.width = config.width;
    this.height = config.height;
    this.hp = config.hp;
    this.maxHp = config.hp;
    this.atk = config.atk;
    this.def = config.def;
    this.detectRange = config.detectRange;
    this.attackRange = config.attackRange;
    this.moveSpeed = config.moveSpeed;
    this.attackCooldown = config.attackCooldown;

    this.sprite = new Graphics();
    this.sprite.rect(0, 0, this.width, this.height).fill(config.color);
    this.container.addChild(this.sprite);

    // HP bar above head
    this.hpBarContainer = new Graphics();
    this.hpBarContainer.visible = false;
    this.container.addChild(this.hpBarContainer);

    this.fsm = new StateMachine<S>();
    this.setupStates();
    this.fsm.transition('idle' as S);
  }

  /** Apply stats from CSV table. Call in subclass constructor after super(). */
  applyStats(type: string, level: number): void {
    const s = getEnemyStats(type, level);
    this.hp = s.hp;
    this.maxHp = s.hp;
    this.atk = s.atk;
    this.def = s.def;
    this.detectRange = s.detectRange;
    this.attackRange = s.attackRange;
    this.moveSpeed = s.moveSpeed;
    this.attackCooldown = s.attackCooldown;
    this.jumpTiles = s.jumpTiles;
    this.exp = s.exp;
    this.movementType = s.movementType;
  }

  protected abstract setupStates(): void;

  update(dt: number): void {
    if (!this.alive) {
      this.deathTimer += dt;
      this.sprite.alpha = Math.max(0, 1 - this.deathTimer / this.DEATH_FADE);
      return;
    }

    this.savePrevPosition();
    this.updateInvincibility(dt);
    const dtSec = dt / 1000;

    // HP bar timer
    if (this.hpBarTimer > 0) {
      this.hpBarTimer -= dt;
      if (this.hpBarTimer <= 0) {
        this.hpBarVisible = false;
        this.hpBarContainer.visible = false;
      }
    }

    if (this.cooldownTimer > 0) this.cooldownTimer -= dt;

    this.fsm.update(dt);

    if (this.movementType === 'flying') {
      // Flying enemies: no gravity, free movement. Only solid walls block.
      if (this.roomData.length > 0) {
        const rx = resolveX(this.x, this.y, this.width, this.height, this.vx * dtSec, this.roomData);
        this.x = rx.x;
        if (rx.collided) this.vx = 0;

        const ry = resolveY(this.x, this.y, this.width, this.height, this.vy * dtSec, this.roomData);
        this.y = ry.y;
        if (ry.collided) this.vy = 0;
      } else {
        this.x += this.vx * dtSec;
        this.y += this.vy * dtSec;
      }
      this.grounded = false;
    } else {
      // Ground enemies: gravity + full collision (wall, platform, one-way).
      this.vy += GRAVITY * dtSec;
      if (this.vy > MAX_FALL_SPEED) this.vy = MAX_FALL_SPEED;

      if (this.roomData.length > 0) {
        const rx = resolveX(this.x, this.y, this.width, this.height, this.vx * dtSec, this.roomData);
        this.x = rx.x;

        // Wall-blocked jump: scan wall height, jump just enough to clear it
        if (rx.collided && this.vx !== 0) {
          this.vx = 0;
          if (this.jumpTiles > 0 && this.grounded && this.jumpCooldownTimer <= 0) {
            this.wallBlockedTimer += dt;
            if (this.wallBlockedTimer >= Enemy.WALL_BLOCK_THRESHOLD) {
              const wallHeight = this.scanWallHeight();
              if (wallHeight > 0 && wallHeight <= this.jumpTiles) {
                const jumpHeight = (wallHeight + 1) * TILE_SIZE;
                this.vy = -Math.sqrt(2 * GRAVITY * jumpHeight);
                this.wallBlockedTimer = 0;
                this.jumpCooldownTimer = Enemy.JUMP_COOLDOWN;
              } else {
                this.wallBlockedTimer = 0;
                this.jumpCooldownTimer = Enemy.JUMP_COOLDOWN * 2;
              }
            }
          }
        } else {
          this.wallBlockedTimer = 0;
        }
        if (rx.collided) this.vx = 0;

        const ry = resolveY(this.x, this.y, this.width, this.height, this.vy * dtSec, this.roomData);
        this.y = ry.y;
        this.grounded = ry.grounded;
        if (ry.collided) {
          if (this.vy > 0) this.vy = 0;
          if (this.vy < 0) this.vy = 0;
        }
      }
    }

    // Jump cooldown
    if (this.jumpCooldownTimer > 0) this.jumpCooldownTimer -= dt;

    // Facing
    if (this.target) {
      this.facingRight = this.target.x > this.x;
    }
  }

  render(alpha: number): void {
    if (!this.container.destroyed) {
      super.render(alpha);
      this.sprite.scale.x = this.facingRight ? 1 : -1;
      this.sprite.x = this.facingRight ? 0 : this.width;

      // Sakurai: White flash overlay on hit (emphasize impact moment)
      if (this.flashTimer > 0) {
        if (!this.flashOverlay) {
          this.flashOverlay = new Graphics();
          this.container.addChild(this.flashOverlay);
        }
        this.flashOverlay.clear();
        this.flashOverlay.rect(0, 0, this.width, this.height)
          .fill({ color: 0xffffff, alpha: Math.min(0.8, this.flashTimer / 40) });
        this.flashOverlay.visible = true;
      } else if (this.flashOverlay) {
        this.flashOverlay.visible = false;
      }
    }
  }

  // --- CombatEntity ---

  onHit(knockbackX: number, knockbackY: number, hitstun: number): void {
    if (!this.alive) return;

    if (!this.superArmor) {
      this.vx = knockbackX;
      this.vy = knockbackY;
      this._hitstunTimer = hitstun;
      this.fsm.transition('hit' as S);
    }

    // Show HP bar on hit (skip for bosses — HUD bar handles it)
    if (!(this as any)._isBoss) {
      this.hpBarVisible = true;
      this.hpBarTimer = this.HP_BAR_SHOW_DURATION;
      this.hpBarContainer.visible = true;
      this.updateHpBar();
    }
  }

  onDeath(): void {
    this.alive = false;
    this.deathTimer = 0;
    this.vx = 0;
    this.fsm.transition('death' as S);
  }

  get shouldRemove(): boolean {
    return !this.alive && this.deathTimer >= this.DEATH_FADE;
  }

  // --- Helpers ---

  protected distToTarget(): number {
    if (!this.target) return Infinity;
    const dx = (this.target.x + this.target.width / 2) - (this.x + this.width / 2);
    const dy = (this.target.y + this.target.height / 2) - (this.y + this.height / 2);
    return Math.sqrt(dx * dx + dy * dy);
  }

  protected horizontalDistToTarget(): number {
    if (!this.target) return Infinity;
    return Math.abs((this.target.x + this.target.width / 2) - (this.x + this.width / 2));
  }

  protected moveTowardTarget(speed: number): void {
    if (!this.target) return;

    // Flying enemies: direct XY movement toward target (§2.4)
    if (this.movementType === 'flying') {
      this.moveTowardTargetFlying(speed);
      return;
    }

    // Ground enemies: vertical chase rules (§2.2-A)
    const targetCY = this.target.y + this.target.height / 2;
    const myCY = this.y + this.height / 2;
    const heightDiff = targetCY - myCY; // positive = player below
    const HEIGHT_THRESHOLD = TILE_SIZE * 2;

    if (heightDiff > HEIGHT_THRESHOLD) {
      // Player is below — find floor gap and drop (§2.2-A Case 2)
      this.moveTowardEdgeDrop(speed);
    } else if (heightDiff < -HEIGHT_THRESHOLD && this.jumpTiles > 0) {
      // Player is above — find ceiling gap and move under it to jump through
      this.moveTowardCeilingGap(speed);
    } else {
      // Same level — horizontal chase (§2.2-A Case 3)
      const dir = this.target.x > this.x ? 1 : -1;
      this.vx = dir * speed;
    }
  }

  /**
   * Flying enemy: move toward target in both X and Y (direct line).
   * Wall collision handled by the base update()'s resolveX/Y for flying.
   */
  private moveTowardTargetFlying(speed: number): void {
    if (!this.target) return;
    const dx = (this.target.x + this.target.width / 2) - (this.x + this.width / 2);
    const dy = (this.target.y + this.target.height / 2) - (this.y + this.height / 2);
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) return;
    this.vx = (dx / dist) * speed;
    this.vy = (dy / dist) * speed;
  }

  /**
   * Ground enemy: player is below. Find the nearest air tile (gap/hole) in the
   * floor row beneath the enemy's feet and walk INTO it — gravity does the rest.
   * Scans outward from current position so the enemy always picks the closest gap.
   */
  private moveTowardEdgeDrop(speed: number): void {
    if (!this.target || this.roomData.length === 0) return;
    const feetRow = Math.floor((this.y + this.height) / TILE_SIZE);
    const myCol = Math.floor((this.x + this.width / 2) / TILE_SIZE);
    const gridW = this.roomData[0]?.length ?? 0;

    // Scan outward from enemy position for nearest air tile in feetRow
    for (let offset = 1; offset < gridW; offset++) {
      const r = myCol + offset;
      const l = myCol - offset;
      if (r < gridW && this.roomData[feetRow]?.[r] === 0) {
        this.vx = speed;  // move right toward gap
        return;
      }
      if (l >= 0 && this.roomData[feetRow]?.[l] === 0) {
        this.vx = -speed; // move left toward gap
        return;
      }
    }
    // No gap found — floor is completely sealed. Cannot reach player.
    this.vx = 0;
  }

  /**
   * Ground enemy: player is above. Find the nearest air tile in the ceiling row
   * (headRow - 1) and walk under it so wall-blocked jump can launch through.
   * Mirror logic of moveTowardEdgeDrop but scans the row ABOVE the enemy's head.
   */
  private moveTowardCeilingGap(speed: number): void {
    if (!this.target || this.roomData.length === 0) return;
    const headRow = Math.floor(this.y / TILE_SIZE);
    const myCol = Math.floor((this.x + this.width / 2) / TILE_SIZE);
    const gridW = this.roomData[0]?.length ?? 0;

    // Scan outward for nearest air tile in the row above head
    for (let offset = 0; offset < gridW; offset++) {
      const r = myCol + offset;
      const l = myCol - offset;
      if (r < gridW && this.roomData[headRow]?.[r] === 0) {
        const gapX = r * TILE_SIZE + TILE_SIZE / 2;
        const myX = this.x + this.width / 2;
        if (Math.abs(gapX - myX) < TILE_SIZE) {
          // Already under the gap — jump!
          if (this.grounded && this.jumpCooldownTimer <= 0) {
            const jumpHeight = (this.jumpTiles + 1) * TILE_SIZE;
            this.vy = -Math.sqrt(2 * GRAVITY * jumpHeight);
            this.jumpCooldownTimer = 500;
          }
        } else {
          this.vx = gapX > myX ? speed : -speed;
        }
        return;
      }
      if (l >= 0 && this.roomData[headRow]?.[l] === 0) {
        const gapX = l * TILE_SIZE + TILE_SIZE / 2;
        const myX = this.x + this.width / 2;
        if (Math.abs(gapX - myX) < TILE_SIZE) {
          if (this.grounded && this.jumpCooldownTimer <= 0) {
            const jumpHeight = (this.jumpTiles + 1) * TILE_SIZE;
            this.vy = -Math.sqrt(2 * GRAVITY * jumpHeight);
            this.jumpCooldownTimer = 500;
          }
        } else {
          this.vx = gapX > myX ? speed : -speed;
        }
        return;
      }
    }
    // No ceiling gap — move toward player X as fallback
    const dir = this.target.x > this.x ? 1 : -1;
    this.vx = dir * speed;
  }

  private updateHpBar(): void {
    this.hpBarContainer.clear();
    const barW = this.width + 4;
    const barH = 3;
    const barX = (this.width - barW) / 2;
    const barY = -6;

    // Background
    this.hpBarContainer.rect(barX, barY, barW, barH).fill(0x333333);
    // HP fill
    const ratio = Math.max(0, this.hp / this.maxHp);
    const color = ratio > 0.5 ? 0x22cc22 : ratio > 0.25 ? 0xcccc22 : 0xcc2222;
    this.hpBarContainer.rect(barX, barY, barW * ratio, barH).fill(color);
  }

  /**
   * Scan the wall in front of the enemy to measure its height in tiles.
   * Returns 0 if no wall, or the number of solid tiles stacked vertically.
   */
  private scanWallHeight(): number {
    if (this.roomData.length === 0) return 0;
    const TILE = 16;
    const dir = this.facingRight ? 1 : -1;
    // Check column in front of the enemy
    const checkCol = dir > 0
      ? Math.floor((this.x + this.width + 2) / TILE)
      : Math.floor((this.x - 2) / TILE);
    const feetRow = Math.floor((this.y + this.height - 1) / TILE);
    const gridH = this.roomData.length;
    const gridW = this.roomData[0]?.length ?? 0;

    if (checkCol < 0 || checkCol >= gridW) return 0;

    // Count solid tiles upward from feet level
    let height = 0;
    for (let row = feetRow; row >= 0; row--) {
      if (this.roomData[row]?.[checkCol] === 1) {
        height++;
      } else {
        break; // found air — wall ends here
      }
    }
    return height;
  }

  protected stateHitUpdate(dt: number): void {
    this._hitstunTimer -= dt;
    this.vx *= 0.9;
    if (this._hitstunTimer <= 0) {
      this.fsm.transition('idle' as S);
    }
  }
}
