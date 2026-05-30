# System_Settings_Options.md — 게임 옵션 카탈로그 (Gameplay / Display / Audio / Controls)

> **작성일:** 2026-05-30
> **베이스 해상도:** 640×360 (정수 배율 1x/2x/3x @1080p=1920×1080)
> **범위:** 옵션 메뉴에 노출되는 **설정 항목의 콘텐츠 카탈로그**. 메뉴 chrome(레이아웃·전환·조작)은 `Documents/UI/UI_Menu_System.md` §3.5 가 담당하며, 본 문서는 그 탭 안에 들어갈 *항목 정의*를 다룬다.
> **제외:** 접근성(Accessibility) 옵션은 본 문서 범위에서 **의도적으로 제외**한다 (별도 문서/스킬에서 다룸). §6 참조.

---

## 구현 현황 (Implementation Status)

| 탭 | 우선순위 | 상태 | 코드 백킹 |
|:--|:--|:--|:--|
| AUDIO | P1 | 부분 명세 (UI_Menu_System §3.5.1 = 2슬라이더, **본 문서로 5채널 확장**) | `audio/AudioBus.ts` (master/bgm/ambient/sfx/voice + mute) — **존재** |
| DISPLAY | P2 | 신규 명세 | `core/Fullscreen.ts`, `Game.ts` 정수배율, `ParallaxBackground.ts`, `CombatConst.*Shake*` — **부분 존재** |
| CONTROLS | P2 | 신규 명세 | `data/inputBindings.ts` (현재 **고정 참조 테이블**, 리매핑 미구현), `GamepadManager`, `utils/GamepadRumble`, `core/input/padGlyphs.ts` — **부분 존재** |
| GAMEPLAY | P2 | 신규 명세 | `Minimap`, `HUD`, i18n 로케일 번들 — **부분 존재** |

> **SSoT 원칙:** 오디오 채널 기본값은 `audio/AudioBus.ts` 의 `DEFAULT_CHANNEL_STATE` 가 코드 측 SSoT. 본 문서가 *노출 항목·범위·기본값 의도*를 정의하면, 구현은 그 코드 상수와 동기화한다.

---

## 0. 필수 참고 자료 (Mandatory References)

| 문서 | 경로 | 참조 이유 |
|:--|:--|:--|
| 메뉴 시스템 (chrome) | `Documents/UI/UI_Menu_System.md` | 설정 메뉴 레이아웃·탭 구조·조작 체계 (§3.5) |
| 레벨 디자인 규격 | `Documents/Design/Design_Level_Standards.md` | 640×360 논리 해상도·정수 배율 검증값 |
| 오디오 디렉션 | `Documents/System/System_Audio_Direction.md` | 채널 LUFS 타깃·믹스 (기본 볼륨 근거) |
| 입력/게임패드 | `Documents/System/System_3C_Control.md`, `System_Input_Gamepad.md` | 액션 매핑·게임패드 표준 |
| 로컬라이제이션 | `Documents/System/System_Localization_Core.md` | 언어 옵션(EN/KO) |
| 오디오 버스 소스 | `game/src/audio/AudioBus.ts` | 채널/마스터 볼륨 SSoT |
| 입력 바인딩 소스 | `game/src/data/inputBindings.ts` | 액션 기본 바인딩 |

### 0-1. 조사 출처 (Research — 메트로베니아/픽셀 PC 옵션 선례)

| 선례 | 본 문서가 차용한 옵션 |
|:--|:--|
| Blasphemous — "Pixel Perfect" 스케일 (640×360 정수 배율) | DISPLAY: 픽셀 퍼펙트 정수 배율 (ECHORIS 640×360 과 정확히 동형) |
| Hollow Knight v1.5 — 스크린 셰이크 강도·컨트롤러 진동·FPS 제한·언어 | DISPLAY: 스크린 셰이크 강도, FPS 제한 / CONTROLS: 진동 강도 / GAMEPLAY: 언어 |
| Dead Cells / Ori — 키·패드 리매핑, 데미지 수치 토글, HUD 토글 | CONTROLS: 리바인딩 / GAMEPLAY: 데미지 수치·HUD |
| gameuidatabase / gamedeveloper 설정 체크리스트 | 4범주(Gameplay/Display/Audio/Controls) 분류 골격 |

