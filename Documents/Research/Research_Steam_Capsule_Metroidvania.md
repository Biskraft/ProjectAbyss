# Steam 메트로베니아 Top 100 캡슐 이미지 전수 조사 — ECHORIS 캡슐 전략

> 문서 ID: RES-CAP-01
> 작성: 2026-06-10
> 목적: Steam 메트로베니아 판매 상위 ~100개 게임의 상점 캡슐 이미지를 조사하고, 전환(클릭→위시리스트) 근거 연구와 결합해 ECHORIS 캡슐 이미지 제작 기준을 확정한다.
> 방법론: SteamDB/Steam250/Gamalytic/VG Insights/GameDiscoverCo 교차 검증으로 상위 목록 확정(리뷰 수 × 30~50 = Boxleiter 추정). 상위 38개 캡슐은 개별 시각 분석, 전환 원칙은 Valve 공식 규격 + Chris Zukowski(howtomarketagame) 연구 + 공개 before/after 사례로 뒷받침.
> 관련: `Documents/Plan/Marketing_Wishlist_SNS_Roadmap.md`, `Documents/Design/Design_Art_Direction.md` (D-15), memory `project_erda_fullbody_base`

---

## 0. 결론 요약 (TL;DR)

1. **상위 셀러의 ~89%가 주인공을 캡슐 전면에 세운다.** 풀바디/액션 포즈가 68%. 메트로베니아 구매는 "내가 30시간 동안 누가 될 것인가"의 구매다.
2. **지배 공식 = 어두운 배경 + 채도 높은 단일 시그널 색 (~60%).** Hollow Knight(남색+백), Blasphemous(흑+적금), Nine Sols(흑+주홍), Ender Lilies(회+적). ECHORIS의 "어두운 메가스트럭처 + 에르다의 밝은 auburn 머리 + 청록 코어"는 이 공식에 정확히 올라탄다.
3. **픽셀 게임의 ~80%는 캡슐에 픽셀 아트를 쓰지 않는다.** 고해상 일러스트 키 아트를 별도 커미션한다(Blasphemous, Dead Cells, Carrion, Momodora 전부). raw 픽셀 캡슐은 Animal Well급 "글로우+실루엣+외부 신뢰 채널"이 있을 때만 작동.
4. **장르 상위권의 정서 = 아름다운 슬픔 (~55%).** 멜랑콜리·고독·신비가 상위 15개에서 더 우세. ECHORIS의 고독 톤은 시장 중심부와 일치한다 — 약점이 아니라 강점.
5. **캡슐은 #1 마케팅 자산.** 검증 사례: 일러스트 캡슐 교체만으로 위시리스트 4배(Kingdom Workshop), 판매 20배(Imagine Earth), 스트리머 조회 +230%(Clanfolk). 인디가 돈 쓸 단 한 곳 = 전문 캡슐 아티스트(~$500–1,000).
6. **2024-08 이후 규격 2배 상향.** 마스터 키 아트 1장(≥3840px)에서 8종 에셋 파생. 소형 캡슐 120×45px에서 로고가 읽히지 않으면 재설계.

---

## 1. 조사 대상 — 판매 상위 메트로베니아 (티어별)

리뷰 수 = 2025말~2026초 스냅샷(±15%). 중국 비중 큰 타이틀(Nine Sols, F.I.S.T., Afterimage)은 리뷰/판매 배율이 높게 편향.

### Tier 1 — Steam 300만 장+ (장르 정의)

| 순위 | 타이틀 | 연도 | 리뷰 수(추정) | 판매 티어 |
| :--- | :--- | :--- | :--- | :--- |
| 1 | Hollow Knight | 2017 | ~535,000 | Steam ~9–12M (전 플랫폼 15M+) |
| 2 | HK: Silksong | 2025 | ~300,000+ | Steam 5M+ (총 7M+, 2025-12 확인) |
| 3 | Dead Cells | 2018 | ~180,000 | Steam ~5M (총 10M+) |
| 4 | Ori and the Will of the Wisps | 2020 | ~145,000 | ~3–4M |
| 5 | Ori and the Blind Forest | 2015/16 | ~100,000 | ~3M |

