# 절차적 보스 생성 역기획서 — 외형·약점·획득 루프 (Procedural Boss Reverse-GDD)

> **작성일:** 2026-06-03
> **목적:** ECHORIS 아이템계 보스("기억의 문") — *각 아이템이 외형·약점이 다른 보스를 절차 생성* — 를 위한 구현 가능 모델 도출. 상위 3개 레퍼런스를 병렬 심층 역분석 후 단일 모델로 종합.
> **역분석 대상 (3, 병렬):**
> - **Warframe — Kuva Lich / Sisters of Parvos** (무기-묶임 절차 네메시스 + 랜덤 약점 패스프레이즈 + 처치 시 무기 획득)
> - **Shadow of Mordor/War — Nemesis System** (정체-우선 모듈 조립 + 강점/약점 trait kit + 인텔 발견 + 처치=영입)
> - **Dwarf Fortress — Forgotten Beasts / Titans** (부위×재질×이동 3축 조립 + *재질=스탯/약점* 파생, Caves of Qud 보강)
> **연계:** `System_Enemy_BossArchetype.md` §2.4 절차 생성 레이어(본 역기획서가 근거), `Design_ChemicalReactions_FullMatrix.md`(속성=약점 엔진), `BossArchetype_Pattern_FullSurvey_Research.md`

---

## 0. 핵심 종합 — 하나로 수렴한 모델

세 레퍼런스는 서로 다른 장르(슈터/오픈월드/시뮬)지만 **동일한 절차 보스 골격**으로 수렴한다:

```
[시드 = 아이템]
   │
   ▼
[마스터 키 1축]  ← Warframe: element / DF: material / Nemesis: tribe+class
   │  (이 1축이 색·VFX·면역·약점·죽음 연출을 전부 파생 → 항상 정합)
   ▼
[모듈 조립 외형]  ← 기본 실루엣 × 팔레트 LUT × 부속 features (아트 비용 한정)
   │
   ▼
[trait kit]  강점/면역 + 약점(≥1 보장) + 거동  ← 레어리티 = trait 예산
   │
   ▼
[은닉 약점, 발견 가능]  설명 텔 + 색/오라 + 전투 피드백(부분 정답 flinch)
   │
   ▼
[처치 = 그 아이템 획득/강화]  보스 = 전리품. (+선택: 사면→일시 아군)
   │
   ▼
[아이템별 기억]  살려보내면 흉터+레벨+약점1 제거하고 재등장 (per-item 그러지)
```

**3대 불변식 (셋 다 공유 = 공정성의 핵심):**
1. **보상은 조준 가능, 약점은 블라인드.** RNG는 *도전 축*에만. 플레이어는 어느 아이템/접사가 걸렸는지 *보고* 도전한다(Warframe larvling 프리뷰).
2. **약점 ≥1 보장 + 면역은 스턴 중 해제.** 무작위로 굴려도 *언제나 격파 가능*(Nemesis). 막다른 보스 없음.
3. **약점은 *말해지지 않고 추론된다*.** 재질/외형/색이 텔레그래프(DF 설명문 + CoQ 마젠타). 발견은 정보를 *버는* 루프.

---

## 1. 외형 생성 (Appearance)

세 레퍼런스의 공통 원칙 = **"정체 우선 + 마스터 키 파생 + 모듈 조립"**. 자유 절차(free-form)가 아니라 *사전 제작 풀의 시드 재조합*.

| 레퍼런스 | 외형 생성 방식 | 핵심 |
|:---|:---|:---|
| Warframe Lich | element(progenitor) = 마스터 키 → 색·에페메라·무기 VFX·능력 전부 파생. 헬멧=제작 워프레임. 이름=2어절 테이블. 20% 에페메라 | **1 element 키가 다축 시각을 묶어 무료 정합** |
| Nemesis | 정체(tribe→class→personality) 먼저 굴리고 *외형·무기·보이스를 정체에 맞춰 선택*. 슬롯 모듈(얼굴/투구/갑옷/무기/흉터/워페인트) | **정체-우선. 흉터는 런타임에 전투 이력으로 추가** |
| DF Forgotten Beast | 부위(body plan) × 재질(material) × 이동 3축 + 부속 features. 기본 동물 템플릿 앵커 + 대조 quirk 1개. 템플릿 설명문 조립 | **3 직교 축 조합 = 조합적 다양성, 아트 한정** |

