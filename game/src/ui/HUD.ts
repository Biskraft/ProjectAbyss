import { Container, Graphics, BitmapText } from 'pixi.js';
import { PIXEL_FONT } from './fonts';
import { KeyPrompt } from './KeyPrompt';

// Base values at 640x360. Multiplied by uiScale for native resolution.
const BASE_W = 640;
const BASE_H = 360;
const BASE_MARGIN = 8;
const BASE_HP_W = 120;
const BASE_HP_H = 10;
const BASE_FLASK_SIZE = 10;
const BASE_FLASK_GAP = 3;
const BASE_FONT = 8;
const BASE_BOSS_W = 200;
const BASE_BOSS_H = 6;

const HP_BORDER_COLOR = 0x444444;
const HP_BG_COLOR = 0x222222;
const HP_COLOR_SAFE = 0x22aa22;
const HP_COLOR_WARN = 0xaaaa22;
const HP_COLOR_DANGER = 0xaa2222;
const FLASK_FULL_COLOR = 0xff8833;
const FLASK_EMPTY_COLOR = 0x444444;
const FLASK_MAX_DISPLAY = 8;

const GHOST_BAR_DURATION = 200;
const HEAL_FLASH_DURATION = 300;
const BOSS_HEAL_FLASH_DURATION = 400;
const LOW_HP_PULSE_PERIOD = 1000;
const HP_TEXT_FLASH_DURATION = 200;

export class HUD {
  container: Container;
  private s: number; // uiScale

  // Scaled constants (computed once in constructor)
  private SW: number; private SH: number;
  private MARGIN: number;
  private HP_W: number; private HP_H: number;
  private HP_X: number; private HP_Y: number;
  private FLASK_SIZE: number; private FLASK_GAP: number;
  private FLASK_Y: number;
  private FONT: number;
  private BOSS_W: number; private BOSS_H: number;
  private BOSS_X: number; private BOSS_Y: number;

  private hpBar: Graphics;
  private hpText: BitmapText;
  private hpTextShadow: BitmapText;
  private atkText: BitmapText;
  private atkTextShadow: BitmapText;
  private goldText: BitmapText;
  private goldTextShadow: BitmapText;
  private floorText: BitmapText;
  private floorTextShadow: BitmapText;
  private flaskGfx: Graphics;

  private currentHp = 0;
  private currentMaxHp = 100;
  private ghostHp = 0;
  private ghostTimer = 0;
  private healFlashTimer = 0;
  private healFlashColor = 0x44ff44;
  private healFlashRatio = 0;
  private healFlashStartRatio = 0;
  private lowHpTimer = 0;
  private hpTextFlashTimer = 0;
  private flaskCurrent = 0;
  private flaskMax = 3;

  private flaskKeyLabel: Container;
  private actionKeyBar: Container;

  private vignette: Graphics;
  private vignetteTimer = 0;

  // Boss HP bar
  private bossBarContainer: Container;
  private bossBar: Graphics;
  private bossNameText: BitmapText;
  private bossNameShadow: BitmapText;
  private bossHp = 0;
  private bossMaxHp = 0;

