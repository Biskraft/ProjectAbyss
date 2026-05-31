# ECHORIS 스킬 시스템 상세 스펙 (Skill System Spec)

> **문서 ID:** PLN-SKILL
> **최근 업데이트:** 2026-05-31
> **상위:** PLN-SPEC §11. 근거: `Research/SkillSystem_ActionRPG_Research.md`, 신규 레퍼런스 조사(Hades/Dead Cells/Castlevania/Disgaea/HK/ARPG), 코드 감사.
> **수치 SSoT(예정):** `Sheets/Content_Skills.csv` (미생성 — 본 스펙으로 발주).

## 0. 다른 액션과의 경계 (코드 감사 확정)

스킬 4슬롯은 아래 고정 액션과 별개다. 혼동 금지.

| 액션 | 키 | 정체 | 스킬 슬롯? |
| :--- | :--- | :--- | :--- |
| 기본 공격 | 공격 | 자동 3타 콤보 (CD 없음) | 아니오 |
| 에고 샤드 Cast | V | 무기 내장 투척 투사체 (회수 가능, 원소 변형). Ego 무기 한정 | 아니오 (무기 내장) |
| 에코 플라스크 | R | 회복 (충전 소비) | 아니오 (고정 소비) |
| 원소 인챈트 | ↑+공격 | 무기 원소 전환 (화/빙/뇌/무) | 아니오 (무기 시스템) |
| 대시 | 대시 | 렐릭 이동기 | 아니오 (렐릭) |
| 스킬 | 슬롯 4 | 본 문서 | 예 |

> **자원 모델 확정:** 스킬은 쿨다운 전용. MP 없음(CLAUDE.md, DEC-002). `System_Combat_Action.md`의 "MP+쿨다운" 기술은 본 스펙으로 대체(MP 폐기). Ultimate(Slot D)만 hit-charge 자원.
> **스킬 트리 없음:** 4슬롯 고정, 트리 없음(DEC-002).

## 1. 4슬롯 정의

| 슬롯 | 명칭 | 역할 | CD 범위 | 스탯 축 | 결정 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| A | Protocol | 주 공격 확장 (기본공격이 못 하는 AoE/관통/폭발) | 5-10s | ATK 또는 INT | 어떤 딜 패턴 |
| B | Traverse | 기동/회피/위치 재설정 | 3-7s | ATK / 패시브 | 어떻게 움직이나 |
| C | Dampener | 제어/방어/디버프 | 8-14s | INT / HP | 어떻게 버티나 |
| D | Resonance | hit-charge 극대기 | 18s (충전 후) | ATK 또는 INT | 언제 터뜨리나 |

> **Slot D 충전:** 적 타격당 +12 charge(0-100). 만충 시 발동 가능, 전투 중 자연 감소 없음. 발동 후 0 리셋 + 18s 잠금. 무기별 charge 획득량은 공격 속도 보정 필요(Shiv 빠름/Cleaver 느림 — D-CHARGE).

## 2. 스킬 풀 (18종) — 1.0 전체

데모 8종은 ★. 데미지 스케일은 ATK/INT %. 원소 칸은 스킬 고유 원소(무기 인챈트와 별개).

### Slot A — Protocol (5종)

| # | 스킬 | 효과 | CD | 스케일 | 원소 | 무기 변형 | 축 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| A-1 ★ | Arc Pulse | 전방 선형 충격파 관통(최대 5연쇄), 공중 시 하방 낙뇌 | 6s | ATK 90% | 뇌 | Blade 수평/Chain 호/Emitter 3선형 | ATK |
| A-2 ★ | Burst Valve | 근거리 방사 화염 폭발 + Burn(3s) | 7s | ATK 120% +Burn | 화 | Cleaver 부채/Shiv 관통/Harpoon 원형 | 혼용 |
| A-3 ★ | Cryo Spike | 빙 스파이크 3연발, Freeze 35% | 8s | INT 95%×3 | 빙 | Railbow 직사/Emitter 확산/Cleaver 상향 | INT |
| A-4 | Phase Volley | 자동조준 5산탄 | 5s | ATK 55%×5 | 무 | Shiv 8발/Railbow 집탄/Chain 부채 | ATK |
| A-5 | Null Torrent | 채널 0.8s→연속 빔(이동 불가) | 10s | ATK 40%/f×8 | 무 | Emitter 범위2배/Railbow 사거리2배 | ATK |

### Slot B — Traverse (4종)

| # | 스킬 | 효과 | CD | 스케일 | 원소 | 무기 변형 | 축 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| B-1 ★ | Skid Protocol | 전방 슬라이드 돌진, 무적 10f, 착지 원소 퍼프 | 4s | ATK 80% | 인챈트 계승 | Shiv 2연/Chain 후방당김/Cleaver 충격파 | ATK |
| B-2 ★ | Anchor Drop | 하방 급강하 착지 충격파(공중 한정) | 5s | ATK 110% | 인챈트 계승 | Harpoon 창고정/Cleaver 반경2배 | ATK |
| B-3 | Echo Blink | 순간 텔레포트(180px) + 잔상 | 7s | — | 무 | Emitter 도착 폭발 INT80% | 이동 |
| B-4 | Recoil Step | 후방 역추진 + 전방 투사체 | 3s | ATK 70% | 무 | Railbow 관통3연/Harpoon 당김 | ATK |

### Slot C — Dampener (5종)

