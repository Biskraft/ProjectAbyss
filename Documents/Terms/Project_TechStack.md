# ECHORIS 기술 스택 (Project Tech Stack)

## 구현 현황 (Implementation Status)

> **최근 업데이트:** 2026-04-17
> **문서 상태:** `작성 중 (Draft)`
> **권위 위치:** 이 문서가 ECHORIS 기술 스택의 SSoT이며, `CLAUDE.md`의 요약 테이블은 이 문서에서 파생됩니다.

---

## 0. 필수 참고 자료 (Mandatory References)

- Project Vision: `Documents/Terms/Project_Vision_Abyss.md`
- Document Index: `Documents/Terms/Document_Index.md`
- Sheets Writing Rules: `Documents/Terms/Sheets_Writing_Rules.md`
- Performance Budget: `Documents/System/System_Performance_Budget.md`
- Game Overview: `Reference/게임 기획 개요.md`

---

## 1. 클라이언트 스택 (Client Stack)

| 분류         | 기술             | 버전     | 용도                                                                 |
| :----------- | :--------------- | :------- | :------------------------------------------------------------------- |
| 렌더러       | PixiJS           | ^8.6.6   | 2D 렌더링 (WebGL 우선, WebGPU 대응)                                  |
| 타일맵       | @pixi/tilemap    | ^4.1.0   | LDtk 타일 레이어 렌더링 (Auto/IntGrid)                               |
| 언어         | TypeScript       | ^5.7.0   | 메인 언어. `strict` 모드, `@core/*`/`@scenes/*` path alias           |
| 빌드         | Vite             | ^6.0.0   | 개발 서버 + 프로덕션 번들. `?raw` 임포트로 CSV 인라인 번들           |
| 오디오       | Howler.js        | (예정)   | BGM/SFX 재생 (Phase 2 도입 예정)                                     |
| 입력         | 자체 구현        | -        | KeyboardInput + KEY_CHAR_TO_CODE fallback (한글 IME 대응)            |
| 에셋 로더    | 자체 구현 (`@core/AssetLoader`) | -        | `assetPath()`로 `BASE_URL` 해소 (GitHub Pages / 로컬 dev 호환)       |

### 주요 디렉토리

```
game/
├── src/
│   ├── core/          # AssetLoader, Input, Events, FrameClock
│   ├── scenes/        # LdtkWorldScene, ItemWorldScene, BootScene
│   ├── effects/       # PaletteSwapFilter, HitStop, ScreenShake
│   ├── data/          # CSV 로더 (areaPalettes, weaponLore, ...)
│   ├── entities/      # Player, Enemy, Innocent
│   └── ui/            # HUD, DepthGauge, LoreDisplay
├── public/assets/     # 정적 에셋 (atlas/, ldtk 없이 public 직속)
└── dist/              # `npx vite build` 출력
```

---

## 2. 레벨 에디터 (Level Editor)

| 항목          | 내용                                                                                        |
| :------------ | :------------------------------------------------------------------------------------------ |
| 도구          | **LDtk (Level Designer Toolkit)** — `world_layout: GridVania` Multi-World 모드              |
| 프로젝트      | `game/public/assets/World_ProjectAbyss.ldtk`                                                |
| 레이어 규약   | BG(Background) / Walls(IntGrid+Auto) / Shadow / Entities                                    |
| 엔티티 네이밍 | PascalCase (`PlayerSpawn`, `SavePoint`, `ItemDrop` 등). 필드 key/enum도 PascalCase          |
| 런타임 파서   | 자체 구현 (`@core/LdtkLoader`). Tiled은 사용하지 않음 (`CLAUDE.md` 구 표기는 폐기 예정)     |
| 멀티월드      | 각 Level의 `worldX/worldY` 좌표로 World Map 구성. 씬 전이는 Neighbour 엔트리 기반           |

### 타일셋 권위성 규칙 (Tileset Authority)

- **LDtk의 `__tilesetRelPath`는 참조용이며, 실제 렌더링 타일셋은 CSV `Content_System_Area_Palette.csv`의 `Tileset` 컬럼이 결정합니다** (DEC-024).
- 런타임에서 `aliasAreaTilesetForLdtkTiles(areaId, tiles, atlases)`가 CSV 지정 아틀라스를 LDtk가 기대하는 경로에도 별칭 등록합니다.
- 덕분에 LDtk 파일을 수정하지 않고 CSV 한 줄만 바꿔 바이옴 타일셋을 교체할 수 있습니다.

