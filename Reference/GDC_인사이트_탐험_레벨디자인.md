# GDC 인사이트: 탐험 & 레벨 디자인 (Exploration & Level Design)

> 분석 대상: 8개 GDC 강연
> 분석일: 2026-03-23
> 프로젝트 컨텍스트: 2D 횡스크롤 Metroidvania + Item World + Online Action RPG 웹게임 (비선형 맵, 능력 게이트, 스탯 게이트)

---

## 1. How Cameras in Side-Scrollers Work

### 발표자 / 게임
Itay Keren / Mushroom 11 (및 다수의 클래식 횡스크롤 게임 분석)

### 핵심 인사이트

1. **카메라 3원칙 — Attention, Interaction, Comfort**: 카메라 시스템은 (1) 필요한 게임플레이 요소가 프레임 안에 있도록 보장하고, (2) 카메라 이동이 플레이어 입력과 예측 가능하게 연결되어야 하며, (3) 눈에 편안해야 한다.

2. **Camera Window와 Position Locking의 구분**: Position Locking(캐릭터 고정 추적)은 단순하지만 빠른 움직임에서 불편하고, Camera Window(허용 범위 내 자유 이동)는 불필요한 스크롤을 줄인다. 게임 특성에 맞게 선택해야 한다.

3. **Dual Forward Focus**: 캐릭터 진행 방향에 따라 카메라 앵커를 전환하되, Super Mario World처럼 약간의 backtrack 허용 구간을 두면 빈번한 방향 전환 시 카메라 떨림을 방지할 수 있다.

4. **Cue Focus (Attractor 시스템)**: Insanely Twisted Shadow Planet의 Double Ring Attractor처럼, 레벨에 배치된 관심 지점(보스, 체크포인트, 보물)이 카메라를 자연스럽게 유도하여 플레이어에게 "어디로 가야 하는지"를 암시한다.

5. **Region-based Camera**: 레벨을 여러 Region으로 나누고 각 Region마다 카메라 앵커, 줌, 행동을 다르게 설정한다. 탐험 구간은 중앙 앵커로, 선형 구간은 전방 앵커로 전환하면 레벨의 의도를 카메라로 전달할 수 있다.

### 프로젝트 적용점

- **Metroidvania 맵에 Region-based Camera 적용**: 각 방(Room)마다 카메라 동작을 다르게 설정. 보스 방은 Zoom to Fit, 탐험 구간은 넓은 Camera Window, 전투 복도는 전방 Forward Focus.
- **Cue Focus로 비밀 힌트**: 숨겨진 통로나 보물 근처에 Attractor를 배치하여 카메라가 미묘하게 해당 방향을 비추도록 하면, 관찰력 있는 플레이어에게 보상감을 준다.
- **Lerp/Smooth Damp 기반 카메라 스무딩**: 빠른 이동과 점프가 잦은 Metroidvania에서 카메라 떨림 방지를 위해 Linear Interpolation + Platform Snapping 조합 필수.
- **Speed-up Push Zone**: 빠른 대시 능력 획득 후 고속 이동 구간에서 Sonic 2 방식의 속도 기반 카메라 가속을 적용.

### 카메라 규칙 정리

| 기법 | 적용 조건 | 구현 방식 |
|:-----|:---------|:---------|
| Position Locking | 느린 캐릭터, 전방위 탐색 | 캐릭터 = 카메라 중심 |
| Camera Window | 점프가 많은 플랫포머 | 윈도우 경계 터치 시 스크롤 |
| Dual Forward Focus | 좌우 이동 빈번 | 방향 전환 시 앵커 전환 + 딜레이 |
| Lerp Smoothing | 모든 상황 기본 | 매 프레임 거리의 일정 비율 감소 |
| Platform Snapping | 수직 이동 빈번 | 착지 시 카메라 Y축 빠르게 정렬 |
| Cue Focus (Attractor) | 보스, 보물, 주요 오브젝트 | 이중 링 가중 평균 |
| Region Camera | 방 기반 레벨 | 방마다 앵커/줌/행동 프리셋 |
| Gesture Cues | 특수 동작(등반, 활강) | 동작에 따라 카메라 각도 변경 |

