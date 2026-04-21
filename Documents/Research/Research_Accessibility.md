# Accessibility Research - ECHORIS

> 웹 기반 2D 횡스크롤 액션 RPG (PixiJS/TypeScript, keyboard-first)에 적용 가능한 접근성 조사.

---

## Reference Game Analysis

### Celeste — Assist Mode

| 옵션 | 범위 | 기본값 |
|------|------|--------|
| Game Speed | 50~100% (10% 단위) | 100% |
| Invincibility | On/Off | Off |
| Infinite Stamina | On/Off | Off |
| Infinite Dashes | On/Off | Off |
| Dash Assist (방향 자동 보정) | On/Off | Off |
| Skip Chapter | 버튼 (일시정지 메뉴) | - |

설계 철학:
- 처음부터 해금 없이 사용 가능
- 업적/진행/스토리 패널티 없음
- "Easy Mode"가 아닌 "Assist Mode" 용어 사용 (낙인 감소)
- 언제든 토글 가능, 세이브에 영구 표시 없음

추가 접근성:
- 화면 흔들림 On/Off (Assist Mode와 별도, 일반 Options)
- 전체 키 리매핑 (키보드 + 컨트롤러 독립)
- 색맹 전용 모드 없음 (형태+애니메이션 기반 디자인으로 대응)

> "Adding an assist mode to Celeste was one of the best decisions we made. It costs nothing to let people enjoy your game." — Maddy Thorson

