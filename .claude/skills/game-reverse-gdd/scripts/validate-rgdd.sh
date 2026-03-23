#!/bin/bash
# 역기획서 완성도 검증 스크립트 v3.0
# 사용법: bash validate-rgdd.sh <역기획서_디렉토리_경로>
# 지원: .md + .html 파일

set -euo pipefail

# 색상 코드
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

# 카운터
PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0
TOTAL_COUNT=0

# 레벨별 카운터
L1_PASS=0; L1_TOTAL=0
L2_PASS=0; L2_TOTAL=0
L3_PASS=0; L3_TOTAL=0

# FAIL 항목 보완 가이드 저장
FAIL_GUIDES=()

TARGET_DIR="${1:-.}"

echo ""
echo -e "${BOLD}========================================${NC}"
echo -e "${BOLD}  역기획서 완성도 검증 리포트 v3.0${NC}"
echo -e "${BOLD}========================================${NC}"
echo -e "대상 디렉토리: ${BLUE}${TARGET_DIR}${NC}"
echo ""

# ========================================
# 유틸리티 함수
# ========================================

check_pass() {
    local level="$1"
    local msg="$2"
    echo -e "  ${GREEN}[PASS]${NC} $msg"
    PASS_COUNT=$((PASS_COUNT + 1))
    TOTAL_COUNT=$((TOTAL_COUNT + 1))
    case "$level" in
        L1) L1_PASS=$((L1_PASS + 1)); L1_TOTAL=$((L1_TOTAL + 1)) ;;
        L2) L2_PASS=$((L2_PASS + 1)); L2_TOTAL=$((L2_TOTAL + 1)) ;;
        L3) L3_PASS=$((L3_PASS + 1)); L3_TOTAL=$((L3_TOTAL + 1)) ;;
    esac
}

check_fail() {
    local level="$1"
    local msg="$2"
    local guide="${3:-}"
    echo -e "  ${RED}[FAIL]${NC} $msg"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    TOTAL_COUNT=$((TOTAL_COUNT + 1))
    case "$level" in
        L1) L1_TOTAL=$((L1_TOTAL + 1)) ;;
        L2) L2_TOTAL=$((L2_TOTAL + 1)) ;;
        L3) L3_TOTAL=$((L3_TOTAL + 1)) ;;
    esac
    if [ -n "$guide" ]; then
        FAIL_GUIDES+=("$msg → $guide")
    fi
}

check_warn() {
    local level="$1"
    local msg="$2"
    echo -e "  ${YELLOW}[WARN]${NC} $msg"
    WARN_COUNT=$((WARN_COUNT + 1))
    TOTAL_COUNT=$((TOTAL_COUNT + 1))
    case "$level" in
        L1) L1_TOTAL=$((L1_TOTAL + 1)) ;;
        L2) L2_TOTAL=$((L2_TOTAL + 1)) ;;
        L3) L3_TOTAL=$((L3_TOTAL + 1)) ;;
    esac
}

# .md + .html 파일 검색 함수
find_doc_files() {
    find "$TARGET_DIR" \( -name "*.md" -o -name "*.html" \) -type f 2>/dev/null || true
}

# 모든 문서에서 grep (파일 목록 기반)
grep_all_docs() {
    local pattern="$1"
    local flags="${2:--ri}"
    local files
    files=$(find_doc_files)
    if [ -z "$files" ]; then
        return 1
    fi
    echo "$files" | xargs grep $flags "$pattern" 2>/dev/null
}

# 존재 여부만 확인 (SIGPIPE 안전)
grep_exists() {
    local pattern="$1"
    local files
    files=$(find_doc_files)
    if [ -z "$files" ]; then
        return 1
    fi
    echo "$files" | xargs grep -rli "$pattern" 2>/dev/null | grep -q . 2>/dev/null
}

# 모든 문서에서 grep 카운트
grep_count_all() {
    local pattern="$1"
    local result
    result=$(grep_all_docs "$pattern" "-rci" 2>/dev/null | awk -F: '{sum += $NF} END {print sum+0}') || true
    echo "${result:-0}"
}

