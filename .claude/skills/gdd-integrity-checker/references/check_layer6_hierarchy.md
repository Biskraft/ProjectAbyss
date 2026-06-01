# Layer 6 — 계층 정합성 검증 규칙 (Hierarchy Consistency)

> 권위 SSoT: `Documents/Terms/Document_Authority_Map.md` (T-07)
> 역인덱스 도구: `Sheets/tools/authority_index.mjs`

## 개념

Layer 1-5는 평면 검증이다. Layer 6은 계층 검증 — 상위 문서(Terms/Design)가 하위 문서(System/Content)의 권위 기준이며, 하위는 상위 캐논을 위배할 수 없다. 정규식이 아니라 의미 대조이므로 에이전트가 수행한다.

권위 두 축(직교):
- 규칙/원칙 축: 상위 → 하위 (Layer 6 담당)
- 수치 축: CSV → 문서 (Layer 1 담당)

## 권위 계층 (T-07 §2)

| Tier | 문서군 | 권위 |
| :--- | :--- | :--- |
| 0 | CLAUDE.md, Glossary(T-03), Writing Rules(T-02) | 전역 |
| 1 | Design D-01~D-20 | 도메인 원칙 |
| 2 | System SYS-* | 메커닉 규칙 |
| 3 | Content/UI/Spec CNT-*/UI-*/PLN-* | 인스턴스 |

도메인 SSoT(중간 권위): D-20(월드), D-07(경제), PLN-RELIC(렐릭), Glossary(용어).

## 실행 절차

### 1. 역인덱스 + 변경 감지

```
node Sheets/tools/authority_index.mjs          # 부모→자식 + 준거 선언 누락
node Sheets/tools/authority_index.mjs --git    # git 변경 상위 → 재검증 큐
node Sheets/tools/authority_index.mjs --changed D-20   # 특정 상위 → 재검증 큐
```

전체 검증 시: 모든 도메인 SSoT를 상위로 보고 하위 전수 점검.
변경 기반 검증 시: `--git`/`--changed` 큐의 하위만 점검(효율).

### 2. 의미 대조 (각 하위 문서)

해당 하위의 준거 상위(`> **준거 상위 (Authority):** ...` 선언)를 읽고, 각 상위 문서의 캐논 주장과 하위를 대조한다.

상위 캐논 주장 추출 대상:
- DEC 결정 (DEC-001 등)
- 확정값/규칙 (예: D-20 "상승 주축", 렐릭 11종, 경제 sink 원칙)
- 정의 (Glossary 용어 정의)
- SSoT 선언 (예: "본 문서가 월드 권위")

### 3. 위배 판정 (T-07 §5)

| 유형 | 예 |
| :--- | :--- |
| 1. 폐기 개념 사용 | 하위가 Glossary 폐기어/폐기 시스템 사용 |
| 2. 확정값·규칙 불일치 | 하위가 상위 확정값과 다른 수치/규칙 기술 |
| 3. 정의 모순 | 하위 정의가 상위 정의와 충돌 |
| 4. SSoT 영역 독자 재정의 | 도메인 SSoT가 정한 영역을 하위가 임의 재정의 |
| 5. 상위 변경 후 stale | 상위 갱신 반영 안 된 옛 기준 잔존 |

> 실제 사례: D-20이 "수직 하강 → 상승 주축"으로 갱신됐는데 SYS-WLD-01이 여전히 "하강"이면 유형 5 위배.

### 4. 준거 선언 점검

- `준거 상위 (Authority)` 선언이 없는 비-Tier0 문서는 "계층 미연결" 경고(검증 사각).
- 선언된 상위 ID가 Document_Index에 없으면 "잘못된 권위 참조" 경고.

## 보고 포맷

```
[Layer 6] 계층 정합성
  변경 상위: D-20
  재검증 하위: PLN-IWPROG, PLN-RELIC, PLN-SHOP
  위배:
    - PLN-SHOP §7 : Legendary 판매가 명시 ↔ D-07 "Legendary+ 귀속(판매 불가)" 위배(유형 2)
      권고: PLN-SHOP §7 수정 또는 D-07 재확인
  선언 누락(계층 미연결): SYS-WLD-02, CNT-CHR-001, ...
```

## 주의

- 의미 대조는 신중히. 표현 차이(동의어)와 실제 모순을 구분한다.
- 상위-하위 충돌 시 기본 권고는 "하위 수정"이나, 코드 실측이 상위와 다르면 상위 재확인을 권고(코드가 진실인 영역).
- 내러티브 캐논 미확정 영역(리셋 라운드 진행 중)은 위배가 아니라 "캐논 대기"로 분류.
