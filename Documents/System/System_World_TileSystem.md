# 타일 체계 시스템 (World Tile System)

## 구현 현황 (Implementation Status)

> **최근 업데이트:** 2026-05-11
> **문서 상태:** Draft
> **기둥:** 탐험/전투

| 기능 ID | 분류 | 기능명 | 우선순위 | 구현 상태 | 비고 |
|:---|:---|:---|:---:|:---|:---|
| TIL-01 | IntGrid | wall (1) | P0 | ✅ 완료 | 솔리드 충돌 |
| TIL-02 | IntGrid | water (2) | P0 | ✅ 완료 | 수중 물리 |
| TIL-03 | IntGrid | platform (3) | P0 | ✅ 완료 | 편도 플랫폼 |
| TIL-04 | IntGrid | updraft (4) | P0 | ✅ 완료 | 상승 바람 |
| TIL-05 | IntGrid | spike (5) | P0 | ✅ 완료 | IntGrid 편입 완료 |
| TIL-06 | IntGrid | magma (6) | P1 | ⬜ 제작 필요 | 화 원소 환경. LDtk 슬롯 예약됨 (identifier=null) |
| TIL-07 | IntGrid | ice (7) | P1 | ✅ 완료 | 빙 원소 환경. 마찰 0 |
| TIL-08 | IntGrid | charged (8) | P1 | ⬜ 제작 필요 | 뇌 원소 환경. LDtk 슬롯 예약됨 (identifier=null) |
| TIL-09 | IntGrid | breakable (9) | P0 | ✅ 완료 | 1히트 파괴 |
| TIL-10 | IntGrid | void (10) | P0 | ✅ 완료 | itemworld 진입 트리거 (낙하 시퀀스). GDD 누락분 추가 |
| TIL-11 | IntGrid | oil (11) | P1 | ⬜ 제작 필요 | 가연성 슬릭. 화 인챈트로 연쇄 발화 |
| TIL-12 | IntGrid | metal (12) | P1 | ⬜ 제작 필요 | 뇌 인챈트 도체. water/acid 연결 시 풀 전체 감전 |
| TIL-13 | IntGrid | acid (13) | P2 | ⬜ 제작 필요 | DOT + 인접 metal 부식 + 뇌 전도 + magma 접촉 시 증발 |
| TIL-14 | IntGrid | wood (14) | P1 | ⬜ 제작 필요 | 솔리드 목재. fire 전파 slow burn (~3s). 가연 — BurnableZone 자동 배치 |
| TIL-15 | IntGrid | grass (15) | P1 | ⬜ 제작 필요 | 통과 1-타일 식생 cover. fast burn (~0.6s). 가연 — BurnableZone 자동 배치 |
| TIL-30 | Entity (LDtk) | BurnableZone | P1 | ✅ 코드 완료 | 절차적 풀/목재 배치 영역 마커 (rect, Type/Density/Seed 필드) |
| TIL-20 | Entity | CrackedFloor | P0 | ✅ 완료 | 다이브 어택 파괴 |
| TIL-21 | Entity | CollapsingPlatform | P0 | ✅ 완료 | 착지 후 무너짐 |
| TIL-22 | Entity | GrowingWall | P1 | ✅ 완료 | 주기적 확장/축소 |

---

## 0. 설계 원칙

### 0.1. 원소 = 환경

ECHORIS의 전투 원소 3종(화/빙/뇌)은 전투에서만이 아니라 **발밟는 땅에서도 느껴져야** 한다. 타일 체계는 원소 시스템의 공간적 확장이다.

### 0.2. IntGrid vs Entity 분류 기준

| 조건 | IntGrid | Entity |
|:---|:---|:---|
| 상태 없음 (항상 같은 물리) | ✓ | |
| 상태 변화 (타이머, 다단히트, 재생) | | ✓ |
| LDtk 브러시로 대량 배치 | ✓ | |
| 개별 스프라이트/애니메이션 필요 | | ✓ |
| 접촉 = 즉시 효과 | ✓ | |
| 공격/트리거 = 복잡 반응 | | ✓ |

**원칙:** 단순한 것은 IntGrid, 복잡한 것은 Entity.

### 0.3. 스파이크 검증

> "아이템에 들어가면, 그 아이템의 기억이 던전이 된다"

아이템의 **금속 결(재질)**이 원소 환경을 결정한다. 철검의 기억 속에는 뇌(charged) 타일이 많고, 화염검의 기억 속에는 마그마(magma) 타일이 많다. 같은 4x4 그리드라도 **아이템마다 기억의 성질이 다른 던전**이 된다.

---

## 1. IntGrid 정의표

### 1.1. 전체 목록

