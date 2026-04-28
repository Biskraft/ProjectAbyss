# 체력 회복 시스템 (Healing & Recovery System)

## 구현 현황 (Implementation Status)

> **최근 업데이트:** 2026-04-13
> **문서 상태:** Draft
> **리서치:** `Research/HealingSystem_Recovery_Research.md` (9개 게임 분석, 복합 모델 도출)
> **기둥:** 야리코미 (주), 탐험 (부)
> **HUD 기획:** `UI/UI_Healing_HUD.md` (HP bar, Flask 아이콘, 피격/회복 연출)

| 기능 ID | 분류 | 기능명 | 우선순위 | 구현 상태 | 비고 |
|:---|:---|:---|:---:|:---|:---|
| HEL-01 | Flask | Echo Flask 리필식 회복 | P0 | ✅ 구현 | R키, 600ms 캐스트, 피격 취소 자비 규칙, 레어리티별 차등 충전 |
| ~~HEL-02~~ | ~~전투 연동~~ | ~~삭제. 흡혈 메커닉은 ECHORIS 톤(대장간/단조)과 부정합~~ | ~~---~~ | ~~삭제~~ | |
| HEL-03 | 체크포인트 | 보스 클리어 시 부분 회복 | P0 | ✅ 구현 | HP 30% 회복 + HUD 금색 플래시 |
| HEL-04 | 세이브포인트 | 세이브 시 전회복 + Flask 리필 | P0 | ✅ 구현 | performSave()에서 HP=maxHp, Flask=max |
| HEL-05 | 소모품 | 적 드랍 즉시 회복 아이템 | P1 | ✅ 구현 | 3등급: Ember Shard(10%HP,20%), Forge Ember(25%HP,50%), Anvil Flame(50%HP,보스100%) |
| HEL-06 | 탐험 보상 | HealthShard 최대HP 영구 증가 | P1 | ✅ 구현 | game/src/entities/HealthShard.ts |
| HEL-07 | 기억 단편 | 회복형 기억 단편 패시브 | P2 | ⬜ 제작 필요 | 스파이크 직결 |
| HEL-08 | Flask 확장 | HealthShard로 Flask 최대 충전 증가 | P2 | ⬜ 제작 필요 | |
| HEL-09 | HUD | Flask 아이콘 + HP 연출 (잔상/플래시) | P0 | ✅ 구현 | UI_Healing_HUD.md 참조. HUD.ts 리팩토링 완료 |

---

## 0. 설계 원칙

### 0.1. 설계 의도

> "때릴수록 단조열이 상처를 녹인다. 대장간에 돌아오면 불이 모든 것을 되돌린다."

회복은 **전투 참여**와 **세이브포인트 귀환**이라는 두 가지 핵심 행동을 강화해야 한다. 별도 파밍이 필요한 소모품 의존 모델은 기피한다 (Bloodborne Blood Vial 파밍 문제 회피).

### 0.2. 핵심 결정

| 결정 | 근거 | 레퍼런스 |
|:---|:---|:---|
| Flask + 소모품 + 기억 단편 (전투 연동 삭제) | 흡혈 메커닉은 대장간/단조 톤과 부정합. Flask가 유일한 능동 회복 → 한 방울이 무거움 | Dark Souls Estus + Dead Cells Flask |
| Flask 리필식 (파밍 불가) | 자원 관리가 "다음 지층 갈까?" 의사결정의 핵심 | Dark Souls Estus |
| 지층 간 자동 회복 없음 | "남은 자원으로 버틸 수 있나?" = 탈출 판단과 직결 | Disgaea 아이템계 |
| 레어리티별 Flask 차등 | 난이도 스케일링의 핵심 레버 | Dead Cells Boss Cell |
| 회복 취약 시간 존재 | 안전한 타이밍 판단 = 스킬 테스트 | Hollow Knight Focus, Dark Souls Estus |

---

## 1. 회복 계층 구조

4개 계층. 위로 갈수록 안정적, 아래로 갈수록 조건부.

| 계층 | 방식 | 적용 공간 | Phase |
|:---|:---|:---|:---|
| **1차: Echo Flask** | 세이브포인트에서 N회 충전. 사용 시 취약 시간 | 월드 + 아이템계 | P0 |
| **2차: 소모품 드랍** | 적 처치 시 HealingPickup 확률 드랍 | 월드 + 아이템계 | P1 |
| **3차: 기억 단편 패시브** | 회복형 기억 단편가 조건부 자동 회복 | 아이템계 (파밍 보상) | P2 |

---

## 2. 1차: Echo Flask

### 2.1. 기본 규칙

| 항목 | 값 |
|:---|:---|
| 이름 | Echo Flask (에코 플라스크) |
| 충전 장소 | 세이브포인트(대장간)에서 전량 충전 |
| 기본 충전 수 | 3회 |
| 회복량 | 최대 HP의 40% |
| 사용 키 | R키 (KeyR, InputManager FLASK 액션) |
| 취약 시간 | 0.6초 (모션 시작부터 회복 적용까지) |
| 사용 중 이동 | 불가. 제자리 고정 |
| 사용 중 피격 | 모션 취소. Flask 소모 안 됨 (자비 규칙) |
| HUD 표시 | 화면 좌상단, HP bar(80x6) 아래 Flask 원형 아이콘 x 남은 수 (UI_Healing_HUD.md) |

