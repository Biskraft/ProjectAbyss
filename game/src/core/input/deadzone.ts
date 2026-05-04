/**
 * deadzone.ts
 *
 * Scaled Radial Deadzone — Hypersect "Interpreting Analog Sticks" 표준.
 * 좌스틱 0.20 inner + 0.05 outer 가 ECHORIS 기본값
 * (Documents/System/System_Input_Gamepad.md §2.1 / §2.3 [확인함]).
 *
 * 1축 데드존이 아닌 *원형* 데드존이라 대각 입력 정확도가 보존된다.
 */

export interface StickValue {
  x: number;
  y: number;
  /** 0..1 정규화 magnitude. 0 = 데드존 안쪽. */
  magnitude: number;
}

export function scaledRadialDeadzone(
  x: number,
  y: number,
  innerDz = 0.20,
  outerDz = 0.05,
): StickValue {
  const mag = Math.hypot(x, y);
  if (mag <= innerDz) return { x: 0, y: 0, magnitude: 0 };
  const legalRange = 1 - outerDz - innerDz;
  const normalized = Math.min(1, (mag - innerDz) / legalRange);
  const scale = normalized / mag;
  return { x: x * scale, y: y * scale, magnitude: normalized };
}