  constructor(uiScale = 1) {
    this.s = uiScale;
    this.container = new Container();

    // Pre-compute all scaled constants
    const s = uiScale;
    this.SW = BASE_W * s;
    this.SH = BASE_H * s;
    this.MARGIN = BASE_MARGIN * s;
    this.HP_W = BASE_HP_W * s;
    this.HP_H = BASE_HP_H * s;
    this.HP_X = this.MARGIN;
    this.HP_Y = this.MARGIN;
    this.FLASK_SIZE = BASE_FLASK_SIZE * s;
    this.FLASK_GAP = BASE_FLASK_GAP * s;
    this.FLASK_Y = this.HP_Y + this.HP_H + 2 * s;
    this.FONT = BASE_FONT * s;
    this.BOSS_W = BASE_BOSS_W * s;
    this.BOSS_H = BASE_BOSS_H * s;
    this.BOSS_X = (this.SW - this.BOSS_W) / 2;
    this.BOSS_Y = (BASE_H - 22) * s; // 338 * s

    // --- HP bar ---
    this.hpBar = new Graphics();
    this.hpBar.x = this.HP_X;
    this.hpBar.y = this.HP_Y;
    this.container.addChild(this.hpBar);

    // --- Flask icons ---
    this.flaskGfx = new Graphics();
    this.flaskGfx.x = this.HP_X;
    this.flaskGfx.y = this.FLASK_Y;
    this.container.addChild(this.flaskGfx);

    // --- HP text with shadow ---
    this.hpTextShadow = new BitmapText({ text: '', style: { fontFamily: PIXEL_FONT, fontSize: this.FONT, fill: 0x000000 } });
    this.hpText = new BitmapText({ text: '', style: { fontFamily: PIXEL_FONT, fontSize: this.FONT, fill: 0xffffff } });
    this.hpTextShadow.x = this.HP_X + 44 * s + s;
    this.hpTextShadow.y = this.FLASK_Y + s;
    this.hpText.x = this.HP_X + 44 * s;
    this.hpText.y = this.FLASK_Y;
    this.container.addChild(this.hpTextShadow);
    this.container.addChild(this.hpText);

    // --- ATK text — below flask row, 2x font size ---
    const ATK_FONT = 16 * s;
    const ATK_Y = this.FLASK_Y + this.FLASK_SIZE + 4 * s;
    this.atkTextShadow = new BitmapText({ text: '', style: { fontFamily: PIXEL_FONT, fontSize: ATK_FONT, fill: 0x000000 } });
    this.atkText = new BitmapText({ text: '', style: { fontFamily: PIXEL_FONT, fontSize: ATK_FONT, fill: 0xff8833 } });
    this.atkTextShadow.x = this.HP_X + s;
    this.atkTextShadow.y = ATK_Y + s;
    this.atkText.x = this.HP_X;
    this.atkText.y = ATK_Y;
    this.container.addChild(this.atkTextShadow);
    this.container.addChild(this.atkText);

    // --- Gold text — right-aligned ---
    this.goldTextShadow = new BitmapText({ text: 'G 0', style: { fontFamily: PIXEL_FONT, fontSize: this.FONT, fill: 0x000000 } });
    this.goldText = new BitmapText({ text: 'G 0', style: { fontFamily: PIXEL_FONT, fontSize: this.FONT, fill: 0xffd700 } });
    this.goldTextShadow.anchor.set(1, 0);
    this.goldText.anchor.set(1, 0);
    this.goldTextShadow.x = this.SW - this.MARGIN + s;
    this.goldTextShadow.y = this.MARGIN + s;
    this.goldText.x = this.SW - this.MARGIN;
    this.goldText.y = this.MARGIN;
    this.container.addChild(this.goldTextShadow);
    this.container.addChild(this.goldText);

    // --- Key icon shared sizes ---
    const KEY_ICON = 12 * s;  // icon box size
    const KEY_FONT = 8 * s;   // label font next to icon
    const KEY_LABEL_COLOR = 0xaaaaaa;

    // --- Action key bar: [Z]Jump [X]Atk [C]Dash — bottom-left (above floor text) ---
    this.actionKeyBar = new Container();
    const ACTION_BAR_Y = this.SH - this.MARGIN - this.FONT - 4 * s - KEY_ICON;
    const actions: Array<{ key: string; label: string }> = [
      { key: 'Z', label: 'Jump' },
      { key: 'X', label: 'Atk' },
      { key: 'C', label: 'Dash' },
    ];
    let actionX = this.MARGIN;
    for (const a of actions) {
      const icon = KeyPrompt.createKeyIcon(a.key, KEY_ICON);
      icon.x = actionX;
      icon.y = ACTION_BAR_Y;
      this.actionKeyBar.addChild(icon);

      const text = new BitmapText({
        text: a.label,
        style: { fontFamily: PIXEL_FONT, fontSize: KEY_FONT, fill: KEY_LABEL_COLOR },
      });
      text.x = actionX + KEY_ICON + 2 * s;
      text.y = ACTION_BAR_Y + Math.floor((KEY_ICON - text.height) / 2);
      this.actionKeyBar.addChild(text);

      actionX += KEY_ICON + 2 * s + text.width + 8 * s;
    }
    this.container.addChild(this.actionKeyBar);

    // --- Floor/Item text — very bottom-left ---
    this.floorTextShadow = new BitmapText({ text: '', style: { fontFamily: PIXEL_FONT, fontSize: this.FONT, fill: 0x000000 } });
    this.floorText = new BitmapText({ text: '', style: { fontFamily: PIXEL_FONT, fontSize: this.FONT, fill: 0xffffff } });
    this.floorTextShadow.x = this.MARGIN + s;
    this.floorTextShadow.y = this.SH - this.MARGIN - this.FONT + s;
    this.floorText.x = this.MARGIN;
    this.floorText.y = this.SH - this.MARGIN - this.FONT;
    this.container.addChild(this.floorTextShadow);
    this.container.addChild(this.floorText);

    // --- Damage vignette ---
    this.vignette = new Graphics();
    this.vignette.alpha = 0;
    this.container.addChild(this.vignette);

    // --- Flask [R] key label (same height as flask icons) ---
    this.flaskKeyLabel = KeyPrompt.createKeyIcon('R', this.FLASK_SIZE);
    this.flaskKeyLabel.x = this.HP_X;
    this.flaskKeyLabel.y = this.FLASK_Y;
    this.container.addChild(this.flaskKeyLabel);

    // --- [I]Item [M]Map — top-right, below minimap ---
    const sideKeyY = this.MARGIN + 72 * s + 6 * s; // below minimap
    const sideActions: Array<{ key: string; label: string }> = [
      { key: 'I', label: 'Item' },
      { key: 'M', label: 'Map' },
    ];
    let sideX = this.SW - this.MARGIN;
    for (let i = sideActions.length - 1; i >= 0; i--) {
      const a = sideActions[i];
      const lbl = new BitmapText({
        text: a.label,
        style: { fontFamily: PIXEL_FONT, fontSize: KEY_FONT, fill: KEY_LABEL_COLOR },
      });
      sideX -= lbl.width;
      lbl.x = sideX;
      lbl.y = sideKeyY + Math.floor((KEY_ICON - lbl.height) / 2);
      this.container.addChild(lbl);

      sideX -= 2 * s + KEY_ICON;
      const icon = KeyPrompt.createKeyIcon(a.key, KEY_ICON);
      icon.x = sideX;
      icon.y = sideKeyY;
      this.container.addChild(icon);

      sideX -= 8 * s;
    }

    // --- Boss HP bar (hidden by default) ---
    this.bossBarContainer = new Container();
    this.bossBarContainer.visible = false;
    this.bossBar = new Graphics();
    this.bossBar.x = this.BOSS_X;
    this.bossBar.y = this.BOSS_Y;
    this.bossNameShadow = new BitmapText({ text: '', style: { fontFamily: PIXEL_FONT, fontSize: this.FONT, fill: 0x000000 } });
    this.bossNameText = new BitmapText({ text: '', style: { fontFamily: PIXEL_FONT, fontSize: this.FONT, fill: 0xffffff } });
    this.bossNameShadow.anchor.set(0.5, 0);
    this.bossNameText.anchor.set(0.5, 0);
    this.bossNameShadow.x = this.SW / 2 + s;
    this.bossNameShadow.y = this.BOSS_Y - 10 * s + s;
    this.bossNameText.x = this.SW / 2;
    this.bossNameText.y = this.BOSS_Y - 10 * s;
    this.bossBarContainer.addChild(this.bossBar);
    this.bossBarContainer.addChild(this.bossNameShadow);
    this.bossBarContainer.addChild(this.bossNameText);
    this.container.addChild(this.bossBarContainer);
  }

