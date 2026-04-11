#!/bin/bash
# Wiki SessionStart hook: Load wiki context at session start
# Shows recent work log and pending items from the dev wiki

WIKI_DIR="$HOME/.claude/projects/C--Users-Victor-Documents-Works-ProjectAbyss/memory/wiki"
WIKI_INDEX="$WIKI_DIR/WIKI_INDEX.md"

if [ ! -f "$WIKI_INDEX" ]; then
    echo "=== Dev Wiki: Not initialized ==="
    exit 0
fi

echo "=== ECHORIS Dev Wiki ==="

# Show last 3 daily log entries
echo ""
echo "Recent work:"
grep "^- \[" "$WIKI_INDEX" | head -5 | while read -r line; do
    echo "  $line"
done

# Show today's log if exists
TODAY=$(date +%Y-%m-%d)
TODAY_LOG="$WIKI_DIR/daily/$TODAY.md"
if [ -f "$TODAY_LOG" ]; then
    echo ""
    echo "Today's log exists: wiki/daily/$TODAY.md"
fi

# Count wiki stats
DAILY_COUNT=$(ls "$WIKI_DIR/daily/" 2>/dev/null | wc -l | tr -d ' ')
DECISION_COUNT=$(ls "$WIKI_DIR/decisions/" 2>/dev/null | wc -l | tr -d ' ')
FEATURE_COUNT=$(ls "$WIKI_DIR/features/" 2>/dev/null | wc -l | tr -d ' ')
SESSION_COUNT=$(ls "$WIKI_DIR/sessions/" 2>/dev/null | wc -l | tr -d ' ')

echo ""
echo "Wiki stats: ${DAILY_COUNT} daily logs, ${DECISION_COUNT} decisions, ${FEATURE_COUNT} features, ${SESSION_COUNT} sessions"
echo "=== End Wiki ==="

exit 0
