#!/bin/bash
# Wiki SessionStop hook: Auto-record session summary to wiki
# Only writes session log file. Does NOT append to daily log (Claude handles daily logs manually).
# This prevents duplicate entries from repeated Stop events.

WIKI_DIR="$HOME/.claude/projects/C--Users-Victor-Documents-Works-ProjectAbyss/memory/wiki"
TODAY=$(date +%Y-%m-%d)
TIMESTAMP=$(date +%H:%M:%S)
SESSION_DIR="$WIKI_DIR/sessions"
LOCK_FILE="$SESSION_DIR/.last_session_${TODAY}"

mkdir -p "$SESSION_DIR" 2>/dev/null

# Dedupe: skip if last session was less than 60 seconds ago
if [ -f "$LOCK_FILE" ]; then
    LAST=$(cat "$LOCK_FILE" 2>/dev/null)
    NOW=$(date +%s)
    DIFF=$((NOW - LAST))
    if [ "$DIFF" -lt 60 ]; then
        exit 0
    fi
fi
date +%s > "$LOCK_FILE" 2>/dev/null

# Gather git info
RECENT_COMMITS=$(git log --oneline --since="8 hours ago" 2>/dev/null)
MODIFIED_FILES=$(git diff --name-only 2>/dev/null)
STAGED_FILES=$(git diff --staged --name-only 2>/dev/null)
UNTRACKED=$(git ls-files --others --exclude-standard 2>/dev/null | grep -v node_modules | grep -v '.cache' | head -20)
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)

# Skip if nothing changed
if [ -z "$RECENT_COMMITS" ] && [ -z "$MODIFIED_FILES" ] && [ -z "$STAGED_FILES" ] && [ -z "$UNTRACKED" ]; then
    exit 0
fi

# Create session log only (no daily log append)
SESSION_FILE="$SESSION_DIR/session_${TODAY}_${TIMESTAMP//:/}.md"
{
    echo "# Session ${TODAY} ${TIMESTAMP}"
    echo ""
    echo "**Branch:** ${BRANCH:-unknown}"
    echo ""

    if [ -n "$RECENT_COMMITS" ]; then
        echo "## Commits"
        echo '```'
        echo "$RECENT_COMMITS"
        echo '```'
        echo ""
    fi

    if [ -n "$MODIFIED_FILES" ] || [ -n "$STAGED_FILES" ]; then
        echo "## Modified Files"
        if [ -n "$STAGED_FILES" ]; then
            echo "Staged:"
            echo "$STAGED_FILES" | while read -r f; do echo "- $f"; done
            echo ""
        fi
        if [ -n "$MODIFIED_FILES" ]; then
            echo "Unstaged:"
            echo "$MODIFIED_FILES" | while read -r f; do echo "- $f"; done
            echo ""
        fi
    fi

    if [ -n "$UNTRACKED" ]; then
        echo "## New Files"
        echo "$UNTRACKED" | while read -r f; do echo "- $f"; done
        echo ""
    fi
} > "$SESSION_FILE" 2>/dev/null

echo "Wiki session log: sessions/session_${TODAY}_${TIMESTAMP//:/}.md"
exit 0
