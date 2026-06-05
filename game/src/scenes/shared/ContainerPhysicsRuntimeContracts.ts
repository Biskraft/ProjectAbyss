import type { Enemy } from '@entities/Enemy';
import type { Player } from '@entities/Player';
import type { ThrowableContainer } from '@entities/ThrowableContainer';
import type { TileMutator } from '@systems/TileMutator';
import type { DamageNumberManager } from '@ui/DamageNumber';
import type { HitSparkManager } from '@effects/HitSpark';

export interface ContainerPhysicsRuntimeDeps {
  getPlayer: () => Player;
  getEnemies: () => readonly Enemy<string>[];
  getContainers: () => readonly ThrowableContainer[];
  getCollisionGrid: () => number[][];
  getTileMutator: () => TileMutator;
  getDamageNumbers: () => DamageNumberManager;
  getHitSparks: () => HitSparkManager;
  paintContainerImpact: (kind: ThrowableContainer['kind'], gx: number, gy: number, volume: number) => void;
  applyContainerEffectToFluid: (container: ThrowableContainer) => void;
  destroyContainerWithVFX: (container: ThrowableContainer) => void;
  removeContainerAt: (index: number) => void;
  flushContainerFluidChanges: () => void;
}
