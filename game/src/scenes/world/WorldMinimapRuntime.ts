import { Container, Graphics } from 'pixi.js';
import type { Game } from '../../Game';
import { isOneWay, isSolid, TILE_SIZE, TILE_SPIKE, TILE_WATER } from '@core/Physics';
import type { LdtkLevel, LdtkLoader } from '@level/LdtkLoader';
import type { GiantBuilder } from '@entities/GiantBuilder';
import {
  destroyDisplayObject,
  detachDisplayObject,
} from '@scenes/shared/DisplayObjectLifecycleHelpers';

interface WorldMinimapRoom {
  id: string;
  roomType?: string | null;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface WorldMinimapPlayer {
  x: number;
  y: number;
}

interface WorldMinimapEnemy {
  hp: number;
  shouldRemove: boolean;
}

interface WorldMinimapRuntimeDeps {
  game: Game;
  loader: LdtkLoader;
  getCurrentLevel: () => LdtkLevel | null;
  getPlayer: () => WorldMinimapPlayer;
  getVisitedLevels: () => Set<string>;
  getClearedLevels: () => Set<string>;
  getEnemies: () => WorldMinimapEnemy[];
  getActiveBuilder: () => GiantBuilder | null;
  isIntroHidden: () => boolean;
}

const TIER_COLORS: Record<string, number> = {
  Tier1: 0x4A8A4A,
  Tier2: 0x5A7A8C,
  Tier3: 0x4A3A2A,
  Tier4: 0x2A4A6C,
  Tier5: 0x6A4A8C,
  Tier6: 0x4AACCC,
  Tier7: 0x8C2A2A,
};

const DEFAULT_TIER_COLOR = 0x5A7A8C;

function getTierColor(id: string): number {
  for (const key of Object.keys(TIER_COLORS)) {
    if (id.startsWith(key)) return TIER_COLORS[key];
  }
  return DEFAULT_TIER_COLOR;
}

export class WorldMinimapRuntime {
  private minimap: Container | null = null;
  private minimapDot: Graphics | null = null;
  private blinkTimer = 0;
  private viewportLeft = 0;
  private viewportTop = 0;
  private scaleX = 1;
  private scaleY = 1;
  private panelWidth = 0;
  private panelHeight = 0;
  private builderLayer: Graphics | null = null;

  constructor(private readonly deps: WorldMinimapRuntimeDeps) {}

  get container(): Container | null {
    return this.minimap;
  }

  get isVisible(): boolean {
    return !!this.minimap?.visible;
  }

  setVisible(visible: boolean): void {
    if (this.minimap) this.minimap.visible = visible;
  }

  attachIfPresent(): void {
    if (this.minimap && !this.minimap.parent) {
      this.deps.game.uiContainer.addChild(this.minimap);
    }
  }

  detach(): void {
    if (!this.minimap) return;
    detachDisplayObject(this.minimap);
    this.minimap.visible = false;
  }

  destroy(): void {
    if (!this.minimap) return;
    destroyDisplayObject(this.minimap, { children: true });
    this.minimap = null;
    this.minimapDot = null;
    this.builderLayer = null;
  }

