# Fina 산출물 보관 정책 (Deliverable Workflow)

> **문서 ID:** WFL-FINA-001
> **문서 상태:** Draft (락 — 2026-05-24)
> **담당:** Victor (검수·결정권), Fina (시나리오·내러티브 작성)
> **목적:** 외부 시나리오 작가 Fina 의 산출물에 대한 *위치·표기·검수 워크플로우* 의 SSoT.

## 0. 배경

2026-05-24 외부 시나리오 작가 **Fina** 합류로 ECHORIS 팀 = Victor (개발/총괄) + Fina (시나리오/내러티브) 2인 구성. Fina 산출물의 일관된 보관·표기·검수 절차를 락한다. memory `project_team_fina.md` 참조.

### 0.1. 언어 프로토콜 (2026-05-24 락)

Fina = 필리핀 국적, 영어 native-level writing.

| 방향 | 언어 |
|:--|:--|
| Claude/Victor → Fina (brief·과제 요청·피드백) | **영어** (Fina 작문 강점 호흡) |
| Fina → Project (산출물·문서) | **영어** (CNT-NME-001 검증) |
| Claude → Victor (한국어 설명·검수 노트·메모리) | **한국어** (기존 규칙 유지) |

**원칙:** 한국어로 brief 작성 후 영어 번역하지 말 것. 영어로 *처음부터* 작성. Claude 가 Victor 에게는 brief 의 요지만 한국어로 *설명*.

---

## 1. 산출물 카테고리 & 위치

| 카테고리 | 위치 | 파일명 규칙 | 예시 |
|:--|:--|:--|:--|
| **프로젝트 메타** (이름 어원·세계관 한 줄 정의 등) | `Documents/Content/` | `Content_Project_*.md` | `Content_Project_Name_Etymology.md` |
| **핵심 시놉시스** | `Documents/Content/Content_Story_Synopsis.md` | (단일 파일) | §1~§10 신규 영역 추가 |
| **개별 아이템 서사** | `Documents/Content/` | `Content_Item_Narrative_*.md` | `Content_Item_Narrative_SurveyorEchoWedge.md` |
| **캐릭터·NPC 정의** | `Documents/Content/Character/` | `Content_Character_*.md` | (예정) `Content_Character_Erda.md` |
| **세계관 lore 확장** | `Documents/Content/Content_World_Bible.md` | (단일 SSoT, 절 추가) | Layer 1-5 확장 |
| **대사 raw** | `Documents/Content/Dialogue/` | `Content_Dialogue_*.md` | (예정) `Content_Dialogue_Rustborn.md` |
| **외전·단편 글** | `Documents/Content/SideStory/` | `Content_SideStory_*.md` | (예정) |

> **위치 원칙:** 모든 Fina 산출물은 `Documents/Content/` 하위. `Documents/Design/` (설계 원칙·시스템 철학) / `Documents/System/` (메커닉) / `Documents/Terms/` (메타) 에는 직접 작성 금지. 시스템 영향이 있는 경우 Victor 가 Design/System 문서에 *반영* 만 수행.

---

## 2. 문서 헤더 표기 규칙

모든 Fina 작성 문서는 다음 메타 블록을 *문서 최상단* 에 포함한다:

```markdown
# {제목}

> **문서 ID:** {카테고리 prefix}-{NNN}
> **문서 상태:** Draft / Established (canon)
> **작성일:** YYYY-MM-DD
> **작성자:** Fina (외부 시나리오 작가, 합류 2026-05-24)
> **담당:** Narrative Director (검수)
> **개정 사유:** {왜 작성·갱신했는가}
```

**문서 ID prefix 체계:**

| Prefix | 카테고리 |
|:--|:--|
| CNT-NME-NNN | 프로젝트 메타 (Name, Etymology, Catchphrase) |
| CNT-STR-NNN | Story Synopsis (단일) |
| CNT-ITM-NNN | Item Narrative |
| CNT-CHR-NNN | Character |
| CNT-DLG-NNN | Dialogue |
| CNT-SDE-NNN | SideStory |
| CNT-WLD-NNN | World Bible 절 확장 |

---

## 3. 검수 워크플로우

