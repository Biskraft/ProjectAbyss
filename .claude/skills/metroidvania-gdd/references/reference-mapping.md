# 레퍼런스 매핑 (Reference Mapping)

## 1. 문제 유형 → 레퍼런스 매핑

| 문제 유형 | 핵심 레퍼런스 | 보조 레퍼런스 |
| :--- | :--- | :--- |
| Metroidvania 구조/게이트 설계 | `Reference/캐슬바니아 시스템 분석.md` | `Reference/Metroidvania Game Design Deep Dive.md` |
| Item World/야리코미 시스템 | `Reference/디스가이아 시스템 분석.md` | `Reference/Disgaea_ItemWorld_Reverse_GDD.md` |
| 절차적 레벨 생성 | `Reference/Spelunky-LevelGeneration-ReverseGDD.md` | - |
| GDD 작성법/문서 품질 | `Reference/게임 기획서 작성법 (Damion Schubert GDC).md` | `Reference/designdocs_인사이트.md` |
| 게임 디자인 원칙 | `Reference/sakurai_인사이트.md` | `Reference/timcain_인사이트.md` |
| 레벨 디자인/공간 설계 | `Reference/jonastyroller_인사이트.md` | `Reference/noclip_인사이트.md` |
| 게임 디자인 교육 | `Reference/extracredit_인사이트.md` | - |
| 전체 기획 개요/비전 | `Reference/게임 기획 개요.md` | - |
| 위키 데이터 (캐슬바니아) | `Reference/WIKI_INDEX.md` | `Reference/castlevania-wiki-md/` |
| 위키 데이터 (디스가이아) | `Reference/WIKI_INDEX.md` | `Reference/disgaea-wiki-md/` |

---

## 2. 도메인별 Quick Reference

### 전투 (Combat)

| 참고 주제 | 경로 | 핵심 내용 |
| :--- | :--- | :--- |
| 캐슬바니아 전투 | `Reference/캐슬바니아 시스템 분석.md` | 무기 유형, 서브웨폰, RPG 스탯 |
| 디스가이아 전투 | `Reference/디스가이아 시스템 분석.md` | 데미지 공식, 원소 상성 |
| 사쿠라이 밸런스 철학 | `Reference/sakurai_인사이트.md` | Risk & Reward, 밸런스 관점 |

### 탐험/월드 (Exploration/World)

| 참고 주제 | 경로 | 핵심 내용 |
| :--- | :--- | :--- |
| SotN 성 구조 | `Reference/캐슬바니아 시스템 분석.md` | 비선형 맵, 능력 게이트 |
| Metroidvania 심층 분석 | `Reference/Metroidvania Game Design Deep Dive.md` | 장르 핵심 메카닉 |
| Spelunky 레벨 생성 | `Reference/Spelunky-LevelGeneration-ReverseGDD.md` | 시드 기반 절차적 생성, 룸 템플릿 |
| 레벨 디자인 원칙 | `Reference/jonastyroller_인사이트.md` | 공간 설계, 플레이어 유도 |

### Item World / 야리코미 (Yarikomi)

| 참고 주제 | 경로 | 핵심 내용 |
| :--- | :--- | :--- |
| Item World 역분석 | `Reference/Disgaea_ItemWorld_Reverse_GDD.md` | 100층 구조, 보상 시스템, Innocent |
| 디스가이아 전체 시스템 | `Reference/디스가이아 시스템 분석.md` | Item World, 전생, 의회, 마계 |
| 절차적 생성 | `Reference/Spelunky-LevelGeneration-ReverseGDD.md` | Room Template, Critical Path |

### 멀티플레이/온라인 (Multiplayer/Online)

| 참고 주제 | 경로 | 핵심 내용 |
| :--- | :--- | :--- |
| 게임 기획 개요 | `Reference/게임 기획 개요.md` | 3-Space 모델, 자동사냥 3-tier |
| 소셜 디자인 | `Reference/extracredit_인사이트.md` | 소셜 메카닉, 커뮤니티 |

### GDD 작성/프로세스 (Writing/Process)

| 참고 주제 | 경로 | 핵심 내용 |
| :--- | :--- | :--- |
| Damion Schubert 12 Rules | `Reference/게임 기획서 작성법 (Damion Schubert GDC).md` | 12가지 작성 규칙, INVEST |
| 기획 문서 프로세스 | `Reference/designdocs_인사이트.md` | 문서화 프로세스, 반복 설계 |
| Tim Cain 설계 철학 | `Reference/timcain_인사이트.md` | Player Agency, Design Pillars |

---

## 3. 레퍼런스 사용 4단계

Step 1: 문제 유형 식별
- 사용자의 요청에서 어떤 도메인의 문제인지 파악

Step 2: 핵심 레퍼런스 읽기
- 매핑 테이블에서 핵심 레퍼런스를 찾아 관련 섹션 확인

Step 3: 원칙 추출
- 레퍼런스에서 현재 설계에 적용 가능한 원칙 추출

Step 4: 적용 및 인용
- GDD 문서에 레퍼런스 원칙을 적용하고, 출처를 필수 참고 자료에 기재

---

## 4. 웹 리서치 가이드 (역분석 모드)

역분석 모드에서 웹 리서치 시 우선 검색 대상:

| 정보 유형 | 검색 소스 | 비고 |
| :--- | :--- | :--- |
| 게임 메카닉 상세 | 위키 (Fandom, Wikia) | 수치 데이터 풍부 |
| 개발자 인터뷰 | GDC Vault, Gamasutra | 설계 의도 파악 |
| 커뮤니티 분석 | Reddit, GameFAQs | 플레이어 관점 |
| 수치 데이터 | DataMine 사이트, 위키 | 역공학 수치 |
| 밸런스 패치 노트 | 공식 사이트 | 변경 이력 |
