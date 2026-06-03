import type { Container } from 'pixi.js';
import type { Game } from '../../Game';
import type { AABB } from '@core/Physics';
import type { Anvil } from '@entities/Anvil';
import type { GiantBuilder } from '@entities/GiantBuilder';
import type { Player } from '@entities/Player';
import type { ItemInstance } from '@items/ItemInstance';
import type { ItemWorldEntrySequence } from '@effects/ItemWorldEntrySequence';
import type {
  ItemDeploymentStreamWorldOptions,
  ItemDeploymentTunnelOpenOptions,
} from '@effects/ItemDeploymentTypes';
import { createAnvilItemDeployment } from './AnvilDeploymentFactory';

interface WorldAnvilDeploymentRuntimeDeps {
  game: Game;
  getPlayer: () => Player;
  getEntityLayer: () => Container;
  getActiveBuilder: () => GiantBuilder | null;
  getDeploymentFxLayer: () => Container;
  getTunnelRightEdge: () => number;
  getAnvil: () => Anvil | null;
  getItem: () => ItemInstance | null;
  getCurrentLevelId: () => string | null;
  hidePrompts: () => void;
  hideSavePoint: () => void;
  hideUiForDiveTransition: () => void;
  recordReturnState: (anvil: Anvil, levelId: string | null, item: ItemInstance) => void;
  setPreTunnelLevelId: (levelId: string) => void;
  incrementDive: (itemDefId: string) => void;
  destroyDeployment: () => void;
  setDeployment: (deployment: ItemWorldEntrySequence) => void;
  enterItemWorld: () => void;
  spawnStrikeEffect: (x: number, y: number, strong: boolean, variant: number) => void;
  openTunnel: (x: number, y: number, w: number, h: number, options?: ItemDeploymentTunnelOpenOptions) => void;
  setLaserDesaturation: (active: boolean) => void;
  showTunnelOpenDialogue: () => void;
  prepareStreamWorld: (options: ItemDeploymentStreamWorldOptions) => { x: number; y: number } | null;
  loadStreamWorld: (options: ItemDeploymentStreamWorldOptions) => { x: number; y: number } | null;
  getEntranceAABB: () => AABB | null;
  getPlatformStart: () => { x: number; y: number } | null;
  getPlatformVisualStart: () => { x: number; y: number } | null;
}

export class WorldAnvilDeploymentRuntime {
  constructor(private readonly deps: WorldAnvilDeploymentRuntimeDeps) {}

  triggerFloorCollapse(): void {
    const anvil = this.deps.getAnvil();
    const item = this.deps.getItem();
    if (!anvil || !item) return;

    this.deps.hidePrompts();
    this.deps.hideSavePoint();
    this.deps.hideUiForDiveTransition();

    anvil.used = true;
    anvil.setShowHint(false);

    const levelId = this.deps.getCurrentLevelId();
    this.deps.recordReturnState(anvil, levelId, item);
    if (levelId) this.deps.setPreTunnelLevelId(levelId);

    this.deps.incrementDive(item.def.id);

    this.deps.game.hitstopFrames = 8;
    this.deps.game.camera.shake(3);
    this.deps.spawnStrikeEffect(anvil.x, anvil.y - 10, true, 0);

    this.deps.destroyDeployment();
    const deployment = createAnvilItemDeployment({
      game: this.deps.game,
      player: this.deps.getPlayer(),
      entityLayer: this.deps.getEntityLayer(),
      activeBuilder: this.deps.getActiveBuilder(),
      deploymentFxLayer: this.deps.getDeploymentFxLayer(),
      tunnelRightEdge: this.deps.getTunnelRightEdge(),
      getAnvil: () => this.deps.getAnvil(),
      enterItemWorld: () => this.deps.enterItemWorld(),
      spawnStrikeEffect: (x, y, strong, variant) => this.deps.spawnStrikeEffect(x, y, strong, variant),
      openTunnel: (x, y, w, h, options) => this.deps.openTunnel(x, y, w, h, options ?? { scheduleGhost: false }),
      setLaserDesaturation: (active) => this.deps.setLaserDesaturation(active),
      showTunnelOpenDialogue: () => this.deps.showTunnelOpenDialogue(),
      prepareStreamWorld: (options) => this.deps.prepareStreamWorld(options),
      loadStreamWorld: (options) => this.deps.loadStreamWorld(options),
      getEntranceAABB: () => this.deps.getEntranceAABB(),
      getPlatformStart: () => this.deps.getPlatformStart(),
      getPlatformVisualStart: () => this.deps.getPlatformVisualStart(),
    });
    this.deps.setDeployment(deployment);
    deployment.start(anvil.x, anvil.y);
  }
}
