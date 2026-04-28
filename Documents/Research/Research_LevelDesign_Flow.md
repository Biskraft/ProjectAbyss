# 메트로베니아 플로우 & 진행 설계 리서치

> **작성일:** 2026-04-07
> **담당:** Game Designer
> **목적:** ECHORIS 30분 버티컬 슬라이스 및 전체 게임의 플로우·진행 구조 설계를 위한 종합 레퍼런스
> **참조 게임:** Castlevania: SotN / Hollow Knight / Super Metroid / Metroid Dread / Ori WotW / Dark Souls
> **연관 문서:**
> - `Documents/Research/Metroidvania_MapStructure_GateDesign.md`
> - `Documents/Research/LevelDesign_ProgressionShape_Research.md`
> - `Reference/Metroidvania Game Design Deep Dive.md`
> - `Documents/System/System_World_StatGating.md`

---

## 목차

1. [능력 획득 순서 설계](#1-능력-획득-순서-설계)
2. [난이도 곡선 구조](#2-난이도-곡선-구조)
3. [UI 없는 플레이어 유도](#3-ui-없는-플레이어-유도)
4. [감정 아크 설계](#4-감정-아크-설계)
5. [세션 설계 — 멈추는 지점과 다시 켜는 이유](#5-세션-설계--멈추는-지점과-다시-켜는-이유)
6. [맵 완성도 심리학](#6-맵-완성도-심리학)
7. [ECHORIS 적용 시사점](#7-project-abyss-적용-시사점)
8. [출처](#8-출처)

---

## 1. 능력 획득 순서 설계

### 1-1. 이론 배경: 연쇄 해금(Cascading Unlock)

메트로베니아의 핵심 설계 원칙은 각 능력이 **단독으로 하나의 길을 열지 않고, 다음 능력으로 가는 경로를 열어** 연쇄적인 발견을 만든다는 것이다. MDA 프레임워크 관점에서 이 메커닉이 유발하는 Aesthetic은 **Discovery(발견)** + **Competence(유능감)** 의 조합이다.

SDT(자기결정이론) 관점에서 각 능력 획득은 세 가지 욕구를 동시에 충족한다:
- **Competence:** "나는 더 강해졌다"
- **Autonomy:** "이제 내가 선택할 수 있는 경로가 늘었다"
- **Relatedness:** "이 세계와의 관계가 새롭게 재정의되었다"

### 1-2. 게임별 획득 순서 패턴

#### Castlevania: Symphony of the Night

SotN의 능력 획득은 두 축으로 분리된다. **수직 이동 능력**(Leap Stone → Bat Form → Gravity Boots)과 **수평/관통 능력**(Jewel of Open → Mist Form)이다.

| 순서 | 능력 | 해금되는 공간 | 세계 재맥락화 |
|:-----|:-----|:------------|:------------|
| 1 | Soul of Bat / Jewel of Open | 초반 자유 탐험 | 잠긴 문들이 무의미해짐 |
| 2 | Leap Stone (이단 점프) | 수직 상부 구역 전체 | 성의 상단 절반이 열림 |
| 3 | Gravity Boots | Clock Tower, 고공 구역 | 천장 킥으로 새 동선 |
| 4 | Mist Form | 좁은 통로, 일부 함정 | 피해를 무시하는 탈출로 |
| 5 | Wolf/Bat 변신 속도 업 | 역전 성 대비 | 백트래킹 비용 대폭 감소 |

핵심 통찰: SotN은 능력 획득 이후 **반드시 이미 지나온 공간으로 돌아가는 경험**을 설계한다. "아, 저기서 막혔던 게 이제 열리는구나"의 회상-재발견 루프가 맵 전체를 살아있게 만든다.

#### Hollow Knight

할로우 나이트의 능력 순서는 강제 선형이 아닌 **추천 경로**(suggested path)로 설계되었다.

| 핵심 능력 | 해금 위치 | 효과 |
|:---------|:---------|:-----|
| Mothwing Cloak (대시) | Forgotten Crossroads | 수평 이동 확장, 가속 탈출 |
| Mantis Claw (벽 점프) | Mantis Village | 수직 상승, 폴링 안전망 |
| Monarch Wings (이단 점프) | Ancient Basin | 공중 제어, 전투 확장 |
| Crystal Heart (대쉬 지속) | Crystal Peak | 수평 고속 돌파 |
| Shade Cloak (무적 대시) | Abyss | 적 공격 관통 |

주목할 점은 Crystal Heart와 Monarch Wings가 둘 다 "이단 점프" 계열이지만 용도가 전혀 다르다는 것이다. Wings는 **공중 체공**을, Crystal Heart는 **수평 가속**을 담당한다. 이는 단일 축(수직/수평)의 능력이라도 세분화된 페르소나를 갖게 설계된 사례다.

할로우 나이트 개발팀(Team Cherry)은 "장르가 디자인 결정을 지배하지 않도록" 의도적으로 메트로베니아 공식을 탈피했다. 결과적으로 능력 순서의 비선형성이 극대화되었고, 플레이어마다 고유한 진행 경험이 만들어졌다.

#### Super Metroid

슈퍼 메트로이드는 세 장르 중 가장 유기적인 연쇄 해금 구조를 가진다. 메트로이드 시리즈에서 무기는 **이동 도구이자 전투 도구**의 이중 역할을 한다(Green Door = Super Missile, Ice Beam = 적을 발판으로).

```
Morph Ball (구슬 변신)
    ↓
Bomb (구슬 폭탄) → 숨겨진 통로 전체 해금
    ↓
High Jump / Space Jump → 수직 상승
    ↓
Grappling Beam → 수평 고속 이동
    ↓
Gravity Suit → 수중 지역 전체 해금
    ↓
Speed Booster → 강화 공격, 장벽 돌파
```

슈퍼 메트로이드의 레벨 디자인은 플레이어가 "해방된 환경에서 자유롭게 탐험하는 것처럼" 느끼면서도 **거의 선형적인 경로**를 따라가도록 유도한다. 이는 환경 단서와 신중한 아이템 배치로 달성된다.

#### Metroid Dread

Metroid Dread는 "기어 게이트 빵 부스러기 추적(Gear-gated Breadcrumb Trail)" 원칙을 가장 명확하게 구현한 사례다.

> 플레이어는 자신이 무엇을 해야 하는지 모를 때 절대 없다. 필요한 것이 무엇인지를 보여주는 장벽이 항상 새 능력 직전에 배치된다.

핵심 설계 규칙: **장벽 → 능력 → 즉각 검증**의 3단계 루프. 새 능력을 얻은 직후 방금 지나온 장벽 직전의 공간에서 연습하고 검증할 수 있는 기회가 즉시 주어진다.

EMMI 존은 메트로이드 시리즈 고유의 난이도 탈출 메커닉으로, 능력 획득과 분리된 **서스펜스 루프**를 세션 내에 삽입한다. 이는 Csikszentmihalyi 플로우 모델에서 불안(anxiety) 영역을 잠시 터치한 뒤 새 능력으로 빠져나오는 설계다.

### 1-3. 2~3시간 경험에 최적화된 능력 수

| 게임 | 핵심 능력 수 | 총 플레이타임 | 시간당 능력 |
|:----|:-----------:|:----------:|:---------:|
| Super Metroid | 8~10개 | 3~5시간 | 2~3개/시간 |
| Hollow Knight (핵심만) | 5~6개 | 25~40시간 | 0.15개/시간 |
| Metroid Dread | 10~12개 | 8~12시간 | ~1개/시간 |
| SotN | 6~8개 | 10~15시간 | ~0.5개/시간 |

**30분 버티컬 슬라이스 적용:**
- 적정 능력 수: **2~3개** (기동성 1개 + 전투 1개 + 선택형 1개)
- 각 능력은 10분 이내에 명확히 활용 가능해야 함
- 마지막 능력은 슬라이스 종료 직전에 주어져 "다음에 무엇을 할 수 있을지"의 기대감을 남김

---

## 2. 난이도 곡선 구조

### 2-1. 톱니파(Sawtooth) 곡선 — 메트로베니아의 표준 패턴

메트로베니아의 난이도 곡선은 Csikszentmihalyi의 플로우 채널을 유지하기 위해 **톱니파 패턴**을 따른다.

```
난이도
  ▲
  │         ╱|         ╱|         ╱|
  │        ╱ |        ╱ |        ╱ |
  │       ╱  |       ╱  |       ╱  |
  │      ╱   |\_____╱   |\_____╱   |
  │     ╱
  │    ╱    탐험    보스   탐험  보스
  └──────────────────────────────→ 시간
       구역 A         구역 B
```

- **상승 구간:** 신규 구역 탐험, 새 적 패턴 학습
- **정점:** 보스 전투 (해당 구역 능력의 집약 테스트)
- **급락:** 보스 격파 후 新 능력 획득, 세이브, 탐험 재개
- **재설정 기저:** 다음 구역의 시작 기저는 이전 구역 기저보다 약간 높음

### 2-2. 게임별 구역 난이도 진행

#### Dark Souls — 루프백 나선 하강

Dark Souls는 메트로베니아는 아니지만 연결 레벨 디자인의 교과서다. 핵심 원칙은 **Firelink Shrine을 중심으로 한 매크로 루프**다.

```
Firelink Shrine (허브, 안전지대)
    ├── Undead Burg → Undead Parish → (단축 사다리) → Firelink
    ├── Lower Undead Burg → Depths → Blighttown → (엘리베이터) → Firelink
    └── Sen's Fortress → Anor Londo → ...
```

Blighttown으로 내려갈수록 **허브인 Firelink Shrine이 시야에서 사라지며** 긴장감이 물리적으로 구현된다. 이 설계는 공간적 불안(spatial anxiety)을 난이도 곡선의 도구로 사용한 사례다.

단축(Shortcut)을 여는 순간의 "아하" 감정은 Dark Souls의 핵심 감정 피크다. 언데드 교구(Undead Parish)에서 사다리를 차 내리는 순간, 10분짜리 경로가 10초로 줄어드는 경험은 **능력 획득 없이 맵 이해만으로 달성하는 Competence**를 시연한다.

#### Hollow Knight — 의도적 "길 잃음" 설계

Hollow Knight는 "길 잃음"을 부정적 경험이 아닌 **설계된 탐험 상태**로 다룬다.

- **Fungal Wastes → Deepnest 전환:** 배경음악이 불협화음으로 변하고 시야가 좁아지며 극적인 압박감을 줌
- **Deepnest → Ancient Basin:** 어둠의 절정 이후 조용한 황폐함으로 전환되는 감정 대비
- **City of Tears:** 빗소리가 지속되는 배경음악이 세계의 슬픔을 물리적 공간에 새겨 넣음

각 구역은 단순한 난이도 등급이 아닌 **감정적 테마**를 가진다. 이것이 "어렵다"는 느낌을 "나는 어두운 세계를 탐험하고 있다"는 느낌으로 재프레이밍한다.

#### 난이도 밸리(Difficulty Valley) — 의도적 이완 구간

최고 난이도 구간 이후에는 반드시 **이완 공간(Safe Zone)**이 배치된다. 이 구간의 기능:

1. **심리적 보상:** 어려운 구간을 극복한 성취감을 되새기는 시간
2. **정보 소화:** 새로 획득한 능력/지식을 통합하는 시간
3. **다음 긴장을 위한 준비:** 플로우 채널 기저를 다음 스파이크를 위해 재조정

Hollow Knight의 Bench는 이완 공간의 기능을 세이브 포인트와 결합한 모범 사례다.

### 2-3. 시퀀스 브레이크(Sequence Break) 대응

플레이어가 의도된 순서를 건너뛸 때의 대응 전략:

| 전략 | 사례 | 장단점 |
|:-----|:-----|:------|
| **허용 + 보상** | Hollow Knight (거의 모든 경로 허용) | 탐험자 플레이어 만족, 밸런스 리스크 존재 |
| **묵시적 제한** | Super Metroid (특정 능력 없으면 물리적 불가) | 밸런스 안정, 탐험 자유도 일부 제한 |
| **스케일링 난이도** | Metroid Dread (후반 적은 초반 진입 시 압도적 강함) | 자연스럽게 권장 경로 유도 |
| **명시적 안내** | SotN (일부 구역 진입 불가 + 힌트 NPC) | 명확하지만 몰입 감소 가능 |

ECHORIS의 **스탯 게이트 + 능력 게이트 이중 레이어**는 "묵시적 제한 + 스케일링 난이도"의 하이브리드로, 스탯 기반 소프트 블록(STR 부족시 피해 대폭 증가)과 능력 기반 하드 블록(이단점프 없으면 물리적 진입 불가)을 동시에 사용한다.

---

## 3. UI 없는 플레이어 유도

### 3-1. 환경 빵 부스러기(Environmental Breadcrumb)

#### Super Metroid — 보이지 않는 손(The Invisible Hand)

슈퍼 메트로이드의 레벨 디자인은 플레이어를 안내하면서도 "자유롭게 탐험하는 것처럼" 느끼게 만드는 예술이다.

**핵심 기법:**

1. **빛과 조명의 방향성:** 중요한 경로 방향으로 빛이 집중되거나 전경이 밝아짐
2. **환경 구성의 화살표 효과:** 지형 자체가 이동 방향을 암시 (경사면, 단차, 개구부 배치)
3. **적 밀도의 경로 표시:** 보스 방향으로 갈수록 적의 숫자 또는 강도가 자연스럽게 증가
4. **전조(Foreshadowing) 배치:** 현재 능력으로는 접근 불가능한 아이템을 시야에 배치하여 미래 동기 부여

Super Metroid의 모든 방은 "막힐 수 있지만 필요한 능력 없이 절대 영구적으로 막히지 않도록" 설계되었다.

#### Hollow Knight — 물리적 지도 시스템

Hollow Knight는 시장 Cornifer에게서 지도를 구매하고, 나침반과 깃펜을 별도로 구매해야 지도가 업데이트된다. 이 시스템은 두 가지 효과를 만든다:

- **탐험가 감각 강화:** "내가 이 지도를 개척한다"는 소유감
- **경제적 동기 부여:** 지도 구매를 위해 Geo(화폐) 수집 동기 유발

NPC Quirrel의 반복 등장은 플레이어를 올바른 방향으로 자연스럽게 안내하는 "나그네 NPC" 기법의 교과서다. 그는 스토리상 독립적인 캐릭터이지만, 핵심 지점마다 등장하여 플레이어에게 다음 목적지의 존재를 암시한다.

### 3-2. 퍼널 설계(Funnel Design)

퍼널 디자인은 **여러 갈래의 경로가 동일한 진행 게이트로 수렴**하는 구조다.

```
시작점
  ├── 경로 A (직접적, 어려운 전투)
  ├── 경로 B (우회, 자원 획득)
  └── 경로 C (시크릿, 보상 강화)
              ↓
        [핵심 게이트]
              ↓
        다음 구역
```

이 구조의 장점:
- 탐험자는 모든 경로를 시도
- 목표 지향적 플레이어는 직접 경로 선택
- 양쪽 모두 동일한 게이트를 통과하므로 밸런스 유지

슈퍼 메트로이드는 초반 구역 Brinstar에서 이 퍼널 구조를 3~4중으로 겹쳐 사용한다.

### 3-3. 랜드마크 기반 공간 기억

2D 횡스크롤에서 3D와 달리 원거리 조망이 없으므로 **시각적 랜드마크**가 공간 기억의 핵심이다.

| 랜드마크 유형 | 사례 | 효과 |
|:------------|:-----|:-----|
| 고유 건축 요소 | SotN의 Marble Gallery 시계탑 | 구역 입구 즉시 인식 |
| 배경 색조 전환 | Hollow Knight의 각 지역별 팔레트 | 경계 인식 |
| 오디오 큐 | 각 구역 고유 BGM | 청각적 위치 확인 |
| 반복 등장 NPC | 할로우 나이트 Cornifer | 미탐험 구역 신호 |
| 보스 방 입구 | 양쪽 문이 잠기는 특수 방 | 심리적 긴장 예고 |

---

## 4. 감정 아크 설계

### 4-1. 메트로베니아의 표준 감정 아크

```
감정 강도
    ▲
    │
    │                          ████ 최종 절정
    │                    ████
    │              ████        중간 반전
    │        ████
    │  ████              저점 (암흑 지역)
    │
    └──────────────────────────────→ 게임 진행
       입장   중반   반전   후반   결말
```

- **입장(Arrival):** 세계의 규모와 신비에 경외감, 적당한 도전
- **중반(Midgame):** 능력 획득으로 자신감 증가, 세계가 열리는 쾌감
- **반전(Twist):** 세계의 본질이 드러나는 내러티브/공간 충격
- **저점(Nadir):** 가장 어둡고 좁은 공간, 감정적 최저점
- **절정(Climax):** 모든 능력을 종합 활용하는 최종 도전

### 4-2. 중간 반전 — 세계를 뒤집는 설계 기법

#### SotN — 역전 성(Inverted Castle)

역전 성은 게임 역사상 가장 유명한 중간 반전이다. 100% 탐험을 완료했다고 믿는 순간 세계가 물리적으로 뒤집힌다.

- **설계 통찰:** 역전 성은 처음부터 "뒤집어도 작동하도록" 설계되었다. 이는 동일한 에셋으로 게임 볼륨을 두 배로 늘리는 동시에 플레이어의 공간 기억을 전복시키는 천재적 자원 활용이다
- **심리 효과:** 익숙한 공간이 낯선 공간으로 변하는 "언캐니 밸리(Uncanny Valley)" 효과
- **게임플레이 효과:** 같은 맵을 다른 진입 방향으로 탐험하므로 패턴 매칭이 새롭게 도전됨

Goomba Stomp의 분석에 따르면 역전 성은 "비디오게임 역사상 최고의 트위스트 중 하나"로 평가되며, 당시 플레이어들은 보스를 이긴 후 크레딧이 올라가자 게임이 끝난 줄 알았다가 이후 성이 뒤집힌 것을 보고 충격을 받았다.

#### Hollow Knight — 심연(Abyss)

Abyss는 공간적 반전이 아닌 **내러티브-공간 복합 반전**이다. 플레이어는 게임 내내 자신의 주인공이 누구인지 모호하게 유지되다가, Abyss에서 자신과 동일한 형태의 수많은 "실패한 그릇(Vessel)"들을 발견한다.

이 순간 발생하는 감정적 효과:
1. 주인공의 정체성에 대한 의문 (주인공이 특별한 영웅이 아닐 수 있다)
2. Abyss라는 공간의 물리적 어둠과 내러티브적 어둠의 일치
3. Shade Cloak 획득 — 게임에서 가장 강력한 능력 중 하나를 감정적 저점에서 받음

이 설계는 MDA에서 **Narrative Aesthetic(서사)**과 **Challenge Aesthetic(도전)**을 하나의 공간에서 동시에 최고조로 만드는 구조다.

### 4-3. "저기에 갈 수 있어!" 모멘트

메트로베니아의 핵심 감정 피크 중 하나는 **이전에 막혔던 공간으로의 귀환**이다.

이 감정을 극대화하는 설계 조건:
1. **명확한 기억:** 처음 통과 시 막혔다는 사실을 플레이어가 기억해야 함 → 시각적으로 인상적인 장벽 설계 필요
2. **기억과 재방문 사이의 간격:** 너무 짧으면 새로움이 없음, 너무 길면 기억이 사라짐 → 15~40분 간격이 적절
3. **명확한 진입 확인:** 새 능력으로 진입할 때 파티클, 사운드, 환경 변화로 "내가 해냈다"를 확인

---

## 5. 세션 설계 — 멈추는 지점과 다시 켜는 이유

### 5-1. 자연 정지점(Natural Stopping Point)의 구조

Escapist Magazine 분석에 따르면 세이브 포인트는 메트로베니아의 "언성 히어로"다. 단순한 데이터 저장 기능을 넘어 **세션 리듬을 설계하는 도구**다.

| 정지점 유형 | 사례 | 심리적 기능 |
|:-----------|:-----|:-----------|
| 보스 격파 직후 | SotN 보스 방 인근 세이브 | 성취감으로 세션 마무리 |
| 세이브 방 도달 | Metroid 전통 세이브 룸 | 안도감 + "오늘 여기까지" |
| 벤치 (Hollow Knight) | 지역별 배치된 벤치 | 서사와 결합된 휴식 |
| 모닥불 (Dark Souls) | 장거리 탐험 후 첫 모닥불 | 귀환점 + 적 리스폰 딜레마 |
| 허브 귀환 | 아이템 채워 허브로 | 이후 다시 나갈 이유 생성 |

**세이브 배치 원칙:**
- 보스 전 반드시 세이브 가능 (죽음의 반복 비용 최소화)
- 장거리 탐험 구간은 중간에 세이브 배치 (10~15분 간격)
- 세이브 직전에 항상 "다음에 무엇을 하면 되는가"의 가시적 단서 배치

### 5-2. "한 방만 더(One More Room)" 훅

세션이 끝날 시점에도 계속 플레이하게 만드는 훅 메커니즘:

1. **불완전한 루프:** 세이브는 했지만 바로 앞에 문이 보임
2. **포션 하나 부족:** 자원이 아슬아슬하게 부족해서 한 방만 더 탐험
3. **보스 직전 진입:** 세이브 후 보스 방에 들어섰으나 아직 싸우지 않음
4. **아이템 쿵 소리:** 근처에서 아이템 드랍 사운드가 들림

Hollow Knight의 Geo 수집 루프는 이 훅의 정제된 형태다. 죽으면 Shade(유령)가 마지막 사망 지점에 Geo를 남기므로, 플레이어는 세션을 끊기 전에 반드시 Shade를 수거하러 가야 한다는 심리적 강박을 가진다.

### 5-3. 클리프행어 설계 — 다음 세션을 원하게 만들기

세션 종료 후 다음 세션을 기대하게 만드는 상태:

| 클리프행어 유형 | 구현 방식 | 효과 |
|:-------------|:---------|:-----|
| **능력 흘끗보기** | 세션 종료 직전에 새 능력 획득 | "다음에 뭘 열 수 있을까" |
| **보스 진입 직전** | 보스 방 문 앞에서 세이브 | 다음 세션 첫 콘텐츠 확정 |
| **미탐험 구역 가시화** | 맵에 미탐험 영역이 선명하게 표시 | 완성 욕구 자극 |
| **NPC 대화 단서** | 세션 마지막에 NPC가 새 장소 언급 | 다음 목표 제시 |
| **환경 변화** | 이벤트 후 맵 일부가 영구 변화 | "저게 어떻게 되었는지 봐야 해" |

### 5-4. 전형적 세션 길이

| 게임 | 평균 세션 길이 | 자연 종료 리듬 |
|:----|:------------:|:------------|
| Super Metroid | 45~90분 | 보스 구간 완료 단위 |
| SotN | 60~120분 | 구역 탐험 완료 단위 |
| Hollow Knight | 45~90분 | 벤치 도달 단위 |
| Dark Souls | 30~60분 | 모닥불 도달 단위 |
| Metroid Dread | 30~60분 | EMMI 구역 완료 단위 |

**30분 버티컬 슬라이스 적용:**
- 세션 목표: 30분 단일 세션 내 완결되는 경험
- 세이브: 시작점 + 중간 한 번 + 종료점 (총 3회)
- 클리프행어: 슬라이스 종료 시점에 새 능력을 주거나 미탐험 구역을 가시화

---

## 6. 맵 완성도 심리학

### 6-1. 100% 완성 동기의 심리적 근원

Northeastern University 연구(Backtracking: An Ecological Investigation)에 따르면 메트로베니아의 맵 완성도 시스템은 여러 층위의 심리적 욕구를 동시에 충족한다.

**Self-Determination Theory 분석:**
- **Autonomy:** "내가 이 세계를 어디까지 파고들지 결정한다"
- **Competence:** "숨겨진 방을 찾는 능력, 능력 게이트를 해독하는 지식"
- **Relatedness:** "이 세계를 완전히 이해했다는 친밀감"

**Bartle 유형별 반응:**
- **Achiever:** % 수치가 직접적 성취 지표로 작동 → 100% 완성이 최대 목표
- **Explorer:** 숨겨진 방 자체가 목적 → % 수치는 부산물
- **Competitor:** 타 플레이어의 완성도와 비교 → 리더보드 없어도 커뮤니티 자체 경쟁

### 6-2. SotN 200.6% — 과장된 완성도의 설계 의도

200.6%라는 수치는 설계자가 의도적으로 100%를 넘도록 만든 것이다. 이 설계의 효과:

1. **"나는 완전히 탐험했다"는 착각 해소:** 100%를 달성해도 여전히 갈 곳이 있다
2. **역전 성 진입 동기:** 정방향 성 100% 이후에도 게임이 이어진다는 신호
3. **스코어 인플레이션 허용:** 200.6%라는 숫자 자체가 완성도 콘텐츠의 풍부함을 암시

### 6-3. 시크릿 & 선택적 구역의 기능

선택적 구역(Optional Area)은 주 진행과 분리되어 다음 기능을 수행한다:

| 기능 | 설계 방식 | 대상 플레이어 |
|:----|:---------|:------------|
| **마스터리 테스트** | 핵심 능력의 극한 활용 | 경쟁형, 성취형 |
| **서사 심화** | 본편과 연결된 로어(lore) | 탐험형, 서사형 |
| **경제 보상** | 고가 아이템, 희귀 장비 | 성취형, 경제형 |
| **메타 보상** | 트로피, 업적, 타이틀 | 성취형, 경쟁형 |

### 6-4. 완성도 피로(Completion Fatigue) — 언제 강박이 되는가

완성도 추구가 즐거움에서 의무감으로 전환되는 임계점:

- **백트래킹 비용이 보상을 초과할 때:** 30분 이동 후 얻는 것이 소모품 1개
- **마지막 수% 구간의 검색 난이도가 과도할 때:** 99%에서 100%까지가 0%에서 99%보다 어려운 경우
- **선택적 구역의 핵심 밸런스 영향이 클 때:** 100% 완성 없이 엔드게임 진입이 사실상 불가한 경우

**설계 권고:** 마지막 10%는 "있어서 좋지만 없어도 되는" 레벨의 보상을 제공해야 함. 핵심 진행은 60~70% 탐험 기준으로 완결 가능해야 함.

---

## 7. ECHORIS 적용 시사점

### 7-1. ECHORIS 30분 버티컬 슬라이스 설계 지침

#### 능력 획득 구조 (Cascading Unlock 적용)

```
[시작] 기본 이동 + 기본 공격
    ↓ 5분
[1번째 능력] 이단 점프 (수직 탐험 확장)
    - 즉시 검증: 이단 점프가 없으면 지나칠 수밖에 없던 경로 진입
    - 회상 포인트: 처음 진입 시 막혔던 상단 플랫폼 재방문
    ↓ 10분
[미니 보스] 이단 점프 + 기본 공격의 조합 테스트
    ↓ 5분
[2번째 능력] 장비 1개 획득 (스탯 강화, 아이템계 진입 예고)
    - 획득 즉시 능력치 변화 체감
    - "이 장비 안에 세계가 있다" — 아이템계 시스템 힌트
    ↓ 10분
[슬라이스 종료] 스탯 게이트 발견 (STR 미달로 진입 불가한 구역)
    - 클리프행어: "저기에 가려면 더 강해져야 한다"
```

#### 감정 아크 (30분 버전)

```
분  0: 경외감 — 세계의 규모, 고딕 분위기 도입
분  8: 좌절 → 해결 — 첫 번째 막힌 경로 → 이단 점프 획득
분 15: 흥분 — 이단 점프로 열리는 새 공간, "저기 갈 수 있어!"
분 20: 긴장 — 미니 보스 직전
분 22: 성취 — 보스 격파, 세이브
분 28: 호기심 + 기대 — 아이템계 힌트, 스탯 게이트 발견
분 30: 클리프행어 — "다음엔 뭘 할 수 있을까"
```

### 7-2. 난이도 곡선 — ECHORIS 월드 구조 적용

ECHORIS의 수직 층위 구조는 Dark Souls의 **나선 하강 구조**와 유사하다.

```
[허브 — 지상층]
    ↓ 능력 게이트 (이단 점프)
[제1 심연층] — 고딕 폐허, 표준 난이도
    ↓ 스탯 게이트 (STR 30 이상)
[제2 심연층] — 기계 폐허, 중간 난이도
    ↓ 능력 게이트 (벽 타기)
[제3 심연층] — 수중/유기체, 고난이도
    ↓ 스탯 게이트 + 능력 게이트 복합
[최심층] — 최종 콘텐츠
```

각 층위는 독립적인 **감정 테마**를 가져야 한다 (공포 / 경외 / 절망 / 초월 등).

### 7-3. UI 없는 유도 — ECHORIS 구현 방안

| 유도 대상 | 추천 기법 | 구현 우선순위 |
|:---------|:---------|:------------|
| 허브로의 귀환 | 조명이 따뜻해지는 방향, 상승 음악 | Phase 1 |
| 스탯 게이트 인식 | 붉은 장벽 + 파티클, "STR 부족" 시각 피드백 | Phase 1 |
| 아이템계 진입 | 장비 아이템에서 방출되는 발광 파티클 | Phase 1 |
| 새 구역 탐험 유도 | 미탐험 방향으로 흘러가는 먼지/바람 파티클 | Phase 2 |
| NPC 유도 | 시로형 동행자(에르다)의 시선 방향 | Phase 2 |

### 7-4. 세션 설계 — 아이템계 연동

ECHORIS의 아이템계 구조는 **세션 내 자연 정지점**을 제공하는 고유 메커닉이다.

```
세션 시작 → 월드 탐험 (15~30분)
    ↓ 장비 획득
아이템계 진입 → 10층 단위 탐험 (10~20분)
    ↓ 아이템 강화 + 기억 단편 획득
허브 귀환 → 강화 확인, 저장 (5분)
    ↓ 자연스러운 세션 종료 or 재탐험
```

이 구조는 디스가이아 아이템계 리서치(`Disgaea_ItemWorld_CoreMechanics.md`)에서 도출된 **10층 단위 체크포인트 리듬**을 ECHORIS 월드-아이템계-허브 순환 루프에 통합한 것이다.

### 7-5. 맵 완성도 — ECHORIS 설계 기준

| 탐험 % | 기대 경험 | 해금 내용 |
|:------|:---------|:---------|
| 60% | 메인 스토리 완결 가능 | 핵심 능력 + 최종 보스 접근 |
| 80% | 서브 스토리 완결, 희귀 장비 세트 완성 | 강화된 빌드 옵션 |
| 100% | 마스터리 컨텐츠 해금 | 진엔딩, 최상위 아이템계 해금 |

SotN의 200.6% 개념을 적용하면: 월드 100% + 아이템계(모든 장비의 아이템계 완전 탐험) = 총 탐험률 200%+가 될 수 있다. 이는 ECHORIS의 아이템계 재귀 구조(`System_ItemWorld_Recursion.md`)와 자연스럽게 결합한다.

---

## 8. 출처

### 연구 문서

- [A Framework for Metroidvania Games — ResearchGate](https://www.researchgate.net/publication/346540910_A_Framework_for_Metroidvania_Games)
- [Metroidbrainia: A Genre Analysis of Knowledge-Based Exploration Games — ResearchGate](https://www.researchgate.net/publication/397024365_Metroidbrainia_A_Genre_Analysis_of_Knowledge-Based_Exploration_Games)
- [Backtracking: An Ecological Investigation to Contextualize Rewards in Games — Northeastern University](https://repository.library.northeastern.edu/files/neu:m0455c28j/fulltext.pdf)
- [The Psychology of Metroidvania: Why We Can't Stop Exploring — Medium](https://medium.com/@sophia_schneider/the-psychology-of-metroidvania-why-we-cant-stop-exploring-32c92e87c909)

### 개발자 분석

- [The Invisible Hand of Super Metroid — Game Developer](https://www.gamedeveloper.com/design/the-invisible-hand-of-super-metroid)
- [Looking Back at the Level Design Triumphs of Super Metroid — Game Developer](https://www.gamedeveloper.com/design/looking-back-at-the-level-design-triumphs-of-i-super-metroid-i-)
- [How Super Metroid Changed Level Design — Medium](https://henrique-lage.medium.com/how-super-metroid-changed-level-design-c6e612ea62a7)
- [How the Hollow Knight Devs Mapped Out Their Metroidvania — Game Developer](https://www.gamedeveloper.com/design/how-the-i-hollow-knight-i-devs-mapped-out-their-metroidvania-)
- [10 Hollow Knight Design Choices That Made It a Modern Classic — DualShockers](https://www.dualshockers.com/hollow-knight-design-choices-that-made-it-a-modern-metroidvania-classic/)
- [Castlevania: SotN and The Inverted Castle — Gaming's Greatest Twist — Goomba Stomp](https://goombastomp.com/symphony-of-the-night-inverted-castle/)
- [Castlevania: SotN Was Designed to Work Upside Down — GamesRadar](https://www.gamesradar.com/castlevania-symphony-night-designed-upside-down/)
- [Examining the EMMI Zones of Metroid Dread — Josh Anthony](https://www.joshanthony.info/2021/11/06/examining-the-emmi-zones-of-metroid-dread/)

### 맵 & 레벨 디자인

- [How to Design a Great Metroidvania Map — PC Gamer](https://www.pcgamer.com/how-to-design-a-great-metroidvania-map/)
- [Save Points Are the Unsung Heroes of Metroidvania Design — Escapist Magazine](https://www.escapistmagazine.com/save-points-are-the-unsung-heroes-of-metroidvania-design/)
- [Dark Souls 1: FromSoftware's Magnum Opus of Interconnected Level Design — The Gamer](https://www.thegamer.com/dark-souls-1-fromsoftwares-magnum-opus-of-interconnected-level-design/)
- [Undead Burg (Dark Souls 1) — The Level Design Book](https://book.leveldesignbook.com/studies/sp/undead-burg)
- [Castlevania's Koji Igarashi Offers Advice to Today's Metroidvania Devs — Game Developer](https://www.gamedeveloper.com/design/-i-castlevania-i-s-koji-igarashi-offers-advice-to-today-s-metroidvania-devs)

### 난이도 & 진행 설계

- [How Poor Pacing Ruins Your Gameplay — Super Jump Magazine](https://www.superjumpmagazine.com/how-poor-pacing-ruins-your-gameplay/)
- [Metroid Dread Lead Addresses Controversial Difficulty Design — Destructoid](https://www.destructoid.com/metroid-dread-lead-addresses-controversial-difficulty-design/)
- [Subtractive Design: Guide to Making Metroidvania Style Games — Subtractive Design](http://subtractivedesign.blogspot.com/2013/01/guide-to-making-metroidvania-style_16.html)
- [Ori and the Will of the Wisps: Destroying Hope — Game Developer](https://www.gamedeveloper.com/design/ori-and-the-will-of-the-wisps-destroying-hope)

### 내부 참조 문서

- `Documents/Research/Metroidvania_MapStructure_GateDesign.md`
- `Documents/Research/LevelDesign_ProgressionShape_Research.md`
- `Documents/Research/Disgaea_ItemWorld_CoreMechanics.md`
- `Reference/Metroidvania Game Design Deep Dive.md`
