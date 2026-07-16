#!/usr/bin/env bash
# triage.sh -- pull open issues and draft label/priority suggestions.
#
# SUGGESTS ONLY. It never applies labels or edits issues. It prints a table
# and writes a markdown file you review, then you apply what you agree with
# (a copy-paste `gh` command per issue is included in the output).
#
# Usage:
#   ./triage.sh                 # triage open issues in the current repo
#   REPO=owner/name ./triage.sh # triage a specific repo
#   ./triage.sh --limit 10      # cap how many issues to pull (default 20)

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

LIMIT=20
while [[ $# -gt 0 ]]; do
  case "$1" in
    --limit) LIMIT="${2:?}"; shift 2 ;;
    -h|--help) tail -n +2 "$0" | grep '^#' | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) die "Unknown arg: $1" ;;
  esac
done

require_gh
REPO="$(resolve_repo)"
note "Triaging up to ${LIMIT} open issues in ${REPO}"

# Pull open issues as JSON. Only fields the AI needs -- no PII beyond what's
# already public on the issue.
issues_json="$(gh issue list --repo "$REPO" --state open --limit "$LIMIT" \
  --json number,title,body,labels,author,createdAt)"

count="$(printf '%s' "$issues_json" | jq 'length')"
[[ "$count" -gt 0 ]] || { ok "No open issues to triage in ${REPO}."; exit 0; }

# Existing labels in the repo, so the AI suggests from the real set.
labels_json="$(gh label list --repo "$REPO" --limit 100 --json name,description 2>/dev/null || echo '[]')"

# Optional house conventions.
conventions=""
[[ -f "${AGENT_DIR}/CLAUDE.md" ]] && conventions="$(cat "${AGENT_DIR}/CLAUDE.md")"

out="$(out_dir)/triage-$(today).md"

prompt="$(cat <<EOF
You are a repository triage assistant. Suggest labels and a priority for each
open issue below. ONLY suggest labels that exist in the repo's label set.
Priorities: P0 (critical/blocking), P1 (high), P2 (normal), P3 (low/nice-to-have).

Rules & conventions for this repo (may be empty):
${conventions}

Existing labels (name + description), as JSON:
${labels_json}

Open issues, as JSON:
${issues_json}

Output GitHub-flavored markdown with exactly these parts:

1. A table with columns: Issue | Title | Suggested labels | Priority | One-line rationale.
2. A "## Apply commands" section: for each issue, a ready-to-run gh command,
   e.g. \`gh issue edit <number> --repo ${REPO} --add-label "bug,P1"\`.
   Do NOT run them -- just print them for the human to review and run.

Be conservative. If an issue is unclear, say so and suggest a "needs-info" label
rather than guessing. Never invent labels that aren't in the set.
EOF
)"

note "Sending issue metadata to the AI for suggestions..."
printf '%s' "$prompt" | ai > "$out"

ok "Triage suggestions written to: ${out}"
info ""
cat "$out"
info ""
warn "These are SUGGESTIONS. Review them, then run the gh commands you agree with."