| 값 | 이름 | 원소 | 충돌 | 설명 | LDtk 색 |
|:---:|:---|:---:|:---|:---|:---|
| 0 | air | - | 통과 | 빈 공간 | (투명) |
| 1 | wall | - | 솔리드 | 벽/바닥. 기본 지형 | #B1824C |
| 2 | water | 수 | 통과 | 수중 물리 적용 (감속, 부력) | #7297E5 |
| 3 | platform | - | 편도 | 위에서 착지 가능, 아래에서 통과 | #14248B |
| 4 | updraft | 풍 | 통과 | 상향 힘 적용 | #2CE8F5 |
| 5 | spike | - | 통과 | 접촉 시 물리 데미지 + lastSafeGround 텔레포트 | #FF0044 |
| 6 | magma | 화 | 통과 | 접촉 시 화상(Burn) 상태이상 | #FF6600 |
| 7 | ice | 빙 | 솔리드 | 미끄러운 표면 (마찰 0) | #124E89 |
| 8 | charged | 뇌 | 통과 | 접촉 시 감전(Shock) 상태이상 (약한 DoT) | #FFEE44 |
| 9 | breakable | - | 솔리드 | 공격 1히트로 파괴 → air(0) 전환 | #886644 |
| 10 | void | - | 통과 | 발 진입 시 itemworld 낙하 시퀀스 트리거 (데미지 없음) | #181425 |
| 11 | oil | - | 통과 | 가연성. 화 공격 1회 → 인접 oil 연쇄 발화 → 짧은 시간 후 air | #3A2618 |
| 12 | metal | - | 솔리드 | 뇌 인챈트 도체. water/acid 인접 시 flood-fill 전도 | #A8A8B8 |
| 13 | acid | - | 통과 | DOT (HP 1.6%/s) + 인접 metal 부식 + 뇌 전도 + magma 접촉 시 증발 | #88CC44 |

### 1.2. 분류

**솔리드 (충돌 있음):** wall(1), platform(3, 편도), ice(7), breakable(9), metal(12)
**통과 (효과 있음):** water(2), updraft(4), spike(5), magma(6), charged(8), void(10), oil(11), acid(13)
**무효과:** air(0)

**원소 환경 매핑:**
- 수 = water(2)
- 풍 = updraft(4)
- 화 = magma(6)
- 빙 = ice(7)
- 뇌 = charged(8)
- 무속성 위험 = spike(5), void(10), acid(13)
- 가연/도체 자원 = oil(11), metal(12)

### 1.3. 확률 타일 (ItemWorldTemplates 빌드 전용)

| 값 | 설명 | 빌드 시 해석 |
|:---:|:---|:---|
| 50 | 50% wall | 50% 확률로 1(wall) 또는 0(air) |
| 51 | 50% platform | 50% 확률로 3(platform) 또는 0(air) |
| 52 | 25% wall | 25% 확률로 1(wall) 또는 0(air) |

확률 타일은 LDtk에 노출되지 않음. 코드 템플릿(`ItemWorldTemplates.ts`) 전용. LDtk 기반 템플릿은 확정 값만 사용.

---

## 2. 타일별 물리 규칙

### 2.1. wall (1) - 솔리드 벽

- 4방향 충돌. 플레이어/적/투사체 모두 차단
- 벽 타기 가능 (렐릭 "벽점프" 해금 후)
- 기본 지형. 모든 방의 경계

### 2.2. water (2) - 물

- 통과 가능. 진입 시 수중 물리 전환
- 이동속도 50% 감소
- 점프력 60% 감소, 대신 부력 적용 (천천히 상승)
- 수중 호흡 렐릭 없으면 산소 게이지 작동 (월드 전용, 아이템계는 미적용)
- 시각: 물 표면 파티클, 입수 시 스플래시

### 2.3. platform (3) - 편도 플랫폼

- 위에서 착지 가능, 아래/옆에서 통과
- 판정: 플레이어 발이 플랫폼 상단 위에 있고 + 하강 중일 때만 충돌
- 아래 키 + 점프 = 플랫폼 관통 낙하 (드롭 스루)

### 2.4. updraft (4) - 상승 바람

- 통과 가능. 영역 내 상향 힘 적용. **IntGrid 구현 완료**
- 강도: **고정 1단계** (중력의 2배 상향 힘). 진입 즉시 빠르게 상승
- 플레이어가 영역 안에 있는 동안 지속. 벗어나면 즉시 정상 중력 복귀
- 시각: 위로 흐르는 파티클 라인

### 2.5. spike (5) - 가시

