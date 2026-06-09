# B35 벙커 (Bunker) — 고정·방어·중

> 준거: `Task_Enemy_00_BehaviorCatalog.md` B35 · SYS-ENM-ARC §A-04/A-10 · DEC-052
> 상태: 미구현 · 우선순위: P3
> 거동: 크기 중 · 이동 고정 · 위협 방어(거점 차단) (속성 무관)

## 거동 스펙
- 스탯밴드(Lv1, ATK23 균일): HP200 DEF10 / detect160 atkR22 spd0 cd1800
- FSM: 이동 불가 + 통로/거점 정면 차단(고DEF, 주기 반격). (Bulwark 고정 변형)
- EliteEligible=true.

## 속성 = 풀 레이어 (곱셈)
- 속성 무바인딩. fluid 모듈(반격 시 분출 등).

## 데이터
- Content_Enemy.csv: `B35_Bunker,160,22,0,1800,0,ground,A-04,bruiser,M,true` (Locomotion=stationary)
- SpawnTable: `<family>,B35_Bunker,,2,99,<w>,1,1`

## 인수 기준
1. 고정 정면 차단 + 주기 반격 FSM 동작.
2. 우회/후방 경로로 무력화 가능(영구 차단 아님).
3. 크기 M 스탯밴드.
