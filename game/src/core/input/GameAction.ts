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
  DEBUG_RESET = 'DEBUG_RESET',
  DEBUG_CHEAT = 'DEBUG_CHEAT',
  DEBUG_UI_TOGGLE = 'DEBUG_UI_TOGGLE',
}
