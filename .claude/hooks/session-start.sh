#!/bin/bash
set -euo pipefail

# SessionStart hook for Claude Code on the web: make the project runnable and
# surface data problems before the first turn.
#
# Only runs in the remote (web) environment; local sessions are untouched.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# Install dependencies if missing. Idempotent, and the container state is cached
# after the hook completes, so this only pays the cost on a cold start.
if [ ! -d node_modules ]; then
  npm install
fi

# Surface data/*.json integrity errors and warnings on turn one. Non-blocking:
# we print the report but never abort the session, so a data warning (or even a
# hard error) is visible to fix rather than something that silently ships.
echo "── data validation ──"
node scripts/validate-data.mjs || true
