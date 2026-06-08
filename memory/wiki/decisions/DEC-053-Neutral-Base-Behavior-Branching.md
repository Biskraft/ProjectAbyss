---
id: DEC-053
date: 2026-06-09
status: decided
---
# DEC-053: 중립 베이스 권속별 거동 분기

## 맥락
13종 적을 5권속×4기능군 그리드에 배치하니 코어 충족에 신규 6종 필요. 중립 베이스(Slime·Skeleton·MawDrone)를 어떻게 다권속화할지 — 속성 틴트 리스킨 vs 거동 분기.

## 선택지
1. **속성 틴트 리스킨** — 색만 바꿈. 저비용, 변별 약함("같은 슬라임").
2. **권속별 거동 분기** — fluid 모듈로 잔류/접촉/처치 효과 분기. 베이스 FSM 공유.

## 결정
**거동 분기 채택(사용자 결정).** 베이스 이동·공격 FSM은 공유하되, fluid 속성이 잔류물/접촉/처치 효과를 분기(rust=산 웅덩이 DoT, iron=서리 둔화, shadow=기름 슬릭, spark=전하 연쇄, forge=화상). 화학 반응 매트릭스(`Design_ChemicalReactions_FullMatrix.md`) 재사용 → 신규 AI 골격 불요.

## 영향
- **필수 신규 종 6 → 1.** Slime이 빈 Swarmer 3칸, Skeleton이 빈 Bruiser 2칸을 거동 분기로 충족. rust Ranged(Spitter) 1종만 필수 신규로 남음. 나머지(Arcling·Dynamo·Slickling·Tarbrute)는 선택 시그니처로 격하.
- 스폰 시스템: 권속 슬롯을 `베이스 + 권속 fluid 모듈`로 인스턴스화.
- 상위: [[DEC-052]].
