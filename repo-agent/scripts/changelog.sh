#!/usr/bin/env bash
# changelog.sh -- draft release notes from PRs merged since the last tag.
#
# SUGGESTS ONLY. It drafts markdown release notes to a file. It does not create
# tags, releases, or push anything.
#
# Usage:
#   ./changelog.sh                  # PRs merged since the latest tag
#   ./changelog.sh --since v1.2.0   # PRs merged since a specific tag
#   REPO=owner/name ./changelog.sh

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

SINCE_TAG=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --since) SINCE_TAG="${2:?}"; shift 2 ;;
    -h|--help) tail -n +2 "$0" | grep '^#' | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) die "Unknown arg: $1" ;;
  esac
done

require_gh
REPO="$(resolve_repo)"

# Find the reference tag (latest, unless the user named one).
if [[ -z "$SINCE_TAG" ]]; then
  SINCE_TAG="$(gh release view --repo "$REPO" --json tagName -q .tagName 2>/dev/null || true)"
  if [[ -z "$SINCE_TAG" ]]; then
    SINCE_TAG="$(gh api "repos/${REPO}/tags" -q '.[0].name' 2>/dev/null || true)"
  fi
fi

if [[ -n "$SINCE_TAG" ]]; then
  since_date="$(gh api "repos/${REPO}/git/refs/tags/${SINCE_TAG}" \
      -q .object.sha 2>/dev/null \
      | xargs -I{} gh api "repos/${REPO}/commits/{}" -q '.commit.committer.date' 2>/dev/null || true)"
  note "Collecting PRs merged since tag ${SINCE_TAG} (${since_date:-unknown date})"
else
  since_date=""
  warn "No tags found. Drafting notes from all merged PRs (most recent 50)."
fi

# Merged PRs, newest first. Filter by merge date if we have a reference date.
prs_json="$(gh pr list --repo "$REPO" --state merged --limit 100 \
  --json number,title,mergedAt,labels,author,url)"

if [[ -n "$since_date" ]]; then
  prs_json="$(printf '%s' "$prs_json" | jq --arg d "$since_date" '[.[] | select(.mergedAt > $d)]')"
fi

count="$(printf '%s' "$prs_json" | jq 'length')"
[[ "$count" -gt 0 ]] || { ok "No merged PRs since ${SINCE_TAG:-the beginning}. Nothing to draft."; exit 0; }
note "${count} merged PR(s) to summarize."

conventions=""
[[ -f "${AGENT_DIR}/CLAUDE.md" ]] && conventions="$(cat "${AGENT_DIR}/CLAUDE.md")"

out="$(out_dir)/changelog-$(today).md"

prompt="$(cat <<EOF
You are drafting release notes for ${REPO}, covering PRs merged since
${SINCE_TAG:-the start of the project}.

Changelog format / conventions for this repo (may be empty):
${conventions}

Group PRs under headings: ### Features, ### Fixes, ### Docs, ### Internal.
Infer the group from each PR's title and labels. For each entry write one
user-facing line and append the PR number as (#NNN). Omit empty groups.
Add a short "Highlights" paragraph at the top if 3+ notable changes exist.
Keep it factual -- summarize only what the PR titles/labels support; do not
invent features.

Merged PRs as JSON:
${prs_json}
EOF
)"

note "Sending PR list to the AI to draft release notes..."
printf '%s' "$prompt" | ai > "$out"

ok "Draft release notes written to: ${out}"
info ""
cat "$out"
info ""
warn "Draft only. Review, then create the release yourself when ready."
