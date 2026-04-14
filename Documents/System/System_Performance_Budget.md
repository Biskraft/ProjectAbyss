# 퍼포먼스 버짓 (Performance Budget)

## 구현 현황 (Implementation Status)

> 최근 업데이트: 2026-04-15
> 문서 상태: `작성 중 (Draft)`
> 2-Space: 전체
> 기둥: 전체

| 기능 ID | 분류 | 기능명 | 우선순위 | 구현 상태 | 비고 |
| :--- | :--- | :--- | :---: | :--- | :--- |
| PERF-01 | 프레임 버짓 | 프레임 타임 카테고리별 버짓 정의 | P0 | 완료 | 본 문서 |
| PERF-02 | 메모리 버짓 | 카테고리별 메모리 한도 정의 | P0 | 완료 | 본 문서 |
| PERF-03 | 렌더 버짓 | 드로우 콜 한도 정의 | P1 | 완료 | 본 문서 |
| PERF-04 | 네트워크 버짓 | WebSocket 메시지 크기/빈도 정의 | P1 | 대기 | Phase 3 |
| PERF-05 | 로드 타임 | 씬별 로드 시간 한도 정의 | P1 | 완료 | 본 문서 |
| PERF-06 | GC 버짓 | GC 히컵 허용 한도 정의 | P1 | 완료 | 본 문서 |
| PERF-07 | 오브젝트 풀링 | HitSpark/DamageNumber 풀링 구현 | P1 | 대기 | `HitSparkManager.ts` |
| PERF-08 | Ticker 상한 | maxFPS=60 설정 | P2 | 대기 | `Game.ts` |
| PERF-09 | 탭 복귀 리셋 | visibilitychange 누산기 리셋 | P2 | 대기 | `Game.ts` |
| PERF-10 | 프로파일 측정 | Chrome DevTools 기준 측정 절차 | P1 | 완료 | 본 문서 |

---

## 0. 필수 참고 자료 (Mandatory References)

* Writing Standards: `Documents/Terms/GDD_Writing_Rules.md`
* Project Vision: `Documents/Terms/Project_Vision_Abyss.md`
* 타격감 최적화 리서치: `Documents/Research/WebGameFeel_Optimization_Research.md`
* 타격 피드백 시스템: `Documents/System/System_Combat_HitFeedback.md`
* 게임 개요: `Reference/게임 기획 개요.md`

---

## 1. 개요 (Concept)

### 1.1. 설계 의도 (Design Intent)

> 퍼포먼스 버짓은 "게임이 느껴지는 방식"을 수치로 정의한 계약이다. 아이템계의 야리코미 파밍 루프는 수백 번의 전투가 연속으로 발생하며, 이때 단 한 번의 GC 히컵도 히트스탑 타이밍을 파괴한다. 버짓 초과는 기술 부채가 아닌 게임플레이 품질 저하이다.

이 문서가 정의하는 수치는 "초기 권장값(Initial Recommended)"이다. 실측 데이터 없이 하드코딩된 목표이며, Chrome DevTools 프로파일링 결과로 조정해야 한다. 수치 변경 권한은 기술 디렉터에게 있다.

### 1.2. 설계 근거 (Reasoning)

| 결정 | 이유 |
| :--- | :--- |
| 60fps 고정 타겟 | `FIXED_STEP = 1000/60`으로 하드코딩. 30fps 지원은 Phase 2 이후 결정 사항 |
| 16.67ms 프레임 버짓 | 60fps = 1프레임당 16.67ms. 히트스탑 1프레임 = 16.67ms이므로 초과 즉시 체감 |
| 네트워크 메인 스레드 처리 | Phase 1은 Worker 없음. WebSocket 이벤트를 메인 스레드에서 직접 처리 |
| 드로우 콜 50 이하 | 측정 데이터 없음. 웹 게임 성공 사례(Vampire Survivors 등) 리서치 기반 목표 |
| Graphics 배칭 불가 인지 | PixiJS v8에서 Graphics 객체는 배칭되지 않음. Phase 2 스프라이트 전환 시 자동 해소 |

### 1.3. 3대 기둥 정렬 (Pillar Alignment)

| 기둥 | 연관성 |
| :--- | :--- |
| 탐험 | 씬 전환 로드 타임이 버짓을 초과하면 탐험 흐름이 끊김 |
| 야리코미 | 연속 전투 중 GC 히컵은 히트스탑을 파괴하여 타격감을 소멸시킴 |
| 멀티플레이 | 네트워크 버짓 초과 시 동기화 지연으로 협동 전투가 불가능해짐 (Phase 3 적용) |

