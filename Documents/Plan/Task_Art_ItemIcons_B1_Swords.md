# 아이템 아이콘 B1: Sword 6종 작업 지시서

> **작성일:** 2026-04-19
> **대상:** Art Director
> **파이프라인:** PixelLab (자동화 준비 중)
> **구현 코드:** `game/src/ui/ItemImage.ts`
> **아트 디렉션 근거:** `Documents/Design/Design_Art_Direction.md`
> **무기 스탯 SSoT:** `Sheets/Content_Stats_Weapon_List.csv`
> **2-Space:** 월드 / 아이템계 공용
> **기둥:** 장인 (Crafter Fantasy)

---

## 작업 대상 (Scope)

| 아이콘 ID | 무기명 | 레어리티 | 우선순위 | 상태 | 비고 |
| :--- | :--- | :--- | :---: | :--- | :--- |
| ICN-SW-1 | `sword_broken` Broken Sword | normal | P0 | 대기 | Phase 1 스토리 시작 무기 |
| ICN-SW-2 | `sword_normal` Starter Blade | normal | P0 | 대기 | Phase 1 첫 드랍 샘플 |
| ICN-SW-3 | `sword_magic` Steel Longblade | magic | P0 | 대기 | 레어리티 차별 검증용 |
| ICN-SW-4 | `sword_rare` Rune Blade | rare | P0 | 대기 | 레어리티 차별 검증용 |
| ICN-SW-5 | `sword_legendary` Abyssal Edge | legendary | P0 | 대기 | 레어리티 차별 검증용 |
| ICN-SW-6 | `sword_ancient` Abyss Phantom | ancient | P0 | 대기 | 레어리티 차별 검증용 |

**완료 기준:** 6종 PNG 파일이 `game/public/assets/items/` 에 드랍되고 §6.3 런타임 검증 체크리스트를 모두 통과하면 작업 종료. 이후 §7 B2 (greatsword) 배치 착수.

---

## 1. 목적 및 사용처

아이템 아이콘은 플레이어가 장비를 **육안으로 즉시 구별**하게 만드는 Sacred Pickup 경험의 1차 시각 언어다. 동일 이미지가 세 곳에서 재사용되므로 64px 원본 하나로 16px–64px 범위를 전부 커버해야 한다.

| 사용처 | 표시 크기 | 코드 위치 |
| :--- | :---: | :--- |
| 인벤토리 슬롯 | 16 px | `game/src/ui/InventoryUI.ts` (SLOT_SIZE-4) |
| LorePopup (아이템 획득 컷신) | 64 px | `game/src/ui/LoreDisplay.ts` |
| DivePreview (앵빌 다이브 확인창) | 64 px | `game/src/ui/DivePreview.ts` |

---

## 2. 기술 규격 (Technical Constraints)

| 항목 | 값 | 근거 |
| :--- | :--- | :--- |
| 해상도 | **64 × 64 px** | pixel-perfect 설계: 포트레이트 64 = 1:1, 슬롯 내부 16 = 정수 4× 축소. 48은 포트레이트에서 1.33× 비정수 업스케일로 fringe 발생 → 64로 확정 |
| 포맷 | PNG-32 (RGBA) | 알파 채널 필수 |
| 배경 | **투명 (alpha = 0)** | 슬롯 선택 하이라이트(파랑)와 장착 border(노랑)가 아이콘 주변으로 보여야 함 |
| 색심도 | 32-bit truecolor | 플레이스홀더 합성 시 블렌딩 아티팩트 방지 |
| 파일명 | `{WeaponID}.png` | CSV `Content_Stats_Weapon_List.csv` 1번 컬럼 그대로 |
| 경로 | `game/public/assets/items/` | `assetPath()` 프리픽스 자동 적용 |
| 외곽선 | 검정 1 px hard outline | Vita 시절 픽셀 RPG 관례. 축소 시 실루엣 보존 |
| 안티에일리어싱 | **금지** | nearest-neighbor 축소에서 fringe artifact 발생 |
| 투명 근처 소프트 그림자 | **금지** | 4 코너 반경 16 px 이내 alpha > 0 픽셀 있으면 슬롯 레이아웃 깨짐 |

**기본 동작 (코드 참조):** `game/src/ui/ItemImage.ts:76-101`
1. 에셋 로드 전엔 레어리티 색 플레이스홀더(대각 stripe 2줄)가 먼저 렌더됨
2. `Assets.load("assets/items/{defId}.png")` 성공 시 플레이스홀더를 숨기고 스프라이트로 덮음
3. 로드 실패 시 플레이스홀더 유지 (catch 블록 빈 함수)

따라서 **에셋 추가 = 파일만 드랍하면 끝**. 코드 수정 불필요.

---

