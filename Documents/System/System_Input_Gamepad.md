# 게임패드 지원 시스템 (Gamepad Input System)

## 0. 필수 참고 자료 (Mandatory References)

* Writing Standards: `Documents/Terms/GDD_Writing_Rules.md`
* Project Definition: `Documents/Terms/Project_Vision_Abyss.md`
* **연구 출처:** `Reference/Web_Metroidvania_Gamepad_Reference.md` (2026-05-04 작성, 4갈래 병렬 리서치 통합)
* 인풋 코어: `game/src/core/InputManager.ts`
* 키보드 매핑 연구: `Documents/Research/MouseKeyboard_2DSidescroller_ControlScheme_Research.md`
* 접근성 표준: `Documents/Research/Research_Accessibility.md`
* 1차 niche 시금석: `CLAUDE.md` § 타깃 플레이어
* PC 포팅 전략: `memory/project_pc_port_approach.md` (Tauri v2 + Steam Input)

---

## 구현 현황 (Implementation Status)

> **최근 업데이트:** 2026-05-04
> **문서 상태:** `작성 중 (Draft)`
> **선결 결정:** Phase 2 베타 ~ Phase 4 PC 포팅 단계별 진행
> **시금석:** 1차 niche (SOTN/HK/Dead Cells/Disgaea) 근육 기억 정합 — 협상 불가

| 기능 ID    | 분류         | 기능명                                      | 우선순위 | 구현 상태    | 비고                                            |
| :--------- | :----------- | :------------------------------------------ | :------: | :----------- | :---------------------------------------------- |
| GP-01-A    | 코어 폴링    | W3C Gamepad API 직접 호출 (PixiJS Ticker)   |    P0    | 📅 대기      | `navigator.getGamepads()` 매 프레임 재호출       |
| GP-01-B    | 코어 폴링    | `gamepadconnected` / `disconnected` 이벤트 |    P0    | 📅 대기      | 다중 패드 인덱스 추적                            |
| GP-02-A    | 매핑         | Standard Mapping (Xbox baseline)            |    P0    | 📅 대기      | `mapping === "standard"` 우선                    |
| GP-02-B    | 매핑         | Vendor ID 자동 브랜드 검출 (045e/054c/057e) |    P0    | 📅 대기      | 버튼 라벨 자동 전환                              |
| GP-02-C    | 매핑         | 비표준 매핑 폴백 + 사용자 캘리브레이션 UI   |    P1    | 📅 대기      | `mapping === ""` 패드 대응                       |
| GP-03-A    | 데드존       | Scaled Radial Deadzone 0.20 (좌스틱)        |    P0    | 📅 대기      | 0.05 outer dead zone 포함                        |
| GP-03-B    | 데드존       | 트리거 데드존 0.10                          |    P0    | 📅 대기      | RT/LT 아날로그 0..1                              |
| GP-04-A    | 입력 정밀도  | Coyote Time 6 프레임                        |    P0    | 📅 대기      | Celeste PICO-8 분해 기반                          |
| GP-04-B    | 입력 정밀도  | Jump Buffer 6 프레임                        |    P0    | 📅 대기      | Player.ts 통합                                   |
| GP-04-C    | 입력 정밀도  | 대시·공격 Buffer 8 프레임                   |    P0    | 📅 대기      | Terresquall 표준                                 |
| GP-04-D    | 입력 정밀도  | 가변 점프 (minVelocity 클램프)              |    P0    | 📅 대기      | Maddy Thorson 모델                               |
| GP-05-A    | 리매핑       | 풀 리매핑 UI (모든 액션, P0 베타 직전)      |    P0    | 📅 대기      | XAG 2.0.1 + GAG 필수                             |
| GP-05-B    | 리매핑       | Hold ↔ Toggle 변환 옵션                     |    P1    | 📅 대기      | 접근성 Intermediate                              |
| GP-05-C    | 리매핑       | 사용자 정의 localStorage 저장               |    P0    | 📅 대기      | XAG 표준                                         |
| GP-06-A    | 진동         | dual-rumble (피격/단조열/보스)              |    P1    | 📅 대기      | Phase 2 후반                                     |
| GP-06-B    | 진동         | 글로벌 강도 슬라이더 (0.0~1.0)              |    P1    | 📅 대기      | HK v1.5+ 표준                                    |
| GP-06-C    | 진동         | trigger-rumble (Chrome 113+ 한정)           |    P3    | 📅 대기      | Phase 4 옵션                                     |
| GP-07-A    | UI           | 키↔패드 매핑 동시 표기 (Goodboy Galaxy 형식) |    P0    | 📅 대기      | 조작 가이드·HUD                                  |
| GP-07-B    | UI           | 버튼 글리프 자동 전환 (Xbox/PS/Switch)       |    P0    | 📅 대기      | 입력 모드 디바운스 100~250ms                     |
| GP-07-C    | UI           | UI 메뉴 D-Pad/좌스틱 네비게이션              |    P1    | 📅 대기      | 접근성 + 글로벌 표준                             |
| GP-08-A    | 검증         | Xbox + 8BitDo + DualSense × Chrome/Edge/FF | P0    | 📅 대기      | 3종 × 3브라우저 매트릭스                         |
| GP-08-B    | 검증         | Steam Deck 호환 체크리스트                   |    P1    | 📅 대기      | udev 권한 + Steam Input 폴백                      |
| GP-09-A    | 핫플러그     | 다중 패드 인덱스 재할당 추적                 |    P1    | 📅 대기      | `connected` 속성 + 이벤트                        |
| GP-09-B    | 핫플러그     | Firefox user-gesture 안내 ("Press any button") |  P1    | 📅 대기      | 핑거프린팅 우회                                  |
| GP-10-A    | Phase 4      | Tauri v2 + Steam Input Gamepad Emulation    |    P3    | 📅 대기      | PC 포팅 시점, 코드 변경 0                        |