- 통과 가능. 접촉 시 즉시 데미지
- 데미지: 플레이어 최대HP의 20%
- 접촉 후 **마지막으로 밟은 안전 발판 위치로 리스폰** + 무적 0.5초
- 원소 없음 (순수 물리 데미지)
- **리스폰 규칙:** 플레이어가 wall(1), platform(3), ice(7) 위에 grounded 상태일 때마다 해당 좌표를 "마지막 안전 발판"으로 갱신. spike 접촉 시 그 좌표로 리스폰
- **리스폰 연출:** 짧은 페이드아웃(200ms) → 안전 발판으로 이동 → 페이드인(200ms) + 무적 0.5초
- 시각: 뾰족한 삼각형 블록 (Phase 0: 빨간 사각형)

### 2.6. magma (6) - 용암 [화]

- 통과 가능. 접촉 시 **화상(Burn)** 상태이상 부여
- 화상: 초당 최대HP 2% 피해, 3초 지속
- 연속 접촉 시 스택 없음 (지속시간 리셋)
- 시각: 주황-빨강 사각형 + 열기 파티클 (Phase 0: 주황 사각형)
- **속성 상호작용:** 빙 공격 적중 시 3초간 냉각 → wall(1)로 임시 전환 → 3초 후 복귀

### 2.7. ice (7) - 얼음 [빙]

- 솔리드 (wall처럼 충돌). 위에서 걸을 수 있음
- 표면 위 이동 시 **마찰 0** (관성 유지, 제동 불가)
  - 이동속도 그대로, 방향 전환 시 미끄러짐
  - 점프/착지는 정상
- 시각: 연청색 사각형 + 반짝임 (Phase 0: 하늘색 사각형)
- **속성 상호작용:** 화 공격 적중 시 water(2)로 전환 (영구)

### 2.8. charged (8) - 전기 [뇌]

- **통과 가능 부피 영역** (water 와 동등한 placement 모델 — 1+ 셀 자유 배치)
- 영역 내 체류 시 **약한 지속 데미지 (DoT)**
- 데미지: 0.5초마다 최대HP 1% (spike보다 약함, 체류 시간에 비례)
- 감전 상태이상 미부여 (약한 환경 위험이지 전투 디버프가 아님)
- **시각 (확정, 2026-05-11):**
  - 노란 반투명 사각형 (`#FFEE44` 70% alpha) + 셀 가장자리에서 무작위 방향으로 zigzag 형성되는 전기 아크 (`#FFEE44` ~ `#FFFF80`)
  - 흰색 1×1 spark 파티클이 셀 내부에서 튕김. **표면 wave 없음** (water 와 구분)
  - 입자 부력 없음 (사방 무작위) — water 의 위로 솟는 거품과 구분
- **세계관 정당화:** 거대 빌더의 노출 회로 / 부서진 reactor 의 플라즈마 누출 / 폐허 연구소 잔존 전기장
- **속성 상호작용:** 없음 (독립)

### 2.9. breakable (9) - 파괴 가능 벽

- 솔리드 (wall과 동일 충돌)
- 플레이어 공격 1히트 → air(0)으로 전환
- 전환 시 파편 파티클
- 비밀 통로, 숨겨진 보상 방 입구에 사용
- **저장 규칙:** 같은 지층 내에서는 fullGrid 메모리로 유지. 지층 전환/재진입 시 리셋
- 시각 단서: wall과 **미세하게 다른 색** 또는 **균열 텍스처** (기본 어두운 갈색 + 균열선)

### 2.10. void (10) - 공허 / 아이템계 진입 트리거

- 통과 가능. **데미지 없음** (낙사 처리 아님)
- 발 진입 시 **itemworld 낙하 시퀀스 트리거** — DEC-039 Trapdoor Descent + 지층 축소 참조
- 월드 측: 아이템계 진입 의식의 일부로서 anvil → FloorCollapse → void 낙하 시퀀스에 사용
- 아이템계 내부: 지층 간 (N → N+1) trapdoor 표현
- **시각:** 검은 사각형 (`#181425`) + 무한히 빠지는 듯한 다크 그라데이션
- **속성 상호작용:** 없음 (원소 무관)
- **저장 규칙:** 정적 (런타임에 상태 변경 없음)

### 2.11. oil (11) - 가연성 슬릭

- 통과 가능. **이동 마찰 약간 감소** (ice 만큼은 아님)
- **화 인챈트 1히트 → 즉시 발화 + 인접 oil 셀로 연쇄 전파** (5px/tick 확률 55%)
- 발화 후 1.8초 burn → air(0) 전환 (재 없음)
- 발화 중 셀 위 적 → 화상(Burn) 상태이상 (`System_Combat_Elements.md §3.2`)
- 다른 원소 (빙/뇌) 와는 무반응 (oil 은 단순 fuel — fuel + spark = fire)
- **시각:** 어두운 갈색 (`#3A2618`) + 표면 반사 하이라이트 (얇은 노란 빛). 발화 시 oil 색이 fire 오버레이로 덮임
- **세계관 정당화:** 거대 빌더의 누수 윤활유 / 폐허 발전기의 연료 / 의식용 등잔 기름
- **속성 상호작용:**
  - + 화 → 발화 (위 규칙)
  - + 다른 원소 → 무반응
  - + spike/void → 그대로 (oil 위에 spike 배치 시 둘 다 효과)

