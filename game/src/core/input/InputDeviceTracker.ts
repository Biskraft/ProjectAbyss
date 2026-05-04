/**
 * InputDeviceTracker.ts
 *
 * 마지막 입력 디바이스 (keyboard / gamepad) + 패드 브랜드 추적 + 변경 구독.
 *
 * 참조: Documents/System/System_Input_Gamepad.md §7 / §8.1 / §8.2
 *       — "HUD 키 프롬프트: 마지막 입력 디바이스 기준 글리프 자동 전환"
 *       — "디바운스 윈도우: 100~250ms"
 *
 * 사용:
 *   - InputManager.onKeyDown 에서 setInputDevice('keyboard')
 *   - GamepadManager 에서 버튼 transition 발화 시 setInputDevice('gamepad', brand)
 *   - KeyPrompt.createKeyIconForAction 등이 onDeviceChange 로 글리프 hot-swap
 */

import type { ControllerBrand } from './gamepadStandard';

export type InputDevice = 'keyboard' | 'gamepad';

type Listener = (device: InputDevice, brand: ControllerBrand) => void;

/** 동시 입력 시 깜빡임 차단 (System_Input_Gamepad §8.1 100~250ms 권장 — 중간값 채택). */
const DEBOUNCE_MS = 150;

class Tracker {
  device: InputDevice = 'keyboard';
  brand: ControllerBrand = 'generic';
  /** 페이지 로드 직후 첫 flip 이 디바운스에 막히지 않도록 음수로 초기화. */
  private lastChangeMs = -DEBOUNCE_MS;
  /** 콘솔 디버깅용 — `window.__inputTracker.listeners.size` 로 등록 수 확인. */
  listeners = new Set<Listener>();

  setDevice(d: InputDevice, brand: ControllerBrand = this.brand): void {
    const now = performance.now();
    // 동일 디바이스 + 동일 브랜드 → no-op.
    if (this.device === d && this.brand === brand) return;
    // 디바이스 flip 일 때만 디바운스 적용. 브랜드만 바뀌는 케이스는 즉시 반영.
    if (this.device !== d && now - this.lastChangeMs < DEBOUNCE_MS) return;
    this.device = d;
    this.brand = brand;
    this.lastChangeMs = now;
    for (const l of this.listeners) {
      try { l(this.device, this.brand); } catch (e) { console.error('[InputDeviceTracker] listener', e); }
    }
  }

  /**
   * 등록 즉시 현재 상태로 1회 호출 — 구독자가 별도 초기화 코드 없이 바로 글리프 반영.
   * 반환된 함수로 unsubscribe.
   */
  subscribe(l: Listener): () => void {
    this.listeners.add(l);
    try { l(this.device, this.brand); } catch (e) { console.error('[InputDeviceTracker] listener init', e); }
    return () => { this.listeners.delete(l); };
  }
}

const tracker = new Tracker();

// Dev 디버깅 — window.__inputTracker 로 콘솔에서 직접 검사 / 강제 flip.
//   window.__inputTracker.setDevice('gamepad', 'xbox')
//   window.__inputTracker.device
//   window.__inputTracker.listeners.size
if (typeof window !== 'undefined') {
  (window as any).__inputTracker = tracker;
}

export function getInputDevice(): InputDevice { return tracker.device; }
export function getInputBrand(): ControllerBrand { return tracker.brand; }
export function setInputDevice(device: InputDevice, brand?: ControllerBrand): void {
  tracker.setDevice(device, brand);
}
export function onDeviceChange(l: Listener): () => void {
  return tracker.subscribe(l);
}
