import { Container, Sprite, Texture } from 'pixi.js';
import type { Player } from '@entities/Player';
import { destroyDisplayObject, destroyNullableDisplayObject } from '../scenes/shared/DisplayObjectLifecycleHelpers';
import { clampEffect01 } from './EffectNumeric';

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Echo ?Œí¬ ì¤?3??ê¸€ë¦¬ì¹˜ ?¬ì¸??(ì§„í–‰??ê¸°ì?) ??alpha/x jitter + tint flicker. */
const GLITCH_POINTS = [0.22, 0.52, 0.80];
const GLITCH_HALF_WIDTH = 0.035;
const TINT_NORMAL = 0xffb06a;
const TINT_GLITCH_WARM = 0xff5566;
const TINT_GLITCH_COOL = 0x44eaff;

export class EchoPlayer {
  readonly container = new Container();
  private sprite: Sprite | null = null;
  private aura: Sprite | null = null;
  private startX = 0;
  private startY = 0;
  private width = 14;
  private height = 24;
  private facingRight = true;
  private walkFrames: Texture[] = [];
  private generatedTexture: Texture | null = null;

  constructor() {
    this.container.visible = false;
  }

  spawnFrom(player: Player, texture: Texture, walkFrames: Texture[] = []): void {
    this.destroySprites();
    this.startX = player.x;
    this.startY = player.y;
    this.width = player.width;
    this.height = player.height;
    this.facingRight = player.facingRight;
    this.walkFrames = walkFrames;
    const baseTexture = this.walkFrames[0] ?? texture;
    const useCharacterFrames = this.walkFrames.length > 0;
    if (useCharacterFrames) {
      texture.destroy(true);
    } else {
      this.generatedTexture = texture;
    }

    this.aura = new Sprite(baseTexture);
    this.aura.tint = 0x30e8ff;
    this.aura.alpha = 0.28;
    this.aura.blendMode = 'add';
    this.aura.x = this.facingRight ? -2 : 2;
    if (useCharacterFrames) {
      this.aura.anchor.set(0.5, 1);
      this.aura.x += this.width / 2;
      this.aura.y = this.height;
    }

    this.sprite = new Sprite(baseTexture);
    this.sprite.alpha = 0.78;
    this.sprite.tint = 0xffb06a;
    if (useCharacterFrames) {
      this.sprite.anchor.set(0.5, 1);
      this.sprite.x = this.width / 2;
      this.sprite.y = this.height;
    }

    this.container.addChild(this.aura, this.sprite);
    this.container.position.set(this.startX, this.startY);
    this.container.scale.set(1);
    this.container.alpha = 0;
    this.container.visible = true;
  }

  separateFromPlayer(t: number): void {
    const p = clampEffect01(t);
    const eased = p * p * (3 - 2 * p);
    // ë¶„ë¦¬ ?¨ê³„?ì„œ?????´ë™ ?†ì´ fade-in ë§? walkIntoPortal ???œì‘????    // container.x ê°€ startX ê·¸ë?ë¡œì—¬??startX ??portalX ?¨ì¼ ?´ë™ë§?ë³´ì¸??
    // (?´ì „ ë²„ì „?€ dir*10 ë§Œí¼ ?†ìœ¼ë¡??´ê¸‹????walkIntoPortal ??startX ë¡?    // ?í”„??"ë¶„ì‹ ??2ë²??¤ì–´ê°? ?¼ë¡œ ?¸ì‹??)
    this.container.x = this.startX;
    this.container.y = this.startY - 2 * Math.sin(eased * Math.PI);
    this.container.scale.set(1);
    this.container.alpha = 0.1 + eased * 0.9;
    if (this.aura) {
      this.aura.x = this.walkFrames.length > 0 ? this.width / 2 : 0;
    }
    if (this.sprite) {
      this.sprite.y = this.walkFrames.length > 0 ? this.height : 0;
      this.sprite.alpha = 0.45 + eased * 0.35;
    }
  }

  walkIntoPortal(portalX: number, portalY: number, t: number): void {
    const p = clampEffect01(t);
    const eased = p * p * (3 - 2 * p);
    const targetX = portalX - this.width / 2;
    const targetY = portalY - this.height / 2;
    const movingRight = targetX >= this.startX;
    this.container.x = lerp(this.startX, targetX, eased);
    this.container.y = lerp(this.startY, targetY, eased);
    this.container.scale.set(1);
    this.container.alpha = lerp(1, 0, clampEffect01((p - 0.72) / 0.28));

    const walk = Math.sin(p * Math.PI * 8);
    const bob = Math.abs(walk) * -1.5;
    this.applyWalkFrame(p);
    if (this.sprite) {
      this.sprite.y = this.walkFrames.length > 0 ? this.height + bob : bob;
      this.sprite.scale.x = movingRight ? 1 : -1;
    }
    if (this.aura) {
      this.aura.y = this.walkFrames.length > 0 ? this.height + bob : bob;
      this.aura.x = this.walkFrames.length > 0
        ? this.width / 2 + (movingRight ? -2 : 2) + walk * 2
        : (movingRight ? -2 : 2) + walk * 2;
      this.aura.scale.x = movingRight ? 1 : -1;
    }

    // Signal glitch ??ì§„í–‰??22/52/80% ì§€?ì—??Â±35??êµ¬ê°„ ?™ì•ˆ ?œì„±.
    // jitter(x), alpha pulse, tint flicker ë¡?"?„ì†¡ ì¤?? í˜¸ ?¤ë¥˜" ?œí˜„.
    let inGlitch = false;
    let glitchIntensity = 0;
    for (const gp of GLITCH_POINTS) {
      const d = Math.abs(p - gp);
      if (d < GLITCH_HALF_WIDTH) {
        inGlitch = true;
        glitchIntensity = 1 - d / GLITCH_HALF_WIDTH;
        break;
      }
    }
    if (inGlitch) {
      const jitter = (Math.random() - 0.5) * 4 * glitchIntensity;
      this.container.x += jitter;
      this.container.alpha *= 0.35 + Math.random() * 0.5;
      const flicker = Math.random() < 0.5 ? TINT_GLITCH_WARM : TINT_GLITCH_COOL;
      if (this.sprite) this.sprite.tint = flicker;
      if (this.aura) this.aura.alpha = 0.55 + Math.random() * 0.35;
    } else {
      if (this.sprite) this.sprite.tint = TINT_NORMAL;
      if (this.aura) this.aura.alpha = 0.28;
    }
  }

  hide(): void {
    this.container.visible = false;
    this.container.alpha = 0;
  }

  destroy(): void {
    this.destroySprites();
    destroyDisplayObject(this.container, { children: true });
  }

  private destroySprites(): void {
    this.container.removeChildren();
    destroyNullableDisplayObject(this.sprite);
    destroyNullableDisplayObject(this.aura);
    this.generatedTexture?.destroy(true);
    this.generatedTexture = null;
    this.sprite = null;
    this.aura = null;
    this.walkFrames = [];
  }

  private applyWalkFrame(t: number): void {
    if (this.walkFrames.length === 0) return;
    const frame = this.walkFrames[Math.floor(t * this.walkFrames.length * 3) % this.walkFrames.length];
    if (this.sprite) this.sprite.texture = frame;
    if (this.aura) this.aura.texture = frame;
  }
}
