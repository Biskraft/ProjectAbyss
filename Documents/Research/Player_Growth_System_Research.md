# Player_Growth_System_Research.md — 플레이어 성장 시스템 전수 조사 (2026-05-18)

> **목적:** ECHORIS 에 *캐릭터 성장* 이 필요한지 결정하기 위해 메트로베니아 + 로구라이트 12 종 게임의 성장 시스템 전수 조사 + ECHORIS 내부 정합성 평가.
> **방법:** 병렬 4 Agent 조사 (RPG-heavy 4 게임 / 능력-only 4 게임 / 로구라이트 4 게임 / ECHORIS 내부).
> **권위:** 본 문서는 *조사 보고서* — 결정 자료. 결정된 사항은 `System_Growth_LevelExp.md` / `System_Growth_Stats.md` / `Design_Yarikomi_Philosophy.md` 등 GDD 권위 문서에 흡수.

---

## 0. 요약 (TL;DR)

**ECHORIS 의 현재 *3중 혼합 성장 모델* (캐릭터 레벨 + 장비 강화 + 기억 단편) 은 1차 niche 3 교집합과 정합하며 유지해야 한다.** 다만 다음 조정이 필요:

- **캐릭터 레벨 비중 축소** — Bloodstained 의 *레벨이 보조, Shard 가 주역* 패턴 차용. Phase 2 후반 레벨 곡선을 *완만하게* 굳혀 야리코미는 *기억 단편 grade/rank* 에 집중
- **영구/임시 분리 도입** — Hades / Rogue Legacy 2 의 *영구 능력 게이트 + 임시 빌드* 패턴을 *아이템계 다이브* 에 적용
- **수치 누적은 필수** — Hollow Knight 식 *순수 능력 게이트* 는 *디스가이아 야리코미* 톤과 충돌. 1차 niche 3 교집합 중 디스가이아 축이 *수치 누적 요구*
- **현재 미해결 5 카드** — Phase 2 레벨 곡선 / INT 코드 누락 / 멀티 스탯 게이트 / 듀얼 단편 합성 / 2차 파생 스탯 공식 — *결정/구현* 우선

---

## 1. 외부 게임 12 종 매트릭스

### 1.1 RPG-heavy 메트로베니아 (Agent #1)

| 게임 | EXP source | Level cap | 능력 vs 스탯 게이트 | 장비 vs 레벨 기여 | 야리코미 패턴 |
|:--|:--|:--|:--|:--|:--|
| **SotN** (1997) | 적/보스 | — | 능력 85% (Leap Stone + Bat 2개로 맵 85% 해금) | INT 공식 `base×0.2 + equip×0.8` → **장비 80%** | 99/99 퍼펙트 빌드, 역성 (Inverted Castle) |
| **Aria of Sorrow** (2003) | 적/보스 + 영혼 흡수 | — | 능력 게이트 중심 (Flying → Double → Giant Bat) | Tactical Soul 4 슬롯 + 영혼 256 캡 (+30/스탯) | Soul 100% 컬렉션, Julius Mode |
| **Bloodstained** (2019) | 적/보스 | **99** (실측 98) | 능력 게이트 중심 (Shard directional) | Shard 시스템이 후반 DPS 주역 (Igarashi: "Shard 가 무기보다 훨씬 강해야") | Lv99 후 EXP 지수 증가, Shard grade/rank 풀강화 |
| **Order of Ecclesia** (2008) | 적/보스 + Glyph Absorption | 60-70 일반, 255 NG+ | Glyph 통합 (무기/마법/변신 단일 축) | 속성별 AP (327 AP = +1% ATK, cap 65,535) | Lv1 클리어 → Lv255 해금, Hard/Albus Mode |

**디자인 시그널:** SotN 는 *느슨한 RPG 옷 + 능력 게이트* 극단. Aria/Bloodstained 는 *수집형 모듈러 빌드* 가 메인, 레벨은 보조. Order of Ecclesia 는 *Glyph 단일 축* + *역제약 야리코미* (Lv1 클리어 인센티브).

### 1.2 능력-only 메트로베니아 (Agent #2)

