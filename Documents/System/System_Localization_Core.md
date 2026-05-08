# System_Localization_Core.md — 로컬라이제이션 시스템

## 구현 현황 (Implementation Status)

> 최근 업데이트: 2026-05-08 (LOC 인프라 + 데이터 + 핵심 UI 마이그레이션 완료. 194 키 SSoT)
> 문서 상태: `Phase 2 — 인프라/데이터/핵심 UI 가동. 잔여 UI(InventoryUI, ItemDetailView, DivePreview, FeedbackPanel, ControlsOverlay 등) 점진 마이그레이션`
> 2-Space: 전체 (World / Item World 동일 적용)
> 기둥: 전체 (인프라 — 1차 niche 팬덤의 글로벌 도달 확장)

| 기능 ID | 분류 | 기능명 | 우선순위 | 구현 상태 | 비고 |
| :--- | :--- | :--- | :---: | :--- | :--- |
| LOC-01 | 데이터 | Content_Localization.csv (통합 SSoT) | P1 | 완료 (2026-05-08) | 검 Ego 59행. ego.* 키 전 범위 커버 |
| LOC-02 | 파이프라인 | csv_to_locale.mjs (CSV → JSON 변환) | P1 | 완료 (2026-05-08) | predev / prebuild 자동 실행 |
| LOC-03 | 코드 | t(key, vars) 함수 + locale store | P1 | 완료 (2026-05-08) | game/src/i18n/index.ts. EN 폴백 + {var} 보간 |
| LOC-04 | 데이터 | 게임 데이터 CSV NameKey/DescKey 마이그레이션 | P1 | 완료 (2026-05-08) | Weapon_Lore 5행 + Item_Master 45행 + MemoryShards 3행 모두 NameKey/DescKey 전환. 165 키 SSoT |
| LOC-05 | 콘텐츠 | EgoDialogue.ts → Localization.csv 분리 | P1 | 완료 (2026-05-08) | 한국어 SSoT 유지, 영문 1패스 번역 첨부 |
| LOC-06 | 빌드 | Vite 분기 빌드 (`vite build --mode en\|ko`) | P2 | 완료 (2026-05-08) | `npm run build:en` / `build:ko`, `__LOCALE__` define + `@i18n/active` alias |
| LOC-07 | 코드 | BitmapFont 한국어 분기 (Text + Noto Sans KR) | P2 | 완료 (2026-05-08) | `createUiText()` 팩토리 + `localeFontsPlugin` (KO 빌드만 Noto Sans KR `<link>` 주입). LoreDisplay body 마이그레이션 완료. HUD/Toast/Tutorial 등 추가 사이트는 t() 전환과 함께 점진 |
| LOC-08 | UI | PauseMenu LANGUAGE 행 + 토글 카드 | P2 | 대기 | Phase 3 단일 빌드 승격 시 |
| LOC-09 | 코드 | navigator.language 자동 감지 + localStorage 영속 | P2 | 대기 | 첫 실행 1회만 |
| LOC-10 | 검증 | validate.mjs 키 존재 검증 (NameKey ∈ Localization) | P2 | 대기 | 기존 스크립트 확장 |
| LOC-11 | 정책 | Sheets/Content_Stats_Weapon_Lore.csv 한국어 5행 정리 | P0 | 완료 (2026-05-08) | NameKey/DescKey 마이그레이션과 통합. KR 원문은 Localization.csv ko 컬럼으로 이전 (SSoT 보존) |

---

## 0. 필수 참고 자료 (Mandatory References)

- Project Vision: `Documents/Terms/Project_Vision_Abyss.md`
- Writing Standards: `Documents/Terms/GDD_Writing_Rules.md`
- Sheets Writing Rules: `Documents/Terms/Sheets_Writing_Rules.md`
- Glossary: `Documents/Terms/Glossary.md`
- 검 Ego 대사 원본: `game/src/data/EgoDialogue.ts`
- BitmapFont 설치: `game/src/ui/fonts.ts`
- CSV 검증 스크립트: `Sheets/tools/validate.mjs`
- 가격 전략 메모리: project_steam_pricing_strategy (마케팅 SSoT 표현/금지 표현)

---

## 1. 개요 (Overview)

