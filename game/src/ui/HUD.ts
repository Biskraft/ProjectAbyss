import { Container, Graphics, BitmapText, Text, Sprite } from 'pixi.js';
import { assetPath } from '@core/AssetLoader';
import { PIXEL_FONT } from './fonts';
import { t } from '@i18n';
import { KeyPrompt } from './KeyPrompt';
import {
  TEXT_PRIMARY, TEXT_NEGATIVE, TEXT_POSITIVE, TEXT_GOLD,
} from './ModalPanel';
import type { UISkin } from './UISkin';
import {
  createEgoShardCounter,
  createHudStatusIcons,
  drawBurnIcon,
  drawEgoShards,
  isEgoShardHudEnabled,
  type EgoShardElement,
} from './hud/HudStatusIndicators';
import {
  createHudItemExpDisplay,
  redrawHudItemExpBar,
  type HudItemExpDisplayParts,
} from './hud/HudItemExpDisplay';
import {
  createHudActionKeyBar,
  createHudFlaskKeyLabel,
  createHudItemExitHint,
  createHudSideKeyBar,
} from './hud/HudKeyPromptBars';
import { createHudBossHpDisplay, drawHudBossHpBar } from './hud/HudBossHpDisplay';
import {
  createHudDepthGaugeDisplay,
  drawHudDepthGauge,
  updateHudDepthGaugePulse,
} from './hud/HudDepthGaugeDisplay';
import { createHudDamageVignette, drawHudDamageVignette } from './hud/HudDamageVignetteDisplay';
import {
  advanceHudHpBarTimers,
  createHudHpBarGraphics,
  redrawHudHpBar,
} from './hud/HudHpBarDisplay';
import {
  createHudFlaskGraphics,
  redrawHudFlasks,
} from './hud/HudFlaskDisplay';
import { createHudPulseGlow } from './hud/HudPulseGlowDisplay';
import { createHudDebugLabel } from './hud/HudDebugLabel';
import { createSkinHudFrameParts } from './hud/HudSkinFrameDisplay';
import { createSkinHudKeyPromptParts } from './hud/HudSkinKeyPromptDisplay';
import { advanceHudFlaskPulse, advanceHudItemKeyPulse } from './hud/HudPulseAnimations';
import { detachDisplayObject } from '../scenes/shared/DisplayObjectLifecycleHelpers';
import {
  applyHudSkinAtkTextLayout,
  applyHudSkinHpTextLayout,
  createHudAtkText,
  createHudFloorText,
  createHudGoldText,
  createHudHpText,
  wrapHudTextPair,
} from './hud/HudTextDisplays';
import {
  BASE_BOSS_H,
  BASE_BOSS_W,
  BASE_FLASK_GAP,
  BASE_FLASK_SIZE,
  BASE_FONT,
  BASE_H,
  BASE_HP_FONT,
  BASE_HP_H,
  BASE_HP_W,
  BASE_MARGIN,
  BASE_W,
  BOSS_HEAL_FLASH_DURATION,
  EXP_LERP_DURATION,
  EXP_LEVELUP_FLASH_DURATION,
  FLASK_MAX_DISPLAY,
  GHOST_BAR_DURATION,
  HEAL_FLASH_DURATION,
  HP_TEXT_FLASH_DURATION,
} from './hud/HudConstants';
import {
  applyHudElementLayout,
  getHudElement,
  type HudLayout,
} from './hud/hudLayout';

// ----- HUD layout override (edited by game/tools/hud-tool) -----
// Loaded once at boot from public/data/hud_layout.json. Null = no overrides,
// HUD renders at its hand-coded default positions (pixel-identical to before).
let cachedHudLayout: HudLayout | null = null;

/**
 * Fetch hud_layout.json once at boot. Call before scenes construct their HUD.
 * Missing/invalid file silently leaves the HUD at its default layout.
 */
export async function loadHudLayout(): Promise<void> {
  if (cachedHudLayout) return;
  try {
    const res = await fetch(assetPath('data/hud_layout.json'), { cache: 'no-cache' });
    if (res.ok) {
      const json = await res.json();
      if (json && typeof json === 'object' && json.elements) cachedHudLayout = json as HudLayout;
    }
  } catch { /* no layout file ??defaults */ }
}

/**
 * Apply a single element's layout override to an arbitrary Container ??used by
 * UI components that live outside the HUD (TutorialHint, LoreDisplay) but are
 * still editable in the HUD tool. `mult` converts base-640 override units into
 * the target's local space: pass uiScale for native-space parents, 1 for a
 * parent already scaled by uiScale. No override for `id` leaves the target
 * untouched (pixel-identical default).
 */
