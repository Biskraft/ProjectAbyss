# 문서 의존성 맵 (Document Dependency Map)

> 작성일: 2026-03-23
> 이 문서는 전체 GDD 문서 간의 참조/의존 관계를 시각화합니다.

---

## 1. 전체 구조 의존성 (Top-Level)

모든 문서의 최상위 흐름입니다. Terms가 모든 문서의 기반이 되고, System이 중심축이며, Content/Balance/UI/Tech가 System을 참조합니다.

```mermaid
flowchart TD
    classDef terms fill:#e8daef,stroke:#8e44ad
    classDef system fill:#d5f5e3,stroke:#27ae60
    classDef content fill:#d6eaf8,stroke:#2980b9
    classDef balance fill:#fdebd0,stroke:#e67e22
    classDef ui fill:#fadbd8,stroke:#e74c3c
    classDef tech fill:#d5dbdb,stroke:#566573
    classDef live fill:#fcf3cf,stroke:#f1c40f
    classDef ref fill:#f2f3f4,stroke:#95a5a6
    classDef csv fill:#abebc6,stroke:#1abc9c

    T[Terms]:::terms
    SC[System/Core]:::system
    SI[System/ItemWorld]:::system
    SP[System/Progression]:::system
    SW[System/World]:::system
    SM[System/Multiplayer]:::system
    SE[System/Economy]:::system
    D[Design]:::system
    C[Content]:::content
    B[Balance]:::balance
    U[UI]:::ui
    A[Tech]:::tech
    L[LiveOps]:::live
    SH[Sheets CSV]:::csv
    R[Reference]:::ref

    T --> SC & SI & SP & SW & SM & SE & D
    R -.-> SC & SI & SP & SW & SM & SE

    SC --> SI
    SC --> SP
    SP --> SI
    SP --> SW
    SW --> SI
    SM --> SC & SI & SW

    SE --> SP & SI & SM

    SC & SI & SP & SW & SM & SE --> C
    SC & SI & SP --> B
    SC & SI & SP & SW & SM & SE --> U
    SC & SI & SM --> A

    B --> SH
    C --> SH
    SE --> SH

    L --> SE & SM & C
    D --> SC & SI & SP & SW & SM & SE
```

---

## 2. System 내부 의존성 (Core ↔ ItemWorld ↔ Progression ↔ World ↔ Multiplayer ↔ Economy)

시스템 문서 간의 상세 참조 관계입니다. 화살표 방향은 "참조하는 쪽 → 참조받는 쪽"입니다.

```mermaid
flowchart LR
    classDef core fill:#f9e79f,stroke:#f39c12
    classDef iw fill:#aed6f1,stroke:#2e86c1
    classDef prog fill:#a9dfbf,stroke:#27ae60
    classDef world fill:#f5cba7,stroke:#e67e22
    classDef multi fill:#d2b4de,stroke:#8e44ad
    classDef econ fill:#f5b7b1,stroke:#e74c3c

    subgraph Core [System/Core]
        SC01[SC-01 Combat Base]:::core
        SC02[SC-02 Damage]:::core
        SC03[SC-03 Skill]:::core
        SC04[SC-04 Status Effect]:::core
        SC05[SC-05 Boss]:::core
        SC06[SC-06 Enemy AI]:::core
        SC07[SC-07 Movement]:::core
        SC08[SC-08 Ability]:::core
        SC09[SC-09 Camera]:::core
    end

    subgraph ItemWorld [System/ItemWorld]
        SI01[SI-01 IW Core]:::iw
        SI02[SI-02 FloorGen]:::iw
        SI03[SI-03 IW Boss]:::iw
        SI04[SI-04 Event]:::iw
        SI05[SI-05 Recursive]:::iw
        SI06[SI-06 GeoEffect]:::iw
        SI07[SI-07 Memory Shard Core]:::iw
        SI08[SI-08 Memory Shard Farm]:::iw
        SI09[SI-09 Memory Shard Capture]:::iw
    end

    subgraph Progression [System/Progression]
        SP01[SP-01 Stat]:::prog
        SP02[SP-02 Growth]:::prog
        SP03[SP-03 Equipment]:::prog
        SP04[SP-04 Rarity]:::prog
        SP05[SP-05 Enhancement]:::prog
        SP06[SP-06 Weapon Type]:::prog
        SP07[SP-07 Mastery]:::prog
        SP08[SP-08 Class]:::prog
        SP09[SP-09 Class Skill]:::prog
        SP10[SP-10 Reincarnation]:::prog
    end

    SC01 --> SC02 & SC03 & SC04
    SC02 --> SP01 & SP03
    SC03 --> SP08 & SP09 & SP07
    SC05 --> SC01 & SC06
    SC06 --> SC01
    SC07 --> SC08
    SC09 --> SC07

    SI01 --> SI02 & SI03 & SI04 & SI05
    SI01 --> SP03 & SP04
    SI02 --> SI06
    SI03 --> SC05 & SC02
    SI04 --> SI07
    SI07 --> SI08 & SI09
    SI09 --> SC01

    SP03 --> SP04 & SP06
    SP05 --> SI01 & SI07
    SP06 --> SP07
    SP08 --> SP09
    SP10 --> SP01 & SP02
```

