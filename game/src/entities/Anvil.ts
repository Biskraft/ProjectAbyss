/**
 * Anvil.ts
 *
 * A forge anvil where the player places a weapon and strikes it to trigger
 * floor collapse, opening a passage into the Item World below.
 *
 * Design ref: Prototype_ItemWorldEntry_FloorCollapse.md
 *
 * A3 affordance port (Playtest 2026-04-17):
 *   1. Ambient halo ring that pulses continuously (visible even at rest)
 *   2. Rising spark particles from the anvil top (idle emitter)
 *   3. Symbol prompt (key icon + hammer pictogram, no language text) on approach
 *
 * The symbol prompt is the GDD-sanctioned exception to the dialogue-zero rule
 * (Design_Tutorial_EnvironmentalTeaching §Symbol Prompt).
 */

import { Container, Graphics, Sprite, Texture, Assets, Rectangle } from 'pixi.js';
import { KeyPrompt } from '@ui/KeyPrompt';
import type { ItemInstance } from '@items/ItemInstance';
import { RARITY_COLOR } from '@items/ItemInstance';
import { assetPath } from '@core/AssetLoader';

interface Spark {
  gfx: Graphics;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

const SPARK_SPAWN_INTERVAL = 180; // ms between idle sparks
const MAX_SPARKS = 8;

/**
 * Build a small hammer pictogram (no language text) — points at the strike action.
 * Matches the icon used by LockedDoor (stat gates) so the teaching pair reads
 * as "gate wants ATK" → "anvil is where ATK is applied".
 */
function buildHammerIcon(): Graphics {
  const g = new Graphics();
  // Handle (wooden rod)
  g.rect(0, 4, 8, 2).fill(0xc8854a);
  g.rect(0, 4, 8, 2).stroke({ color: 0x5a3a1a, width: 1 });
  // Head (steel block)
  g.rect(6, 1, 5, 5).fill(0xcfd6dd);
  g.rect(6, 1, 5, 5).stroke({ color: 0x444b55, width: 1 });
  return g;
}

/**
 * Build a small sword pictogram — points at the "place weapon" action when
 * the anvil is empty.
 */
function buildSwordIcon(): Graphics {
  const g = new Graphics();
  // Blade (vertical)
  g.rect(5, 0, 2, 8).fill(0xd8dce3);
  g.rect(5, 0, 2, 8).stroke({ color: 0x5a6470, width: 1 });
  // Crossguard
  g.rect(2, 7, 8, 2).fill(0x9a7a3a);
  g.rect(2, 7, 8, 2).stroke({ color: 0x4a3a1a, width: 1 });
  // Pommel / hilt
  g.rect(5, 9, 2, 2).fill(0xc8854a);
  return g;
}

export class Anvil {
  container: Container;
  x: number;
  y: number;
  width = 32;
  height = 16;

  /** The weapon placed on this anvil (null = empty). */
  item: ItemInstance | null = null;

  /** True once the floor collapse has been triggered (prevents re-use). */
  used = false;

  private hintContainer: Container;
  private showHint = false;
  private timer = 0;
  private gfx: Graphics;
  private halo: Graphics;
  private particleLayer: Container;
  private sparks: Spark[] = [];
  private sparkCooldown = 0;
  private itemGfx: Graphics | null = null;
  private fxSprite: Sprite | null = null;
  private fxFrames: Texture[] = [];
  private fxTimer = 0;
  private fxFrameIndex = 0;
  private fxPlaying = false;
  private itemIcon: Sprite | null = null;
  /** Called when FX animation completes — scene uses this to trigger warp. */
  onFxComplete: (() => void) | null = null;

  /** Cached icons so we can swap them in/out when item state changes. */
  private swordIcon: Graphics | null = null;
  private hammerIcon: Graphics | null = null;
  private keyUp: Container | null = null;
  private keyStrike: Container | null = null;

  private anvilSprite: Sprite | null = null;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;

    this.container = new Container();
    this.container.x = x;
    this.container.y = y;

    // Halo (drawn first so it sits behind the anvil body)
    this.halo = new Graphics();
    this.container.addChild(this.halo);

    this.gfx = new Graphics();
    this.drawAnvil(); // placeholder until sprite loads
    this.container.addChild(this.gfx);

    // Load the anvil sprite (replaces placeholder Graphics)
    this.loadAnvilSprite();
    // Pre-load FX019 so it's instant when activated
    this.preloadFX();