# Mermaid 블록 카운트 (md: ```mermaid, html: <div class="mermaid">)
count_mermaid_blocks() {
    local md_count html_count
    md_count=$(find "$TARGET_DIR" -name "*.md" -type f -exec grep -c '```mermaid' {} + 2>/dev/null | awk -F: '{sum += $NF} END {print sum+0}') || true
    html_count=$(find "$TARGET_DIR" -name "*.html" -type f -exec grep -c 'class="mermaid"' {} + 2>/dev/null | awk -F: '{sum += $NF} END {print sum+0}') || true
    echo $(( ${md_count:-0} + ${html_count:-0} ))
}

# 테이블 수 카운트 (md: |---| 구분선, html: <table>)
count_tables() {
    local md_count html_count
    md_count=$(find "$TARGET_DIR" -name "*.md" -type f -exec grep -c '|.*---.*|' {} + 2>/dev/null | awk -F: '{sum += $NF} END {print sum+0}') || true
    html_count=$(find "$TARGET_DIR" -name "*.html" -type f -exec grep -c '<table' {} + 2>/dev/null | awk -F: '{sum += $NF} END {print sum+0}') || true
    echo $(( ${md_count:-0} + ${html_count:-0} ))
}

# Mermaid 블록 내 특정 키워드 카운트
count_mermaid_keyword() {
    local keyword="$1"
    grep_count_all "$keyword"
}

# ========================================
# 1. 필수 문서 존재 여부 [L1]
# ========================================
echo -e "${BOLD}[1/13] 필수 문서 존재 여부${NC}"

ALL_DOC_FILES=$(find_doc_files)

# 정의서 확인
if echo "$ALL_DOC_FILES" | grep -qi "정의서\|definition\|define"; then
    check_pass L1 "정의서 문서 존재"
else
    if grep_exists "시스템명\|한 줄 정의\|용어 정의"; then
        check_pass L1 "정의서 문서 존재 (내용 기반 탐지)"
    else
        check_fail L1 "정의서 문서 미발견" "시스템 정의서를 작성하세요 (시스템명, 목적, 용어 정의, 범위 포함)"
    fi
fi

# 구조도 확인
GRAPH_COUNT=$(count_mermaid_keyword "graph TD\|graph LR\|graph RL\|graph BT")
if [ "$GRAPH_COUNT" -ge 1 ]; then
    check_pass L1 "구조도 (Mermaid 다이어그램) ${GRAPH_COUNT}건 발견"
else
    check_fail L1 "구조도 (Mermaid graph) 미발견" "시스템 구조를 Mermaid graph 다이어그램으로 작성하세요"
fi

# 플로우차트 확인
FC_COUNT=$(count_mermaid_keyword "flowchart")
if [ "$FC_COUNT" -ge 1 ]; then
    check_pass L1 "플로우차트 (Mermaid flowchart) ${FC_COUNT}건 발견"
else
    check_fail L1 "플로우차트 (Mermaid flowchart) 미발견" "핵심 유저 플로우를 Mermaid flowchart로 작성하세요"
fi

# 상세 명세서 확인
if grep_exists "UI 레이아웃\|인터랙션\|애니메이션\|상태 전이\|상세 명세"; then
    check_pass L1 "상세 명세서 존재"
else
    check_fail L1 "상세 명세서 미발견" "UI 레이아웃, 인터랙션, 상태 전이 등 상세 명세를 작성하세요"
fi

# 데이터 테이블 확인
if grep_exists "컬럼\|테이블\|데이터 테이블\|data table\|샘플 데이터"; then
    check_pass L1 "데이터 테이블 존재"
else
    check_fail L1 "데이터 테이블 미발견" "주요 데이터 구조를 테이블 형태로 정리하세요"
fi

# 예외 처리 확인
if grep_exists "엣지 케이스\|예외 처리\|사이드 이펙트\|동시성\|에러 처리"; then
    check_pass L1 "예외 처리 명세 존재"
else
    check_fail L1 "예외 처리 명세 미발견" "엣지 케이스, 에러 처리, 동시성 이슈 등을 정리하세요"
fi

echo ""