---

## 2. Ori and the Blind Forest: Sonic Polish Through Distributed Development

### 발표자 / 게임
Gareth Coker (작곡) & Andrew Lackey (사운드 디자인) / Ori and the Blind Forest

### 핵심 인사이트

1. **Flat Organization에서의 품질 향상**: Moon Studios는 20명의 분산 팀으로 관리자 없이 운영. 모든 구성원이 모든 영역에 피드백을 주는 구조가 폴리시 품질을 높였다. 사운드 디자이너가 아트에, 아티스트가 사운드에 피드백하는 교차 리뷰 문화.

2. **Empathic Listening**: "무엇이 문제인지"보다 "왜 문제인지"를 파악하는 것이 핵심. "너무 전기적이다"라는 피드백의 본질은 "SF 느낌이 난다"는 톤 불일치 문제였다. Why를 이해하면 해결 공간이 넓어진다.

3. **명확한 Design Pillar 고수**: "아름답고 타이트한 Metroidvania 플랫포머"라는 게임 정체성은 처음부터 끝까지 변하지 않았다. How는 자유롭게, What은 고정.

4. **KISS (Keep It Simple)**: Ori의 오디오 시스템은 Unity 기본 오디오 엔진으로 구현. 복잡한 인터랙티브 음악 시스템 없이도 음악과 사운드의 감정적 동기화를 달성.

5. **Rapid Iteration + Skype 기반 소통**: Skype 채팅 채널에서 시간당 수십 개의 메시지가 오가며, 에셋을 게임에 넣고 즉시 팀 전체가 리뷰하는 빠른 반복 개발.

### 프로젝트 적용점

- **Design Pillar를 명확히 정의하고 모든 결정의 기준으로 삼기**: "Metroidvania 탐험의 재미 + Item World의 무한 리플레이 + 온라인 협동"이라는 3대 기둥을 문서화하고, 모든 피처 제안 시 기둥과의 정합성을 검증.
- **교차 리뷰 문화 도입**: 레벨 디자이너가 전투 밸런스에, 전투 디자이너가 맵 구조에 피드백하는 구조를 일상화.
- **단순한 시스템으로 감정적 효과 극대화**: 웹게임 특성상 기술적 복잡도 제한이 있으므로, 단순한 시스템을 감정적으로 깊게 활용하는 전략이 유효.

---

## 3. Rewarding Exploration in Deus Ex: Mankind Divided

### 발표자 / 게임
Clemens (Level Designer) / Deus Ex: Mankind Divided (Prague Hub)

### 핵심 인사이트

1. **Exploration Setup 3계층 콘텐츠**: 메인 스토리 > 사이드 미션 > Exploration Setup. 세 번째 계층은 "도시에 생명을 불어넣는 작은 이야기 조각"으로, 독립적(70%), 연결형(20%), 대형(10%)으로 분류.

2. **Connectivity + Density**: 탐험 셋업 간 시각적/내러티브 연결(같은 소품, 이메일 참조)을 만들되, 과도한 연결은 "Small Worldings(모든 사람이 이웃인 느낌)"를 유발하므로 절제 필요.

3. **Skill-based가 아닌 Progression-based 차단 금지**: Deus Ex에서는 플레이어의 능력(augmentation) 획득 순서를 예측할 수 없으므로, 탐험 콘텐츠는 항상 접근 가능하게 유지하고 Skill Gate만 사용. Magic Lock(맥락 없는 차단) 금지.

4. **Affordance 존중**: 플레이어가 보이는 모든 발코니, 창문에 접근 가능해야 한다. 접근 불가한 시각적 요소는 제거("가짜 발코니 100개 삭제"). Navigation Clutter는 플레이어의 기대를 배신한다.

