# 키 리매핑 및 컨트롤 커스터마이징 리서치

> **작성일:** 2026-04-27
> **목적:** 모든 플레이어가 조작키에 대해 피드백을 했다. 키 커스터마이즈를 언제/어떻게 제공할지 검토한다.
> **근거:** `MouseKeyboard_2DSidescroller_ControlScheme_Research.md`, GDC/XAG/GAG 가이드라인, 10종 레퍼런스 게임
> **핵심 결론:** Phase 1은 **프리셋 3종** + localStorage 저장. Phase 2에서 **풀 리매핑 UI** 추가.

---

## 1. 핵심 사실: "기본값이 왕이다"

- **80%+ 플레이어가 기본 키 설정을 그대로 사용한다** (GameFAQs/NeoGAF 설문)
- 나머지 20%에게 리매핑은 **필수** — 접근성 가이드라인 Basic 레벨 의무사항
- 따라서: **기본 바인딩 설계에 가장 많은 시간을 투자**하되, 리매핑은 반드시 제공

---

## 2. 접근성 표준 요구사항

### Game Accessibility Guidelines (Basic 레벨)

> "컨트롤을 리매핑/재구성할 수 있도록 허용하라"

### Xbox Accessibility Guideline (XAG 107)

| 요구사항 | ECHORIS 현황 |
|:---------|:------------|
| 인게임에서 모든 컨트롤 리매핑 가능 | **미구현** |
| 리매핑 후 프롬프트가 새 매핑을 반영 | **미구현** |
| 동시 버튼 누름 대안 제공 | 해당 없음 (동시 입력 없음) |
| 길게 누르기 → 토글 대안 | 대시 홀드/토글 미구현 |
| 리매핑 프로세스 자체가 접근 가능 | -- |

### God of War: Ragnarok 모범 사례

- 첫 부팅 시 접근성 프리셋 워크스루 (건너뛰기 가능)
- 프리셋 적용 후 개별 세부 설정 가능
- 변경된 설정은 파란색으로 프리셋 기본값과 구별

---

## 3. 레퍼런스 게임 비교

| 게임 | 타이틀 리매핑 | 인게임 리매핑 | 프리셋 | 풀 리매핑 | 모범도 |
|:-----|:----------:|:----------:|:-----:|:--------:|:-----:|
| **Celeste** | O | O | X | O (액션당 8개 입력) | ★★★★★ |
| **Dead Cells** | O | O | X | O | ★★★★ |
| **Hollow Knight** | O | O | X | O | ★★★★ |
| **Hades** | O | O | X | O | ★★★★ |
| **Diablo 4** | O | O | X | O (복수 입력) | ★★★★★ |
| **Terraria** | O | O | O (4종) | O | ★★★★★ |
| **Mega Man 11** | O | O | -- | O | ★★★ |
| **Ori WotW** | X | X | X | X (파일 수동 편집만) | ★ |

**Celeste가 가장 모범적:** 액션당 8개 입력, Hold/Invert/Toggle 모드, Assist Mode와 결합.
**Ori WotW가 가장 나쁜 사례:** 리매핑 불가. 커뮤니티 불만 다수.

---

## 4. 플레이어가 키를 바꾸려는 이유

| 이유 | 빈도 | 예시 |
|:-----|:----:|:-----|
| **다른 게임 습관** | 최다 | "Space=점프인데 여기선 Z" |
| **물리적 불편** | 높음 | Z/X/C가 손 위치에 어색 |
| **왼손잡이** | 높음 | WASD 미러링 필요 (IJKL 등) |
| **ESDF/WASD 선호** | 중간 | WASD 대신 ESDF 사용자 |
| **신체적 제약** | 높음 | 한 손 플레이, 손목 통증 |
| **키보드 NKRO** | 중간 | 동시 키 인식 제한 |

---

## 5. ECHORIS 현재 키 매핑과 피드백

### 현재 기본 바인딩

```
이동:    Arrow Keys
점프:    Z
대시:    X
공격:    C (= UI 확인)
인벤토리: I
지도:    M
Flask:   R
메뉴:    ESC
```

### 플레이어 피드백 요약

> **"모든 플레이어가 조작키에 대해 피드백을 했다"**

공통 패턴:
- "Space로 점프하고 싶다"
- "Shift로 대시하고 싶다"
- "WASD로 움직이고 싶다"
- "Z/X/C 배치가 어색하다"

→ **장르 관습이 다른 플레이어들이 섞여 있다.** 일본식(Z/X/C) vs 서양식(Space/Shift) vs WASD 유저.

---

## 6. 권장 해법: 프리셋 3종 (Phase 1) + 풀 리매핑 (Phase 2)

### Phase 1: 프리셋 3종

| 프리셋 | 이동 | 점프 | 대시 | 공격/확인 | 대상 유저 |
|:------|:-----|:-----|:-----|:---------|:---------|
| **Classic** (기본) | Arrow | Z | X | C | 일본식 횡스크롤 (SotN/Mega Man) |
| **Modern** | Arrow | Space | Shift | Z | 서양 PC 게이머 (Space=점프 관습) |
| **WASD** | WASD | Space | Shift | J | WASD 이동 선호 (Hades/Dead Cells식) |

**프리셋 선택 UI 위치:**
- 타이틀 화면 > Options > Controls
- 인게임 Pause > Options > Controls
- **첫 실행 시 강제 표시 불필요** — 타이틀에서 접근 가능하면 충분

### Phase 2: 풀 리매핑

