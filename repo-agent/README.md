# GitHub Repo Assistant

A small, privacy-first toolkit that triages your issues, reviews your diffs
before you push, drafts changelogs — and (as an add-on) suggests projects worth
building and acts as a persistent build companion.

Built from the *"Building 3 Private AI Agents with Claude Code"* report (Agent 3).
The whole design follows one principle: **the agent suggests, you decide.** No
script here applies a label, pushes a commit, or submits anything.

## Data flow, honestly

Your machine ↔ **Anthropic API** (the AI step, via Claude Code) and ↔ **GitHub**
(which already hosts your code, via `gh`). No third parties: no aggregators, no
browser extensions, no "AI wrapper" services. The AI step sends text to
Anthropic for processing; nothing is added beyond that.

## Requirements

- **[Claude Code](https://claude.com/claude-code)** CLI (the AI step runs through
  `claude --print`, so there's no separate API key to manage).
- **[GitHub CLI (`gh`)](https://cli.github.com)**, authenticated: `gh auth login`.
  This is the cleanest free GitHub access — authenticated as you, 5,000 req/hr.
- **`jq`** (JSON wrangling) and **git**.
- Recommended: **[gitleaks](https://github.com/gitleaks/gitleaks)** — the local
  secret scanner `review.sh` runs before sending any diff.

**Cost: $0** beyond your existing Claude Code usage. GitHub's API free tier is
far more than this uses.

### Token scope (least privilege)

Prefer a **fine-grained personal access token**, scoped to only the repos you
choose, read-only where possible, with an expiry date. `gh auth login` is the
simplest path; a scoped token is the tightest. For the Project Suggester, the
token needs read access to your repos and stars.

## Setup

```bash
cd repo-agent
cp .env.example .env            # optional knobs; GitHub auth stays in gh
chmod +x scripts/*.sh           # if not already executable
gh auth login                   # if you haven't
```

Edit `CLAUDE.md` to match your repo's labels, changelog format, and review
checklist — those conventions are fed to the AI so its output matches yours.

## The core tools

Run from anywhere; each resolves the target repo from `REPO` in `.env` or the
current git checkout. Output lands in `out/` (gitignored).

| Script | What it does | Applies anything? |
|---|---|---|
| `scripts/triage.sh` | Pulls open issues, drafts label + priority suggestions and ready-to-run `gh` commands | No — prints commands for you |
| `scripts/review.sh` | Secret-scans your diff locally, then reviews it for bugs & security before you push | No — prints a review |
| `scripts/changelog.sh` | Reads PRs merged since the last tag, drafts grouped release notes | No — drafts markdown |

```bash
./scripts/triage.sh --limit 10
./scripts/review.sh                 # working tree vs HEAD (pre-push habit)
./scripts/review.sh --base main     # your branch vs origin/main
./scripts/changelog.sh              # since the latest tag
```

Wire `review.sh` into a pre-push habit, or run `triage`/`changelog` from a
daily cron.

## Add-on: Project Suggester & Build Companion

Understands your skills from your GitHub activity, suggests projects matched to
your level with a stretch element, then helps you actually finish them.

**1. Profile analyzer**
```bash
./scripts/profile.sh          # public repos + languages + stars -> out/profile.json
./scripts/profile.sh --include-private   # opt in to private repo names
```
Ranks your languages, finds your topics, and surfaces *gaps* — languages you
star often but rarely build in.

**2. Idea generator**
```bash
cp interests.example.md interests.md   # then fill it in (gitignored)
./scripts/suggest.sh                   # -> out/ideas/YYYY-MM.md
```
`interests.md` is the key input: starred repos show where you've *been*, this
file shows where you're *going*. Each idea explains *why it fits you* and names
the hardest part. Treat the list as a menu, not a verdict.

**3. Build companion**
Pick an idea, then ask Claude Code to scaffold it and create `PLAN.md` +
`PROGRESS.md` from `templates/`:
- `PLAN.md` — milestones broken into 1–2 hour sessions; always an obvious next step.
- `PROGRESS.md` — updated at the end of every session: what's done, what's next.

Every session starts with *"read PLAN.md and PROGRESS.md, tell me where we are
and what's next."* That's what kills re-brainstorming — context reloads in
seconds. And a rule in `CLAUDE.md`: when you're stuck on one milestone for more
than a session, the agent proposes a simpler version so projects don't die.

## Privacy risk summary

| Risk | Mitigation (built in) |
|---|---|
| Overly broad token | Use fine-grained, per-repo, read-only, expiring tokens. `gh` auth by default. |
| Token leaking via code/logs | Auth lives in `gh`/`.env`; `.env`, `interests.md`, `out/`, `profile.json` are gitignored. |
| Secrets in a diff sent to the API | `review.sh` runs a local `gitleaks` scan and **aborts** if it flags anything. |
| Private repo code/names leaving your machine | Code goes only to Anthropic for processing. `profile.sh` excludes private repo names unless you opt in. Exclude sensitive repos from scope. |
| Agent making destructive changes | Every script suggests only — no apply, no push, no force-push, no delete. |

## Files

```
repo-agent/
├── CLAUDE.md               # house conventions (labels, changelog, review checklist)
├── README.md               # this file
├── .env.example            # optional config; copy to .env
├── .gitignore              # .env, interests.md, out/, profile.json
├── interests.example.md    # copy to interests.md for the suggester
├── scripts/
│   ├── lib.sh              # shared helpers: auth, repo resolve, AI call, secret gate
│   ├── triage.sh           # issue label/priority suggestions
│   ├── review.sh           # pre-push bug/security review (secret-scanned)
│   ├── changelog.sh        # release notes from merged PRs
│   ├── profile.sh          # build profile.json from your GitHub activity
│   └── suggest.sh          # project ideas from profile + interests
└── templates/
    ├── PLAN.md             # build-companion roadmap template
    └── PROGRESS.md         # build-companion memory template
```