### 2.2. 취약 시간 타임라인

```
t=0ms      t=200ms         t=600ms
 |           |                |
 v           v                v
[사용 입력] [모션 시작]     [HP 회복 적용 + 모션 종료]
            (에코 발광)     (단조 불꽃 파티클)
            이동 불가       이동 가능 복귀
```

- 피격 시 t=0-600ms 사이 어디서든 모션 취소 + Flask 미소모
- 이 자비 규칙은 "Flask를 쓰려다 맞으면 억울하다"를 방지
- 대신 HP 회복도 안 됨 → 안전한 타이밍 찾기 = 스킬

### 2.3. 아이템계 레어리티별 Flask 차등

아이템계 진입 시 Flask가 초기 충전됨. 레어리티가 높을수록 Flask 감소.

| 아이템 레어리티 | Flask 초기 충전 | 지층 수 | Flask/지층 비율 |
|:---|:---:|:---:|:---|
| Normal | 5회 | 2 | 2.5 (넉넉) |
| Magic | 4회 | 3 | 1.3 |
| Rare | 3회 | 3 | 1.0 |
| Legendary | 2회 | 4 | 0.5 (타이트) |
| Ancient | 1회 | 4+ | 0.25 (극한) |

> **난이도 스케일링:** Flask 감소가 Dead Cells의 Boss Cell과 동일한 역할. 높은 레어리티는 전투 연동 회복과 기억 단편 의존도가 올라감.

### 2.4. Flask 확장 (P2)

- HealthShard 특정 개수 수집 시 Flask 최대 충전 +1 (Elden Ring Golden Seed 모델)
- 최대 확장: +3 (기본 3 + 확장 3 = 6)
- 아이템계 초기 충전은 레어리티별 고정 (확장 미적용). 월드에서만 확장 효과

---

## 3. 보스 클리어 회복

| 항목 | 값 |
|:---|:---|
| 트리거 | 보스 처치 완료 |
| 회복량 | 최대 HP의 30% |
| Flask 리필 | 없음 |

보스 클리어 = 지층 클리어의 체크포인트. HP 부분 회복으로 "다음 지층 도전" 판단에 여유를 줌. Flask는 리필 안 되므로 "HP는 있지만 Flask가 없다 → 다음 지층이 위험" 상황 유지.

---

## 4. 소모품 드랍 (P1)

### 4.1. 기본 규칙

현재 구현된 `HealingPickup`을 확장.

| 등급 | 이름 | 회복량 | 드랍 확률 | 비고 |
|:---|:---|:---|:---|:---|
| 소 | Ember Shard | 최대 HP의 10% | 적 처치 시 20% | 현재 HealingPickup(30HP) 대체 |
| 중 | Forge Ember | 최대 HP의 25% | 엘리트(GoldenMonster) 처치 시 50% | Treasure 방 보상 |
| 대 | Anvil Flame | 최대 HP의 50% | 보스 드랍 100% (1회) | 보스 클리어 보너스와 별개 |

### 4.2. Rest 방 회복

현재 구현: Rest 방에 HealingPickup 1-2개 배치. 이것이 소모품 드랍 계층의 일부.

---

## 5. 기억 단편 패시브 회복 (P2)

### 5.1. 회복형 기억 단편

기억 단편 슬롯에 회복형 기억 단편를 장착하면 조건부 자동 회복.

| 기억 단편 | 트리거 | 효과 | 야생/복종 |
|:---|:---|:---|:---|
| **Mender (수선공)** | 방 클리어 시 | HP 5% 회복 | 야생 3% / 복종 5% |
| **Reaper (수확자)** | 적 처치 시 | HP 1% 회복 | 야생 0.5% / 복종 1% |
| **Anvil Spirit (모루의 혼)** | Flask 사용 시 | Flask 회복량 +15% | 야생 +8% / 복종 +15% |

### 5.2. 스파이크 정합

> "아이템에 들어가면, 그 아이템의 기억이 던전이 된다"

회복형 기억 단편는 아이템계에서만 획득 가능. 더 좋은 회복 기억 단편 = 더 깊은 지층 도전 가능 = 아이템계 재진입 동기. "아이템 속에 들어가야 하는 이유"가 하나 더 생긴다.

---

## 6. 공간별 회복 규칙 요약

### 6.1. 월드

| 시점 | 회복 수단 |
|:---|:---|
| 탐험 중 | Flask 사용, 소모품 드랍 |
| 세이브포인트 도달 | **HP 전회복 + Flask 전량 리필** |
| 숨겨진 벽 뒤 | HealingPickup (탐험 보상) |
| HealthShard 발견 | 최대 HP +10 영구 증가 (현재 구현 완료) |

### 6.2. 아이템계