---

## 1. 개요 (Overview)

옵션 메뉴는 플레이어가 게임 경험을 자기 환경·취향에 맞추는 최상위 설정 레이어다. ECHORIS는 웹 브라우저(PC) 기반 픽셀아트 메트로베니아이므로, 콘솔/네이티브 PC의 일부 옵션(HDR, 전용 그래픽 프리셋)은 브라우저 제약상 단순화하고, 픽셀아트·횡스크롤 액션에 핵심적인 옵션(정수 스케일, 스크린 셰이크, 리바인딩, 채널별 볼륨)에 집중한다.

옵션은 **4개 탭**으로 분류한다.

| 탭 | 핵심 질문 | 대표 항목 |
|:--|:--|:--|
| **GAMEPLAY** | "게임이 무엇을 보여주고 알려주는가" | 언어, 데미지 수치, 튜토리얼 힌트, HUD/미니맵 표시, 자동 일시정지 |
| **DISPLAY** | "어떻게 그려지는가" | 창 모드, 정수 배율, 스크린 셰이크, 밝기, 패럴랙스/VFX 밀도, FPS 표시 |
| **AUDIO** | "어떻게 들리는가" | 마스터/BGM/환경음/효과음/음성 볼륨 + 음소거, 포커스 손실 시 음소거 |
| **CONTROLS** | "어떻게 조작하는가" | 키보드 리바인딩, 게임패드 리바인딩, 진동 강도, 패드 글리프, 데드존 |

---

## 2. 설계 의도 (Design Intent)

- **즉시 프리뷰:** 볼륨·스크린 셰이크·배율 등 시청각 즉시 체감 항목은 변경 즉시 게임에 반영한다(프리뷰). 적용/취소 버튼을 따로 두지 않는다.
- **자동 저장:** ESC/BACK 으로 탭을 떠날 때 변경사항을 `localStorage` 에 자동 저장한다(`UI_Menu_System` §3.5.1 패턴 계승).
- **브라우저 현실 인정:** VSync·정밀 프레임 캡·전용 GPU 옵션은 브라우저(rAF) 제약상 제공하지 않거나 단순화한다. 무리한 옵션을 흉내 내 거짓 신호를 주지 않는다.
- **코드 SSoT 동기화:** 오디오 채널 5종은 이미 `AudioBus` 가 보유. 옵션은 *없는 기능을 약속하지 않고* 코드가 지원하는 범위를 노출한다. 리바인딩처럼 미구현 항목은 우선순위(P)로 명시한다.
- **메트로베니아 관행 준수:** 스크린 셰이크 강도(Hollow Knight), 픽셀 퍼펙트(Blasphemous), 리바인딩(Dead Cells)은 장르 플레이어가 기대하는 표준이다.

---

## 3. 상세 규칙 (Detailed Rules) — 옵션 카탈로그

> **표 범례** — 타입: `toggle`(켬/끔) · `slider`(연속/단계) · `cycle`(순환 선택) · `keybind`(키 할당). 백킹: `존재`(코드 구현됨) · `부분`(일부 구현) · `신규`(구현 필요).

### 3.1 GAMEPLAY 탭

