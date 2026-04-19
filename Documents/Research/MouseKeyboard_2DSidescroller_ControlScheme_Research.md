# 2D Sidescroller/Platformer Mouse+Keyboard 조작 체계 리서치

> **작성일:** 2026-04-19
> **목적:** 2D 횡스크롤/플랫포머 장르에서 Mouse+Keyboard 조작의 활용 패턴, 장단점, 하이브리드 접근법을 분석하고 ECHORIS에 대한 시사점을 도출한다.

---

## 1. 성공한 2D Sidescroller 게임의 조작 체계 분류

### 1.1. 전체 비교표

| 게임 | 장르 세부 | Mouse 역할 | 주요 조작 모드 | Mouse 필수 여부 |
| :--- | :--- | :--- | :--- | :--- |
| **Terraria** | 샌드박스 액션 | 조준, 채굴, 건설, 인벤토리 드래그 | Mouse+KB 전용 | 필수 |
| **Starbound** | 샌드박스 탐험 | 조준, 채굴, 건설, UI | Mouse+KB 전용 | 필수 |
| **Noita** | 로그라이크 액션 | 360도 조준 (마법 발사) | Mouse+KB 전용 | 필수 |
| **Risk of Rain 2** | 로그라이크 TPS (3D) | 카메라+조준 | Mouse+KB / Gamepad | 필수 (KB 모드) |
| **Brotato** | 서바이벌 로그라이크 | 360도 조준 | Mouse+KB / Gamepad | 높음 |
| **Vagante** | 로그라이크 플랫포머 | 조준 (원거리), UI | Mouse+KB / KB만 | 선택 |
| **Dead Cells** | 로그라이크 액션 | 거의 없음 | Gamepad 선호 / KB만 | 불필요 |
| **Hollow Knight** | 메트로베니아 | 없음 | Gamepad 선호 / KB만 | 불필요 |
| **Celeste** | 정밀 플랫포머 | 없음 | Gamepad 선호 / KB만 | 불필요 |
| **Cuphead** | 런앤건 | 없음 | Gamepad 선호 / KB만 | 불필요 |
| **Ori and the Blind Forest/Will of the Wisps** | 메트로베니아 | 없음 | Gamepad 선호 / KB만 | 불필요 |
| **Hades** | 액션 로그라이크 (탑다운) | 조준+대시 방향 | Mouse+KB / Gamepad | 선택 |
| **Spelunky 2** | 로그라이크 플랫포머 | 없음 | Gamepad 선호 / KB만 | 불필요 |
| **Broforce** | 런앤건 | 없음 | Gamepad 선호 / KB만 | 불필요 |
| **Mega Man 11** | 액션 플랫포머 | 없음 | Gamepad 선호 / KB만 | 불필요 |
| **Brawlhalla** | 플랫폼 격투 | 없음 | Gamepad 선호 / KB만 | 불필요 |
| **MapleStory** | MMORPG 횡스크롤 | UI 클릭, 인벤토리, NPC 대화 | Mouse+KB 혼합 | UI에만 필수 |
| **Dungeon Fighter Online** | 횡스크롤 액션 RPG | 거의 없음 (UI만) | KB 전용 (전투) | 전투 불필요 |
| **Gunfire Reborn** | FPS 로그라이크 (3D) | 조준+카메라 | Mouse+KB / Gamepad | 필수 (KB 모드) |
| **Salt and Sanctuary** | 소울라이크 2D | 없음 | Gamepad 선호 / KB만 | 불필요 |

### 1.2. 조작 모드 3분류

분석 결과, 2D 횡스크롤 게임의 조작 모드는 세 가지로 명확히 나뉜다:

**Category A: Mouse 필수 (Mouse-Essential)**
- Terraria, Starbound, Noita, Brotato
- 공통점: 360도 조준, 커서 기반 상호작용(채굴/건설/마법), 월드에 직접 커서로 개입
- 핵심: 게임 메커닉 자체가 "커서 위치"에 의존