---

## 3. 데이터 SSoT / CSV 파이프라인 (Content Pipeline)

### 원칙: 데이터는 전부 CSV, 코드는 리더만 소유

모든 콘텐츠(스탯, 드롭, 팔레트, 로어, 스폰 테이블)는 `Sheets/`의 CSV에 기록되며, TypeScript는 `?raw` 임포트로 빌드타임에 번들됩니다. CastleDB/Google Sheets 스타일의 관계형 참조를 CSV로 구현합니다.

### 현재 시트 목록 (`Sheets/`)

| 파일                                       | 역할                                      |
| :----------------------------------------- | :---------------------------------------- |
| `Content_System_Area_Palette.csv`          | 바이옴 팔레트 + 타일셋 (권위)             |
| `Content_System_Damage_Formula.csv`        | 데미지 공식 상수                          |
| `Content_Stats_Character_Base.csv`         | 플레이어 기본 스탯                        |
| `Content_Stats_Enemy.csv`                  | 적 스탯 테이블                            |
| `Content_Stats_Weapon_List.csv`            | 무기 목록 (100종 목표)                    |
| `Content_Stats_Weapon_Lore.csv`            | 무기 로어 메타 (하이브리드, 본문은 MD)    |
| `Content_Rarity.csv`                       | 레어리티 배율 / 이노센트 슬롯 / 지층 수   |
| `Content_Combat_Combo.csv`                 | 콤보 라우팅                               |
| `Content_Innocents.csv`                    | 이노센트 종류/효과                        |
| `Content_Item_DropRate.csv`                | 드롭 확률 테이블                          |
| `Content_Item_Growth.csv`                  | 아이템 EXP 성장 곡선                      |
| `Content_ItemWorld_MemoryRooms.csv`        | 기억의 방 템플릿                          |
| `Content_ItemWorld_SpawnTable.csv`         | 아이템계 스폰 테이블                      |
| `Content_StrataConfig.csv`                 | 지층별 파라미터                           |
| `LoreTexts/` (폴더)                        | 무기/환경/몬스터 로어 본문 (Markdown)     |

### 하이브리드 전략 (CSV + Markdown)

- **CSV**: 숫자/ID/enum 등 검증 가능한 구조화 데이터
- **Markdown** (`Sheets/LoreTexts/*.md`): 긴 서술문/다국어 로어 본문
- CSV에서 `LoreKey` 컬럼으로 MD 파일을 참조합니다 (DEC-023).

### 인라인 포맷 (Sheets_Writing_Rules)

- 팔레트 스톱: `"0.00:3a1a28|0.20:6a2a3a|..."` (t:hex pairs, `|` 구분)
- 배열: `"a;b;c"` (세미콜론 구분)
- 주석 컬럼: `Description` 마지막 컬럼으로 고정

---

## 4. 비주얼 렌더링 파이프라인 (Visual Pipeline)

| 단계              | 구성요소                     | 설명                                                                 |
| :---------------- | :--------------------------- | :------------------------------------------------------------------- |
| 팔레트 스왑       | `effects/PaletteSwapFilter`  | 1D LUT (256×N 아틀라스). 바이옴별 row 인덱스로 실시간 색조 변경     |
| 팔레트 아틀라스   | `getAreaPaletteAtlas()`      | 모든 AreaID를 한 장의 GPU 텍스처로 패킹 (Dead Cells 스타일)         |
| 멀티 아틀라스     | `ensureAreaTilesetsLoaded()` | 플레이어가 진입한 바이옴의 타일셋만 lazy 로드 (DEC-022)              |
| 타일셋 별칭       | `aliasAreaTilesetForLdtkTiles()` | CSV 권위 매커니즘 (DEC-024)                                         |
| 뎁스 그라디언트   | PaletteSwapFilter uniform    | `depthBias` + `depthCenter`로 수직 진행에 따른 명도 변화             |
| 레이어 분리       | BG/WALL AreaID 이중화        | `world_shaft_bg` vs `world_shaft_wall`로 배경-벽 팔레트 독립         |
| 히트스톱/셰이크   | `effects/HitStop`, `ScreenShake` | 전투 타격감 핵심 (Design_Combat_HitFeedback)                     |

---

## 5. 빌드 & 배포 (Build & Deploy)

### 5.1 게임 클라이언트 → GitHub Pages (echoris.io)

