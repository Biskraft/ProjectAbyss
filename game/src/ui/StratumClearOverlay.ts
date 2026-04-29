/**
 * StratumClearOverlay — Unified post-boss cinematic.
 *
 * Replaces StratumClearPanel + BossChoice + ReturnResult.
 * Hides all HUD during sequence.
 *
 * Timeline:
 *   dark     0~400ms     Background dims to 0.75 opacity
 *   pump     400~1600ms  Item icon center, scale pulses with tension
 *   flash    1600~1900ms White flash + shatter particles burst
 *   title    1900~2500ms Title text fades in
 *   stats    2500~3400ms ATK then Innocents fade in
 *   prompt   3400~3800ms KeyPrompt buttons fade in
 *   input    Awaiting player choice
 *
 * All fonts/sizes from ModalPanel tokens. Prompts via KeyPrompt.createPrompt.
 */

import { Container, Graphics, BitmapText } from 'pixi.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../Game';
import { PIXEL_FONT } from './fonts';
import { GameAction, actionKey } from '@core/InputManager';
import { KeyPrompt } from './KeyPrompt';
import { ItemImage } from './ItemImage';
import {
  MODAL_OVERLAY,
  TEXT_PRIMARY, TEXT_SECONDARY, TEXT_POSITIVE, TEXT_ACCENT,
  FONT_TITLE, FONT_BODY, FONT_HINT,
} from './ModalPanel';
import { RARITY_COLOR, type ItemInstance } from '@items/ItemInstance';
import type { Rarity } from '@data/weapons';
import { HudConst } from '@data/constData';

/**
 * Rarity-driven enhancement burst tuning.
 * Higher rarity = more particles, taller pillar, more rings, screen tint.
 * Tuned visually per Diablo-style "loot pop" reference: Normal is silent,
 * Ancient is room-dominating.
 */
interface BurstTier {
  particleCount: number;
  particleSpeed: number;
  pillarWidth: number;   // 0 disables pillar
  pillarHeight: number;
  ringCount: number;     // expanding halo rings; 0 disables
  ringMaxRadius: number;
  flashPeak: number;
  tintAlpha: number;     // full-screen rarity tint during flash; 0 disables
  flareLen: number;      // base length of icon-flare cross rays
}

const RARITY_BURST: Record<Rarity, BurstTier> = {
  normal:    { particleCount: 180, particleSpeed: 340, pillarWidth: 50,  pillarHeight: 460, ringCount: 5, ringMaxRadius: 240, flashPeak: 1.0, tintAlpha: 0.34, flareLen: 80  },
  magic:     { particleCount: 250, particleSpeed: 400, pillarWidth: 64,  pillarHeight: 540, ringCount: 6, ringMaxRadius: 290, flashPeak: 1.0, tintAlpha: 0.42, flareLen: 120 },
  rare:      { particleCount: 330, particleSpeed: 460, pillarWidth: 80,  pillarHeight: 620, ringCount: 7, ringMaxRadius: 340, flashPeak: 1.0, tintAlpha: 0.50, flareLen: 165 },
  legendary: { particleCount: 420, particleSpeed: 530, pillarWidth: 96,  pillarHeight: 700, ringCount: 8, ringMaxRadius: 400, flashPeak: 1.0, tintAlpha: 0.58, flareLen: 215 },
  ancient:   { particleCount: 520, particleSpeed: 600, pillarWidth: 116, pillarHeight: 780, ringCount: 9, ringMaxRadius: 460, flashPeak: 1.0, tintAlpha: 0.66, flareLen: 270 },
};

export interface StratumClearData {
  item: ItemInstance;
  beforeAtk: number;
  afterAtk: number;
  beforeInnocents: number;
  afterInnocents: number;
  isFinal: boolean;
  hasNextStratum: boolean;
}

type Phase = 'dark' | 'pump' | 'flash' | 'title' | 'stats' | 'prompt' | 'input';

// Timings (ms) — SSoT: Sheets/Content_ConstData.csv (HUD.StratumClear.*)
const T_DARK = HudConst.StratumClear.DarkPhaseMs;
const T_PUMP = HudConst.StratumClear.PumpPhaseMs;
const T_FLASH = HudConst.StratumClear.FlashPhaseMs;
const T_TITLE = HudConst.StratumClear.TitlePhaseMs;
const T_STATS = HudConst.StratumClear.StatsPhaseMs;
const T_PROMPT = HudConst.StratumClear.PromptPhaseMs;

