# B46 트랩레이어 (TrapLayer) — 은신·봉쇄·소

> 준거: `Task_Enemy_00_BehaviorCatalog.md` B46 · SYS-ENM-ARC §A-07 · DEC-052/053
> 상태: 미구현 · 우선순위: P2
> 거동: 크기 소 · 이동 은신 · 위협 봉쇄(함정 설치) (속성 무관)

## 거동 스펙
- 스탯밴드(Lv1, ATK23 균일): HP55 DEF2 / detect80 atkR0 spd45 cd2000
- FSM: 은신 이동 + 바닥에 fluid 함정 설치(밟으면 발동) 후 후퇴. (Ambusher + 잔류 트랩)

## 속성 = 풀 레이어 (곱셈)
- 속성 무바인딩. 함정 성격 = 풀 속성(산/기름/감전/결빙). fluid 모듈 필수.

## 데이터
- Content_Enemy.csv: `B46_TrapLayer,80,0,45,2000,0,ground,A-07,ranged,S,false` (Locomotion=concealed)
- SpawnTable: `<family>,B46_TrapLayer,,2,99,<w>,1,2`

## 인수 기준
1. 은신 + 함정 설치 + 후퇴 FSM 동작.
2. 함정 성격이 풀 속성으로 갈림.
3. 함정 시인성 보장(밟기 전 단서, 불공정 금지).