---

## 2. 프레임 타임 버짓 (Frame Time Budget)

### 2.1. 전체 프레임 타임 할당

타겟: 60fps = 프레임당 16.67ms

```yaml
frame_budget_initial_recommended:
  total_ms: 16.67        # 60fps 기준 1프레임
  gameplay_logic_ms: 4.0  # 게임 로직 (입력, 상태 업데이트, 충돌)
  rendering_ms: 6.0       # PixiJS 렌더 (스프라이트 배치, 씬 트리 순회)
  physics_ms: 2.0         # 물리 (AABB 충돌, 넉백 계산)
  ai_ms: 2.0              # 적 AI (패턴 결정, 패스파인딩)
  audio_ms: 0.5           # Howler.js AudioContext 스케줄링
  network_ms: 0.5         # WebSocket 메시지 처리 (메인 스레드)
  margin_ms: 1.67         # 예비 (GC minor, 브라우저 이벤트 큐)
```

| 카테고리 | 버짓 (ms) | 초과 시 영향 |
| :--- | :---: | :--- |
| Gameplay Logic | 4.0 | 입력 지연, 게임 상태 불일치 |
| Rendering | 6.0 | 프레임 드랍, 렌더 보간 오류 |
| Physics | 2.0 | 충돌 오류, 넉백 불규칙 |
| AI | 2.0 | 적 반응 지연, 패턴 스킵 |
| Audio | 0.5 | 히트 SFX 타이밍 이탈 |
| Network | 0.5 | 위치 동기화 지연 (Phase 3부터 측정) |
| Margin | 1.67 | GC minor 수용 범위 |
| 합계 | 16.67 | |

> 주의: 위 수치는 초기 권장값이다. 실제 구현 후 Chrome DevTools Performance 탭으로 각 카테고리의 실제 소요 시간을 측정하고 재조정해야 한다.

### 2.2. 히트스탑 연관 임계치

히트스탑은 게임 논리 스텝을 N프레임 건너뛰는 방식으로 구현된다. Gameplay Logic이 4.0ms를 초과하면 히트스탑 프레임 소진 속도가 불규칙해진다.

```yaml
hitstop_performance_thresholds:
  single_hit_frames: 3    # = 50ms at 60fps
  kill_bonus_frames: 5    # = 83ms at 60fps
  gc_minor_tolerance_ms: 2.0   # Minor GC가 이 값 이하여야 히트스탑 타이밍 유지
  gc_major_target: "발생 없음"  # Major GC는 히트스탑을 3프레임 이상 파괴
```

---

## 3. 메모리 버짓 (Memory Budget)

### 3.1. 카테고리별 메모리 한도

```yaml
memory_budget_initial_recommended:
  total_mb: 256          # 웹 브라우저 탭 1개 기준 목표 상한
  textures_mb: 80        # 스프라이트시트, 타일셋, UI 텍스처
  audio_mb: 40           # Howler.js 사전 로드 SFX/BGM 버퍼
  game_state_mb: 20      # 엔티티, 방 데이터, 인벤토리, 세이브 상태
  tilemap_mb: 30         # LDtk 레벨 데이터, 타일맵 렌더 버퍼
  ui_mb: 20              # PixiJS Text 캐시, UI 컨테이너
  pixi_internal_mb: 40   # PixiJS RenderTexture, WebGL 버퍼
  margin_mb: 26          # 예비 (GC 미수집 객체, 브라우저 오버헤드)
```

| 카테고리 | 버짓 (MB) | 비고 |
| :--- | :---: | :--- |
| Textures | 80 | Phase 2 스프라이트시트 통합 후 재측정 필요 |
| Audio | 40 | Howler.js 스프라이트 사전 로드 포함 |
| Game State | 20 | 아이템계 진입 시 방 데이터 추가 누적 주의 |
| Tilemap | 30 | LDtk 씬별 로드/언로드로 관리 |
| UI | 20 | DamageNumber Text 풀링 적용 시 절감 가능 |
| PixiJS Internal | 40 | worldRT RenderTexture 포함 |
| Margin | 26 | |
| 합계 | 256 | |

> 주의: 256MB는 2026년 기준 중급 사양 데스크톱 브라우저 탭의 초기 권장값이다. Chrome Task Manager(Shift+Esc)로 실측 후 조정한다.