// Overlay dim
const DIM_ALPHA = 0.9;

// Item icon
const ICON_SIZE = 64;
const PUMP_FREQ = 3.5;

// Flash peak / shatter count are now driven by RARITY_BURST per item rarity.
// HudConst.StratumClear.ShatterCount remains as the design baseline reference
// (Rare tier ~28-32). Rarity-tier tuning lives in RARITY_BURST above.

const CX = Math.floor(GAME_WIDTH / 2);
const CY = Math.floor(GAME_HEIGHT / 2) - 30;
// Title sits above the icon (per ui-components.html#stratum-clear).
const TITLE_Y = 44;
// Stats sit just below the icon halo.
const ATK_Y = CY + ICON_SIZE / 2 + 36;
const INNOCENT_Y = ATK_Y + 28;
// Bitmap-font sizes for this overlay. Pixel fonts stay crisp at exact
// integer multiples of their authored size, so we use 2x of the canonical
// FONT_TITLE/FONT_BODY/FONT_HINT tokens (12/10/8 -> 24/20/16) for emphasis.
const TITLE_FONT_SIZE = FONT_TITLE * 2;
const STAT_FONT_SIZE = FONT_BODY * 2;
const INNOCENT_FONT_SIZE = FONT_HINT * 2;

interface Particle {
  gfx: Graphics;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  rotSpeed: number;
}

export class StratumClearOverlay {
  readonly container: Container;
  private phase: Phase = 'dark';
  private timer = 0;
  private inputReady = false;
  private data: StratumClearData;

  // Layers
  private dimOverlay: Graphics;
  private haloGfx: Graphics;
  private iconContainer: Container;
  private itemImage: ItemImage;
  private flashOverlay: Graphics;
  private particles: Particle[] = [];
  private titleText: BitmapText;
  private atkText: Container;
  private innocentText: BitmapText;
  private promptContainer: Container;

  // Rarity-driven enhancement burst layers
  private tintOverlay: Graphics;   // full-screen rarity tint (Legendary+)
  private pillarGfx: Graphics;     // vertical light beam (Magic+)
  private ringsGfx: Graphics;      // expanding halo rings (Rare+)
  private iconFlareGfx: Graphics;  // lens-flare burst from item itself (all rarities)
  private idleWaveGfx: Graphics;   // continuous heartbeat waves during idle pulse
  private burstTimer = 0;          // independent of phase timer; ms since flash trigger
  private burstActive = false;

  private rarityColor: number;
  private tier: BurstTier;

  /** Continuous idle pulse running from end of flash until input — keeps the
   *  icon "alive" while waiting for player to press C. */
  private idleTimer = 0;

  // Result
  private _choice: 'continue' | 'exit' | null = null;
  get choice(): 'continue' | 'exit' | null { return this._choice; }
  get isDone(): boolean { return this._choice !== null; }