| 게임 | 수치 성장 | HP/무기 강화 | 능력 게이트 비중 | 야리코미 패턴 |
|:--|:--|:--|:-:|:--|
| **Super Metroid** (1994) | **없음** | Energy Tank (+100 × 14), Missile/Super/Power Bomb 확장 | **~100%** | 100% 수집, low% 엔딩, 스피드런 |
| **Hollow Knight** (2017) | **없음** | Mask Shard 16 (4=1Mask, 5→9), Nail 4 단계, Charm 11 slot | **~100%** | 112% 완성, Steel Soul, Pantheon, Godmaster |
| **Ori WotW** (2020) | **부분** (Spirit Light 통화) | Life/Energy Cell 단편, Shard 3→8 slot, 무기 구매 (Spirit Light + Gorlek Ore) | 주로 능력, 통화는 강화만 | Shard 컬렉션, Combat Shrine, Spirit Trial |
| **Metroid Dread** (2021) | **없음** | Energy Tank/Part (+100), Missile +2/+10, 신규 슈트/빔 누적 | **~100%** + EMMI 압박 | 100% 수집, Hard/Dread Mode, 시간 기반 엔딩 |

**디자인 시그널:** Metroid 시리즈는 30년 *장비 = 성장* 원칙 고수 (고립된 탐험가 페르소나). Hollow Knight 는 미니멀 4단계 Nail + Charm 빌드로 *자연주의 세계 + 액션 숙련도*. Ori WotW 는 *반(半) 수치 성장* 으로 4 게임 중 유일하게 RPG 수치 도입.

### 1.3 로구라이트 영구/임시 분리 (Agent #3)

| 게임 | 영구 (meta) | 임시 (per-run) | 분리 의도 | 야리코미 cap 후 retention |
|:--|:--|:--|:--|:--|
| **Dead Cells** | Cells 통화 → 청사진 / 돌연변이 영구 해금 (드롭 풀 확장) | Scrolls (3 분기: Brutality/Tactics/Survival) | 영구 = *선택지 확장*, 임시 = *빌드 일관성* | Boss Cell 4 + DLC + 청사진 마스터 |
| **Hades** | Mirror (Darkness), Pact of Punishment, Aspect (Titan Blood) | Boons (신 부여), Daedalus 망치, Pom | "Game over 제거, 죽음 = 구조의 자연" | **Heat 32 단계** + Aspect 5×6 + **NPC 내러티브가 메타 통화** |
| **Rogue Legacy 2** | **Heirloom (영구 능력 게이트)** + Manor (Gold) + Soul Shop | Trait (디버프/버프 모디파이어), Heirloom Rune | 후손 = *영구-임시 분리의 서사화* | NG+ 15 단계, 후손 무한 분기, Estuary |
| **Returnal** | Permanent Xenotech (능력 게이트), Weapon Proficiency | Artifact, Parasite (장단점), Malignant (저주 리스크) | "셀레네가 잊지 못한 것 vs 사이클마다 새 것" | Tower of Sisyphus (무한 등반), 서사 단편, Trait 마스터 |

**디자인 시그널:** 가장 메트로베니아적 = **Rogue Legacy 2** (Heirloom = 캐슬바니아 릴릭 동격). 가장 retention 강력 = **Hades** (메타 통화 다층 + 서사 자체가 통화). 가장 *risk/reward* = **Returnal** (Parasite + Malignant).

---

## 2. ECHORIS 내부 현황 (Agent #4)

### 2.1 현재 모델 정체

ECHORIS = **3중 혼합 성장 모델**:

| 축 | 구성 | 권위 문서 |
|:--|:--|:--|
| **캐릭터 레벨** (Lv1-10 MVP, Phase 2 Lv1-60) | EXP 4 수급원 (몬스터/방/보스/탐험) × 2-Space 배율 (월드 ×1.0 / 아이템계 ×0.7) | `System_Growth_LevelExp.md` §2.1, §2.2 |
| **장비 강화** | 아이템계 다이브 → 기억의 지층 → 강화 → 스탯 게이트 해금 | `System_World_StatGating.md` §2.1 |
| **기억 단편** | DEC-036, FinalStat = BaseStat + EquipStat + MemoryShardBonus, 슬롯 수 레어리티별 (Normal 2 → Ancient 8) | `System_Memory_Shard_Core.md`, `Design_Yarikomi_Philosophy.md` §4.1 |

### 2.2 다른 시스템과의 정합 (5 행)

| 결합 | 방식 | 상태 |
|:--|:--|:--|
| **2-Space 순환** | 월드 탐험 → 아이템 → 아이템계 → 강화 → 스탯 게이트 → 새 층위 | ✓ 완성 (D-01 §5) |
| **야리코미** | Lv60 캡 후 아이템 EXP 가 유일한 성장, 레어리티별 지층 상한 | ✓ 완성 (`Design_Yarikomi_Philosophy.md` §4.1) |
| **기억 단편 / 무기 Ego** | 단편이 FinalStat 합산 참여, 슬롯 레어리티 제한 | △ 진행 중 (기본 구조 ✓, 수치 튜닝 대기) |
| **스탯 게이트** | FinalATK/INT = Base + Equip + Shard, ATK=물리 장벽, INT=마법 봉인 | ✓ 완성 |
| **능력 게이트 (렐릭)** | 대시/벽타기/이단점프/수중호흡/역중력 6종, 월드 보스/탐험 only (아이템계 진입 불가) | ✓ 완성 |

