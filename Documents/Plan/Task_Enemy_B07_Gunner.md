# B07 거너 (Gunner) — 지상·직사·중

> 준거: `Task_Enemy_00_BehaviorCatalog.md` B07 · SYS-ENM-ARC §A-03a · DEC-052
> 상태: 미구현 · 우선순위: **P0** (M1 슬라이스)
> 거동: 크기 중 · 이동 지상 · 위협 직사 (속성 무관)

## 거동 스펙
- 스탯밴드(Lv1, ATK23 균일): HP65 DEF3 / detect280 atkR200 spd30 cd1800
- FSM: 카이팅 직사 — 사거리 밖 접근, minRange 후퇴, 텔레그래프→직사. (Lobber 후퇴 패턴 재활용)
- 크기 M.

## 속성 = 풀 레이어 (곱셈)
- 속성 무바인딩. 풀이 Family→Fluid 적용: forge=화염거너 / rust=산거너(구 Spitter) / spark=전격거너 …
- fluid 라이더(Phase C)가 착탄 잔류/사망 곱셈.

## 데이터
- Content_Enemy.csv: `B07_Gunner,280,200,30,1800,0,ground,A-03a,ranged,M,false`
- SpawnTable: `<family>,B07_Gunner,,1,99,<w>,1,1`

## 인수 기준
1. 카이팅 직사 FSM 동작(접근 시 후퇴).
2. 풀 속성 곱셈 적용(forge/rust 자동).
3. 크기 M 스탯밴드 일치.