  constructor(data: StratumClearData) {
    this.data = data;
    this.rarityColor = RARITY_COLOR[data.item.rarity];
    this.tier = RARITY_BURST[data.item.rarity];
    this.container = new Container();
    this.container.eventMode = 'none';

    // ── Dim background ──
    this.dimOverlay = new Graphics();
    this.dimOverlay.rect(0, 0, GAME_WIDTH, GAME_HEIGHT).fill({ color: MODAL_OVERLAY, alpha: 1 });
    this.dimOverlay.alpha = 0;
    this.container.addChild(this.dimOverlay);

    // ── Rarity tint (full-screen color wash, Legendary+ only) ──
    this.tintOverlay = new Graphics();
    this.tintOverlay.rect(0, 0, GAME_WIDTH, GAME_HEIGHT).fill(this.rarityColor);
    this.tintOverlay.alpha = 0;
    this.container.addChild(this.tintOverlay);

    // ── Light pillar (vertical beam through icon, Magic+ only) ──
    this.pillarGfx = new Graphics();
    this.pillarGfx.alpha = 0;
    this.container.addChild(this.pillarGfx);

    // ── Rarity halo (glow behind icon) ──
    this.haloGfx = new Graphics();
    this.haloGfx.alpha = 0;
    this.container.addChild(this.haloGfx);

    // ── Idle wave (continuous heartbeat rings, behind icon, drawn during idle) ──
    this.idleWaveGfx = new Graphics();
    this.idleWaveGfx.alpha = 0;
    this.container.addChild(this.idleWaveGfx);

    // ── Expanding rings (Rare+ only, drawn above halo, below icon) ──
    this.ringsGfx = new Graphics();
    this.ringsGfx.alpha = 0;
    this.container.addChild(this.ringsGfx);

    // ── Item icon (no border, larger) ──
    this.iconContainer = new Container();
    this.iconContainer.x = CX;
    this.iconContainer.y = CY;
    this.iconContainer.alpha = 0;
    this.container.addChild(this.iconContainer);

    this.itemImage = new ItemImage(data.item, ICON_SIZE);
    // Remove border by hiding it
    const border = (this.itemImage as any).border as Graphics | undefined;
    if (border) border.visible = false;
    this.itemImage.container.x = -ICON_SIZE / 2;
    this.itemImage.container.y = -ICON_SIZE / 2;
    this.iconContainer.addChild(this.itemImage.container);

    // ── Icon flare (lens-flare burst from item, drawn above icon) ──
    this.iconFlareGfx = new Graphics();
    this.iconFlareGfx.alpha = 0;
    this.container.addChild(this.iconFlareGfx);

    // ── White flash ──
    this.flashOverlay = new Graphics();
    this.flashOverlay.rect(0, 0, GAME_WIDTH, GAME_HEIGHT).fill(0xffffff);
    this.flashOverlay.alpha = 0;
    this.container.addChild(this.flashOverlay);

    // ── Title (above icon, FONT_TITLE = 12, primary white) ──
    const titleStr = data.isFinal ? 'MEMORY ECHOED' : 'STRATUM CLEARED';
    this.titleText = new BitmapText({
      text: titleStr,
      style: { fontFamily: PIXEL_FONT, fontSize: TITLE_FONT_SIZE, fill: TEXT_PRIMARY },
    });
    this.titleText.x = Math.floor((GAME_WIDTH - this.titleText.width) / 2);
    this.titleText.y = TITLE_Y;
    this.titleText.alpha = 0;
    this.container.addChild(this.titleText);

    // ── ATK stat (FONT_BODY = 10, multi-color spans) ──
    this.atkText = this.buildAtkText();
    this.atkText.alpha = 0;
    this.container.addChild(this.atkText);

    // ── Innocents (FONT_HINT = 8, accent cyan) ──
    this.innocentText = this.buildInnocentText();
    this.innocentText.alpha = 0;
    this.container.addChild(this.innocentText);

    // ── Prompt (KeyPrompt.createPrompt) ──
    this.promptContainer = new Container();
    this.promptContainer.alpha = 0;
    this.container.addChild(this.promptContainer);
    this.buildPrompt();
  }

  private buildAtkText(): Container {
    const d = this.data;
    const delta = d.afterAtk - d.beforeAtk;

    // Multi-color spans per ui-components.html#stratum-clear:
    //   "ATK"=primary, old/arrow=secondary, new/diff=positive (or primary if no gain)
    const newColor = delta > 0 ? TEXT_POSITIVE : TEXT_PRIMARY;
    const spans: Array<{ text: string; color: number }> = [
      { text: 'ATK ', color: TEXT_PRIMARY },
      { text: `${d.beforeAtk}`, color: TEXT_SECONDARY },
      { text: ' \u2192 ', color: TEXT_SECONDARY },
      { text: `${d.afterAtk}`, color: newColor },
    ];
    if (delta > 0) spans.push({ text: ` (+${delta})`, color: TEXT_POSITIVE });

    const root = new Container();
    let ox = 0;
    for (const s of spans) {
      const t = new BitmapText({
        text: s.text,
        style: { fontFamily: PIXEL_FONT, fontSize: STAT_FONT_SIZE, fill: s.color },
      });
      t.x = ox;
      t.y = 0;
      root.addChild(t);
      ox += t.width;
    }
    root.x = Math.floor((GAME_WIDTH - ox) / 2);
    root.y = ATK_Y;
    return root;
  }