---

## 1. 개요 (Concept)

### 1.1. 한 줄 정의

> "표준 W3C Gamepad API + Standard Mapping + Scaled Radial Deadzone — 1차 niche 근육 기억과 1:1 정합."

### 1.2. 설계 원칙

1. **niche 시그널 보존** — 1차 niche (SOTN/HK/Dead Cells/Disgaea) 의 근육 기억과 충돌하지 않을 것. 한국 시장 특화 매핑 불채택.
2. **표준 우선** — W3C Gamepad API + `mapping === "standard"` 우선. 비표준 매핑은 폴백 + 사용자 리바인딩 UI 로 흡수.
3. **시민 등급 동등** — 키보드와 패드는 *1순위 시민*. 둘 다 풀 리매핑 + 동시 가이드 표기.
4. **진동은 후행 폴리시** — Phase 2 베타에서 매핑·정밀도 안정화 후 Phase 2 후반에 진동 추가.
5. **자체 InputManager 확장** — 외부 라이브러리 도입 없이 50줄 미만으로 흡수 (`pixijs-input-devices` 는 v1.0 안정화 시 재평가).

### 1.3. 1차 niche 협상 불가 매핑

> **"점프 = A · 공격 = X · 대시 = RT" — Phase 2 채택 후 변경 금지.**
> 1차 niche 근육 기억과 충돌하면 시그널이 희석된다 (DLG/매핑은 동급 시금석).

---

## 2. 입력 황금비 (Core Action Precision)

### 2.1. 정밀도 파라미터