# ========================================
# 2. 정의서 필수 항목 [L1]
# ========================================
echo -e "${BOLD}[2/13] 정의서 필수 항목${NC}"

# 시스템명
if grep_exists "시스템명\|시스템 개요"; then
    check_pass L1 "시스템명 명시"
else
    check_fail L1 "시스템명 미기재" "정의서에 시스템명과 시스템 개요를 기재하세요"
fi

# 한 줄 정의
if grep_exists "한 줄 정의\|한줄 정의\|one.line"; then
    check_pass L1 "한 줄 정의 존재"
else
    check_fail L1 "한 줄 정의 미기재" "시스템을 한 줄로 요약하는 '한 줄 정의'를 추가하세요"
fi

# 핵심 목적
if grep_exists "목적\|핵심 목적\|유저 관점\|사업 관점"; then
    check_pass L1 "핵심 목적 기재"
else
    check_fail L1 "핵심 목적 미기재" "유저 관점 + 사업 관점에서 핵심 목적을 기재하세요"
fi

# 관련 시스템
if grep_exists "관련 시스템\|연동 시스템\|의존 시스템\|선행 시스템\|후행 시스템"; then
    check_pass L1 "관련 시스템 명시"
else
    check_fail L1 "관련 시스템 미기재" "이 시스템과 연동/의존하는 관련 시스템 목록을 추가하세요"
fi

# 용어 정의 (3개 이상)
TERM_COUNT=$(grep_count_all "용어")
if [ "$TERM_COUNT" -ge 3 ]; then
    check_pass L1 "용어 정의 ${TERM_COUNT}건 발견 (3건 이상)"
elif [ "$TERM_COUNT" -ge 1 ]; then
    check_warn L1 "용어 정의 ${TERM_COUNT}건 (3건 이상 권장)"
else
    check_fail L1 "용어 정의 섹션 미발견" "시스템 고유 용어를 3개 이상 정의하세요"
fi

# 범위
if grep_exists "범위\|다루는 것\|다루지 않는 것\|범위 밖"; then
    check_pass L1 "분석 범위 명시"
else
    check_fail L1 "분석 범위 미기재" "'다루는 것'과 '다루지 않는 것'으로 분석 범위를 명시하세요"
fi

echo ""

# ========================================
# 3. 데이터 테이블 검증 [L1]
# ========================================
echo -e "${BOLD}[3/13] 데이터 테이블 검증${NC}"

# 테이블 수 카운트
TABLE_NUM=$(count_tables)
if [ "$TABLE_NUM" -ge 3 ]; then
    check_pass L1 "테이블 ${TABLE_NUM}개 발견"
elif [ "$TABLE_NUM" -ge 1 ]; then
    check_warn L1 "테이블 ${TABLE_NUM}개 (3개 이상 권장)"
else
    check_fail L1 "테이블 미발견" "데이터 구조를 마크다운 또는 HTML 테이블로 정리하세요"
fi

# 테이블 행 수
# md 테이블 행 + html <tr> 행
MD_ROW_COUNT=$(find "$TARGET_DIR" -name "*.md" -type f -exec grep -c "^|.*|.*|" {} + 2>/dev/null | awk -F: '{sum += $NF} END {print sum+0}') || true
HTML_ROW_COUNT=$(find "$TARGET_DIR" -name "*.html" -type f -exec grep -c "<tr" {} + 2>/dev/null | awk -F: '{sum += $NF} END {print sum+0}') || true
TABLE_ROW_COUNT=$(( ${MD_ROW_COUNT:-0} + ${HTML_ROW_COUNT:-0} ))
if [ "$TABLE_ROW_COUNT" -ge 3 ]; then
    check_pass L1 "테이블 데이터 ${TABLE_ROW_COUNT}행 발견"
else
    check_warn L1 "테이블 데이터 ${TABLE_ROW_COUNT}행 (최소 3행 권장)"
fi

# 컬럼 정의
if grep_exists "컬럼명\|타입\|설명\|제약조건\|INT\|STRING\|FLOAT\|ENUM\|BOOL"; then
    check_pass L1 "컬럼 정의 존재"
else
    check_warn L1 "컬럼 정의 미발견 (타입, 설명 포함 권장)"
