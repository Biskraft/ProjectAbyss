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

  // 설치 fontSize 는 게임에서 자주 쓰는 8/10/12/15/16/20/24-pt 의 공약수에 가까운 120 을
  // source 로 잡아 nearest 다운샘플 시 정수 배율로 떨어지게 한다.
  //   8 → 1/15, 10 → 1/12, 12 → 1/10, 15 → 1/8, 16 → 1/7.5(살짝 비정수),
  //   20 → 1/6, 24 → 1/5
  // 인벤토리에서 자주 쓰는 10-pt 가 픽셀 퍼펙트로 보정된다.
  // (이전 단계: 16 → 48. 사용자 결정 2026-05-07 — 텍스트 선명도 추가 강화.)
  // letterSpacing 도 install fontSize 비례 (120/16 = 7.5x → 약 8) 해 시각 간격 유지.
  BitmapFont.install({
    name: PIXEL_FONT,
    style: {
      fontFamily: uiFamily,
      fontSize: 120 * scale,
      fontWeight: '700',
      fill: 0xffffff,
      letterSpacing: 8 * scale,
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

  // 설치 fontSize 144 — 타이틀 / AreaTitle 가 36-pt 로 자주 쓰므로 36/144 = 1/4
  // 정수 비율 다운샘플로 깔끔. (이전 48 * scale 는 36-pt 가 3/4 비정수.)
  // letterSpacing 도 144/48 = 3 배 비례 (8 → 24).
  BitmapFont.install({
    name: TITLE_FONT,
    style: {
      fontFamily: titleFamily,
      fontSize: 144 * scale,
      fontWeight: '900',
      fill: 0xffffff,
      letterSpacing: 24 * scale,
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
