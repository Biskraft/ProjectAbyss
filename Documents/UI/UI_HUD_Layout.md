# UI_HUD_Layout.md — HUD 레이아웃

## 구현 현황 (Implementation Status)

| 항목 | 상태 |
| :--- | :--- |
| HP 바 (배경 + 색상 전환) | 구현 완료 |
| HP 텍스트 (`HP X/Y`) | 구현 완료 |
| Gold 표시 (`G N`) | 구현 완료 |
| 지층 텍스트 (floorText) | 구현 완료 |
| 산소 게이지 | 미구현 (Player.oxygenRatio는 존재, HUD 연동 필요) |
| 장착 아이템 미리보기 | 미구현 |
| 월드 vs 아이템계 HUD 전환 | 미구현 (현재 동일 HUD 사용) |
| 미니맵 | 미구현 |

---

## 0. 필수 참고 자료 (Mandatory References)

- Project Vision: `Documents/Terms/Project_Vision_Abyss.md`
- Writing Standards: `Documents/Terms/GDD_Writing_Rules.md`
- HUD 소스: `game/src/ui/HUD.ts`
- 플레이어 산소 시스템: `game/src/entities/Player.ts`

---

## 1. 개요 (Overview)

HUD(Heads-Up Display)는 플레이어가 의식하지 않아도 자연스럽게 상태를 파악할 수 있도록 화면 가장자리에 배치된 상태 정보 레이어다. PixiJS BitmapText와 Graphics를 통해 렌더링되며, 게임 캔버스(640×360) 위에 고정 오버레이로 표시된다. 월드(탐험 공간)와 아이템계(강화 공간) 간 컨텍스트에 따라 표시 정보가 다를 수 있다.

---

## 2. 설계 의도 (Design Intent)

- **가독성 우선:** 픽셀 폰트 8px 기준으로 작은 화면에서도 즉각 판독 가능하도록 설계한다. 가로 640px 캔버스에서 HUD가 게임 시야를 가리지 않도록 모든 요소를 화면 가장자리에 배치한다.
- **색상으로 상태 전달:** HP 바는 잔량 비율에 따라 색상이 자동 전환되어, 수치를 읽지 않아도 위험 상태를 즉각 인지할 수 있다 (초록 → 노랑 → 빨강).
- **아이템계 맥락 표시:** `floorText`는 아이템계 진입 시 현재 지층 정보를 표시하여, 플레이어가 "이 무기의 몇 번째 기억 속에 있는지"를 항상 인지하도록 돕는다.

---

## 3. 상세 규칙 (Detailed Rules)

### 3.1 HUD 요소 목록

| 요소 | 컴포넌트 | 위치 (x, y) | 색상 | 표시 조건 |
| :--- | :--- | :--- | :--- | :--- |
| Gold 텍스트 | BitmapText | (4, 4) | `0xFFD700` (금색) | 항상 표시 |
| HP 바 배경 | Graphics | (4, 50) | `0x333333` (어두운 회색) | 항상 표시 |
| HP 바 채움 | Graphics | (4, 50) | 상태별 (아래 참조) | 항상 표시 |
| HP 텍스트 | BitmapText | (6, 50) | `0xFFFFFF` (흰색) | 항상 표시 |
| 지층 텍스트 | BitmapText | (4, 62) | `0xFFFFFF` (흰색) | 아이템계 진입 시 씬에서 설정 |

### 3.2 HP 바 세부 사양

| 항목 | 값 |
| :--- | :--- |
| 바 너비 (barW) | 50px |
| 바 높이 (barH) | 5px |
| 배경색 | `0x333333` |
| HP > 50% | `0x22AA22` (초록) |
| HP 25~50% | `0xAAAA22` (노랑) |
| HP <= 25% | `0xAA2222` (빨강) |
| 텍스트 형식 | `HP {ceil(hp)}/{maxHp}` |

HP 채움 너비 공식:

```
fillWidth = barW × clamp(hp / maxHp, 0, 1)
ratio 기준:
  ratio = max(0, hp / maxHp)
  ratio > 0.5  → color = 0x22AA22
  ratio > 0.25 → color = 0xAAAA22
  그 외       → color = 0xAA2222
```

### 3.3 Gold 표시 형식

```
표시 형식: "G {gold}"
예: G 0, G 250, G 9999
갱신: updateGold(gold: number) 호출 시 즉시 갱신
```

### 3.4 지층 텍스트 (floorText)