    this.particleLayer = new Container();
    this.container.addChild(this.particleLayer);

    // Symbol prompt: [UP] + [sword] when empty, [C] + [hammer] when item placed.
    this.hintContainer = this.buildSymbolPrompt();
    this.hintContainer.visible = false;
    // Anchor prompt so it sits above the anvil top
    this.hintContainer.y = -this.height - 16;
    this.container.addChild(this.hintContainer);
  }

  /** Pre-load FX019 spritesheet at init time so it's ready when needed. */
  private async preloadFX(): Promise<void> {
    try {
      const sheetTex = await Assets.load<Texture>(assetPath('assets/sprites/FX019.png'));
      const jsonData = await fetch(assetPath('assets/sprites/FX019.json')).then(r => r.json());
      sheetTex.source.scaleMode = 'nearest';
      this.fxFrames = [];
      const frameKeys = Object.keys(jsonData.frames).sort();
      for (const key of frameKeys) {
        const f = jsonData.frames[key].frame;
        this.fxFrames.push(new Texture({
          source: sheetTex.source,
          frame: new Rectangle(f.x, f.y, f.w, f.h),
        }));
      }
    } catch { /* FX not available */ }
  }

  private async loadAnvilSprite(): Promise<void> {
    try {
      const tex = await Assets.load<Texture>(assetPath('assets/sprites/anvil_gate_01.png'));
      tex.source.scaleMode = 'nearest';
      const sprite = new Sprite(tex);
      sprite.anchor.set(0.5, 1); // bottom-center pivot
      this.anvilSprite = sprite;
      this.gfx.visible = false;
      this.container.addChildAt(sprite, this.container.getChildIndex(this.gfx));
    } catch {
      // Sprite not found — keep placeholder Graphics
    }
  }

  private drawAnvil(): void {
    this.gfx.rect(-this.width / 2, -2, this.width, 6).fill(0x444455);
    this.gfx.rect(-this.width / 2, -2, this.width, 6).stroke({ color: 0x333344, width: 1 });
    this.gfx.rect(-10, -this.height, 20, this.height - 2).fill(0x555566);
    this.gfx.rect(-10, -this.height, 20, this.height - 2).stroke({ color: 0x444455, width: 1 });
    this.gfx.rect(-14, -this.height - 3, 28, 4).fill(0x777788);
    this.gfx.rect(-14, -this.height - 3, 28, 4).stroke({ color: 0x555566, width: 1 });
    this.gfx.rect(-18, -this.height - 1, 5, 2).fill(0x666677);
  }

  /**
   * Build the symbol prompt composite.
   *
   * Layout (both states cached, toggled via .visible):
   *   Empty  : [↑] + [sword]   — "place your weapon"
   *   Placed : [C] + [hammer]  — "strike it"
   *
   * Only one pair is visible at a time. No language text.
   */
  private buildSymbolPrompt(): Container {
    const c = new Container();

    // Empty state: UP key + sword icon
    this.keyUp = KeyPrompt.createKeyIcon('\u2191', 9);
    this.keyUp.x = 0;
    this.keyUp.y = 0;
    c.addChild(this.keyUp);

    this.swordIcon = buildSwordIcon();
    this.swordIcon.x = 11;
    this.swordIcon.y = -1;
    c.addChild(this.swordIcon);

    // Placed state: C key + hammer icon (stacked on top — hidden by default)
    this.keyStrike = KeyPrompt.createKeyIcon('C', 9);
    this.keyStrike.x = 0;
    this.keyStrike.y = 0;
    this.keyStrike.visible = false;
    c.addChild(this.keyStrike);

    this.hammerIcon = buildHammerIcon();
    this.hammerIcon.x = 11;
    this.hammerIcon.y = 2;
    this.hammerIcon.visible = false;
    c.addChild(this.hammerIcon);

    // Center horizontally above the anvil (width ~22)
    c.pivot.x = Math.floor(c.width / 2);

    return c;
  }

  /** Swap the symbol prompt to match the current item-placement state. */
  private refreshSymbolPrompt(): void {
    const placed = this.hasItem();
    if (this.keyUp) this.keyUp.visible = !placed;
    if (this.swordIcon) this.swordIcon.visible = !placed;
    if (this.keyStrike) this.keyStrike.visible = placed;
    if (this.hammerIcon) this.hammerIcon.visible = placed;
  }