fi

# 샘플 데이터
if grep_exists "샘플\|sample\|예시 데이터"; then
    check_pass L1 "샘플 데이터 섹션 존재"
else
    check_warn L1 "샘플 데이터 미발견"
fi

# ER 다이어그램
ER_COUNT=$(count_mermaid_keyword "erDiagram")
if [ "$ER_COUNT" -ge 1 ]; then
    check_pass L1 "ER 다이어그램 ${ER_COUNT}건 발견"
else
    check_warn L1 "ER 다이어그램 미발견 (데이터 관계 시각화 권장)"
fi

# 밸런싱 공식
if grep_exists "공식\|수식\|formula\|밸런싱.*공식"; then
    check_pass L1 "밸런싱 공식/수식 존재"
else
    check_warn L1 "밸런싱 공식 미발견 (수치 시스템이면 공식 추가 권장)"
fi

echo ""

# ========================================
# 4. 플로우차트 검증 [L1]
# ========================================
echo -e "${BOLD}[4/13] 플로우차트 검증${NC}"

# Mermaid 블록 존재
MERMAID_TOTAL=$(count_mermaid_blocks)
if [ "$MERMAID_TOTAL" -ge 1 ]; then
    # 세부 카운트
    GRAPH_CNT=$(count_mermaid_keyword "graph TD\|graph LR\|graph RL\|graph BT")
    FC_CNT=$(count_mermaid_keyword "flowchart")
    ER_CNT=$(count_mermaid_keyword "erDiagram")
    STATE_CNT=$(count_mermaid_keyword "stateDiagram")
    OTHER_CNT=$((MERMAID_TOTAL - GRAPH_CNT - FC_CNT - ER_CNT - STATE_CNT))
    [ "$OTHER_CNT" -lt 0 ] && OTHER_CNT=0
    check_pass L1 "Mermaid 블록 ${MERMAID_TOTAL}개 발견 (구조도 ${GRAPH_CNT}, 플로우차트 ${FC_CNT}, ER ${ER_CNT}, 상태 ${STATE_CNT}, 기타 ${OTHER_CNT})"
else
    check_fail L1 "Mermaid 블록 미발견" "Mermaid 다이어그램을 최소 1개 이상 추가하세요"
fi

# 조건 분기 포함
if grep_all_docs "{.*}" "-ri" 2>/dev/null | grep -q "?\|조건\|충분\|인가"; then
    check_pass L1 "조건 분기 (다이아몬드 노드) 포함"
else
    check_warn L1 "조건 분기 미발견 (플로우차트에 분기 로직 권장)"
fi

# 시작/종료점
if grep_exists "시작\|종료\|Start\|End"; then
    check_pass L1 "시작/종료점 표시"
else
    check_warn L1 "시작/종료점 미명시"
fi

# 유저 액션 / 시스템 처리 구분
if grep_exists "userAction\|systemProcess\|유저 액션\|시스템 처리\|사용자 행동\|서버 처리"; then
    check_pass L1 "유저 액션/시스템 처리 구분 존재"
else
    check_warn L1 "유저 액션/시스템 처리 구분 미발견 (플로우차트에서 역할 구분 권장)"
fi

# classDef 스타일 적용
CLASSDEF_COUNT=$(grep_count_all "classDef")
if [ "$CLASSDEF_COUNT" -ge 1 ]; then
    check_pass L1 "classDef 스타일 ${CLASSDEF_COUNT}건 적용"
else
    check_warn L1 "classDef 색상 스타일 미적용 (시각적 구분을 위해 권장)"
fi

# 서브 플로우차트 분리 (노드 15개 초과 시 경고)
# Mermaid 노드 대략 추정: --> 또는 --- 연결선 기준
NODE_CONNECTIONS=$(grep_count_all "-->")
if [ "$NODE_CONNECTIONS" -gt 15 ] && [ "$FC_COUNT" -le 1 ] 2>/dev/null; then
    check_warn L1 "연결선 ${NODE_CONNECTIONS}개인데 플로우차트 1개 → 서브 플로우차트 분리를 권장합니다"
