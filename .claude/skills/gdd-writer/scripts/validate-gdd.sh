#!/bin/bash
# ProjectZ GDD 문서 품질 검증 스크립트 v1.0
# 사용법: bash validate-gdd.sh <GDD파일경로 또는 디렉토리>
# 예: bash validate-gdd.sh Documents/System_Combat_Damage.md
# 예: bash validate-gdd.sh Documents/  (디렉토리 내 모든 .md 검증)

set -euo pipefail

# ========================================
# 색상 코드
# ========================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

# ========================================
# 전역 카운터
# ========================================
PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0
TOTAL_COUNT=0

L1_PASS=0; L1_TOTAL=0
L2_PASS=0; L2_TOTAL=0

FAIL_GUIDES=()

# ========================================
# 유틸리티 함수
# ========================================
check_pass() {
    local level="$1"; local msg="$2"
    echo -e "  ${GREEN}[PASS]${NC} $msg"
    PASS_COUNT=$((PASS_COUNT + 1)); TOTAL_COUNT=$((TOTAL_COUNT + 1))
    case "$level" in
        L1) L1_PASS=$((L1_PASS + 1)); L1_TOTAL=$((L1_TOTAL + 1)) ;;
        L2) L2_PASS=$((L2_PASS + 1)); L2_TOTAL=$((L2_TOTAL + 1)) ;;
    esac
}

check_fail() {
    local level="$1"; local msg="$2"; local guide="${3:-}"
    echo -e "  ${RED}[FAIL]${NC} $msg"
    FAIL_COUNT=$((FAIL_COUNT + 1)); TOTAL_COUNT=$((TOTAL_COUNT + 1))
    case "$level" in
        L1) L1_TOTAL=$((L1_TOTAL + 1)) ;;
        L2) L2_TOTAL=$((L2_TOTAL + 1)) ;;
    esac
    if [ -n "$guide" ]; then
        FAIL_GUIDES+=("$msg -> $guide")
    fi
}

check_warn() {
    local level="$1"; local msg="$2"
    echo -e "  ${YELLOW}[WARN]${NC} $msg"
    WARN_COUNT=$((WARN_COUNT + 1)); TOTAL_COUNT=$((TOTAL_COUNT + 1))
    case "$level" in
        L1) L1_TOTAL=$((L1_TOTAL + 1)) ;;
        L2) L2_TOTAL=$((L2_TOTAL + 1)) ;;
    esac
}

# 파일 내 패턴 존재 여부 (단일 파일)
file_has() {
    local file="$1"; local pattern="$2"
    grep -qiE "$pattern" "$file" 2>/dev/null
}

# 파일 내 패턴 카운트 (단일 파일)
file_count() {
    local file="$1"; local pattern="$2"
    local result
    result=$(grep -ciE "$pattern" "$file" 2>/dev/null) || true
    result=$(echo "$result" | tr -d '[:space:]')
    if [ -z "$result" ] || [ "$result" = "0" ]; then
        echo "0"
    else
        echo "$result"
    fi
}

# 코드 블록 밖의 텍스트만 추출 (```...``` 블록 제거)
strip_code_blocks() {
    local file="$1"
    awk '/^```/{skip=!skip; next} !skip{print}' "$file"
}

# 파일명에서 접두사 추출
get_prefix() {
    local filename
    filename=$(basename "$1")
    echo "$filename" | sed -n 's/^\([A-Za-z]*\)_.*/\1/p'
}

