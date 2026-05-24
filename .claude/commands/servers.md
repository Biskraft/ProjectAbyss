# Dev Servers — 전체 기동

게임 개발에 필요한 3개 서버를 모두 백그라운드로 시작합니다.

## 서버 목록

| 서버 | 포트 | 명령 | 디렉토리 |
|:---|:---|:---|:---|
| Game Dev (Vite) | 3000 | `npx vite dev --port 3000` | `game/` |
| ASE Watcher | — | `npm run ase:watch` | `game/` |
| Marketing Kanban | 4321 | `node Documents/Plan/marketing/server.js` | 프로젝트 루트 |

## 프로세스

### 1. 포트 점유 확인

3000, 4321 포트가 이미 사용 중인지 확인한다. 점유 중이면 해당 서버는 스킵.

```powershell
Get-NetTCPConnection -LocalPort 3000,4321 -ErrorAction SilentlyContinue |
  ForEach-Object { [PSCustomObject]@{ Port=$_.LocalPort; PID=$_.OwningProcess;
    Process=(Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue).ProcessName } }
```

### 2. 서버 3개 백그라운드 기동

각각 `run_in_background: true` 로 실행. 순서는 아래와 같다.

1. **Game Dev Server** (포트 3000 미점유 시):
   - `game/` 디렉토리에서 `npx vite dev --port 3000` 백그라운드 실행
   - 접속 URL: `http://localhost:3000/`

2. **ASE Watcher** (항상 실행):
   - `game/` 디렉토리에서 `npm run ase:watch` 백그라운드 실행
   - `.ase` 파일 저장 시 자동 PNG export

3. **Marketing Kanban** (포트 4321 미점유 시):
   - 프로젝트 루트에서 `node Documents/Plan/marketing/server.js` 백그라운드 실행
   - 접속 URL: `http://localhost:4321`

### 3. 기동 완료 보고

3개 서버 모두 실행 후 아래 형식으로 보고:

```
게임 서버    http://localhost:3000   ✓ 시작 / ⚡ 이미 실행 중
ASE Watcher  —                       ✓ 시작
마케팅 보드  http://localhost:4321   ✓ 시작 / ⚡ 이미 실행 중
```

## 주의사항

- 세 서버 모두 **run_in_background: true** 필수. 동기 대기 금지.
- 포트 충돌 시 기존 프로세스를 강제 종료하지 말 것. 스킵 후 보고만.
- ASE Watcher는 포트 없이 파일 감시만 하므로 항상 새로 시작.
