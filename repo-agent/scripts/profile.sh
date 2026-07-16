#!/usr/bin/env bash
# profile.sh -- build a local profile.json of your GitHub skills & interests.
#
# Pulls your repos, languages, topics, and starred repos via gh, then writes
# repo-agent/out/profile.json. This file is the input to suggest.sh.
#
# PRIVACY: by default we EXCLUDE private repo names -- languages and topics are
# enough for good suggestions. Pass --include-private to include them.
#
# Usage:
#   ./profile.sh                    # public repos + languages + stars
#   ./profile.sh --include-private  # also include private repo names/langs

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

INCLUDE_PRIVATE=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --include-private) INCLUDE_PRIVATE=1; shift ;;
    -h|--help) tail -n +2 "$0" | grep '^#' | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) die "Unknown arg: $1" ;;
  esac
done

require_gh
need jq

me="$(gh api user -q .login)"
note "Building profile for @${me} (include-private=${INCLUDE_PRIVATE})"

# Your repos (owner-affiliation limits to repos you own).
repos_json="$(gh api --paginate 'user/repos?per_page=100&affiliation=owner' \
  -q '[.[] | {name, private, language, topics, stargazers_count, fork, archived}]' \
  | jq -s 'add // []')"

if [[ "$INCLUDE_PRIVATE" -eq 0 ]]; then
  repos_json="$(printf '%s' "$repos_json" | jq '[.[] | select(.private == false)]')"
fi

# Starred repos: where your attention goes (signals interest, not skill).
starred_json="$(gh api --paginate 'user/starred?per_page=100' \
  -q '[.[] | {full_name, language, topics, description}]' \
  | jq -s 'add // []' | jq '.[0:200]')"

# Aggregate languages (weighted by repo count) and topics.
lang_rank="$(printf '%s' "$repos_json" | jq '
  [.[] | select(.language != null and .fork == false) | .language]
  | group_by(.) | map({language: .[0], repos: length})
  | sort_by(-.repos)')"

topics_rank="$(printf '%s' "$repos_json" | jq '
  [.[].topics[]?] | group_by(.) | map({topic: .[0], count: length})
  | sort_by(-.count) | .[0:25]')"

star_langs="$(printf '%s' "$starred_json" | jq '
  [.[] | select(.language != null) | .language]
  | group_by(.) | map({language: .[0], stars: length})
  | sort_by(-.stars) | .[0:15]')"

# "Gaps": languages you star often but rarely build in -- fertile ground.
gaps="$(jq -n --argjson built "$lang_rank" --argjson starred "$star_langs" '
  ($built | map(.language)) as $have
  | [$starred[] | select(.language as $l | ($have | index($l)) | not)
     | {language: .language, starred: .stars}]')"

out="$(out_dir)/profile.json"
jq -n \
  --arg user "$me" \
  --arg generated "$(today)" \
  --argjson include_private "$([[ $INCLUDE_PRIVATE -eq 1 ]] && echo true || echo false)" \
  --argjson languages "$lang_rank" \
  --argjson topics "$topics_rank" \
  --argjson starred_languages "$star_langs" \
  --argjson gaps "$gaps" \
  --argjson repo_count "$(printf '%s' "$repos_json" | jq 'length')" \
  --argjson star_count "$(printf '%s' "$starred_json" | jq 'length')" \
  '{
     user: $user,
     generated: $generated,
     include_private: $include_private,
     repo_count: $repo_count,
     star_count: $star_count,
     languages: $languages,
     topics: $topics,
     starred_languages: $starred_languages,
     gaps: $gaps
   }' > "$out"

ok "Profile written to: ${out}"
note "Languages you build in:"; printf '%s' "$lang_rank" | jq -r '.[] | "  \(.language)  (\(.repos) repos)"' | head -8 >&2
note "Gaps (star but rarely build):"; printf '%s' "$gaps" | jq -r '.[] | "  \(.language)  (\(.starred) stars)"' | head -6 >&2
info ""
info "Next: write repo-agent/interests.md (copy interests.example.md), then run ./suggest.sh"