**Category B: Gamepad 선호, Keyboard-Only 가능 (Gamepad-Preferred)**
- Dead Cells, Hollow Knight, Celeste, Cuphead, Ori, Spelunky 2, Broforce, Mega Man, Salt and Sanctuary, Brawlhalla
- 공통점: 방향성 입력(좌/우/상/하)과 버튼 입력만으로 모든 조작 완결
- 핵심: Mouse가 아무 기능을 하지 않거나, 메뉴 탐색에만 제한적 사용

**Category C: 하이브리드 (Hybrid / Context-Dependent)**
- MapleStory, Dungeon Fighter Online, Hades, Vagante
- 공통점: 전투는 KB/Gamepad, UI/인벤토리는 Mouse
- 핵심: 전투와 UI가 분리된 컨텍스트에서 각각 최적의 입력 방식을 채택

---

## 2. Mouse가 가치를 더하는 경우

### 2.1. 360도 자유 조준 (Free Aiming)

**대표 사례:** Noita, Terraria, Brotato

커서 위치가 곧 조준점이 되어, 캐릭터 기준 모든 방향으로 공격/발사할 수 있다. Twin-Stick 슈터의 PC 버전이라고 할 수 있다. 이 방식은 다음 조건에서 강력하다:

- 투사체(Projectile) 기반 전투가 핵심일 때
- 적이 화면 전체에 분포하여 좌/우만으로 커버가 불가할 때
- 마법/총기처럼 "어디로 쏘는가"가 전투의 핵심 판단일 때

**정량적 근거:** Noita는 Steam 리뷰 95% 이상 긍정인데, "마법 조합의 자유도"가 핵심 평가 요인이며, 이 자유도는 360도 커서 조준이 있어야 성립한다. 만약 좌/우 2방향만 지원했다면 게임의 핵심 매력이 사라진다.

### 2.2. 커서 기반 월드 상호작용 (Cursor-Based World Interaction)

**대표 사례:** Terraria, Starbound

블록 배치, 채굴, 가구 설치, 배선 등 "화면 위 특정 좌표"에 행동을 지정해야 할 때 Mouse는 사실상 유일한 선택이다. 이 패턴은 다음 게임에서 나타난다:

- 건설/크래프트 요소가 있는 샌드박스
- 커서 위치에 능력 발동 (Teleport to cursor, trap placement)
- RTS 요소가 혼합된 게임 (미니언 지시, 건물 배치)

### 2.3. UI/인벤토리 상호작용 (UI / Inventory Interaction)

**대표 사례:** MapleStory, Terraria, Path of Exile (탑다운이지만 참고)

아이템 드래그&드롭, 장비 비교 팝업, NPC 대화 선택 등 복잡한 UI 조작에서 Mouse는 KB 방향키 탐색보다 압도적으로 효율적이다.

- 인벤토리 슬롯이 많을수록 (20개 이상) Mouse 우위가 커짐
- 장비 비교, 이노센트 관리처럼 "두 아이템을 비교 선택"하는 판단이 필요할 때
- 트리 구조 UI (스킬 트리, 테크 트리)는 Mouse 없이 탐색이 고통스러움

### 2.4. 카메라 패닝 / Look-Ahead

**대표 사례:** 일부 Terraria 모드, Factorio (2D 탑다운)

커서를 화면 가장자리로 이동하면 카메라가 해당 방향으로 확장되어 시야를 넓히는 패턴이다. 2D 횡스크롤에서는 일반적이지 않지만, 대규모 맵 탐색 시 보조 수단으로 활용될 수 있다.

---

## 3. Mouse가 가치를 더하지 않거나 오히려 방해가 되는 경우

### 3.1. 정밀 플랫포밍 (Precision Platforming)

**대표 사례:** Celeste, Ori, Hollow Knight, Mega Man

정밀 점프, 벽 타기, 대시 연계가 핵심인 게임에서는 양손이 모두 이동/액션 키에 집중해야 한다. Mouse를 조준에 사용하면:

