# Claude Chrome Extension — prompts for applying

Use the userscript for standard fields. Use these for the parts it can't do.

**Do not ask the extension to answer the work-authorization questions.** The script handles
those deterministically and correctly; a re-answer risks getting the polarity backwards.

---

## 1. Screen the posting before you spend time (do this first)

> Read this job posting and tell me, briefly:
> 1. Is it still open, or closed/archived?
> 2. Does it require US citizenship, a security clearance, or say sponsorship is unavailable?
> 3. Years of experience required?
> 4. Is the employer enrolled in E-Verify, if stated?
> 5. Verdict: worth applying, or skip?
>
> Context: I'm on F-1 OPT with a STEM-designated degree — authorized ~3 years, no cost to
> employer, but I'll need H-1B eventually. Anything requiring citizenship or clearance is a skip.

---

## 2. Which resume to attach

> Based on this JD, which of these fits best: backend/software engineer, project coordinator,
> data analyst, or QA engineer? One line why.

---

## 3. Custom essay questions

> Draft an answer to this application question, based on the JD on this page.
>
> About me: Software developer, B.Tech CS + M.S. Management Information Systems (Northern
> Arizona University, May 2026). Most recent: Oshi, backend + QA — shipped a real-time WebSocket
> TTS backend in Node/TypeScript, led QA on a monetization sprint where I found a P0 exploit
> allowing unlimited free in-app items, and surfaced 16 bugs in code review including a
> middleware-ordering defect that would have broken every Stripe webhook signature check.
> Before that: co-founder/ML engineer at EchoformAI (idea to MVP in 8 weeks, 3 engineers,
> LangChain + AWS, 50+ beta users) and backend at Sentient Notes (FastAPI, 500+ daily entries,
> sub-200ms, Pinecone vector search).
>
> Rules: 120 words max. Specific, no filler, no "I am passionate about." Use concrete numbers
> from above. Match the seniority of the JD — this is an entry/junior role, don't oversell.

---

## 4. After submitting — log it

> Give me one line in exactly this format for the job on this page:
> `Company | Job Title | Location | today's date | Applied | <the application URL>`

Paste those lines back into a Claude Code session and say "add these to my tracker."

---

## 5. Sanity check before you hit Submit

> Scan this filled application form and flag anything that looks wrong, contradictory, left
> blank, or auto-filled incorrectly. Don't submit — just list issues.
