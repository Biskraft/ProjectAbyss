/**
 * WorldMapOverlay.ts
 *
 * Full-screen world map overlay toggled by M key.
 * SotN-style grid map with Hollow Knight-style overlay (game continues in background).
 *
 * Features:
 * - Room-based grid showing visited levels with tile-level detail
 * - Current position blinking player dot
 * - Markers for save points, anvils, bosses, ATK gates
 * - Exploration percentage
 * - Player can still move while map is open
 */

import { Container, Graphics, BitmapText, Rectangle } from 'pixi.js';
import { create9SlicePanel } from './ModalPanel';
import type { UISkin } from './UISkin';
import { PIXEL_FONT } from './fonts';
import { createUiText } from './factories';
import { t } from '@i18n';
import type { LdtkLoader } from '@level/LdtkLoader';

const GAME_WIDTH = 640;
const GAME_HEIGHT = 360;

// Map display area
const MAP_MARGIN_X = 60;
const MAP_MARGIN_Y = 30;
const MAP_W = GAME_WIDTH - MAP_MARGIN_X * 2;  // 520
const MAP_H = GAME_HEIGHT - MAP_MARGIN_Y * 2;  // 300

// Room colors
const COLOR_BG = 0x0a0a12;        // near-black background
const COLOR_BORDER = 0x445566;
const COLOR_ROOM_BG = 0x111118;   // dark interior background
const COLOR_ADJACENT = 0x445577;   // fog silhouette — bright enough to read shape
const COLOR_ADJACENT_BORDER = 0x667799;

// Tier colors (same as minimap)
const TIER_COLORS: Record<string, number> = {
  'Tier1': 0x4A8A4A, 'Tier2': 0x5A7A8C, 'Tier3': 0x4A3A2A,
  'Tier4': 0x2A4A6C, 'Tier5': 0x6A4A8C, 'Tier6': 0x4AACCC, 'Tier7': 0x8C2A2A,
};
const DEFAULT_TIER_COLOR = 0x5A7A8C;

// Marker colors
const MARKER_SAVE = 0xffee44;      // yellow — save point
const MARKER_ANVIL = 0xff8844;     // orange — anvil
const MARKER_BOSS = 0xcc44cc;      // purple — boss
const MARKER_GATE = 0xff4444;      // red — ATK gate

interface WorldMapRoom {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface MapMarker {
  roomId: string;
  type: 'save' | 'anvil' | 'boss' | 'gate';
  label?: string; // e.g. "ATK 30"
}

function getTierColor(id: string): number {
  for (const key of Object.keys(TIER_COLORS)) {
    if (id.startsWith(key)) return TIER_COLORS[key];
  }
  return DEFAULT_TIER_COLOR;
}

export class WorldMapOverlay {
  container: Container;
  visible = false;

  private bg: Graphics;
  private mapContainer: Container;
  private blinkTimer = 0;

  // Data
  private rooms: WorldMapRoom[] = [];
  /** Debug 모드 전용 풀 리스트 (Debug 룸 포함). Shift+M 워프 시 그리기/클릭 대상. */
  private debugRooms: WorldMapRoom[] = [];
  private visitedLevels: Set<string> = new Set();
  private currentLevelId = '';
  private markers: MapMarker[] = [];
  private totalRooms = 0;
  private loader: LdtkLoader | null = null;

  // Player world position (updated each frame by scene)
  private playerWorldX = 0;
  private playerWorldY = 0;

  // Cached projection for real-time dot update
  private projMinX = 0;
  private projMinY = 0;
  private projScale = 1;
  private projOffsetX = 0;
  private projOffsetY = 0;

  // Blinking elements
  private currentRoomGfx: Graphics | null = null;
  private playerDot: Graphics | null = null;

  /**
   * Debug 모드: true 면 모든 룸을 visited 처리해 전체 맵 표시 + 룸 클릭 가능.
   * Shift+M 으로 진입. onRoomClick 콜백이 클릭한 룸 id + 룸 내부 로컬 좌표 (px) 를 받음.
   */
  private debugMode = false;
  /** 디버그 모드에서 룸 클릭 시 호출. (roomId, localX, localY) — localX/Y 는 룸 내부 픽셀. */
  onRoomClick: ((roomId: string, localX: number, localY: number) => void) | null = null;

  private skin: UISkin | null = null;

