# Dev Server

로컬 개발 서버를 시작합니다.

## 프로세스

1. **기존 서버 확인** — port 3000이 이미 사용 중인지 확인.
   ```
   powershell.exe -Command "Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object { Get-Process -Id $_.OwningProcess } | Select-Object Id, ProcessName"
   ```

2. **서버 시작** — `game/` 폴더에서 `npx vite dev --port 3000` 실행.
   - URL: `http://localhost:3000/ProjectAbyss/`
   - HMR 활성화 — 코드 변경 시 자동 리로드.

3. **기존 서버 충돌 시** — 이전 node 프로세스 종료:
   ```
   powershell.exe -Command "Stop-Process -Id <PID> -Force"
   ```

## 주의사항

- dev 서버는 `public/` 폴더를 static으로 서빙.
- `base: '/ProjectAbyss/'` 설정으로 `http://localhost:3000/ProjectAbyss/`가 진입점.
- IME 입력 이슈 시 브라우저에서 캔버스 클릭 후 테스트.
