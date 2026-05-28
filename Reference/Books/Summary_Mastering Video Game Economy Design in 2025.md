# Game Design Manual (Mastering Video Game Economy Design in 2025)

## 기본 정보

- **제목:** Game Design Manual (원제: Mastering Video Game Economy Design in 2025)
- **저자:** Ivan Paduano
- **출판:** 2025
- **형태:** 학술적 게임 디자인 종합 교본

---

## 핵심 주제

- **게임 디자인의 인식론적 기반:** 과학(심리학, 인지과학), 예술(미학, 내러티브), 공학(시스템 구현), 인문학(사회학, 윤리학)의 4축 통합 학문으로서의 게임 디자인
- **플레이어 심리학:** 자기결정이론(SDT), 플로우 이론, 인지 편향, 감정 설계를 통한 플레이어 중심 설계
- **게임 메커닉과 시스템:** 핵심 메커닉 설계, 게임 루프(마이크로/메소/매크로), 시스템 간 상호작용, 밸런싱
- **경제 설계:** 가상 경제, 수도꼭지/배수구, 인플레이션 관리, 수익화 윤리
- **윤리와 사회적 책임:** 다크 패턴, 중독 설계, 문화적 재현, 온라인 독성 행동에 대한 디자이너의 책임

---

## 장별/섹션별 요약

### Ch.1 - 게임 디자인의 과학적 접근 (Epistemological Foundations)

**1.1 게임 디자인의 정의와 구조:**
게임을 복잡한 시스템으로 분석 - 플레이어, 규칙, 목표, 공간, 메커닉, 피드백으로 구성. Huizinga(1938)의 "Homo Ludens"와 Caillois(1958)의 놀이 분류에서 현대 디지털 시대의 정의까지 진화를 추적한다.

**1.2 과학, 예술, 공학, 인문학의 통합:**
- **과학적 축:** 인지심리학, 행동경제학, HCI로부터 플레이어 행동 이해
- **예술적 축:** 시각, 청각, 내러티브를 통한 감정적 경험 창출
- **공학적 축:** 시스템 아키텍처, 게임 엔진, 네트워크 구현
- **인문학적 축:** 사회학(EVE Online 커뮤니티), 문화연구(젠더/인종 재현), 철학(윤리적 딜레마)

"과학자처럼 생각하고, 예술가처럼 느끼고, 엔지니어처럼 만들되, 인간 요소와 사회문화적 맥락에 대한 깊은 이해에 의해 안내받는" 것이 현대 게임 디자인의 이상.

**1.3-1.4 연구 방법론:**
- **질적 연구:** 가상 에스노그래피(Nardi의 "Night Elf Priest"), 현상학적 분석
- **양적 연구:** EEG, GSR, 안구추적, 기계학습 기반 게임 분석
- **혼합 방법론:** 텔레메트리 데이터 + 심층 인터뷰 결합
- **Design Based Research(DBR):** 이론과 실천을 동시에 발전시키는 반복적 연구

**1.5 게임 디자인 사상의 역사적 진화:**
- **고대~근대:** 세넷(3100 BC), 바둑(2500년), 체스, 모노폴리의 설계 원리
- **아케이드 시대:** Pong(1972), Space Invaders(1978), Pac-Man(1980) - 즉각적 피드백과 몰입적 게임 루프
- **PC/콘솔 황금기:** 미야모토 시게루의 "kishōtenketsu" 레벨 디자인, Will Wright의 오픈 시뮬레이션, Sid Meier의 4X 전략
- **현대:** Salen & Zimmerman의 "Rules of Play"(2004), Jesse Schell의 "A Book of Lenses"(2008), MMO/GaaS 모델, F2P 수익화, VR/AR, AI

