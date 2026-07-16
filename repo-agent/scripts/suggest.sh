#!/usr/bin/env bash
# suggest.sh -- turn profile.json + interests.md into 5 project ideas.
#
# Sends your profile (skills) and interests.md (direction) to the AI and writes
# repo-agent/out/ideas/YYYY-MM.md. You pick one; the rest stay on the bench.
#
# Treat suggestions as a menu, not a verdict. The "why it fits you" reasoning
# matters more than the idea itself.
#
# Usage:
#   ./suggest.sh              # 5 ideas from your profile + interests
#   ./suggest.sh --count 3    # ask for a different number

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

COUNT=5
while [[ $# -gt 0 ]]; do
  case "$1" in
    --count) COUNT="${2:?}"; shift 2 ;;
    -h|--help) tail -n +2 "$0" | grep '^#' | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) die "Unknown arg: $1" ;;
  esac
done

profile="$(out_dir)/profile.json"
[[ -f "$profile" ]] || die "No profile found. Run ./profile.sh first."

interests="${AGENT_DIR}/interests.md"
if [[ ! -f "$interests" ]]; then
  die "No interests.md found. Copy interests.example.md -> interests.md and fill it in.
Starred repos show where you've been; interests.md shows where you're going -- the combination is what makes suggestions good."
fi

profile_json="$(cat "$profile")"
interests_md="$(cat "$interests")"

mkdir -p "$(out_dir)/ideas"
out="$(out_dir)/ideas/$(date +%Y-%m).md"

prompt="$(cat <<EOF
Suggest ${COUNT} software project ideas tailored to this developer.

Each project MUST:
- use at least 1 skill they already have (see profile.languages/topics),
- teach at least 1 skill from their stated interests,
- be finishable within their weekly time budget over 4-6 weeks,
- be resume-worthy (something worth showing an employer).

For EACH idea output, in GitHub-flavored markdown:
### <Project name>
- **What it is:** one or two sentences.
- **Why it fits you:** tie it explicitly to their languages/stars/interests.
- **Stack:** concrete tools.
- **The hardest part:** the one thing most likely to block them, named honestly.
- **First milestone (1-2h):** the very first concrete step.

End with a short "## How to choose" paragraph: how to pick one given their
time budget and goals. Be honest about scope -- prefer finishable over flashy.

Developer profile (JSON):
${profile_json}

Their interests / direction (free text):
${interests_md}
EOF
)"

note "Sending profile + interests to the AI for ${COUNT} ideas..."
printf '%s' "$prompt" | ai > "$out"

ok "Ideas written to: ${out}"
info ""
cat "$out"
info ""
info "Pick one, then ask Claude Code: \"scaffold this project and create PLAN.md + PROGRESS.md from templates/\""
