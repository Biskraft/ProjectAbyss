/**
 * GamepadManager.ts
 *
 * W3C Gamepad API 폴링. PixiJS Ticker 의 fixed-step 루프에서 매 프레임
 * navigator.getGamepads() 를 재호출하고 (객체 캐싱 금지 — 안티패턴 §10),
 * Standard Mapping 기준 버튼·스틱을 InputManager.setVirtualAction 으로 주입.
 *
 * 참조: Documents/System/System_Input_Gamepad.md §3.4 / §4
 *
 * 핵심 원칙:
 *   - Player.ts / UI 코드 0줄 수정 (setVirtualAction 채널 재사용)
 *   - 외부 라이브러리 미사용 (자체 InputManager 확장만)
 *   - 다중 패드 시 첫 연결 패드 우선
 */

import type { InputManager } from './InputManager';
import { GameAction } from './input/GameAction';
import { GP, detectBrand, type ControllerBrand } from './input/gamepadStandard';
import { scaledRadialDeadzone } from './input/deadzone';
import { PAD_BINDINGS } from './input/padBindings';
import { setInputDevice } from './input/InputDeviceTracker';

// ── 데드존 / 임계값 (System_Input_Gamepad.md §2.1) ────────────────────────────

/** 좌스틱 inner radial deadzone (Hypersect 표준 [확인함]). */
const STICK_INNER_DZ = 0.20;
/** 좌스틱 outer deadzone — 모서리 노이즈 차단. */
const STICK_OUTER_DZ = 0.05;
/** 트리거 데드존 (Game Developer 매거진 [확인함]). */
const TRIGGER_DZ = 0.10;
/** 일반 디지털 버튼 임계값 (analog 0..1 → bool). */
const DIGITAL_THRESH = 0.5;
/** 좌스틱 → MOVE_LEFT/RIGHT 발화 임계값. */
const MOVE_THRESH = 0.30;
/** 좌스틱 → LOOK_UP/DOWN 발화 임계값 (실수 입력 방지로 더 높음). */
const LOOK_THRESH = 0.50;

type ConnectListener = (brand: ControllerBrand) => void;
type DisconnectListener = () => void;

export class GamepadManager {
  private activeIndex = -1;
  /** value 0..1 (analog) — buttons[i].value snapshot. */
  private buttons: number[] = [];
  /** 직전 프레임 버튼 값 — false→true transition 검출용 (디바이스 트래커 hot-swap). */
  private buttonsPrev: number[] = [];
  private axes: number[] = [];
  private brand: ControllerBrand = 'generic';
  private connected = false;
  // Hot-plug 토스트 (Stage 3) — 씬이 setup 시 subscribe, exit 시 unsubscribe.
  private connectListeners = new Set<ConnectListener>();
  private disconnectListeners = new Set<DisconnectListener>();

  constructor() {
    window.addEventListener('gamepadconnected', (e) => this.onConnect(e));
    window.addEventListener('gamepaddisconnected', (e) => this.onDisconnect(e));
  }

  /**
   * fixed-step 루프에서 sceneManager.update() *직전* 1회 호출.
   * input.update() 가 prevKeyState 를 갱신하기 전에 setVirtualAction 이
   * keyState 를 갱신해야 isJustPressed 가 정상 동작한다.
   */
  poll(input: InputManager): void {
    this.refresh();
    if (!this.connected) return;
    this.syncToInputManager(input);
  }

  /** 상태 조회 — 추후 HUD 글리프 자동 전환 (GP-07-B) 에서 참조 예정. */
  isConnectedActive(): boolean { return this.connected; }
  getBrand(): ControllerBrand { return this.brand; }

  /**
   * XYAB (Xbox 기준) 4개 face button 중 하나라도 false→true transition 검출.
   * GP_BINDINGS 와 무관하게 raw 인덱스 검사.
   */
  isAnyFaceButtonJustPressed(): boolean {
    if (!this.connected) return false;
    const indices = [GP.FACE_DOWN, GP.FACE_RIGHT, GP.FACE_LEFT, GP.FACE_UP];
    for (const i of indices) {
      const cur = (this.buttons[i] ?? 0) > 0.5;
      const prev = (this.buttonsPrev[i] ?? 0) > 0.5;
      if (cur && !prev) return true;
    }
    return false;
  }

  /** 특정 버튼 인덱스의 false→true transition. PAD_BINDINGS 우회 — UI 의 explicit 단축키용. */
  isButtonJustPressed(idx: number): boolean {
    if (!this.connected) return false;
    const cur = (this.buttons[idx] ?? 0) > 0.5;
    const prev = (this.buttonsPrev[idx] ?? 0) > 0.5;
    return cur && !prev;
  }

  /** 패드 연결 이벤트 구독. 반환된 함수로 unsubscribe. */
  onConnectEvent(cb: ConnectListener): () => void {
    this.connectListeners.add(cb);
    return () => { this.connectListeners.delete(cb); };
  }

  /** 패드 분리 이벤트 구독. 반환된 함수로 unsubscribe. */
  onDisconnectEvent(cb: DisconnectListener): () => void {
    this.disconnectListeners.add(cb);
    return () => { this.disconnectListeners.delete(cb); };
  }

  // ── connection lifecycle ─────────────────────────────────────────────────