elif [ "$NODE_CONNECTIONS" -gt 0 ]; then
    check_pass L1 "플로우차트 복잡도 적정 (연결선 ${NODE_CONNECTIONS}개)"
fi

echo ""

# ========================================
# 5. 예외 처리 검증 [L1]
# ========================================
echo -e "${BOLD}[5/13] 예외 처리 검증${NC}"

# 엣지 케이스 수
EDGE_CASE_COUNT=$(grep_count_all "엣지\|edge case\|예외 상황\|E[0-9]")
if [ "$EDGE_CASE_COUNT" -ge 3 ]; then
    check_pass L1 "엣지 케이스 ${EDGE_CASE_COUNT}건 이상"
else
    check_warn L1 "엣지 케이스 ${EDGE_CASE_COUNT}건 (최소 3건 권장)"
fi

# 조건→반응→피드백 구조
if grep_exists "시스템 반응\|유저 피드백\|피드백"; then
    check_pass L1 "조건→반응→피드백 구조 존재"
else
    check_warn L1 "조건→반응→피드백 구조 미발견"
fi

echo ""

# ========================================
# 6. 비교 분석 검증 [L3]
# ========================================
echo -e "${BOLD}[6/13] 비교 분석 (포트폴리오 가점)${NC}"

if grep_exists "비교\|트레이드오프\|인사이트\|크로스"; then
    check_pass L3 "비교 분석 섹션 존재"
else
    check_warn L3 "비교 분석 미포함 (포트폴리오 가점 항목)"
fi

if grep_exists "개선안\|개선 제안\|improvement"; then
    check_pass L3 "개선안 제시 존재"
else
    check_warn L3 "개선안 미포함 (포트폴리오 가점 항목)"
fi

if grep_exists "차별점\|경쟁.*분석\|벤치마크"; then
    check_pass L3 "경쟁/차별점 분석 존재"
else
    check_warn L3 "경쟁/차별점 분석 미포함"
fi

echo ""

# ========================================
# 7. 설계 의도 분석 검증 [L2] — 신규
# ========================================
echo -e "${BOLD}[7/13] 설계 의도 분석 검증${NC}"

DESIGN_INTENT_PASS=0
DESIGN_INTENT_TOTAL=5

# 수익화
if grep_exists "수익화\|매출\|과금\|BM\|monetiz"; then
    check_pass L2 "설계 의도 - 수익화 관점 존재"
    DESIGN_INTENT_PASS=$((DESIGN_INTENT_PASS + 1))
else
    check_warn L2 "설계 의도 - 수익화 관점 미발견"
fi

# 리텐션
if grep_exists "리텐션\|retention\|잔존\|복귀\|이탈 방지"; then
    check_pass L2 "설계 의도 - 리텐션 관점 존재"
    DESIGN_INTENT_PASS=$((DESIGN_INTENT_PASS + 1))
else
    check_warn L2 "설계 의도 - 리텐션 관점 미발견"
fi

# UX
if grep_exists "UX\|사용성\|유저 경험\|user experience\|편의성"; then
    check_pass L2 "설계 의도 - UX 관점 존재"
    DESIGN_INTENT_PASS=$((DESIGN_INTENT_PASS + 1))
else
    check_warn L2 "설계 의도 - UX 관점 미발견"
fi

# 밸런싱
if grep_exists "밸런싱\|밸런스\|balance\|균형\|난이도 조절"; then
    check_pass L2 "설계 의도 - 밸런싱 관점 존재"
    DESIGN_INTENT_PASS=$((DESIGN_INTENT_PASS + 1))
else
    check_warn L2 "설계 의도 - 밸런싱 관점 미발견"
fi

# 소셜
if grep_exists "소셜\|social\|길드\|파티\|멀티\|PvP\|협동\|경쟁"; then
    check_pass L2 "설계 의도 - 소셜 관점 존재"
    DESIGN_INTENT_PASS=$((DESIGN_INTENT_PASS + 1))
else
    check_warn L2 "설계 의도 - 소셜 관점 미발견"
fi

if [ "$DESIGN_INTENT_PASS" -ge 3 ]; then
    echo -e "  ${GREEN}→ 설계 의도 5개 중 ${DESIGN_INTENT_PASS}개 충족 (기준: 3개 이상)${NC}"
