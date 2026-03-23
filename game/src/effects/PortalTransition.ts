import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../Game';
import { PIXEL_FONT } from '@ui/fonts';
import { PORTAL_COLOR, type PortalSourceType } from '@entities/Portal';
import type { Rarity } from '@data/weapons';
import type { ItemInstance } from '@items/ItemInstance';

/**
 * Portal entry transition effect (Sakurai-inspired).
 *
 * Timeline (~1.8s):
 *   0.0~0.1s  Flash (bright + dark alternation)
 *   0.1~0.4s  Portal pulse + camera shake
 *   0.4~0.9s  Player absorption (shrink + rotate toward center)
 *   0.9~1.3s  Text display (item info fade in)
 *   1.3~1.8s  Screen fill with portal color → done
 */

const TOTAL_DURATION = 1800;

// Phase boundaries in ms
const PHASE_FLASH_END = 100;
const PHASE_PULSE_END = 400;
const PHASE_ABSORB_END = 900;
const PHASE_TEXT_END = 1300;

const SHAKE_INTENSITY: Record<Rarity, number> = {
  common: 2,
  uncommon: 3,
  rare: 5,
  legendary: 8,
  mythic: 12,
};

const textStyle = new TextStyle({
  fontSize: 10,
  fill: 0xffffff,
  fontFamily: PIXEL_FONT,
  align: 'center',
  dropShadow: { color: 0x000000, blur: 2, distance: 1 },
});

export class PortalTransition {
  container: Container;
  private flashOverlay: Graphics;
  private fillOverlay: Graphics;
  private infoText: Text;
  private portalGfx: Graphics;

  private timer = 0;
  private done = false;
  private color: number;
  private rarity: Rarity;
  private shakeIntensity: number;

  // Portal world position (for camera-relative positioning)
  private portalScreenX: number;
  private portalScreenY: number;

  // Callbacks
  onShake: ((intensity: number) => void) | null = null;
  onHitstop: ((frames: number) => void) | null = null;

  constructor(
    portalScreenX: number,
    portalScreenY: number,
    rarity: Rarity,
    sourceType: PortalSourceType,
    sourceItem?: ItemInstance,
  ) {
    this.portalScreenX = portalScreenX;
    this.portalScreenY = portalScreenY;
    this.rarity = rarity;
    this.color = PORTAL_COLOR[rarity];
    this.shakeIntensity = SHAKE_INTENSITY[rarity];

    this.container = new Container();

    // Flash overlay (full screen)
    this.flashOverlay = new Graphics();
    this.flashOverlay.rect(0, 0, GAME_WIDTH, GAME_HEIGHT).fill(0xffffff);
    this.flashOverlay.alpha = 0;
    this.container.addChild(this.flashOverlay);

    // Portal expanding graphic
    this.portalGfx = new Graphics();
    this.container.addChild(this.portalGfx);

    // Info text
    const label = sourceType === 'monster'
      ? `??? [${rarity.toUpperCase()}]`
      : sourceItem
        ? `${sourceItem.def.name} Lv${sourceItem.level} [${rarity.toUpperCase()}]`
        : `[${rarity.toUpperCase()}]`;

    this.infoText = new Text({ text: label, style: { ...textStyle, fill: this.color } });
    this.infoText.anchor.set(0.5);
    this.infoText.x = GAME_WIDTH / 2;
    this.infoText.y = GAME_HEIGHT / 2 - 20;
    this.infoText.alpha = 0;
    this.container.addChild(this.infoText);

    // Fill overlay (portal color, used in final phase)
    this.fillOverlay = new Graphics();
    this.fillOverlay.rect(0, 0, GAME_WIDTH, GAME_HEIGHT).fill(this.color);
    this.fillOverlay.alpha = 0;
    this.container.addChild(this.fillOverlay);
  }

  get isDone(): boolean {
    return this.done;
  }

  update(dt: number): void {
    if (this.done) return;

    this.timer += dt;

    if (this.timer < PHASE_FLASH_END) {
      // Phase 1: Flash — alternate bright/dark frames (Sakurai flash principle)
      this.updateFlash();
    } else if (this.timer < PHASE_PULSE_END) {
      // Phase 2: Portal pulse + shake
      this.flashOverlay.alpha = 0;
      this.updatePulse();
    } else if (this.timer < PHASE_ABSORB_END) {
      // Phase 3: Player absorption visual (portal grows)
      this.updateAbsorb();
    } else if (this.timer < PHASE_TEXT_END) {
      // Phase 4: Text display
      this.updateText();
    } else if (this.timer < TOTAL_DURATION) {
      // Phase 5: Screen fill
      this.updateFill();
    } else {
      this.done = true;
      this.fillOverlay.alpha = 1;
    }
  }