  draw(): void {
    this.destroy();

    const currentLevel = this.deps.getCurrentLevel();
    if (!currentLevel) return;

    const worldMap = this.deps.loader.getWorldMap()
      .filter((room: WorldMinimapRoom) => room.roomType !== 'Debug' && room.roomType !== 'Cinematic' && !room.id.startsWith('Debug_'));
    if (worldMap.length === 0) return;

    this.minimap = new Container();
    this.minimap.visible = false;
    this.minimapDot = null;
    this.builderLayer = null;

    const uiScale = this.deps.game.uiScale;
    const panelWidth = 112 * uiScale;
    const panelHeight = 60 * uiScale;
    const viewportWidth = 3840;
    const viewportHeight = viewportWidth * (panelHeight / panelWidth);

    const currentCenterX = currentLevel.worldX + currentLevel.pxWid / 2;
    const currentCenterY = currentLevel.worldY + currentLevel.pxHei / 2;
    const viewportLeft = currentCenterX - viewportWidth / 2;
    const viewportTop = currentCenterY - viewportHeight / 2;
    const scaleX = panelWidth / viewportWidth;
    const scaleY = panelHeight / viewportHeight;

    this.viewportLeft = viewportLeft;
    this.viewportTop = viewportTop;
    this.scaleX = scaleX;
    this.scaleY = scaleY;
    this.panelWidth = panelWidth;
    this.panelHeight = panelHeight;

    const visitedIds = this.deps.getVisitedLevels();
    const clearedIds = this.deps.getClearedLevels();
    const adjacentIds = this.collectAdjacentIds(visitedIds);

    const content = new Container();
    const clipMask = new Graphics();
    clipMask.rect(0, 0, panelWidth, panelHeight).fill(0xffffff);
    this.minimap.addChild(clipMask);
    content.mask = clipMask;

    const project = (room: { x: number; y: number; w: number; h: number }) => {
      const rx = (room.x - viewportLeft) * scaleX;
      const ry = (room.y - viewportTop) * scaleY;
      const rw = Math.max(1, room.w * scaleX);
      const rh = Math.max(1, room.h * scaleY);
      const visible = rx + rw > 0 && rx < panelWidth && ry + rh > 0 && ry < panelHeight;
      return { rx, ry, rw, rh, visible };
    };

    for (const room of worldMap) {
      if (room.x + room.w < viewportLeft || room.x > viewportLeft + viewportWidth) continue;
      if (room.y + room.h < viewportTop || room.y > viewportTop + viewportHeight) continue;

      const isCurrent = room.id === currentLevel.identifier;
      const visited = visitedIds.has(room.id);
      const adjacent = adjacentIds.has(room.id);
      if (!isCurrent && !visited && !adjacent) continue;

      const projected = project(room);
      if (!projected.visible) continue;

      const roomGraphics = new Graphics();
      if (isCurrent || visited) {
        this.drawVisitedRoom(roomGraphics, room, projected, isCurrent, visited, uiScale);
      } else {
        roomGraphics.rect(projected.rx, projected.ry, projected.rw, projected.rh)
          .fill({ color: 0x333344, alpha: 0.4 });
      }

      if (isCurrent) {
        roomGraphics.rect(projected.rx, projected.ry, projected.rw, projected.rh)
          .stroke({ color: 0xffffff, width: 2 * uiScale });
      }
      content.addChild(roomGraphics);
    }

    this.builderLayer = new Graphics();
    content.addChild(this.builderLayer);
    this.updateBuilderLayer();

    this.drawMarkers(content, worldMap, visitedIds, clearedIds, viewportLeft, viewportTop, viewportWidth, viewportHeight, scaleX, scaleY, panelWidth, panelHeight, uiScale);
    this.drawPlayerDot(content, currentLevel, viewportLeft, viewportTop, scaleX, scaleY, panelWidth, panelHeight, uiScale);

    this.minimap.addChild(content);
    this.minimap.scale.set(1);
    this.minimap.x = (515 + 6) * uiScale;
    this.minimap.y = (6 + 5 - 3) * uiScale;
    this.minimap.alpha = this.deps.getEnemies().some((enemy) => enemy.hp > 0 && !enemy.shouldRemove) ? 0.4 : 0.7;
    if (this.deps.isIntroHidden()) this.minimap.visible = false;

    this.deps.game.uiContainer.addChild(this.minimap);
  }

  update(dt: number): void {
    const currentLevel = this.deps.getCurrentLevel();
    if (!this.minimap || !this.minimap.visible || !currentLevel) return;

    this.blinkTimer = (this.blinkTimer + dt) % 800;
    this.updateBuilderLayer();

    if (this.minimapDot) {
      const uiScale = this.deps.game.uiScale;
      const dotSize = 3 * uiScale;
      const player = this.deps.getPlayer();
      const px = Math.min(
        this.panelWidth - dotSize,
        Math.max(dotSize, (player.x + currentLevel.worldX - this.viewportLeft) * this.scaleX),
      );
      const py = Math.min(
        this.panelHeight - dotSize,
        Math.max(dotSize, (player.y + currentLevel.worldY - this.viewportTop) * this.scaleY),
      );
      this.minimapDot.alpha = this.blinkTimer < 400 ? 1.0 : 0.3;
      this.minimapDot.x = px - dotSize / 2;
      this.minimapDot.y = py - dotSize / 2;
    }

    this.minimap.alpha = this.deps.getEnemies().some((enemy) => enemy.hp > 0 && !enemy.shouldRemove) ? 0.4 : 0.7;
  }

