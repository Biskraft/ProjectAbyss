# 메트로베니아 능력 전수 서베이 + ECHORIS 스파이크 능력 설계

> **작성일:** 2026-04-24
> **목적:** 13종 메트로베니아 게임의 능력/파워업을 전수 조사하고, ECHORIS의 수직 메가스트럭처에 고유한 스파이크 능력을 설계한다.
> **근거:**
> - 13종 게임 100+ 능력 분석
> - `Documents/System/System_Player_Abilities.md` — 현재 구현 (6종)
> - `Documents/System/System_World_AbilityGating.md` — 능력 게이트 배치
> - `Documents/Design/Design_Narrative_Worldbuilding.md` — 세계관 (빌더, 대공동, 기억)

---

## Part 1: 레퍼런스 게임 능력 전수 목록

### 수록 게임 (13종, 100+ 능력)

| 게임 | 능력 수 | 핵심 능력 |
|:-----|:------:|:---------|
| Super Metroid | 16 | Speed Booster+Shinespark, Screw Attack, Wall Jump |
| Metroid Dread | 10 | Flash Shift, Spider Magnet, Phantom Cloak |
| Hollow Knight | 8 | Mothwing Cloak, Dream Nail, Shade Cloak |
| Castlevania SotN | 11 | Soul of Bat, Form of Mist, Gravity Boots |
| Ori WotW | 9 | **Bash**(역대 최고 후보), Grapple, Burrow |
| Axiom Verge | 7 | **Address Disruptor**(현실 해킹), Drone Teleport |
| Dead Cells | 5 | Ram Rune(하강 관통), Spider Rune, Homunculus |
| Blasphemous | 5 | Blood Perpetuated in Sand |
| Guacamelee | 8 | **Dimension Swap**(차원 전환), Rooster Uppercut |
| Rain World | 6 | 물리 마스터리 (파워업 없이 스킬 게이트) |
| Env. Station Alpha | 6 | **Dash Booster V**(수직 대시 — 희귀) |
| The Messenger | 4 | **Cloudstep**(적=발판, 역대 최고 후보) |
| Bloodstained RotN | 9 | **Invert**(중력 반전), Reflector Ray |

### 기능별 분류 (Taxonomy)

| 분류 | 하위 유형 | 대표 능력 |
|:-----|:---------|:---------|
| **수평 이동** | 대시, 고속 질주, 순간이동, 반동 발사 | Bash, Speed Booster, Flash Shift |
| **수직 이동** | 이단점프, 벽등반, 그래플, 비행, 수직대시, 하강공격 | Space Jump, Mantis Claw, Grapple Beam, Ram Rune |
| **위상/변신** | 소형화, 관통변신, 동물변신, 중력반전, 차원전환, 투명화 | Morph Ball, Form of Mist, Dimension Swap, Invert |
| **파괴** | 폭탄, 특수빔, 색상블록파괴, 현실변형 | Power Bomb, Address Disruptor |
| **인식** | 스캔, 꿈진입, 글리치 시각 | X-Ray Scope, Dream Nail |
| **환경 상호작용** | 수중이동, 열/독저항, 자석, 터널링, 오브젝트 조작 | Gravity Suit, Spider Magnet, Burrow |

---

## Part 2: 스파이크 능력의 5대 패턴

가장 기억에 남는 능력들의 공통 패턴:

| 패턴 | 설명 | 대표 사례 | 감정 |
|:-----|:-----|:---------|:-----|
| **"세계가 열렸다"** | 능력 하나로 맵 30%+ 접근 가능 | Soul of Bat, Space Jump | 해방 |
| **"이동이 즐겁다"** | 사용 자체의 운동감각적 쾌감 | Bash, Cloudstep, Gravity Boots 연쇄 | 환희 |
| **"전투에도 쓸 수 있어?!"** | 탐험 능력이 전투에서도 강력 | Screw Attack, Rooster Uppercut, Bash | 놀라움 |
| **"세계를 다르게 본다"** | 같은 공간을 새 관점으로 재해석 | Dream Nail, Dimension Swap, Address Disruptor | 경외 |
| **"제약 해제 카타르시스"** | 오래 참았던 환경 제약이 풀림 | Gravity Suit, Isma's Tear | 해소 |

---

## Part 3: ECHORIS 현재 능력 진단

### 현재 구현 6종

