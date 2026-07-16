#!/usr/bin/env bash
# review.sh -- review your local diff for bugs & security issues before you push.
#
# SUGGESTS ONLY. It reads a git diff, runs a local secret scan first, then asks
# the AI for a bug/security review. It never commits, pushes, or edits files.
#
# Usage:
#   ./review.sh                 # review staged + unstaged changes vs HEAD
#   ./review.sh --staged        # review only staged changes
#   ./review.sh --base main     # review your branch vs origin/main
#   ./review.sh --range A..B     # review an explicit commit range

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

MODE="working"   # working | staged | base | range
BASE="main"
RANGE=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --staged) MODE="staged"; shift ;;
    --base)   MODE="base"; BASE="${2:?}"; shift 2 ;;
    --range)  MODE="range"; RANGE="${2:?}"; shift 2 ;;
    -h|--help) tail -n +2 "$0" | grep '^#' | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) die "Unknown arg: $1" ;;
  esac
done

need git
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || die "Not inside a git repository."

case "$MODE" in
  working) diff="$(git diff HEAD)";        label="working tree vs HEAD" ;;
  staged)  diff="$(git diff --cached)";    label="staged changes" ;;
  base)    git fetch -q origin "$BASE" 2>/dev/null || true
           diff="$(git diff "origin/${BASE}...HEAD" 2>/dev/null || git diff "${BASE}...HEAD")"
           label="branch vs ${BASE}" ;;
  range)   diff="$(git diff "$RANGE")";    label="range ${RANGE}" ;;
esac

[[ -n "${diff// /}" ]] || { ok "No changes to review (${label})."; exit 0; }

lines="$(printf '%s\n' "$diff" | wc -l | tr -d ' ')"
note "Reviewing ${label} (${lines} diff lines)"

# GATE: local secret scan BEFORE the diff is ever sent anywhere.
note "Running local secret scan..."
diff="$(printf '%s' "$diff" | secret_scan_stdin)"

conventions=""
[[ -f "${AGENT_DIR}/CLAUDE.md" ]] && conventions="$(cat "${AGENT_DIR}/CLAUDE.md")"

out="$(out_dir)/review-$(today).md"

prompt="$(cat <<EOF
You are a careful senior engineer reviewing a git diff BEFORE it is pushed.
Focus on correctness bugs, security issues, and data-loss risks. Be specific
and cite the file and hunk. Do not rewrite the whole diff; point to the lines.

Review checklist / conventions for this repo (may be empty):
${conventions}

Report in GitHub-flavored markdown with these sections:
## Blocking (must fix before push)
## Should fix
## Nits / optional
## Security notes
For each item: file:line, what's wrong, and the concrete fix. If a section has
nothing, write "None found." Do not invent problems to fill sections.

The diff:
\`\`\`diff
${diff}
\`\`\`
EOF
)"

note "Sending diff to the AI for review..."
printf '%s' "$prompt" | ai > "$out"

ok "Review written to: ${out}"
info ""
cat "$out"
info ""
warn "This is a review, not a gate. You decide what to fix before pushing."