### 2.3 1차 niche 페르소나 정합

| niche | 성장 요구 | ECHORIS 대응 |
|:--|:--|:--|
| **BLAME!/Made in Abyss** | 거대 수직 탐험 → *능력 게이트 강함 / 수치 누적은 보조* | 렐릭 6종 + 스탯 게이트 ✓ |
| **디스가이아 / 야리코미** | *무한 누적 + 수치 폭발* — 성장 곡선 자체가 retention | 기억 단편 grade/rank + Lv60 + 지층 무한 ✓ |
| **Transistor / 침묵 주인공** | *무기 인격이 성장 진행* — 캐릭터 본인은 미니멀 | 무기 Ego + 메모리 단편이 *서사 + 성장* 동시 ✓ |

**평가:** 3 교집합 모두 *수치 누적 + 능력 획득 혼합* 요구 → 혼합 모델이 정합.

### 2.4 미해결 카드

1. **Phase 2 레벨 곡선 (Lv1-60)** — 급성장→안정→야리코미 3단계 곡선 미정의
2. **INT 스탯 코드 누락** — `playerStats.ts` 파서가 INT 미수집 (CSV 에는 있음)
3. **2차 파생 스탯 공식** — 크리/드랍률/이동속도 등이 "기억 단편 전담" 명시만 있고 계산 없음
4. **멀티플레이 스탯 게이트** — 2-4인 파티 시 게이트 판정 기준 (최강자/평균?) 미정
5. **기억 단편 듀얼 합성** — ATK+INT 듀얼 스탯 단편 합성 메커닉 (비용/확률/조건) 미정

---

## 3. ECHORIS 의 성장 모델 적합도 (분석)

### 3.1 외부 게임과의 매핑

| ECHORIS 축 | 매핑되는 외부 모델 | 차이점 |
|:--|:--|:--|
| **캐릭터 레벨 Lv1-60** | Bloodstained Lv99 + Aria EXP 표 | 캡 60 (Bloodstained 99 보다 작음 — *레벨 비중 축소* 의도) |
| **장비 강화 (아이템계)** | Bloodstained Shard grade/rank + Aria Tactical Soul + Order of Ecclesia AP | 아이템계 *내부* 가 절차 던전이라 *Disgaea 아이템계 직계 후손* |
| **기억 단편** | DEC-036 인사이드 아웃 5색 + Bloodstained Shard + 무기 Ego (Transistor) | *내러티브 + 스탯* 통합이 독특 — Transistor 도 narrative 가 무기였지만 stat 비중 적음 |
| **렐릭 6종** | Super Metroid 슈트/빔 + Hollow Knight 능력 + Rogue Legacy 2 Heirloom | 영구 능력 게이트 = Rogue Legacy 2 패턴 |
| **2-Space 모델** | (외부 직접 매핑 없음) Hades 4 분기 + Disgaea 아이템계 변형 | *공간 분리* 가 ECHORIS 의 핵심 차별화 |

### 3.2 *성장 필요 여부* 결론

> **필요하다.** 다만 *RPG-heavy* 가 아닌 *Bloodstained / Aria 스타일 보조 레벨링 + Shard(=기억 단편) 주역* 톤이 정합.

**근거 3축:**

1. **1차 niche 디스가이아 축이 수치 누적 retention 을 요구** — Hollow Knight 식 순수 능력 게이트는 *야리코미 무한* 톤과 충돌. *기억 단편 grade/rank* 가 retention 의 핵심
2. **2-Space 순환 구조가 *강화 의례 공간* 을 별도 마련** — 아이템계 = 디스가이아 직계. 이 공간이 *수치 성장만* 을 위한 별도 layer 라 *월드 탐험* 의 페이스는 침해되지 않음 (Hollow Knight 의 침해 우려 해소)
3. **무기 Ego (DEC-036) 자체가 *서사 + 스탯* 통합 시스템** — 기억 단편이 *narrative 단위인 동시에 stat 단위* — Transistor + Bloodstained 혼합. 두 축을 분리하면 시그니처 약화

### 3.3 *RPG-heavy 가 X 인 이유*

