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
import { GameAction, actionKey } from '@core/InputManager';
import type { ItemInstance } from '@items/ItemInstance';
import { assetPath } from '@core/AssetLoader';
import { GlowFilter } from '@effects/GlowFilter';

/** Anvil halo glow — brand key color orange (#FFA41B 2026-05-20). */
const ANVIL_HALO_GLOW_COLOR = 0xffa41b;

// Light pillar — anvil 플랫폼 표면에서 위로 솟는 빛기둥. 활성 anvil 의 식별 시그널.
// disabled 상태에선 표시하지 않음 (update 게이트).
// 바닥은 거의 불투명, 위로 갈수록 빠르게 (^1.5) 페이드 — 빛이 위쪽으로 흩어지는 느낌.
const LIGHT_PILLAR_HEIGHT_PX = 64;    // 4 tiles
const LIGHT_PILLAR_WIDTH_PX = 32;
const LIGHT_PILLAR_BANDS = 12;
// base × (1 + amp) × falloff_max(~0.94) ≤ 1.0 이어야 펄스 정점에서 i=0 band 의
// alpha 가 clamp 되어 다음 band 와 단절선이 생기는 현상을 피한다.
// 0.80 × 1.15 × 0.94 ≈ 0.87 — 안전 마진 확보.
const LIGHT_PILLAR_BASE_ALPHA = 0.80;
const LIGHT_PILLAR_PULSE_AMP = 0.15;
const LIGHT_PILLAR_FALLOFF_EXP = 1.5; // 클수록 위쪽이 빨리 사라짐
const ANVIL_CENTER_FX_X_OFFSET = 16;
const ANVIL_GATE_FX_X_NUDGE = -3;
const ANVIL_FLOOR_PLATE_CENTER_X_ADJUST = 1;
/** 빛기둥 *시작*(바닥) Y 좌표 — anvil container local. anvil entity.y 는 floor 면
 *  이라 플랫폼 상단(= floor 위 16px)에서 시작하려면 local y = -16. */
const LIGHT_PILLAR_BASE_Y = -16;

// Directional trail (E) — Anvil 사용 후 *오른쪽으로* 흐르는 1.5s 빛 트레일.
// 터널 방향 시그널. ItemDeploymentController.onOpenTunnel 콜백에서 호출.
const DIR_TRAIL_DEFAULT_MS = 1500;
const DIR_TRAIL_HEIGHT_PX = 32;
const DIR_TRAIL_BANDS = 16;
const DIR_TRAIL_PEAK_ALPHA = 0.7;

interface AsepriteAtlas {
  frames: Array<{
    frame: { x: number; y: number; w: number; h: number };
  }>;
  meta: {
    image: string;
    slices?: Array<{
      keys?: Array<{
        frame: number;
        bounds: { x: number; y: number; w: number; h: number };
        pivot?: { x: number; y: number };
      }>;
    }>;
  };
}

