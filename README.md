<p align="center">
  <h1 align="center">Project Abyss</h1>
  <p align="center">
    웹 기반 횡스크롤 온라인 액션 RPG — 메트로베니아 × 아이템계 × 야리코미
    <br />
    거대한 고딕 세계를 탐험하고, 아이템 속으로 들어가 끝없이 강화하며, 함께 싸우는 게임
  </p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/engine-PixiJS%20v8-e72264" alt="PixiJS v8">
  <img src="https://img.shields.io/badge/language-TypeScript-3178c6?logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/bundler-Vite-646cff?logo=vite&logoColor=white" alt="Vite">
  <img src="https://img.shields.io/badge/phase-Prototype-orange" alt="Phase: Prototype">
  <img src="https://img.shields.io/badge/platform-Web%20(PC)-brightgreen" alt="Platform: Web (PC)">
</p>

---

## 핵심 컨셉

> **월하의 야상곡**(탐험/전투) + **디스가이아**(아이템계/야리코미) + **스펠렁키**(절차적 생성)

### 3대 핵심 판타지

| 판타지 | 설명 |
|--------|------|
| **탐험가** | 능력을 하나씩 얻으며 갈 수 없던 곳을 뚫어 세계의 비밀을 밝혀낸다 |
| **장인** | 아이템 속에 들어가 이노센트를 사냥하고, 세상에 하나뿐인 최강 장비를 만든다 |
| **모험가** | 친구와 함께 끝없는 심연의 던전에 도전하고, 위기를 함께 극복한다 |

### 2-Space 분리 모델

| 공간 | 목적 | 인원 | 맵 유형 |
|------|------|------|---------|
| **월드 (World)** | 탐험, 능력 획득, 스토리, 대장간/상점 (세이브 포인트) | 솔로 | 핸드크래프트 + 절차적 혼합 |
| **아이템계 (Item World)** | 아이템 강화, 야리코미 | 1~4인 | 완전 절차적 생성 (기억의 지층) |

---

## 빠른 시작

### 필수 환경

