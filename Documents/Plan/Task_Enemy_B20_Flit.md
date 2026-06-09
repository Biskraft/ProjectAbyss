# B20 플릿 (Flit) — 공중·근접·소

> 준거: `Task_Enemy_00_BehaviorCatalog.md` B20 · SYS-ENM-ARC §A-05 · `Task_Enemy_A05_Flier.md` · DEC-052
> 상태: 미구현 · 우선순위: P2
> 거동: 크기 소 · 이동 공중(기동) · 위협 근접 (속성 무관)

## 거동 스펙
- 스탯밴드(Lv1, ATK23 균일): HP40 DEF1 / detect180 atkR18 spd58 cd1000 (flying)
- FSM: 빠른 부유 위빙 + 약근접 접촉. 소형·다수 공중 견제. (SparkBat 호버 + 소형)

## 속성 = 풀 레이어 (곱셈)
- 속성 무바인딩. 접촉/사망 라이더 = 풀 속성. fluid 모듈.

## 데이터
- Content_Enemy.csv: `B20_Flit,180,18,58,1000,0,flying,A-05,swarmer,S,false`
- SpawnTable: `<family>,B20_Flit,,1,99,<w>,2,4`

## 인수 기준
1. 부유 위빙·약근접 FSM 동작.
2. 풀 속성 곱셈 적용.
3. 크기 S 스탯밴드(공중 다수 견제).
