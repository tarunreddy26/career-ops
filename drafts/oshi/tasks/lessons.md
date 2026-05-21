# Lessons Learned

A running log of patterns and corrections to prevent repeating the same mistakes.
Reviewed at the start of each session per `CLAUDE.md` instructions.

---

## 2026-04-14 — Don't invent scope

**Context:** While Tarun was waiting on a teammate to unblock the final sprint
QA, I suggested he write a "1-page sprint wrap-up doc for Will" and presented
it as if it were a required deliverable. He pushed back and asked whether the
brief actually called for it. It did not — I had invented the task as a
"nice-to-have" and surfaced it on equal footing with real brief deliverables.

**Why it's bad:**
- Wastes the user's time on busywork that isn't required
- Creates false urgency / fake stress near sprint deadlines
- Undermines trust — if I make up scope, the user has to second-guess every
  suggestion I give them
- Violates `CLAUDE.md` core principle: "Simplicity First — Make every change
  as simple as possible. Impact minimal code." (and minimal scope)

**The rule going forward:**
1. **Before suggesting any task, check the source-of-truth document** (brief,
   spec, ticket, acceptance criteria). Re-read it if needed.
2. **Separate clearly between "required by brief" vs "nice to have"** when
   surfacing suggestions. Never blend them in the same numbered list without
   labels.
3. **When the user asks "what's left to do," answer ONLY from the brief first.**
   Optional extras come second, explicitly labelled as optional.
4. **If 4 of 6 deliverables are done and 2 are blocked on someone else, the
   correct answer is "wait" — not "let me invent filler work."** Doing nothing
   while genuinely blocked is professional, not lazy.

**Self-test before suggesting work:** "Can I quote the line in the brief that
asks for this? If no, label it as my own suggestion, not a requirement."

---

## 2026-04-14 — Verify teammate claims against the live system before relaying

**Context:** When Intern A replied saying he had fixed bugs and pushed changes,
I instinctively tested every claim against the live backend before drafting
Tarun's reply. This caught the fact that the CRITICAL webhook middleware bug
had ALSO been silently fixed in the same push — which became the highlight of
the reply and a key sprint win.

**The rule going forward:**
- When a teammate says "fixed and pushed," always re-test the live system
  before forwarding the claim to the user
- Read the source on GitHub for any silent fixes the teammate didn't mention
- Distinguish "claim verified" from "claim plausible" in any status update