5. **탐험이 미션을 보완**: 탐험에서 발견한 아이템/정보가 메인 미션의 대안 경로를 열어주는 구조. 예: 탐험에서 얻은 신분증으로 은행 미션의 보안을 우회.

### 프로젝트 적용점

- **Ability Gate vs Stat Gate 설계 원칙**: 능력 게이트(특정 능력 필요)와 스탯 게이트(일정 수치 필요)를 명확히 구분하되, "보이는데 갈 수 없는" 상황은 반드시 시각적 힌트(잠긴 문의 색상, 아이콘)로 설명.
- **Exploration Setup 시스템 도입**: 메인 퀘스트/사이드 퀘스트 외에, 맵 곳곳에 작은 환경 스토리텔링 셋업 배치. 독립형 70%, 2개 이상 연결형 20%, 대형 10% 비율 참고.
- **탐험 보상이 전투/퀘스트에 연결**: 탐험에서 발견한 단서/아이템이 보스전이나 퀘스트에서 대안 루트를 제공하는 구조.
- **Navigation Clutter 제거**: 갈 수 없는 곳은 시각적으로 명확히 차단. 갈 수 있어 보이는 곳은 반드시 갈 수 있어야 한다.

---

## 4. Rewarding Exploration with Collectibles and Gatherables

### 발표자 / 게임
Leah Miller / WildStar, Dark Age of Camelot 등 (MMO 중심 범용 이론)

### 핵심 인사이트

1. **Collectible vs Gatherable 분류 체계**:
   - **Collectible** (유한): Checklist(완전 수집 목표), Tome(로어/정보), Specific Gear(고정 위치 장비)
   - **Gatherable** (무한): Crafting Material, Advancement Currency(골드/XP), Randomized Lootable

2. **"Everything is the Economy"**: 모든 밸런스 결정(아이템 배치, 콘텐츠 위치)은 플레이어 행동에 영향. 플레이어는 "재미있는 것"이 아니라 "효율적인 것"을 선택하는 경향이 있으므로, 탐험이 효율적이도록 경제를 설계해야 한다.

3. **시각 언어 교육**: Breath of the Wild처럼 "특이하게 보이는 것 = 무언가 있다"는 시각 패턴을 초반에 가르치면, 플레이어가 탐험에서 항상 보상을 기대하게 된다.

4. **Gatherable 배치의 Hot Spot / Cool Spot 이론**: 플레이어 밀집 지역(Hot Spot)에도 최소한의 수집물 유지, 한적한 지역(Cool Spot)에 높은 밀도로 보상 배치하여 탐험을 유도. Spawn Migration을 활용한 하이브리드 시스템이 최적.

5. **Flow를 멈추지 않는 Lore 수집**: 내러티브 수집물(Tome)은 플레이어를 강제로 멈추게 하면 안 된다. 오디오 큐 시스템이나 나중에 재생 가능한 로그 형태가 이상적.

### 프로젝트 적용점

- **수집물 체계 설계**: Metroidvania의 고정 위치 Specific Gear(영구 능력 업그레이드) + Item World의 Randomized Lootable(무작위 장비) + 맵 전역의 Advancement Currency(경험치 오브) 3종 구조.
- **시각 언어 규칙 확립**: "빛나는 벽 = 폭파 가능", "특정 색 문 = 특정 능력 필요", "코인 트레일 = 숨겨진 경로" 같은 일관된 시각 문법을 초반 튜토리얼에서 학습시키기.
- **탐험 효율성 보장**: 탐험 경로에서 얻는 보상이 메인 경로 대비 시간 대비 효율적이거나 최소한 동등하도록 밸런싱. 탐험 비효율 = 탐험 포기.
- **Metroidvania 재방문 보상**: 새 능력 획득 후 이전 맵 재방문 시 도달 가능한 Specific Gear를 배치하여 backtracking에 명확한 보상 제공.

