# Deploy to GitHub Pages

Project Abyss 웹 빌드를 GitHub Pages에 배포합니다.

## 프로세스

1. **타입 체크** — `game/` 디렉토리에서 `npx tsc --noEmit` 실행. 에러가 있으면 중단하고 수정.

2. **프로덕션 빌드** — `game/` 디렉토리에서 `npx vite build` 실행. `game/dist/`에 결과물 생성.
   - `vite.config.ts`의 `base: '/ProjectAbyss/'` 설정으로 경로가 결정됨.
   - `public/` 폴더의 에셋이 `dist/`로 복사됨.

3. **커밋 & 푸시** — 변경된 `game/` 파일들을 main 브랜치에 커밋하고 push.
   - 커밋 메시지에 변경 내용 요약 포함.
   - game/ 하위 파일만 stage (문서 변경은 별도 커밋).

4. **자동 배포 확인** — main push 시 `.github/workflows/deploy.yml`이 자동 실행됨.
   - `gh run list --limit 1`로 배포 상태 확인.
   - 완료까지 약 30~40초 소요.

5. **배포 검증** — `curl -s https://biskraft.github.io/ProjectAbyss/ | grep "script.*src"` 로 JS 해시가 최신인지 확인.

## 주의사항

- **gh-pages 브랜치는 사용하지 않음.** GitHub Actions workflow가 main에서 자동 빌드/배포.
- **`npx gh-pages` CLI 사용 금지** — 긴 파일명(LDtk backups) 때문에 Windows에서 실패함.
- **배포 후 브라우저 캐시** — Ctrl+Shift+R (강력 새로고침) 필요할 수 있음.
- **dev 서버와 배포는 독립적** — dev 서버 종료 불필요.
- **LDtk backup 폴더** — `.gitignore`에서 제외 중. dist에 포함되어도 무해하나 용량 증가 주의.

## 배포 URL

https://biskraft.github.io/ProjectAbyss/
