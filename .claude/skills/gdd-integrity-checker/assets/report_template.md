# GDD 정합성 보고서 (ECHORIS)

> 검증 시각: {{TIMESTAMP}}
> 검증 범위: {{SCOPE}}
> 실행 레이어: {{LAYERS}}

---

## 요약

| 레이어 | 검증 항목 수 | [OK] 통과 | [X] 불일치 | [!] 경고 |
|:---|:---:|:---:|:---:|:---:|
| L1 수치 동기화 | — | — | — | — |
| L2 교차 참조 | — | — | — | — |
| L3 GDD 구조 | — | — | — | — |
| L4 용어 일관성 | — | — | — | — |
| L5 마크다운 형식 | — | — | — | — |
| 합계 | — | — | — | — |

---

## [X] 불일치 상세

### L1 — 수치 동기화

| 카테고리 | 항목 | CSV(SSoT) | GDD 값 | GDD 위치 | 상태 |
|:---|:---|---:|---:|:---|:---:|
| (예) 무기 | sword_magic BaseATK | 20 | 22 | System_Combat_Weapons.md:L142 | [X] |
| (예) 레어리티 | Legendary InnocentSlots | 6 | 5 | System_Equipment_Rarity.md:L88 | [X] |

### L2 — 교차 참조

| 출발 문서 | 참조 대상 | 문제 |
|:---|:---|:---|
| (예) System_Growth_Stats.md:L45 | System_Combat_Damage.md §2.3 | 섹션 번호 없음 |
| (예) Content_Weapon_List.md:L12 | Sheets/LoreTexts/sword_old.md | 파일 미존재 |

### L3 — GDD 구조

| 문서 | 누락 섹션 / 문제 | 비고 |
|:---|:---|:---|
| (예) System_Enemy_AI.md | Parameters, Edge Cases | 골격만 존재 |
| (예) System_Coop_Synergy.md | Implementation Status 블록 없음 | 상단 메타 누락 |

### L4 — 용어 일관성

| 카테고리 | 폐기 용어 | 현재 용어 | 발견 위치 | 라인 |
|:---|:---|:---|:---|:---:|
| (예) 스탯 | DEX | (삭제) | System_Growth_Stats.md | L42 |
| (예) 내러티브 | 스승 | (없음, Killy 오마주) | Content_World_Bible.md | L18 |

### L5 — 마크다운 형식

| 유형 | 위치 | 라인 | 내용 발췌 | 제안 |
|:---|:---|:---:|:---|:---|
| (예) 스마트 따옴표 | System_Combat_Action.md | L42 | "히트스탑" | 직선 따옴표로 교체 |
| (예) 숫자 틸드 | Content_World_Bible.md | L33 | Tier 1~7 | Tier 1-7 |

---

## [!] 경고 (Warning)

경고는 즉시 수정이 필요하지 않으나 점검이 권장되는 항목이다.

| 레이어 | 항목 | 위치 | 내용 |
|:---|:---|:---|:---|
| (예) L3 | 하드코딩 수치 | System_Equipment_Growth.md:L22 | 본문에 "AtkPerLevel=6" 직접 기재. CSV 참조 권고 |
| (예) L3 | 3대 기둥 정렬 선언 없음 | System_Healing_Recovery.md | 탐험/야리코미/멀티 기둥 정렬 선언 추가 권고 |
| (예) L2 | Document_Index 미등록 | Documents/UI/UI_SacredPickup.md | Document_Index.md에 등록 필요 |

---

## 수정 제안

> 불일치가 발견된 경우, "수정해줘"라고 입력하면 CSV(SSoT) 기준으로 GDD를 일괄 갱신한다.
> 수정 후 자동 재검증을 실행한다.

### 안전한 일괄 수정 대상

- L1 수치 동기화 (CSV → GDD 방향만)
- L4 폐기 용어 교체 (1:1 매핑)
- L5 스마트 따옴표·틸드·금지 오타 치환

### 수동 검토가 필요한 항목

- L2 깨진 링크 (이전 위치 또는 파일 삭제 판단 필요)
- L3 누락 섹션 (내용 작성이 필요하므로 자동 추가 금지)
- L4 내러티브 폐기어 (맥락에 따라 삭제·재작성 판단)
