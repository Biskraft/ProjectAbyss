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