  // ----- Public API -----

  updateHP(hp: number, maxHp: number): void {
    const prevHp = this.currentHp;
    this.currentHp = hp;
    this.currentMaxHp = maxHp;

    if (hp < prevHp && prevHp > 0) {
      this.ghostHp = prevHp;
      this.ghostTimer = GHOST_BAR_DURATION;
    }
    if (hp > prevHp && prevHp > 0) {
      this.healFlashStartRatio = prevHp / maxHp;
      this.healFlashRatio = hp / maxHp;
      this.healFlashTimer = HEAL_FLASH_DURATION;
      this.healFlashColor = 0x44ff44;
    }

    this.redrawHpBar();
    const hpStr = `${Math.ceil(hp)}/${maxHp}`;
    this.hpText.text = hpStr;
    this.hpTextShadow.text = hpStr;

    if (hp < prevHp && prevHp > 0) {
      this.hpTextFlashTimer = HP_TEXT_FLASH_DURATION;
      this.hpText.tint = 0xff4444;
    }
  }

  updateFlask(current: number, max: number): void {
    this.flaskCurrent = current;
    this.flaskMax = max;
    this.redrawFlask();

    const totalFlaskW = Math.min(max, FLASK_MAX_DISPLAY) * (this.FLASK_SIZE + this.FLASK_GAP);
    // [R] key label sits right of the flask icons
    this.flaskKeyLabel.x = this.HP_X + totalFlaskW + 2 * this.s;
    this.flaskKeyLabel.y = this.FLASK_Y;
    // HP text follows after the [R] label
    this.hpText.x = this.HP_X + totalFlaskW + 2 * this.s + this.FLASK_SIZE + 4 * this.s;
    this.hpTextShadow.x = this.hpText.x + this.s;
    // Dim [R] label when no flasks remain
    this.flaskKeyLabel.alpha = current <= 0 ? 0.4 : 1.0;
  }

