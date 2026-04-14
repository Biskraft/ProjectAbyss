# 분석 및 텔레메트리 시스템 (SYS-TEL-01)

## 구현 현황 (Implementation Status)

> 최근 업데이트: 2026-04-12
> 문서 상태: `작성 중 (Draft)`
> 2-Space: 전체 (World / Item World)

| ID | 분류 | 기능명 | 우선순위 | 구현 상태 | 비고 |
| :--- | :--- | :--- | :---: | :--- | :--- |
| TEL-01 | 세션 | game_start | P0 | 구현 완료 | GA4 커스텀 이벤트 |
| TEL-02 | 세션 | session_end | P0 | 구현 완료 | beforeunload로 playtime_sec 전송 |
| TEL-03 | 스파이크 | item_world_enter | P0 | 구현 완료 | 재진입률 = 핵심 KPI |
| TEL-04 | 스파이크 | item_world_exit | P0 | 구현 완료 | exit_type: clear/escape/death |
| TEL-05 | 스파이크 | item_world_floor_clear | P0 | 구현 완료 | 지층별 클리어율 |
| TEL-06 | 전투 | player_death | P0 | 구현 완료 | 사망 히트맵 |
| TEL-07 | 세이브 | player_save | P0 | 구현 완료 | 세이브 포인트 발견/사용 추적 |
| TEL-08 | 세션 | game_loaded | P1 | 대기 | 로딩 시간 측정 |
| TEL-09 | 전투 | enemy_kill | P1 | 대기 | 적 처치 분포 |
| TEL-10 | 전투 | boss_fight | P1 | 대기 | 보스 난이도 검증 |
| TEL-11 | 진행 | item_drop | P1 | 대기 | 드랍 체감 분석 |
| TEL-12 | 진행 | item_equip | P1 | 대기 | 장비 교체 패턴 |
| TEL-13 | 진행 | item_level_up | P1 | 대기 | 아이템계 보상 체감 |
| TEL-14 | 진행 | gate_break | P1 | 대기 | 진행 페이싱 검증 |
| TEL-15 | 진행 | player_level_up | P2 | 대기 | 레벨 곡선 검증 |
| TEL-16 | 탐험 | room_enter | P2 | 대기 | 동선 히트맵 |
| TEL-17 | 탐험 | room_clear | P2 | 대기 | 방별 체류시간 |
| TEL-18 | 진행 | relic_acquire | P1 | 대기 | 능력 게이트 검증 |
| TEL-19 | UI | tutorial_step | P1 | 대기 | 튜토리얼 이탈 지점 |
| TEL-20 | UI | inventory_open | P2 | 대기 | 인벤토리 사용 빈도 |
| ~~TEL-21~~ | ~~세션~~ | ~~save_game~~ | ~~P2~~ | ~~TEL-07로 승격~~ | ~~TEL-07 player_save로 대체~~ |
| TEL-22 | 전환 | demo_complete | P2-Phase | 대기 | 데모 완주율 |
| TEL-23 | 전환 | steam_wishlist_click | P2-Phase | 대기 | 위시리스트 전환율 |
| TEL-23 | 바이럴 | share_url_create | P2-Phase | 대기 | URL 공유 바이럴 측정 |
| TEL-24 | 전환 | conversion_trigger_show | P2-Phase | 대기 | 전환 트리거 노출 횟수 |
| TEL-25 | 전환 | conversion_trigger_click | P2-Phase | 대기 | 전환 트리거 클릭률 |
| TEL-26 | 멀티 | party_join | P3-Phase | 대기 | 멀티플레이 참여율 |
| TEL-27 | 멀티 | party_complete | P3-Phase | 대기 | 파티 클리어율 |
| TEL-28 | 리텐션 | d1/d7/d30_return | P3-Phase | 대기 | 리텐션 곡선 |
| TEL-29 | 시스템 | innocent_tame | P3-Phase | 대기 | 이노센트 시스템 사용률 |
| TEL-30 | 경제 | trade_complete | P3-Phase | 대기 | 거래 활성도 |

---

## 0. 참고 자료 (References)

- KPI 분석: `Documents/Research/ECHORIS_KPI_CriticalAnalysis.md`
- 수익화 전략: `Documents/Design/Design_Monetization_Strategy.md`
- 작성 표준: `Documents/Terms/GDD_Writing_Rules.md`

---

## 1. 개요

### 1.1. 문서 목적

ECHORIS가 추적하는 모든 텔레메트리 이벤트, 발동 조건, 파라미터, 연결 KPI를 정의한다. Google Analytics 4(GA4) 커스텀 이벤트를 사용하며, 비용은 0원(GA4 무료 티어).

### 1.2. 스파이크 검증

> **1순위 KPI: 아이템계 재진입률 50%+.** 이 지표가 실패하면 다른 지표는 의미 없다. 모든 텔레메트리 설계는 이 숫자를 정확히 측정하는 데 우선순위를 둔다.

### 1.3. 아키텍처

```
게임 코드  -->  Analytics.ts (유틸 모듈)  -->  gtag() 글로벌  -->  GA4 클라우드
```

- `Analytics.ts`가 모든 `gtag('event', ...)` 호출을 래핑
- 디버그 모드(localhost): 실제 gtag 호출 대신 콘솔 로그 출력
- 개인정보 수집 없음. GA4 기본 `_ga` 쿠키 외 추가 쿠키 없음

