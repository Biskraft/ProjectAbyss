# DEC-050 — 아이템계 미니맵 fog 재캐논화 (+ 데드셀 사실 정정)

> ⚠️ **SUPERSEDED (2026-06-08 후속):** "fog of war" 프레이밍을 폐기하고 월드·아이템계 미니맵을 **단일 통합 시스템**으로 확정. 최종 SSoT = `Documents/UI/UI_Minimap.md` (UI-07). 본 결정이 신설하기로 한 분리 문서 `Research_Metroidvania_MapFog.md`(삭제)·`System_ItemWorld_Minimap.md`(미생성)는 폐기. 진입-공개 메커니즘(UNDISCOVERED→VISITED)은 일반 미니맵 동작으로 유지. 아래 원문은 이력 보존용.

- **날짜:** 2026-06-08
- **상태:** SUPERSEDED (2026-06-08 단일 통합 확정) / 원: 확정 / 필러 해소(fog 게임 전체 통합 — 월드·아이템계 동일 모델)
- **영역:** UI / 아이템계 / 탐험
- **선행:** DEC-039(수직 딥 다이브 그래프), DEC-037(RoomGraph)

## 맥락

아이템계 미니맵 논의 중, 기존 캐논 `Research_Minimap_Systems.md`(2026-04-06)가 (a) **데드셀을 "Fog of War 없음·전체 공개"로 사실 오인**하고, 그 오인 위에 (b) "아이템계도 무안개·전체 공개" 결론을 박아둔 것을 발견. 웹 전수 검증 결과 데드셀 기본값은 **바이옴별 Fog of War**(전체 공개는 저사양 GPU 폴백). 메트로베니아 전반에서 *완전 무맵*은 희소하고 탐험-공개 안개가 표준.

## 결정

1. **데드셀 사실 정정:** "fog 없음" → "fog 기본값". `Research_Minimap_Systems.md` §1-4 정정.
2. **아이템계 무안개 결론 철회:** 동 문서 §3-6/§4 supersede(이력 보존).
3. **fog census + 5축 노브 분리 문서화:** 신규 `Research_Metroidvania_MapFog.md` (RES-MV-FOG-01) — 7군집 전수표 + 5축(공개트리거/입도/위치표시/갱신타이밍/오버레이) + 아이템계 매핑.
4. **아이템계 미니맵 스펙 신설:** 신규 `System_ItemWorld_Minimap.md` (SYS-IW-MM-01) — 5축을 결정 노브로 채택. RESEARCH_INDEX의 깨진 `System_UI_Minimap.md ✅` desync 정정.

## 해소 (2026-06-08)

- **필러 IWMM-01 해소:** 디렉터 결정 — fog of war를 게임 전체에 통합, **월드·아이템계 동일 모델**. A vs B/C 분기 폐기. 아이템계는 월드 fog 모델 상속, 유일한 차이=맵 수명(지층 전이 리셋, 절차 생성).
- SYS-IW-MM-01 §3 확정 구성 기입 완료. UI_Minimap.md·Task_UI_ItemWorldMinimap.md 동기화. 구현=`WorldMinimapRuntime` 공통화 권장.

## 근거 요지

- DEC-039 수직 critical path(DOWN)는 중력으로 자기정위 → 월드식 아틀라스 미니맵 불필요·정체성 충돌.
- 길찾기 가치는 LR 분기(보물·Archive)에만 발생 → 반복 파밍 가독화가 리듬 연료(저장 메모리 [[feedback_rhythm_over_grind]]).
- DEC-039 검증 #5(길 잃기 좌절 금지)와 정합.

## 연결

- RES-MV-FOG-01 · SYS-IW-MM-01 · DEC-039 · [[enemy-archetype]] 무관