| 파라미터 | 권장값 | 출처 |
|:---|:---|:---|
| 폴링 진입점 | PixiJS `Ticker` 단일 RAF 루프 | web.dev / MDN [확인함] |
| 좌스틱 데드존 | **Scaled Radial 0.20** + outer 0.05 | Hypersect [확인함] |
| 트리거 데드존 | **0.10** | Game Developer 매거진 [확인함] |
| Coyote Time | **6 프레임 (≈100ms)** | Celeste PICO-8 분해 [확인함] |
| Jump Buffer | **6 프레임** | 점프 한정 |
| 대시·공격 Buffer | **8 프레임** | Terresquall [확인함] |
| 가변 점프 | minVelocity 클램프 + 상승 1.0× / 하강 3.0× 중력 | Maddy Thorson [확인함] |
| 8방향 양자화 | `Math.atan2(y, x) → π/4` | 표준 [확인함] |

### 2.2. 가변 점프 + Coyote + Buffer 의사 코드

```typescript
const MAX_JUMP_VELOCITY = 360;
const MIN_JUMP_VELOCITY = 140;
const COYOTE_FRAMES = 6;
const JUMP_BUFFER_FRAMES = 6;

// 입력 페이즈
if (input.isJustPressed(GameAction.JUMP)) jumpBuffer = JUMP_BUFFER_FRAMES;
if (onGround) coyoteCounter = COYOTE_FRAMES;
else coyoteCounter--;

// 점프 발동
if (jumpBuffer > 0 && coyoteCounter > 0) {
  vy = -MAX_JUMP_VELOCITY;
  jumpBuffer = 0;
  coyoteCounter = 0;
  jumpHolding = true;
}

// 가변 컷오프
if (jumpHolding && !input.isDown(GameAction.JUMP) && vy < -MIN_JUMP_VELOCITY) {
  vy = -MIN_JUMP_VELOCITY;
  jumpHolding = false;
}

jumpBuffer = Math.max(0, jumpBuffer - 1);
```

### 2.3. Scaled Radial Deadzone

```typescript
function scaledRadialDeadzone(
  x: number, y: number,
  innerDz = 0.20,
  outerDz = 0.05,
): { x: number; y: number; magnitude: number } {
  const mag = Math.hypot(x, y);
  if (mag <= innerDz) return { x: 0, y: 0, magnitude: 0 };
  const legalRange = 1 - outerDz - innerDz;
  const normalized = Math.min(1, (mag - innerDz) / legalRange);
  const scale = normalized / mag;
  return { x: x * scale, y: y * scale, magnitude: normalized };
}
```

---

## 3. 매핑 표준 (Mapping)

### 3.1. ECHORIS 4열 통합 매핑표

> **시금석:** *점프=A · 공격=X · 대시=RT* 협상 불가. 나머지는 베타 직전 풀 리매핑으로 사용자 변경 가능.

| 액션 | Xbox | PlayStation | Switch | 키보드 | 근거 |
|:---|:---:|:---:|:---:|:---:|:---|
| 이동 | LS + DPad | LS + DPad | LS + DPad | ←→ / WASD | 표준 |
| **점프 (가변)** | **A** | **×** | **B** | Z | 9/10 메트로베니아 [확인함] |
| **대시** | **RT** | **R2** | **ZR** | X | HK · Blasphemous 트리거 대시 [확인함] |
| **공격 (검) 횡베기** | **X** | **□** | **Y** | (분리 필요) | 8/8 액션 메트로베니아 [확인함] |
| 내려치기 (Pogo) | 공중 ↓ + X | 공중 ↓ + □ | 공중 ↓ + Y | (구현 필요) | HK 표준 [확인함] |
| 올려치기 | ↑ + X | ↑ + □ | ↑ + Y | – | HK Cyclone 변형 [추측임] |
| 상호작용 | B | ○ | A | C | 페이스 + 키프롬프트 |
| 기억 단편 (Active) | Y | △ | X | Shift | Hades 스페셜 슬롯 |
| 퀵 캐스트 (보조) | RB | R1 | R | – | HK 퀵캐스트 [확인함] |
| 백대시 | LB | L1 | L | – | Bloodstained 백스텝 [확인함] |
| 인벤토리 | Back/View | Touchpad | – | I | – |
| 맵 | LT | L2 | ZL | M | – |
| 메뉴 (Pause) | Start | Options | + | Esc | – |
| 검 Ego 대화 | DPad ↑ | DPad ↑ | DPad ↑ | – | 스파이크 시그널 강화 |

