# Designing Virtual Worlds - 요약

## 기본 정보

- **제목**: Designing Virtual Worlds
- **저자**: Richard A. Bartle, Ph.D.
- **출판**: 2003 (원판), Creative Commons 4.0 (CC BY-NC-ND) 라이선스로 재배포
- **저자 배경**: 1978년 최초의 가상 세계 MUD(Multi-User Dungeon)를 공동 제작. Essex University AI 강사 출신. 온라인 게임 산업의 선구자.

---

## 핵심 주제

- **가상 세계의 역사와 진화**: MUD(1978)부터 EverQuest, Ultima Online까지의 5세대 발전사
- **가상 세계 설계의 근본 원칙**: 파생적 디자인의 위험성과 "왜"를 이해하는 것의 중요성
- **플레이어 유형론**: Achievers, Explorers, Socializers, Killers - 4가지 플레이어 유형과 상호 역학
- **세계 설계(World Design)**: 물리, 경제, 사회 시스템의 총체적 설계
- **윤리적 고려**: 가상 세계 운영의 도덕적 책임

---

## 장별/섹션별 요약

### Chapter 1: 가상 세계 소개 (Introduction to Virtual Worlds)

**정의와 핵심 특성:**
- 가상 세계(Virtual World): "상상과 현실이 만나는 곳"
- 핵심 5가지 특성: (1) 자동화된 물리 규칙, (2) 캐릭터를 통한 대리 경험, (3) 실시간 상호작용, (4) 공유된 환경, (5) 지속성(Persistence)
- 채팅방은 물리가 없어서 가상 세계가 아니고, 전략 워게임은 단일 캐릭터 매핑이 없어서 해당 안 됨

**5세대 역사:**

1. **제1세대 (1978-1985)**: MUD1 탄생. Roy Trubshaw와 Richard Bartle가 Essex University에서 개발. MUDDL 언어. 36인 동시접속 한계. 가상 세계 설계의 핵심 이슈 대부분이 이미 발견됨.

2. **제2세대 (1985-1989)**: MUD1에서 파생된 Shades, Gods, MirrorWorld 등장. 상업화 시작. CompuServe, CompuNet에서 MUD1 서비스. Federation II (최초의 SF 설정 MUD). 핵심 이슈에 대한 프로토콜과 도구가 1987년경 확립되었으나, 후속 세대로 전달되지 못함.

3. **제3세대 (1989-1995)**: AberMUD가 Unix C로 포팅되며 폭발적 확산. 3대 파생: TinyMUD(사회적 세계), LPMUD(플레이어 확장성), DikuMUD(전투 중심). TinyMUD에서 MOO, MUSH 등 사회적 가상 세계 분화. NSFnet 트래픽의 10%가 MUD. 기성 코드베이스 사용으로 "왜 그렇게 되어 있는지" 이해 없이 디자인하는 문제 발생.

4. **제4세대 (1995-1997)**: AOL 시대. Gemstone III, Dragon's Gate가 월 100만 달러 이상 수익. NeverWinter Nights. AOL 정액제 전환으로 수익 모델 붕괴. 독립 인터넷 서비스로 이전 시 95% 플레이어 이탈.

5. **제5세대 (1997-현재)**: 그래픽 시대.
   - **Ultima Online (1997)**: Raph Koster 리드. 커뮤니티 빌딩, 플레이어 주도 액션, 다양한 플레이 스타일 수용. 100,000 구독자 달성으로 업계 기준 확립. 혁신이 과했던 부분 (생태계 모델 붕괴, 경제 인플레이션)과 성공의 부작용 (CS 확장성 문제).
   - **Meridian 59 (1996)**: 최초 3D 가상 세계. Mike Sellers, Damion Schubert 설계. 시기상조 + 저예산 + 부족한 콘텐츠로 성공 미달. 디자인이 아닌 비즈니스 결정이 실패 원인.
   - **EverQuest (1999)**: "DikuMUD + 그래픽 클라이언트." 적절한 시기 출시가 성공의 핵심. 임계 질량(Critical Mass) 달성 - 소규모 그룹 플레이 장려로 사회적 결합 형성. EQ 패러다임이 이후 모든 MMO의 기준이 됨.
   - **Asheron's Call (1999)**: 존 없는 심리스 월드(Dynamic Load Balancing), 스토리 아크 시스템. EQ보다 늦은 출시로 80,000 구독자에 그침.

**핵심 교훈:**
- 가상 세계 설계의 핵심 이슈들은 이미 1987년에 확인되었으나, 세대를 거치며 "왜"에 대한 이해가 유실됨
- "이전 세계가 왜 그렇게 만들어졌는지 모르면, 그 결정이 여전히 유효한지 어떻게 알 수 있는가?"
- 임계 질량(Critical Mass)의 중요성: EQ는 충분한 플레이어를 확보했기에 실수에도 살아남았고, M59는 그러지 못해 사소한 실수에도 치명타

### Chapter 2: 가상 세계를 만드는 법 (How to Make Virtual Worlds)

- 가상 세계 제작의 실무적 측면
- 서버 아키텍처, 클라이언트-서버 통신
- 콘텐츠 제작 파이프라인
- 테스팅과 런칭

### Chapter 3: 플레이어 (Players)

- **Bartle의 플레이어 유형론**: Achievers(성취자), Explorers(탐험가), Socializers(사교가), Killers(살육자)
- 4가지 유형 간의 역학 관계와 생태계 밸런스
- 플레이어 심리와 동기
- 캐릭터와 정체성의 관계

### Chapter 4: 세계 설계 (World Design)