ECHORIS 로컬라이제이션 시스템은 한국어(KR)와 영어(EN) 두 언어의 게임 내 텍스트 출력을 단일 통합 CSV(`Sheets/Content_Localization.csv`)에서 관리하고, 빌드 시 JSON으로 변환해 런타임에 `t(key, vars)` 함수로 조회하는 인프라다. Phase 2 알파에서는 Vite 분기 빌드(VITE_LOCALE=en|ko)로 두 언어를 별도 dist로 산출하고, Phase 3 EA 진입 시점에 단일 빌드 + 런타임 전환으로 승격한다.

검 Ego 대사는 Victor가 한국어로 직접 작성한 톤·리듬·여백을 손실 없이 보존하기 위해 한국어를 SSoT로 유지하고, 영문은 1패스 번역물로 작성한다. 그 외 모든 게임 데이터(아이템·기억 단편·UI)는 영문이 SSoT다.

---

## 2. 설계 의도 (Design Intent)

ECHORIS의 1차 niche(BLAME!/메이드 인 어비스 + 디스가이아 + Transistor 팬덤)는 한국어권과 영어권에 동시에 분포한다. 영문 단일 출시 시 한국 niche 코어(추정 5,000-15,000명)를 누락시키고, 한국어 단일 출시 시 글로벌 도달이 막힌다. 두 약속이 동시에 충족되어야 한다.

### 2.1 스파이크 정렬

i18n은 게임 메커닉이 아니라 인프라이므로 스파이크("아이템에 들어가면 그 안에 살아있는 세계가 있다")를 직접 강화하지 않는다. 대신 스파이크의 도달 범위를 확장한다. 검 Ego 대사가 한국어 톤으로 살아있고, 영문 번역물도 캐릭터 보이스를 보존하면, 양쪽 niche 모두에서 스파이크 경험이 손실 없이 전달된다.

스파이크 검증 통과 근거: q1 NO / q2 NO / q3 NO → 시스템 자체는 스파이크 중립, 그러나 부재 시 스파이크의 *도달 가능 인구*가 절반으로 축소되므로 P1 인프라로 분류한다.

### 2.2 Cursed Problem 식별 및 타협

| 상충하는 약속 | 해결 방향 |
| :--- | :--- |
| 글로벌 영어권 1차 타깃 vs 한국 niche 코어 흡수 | 두 언어 동시 지원, 단 마케팅 페르소나는 영문 일관 (한국 정체성 비공개 유지) |
| 1인 개발 시간 보존 vs 다국어 품질 | Phase 2 분기 빌드(7-8h)로 즉시 가동, Phase 3 승격(+6-8h)으로 점진 확장 |
| 픽셀아트 통일성 vs CJK 폰트 가독성 | 영문은 BitmapFont 픽셀 폰트, 한국어는 PIXI.Text + Noto Sans KR. 픽셀 미감 약간 손해 수용 |
| 검 Ego 캐릭터 보이스 보존 vs 다국어 번역 | 한국어 SSoT 유지, 영문은 톤 가이드 첨부 1패스 번역 |

### 2.3 Risk & Reward

i18n은 플레이어가 직접 행동하는 게임플레이가 아니라 메타 인프라다. 리스크/리턴은 개발자 측면에서 분석한다.

- 리스크: 1인 개발 시간 7-8h(Phase 2) + 6-8h(Phase 3) ≈ 2일. 시즌 신규 텍스트마다 양 언어 동기화 부담.
- 리턴: 한국 1차 niche 코어 흡수 + Steam ZH-CN/JA 등 차후 확장의 인프라 기반 마련.
- 최대 리스크 = 최대 리턴 순간: Phase 4 1.0 출시 시점, 양 언어 동시 출시로 한국 게임 미디어(인벤·디스이즈게임)와 글로벌 미디어 동시 노출.

---

## 3. 메커닉 (Mechanics)

### 3.1 빌드 시 메커닉

```
Sheets/Content_Localization.csv (Victor 편집, SSoT)
    ↓ Sheets/tools/csv_to_locale.mjs (빌드 스크립트)
game/src/i18n/locales/{en,ko}.json (런타임 산출물)
    ↓ Vite import
game/dist/ 번들에 포함
```