  /** Place a weapon on the anvil. Shows a small colored rect on top. */
  placeItem(item: ItemInstance): void {
    this.item = item;

    if (this.itemGfx) {
      this.container.removeChild(this.itemGfx);
      this.itemGfx.destroy();
    }

    const color = RARITY_COLOR[item.rarity];
    this.itemGfx = new Graphics();
    this.itemGfx.rect(-6, -this.height - 8, 12, 5).fill(color);
    this.itemGfx.rect(-4, -this.height - 11, 2, 4).fill(color);
    this.container.addChild(this.itemGfx);

    // Show item icon at anvil center
    this.showItemIcon(item);

    // Play FX019 activation effect at anvil center
    this.playActivationFX();

    // Symbol prompt now advertises strike action
    this.refreshSymbolPrompt();
  }

  private showItemIcon(item: ItemInstance): void {
    if (this.itemIcon) {
      this.container.removeChild(this.itemIcon);
      this.itemIcon.destroy();
    }
    // Load item sprite as icon at anvil gate center (the transparent hole)
    const iconPath = assetPath(`assets/items/${item.def.id}.png`);
    Assets.load<Texture>(iconPath).then(tex => {
      if (!this.item || this.item.uid !== item.uid) return;
      tex.source.scaleMode = 'nearest';
      const icon = new Sprite(tex);
      icon.anchor.set(0.5, 0.5);
      // Gate center + 50px down offset
      const spriteH = this.anvilSprite ? this.anvilSprite.height : this.height;
      icon.x = -3;
      icon.y = -47;
      icon.width = 64;
      icon.height = 64;
      this.itemIcon = icon;
      this.container.addChild(icon);
    }).catch(() => { /* no icon available */ });
  }