### Tier 2 — 70만~250만 장

Blasphemous(~42k 리뷰), Nine Sols(~40k), SANABI(~45k, 태그 경계), Bloodstained RotN(~36k), Animal Well(~24k, $21M gross), Salt and Sanctuary(~23k), Dust: An Elysian Tail(~22k), Carrion(~21k), F.I.S.T.(~18k), Touhou Luna Nights(~14k), Blasphemous 2(~14k), The Messenger(~13k), SteamWorld Dig 2(~13k), Momodora RUtM(~13k), Guacamelee!(~18k 합산), GRIME(~12k), Ender Lilies(~12k, 전 플랫폼 1.5M), SteamWorld Dig(~12k), Pseudoregalia(~12k), Ender Magnolia(~10k), Cave Story+(~10k)

### Tier 3 — 15만~70만 장

Death's Gambit(~9.5k), Owlboy(~9k), Rabi-Ribi(~8.5k), PoP: The Lost Crown(~8k Steam, 총 1.3M), Aeterna Noctis(~7.5k), Deedlit in Wonder Labyrinth(~7k), UnEpic(~7k), Afterimage(~6.5k), Shantae HGH(~6k), Shantae Pirate's Curse(~5.5k), Iconoclasts(~5.5k), Vigil(~5k), The Last Faith(~5k), Gato Roboto(~5k), Sundered(~5k), Apotheon(~5k), TEVI(~5k), Axiom Verge(~5k), Mandragora(~5k), Momodora MF(~5k), Guacamelee! 2(~5k), Teslagrad(~4.8k), Timespinner(~4.5k), Valdis Story(~4.2k), Crypt Custodian(~4k), Laika(~3.2k), Islets(~3.5k), Chasm(~3.2k), Bo: PotTL(~3k), Wonder Boy DT(~3k), Yoku's(~3k), Awaken: Astral Blade(~3k), La-Mulana(~3k), Ghost 1.0(~3k)

### Tier 4 — 3만~15만 장

Ghost Song, Lost Ruins, Souldiers, Haiku the Robot, Lone Fungus, ESA, Astalon, Rusted Moss, Dandara, Monster Boy, Mummy Demastered, Frontier Hunter, La-Mulana 2, Pronty, Minoria, Shadow Complex R, Shantae 7S, Axiom Verge 2, Moonscars, Ultros, Trinity Fusion, Nine Years of Shadows, Biomorph, Gestalt, Yohane, The Knight Witch, Phoenotopia, Song of the Deep, Aquaria, Constance, Worldless, Greak, Tales of Kenzera, Voidwrought, Alwa's ×2, 8Doors, Cathedral, Itorah, Sheepo, Vernal Edge, Outbuddies DX (각 ~450–2,500 리뷰)

> 제외(태그 확인 후): Katana ZERO, Skul, ScourgeBringer, CrossCode, MO: Astray, Tails of Iron — 인접 장르. GameDiscoverCo: 장르는 극단적 상위 집중(메트로베니아 평균 $7.9M/53작이지만 중앙값은 타 태그 대비 저조). **상위권 공식을 따르는 것이 통계적으로 옳은 베팅.**

---

## 2. 상위 캡슐 시각 분석 — 패턴 (상위 38개 기준)

### 2.1 정량 패턴