**Sources:**
- [Celeste Assist Mode - Fandom Wiki](https://celestegame.fandom.com/wiki/Assist_Mode)
- [GDC 2019 - Designing Celeste](https://www.gdcvault.com/play/1025890/)

### Dead Cells — Breaking Barriers Update (2022)

| 카테고리 | 기능 | 세부 |
|----------|------|------|
| Assist | Continue Mode | 바이옴 시작점 리스폰 (퍼마데스 제거) |
| Assist | Auto-Hit | 적 범위 내 자동 공격 |
| Assist | 적 피해 감소 | 25/50/75/100% 감소 슬라이더 |
| Assist | 플레이어 피해 증가 | 배율 조정 |
| Assist | 함정 피해 감소 | 환경 위험 별도 슬라이더 |
| Assist | 패리 윈도우 확장 | 타이밍 윈도우 확대 |
| 시각 | 폰트 크기 | Small/Medium/Large/Extra Large |
| 시각 | 적 공격 경고 크기 | 10~200% |
| 시각 | HUD 크기 | 50~200% |
| 시각 | HUD 투명도 | 0~100% |
| 시각 | 색맹 필터 | Protanopia/Deuteranopia/Tritanopia |
| 시각 | 화면 흔들림 | Off/Reduced/Normal |
| 시각 | 플래시 감소 | On/Off |
| 시각 | 외곽선 모드 | 스프라이트에 외곽선 추가 |
| 시각 | 배경 대비 | 배경 레이어 어둡게 |
| 입력 | 전체 리매핑 | 키보드 + 컨트롤러 독립 |
| 입력 | Hold-to-Repeat | 홀드 = 반복 입력 |
| 입력 | 입력 버퍼링 | 버퍼 윈도우 조정 |
| 게임플레이 | 게임 속도 | 50~100% (10% 단위) |
| 게임플레이 | Auto-Aim | 원거리 무기 자동 조준 (강도 조절) |
| 오디오 | 모노 오디오 | 스테레오 → 모노 |
| 오디오 | 볼륨 분리 | BGM/SFX/환경음 독립 |
| 인지 | 간소화 HUD | 비필수 UI 요소 제거 |
| 인지 | 튜토리얼 재실행 | 튜토리얼 재트리거 |

**Sources:**
- [Dead Cells Accessibility Page](https://dead-cells.com/accessibility)
- [Breaking Barriers - Steam Announcement](https://store.steampowered.com/news/app/588650/view/3379786928714788960)

### Hades — God Mode (누적 어시스트)

- 사망 시 +2% 피해 저항 누적 (최대 80%)
- 더 고전할수록 더 쉬워짐
- 토글 On/Off 자유
- 업적/스토리 제한 없음

로그라이크/야리코미 루프에 가장 자연스러운 어시스트 패턴.

---

## Industry Standards

### Xbox Accessibility Guidelines (XAG) — 23개 가이드라인

| 카테고리 | 핵심 |
|----------|------|
| Text & UI | 확대 가능 텍스트, 고대비, 명확한 폰트 |
| Audio | 자막, 오디오 큐의 시각적 대안, 모노 오디오 |
| Input | 리매핑, 한 손 플레이, 홀드 vs 토글, 입력 단순화 |
| Difficulty | 조정 가능한 난이도, 스킵 옵션, 연습 공간 |
| Visual | 스크린리더, 색맹 모드, 모션 감소 |
| Time | 필수 타임 입력 없음, 타이머 조정, 어디서든 일시정지 |

**Source:** [Xbox Accessibility Guidelines](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/)

### Game Accessibility Guidelines (3 Tier)

| Tier | ECHORIS 적용 필수 항목 |
|------|----------------------|
| Basic | 키 리매핑, 색상만으로 정보 전달 금지, 게임 속도 조정, 일시정지 |
| Intermediate | 플레이 중 난이도 변경, 화면 흔들림/플래시 토글, 전경/배경 대비, 폰트 크기 |
| Advanced | 어디서든 일시정지, 비인터랙티브 시퀀스 스킵, 메뉴 스크린리더 |

**Source:** [Game Accessibility Guidelines](http://gameaccessibilityguidelines.com/)

### WCAG 2.1 AA — 웹 게임 적용

| 기준 | PixiJS 구현 방법 |
|------|-----------------|
| 1.4.1 색상만으로 정보 전달 금지 | 형태+아이콘+텍스트 병용 |
| 1.4.3 텍스트 대비 4.5:1 | 인게임 텍스트 렌더링 시 준수 |
| 1.4.4 텍스트 200% 확대 | 폰트 스케일링 시스템 |
| 2.1.1 키보드 접근 | 모든 기능 키보드로 (이미 keyboard-first) |
| 2.2.1 시간 조정 | 게임 속도 / 일시정지 |
| 2.3.1 3회 이상 깜빡임 금지 | 플래시 감소 모드 |
| 4.1.2 ARIA 레이블 | DOM 오버레이 메뉴에 적용 |

---

## ECHORIS 구현 우선순위

### P0 (런칭 필수)

| 기능 | 구현 난이도 | 비고 |
|------|-----------|------|
| 키 리매핑 | 중 | localStorage 저장. InputManager 확장 |
| 게임 속도 조정 (50~100%) | 하 | Ticker.speed 변경 |
| 화면 흔들림 Off/Reduced/Normal | 하 | Camera.shake에 multiplier |
| 플래시 감소 | 하 | ScreenFlash에 조건 분기 |
| 일시정지 (브라우저 포커스 아웃 포함) | 하 | visibilitychange 이벤트 |
| 홀드 vs 토글 옵션 | 중 | 대시/벽타기 입력 |
| 관대한 Coyote Time + Jump Buffer | 하 | 이미 구현됨 (150ms/250ms) |

### P1 (Phase 2)

| 기능 | 구현 난이도 | 비고 |
|------|-----------|------|
| Assist Mode (무적/피해 감소) | 중 | Celeste/Dead Cells 모델 |
| 색맹 필터 (3종) | 하 | PixiJS ColorMatrixFilter 한 줄 |
| 적 공격 경고 크기 조정 | 하 | 경고 아이콘 scale 파라미터 |
| 폰트/HUD 크기 조정 | 중 | BitmapText fontSize + HUD scale |
| 배경 대비 강화 (배경 어둡게) | 하 | backgroundLayer.alpha |
| 모노 오디오 | 하 | Howler.js 네이티브 지원 |
| 볼륨 독립 (BGM/SFX) | 하 | Howler 이미 그룹별 분리 |

### P2 (Phase 3+)

| 기능 | 구현 난이도 | 비고 |
|------|-----------|------|
| Hades식 누적 어시스트 | 중 | 아이템계 사망 시 +2% 저항 |
| Auto-Aim (원거리) | 중 | 가장 가까운 적 자동 타겟 |
| 외곽선 모드 | 중 | Outline shader |
| DOM 메뉴 ARIA 레이블 | 중 | 웹 접근성 |
| 스크린리더 (메뉴 TTS) | 고 | Web Speech API |
| 한 손 플레이 모드 | 고 | 입력 구조 대폭 변경 필요 |

---

## PixiJS 기술 참고

```typescript
// 색맹 필터 적용 (한 줄)
import { ColorMatrixFilter } from 'pixi.js';
const filter = new ColorMatrixFilter();
filter.deuteranopia(); // or .protanopia(), .tritanopia()
app.stage.filters = [filter];

// 게임 속도 조정
app.ticker.speed = 0.7; // 70%

// 화면 흔들림 토글
const shakeMultiplier = settings.screenShake === 'off' ? 0
  : settings.screenShake === 'reduced' ? 0.3 : 1.0;
camera.shake(intensity * shakeMultiplier, duration);

// 브라우저 포커스 아웃 시 일시정지
document.addEventListener('visibilitychange', () => {
  if (document.hidden) game.pause();
});
```

---

## Sources

- [Celeste Assist Mode - Fandom Wiki](https://celestegame.fandom.com/wiki/Assist_Mode)
- [GDC 2019 - Designing Celeste](https://www.gdcvault.com/play/1025890/)
- [Dead Cells Accessibility Page](https://dead-cells.com/accessibility)
- [Breaking Barriers - Steam](https://store.steampowered.com/news/app/588650/view/3379786928714788960)
- [Xbox Accessibility Guidelines](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/)
- [Game Accessibility Guidelines](http://gameaccessibilityguidelines.com/)
- [TLOU2 Accessibility](https://www.playstation.com/en-us/games/the-last-of-us-part-ii/accessibility/)
- [AbleGamers Includification](https://www.ablegamers.org/includification/)
- [WCAG 2.1](https://www.w3.org/WAI/standards-guidelines/wcag/)
