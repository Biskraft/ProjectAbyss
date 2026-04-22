/**
 * ProceduralDecorator — Rain World-inspired procedural tile decorations.
 *
 * Two layers:
 *   1. Detail layer (grass, roots, moss) — fine edge decorations
 *   2. Structure layer (steel beams, concrete chunks, rebar, pipes) — large structural debris
 *
 * All colors are grayscale so PaletteSwapFilter can remap them per-biome.
 */

import { Container, Graphics } from 'pixi.js';
import { PRNG } from '@utils/PRNG';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EdgeType = 'floor' | 'ceiling' | 'wall_left' | 'wall_right';

interface EdgeTile {
  col: number;
  row: number;
  type: EdgeType;
}

interface DecoConfig {
  tileSize: number;
  maxDecorations: number;
  density: number;
  maxStructures: number;
  structureDensity: number;
}

const DEFAULTS: DecoConfig = {
  tileSize: 16,
  maxDecorations: 400,
  density: 0.6,
  maxStructures: 60,
  structureDensity: 0.15,
};

// Scale multiplier for all detail decorations
const SCALE = 1;

// Grayscale colors — PaletteSwapFilter remaps these to biome palette
const COLOR_GROWER = 0x808080;
const COLOR_HANGER = 0x606060;
const COLOR_CLINGER = 0x909090;

// Scale multiplier for structure decorations
const STRUCT_SCALE = 2;

// Structure colors (darker/lighter for depth contrast)
const COLOR_STEEL = 0x5a5a5a;
const COLOR_CONCRETE = 0x707070;
const COLOR_REBAR = 0x4a4a4a;
const COLOR_PIPE = 0x656565;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Simple string → number hash for deterministic per-level seeds. */
export function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

function isSolid(val: number): boolean {
  return val !== 0 && val !== 2;
}

function isEmpty(val: number): boolean {
  return val === 0 || val === 2;
}

function gridAt(grid: number[][], row: number, col: number): number {
  if (row < 0 || row >= grid.length) return 1;
  const r = grid[row];
  if (!r || col < 0 || col >= r.length) return 1;
  return r[col];
}

// ---------------------------------------------------------------------------
// ProceduralDecorator
// ---------------------------------------------------------------------------

export class ProceduralDecorator {
  /** Root container — contains both detail and structure layers. */
  readonly container: Container;
  /** Fine detail decorations (grass/roots/moss). */
  readonly detailLayer: Container;
  /** Large structural decorations (steel beams/concrete/rebar). */
  readonly structureLayer: Container;

  private cfg: DecoConfig;

  constructor(config?: Partial<DecoConfig>) {
    this.cfg = { ...DEFAULTS, ...config };
    this.container = new Container();
    this.structureLayer = new Container();
    this.detailLayer = new Container();
    // Structure behind detail
    this.container.addChild(this.structureLayer);
    this.container.addChild(this.detailLayer);
  }

  /**
   * Scan the collision grid, generate both layers.
   */
  generate(
    grid: number[][],
    seed: number,
    offsetX = 0,
    offsetY = 0,
  ): Container {
    this.clear();
    this.container.position.set(offsetX, offsetY);

    const rng = new PRNG(seed);
    const edges = this.scanEdges(grid);

    // --- Detail layer ---
    const detailEdges = [...edges];
    rng.shuffle(detailEdges);
    const detailBudget = Math.min(this.cfg.maxDecorations, detailEdges.length);

    const growerGfx = new Graphics();
    const hangerGfx = new Graphics();
    const clingerGfx = new Graphics();

    let count = 0;
    for (let i = 0; i < detailEdges.length && count < detailBudget; i++) {
      if (rng.next() > this.cfg.density) continue;
      const edge = detailEdges[i];
      switch (edge.type) {
        case 'floor':
          this.drawGrower(growerGfx, edge, rng);
          break;
        case 'ceiling':
          this.drawHanger(hangerGfx, edge, rng);
          break;
        case 'wall_left':
        case 'wall_right':
          this.drawClinger(clingerGfx, edge, rng);
          break;
      }
      count++;
    }
    this.detailLayer.addChild(growerGfx, hangerGfx, clingerGfx);

    // --- Structure layer ---
    const structRng = new PRNG(seed + 31337);
    const structEdges = [...edges];
    structRng.shuffle(structEdges);
    const structBudget = Math.min(this.cfg.maxStructures, structEdges.length);

    const structGfx = new Graphics();
    let sCount = 0;
    for (let i = 0; i < structEdges.length && sCount < structBudget; i++) {
      if (structRng.next() > this.cfg.structureDensity) continue;
      const edge = structEdges[i];
      this.drawStructure(structGfx, edge, structRng, grid);
      sCount++;
    }
    this.structureLayer.addChild(structGfx);

    return this.container;
  }