**1.6 윤리와 사회적 책임:**
- **다크 패턴:** 기만적 인터페이스, 인위적 긴급성, 가변 비율 보상 시스템(루트박스)
- Star Wars Battlefront II(2017)의 루트박스 논란
- Schüll의 "Addiction by Design" - 슬롯머신의 강박적 "존" 상태 유도 설계
- **문화적 재현:** 젠더, 인종, 성적 지향의 다양하고 뉘앙스 있는 재현 필요
- **소셜 독성:** League of Legends 독성, Overwatch 2의 칭찬 시스템, 긍정적 상호작용 인센티브 설계

### Ch.2 - 플레이어 심리학 (Player Psychology)

**2.1 동기 이론:**

**자기결정이론(SDT) - Deci & Ryan:**
세 가지 선천적 심리적 욕구:
1. **유능감(Competence):** 도전 극복과 성장 경험 (Celeste의 반복 도전)
2. **자율성(Autonomy):** 자발적 행동과 의미 있는 선택 (Mass Effect의 도덕적 결정)
3. **관계성(Relatedness):** 타인과의 진정한 연결 (FFXIV 레이드 협력)

**플로우 이론(Flow Theory) - Csikszentmihalyi:**
도전과 능력의 동적 균형에서 발생하는 최적 경험. 명확한 목표, 즉각적 피드백, 도전-능력 균형, 집중, 통제감, 자기의식 상실, 시간 왜곡. Sweetser & Wyeth의 "GameFlow" 모델이 게임에 특화된 플로우 기준 제공.

**기대-가치 이론:** 성공 기대(자기효능감)와 과제 가치의 곱이 동기를 결정. 좋은 온보딩과 점진적 난이도 곡선으로 성공 기대를 구축해야 한다.

**2.2-2.3 인지 과정:**
- **학습:** 행동주의적 강화(스키너 상자의 변동 비율 강화), 인지적 학습(스키마, 전이), 구성주의적 발견 학습
- **주의:** 선택적 주의, 변화 맹시, 주의의 병목 현상
- **기억:** 작업 기억의 한계(밀러의 7±2), 장기 기억의 부호화/인출, 간격 효과
- **문제 해결:** 잘 정의된/잘못 정의된 문제, 통찰(insight), Baba Is You의 메타-문제 해결

**2.4 감정 설계:**

**Norman의 3단계 감정 디자인:**
1. **본능적(Visceral) 수준:** Ghost of Tsushima의 시각적 아름다움, DualSense 햅틱
2. **행동적(Behavioral) 수준:** Hollow Knight의 반응성 높은 조작감, 명확한 UI
3. **성찰적(Reflective) 수준:** The Last of Us Part II의 복잡한 서사, 자기 표현

**감정 측정:**
- 자기 보고: Game Experience Questionnaire(GEQ), SAM 척도
- 생리 측정: ECG, GSR, fEMG, EEG
- 행동 측정: 얼굴 표정 분석, 플레이 패턴 분석

**Russell의 원형 모델:** 감정을 쾌/불쾌(valence)와 각성/이완(arousal) 2차원으로 매핑. 게임 설계자는 고각성(전투, 추격)과 저각성(탐험, 성찰) 시퀀스를 교차 배치.

**2.5 인지 편향과 휴리스틱:**
- Kahneman의 시스템 1(빠른, 직관적) vs 시스템 2(느린, 분석적)
- 확인 편향, 프레이밍 효과, 현상 유지 편향, 손실 회피
- 윤리적 경계: 편향을 악용하지 않고, 공정성 인식 개선과 효과적 학습에 활용

### Ch.3 - 게임 메커닉과 시스템 (Game Mechanics)

**3.1-3.2 MDA 프레임워크:**
Hunicke, LeBlanc, Zubek의 Mechanics → Dynamics → Aesthetics. 디자이너는 메커닉에서 시작하지만, 플레이어는 미학(감정)에서 경험한다.

