# GDC 인사이트: 절차적 생성 & 로그라이크 (Procedural Generation & Roguelike)

> 분석 대상: 7개 GDC 강연
> 분석일: 2026-03-23
> 프로젝트 컨텍스트: Metroidvania + Item World(디스가이아) + Online Action RPG 웹게임
> Item World: 장비 안에 들어가는 100층 던전, 시드 기반 절차적 생성

---

## 1. Darkest Dungeon: A Design Postmortem

### 발표자 / 게임
Tyler Sigman (Design Director) / Red Hook Studios / Darkest Dungeon

### 핵심 인사이트

1. **"Heroes are Human" - 핵심 판타지에 모든 시스템을 복종시켜라**: Darkest Dungeon의 모든 시스템(Affliction, Stress, Death's Door, 영구 세이브)은 "영웅도 인간이다"라는 단일 컨셉을 위해 존재한다. 개별 시스템이 clunky해도 전체가 하나의 경험을 향해 수렴하면 성공한다.

2. **의도적으로 나쁜 디자인을 선택하라 (Intentional Bad Design)**: Loss of Agency(캐릭터가 플레이어 의지와 무관하게 행동), 영구 세이브(save scumming 차단), 힐링이 데미지를 따라잡지 못하는 구조 등 통상적으로 "나쁜 디자인"으로 간주되는 것들을 의도적으로 채택했다. 핵심은 "이 게임에 맞는가"이며, 범용 규칙이 아니라 게임별 규칙으로 판단해야 한다.

3. **RNG를 포커처럼 설계하라**: Darkest Dungeon은 AI Director 없이 순수 RNG variance에 의존한다. 충분히 준비한 플레이어도 가끔 패배하도록 설계하되, 그 빈도를 정밀하게 튜닝하는 것이 "디자인 공예(craftsmanship)"의 핵심이다. "2/3 확률로 실패"하면 안 되지만, 가끔 일어나는 bad beat가 게임의 드라마를 만든다.

4. **Early Access에서의 대규모 메커닉 변경은 위험하다**: Corpse 시스템 도입으로 커뮤니티가 분열된 사례. 이미 작동하는 게임에 핵심 전투 메커닉을 변경하면 "이 유망했던 게임의 슬픈 운명"이라는 내러티브가 형성된다. 실험은 Early Access 초기에, 안정화 후에는 점진적 변화를 권장.

5. **Dominant Strategy를 발견하면 반드시 대응하라**: Focus Fire(앞줄 집중 공격) 전략이 나머지 전투 시스템을 무의미하게 만들었고, 이를 Corpse 시스템으로 해결했다. Heart Attack(스트레스 200 = 즉사)도 "스트레스 무시 Dark Run" 전략을 차단하기 위해 도입.

### 프로젝트 적용점

- **Item World 100층에서의 Risk/Reward 곡선**: 층이 깊어질수록 Healing이 Damage를 따라잡지 못하는 attrition 구조를 적용. "더 내려갈 것인가, 지금 빠져나갈 것인가"의 의사결정 긴장감 확보.
- **영구 결과 시스템**: Item World 진행 중 아이템 강화 결과가 즉시 저장되어 rollback 불가. 이로써 매 층 클리어가 진정한 선택이 됨.
- **"나쁜 디자인"의 의도적 활용**: 장비에 랜덤 negative modifier가 붙는 것을 허용. 완벽한 아이템이 아닌 "충분히 좋은 아이템"을 추구하게 만드는 구조.

---

## 2. 'Diablo': A Classic Game Postmortem

### 발표자 / 게임
David Brevik (President, Lead Programmer, Co-Creator) / Blizzard North / Diablo

### 핵심 인사이트

1. **Turn-based에서 Real-time으로의 전환이 장르를 탄생시켰다**: Diablo는 원래 turn-based Roguelike로 설계되었다. 각 행동에 서로 다른 "턴 비용"이 있는 복잡한 턴제였는데, 이를 "초당 20회 턴 실행"으로 바꾸는 것만으로 ARPG가 탄생했다. 기존 시스템 구조를 유지한 채 시간 해상도만 변경한 것.

2. **극단적 접근성이 장르를 대중화시킨다**: NHL 95의 "클릭하면 바로 플레이" 철학을 RPG에 적용. "Mom Test" - 어머니도 플레이할 수 있는 인터페이스를 목표. 복잡한 캐릭터 생성, 대화 트리를 모두 제거하고 최소한의 인터페이스만 남김.

3. **절차적 생성의 근본: 매번 다른 경험**: Rogue, NetHack, Moria, Angband 등의 Roguelike에서 영감. 랜덤 던전 생성 + 랜덤 아이템이 무한한 replayability를 제공.

4. **Peer-to-peer 멀티플레이어의 치팅 교훈**: Battle.net 1.0은 단 한 대의 컴퓨터로 운영되었다. Peer-to-peer 구조로 인해 치팅이 만연했고, 이것이 Diablo 2의 client-server 전환을 결정지었다. 온라인 게임에서 클라이언트를 절대 신뢰하지 마라.

5. **게임 아이소메트릭 뷰의 기원**: XCOM의 타일 크기를 그대로 차용하여 Diablo의 기본 렌더링 구조를 만들었다. 256색 팔레트를 128(배경)+128(전경)으로 분할하고, 16단계 라이팅으로 분위기를 만듦.

### 프로젝트 적용점

- **턴 비용 기반 전투 시스템의 실시간 변환 패턴**: 웹게임 Action RPG에서 스킬 cooldown, 공격 속도 등의 밸런싱에 "각 행동의 턴 비용" 개념을 내부적으로 활용 가능.
- **접근성 최우선**: Item World 진입을 최대한 간결하게. 장비 선택 -> 즉시 던전 입장. 복잡한 설정 없이 바로 플레이 시작.
- **Anti-cheat 아키텍처**: 온라인 Action RPG이므로 서버 권위(server-authoritative) 구조 필수. Item World의 시드, 보상, 강화 결과 모두 서버에서 검증.

---

## 3. Continuous World Generation in No Man's Sky

### 발표자 / 게임
Innes McKendrick (Programmer) / Hello Games / No Man's Sky

### 핵심 인사이트

1. **구 -> 큐브 매핑을 통한 실시간 지형 생성**: 시뮬레이션은 구(Sphere) 위에서 수행하되, 데이터 저장은 큐브(Cube) 면에 매핑. Sphere-to-Cube 변환은 단순한 정규화 연산으로 매우 저렴. 이 이중 좌표 구조가 전체 아키텍처의 근간.

2. **LOD(Level of Detail) 기반 Voxel 시스템**: 가장 가까운 영역은 32x32x32m 1미터 큐브 복셀, 원거리는 6단계 LOD로 점진 축소. 각 복셀은 6바이트(밀도 2바이트 x 2 재질 + 재질 비율 2바이트). 128미터 높이 제한을 noise 기반 elevation offset(600m~1km)으로 극복.

3. **생성 파이프라인의 6단계 순서**: Generate(복셀 충전) -> Polygonize(메쉬 생성) -> Spherify(구에 매핑) -> Physics mesh -> Nav mesh -> Content placement(식물, 건물, 생물). 대부분 job system으로 메인 스레드와 분리 실행.

4. **엔진은 절차적 콘텐츠에 무관해야 한다**: "텍스처가 생성된 것인지 아티스트가 만든 것인지 엔진은 상관하지 않는다." 절차적 생성은 아티스트를 대체하는 것이 아니라, 아티스트가 더 많은 것을 만들 수 있도록 돕는 도구.

5. **로컬 정보만으로 시뮬레이션해야 한다**: 행성 전체 데이터를 메모리에 올릴 수 없으므로, 각 영역은 "산 너머에 호수가 있는지" 모른 채 독립적으로 생성/시뮬레이션되어야 한다.

### 프로젝트 적용점

- **Item World 층 생성 파이프라인**: 시드 -> 지형 생성 -> 적 배치 -> 아이템 배치 -> 이벤트 배치의 명확한 단계별 파이프라인 구성.
- **LOD 개념의 적용**: 100층 중 현재 층과 인접 층만 완전 생성, 나머지는 메타데이터(난이도, 보스 여부, 보상 등급)만 유지.
- **로컬 시드 독립성**: 각 층의 시드는 `master_seed + floor_number`로 결정론적으로 파생. 각 층은 다른 층의 상태를 모른 채 독립적으로 생성 가능.

---

## 4. End-to-End Procedural Generation in Caves of Qud

### 발표자 / 게임
Jason Grinblat & Brian Bucklew (Co-founders) / Freehold Games / Caves of Qud

### 핵심 인사이트

1. **추상에서 구체로의 다단계 생성 (Abstraction Mountain)**: 생성 과정을 5단계로 구분 - (1) Generate History (추상), (2) Resolve Neighbors, (3) Generate Culture, (4) Generate Architecture, (5) Fabricate Game Objects (구체). 각 단계는 이전 단계의 추상 데이터를 입력받아 점점 구체적인 출력을 생산.

2. **디자인 입력(Design Inputs) vs 동적 입력(Dynamic Inputs)의 분리**: 정적/핸드크래프트 데이터(팩션, 문화 관계 그래프, 건물 템플릿)는 컴파일 타임에 고정. 동적 데이터(월드 시드에서 파생된 역사, 문화, NPC)는 런타임에 생성. 이 분리가 시스템의 tractability를 보장.

3. **모듈성이 다양성을 만든다**: 각 생성 모듈을 decoupled하게 설계하면, 모듈 간 조합이 예측 불가능한 다양한 결과를 만든다. "generators를 wild하게 놔두고, 그것이 괜찮은 컨텍스트를 만들어라."

4. **Apophenia(패턴 인식 편향) 활용**: 모든 결정에 의미를 부여할 필요 없다. 일부는 랜덤이어도 된다. 인간의 패턴 인식 경향이 의미 있는 결정들과 랜덤 결정들을 엮어 일관성 있는 서사로 해석해준다.

5. **역사의 역전 생성(Inverted Historical Logic)**: 먼저 "이벤트의 결과"를 결정하고, 그 결과에 대한 "합리화(rationalization)"를 사후 생성. 예: "마을이 드래곤플라이를 숭배하게 되었다" -> 왜 그렇게 되었는지의 서사를 역으로 생성.

### 프로젝트 적용점

- **Item World의 다단계 생성 아키텍처**:
  - Level 1 (추상): 시드 -> 100층의 메타 구조 결정 (보스 층, 이벤트 층, 보상 등급 분포)
  - Level 2: 각 층의 테마/바이옴 결정 (장비 타입에 따른 환경 변화)
  - Level 3: 구체적 맵 레이아웃 + 적 배치 + 아이템 배치
  - Level 4: 게임 오브젝트 인스턴스화
- **Design Inputs 활용**: 장비 타입, 등급, 속성을 정적 입력으로 사용하여 Item World의 테마와 적 구성을 결정. 예: 화염 속성 무기 -> 화산 테마 던전 + 화염 저항 몹.
- **Inverted Logic으로 던전 서사 생성**: "이 층에 보스가 있다" -> "왜 보스가 여기 있는가"의 서사를 역으로 생성하여 몰입감 추가.

---

## 5. Breaking the Ankh: Deterministic Propagation Netcode in Spelunky 2

### 발표자 / 게임
Guillermo (Blitworks) / Spelunky 2

### 핵심 인사이트

1. **결정론적 업데이트 함수(Deterministic Update Function)가 넷코드의 핵심**: 동일 입력 + 동일 상태 + 동일 타임스텝 = 동일 결과를 보장해야 한다. 시스템 호출, CPU 고유 명령어, 비결정적 이벤트를 모두 제거해야 함.

2. **Rollback Netcode의 공간-시간 트레이드오프**: Rollback은 게임 상태의 다중 복사를 요구하며, Spelunky 2에서는 프레임당 25~65%의 시간이 메모리 복사에 소비되었다. 이를 해결하기 위해 Deterministic Propagation Netcode를 고안.

3. **Deterministic Propagation의 핵심 아이디어**: Rollback이 "과거로 돌아가 수정 후 현재로 복귀"라면, Propagation은 "항상 현재에 살면서 더 동기화된 우주로 교체"하는 방식. Fair Simulation(항상 약간 틀림) + Lockstep Simulation(ground truth) + Propagation Simulation(lockstep에서 fork하여 현재까지 예측)의 3중 구조.

4. **비결정론은 비시각적 시스템에 허용하라**: 파티클 등 게임플레이에 영향 없는 시스템은 비결정론적 상태로 실행하여 결정론적 상태 크기를 줄임.

5. **Degradation은 결정론적 넷코드의 아킬레스건**: 결정론이 깨지거나 extrapolation이 발동하면 각 플레이어가 완전히 다른 게임을 플레이하게 된다. 높은 지연/패킷 손실 환경에서 게임이 "턴제"처럼 변하는 극단적 열화 발생.

### 프로젝트 적용점

- **Replay 기반 검증 시스템**: 시드 기반 Item World에서 Replay를 통한 결과 검증 가능. 서버에서 동일 시드 + 입력으로 결과를 재현하여 치팅 방지.
- **비결정론적/결정론적 분리**: 이펙트, 파티클 등 시각 요소는 비결정론적으로, 데미지 계산, 아이템 드롭 등 핵심 로직은 결정론적으로 분리.
- **웹게임의 지연 대응**: 웹 환경의 높은 지연을 고려한 netcode 설계. Lockstep 대신 서버 권위 모델 + 클라이언트 예측의 하이브리드 구조 검토.

---

## 6. Evolving Worlds from Chaos: Darkest Dungeon 2's Procedural Generation

### 발표자 / 게임
Mary L. Fox (Lead Environment Artist) & Colin Toll (Co-Tech Director) / Red Hook Studios / Darkest Dungeon 2

### 핵심 인사이트

1. **Sequential Plate -> Hex Grid -> Square Grid -> 45도 제한의 진화 과정**: 첫 시도(거대 판 연결)는 아트 작업량 과다와 시각적 반복으로 실패. Hex Grid는 60도 회전으로 건물 배치 제어 불가. Square Grid는 90도 회전으로 카메라 whiplash 발생. 최종적으로 "45도 이하 회전만 허용"이라는 제약을 추가하여 해결.

2. **프로그래머 중심이 아닌 아트 중심의 절차적 생성**: 대부분의 절차적 생성은 프로그래머 중심이어서 아트가 사후에 "붙여지는" 방식. DD2는 아트 디렉션이 시스템 설계를 주도하는 역전 구조를 채택.

3. **단위 크기(Unit Size) 축소의 이점**: 거대 판(plate) 대신 작은 타일로 분할하면 (1) 제작 단위가 작아 반복이 빨라지고, (2) 랜덤 조합의 다양성이 증가하며, (3) 아티스트에게 빠른 성취감(dopamine hit)을 제공.

4. **"우리는 이 세계의 주인이다" - 자체 규칙 설정**: 현실 물리나 일반 게임 규칙에 얽매일 필요 없다. DD2는 90도 회전 금지라는 인위적 제약으로 게임플레이와 아트 디렉션 모두를 만족시켰다.

5. **Minimal Set of Tiles 발견 과정**: 45도 대각선 도로가 사각 그리드를 가로지를 때 필요한 최소 타일 세트를 도출하는 과정이 시스템 설계의 핵심 과제였다.

### 프로젝트 적용점

- **Item World 방(Room) 단위의 모듈화**: 층 전체를 한 번에 생성하는 대신, 작은 방 단위로 생성하고 조합. 방 단위가 작을수록 조합 다양성 증가.
- **타일 세트 기반 맵 생성**: 미리 정의된 "방 템플릿" 세트(전투방, 보물방, 함정방, 보스방 등)를 시드 기반으로 조합하여 층 생성.
- **자체 제약 조건으로 일관된 경험 보장**: "막다른 길 금지", "보스방은 항상 출구 반대편" 등의 인위적 규칙으로 플레이 경험의 품질 하한선을 보장.

---

## 7. 6 Techniques for Leveraging AI in Procedural Content Generation

### 발표자 / 게임
Mat (NYU Game Center / Spirit AI), Tanya Short (Kitfox Games), Tarn Adams (Dwarf Fortress) 외 / 패널 세션

### 핵심 인사이트

1. **Behavior -> Reasoning 순서의 역전**: 전통적으로 "성격(Reasoning) -> 행동(Behavior)" 순서이지만, Moon Hunters처럼 "플레이어 행동 관찰 -> 성격 라벨 부여"의 역전이 더 자연스러울 수 있다. 인간은 행동을 먼저 관찰하고 성격을 추론한다.

2. **극단적 성격이 식별하기 쉽다**: "짜증이 잘 나는(irritable)" 같은 미묘한 특성은 게임에서 표현/인식이 어렵다. "분노(Wrathful)" 같은 극단적 특성이 전장, 협상 등 다양한 게임 시스템에서 더 명확하게 표현된다. King of Dragon Pass의 Trickster 아키타입이 가장 성공적이었던 이유.

3. **수동적 특성은 보이지 않는다**: "수줍음"은 대화 회피로 표현되지만, 회피 행동은 "행동의 부재"이므로 관찰이 어렵다. 모든 극단에 대해 "능동적 행동"을 정의해야 한다.

4. **대비를 통한 효율적 성격 전달**: 동일 이벤트에 대한 두 캐릭터의 대조적 반응(하나는 웃고, 하나는 울기)이 각각의 독립 행동보다 두 캐릭터의 성격을 훨씬 효율적으로 전달한다.

5. **AI 에이전트가 만든 물건에 데이터를 저장하라 (Tarn Adams)**: 에이전트가 생성한 객체(조각상, 책 등)에 "누가, 왜, 무엇을 참조하여" 만들었는지 데이터를 저장하면, 다른 에이전트가 그 객체를 보고 반응하며 emergent narrative가 발생한다. 객체에 저장된 데이터가 많을수록 더 많은 서사적 연결고리가 형성된다.

### 프로젝트 적용점

- **Item World 내 적/NPC의 성격 시스템**: 각 층의 보스나 특수 적에게 극단적 성격 특성 부여. "탐욕스러운" 보스는 아이템을 훔쳐 도망하고, "분노" 보스는 저체력 시 공격력 급증.
- **대비를 통한 층 서사**: 연속된 두 층이 대비되는 테마를 갖도록 설계 (평화로운 층 -> 지옥 같은 층)하여 경험의 극적 효과 증폭.
- **아이템 히스토리 데이터**: Item World에서 획득한 아이템에 "어떤 층에서, 어떤 보스를 통해, 어떤 조건에서 획득"했는지 메타데이터 저장. 이 데이터가 후속 Item World 진입 시 서사적 연결고리로 활용.

---

## 종합 교훈 (Cross-cutting Insights)

### 1. 시드 기반 결정론은 모든 것의 기반이다
Caves of Qud, No Man's Sky, Spelunky 2 모두 시드로부터 결정론적으로 세계를 재현할 수 있는 구조를 갖추고 있다. Item World의 100층 던전도 `equipment_seed + floor_index`로 어떤 상태든 재현 가능해야 한다. 이는 디버깅, 검증, 멀티플레이어 동기화, 치팅 방지의 기초.

### 2. 추상에서 구체로의 다단계 파이프라인
Caves of Qud의 "Abstraction Mountain"과 No Man's Sky의 6단계 파이프라인 모두 같은 원리: 먼저 높은 수준의 구조를 결정하고, 점진적으로 구체화한다. Item World에서도 "이 장비의 Item World는 전체적으로 어떤 구조인가" -> "이 층은 어떤 테마인가" -> "이 방은 어떤 구성인가"의 계층적 생성이 필요.

### 3. 핸드크래프트 + 절차적 생성의 하이브리드
모든 성공 사례에서 순수 절차적 생성이 아닌 "디자이너가 만든 템플릿/규칙 + 절차적 조합"의 하이브리드 접근을 사용한다. DD2의 타일 세트, Caves of Qud의 Design Inputs, No Man's Sky의 아티스트 제작 에셋이 그 예. Item World에서도 수작업으로 만든 방 템플릿, 이벤트 템플릿, 적 조합 규칙을 시드 기반으로 조합하는 것이 최적.

### 4. 제약 조건이 품질을 만든다
DD2의 "90도 회전 금지", Darkest Dungeon의 "healing < damage", Spelunky 2의 "전체 스테이지 업데이트 필수" 등. 좋은 절차적 생성은 "무엇이든 가능한" 시스템이 아니라, "특정 규칙 안에서만 가능한" 시스템이다. Item World에서도 "연속 3층 이상 같은 테마 금지", "5층마다 반드시 쉬는 구간", "보스 층 간격 제한" 같은 규칙이 경험 품질을 보장한다.

### 5. 플레이어의 Apophenia를 무기로 활용하라
Caves of Qud에서 명시적으로 언급한 원리: 인간은 패턴을 찾으려는 본능이 있다. 일부 의미 있는 구조 위에 랜덤 요소를 얹으면, 플레이어는 전체를 의미 있는 것으로 해석한다. 100% 의미부여에 드는 비용 대비, 30~50%만 의미 있게 만들어도 플레이어 경험은 90% 이상 커버된다.

---

## 프로젝트 적용 매트릭스

| 인사이트 | 적용 시스템 | 우선순위 |
|:---|:---|:---:|
| 시드 기반 결정론적 층 생성 | Item World Core Architecture | P1 |
| 추상->구체 다단계 파이프라인 | Item World Generation Pipeline | P1 |
| 핸드크래프트 방 템플릿 + 절차적 조합 | Level Design / Map Generation | P1 |
| 제약 조건 기반 품질 보장 (연속 테마 금지, 보스 간격 등) | Generation Rules Engine | P1 |
| Attrition 기반 Risk/Reward (치유 < 피해) | Item World Difficulty Curve | P1 |
| 서버 권위 + 시드 검증으로 치팅 방지 | Online Infrastructure | P1 |
| 장비 속성 -> 던전 테마 매핑 (Design Inputs) | Content Theming System | P2 |
| Replay 기반 서버 검증 | Anti-cheat System | P2 |
| LOD 개념: 현재 층만 완전 생성 | Memory / Performance Optimization | P2 |
| 아이템 히스토리 메타데이터 저장 | Item Data Model | P2 |
| 역전된 서사 생성 (결과 먼저, 이유 나중) | Narrative / Flavor Text System | P3 |
| 극단적 적 성격 / 대비 기반 층 설계 | Enemy AI / Floor Pacing | P3 |
| Apophenia 활용 (30~50% 의미 + 나머지 랜덤) | Content Budget Allocation | P3 |
| 비결정론적 시각 효과 분리 | Client Rendering Architecture | P3 |


**Q1: Item World의 시드 파생 구조를 `equipment_id + base_seed + floor_index`로 설계한다면, 동일 장비를 여러 번 Item World에 진입했을 때 매번 같은 맵이 나오게 할 것인가, 아니면 진입 횟수도 시드에 포함하여 매번 다른 경험을 제공할 것인가?**


**Q2: Caves of Qud의 "Abstraction Mountain" 5단계 구조를 Item World에 적용한다면, 각 단계에서 결정해야 할 구체적인 데이터 항목은 무엇이며, 어떤 단계를 서버에서, 어떤 단계를 클라이언트에서 처리할 것인가?**


**Q3: Darkest Dungeon의 "의도적으로 나쁜 디자인" 철학을 Item World에 적용한다면, 플레이어가 불쾌하지만 게임의 핵심 경험(자원 기반 전략)을 강화하는 메커닉으로 어떤 것이 적합할 것인가?**