### 2.12. metal (12) - 전도성 금속

- **솔리드** (wall 과 동일 충돌)
- **뇌 인챈트 도체:** 뇌 공격이 metal 셀에 적중하거나 인접한 water/acid 가 뇌에 감전되면 **flood-fill 로 connected metal 전체에 전파**
- 한 번 전도된 metal 은 인접 water/acid 도 즉시 감전시킴 (다단 전도)
- 다른 원소 (화/빙) 와는 무반응
- 산성 (acid) 인접 시 **점진 부식** — 6%/tick 확률로 metal → air(0). 시간 트랩 / 절차적 다리 파괴 활용
- **시각:** 회청색 솔리드 (`#A8A8B8`) + 가는 리벳/이음새 라인. 감전 중 노란 spark 오버레이
- **세계관 정당화:** 거대 빌더의 강철 골조 / 공장 컨베이어 / 폐기된 무기 잔해
- **속성 상호작용:**
  - + 뇌 → 전도 (위 규칙)
  - + acid 인접 → 부식
  - + 다른 원소 → 무반응

### 2.13. acid (13) - 산성 풀

- 통과 가능. 영역 내 체류 시 **DOT (HP 1.6%/s)** — magma 의 절반 강도
- **인접 metal 부식:** 6%/tick 확률로 metal → air (시간차 다리 끊김 트랩)
- **뇌 전도체:** 뇌 공격 시 connected acid 전체로 flood-fill 전파 (water 와 동등). water 와 인접 시 두 풀이 연결된 단일 conductor body 로 처리
- **magma 인접 시 증발:** 15%/tick 확률로 acid → air + 스팀 VFX
- 화 / 빙 공격에는 무반응 (산성은 액체이지만 fire 로 끓지 않음 — 단순화)
- **시각:** 산성 녹색 (`#88CC44`) + 표면 wave (water 와 동등) + 작은 노란-녹색 기포가 셀 내부에서 위로 떠오르는 애니메이션
- **세계관 정당화:** 폐허 연구소의 화학 잔류물 / 거대 빌더의 부식성 냉각수 / 부패한 의식 잔존물
- **속성 상호작용:**
  - + 뇌 → 전도 (water 동등)
  - + magma 인접 → 증발
  - 자체적으로 metal 부식 (passive)

---

## 3. 속성-타일 상호작용 매트릭스

### 3.1. 원칙

- **플레이어 에코 인챈트**가 원소 공격의 주체
- 원소 공격이 타일에 적중하면 타일 상태가 변화
- 적의 원소 공격도 동일하게 작용 (공정)

### 3.2. 매트릭스

| 타일 \\ 공격 원소 | 화 | 빙 | 뇌 | 무속성 |
|:---|:---:|:---:|:---:|:---:|
| **water (2)** | 증기 폭발 (범위 피해 + 물 제거) | 결빙 → wall(1) 임시 3초 | 감전 연쇄 (flood-fill, 위 적 전원 감전) | - |
| **magma (6)** | - | 냉각 → wall(1) 임시 3초 | - | - |
| **ice (7)** | 융해 → water(2) 영구 전환 | - | - | - |
| **charged (8)** | - | - | - | - |
| **breakable (9)** | 파괴 | 파괴 | 파괴 | 파괴 |
| **oil (11)** | **발화 → 연쇄 전파 → 1.8s 후 air** | - | - | - |
| **metal (12)** | - | - | **flood-fill 전도 (인접 water/acid 까지 확장)** | - |
| **acid (13)** | - | - | **flood-fill 전도 (water 와 등가)** | - |

**자동 상호작용 (공격 원소 없이 발생):**

| 인접 셀 A | 인접 셀 B | 결과 |
|:---|:---|:---|
| acid (13) | metal (12) | 6%/tick metal → air (점진 부식) |
| acid (13) | magma (6) | 15%/tick acid → air + 스팀 (증발) |
| magma (6) | ice (7) | 4%/tick ice → water (자연 융해) |
| ice (7) | water (2) | 4%/tick water → 임시 frozen (자연 결빙) |

### 3.3. 상호작용 상세

**화 + water → 증기 폭발**
- 반경 2타일 내 적에게 화상 상태이상
- 해당 water 타일 air(0)로 전환 (물 증발)
- 시각: 증기 파티클 폭발