# ========================================
# 단일 파일 검증 함수
# ========================================
validate_single_file() {
    local FILE="$1"
    local FILENAME
    FILENAME=$(basename "$FILE")
    local PREFIX
    PREFIX=$(get_prefix "$FILE")

    # 카운터 리셋
    PASS_COUNT=0; FAIL_COUNT=0; WARN_COUNT=0; TOTAL_COUNT=0
    L1_PASS=0; L1_TOTAL=0; L2_PASS=0; L2_TOTAL=0
    FAIL_GUIDES=()

    echo ""
    echo -e "${BOLD}========================================${NC}"
    echo -e "${BOLD}  GDD 품질 검증 리포트 v1.0${NC}"
    echo -e "${BOLD}========================================${NC}"
    echo -e "대상 파일: ${BLUE}${FILE}${NC}"
    echo -e "문서 유형: ${CYAN}${PREFIX:-기타}_*${NC}"
    echo ""

    # ------------------------------------------
    # [1/10] 문서 메타데이터 (L1)
    # ------------------------------------------
    echo -e "${BOLD}[1/10] 문서 메타데이터${NC}"

    if file_has "$FILE" "구현 현황|Implementation Status"; then
        check_pass L1 "구현 현황 테이블 존재"
    else
        check_fail L1 "구현 현황 테이블 미발견" "문서 상단에 '구현 현황 (Implementation Status)' 섹션을 추가하세요"
    fi

    if file_has "$FILE" "작성 중|Draft|진행 중|Living|완료|Stable"; then
        check_pass L1 "문서 상태 표기 존재"
    else
        check_fail L1 "문서 상태 미표기" "문서 상태를 '작성 중 (Draft)' / '진행 중 (Living)' / '완료 (Stable)' 중 하나로 표기하세요"
    fi

    if file_has "$FILE" "최근 업데이트|업데이트"; then
        check_pass L1 "최근 업데이트 날짜 존재"
    else
        check_fail L1 "최근 업데이트 날짜 미발견" "메타데이터에 '최근 업데이트: YYYY-MM-DD' 형식으로 날짜를 추가하세요"
    fi

    echo ""

    # ------------------------------------------
    # [2/10] 필수 참고 자료 (L1)
    # ------------------------------------------
    echo -e "${BOLD}[2/10] 필수 참고 자료${NC}"

    if file_has "$FILE" "필수 참고 자료|Mandatory References"; then
        check_pass L1 "필수 참고 자료 섹션 존재"
    else
        check_fail L1 "필수 참고 자료 섹션 미발견" "'## 0. 필수 참고 자료 (Mandatory References)' 섹션을 추가하세요"
    fi

    if file_has "$FILE" "GDD_Writing_Rules"; then
        check_pass L1 "GDD_Writing_Rules.md 참조 링크 존재"
    else
        check_fail L1 "GDD_Writing_Rules.md 참조 미발견" "필수 참고 자료에 GDD_Writing_Rules.md 링크를 추가하세요"
    fi

    if file_has "$FILE" "Project_Vision_Z"; then
        check_pass L1 "Project_Vision_Z.md 참조 링크 존재"
    else
        check_fail L1 "Project_Vision_Z.md 참조 미발견" "필수 참고 자료에 Project_Vision_Z.md 링크를 추가하세요"
    fi

    echo ""

    # ------------------------------------------
    # [3/10] 5단계 구조 (L1) - System_*.md만
    # ------------------------------------------
    echo -e "${BOLD}[3/10] 5단계 구조 (System_ 전용)${NC}"

    if [ "$PREFIX" = "System" ]; then
        if file_has "$FILE" "개요|Concept"; then
            check_pass L1 "1단계: 개요 (Concept) 섹션 존재"
        else
            check_fail L1 "1단계: 개요 (Concept) 섹션 미발견" "System_ 문서는 '개요 (Concept)' 섹션이 필수입니다"
        fi

        if file_has "$FILE" "메커닉|Mechanics"; then
            check_pass L1 "2단계: 메커닉 (Mechanics) 섹션 존재"
        else
            check_fail L1 "2단계: 메커닉 (Mechanics) 섹션 미발견" "System_ 문서는 '메커닉 (Mechanics)' 섹션이 필수입니다"
        fi

        if file_has "$FILE" "규칙|Rules"; then
            check_pass L1 "3단계: 규칙 (Rules) 섹션 존재"
        else
            check_fail L1 "3단계: 규칙 (Rules) 섹션 미발견" "System_ 문서는 '규칙 (Rules)' 섹션이 필수입니다"
        fi

        if file_has "$FILE" "파라미터|Parameters|데이터"; then
            check_pass L1 "4단계: 파라미터 (Parameters) 섹션 존재"
        else
            check_fail L1 "4단계: 파라미터/데이터 섹션 미발견" "System_ 문서는 '파라미터 (Parameters)' 또는 '데이터' 섹션이 필수입니다"
        fi

        if file_has "$FILE" "예외 처리|Edge Cases"; then
            check_pass L1 "5단계: 예외 처리 (Edge Cases) 섹션 존재"
        else
            check_fail L1 "5단계: 예외 처리 (Edge Cases) 섹션 미발견" "System_ 문서는 '예외 처리 (Edge Cases)' 섹션이 필수입니다"
        fi
    else
        echo -e "  ${CYAN}[SKIP]${NC} System_ 문서가 아니므로 5단계 구조 검사 생략"
    fi

    echo ""

    # ------------------------------------------
    # [4/10] 설계 의도 (L1)
    # ------------------------------------------
    echo -e "${BOLD}[4/10] 설계 의도${NC}"

    if file_has "$FILE" "Intent|의도"; then
        check_pass L1 "Intent/의도 섹션 존재"
    else
        check_fail L1 "Intent/의도 섹션 미발견" "개요에 설계 Intent(의도)를 명시하세요"
    fi

    if file_has "$FILE" "Reasoning|설계 의도|설계 근거"; then
        check_pass L1 "Reasoning/설계 의도 섹션 존재"
    else
        check_fail L1 "Reasoning/설계 의도 미발견" "설계 의도(Reasoning)를 명시하세요"
    fi

    if [ "$PREFIX" = "System" ]; then
        if file_has "$FILE" "Cursed Problem|저주받은 문제"; then
            check_pass L1 "Cursed Problem Check 섹션 존재"
        else
            check_fail L1 "Cursed Problem Check 미발견" "System_ 문서에는 'Cursed Problem Check' 섹션이 필요합니다"
        fi
    fi

    echo ""

    # ------------------------------------------
    # [5/10] 파라미터 분리 (L1)
    # ------------------------------------------
    echo -e "${BOLD}[5/10] 파라미터 분리${NC}"

    if file_has "$FILE" '```yaml|```csv'; then
        check_pass L1 "YAML 또는 CSV 코드 블록 존재"
    else
        check_fail L1 "YAML/CSV 코드 블록 미발견" "파라미터는 \`\`\`yaml 또는 \`\`\`csv 코드 블록으로 분리하세요 (본문 하드코딩 금지)"
    fi

    # 본문 수치 하드코딩 탐지 (코드 블록 밖)
    local HARDCODED
    HARDCODED=$(strip_code_blocks "$FILE" | grep -ciE "데미지 [0-9]+|[0-9]+초|[0-9]+m |[0-9]+ms" 2>/dev/null) || true
    HARDCODED=$(echo "${HARDCODED:-0}" | tr -d '[:space:]')
    [ -z "$HARDCODED" ] && HARDCODED=0
    if [ "$HARDCODED" -gt 0 ]; then
        check_warn L1 "본문 수치 하드코딩 의심 ${HARDCODED}건 (코드 블록 밖 '데미지 N', 'N초', 'Nm' 등)"
    else
        check_pass L1 "본문 수치 하드코딩 미탐지"
    fi

    echo ""

    # ------------------------------------------
    # [6/10] 예외 처리 (L2)
    # ------------------------------------------
    echo -e "${BOLD}[6/10] 예외 처리${NC}"

    # 예외 상황 건수: "### [숫자]" 또는 "* **" 패턴 카운트
    local EDGE_ITEMS
    EDGE_ITEMS=$(grep -cE '### [0-9]|\* \*\*' "$FILE" 2>/dev/null) || true
    EDGE_ITEMS=$(echo "${EDGE_ITEMS:-0}" | tr -d '[:space:]')
    [ -z "$EDGE_ITEMS" ] && EDGE_ITEMS=0
    if [ "$EDGE_ITEMS" -ge 3 ]; then
        check_pass L2 "예외 상황 항목 ${EDGE_ITEMS}건 (3건 이상)"
    elif [ "$EDGE_ITEMS" -ge 1 ]; then
        check_warn L2 "예외 상황 항목 ${EDGE_ITEMS}건 (3건 이상 권장)"
    else
        check_fail L2 "예외 상황 항목 미발견" "예외 처리 섹션에 최소 3건의 예외 상황을 기술하세요"
    fi

    if file_has "$FILE" "네트워크|동시|지연|서버|클라이언트"; then
        check_pass L2 "네트워크/동시성 관련 키워드 존재"
    else
        check_warn L2 "네트워크/동시성 키워드 미발견 (네트워크 단절, 동시 입력, 서버-클라이언트 등 고려 권장)"
    fi

    echo ""

    # ------------------------------------------
    # [7/10] Mermaid 다이어그램 (L2)
    # ------------------------------------------
    echo -e "${BOLD}[7/10] Mermaid 다이어그램${NC}"

    local MERMAID_COUNT
    MERMAID_COUNT=$(file_count "$FILE" '```mermaid')
    if [ "$MERMAID_COUNT" -ge 1 ]; then
        check_pass L2 "Mermaid 코드 블록 ${MERMAID_COUNT}개 발견"
    else
        check_fail L2 "Mermaid 코드 블록 미발견" "시스템 흐름을 Mermaid 다이어그램으로 시각화하세요"
    fi

    # 접두사별 Mermaid 요구사항
    case "$PREFIX" in
        System)
            if [ "$MERMAID_COUNT" -ge 2 ]; then
                check_pass L2 "System_ 문서: Mermaid 2개 이상 충족"
            else
                check_warn L2 "System_ 문서: Mermaid ${MERMAID_COUNT}개 (flowchart + stateDiagram 등 2개 이상 권장)"
            fi
            ;;
        UI)
            if file_has "$FILE" "stateDiagram"; then
                check_pass L2 "UI_ 문서: stateDiagram 존재"
            else
                check_fail L2 "UI_ 문서: stateDiagram 미발견" "UI_ 문서에는 상태 전이를 위한 stateDiagram이 필요합니다"
            fi
            ;;
        Gadget)
            if file_has "$FILE" "sequenceDiagram"; then
                check_pass L2 "Gadget_ 문서: sequenceDiagram 존재"
            else
                check_fail L2 "Gadget_ 문서: sequenceDiagram 미발견" "Gadget_ 문서에는 동작 시퀀스를 위한 sequenceDiagram이 필요합니다"
            fi
            ;;
    esac

    echo ""

    # ------------------------------------------
    # [8/10] 마크다운 형식 (L1)
    # ------------------------------------------
    echo -e "${BOLD}[8/10] 마크다운 형식${NC}"

    # 스마트 따옴표 탐지
    local SMART_QUOTES
    SMART_QUOTES=$(grep -cnP '[\x{201c}\x{201d}\x{2018}\x{2019}]' "$FILE" 2>/dev/null) || true
    SMART_QUOTES=$(echo "${SMART_QUOTES:-0}" | tr -d '[:space:]')
    [ -z "$SMART_QUOTES" ] && SMART_QUOTES=0
    if [ "$SMART_QUOTES" -gt 0 ]; then
        check_fail L1 "스마트 따옴표 ${SMART_QUOTES}건 탐지" "스마트 따옴표를 직선 따옴표(\", ')로 교체하세요"
    else
        check_pass L1 "스마트 따옴표 미탐지"
    fi

    # 테이블 셀 내 Bold 탐지 (blockquote 제외)
    local TABLE_BOLD
    local TABLE_BOLD_HIT
    TABLE_BOLD_HIT=$(grep -E '^\|' "$FILE" 2>/dev/null | grep -v '^>' | grep -cE '\*\*[^*]+\*\*' 2>/dev/null) || true
    TABLE_BOLD_HIT=$(echo "${TABLE_BOLD_HIT:-0}" | tr -d '[:space:]')
    [ -z "$TABLE_BOLD_HIT" ] && TABLE_BOLD_HIT=0
    if [ "$TABLE_BOLD_HIT" -gt 0 ]; then
        check_fail L1 "테이블 셀 내 Bold(**) ${TABLE_BOLD_HIT}건 탐지" "테이블 셀에서 **Bold** 마크다운을 제거하세요 (blockquote > 내에서만 허용)"
    else
        check_pass L1 "테이블 셀 내 Bold 미탐지"
    fi

    # 5단계 이상 헤더
    local DEEP_HEADERS
    DEEP_HEADERS=$(grep -cE '^#{5,} ' "$FILE" 2>/dev/null) || true
    DEEP_HEADERS=$(echo "${DEEP_HEADERS:-0}" | tr -d '[:space:]')
    [ -z "$DEEP_HEADERS" ] && DEEP_HEADERS=0
    if [ "$DEEP_HEADERS" -gt 0 ]; then
        check_fail L1 "5단계 이상 헤더(#####) ${DEEP_HEADERS}건 탐지" "헤더는 최대 4단계(####)까지만 사용하세요"
    else
        check_pass L1 "헤더 깊이 규칙 준수 (4단계 이하)"
    fi

    # 한글 + 괄호 영문 헤더 형식
    local KR_EN_HEADERS
    KR_EN_HEADERS=$(grep -cE '^#{1,4} .*[가-힣].*\(.*[A-Za-z].*\)' "$FILE" 2>/dev/null) || true
    KR_EN_HEADERS=$(echo "${KR_EN_HEADERS:-0}" | tr -d '[:space:]')
    [ -z "$KR_EN_HEADERS" ] && KR_EN_HEADERS=0
    if [ "$KR_EN_HEADERS" -ge 1 ]; then
        check_pass L1 "한글 + 괄호 영문 헤더 형식 ${KR_EN_HEADERS}건 확인"
    else
        check_warn L1 "한글 + 괄호 영문 헤더 형식 미발견 (예: '## 건설 시스템 (Building System)' 권장)"
    fi

    echo ""

    # ------------------------------------------
    # [9/10] 용어 일관성 (L1)
    # ------------------------------------------
    echo -e "${BOLD}[9/10] 용어 일관성${NC}"

    local TERM_ISSUES=0

    # Plasma (단독 사용만 — Plasma Cutter 등은 WARN)
    if file_has "$FILE" "[Pp]lasma"; then
        check_warn L1 "폐기 용어 'Plasma' 탐지 (합성어 'Plasma Cutter' 등은 문맥 확인 필요)"
        TERM_ISSUES=$((TERM_ISSUES + 1))
    fi

    # Diamond (공격 패턴명으로는 정상 사용 가능 — WARN)
    if file_has "$FILE" "[Dd]iamond"; then
        check_warn L1 "폐기 자원명 'Diamond' 탐지 (공격 패턴명 Diamond는 정상 — 문맥 확인 필요)"
        TERM_ISSUES=$((TERM_ISSUES + 1))
    fi

    # Emerald
    if file_has "$FILE" "[Ee]merald"; then
        check_fail L1 "폐기 용어 'Emerald' 탐지" "Emerald는 폐기 용어입니다. 공식 자원명으로 교체하세요"
        TERM_ISSUES=$((TERM_ISSUES + 1))
    fi

    # Plastic
    if file_has "$FILE" "[Pp]lastic"; then
        check_fail L1 "폐기 용어 'Plastic' 탐지" "Plastic은 폐기 용어입니다. 공식 자원명으로 교체하세요"
        TERM_ISSUES=$((TERM_ISSUES + 1))
    fi

    # Uranium
    if file_has "$FILE" "[Uu]ranium"; then
        check_fail L1 "폐기 용어 'Uranium' 탐지" "Uranium은 폐기 용어입니다. 공식 자원명으로 교체하세요"
        TERM_ISSUES=$((TERM_ISSUES + 1))
    fi

    # Scrap Metal
    if file_has "$FILE" "[Ss]crap [Mm]etal"; then
        check_fail L1 "폐기 용어 'Scrap Metal' 탐지" "Scrap Metal -> Scrap Parts로 교체하세요"
        TERM_ISSUES=$((TERM_ISSUES + 1))
    fi

    if [ "$TERM_ISSUES" -eq 0 ]; then
        check_pass L1 "폐기 용어 미탐지"
    fi

    echo ""

    # ------------------------------------------
    # [10/10] CSV 연동 (L2)
    # ------------------------------------------
    echo -e "${BOLD}[10/10] CSV 연동${NC}"

    if file_has "$FILE" "Content_.*\.csv"; then
        check_pass L2 "CSV 파일 참조 링크 존재 (Content_*.csv)"
    else
        check_fail L2 "CSV 파일 참조 미발견" "관련 CSV 데이터 시트(Content_*.csv)를 참조 링크로 추가하세요"
    fi

    if file_has "$FILE" "Sheets/"; then
        check_pass L2 "Sheets/ 경로 참조 존재"
    else
        check_warn L2 "Sheets/ 경로 참조 미발견 (데이터 시트 경로를 명시하세요)"
    fi

    if file_has "$FILE" "Data Link|Linked Data|데이터 연동|관련 데이터"; then
        check_pass L2 "데이터 연동 섹션 존재"
    else
        check_warn L2 "데이터 연동 섹션 미발견 (Data Link 또는 관련 데이터 섹션 권장)"
    fi

    # 접두사별 추가 검사
    case "$PREFIX" in
        Design)
            echo ""
            echo -e "  ${CYAN}[추가]${NC} Design_ 문서 트레이드오프 검사"
            if file_has "$FILE" "트레이드오프|Trade.off|장단점|Pros.*Cons"; then
                check_pass L2 "Design_ 문서: 트레이드오프 섹션 존재"
            else
                check_warn L2 "Design_ 문서: 트레이드오프/장단점 섹션 미발견 (설계 원칙 문서에는 트레이드오프 분석 권장)"
            fi
            ;;
        Content)
            echo ""
            echo -e "  ${CYAN}[추가]${NC} Content_ 문서 CSV 링크 필수 검사"
            if file_has "$FILE" "Content_.*\.csv"; then
                check_pass L1 "Content_ 문서: CSV 링크 필수 충족"
            else
                check_fail L1 "Content_ 문서: CSV 링크 필수 미충족" "Content_ 문서에는 관련 CSV 파일 링크가 반드시 필요합니다"
            fi
            ;;
    esac

    echo ""

    # ------------------------------------------
    # 종합 리포트
    # ------------------------------------------
    print_summary
}

