# Game Mechanics: Advanced Game Design - 요약

## 기본 정보

- **제목:** Game Mechanics: Advanced Game Design
- **저자:** Ernest Adams, Joris Dormans
- **출판:** New Riders Games (Peachpit/Pearson Education), 2012
- **분야:** 게임 디자인 이론 / 게임 메커닉 설계

---

## 핵심 주제 (Core Themes)

- **게임 메커닉의 체계적 설계:** 규칙이 게임을 정의하고, 메커닉이 게임플레이를 생성하는 원리
- **내부 경제(Internal Economy):** 자원의 생산, 소비, 교환으로 구성되는 게임 경제 시스템
- **Machinations 프레임워크:** 게임 메커닉을 시각화하고 시뮬레이션하는 도구
- **이머전스(Emergence)와 프로그레션(Progression):** 두 가지 게임 구조의 비교와 통합
- **디자인 패턴 라이브러리:** 엔진, 마찰, 에스컬레이션 등 메커닉 설계의 심층 구조

---

## 장별 요약

### Chapter 1: Designing Game Mechanics
- 게임을 정의하는 것은 규칙이며, 메커닉은 규칙의 구체적 구현
- **이산(Discrete) vs. 연속(Continuous) 메커닉:** 턴 기반 vs. 실시간 물리
- 메커닉 설계는 게임 디자인 프로세스에서 핵심적 위치를 차지
- 프로토타이핑 기법: 종이 프로토타입, 디지털 프로토타입 등

### Chapter 2: Emergence and Progression
- **이머전스(Emergence):** 단순한 규칙에서 복잡한 게임플레이가 발생 (체스, StarCraft)
- **프로그레션(Progression):** 디자이너가 미리 설계한 순서대로 진행 (어드벤처 게임)
- Jesper Juul의 구분에 기반
- 현대 게임은 두 가지를 통합하는 경향 (예: Zelda 시리즈)

### Chapter 3: Complex Systems and the Structure of Emergence
- 게임플레이는 게임의 창발적 속성(emergent property)
- 복잡계의 구조적 특성: 활성화된 상호 연결된 부분들, 피드백 루프
- 셀룰러 오토마타(Conway의 Game of Life)로 이머전스 설명
- 의도적/비의도적 이머전스의 구분

### Chapter 4: Internal Economy (핵심 장)
- **자원(Resources):** 수치로 측정 가능한 모든 개념 (돈, 에너지, 시간, 체력, 경험치)
  - 유형(Tangible) vs. 무형(Intangible)
  - 구체적(Concrete) vs. 추상적(Abstract)
- **엔티티(Entities):** 자원의 특정 수량을 저장하는 변수
- **네 가지 경제 기능:**
  - **소스(Sources):** 무에서 자원을 생성
  - **드레인(Drains):** 자원을 영구 제거
  - **컨버터(Converters):** 한 종류의 자원을 다른 종류로 변환
  - **트레이더(Traders):** 엔티티 간 자원 교환 (생성/파괴 없음)
- **경제 형태(Economic Shapes):**
  - 음성 피드백 -> 균형(Equilibrium) 생성
  - 양성 피드백 -> 군비 경쟁(Arms Race) / 하향 나선(Downward Spiral)
  - 상대 점수 기반 피드백 -> 동적 균형
- **교착상태(Deadlock):** 상호 의존적 자원이 모두 소진되면 진행 불가
- **장기 투자 vs. 단기 이득:** StarCraft의 SCV 생산 전략
- **러버밴딩(Rubberbanding):** MarioKart의 순위 기반 음성 피드백
- **내부 경제의 활용:**
  1. 물리 보완 (액션 게임의 파워업/탄약)
  2. 진행 영향 (잠금-열쇠 메커닉)
  3. 전략적 깊이 추가 (RTS의 자원 관리)
  4. 확률 공간 확대 (RPG의 캐릭터 커스터마이징)
  5. 경제 구축 게임 (SimCity, Civilization)

### Chapter 5: Machinations
- Machinations 시각적 디자인 언어 소개
- 기본 요소: 풀(Pool), 게이트(Gate), 소스, 드레인, 컨버터
- Pac-Man을 예시로 한 Machinations 모델링

### Chapter 6: Common Mechanisms
- 피드백 구조의 심화
- 무작위성 vs. 이머전스
- 다양한 일반 메커니즘의 구현 예시

### Chapter 7: Design Patterns
- 디자인 패턴 라이브러리 소개
- **엔진 패턴:** Static Engine, Dynamic Engine, Converter Engine, Engine Building
- **마찰 패턴:** Static Friction, Dynamic Friction, Stopping Mechanism
- **에스컬레이션 패턴:** Attrition, Escalating Challenge, Escalating Complexity
- **추가 패턴:** Arms Race, Playing Style Reinforcement, Multiple Feedback, Trade, Worker Placement, Slow Cycle

