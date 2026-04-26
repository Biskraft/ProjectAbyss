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
import { getDecoPreset, type DecoPreset } from '@data/decoPresets';
import {
  catenary, chainLinks, vine, crack, mossCluster,
  dripTrail, rivetLine, rustBloom,
} from './ProceduralPrimitives';

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
const SCALE = 1.5;

// Natural colors — tinted through PaletteSwapFilter at reduced strength
const COLOR_GROWER = 0x3a7a2a;       // green grass
const COLOR_GROWER_TIP = 0x5a9a3a;   // lighter green tip
const COLOR_GROWER_DARK = 0x2a5a1a;  // dark base / shadow
const COLOR_HANGER = 0x5a4030;       // dark brown roots
const COLOR_HANGER_LIGHT = 0x7a5840; // root highlight edge
const COLOR_HANGER_DRIP = 0x607888;  // blue-gray water drip
const COLOR_CLINGER = 0x4a6a3a;      // moss green
const COLOR_CLINGER_DARK = 0x304a24; // moss shadow
const COLOR_CLINGER_VINE = 0x3a5a2a; // dark vine green

// Scale multiplier for structure decorations
const STRUCT_SCALE = 2;

// Structure colors — industrial tones
const COLOR_STEEL = 0x5a6068;        // cool steel gray
const COLOR_CONCRETE = 0x787872;     // warm concrete gray
const COLOR_REBAR = 0x6a3a2a;        // rusty brown
const COLOR_PIPE = 0x7a4a30;         // rust orange-brown

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

// Decoration anchor classification (Physics IntGrid 값 기준):
//   0 = empty, 2 = water, 5 = spike, 10 = void → decoration 미배치
//   (passable + 해저드/시그널/시네마틱)
//   그 외(1 wall, 3 platform, 4 updraft, 6 magma, 7 ice, 8 charged, 9 breakable)
//   → 기존대로 solid 로 취급. spike/void 는 플레이어 시그널 또는 cinematic
//   드롭 트리거이므로 장식이 덮이지 않도록 명시적으로 제외한다.
function isSolid(val: number): boolean {
  return val !== 0 && val !== 2 && val !== 5 && val !== 10;
}

function isEmpty(val: number): boolean {
  return val === 0 || val === 2 || val === 5 || val === 10;
}

function gridAt(grid: number[][], row: number, col: number): number {
  if (row < 0 || row >= grid.length) return 1;
  const r = grid[row];
  if (!r || col < 0 || col >= r.length) return 1;
  return r[col];
}

function gridInBounds(grid: number[][], row: number, col: number): boolean {
  return row >= 0 && row < grid.length && col >= 0 && col < (grid[row]?.length ?? 0);
}

// ---------------------------------------------------------------------------
// ProceduralDecorator
// ---------------------------------------------------------------------------

// Themes whose detail-layer decorations are organic / natural
const NATURAL_THEMES = new Set([
  'T-BIOZONE', 'T-BREACH', 'T-COOLANT', 'T-ECHO',
]);
// All other themes (T-HABITAT, T-SECURITY, T-FOUNDRY, T-ARCHIVE,
// T-LOGISTICS, T-COMMAND, T-MALFUNCTION) are artificial.

export class ProceduralDecorator {
  /** Root container — contains both detail and structure layers. */
  readonly container: Container;
  /** Natural detail decorations (grass/roots/moss/spores) — palette strength 0.5. */
  readonly naturalLayer: Container;
  /** Artificial detail decorations (wiring/sensors/data) — palette strength 1.0. */
  readonly artificialLayer: Container;
  /** Large structural decorations (steel beams/concrete/rebar) — palette strength 1.0. */
  readonly structureLayer: Container;

  /** @deprecated Use naturalLayer / artificialLayer instead. Alias for naturalLayer. */
  get detailLayer(): Container { return this.naturalLayer; }

  private cfg: DecoConfig;
  private preset: DecoPreset | null = null;

  constructor(config?: Partial<DecoConfig>) {
    this.cfg = { ...DEFAULTS, ...config };
    this.container = new Container();
    this.structureLayer = new Container();
    this.naturalLayer = new Container();
    this.artificialLayer = new Container();
    this.container.addChild(this.structureLayer);
    this.container.addChild(this.naturalLayer);
    this.container.addChild(this.artificialLayer);
  }

  /** Whether the current theme's detail decorations are natural (organic). */
  private get isNaturalTheme(): boolean {
    return !this.preset || NATURAL_THEMES.has(this.preset.themeId);
  }

  /** Set theme — loads colors and densities from CSV preset. */
  setTheme(themeId: string): void {
    this.preset = getDecoPreset(themeId);
    this.cfg.density = this.preset.detailDensity;
    this.cfg.structureDensity = this.preset.structDensity;
  }

  /** Get current detail density. */
  getDensity(): number { return this.cfg.density; }

  /** Boost density by an additive amount (e.g. strata depth increase). */
  boostDensity(amount: number): void {
    this.cfg.density = Math.min(1.0, this.cfg.density + amount);
    this.cfg.structureDensity = Math.min(1.0, this.cfg.structureDensity + amount * 0.5);
  }

  // Color accessors — prefer preset, fall back to hardcoded defaults
  private get cGrowerColor(): number { return this.preset?.growerColor ?? COLOR_GROWER; }
  private get cGrowerTip(): number { return this.preset?.growerTipColor ?? COLOR_GROWER_TIP; }
  private get cHangerColor(): number { return this.preset?.hangerColor ?? COLOR_HANGER; }
  private get cHangerDrip(): number { return this.preset?.hangerDripColor ?? COLOR_HANGER_DRIP; }
  private get cClingerColor(): number { return this.preset?.clingerColor ?? COLOR_CLINGER; }
  private get cClingerVine(): number { return this.preset?.clingerVineColor ?? COLOR_CLINGER_VINE; }
  private get cSteel(): number { return this.preset?.structColor1 ?? COLOR_STEEL; }
  private get cConcrete(): number { return this.preset?.structColor2 ?? COLOR_CONCRETE; }
  private get cRebar(): number { return this.preset?.structColor1 ?? COLOR_REBAR; }
  private get cPipe(): number { return this.preset?.structColor2 ?? COLOR_PIPE; }
  private get growerHMin(): number { return this.preset?.growerHeightMin ?? 4; }
  private get growerHMax(): number { return this.preset?.growerHeightMax ?? 10; }
  private get hangerLMin(): number { return this.preset?.hangerLenMin ?? 3; }
  private get hangerLMax(): number { return this.preset?.hangerLenMax ?? 8; }

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

    const detailGfx = new Graphics();   // theme detail drawings
    const growerGfx = new Graphics();   // natural: grass/roots
    const hangerGfx = new Graphics();   // natural: hanging roots
    const clingerGfx = new Graphics();  // natural: moss/vines

    const hasTheme = !!this.preset;
    const isNatural = this.isNaturalTheme;

    // Natural details (organic themes + common no-theme) get 2× spawn rate
    // and 2× budget vs artificial themes — the natural world feels lush,
    // the industrial world feels sparse.
    const naturalMul = (isNatural || !hasTheme) ? 2 : 1;
    const detailBudget = Math.min(
      this.cfg.maxDecorations * naturalMul,
      detailEdges.length,
    );
    const effectiveDensity = Math.min(1, this.cfg.density * naturalMul);

