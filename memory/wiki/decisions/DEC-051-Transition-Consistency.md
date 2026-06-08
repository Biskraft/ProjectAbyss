---
id: DEC-051
date: 2026-06-06
status: decided
renumbered_from: DEC-048
---
# DEC-051: 화면 전환 정합성 — TransitionDirector 단일 권위 전면 교체

> **번호 재배정 (2026-06-09):** 구 `DEC-048`. DEC-048 번호가 세계 진실 삼각측량 결정(`DEC-048-World-Truth-Triangulation`)과 충돌하여 본 전환 결정을 **DEC-051**로 이동. 내용·날짜 불변.

## 맥락
화면 전환이 깜빡이거나 타일이 점멸하는 문제. 코드 실측 결과 전환이 30+ 파일로 파편화 — `WorldEdgeTransitionRuntime` ↔ `stepLegacyWorldTransition` 중복, 커버 소유자 3종(`fadeOverlay`/`TransitionOverlay`/스냅샷 RenderTexture) 부모·z 제각각, 로드 직후 검증 프레임 부재로 카메라 lerp가 reveal 첫 프레임에 이전 위치를 그림.

## 결정
- **TransitionDirector 단일 권위로 전면 교체** (점진 흡수 아님). 모든 C2·C3는 Director 단일 경로.
- **전환 3분류:** C1 오버레이(배경 rebuild 금지) / C2 콘텐츠 스왑(단색 알파 커버) / C3 스냅샷 전환(RenderTexture + 크로스페이드). 한 전환 = 정확히 한 분류, 커버 혼용 금지.
- **3단계 계약:** COVER(out, alpha 0→1, 콘텐츠 불변) → SWAP(alpha==1에서만 파괴·생성·카메라 즉시 스냅 + 검증 프레임 1장) → REVEAL(in). SWAP은 alpha==1에서만, REVEAL은 검증 프레임 후에만.
- **불변 규칙 R1–R9** — 단일 권위/최상단 단일 커버 레이어/alpha==1 스왑/검증 프레임/C1 rebuild 금지/커버 단일/색 의미 고정/전구간 입력·AI 정지/duration 토큰화.
- **색 의미:** black=중립 이동·씬 교체·**사망 리스폰** / white=서사 단절(말소·다이브·각성) / rarity=아이템계 포탈. 사망 리스폰은 black (비서사이므로 white와 분리).
- **C3 복귀 크로스페이드 강제** (퀄리티 우선). 프레이밍 일치해도 하드 스왑 금지.

## 영향
- SSoT 문서 = `Documents/Plan/Spec/Spec_ScreenTransition_Consistency.md` (PLN-XSITION).
- 통합 대상: `WorldEdgeTransitionRuntime`, `stepLegacyWorldTransition`(제거), `TransitionOverlay`, 스냅샷 계열(Growth/Frozen), 프롤로그 컷신, `*FlowRuntime` 다수 → Director 호출로 축소.
- 구현은 별도 Task. 단계 커밋(Director 골격 → C2 흡수 → C3 흡수 → 레거시 제거).