**빙 + water → 결빙**
- water(2) → wall(1)로 3초간 임시 전환
- 플레이어가 위를 걸을 수 있음 (임시 다리)
- 3초 후 water(2)로 복귀
- 탐험 게이팅: 빙 원소 획득 후 물 위 비밀 영역 접근

**뇌 + water → 감전 연쇄**
- 해당 water 타일과 연결된 모든 water 타일 위의 적에게 감전
- 판정: water 연결성은 flood fill (상하좌우 인접한 water 타일 그룹)
- 이 방 안의 연결된 물 전체가 대상

**빙 + magma → 냉각**
- magma(6) → wall(1)로 3초간 임시 전환
- 용암 위를 걸을 수 있음 (임시 발판)
- 3초 후 magma(6)로 복귀

**화 + ice → 융해**
- ice(7) → water(2)로 영구 전환
- 얼음 바닥이 물로 바뀜 (지형 영구 변화)
- 전략: 얼음 바닥 위의 적이 물에 빠짐 → 뇌로 추가타

**화 + oil → 연쇄 발화**
- 적중 oil 셀 fire 값 1.0 으로 설정
- 매 tick (~120ms) 인접 4방 oil 셀로 55% 확률 전파
- 발화 oil 위 적 → 화상(Burn) 상태이상 부여
- 발화 후 1.8초 burn → air(0) 전환 (재 잔존 없음)
- 전략: 적 동선 앞에 oil 깔고 한 점만 점화 → 연쇄 폭격

**뇌 + metal → flood-fill 전도**
- 적중 metal 셀과 connected 4방 metal 그룹 전체 감전
- 인접 water/acid 가 있으면 그 풀까지 확장 → 풀 위 적 즉사
- 전략: 금속 다리 → 물 표면 → 풀 안의 모든 적에게 광역 처치
- 데드셀의 Shock chain 과 유사하나 grid flood-fill 로 결정론적

**뇌 + acid → flood-fill 전도 (water 와 등가)**
- acid 는 water 와 동등한 conductor body 로 처리
- 인접한 water + acid + metal 셀들이 단일 connected component 로 묶임
- 전략: acid 풀 위 적 + water 풀 위 적을 한 번에 처치

**acid + metal (자동, 패시브)**
- 매 tick 6% 확률로 acid 인접 metal → air
- 시간차 트랩 — 금속 다리가 점진적으로 부식되며 끊김
- 전략: acid 풀 위에 metal 다리 → 적이 건너는 동안 부식 → 적 추락 → DOT 사망

**acid + magma (자동, 패시브)**
- 매 tick 15% 확률로 magma 인접 acid → air
- 산이 magma 의 열에 증발 → 스팀 VFX
- 전략: 산성 풀을 magma 로 차단 / 우회 경로 강제

---

## 4. 아이템 재질 → 타일 테마 매핑

### 4.1. 개념

아이템계에 진입할 때, 해당 아이템의 **재질/성질**에 따라 타일 분포가 달라진다. 같은 4x4 그리드라도 아이템마다 "기억의 결"이 다르게 느껴진다.

### 4.2. 매핑 규칙

| 아이템 재질 | 주 타일 | 부 타일 | 분위기 |
|:---|:---|:---|:---|
| 철/강철 (기본) | wall, metal | charged (낮은 확률) | 단단하고 차가운, 전도성 위험 |
| 화염/용암 | magma | spike, oil | 뜨겁고 위험한 |
| 빙결/결정 | ice | water | 미끄럽고 투명한 |
| 번개/전기 | charged | metal, platform(편도) | 날카롭고 불안정 |
| 고대/부식 | breakable | spike, acid | 낡고 무너지는, 산성 잔류 |
| 산성/연금 | acid | metal, breakable | 부식성, 시간차 |
| 유기/연료 | oil | wood (Entity 후보), breakable | 가연성, 의식 잔존 |

### 4.3. 구현 방식

- `Content_Stats_Weapon_List.csv`에 `TileTheme` 컬럼 추가
- 아이템계 진입 시 해당 theme 기반으로 **방 선택 가중치** 조정
- LDtk 방 템플릿에 theme 태그 추가 (RoomType과 별개)
- 또는: 방 배치 후 **일부 wall 타일을 theme 타일로 치환** (런타임 후처리)

### 4.4. Phase 0 적용

Phase 0에서는 아이템 재질 매핑 미적용. 모든 아이템이 동일한 타일 분포 사용. Phase 1부터 theme별 방 풀 분리.

---

## 5. 월드 vs 아이템계 타일 사용 규칙