export function applyLayoutToContainer(
  target: Container,
  id: string,
  mult: number,
  layout: HudLayout | null = cachedHudLayout,
): void {
  const ov = layout?.elements?.[id];
  const box = getHudElement(id);
  if (!ov || !box) return;
  applyHudElementLayout(target, box, ov, mult);
}

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
  private HP_FONT: number;
  /** EXP/level label font ??larger than base FONT so weapon name + Lv.X
   *  remain legible at 640x360 inside the Item World. */
  private EXP_FONT: number;
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
  private healFlashColor = TEXT_POSITIVE;
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
  private sideKeyBar: Container;

  // [I]tem ??Í∞ïÏ°∞ ??Ï≤??ÑÏù¥?úÍ≥Ñ ?¥Î¶¨?????åÎ†à?¥Ïñ¥Í∞Ä ?∏Î≤§?†Î¶¨Î•????åÍπåÏßÄ flask ?Ä ?ôÏùº?òÍ≤å ?ÑÏä§.
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
  private bossNameText: BitmapText | Text;
  private bossNameShadow: BitmapText | Text;
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

  // Item world exit hint (top-right [ESC] Exit, item world only)
  private itemExitHintContainer: Container;

  // Item EXP bar (item world only)
  private expBarContainer: Container;
  private expDisplayParts!: HudItemExpDisplayParts;
  private expItemName = '';
  private expItemRarityColor = TEXT_PRIMARY;
  private expLevel = 0;
  private expCurrent = 0;
  private expMax = 300;
  private expDisplayRatio = 0;  // lerp target
  private expTargetRatio = 0;
  private expLerpTimer = 0;
  private expLevelUpFlash = 0;
  private expIsMax = false;

  // Status effects (burn / poison / etc.) ??currently only burn is wired.
  private statusIconContainer!: Container;
  private burnIconGfx!: Graphics;
  private burnGaugeGfx!: Graphics;
  private burnRemainingMs = 0;
  private burnTotalMs = 0;
  private burnFlickerT = 0;

  // Ego Shard ammo (Hades-style cast). 3 dots showing filled/empty + active
  // enchant tint (fire orange / ice cyan / thunder yellow).
  private egoShardContainer!: Container;
  private egoShardGfx!: Graphics;
  private egoShardCount = 0;
  private egoShardMax = 3;
  private egoShardElement: EgoShardElement = 'fire';

  // Portrait
  private portraitSprite: Sprite | null = null;

  // Skin sprites ??populated by applySkin()
  private skinLayer: Container | null = null;
  private skinMapFrame: Sprite | null = null;
  private minimapFrameVisible = true;
  private skinHpFrame: Sprite | null = null;
  private skinHpFill: Sprite | null = null;
  private skinHpFillMask: Graphics | null = null;
  private skinHpFillMaxW = 0;
  private skinHpFillMaxH = 0;
  private skinHpFillSlashW = 0;
  private skinFloorFill: Sprite | null = null;
  private skinFloorFillMaxH = 0;
  // Skin flask pulse position (overrides HP_X/FLASK_Y when skin is active)
  private skinFlaskCx = 0;
  private skinFlaskCy = 0;
  private skinFlaskR = 0;
  private hasSkin = false;
  // Skin depth indicator (item world only)
  private skinDepthFrame: Sprite | null = null;
  private skinDepthFill: Sprite | null = null;
  private skinDepthFillTex: import('pixi.js').Texture | null = null;
  private skinDepthFillX = 0;
  private skinDepthFillY = 0;
  private skinDepthFillW = 0;
  private skinDepthFillMaxH = 0;
  private skinDepthTickContainer: Container | null = null;

  // Skin [I] key pulse position
  private skinItemKeyCx = 0;
  private skinItemKeyCy = 0;
  private skinItemKeyR = 0;
  // Skin flask icons
  private skinFlaskIcons: Sprite[] = [];
  private skinFlaskFillTex: import('pixi.js').Texture | null = null;
  private skinFlaskEmptyTex: import('pixi.js').Texture | null = null;
  private skinFlaskStartX = 0;
  private skinFlaskStartY = 0;
  private skinFlaskIconW = 0;
  private skinFlaskIconH = 0;
  private skinFlaskGap = 0;

  // ----- Layout override (hud-tool) -----
  // Each editable HUD element's display object(s) live under a wrapper
  // Container keyed by HudElement.id. applyLayout() shifts/scales/hides the
  // wrapper. Populated in the constructor (Graphics path) and applySkin()
  // (skin path, which overwrites the entries it replaces).
  private layoutWrappers = new Map<string, Container>();
  // Parent for dynamically-recreated skin flask icons (set in applySkin).
  private flaskIconLayer: Container | null = null;

  constructor(uiScale = 1) {
    this.s = uiScale;
    this.container = new Container();
    this.container.visible = false;

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
    this.HP_FONT = BASE_HP_FONT * s;
    this.EXP_FONT = 14 * s;
    this.BOSS_W = BASE_BOSS_W * s;
    this.BOSS_H = BASE_BOSS_H * s;
    this.BOSS_X = (this.SW - this.BOSS_W) / 2;
    // Î≥¥Ïä§ Î∞îÎ? ?îÎ©¥ ?ÅÎã®?ºÎ°ú ?¥Îèô. BOSS_Y ?ÑÎûò??ÎßâÎ?Í∞Ä Í∑∏Î†§ÏßÄÍ≥?    // Î≥¥Ïä§ ?¥Î¶Ñ?Ä BOSS_Y - 10*s ??Î∞∞Ïπò?òÎ?Î°?ÏµúÏÜå 10*s ???¨Î∞± ?ÑÏöî.
    this.BOSS_Y = 24 * s;

    // --- HP bar ---
    this.hpBar = createHudHpBarGraphics(this.HP_X, this.HP_Y);
    this.container.addChild(this.hpBar);

    // --- Flask icons ---
    this.flaskGfx = createHudFlaskGraphics(this.HP_X, this.FLASK_Y);
    this.container.addChild(this.flaskGfx);

    // --- HP text with shadow ---
    const hpText = createHudHpText(s, this.HP_FONT, this.HP_X, this.FLASK_Y);
    this.hpTextShadow = hpText.shadow;
    this.hpText = hpText.text;
    this.container.addChild(this.hpTextShadow);
    this.container.addChild(this.hpText);

    // --- ATK text ??below flask row, 2x font size ---
    const ATK_FONT = 16 * s;
    const ATK_Y = this.FLASK_Y + this.FLASK_SIZE + 4 * s;
    const atkText = createHudAtkText(s, ATK_FONT, this.HP_X, ATK_Y);
    this.atkTextShadow = atkText.shadow;
    this.atkText = atkText.text;
    this.container.addChild(this.atkTextShadow);
    this.container.addChild(this.atkText);

    // --- Gold text ??right-aligned ---
    const goldText = createHudGoldText(s, this.FONT, this.SW, this.MARGIN);
    this.goldTextShadow = goldText.shadow;
    this.goldText = goldText.text;
    // Wrap gold in a layout-editable container (id 'gold').
    this.container.addChild(goldText.container);
    this.layoutWrappers.set('gold', goldText.container);

    // --- Key icon shared sizes ---
    const KEY_ICON = 12 * s;  // icon box size
    const KEY_FONT = 8 * s;   // label font next to icon

    // --- Action key bar: [Z]Jump [X]Dash [C]Atk ??bottom-left (above floor text) ---
    const ACTION_BAR_Y = this.SH - this.MARGIN - this.FONT - 4 * s - KEY_ICON;
    this.actionKeyBar = createHudActionKeyBar(s, this.MARGIN, ACTION_BAR_Y, KEY_ICON, KEY_FONT);
    this.container.addChild(this.actionKeyBar);

    // --- Floor/Item text ??debug only (Shift+I to toggle) ---
    const floorText = createHudFloorText(s, this.FONT, this.SH, this.MARGIN);
    this.floorTextShadow = floorText.shadow;
    this.floorText = floorText.text;
    this.container.addChild(this.floorTextShadow);
    this.container.addChild(this.floorText);

    // --- Status icons (burn etc.) ??placed to the right of the HP bar. ---
    // Layout: [HP bar][HP text]  [statusIconContainer]
    // Each icon is roughly KEY_ICON sized; container holds a single burn icon
    // for now, easy to extend with more statuses later.
    const statusIcons = createHudStatusIcons(
      this.HP_X + this.HP_W + 8 * s + 60 * s,
      this.HP_Y,
    );
    this.statusIconContainer = statusIcons.container;
    this.burnIconGfx = statusIcons.burnIconGfx;
    this.burnGaugeGfx = statusIcons.burnGaugeGfx;
    this.container.addChild(this.statusIconContainer);

    // Ego Shard counter ??under the flask row, aligned with HP bar left edge.
    // Shard ability is debug-only (Victor 2026-05-15): hide the HUD widget
    // entirely in shipping builds. ?debug gate matches the LdtkWorldScene /
    // ItemWorldScene cast gate so the counter and the ability stay in sync.
    const egoShards = createEgoShardCounter(
      this.HP_X + 44 * s + 70 * s,
      this.FLASK_Y,
    );
    this.egoShardContainer = egoShards.container;
    this.egoShardGfx = egoShards.gfx;
    this.container.addChild(this.egoShardContainer);
    this.egoShardContainer.visible = isEgoShardHudEnabled();
    drawEgoShards(this.egoShardGfx, this.s, this.egoShardCount, this.egoShardMax, this.egoShardElement);

    // --- Damage vignette ---
    this.vignette = createHudDamageVignette();
    this.container.addChild(this.vignette);

    // --- Flask [R] key label (same height as flask icons) ---
    // Pulse glow sits behind the icon so low-HP animation reads clearly.
    this.flaskPulseGlow = createHudPulseGlow();
    this.container.addChild(this.flaskPulseGlow);

    this.flaskKeyLabel = createHudFlaskKeyLabel(this.FLASK_SIZE, this.HP_X, this.FLASK_Y);
    this.container.addChild(this.flaskKeyLabel);

    // --- [I]Item [M]Map ??top-right, below minimap ---
    const sideKeyY = this.MARGIN + 72 * s + 6 * s; // below minimap
    const sideKeyBar = createHudSideKeyBar(s, this.SW - this.MARGIN, sideKeyY, KEY_ICON, KEY_FONT);
    this.sideKeyBar = sideKeyBar.container;
    this.itemKeyPulseGlow = sideKeyBar.pulseGlow;
    this.itemKeyIcon = sideKeyBar.itemKeyIcon;
    this.itemKeyCenterX = sideKeyBar.itemKeyCenterX;
    this.itemKeyCenterY = sideKeyBar.itemKeyCenterY;
    this.itemKeySize = sideKeyBar.itemKeySize;
    this.container.addChild(this.sideKeyBar);

    // --- Boss HP bar (hidden by default) ---
    const bossHpDisplay = createHudBossHpDisplay(s, this.SW, this.BOSS_X, this.BOSS_Y, this.FONT);
    this.bossBarContainer = bossHpDisplay.container;
    this.bossBar = bossHpDisplay.bar;
    this.bossNameShadow = bossHpDisplay.nameShadow;
    this.bossNameText = bossHpDisplay.nameText;
    this.container.addChild(this.bossBarContainer);

    // --- Depth Gauge (hidden by default, shown in item world) ---
    const depthGauge = createHudDepthGaugeDisplay();
    this.depthGauge = depthGauge.container;
    this.depthGaugeGfx = depthGauge.gfx;
    this.container.addChild(this.depthGauge);

    // --- Item world exit hint ([ESC] Exit, top-right, hidden by default) ---
    // Tied to showItemExp / hideItemExp lifecycle so it only appears while
    // the player is inside an item world stratum.
    this.itemExitHintContainer = createHudItemExitHint(s, this.SW, this.MARGIN, this.FONT);
    this.container.addChild(this.itemExitHintContainer);

    // --- Item EXP bar (hidden by default, shown in item world) ---
    this.expDisplayParts = createHudItemExpDisplay(this.EXP_FONT);
    this.expBarContainer = this.expDisplayParts.container;
    this.container.addChild(this.expBarContainer);

    // DEBUG label ??bottom-left, only when ?debug in URL
    if (new URLSearchParams(window.location.search).has('debug')) {
      this.container.addChild(createHudDebugLabel(s, this.SW, this.SH, this.MARGIN));
    }

    // Register the Graphics-path editable elements (already Containers).
    // applySkin() overwrites 'actionKeys' with its skin wrapper and adds the
    // skin-only element wrappers (statusFrame, hpBar, ...).
    this.layoutWrappers.set('bossBar', this.bossBarContainer);
    this.layoutWrappers.set('expBar', this.expBarContainer);
    this.layoutWrappers.set('statusIcons', this.statusIconContainer);
    this.layoutWrappers.set('egoShards', this.egoShardContainer);
    this.layoutWrappers.set('itemExitHint', this.itemExitHintContainer);
    this.layoutWrappers.set('actionKeys', this.actionKeyBar);
    this.applyLayout();
  }

  // ----- Public API -----

  /**
   * Apply the layout override (hud_layout.json) to the registered element
   * wrappers. Each override shifts/scales/hides a wrapper around the element's
   * default box center (from the manifest). With no override for an id the
   * wrapper is left untouched, so the default build is pixel-identical.
   *
   * Idempotent ??called at the end of the constructor (Graphics wrappers) and
   * again at the end of applySkin() (skin wrappers). Only `visible: false` is
   * acted on; a true/undefined value never force-shows an element so game logic
   * (boss bar, EXP bar appearing on demand) keeps control of visibility.
   */
  applyLayout(layout: HudLayout | null = cachedHudLayout): void {
    if (!layout?.elements) return;
    const s = this.s;
    for (const [id, ov] of Object.entries(layout.elements)) {
      const wrapper = this.layoutWrappers.get(id);
      const box = getHudElement(id);
      if (!wrapper || !box) continue;
      // pivot == position cancels out at scale 1 ??visually identity when the
      // override is only a hide/scale. offset shifts on top.
      applyHudElementLayout(wrapper, box, ov, s);
    }
  }

  /**
   * ?ÄÏ≤¥Î†• Í¥Ä???úÍ∞Å ?®Í≥º(Flask R pulse, glow, HP bar pulse, ?∞Î?ÏßÄ vignette)Î•?   * Ï¶âÏãú Ï¥àÍ∏∞?? ?¨Îßù ??Î¶¨Ïä§???ÑÏù¥?úÍ≥Ñ?êÏÑú ?îÎìú Î≥µÍ? ???∏Ï∂ú?òÏó¨ ?îÏÉÅ??   * ???ÑÎ†à?ÑÍπåÏßÄ ?®Ï? ?äÎèÑÎ°?Î≥¥Ïû•?úÎã§.
   */
  resetLowHpEffects(): void {
    this.lowHpTimer = 0;
    this.flaskPulseTimer = 0;
    this.flaskKeyLabel.scale.set(1);
    this.flaskPulseGlow.clear();
    this.flaskPulseGlow.alpha = 0;
    this.hpTextFlashTimer = 0;
    this.hpText.tint = TEXT_PRIMARY;
    this.vignetteTimer = 0;
    this.vignette.alpha = 0;
    this.vignette.clear();
    redrawHudHpBar(this.hpBar, {
      s: this.s,
      width: this.HP_W,
      height: this.HP_H,
      currentHp: this.currentHp,
      maxHp: this.currentMaxHp,
      ghostHp: this.ghostHp,
      ghostTimer: this.ghostTimer,
      healFlashTimer: this.healFlashTimer,
      healFlashColor: this.healFlashColor,
      healFlashRatio: this.healFlashRatio,
      healFlashStartRatio: this.healFlashStartRatio,
      lowHpTimer: this.lowHpTimer,
      skinFill: this.skinHpFill,
      skinFillMask: this.skinHpFillMask,
      skinFillMaxW: this.skinHpFillMaxW,
      skinFillMaxH: this.skinHpFillMaxH,
      skinFillSlashW: this.skinHpFillSlashW,
    });
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
      this.healFlashColor = TEXT_POSITIVE;
    }

    redrawHudHpBar(this.hpBar, {
      s: this.s,
      width: this.HP_W,
      height: this.HP_H,
      currentHp: this.currentHp,
      maxHp: this.currentMaxHp,
      ghostHp: this.ghostHp,
      ghostTimer: this.ghostTimer,
      healFlashTimer: this.healFlashTimer,
      healFlashColor: this.healFlashColor,
      healFlashRatio: this.healFlashRatio,
      healFlashStartRatio: this.healFlashStartRatio,
      lowHpTimer: this.lowHpTimer,
      skinFill: this.skinHpFill,
      skinFillMask: this.skinHpFillMask,
      skinFillMaxW: this.skinHpFillMaxW,
      skinFillMaxH: this.skinHpFillMaxH,
      skinFillSlashW: this.skinHpFillSlashW,
    });
    const hpStr = this.hasSkin ? `${Math.ceil(hp)}` : `${Math.ceil(hp)}/${maxHp}`;
    this.hpText.text = hpStr;
    this.hpTextShadow.text = hpStr;

    if (hp < prevHp && prevHp > 0) {
      this.hpTextFlashTimer = HP_TEXT_FLASH_DURATION;
      this.hpText.tint = TEXT_NEGATIVE;
    }
  }

  updateFlask(current: number, max: number): void {
    this.flaskCurrent = current;
    this.flaskMax = max;
    this.skinFlaskIcons = redrawHudFlasks({
      gfx: this.flaskGfx,
      s: this.s,
      maxDisplay: FLASK_MAX_DISPLAY,
      max: this.flaskMax,
      current: this.flaskCurrent,
      fallbackSize: this.FLASK_SIZE,
      fallbackGap: this.FLASK_GAP,
      hasSkin: this.hasSkin,
      skinFillTexture: this.skinFlaskFillTex,
      skinEmptyTexture: this.skinFlaskEmptyTex,
      skinIconW: this.skinFlaskIconW,
      skinIconH: this.skinFlaskIconH,
      skinGap: this.skinFlaskGap,
      skinStartX: this.skinFlaskStartX,
      skinStartY: this.skinFlaskStartY,
      skinParent: this.flaskIconLayer ?? this.skinLayer,
      previousSkinIcons: this.skinFlaskIcons,
    });

    const totalFlaskW = Math.min(max, FLASK_MAX_DISPLAY) * (this.FLASK_SIZE + this.FLASK_GAP);
    // [R] key label sits right of the flask icons.
    // Pivot is centered so the low-HP pulse scales in place ??we compensate
    // here by +FLASK_SIZE/2 so the icon's bounding box still occupies the
    // same row as the flasks (top at FLASK_Y).
    const flaskKeyLeft = this.HP_X + totalFlaskW + 2 * this.s;
    this.flaskKeyLabel.x = flaskKeyLeft + this.FLASK_SIZE / 2;
    this.flaskKeyLabel.y = this.FLASK_Y + this.FLASK_SIZE / 2;
    // HP text follows after the [R] label ??skip if skin controls position
    if (!this.hasSkin) {
      this.hpText.x = flaskKeyLeft + this.FLASK_SIZE + 4 * this.s;
      this.hpText.y = this.FLASK_Y + (this.FLASK_SIZE - this.HP_FONT) / 2;
      this.hpTextShadow.x = this.hpText.x + this.s;
      this.hpTextShadow.y = this.hpText.y + this.s;
    }
    // Dim [R] label when no flasks remain
    this.flaskKeyLabel.alpha = current <= 0 ? 0.4 : 1.0;
  }

  updateATK(atk: number): void {
    const str = t('ui.hud.atk', { atk });
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

  /** Toggle debug info (floor text) visibility. */
  toggleDebugInfo(): void {
    this.setDebugInfoVisible(!this.floorText.visible);
  }

  setDebugInfoVisible(show: boolean): void {
    this.floorText.visible = show;
    this.floorTextShadow.visible = show;
  }

  flashHeal(amount: number): void {
    const startRatio = Math.max(0, (this.currentHp - amount) / this.currentMaxHp);
    this.healFlashStartRatio = startRatio;
    this.healFlashRatio = this.currentHp / this.currentMaxHp;
    this.healFlashTimer = HEAL_FLASH_DURATION;
    this.healFlashColor = TEXT_POSITIVE;
  }

  flashBossHeal(): void {
    this.healFlashStartRatio = Math.max(0, (this.currentHp - this.currentMaxHp * 0.3) / this.currentMaxHp);
    this.healFlashRatio = this.currentHp / this.currentMaxHp;
    this.healFlashTimer = BOSS_HEAL_FLASH_DURATION;
    this.healFlashColor = TEXT_GOLD;
  }

  flashDamage(): void {
    this.vignetteTimer = 100;
  }

  setGoldBelowMinimap(_below: boolean): void {
    // No-op: gold position is now owned by the layout system (hud_layout.json,
    // applied via the 'gold' wrapper). Previously this nudged gold below the
    // minimap in the world but not the item world, making the same layout land
    // in two different spots. Position gold once in the HUD tool instead.
  }

  setMinimapFrameVisible(visible: boolean): void {
    this.minimapFrameVisible = visible;
    if (this.skinMapFrame) this.skinMapFrame.visible = visible;
  }

  // --- Boss HP bar ---
  showBossHP(name: string, hp: number, maxHp: number): void {
    this.bossHp = hp;
    this.bossMaxHp = maxHp;
    this.bossNameText.text = name;
    this.bossNameShadow.text = name;
    this.bossBarContainer.visible = true;
    drawHudBossHpBar(this.bossBar, {
      s: this.s,
      width: this.BOSS_W,
      height: this.BOSS_H,
      hp: this.bossHp,
      maxHp: this.bossMaxHp,
    });
  }

  updateBossHP(hp: number): void {
    this.bossHp = Math.max(0, hp);
    drawHudBossHpBar(this.bossBar, {
      s: this.s,
      width: this.BOSS_W,
      height: this.BOSS_H,
      hp: this.bossHp,
      maxHp: this.bossMaxHp,
    });
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
    this.depthGauge.visible = !this.hasSkin;
    this.depthPulseTimer = 0;
    if (this.skinDepthFrame) this.skinDepthFrame.visible = true;
    if (this.skinDepthFill) this.skinDepthFill.visible = true;
    if (this.skinDepthTickContainer) this.skinDepthTickContainer.visible = true;
    this.depthLabels = drawHudDepthGauge({
      s: this.s,
      total: this.depthTotal,
      current: this.depthCurrent,
      cleared: this.depthCleared,
      pulseTimer: this.depthPulseTimer,
      hasSkin: this.hasSkin,
      fallbackContainer: this.depthGauge,
      fallbackGfx: this.depthGaugeGfx,
      fallbackLabels: this.depthLabels,
      skinFill: this.skinDepthFill,
      skinTickContainer: this.skinDepthTickContainer,
      skinFillX: this.skinDepthFillX,
      skinFillY: this.skinDepthFillY,
      skinFillW: this.skinDepthFillW,
      skinFillMaxH: this.skinDepthFillMaxH,
    });
  }

  /** Update current stratum (0-based). */
  updateDepthGauge(currentStratum: number, clearedStrata: boolean[]): void {
    this.depthCurrent = currentStratum;
    this.depthCleared = [...clearedStrata];
    this.depthLabels = drawHudDepthGauge({
      s: this.s,
      total: this.depthTotal,
      current: this.depthCurrent,
      cleared: this.depthCleared,
      pulseTimer: this.depthPulseTimer,
      hasSkin: this.hasSkin,
      fallbackContainer: this.depthGauge,
      fallbackGfx: this.depthGaugeGfx,
      fallbackLabels: this.depthLabels,
      skinFill: this.skinDepthFill,
      skinTickContainer: this.skinDepthTickContainer,
      skinFillX: this.skinDepthFillX,
      skinFillY: this.skinDepthFillY,
      skinFillW: this.skinDepthFillW,
      skinFillMaxH: this.skinDepthFillMaxH,
    });
  }

  /** Hide when leaving item world. */
  hideDepthGauge(): void {
    this.depthGauge.visible = false;
    if (this.skinDepthFrame) this.skinDepthFrame.visible = false;
    if (this.skinDepthFill) this.skinDepthFill.visible = false;
    if (this.skinDepthTickContainer) this.skinDepthTickContainer.visible = false;
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
    this.itemExitHintContainer.visible = true;
    redrawHudItemExpBar(this.expDisplayParts, {
      s: this.s,
      expFont: this.EXP_FONT,
      atkText: this.atkText,
      itemName: this.expItemName,
      itemRarityColor: this.expItemRarityColor,
      level: this.expLevel,
      displayRatio: this.expDisplayRatio,
      levelUpFlash: this.expLevelUpFlash,
      isMax: this.expIsMax,
    });
  }

  /** Update EXP bar (call on EXP gain / level up). */
  updateItemExp(level: number, exp: number, maxExp: number, leveled = false): void {
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
    redrawHudItemExpBar(this.expDisplayParts, {
      s: this.s,
      expFont: this.EXP_FONT,
      atkText: this.atkText,
      itemName: this.expItemName,
      itemRarityColor: this.expItemRarityColor,
      level: this.expLevel,
      displayRatio: this.expDisplayRatio,
      levelUpFlash: this.expLevelUpFlash,
      isMax: this.expIsMax,
    });
  }

  /** Hide item EXP bar (call on leaving item world). */
  hideItemExp(): void {
    this.expBarContainer.visible = false;
    this.itemExitHintContainer.visible = false;
  }

  /**
   * Set the Ego Shard ammo display (Hades-style 3-dot indicator).
   * `element` decides the dot color so the player sees which enchant is
   * currently bound to the next cast.
   */
  setEgoShards(count: number, max: number, element: EgoShardElement): void {
    if (this.egoShardCount === count && this.egoShardMax === max && this.egoShardElement === element) return;
    this.egoShardCount = count;
    this.egoShardMax = max;
    this.egoShardElement = element;
    drawEgoShards(this.egoShardGfx, this.s, this.egoShardCount, this.egoShardMax, this.egoShardElement);
  }


  /**
   * Set the player's burn status. Pass remainingMs=0 to hide.
   *
   * totalMs is the original burn duration so the gauge can render the
   * remaining ratio. update() is responsible for the flame flicker animation.
   */
  setBurnStatus(remainingMs: number, totalMs: number): void {
    this.burnRemainingMs = Math.max(0, remainingMs);
    this.burnTotalMs = Math.max(1, totalMs);
    const visible = this.burnRemainingMs > 0;
    if (this.statusIconContainer.visible !== visible) {
      this.statusIconContainer.visible = visible;
    }
    if (!visible) {
      this.burnIconGfx.clear();
      this.burnGaugeGfx.clear();
    }
  }

  /** [I]tem ??Í∞ïÏ°∞ on/off ??Ï≤??ÑÏù¥?úÍ≥Ñ ?¥Î¶¨???†ÎèÑ ??I ?ÖÎ†•ÍπåÏ?Îß?true. */
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
    // Burn status flicker ??only redraws while burning.
    if (this.burnRemainingMs > 0) {
      this.burnFlickerT += dt;
      drawBurnIcon(
        this.burnGaugeGfx,
        this.burnIconGfx,
        this.s,
        this.burnRemainingMs,
        this.burnTotalMs,
        this.burnFlickerT,
      );
    }

    const hpBarTimers = advanceHudHpBarTimers({
      dt,
      currentHp: this.currentHp,
      maxHp: this.currentMaxHp,
      ghostHp: this.ghostHp,
      ghostTimer: this.ghostTimer,
      healFlashTimer: this.healFlashTimer,
      lowHpTimer: this.lowHpTimer,
    });
    this.ghostHp = hpBarTimers.ghostHp;
    this.ghostTimer = hpBarTimers.ghostTimer;
    this.healFlashTimer = hpBarTimers.healFlashTimer;
    this.lowHpTimer = hpBarTimers.lowHpTimer;
    if (hpBarTimers.shouldRedraw) {
      redrawHudHpBar(this.hpBar, {
        s: this.s,
        width: this.HP_W,
        height: this.HP_H,
        currentHp: this.currentHp,
        maxHp: this.currentMaxHp,
        ghostHp: this.ghostHp,
        ghostTimer: this.ghostTimer,
        healFlashTimer: this.healFlashTimer,
        healFlashColor: this.healFlashColor,
        healFlashRatio: this.healFlashRatio,
        healFlashStartRatio: this.healFlashStartRatio,
        lowHpTimer: this.lowHpTimer,
        skinFill: this.skinHpFill,
        skinFillMask: this.skinHpFillMask,
        skinFillMaxW: this.skinHpFillMaxW,
        skinFillMaxH: this.skinHpFillMaxH,
        skinFillSlashW: this.skinHpFillSlashW,
      });
    }

    const flaskPulseState = { timer: this.flaskPulseTimer };
    advanceHudFlaskPulse({
      dt,
      currentHp: this.currentHp,
      maxHp: this.currentMaxHp,
      flaskCurrent: this.flaskCurrent,
      state: flaskPulseState,
      pulseGlow: this.flaskPulseGlow,
      keyLabel: this.flaskKeyLabel,
      hasSkin: this.hasSkin,
      hpX: this.HP_X,
      flaskY: this.FLASK_Y,
      flaskSize: this.FLASK_SIZE,
      skinFlaskCx: this.skinFlaskCx,
      skinFlaskCy: this.skinFlaskCy,
      skinFlaskR: this.skinFlaskR,
    });
    this.flaskPulseTimer = flaskPulseState.timer;

    const itemKeyPulseState = { timer: this.itemKeyPulseTimer };
    advanceHudItemKeyPulse({
      dt,
      active: this.itemKeyPulseActive,
      state: itemKeyPulseState,
      pulseGlow: this.itemKeyPulseGlow,
      itemKeyIcon: this.itemKeyIcon,
      itemKeyCenterX: this.itemKeyCenterX,
      itemKeyCenterY: this.itemKeyCenterY,
      itemKeySize: this.itemKeySize,
      hasSkin: this.hasSkin,
    });
    this.itemKeyPulseTimer = itemKeyPulseState.timer;
    if (this.hpTextFlashTimer > 0) {
      this.hpTextFlashTimer -= dt;
      if (this.hpTextFlashTimer <= 0) { this.hpTextFlashTimer = 0; this.hpText.tint = TEXT_PRIMARY; }
    }
    if (this.vignetteTimer > 0) {
      this.vignetteTimer -= dt;
      const a = Math.max(0, this.vignetteTimer / 100) * 0.3;
      drawHudDamageVignette(this.vignette, a, this.SW, this.SH, this.MARGIN);
    } else if (this.vignette.alpha > 0) {
      this.vignette.alpha = 0;
    }
    // Depth gauge pulse ??frame stays static, fill + ticks sparkle
    if (this.depthGauge.visible || (this.skinDepthFrame && this.skinDepthFrame.visible)) {
      this.depthPulseTimer = updateHudDepthGaugePulse({
        pulseTimer: this.depthPulseTimer,
        dt,
        fallbackGfx: this.depthGaugeGfx,
        skinFill: this.skinDepthFill,
        skinTickContainer: this.skinDepthTickContainer,
      });
      this.depthLabels = drawHudDepthGauge({
        s: this.s,
        total: this.depthTotal,
        current: this.depthCurrent,
        cleared: this.depthCleared,
        pulseTimer: this.depthPulseTimer,
        hasSkin: this.hasSkin,
        fallbackContainer: this.depthGauge,
        fallbackGfx: this.depthGaugeGfx,
        fallbackLabels: this.depthLabels,
        skinFill: this.skinDepthFill,
        skinTickContainer: this.skinDepthTickContainer,
        skinFillX: this.skinDepthFillX,
        skinFillY: this.skinDepthFillY,
        skinFillW: this.skinDepthFillW,
        skinFillMaxH: this.skinDepthFillMaxH,
      });
    }
    // Item EXP bar lerp + level-up flash
    if (this.expBarContainer.visible) {
      if (this.expLerpTimer > 0) {
        this.expLerpTimer -= dt;
        const t = 1 - Math.max(0, this.expLerpTimer) / EXP_LERP_DURATION;
        this.expDisplayRatio += (this.expTargetRatio - this.expDisplayRatio) * Math.min(1, t * 2);
        redrawHudItemExpBar(this.expDisplayParts, {
          s: this.s,
          expFont: this.EXP_FONT,
          atkText: this.atkText,
          itemName: this.expItemName,
          itemRarityColor: this.expItemRarityColor,
          level: this.expLevel,
          displayRatio: this.expDisplayRatio,
          levelUpFlash: this.expLevelUpFlash,
          isMax: this.expIsMax,
        });
      }
      if (this.expLevelUpFlash > 0) {
        this.expLevelUpFlash -= dt;
        if (this.expLevelUpFlash <= 0) this.expLevelUpFlash = 0;
        redrawHudItemExpBar(this.expDisplayParts, {
          s: this.s,
          expFont: this.EXP_FONT,
          atkText: this.atkText,
          itemName: this.expItemName,
          itemRarityColor: this.expItemRarityColor,
          level: this.expLevel,
          displayRatio: this.expDisplayRatio,
          levelUpFlash: this.expLevelUpFlash,
          isMax: this.expIsMax,
        });
      }
    }
  }

  // ===== Skin System =====

  /**
   * Apply a loaded UISkin. Places skin sprites behind existing dynamic elements.
   * Hides the old Graphics-based frames. Call once after skin.load() resolves.
   */
  applySkin(skin: UISkin): void {
    if (!skin.isLoaded) return;

    const s = this.s;

    // Create a skin layer that sits behind everything else
    this.skinLayer = new Container();
    this.skinLayer.sortableChildren = true;
    this.container.addChildAt(this.skinLayer, 0);

    const skinFrames = createSkinHudFrameParts(skin, s, this.skinLayer, this.layoutWrappers, this.minimapFrameVisible);
    this.skinMapFrame = skinFrames.mapFrame;
    this.skinHpFrame = skinFrames.hpFrame;
    this.skinHpFill = skinFrames.hpFill;
    this.skinHpFillMask = skinFrames.hpFillMask;
    this.skinHpFillMaxW = skinFrames.hpFillMaxW;
    this.skinHpFillMaxH = skinFrames.hpFillMaxH;
    this.skinHpFillSlashW = skinFrames.hpFillSlashW;
    this.skinFloorFill = skinFrames.floorFill;
    this.skinFloorFillMaxH = skinFrames.floorFillMaxH;
    this.skinDepthFrame = skinFrames.depthFrame;
    this.skinDepthFill = skinFrames.depthFill;
    this.skinDepthFillTex = skinFrames.depthFillTexture;
    this.skinDepthFillX = skinFrames.depthFillX;
    this.skinDepthFillY = skinFrames.depthFillY;
    this.skinDepthFillW = skinFrames.depthFillW;
    this.skinDepthFillMaxH = skinFrames.depthFillMaxH;
    this.skinDepthTickContainer = skinFrames.depthTickContainer;
    skinFrames.portraitSpritePromise?.then(sprite => {
      this.portraitSprite = sprite;
    });

    const skinKeyPrompts = createSkinHudKeyPromptParts(skin, s, this.skinLayer, this.layoutWrappers);
    this.skinFlaskCx = skinKeyPrompts.skinFlaskCx;
    this.skinFlaskCy = skinKeyPrompts.skinFlaskCy;
    this.skinFlaskR = skinKeyPrompts.skinFlaskR;
    this.skinFlaskFillTex = skinKeyPrompts.skinFlaskFillTex;
    this.skinFlaskEmptyTex = skinKeyPrompts.skinFlaskEmptyTex;
    this.skinFlaskIconW = skinKeyPrompts.skinFlaskIconW;
    this.skinFlaskIconH = skinKeyPrompts.skinFlaskIconH;
    this.skinFlaskGap = skinKeyPrompts.skinFlaskGap;
    this.skinFlaskStartX = skinKeyPrompts.skinFlaskStartX;
    this.skinFlaskStartY = skinKeyPrompts.skinFlaskStartY;
    this.flaskIconLayer = skinKeyPrompts.flaskIconLayer;
    this.skinItemKeyCx = skinKeyPrompts.skinItemKeyCx;
    this.skinItemKeyCy = skinKeyPrompts.skinItemKeyCy;
    this.skinItemKeyR = skinKeyPrompts.skinItemKeyR;

    // Hide old Graphics-based elements that the skin replaces
    this.hpBar.visible = false;
    this.flaskGfx.visible = false;
    this.flaskKeyLabel.visible = false;
    this.actionKeyBar.visible = false;
    this.sideKeyBar.visible = false;

    // Move [I] pulse glow from hidden sideKeyBar to main container
    detachDisplayObject(this.itemKeyPulseGlow);
    this.container.addChild(this.itemKeyPulseGlow);
    // Update pulse center to skin I key position
    this.itemKeyCenterX = this.skinItemKeyCx;
    this.itemKeyCenterY = this.skinItemKeyCy;
    this.itemKeySize = this.skinItemKeyR * 2;

    // Reposition text to match skin layout
    const hpFrameBounds = skin.getBounds('hud_status_hp_frame');
    const portraitBounds = skin.getBounds('hud_status_portrait_frame');
    if (hpFrameBounds) {
      const skinHpFont = this.HP_FONT * 0.75;
      applyHudSkinHpTextLayout(
        { shadow: this.hpTextShadow, text: this.hpText },
        { s, fontSize: skinHpFont, currentHp: this.currentHp, hpFrameBounds, portraitBounds },
      );
    }

    // ATK text: below flask key, same font size as flask labels
    const flaskKeyBounds = skin.getBounds('hud_status_key_flask');
    if (flaskKeyBounds) {
      applyHudSkinAtkTextLayout(
        { shadow: this.atkTextShadow, text: this.atkText },
        { s, fontSize: 16 * s, flaskKeyBounds },
      );
    }

    // Wrap the HP/ATK number labels into editable container-level wrappers
    // (they live in this.container, on top of skinLayer). Local coords are
    // preserved, so this is visually identity until applyLayout shifts them.
    const hpTextWrap = wrapHudTextPair({ shadow: this.hpTextShadow, text: this.hpText });
    this.container.addChild(hpTextWrap);
    this.layoutWrappers.set('hpText', hpTextWrap);

    const atkTextWrap = wrapHudTextPair({ shadow: this.atkTextShadow, text: this.atkText });
    this.container.addChild(atkTextWrap);
    this.layoutWrappers.set('atkText', atkTextWrap);

    this.hasSkin = true;
    // Trigger a redraw with skin HP fill
    redrawHudHpBar(this.hpBar, {
      s: this.s,
      width: this.HP_W,
      height: this.HP_H,
      currentHp: this.currentHp,
      maxHp: this.currentMaxHp,
      ghostHp: this.ghostHp,
      ghostTimer: this.ghostTimer,
      healFlashTimer: this.healFlashTimer,
      healFlashColor: this.healFlashColor,
      healFlashRatio: this.healFlashRatio,
      healFlashStartRatio: this.healFlashStartRatio,
      lowHpTimer: this.lowHpTimer,
      skinFill: this.skinHpFill,
      skinFillMask: this.skinHpFillMask,
      skinFillMaxW: this.skinHpFillMaxW,
      skinFillMaxH: this.skinHpFillMaxH,
      skinFillSlashW: this.skinHpFillSlashW,
    });

    // If depth gauge was already showing (async skin load), switch to skin mode
    if (this.depthGauge.visible) {
      this.depthGauge.visible = false;
      if (this.skinDepthFrame) this.skinDepthFrame.visible = true;
      if (this.skinDepthFill) this.skinDepthFill.visible = true;
      if (this.skinDepthTickContainer) this.skinDepthTickContainer.visible = true;
      this.depthLabels = drawHudDepthGauge({
        s: this.s,
        total: this.depthTotal,
        current: this.depthCurrent,
        cleared: this.depthCleared,
        pulseTimer: this.depthPulseTimer,
        hasSkin: this.hasSkin,
        fallbackContainer: this.depthGauge,
        fallbackGfx: this.depthGaugeGfx,
        fallbackLabels: this.depthLabels,
        skinFill: this.skinDepthFill,
        skinTickContainer: this.skinDepthTickContainer,
        skinFillX: this.skinDepthFillX,
        skinFillY: this.skinDepthFillY,
        skinFillW: this.skinDepthFillW,
        skinFillMaxH: this.skinDepthFillMaxH,
      });
    }

    // Force EXP bar redraw at new ATK position
    if (this.expBarContainer.visible) {
      redrawHudItemExpBar(this.expDisplayParts, {
        s: this.s,
        expFont: this.EXP_FONT,
        atkText: this.atkText,
        itemName: this.expItemName,
        itemRarityColor: this.expItemRarityColor,
        level: this.expLevel,
        displayRatio: this.expDisplayRatio,
        levelUpFlash: this.expLevelUpFlash,
        isMax: this.expIsMax,
      });
    }

    // Re-apply layout overrides now that the skin wrappers exist.
    this.applyLayout();
  }



}



