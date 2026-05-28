# LoreTexts 디렉토리 — Memory Fragment SSoT

> **2026-05-26 정리.** DEC-023 (Lore 무기 정적 산문) 폐기 + DEC-046 (Memory Recovery 패러다임) 단독 SSoT 로 통합.

## 디렉토리 구조

```
Sheets/LoreTexts/
├── README.md                    ← 이 파일
└── Fragments/                   ← Memory Fragment (DEC-046, 인물 인생 복원)
    ├── README.md                ← Fragment 형식 상세 가이드
    ├── sword_magic.md
    ├── greatsword_magic.md
    ├── harpoon_magic.md
    ├── staff_magic.md
    └── dagger_magic.md
```

## 통합 결정 (2026-05-26)

DEC-023 의 *핸드크래프트 lore 무기* (Weapons/ 5건 작성) 와 DEC-046 의 *인물 인생 복원* (Fragments/) 가 *서로 다른 양산 모델* 로 공존하여 혼란을 유발. DEC-046 단독 SSoT 로 락:

| 정책 | 결정 |
|:--|:--|
| **DEC-046 Fragments/** | 단독 SSoT — 향후 모든 lore 무기 narrative 는 본 형식 사용 |
| **DEC-023 Weapons/** | 폐기 (폴더 + CSV + 코드 제거) — 5건 narrative 는 `Documents/Content/_archive/LoreWeapons_DEC023/` 에 보존 |
| **Content_Stats_Weapon_Lore.csv** | 폐기 (삭제) |
| **game/src/data/loreWeapons.ts** | 폐기 (삭제) |
| **Content_Item_Master.csv 의 LoreWeapon 5행** | 삭제 |

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
- `## Re-Dive 1` ~ `## Re-Dive 3`

## 신규 파일 추가 시 체크리스트

- [ ] `Sheets/Content_Item_Master.csv` 에 행 추가 (ItemID / IdentityCategory / nameStage0~4 / 등)
- [ ] `Sheets/Content_Stats_Weapon_List.csv` 에 무기 스탯 등록
- [ ] MD frontmatter 6키 모두 작성 (itemId / character / rarity / stages / reDive / sourceDoc)
- [ ] Stage 1~4 Fragment 텍스트 + Identity Trait
- [ ] Re-Dive 1~3 회차 텍스트
- [ ] `Content_Localization.csv` 에 nameStage0~4 키 등록 (영/한)

## 정합성 검증

- **파일명 ↔ frontmatter itemId** 일치 강제 (수동)
- **MD ↔ CSV** 매핑 일치 강제 (수동)
- 코드 로더(`game/src/data/fragments.ts`)는 *경로* 만 사용. 파일명/frontmatter 불일치는 *런타임 미스* 로만 표면화

## 관련 결정

- DEC-046: Memory Recovery 패러다임 (2026-05-24) — *단독 SSoT*
- ~~DEC-023~~: 로어 무기 CSV+MD 하이브리드 (2026-04-17) — *폐기 (2026-05-26)*