- 빌드 스크립트는 CSV 1행을 키-값 쌍으로 변환해 언어별 JSON에 기록한다.
- 빈 셀이 있으면 빈 문자열이 아닌 *키 누락*으로 처리해 런타임 폴백을 강제한다.

### 3.2 런타임 메커닉

플레이어 또는 게임 시스템이 표시 텍스트를 요청할 때:

1. `t('ui.pause.continue')` 호출
2. 현재 locale(en 또는 ko)의 JSON에서 키 조회
3. 누락 시 en JSON에서 폴백 조회
4. en에도 누락 시 키 자체를 반환 (절대 빈 화면 방지)
5. 변수 보간(`{amount}` 등) 적용 후 반환

### 3.3 언어 전환 메커닉 (Phase 3 단일 빌드 승격 후)

- Phase 2: VITE_LOCALE 빌드 시 inject. 사용자 전환 불가.
- Phase 3 이후: PauseMenu의 `LANGUAGE` 행에서 EN ↔ KO 토글. 토글 시 모든 활성 PIXI Text/BitmapText 인스턴스를 `setText()`로 갱신하거나, 단순히 페이지를 리로드해 i18n state를 재초기화한다.

### 3.4 폰트 메커닉

- 영어 활성 시: `BitmapText` + `PressStart2P`/`Rajdhani` (라틴 픽셀 폰트, 현행)
- 한국어 활성 시: `PIXI.Text` + `Noto Sans KR` 또는 `IBM Plex Sans KR` (Google Fonts CSS 로드)
- 동일 코드 경로에서 `createUiText()` 팩토리가 locale에 따라 분기

---

## 4. 규칙 (Detailed Rules)

### 4.1 파일 구조 (신설)

```
Sheets/
├── Content_Localization.csv          # 단일 통합 SSoT
└── tools/
    └── csv_to_locale.mjs             # 빌드 시 CSV → JSON 변환

game/src/i18n/
├── index.ts                          # t(), getLocale(), setLocale()
└── locales/                          # 빌드 산출물 (gitignore)
    ├── en.json
    └── ko.json
```

### 4.2 Content_Localization.csv 스키마

| 컬럼 | 타입 | 설명 |
| :--- | :--- | :--- |
| `Key` | string | 점-구분 계층 키 (예: `ui.pause.continue`) |
| `en` | string | 영어 표시 문자열. 검 Ego 대사 외 모든 항목의 SSoT |
| `ko` | string | 한국어 표시 문자열. 검 Ego 대사의 SSoT |
| `Note` | string (선택) | 번역가용 컨텍스트 메모. 빈 셀 허용 |

CSV 작성 규칙:
- 콤마 포함 텍스트는 큰따옴표로 감싸기
- 줄바꿈은 `\n` 이스케이프 (CSV 파싱 안정성)
- 키는 알파벳 소문자 + 숫자 + 점(`.`) + 언더스코어(`_`)만
- 빈 셀 = 미번역. 런타임 폴백 발동

### 4.3 키 컨벤션

```
{namespace}.{component}.{item}[.{variant}]
```

| 네임스페이스 | 용도 | 예시 |
| :--- | :--- | :--- |
| `ui.*` | UI 라벨/버튼/메뉴 | `ui.pause.continue`, `ui.inventory.title` |
| `toast.*` | 토스트 메시지 | `toast.boss_defeated`, `toast.gold_gained` |
| `tutorial.*` | 튜토리얼 힌트 | `tutorial.open_inventory` |
| `title.*` | 타이틀/엔딩 화면 | `title.subtitle`, `title.prompt` |
| `ego.*` | 검 Ego 대사 (한국어 SSoT) | `ego.wake.0`, `ego.first_walk.0` |
| `lore.*` | 짧은 lore 텍스트 (긴 산문은 별도 .md) | `lore.shaft_origin` |
| `item.*` | 아이템 표시명/설명 | `item.sword_rustborn.name`, `item.sword_rustborn.desc` |
| `memory_shard.*` | 기억 단편 표시명/설명 | `memory_shard.gladiator.name` |
| `enemy.*` | 적/보스 표시명 | `enemy.pig_warrior.name` |
| `itemworld.*` | 아이템계 전용 표기 | `itemworld.boss.general` |