### 수집물 배치 규칙

| 유형 | 배치 원칙 | 실패 조건 |
|:-----|:---------|:---------|
| Tome (로어) | 내러티브 맥락과 일치하는 위치, Flow 중단 금지 | 강제 읽기/듣기, 맥락 불일치 |
| Checklist | 시각적 힌트 제공, 100% 달성 시 의미 있는 보상 | 하나만 극도로 숨김, 보상 부재 |
| Specific Gear | 능력 게이트 뒤, 발견 시 즉시 가치 체감 | 불필요한 아이템, 접근 난이도 불일치 |
| Crafting Material | 환경과 일관된 출현 규칙 (숲=허브, 동굴=광석) | 맥락 무시 배치, 경제적 무가치 |
| Advancement Currency | 경로 안내 역할, 숨겨진 길 표시 | 메인 경로에만 집중 |
| Randomized Lootable | 즉각적 도파민 (내용물 즉시 확인 가능) | 열기 전까지 가치 불명 |

---

## 5. Benefits of Missing Out: What 'Cyberpunk 2077' Taught Us About Non-Linear Level Design

### 발표자 / 게임
Miles Tost (Lead Level Designer) / Cyberpunk 2077, CD Projekt Red

### 핵심 인사이트

1. **Discovery & Exploration Beat 구조**:
   - **Discovery Beat**: 플레이어가 선택지를 관찰하고, 계획을 세우고, 도전을 극복하는 구간. Establishing shot 역할.
   - **Exploration Beat**: 선택의 결과를 경험하는 좁고 친밀한 구간. 보상, 월드빌딩, 비밀이 여기에 존재.
   - 두 Beat가 교대하며 "약속 → 보상" 사이클을 형성.

2. **비선형 레벨의 3대 원칙**:
   - **Perception of Distance**: 경로 간 거리가 멀게 느껴져야 선택에 무게가 실린다. 수직 거리만으로는 부족하고 시야 차단이 필요.
   - **Perception of Exclusivity**: 선택하지 않은 경로의 결과를 볼 수 없어야 한다. 시선 차단(Line of Sight Breaking)과 One-way Drop 활용.
   - **Perception of Uniqueness**: 각 경로에 고유한 보상/경험이 있어야 한다. "다른 플레이어가 놓칠 수 있는 콘텐츠"가 가치를 만든다.

3. **Generic Path의 함정**: Fallback으로 의도된 기본 경로가 "가장 쉽고 명백한 경로"가 되어, 플레이스타일 경로의 가치를 희석시킨다. 기본 경로는 가장 어려운 경로여야 한다.

4. **스킬 투자의 역설**: 플레이어가 능력에 포인트를 투자했는데, 그 보상이 "게임의 일부를 건너뛰는 것"이면 오히려 게임을 덜 경험하게 된다. 스킬 투자의 보상은 "더 많은 고유 경험"이어야 한다.

5. **놓침의 가치(Benefits of Missing Out)**: 플레이어가 무언가를 놓쳐도 괜찮다 — 단, 그것이 "다른 멋진 것을 경험하면서" 놓친 것이어야 한다. 순이득(Net Gain)이 균형을 이루어야 한다.

### 프로젝트 적용점

- **Metroidvania 맵에 Discovery/Exploration Beat 적용**: 분기점(Discovery)에서 2~3개 경로 제시 → 각 경로(Exploration)에서 고유 보상/스토리 제공 → 다시 합류.
- **능력 게이트 뒤에 "더 많은 콘텐츠" 배치**: 이중 점프로 접근 가능한 구역은 "전투 스킵"이 아니라 "추가 보물방 + 로어 + 고유 적" 제공.
- **경로 간 시선 차단**: 벽, 지형, 안개 등으로 다른 경로가 보이지 않게 설계하여 "내가 선택한 길이 특별하다"는 느낌 강화.
- **Item World에 적용**: 무작위 생성 던전에서도 분기 구조를 활용 — 입구에서 2~3방향 선택, 각 방향에 고유 보상 테마 (전투 보상 / 수집물 / 숨겨진 상점).