| 위험 | 외부 사례 | ECHORIS 회피 |
|:--|:--|:--|
| 레벨이 너무 강하면 *탐험 게이트 약화* (SotN 의 능력 85% 해금이 *역설적으로* 작동한 이유) | 캐릭터 레벨 의존 시 *능력 게이트* 가 단순 *수치 게이트로 환원* | Lv60 캡 + 장비 80% 가중 (Bloodstained 패턴) |
| RPG progression 이 *액션 호흡* 침해 | 일부 SotN 비평 ("RPG 옷이 액션을 둔하게 함") | 캐릭터 레벨은 *EXP 보조*, 액션 호흡은 *기억 단편 슬롯 조합* 으로 표현 |
| 야리코미가 *단순 grind* 가 됨 | Bloodstained 의 Shard 시스템이 *grade/rank* 다층화로 회피한 패턴 | ECHORIS 기억 단편도 *5색 기질 + grade/rank* — 단순 누적 X |

---

## 4. 권장 — 현 모델 보강 카드

### 4.1 핵심 (P0)

1. **Phase 2 레벨 곡선 확정** — 미해결 카드 1. Bloodstained 의 *Lv1-30 급성장 → 30-60 안정 → 60+ 야리코미 지수 증가* 패턴 차용. 또는 Aria 의 *고정 스탯 증가* (랜덤 X) — 결정성 ↑
2. **INT 코드 wire-up** — 미해결 카드 2. `playerStats.ts` 파서 1-2 줄 수정. *데모 출하 전 P0*
3. **기억 단편 grade/rank 시스템 구체화** — Bloodstained Shard 의 *중복 수집 시 grade 상승 + rank 상승* 패턴 차용 가능성 검토. DEC-036 보강

### 4.2 차후 (P1)

4. **2차 파생 스탯 공식** — 미해결 카드 3
5. **듀얼 단편 합성** — 미해결 카드 5
6. **로구라이트 *임시 buff* 도입 검토** — Hades Boons / Returnal Parasite 패턴. 아이템계 다이브 시 *런 한정* buff 한 줄 선택지가 다이브 retention 강화 가능. 단 *2-Space 모델* 의 *영구 강화* 톤과 충돌 가능 — 신중

### 4.3 데모 직전 (P0 한정)

7. **Lv1-10 MVP 균형** — 현재 MVP 가 *데모 30분* 안에 *유의미한 레벨 변화* 를 제공하는지 검증. Hollow Knight 처럼 *능력 게이트 위주* 데모면 레벨 자체가 미체감 가능 — *체감 가능한 곡선* 으로 튜닝
8. **HP 모달 / 렐릭 모달** (Task_202605.md 미완료 항목) — 성장이 *플레이어에게 보이도록* UI 필수

---

## 5. 미해결 / 후속 결정 카드

| 카드 | 영역 | 우선도 | 비고 |
|:--|:--|:-:|:--|
| Phase 2 레벨 곡선 (Lv1-60 3단계) | LevelExp | **P0** | Bloodstained 패턴 / Aria 패턴 결정 |
| INT 코드 wire-up | Code | **P0** | playerStats.ts 1-2 줄 |
| 기억 단편 grade/rank | Memory Shard | P1 | Bloodstained Shard 패턴 차용 검토 |
| 2차 파생 스탯 공식 (크리/드랍/속도) | Stats | P1 | 기억 단편 전담 명시 후 공식 미정 |
| 멀티 스탯 게이트 (2-4인) | StatGating | P2 | Phase 3 멀티 시점 |
| 듀얼 단편 합성 | Memory Shard | P2 | Phase 2 후반 |
| 임시 buff (Hades Boons 패턴) | Yarikomi | P2 | 2-Space 영구 톤과 충돌 검토 |
| 데모 30분 레벨 체감 곡선 | Demo | **P0** | 데모 출하 직전 |
| HP 모달 / 렐릭 모달 | UI | **P0** | Task_202605.md 미완료 |

---

## 6. 참조

### 6.1 외부 게임

