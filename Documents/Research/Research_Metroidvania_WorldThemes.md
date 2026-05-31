# 메트로베니아 월드 테마 & 구역 종류 리서치 (Metroidvania World Themes & Zone Types)

> 문서 ID: RES-MV-WT-01
> 작성: 2026-05-31
> 목적: 메트로베니아 장르의 월드 테마·구역(biome) 종류·수직 구조·다양성 원칙을 전수 조사하여 D-20 월드 마스터의 구역 설계를 레퍼런스로 보강한다.
> 선행 자료: RES-MV-01 (맵 구조·게이트), `Reference/Metroidvania Game Design Deep Dive.md`, `Reference/캐슬바니아 시스템 분석.md`, D-13 GridVania
> 정합 대상: D-20 §2(거시 구조)·§3(구역 체계)

---

## 0. 요약 (TL;DR)

- ECHORIS 의 상승 구조는 검증된 선례가 있다 — Hollow Knight: Silksong 이 정확히 "바닥 거점(Bone Bottom) → 정상 성채(citadel)" 의 상승 구조이며 "중력 자체가 진척의 지표". ECHORIS 의 상승 주축은 장르적으로 정당하다.
- 단, 장르의 지배적 기본형은 하강(Hollow Knight: Forgotten Crossroads 로 떨어져 더 깊이) 이다. ECHORIS 는 월드=상승 + 아이템계 다이브=하강 으로 둘 다 쓴다.
- 메트로베니아 구역은 ~10종의 반복 어휘(표면·녹지·동굴심부·침수·산업·도시폐허·화염·빙결·신전·오염) 로 수렴한다. ECHORIS 는 판타지 바이옴(화염·빙결·녹지) 을 버리고 산업 메가 스트럭처 변종으로 치환하되, 핵심 어휘(침수·도시폐허·산업·심부·신전·정상) 는 커버한다.
- 가장 중요한 보강 원칙 — Super Metroid "테마 내 지역 다양성": 한 구역을 단일 미감으로 평탄화하지 말고 2~3 서브 바이옴으로 쪼갠다. ECHORIS 의 "전부 회색 산업" 단조로움 위험의 해법.
- 구역 수는 품질(상호연결·의미) 이 수보다 중요. 명작 범위 = 7~14 구역. ECHORIS 7 구역은 정상 범위.

---

## 1. 주요 작품 월드 테마 비교

| 작품 | 구역 수 | 수직 방향 | 구역 어휘 (대표) | 특징 |
| :--- | :---: | :--- | :--- | :--- |
| Super Metroid (1994) | 7 대지역 | 혼합(하강 우세) | 표면(Crateria)·식생(Brinstar)·화염(Norfair)·침수(Maridia)·산업(Wrecked Ship)·최종(Tourian) | 테마 내 서브 바이옴 다양성의 원형 |
| 월하의 야상곡 (1997) | 14 구역 + 역전 성 | 혼합 | 입구·예배당·지하수로·연금술 연구소·시계탑·지하 카타콤 등 | 역전 성 = 거울 구조 자산 재활용 |
| Axiom Verge (2015) | 9 구역 | 혼합 | sci-fi 산업·생체기계·오염(Secret World 글리치) | sci-fi 산업 메트로베니아. 글리치 비밀 구역 |
| Hollow Knight (2017) | 14 구역 | 하강 주축 | 마을(Dirtmouth)·교차로·녹지(Greenpath)·균사지대·눈물의 도시·수정봉우리·심소(Deepnest)·왕국변경 | 깊이로 내려가는 다이브 구조 |
| Blasphemous (2019) | 다수 | 혼합 | 고딕 신전·종교 건축·고난 성지 | 비선형 자유 탐험 강조 |
| Ender Lilies (2021) | 다수 | 강한 수직성 | 폐성·침수·지하·설원 | 위/아래 도달 불가 지점 시야 노출 |
| Ghost Song (2022) | 다수 | 혼합 | 황량한 달·sci-fi 폐허·코스믹 공포 | 코스믹 테러 sci-fi 톤 |
| Silksong (2025) | 다수 | 상승 주축 | 바닥 거점(Bone Bottom) → 정상 성채(citadel) | 상승 구조. 중력 = 진척 지표 |

---

## 2. 메트로베니아 구역 어휘 (Zone-Type 주기율표)

장르 전반에서 반복되는 ~10종 구역 유형. 작품마다 톤만 바꿔 재사용한다.