### 4.4 게임 데이터 CSV 마이그레이션 (LOC-04)

기존 영문 표기 컬럼을 키 참조로 변경한다.

마이그레이션 전:
```
Content_Item_Master.csv:
  ItemID,         Category, Name,     Description,           ATK
  sword_rustborn, Sword,    Rustborn, A rusted blade...,     5
```

마이그레이션 후:
```
Content_Item_Master.csv:
  ItemID,         Category, NameKey,                   DescKey,                   ATK
  sword_rustborn, Sword,    item.sword_rustborn.name,  item.sword_rustborn.desc,  5

Content_Localization.csv (별도 파일):
  Key,                       en,         ko
  item.sword_rustborn.name,  Rustborn,   러스트본
  item.sword_rustborn.desc,  A rusted blade...,  녹슨 칼날...
```

대상 CSV:
- `Sheets/Content_Item_Master.csv` (46행)
- `Sheets/Content_Stats_Weapon_List.csv`
- `Sheets/Content_Stats_Weapon_Lore.csv` (한국어 5행 P0 정리 대상)
- `Sheets/Content_MemoryShards.csv` (Name=ID 혼용 → `Id, NameKey, DescKey` 분리)

### 4.5 검 Ego 대사 분리 (LOC-05) — 한국어 SSoT 유지

`game/src/data/EgoDialogue.ts` 313줄 한국어 대사를 `Content_Localization.csv`의 `ego.*` 키로 이전한다. 한국어 셀은 *원본 그대로 복사*, 영문 셀은 1패스 번역(Claude/GPT-4 사전번역 + Victor 검수).

검 Ego 톤 가이드 (번역 시 첨부):
- 호기심 + 빈정거림 + 과묵 사이의 비율 보존
- 호칭 변화 추적 (master / 너 / 당신 등)
- 줄임표 / 줄바꿈 / 행간 침묵 보존 (`\n\n`)

```typescript
// EgoDialogue.ts 마이그레이션 후 패턴
import { t } from '@i18n';

export const EGO_WAKE = (): LoreLine[] => [
  rust(t('ego.wake.0')),
  rust(t('ego.wake.1')),
  erda(t('ego.wake.2')),
  rust(t('ego.wake.3')),
];
```

### 4.6 t() 함수 시그니처 및 폴백 체인

```typescript
export type Locale = 'en' | 'ko';

export function t(key: string, vars?: Record<string, string | number>): string;
export function getLocale(): Locale;
export function setLocale(loc: Locale): void;  // Phase 3 이후 활성
```

폴백 체인:
1. 현재 locale JSON에서 key 조회
2. 누락 시 en JSON에서 조회
3. en에도 누락 시 key 자체 반환

변수 보간 형식: `{name}` 토큰을 `vars.name`으로 치환. 누락 토큰은 `{name}` 그대로 보존(디버그 가시성).

### 4.7 분기 빌드 (Phase 2, LOC-06)

```json
// package.json scripts
"build:en": "cross-env VITE_LOCALE=en vite build --outDir dist-en",
"build:ko": "cross-env VITE_LOCALE=ko vite build --outDir dist-ko",
"deploy:en": "npm run build:en && gh-pages -d dist-en"
```

```typescript
// vite.config.ts (추가 부분)
const LOCALE = (process.env.VITE_LOCALE ?? 'en') as 'en' | 'ko';

export default defineConfig({
  define: { __LOCALE__: JSON.stringify(LOCALE) },
  resolve: {
    alias: { '@i18n/active': path.resolve(__dirname, `src/i18n/locales/${LOCALE}.json`) }
  }
});
```

배포 매핑:
- `echoris.io/play/` (글로벌 데모) = EN 빌드
- 별도 도메인 또는 `echoris.io/ko/` (국내 테스트 채널) = KO 빌드

분기 빌드 단계에서는 사용자가 게임 내에서 언어를 전환할 수 없다. 빌드 채널이 언어를 결정한다.

### 4.8 단일 빌드 + 런타임 전환 (Phase 3 승격, LOC-07~LOC-09)

