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
const BASE_BOSS_W = 280;
const BASE_BOSS_H = 14;

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
/** HP 비율이 이 값 이하로 떨어지면 [R] Flask 키가 pulse 하여 사용을 유도. */
const FLASK_LOW_HP_THRESHOLD = 0.4;
/** Flask 키 pulse 1 사이클(scale 저점→고점→저점) 길이. */
const FLASK_PULSE_PERIOD = 600;

// Item EXP bar
const BASE_EXP_W = 60;
const BASE_EXP_H = 4;
const EXP_BG_COLOR = 0x222222;
const EXP_BAR_COLOR = 0xffd700;
const EXP_BAR_MAX_COLOR = 0xff8833;
const EXP_LERP_DURATION = 300;
const EXP_LEVELUP_FLASH_DURATION = 400;

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
  private flaskPulseGlow: Graphics;
  private flaskPulseTimer = 0;
  private actionKeyBar: Container;

  // [I]tem 키 강조 — 첫 아이템계 클리어 후 플레이어가 인벤토리를 열 때까지 flask 와 동일하게 펄스.
  private itemKeyIcon: Container | null = null;
  private itemKeyPulseGlow: Graphics;
  private itemKeyPulseTimer = 0;
  private itemKeyPulseActive = false;
  private itemKeyCenterX = 0;
  private itemKeyCenterY = 0;
  private itemKeySize = 0;

  private vignette: Graphics;
  private vignetteTimer = 0;

  // Boss HP bar
  private bossBarContainer: Container;
  private bossBar: Graphics;
  private bossNameText: BitmapText;
  private bossNameShadow: BitmapText;
  private bossHp = 0;
  private bossMaxHp = 0;

  // Depth Gauge (item world only)
  private depthGauge: Container;
  private depthGaugeGfx: Graphics;
  private depthLabels: BitmapText[] = [];
  private depthTotal = 0;
  private depthCurrent = 0;
  private depthCleared: boolean[] = [];
  private depthPulseTimer = 0;

  // Item EXP bar (item world only)
  private expBarContainer: Container;
  private expBarGfx: Graphics;
  private expNameText: BitmapText;
  private expNameShadow: BitmapText;
  private expLevelText: BitmapText;
  private expLevelShadow: BitmapText;
  private expItemName = '';
  private expItemRarityColor = 0xffffff;
  private expLevel = 0;
  private expCurrent = 0;
  private expMax = 300;
  private expDisplayRatio = 0;  // lerp target
  private expTargetRatio = 0;
  private expLerpTimer = 0;
  private expLevelUpFlash = 0;
  private expIsMax = false;

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
    // 보스 바를 화면 상단으로 이동. BOSS_Y 아래에 막대가 그려지고
    // 보스 이름은 BOSS_Y - 10*s 에 배치되므로 최소 10*s 위 여백 필요.
    this.BOSS_Y = 24 * s;

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

    // --- Action key bar: [Z]Jump [X]Dash [C]Atk — bottom-left (above floor text) ---
    this.actionKeyBar = new Container();
    const ACTION_BAR_Y = this.SH - this.MARGIN - this.FONT - 4 * s - KEY_ICON;
    const actions: Array<{ key: string; label: string }> = [
      { key: 'Z', label: 'Jump' },
      { key: 'X', label: 'Dash' },
      { key: 'C', label: 'Atk' },
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
    // Pulse glow sits behind the icon so low-HP animation reads clearly.
    this.flaskPulseGlow = new Graphics();
    this.flaskPulseGlow.alpha = 0;
    this.container.addChild(this.flaskPulseGlow);

    this.flaskKeyLabel = KeyPrompt.createKeyIcon('R', this.FLASK_SIZE);
    // Center pivot so pulse scales in place (position stays anchored to HP_X,FLASK_Y).
    this.flaskKeyLabel.pivot.set(this.FLASK_SIZE / 2, this.FLASK_SIZE / 2);
    this.flaskKeyLabel.x = this.HP_X + this.FLASK_SIZE / 2;
    this.flaskKeyLabel.y = this.FLASK_Y + this.FLASK_SIZE / 2;
    this.container.addChild(this.flaskKeyLabel);

    // --- [I]Item [M]Map — top-right, below minimap ---
    const sideKeyY = this.MARGIN + 72 * s + 6 * s; // below minimap
    const sideActions: Array<{ key: string; label: string }> = [
      { key: 'I', label: 'Item' },
      { key: 'M', label: 'Map' },
    ];
    // [I] 키 펄스 glow 는 아이콘 뒤에 그려야 하므로 루프보다 먼저 추가.
    this.itemKeyPulseGlow = new Graphics();
    this.itemKeyPulseGlow.alpha = 0;
    this.container.addChild(this.itemKeyPulseGlow);
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
      // Flask 키처럼 in-place 스케일을 위해 center pivot 으로 재배치.
      if (a.key === 'I') {
        icon.pivot.set(KEY_ICON / 2, KEY_ICON / 2);
        icon.x = sideX + KEY_ICON / 2;
        icon.y = sideKeyY + KEY_ICON / 2;
        this.itemKeyIcon = icon;
        this.itemKeyCenterX = icon.x;
        this.itemKeyCenterY = icon.y;
        this.itemKeySize = KEY_ICON;
      }
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

    // --- Depth Gauge (hidden by default, shown in item world) ---
    this.depthGauge = new Container();
    this.depthGauge.visible = false;
    this.depthGaugeGfx = new Graphics();
    this.depthGauge.addChild(this.depthGaugeGfx);
    this.container.addChild(this.depthGauge);

    // --- Item EXP bar (hidden by default, shown in item world) ---
    this.expBarContainer = new Container();
    this.expBarContainer.visible = false;
    this.expBarGfx = new Graphics();
    this.expBarContainer.addChild(this.expBarGfx);
    this.expNameShadow = new BitmapText({ text: '', style: { fontFamily: PIXEL_FONT, fontSize: this.FONT, fill: 0x000000 } });
    this.expNameText = new BitmapText({ text: '', style: { fontFamily: PIXEL_FONT, fontSize: this.FONT, fill: 0xffffff } });
    this.expLevelShadow = new BitmapText({ text: '', style: { fontFamily: PIXEL_FONT, fontSize: this.FONT, fill: 0x000000 } });
    this.expLevelText = new BitmapText({ text: '', style: { fontFamily: PIXEL_FONT, fontSize: this.FONT, fill: 0xffffff } });
    this.expBarContainer.addChild(this.expNameShadow);
    this.expBarContainer.addChild(this.expNameText);
    this.expBarContainer.addChild(this.expLevelShadow);
    this.expBarContainer.addChild(this.expLevelText);
    this.container.addChild(this.expBarContainer);

    // DEBUG label — bottom-left, only when ?debug in URL
    if (new URLSearchParams(window.location.search).has('debug')) {
      const dbgShadow = new BitmapText({ text: 'DEBUG', style: { fontFamily: PIXEL_FONT, fontSize: 16 * s, fill: 0x000000 } });
      const dbgText = new BitmapText({ text: 'DEBUG', style: { fontFamily: PIXEL_FONT, fontSize: 16 * s, fill: 0xff2222 } });
      dbgShadow.anchor.set(1, 0);
      dbgText.anchor.set(1, 0);
      dbgShadow.x = this.SW - this.MARGIN + s;
      dbgShadow.y = this.SH - this.MARGIN - 16 * s + s;
      dbgText.x = this.SW - this.MARGIN;
      dbgText.y = this.SH - this.MARGIN - 16 * s;
      dbgText.alpha = 0.7;
      dbgShadow.alpha = 0.7;
      this.container.addChild(dbgShadow);
      this.container.addChild(dbgText);
    }
  }

  // ----- Public API -----

  /**
   * 저체력 관련 시각 효과(Flask R pulse, glow, HP bar pulse, 데미지 vignette)를
   * 즉시 초기화. 사망 후 리스폰/아이템계에서 월드 복귀 시 호출하여 잔상이
   * 새 프레임까지 남지 않도록 보장한다.
   */
  resetLowHpEffects(): void {
    this.lowHpTimer = 0;
    this.flaskPulseTimer = 0;
    this.flaskKeyLabel.scale.set(1);
    this.flaskPulseGlow.clear();
    this.flaskPulseGlow.alpha = 0;
    this.hpTextFlashTimer = 0;
    this.hpText.tint = 0xffffff;
    this.vignetteTimer = 0;
    this.vignette.alpha = 0;
    this.vignette.clear();
    this.redrawHpBar();
  }

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
    // [R] key label sits right of the flask icons.
    // Pivot is centered so the low-HP pulse scales in place — we compensate
    // here by +FLASK_SIZE/2 so the icon's bounding box still occupies the
    // same row as the flasks (top at FLASK_Y).
    const flaskKeyLeft = this.HP_X + totalFlaskW + 2 * this.s;
    this.flaskKeyLabel.x = flaskKeyLeft + this.FLASK_SIZE / 2;
    this.flaskKeyLabel.y = this.FLASK_Y + this.FLASK_SIZE / 2;
    // HP text follows after the [R] label.
    // 100/100 텍스트의 세로 중심을 아이콘 중심(FLASK_Y + FLASK_SIZE/2)에 맞춘다
    // — 아이콘(FLASK_SIZE=10s)이 텍스트(FONT=8s)보다 커서 top-정렬하면 어긋남.
    this.hpText.x = flaskKeyLeft + this.FLASK_SIZE + 4 * this.s;
    this.hpText.y = this.FLASK_Y + (this.FLASK_SIZE - this.FONT) / 2;
    this.hpTextShadow.x = this.hpText.x + this.s;
    this.hpTextShadow.y = this.hpText.y + this.s;
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

  // --- Depth Gauge ---

  /** Initialize depth gauge for item world entry. */
  showDepthGauge(totalStrata: number, currentStratum: number, clearedStrata: boolean[]): void {
    this.depthTotal = totalStrata;
    this.depthCurrent = currentStratum;
    this.depthCleared = [...clearedStrata];
    this.depthGauge.visible = true;
    this.depthPulseTimer = 0;
    this.redrawDepthGauge();
  }

  /** Update current stratum (0-based). */
  updateDepthGauge(currentStratum: number, clearedStrata: boolean[]): void {
    this.depthCurrent = currentStratum;
    this.depthCleared = [...clearedStrata];
    this.redrawDepthGauge();
  }

  /** Hide when leaving item world. */
  hideDepthGauge(): void {
    this.depthGauge.visible = false;
  }

  // --- Item EXP Bar ---

  /** Show item EXP bar (call on item world entry). */
  showItemExp(name: string, rarityColor: number, level: number, exp: number, maxExp: number): void {
    this.expItemName = name;
    this.expItemRarityColor = rarityColor;
    this.expLevel = level;
    this.expCurrent = exp;
    this.expMax = maxExp;
    this.expIsMax = level >= 99;
    this.expTargetRatio = this.expIsMax ? 1 : Math.min(1, exp / maxExp);
    this.expDisplayRatio = this.expTargetRatio;
    this.expLerpTimer = 0;
    this.expLevelUpFlash = 0;
    this.expBarContainer.visible = true;
    this.redrawExpBar();
  }

  /** Update EXP bar (call on EXP gain / level up). */
  updateItemExp(level: number, exp: number, maxExp: number, leveled = false): void {
    const prevLevel = this.expLevel;
    this.expLevel = level;
    this.expCurrent = exp;
    this.expMax = maxExp;
    this.expIsMax = level >= 99;
    this.expTargetRatio = this.expIsMax ? 1 : Math.min(1, exp / maxExp);

    if (leveled) {
      // On level up: flash + reset bar from 0
      this.expLevelUpFlash = EXP_LEVELUP_FLASH_DURATION;
      this.expDisplayRatio = 0;
    }

    // Start lerp animation
    this.expLerpTimer = EXP_LERP_DURATION;
    this.redrawExpBar();
  }

  /** Hide item EXP bar (call on leaving item world). */
  hideItemExp(): void {
    this.expBarContainer.visible = false;
  }

  /** [I]tem 키 강조 on/off — 첫 아이템계 클리어 유도 후 I 입력까지만 true. */
  setItemKeyHighlight(active: boolean): void {
    this.itemKeyPulseActive = active;
    if (!active) {
      this.itemKeyPulseTimer = 0;
      if (this.itemKeyIcon) this.itemKeyIcon.scale.set(1);
      this.itemKeyPulseGlow.clear();
      this.itemKeyPulseGlow.alpha = 0;
    }
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

    // --- Flask [R] pulse: HP <= 40% → 키가 커졌다 작아졌다 + 뒤에 붉은 glow ring ---
    if (ratio > 0 && ratio <= FLASK_LOW_HP_THRESHOLD) {
      this.flaskPulseTimer = (this.flaskPulseTimer + dt) % FLASK_PULSE_PERIOD;
      const phase = (this.flaskPulseTimer / FLASK_PULSE_PERIOD) * Math.PI * 2;
      const pulse = 0.5 + 0.5 * Math.sin(phase); // 0..1
      const scale = 1.0 + pulse * 0.45;          // 1.0..1.45
      this.flaskKeyLabel.scale.set(scale);

      // Glow ring — red halo grows/fades with the pulse.
      this.flaskPulseGlow.clear();
      const cx = this.HP_X + this.FLASK_SIZE / 2;
      const cy = this.FLASK_Y + this.FLASK_SIZE / 2;
      const baseR = this.FLASK_SIZE * 0.7;
      const r = baseR + pulse * this.FLASK_SIZE * 0.8;
      this.flaskPulseGlow
        .circle(cx, cy, r).fill({ color: 0xff4444, alpha: 0.18 + pulse * 0.22 });
      this.flaskPulseGlow
        .circle(cx, cy, r * 0.6).fill({ color: 0xffaa66, alpha: 0.25 + pulse * 0.25 });
      this.flaskPulseGlow.alpha = 1;
    } else if (this.flaskPulseTimer !== 0 || this.flaskKeyLabel.scale.x !== 1) {
      // Reset on recovery.
      this.flaskPulseTimer = 0;
      this.flaskKeyLabel.scale.set(1);
      this.flaskPulseGlow.clear();
      this.flaskPulseGlow.alpha = 0;
    }

    // --- [I]tem 키 펄스 — 첫 아이템계 클리어 후 플레이어가 I 를 누를 때까지. ---
    if (this.itemKeyPulseActive && this.itemKeyIcon) {
      this.itemKeyPulseTimer = (this.itemKeyPulseTimer + dt) % FLASK_PULSE_PERIOD;
      const phase = (this.itemKeyPulseTimer / FLASK_PULSE_PERIOD) * Math.PI * 2;
      const pulse = 0.5 + 0.5 * Math.sin(phase);
      const scale = 1.0 + pulse * 0.45;
      this.itemKeyIcon.scale.set(scale);

      this.itemKeyPulseGlow.clear();
      const cx = this.itemKeyCenterX;
      const cy = this.itemKeyCenterY;
      const baseR = this.itemKeySize * 0.7;
      const r = baseR + pulse * this.itemKeySize * 0.8;
      // Flask 는 붉은 위험 색, [I] 는 안내색(주황-노랑) 으로 구별.
      this.itemKeyPulseGlow
        .circle(cx, cy, r).fill({ color: 0xffaa44, alpha: 0.18 + pulse * 0.22 });
      this.itemKeyPulseGlow
        .circle(cx, cy, r * 0.6).fill({ color: 0xffee88, alpha: 0.25 + pulse * 0.25 });
      this.itemKeyPulseGlow.alpha = 1;
    } else if (
      this.itemKeyIcon &&
      (this.itemKeyPulseTimer !== 0 || this.itemKeyIcon.scale.x !== 1)
    ) {
      this.itemKeyPulseTimer = 0;
      this.itemKeyIcon.scale.set(1);
      this.itemKeyPulseGlow.clear();
      this.itemKeyPulseGlow.alpha = 0;
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
    // Depth gauge pulse
    if (this.depthGauge.visible) {
      this.depthPulseTimer = (this.depthPulseTimer + dt) % 2000;
      this.redrawDepthGauge();
    }
    // Item EXP bar lerp + level-up flash
    if (this.expBarContainer.visible) {
      if (this.expLerpTimer > 0) {
        this.expLerpTimer -= dt;
        const t = 1 - Math.max(0, this.expLerpTimer) / EXP_LERP_DURATION;
        this.expDisplayRatio += (this.expTargetRatio - this.expDisplayRatio) * Math.min(1, t * 2);
        this.redrawExpBar();
      }
      if (this.expLevelUpFlash > 0) {
        this.expLevelUpFlash -= dt;
        if (this.expLevelUpFlash <= 0) this.expLevelUpFlash = 0;
        this.redrawExpBar();
      }
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

    // Outer border (black) + inner bezel for contrast on any background.
    g.rect(-2 * this.s, -2 * this.s, W + 4 * this.s, H + 4 * this.s).fill(0x000000);
    g.rect(-this.s, -this.s, W + 2 * this.s, H + 2 * this.s).fill(0xbbbbbb);
    g.rect(0, 0, W, H).fill(HP_BG_COLOR);

    // 주황/빨강 배경에 묻히지 않도록 magenta → violet 스펙트럼. 체력이 깎일수록
    // 어두워지면서도 주황 월드 타일에 섞이지 않는 채도를 유지.
    const fillColor = ratio > 0.5 ? 0xff3388 : ratio > 0.25 ? 0xcc2277 : 0x882266;
    const fillW = W * ratio;
    g.rect(0, 0, fillW, H).fill(fillColor);
    // Top-edge highlight — 바가 두꺼워진 만큼 입체감 한 줄.
    const highlight = ratio > 0.5 ? 0xffaacc : ratio > 0.25 ? 0xff88bb : 0xcc66aa;
    g.rect(0, 0, fillW, Math.max(1, Math.floor(this.s))).fill({ color: highlight, alpha: 0.8 });
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

  // Depth gradient: shallow (orange) → deep (dark red)
  private static readonly DEPTH_COLORS = [0xFF8833, 0xCC6622, 0x993311, 0x661100];

  private depthColor(index: number): number {
    const t = this.depthTotal <= 1 ? 0 : index / (this.depthTotal - 1);
    const colors = HUD.DEPTH_COLORS;
    const pos = t * (colors.length - 1);
    const lo = Math.floor(pos);
    const hi = Math.min(lo + 1, colors.length - 1);
    const frac = pos - lo;
    // Lerp RGB
    const r = ((colors[lo] >> 16) & 0xff) + (((colors[hi] >> 16) & 0xff) - ((colors[lo] >> 16) & 0xff)) * frac;
    const g = ((colors[lo] >> 8) & 0xff) + (((colors[hi] >> 8) & 0xff) - ((colors[lo] >> 8) & 0xff)) * frac;
    const b = (colors[lo] & 0xff) + ((colors[hi] & 0xff) - (colors[lo] & 0xff)) * frac;
    return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
  }

  private redrawDepthGauge(): void {
    const g = this.depthGaugeGfx;
    g.clear();

    // Remove old labels
    for (const l of this.depthLabels) { if (l.parent) l.parent.removeChild(l); }
    this.depthLabels = [];

    const s = this.s;
    const blockSize = 12 * s;
    const lineLen = 6 * s;
    const step = blockSize + lineLen; // 18*s per stratum
    const startX = this.MARGIN;
    const startY = this.MARGIN + this.HP_H + 2 * s + this.FLASK_SIZE + 4 * s + 16 * s + 4 * s;
    // ^^ HP bar + flask row + ATK text height + gap

    const pulseAlpha = 0.4 + 0.6 * ((Math.sin(this.depthPulseTimer / 2000 * Math.PI * 2) + 1) / 2);

    for (let i = 0; i < this.depthTotal; i++) {
      const bx = startX;
      const by = startY + i * step;
      const isCurrent = i === this.depthCurrent;
      const isCleared = this.depthCleared[i] ?? false;

      if (isCleared || isCurrent) {
        // Filled block with depth color
        const color = this.depthColor(i);
        g.rect(bx, by, blockSize, blockSize).fill(color);
        if (isCurrent) {
          // White pulsing border
          g.rect(bx, by, blockSize, blockSize).stroke({ color: 0xffffff, width: s, alpha: pulseAlpha });
        }
      } else {
        // Unreached: empty outline
        g.rect(bx, by, blockSize, blockSize).stroke({ color: 0x333333, width: s });
      }

      // Connecting line (except last)
      if (i < this.depthTotal - 1) {
        const lx = bx + blockSize / 2;
        const ly = by + blockSize;
        g.rect(lx - Math.floor(s / 2), ly, s, lineLen).fill(0x333333);
      }

      // Label: "Depth N"
      const numColor = (isCleared || isCurrent) ? this.depthColor(i) : 0x333333;
      const label = new BitmapText({
        text: `Depth ${i + 1}`,
        style: { fontFamily: PIXEL_FONT, fontSize: 12 * s, fill: isCurrent ? 0xffffff : numColor },
      });
      label.x = bx + blockSize + 3 * s;
      label.y = by + Math.floor((blockSize - label.height) / 2);
      this.depthGauge.addChild(label);
      this.depthLabels.push(label);
    }
  }

  private redrawExpBar(): void {
    const g = this.expBarGfx;
    g.clear();

    const s = this.s;
    const barW = BASE_EXP_W * s;
    const barH = BASE_EXP_H * s;

    // Position: right of depth gauge current block
    // Depth gauge startX = MARGIN, block = 12*s, label ~60*s → put EXP bar at x=MARGIN
    // Y: below depth gauge (after all strata blocks)
    const depthStartY = this.MARGIN + this.HP_H + 2 * s + this.FLASK_SIZE + 4 * s + 16 * s + 4 * s;
    const depthBlockSize = 12 * s;
    const depthStep = depthBlockSize + 6 * s;
    const depthEndY = depthStartY + this.depthTotal * depthStep + 2 * s;
    const startX = this.MARGIN;
    const startY = depthEndY;

    // Item name (rarity colored)
    this.expNameText.style.fill = this.expItemRarityColor;
    this.expNameText.text = this.expItemName;
    this.expNameShadow.text = this.expItemName;
    this.expNameText.x = startX;
    this.expNameText.y = startY;
    this.expNameShadow.x = startX + s;
    this.expNameShadow.y = startY + s;

    // Level text (right of name)
    const lvText = this.expIsMax ? 'Lv.MAX' : `Lv.${this.expLevel}`;
    this.expLevelText.text = lvText;
    this.expLevelShadow.text = lvText;
    this.expLevelText.style.fill = this.expIsMax ? EXP_BAR_MAX_COLOR : 0xffffff;
    const lvX = startX + this.expNameText.width + 4 * s;
    this.expLevelText.x = lvX;
    this.expLevelText.y = startY;
    this.expLevelShadow.x = lvX + s;
    this.expLevelShadow.y = startY + s;

    // EXP bar background
    const barY = startY + this.FONT + 2 * s;
    g.rect(startX - s, barY - s, barW + 2 * s, barH + 2 * s).fill(0x444444);
    g.rect(startX, barY, barW, barH).fill(EXP_BG_COLOR);

    // EXP bar fill (lerped)
    const fillW = barW * Math.max(0, Math.min(1, this.expDisplayRatio));
    const barColor = this.expIsMax ? EXP_BAR_MAX_COLOR : EXP_BAR_COLOR;
    if (fillW > 0) {
      g.rect(startX, barY, fillW, barH).fill(barColor);
    }

    // Level-up flash overlay
    if (this.expLevelUpFlash > 0) {
      const flashAlpha = this.expLevelUpFlash / EXP_LEVELUP_FLASH_DURATION;
      g.rect(startX, barY, barW, barH).fill({ color: 0xffffff, alpha: flashAlpha * 0.8 });
      // Scale bounce on level text
      const bounce = 1 + 0.3 * flashAlpha;
      this.expLevelText.scale.set(bounce);
      this.expLevelShadow.scale.set(bounce);
    } else {
      this.expLevelText.scale.set(1);
      this.expLevelShadow.scale.set(1);
    }

    // EXP fraction text (below bar, small)
    const expStr = this.expIsMax ? 'MAX' : `${this.expCurrent}/${this.expMax}`;
    // Draw as part of graphics to avoid extra BitmapText allocation
    // Just reuse level text area — place EXP fraction right-aligned under bar
    // (keeping it simple: no extra text object, info is in the floor text already)
  }
}