  /** UI native 마이그레이션 1단계: uiContainer(scale=1) 직속 마운트용 자체 scale. */
  constructor(skin?: UISkin | null, uiScale: number = 1) {
    this.skin = skin ?? null;
    this.container = new Container();
    this.container.scale.set(uiScale);
    this.container.visible = false;
    this.container.zIndex = 900;

    // Opaque background
    this.bg = new Graphics();
    this.bg.rect(0, 0, GAME_WIDTH, GAME_HEIGHT).fill({ color: COLOR_BG, alpha: 0.7 });
    this.container.addChild(this.bg);

    // Map content container — scaled to 70% around screen center, keeps bg full-screen
    this.mapContainer = new Container();
    const MAP_SCALE = 0.7;
    this.mapContainer.scale.set(MAP_SCALE);
    this.mapContainer.x = (GAME_WIDTH * (1 - MAP_SCALE)) / 2;
    this.mapContainer.y = (GAME_HEIGHT * (1 - MAP_SCALE)) / 2;
    this.container.addChild(this.mapContainer);
  }

  /** Provide LdtkLoader reference for collision grid access */
  setLoader(loader: LdtkLoader): void {
    this.loader = loader;
  }

  /** Set world map data from LdtkLoader.getWorldMap().
   *  Caller is responsible for filtering — Debug_/Cinematic exclusion happens
   *  upstream in LdtkWorldScene so minimap and worldmap stay in sync. */
  setRooms(rooms: WorldMapRoom[]): void {
    this.rooms = rooms;
    this.totalRooms = this.rooms.length;
  }

  /** Debug(Shift+M) 모드에서 그릴 풀 리스트. Cinematic 만 제외, Debug 룸 포함. */
  setDebugRooms(rooms: WorldMapRoom[]): void {
    this.debugRooms = rooms;
  }

  /** Update visited levels and current level */
  setExplorationState(visited: Set<string>, currentId: string): void {
    this.visitedLevels = visited;
    this.currentLevelId = currentId;
  }

  /** Update player world position for dot tracking */
  setPlayerPosition(worldX: number, worldY: number): void {
    this.playerWorldX = worldX;
    this.playerWorldY = worldY;
  }

  /** Scan levels for marker entities */
  setMarkers(markers: MapMarker[]): void {
    this.markers = markers;
  }

  toggle(): void {
    if (this.visible) {
      this.close();
    } else {
      this.debugMode = false;
      this.visible = true;
      this.container.visible = true;
      this.redraw();
    }
  }

  /**
   * Debug 워프 모드로 열기 — 모든 룸 visible + 룸 클릭 → onRoomClick 콜백.
   * Shift+M 으로 진입.
   */
  openDebug(): void {
    this.debugMode = true;
    this.visible = true;
    this.container.visible = true;
    this.redraw();
  }

  close(): void {
    this.visible = false;
    this.container.visible = false;
    this.debugMode = false;
  }

  update(dt: number): void {
    if (!this.visible) return;
    this.blinkTimer += dt;

    // Blink current room border
    if (this.currentRoomGfx) {
      const pulse = 0.5 + 0.5 * Math.sin(this.blinkTimer * 0.005);
      this.currentRoomGfx.alpha = pulse;
    }

    // Update player dot position in real-time
    if (this.playerDot) {
      const px = this.projOffsetX + (this.playerWorldX - this.projMinX) * this.projScale;
      const py = this.projOffsetY + (this.playerWorldY - this.projMinY) * this.projScale;
      this.playerDot.x = px;
      this.playerDot.y = py;
      // Blink
      this.playerDot.alpha = (Math.sin(this.blinkTimer * 0.008) > 0) ? 1.0 : 0.3;
    }
  }

  redraw(): void {
    // Clear
    this.mapContainer.removeChildren();
    this.currentRoomGfx = null;
    this.playerDot = null;

    // Debug(Shift+M) 모드면 풀 리스트(Debug 룸 포함)로 그려 워프 클릭이 가능하게 한다.
    const renderList = this.debugMode && this.debugRooms.length > 0 ? this.debugRooms : this.rooms;
    if (renderList.length === 0) return;

    // Compute bounds of entire world
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const r of renderList) {
      minX = Math.min(minX, r.x);
      minY = Math.min(minY, r.y);
      maxX = Math.max(maxX, r.x + r.w);
      maxY = Math.max(maxY, r.y + r.h);
    }

    const worldW = maxX - minX;
    const worldH = maxY - minY;
    const scale = Math.min(MAP_W / worldW, MAP_H / worldH) * 0.9;

    const mapActualW = worldW * scale;
    const mapActualH = worldH * scale;
    const offsetX = MAP_MARGIN_X + (MAP_W - mapActualW) / 2;
    const offsetY = MAP_MARGIN_Y + (MAP_H - mapActualH) / 2;

    // Cache projection for real-time dot
    this.projMinX = minX;
    this.projMinY = minY;
    this.projScale = scale;
    this.projOffsetX = offsetX;
    this.projOffsetY = offsetY;