### 3.2. Standard Gamepad 버튼 인덱스

```typescript
// W3C/MDN 표준 [확인함]
export const GP = {
  FACE_DOWN: 0, FACE_RIGHT: 1, FACE_LEFT: 2, FACE_UP: 3,    // Xbox: A B X Y
  LB: 4, RB: 5, LT: 6, RT: 7,
  BACK: 8, START: 9, LSTICK: 10, RSTICK: 11,
  DPAD_UP: 12, DPAD_DOWN: 13, DPAD_LEFT: 14, DPAD_RIGHT: 15,
  GUIDE: 16,
} as const;
```

### 3.3. 패드 변환 표

| Xbox | PlayStation | Switch | 한국 통칭 |
|:---:|:---:|:---:|:---|
| A | × (Cross) | B | "확인" (JP/KR 글로벌 통일 후) |
| B | ○ (Circle) | A | "취소" |
| X | □ (Square) | Y | – |
| Y | △ (Triangle) | X | – |
| LB / LT / RB / RT | L1 / L2 / R1 / R2 | L / ZL / R / ZR | – |

> **지역 함정:** 일본/한국 출시 게임은 ○=확인 전통이지만 2010년대 이후 글로벌 출시는 ×=확인 통일. ECHORIS = **글로벌 표준 채택 + 옵션 토글**. 1차 niche 시그널 희석 회피 (`memory/project_demo_positioning`).

### 3.4. 파일 구조 (50줄 미만 PR)

```
game/src/core/
├── InputManager.ts          # 기존 — GameAction enum + setVirtualAction 패턴 재사용
├── GamepadManager.ts        # 신규 — navigator.getGamepads() 폴링 + Standard Mapping
└── input/
    ├── gamepadStandard.ts   # GP 상수 (FACE_DOWN=0, RT=7, DPAD_*=12-15)
    ├── deadzone.ts          # scaledRadialDeadzone()
    └── padBindings.ts       # PAD_BINDINGS 프리셋 (Xbox baseline)
```

**통합 포인트:** PixiJS `Ticker` 콜백 1줄로 `gamepad.update()` + `gamepad.syncToInputManager(input)` 등록. **Player.ts/UI 코드 0줄 수정** 으로 패드 자동 동작 (현 `setVirtualAction` 채널이 VirtualPad 에서 이미 검증).

---

## 4. 아키텍처 (Architecture)

### 4.1. GamepadManager 책임

| 책임 | 구현 |
|:---|:---|
| 패드 인덱스 추적 | `gamepadconnected` / `disconnected` 이벤트로 단일 활성 패드 선택 (다중 패드 시 첫 연결 우선) |
| 매 프레임 폴링 | `navigator.getGamepads()` 매 프레임 재호출 (객체 캐싱 금지) |
| 버튼 상태 추적 | `buttons[]` + `buttonsPrev[]` 로 `isJustPressed/isJustReleased` 산출 |
| 트리거 아날로그 | `buttons[6/7].value` 0..1 |
| 좌/우 스틱 | `axes[0/1] / [2/3]` + Scaled Radial Deadzone |
| Vendor ID 검출 | `gamepad.id` 정규식 → 브랜드 자동 라벨 |
| InputManager 동기화 | `setVirtualAction(GameAction, pressed)` 로 액션 채널 주입 |

### 4.2. InputManager 통합 (가상 키 주입)

