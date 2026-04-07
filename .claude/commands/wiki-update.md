# Wiki Update — 개발 위키 자동 갱신

세션에서 수행한 작업을 분석하여 개발 위키를 갱신하세요.

## 위키 위치
`C:\Users\Victor\.claude\projects\c--Users-Victor-Documents-Works-ProjectAbyss\memory\wiki\`

## 수행 절차

### Step 1: 컨텍스트 수집
- `git log --oneline -20`으로 최근 커밋 확인
- `git diff HEAD~5 --stat`으로 변경 파일 범위 파악
- 현재 대화에서 수행한 작업, 논의한 내용, 내린 결정을 회고

### Step 2: 날짜별 작업일지 (daily/)
파일: `wiki/daily/YYYY-MM-DD.md`

오늘 날짜 파일이 있으면 **추가(append)**, 없으면 **생성**. 형식:

```markdown
---
date: YYYY-MM-DD
sessions: N
---
# YYYY-MM-DD 작업일지

## 세션 N (HH:MM 추정)
### 작업 내용
- [ 커밋/작업 ] 내용 요약
- [ 커밋/작업 ] 내용 요약

### 변경된 파일
- `path/to/file` — 변경 사유

### 논의 사항
- 논의 내용 요약

### 다음 단계
- 다음에 할 일
```

### Step 3: 기능별 개발 히스토리 (features/)
파일: `wiki/features/{feature_name}.md`

이번 세션에서 특정 기능(전투, 맵, UI 등)에 대한 작업이 있었다면 해당 기능 파일을 **갱신 또는 생성**. 형식:

```markdown
---
feature: 기능 이름
status: planning | in-progress | done | on-hold
last_updated: YYYY-MM-DD
---
# {Feature Name} 개발 히스토리

## 개요
기능에 대한 1-2줄 설명

## 타임라인
| 날짜 | 작업 | 상세 |
|------|------|------|
| YYYY-MM-DD | 작업 종류 | 상세 내용 |

## 현재 상태
- 현재 구현 상태, 알려진 이슈, 다음 단계

## 관련 파일
- `path/to/file` — 역할
```

### Step 4: 의사결정 로그 (decisions/)
파일: `wiki/decisions/DEC-NNN.md`

이번 세션에서 설계/기술/방향성 결정이 있었다면 기록. 형식:

```markdown
---
id: DEC-NNN
date: YYYY-MM-DD
status: decided | revisiting | superseded
supersedes: DEC-XXX  # 이전 결정을 대체하는 경우
---
# DEC-NNN: 결정 제목

## 맥락
왜 이 결정이 필요했는가

## 선택지
1. **선택지 A** — 장단점
2. **선택지 B** — 장단점

## 결정
선택한 방향과 근거

## 영향
이 결정이 영향을 미치는 시스템/문서/코드
```

### Step 5: 인덱스 갱신
`wiki/WIKI_INDEX.md`의 각 섹션에 새로 생성/갱신한 파일 링크를 추가.
- Daily: 최신순 정렬
- Features: 알파벳순
- Decisions: 번호순

## 규칙
- 한국어로 작성 (코드/경로/기술 용어는 영문 유지)
- 간결하게. 핵심만 기록. 장황한 서술 금지.
- 이미 존재하는 daily 파일은 덮어쓰지 않고 세션을 추가
- 의사결정 번호는 WIKI_INDEX.md의 마지막 번호 +1
- 커밋 해시가 있으면 포함
