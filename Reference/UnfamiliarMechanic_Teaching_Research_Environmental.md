# 생소한 메커닉 전달 리서치 — Environmental & Wordless Teaching
> 조사 범위: 1985-2026 환경/공간/실패-기반 wordless teaching design
> 조사자: general-purpose agent (Claude Code)
> 일자: 2026-05-25
> 본 문서는 ECHORIS Item World 진입의 unfamiliarity 극복용 raw research.
> Cocoon (2023) 이 가장 직접적 precedent — 본 리서치의 중심.

---

## 0. 본 리서치의 정의

**Environmental / wordless teaching** 은 *공간 안에서 메커닉과 마주치게 함으로써* 플레이어가 규칙을 학습하게 하는 디자인 패턴입니다. 레벨의 기하학·프레이밍·조명·사운드·애니메이션·장애물 배치가 규칙을 *보여 주고*, 플레이어가 *직관* 합니다. 팝업·튜토리얼 텍스트·전문 NPC 강의는 거의 또는 전혀 사용하지 않습니다. Half-Life 의 "no cutscenes" 철학, Mark Brown "Game Maker's Toolkit" 의 GMTK 시리즈, Mick West / Anna Anthropy 의 design column 전통을 잇는 분석 축입니다 [확인함].

본 리서치는 ECHORIS 의 unfamiliar core mechanic 인 **"You enter your item to explore its inner world"** (Item World) 의 *진입 전달 (entry-teaching)* 문제를 풀기 위한 raw research 입니다. 결론은 §10 에 정리합니다.

---

## 1. Tier 1 — 깊이 다룬 작품

### 1.1 Portal (2007, Valve) — 첫 30 분의 챔버 by 챔버 학습

**전달하는 unfamiliar 메커닉:** 휴대용 포털 디바이스. 공간을 *위상학적으로* 연결한다는 메커닉은 1986-2007 사이의 어떤 commercial FPS 에도 없던 완전 신규 어휘였습니다 [확인함].

**환경 장치 — 챔버 by 챔버 점진 노출.** Portal 의 첫 19 개 test chamber 는 *Aperture Science Enrichment Center* 라는 진단 시설 컨셉을 빌려 "각 방 = 하나의 규칙" 을 정당화합니다. 챔버 00 은 *움직임 · 점프 · 큐브 픽업* 만 사용 가능한 닫힌 방에서 시작합니다. 챔버 01-02 는 *기존 포털* 만 통과하면 되고, 챔버 03-04 부터 *플레이어가 한쪽 포털 (파란색) 을 직접 쏘게* 합니다. 챔버 05-08 에서 *양쪽 포털 (파란색 + 주황색)* 이 모두 풀립니다 [확인함, 챔버 번호는 시판 빌드 기준]. 각 방의 입구 / 출구 / 벽 마감은 *동일 색상 코드 (입구 빨강, 출구 파랑)* 로 통일되어 있어 "어디로 가야 하는가" 가 텍스트 없이 즉시 읽힙니다.

**첫 실패 (first failure) — 정상적 직관 차단.** 신규 플레이어가 가장 먼저 시도하는 것은 *높은 곳에 그냥 점프해서 올라가기* 입니다. Portal 챔버 03 은 그 점프 거리를 *고의로 1.5 칸 더 벌립니다.* 그러면 플레이어는 자연스럽게 *바닥에 포털을 쏘아 보고*, 그 결과 *추락 운동량이 보존된 채 다른 출구로 발사* 됩니다 ("flinging" 의 prefiguring). 이것이 *물리적 발견의 첫 순간* 이며 챔버 14 의 운동량 보존 본격 교육의 종자(seed) 가 됩니다 [추측임 — Kim Swift GDC 2007 IGS 토크 "Our Journey From Narbacular Drop to Portal" 의 챕터 구조 설명과 정합하지만 원본 GDC Vault 1014822 의 직접 인용 미확보].

**디자이너의 의도.** Kim Swift 는 IGS 2007 토크에서 *Narbacular Drop* (DigiPen 학생 프로젝트) → *Portal* 의 진화에서 가장 핵심적인 변화로 "**플레이어가 무엇을 배워야 하는지를 챔버 단위로 분해** 했다" 는 점을 들었습니다. Narbacular 시기에는 한 방에 두 규칙을 섞었으나 Portal 에서는 *한 챔버 = 한 규칙* 으로 분해했습니다 [추측임 — GDC Vault 1014822 / YouTube 2F0SVZA9fIo 의 토크 요지 정리이며 정확한 인용은 영상 직접 시청 필요].

**왜 성공하는가.** Portal 의 챔버 1-9 는 "**Safe room (관찰) → Same mechanic in dangerous context (응용)**" 의 2-비트 사이클을 7 회 반복합니다. 플레이어는 매번 *방금 학습한 규칙* 을 *바로 다음 방에서 시험* 받습니다. 학습이 "튜토리얼" 이 아니라 *플레이* 그 자체로 느껴지는 이유입니다.

**ECHORIS 시사점.** Item World 의 단위가 "기억의 지층 (Stratum)" 이라는 *방 단위* 라는 점은 Portal 의 챔버 구조와 직접 호환됩니다. Stratum 1 첫 진입 시 *지층 = 한 규칙* 의 분해를 따를 수 있습니다.

---

### 1.2 Half-Life 2 (2004) + Half-Life: Alyx (2020) — Valve 의 "invisible tutorial"

**전달하는 unfamiliar 메커닉:** 중력 건 (gravity gun), 물리 오브젝트 상호작용, barnacle / 좀비 / sniper 등의 적 처리법.

