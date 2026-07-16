#!/usr/bin/env bash
# lib.sh -- shared helpers for the GitHub Repo Assistant.
# Sourced by every script. Not meant to be run directly.
#
# Design rules (from the build & risk report):
#   - Suggest, never execute. Scripts write drafts you review; they never apply.
#   - No secrets in code. Config lives in .env (gitignored) or gh's own auth.
#   - Redact before sending. Local secret scan runs before any AI review.
#   - Your data flow is: your machine <-> Anthropic API (and GitHub, which
#     already has your code). No third parties.

set -euo pipefail

# --- Resolve paths -----------------------------------------------------------
# AGENT_DIR = repo-agent/ (the parent of scripts/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# --- Load .env if present ----------------------------------------------------
# .env is optional. gh handles GitHub auth on its own; .env is only for
# optional knobs (default repo, model, etc.). It must stay gitignored.
if [[ -f "${AGENT_DIR}/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "${AGENT_DIR}/.env"
  set +a
fi

# --- Pretty output -----------------------------------------------------------
_c_red=$'\033[31m'; _c_grn=$'\033[32m'; _c_ylw=$'\033[33m'; _c_dim=$'\033[2m'; _c_rst=$'\033[0m'
info()  { printf '%s\n' "$*" >&2; }
note()  { printf '%s%s%s\n' "$_c_dim" "$*" "$_c_rst" >&2; }
warn()  { printf '%s! %s%s\n' "$_c_ylw" "$*" "$_c_rst" >&2; }
ok()    { printf '%s✓ %s%s\n' "$_c_grn" "$*" "$_c_rst" >&2; }
die()   { printf '%s✗ %s%s\n' "$_c_red" "$*" "$_c_rst" >&2; exit 1; }

# --- Dependency checks -------------------------------------------------------
need() {
  command -v "$1" >/dev/null 2>&1 || die "Missing dependency: '$1'. ${2:-}"
}

require_gh() {
  need gh "Install: https://cli.github.com  then run: gh auth login"
  if ! gh auth status >/dev/null 2>&1; then
    die "gh is installed but not authenticated. Run: gh auth login"
  fi
}

# --- Repo resolution ---------------------------------------------------------
# Prefer an explicit REPO env var (owner/name), else the repo of the current
# git checkout, else fail with a clear message.
resolve_repo() {
  if [[ -n "${REPO:-}" ]]; then
    printf '%s' "$REPO"; return 0
  fi
  local r
  if r="$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null)"; then
    printf '%s' "$r"; return 0
  fi
  die "Could not determine target repo. Set REPO=owner/name in .env, or run inside a git checkout of the repo."
}

# --- AI helper ---------------------------------------------------------------
# The AI step routes through Claude Code in headless mode (claude -p), so there
# is no separate API key to manage and the trust boundary is unchanged: your
# machine <-> Anthropic. Reads the prompt from stdin, prints the reply.
#
# Override with CLAUDE_BIN in .env if the binary isn't named `claude`.
ai() {
  local bin="${CLAUDE_BIN:-claude}"
  if ! command -v "$bin" >/dev/null 2>&1; then
    die "AI step needs Claude Code CLI ('$bin'). Install it, or set CLAUDE_BIN in .env."
  fi
  # --print: non-interactive; read the full prompt from stdin.
  "$bin" --print "${CLAUDE_EXTRA_ARGS:-}"
}

# --- Secret scan gate --------------------------------------------------------
# Runs gitleaks (if available) over provided input BEFORE anything is sent to
# the AI. This protects you from both API exposure and from committing keys.
# Non-fatal if gitleaks isn't installed, but we warn loudly.
secret_scan_stdin() {
  if command -v gitleaks >/dev/null 2>&1; then
    local tmp; tmp="$(mktemp)"
    cat > "$tmp"
    if ! gitleaks detect --no-git --redact -s "$tmp" >/dev/null 2>&1 \
       && ! gitleaks stdin --redact < "$tmp" >/dev/null 2>&1; then
      # Older/newer gitleaks CLIs differ; if either flags something, stop.
      rm -f "$tmp"
      die "gitleaks flagged a potential secret. Aborting before AI review. Inspect the diff and remove the secret."
    fi
    cat "$tmp"; rm -f "$tmp"
  else
    warn "gitleaks not installed -- skipping local secret scan. Install it: https://github.com/gitleaks/gitleaks"
    cat
  fi
}

# --- Output dir --------------------------------------------------------------
out_dir() {
  local d="${AGENT_DIR}/out"
  mkdir -p "$d"
  printf '%s' "$d"
}

today() { date +%Y-%m-%d; }