| 유형 | 대표 사례 | 기능적 결 |
| :--- | :--- | :--- |
| 표면·입구 | Crateria, Howling Cliffs, Bone Bottom | 시작·거점. 낮은 위협 |
| 녹지·과생 | Greenpath, Brinstar(식물) | 초반 자연. 부드러운 진입 |
| 동굴·심부 | Norfair, Deepnest, Ancient Basin | 깊고 위험. 길 잃기 |
| 침수·수중 | Maridia, Royal Waterways, Fog Canyon | 이동 제약(수중 호흡 게이트) |
| 산업·기계 | Wrecked Ship, Crystal Peak, 공장 | 기믹 밀집. 기계 위협 |
| 도시·문명 폐허 | City of Tears, Forgotten Crossroads | 서사 밀도. 비 내리는 도시 |
| 화염·용암 | Norfair, lava 지대 | 환경 데미지 |
| 빙결·설원 | snow 지대 | 미끄러짐·저항 |
| 신전·성소 | Resting Grounds, Blasphemous 대성당 | 의례·경외. 보스 |
| 오염·글리치·감염 | Axiom Verge Secret World, Infected Crossroads | 후반 코스믹·변종 |
| 정상·하늘 | Silksong citadel | 클라이맥스. 시야 확장 |

> ECHORIS 의 선택: 판타지 바이옴(화염·빙결·녹지) 을 버리고 산업 메가 스트럭처로 통일하되, 기능적 어휘(침수·도시폐허·산업·심부·신전·정상) 는 그대로 커버한다. 즉 "장르 어휘는 지키되 표피는 메가 스트럭처 고유".

---

## 3. 수직 구조 패턴 (Vertical Structure)

### 3.1 하강형 (Descent) — 장르 기본형

Hollow Knight 모범. 플레이어를 깊이로 던지고("Forgotten Crossroads 로 떨어진다") 더 아래로 내려갈수록 위협·비밀 심화. "심연으로의 하강" 의 물리적 체험.

### 3.2 상승형 (Ascent) — ECHORIS 채택

Silksong 모범. 바닥 거점(Bone Bottom) 에서 정상 성채를 향해 점진 상승. 중력이 진척의 지표 — 표지판을 다 지워도 "탑을 오른다" 는 기본 전제만으로 이해 가능. 일관된 진척감(constant sense of progression).

> ECHORIS 정합: 월드=상승(Silksong 형), 아이템계 다이브=하강(Hollow Knight 형). 두 축 분리로 장르의 두 강점을 모두 취한다.

### 3.3 강한 수직성 노출 (Verticality)

Ender Lilies 모범. 위/아래의 도달 불가 플랫폼·문을 시야에 노출 — 능력 획득 전엔 못 가지만 보인다. 욕망과 인지 지도를 동시에 키운다.

> ECHORIS 적용: 상승 중 위쪽(정상·아직 못 감) 과 아래쪽(이미 지나온 깊이) 을 동시에 보여, 급강하/급상승 리듬의 공간 인지를 강화.

### 3.4 거울·역전 (Reversal) — 엔드게임

월하의 야상곡 역전 성 모범. 동일 레이아웃을 뒤집어 "익숙하되 새로운" 경험 + 자산 재활용 + 볼륨 2배.

> ECHORIS 적용: 엔드게임 역방향(정상 → 관리 권위) 구간이 이 역할. 급상승 구간이 이전 상승 구간을 새 능력(역중력) 으로 역주파 — 거울 효과의 변형.

---

## 4. 설계 원칙 (레퍼런스 추출)

### 4.1 테마 내 지역 다양성 (Super Metroid) — 최우선 보강

한 구역을 단일 미감으로 평탄화하지 말 것. Super Metroid 의 Brinstar 는 식물 지역이되 (a) 기어오르는 덩굴 바이옴, (b) 나무 내부 같은 바이옴, (c) 생체 위 인공 구조 바이옴 으로 갈라진다.

> ECHORIS 의 핵심 위험 = "전부 회색 산업" 단조로움. 해법 — 7 구역 각각을 2~3 서브 바이옴으로 분할(§6).

### 4.2 구역 정체성·가독성 (Readability)

구역의 톤·기하가 "여기가 어디고 지금 무엇이 가능한가" 를 즉시 알린다(telegraph). 구역별 강한 정체성이 인지 부하를 낮춰 호기심이 작동하게 한다.

### 4.3 보상 균등 분배 (Pacing)

가장 중요한 보상 = 새 구역을 여는 키(능력). 게임 전체에 균등 분배. 보상 공백이 길면 좌절. 모든 구역은 의미가 있어야 — 스토리를 진행하거나 메커닉을 해금.

### 4.4 구역 수 = 품질 > 수량

권장 절대 수치는 없다. 명작 범위 7(Super Metroid)~14(SotN/Hollow Knight), Axiom Verge 9. 핵심은 상호연결의 질과 의미 있는 진행. ECHORIS 7 구역은 정상 범위 — 단 각 구역의 서브 바이옴·상호연결 밀도가 관건.

### 4.5 sci-fi 산업 + 코스믹 톤 선례

Axiom Verge(9 구역 sci-fi 산업 + 글리치 비밀 구역), Ghost Song(황량한 달 + 코스믹 테러) 이 ECHORIS 의 산업 메가 스트럭처 + 코스믹 호러 톤의 장르 선례. 특히 Axiom Verge 의 "글리치/오염 비밀 구역" = ECHORIS 봉인된 하부·말소자 침식 구역의 참고.