  clear(): void {
    this.detailLayer.removeChildren();
    this.structureLayer.removeChildren();
  }

  // -------------------------------------------------------------------------
  // Edge scanning
  // -------------------------------------------------------------------------

  private scanEdges(grid: number[][]): EdgeTile[] {
    const edges: EdgeTile[] = [];
    const rows = grid.length;

    for (let row = 0; row < rows; row++) {
      const cols = grid[row].length;
      for (let col = 0; col < cols; col++) {
        const val = grid[row][col];
        if (!isSolid(val)) continue;

        const isPlatform = val === 3;

        if (isEmpty(gridAt(grid, row - 1, col))) {
          edges.push({ col, row, type: 'floor' });
        }
        if (isPlatform) continue;

        if (isEmpty(gridAt(grid, row + 1, col))) {
          edges.push({ col, row, type: 'ceiling' });
        }
        if (isEmpty(gridAt(grid, row, col - 1))) {
          edges.push({ col, row, type: 'wall_left' });
        }
        if (isEmpty(gridAt(grid, row, col + 1))) {
          edges.push({ col, row, type: 'wall_right' });
        }
      }
    }
    return edges;
  }

  // -------------------------------------------------------------------------
  // Detail decoration drawing (2x scaled)
  // -------------------------------------------------------------------------

  private drawGrower(gfx: Graphics, edge: EdgeTile, rng: PRNG): void {
    const T = this.cfg.tileSize;
    const S = SCALE;
    const baseX = edge.col * T;
    const baseY = edge.row * T;

    const bladeCount = rng.nextInt(2, 4);
    for (let b = 0; b < bladeCount; b++) {
      const ox = rng.nextFloat(1, T - 1);
      const height = rng.nextFloat(4, 10) * S;
      const halfW = rng.nextFloat(0.5, 1.5) * S;
      const lean = rng.nextFloat(-1.5, 1.5) * S;

      gfx.poly([
        baseX + ox - halfW, baseY,
        baseX + ox + halfW, baseY,
        baseX + ox + lean, baseY - height,
      ]);
      gfx.fill(COLOR_GROWER);
    }

    if (rng.next() < 0.10) {
      const ox = rng.nextFloat(3, T - 3);
      const stemH = rng.nextFloat(6, 12) * S;
      gfx.moveTo(baseX + ox, baseY);
      gfx.lineTo(baseX + ox, baseY - stemH);
      gfx.stroke({ width: 1 * S, color: COLOR_GROWER });
      gfx.circle(baseX + ox, baseY - stemH, 1.5 * S);
      gfx.fill(COLOR_GROWER);
    }
  }

  private drawHanger(gfx: Graphics, edge: EdgeTile, rng: PRNG): void {
    const T = this.cfg.tileSize;
    const S = SCALE;
    const baseX = edge.col * T;
    const baseY = (edge.row + 1) * T;

    const rootCount = rng.nextInt(1, 3);
    for (let r = 0; r < rootCount; r++) {
      const ox = rng.nextFloat(2, T - 2);
      const length = rng.nextFloat(3, 8) * S;
      const drift = rng.nextFloat(-2, 2) * S;

      gfx.moveTo(baseX + ox, baseY);
      gfx.lineTo(baseX + ox + drift * 0.5, baseY + length * 0.5);
      gfx.lineTo(baseX + ox + drift, baseY + length);
      gfx.stroke({ width: 1 * S, color: COLOR_HANGER });
    }

    if (rng.next() < 0.05) {
      const ox = rng.nextFloat(3, T - 3);
      const dropLen = rng.nextFloat(4, 7) * S;
      gfx.circle(baseX + ox, baseY + dropLen, 1.2 * S);
      gfx.fill(COLOR_HANGER);
    }
  }