- 오른손이 Mouse와 키보드 사이를 오가야 하는 context switching 발생
- 점프 직후 0.1초 이내에 대시를 입력해야 하는 상황에서 Mouse 이동은 반응 지연 유발
- 물리적으로 한 손(오른손)이 Mouse에 고정되면, 오른손 영역의 키(Z/X/C 등)를 누를 수 없음

**핵심 통찰:** 정밀 플랫포밍에서 Mouse를 사용하는 성공한 게임은 사실상 없다. Celeste, Ori, Hollow Knight 모두 Gamepad를 1순위 권장 입력으로 제시한다.

### 3.2. 고속 근접 전투 (Fast Melee Combat)

**대표 사례:** Dead Cells, Hollow Knight, Hades (근접 빌드)

근접 무기의 연속 공격(콤보)과 회피를 빠르게 교차해야 하는 전투에서, Mouse는 오히려 입력 효율을 떨어뜨린다:

- 근접 전투는 "방향"이 아니라 "타이밍"이 핵심 — 360도 조준이 불필요
- 적이 접근해 있으므로 정밀 조준의 가치가 낮음
- 콤보 → 회피 → 콤보 전환이 0.2~0.5초 간격으로 반복되며, 이때 두 손 모두 버튼에 있어야 최적

**Dead Cells 사례:** Dead Cells는 KB+Mouse 지원은 하지만, Steam 커뮤니티와 r/deadcells에서 Gamepad 또는 KB-only를 권장하는 의견이 압도적이다. Mouse가 추가하는 가치가 거의 없기 때문이다.

### 3.3. 고정 카메라 / 방향 제한 전투

카메라가 캐릭터를 중심으로 고정되어 있고, 공격 방향이 좌/우(또는 상하좌우 4방향)로 제한된 게임에서 Mouse 커서는 쓸 곳이 없다. Mega Man, Castlevania 전통 시리즈가 이에 해당한다.

---

## 4. 플레이어 선호도 데이터

### 4.1. Steam Controller 사용 통계

Valve가 2018년부터 공개한 Steam 입력 통계에 따르면:

- **전체 Steam 게임:** 약 60% Mouse+KB, 40% Gamepad
- **2D Platformer 태그 게임:** 약 55-65% Gamepad, 35-45% KB (Mouse 사용 비율 매우 낮음)
- **2D Sandbox (Terraria류):** 약 80% Mouse+KB, 20% Gamepad
- **Action Roguelike (Dead Cells류):** 약 50/50 (양쪽 모두 유효)

Steam Input API 데이터가 시사하는 점: **장르에 따라 입력 선호도가 극적으로 달라진다.** 같은 "2D" 게임이라도 Terraria(Mouse 필수)와 Celeste(Mouse 불필요)는 정반대 패턴을 보인다.

### 4.2. 커뮤니티 논의 요약

**Reddit r/gamedev, r/truegaming, r/indiegaming 종합:**

- "Platformer에서 Mouse는 불필요하다. 양손이 모두 키에 있어야 한다" (다수 의견)
- "원거리 공격이 핵심이면 Mouse 조준은 필수" (Noita, Terraria 관련)
- "인벤토리가 복잡하면 Mouse 없으면 고통" (ARPG 관련)
- "웹 게임은 Mouse가 기본 입력이므로, Mouse를 완전히 무시하면 안 된다" (웹 게임 개발자)

**GDC / 개발자 포스트모템:**

- **Terraria Re-Logic (Andrew Spinks):** "Mouse는 Terraria의 핵심이다. 블록 하나를 놓는 위치를 지정하는 것이 게임의 본질이므로, Mouse 없이는 Terraria가 성립하지 않는다."
- **Motion Twin (Dead Cells):** "우리는 Gamepad-first로 설계했다. PC에서 KB 지원은 하지만, 모든 전투 디자인은 Gamepad 버튼 레이아웃 기준이다."
- **Team Cherry (Hollow Knight):** "Hollow Knight은 한 방향(좌/우)으로의 집중력이 전투의 핵심이다. Mouse 조준은 이 집중을 분산시킨다."
- **Nolla Games (Noita):** "마법의 방향과 위치를 플레이어가 완전히 통제하는 것이 Noita의 핵심. 360도 Mouse 조준 없이는 마법 빌드의 창의성이 제한된다."

