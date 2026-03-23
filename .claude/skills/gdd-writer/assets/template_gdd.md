# [시스템 이름] (System Name)

## 🏗️ 구현 현황 (Implementation Status)

> **최근 업데이트:** [YYYY-MM-DD]
> **문서 상태:** `작성 중 (Draft)` / `진행 중 (Living)` / `완료 (Stable)`

| 기능 ID | 분류 | 기능명 (Feature Name) | 우선순위 | 목표 스프린트 | 구현 상태 | 비고 (Notes) |
| :--- | :--- | :--- | :---: | :---: | :--- | :--- |
| **[ID]** | 시스템 | **[기능명]** | P1 | S1 | 📅 대기 | [설명] |

---

## 0. 필수 참고 자료 (Mandatory References)

* **Writing Standards:** `Design/Documents/GDD_Writing_Rules.md`
* **Project Definition:** `Design/Documents/Project_Vision_Z.md`

---

## 1. 개요 (Concept)

### 1.1. Intent (의도)

* **What are you trying to fix?**
  * [이 시스템이 해결하고자 하는 문제나 제공하고자 하는 핵심 재미를 서술합니다.]

### 1.2. Reasoning (설계 의도)

* **Why this approach?**
  * [왜 이 방식을 선택했는지, 다른 대안보다 나은 점은 무엇인지 설명합니다.]

### 1.3. Cursed Problem Check

* **Promise:** [플레이어에게 주는 약속 A] vs [약속 B]
* **Sacrifice:** [충돌 시 무엇을 희생하거나 제약할지 명시]

---

## 2. 메커닉 (Mechanics)

### 2.1. [메커닉 이름]

* **Player Action:** 플레이어는 [행동] 할 수 있다.
* **System Reaction:** 시스템은 [조건] 시 [반응] 한다.
* **Effect:** 그 결과로 [효과]가 발생한다.

---

## 3. 규칙 (Rules)

### 3.1. [규칙 이름]

* **조건 (Condition):** [규칙이 적용되는 구체적 조건]
* **처리 (Process):** [구체적인 처리 로직]
  * *Example:* A상태일 때 B를 누르면 C가 된다.
  * 모호한 표현 금지.

### 3.2. [상호작용 규칙]

* **Interaction:** [다른 시스템과의 상호작용 정의]

---

## 4. 데이터 & 파라미터 (Parameters)

### 4.1. Config Data

```yaml:config_name
# 이 데이터는 예시이며, 실제 밸런싱은 CSV/Table에서 관리합니다.
base_value: 100
multiplier: 1.5
cooldown: 5.0
```

### 4.2. Linked Data

* **[데이터 이름]:** `[Path/To/Data.csv](Link)`

---

## 5. 예외 처리 (Edge Cases)

### 5.1. [예외 상황 이름]

* **상황:** [네트워크 단절, 동시 입력, 자원 부족 등]
* **처리:** [해당 상황에서의 시스템 동작 정의]

---

## 다이어그램 (Diagrams)

> 최소 1개의 Mermaid 다이어그램을 포함하세요. 아래 중 문서 내용에 적합한 것을 선택:

### [선택] 유저 플로우

```mermaid
flowchart TD
    classDef userAction fill:#4CAF50,color:#fff
    classDef systemProcess fill:#2196F3,color:#fff
    classDef condition fill:#FF9800,color:#fff

    A[/유저 액션/]:::userAction --> B{조건 분기}:::condition
    B -->|조건 A| C[시스템 처리]:::systemProcess
    B -->|조건 B| D[시스템 처리]:::systemProcess
```

---

## 코칭 질문 (Follow-up Questions)

**Q1.** [설계 의도 관련 - "왜 이 방식을 선택했는가?"]

**Q2.** [Risk & Reward 관련 - "리스크와 보상이 균형잡혔는가?"]

**Q3.** [확장성 관련 - "이 시스템은 어떻게 진화할 수 있는가?"]
