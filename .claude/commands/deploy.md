# Deploy to GitHub Pages

ECHORIS 웹 빌드를 GitHub Pages에 배포합니다.

## 프로세스

### 0. 자동 커밋
- `git status --short`로 미커밋 파일 확인.
- 변경사항이 있으면 **묻지 않고** `git add -A && git commit`으로 일괄 커밋.
- 커밋 메시지는 변경 내용을 요약하여 자동 생성.

### 1. Codex 리뷰 (Phase별 제어)
- **Phase 0 (현재):** 스킵. 바로 Step 2(CSV 정합성 검증)로.
- **Phase 1 (데모):** `/codex:review` 실행. P0/P1 이슈 발견 시 중단하고 수정. P2 이하는 경고만.
- **Phase 2+ (출시):** `/codex:review` + `/codex:adversarial-review` 모두 실행. 이슈 발견 시 중단.

현재 Phase는 CLAUDE.md의 "개발 우선순위 (Phase)" 섹션에서 확인.

### 2. CSV 정합성 검증
- 프로젝트 루트에서 `node Sheets/tools/validate.mjs` 실행. 실패(exit 1) 시 중단하고 수정.
- 검증 범위: Content_System_Area_Palette.csv ↔ 하드코딩 AreaID ↔ atlas PNG 실존 ↔ LDtk tileset diff.

### 3. 타입 체크
- `game/` 디렉토리에서 `npx tsc --noEmit` 실행. 에러가 있으면 중단하고 수정.

### 4. 프로덕션 빌드
- `game/` 디렉토리에서 `npx vite build` 실행. `game/dist/`에 결과물 생성.
  - `vite.config.ts`의 `base: '/'` 설정 (커스텀 도메인 사용).
  - `public/` 폴더의 에셋이 `dist/`로 복사됨.
  - `public/CNAME`이 `dist/CNAME`에 포함되어야 함 (echoris.io).

### 5. 푸시
- `git push origin main`으로 push.
- GitHub Actions(`.github/workflows/deploy.yml`)가 게임 빌드 자동 배포.
- Vercel이 MkDocs GDD 사이트 자동 빌드/배포.

### 6. 배포 확인
- **게임:** `gh run list --limit 1`로 GitHub Actions 배포 상태 확인 (약 30-40초).
- **GDD:** Vercel 배포는 push 시 자동. 별도 확인 불필요.

### 7. 배포 검증
- **게임:** 채널 분리 — `/main`=현재 빌드(main 최신), `/play`=버티컬 슬라이스(동결, vertical-slice 브랜치), `/ko`=현재 KO.
  - 현재 빌드 검증: `curl -sL https://echoris.io/main/ | grep -oE 'index-[A-Za-z0-9_-]+\.js'` 로 JS 해시가 **이번 빌드와 일치**하는지 확인. HTTP 200.
  - 슬라이스 불변 확인: `curl -sL -o /dev/null -w "%{http_code}" https://echoris.io/play/` = 200 (해시는 슬라이스 고정값이라 안 바뀜).
- **GDD:** `https://level-deesign-for-pvp.vercel.app` (ECHORIS GDD, 위장 도메인 — 이름·오타 유지). 확인 항목:
  - 홈 200: `curl -sL -o /dev/null -w "%{http_code}" https://level-deesign-for-pvp.vercel.app/`
  - 신규 문서 노출 200: `https://level-deesign-for-pvp.vercel.app/Content/Content_Story_Synopsis/` (자동 nav 작동 확인)
  - 기밀 차단 404: `https://level-deesign-for-pvp.vercel.app/Content/Content_Victor_LifeLog_Synthesis/` (mkdocs exclude_docs)
  - 인증 보호 미리보기(`*-victor-9894s-projects.vercel.app`)는 401 — 반드시 위 공개 도메인 사용.

## 주의사항

- **gh-pages 브랜치는 사용하지 않음.** build_type: workflow로 GitHub Actions가 자동 빌드/배포.
- **`npx gh-pages` CLI 사용 금지** — 긴 파일명(LDtk backups) 때문에 Windows에서 실패함.
- **배포 후 브라우저 캐시** — Ctrl+Shift+R (강력 새로고침) 필요할 수 있음.
- **dev 서버와 배포는 독립적** — dev 서버 종료 불필요.
- **PowerShell 파일 조작 금지** — Get-Content/Set-Content는 CP949 인코딩 손상 위험. Python UTF-8 사용.

## 배포 URL

https://echoris.io
