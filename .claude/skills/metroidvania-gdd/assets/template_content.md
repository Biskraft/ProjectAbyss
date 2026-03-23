# [콘텐츠 목록명] ([Content List Name])

## 0. 필수 참고 자료 (Mandatory References)

* Project Overview: `Reference/게임 기획 개요.md`
* Writing Rules: `.claude/skills/metroidvania-gdd/references/writing-rules.md`
* [관련 시스템]: `[경로]`

---

## 구현 현황 (Implementation Status)

> 최근 업데이트: YYYY-MM-DD
> 문서 상태: `작성 중 (Draft)` / `진행 중 (Living)` / `완료 (Stable)`

---

### 적용 공간 (Applicable Space)

| 공간 | 적용 여부 | 비고 |
| :--- | :---: | :--- |
| World | O/X | [설명] |
| Item World | O/X | [설명] |
| Hub | O/X | [설명] |

---

## 1. 개요 (Concept)

### 의도 (Intent)

> [이 콘텐츠 목록의 목적과 관리 범위]

### 카테고리 분류

| 카테고리 | 설명 | 수량 |
| :--- | :--- | :--- |
| [카테고리 A] | [설명] | [N개] |
| [카테고리 B] | [설명] | [N개] |

---

## 2. 콘텐츠 테이블 (Content Table)

| ID | Description | Display_Name | Category | Tier | Tags |
| :--- | :--- | :--- | :--- | :--- | :--- |
| [PREFIX]_[NAME] | [한글 설명] | [영문 표시명] | [분류] | [1~5] | [태그] |

> SSoT: `[CSV 파일 경로]`

---

## 3. 희귀도 분포 (Rarity Distribution)

| 희귀도 | 비율 | 스탯 배율 | Innocent 슬롯 |
| :--- | :--- | :--- | :--- |
| Common | [N]% | 1.0x | [N] |
| Uncommon | [N]% | [값] | [N] |
| Rare | [N]% | [값] | [N] |
| Legendary | [N]% | [값] | [N] |
| Mythic | [N]% | [값] | [N] |

```mermaid
pie title 희귀도 분포
    "Common" : [값]
    "Uncommon" : [값]
    "Rare" : [값]
    "Legendary" : [값]
    "Mythic" : [값]
```

---

## 4. 획득 경로 (Acquisition Routes)

| 획득 방법 | 공간 | 대상 등급 | 확률/조건 |
| :--- | :--- | :--- | :--- |
| [방법 1] | [World/IW/Hub] | [등급 범위] | [확률/조건] |
| [방법 2] | [공간] | [등급 범위] | [확률/조건] |

---

## 5. 데이터 의존성 (Data Dependencies)

| 참조하는 시스템 | 참조 데이터 | 관계 |
| :--- | :--- | :--- |
| [시스템명] | [데이터 열] | [관계 설명] |

---

## 검증 기준 (Verification Checklist)

* [ ] ID-First CSV 구조 (UPPER_SNAKE_CASE)
* [ ] Description 열 한글 작성
* [ ] 카테고리/태그 분류 완전
* [ ] 희귀도 분포 합계 100%
* [ ] 획득 경로 명시
* [ ] SSoT CSV 링크 포함