interface Spark {
  gfx: Graphics;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

const SPARK_SPAWN_INTERVAL = 180; // ms between idle sparks
const MAX_SPARKS = 8;
const ITEM_ICON_Y = -47;
const ITEM_PUNCH_DURATION = 1000;
const ITEM_PUNCH_SCALE_MAX = 5;
const ITEM_MOVE_TO_LASER_DURATION = 1400;

function gateFxX(x: number): number {
  return x + ANVIL_GATE_FX_X_NUDGE;
}

function floorPlateCenterX(): number {
  return gateFxX(ANVIL_CENTER_FX_X_OFFSET) + ANVIL_FLOOR_PLATE_CENTER_X_ADJUST;
}

function smoothstep01(value: number): number {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

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

  /** True after the first IW boss clear — anvil retired (Playtest 2026-04-26). */
  disabled = false;

  /** LDtk Anvil entity 의 RetireAfterFirstBoss field. true 면 첫 IW 보스 클리어
   *  후 retire (initial-spawn-disabled 또는 world-return-dialogue 시점). */
  retireAfterFirstBoss = false;

  private hintContainer: Container;
  private showHint = false;
  private timer = 0;
  private gfx: Graphics;
  private halo: Graphics;
  private lightPillar!: Graphics;
  private dirTrail!: Graphics;
  private dirTrailMs = 0;
  private dirTrailDuration = 0;
  private dirTrailLength = 0;
  private particleLayer: Container;
  private sparks: Spark[] = [];
  private sparkCooldown = 0;
  private fxSprite: Sprite | null = null;
  private fxFrames: Texture[] = [];
  private fxTimer = 0;
  private fxFrameIndex = 0;
  private fxPlaying = false;
  private itemIcon: Sprite | null = null;
  private itemPunchPhase: 'idle' | 'punch' | 'move' | 'done' = 'idle';
  private itemPunchElapsed = 0;
  private itemMoveStart = { x: floorPlateCenterX(), y: ITEM_ICON_Y };
  private itemMoveTarget = { x: 0, y: 0 };
  private itemMoveElapsed = 0;
  /** Called when FX animation completes — scene uses this to trigger warp. */
  onFxComplete: (() => void) | null = null;

  /** Cached icons so we can swap them in/out when item state changes. */
  private swordIcon: Graphics | null = null;
  private hammerIcon: Graphics | null = null;
  private keyUp: Container | null = null;
  private keyStrike: Container | null = null;

  private anvilSprite: Sprite | null = null;
  private gatePivotLocal: { x: number; y: number } | null = null;

  constructor(x: number, y: number, disabled = false) {
    this.x = x;
    this.y = y;
    this.disabled = disabled;

    this.container = new Container();
    this.container.x = x;
    this.container.y = y;

    // Halo (drawn first so it sits behind the anvil body)
    this.halo = new Graphics();
    // GPU glow halo — 모루 단조열 윤곽 (pixijs-references P1, GlowFilter).
    // disabled 상태는 setDisabled() 에서 halo.clear() 로 무효화돼 시각적으로 사라짐.
    this.halo.filters = [new GlowFilter({
      color: ANVIL_HALO_GLOW_COLOR,
      radius: 14,
      intensity: 1.2,
      coreBoost: 0.4,
    })];
    this.container.addChild(this.halo);

    // Light pillar rises from the floor plate center.
    // halo 와 같은 시점에 add → anvil sprite 뒤. blendMode 'add' 로 빛 합성.
    this.lightPillar = new Graphics();
    this.lightPillar.blendMode = 'add';
    this.container.addChild(this.lightPillar);

    // Directional trail — anvil 사용 후 오른쪽으로 흐르는 1.5s 빛 트레일.
    // triggerDirectionalTrail() 호출 전에는 빈 Graphics.
    this.dirTrail = new Graphics();
    this.dirTrail.blendMode = 'add';
    this.container.addChild(this.dirTrail);

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
    this.hintContainer.x = floorPlateCenterX();
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
      this.gatePivotLocal = null;

      const atlas = await fetch(assetPath('assets/sprites/anvil_gate_01_atlas.json'))
        .then(r => r.json()) as AsepriteAtlas;
      const frame = atlas.frames[this.disabled ? 1 : 0]?.frame ?? atlas.frames[0]?.frame;
      if (!frame) throw new Error('anvil_gate_01_atlas.json has no frame');

      const tex = await Assets.load<Texture>(assetPath(`assets/sprites/${atlas.meta.image}`));
      tex.source.scaleMode = 'nearest';
      const sprite = new Sprite(new Texture({
        source: tex.source,
        frame: new Rectangle(frame.x, frame.y, frame.w, frame.h),
      }));
      sprite.anchor.set(0.5, 1); // bottom-center pivot
      this.anvilSprite = sprite;
      this.gatePivotLocal = this.readGatePivotLocal(atlas, frame.w, frame.h);
      this.gfx.visible = false;
      this.container.addChildAt(sprite, this.container.getChildIndex(this.gfx));
    } catch {
      // Sprite not found — keep placeholder Graphics
    }
  }

  private readGatePivotLocal(atlas: AsepriteAtlas, frameW: number, frameH: number): { x: number; y: number } {
    const key = atlas.meta.slices?.[0]?.keys?.[0];
    if (!key) return { x: frameW, y: Math.floor(frameH * 0.5) };
    const pivot = key.pivot ?? { x: Math.floor(key.bounds.w * 0.5), y: Math.floor(key.bounds.h * 0.5) };
    return {
      x: key.bounds.x + pivot.x,
      y: key.bounds.y + pivot.y,
    };
  }

  getGatePivotWorld(): { x: number; y: number } | null {
    if (!this.anvilSprite || !this.gatePivotLocal) return null;
    return {
      x: this.x + this.gatePivotLocal.x - this.anvilSprite.width * this.anvilSprite.anchor.x + ANVIL_GATE_FX_X_NUDGE,
      y: this.y + this.gatePivotLocal.y - this.anvilSprite.height * this.anvilSprite.anchor.y,
    };
  }

  getFloorPlateCenterWorld(): { x: number; y: number } {
    return {
      x: this.x + floorPlateCenterX(),
      y: this.y - this.height,
    };
  }