  updateBuilderLayer(): void {
    const graphics = this.builderLayer;
    if (!graphics) return;
    graphics.clear();

    const builder = this.deps.getActiveBuilder();
    const currentLevel = this.deps.getCurrentLevel();
    if (!builder || !currentLevel || this.panelWidth <= 0 || this.panelHeight <= 0) return;

    const originWorldX = currentLevel.worldX + builder.container.x;
    const originWorldY = currentLevel.worldY + builder.container.y;
    const viewRight = this.viewportLeft + this.panelWidth / this.scaleX;
    const viewBottom = this.viewportTop + this.panelHeight / this.scaleY;
    const builderRight = originWorldX + builder.widthPx;
    const builderBottom = originWorldY + builder.heightPx;
    if (
      builderRight < this.viewportLeft ||
      originWorldX > viewRight ||
      builderBottom < this.viewportTop ||
      originWorldY > viewBottom
    ) {
      return;
    }

    const tileW = Math.max(0.5, TILE_SIZE * this.scaleX);
    const tileH = Math.max(0.5, TILE_SIZE * this.scaleY);
    const col0 = Math.max(0, Math.floor((this.viewportLeft - originWorldX) / TILE_SIZE));
    const col1 = Math.min(builder.widthTiles - 1, Math.ceil((viewRight - originWorldX) / TILE_SIZE));
    const row0 = Math.max(0, Math.floor((this.viewportTop - originWorldY) / TILE_SIZE));
    const row1 = Math.min(builder.heightTiles - 1, Math.ceil((viewBottom - originWorldY) / TILE_SIZE));
    const baseX = (originWorldX - this.viewportLeft) * this.scaleX;
    const baseY = (originWorldY - this.viewportTop) * this.scaleY;

    for (let ty = row0; ty <= row1; ty++) {
      const row = builder.collisionGrid[ty];
      if (!row) continue;
      for (let tx = col0; tx <= col1; tx++) {
        const value = row[tx] ?? 0;
        if (value === 0) continue;
        const px = baseX + tx * tileW;
        const py = baseY + ty * tileH;
        let tileColor = 0x7f96aa;
        let tileAlpha = 0.9;
        if (value === TILE_WATER) {
          tileColor = 0x2f66cc;
          tileAlpha = 0.55;
        } else if (isOneWay(value)) {
          tileColor = 0x9bb0bd;
          tileAlpha = 0.65;
        } else if (value === TILE_SPIKE) {
          tileColor = 0xcc3333;
        } else if (!isSolid(value)) {
          tileAlpha = 0.5;
        }
        graphics.rect(px, py, tileW, tileH).fill({ color: tileColor, alpha: tileAlpha });
      }
    }
  }

  private collectAdjacentIds(visitedIds: Set<string>): Set<string> {
    const adjacentIds = new Set<string>();
    for (const id of visitedIds) {
      const level = this.deps.loader.getLevel(id);
      if (!level) continue;
      for (const neighborId of level.neighbors) {
        if (visitedIds.has(neighborId)) continue;
        const neighbor = this.deps.loader.getLevel(neighborId);
        if (neighbor?.secret) continue;
        adjacentIds.add(neighborId);
      }
    }
    return adjacentIds;
  }

