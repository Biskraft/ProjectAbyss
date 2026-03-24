---
name: update-dashboard
description: GDD 문서들의 구현 현황 테이블을 스캔하여 Project_Status_Dashboard_P1.md를 자동 생성/갱신하는 스킬. "현황판 업데이트", "대시보드 갱신", "update dashboard", "진행률 업데이트" 등의 요청에 사용.
---

# /update-dashboard — P1 현황판 자동 갱신

Python 스크립트로 GDD 문서의 구현 현황 테이블을 파싱하여 대시보드를 자동 생성합니다.

## 실행 절차

### Step 1 — Python 스크립트 실행

Bash 도구로 아래 명령을 실행합니다:

```bash
node .claude/skills/update-dashboard/generate_dashboard.mjs .
```

- 프로젝트 루트에서 실행 (Node.js 사용, 외부 의존성 없음)
- `Documents/System/*.md`, `Documents/UI/*.md` 파일을 스캔
- P1 우선순위 기능만 추출하여 `Documents/Plan/Project_Status_Dashboard_P1.md` 생성/갱신
- 기존 대시보드가 있으면 동기화 차수 자동 증가 및 변경 감지
- 결과를 JSON으로 stdout에 출력

### Step 2 — 결과 보고

스크립트의 JSON 출력을 파싱하여 사용자에게 보고합니다:

```
출력 JSON 필드:
- sync_n: 동기화 차수
- date: 동기화 날짜
- scanned: 총 스캔 문서 수
- with_p1: P1 기능 포함 문서 수
- skipped: P1 기능 없어 건너뛴 문서명 리스트
- total_p1: P1 기능 총 개수
- total_complete: ✅ 완료 기능 수
- total_pct: 전체 진행률 (%)
- changed: 상태 변경된 기능 리스트 [{id, old, new}]
- output: 출력 파일 경로
```

보고 형식:

```
**N차 동기화 완료** (YYYY-MM-DD)

| 항목 | 결과 |
| :--- | :--- |
| 스캔 문서 | N개 |
| P1 기능 포함 | N개 |
| P1 기능 총 | N개 |
| 진행률 | [프로그레스바] N% |

(변경 항목이 있으면)
**변경된 기능:**
- FEAT-ID: old → new

(건너뛴 문서가 있으면)
**건너뛴 문서:** file1.md, file2.md (P1 기능 없음)
```
