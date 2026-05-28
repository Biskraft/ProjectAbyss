import type { Container } from 'pixi.js';
import type { Game } from '../../Game';
import type { Player } from '@entities/Player';
import type { Anvil } from '@entities/Anvil';
import type { GiantBuilder } from '@entities/GiantBuilder';
import { ItemDeploymentController } from '@effects/ItemDeploymentController';
import type { AABB } from '@core/Physics';

interface AnvilDeploymentDeps {
  game: Game;
  player: Player;
  entityLayer: Container;
  activeBuilder: GiantBuilder | null;
  deploymentFxLayer: Container;
  tunnelRightEdge: number;
  getAnvil: () => Anvil | null;
  enterItemWorld: () => void;
  spawnStrikeEffect: (x: number, y: number, strong: boolean, variant: number) => void;
  openTunnel: (x: number, y: number, w: number, h: number) => void;
  setLaserDesaturation: (active: boolean) => void;
  showTunnelOpenDialogue: () => void;
  getEntranceAABB?: () => AABB | null;
}

export function createAnvilItemDeployment(deps: AnvilDeploymentDeps): ItemDeploymentController {
  return new ItemDeploymentController(
    deps.game,
    deps.player,
    deps.entityLayer,
    deps.enterItemWorld,
    deps.activeBuilder,
    (x, y) => deps.spawnStrikeEffect(x, y, true, 1),
    deps.openTunnel,
    deps.tunnelRightEdge,
    () => deps.getAnvil()?.getGatePivotWorld() ?? null,
    deps.deploymentFxLayer,
    deps.setLaserDesaturation,
    () => deps.getAnvil()?.getPlacedItemWorld() ?? null,
    () => deps.getAnvil()?.startPlacedItemPunch(),
    (targetX, targetY) => deps.getAnvil()?.startPlacedItemDissolve(targetX, targetY),
    () => {
      // Retirement is decided after Item World return, not at absorption time.
    },
    deps.showTunnelOpenDialogue,
    deps.getEntranceAABB ?? null,
  );
}