| 능력 | 코드 플래그 | 원형 | 진단 |
|:-----|:-----------|:-----|:-----|
| 대시 (Dash) | `abilities.dash` | Mothwing Cloak | 기본 보유. **스파이크 아님** — 표준 |
| 벽점프 (Wall Jump) | `abilities.wallJump` | Mantis Claw | 표준. 기억에 안 남음 |
| 이단점프 (Double Jump) | `abilities.doubleJump` | Monarch Wings | 표준 |
| 다이브 어택 (Dive Attack) | `abilities.diveAttack` | Ram Rune | **좋음** — 하강 공격은 수직 구조와 정합 |
| 역류 쇄도 (Surge) | `abilities.surge` | Rooster Uppercut | **좋음** — 수직 상승 공격. 스파이크 정렬됨 |
| 수중 호흡 (Water Breathing) | `abilities.waterBreathing` | Holy Symbol | 가장 지루한 유형. 환경 저항 |

### 핵심 문제

1. **대시/벽점프/이단점프**는 모든 메트로베니아에 있는 표준 능력. "ECHORIS에서만 가능"한 느낌이 없음
2. **다이브 어택 + 역류 쇄도**는 수직 구조와 정합하여 좋은 방향이지만, "빌더의 유산"이라는 세계관과 연결되지 않음
3. 수중 호흡은 수동적 저항 능력으로 스파이크 패턴 어디에도 해당하지 않음
4. **인식 능력이 전무** — 빌더의 구조물을 "읽는" 능력이 없음

### 잘 되어 있는 것

- **대시가 기본 보유** — 좋은 결정. 게이트가 아닌 기본 이동
- **다이브 어택이 하강 핵심** — 수직 구조에 맞는 방향
- **서지가 상승 핵심** — "심연을 거슬러 올라간다"는 메타포가 스파이크와 정렬

---

## Part 4: 스파이크 능력 7종 설계

### 설계 원칙

1. **수직성이 주인공** — 대공동(The Shaft)의 수직 구조를 능력이 강조
2. **빌더의 유산** — 모든 능력은 빌더(Yggveil)가 남긴 기술의 파편
3. **이중 용도** — 탐험 게이트 + 전투 활용 반드시 존재
4. **기억 연결** — "아이템의 기억이 던전이 된다"와 공명
5. **감정 곡선** — 각 획득이 "대공동과의 관계가 바뀌는 순간"

---

### 능력 1: Resonance Nail (공명정)

> "대공동의 벽이 빛난다. 이 거대한 구조물이 아직 살아있다."

| 항목 | 내용 |
|:-----|:-----|
| **획득** | T2 중앙 성채 (첫 아이템계 클리어 보상) |
| **탐험** | 벽/바닥의 공명점에 못을 박아 진동 발생 → 구조물 메커니즘 활성화 (문 열림, 발판 확장, 엘리베이터 기동). 못을 박으면 주변 구조물이 빛나며 빌더의 청사진이 드러남 |
| **전투** | 적에게 박으면 3초간 공명 상태 → 공명 상태 적끼리 연쇄 진동 데미지. 보스 약점에 박으면 히트스턴 |
| **게이트** | 빌더 문양이 빛나는 공명점. 공명 체인 퍼즐 (A→B→C 순서 박기) |
| **스파이크 패턴** | "세계를 다르게 본다" — 벽이 단순 장애물이 아니라 살아있는 시스템임을 인지 |
| **수직 강조** | 낙하 중 벽면 공명점에 타이밍 맞춰 못 박기 — 하강이 퍼즐이 됨 |

---

### 능력 2: Stratum Dive (지층 관통)

> "바닥이 부서진다. 아래로 뚫고 내려간다."

| 항목 | 내용 |
|:-----|:-----|
| **획득** | T3 지하 수로 보스 처치 |
| **탐험** | 공중에서 아래+공격으로 고속 하강 돌격 → 지층 균열(Stratum Crack) 관통하여 아래 층 직접 돌파. 한 번 뚫으면 영구 지름길. **낙하 거리에 비례하여 관통력 증가** |
| **전투** | 하강 돌격이 광역 데미지 (낙하 거리 스케일링). 보스 갑각/방어막 균열 유일 수단 |
| **게이트** | 바닥에 금이 간 지층 균열 (아래 공간이 어렴풋이 비침). 층위 간 직통 연결 |
| **스파이크 패턴** | "세계가 열렸다" — 새 수직 루트 개방 + "이동이 즐겁다" — 고속 낙하의 쾌감 |
| **수직 강조** | **ECHORIS의 수직 정체성을 체현하는 핵심 능력.** "위에서 아래로 뚫는다" = 빌더가 세계를 만든 방식. 높이에서 뛰어내릴수록 강해지는 스케일링이 수직 활용을 보상 |
| **기존 연결** | 다이브 어택(`abilities.diveAttack`)의 상위 진화. 기존 코드 기반 확장 가능 |

