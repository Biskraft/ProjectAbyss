# Challenges for Game Designers: Non-Digital Exercises for Video Game Designers

## 기본 정보

- **제목:** Challenges for Game Designers: Non-Digital Exercises for Video Game Designers
- **저자:** Brenda Brathwaite, Ian Schreiber
- **출판:** Charles River Media (Cengage Learning), 2009
- **ISBN:** 978-1-58450-580-8

---

## 핵심 주제

- **게임의 기본 원자(Game Design Atoms):** 게임 상태, 게임 뷰, 아바타, 메커닉, 다이나믹, 테마로 구성되는 게임의 최소 단위 분해
- **핵심 다이나믹(Core Dynamics):** 영토 획득, 예측, 공간 추론, 생존, 파괴, 건설, 수집, 추격/회피, 거래, 결승점 경쟁의 10가지 반복 패턴
- **반복적 설계(Iterative Design):** 빠른 프로토타이핑 → 플레이테스트 → 수정 → 반복의 실천적 방법론
- **제약 조건과 설계 접근법:** 블루스카이, 슬로우 보일, 메커닉 기반, MDA, IP, 스토리 기반 등 다양한 설계 진입점
- **실전 도전 과제:** 각 장마다 비디지털 프로토타입을 통해 게임 설계 원리를 직접 체험하는 구조

---

## 장별/섹션별 요약

### Ch.1 - 기초 (The Basics)

**게임 설계의 핵심 개념:**

게임의 정의: "규칙이 있는 활동. 종종 다른 플레이어, 게임 시스템, 또는 운/운명과의 갈등을 포함하는 놀이의 한 형태."

**핵심(Core):** 게임플레이가 추구하는 단일 경험. "이 게임은 ~에 대한 것이다"를 한 두 문장으로 요약할 수 없으면 게임이 아니다.

10가지 핵심 다이나믹:
1. **영토 획득(Territorial Acquisition):** 제로섬 자원 통제 (Risk, Carcassonne)
2. **예측(Prediction):** 올바른 결과 추측에 대한 보상 (Roulette)
3. **공간 추론(Spatial Reasoning):** 퍼즐과 공간 배치 (Tetris, Connect Four)
4. **생존(Survival):** 본능적 자기 보존 드라이브
5. **파괴(Destruction):** 모든 FPS의 핵심 (Nuclear War)
6. **건설(Building):** 캐릭터 성장, 도시 건설 (SimCity, Settlers of Catan)
7. **수집(Collection):** 패턴 매칭 본능 활용 (CCG, 플랫포머의 코인)
8. **추격/회피(Chasing or Evading):** 원시적 사냥/도주 본능 (Pac-Man)
9. **거래(Trading):** 협력적 자원 교환 (Pit, Settlers of Catan)
10. **결승점 경쟁(Race to the End):** "빠름 = 숙달"이라는 뇌의 신호 활용

**아이디어의 원천:** 많은 게임 플레이, 다른 디자이너와의 네트워킹, 일상 모든 곳에서 게임 아이디어 찾기.

**반복적 설계 4단계:**
1. 빠른 프로토타입(Rapid Prototype): 그래픽보다 플레이에 집중
2. 플레이테스트(Playtest): 강점과 약점 식별
3. 수정(Revision): 약점 보강, 강점 강화
4. 반복(Repeat): 다음 이터레이션으로

핵심 규칙들:
- "규칙을 적을 수 없을 때까지 적지 마라" - 디자이너가 머릿속에 담을 수 없으면 플레이어도 마찬가지
- 반창고(Band-Aid) 해결책 경계: 근본 문제를 가리는 임시 규칙의 축적 방지
- "2의 법칙(Rule of Two)": 밸런스가 이상하면 값을 2로 곱하거나 나누어 테스트

**제약 조건:**
- 비디오 게임: 예산, 일정, 플랫폼이 설계 전체를 결정
- 비디지털: 제조 비용, 물리적 크기, 퍼블리셔 장르 적합성

**설계자의 블록 극복법:**
- 자원을 제한/무제한으로 전환
- 플레이어 간 상호작용 추가/변경
- 플레이 순서 변경
- 규칙 하나 제거

### Ch.2 - 게임 설계 원자 (Game Design Atoms)