| 항목 | 타입 | 값 / 범위 | 기본값 | 우선 | 백킹 | localStorage 키 | 비고 |
|:--|:--|:--|:--|:--|:--|:--|:--|
| 언어 (Language) | cycle | English / 한국어 | 시스템 로케일 추정 | P1 | 존재 (i18n) | `echoris_lang` | 즉시 적용, 전체 텍스트 리프레시 |
| 데미지 수치 표시 | toggle | On / Off | On | P2 | 부분 | `echoris_dmg_numbers` | 전투 플로팅 데미지 텍스트 |
| 튜토리얼 힌트 | toggle | On / Off | On | P2 | 부분 | `echoris_tutorial_hints` | 환경 교육 프롬프트(`Design_Tutorial_*`) |
| 미니맵 표시 | cycle | On / 전투 중 숨김 / Off | On | P2 | 부분 | `echoris_minimap` | `UI_Minimap` |
| HUD 표시 | cycle | Full / Minimal / Off | Full | P2 | 부분 | `echoris_hud_mode` | Minimal=체력·플라스크만 |
| 아이템계 심도 게이지 | toggle | On / Off | On | P3 | 부분 | `echoris_depth_gauge` | `UI_ItemWorld_DepthGauge` |
| 포커스 손실 시 자동 일시정지 | toggle | On / Off | On | P2 | 부분 | `echoris_autopause` | 탭 전환 시(`visibilitychange`). UI_Menu_System §4 엣지케이스와 연동 |
| 골드/획득 토스트 | toggle | On / Off | On | P3 | 부분 | `echoris_pickup_toast` | `UI_Notifications` |

> **언어가 GAMEPLAY 에 있는 이유:** 텍스트 콘텐츠 전반에 영향을 주므로 DISPLAY(렌더)보다 GAMEPLAY(콘텐츠 노출)에 둔다. Hollow Knight·다수 콘솔 타이틀 관행.

### 3.2 DISPLAY 탭

| 항목 | 타입 | 값 / 범위 | 기본값 | 우선 | 백킹 | localStorage 키 | 비고 |
|:--|:--|:--|:--|:--|:--|:--|:--|
| 창 모드 | cycle | 전체화면 / 창 / 의사-전체화면 | 창 | P2 | 존재 | `echoris_window_mode` | `core/Fullscreen.ts` (실제+의사 폴백) |
| 화면 배율 (픽셀 퍼펙트) | cycle | Auto / 1x / 2x / 3x | Auto | P2 | 존재 | `echoris_scale` | 640×360 정수 배율. Blasphemous "Pixel Perfect" 동형. `Game.ts` 1x=640/2x=1280/3x=1920 |
| 스케일 필터 | cycle | Sharp(nearest) / Smooth | Sharp | P2 | 부분 | `echoris_scale_filter` | 픽셀아트 원칙상 Sharp 기본. Smooth는 비정수 창 대응 |
| 스크린 셰이크 강도 | slider | Off / Low(0.5) / Full(1.0) | Full | P2 | 부분 | `echoris_shake` | `CombatConst.HeavyShakeMult`·`KillShakeBonus`·`Camera.Shake*` 에 배율 적용. Hollow Knight 선례 |
| 화면 밝기 (Gamma) | slider | 50 ~ 150 (%) | 100 | P3 | 신규 | `echoris_brightness` | 후처리 밝기 보정. 캘리브레이션 이미지 권장 |
| 패럴랙스 배경 | toggle | On / Off | On | P3 | 존재 | `echoris_parallax` | `ParallaxBackground.ts`. 저사양 성능 옵션 |
| VFX/파티클 밀도 | cycle | Full / Reduced | Full | P3 | 부분 | `echoris_vfx_density` | 성능 옵션. 게임플레이 가독성 정보(함정/위험)는 항상 유지 |
| FPS 표시 | toggle | On / Off | Off | P3 | 부분 | `echoris_show_fps` | 디버그/성능 확인용. `Debug.ts` |

> **브라우저 제약 명시(VSync/FPS 캡):** 렌더는 `requestAnimationFrame`(모니터 주사율에 VSync 묶임)으로 구동되고, 게임 로직은 고정 스텝 60fps(`Game.Render.FixedStepMs=16.6667`)다. 따라서 **별도 VSync 토글·임의 FPS 캡 옵션은 제공하지 않는다**(브라우저가 강제). "FPS 표시"만 노출한다. 콘솔/네이티브 이식 시 FPS 제한 옵션을 재검토한다.

### 3.3 AUDIO 탭