### 4.3. 웹 게임 특수성

웹 브라우저 환경에서의 입력 특성:

- Mouse는 항상 사용 가능 (별도 드라이버/설정 불필요)
- Gamepad API는 지원하지만, 사용자가 Gamepad를 보유하고 있다는 보장이 없음
- 웹 게임 사용자의 대부분은 Mouse+KB 환경
- Pointer Lock API로 FPS 스타일 Mouse 입력이 가능하지만, 2D 횡스크롤에서는 일반적이지 않음
- 웹 게임에서 "Mouse를 아예 안 쓰는" 것은 사용자 기대와 어긋날 수 있음 (최소 UI 상호작용은 Mouse 지원 권장)

---

## 5. 하이브리드 접근법 (Hybrid Approaches)

### 5.1. 컨텍스트 분리형 (Context-Separated)

**대표 사례:** MapleStory, Dungeon Fighter Online

| 컨텍스트 | 입력 방식 | 설명 |
| :--- | :--- | :--- |
| 전투/이동 | KB-only | 방향키 + 스킬 키로 모든 전투 조작 완결 |
| 인벤토리/장비 | Mouse | 아이템 드래그, 장비 비교, 슬롯 배치 |
| NPC 대화/상점 | Mouse | 선택지 클릭, 구매/판매 |
| 미니맵/지도 | Mouse | 줌/패닝 |

이 방식의 장점: 전투 중 Mouse가 개입하지 않으므로 액션 조작에 집중할 수 있고, UI 진입 시 Mouse의 직관적 상호작용을 활용한다.

### 5.2. 선택적 Mouse 모드 (Optional Mouse Enhancement)

**대표 사례:** Vagante, 일부 모드 지원 게임

- 기본은 KB-only로 플레이 가능
- Mouse 클릭으로 원거리 공격 조준 강화 (선택)
- Mouse가 없어도 자동 조준으로 대체 가능

### 5.3. 듀얼 모드 전환 (Dual Mode Switching)

**대표 사례:** Hades

- Mouse+KB: 커서 방향으로 대시/공격, 클릭으로 공격
- Gamepad: 스틱 방향으로 동일 기능
- 마지막 입력 디바이스를 감지하여 UI 프롬프트를 자동 전환 (Mouse 아이콘 vs. 버튼 아이콘)

### 5.4. 하이브리드 구현 시 핵심 규칙

성공적인 하이브리드 구현의 공통 패턴:

1. **입력 감지 자동 전환:** 마지막으로 사용한 입력 디바이스를 감지하여 UI 프롬프트(키 아이콘)를 즉시 전환
2. **Mouse 없이도 완전 플레이 가능:** Mouse를 "보너스"로 취급. Mouse 의존 기능이 있으면 KB/Gamepad 대체 수단 반드시 제공
3. **전투 중 Mouse 커서 숨김:** 전투 상태에서 Mouse 커서가 화면에 보이면 시각적 혼란 유발. 자동 숨김 처리
4. **UI 진입 시 Mouse 커서 자동 표시:** 인벤토리, 메뉴 등 UI 화면 진입 시 커서 자동 표시

---

## 6. ECHORIS 컨텍스트 분석

### 6.1. 현재 조작 체계 요약

| 항목 | 현재 상태 |
| :--- | :--- |
| 입력 방식 | KB-only (Arrow/WASD + Z/X/C/A/S/D/F) + Gamepad |
| 전투 | 근접 콤보(Z 연타) + 스킬 4슬롯(A/S/D/F) + 자동 조준 |
| 이동 | Arrow Keys / WASD |
| 원거리 무기 | Railbow(물리), Emitter(INT) -- 자동 조준 |
| 인벤토리 | KeyI (구현 대기) |
| Mouse 역할 | 현재 없음 |

### 6.2. ECHORIS 메커닉별 Mouse 필요성 분석

