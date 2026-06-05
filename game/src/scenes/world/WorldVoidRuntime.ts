import { Graphics } from 'pixi.js';
import { isInVoid } from '@core/Physics';
import type { Player } from '@entities/Player';
import { getProgress01 } from '@scenes/shared/NumericHelpers';
import type { Game } from '../../Game';

const VOID_FADE_OUT_DURATION = 200;
const VOID_HOLD_DURATION = 1000;
const VOID_FADE_IN_DURATION = 500;
const VOID_INPUT_LOCK_MS = 2000;
const VOID_COOLDOWN_MS = 500;

type VoidFadePhase = 'none' | 'out' | 'hold' | 'in';

interface WorldVoidRuntimeDeps {
  game: Game;
  getPlayer: () => Player;
  getFadeOverlay: () => Graphics;
  getCurrentLevelId: () => string | null;
  getFallbackLevelId: () => string;
  resolveReturnPoint: () => { x: number; y: number };
  teleportTo: (levelId: string, x: number, y: number) => void;
}

export class WorldVoidRuntime {
  private active = false;
  private fadePhase: VoidFadePhase = 'none';
  private fadeTimer = 0;
  private inputLockMs = 0;
  private teleported = false;
  private returnLevelId = '';
  private returnX = 0;
  private returnY = 0;
  private lastSafeLevelId = '';
  private lastSafeX = 0;
  private lastSafeY = 0;
  private cooldownMs = 0;

  constructor(private readonly deps: WorldVoidRuntimeDeps) {}

  get isActive(): boolean {
    return this.active;
  }

  recordSafePosition(x: number, y: number): void {
    this.lastSafeLevelId = this.deps.getCurrentLevelId() ?? this.deps.getFallbackLevelId();
    this.lastSafeX = x;
    this.lastSafeY = y;
  }

  getLastSafePosition(): { x: number; y: number } {
    return { x: this.lastSafeX, y: this.lastSafeY };
  }

  updateCooldown(dt: number): void {
    if (this.cooldownMs > 0) this.cooldownMs = Math.max(0, this.cooldownMs - dt);
  }

  checkContact(): void {
    const player = this.deps.getPlayer();
    if (this.active || this.cooldownMs > 0 || player.hp <= 0) return;
    if (!isInVoid(player.x, player.y, player.width, player.height, player.roomData)) return;

    const returnPoint = this.deps.resolveReturnPoint();
    this.active = true;
    this.returnLevelId = this.lastSafeLevelId || this.deps.getCurrentLevelId() || this.deps.getFallbackLevelId();
    this.returnX = returnPoint.x;
    this.returnY = returnPoint.y;
    this.fadePhase = 'out';
    this.fadeTimer = 0;
    this.inputLockMs = VOID_INPUT_LOCK_MS;
    this.teleported = false;
    this.deps.getFadeOverlay().alpha = 0;
    this.deps.game.input.inputLocked = true;
  }

  update(dt: number): void {
    if (!this.active) return;

    if (this.inputLockMs > 0) this.inputLockMs = Math.max(0, this.inputLockMs - dt);
    this.fadeTimer += dt;

    const overlay = this.deps.getFadeOverlay();
    const player = this.deps.getPlayer();

    if (this.fadePhase === 'out') {
      const t = getProgress01(this.fadeTimer, VOID_FADE_OUT_DURATION);
      overlay.alpha = t;
      if (t >= 1) {
        if (!this.teleported) {
          this.deps.teleportTo(this.returnLevelId, this.returnX, this.returnY);
          this.teleported = true;
        }
        this.fadePhase = 'hold';
        this.fadeTimer = 0;
      }
    } else if (this.fadePhase === 'hold') {
      overlay.alpha = 1;
      player.forceGrounded(false, 'void-fade');
      if (this.fadeTimer >= VOID_HOLD_DURATION) {
        this.fadePhase = 'in';
        this.fadeTimer = 0;
      }
    } else if (this.fadePhase === 'in') {
      const t = getProgress01(this.fadeTimer, VOID_FADE_IN_DURATION);
      overlay.alpha = 1 - t;
      player.forceGrounded(false, 'void-fade');
      if (t >= 1) {
        overlay.alpha = 0;
        this.fadePhase = 'none';
      }
    }

    if (this.inputLockMs <= 0 && this.fadePhase === 'none') {
      this.active = false;
      this.cooldownMs = VOID_COOLDOWN_MS;
      this.deps.game.input.inputLocked = false;
    }
  }
}
