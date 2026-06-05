import type { Enemy } from '@entities/Enemy';
import {
  isEnemyPostDefeatHandled,
  markEnemyPostDefeatHandled,
} from '@entities/EnemyMetadata';

interface ProcessEnemyPostDefeatsInput {
  enemies: Enemy<string>[];
  processNewDefeat: (enemy: Enemy<string>) => void;
  removeEnemyAt: (index: number) => void;
}

interface UpdateEnemyDefeatLifecycleInput {
  enemies: Enemy<string>[];
  dtMs: number;
  processNewDefeat: (enemy: Enemy<string>) => void;
  removeEnemyAt: (index: number) => void;
}

export function updateEnemyDefeatLifecycle(input: UpdateEnemyDefeatLifecycleInput): void {
  const { enemies } = input;
  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const enemy = enemies[i];
    const wasAlive = enemy.alive;
    enemy.update(input.dtMs);

    if (wasAlive && !enemy.alive) {
      input.processNewDefeat(enemy);
    }

    if (enemy.shouldRemove) {
      input.removeEnemyAt(i);
    }
  }
}

export function processEnemyPostDefeats(input: ProcessEnemyPostDefeatsInput): void {
  const { enemies } = input;
  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const enemy = enemies[i];
    if (!enemy) continue;

    if (!enemy.alive && !isEnemyPostDefeatHandled(enemy)) {
      markEnemyPostDefeatHandled(enemy);
      input.processNewDefeat(enemy);
    }

    if (enemy.shouldRemove) {
      input.removeEnemyAt(i);
    }
  }
}
