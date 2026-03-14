#!/usr/bin/env bash
# Human Hook — check-verification.sh
# Called by Cursor (beforeShellExecution) or Claude Code (PreToolUse) before
# git push (or git commit if configured). Blocks the command via exit 2 when
# the verification receipt is missing or stale.
set -euo pipefail

# ── Read JSON from stdin ────────────────────────────────────────────────────

INPUT="$(cat)"

# Extract the shell command from the editor's JSON payload.
# Cursor sends:      { "command": "git push ..." }
# Claude Code sends: { "tool_input": { "command": "git push ..." } }
COMMAND="$(echo "$INPUT" | jq -r '
  if .tool_input.command? then .tool_input.command
  elif .command? then .command
  else ""
  end
' 2>/dev/null || true)"

# ── Locate project root and config ─────────────────────────────────────────

PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
CONFIG_FILE="$PROJECT_ROOT/.human-hook/config.json"
RECEIPT_FILE="$PROJECT_ROOT/.human-hook/verified"

# Load config values (fall back to defaults if config is missing)
if [ -f "$CONFIG_FILE" ]; then
  TRIGGERS="$(jq -r '.triggers // ["push"] | join(" ")' "$CONFIG_FILE" 2>/dev/null || echo "push")"
  OVERRIDE_VAR="$(jq -r '.override_env_var // "HUMAN_HOOK_OVERRIDE"' "$CONFIG_FILE" 2>/dev/null || echo "HUMAN_HOOK_OVERRIDE")"
else
  TRIGGERS="push"
  OVERRIDE_VAR="HUMAN_HOOK_OVERRIDE"
fi

# ── Check if this command is a configured trigger ──────────────────────────

is_trigger=false
for trigger in $TRIGGERS; do
  case "$COMMAND" in
    "git $trigger"*|"git $trigger")
      is_trigger=true
      break
      ;;
  esac
done

if [ "$is_trigger" = false ]; then
  exit 0
fi

# ── Check override env var ─────────────────────────────────────────────────

if [ -n "${!OVERRIDE_VAR:-}" ] 2>/dev/null || \
   ([ "$OVERRIDE_VAR" = "HUMAN_HOOK_OVERRIDE" ] && [ -n "${HUMAN_HOOK_OVERRIDE:-}" ]); then
  exit 0
fi

# Generic override check for custom var names
override_value="$(printenv "$OVERRIDE_VAR" 2>/dev/null || true)"
if [ -n "$override_value" ]; then
  exit 0
fi

# ── Compute outgoing diff hash ─────────────────────────────────────────────

# Try upstream first; fall back to default branch for new branches
if git rev-parse @{upstream} >/dev/null 2>&1; then
  DIFF="$(git diff @{upstream}..HEAD 2>/dev/null || true)"
else
  # Detect default branch name
  DEFAULT_BRANCH="$(git remote show origin 2>/dev/null \
    | grep 'HEAD branch' \
    | awk '{print $NF}' \
    || echo "main")"
  DIFF="$(git diff "$DEFAULT_BRANCH"..HEAD 2>/dev/null || true)"
fi

# Nothing to push — allow
if [ -z "$DIFF" ]; then
  exit 0
fi

CURRENT_HASH="$(echo "$DIFF" | shasum -a 256 | awk '{print $1}')"

# ── Compare against receipt ────────────────────────────────────────────────

if [ -f "$RECEIPT_FILE" ]; then
  STORED_HASH="$(cat "$RECEIPT_FILE" | tr -d '[:space:]')"
  if [ "$CURRENT_HASH" = "$STORED_HASH" ]; then
    exit 0
  fi
fi

# ── Block — emit deny JSON ─────────────────────────────────────────────────

cat <<EOF
{
  "permission": "deny",
  "decision": "block",
  "user_message": "Human Hook: verification required before pushing.",
  "agent_message": "The push has been blocked because the developer has not yet verified their understanding of the outgoing changes. Use the Human Hook skill to conduct a verification conversation. Compare local vs. remote with \`git diff @{upstream}..HEAD\` to see all outgoing changes, ask the developer 2-3 questions about the architectural intent, integration points, and trade-offs, evaluate their responses, and write the verification receipt to .human-hook/verified if they demonstrate understanding."
}
EOF

exit 2
