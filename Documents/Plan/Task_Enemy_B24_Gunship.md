# B24 건쉽 (Gunship) — 공중·직사·대

> 준거: `Task_Enemy_00_BehaviorCatalog.md` B24 · SYS-ENM-ARC §A-05 · DEC-052/054
> 상태: 미구현 · 우선순위: P1 (코너링불가 하이브리드)
> 거동: 크기 대 · 이동 공중(부유) · 위협 직사 (속성 무관)

## 거동 스펙
- 스탯밴드(Lv1, ATK23 균일): HP130 DEF4 / detect320 atkR260 spd35 cd2000 (flying)
- FSM: 높은 고도 부유 + 장사거리 직사. 대형·고HP·느린 이동. **코너링 불가**(높이로 사각 강제 → 엄폐/원거리 대응 강제). (대형 AirGunner)
- EliteEligible=true.

## 속성 = 풀 레이어 (곱셈)
- 속성 무바인딩. fluid 모듈.

## 데이터
- Content_Enemy.csv: `B24_Gunship,320,260,35,2000,0,flying,A-05,ranged,L,true`
- SpawnTable: `<family>,B24_Gunship,,2,99,<w>,1,1`

## 인수 기준
1. 고고도 부유 + 장사거리 직사 FSM 동작.
2. 높이로 인한 사각/코너링불가 압박 성립(엄폐 대응 가능).
3. 크기 L 스탯밴드.
