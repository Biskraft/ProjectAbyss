import type { Enemy } from '@entities/Enemy';
import { isBossEnemy, setPortalSpawned, wasPortalSpawned } from '@entities/EnemyMetadata';

interface BossClearStep {
  remainingMs: number;
  action: () => void | Promise<void>;
}

interface ItemWorldBossClearRuntimeDeps {
  getTimeScale: () => number;
}

export interface StartBossClearSequenceOptions {
  onFollowupBurst: () => void;
  onSpawnTrapdoor: () => Promise<void> | void;
}

export interface StartDelayOptions {
  delayMs: number;
  action: () => void | Promise<void>;
}

export class ItemWorldBossClearRuntime {
  private readonly steps: BossClearStep[] = [];
  private isRunningAsync = false;
  private runToken = 0;
  private readonly FOLLOWUP_DELAY_MS = 160;
  private readonly SPAWN_DELAY_MS = 2500;

  constructor(private readonly deps: ItemWorldBossClearRuntimeDeps) {}

  consumeDefeatedBoss(enemies: readonly Enemy<string>[]): Enemy<string> | null {
    for (const enemy of enemies) {
      if (!enemy.alive && isBossEnemy(enemy) && !wasPortalSpawned(enemy)) {
        setPortalSpawned(enemy);
        return enemy;
      }
    }
    return null;
  }

  start(options: StartBossClearSequenceOptions): void {
    this.startSteps([
      {
        remainingMs: this.scaleDelay(this.FOLLOWUP_DELAY_MS),
        action: options.onFollowupBurst,
      },
      {
        remainingMs: this.scaleDelay(this.SPAWN_DELAY_MS - this.FOLLOWUP_DELAY_MS),
        action: options.onSpawnTrapdoor,
      },
    ]);
  }

  startDelay(options: StartDelayOptions): void {
    this.startSteps([{
      remainingMs: this.scaleDelay(options.delayMs),
      action: options.action,
    }]);
  }

  private startSteps(steps: BossClearStep[]): void {
    this.steps.length = 0;
    this.isRunningAsync = false;
    this.runToken += 1;
    for (const step of steps) {
      this.steps.push(step);
    }
  }

  private scaleDelay(delayMs: number): number {
    const timeScale = this.deps.getTimeScale();
    return Math.max(1, Math.round(delayMs * timeScale));
  }

  destroy(): void {
    this.steps.length = 0;
    this.isRunningAsync = false;
    this.runToken += 1;
  }

  update(dtMs: number): void {
    if (this.isRunningAsync || this.steps.length === 0) return;

    const step = this.steps[0];
    step.remainingMs -= dtMs;
    if (step.remainingMs > 0) return;

    this.steps.shift();
    const actionResult = step.action();
    if (actionResult && typeof (actionResult as Promise<unknown>).then === 'function') {
      const token = this.runToken;
      this.isRunningAsync = true;
      void Promise.resolve(actionResult).finally(() => {
        if (this.runToken !== token) return;
        this.isRunningAsync = false;
      });
    }
  }
}