### Chapter 8: Simulating and Balancing Games
- Machinations을 이용한 시뮬레이션된 플레이 테스트
- Monopoly와 SimWar의 밸런싱 사례 연구
- 모델에서 실제 게임으로의 전환

### Chapter 9: Building Economies
- 경제 구축 게임의 특성
- Caesar III 분석: 도시 경제, 건물 시스템, 디자인 패턴 적용
- Lunar Colony 신규 게임 설계: 설계-정제 과정의 단계별 안내

### Chapter 10: Integrating Level Design and Mechanics
- 장난감(Toy)에서 놀이터(Playground)로의 전환
- 미션과 게임 공간의 관계
- 플레이어가 플레이를 배우는 과정 설계

### Chapter 11: Progression Mechanisms
- 잠금-열쇠(Lock-and-Key) 메커닉: Zelda 시리즈의 전통적 방식
- 이머전트 프로그레션: 진행을 경제 내 자원으로 취급
- Settlers of Catan의 이머전트 프로그레션 분석

### Chapter 12: Meaningful Mechanics
- 시리어스 게임: 건강, 교육, 자선 목적의 게임
- 커뮤니케이션 이론과 기호학
- 메커닉이 의미를 전달하는 다중 레이어

---

## 핵심 인용/개념

- **"Game mechanics lie at the heart of all game design."** - 게임 메커닉은 모든 게임 디자인의 핵심
- **소스-드레인-컨버터-트레이더:** 모든 게임 경제의 4대 기본 기능
- **양성 피드백의 이중성:** 승리를 가속화하거나, 패배를 가속화(하향 나선)할 수 있음
- **교착상태(Deadlock):** 상호 의존적 자원의 동시 소진 -> 게임 진행 불가 상태
- **경제 형태(Economic Shape):** 게임 경제의 자원 흐름 그래프가 보여주는 패턴
- **빵부스러기(Breadcrumbs):** 수집 가능한 오브젝트로 플레이어를 안내하는 기법
- **디자인 패턴:** 반복적으로 발생하는 메커닉 문제에 대한 검증된 해결책

---

## ProjectZ 시사점

### 1. 내부 경제 설계의 직접적 프레임워크
- ProjectZ의 "자원 기반 전략 플레이" 기둥에 대한 체계적 설계 도구 제공
- Scrap Parts, Tech Unit, Core Module을 소스-드레인-컨버터-트레이더 모델로 매핑 가능
- 각 자원의 생산률, 소비률, 변환률을 Machinations으로 시뮬레이션하여 밸런싱

### 2. 피드백 구조와 전략적 깊이
- **양성 피드백:** 자원을 많이 가진 팀이 더 빠르게 성장 -> 군비 경쟁 유도
- **음성 피드백:** 뒤처진 팀에게 보상 메커니즘 -> 역전 가능성 유지
- **하향 나선 방지:** 자원을 완전히 잃은 팀의 회복 경로 설계 필수
- StarCraft의 SCV/미네랄 관계는 ProjectZ의 Scrap Parts 수집/무기 제작 루프와 유사

### 3. 장기 투자 vs. 단기 이득 딜레마
- "자원 기반 총기 제작"에서 플레이어가 직면하는 핵심 선택:
  - 즉시 기본 무기를 제작할 것인가 vs. 더 많은 자원을 모아 강력한 무기를 제작할 것인가
  - 자원을 개인 장비에 투자할 것인가 vs. 팀 업그레이드(Tech Unit)에 투자할 것인가
- 이 딜레마가 "끊임없는 선택"이라는 세 번째 기둥의 핵심

### 4. 교착상태(Deadlock) 방지
- Zelda의 교착상태 해결법(갱신 가능한 자원 소스) 참고
- ProjectZ에서 모든 자원을 소진한 플레이어가 완전히 무력화되지 않도록 최소한의 자원 소스 보장
- 예: 근접 공격, 환경 내 기본 자원 스폰 등

### 5. 경제 구축 패턴의 적용
- **Converter Engine:** Scrap Parts를 무기 부품으로 변환하는 제작 시스템
- **Dynamic Engine:** 전투 성과에 따라 자원 획득률이 변하는 메커니즘
- **Attrition 패턴:** 총알, 건축 자재 등 소모품이 전투를 통해 감소하는 구조
- **Engine Building:** 팀 업그레이드(Tech Unit)로 자원 생산 효율을 높이는 장기 전략

### 6. Deus Ex 사례의 교훈
- 커스터마이징을 허용하면서도 모든 빌드가 게임을 클리어할 수 있어야 함
- Deus Ex: Human Revolution의 실수(보스전에서 특정 빌드만 유효) 반복 금지
- ProjectZ의 총기 제작 시스템에서 다양한 제작 경로가 모두 유효한 전략이 되도록 설계