  private drawClinger(gfx: Graphics, edge: EdgeTile, rng: PRNG): void {
    const T = this.cfg.tileSize;
    const S = SCALE;
    const baseX = edge.col * T;
    const baseY = edge.row * T;

    const isLeft = edge.type === 'wall_left';
    const wallX = isLeft ? baseX : baseX + T;
    const dir = isLeft ? -1 : 1;

    const patchCount = rng.nextInt(2, 5);
    for (let p = 0; p < patchCount; p++) {
      const oy = rng.nextFloat(1, T - 1);
      const r = rng.nextFloat(1, 3) * S;
      const offsetH = rng.nextFloat(0, 3) * S * dir;

      gfx.circle(wallX + offsetH, baseY + oy, r);
      gfx.fill(COLOR_CLINGER);
    }

    if (rng.next() < 0.08) {
      const oy = rng.nextFloat(3, T - 3);
      const vineLen = rng.nextFloat(3, 6) * S * dir;

      gfx.moveTo(wallX, baseY + oy);
      gfx.lineTo(wallX + vineLen, baseY + oy + rng.nextFloat(-2, 2) * S);
      gfx.stroke({ width: 1 * S, color: COLOR_CLINGER });

      const leafX = wallX + vineLen;
      const leafY = baseY + oy + rng.nextFloat(-2, 2) * S;
      gfx.poly([
        leafX, leafY - 1 * S,
        leafX + 2 * S * dir, leafY,
        leafX, leafY + 1 * S,
      ]);
      gfx.fill(COLOR_CLINGER);
    }
  }

  // -------------------------------------------------------------------------
  // Structure drawing — large industrial debris
  // -------------------------------------------------------------------------

  private drawStructure(gfx: Graphics, edge: EdgeTile, rng: PRNG, grid: number[][]): void {
    const type = rng.nextInt(0, 4);
    switch (type) {
      case 0: this.drawSteelBeam(gfx, edge, rng); break;
      case 1: this.drawConcreteChunk(gfx, edge, rng); break;
      case 2: this.drawRebar(gfx, edge, rng); break;
      case 3: this.drawPipeSegment(gfx, edge, rng); break;
      case 4: this.drawGirderOutline(gfx, edge, rng, grid); break;
    }
  }

  /** Steel I-beam jutting from edge — spans 2-4 tiles. */
  private drawSteelBeam(gfx: Graphics, edge: EdgeTile, rng: PRNG): void {
    const T = this.cfg.tileSize;
    const SS = STRUCT_SCALE;
    const baseX = edge.col * T;
    const baseY = edge.row * T;
    const beamLen = rng.nextFloat(2, 4) * T * SS;
    const beamH = rng.nextFloat(3, 6) * SS;
    const flangeH = rng.nextFloat(6, 10) * SS;
    const webW = 2 * SS;

    if (edge.type === 'floor') {
      // Beam sticks up from floor, leaning
      const lean = rng.nextFloat(-0.3, 0.3);
      const ox = rng.nextFloat(0, T);
      const x0 = baseX + ox;
      const y0 = baseY;
      // I-beam cross section drawn vertically
      // Bottom flange
      gfx.rect(x0 - flangeH / 2, y0 - beamH, flangeH, beamH);
      gfx.fill(COLOR_STEEL);
      // Web going up
      const endX = x0 + beamLen * lean;
      const endY = y0 - beamLen;
      gfx.moveTo(x0 - webW / 2, y0);
      gfx.lineTo(endX - webW / 2, endY);
      gfx.lineTo(endX + webW / 2, endY);
      gfx.lineTo(x0 + webW / 2, y0);
      gfx.fill(COLOR_STEEL);
      // Top flange
      gfx.rect(endX - flangeH / 2, endY - beamH / 2, flangeH, beamH / 2);
      gfx.fill(COLOR_STEEL);
    } else if (edge.type === 'ceiling') {
      const ox = rng.nextFloat(0, T);
      const x0 = baseX + ox;
      const y0 = (edge.row + 1) * T;
      const endY = y0 + beamLen * 0.6;
      // Hanging beam segment
      gfx.rect(x0 - flangeH / 2, y0, flangeH, beamH / 2);
      gfx.fill(COLOR_STEEL);
      gfx.moveTo(x0 - webW / 2, y0);
      gfx.lineTo(x0 - webW / 2, endY);
      gfx.lineTo(x0 + webW / 2, endY);
      gfx.lineTo(x0 + webW / 2, y0);
      gfx.fill(COLOR_STEEL);
      // Bottom flange
      gfx.rect(x0 - flangeH / 2, endY, flangeH, beamH / 2);
      gfx.fill(COLOR_STEEL);
    } else {
      // Wall beam — horizontal
      const isLeft = edge.type === 'wall_left';
      const dir = isLeft ? -1 : 1;
      const wallX = isLeft ? baseX : baseX + T;
      const oy = rng.nextFloat(2, T - 2);
      const y0 = baseY + oy;
      const endX = wallX + beamLen * 0.5 * dir;
      // Horizontal I-beam
      gfx.rect(wallX, y0 - flangeH / 2, beamH / 2 * dir, flangeH);
      gfx.fill(COLOR_STEEL);
      gfx.moveTo(wallX, y0 - webW / 2);
      gfx.lineTo(endX, y0 - webW / 2);
      gfx.lineTo(endX, y0 + webW / 2);
      gfx.lineTo(wallX, y0 + webW / 2);
      gfx.fill(COLOR_STEEL);
      gfx.rect(endX - beamH / 2 * dir, y0 - flangeH / 2, beamH / 2 * dir, flangeH);
      gfx.fill(COLOR_STEEL);
    }
  }

