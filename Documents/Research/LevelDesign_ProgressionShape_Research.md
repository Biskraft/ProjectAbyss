# 횡스크롤/메트로베니아 공간 진행 형태(Progression Shape) 패턴 리서치

> **작성일:** 2026-03-26
> **담당:** 레벨 디자이너 / 연구원
> **목적:** 횡스크롤/메트로베니아 게임의 공간 진행 형태를 패턴화하여, 절차적 생성의 Room Template 태그 시스템에 적용
> **참조 문서:**
> - `Documents/System/System_World_ProcGen.md`
> - `Documents/System/System_ItemWorld_Core.md`
> - `Documents/Research/ProceduralGeneration_World_Research.md`
> - `Reference/Spelunky-LevelGeneration-ReverseGDD.md`
> - `Reference/DeadCells-LevelGeneration-ReverseGDD.md`
> - `Reference/Metroidvania Game Design Deep Dive.md`

---

## 목차

1. [연구 목적과 범위](#1-연구-목적과-범위)
2. [패턴 분류 체계](#2-패턴-분류-체계)
3. [패턴 상세](#3-패턴-상세)
4. [패턴 태그 정의](#4-패턴-태그-정의)
5. [페이싱 곡선과 패턴 조합](#5-페이싱-곡선과-패턴-조합)
6. [아이템계 지층별 적용 매핑](#6-아이템계-지층별-적용-매핑)
7. [기존 문서 Gap 분석](#7-기존-문서-gap-분석)
8. [출처](#8-출처)

---

## 1. 연구 목적과 범위

### 1-1. 연구 질문

> "횡스크롤/메트로베니아에서 플레이어가 체험하는 **공간 진행의 형태(Shape)**는 몇 가지로 분류할 수 있으며, 각 형태가 플레이어의 페이싱(긴장/이완)에 어떤 영향을 미치는가?"

### 1-2. 범위

- **포함:** 공간의 물리적 형태, 이동 방향, 연결 구조, 페이싱 효과
- **제외:** 타일 아트 스타일, 적 배치 밸런스, 구체적 수치 파라미터

### 1-3. 분석 대상 게임

| 게임 | 분석 초점 |
|:-----|:---------|
| Super Metroid | 비선형 탐험, 능력 게이트, 시각적 전조 |
| Symphony of the Night | 성 구조, 네거티브 스페이스, 수직/수평 혼합 |
| Hollow Knight | 허브 앤 스포크, 벤치 리듬, Deepnest 압박 |
| Dead Cells | Concept Graph, 바이옴 분기, 선형-비선형 혼합 |
| Spelunky | 4×4 Grid, Critical Path, 일방통행 하강 |
| Celeste | 스위치백, 병렬 난이도 경로 |
| Ori and the Blind Forest | 루프백, 탈출 시퀀스, 개방 탐험 |
| Dark Souls | 루프백 설계의 교과서, 나선 하강 |

---

## 2. 패턴 분류 체계

16개 패턴을 **4개 카테고리**로 분류한다.

### 카테고리 요약

| 카테고리 | 핵심 질문 | 패턴 수 |
|:---------|:---------|:--------|
| **A. 방향(Direction)** | "어디로 이동하는가?" | 4개 |
| **B. 구조(Structure)** | "공간이 어떻게 연결되는가?" | 5개 |
| **C. 리듬(Rhythm)** | "긴장/이완이 어떻게 변화하는가?" | 4개 |
| **D. 발견(Discovery)** | "무엇을 찾게 되는가?" | 3개 |

### 전체 패턴 목록

| # | 태그 | 패턴명 (EN) | 패턴명 (KR) | 카테고리 |
|:--|:-----|:-----------|:-----------|:---------|
| 01 | `corridor` | Corridor | 수평 통로 | A. 방향 |
| 02 | `shaft` | Vertical Shaft | 수직 갱도 | A. 방향 |
| 03 | `switchback` | Switchback | Z자 경로 | A. 방향 |
| 04 | `spiral` | Spiral Descent | 나선 하강 | A. 방향 |
| 05 | `hub` | Hub-and-Spoke | 방사형 허브 | B. 구조 |
| 06 | `branch` | Branch-and-Bottleneck | 분기-병목 | B. 구조 |
| 07 | `parallel` | Parallel Paths | 병렬 경로 | B. 구조 |
| 08 | `loop` | Loopback | 순환 경로 | B. 구조 |
| 09 | `network` | Network | 그물망 | B. 구조 |
| 10 | `arena` | Arena | 전투 공터 | C. 리듬 |
| 11 | `funnel` | Funnel | 깔때기 | C. 리듬 |
| 12 | `safe` | Safe Zone | 안식처 | C. 리듬 |
| 13 | `oneway` | One-Way Gate | 일방통행 | C. 리듬 |
| 14 | `open` | Open Field | 개방 탐험 | D. 발견 |
| 15 | `foreshadow` | Foreshadowing | 전조 공간 | D. 발견 |
| 16 | `secret` | Hidden Branch | 숨겨진 분기 | D. 발견 |

---

## 3. 패턴 상세

### A. 방향 패턴 (Direction Patterns)

---

### A-01. `corridor` — 수평 통로 (Corridor)

**공간 형태:** 좌우로 길게 뻗은 직선 또는 완만한 곡선 통로. 천장-바닥 간격이 좁아 수직 이동이 제한된다.

**페이싱 효과:**
- 높은 작가적 통제(authorial control) — 플레이어가 목적지와 소요 시간을 예측 가능
- 경사(slope)나 낙차(drop)를 추가하면 가속감, 측면 알코브(alcove)를 추가하면 감속/탐색 유도
- 전투 시 회피 공간이 제한되어 긴장감 상승

**대표 사례:**
- SotN: 성 내부 긴 복도
- Dead Cells: Ramparts 바이옴 — "직선적이고 선형적"
- Super Metroid: 브린스타 수평 구간

**절차적 생성 매핑:**
- 가장 기본적인 Room Template. 좌우 출입구(Left-Right)만 보유
- Spelunky Room Type 1 (좌+우 출입구)에 해당
- Dead Cells Concept Graph의 선형 노드 체인

```
┌─────────────────────────────────────┐
│ ←  ■■■   ▒▒▒   ■■   ▒▒▒▒   ■■  → │
└─────────────────────────────────────┘
  입구                            출구
```

---

### A-02. `shaft` — 수직 갱도 (Vertical Shaft)

**공간 형태:** 위아래로 깊게 뻗은 수직 공간. 발판, 사다리, 벽 타기 요소가 배치된다. 상승형(Ascending)과 하강형(Descending)으로 구분.

**페이싱 효과:**
- 하강: 중력에 의한 자연스러운 가속감, 낙하 데미지 위험으로 긴장감 증가
- 상승: 정밀 플랫포밍 요구, 달성감 강화
- 수직 이동은 수평보다 체감 속도가 느려 "깊은 곳으로 침투한다"는 심리적 무게감 생성

**대표 사례:**
- SotN: Royal Chapel — 게임에서 가장 긴 연속 계단, 수평 전환 없이 상승
- Spelunky: 4×4 Grid의 Critical Path가 상단→하단 하강
- Super Metroid: Kraid 보스룸 — 2화면 수직 전투
- Hollow Knight: Crystal Peak 수직 갱도

**절차적 생성 매핑:**
- 상하 출입구(Top-Bottom)를 가진 Room Template
- Spelunky Room Type 2 (좌+우+하), Type 3 (좌+우+상)이 수직 연결 담당
- 아이템계에서 지층 간 이동 시 하강 샤프트를 게이트 구간으로 활용 가능

```
     ┌───┐
     │ ↓ │ 입구(상)
     │ ■ │
     │   ■│
     │■   │
     │  ■ │
     │ ↓ │ 출구(하)
     └───┘
```

---

### A-03. `switchback` — Z자 경로 (Switchback / Hairpin)

**공간 형태:** 경로가 지그재그 또는 Z자로 접혀 있는 구조. 수직 공간에서 좌→우→좌→우, 또는 수평 공간에서 상→하→상→하 반복. 같은 공간을 다른 높이에서 반복적으로 통과.

**페이싱 효과:**
- 실제 이동 거리 대비 공간 활용 효율이 높아 "좁은 공간에서 긴 여정" 구현
- 반복적 방향 전환이 탐색 리듬을 만들되 직선보다 불확실성이 높음
- Level Design Book: "switchback stairs는 느리고 탐험적, corner stairs는 직접적이고 효율적"

**대표 사례:**
- SotN: Royal Chapel 계단
- Celeste: B-side 스테이지의 극한 스위치백
- Spelunky: Critical Path의 Row 간 이동이 스위치백
- Mega Man 시리즈: 사다리 + 수평 구간 반복

**절차적 생성 매핑:**
- 4×4 Grid에서 Critical Path가 Row 내 좌→우 이동 후 하강, 다시 우→좌 이동 후 하강
- Room Template에서 출입구를 대각선 방향으로 배치하면 자연스럽게 생성

```
┌──────────┐
│→→→→→→→→↓ │
│          │
│ ↓←←←←←←←│
│          │
│→→→→→→→→↓ │
└──────────┘
```

---

### A-04. `spiral` — 나선 하강 (Spiral Descent / Corkscrew)

**공간 형태:** 중심축을 기준으로 나선형으로 하강(또는 상승)하는 구조. 같은 중심점 주위를 반복 통과하면서 깊이가 변화. 수직 샤프트와 수평 코리도의 반복적 결합.

**페이싱 효과:**
- "점점 깊이 들어간다"는 심리적 무게감
- 같은 중심축을 반복 통과하면서 랜드마크를 여러 각도에서 관찰
- 나선의 반지름이 줄어들면 Funnel 효과와 결합 가능

**대표 사례:**
- Dark Souls: Blighttown 하강 구간
- Hollow Knight: Deepnest 나선 구조
- SotN: 시계탑 내부

**절차적 생성 매핑:**
- 아이템계의 지층 구조와 자연스러운 결합
- 각 지층의 레이아웃을 이전 지층에서 약간 회전/오프셋하여 배치 → 거시적 나선 느낌
- Grid 기반 생성 시 각 층의 입구를 이전 층 출구의 대각선 방향에 배치

```
    ┌─────┐
    │ →→↓ │  1층
    │   ↓ │
    │ ←←↓ │
    └──┼──┘
    ┌──┼──┐
    │ →→↓ │  2층 (오프셋)
    │   ↓ │
    │ ←←↓ │
    └──┼──┘
       ↓ (점점 깊어짐)
```

---

### B. 구조 패턴 (Structure Patterns)

---

### B-05. `hub` — 방사형 허브 (Hub-and-Spoke)

**공간 형태:** 중앙의 넓은 허브 공간에서 여러 방향으로 가지(spoke)가 뻗어나가는 구조. 각 가지를 탐험한 후 허브로 귀환해야 다음 가지에 접근 가능.

**페이싱 효과:**
- 허브 귀환이 자연스러운 휴식 구간(Rest Beat)
- 탐색 가능한 가지를 시각적으로 한눈에 파악 → 플레이어 선택권 강화
- 매번 허브를 지나며 점진적 변화(NPC 등장, 환경 변화)를 인지

**대표 사례:**
- Hollow Knight: Crossroads — 다른 구역이 주변을 감싸는 구조
- Zelda: Breath of the Wild: 필드 중심 구조

**절차적 생성 매핑:**
- 아이템계의 각 지층 시작점을 미니 허브로 설계 가능
- 허브에서 2~3개의 분기 경로가 뻗어나가고, 각 끝에 보스/보상 배치
- Concept Graph에서 허브 노드를 중앙에 놓고 방사형 서브그래프 연결

```
         ┌─ Spoke A (전투)
         │
Hub ─────┼─ Spoke B (탐험)
         │
         └─ Spoke C (보상)
```

---

### B-06. `branch` — 분기-병목 (Branch-and-Bottleneck / String of Pearls)

**공간 형태:** 넓게 퍼지는 분기 구간과 좁게 수렴하는 병목 구간이 교대로 반복. 병목(Chokepoint)은 보스, 게이트, 또는 필수 이벤트가 위치하며 반드시 통과해야 한다.

**페이싱 효과:**
- 분기 → "탐험의 자유, 이완" / 병목 → "집중, 긴장 고조"의 주기적 리듬
- GMTK Boss Keys: "그래프가 수평으로 넓으면 동시에 탐색할 수 있는 잠긴 문이 많고, 수직으로 좁으면 선형적"

**대표 사례:**
- Super Metroid: 능력 획득 지점이 병목
- Metroid Dread: EMMI Zone이 병목
- SotN: 시계탑 등 필수 경유 구간
- Dead Cells: 바이옴 출구가 병목

**절차적 생성 매핑:**
- Concept Graph에서 분기 노드(여러 자식)과 합류 노드(여러 부모)를 교대 배치
- Spelunky의 Critical Path 자체가 이 패턴 — Row 내 좌우 이동(분기) 후 강제 하강(병목)

```
         ┌─ Room ─┐
─ Room ──┤        ├── ★ Bottleneck ──┬─ Room ─┐
         └─ Room ─┘                  │        ├── ★ ...
                                     └─ Room ─┘
```

---

### B-07. `parallel` — 병렬 경로 (Parallel Paths)

**공간 형태:** 같은 방향으로 나란히 달리는 2~3개의 경로. 상층/하층 또는 좌측/우측으로 분리. 중간중간 연결 지점 존재.

**페이싱 효과:**
- 플레이어에게 선택권 부여 — "안전하지만 느린 길 vs 위험하지만 빠른 길"
- 리플레이 가치 증가
- 능력 게이트를 레인별로 다르게 적용하면 백트래킹 시 새로운 경로 발견 가능

**대표 사례:**
- Dead Cells: 같은 진행도에서 2~3개 바이옴 선택
- Celeste: 메인 경로 + 하드 경로 병렬
- Spelunky 2: Front Layer + Back Layer 물리적 병렬

**절차적 생성 매핑:**
- Concept Graph에서 같은 깊이(depth)의 노드를 2~3개 병렬 배치
- Spelunky 2의 Dual Layer가 가장 직접적인 구현

```
┌──── 상층 경로 (쉬움) ────┐
│  ↕  연결  ↕  연결  ↕     │
└──── 하층 경로 (어려움) ───┘
```

---

### B-08. `loop` — 순환 경로 (Loopback)

**공간 형태:** 선형 진행 후 이전 방문 지점으로 돌아오는 구조. 지름길 문, 엘리베이터, 벽 파괴로 연결이 개방. "돌아왔다"는 인식이 핵심.

**페이싱 효과:**
- 백트래킹의 고통을 제거하면서 진행감 유지
- 루프 완성 시 "아, 여기였구나!"라는 인지적 만족감(Cognitive Closure)
- 월드가 유기적으로 연결되어 있다는 느낌 강화

**대표 사례:**
- Dark Souls: 모든 구역의 핵심 설계 원칙
- Hollow Knight: Crossroads 중심 순환
- SotN: 텔레포트 룸 + 지름길 문
- Ori: 능력 획득 후 귀환 루프

**절차적 생성 매핑:**
- 구현 난이도가 가장 높은 패턴
- Dead Cells: Concept Graph에서 분기 후 합류하는 노드 구조로 의사-루프 생성
- "경로 A의 끝 → 경로 B의 시작 근처로 연결"하는 규칙 필요

```
A ──→ B ──→ C ──→ D
              ↓ (지름길 열림)
A ←───────── C
```

---

### B-09. `network` — 그물망 (Network / Interconnected Web)

**공간 형태:** 여러 방이 다방향으로 연결되어 그물처럼 엮인 구조. 복수의 유효한 경로가 존재. 각 방에서 2~4개 방향 이동 가능.

**페이싱 효과:**
- 최대 자유도와 비선형성
- 플레이어마다 고유한 경험 생성
- 과도한 자유도는 방향 상실(disorientation) 위험 → 랜드마크 필수

**대표 사례:**
- Hollow Knight: 전체 월드맵
- SotN: 성 전체
- Super Metroid: 제티아 → 브린스타 → 노르페어 → 마리디아 간 다방향 연결

**절차적 생성 매핑:**
- ManiaMap 같은 라이브러리가 그래프 기반 네트워크 레이아웃 생성 지원
- 아이템계보다는 월드 맵 생성에 적합

```
A ── B ── C
│    │    │
D ── E ── F
│    │    │
G ── H ── I
```

---

### C. 리듬 패턴 (Rhythm Patterns)

---

### C-10. `arena` — 전투 공터 (Arena / Combat Bowl)

**공간 형태:** 넓고 개방된 전투 공간. 중앙에 엄폐물(기둥, 플랫폼) 배치. 보스룸은 진입 후 문이 잠기는 봉쇄형 아레나(Sealed Arena).

**페이싱 효과:**
- 긴장 곡선의 정점(Peak Intensity)
- 제한된 공간에서 전투 집중 → 페이싱 곡선의 피크
- 보스 아레나 전에 Safe Zone 배치 → "긴장-이완-폭발" 리듬

**대표 사례:**
- Hollow Knight: 모든 보스룸 — 봉쇄형 아레나
- Dead Cells: 엘리트/보스 전투 룸
- Ori: 탈출 시퀀스 직전 넓은 전투 공간

**절차적 생성 매핑:**
- 일반 Room보다 2~3배 큰 특수 Template
- Dead Cells Concept Graph에서 "보스 노드" 또는 "엘리트 노드"로 지정
- 아이템계에서 각 지층의 보스 방(아이템 장군/왕/신)을 아레나 Template으로 고정 배치

```
┌─────────────────┐
│                 │
│    ■       ■    │  ← 엄폐물
│        ★        │  ← 보스
│    ■       ■    │
│                 │
└────── ↑ ────────┘
       입구
```

---

### C-11. `funnel` — 깔때기 (Funnel / Narrowing Path)

**공간 형태:** 넓은 입구에서 시작하여 점점 좁아지는 공간. 또는 여러 경로가 하나의 좁은 출구로 수렴.

**페이싱 효과:**
- 점진적 긴장 고조
- 넓은 공간의 안도감에서 좁은 공간의 압박감으로 자연스러운 전환
- 보스룸 직전의 "예비 긴장(Pre-tension)" 구간으로 효과적

**대표 사례:**
- Dead Cells: Sewers — 좁은 통로로 기동성 제한
- Super Metroid: Tourian 진입 구간 — 점점 좁아지는 통로
- Hollow Knight: Deepnest — 좁고 어두운 통로 압박

**절차적 생성 매핑:**
- Room Template의 크기를 단계적으로 축소
- 지층이 깊어질수록 방 크기를 줄이거나 천장 높이를 낮추는 파라미터 적용
- Concept Graph에서 분기 수를 점진적 감소

```
┌──────────────┐
│              │  넓음
│    ┌────┐    │
│    │    │    │  중간
│    │┌──┐│    │
│    ││  ││    │  좁음
│    │└──┘│    │
│    └────┘    │
└──────────────┘
```

---

### C-12. `safe` — 안식처 (Safe Zone / Rest Point)

**공간 형태:** 적이 출현하지 않는 작은 방. 세이브 포인트, 상점, 회복 시설 배치. 시각적으로 명확히 구분(밝은 조명, 따뜻한 색감, 특정 배경음악).

**페이싱 효과:**
- 긴장 곡선의 "골짜기(Trough)"
- 지속적 고강도 전투 후 "이완과 대비(Contrast)" 제공
- "강도 5에서 11로 가는 것은 큰 점프지만, 10에서 11로 가는 것은 체감이 없다" — 쉼이 있어야 피크가 피크로 느껴짐

**대표 사례:**
- Hollow Knight: 벤치
- Dark Souls: 모닥불
- SotN: 세이브/텔레포트 룸
- Dead Cells: 바이옴 전이 구간
- Metroid: 세이브 스테이션

**절차적 생성 매핑:**
- 전투 노드 N개마다 1개의 Safe Zone 노드 삽입 규칙
- Dead Cells: 바이옴 전환 구간이 자동 Safe Zone
- 아이템계: 5~10층마다 "아이템 신사(Item Shrine)" 같은 안식처 절차적 배치

```
┌───────┐
│ 🔥    │  세이브 포인트
│  NPC  │  상점/회복
│       │  적 출현 없음
└───────┘
```

---

### C-13. `oneway` — 일방통행 (One-Way Gate / Point of No Return)

**공간 형태:** 낙하, 부서지는 바닥, 뒤에서 잠기는 문, 물이 차오르는 통로 등으로 구현되는 되돌아갈 수 없는 지점.

**페이싱 효과:**
- 강렬한 커밋(Commitment) 감각
- "돌아갈 수 없다"는 인식이 긴장감과 탐험적 결단을 동시에 유발
- 로그라이크에서 층 이동의 기본 구조
- 메트로베니아에서는 능력 획득 후 양방향이 되는 "위장된 일방통행(Disguised One-Way)" 변형 존재

**대표 사례:**
- Spelunky: 층 이동 — 항상 상→하 일방통행
- Dark Souls: 떨어지면 돌아갈 수 없는 지점
- Dead Cells: 바이옴 전환 — 복귀 불가
- 디스가이아 아이템계: 층 진행 후 복귀 불가, 탈출 아이템만 가능

**절차적 생성 매핑:**
- 아이템계의 핵심 구조
- 각 지층의 출구를 일방통행으로 설정 → "더 깊이 내려갈 것인가, 지금 빠져나갈 것인가"의 리스크-리워드 결정

```
── Room ──→ ★ ONE-WAY ──→ Room ──
            (복귀 불가)
```

---

### D. 발견 패턴 (Discovery Patterns)

---

### D-14. `open` — 개방 탐험 공간 (Open Field / Exploration Chamber)

**공간 형태:** 상하좌우로 넓게 펼쳐진 대규모 공간. 플랫폼, 지형 변화가 곳곳에 흩어져 자유 탐색 유도. 전투보다 발견(Discovery)이 주 목적.

**페이싱 효과:**
- "Discovery Beat" — 플레이어가 선택지를 관찰하고, 계획을 세우고, 방향을 정하는 구간
- 전투 후 이완 구간이자 다음 도전의 준비 시간
- SotN에서 "맵의 거의 절반이 여백(negative space)"이라는 분석과 일맥상통

**대표 사례:**
- SotN: 넓은 네거티브 스페이스
- Hollow Knight: Forgotten Crossroads 중앙 공간
- Ori: Ginso Tree 외부 개방 구간

**절차적 생성 매핑:**
- 표준 Room보다 2~4배 큰 특수 Template
- 내부에 여러 Chunk를 산발적으로 배치하여 미니 랜드마크 생성
- 아이템계: "보물 방" 또는 "이노센트 서식지"로 활용

```
┌─────────────────────┐
│     ■      ▒▒       │
│  ▒▒     ■     ■     │
│       ★         ▒▒  │  ← 보물/이노센트
│  ■        ▒▒        │
│     ▒▒         ■    │
└─────────────────────┘
```

---

### D-15. `foreshadow` — 전조 공간 (Foreshadowing Chamber)

**공간 형태:** 현재 능력으로는 도달 불가하지만 시각적으로 보이는 공간. 높은 절벽 위의 아이템, 특정 색의 잠긴 문 너머 통로, 깨뜨릴 수 없는 벽 뒤의 빛.

**페이싱 효과:**
- "미해결 과제의 각인(Open Loop)" — 해당 능력 획득 후 반드시 복귀하고 싶은 욕구
- "지금은 갈 수 없지만 중요해 보이는 장소는 세계를 실제보다 더 거대하고 신비롭게 느끼게 한다"
- Super Metroid: "다른 유색 타일로 탐험을 유도"

**대표 사례:**
- 모든 메트로베니아의 핵심 패턴
- Super Metroid: 미사일 문, 파워봄 벽
- Hollow Knight: 그림자 망토 필요 구간을 미리 노출
- SotN: 안개 변신 필요 통로를 미리 보여줌

**절차적 생성 매핑:**
- Room Template에 "게이트 슬롯"을 미리 정의
- 현재 지층의 능력 요구 수준보다 한 단계 높은 게이트를 일정 확률로 배치
- 재방문 유도(월드 맵) 또는 재귀적 진입 유도(아이템계)

```
┌──────────────┐
│  [보상] ← 능력 게이트 (이단점프 필요)
│  ────────    │
│              │
│  → 현재 경로 │
└──────────────┘
  "보이지만 갈 수 없다"
```

---

### D-16. `secret` — 숨겨진 분기 (Hidden Branch / Secret Passage)

**공간 형태:** 메인 경로에서 시각적으로 숨겨진 분기점. 부서지는 벽, 낙하 지점 아래의 숨겨진 방, 특정 아이템으로만 보이는 통로.

**페이싱 효과:**
- "발견의 쾌감(Eureka Moment)" — 관찰력과 실험을 보상
- BotW: "특이하게 보이는 것 = 무언가 있다"는 시각 문법 학습
- "코인 트레일 = 숨겨진 경로" 같은 시각 언어 동반 시 효과 극대화

**대표 사례:**
- Super Metroid: 파워봄 벽 뒤 숨겨진 아이템
- SotN: 눈에 보이지 않는 바닥 아래 방
- Spelunky 2: Back Layer 숨겨진 경로
- Hollow Knight: Deepnest 숨겨진 구석

**절차적 생성 매핑:**
- Spelunky 비경로(Type 0) Room 중 일부를 "비밀 방"으로 지정
- Room Template에 파괴 가능한 벽 타일을 포함, 뒤에 보상 배치
- 아이템계: 일정 확률(10~15%)로 숨겨진 방 추가 생성

```
┌──────────┐
│ 메인 경로 │
│     [벽]──┤← 파괴 가능
│          ┌┤
│          │★│ 비밀 방 (보상)
│          └┘
└──────────┘
```

---

## 4. 패턴 태그 정의

절차적 생성의 Room Template에 부여하는 태그 체계.

### 4-1. 태그 스키마

```typescript
/** Room Template에 부여하는 공간 진행 패턴 태그 */
type ProgressionShapeTag =
  // A. Direction (방향)
  | 'corridor'    // 수평 통로 — 좌우 직선/곡선 진행
  | 'shaft'       // 수직 갱도 — 상하 수직 진행 (ascending/descending)
  | 'switchback'  // Z자 경로 — 지그재그 반복 방향 전환
  | 'spiral'      // 나선 하강 — 중심축 주위 나선형 진행

  // B. Structure (구조)
  | 'hub'         // 방사형 허브 — 중앙에서 여러 가지가 뻗어나감
  | 'branch'      // 분기-병목 — 넓게 퍼졌다 좁게 수렴 반복
  | 'parallel'    // 병렬 경로 — 같은 방향 2~3개 나란한 경로
  | 'loop'        // 순환 경로 — 진행 후 이전 지점으로 돌아옴
  | 'network'     // 그물망 — 다방향 연결, 복수 유효 경로

  // C. Rhythm (리듬)
  | 'arena'       // 전투 공터 — 넓은 봉쇄형 전투 공간
  | 'funnel'      // 깔때기 — 넓은→좁은 점진적 수렴
  | 'safe'        // 안식처 — 적 없는 휴식/세이브 공간
  | 'oneway'      // 일방통행 — 되돌아갈 수 없는 단방향 이동

  // D. Discovery (발견)
  | 'open'        // 개방 탐험 — 넓은 자유 탐색 공간
  | 'foreshadow'  // 전조 공간 — 보이지만 갈 수 없는 곳
  | 'secret';     // 숨겨진 분기 — 시각적으로 숨겨진 비밀 경로
```

### 4-2. 태그 속성

각 태그에는 다음 속성이 동반된다:

| 속성 | 타입 | 설명 |
|:-----|:-----|:-----|
| `intensity` | `0.0 ~ 1.0` | 긴장도. 0=완전 이완, 1=최대 긴장 |
| `direction` | `horizontal \| vertical \| both` | 주요 이동 방향 |
| `size` | `small \| medium \| large` | 공간 규모 (Room Template 크기) |
| `exits` | `Exit[]` | 출입구 방향과 수 |

### 4-3. 태그별 기본 속성값

| 태그 | intensity | direction | size | 출입구 |
|:-----|:----------|:----------|:-----|:-------|
| `corridor` | 0.3 | horizontal | medium | L+R |
| `shaft` | 0.5 | vertical | medium | T+B |
| `switchback` | 0.4 | both | medium | varies |
| `spiral` | 0.6 | both | large | T+B |
| `hub` | 0.2 | both | large | 3~4방향 |
| `branch` | 0.4 | horizontal | medium | L+R+(분기) |
| `parallel` | 0.3 | horizontal | large | L+R(×2~3) |
| `loop` | 0.3 | both | large | 2+(지름길) |
| `network` | 0.3 | both | large | 3~4방향 |
| `arena` | 0.9 | both | large | 1(봉쇄) |
| `funnel` | 0.7 | horizontal | medium→small | L+R |
| `safe` | 0.0 | both | small | 1~2 |
| `oneway` | 0.8 | vertical | small | 위→아래(단방향) |
| `open` | 0.2 | both | large | 2~4 |
| `foreshadow` | 0.3 | both | medium | 1+(게이트) |
| `secret` | 0.1 | both | small | 1(숨김) |

### 4-4. 복합 태그 규칙

하나의 Room Template은 **최대 2개의 태그**를 가질 수 있다.

허용되는 복합 태그 조합:

| 주 태그(Primary) | 허용 부 태그(Secondary) | 예시 |
|:----------------|:---------------------|:-----|
| `corridor` | `foreshadow`, `secret` | 수평 통로 + 중간에 보이지만 갈 수 없는 구간 |
| `shaft` | `oneway`, `foreshadow` | 수직 하강 + 일방통행 |
| `arena` | `oneway` | 봉쇄형 보스 아레나 |
| `hub` | `safe` | 허브 + 안식처 기능 |
| `corridor` | `funnel` | 점점 좁아지는 통로 |
| `open` | `secret` | 넓은 탐험 공간 + 숨겨진 방 |
| `branch` | `parallel` | 분기점에서 병렬 경로 제공 |

---

## 5. 페이싱 곡선과 패턴 조합

### 5-1. 강도 곡선 매핑

```
Intensity
1.0 │                    ★ arena
    │                  ╱    ╲
0.8 │         oneway ╱      ╲
    │              ╱          ╲
0.6 │    funnel  ╱     spiral  ╲
    │          ╱                 ╲
0.4 │ branch ╱    switchback      ╲ corridor
    │      ╱                        ╲
0.2 │ hub ╱   open                    ╲ hub
    │   ╱                               ╲
0.0 │ safe                               safe
    └──────────────────────────────────────→ 진행
      도입    탐색     고조    정점   해소
```

### 5-2. 시퀀싱 규칙

절차적 생성 시 다음 규칙으로 패턴을 시퀀싱한다:

**규칙 1: 안식처 삽입 간격**
- 전투 Room 3~5개마다 `safe` 1개 삽입
- `arena` 직전에는 반드시 `safe` 배치

**규칙 2: 강도 점프 제한**
- 연속된 Room 간 intensity 차이는 최대 0.4
- 예: `safe`(0.0) → `arena`(0.9) 직접 연결 금지. `safe` → `corridor` → `funnel` → `arena` 필요

**규칙 3: 일방통행 후 보상**
- `oneway` 직후에는 `safe` 또는 보상이 있는 `open` 배치
- 리스크를 감수한 결정 직후 즉각적 안도감 제공

**규칙 4: 전조 공간 비율**
- 전체 Room의 10~20%에 `foreshadow` 태그 부여
- 메트로베니아 월드에서 비율 높음, 아이템계에서 비율 낮음

**규칙 5: 비밀 방 확률**
- 전체 Room의 10~15%에 `secret` 태그 부여
- 레어리티가 높을수록 비밀 방 확률 증가

---

## 6. 아이템계 지층별 적용 매핑

### 6-1. 지층별 패턴 조합

| 지층 | Grid | 주 패턴 | 부 패턴 | 설계 의도 |
|:-----|:-----|:--------|:--------|:---------|
| 1층 | 4×4 | `corridor`, `safe` | `foreshadow` | 도입. 단순 수평 진행, 학습, 다음 지층 전조 |
| 2층 | 4×4 | `branch`, `shaft` | `secret` | 확장. 분기 탐색 시작, 수직 요소, 숨겨진 보상 |
| 3층 | 4×4 | `parallel`, `funnel`, `arena` | `open` | 심화. 병렬 선택, 퍼널 긴장, 보스 전투 정점 |
| 4층 (심연) | 4×4 | `spiral`, `network`, `oneway` | — | 극한. 나선 압박, 복잡도 극대화, 리스크 |

### 6-2. 레어리티별 차이

| 레어리티 | 지층 수 | `secret` 확률 | `foreshadow` 확률 | 최대 intensity |
|:---------|:--------|:-------------|:-----------------|:--------------|
| Normal | 2 | 5% | 5% | 0.7 |
| Magic | 3 | 8% | 10% | 0.8 |
| Rare | 3 | 10% | 15% | 0.9 |
| Legendary | 4 | 13% | 15% | 0.95 |
| Ancient | 4+심연 | 15% | 20% | 1.0 |

---

## 7. 기존 문서 Gap 분석

### 이미 문서화된 내용

| 항목 | 문서 | 상태 |
|:-----|:-----|:-----|
| Room Type 분류 (출입구 방향 기준 4종) | `System_World_ProcGen.md` | ✅ |
| Critical Path 생성 알고리즘 | `System_World_ProcGen.md` | ✅ |
| 지층별 Grid 크기 진행 | `System_ItemWorld_Core.md` | ✅ |
| 매크로+마이크로 이중 구조 | `System_World_ProcGen.md` | ✅ |

### 이 문서로 채워진 Gap

| Gap | 해결 방법 | 섹션 |
|:----|:---------|:-----|
| Room 내부의 공간 패턴 분류 체계 부재 | 16종 패턴 + 4카테고리 분류 | §2, §3 |
| 페이싱 곡선의 절차적 보장 규칙 없음 | intensity 속성 + 시퀀싱 규칙 5종 | §4-3, §5-2 |
| 패턴의 태그화 / 코드 연동 체계 없음 | ProgressionShapeTag 타입 + 속성 스키마 | §4 |

### 아직 남은 Gap (후속 작업 필요)

| Gap | 필요 문서/작업 |
|:----|:-------------|
| 비선형 분기의 절차적 생성 | 능력 게이트에 의한 분기/재방문 경로 생성 로직 |
| 게이트 배치 알고리즘 | 어디에 어떤 게이트를 놓을지의 규칙 |
| Chunk 설계 가이드라인 | 패턴별 Chunk 변형 규칙, 바이옴별 호환성 |
| 난이도 곡선의 공간적 표현 | CP 초반=쉬운 Chunk, 후반=어려운 Chunk 규칙 |

---

## 8. 출처

- The Level Design Book — Typology: https://book.leveldesignbook.com/process/layout/typology
- The Level Design Book — Flow: https://book.leveldesignbook.com/process/layout/flow
- The Level Design Book — Pacing: https://book.leveldesignbook.com/process/preproduction/pacing
- Video Game Layouts (Medium): https://medium.com/understanding-games/layouts-913b8384c257
- Economy and Thematic Structure: SotN Level Design (Gamedeveloper)
- Looking back at the level design triumphs of Super Metroid (Gamedeveloper)
- How Super Metroid Changed Level Design (Medium)
- The Foundation of Metroidvania Design (Gamedeveloper)
- Making Sense of Metroidvania Game Design (Gamedeveloper)
- Level Design Patterns in 2D Games (Gamedeveloper)
- The Level Design of Dead Cells (Deepnight)
- Building the Level Design of a procedurally generated Metroidvania (Gamedeveloper)
- How the Hollow Knight devs mapped out their Metroidvania (Gamedeveloper)
- Metroidvania Generation (Aran P. Ink)
- GMTK Boss Keys 시리즈
- GDC: Designing Celeste Level Design Workshop
- GDC: Gameplay Fundamentals Revisited — Harnessed Pacing & Intensity
- Lock and Key Dungeons (BorisTheBrave)