### 3.2. 메모리 누수 감시 대상

아이템계는 씬 전환 없이 방을 교체하므로 아래 항목이 누적될 위험이 있다.

```yaml
leak_watch_targets:
  - target: "HitSpark Graphics 객체"
    risk: "spawn() 시 new Graphics() 생성 후 release 누락"
    detection: "Chrome DevTools Memory 탭 Heap Snapshot 비교"
    mitigation: "오브젝트 풀링 (PERF-07)"
  - target: "DamageNumber Text 객체"
    risk: "매 히트마다 new Text() 생성, 제거 누락"
    detection: "Heap Snapshot에서 Text 인스턴스 수 모니터링"
    mitigation: "DamageNumber 풀링 (PERF-07 연동)"
  - target: "방 전환 시 이전 방 컨테이너"
    risk: "씬 트리에서 제거했으나 참조가 남아 GC 불가"
    detection: "방 전환 10회 후 Heap Snapshot 비교"
    mitigation: "씬 전환 시 모든 자식 destroy({ children: true }) 호출"
  - target: "EventEmitter 리스너"
    risk: "씬 전환 시 이전 씬 리스너가 해제되지 않음"
    detection: "방 전환 후 리스너 카운트 로그 출력"
    mitigation: "씬 destroy 시 모든 removeListener 호출"
```

---

## 4. 렌더 버짓 (Render Budget)

### 4.1. 드로우 콜 한도

```yaml
draw_call_budget_initial_recommended:
  total_max: 50
  tilemap: 2          # @pixi/tilemap 배칭 (배경 + 전경 레이어)
  player: 1           # Phase 2 스프라이트시트 전환 후 1 드로우 콜
  enemies_max: 10     # 동시 최대 10마리 기준 (스프라이트시트 공유 시 1)
  hit_sparks: 8       # Graphics 객체, 배칭 불가. 헤비 히트 기준 최대 8개
  damage_numbers: 5   # Text 객체, 배칭 불가. 동시 최대 5개
  ui_hud: 8           # HP바, 깊이 게이지, 골드, 미니맵 등
  particles: 8        # 파티클 이펙트 (Phase 2 ParticleContainer 전환 후 절감)
  screen_effects: 4   # ScreenFlash, 비네트 등
  misc: 4             # 기타 (디버그 오버레이, 전환 이펙트)
```

> 현재 프로토타입 단계에서는 플레이어/적이 Graphics 기반이므로 드로우 콜이 버짓을 초과할 수 있다. Phase 2 스프라이트시트 전환 시 enemies + player 드로우 콜이 스프라이트시트 공유 기준 1-2로 감소한다.

### 4.2. 드로우 콜 측정 방법

Chrome DevTools 기준:

1. F12 → More Tools → Rendering → "Show FPS Meter" 활성화
2. PixiJS DevTools 확장 설치 후 Stats 패널에서 `drawCalls` 확인
3. 또는 `app.renderer.renderCount` 값을 인게임 디버그 오버레이에 출력

> 드로우 콜 50 이하는 리서치 기반 목표이며 실측 데이터가 없다. 첫 프로파일링 세션에서 기준값을 측정한 뒤 이 버짓을 갱신한다.

---

## 5. 로드 타임 버짓 (Load Time Budget)

### 5.1. 씬별 로드 시간 한도

```yaml
load_time_budget_initial_recommended:
  initial_boot_ms: 3000     # 첫 실행 (PixiJS 초기화 + 에셋 번들 로드)
  world_scene_transition_ms: 500   # 월드 구역 전환 (LDtk 레벨 파싱 + 타일맵 빌드)
  item_world_entry_ms: 800         # 아이템계 진입 (절차적 방 생성 + 에셋 세팅)
  item_world_floor_transition_ms: 400  # 아이템계 지층 전환
  save_load_ms: 200                # 세이브 포인트 저장/로드
```

| 씬/동작 | 버짓 (ms) | 비고 |
| :--- | :---: | :--- |
| 최초 부팅 | 3000 | Vite 번들 로드 포함. CDN 캐시 이후 1000ms 이하 목표 |
| 월드 구역 전환 | 500 | LDtk ldtk 파싱 + 타일맵 렌더 |
| 아이템계 진입 | 800 | 절차적 방 생성 비용 포함 |
| 아이템계 지층 전환 | 400 | 이미 로드된 에셋 재사용 |
| 세이브/로드 | 200 | localStorage 또는 서버 API 호출 |

