# B37 토템 (Totem) — 고정·소환·중

> 준거: `Task_Enemy_00_BehaviorCatalog.md` B37 · SYS-ENM-ARC §A-08 · `Task_Enemy_A08_Summoner.md` · DEC-052
> 상태: 미구현 · 우선순위: P2
> 거동: 크기 중 · 이동 고정 · 위협 소환 (속성 무관)

## 거동 스펙
- 스탯밴드(Lv1, ATK23 균일): HP110 DEF4 / detect280 atkR0 spd0 cd3200
- FSM: 이동 불가 + 주기 소환(스워머 방출) + 주변 버프. 우선 파괴 표적. (Conduit 고정 변형)
- EliteEligible=true.

## 속성 = 풀 레이어 (곱셈)
- 속성 무바인딩. 소환체 풀 속성 상속. fluid 모듈.

## 데이터
- Content_Enemy.csv: `B37_Totem,280,0,0,3200,0,ground,A-08,lieutenant,M,true` (Locomotion=stationary)
- SpawnTable: `<family>,B37_Totem,,2,99,<w>,1,1`

## 인수 기준
1. 고정 주기 소환 + 버프 FSM 동작(소환 상한).
2. 우선 파괴 표적 성립(파괴 시 소환 중단).
3. 소환체 풀 속성 상속.
