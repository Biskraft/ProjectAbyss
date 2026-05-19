import { Container, Graphics } from 'pixi.js';
import { GAME_HEIGHT, GAME_WIDTH } from '../Game';

export class TransitionOverlay {
  readonly container = new Container();
  private readonly black = new Graphics();
  private readonly scanlines = new Graphics();
  private readonly noise = new Graphics();
  private readonly portalCutout = new Graphics();

  constructor() {
    this.black.rect(0, 0, GAME_WIDTH, GAME_HEIGHT).fill(0x000000);
    this.black.alpha = 0;
    this.scanlines.alpha = 0;
    this.noise.alpha = 0;
    this.container.addChild(this.black);
    this.container.addChild(this.scanlines);
    this.container.addChild(this.noise);
    this.container.addChild(this.portalCutout);
  }

  setDarkness(alpha: number): void {
    this.black.alpha = Math.max(0, Math.min(1, alpha));
  }

  /**
   * signal_cut 단계 — 화면을 black 으로 덮고 포탈 위치 ring/disk 만 남긴다.
   * (스캔라인/픽셀 노이즈 제거 — 2026-05-20 사용자 요청)
   *
   *   t: 0→1 진행도
   *   (portalX, portalY): screen-space center
   *   color: rarity 색
   */
  updateSignalCut(t: number, portalX: number, portalY: number, color: number): void {
    const p = Math.max(0, Math.min(1, t));
    this.setDarkness(1);
    this.scanlines.clear();
    this.scanlines.alpha = 0;
    this.noise.clear();
    this.noise.alpha = 0;

    // 포탈 위치 ring + 중심 disk — 신호 송신점 잔존.
    this.portalCutout.clear();
    const pulse = 1 + Math.sin(p * Math.PI * 8) * 0.06;
    this.portalCutout
      .circle(portalX, portalY, 22 * pulse)
      .stroke({ color, width: 3, alpha: 0.9 });
    this.portalCutout
      .circle(portalX, portalY, 11 * pulse)
      .fill({ color: 0xffffff, alpha: 0.22 });
  }

  /**
   * fade_out_hold 단계 — black darkness 만 1.0 으로 유지, scanline/noise/portalCutout
   * 은 전부 클리어. 신호 노이즈가 완전히 끊어진 "전송 종료" 직후의 정적.
   */
  holdBlack(): void {
    this.setDarkness(1);
    this.scanlines.clear();
    this.scanlines.alpha = 0;
    this.noise.clear();
    this.noise.alpha = 0;
    this.portalCutout.clear();
  }

  reset(): void {
    this.black.alpha = 0;
    this.scanlines.clear();
    this.scanlines.alpha = 0;
    this.noise.clear();
    this.noise.alpha = 0;
    this.portalCutout.clear();
  }

  destroy(): void {
    if (this.container.parent) this.container.parent.removeChild(this.container);
    this.container.destroy({ children: true });
  }
}
