# Fragments Directory — Memory Fragment 텍스트 SSoT

> **DEC-046 신규 (2026-05-24).** 보스 처치 시 해금되는 *한 문장* 의 Memory Fragment 텍스트 저장소.

## 디렉토리 목적

ECHORIS의 신 패러다임(인생 복원 탐사)에서 보상의 본체는 *수치 증가* 가 아니라 *한 문장* 이다. 이 디렉토리는 각 무기(= 인물)의 Stage별 Fragment 텍스트와 Re-Dive 회차별 단편 텍스트를 *인물 단위 MD 파일* 로 보관한다.

## 왜 별도 디렉토리인가

| 항목 | `Content_Localization.csv` | `Fragments/` |
|------|---|---|
| 분량 | 짧은 UI 텍스트 | 1-3 문장의 narrative |
| 작성자 | 개발자 | 작가 |
| 갱신 주기 | 빈번 | 인물별 1회 (확정 후 잠금) |
| 다국어 | 즉각 | 한 인물 완성 후 일괄 번역 |
| 버전 관리 | 라인 단위 diff | 인물 단위 diff |

## 파일 명명 규칙

```
Sheets/LoreTexts/Fragments/{itemId}.md
```

예시:
- `sword_magic.md` (측량사의 에코 쐐기, Magic)
- `greatsword_magic.md` (격벽 수리공의 클리버, Magic 예정)

## 파일 구조

```markdown
---
itemId: {Content_Item_Master.csv 의 ItemID}
character: {Identity Category — Surveyor / BulkheadRepairman / ...}
rarity: {Normal/Magic/Rare/Legendary/Ancient}
stages: {레어리티별 사용 Stage 수}
reDive: {Re-Dive 최대 회차 (보통 3)}
---

## Origin
인물의 4요소 (Creator / Purpose / History / Fate) — `Content_Item_Narrative_*.md` 의 요약

## Stage 1 (Recovery 25%)
> "..." (Fragment 텍스트, 한 문장)

### Identity Trait
- 이름: ...
- 효과: ...
- 결의 성격: ...

## Stage 2 (Recovery 50%)
> "..."

### Identity Trait
...

## Stage 3 (Recovery 75%) [Legendary 이상만]
> "..."

## Stage 4 (Recovery 100%) — Fire 모멘트
> "..." (이 문장이 인생을 응축)

### Identity Trait
...

## Re-Dive 1 (자긍심 / 직업 윤리 재정의)
> "..."

### Trait 효과 변형
...

## Re-Dive 2 (가족의 시선 / 후회)
> "..."

## Re-Dive 3 (Network Fragment 트리거)
> "..."
```

## i18n 처리

Fragment 텍스트는 본 MD에 *원문(영어)* 으로 작성. 다국어 번역은 인물 *Stage 4 완성 후 일괄* 처리:

1. MD 작성 (영어 + 한국어 병기)
2. 인물 카테고리 5명 완성 시 일괄 i18n 추출
3. `Content_Localization.csv` 에 `fragment.{itemId}.stage{N}` 키로 등록
4. 인게임 코드는 `Content_Localization.csv` 만 참조

## 작성 가이드 (Stage 4 Fire 모멘트)

1. **한 문장** — 두 문장 이상 금지. 응축이 본질
2. **현재형 또는 과거형 1인칭** — 인물이 직접 말한다
3. **설명 금지** — 보여줘야 한다
4. **모순/긴장 포함** — 한 면만 보여주지 않는다
5. **세계관 단어 1개 이상** — 격벽, 측량, 심연, 기록 등

상세: `Documents/System/System_ItemNarrative_Template.md`

## 관련 문서

- DEC-046: `memory/wiki/decisions/DEC-046.md`
- 시스템 명세: `Documents/System/System_Memory_Core.md` §2.3
- 기준 예시: `Documents/Content/Content_Item_Narrative_SurveyorEchoWedge.md`
- Identity Archive UI: `Documents/UI/UI_Identity_Archive.md`