---

## 2. Phase별 우선순위

| Phase | 이벤트 | 목적 |
| :--- | :--- | :--- |
| **P0 (현재)** | TEL-01 ~ TEL-07 | 스파이크 검증 + 세이브 발견율. "아이템계가 재미있는가? 세이브를 찾는가?" |
| P1 (데모 폴리싱) | TEL-08 ~ TEL-14, TEL-18, TEL-19 | 밸런스 + 진행도 조정 |
| P2 (알파) | TEL-15 ~ TEL-17, TEL-20 ~ TEL-25 | 전환 퍼널 + 리텐션 |
| P3 (베타 이후) | TEL-26 ~ TEL-30 | 멀티플레이 + 경제 |

---

## 3. P0 이벤트 상세 명세

### TEL-01: game_start

| 항목 | 값 |
| :--- | :--- |
| 발동 조건 | 게임 초기화 완료 (main.ts, 씬 push 이후) |
| 파라미터 | 없음 |
| GA4 이벤트명 | `game_start` |
| KPI | DAU / MAU 기준선 |

### TEL-02: session_end

| 항목 | 값 |
| :--- | :--- |
| 발동 조건 | `beforeunload` / `visibilitychange` (hidden) |
| 파라미터 | `playtime_sec` (정수, game_start 이후 초) |
| GA4 이벤트명 | `session_end` |
| KPI | 평균 세션 시간. 목표: 15분 이상 |
| 킬 메트릭 | 5분 미만 = 온보딩 실패 |

### TEL-03: item_world_enter

| 항목 | 값 |
| :--- | :--- |
| 발동 조건 | ItemWorldScene init (플레이어가 아이템계 진입) |
| 파라미터 | `count` (세션 내 누적, 1부터), `item_rarity` (Normal/Magic/Rare/Legendary/Ancient) |
| GA4 이벤트명 | `item_world_enter` |
| KPI | **재진입률 = count >= 2인 유저 / count >= 1인 유저. 목표: 50%+** |
| 킬 메트릭 | 30% 미만 = 스파이크 실패, 핵심 루프 재설계 |

### TEL-04: item_world_exit

| 항목 | 값 |
| :--- | :--- |
| 발동 조건 | exitItemWorld() 호출 시 |
| 파라미터 | `exit_type` (clear / escape / death), `floor` (도달한 지층 인덱스), `time_spent_sec` (아이템계 내 체류 초) |
| GA4 이벤트명 | `item_world_exit` |
| KPI | 클리어 vs 탈출 vs 사망 비율. 난이도 조정에 활용 |

### TEL-05: item_world_floor_clear

| 항목 | 값 |
| :--- | :--- |
| 발동 조건 | 보스 처치 후 포탈 생성 (지층 클리어) |
| 파라미터 | `floor` (지층 인덱스, 0부터), `item_rarity`, `time_spent_sec` |
| GA4 이벤트명 | `item_world_floor_clear` |
| KPI | 지층별 클리어율. 지층 간 이탈률 = 난이도 스파이크 |

### TEL-06: player_death

| 항목 | 값 |
| :--- | :--- |
| 발동 조건 | player.hp <= 0 (모든 원인) |
| 파라미터 | `area` (world / itemworld), `room_col`, `room_row`, `enemy_type` (마지막 피해원 또는 spike/drown) |
| GA4 이벤트명 | `player_death` |
| KPI | 사망 히트맵. 집중 지점 = 수정 필요한 난이도 스파이크 |

### TEL-07: player_save

| 항목 | 값 |
| :--- | :--- |
| 발동 조건 | 세이브 포인트에서 세이브 수행 (performSave 호출) |
| 파라미터 | `level_id` (세이브 포인트가 위치한 레벨), `playtime_sec` (세션 시작 이후 초) |
| GA4 이벤트명 | `player_save` |
| KPI | 세이브 발견율 = player_save 1회 이상인 유저 / game_start 유저. 목표 90%+ |
| 위험 지표 | player_death 후 player_save 없이 session_end = "세이브 못 찾고 이탈" |
| 코드 위치 | `LdtkWorldScene.ts` performSave() 내부, SaveManager.save() 직후 |

---

## 4. 재진입률 계산 (GA4 Explorations)

```
분자:   item_world_enter.count >= 2 인 고유 유저 수
분모:   item_world_enter.count >= 1 인 고유 유저 수
결과:   재진입률 (%)
```

GA4 Explorations > 퍼널 분석 사용:
- 1단계: `item_world_enter` (count = 1)
- 2단계: `item_world_enter` (count = 2)
- 퍼널 완주율 = 재진입률

---

## 5. 디버그 모드

`localhost` 또는 URL에 `?debug_analytics` 포함 시:
- 모든 이벤트가 `console.log`에 `[Analytics]` 접두사로 출력
- `gtag()`는 호출되지 않음 (프로덕션 데이터 오염 방지)

---

## 6. 개인정보 보호

- 게임 코드에서 개인식별정보(이름, 이메일, IP) 수집 없음
- GA4 기본: IP 익명화, `_ga` 쿠키로 세션 추적
- Phase 1에서는 커스텀 유저 ID 시스템 없음
- GDPR: 필요시 GA4 동의 배너 (Phase 2 이후)