# ========================================
# 종합 리포트 출력
# ========================================
print_summary() {
    echo -e "${BOLD}========================================${NC}"
    echo -e "${BOLD}  검증 결과 요약${NC}"
    echo -e "${BOLD}========================================${NC}"
    echo -e "  ${GREEN}PASS${NC}: ${PASS_COUNT}건"
    echo -e "  ${RED}FAIL${NC}: ${FAIL_COUNT}건"
    echo -e "  ${YELLOW}WARN${NC}: ${WARN_COUNT}건"
    echo -e "  총 검증 항목: ${TOTAL_COUNT}건"
    echo ""

    # 레벨별 점수
    echo -e "${BOLD}--- 레벨별 점수 ---${NC}"

    local L1_PCT=0 L2_PCT=0
    if [ "$L1_TOTAL" -gt 0 ]; then
        L1_PCT=$(( (L1_PASS * 100) / L1_TOTAL ))
    fi
    if [ "$L2_TOTAL" -gt 0 ]; then
        L2_PCT=$(( (L2_PASS * 100) / L2_TOTAL ))
    fi

    pct_color() {
        local pct=$1
        if [ "$pct" -ge 80 ]; then echo -n "$GREEN"
        elif [ "$pct" -ge 60 ]; then echo -n "$YELLOW"
        else echo -n "$RED"
        fi
    }

    echo -e "  Level 1 (필수 완성도): $(pct_color $L1_PCT)${L1_PASS}/${L1_TOTAL} (${L1_PCT}%)${NC}"
    echo -e "  Level 2 (품질 권장):   $(pct_color $L2_PCT)${L2_PASS}/${L2_TOTAL} (${L2_PCT}%)${NC}"

    # 종합 완성도
    if [ "$TOTAL_COUNT" -gt 0 ]; then
        local SCORE=$(( (PASS_COUNT * 100) / TOTAL_COUNT ))
        echo ""
        if [ "$SCORE" -ge 80 ]; then
            echo -e "  종합 완성도: ${GREEN}${BOLD}${SCORE}%${NC} - 우수"
        elif [ "$SCORE" -ge 60 ]; then
            echo -e "  종합 완성도: ${YELLOW}${BOLD}${SCORE}%${NC} - 보통 (FAIL/WARN 항목 보완 권장)"
        else
            echo -e "  종합 완성도: ${RED}${BOLD}${SCORE}%${NC} - 미흡 (FAIL 항목 우선 보완 필요)"
        fi
    fi
    echo ""

    # FAIL 보완 가이드
    if [ ${#FAIL_GUIDES[@]} -gt 0 ]; then
        echo -e "${BOLD}========================================${NC}"
        echo -e "${BOLD}  FAIL 항목 보완 가이드${NC}"
        echo -e "${BOLD}========================================${NC}"
        for i in "${!FAIL_GUIDES[@]}"; do
            echo -e "  ${RED}$((i+1)).${NC} ${FAIL_GUIDES[$i]}"
        done
        echo ""
    fi

    echo -e "${BOLD}========================================${NC}"
}

# ========================================
# 디렉토리 모드: 총괄 리포트
# ========================================
validate_directory() {
    local DIR="$1"
    local GRAND_PASS=0 GRAND_FAIL=0 GRAND_WARN=0 GRAND_TOTAL=0
    local FILE_COUNT=0
    local FILE_RESULTS=()

    echo ""
    echo -e "${BOLD}============================================${NC}"
    echo -e "${BOLD}  GDD 디렉토리 일괄 검증 모드${NC}"
    echo -e "${BOLD}============================================${NC}"
    echo -e "대상 디렉토리: ${BLUE}${DIR}${NC}"
    echo ""

    # .md 파일 수집 (Documents/ 및 Documents/Gadgets/)
    local FILES
    FILES=$(find "$DIR" -name "*.md" -type f 2>/dev/null | sort)

    if [ -z "$FILES" ]; then
        echo -e "  ${RED}[ERROR]${NC} .md 파일을 찾을 수 없습니다."
        exit 1
    fi

    while IFS= read -r file; do
        FILE_COUNT=$((FILE_COUNT + 1))

        # 단일 파일 검증 (출력 포함)
        validate_single_file "$file"

        # 결과 누적
        GRAND_PASS=$((GRAND_PASS + PASS_COUNT))
        GRAND_FAIL=$((GRAND_FAIL + FAIL_COUNT))
        GRAND_WARN=$((GRAND_WARN + WARN_COUNT))
        GRAND_TOTAL=$((GRAND_TOTAL + TOTAL_COUNT))
        FILE_RESULTS+=("$(basename "$file"): PASS=${PASS_COUNT} FAIL=${FAIL_COUNT} WARN=${WARN_COUNT}")
    done <<< "$FILES"

    # 총괄 리포트
    echo ""
    echo -e "${BOLD}============================================${NC}"
    echo -e "${BOLD}  총괄 리포트 (${FILE_COUNT}개 파일)${NC}"
    echo -e "${BOLD}============================================${NC}"
    echo ""

    for result in "${FILE_RESULTS[@]}"; do
        local fname="${result%%:*}"
        local stats="${result#*: }"
        local p=$(echo "$stats" | sed 's/.*PASS=\([0-9]*\).*/\1/')
        local f=$(echo "$stats" | sed 's/.*FAIL=\([0-9]*\).*/\1/')
        local w=$(echo "$stats" | sed 's/.*WARN=\([0-9]*\).*/\1/')
        local t=$((p + f + w))
        local pct=0
        if [ "$t" -gt 0 ]; then pct=$(( (p * 100) / t )); fi

        local color="$GREEN"
        if [ "$pct" -lt 60 ]; then color="$RED"
        elif [ "$pct" -lt 80 ]; then color="$YELLOW"
        fi
        echo -e "  ${color}[${pct}%]${NC} ${fname} (PASS:${p} FAIL:${f} WARN:${w})"
    done

    echo ""
    echo -e "  ${BOLD}--- 총합 ---${NC}"
    echo -e "  ${GREEN}PASS${NC}: ${GRAND_PASS}건"
    echo -e "  ${RED}FAIL${NC}: ${GRAND_FAIL}건"
    echo -e "  ${YELLOW}WARN${NC}: ${GRAND_WARN}건"
    echo -e "  총 검증 항목: ${GRAND_TOTAL}건"

    if [ "$GRAND_TOTAL" -gt 0 ]; then
        local GRAND_SCORE=$(( (GRAND_PASS * 100) / GRAND_TOTAL ))
        echo ""
        if [ "$GRAND_SCORE" -ge 80 ]; then
            echo -e "  전체 완성도: ${GREEN}${BOLD}${GRAND_SCORE}%${NC} - 우수"
        elif [ "$GRAND_SCORE" -ge 60 ]; then
            echo -e "  전체 완성도: ${YELLOW}${BOLD}${GRAND_SCORE}%${NC} - 보통"
        else
            echo -e "  전체 완성도: ${RED}${BOLD}${GRAND_SCORE}%${NC} - 미흡"
        fi
    fi

    echo ""
    echo -e "${BOLD}============================================${NC}"

    if [ "$GRAND_FAIL" -gt 0 ]; then
        exit 1
    else
        exit 0
    fi
}

# ========================================
# 메인 엔트리포인트
# ========================================
TARGET="${1:-}"

if [ -z "$TARGET" ]; then
    echo -e "${RED}[ERROR]${NC} 사용법: bash validate-gdd.sh <GDD파일경로 또는 디렉토리>"
    echo "  예: bash validate-gdd.sh Documents/System_Combat_Damage.md"
    echo "  예: bash validate-gdd.sh Documents/"
    exit 1
fi

if [ -d "$TARGET" ]; then
    validate_directory "$TARGET"
elif [ -f "$TARGET" ]; then
    validate_single_file "$TARGET"
    if [ "$FAIL_COUNT" -gt 0 ]; then
        exit 1
    else
        exit 0
    fi
else
    echo -e "${RED}[ERROR]${NC} 파일 또는 디렉토리를 찾을 수 없습니다: ${TARGET}"
    exit 1
fi