- 액션 목록 → 액션 선택 → "Press a key" 모달 → 키 입력 → 바인딩 갱신
- 충돌 감지: 같은 키가 두 액션에 할당되면 **경고** (강제 금지 아님, Celeste 방식)
- "Reset to Default" 버튼 필수
- 프롬프트/튜토리얼 동적 반영

### 구현 비용

| 단계 | 공수 | 위험도 |
|:-----|:-----|:------|
| 프리셋 3종 (Phase 1) | **2-3시간** | 낮음. InputManager에 프리셋 교체 + localStorage 저장만 |
| 풀 리매핑 UI (Phase 2) | **8-12시간** | 중간. 키 입력 대기 모달 + 충돌 처리 + 프롬프트 반영 |

---

## 7. 웹 게임 특수 제약

### 리매핑 대상에서 제외해야 할 키

| 키 | 이유 |
|:--|:-----|
| `Escape` | 메뉴 고정 (관례) |
| `F5` | 브라우저 새로고침 |
| `F11` | 전체 화면 토글 |
| `F12` | 개발자 도구 |
| `Ctrl+*` | 브라우저 단축키 |
| `Alt+*` | OS/브라우저 단축키 |

### 저장: localStorage

```typescript
localStorage.setItem('echoris-keybindings', JSON.stringify(bindings));
```

- 도메인별 바인딩 (echoris.io)
- 브라우저 캐시 삭제 시 초기화 → 기본값 복원 로직 필수

---

## 8. InputManager.ts 수정 방향

### 현재 구조의 강점

- `GameAction` enum 기반 — 이미 액션 단위 추상화됨
- `bindings: Record<GameAction, string[]>` — 액션당 복수 키 지원
- IME(한글 입력기) 대응 로직 존재

### Phase 1 최소 변경 (프리셋만)

```typescript
const PRESETS: Record<string, Record<GameAction, string[]>> = {
  classic: { /* 현재 기본값 */ },
  modern: {
    ...DEFAULT_BINDINGS,
    [GameAction.JUMP]: ['Space'],
    [GameAction.DASH]: ['ShiftLeft', 'ShiftRight'],
    [GameAction.ATTACK]: ['KeyZ'],
  },
  wasd: {
    ...DEFAULT_BINDINGS,
    [GameAction.MOVE_LEFT]: ['KeyA'],
    [GameAction.MOVE_RIGHT]: ['KeyD'],
    [GameAction.LOOK_UP]: ['KeyW'],
    [GameAction.LOOK_DOWN]: ['KeyS'],
    [GameAction.JUMP]: ['Space'],
    [GameAction.DASH]: ['ShiftLeft', 'ShiftRight'],
    [GameAction.ATTACK]: ['KeyJ'],
  },
};

applyPreset(name: string): void {
  const preset = PRESETS[name];
  if (!preset) return;
  this.bindings = structuredClone(preset);
  this.rebuildGameKeys();
  this.save();
}

private rebuildGameKeys(): void {
  GAME_KEYS.clear();
  Object.values(this.bindings).flat().forEach(k => GAME_KEYS.add(k));
}

private save(): void {
  localStorage.setItem('echoris-keybindings', JSON.stringify({
    preset: this.currentPreset,
    bindings: this.bindings,
  }));
}
```

### 프롬프트 동적 반영

```typescript
// 현재 바인딩에서 표시용 키 이름 반환
getKeyDisplay(action: GameAction): string {
  const keys = this.bindings[action];
  if (!keys?.length) return '?';
  return keys[0].replace('Key', '').replace('Arrow', '').replace('Left', '').replace('Right', '');
}
```

→ TutorialHint, KeyPrompt, HUD 키 라벨이 이 함수를 호출하면 프리셋 변경 시 자동 반영.

---

## 9. 결론

| 질문 | 답 |
|:-----|:---|
| 리매핑을 제공해야 하는가? | **반드시.** 접근성 Basic 레벨 의무 |
| 지금(Phase 1) 풀 리매핑이 필요한가? | **아니오.** 프리셋 3종이면 80%+ 해결 |
| 프리셋은 어디에서 선택하나? | 타이틀 Options + 인게임 Pause |
| 첫 실행 시 강제 표시하나? | **아니오.** 타이틀에서 접근 가능하면 충분 |
| 풀 리매핑은 언제? | **Phase 2 초입** |
| 기본값을 바꿔야 하나? | **아니오.** Classic(Z/X/C)이 장르 관습에 맞음. 프리셋으로 대안 제공 |

---

## Sources

- [Game Accessibility Guidelines - Allow controls to be remapped](https://gameaccessibilityguidelines.com/allow-controls-to-be-remapped-reconfigured/) [확인함]
- [Xbox Accessibility Guideline 107 - Input](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/107) [확인함]
- [God of War Ragnarok Accessibility (Can I Play That?)](https://caniplaythat.com/2022/11/03/god-of-war-ragnarok-accessibility-review/) [확인함]
- [Celeste Motor Accessibility (SpecialEffect)](https://gameaccess.info/celeste-motor-accessibility-options/) [확인함]
- [The Art of Keybinding (iXie Gaming)](https://www.ixiegaming.com/blog/the-art-of-keybinding/) [확인함]
- [Keyboard Lock API (Chrome Developers)](https://developer.chrome.com/docs/capabilities/web-apis/keyboard-lock) [확인함]
- [Video Games Need Accessibility Standards 2024 (Access-Ability)](https://access-ability.uk/2024/01/05/video-games-need-accessibility-standards-2024/) [확인함]
- `Documents/Research/MouseKeyboard_2DSidescroller_ControlScheme_Research.md` — 조작 체계 리서치
- `Documents/Research/Research_Accessibility.md` — 접근성 전수 조사