    // Border frame — 9-slice or fallback
    const frameW = MAP_W + 4, frameH = MAP_H + 4;
    const sliceFrame = this.skin?.isLoaded ? create9SlicePanel(this.skin, frameW, frameH) : null;
    if (sliceFrame) {
      sliceFrame.x = MAP_MARGIN_X - 2;
      sliceFrame.y = MAP_MARGIN_Y - 2;
      this.mapContainer.addChild(sliceFrame);
    } else {
      const frame = new Graphics();
      frame.rect(MAP_MARGIN_X - 2, MAP_MARGIN_Y - 2, frameW, frameH)
        .stroke({ color: COLOR_BORDER, width: 1 });
      this.mapContainer.addChild(frame);
    }

    // Draw rooms
    for (const r of renderList) {
      const rx = offsetX + (r.x - minX) * scale;
      const ry = offsetY + (r.y - minY) * scale;
      const rw = Math.max(3, r.w * scale);
      const rh = Math.max(3, r.h * scale);

      const isCurrent = r.id === this.currentLevelId;
      // Debug 모드는 모든 룸을 visited 로 강제 (가지 않은 룸도 풀 디테일 렌더).
      const visited = this.debugMode || this.visitedLevels.has(r.id);

      const g = new Graphics();

      if (isCurrent || visited) {
        const tierColor = getTierColor(r.id);
        const level = this.loader?.getLevel(r.id);

        if (level && level.collisionGrid.length > 0) {
          // Tile-level detail
          const grid = level.collisionGrid;
          const gridH = grid.length;
          const gridW = grid[0]?.length ?? 0;
          const tileW = rw / gridW;
          const tileH = rh / gridH;

          // Dark background (air)
          g.rect(rx, ry, rw, rh).fill({ color: COLOR_ROOM_BG, alpha: isCurrent ? 0.9 : 0.7 });

          // Solid tiles
          for (let ty = 0; ty < gridH; ty++) {
            for (let tx = 0; tx < gridW; tx++) {
              const v = grid[ty][tx];
              if (v === 0) continue; // air
              const px = rx + tx * tileW;
              const py = ry + ty * tileH;
              const tw = Math.max(0.5, tileW);
              const th = Math.max(0.5, tileH);
              let tileColor = tierColor;
              let tileAlpha = isCurrent ? 0.9 : 0.7;
              if (v === 2) { tileColor = 0x2244aa; tileAlpha = 0.5; } // water
              else if (v === 3) { tileAlpha *= 0.6; } // platform
              else if (v === 5) { tileColor = 0xcc3333; } // spike
              g.rect(px, py, tw, th).fill({ color: tileColor, alpha: tileAlpha });
            }
          }
        } else {
          // Fallback: solid fill
          g.rect(rx, ry, rw, rh).fill({ color: getTierColor(r.id), alpha: isCurrent ? 1.0 : 0.8 });
        }

        // Border for visited rooms
        g.rect(rx, ry, rw, rh).stroke({ color: COLOR_BORDER, width: 0.5 });

        // Current room: white border (separate gfx for blinking)
        if (isCurrent) {
          const border = new Graphics();
          border.rect(rx, ry, rw, rh).stroke({ color: 0xffffff, width: 1.5 });
          this.mapContainer.addChild(border);
          this.currentRoomGfx = border;
        }
      } else if (this.isAdjacentToVisited(r.id)) {
        // OUTLINED: adjacent to visited — dim silhouette, no tile detail
        g.rect(rx, ry, rw, rh).fill({ color: COLOR_ADJACENT, alpha: 0.3 });
        g.rect(rx, ry, rw, rh).stroke({ color: COLOR_ADJACENT_BORDER, width: 0.5 });
      }
      // UNDISCOVERED: not adjacent — completely hidden (no drawing)

      this.mapContainer.addChild(g);

      // Debug 모드: 룸 영역에 hit area + 클릭 핸들러 — 클릭 위치를 룸 내부 로컬 px 로 환산해 콜백.
      if (this.debugMode && this.onRoomClick) {
        g.eventMode = 'static';
        g.cursor = 'pointer';
        const room = r;
        const roomRx = rx;
        const roomRy = ry;
        const roomRw = rw;
        const roomRh = rh;
        g.hitArea = new Rectangle(rx, ry, rw, rh);
        g.on('pointerdown', (e) => {
          const local = e.getLocalPosition(this.mapContainer);
          const tx = (local.x - roomRx) / roomRw;
          const ty = (local.y - roomRy) / roomRh;
          const localPx = tx * room.w;
          const localPy = ty * room.h;
          this.onRoomClick?.(room.id, localPx, localPy);
        });
      }

      // Draw markers for visited rooms
      if (visited || isCurrent) {
        this.drawMarkers(r, rx, ry, rw, rh);
      }
    }

    // Player dot (positioned in update())
    const dot = new Graphics();
    dot.circle(0, 0, 3).fill(0xffffff);
    dot.circle(0, 0, 1.5).fill(0x44ff44);
    this.playerDot = dot;
    this.mapContainer.addChild(dot);

