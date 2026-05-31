import { Assets, Container, Graphics, Rectangle, Sprite, Texture } from 'pixi.js';
import type { ItemInstance } from '@items/ItemInstance';
import { assetPath } from '@core/AssetLoader';
import { generateItemWorldGrid } from '@level/ItemWorldGridGen';
import { resolveTiles, TEMPLATE_H, TEMPLATE_W } from '@level/ItemWorldTemplates';
import { PRNG } from '@utils/PRNG';

type BirthPhase = 'forming' | 'interior' | 'struck' | 'shattering' | 'floating' | 'building' | 'built' | 'done';

interface GridCellVisual {
  col: number;
  row: number;
  x: number;
  y: number;
  w: number;
  h: number;
  value: number;
  shardX: number;
  shardY: number;
  spin: number;
}

interface WhiteShard {
  x: number;
  y: number;
  w: number;
  h: number;
  sprite: Sprite | null;
  floatX: number;
  floatY: number;
  targetX: number;
  targetY: number;
  vanishX: number;
  vanishY: number;
  targetW: number;
  targetH: number;
  delay: number;
  duration: number;
  seed: number;
  spin: number;
}

export interface ItemWorldForgeBirthOptions {
  item: ItemInstance;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  targetWidth: number;
  targetHeight: number;
}

const FORM_MS = 850;
const STRIKE_HOLD_MS = 180;
const SHATTER_MS = 680;
const BUILD_MS = 5600;
const ITEM_SCALE = 5;
const GRID_PREVIEW_COLS = 16;
const GRID_PREVIEW_ROWS = 11;
const SHARD_VANISH_EXTRA_X_MIN = 72;
const SHARD_VANISH_EXTRA_X_MAX = 136;
const SHARD_DUPLICATE_RATIO = 1.0;
const SHARD_RELEASE_DELAY_MUL = 1.25;
const SHARD_SHRINK_START_T = 0.8;
const SHARD_FLOAT_SPREAD_MUL = 0.62;
const VOID_BLACK = 0x030409;

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function easeOutCubic(t: number): number {
  const inv = 1 - clamp01(t);
  return 1 - inv * inv * inv;
}

function easeInOut(t: number): number {
  const c = clamp01(t);
  return c * c * (3 - 2 * c);
}

function grayTint(t: number): number {
  const v = Math.round(255 * (1 - clamp01(t)));
  return (v << 16) | (v << 8) | v;
}

export class ItemWorldForgeBirth {
  readonly container = new Container();

  phase: BirthPhase = 'forming';

  private elapsed = 0;
  private readonly itemLayer = new Container();
  private readonly gridLayer = new Container();
  private readonly interiorGrid = new Graphics();
  private readonly shardSpriteLayer = new Container();
  private readonly whiteShardLayer = new Graphics();
  private readonly glowLayer = new Graphics();
  private readonly maskLayer = new Graphics();
  private itemSprite: Sprite | null = null;
  private maskSprite: Sprite | null = null;
  private itemTexture: Texture | null = null;
  private fallbackMask = false;
  private gridCells: GridCellVisual[] = [];
  private whiteShards: WhiteShard[] = [];
  private loaded = false;
  private strikeElapsed = 0;
  private shatterElapsed = 0;
  private buildingElapsed = 0;
  private flickerSeed = 0;
  private itemW = 32;
  private itemH = 32;
  private itemRevealed = true;

  constructor(private readonly options: ItemWorldForgeBirthOptions) {
    this.container.sortableChildren = false;
    this.container.eventMode = 'none';
    this.container.addChild(this.glowLayer);
    this.container.addChild(this.itemLayer);
    this.container.addChild(this.gridLayer);
    this.gridLayer.addChild(this.interiorGrid);
    this.container.addChild(this.shardSpriteLayer);
    this.container.addChild(this.whiteShardLayer);
    this.container.addChild(this.maskLayer);
    this.maskLayer.visible = false;
    this.rebuildPreviewGrid();
    void this.loadItemTexture();
  }

  start(itemRevealed = true): void {
    this.phase = 'forming';
    this.elapsed = 0;
    this.itemRevealed = itemRevealed;
    this.container.visible = true;
  }

