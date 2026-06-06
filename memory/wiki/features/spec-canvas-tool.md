---
feature: Spec Canvas (스펙 로드맵 툴)
status: in-progress
last_updated: 2026-06-05
---
# Spec Canvas 개발 히스토리

## 개요
게임의 "플레이어 체험 단위"를 계층 트리로 시각화하는 내부 dev 툴. JointJS 방사형 마인드맵. 카드=문서가 아니라 게임 단위(예: slime), 스펙 문서/CSV는 SSoT 참조.

## 타임라인
| 날짜 | 작업 | 상세 |
|------|------|------|
| 2026-06-05 | 신규 | v1 캔버스(도형·이미지·연결·자동저장) → 트리 모델 전환 |
| 2026-06-05 | 데이터 | `hierarchy.json` 193노드 8 pillar(캐릭터/능력/월드/아이템계/아이템/거점·경제/서사/인터페이스). 무기 38·스킬 18 열거, 몬스터→아키타입(stats 추정) 중첩 |
| 2026-06-05 | 레이아웃 | 방사형 마인드맵(원형 노드·자동 RSTEP 비겹침·직선 연결·embedding 부모드래그=자식동반) |
| 2026-06-05 | LOD | 노드는 항상 렌더(끝단 유지), 라벨만 1→2→3 단계 추상화 |
| 2026-06-05 | 기능 | undo/redo(Ctrl+Z/Y), 접기/펼치기, 그리드 토글, 원거리 줌 |
| 2026-06-05 | 커밋 | e4c299a5 |

## 현재 상태
- 기능 동작·Playwright 검증 완료. 커밋됨(e4c299a5).
- **미완:** 몬스터→아키타입은 stats 기반 추정(`tag=추정`, 설계 확정 필요). `SPEC.md`가 구 평면-문서 모델 기준이라 stale(트리 모델로 갱신 필요). 메모리룸/샤드 leaf 미열거. 방어구/장신구 계획 슬롯(데이터 없음).
- **자동 정리 미구현:** 현재 `hierarchy.json`은 수동 편집. 스펙 문서 변경 시 자동 동기/정합성 검사 없음(다음 과제).

## 관련 파일
- `game/tools/spec-canvas/hierarchy.json` — 계층 트리 SSoT(수동)
- `game/tools/spec-canvas/spec-canvas.html` — JointJS 캔버스
- `game/tools/spec-canvas/server.mjs` — :4331 (`/hierarchy /board /patch`)
- `game/tools/spec-canvas/SPEC.md` — 도구 스펙(stale)
- 실행: `cd game && npm run spec-canvas`
