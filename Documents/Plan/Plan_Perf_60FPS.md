# Plan: 아이템계 60FPS 달성 — 최적화 로드맵

> **작성일:** 2026-05-25
> **트리거:** Abyssal Edge 이상 stratum 에서 60fps 미달 (사용자 보고)
> **목표:** Abyssal Edge 포함 모든 stratum 에서 60fps 안정
> **원칙:** 측정 → 가설 → 수정 → 측정. 측정 없는 최적화 금지.

---

## Phase 0 — 측정 인프라 (필수 선행, 6h)

| # | 항목 | 비용 | 효과 | 상태 |
|:---|:---|:---:|:---:|:---:|
| 0.1 | Frame timing breakdown (input/physics/AI/render 단계별 ms 5초 평균) | 3h | 어느 축이 비싼지 1초만에 판별 | [ ] |
| 0.2 | FPS HUD 확장 — 단계별 ms + draw call + sprite count | 2h | 측정 0 → 가시화 | [ ] |
| 0.3 | DevTools heap 스냅샷 가이드 + GC spike 기록 hook | 1h | GC pause 원인 판별 | [ ] |

**완료 기준:** Abyssal Edge 진입 시 `Render 8.2ms / Physics 5.4ms / AI 2.1ms / Fluid 14.3ms / Other 3.0ms` 같은 분해 표시.

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
| TBD | Abyssal Edge | TBD | (Phase 0 후) | 기준선 |

---

**SSoT:** 이 문서가 본 작업의 단일 진실 원천. 단계 완료 시 체크박스 + 측정값 기록.