| 단계       | 명령/파일                                | 출력                      |
| :--------- | :--------------------------------------- | :------------------------ |
| 타입 체크  | `cd game && npx tsc --noEmit`            | 에러 0 필수               |
| 빌드       | `cd game && npx vite build`              | `game/dist/` (~806KB)     |
| 워크플로우 | `.github/workflows/deploy.yml`           | `game/dist → site/play/`  |
| 도메인     | `public/CNAME` → `echoris.io`            | Cloudflare DNS            |
| 트리거     | `git push origin main`                   | GitHub Actions 자동 실행  |

- **주의:** gh-pages 브랜치는 사용하지 않습니다. `build_type: workflow`로 Actions가 artifact를 Pages에 직접 게시합니다.
- `npx gh-pages` CLI는 Windows의 LDtk backup 긴 파일명 문제로 사용 금지입니다.

### 5.2 GDD 문서 사이트 → Vercel (MkDocs)

| 항목       | 값                                                       |
| :--------- | :------------------------------------------------------- |
| 생성기     | MkDocs Material (>=9.5)                                  |
| 설정       | `mkdocs.yml` (docs_dir: `Documents`)                     |
| 호스팅     | Vercel (`vercel.json` → `uv pip install` + `mkdocs build`) |
| 출력       | `site/`                                                  |
| 의존성     | `requirements.txt` (mkdocs>=1.6, mkdocs-material>=9.5)   |
| URL        | https://level-deesign-for-pvp.vercel.app                 |

---

## 6. 내부 도구 (Internal Tools)

| 스크립트                                          | 역할                                   |
| :------------------------------------------------ | :------------------------------------- |
| `Tools/annotate_atlas.py` (예정)                  | 아틀라스 타일 인덱스 주석              |
| `Tools/compose_tileset.py` (예정)                 | 원본 타일 이미지 → 게임 아틀라스 합성 |
| `Tools/extract_used_tiles.py` (예정)              | LDtk에서 실제 사용 타일만 추출         |
| `Reference/wiki_to_md.py`                         | 위키 XML 덤프 → Markdown 변환         |
| `Reference/wiki_to_md_robust.py`                  | 위키 변환 안정화 버전                  |

---

## 7. 서버 스택 (Future — Phase 3+)

현재 Phase 1~2는 전적으로 클라이언트 단독 동작이며, 서버는 Phase 3 (코옵 베타) 시작 시 도입합니다.

| 분류       | 기술        | 용도                                    |
| :--------- | :---------- | :-------------------------------------- |
| 런타임     | Node.js     | 게임 서버 (초기 프로토타입)             |
| 통신       | WebSocket   | 실시간 상태 동기화                      |
| 메인 DB    | PostgreSQL  | 계정/인벤토리/진행도                    |
| 캐시       | Redis       | 세션/매치 상태                          |
| 합류 방식  | URL 링크    | 외부 로비 없는 invite-by-link (DEC-017) |

상세 설계는 `Documents/Research/TwoPlayerNetcode_Architecture_Research.md`, `Documents/Research/URLJoin_CoopSession_Research.md`, `Documents/Research/SaveSync_CoopSession_Research.md` 참조.

---

## 8. 개발 환경 (Dev Environment)

| 항목          | 값                                                       |
| :------------ | :------------------------------------------------------- |
| OS (권장)     | Windows 11 / macOS (Vite dev는 OS 무관)                  |
| Shell         | bash (Git Bash on Windows) — PowerShell은 CP949 인코딩 주의 |
| Node          | 20.x (GitHub Actions와 동일)                             |
| Python        | 3.11+ (MkDocs/도구 스크립트)                             |
| Git           | 본선 브랜치 `main`, force push 금지                       |
| IDE           | VS Code + LDtk 확장                                      |

---

## 9. 관련 의사결정 (Related Decisions)

| 번호    | 제목                                  | 위치                                      |
| :------ | :------------------------------------ | :---------------------------------------- |
| DEC-021 | Dead Cells 그레이스케일 팔레트 정식화  | `memory/wiki/decisions/DEC-021.md`        |
| DEC-022 | 멀티 아틀라스 lazy 로딩               | `memory/wiki/decisions/DEC-022.md`        |
| DEC-023 | CSV + Markdown 하이브리드 로어        | `memory/wiki/decisions/DEC-023.md`        |
| DEC-024 | CSV Tileset 컬럼 권위 (LDtk 별칭)     | `memory/wiki/decisions/DEC-024.md`        |
