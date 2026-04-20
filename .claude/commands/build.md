# Build & Verify

게임 코드를 타입 체크하고 프로덕션 빌드를 실행합니다.

## 프로세스

1. **CSV 정합성 검증** — 프로젝트 루트에서 `node Sheets/tools/validate.mjs` 실행.
   - 실패(exit 1) 시 중단하고 수정.
   - Content_System_Area_Palette.csv ↔ 하드코딩 AreaID ↔ atlas PNG 실존 ↔ LDtk tileset diff.

2. **디렉토리 이동** — `game/` 폴더에서 실행.

3. **타입 체크** — `npx tsc --noEmit` 실행.
   - 에러가 있으면 출력하고 수정 방안 제시.
   - 통과하면 다음 단계.

4. **Vite 빌드** — `npx vite build` 실행.
   - 결과물: `game/dist/` (index.html + assets/)
   - chunk size 경고는 무시해도 됨 (현재 ~680KB).

4. **결과 보고** — 성공/실패, 빌드 시간, 출력 파일 크기 보고.

## 로컬 테스트

빌드 후 로컬에서 프로덕션 빌드를 확인하려면:
```
npx vite preview --port 4000
```
`http://localhost:4000/ProjectAbyss/` 에서 확인 가능.

## 클린 빌드

캐시 문제 시:
```
rm -r dist node_modules/.vite
npx vite build
```
