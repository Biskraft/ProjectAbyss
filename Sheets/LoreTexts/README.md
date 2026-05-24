# LoreTexts 디렉토리 — 네러티브 텍스트 SSoT

> **2026-05-24 정리.** 두 종류의 네러티브 텍스트가 *컨벤션이 다르므로* 하위 디렉토리로 분리되어 있다.

## 디렉토리 구조

```
Sheets/LoreTexts/
├── README.md                    ← 이 파일 (전체 가이드)
├── Weapons/                     ← Lore 무기 (DEC-023, 핸드크래프트 22 무기)
│   ├── shaft_survey_compass.md
│   ├── bulkhead_seam_marker.md
│   ├── erda_notebook_vol3.md
│   ├── erda_plumb_line.md
│   └── rusted_theodolite.md
└── Fragments/                   ← Memory Fragment (DEC-046, 인물 인생 복원)
    ├── README.md                ← Fragment 형식 상세 가이드
    ├── sword_magic.md
    ├── greatsword_magic.md
    ├── harpoon_magic.md
    ├── staff_magic.md
    └── dagger_magic.md
```

## 두 종류 비교

| 항목 | `Weapons/` | `Fragments/` |
|------|-----------|--------------|
| **출처 시스템** | DEC-023 (핸드크래프트 lore 무기) | DEC-046 (인물 인생 복원) |
| **표현 단위** | 물건의 사연 | 인물의 인생 (Stage 진행) |
| **파일명 패턴** | `{descriptor}_{tool}.md` | `{itemId}.md` |
| **CSV 매핑** | `Content_Stats_Weapon_Lore.csv` 의 `WeaponID` / `LorePath` | `Content_Item_Master.csv` 의 `ItemID` |
| **코드 로더** | `game/src/data/loreWeapons.ts` | `game/src/data/fragments.ts` |
| **구조** | 1 파일 = 1 무기 = 1편의 정적 산문 | 1 파일 = 1 인물 = Stage 1-4 + Re-Dive 1-3 |

## Weapons/ — Lore 무기

### 파일명 규칙

- 패턴: `{descriptor}_{tool}.md` (snake_case)
- descriptor: 소속/환경/상태 (예: `shaft_`, `bulkhead_`, `erda_`, `rusted_`)
- tool: 도구 이름 (예: `survey_compass`, `seam_marker`, `notebook_vol3`)
- **파일명 = `Content_Stats_Weapon_Lore.csv` 의 `WeaponID`** 와 일치

### Frontmatter 필수 키

```yaml
---
weaponId: shaft_survey_compass    # 파일명과 동일 (= CSV WeaponID)
name: 격벽 측량 나침반             # 한글 표시명
type: Emitter                     # 무기 카테고리 (Blade/Cleaver/Shiv/Harpoon/Chain/Railbow/Emitter)
rarity: magic                     # normal / magic / rare / legendary / ancient
---
```

### 본문 구조

- `# {한글 이름}` (frontmatter `name` 과 동일)
- 짧은 산문 (2-4단락)
- 인용구 1-2개 (`> "..."` + `> — 출처`)
- 정적 콘텐츠 (Stage 진행 없음)

### CSV LorePath 연결

`Content_Stats_Weapon_Lore.csv` 의 `LorePath` 컬럼이 *Sheets-relative path*:
```
LorePath: LoreTexts/Weapons/shaft_survey_compass.md
```

## Fragments/ — Memory Fragment (DEC-046)

상세 가이드는 `Fragments/README.md` 참조.

### 파일명 규칙

- 패턴: `{itemId}.md`
- **파일명 = `Content_Item_Master.csv` 의 `ItemID`** 와 일치
- 예: `sword_magic.md`, `dagger_magic.md`

### Frontmatter 필수 키

```yaml
---
itemId: sword_magic               # 파일명과 동일 (= ItemID)
character: Surveyor               # 인물 카테고리 (Identity Category)
rarity: magic
stages: 3                         # 사용되는 Stage 수 (Magic = 0/2/4)
reDive: 3                         # Re-Dive 최대 회차
sourceDoc: Documents/Content/Content_Item_Narrative_*.md
---
```

### 본문 구조

- `# {Stage 4 진명}` (인물 카드 헤더)
- `## Origin` (4요소 요약)
- `## Stage 1 (Recovery 25%)` ~ `## Stage 4 (Recovery 100%) — Fire 모멘트`
  - 각 Stage: Fragment 텍스트 (EN/KO) + Identity Trait
- `## Re-Dive 1` ~ `## Re-Dive 3`
  - 각 회차: 다른 해석의 단편 + Trait 효과 변형

## 신규 파일 추가 시 체크리스트

### Weapons/ 추가
- [ ] `Sheets/Content_Stats_Weapon_Lore.csv` 에 행 추가 (WeaponID / LorePath / 등)
- [ ] `LorePath = LoreTexts/Weapons/{weaponId}.md`
- [ ] MD frontmatter 4키 모두 작성 (weaponId / name / type / rarity)
- [ ] 본문에 정적 산문 + 인용구
- [ ] `Content_Localization.csv` 에 NameKey / DescKey 등록 (영/한)

### Fragments/ 추가
- [ ] `Sheets/Content_Item_Master.csv` 에 행 추가 (ItemID / IdentityCategory / nameStage0~4 / 등)
- [ ] `Sheets/Content_Stats_Weapon_List.csv` 에 무기 스탯 등록
- [ ] MD frontmatter 6키 모두 작성 (itemId / character / rarity / stages / reDive / sourceDoc)
- [ ] Stage 1~4 Fragment 텍스트 + Identity Trait
- [ ] Re-Dive 1~3 회차 텍스트
- [ ] `Content_Localization.csv` 에 nameStage0~4 키 등록 (영/한)

## 정합성 검증

- **파일명 ↔ frontmatter id** 일치 강제 (수동)
- **MD ↔ CSV** 매핑 일치 강제 (수동)
- 코드 로더는 *경로* 만 사용. 파일명/frontmatter 불일치는 *런타임 미스* 로만 표면화

## 관련 결정

- DEC-023: 로어 무기는 CSV+MD 하이브리드 (2026-04-17)
- DEC-046: Memory Recovery 패러다임 (2026-05-24)