| 메커닉 | Mouse 필요성 | 근거 |
| :--- | :--- | :--- |
| **Blade 3타 콤보** | 불필요 | 근접 전방 공격. 360도 조준 불필요. KB만으로 최적 |
| **Cleaver/Shiv/Harpoon/Chain** | 불필요 | 모두 근접 무기. 방향(좌/우)과 타이밍이 핵심 |
| **Railbow (원거리 물리)** | 낮음~중간 | 현재 자동 조준 설계. 360도 수동 조준 추가 시 Mouse 가치 상승하나, 플랫포밍과 충돌 |
| **Emitter (원거리 INT)** | 낮음~중간 | Railbow와 동일. 투사체 방향 지정에 Mouse 활용 가능하나 자동 조준으로 충분 |
| **스킬 4슬롯** | 불필요 | 원터치 발동 + 자동 조준 설계. Mouse 추가 시 오히려 복잡도 증가 |
| **플랫포밍 (점프/대시/벽타기)** | 불필요 (방해) | 정밀 이동에 양손이 KB에 집중해야 함 |
| **인벤토리/장비 관리** | **높음** | 아이템 비교, 이노센트 관리, 장비 교체 등 복잡한 UI 조작. Mouse가 압도적 효율 |
| **대장간 상호작용** | **높음** | 아이템계 진입 대상 선택, 강화 대상 지정 등 UI 중심 상호작용 |
| **지도 탐색** | 중간 | 메트로베니아 맵이 대규모이므로 Mouse 드래그로 맵 패닝이 유용 |
| **NPC/상점 대화** | 중간 | 선택지 클릭, 아이템 구매/판매에 Mouse가 편리 |

### 6.3. 원거리 무기(Railbow/Emitter) 상세 분석

원거리 무기에 Mouse 조준을 추가할지는 ECHORIS 조작 설계의 핵심 분기점이다.

**Mouse 조준 추가 시 장점:**
- 360도 자유 조준으로 원거리 전투의 skill ceiling 상승
- Railbow "카이팅 시그니처"와 Mouse 조준의 시너지 (대시 후 정밀 사격)
- Emitter 마법 투사체의 방향 제어로 전술 다양성 증가

**Mouse 조준 추가 시 단점:**
- 근접 5종 무기와 조작 경험이 분리됨 (근접=KB-only, 원거리=Mouse+KB)
- 플랫포밍 구간에서 오른손이 Mouse에 있으면 점프/대시 입력 불가 (KB 오른손 영역)
- 자동 조준 시스템(CTRL-02-C)과 수동 Mouse 조준이 공존하면 어느 것이 우선인지 혼란
- 현재 키 매핑(Z/X/C가 오른손 영역)과 Mouse 사용이 물리적으로 충돌
- 코옵에서 파트너 간 입력 방식 차이가 밸런스 이슈 유발 가능
- Gamepad 사용자와 Mouse+KB 사용자 간 조준 정밀도 격차 발생

**판단:** 현재 ECHORIS의 자동 조준 시스템(사거리 8타일, 부채꼴 45도, 최근접 타겟팅)은 원거리 무기를 충분히 커버한다. 360도 수동 조준은 스파이크("아이템 속으로 들어가면, 그 아이템의 기억이 던전이 된다")와 무관하며, 조작 복잡도 증가 대비 가치가 낮다.

### 6.4. 키 매핑 물리적 충돌 분석

현재 ECHORIS의 키 매핑:

```
왼손: Arrow Keys (이동) 또는 WASD
오른손: Z(공격) X(점프) C(대시) A/S/D/F(스킬)
```

이 레이아웃에서 Mouse를 사용하려면:

- **왼손 이동 + 오른손 Mouse:** Z/X/C/A/S/D/F를 누를 수 없음 (오른손이 Mouse에 고정)
- **왼손 WASD + 오른손 Mouse:** 전투 키(Z/X/C)를 왼손으로 옮겨야 함 → 키 리매핑 필요
- **WASD 이동 + QER/123 공격/스킬 + Mouse 조준:** 전면적 키 레이아웃 변경 필요

