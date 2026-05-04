/**
 * padBindings.ts
 *
 * Xbox baseline 매핑 프리셋. Standard Mapping 패드는 PS·Switch 모두 동일
 * 인덱스로 동작한다 (브라우저 자동 매핑).
 *
 * 참조: Documents/System/System_Input_Gamepad.md §3.1
 *
 * 1차 niche 협상 불가 매핑:
 *   - JUMP   = A     (FACE_DOWN, idx 0)
 *   - ATTACK = X     (FACE_LEFT, idx 2)
 *   - DASH   = RT    (idx 7)
 *
 * MOVE_LEFT/RIGHT/LOOK_UP/DOWN 은 좌스틱 + DPad 가 OR 결합되며
 * GamepadManager.syncToInputManager 가 별도 처리 (스틱 임계값 적용).
 *
 * STATUS / FLASK 등은 §3.1 매핑 표에 패드 매핑이 명시되지 않아 비어있다.
 * 풀 리매핑 UI (GP-05-A) 도입 시 사용자가 자유 할당.
 */

import { GameAction } from './GameAction';
import { GP } from './gamepadStandard';

export const PAD_BINDINGS: Partial<Record<GameAction, readonly number[]>> = {
  [GameAction.JUMP]: [GP.FACE_DOWN],
  [GameAction.ATTACK]: [GP.FACE_LEFT],
  [GameAction.DASH]: [GP.RT],
  [GameAction.INVENTORY]: [GP.BACK],
  [GameAction.MAP]: [GP.LT],
  [GameAction.MENU]: [GP.START],
};