> **`AudioBus` 5채널 정합.** 기존 `UI_Menu_System §3.5.1` 은 BGM/SFX 2슬라이더였으나, 코드(`audio/AudioBus.ts`)는 master + bgm/ambient/sfx/voice 4채널을 보유한다. 본 카탈로그를 **5슬라이더 + 채널 음소거**로 정정한다.

| 항목 | 타입 | 값 / 범위 | 기본값 (코드 SSoT) | 우선 | 백킹 | localStorage 키 | 비고 |
|:--|:--|:--|:--|:--|:--|:--|:--|
| 마스터 볼륨 | slider | 0 ~ 100 (10단위) | 100 | P1 | 존재 | `echoris_vol_master` | `AudioBus` masterVolume |
| BGM 볼륨 | slider | 0 ~ 100 | 55 | P1 | 존재 | `echoris_vol_bgm` | `DEFAULT_CHANNEL_STATE.bgm=0.55` |
| 환경음 (Ambient) | slider | 0 ~ 100 | 22~23 | P1 | 존재 | `echoris_vol_ambient` | `ambient=0.225` (2026-05-05 청취 검증) |
| 효과음 (SFX) | slider | 0 ~ 100 | 80 | P1 | 존재 | `echoris_vol_sfx` | `sfx=0.80` |
| 음성 (Voice) | slider | 0 ~ 100 | 70 | P2 | 존재 | `echoris_vol_voice` | `voice=0.70` |
| 채널 음소거 | toggle | 채널별 Mute | Off | P2 | 존재 | `echoris_mute_<ch>` | `AudioBus` muted 플래그 활용 |
| 포커스 손실 시 음소거 | toggle | On / Off | On | P2 | 부분 | `echoris_mute_unfocus` | 탭 비활성 시 마스터 일시 음소거 |

> **즉시 프리뷰:** Arrow 조작마다 `AudioBus.setChannelVolume(ch, v/100)` / `setMasterVolume` 즉시 호출. 효과음 슬라이더 조정 시 짧은 SFX 프리뷰 1회 재생 권장(볼륨 체감).

### 3.4 CONTROLS 탭

> **현재 상태:** `data/inputBindings.ts` 는 표시용 **고정 참조 테이블**(rebind 미구현)이다. 리바인딩은 신규 기능이며, 9개 액션을 대상으로 한다.

| 항목 | 타입 | 값 / 범위 | 기본값 | 우선 | 백킹 | localStorage 키 | 비고 |
|:--|:--|:--|:--|:--|:--|:--|:--|
| 키보드 리바인딩 | keybind | 액션별 키 1~2개 | 아래 기본 매핑 | P2 | 신규 | `echoris_keybinds` | 충돌 검사 필수. 기본 복원 버튼 제공 |
| 게임패드 리바인딩 | keybind | 액션별 패드 버튼 | 아래 기본 매핑 | P3 | 신규 | `echoris_padbinds` | 표준 게임패드 매핑(`gamepadStandard.ts`) |
| 진동 강도 (Rumble) | slider | Off / Low / Full | Full | P2 | 부분 | `echoris_rumble` | `utils/GamepadRumble`. Hollow Knight 선례 |
| 패드 글리프 스타일 | cycle | Auto / Xbox / PlayStation / Nintendo | Auto | P3 | 부분 | `echoris_pad_glyph` | `core/input/padGlyphs.ts` |
| 스틱 데드존 | slider | 0 ~ 40 (%) | 기본 데드존 | P3 | 부분 | `echoris_deadzone` | 아날로그 스틱 드리프트 대응 |
| 기본값 복원 | action | — | — | P2 | 신규 | — | 키/패드 매핑 전체 초기화 |

#### 기본 입력 매핑 (`inputBindings.ts` 정합 — 리바인딩 초기값)

| 액션 | 키보드 | 게임패드 |
|:--|:--|:--|
| 이동 (Move) | ←→ / WASD | LS / DPad |
| 점프 (Jump) | Z | A |
| 공격 (Attack) | C | X |
| 대시 (Dash) | X | RT |
| 회복 (Heal) | R | Y |
| 상호작용 (Interact) | ↑ | B |
| 인벤토리 (Inventory) | I | View |
| 맵 (Map) | M | LT |
| 일시정지 (Pause) | Esc | Menu |

