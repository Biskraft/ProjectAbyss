/**
 * padGlyphs.ts
 *
 * Standard Mapping 버튼 인덱스 → 브랜드별 표시 라벨.
 *
 * 참조: Documents/System/System_Input_Gamepad.md §3.3 / §8.2 / §8.3
 *
 * v1: BitmapFont (game/src/ui/fonts.ts) 가 지원하는 글리프만 사용.
 *   - PS 페이스: ×○□△ (fonts.ts chars 에 추가됨)
 *   - 트리거/범퍼: 'L1/R1' (PS), 'LB/RB' (Xbox/Switch baseline) 등
 *
 * v2 (후속): 그래픽 아이콘 sprite (32×32 px 배지 — 4 브랜드 × 16 버튼 atlas).
 */

import { GP, type ControllerBrand } from './gamepadStandard';

/** 브랜드 → 사람이 읽는 라벨 (토스트 / UI 카피용). 영어 1순위. */
export function brandLabel(brand: ControllerBrand): string {
  switch (brand) {
    case 'xbox':        return 'Xbox';
    case 'playstation': return 'PlayStation';
    case 'switch':      return 'Switch';
    default:            return 'Gamepad';
  }
}

export function getButtonGlyph(btn: number, brand: ControllerBrand): string {
  switch (btn) {
    // ── Face buttons (1차 niche 협상 불가 매핑) ─────────────────────────────
    case GP.FACE_DOWN:
      return brand === 'playstation' ? '×' /* × */
           : brand === 'switch'      ? 'B'
           :                            'A';
    case GP.FACE_RIGHT:
      return brand === 'playstation' ? '○' /* ○ */
           : brand === 'switch'      ? 'A'
           :                            'B';
    case GP.FACE_LEFT:
      return brand === 'playstation' ? '□' /* □ */
           : brand === 'switch'      ? 'Y'
           :                            'X';
    case GP.FACE_UP:
      return brand === 'playstation' ? '△' /* △ */
           : brand === 'switch'      ? 'X'
           :                            'Y';

    // ── Bumpers / Triggers ────────────────────────────────────────────────
    case GP.LB: return brand === 'playstation' ? 'L1' : 'LB';
    case GP.RB: return brand === 'playstation' ? 'R1' : 'RB';
    case GP.LT: return brand === 'playstation' ? 'L2' : 'LT';
    case GP.RT: return brand === 'playstation' ? 'R2' : 'RT';

    // ── Center cluster ───────────────────────────────────────────────────
    case GP.BACK:  return brand === 'playstation' ? 'TP' : 'VW' /* View / Back */;
    case GP.START: return brand === 'playstation' ? 'OP' : 'ST';

    // ── Sticks / D-Pad ───────────────────────────────────────────────────
    case GP.LSTICK: return 'L3';
    case GP.RSTICK: return 'R3';
    case GP.DPAD_UP:    return '↑' /* ↑ */;
    case GP.DPAD_DOWN:  return '↓' /* ↓ */;
    case GP.DPAD_LEFT:  return '←' /* ← */;
    case GP.DPAD_RIGHT: return '→' /* → */;

    default: return '?';
  }
}