### 5.2. 로드 타임 측정 방법

Chrome DevTools Performance 탭에서 씬 전환 트리거 시점부터 첫 프레임 렌더까지의 시간을 측정한다. 또는 씬 초기화 코드에 `performance.now()` 타임스탬프를 삽입해 측정한다.

---

## 6. GC 버짓 (Garbage Collection Budget)

### 6.1. GC 허용 한도

```yaml
gc_budget:
  minor_gc_max_ms: 2.0      # Scavenge (Young Generation). 이 값 이하면 히트스탑 무영향
  major_gc_target: "발생 없음"  # Mark-Sweep-Compact. 발생 시 히트스탑 3프레임 이상 파괴
  minor_gc_interval_target_s: 30  # 30초에 한 번 이하. 더 잦으면 풀링 범위 확대 필요
```

### 6.2. GC 주요 유발 원인 및 대응

| 유발 원인 | 예상 GC 주기 | 대응 |
| :--- | :--- | :--- |
| HitSpark `new Graphics()` per hit | 초당 10히트 기준 30초마다 Minor GC | 오브젝트 풀링 (PERF-07) |
| DamageNumber `new Text()` per hit | HitSpark와 동일 | DamageNumber 풀링 (PERF-07) |
| ItemDrop `new Sprite()` per drop | 방당 드롭 수에 비례 | ItemDrop 풀링 (Phase 2) |
| 씬 전환 시 대량 destroy() | 씬 전환마다 | destroy({ children: true })로 한 번에 처리 |

### 6.3. GC 측정 방법

Chrome DevTools → Performance 탭 → Record → 전투 30초 실행 → 타임라인 상단 "GC" 이벤트 확인.

- Minor GC: 2ms 이하가 목표
- Major GC: 타임라인에 보이면 즉시 원인 분석 필요

---

## 7. 네트워크 버짓 (Network Budget)

> Phase 1은 네트워크 없음. 아래 버짓은 Phase 3 멀티플레이 구현 시점에 활성화된다.

### 7.1. WebSocket 메시지 버짓

```yaml
network_budget_phase3_initial_recommended:
  position_sync_interval_ms: 50    # 20 ticks/s. 60fps 대비 3프레임마다 1회
  position_message_bytes: 32       # entityId(4) + x(4) + y(4) + vx(4) + vy(4) + state(4) + timestamp(8) = 32 bytes
  combat_event_bytes: 24           # attackerId(4) + targetId(4) + damage(4) + hitType(4) + timestamp(8) = 24 bytes
  max_messages_per_second: 200     # 플레이어 2인 기준 양방향 메시지 합계
  max_bandwidth_kbps: 50           # 2인 파티 기준 목표 대역폭
```

| 메시지 타입 | 크기 (bytes) | 빈도 | 비고 |
| :--- | :---: | :--- | :--- |
| Position Sync | 32 | 20/s | 메인 스레드에서 처리 |
| Combat Event | 24 | 히트 발생 시 | 히트스탑 타이밍 전송 포함 |
| Room State | 가변 | 방 진입 시 1회 | 전체 엔티티 초기 상태 |
| Heartbeat | 8 | 1/s | 연결 유지 확인 |

> Phase 3 구현 시 이 버짓을 기준으로 실측 후 조정한다.

---

## 8. 오브젝트 풀링 사양 (Object Pool Specification)

PERF-07의 구현 사양. 풀링 대상과 풀 크기를 여기서 정의한다.

```yaml
object_pool_spec:
  hit_spark_flash:
    pool_size: 8
    description: "중앙 플래시 Graphics 풀"
    reference: "HitSparkManager.ts FlashPool"
  hit_spark_line:
    pool_size: 56
    description: "라인 스파크 Graphics 풀. 헤비 히트 8개 x 최대 7세트"
    reference: "HitSparkManager.ts SparkPool"
  damage_number:
    pool_size: 32
    description: "데미지 숫자 Text 풀. PixiJS Text는 Canvas API 호출로 Graphics보다 무거움"
    reference: "DamageNumber.ts"
  item_drop:
    pool_size: 64
    description: "아이템 드롭 Sprite 풀 (Phase 2)"
    reference: "미구현"
  projectile:
    pool_size: 32
    description: "원거리 투사체 Entity 풀 (Phase 2)"
    reference: "미구현"
```

풀링 구현 규칙:

