# Plan: 아이템계 60FPS 달성 — 최적화 로드맵

> **작성일:** 2026-05-25
> **트리거:** Abyssal Edge 이상 stratum 에서 60fps 미달 (사용자 보고)
> **목표:** Abyssal Edge 포함 모든 stratum 에서 60fps 안정
> **원칙:** 측정 → 가설 → 수정 → 측정. 측정 없는 최적화 금지.

---

## Phase 0 — 측정 인프라 (필수 선행, 6h)

| # | 항목 | 비용 | 효과 | 상태 |
|:---|:---|:---:|:---:|:---:|
| 0.1 | Frame timing breakdown (PerfMonitor + Game.ts hook) | 3h | 어느 축이 비싼지 1초만에 판별 | [x] 2026-05-25 |
| 0.2 | FpsCounter 확장 — 단계별 ms 상위 6개 표시 | 2h | 측정 0 → 가시화 | [x] 2026-05-25 |
| 0.3 | GC spike hook (33ms+ 프레임 기록, 최근 5건 표시) | 1h | GC pause 원인 판별 | [x] 2026-05-25 |

**현재 측정 가능 단계** (Game.ts outer loop):
- `scene.update` — Scene update 전체 (entity AI / physics / fluid 통합)
- `scene.render` — Scene render 단계
- `renderer.bgRT` — backgroundContainer → backgroundRT
- `renderer.worldRT` — gameContainer → worldRT
- `renderer.draw` — 최종 stage → screen

**다음 단계:** Scene 내부 (fluid / physics / AI 분해) 측정은 Phase 1 진행 시 *해당 단계 시작 직전* ItemWorldScene 에 `PerfMonitor.begin('itemworld.fluid')` 등 추가.

**확인 방법:** `?debug` URL + `Shift+I` 토글. FPS HUD 좌상단에 `scene.update 14.32 ms` 형태로 표시.

---

## Phase 1 — 즉각 영향 (8-12h)

순서 보장 없음. Phase 0 데이터로 1순위 결정.

### 1.A AI / Entity
| # | 항목 | 비용 | 효과 | 상태 |
|:---|:---|:---:|:---:|:---:|
| 1.A.1 | Distance-based AI freeze — 화면 외 적 update 중단 | 3h | 중-큼 (적 많을수록 큼) | [ ] |
| 1.A.2 | AI tick distribution (round-robin frame 분산) | 4h | 동시 적 10+ 면 큼 | [ ] |
| 1.A.3 | Spawn budget hard cap (동시 활성 적 N) | 1h | 즉각 effective cap | [ ] |

### 1.B Rendering
| # | 항목 | 비용 | 효과 | 상태 |
|:---|:---|:---:|:---:|:---:|
| 1.B.1 | Frustum culling (화면 밖 `renderable=false`) | 4-6h | drawCall -20~40% | [ ] |
| 1.B.2 | Graphics `.clear()` 재사용 (매프레임 destroy 제거) | 2h | GC pressure ↓↓ | [ ] |
| 1.B.3 | Filter 풀스크린만 유지, entity 단위 제거 | 1-2h | filter 1개당 -5~15fps | [ ] |
| 1.B.4 | ~~GPU texture prewarm (bundle 한정)~~ — **2026-05-25 롤백**: bundle 텍스처는 부작용으로 blur (default scaleMode=linear), spike 효과 없음 (런타임 dynamic texture 가 원인) | 2h | 효과 0 + blur 부작용 | ~~롤백~~ |
| 1.B.5 | **Dynamic texture 진단 — generateTexture / RenderTexture / Filter target 호출 사이트 측정** | 3h | spike 원인 식별 | [ ] |
| 1.B.6 | Dynamic texture 즉시 GPU 업로드 (생성 직후 invisible 그리기 + scaleMode preserve) | 4h | spike 0 목표 | [ ] |

### 1.C Physics / Collision
| # | 항목 | 비용 | 효과 | 상태 |
|:---|:---|:---:|:---:|:---:|
| 1.C.1 | Broad-phase grid (spatial hash) 적용 여부 확인 + 누락 시 추가 | 8-12h | 적/투사체 20+ 면 큼 | [ ] |
| 1.C.2 | Sleeping body — 정지 breakable/decor 충돌 skip | 3h | 중간 | [ ] |
| 1.C.3 | Tile collision row mask 캐시 | 3h | tile heavy 시 중간 | [ ] |

---

## Phase 2 — Fluid 시스템 LOD (10-14h)

Abyssal Edge 가 fluid heavy 라면 결정적.

