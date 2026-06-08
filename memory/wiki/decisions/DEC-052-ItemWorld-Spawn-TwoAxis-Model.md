---
id: DEC-052
date: 2026-06-09
status: decided
---
# DEC-052: 아이템계 몬스터 스폰 2축 분리 모델

## 맥락
"아이템계 몬스터가 너무 적게/단조롭게 나온다" + "같은 NORMAL이라도 무기에 따라 다른 몬스터가 나오게" 요구. 현 `spawnForRoom`은 방당 단일 종 1픽(2~4마리)이라 밀도·다양성·정체성 모두 미달. D3 Greater Rift / D4 Pit·Monster Family / 로그라이크 전수조사로 산업 표준 해법 도출.

## 선택지
1. **단일 축(강도만 차등)** — 레어리티별 강도만 올림. 정체성 차별화 불가.
2. **2축 분리(강도 ⟂ 정체성)** — Diablo 계열 표준. 강도와 얼굴을 직교 분리.

## 결정
**2축 분리 채택.**
- **강도축(Intensity):** 레어리티 × 지층 → HP·ATK 배율, 마릿수 예산, 엘리트 밀도, 깊이 변조자.
- **정체성축(Identity):** 무기 기질(temperament) → 5 몬스터 권속(용광로/냉각/부식/방전/은닉). 무기 종류 → 기능 조성 편향.
- "같은 NORMAL 다른 몬스터" = 기질→권속 매핑(D4 지역→패밀리 모델). NORMAL forge 검 ≠ NORMAL shadow 검의 몬스터.
- 기존 5기질→fluid 바인딩(SYS-ENM-ARC §1.1)을 5권속으로 승격해 재사용.

## 영향
- SSoT: `Documents/Research/Research_ItemWorld_MonsterSpawn_Balancing.md` (RES-IWS-01).
- `ItemWorldEnemyEncounterRuntime.spawnForRoom`(M1-B 재작성), SpawnTable CSV 재구조, `StrataConfig`.
- 후속: [[DEC-053]] 중립 거동 분기, [[DEC-054]] 확장 천장, [[DEC-055]] 벽/천장 플래그십.