| 작업 | 변경 |
| :--- | :--- |
| `t()` locale 결정 | `__LOCALE__` 상수 → 런타임 store + localStorage |
| 양쪽 JSON import | 한쪽만 inline → 양쪽 모두 import |
| PauseMenu | LANGUAGE 행 추가 + 토글 카드 |
| BitmapFont KO 분기 | `createUiText()` 팩토리에서 locale=ko 시 `Text` 사용 |
| 첫 실행 자동 감지 | `navigator.language.startsWith('ko')` 체크 |

### 4.9 폰트 폴백 (LOC-07)

```typescript
// game/src/ui/factories.ts (신설)
import { BitmapText, Text } from 'pixi.js';
import { getLocale } from '@i18n';

export function createUiText(text: string, style: TextStyleLike): BitmapText | Text {
  if (getLocale() === 'ko') {
    return new Text({
      text,
      style: { ...style, fontFamily: '"Noto Sans KR", "IBM Plex Sans KR", sans-serif' }
    });
  }
  return new BitmapText({ text, style: { ...style, fontFamily: PIXEL_FONT } });
}
```

`game/index.html`에 KO 빌드 또는 KO locale 활성 시에만 Google Fonts CSS 로드:

```html
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;600&display=swap" rel="stylesheet">
```

### 4.10 검증 (LOC-10)

`Sheets/tools/validate.mjs`에 추가 규칙:

- Content_Item_Master.csv의 NameKey/DescKey가 Content_Localization.csv에 모두 존재
- Content_MemoryShards.csv의 NameKey/DescKey 존재
- ego.* 키가 EgoDialogue.ts의 호출 위치 수와 일치
- en/ko 셀 모두 빈 키는 V2 경고 (P1 대기)

---

## 5. 데이터 & 파라미터 (Parameters)

### 5.1 SSoT CSV

`Sheets/Content_Localization.csv` — 모든 표시 텍스트의 단일 SSoT.

### 5.2 데이터 CSV (LOC-04 마이그레이션 대상)

- `Sheets/Content_Item_Master.csv` — Name/Description 컬럼 → NameKey/DescKey
- `Sheets/Content_Stats_Weapon_List.csv` — 동일
- `Sheets/Content_Stats_Weapon_Lore.csv` — 한국어 잔존 5행 즉시 정리
- `Sheets/Content_MemoryShards.csv` — Name=ID 혼용 분리

### 5.3 폰트 자산

| 자산 | 라이센스 | 용도 |
| :--- | :--- | :--- |
| Press Start 2P (woff2 로컬) | SIL OFL | EN BitmapFont 픽셀 폰트 |
| Rajdhani (Google Fonts CDN) | SIL OFL | EN UI 라틴 폰트 |
| Cinzel (Google Fonts CDN) | SIL OFL | EN 타이틀/장식 |
| Noto Sans KR (Google Fonts CDN) | SIL OFL | KO PIXI.Text 폴백 |
| IBM Plex Sans KR (Google Fonts CDN, 대안) | SIL OFL | KO 대안 폰트 (Rajdhani 톤 매칭) |

CJK 폰트 라이센스는 모두 SIL OFL이라 상업 사용 안전. 서브셋팅은 Phase 4 폴리싱 단계에서 검토 (현재는 Google Fonts CDN 동적 로드로 충분).

### 5.4 작업 시간 추정 (1인 개발 기준)

| Phase | 작업 | 시간 |
| :--- | :--- | :---: |
| Phase 2 즉시 | LOC-11 (Weapon_Lore 한국어 정리) | 0.5h |
| Phase 2 즉시 | LOC-01 + LOC-02 (CSV + 변환 스크립트) | 2h |
| Phase 2 즉시 | LOC-04 (데이터 CSV 마이그레이션) | 1.5h |
| Phase 2 즉시 | LOC-03 (t() + locale store) | 1.5h |
| Phase 2 즉시 | UI 80건 t() 호출 전환 | 2h |
| Phase 2 즉시 | LOC-05 (검 Ego 분리 + 영문 번역 1패스) | 3-4h |
| Phase 2 즉시 | LOC-06 (Vite 분기 빌드) | 0.5h |
| **Phase 2 합계** | | **11-12h (~1.5-2일)** |
| Phase 3 승격 | LOC-07 (BitmapFont 한국어 분기) | 1.5h |
| Phase 3 승격 | LOC-08 (PauseMenu LANGUAGE 행) | 1h |
| Phase 3 승격 | LOC-09 (자동 감지 + localStorage) | 1h |
| Phase 3 승격 | LOC-10 (validate.mjs 키 존재 검증) | 1h |
| Phase 3 승격 | 회귀 테스트 (양 언어 통독) | 2h |
| **Phase 3 합계** | | **6-7h (~1일)** |