**→ 종합 외형 공식 (2D):**
```
보스 외형 = [기본 실루엣(형태 F1~F7)] × [무기 카테고리 본체 템플릿]
          × [마스터 키 = 속성 → 팔레트 LUT + VFX]
          × [부속 features(뿔/날개/렌즈/촉수…)] × [레어리티 오라/사이즈]
```
풀 절차 메시 불필요. 실루엣 5-7종 + 팔레트/속성 리스킨 + 부속으로 조합 다양성. (Nemesis "레고 블록", DF "3축", ECHORIS 아트 효율 원칙 일치.)

---

## 2. 약점 생성 (Weakness)

가장 중요한 축. 세 레퍼런스가 **약점을 생성·은닉·발견**하는 방식을 종합.

### 2.1. 생성 — 재질 파생 + trait kit

- **DF (핵심):** 재질 1픽이 *내구·면역·취약·죽음 연출·자기 피해*를 전부 파생. "deadly-dust × 금속 = 치명 / × 살점 = 자해 부채." **위협 = 재질 × 능력**, 능력 단독 아님. → 카운터가 *공짜로 창발*.
- **Nemesis:** class-gated 풀에서 강점/면역/격노/약점/공포를 예산만큼 추출. 강점은 항상 *악용 가능한 이면*과 쌍(격노=강하지만 예측 가능).
- **Warframe:** 패스프레이즈(8중 3, 순서有 = 336조합) + 독립적 데미지 프로필(약점+25%/저항−50%/자속성 면역).

### 2.2. 은닉 & 발견 (Discovery)

| 방식 | 레퍼런스 | 2D 적용 |
|:---|:---|:---|
| 설명문 텔 | DF("녹은 숨결을 조심하라" + 재질 명시) | 진입 시 보스 1줄 생성 설명 |
| 색/오라 텔 | CoQ 마젠타, Warframe element 색 | 속성색 오라 = 약점 힌트 |
| 인텔 수집 | Nemesis(웜/정찰로 약점 공개) | 정찰 룸·해킹·머머 등가물 |
| 머머 그라인드 | Warframe(thrall 30마리/바 → 심볼 공개, 순서는 미공개) | 약점 *단계적* 공개 |
| 전투 피드백 | 셋 다(부분 정답 flinch, 한 방에 사지 손실=취약) | 올바른 단계에 보스 경직 |

### 2.3. 공정성 불변식

- **약점 ≥1 보장.** 면역으로 도배해도 *반드시* 격파 경로 존재.
- **면역은 스턴/공포/경직 중 일시 해제**(Nemesis) — 무작위 면역이 막다른 길이 되지 않게.
- **모순 배제 패스:** `면역(불) ↔ 치명약점(불)` 동시 금지. 풀 분할로 자기상쇄 불가.
- **재질 희석:** `SIZE_DILUTES`/`RESISTABLE`로 단일 굴림이 무한 치명화 못 함(DF).

---

## 3. 획득 루프 (Acquisition)

핵심: **보스 = 그 아이템의 전리품.** 셋 다 "처치 = 보상 획득/전환"을 공유.

```
시드(아이템 식별/드랍)
   → 보스 인스턴스화(마스터 키 + trait kit + 은닉 약점 + 보상 = 그 아이템 접사)
   → 헌트(다이브 진행 = thrall/intel = 약점 단계 공개)
   → 발견(설명·색·피드백으로 약점 추론)
   → 격파(약점 적중 = 즉살/공포-도주 등 빠른 클리어)
   → 클레임(= 그 아이템 강화·접사 확정·획득)   ← 보스 IS the loot
   [선택 분기] 사면 → 보스가 일시 아군/버프 (Warframe convert / Nemesis brand)
```

**살려보냈을 때 (per-item 기억):** 다이브 실패·후퇴 시 그 아이템의 보스가 *흉터 + 레벨업 + 약점 1 제거*로 재등장(Nemesis 그러지, 단 아이템 1개에 스코프). 저장 비용 작고 에스컬레이션 스릴 보존.