  /**
   * Mark this anvil as retired (Playtest 2026-04-26 fix #1).
   * Swaps to the disabled sprite and hides all approach affordances.
   * Idempotent — safe to call repeatedly.
   */
  async setDisabled(disabled: boolean): Promise<void> {
    if (this.disabled === disabled) return;
    this.disabled = disabled;
    if (this.anvilSprite) {
      this.container.removeChild(this.anvilSprite);
      this.anvilSprite.destroy();
      this.anvilSprite = null;
    }
    await this.loadAnvilSprite();
    if (this.container.destroyed) return;
    if (disabled) {
      if (this.hintContainer) this.hintContainer.visible = false;
      for (const s of this.sparks) {
        this.particleLayer.removeChild(s.gfx);
        s.gfx.destroy();
      }
      this.sparks = [];
      // 빛기둥 즉시 제거 — disabled 상태는 비활성 시그널이므로 표시 금지.
      if (this.lightPillar && !this.lightPillar.destroyed) {
        this.lightPillar.clear();
      }
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
    // Use the action-bound icon so the glyph hot-swaps when device flips
    // (keyboard W ↔ pad ↑) — static createKeyIcon would lock to the device
    // active at construction time.
    this.keyUp = KeyPrompt.createKeyIconForAction(GameAction.LOOK_UP, 9);
    this.keyUp.x = 0;
    this.keyUp.y = 0;
    c.addChild(this.keyUp);

    this.swordIcon = buildSwordIcon();
    this.swordIcon.x = 11;
    this.swordIcon.y = -1;
    c.addChild(this.swordIcon);

    // Placed state: C key + hammer icon (stacked on top — hidden by default)
    this.keyStrike = KeyPrompt.createKeyIcon(actionKey(GameAction.ATTACK), 9);
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

  /** Place a weapon on the anvil and show its actual item icon. */
  placeItem(item: ItemInstance): void {
    if (this.disabled) return;
    this.item = item;
    this.resetPlacedItemEffect();

    this.showItemIcon(item);

    // FX019 sprite playback is intentionally disabled while the Item World
    // entry transition is being reworked.
    // this.playActivationFX();

    // Symbol prompt now advertises strike action
    this.refreshSymbolPrompt();
  }

  clearPlacedItem(): void {
    this.item = null;
    this.used = false;
    this.resetPlacedItemEffect();
    if (this.itemIcon) {
      this.container.removeChild(this.itemIcon);
      this.itemIcon.destroy();
      this.itemIcon = null;
    }
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
      icon.x = floorPlateCenterX();
      icon.y = ITEM_ICON_Y;
      this.itemIcon = icon;
      this.container.addChild(icon);
    }).catch(() => { /* no icon available */ });
  }

  getPlacedItemWorld(): { x: number; y: number } | null {
    if (!this.itemIcon) return null;
    return {
      x: this.x + this.itemIcon.x,
      y: this.y + this.itemIcon.y,
    };
  }

  startPlacedItemPunch(): void {
    if (!this.itemIcon) return;
    this.itemIcon.visible = true;
    this.itemIcon.x = floorPlateCenterX();
    this.itemIcon.y = ITEM_ICON_Y;
    this.itemIcon.alpha = 1;
    this.itemIcon.scale.set(1);
    this.itemIcon.filters = [];
    this.itemPunchPhase = 'punch';
    this.itemPunchElapsed = 0;
  }

  startPlacedItemMoveToLaser(worldTargetX: number, worldTargetY: number): void {
    if (!this.itemIcon) return;
    this.itemPunchPhase = 'move';
    this.itemMoveStart = {
      x: this.itemIcon.x,
      y: this.itemIcon.y,
    };
    this.itemMoveTarget = {
      x: worldTargetX - this.x,
      y: worldTargetY - this.y,
    };
    this.itemIcon.visible = true;
    this.itemIcon.alpha = 1;
    this.itemIcon.filters = [];
    this.itemMoveElapsed = 0;
  }

  finishPlacedItemAsWorld(): void {
    if (!this.itemIcon) return;
    this.itemPunchPhase = 'done';
    this.itemIcon.visible = false;
    this.itemIcon.alpha = 0;
  }

  private resetPlacedItemEffect(): void {
    this.itemPunchPhase = 'idle';
    this.itemPunchElapsed = 0;
    this.itemMoveElapsed = 0;
    if (this.itemIcon) {
      this.itemIcon.visible = true;
      this.itemIcon.alpha = 1;
      this.itemIcon.x = floorPlateCenterX();
      this.itemIcon.y = ITEM_ICON_Y;
      this.itemIcon.scale.set(1);
      this.itemIcon.filters = [];
    }
  }