---

## 6. 10 Key Quest Design Lessons from 'The Witcher 3' and 'Cyberpunk 2077'

### 발표자 / 게임
Pawe Sasko (Quest Director) / The Witcher 3, Cyberpunk 2077, CD Projekt Red

### 핵심 인사이트

1. **정보의 의도적 삭제(Subtraction of Information)**: 핵심 정보를 의도적으로 빼서 플레이어의 호기심을 유발. "알 수 없는 태그", "스캔 불가 장치" 등 시스템 내에서도 미스터리를 만든다.

2. **감정적 Banging Moment 중심 설계**: 스토리를 "멋진 장면(Cool Scene/Ember)" 위주로 짜면 영혼 없는 이야기가 된다. "감정적 충격(Fire)" — 캐릭터의 죽음, 배신, 상실 — 을 중심으로 구조를 짜야 한다.

3. **Signal vs Noise 이론**: 플레이어가 자유롭게 행동할 수 있는 구간(높은 Noise)에서는 덜 중요한 정보를, 행동이 제한된 구간(낮은 Noise)에서는 핵심 정보를 전달한다. Walk & Talk = 배경 정보, 앉아서 대화 = 핵심 플롯.

4. **"쉬는 시간"의 가치**: 캐릭터와 아무 목표 없이 함께하는 순간 — 포옹, 담배, 침묵 — 이 캐릭터 유대감의 핵심. "다음 목표로 달려가지 않는 순간"을 의도적으로 설계.

5. **선택지는 "느껴야 할 때" 제공**: 플레이어가 "이 녀석을 때리고 싶다"고 느끼는 바로 그 순간에 해당 선택지를 주면, 디자인이 플레이어의 감정과 동기화된다.

### 프로젝트 적용점

- **Metroidvania 내러티브에 정보 삭제 기법 적용**: NPC 대화나 환경 스토리텔링에서 핵심 정보를 일부 숨겨, 재방문 시 새로운 단서를 발견하는 구조.
- **Signal/Noise를 레벨 구조에 반영**: 전투 구간(높은 Noise) 직후 안전 지대(낮은 Noise)에서 NPC 대화/로어 제공. 전투 중 내러티브 전달 시도 금지.
- **보스 처치 후 "쉬는 방" 설계**: 보스전 후 즉시 다음 구역으로 밀어넣지 않고, 경치 좋은 휴식 공간에서 NPC와 잠시 교류하는 구간 배치.
- **온라인 Action RPG에서의 선택**: 멀티플레이 환경에서도 개인 퀘스트 선택지를 통해 "내 캐릭터의 이야기" 느낌 제공.

---

## 7. 'Genshin Impact': Crafting an Anime-Style Open World

### 발표자 / 게임
miHoYo (Hoyoverse) CEO & Producer / Genshin Impact

### 핵심 인사이트

1. **문화 다양성을 통한 세계관 깊이**: 각 지역(Nation)에 실제 문화 요소를 통합하되, 판타지 필터를 통해 해당 문화에 익숙하지 않은 글로벌 플레이어도 즐길 수 있도록 재해석.

2. **캐릭터 = 콘텐츠 + 상업화 + 스토리 전달 수단**: 연간 17명 캐릭터 추가. 캐릭터가 게임플레이 다양성, 문화 표현, 상업화(Gacha)를 동시에 담당하는 3중 역할.

3. **NPR + PBR 하이브리드 렌더링**: 캐릭터는 Forward Rendering(NPR 스타일화 제어), 배경은 Deferred Rendering(동적 라이팅). 두 파이프라인을 분리하여 각각 최적의 비주얼 달성.

