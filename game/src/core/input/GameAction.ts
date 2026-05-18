/**
 * GameAction.ts
 *
 * 액션 enum 단독 모듈. InputManager / padBindings / GamepadManager 가
 * 서로 import 하는 순환 참조를 끊기 위해 분리. InputManager 가 re-export
 * 하므로 외부 호출자는 기존대로 `import { GameAction } from '@core/InputManager'`.
 */

export enum GameAction {
  MOVE_LEFT = 'MOVE_LEFT',
  MOVE_RIGHT = 'MOVE_RIGHT',
  LOOK_UP = 'LOOK_UP',
  LOOK_DOWN = 'LOOK_DOWN',
  JUMP = 'JUMP',
  DASH = 'DASH',
  ATTACK = 'ATTACK',
  INVENTORY = 'INVENTORY',
  MAP = 'MAP',
  MENU = 'MENU',
  /**
   * Pad B(FACE_RIGHT) 전용 cancel-only 액션. 모달 close 트리거로만 사용되고
   * pause 메뉴 *open* 은 트리거하지 않는다. Open 사이트는 `MENU && !CANCEL`
   * 로 게이트해 B 누름이 메뉴를 *띄우지* 못하게 한다. 키보드 Escape 는
   * CANCEL 에 바인딩되지 않으므로 종전과 동일하게 MENU 만 발화.
   */
  CANCEL = 'CANCEL',
  STATUS = 'STATUS',
  FLASK = 'FLASK',
  /** Hades-style ranged cast — Ego Shard 발사. 인챈트별 효과 변주. */
  CAST = 'CAST',
  /** Pickup nearby pickable / throw held object. Spelunky-style 들기 던지기. */
  GRAB = 'GRAB',
  DEBUG_RESET = 'DEBUG_RESET',
  DEBUG_CHEAT = 'DEBUG_CHEAT',
  DEBUG_UI_TOGGLE = 'DEBUG_UI_TOGGLE',
  /** Ignites the cell at player feet + 4-neighbours. ?debug URL gated. Shift+1. */
  DEBUG_FIRE = 'DEBUG_FIRE',
  /** Freezes water/magma cell at player + 4-neighbours. ?debug URL gated. Shift+2. */
  DEBUG_ICE = 'DEBUG_ICE',
  /** Thunder chain at player + 4-neighbours (water/metal/acid flood-fill). ?debug URL gated. Shift+3. */
  DEBUG_THUNDER = 'DEBUG_THUNDER',
}