```typescript
// GamepadManager.update() 내에서 InputManager 갱신
syncToInputManager(input: InputManager): void {
  for (const [action, btns] of Object.entries(PAD_BINDINGS)) {
    const pressed = btns.some(b => this.isDown(b));
    input.setVirtualAction(action as GameAction, pressed);
  }
  const ls = this.leftStick(0.20);
  input.setVirtualAction(GameAction.MOVE_LEFT,  ls.x < -0.30);
  input.setVirtualAction(GameAction.MOVE_RIGHT, ls.x >  0.30);
  input.setVirtualAction(GameAction.LOOK_UP,    ls.y < -0.50 || this.isDown(GP.DPAD_UP));
  input.setVirtualAction(GameAction.LOOK_DOWN,  ls.y >  0.50 || this.isDown(GP.DPAD_DOWN));
}
```

### 4.3. Vendor ID 검출

```typescript
const VENDOR_PRODUCT = /Vendor:\s*([0-9a-f]{4})\s*Product:\s*([0-9a-f]{4})/i;
const FF_PATTERN = /^([0-9a-f]{1,4})-([0-9a-f]{1,4})-/i; // Firefox/Safari

type ControllerBrand = "xbox" | "playstation" | "switch" | "generic";

function detectBrand(id: string): ControllerBrand {
  const m = id.match(VENDOR_PRODUCT) ?? id.match(FF_PATTERN);
  const vendor = m?.[1]?.toLowerCase();
  switch (vendor) {
    case "045e": return "xbox";        // Microsoft
    case "054c": return "playstation"; // Sony
    case "057e": return "switch";      // Nintendo
    case "0f0d": return "switch";      // HORI
    default: return "generic";
  }
}
```

브랜드 검출 결과는 *버튼 글리프 자동 전환* (GP-07-B) 의 입력. 사용자가 옵션에서 강제 오버라이드 가능 (Steam Input 래핑 시 식별 실패 폴백).

---

## 5. 진동 (Rumble) 가이드라인

### 5.1. 이벤트별 진동 프로파일

| 이벤트 | strong | weak | duration | trigger |
|:---|:---:|:---:|:---:|:---:|
| 일반 피격 | 0.5 | 0.7 | 120-150ms | — |
| 검 단조 (Forge 단편 충전 완료) | 0.9 | 0.4 | 200-250ms | — |
| Stratum 보스 처치 | 1.0 | 1.0 | 400ms | — |
| 대시 | 0.3 | 0 | 80ms | — |
| 보스 등장 | ramp-up | – | 600ms+ | — |
| 완전 가드 / Parry [추측임] | 0.0 | 0.8 | 60ms | leftTrigger 0.6 (지원 시) |

### 5.2. 글로벌 강도 슬라이더 (필수)

- 옵션 메뉴에 *진동 강도 0~100%* 슬라이더 노출
- 각 이벤트의 strong/weak 값에 슬라이더 값 곱
- HK v1.5+ 표준 [확인함]

### 5.3. 구현

- **dual-rumble** — Chrome/Edge/Firefox 안정 [확인함]. baseline 으로 채택.
- **trigger-rumble** — Chrome 113+ 한정 [확인함]. Phase 4 옵션. feature-detect 폴백 필수.
- **vibrationActuator** vs 구형 `hapticActuators[]` — 신 API 우선 [확인함, web.dev].
- 햅틱 중첩 호출 시 *마지막만 살아남음* — 매니저에서 우선순위 큐 관리 권장.

---

## 6. 접근성 / 리매핑 (Accessibility)

### 6.1. XAG 2.0.1 + GAG 등급

| 등급 | 항목 | ECHORIS 우선순위 |
|:---|:---|:---:|
| Basic | 풀 리매핑 (모든 액션, 키↔패드) | **P0** |
| Basic | Hold ↔ Toggle 변환 옵션 | **P1** |
| Basic | Deadzone 슬라이더 (0.0~0.40) | **P1** |
| Basic | 버튼 라벨 자동 전환 + 강제 오버라이드 | **P0** |
| Basic | 사용자 정의 저장 (`localStorage`) | **P0** |
| Intermediate | 한 손 모드 (점프=L1+R1 동시 → 단일 버튼 우회) | **P2** |
| Intermediate | 입력 큐 시각화 (HUD 다음 1-2 입력 표시) | **P3** |
| Intermediate | "Press to bind" UI — 1초 캡처 + ESC 취소 | **P1** |