| # | 항목 | 비용 | 효과 | 상태 |
|:---|:---|:---:|:---:|:---:|
| 2.1 | Fluid 셀 거리 기반 update rate 차등 (full / 1/2 / 1/4 frame) | 6h | fluid CPU -40~60% | [ ] |
| 2.2 | Fluid 입자 ParticleContainer 전환 | 4h | particle 1000+ 시 큼 | [ ] |
| 2.3 | Fluid 셀 화면 밖 시뮬 정지 (boundary 1셀만 active) | 3h | 큼 | [ ] |
| 2.4 | Fluid Graphics 재사용 (per-frame redraw 단일 Graphics) | 2h | GC ↓ | [ ] |

---

## Phase 3 — 메모리/GC (5-8h)

| # | 항목 | 비용 | 효과 | 상태 |
|:---|:---|:---:|:---:|:---:|
| 3.1 | Hot path per-frame allocation 제거 ({x,y} obj, slice, Map.entries) | 6h | GC pause -50%+ | [ ] |
| 3.2 | Object pool — 투사체/VFX/damage number | 5h | GC spike 제거 | [ ] |
| 3.3 | Array reuse (length=0 vs `[]`) hot path 만 | 2h | 작음 | [ ] |

---

## Phase 4 — 타일/배경 (8h)

| # | 항목 | 비용 | 효과 | 상태 |
|:---|:---|:---:|:---:|:---:|
| 4.1 | Tilemap chunking — 화면 밖 chunk container hide | 3-4h | 타일 그리기 ms ↓ | [ ] |
| 4.2 | Static 배경 RenderTexture 캐싱 | 4h | 매프레임 redraw 제거 | [ ] |
| 4.3 | LDtk 비활성 stratum layer detach | 2h | scene graph 가벼움 | [ ] |

---

## Phase 5 — 자산 (선택, 8-10h)

| # | 항목 | 비용 | 효과 | 상태 |
|:---|:---|:---:|:---:|:---:|
| 5.1 | Texture compression (BasisU/KTX2) | 8h + pipeline | VRAM 80% ↓, iGPU 큼 | [ ] |
| 5.2 | Texture atlas 통합 (무기 + 적) | 6-10h | drawCall -40~60% | [ ] |
| 5.3 | Mipmap off for pixel-art | 30min | VRAM 절약 | [ ] |

---

## 실행 순서

1. **Phase 0 전체** — 측정 인프라
2. Phase 0 결과로 *가장 비싼 단계* 확정
3. 그 단계의 Phase 1 또는 Phase 2 우선 실행
4. 60fps 달성 시점에서 stop (over-engineering 방지)
5. 미달이면 다음 가설로

## 안티패턴 점검 (즉시 확인)

- [ ] `Container.removeChildren()` 매프레임 호출 (→ children 풀)
- [ ] `new Text()` 매프레임 (→ dirty flag)
- [ ] entity 단위 Filter (→ 풀스크린 통합)
- [ ] LDtk worldLayer 전부 활성 (→ 현재 stratum 외 detach)

## 측정 기준선 기록

| 일자 | 위치 | FPS | 단계별 ms | 비고 |
|:-----|:----|:----|:---------|:-----|
| 2026-05-25 | Abyssal Edge | <60 | (미측정) | 사용자 보고 |
| 2026-05-25 | Abyssal Phantom | 50 | worldRT 3.88 / update 1.67 / draw 0.6 | 평균은 정상, spike (51-135ms) 가 fps 저하 원인 |
| 2026-05-25 | Abyssal Phantom (post-instrument) | 50 | worldRT 3.33 / update 1.27 | dynamic texture (genTexture/rtCreate/poolGet) 모두 0 — PIXI 내부 또는 JS GC 가 원인 |
| 2026-05-25 | DevTools Perf 30s | — | heap 188→317MB | leak 의심 + Scripting 37%. 큰 GC pause 가 spike 야기 가설. |

## 진단 결론 (2026-05-25 세션)

1. **dynamic texture 생성 spike 아님** — `gpu.genTexture / gpu.rtCreate / gpu.poolGet` 모두 0
2. **메모리 누수 + GC pressure 의심** — heap +129MB / 30s, Scripting 37%
3. **다음 결정적 측정**: DevTools Memory Heap snapshot 2회 비교 → top 증가 객체 타입 식별

## 재개 시 시작점

- Heap snapshot 비교 → leak source 객체 타입 식별
- 또는 Phase 2 (Fluid LOD) 직접 진행 — Graphics churn 의심 1순위
- 또는 Phase 3 (GC alloc 제거) 의심 hot path grep + fix

---

**SSoT:** 이 문서가 본 작업의 단일 진실 원천. 단계 완료 시 체크박스 + 측정값 기록.
