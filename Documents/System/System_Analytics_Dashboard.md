# Looker Studio 대시보드 설계 (SYS-TEL-02)

> 최근 업데이트: 2026-04-21
> 문서 상태: `구현 가이드 (Implementation Guide)`
> 전제: GA4 Measurement ID `G-GECC9GCRHG`, TEL-01~14/18/19 구현 완료

## 0. 목표

GA4 메뉴 4~5단 순회 없이 **단일 URL 북마크 클릭 한 번으로 모든 핵심 KPI 확인**. 2026-04-20 플레이테스트에서 반복된 "한 눈에 안 보인다" 문제 해결.

---

## 1. 선행 작업: GA4 커스텀 디멘션 등록

> **경로:** GA4 Admin > Property > Data display > Custom definitions > Create custom dimension

Looker Studio에서 이벤트 파라미터를 분해하려면 GA4에 커스텀 디멘션으로 반드시 등록해야 한다. 등록하지 않으면 이벤트 수(eventCount)만 보이고 파라미터별 분류가 불가능하다.

### 1.1. 등록할 이벤트 범위 커스텀 디멘션 (16개)

| # | 디멘션 이름 (GA4 표시명) | 이벤트 파라미터명 | 범위 | 사용 위젯 |
|---|---|---|---|---|
| 1 | Run ID | `run_id` | Event | 세션 단위 시퀀스 상관관계 |
| 2 | Build Version | `build_version` | Event | 글로벌 필터 (dev/production 분리) |
| 3 | Area | `area` | Event | C1, C2 (world/itemworld 구분) |
| 4 | Level ID | `level_id` | Event | C1, C4, D5 |
| 5 | Enemy Type | `enemy_type` | Event | C1, C2 |
| 6 | Room Col | `room_col` | Event | C1 (사망 위치) |
| 7 | Room Row | `room_row` | Event | C1 (사망 위치) |
| 8 | Exit Type | `exit_type` | Event | A4 (clear/escape/death) |
| 9 | Floor | `floor` | Event | A4, C3 (지층 인덱스) |
| 10 | Item Rarity | `item_rarity` | Event | A3, D1 |
| 11 | Source | `source` | Event | D2, D3 |
| 12 | Gate Type | `gate_type` | Event | C4 |
| 13 | Stat Type | `stat_type` | Event | C4 |
| 14 | Ability Name | `ability_name` | Event | D5 |
| 15 | Boss ID | `boss_id` | Event | C3 보스 식별 |
| 16 | Step ID | `step_id` | Event | E1, E2 (온보딩) |

### 1.2. 등록할 이벤트 범위 커스텀 메트릭 (4개)

> **경로:** GA4 Admin > Property > Data display > Custom definitions > Create custom metric

| # | 메트릭 이름 | 이벤트 파라미터명 | 단위 | 사용 위젯 |
|---|---|---|---|---|
| 1 | Playtime Seconds | `playtime_sec` | Seconds | B1, B2 |
| 2 | Load Time Ms | `load_time_ms` | Milliseconds | B4 |
| 3 | IW Entry Count | `count` | Standard | A2, A3 |
| 4 | Time Spent Seconds | `time_spent_sec` | Seconds | C3 체류시간 |

### 1.3. 등록 절차 (1개당 30초, 총 10분)

1. GA4 Admin 접속 (analytics.google.com) > 좌측 하단 Admin(톱니바퀴)
2. Property 열 > Data display > Custom definitions
3. **Create custom dimension** 클릭
4. Dimension name: 위 표의 "디멘션 이름" 입력
5. Scope: **Event** 선택
6. Event parameter: 위 표의 "이벤트 파라미터명" 정확히 입력 (자동완성 안 뜨면 직접 타이핑)
7. Save
8. 커스텀 메트릭도 같은 방식 (Create custom metric > Unit of measurement 선택)

**주의:** 등록 후 24~48시간 이후부터 Looker Studio에서 해당 디멘션이 데이터 소스 필드 목록에 노출된다. 등록 이전에 수집된 이벤트의 파라미터도 소급 적용된다.

---

## 2. 1페이지 구성 (4블록 x 2행)