### 6.2. 리매핑 UI 룰

- 모든 액션 항목별 *현재 바인딩* 표시 (키보드 + 패드)
- *충돌 감지* — 동일 버튼이 두 액션에 매핑 시 경고
- *기본값 복원* 버튼
- localStorage 키: `echoris.input.bindings.v1`
- 마이그레이션: 키 스키마 변경 시 버전 bump + 기본값 폴백

---

## 7. 브라우저·플랫폼 호환

### 7.1. 호환성 매트릭스

| 기능 | Chrome 120+ | Edge 120+ | Firefox 120+ | Safari 17+ macOS | Safari iOS | Steam Deck |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|
| 기본 Gamepad API | 안정 [확인함] | 안정 [확인함] | 안정 [확인함] | 안정 [확인함] | 부분 [추측임] | 안정 [확인함] |
| Standard Mapping 자동 인식 | 광범위 [확인함] | 광범위 [확인함] | 양호 [확인함] | XInput 한정 [추측임] | 한정 [추측임] | udev 권한 필요 [확인함] |
| dual-rumble | ✓ [확인함] | ✓ [확인함] | ✓ [확인함] | 제한 [확인함] | ✗ [추측임] | ✓ [추측임] |
| trigger-rumble | ✓ [확인함] | ✓ [확인함] | ✗ [확인함] | ✗ [확인함] | ✗ [추측임] | 추정 ✓ [추측임] |
| GamepadTouch | 부분 [추측임] | 부분 [추측임] | ✗ [추측임] | ✗ [추측임] | ✗ [추측임] | 부분 [추측임] |

### 7.2. Steam Deck 핵심 주의

- Flatpak Chromium 격리로 내장 패드 인식 실패 [확인함]
- 사용자 명령: `flatpak override --user --filesystem=/run/udev:ro org.chromium.Chromium`
- ECHORIS 데모 안내 권장: *"Steam에 비-Steam 게임으로 추가 후 실행"* (Steam Input 가상 XInput 노출 우회) [추측임]
- DPad (buttons[12-15]) 우선 폴링 — 데크 D-Pad 는 디지털, LS 와 분리

### 7.3. Tauri v2 마이그레이션 (Phase 4)

| 항목 | 영향 | 대응 |
|:---|:---|:---|
| OS WebView 사용 (Win=WebView2 / mac=WKWebView) | macOS 트리거-럼블·일부 패드 약함 | feature-detect, fallback gracefully [확인함] |
| `tauri-plugin-gamepad` (gilrs 폴리필) | WebView Gamepad API 부족 시 보강 | Phase 4 진입 시 평가 [확인함] |
| Steam Input "Gamepad Emulation" | 코드 변경 0 — 데크/PS5/Switch Pro 가 XInput 으로 노출 [확인함] | **권장 1차 전략** |
| Steamworks SDK 직접 통합 | 자이로/터치패드/Action Set 가능 [확인함] | Phase 4 검토만, 즉시 도입 X |

---

## 8. UI / 가이드 (UI Guidance)

### 8.1. 키↔패드 매핑 동시 표기

레퍼런스: **Goodboy Galaxy** (*"LB / A key"* 형식) [확인함].

- 조작 가이드 페이지: 액션마다 *키보드 + 패드* 두 줄 병기
- HUD 키 프롬프트: 마지막 입력 디바이스 기준 글리프 자동 전환
- 디바운스 윈도우: 100~250ms (HK/Hades/Dead Cells 표준) [추측임]

### 8.2. 버튼 글리프 표시 룰