---

## 3. World/Zone 의존성

월드 구조와 개별 존 문서의 관계입니다.

```mermaid
flowchart TD
    classDef struct fill:#d5f5e3,stroke:#27ae60
    classDef zone fill:#d6eaf8,stroke:#2980b9
    classDef gate fill:#fdebd0,stroke:#e67e22
    classDef ref fill:#f2f3f4,stroke:#95a5a6

    SW01[SW-01 World Structure]:::struct
    SW02[SW-02 Gate System]:::gate
    SW03[SW-03 MapGen]:::struct
    SW04[SW-04 Save/Warp]:::struct
    SW05[SW-05 Secret Areas]:::struct

    SW06[SW-06 Hub - Central Castle]:::zone
    SW07[SW-07 Graveyard/Catacomb]:::zone
    SW08[SW-08 Magic Laboratory]:::zone
    SW09[SW-09 Ice Cave]:::zone
    SW10[SW-10 Sky Tower]:::zone
    SW11[SW-11 Abyss]:::zone
    SW12[SW-12 Inverted Zone]:::zone

    SP01[SP-01 Stat]:::ref
    SC08[SC-08 Ability]:::ref
    SI02[SI-02 FloorGen]:::ref

    SW01 --> SW06 & SW07 & SW08 & SW09 & SW10 & SW11 & SW12
    SW02 --> SW06 & SW07 & SW08 & SW09 & SW10 & SW11 & SW12
    SW03 --> SW07 & SW08 & SW09 & SW10 & SW11 & SW12
    SW04 --> SW01
    SW05 --> SW02

    SP01 -.-> SW02
    SC08 -.-> SW02
    SI02 -.-> SW03

    SW07 -->|"이단점프 해금"| SW10
    SW08 -->|"안개변신 해금"| SW11
    SW09 -->|"수중호흡 해금"| SW11
    SW10 -->|"역중력 해금"| SW12
    SW06 -->|"시작점"| SW07 & SW08
```

---

## 4. 3-Space 순환 의존성

World ↔ Item World ↔ Hub 순환 구조에서 문서가 어떻게 연결되는지 보여줍니다.

```mermaid
flowchart TD
    classDef world fill:#f5cba7,stroke:#e67e22
    classDef iw fill:#aed6f1,stroke:#2e86c1
    classDef hub fill:#a9dfbf,stroke:#27ae60
    classDef circ fill:#fadbd8,stroke:#e74c3c

    subgraph WORLD [World Space]
        direction TB
        SW01[SW-01 World Structure]:::world
        SW02[SW-02 Gate System]:::world
        SC01[SC-01 Combat Base]:::world
        SC07[SC-07 Movement]:::world
        SC08[SC-08 Ability]:::world
    end

    subgraph ITEMWORLD [Item World Space]
        direction TB
        SI01[SI-01 IW Core]:::iw
        SI02[SI-02 FloorGen]:::iw
        SI03[SI-03 IW Boss]:::iw
        SI07[SI-07 Memory Shard Core]:::iw
        SI09[SI-09 Memory Shard Capture]:::iw
    end

    subgraph HUB [Hub Space]
        direction TB
        SE03[SE-03 Shop]:::hub
        SE04[SE-04 Trade]:::hub
        SI08[SI-08 Memory Shard Farm]:::hub
        SM07[SM-07 Hub Social]:::hub
        SM04[SM-04 Matchmaking]:::hub
    end

    DSG01[D-01 Circulation]:::circ

    WORLD -->|"장비 획득"| ITEMWORLD
    ITEMWORLD -->|"장비 강화 완료"| WORLD
    WORLD -->|"소재/골드"| HUB
    HUB -->|"장비 구매/제작"| WORLD
    ITEMWORLD -->|"기억 단편/드롭"| HUB
    HUB -->|"합성/파티 구성"| ITEMWORLD

    SW02 -->|"스탯 게이트 해제를 위해\n장비 강화 필요"| SI01
    SI07 -->|"기억 단편 효과로\n스탯 상승"| SW02

    DSG01 --> WORLD & ITEMWORLD & HUB
```