```
┌─────────────────────────────┬─────────────────────────────┐
│ 블록 A: 스파이크             │ 블록 B: 핵심 루프           │
│ (아이템계 재진입률)          │ (세션/온보딩 건강도)        │
├─────────────────────────────┼─────────────────────────────┤
│ 블록 C: 이탈 분석            │ 블록 D: 경제/진행도         │
│ (사망/게이트 막힘)           │ (드랍/레벨업/장착)          │
└─────────────────────────────┴─────────────────────────────┘
```

---

## 3. 블록별 위젯 + Looker Studio 설정

### 글로벌 필터 (페이지 최상단)

| 설정 | 값 |
|---|---|
| 컨트롤 타입 | Drop-down list |
| 디멘션 | `Build Version` (커스텀 디멘션) |
| 기본값 | `production` |
| 용도 | development/production 트래픽 분리 |

### 글로벌 날짜 범위 (페이지 최상단)

| 설정 | 값 |
|---|---|
| 컨트롤 타입 | Date range control |
| 기본 범위 | Last 7 days |

---

### A. 스파이크 블록 (1순위 KPI)

#### A1: 아이템계 진입 유저 수

| 설정 | 값 |
|---|---|
| 차트 타입 | Scorecard |
| 메트릭 | `Total Users` |
| 필터 | Event name = `item_world_enter` |
| 비교 | 이전 기간 (전주 대비) |
| 목표 | 절대값 표시 |

#### A2: 재진입률 게이지

| 설정 | 값 |
|---|---|
| 차트 타입 | Gauge |
| 구현 방식 | 계산된 필드 (Calculated Field) |
| 계산식 | Looker Studio에서 직접 계산 불가 -- GA4 Explorations 퍼널 사용 |
| 대안 | Scorecard 2개: (1) `item_world_enter` 유저 수, (2) `item_world_enter` 이벤트 수. 비율 = 이벤트수/유저수. 1.0 이상이면 재진입 발생 |
| 목표 | **50%+** (킬 30% 미만) |

> **참고:** 정확한 재진입률(count>=2 유저 / count>=1 유저)은 GA4 Explorations > Free Form에서 `IW Entry Count` 커스텀 메트릭을 디멘션으로 사용해 계산. Looker Studio에서는 근사값(이벤트수/유저수)으로 대체.

#### A3: 진입 횟수 분포

| 설정 | 값 |
|---|---|
| 차트 타입 | Bar chart |
| 디멘션 | `IW Entry Count` (커스텀 메트릭을 디멘션으로) |
| 메트릭 | `Total Users` |
| 필터 | Event name = `item_world_enter` |
| 정렬 | IW Entry Count 오름차순 |
| 목표 | count>=3이 20%+ |

#### A4: 퇴장 유형 비율

| 설정 | 값 |
|---|---|
| 차트 타입 | Pie chart |
| 디멘션 | `Exit Type` (커스텀 디멘션) |
| 메트릭 | `Event Count` |
| 필터 | Event name = `item_world_exit` |
| 목표 | clear 40%+ |

---

### B. 핵심 루프 블록

#### B1: 평균 세션 시간

| 설정 | 값 |
|---|---|
| 차트 타입 | Scorecard |
| 메트릭 | `Playtime Seconds` (커스텀 메트릭) > AVG 집계 |
| 필터 | Event name = `session_end` |
| 표시 형식 | 초 -> 분 변환 (계산된 필드: `Playtime Seconds / 60`) |
| 목표 | **15분+** (킬 5분 미만) |
| 조건부 서식 | < 300초 = 빨강, 300~900 = 노랑, 900+ = 초록 |

#### B2: 세션 길이 분포

| 설정 | 값 |
|---|---|
| 차트 타입 | Bar chart |
| 디멘션 | 계산된 필드 `Session Bucket` |
| 계산식 | `CASE WHEN Playtime Seconds < 300 THEN "0-5min" WHEN Playtime Seconds < 900 THEN "5-15min" WHEN Playtime Seconds < 1800 THEN "15-30min" ELSE "30min+" END` |
| 메트릭 | `Event Count` |
| 필터 | Event name = `session_end` |
| 정렬 | Session Bucket 오름차순 |
| 목표 | 15+분 50%+ |

