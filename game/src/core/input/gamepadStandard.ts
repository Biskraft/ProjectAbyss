/**
 * gamepadStandard.ts
 *
 * W3C Standard Gamepad Mapping 버튼 인덱스 + Vendor ID 브랜드 검출.
 *
 * 참조: Documents/System/System_Input_Gamepad.md §3.2 / §4.3
 *       https://w3c.github.io/gamepad/#dfn-standard-gamepad-layout
 */

/**
 * Standard Mapping 버튼 인덱스. `mapping === 'standard'` 패드는
 * 브라우저가 자동으로 이 레이아웃에 맞춰준다 (Xbox/PS/Switch 모두 동일 인덱스).
 */
export const GP = {
  FACE_DOWN: 0,    // Xbox A · PS × · Switch B  — 점프 (1차 niche 협상 불가)
  FACE_RIGHT: 1,   // Xbox B · PS ○ · Switch A
  FACE_LEFT: 2,    // Xbox X · PS □ · Switch Y  — 공격 (1차 niche 협상 불가)
  FACE_UP: 3,      // Xbox Y · PS △ · Switch X
  LB: 4,
  RB: 5,
  LT: 6,
  RT: 7,           // 대시 (1차 niche 협상 불가)
  BACK: 8,         // Xbox View / PS Touchpad / Switch -
  START: 9,        // Xbox Menu / PS Options / Switch +
  LSTICK: 10,
  RSTICK: 11,
  DPAD_UP: 12,
  DPAD_DOWN: 13,
  DPAD_LEFT: 14,
  DPAD_RIGHT: 15,
  GUIDE: 16,
} as const;

export type ControllerBrand = 'xbox' | 'playstation' | 'switch' | 'generic';

/** Chrome/Edge/Safari id 형식: "...Vendor: 045e Product: 02ea..." */
const VENDOR_PRODUCT = /Vendor:\s*([0-9a-f]{4})\s*Product:\s*([0-9a-f]{4})/i;
/** Firefox/Safari id 형식: "045e-02ea-Xbox Wireless..." */
const FF_PATTERN = /^([0-9a-f]{1,4})-([0-9a-f]{1,4})-/i;

/**
 * Vendor ID → 브랜드 검출. 사용자 옵션으로 강제 오버라이드 가능 (Steam Input
 * 래핑 등 식별 실패 시 fallback). 풀 리매핑 UI 도입 시점에 옵션 노출.
 *
 * Vendor ID 추출이 실패하면 id 문자열의 브랜드 키워드로 fallback (예: Windows
 * XInput 드라이버는 "Xbox 360 Controller" 같은 plain text id 만 노출).
 */
export function detectBrand(id: string): ControllerBrand {
  const m = id.match(VENDOR_PRODUCT) ?? id.match(FF_PATTERN);
  const vendor = m?.[1]?.toLowerCase().padStart(4, '0');
  switch (vendor) {
    case '045e': return 'xbox';        // Microsoft
    case '054c': return 'playstation'; // Sony
    case '057e': return 'switch';      // Nintendo
    case '0f0d': return 'switch';      // HORI
  }
  // Vendor ID 추출 실패 — id 문자열 키워드 fallback.
  const lower = id.toLowerCase();
  if (lower.includes('xbox') || lower.includes('xinput')) return 'xbox';
  if (lower.includes('dualshock') || lower.includes('dualsense') || lower.includes('playstation')
      || lower.includes('ps3') || lower.includes('ps4') || lower.includes('ps5')) return 'playstation';
  if (lower.includes('switch') || lower.includes('joy-con') || lower.includes('joycon')
      || lower.includes('pro controller')) return 'switch';
  return 'generic';
}
