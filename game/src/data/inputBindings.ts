/**
 * inputBindings.ts
 *
 * Controls 화면 (ControlsOverlay) + 향후 controls help 모달 SSoT.
 * 키보드 / 게임패드 라벨 동시 표기 — Goodboy Galaxy 형식 (System_Input_Gamepad §8.1).
 *
 * 모든 라벨은 영어 — ECHORIS 글로벌 영어권 핵심 타깃 (사용자 결정 2026-05-04).
 *
 * 패드 라벨은 Xbox baseline 기준. 브랜드별 글리프 (PS ×○□△ / Switch B/A/Y/X)
 * 는 ControlsOverlay 가 padGlyphs 모듈로 동적 변환.
 */

export interface ControlBinding {
  action: string;
  /** 키보드 라벨 (현재 활성 preset 무관 — 가장 일반적 표기). */
  kb: string;
  /** Standard Mapping 패드 라벨 (Xbox baseline). */
  gp: string;
}

export const CONTROL_BINDINGS: ControlBinding[] = [
  { action: 'Move',      kb: '←→ / WASD', gp: 'LS / DPad' },
  { action: 'Jump',      kb: 'Z',                   gp: 'A' },
  { action: 'Attack',    kb: 'C',                   gp: 'X' },
  { action: 'Dash',      kb: 'X',                   gp: 'RT' },
  { action: 'Interact',  kb: '↑',              gp: 'B' },
  { action: 'Inventory', kb: 'I',                   gp: 'View' },
  { action: 'Map',       kb: 'M',                   gp: 'LT' },
  { action: 'Pause',     kb: 'Esc',                 gp: 'Menu' },
];
