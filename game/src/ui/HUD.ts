import { Container, Graphics, BitmapText } from 'pixi.js';
import { PIXEL_FONT } from './fonts';

const SCREEN_W = 640;
const SCREEN_H = 360;

// --- P0: Safe-zone margins (CK-01) ---
const MARGIN = 8;

// --- P0: HP bar (CK-02) --- 100x8 = 15.6% screen width
const HP_BAR_W = 100;
const HP_BAR_H = 8;
const HP_BAR_X = MARGIN;
const HP_BAR_Y = MARGIN;
const HP_BORDER_COLOR = 0x444444;
const HP_BG_COLOR = 0x222222;

// --- P0: Flask icons (CK-04) --- 8px minimum
const FLASK_ICON_SIZE = 8;
const FLASK_ICON_GAP = 2;
const FLASK_Y = HP_BAR_Y + HP_BAR_H + 2; // 18
const FLASK_FULL_COLOR = 0xff8833;
const FLASK_EMPTY_COLOR = 0x444444;
const FLASK_MAX_DISPLAY = 8;

// HP colors by ratio
const HP_COLOR_SAFE = 0x22aa22;
const HP_COLOR_WARN = 0xaaaa22;
const HP_COLOR_DANGER = 0xaa2222;

// --- P1: Effect timings (CK-09) ---
const GHOST_BAR_DURATION = 200;
const HEAL_FLASH_DURATION = 300;
const BOSS_HEAL_FLASH_DURATION = 400; // P1: 500->400
const LOW_HP_PULSE_PERIOD = 1000;
const HP_TEXT_FLASH_DURATION = 200; // P1: replaces setTimeout

// --- P2: Boss HP bar (CK-11) ---
const BOSS_BAR_W = 200;
const BOSS_BAR_H = 6;
const BOSS_BAR_X = (SCREEN_W - BOSS_BAR_W) / 2; // centered = 220
const BOSS_BAR_Y = 338;

export class HUD {
  container: Container;
  private hpBar: Graphics;
  private hpText: BitmapText;
  private hpTextShadow: BitmapText;
  private goldText: BitmapText;
  private goldTextShadow: BitmapText;
  private floorText: BitmapText;
  private floorTextShadow: BitmapText;
  private flaskGfx: Graphics;

  // State tracking for effects
  private currentHp = 0;
  private currentMaxHp = 100;
  private ghostHp = 0;
  private ghostTimer = 0;
  private healFlashTimer = 0;
  private healFlashColor = 0x44ff44;
  private healFlashRatio = 0;
  private healFlashStartRatio = 0;
  private lowHpTimer = 0;

  // P1: Game-loop HP text flash (replaces setTimeout)
  private hpTextFlashTimer = 0;

  // Flask state
  private flaskCurrent = 0;
  private flaskMax = 3;

  // Damage vignette
  private vignette: Graphics;
  private vignetteTimer = 0;

  // P2: Boss HP bar
  private bossBarContainer: Container;
  private bossBar: Graphics;
  private bossNameText: BitmapText;
  private bossNameShadow: BitmapText;
  private bossHp = 0;
  private bossMaxHp = 0;
  private bossVisible = false;