#### 리바인딩 규칙

- **충돌 차단:** 동일 키를 두 액션에 할당할 수 없다(이동 ↔ 상호작용처럼 방향키 공유는 예외 허용 검토). 충돌 시 경고 + 재입력 요구.
- **예약 키 보호:** ESC(일시정지/뒤로)는 리바인딩 대상에서 제외하거나 재할당 시 대체 일시정지 키를 강제 지정.
- **2-key 허용:** 한 액션에 주/보조 키 2개까지(예: 이동 = Arrow + WASD 동시 유지).
- **기본 복원:** 한 번의 액션으로 위 기본 매핑 전체 복원.

---

## 4. 데이터·지속성 (Persistence)

- **저장소:** `localStorage`. 키 접두사 `echoris_`. (UI_Menu_System §3.5.1 의 `echoris_bgm_vol` 패턴 계승.)
- **권장 통합 스키마:** 개별 키 난립을 막기 위해 단일 JSON(`echoris_settings`)으로 통합 권장. 마이그레이션 시 기존 개별 키를 1회 흡수.

```json
{
  "version": 1,
  "gameplay": { "lang": "ko", "dmgNumbers": true, "tutorialHints": true, "minimap": "on", "hud": "full", "autoPause": true },
  "display":  { "windowMode": "windowed", "scale": "auto", "scaleFilter": "sharp", "shake": 1.0, "brightness": 100, "parallax": true, "vfxDensity": "full", "showFps": false },
  "audio":    { "master": 100, "bgm": 55, "ambient": 23, "sfx": 80, "voice": 70, "mute": {}, "muteUnfocus": true },
  "controls": { "keybinds": {}, "padbinds": {}, "rumble": 1.0, "padGlyph": "auto", "deadzone": 10 }
}
```

- **쓰기 실패 처리:** 프라이빗 브라우징 등 `localStorage` 접근 불가 시 try-catch 로 메모리 유지, 세션 종료 시 손실 허용(에러 토스트 불필요 — UI_Menu_System §4 정합).
- **로드 순서:** 부팅 시 1) 저장값 로드 → 2) `AudioBus`·`Fullscreen`·바인딩에 적용 → 3) 누락 키는 코드 기본값 사용.

---

## 5. 엣지 케이스 (Edge Cases)