    // Title
    const title = createUiText(t('ui.world_map.title'), { fontSize: 24, fill: 0x88aacc });
    title.x = MAP_MARGIN_X;
    title.y = MAP_MARGIN_Y - 30;
    this.mapContainer.addChild(title);

    // Exploration percentage — larger, right-aligned
    const visitedCount = this.rooms.filter(r => this.visitedLevels.has(r.id)).length;
    const percent = this.totalRooms > 0 ? Math.floor((visitedCount / this.totalRooms) * 100) : 0;
    const pctText = new BitmapText({
      text: `${percent}%`,
      style: { fontFamily: PIXEL_FONT, fontSize: 40, fill: 0xffcc44 },
    });
    pctText.x = GAME_WIDTH - MAP_MARGIN_X - pctText.width;
    pctText.y = MAP_MARGIN_Y - 42;
    this.mapContainer.addChild(pctText);

    // Exploration label next to percentage
    const pctLabel = createUiText(t('ui.world_map.explored'), { fontSize: 16, fill: 0xaa8833 });
    pctLabel.x = pctText.x - pctLabel.width - 10;
    pctLabel.y = MAP_MARGIN_Y - 22;
    this.mapContainer.addChild(pctLabel);

    // Controls hint
    const hint = createUiText(t('ui.world_map.close_hint'), { fontSize: 16, fill: 0x666688 });
    hint.x = GAME_WIDTH - MAP_MARGIN_X - hint.width;
    hint.y = GAME_HEIGHT - MAP_MARGIN_Y + 6;
    this.mapContainer.addChild(hint);

    // Legend
    this.drawLegend();
  }

  /** Check if a room is adjacent to any visited room (Fog of War: OUTLINED state) */
  private isAdjacentToVisited(roomId: string): boolean {
    const room = this.rooms.find(r => r.id === roomId);
    if (!room) return false;
    for (const visited of this.visitedLevels) {
      const vr = this.rooms.find(r => r.id === visited);
      if (!vr) continue;
      // Check overlap/adjacency (touching or overlapping bounding boxes with margin)
      const margin = 16; // px tolerance for adjacency
      if (room.x + room.w + margin >= vr.x && room.x <= vr.x + vr.w + margin &&
          room.y + room.h + margin >= vr.y && room.y <= vr.y + vr.h + margin) {
        return true;
      }
    }
    return false;
  }

  private drawMarkers(room: WorldMapRoom, rx: number, ry: number, rw: number, rh: number): void {
    const cx = rx + rw / 2;
    const cy = ry + rh / 2;

    for (const m of this.markers) {
      if (m.roomId !== room.id) continue;

      const marker = new Graphics();
      let color: number;

      switch (m.type) {
        case 'save':
          color = MARKER_SAVE;
          marker.circle(cx, cy, 2).fill(color);
          break;
        case 'anvil':
          color = MARKER_ANVIL;
          // Diamond shape
          marker.moveTo(cx, cy - 2).lineTo(cx + 2, cy).lineTo(cx, cy + 2).lineTo(cx - 2, cy).closePath().fill(color);
          break;
        case 'boss':
          color = MARKER_BOSS;
          // X shape
          marker.moveTo(cx - 2, cy - 2).lineTo(cx + 2, cy + 2).stroke({ color, width: 1 });
          marker.moveTo(cx + 2, cy - 2).lineTo(cx - 2, cy + 2).stroke({ color, width: 1 });
          break;
        case 'gate':
          color = MARKER_GATE;
          // Small square with border
          marker.rect(cx - 2, cy - 2, 4, 4).stroke({ color, width: 1 });
          break;
      }

      this.mapContainer.addChild(marker);
    }
  }

  private drawLegend(): void {
    const lx = MAP_MARGIN_X;
    const ly = GAME_HEIGHT - MAP_MARGIN_Y + 6;
    const spacing = 88;

    const items: [number, string][] = [
      [MARKER_SAVE, t('ui.world_map.legend_save')],
      [MARKER_ANVIL, t('ui.world_map.legend_anvil')],
      [MARKER_BOSS, t('ui.world_map.legend_boss')],
      [MARKER_GATE, t('ui.world_map.legend_gate')],
    ];

    for (let i = 0; i < items.length; i++) {
      const [color, label] = items[i];
      const x = lx + i * spacing;

      const dot = new Graphics();
      dot.circle(x, ly + 8, 4).fill(color);
      this.mapContainer.addChild(dot);

      const text = createUiText(label, { fontSize: 16, fill: 0x888899 });
      text.x = x + 10;
      text.y = ly;
      this.mapContainer.addChild(text);
    }
  }

  destroy(): void {
    if (this.container.parent) this.container.parent.removeChild(this.container);
    this.container.destroy({ children: true });
  }
}
