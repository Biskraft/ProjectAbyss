import type { UISkin } from '@ui/UISkin';
import { WorldMapOverlay, type WorldMapDynamicGrid } from '@ui/WorldMapOverlay';
import type { LdtkLevel, LdtkLoader } from '@level/LdtkLoader';
import type { GiantBuilder } from '@entities/GiantBuilder';

type MapMarker = { roomId: string; type: 'save' | 'anvil' | 'boss' | 'gate'; label?: string };

interface WorldMapPlayer {
  x: number;
  y: number;
}

interface WorldMapRuntimeDeps {
  loader: LdtkLoader;
  skin: UISkin | null;
  uiScale: number;
  getVisitedLevels: () => Set<string>;
  getCurrentLevel: () => LdtkLevel | null;
  getPlayer: () => WorldMapPlayer;
  getActiveBuilder: () => GiantBuilder | null;
}

export class WorldMapRuntime {
  readonly overlay: WorldMapOverlay;

  constructor(private readonly deps: WorldMapRuntimeDeps) {
    this.overlay = new WorldMapOverlay(deps.skin, deps.uiScale);
    this.overlay.setLoader(deps.loader);
    this.overlay.setRooms(deps.loader.getWorldMap().filter(room =>
      room.roomType !== 'Debug' && room.roomType !== 'Cinematic' && !room.id.startsWith('Debug_')
    ));
    this.overlay.setDebugRooms(deps.loader.getWorldMap().filter(room => room.roomType !== 'Cinematic'));
  }

  syncVisibleRedraw(): void {
    if (!this.overlay.visible) return;
    this.sync({ includePlayerPosition: true, redraw: true });
  }

  syncDynamicGrids(): void {
    this.overlay.setDynamicGrids(this.collectDynamicGrids());
  }

  updatePlayerPosition(): void {
    const currentLevel = this.deps.getCurrentLevel();
    if (!currentLevel) return;
    const player = this.deps.getPlayer();
    this.overlay.setPlayerPosition(
      player.x + currentLevel.worldX,
      player.y + currentLevel.worldY,
    );
  }

  openDebug(onRoomClick: (roomId: string, localX: number, localY: number) => void): void {
    this.sync({ includePlayerPosition: true });
    this.overlay.onRoomClick = onRoomClick;
    this.overlay.openDebug();
  }

  sync(options: { includePlayerPosition?: boolean; redraw?: boolean } = {}): void {
    const currentLevel = this.deps.getCurrentLevel();
    this.overlay.setExplorationState(this.deps.getVisitedLevels(), currentLevel?.identifier ?? '');
    this.overlay.setMarkers(this.collectMarkers());
    this.syncDynamicGrids();
    if (options.includePlayerPosition) this.updatePlayerPosition();
    if (options.redraw) this.overlay.redraw();
  }

  private collectDynamicGrids(): WorldMapDynamicGrid[] {
    const builder = this.deps.getActiveBuilder();
    const level = this.deps.getCurrentLevel();
    if (!builder || !level) return [];
    if (!this.deps.getVisitedLevels().has(level.identifier)) return [];
    return [{
      roomId: level.identifier,
      worldX: level.worldX + builder.container.x,
      worldY: level.worldY + builder.container.y,
      grid: builder.collisionGrid,
    }];
  }

  private collectMarkers(): MapMarker[] {
    const markers: MapMarker[] = [];

    for (const id of this.deps.getVisitedLevels()) {
      const level = this.deps.loader.getLevel(id);
      if (!level) continue;

      for (const entity of level.entities) {
        if (entity.type === 'GameSaver') {
          markers.push({ roomId: id, type: 'save' });
        } else if (entity.type === 'Anvil') {
          markers.push({ roomId: id, type: 'anvil' });
        } else if (entity.type === 'Enemy_Spawn') {
          const enemyType = (entity.fields.type as string) ?? '';
          if (enemyType === 'Boss') {
            markers.push({ roomId: id, type: 'boss' });
          }
        } else if (entity.type === 'LockedDoor') {
          const condition = (entity.fields.UnlockCondition as string) ?? '';
          if (condition === 'Stat') {
            const statType = (entity.fields.StatType as string) ?? 'atk';
            const threshold = (entity.fields.StatThreshold as number) ?? 0;
            markers.push({ roomId: id, type: 'gate', label: `${statType.toUpperCase()} ${threshold}` });
          }
        }
      }
    }

    return markers;
  }
}
