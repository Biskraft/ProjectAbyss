# B27 캐리어 (Carrier) — 공중·소환·중

> 준거: `Task_Enemy_00_BehaviorCatalog.md` B27 · SYS-ENM-ARC §A-08 · `Task_Enemy_A08_Summoner.md` · DEC-052
> 상태: 미구현 · 우선순위: P3
> 거동: 크기 중 · 이동 공중(부유) · 위협 소환 (속성 무관)

## 거동 스펙
- 스탯밴드(Lv1, ATK23 균일): HP100 DEF2 / detect260 atkR0 spd35 cd3000 (flying)
- FSM: 공중 부유 + 소형 비행체(B20 Flit) 방출, 후퇴. 우선 표적. (Conduit 소환 + 공중)

## 속성 = 풀 레이어 (곱셈)
- 속성 무바인딩. 소환체도 풀 속성 상속. fluid 모듈.

## 데이터
- Content_Enemy.csv: `B27_Carrier,260,0,35,3000,0,flying,A-08,lieutenant,M,true`
- SpawnTable: `<family>,B27_Carrier,,2,99,<w>,1,1`

## 인수 기준
1. 공중 소환·후퇴 FSM 동작(소환 상한).
2. 소환체가 풀 속성 상속.
3. "먼저 죽여라" 우선 표적 성립.