  /** Concrete chunk — irregular polygon resting on floor or clinging to wall. */
  private drawConcreteChunk(gfx: Graphics, edge: EdgeTile, rng: PRNG): void {
    const T = this.cfg.tileSize;
    const SS = STRUCT_SCALE;
    const baseX = edge.col * T;
    const baseY = edge.row * T;

    const w = rng.nextFloat(8, 24) * SS;
    const h = rng.nextFloat(6, 16) * SS;

    if (edge.type === 'floor') {
      const ox = rng.nextFloat(0, T - 4);
      const x0 = baseX + ox;
      const y0 = baseY;
      // Jagged polygon
      const points = [
        x0, y0,
        x0 + w * 0.2, y0 - h * 0.6 + rng.nextFloat(-2, 2),
        x0 + w * 0.5, y0 - h + rng.nextFloat(-2, 0),
        x0 + w * 0.8, y0 - h * 0.7 + rng.nextFloat(-1, 2),
        x0 + w, y0 - rng.nextFloat(0, h * 0.2),
        x0 + w, y0,
      ];
      gfx.poly(points);
      gfx.fill(COLOR_CONCRETE);
      // Crack line
      gfx.moveTo(x0 + w * 0.3, y0);
      gfx.lineTo(x0 + w * 0.5 + rng.nextFloat(-2, 2), y0 - h * 0.5);
      gfx.stroke({ width: 1, color: COLOR_REBAR });
    } else if (edge.type === 'ceiling') {
      const ox = rng.nextFloat(0, T - 4);
      const x0 = baseX + ox;
      const y0 = (edge.row + 1) * T;
      const points = [
        x0, y0,
        x0 + w * 0.3, y0 + h * 0.8 + rng.nextFloat(-2, 2),
        x0 + w * 0.6, y0 + h + rng.nextFloat(-2, 0),
        x0 + w, y0 + h * 0.3,
        x0 + w, y0,
      ];
      gfx.poly(points);
      gfx.fill(COLOR_CONCRETE);
    } else {
      const isLeft = edge.type === 'wall_left';
      const dir = isLeft ? -1 : 1;
      const wallX = isLeft ? baseX : baseX + T;
      const oy = rng.nextFloat(0, T - 4);
      const y0 = baseY + oy;
      const points = [
        wallX, y0,
        wallX + w * 0.6 * dir, y0 + rng.nextFloat(-2, 2),
        wallX + w * dir, y0 + h * 0.4 + rng.nextFloat(-2, 2),
        wallX + w * 0.7 * dir, y0 + h,
        wallX, y0 + h,
      ];
      gfx.poly(points);
      gfx.fill(COLOR_CONCRETE);
    }
  }

