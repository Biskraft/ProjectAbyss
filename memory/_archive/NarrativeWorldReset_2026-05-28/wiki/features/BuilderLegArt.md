---
feature: GiantBuilder Leg Art Pipeline
status: in-progress
last_updated: 2026-05-09
---
# Giant Builder 다리 아트 파이프라인 개발 히스토리

## 개요
거대 빌더(`GiantBuilder` + `LegRig`)의 다리 시각 시스템을 Pixi `Graphics` 도형 렌더에서 Aseprite 슬라이스 기반 스프라이트 아틀라스로 전환. ASE 슬라이스의 pivot이 곧 스프라이트 anchor가 되는 art-centered convention 단일화.

## 타임라인

| 날짜 | 커밋 | 작업 |
|---|---|---|
| 2026-05-08 22:19 | c272ae8c | builder leg atlas — ASE-driven NineSlice 파이프라인 (시도) |
| 2026-05-08 22:23 | 9b1e5953 | NineSlice 폐기 → single-sprite + swap 전환 (refactor) |
| 2026-05-08 22:30 | 66d72823 | LegRig → 스프라이트 아틀라스 (Graphics 렌더러 폐기) |
| 2026-05-08 22:33 | 88ed3c5b | atlas JSON 로드 — PIXI Spritesheet wrap 우회 |
| 2026-05-08 22:44~23:01 | 03cdb033 / 21eaa12c / b88716d8 / 96ec54dc | 디버그 로그 / 슬라이스 복원 / 관절·발 legScale 비례 |
| 2026-05-08 22:48 | 2fd03174 | limb 스프라이트 스케일 — 렌더링 거리 사용 (IK 길이 폐기) |
| 2026-05-08 23:09 | e6bfa28a | 균일 legScale 폐기 → 풀 스프라이트 girth 복원 (revert) |
| 2026-05-08 23:16 | 9e1116bf | 빌더 레그 스프라이트 앵커 = Aseprite slice pivot |
| 2026-05-08 23:24 | a6021007 | slice-pivot 경로 폐기 → art-centered convention 단일화 (revert) |
| 2026-05-08 23:28 | a148b1d0 | auto-named slice 이름 변경 + slice-rename helper |
| 2026-05-08 23:33 | 70bde1b4 | limb 스케일 = 실제 슬라이스 높이 (DEFAULT_*_LEN 상수 폐기) |
| 2026-05-08 23:40 | f8d207b1 | limb 회전 부호 — 수평 미러링 버그 해소 |
| 2026-05-08 23:43 | 30bd20da | LegRig 첫 프레임 진단 로그 제거 |
| 2026-05-09 00:10 | aa56eca6 | LegMount.mirror → sprite x-flip 전파 |
| 2026-05-09 00:13 | b94c69ad | builder_leg ase 재익스포트 + atlas 정리 |
| 2026-05-09 00:37 | 256aaff4 | 발 스프라이트 — 다리보다 한 단계 더 미러링 |
| 2026-05-09 00:44 | 78b74945 | LegMount.mirror x-flip 시 발 skip — 스트라이드 방향 유지 |
| 2026-05-09 00:56 | d1b1d795 | 발 회전이 lower limb 따라가도록 — hinge kink 해소 |
| 2026-05-09 01:46 | 03a454ce | LegRig/LandingDust/GiantBuilder 보강 + ase 재익스포트 |

## 현재 상태
- **Pixi Graphics 도형 렌더러 → 스프라이트 아틀라스 전환 완료**
- 앵커 = Aseprite slice pivot 단일 convention
- limb 길이/스케일 = 실제 슬라이스 높이 기반 (상수 의존 폐기)
- 발 미러링·회전·스트라이드 방향 정합성 확보

## 관련 파일
- `game/src/entities/LegRig.ts` — IK + 스프라이트 마운트
- `game/src/entities/GiantBuilder.ts` — LegRig 호스트
- `game/src/effects/LandingDust.ts` — 착지 더스트
- `game/public/assets/atlas/builder_leg_01.ase` — Aseprite 원본 (slice 정의)
- `game/public/assets/atlas/builder_leg_01_atlas.json` / `.png` — ase-watch 자동 익스포트 (`reference_ase_watch.md`)

## 핵심 디자인 결정
1. **Graphics 도형 폐기, ASE 스프라이트 채택** — 메가스트럭처 단조 톤 시각화에 도형 도면은 한계
2. **Anchor = Aseprite slice pivot** — 아트 측이 단일 SSoT, 코드의 const 좌표 의존 폐기
3. **limb 스케일 = 슬라이스 높이** — DEFAULT_*_LEN 상수 의존 폐기
4. **NineSlice 거부** — 다리 굵기는 슬라이스 풀 width 유지(`girth 복원`)
5. **발은 별도 미러 규칙** — `LegMount.mirror` x-flip 시 skip + 한 단계 추가 미러링 (스트라이드 방향 보존)

## 잔여
- 발/관절 디테일 마무리
- 라이브 시각 검증 (이번 배포 03a454ce 라이브 반영 확인 필요)
