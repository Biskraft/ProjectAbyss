---
feature: 아이템계 몬스터 스폰 & 밸런싱
status: planning
last_updated: 2026-06-09
---
# 아이템계 몬스터 스폰 & 밸런싱 개발 히스토리

## 개요
레어리티×무기 기질로 차등화되는 아이템계 몬스터 스폰·밸런싱 체계. 강도(레어리티) ⟂ 정체성(무기 기질→권속) 2축 분리. SSoT = `Documents/Research/Research_ItemWorld_MonsterSpawn_Balancing.md` (RES-IWS-01).

## 타임라인
| 날짜 | 작업 | 상세 |
|------|------|------|
| 2026-06-09 | 리서치 | D3 Rift·D4 Pit/Family·로그라이크 전수조사 → 2축 모델([[DEC-052]]) |
| 2026-06-09 | 설계 | 권속 그리드 13종 배치, 중립 거동 분기([[DEC-053]]), 확장 천장 25/40~48([[DEC-054]]), 벽/천장 플래그십([[DEC-055]]) |
| 2026-06-09 | Phase 0 | CSV 스키마 계약 확정 + `Content_Enemy.csv` 분류 칼럼 + `StrataConfig` BaseEnemyCount 적용 |

## 현재 상태
- **Phase 0 완료** — 스키마 계약 확정. 적용: `Content_Enemy.csv`(Role/IsNeutralBase/EliteEligible), `StrataConfig.csv`(BaseEnemyCount) + 파서. tsc/validate 통과.
- 적용분은 비파괴(칼럼 추가만, 소비 로직 미연결) → 현 빌드 정상.
- **다음(M1 슬라이스):** rust 권속 3종 제작 → 최소 역할 예산 스폰 → test map 경험 검증. 통과 시 2축 모델 확정.
- **M1-B 위험:** `spawnForRoom` 단일 종 1픽 → 예산 채우기 재작성.
- 실측 보정: Ghost=비행 A-03a(비행슈터 이미 존재, 구현 검증 필요), MawDrone=비행.

## 관련 파일
- `Documents/Research/Research_ItemWorld_MonsterSpawn_Balancing.md` — SSoT (RES-IWS-01)
- `Sheets/Content_Enemy.csv` — 적 분류(Role/Archetype/IsNeutralBase/EliteEligible)
- `Sheets/Content_ItemWorld_SpawnTable.csv` — 스폰 규칙(M1-B 재구조 예정)
- `Sheets/Content_StrataConfig.csv` + `game/src/data/StrataConfig.ts` — BaseEnemyCount 예산
- `game/src/scenes/itemworld/ItemWorldEnemyEncounterRuntime.ts` — spawnForRoom(M1-B 재작성)

## 2026-06-13 - Rarity target count enforcement
- Item World combat rooms now treat `BaseEnemyCount + EnemyCountBonus` as the target count of actual spawned enemies, not merely a cluster/spawn-attempt budget.
- `ItemWorldEnemyEncounterRuntime.spawnForRoom()` increments the filled count only after an enemy is actually spawned. Memory shard replacement spawns no longer consume monster count budget.
- Rarity density targets in `Sheets/Content_StrataConfig.csv`: normal 5, magic 6/7, rare 8/9/10, legendary 10/11/12/13, ancient 12/13/15/16.
- Prevention rule: if combat-room density feels wrong, first inspect actual spawned enemy count vs `StrataConfig` target before tuning `ClusterMin/ClusterMax` or spawn weights.