**게임 상태(Game State):** 플레이 중 변할 수 있는 모든 가상 정보의 집합. 체스에서는 말의 위치와 이전 이동 기록, 포커에서는 각 플레이어의 패와 칩 등.

**게임 뷰(Game View):** 플레이어가 볼 수 있는 게임 상태의 부분. 체스는 게임 상태 = 게임 뷰(숨김 없음), RTS는 전장의 안개로 불완전한 뷰.

**게임 공간(Game Space):** 게임 전체 영역. 보드, MMO 세계, FPS 레벨 등.

**메커닉(Mechanics):** "X를 하면 Y가 일어난다"는 규칙. 게임 상태를 변경하는 모든 방법. 주요 유형:
- 설정(Setup): 게임 시작 방법
- 승리 조건(Victory Conditions): 승리 판정 방법
- 플레이 진행(Progression of Play): 턴제/실시간, 순서
- 플레이어 액션(Player Actions): "동사(verbs)" - 가장 중요한 메커닉
- 게임 뷰 정의: 정보 공개 규칙

**다이나믹(Dynamics):** 메커닉이 작동할 때 나타나는 플레이 패턴. MDA 모델에서 중요한 위치. "스폰 캠핑"은 다이나믹이지 메커닉이 아니다.

**테마(Theme):** 메커닉 외부에 존재하면서 메커닉을 더 자연스럽게 느끼게 하는 "게임이 무엇에 대한 것인지". Clue는 살인범 찾기 테마 없이도 동일한 메커닉으로 작동 가능하지만, 테마가 게임을 더 매력적으로 만든다.

**설계 시작점:** 다이나믹에서, 메커닉에서, 테마에서 모두 시작 가능. 어느 방향이든 유효한 게임이 나올 수 있지만, 사고 과정이 다르다.

### Ch.3+ - 도전 과제 시리즈