---

### 능력 3: Echo Thread (잔향사)

> "심연의 벽 사이를 실 하나로 날아다닌다. 거미처럼, 이 심연을 직조하듯."

| 항목 | 내용 |
|:-----|:-----|
| **획득** | T3-4 묘지/카타콤 보스 처치 |
| **탐험** | 잔향 앵커(Echo Anchor)에 실을 연결 → 실을 타고 수직/대각/수평 이동. 양쪽 벽의 앵커에 교대로 실을 걸며 고속 상승/하강. 건 포인트는 영구 와이어 루트로 남아 지름길 |
| **전투** | 적에게 연결 → 3초 이동 구속. 두 적 사이에 걸면 전기 아크 데미지. 보스 약점에 걸고 끌어당겨 취약 유도 |
| **게이트** | 잔향 앵커가 있는 수직 샤프트, 대각선 앵커로만 도달 가능한 벽면 구역 |
| **스파이크 패턴** | "이동이 즐겁다" — 와이어 스윙의 쾌감. The Messenger Cloudstep + SotN Gravity Boots의 수직 버전 |
| **수직 강조** | 벽점프의 상위 호환. 넓은 샤프트 = 긴 와이어 대각 활공, 좁은 샤프트 = 빠른 지그재그 상승. 공간 크기가 이동 방식을 변화시킴 |

---

### 능력 4: Memory Imprint (기억 각인)

> "아이템의 기억이 던전이 된다면, 나 자신의 기억도 도구가 된다."

| 항목 | 내용 |
|:-----|:-----|
| **획득** | T4 연구소 폐허 (숨겨진 렐릭) |
| **탐험** | 현재 위치에 기억의 잔상(Memory Ghost) 각인 → 최대 10초간 유지 → 어디로든 이동 후 각인 위치로 순간 귀환. 위험 구역 탐색 후 안전 복귀. 잔상 위치에서 HP/위치 보존 |
| **전투** | 잔상 위치↔현재 위치 순간 교환 (페이크 아웃). 보스 공격 전 안전 지점에 잔상 남기고 회피. 잔상에 접촉한 적에게 방전 데미지 |
| **게이트** | 기억 균열(Memory Rift) — 5초 후 소멸하는 불안정 통로. 잔상을 입구에 남기고 통과 후 귀환. 무너지는 바닥 위의 보물 |
| **스파이크 패턴** | "세계를 다르게 본다" — 기억이라는 테마가 세계관에서 게임플레이로 직접 번역됨 |
| **수직 강조** | 수직 낙하 탐색의 리스크 관리. "아래로 뛰어내려 확인하고, 안 되면 돌아온다" |

---

### 능력 5: Forge Pulse (단조 파동)

> "빌더의 대장간에서 나온 열. 내 손에서 세계를 단조한다."

| 항목 | 내용 |
|:-----|:-----|
| **획득** | T5 빙결 보존소 보스 처치 |
| **탐험** | 차지 후 열 파동 방출 → 빙결 해제, 금속 가열 팽창(틈새 확장/발판 확장), 과열 구역에서 열 흡수로 냉각 통로 생성 |
| **전투** | 차지 공격으로 무기에 단조열 부여 → 3타격 화상+히트스턴 증가. 투사체를 열 파동으로 용해. 이노센트에게 사용 시 복종 확률 증가 |
| **게이트** | 빙결 장벽, 수축된 금속 구조물 (가열 시 팽창), 과열 구역 (흡수로 냉각 통과) |
| **스파이크 패턴** | "제약 해제 카타르시스" — 주황 단조열이 청록 빙결을 녹이는 시각적 대비가 강렬 |
| **수직 강조** | 빙결 구역은 대공동 하층부 핵심 환경. 수직 빙벽을 녹여 새 하강 루트를 여는 것 |

---

### 능력 6: Structural Echo (구조 반향)

> "대공동의 벽을 두드리자, 빌더가 설계한 방이 벽 너머에 있다."

| 항목 | 내용 |
|:-----|:-----|
| **획득** | T5-6 (모든 능력 활용 구간) |
| **탐험** | 벽/바닥/천장을 두드려 음파로 내부 구조 스캔 → 미니맵에 일시 표시 (숨겨진 방, 약한 벽, 비밀 통로). 특정 주파수로 빌더의 구조 기억 재생 — 과거 그 장소의 모습이 잔상으로 보임 |
| **전투** | 음파 펄스로 암흑 구역에서 적 위치 파악. 집중 음파로 보스 약점 강조. 광역 음파로 소형 적 스턴 |
| **게이트** | 완전 암흑 구역, 가짜 벽/바닥 (반향으로만 발견), 빌더의 기억 잠금 |
| **스파이크 패턴** | "세계를 다르게 본다" — 대공동이 단순 동굴이 아니라 설계된 건축물임을 체감 |
| **수직 강조** | 수직 샤프트에서 음파를 쏘면 아래 몇 층까지 이어지는지 음향적으로 체감 |