| 타일 | 월드 (Overworld) | 아이템계 (Item Stratum) |
|:---|:---:|:---:|
| wall (1) | ✓ | ✓ |
| water (2) | ✓ (수중 호흡 게이트) | ✓ (산소 게이지 없음) |
| platform (3) | ✓ | ✓ |
| updraft (4) | ✓ (특정 구역) | ✓ |
| spike (5) | ✓ (함정) | ✓ (빈번) |
| magma (6) | ✓ (화산 구역, Tier 7) | ✓ (화염 아이템) |
| ice (7) | ✓ (빙결 보존소, Tier 6) | ✓ (빙결 아이템) |
| charged (8) | ✓ (연구소 폐허, Tier 5) | ✓ (전기 아이템) |
| breakable (9) | ✓ (비밀 통로) | ✓ (비밀 통로) |
| void (10) | ✓ (anvil 진입 시퀀스) | ✓ (지층 간 trapdoor, DEC-039) |
| oil (11) | ✓ (등잔/연료고) | ✓ (유기/연료 아이템) |
| metal (12) | ✓ (구조물 골조) | ✓ (철/강철, 번개/전기 아이템) |
| acid (13) | ✓ (연구소 잔류) | ✓ (산성/연금 아이템, 고대/부식) |

**차이점:**
- 월드: 타일이 **능력 게이트**와 결합 (수중 호흡 없으면 물 진입 불가)
- 아이템계: 타일이 **전투 환경**으로 작용 (속성 상호작용 중심)
- 월드: water에 산소 게이지 적용
- 아이템계: water에 산소 게이지 미적용 (짧은 세션이므로)

---

## 6. Phase별 구현 순서

### Phase 0 (완료)

| 타일 | 상태 | 비고 |
|:---|:---|:---|
| wall (1) / water (2) / platform (3) / updraft (4) | ✅ | 코어 |
| spike (5) | ✅ | IntGrid 편입 완료 |
| ice (7) | ✅ | 마찰 0 + 화 융해 |
| breakable (9) | ✅ | 1히트 파괴 |
| void (10) | ✅ | itemworld 진입 시퀀스 |

### Phase 1 (현재 작업 대상 — 일괄 추가)

> **결정 (2026-05-11):** LDtk IntGrid 5종을 한 번에 등록 + Physics.ts 함수를 한 번에 구현.

| 타일 | LDtk 작업 | Physics.ts 작업 | 상호작용 |
|:---|:---|:---|:---|
| magma (6) | slot 6 identifier `magma`, color `#FF6600`, tile 부여 | `isMagma()` 추가. 접촉 시 Burn 상태이상 (HP 2%/s, 3s) | 빙 인챈트 → 3s wall ; acid 인접 시 acid 증발 |
| charged (8) | slot 8 identifier `charged`, color `#FFEE44`, tile 부여 | `isCharged()` 추가. 0.5s마다 HP 1% DOT (체류) | 없음 (독립) |
| oil (11) | slot 11 identifier `oil`, color `#3A2618` | `isOil()` 추가. 화 공격 시 연쇄 발화 grid mutation | 화 → 1.8s burn → air |
| metal (12) | slot 12 identifier `metal`, color `#A8A8B8` | `isMetal()` + `floodFillConductor()` (flood-fill 뇌 전도) | 뇌 → 인접 water/acid 까지 전도 ; acid 인접 → 부식 |
| acid (13) | slot 13 identifier `acid`, color `#88CC44` | `isAcid()` 추가. HP 1.6%/s DOT + 인접 metal 부식 cellTick | 뇌 → water 와 등가 ; magma 인접 → 증발 |

**동기화 대상:**
- `Physics.ts:73` `isSpecialVisualTile()` — magma·charged·oil·acid 시각 보존 필요 타일 추가
- `Sheets/` 영향 없음 (IntGrid 는 LDtk-only)
- 기존 룸 데이터 영향 없음 (신규 슬롯만 추가)

### Phase 2 (후속)

| 타일 | 작업 |
|:---|:---|
| 아이템 재질 테마 매핑 | CSV TileTheme 컬럼 + 방 선택 가중치. `Content_Stats_Weapon_List.csv` |
| 타일 시각 (오토타일) | 각 IntGrid 값별 LDtk Auto-Tile 룰 정의 |
| frozen 시각 통일 | water/magma 가 ice 로 임시 전환된 상태의 통일 표현 (현재 frozen overlay 임시) |

---

## 7. LDtk 설정 가이드

### 7.1. IntGrid 등록 (Collisions 레이어)

> **컨벤션:** identifier 는 **lowercase** (현행 `walls`, `water`, `ice` 와 일치). PascalCase 금지.
> **현재 LDtk 상태:** slots 1-5·7·9·10 은 active. **slots 6·8 은 색상만 예약된 null** (즉시 identifier 부여 필요).