  private buildInnocentText(): BitmapText {
    const d = this.data;
    const delta = d.afterInnocents - d.beforeInnocents;
    const str = delta > 0
      ? `INNOCENTS  +${delta} stabilized`
      : `INNOCENTS  ${d.afterInnocents}`;
    const text = new BitmapText({
      text: str,
      style: { fontFamily: PIXEL_FONT, fontSize: INNOCENT_FONT_SIZE, fill: TEXT_ACCENT },
    });
    text.x = Math.floor((GAME_WIDTH - text.width) / 2);
    text.y = INNOCENT_Y;
    return text;
  }

  private buildPrompt(): void {
    const d = this.data;

    // Single-key flow: ATTACK (C) drives the only forward action.
    //   - Mid-strata with next stratum: C = Continue Deeper
    //   - Otherwise (final clear or no next stratum): C = Return
    // ESC is never used here — pressing it during stratum clear must not
    // open the global EscapeConfirm popup either (handled in ItemWorldScene).
    const prompts: Container[] = [];
    if (!d.isFinal && d.hasNextStratum) {
      prompts.push(KeyPrompt.createPrompt(actionKey(GameAction.ATTACK), 'Continue Deeper'));
    } else {
      prompts.push(KeyPrompt.createPrompt(actionKey(GameAction.ATTACK), 'Return'));
    }

    const gap = 12;
    let totalW = 0;
    for (const p of prompts) totalW += p.width;
    totalW += (prompts.length - 1) * gap;

    let ox = Math.floor((GAME_WIDTH - totalW) / 2);
    const py = GAME_HEIGHT - 64;
    for (const p of prompts) {
      p.x = ox;
      p.y = py;
      ox += p.width + gap;
      this.promptContainer.addChild(p);
    }
  }

  private drawHalo(alpha: number): void {
    this.haloGfx.clear();
    const rc = this.rarityColor;
    // Outer soft glow — bigger and brighter for clear visibility.
    this.haloGfx.circle(CX, CY, 90).fill({ color: rc, alpha: alpha * 0.14 });
    this.haloGfx.circle(CX, CY, 64).fill({ color: rc, alpha: alpha * 0.24 });
    this.haloGfx.circle(CX, CY, 44).fill({ color: rc, alpha: alpha * 0.36 });
    // Inner bright core
    this.haloGfx.circle(CX, CY, 28).fill({ color: 0xffffff, alpha: alpha * 0.18 });
    this.haloGfx.alpha = 1;
  }

  private spawnShatter(): void {
    const tier = this.tier;
    const speedBase = tier.particleSpeed;
    // Higher rarity → particles more biased upward (Diablo-style rising sparks).
    const upwardBias = Math.min(1, (tier.particleCount - 8) / 80);
    for (let i = 0; i < tier.particleCount; i++) {
      const gfx = new Graphics();
      const size = 2 + Math.random() * 4;
      const color = Math.random() > 0.4 ? 0xffffff : this.rarityColor;
      gfx.rect(-size / 2, -size / 2, size, size).fill(color);
      gfx.x = CX;
      gfx.y = CY;
      this.container.addChildAt(gfx, this.container.getChildIndex(this.flashOverlay));

      // Upward-biased cone: mostly upper half, wider angles for low rarity.
      const baseAngle = -Math.PI / 2;
      const spread = Math.PI * (1.0 - upwardBias * 0.45);
      const angle = baseAngle + (Math.random() - 0.5) * spread;
      const speed = speedBase * (0.6 + Math.random() * 0.6);
      const life = 500 + Math.random() * 600 + upwardBias * 300;
      this.particles.push({
        gfx,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life,
        maxLife: life,
        rotSpeed: (Math.random() - 0.5) * 8,
      });
    }
  }