  private playActivationFX(): void {
    if (this.fxFrames.length === 0) return;

    if (this.fxSprite) {
      this.container.removeChild(this.fxSprite);
      this.fxSprite.destroy();
    }
    this.fxSprite = new Sprite(this.fxFrames[0]);
    this.fxSprite.anchor.set(0.5, 0.5);
    const spriteH = this.anvilSprite ? this.anvilSprite.height : this.height;
    this.fxSprite.x = -3;
    this.fxSprite.y = -47;
    this.fxSprite.scale.set(0.84);
    this.fxSprite.blendMode = 'add';
    this.container.addChild(this.fxSprite);

    this.fxTimer = 0;
    this.fxFrameIndex = 0;
    this.fxPlaying = true;

    // Drive animation via requestAnimationFrame (works during hitstop)
    // Start icon scale-up when FX reaches 80% progress
    const totalFrames = this.fxFrames.length;
    const scaleUpStart = Math.floor(totalFrames * 0.7);
    let iconScaling = false;
    let iconScale = 1.0;

    const animate = () => {
      if (!this.fxPlaying || !this.fxSprite) return;
      this.fxTimer += 16.67;
      const fps = 15;
      const frameInterval = 1000 / fps;
      if (this.fxTimer >= frameInterval) {
        this.fxTimer -= frameInterval;
        this.fxFrameIndex++;

        // Start icon scale-up at 70% of FX
        if (this.fxFrameIndex >= scaleUpStart && !iconScaling) {
          iconScaling = true;
        }

        if (this.fxFrameIndex >= totalFrames) {
          // FX complete
          this.fxPlaying = false;
          if (this.fxSprite.parent) this.fxSprite.parent.removeChild(this.fxSprite);
          this.fxSprite.destroy();
          this.fxSprite = null;
          // Notify scene that FX is done — trigger warp
          this.onFxComplete?.();
          return;
        }
        this.fxSprite.texture = this.fxFrames[this.fxFrameIndex];
      }

      // Icon scale-up animation (accelerating growth)
      if (iconScaling && this.itemIcon) {
        iconScale += 0.15; // ~10x over remaining 30% of frames
        this.itemIcon.width = 64 * iconScale;
        this.itemIcon.height = 64 * iconScale;
        this.itemIcon.alpha = 0.9;
      }

      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }

  hasItem(): boolean {
    return this.item !== null;
  }

  setShowHint(show: boolean): void {
    if (this.showHint !== show) {
      this.showHint = show;
      this.hintContainer.visible = show && !this.used;
      if (this.hintContainer.visible) this.refreshSymbolPrompt();
    }
  }

  update(dt: number): void {
    this.timer += dt;
    const t = this.timer / 1000;

    // Body gentle breathing
    this.gfx.alpha = 0.9 + Math.sin(t * 2) * 0.1;

    // Item glow when placed
    if (this.itemGfx) {
      this.itemGfx.alpha = 0.8 + Math.sin(t * 4) * 0.2;
    }
    // Item icon float animation at gate center + 50px down
    if (this.itemIcon) {
      const spriteH = this.anvilSprite ? this.anvilSprite.height : this.height;
      this.itemIcon.y = -47 + Math.sin(t * 3) * 2;
    }

    // FX019 spritesheet animation is driven by playActivationFX() via rAF.
    // update() must NOT advance frames independently — doing so races with
    // the rAF loop and can clear fxPlaying before onFxComplete fires.

    // --- Halo pulse (A3 affordance) --------------------------------------
    // Slow outer ring + faster inner shimmer. Strengthens on approach.
    // Anchored to the anvil top surface (y = -this.height - 1).
    this.halo.clear();
    if (!this.used) {
      const strongMul = this.showHint ? 1.6 : 1.0;
      const outerR = 13 + Math.sin(t * 1.5) * 3;
      const outerA = (0.15 + Math.sin(t * 1.5) * 0.1) * strongMul;
      const innerR = 7 + Math.sin(t * 3.2) * 1.5;
      const innerA = (0.22 + Math.sin(t * 3.2) * 0.13) * strongMul;
      const haloY = -this.height - 1;
      this.halo
        .circle(0, haloY, outerR)
        .fill({ color: 0xffaa66, alpha: Math.max(0, outerA) });
      this.halo
        .circle(0, haloY, innerR)
        .fill({ color: 0xffffcc, alpha: Math.max(0, innerA) });
    }

    // --- Spark emitter ---------------------------------------------------
    if (!this.used) {
      this.sparkCooldown -= dt;
      const interval = this.showHint ? SPARK_SPAWN_INTERVAL * 0.4 : SPARK_SPAWN_INTERVAL;
      if (this.sparkCooldown <= 0 && this.sparks.length < MAX_SPARKS) {
        this.sparkCooldown = interval;
        this.spawnSpark();
      }
    }

    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.life -= dt;
      s.gfx.x += s.vx * (dt / 16.67);
      s.gfx.y += s.vy * (dt / 16.67);
      s.vy += 0.02 * dt / 16.67; // slight upward decel
      const k = s.life / s.maxLife;
      s.gfx.alpha = Math.max(0, Math.min(1, k));
      if (s.life <= 0) {
        this.particleLayer.removeChild(s.gfx);
        s.gfx.destroy();
        this.sparks.splice(i, 1);
      }
    }

    // --- Approach prompt pulse ------------------------------------------
    if (this.showHint) {
      this.hintContainer.alpha = 0.7 + Math.sin(t * 3) * 0.3;
      // Emphasize the hammer when an item is already placed — it says
      // "this is how you solve it" (same language as stat-gate hammer).
      if (this.hammerIcon && this.hammerIcon.visible) {
        this.hammerIcon.alpha = 0.6 + Math.abs(Math.sin(t * 2)) * 0.4;
      }
    }
  }

  private spawnSpark(): void {
    const g = new Graphics();
    // Hot forge palette — orange/white alternation for the anvil top
    const color = Math.random() < 0.3 ? 0xffffff : 0xffaa44;
    g.rect(0, 0, 1, 1).fill(color);
    // Spawn from the anvil top face, slight horizontal jitter
    g.x = (Math.random() - 0.5) * 10;
    g.y = -this.height - 1;
    this.particleLayer.addChild(g);
    const maxLife = 500 + Math.random() * 300;
    this.sparks.push({
      gfx: g,
      vx: (Math.random() - 0.5) * 0.4,
      vy: -0.6 - Math.random() * 0.4,
      life: maxLife,
      maxLife,
    });
  }

  /** AABB overlap check (same pattern as Altar). */
  overlaps(px: number, py: number, pw: number, ph: number): boolean {
    const halfW = this.width / 2;
    return (
      px + pw > this.x - halfW &&
      px < this.x + halfW &&
      py + ph > this.y - this.height &&
      py < this.y + 4
    );
  }

  /** Returns the AABB for attack hit detection in world coordinates. */
  getHitAABB(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.x - this.width / 2,
      y: this.y - this.height - 4,
      width: this.width,
      height: this.height + 4,
    };
  }

  destroy(): void {
    for (const s of this.sparks) {
      s.gfx.destroy();
    }
    this.sparks = [];
    if (this.container.parent) {
      this.container.parent.removeChild(this.container);
    }
    this.container.destroy({ children: true });
  }
}