| 패턴 | 비율 | 대표 |
| :--- | :--- | :--- |
| 주인공 전면 배치 | **~89%** | 거의 전부. 예외: Animal Well, Ori 1(極소), Carrion(괴물=주인공) |
| 풀바디/액션 포즈 | ~68% | Dead Cells, Silksong, PoP, Blasphemous |
| 주인공+동반자 듀오 | ~16% | Ori 2, Ender Lilies/Magnolia, Dust, Laika |
| 얼굴/흉상 클로즈업 | ~8% | Nine Sols (CN 시장 타게팅) |
| 환경 지배(캐릭터 극소/무) | ~13% | Ori 1, Animal Well, Ghost Song, Sundered |
| **어두운 배경 + 1–2 액센트 색** | **~60%** | HK, Blasphemous, Nine Sols, Last Faith, Ender Lilies |
| 오렌지-틸 보색 | ~20% | Dead Cells, Ori 2, SteamWorld, Bo |
| 밝은/하이키 팔레트 | ~20% | Silksong, Guacamelee, Owlboy, TEVI |
| **일러스트/페인팅 키 아트** | **~72%** | 지배적 |
| 플랫 벡터 | ~15% | Guacamelee, SteamWorld, Crypt Custodian |
| raw 픽셀 아트 캡슐 | ~10–13% | Animal Well, Owlboy, Gato Roboto |
| 로고 가로 중앙 배치 | ~75% | 상단 중앙 45% / 하단 중앙 30% |
| 멜랑콜리/신비/불길 무드 | **~55%** (상위 15에선 더 높음) | HK, Ender Lilies, Animal Well, Ghost Song |

### 2.2 "메트로베니아 기본 구도" (상위 ~50%가 변주)

> **풀바디 중소형 주인공 + 무기 가시화 + 낮은 카메라 + 수직으로 거대한 환경(또는 등 뒤의 더 큰 존재)**
> → "내가 누구인가" + "세계는 나보다 크다"를 한 장에 동시 전달. 장르의 약속 그 자체.

### 2.3 픽셀 게임의 캡슐 전략 (핵심 발견)

상위 40 내 픽셀 게임(Blasphemous ×2, Dead Cells, Carrion, Luna Nights, Momodora, Messenger, Axiom Verge, Last Faith, Gato Roboto…) 중 **~80%가 일러스트 캡슐** 사용. 이유:

1. 내부 해상도용 픽셀 아트는 120×45로 축소 시 노이즈로 붕괴 (실루엣·로고 에지 소실)
2. 일러스트 = 완성도 신호. 썸네일에서 픽셀 아트 품질은 평가 불가능 — 캡슐은 무드/장르만 운반하고, 실제 픽셀 아트는 호버 툴팁의 스크린샷 4장이 판다 (Zukowski 쇼핑 행동 연구: 쇼퍼는 캡슐이 "예쁘면" 호버하고, 장르 판별은 툴팁에서 5–10초에 한다. 캡슐이 매력 없으면 호버 자체가 없다)
3. 검증 수치: 스크린샷 캡슐 → 일러스트 초상 교체만으로 위시리스트 5→20/일 (4배, Kingdom Workshop)

raw 픽셀 캡슐 예외 조건(Animal Well): 흑배경 + 발광 + 단일 아이콘 실루엣으로 이미 캡슐 규칙을 충족 + 외부 신뢰 채널(Dunkey/Bigmode)이 발견성을 대체. **둘 다 없으면 모방 금지.**

### 2.4 주목할 아웃라이어

| 게임 | 위반 | 작동 이유 |
| :--- | :--- | :--- |
| Silksong | 장르의 어두운 캡슐 관행을 뒤집은 아이보리 배경 | 5M 위시리스트의 브랜드 반전 — 전작·모방작 전부와 즉시 구별 |
| GRIME | 창백한 석백색 캡슐 | Steam 다크 UI 그리드에서 역설적으로 가장 튐 + 아트하우스 관객 필터 |
| Nine Sols | 흉상 클로즈업(희귀) + 한자 병기 로고 | 1M+ 규모를 견인한 중화권 타게팅 |
| Gato Roboto | 흑백 2색 미니멀 | 1-bit 게임의 정직한 광고 + 2색 대비는 썸네일에서 강함 |
| Ender Lilies | 액션 0, "작은 아이 + 거대한 수호자" 정적 구도 | 정서(보호·비애)를 구도로 전달 — 후속작이 그대로 반복할 만큼 효과적 |

---

## 3. 전환 원칙 — 근거 기반 (Valve 규격 + Zukowski + 사례)

### 3.1 Valve 규격 (2024-08 2배 상향 이후 현행)

