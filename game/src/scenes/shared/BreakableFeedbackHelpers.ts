import { SFX } from '@audio/Sfx';
import type { Player } from '@entities/Player';
import type { HitSparkManager } from '@effects/HitSpark';
import type { PropShatterManager } from '@effects/PropShatter';
import type { Texture } from 'pixi.js';

export type BreakableDestroySource = 'sword' | 'fire';

interface BreakableFeedbackGame {
  hitstopFrames: number;
  camera: {
    shake: (amount: number) => void;
  };
}

interface BreakableVisualCarrier {
  x: number;
  y: number;
  width: number;
  height: number;
  getParticleColor: () => number;
  getAccentColor: () => number;
  getArtifactTexture: () => Texture | null;
}

interface ApplyBreakableDestroyFeedbackInput {
  prop: BreakableVisualCarrier;
  source: BreakableDestroySource;
  player: Player;
  game: BreakableFeedbackGame;
  propShatter: PropShatterManager;
  hitSparks: HitSparkManager;
}

export function applyBreakableDestroyFeedback(input: ApplyBreakableDestroyFeedbackInput): void {
  const { prop, source, player, game, propShatter, hitSparks } = input;
  if (source === 'sword') {
    game.hitstopFrames += 4;
    game.camera.shake(4);
  }

  propShatter.spawn(
    prop.x,
    prop.y,
    prop.width,
    prop.height,
    prop.getParticleColor(),
    prop.getAccentColor(),
    prop.getArtifactTexture(),
  );
  SFX.play('breakable_destroy', 0, { speed: 1 / (1 + Math.random() * 0.5) });

  if (source === 'sword') {
    hitSparks.spawn(
      prop.x + prop.width / 2,
      prop.y + prop.height / 2,
      false,
      player.facingRight ? 1 : -1,
    );
  }
}