  private updateFlash(): void {
    const t = this.timer;
    // Alternate bright/dark every ~33ms (2 frames) — Sakurai: mix light + dark
    const frame = Math.floor(t / 33);
    if (frame % 2 === 0) {
      this.flashOverlay.clear();
      this.flashOverlay.rect(0, 0, GAME_WIDTH, GAME_HEIGHT).fill(0xffffff);
      this.flashOverlay.alpha = 0.8;
    } else {
      this.flashOverlay.clear();
      this.flashOverlay.rect(0, 0, GAME_WIDTH, GAME_HEIGHT).fill(0x000000);
      this.flashOverlay.alpha = 0.5;
    }

    // Trigger hitstop at start
    if (this.timer < 20) {
      const hitstopFrames = this.rarity === 'mythic' ? 6 : this.rarity === 'legendary' ? 4 : 2;
      this.onHitstop?.(hitstopFrames);
    }
  }

  private updatePulse(): void {
    const progress = (this.timer - PHASE_FLASH_END) / (PHASE_PULSE_END - PHASE_FLASH_END);

    // Camera shake — start strong, decay (Sakurai: amplitude converges)
    const shakeNow = this.shakeIntensity * (1 - progress * 0.3);
    this.onShake?.(shakeNow);

    // Draw expanding portal at screen position
    const size = 20 + progress * 30;
    this.portalGfx.clear();
    this.portalGfx.ellipse(this.portalScreenX, this.portalScreenY, size / 2 + 2, size / 1.4 + 2)
      .fill({ color: 0x000000, alpha: 0.6 });
    this.portalGfx.ellipse(this.portalScreenX, this.portalScreenY, size / 2, size / 1.4)
      .fill({ color: this.color, alpha: 0.8 });
    this.portalGfx.ellipse(this.portalScreenX, this.portalScreenY, size / 4, size / 2.8)
      .fill({ color: 0xffffff, alpha: 0.4 });
  }

  private updateAbsorb(): void {
    const progress = (this.timer - PHASE_PULSE_END) / (PHASE_ABSORB_END - PHASE_PULSE_END);

    // Shake intensifies
    const shakeNow = this.shakeIntensity * (0.7 + progress * 0.3);
    this.onShake?.(shakeNow);

    // Portal grows toward screen center
    const cx = this.portalScreenX + (GAME_WIDTH / 2 - this.portalScreenX) * progress;
    const cy = this.portalScreenY + (GAME_HEIGHT / 2 - this.portalScreenY) * progress;
    const size = 50 + progress * 80; // 130% exaggeration (Sakurai)

    this.portalGfx.clear();
    this.portalGfx.ellipse(cx, cy, size / 2 + 2, size / 1.4 + 2)
      .fill({ color: 0x000000, alpha: 0.5 * (1 - progress * 0.5) });
    this.portalGfx.ellipse(cx, cy, size / 2, size / 1.4)
      .fill({ color: this.color, alpha: 0.8 });
    this.portalGfx.ellipse(cx, cy, size / 3, size / 2)
      .fill({ color: 0xffffff, alpha: 0.3 * (1 - progress) });
  }

  private updateText(): void {
    const progress = (this.timer - PHASE_ABSORB_END) / (PHASE_TEXT_END - PHASE_ABSORB_END);

    // Text fades in
    this.infoText.alpha = Math.min(1, progress * 2);

    // Portal stays centered and large
    const size = 130 + progress * 20;
    this.portalGfx.clear();
    this.portalGfx.ellipse(GAME_WIDTH / 2, GAME_HEIGHT / 2, size / 2, size / 1.4)
      .fill({ color: this.color, alpha: 0.8 });

    // Shake at peak then decay
    const shakeNow = this.shakeIntensity * (1 - progress * 0.5);
    this.onShake?.(shakeNow);
  }

  private updateFill(): void {
    const progress = (this.timer - PHASE_TEXT_END) / (TOTAL_DURATION - PHASE_TEXT_END);

    // Fill screen with portal color
    this.fillOverlay.alpha = progress;

    // Text stays visible then fades at end
    this.infoText.alpha = 1 - Math.max(0, (progress - 0.5) * 2);

    // Shake decays to zero (Sakurai: converge)
    const shakeNow = this.shakeIntensity * (1 - progress);
    this.onShake?.(shakeNow);
  }

  destroy(): void {
    if (this.container.parent) {
      this.container.parent.removeChild(this.container);
    }
    this.container.destroy({ children: true });
  }
}
