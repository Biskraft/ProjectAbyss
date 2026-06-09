# B39 에미터 (Emitter) — 고정·봉쇄·중

> 준거: `Task_Enemy_00_BehaviorCatalog.md` B39 · SYS-ENM-ARC §A-10 · DEC-052/053
> 상태: 미구현 · 우선순위: P1
> 거동: 크기 중 · 이동 고정 · 위협 봉쇄(주변 방출) (속성 무관)

## 거동 스펙
- 스탯밴드(Lv1, ATK23 균일): HP120 DEF5 / detect260 atkR48 spd0 cd1500
- FSM: 이동 불가 + 주변에 지속 fluid 방출(주변 장판 유지). 위치 압박. (Sentinel + 잔류 라이더)

## 속성 = 풀 레이어 (곱셈)
- 속성 무바인딩. 방출 장판 = 풀 속성(spark=water 충전 위치퍼즐 §2.11.4). fluid 모듈 필수.

## 데이터
- Content_Enemy.csv: `B39_Emitter,260,48,0,1500,0,ground,A-10,ranged,M,false` (Locomotion=stationary)
- SpawnTable: `<family>,B39_Emitter,,2,99,<w>,1,1`

## 인수 기준
1. 고정 주변 방출 FSM 동작.
2. 방출 장판이 풀 속성으로 갈림(위치 압박).
3. 파괴 시 방출 중단.