---

## 6. 예외 처리 (Edge Cases)

| 상황 | 처리 방식 |
| :--- | :--- |
| Content_Localization.csv에 key 누락 | t()가 en 폴백 → 그래도 누락이면 키 자체 반환. 게임 크래시 없음 |
| en 셀은 있고 ko 셀은 빈 상태 | t()가 en 폴백 사용. 빈 화면 절대 방지 |
| BitmapFont chars에 글리프 없는 문자 | KO 활성 시에는 PIXI.Text 분기로 우회. EN 활성 중 한글 입력은 발생하지 않음 (사용자 입력 텍스트 없음) |
| 변수 보간 토큰 누락 (`{count}` 미전달) | 토큰 그대로 보존 (`{count}`)하여 디버그 가시성 확보 |
| localStorage 미지원 환경 | `getLocale()`이 `navigator.language` 기반 1회 감지 후 메모리에만 보관. 다음 세션은 재감지 |
| 첫 실행 시 navigator.language 비정상 (예: 빈 문자열) | EN 기본값 폴백 |
| 분기 빌드(Phase 2)에서 사용자가 다른 언어 요청 | 해당 빌드 URL로 안내 (echoris.io/play/ vs 별도 채널). 게임 내 전환 미지원 |
| 단일 빌드(Phase 3) 언어 전환 시 활성 PIXI Text 인스턴스 다수 | 페이지 리로드 또는 `i18nEvents.emit('locale-change')` 후 모든 Text가 `setText(t(key))` 재실행 |
| 검 Ego 대사의 한국어 톤이 영문 1패스 번역으로 손실 | LOC-05의 톤 가이드 첨부 + Victor 검수 1회 + Phase 3에서 게임 전문 프리랜서 후편집 (Phase 4 1.0 추가) |
| Sheets/Content_Stats_Weapon_Lore.csv 한국어 5행 미정리 시 | `feedback_english_only.md` 정책 위반. P0 즉시 정리 대상 |
| CSV 빌드 스크립트 실패 (구문 오류 등) | 빌드 중단, dist 미생성. 기존 dist는 보존 (배포 안정성) |
| EgoDialogue.ts와 Localization.csv 키 불일치 (마이그레이션 중 부분 적용) | validate.mjs가 빌드 차단. 부분 마이그레이션 PR은 머지 거부 |

---

## 7. 검증 체크리스트 (Acceptance Criteria)

### 7.1 기능 검증

- [ ] Content_Localization.csv의 Key 1개에 en/ko 셀 모두 채워진 상태에서 t() 호출 시 현재 locale에 맞는 문자열 반환
- [ ] ko 셀 빈 키는 en 폴백 문자열 반환
- [ ] en 셀도 빈 키는 키 자체 반환 (게임 크래시 없음)
- [ ] 변수 보간 `t('toast.gold_gained', { amount: 100 })` → "+100 G" / "+100 G" 정상 출력
- [ ] VITE_LOCALE=en 빌드의 dist에 ko.json이 포함되지 않음 (번들 절감 검증)
- [ ] VITE_LOCALE=ko 빌드의 dist에 en.json이 포함되지 않음
- [ ] csv_to_locale.mjs가 신규 키 추가 후 자동 재생성됨
- [ ] validate.mjs가 NameKey ∈ Localization.csv 검증을 통과/실패 정확히 판정

### 7.2 콘텐츠 검증

- [ ] EgoDialogue.ts 호출이 모두 t() 함수로 전환됨
- [ ] EgoDialogue.ts에 한국어 string literal 0건 (모든 텍스트가 Localization.csv로 이동)
- [ ] Sheets/Content_Stats_Weapon_Lore.csv에 한국어 0건 (Name/Description은 영문 + Localization.csv 키)
- [ ] Sheets/Content_Item_Master.csv의 모든 행이 NameKey/DescKey 사용 (구 Name/Description 컬럼 제거)
- [ ] 검 Ego 영문 번역물이 톤 가이드 4항목(호기심·빈정거림·과묵 비율, 호칭, 줄바꿈, 침묵)을 보존