---

## 5. GDD → CSV → Balance 데이터 흐름

수치 데이터가 어떻게 흐르는지 보여줍니다.

```mermaid
flowchart LR
    classDef gdd fill:#d5f5e3,stroke:#27ae60
    classDef csv fill:#abebc6,stroke:#1abc9c
    classDef bal fill:#fdebd0,stroke:#e67e22
    classDef ui fill:#fadbd8,stroke:#e74c3c

    subgraph GDD [System GDD - 규칙 정의]
        SC02[SC-02 Damage]:::gdd
        SP01[SP-01 Stat]:::gdd
        SP02[SP-02 Growth]:::gdd
        SP04[SP-04 Rarity]:::gdd
        SI01[SI-01 IW Core]:::gdd
        SI07[SI-07 Memory Shard]:::gdd
        SM03[SM-03 Party Scaling]:::gdd
        SE01[SE-01 Economy]:::gdd
    end

    subgraph CSV [Sheets - 수치 데이터 SSoT]
        S01[S-01 Character Base]:::csv
        S02[S-02 Weapon List]:::csv
        S05[S-05 Monster List]:::csv
        S07[S-07 Memory Shard List]:::csv
        S12[S-12 Damage Formula]:::csv
        S13[S-13 Growth Curve]:::csv
        S14[S-14 IW Scaling]:::csv
        S15[S-15 Economy]:::csv
    end

    subgraph BAL [Balance - 검증/시뮬레이션]
        B01[B-01 Damage Formula]:::bal
        B02[B-02 Growth Curve]:::bal
        B03[B-03 IW Scaling]:::bal
        B06[B-06 Economy Flow]:::bal
        B07[B-07 TTK Benchmark]:::bal
    end

    subgraph UI_VIEW [UI - 표시]
        U01[U-01 HUD]:::ui
        U02[U-02 Inventory]:::ui
        U11[U-11 Result]:::ui
    end

    SC02 --> S12
    SP01 --> S01
    SP02 --> S13
    SP04 --> S02
    SI01 --> S14
    SI07 --> S07
    SE01 --> S15
    SP01 --> S05

    S12 --> B01
    S01 & S13 --> B02
    S14 --> B03
    S15 --> B06
    B01 & S05 --> B07

    S01 --> U01
    S02 & S07 --> U02
    B01 --> U11
```

---

## 6. Content 문서 의존성

콘텐츠 문서가 어떤 시스템 문서를 참조하는지 보여줍니다.