**3.3 핵심 메커닉 설계 원칙:**
- **명확성(Clarity):** 입력과 결과의 직관적 이해
- **깊이(Depth):** 단순 규칙에서 복잡한 전략 발생 (바둑, Slay the Spire)
- **우아함(Elegance):** 최소 규칙으로 최대 다이나믹 (Portal의 포탈 건)
- **즉각적 피드백:** 시각/청각/촉각의 멀티모달 피드백 - DOOM Eternal의 전투 임팩트
- **발현적 잠재력(Emergent Potential):** 간단한 구성 요소 상호작용에서 예측 불가능한 복잡성 발생 (Minecraft, Genshin Impact 원소 반응)

**3.4 게임 루프 (Game Loops):**
중첩된 3단계 루프 구조:
1. **마이크로 루프(Core Action Loop):** 초 단위의 핵심 행동 반복 (조준→사격→확인→결정). "Game Feel"의 핵심
2. **메소 루프(Short/Medium-term Goal Loop):** 분 단위의 즉시 목표 달성 (적 집단 소탕, 퀘스트 완료)
3. **매크로 루프(Long-term Goal Loop):** 시간 단위의 전체 진행 (레벨 완료, 보스 격파, 승리 조건)

Daniel Cook의 "재미 기계(Fun Machine)": 메커닉 시스템이 "자원"(보상, 진행, 만족)을 생산하고, 이 자원이 다음 루프에 투입되는 순환 구조.

**3.5 밸런싱:**
- **대칭적 밸런싱:** 모든 플레이어/팩션이 동일한 자원과 옵션으로 시작
- **비대칭적 밸런싱:** 다른 출발점에서 동등한 승률 달성
- **양적 방법:** 수학적 모델링, 시뮬레이션, 간소화된 게임 이론
- **질적 방법:** 전문가 플레이테스트, 휴리스틱 분석
- 한 메커닉의 변경이 전체 시스템에 연쇄 효과를 일으킬 수 있으므로 체계적 시스템 사고 필요

### Ch.4 - 경제 설계 (Economy Design) [개요]

가상 경제의 근본 원리, 수도꼭지(자원 투입)/배수구(자원 회수) 메커니즘, 인플레이션/디플레이션 관리, F2P 수익화 모델의 윤리적 설계.

### Ch.5+ - 레벨/월드/UI/플레이테스트/AI (후반부 개요)

- **레벨 디자인:** 난이도 곡선, 공간 구성, "kishōtenketsu" 구조
- **월드 빌딩:** 일관된 세계관과 환경 스토리텔링
- **UI/UX 디자인:** 인지 부하 최소화, 접근성, 정보 계층
- **플레이테스팅:** A/B 테스트, 텔레메트리 분석, 강화학습 기반 자동 밸런싱
- **AI:** 행동 트리, 유한 상태 기계, 절차적 콘텐츠 생성(PCG)

---

## ProjectZ 시사점

### 1. 캠핑카 (The Camper Van)

- 캠핑카와의 상호작용은 Norman의 **3단계 감정 디자인**을 모두 활성화해야 한다:
  - 본능적: 투박하고 거친 외관, 엔진 소리의 중후한 물리적 인상
  - 행동적: 탑승/하차, 수리, 업그레이드의 반응적이고 만족스러운 조작감
  - 성찰적: "우리 팀의 이동 거점"이라는 의미 부여, 파괴 시의 상실감
- 캠핑카 방어는 SDT의 **세 가지 욕구를 동시에 충족**: 유능감(방어 성공), 자율성(방어 전략 선택), 관계성(팀 협력)
- 캠핑카의 HP 변화는 **Russell 원형 모델**에서 각성 수준을 조절하는 도구. HP 감소 시 고각성/부정(불안), 수리 완료 시 저각성/긍정(안도)

### 2. 자원 기반 총기 제작 (Gun Crafting)

- 총기 제작은 **플로우 채널**의 동적 조절 메커니즘이다. 자원이 풍부하면 강력한 총기 → 도전이 낮아짐 → 자원 부족으로 전환 → 도전 증가 → 기술 성장과 함께 자연스러운 플로우 유지
- 제작 과정의 **즉각적 피드백** 설계가 핵심: 자원 투입 시 시각/청각 피드백, 조합 결과의 즉시 확인, 성공적 제작 시 만족스러운 완성 효과음
- 총기 메커닉은 **깊이(Depth)와 우아함(Elegance)의 균형**: 소수의 자원 유형(Scrap Parts, Tech Unit)으로 다양한 총기 조합이 발현되는 시스템
- Genshin Impact 원소 반응처럼 **발현적 잠재력**: 특정 부품 조합에서 예상치 못한 시너지가 나타나면 발견의 즐거움 제공