| 시점 | 회복 수단 |
|:---|:---|
| 진입 시 | Flask 충전 (레어리티별 차등) |
| 전투 중 | Flask 사용 |
| 적 처치 | 소모품 드랍 (확률), 기억 단편 Reaper (P2) |
| 방 클리어 | 기억 단편 Mender (P2) |
| **지층 전환** | **회복 없음** (디스가이아 모델) |
| 보스 클리어 | HP 30% 회복 + Anvil Flame 드랍 |
| 탈출 제단 | 회복 없음. 현재 HP로 귀환 |

### 6.3. 핵심 의사결정 흐름

```
지층 N 클리어:
  HP 30% 회복 → 현재 HP 확인 → Flask 잔여 확인

  IF HP 높음 + Flask 남음:
    → "다음 지층 도전" (계속)

  IF HP 낮음 + Flask 남음:
    → "Flask 쓰고 도전" (Flask 소모)

  IF HP 낮음 + Flask 0:
    → "탈출 제단으로 귀환" (안전) 또는 "소모품 드랍에 기대고 도전" (모험)
```

이 의사결정이 **매 지층 전환마다 발생**하는 것이 핵심. Flask가 줄어들수록 판단이 긴박해진다.

---

## 7. 파라미터 정의

```yaml
# Echo Flask
flask_base_charges: 3               # 기본 충전 수
flask_max_expansion: 3              # HealthShard로 최대 확장
flask_heal_percent: 0.40            # 최대 HP의 40% 회복
flask_cast_time_ms: 600             # 취약 시간
flask_cancel_on_hit: true           # 피격 시 모션 취소, Flask 미소모

# 아이템계 Flask 초기 충전
flask_charges_normal: 5
flask_charges_magic: 4
flask_charges_rare: 3
flask_charges_legendary: 2
flask_charges_ancient: 1

# 보스 클리어 회복
boss_clear_heal_percent: 0.30       # 최대 HP의 30% 회복

# 소모품 드랍
drop_ember_shard_percent: 0.10      # 소 회복 (HP 10%)
drop_ember_shard_chance: 0.20       # 적 처치 시 20%
drop_forge_ember_percent: 0.25      # 중 회복 (HP 25%)
drop_forge_ember_chance: 0.50       # 엘리트 처치 시 50%
drop_anvil_flame_percent: 0.50      # 대 회복 (HP 50%)
drop_anvil_flame_chance: 1.00       # 보스 드랍 100%
```

---

## 8. 구현 순서

| 순위 | 항목 | 상태 | 근거 |
|:---|:---|:---|:---|
| 1 | Echo Flask (충전/사용/리필) | ✅ 완료 | Player.ts: R키, 600ms, 자비 규칙 |
| 2 | 세이브포인트 전회복 + Flask 리필 | ✅ 완료 | LdtkWorldScene.performSave() |
| 3 | 보스 클리어 HP 30% | ✅ 완료 | ItemWorldScene 보스 처치 블록 |
| 4 | 아이템계 레어리티별 Flask 차등 | ✅ 완료 | FLASK_BY_RARITY: N=5, M=4, R=3, L=2, A=1 |
| 5 | HUD Flask 아이콘 + HP 연출 | ✅ 완료 | HUD.ts 리팩토링 (잔상/플래시/vignette) |
| 6 | 소모품 드랍 3등급 | ✅ 완료 | Ember Shard/Forge Ember/Anvil Flame + tier별 시각 차별화 |
| 7 | 기억 단편 패시브 회복 | ⬜ P2 | Phase 2 기억 단편 시스템 동시 |

---

## 9. 참고 문서

- `Research/HealingSystem_Recovery_Research.md` - 9개 게임 분석 원본
- `UI/UI_Healing_HUD.md` - HP bar, Flask 아이콘, 피격/회복 연출 HUD 기획서
- `System_Combat_Action.md` - 콤보 시스템 (전투 연동 트리거)
- `System_Combat_Damage.md` - 데미지/HP 공식
- `System_Memory Shard_Core.md` - 기억 단편 시스템 (회복형 기억 단편 Phase 2)
- `System_ItemWorld_Core.md` - 아이템계 지층 규칙 (층간 회복 없음)
- `System_Equipment_Rarity.md` - 레어리티별 Flask 차등 근거
- `Design_Combat_Philosophy.md` - "단조 타격감" 테마

### 구현 파일 참조

| 파일 | 관련 기능 |
|:---|:---|
| `game/src/entities/Player.ts` | Flask 캐스트 (FLASK_CAST_MS, flaskCharges, 자비 규칙) |
| `game/src/ui/HUD.ts` | HP bar 80x6, Flask 아이콘, 잔상/플래시/vignette |
| `game/src/core/InputManager.ts` | FLASK = KeyR 바인딩 |
| `game/src/scenes/ItemWorldScene.ts` | 보스 힐 30%, 레어리티별 Flask 차등, Rest방 HealingPickup |
| `game/src/scenes/LdtkWorldScene.ts` | performSave() 전회복 + Flask 리필 |
| `game/src/entities/HealthShard.ts` | 최대HP 영구 증가 |
| `game/src/entities/HealingPickup.ts` | 소모품 회복 엔티티 (3등급 확장 대기) |