#### B3: 세이브 발견율

| 설정 | 값 |
|---|---|
| 차트 타입 | Scorecard |
| 구현 | Blended Data (2소스) |
| 소스 1 | Event = `player_save`, Metric = `Total Users` |
| 소스 2 | Event = `game_start`, Metric = `Total Users` |
| 계산된 필드 | `Save Users / Start Users * 100` |
| 목표 | **90%+** |
| 현재값 참고 | 30일 기준 9/34 = 26.5% (심각 미달) |

#### B4: 부팅 시간

| 설정 | 값 |
|---|---|
| 차트 타입 | Scorecard |
| 메트릭 | `Load Time Ms` (커스텀 메트릭) > AVG 집계 |
| 필터 | Event name = `game_loaded` |
| 표시 형식 | ms 단위 |
| 목표 | 3000ms 이하 |
| 조건부 서식 | > 5000 = 빨강, 3000~5000 = 노랑, < 3000 = 초록 |

---

### C. 이탈 분석 블록

#### C1: 사망 히트맵 TOP 10

| 설정 | 값 |
|---|---|
| 차트 타입 | Table (Pivot 아님) |
| 디멘션 | `Level ID` (커스텀), `Enemy Type` (커스텀) |
| 메트릭 | `Event Count` |
| 필터 | Event name = `player_death` |
| 정렬 | Event Count 내림차순 |
| 행 수 | 10 |
| 용도 | 사망 집중 지점 = 난이도 스파이크 탐지 |

#### C2: 사망 원인 분류

| 설정 | 값 |
|---|---|
| 차트 타입 | Bar chart (Stacked) |
| 디멘션 | `Enemy Type` (커스텀) |
| 메트릭 | `Event Count` |
| 필터 | Event name = `player_death` |
| 정렬 | Event Count 내림차순 |
| 용도 | spike/projectile = 환경, 나머지 = 전투. 환경 데미지 과다 여부 판별 |

#### C3: 아이템계 지층 퍼널

| 설정 | 값 |
|---|---|
| 차트 타입 | Bar chart (수평, 퍼널 시뮬레이션) |
| 구현 | Blended Data (4개 소스) |
| 소스 1 | Event = `item_world_enter`, Metric = `Event Count` |
| 소스 2 | Event = `item_world_floor_clear` + Floor = 0, Metric = `Event Count` |
| 소스 3 | Event = `item_world_floor_clear` + Floor = 1, Metric = `Event Count` |
| 소스 4 | Event = `item_world_exit` + Exit Type = `clear`, Metric = `Event Count` |
| 라벨 | Enter -> Floor 0 Clear -> Floor 1 Clear -> Exit(Clear) |
| 용도 | 지층별 이탈률 시각화 |

> **참고:** Looker Studio에 네이티브 퍼널 차트가 없으므로, 수평 막대 + Blended Data로 시뮬레이션. 정확한 퍼널은 GA4 Explorations > Funnel Exploration 사용.

#### C4: 게이트 막힘 이탈

| 설정 | 값 |
|---|---|
| 차트 타입 | Table |
| 디멘션 | `Gate Type` (커스텀), `Stat Type` (커스텀), `Level ID` (커스텀) |
| 메트릭 | `Event Count` |
| 필터 | Event name = `gate_break` |
| 정렬 | Event Count 내림차순 |
| 용도 | 게이트 돌파 빈도. 빈도가 낮은 게이트 = 진행 병목 |

> **한계:** "게이트 부근 사망" 상관관계는 Looker Studio에서 시간 순서 분석 불가. GA4 BigQuery Export + SQL로만 가능.

---

### D. 경제/진행도 블록

#### D1: 드랍 레어도 분포

| 설정 | 값 |
|---|---|
| 차트 타입 | Pie chart |
| 디멘션 | `Item Rarity` (커스텀) |
| 메트릭 | `Event Count` |
| 필터 | Event name = `item_drop` |
| 색상 | Normal=#FFFFFF, Magic=#6969FF, Rare=#FFFF00, Legendary=#FF8000, Ancient=#00FF00 |