**압박 (살아있는 동안):** Warframe "loot tax + territory" → 2D 등가 = 그 아이템 *강화 잠금* 또는 다이브당 자원 누출. 해결 동기.

> **프리미엄 정합 주석:** 위 압박은 *콘텐츠 도전 구조*이지 리텐션 펀넬이 아니다. ECHORIS는 완성형 프리미엄 — 압박 = "이 아이템을 정복하라"는 야리코미 후크.

---

## 4. 종합 데이터 스키마 (ECHORIS용)

```yaml
ItemWorldBoss:                       # 시드 = 1 아이템
  sourceItem:        ItemRef         # 이 보스를 생성한 아이템(보상 대상)
  seed:              uint

  # ── 마스터 키 (정합 1축) ──
  attribute:         enum{ magma, water, oil, acid, charged, cyro }  # = 속성(fluid)
  #   → 색/VFX/면역/약점/죽음 연출 전부 파생 (Design_ChemicalReactions_FullMatrix)

  # ── 형태 + 본체 (외형) ──
  form:              enum{ F1_Siege, F2_Core, F3_Automaton,
                          F4_Eraser, F5_Duelist, F6_Fabricator, F7_Authority }
  weaponTemplate:    enum[ 무기 카테고리 ]   # 본체 실루엣(IWB-10-A: 무기→외형)
  features:          Feature[]               # 렌즈/촉수/뿔… (서술·약점부위)
  palette:           = attribute.LUT
  sizeTier:          = rarity

  # ── trait kit (약점 = 재질 파생 + 예산) ──
  derived:                           # attribute에서 파생 (굴리지 않음)
    immunities:      Tag[]           # 예: magma→[immune_fire]
    vulnerabilities: Tag[]           # 예: magma→[weak_water/cyro]  ← 화학 매트릭스
    deathFx:         enum{ explode, harden, dissolve, shatter }
    selfHazard:      bool            # oil 본체가 자기 화염에 점화 등 자해 루프
  weakness:                          # 은닉, 발견 가능 (≥1 보장)
    steps:           [Sym × 2~3]     # 2D 단순화: 8중3·336 → 4~5중 2~3단
    revealState:     [bool × n]      # 정찰/피드백으로 단계 공개
  strengthBudget:    = rarityTable[rarity]   # Normal 1 … Ancient 4면역/2강점

  # ── 보상 (조준 가능) ──
  reward:            = sourceItem.upgrade     # 처치 = 그 아이템 강화/접사 확정
  imprint:           nullable Tag             # 보스 강점 1개를 아이템에 각인(선택)

  # ── per-item 기억 ──
  memory:
    survivedDives:   int
    scars:           Scar[]          # 재등장 시 외형 누적
    weaknessRemoved: int             # 살아남을수록 약점 1씩 제거

  # ── 등급/스케일 ──
  grade:             enum{ 장군, 왕, 신, 대신 }   # = 레어리티 (§2.1 등급 축)
  strata:            int             # 지층 깊이 → trait tier (DF/CoQ zone tier)
```

**생성 순서:**
`시드(아이템) → 속성(마스터 키) → 형태+본체+features(외형) → 속성에서 면역/약점 파생 → 레어리티=trait 예산으로 강점·약점단계 굴림 → 모순배제 패스(약점≥1 보장) → 보상=아이템 강화 바인딩`

---

## 5. ECHORIS 적용 — 가장 강력한 정합 5가지

1. **속성(fluid) = 마스터 키 = 약점 엔진 (0비용).** Warframe element + DF material을 ECHORIS 속성으로 통합. **이미 구현된 화학 반응 매트릭스가 약점 데이터를 자동 제공** — magma 보스는 water/cyro로, oil 보스는 charged/magma로, charged 보스는 water 전도로. 보스별 약점 수기 정의 불필요.
2. **형태 F1~F7 = 기본 실루엣 풀.** 절차 외형의 실루엣 축(DF body plan)을 이미 확정한 7형태로. 아트 한정.
3. **레어리티 = trait 예산 + 약점 단계 깊이.** Normal=1강점/1약점단계 … Ancient=4면역/2강점/3약점단계 + 더 깊은 지층. (DF/CoQ zone-tier 스케일.)
4. **보스 = 전리품.** 처치 = *그 아이템* 강화/접사 확정(Warframe weapon claim) + 선택적 강점 각인(Nemesis brand). 아이템계 파밍 동기와 1:1.
5. **자해 루프 = 아레나 퍼즐.** oil 보스가 자기 슬릭에 점화, 살점 보스가 자기 독무에 chip — 위치/속성 활용이 raw DPS보다 보상받음(DF). ECHORIS 화학+컨테이너 시스템과 직결.