```
설정: setFloorText(text: string) 호출
표시 위치: (4, 62) — HP 텍스트 바로 아래
월드 탐험 시: 빈 문자열 또는 현재 레벨명
아이템계 진입 시: "지층 N / 아이템명" 형식 (씬이 결정)
```

### 3.5 조작 가이드 오버레이 (ControlsOverlay)

별도 컴포넌트이나 HUD와 동일 레이어에 표시된다. 오른쪽 상단에 고정 배치.

| 항목 | 값 |
| :--- | :--- |
| 패널 너비 | 72px |
| 위치 | 오른쪽 상단 (x = GAME_WIDTH - 76, y = 4) |
| 배경 투명도 | alpha = 0.45 |
| 전체 컨테이너 투명도 | alpha = 0.7 |
| 폰트 크기 | 8px |
| 키 색상 | `0xFFDD44` (노란색) |
| 액션 텍스트 색상 | `0xCCCCCC` (연회색) |
| 줄 간격 | 10px |

표시 키바인딩:

| 키 | 액션 |
| :--- | :--- |
| `← →` | Move |
| `Z` | Jump |
| `X` | Attack |
| `C` | Dash |
| `I` | Item |

### 3.6 산소 게이지 (미구현 — 설계 예약)

`Player.oxygenRatio` (0.0~1.0)가 이미 구현되어 있으며, HUD 연동이 필요하다.

| 항목 | 예약 값 |
| :--- | :--- |
| 표시 조건 | 플레이어가 수중 진입 시(submerged = true) 표시, 수면 위로 나오면 숨김 |
| 위치 | HP 바 하단 (예: y = 58) |
| 바 너비 | 50px (HP 바와 동일 너비) |
| 색상 | 산소 충분 = `0x4488FF` (파란색), 산소 부족(< 30%) = `0xFF4444` (빨간색) |
| 텍스트 | 표시 없음 (바만 표시) |
| 최대 산소 | 20,000ms (20초) |

---

## 4. 엣지 케이스 (Edge Cases)

| 상황 | 처리 방식 |
| :--- | :--- |
| hp가 음수가 되는 경우 | `ratio = max(0, hp / maxHp)`으로 0 이하 클램프. 바 너비 0으로 표시 |
| hp가 maxHp를 초과하는 경우 (회복 오버힐) | ratio가 1.0 초과. 현재 클램프 없음 — 바가 barW를 넘어 그려질 수 있음. 추후 `min(1, ratio)` 적용 필요 |
| maxHp = 0인 경우 | 0 나누기 발생. 현재 방어 코드 없음. maxHp는 최소 1 이상임을 상위 시스템에서 보장해야 함 |
| gold가 매우 큰 수인 경우 (예: 999999) | BitmapText가 긴 문자열을 처리. 레이아웃 밀림 발생 가능. 표시 상한을 설정하거나 "G 999K" 형식 도입 검토 필요 |
| floorText가 매우 긴 경우 | 좌측 HUD 영역을 침범할 수 있음. 최대 문자 수 제한 또는 말줄임 처리 필요 |
| 산소 게이지 미구현 상태에서 수중 진입 | 현재 HUD에 산소 표시 없음. 플레이어는 시각적 피드백 없이 익사. TutorialHint로 임시 보완 가능 |

---

## 5. 검증 체크리스트 (Acceptance Criteria)

### 기능 검증

- [ ] HP 100%에서 초록 바가 50px 너비로 표시됨
- [ ] HP가 50% 이하가 되면 노란색으로 전환됨
- [ ] HP가 25% 이하가 되면 빨간색으로 전환됨
- [ ] HP 0일 때 바 너비가 0px로 표시됨 (빈 배경만)
- [ ] Gold 수령 후 즉시 HUD 수치가 갱신됨
- [ ] 아이템계 진입 시 floorText가 지층 정보를 표시함
- [ ] 조작 가이드 오버레이가 우측 상단에 항상 표시됨

### 경험 검증

- [ ] HP 위기(빨간 바) 상태가 숫자를 읽지 않아도 시각적으로 즉각 인지됨
- [ ] HUD 요소가 게임 화면의 탐험 시야를 가리지 않음
- [ ] 산소 게이지가 구현된 후, 수중에서 10초 이내에 위험 상태임을 인지할 수 있음

---

*소스 참조: `game/src/ui/HUD.ts`, `game/src/ui/ControlsOverlay.ts`, `game/src/entities/Player.ts`*