| # | 스킬 | 효과 | CD | 스케일 | 원소 | 무기 변형 | 축 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| C-1 ★ | Static Field | 주변 뇌 장판(반경80, 4s), Shock 이속-30% | 12s | INT 35%/s | 뇌 | Emitter 반경1.5배/Chain 당김 | INT |
| C-2 ★ | Frost Anchor | 전방 포획, 타격 시 Freeze 2s | 10s | INT 60% | 빙 | Harpoon 관통/Railbow 저격 | INT |
| C-3 ★ | Barrier Pulse | 전방 방벽 2.5s, 투사체 차단+흡수 회복 | 9s | — | 무 | Cleaver 근접 반사 | HP |
| C-4 | Ignition Trap | 바닥 화 트랩(8s), 밟으면 Burn+경직 | 14s | INT 30%/s | 화 | Shiv 3개/Cleaver 폭발1개 | INT |
| C-5 | Collapse Signal | 디버프 투사체, 방어-25%(8s)+독소 | 13s | ATK 40%/s | 무 | Emitter 관통 다중 | ATK |

### Slot D — Resonance (4종, hit-charge)

| # | 스킬 | 효과 | CD | 스케일 | 원소 | 무기 변형 | 축 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| D-1 ★ | Echo Cascade | 전방위 폭발파(반경200), 적당 6연타, 인챈트 원소 적용 | 18s | ATK 80%×6 | 인챈트 계승 | Blade 회전다단/Chain 범위1.5배 | ATK |
| D-2 ★ | Singularity Beam | 초장거리 수렴 레이저 1.5s, 과열 표식 | 18s | INT 200%+DoT | 화 | Emitter 너비2배/Railbow 선딜0 | INT |
| D-3 | Fracture Nova | 빙 전방위 파동(반경150), 전원 Freeze 3s + 즉시 Shatter | 18s | INT 150% | 빙 | Cleaver 반경2배/Harpoon 관통 | INT |
| D-4 | Overclock Surge | 10s 버프: 전 스킬 CD 0 리셋 + 이속+40%/공속+30%, 종료 시 HP15% 반환 | 18s | — | 뇌 | 전 무기 동일 | HP |

## 3. 무기 바인딩

같은 슬롯 스킬이 장착 무기 타입에 따라 AoE 패턴/거리를 바꾼다(Disgaea 무기 마스터리 모델). 7무기 × 18스킬 교차로 빌드 다양성을 지수 확장한다. 무기별 Slot A 권장: Blade→Arc Pulse, Cleaver→Burst Valve, Shiv→Phase Volley, Harpoon→Cryo Spike, Chain→Arc Pulse, Railbow→Null Torrent, Emitter→Cryo Spike/Singularity Beam.

## 4. 원소 연계

스킬 원소 + 무기 인챈트 원소가 다른 원소를 같은 적에 적용하면 원소 반응 발동(PLN-SPEC §12 / RES-REF-DIGEST §7.6: Melt/Overload/Shatter 3종). 셋업기(Cryo Spike/Frost Anchor/Ignition Trap)와 기폭기(Arc Pulse/Burst Valve/Echo Cascade)를 조합한다. ATK 전용 7종, INT 전용 6종, HP 2종, 혼용 3종으로 양 스탯 축 빌드를 보장.

## 5. 빌드 예시

| 빌드 | A/B/C/D | 스타일 |
| :--- | :--- | :--- |
| ATK 근접 | Phase Volley/Skid Protocol/Collapse Signal/Echo Cascade | 고속 다타격→기폭 |
| INT 원거리 | Cryo Spike/Echo Blink/Frost Anchor/Singularity Beam | Freeze→Shatter, 저격 |
| Fire 반응 | Burst Valve/Anchor Drop/Ignition Trap/Singularity Beam | Burn→Melt 체인 |
| 방어 | Arc Pulse/Recoil Step/Barrier Pulse/Overclock Surge | CD 리셋 생존 |

## 6. 획득 (스킬 트리 없음)

스킬은 트리 노드가 아니라 개별 해금. 권장 경로: 월드 발견(고정 배치 픽업) + 보스 처치 보상 + 아이템계 보상. 능력 게이트(렐릭)와 분리 — 스킬은 전투 깊이, 렐릭은 탐험 게이트. 슬롯당 3-5 선택지 중 4개 동시 장착, 세이브 포인트에서 교체.

## 7. 데모 / 1.0 분할

- 데모 8종(★): A-1/A-2/A-3, B-1/B-2, C-1/C-2/C-3, D-1/D-2 중 4슬롯 각 1-2. 원소 3종 + ATK/INT 양축 + 4슬롯 검증.
- 1.0 추가 10종: A-4/A-5, B-3/B-4, C-4/C-5, D-3/D-4. 채널링·산탄·디버프·CD리셋 등 리듬 다양화 + 파티 전용(Collapse Signal/Overclock Surge).

## 8. 미해결 결정

| ID | 항목 |
| :--- | :--- |
| D-CHARGE | Slot D hit-charge 무기별 보정(Shiv 빠름/Cleaver 느림 밸런스) |
| D-SKILLCSV | `Sheets/Content_Skills.csv` 18행 발주(CD/스케일/원소/무기변형 수치) |
| D-SKILLGET | 스킬 해금 배치(어느 보스/구역/아이템계) 구체화 |
| D-REACT | 원소 반응 트리거/증폭 판정 로직(스킬 원소 vs 인챈트 우선순위) |