  updateATK(atk: number): void {
    const str = `ATK ${atk}`;
    this.atkText.text = str;
    this.atkTextShadow.text = str;
  }

  updateGold(gold: number): void {
    const str = `G ${gold}`;
    this.goldText.text = str;
    this.goldTextShadow.text = str;
  }

  setFloorText(text: string): void {
    this.floorText.text = text;
    this.floorTextShadow.text = text;
  }

  flashHeal(amount: number): void {
    const startRatio = Math.max(0, (this.currentHp - amount) / this.currentMaxHp);
    this.healFlashStartRatio = startRatio;
    this.healFlashRatio = this.currentHp / this.currentMaxHp;
    this.healFlashTimer = HEAL_FLASH_DURATION;
    this.healFlashColor = 0x44ff44;
  }

  flashBossHeal(): void {
    this.healFlashStartRatio = Math.max(0, (this.currentHp - this.currentMaxHp * 0.3) / this.currentMaxHp);
    this.healFlashRatio = this.currentHp / this.currentMaxHp;
    this.healFlashTimer = BOSS_HEAL_FLASH_DURATION;
    this.healFlashColor = 0xffd700;
  }

  flashDamage(): void {
    this.vignetteTimer = 100;
  }

  setGoldBelowMinimap(below: boolean): void {
    // When minimap visible: gold goes below minimap + [I][M] row
    // minimap=72*s, gap=6*s, keyIcon=10*s, gap=4*s
    const y = below ? (this.MARGIN + 72 * this.s + 6 * this.s + 10 * this.s + 4 * this.s) : this.MARGIN;
    this.goldText.y = y;
    this.goldTextShadow.y = y + this.s;
  }

  // --- Boss HP bar ---
  showBossHP(name: string, hp: number, maxHp: number): void {
    this.bossHp = hp;
    this.bossMaxHp = maxHp;
    this.bossNameText.text = name;
    this.bossNameShadow.text = name;
    this.bossBarContainer.visible = true;
    this.redrawBossBar();
  }

  updateBossHP(hp: number): void {
    this.bossHp = Math.max(0, hp);
    this.redrawBossBar();
  }

  hideBossHP(): void {
    this.bossBarContainer.visible = false;
  }

  update(dt: number): void {
    if (this.ghostTimer > 0) {
      this.ghostTimer -= dt;
      if (this.ghostTimer <= 0) { this.ghostHp = 0; this.ghostTimer = 0; }
      this.redrawHpBar();
    }
    if (this.healFlashTimer > 0) {
      this.healFlashTimer -= dt;
      if (this.healFlashTimer <= 0) this.healFlashTimer = 0;
      this.redrawHpBar();
    }
    const ratio = this.currentMaxHp > 0 ? this.currentHp / this.currentMaxHp : 1;
    if (ratio > 0 && ratio < 0.25) {
      this.lowHpTimer = (this.lowHpTimer + dt) % LOW_HP_PULSE_PERIOD;
      this.redrawHpBar();
    } else {
      this.lowHpTimer = 0;
    }
    if (this.hpTextFlashTimer > 0) {
      this.hpTextFlashTimer -= dt;
      if (this.hpTextFlashTimer <= 0) { this.hpTextFlashTimer = 0; this.hpText.tint = 0xffffff; }
    }
    if (this.vignetteTimer > 0) {
      this.vignetteTimer -= dt;
      const a = Math.max(0, this.vignetteTimer / 100) * 0.3;
      this.drawVignette(a);
    } else if (this.vignette.alpha > 0) {
      this.vignette.alpha = 0;
    }
  }

