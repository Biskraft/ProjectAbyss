# B52 월건 (WallGun) — 벽·천장·직사·중

> 준거: `Task_Enemy_00_BehaviorCatalog.md` B52 · DEC-055(플래그십) · IMPL-23
> 상태: 미구현 · 우선순위: P2 (Phase E, 게이트)
> 거동: 크기 중 · 이동 벽·천장(부착 고정) · 위협 직사 (속성 무관)

## 거동 스펙
- 스탯밴드(Lv1, ATK23 균일): HP90 DEF4 / detect300 atkR220 spd0 cd1900
- FSM: 벽/천장 부착 고정 + 직사 사격(비전통 각도 → 사각 압박). (Sentry + 표면 부착 위치)
- **선결:** 벽/천장 마운트 포인트 보장.

## 속성 = 풀 레이어 (곱셈)
- 속성 무바인딩. 착탄 라이더 = 풀 속성. fluid 모듈.

## 데이터
- Content_Enemy.csv: `B52_WallGun,300,220,0,1900,0,surface,A-10,ranged,M,false` (Locomotion=surface)
- SpawnTable: `<family>,B52_WallGun,,2,99,<w>,1,1`

## 인수 기준
1. 벽/천장 부착 + 비전통 각도 직사 FSM 동작.
2. 사각 압박 성립(엄폐로 대응 가능).
3. 크기 M 스탯밴드.