| 값 | identifier | 색 | 충돌 | 비고 |
|:---:|:---|:---|:---|:---|
| 1 | walls | `#B1824C` | 솔리드 | 기존 |
| 2 | water | `#7297E5` | 통과 | 기존 |
| 3 | platform | `#14248B` | 편도 | 기존 |
| 4 | updraft | `#2CE8F5` | 통과 | 기존 |
| 5 | spike | `#FF0044` | 통과 | 기존 |
| **6** | **magma** | `#FF6600` | **통과** | **신규 (slot 예약됨, identifier 부여 필요)** |
| 7 | ice | `#124E89` | 솔리드 | 기존 |
| **8** | **charged** | `#FFEE44` | **통과** | **신규 (slot 예약됨, identifier 부여 필요)** |
| 9 | breakable | `#886644` | 솔리드 | 기존 |
| 10 | void | `#181425` | 통과 | 기존 |
| **11** | **oil** | `#3A2618` | **통과** | **신규** |
| **12** | **metal** | `#A8A8B8` | **솔리드** | **신규** |
| **13** | **acid** | `#88CC44` | **통과** | **신규** |
| **14** | **wood** | `#9A6E3A` | **솔리드** | **신규 — 가연 (slow burn 3s)** |
| **15** | **grass** | `#6BA84F` | **통과** | **신규 — 가연 (fast burn 0.6s), 1-타일 cover** |

### 7.2. 배치 규칙

- **spike (5):** 바닥/벽/천장에 1타일 두께. 연속 배치 가능
- **magma (6):** water 와 동일 영역 배치. 최소 2x2 권장
- **ice (7):** wall 대체로 바닥 표면 연속 배치 권장
- **charged (8):** 부피 영역 배치 (1+ 타일 자유). water 와 동일 모델
- **breakable (9):** wall 과 동일. 반드시 뒤에 빈 공간 (비밀 통로) 확보
- **void (10):** anvil 의식 / 지층 trapdoor 등 의도된 진입 트리거 위치에만
- **oil (11):** 바닥에 얕은 영역 배치 (1~2 타일 두께 권장). 적 동선 위에 깔아 화 연쇄 유도
- **metal (12):** 다리 / 발판 / 회로 형태. **acid 풀 위에 배치 시 자연 부식 트랩 형성**
- **acid (13):** water 와 동일 영역 모델. **금속 인접 시 자동 부식 발생 — 디자인 의도 확인**

### 7.2.1. BurnableZone Entity (절차적 풀/목재 배치 마커)

**용도:** 핸드페인트 vs 절차의 **하이브리드**. LDtk 에서 룸 디자이너는 "여기는 식생 영역"이라는 의도만 rect 로 칠해 두고, 코드(`BurnableZonePass.ts`) 가 셀 단위 분포는 자동 채움.

**LDtk Editor 정의:**

```
Identifier: BurnableZone
Resizable: true (rect)
Pivot: 0, 0 (top-left)
Color: #6BA84F (UI 표시용)
Fields:
  - Type: Enum (Grass | Wood | Mixed)   default = Grass
  - Density: Float (0..1)               default = 0.4
  - Seed: Int                           default = 0 (0 = non-deterministic)
```

**배치 규칙 (코드가 자동 수행):**

- **grass (15):** rect 내부에서 `WALL 위에 AIR 있는` 셀의 AIR 슬롯에 배치 (1-타일 cover)
- **wood (14):** rect 내부에서 WALL 가로 run 길이 ≥ 3 인 셀의 WALL 을 wood 로 치환 (다리·바닥 변형)
- **Blacklist:** 1-셀 반경 내 magma · charged · spike · water · acid 있으면 skip (ECHORIS 톤: 식생/목재는 위험 근처에서 자라지 않음)
- **Cluster bias:** grass 셀 4-이웃에 grass 있으면 추가 +0.20 확률 (군락 형성)
- **Mixed:** rng 50/50 로 grass·wood 분기
- **Seed > 0:** mulberry32 PRNG 로 결정론적 분포 (같은 룸 = 항상 같은 모습)

**적용 시점:**
- **월드:** `LdtkWorldScene.loadLevel()` 의 collisionGrid 복사 직후 (룸 전환마다)
- **아이템계:** `ItemWorldScene.buildFullMap()` 의 각 룸 stamp 직후 (room offset 으로 fullGrid 좌표 보정)

**Fire 전파 시 burn duration (TileMutator):**

| 타일 | spread chance (인접) | burn duration |
|:---|:---:|:---:|
| grass (15) | 0.85 (fast) | 0.6 s |
| oil (11) | 0.55 | 1.8 s |
| wood (14) | 0.30 (slow) | 3.0 s |