## 3. 시각 언어 (Visual Language)

### 3.1 레어리티 색과의 분리 원칙

코드가 슬롯 밖에서 **레어리티 색을 border/placeholder로 이미 그리므로**, 아이콘 내부를 레어리티 색으로 물들이면 **이중 색칠**이 되어 단계 구별이 오히려 흐려진다.

- 아이콘 본체(블레이드 몸통) = 금속 neutral
- 레어리티 힌트 = **악센트(룬 / 보석 / 엠버 / 글로우)에만 제한**
- 레어리티 색 표(코드 사용 색):
  - normal: `#FFFFFF` (색상 악센트 없음)
  - magic: `#6969FF` (cool blue)
  - rare: `#FFFF00` (warm yellow)
  - legendary: `#FF8000` (molten orange)
  - ancient: `#00FF00` (spectral green)

### 3.2 ECHORIS 공통 팔레트 앵커

- 그림자: **teal** 계열 `#2a5f70` ~ `#1a3a4a`
- 하이라이트: **forge orange** 계열 `#e07028` (단조열 = 세계관 색)
- 금속 본체: cool neutral grey (#5c6878 근방)
- 가죽 그립: warm brown (#5a3a28 근방)

**근거 문서:** `Documents/Design/Design_Art_Direction.md`, CLAUDE.md "톤 & 매너" 섹션

### 3.3 관점 (View Angle)

- **대각선 뷰, 손잡이 좌하단 → 칼끝 우상단 (45°)**
- 이유: 코드 플레이스홀더의 대각 stripe가 이미 이 방향이므로 아이콘 로드 전후 실루엣이 동일 축을 유지 → 시각적 튐 최소

---

## 4. PixelLab 공통 파라미터 (Batch Defaults)

```
size: 64 x 64
no_background: true
outline: single_color_black_outline
shading: medium_shading
detail: medium_detail
direction: north-east (blade tip)
view: side (inventory icon, diagonal hilt-to-tip)
```

**공통 Negative Prompt:**
```
soft blur, anti-aliasing, photorealistic, 3D render,
multiple weapons, text, watermark, holding hand,
background scene, drop shadow, gradient background
```

**공통 Palette Hint:**
```
ECHORIS core palette — teal shadows (#2a5f70 family) +
forge orange highlights (#e07028 family).
Rarity accent hue restricted to gems/runes/glow only.
Blade body stays metallic neutral grey.
```

---

## 5. 개별 프롬프트 (Per-Icon Prompts)

### ICN-SW-1 — `sword_broken` (Broken Sword, normal)

```
A broken longsword pixel art icon, 64x64, diagonal view with hilt at bottom-left.
Only the lower half of the blade remains — upper part is snapped off with a
jagged, rust-bitten break line.
Iron blade with heavy corrosion spots, deep notches on the cutting edge,
wooden grip with frayed leather wrap.
Plain iron crossguard, no ornament.
Dull oxidized steel, no shine, no glow.
Muted teal shadows, warm dusty orange rust tones on the break.
Evokes "found among the ruins, still useful".
```

### ICN-SW-2 — `sword_normal` (Starter Blade, normal)

```
A simple iron longsword pixel art icon, 64x64, diagonal view with hilt at
bottom-left.
Straight double-edged blade, honest and un-ornamented, single blood groove
down the center.
Plain iron crossguard (straight bar), leather-wrapped grip, round pommel.
Clean but unpolished — forge-finished steel with subtle hammer facets.
Cool neutral grey blade, warm brown leather grip, small orange spark
reflection on the fuller as the only color note.
Evokes "the first blade a journeyman forges".
```

### ICN-SW-3 — `sword_magic` (Steel Longblade, magic)

```
A refined steel longblade pixel art icon, 64x64, diagonal view with hilt at
bottom-left.
Longer, slimmer blade than a basic sword, mirror-polished with a crisp
central ridge (not a groove).
Slightly curved crossguard with small rounded finials, dark leather grip
with spiral cord wrap, faceted pommel.
Polished steel surface reflecting a faint cool blue sheen along the ridge —
this blue is the ONLY color accent and must stay subtle (gem/rune-scale,
not a glow cloud).
Background stays teal-shadow + steel neutrals.
Evokes "a properly-made sword, worthy of a name".
```

### ICN-SW-4 — `sword_rare` (Rune Blade, rare)

```
A rune-engraved blade pixel art icon, 64x64, diagonal view with hilt at
bottom-left.
Straight double-edged blade with a deep fuller; the fuller is lined with
small engraved runes emitting a faint warm yellow glow (rune-only glow,
blade body stays steel).
Crossguard shaped like a stylized horizontal bracket with two small yellow
gem insets at each end.
Dark leather grip, brass-banded pommel with one engraved sigil.
Steel body in cool neutral grey, runes/gems in warm yellow — yellow is
the only saturated hue.
Evokes "a blade that remembers what it has cut".
```

### ICN-SW-5 — `sword_legendary` (Abyssal Edge, legendary)

```
A forge-heated greatblade pixel art icon, 64x64, diagonal view with hilt at
bottom-left.
Broad blade forged from dark, almost black, abyss-iron — visible
damascus-style flow pattern rippling across the steel like liquid smoke.
A thin molten-orange crack runs along the central ridge as if the blade
is still holding forge heat; faint embers drift near the hilt.
Heavy crossguard with downward-curved tips, black leather grip with iron
studs, pommel shaped like a single dense ingot.
Black-steel body, molten orange crack + ember glow as the only color
accents.
Evokes "struck from the anvil once and never cooled".
```

### ICN-SW-6 — `sword_ancient` (Abyss Phantom, ancient)

```
An ethereal Builder-relic sword pixel art icon, 64x64, diagonal view with
hilt at bottom-left.
Blade made of translucent, shifting material — cross-section reveals
concentric layers like cut damascus but fading into mist at the edges.
Blade emits a soft cold green inner light along the central axis; edges
occasionally break into drifting green particles.
Crossguard made of engraved builder-glyph plates (angular, circuit-like),
bone-white grip with green-glowing groove, pommel containing a single
green crystal core.
Blade body reads as "not fully solid"; background colors still hold (teal
shadow, steel accents) so it doesn't blow out.
Green glow is restrained — light source only on inner channel and crystal,
not a halo.
Evokes "a weapon that was once a machine, remembering how to be a sword".
```

---

## 6. 배치 순서와 검증 (QA Checklist)

### 6.1 6종 일괄 생성 원칙

> **레어리티 차별화 1차 검증이 목적이므로 6장을 한꺼번에 받고, 옆으로 늘어놓고 비교하며 판단.**

개별 아이콘만 따로 받으면 레어리티 계단이 정확한지 판단하기 어렵다. normal → ancient 6장을 한 뷰에 두고 다음을 확인:

1. **실루엣 구별도** — 아이콘 전체를 검은색으로 채운 실루엣만 봐도 6종이 구별되는가?
2. **레어리티 계단** — 색 악센트가 normal(색 없음) → ancient(뚜렷한 녹색 글로우) 순으로 **단조 증가**하는가? (중간에 더 화려하면 체감 계단 역전)
3. **톤 일관성** — 6장을 한 화면에 놓았을 때 전부 같은 세계관에서 나온 것처럼 보이는가?

### 6.2 파일 수준 검증

- [ ] 파일명이 `{WeaponID}.png` 정확히 일치 (대소문자, 언더스코어)
- [ ] 4 코너 픽셀이 alpha = 0
- [ ] 64 × 64 정사각
- [ ] 외곽선 1 px, 검정 hard edge
- [ ] 블레이드 외곽 16 px 반경 이내 drop shadow 없음

### 6.3 게임 내 검증 (런타임)

- [ ] 인벤토리에 줍고 14 px 슬롯에서 레어리티 구별 가능
- [ ] 슬롯 선택 시 파란 하이라이트가 아이콘 주변으로 보임 (투명 배경 확인)
- [ ] 장착 시 노란 border가 아이콘과 겹치지 않음
- [ ] LorePopup에서 64 px로 확대 시 외곽선이 지저분하지 않음

---

## 7. 확장 로드맵 (Future Batches)

현재 P0는 sword 6종. 이후 타입별 배치는 `Content_Stats_Weapon_List.csv` 기준으로 다음 순서:

| 배치 | 타입 | id 접두 | 종수 | 트리거 |
| :---: | :--- | :--- | :---: | :--- |
| B1 (현재) | Sword | `sword_*` | 6 | 본 문서 |
| B2 | Greatsword | `greatsword_*` | 5 | 레어리티 검증 완료 후 |
| B3 | Dagger | `dagger_*` | 5 | 전투 variety 실증 후 |
| B4 | Bow | `bow_*` | TBD | Phase 1-C 원거리 실장 후 |
| B5 | Staff | `staff_*` | TBD | INT 게이트 도입 후 |

---

## 8. 관련 문서 / 코드

- **아이콘 렌더링 구현:** `game/src/ui/ItemImage.ts`
- **아트 디렉션 (팔레트/톤):** `Documents/Design/Design_Art_Direction.md`
- **애니메이션 규격 (자매 문서):** `Documents/Design/Design_Art_AnimationSpec.md`
- **무기 스탯 SSoT:** `Sheets/Content_Stats_Weapon_List.csv`
- **스토리 무기 narrative:** `Documents/Content/Content_Item_Narrative_FirstSword.md`
