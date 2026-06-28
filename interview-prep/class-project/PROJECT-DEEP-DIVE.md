# Deep Dive — "Modernization of a Clothing Factory" (Team 3)

**Course:** ISM 555 – Project Management (Master's), Spring 2025
**Type:** Team project (4 students), each playing a Project Management role on a simulated real-world project
**Your role:** Tarun Reddy — **Engineering Lead** (oversaw equipment installation and the physical modernization)
**Methodology:** Predictive / "waterfall" PMBOK approach — the classic 5 process groups (Initiate → Plan → Execute → Monitor & Control → Close) and the standard PMI artifacts.

> This is a *simulation*. The factory, the $1M budget, the sponsor "Chris Paige," and the 30%/20%/95% targets are all invented to give the team a realistic, sufficiently complex project to practice the PM toolset on. In the interview you present it as a **classroom project that exercised the full PM lifecycle**, not as a factory you actually rebuilt. That honesty is itself a green flag for a PM interviewer.

---

## 1. The project in one paragraph

Team 3 took on the role of the PM organization for a fictional clothing factory that had fallen behind because of **outdated equipment and inefficient processes**. The project's job was to **modernize it**: install automated sewing/cutting machines, put in a **Manufacturing Execution System (MES)**, redesign the factory floor for better workflow, train the staff, and bring the plant up to modern safety/environmental standards. Budget **$1,000,000**, timeline **12 months**, with hard success targets: **+30% production efficiency, −20% material waste, 95% defect-free rate.** Over the semester the team produced the eight standard PM deliverables that, together, would govern such a project from kickoff to closure.

---

## 2. Why this is structured the way it is (the mental model)

A PM interviewer cares less about the factory and more about whether you understand **why each artifact exists and how they connect**. Here's the through-line — memorize this chain, because it's the spine of the whole project:

```
CHARTER  ─────►  authorizes the project, names the sponsor/PM, sets high-level scope, budget, milestones, risks
   │
SCOPE STATEMENT + WBS  ─────►  pins down exactly what IS and ISN'T included; breaks the work into pieces
   │
SCHEDULE (MS Project)  ─────►  sequences those WBS pieces over time; reveals the critical path & milestones
   │
RACI MATRIX  ─────►  assigns a human to every piece of work (who's Responsible/Accountable/Consulted/Informed)
   │
RISK REGISTER  ─────►  what could go wrong, how bad, how likely, and what we'll do about it
   │
STAKEHOLDER ANALYSIS  ─────►  who's affected, how much power/interest they have, how they can help or hurt
   │
COMMUNICATION MATRIX  ─────►  how we keep every stakeholder informed (who/what/when/how)
   │
CLOSURE REPORT  ─────►  did we hit the targets? what went right, what went wrong, what did we learn?
```

Each one **feeds the next**. The Charter's "high-level risks" become the detailed Risk Register. The Charter's "stakeholders list" becomes the full Stakeholder Analysis, which then drives the Communication Matrix. That cause-and-effect is the single most impressive thing you can show you understand.

---

## 3. The 5 PMBOK Process Groups — where each deliverable lives

This is the framework the course is built on. If asked "what methodology did you use," say *predictive / PMBOK process groups* and reference this map:

| Process Group | What it means | Your deliverables here |
|---|---|---|
| **Initiating** | Authorize the project, identify stakeholders | Charter (#1), Stakeholder Analysis (#6) |
| **Planning** | Define scope, schedule, cost, risk, comms | Scope+WBS (#2), Schedule (#3), RACI (#4), Risk Register (#5), Communication Matrix (#7) |
| **Executing** | Do the work, manage the team | (Simulated — described in milestones) |
| **Monitoring & Controlling** | Track progress, manage change & risk | (Comms cadence + risk actions support this) |
| **Closing** | Formal handover, lessons learned | Closure Report (#8) |

Note the bulk of the deliverables are **Planning** — that's deliberate. Project management is mostly won or lost in planning.

---

## 4. Deliverable-by-deliverable deep dive

### #1 — Project Charter  *(Initiating)*
**What a charter is:** the document that formally *authorizes* a project to exist and gives the PM authority to use resources. It's the "birth certificate." Signed by the sponsor.

**What's in yours:**
- **Overview / business case:** factory is uncompetitive due to outdated equipment → modernize to restore competitiveness, profitability, long-term growth.
- **Deliverables (6):** automated sewing/cutting machines; MES implementation; factory layout redesign; staff training; enhanced safety/compliance; final performance report.
- **Objectives (measurable):** +30% efficiency, −20% waste, 95% defect-free, higher employee productivity/satisfaction, regulatory compliance.
- **Resources:** $1M budget; PM + Engineering + IT + Training Consultants + Factory Staff; 12 months.
- **Stakeholders named:** Chris Paige (Sponsor), Gaurav Jamalpuri (PM), **Tarun Reddy (Engineering Lead)**, Rohit Akhil Gonthina (IT Specialist), Rishitha Korada (Training Consultant).
- **Milestone schedule (7 phases):** feasibility → requirements → design → installation/build → pilot testing → training & UAT → go-live + lessons learned. Dated 02/15 → 05/15/2025.
- **Assumptions & constraints:** equipment arrives on time, staff participate, no supply-chain shocks; constrained by the $1M budget, 12-month limit, and the rule that **the factory must keep operating during modernization** (a big real-world constraint).
- **High-level risks:** equipment delays, staff resistance, budget overruns, integration issues, regulatory change.

**Why it matters / what to say:** "The charter is where we converted a vague goal ('modernize the factory') into a sanctioned project with named owners, measurable objectives, a budget, and explicit constraints. The triple constraint — scope, time ($1M / 12 months), and the quality targets — was all set here, and everything downstream had to respect it."

> **Notice the SMART objectives.** +30%, −20%, 95%, 6 months — these are Specific, Measurable, etc. That's what lets the Closure Report later say "did we hit them?" Interviewers love this loop.

---

### #2 — Scope Statement + WBS  *(Planning)*
**What it is:** the Charter says *roughly* what's included; the **Scope Statement** nails it down precisely, and the **Work Breakdown Structure (WBS)** decomposes the deliverables into the actual chunks of work. The WBS is the foundation everything else (schedule, cost, RACI) is built on.

**What's in yours — the in/out-of-scope table, which is the heart of scope management:**

| In Scope | Out of Scope |
|---|---|
| Replace outdated machinery with energy-efficient equipment | Changes to distribution / retail operations |
| Install automation for key production processes | Expanding the factory beyond existing premises |
| Advanced quality-control mechanisms | New product lines |
| Factory layout redesign for workflow | Company branding / marketing changes |
| Staff training on new equipment/processes | Upgrades to admin/non-production areas |
| Upgrade IT infrastructure for automation & QC | |
| Eco-friendly materials & waste management | |
| Energy management/monitoring systems | |
| Workplace safety upgrades & compliance | |

**Why the "Out of Scope" column is gold:** it's how a PM prevents **scope creep**. By writing down "we are NOT building new product lines or touching retail," the team protects the 12-month / $1M constraint. If asked about scope management, this column is your example.

> ⚠️ **Gap to fill:** The document you have is the Scope *Statement*. A true **WBS** is usually a tree/hierarchy (e.g., 1.0 Procurement → 1.1 Source machines → 1.2 Contracts; 2.0 Installation → 2.1 …). Check whether your WBS is a separate page or lives inside the MS Project file (Deliverable #3) — in MS Project the indented task list *is* the WBS. Be ready to describe it as a hierarchy of work packages. (See §7.)

---

### #3 — Project Schedule (MS Project)  *(Planning)*  — **⚠️ file not yet reviewed (.mpp)**
**What it is:** takes the WBS work packages, estimates durations, sets dependencies (Task B can't start until Task A finishes), and lays them on a calendar. MS Project then computes the **critical path** — the longest chain of dependent tasks that determines the minimum project duration. Any delay on a critical-path task delays the whole project.

**What you already know about it (from the Charter's milestone schedule):** a **7-phase** plan running **Feb 15 → May 15, 2025** (in the simulation's compressed timeline):
1. Project Preparation / feasibility (due 02/15)
2. Collect Requirements (02/28)
3. Design Phase (03/15)
4. Development / Installation (04/01)
5. Prototype/Pilot Testing (04/15)
6. User Acceptance & Training (04/30)
7. Go-Live & Lessons Learned (05/15)

**Key vocabulary to be ready for:** *critical path, milestone, dependency (finish-to-start), Gantt chart, baseline, slack/float, duration vs. effort.*

> ⚠️ **To complete this section** you need to open the `.mpp` (it's Windows-only software — your Mac couldn't open it). Options: open it on a Windows/lab PC and screenshot the Gantt; check Canvas for the PDF you submitted; or just be ready to describe it verbally. See §7.

---

### #4 — RACI / Responsibility Assignment Matrix  *(Planning)*  — **⚠️ file not provided**
**What it is:** a grid with **tasks/deliverables down the side** and **people across the top**, where each cell is one of:
- **R = Responsible** — does the work
- **A = Accountable** — owns the outcome, signs off (exactly ONE per task)
- **C = Consulted** — gives input (two-way)
- **I = Informed** — kept in the loop (one-way)

**What yours almost certainly looked like** (based on the team roles in the charter — confirm against your actual file):

| Task | PM (Gaurav) | Eng. Lead (Tarun) | IT (Rohit) | Training (Rishitha) | Sponsor (Chris) |
|---|---|---|---|---|---|
| Procure & install machines | A | **R** | C | I | I |
| Implement MES software | A | C | **R** | I | I |
| Factory layout redesign | A | **R** | C | I | C |
| Staff training program | A | I | C | **R** | I |
| Budget approval / funding | C | I | I | I | **A** |

**Why it matters:** RACI kills the two classic project failures — "I thought *you* were doing that" (no R) and "too many cooks" (multiple A's). As **Engineering Lead**, you were the **R** on the physical installation and layout work.

> ⚠️ **Gap to fill:** Get the actual RACI file. The grid above is a reconstruction — your real one may differ. See §7.

---

### #5 — Risk Register  *(Planning)*
**What it is:** a living list of things that could go wrong, each scored and given a response. This is how a PM is proactive instead of reactive.

**The 4 risks your team logged** (scored as Impact × Probability on a 1–5 scale → "Risk Score"):

| ID | Cause | Risk | Sched. impact | Cost impact | Prob | Impact | **Score** | Response |
|---|---|---|---|---|---|---|---|---|
| 1 | Unreliable fabric supplier | Delayed deliveries → production delays | 2 wks | $15,000 | 4 | 4 | **16** | Alternate supplier list + safety-stock inventory |
| 2 | Inadequate equipment maintenance | Machine breakdown → production stop | 3 wks | $25,000 | 3 | 5 | **15** | Preventive maintenance schedule + backup service contracts |
| 3 | Labor market challenges | Shortage of skilled labor | 1 wk | $10,000 | 3 | 3 | **9** | Better recruitment, competitive wages, training |
| 4 | Changing regulations | Permit delays / compliance fines | 2 wks | $12,000 | 2 | 4 | **8** | Monitor regs, engage legal consultants early |

**The scoring matrix:** a 5×5 grid, Probability (Rare→Certain) × Impact (Insignificant→Critical). Score = Prob × Impact, so the worst possible is 25. Risk #1 (16) and #2 (15) are the top risks — both tied to **keeping production running**, which makes sense given the "factory must keep operating during modernization" constraint.

**Risk-response types to know** (your responses are mostly *Mitigate*): **Avoid, Mitigate, Transfer (e.g., insurance/contracts), Accept.** Your "backup service contracts" is partly *Transfer*; "safety stock" is *Mitigate*.

**Why it matters / what to say:** "We didn't just list risks — we quantified each on schedule (weeks) and cost ($) impact, scored Probability × Impact on a 5×5 matrix to prioritize, and assigned a concrete mitigation to each. The two highest-scored risks both threatened continuous production, which was our hardest constraint, so that's where we concentrated our contingency planning."

> Note: as Engineering Lead, **Risk #2 (equipment maintenance/breakdown)** was squarely in your lane — preventive maintenance and service contracts were your mitigation to own.

---

### #6 — Stakeholder Analysis Matrix  *(Initiating/Planning)*
**What it is:** identify everyone affected by the project and assess each on **Power/Influence, Interest, Awareness, and Internal/External**, plus how they can **help** or **hinder**. This drives how you manage and communicate with each group. The classic model is the **Power/Interest grid** (Manage Closely / Keep Satisfied / Keep Informed / Monitor).

**Your team was thorough — ~23 stakeholders**, internal and external. The high-power ones (your "Manage Closely" quadrant):
- **Factory Owner/CEO** — High power, High interest (funding, decisions)
- **Plant Manager** — High/High (daily ops, integration)
- **Finance Department** — High power (approves capex)
- **Government/Regulatory Agencies** — High power, Low interest → "Keep Satisfied" (compliance, penalties)
- **Investors/Shareholders** — High power (ROI, can pull funding)

High-interest but lower-power (keep informed/engaged): **Production Supervisors, Line Workers, QA/Compliance, Labor Unions, Safety/HSE teams.** Line workers are Low power but High interest — the people most affected, key to adoption, which is why **change management and training** matter so much.

**Why it matters / what to say:** "We mapped power vs. interest so we'd spend our attention correctly — manage the CEO, Plant Manager, and Finance closely; keep regulators satisfied; and actively engage the line workers, because although they're low-power they're high-interest and their adoption made or broke the whole modernization. The 'can assist by / can hinder by' columns turned the analysis into an action plan." This **directly feeds the Communication Matrix.**

---

### #7 — Communication Matrix  *(Planning)*
**What it is:** the operational plan for stakeholder communication — for each audience: **what** message, **how often**, through **which medium**, **who delivers** it, and the **expected result.** It's how you execute the stakeholder strategy from #6.

**Your communication plan:**

| Audience | Vehicle | Frequency | Medium | Delivered by | Expected result |
|---|---|---|---|---|---|
| Project Team | Kickoff meeting | One-time | Presentation | PM | Align on objectives, timeline, roles |
| All stakeholders | Change-management procedures | As needed | Meeting | PM | Agree on scope/process changes |
| Project Team | Project meetings | Bi-weekly | Presentation | PM | Progress, issues, new tasks |
| CIO | Status report | Monthly | Email | Consultant | Progress/issues/budget alignment |
| Factory Staff | Training updates | Bi-monthly | Workshop | Operations Lead | Prepare workers, gather feedback |
| Vendors | Requirements/spec discussions | As scheduled | Meeting/Email | Procurement Mgr | Align delivery & specs |
| Executive Board | Executive summary | Quarterly | Presentation | PM | Milestones, budget, strategy |
| QA & Safety | Compliance/safety updates | Monthly | Email/Report | Safety Officer | Regulatory compliance |
| HR | Role-transition plan | As needed | Memo/Meeting | HR Manager | Smooth role transitions |
| Finance | Budget utilization report | Monthly | Spreadsheet/Email | Finance Analyst | Financial monitoring |
| IT | Systems-integration briefing | Monthly | Meeting/Presentation | IT Lead | Tech alignment & compatibility |

**Why it matters / what to say:** "Communication is the single biggest job of a PM — studies put it at ~90% of the role. We matched each stakeholder group to a tailored cadence and channel: executives get a quarterly strategic summary, the team gets bi-weekly working meetings, finance gets monthly budget reports. The frequency scales with how closely we needed to manage each group from the stakeholder analysis — high-power groups get formal, regular touchpoints."

---

### #8 — Project Closure Report  *(Closing)*  ✅
**What it is:** the formal wrap-up. Confirms deliverables were met against the charter's objectives, captures **lessons learned**, and releases the team. The course required at least one **"What Went Right?"** and one **"What Went Wrong?"**, plus how you'd apply the lessons.

**Execution summary:** the team ran all 7 phases (planning → requirements/design → layouts/upgrades → installation/automation → testing/optimization → training/validation → production/monitoring) and finished on schedule **except for a 5-day slip caused by one supplier**.

**Results achieved vs. the charter's targets:**

| Metric | Charter target | Actual result | Verdict |
|---|---|---|---|
| Production efficiency | +30% | **+32% production increase** | ✅ **Exceeded** |
| Cost / waste | −20% material waste | **−22% labor cost** | ✅ Exceeded (note: measured as labor cost, not material waste) |
| Automation | (enabler goal) | **95% automation achieved** | ✅ |
| Workforce | skill development | **90% staff training success** | ✅ |

**What Went Right:** *Early stakeholder engagement.* By engaging stakeholders at the start, the team got clear requirements up front and had **almost no scope creep** or rework. → This is the payoff of Deliverables #6 and #7 working as intended.

**What Went Wrong:** *A 5-day installation slippage due to a supplier delay.* → **This is the single best story in the whole project** (see callout below).

**Lessons learned (7):**
1. **Engage stakeholders early** — smoother approvals, fewer communication gaps.
2. **Reliable vendors are essential** — need strict **SLAs** and verified backup vendors for critical machinery.
3. **Change management is not optional** — early worker resistance showed the need for transparent comms + pre-implementation training.
4. **Always build buffer time into the schedule** — tight timelines left no room for delays; add buffer to critical phases like procurement.
5. **Communication matrices work** — structured updates kept everyone aligned and built trust.
6. **Proactive risk planning pays off** — risks from the register (supply delays, labor shortages) actually materialized, and pre-built mitigations kept them in control.
7. **Training is a key success factor** — hands-on training drove high adoption and cut the post-install learning curve.

> ⭐ **YOUR STRONGEST INTERVIEW STORY — connect the risk register to reality.** Your #1-scored risk in the Risk Register (score 16) was *"unreliable supplier → delayed deliveries."* In closing, **that exact risk materialized.** Because the team had already planned mitigations (backup-supplier list, safety stock, buffer), the impact was contained to just **5 days** instead of derailing the project. That's a complete, real loop: *we identified the top risk → it came true → our pre-planned response limited the damage → and the lesson learned was to build even more schedule buffer next time.* As the **Engineering Lead** who owned the installation track, this slip was in your lane — you can own this story directly. **Practice telling it in STAR form.**

> **Honest caveat for the interview:** these are *simulated* results (the team set the numbers as the planned outcome of the exercise), so present them as "our project plan was designed to deliver +32% efficiency" rather than claiming you physically rebuilt a factory. Interviewers respect the distinction, and the *process* is what's being evaluated anyway.

---

## 5. Your specific role — Engineering Lead

In the charter you're the **Engineering Lead**, responsible for *equipment installation and the physical modernization*. Across the deliverables, your lane was:
- **Charter:** named owner of equipment installation.
- **Scope/WBS:** the machinery replacement, automation install, and **factory layout redesign** work packages.
- **Schedule:** Phases 3–4 (Design + Development/Installation) — likely **on the critical path**, since installation gates pilot testing and go-live.
- **RACI:** the **R** (Responsible) for procure/install machines and layout redesign.
- **Risk:** owner of **Risk #2** (equipment maintenance/breakdown) — preventive maintenance + backup service contracts.
- **Stakeholders:** worked with Engineering/Maintenance team, Vendors/Equipment Suppliers, Safety/HSE.

When asked "what did *you* do," anchor on this: *"I owned the engineering track — equipment procurement and installation, the factory-layout redesign, and the maintenance-related risk. That work was on the critical path because installation had to finish before we could pilot and go live, all while the constraint was that the factory had to keep producing."*

---

## 6. The PM vocabulary cheat-sheet (so you speak the language)

- **Triple constraint / iron triangle:** Scope, Time, Cost (Quality in the middle). Yours: full modernization, 12 months, $1M, with quality targets.
- **Process groups:** Initiating, Planning, Executing, Monitoring & Controlling, Closing.
- **Knowledge areas (PMBOK):** Integration, Scope, Schedule, Cost, Quality, Resource, Communications, Risk, Procurement, Stakeholder. (You touched scope, schedule, risk, comms, stakeholder, resource.)
- **WBS / work package:** hierarchical decomposition of the work; smallest piece = work package.
- **Critical path:** longest chain of dependent tasks; sets minimum duration; zero float.
- **Milestone:** zero-duration marker of a significant point (your 7 phase gates).
- **RACI:** Responsible, Accountable (one), Consulted, Informed.
- **Risk score:** Probability × Impact; responses = Avoid / Mitigate / Transfer / Accept.
- **Stakeholder grid:** Power × Interest → Manage Closely / Keep Satisfied / Keep Informed / Monitor.
- **Scope creep:** uncontrolled scope growth; your Out-of-Scope list is the defense.
- **Baseline:** the approved plan you measure variance against.
- **Lessons learned:** captured at closure to improve future projects.

---

## 7. What to retrieve to make this complete

| Item | Why you want it | How to get it |
|---|---|---|
| **#3 Schedule (.mpp)** | To speak to critical path, durations, dependencies, Gantt | Open on a Windows/lab PC → screenshot Gantt, or find the PDF on Canvas |
| **#4 RACI Matrix (.mpp)** | Confirms your exact responsibilities; common interview probe | Same as #3 — it's also an MS Project file; §4 table is a reconstruction until then |
| **WBS (if separate)** | To describe the work hierarchy | Likely embedded in the MS Project file (the indented task list = the WBS) |

Both remaining items are `.mpp` (MS Project) files a Mac can't open. **The closure report (#8) is now fully incorporated.** Once you get the two `.mpp` files into a viewable form (Windows/lab PC screenshot, or Canvas PDF), send them and we'll have the complete picture.

---

## 8. Likely interview questions this project sets you up to answer

- "Walk me through a project you managed end to end." → Use the §2 chain.
- "How do you handle scope creep?" → The Out-of-Scope column (#2).
- "How do you prioritize risks?" → Probability × Impact 5×5 matrix (#5).
- "How do you manage stakeholders?" → Power/Interest grid → tailored comms cadence (#6→#7).
- "Tell me about a time something went wrong." → The supplier delay (Risk #1 materialized) → contained to 5 days by pre-planned mitigation (#5→#8). Your strongest story.
- "What's a critical path?" → Define it, then point to installation gating go-live (#3).
- "What was *your* contribution on the team?" → Engineering Lead lane (§5).