```mermaid
flowchart TD
    classDef sys fill:#d5f5e3,stroke:#27ae60
    classDef cnt fill:#d6eaf8,stroke:#2980b9

    SC01[SC-01 Combat]:::sys
    SC03[SC-03 Skill]:::sys
    SC05[SC-05 Boss]:::sys
    SI01[SI-01 IW Core]:::sys
    SI06[SI-06 GeoEffect]:::sys
    SI07[SI-07 Memory Shard]:::sys
    SP03[SP-03 Equipment]:::sys
    SP06[SP-06 Weapon Type]:::sys
    SP08[SP-08 Class]:::sys
    SP09[SP-09 Class Skill]:::sys
    SE03[SE-03 Shop]:::sys
    SW03[SW-03 MapGen]:::sys

    C01[C-01 Monster List]:::cnt
    C02[C-02 Boss Detail]:::cnt
    C03[C-03 Weapon List]:::cnt
    C04[C-04 Armor List]:::cnt
    C05[C-05 Accessory List]:::cnt
    C06[C-06 Memory Shard List]:::cnt
    C07[C-07 Skill List]:::cnt
    C08[C-08 Evility List]:::cnt
    C09[C-09 Class List]:::cnt
    C10[C-10 Consumable]:::cnt
    C11[C-11 Room Template]:::cnt
    C12[C-12 GeoEffect List]:::cnt
    C13[C-13 Quest List]:::cnt
    C15[C-15 NPC List]:::cnt

    SC01 --> C01
    SC05 --> C02
    SP06 --> C03
    SP03 --> C04 & C05
    SI07 --> C06
    SC03 & SP09 --> C07
    SP09 --> C08
    SP08 --> C09
    SE03 --> C10 & C15
    SW03 & SI01 --> C11
    SI06 --> C12
    SE03 --> C13
```

---

## 7. UI 문서 의존성

각 UI 화면이 어떤 시스템/데이터를 참조하는지 보여줍니다.

```mermaid
flowchart LR
    classDef sys fill:#d5f5e3,stroke:#27ae60
    classDef ui fill:#fadbd8,stroke:#e74c3c
    classDef csv fill:#abebc6,stroke:#1abc9c

    SC01[SC-01 Combat]:::sys
    SC03[SC-03 Skill]:::sys
    SP01[SP-01 Stat]:::sys
    SP03[SP-03 Equipment]:::sys
    SP08[SP-08 Class]:::sys
    SI01[SI-01 IW Core]:::sys
    SI07[SI-07 Memory Shard]:::sys
    SI08[SI-08 Inn Farm]:::sys
    SM02[SM-02 Party]:::sys
    SM05[SM-05 AutoHunt]:::sys
    SE03[SE-03 Shop]:::sys
    SW01[SW-01 World]:::sys

    U01[U-01 HUD]:::ui
    U02[U-02 Inventory]:::ui
    U03[U-03 Equipment]:::ui
    U04[U-04 IW Entry]:::ui
    U05[U-05 Map]:::ui
    U06[U-06 Inn Farm]:::ui
    U07[U-07 Shop]:::ui
    U08[U-08 Party]:::ui
    U09[U-09 AutoHunt]:::ui
    U10[U-10 Class/Skill]:::ui
    U11[U-11 Result]:::ui

    SC01 & SP01 --> U01
    SP03 & SI07 --> U02
    SP03 & SP01 --> U03
    SI01 & SM02 --> U04
    SW01 --> U05
    SI08 --> U06
    SE03 --> U07
    SM02 --> U08
    SM05 --> U09
    SP08 & SC03 --> U10
    SC01 & SI01 --> U11
```

---

## 8. Tech 문서 의존성

기술 문서가 어떤 시스템 문서의 구현 요구사항을 참조하는지 보여줍니다.

```mermaid
flowchart TD
    classDef sys fill:#d5f5e3,stroke:#27ae60
    classDef tech fill:#d5dbdb,stroke:#566573

    SC01[SC-01 Combat]:::sys
    SC07[SC-07 Movement]:::sys
    SC09[SC-09 Camera]:::sys
    SI02[SI-02 FloorGen]:::sys
    SM01[SM-01 Network]:::sys
    SM09[SM-09 AntiCheat]:::sys
    SP03[SP-03 Equipment]:::sys

    A01[A-01 Architecture]:::tech
    A02[A-02 Rendering]:::tech
    A03[A-03 State Manager]:::tech
    A04[A-04 Server Logic]:::tech
    A05[A-05 Database]:::tech
    A06[A-06 Protocol]:::tech
    A07[A-07 ProcGen]:::tech
    A08[A-08 Physics]:::tech
    A09[A-09 Asset Pipeline]:::tech
    A10[A-10 DevOps]:::tech

    A01 --> A02 & A03 & A04 & A05 & A06
    SC09 --> A02
    SC01 & SC07 --> A03
    SM01 --> A04 & A06
    SP03 --> A05
    SM09 --> A04
    SI02 --> A07
    SC01 --> A08
    A02 --> A09
    A01 --> A10
```

