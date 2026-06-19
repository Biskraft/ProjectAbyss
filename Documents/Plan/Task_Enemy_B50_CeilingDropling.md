# B50 천장드롭링 (CeilingDropling) — 벽·천장·근접·소

> 준거: `Task_Enemy_00_BehaviorCatalog.md` B50 · DEC-055(플래그십) · IMPL-23
> 상태: 미구현 · 우선순위: P1 (Phase E, 게이트, shadow 데뷔 권장)
> 거동: 크기 소 · 이동 벽·천장 · 위협 근접(낙하) (속성 무관)

## 거동 스펙
- 스탯밴드(Lv1, ATK23 균일): HP45 DEF1 / detect160 atkR18 spd40 cd1100
- FSM: 천장 부착 대기 → 플레이어 하방 진입 시 낙하 강습 → 지상 단거리 추격/재등반. (표면 모듈 IMPL-23)
- **선결:** 방 천장 행어 포인트 보장. shadow(은닉) 계열 데뷔 권장.

## 속성 = 풀 레이어 (곱셈)
- 속성 무바인딩. fluid 모듈.

## 데이터
- Content_Enemy.csv: `B50_CeilingDropling,160,18,40,1100,0,surface,A-07,ranged,S,false` (Locomotion=surface)
- SpawnTable: `<family>,B50_CeilingDropling,,2,99,<w>,2,3`

## 인수 기준
1. 천장 대기 + 낙하 강습 FSM 동작.
2. 낙하 전 표식/사전 모션(화면 밖·무경고 금지, §1.3).
3. 크기 S 스탯밴드(수직 압박).
