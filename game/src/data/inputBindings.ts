/**
 * inputBindings.ts
 *
 * Controls 화면 (ControlsOverlay) + 향후 controls help 모달 SSoT.
 * 키보드 / 게임패드 라벨 동시 표기 — Goodboy Galaxy 형식 (System_Input_Gamepad §8.1).
 *
 * Action labels are i18n keys (ui.action.*) — resolved via t() at render time
 * so KO builds (and future Phase 3 runtime swap) localize correctly.
 *
 * 패드 라벨은 Xbox baseline 기준. 브랜드별 글리프 (PS ×○□△ / Switch B/A/Y/X)
 * 는 ControlsOverlay 가 padGlyphs 모듈로 동적 변환.
 */

export interface ControlBinding {
  /** i18n key (ui.action.*) — resolved via t() at draw time. */
  actionKey: string;
  /** 키보드 라벨 (현재 활성 preset 무관 — 가장 일반적 표기). */
  kb: string;
  /** Standard Mapping 패드 라벨 (Xbox baseline). */
  gp: string;
}

export const CONTROL_BINDINGS: ControlBinding[] = [
  { actionKey: 'ui.action.move',      kb: '←→ / WASD', gp: 'LS / DPad' },
  { actionKey: 'ui.action.jump',      kb: 'Z',         gp: 'A' },
  { actionKey: 'ui.action.attack',    kb: 'C',         gp: 'X' },
  { actionKey: 'ui.action.dash',      kb: 'X',         gp: 'RT' },
  { actionKey: 'ui.action.heal',      kb: 'R',         gp: 'Y' },
  { actionKey: 'ui.action.interact',  kb: '↑',         gp: 'B' },
  { actionKey: 'ui.action.inventory', kb: 'I',         gp: 'View' },
  { actionKey: 'ui.action.map',       kb: 'M',         gp: 'LT' },
  { actionKey: 'ui.action.pause',     kb: 'Esc',       gp: 'Menu' },
];