| 에셋 | 업로드 규격 | 노출 위치 |
| :--- | :--- | :--- |
| Header Capsule | 920×430 | 상점 페이지 상단, 추천 |
| **Small Capsule** | 462×174 (120×45 자동 생성) | **검색·리스트 — 노출 최다** |
| Main Capsule | 1232×706 | 메인 캐러셀, 위시리스트 메일 |
| Vertical Capsule | 748×896 | 시즌 세일 전면 |
| Library Capsule | 600×900 | 라이브러리 "박스 아트" |
| Library Hero | 3840×1240 | **텍스트 금지**, 중앙 안전영역 860×380 |
| Library Logo | 1280w/720h 투명 PNG | Hero 위 오버레이 |

콘텐츠 규칙(2022-09 시행): 캡슐엔 **아트 + 게임명/로고 + 공식 부제만**. 리뷰 점수·수상·할인 문구·인용구 금지(위반 시 피처링 배제). 업데이트 홍보 텍스트는 Artwork Override로 최대 1개월 + 지원 전 언어 로컬라이즈 필수.

### 3.2 검증된 설계 원칙

1. **마우스 자석 원칙:** 쇼퍼는 캡슐에 ~1초. 장르 판단 전에 "눈을 끄는가"로 호버 여부가 결정된다. 단일 초점(주인공 1 또는 환경 1 또는 정서 1) — 콜라주 금지.
2. **장르 신호 > 독창성:** 밀리초 패턴 매칭. 액션 메트로베니아 = "스타일리시한 캐릭터 액션 + 인상적 세계"가 한눈에.
3. **캐릭터/감정 포함 시 참여율 상승** (Zukowski 데이터 + 스트리머 썸네일 메타 전이 — 스트리머가 캡슐 아트를 썸네일에 재사용하므로 커버리지 질도 상승).
4. **Steam 다크 UI(#1b2838) 대비:** 중간 명도의 탁한 팔레트는 배경에 녹는다. 고휘도 요소 1개 이상 필수(림라이트·발광·밝은 로고).
5. **CTR 과신 금지:** CTR은 위시리스트와 거의 무상관(저트래픽 편향). 판단은 수 주간의 임프레션→방문, 위시리스트 레이트로. Steam에 네이티브 A/B 없음 → UTM, Discovery Queue 전후 비교, 외부 광고 A/B로 대용.
6. **단순 구도 + 굵은 타이포가 디테일 아트를 이긴다** (Discovery Queue에서 특히).

### 3.3 Before/After 검증 사례

| 게임 | 변경 | 결과 |
| :--- | :--- | :--- |
| Imagine Earth | 아마추어 캡슐 → 장르 트로프 반영 프로 키 아트 | 일 판매 0–3 → 40–60 (**~20배**) |
| Kingdom Workshop | 스크린샷 캡슐 → 일러스트 캐릭터 초상 (+태그 정비) | 위시리스트 5 → 20/일 (**4배**) |
| Clanfolk | 스트리머가 "곰팡이 빵"이라 부른 캡슐 → 일러스트레이터 커미션 | 동일 스트리머 2차 영상 조회 **+230%** |
| 2인 코지 어드벤처(2026) | 캡슐 포함 4개 레버 | 90일 위시리스트 284 → 1,047 (**3.7배**) |

> 주의: 관찰 사례(동시 변경 교란 있음). Tunic/Dome Keeper/Brotato는 공개된 캡슐 A/B 수치 없음 — 스타일 참고로만 인용할 것.

### 3.4 로고/타이포

- 마스터(1232×706)에서 설계, **120×45에서 검증** — 실패 시 로고를 재설계 (아트가 아니라)
- Small Capsule은 로고가 "거의 가득" (Valve 공식 권고). 별도 구성으로 취급, 크롭 아님
- 텍스트는 가장 단순한 배경 영역 위에 + 미세 스크림/그림자. 장식 서체는 썸네일에서 붕괴 — 장르 풍미(세리프=판타지/미스터리)는 유지하되 가독성이 제약 조건
- 8종 에셋 전체에서 팔레트·캐릭터 렌더링·로고 처리 통일. 마스터 키 아트 1장(≥3840px)에서 전부 파생

---

## 4. ECHORIS 캡슐 전략 (적용)

### 4.1 포지셔닝 — 시장 공식과의 정합 진단

| 시장 공식 (상위 셀러) | ECHORIS 보유 자산 | 판정 |
| :--- | :--- | :--- |
| 어두운 배경 + 단일 시그널 색 | 어두운 산업 메가스트럭처 + **에르다의 밝은 auburn 머리** | ✅ 정확히 일치 |
| 멜랑콜리/고독 무드 (상위 55%) | 고독 톤 (DEC-047) | ✅ 시장 중심부 |
| 풀바디 주인공 + 무기 + 거대 수직 환경 | 에르다 + 러스트본 검 + 빌더/메가스트럭처 1:40 스케일 | ✅ "메트로베니아 기본 구도" 그대로 |
| 듀오 구도 변형 (Ender Lilies형) | 에르다 + 거대 빌더 실루엣 (수호자 대신 무관심한 구조물) | ✅ 차별화 여지 |
| 일러스트 키 아트 (픽셀 게임 80%) | edra_fullbody_01~04 기준 비주얼 확보 | ✅ 기준 존재, 키 아트 커미션/생성 필요 |

ECHORIS는 장르 상위권 공식에 자연 정합한다. 캡슐에서 발명할 것은 없고, **공식을 정확히 실행**하는 것이 과제다.

### 4.2 ECHORIS 캡슐 사양 (권고)

1. **구도:** 메트로베니아 기본 구도 — 에르다 풀바디(중소형), 찢어진 망토, 러스트본 검 가시화, 낮은 카메라. 배후에 수직으로 치솟는 빌더/메가스트럭처 실루엣(어둡고 무관심). Ender Lilies 듀오 구도의 ECHORIS 변형: 수호자 자리에 "응답 없는 거대 구조물"을 세워 고독을 구도로 운반.
2. **팔레트:** 배경 = 짙은 차콜·네이비 무채(#0c1e2c 계열). 시그널 색 = **에르다 머리 (밝은 auburn #c8632e/#e08a3a)** — 캡슐에서 가장 밝고 따뜻한 유일 요소. 보조 발광 = 청록 코어/눈 (#4FD0C8/#6FE3DA) 한 점. 림라이트로 명도-팝 보강 (Steam 다크 UI 대비 고휘도 1+ 요소 원칙).
3. **아트:** **고해상 일러스트 키 아트** (raw 픽셀 금지 — Animal Well 예외 조건 미보유). edra_fullbody_01 룩(auburn 숏컷·망토·청록 코어·투톤 의체) 기준. 실제 픽셀 아트는 스크린샷 4장이 담당 — 호버 툴팁에서 키 아트와 인게임의 색·캐릭터 일치 필수 (bait-and-switch 방지).
4. **정서:** 아름다운 슬픔. 액션 과시보다 "거대한 침묵 속에 선 한 사람". 단 에르다 자세에는 의지(걷는 중/검을 쥠) — 무기력 아님.
5. **로고:** 가로 중앙(상단 또는 하단). 백/옅은 금 계열. 절제된 세리프 또는 기하 산세리프 — 120×45 테스트 통과가 제1 조건. "ECHORIS" 7자는 짧아 유리.
6. **마스터 1장 → 8종 파생:** 3840px+ 마스터에서 Header/Small/Main/Vertical/Library 전부. Small Capsule은 로고 중심으로 별도 구성.
7. **금지:** 리뷰·수상·문구 일절 (2022 규칙). 캐릭터 다수 콜라주. 중간 명도 탁색 배경.

### 4.3 실행 체크리스트

- [ ] 마스터 키 아트 제작 (edra_fullbody 기준, 위 사양) — 생성형 + 후보정 또는 외주 커미션(~$500–1,000)
- [ ] 120×45 가독성 게이트 (로고·실루엣)
- [ ] Steam 다크 UI(#1b2838) 목업 — 메트로베니아 태그 페이지 이웃 캡슐들 사이에 끼워 비교
- [ ] 8종 에셋 파생 + Library Hero 안전영역(중앙 860×380) 준수
- [ ] 스크린샷 4장(전연령 마킹)과 키 아트의 색·캐릭터 일치 확인
- [ ] 공개 후: 주간 임프레션→방문·위시리스트 레이트 추적 (CTR 단독 판단 금지)

---

## 5. 출처

### 판매 데이터
- [games-stats.com metroidvania 태그](https://games-stats.com/steam/?tag=metroidvania) / [steam250](https://steam250.com/tag/metroidvania) / [SteamDB 차트](https://steamdb.info/charts/?tagid=1628)
- [GameDiscoverCo — 인디 메트로베니아 히트 만들기(Haiku)](https://newsletter.gamediscover.co/p/how-to-make-a-hit-indie-metroidvania) / [태그별 수익 분포](https://gamedevreports.substack.com/p/gamediscoverco-steam-revenue-distribution)
- [Silksong 5M](https://alineaanalytics.substack.com/p/silksong-passed-5m-players-in-three) / [Ender Lilies 1.5M](https://gameworldobserver.com/2024/07/25/ender-lilies-quietus-of-the-knights-1-5-million-copies-sold) / [Bloodstained 2M](https://www.vgchartz.com/article/458374/bloodstained-ritual-of-the-night-sales-top-2-million-units/) / [PoP LC 1.3M](https://www.gamedeveloper.com/business/prince-of-persia-lost-crown-sold-1-3-million-copies-in-its-first-year) / [Animal Well Gamalytic](https://gamalytic.com/game/813230)

### Valve 공식
- [Store Graphical Assets](https://partner.steamgames.com/doc/store/assets/standard) / [Library Assets](https://partner.steamgames.com/doc/store/assets/libraryassets) / [Asset Rules](https://partner.steamgames.com/doc/store/assets/rules)
- [2022 캡슐 콘텐츠 규칙 발표](https://steamcommunity.com/groups/steamworks/announcements/detail/6232436041608114695) / [2024 규격 상향](https://www.gamedeveloper.com/business/steam-increases-store-image-requirements-details-phase-out-of-old-specs)

### 전환 연구 (Chris Zukowski / howtomarketagame)
- [Imagine Earth 20배](https://howtomarketagame.com/2020/04/13/how-one-new-image-increased-sales-by-20x/) / [Kingdom Workshop 4배](https://howtomarketagame.com/2020/12/21/how-to-increase-your-games-daily-wishlist-rate/) / [Clanfolk 스트리머 +230%](https://howtomarketagame.com/2022/07/18/how-do-you-get-streamers-to-cover-your-game-get-a-better-capsule/)
- [쇼핑 행동 정성 연구](https://howtomarketagame.com/2020/11/23/why-your-steam-page-matters/) / [CTR 벤치마크](https://howtomarketagame.com/2022/09/14/what-is-a-normal-click-through-rate-or-wishlist-rate-on-steam/) / [캡슐 트렌드 서베이](https://howtomarketagame.com/2020/10/28/trends-for-steam-capsule-design/) / [예산 우선순위](https://howtomarketagame.com/2022/03/08/what-should-you-spend-money-on-if-you-have-a-small-marketing-budget/)
- [GDC: 30 Minute Steam Page Makeovers](https://www.youtube.com/watch?v=fATEHq4Zv_Y)

### 가이드
- [presskit.gg 캡슐 아트 가이드](https://presskit.gg/field-guides/steam-capsule-art-guide) / [steamcapsule.com](https://www.steamcapsule.com/guide) / [90일 3.7배 사례](https://gamineai.com/blog/wishlists-tripled-90-days-2026-capsule-tag-demo-page-changes-actually-move-needle-steam-discovery)

### 한계
- 판매치는 Boxleiter 추정(±, CN 비중 타이틀 편향). 일부 확정치는 전 플랫폼 합산.
- Before/after 사례는 관찰 연구 — 동시 변경 교란 존재. 통제된 A/B 아님.
- 캡슐 시각 분석 38개는 상위권 집중 — Tier 4의 패턴은 별도 검증 안 함.