---

## 5. ECHORIS 7 구역 vs 장르 어휘 검증

| ECHORIS 구역 | 장르 어휘 매핑 | 선례 |
| :--- | :--- | :--- |
| 침수 바닥층 | 침수·수중 | Maridia, Royal Waterways |
| 무너진 거주 구역 | 도시·문명 폐허 | City of Tears, Forgotten Crossroads |
| 거대 공장층 | 산업·기계 | Wrecked Ship, Crystal Peak |
| 무너진 환승역 | 도시 폐허(교통) | City of Tears 변종 |
| 봉인된 하부 | 동굴·심부 + 오염 | Deepnest, Axiom Secret World |
| 의례 대성당 | 신전·성소 | Blasphemous, Resting Grounds |
| 정상 — 하늘 시설 | 정상·하늘 | Silksong citadel |

검증 결과 — ECHORIS 7 구역은 장르 핵심 어휘를 빠짐없이 커버하면서, 전부 메가 스트럭처 변종으로 통일. 빠진 어휘(화염·빙결·녹지) 는 판타지 색이라 의도적 배제. 단 §6 의 서브 바이옴으로 시각 다양성을 보강해야 단조로움을 피한다.

---

## 6. 보강 권고 — 구역별 서브 바이옴 (Super Metroid 원칙 적용)

각 구역을 2~3 서브 바이옴으로 분할(D-20 §3 보강).

| 구역 | 서브 바이옴 후보 (2~3) |
| :--- | :--- |
| 침수 바닥층 | (a) 완전 침수 갱도 (b) 반쯤 물 빠진 폐기물 처리장 (c) 녹슨 격자 수면 위 |
| 무너진 거주 구역 | (a) 무너진 아파트 협곡 (b) 좁은 시장 골목 (c) 시공 단위가 관통한 거주동 |
| 거대 공장층 | (a) 정지한 조립 라인 (b) 활성 용광로(시공 광원 hazard) (c) 컨베이어 수직 통로 |
| 무너진 환승역 | (a) 거대 대합실 (b) 침수 승강장 (c) 끊긴 선로 위 외벽 |
| 봉인된 하부 | (a) 격리 감방동 (b) 가장 오래된 빌더 핵 (c) 말소자 침식 글리치 구역 |
| 의례 대성당 | (a) 합창 본당 (b) 산 얼굴 부조 회랑 (c) 헌납 제단 지하 |
| 정상 — 하늘 시설 | (a) 외부 노출 발판 (b) 관제 시설 내부 (c) 닿을 수 없는 최상층 전망 |

각 서브 바이옴은 같은 구역 테마를 공유하되 기하·조명·위협을 달리해 "익숙하되 단조롭지 않은" 메가 스트럭처를 만든다.

---

## 7. 출처 (Sources)

- [10 Metroidvanias With Intricate World Design — DualShockers](https://www.dualshockers.com/metroidvanias-with-intricate-world-design/)
- [Super Metroid and Building Believable Worlds](https://thelifeofgame.wordpress.com/2020/06/23/super-metroid-and-building-believable-worlds/)
- [How to create your own Metroidvania — Dreamnoid](https://dreamnoid.com/articles/how-to-create-your-own-metroidvania/)
- [List of locations in the Metroid series — Wikitroid](https://metroid.fandom.com/wiki/List_of_locations_in_the_Metroid_series)
- [Category:Areas (Hollow Knight) — Fandom](https://hollowknight.fandom.com/wiki/Category:Areas_(Hollow_Knight))
- [Hollow Knight Silksong Level Design — GameRant](https://gamerant.com/hollow-knight-silksong-level-design-climb-movement-abilities/)
- [Hollow Knight Silksong review — PCGamesN](https://www.pcgamesn.com/hollow-knight-silksong/review)
- [ENDER LILIES Metroidvania Staples — GameRant](https://gamerant.com/ender-lilies-quietus-knights-metroidvania-indie-games/)
- [Axiom Verge — Wikipedia](https://en.wikipedia.org/wiki/Axiom_Verge)
- [Category:Areas — Axiom Verge Wiki](https://axiom-verge.fandom.com/wiki/Category:Areas)
- [Ghost Song — Cosmic Terror Metroidvania — Push Square](https://www.pushsquare.com/news/2022/08/ghost-song-is-classic-metroidvania-with-the-cosmic-terror-dialed-to-11)
- [How Blasphemous' level design iterates on classic Metroidvanias — Game Developer](https://www.gamedeveloper.com/design/how-i-blasphemous-i-level-design-iterates-on-classic-metroidvanias)
- [The pacing of metroidvania games — Ruben Bimmel](https://rubenbimmel.itch.io/metroidvania-pacing-chart/devlog/87273/the-pacing-of-metroidvania-games)
- [How to design a great Metroidvania map — PC Gamer](https://www.pcgamer.com/how-to-design-a-great-metroidvania-map/)