  /** Rebar — exposed reinforcing bars sticking out from edges. */
  private drawRebar(gfx: Graphics, edge: EdgeTile, rng: PRNG): void {
    const T = this.cfg.tileSize;
    const SS = STRUCT_SCALE;
    const baseX = edge.col * T;
    const baseY = edge.row * T;
    const barCount = rng.nextInt(2, 5);
    const strokeW = rng.nextFloat(1.5, 2.5) * SS;

    for (let i = 0; i < barCount; i++) {
      if (edge.type === 'floor') {
        const ox = rng.nextFloat(1, T - 1);
        const barH = rng.nextFloat(10, 30) * SS;
        const bend = rng.nextFloat(-6, 6) * SS;
        gfx.moveTo(baseX + ox, baseY);
        gfx.lineTo(baseX + ox + bend * 0.3, baseY - barH * 0.6);
        gfx.lineTo(baseX + ox + bend, baseY - barH);
        gfx.stroke({ width: strokeW, color: COLOR_REBAR });
      } else if (edge.type === 'ceiling') {
        const ox = rng.nextFloat(1, T - 1);
        const barH = rng.nextFloat(10, 25) * SS;
        const bend = rng.nextFloat(-5, 5) * SS;
        const y0 = (edge.row + 1) * T;
        gfx.moveTo(baseX + ox, y0);
        gfx.lineTo(baseX + ox + bend * 0.3, y0 + barH * 0.6);
        gfx.lineTo(baseX + ox + bend, y0 + barH);
        gfx.stroke({ width: strokeW, color: COLOR_REBAR });
      } else {
        const isLeft = edge.type === 'wall_left';
        const dir = isLeft ? -1 : 1;
        const wallX = isLeft ? baseX : baseX + T;
        const oy = rng.nextFloat(1, T - 1);
        const barLen = rng.nextFloat(8, 22) * SS;
        const bend = rng.nextFloat(-4, 4) * SS;
        gfx.moveTo(wallX, baseY + oy);
        gfx.lineTo(wallX + barLen * 0.6 * dir, baseY + oy + bend * 0.3);
        gfx.lineTo(wallX + barLen * dir, baseY + oy + bend);
        gfx.stroke({ width: strokeW, color: COLOR_REBAR });
      }
    }
  }

  /** Pipe segment — cylindrical pipe crossing along edge. */
  private drawPipeSegment(gfx: Graphics, edge: EdgeTile, rng: PRNG): void {
    const T = this.cfg.tileSize;
    const SS = STRUCT_SCALE;
    const baseX = edge.col * T;
    const baseY = edge.row * T;
    const pipeR = rng.nextFloat(2, 5) * SS;
    const pipeLen = rng.nextFloat(1.5, 3.5) * T * SS;

    if (edge.type === 'floor' || edge.type === 'ceiling') {
      // Horizontal pipe — offset away from surface
      const gap = rng.nextFloat(6, 16) * SS;
      const y0 = edge.type === 'floor' ? baseY - pipeR - gap : (edge.row + 1) * T + pipeR + gap;
      const x0 = baseX + rng.nextFloat(-T * 0.5, 0);
      // Pipe body (rounded rect)
      gfx.roundRect(x0, y0 - pipeR, pipeLen, pipeR * 2, pipeR);
      gfx.fill(COLOR_PIPE);
      // Pipe outline
      gfx.roundRect(x0, y0 - pipeR, pipeLen, pipeR * 2, pipeR);
      gfx.stroke({ width: 1, color: COLOR_STEEL });
      // Joint ring
      const jointX = x0 + pipeLen * rng.nextFloat(0.3, 0.7);
      gfx.rect(jointX - 1, y0 - pipeR - 1, 3, pipeR * 2 + 2);
      gfx.fill(COLOR_STEEL);
    } else {
      // Vertical pipe — offset away from wall
      const isLeft = edge.type === 'wall_left';
      const gap = rng.nextFloat(6, 16) * SS;
      const wallX = isLeft ? baseX - pipeR - gap : baseX + T + pipeR + gap;
      const y0 = baseY + rng.nextFloat(-T * 0.5, 0);
      gfx.roundRect(wallX - pipeR, y0, pipeR * 2, pipeLen, pipeR);
      gfx.fill(COLOR_PIPE);
      gfx.roundRect(wallX - pipeR, y0, pipeR * 2, pipeLen, pipeR);
      gfx.stroke({ width: 1, color: COLOR_STEEL });
      const jointY = y0 + pipeLen * rng.nextFloat(0.3, 0.7);
      gfx.rect(wallX - pipeR - 1, jointY - 1, pipeR * 2 + 2, 3);
      gfx.fill(COLOR_STEEL);
    }
  }