  revealItem(): void {
    if (this.itemRevealed) return;
    this.itemRevealed = true;
    this.elapsed = Math.max(this.elapsed, FORM_MS);
    if (this.phase === 'forming') this.phase = 'interior';
    this.render();
  }

  strike(): void {
    if (this.phase === 'shattering' || this.phase === 'floating' || this.phase === 'building' || this.phase === 'built' || this.phase === 'done') return;
    this.revealItem();
    this.phase = 'struck';
    this.strikeElapsed = 0;
    this.shatterElapsed = 0;
    this.buildingElapsed = 0;
    this.buildWhiteShards();
  }

  releaseFloatingPieces(): void {
    if (this.phase === 'floating') {
      this.phase = 'building';
      this.buildingElapsed = 0;
    } else if (this.phase === 'shattering') {
      this.shatterElapsed = SHATTER_MS;
      this.phase = 'building';
      this.buildingElapsed = 0;
    }
  }

  update(dt: number): void {
    this.elapsed += dt;
    this.flickerSeed += dt * 0.036;

    if (this.phase === 'forming' && this.elapsed >= FORM_MS) {
      this.phase = 'interior';
    }

    if (this.phase === 'struck') {
      this.strikeElapsed += dt;
      if (this.strikeElapsed >= STRIKE_HOLD_MS) {
        this.phase = 'shattering';
        this.shatterElapsed = 0;
      }
    } else if (this.phase === 'shattering') {
      this.shatterElapsed += dt;
      if (this.shatterElapsed >= SHATTER_MS) {
        this.phase = 'floating';
      }
    } else if (this.phase === 'building') {
      this.buildingElapsed += dt;
      if (this.buildingElapsed >= BUILD_MS) {
        this.phase = 'built';
      }
    }

    this.render();
  }

  destroy(): void {
    this.container.parent?.removeChild(this.container);
    this.container.destroy({ children: true });
  }

  private async loadItemTexture(): Promise<void> {
    try {
      const texture = await Assets.load<Texture>(assetPath(`assets/items/${this.options.item.def.id}.png`));
      if (this.container.destroyed) return;
      texture.source.scaleMode = 'nearest';
      this.loaded = true;
      this.createItemSprites(texture);
    } catch {
      this.loaded = false;
      this.fallbackMask = true;
      this.rebuildFallbackMask();
    }
    this.render();
  }

  private createItemSprites(texture: Texture): void {
    this.itemSprite?.destroy();
    this.maskSprite?.destroy();
    this.itemTexture = texture;

    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5);
    sprite.tint = 0xffffff;
    sprite.alpha = 0.96;
    sprite.scale.set(ITEM_SCALE);
    sprite.x = this.options.x;
    sprite.y = this.options.y;
    this.itemSprite = sprite;
    this.itemLayer.addChild(sprite);

    const mask = new Sprite(texture);
    mask.anchor.set(0.5);
    mask.scale.set(ITEM_SCALE);
    mask.x = this.options.x;
    mask.y = this.options.y;
    this.maskSprite = mask;
    this.itemLayer.addChild(mask);
    this.gridLayer.mask = mask;