  private drawVisitedRoom(
    graphics: Graphics,
    room: WorldMinimapRoom,
    projected: { rx: number; ry: number; rw: number; rh: number },
    isCurrent: boolean,
    visited: boolean,
    uiScale: number,
  ): void {
    const tierColor = getTierColor(room.id);
    const level = this.deps.loader.getLevel(room.id);

    if (level && level.collisionGrid.length > 0) {
      const grid = level.collisionGrid;
      const gridH = grid.length;
      const gridW = grid[0]?.length ?? 0;
      const tileW = projected.rw / gridW;
      const tileH = projected.rh / gridH;

      graphics.rect(projected.rx, projected.ry, projected.rw, projected.rh)
        .fill({ color: 0x111118, alpha: isCurrent ? 0.9 : 0.7 });

      for (let ty = 0; ty < gridH; ty++) {
        for (let tx = 0; tx < gridW; tx++) {
          const value = grid[ty][tx];
          if (value === 0) continue;
          const px = projected.rx + tx * tileW;
          const py = projected.ry + ty * tileH;
          const tw = Math.max(0.5, tileW);
          const th = Math.max(0.5, tileH);
          let tileColor = tierColor;
          let tileAlpha = isCurrent ? 0.9 : 0.7;
          if (value === TILE_WATER) {
            tileColor = 0x2244aa;
            tileAlpha = 0.5;
          } else if (isOneWay(value)) {
            tileAlpha *= 0.6;
          } else if (value === TILE_SPIKE) {
            tileColor = 0xcc3333;
          } else if (!isSolid(value)) {
            tileAlpha *= 0.5;
          }
          graphics.rect(px, py, tw, th).fill({ color: tileColor, alpha: tileAlpha });
        }
      }
    } else {
      graphics.rect(projected.rx, projected.ry, projected.rw, projected.rh)
        .fill({ color: tierColor, alpha: isCurrent ? 1.0 : 0.8 });
    }

    if (visited) {
      graphics.rect(projected.rx, projected.ry, projected.rw, projected.rh)
        .stroke({ color: 0x556688, width: uiScale });
    }
  }

  private drawMarkers(
    content: Container,
    worldMap: WorldMinimapRoom[],
    visitedIds: Set<string>,
    clearedIds: Set<string>,
    viewportLeft: number,
    viewportTop: number,
    viewportWidth: number,
    viewportHeight: number,
    scaleX: number,
    scaleY: number,
    panelWidth: number,
    panelHeight: number,
    uiScale: number,
  ): void {
    for (const room of worldMap) {
      if (!visitedIds.has(room.id)) continue;
      if (room.x + room.w < viewportLeft || room.x > viewportLeft + viewportWidth) continue;
      if (room.y + room.h < viewportTop || room.y > viewportTop + viewportHeight) continue;
      const level = this.deps.loader.getLevel(room.id);
      if (!level) continue;

      const mx = Math.min(panelWidth - 2 * uiScale, Math.max(2 * uiScale, (room.x - viewportLeft) * scaleX + (room.w * scaleX) / 2));
      const my = Math.min(panelHeight - 2 * uiScale, Math.max(2 * uiScale, (room.y - viewportTop) * scaleY + (room.h * scaleY) / 2));

      if (level.entities.some((entity) => entity.type === 'GameSaver')) {
        const marker = new Graphics();
        marker.circle(mx, my, 2 * uiScale).fill(0xff4444);
        content.addChild(marker);
      }
      if (level.entities.some((entity) => entity.type === 'Anvil' || entity.type === 'ItemTunnelEntrance')) {
        const marker = new Graphics();
        marker.circle(mx + 3 * uiScale, my, 1.5 * uiScale).fill(0xffd700);
        content.addChild(marker);
      }
      if (level.entities.some((entity) => entity.type === 'Boss' || entity.type === 'BossSpawn')) {
        const marker = new Graphics();
        marker.circle(mx, my - 3 * uiScale, 2 * uiScale).fill(clearedIds.has(room.id) ? 0x666666 : 0xff8800);
        content.addChild(marker);
      }
    }
  }

  private drawPlayerDot(
    content: Container,
    currentLevel: LdtkLevel,
    viewportLeft: number,
    viewportTop: number,
    scaleX: number,
    scaleY: number,
    panelWidth: number,
    panelHeight: number,
    uiScale: number,
  ): void {
    const dotSize = 3 * uiScale;
    const dot = new Graphics();
    dot.rect(0, 0, dotSize, dotSize).fill(0xffffff);
    const player = this.deps.getPlayer();
    const px = Math.min(panelWidth - dotSize, Math.max(dotSize, (player.x + currentLevel.worldX - viewportLeft) * scaleX));
    const py = Math.min(panelHeight - dotSize, Math.max(dotSize, (player.y + currentLevel.worldY - viewportTop) * scaleY));
    dot.x = px - dotSize / 2;
    dot.y = py - dotSize / 2;
    this.minimapDot = dot;
    content.addChild(dot);
  }

}
