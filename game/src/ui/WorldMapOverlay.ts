/**
 * WorldMapOverlay.ts
 *
 * Full-screen world map overlay toggled by M key.
 * SotN-style grid map with Hollow Knight-style overlay (game continues in background).
 *
 * Features:
 * - Room-based grid showing visited levels
 * - Current position blinking indicator
 * - Markers for save points, anvils, bosses, ATK gates
 * - Exploration percentage
 * - Player can still move while map is open
 */

import { Container, Graphics, BitmapText } from 'pixi.js';
import { PIXEL_FONT } from './fonts';

const GAME_WIDTH = 640;
const GAME_HEIGHT = 360;

// Map display area
const MAP_MARGIN_X = 60;
const MAP_MARGIN_Y = 30;
const MAP_W = GAME_WIDTH - MAP_MARGIN_X * 2;  // 520
const MAP_H = GAME_HEIGHT - MAP_MARGIN_Y * 2;  // 300

// Room colors
const COLOR_CURRENT = 0x44ff44;    // green — current room
const COLOR_VISITED = 0x4466aa;    // blue — visited
const COLOR_ADJACENT = 0x222233;   // dark — fog silhouette
const COLOR_BG = 0x0a0a12;        // near-black background
const COLOR_BORDER = 0x445566;
const COLOR_GRID = 0x1a1a2a;

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

export class WorldMapOverlay {
  container: Container;
  visible = false;

  private bg: Graphics;
  private mapContainer: Container;
  private blinkTimer = 0;

  // Data
  private rooms: WorldMapRoom[] = [];
  private visitedLevels: Set<string> = new Set();
  private currentLevelId = '';
  private markers: MapMarker[] = [];
  private totalRooms = 0;

  constructor() {
    this.container = new Container();
    this.container.visible = false;
    this.container.zIndex = 900; // above game, below dialogue

    // Semi-transparent background
    this.bg = new Graphics();
    this.bg.rect(0, 0, GAME_WIDTH, GAME_HEIGHT).fill({ color: COLOR_BG, alpha: 0.93 });
    this.container.addChild(this.bg);

    // Map content container
    this.mapContainer = new Container();
    this.container.addChild(this.mapContainer);
  }

  /** Set world map data from LdtkLoader.getWorldMap() */
  setRooms(rooms: WorldMapRoom[]): void {
    // Filter out item world and tunnel levels
    this.rooms = rooms.filter(r =>
      !r.id.startsWith('ItemTunnel') &&
      !r.id.startsWith('ItemWorld') &&
      !r.id.startsWith('World_Level_35') // debug level
    );
    this.totalRooms = this.rooms.length;
  }

  /** Update visited levels and current level */
  setExplorationState(visited: Set<string>, currentId: string): void {
    this.visitedLevels = visited;
    this.currentLevelId = currentId;
  }

  /** Scan levels for marker entities */
  setMarkers(markers: MapMarker[]): void {
    this.markers = markers;
  }

  toggle(): void {
    this.visible = !this.visible;
    this.container.visible = this.visible;
    if (this.visible) {
      this.redraw();
    }
  }

  close(): void {
    this.visible = false;
    this.container.visible = false;
  }

  update(dt: number): void {
    if (!this.visible) return;
    this.blinkTimer += dt;

    // Blink current room indicator
    if (this.currentRoomGfx) {
      const blink = Math.sin(this.blinkTimer * 0.005) > 0;
      this.currentRoomGfx.alpha = blink ? 1.0 : 0.4;
    }
  }

  private currentRoomGfx: Graphics | null = null;

  redraw(): void {
    // Clear
    this.mapContainer.removeChildren();
    this.currentRoomGfx = null;

    if (this.rooms.length === 0) return;

    // Show ALL rooms — full world visible for scale
    // Compute bounds of entire world
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const r of this.rooms) {
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

    // Border frame
    const frame = new Graphics();
    frame.rect(MAP_MARGIN_X - 2, MAP_MARGIN_Y - 2, MAP_W + 4, MAP_H + 4)
      .stroke({ color: COLOR_BORDER, width: 1 });
    this.mapContainer.addChild(frame);

    // Draw rooms
    for (const r of this.rooms) {
      const rx = offsetX + (r.x - minX) * scale;
      const ry = offsetY + (r.y - minY) * scale;
      const rw = Math.max(3, r.w * scale);
      const rh = Math.max(3, r.h * scale);

      const isCurrent = r.id === this.currentLevelId;
      const visited = this.visitedLevels.has(r.id);

      const g = new Graphics();

      if (isCurrent) {
        g.rect(rx, ry, rw, rh).fill({ color: COLOR_CURRENT, alpha: 0.9 });
        g.rect(rx, ry, rw, rh).stroke({ color: 0x88ffaa, width: 1 });
        this.currentRoomGfx = g;
      } else if (visited) {
        g.rect(rx, ry, rw, rh).fill({ color: COLOR_VISITED, alpha: 0.7 });
        g.rect(rx, ry, rw, rh).stroke({ color: COLOR_BORDER, width: 0.5 });
      } else {
        // Unvisited — dark silhouette to show world scale
        g.rect(rx, ry, rw, rh).fill({ color: COLOR_ADJACENT, alpha: 0.2 });
      }

      this.mapContainer.addChild(g);

      // Draw markers for visited rooms
      if (visited || isCurrent) {
        this.drawMarkers(r, rx, ry, rw, rh);
      }
    }

    // Title
    const title = new BitmapText({
      text: 'WORLD MAP',
      style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0x88aacc },
    });
    title.x = MAP_MARGIN_X;
    title.y = MAP_MARGIN_Y - 14;
    this.mapContainer.addChild(title);

    // Exploration percentage
    const visitedCount = this.rooms.filter(r => this.visitedLevels.has(r.id)).length;
    const percent = this.totalRooms > 0 ? Math.floor((visitedCount / this.totalRooms) * 100) : 0;
    const pctText = new BitmapText({
      text: `${percent}%`,
      style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0xffcc44 },
    });
    pctText.x = GAME_WIDTH - MAP_MARGIN_X - pctText.width;
    pctText.y = MAP_MARGIN_Y - 14;
    this.mapContainer.addChild(pctText);

    // Controls hint
    const hint = new BitmapText({
      text: 'M: Close',
      style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0x666688 },
    });
    hint.x = GAME_WIDTH - MAP_MARGIN_X - hint.width;
    hint.y = GAME_HEIGHT - MAP_MARGIN_Y + 4;
    this.mapContainer.addChild(hint);

    // Legend
    this.drawLegend();
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
    const ly = GAME_HEIGHT - MAP_MARGIN_Y + 4;
    const spacing = 50;

    const items: [number, string][] = [
      [MARKER_SAVE, 'Save'],
      [MARKER_ANVIL, 'Anvil'],
      [MARKER_BOSS, 'Boss'],
      [MARKER_GATE, 'Gate'],
    ];

    for (let i = 0; i < items.length; i++) {
      const [color, label] = items[i];
      const x = lx + i * spacing;

      const dot = new Graphics();
      dot.circle(x, ly + 4, 2).fill(color);
      this.mapContainer.addChild(dot);

      const text = new BitmapText({
        text: label,
        style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0x666688 },
      });
      text.x = x + 5;
      text.y = ly;
      this.mapContainer.addChild(text);
    }
  }

  destroy(): void {
    if (this.container.parent) this.container.parent.removeChild(this.container);
    this.container.destroy({ children: true });
  }
}