  /** Girder outline — large L/T/I shaped structural outline spanning multiple tiles. */
  private drawGirderOutline(gfx: Graphics, edge: EdgeTile, rng: PRNG, grid: number[][]): void {
    const T = this.cfg.tileSize;
    const SS = STRUCT_SCALE;
    const baseX = edge.col * T;
    const baseY = edge.row * T;
    const strokeW = rng.nextFloat(1.5, 3) * SS;

    // Count consecutive edges in the same direction for span
    let span = 1;
    if (edge.type === 'floor' || edge.type === 'ceiling') {
      for (let c = edge.col + 1; c < edge.col + 6; c++) {
        const above = edge.type === 'floor' ? gridAt(grid, edge.row - 1, c) : gridAt(grid, edge.row + 1, c);
        if (isSolid(gridAt(grid, edge.row, c)) && isEmpty(above)) span++;
        else break;
      }
    } else {
      for (let r = edge.row + 1; r < edge.row + 5; r++) {
        const side = edge.type === 'wall_left' ? gridAt(grid, r, edge.col - 1) : gridAt(grid, r, edge.col + 1);
        if (isSolid(gridAt(grid, r, edge.col)) && isEmpty(side)) span++;
        else break;
      }
    }
    if (span < 2) return; // Not enough space for girder

    const totalLen = span * T;
    const depth = rng.nextFloat(4, 10) * SS;

    if (edge.type === 'floor') {
      // L-shaped bracket above floor
      const x0 = baseX;
      const y0 = baseY;
      gfx.moveTo(x0, y0);
      gfx.lineTo(x0, y0 - depth);
      gfx.lineTo(x0 + totalLen, y0 - depth);
      gfx.lineTo(x0 + totalLen, y0);
      gfx.stroke({ width: strokeW, color: COLOR_STEEL });
      // Cross braces
      const braceCount = Math.floor(span / 2);
      for (let b = 0; b < braceCount; b++) {
        const bx = x0 + (b + 1) * T * 2 - T;
        gfx.moveTo(bx, y0);
        gfx.lineTo(bx + T * 0.5, y0 - depth);
        gfx.stroke({ width: 1, color: COLOR_STEEL });
      }
    } else if (edge.type === 'ceiling') {
      const x0 = baseX;
      const y0 = (edge.row + 1) * T;
      gfx.moveTo(x0, y0);
      gfx.lineTo(x0, y0 + depth);
      gfx.lineTo(x0 + totalLen, y0 + depth);
      gfx.lineTo(x0 + totalLen, y0);
      gfx.stroke({ width: strokeW, color: COLOR_STEEL });
    } else {
      const isLeft = edge.type === 'wall_left';
      const dir = isLeft ? -1 : 1;
      const wallX = isLeft ? baseX : baseX + T;
      const y0 = baseY;
      gfx.moveTo(wallX, y0);
      gfx.lineTo(wallX + depth * dir, y0);
      gfx.lineTo(wallX + depth * dir, y0 + totalLen);
      gfx.lineTo(wallX, y0 + totalLen);
      gfx.stroke({ width: strokeW, color: COLOR_STEEL });
      // Cross braces
      const braceCount = Math.floor(span / 2);
      for (let b = 0; b < braceCount; b++) {
        const by = y0 + (b + 1) * T * 2 - T;
        gfx.moveTo(wallX, by);
        gfx.lineTo(wallX + depth * dir, by + T * 0.5);
        gfx.stroke({ width: 1, color: COLOR_STEEL });
      }
    }
  }
}
