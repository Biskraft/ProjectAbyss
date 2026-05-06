import { BitmapFont } from 'pixi.js';

/**
 * UI font for in-game HUD, toasts, menus.
 * Rajdhani — clean technical sans-serif matching presentation tone.
 */
export const PIXEL_FONT = 'GameUI';

/** Title screen font — Cinzel serif for cinematic feel. */
export const TITLE_FONT = 'CinzelTitle';

/**
 * Install BitmapFonts at native resolution for crisp text.
 * @param scale Integer pixel scale (1=640, 2=1280, 3=1920).
 */
export function installBitmapFont(scale = 1): void {
  // In-game UI font (Rajdhani — presentation-matched technical sans)
  // Falls back to Press Start 2P if Rajdhani unavailable
  const uiFamily = document.fonts.check('700 12px "Rajdhani"')
    ? '"Rajdhani", sans-serif'
    : '"Press Start 2P", monospace';

  // 설치 fontSize 는 게임에서 자주 쓰는 8/12/16-pt 의 LCM(48) 을 source 로 잡아
  // nearest 다운샘플 시 1/6 / 1/4 / 1/3 정수배 비율 → 픽셀 퍼펙트.
  // (이전 16*scale source 는 12-pt 가 0.75x 비정수 비율로 떨어져 글리프가 흐릿했다.
  //  사용자 결정 2026-05-07 — UI 텍스트 선명도 개선.)
  // letterSpacing 도 install fontSize 비례로 3 배 (1*scale → 3*scale) 해 시각 간격 유지.
  BitmapFont.install({
    name: PIXEL_FONT,
    style: {
      fontFamily: uiFamily,
      fontSize: 48 * scale,
      fontWeight: '700',
      fill: 0xffffff,
      letterSpacing: 3 * scale,
    },
    chars: [
      ['a', 'z'],
      ['A', 'Z'],
      ['0', '9'],
      // ○□△ 는 PlayStation 패드 페이스 글리프 (System_Input_Gamepad §3.3).
      // ▶▼ 은 LoreDisplay advance hint.
      ' .,;:!?-+=/\\@#$%^&*()[]{}\'\"<>_~`|→←↑↓…×♦★○□△▶▼',
    ],
    // 픽셀 미학 유지 — uiScale 배수 컨테이너에서 글리프가 nearest 정수배로 깔끔히 떨어진다.
    textureStyle: { scaleMode: 'nearest' },
  });

  // Title font — Cinzel serif
  const titleFamily = document.fonts.check('900 12px "Cinzel"')
    ? '"Cinzel", serif'
    : '"Press Start 2P", monospace';

  BitmapFont.install({
    name: TITLE_FONT,
    style: {
      fontFamily: titleFamily,
      fontSize: 48 * scale,
      fontWeight: '900',
      fill: 0xffffff,
      letterSpacing: 8 * scale,
    },
    chars: [
      ['A', 'Z'],
      ['a', 'z'],
      ['0', '9'],
      ' -:.',
    ],
    textureStyle: { scaleMode: 'nearest' },
  });
}