전부 burn 종료 시 AIR 로 소진 (재 잔존 없음).

### 7.2.2. Tier B BurnableProp Entity (절차적 가연 오브젝트)

타일 cell 만으로는 표현 불가능한 **인스턴스화된 가연 오브젝트** (상자, 가지 더미, 커튼, 덩굴 등). BurnableZonePass 가 grass/wood 셀과 동일 영역에서 **밀도의 15%** 확률로 함께 스폰한다.

**카탈로그 (`game/src/entities/BurnableProp.ts`):**

| id | 셀 | hp | burn ms | anchor | ignite chance | 톤 |
|:---|:---:|:---:|:---:|:---|:---:|:---|
| `WoodCrate` | 1×1 | 1 | 2500 | floor | 0.45 | 보급 상자, 단단한 목재 |
| `BranchPile` | 1×1 | 1 | 800 | floor | 0.85 | 마른 가지 부싯깃 — 빠른 점화 |
| `Bush` | 1×1 | 1 | 600 | floor | 0.90 | 잡관목 — 가장 빠른 점화 |
| `Curtain` | 1×3 | 1 | 1200 | ceiling | 0.75 | 천장 매달림, 수직 천 |
| `Vine` | 1×3 | 1 | 900 | ceiling | 0.70 | 천장 덩굴 |

**전파 규칙:**

- **타일 → 엔티티:** 인접 burning 타일의 4-이웃에 엔티티 footprint 가 있으면 `spec.ignitionChance` 확률로 점화
- **엔티티 → 타일:** burning 엔티티 footprint 의 4-이웃 flammable 타일은 50% 확률로 점화 (radiating heat)
- **엔티티 → 엔티티:** burning 엔티티 인접 다른 엔티티는 `0.40 × target.ignitionChance` 로 점화
- **자체 소진:** burn 시간 종료 시 sprite 제거 + footprint 셀은 AIR 유지

**자동 배치 규칙 (`BurnableZonePass.populateZoneEntities`):**

- BurnableZone density × 0.15 확률로 셀당 시도
- anchor 자동 감지:
  - WALL 가 아래에만 있는 AIR 셀 → `floor` (위로 성장)
  - WALL 가 위에만 있는 AIR 셀 → `ceiling` (아래로 성장)
- BurnableZone Type 별 카탈로그 풀:
  - **Grass:** Bush, BranchPile, Vine
  - **Wood:** WoodCrate, BranchPile, Curtain
  - **Mixed:** 전체 풀에서 무작위
- footprint 전 셀 AIR + 위험 인접 0 + 다른 엔티티 미점유 검증 통과 시 commit
- Seed > 0 시 mulberry32 결정론적 배치 (grass 와 동일 시드 공유)

**스폰 후 라이프사이클:**

1. 씬이 `BurnableProp` 인스턴스 생성 → `entityLayer.addChild(prop.container)` → `tileMutator.registerBurnable(prop)`
2. 매 프레임 `prop.update(dt)` (TileHazards tick 안에서 호출)
3. `prop.destroyed === true` 도달 시 unregister + `prop.destroy()` (sprite 제거)
4. 룸 / floor 전환 시 모든 prop 강제 destroy + registry 비움

**시각 (V1 placeholder):**

PixiJS Graphics primitive 로 anchor 별 박스 + 불꽃 오버레이 (intensity 펄스 + lifeRatio 기반 색 darken). 실제 sprite 자산 도착 시 `BurnableSpec.assetPath` 로 swap. 카탈로그에 슬롯 예약됨.

### 7.3. Entity 유지 대상

다음은 IntGrid 로 전환하지 않고 Entity 로 유지:

| Entity | 이유 |
|:---|:---|
| CrackedFloor | 다이브 어택 전용 파괴 + 상태 변화 |
| CollapsingPlatform | 타이머 상태 (착지→무너짐→재생) |
| GrowingWall | 주기적 확장/축소 + 슬라임 생성 |
| Wood (가연 구조물) | 향후 추가 시 IntGrid 대신 Entity 권장 (slow burn 상태 추적) |

---

## 8. 참고 문서

- `System_Combat_Damage.md` - 원소 시스템 (화/빙/뇌 + 무속성, 상태이상 규칙)
- `System_Combat_Weapons.md` - 무기별 속성
- `System_Memory Shard_Core.md` - 기억 단편 원소 강화
- `game/src/core/Physics.ts` - 현재 IntGrid 물리 구현
- `game/src/level/ItemWorldTemplates.ts` - 확률 타일 (50-52)
- `Reference/Spelunky-LevelGeneration-ReverseGDD.md` - 스펠렁키 타일 체계
- `Reference/DeadCells-LevelGeneration-ReverseGDD.md` - 데드셀 환경 타일
