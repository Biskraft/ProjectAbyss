# 폐기 용어 목록 (Deprecated Terms)

> 출처: `Design/Documents/Terms/Glossary.md` §12
> 이 목록은 Glossary의 폐기 용어 섹션과 동기화 상태를 유지해야 합니다.

## 검색 대상 폐기 용어

| 폐기 용어 | 현재 용어 | 현재 ID | 변경 시점 | 비고 |
|:---|:---|:---|:---|:---|
| Plasma | 타이탄 해머 | `WEP_MEL_HMR_TTN` | 2026-02 | 구 공성 무기명 |
| Diamond | Tech Unit | `Res_Tech_Unit` | 2026-02 | 구 자원명 |
| Emerald | Core Module | `Res_Core_Module` | 2026-02 | 구 자원명 |
| Plastic | Tech Unit | `Res_Tech_Unit` | 2026-02 | 중간 단계 자원명 |
| Uranium | Core Module | `Res_Core_Module` | 2026-02 | 중간 단계 자원명 |
| Scrap Metal | Scrap Parts | `Res_Scrap_Parts` | 2026-01 | 구 기본 자원명 |

## grep 검색 패턴

Layer 4 실행 시 아래 패턴을 `grep_search`에 사용합니다:

```
"Plasma" — 단, "Plasma" 단독 검색 시 false positive 주의 (맥락 확인 필요)
"Diamond" — 맥락 확인 필요 (보석 언급 vs 자원명)
"Emerald" — 맥락 확인 필요
"Plastic" — Tech Unit 맥락에서 사용 시 폐기
"Uranium" — Core Module 맥락에서 사용 시 폐기
"Scrap Metal" — 항상 폐기 (Scrap Parts로 교체)
```

## 검색 제외 대상

- `Glossary.md` 자체 (폐기 용어 정의 문서이므로)
- `deprecated_terms.md` 자체 (본 파일)
- `.git/` 디렉토리
- `Reference/` 디렉토리 (외부 참고 자료)

## 동기화 규칙

새로운 폐기 용어가 추가되면:

1. `Glossary.md` §12에 먼저 등록
2. 이 파일도 동일하게 업데이트
3. Layer 4 재실행으로 잔존 사용처 탐지