- 물리 시스템, 경제 시스템, 사회 시스템의 설계
- 공간과 지리의 설계
- 퀘스트와 콘텐츠 설계
- 레벨 디자인과 난이도 진행

### Chapter 5: 가상 세계 속의 삶 (Life in the Virtual World)

- 플레이어 행동 패턴
- 커뮤니티 형성과 관리
- 그리핑, PvP, 분쟁 해결
- 고객 서비스와 운영

### Chapter 6: 게임이 아닌 것들 (It's Not a Game, It's a...)

- 가상 세계의 비게임적 활용
- 교육, 사회적 상호작용, 예술적 표현
- "가상 세계는 자유에 관한 것 - 주민뿐 아니라 디자이너에게도"

### Chapter 7: 비평적 미학을 향하여 (Toward a Critical Aesthetic)

- 가상 세계 디자인의 예술적 측면
- 디자인 비평의 프레임워크

### Chapter 8: 코다: 윤리적 고려 (Ethical Considerations)

- 가상 세계 운영의 도덕적 책임
- 플레이어 권리와 디자이너의 의무

---

## ProjectZ 시사점

### 캠핑카 (The Camper Van)
- **지속성(Persistence)의 교훈**: UO의 주택 시스템과 유사하게, 캠핑카는 플레이어의 지속적 투자가 반영되는 "집"이다. UO에서 주택이 극도의 애착을 유발한 것처럼, 캠핑카도 플레이어의 감정적 투자를 극대화할 수 있다.
- **생태계 설계의 교훈**: UO의 생태계 모델이 "플레이어가 모든 것을 죽이면서" 붕괴한 것처럼, 캠핑카 주변의 자원/좀비 생태계도 플레이어 행동에 의한 극단적 상황을 대비해야 한다.

### 총기 제작 (Gun Crafting)
- **플레이어 유형별 접근**: Achievers는 최적 빌드를 추구하고, Explorers는 다양한 조합을 실험하며, Socializers는 팀원에게 무기를 만들어주는 것에서 즐거움을 찾는다. 총기 제작 시스템이 다양한 플레이어 유형을 만족시켜야 한다.
- **"왜"의 이해**: 다른 게임의 제작 시스템을 참조할 때, "왜 그렇게 되어 있는지"를 이해하지 않으면 ProjectZ의 맥락에 맞지 않는 요소를 도입할 위험이 있다.

### 자원 기반 전략 (Resource Strategy)
- **임계 질량(Critical Mass)**: 팀 기반 게임에서 팀 내 사회적 결합이 핵심. EQ가 소규모 그룹 플레이를 장려하여 임계 질량을 달성한 것처럼, ProjectZ의 팀 시스템이 사회적 결합을 촉진해야 한다.
- **경제 붕괴 방지**: UO의 경제가 버그로 인한 초인플레이션으로 붕괴한 사례. 자원 경제의 Faucet/Sink 밸런스를 엄격하게 관리해야 하며, 익스플로잇 가능성을 사전 차단해야 한다.
- **비즈니스 결정 vs 디자인**: M59의 교훈 - "디자인이 아니라 비즈니스 결정이 게임을 죽였다." 좋은 디자인도 잘못된 운영 결정 앞에서 무력할 수 있다.

### 전반적 설계 원칙
- **파생적 디자인 경계**: "다른 게임이 그렇게 하니까"가 아닌, ProjectZ만의 맥락에서 "왜"를 항상 질문할 것
- **보존과 전달**: 디자인 결정의 이유를 GDD에 명확히 기록하여 "왜"가 유실되지 않도록 할 것 (이것이 GDD 5단계 구조의 "Reasoning"에 해당)
- **Bartle의 경고**: "가상 세계를 설계하는 것은 당신이 뭘 하는지 알지 못하면 매우 어렵다; 알면 다른 복잡한 설계 활동만큼만 어렵다"

---

## 핵심 인용/개념

> "The aim of this book is to make people think about virtual world design. Whether you agree with any of it is not an issue, as long as you advance your own thoughts on the subject."

> "I don't care what you think, so long as you think."

> "Too much virtual world design is derivative. Designers take one or more existing systems as foundations on which to build, sparing little thought as to why these earlier worlds were constructed the way they were."

> "If designers don't know the reasoning behind earlier decisions, how can they be sure that the conditions that sustained those decisions still apply when they act on them?"

> "Are designers even aware that there are decisions they can unmake?"

> "Virtual worlds are unlike anything else. You can't approach them from a background in some other area and expect all the normal rules to apply."

> "To design a virtual world is perhaps the greatest act of creative imagination there can be. The possibilities are absolutely limitless."

> "Today's virtual worlds are mere children's scribbles compared to the masterpieces to come."

> "Games that were launched 10 years later had to rediscover some of the fundamentals the hard way." (지식 유실에 대해)

> "Whatever the reasons people had for starting to play the game, they continued to play because of the other people they had met there." (EQ의 임계 질량에 대해)


**Q1: ProjectZ의 GDD 5단계 구조(특히 "Reasoning" 섹션)가 Bartle가 경고한 "왜에 대한 이해 유실" 문제를 얼마나 효과적으로 방지할 수 있을까요?**


**Q2: Bartle의 4가지 플레이어 유형(Achievers, Explorers, Socializers, Killers)이 ProjectZ의 자원 기반 전략 TPS에서 각각 어떤 방식으로 만족감을 얻을 수 있을까요?**


**Q3: UO의 경제 붕괴와 생태계 모델 실패 사례에서 ProjectZ의 자원 시스템 설계가 배워야 할 구체적인 안전장치는 무엇일까요?**