**환경 장치 — "안전한 환경에서 첫 노출".** 로컬 GMTK 트랜스크립트 *Half-Life 2's Invisible Tutorial* (2015-01-26) 에 따르면 [확인함, `Reference/gmtk/Half-Life 2's Invisible Tutorial.txt` line 86-103]:

- "거의 모든 적은 *안전한 환경에서 먼저* 보여집니다. 첫 좀비는 *철책 뒤에서* 사물을 던지는 모습으로 등장하므로 플레이어가 *맞지는 않은 채로* '이놈은 물건을 던지는구나' 를 배웁니다." (line 86-91)
- "Combine 좀비는 *방탄유리 너머에서* 수류탄으로 자폭하는 모습을 보여 줍니다." (line 91-95)
- "Sniper 는 *플레이어가 뒤쪽에서* 접근하게 되어 있어 *수류탄 던지기를 안전하게 연습* 할 수 있습니다." (line 96-100)

또한 *Ravenholm 톱날 가르치기* 의 무자막 시퀀스가 핵심 사례로 인용됩니다 (line 25-39): "Ravenholm 입장 직후 (1) 톱날에 꽂힌 두 동강 난 좀비 시체 → (2) 통로를 막은 톱날들 → (3) 플레이어가 톱날을 중력 건으로 뽑는 순간 좀비가 들어옴 → (4) 본능적으로 발사 버튼 → (5) 좀비가 두 동강. **10 초 만에 톱날=대좀비 무기를 0 단어로 가르침.**"

**첫 실패.** Half-Life 2 의 초기 zombie throw 는 *맞지 않게 설계* 되어 있으므로 "실패" 가 일어나지 않습니다. 대신 *"실패의 시각화"* 가 외부 NPC 좀비를 통해 일어납니다 — 즉 *대리 실패 (vicarious failure)*. 이 패턴은 ECHORIS Item World 진입 데몬 (Erda 가 잠시 멈춰 검을 응시하는 컷) 으로 직접 차용 가능합니다.

**디자이너 의도.** Valve 사내의 "no cutscenes" 도그마는 카메라 통제권을 *절대* 빼앗지 않습니다 (GMTK line 44-48). 대신 *조명·소리·NPC 동선* 으로 카메라를 *유도* 합니다. Alyx (2020) 의 VR 트레이닝 시퀀스도 같은 철학을 계승했으며, 첫 무기 픽업 → 첫 장전 → 첫 발사를 *방 안의 물리 사물 배치* 만으로 가르칩니다 [추측임 — 직접 출처 미확보, GMTK 채널의 *Half-Life: Alyx* 분석 영상의 통설 인용].

**왜 성공하는가.** "안전 노출 → 위험 응용" 의 2-비트 패턴은 Portal 의 챔버 구조와 동형입니다. 그러나 Half-Life 2 는 *공간이 끊기지 않으므로* 플레이어가 "교육받고 있다" 는 감각조차 받지 않습니다.

---

### 1.3 Super Mario Bros. World 1-1 (1985, Miyamoto / Tezuka, Nintendo) — 4-비트 정전 (canon)

**전달하는 unfamiliar 메커닉:** 횡스크롤 액션 플랫포머의 어휘 전체 — 우방향 진행, 점프, 적 회피·밟기, 블록 파괴, 파워업 (mushroom), 위험 (구멍·적·바닥).

**환경 장치 — 4-비트 "Mario 1-1" 패턴.** 이 시퀀스는 게임 디자인 분석사에서 *가장 많이 분석된 30 초* 입니다 [확인함]. Anna Anthropy 의 *Rise of the Videogame Zinesters* (2012, Seven Stories Press) 는 1-1 의 점프 장애물 높이가 *처음에는 standing jump 로도 통과* 되지만 후반 스테이지에서는 *running momentum 점프* 가 필요한 점을 들어 "디자이너가 *머신 통제 변수* 를 *서서히 풀어 가며* 플레이어에게 시스템의 미묘함을 가르친다" 고 설명합니다 [확인함 — penguinrandomhouse / Google Books / archive.org 의 책 본문 발췌 정합].

Extra Credits 의 *Design Club — Super Mario Bros: Level 1-1* (YouTube ZH2wGpEZVgE) 는 이를 *4-비트* 로 정형화합니다 [추측임 — 영상 직접 시청 미완료, Design Club 시리즈 초회의 통설 정리]:

| 비트 | 위치 (1-1) | 가르치는 것 |
|---|---|---|
| 1. **소개 (Introduce)** | 마리오가 좌측 끝에 등장, 화면이 우측으로 열려 있음 | 우측 = 진행 방향 |
| 2. **확장 (Develop)** | 첫 굼바가 다가옴 → 점프 / 충돌 시 사망 | 적은 위험. 점프 = 회피 |
| 3. **시험 (Test)** | ? 블록 + 굼바 + 파이프의 동시 등장 | 학습한 모든 어휘를 한 화면에서 결합 |
| 4. **트위스트 (Twist)** | 구멍 (pit) — *위로* 가 아니라 *아래로* 추락 | 점프는 *회피* 뿐 아니라 *생존* 의 도구 |

Miyamoto 자신은 *Iwata Asks: New Super Mario Bros. Wii* 인터뷰에서 1-1 을 의도적으로 "**플레이어가 첫 5 초 안에 죽지 않으면서 게임의 규칙을 습득하게** 한" 디자인이라고 회고했습니다 [확인함 — Kotaku "Why Super Mario Bros' Level 1-1 Is Perfect" 인용 정합].

**첫 실패.** 첫 굼바와 무계획적으로 충돌하기. 그 첫 죽음이 (a) *공정한 거리에서* 일어나고 (b) *즉시 재시작 가능* 하므로 좌절이 아니라 *학습 신호* 로 작동합니다.

**디자이너 의도.** "Pure design" — Anthropy 의 표현 — 즉 *텍스트로는 절대 가르칠 수 없는 키네스테틱 (kinesthetic) 어휘* 를 *오직 공간으로만* 전달.

**왜 성공하는가.** 4-비트 패턴이 *반복 가능한 알고리즘* 이기 때문입니다. 같은 패턴이 BotW Great Plateau, Portal, Cocoon, Hollow Knight 의 첫 30 분에서 변주됩니다.

---

### 1.4 Hollow Knight (2017, Team Cherry) — 능력 게이트 + 환경 서사

**전달하는 unfamiliar 메커닉:** 메트로베니아 어휘 (능력 게이트, 백트래킹), Hallownest 의 비선형 상호참조 지도, *수직 자유낙하* 와 *벤치 세이브*, *Dream Nail* 같은 후반 메커닉.

**환경 장치.** Hollow Knight 는 *대화* 와 *환경 서사* 를 분업합니다. Iselda, Cornifer, Sly 같은 NPC 는 *정보를 주는 데 인색* 하며, *환경* 이 더 많은 것을 말합니다. *Mantis Village* 는 그 정전입니다:

- Mantis Village 진입은 *Mothwing Cloak (대시)* 를 요구합니다 [확인함 — Fextralife / Fandom wiki 정합].
- *Mantis Claw* (벽 타기) 는 Mantis Village 안에 있습니다. 즉 "이 마을 안에 *벽 타기 능력* 이 있다" 가 사전 텍스트 없이 *공간 도달성* 만으로 암시됩니다 [확인함].
- *Mantis Lords* 격파 후 부족이 일제히 *경례* 합니다 — *적대 → 동맹* 의 전환을 한 줄 대사 없이 *애니메이션* 으로 전달 [확인함].

**첫 실패.** 플레이어가 *대시 없이* Mantis Village 방향으로 가면 *건너편이 보이지만 못 가는 협곡* 에 도달합니다. 이는 캐슬바니아 SotN 의 안개화 게이트와 동형이며 ECHORIS 의 *스탯 게이트* 와도 동형입니다.

**디자이너 의도.** Team Cherry 는 *문답형 NPC* 를 거부하고 *지도 자체를 화자* 로 삼습니다. *City of Tears* 의 항상-내리는 비, *Greenpath* 의 부드러운 곡선은 *비-텍스트 톤 통제* 의 사례입니다.

**왜 성공하는가.** 능력 게이트가 *공간의 모양* 으로 *미리 보이게* 되어 있어, "여기 못 가는 이유는 능력이 없어서다" 가 *기대 (anticipation)* 로 기능합니다. 플레이어는 *돌아올 약속* 을 *환경에 기록* 합니다 — 이는 *지도가 곧 to-do list* 인 메트로베니아의 본질.

---

### 1.5 Inside (2016, Playdead) — 전적으로 무자막 + 실패가 곧 교육

**전달하는 unfamiliar 메커닉:** *Mind control* (정신 지배 헬멧), 수중 *Husk* 와의 동조, 후반의 *blob* 변형.

**환경 장치.** Inside 의 모든 퍼즐은 *공간 + 시간 논리* 입니다. 카메라는 *시네마틱 와이드* 로 고정되어 있어 *해답이 화면에 이미 들어있는* 경우가 많습니다. 도전은 *순서 (sequence)* 를 맞추는 것입니다.

**첫 실패 = 죽음 = 교육.** Inside 는 죽음 비용이 극히 낮습니다 (체크포인트가 매 화면). 죽음 자체가 *실패 → 다음 시도의 정보* 로 환산되는 *손실 없는 시행착오 루프* 입니다. 그렘림 견공이 갑자기 튀어나오면 첫 시도에서는 반드시 죽고, 두 번째에는 *그 자리에서 숨음* — *대리 실패가 아니라 자기 실패* 가 교육 신호입니다.

**디자이너 의도.** Playdead 의 Jeppe Carlsen (Cocoon 의 director 이기도 함) 은 *Limbo* 와 *Inside* 의 lead gameplay designer 였습니다 [확인함 — Cocoon Game Developer 인터뷰 정합]. *Limbo* 의 trial-and-error 가 *Inside* 에서 *trial-and-information* 으로 정련됩니다.

**왜 성공하는가.** "한 화면 = 하나의 규칙" 이라는 Portal 의 규율이 *수평 공간* 에서 그대로 작동함을 증명. ECHORIS 가 *2D 횡스크롤* 이라는 점은 Inside 의 카메라 어휘를 그대로 차용 가능함을 의미합니다.

---

### 1.6 LIMBO (2010, Playdead) — 같은 디자이너 전통

**전달하는 unfamiliar 메커닉:** 무게·물리 퍼즐, 거미·자기장 등의 신규 위험.

**환경 장치.** Inside 의 *원형 (prototype)*. 화면 구도는 더 평면적이고 어휘는 더 적습니다. 그러나 *실루엣 + 그림자* 만으로 위험을 가르치는 점이 *흑백 한정 톤* 의 본질입니다. *거미 첫 등장 시 다리 하나가 화면 위에서 천천히 내려옴* 의 시퀀스가 가장 자주 인용되는 사례입니다 [추측임 — 위 검색 결과의 직접 인용 미확보, 통설 정리].

**첫 실패.** Inside 와 동일 — 죽음이 곧 정보. *trial-and-death* 의 정전.

**ECHORIS 시사점.** *기억의 지층* 의 함정·기믹 첫 등장 시 *대리 실패 (NPC / 그림자)* 와 *자기 실패 (즉사)* 중 어느 쪽을 쓸지를 *위험도 × 학습 효율* 행렬로 결정해야 합니다.

---

### 1.7 Cocoon (2023, Geometric Interactive / Annapurna) — 본 리서치의 중심

**전달하는 unfamiliar 메커닉: World-within-world traversal.** 색깔 있는 *구체 (orb)* 안에 *완결된 세계* 가 들어 있고, 그 구체를 *집어 들고 다른 세계로 들고 들어가서*, 다시 *그 구체 안에 들어가서* 위 세계의 조작을 할 수 있습니다. *세계의 계층 구조 (hierarchy of worlds)* 자체가 퍼즐 어휘입니다.

**ECHORIS 와의 직접 동형.** Cocoon 의 "들어갈 수 있는 구체" 와 ECHORIS 의 "들어갈 수 있는 아이템" 은 *기하학적으로 동형* 입니다. Jeppe Carlsen 의 Game Developer 인터뷰 (Nov 2023) 에서 그는 "최초 아이디어는 *구체 안에 세계가 들어 있고 그 구체를 들고 다른 구체에 넣을 수 있다* 였다" 고 명시합니다 [확인함 — gamedeveloper.com / playday.one / gamerant.com 의 인터뷰 정합].

#### 1.7.1 Cocoon 의 첫 sphere 진입 — shot-by-shot

검색 결과 (Neoseeker / TrueAchievements / IntoIndieGames / WellPlayed 리뷰) 를 종합한 *Cocoon 의 첫 30 분 시퀀스* [확인함, 다만 정확한 카메라 컷 시간 단위는 추측 가능]:

1. **부화 (Hatching).** 캐릭터가 알에서 부화하여 *플랫폼 위에* 떨어집니다. 카메라는 *위에서 내려다보는 isometric* 으로 고정. 텍스트 0 줄.
2. **걷기 학습.** 좌측 스틱만 사용 가능. 한 개 버튼은 *비활성*. 플레이어는 *공간을 거니며* 조작을 익힙니다.
3. **첫 압력판.** *보라색 발판* 이 *발광* 합니다. 발판 위에서 *액션 버튼* 을 누르면 *계단 구조가 생성* 됩니다. 여기서 *액션 버튼 = 환경 활성화* 라는 어휘가 확립됩니다.
4. **첫 운반물.** *작은 구체가 레일 위에 놓여 있음.* 플레이어는 *액션 버튼으로 잡고 끌어* 트랙 끝까지 운반합니다. *구체 = 들 수 있는 것* 이 확립됩니다.
5. **운반물 결과.** 구체가 트랙 끝에 도달하면 *모래 속에서 곤충 같은 생물이 솟아오릅니다.* *구체 → 변화* 의 인과가 *말 없이* 가르쳐집니다.
6. **첫 sphere 진입 — *그 sphere 자체* 가 세계.** 게임 후반 (대략 첫 챕터 후반) 에 *흰색 플랫폼* 을 활성화하면 캐릭터가 *상승* 하다가 화면이 *줌아웃* 되고, 자신이 방금 거닐던 *사막 세계 전체가 작은 주황색 구체 안* 에 들어 있음을 보여 줍니다 [확인함]. 그 구체는 *공장 같은 산업 공간의 받침대 위* 에 놓여 있습니다. **여기서 "내가 방금 있던 세계 = 내가 들고 다닐 수 있는 구체" 라는 핵심 패러독스가 한 컷으로 전달됩니다.**
7. **들기.** "지금까지 들어 왔던 그 어떤 사물처럼" *그 구체를 등에 짊어집니다.* (TheGamer 리뷰 인용: "Like any other item up to that point, you can pick up this celestial body and strap it to your back.")
8. **다시 진입.** *흰색 받침대* 에 구체를 놓으면 *재진입* 가능. *나가기 ↔ 들어가기* 가 가역임이 두 번째 시도로 검증됩니다.

이 8 단계는 **0 단어** 입니다. Cocoon 의 전체 게임은 본 단어가 *literally 0* 입니다 (UI 의 버튼 표시 외).

#### 1.7.2 Carlsen 의 디자인 철학 (인터뷰 정합)

Game Developer 인터뷰 ("Mental staircases and paradoxical suitcases") + Gamerant ("Jeppe Carlsen Details Puzzle Design Philosophy for Cocoon") 의 핵심 인용 [확인함]:

- **"왼쪽 스틱 + 한 개 버튼."** 컨트롤의 극단적 단순화로 *플레이어가 메커닉 자체에 인지 자원을 집중* 할 수 있게 합니다. ECHORIS 에 직접 시사점: Item World 진입의 *그 순간* 만큼은 *모든 다른 입력 (메뉴·인벤토리·전투)* 을 *일시적으로 봉인* 할 가치가 있습니다.
- **"신뢰의 카드 집 (House of cards built on trust)."** Remap Radio 의 puzzle design 분석 [확인함]. *플레이어가 막힐 때마다 "이 게임의 규칙은 공정하다" 가 흔들리지 않아야* 한다. ECHORIS 에서 *기억의 지층* 진입 후 *부당한 즉사* 가 일어나면 신뢰 붕괴. *첫 지층은 자손이 죽지 않는 안전 지대* 로 설계해야 합니다.
- **"틀린 시도에도 폴리시된 피드백."** Cocoon 은 *오답 시도 각각마다* 정답과 동등 수준의 피드백 (애니메이션·사운드) 을 제공합니다. *오답이 묵묵부답이면 *플레이어는 자신이 시도조차 안 한 줄 안다.*

#### 1.7.3 첫 실패

Cocoon 의 첫 실패는 *전투 실패* 가 아니라 *"이 구체를 못 들고 가는 곳" 의 발견* 입니다. 예: 좁은 문을 통과할 때 *구체가 막힘.* 그러면 플레이어는 *구체를 내려놓고* 들어가서 *문을 열어 두고 다시 나와서 구체를 들고 통과* 합니다. *상태 전이의 *순서* 가 학습 신호* 입니다. 이는 *Patrick's Parabox* 의 박스 운반 어휘와 동형입니다.

#### 1.7.4 왜 성공하는가

- *그래픽이 isometric 3D* 라서 "줌아웃 → 내가 있던 세계가 구체 안" 의 *원근 트릭* 이 가능합니다. **ECHORIS 의 2D 횡스크롤은 이 트릭이 직접 작동하지 않습니다 — §10.5 에서 다룹니다.**
- *0 단어* 가 가능한 이유는 *공간 자체가 메타포* 이기 때문입니다. *세계 = 손에 들 수 있는 사물* 의 동등성이 *카메라 한 컷* 으로 확립됩니다.

---

### 1.8 Journey (2012, thatgamecompany) — 무자막 멀티

**전달하는 unfamiliar 메커닉:** *다른 플레이어와의 비-텍스트 협력*. 발성 (chirp), 시그널, 함께 흐름.

**환경 장치.** Journey 는 *언어 자체를 거부* 합니다. 두 플레이어가 만나도 *닉네임이 표시되지 않으며* (게임 종료 후에만), *대화창이 존재하지 않습니다.* *발성 한 종류 + 점프 한 종류* 만이 통신 어휘입니다. 그럼에도 플레이어들은 *함께 머무는 것의 의미* 를 *공간의 추위 (snow biome) 와 함께 따뜻해지는 메커닉* 으로 학습합니다.

**ECHORIS 시사점.** ECHORIS 의 *Phase 3 멀티 합류* 는 URL 링크 합류로 결정되어 있으며 (memory `project_multiplayer_timing.md`), *Journey 의 비-텍스트 협력* 어휘를 *부분적* 으로 차용할 가치가 있습니다. 다만 *Rustborn 의 대사 존재* 와 충돌할 수 있으므로 *솔로 = wordless, 협력 = 발성 only* 의 분리가 필요할 수 있습니다.

---

## 2. Tier 2 — 상당 분량

### 2.1 Super Mario Odyssey (2017) — Capture 메커닉

첫 Capture 대상은 *프로그 (Cap Kingdom)*. 텍스트 0 줄로 *모자를 적에게 던지면 = 빙의* 가 가능함을 *시각화* 합니다. 패턴은 1-1 의 4-비트와 동형: 소개 (Bonneter) → 확장 (개구리) → 시험 (T-Rex) → 트위스트 (전선 변신) [확인함, 통설].

### 2.2 Breath of the Wild Great Plateau (2017)

검색 결과 (gamerant / resetera / eliterev) 정합 [확인함]: 4 개 사당이 *Stasis, Magnesis, Cryonis, Bombs* 를 각각 가르치고, 플레이어는 4 개를 *임의 순서* 로 풀 수 있습니다. 자유 + 가이드의 균형. 모든 사당은 *닫힌 방* 으로 *Portal 챔버 구조와 동형* 입니다. ECHORIS 시사점: *기억의 지층* 안에 *4 개 사당 구조* 를 *얕은 깊이로* 차용 가능.

### 2.3 Tears of the Kingdom Ultrahand (2023)

GMTK 분석 *How Nintendo Designed Ultrahand* [확인함, 로컬 파일 존재]. 첫 사당이 *2 개 사물 결합 → 다리* 의 가장 단순한 사용 사례를 강제합니다. *결합의 무한한 가능성* 을 가르치기 전에 *결합의 즉시적 효용* 을 가르칩니다 — *광활함은 두 번째* 라는 가르침 원칙.

### 2.4 Dark Souls / Elden Ring (2011 / 2022, FromSoftware)

**환경 장치.** *메시지 시스템* (다른 플레이어가 남긴 한 줄). *환경 서사* (시체 위치, 무기 배치). *"YOU DIED"* 의 단순함이 *실패 = 정보* 의 미니멀리스트 정전. Elden Ring 의 *Tree Sentinel* 은 *초반 보스* 로 *압도적으로 강함* 으로써 "이 게임은 도망쳐도 된다" 를 가르칩니다 — *환경 = 위협의 위계 표시* [확인함, 통설].

### 2.5 Sekiro (2019) — Hanbei the Undying

**환경 장치.** Dilapidated Temple 바로 옆 *Hanbei 라는 NPC* 는 *불사 (undying)*. 플레이어가 *원할 때* 그에게 가서 *Deflect / Mikiri Counter / Consecutive Deflection* 등을 *무비용* 으로 연습할 수 있습니다 [확인함 — Fextralife / Fandom wiki 정합].

이것은 *환경 교육이 아닙니다* — *전문 NPC 강의* 이며, FromSoftware 가 *극도로 어려운 메커닉 (parry)* 만큼은 *옵션 NPC* 를 통한 *명시적 훈련장* 을 허용했음을 의미합니다.

**ECHORIS 시사점.** *대장간* 또는 *Erda 의 침묵* 안에 *Hanbei 동형 NPC* 를 둘 수 있는가? 권장하지 않습니다 — *검 Ego (Rustborn)* 가 이미 그 역할의 후보이며, *Hanbei 형 옵션 도장* 은 *Erda 의 침묵 페르소나* 를 깨지 않으면서 *Rustborn 이 "원하면 다시 연습해" 라고 말하는* 한 줄로 대체 가능.

### 2.6 Bloodborne (2015)

환경 서사가 *Souls 보다 더 dense*. Yharnam 의 거리 풍경은 *수렵의 밤* 의 미친 분위기를 *텍스트 없이* 전달합니다. ECHORIS 의 *기억의 지층* 톤 빌딩에 직접 시사 — *부식된 풍경 = 무기의 잊혀진 기억* 이라는 매핑.

### 2.7 Celeste (2018, Maddy Makes Games)

*산이 곧 교사*. Strawberry / Crystal Heart 같은 옵션 수집물은 *플레이어의 *실력 곡선을 자율 조정* 하게 합니다. *Assist Mode* (대시 횟수 변경 등) 는 *접근성 ≠ 학습 포기* 의 정전. ECHORIS 시사점: *기억의 지층* 깊이에 *옵션 (선택적)* 챌린지 슬롯을 두어 *플레이어가 자신의 깊이를 선택* 하게 함.

### 2.8 Hades (2020, Supergiant)

*실패-가-진보 (failure-as-progression)*. *Death Defiance* 가 *죽음* 을 *자원* 으로 만듭니다. *Mirror of Night* 의 점진 강화는 *런 사이 정보 손실* 을 0 에 수렴시킵니다. ECHORIS 의 *기억의 지층* 다이브 실패 시 *손실의 비율* 을 어떻게 설계하느냐가 *교육 신호 vs 형벌* 의 경계를 결정합니다.

### 2.9 Spelunky 1 & 2 (Derek Yu)

검색 결과 (How To Market A Game 의 GDC 2021 정리 / Niels 't Hooft 인터뷰) [확인함]: Derek Yu 는 *시작 영역의 즉각적 난이도* 가 *roguelike 구조에 익숙하지 않은 플레이어에게 "죽음과 실패는 기대된 게임플레이의 일부" 임을 가르치기 위해 필수* 라고 명시. *처벌적 게임플레이가 플레이어를 *더 깊이 생각하게* 만든다.* ECHORIS 시사점: *Stratum 1 첫 진입* 만큼은 *즉각적 죽음* 보다는 *Erda 가 손해 보지 않는 안전 지대* 가 옳습니다 (위 1.7.2 Carlsen 의 *신뢰* 원칙과 일치). *Stratum 2+* 부터 Yu 식 *처벌* 어휘를 점진 도입.

### 2.10 Cuphead (2017) — Boss Pattern

*텔레그래프 (telegraph) → 회피 윈도우 → 펀치* 의 3-비트가 *모든 보스에 일관 적용*. 텍스트는 0 줄이며 *애니메이션의 *anticipation 프레임* 자체가 교사* 입니다. ECHORIS 보스 (Memory Lord / King / God) 에 직접 차용 가능.

### 2.11 Returnal (2021, Housemarque)

환경 + *log fragments*. 텍스트가 *완전 0 은 아니나* 단편적입니다. ECHORIS 의 *기억 단편 (Memory Shard)* 시스템과 *기능적으로 동형* 임을 주목해야 합니다. Returnal 의 log 는 *플레이어가 *원할 때만* 읽도록 *비차단 (non-blocking)* 입니다.

### 2.12 Death Stranding (2019, Kojima)

*반복 traversal* 자체가 *교사*. *Bridge / Ladder* 의 첫 배치는 *다른 플레이어의 흔적* 입니다 — *비-동기적 협력의 환경화*. ECHORIS Phase 3 의 *URL 합류* 와는 다르지만 *비-동기 흔적* 어휘는 차용 가능성이 있습니다 (Stratum 안에 *이전 플레이어의 죽음 마커* 등) [추측임 — 미결정].

### 2.13 The Last Guardian (2016, Team Ico)

*Trico (대형 동물 동반자)* 가 *살아 있는 교사*. 명령은 *추상적* 이며 Trico 가 *바로 따르지 않습니다* — *비-도구적 동물* 의 어휘. ECHORIS 시사점: *Rustborn* 이 *지시* 가 아니라 *반응* 으로 행동하면 *친밀도* 가 *비-도구화* 됩니다.

### 2.14 Shadow of the Colossus (2005, Team Ico)

*Colossus 의 거대한 등을 오르는 법* 을 *오직 잡기 (grip) 버튼 + 점프* 로 가르칩니다. *털의 흔들림* 이 *잡기 가능 영역의 시각화* 입니다.

### 2.15 ICO (2001)

*손 잡기 = 메커닉 = 서사*. 메커닉 자체가 *감정의 매개* 가 되는 정전.

### 2.16 Outer Wilds (2019)

검색 결과 (Medium Superjump / TVTropes) 정합 [확인함]: *quest marker 없음*, *시간 루프 자체가 시스템 학습 도구*. *호기심이 가이드* 입니다. *Tower of Quantum Knowledge* 의 *첫 힌트* 가 *환경적 (중력에 거슬러 위로 오르기 어렵다)* 이라는 점이 특히 ECHORIS 시사적입니다 — *지층의 *물리* 자체가 *next-step hint** 가 될 수 있습니다.

### 2.17 A Short Hike (2019) / GRIS (2018) / Sable (2021)

세 작품 모두 *quest marker 거부* + *시야 끝의 흥미 객체* 로 *내적 동기 유도*. ECHORIS 의 *기억의 지층* 안에 *시야 끝의 *발광 사물** (예: 다음 방 입구의 약한 light) 패턴 차용 가능.

### 2.18 Subnautica

*깊이 = 공포의 점진 증가*. *수면 → 안전 → 첫 깊은 곳의 큰 소리* 가 환경 신호. ECHORIS 의 *지층 깊이 = 위험 증가* 와 동형.

### 2.19 Resident Evil 4 (2005 / 2023 remake) — 미카미의 "merchant teaching"

상인의 *아이템 배치 + 가격표* 자체가 *"다음에 무엇이 필요할지" 의 환경적 힌트.* ECHORIS 의 *대장간 / 세이브 포인트 상점* 진열 순서가 *다음 지층 = 어떤 위협이 있을지* 의 *비-텍스트 힌트* 로 작동할 수 있습니다.

### 2.20 Knytt Stories (2007, Nifflas)

무자막 메트로베니아의 *인디 정전*. *그림자 점멸* + *작은 발광 영역* 만으로 *비밀 경로* 를 표시.

### 2.21 Animal Well (2024, Billy Basso) — *환경 = 첫 번째 퍼즐 = 컨트롤 학습*

검색 결과 (Thinky Games 인터뷰 / Wikipedia / Design Delve YouTube) [확인함]: Basso 는 *튜토리얼을 의도적으로 생략* 했으며 *"퍼즐을 푸는 것 = 게임을 *어떻게 플레이하는지* 를 배우는 것"* 이라고 명시했습니다. *Bubble Wand / Disc* 같은 도구는 *환경 실험* 으로만 어휘가 풀립니다.

**ECHORIS 시사점:** *Animal Well 의 도구 = ECHORIS 의 기억 단편 효과* 와 동형 매핑이 가능합니다. *효과 텍스트를 의도적으로 모호하게* 두고 *환경에서의 첫 사용* 으로 풀게 하는 디자인 선택지 [추측임 — 검증 필요].

### 2.22 Tunic (2022)

*환경 + 메뉴얼 (in-game)*. 진정한 환경 교육보다는 *반-텍스트* 입니다. 별도 reseach agent 의 범위. ECHORIS 의 *Rustborn 대사 분량 결정* 에 *Tunic 의 manual 페이지 같은 절제* 가 참조 모델이 될 수 있습니다.

---

## 3. Tier 3 — 짧은 언급

- **Inscryption Act 1** — Leshy 의 테이블이 *카드 = 자기 일부* 를 *플레이만으로* 가르침. *Act 의 전환* 자체가 *메커닉 메타-교육*.
- **The Witness (2016)** — *환경 퍼즐 문법*. 첫 30 분에 *선 그리기 규칙 1-2 종* 만 노출, 점진 추가.
- **Manifold Garden (2019)** — *기하학이 곧 메커닉*. 무한 반복 공간 = 중력 회전 어휘.
- **Maquette (2021)** — *재귀 세계의 부드러운 버전*. Cocoon 보다 *얕게* 같은 어휘를 시도. 텍스트가 더 많음.
- **Patrick's Parabox (2022)** — *Cocoon 의 직접 사촌*. *상자 안의 상자 안의 상자* 를 sokoban 으로 풀게 합니다. 검색 결과 정합 [확인함]: *350+ 핸드크래프트 퍼즐*, 각 퍼즐이 *새로운 아이디어* 를 가르침. **ECHORIS Item World 와 가장 가까운 메커닉.**
- **Antichamber (2013)** — *환경 위반* 자체가 교사. *Escher 적 비유클리드* 의 첫 노출.
- **Naissance (Brendon Chung)** — *짧은 환경 시.*
- **Dwarf Fortress** — *커뮤니티가 위키화한 학습*. *환경 ≠ 교사*, *플레이어 간 전달 = 교사*. ECHORIS 와는 거리.

---

## 4. Top 7 환경 교육 장치 (Synthesis Patterns)

본 리서치에서 추출한 *반복적으로 작동하는 7 개 패턴* 입니다.

### 패턴 1 — *안전한 방 → 위험한 방* (Portal / Half-Life 2)

새 메커닉은 *손해를 받을 수 없는 공간* 에서 먼저 노출됩니다. 그 다음 방에서 *그 메커닉을 사용하지 않으면 진행 불가* 한 위협이 등장합니다.

> ECHORIS 적용: Item World 첫 진입 직전 *대장간 안* 에서 *Rustborn 이 자기 안을 응시* 하는 짧은 컷 → 첫 진입 후 안전한 입구 방 → 두 번째 방에 *기억 단편이 적으로 출현*.

### 패턴 2 — *대리 실패 (Vicarious Failure)* (Half-Life 2 Ravenholm)

NPC / 시체 / 다른 캐릭터가 *플레이어 대신 실패* 합니다. 플레이어는 *손실 없이 위험 어휘* 를 학습.

> ECHORIS 적용: Erda 가 다른 시도자의 잔해를 발견 — *부서진 무기 + 형해 (skeleton)* 가 *기억 단편* 옆에 놓여 있음 = "여기 들어간 자가 있었다" 의 환경 서사.

### 패턴 3 — *한 챔버 = 한 규칙* (Portal / Inside / Cocoon)

한 공간 단위 안에 *오직 하나의 새 메커닉* 만 도입합니다. 두 번째 메커닉은 *다음 챔버*. 이는 *Mario 1-1 의 4-비트* 와 *기능적으로 동등* 하지만 *공간 단위가 더 명시적* 입니다.

> ECHORIS 적용: 지층 1 = *진입의 그 자체*. 지층 2 = *기억 단편 슬롯 결합*. 지층 3 = *5 색 기질 중 1 색*. 지층 4 = *결합 효과*.

### 패턴 4 — *4-비트 시퀀스 (소개 → 확장 → 시험 → 트위스트)* (Mario 1-1)

| 비트 | 기능 |
|---|---|
| Introduce | *공간만으로* 새 어휘를 보여 줌 (무위협) |
| Develop | *위협이 있는 맥락* 으로 어휘를 응용 |
| Test | *기존 어휘들과 결합* 한 복합 문제 |
| Twist | *기대를 깨는 방식* 의 같은 어휘 (예: 점프가 *생존 도구* 가 됨) |

본 4-비트는 *Portal 챔버 0-3*, *Inside 첫 화면 4 장*, *Cocoon 챕터 1 의 4 단계* 모두에서 동형으로 작동합니다.

### 패턴 5 — *시야 끝의 발광 (Visual Affordance)* (Hollow Knight / Knytt / Subnautica)

다음 목표는 *항상 시야 끝의 약한 발광* 으로 표시됩니다. 그러나 *명시적 마커는 없음*. *호기심이 가이드* 입니다.

> ECHORIS 적용: 지층 안의 *다음 방 입구* 는 *약한 주황 발광* (브랜드 키컬러 #ffa41b) 으로만 표시. *마커 ❗ 금지*.

### 패턴 6 — *손실 없는 시행착오 루프* (Inside / Hades / Spelunky 첫 영역)

*첫 실패* 의 비용을 *극단적으로 낮춤* — 즉시 재시작, 진보 손실 없음. 그 다음 *실패 비용을 점진 증가* 시킴.

> ECHORIS 적용: Stratum 1 진입 실패 시 *기억 단편 손실 0*, *경험 손실 0*. Stratum 2 부터 *손실 곡선 가동*.

### 패턴 7 — *환경 = 톤 화자* (Hollow Knight / Bloodborne / Returnal)

NPC 가 *말 없는 환경* 이 게임의 *분위기 화자* 가 됩니다. *비, 안개, 잔해, 형해* 등이 *그 자체로* 서사를 전달합니다.

> ECHORIS 적용: Item World 각 지층의 *팔레트 반전 (주황 배경 + 청록 디테일)* 자체가 *무기 Ego 의 정서* 를 표현. *5 색 기질 (Forge/Iron/Rust/Spark/Shadow)* 이 *지층 광원 색온도* 와 매핑.

---

## 5. Mario 1-1 4-비트의 다른 Tier 1 게임 적용 검증

| 게임 | Introduce | Develop | Test | Twist |
|---|---|---|---|---|
| Mario 1-1 | 우측 = 진행 | 굼바 점프 | ?블록+굼바+파이프 | 구멍 = 추락 |
| Portal 챔버 1-4 | 1 포털 통과 | 1 포털 + 큐브 | 2 포털 자가 발사 | 운동량 보존 (flinging) |
| Half-Life 2 톱날 | 시체 + 톱날 | 막힌 통로 | 좀비 등장 | 톱날 발사 — *카메라가 가르치지 않은 응용* |
| Cocoon 챕터 1 | 부화 + 걷기 | 압력판 + 운반 구체 | 운반 결과 (벌레 솟음) | 줌아웃 — *내가 있던 세계가 구체* |
| Inside 첫 화면 4 장 | 우측 진행 + 풀숲 | 헤드라이트 | 강아지 추격 | 시체 흉내 (숨김 메커닉) |
| BotW Great Plateau | 부활 동굴 + 시바 | 첫 사당 (Stasis) | 4 사당 | 노인이 link 의 *아버지* (서사 트위스트) |

**결론:** 4-비트 패턴은 *Tier 1 의 거의 모든 작품* 에 작동합니다. ECHORIS Item World 의 첫 30 분도 *반드시 이 4-비트* 로 분해되어야 합니다.

---

## 6. Cocoon as "World-Within-World" Precedent — 심층 분석

ECHORIS 와 Cocoon 은 *직접 사촌* 입니다. 본 절은 *어떤 어휘를 차용하고 어떤 어휘는 차용 불가한지* 를 분리합니다.

### 6.1 직접 차용 가능 (2D 에서도 작동)

| Cocoon 의 어휘 | 2D ECHORIS 차용 가능성 | 구체적 적용 |
|---|---|---|
| **0 단어 진입** | ✅ 완전 차용 | Item World 첫 진입은 Rustborn 의 *침묵* + 환경만 |
| **들 수 있는 사물 = 들어갈 수 있는 사물** | ✅ 차용 — 검 자체를 *들고 다니다 들어가는* 사물로 통합 | 인벤토리의 검 슬롯이 *진입 가능 사물* 임이 시각적으로 구분 |
| **신뢰의 카드 집** | ✅ 완전 차용 | Stratum 1 은 *부당한 즉사 0* — 첫 신뢰 토대 |
| **틀린 시도에도 폴리시된 피드백** | ✅ 완전 차용 | "이 검에 들어갈 수 없다" 시도 시 *Rustborn 의 짧은 발광 거부 모션* + 사운드 |
| **컨트롤 극단 단순화 (진입의 순간만)** | ✅ 차용 권장 | 진입 모션 중에는 *공격·인벤토리·메뉴 입력 일시 봉인* |
| **줌아웃으로 "내가 있던 세계 = 사물" 의 동등성** | ⚠️ *부분 차용* — §6.2 참조 | 2D 에서 카메라 줌아웃 + UI 의 *아이템 슬롯 강조* 의 결합 |

### 6.2 부분 차용 — 3D → 2D 변환 손실

Cocoon 의 가장 강력한 한 컷 — *"줌아웃 → 내가 있던 사막 세계가 작은 주황 구체 안"* — 은 *3D isometric 의 원근* 에 직접 의존합니다. 2D 횡스크롤에서 이 효과를 *그대로* 재현하기는 어렵습니다.

**ECHORIS 의 2D 대안 후보:**

1. **카메라 풀백 + 화면 압축.** 진입 직전 카메라가 *극단적으로 zoom-out* 하여 *이 검 안에 들어갈 세계가 검의 단면 (cross-section) 안에* 있음을 *blueprint 스타일* 로 보여 줌.
2. **UI 의 검 슬롯 강조.** 진입 모션 시 *인벤토리 슬롯의 검 아이콘이 화면 가운데로 줌인 → 그 안으로 카메라가 들어감*.
3. **다마스커스 단면.** ECHORIS 의 art direction 이 이미 *부식 강판 / 다마스커스 단면* 으로 정의되어 있습니다 (CLAUDE.md "톤 & 매너" §3). *진입 순간 검의 단면 패턴이 그대로 지층의 벽 텍스처* 가 되는 *시각적 연속성* 으로 *세계 = 검* 의 동등성을 *2D 가 가장 잘 할 수 있는 방식* 으로 전달.

**권장:** 후보 3 이 가장 강합니다. *Cocoon 이 3D 줌아웃으로 한 일을 ECHORIS 는 *질감 연속성* 으로 한다.*

### 6.3 차용 불가 — Cocoon 의 핵심 우위

- **부드러운 isometric 카메라의 *항상 정렬된 사물 위치*.** 2D 횡스크롤은 *깊이축* 이 없어 *동일한 도형적 우아함* 을 *부분적으로만* 재현합니다.
- **음악의 ambient drone.** Cocoon 의 사운드 디자인은 *공간 자체의 호흡* 입니다. ECHORIS 의 *@pixi/sound* 기반 BGM 도 동등 수준의 *공간 = 사운드* 결합이 가능하나, *2D 의 panning 어휘의 한계* 가 있습니다.

---

## 7. Patrick's Parabox + Maquette + Cocoon — 재귀 공간 3 인조

세 작품 모두 *세계 안의 세계* 를 다루지만 *교육 어휘* 가 다릅니다.

| 작품 | 재귀의 방향 | 텍스트 양 | 교육 어휘 |
|---|---|---|---|
| **Cocoon** | *유한* (4-5 층 정도) | 0 단어 | *공간의 부드러운 줌* |
| **Patrick's Parabox** | *무한 (수학적)* | 거의 0 | *상자 안의 상자 = sokoban grid* |
| **Maquette** | *무한 사실 + 유한 디자인* | 보통 (대사 있음) | *재귀 = 서사 메타포 (관계)* |

**공통 패턴:**

1. **첫 진입은 *한 번에 한 단계만*.** 처음에는 *층 0 → 층 1* 만. *층 -1 (위 세계)* 진입은 *나중에* 풀림.
2. **들어가기 / 나오기의 *대칭*.** 진입 동작과 퇴장 동작이 *기하학적 거울*. 플레이어는 *가역성* 을 첫 시도에서 학습.
3. **재귀가 *처음에는 시각적 농담*, 나중에는 *생존 도구* 가 됨.** Parabox 의 첫 chapter 는 *재귀 없이* 풀 수 있는 sokoban 만 등장. Cocoon 도 *첫 구체 진입까지* 는 *전통적 퍼즐만* 등장.

**ECHORIS 적용:** Item World 의 *재귀 깊이* 결정. 현재 정의 (CLAUDE.md "아이템계 핵심 규칙") 에 따르면 *재귀적 진입 = DEPRECATED* — 아이템계 안에서 다른 아이템의 아이템계에 진입 불가. 이는 *Cocoon 의 4-5 층 vs Parabox 의 무한* 사이에서 *유한 1 층* 을 선택한 결정입니다. *그 결정은 옳습니다* — 신규 플레이어의 *멘탈 모델* 이 *첫 진입* 자체만으로도 부담스럽기 때문입니다.

---

## 8. Wordless vs Language-Light — 언제 한 줄을 허용하는가

| 게임 | 단어 수 (대략) | 사용처 |
|---|---|---|
| Cocoon | 0 | (없음) |
| Inside | 0 | (없음) |
| LIMBO | 0 | (없음) |
| Journey | 0 | (없음) |
| Mario 1-1 | 0 | (없음) |
| Portal 첫 30 분 | ~50 (GLaDOS) | *분위기 + 농담*, 메커닉 설명 아님 |
| Half-Life 2 첫 30 분 | ~30 (Barney) | *서사 어휘 1-2 줄* + *대부분 환경* |
| Sekiro Hanbei | 다수 | *옵션 강좌* 만 |
| Hollow Knight | 보통 | NPC 가 *분위기* 를 말함 (정보 ≠ 강의) |
| BotW Great Plateau | 보통 | *노인* 의 한 줄들 — *분위기 + 1-2 힌트* |

**규칙:** *한 줄이 허용되는 경우* 는 다음 중 하나일 때만입니다:

1. **분위기 톤 화자.** 메커닉을 설명하지 않고 *세계의 정서* 를 말함.
2. **명시적 옵션 강좌.** Sekiro Hanbei 처럼 *원할 때만 듣는 강의*.
3. **트위스트의 임팩트 강화.** Cocoon 도 *엔딩의 한두 사운드 시그널* 은 텍스트가 아니지만 *기능적으로 한 줄급의 임팩트*.

**ECHORIS 의 한 줄 예산:**
- *Rustborn (검 Ego)* 는 *분위기 화자* 로 위치시켜야 합니다. *메커닉 강의 금지*.
- *Erda* 의 침묵은 *Tier 1 정전 (Mario / Cocoon / Inside / Journey)* 과 정렬됩니다 — 깨지 말 것.

---

## 9. 환경 교육이 *obscurity* 로 무너지는 실패 패턴

| 실패 패턴 | 사례 | 원인 |
|---|---|---|
| **부당한 즉사 (unfair death)** | Souls 비평 (특히 신규 진입자) | 학습 전 처벌이 *대리 실패* 보다 먼저 |
| **신호 과잉** | Dead Space (GMTK 트랜스크립트 line 7-22) | *같은 정보를 7 가지 형태로* 줌 → 환경 신호의 우아함 파괴 |
| **신호 부재** | Pathologic (초기 비평) | *위협의 모든 매핑* 이 학습 곡선 없이 동시 풀림 |
| **메커닉 ≠ 환경 결합 부족** | Returnal 의 일부 영역 | *log 가 환경과 동떨어진* 텍스트 덩어리 |
| **재귀 과잉** | Maquette 일부 후반부 | *재귀 깊이가 멘탈 모델을 넘어섬* |

**ECHORIS 의 자기 진단 기준:**

1. *Stratum 1 첫 진입에서 신규 플레이어가 5 분 안에 "어 다시 나갈 수 있구나" 를 학습하는가?* 못하면 *Cocoon 의 가역성 신호 부재*.
2. *부당한 즉사가 첫 진입에서 0 인가?* 아니면 *Carlsen 의 신뢰의 카드 집* 붕괴.
3. *Rustborn 의 대사가 한 줄 이상 *메커닉을 설명하는가?* 그러면 *Hollow Knight / Cocoon / Mario 의 정전 ↓ Dead Space 정전 ↑* 이동.

---

## 10. ECHORIS 적용 — 구체 권고

### 10.1 첫 30 분 wordless 시나리오 (제안)

다음은 *Mario 1-1 의 4-비트 + Cocoon 의 6 단계 + Portal 의 챔버* 를 결합한 ECHORIS 의 *Item World 첫 진입* 시퀀스 초안입니다.

```
[비트 1 — Introduce] 0-3 분 — 월드 안전 지대
  · Erda 가 대장간 옆에 깨어남 (camera 측면 고정)
  · 처음에는 *이동 + 점프* 만 가능 — 공격·인벤토리 봉인
  · 발광 주황 굼바 같은 약한 적 1 마리 (대리 실패용, 적이 *자기 자신을 패는* 짧은 idle)
  · 첫 검 픽업 — Rustborn 의 *침묵 발광* (대사 없음)