### 7.3 사용자 경험 검증 (Phase 3 승격 후)

- [ ] PauseMenu의 LANGUAGE 행에서 EN/KO 토글 1초 이내 반영
- [ ] 첫 실행 시 navigator.language=ko-KR이면 KO 자동 활성, 그 외는 EN
- [ ] 사용자가 한 번 KO를 선택하면 다음 세션에서도 localStorage 영속으로 KO 유지
- [ ] KO 활성 상태에서 한글이 빈 사각형 없이 정상 렌더링 (Noto Sans KR 로드 확인)
- [ ] 픽셀아트 통일성: KO 활성 시 일반 Text로 분기되어 픽셀 미감 약간 손해는 받아들이는 수준

### 7.4 정책 정렬 검증

- [ ] feedback_english_only.md: 게임 내 영문 SSoT 정책 — 검 Ego만 KR SSoT 예외, 그 외 모두 EN SSoT
- [ ] project_target_market_global.md: 글로벌 영어권 1차 타깃 — 분기 빌드에서 echoris.io/play/ = EN 기본
- [ ] user_persona_kr_community.md: KR 페르소나 비공개 — 게임 내 KR 지원 ≠ 한국 스튜디오 명시
- [ ] project_steam_pricing_strategy.md: 마케팅 SSoT 표현 ("Browser demo · Full game on Steam") — Steam 페이지 EN/KR 모두 동일 카피 적용

---

## 8. 마이그레이션 패스 (Phase 2 → Phase 4)

| 시점 | 트리거 | 작업 | 비용 |
| :--- | :--- | :--- | :---: |
| Phase 2 즉시 | LOC-11 P0 정책 위반 | Weapon_Lore CSV 한국어 5행 정리 | 0.5h |
| Phase 2 (1차 커밋) | 인프라 골격 | LOC-01 + LOC-02 + LOC-03 | 4h |
| Phase 2 (2차 커밋) | 데이터 마이그레이션 | LOC-04 + UI t() 전환 | 3.5h |
| Phase 2 (3차 커밋) | 검 Ego 분리 | LOC-05 | 3-4h |
| Phase 2 (옵션 커밋) | 분기 빌드 가동 | LOC-06 | 0.5h |
| Phase 3 EA 진입 6주 전 | 단일 빌드 승격 | LOC-07 + LOC-08 + LOC-09 + LOC-10 | 6-7h |
| Phase 4 1.0 | 다국어 확장 | i18next 마이그레이션 + ZH-CN/RU/ES/PT-BR/JA 추가 | 별도 GDD |

---

## 9. Phase 4+ 확장 (참조 — 본 문서 범위 외)

본 문서는 KR/EN 2언어에 한정한다. Phase 4 1.0 시점 추가 언어(ZH-CN, RU, ES-LATAM, PT-BR, JA, DE, FR, ZH-TW)는 별도 GDD로 분리 작성한다. 다음 항목들이 그 시점에 결정 대상:

- i18next 마이그레이션 (자체 t() → i18next 라이브러리)
- 번역 플랫폼 도입 (Crowdin 또는 Weblate 자체호스팅)
- 검 Ego 핵심 5언어 게임 전문 프리랜서 후편집 외주
- CJK 폰트 서브셋팅 + 동적 로딩
- LQA 핵심 5언어 외주
- 시즌 운영 시 신규 텍스트 자동 번역 파이프라인 (git → Crowdin → AI 사전번역 → 인간 후편집 → 머지)

상세 비용 추정 ~$9,000-10,500 (10언어 LLM+후편집 하이브리드 모델)은 메모리 `project_steam_pricing_strategy.md` 및 본 GDD 후속 확장본 참조.

---

소스 참조: `game/src/data/EgoDialogue.ts`, `game/src/ui/fonts.ts`, `Sheets/Content_*.csv`, `Sheets/tools/validate.mjs`, `game/vite.config.ts`