  private updatePlacedItemEffect(dt: number): void {
    if (this.itemPunchPhase === 'punch') {
      if (!this.itemIcon) return;
      this.itemPunchElapsed += dt;
      const t = Math.min(1, this.itemPunchElapsed / ITEM_PUNCH_DURATION);
      this.itemIcon.scale.set(1 + t * (ITEM_PUNCH_SCALE_MAX - 1));
      return;
    }

    if (this.itemPunchPhase !== 'move' || !this.itemIcon) return;
    this.itemMoveElapsed += dt;
    const t = Math.min(1, this.itemMoveElapsed / ITEM_MOVE_TO_LASER_DURATION);
    const eased = smoothstep01(t);
    this.itemIcon.x = this.itemMoveStart.x + (this.itemMoveTarget.x - this.itemMoveStart.x) * eased;
    this.itemIcon.y = this.itemMoveStart.y + (this.itemMoveTarget.y - this.itemMoveStart.y) * eased;
    this.itemIcon.alpha = 1;
    this.itemIcon.scale.set(1 + eased * (ITEM_PUNCH_SCALE_MAX - 1));

    if (this.itemMoveElapsed >= ITEM_MOVE_TO_LASER_DURATION) {
      this.itemPunchPhase = 'done';
      this.itemIcon.visible = false;
    }
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
    this.fxSprite.x = floorPlateCenterX();
    this.fxSprite.y = -47;
    this.fxSprite.scale.set(0.84);
    this.fxSprite.blendMode = 'add';
    this.container.addChild(this.fxSprite);

    this.fxTimer = 0;
    this.fxFrameIndex = 0;
    this.fxPlaying = true;

    // Drive animation via requestAnimationFrame (works during hitstop).
    // Use real elapsed time (performance.now delta) so playback speed is
    // independent of monitor refresh rate — a fixed +16.67/rAF would play
    // 2-4× too fast on 144Hz / 240Hz displays.
    // Start icon scale-up when FX reaches 70% progress.
    const totalFrames = this.fxFrames.length;
    const scaleUpStart = Math.floor(totalFrames * 0.7);
    let iconScaling = false;
    let iconScale = 1.0;
    let lastTime = performance.now();

    const animate = () => {
      if (!this.fxPlaying || !this.fxSprite) return;
      const now = performance.now();
      const dt = Math.min(100, now - lastTime); // clamp to avoid huge jumps after tab-switch
      lastTime = now;

      this.fxTimer += dt;
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

      // Icon scale-up animation (accelerating growth) — frame-rate independent.
      // 0.15 per 16.67ms ≈ 9.0/sec, matching the original 60Hz tuning.
      if (iconScaling && this.itemIcon) {
        iconScale += 0.15 * (dt / 16.67);
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
      this.hintContainer.visible = show && !this.used && !this.disabled;
      if (this.hintContainer.visible) this.refreshSymbolPrompt();
    }
  }

  /**
   * Anvil 사용 후 *오른쪽으로* 흐르는 빛 트레일. 터널 방향을 시각적으로 안내.
   * @param lengthPx 트레일 길이(px) — 보통 터널 width.
   * @param durationMs 1.5s 기본.
   */
  triggerDirectionalTrail(lengthPx: number, durationMs: number = DIR_TRAIL_DEFAULT_MS): void {
    this.dirTrailLength = Math.max(0, lengthPx);
    this.dirTrailDuration = Math.max(1, durationMs);
    this.dirTrailMs = this.dirTrailDuration;
  }

  update(dt: number): void {
    this.timer += dt;
    const t = this.timer / 1000;

    // Body gentle breathing
    this.gfx.alpha = 0.9 + Math.sin(t * 2) * 0.1;

    // Item icon float animation at gate center + 50px down
    if (this.itemIcon) {
      if (this.itemPunchPhase === 'idle') {
        this.itemIcon.y = ITEM_ICON_Y + Math.sin(t * 3) * 2;
      }
    }
    this.updatePlacedItemEffect(dt);

    // FX019 spritesheet animation is driven by playActivationFX() via rAF.
    // update() must NOT advance frames independently — doing so races with
    // the rAF loop and can clear fxPlaying before onFxComplete fires.

    // --- Light pillar (활성 시그널) ---------------------------------------
    // 아이템 배치 위치에서 위로 4타일 솟는 빛기둥. 아래쪽 선명 → 위로 갈수록
    // linear 페이드. 펄스는 halo outer ring 과 동기화 (t * 1.5) — 안빌 전체가
    // 한 박자로 호흡. disabled / used 상태에선 그리지 않음.
    if (this.lightPillar && !this.lightPillar.destroyed) {
      this.lightPillar.clear();
      if (!this.used && !this.disabled) {
        const pulse = 1 + Math.sin(t * 1.5) * LIGHT_PILLAR_PULSE_AMP;
        const baseY = LIGHT_PILLAR_BASE_Y;
        const halfW = LIGHT_PILLAR_WIDTH_PX / 2;
        const centerX = floorPlateCenterX();
        for (let i = 0; i < LIGHT_PILLAR_BANDS; i++) {
          const tMid = (i + 0.5) / LIGHT_PILLAR_BANDS;     // 0(bottom) ~ 1(top)
          const falloff = (1 - tMid) ** LIGHT_PILLAR_FALLOFF_EXP;
          const alpha = LIGHT_PILLAR_BASE_ALPHA * pulse * falloff;
          const y0 = baseY - ((i + 1) / LIGHT_PILLAR_BANDS) * LIGHT_PILLAR_HEIGHT_PX;
          const y1 = baseY - (i / LIGHT_PILLAR_BANDS) * LIGHT_PILLAR_HEIGHT_PX;
          this.lightPillar
            .rect(centerX - halfW, y0, LIGHT_PILLAR_WIDTH_PX, y1 - y0)
            .fill({ color: ANVIL_HALO_GLOW_COLOR, alpha });
        }
      }
    }

    // --- Directional trail (E) -------------------------------------------
    // anvil 사용 후 *오른쪽으로* 흐르는 빛 트레일. 길이=tunnel width, 1.5s fade.
    // bands 별 alpha falloff + 시간 fade-in/out 곱셈. 활성 안되면 clear.
    if (this.dirTrail && !this.dirTrail.destroyed) {
      this.dirTrail.clear();
      if (this.dirTrailMs > 0 && this.dirTrailDuration > 0 && this.dirTrailLength > 0) {
        this.dirTrailMs = Math.max(0, this.dirTrailMs - dt);
        const lifeT = 1 - this.dirTrailMs / this.dirTrailDuration; // 0 → 1
        // 시간 envelope: 앞 20% fade-in, 뒤 50% fade-out
        let timeAlpha: number;
        if (lifeT < 0.2) timeAlpha = lifeT / 0.2;
        else if (lifeT > 0.5) timeAlpha = (1 - lifeT) / 0.5;
        else timeAlpha = 1;
        const baseY = LIGHT_PILLAR_BASE_Y;
        const halfH = DIR_TRAIL_HEIGHT_PX / 2;
        const startX = floorPlateCenterX();
        for (let i = 0; i < DIR_TRAIL_BANDS; i++) {
          const tMid = (i + 0.5) / DIR_TRAIL_BANDS;     // 0(near anvil) → 1(far)
          const falloff = (1 - tMid) ** 1.4;
          const alpha = DIR_TRAIL_PEAK_ALPHA * timeAlpha * falloff;
          const x0 = startX + (i / DIR_TRAIL_BANDS) * this.dirTrailLength;
          const x1 = startX + ((i + 1) / DIR_TRAIL_BANDS) * this.dirTrailLength;
          this.dirTrail
            .rect(x0, baseY - halfH, x1 - x0, DIR_TRAIL_HEIGHT_PX)
            .fill({ color: ANVIL_HALO_GLOW_COLOR, alpha });
        }
      }
    }

    // --- Halo pulse (A3 affordance) --------------------------------------
    // Slow outer ring + faster inner shimmer. Strengthens on approach.
    // Anchored to the anvil top surface (y = -this.height - 1).
    if (!this.halo || this.halo.destroyed) return;
    this.halo.clear();
    if (!this.used && !this.disabled) {
      const strongMul = this.showHint ? 1.6 : 1.0;
      const outerR = 13 + Math.sin(t * 1.5) * 3;
      const outerA = (0.15 + Math.sin(t * 1.5) * 0.1) * strongMul;
      const innerR = 7 + Math.sin(t * 3.2) * 1.5;
      const innerA = (0.22 + Math.sin(t * 3.2) * 0.13) * strongMul;
      const haloY = -this.height - 1;
      this.halo
        .circle(gateFxX(ANVIL_CENTER_FX_X_OFFSET), haloY, outerR)
        .fill({ color: 0xffaa66, alpha: Math.max(0, outerA) });
      this.halo
        .circle(gateFxX(ANVIL_CENTER_FX_X_OFFSET), haloY, innerR)
        .fill({ color: 0xffffcc, alpha: Math.max(0, innerA) });
    }

    // --- Spark emitter ---------------------------------------------------
    if (!this.used && !this.disabled) {
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
    g.x = gateFxX(ANVIL_CENTER_FX_X_OFFSET) + (Math.random() - 0.5) * 10;
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
