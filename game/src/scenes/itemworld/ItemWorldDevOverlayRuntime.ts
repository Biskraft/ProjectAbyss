import { BitmapText, type Container } from 'pixi.js';
import { Debug } from '@core/Debug';
import { createRoomGraphDebugOverlay } from '@level/RoomGraphDebugOverlay';
import type { RoomGraphData } from '@level/RoomGraph';
import { TOPOLOGY_VALUES, type StrataConfig, type TopologyKind } from '@data/StrataConfig';
import { PIXEL_FONT } from '@ui/fonts';
import type { Game } from '../../Game';
import { destroyNullableDisplayObject } from '@scenes/shared/DisplayObjectLifecycleHelpers';

interface ItemWorldDevOverlayRuntimeOptions {
  game: Game;
  getRoomGraphs: () => RoomGraphData[];
  getItemRarity: () => string;
  getItemUid: () => number;
  getWeaponTopologyOverride: () => TopologyKind | undefined;
  getStrataConfig: () => StrataConfig;
}

export class ItemWorldDevOverlayRuntime {
  private roomGraphDebugContainer: Container | null = null;
  private roomGraphDebugVisible = false;
  private roomGraphDebugKeyHandler: ((e: KeyboardEvent) => void) | null = null;
  private topologyCycleKeyHandler: ((e: KeyboardEvent) => void) | null = null;
  private topologyLabel: BitmapText | null = null;

  constructor(private readonly options: ItemWorldDevOverlayRuntimeOptions) {}

  init(urlTopology: TopologyKind | undefined): void {
    this.destroy();
    this.initTopologyLabel(urlTopology);
    this.maybeInitRoomGraphDebug();
    this.initTopologyCycleKey();
  }

  destroy(): void {
    this.destroyRoomGraphDebug();
    this.destroyTopologyCycleKey();
    this.topologyLabel = destroyNullableDisplayObject(this.topologyLabel);
  }

  private maybeInitRoomGraphDebug(): void {
    const params = new URLSearchParams(window.location.search);
    const dbg = params.get('debug');
    const enabled = dbg === '1' || (dbg?.includes('graph') ?? false);
    if (!enabled) return;

    const graphs = this.options.getRoomGraphs();
    if (graphs.length === 0) return;

    const canvas = this.options.game.app.canvas;
    this.roomGraphDebugContainer = createRoomGraphDebugOverlay(
      graphs,
      this.options.getItemRarity(),
      this.options.getItemUid(),
      canvas.width,
      canvas.height,
    );
    this.roomGraphDebugContainer.visible = false;
    this.options.game.uiContainer.addChild(this.roomGraphDebugContainer);

    this.roomGraphDebugKeyHandler = (e: KeyboardEvent) => {
      if (e.code !== 'Digit2' || !e.shiftKey) return;
      e.preventDefault();
      this.roomGraphDebugVisible = !this.roomGraphDebugVisible;
      if (this.roomGraphDebugContainer) {
        this.roomGraphDebugContainer.visible = this.roomGraphDebugVisible;
      }
    };
    window.addEventListener('keydown', this.roomGraphDebugKeyHandler, true);
    Debug.log(`[RoomGraph debug] mounted ${graphs.length} stratum graph(s). Press Shift+2 to toggle.`);
  }

  private destroyRoomGraphDebug(): void {
    if (this.roomGraphDebugKeyHandler) {
      window.removeEventListener('keydown', this.roomGraphDebugKeyHandler, true);
      this.roomGraphDebugKeyHandler = null;
    }
    this.roomGraphDebugContainer = destroyNullableDisplayObject(this.roomGraphDebugContainer, { children: true });
    this.roomGraphDebugVisible = false;
  }

  private initTopologyCycleKey(): void {
    const topologies = Array.from(TOPOLOGY_VALUES);
    this.topologyCycleKeyHandler = (e: KeyboardEvent) => {
      if (e.code === 'KeyL' && e.shiftKey) {
        Debug.log('[ItemWorld] Shift+L caught.');
      }
      if (e.code !== 'KeyL' || !e.shiftKey) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const params = new URLSearchParams(window.location.search);
      const cur = (params.get('topology') ?? '').trim().toLowerCase();
      const idx = topologies.indexOf(cur as TopologyKind);
      const next = topologies[(idx + 1) % topologies.length];
      params.set('topology', next);
      const url = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
      Debug.log(`[ItemWorld] Topology cycle: ${cur || '(none)'} -> ${next}. Reloading...`);
      window.history.replaceState(null, '', url);
      window.location.reload();
    };
    window.addEventListener('keydown', this.topologyCycleKeyHandler, true);
    Debug.log(`[ItemWorld] Shift+L ready: cycle ?topology= through ${topologies.length} kinds (page reload).`);
  }

  private destroyTopologyCycleKey(): void {
    if (this.topologyCycleKeyHandler) {
      window.removeEventListener('keydown', this.topologyCycleKeyHandler, true);
      this.topologyCycleKeyHandler = null;
    }
  }

  private initTopologyLabel(urlTopology: TopologyKind | undefined): void {
    let source: 'URL' | 'WEAPON' | 'STRATUM';
    let text: string;
    const weaponTopology = this.options.getWeaponTopologyOverride();
    if (urlTopology) {
      source = 'URL';
      text = urlTopology;
    } else if (weaponTopology) {
      source = 'WEAPON';
      text = weaponTopology;
    } else {
      source = 'STRATUM';
      text = this.options.getStrataConfig().strata.map(s => s.topology).join('/');
    }
    this.topologyLabel = new BitmapText({
      text: `TOPO[${source}]: ${text}`,
      style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0xFFA41B },
    });
    this.topologyLabel.x = 4;
    this.topologyLabel.y = 4;
    this.options.game.uiContainer.addChild(this.topologyLabel);
  }

}