  /** Vertical light beam through the icon. Fades up during flash, decays through title. */
  private drawPillar(alpha: number): void {
    this.pillarGfx.clear();
    const tier = this.tier;
    if (tier.pillarWidth <= 0 || alpha <= 0) {
      this.pillarGfx.alpha = 0;
      return;
    }
    const w = tier.pillarWidth;
    const h = tier.pillarHeight;
    const top = CY - h / 2;
    // Layered beam: wide soft outer + narrow bright core + white centerline.
    this.pillarGfx.rect(CX - w, top, w * 2, h).fill({ color: this.rarityColor, alpha: 0.20 });
    this.pillarGfx.rect(CX - w * 0.6, top, w * 1.2, h).fill({ color: this.rarityColor, alpha: 0.42 });
    this.pillarGfx.rect(CX - w * 0.25, top, w * 0.5, h).fill({ color: 0xffffff, alpha: 0.65 });
    this.pillarGfx.alpha = alpha;
  }

  /** Lens-flare burst that emanates FROM the item itself.
   *  Punches hard at burst start, fades out over ~600ms with a slow spin so
   *  the rays sparkle. Distinct from the fullscreen white flash — this stays
   *  localized to the icon and is what reads as "the item is glowing". */
  private drawIconFlare(progress: number): void {
    this.iconFlareGfx.clear();
    if (progress <= 0 || progress >= 1) {
      this.iconFlareGfx.alpha = 0;
      return;
    }
    // Punchy rise (0-15%) then long decay (15-100%).
    const rise = Math.min(1, progress / 0.15);
    const decay = Math.max(0, 1 - (progress - 0.15) / 0.85);
    const k = rise * decay;
    const rc = this.rarityColor;

    // Slow rotation gives the rays a sparkle.
    const rot = progress * Math.PI * 0.6;
    this.iconFlareGfx.x = CX;
    this.iconFlareGfx.y = CY;
    this.iconFlareGfx.rotation = rot;

    // 4 cross rays (horizontal, vertical, two diagonals). Each ray is a
    // pointed diamond — widest at center, tapering to sharp tips at both
    // outer ends. Outer diamond in rarity color + narrow bright core.
    // Length is rarity-driven, plus a small grow-as-it-fades term.
    const len = this.tier.flareLen + (1 - decay) * 60;
    const baseW = 14 * k;                    // outer width pulses with k
    const coreW = 4 * k;
    const rays: number[] = [0, Math.PI / 2, Math.PI / 4, -Math.PI / 4];
    for (const a of rays) {
      const isDiag = a % (Math.PI / 2) !== 0;
      const aLen = isDiag ? len * 0.7 : len;
      const aW = isDiag ? baseW * 0.7 : baseW;
      const aC = isDiag ? coreW * 0.7 : coreW;
      // Local diamond points: (-aLen,0)=tip, (0,-w)=top, (+aLen,0)=tip, (0,+w)=bot
      // Rotated by `da` for the world-space ray direction.
      const da = a - rot;
      const cosA = Math.cos(da);
      const sinA = Math.sin(da);
      // Outer diamond (rarity color)
      this.iconFlareGfx
        .moveTo(-aLen * cosA, -aLen * sinA)
        .lineTo(aW * sinA, -aW * cosA)
        .lineTo(aLen * cosA, aLen * sinA)
        .lineTo(-aW * sinA, aW * cosA)
        .closePath()
        .fill({ color: rc, alpha: 0.55 * k });
      // Bright white core diamond
      this.iconFlareGfx
        .moveTo(-aLen * cosA, -aLen * sinA)
        .lineTo(aC * sinA, -aC * cosA)
        .lineTo(aLen * cosA, aLen * sinA)
        .lineTo(-aC * sinA, aC * cosA)
        .closePath()
        .fill({ color: 0xffffff, alpha: 0.85 * k });
    }

    // Bright nucleus (the item is the source of light).
    this.iconFlareGfx.circle(0, 0, 26 * k).fill({ color: rc, alpha: 0.55 * k });
    this.iconFlareGfx.circle(0, 0, 16 * k).fill({ color: 0xffffff, alpha: 0.85 * k });
    this.iconFlareGfx.circle(0, 0, 6 * k).fill({ color: 0xffffff, alpha: k });

    this.iconFlareGfx.alpha = 1;
  }