4. **스타일화를 위한 "자연 법칙 해킹"**: 구름의 성장 애니메이션을 아티스트가 직접 키프레임으로 제어, 나뭇잎 카드 노멀 해킹, 얼굴 그림자 마스크 등 사실적 렌더링 규칙을 의도적으로 깨뜨려 스타일 달성.

5. **대규모 프로시저럴 + 아티스트 제어**: 지형, 풀, 나무 등 대량 에셋은 프로시저럴 생성하되, 색상/밀도/LOD를 아티스트가 세밀하게 조정. 스타일 표준화로 수백 명 아티스트의 결과물 일관성 확보.

### 프로젝트 적용점

- **2D 횡스크롤에서도 지역별 시각적 정체성 부여**: 각 맵 구역마다 고유한 색 팔레트, 배경 아트 스타일, BGM을 통해 "새로운 곳에 왔다"는 느낌 강화.
- **캐릭터를 콘텐츠 드라이버로**: 온라인 Action RPG에서 캐릭터별 고유 능력이 맵 탐험 방식을 바꾸는 구조 (특정 캐릭터만 열 수 있는 게이트 등).
- **웹게임 렌더링 최적화 참고**: 캐릭터와 배경을 별도 레이어로 렌더링하여 캐릭터 가독성 확보 (2D에서도 캐릭터 외곽선/조명 분리 적용 가능).

---

## 8. 'Ori and the Will of the Wisps': Narrative Design and Visual Storytelling

### 발표자 / 게임
Jeremy Grinton (Art Director & Story Lead) & Chris McEntee (Lead Designer) / Ori and the Will of the Wisps

### 핵심 인사이트

1. **방향 = 테마 (Directional Visual Vocabulary)**: 좌측 이동 = 과거/안전/익숙함, 우측 이동 = 미래/불확실/미지. 이 규칙을 프롤로그 전체에서 일관되게 유지하여 카메라와 플레이어 이동 자체가 내러티브를 전달.

2. **15초에 4단계 스토리텔링**: 가족 소풍 씬에서 Gumo(관심 유도) → Naru(음식 나눔) → Ku(거부=개성) → Ori(해결 제시+카메라 전환) 순서로, 15초 안에 캐릭터 관계와 갈등을 워드리스로 전달.

3. **환경 상태 = 감정 상태**: 비행 시퀀스에서 새벽→낮(희망)→폭풍(위기)으로 전환. "환경이 밝아지면 감정도 밝아진다"는 영화적 기법을 게임플레이에 통합.

4. **Mastery of Flight (점진적 능력 숙달 표현)**: 불안정한 이륙 → 나뭇잎 스침 → 구름 사이 비행 → 편대 합류 → 날갯짓 동기화. 캐릭터의 성장을 플레이어가 체감하도록 애니메이션 연출.

5. **스토리 결정의 용기**: Ku의 죽음/부상 같은 어려운 스토리 결정도, 초기 저항을 극복하고 시도했을 때 더 강력한 감정적 비트가 탄생. "창의적 교착 상태에서 대담한 변경을 시도하라."

### 프로젝트 적용점

- **횡스크롤에서 방향 = 의미 규칙**: 우측 진행 = 미지/도전, 좌측 귀환 = 안전/보급. 이 규칙을 맵 전체에서 일관되게 적용하여 방향 전환 자체가 내러티브 신호가 되도록 설계.
- **워드리스 스토리텔링 기법**: 텍스트 없이 캐릭터 애니메이션과 환경 변화만으로 스토리를 전달하는 구간 설계. 언어 장벽 없는 글로벌 온라인 게임에 특히 유효.
- **보스 패턴에 Mastery 표현 통합**: 보스전 반복 시 캐릭터 애니메이션이 점점 자신감 있게 변화하는 연출.
- **환경-감정 동기화**: 안전 지대는 밝고 따뜻한 조명, 위험 구역은 어둡고 차가운 조명으로 감정적 내비게이션 제공.

