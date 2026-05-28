# Game Balance - 요약

## 기본 정보

- **제목**: Game Balance
- **저자**: Ian Schreiber, Brenda Romero
- **구성**: 3부 구성 (Part I: Game Balance 실전, Part II: Balance Math, Part III: 참고 자료)
- **Brenda Romero**: Wizardry, Jagged Alliance, Ghost Recon 시리즈 등 50개 이상 게임 디렉팅. BAFTA, Fulbright 수상. Empire of Sin 프랜차이즈 크리에이터.

---

## 핵심 주제

- **게임 밸런스의 정의와 본질**: 밸런스는 "재료가 아닌 속성(property)"이며, "느낌(feeling)"에서 시작된다
- **7가지 밸런스 유형**: 수학적 밸런스, 난이도, 진행, 초기 조건, 전략 간, 게임 오브젝트 간, 공정성
- **가능성 공간(Possibility Space)**: 게임 상태, 결정론/비결정론, 전이성/비전이성, 정보, 대칭성
- **피드백 루프**: 양성(증폭) 및 음성(감쇠) 피드백 루프가 밸런스에 미치는 영향
- **4가지 밸런싱 방법**: 디자이너 경험, 소규모 플레이테스팅, 애널리틱스, 수학

---

## 장별/섹션별 요약

### Chapter 1: 게임 밸런스의 기초

**밸런스란 무엇인가:**
- 밸런스는 맥락에 따라 다르며, 회색 지대(gray area)다
- 밸런스는 상호의존성의 춤(dance of interdependencies) - 하나의 기어를 바꾸면 다른 모든 기어에 영향
- 밸런스는 은유(metaphor): 저울이 아닌 엔진에 더 가깝다

**7가지 밸런스 유형:**
1. **수학적 밸런스**: 레벨 커브, 아이템 비용, HP 등 수치 관계
2. **난이도 밸런스**: 시간에 따른 난이도 곡선. 마소코어, 아동용 등 의도에 따라 다름
3. **진행 밸런스**: 파워 진행, 난이도 진행, 게임플레이 진행, 서사 진행
4. **초기 조건 밸런스**: PvP에서 동등한 출발 조건
5. **전략 간 밸런스**: 다양한 전략이 모두 경쟁력 있는지
6. **게임 오브젝트 간 밸런스**: 개별 아이템/유닛/캐릭터의 상대적 가치
7. **공정성(Fairness)**: 밸런스의 공통 실 - 플레이어가 공정하다고 느끼는가