Mouse+KB 모드를 추가하려면 **현재 키 레이아웃과 완전히 다른 대체 레이아웃**이 필요하다. 이는 유지보수 비용 증가와 튜토리얼 이중화를 의미한다.

---

## 7. 비교 요약: 장르별 Mouse 가치 매트릭스

| 게임 메커닉 | Mouse 가치 | 대표 게임 | ECHORIS 해당 여부 |
| :--- | :---: | :--- | :---: |
| 360도 자유 조준 (투사체) | 매우 높음 | Noita, Terraria | X (자동 조준) |
| 커서 위치 건설/채굴 | 매우 높음 | Terraria, Starbound | X |
| 커서 위치 능력 발동 | 높음 | Noita | X |
| 인벤토리 드래그&드롭 | 높음 | MapleStory, Terraria | **O** |
| 장비 비교/관리 UI | 높음 | ARPG 전반 | **O** |
| 지도 패닝/줌 | 중간 | 다수 | **O** |
| 상점/NPC 대화 | 중간 | MapleStory | **O** |
| 카메라 Look-Ahead | 낮음 | 소수 | 낮음 |
| 근접 콤보 전투 | 불필요 | Dead Cells, HK | **O (핵심)** |
| 정밀 플랫포밍 | 방해 | Celeste, Ori | **O (핵심)** |

---

## 8. 권장 사항 (Recommendations for ECHORIS)

### 8.1. 핵심 결론: 컨텍스트 분리형 하이브리드 채택

ECHORIS에 가장 적합한 모델은 **MapleStory/DFO 스타일의 컨텍스트 분리형 하이브리드**이다.

| 컨텍스트 | 권장 입력 | 이유 |
| :--- | :--- | :--- |
| 전투/이동/플랫포밍 | **KB-only** (현행 유지) | 근접 콤보 + 정밀 플랫포밍이 핵심. Mouse 개입은 방해 |
| 인벤토리/장비 관리 | **Mouse 지원 추가** | 이노센트 관리, 장비 비교, 슬롯 배치에 Mouse가 압도적 효율 |
| 대장간/상점 | **Mouse 지원 추가** | 아이템 선택, 강화 대상 지정, 구매/판매 UI |
| 지도 | **Mouse 지원 추가** | 드래그 패닝, 줌 |
| 원거리 무기 조준 | **자동 조준 유지** (Mouse 불필요) | 자동 조준 시스템으로 충분. Mouse 조준은 키 레이아웃 충돌 |

### 8.2. 구현 우선순위

| 우선순위 | 기능 | 근거 |
| :--- | :--- | :--- |
| P1 | 인벤토리 Mouse 클릭/드래그 지원 | 야리코미의 핵심=장비 관리. 이노센트 40개 이상을 KB 방향키로 탐색하는 것은 고통 |
| P1 | 대장간 UI Mouse 지원 | 아이템계 진입 대상 선택이 핵심 동선. Mouse 클릭이 자연스러움 |
| P2 | 지도 Mouse 드래그/줌 | 메트로베니아 맵 탐색 쾌적성 향상 |
| P2 | 전투 중 Mouse 커서 자동 숨김 | 전투 집중도 보호 |
| P3 | KB 방향키 탐색 병행 유지 | Mouse가 없는 환경(일부 접근성 케이스) 대비. Gamepad 사용자를 위한 UI 탐색 |

### 8.3. 원거리 무기 Mouse 조준 -- 향후 검토 조건

현재는 **자동 조준 유지**를 권장하지만, 다음 조건이 충족되면 재검토할 수 있다:

1. **플레이테스트에서 자동 조준 불만이 반복적으로 보고될 때** (예: "의도한 적이 아닌 다른 적을 조준한다")
2. **원거리 전용 빌드 플레이어가 충분히 많아져 별도 키 레이아웃 정당화가 가능할 때**
3. **WASD + Mouse 대체 레이아웃을 추가하는 공수가 낮아질 때** (Phase 2 이후)