---

## 종합 교훈 (Cross-cutting Insights)

### 1. 탐험은 반드시 보상해야 한다
8개 강연 모두 공통적으로 강조: "보이는 곳에 갈 수 있어야 하고, 간 곳에서 무언가를 얻어야 한다." Breath of the Wild의 시각 언어, Deus Ex의 Affordance 원칙, Cyberpunk의 Perception of Uniqueness 모두 같은 뿌리.

### 2. 선택의 가치는 "놓침"에서 온다
Cyberpunk의 "Benefits of Missing Out"과 Deus Ex의 "Exploration Setup 연결형" 모두, 플레이어가 하나를 선택하면 다른 하나를 (일시적으로) 놓치는 구조가 선택에 무게를 부여한다.

### 3. 카메라는 내러티브 도구다
Side-Scroller 카메라 강연과 Ori 강연 모두, 카메라 이동/방향/줌이 "어디로 가라", "여기가 중요하다", "위험하다"를 말없이 전달하는 디자인 도구임을 강조.

### 4. 시각 언어의 일관성
Genshin의 스타일 표준화, BotW의 수집물 패턴 교육, Ori의 방향=테마, Deus Ex의 Navigation Affordance 모두, "이 게임의 시각 규칙"을 플레이어에게 가르치고 일관되게 유지하는 것이 핵심.

### 5. 단순함이 깊이를 만든다
Ori의 KISS 오디오, Deus Ex의 2인 탐험 팀, Cyberpunk의 "경로 수를 줄이되 각 경로의 질을 높이라"는 원칙 모두, 적은 시스템으로 깊은 경험을 만드는 것이 대규모 시스템보다 효과적.

### 6. 감정이 시스템보다 중요하다
Witcher/Cyberpunk의 "Fire and Embers" 이론, Ori의 환경-감정 동기화, Moon Studios의 Empathic Listening 모두, 기술적 화려함보다 플레이어의 감정적 반응이 기억에 남는다는 것을 증명.

---

## 프로젝트 적용 매트릭스

| 인사이트 | 적용 시스템 | 우선순위 |
|:---------|:-----------|:--------:|
| Region-based Camera + Cue Focus | 카메라 시스템 | P1 |
| Discovery/Exploration Beat 구조 | 레벨 디자인 (맵 분기) | P1 |
| 시각 언어 교육 (BotW 패턴) | 튜토리얼 + 맵 아트 | P1 |
| Collectible/Gatherable 3종 체계 | 보상 시스템 | P1 |
| 능력 게이트 뒤 "더 많은 콘텐츠" | 능력 게이트 설계 | P1 |
| 방향 = 테마 (좌=귀환, 우=진행) | 맵 레이아웃 규칙 | P1 |
| Navigation Affordance (갈 수 있어 보이면 갈 수 있어야) | 맵 아트 + 콜리전 | P1 |
| Signal/Noise 기반 정보 전달 | NPC 대화/이벤트 배치 | P2 |
| Exploration Setup 3계층 | 월드 콘텐츠 구조 | P2 |
| 경로 간 시선 차단 (Perception of Exclusivity) | 레벨 디자인 | P2 |
| 환경 상태 = 감정 상태 동기화 | 라이팅/배경 시스템 | P2 |
| Spawn Migration 하이브리드 시스템 | Item World 수집물 | P2 |
| 보스 후 "쉬는 방" 설계 | 보스전 후 레벨 플로우 | P2 |
| 정보의 의도적 삭제 (미스터리) | 퀘스트 내러티브 | P3 |
| 교차 리뷰 문화 (Flat Organization) | 팀 프로세스 | P3 |
| 캐릭터별 탐험 방식 차별화 | 캐릭터 설계 | P3 |
| 워드리스 스토리텔링 | 컷씬/연출 | P3 |
| 지역별 시각적 정체성 (문화 다양성) | 아트 디렉션 | P3 |