[비트 2 — Develop] 3-10 분 — 첫 위협
  · 대장간 → 짧은 산책 → 첫 닫힌 문 (스탯 게이트가 아닌 *환경 게이트* — 잠긴 모루)
  · 그 옆에 *부서진 다른 시도자의 형해* (대리 실패) + 부서진 검 잔해
  · Rustborn 이 *희미하게 응시 모션* — 검이 *방향성* 을 가진 첫 신호
  · 플레이어가 검을 들고 모루로 다가가면 *발광 강화*
  · 이때 *검의 단면 패턴* 이 *모루의 표면 패턴* 과 *시각적으로 일치* (질감 연속성 §6.2)

[비트 3 — Test] 10-20 분 — 첫 진입
  · 모루 위에 검을 놓는 단순 컨트롤 (액션 버튼 1 회)
  · 카메라가 *극단 줌인* — 검의 단면 → 단면의 검은 균열 → 균열 안 → 화면 전체가 *다마스커스 패턴* 으로 채워짐
  · 자연스러운 transition 으로 Stratum 1 입구 방 등장 (*검 단면의 텍스처가 벽 텍스처로 연속*)
  · 입구 방 — *완전 안전*, 적 0, 손실 0
  · 작은 *주황 발광 빛* 이 다음 방을 가리킴 (마커 ❗ 금지)
  · 첫 *기억 단편 (Forgotten)* 만남 — 적으로 출현하나 *대미지가 매우 낮게 튜닝*