  constructor() {
    this.container = new Container();

    // --- HP bar ---
    this.hpBar = new Graphics();
    this.hpBar.x = HP_BAR_X;
    this.hpBar.y = HP_BAR_Y;
    this.container.addChild(this.hpBar);

    // --- Flask icons ---
    this.flaskGfx = new Graphics();
    this.flaskGfx.x = HP_BAR_X;
    this.flaskGfx.y = FLASK_Y;
    this.container.addChild(this.flaskGfx);

    // --- HP text with shadow (P1: CK-07) ---
    this.hpTextShadow = new BitmapText({ text: '', style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0x000000 } });
    this.hpText = new BitmapText({ text: '', style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0xffffff } });
    this.hpTextShadow.x = HP_BAR_X + 44 + 1;
    this.hpTextShadow.y = FLASK_Y + 1;
    this.hpText.x = HP_BAR_X + 44;
    this.hpText.y = FLASK_Y;
    this.container.addChild(this.hpTextShadow);
    this.container.addChild(this.hpText);

    // --- Gold text with shadow — right-aligned (P0: margin 8px) ---
    this.goldTextShadow = new BitmapText({ text: 'G 0', style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0x000000 } });
    this.goldText = new BitmapText({ text: 'G 0', style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0xffd700 } });
    this.goldTextShadow.anchor.set(1, 0);
    this.goldText.anchor.set(1, 0);
    this.goldTextShadow.x = SCREEN_W - MARGIN + 1;
    this.goldTextShadow.y = MARGIN + 1;
    this.goldText.x = SCREEN_W - MARGIN; // 632
    this.goldText.y = MARGIN; // 8
    this.container.addChild(this.goldTextShadow);
    this.container.addChild(this.goldText);

    // --- Floor/Item text with shadow — bottom-left (P0: y=344) ---
    this.floorTextShadow = new BitmapText({ text: '', style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0x000000 } });
    this.floorText = new BitmapText({ text: '', style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0xffffff } });
    this.floorTextShadow.x = MARGIN + 1;
    this.floorTextShadow.y = SCREEN_H - MARGIN - 8 + 1; // 344+1
    this.floorText.x = MARGIN;
    this.floorText.y = SCREEN_H - MARGIN - 8; // 344
    this.container.addChild(this.floorTextShadow);
    this.container.addChild(this.floorText);

    // --- Damage vignette overlay ---
    this.vignette = new Graphics();
    this.vignette.alpha = 0;
    this.container.addChild(this.vignette);

    // --- P2: Boss HP bar container (hidden by default) ---
    this.bossBarContainer = new Container();
    this.bossBarContainer.visible = false;
    this.bossBar = new Graphics();
    this.bossBar.x = BOSS_BAR_X;
    this.bossBar.y = BOSS_BAR_Y;
    this.bossNameShadow = new BitmapText({ text: '', style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0x000000 } });
    this.bossNameText = new BitmapText({ text: '', style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0xffffff } });
    this.bossNameShadow.anchor.set(0.5, 0);
    this.bossNameText.anchor.set(0.5, 0);
    this.bossNameShadow.x = SCREEN_W / 2 + 1;
    this.bossNameShadow.y = BOSS_BAR_Y - 10 + 1;
    this.bossNameText.x = SCREEN_W / 2;
    this.bossNameText.y = BOSS_BAR_Y - 10;
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

    // Detect damage -> start ghost bar
    if (hp < prevHp && prevHp > 0) {
      this.ghostHp = prevHp;
      this.ghostTimer = GHOST_BAR_DURATION;
    }

    // Detect heal -> start heal flash
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

    // P1: HP text flash red on damage (game-loop timer, not setTimeout)
    if (hp < prevHp && prevHp > 0) {
      this.hpTextFlashTimer = HP_TEXT_FLASH_DURATION;
      this.hpText.tint = 0xff4444;
    }
  }

  updateFlask(current: number, max: number): void {
    this.flaskCurrent = current;
    this.flaskMax = max;
    this.redrawFlask();

    // Reposition HP text after flask icons
    const totalFlaskW = max * (FLASK_ICON_SIZE + FLASK_ICON_GAP);
    this.hpText.x = HP_BAR_X + totalFlaskW + 4;
    this.hpTextShadow.x = HP_BAR_X + totalFlaskW + 4 + 1;
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

  /** Trigger green heal flash manually (for combo heal) */
  flashHeal(amount: number): void {
    const startRatio = Math.max(0, (this.currentHp - amount) / this.currentMaxHp);
    this.healFlashStartRatio = startRatio;
    this.healFlashRatio = this.currentHp / this.currentMaxHp;
    this.healFlashTimer = HEAL_FLASH_DURATION;
    this.healFlashColor = 0x44ff44;
  }

  /** Trigger gold flash for boss clear heal */
  flashBossHeal(): void {
    this.healFlashStartRatio = Math.max(0, (this.currentHp - this.currentMaxHp * 0.3) / this.currentMaxHp);
    this.healFlashRatio = this.currentHp / this.currentMaxHp;
    this.healFlashTimer = BOSS_HEAL_FLASH_DURATION;
    this.healFlashColor = 0xffd700;
  }

  /** Trigger red vignette on damage */
  flashDamage(): void {
    this.vignetteTimer = 100;
  }

  /** Move gold text below minimap area (call when minimap is visible). */
  setGoldBelowMinimap(below: boolean): void {
    const y = below ? (MARGIN + 72 + 4) : MARGIN; // 8+72+4=84 when minimap present
    this.goldText.y = y;
    this.goldTextShadow.y = y + 1;
  }

  // --- P2: Boss HP bar ---

  /** Show boss HP bar with name. Call when boss encounter starts. */
  showBossHP(name: string, hp: number, maxHp: number): void {
    this.bossVisible = true;
    this.bossHp = hp;
    this.bossMaxHp = maxHp;
    this.bossNameText.text = name;
    this.bossNameShadow.text = name;
    this.bossBarContainer.visible = true;
    this.redrawBossBar();
  }

  /** Update boss HP (call each frame during boss fight). */
  updateBossHP(hp: number): void {
    this.bossHp = Math.max(0, hp);
    this.redrawBossBar();
  }

  /** Hide boss HP bar. Call when boss is defeated. */
  hideBossHP(): void {
    this.bossVisible = false;
    this.bossBarContainer.visible = false;
  }

  /** Must be called every frame */
  update(dt: number): void {
    // Ghost bar decay
    if (this.ghostTimer > 0) {
      this.ghostTimer -= dt;
      if (this.ghostTimer <= 0) {
        this.ghostHp = 0;
        this.ghostTimer = 0;
      }
      this.redrawHpBar();
    }

    // Heal flash decay
    if (this.healFlashTimer > 0) {
      this.healFlashTimer -= dt;
      if (this.healFlashTimer <= 0) this.healFlashTimer = 0;
      this.redrawHpBar();
    }

    // Low HP pulse
    const ratio = this.currentMaxHp > 0 ? this.currentHp / this.currentMaxHp : 1;
    if (ratio > 0 && ratio < 0.25) {
      this.lowHpTimer = (this.lowHpTimer + dt) % LOW_HP_PULSE_PERIOD;
      this.redrawHpBar();
    } else {
      this.lowHpTimer = 0;
    }

    // P1: HP text flash timer (replaces setTimeout)
    if (this.hpTextFlashTimer > 0) {
      this.hpTextFlashTimer -= dt;
      if (this.hpTextFlashTimer <= 0) {
        this.hpTextFlashTimer = 0;
        this.hpText.tint = 0xffffff;
      }
    }

    // Vignette fade
    if (this.vignetteTimer > 0) {
      this.vignetteTimer -= dt;
      const a = Math.max(0, this.vignetteTimer / 100) * 0.3;
      this.drawVignette(a);
    } else if (this.vignette.alpha > 0) {
      this.vignette.alpha = 0;
    }
  }

  // ----- Private rendering -----

  private redrawHpBar(): void {
    const g = this.hpBar;
    g.clear();

    const maxHp = this.currentMaxHp || 1;
    const ratio = Math.max(0, Math.min(1, this.currentHp / maxHp));

    // Border
    g.rect(-1, -1, HP_BAR_W + 2, HP_BAR_H + 2).fill(HP_BORDER_COLOR);
    // Background
    g.rect(0, 0, HP_BAR_W, HP_BAR_H).fill(HP_BG_COLOR);

    // Ghost bar (red, behind current HP)
    if (this.ghostTimer > 0 && this.ghostHp > this.currentHp) {
      const ghostRatio = Math.min(1, this.ghostHp / maxHp);
      const ghostAlpha = this.ghostTimer / GHOST_BAR_DURATION;
      g.rect(0, 0, HP_BAR_W * ghostRatio, HP_BAR_H).fill({ color: 0xaa2222, alpha: ghostAlpha * 0.8 });
    }

    // Heal flash overlay
    if (this.healFlashTimer > 0) {
      const flashAlpha = this.healFlashTimer / (this.healFlashColor === 0xffd700 ? BOSS_HEAL_FLASH_DURATION : HEAL_FLASH_DURATION);
      const x0 = HP_BAR_W * Math.max(0, this.healFlashStartRatio);
      const x1 = HP_BAR_W * Math.min(1, this.healFlashRatio);
      if (x1 > x0) {
        g.rect(x0, 0, x1 - x0, HP_BAR_H).fill({ color: this.healFlashColor, alpha: flashAlpha * 0.9 });
      }
    }

    // Current HP fill
    let hpColor: number;
    if (ratio > 0.5) {
      hpColor = HP_COLOR_SAFE;
    } else if (ratio > 0.25) {
      hpColor = HP_COLOR_WARN;
    } else {
      hpColor = HP_COLOR_DANGER;
    }

    // Low HP pulse brightness
    let fillAlpha = 1;
    if (ratio > 0 && ratio < 0.25 && this.lowHpTimer > 0) {
      const pulse = Math.sin((this.lowHpTimer / LOW_HP_PULSE_PERIOD) * Math.PI * 2);
      fillAlpha = 0.7 + 0.3 * ((pulse + 1) / 2);
    }

    g.rect(0, 0, HP_BAR_W * ratio, HP_BAR_H).fill({ color: hpColor, alpha: fillAlpha });
  }

  private redrawFlask(): void {
    const g = this.flaskGfx;
    g.clear();

    const count = Math.min(this.flaskMax, FLASK_MAX_DISPLAY);
    for (let i = 0; i < count; i++) {
      const x = i * (FLASK_ICON_SIZE + FLASK_ICON_GAP);
      const color = i < this.flaskCurrent ? FLASK_FULL_COLOR : FLASK_EMPTY_COLOR;
      const cx = x + FLASK_ICON_SIZE / 2;
      const cy = FLASK_ICON_SIZE / 2;
      g.circle(cx, cy, FLASK_ICON_SIZE / 2).fill(color);
    }
  }

  private redrawBossBar(): void {
    const g = this.bossBar;
    g.clear();

    const maxHp = this.bossMaxHp || 1;
    const ratio = Math.max(0, Math.min(1, this.bossHp / maxHp));

    // Border
    g.rect(-1, -1, BOSS_BAR_W + 2, BOSS_BAR_H + 2).fill(HP_BORDER_COLOR);
    // Background
    g.rect(0, 0, BOSS_BAR_W, BOSS_BAR_H).fill(HP_BG_COLOR);
    // Fill: red-orange gradient feel
    const color = ratio > 0.5 ? 0xcc4444 : ratio > 0.25 ? 0xcc6622 : 0xcc2222;
    g.rect(0, 0, BOSS_BAR_W * ratio, BOSS_BAR_H).fill(color);
  }

  private drawVignette(alpha: number): void {
    this.vignette.clear();
    if (alpha <= 0) {
      this.vignette.alpha = 0;
      return;
    }
    this.vignette.alpha = 1;
    const c = { color: 0xaa0000, alpha };
    this.vignette.rect(0, 0, SCREEN_W, MARGIN).fill(c);
    this.vignette.rect(0, SCREEN_H - MARGIN, SCREEN_W, MARGIN).fill(c);
    this.vignette.rect(0, 0, MARGIN, SCREEN_H).fill(c);
    this.vignette.rect(SCREEN_W - MARGIN, 0, MARGIN, SCREEN_H).fill(c);
  }
}
