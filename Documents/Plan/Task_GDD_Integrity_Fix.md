# Task: GDD 정합성 수정 — P0 + P1 전체

> **대상:** Codex CLI 또는 구현 에이전트
> **작업일:** 2026-04-12
> **출처:** GDD 5-Layer 정합성 검증 결과
> **범위:** Documents/ 내 .md 파일만 수정. 코드/CSV 절대 금지.
> **인코딩 규칙:** 반드시 UTF-8로 읽고 쓸 것. PowerShell Get-Content/Set-Content 금지.

---

## P0-1. Design_Combat_Philosophy.md — MP 시스템 섹션 제거

**파일:** `Documents/Design/Design_Combat_Philosophy.md`

System_Combat_Damage.md에서 MP는 DEPRECATED 선언됨. 그런데 이 파일은 MP를 활성 설계로 기술 중. 충돌 해소.

**작업:**
1. 222-250줄대의 "MP + 쿨다운 이중 비용" 섹션 → **전체 삭제**
2. 232줄 "2-Space별 MP 긴장감 차이" 섹션 → **전체 삭제**
3. 234-248줄 MP 회복/관리 테이블 → **전체 삭제**
4. 455줄 MP 고갈 좌절감 언급 → **해당 줄 삭제**
5. 474-475줄 체크리스트의 MP 관련 항목 → **해당 줄 삭제**
6. 삭제 후 빈 섹션이 생기면 앞뒤 섹션과 자연스럽게 연결

**검증:** 파일 내 "MP"를 grep해서 0건이어야 함 (DEPRECATED 블록 제외).

---

## P0-2. 삭제 파일 참조 15곳 제거/치환

각 파일에서 삭제된 문서 참조를 제거하거나 현재 문서로 치환.

### System_Quest_Narrative.md 참조 (5곳)

| 파일 | 라인 | 현재 | 수정 |
|---|---|---|---|
| `Documents/Terms/Glossary.md` | 193 | `System_Quest_Narrative.md` 참조 | 참조 줄 삭제 |
| `Documents/Terms/Glossary.md` | 198 | `System_Quest_Narrative.md` 참조 | 참조 줄 삭제 |
| `Documents/System/System_ItemNarrative_MonsterPool.md` | 18 | `참조: Documents/System/System_Quest_Narrative.md` | → `참조: Documents/System/System_ItemNarrative_Template.md` |
| `Documents/System/System_ItemNarrative_Template.md` | 27 | `참조: Documents/System/System_Quest_Narrative.md` | 참조 줄 삭제 (자기 참조 불필요) |
| `Documents/System/System_ItemWorld_Events.md` | 17 | `Documents/System/System_Quest_Narrative.md` | 참조 줄 삭제 |

### Content_First30Min_v2.md 참조 (5곳)

| 파일 | 라인 | 수정 |
|---|---|---|
| `Documents/Plan/Phase1_Implementation_Priority.md` | 141 | `Content_First30Min_v2.md` → `Content_First30Min_ExperienceFlow.md` |
| `Documents/Content/Content_Item_Narrative_FirstSword.md` | 248 | `Content_First30Min_v2.md` → `Content_First30Min_ExperienceFlow.md` |
| `Documents/Content/Content_Item_Narrative_FirstSword.md` | 251 | `Content_First30Min_v2.md` → `Content_First30Min_ExperienceFlow.md` |
| `Documents/Research/Retention_Hour1to10_Research.md` | 10 | `Content_First30Min_v2.md` → `Content_First30Min_ExperienceFlow.md` |
| `Documents/Research/SilentTutorial_EnvironmentalTeaching_Research.md` | 518, 525 | `Content_First30Min_v2.md` → `Content_First30Min_ExperienceFlow.md` |

### ItemWorld_RecursiveEntry_Research.md 참조 (4곳)

| 파일 | 라인 | 수정 |
|---|---|---|
| `Documents/Research/BLAME_Biomega_WorldDesign_Research.md` | 9 | 참조 줄에 `(archived, removed 2026-04-10)` 추가 |
| `Documents/System/System_ItemWorld_Events.md` | 17 | 참조 줄 삭제 |
| `Documents/Research/RESEARCH_INDEX.md` | 45 | 항목에 `(REMOVED)` 표기 추가 |
| `Documents/Terms/Document_Index.md` | 383 | 상태를 `REMOVED` 로 변경 |