#### D2: 드랍 소스 분포

| 설정 | 값 |
|---|---|
| 차트 타입 | Bar chart |
| 디멘션 | `Source` (커스텀) |
| 메트릭 | `Event Count` |
| 필터 | Event name = `item_drop` |
| 정렬 | Event Count 내림차순 |

#### D3: 강화 경로 선호도

| 설정 | 값 |
|---|---|
| 차트 타입 | Table |
| 디멘션 | `Source` (커스텀) |
| 메트릭 | `Event Count`, `Total Users` |
| 필터 | Event name = `item_level_up` |
| 정렬 | Event Count 내림차순 |
| 기대 행 | itemworld_boss / itemworld_exp / anvil |

#### D4: 무기 교체 활성도

| 설정 | 값 |
|---|---|
| 차트 타입 | Scorecard |
| 메트릭 | `Event Count` / `Total Users` (계산된 필드) |
| 필터 | Event name = `item_equip` |
| 해석 | 1.0 미만 = 교체 안 함 (UI 장벽?), 3.0+ = 활발한 교체 |

#### D5: 렐릭 획득 순서

| 설정 | 값 |
|---|---|
| 차트 타입 | Bar chart |
| 디멘션 | `Ability Name` (커스텀) |
| 메트릭 | `Total Users` |
| 필터 | Event name = `relic_acquire` |
| 정렬 | Total Users 내림차순 |
| 용도 | 가장 많이 획득된 렐릭 = 초반 게이트. 가장 적은 = 후반/미발견 |

---

## 4. 2페이지: 온보딩 블록 (조건부)

`tutorial_step` 이벤트가 누적되면 2페이지에 추가. Phase 1 이므로 1페이지가 우선.

#### E1: 튜토리얼 퍼널

| 설정 | 값 |
|---|---|
| 차트 타입 | Bar chart (수평) |
| 디멘션 | `Step ID` (커스텀) |
| 메트릭 | `Total Users` |
| 필터 | Event name = `tutorial_step` |
| 정렬 | Total Users 내림차순 |

#### E2: 이탈 지점

| 설정 | 값 |
|---|---|
| 차트 타입 | Table |
| 디멘션 | `Step ID` (커스텀) |
| 메트릭 | `Event Count`, `Total Users` |
| 필터 | Event name = `tutorial_step` |
| 해석 | Users 급감 지점 = 온보딩 이탈 구간 |

---

## 5. Looker Studio 생성 절차

### 5.1. 보고서 생성

1. https://lookerstudio.google.com/ 접속
2. **빈 보고서** (Blank Report) 생성
3. 보고서 이름: `ECHORIS Telemetry Dashboard`

### 5.2. 데이터 소스 연결

1. **데이터 추가** > Google Connectors > **Google Analytics**
2. 계정 선택 > 속성 `G-GECC9GCRHG` (echoris.io) 선택
3. **추가** 클릭

### 5.3. 계산된 필드 생성

데이터 소스 편집에서 아래 필드를 추가:

| 필드 이름 | 수식 | 타입 |
|---|---|---|
| Playtime Minutes | `Playtime Seconds / 60` | Number |
| Session Bucket | `CASE WHEN Playtime Seconds < 300 THEN "0-5min" WHEN Playtime Seconds < 900 THEN "5-15min" WHEN Playtime Seconds < 1800 THEN "15-30min" ELSE "30min+" END` | Text |
| Equip Per User | `Event Count / Total Users` | Number |

### 5.4. 레이아웃 배치

1. 캔버스 크기: 1200 x 900 px (16:12)
2. 상단 80px: 제목 + Build Version 필터 + 날짜 범위
3. A블록: (0, 80) ~ (600, 480) — 좌상단
4. B블록: (600, 80) ~ (1200, 480) — 우상단
5. C블록: (0, 480) ~ (600, 900) — 좌하단
6. D블록: (600, 480) ~ (1200, 900) — 우하단
7. 각 블록 내부에 위젯 2x2 배치

### 5.5. 테마