    let count = 0;
    for (let i = 0; i < detailEdges.length && count < detailBudget; i++) {
      if (rng.next() > effectiveDensity) continue;
      const edge = detailEdges[i];
      if (hasTheme) {
        // Theme mode: only theme-specific decorations
        this.drawThemeDetail(detailGfx, edge, rng);
      } else {
        // No theme: common decorations only (always natural)
        switch (edge.type) {
          case 'floor': this.drawGrower(growerGfx, edge, rng); break;
          case 'ceiling': this.drawHanger(hangerGfx, edge, rng); break;
          case 'wall_left':
          case 'wall_right': this.drawClinger(clingerGfx, edge, rng); break;
        }
      }
      count++;
    }
    // Common (no-theme) details are always natural
    this.naturalLayer.addChild(growerGfx, hangerGfx, clingerGfx);
    // Theme details go to natural or artificial based on theme classification
    if (isNatural) {
      this.naturalLayer.addChild(detailGfx);
    } else {
      this.artificialLayer.addChild(detailGfx);
    }

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
      if (hasTheme) {
        // Theme mode: only theme-specific structures
        if (!this.hasLargeStructureSurface(edge, grid)) continue;
        this.drawThemeStructure(structGfx, edge, structRng);
      } else {
        // No theme: common structures only
        this.drawStructure(structGfx, edge, structRng, grid);
      }
      sCount++;
    }
    this.structureLayer.addChild(structGfx);

    // --- Pass 1: Surface Overlay (erosion/rust/stains on tile edges) ---
    // Surface overlays are environmental weathering — always natural
    {
      const surfGfx = new Graphics();
      const surfRng = new PRNG(seed + 11111);
      this.passSurfaceOverlay(surfGfx, edges, surfRng);
      this.naturalLayer.addChild(surfGfx);
    }

    // --- Pass 4: Embedded (structures piercing through solid walls) ---
    {
      const embedGfx = new Graphics();
      const embedRng = new PRNG(seed + 44444);
      this.passEmbedded(embedGfx, grid, embedRng);
      this.structureLayer.addChild(embedGfx);
    }

    // --- Pass 5: Spanning (large decorations bridging open spaces) ---
    // Spanning follows theme classification (vines=natural, pipes/rails=artificial)
    if (hasTheme) {
      const spanGfx = new Graphics();
      const spanRng = new PRNG(seed + 77777);
      this.generateSpans(spanGfx, grid, spanRng);
      (isNatural ? this.naturalLayer : this.artificialLayer).addChild(spanGfx);
    }

    // --- Pass 6: Void Fill (floating elements in empty space) ---
    // Void fill follows theme classification (spores=natural, sparks=artificial)
    {
      const voidGfx = new Graphics();
      const voidRng = new PRNG(seed + 66666);
      const voids = this.scanVoids(grid);
      this.passVoidFill(voidGfx, voids, voidRng);
      (isNatural ? this.naturalLayer : this.artificialLayer).addChild(voidGfx);
    }

    // --- Pass 7: Micro (tiny particles/dots for texture density) ---
    // Micro particles follow theme classification
    {
      const microGfx = new Graphics();
      const microRng = new PRNG(seed + 99999);
      this.passMicro(microGfx, edges, microRng);
      (isNatural ? this.naturalLayer : this.artificialLayer).addChild(microGfx);
    }

    // Pass 8 (Edge Weathering) disabled — crack/drip primitives produced
    // diagonal line artifacts across the map.

    // Pass 9 (Ambient Fill) disabled — particles near walls produced
    // undesirable visual artifacts resembling sun shafts.

    return this.container;
  }

  clear(): void {
    this.naturalLayer.removeChildren();
    this.artificialLayer.removeChildren();
    this.structureLayer.removeChildren();
  }

  // -------------------------------------------------------------------------
  // Edge scanning
  // -------------------------------------------------------------------------

  /**
   * Large decorations (concrete chunks, beams, machinery silhouettes) need a
   * broad, continuous anchor. A one-tile neighbor check still permits bulky
   * shapes to spawn right beside ledge ends, where they overhang the playable
   * silhouette. Require several continuous solid tiles along the surface and
   * backing depth behind it so structures stay away from edges/corners.
   */
  private hasLargeStructureSurface(edge: EdgeTile, grid: number[][]): boolean {
    const { col, row } = edge;
    const clearance = 5;

    if (edge.type === 'floor' || edge.type === 'ceiling') {
      const backingRow = edge.type === 'floor' ? row + 1 : row - 1;
      const openRow = edge.type === 'floor' ? row - 1 : row + 1;
      for (let dc = -clearance; dc <= clearance; dc++) {
        const c = col + dc;
        if (!gridInBounds(grid, row, c) || !gridInBounds(grid, backingRow, c) || !gridInBounds(grid, openRow, c)) return false;
        if (!isSolid(gridAt(grid, row, c))) return false;
        if (!isSolid(gridAt(grid, backingRow, c))) return false;
        if (!isEmpty(gridAt(grid, openRow, c))) return false;
      }
      return true;
    }

    const backingCol = edge.type === 'wall_left' ? col + 1 : col - 1;
    const openCol = edge.type === 'wall_left' ? col - 1 : col + 1;
    for (let dr = -clearance; dr <= clearance; dr++) {
      const r = row + dr;
      if (!gridInBounds(grid, r, col) || !gridInBounds(grid, r, backingCol) || !gridInBounds(grid, r, openCol)) return false;
      if (!isSolid(gridAt(grid, r, col))) return false;
      if (!isSolid(gridAt(grid, r, backingCol))) return false;
      if (!isEmpty(gridAt(grid, r, openCol))) return false;
    }
    return true;
  }

  private scanEdges(grid: number[][]): EdgeTile[] {
    const edges: EdgeTile[] = [];
    const rows = grid.length;

    for (let row = 0; row < rows; row++) {
      const cols = grid[row].length;
      for (let col = 0; col < cols; col++) {
        const val = grid[row][col];
        if (!isSolid(val)) continue;

        const isPlatform = val === 3;

        // Skip decorations on thin (1-tile) surfaces:
        // only register edge if the opposite side is solid (has depth).
        if (isEmpty(gridAt(grid, row - 1, col))) {
          if (isPlatform || isSolid(gridAt(grid, row + 1, col))) {
            edges.push({ col, row, type: 'floor' });
          }
        }
        if (isPlatform) continue;

        if (isEmpty(gridAt(grid, row + 1, col)) && isSolid(gridAt(grid, row - 1, col))) {
          edges.push({ col, row, type: 'ceiling' });
        }
        if (isEmpty(gridAt(grid, row, col - 1)) && isSolid(gridAt(grid, row, col + 1))) {
          edges.push({ col, row, type: 'wall_left' });
        }
        if (isEmpty(gridAt(grid, row, col + 1)) && isSolid(gridAt(grid, row, col - 1))) {
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
      const height = rng.nextFloat(this.growerHMin, this.growerHMax) * S;
      const halfW = rng.nextFloat(0.5, 1.5) * S;
      const lean = rng.nextFloat(-1.5, 1.5) * S;
      const tipX = baseX + ox + lean;
      const tipY = baseY - height;

      // Shadow layer (wider, darker, offset)
      gfx.poly([
        baseX + ox - halfW * 1.3, baseY,
        baseX + ox + halfW * 1.3, baseY,
        tipX + 0.5, tipY + height * 0.1,
      ]);
      gfx.fill({ color: COLOR_GROWER_DARK, alpha: 0.6 });

      // Main blade
      gfx.poly([
        baseX + ox - halfW, baseY,
        baseX + ox + halfW, baseY,
        tipX, tipY,
      ]);
      gfx.fill(this.cGrowerColor);

      // Highlight spine (thin bright line down center)
      const midH = height * 0.6;
      gfx.moveTo(baseX + ox, baseY);
      gfx.lineTo(tipX * 0.5 + (baseX + ox) * 0.5, baseY - midH);
      gfx.stroke({ width: 0.5 * S, color: this.cGrowerTip });

      // Bright tip dot
      gfx.circle(tipX, tipY, 0.6 * S);
      gfx.fill({ color: this.cGrowerTip, alpha: 0.7 });
    }

    // Dark soil cluster at base
    for (let d = 0; d < rng.nextInt(1, 3); d++) {
      const dx = rng.nextFloat(0, T);
      gfx.circle(baseX + dx, baseY + rng.nextFloat(0, 1), rng.nextFloat(0.8, 1.5) * S);
      gfx.fill({ color: COLOR_GROWER_DARK, alpha: 0.4 });
    }

    if (rng.next() < 0.10) {
      const ox = rng.nextFloat(3, T - 3);
      const stemH = rng.nextFloat(6, 12) * S;
      gfx.moveTo(baseX + ox, baseY);
      gfx.lineTo(baseX + ox, baseY - stemH);
      gfx.stroke({ width: 1 * S, color: this.cGrowerColor });
      // Stem highlight
      gfx.moveTo(baseX + ox + 0.5, baseY);
      gfx.lineTo(baseX + ox + 0.5, baseY - stemH * 0.7);
      gfx.stroke({ width: 0.4 * S, color: this.cGrowerTip });
      gfx.circle(baseX + ox, baseY - stemH, 1.5 * S);
      gfx.fill(this.cGrowerTip);
      // Glow halo around flower
      gfx.circle(baseX + ox, baseY - stemH, 2.5 * S);
      gfx.fill({ color: this.cGrowerTip, alpha: 0.15 });
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
      const length = rng.nextFloat(this.hangerLMin, this.hangerLMax) * S;
      const drift = rng.nextFloat(-2, 2) * S;
      // Main root stroke (bezier curve)
      gfx.moveTo(baseX + ox, baseY);
      gfx.bezierCurveTo(
        baseX + ox + drift * 0.3, baseY + length * 0.3,
        baseX + ox + drift * 0.7, baseY + length * 0.7,
        baseX + ox + drift, baseY + length,
      );
      gfx.stroke({ width: 1 * S, color: this.cHangerColor });

      // Highlight edge (thinner, lighter, offset)
      gfx.moveTo(baseX + ox + 0.3, baseY);
      gfx.bezierCurveTo(
        baseX + ox + drift * 0.3 + 0.3, baseY + length * 0.3,
        baseX + ox + drift * 0.7 + 0.3, baseY + length * 0.7,
        baseX + ox + drift + 0.2, baseY + length,
      );
      gfx.stroke({ width: 0.3 * S, color: COLOR_HANGER_LIGHT });
    }

    if (rng.next() < 0.05) {
      const ox = rng.nextFloat(3, T - 3);
      const dropLen = rng.nextFloat(4, 7) * S;
      // Drip with highlight
      gfx.circle(baseX + ox, baseY + dropLen, 1.2 * S);
      gfx.fill(this.cHangerDrip);
      gfx.circle(baseX + ox - 0.3, baseY + dropLen - 0.3, 0.4 * S);
      gfx.fill({ color: 0x90a8b8, alpha: 0.5 });
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

    // Shadow layer (larger, darker, behind)
    const cy = baseY + T / 2;
    const cx = wallX + rng.nextFloat(1, 4) * S * dir;
    const clusterR = rng.nextFloat(3, 7) * S;
    mossCluster(gfx, cx + 0.5 * dir, cy + 0.5, clusterR * 1.2, rng.nextInt(3, 6),
      COLOR_CLINGER_DARK, 0.9, rng);

    // Main moss cluster
    mossCluster(gfx, cx, cy, clusterR, rng.nextInt(5, 12),
      this.cClingerColor, 0.8, rng);

    // Highlight specks (bright dots scattered on top)
    for (let h = 0; h < rng.nextInt(1, 4); h++) {
      const angle = rng.nextFloat(0, Math.PI * 2);
      const dist = clusterR * rng.nextFloat(0.1, 0.6);
      gfx.circle(cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist, rng.nextFloat(0.4, 1) * S);
      gfx.fill({ color: this.cGrowerTip, alpha: rng.nextFloat(0.2, 0.45) });
    }

    // Occasional short vine
    if (rng.next() < 0.12) {
      const oy = rng.nextFloat(3, T - 3);
      const vineLen = rng.nextFloat(5, 10) * S;
      vine(gfx, wallX, baseY + oy, wallX + vineLen * dir, baseY + oy + rng.nextFloat(-4, 4),
        this.cClingerVine, this.cClingerColor,
        1, 1, 0.4, 1.5, rng);
    }
  }

  // -------------------------------------------------------------------------
  // Structure drawing — large industrial debris
  // -------------------------------------------------------------------------

  private drawStructure(gfx: Graphics, edge: EdgeTile, rng: PRNG, grid: number[][]): void {
    const type = rng.nextInt(0, 6);
    switch (type) {
      case 0: {
        if (!this.hasLargeStructureSurface(edge, grid)) break;
        this.drawSteelBeam(gfx, edge, rng);
        break;
      }
      case 1: {
        if (!this.hasLargeStructureSurface(edge, grid)) break;
        this.drawConcreteChunk(gfx, edge, rng);
        break;
      }
      case 2: this.drawRebar(gfx, edge, rng); break;
      case 3: /* pipes disabled — use Pass 4 embedded only */ break;
      case 4: this.drawGirderOutline(gfx, edge, rng, grid); break;
      case 5: this.drawChain(gfx, edge, rng); break;
      case 6: this.drawBranchingVine(gfx, edge, rng); break;
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
      gfx.fill(this.cSteel);
      // Web going up
      const endX = x0 + beamLen * lean;
      const endY = y0 - beamLen;
      gfx.moveTo(x0 - webW / 2, y0);
      gfx.lineTo(endX - webW / 2, endY);
      gfx.lineTo(endX + webW / 2, endY);
      gfx.lineTo(x0 + webW / 2, y0);
      gfx.fill(this.cSteel);
      // Top flange
      gfx.rect(endX - flangeH / 2, endY - beamH / 2, flangeH, beamH / 2);
      gfx.fill(this.cSteel);
    } else if (edge.type === 'ceiling') {
      const ox = rng.nextFloat(0, T);
      const x0 = baseX + ox;
      const y0 = (edge.row + 1) * T;
      const endY = y0 + beamLen * 0.6;
      // Hanging beam segment
      gfx.rect(x0 - flangeH / 2, y0, flangeH, beamH / 2);
      gfx.fill(this.cSteel);
      gfx.moveTo(x0 - webW / 2, y0);
      gfx.lineTo(x0 - webW / 2, endY);
      gfx.lineTo(x0 + webW / 2, endY);
      gfx.lineTo(x0 + webW / 2, y0);
      gfx.fill(this.cSteel);
      // Bottom flange
      gfx.rect(x0 - flangeH / 2, endY, flangeH, beamH / 2);
      gfx.fill(this.cSteel);
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
      gfx.fill(this.cSteel);
      gfx.moveTo(wallX, y0 - webW / 2);
      gfx.lineTo(endX, y0 - webW / 2);
      gfx.lineTo(endX, y0 + webW / 2);
      gfx.lineTo(wallX, y0 + webW / 2);
      gfx.fill(this.cSteel);
      gfx.rect(endX - beamH / 2 * dir, y0 - flangeH / 2, beamH / 2 * dir, flangeH);
      gfx.fill(this.cSteel);
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
      gfx.fill(this.cConcrete);
      // Crack line
      gfx.moveTo(x0 + w * 0.3, y0);
      gfx.lineTo(x0 + w * 0.5 + rng.nextFloat(-2, 2), y0 - h * 0.5);
      gfx.stroke({ width: 1, color: this.cRebar });
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
      gfx.fill(this.cConcrete);
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
      gfx.fill(this.cConcrete);
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
        gfx.stroke({ width: strokeW, color: this.cRebar });
      } else if (edge.type === 'ceiling') {
        const ox = rng.nextFloat(1, T - 1);
        const barH = rng.nextFloat(10, 25) * SS;
        const bend = rng.nextFloat(-5, 5) * SS;
        const y0 = (edge.row + 1) * T;
        gfx.moveTo(baseX + ox, y0);
        gfx.lineTo(baseX + ox + bend * 0.3, y0 + barH * 0.6);
        gfx.lineTo(baseX + ox + bend, y0 + barH);
        gfx.stroke({ width: strokeW, color: this.cRebar });
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
        gfx.stroke({ width: strokeW, color: this.cRebar });
      }
    }
    // Rivet line along rebar base
    if (edge.type === 'floor' || edge.type === 'ceiling') {
      const ry = edge.type === 'floor' ? baseY : (edge.row + 1) * T;
      rivetLine(gfx, baseX, ry, baseX + T, ry,
        T / 4, 1.2 * SS, this.cRebar, this.cSteel, 0.3, 0.5, rng);
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

    const A = 1.0;
    if (edge.type === 'floor' || edge.type === 'ceiling') {
      // Horizontal pipe — offset away from surface
      const gap = rng.nextFloat(6, 16) * SS;
      const y0 = edge.type === 'floor' ? baseY - pipeR - gap : (edge.row + 1) * T + pipeR + gap;
      const x0 = baseX + rng.nextFloat(-T * 0.5, 0);
      // Pipe body (rounded rect)
      gfx.roundRect(x0, y0 - pipeR, pipeLen, pipeR * 2, pipeR);
      gfx.fill({ color: this.cPipe, alpha: A });
      // Pipe outline
      gfx.roundRect(x0, y0 - pipeR, pipeLen, pipeR * 2, pipeR);
      gfx.stroke({ width: 1, color: this.cSteel, alpha: A });
      // Joint ring
      const jointX = x0 + pipeLen * rng.nextFloat(0.3, 0.7);
      gfx.rect(jointX - 1, y0 - pipeR - 1, 3, pipeR * 2 + 2);
      gfx.fill({ color: this.cSteel, alpha: A });
    } else {
      // Vertical pipe — offset away from wall
      const isLeft = edge.type === 'wall_left';
      const gap = rng.nextFloat(6, 16) * SS;
      const wallX = isLeft ? baseX - pipeR - gap : baseX + T + pipeR + gap;
      const y0 = baseY + rng.nextFloat(-T * 0.5, 0);
      gfx.roundRect(wallX - pipeR, y0, pipeR * 2, pipeLen, pipeR);
      gfx.fill({ color: this.cPipe, alpha: A });
      gfx.roundRect(wallX - pipeR, y0, pipeR * 2, pipeLen, pipeR);
      gfx.stroke({ width: 1, color: this.cSteel, alpha: A });
      const jointY = y0 + pipeLen * rng.nextFloat(0.3, 0.7);
      gfx.rect(wallX - pipeR - 1, jointY - 1, pipeR * 2 + 2, 3);
      gfx.fill({ color: this.cSteel, alpha: A });
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
      gfx.stroke({ width: strokeW, color: this.cSteel });
      // Cross braces
      const braceCount = Math.floor(span / 2);
      for (let b = 0; b < braceCount; b++) {
        const bx = x0 + (b + 1) * T * 2 - T;
        gfx.moveTo(bx, y0);
        gfx.lineTo(bx + T * 0.5, y0 - depth);
        gfx.stroke({ width: 1, color: this.cSteel });
      }
    } else if (edge.type === 'ceiling') {
      const x0 = baseX;
      const y0 = (edge.row + 1) * T;
      gfx.moveTo(x0, y0);
      gfx.lineTo(x0, y0 + depth);
      gfx.lineTo(x0 + totalLen, y0 + depth);
      gfx.lineTo(x0 + totalLen, y0);
      gfx.stroke({ width: strokeW, color: this.cSteel });
    } else {
      const isLeft = edge.type === 'wall_left';
      const dir = isLeft ? -1 : 1;
      const wallX = isLeft ? baseX : baseX + T;
      const y0 = baseY;
      gfx.moveTo(wallX, y0);
      gfx.lineTo(wallX + depth * dir, y0);
      gfx.lineTo(wallX + depth * dir, y0 + totalLen);
      gfx.lineTo(wallX, y0 + totalLen);
      gfx.stroke({ width: strokeW, color: this.cSteel });
      // Cross braces
      const braceCount = Math.floor(span / 2);
      for (let b = 0; b < braceCount; b++) {
        const by = y0 + (b + 1) * T * 2 - T;
        gfx.moveTo(wallX, by);
        gfx.lineTo(wallX + depth * dir, by + T * 0.5);
        gfx.stroke({ width: 1, color: this.cSteel });
      }
    }
  }

  // =========================================================================
  // Common additions: Chain + Branching Vine
  // =========================================================================

  /** Chain segment — catenary curve between two anchor points. */
  private drawChain(gfx: Graphics, edge: EdgeTile, rng: PRNG): void {
    const T = this.cfg.tileSize;
    const SS = STRUCT_SCALE;
    if (edge.type !== 'ceiling') return;
    const x0 = edge.col * T + rng.nextFloat(0, T * 0.3);
    const x1 = x0 + rng.nextFloat(2, 5) * T;
    const y0 = (edge.row + 1) * T;
    const sag = rng.nextFloat(8, 20) * SS;
    // Catenary curve + chain link overlay
    catenary(gfx, x0, y0, x1, y0, sag, this.cSteel, 1);
    chainLinks(gfx, x0, y0, x1, y0, sag, 3, 4, this.cSteel, 1);
  }

  /** Branching vine — recursive 2-3 level branching from wall. */
  private drawBranchingVine(gfx: Graphics, edge: EdgeTile, rng: PRNG): void {
    if (edge.type !== 'wall_left' && edge.type !== 'wall_right') return;
    const T = this.cfg.tileSize;
    const isLeft = edge.type === 'wall_left';
    const wallX = isLeft ? edge.col * T : edge.col * T + T;
    const dir = isLeft ? -1 : 1;
    const baseY = edge.row * T + rng.nextFloat(2, T - 2);
    const len = rng.nextFloat(12, 28);
    const endX = wallX + len * dir;
    const endY = baseY + rng.nextFloat(-8, 8);
    vine(gfx, wallX, baseY, endX, endY,
      this.cClingerVine, this.cClingerColor,
      2, 2, 0.6, 2.5, rng);
  }

  // =========================================================================
  // Theme dispatchers
  // =========================================================================

  private drawThemeDetail(gfx: Graphics, edge: EdgeTile, rng: PRNG): void {
    switch (this.preset?.themeId) {
      case 'T-HABITAT': this.dtHabitat(gfx, edge, rng); break;
      case 'T-SECURITY': this.dtSecurity(gfx, edge, rng); break;
      case 'T-FOUNDRY': this.dtFoundry(gfx, edge, rng); break;
      case 'T-BIOZONE': this.dtBiozone(gfx, edge, rng); break;
      case 'T-ARCHIVE': this.dtArchive(gfx, edge, rng); break;
      case 'T-LOGISTICS': this.dtLogistics(gfx, edge, rng); break;
      case 'T-COMMAND': this.dtCommand(gfx, edge, rng); break;
      case 'T-MALFUNCTION': this.dtMalfunction(gfx, edge, rng); break;
      case 'T-BREACH': this.dtBreach(gfx, edge, rng); break;
      case 'T-COOLANT': this.dtCoolant(gfx, edge, rng); break;
      case 'T-ECHO': this.dtEcho(gfx, edge, rng); break;
    }
  }

  private drawThemeStructure(gfx: Graphics, edge: EdgeTile, rng: PRNG): void {
    switch (this.preset?.themeId) {
      case 'T-HABITAT': this.stHabitat(gfx, edge, rng); break;
      case 'T-SECURITY': this.stSecurity(gfx, edge, rng); break;
      case 'T-FOUNDRY': this.stFoundry(gfx, edge, rng); break;
      case 'T-BIOZONE': this.stBiozone(gfx, edge, rng); break;
      case 'T-ARCHIVE': this.stArchive(gfx, edge, rng); break;
      case 'T-LOGISTICS': this.stLogistics(gfx, edge, rng); break;
      case 'T-COMMAND': this.stCommand(gfx, edge, rng); break;
      case 'T-MALFUNCTION': this.stMalfunction(gfx, edge, rng); break;
      case 'T-BREACH': this.stBreach(gfx, edge, rng); break;
      case 'T-COOLANT': this.stCoolant(gfx, edge, rng); break;
      case 'T-ECHO': this.stEcho(gfx, edge, rng); break;
    }
  }

  // Shorthand helpers
  private ex(edge: EdgeTile) {
    const T = this.cfg.tileSize;
    const bx = edge.col * T, by = edge.row * T;
    const isLeft = edge.type === 'wall_left';
    const wallX = isLeft ? bx : bx + T;
    const dir = isLeft ? -1 : 1;
    const cy = (edge.row + 1) * T; // ceiling Y
    return { T, bx, by, wallX, dir, cy, isLeft };
  }

  // =========================================================================
  // T-HABITAT: warm lived-in space
  // =========================================================================

  private dtHabitat(gfx: Graphics, edge: EdgeTile, rng: PRNG): void {
    const { T, bx, by, wallX, dir } = this.ex(edge);
    const c1 = this.cGrowerColor, c2 = this.cHangerColor;
    if (edge.type === 'ceiling') {
      // Long hanging cloth strips (2-3 strips, wavy, very visible)
      const strips = rng.nextInt(2, 3);
      const cy = (edge.row + 1) * T;
      for (let s = 0; s < strips; s++) {
        const ox = rng.nextFloat(1, T - 1);
        const len = rng.nextFloat(24, 48);
        gfx.moveTo(bx + ox, cy);
        for (let p = 1; p <= 8; p++) { gfx.lineTo(bx + ox + Math.sin(p * 1.2 + s) * 7, cy + len * (p / 8)); }
        gfx.stroke({ width: 3, color: c2 });
      }
      // Dangling wire with large bulb
      const wx = bx + rng.nextFloat(3, T - 3);
      const wireLen = rng.nextFloat(18, 36);
      gfx.moveTo(wx, cy); gfx.lineTo(wx + rng.nextFloat(-6, 6), cy + wireLen);
      gfx.stroke({ width: 1.5, color: this.cSteel });
      gfx.circle(wx + rng.nextFloat(-6, 6), cy + wireLen, 4);
      gfx.fill({ color: 0xddcc88, alpha: 0.7 });
      gfx.circle(wx + rng.nextFloat(-6, 6), cy + wireLen, 2);
      gfx.fill({ color: 0xffeeaa, alpha: 0.9 });
    } else if (edge.type === 'floor') {
      // Scattered debris: broken tiles, dust piles
      const n = rng.nextInt(4, 7);
      for (let i = 0; i < n; i++) {
        const ox = rng.nextFloat(0, T);
        const s = rng.nextFloat(2, 5);
        gfx.poly([bx + ox, by, bx + ox + s, by - s * 0.4, bx + ox + s * 1.2, by]);
        gfx.fill({ color: c1, alpha: 0.7 });
      }
      // Floor stain
      gfx.circle(bx + rng.nextFloat(2, T - 2), by - 1, rng.nextFloat(3, 7));
      gfx.fill({ color: c2, alpha: 0.3 });
    } else {
      // Wall: exposed wiring bundle + pipe bracket + poster remnant
      const oy = rng.nextFloat(0, T - 8);
      // Wiring bundle (3-4 parallel lines)
      for (let w = 0; w < rng.nextInt(3, 4); w++) {
        const wy = by + oy + w * 2;
        gfx.moveTo(wallX, wy); gfx.lineTo(wallX + rng.nextFloat(8, 20) * dir, wy + rng.nextFloat(-2, 2));
        gfx.stroke({ width: 1, color: this.cSteel });
      }
      // Pipe bracket — DISABLED (pipes spawn rate 0)
      // const py = by + rng.nextFloat(8, T - 2);
      // gfx.moveTo(wallX, py); gfx.lineTo(wallX + 8 * dir, py); gfx.lineTo(wallX + 8 * dir, py + 8);
      // gfx.stroke({ width: 2, color: c2 });
    }
  }

  private stHabitat(gfx: Graphics, edge: EdgeTile, rng: PRNG): void {
    const { T, bx, by, wallX, dir, cy } = this.ex(edge);
    const c = this.cSteel; const c2 = this.cConcrete;
    if (edge.type === 'floor') {
      // Massive vent grille spanning multiple tiles
      const w = rng.nextFloat(40, 80), h = rng.nextFloat(6, 10);
      gfx.rect(bx, by - h, w, h); gfx.stroke({ width: 2, color: c });
      for (let v = 0; v < 10; v++) { gfx.moveTo(bx + w * v / 10, by - h); gfx.lineTo(bx + w * v / 10, by); gfx.stroke({ width: 1, color: c }); }
      // Broken furniture: table top + legs
      const tx = bx + rng.nextFloat(0, T);
      gfx.rect(tx, by - rng.nextFloat(16, 28), rng.nextFloat(20, 36), 3); gfx.fill(c2);
      gfx.rect(tx + 2, by - rng.nextFloat(16, 28), 3, rng.nextFloat(16, 28)); gfx.fill(c2);
    } else if (edge.type === 'wall_left' || edge.type === 'wall_right') {
      // Wall-mounted cabinet + shelf with objects
      const oy = rng.nextFloat(0, T - 8);
      const cw = rng.nextFloat(20, 36), ch = rng.nextFloat(16, 28);
      gfx.rect(wallX + 1 * dir, by + oy, cw * dir, ch); gfx.stroke({ width: 2, color: c });
      // Shelf inside cabinet
      gfx.moveTo(wallX + 1 * dir, by + oy + ch * 0.4); gfx.lineTo(wallX + (1 + cw) * dir, by + oy + ch * 0.4);
      gfx.stroke({ width: 1.5, color: c });
      // Objects on shelves (bottles/boxes)
      for (let it = 0; it < 4; it++) {
        const ix = wallX + (3 + it * (cw / 4)) * dir;
        const ih = rng.nextFloat(4, 10);
        gfx.rect(ix, by + oy + ch * 0.4 - ih, 4 * dir, ih); gfx.fill(c2);
      }
    } else {
      // Ceiling: massive fluorescent light frame + hanging cables
      const w = rng.nextFloat(32, 64), h = 6;
      gfx.rect(bx, cy, w, h); gfx.fill(c);
      // Light glow
      gfx.rect(bx + 2, cy + 1, w - 4, h - 2); gfx.fill({ color: 0xddcc88, alpha: 0.3 });
      // Cables hanging from fixture ends
      for (let cd = 0; cd < 4; cd++) {
        const cx2 = bx + w * (cd + 1) / 5;
        const clen = rng.nextFloat(12, 30);
        gfx.moveTo(cx2, cy + h); gfx.lineTo(cx2 + rng.nextFloat(-6, 6), cy + h + clen);
        gfx.stroke({ width: 1.5, color: c });
      }
    }
  }

  // =========================================================================
  // T-SECURITY: cold surveillance corridors
  // =========================================================================

  private dtSecurity(gfx: Graphics, edge: EdgeTile, rng: PRNG): void {
    const { T, bx, by, wallX, dir } = this.ex(edge);
    const c = this.cGrowerColor;
    if (edge.type === 'floor') {
      // Bold warning stripes (5-7, wide, alternating yellow-black)
      const stripeCount = rng.nextInt(5, 7);
      for (let s = 0; s < stripeCount; s++) {
        const sx = bx + s * 3;
        gfx.moveTo(sx, by); gfx.lineTo(sx + 4, by - 5);
        gfx.stroke({ width: 3, color: s % 2 === 0 ? 0x9a9a2a : 0x2a2a2a });
      }
      // Floor mounted sensor strip
      gfx.rect(bx, by - 1, T, 1.5); gfx.fill({ color: 0x4488aa, alpha: 0.4 });
    } else if (edge.type === 'ceiling') {
      const cy = (edge.row + 1) * T;
      // Ceiling surveillance rail (long bar + camera pods)
      const len = rng.nextFloat(20, 40);
      gfx.rect(bx, cy, len, 3); gfx.fill(this.cSteel);
      for (let p = 0; p < 2; p++) {
        const px = bx + rng.nextFloat(4, len - 4);
        gfx.moveTo(px, cy + 3); gfx.lineTo(px, cy + 8);
        gfx.stroke({ width: 1.5, color: this.cSteel });
        gfx.circle(px, cy + 10, 3); gfx.fill(this.cConcrete);
        gfx.circle(px, cy + 10, 1.5); gfx.fill({ color: 0x4444ee, alpha: 0.6 }); // blue lens
      }
    } else {
      // Wall: laser sensor lines (multiple glowing horizontal lines)
      const lineCount = rng.nextInt(2, 4);
      for (let l = 0; l < lineCount; l++) {
        const oy = rng.nextFloat(1, T - 1);
        const len = rng.nextFloat(15, 35);
        gfx.moveTo(wallX, by + oy); gfx.lineTo(wallX + len * dir, by + oy);
        gfx.stroke({ width: 1, color: c });
        // Emitter dot at wall
        gfx.circle(wallX + 1 * dir, by + oy, 1.5); gfx.fill({ color: 0xee4444, alpha: 0.7 });
      }
    }
  }

  private stSecurity(gfx: Graphics, edge: EdgeTile, rng: PRNG): void {
    const { T, bx, by, wallX, dir, cy } = this.ex(edge);
    const c = this.cSteel; const c2 = this.cConcrete;
    if (edge.type === 'floor') {
      // Barrier post pair with hazard tape
      const bh = rng.nextFloat(18, 32);
      const x1 = bx + rng.nextFloat(0, 4), x2 = x1 + rng.nextFloat(24, 48);
      // Post 1
      gfx.rect(x1 - 3, by - bh, 6, bh); gfx.fill(c);
      gfx.rect(x1 - 5, by - bh, 10, 4); gfx.fill(c);
      // Post 2
      gfx.rect(x2 - 3, by - bh, 6, bh); gfx.fill(c);
      gfx.rect(x2 - 5, by - bh, 10, 4); gfx.fill(c);
      // Hazard tape between
      gfx.moveTo(x1, by - bh * 0.5); gfx.lineTo(x2, by - bh * 0.5);
      gfx.stroke({ width: 3, color: 0x8a8a2a });
      gfx.moveTo(x1, by - bh * 0.7); gfx.lineTo(x2, by - bh * 0.7);
      gfx.stroke({ width: 3, color: 0x8a8a2a });
    } else if (edge.type === 'ceiling') {
      // Heavy armored ceiling panel with bolts
      const w = rng.nextFloat(32, 64);
      gfx.rect(bx, cy, w, 8); gfx.fill(c);
      // Bolt pattern
      for (let b = 0; b < 6; b++) { gfx.circle(bx + w * (b + 1) / 7, cy + 4, 1.5); gfx.fill(c2); }
      // Camera drop arm
      const camX = bx + w * 0.5;
      gfx.moveTo(camX, cy + 8); gfx.lineTo(camX, cy + 16); gfx.stroke({ width: 2, color: c });
      gfx.circle(camX, cy + 18, 5); gfx.fill(c2);
      gfx.circle(camX, cy + 18, 2.5); gfx.fill({ color: 0x4444ee, alpha: 0.6 });
    } else {
      const pick = rng.nextInt(0, 2);
      if (pick === 0) {
        // Massive camera on articulated arm
        const oy = rng.nextFloat(0, T - 6);
        gfx.rect(wallX, by + oy, 8 * dir, 8); gfx.fill(c); // mount plate
        gfx.moveTo(wallX + 8 * dir, by + oy + 4); gfx.lineTo(wallX + 20 * dir, by + oy + 8);
        gfx.stroke({ width: 3, color: c }); // arm
        gfx.circle(wallX + 22 * dir, by + oy + 8, 6); gfx.fill(c2); // housing
        gfx.circle(wallX + 22 * dir, by + oy + 8, 3); gfx.fill({ color: 0x4444ee, alpha: 0.6 }); // lens
      } else if (pick === 1) {
        // Full gate frame (spans tile height)
        gfx.rect(wallX, by, 8 * dir, T); gfx.fill(c); // vertical
        gfx.rect(wallX, by, 20 * dir, 5); gfx.fill(c); // top beam
        gfx.rect(wallX, by + T - 5, 20 * dir, 5); gfx.fill(c); // bottom beam
        // Warning chevrons
        for (let ch = 0; ch < 3; ch++) {
          const chy = by + 8 + ch * 4;
          gfx.moveTo(wallX + 9 * dir, chy); gfx.lineTo(wallX + 14 * dir, chy + 2); gfx.lineTo(wallX + 9 * dir, chy + 4);
          gfx.stroke({ width: 1.5, color: 0x8a8a2a });
        }
      } else {
        // Large access panel with keycard reader
        const oy = rng.nextFloat(1, T - 10);
        gfx.rect(wallX + 1 * dir, by + oy, 14 * dir, 14); gfx.fill(c);
        gfx.rect(wallX + 2 * dir, by + oy + 3, 8 * dir, 2); gfx.fill(0x222222); // card slot
        // Status LEDs (3 dots)
        for (let d = 0; d < 3; d++) {
          gfx.circle(wallX + (4 + d * 3) * dir, by + oy + 10, 1.5);
          gfx.fill({ color: d === 0 ? 0x44aa44 : 0x444444, alpha: 0.9 });
        }
      }
    }
  }

  // =========================================================================
  // T-FOUNDRY: heat and metal
  // =========================================================================

  private dtFoundry(gfx: Graphics, edge: EdgeTile, rng: PRNG): void {
    const { T, bx, by, wallX, dir } = this.ex(edge);
    if (edge.type === 'ceiling') {
      // Molten drip trail: elongated teardrop + trail dots descending
      const ox = rng.nextFloat(2, T - 2), cy = (edge.row + 1) * T;
      const dropLen = rng.nextFloat(8, 20);
      // Trail of diminishing drops
      for (let d = 0; d < 4; d++) {
        const dy = cy + d * dropLen / 4;
        const r = rng.nextFloat(1.5, 3) * (1 - d * 0.2);
        gfx.circle(bx + ox + rng.nextFloat(-1, 1), dy, r);
        gfx.fill({ color: 0xee6622, alpha: 0.7 - d * 0.12 });
      }
      // Hot glow halo at top
      gfx.circle(bx + ox, cy + 2, 5);
      gfx.fill({ color: 0xffaa44, alpha: 0.15 });
    } else if (edge.type === 'wall_left' || edge.type === 'wall_right') {
      // Scorch mark: char spot + scattered burn dots (no diagonal lines)
      const oy = rng.nextFloat(2, T - 4);
      const cx2 = wallX + 4 * dir, cy2 = by + oy;
      gfx.circle(cx2, cy2, rng.nextFloat(2, 4));
      gfx.fill({ color: 0x1a0a08, alpha: 0.6 });
      // Scattered burn dots instead of radial lines
      for (let r = 0; r < rng.nextInt(3, 6); r++) {
        const a = rng.nextFloat(0, Math.PI * 2);
        const dist = rng.nextFloat(3, 8);
        gfx.circle(cx2 + Math.cos(a) * dist, cy2 + Math.sin(a) * dist, rng.nextFloat(0.5, 1.5));
        gfx.fill({ color: 0x3a1808, alpha: rng.nextFloat(0.3, 0.6) });
      }
    } else {
      // Floor: hammer strike mark (impact crater, no radial lines)
      const ox = rng.nextFloat(2, T - 4);
      const r = rng.nextFloat(3, 7);
      gfx.circle(bx + ox, by - 1, r); gfx.stroke({ width: 1.5, color: this.cRebar });
      gfx.circle(bx + ox, by - 1, r * 0.5); gfx.fill({ color: 0xee6622, alpha: 0.3 });
      // Scattered impact debris dots
      for (let s = 0; s < 5; s++) {
        const a = rng.nextFloat(0, Math.PI * 2);
        const dist = r + rng.nextFloat(1, 4);
        gfx.circle(bx + ox + Math.cos(a) * dist, by - 1 + Math.sin(a) * dist, rng.nextFloat(0.5, 1.2));
        gfx.fill({ color: this.cRebar, alpha: rng.nextFloat(0.3, 0.5) });
      }
    }
  }

  private stFoundry(gfx: Graphics, edge: EdgeTile, rng: PRNG): void {
    const { T, bx, by, wallX, dir, cy } = this.ex(edge);
    const c = this.cSteel;
    if (edge.type === 'floor') {
      const pick = rng.nextInt(0, 2);
      if (pick === 0) {
        // Anvil silhouette: trapezoid body + horn
        const aw = rng.nextFloat(16, 28), ah = rng.nextFloat(8, 14);
        const ox = rng.nextFloat(0, T);
        gfx.poly([bx + ox, by, bx + ox + aw * 0.1, by - ah, bx + ox + aw * 0.9, by - ah, bx + ox + aw, by]);
        gfx.fill(c);
        // Horn extending right
        gfx.poly([bx + ox + aw * 0.9, by - ah, bx + ox + aw + 8, by - ah + 2, bx + ox + aw + 8, by - ah + 5, bx + ox + aw * 0.9, by - ah + 3]);
        gfx.fill(c);
      } else if (pick === 1) {
        // Crucible on stand: half-circle vessel with tripod legs
        const r = rng.nextFloat(6, 12);
        const ox = rng.nextFloat(4, T - 4);
        gfx.arc(bx + ox, by - 4, r, Math.PI, 0); gfx.stroke({ width: 2.5, color: c });
        // Tripod legs
        gfx.moveTo(bx + ox - r, by - 4); gfx.lineTo(bx + ox - r - 3, by); gfx.stroke({ width: 2, color: c });
        gfx.moveTo(bx + ox + r, by - 4); gfx.lineTo(bx + ox + r + 3, by); gfx.stroke({ width: 2, color: c });
        gfx.moveTo(bx + ox, by - 4 + r); gfx.lineTo(bx + ox, by); gfx.stroke({ width: 2, color: c });
        // Glow inside crucible
        gfx.circle(bx + ox, by - 4, r * 0.6);
        gfx.fill({ color: 0xee6622, alpha: 0.2 });
      } else {
        // Ingot mold: rectangular mold with inner cavity
        const mw = rng.nextFloat(18, 32), mh = rng.nextFloat(6, 10);
        const ox = rng.nextFloat(0, T);
        gfx.rect(bx + ox, by - mh, mw, mh); gfx.stroke({ width: 2, color: c });
        gfx.rect(bx + ox + 3, by - mh + 2, mw - 6, mh - 3); gfx.fill({ color: this.cRebar, alpha: 0.3 });
      }
    } else if (edge.type === 'ceiling') {
      // Industrial crane hook on chain: chain links + triangular hook
      const ox = rng.nextFloat(2, T - 2);
      const chainLen = rng.nextFloat(12, 24);
      // Chain links (alternating horizontal/vertical rects)
      for (let l = 0; l < Math.floor(chainLen / 4); l++) {
        const ly = cy + l * 4;
        if (l % 2 === 0) {
          gfx.rect(bx + ox - 2, ly, 4, 3); gfx.stroke({ width: 1, color: c });
        } else {
          gfx.rect(bx + ox - 1.5, ly, 3, 3); gfx.stroke({ width: 1, color: c });
        }
      }
      // Triangular hook at bottom
      const hookY = cy + chainLen;
      gfx.poly([bx + ox, hookY, bx + ox - 5, hookY + 8, bx + ox + 5, hookY + 8]);
      gfx.stroke({ width: 2, color: this.cRebar });
      // Hook opening
      gfx.arc(bx + ox, hookY + 8, 4, 0, Math.PI); gfx.stroke({ width: 2, color: this.cRebar });
    } else {
      // Wall: tongs/pliers silhouette (crossed lines with handles)
      const oy = rng.nextFloat(2, T - 6);
      const len = rng.nextFloat(10, 20);
      // Two crossing arms
      gfx.moveTo(wallX + 1 * dir, by + oy); gfx.lineTo(wallX + len * dir, by + oy + len * 0.6);
      gfx.moveTo(wallX + 1 * dir, by + oy + 4); gfx.lineTo(wallX + len * dir, by + oy + len * 0.6 - 4);
      gfx.stroke({ width: 2, color: c });
      // Pivot point
      gfx.circle(wallX + len * 0.4 * dir, by + oy + 2, 2.5); gfx.fill(c);
    }
  }

  // =========================================================================
  // T-BIOZONE: overgrown organic space
  // =========================================================================

  private dtBiozone(gfx: Graphics, edge: EdgeTile, rng: PRNG): void {
    const { T, bx, by, wallX, dir } = this.ex(edge);
    const c1 = this.cGrowerColor, c2 = this.cClingerColor;
    if (edge.type === 'ceiling') {
      // Thick hanging roots (2-3, long bezier curves)
      const rootCount = rng.nextInt(2, 3);
      const cy = (edge.row + 1) * T;
      for (let r = 0; r < rootCount; r++) {
        const ox = rng.nextFloat(1, T - 1);
        const len = rng.nextFloat(20, 50);
        const drift = rng.nextFloat(-10, 10);
        gfx.moveTo(bx + ox, cy);
        gfx.bezierCurveTo(bx + ox + drift * 0.3, cy + len * 0.3, bx + ox + drift * 0.7, cy + len * 0.6, bx + ox + drift, cy + len);
        gfx.stroke({ width: rng.nextFloat(3, 6), color: this.cHangerColor });
        // Sub-roots branching off
        if (rng.next() < 0.6) {
          const branchY = cy + len * rng.nextFloat(0.3, 0.7);
          const branchX = bx + ox + drift * rng.nextFloat(0.3, 0.7);
          gfx.moveTo(branchX, branchY);
          gfx.lineTo(branchX + rng.nextFloat(-8, 8), branchY + rng.nextFloat(6, 14));
          gfx.stroke({ width: 1.5, color: this.cHangerColor });
        }
      }
      // Hanging spore pods
      for (let sp = 0; sp < rng.nextInt(1, 3); sp++) {
        const sx = bx + rng.nextFloat(2, T - 2);
        const sy = cy + rng.nextFloat(4, 16);
        gfx.circle(sx, sy, rng.nextFloat(2, 4)); gfx.fill({ color: this.cGrowerTip, alpha: 0.6 });
      }
    } else if (edge.type === 'floor') {
      const pick = rng.nextInt(0, 2);
      if (pick === 0) {
        // Tall grass blades (5-8, much taller than normal)
        const n = rng.nextInt(5, 8);
        for (let i = 0; i < n; i++) {
          const ox = rng.nextFloat(0, T);
          const h = rng.nextFloat(10, 24);
          const lean = rng.nextFloat(-3, 3);
          gfx.poly([bx + ox - 1.5, by, bx + ox + 1.5, by, bx + ox + lean, by - h]);
          gfx.fill(c1);
        }
      } else if (pick === 1) {
        // Spore cloud (dense, large)
        const n = rng.nextInt(8, 14);
        for (let i = 0; i < n; i++) {
          gfx.circle(bx + rng.nextFloat(-4, T + 4), by - rng.nextFloat(3, 16), rng.nextFloat(1.5, 4));
          gfx.fill({ color: c1, alpha: 0.4 });
        }
      } else {
        // Large seed pod on thick stem
        const ox = rng.nextFloat(3, T - 3), stemH = rng.nextFloat(14, 28);
        gfx.moveTo(bx + ox, by); gfx.lineTo(bx + ox, by - stemH);
        gfx.stroke({ width: 2.5, color: c1 });
        gfx.circle(bx + ox, by - stemH, rng.nextFloat(4, 7)); gfx.fill(this.cGrowerTip);
        // Petal triangles around pod
        for (let p = 0; p < 4; p++) {
          const a = p * Math.PI / 2;
          const pr = rng.nextFloat(4, 7);
          gfx.poly([bx + ox, by - stemH, bx + ox + Math.cos(a) * pr, by - stemH + Math.sin(a) * pr, bx + ox + Math.cos(a + 0.5) * pr * 0.6, by - stemH + Math.sin(a + 0.5) * pr * 0.6]);
          gfx.fill({ color: c1, alpha: 0.5 });
        }
      }
    } else {
      // Wall: massive branching vines (2 starting points, deeper recursion)
      for (let v = 0; v < 2; v++) {
        const vy = by + rng.nextFloat(1, T - 1);
        const vLen = rng.nextFloat(14, 30);
        vine(gfx, wallX, vy, wallX + vLen * dir, vy + rng.nextFloat(-10, 10),
          this.cClingerVine, this.cClingerColor, 2, 2, 0.6, 2.5, rng);
      }
      // Wall moss patches (large)
      const n = rng.nextInt(3, 6);
      for (let i = 0; i < n; i++) {
        gfx.circle(wallX + rng.nextFloat(1, 6) * dir, by + rng.nextFloat(0, T), rng.nextFloat(2, 5));
        gfx.fill({ color: c2, alpha: 0.6 });
      }
    }
  }

  private stBiozone(gfx: Graphics, edge: EdgeTile, rng: PRNG): void {
    const { T, bx, by, wallX, dir, cy } = this.ex(edge);
    const c = this.cSteel;
    if (edge.type === 'floor') {
      // planter box remains
      const w = rng.nextFloat(10, 20), h = rng.nextFloat(4, 8);
      gfx.rect(bx + rng.nextFloat(0, T), by - h, w, h); gfx.stroke({ width: 1, color: c });
    } else if (edge.type === 'wall_left' || edge.type === 'wall_right') {
      // bio_culture_tank: vertical rect + top circle
      const h = rng.nextFloat(12, 22), w = rng.nextFloat(6, 10);
      const oy = rng.nextFloat(0, T - 4);
      gfx.rect(wallX + 1 * dir, by + oy, w * dir, h); gfx.stroke({ width: 1, color: c });
      gfx.circle(wallX + (w / 2 + 1) * dir, by + oy, 3); gfx.fill(c);
    } else if (edge.type === 'ceiling') {
      // bio_irrigation: thin round pipe — DISABLED (pipes spawn rate 0)
      // const len = rng.nextFloat(20, 40);
      // const ox = rng.nextFloat(0, T);
      // gfx.roundRect(bx + ox, cy, len, 4, 2); gfx.fill(c);
      // gfx.rect(bx + ox + len * 0.5, cy, 2, 4); gfx.fill(this.cConcrete); // joint
    }
  }

  // =========================================================================
  // T-ARCHIVE: data center fluorescent
  // =========================================================================

  private dtArchive(gfx: Graphics, edge: EdgeTile, rng: PRNG): void {
    const { T, bx, by, wallX, dir } = this.ex(edge);
    const c = this.cGrowerColor;
    if (edge.type === 'floor') {
      // Scattered data shards on floor + glowing residue
      const n = rng.nextInt(3, 5);
      for (let i = 0; i < n; i++) {
        const ox = rng.nextFloat(0, T), s = rng.nextFloat(2, 5);
        gfx.poly([bx + ox, by, bx + ox + s, by - s * 0.8, bx + ox + s * 0.6, by]);
        gfx.fill({ color: c, alpha: 0.6 });
      }
      // Glowing data line on floor
      gfx.moveTo(bx, by - 1); gfx.lineTo(bx + T, by - 1);
      gfx.stroke({ width: 1, color: c });
    } else if (edge.type === 'ceiling') {
      const cy = (edge.row + 1) * T;
      // Multiple hanging data cables (3-5, long)
      const cables = rng.nextInt(3, 5);
      for (let cb = 0; cb < cables; cb++) {
        const ox = rng.nextFloat(1, T - 1);
        const len = rng.nextFloat(10, 30);
        const drift = rng.nextFloat(-4, 4);
        gfx.moveTo(bx + ox, cy);
        gfx.lineTo(bx + ox + drift * 0.5, cy + len * 0.5);
        gfx.lineTo(bx + ox + drift, cy + len);
        gfx.stroke({ width: 1, color: c });
        // Data pulse dot at end
        gfx.circle(bx + ox + drift, cy + len, 1.5);
        gfx.fill({ color: c, alpha: 0.7 });
      }
    } else {
      // Wall: screen fragments (2-3, visible glowing rectangles) + data lines
      const screens = rng.nextInt(2, 3);
      for (let s = 0; s < screens; s++) {
        const oy = rng.nextFloat(1, T - 5);
        const w = rng.nextFloat(5, 10), h = rng.nextFloat(4, 8);
        gfx.rect(wallX + 1 * dir, by + oy, w * dir, h);
        gfx.fill({ color: c, alpha: rng.nextFloat(0.4, 0.8) });
        // Scan line inside screen
        gfx.moveTo(wallX + 1 * dir, by + oy + h * 0.5);
        gfx.lineTo(wallX + (1 + w) * dir, by + oy + h * 0.5);
        gfx.stroke({ width: 0.5, color: 0xffffff });
      }
      // Horizontal data bus line
      gfx.moveTo(wallX, by + T * 0.5); gfx.lineTo(wallX + rng.nextFloat(15, 30) * dir, by + T * 0.5);
      gfx.stroke({ width: 1.5, color: c });
    }
  }

  private stArchive(gfx: Graphics, edge: EdgeTile, rng: PRNG): void {
    const { T, bx, by, wallX, dir, cy } = this.ex(edge);
    const c = this.cSteel; const c2 = this.cConcrete;
    if (edge.type === 'wall_left' || edge.type === 'wall_right') {
      // Massive server rack (full tile height, with blinking LEDs)
      const rh = T, rw = rng.nextFloat(12, 20);
      gfx.rect(wallX + 1 * dir, by, rw * dir, rh); gfx.stroke({ width: 2, color: c });
      // Drive bays (horizontal lines)
      for (let l = 0; l < 8; l++) {
        const ly = by + rh * (l + 1) / 9;
        gfx.moveTo(wallX + 2 * dir, ly); gfx.lineTo(wallX + (rw - 1) * dir, ly);
        gfx.stroke({ width: 1, color: c });
        // LED dot per bay
        gfx.circle(wallX + (rw - 3) * dir, ly - rh / 18, 1);
        gfx.fill({ color: rng.next() < 0.3 ? 0x44ee44 : 0x444444, alpha: 0.8 });
      }
    } else if (edge.type === 'ceiling') {
      // Wide cable tray with dense cable bundle
      const len = rng.nextFloat(32, 64);
      gfx.rect(bx, cy, len, 5); gfx.fill(c);
      // Dense cable drops (5-7)
      for (let cb = 0; cb < rng.nextInt(5, 7); cb++) {
        const cx2 = bx + rng.nextFloat(3, len - 3);
        const clen = rng.nextFloat(10, 28);
        gfx.moveTo(cx2, cy + 5);
        gfx.bezierCurveTo(cx2 + rng.nextFloat(-6, 6), cy + 5 + clen * 0.3, cx2 + rng.nextFloat(-8, 8), cy + 5 + clen * 0.7, cx2 + rng.nextFloat(-4, 4), cy + 5 + clen);
        gfx.stroke({ width: 1.5, color: c2 });
      }
    } else {
      // Floor: toppled terminal monitor + keyboard debris
      const tw = rng.nextFloat(14, 24), th = rng.nextFloat(10, 18);
      const ox = rng.nextFloat(0, T);
      // Fallen monitor (tilted rect)
      gfx.poly([bx + ox, by, bx + ox + tw * 0.3, by - th, bx + ox + tw, by - th * 0.8, bx + ox + tw, by]);
      gfx.fill(c);
      // Screen area
      gfx.poly([bx + ox + 2, by - 1, bx + ox + tw * 0.3 + 1, by - th + 2, bx + ox + tw - 2, by - th * 0.8 + 2, bx + ox + tw - 2, by - 1]);
      gfx.fill({ color: this.cGrowerColor, alpha: 0.3 });
    }
  }

  // =========================================================================
  // T-LOGISTICS: cargo and transport
  // =========================================================================

  private dtLogistics(gfx: Graphics, edge: EdgeTile, rng: PRNG): void {
    const { T, bx, by, wallX, dir } = this.ex(edge);
    if (edge.type === 'floor') {
      // Pallet slats: crossed wooden boards (X pattern)
      const ox = rng.nextFloat(0, T - 6);
      const w = rng.nextFloat(8, 14), h = rng.nextFloat(3, 6);
      gfx.rect(bx + ox, by - 1.5, w, 1.5); gfx.fill(this.cGrowerColor);
      gfx.rect(bx + ox + w * 0.3, by - h, 1.5, h); gfx.fill(this.cGrowerColor);
      gfx.rect(bx + ox + w * 0.7, by - h * 0.7, 1.5, h * 0.7); gfx.fill(this.cGrowerColor);
    } else if (edge.type === 'ceiling') {
      // Cargo net: crossed diagonal lines
      const cx2 = bx + rng.nextFloat(0, T - 6), cy = (edge.row + 1) * T;
      const netW = rng.nextFloat(10, 18), netH = rng.nextFloat(6, 12);
      for (let d = 0; d < 3; d++) {
        gfx.moveTo(cx2 + d * netW / 3, cy); gfx.lineTo(cx2 + (d + 1) * netW / 3, cy + netH);
        gfx.moveTo(cx2 + (d + 1) * netW / 3, cy); gfx.lineTo(cx2 + d * netW / 3, cy + netH);
        gfx.stroke({ width: 0.8, color: this.cConcrete });
      }
    } else {
      // Wall: shipping sticker (rect with diagonal stripe)
      const oy = rng.nextFloat(2, T - 6);
      const sw = rng.nextFloat(4, 8), sh = rng.nextFloat(3, 5);
      gfx.rect(wallX + 1 * dir, by + oy, sw * dir, sh); gfx.stroke({ width: 0.7, color: this.cConcrete });
      gfx.moveTo(wallX + 1 * dir, by + oy); gfx.lineTo(wallX + (1 + sw) * dir, by + oy + sh);
      gfx.stroke({ width: 0.5, color: this.cSteel });
    }
  }

  private stLogistics(gfx: Graphics, edge: EdgeTile, rng: PRNG): void {
    const { T, bx, by, cy, wallX, dir } = this.ex(edge);
    const c = this.cSteel;
    if (edge.type === 'floor') {
      if (rng.next() < 0.5) {
        // log_container: large rect fragment
        const w = rng.nextFloat(16, 30), h = rng.nextFloat(10, 18);
        gfx.rect(bx + rng.nextFloat(0, T), by - h, w, h); gfx.stroke({ width: 1.5, color: c });
      } else {
        // log_rail_segment: line + ties
        const len = rng.nextFloat(20, 40);
        gfx.moveTo(bx, by - 1); gfx.lineTo(bx + len, by - 1); gfx.stroke({ width: 2, color: c });
        for (let t = 0; t < len; t += 5) { gfx.rect(bx + t, by - 3, 2, 4); gfx.fill(c); }
      }
    } else if (edge.type === 'ceiling') {
      // log_crane_arm: thick angled line
      const len = rng.nextFloat(14, 28);
      const ox = rng.nextFloat(0, T);
      gfx.moveTo(bx + ox, cy); gfx.lineTo(bx + ox + len * 0.6, cy + rng.nextFloat(6, 14));
      gfx.lineTo(bx + ox + len, cy + rng.nextFloat(3, 8));
      gfx.stroke({ width: 3, color: c });
    } else {
      // wall: cargo tie-down hook
      const oy = rng.nextFloat(3, T - 5);
      gfx.rect(wallX, by + oy, 4 * dir, 3); gfx.fill(c);
      gfx.moveTo(wallX + 4 * dir, by + oy + 1.5); gfx.lineTo(wallX + 8 * dir, by + oy + 5);
      gfx.stroke({ width: 1.5, color: c });
    }
  }

  // =========================================================================
  // T-COMMAND: bridge and instruments
  // =========================================================================

  private dtCommand(gfx: Graphics, edge: EdgeTile, rng: PRNG): void {
    const { T, bx, by, wallX, dir } = this.ex(edge);
    const c = this.cGrowerColor, ct = this.cGrowerTip;
    if (edge.type === 'floor') {
      // Floor navigation marker: chevron arrow pointing right
      const ox = rng.nextFloat(2, T - 6);
      const s = rng.nextFloat(3, 6);
      gfx.moveTo(bx + ox, by - s); gfx.lineTo(bx + ox + s, by - s / 2); gfx.lineTo(bx + ox, by);
      gfx.stroke({ width: 1.5, color: ct });
      // Status LED strip (3 dots in a row)
      for (let d = 0; d < 3; d++) {
        gfx.circle(bx + ox + s + 3 + d * 3, by - s / 2, 1);
        gfx.fill({ color: d === 0 ? 0x44ee44 : ct, alpha: 0.6 });
      }
    } else if (edge.type === 'wall_left' || edge.type === 'wall_right') {
      // Wall readout: vertical bar graph (4 bars of different heights)
      const oy = rng.nextFloat(2, T - 8);
      for (let b = 0; b < 4; b++) {
        const bh = rng.nextFloat(2, 8);
        gfx.rect(wallX + (1 + b * 3) * dir, by + oy + 8 - bh, 2 * dir, bh);
        gfx.fill({ color: ct, alpha: 0.5 + b * 0.1 });
      }
      // Readout frame
      gfx.rect(wallX + 0.5 * dir, by + oy, 13 * dir, 9); gfx.stroke({ width: 0.5, color: c });
    } else {
      // Ceiling: holographic targeting reticle
      const cx = bx + rng.nextFloat(3, T - 3), cy = (edge.row + 1) * T + rng.nextFloat(4, 10);
      const r = rng.nextFloat(3, 6);
      gfx.circle(cx, cy, r); gfx.stroke({ width: 0.7, color: c });
      gfx.moveTo(cx - r * 1.3, cy); gfx.lineTo(cx - r * 0.5, cy); // left crosshair
      gfx.moveTo(cx + r * 0.5, cy); gfx.lineTo(cx + r * 1.3, cy); // right crosshair
      gfx.moveTo(cx, cy - r * 1.3); gfx.lineTo(cx, cy - r * 0.5); // top
      gfx.moveTo(cx, cy + r * 0.5); gfx.lineTo(cx, cy + r * 1.3); // bottom
      gfx.stroke({ width: 0.5, color: c });
    }
  }

  private stCommand(gfx: Graphics, edge: EdgeTile, rng: PRNG): void {
    const { T, bx, by, wallX, dir, cy } = this.ex(edge);
    const c = this.cSteel;
    if (edge.type === 'floor') {
      // floor console pedestal
      const w = rng.nextFloat(6, 12), h = rng.nextFloat(5, 10);
      gfx.rect(bx + rng.nextFloat(0, T), by - h, w, h); gfx.stroke({ width: 1, color: c });
    } else if (edge.type === 'wall_left' || edge.type === 'wall_right') {
      if (rng.next() < 0.5) {
        // cmd_console_panel: rect + dial row
        const w = rng.nextFloat(8, 14), h = rng.nextFloat(10, 16);
        const oy = rng.nextFloat(0, T - 4);
        gfx.rect(wallX + 1 * dir, by + oy, w * dir, h); gfx.stroke({ width: 1, color: c });
        for (let d = 0; d < 3; d++) {
          gfx.circle(wallX + (3 + d * 3) * dir, by + oy + h * 0.6, 1.2); gfx.fill(c);
        }
      } else {
        // cmd_display_frame: large empty rect
        const w = rng.nextFloat(12, 20), h = rng.nextFloat(8, 14);
        const oy = rng.nextFloat(0, T - 4);
        gfx.rect(wallX + 1 * dir, by + oy, w * dir, h); gfx.stroke({ width: 1.5, color: c });
      }
    } else if (edge.type === 'ceiling') {
      // cmd_antenna_shard: long thin diagonal line
      const ox = rng.nextFloat(2, T - 2);
      gfx.moveTo(bx + ox, cy); gfx.lineTo(bx + ox + rng.nextFloat(-8, 8), cy + rng.nextFloat(10, 25));
      gfx.stroke({ width: 1, color: c });
    }
  }

  // =========================================================================
  // T-MALFUNCTION: glitch and corruption
  // =========================================================================

  private dtMalfunction(gfx: Graphics, edge: EdgeTile, rng: PRNG): void {
    const { T, bx, by, wallX, dir } = this.ex(edge);
    const c = this.cGrowerColor;
    if (edge.type === 'floor') {
      // floor spark scatter
      const n = rng.nextInt(2, 4);
      for (let i = 0; i < n; i++) {
        gfx.circle(bx + rng.nextFloat(0, T), by - rng.nextFloat(1, 5), rng.nextFloat(1, 2));
        gfx.fill({ color: 0xffaa44, alpha: 0.6 });
      }
    } else if (edge.type === 'ceiling') {
      // ceiling glitch line
      const ox = rng.nextFloat(0, T), cy = (edge.row + 1) * T;
      gfx.rect(bx + ox, cy, rng.nextFloat(8, 20), 1.5);
      gfx.fill({ color: c, alpha: rng.nextFloat(0.4, 0.8) });
    } else if (edge.type === 'wall_left' || edge.type === 'wall_right') {
      // mal_broken_circuit: zigzag line
      const oy = rng.nextFloat(1, T - 4);
      let cx = wallX, cy = by + oy;
      gfx.moveTo(cx, cy);
      for (let s = 0; s < rng.nextInt(3, 5); s++) {
        cx += rng.nextFloat(3, 7) * dir;
        cy += rng.nextFloat(-3, 3);
        gfx.lineTo(cx, cy);
      }
      gfx.stroke({ width: 1, color: c });
    }
    // mal_spark_node on any edge type (separate check, not else-if)
    if (rng.next() < 0.3) {
      {
        const px = bx + rng.nextFloat(2, T - 2);
        const py = edge.type === 'floor' ? by - rng.nextFloat(2, 6) : (edge.row + 1) * T + rng.nextFloat(2, 6);
        gfx.circle(px, py, rng.nextFloat(1.5, 3)); gfx.fill({ color: 0xffaa44, alpha: 0.6 });
        for (let r = 0; r < 4; r++) {
          const angle = r * Math.PI / 2 + rng.nextFloat(-0.3, 0.3);
          const len = rng.nextFloat(3, 6);
          gfx.moveTo(px, py); gfx.lineTo(px + Math.cos(angle) * len, py + Math.sin(angle) * len);
          gfx.stroke({ width: 0.5, color: 0xffaa44 });
        }
      }
    }  // end spark_node
    if (edge.type === 'wall_left' || edge.type === 'wall_right') {
      if (rng.next() < 0.2) {
        // mal_error_glyph: rect + X
        const oy = rng.nextFloat(2, T - 6);
        const s = rng.nextFloat(4, 7);
        gfx.rect(wallX + 1 * dir, by + oy, s * dir, s); gfx.stroke({ width: 1, color: c });
        gfx.moveTo(wallX + 1 * dir, by + oy); gfx.lineTo(wallX + (1 + s) * dir, by + oy + s);
        gfx.moveTo(wallX + (1 + s) * dir, by + oy); gfx.lineTo(wallX + 1 * dir, by + oy + s);
        gfx.stroke({ width: 0.7, color: c });
      }
    }
  }

  private stMalfunction(gfx: Graphics, edge: EdgeTile, rng: PRNG): void {
    const { T, bx, by, wallX, dir } = this.ex(edge);
    const c = this.cSteel;
    if (edge.type === 'wall_left' || edge.type === 'wall_right') {
      // mal_twisted_panel: deformed rect (random vertex offsets)
      const w = rng.nextFloat(8, 14), h = rng.nextFloat(10, 18);
      const oy = rng.nextFloat(0, T - 4);
      const d = (n: number) => rng.nextFloat(-n, n);
      gfx.poly([
        wallX + 1 * dir + d(2), by + oy + d(2),
        wallX + (1 + w) * dir + d(2), by + oy + d(2),
        wallX + (1 + w) * dir + d(3), by + oy + h + d(2),
        wallX + 1 * dir + d(2), by + oy + h + d(3),
      ]);
      gfx.stroke({ width: 1.5, color: c });
    } else if (edge.type === 'floor') {
      // mal_overload_cap: rect + radial circle
      const s = rng.nextFloat(5, 9);
      const ox = rng.nextFloat(2, T - 2);
      gfx.rect(bx + ox - s / 2, by - s, s, s); gfx.fill(c);
      gfx.circle(bx + ox, by - s / 2, s * 0.6); gfx.stroke({ width: 1, color: 0xaa5533 });
    } else if (edge.type === 'ceiling') {
      // ceiling warped panel
      const cy = (edge.row + 1) * T;
      const w = rng.nextFloat(8, 16);
      const d2 = (n: number) => rng.nextFloat(-n, n);
      gfx.poly([bx + d2(2), cy, bx + w + d2(2), cy + d2(2), bx + w + d2(3), cy + rng.nextFloat(4, 8), bx + d2(2), cy + rng.nextFloat(4, 8)]);
      gfx.stroke({ width: 1.5, color: c });
    }
  }

  // =========================================================================
  // T-BREACH: structural collapse
  // =========================================================================

  private dtBreach(gfx: Graphics, edge: EdgeTile, rng: PRNG): void {
    const { T, bx, by } = this.ex(edge);
    if (edge.type === 'ceiling') {
      // bre_dust_fall: thin vertical lines (falling dust)
      const n = rng.nextInt(3, 6);
      const cy = (edge.row + 1) * T;
      for (let i = 0; i < n; i++) {
        const ox = rng.nextFloat(1, T - 1);
        gfx.moveTo(bx + ox, cy); gfx.lineTo(bx + ox + rng.nextFloat(-1, 1), cy + rng.nextFloat(5, 14));
        gfx.stroke({ width: 0.5, color: this.cHangerColor });
      }
    } else {
      // bre_crack_line: branching crack (any edge)
      const startX = bx + rng.nextFloat(2, T - 2);
      const startY = edge.type === 'floor' ? by : (edge.row + 1) * T;
      let cx = startX, cy = startY;
      const segs = rng.nextInt(3, 5);
      gfx.moveTo(cx, cy);
      for (let s = 0; s < segs; s++) {
        cx += rng.nextFloat(-5, 5);
        cy += (edge.type === 'floor' ? -1 : 1) * rng.nextFloat(2, 5);
        gfx.lineTo(cx, cy);
        // Branch
        if (rng.next() < 0.4) {
          const bex = cx + rng.nextFloat(-4, 4), bey = cy + rng.nextFloat(-3, 3);
          gfx.moveTo(cx, cy); gfx.lineTo(bex, bey);
          gfx.moveTo(cx, cy); // return
        }
      }
      gfx.stroke({ width: 1, color: this.cRebar });
    }
  }

  private stBreach(gfx: Graphics, edge: EdgeTile, rng: PRNG): void {
    const { T, bx, by, cy } = this.ex(edge);
    const c = this.cSteel;
    if (edge.type === 'wall_left' || edge.type === 'wall_right') {
      // bre_shattered_wall: large irregular polygon
      const { wallX, dir } = this.ex(edge);
      const pts: number[] = [];
      const n = rng.nextInt(5, 8);
      for (let i = 0; i < n; i++) {
        pts.push(wallX + rng.nextFloat(0, 16) * dir, by + rng.nextFloat(0, T));
      }
      gfx.poly(pts); gfx.fill(this.cConcrete);
    } else if (edge.type === 'ceiling') {
      // bre_hanging_slab: rect + hanging line
      const w = rng.nextFloat(8, 16), h = rng.nextFloat(4, 8);
      const ox = rng.nextFloat(0, T);
      gfx.rect(bx + ox, cy, w, h); gfx.fill(c);
      gfx.moveTo(bx + ox + w / 2, cy); gfx.lineTo(bx + ox + w / 2 + rng.nextFloat(-2, 2), cy - rng.nextFloat(4, 10));
      gfx.stroke({ width: 1, color: c });
    } else if (edge.type === 'floor') {
      // bre_rubble_pile: cluster of small polygons
      const n = rng.nextInt(4, 7);
      for (let i = 0; i < n; i++) {
        const ox = rng.nextFloat(0, T), s = rng.nextFloat(2, 5);
        gfx.poly([bx + ox, by, bx + ox + s, by - s * 0.6, bx + ox + s * 1.5, by - s * 0.3, bx + ox + s * 1.5, by]);
        gfx.fill(this.cConcrete);
      }
    }
  }

  // =========================================================================
  // T-COOLANT: pipes and condensation
  // =========================================================================

  private dtCoolant(gfx: Graphics, edge: EdgeTile, rng: PRNG): void {
    const { T, bx, by, wallX, dir } = this.ex(edge);
    if (edge.type === 'wall_left' || edge.type === 'wall_right') {
      // cool_condensation: tiny water droplets on wall
      const n = rng.nextInt(5, 10);
      for (let i = 0; i < n; i++) {
        gfx.circle(wallX + rng.nextFloat(0, 3) * dir, by + rng.nextFloat(0, T), rng.nextFloat(0.5, 1.2));
        gfx.fill({ color: this.cHangerDrip, alpha: 0.5 });
      }
    } else if (edge.type === 'floor') {
      // cool_frost_patch: translucent irregular shape
      const w = rng.nextFloat(6, 14), h = rng.nextFloat(2, 5);
      const ox = rng.nextFloat(0, T);
      gfx.poly([bx + ox, by, bx + ox + w * 0.3, by - h, bx + ox + w * 0.7, by - h * 0.8, bx + ox + w, by]);
      gfx.fill({ color: this.cGrowerColor, alpha: 0.6 });
    } else if (edge.type === 'ceiling') {
      // cool_drip_line: thin line + droplet at end
      const ox = rng.nextFloat(2, T - 2), cy = (edge.row + 1) * T;
      const len = rng.nextFloat(5, 12);
      gfx.moveTo(bx + ox, cy); gfx.lineTo(bx + ox, cy + len);
      gfx.stroke({ width: 0.7, color: this.cHangerDrip });
      gfx.circle(bx + ox, cy + len + 1.5, 1.2); gfx.fill(this.cHangerDrip);
    }
  }

  private stCoolant(gfx: Graphics, edge: EdgeTile, rng: PRNG): void {
    const { T, bx, by, wallX, dir } = this.ex(edge);
    const c = this.cSteel;
    if (edge.type === 'wall_left' || edge.type === 'wall_right') {
      if (rng.next() < 0.5) {
        // cool_coil_segment: spiral arcs
        const oy = rng.nextFloat(2, T - 8);
        for (let a = 0; a < 3; a++) {
          const ay = by + oy + a * 5;
          gfx.arc(wallX + 4 * dir, ay, 4, a % 2 === 0 ? -Math.PI / 2 : Math.PI / 2, a % 2 === 0 ? Math.PI / 2 : -Math.PI / 2);
          gfx.stroke({ width: 1.5, color: c });
        }
      } else {
        // cool_valve_cluster: circle + cross handle
        const oy = rng.nextFloat(3, T - 5);
        const r = rng.nextFloat(3, 5);
        gfx.circle(wallX + (r + 2) * dir, by + oy, r); gfx.stroke({ width: 1, color: c });
        gfx.moveTo(wallX + (r + 2) * dir - r * 0.7, by + oy); gfx.lineTo(wallX + (r + 2) * dir + r * 0.7, by + oy);
        gfx.moveTo(wallX + (r + 2) * dir, by + oy - r * 0.7); gfx.lineTo(wallX + (r + 2) * dir, by + oy + r * 0.7);
        gfx.stroke({ width: 1, color: c });
      }
    } else if (edge.type === 'floor') {
      const w = rng.nextFloat(10, 18), h = rng.nextFloat(6, 12);
      gfx.roundRect(bx + rng.nextFloat(0, T), by - h, w, h, 3); gfx.stroke({ width: 1.5, color: c });
    } else if (edge.type === 'ceiling') {
      // ceiling coolant pipe — DISABLED (spawn rate 0)
      // const cy = (edge.row + 1) * T;
      // const len = rng.nextFloat(16, 32);
      // gfx.roundRect(bx + rng.nextFloat(0, T), cy, len, 4, 2); gfx.fill(c);
    }
  }

  // =========================================================================
  // T-ECHO: abstract memory space
  // =========================================================================

  private dtEcho(gfx: Graphics, edge: EdgeTile, rng: PRNG): void {
    const { T, bx, by, wallX, dir } = this.ex(edge);
    const c = this.cGrowerColor;
    if (edge.type === 'ceiling') {
      if (rng.next() < 0.5) {
        // echo_float_shard: glowing polygon
        const cx = bx + rng.nextFloat(2, T - 2), cy = (edge.row + 1) * T + rng.nextFloat(4, 14);
        const s = rng.nextFloat(2, 5);
        gfx.poly([cx, cy - s, cx + s, cy, cx + s * 0.5, cy + s, cx - s * 0.5, cy + s, cx - s, cy]);
        gfx.fill({ color: c, alpha: 0.5 });
      } else {
        // echo_void_tendril: long curved line
        const ox = rng.nextFloat(2, T - 2), cy = (edge.row + 1) * T;
        const len = rng.nextFloat(20, 40);
        const drift = rng.nextFloat(-10, 10);
        gfx.moveTo(bx + ox, cy);
        gfx.bezierCurveTo(bx + ox + drift * 0.3, cy + len * 0.3, bx + ox + drift * 0.7, cy + len * 0.6, bx + ox + drift, cy + len);
        gfx.stroke({ width: 1, color: this.cHangerColor });
      }
    } else if (edge.type === 'wall_left' || edge.type === 'wall_right') {
      // echo_glitch_stripe: horizontal glowing thin rect
      const oy = rng.nextFloat(1, T - 2);
      const w = rng.nextFloat(6, 16);
      gfx.rect(wallX, by + oy, w * dir, 1.5);
      gfx.fill({ color: c, alpha: rng.nextFloat(0.2, 0.8) });
    } else {
      // echo_data_dust: many tiny translucent circles
      const n = rng.nextInt(8, 16);
      const cy = edge.type === 'floor' ? by : (edge.row + 1) * T;
      for (let i = 0; i < n; i++) {
        gfx.circle(bx + rng.nextFloat(-4, T + 4), cy + rng.nextFloat(-8, 8), rng.nextFloat(0.3, 1));
        gfx.fill({ color: c, alpha: 0.5 });
      }
    }
  }

  private stEcho(gfx: Graphics, edge: EdgeTile, rng: PRNG): void {
    const { T, bx, by, wallX, dir } = this.ex(edge);
    if (edge.type === 'floor') {
      // echo_resonance_crystal: hexagon
      const ox = rng.nextFloat(3, T - 3);
      const r = rng.nextFloat(4, 8);
      const pts: number[] = [];
      for (let a = 0; a < 6; a++) {
        const angle = a * Math.PI / 3 - Math.PI / 6;
        pts.push(bx + ox + Math.cos(angle) * r, by - r + Math.sin(angle) * r);
      }
      gfx.poly(pts); gfx.fill({ color: this.cGrowerColor, alpha: 0.4 });
      gfx.poly(pts); gfx.stroke({ width: 1, color: this.cSteel });
    } else if (edge.type === 'wall_left' || edge.type === 'wall_right') {
      // echo_memory_node: large glowing circle + radial lines
      const oy = rng.nextFloat(3, T - 5);
      const r = rng.nextFloat(4, 8);
      gfx.circle(wallX + (r + 2) * dir, by + oy, r);
      gfx.fill({ color: this.cGrowerColor, alpha: 0.3 });
      gfx.circle(wallX + (r + 2) * dir, by + oy, r);
      gfx.stroke({ width: 1, color: this.cSteel });
      for (let l = 0; l < 4; l++) {
        const angle = l * Math.PI / 2 + rng.nextFloat(-0.2, 0.2);
        const len = r + rng.nextFloat(3, 6);
        gfx.moveTo(wallX + (r + 2) * dir, by + oy);
        gfx.lineTo(wallX + (r + 2) * dir + Math.cos(angle) * len, by + oy + Math.sin(angle) * len);
        gfx.stroke({ width: 0.5, color: this.cSteel });
      }
    } else if (edge.type === 'ceiling') {
      // ceiling echo fragment
      const cy = (edge.row + 1) * T;
      const ox = rng.nextFloat(2, T - 2);
      const s = rng.nextFloat(3, 6);
      gfx.poly([bx + ox, cy, bx + ox + s, cy + s * 0.8, bx + ox - s * 0.5, cy + s]);
      gfx.fill({ color: this.cGrowerColor, alpha: 0.35 });
      gfx.stroke({ width: 0.8, color: this.cSteel });
    }
  }

  // =========================================================================
  // Spanning decorations — large elements bridging open spaces
  // =========================================================================

  /**
   * Scan grid for vertical drops (ceiling→floor) and horizontal gaps (wall→wall).
   * Draw large spanning decorations appropriate to the theme.
   */
  private generateSpans(gfx: Graphics, grid: number[][], rng: PRNG): void {
    const T = this.cfg.tileSize;
    const rows = grid.length;
    const cols = grid[0]?.length ?? 0;
    let spanCount = 0;
    const maxSpans = 10;

    // Vertical spans: find ceiling edges and measure drop to floor
    for (let col = 0; col < cols && spanCount < maxSpans; col += rng.nextInt(4, 8)) {
      for (let row = 0; row < rows && spanCount < maxSpans; row++) {
        if (!isSolid(gridAt(grid, row, col)) || !isEmpty(gridAt(grid, row + 1, col))) continue;
        let drop = 0;
        for (let r = row + 1; r < rows && isEmpty(gridAt(grid, r, col)); r++) drop++;
        if (drop < 3 || drop > 30) continue;
        if (rng.next() > 0.06) continue; // Very sparse

        const x = col * T + T / 2;
        const y0 = (row + 1) * T; // ceiling
        const y1 = (row + 1 + drop) * T; // floor
        this.drawVerticalSpan(gfx, x, y0, y1, rng);
        spanCount++;
      }
    }

    // Horizontal spans: find left wall edges and measure gap to right wall
    for (let row = 0; row < rows && spanCount < maxSpans; row += rng.nextInt(4, 8)) {
      for (let col = 0; col < cols && spanCount < maxSpans; col++) {
        if (!isSolid(gridAt(grid, row, col)) || !isEmpty(gridAt(grid, row, col + 1))) continue;
        let gap = 0;
        for (let c = col + 1; c < cols && isEmpty(gridAt(grid, row, c)); c++) gap++;
        if (gap < 4 || gap > 40) continue;
        if (rng.next() > 0.04) continue; // Very sparse

        const x0 = (col + 1) * T;
        const x1 = (col + 1 + gap) * T;
        const y = row * T + T / 2;
        this.drawHorizontalSpan(gfx, x0, x1, y, rng);
        spanCount++;
      }
    }
  }

  /** Draw a vertical spanning element (ceiling to floor). */
  private drawVerticalSpan(gfx: Graphics, x: number, y0: number, y1: number, rng: PRNG): void {
    const len = y1 - y0;
    switch (this.preset?.themeId) {
      case 'T-BIOZONE': this.spanBiozoneVert(gfx, x, y0, y1, len, rng); break;
      case 'T-HABITAT': this.spanHabitatVert(gfx, x, y0, y1, len, rng); break;
      case 'T-SECURITY': this.spanSecurityVert(gfx, x, y0, y1, len, rng); break;
      case 'T-FOUNDRY': this.spanFoundryVert(gfx, x, y0, y1, len, rng); break;
      case 'T-ARCHIVE': this.spanArchiveVert(gfx, x, y0, y1, len, rng); break;
      case 'T-LOGISTICS': this.spanLogisticsVert(gfx, x, y0, y1, len, rng); break;
      case 'T-COMMAND': this.spanCommandVert(gfx, x, y0, y1, len, rng); break;
      case 'T-MALFUNCTION': this.spanMalfunctionVert(gfx, x, y0, y1, len, rng); break;
      case 'T-BREACH': this.spanBreachVert(gfx, x, y0, y1, len, rng); break;
      case 'T-COOLANT': this.spanCoolantVert(gfx, x, y0, y1, len, rng); break;
      case 'T-ECHO': this.spanEchoVert(gfx, x, y0, y1, len, rng); break;
    }
  }

  /** Draw a horizontal spanning element (wall to wall). */
  private drawHorizontalSpan(gfx: Graphics, x0: number, x1: number, y: number, rng: PRNG): void {
    const len = x1 - x0;
    switch (this.preset?.themeId) {
      case 'T-BIOZONE': this.spanBiozoneHoriz(gfx, x0, x1, y, len, rng); break;
      case 'T-HABITAT': this.spanHabitatHoriz(gfx, x0, x1, y, len, rng); break;
      case 'T-SECURITY': this.spanSecurityHoriz(gfx, x0, x1, y, len, rng); break;
      case 'T-FOUNDRY': this.spanFoundryHoriz(gfx, x0, x1, y, len, rng); break;
      case 'T-ARCHIVE': this.spanArchiveHoriz(gfx, x0, x1, y, len, rng); break;
      case 'T-LOGISTICS': this.spanLogisticsHoriz(gfx, x0, x1, y, len, rng); break;
      case 'T-COMMAND': this.spanCommandHoriz(gfx, x0, x1, y, len, rng); break;
      case 'T-MALFUNCTION': this.spanMalfunctionHoriz(gfx, x0, x1, y, len, rng); break;
      case 'T-BREACH': this.spanBreachHoriz(gfx, x0, x1, y, len, rng); break;
      case 'T-COOLANT': this.spanCoolantHoriz(gfx, x0, x1, y, len, rng); break;
      case 'T-ECHO': this.spanEchoHoriz(gfx, x0, x1, y, len, rng); break;
    }
  }

  // --- BIOZONE: thick vines spanning wall-to-floor, wall-to-wall ---

  private spanBiozoneVert(gfx: Graphics, x: number, y0: number, y1: number, len: number, rng: PRNG): void {
    // Giant vine from ceiling to floor with branches
    const drift = rng.nextFloat(-len * 0.3, len * 0.3);
    const w = rng.nextFloat(3, 5);
    gfx.moveTo(x, y0);
    gfx.bezierCurveTo(x + drift * 0.3, y0 + len * 0.25, x + drift * 0.7, y0 + len * 0.6, x + drift, y1);
    gfx.stroke({ width: w, color: this.cHangerColor });
    // Branches with leaves at intervals
    const branches = rng.nextInt(3, 6);
    for (let b = 0; b < branches; b++) {
      const t = (b + 1) / (branches + 1);
      const bx = x + drift * t + rng.nextFloat(-4, 4);
      const by2 = y0 + len * t;
      const bdir = rng.next() < 0.5 ? -1 : 1;
      const blen = rng.nextFloat(8, 20);
      gfx.moveTo(bx, by2);
      gfx.lineTo(bx + blen * bdir, by2 + rng.nextFloat(-6, 6));
      gfx.stroke({ width: 2, color: this.cClingerColor });
      // Leaf
      const lx = bx + blen * bdir, ly = by2 + rng.nextFloat(-6, 6);
      gfx.poly([lx, ly - 3, lx + 5 * bdir, ly, lx, ly + 3]);
      gfx.fill(this.cGrowerColor);
    }
  }

  private spanBiozoneHoriz(gfx: Graphics, x0: number, x1: number, y: number, len: number, rng: PRNG): void {
    // Vine stretching wall to wall with sag
    const sag = rng.nextFloat(8, len * 0.3);
    const w = rng.nextFloat(2, 4);
    const segs = 12;
    gfx.moveTo(x0, y);
    for (let i = 1; i <= segs; i++) {
      const t = i / segs;
      const sx = x0 + len * t;
      const sy = y + 4 * sag * t * (1 - t) + rng.nextFloat(-3, 3);
      gfx.lineTo(sx, sy);
    }
    gfx.stroke({ width: w, color: this.cClingerColor });
    // Hanging leaves
    for (let l = 0; l < rng.nextInt(3, 6); l++) {
      const t = rng.nextFloat(0.1, 0.9);
      const lx = x0 + len * t;
      const ly = y + 4 * sag * t * (1 - t) + rng.nextFloat(2, 8);
      gfx.poly([lx - 2, ly, lx, ly + 6, lx + 2, ly]);
      gfx.fill(this.cGrowerColor);
    }
  }

  // --- HABITAT: cables and pipes spanning spaces ---

  private spanHabitatVert(_gfx: Graphics, _x: number, _y0: number, _y1: number, _len: number, _rng: PRNG): void {
    // Vertical pipe run with brackets — DISABLED (pipes spawn rate 0)
    // const px = x + rng.nextFloat(-4, 4);
    // gfx.moveTo(px, y0); gfx.lineTo(px, y1);
    // gfx.stroke({ width: 3, color: this.cSteel });
    // // Brackets every ~24px
    // for (let b = y0 + 16; b < y1 - 8; b += rng.nextFloat(16, 28)) {
    //   gfx.moveTo(px - 6, b); gfx.lineTo(px, b); gfx.lineTo(px, b + 4); gfx.lineTo(px - 6, b + 4);
    //   gfx.stroke({ width: 1.5, color: this.cConcrete });
    // }
  }

  private spanHabitatHoriz(gfx: Graphics, x0: number, x1: number, y: number, len: number, rng: PRNG): void {
    // Horizontal cable bundle (3 wires with slight sag)
    for (let w = 0; w < 3; w++) {
      const wy = y + w * 3 - 3;
      const sag = rng.nextFloat(4, 12);
      const segs = 8;
      gfx.moveTo(x0, wy);
      for (let i = 1; i <= segs; i++) {
        const t = i / segs;
        gfx.lineTo(x0 + len * t, wy + 4 * sag * t * (1 - t));
      }
      gfx.stroke({ width: 1.5, color: this.cSteel });
    }
  }

  // --- SECURITY: laser grid / barrier lines ---

  private spanSecurityVert(gfx: Graphics, x: number, y0: number, y1: number, _len: number, rng: PRNG): void {
    // Vertical laser beam
    gfx.moveTo(x, y0); gfx.lineTo(x, y1);
    gfx.stroke({ width: 1.5, color: this.cGrowerColor });
    // Emitter/receiver dots
    gfx.circle(x, y0 + 2, 3); gfx.fill({ color: 0xee4444, alpha: 0.6 });
    gfx.circle(x, y1 - 2, 3); gfx.fill({ color: 0xee4444, alpha: 0.6 });
  }

  private spanSecurityHoriz(gfx: Graphics, x0: number, x1: number, y: number, _len: number, rng: PRNG): void {
    // Horizontal laser grid (2-3 parallel beams)
    const beams = rng.nextInt(2, 3);
    for (let b = 0; b < beams; b++) {
      const by2 = y + (b - 1) * rng.nextFloat(6, 10);
      gfx.moveTo(x0, by2); gfx.lineTo(x1, by2);
      gfx.stroke({ width: 1, color: this.cGrowerColor });
    }
    gfx.circle(x0 + 2, y, 3); gfx.fill({ color: 0xee4444, alpha: 0.6 });
    gfx.circle(x1 - 2, y, 3); gfx.fill({ color: 0xee4444, alpha: 0.6 });
  }

  // --- FOUNDRY: chains and hooks ---

  private spanFoundryVert(gfx: Graphics, x: number, y0: number, y1: number, len: number, rng: PRNG): void {
    // 3/4 chance to skip — reduce wire density
    if (rng.next() < 0.75) return;
    // Heavy chain with hook at bottom
    const segs = Math.max(4, Math.floor(len / 8));
    for (let i = 0; i < segs; i++) {
      const sy = y0 + (len / segs) * i;
      const ey = sy + len / segs;
      gfx.rect(x - 2, sy, 4, (ey - sy) * 0.6); gfx.fill(this.cSteel);
    }
    // Hook at bottom
    gfx.arc(x, y1 - 8, 6, 0, Math.PI); gfx.stroke({ width: 3, color: this.cRebar });
  }

  private spanFoundryHoriz(gfx: Graphics, x0: number, x1: number, y: number, len: number, rng: PRNG): void {
    if (rng.next() < 0.75) return;
    // Catenary chain
    const sag = rng.nextFloat(10, len * 0.25);
    const segs = 10;
    gfx.moveTo(x0, y);
    for (let i = 1; i <= segs; i++) {
      const t = i / segs;
      gfx.lineTo(x0 + len * t, y + 4 * sag * t * (1 - t));
    }
    gfx.stroke({ width: 3, color: this.cSteel });
  }

  // --- ARCHIVE: data streams ---

  private spanArchiveVert(gfx: Graphics, x: number, y0: number, y1: number, _len: number, rng: PRNG): void {
    // Vertical data stream (dotted glowing line)
    const c = this.cGrowerColor;
    for (let dy = y0; dy < y1; dy += rng.nextFloat(4, 8)) {
      gfx.rect(x - 1, dy, 2, 3); gfx.fill({ color: c, alpha: rng.nextFloat(0.3, 0.8) });
    }
  }

  private spanArchiveHoriz(gfx: Graphics, x0: number, x1: number, y: number, len: number, rng: PRNG): void {
    // Horizontal cable bundle
    for (let w = 0; w < rng.nextInt(2, 4); w++) {
      const wy = y + w * 2 - 2;
      gfx.moveTo(x0, wy); gfx.lineTo(x1, wy);
      gfx.stroke({ width: 1, color: this.cConcrete });
    }
  }

  // --- LOGISTICS: crane rails ---

  private spanLogisticsVert(gfx: Graphics, x: number, y0: number, y1: number, _len: number, rng: PRNG): void {
    // Vertical rail
    gfx.moveTo(x, y0); gfx.lineTo(x, y1);
    gfx.stroke({ width: 3, color: this.cSteel });
    for (let b = y0 + 12; b < y1; b += 12) { gfx.rect(x - 4, b, 8, 2); gfx.fill(this.cSteel); }
  }

  private spanLogisticsHoriz(gfx: Graphics, x0: number, x1: number, y: number, _len: number, rng: PRNG): void {
    // Horizontal crane rail with I-beam profile
    gfx.moveTo(x0, y); gfx.lineTo(x1, y); gfx.stroke({ width: 4, color: this.cSteel });
    gfx.rect(x0, y - 3, x1 - x0, 2); gfx.fill(this.cSteel);
    gfx.rect(x0, y + 1, x1 - x0, 2); gfx.fill(this.cSteel);
  }

  // --- COMMAND: antenna / comm lines ---

  private spanCommandVert(gfx: Graphics, x: number, y0: number, y1: number, _len: number, rng: PRNG): void {
    gfx.moveTo(x, y0); gfx.lineTo(x, y1); gfx.stroke({ width: 2, color: this.cSteel });
    // Signal rings
    for (let r = 0; r < 3; r++) {
      const ry = y0 + (y1 - y0) * (r + 1) / 4;
      gfx.circle(x, ry, 4 + r * 2); gfx.stroke({ width: 0.8, color: this.cGrowerColor });
    }
  }

  private spanCommandHoriz(gfx: Graphics, x0: number, x1: number, y: number, _len: number, rng: PRNG): void {
    gfx.moveTo(x0, y); gfx.lineTo(x1, y); gfx.stroke({ width: 1.5, color: this.cSteel });
  }

  // --- MALFUNCTION: glitch lines ---

  private spanMalfunctionVert(gfx: Graphics, x: number, y0: number, y1: number, len: number, rng: PRNG): void {
    // Zigzag glitch line
    let cy = y0, cx = x;
    gfx.moveTo(cx, cy);
    while (cy < y1) {
      cx += rng.nextFloat(-10, 10);
      cy += rng.nextFloat(6, 14);
      gfx.lineTo(cx, Math.min(cy, y1));
    }
    gfx.stroke({ width: 2, color: this.cGrowerColor });
  }

  private spanMalfunctionHoriz(gfx: Graphics, x0: number, x1: number, y: number, _len: number, rng: PRNG): void {
    let cx = x0, cy = y;
    gfx.moveTo(cx, cy);
    while (cx < x1) {
      cy += rng.nextFloat(-8, 8);
      cx += rng.nextFloat(6, 14);
      gfx.lineTo(Math.min(cx, x1), cy);
    }
    gfx.stroke({ width: 2, color: this.cGrowerColor });
  }

  // --- BREACH: structural crack lines ---

  private spanBreachVert(gfx: Graphics, x: number, y0: number, y1: number, len: number, rng: PRNG): void {
    // DLA-style branching crack from ceiling to floor
    crack(gfx, x, y0, Math.PI / 2, len, this.cRebar, 2.5, 3, rng);
  }

  private spanBreachHoriz(gfx: Graphics, x0: number, x1: number, y: number, _len: number, rng: PRNG): void {
    crack(gfx, x0, y, 0, x1 - x0, this.cRebar, 2.5, 2, rng);
  }

  // --- COOLANT: drip lines / condensation streaks ---

  private spanCoolantVert(_gfx: Graphics, _x: number, _y0: number, _y1: number, _len: number, _rng: PRNG): void {
    // Vertical pipe with condensation drips — DISABLED (pipes spawn rate 0)
    // gfx.moveTo(x, y0); gfx.lineTo(x, y1); gfx.stroke({ width: 3, color: this.cSteel });
    // for (let d = y0 + 8; d < y1; d += rng.nextFloat(10, 20)) {
    //   gfx.circle(x + rng.nextFloat(-4, 4), d, 1.5); gfx.fill(this.cHangerDrip);
    // }
  }

  private spanCoolantHoriz(_gfx: Graphics, _x0: number, _x1: number, _y: number, _len: number, _rng: PRNG): void {
    // Horizontal pipe with joints — DISABLED (pipes spawn rate 0)
    // gfx.moveTo(x0, y); gfx.lineTo(x1, y); gfx.stroke({ width: 3, color: this.cSteel });
    // for (let j = x0 + 20; j < x1 - 10; j += rng.nextFloat(20, 36)) {
    //   gfx.rect(j - 1, y - 4, 3, 8); gfx.fill(this.cSteel);
    // }
  }

  // --- ECHO: void tendrils / resonance lines ---

  private spanEchoVert(gfx: Graphics, x: number, y0: number, y1: number, len: number, rng: PRNG): void {
    // Undulating tendril
    const drift = rng.nextFloat(-len * 0.2, len * 0.2);
    gfx.moveTo(x, y0);
    gfx.bezierCurveTo(x + drift, y0 + len * 0.33, x - drift, y0 + len * 0.66, x, y1);
    gfx.stroke({ width: 2, color: this.cHangerColor });
    // Glow nodes along tendril
    for (let n = 0; n < 3; n++) {
      const t = (n + 1) / 4;
      const ny = y0 + len * t;
      gfx.circle(x + drift * Math.sin(t * Math.PI), ny, 3);
      gfx.fill({ color: this.cGrowerColor, alpha: 0.4 });
    }
  }

  private spanEchoHoriz(gfx: Graphics, x0: number, x1: number, y: number, len: number, rng: PRNG): void {
    const drift = rng.nextFloat(-20, 20);
    gfx.moveTo(x0, y);
    gfx.bezierCurveTo(x0 + len * 0.33, y + drift, x0 + len * 0.66, y - drift, x1, y);
    gfx.stroke({ width: 1.5, color: this.cHangerColor });
  }

  // =========================================================================
  // PASS 1: Surface Overlay — erosion/rust/stains on tile edges
  // =========================================================================

  private passSurfaceOverlay(gfx: Graphics, edges: EdgeTile[], rng: PRNG): void {
    const T = this.cfg.tileSize;
    let count = 0;
    const max = 150;
    const theme = this.preset?.themeId ?? '';
    for (const edge of edges) {
      if (count >= max) break;
      if (rng.next() > 0.25) continue;
      const { bx, by, wallX, dir, cy } = this.ex(edge);
      const w = rng.nextFloat(8, 24), ox = rng.nextFloat(0, T);

      switch (theme) {
        case 'T-FOUNDRY': // Rust bloom + drip streaks
          if (edge.type === 'floor') {
            rustBloom(gfx, bx + ox + w / 2, by - 2, rng.nextFloat(4, 8), 3, this.cRebar, rng);
          } else if (edge.type === 'wall_left' || edge.type === 'wall_right') {
            dripTrail(gfx, wallX + 2 * dir, by + ox, by + ox + rng.nextFloat(10, 24),
              this.cRebar, 3, 1.5, 0.3, rng);
          } else {
            dripTrail(gfx, bx + ox, cy, cy + rng.nextFloat(4, 10),
              this.cRebar, 2, 1, 0.25, rng);
          } break;
        case 'T-BREACH': // DLA crack network
          if (edge.type === 'floor' || edge.type === 'ceiling') {
            const sy2 = edge.type === 'floor' ? by : cy;
            const crackDir = edge.type === 'floor' ? -Math.PI / 2 : Math.PI / 2;
            crack(gfx, bx + ox, sy2, crackDir, rng.nextFloat(8, 18), this.cRebar, 1.5, 2, rng);
          } else {
            crack(gfx, wallX, by + ox, dir > 0 ? 0 : Math.PI, rng.nextFloat(6, 14), this.cRebar, 1.5, 1, rng);
          } break;
        case 'T-COOLANT': // Condensation drip trails
          if (edge.type === 'ceiling') {
            for (let d = 0; d < rng.nextInt(2, 4); d++) {
              const dx = bx + rng.nextFloat(0, T);
              dripTrail(gfx, dx, cy, cy + rng.nextFloat(8, 20), this.cHangerDrip, 1.5, 1.5, 0.3, rng);
            }
          } else if (edge.type === 'floor') {
            mossCluster(gfx, bx + ox, by - 1, rng.nextFloat(4, 10), 6, this.cHangerDrip, 0.7, rng);
          } else {
            dripTrail(gfx, wallX + 1 * dir, by + ox, by + ox + rng.nextFloat(8, 20),
              this.cHangerDrip, 1, 1, 0.25, rng);
          } break;
        case 'T-MALFUNCTION': // Horizontal glitch stripes
          for (let s = 0; s < rng.nextInt(2, 5); s++) {
            const gy = edge.type === 'floor' ? by - rng.nextFloat(0, 3) : edge.type === 'ceiling' ? cy + rng.nextFloat(0, 3) : by + rng.nextFloat(0, T);
            const gx = edge.type === 'wall_left' || edge.type === 'wall_right' ? wallX : bx;
            gfx.rect(gx + rng.nextFloat(-2, 2), gy, rng.nextFloat(6, 20), rng.nextFloat(1, 2.5));
            gfx.fill({ color: this.cGrowerColor, alpha: rng.nextFloat(0.2, 0.6) });
          } break;
        case 'T-BIOZONE': // Organic film + spore residue
          if (edge.type === 'wall_left' || edge.type === 'wall_right') {
            gfx.rect(wallX, by + rng.nextFloat(0, T - 4), rng.nextFloat(3, 8) * dir, rng.nextFloat(6, 16));
            gfx.fill({ color: this.cClingerColor, alpha: 0.25 });
          } else {
            const n = rng.nextInt(3, 7);
            const sy = edge.type === 'floor' ? by : cy;
            for (let i = 0; i < n; i++) {
              gfx.circle(bx + rng.nextFloat(0, T), sy + rng.nextFloat(-3, 3), rng.nextFloat(1, 3));
              gfx.fill({ color: this.cGrowerColor, alpha: 0.2 });
            }
          } break;
        case 'T-HABITAT': // Water stains + scuff marks
          if (edge.type === 'floor') {
            gfx.circle(bx + ox, by - 1, rng.nextFloat(4, 10));
            gfx.fill({ color: this.cHangerColor, alpha: 0.15 });
            // Scuff line
            gfx.moveTo(bx + ox - 3, by - 1); gfx.lineTo(bx + ox + rng.nextFloat(6, 14), by - 1);
            gfx.stroke({ width: 1, color: this.cConcrete });
          } else if (edge.type === 'wall_left' || edge.type === 'wall_right') {
            // Handprint/scuff
            gfx.circle(wallX + 3 * dir, by + rng.nextFloat(2, T - 2), rng.nextFloat(2, 4));
            gfx.fill({ color: this.cConcrete, alpha: 0.2 });
          } else {
            gfx.moveTo(bx + ox, cy); gfx.lineTo(bx + ox + rng.nextFloat(-2, 2), cy + rng.nextFloat(3, 8));
            gfx.stroke({ width: 1, color: this.cConcrete });
          } break;
        case 'T-SECURITY': // Clean scuff + boot marks
          if (edge.type === 'floor') {
            gfx.moveTo(bx + ox, by - 0.5); gfx.lineTo(bx + ox + rng.nextFloat(4, 10), by - 0.5);
            gfx.stroke({ width: 1.5, color: 0x2a2a2a });
          } break;
        case 'T-ARCHIVE': // Static discharge marks
          if (edge.type === 'floor' || edge.type === 'ceiling') {
            const sy = edge.type === 'floor' ? by : cy;
            let cx2 = bx + ox, cy2 = sy;
            gfx.moveTo(cx2, cy2);
            for (let s = 0; s < 3; s++) { cx2 += rng.nextFloat(3, 6); cy2 += rng.nextFloat(-2, 2); gfx.lineTo(cx2, cy2); }
            gfx.stroke({ width: 0.8, color: this.cGrowerColor });
          } break;
        case 'T-LOGISTICS': // Oil/grease stains
          if (edge.type === 'floor') {
            gfx.circle(bx + ox, by - 1, rng.nextFloat(3, 8));
            gfx.fill({ color: 0x1a1a10, alpha: 0.2 });
          } else if (edge.type === 'wall_left' || edge.type === 'wall_right') {
            gfx.moveTo(wallX + 1 * dir, by + rng.nextFloat(0, T));
            gfx.lineTo(wallX + 1 * dir, by + rng.nextFloat(0, T) + rng.nextFloat(4, 10));
            gfx.stroke({ width: 2, color: 0x1a1a10 });
          } break;
        case 'T-COMMAND': // Faint holographic scan lines
          if (edge.type === 'wall_left' || edge.type === 'wall_right') {
            for (let l = 0; l < rng.nextInt(2, 4); l++) {
              const ly = by + rng.nextFloat(0, T);
              gfx.moveTo(wallX, ly); gfx.lineTo(wallX + rng.nextFloat(4, 10) * dir, ly);
              gfx.stroke({ width: 0.5, color: this.cGrowerColor });
            }
          } break;
        case 'T-ECHO': // Resonance ripple marks
          if (edge.type === 'floor' || edge.type === 'ceiling') {
            const sy = edge.type === 'floor' ? by : cy;
            for (let r = 0; r < 3; r++) {
              gfx.circle(bx + ox, sy, 3 + r * 4);
              gfx.stroke({ width: 0.5, color: this.cGrowerColor });
            }
          } else {
            gfx.circle(wallX + 3 * dir, by + rng.nextFloat(2, T - 2), rng.nextFloat(3, 6));
            gfx.stroke({ width: 0.5, color: this.cGrowerColor });
          } break;
      }
      count++;
    }
  }

  // =========================================================================
  // PASS 4: Embedded — structures piercing through solid walls
  // =========================================================================

  private passEmbedded(gfx: Graphics, grid: number[][], rng: PRNG): void {
    const T = this.cfg.tileSize;
    const rows = grid.length;
    const cols = grid[0]?.length ?? 0;
    let count = 0;
    const max = 60;
    const theme = this.preset?.themeId ?? '';

    for (let row = 1; row < rows - 1 && count < max; row++) {
      for (let col = 1; col < cols - 1 && count < max; col++) {
        // Only inside solid tiles surrounded by solid on at least 2 sides
        if (!isSolid(gridAt(grid, row, col))) continue;
        const solidNeighbors =
          (isSolid(gridAt(grid, row - 1, col)) ? 1 : 0) +
          (isSolid(gridAt(grid, row + 1, col)) ? 1 : 0) +
          (isSolid(gridAt(grid, row, col - 1)) ? 1 : 0) +
          (isSolid(gridAt(grid, row, col + 1)) ? 1 : 0);
        if (solidNeighbors < 2) continue;
        if (rng.next() > 0.12) continue; // Moderate density

        const cx = col * T + T / 2;
        const cy = row * T + T / 2;

        if (theme === 'T-HABITAT') {
          // Embedded horizontal pipe with valve
          const pipeLen = rng.nextFloat(28, 52);
          const pipeR = rng.nextFloat(2, 4);
          gfx.roundRect(cx - pipeLen / 2, cy - pipeR, pipeLen, pipeR * 2, pipeR);
          gfx.fill({ color: this.cSteel, alpha: 0.6 });
          for (let j = 0; j < 2; j++) { const jx = cx + rng.nextFloat(-pipeLen * 0.3, pipeLen * 0.3); gfx.rect(jx - 1, cy - pipeR - 1, 3, pipeR * 2 + 2); gfx.fill({ color: this.cSteel, alpha: 0.7 }); }
          // Small valve wheel
          gfx.circle(cx, cy, 4); gfx.stroke({ width: 1, color: this.cConcrete });
          gfx.moveTo(cx - 3, cy); gfx.lineTo(cx + 3, cy); gfx.stroke({ width: 1, color: this.cConcrete });
        } else if (theme === 'T-LOGISTICS') {
          // Embedded conveyor roller (horizontal cylinder + rotation lines)
          const rollerW = rng.nextFloat(24, 44);
          const rollerR = rng.nextFloat(3, 5);
          gfx.roundRect(cx - rollerW / 2, cy - rollerR, rollerW, rollerR * 2, rollerR);
          gfx.fill({ color: this.cConcrete, alpha: 0.5 });
          // Rotation lines inside roller
          for (let r = 0; r < 4; r++) {
            const rx = cx - rollerW / 2 + rollerW * (r + 1) / 5;
            gfx.moveTo(rx, cy - rollerR + 1); gfx.lineTo(rx + 2, cy + rollerR - 1);
            gfx.stroke({ width: 0.8, color: this.cSteel });
          }
        } else if (theme === 'T-FOUNDRY') {
          // Embedded gear outline
          const r = rng.nextFloat(5, 10);
          const teeth = rng.nextInt(6, 10);
          gfx.circle(cx, cy, r); gfx.stroke({ width: 1.5, color: this.cSteel });
          for (let t = 0; t < teeth; t++) {
            const a = (t / teeth) * Math.PI * 2;
            gfx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
            gfx.lineTo(cx + Math.cos(a) * (r + 3), cy + Math.sin(a) * (r + 3));
            gfx.stroke({ width: 2, color: this.cSteel });
          }
        } else if (theme === 'T-ARCHIVE') {
          // Embedded data conduit (thick cable bundle with sheath)
          const bundleW = rng.nextFloat(24, 44);
          const bundleH = rng.nextFloat(4, 7);
          gfx.rect(cx - bundleW / 2, cy - bundleH / 2, bundleW, bundleH);
          gfx.stroke({ width: 1, color: this.cSteel });
          // Internal cables
          for (let c = 0; c < rng.nextInt(4, 7); c++) {
            const cy2 = cy + (c - 3) * 1.5;
            gfx.moveTo(cx - bundleW / 2, cy2); gfx.lineTo(cx + bundleW / 2, cy2);
            gfx.stroke({ width: 0.7, color: this.cGrowerColor });
          }
          // Data pulse dots
          for (let d = 0; d < 3; d++) {
            gfx.circle(cx + rng.nextFloat(-bundleW * 0.3, bundleW * 0.3), cy, 1);
            gfx.fill({ color: this.cGrowerColor, alpha: 0.6 });
          }
        } else if (theme === 'T-COMMAND') {
          // Embedded communication bus (thick bar + branching taps)
          const busW = rng.nextFloat(20, 36);
          gfx.rect(cx - busW / 2, cy - 2, busW, 4); gfx.fill({ color: this.cSteel, alpha: 0.6 });
          // Taps branching off
          for (let t = 0; t < rng.nextInt(2, 4); t++) {
            const tx = cx + rng.nextFloat(-busW * 0.3, busW * 0.3);
            gfx.moveTo(tx, cy - 2); gfx.lineTo(tx, cy - rng.nextFloat(6, 12));
            gfx.stroke({ width: 1, color: this.cConcrete });
            gfx.circle(tx, cy - rng.nextFloat(6, 12), 1.5); gfx.fill({ color: this.cGrowerTip, alpha: 0.5 });
          }
        } else if (theme === 'T-BREACH') {
          // Exposed rebar sticking out of broken wall
          const bars = rng.nextInt(2, 4);
          for (let b = 0; b < bars; b++) {
            const angle = rng.nextFloat(0, Math.PI * 2);
            const len = rng.nextFloat(8, 18);
            gfx.moveTo(cx, cy);
            gfx.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len);
            gfx.stroke({ width: 2, color: this.cRebar });
          }
        } else if (theme === 'T-COOLANT') {
          // Embedded coolant pipe (vertical)
          const pipeH = rng.nextFloat(20, 40);
          const pipeR = rng.nextFloat(2, 4);
          gfx.roundRect(cx - pipeR, cy - pipeH / 2, pipeR * 2, pipeH, pipeR);
          gfx.fill({ color: this.cSteel, alpha: 0.5 });
        } else if (theme === 'T-BIOZONE') {
          // Root growing through wall
          const angle = rng.nextFloat(-0.5, 0.5);
          const len = rng.nextFloat(16, 32);
          gfx.moveTo(cx, cy);
          gfx.bezierCurveTo(cx + len * 0.3, cy + Math.sin(angle) * 10, cx + len * 0.7, cy + Math.sin(angle) * 6, cx + len, cy + Math.sin(angle) * 14);
          gfx.stroke({ width: rng.nextFloat(2, 4), color: this.cHangerColor });
        } else if (theme === 'T-SECURITY') {
          // Armored conduit with sensor nodes
          const condW = rng.nextFloat(20, 36);
          gfx.rect(cx - condW / 2, cy - 3, condW, 6); gfx.fill({ color: this.cSteel, alpha: 0.6 });
          // Sensor nodes at intervals
          for (let s = 0; s < 3; s++) {
            const sx = cx - condW * 0.3 + s * condW * 0.3;
            gfx.circle(sx, cy, 2); gfx.fill({ color: 0x4444ee, alpha: 0.5 });
          }
        } else if (theme === 'T-MALFUNCTION') {
          // Corrupted wiring knot (tangled lines radiating)
          const arms = rng.nextInt(4, 7);
          for (let a = 0; a < arms; a++) {
            const angle = rng.nextFloat(0, Math.PI * 2);
            const len = rng.nextFloat(6, 16);
            const mid = len * 0.5;
            gfx.moveTo(cx, cy);
            gfx.lineTo(cx + Math.cos(angle + 0.3) * mid, cy + Math.sin(angle + 0.3) * mid);
            gfx.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len);
            gfx.stroke({ width: 1.5, color: this.cGrowerColor });
          }
          // Sparking center
          gfx.circle(cx, cy, 3); gfx.fill({ color: 0xffaa44, alpha: 0.5 });
        } else if (theme === 'T-ECHO') {
          // Embedded resonance node (concentric rings + core)
          for (let r = 0; r < 3; r++) {
            gfx.circle(cx, cy, 3 + r * 4); gfx.stroke({ width: 0.8, color: this.cGrowerColor });
          }
          gfx.circle(cx, cy, 2); gfx.fill({ color: this.cGrowerColor, alpha: 0.5 });
        } else {
          // Generic: structural bolt cluster
          for (let b = 0; b < rng.nextInt(2, 4); b++) {
            gfx.circle(cx + rng.nextFloat(-4, 4), cy + rng.nextFloat(-4, 4), rng.nextFloat(1.5, 3));
            gfx.fill({ color: this.cSteel, alpha: 0.5 });
          }
        }
        count++;
      }
    }
  }

  // =========================================================================
  // Void scanner — find large empty regions
  // =========================================================================

  private scanVoids(grid: number[][]): { x: number; y: number; w: number; h: number }[] {
    const rows = grid.length;
    const cols = grid[0]?.length ?? 0;
    const visited = new Uint8Array(rows * cols);
    const regions: { x: number; y: number; w: number; h: number }[] = [];

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (visited[row * cols + col] || !isEmpty(gridAt(grid, row, col))) continue;
        // Flood-fill to find connected empty region bounding box
        let minR = row, maxR = row, minC = col, maxC = col;
        const stack = [[row, col]];
        visited[row * cols + col] = 1;
        let area = 0;
        while (stack.length > 0 && area < 200) {
          const [r, c] = stack.pop()!;
          area++;
          if (r < minR) minR = r; if (r > maxR) maxR = r;
          if (c < minC) minC = c; if (c > maxC) maxC = c;
          for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
            const nr = r + dr, nc = c + dc;
            if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
            if (visited[nr * cols + nc] || !isEmpty(gridAt(grid, nr, nc))) continue;
            visited[nr * cols + nc] = 1;
            stack.push([nr, nc]);
          }
        }
        const w = maxC - minC + 1, h = maxR - minR + 1;
        if (w >= 3 && h >= 3) {
          regions.push({ x: minC, y: minR, w, h });
        }
      }
    }
    return regions;
  }

  // =========================================================================
  // PASS 6: Void Fill — floating elements in empty space
  // =========================================================================

  private passVoidFill(gfx: Graphics, voids: { x: number; y: number; w: number; h: number }[], rng: PRNG): void {
    const T = this.cfg.tileSize;
    const theme = this.preset?.themeId ?? '';

    for (const v of voids) {
      const area = v.w * v.h;
      const count = Math.min(30, Math.floor(area * 0.08));
      const px0 = v.x * T, py0 = v.y * T;
      const pw = v.w * T, ph = v.h * T;

      for (let i = 0; i < count; i++) {
        const fx = px0 + rng.nextFloat(4, pw - 4);
        const fy = py0 + rng.nextFloat(4, ph - 4);

        if (theme === 'T-BIOZONE') {
          // Floating spore chain: connected circles in arc
          const n = rng.nextInt(3, 5);
          const angle = rng.nextFloat(0, Math.PI * 2);
          for (let s = 0; s < n; s++) {
            const r = rng.nextFloat(1.5, 3);
            const sx = fx + Math.cos(angle) * s * 5 + rng.nextFloat(-2, 2);
            const sy = fy + Math.sin(angle) * s * 5 + rng.nextFloat(-2, 2);
            gfx.circle(sx, sy, r); gfx.fill({ color: this.cGrowerColor, alpha: 0.25 });
            if (s > 0) {
              const px = fx + Math.cos(angle) * (s - 1) * 5;
              const py = fy + Math.sin(angle) * (s - 1) * 5;
              gfx.moveTo(px, py); gfx.lineTo(sx, sy);
              gfx.stroke({ width: 0.5, color: this.cGrowerColor });
            }
          }
        } else if (theme === 'T-ECHO') {
          // Floating diamond constellation: 3-4 diamonds connected by lines
          const n = rng.nextInt(3, 4);
          const pts: [number, number][] = [];
          for (let d = 0; d < n; d++) {
            const dx2 = fx + rng.nextFloat(-10, 10);
            const dy2 = fy + rng.nextFloat(-10, 10);
            const s = rng.nextFloat(1, 2.5);
            gfx.poly([dx2, dy2 - s, dx2 + s, dy2, dx2, dy2 + s, dx2 - s, dy2]);
            gfx.fill({ color: this.cGrowerColor, alpha: rng.nextFloat(0.2, 0.5) });
            if (pts.length > 0) {
              const [px, py] = pts[pts.length - 1];
              gfx.moveTo(px, py); gfx.lineTo(dx2, dy2);
              gfx.stroke({ width: 0.5, color: this.cGrowerColor });
            }
            pts.push([dx2, dy2]);
          }
        } else if (theme === 'T-BREACH') {
          // Floating tumbling slab: rotated rectangle
          const w = rng.nextFloat(3, 7), h = rng.nextFloat(2, 4);
          const a = rng.nextFloat(0, Math.PI);
          const cos = Math.cos(a), sin = Math.sin(a);
          gfx.poly([
            fx + (-w / 2) * cos - (-h / 2) * sin, fy + (-w / 2) * sin + (-h / 2) * cos,
            fx + (w / 2) * cos - (-h / 2) * sin, fy + (w / 2) * sin + (-h / 2) * cos,
            fx + (w / 2) * cos - (h / 2) * sin, fy + (w / 2) * sin + (h / 2) * cos,
            fx + (-w / 2) * cos - (h / 2) * sin, fy + (-w / 2) * sin + (h / 2) * cos,
          ]);
          gfx.fill({ color: this.cConcrete, alpha: 0.45 });
          // Crack across slab
          gfx.moveTo(fx - w * 0.3 * cos, fy - w * 0.3 * sin);
          gfx.lineTo(fx + w * 0.3 * cos, fy + w * 0.3 * sin);
          gfx.stroke({ width: 0.5, color: this.cRebar });
        } else if (theme === 'T-FOUNDRY') {
          // Floating ember trail: teardrop + fading tail
          const s = rng.nextFloat(1.5, 3);
          gfx.circle(fx, fy, s); gfx.fill({ color: 0xee6622, alpha: 0.5 });
          gfx.circle(fx, fy, s * 0.5); gfx.fill({ color: 0xffaa44, alpha: 0.7 });
          // Fading tail
          for (let t = 1; t <= 3; t++) {
            gfx.circle(fx - t * 3, fy + t * 2, s * (1 - t * 0.25));
            gfx.fill({ color: 0xee6622, alpha: 0.15 / t });
          }
        } else if (theme === 'T-COOLANT') {
          // Steam puff: overlapping translucent circles (cloud shape)
          for (let p = 0; p < 3; p++) {
            gfx.circle(fx + rng.nextFloat(-4, 4), fy + rng.nextFloat(-3, 3), rng.nextFloat(3, 7));
            gfx.fill({ color: this.cHangerDrip, alpha: rng.nextFloat(0.04, 0.1) });
          }
        } else if (theme === 'T-MALFUNCTION') {
          // Spark burst: center + 4 radiating short lines
          gfx.circle(fx, fy, 1.5); gfx.fill({ color: 0xffaa44, alpha: 0.6 });
          for (let r = 0; r < 4; r++) {
            const a = r * Math.PI / 2 + rng.nextFloat(-0.3, 0.3);
            const len = rng.nextFloat(3, 6);
            gfx.moveTo(fx, fy); gfx.lineTo(fx + Math.cos(a) * len, fy + Math.sin(a) * len);
            gfx.stroke({ width: 0.7, color: 0xffaa44 });
          }
        } else if (theme === 'T-HABITAT') {
          // Floating lint: curled fiber (3-segment wavy line)
          gfx.moveTo(fx, fy);
          gfx.lineTo(fx + rng.nextFloat(-3, 3), fy + rng.nextFloat(1, 3));
          gfx.lineTo(fx + rng.nextFloat(-2, 4), fy + rng.nextFloat(3, 6));
          gfx.lineTo(fx + rng.nextFloat(-1, 5), fy + rng.nextFloat(5, 8));
          gfx.stroke({ width: 0.5, color: this.cHangerColor });
        } else if (theme === 'T-LOGISTICS') {
          // Floating packing chip: torn edge polygon
          const w = rng.nextFloat(2, 5), h = rng.nextFloat(1.5, 3);
          gfx.poly([fx, fy, fx + w * 0.3, fy - h * 0.2, fx + w, fy + h * 0.1, fx + w * 0.8, fy + h, fx + w * 0.2, fy + h * 0.8, fx - w * 0.1, fy + h * 0.3]);
          gfx.fill({ color: this.cConcrete, alpha: 0.35 });
        } else if (theme === 'T-ARCHIVE') {
          // Floating hologram glyph: small character-like shape
          const s = rng.nextFloat(2, 4);
          const pick = rng.nextInt(0, 2);
          if (pick === 0) { // bracket shape
            gfx.moveTo(fx + s * 0.3, fy - s); gfx.lineTo(fx - s * 0.3, fy - s); gfx.lineTo(fx - s * 0.3, fy + s); gfx.lineTo(fx + s * 0.3, fy + s);
            gfx.stroke({ width: 0.7, color: this.cGrowerColor });
          } else if (pick === 1) { // hash shape
            gfx.moveTo(fx - s * 0.5, fy - s * 0.3); gfx.lineTo(fx + s * 0.5, fy - s * 0.3);
            gfx.moveTo(fx - s * 0.5, fy + s * 0.3); gfx.lineTo(fx + s * 0.5, fy + s * 0.3);
            gfx.moveTo(fx - s * 0.3, fy - s * 0.5); gfx.lineTo(fx - s * 0.3, fy + s * 0.5);
            gfx.moveTo(fx + s * 0.3, fy - s * 0.5); gfx.lineTo(fx + s * 0.3, fy + s * 0.5);
            gfx.stroke({ width: 0.5, color: this.cGrowerColor });
          } else { // angle bracket
            gfx.moveTo(fx + s * 0.4, fy - s * 0.5); gfx.lineTo(fx - s * 0.2, fy); gfx.lineTo(fx + s * 0.4, fy + s * 0.5);
            gfx.stroke({ width: 0.7, color: this.cGrowerColor });
          }
        }
        // T-SECURITY, T-COMMAND: intentionally clean/empty (no void fill)
      }
    }
  }

  // =========================================================================
  // PASS 7: Micro — tiny dots/particles for surface texture
  // =========================================================================

  private passMicro(gfx: Graphics, edges: EdgeTile[], rng: PRNG): void {
    const T = this.cfg.tileSize;
    const theme = this.preset?.themeId ?? '';
    if (theme === 'T-SECURITY' || theme === 'T-COMMAND') return; // Clean environments

    let count = 0;
    const max = 300;
    for (const edge of edges) {
      if (count >= max) break;
      if (rng.next() > 0.3) continue;
      const bx = edge.col * T, by = edge.row * T;

      // Scatter micro dots along the surface
      const n = rng.nextInt(2, 5);
      for (let i = 0; i < n; i++) {
        let dx: number, dy: number;
        if (edge.type === 'floor') {
          dx = bx + rng.nextFloat(0, T);
          dy = by - rng.nextFloat(0, 4);
        } else if (edge.type === 'ceiling') {
          dx = bx + rng.nextFloat(0, T);
          dy = (edge.row + 1) * T + rng.nextFloat(0, 4);
        } else {
          const { wallX, dir } = this.ex(edge);
          dx = wallX + rng.nextFloat(0, 4) * dir;
          dy = by + rng.nextFloat(0, T);
        }

        switch (theme) {
          case 'T-FOUNDRY': {
            // Molten splash: tiny teardrop (triangle + circle tip)
            const s = rng.nextFloat(1, 2.5);
            gfx.poly([dx, dy - s, dx - s * 0.4, dy + s * 0.3, dx + s * 0.4, dy + s * 0.3]);
            gfx.fill({ color: this.cRebar, alpha: rng.nextFloat(0.3, 0.5) });
            gfx.circle(dx, dy + s * 0.3, s * 0.35); gfx.fill({ color: 0xee6622, alpha: 0.4 });
          } break;
          case 'T-BIOZONE': {
            // Spore triplet: 3 circles in triangular cluster
            const s = rng.nextFloat(0.6, 1.5);
            gfx.circle(dx, dy - s, s * 0.7); gfx.fill({ color: this.cGrowerColor, alpha: 0.3 });
            gfx.circle(dx - s * 0.6, dy + s * 0.4, s * 0.5); gfx.fill({ color: this.cGrowerColor, alpha: 0.25 });
            gfx.circle(dx + s * 0.6, dy + s * 0.4, s * 0.6); gfx.fill({ color: this.cGrowerTip, alpha: 0.2 });
          } break;
          case 'T-COOLANT': {
            // Water streak: elongated vertical oval (2 overlapping circles)
            const h = rng.nextFloat(1.5, 3);
            gfx.circle(dx, dy, h * 0.4); gfx.fill({ color: this.cHangerDrip, alpha: 0.35 });
            gfx.circle(dx, dy + h * 0.5, h * 0.3); gfx.fill({ color: this.cHangerDrip, alpha: 0.25 });
          } break;
          case 'T-ECHO': {
            // Diamond pixel: rotated square
            const s = rng.nextFloat(0.8, 1.8);
            gfx.poly([dx, dy - s, dx + s, dy, dx, dy + s, dx - s, dy]);
            gfx.fill({ color: this.cGrowerColor, alpha: rng.nextFloat(0.25, 0.55) });
          } break;
          case 'T-MALFUNCTION': // Spark cross: + shape with center dot
            gfx.moveTo(dx - 1.5, dy); gfx.lineTo(dx + 1.5, dy);
            gfx.moveTo(dx, dy - 1.5); gfx.lineTo(dx, dy + 1.5);
            gfx.stroke({ width: 0.5, color: 0xffaa44 });
            gfx.circle(dx, dy, 0.5); gfx.fill({ color: 0xffdd88, alpha: 0.6 });
            break;
          case 'T-BREACH': {
            // Shard chip: asymmetric 4-point poly
            const s = rng.nextFloat(0.8, 2.5);
            gfx.poly([dx - s * 0.3, dy - s, dx + s, dy - s * 0.2, dx + s * 0.5, dy + s * 0.6, dx - s * 0.6, dy + s * 0.3]);
            gfx.fill({ color: this.cConcrete, alpha: rng.nextFloat(0.25, 0.45) });
          } break;
          case 'T-HABITAT': {
            // Fabric tuft: tiny curved line with frayed end (2 short lines from 1 point)
            const len = rng.nextFloat(1.5, 3);
            const a = rng.nextFloat(0, Math.PI * 2);
            gfx.moveTo(dx, dy);
            gfx.lineTo(dx + Math.cos(a) * len, dy + Math.sin(a) * len);
            gfx.lineTo(dx + Math.cos(a + 0.4) * len * 0.6, dy + Math.sin(a + 0.4) * len * 0.6);
            gfx.moveTo(dx + Math.cos(a) * len, dy + Math.sin(a) * len);
            gfx.lineTo(dx + Math.cos(a - 0.4) * len * 0.7, dy + Math.sin(a - 0.4) * len * 0.7);
            gfx.stroke({ width: 0.5, color: this.cHangerColor });
          } break;
          case 'T-LOGISTICS': {
            // Packing staple: U-shape (3 lines)
            const w = rng.nextFloat(1, 2.5), h = rng.nextFloat(0.8, 1.5);
            gfx.moveTo(dx - w / 2, dy - h); gfx.lineTo(dx - w / 2, dy);
            gfx.lineTo(dx + w / 2, dy); gfx.lineTo(dx + w / 2, dy - h);
            gfx.stroke({ width: 0.7, color: this.cSteel });
          } break;
          case 'T-ARCHIVE': {
            // Binary bit: 0 or 1 shape
            if (rng.next() < 0.5) {
              // "0": tiny circle outline
              gfx.circle(dx, dy, rng.nextFloat(0.6, 1.2));
              gfx.stroke({ width: 0.5, color: this.cGrowerColor });
            } else {
              // "1": tiny vertical line
              gfx.moveTo(dx, dy - 1); gfx.lineTo(dx, dy + 1);
              gfx.stroke({ width: 0.7, color: this.cGrowerColor });
            }
          } break;
          default:
            gfx.circle(dx, dy, rng.nextFloat(0.3, 1.5));
            gfx.fill({ color: this.cConcrete, alpha: rng.nextFloat(0.15, 0.35) }); break;
        }
      }
      count++;
    }
  }

  // =========================================================================
  // PASS 8: Edge Weathering — erosion, rivets, drip stains along edges
  // =========================================================================

  private passEdgeWeathering(gfx: Graphics, edges: EdgeTile[], rng: PRNG): void {
    const T = this.cfg.tileSize;
    // Process ~30% of edges
    for (const edge of edges) {
      if (rng.next() > 0.30) continue;

      const bx = edge.col * T;
      const by = edge.row * T;

      switch (edge.type) {
        case 'floor': {
          // Top-edge erosion: micro cracks + chipped fragments
          const cx = bx + rng.nextFloat(2, T - 2);
          crack(gfx, cx, by, -Math.PI / 2 + rng.nextFloat(-0.3, 0.3),
            rng.nextFloat(3, 8), this.cConcrete, 0.8, 1, rng);
          // Tiny debris fragments
          if (rng.next() < 0.4) {
            for (let d = 0; d < rng.nextInt(1, 3); d++) {
              const fx = bx + rng.nextFloat(0, T);
              const fy = by - rng.nextFloat(1, 4);
              gfx.rect(fx, fy, rng.nextFloat(1, 2.5), rng.nextFloat(1, 2));
              gfx.fill({ color: this.cConcrete, alpha: rng.nextFloat(0.2, 0.4) });
            }
          }
          break;
        }
        case 'ceiling': {
          // Drip stains from ceiling
          const dx = bx + rng.nextFloat(2, T - 2);
          const dLen = rng.nextFloat(6, 18);
          dripTrail(gfx, dx, (edge.row + 1) * T, (edge.row + 1) * T + dLen,
            this.cHangerColor, rng.nextFloat(1, 2.5), rng.nextFloat(0.8, 1.5),
            rng.nextFloat(0.12, 0.25), rng);
          break;
        }
        case 'wall_left':
        case 'wall_right': {
          const isLeft = edge.type === 'wall_left';
          const wallX = isLeft ? bx : bx + T;
          // Vertical rust/water drip
          if (rng.next() < 0.5) {
            dripTrail(gfx, wallX + (isLeft ? -1 : 1), by, by + rng.nextFloat(8, 22),
              this.cRebar, rng.nextFloat(1, 2), 1, rng.nextFloat(0.1, 0.2), rng);
          }
          // Rivet line along wall seam
          if (rng.next() < 0.25) {
            rivetLine(gfx, wallX, by, wallX, by + T,
              T / 3, 1, this.cSteel, this.cConcrete, 0.3, 0.5, rng);
          }
          break;
        }
      }
    }
  }

  // =========================================================================
  // PASS 9: Ambient Fill — atmospheric micro-particles near wall surfaces
  // =========================================================================

  private passAmbientFill(gfx: Graphics, grid: number[][], edges: EdgeTile[], rng: PRNG): void {
    const T = this.cfg.tileSize;
    const theme = this.preset?.themeId ?? '';

    // Pick particle color based on theme
    let particleColor: number;
    let particleAlpha: number;
    switch (theme) {
      case 'T-FOUNDRY':     particleColor = 0xee6622; particleAlpha = 0.2; break;
      case 'T-COOLANT':     particleColor = this.cHangerDrip; particleAlpha = 0.15; break;
      case 'T-BIOZONE':     particleColor = this.cGrowerColor; particleAlpha = 0.15; break;
      case 'T-MALFUNCTION': particleColor = 0xffaa44; particleAlpha = 0.18; break;
      case 'T-ECHO':        particleColor = this.cGrowerColor; particleAlpha = 0.12; break;
      default:              particleColor = this.cConcrete; particleAlpha = 0.1; break;
    }

    // Scatter particles near edges (within 2-4 tiles of walls)
    const maxDist = 4 * T;
    const budget = Math.min(80, Math.floor(edges.length * 0.15));
    let placed = 0;

    for (let i = 0; i < edges.length && placed < budget; i++) {
      if (rng.next() > 0.12) continue;

      const edge = edges[i];
      const bx = edge.col * T;
      const by = edge.row * T;

      // Offset away from the wall surface
      let ox: number, oy: number;
      switch (edge.type) {
        case 'floor':
          ox = rng.nextFloat(0, T);
          oy = -rng.nextFloat(T, maxDist);
          break;
        case 'ceiling':
          ox = rng.nextFloat(0, T);
          oy = T + rng.nextFloat(0, maxDist);
          break;
        case 'wall_left':
          ox = -rng.nextFloat(T, maxDist);
          oy = rng.nextFloat(0, T);
          break;
        case 'wall_right':
          ox = T + rng.nextFloat(0, maxDist);
          oy = rng.nextFloat(0, T);
          break;
        default: continue;
      }

      const px = bx + ox;
      const py = by + oy;

      // Skip if inside solid
      const gc = Math.floor(px / T);
      const gr = Math.floor(py / T);
      if (gr >= 0 && gr < grid.length && gc >= 0 && gc < (grid[0]?.length ?? 0)) {
        if (isSolid(grid[gr][gc])) continue;
      }

      // Distance falloff
      const dist = Math.hypot(ox - (edge.type === 'wall_right' ? T : 0),
                               oy - (edge.type === 'ceiling' ? T : 0));
      const falloff = Math.max(0.02, 1 - dist / maxDist);

      const r = rng.nextFloat(0.3, 1.2);
      gfx.circle(px, py, r);
      gfx.fill({ color: particleColor, alpha: particleAlpha * falloff });
      placed++;
    }
  }
}