else
    echo -e "  ${YELLOW}→ 설계 의도 5개 중 ${DESIGN_INTENT_PASS}개만 충족 (기준: 3개 이상 미달)${NC}"
fi

echo ""

# ========================================
# 8. 다이어그램 품질 검증 [L2] — 신규
# ========================================
echo -e "${BOLD}[8/13] 다이어그램 품질 검증${NC}"

# 구조도 방향 (graph LR 권장)
if grep_exists "graph LR"; then
    check_pass L2 "구조도 방향 graph LR 사용"
else
    check_warn L2 "구조도에 graph LR(좌→우) 미사용 (구조도는 LR 방향 권장)"
fi

# 플로우차트 방향 (flowchart TD 권장)
if grep_exists "flowchart TD"; then
    check_pass L2 "플로우차트 방향 flowchart TD 사용"
else
    check_warn L2 "flowchart TD(위→아래) 미사용 (플로우차트는 TD 방향 권장)"
fi

# 범례 존재
if grep_exists "범례\|legend\|색상.*의미\|색상.*설명"; then
    check_pass L2 "범례 존재"
else
    check_fail L2 "범례 미발견" "구조도/플로우차트 하단에 색상별 의미를 범례로 추가하세요"
fi

# 한국어 라벨 사용 여부 (Mermaid 블록 내 한글)
HAS_KOREAN_IN_MERMAID=false
# md 파일에서 mermaid 블록 추출 후 한글 확인
if find "$TARGET_DIR" \( -name "*.md" -o -name "*.html" \) -type f -exec grep -ql 'mermaid' {} + 2>/dev/null; then
    # mermaid 블록 내 한글 존재 확인
    KOREAN_IN_MERMAID=$(find "$TARGET_DIR" \( -name "*.md" -o -name "*.html" \) -type f -exec grep -c '[가-힣]' {} + 2>/dev/null | awk -F: '{sum += $NF} END {print sum+0}') || true
    if [ "${KOREAN_IN_MERMAID:-0}" -ge 1 ]; then
        HAS_KOREAN_IN_MERMAID=true
    fi
fi
if [ "$HAS_KOREAN_IN_MERMAID" = true ]; then
    check_pass L2 "한국어 라벨 사용 확인"
else
    check_warn L2 "한국어 라벨 미확인 (다이어그램 노드에 한국어 라벨 권장)"
fi

echo ""

# ========================================
# 9. 상세 명세서 품질 검증 [L2] — 신규
# ========================================
echo -e "${BOLD}[9/13] 상세 명세서 품질 검증${NC}"

# UI 레이아웃 섹션
if grep_exists "UI 레이아웃\|화면 구성\|레이아웃 구조\|화면 레이아웃"; then
    check_pass L2 "UI 레이아웃 섹션 존재"
else
    check_fail L2 "UI 레이아웃 섹션 미발견" "주요 화면의 UI 레이아웃 구조를 설명하는 섹션을 추가하세요"
fi

# 인터랙션 명세
if grep_exists "탭\|스와이프\|롱프레스\|long.press\|드래그\|터치\|클릭\|인터랙션"; then
    check_pass L2 "인터랙션 명세 존재 (탭/스와이프/롱프레스 등)"
else
    check_fail L2 "인터랙션 명세 미발견" "유저 입력 방식(탭, 스와이프, 롱프레스 등)을 명세하세요"
fi

# 애니메이션 타이밍
if grep_exists "[0-9].*초\|[0-9].*ms\|[0-9].*sec\|애니메이션.*타이밍\|duration"; then
    check_pass L2 "애니메이션 타이밍 명세 존재"
else
    check_warn L2 "애니메이션 타이밍 미발견 (초/ms 단위 타이밍 명세 권장)"
fi

# 상태 전이
if grep_exists "상태 전이\|stateDiagram\|state diagram\|상태 머신"; then
    check_pass L2 "상태 전이 다이어그램/매트릭스 존재"
else
    check_fail L2 "상태 전이 미발견" "시스템의 상태 전이를 stateDiagram 또는 매트릭스로 정리하세요"