책의 핵심 구조는 각 장이 특정 게임 설계 원리를 다루고, 그에 맞는 비디지털 프로토타입 과제를 제시하는 형태:
- **경로(The Path):** "결승점 경쟁" 다이나믹 탐구
- **영토(It's Mine!):** 영토 획득 다이나믹 탐구
- **탐험(When I Find You...):** 탐험 다이나믹 탐구
- **수집(Pick It Up):** "걸어서 줍기" 메커닉에서 게임 만들기

각 과제는 테마 선정 → 메커닉 식별 → 플레이어 간 갈등 설계 → 플레이테스트 → 결과물 제작의 프로세스를 따른다.

### 주요 용어 정의

| 용어 | 정의 |
| :--- | :--- |
| Feature List | 게임의 핵심 기능/셀링 포인트 목록 |
| Brainstorming | 비판 없는 아이디어 생성 세션 |
| Prototype | 플레이 가능한 초기 버전 |
| Balance | 일관된 도전과 공정한 경쟁 상태 |
| Mechanics | 게임의 규칙 (동작의 "어떻게") |
| Dynamics | 규칙이 작동할 때 나타나는 플레이 패턴 |
| System | 특정 결과를 위한 메커닉 집합 (전투, 제작 등) |
| Alpha | 모든 시스템 구현 완료 마일스톤 |
| Beta | 모든 콘텐츠 포함, 안정화 단계 |
| Gold | 최종 출시 버전 |

### 설계 접근법 분류

| 접근법 | 설명 |
| :--- | :--- |
| Blue-sky | 제약 없는 자유 발상 |
| Slow boil | 주제에 대한 방대한 리서치 후 아이디어 발효 대기 |
| Mechanic | 핵심 메커닉에서 시작 (Mario의 점프, FPS의 사격) |
| MDA | 목표 감정(aesthetics) → 다이나믹 → 메커닉 역순 설계 |
| IP | 기존 지적재산 기반 설계 |
| Story | 스토리 기반 설계 |
| Research | 연구 목적의 설계 |

---

## ProjectZ 시사점

### 1. 캠핑카 (The Camper Van)

- 캠핑카 시스템은 **건설(Building)과 생존(Survival)** 두 가지 핵심 다이나믹의 결합이다. 건설은 캠핑카 강화/커스터마이징, 생존은 캠핑카 방어 상황에 해당한다
- 캠핑카의 게임 상태는 플레이어 간 **비대칭 정보(Asymmetric Game View)**를 제공한다. 적 팀은 캠핑카의 정확한 상태(HP, 업그레이드 수준)를 모르므로, 공격 결정에 불확실성이 존재한다
- "2의 법칙" 적용: 캠핑카 HP가 밸런스에 맞는지 확인할 때, 현재 값을 2배/절반으로 테스트하면 상호작용의 역학이 드러난다

### 2. 자원 기반 총기 제작 (Gun Crafting)

- 총기 제작은 **메커닉 기반(Mechanic-driven) 설계**의 전형이다. "자원을 조합하여 총기를 만든다"는 핵심 메커닉에서 모든 다이나믹이 파생된다
- Scrap Parts는 **제한 자원(Limited Resource)**이다. 책에서 강조하듯, 제한 자원은 자원 관리 전략을 강제하며, 이것이 전략적 깊이의 원천이다
- 반복적 설계 원칙 적용: 총기 제작 시스템의 레시피와 밸런스는 빠른 프로토타이핑과 반복적 플레이테스트를 통해서만 검증 가능하다. 문서화된 수치만으로는 다이나믹을 예측할 수 없다
- "반창고 경계" 원칙: 특정 총기 조합이 OP일 때, 그 조합에만 너프를 적용하는 것은 반창고다. 근본적인 데미지/자원 비용 체계를 재검토해야 한다

### 3. 자원 기반 전략 플레이 (Resource Strategy)

- ProjectZ의 핵심 루프는 **수집(Collection) + 영토 획득(Territorial Acquisition) + 거래(Trading)**의 다이나믹 조합이다
- 자원 전략에서의 "플레이어 상호작용": 상대가 자원을 가로채거나, 자원 밀집 지역을 선점하는 것은 "영토 획득" 다이나믹이며, 팀 내 자원 배분은 "거래" 다이나믹이다
- Core Module의 팀 전용 사용 규칙은 **"자원을 제한으로 만들기"** 전략의 극단적 적용이다. 개인 사용이 불가능하므로 팀 전략 다이나믹이 강제된다

### 일반 적용

- **MDA 역순 설계**: ProjectZ가 목표하는 감정(Aesthetics)은 "긴장감 있는 자원 관리 속 생존"이다. 이를 위한 다이나믹은 "희소한 자원의 경쟁적 수집 + 팀 기반 방어", 이를 위한 메커닉은 "자원 수집 → 총기 제작 → 캠핑카 방어"
- **게임 상태 관리**: 각 매치의 게임 상태(자원 분포, 캠핑카 상태, 팀 업그레이드 수준)가 복잡하므로, 플레이어에게 적절한 게임 뷰를 제공하는 것이 핵심 UI 과제이다
- **핵심 선언문**: "ProjectZ는 한정된 자원으로 팀의 생존과 지배를 추구하는 전략적 TPS이다"

---

## 핵심 인용/개념

> "If you can't sum up your game in two sentences, you don't have a game."

> "Game design is a field you must apply to learn. Truly, there is no substitute for making games."

> "Dynamics result when rules are put in motion. The rules that allow players to attack each other might be a mechanic, but players actually using these rules to team up against the player in the lead is a dynamic."

> "Human beings are naturally wired to survive and thrive, and it's no different in the game world."

> "Be wary of putting a Band-Aid on top of a problem, but leaving the problem in the game."

> "Don't write your rules down until you have to write your rules down. If you as the designers can't keep them straight in your head, how do you expect your players to?"

> "If something seems off but you're not sure what, take one of the game's values and either multiply or divide it by two."

**핵심 프레임워크:**
- 10가지 핵심 다이나믹 (설계의 반복 패턴)
- 게임 설계 원자: 게임 상태 → 게임 뷰 → 아바타 → 메커닉 → 다이나믹 → 테마
- MDA 모델: Aesthetics(감정) ← Dynamics(패턴) ← Mechanics(규칙)
- 반복적 설계 4단계 사이클
- 7가지 설계 접근법
- 제약 극복 4가지 기법 (자원 전환, 상호작용, 순서 변경, 규칙 제거)