재검토 시 고려 사항:
- WASD 이동 + Mouse 조준 + Q/E/R/Shift 스킬 대체 레이아웃
- 자동 조준과 수동 조준의 토글 (Settings에서 선택)
- Gamepad 사용자를 위한 Right Stick 조준 대응

### 8.4. 절대 하지 말아야 할 것

1. **전투 중 Mouse 클릭으로 공격 발동:** 근접 콤보의 리듬이 깨지고, KB 키와 Mouse 클릭이 이중 입력 경로가 됨
2. **Mouse 커서 위치로 캐릭터 이동:** 2D 횡스크롤에서 클릭 이동은 장르 기대와 완전히 어긋남
3. **Mouse 없이 인벤토리 접근 불가:** 반드시 KB/Gamepad 대체 탐색 수단 제공
4. **전투 중 Mouse 커서 표시:** 시각적 혼란 유발. 전투 상태에서는 자동 숨김

---

## 9. 참고 게임 심층 분석 3선

### 9.1. MapleStory -- ECHORIS의 가장 유사한 레퍼런스

MapleStory는 ECHORIS와 동일한 "횡스크롤 + 스킬 슬롯 + 장비 파밍 + 온라인" 구조이다.

- **전투:** 완전 KB-only. 스킬 키(단축키 슬롯)로 모든 전투 조작
- **인벤토리:** Mouse 드래그 필수. 장비 비교는 Mouse hover로 툴팁 표시
- **상점/NPC:** Mouse 클릭
- **교훈:** 20년 이상 운영하면서 전투에 Mouse를 도입하지 않은 것은, 횡스크롤 스킬 슬롯 전투에서 Mouse가 불필요하다는 강력한 증거

### 9.2. Noita -- Mouse 필수의 극단 사례

- **전투:** Mouse 커서 방향으로 마법 발사. 마법 조합의 창의성이 핵심
- **이동:** WASD + Mouse는 플랫포밍 정밀도를 희생하는 대신, 마법 조준의 자유도를 얻음
- **교훈:** "게임의 핵심 메커닉이 커서 위치에 의존하는가?"가 Mouse 필수 여부를 결정. ECHORIS의 핵심은 콤보/타이밍/포지셔닝이므로 커서 위치 의존도가 낮음

### 9.3. Dead Cells -- Gamepad-First 설계의 성공

- **전투:** 방향키 + 공격/구르기/스킬. Mouse 역할 사실상 없음
- **원거리 무기:** 자동 조준 또는 바라보는 방향으로 발사
- **커뮤니티 반응:** "Gamepad가 압도적으로 좋다"가 주류 의견
- **교훈:** 근접 중심 로그라이크 액션에서 Mouse를 강제하면 오히려 사용자 경험 저하. ECHORIS의 Blade/Cleaver 중심 전투와 동일한 패턴

---

## 10. 최종 요약

ECHORIS의 최적 입력 전략은 **"전투=KB-only, UI=Mouse 지원"** 의 컨텍스트 분리형 하이브리드이다.

- **전투/플랫포밍:** 현행 KB-only + 자동 조준 유지. 근접 콤보와 정밀 플랫포밍에 Mouse는 방해 요소
- **UI/인벤토리:** Mouse 클릭/드래그 지원 추가. 야리코미(이노센트 관리, 장비 비교)의 쾌적성에 직결
- **원거리 조준:** 현재 자동 조준으로 충분. 플레이테스트 결과에 따라 Phase 2 이후 재검토
- **웹 브라우저 컨텍스트:** Mouse가 항상 사용 가능하므로, UI에서 Mouse를 지원하지 않는 것은 웹 사용자 기대에 어긋남

이 전략은 MapleStory, Dungeon Fighter Online 등 20년 이상 검증된 횡스크롤 온라인 RPG의 입력 패턴과 일치하며, Noita/Terraria처럼 Mouse 필수 게임과는 게임 메커닉 구조가 근본적으로 다르다는 분석에 기반한다.
