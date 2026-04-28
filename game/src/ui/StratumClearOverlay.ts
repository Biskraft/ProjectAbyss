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
import { HudConst } from '@data/constData';

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

// Flash + shatter
const FLASH_PEAK = 0.85;
const SHATTER_COUNT = HudConst.StratumClear.ShatterCount;

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

  private rarityColor: number;

  // Result
  private _choice: 'continue' | 'exit' | null = null;
  get choice(): 'continue' | 'exit' | null { return this._choice; }
  get isDone(): boolean { return this._choice !== null; }

  constructor(data: StratumClearData) {
    this.data = data;
    this.rarityColor = RARITY_COLOR[data.item.rarity];
    this.container = new Container();
    this.container.eventMode = 'none';

    // ── Dim background ──
    this.dimOverlay = new Graphics();
    this.dimOverlay.rect(0, 0, GAME_WIDTH, GAME_HEIGHT).fill({ color: MODAL_OVERLAY, alpha: 1 });
    this.dimOverlay.alpha = 0;
    this.container.addChild(this.dimOverlay);

    // ── Rarity halo (glow behind icon) ──
    this.haloGfx = new Graphics();
    this.haloGfx.alpha = 0;
    this.container.addChild(this.haloGfx);

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

    // Key assignment is consistent across stratum states so the player never
    // hits a key bound to a different action than expected:
    //   ATTACK (C) — only ever does "Continue Deeper" (hidden if unavailable)
    //   MENU  (ESC) — always "Return"
    // Effective mapping: mid strata use C/ESC, final clear uses C to return.
    const prompts: Container[] = [];
    if (d.isFinal) {
      prompts.push(KeyPrompt.createPrompt(actionKey(GameAction.ATTACK), 'Return'));
    } else {
      if (d.hasNextStratum) {
        prompts.push(KeyPrompt.createPrompt(actionKey(GameAction.ATTACK), 'Continue Deeper'));
      }
      prompts.push(KeyPrompt.createPrompt(actionKey(GameAction.MENU), 'Return'));
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
    const r = (rc >> 16) & 0xff;
    const g = (rc >> 8) & 0xff;
    const b = rc & 0xff;
    // Outer soft glow
    this.haloGfx.circle(CX, CY, 52).fill({ color: rc, alpha: alpha * 0.12 });
    this.haloGfx.circle(CX, CY, 40).fill({ color: rc, alpha: alpha * 0.18 });
    // Inner bright core
    this.haloGfx.circle(CX, CY, 28).fill({ color: 0xffffff, alpha: alpha * 0.06 });
    this.haloGfx.alpha = 1;
  }

  private spawnShatter(): void {
    for (let i = 0; i < SHATTER_COUNT; i++) {
      const gfx = new Graphics();
      const size = 1 + Math.random() * 3;
      // Mix rarity color + white
      const color = Math.random() > 0.4 ? 0xffffff : this.rarityColor;
      gfx.rect(-size / 2, -size / 2, size, size).fill(color);
      gfx.x = CX;
      gfx.y = CY;
      this.container.addChildAt(gfx, this.container.getChildIndex(this.flashOverlay));

      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 100;
      const life = 400 + Math.random() * 500;
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

  update(dt: number): void {
    this.timer += dt;

    // Particles
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
      p.vy += 60 * s;
      p.gfx.rotation += p.rotSpeed * s;
      p.gfx.alpha = p.life / p.maxLife;
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
        const scale = 1.0 + pulse * 0.08 * (1 + t * 0.5);
        this.iconContainer.scale.set(scale);

        // Halo builds
        const hp = Math.min(1, this.timer / T_PUMP);
        this.drawHalo(hp * 0.7);

        if (this.timer >= T_PUMP) {
          this.phase = 'flash';
          this.timer = 0;
          this.iconContainer.scale.set(1.12);
          this.flashOverlay.alpha = FLASH_PEAK;
          this.spawnShatter();
          this.drawHalo(1.0);
        }
        break;
      }

      case 'flash': {
        const p = Math.min(1, this.timer / T_FLASH);
        this.flashOverlay.alpha = FLASH_PEAK * (1 - p);
        this.iconContainer.scale.set(1.12 + (1.0 - 1.12) * p);
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
  }

  handleInput(attackPressed: boolean, menuPressed: boolean): void {
    if (!this.inputReady || this._choice) return;

    // Mid strata: C continues and ESC exits. Final clear: C returns.
    const canContinue = !this.data.isFinal && this.data.hasNextStratum;
    if (attackPressed && this.data.isFinal) {
      this._choice = 'exit';
    } else if (attackPressed && canContinue) {
      this._choice = 'continue';
    } else if (menuPressed && !this.data.isFinal) {
      this._choice = 'exit';
    }
  }

  destroy(): void {
    for (const p of this.particles) p.gfx.destroy();
    this.particles = [];
    this.itemImage.destroy();
    this.container.destroy({ children: true });
  }
}
