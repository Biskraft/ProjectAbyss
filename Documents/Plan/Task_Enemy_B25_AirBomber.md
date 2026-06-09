# B25 에어바머 (AirBomber) — 공중·포물선·중

> 준거: `Task_Enemy_00_BehaviorCatalog.md` B25 · SYS-ENM-ARC §A-03b/A-05 · `Task_Enemy_A03b_Bombardier.md` · DEC-052
> 상태: 미구현 · 우선순위: P2
> 거동: 크기 중 · 이동 공중(부유) · 위협 포물선(투하) (속성 무관)

## 거동 스펙
- 스탯밴드(Lv1, ATK23 균일): HP90 DEF3 / detect260 atkR220 spd40 cd2200 (flying)
- FSM: 머리 위 부유 + 폭탄 투하(조준 마커) → 바닥 장판. (Lobber 아크 + 공중 투하)

## 속성 = 풀 레이어 (곱셈)
- 속성 무바인딩. 투하 장판 = 풀 속성. fluid 모듈.

## 데이터
- Content_Enemy.csv: `B25_AirBomber,260,220,40,2200,0,flying,A-03b,ranged,M,false`
- SpawnTable: `<family>,B25_AirBomber,,2,99,<w>,1,1`

## 인수 기준
1. 부유 + 조준 투하 FSM 동작.
2. 투하 장판이 풀 속성으로 갈림.
3. 크기 M 스탯밴드(공중 지역거부).
