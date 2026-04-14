# Deploy to GitHub Pages

ECHORIS 웹 빌드를 GitHub Pages에 배포합니다.

## 프로세스

### 0. 미커밋 파일 확인
- `git status --short`로 미커밋 파일이 있는지 확인.
- 미커밋 파일이 있으면 사용자에게 먼저 커밋할지 물어본다.
- 전부 커밋하라고 하면 `git add -A && git commit`으로 일괄 커밋.

### 1. Codex 리뷰 (Phase별 제어)
- **Phase 0 (현재):** 스킵. 바로 Step 2로.
- **Phase 1 (데모):** `/codex:review` 실행. P0/P1 이슈 발견 시 중단하고 수정. P2 이하는 경고만.
- **Phase 2+ (출시):** `/codex:review` + `/codex:adversarial-review` 모두 실행. 이슈 발견 시 중단.

현재 Phase는 CLAUDE.md의 "개발 우선순위 (Phase)" 섹션에서 확인.

### 2. 타입 체크
- `game/` 디렉토리에서 `npx tsc --noEmit` 실행. 에러가 있으면 중단하고 수정.

### 3. 프로덕션 빌드
- `game/` 디렉토리에서 `npx vite build` 실행. `game/dist/`에 결과물 생성.
  - `vite.config.ts`의 `base: '/'` 설정 (커스텀 도메인 사용).
  - `public/` 폴더의 에셋이 `dist/`로 복사됨.
  - `public/CNAME`이 `dist/CNAME`에 포함되어야 함 (echoris.io).

### 4. 푸시
- `git push origin main`으로 push.
- `.github/workflows/deploy.yml`이 자동 실행됨.

### 5. 배포 확인
- `gh run list --limit 1`로 배포 상태 확인.
- 완료까지 약 30-40초 소요.

### 6. 배포 검증
- `curl -s https://echoris.io/ | grep "script.*src"` 로 JS 해시가 최신인지 확인.
- HTTP 200 응답 확인.

## 주의사항

- **gh-pages 브랜치는 사용하지 않음.** build_type: workflow로 GitHub Actions가 자동 빌드/배포.
- **`npx gh-pages` CLI 사용 금지** — 긴 파일명(LDtk backups) 때문에 Windows에서 실패함.
- **배포 후 브라우저 캐시** — Ctrl+Shift+R (강력 새로고침) 필요할 수 있음.
- **dev 서버와 배포는 독립적** — dev 서버 종료 불필요.
- **PowerShell 파일 조작 금지** — Get-Content/Set-Content는 CP949 인코딩 손상 위험. Python UTF-8 사용.

## 배포 URL

https://echoris.io