---

### 능력 7: Inverse Anchor (역위 닻)

> "위와 아래의 경계가 무너진다."

| 항목 | 내용 |
|:-----|:-----|
| **획득** | T6-7 심연의 구 |
| **탐험** | 특정 지점에 닻을 박으면 그 반경 내에서만 중력 반전 (토글이 아닌 앵커 기반 국소 반전). 최대 2개 동시 배치. 닻 배치로 자신만의 "중력 경로" 설계 |
| **전투** | 적 주변에 닻 → 적이 천장으로 떨어짐 (낙하 데미지). 보스 바닥 광역기를 천장에서 회피. 두 닻 경계선에서 적 왕복 진동 (트랩) |
| **게이트** | 천장 통로, 역중력 퍼즐 (정상+반전 교대 배치 수직 미로), 대공동 최심층 역위 지대 |
| **스파이크 패턴** | "세계가 열렸다" + "세계를 다르게 본다" — 위/아래 개념 자체의 해체 |
| **수직 강조** | "수직이란 무엇인가"라는 질문. 대공동의 최종 테마 = "심연의 깊이는 물리적이 아니라 존재론적" |
| **기존 연결** | 역류 쇄도(`abilities.surge`)의 세계관 확장. 서지가 "거슬러 올라감"이면 역위 닻은 "올라감과 내려감의 경계 해체" |

---

## Part 5: 기존 능력과의 대응 + 감정 곡선

### 기존 → 신규 대응표

| 기존 | 상태 | 신규 | 변경 이유 |
|:-----|:-----|:-----|:---------|
| 대시 | **유지 (기본 보유)** | -- | 기본 이동. 게이트가 아님 |
| 벽점프/벽슬라이드 | **잔향사로 진화** | Echo Thread | 벽점프 → 와이어 기반 수직 이동으로 대공동 스케일 체현 |
| 이단점프 | **유지 (기본 or 초기 렐릭)** | -- | 기본 수직 도구로 유지. 잔향사 획득 전 최소 수직 이동 보장 |
| 다이브 어택 | **지층 관통으로 진화** | Stratum Dive | 하강 공격 → 바닥 관통까지 확장. 수직 정체성 핵심 |
| 역류 쇄도 (Surge) | **유지** | -- | 수직 상승 공격. 이미 스파이크 정렬됨 |
| 수중 호흡 | **단조 파동에 흡수** | Forge Pulse | 수동 저항 → 능동 환경 변형. 빙결 해제+금속 팽창+열 흡수 |

### 최종 능력 로스터 (기존 유지 3 + 진화 2 + 신규 4 = 9종)

| 순번 | 능력 | 유형 | 획득 층위 | 감정 |
|:-----|:-----|:-----|:---------|:-----|
| 기본 | 대시 (Dash) | 기본 보유 | -- | -- |
| 기본 | 이단점프 (Double Jump) | 초기 렐릭 | T1-2 | 기본 수직 확장 |
| 기존 | 역류 쇄도 (Surge) | 상승 공격 | T2 | 수직 상승의 쾌감 |
| **신규** | **공명정 (Resonance Nail)** | 구조물 활성화 | T2 | "구조물이 살아있다" — **경외** |
| **진화** | **지층 관통 (Stratum Dive)** | 하강 관통 | T3 | "아래로 뚫는다" — **대담** |
| **진화** | **잔향사 (Echo Thread)** | 와이어 수직이동 | T3-4 | "심연을 직조한다" — **해방** |
| **신규** | **기억 각인 (Memory Imprint)** | 위치 기억/귀환 | T4 | "기억이 도구가 된다" — **지혜** |
| **신규** | **단조 파동 (Forge Pulse)** | 환경 열 변형 | T5 | "세계를 단조한다" — **온기** |
| **신규** | **구조 반향 (Structural Echo)** | 구조물 스캔 | T5-6 | "빌더의 설계도를 읽는다" — **계시** |
| **진화** | **역위 닻 (Inverse Anchor)** | 국소 중력 반전 | T6-7 | "중력의 경계가 무너진다" — **초월** |

### 감정 곡선

