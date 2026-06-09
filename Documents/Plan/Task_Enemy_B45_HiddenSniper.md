# B45 잠복저격 (HiddenSniper) — 은신·직사·중

> 준거: `Task_Enemy_00_BehaviorCatalog.md` B45 · SYS-ENM-ARC §A-07/A-03a · DEC-052
> 상태: 미구현 · 우선순위: P2
> 거동: 크기 중 · 이동 은신 · 위협 직사(잠복 저격) (속성 무관)

## 거동 스펙
- 스탯밴드(Lv1, ATK23 균일): HP70 DEF3 / detect300 atkR280 spd40 cd2200
- FSM: 은신 유지 + 원거리 단발 저격(발사 시 노출 → 재은신). (Sentry 사격 + 은신 점멸)

## 속성 = 풀 레이어 (곱셈)
- 속성 무바인딩. 착탄 라이더 = 풀 속성. fluid 모듈.

## 데이터
- Content_Enemy.csv: `B45_HiddenSniper,300,280,40,2200,0,ground,A-07,ranged,M,false` (Locomotion=concealed)
- SpawnTable: `<family>,B45_HiddenSniper,,2,99,<w>,1,1`

## 인수 기준
1. 은신 + 단발 저격 + 발사 시 노출 FSM 동작.
2. 발사 텔레그래프로 회피 가능(화면 밖 금지).
3. 크기 M 스탯밴드.