**3가지 다이얼 + 3가지 수정자:**
- 다이얼: 난이도(Difficulty), 수량(Quantity), 타이밍(Timing)
- 수정자: 대상 관객(Target Audience), 디자이너 의도(Designer's Intent), 목적(Purpose)

**4가지 밸런싱 접근법:**
1. **디자이너 경험**: 빠르지만 전수 불가. 한 경험 있는 디자이너는 "1.5배 규칙"을 기본으로 사용
2. **소규모 플레이테스팅**: 실제 플레이어 관찰. 디자이너 맹점(designer blindness) 극복
3. **애널리틱스**: 대규모 플레이 데이터 수집 분석. 라이브 서비스 게임에 핵심
4. **수학**: 수치 관계, 확률, 비용 곡선, 통계. 장르에 따라 비중 다름

### Chapter 2: 핵심 용어

**가능성 공간(Possibility Space):**
- 게임 상태(Game State): 한 시점의 모든 게임 정보
- 가능성 공간: 모든 잠재적 게임 상태의 집합

**가능성 공간에 영향을 미치는 4요소:**

1. **결정론(Determinism)**: Pac-Man(결정론적, 패턴 가능) vs Ms. Pac-Man(비결정론적, 반응 중심)
2. **전이성(Transitivity)**:
   - 전이적: A > B, B > C이면 A > C (직선적 파워 서열)
   - 비전이적: 가위바위보식 관계. 인지된 가능성 공간이 더 넓어짐
3. **정보**: 완전 정보(Chess), 특권 정보(카드 핸드), 공유 정보(체력바), 숨겨진 정보(드로우 덱)
4. **대칭성**: 대칭(동일 출발) vs 비대칭(차별화된 출발). Civilization: Revolution이 비대칭 디자인의 좋은 예

**피드백 루프:**
- **양성(Positive/Amplifying)**: 부자가 더 부유해지는 구조. Monopoly가 대표적. 잘 쓰면 게임을 신속히 종결, 잘못 쓰면 초반 우위가 복구 불가
- **음성(Negative/Dampening)**: 뒤처진 플레이어에게 이점. Mario Kart의 아이템 분배. 잘 쓰면 역전 가능성, 잘못 쓰면 잘하는 것에 대한 벌칙감
- **사회적 역학**: 가장 명확한 음성 피드백 루프. Catan에서 선두 플레이어와 거래 거부

**곡선(Curves):**
- Identity(동일), Linear(선형), Exponential(지수), Logarithmic(로그), Triangular(삼각) 곡선
- 레벨 커브, 난이도 커브, 학습 커브 등에 활용
- F2P 게임에서 "ramp the player out" 기법

**풀이 가능성(Solvability):**
- 자명한 풀이 가능(Trivial): 틱택토
- 이론적 풀이 가능(Theoretical): 체스 - 가능하지만 비현실적
- 계산적 풀이 가능(Computational): 컴퓨터로 가능하지만 인간은 불가

**메타게임:**
- "게임을 둘러싼 게임" - 덱 구축, 선수 트레이드, 훈련 등
- 메타게임 밸런스: 스포츠의 드래프트, 샐러리캡, 수익 공유가 양성 피드백 루프 억제
- TCG에서 Anti Raigeki 사례: 메타게임 솔루션이 가위바위보화 위험

### Chapter 3-5: 게임 요소 간 관계 분석 및 밸런싱 기법

- 게임 오브젝트 간 수학적 관계 도출
- 비용 곡선을 통한 밸런스 분석
- 전이적/비전이적 관계의 수학적 모델링

### Chapter 6: 경제 시스템

- 게임 내 경제 시스템의 설계와 밸런싱
- 자원의 흐름(Faucet/Sink), 인플레이션 관리

### Chapter 7: 거래와 경매

- 플레이어 간 거래 시스템의 밸런스
- 경매 메커니즘과 그 영향

### Chapter 8: 자원(Resources)

- 자원 시스템의 설계와 밸런싱
- 자원 간 관계와 변환 비율

### Chapter 9: 캐릭터

- 캐릭터 능력치와 클래스 밸런싱

### Chapter 10: 전투

- 전투 시스템의 수학적 모델링
- DPS, TTK 등 핵심 지표

### Chapter 11-12: 진행과 난이도

- 난이도 곡선 설계
- 파워 진행의 스파이크와 밸런스
- 레벨 커브의 수학적 기반

### Chapter 13: 애널리틱스

- 대규모 데이터 기반 밸런스 분석
- KPI 설정과 추적

### Chapter 14: 랭킹과 레이팅 시스템

- ELO, Glicko 등 레이팅 시스템 설계

### Chapter 15: 플레이테스팅 실전

- 플레이테스트 계획, 실행, 결과 분석
- 프로젝트 일정 내 밸런스 작업 통합

### Chapter 16: 큰 그림

- 밸런스가 게임 디자인/개발 전체에서 차지하는 위치

---

## ProjectZ 시사점

### 캠핑카 (The Camper Van)
- **피드백 루프 관리**: 캠핑카를 잘 지키면 더 많은 자원을 모을 수 있는 양성 피드백 루프를 주의. 초반 우위가 복구 불가한 상태가 되면 안 된다. 적절한 음성 피드백(좀비 웨이브 강화 등)으로 균형.
- **진행 밸런스**: 캠핑카 업그레이드의 파워 진행이 부드럽되, 주기적 스파이크(핵심 업그레이드 해금)가 있어야 한다.

### 총기 제작 (Gun Crafting)
- **비전이적 관계 설계**: 총기 간 관계가 "비싼 총 = 항상 좋은 총"(전이적)이 아니라, 상황에 따라 다른 총이 빛나는 비전이적 구조여야 한다. 이것이 인지된 가능성 공간을 넓혀 총기 제작의 재미를 극대화한다.
- **비용 곡선**: 자원 비용과 무기 성능의 관계를 명확한 곡선으로 설계. 비용 대비 성능이 일관되되, 특수 효과나 상황적 강점으로 차별화.
- **게임 오브젝트 밸런스**: 모든 제작 가능한 무기가 "적어도 어떤 상황에서는 사용할 이유가 있어야" 한다.

### 자원 기반 전략 (Resource Strategy)
- **경제 밸런스**: Scrap Parts, Tech Unit, Core Module 간의 교환 비율과 획득 곡선이 핵심. Faucet(자원 유입)과 Sink(자원 소모)의 밸런스.
- **비대칭 전략**: 다양한 자원 운용 전략(공격 집중, 방어 집중, 밸런스형)이 모두 경쟁력 있어야 한다.
- **메타게임 건전성**: 하나의 지배 전략이 메타를 독점하지 않도록. "가젯 비용 > 벽 비용" 규칙이 이미 이 방향.
- **3가지 다이얼 적용**: 자원 난이도(얼마나 구하기 어려운가), 자원 수량(얼마나 많이 나오는가), 자원 타이밍(언제 나오는가)을 독립적으로 조절.

### 전반적 설계 원칙
- **밸런스는 느낌**: 수학만으로 완성되지 않는다. 반복적 플레이테스트로 "느낌"을 확인해야 한다.
- **양성 피드백 루프 경계**: TPS 장르에서 초반 킬이 장비 우위로, 장비 우위가 더 많은 킬로 이어지는 스노우볼 효과를 억제해야 한다.
- **곡선 설계**: 매치 내 자원 획득 곡선, 팀 업그레이드 곡선, 좀비 난이도 곡선을 명시적으로 설계하고 스프레드시트로 관리.

---

## 핵심 인용/개념

> "Game balance is, first and foremost, a feeling, and you know it when you feel it."

> "Balance is a property, not an ingredient. You can't just 'add more balance' to your game any more easily than you can 'add more fun' to it."

> "Balance is like swapping out a gear in the center of a bunch of other gears. You're not creating a single component in isolation; you're making a machine where all the gears work together."

> "If you ask 100 game designers what game balance is, you get 90 different answers."

> "Positive feedback loops cause the rich to get richer and the poor to get poorer."

> "The perceived possibility space seems greater because there are interesting vs. obvious choices." (비전이성에 대해)

> "If a game balance problem exists in one part of your game, it can easily propagate to other areas, so the problems your players experience in playtesting are not always the exact things that need to be fixed."

> "Mathematics is a skill, and like any skill, it can be taught and it can be learned."

> "Chess has been played in some form for thousands of years, and we still don't know exactly how balanced it is."

> "A balanced game is one that feels fair to the players."


**Q1: ProjectZ의 자원 3종(Scrap Parts, Tech Unit, Core Module) 간의 전이적/비전이적 관계를 어떻게 설계하면, 자원 운용 전략의 다양성을 극대화할 수 있을까요?**


**Q2: 매치 내에서 선두 팀이 자원을 독식하는 양성 피드백 루프를 어떤 음성 피드백 메커니즘으로 상쇄할 수 있을까요?**


**Q3: 총기 제작의 비용 곡선을 설계할 때, "비싼 총이 항상 좋은 총"이 되지 않으면서도 플레이어가 투자 대비 가치를 느끼게 하는 곡선의 형태는 어떤 것일까요?**