```
T1-2: 대시+이단점프+서지   → "기본기를 갖췄다" (기반)
        ↓
T2:   공명정              → "이 구조물은 살아있다!" (경외)
        ↓
T3:   지층 관통           → "아래로 뚫고 내려간다!" (대담)
        ↓
T3-4: 잔향사              → "벽 사이를 날아다닌다!" (해방)  ← 이동 쾌감 최고조
        ↓
T4:   기억 각인           → "기억으로 안전을 만든다" (지혜)
        ↓
T5:   단조 파동           → "얼어붙은 세계를 녹인다" (온기)  ← 환경 변형의 카타르시스
        ↓
T5-6: 구조 반향           → "빌더의 비밀이 드러난다" (계시)  ← 세계 인식 전환
        ↓
T6-7: 역위 닻             → "위와 아래가 무너진다" (초월)   ← 최종 능력
```

---

## Part 6: 다른 게임에 없는 ECHORIS 고유성

| 능력 | 유사 선례 | ECHORIS 고유 차별점 |
|:-----|:---------|:-------------------|
| 공명정 | Blasphemous 렐릭 (환경 변환) | **구조물이 살아있는 시스템으로 반응** — 못 하나로 연쇄 메커니즘 기동 |
| 지층 관통 | Ram Rune (하강 파괴) | **낙하 거리 스케일링 + 영구 지름길 생성** — 세계를 물리적으로 변형 |
| 잔향사 | Grapple Beam (스윙) | **양벽 교대 와이어 + 영구 루트** — 수직 샤프트 전용. 다른 게임의 그래플은 수평 |
| 기억 각인 | 없음 (가장 독창적) | **"기억" 테마와 게임플레이의 직접 번역.** 아이템 기억=던전이면, 플레이어 기억=도구 |
| 단조 파동 | Varia Suit (열 저항) | **능동적 환경 변형** — 저항이 아니라 세계를 녹이고/팽창시키고/냉각함 |
| 구조 반향 | X-Ray Scope / Pulse Radar | **빌더의 설계도 해독** — 단순 스캔이 아니라 구조물의 과거를 읽음 |
| 역위 닻 | Invert (중력 반전) | **앵커 기반 국소 반전** — 토글이 아니라 공간을 설계하는 도구. 2개 동시 배치 |

---

## Sources

### 게임별 능력 목록
- [Metroid Recon - Super Metroid Items](https://metroid.retropixel.net/games/metroid3/items1.php)
- [Digital Trends - Metroid Dread Abilities](https://www.digitaltrends.com/gaming/metroid-dread-abilities-guide/)
- [TheGamer - Hollow Knight All Abilities](https://www.thegamer.com/hollow-knight-guide-collecting-all-abilities/)
- [StrategyWiki - SotN Relics](https://strategywiki.org/wiki/Castlevania:_Symphony_of_the_Night/Relics)
- [PC Gamer - Ori WotW All Abilities](https://www.pcgamer.com/all-ori-and-the-will-of-the-wisps-abilities-best-skills-map/)
- [Axiom Verge Wiki - Upgrades](https://axiom-verge.fandom.com/wiki/Upgrades)
- [Dead Cells Wiki - Runes](https://deadcells.wiki.gg/wiki/Runes_and_upgrades)
- [Blasphemous Wiki - Relics](https://blasphemous.fandom.com/wiki/Category:Relics)
- [Guacamelee Wiki - Abilities](https://guacamelee.fandom.com/wiki/Category:Special_Abilities)
- [The Messenger Wiki - Cloudstep](https://the-messenger.fandom.com/wiki/Cloudstep)
- [Bloodstained Wiki - Shards](https://bloodstainedritualofthenight.wiki.fextralife.com/Shards)

### 분석/비평
- [DualShockers - Most Iconic Power-Ups](https://www.dualshockers.com/most-iconic-metroidvania-power-ups/)
- [TheGamer - Best Metroid Power-Ups](https://www.thegamer.com/metroid-series-best-power-ups-list/)
- [The Filibuster Blog - Top 10 Powerups](https://thefilibusterblog.com/top-10-iconic-powerups-in-metroidvania-games/)
- [ResearchGate - Framework for Metroidvania](https://www.researchgate.net/publication/346540910)
- [Game Developer - Metroidvania Design](https://www.gamedeveloper.com/design/the-foundation-of-metroidvania-design)

### ECHORIS 내부 참조
- `Documents/System/System_Player_Abilities.md` — 현재 구현 6종
- `Documents/System/System_World_AbilityGating.md` — 능력 게이트 배치
- `Documents/Design/Design_Narrative_Worldbuilding.md` — 세계관
- `Documents/Research/Research_Vertical_Movement_Relics.md` — 수직 이동 렐릭 리서치