- `addChild`/`removeChild` 대신 `visible = true/false`로만 제어한다. 씬 트리 변경은 GPU 배치 재계산을 유발한다.
- 풀 객체는 게임 초기화 시 사전 할당한다(`create once, reuse many`).
- 풀이 고갈되면 가장 오래된 활성 객체를 강제 반납한다(LRU). 신규 객체를 생성하지 않는다.

---

## 9. 측정 절차 (Profiling Procedure)

### 9.1. 프레임 타임 측정

```
1. Chrome → F12 → Performance 탭
2. CPU throttling: 4x slowdown (저사양 시뮬레이션)
3. Record → 아이템계 전투 30초 (연속 공격, 다수 적 동시 교전)
4. 확인 항목:
   - 타임라인 상단 빨간 세로선 = 프레임 드랍 (16.67ms 초과)
   - "Scripting" 비율 (Gameplay Logic + AI 합계 vs 버짓 6.0ms)
   - "Rendering" 비율 vs 버짓 6.0ms
   - "GC" 이벤트 유무 및 소요 시간
```

### 9.2. 메모리 측정

```
1. Chrome → Shift+Esc → Task Manager → "Memory Footprint" 컬럼 확인
2. F12 → Memory 탭 → Heap Snapshot
3. 아이템계 10개 방 순환 후 Heap Snapshot 재측정
4. 비교: 방 순환 전후 Graphics/Text 인스턴스 수 증가 여부
```

### 9.3. 드로우 콜 측정

```
1. PixiJS DevTools 브라우저 확장 설치
2. 인게임 → Stats 패널 → "Draw Calls" 실시간 확인
3. 또는: 디버그 오버레이에 app.renderer.renderCount 출력
4. 측정 시점: 아이템계 전투 중 (최대 적 + 최대 파티클 동시 발생)
```

### 9.4. 측정 주기

| 시점 | 측정 항목 | 담당 |
| :--- | :--- | :--- |
| Phase 1 완료 시 | 프레임 타임 + 메모리 + 드로우 콜 전수 | 엔진 프로그래머 |
| 주요 기능 머지 후 | 해당 기능 관련 카테고리만 | 구현 담당자 |
| Phase 2 스프라이트 전환 후 | 드로우 콜 + 메모리 (텍스처) | 기술 아티스트 |
| Phase 3 멀티 구현 후 | 네트워크 버짓 전수 | 엔진 프로그래머 |

---

## 10. 버짓 초과 대응 체계 (Budget Violation Response)

### 10.1. 심각도 분류

| 심각도 | 기준 | 대응 |
| :--- | :--- | :--- |
| Critical | 프레임 타임 지속 초과 (>20ms) 또는 Major GC 발생 | 즉시 수정. 머지 차단 |
| High | 메모리 >256MB 또는 드로우 콜 >75 | 다음 스프린트 내 수정 |
| Medium | 개별 카테고리 버짓 20% 이상 초과 | 2스프린트 내 수정 계획 수립 |
| Low | 버짓 10-20% 초과 | 모니터링 유지, 추세 관찰 |

### 10.2. 버짓 수정 절차

버짓 수치는 이 문서에서만 관리한다 (SSoT). 수정 시:

1. 실측 데이터와 조정 이유를 비고에 기록한다.
2. `최근 업데이트` 날짜를 갱신한다.
3. 기술 디렉터 확인 후 반영한다.

---

## 11. 예외 처리 (Edge Cases)

| 상황 | 처리 방침 |
| :--- | :--- |
| 백그라운드 탭 복귀 | `visibilitychange` 이벤트에서 `accumulated = 0` 강제 리셋. 복귀 직후 누산 버스트 방지 (PERF-09) |
| 240Hz 모니터 | `maxFPS = 60`으로 제한 (PERF-08). 게임 로직이 60fps 고정이므로 240회 렌더는 낭비 |
| 60fps 이하 저사양 | `MAX_ACCUMULATED = FIXED_STEP * 5` 클램핑으로 최대 5프레임 캐치업 허용. 이 이상은 드랍으로 처리 |
| 풀 고갈 (Pool Exhaustion) | LRU 강제 반납. 신규 `new Graphics()` 생성 금지. 고갈 발생 시 풀 크기 재검토 |
| Phase 3 WebSocket 단절 | 메인 스레드 처리이므로 단절 이벤트가 게임 루프를 블로킹하지 않도록 비동기 처리 |
| Major GC 발생 | 타임라인에서 유발 원인 식별 → 해당 오브젝트 풀링 범위 확대 → 재측정 |