  /** Continuous heartbeat waves emanating from behind the icon during idle.
   *  Two staggered rings (offset by 0.5 cycle) cycle radius 30→120 and fade. */
  private drawIdleWave(cycles: number): void {
    this.idleWaveGfx.clear();
    const phases = [
      cycles - Math.floor(cycles),
      (cycles + 0.5) - Math.floor(cycles + 0.5),
    ];
    for (const phase of phases) {
      const radius = 30 + phase * 90;
      const a = (1 - phase) * 0.5;
      this.idleWaveGfx.circle(CX, CY, radius).stroke({ color: this.rarityColor, width: 2, alpha: a });
      this.idleWaveGfx.circle(CX, CY, radius - 1).stroke({ color: 0xffffff, width: 1, alpha: a * 0.6 });
    }
    this.idleWaveGfx.alpha = 1;
  }

  /** Expanding halo rings emanating from icon. Each ring staggered by burst progress. */
  private drawRings(burstMs: number): void {
    this.ringsGfx.clear();
    const tier = this.tier;
    if (tier.ringCount <= 0) {
      this.ringsGfx.alpha = 0;
      return;
    }
    // Each ring runs for ringDuration ms, staggered by stagger ms.
    const ringDuration = 600;
    const stagger = 180;
    let anyVisible = false;
    for (let i = 0; i < tier.ringCount; i++) {
      const localT = burstMs - i * stagger;
      if (localT < 0 || localT > ringDuration) continue;
      const p = localT / ringDuration;
      const radius = 16 + (tier.ringMaxRadius - 16) * p;
      const ringAlpha = (1 - p) * 0.85;
      this.ringsGfx.circle(CX, CY, radius).stroke({ color: this.rarityColor, width: 3, alpha: ringAlpha });
      this.ringsGfx.circle(CX, CY, radius - 1).stroke({ color: 0xffffff, width: 2, alpha: ringAlpha * 0.7 });
      anyVisible = true;
    }
    this.ringsGfx.alpha = anyVisible ? 1 : 0;
  }