  private onConnect(e: GamepadEvent): void {
    if (this.activeIndex < 0) {
      this.activeIndex = e.gamepad.index;
      this.brand = detectBrand(e.gamepad.id);
      console.log(
        `[Gamepad] connected idx=${e.gamepad.index} brand=${this.brand}` +
        ` mapping=${e.gamepad.mapping || '<empty>'} id="${e.gamepad.id}"`,
      );
      for (const cb of this.connectListeners) {
        try { cb(this.brand); } catch (err) { console.error('[Gamepad] connect listener', err); }
      }
    }
  }

  private onDisconnect(e: GamepadEvent): void {
    if (e.gamepad.index === this.activeIndex) {
      this.activeIndex = -1;
      this.connected = false;
      this.buttons = [];
      this.axes = [];
      console.log(`[Gamepad] disconnected idx=${e.gamepad.index}`);
      for (const cb of this.disconnectListeners) {
        try { cb(); } catch (err) { console.error('[Gamepad] disconnect listener', err); }
      }
    }
  }

  // ── per-frame snapshot ───────────────────────────────────────────────────

  /**
   * navigator.getGamepads() 를 매번 호출 (안티패턴 §10: 결과 캐싱 금지).
   * Firefox 는 user-gesture 전 빈 리스트를 반환하므로 최초 input 후에야
   * 패드가 인식된다 (GP-09-B 안내 카피로 보강 예정).
   */
  private refresh(): void {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let gp = this.activeIndex >= 0 ? pads[this.activeIndex] : null;

    if (!gp || !gp.connected) {
      // active pad 가 사라졌거나 아직 결정되지 않은 경우 — 첫 연결 패드 채택.
      for (const cand of pads) {
        if (cand && cand.connected) {
          this.activeIndex = cand.index;
          this.brand = detectBrand(cand.id);
          gp = cand;
          break;
        }
      }
    }

    if (!gp || !gp.connected) {
      this.connected = false;
      return;
    }

    this.connected = true;
    const len = gp.buttons.length;
    if (this.buttons.length !== len) {
      this.buttons = new Array(len).fill(0);
      this.buttonsPrev = new Array(len).fill(0);
    } else {
      // 직전 프레임 값 보관 — transition 검출용.
      for (let i = 0; i < len; i++) this.buttonsPrev[i] = this.buttons[i];
    }
    let anyGamepadActivity = false;
    for (let i = 0; i < len; i++) {
      const v = gp.buttons[i].value;
      const threshold = (i === GP.LT || i === GP.RT) ? TRIGGER_DZ : DIGITAL_THRESH;
      const wasDown = (this.buttonsPrev[i] ?? 0) > threshold;
      const nowDown = v > threshold;
      if (!wasDown && nowDown) anyGamepadActivity = true;
      this.buttons[i] = v;
    }
    // axes 는 매번 새 배열 — gamepad 객체 자체를 보관하지 않음.
    this.axes = Array.from(gp.axes);
    // 사용자가 패드를 잡은 신호 — HUD 글리프 hot-swap 트리거.
    const lx = this.axes[0] ?? 0;
    const ly = this.axes[1] ?? 0;
    const ls = scaledRadialDeadzone(lx, ly, STICK_INNER_DZ, STICK_OUTER_DZ);
    if (Math.abs(ls.x) > MOVE_THRESH || Math.abs(ls.y) > LOOK_THRESH) {
      anyGamepadActivity = true;
    }
    if (anyGamepadActivity) setInputDevice('gamepad', this.brand);
  }

  /** 트리거는 트리거 데드존, 그 외는 0.5 임계값 (W3C `pressed` 와 호환 범위). */
  private isButtonDown(idx: number): boolean {
    const v = this.buttons[idx] ?? 0;
    if (idx === GP.LT || idx === GP.RT) return v > TRIGGER_DZ;
    return v > DIGITAL_THRESH;
  }

  // ── InputManager 동기화 ───────────────────────────────────────────────────

  private syncToInputManager(input: InputManager): void {
    // 1) 디지털 매핑 (PAD_BINDINGS)
    for (const action of Object.keys(PAD_BINDINGS) as GameAction[]) {
      const btns = PAD_BINDINGS[action];
      if (!btns) continue;
      const pressed = btns.some((b) => this.isButtonDown(b));
      input.setVirtualAction(action, pressed);
    }

    // 2) 좌스틱 + DPad → MOVE / LOOK (스틱 임계값 + DPad 디지털 OR 결합)
    const lx = this.axes[0] ?? 0;
    const ly = this.axes[1] ?? 0;
    const ls = scaledRadialDeadzone(lx, ly, STICK_INNER_DZ, STICK_OUTER_DZ);
    const dLeft = this.isButtonDown(GP.DPAD_LEFT);
    const dRight = this.isButtonDown(GP.DPAD_RIGHT);
    const dUp = this.isButtonDown(GP.DPAD_UP);
    const dDown = this.isButtonDown(GP.DPAD_DOWN);

    input.setVirtualAction(GameAction.MOVE_LEFT,  ls.x < -MOVE_THRESH || dLeft);
    input.setVirtualAction(GameAction.MOVE_RIGHT, ls.x >  MOVE_THRESH || dRight);
    input.setVirtualAction(GameAction.LOOK_UP,    ls.y < -LOOK_THRESH || dUp);
    input.setVirtualAction(GameAction.LOOK_DOWN,  ls.y >  LOOK_THRESH || dDown);
  }
}