| 케이스 | 상황 | 처리 |
|:--|:--|:--|
| 볼륨 0 | 채널 볼륨 0 설정 | 유효값. `setChannelVolume(ch, 0)` 무음. 저장됨 |
| 의사-전체화면 호스트 거부 | iframe 임베드에서 실제 전체화면 불가 | `Fullscreen.ts` 의사-전체화면 폴백으로 자동 전환 |
| 비정수 창 크기 | 창 모드에서 임의 리사이즈 | Auto 배율은 가장 가까운 정수 배율 선택 + 레터박스. Smooth 필터 시 비정수 허용 |
| 리바인딩 중 ESC | 키 입력 대기 중 ESC | 리바인딩 취소(할당 안 함), 기존 키 유지 |
| 예약 키 재할당 시도 | ESC/일시정지 키를 다른 액션에 할당 | 차단 또는 대체 일시정지 키 강제 지정 요구 |
| 언어 전환 중 레이아웃 | 텍스트 길이 변화(EN↔KO) | 패널 `rebuildLayout()` 재호출(UI_Menu_System §4) |
| 게임패드 미연결 시 CONTROLS | 패드 없음 | 게임패드 리바인딩/진동 항목 비활성(#444444), 키보드 항목만 활성 |
| 스크린 셰이크 Off + 화면 정보 | 셰이크가 위험 신호 역할일 때 | 셰이크는 *연출*만 담당. 위험 판정/경고는 셰이크와 독립(가독성 항상 유지) |
| 설정 스키마 버전 불일치 | 구버전 저장값 로드 | `version` 검사 후 마이그레이션, 실패 시 기본값 복원 |

---

## 6. 접근성 제외 범위 (Out of Scope — Accessibility)

본 문서는 **접근성 옵션을 의도적으로 제외**한다(사용자 요청). 아래 항목은 *별도 접근성 문서/스킬*에서 다룬다. 일부는 일반 옵션과 표면이 겹치나, 본 카탈로그는 *대중적 게임플레이/디스플레이/사운드/컨트롤 옵션*에 한정한다.

- 색맹 모드(컬러 필터), 고대비 모드
- 텍스트 크기 스케일링, 자막/캡션 상세 옵션
- 화면 점멸 저감(광과민성), 모션 저감 전용 프리셋
- 홀드→토글 전환, 자동 이동/자동 공격, 원버튼 보조
- 스크린 리더, 사운드 시각화(시각적 사운드 큐)

> **경계 항목 주의:** 스크린 셰이크 강도·진동 강도·미니맵 토글은 *접근성 효과도 있으나 장르 표준 옵션*이므로 본 카탈로그에 포함했다. 광과민성 전용 "점멸 저감" 같은 접근성-특화 항목만 제외한다.

---

## 7. 검증 체크리스트 (Acceptance Criteria)

### 기능 검증

- [ ] AUDIO 5채널(마스터/BGM/환경음/효과음/음성) 슬라이더가 `AudioBus` 볼륨을 즉시 변경한다
- [ ] 채널별 음소거 토글이 `AudioBus` muted 플래그와 동기화된다
- [ ] 화면 배율 Auto/1x/2x/3x 가 640×360 정수 배율로 정확히 적용된다(레터박스 포함)
- [ ] 창 모드 전환이 `Fullscreen.ts`(실제/의사) 와 정합한다
- [ ] 스크린 셰이크 Off 시 전투 셰이크가 0, Low 시 0.5배로 적용된다
- [ ] 언어 전환 시 전체 UI 텍스트가 즉시 갱신되고 패널이 재배치된다
- [ ] 키보드 리바인딩 시 충돌 키가 차단되고 경고가 표시된다
- [ ] 게임패드 미연결 시 패드 관련 항목이 비활성 표시된다
- [ ] 모든 설정이 `localStorage`(`echoris_settings`)에 저장되고 재시작 후 복원된다
- [ ] `localStorage` 접근 불가 환경에서 크래시 없이 메모리 유지로 동작한다

### 경험 검증 (플레이테스트)

- [ ] **즉시 체감:** 볼륨·셰이크·배율 변경이 설명 없이 즉시 반영됨을 플레이어가 인지한다
- [ ] **픽셀 선명도:** Sharp 필터에서 픽셀아트가 흐려지지 않는다(정수 배율)
- [ ] **리바인딩 직관성:** 별도 설명 없이 액션 선택 → 키 입력으로 재할당 가능함을 파악한다
- [ ] **셰이크 취향:** 셰이크에 민감한 플레이어가 Off/Low 로 불편 없이 플레이한다

---

## 8. 구현 우선순위 요약 (Phase 매핑)

| 우선 | 항목 | 근거 |
|:--|:--|:--|
| **P1** | AUDIO 5채널 볼륨, 언어(EN/KO) | 코드 백킹 존재, 최소 출시 필수 |
| **P2** | 창 모드, 화면 배율, 스크린 셰이크, 채널 음소거, 키보드 리바인딩, 진동 강도, GAMEPLAY 토글류 | 장르 표준, 대부분 부분 백킹 존재 |
| **P3** | 밝기, 패럴랙스/VFX 토글, FPS 표시, 게임패드 리바인딩, 패드 글리프, 데드존, 심도 게이지 토글 | 편의·성능·심화 옵션 |

> UI_Menu_System §3.5 의 탭 우선순위(AUDIO P1 / DISPLAY·CONTROLS P2)와 정합. GAMEPLAY 탭을 신규 추가 항목으로 제안한다.