| 요소 | 값 |
|---|---|
| 배경 | #0A0A0A (다크) |
| 카드 배경 | #1A1A1A |
| 텍스트 | #E0E0E0 |
| 강조색 | #00BCD4 (청록, ECHORIS 메인) |
| 경고색 | #FF8000 (주황, 구조물 색) |
| 위험색 | #FF4444 (빨강) |
| 폰트 | Roboto Mono |

### 5.6. 공유

1. **공유** > 본인 이메일에 편집 권한
2. URL 복사 > 브라우저 북마크에 추가
3. (선택) 링크 공유 > "링크가 있는 모든 사용자가 볼 수 있음"

---

## 6. 현재 데이터 베이스라인 (30일, 2026-04-21 기준)

> 커스텀 디멘션 등록 전이므로 이벤트 수준 집계만 가능.

| 이벤트 | 이벤트 수 | 고유 유저 | 상태 |
|---|---|---|---|
| game_start | 116 | 34 | 수집 중 |
| session_end | 399 | 33 | 수집 중 |
| item_world_enter | 92 | 14 | 수집 중 |
| item_world_exit | 135 | 10 | 수집 중 |
| item_world_floor_clear | 43 | 10 | 수집 중 |
| player_death | 58 | 8 | 수집 중 |
| player_save | 26 | 9 | 수집 중 |
| game_loaded | 0 | 0 | P1 신규 (04-21 배포) |
| enemy_kill | 0 | 0 | P1 신규 |
| boss_fight | 0 | 0 | P1 신규 |
| item_drop | 0 | 0 | P1 신규 |
| item_equip | 0 | 0 | P1 신규 |
| item_level_up | 0 | 0 | P1 신규 |
| gate_break | 0 | 0 | P1 신규 |
| relic_acquire | 0 | 0 | P1 신규 |
| tutorial_step | 0 | 0 | P1 신규 |

### 산출 가능 KPI

| KPI | 값 | 목표 | 판정 |
|---|---|---|---|
| 아이템계 진입 유저 | 14명 / 34명 (41%) | - | 참여율 양호 |
| 아이템계 진입/유저 비율 | 92/14 = 6.6회 | 재진입 발생 | 긍정 신호 |
| 세이브 발견율 | 9/34 = 26.5% | 90%+ | 심각 미달 |
| 아이템계 퍼널 | 92(진입) -> 43(층클리어) -> 135(퇴장) | - | 퇴장수>진입수 = 복수 퇴장 이벤트 의심 |

---

## 7. 체크리스트

- [ ] GA4 Admin: 커스텀 디멘션 16개 등록
- [ ] GA4 Admin: 커스텀 메트릭 4개 등록
- [ ] 24~48시간 대기 (GA4 처리 시간)
- [ ] 프로덕션 플레이테스트 1회 (P1 이벤트 데이터 생성)
- [ ] Looker Studio: 보고서 생성 + 데이터 소스 연결
- [ ] Looker Studio: 계산된 필드 3개 생성
- [ ] Looker Studio: A~D 블록 위젯 배치 (18개)
- [ ] Looker Studio: 테마/서식 적용
- [ ] Looker Studio: Build Version 필터 + 날짜 범위 추가
- [ ] URL 북마크 저장

---

## 8. 주의사항

- **GA4 커스텀 디멘션 한도**: 무료 티어 기준 이벤트 범위 50개, 유저 범위 25개. 현재 16개 등록이므로 여유 충분
- **소급 적용**: 커스텀 디멘션 등록 후, 등록 이전에 수집된 이벤트 파라미터도 보고서에 노출됨
- **30분 지연**: Looker Studio는 실시간이 아님. 즉시 검증은 GA4 DebugView 사용
- **Phase 1 표본 수 부족**: N<30 구간에서는 비율 지표에 큰 노이즈. 절대값 지표와 병행 해석
- **item_world_exit 이상치**: 퇴장 이벤트(135) > 진입 이벤트(92). 이중 발화 가능성 조사 필요

---

## 9. 관련 문서

- `System_Analytics_Telemetry.md` -- 이벤트 정의 SSoT
- `ECHORIS_KPI_CriticalAnalysis.md` -- KPI 목표치 근거