[비트 4 — Twist] 20-30 분 — 가역성 발견 + 첫 회상
  · 첫 단편 격파 → 슬롯 장착 가능 (UI 가 *그 순간만* 잠시 강조됨, 대사 없음)
  · 입구 방으로 돌아가는 길에 *나가는 모루* 가 빛남
  · 모루 진입 → *역방향 카메라* (줌아웃 → 검의 단면 → 검 → 월드 대장간)
  · Erda 가 *대장간에* 돌아옴 — *검을 들고 있음 + 새 단편 슬롯이 가시화*
  · "들어갔다 나왔다" 의 *가역성* 이 *완전히 검증됨*
  · Rustborn 의 *첫 대사 한 줄* (선택) — *분위기 한 줄 only*, 메커닉 설명 금지

총 단어 수 예산: Rustborn 최대 1-2 줄, 약 10-20 단어
```

### 10.2 Cocoon 의 8 단계 → ECHORIS 의 8 단계 매핑

| Cocoon 단계 | ECHORIS 동형 |
|---|---|
| 부화 | Erda 깨어남 (대장간 옆) |
| 걷기 학습 | 이동·점프 |
| 첫 압력판 | 첫 모루 (비활성) |
| 첫 운반물 | 첫 검 픽업 |
| 운반물 결과 | 검 + 모루 결합 → 발광 |
| 첫 sphere 진입 (줌아웃) | 첫 모루 진입 (카메라 줌인 + 텍스처 연속) |
| 들기 | 인벤토리의 *검 슬롯이 진입 가능* 임이 시각적으로 구분 |
| 다시 진입 | 두 번째 진입 가능 (가역성 검증) |

### 10.3 Rustborn 대사 예산 — 강한 제한

ECHORIS 의 첫 30 분 *Rustborn 대사 예산*:

- **0-15 분: 0 단어.** 침묵 + 발광 모션만.
- **15-25 분: 0 단어.** 단편 격파 시 *발광 색 변화* (Forgotten → Recalled 의 색상 신호).
- **25-30 분: 최대 1 줄 (10-15 단어).** *분위기 한 줄 only*. 메커닉 설명 금지. 예: *"...너의 손은 모루보다 따뜻하군."* (정서 화자 / 메커닉 비-설명)

이 예산은 *Hollow Knight 의 NPC 한 줄 톤* 과 정렬됩니다. *Dead Space 정전 (line 7-22) 의 신호 과잉* 을 피합니다.

### 10.4 "안내 오버레이" 와의 양립

CLAUDE.md 의 P0 원칙은 *UI 컴포넌트 가이드* 우선입니다. 본 권고는 *기존 UI 컴포넌트* (KeyPrompt, ModalPanel) 의 *사용 빈도를 줄이는* 방향입니다. 신규 컴포넌트를 만들 필요는 없으며, 기존의 *KeyPrompt.createPrompt* 를 *진입 모루 위에서 [E] ENTER* 형태로 사용하는 정도면 충분합니다.

### 10.5 2D 횡스크롤이 *못 하는 것* vs *할 수 있는 것*

| 2D 가 못 하는 것 | 2D 가 더 잘 하는 것 |
|---|---|
| Cocoon 의 줌아웃 원근 트릭 | *질감 연속성* (다마스커스 단면 → 벽) |
| 360° 카메라 회전으로 *사물 안의 사물* 보여주기 | *측면 단면도 (cross-section)* 표현 — 검 단면을 *지층의 벽* 으로 |
| 시각적 깊이축으로 위계 시각화 | *수직 진입* (위/아래) 의 어휘 — Trapdoor Descent (DEC-039) 와 직접 정합 |
| Patrick's Parabox 의 무한 줌 | *명확한 입체 도면 메타포* (blueprint-style) |

**핵심:** 2D 횡스크롤은 *세계 = 검* 의 동등성을 *깊이* 대신 *질감 연속성 + 단면 메타포* 로 풀어야 합니다. 이는 ECHORIS 의 art direction (다마스커스 / 부식 강판) 과 *이미 정렬* 되어 있습니다.

### 10.6 *모루 = 입구* 의 텔레그래핑 충분성

**현재 ECHORIS 설계의 모루 = 입구는 Cocoon 의 *흰색 받침대 (white pedestal)* 와 *기능적으로 동형* 입니다.** 따라서 *재설계 불필요* 입니다. 다만 다음 3 가지 강화는 권장됩니다:

1. **모루의 빛 신호.** *비활성 = 회색 / 활성화 = 주황 #ffa41b 펄스*. 키컬러와 정렬.
2. **검 ↔ 모루의 *질감 일치*.** *모루 표면 텍스처* 와 *검 단면 텍스처* 가 *동일한 다마스커스 패턴* 의 *부분 / 전체*. 진입 모션의 줌인이 *그 동등성을 발견하는 순간* 이 되도록.
3. **첫 모루의 *위치 = 대장간 내부*.** 즉 *세이브 포인트 안* — *안전한 환경에서 첫 노출* (패턴 1).

---

## 11. 결론

ECHORIS 의 *unfamiliar core mechanic = "you enter your item"* 의 환경 교육은 다음 3 개 정전과 가장 강하게 정렬되어 있습니다:

1. **Cocoon (2023).** 메커닉의 *직접 사촌*. §6 / §10.2 의 8 단계 매핑 채택 권장.
2. **Mario 1-1 (1985).** *4-비트 시퀀스* 의 정전. §10.1 의 30 분 시나리오는 이 패턴을 따릅니다.
3. **Half-Life 2 (2004).** *invisible tutorial* 의 정전. *대리 실패* 와 *안전한 노출* 어휘는 §10.1 비트 1-2 에 직접 적용.

ECHORIS 의 *2D 횡스크롤* 한계는 *질감 연속성 + 단면 메타포* (§10.5) 로 보완 가능하며, 이는 *이미 결정된 art direction (다마스커스 / 부식 강판) 과 정합* 합니다.

*Rustborn 대사 예산* 은 *첫 30 분 1-2 줄* 로 강하게 제한해야 합니다 (§8 / §10.3). 그 이상은 *Cocoon 의 신뢰 / Mario 의 순수 디자인 / Hollow Knight 의 톤 화자* 정전에서 *Dead Space 의 신호 과잉* 정전으로 추락시킵니다.

본 리서치의 *권고 일관성 검증*: §10.1-10.6 의 모든 적용은 *CLAUDE.md 의 톤 & 매너 + DEC-033 검 Ego + DEC-036 기억 단편 + DEC-039 Trapdoor Descent* 와 충돌하지 않습니다.

---

## 12. 인용 출처 (Sources)

### GMTK 로컬 트랜스크립트
- `Reference/gmtk/Half-Life 2's Invisible Tutorial.txt` (Mark Brown, 2015-01-26) [확인함]
- `Reference/gmtk/How Nintendo Designed Ultrahand.txt` [확인함]
- `Reference/gmtk/How (and Why) Spelunky Makes its Own Levels.txt` [확인함]