- **SotN**: [GameFAQs Stats Leveling](https://gamefaqs.gamespot.com/boards/196885-castlevania-symphony-of-the-night/69606903) · [deixadilson System](https://www.deixadilson.com/sotn/system) · [Castlevania Wiki Intelligence](https://castlevania.fandom.com/wiki/Intelligence) · [Avocado SotN Design](https://the-avocado.org/2021/11/09/one-giant-leap-1997-castlevania-symphony-of-the-night/)
- **Aria of Sorrow**: [RPGClassics EXP Chart](http://shrines.rpgclassics.com/gba/cvaos/experience.shtml) · [Neoseeker Leveling](https://www.neoseeker.com/castlevania-aria/faqs/1800244-castlevania-aos-leveling.html) · [Source Gaming Soul System](https://sourcegaming.info/2018/11/28/holism-aria-of-sorrows-soul-system/)
- **Bloodstained**: [FextraLife Stats](https://bloodstainedritualofthenight.wiki.fextralife.com/Stats) · [Igarashi Interview Gematsu](https://www.gematsu.com/2019/06/bloodstained-ritual-of-the-night-interview-with-producer-koji-igarashi-at-bitsummit-7-spirits) · [WCCFTech E3 2018](https://wccftech.com/bloodstained-interview-e3-2018-igarashi/)
- **Order of Ecclesia**: [Castlevania Wiki AP](https://castlevania.fandom.com/wiki/Attribute_Points) · [StrategyWiki Modes](https://strategywiki.org/wiki/Castlevania:_Order_of_Ecclesia/Modes)
- **Super Metroid**: [Wikitroid Energy Tank](https://metroid.fandom.com/wiki/Energy_Tank) · [Wikitroid Expansion](https://metroid.fandom.com/wiki/Expansion)
- **Hollow Knight**: [Hollow Knight Wiki Nail](https://hollowknight.fandom.com/wiki/Nail) · [Pale Ore](https://hollowknight.fandom.com/wiki/Pale_Ore) · [Team Cherry ACMI](https://www.acmi.net.au/stories-and-ideas/from-ludum-dare-to-pharloom/) · [112% Checklist](https://hollowknightchecklist.com/)
- **Ori WotW**: [Skills Wiki](https://oriandtheblindforest.fandom.com/wiki/Skills_(Ori_and_the_Will_of_the_Wisps)) · [Spirit Shards](https://oriandtheblindforest.fandom.com/wiki/Spirit_Shards)
- **Metroid Dread**: [Nintendo Life Walkthrough](https://www.nintendolife.com/guides/metroid-dread-walkthrough-power-ups-upgrades-ability-locations-missile-tanks-and-boss-guide) · [GameSpot EMMI Guide](https://www.gamespot.com/articles/metroid-dread-emmi-guide-tips-for-how-to-beat-each-one/1100-6496924/)
- **Dead Cells**: [Fandom Stats](https://deadcells.fandom.com/wiki/Stats) · [Paste Magazine Build Death](https://www.pastemagazine.com/games/dead-cells/even-in-death-dead-cells-lets-you-build-to-a-great)
- **Hades**: [Fandom Mirror](https://hades.fandom.com/wiki/Mirror_of_Night) · [Tom's Guide Supergiant Interview](https://www.tomsguide.com/features/hades-exclusive-interview-supergiant) · [DMS 462 Meta-Progression](https://dms462fall2020.wordpress.com/2020/12/06/meta-is-etymologically-greek-right-meta-progression-in-hades/)
- **Rogue Legacy 2**: [Heirlooms Wiki](https://rogue-legacy-2.fandom.com/wiki/Heirlooms) · [Soul Shop](https://rogue-legacy-2.fandom.com/wiki/The_Soul_Shop) · [Gameranx Heirlooms Guide](https://gameranx.com/features/id/299885/article/rogue-legacy-2-how-to-unlock-dashes-double-jumps-more-heirlooms-guide/)
- **Returnal**: [Push Square Death](https://www.pushsquare.com/guides/returnal-what-do-you-lose-when-you-die) · [Game Rant Xenotech](https://gamerant.com/returnal-all-permanent-xenotech-upgrade-locations/) · [Twinfinite Reconstructor](https://twinfinite.net/guides/returnal-reconstructors/) · [The Gamer Parasites](https://www.thegamer.com/returnal-artefacts-parasites-guide/)

### 6.2 ECHORIS 내부 (권위)

- `Documents/System/System_Growth_LevelExp.md` — 캐릭터 레벨 / EXP / 2-Space 배율
- `Documents/System/System_Growth_Stats.md` — FinalStat 합산 (Draft 상태)
- `Documents/System/System_World_StatGating.md` — ATK/INT 게이트 정의 + 렐릭 6종
- `Documents/System/System_Memory_Shard_Core.md` — 기억 단편 시스템
- `Documents/Design/Design_Yarikomi_Philosophy.md` — 야리코미 철학 §4 중첩 성장
- `Documents/Design/Design_Architecture_2Space.md` — 2-Space 순환 구조
- `memory/wiki/decisions/DEC-036-Memory-Shard-System.md` — 5색 기질 정체성

---

## 7. 변경 이력

| 일자 | 버전 | 요약 |
| :-- | :-- | :-- |
| 2026-05-18 | V1 | 12 게임 전수 조사 + ECHORIS 내부 정합 + 권장 5 카드 통합 보고 (병렬 4 Agent 결과) |
