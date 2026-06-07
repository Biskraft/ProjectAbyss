import { isInVoid } from '@core/Physics';
import type { Player } from '@entities/Player';
import type { Game } from '../../Game';

const VOID_FADE_OUT_DURATION = 200;
const VOID_HOLD_DURATION = 1000;
const VOID_FADE_IN_DURATION = 500;
const VOID_COOLDOWN_MS = 500;

interface WorldVoidRuntimeDeps {
  game: Game;
  getPlayer: () => Player;
  getCurrentLevelId: () => string | null;
  getFallbackLevelId: () => string;
  resolveReturnPoint: () => { x: number; y: number };
  teleportTo: (levelId: string, x: number, y: number) => void;
}

export class WorldVoidRuntime {
  private active = false;
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
    const started = this.deps.game.transitionDirector.startCoverSwapReveal({
      cover: 'black',
      durationOutMs: VOID_FADE_OUT_DURATION,
      durationInMs: VOID_FADE_IN_DURATION,
      holdMs: VOID_HOLD_DURATION,
      onSwap: () => this.deps.teleportTo(this.returnLevelId, this.returnX, this.returnY),
      onComplete: () => {
        this.active = false;
        this.cooldownMs = VOID_COOLDOWN_MS;
      },
    });
    if (!started) this.active = false;
  }

  update(dt: number): void {
    if (!this.active) return;
    const player = this.deps.getPlayer();
    player.forceGrounded(false, 'void-fade');
  }
}
