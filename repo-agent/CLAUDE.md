# CLAUDE.md — GitHub Repo Assistant conventions

This file is read by the scripts (and by Claude Code) as the house style for
this repo. Edit it to match your project. Anything here is passed to the AI so
its suggestions match your conventions.

## Golden rules (do not weaken)
1. **Suggest, never execute.** Scripts draft labels, reviews, changelogs, and
   ideas. A human applies them. No script here commits, pushes, tags, edits
   issues, or force-pushes.
2. **No secrets in code.** GitHub auth lives in `gh`; optional knobs live in
   `.env` (gitignored). Never write tokens into tracked files.
3. **Redact before sending.** `review.sh` runs a local secret scan (gitleaks)
   before any diff leaves the machine.
4. **Least privilege.** Use fine-grained tokens scoped to specific repos,
   read-only unless a task truly needs write, with an expiry date.

## Labels (edit to your repo's real set)
- `bug`, `feature`, `docs`, `chore`, `question`, `needs-info`
- Priority: `P0` (critical/blocking), `P1` (high), `P2` (normal), `P3` (low)

When triaging, only suggest labels that already exist in the repo. If an issue
is unclear, suggest `needs-info` rather than guessing.

## Changelog format
Group entries under: `### Features`, `### Fixes`, `### Docs`, `### Internal`.
One user-facing line per PR, with the PR number as `(#NNN)`. Omit empty groups.
Lead with a short "Highlights" paragraph when there are 3+ notable changes.

## Review checklist
- Correctness: off-by-one, null/empty, error handling, race conditions.
- Security: injection, secrets in code, unsafe deserialization, authz gaps.
- Data loss: destructive ops without guards, migrations without rollback.
- Keep feedback specific (file:line + concrete fix). No whole-diff rewrites.

## Build-companion rule (Project Suggester)
When scaffolding a suggested project, create `PLAN.md` and `PROGRESS.md` from
`templates/`. Every session starts with "read PLAN.md and PROGRESS.md, tell me
where we are and what's next," and ends by updating `PROGRESS.md`.
**When I'm stuck on one milestone for more than a session, propose a simpler
version of it** — a shipped smaller thing beats an abandoned bigger one.
