# TASK-LDTK-MERGE-01 — LDtk 분리 저장 + 빌드 재병합

> **목표:** LDtk 레벨을 *분리 파일(.ldtkl)* 로 저장(편집·git 친화)하되, **빌드 시 단일 `.ldtk` 번들로 재병합**해 런타임은 단일 파일을 로드한다. 런타임 로더(`LdtkLoader.ts`)는 *로직 무변경*.
> **근거:** 분리 파일 = git diff 깔끔·벌크 스크립트 친화 / 단일 번들 = 웹 런타임 N-fetch 회피·로더 무변경. 둘의 이점만 취함.
> **현재 상태(코드 확인):** `LdtkLoader.ts:486` `layerInstances ?? []` — 외부 레벨 미지원. 분리 저장을 *그냥 켜면* 모든 레벨이 빈 채 로드돼 깨짐. → 빌드 병합으로 우회.
> **작성:** 2026-06-20.

---

## §0. 동작 모델

```
[LDtk 소스: 분리 저장]                 [빌드]                    [런타임]
World_ProjectAbyss.ldtk (인덱스)   ── ldtk_merge.mjs ──▶   단일 번들 .ldtk     ──▶  LdtkLoader (무변경)
 + World_ProjectAbyss/*.ldtkl                              (inline layerInstances)
   (레벨별 전체 데이터, git 커밋)                            (build artifact, gitignore)
```

- **소스(커밋):** 분리된 LDtk 프로젝트 — 메인 인덱스 + 레벨별 `.ldtkl`.
- **빌드 산출(gitignore):** 레벨이 다시 inline된 단일 `.ldtk`.
- **로더:** 단일 번들만 읽음 → *로직 변경 0* (경로만 번들 가리키게).

---

## §1. 작업 티켓

### T1 — 레이아웃·분리 저장 결정 + 활성화
- LDtk Project settings → **Save levels to separate files** 켜기 → `World_ProjectAbyss/*.ldtkl` 생성.
- **경로 레이아웃(택1):**
  - **(A) 권장:** 소스 그대로 `public/assets/`에 두고, 병합 산출은 *다른 파일명*(`World_ProjectAbyss.bundle.ldtk`)으로. 로더 경로만 번들로 1줄 변경. *타일셋 상대경로 안 깨짐.*
  - (B) 소스를 `public/` 밖으로 이동 + 병합이 `public/assets/World_ProjectAbyss.ldtk`로 출력(로더 경로 무변경). 단 .ldtk의 타일셋 상대경로(`atlas/*.png`) 재정비 필요.
- 게이트: 분리 저장 후 LDtk에서 정상 편집·저장됨.

### T2 — `tools/ldtk_merge.mjs` 구현 (핵심)
- 입력: 메인 인덱스 `.ldtk` + `World_ProjectAbyss/*.ldtkl`.
- 동작: 각 레벨 스텁을 대응 `.ldtkl`의 *전체 레벨 객체*로 교체 → `externalRelPath = null`, 프로젝트 `externalLevels = false` 로 플립 → 단일 `.ldtk` 동형 출력.
- 멀티 월드 대응: `worlds[].levels` 와 루트 `levels` 양쪽 처리.
- 출력: 번들 경로(T1 결정).

### T3 — 빌드 파이프라인 연동
- `package.json`: `predev`·`prebuild`(또는 `predeploy`)에 `node tools/ldtk_merge.mjs` 추가 → dev/build/deploy 전 항상 최신 번들 생성.
- `.gitignore`: 번들 산출물 제외(소스만 커밋).

### T4 — 로더 연결 + 검증
- `LdtkLoader.ts`: 로드 경로를 번들로(레이아웃 A면 파일명 1줄). *파싱 로직 무변경.*
- (선택) 안전망: `layerInstances === null && externalRelPath`면 명확한 에러 throw(번들 누락 조기 감지) — `:486` `?? []` 대신.

### T5 — 검증 게이트
- 병합 출력이 *단일 파일 .ldtk와 동형*(레벨 수·레이어·타일 동일).
- 인게임에서 *분리 전과 픽셀 동일* 렌더(개발 빌드 직접 확인).
- 분리 저장 → 편집 → 병합 → 동일 렌더 라운드트립 1회 통과.

---

## §2. 머지 스크립트 스펙 (의사코드)

```js
// tools/ldtk_merge.mjs
// 1) 메인 .ldtk 읽기
// 2) externalLevels=true 확인. for each level (worlds[].levels ∪ levels):
//      if level.externalRelPath: 대응 .ldtkl 읽어 level 객체 통째 교체
//      level.externalRelPath = null
// 3) project.externalLevels = false
// 4) 번들 경로에 JSON write (들여쓰기 LDtk와 동일 or minify)
```
- iid·`__neighbours`·좌표 보존(=.ldtkl 원본 그대로 가져오므로 자동 보존).

---

## §3. 주의 / 엣지

- **타일셋 상대경로:** .ldtk 위치를 옮기면(레이아웃 B) `atlas/*.png` 상대경로가 깨짐 → A 권장.
- **번들은 산출물:** git에 소스(분리 파일)만, 번들은 ignore. *빌드 안 돌리면 런타임 깨짐* → predev/prebuild 필수.
- **외부 레벨 미지원 잔존:** 누군가 번들 없이 분리 소스를 직접 로드하면 빈 레벨 → T4 안전망 에러로 조기 감지.
- **벌크 툴 시너지:** 분리 파일이면 `ldtk_tools.mjs`(월드 일괄 이동 등)가 *파일 단위*라 더 단순. 같이 진행 가능.

---

## §4. 미정 (착수 전)

- T1 레이아웃 A vs B (A 권장 — 타일셋 경로 안전).
- 번들 minify 여부(런타임 파싱 속도 vs 디버그 가독).

---

## 한 줄
> **편집은 분리 파일(.ldtkl, git 깔끔), 런타임은 빌드가 재병합한 단일 .ldtk(로더 무변경·빠름). predev/prebuild에 `ldtk_merge.mjs`를 끼우면 끝.**
