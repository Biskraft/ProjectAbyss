import { Container, Sprite, Texture } from 'pixi.js';
import type { Player } from '@entities/Player';

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Echo 워크 중 3회 글리치 포인트 (진행도 기준) — alpha/x jitter + tint flicker. */
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
    const p = Math.max(0, Math.min(1, t));
    const eased = p * p * (3 - 2 * p);
    // 분리 단계에서는 옆 이동 없이 fade-in 만. walkIntoPortal 이 시작될 때
    // container.x 가 startX 그대로여야 startX → portalX 단일 이동만 보인다.
    // (이전 버전은 dir*10 만큼 옆으로 어긋난 후 walkIntoPortal 이 startX 로
    // 점프해 "분신이 2번 들어감" 으로 인식됨.)
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
    const p = Math.max(0, Math.min(1, t));
    const eased = p * p * (3 - 2 * p);
    const targetX = portalX - this.width / 2;
    const targetY = portalY - this.height / 2;
    const movingRight = targetX >= this.startX;
    this.container.x = lerp(this.startX, targetX, eased);
    this.container.y = lerp(this.startY, targetY, eased);
    this.container.scale.set(1);
    this.container.alpha = lerp(1, 0, Math.max(0, (p - 0.72) / 0.28));

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

    // Signal glitch — 진행도 22/52/80% 지점에서 ±35‰ 구간 동안 활성.
    // jitter(x), alpha pulse, tint flicker 로 "전송 중 신호 오류" 표현.
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
    this.container.destroy({ children: true });
  }

  private destroySprites(): void {
    this.container.removeChildren();
    this.sprite?.destroy();
    this.aura?.destroy();
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
