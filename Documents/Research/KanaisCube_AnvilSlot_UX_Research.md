# Diablo 3 카나이 함 UX 분석 + ECHORIS 앤빌 슬롯 설계

> **작성일:** 2026-04-23
> **목적:** Diablo 3 Kanai's Cube의 UX를 분석하고, ECHORIS 인벤토리에서 C키로 아이템을 앤빌 슬롯에 배치하는 플로우를 설계한다.
> **Sources:**
> - [Maxroll.gg - Kanai's Cube](https://maxroll.gg/d3/resources/kanais-cube) [확인함]
> - [Blizzard - Kanai's Cube Guide](https://eu.diablo3.blizzard.com/en-us/game/guide/items/kanais-cube) [확인함]
> - [Expert Game Reviews - Full Guide](https://expertgamereviews.com/diablo-3-kanais-cube-full-guide/) [확인함]
> - `Documents/UI/UI_Inventory.md` — 현재 인벤토리 키 매핑
> - `Documents/UI/UI_Interaction_Patterns.md` — 4-Pattern 통합 규약

---

## Part 1: Diablo 3 Kanai's Cube UX 핵심 분석

### 1.1 접근 플로우

```
마을에서 큐브 오브젝트 클릭
  → 큐브 UI 열림 (Pattern A: Modal)
    → 3x3 그리드 중앙 + 레시피 북 + 패시브 파워 슬롯
```

- **고정형 스테이션** (D2의 휴대형 Horadric Cube와 달리)
- ECHORIS의 앤빌(세이브 포인트)과 동일 구조

### 1.2 아이템 배치 UX (핵심)

| 방식 | 설명 | ECHORIS 적용 |
|:-----|:-----|:------------|
| **우클릭** | 인벤토리 아이템 우클릭 → 큐브 슬롯에 즉시 배치 | C키로 대체 |
| **드래그** | 인벤토리에서 큐브로 끌어다 놓기 | 키보드 전용이므로 불필요 |
| **Fill 버튼** | 레시피 선택 후 원클릭 재료 자동 투입 | 아이템 1개만 넣으므로 불필요 |
| **제거** | 큐브 내 아이템을 다시 드래그하여 인벤토리로 | ESC/C키 취소 |
| **UI 닫기 시** | 남은 아이템 자동 인벤토리 복귀 | 동일 적용 |

**핵심 인사이트:** D3에서 아이템을 큐브에 넣으면 **인벤토리에서 제거**되고 큐브 내부로 이동한다. 취소 시 자동 복귀.

### 1.3 시각 피드백

| 단계 | 피드백 |
|:-----|:-------|
| 아이템 배치 | 인벤토리에서 사라지고 큐브 슬롯에 표시 |
| Transmute 클릭 | 2초 빛나는 애니메이션 (스킵 가능) |
| 결과 표시 | 결과물이 큐브 슬롯에 출현 |
| Accept | 결과물을 인벤토리로 이동 |

### 1.4 취소/되돌리기

- 배치 후 Transmute 전: 아이템을 **큐브에서 꺼내서** 인벤토리로 되돌리기
- UI 닫기: 남은 아이템 **자동 복귀**
- Transmute 후: **되돌리기 불가** (원본 파괴)
- 재료 부족: **Transmute 버튼 비활성** (실패 방지)

---

## Part 2: ECHORIS 앤빌 슬롯 UX 설계

### 2.1 현재 플로우 (기존)

```
월드에서 앤빌 접근 (Pattern D: C키)
  → InventoryUI (anvil 모드) 열림
    → 방향키로 아이템 선택
    → X키로 "다이브 대상 확정"
    → DivePreview 표시 (C=확인/ESC=취소)
    → 다이브 연출 시작
```

**문제점:**
- "어떤 아이템을 앤빌에 올릴지"를 인벤토리 그리드에서 X키로 선택하는 방식
- **앤빌 슬롯이 시각적으로 존재하지 않음** — 아이템이 어디에 "올려지는지" 보이지 않음
- 카나이 함처럼 "슬롯에 탁 넣는" 물리적 만족감이 없음

### 2.2 신규 플로우 (카나이 함 방식)

```
월드에서 앤빌 접근 (Pattern D: C키)
  → 앤빌 UI 열림 (인벤토리 + 앤빌 슬롯 통합 화면)
    → 좌측: 인벤토리 5x4 그리드 (기존)
    → 우측: 앤빌 슬롯 1개 (빈 상태) + 아이템 정보 + [C] DIVE / [ESC] BACK
    → 방향키로 인벤토리 탐색
    → **C키로 선택 아이템을 앤빌 슬롯에 배치** ("탁" 이펙트)
    → 앤빌 슬롯에 아이템이 표시됨 + 다이브 정보 표시
    → **C키 다시 → DIVE 확정** (2단계 확인)
    → **ESC → 앤빌 슬롯에서 아이템 제거 → 인벤토리 복귀**
```

### 2.3 UI 레이아웃

```
640x360 (베이스 해상도)

+========[ FORGE ]==========================================+
|                                                            |
|  +--[ INVENTORY ]---+     +--[ ANVIL ]----------------+   |
|  | [■] [■] [■] [■] [■] |     |                          |   |
|  | [■] [■] [■] [■] [■] |     |   ┌──────────────┐      |   |
|  | [■] [■] [■] [■] [■] |     |   │              │      |   |
|  | [■] [■] [■] [■] [■] |     |   │  [앤빌 슬롯]  │      |   |
|  |                 |     |   │   32x32        │      |   |
|  |                 |     |   └──────────────┘      |   |
|  +-----------------+     |                          |   |
|                          |   Iron Blade             |   |
|  5/20 items              |   RARE Lv.3              |   |
|                          |   ATK: 45  INT: 0        |   |
|                          |   Strata: 1/3            |   |
|                          |                          |   |
|                          |   [C] DIVE   [ESC] BACK  |   |
|                          +--------------------------+   |
|                                                            |
|  [C] Place on Anvil    [ESC] Close                        |
+============================================================+

--- 아이템 배치 전 ---
하단 힌트: "[C] Place on Anvil    [ESC] Close"
앤빌 슬롯: 빈 상태 (점선 테두리)

--- 아이템 배치 후 ---
하단 힌트: "[C] DIVE    [ESC] Remove"
앤빌 슬롯: 아이템 아이콘 표시 + 레어리티 색상 테두리 + 맥동 이펙트
```

### 2.4 키 매핑 (상태별)

#### 상태 1: 아이템 미배치 (앤빌 슬롯 비어있음)

| 키 | 동작 |
|:---|:-----|
| **Arrow** | 인벤토리 그리드 탐색 |
| **C** | 선택 아이템을 **앤빌 슬롯에 배치** |
| **Z** | Detail View 열기 |
| **ESC** | 앤빌 UI 닫기 (월드로 복귀) |
| **I** | 앤빌 UI 닫기 |

#### 상태 2: 아이템 배치됨 (앤빌 슬롯에 아이템 있음)

| 키 | 동작 |
|:---|:-----|
| **C** | **DIVE 확정** → 다이브 프리뷰/연출 시작 |
| **ESC** | **아이템 제거** → 앤빌 슬롯 비움 → 인벤토리 복귀 → 상태 1로 |
| **Arrow** | 비활성 (인벤토리 탐색 차단 — 앤빌에 집중) |
| **Z** | 배치된 아이템의 Detail View |

### 2.5 C키 충돌 해소

**문제:** 현재 인벤토리에서 C키 = Compare Mode.
**해법:** **앤빌 모드에서는 C키의 의미가 "배치"로 전환**된다.

| 모드 | C키 의미 |
|:-----|:---------|
| inventory 모드 (I키로 열림) | Compare Mode 토글 |
| **anvil 모드 (앤빌 근접 C키로 열림)** | **앤빌 슬롯에 배치 / DIVE 확정** |

이것은 기존 `UI_Inventory.md` §3.8 Anvil 모드 차이점과 일관된다 — "같은 UI, 다른 키 의미."

### 2.6 시각 피드백 상세

#### 배치 시 ("탁" 이펙트)

```
1. 인벤토리에서 C키 입력
2. 선택된 아이템 슬롯에서 아이콘이 "날아가는" 트윈 (150ms)
   - 시작: 인벤토리 슬롯 위치
   - 끝: 앤빌 슬롯 위치
   - 이징: ease-out (가속 → 감속)
3. 앤빌 슬롯에 도착 시:
   - 짧은 "탁" 파티클 (3-5개 불꽃 스파크)
   - 앤빌 슬롯 테두리가 레어리티 색상으로 1회 플래시
   - SFX: 금속 위에 물건을 올려놓는 짧은 소리
4. 인벤토리의 해당 슬롯: 어두워짐 (alpha 0.3) + "ON ANVIL" 표시
5. 앤빌 슬롯: 아이템 아이콘 + 레어리티 색상 맥동(0.8초 주기)
```

#### 제거 시 (ESC)

```
1. ESC 입력
2. 앤빌 슬롯에서 아이콘이 인벤토리로 "날아가는" 역트윈 (100ms)
3. 인벤토리 슬롯 복원 (alpha 1.0)
4. 앤빌 슬롯: 다시 빈 상태 (점선 테두리)
```

#### DIVE 확정 시 (C 2번째)

```
1. C키 입력 (앤빌 슬롯에 아이템이 있는 상태)
2. 앤빌 슬롯의 아이템이 빛나기 시작 (0.3초 증가)
3. UI 전체가 점진적으로 어두워짐
4. DivePreview 또는 다이브 연출로 전환
   - firstDiveDone === false → T5 풀 프리뷰 패널
   - firstDiveDone === true → 바로 다이브 연출 (S7)
```

### 2.7 엣지 케이스

| 상황 | 처리 |
|:-----|:-----|
| 장착 중인 아이템에 C 입력 | "Unequip first" 토스트. 배치 차단 (System_ItemWorld_Core §2.1) |
| 아이템 0개 | 앤빌 슬롯만 표시, 인벤토리 비어있음 표시 |
| 앤빌 슬롯에 아이템 있는 상태에서 UI 닫기 (I키/ESC) | 아이템 자동 인벤토리 복귀 (D3 동일) |
| 앤빌 슬롯에 아이템 배치 후 다른 아이템 선택 | 불가. Arrow 비활성. 먼저 ESC로 제거 필요 |
| Normal(지층 0) 아이템에 C 입력 | 정상 배치. 다이브 가능 (Broken Blade 제외) |
| Broken Blade에 C 입력 | "Cannot dive" 토스트. 배치 차단 |

### 2.8 기존 문서 영향

| 문서 | 변경 사항 |
|:-----|:---------|
| `UI_Inventory.md` §3.4 | anvil 모드 키 매핑: X(Dive) → C(Place→Dive 2단계)로 변경 |
| `UI_Inventory.md` §3.8 | Anvil 모드 차이점 테이블 갱신 |
| `UI_Interaction_Patterns.md` | Anvil Interaction 상세 갱신 (2단계 C키 플로우) |
| `UI_SacredPickup.md` §3.8 | S6 대장간 UI 진입 경로 갱신 |

---

## Part 3: D3 vs ECHORIS 비교

| 항목 | Kanai's Cube (D3) | ECHORIS 앤빌 (제안) |
|:-----|:-------------------|:--------------------|
| 접근 | 마을 고정 오브젝트 클릭 | 세이브 포인트 앤빌 근접 C키 (Pattern D) |
| 아이템 배치 | 우클릭/드래그 | **C키** (키보드 전용) |
| 슬롯 수 | 3x3 그리드 (다수 재료) | **1개** (무기 1개만) |
| 배치 취소 | 드래그로 꺼내기 / UI 닫기 | **ESC** / UI 닫기 |
| 확정 | Transmute 버튼 | **C키 2번째** (Place → Dive) |
| 결과 | 변환 결과물 출현 | 아이템계 진입 (다이브) |
| 확정 후 취소 | 불가 (원본 파괴) | 불가 (다이브 시작) |
| 비용 표시 | 재료 수량 표시 | 없음 (무비용 진입) |
| 시각 이펙트 | 2초 빛나는 애니메이션 | 배치 "탁" + 다이브 연출 |

---

## Part 4: 핵심 설계 원칙 (D3에서 가져온 것)

1. **2단계 확인 (Place → Dive):** D3의 "아이템 넣기 → Transmute 버튼"과 동일. 실수 방지 + 배치 순간의 만족감 분리

2. **시각적 슬롯 존재:** 빈 앤빌 슬롯이 "여기에 무언가를 올려야 한다"는 어포던스를 제공. D3의 3x3 빈 박스와 동일한 심리

3. **자동 복귀 안전망:** UI를 닫아도 아이템이 사라지지 않음. D3의 "Accept를 누르지 않고 걸어가도 분실 없음"과 동일

4. **배치 애니메이션이 의식(ritual)을 만든다:** `UI_SacredPickup.md`의 "Sacred Pickup = 의식" 철학과 정확히 일치. "탁" 소리 + 불꽃 스파크 = 대장간에 무기를 올려놓는 물리적 행위

5. **Compare Mode와의 충돌 없음:** 인벤토리 모드에서만 C=Compare, 앤빌 모드에서는 C=Place. 기존 `UI_Inventory.md` §3.8의 "같은 UI, 다른 키 의미" 원칙 준수

---

## Sources

- [Maxroll.gg - Kanai's Cube Mechanics](https://maxroll.gg/d3/resources/kanais-cube)
- [Blizzard - Kanai's Cube Game Guide](https://eu.diablo3.blizzard.com/en-us/game/guide/items/kanais-cube)
- [Expert Game Reviews - Full Guide](https://expertgamereviews.com/diablo-3-kanais-cube-full-guide/)
- [Maxroll.gg D4 - Occultist](https://maxroll.gg/d4/resources/occultist-enchanting-legendary-aspects)
- `Documents/UI/UI_Inventory.md` — 인벤토리/앤빌 모드
- `Documents/UI/UI_Interaction_Patterns.md` — 4-Pattern 통합
- `Documents/UI/UI_SacredPickup.md` — Sacred Pickup UX