| 단계 | 표시 |
|:---|:---|
| Vendor ID 검출 → 브랜드 결정 | Xbox / PlayStation / Switch / Generic 글리프 |
| 사용자 옵션 강제 | "버튼 라벨 강제: [Xbox / PS / Switch / Generic]" |
| Steam Input 래핑 식별 실패 | Generic 폴백 + 사용자 옵션 안내 [확인함] |

### 8.3. 한국어 표기 룰

- *글리프* 는 그래픽 아이콘으로 표시 (예: ⓐ, △)
- *액션명* 은 한국어로 (예: `[A] 점프`, `[X] 공격`)
- 글로벌 표준 매핑 그대로 채택 — 한국 시장 특화 매핑 *불채택* (1차 niche 희석 회피)

---

## 9. Phase 로드맵

### Phase 2 베타 (지금)

P0 항목 모두:
1. W3C Gamepad API 폴링 + Standard Mapping
2. Scaled Radial 0.20 좌스틱 + 0.10 트리거
3. 6f Coyote + 6f/8f Buffer + 가변 점프
4. 키↔패드 매핑 동시 표기 (Goodboy Galaxy 형식)
5. Xbox + 8BitDo + DualSense 3종 × Chrome/Edge/Firefox 검증 매트릭스
6. **베타 직전 P0:** 풀 리매핑 + Vendor ID 자동 라벨

### Phase 2 후반 (P1)

- dual-rumble 진동 (피격 150ms / 단조열 250ms / 보스 600ms)
- 글로벌 진동 강도 슬라이더
- Hold/Toggle 변환 옵션
- "Press to bind" UI

### Phase 3

- Roll-Cancel + Dodge Offset (콤보 보존, 야리코미 파밍 효율 직결) — Dead Cells 모델
- `pixijs-input-devices` v1.0 안정화 시 재평가

### Phase 4 PC 포팅

- Tauri v2 + Steam Input "Gamepad Emulation" — 코드 변경 없이 데크/PS5/Switch Pro 가 XInput 으로 노출
- 트리거-럼블 (Chrome 113+ 한정) feature-detect 분기
- Steamworks SDK 통합은 *옵션*, 즉시 도입 X

---

## 10. 안티패턴 (즉시 폐기 목록)

| 안티패턴 | 사유 |
|:---|:---|
| `setInterval` 별도 폴링 | 렌더 desync [확인함] |
| `gamepad.id` vendor 만 보고 매핑 강제 | Standard Mapping 우선 [확인함] |
| `getGamepads()` 결과 캐싱 | 매 프레임 스냅샷 재호출 필수 [확인함] |
| haptics 중첩 호출 | 마지막만 살아남음 (preempt) [확인함] |
| user gesture 전 `getGamepads()` 결과 신뢰 | 빈 리스트 정상 [확인함] |
| 지역별 한국 특화 매핑 | 1차 niche 시그널 희석 |
| Phase 2/3 에 Steamworks 직접 통합 | `project_multiplayer_timing` 원칙 위반 |
| `pixijs-input-devices` v0.x 즉시 도입 | API 안정성 미확보, 자체 InputManager 우선 |
| Hollow Knight 비공인 사이트 (`hollowknight.io`) 레퍼런스 | 라이선스 회색지대 |

---

## 11. 검증 체크리스트 (QA Matrix)

### 11.1. 기능 검증 (P0 베타)

- [ ] `gamepadconnected` 이벤트 1회 후 패드 인식
- [ ] 좌스틱 0.20 deadzone 이동 / DPad 디지털 8방향
- [ ] A 점프 (가변) / RT 대시 / X 공격 (콤보 3타) 정상
- [ ] 6f Coyote 검증 (점프 직전 낙하) — 발판 끝 100ms 내 점프 가능
- [ ] 6f Jump Buffer 검증 (착지 직전 점프 입력) — 착지 즉시 점프
- [ ] 가변 점프 — 버튼 짧게 누르면 절반 높이, 길게 누르면 최대
- [ ] 모든 메뉴 D-Pad / 좌스틱 네비게이션 가능
- [ ] 패드 분리 후 재연결 시 인덱스 재인식