- [Node.js](https://nodejs.org/) 18+
- [Git](https://git-scm.com/)

### 설치 및 실행

```bash
git clone <repo-url> project-abyss
cd project-abyss/game
npm install
npm run dev
```

브라우저에서 `http://localhost:5173`으로 접속하면 프로토타입을 플레이할 수 있습니다.

### 빌드

```bash
cd game
npm run build     # dist/ 폴더에 프로덕션 빌드 생성
npm run preview   # 빌드 결과 로컬 프리뷰
```

---

## 프로젝트 구조

```
ProjectAbyss/
├── game/                        # 게임 클라이언트 (Vite + TypeScript + PixiJS)
│   ├── src/
│   │   ├── main.ts              # 엔트리포인트
│   │   ├── Game.ts              # 메인 게임 루프
│   │   ├── core/                # 엔진 코어 (Scene, Camera, Physics, Input, AssetLoader)
│   │   ├── scenes/              # 게임 씬 (WorldScene, ItemWorldScene)
│   │   ├── entities/            # 게임 엔티티 (Player, Enemy, Skeleton, Ghost, Portal 등)
│   │   ├── combat/              # 전투 시스템 (CombatData, HitManager)
│   │   ├── items/               # 아이템 시스템 (Inventory, ItemInstance, ItemDrop)
│   │   ├── level/               # 레벨 생성 (RoomGrid, ChunkAssembler, TilemapRenderer)
│   │   ├── effects/             # 시각 이펙트 (HitSpark, ScreenFlash, PortalTransition)
│   │   ├── ui/                  # UI (HUD, DamageNumber, InventoryUI, VirtualPad)
│   │   ├── data/                # 데이터 정의 (stats, damage, weapons)
│   │   └── utils/               # 유틸리티 (PRNG, StateMachine, SaveManager)
│   └── public/                  # 정적 에셋
├── Documents/                   # GDD 문서
│   ├── Terms/                   # 비전, 용어집, 작성 규칙
│   ├── System/                  # 시스템 메커닉 문서
│   ├── Design/                  # 설계 원칙/철학
│   ├── UI/                      # UI/HUD 명세
│   ├── Content/                 # 콘텐츠 목록
│   └── Plan/                    # 개발 계획
├── Sheets/                      # CSV 데이터 시트 (수치 밸런스 SSoT)
└── Reference/                   # 레퍼런스 및 리서치 자료
    ├── 게임 기획 개요.md         # 핵심 기획서
    ├── *_인사이트.md             # 채널별 인사이트 정리
    ├── *-ReverseGDD.md          # 역기획서 (디스가이아, 스펠렁키, 데드셀)
    ├── castlevania-wiki-md/     # 캐슬바니아 위키
    └── disgaea-wiki-md/         # 디스가이아 위키
```

---

## 기술 스택

| 기술 | 용도 |
|------|------|
| **PixiJS v8** | 2D 렌더링 (WebGL / WebGPU) |
| **TypeScript** | 메인 언어 |
| **Vite** | 빌드 / 번들러 / HMR |
| **@pixi/tilemap** | 타일맵 렌더링 |

### 서버 (계획)

| 기술 | 용도 |
|------|------|
| Node.js + WebSocket | 실시간 멀티플레이 |
| PostgreSQL | 메인 DB |
| Redis | 캐시 / 세션 |

---

## 현재 구현 상태 (Phase 1 — 프로토타입)

- [x] 플레이어 이동 / 점프 / 공격
- [x] 타일맵 기반 월드 렌더링
- [x] 절차적 방 생성 (RoomGrid + ChunkAssembler)
- [x] 적 시스템 (Skeleton, Ghost + 투사체)
- [x] 전투 시스템 (히트스파크, 데미지 넘버, 넉백)
- [x] 아이템 드롭 및 인벤토리
- [x] 무기 장비 시스템 (레어리티별 무기)
- [x] 아이템계 진입 (포탈 → ItemWorldScene)
- [x] 아이템계 전용 크림슨 타일맵 테마
- [x] 골든 몬스터
- [x] 키보드 + 게임패드 조작 지원
- [x] 세이브/로드 (SaveManager)
- [ ] 스탯 게이트 / 능력 게이트
- [ ] 이노센트 시스템
- [ ] 보스 전투
- [ ] 멀티플레이

---

## 조작법

| 입력 | 동작 |
|------|------|
| `←` `→` / `A` `D` | 이동 |
| `↑` / `W` / `Space` | 점프 |
| `Z` / `X` | 공격 |
| `I` | 인벤토리 열기/닫기 |
| 게임패드 | 표준 레이아웃 지원 |

---

## 개발 로드맵

| Phase | 목표 | 핵심 과제 |
|-------|------|-----------|
| **Phase 1** (프로토타입) | 핵심 루프가 재미있는가? | 이동/전투, 타일맵, 절차적 방 생성, 아이템계 미니 버전 |
| **Phase 2** (알파) | 성장/탐험 쾌감이 있는가? | 장비/이노센트, 스탯·능력 게이트, 월드 연결, 보스 |
| **Phase 3** (베타) | 파티 플레이/무한 파밍이 작동하는가? | WebSocket 멀티, 아이템계 100층, 허브 |
| **Phase 4** (런칭) | 장기 운영 가능한가? | 시즌, 이벤트, 길드 |

---

## 레어리티 체계

| 등급 | 색상 | 스탯 배율 | 이노센트 슬롯 | 아이템계 층수 |
|------|------|-----------|---------------|---------------|
| Normal | ⬜ 흰색 | ×1.0 | 2 | 30층 |
| Magic | 🟦 파란 | ×1.3 | 3 | 50층 |
| Rare | 🟨 노란 | ×1.7 | 4 | 70층 |
| Legendary | 🟧 주황 | ×2.2 | 6 | 100층 |
| Ancient | 🟩 초록 | ×3.0 | 8 | 100층 + 보너스 |

---

## 라이선스

MIT License