### 3. 자원 기반 전략 플레이 (Resource Strategy)

- 매치 내 경제는 **수도꼭지/배수구** 설계의 핵심 적용 영역. 자원 스폰(수도꼭지)과 총기 제작/팀 업그레이드 소비(배수구)의 균형이 매치 리듬을 결정
- **기대-가치 이론** 적용: 중앙 지역의 Core Module은 높은 가치(팀 업그레이드) + 낮은 성공 기대(위험 지역) = 높은 동기 대상. 주변 지역의 Scrap Parts는 낮은 가치 + 높은 성공 기대 = 안정적 동기
- **인지 편향 활용**: 손실 회피를 활용하여 자원 손실의 위협이 자원 획득의 보상보다 강한 동기로 작동하게 설계
- **매크로 루프**: 자원 수집(마이크로) → 총기 제작(메소) → 팀 업그레이드/캠핑카 방어(매크로)의 중첩된 루프가 매치 전체의 진행 구조를 형성

### 일반 적용

- **MDA 역순 설계**: 목표 미학(Aesthetics) = "투박한 생존 속의 전략적 긴장" → 필요한 다이나믹 = "희소 자원 경쟁 + 팀 협력 + 공학적 제작" → 메커닉 = "자원 수집/소비 + 조합 제작 + 팀 공유"
- **다크 패턴 회피**: ProjectZ는 프리미엄 게임이므로 F2P 다크 패턴(인위적 시간 제한, 가변 비율 보상) 대신 게임플레이 자체의 내재적 동기에 집중
- **밸런싱 프로세스**: 비대칭 밸런싱(팀 구성 차이) + 양적 방법(시뮬레이션) + 질적 방법(플레이테스트) 병행이 필수
- **게임 루프 검증**: 마이크로 루프(사격 feel) → 메소 루프(교전 만족) → 매크로 루프(매치 전략) 각 수준에서 별도의 플레이테스트 필요

---

## 핵심 인용/개념

> "Think like a scientist, feel like an artist, and build like an engineer, all informed by a deep understanding of the human factor and sociocultural context."

> "Games are not neutral artifacts; they convey values, shape perceptions, influence behaviour and have a tangible impact on the lives of individuals and society."

> "It is not enough to create a game that is 'effective' in achieving its engagement or monetization goals; you need to constantly ask yourself, 'What is the impact of this design on my player's well-being?'"

> "A game designer is not an isolated expert in a single discipline, but rather an integrator and orchestrator of different knowledge."

> "Emergence refers to the ability of a system to generate complex and often unpredictable behaviors and patterns from the interaction of simpler components."

> "The solidity of the core mechanics is the foundation on which the entire gaming experience rests."

**핵심 프레임워크:**
- SDT 3가지 욕구: 유능감(Competence), 자율성(Autonomy), 관계성(Relatedness)
- 플로우 채널: 도전-능력 균형의 동적 유지
- Norman의 3단계 감정 디자인: 본능적 → 행동적 → 성찰적
- MDA 모델: Mechanics → Dynamics → Aesthetics
- 게임 루프 3단계: 마이크로(초) → 메소(분) → 매크로(시간)
- Russell의 2차원 감정 모델: 쾌/불쾌(valence) x 각성/이완(arousal)
- Kahneman의 이중 시스템: System 1(직관) vs System 2(분석)
- 핵심 메커닉 5원칙: 명확성, 깊이, 우아함, 즉각적 피드백, 발현적 잠재력
- 윤리적 설계 원칙: 선행, 무해, 자율 존중, 정의, 인간 존중