  update(dt: number): void {
    this.timer += dt;
    if (this.burstActive) this.burstTimer += dt;

    // Particles — gentler gravity for higher rarity so sparks float longer.
    const gravity = 35 - this.tier.particleCount * 0.12;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        p.gfx.destroy();
        this.particles.splice(i, 1);
        continue;
      }
      const s = dt / 1000;
      p.gfx.x += p.vx * s;
      p.gfx.y += p.vy * s;
      p.vy += gravity * s;
      p.gfx.rotation += p.rotSpeed * s;
      p.gfx.alpha = p.life / p.maxLife;
    }

    // Pillar / rings / tint life-cycle is driven by burstTimer so they
    // persist smoothly across flash → title phases without re-triggering.
    if (this.burstActive) {
      const tier = this.tier;
      // Icon shake — quick decaying jitter for ~300ms after flash trigger.
      // Amplitude scales with rarity so Ancient kicks harder than Normal.
      const shakeMs = 300;
      if (this.burstTimer <= shakeMs) {
        const shakeAmp = 2 + (tier.particleCount / 30);
        const shakeP = 1 - this.burstTimer / shakeMs;
        const ox = (Math.random() - 0.5) * 2 * shakeAmp * shakeP;
        const oy = (Math.random() - 0.5) * 2 * shakeAmp * shakeP;
        this.iconContainer.x = CX + ox;
        this.iconContainer.y = CY + oy;
      } else {
        this.iconContainer.x = CX;
        this.iconContainer.y = CY;
      }
      // Pillar: fast rise (0-150ms), hold during flash, fade through title.
      const pillarTotal = T_FLASH + T_TITLE * 0.6;
      if (tier.pillarWidth > 0 && this.burstTimer <= pillarTotal) {
        const rise = Math.min(1, this.burstTimer / 150);
        const fade = Math.max(0, 1 - Math.max(0, this.burstTimer - T_FLASH * 0.5) / (pillarTotal - T_FLASH * 0.5));
        this.drawPillar(rise * fade * 0.95);
      } else {
        this.drawPillar(0);
      }
      // Rings: staggered expansions, all wrap up within ~1200ms.
      this.drawRings(this.burstTimer);
      // Icon flare: lens-flare burst from the item itself, ~700ms life.
      const flareLife = 700;
      this.drawIconFlare(Math.min(1, this.burstTimer / flareLife));
      // Tint: matches flash decay but with ceiling = tier.tintAlpha.
      if (tier.tintAlpha > 0) {
        const p = Math.min(1, this.burstTimer / T_FLASH);
        this.tintOverlay.alpha = tier.tintAlpha * (1 - p);
      }
      // End burst once everything has decayed.
      if (this.burstTimer > pillarTotal + 200) this.burstActive = false;
    }

    switch (this.phase) {
      case 'dark': {
        const p = Math.min(1, this.timer / T_DARK);
        this.dimOverlay.alpha = p * DIM_ALPHA;
        if (this.timer >= T_DARK) {
          this.dimOverlay.alpha = DIM_ALPHA;
          this.phase = 'pump';
          this.timer = 0;
          this.iconContainer.alpha = 1;
        }
        break;
      }

      case 'pump': {
        const t = this.timer / 1000;
        const pulse = Math.sin(t * PUMP_FREQ * Math.PI * 2);
        const scale = 1.0 + pulse * 0.16 * (1 + t * 0.6);
        this.iconContainer.scale.set(scale);

        // Halo builds
        const hp = Math.min(1, this.timer / T_PUMP);
        this.drawHalo(hp * 0.9);

        if (this.timer >= T_PUMP) {
          this.phase = 'flash';
          this.timer = 0;
          this.iconContainer.scale.set(1.45);
          this.flashOverlay.alpha = this.tier.flashPeak;
          this.spawnShatter();
          this.drawHalo(1.0);
          // Trigger rarity-driven enhancement burst (pillar/rings/tint).
          this.burstActive = true;
          this.burstTimer = 0;
        }
        break;
      }

      case 'flash': {
        const p = Math.min(1, this.timer / T_FLASH);
        this.flashOverlay.alpha = this.tier.flashPeak * (1 - p);
        this.iconContainer.scale.set(1.45 + (1.0 - 1.45) * p);
        this.drawHalo(1.0 - p * 0.4);

        if (this.timer >= T_FLASH) {
          this.flashOverlay.alpha = 0;
          this.iconContainer.scale.set(1.0);
          this.drawHalo(0.6);
          this.phase = 'title';
          this.timer = 0;
        }
        break;
      }

      case 'title':
        this.titleText.alpha = Math.min(1, this.timer / T_TITLE);
        if (this.timer >= T_TITLE) {
          this.titleText.alpha = 1;
          this.phase = 'stats';
          this.timer = 0;
        }
        break;

      case 'stats':
        this.atkText.alpha = Math.min(1, this.timer / 450);
        if (this.timer > 450) {
          this.innocentText.alpha = Math.min(1, (this.timer - 450) / 450);
        }
        if (this.timer >= T_STATS) {
          this.atkText.alpha = 1;
          this.innocentText.alpha = 1;
          this.phase = 'prompt';
          this.timer = 0;
        }
        break;

      case 'prompt':
        this.promptContainer.alpha = Math.min(1, this.timer / T_PROMPT);
        if (this.timer >= T_PROMPT) {
          this.promptContainer.alpha = 1;
          this.phase = 'input';
          this.inputReady = true;
        }
        break;

      case 'input':
        break;
    }

    // Idle pulse — runs from end of flash until C is pressed.
    // Icon stays still. Halo brightness breathes + heartbeat waves emanate
    // from behind the icon so the screen feels "powered" while waiting.
    if (this.phase === 'title' || this.phase === 'stats' ||
        this.phase === 'prompt' || this.phase === 'input') {
      this.idleTimer += dt;
      const t = this.idleTimer / 1000;
      const freq = 0.6; // Hz
      const pulse = Math.sin(t * Math.PI * 2 * freq);
      this.drawHalo(0.55 + pulse * 0.30);
      this.drawIdleWave(t * freq);
    }
  }

  handleInput(attackPressed: boolean, _menuPressed: boolean): void {
    if (!this.inputReady || this._choice) return;
    if (!attackPressed) return;

    // Single-key: C = Continue Deeper when available, otherwise C = Return.
    const canContinue = !this.data.isFinal && this.data.hasNextStratum;
    this._choice = canContinue ? 'continue' : 'exit';
  }

  destroy(): void {
    for (const p of this.particles) p.gfx.destroy();
    this.particles = [];
    this.itemImage.destroy();
    this.container.destroy({ children: true });
  }
}
