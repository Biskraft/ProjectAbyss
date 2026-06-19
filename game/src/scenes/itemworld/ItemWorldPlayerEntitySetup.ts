import type { Container } from 'pixi.js';
import type { Game } from '../../Game';
import { Player } from '@entities/Player';
import { ArcTether } from '@effects/ArcTether';
import { configureItemWorldPlayerFromSource } from './ItemWorldPlayerSetup';

export interface ItemWorldPlayerEntitySetupResult {
  player: Player;
  arcTether: ArcTether;
}

export function createItemWorldPlayerEntity(args: {
  game: Game;
  entityLayer: Container;
  sourcePlayer: Player;
  existingArcTether: ArcTether | null | undefined;
  fluidOverlayQuery: Player['fluidOverlayQuery'];
  onFlaskHeal: Player['onFlaskHeal'];
}): ItemWorldPlayerEntitySetupResult {
  const player = new Player(args.game);
  configureItemWorldPlayerFromSource(player, args.sourcePlayer, {
    fluidOverlayQuery: args.fluidOverlayQuery,
    onFlaskHeal: args.onFlaskHeal,
  });
  args.entityLayer.addChild(player.container);

  let arcTether = args.existingArcTether;
  if (!arcTether) {
    arcTether = new ArcTether();
    args.entityLayer.addChild(arcTether.container);
  }

  return { player, arcTether };
}