### 11.2. 디바이스 매트릭스 (P0 베타)

| 패드 | Chrome | Edge | Firefox |
|:---|:---:|:---:|:---:|
| Xbox Series Controller | ☐ | ☐ | ☐ |
| 8BitDo SN30 Pro / Pro 2 | ☐ | ☐ | ☐ |
| DualSense (PS5) | ☐ | ☐ | ☐ |

### 11.3. 접근성 검증 (P0 베타)

- [ ] 풀 리매핑 — 모든 액션 변경 가능
- [ ] 충돌 감지 — 동일 버튼 두 액션 할당 시 경고
- [ ] 기본값 복원 동작
- [ ] localStorage 영속화 + 재시작 후 복원
- [ ] 버튼 라벨 자동 전환 (Xbox ↔ PS ↔ Switch)
- [ ] 사용자 강제 오버라이드 옵션

### 11.4. Steam Deck 체크리스트 (P1)

- [ ] `gamepadconnected` 1회 확인 후 패드 인식 정상
- [ ] LS scaled radial deadzone 0.20 기본값
- [ ] DPad (buttons[12-15]) 디지털 우선 폴링
- [ ] Steam Input "Gamepad" 템플릿으로 `mapping === "standard"` 노출 [추측임]
- [ ] 데모 안내 카피에 *"웹/브라우저 게임"* 표현 금지 (`memory/project_demo_positioning`)

---

## 12. 차별화 포지셔닝

레퍼런스 표본 20건 분석 결과 [확인함]:

- 상용 메트로베니아 공식 브라우저 데모 0건
- PixiJS + TS 로 Gamepad API 직접 호출한 횡스크롤 메트로베니아 공개 사례 0건
- 표본 20건 중 풀 리매핑 1건, 진동 0건, HUD 글리프 자동 전환 0건

ECHORIS 가 **W3C 표준 직접 호출 + 풀 리매핑 + HUD 글리프 자동 전환** 셋을 모두 갖추면 좁은 카테고리에서 *선점* 가능. 1차 niche 4 그룹 모두에게 *기능적 정합성* 의 신호가 됨.

---

## 13. 출처

상세 출처는 `Reference/Web_Metroidvania_Gamepad_Reference.md` § 8 참조. 핵심:

- **W3C / 표준:** [W3C Gamepad WD 2025-07-10](https://www.w3.org/TR/gamepad/) , [MDN Gamepad API](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API) , [web.dev Gamepad](https://web.dev/articles/gamepad)
- **데드존·정밀도:** [Hypersect — Interpreting Analog Sticks](http://blog.hypersect.com/interpreting-analog-sticks/) , [Maddy Thorson — Celeste & Forgiveness](https://maddythorson.medium.com/celeste-forgiveness-31e4a40399f1)
- **접근성:** [Game Accessibility Guidelines — Remappable Controls](https://gameaccessibilityguidelines.com/allow-controls-to-be-remapped-reconfigured/) , [Microsoft XAG 107](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/107)
- **메트로베니아 매핑:** Hollow Knight / Dead Cells / SOTN / Bloodstained / Blasphemous / Ori / Aeterna Noctis / Hades / Celeste 공식 가이드 [확인함]
- **Steam / Tauri:** [Steamworks Gamepad Emulation Best Practices](https://partner.steamgames.com/doc/features/steam_controller/steam_input_gamepad_emulation_bestpractices?l=english) , [tauri-plugin-gamepad](https://github.com/DeveloperMindset-com/tauri-plugin-gamepad)

---

> **상태:** Draft. Phase 2 베타 진입 전 P0 항목 (GP-01·02·03·04·05·07·08) 구현 완료가 *gate*. 진동·접근성 일부는 Phase 2 후반 또는 Phase 4 로 위임.