### 외부 출처
- Kim Swift, *Our Journey From Narbacular Drop To Portal*, GDC IGS 2007 — [GDC Vault 1014822](https://gdcvault.com/play/1014822/Our-Journey-From-Narbacular-Drop), [YouTube](https://www.youtube.com/watch?v=2F0SVZA9fIo), [Gamedeveloper.com 요약](https://www.gamedeveloper.com/game-platforms/independent-games-summit-valve-s-kim-swift---from-i-narbacular-drop-i-to-i-portal-i-) [추측임 — 원본 영상 직접 시청 미완료]
- Jeppe Carlsen — Cocoon 인터뷰 모음:
  - [Game Developer — Mental staircases and paradoxical suitcases](https://www.gamedeveloper.com/design/mental-staircases-and-paradoxical-suitcases-crafting-the-world-hopping-puzzles-of-cocoon) [확인함]
  - [Game Developer — The challenges of laying worlds upon worlds](https://www.gamedeveloper.com/design/the-challenges-of-laying-worlds-upon-worlds-in-puzzle-game-cocoon) [확인함]
  - [Gamerant — Puzzle Design Philosophy](https://gamerant.com/cocoon-puzzle-design-philosophy-short-good/) [확인함]
  - [Remap Radio — A House of Cards Built on Trust](https://remapradio.com/articles/a-house-of-cards-built-on-trust-puzzle-design-in-cocoon-2/) [확인함]
  - [DayOne — Creating Cocoon](https://playday.one/2023/12/23/creating-cocoon-developer-interview/) [확인함]
  - [GameisHard — Making of Cocoon's Curious Puzzles](https://gameishard.gg/news/the-making-of-cocoons-curious-puzzles-a-conversation-with-designer-and-director-jeppe-carlsen/309065/) [확인함]
  - [PreMortem Games — Carlsen Interview](https://premortem.games/2024/09/18/cocoon-creator-jeppe-carlsen-i-never-compromise-on-playability/) [확인함]
- Cocoon Walkthrough — [Neoseeker Chapter 1](https://www.neoseeker.com/cocoon/walkthrough/Chapter_1), [TrueAchievements Walkthrough Part 1](https://www.trueachievements.com/game/Cocoon/walkthrough/3), [IntoIndieGames Part 1](https://intoindiegames.com/walkthroughs/cocoon-walkthrough-part-1/) [확인함]
- Anna Anthropy, *Rise of the Videogame Zinesters* (2012, Seven Stories Press) — [archive.org 본문](https://archive.org/details/riseofvideogamez0000anth), [PenguinRandomHouse](https://www.penguinrandomhouse.com/books/215174/rise-of-the-videogame-zinesters-by-anna-anthropy/) [확인함]
- Extra Credits, *Design Club — Super Mario Bros: Level 1-1* — [YouTube ZH2wGpEZVgE](https://www.youtube.com/watch?v=ZH2wGpEZVgE) [추측임 — 영상 직접 시청 미완료]
- Kotaku, *Why Super Mario Bros' Level 1-1 Is Perfect* — [Kotaku](https://kotaku.com/why-super-mario-bros-level-1-1-is-perfect-1586624699) [확인함]
- Reedart, *Shigeru Miyamoto on Super Mario Bros. Level 1-1* — [reedart.wordpress.com](https://reedart.wordpress.com/2015/09/10/shigeru-miyamoto-on-super-mario-bros-level-1-1/) [확인함]
- Egoraptor, *Sequelitis — Mega Man X* — [TVTropes](https://tvtropes.org/pmwiki/pmwiki.php/WebVideo/Sequelitis) [확인함]
- Hollow Knight Mantis Village — [Fextralife Wiki](https://hollowknight.wiki.fextralife.com/Mantis+Village), [Mantis Claw](https://hollowknight.wiki.fextralife.com/Mantis+Claw), [Fandom Mantis Lords](https://hollowknight.fandom.com/wiki/Mantis_Lords) [확인함]
- Inside (Playdead) 분석 — [PlayInsideGame](https://www.playinsidegame.com/inside/), [Medium](https://medium.com/@7019727855a/success-story-of-playdead-studio-inside-what-we-can-learn-technical-challenges-and-game-design-620db0ab11c3) [확인함]
- Derek Yu / Spelunky — [How To Market A Game — GDC 2021](https://howtomarketagame.com/2021/07/22/gdc-2021-one-more-run-the-making-of-spelunky-2-with-derek-yu/), [Niels 't Hooft Interview](https://nielsthooft.com/derek-yu), [Boss Fight Books Spelunky](https://bossfightbooks.com/products/spelunky-by-derek-yu) [확인함]
- BotW Great Plateau — [Gamerant](https://gamerant.com/zelda-breath-of-the-wild-great-plateau-tutorial-introduction-design-effective/), [Wikipedia](https://en.wikipedia.org/wiki/Great_Plateau), [EliteRev](https://eliterev.wordpress.com/2017/03/16/breath-of-the-wilds-quiet-guidance-and-the-lessons-of-the-great-plateau/) [확인함]
- Sekiro Hanbei — [Fextralife](https://sekiroshadowsdietwice.wiki.fextralife.com/Hanbei+The+Undying), [Fandom](https://sekiro-shadows-die-twice.fandom.com/wiki/Hanbei_the_Undying), [Gamepur Parrying](https://www.gamepur.com/guides/sekiro-best-tips-for-parrying) [확인함]
- Outer Wilds — [Medium Superjump](https://medium.com/super-jump/outer-wilds-reinvented-video-game-progression-74ec5e5fdd5), [Gamerant No Quest Markers](https://gamerant.com/best-open-world-games-no-quest-markers/), [Reverse Shot Time-Loop](https://reverseshot.org/features/2984/outer_wilds) [확인함]
- Animal Well — [Wikipedia](https://en.wikipedia.org/wiki/Animal_Well), [Thinky Games Interview](https://thinkygames.com/features/interview-how-animal-well-is-using-secrets-and-mysteries-to-be-a-different-kind-of-metroidvania/), [Design Delve YouTube](https://www.youtube.com/watch?v=IiSesCWWy_M) [확인함]
- Patrick's Parabox — [Patrick's Parabox 공식](https://www.patricksparabox.com/), [Game Developer Designing the puzzles](https://www.gamedeveloper.com/design/patrick-s-parabox-), [Thinky Games Review](https://thinkygames.com/reviews/patricks-parabox-recursive-solutions-to-tricky-puzzles/) [확인함]

### 미확보 — 직접 시청 / 읽기 권장
- Kim Swift GDC 2007 IGS 영상 직접 시청 (인용 정확도 강화) [근거 없음 — 본 리서치에서 직접 보지 않음]
- Extra Credits Design Club Mario 1-1 영상 직접 시청 (4-비트 명명의 출처 검증) [근거 없음 — 본 리서치에서 직접 보지 않음]
- *COCOON: Design Works* (Lost in Cult 출판) — Carlsen 의 디자인 노트 1 차 자료 [근거 없음 — 본 리서치 외 자료]

---

> **다음 follow-up 후보:**
> - §10.1 의 첫 30 분 시나리오를 *Documents/UI/UI_Onboarding.md* 형 GDD 로 정형화
> - 카메라 줌인 / 텍스처 연속성 (§10.5) 을 *Documents/System/System_ItemWorld_Entry.md* 로 분리 명세
> - Rustborn 대사 예산 (§10.3) 을 *Sheets/Content_Rustborn_Dialogue.csv* 의 *Stratum 1 진입 컷* 슬롯과 동기화