  // ----- Private -----

  private redrawHpBar(): void {
    const g = this.hpBar;
    g.clear();
    const W = this.HP_W;
    const H = this.HP_H;
    const maxHp = this.currentMaxHp || 1;
    const ratio = Math.max(0, Math.min(1, this.currentHp / maxHp));

    g.rect(-this.s, -this.s, W + 2 * this.s, H + 2 * this.s).fill(HP_BORDER_COLOR);
    g.rect(0, 0, W, H).fill(HP_BG_COLOR);

    if (this.ghostTimer > 0 && this.ghostHp > this.currentHp) {
      const ghostRatio = Math.min(1, this.ghostHp / maxHp);
      const ghostAlpha = this.ghostTimer / GHOST_BAR_DURATION;
      g.rect(0, 0, W * ghostRatio, H).fill({ color: 0xaa2222, alpha: ghostAlpha * 0.8 });
    }
    if (this.healFlashTimer > 0) {
      const dur = this.healFlashColor === 0xffd700 ? BOSS_HEAL_FLASH_DURATION : HEAL_FLASH_DURATION;
      const flashAlpha = this.healFlashTimer / dur;
      const x0 = W * Math.max(0, this.healFlashStartRatio);
      const x1 = W * Math.min(1, this.healFlashRatio);
      if (x1 > x0) g.rect(x0, 0, x1 - x0, H).fill({ color: this.healFlashColor, alpha: flashAlpha * 0.9 });
    }

    let hpColor = ratio > 0.5 ? HP_COLOR_SAFE : ratio > 0.25 ? HP_COLOR_WARN : HP_COLOR_DANGER;
    let fillAlpha = 1;
    if (ratio > 0 && ratio < 0.25 && this.lowHpTimer > 0) {
      const pulse = Math.sin((this.lowHpTimer / LOW_HP_PULSE_PERIOD) * Math.PI * 2);
      fillAlpha = 0.7 + 0.3 * ((pulse + 1) / 2);
    }
    g.rect(0, 0, W * ratio, H).fill({ color: hpColor, alpha: fillAlpha });
  }

  private redrawFlask(): void {
    const g = this.flaskGfx;
    g.clear();
    const count = Math.min(this.flaskMax, FLASK_MAX_DISPLAY);
    for (let i = 0; i < count; i++) {
      const x = i * (this.FLASK_SIZE + this.FLASK_GAP);
      const color = i < this.flaskCurrent ? FLASK_FULL_COLOR : FLASK_EMPTY_COLOR;
      const cx = x + this.FLASK_SIZE / 2;
      const cy = this.FLASK_SIZE / 2;
      g.circle(cx, cy, this.FLASK_SIZE / 2).fill(color);
    }
  }

  private redrawBossBar(): void {
    const g = this.bossBar;
    g.clear();
    const W = this.BOSS_W;
    const H = this.BOSS_H;
    const maxHp = this.bossMaxHp || 1;
    const ratio = Math.max(0, Math.min(1, this.bossHp / maxHp));

    g.rect(-this.s, -this.s, W + 2 * this.s, H + 2 * this.s).fill(HP_BORDER_COLOR);
    g.rect(0, 0, W, H).fill(HP_BG_COLOR);
    const color = ratio > 0.5 ? 0xcc4444 : ratio > 0.25 ? 0xcc6622 : 0xcc2222;
    g.rect(0, 0, W * ratio, H).fill(color);
  }

  private drawVignette(alpha: number): void {
    this.vignette.clear();
    if (alpha <= 0) { this.vignette.alpha = 0; return; }
    this.vignette.alpha = 1;
    const M = this.MARGIN;
    const c = { color: 0xaa0000, alpha };
    this.vignette.rect(0, 0, this.SW, M).fill(c);
    this.vignette.rect(0, this.SH - M, this.SW, M).fill(c);
    this.vignette.rect(0, 0, M, this.SH).fill(c);
    this.vignette.rect(this.SW - M, 0, M, this.SH).fill(c);
  }
}