### HubSpace_Social_Design_Research.md 참조 (1곳)

| 파일 | 라인 | 수정 |
|---|---|---|
| `Documents/Research/Memory Shard_Multiplayer_Social_Research.md` | 9 | 참조 줄에 `(archived, removed 2026-04-10)` 추가 |

---

## P1-3. "3-Space" → "2-Space" 25곳 치환

**대상 파일:** Documents/ 내 .md (Research/ 제외)
**규칙:**
- DEPRECATED 블록(`>` 인용) 안의 "2-Space" 역사 기록은 건드리지 않음
- 활성 본문/섹션 제목/테이블의 "3-Space" → "2-Space"
- `Design_Architecture_2Space.md:333`의 변경 이력 "3-Space → 2-Space"는 유지

**주요 파일:**
- `Design_Combat_Philosophy.md` — 4곳 (MP 섹션 삭제 후 남은 것 확인)
- `Design_CoreLoop_Circulation.md` — 4곳 (10, 62, 297, 299줄)
- `Design_Difficulty_Progression.md` — 2곳 (20, 139줄)
- `Design_Economy_FaucetSink.md` — 3곳 (29, 98, 165줄)
- `Content_World_Bible.md` — 1곳
- 기타 약 11곳

**방법:** Python으로 UTF-8 읽기/쓰기. DEPRECATED 블록(`>` 시작 라인)은 건너뜀.

```python
import re
# 각 파일에 대해:
# lines = file.readlines()
# for i, line in enumerate(lines):
#   if line.strip().startswith('>'):
#     continue  # DEPRECATED 블록 스킵
#   lines[i] = line.replace('3-Space', '2-Space')
```

---

## P1-4. Weapon Range SSoT — 문서화만

**파일:** `Documents/System/System_Combat_Weapons.md`
**작업:** 다음 주석을 파라미터 섹션에 추가:

```markdown
> **SSoT 주의:** CSV(`Content_Stats_Weapon_List.csv`)의 Range 값은 추상 수치(48-60)이며,
> 코드(`weapons.ts`)에서 픽셀 단위(64-76)로 변환됩니다. 변환식: `pixelRange = csvRange + 16`.
> 밸런스 조정 시 CSV를 수정하고 코드 변환은 자동 적용됩니다.
```

(Victor가 변환식이 다르면 수정 필요 — "+16"은 현재 데이터 기준 추정)

---

## P1-5. Document_Index + Roadmap 상태 갱신

### Document_Index.md
- CNT-EXP-002 (`Content_First30Min_v2.md`) 상태 → `REMOVED (ExperienceFlow.md로 대체)`
- RES-IW-RE-01 (`ItemWorld_RecursiveEntry_Research.md`) 상태 → `REMOVED`

### Development_Roadmap.md
- 447줄 SYS-IW-04 상태 "신규" → `REMOVED (재귀 진입 폐기, DEC-001)`

---

## P2-7. 패링 1줄 수정

**파일:** `Documents/System/System_Enemy_AI.md`
**라인:** 285
**현재:** `... 거리 관리, **패링 타이밍** |`
**수정:** `... 거리 관리, **회피 타이밍** |`

---

## 실행 규칙

1. **UTF-8 인코딩 필수.** PowerShell `Get-Content`/`Set-Content` 절대 금지. Python `open(f, encoding='utf-8')` 사용.
2. **Documents/ 내 .md 파일만 수정.** game/src/, Sheets/ 절대 금지.
3. **각 파일 수정 후 `file` 명령으로 "UTF-8 Unicode text" 확인.**
4. **작업 완료 후 단일 커밋:**

```
fix(docs): GDD 정합성 P0+P1 수정 — MP 섹션 제거, 삭제 참조 치환, 2-Space 정리

## P0-1: Design_Combat_Philosophy.md MP 시스템 섹션 제거
## P0-2: 삭제 파일 참조 15곳 제거/치환
## P1-3: 3-Space → 2-Space 25곳 치환 (Python UTF-8)
## P1-4: Weapon Range SSoT 주석 추가
## P1-5: Document_Index + Roadmap 상태 갱신
## P2-7: 패링→회피 1줄 수정

Ref: GDD 5-Layer 정합성 검증 (2026-04-12)

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
```

5. **커밋 전 `git diff --stat` 확인.** 예상: 20-25개 .md 파일 변경. 그 이상이면 중단하고 보고.
