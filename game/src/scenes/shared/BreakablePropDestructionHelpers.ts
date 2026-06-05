import type { BreakableProp, PropDrop } from '@entities/BreakableProp';
import type { GoldPickup } from '@entities/GoldPickup';
import type { Player } from '@entities/Player';
import type { HitSparkManager } from '@effects/HitSpark';
import type { PropShatterManager } from '@effects/PropShatter';
import { applyBreakableDrop } from './BreakableDropHelpers';
import {
  applyBreakableDestroyFeedback,
  type BreakableDestroySource,
} from './BreakableFeedbackHelpers';

interface BreakablePropDestructionGame {
  hitstopFrames: number;
  camera: {
    shake: (amount: number) => void;
  };
}

interface ApplyBreakablePropBreakConsequencesInput {
  prop: BreakableProp;
  drop: PropDrop;
  source: BreakableDestroySource;
  player: Player;
  game: BreakablePropDestructionGame;
  propShatter: PropShatterManager;
  hitSparks: HitSparkManager;
  collisionGrid: number[][];
  addGoldPickup: (pickup: GoldPickup) => void;
}

export function applyBreakablePropBreakConsequences(
  input: ApplyBreakablePropBreakConsequencesInput,
): void {
  applyBreakableDestroyFeedback({
    prop: input.prop,
    source: input.source,
    player: input.player,
    game: input.game,
    propShatter: input.propShatter,
    hitSparks: input.hitSparks,
  });

  applyBreakableDrop({
    prop: input.prop,
    drop: input.drop,
    player: input.player,
    collisionGrid: input.collisionGrid,
    addGoldPickup: input.addGoldPickup,
  });
}