---

## 6. 2D 솔로 파밍을 위한 단순화 (MVP 컷)

| 유지 (Keep) | 단순화/컷 |
|:---|:---|
| 시드→마스터키→은닉약점→발견(피드백)→처치=클레임 5비트 | Warframe 336조합 → **4~5중 2~3단** (세션 짧게) |
| 속성=약점 (화학 매트릭스 재사용) | DF 수십 증후군 → **기존 상태이상 5종**(연소/동결/감전/중독/부식)으로 축약 |
| 약점≥1 보장 + 스턴 중 면역 해제 (공정성) | Nemesis 월드 social/duel 시뮬 → **per-item 기억만**(아이템 1개 스코프) |
| 보상 조준 가능 / 약점 블라인드 | Warframe squad murmur 경제 → 솔로 정찰/피드백 공개 |
| per-item 흉터·레벨 재등장 | 5랭크 스타차트 영토 확산 → **단일 agitation 타이머** 또는 2~3티어 |
| 사면→일시 아군 (선택 깊이) | 멀티-보스 사회 계층 = **컷** (아이템 1개씩 조우) |

---

## 7. 출처 (Sources)

### Warframe (Kuva Lich / Sisters of Parvos)
- [Kuva Lich](https://wiki.warframe.com/w/Kuva_Lich) · [Gameplay](https://wiki.warframe.com/w/Kuva_Lich/Gameplay) · [Progenitor](https://wiki.warframe.com/w/Kuva_Lich/Progenitor) · [Rewards](https://wiki.warframe.com/w/Kuva_Lich/Rewards) · [Requiem Mods](https://wiki.warframe.com/w/Requiem_Mods) · [Sisters of Parvos](https://wiki.warframe.com/w/Sisters_of_Parvos)

### Shadow of Mordor/War (Nemesis System)
- [Nemesis 특허/개요 (ScreenRant)](https://screenrant.com/shadow-mordor-nemesis-system-patent-wb-games-approved/) · [설계 철학 (GameDeveloper)](https://www.gamedeveloper.com/design/designing-i-shadow-of-mordor-i-s-nemesis-system) · [Postmortem (GameDeveloper)](https://www.gamedeveloper.com/audio/postmortem-monolith-productions-i-middle-earth-shadow-of-mordor-i-) · [절차 생성 분석](https://procedural-generation.isaackarth.com/2015/10/19/middle-earth-shadows-of-mordor-2014-the-open.html) · [스토리 생성 (Eckstein)](https://medium.com/@niklaseckstein/how-the-nemesis-system-creates-stories-d26754b30d2e) · [Complete Guide (TheGamer)](https://www.thegamer.com/middle-earth-shadow-of-war-orc-nemesis-system-complete-guide/) · [Classes (Fextralife)](https://shadowofwar.wiki.fextralife.com/Classes)

### Dwarf Fortress / Caves of Qud
- [Forgotten beast](https://dwarffortresswiki.org/index.php/DF2014:Forgotten_beast) · [Syndrome](https://dwarffortresswiki.org/index.php/DF2014:Syndrome) · [Megabeast](https://dwarffortresswiki.org/index.php/DF2014:Megabeast) · [entitygen FB 생성기](https://github.com/fireheadlazzo/dwarf-fortress-entitygen/wiki/Forgotten-Beasts) · [CoQ Legendary creature](https://wiki.cavesofqud.com/wiki/Legendary_creature) · [CoQ Zone tier](https://wiki.cavesofqud.com/wiki/Zone_tier)

> **방법론 주석:** 3개 시스템을 병렬 에이전트로 동시 역분석 후 단일 모델로 종합. Nemesis 내부 생성기는 미공개·특허(US 11,738,266, 2036 만료)라 [추론] 표기 항목 존재. 일부 Fandom 페이지 403 → 검색 인덱스·대체 출처로 교차 검증.
