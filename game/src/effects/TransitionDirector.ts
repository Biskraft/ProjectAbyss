import { Container, Graphics } from 'pixi.js';
import { GAME_HEIGHT, GAME_WIDTH, type Game } from '../Game';

export const TransitionTokens = {
  ROOM_SWAP: 180,
  SCENE_SWAP: 320,
  DEATH_RESPAWN: 280,
  OVERLAY_DIM: 120,
} as const;

export type TransitionCover = number | 'black' | 'white';

interface CoverSwapRevealOptions {
  cover?: TransitionCover;
  durationOutMs: number;
  durationInMs: number;
  startCovered?: boolean;
  holdFrames?: number;
  holdMs?: number;
  onSwap: () => void | Promise<void>;
  onComplete?: () => void;
}

type Phase = 'idle' | 'cover' | 'swap' | 'hold' | 'reveal';

function coverColor(cover: TransitionCover | undefined): number {
  if (cover === 'white') return 0xffffff;
  if (typeof cover === 'number') return cover;
  return 0x000000;
}

function progress01(elapsedMs: number, durationMs: number): number {
  if (durationMs <= 0) return 1;
  return Math.max(0, Math.min(1, elapsedMs / durationMs));
}

export class TransitionDirector {
  private readonly overlay = new Graphics();
  private phase: Phase = 'idle';
  private elapsedMs = 0;
  private durationOutMs: number = TransitionTokens.ROOM_SWAP;
  private durationInMs: number = TransitionTokens.ROOM_SWAP;
  private holdFramesRemaining = 0;
  private holdMsRemaining = 0;
  private activeOptions: CoverSwapRevealOptions | null = null;
  private swapRunning = false;
  private previousInputLocked = false;

  constructor(
    private readonly game: Game,
    parent: Container,
  ) {
    this.overlay.rect(0, 0, GAME_WIDTH, GAME_HEIGHT).fill(0x000000);
    this.overlay.alpha = 0;
    parent.addChild(this.overlay);
  }

  get isActive(): boolean {
    return this.phase !== 'idle';
  }

  get blocksSceneUpdate(): boolean {
    return this.isActive;
  }

  coverSwapReveal(options: CoverSwapRevealOptions): Promise<void> {
    return new Promise(resolve => {
      const started = this.startCoverSwapReveal({
        ...options,
        onComplete: () => {
          options.onComplete?.();
          resolve();
        },
      });
      if (!started) resolve();
    });
  }

  startCoverSwapReveal(options: CoverSwapRevealOptions): boolean {
    if (this.isActive) return false;

    this.activeOptions = options;
    this.durationOutMs = options.durationOutMs;
    this.durationInMs = options.durationInMs;
    this.holdFramesRemaining = options.holdFrames ?? 1;
    this.holdMsRemaining = options.holdMs ?? 0;
    this.elapsedMs = 0;
    this.swapRunning = false;
    this.previousInputLocked = this.game.input.inputLocked;
    this.game.input.inputLocked = true;

    this.overlay.clear();
    this.overlay.rect(0, 0, GAME_WIDTH, GAME_HEIGHT).fill(coverColor(options.cover));
    this.overlay.alpha = options.startCovered ? 1 : 0;
    this.phase = options.startCovered || this.durationOutMs <= 0 ? 'swap' : 'cover';
    return true;
  }

  update(dtMs: number): void {
    if (this.phase === 'idle') return;

    if (this.phase === 'cover') {
      this.elapsedMs += dtMs;
      const t = progress01(this.elapsedMs, this.durationOutMs);
      this.overlay.alpha = t;
      if (t >= 1) {
        this.phase = 'swap';
        this.elapsedMs = 0;
      }
      return;
    }

    if (this.phase === 'swap') {
      this.runSwap();
      return;
    }

    if (this.phase === 'hold') {
      this.overlay.alpha = 1;
      if (this.holdMsRemaining > 0) {
        this.holdMsRemaining = Math.max(0, this.holdMsRemaining - dtMs);
        return;
      }
      if (this.holdFramesRemaining > 0) {
        this.holdFramesRemaining--;
        return;
      }
      this.phase = 'reveal';
      this.elapsedMs = 0;
      return;
    }

    if (this.phase === 'reveal') {
      this.elapsedMs += dtMs;
      const t = progress01(this.elapsedMs, this.durationInMs);
      this.overlay.alpha = 1 - t;
      if (t >= 1) this.finish();
    }
  }

  reset(): void {
    this.finish();
  }

  private runSwap(): void {
    const options = this.activeOptions;
    if (!options || this.swapRunning) return;

    this.swapRunning = true;
    this.overlay.alpha = 1;
    Promise.resolve()
      .then(() => options.onSwap())
      .then(() => {
        if (this.phase !== 'swap') return;
        this.phase = 'hold';
        this.elapsedMs = 0;
      })
      .catch((error) => {
        console.error('[TransitionDirector] swap failed', error);
        this.finish();
      });
  }

  private finish(): void {
    const options = this.activeOptions;
    this.phase = 'idle';
    this.elapsedMs = 0;
    this.holdFramesRemaining = 0;
    this.holdMsRemaining = 0;
    this.swapRunning = false;
    this.activeOptions = null;
    this.overlay.alpha = 0;
    this.game.input.inputLocked = this.previousInputLocked;
    options?.onComplete?.();
  }
}