fi

echo ""

# ========================================
# 10. 문서별 분량 통계 [L1]
# ========================================
echo -e "${BOLD}[10/13] 문서별 분량 통계${NC}"

# 페이지 환산 기준 (1p ≈ 40줄)
LINES_PER_PAGE=40

# 섹션별 권장 분량 표시
echo -e "  ${CYAN}[참고] 섹션별 권장 분량: 정의서 ~3p, 구조도 ~1p, 플로우차트 ~2p, 상세명세 ~5p, 데이터테이블 ~3p, 예외처리 ~2p${NC}"

TOTAL_LINES=0
TOTAL_CHARS=0

# 모든 .md + .html 파일 순회
while IFS= read -r file; do
    if [ -f "$file" ]; then
        LINES=$(wc -l < "$file" | tr -d ' ')
        # 글자 수 (공백 제외)
        CHARS=$(tr -d '[:space:]' < "$file" | wc -c | tr -d ' ')
        TOTAL_LINES=$((TOTAL_LINES + LINES))
        TOTAL_CHARS=$((TOTAL_CHARS + CHARS))
        REL_PATH="${file#$TARGET_DIR/}"
        PAGES=$(echo "scale=1; $LINES / $LINES_PER_PAGE" | bc 2>/dev/null || echo "?")
        echo -e "  ${BLUE}[INFO]${NC} ${REL_PATH}: ${LINES}줄 (~${PAGES}p) / ${CHARS}자"
    fi
done < <(find_doc_files | sort)

echo ""
TOTAL_PAGES=$(echo "scale=1; $TOTAL_LINES / $LINES_PER_PAGE" | bc 2>/dev/null || echo "?")
echo -e "  ${BOLD}총 분량: ${TOTAL_LINES}줄 (~${TOTAL_PAGES}p)${NC}"
echo -e "  ${BOLD}총 글자 수 (공백 제외): ${TOTAL_CHARS}자${NC}"

# 분량 기준 체크
if [ "$TOTAL_LINES" -ge 200 ]; then
    check_pass L1 "총 분량 충분 (${TOTAL_LINES}줄)"
elif [ "$TOTAL_LINES" -ge 100 ]; then
    check_warn L1 "총 분량 보통 (${TOTAL_LINES}줄, 200줄 이상 권장)"
else
    check_fail L1 "총 분량 부족 (${TOTAL_LINES}줄)" "역기획서 총 분량이 200줄(~5p) 이상이 되도록 보완하세요"
fi

echo ""

# ========================================
# 11. Chart.js 차트 검증 [L1]
# ========================================
echo -e "${BOLD}[11/13] Chart.js 차트 검증${NC}"

# Chart.js CDN 포함 여부
if grep_exists "chart.js\|Chart.js\|chart.umd"; then
    check_pass L1 "Chart.js CDN/라이브러리 포함"
else
    check_warn L1 "Chart.js 미포함 (수치 분석 차트가 필요한 경우 추가 권장)"
fi

# canvas 태그 존재
CANVAS_COUNT=$(grep_count_all "<canvas")
if [ "$CANVAS_COUNT" -ge 1 ]; then
    check_pass L1 "Chart.js canvas ${CANVAS_COUNT}개 발견"
else
    check_warn L1 "Chart.js canvas 미발견"
fi

# new Chart() 초기화
CHART_INIT_COUNT=$(grep_count_all "new Chart")
if [ "$CHART_INIT_COUNT" -ge 1 ]; then
    check_pass L1 "Chart.js 초기화 코드 ${CHART_INIT_COUNT}건 발견"
else
    check_warn L1 "Chart.js 초기화 코드 미발견"
fi

# chart-wrapper 클래스
if grep_exists "chart-wrapper"; then
    check_pass L2 "chart-wrapper 래퍼 클래스 사용"
else
    check_warn L2 "chart-wrapper 래퍼 미사용 (스타일 일관성을 위해 권장)"
fi

echo ""

# ========================================
# 12. 웹 리서치 브리프 검증 [L2]
# ========================================
echo -e "${BOLD}[12/13] 웹 리서치 브리프 검증${NC}"