```
Fina 작성 (Draft)
    ↓
narrative-director 에이전트 검수 (전략·세계관 정합)
    ↓
narrative-designer 에이전트 검수 (spec 구조·F-01~F-14 체크리스트)
    ↓
Victor 최종 검수 (시스템·일정·산출물 영향 평가)
    ↓
Established (canon) 표시 + 메모리·인덱스·mkdocs 갱신
```

| 단계 | 책임자 | 검증 항목 |
|:--|:--|:--|
| 1. 작성 | Fina | 카테고리 위치·표기 규칙·문서 ID prefix·작성자 헤더 |
| 2. 전략·세계관 정합 | narrative-director | DEC-033/036/038/039/041/042/043 정합, 1차 niche 디버전스 0, 락된 backbone 충돌 0 |
| 3. spec 구조 | narrative-designer | SYS-INS-01 v1.1 포맷 (아이템 서사 한정), 한정흥 §8.2 정합, 판타지 톤 0건, 에르다 대사 0건 |
| 4. 최종 검수 | Victor | 시스템 영향·일정·스코프·외부 노출 영향 |
| 5. 락 | Victor | 메모리·`Document_Index`·`mkdocs.yml`·`Roadmap_GDD_MasterPlan` 갱신 |

> **위반 시:** 어느 단계에서 거절되면 Fina 에게 사유 + 정합 가이드와 함께 반려. Fina 가 수정 후 1단계로 복귀.

---

## 4. 작성자 크레딧 표기

| 컨텍스트 | 표기 |
|:--|:--|
| 문서 헤더 | `**작성자:** Fina (외부 시나리오 작가, 합류 2026-05-24)` |
| 메모리·인덱스 | `(Fina, YYYY-MM-DD)` 1회 명시 |
| 게임 인게임 크레딧 | 별도 결정 (Fina 본명·핸들·페르소나 선택 — user_persona_kr_community 정책 준수) |
| 공개 마케팅 | 본명·회사 비노출 기조 (user_external_exposure_risk 정합). 추후 결정 |

---

## 5. 프로세스 원칙

- **시스템 영향 격리:** Fina 산출물이 시스템·코드·CSV·일정에 영향을 주는 경우 *Fina 가 직접 시스템 문서를 수정하지 않는다*. Victor 가 영향을 시스템 문서에 반영하는 별도 패스를 갖는다.
- **마크다운 규칙:** `Documents/Terms/GDD_Writing_Rules.md` 준수. 링크 뒤 공백 필수. MD 에 `~` 금지(feedback_no_tilde_in_md). 영어/한국어 혼용은 본 문서처럼 *원문 영어 + 한국어 핵심 요약* 패턴 권장.
- **레퍼런스 태깅:** 게임/문학/영상 레퍼런스 인용 시 [확인함]/[추측임]/[근거 없음] 태그 필수 (feedback_reference_tagging).
- **DEC-041 정합:** 판타지 톤(왕국·중세 기사·용병·갑옷) 어휘 0건. 위반 시 즉시 거절. SurveyorEchoWedge(CNT-ITM-001 신판) 가 기준 예시.
- **DEC-042 정합:** 한정흥(恨情興) 골격은 *근간 정서* 로만 작동. 명시 어휘 금지(영어 마케팅 정합).
- **DEC-043 정합:** 다중 결말 3+1 구조. 결말 = *완료* 가 아닌 *통과지점*. 새 게임+ 어휘 금지.

---

## 6. 향후 확장 시 갱신 항목

- Fina 산출물이 N개 누적 시 `CNT-{카테고리}` 별 인덱스 자동화 검토
- Fina ↔ Victor 의사소통 채널 (별도 메신저·이메일·문서 코멘트) 별도 결정
- 계약 형태·크레딧·외부 노출 정책 별도 결정 (project_company_name 사업자 미등록 상태)

---

**Cross-references:**
- `memory/project_team_fina.md` — Fina 합류 메모리
- `memory/project_solo_developer.md` — 개발 영역 1인 유지
- `memory/user_persona_kr_community.md` — 페르소나 정책
- `Documents/Content/Content_Project_Name_Etymology.md` — Fina 첫 산출물 (CNT-NME-001)