    this.itemW = Math.max(16, texture.width * ITEM_SCALE);
    this.itemH = Math.max(16, texture.height * ITEM_SCALE);
  }

  private rebuildFallbackMask(): void {
    this.maskLayer.clear();
    const w = this.itemW;
    const h = this.itemH;
    this.maskLayer
      .poly([
        this.options.x, this.options.y - h * 0.55,
        this.options.x + w * 0.48, this.options.y,
        this.options.x, this.options.y + h * 0.55,
        this.options.x - w * 0.48, this.options.y,
      ])
      .fill(0xffffff);
    this.gridLayer.mask = this.maskLayer;
  }

  private rebuildPreviewGrid(): void {
    this.gridCells = [];
    const seed = (this.options.item.uid * 1000) >>> 0;
    const iwGrid = generateItemWorldGrid(3, 3, seed);
    const template = iwGrid.startCell.template;
    if (!template) return;
    const tiles = resolveTiles(template.grid, new PRNG(seed ^ 0x9E3779B9));
    const stepX = TEMPLATE_W / GRID_PREVIEW_COLS;
    const stepY = TEMPLATE_H / GRID_PREVIEW_ROWS;
    const previewW = 82;
    const previewH = 56;
    const cellW = previewW / GRID_PREVIEW_COLS;
    const cellH = previewH / GRID_PREVIEW_ROWS;
    const left = this.options.x - previewW * 0.5;
    const top = this.options.y - previewH * 0.5;

    for (let pr = 0; pr < GRID_PREVIEW_ROWS; pr++) {
      for (let pc = 0; pc < GRID_PREVIEW_COLS; pc++) {
        let solidScore = 0;
        let platformScore = 0;
        const y0 = Math.floor(pr * stepY);
        const y1 = Math.max(y0 + 1, Math.floor((pr + 1) * stepY));
        const x0 = Math.floor(pc * stepX);
        const x1 = Math.max(x0 + 1, Math.floor((pc + 1) * stepX));
        for (let y = y0; y < y1; y++) {
          for (let x = x0; x < x1; x++) {
            const v = tiles[y]?.[x] ?? 0;
            if (v === 1) solidScore++;
            else if (v === 3) platformScore++;
            else if (v !== 0) solidScore += 0.45;
          }
        }
        if (solidScore + platformScore <= 0) continue;
        const value = platformScore > solidScore ? 3 : 1;
        const x = left + pc * cellW;
        const y = top + pr * cellH;
        const tx = this.options.targetX + Math.max(0, pc / (GRID_PREVIEW_COLS - 1)) * this.options.targetWidth;
        const ty = this.options.targetY + Math.max(0, pr / (GRID_PREVIEW_ROWS - 1)) * this.options.targetHeight;
        this.gridCells.push({
          col: pc,
          row: pr,
          x,
          y,
          w: Math.max(2, cellW - 0.7),
          h: Math.max(2, cellH - 0.7),
          value,
          shardX: tx,
          shardY: ty,
          spin: ((pc * 17 + pr * 29) % 9 - 4) * 0.08,
        });
      }
    }
  }

  private buildWhiteShards(): void {
    if (this.whiteShards.length > 0) return;
    const rng = new PRNG((this.options.item.uid * 2654435761) >>> 0);
    const cols = rng.nextInt(3, 5);
    const rows = rng.nextInt(3, 4);
    const texture = this.itemTexture;
    const texFrame = texture?.frame ?? null;
    const sourceW = texFrame ? Math.max(1, Math.floor(texFrame.width)) : this.itemW;
    const sourceH = texFrame ? Math.max(1, Math.floor(texFrame.height)) : this.itemH;
    const sourceScale = texture ? ITEM_SCALE : 1;
    const xCuts = this.randomPixelSegments(sourceW, cols, texture ? 2 : 9, rng);
    const yCuts = this.randomPixelSegments(sourceH, rows, texture ? 2 : 8, rng);
    const left = this.options.x - this.itemW * 0.5;
    const top = this.options.y - this.itemH * 0.5;
    const platformCells = this.gridCells.filter(cell => cell.value === 3);
    const worldCells = this.gridCells.filter(cell => cell.value !== 3 && cell.row >= Math.floor(GRID_PREVIEW_ROWS * 0.45));
    const targets = rng.shuffle([...platformCells, ...worldCells]);
    let idx = 0;
    for (let row = 0; row < yCuts.length - 1; row++) {
      for (let col = 0; col < xCuts.length - 1; col++) {
        const sourceX = xCuts[col];
        const sourceY = yCuts[row];
        const sourceW = xCuts[col + 1] - sourceX;
        const sourceH = yCuts[row + 1] - sourceY;
        const w = sourceW * sourceScale;
        const h = sourceH * sourceScale;
        const cx = left + (sourceX + sourceW * 0.5) * sourceScale;
        const cy = top + (sourceY + sourceH * 0.5) * sourceScale;
        let sprite: Sprite | null = null;
        if (texture && texFrame) {
          const frameX = Math.max(0, Math.min(Math.floor(texFrame.width) - 1, Math.floor(sourceX)));
          const frameY = Math.max(0, Math.min(Math.floor(texFrame.height) - 1, Math.floor(sourceY)));
          const frameW = Math.max(1, Math.min(Math.floor(texFrame.width) - frameX, Math.round(sourceW)));
          const frameH = Math.max(1, Math.min(Math.floor(texFrame.height) - frameY, Math.round(sourceH)));
          const subTexture = new Texture({
            source: texture.source,
            frame: new Rectangle(texFrame.x + frameX, texFrame.y + frameY, frameW, frameH),
          });
          sprite = new Sprite(subTexture);
          sprite.anchor.set(0.5);
          sprite.scale.set(ITEM_SCALE);
          sprite.x = cx;
          sprite.y = cy;
          sprite.visible = false;
          this.shardSpriteLayer.addChild(sprite);
        }
        const dx = cx - this.options.x;
        const dy = cy - this.options.y;
        const angle = Math.atan2(dy, dx || 1) + rng.nextFloat(-0.75, 0.75);
        const burst = rng.nextFloat(38, 88) + Math.max(0, dx) * 0.22;
        const scatteredX = cx + Math.cos(angle) * burst + rng.nextFloat(18, 54);
        const scatteredY = cy + Math.sin(angle) * burst - rng.nextFloat(22, 58);
        const floatX = this.options.x + (scatteredX - this.options.x) * SHARD_FLOAT_SPREAD_MUL;
        const floatY = this.options.y + (scatteredY - this.options.y) * SHARD_FLOAT_SPREAD_MUL;
        const target = targets.length > 0 ? targets[idx % targets.length] : null;
        const targetX = target ? target.shardX : this.options.targetX + this.options.targetWidth * rng.nextFloat(0.2, 0.75);
        const targetY = target ? target.shardY : this.options.targetY + this.options.targetHeight * rng.nextFloat(0.45, 0.75);
        const vanishX = targetX + rng.nextFloat(SHARD_VANISH_EXTRA_X_MIN, SHARD_VANISH_EXTRA_X_MAX);
        const vanishY = targetY + rng.nextFloat(-18, 18);
        this.whiteShards.push({
          x: cx,
          y: cy,
          w: Math.max(5, texture ? w : w * rng.nextFloat(0.74, 1.06)),
          h: Math.max(4, texture ? h : h * rng.nextFloat(0.72, 1.04)),
          sprite,
          floatX,
          floatY,
          targetX,
          targetY,
          vanishX,
          vanishY,
          targetW: Math.max(8, Math.min(28, w * rng.nextFloat(0.58, 0.9))),
          targetH: Math.max(4, Math.min(16, h * rng.nextFloat(0.46, 0.75))),
          delay: idx * rng.nextFloat(60, 112) * SHARD_RELEASE_DELAY_MUL,
          duration: rng.nextFloat(2080, 3280),
          seed: rng.nextFloat(0, Math.PI * 2),
          spin: (rng.next() < 0.5 ? -1 : 1) * rng.nextFloat(0.45, 1.35),
        });
        idx++;
      }
    }
    this.duplicateShardSprites(rng);
  }

  private duplicateShardSprites(rng: PRNG): void {
    const sourceCount = this.whiteShards.length;
    const extraCount = Math.floor(sourceCount * SHARD_DUPLICATE_RATIO);
    for (let i = 0; i < extraCount; i++) {
      const source = this.whiteShards[rng.nextInt(0, sourceCount - 1)];
      let sprite: Sprite | null = null;
      if (source.sprite) {
        sprite = new Sprite(source.sprite.texture);
        sprite.anchor.set(0.5);
        sprite.scale.set(ITEM_SCALE);
        sprite.visible = false;
        this.shardSpriteLayer.addChild(sprite);
      }
      const driftX = rng.nextFloat(-12, 18);
      const driftY = rng.nextFloat(-14, 14);
      this.whiteShards.push({
        ...source,
        sprite,
        x: source.x + driftX * 0.35,
        y: source.y + driftY * 0.35,
        floatX: source.floatX + driftX,
        floatY: source.floatY + driftY,
        targetX: source.targetX + rng.nextFloat(-18, 18),
        targetY: source.targetY + rng.nextFloat(-10, 10),
        vanishX: source.vanishX + rng.nextFloat(18, 70),
        vanishY: source.vanishY + rng.nextFloat(-16, 16),
        delay: source.delay + rng.nextFloat(30, 120) * SHARD_RELEASE_DELAY_MUL,
        duration: source.duration * rng.nextFloat(0.92, 1.15),
        seed: rng.nextFloat(0, Math.PI * 2),
        spin: -source.spin * rng.nextFloat(0.75, 1.25),
      });
    }
  }

  private randomSegments(total: number, count: number, minSize: number, rng: PRNG): number[] {
    const weights: number[] = [];
    let weightTotal = 0;
    for (let i = 0; i < count; i++) {
      const w = rng.nextFloat(0.65, 1.85);
      weights.push(w);
      weightTotal += w;
    }
    const free = Math.max(0, total - minSize * count);
    const cuts = [0];
    let cursor = 0;
    for (let i = 0; i < count; i++) {
      cursor += minSize + free * (weights[i] / weightTotal);
      cuts.push(i === count - 1 ? total : cursor);
    }
    return cuts;
  }

  private randomPixelSegments(total: number, count: number, minSize: number, rng: PRNG): number[] {
    const raw = this.randomSegments(total, count, minSize, rng).map(v => Math.round(v));
    raw[0] = 0;
    raw[raw.length - 1] = total;
    for (let i = 1; i < raw.length - 1; i++) {
      raw[i] = Math.max(raw[i - 1] + 1, Math.min(total - (raw.length - 1 - i), raw[i]));
    }
    return raw;
  }

  private render(): void {
    this.glowLayer.clear();
    this.interiorGrid.clear();
    this.whiteShardLayer.clear();

    const formingT = clamp01(this.elapsed / FORM_MS);
    const pulse = 0.5 + Math.sin(this.flickerSeed) * 0.5;
    const scalePulse = 1 + (this.phase === 'struck' ? 0.2 : 0.035 * pulse);
    const visibleItem = this.itemRevealed && this.phase !== 'shattering' && this.phase !== 'floating' && this.phase !== 'building' && this.phase !== 'built' && this.phase !== 'done';
    const alpha = this.phase === 'forming' ? easeOutCubic(formingT) : 1;

    if (this.itemSprite) {
      this.itemSprite.visible = visibleItem;
      this.itemSprite.x = this.options.x;
      this.itemSprite.y = this.options.y;
      this.itemSprite.scale.set(ITEM_SCALE * (0.42 + 0.58 * easeOutCubic(formingT)) * scalePulse);
      this.itemSprite.alpha = 0.82 + pulse * 0.16;
    } else if (this.fallbackMask && visibleItem) {
      this.drawFallbackItem(alpha, scalePulse);
    }
    if (this.maskSprite) {
      this.maskSprite.visible = visibleItem;
      this.maskSprite.x = this.options.x;
      this.maskSprite.y = this.options.y;
      this.maskSprite.scale.set(ITEM_SCALE * (0.42 + 0.58 * easeOutCubic(formingT)) * scalePulse);
    }

    if (visibleItem) this.drawInteriorGrid(alpha, scalePulse);
    this.drawWhiteShards();
  }

  private drawFallbackItem(alpha: number, scalePulse: number): void {
    const w = this.itemW * scalePulse;
    const h = this.itemH * scalePulse;
    this.glowLayer
      .poly([
        this.options.x, this.options.y - h * 0.55,
        this.options.x + w * 0.48, this.options.y,
        this.options.x, this.options.y + h * 0.55,
        this.options.x - w * 0.48, this.options.y,
      ])
      .fill({ color: 0xffffff, alpha: 0.92 * alpha });
  }

  private drawInteriorGrid(alpha: number, scalePulse: number): void {
    const interior = this.interiorGrid;
    const cx = this.options.x;
    const cy = this.options.y;
    const s = (0.42 + 0.58 * easeOutCubic(clamp01(this.elapsed / FORM_MS))) * scalePulse;
    const flicker = this.phase === 'struck' ? 1 : 0.78 + Math.sin(this.flickerSeed * 0.8) * 0.16;
    for (const cell of this.gridCells) {
      const x = cx + (cell.x - cx) * s;
      const y = cy + (cell.y - cy) * s;
      const color = cell.value === 3 ? 0x0b0e18 : VOID_BLACK;
      interior.rect(x, y, cell.w * s, cell.h * s).fill({ color, alpha: 0.72 * alpha * flicker });
    }
  }

  private drawWhiteShards(): void {
    const active = this.phase === 'shattering' || this.phase === 'floating' || this.phase === 'building';
    if (!active) {
      for (const shard of this.whiteShards) {
        if (shard.sprite) shard.sprite.visible = false;
      }
      return;
    }
    for (const shard of this.whiteShards) {
      const state = this.resolveShardPose(shard);
      if (state.buildT >= 1) {
        if (shard.sprite) shard.sprite.visible = false;
        continue;
      }
      if (shard.sprite) {
        shard.sprite.visible = true;
        shard.sprite.x = state.x;
        shard.sprite.y = state.y;
        shard.sprite.rotation = state.rot;
        shard.sprite.alpha = state.alpha;
        shard.sprite.tint = grayTint(state.buildT);
        const shrinkT = clamp01((state.buildT - SHARD_SHRINK_START_T) / (1 - SHARD_SHRINK_START_T));
        shard.sprite.scale.set(ITEM_SCALE * (1 - easeInOut(shrinkT)));
      } else {
        const tint = grayTint(state.buildT);
        const shrinkT = clamp01((state.buildT - SHARD_SHRINK_START_T) / (1 - SHARD_SHRINK_START_T));
        const scale = 1 - easeInOut(shrinkT);
        this.drawShardPolygon(this.whiteShardLayer, state.x, state.y, shard.w * scale, shard.h * scale, state.rot, tint, 0.82 * state.alpha, 0x0b0e18, 0.3 * state.alpha);
      }
    }
  }

  private resolveShardPose(shard: WhiteShard): { x: number; y: number; rot: number; alpha: number; buildT: number } {
    if (this.phase === 'shattering') {
      const t = easeOutCubic(this.shatterElapsed / SHATTER_MS);
      const yLift = -28 * Math.sin(Math.PI * t);
      return {
        x: shard.x + (shard.floatX - shard.x) * t,
        y: shard.y + (shard.floatY - shard.y) * t + yLift,
        rot: shard.spin * t,
        alpha: 1,
        buildT: 0,
      };
    }

    const floatTime = this.phase === 'building'
      ? Math.max(0, this.buildingElapsed - shard.delay)
      : 0;
    const buildT = this.phase === 'built'
      ? 1
      : this.phase === 'building'
        ? clamp01(floatTime / shard.duration)
        : 0;
    const eased = easeInOut(buildT);
    const floatPhase = this.elapsed * 0.0011 + shard.seed;
    const bob = Math.sin(floatPhase) * 1.8;
    if (buildT <= 0) {
      return {
        x: shard.floatX + Math.sin(this.elapsed * 0.0008 + shard.seed * 1.7) * 0.9,
        y: shard.floatY + bob,
        rot: shard.spin * 0.36 + Math.sin(this.elapsed * 0.0007 + shard.seed) * 0.035,
        alpha: 0.94,
        buildT,
      };
    }
    const inv = 1 - eased;
    const midX = (shard.floatX + shard.vanishX) * 0.5;
    const midY = Math.min(shard.floatY, shard.vanishY) - 34 - Math.sin(shard.seed) * 16;
    return {
      x: inv * inv * shard.floatX + 2 * inv * eased * midX + eased * eased * shard.vanishX,
      y: inv * inv * (shard.floatY + bob) + 2 * inv * eased * midY + eased * eased * shard.vanishY,
      rot: shard.spin * (1 - eased),
      alpha: 1,
      buildT,
    };
  }

  private drawShardPolygon(
    g: Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
    rot: number,
    fill: number,
    fillAlpha: number,
    stroke: number,
    strokeAlpha: number,
  ): void {
    const hw = w * 0.5;
    const hh = h * 0.5;
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    const pts = [
      [-hw, -hh],
      [hw, -hh * 0.64],
      [hw * 0.62, hh],
      [-hw * 0.88, hh * 0.74],
    ].flatMap(([px, py]) => [x + px * cos - py * sin, y + px * sin + py * cos]);
    g.poly(pts)
      .fill({ color: fill, alpha: fillAlpha })
      .stroke({ color: stroke, width: 0.8, alpha: strokeAlpha });
  }
}