# 리서치 브리프 섹션 존재
if grep_exists "리서치 브리프\|웹 리서치\|Research Brief"; then
    check_pass L2 "웹 리서치 브리프 섹션 존재"
else
    check_warn L2 "웹 리서치 브리프 미포함 (자동 생성 워크플로우에서 필수)"
fi

# 신뢰도 등급 표기
if grep_exists "신뢰도\|\\[추정\\]\|신뢰도.*[A-E]"; then
    check_pass L2 "신뢰도 등급 표기 존재"
else
    check_warn L2 "신뢰도 등급 미표기 (데이터 출처 신뢰도 표기 권장)"
fi

# 출처 URL
URL_COUNT=$(grep_count_all "https\?://")
if [ "$URL_COUNT" -ge 1 ]; then
    check_pass L2 "출처 URL ${URL_COUNT}건 포함"
else
    check_warn L2 "출처 URL 미포함"
fi

# 경쟁작 정보
if grep_exists "경쟁작\|유사 게임\|비교 대상\|경쟁 게임"; then
    check_pass L2 "경쟁작 정보 존재"
else
    check_warn L2 "경쟁작 정보 미포함"
fi

echo ""

# ========================================
# 13. 수치 분석 검증 [L2]
# ========================================
echo -e "${BOLD}[13/13] 수치 분석 검증${NC}"

# 수치 분석 섹션 존재
if grep_exists "수치 분석\|성장 곡선\|전투 공식\|경제 순환\|확률 시뮬레이션\|Numerical Analysis"; then
    check_pass L2 "수치 분석 섹션 존재"
else
    check_warn L2 "수치 분석 미포함 (4대 영역 중 최소 1개 분석 권장)"
fi

# 수식/공식 존재
if grep_exists "공식\|수식\|formula\|= .*×\|= .*\\*\|= .*\\+"; then
    check_pass L2 "수식/공식 존재"
else
    check_warn L2 "수식/공식 미발견"
fi

# 분석 인사이트
if grep_exists "인사이트\|핵심 발견\|분석 결과\|설계 의도 추론"; then
    check_pass L2 "분석 인사이트/해석 존재"
else
    check_warn L2 "분석 인사이트 미포함"
fi

echo ""

# ========================================
# 최종 리포트
# ========================================
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

if [ "$L1_TOTAL" -gt 0 ]; then
    L1_PCT=$(( (L1_PASS * 100) / L1_TOTAL ))
else
    L1_PCT=0
fi
if [ "$L2_TOTAL" -gt 0 ]; then
    L2_PCT=$(( (L2_PASS * 100) / L2_TOTAL ))
else
    L2_PCT=0
fi
if [ "$L3_TOTAL" -gt 0 ]; then
    L3_PCT=$(( (L3_PASS * 100) / L3_TOTAL ))
else
    L3_PCT=0
fi

# 색상 결정 함수
pct_color() {
    local pct=$1
    if [ "$pct" -ge 80 ]; then echo -n "$GREEN"
    elif [ "$pct" -ge 60 ]; then echo -n "$YELLOW"
    else echo -n "$RED"
    fi
}

echo -e "  Level 1 (필수 완성도): $(pct_color $L1_PCT)${L1_PASS}/${L1_TOTAL} (${L1_PCT}%)${NC}"
echo -e "  Level 2 (품질 권장):   $(pct_color $L2_PCT)${L2_PASS}/${L2_TOTAL} (${L2_PCT}%)${NC}"
echo -e "  Level 3 (포트폴리오):  $(pct_color $L3_PCT)${L3_PASS}/${L3_TOTAL} (${L3_PCT}%)${NC}"

# 종합 완성도
if [ "$TOTAL_COUNT" -gt 0 ]; then
    SCORE=$(( (PASS_COUNT * 100) / TOTAL_COUNT ))
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

# ========================================
# FAIL 항목 보완 가이드
# ========================================
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

# 종료 코드: FAIL이 있으면 1, 없으면 0
if [ "$FAIL_COUNT" -gt 0 ]; then
    exit 1
else
    exit 0
fi