---

## 9. Phase별 문서 작성 의존 순서

어떤 문서를 먼저 작성해야 다음 문서를 쓸 수 있는지 보여줍니다.

```mermaid
flowchart TD
    classDef p1 fill:#f9e79f,stroke:#f39c12
    classDef p2 fill:#aed6f1,stroke:#2e86c1
    classDef p3 fill:#a9dfbf,stroke:#27ae60
    classDef p4 fill:#d2b4de,stroke:#8e44ad

    subgraph Phase1 [Phase 1: MVP 핵심 12개]
        T01[T-01 Vision]:::p1
        SC01[SC-01 Combat Base]:::p1
        SC02[SC-02 Damage]:::p1
        SC07[SC-07 Movement]:::p1
        SC09[SC-09 Camera]:::p1
        SI01[SI-01 IW Core]:::p1
        SI02[SI-02 FloorGen]:::p1
        SP01[SP-01 Stat]:::p1
        SP03[SP-03 Equipment]:::p1
        SW01[SW-01 World Structure]:::p1
        SM01[SM-01 Network Arch]:::p1
        A01[A-01 Tech Arch]:::p1
    end

    subgraph Phase2 [Phase 2: 핵심 확장 12개]
        SC05[SC-05 Boss]:::p2
        SC08[SC-08 Ability]:::p2
        SI07[SI-07 Memory Shard]:::p2
        SI08[SI-08 Inn Farm]:::p2
        SP02[SP-02 Growth]:::p2
        SP04[SP-04 Rarity]:::p2
        SW02[SW-02 Gate]:::p2
        SW03[SW-03 MapGen]:::p2
        SM02[SM-02 Party]:::p2
        SE01[SE-01 Economy]:::p2
        B01[B-01 Damage Formula]:::p2
        B02[B-02 Growth Curve]:::p2
        A07[A-07 ProcGen]:::p2
    end

    subgraph Phase3 [Phase 3: 콘텐츠/밸런스]
        CNT[Content 문서 15개]:::p3
        BAL[Balance 나머지 6개]:::p3
        UI[UI 문서 11개]:::p3
        CSV[CSV 시트 20개]:::p3
        ZONE[WLD Zone 7개]:::p3
    end

    subgraph Phase4 [Phase 4: 라이브/확장]
        LIVE[LiveOps 5개]:::p4
        DSG[Design 6개]:::p4
        TECH[Tech 나머지 8개]:::p4
    end

    T01 --> SC01 & SP01 & SW01
    SP01 --> SC02
    SC01 --> SC07
    SC07 --> SC09
    SP01 & SP03 --> SI01
    SI01 --> SI02
    SM01 --> A01

    SC01 --> SC05
    SC07 --> SC08
    SP01 --> SP02
    SP03 --> SP04
    SI01 --> SI07
    SI07 --> SI08
    SC08 & SP01 --> SW02
    SI02 --> SW03
    SM01 --> SM02
    SP03 & SI01 --> SE01
    SC02 --> B01
    SP02 --> B02
    SI02 --> A07

    SC05 & SW02 --> ZONE
    SI07 & SP04 --> CNT
    B01 & B02 --> BAL
    SP03 & SI07 --> UI
    CNT --> CSV

    SE01 & SM02 --> LIVE
    SC01 & SI01 --> DSG
    SM01 --> TECH
```

---

## 범례 (Legend)

| 색상 | 의미 |
| :--- | :--- |
| 보라 | Terms (메타 문서) |
| 연두 | System (시스템 GDD) |
| 파랑 | Content (콘텐츠 목록) |
| 주황 | Balance (밸런스/수식) |
| 빨강 | UI (UI/HUD 명세) |
| 회색 | Tech (기술 아키텍처) |
| 노랑 | LiveOps (라이브 서비스) |
| 민트 | Sheets (CSV 데이터) |
| 연회색 | Reference (레퍼런스) |

| 화살표 | 의미 |
| :--- | :--- |
| 실선 (-->) | 강한 의존 (참조 필수) |
| 점선 (-.->)  | 약한 참조 (선택적) |
