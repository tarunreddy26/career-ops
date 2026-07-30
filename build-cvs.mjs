#!/usr/bin/env node
/**
 * Builds ATS-optimized CV variants for Tarun Reddy Alla, one per target track.
 * Same factual content everywhere — only ordering and emphasis change.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';

const TPL = readFileSync('templates/cv-template.html', 'utf8');
const OUT = 'output';
mkdirSync(OUT, { recursive: true });

// ── Shared factual content ────────────────────────────────────────────
const OSHI = {
  tts: `Shipped a real-time <strong>WebSocket</strong>-based text-to-speech streaming backend (<strong>Node.js/TypeScript</strong>) to Render with CORS whitelisting, rate limiting, and structured logging; load-tested across <strong>20 concurrent sessions with zero connection leaks</strong>.`,
  qa: `Led QA for an in-app purchases / virtual-currency monetization sprint — executed <strong>33 tests across 3 sessions</strong>, uncovered a <strong>P0 exploit</strong> allowing unlimited free in-app items, and signed off all <strong>9 acceptance criteria</strong> after fixes.`,
  review: `Performed a full backend code review surfacing <strong>16 bugs</strong>, including a critical Express middleware-ordering defect that would have broken <strong>every Stripe webhook signature verification</strong> in production.`,
  db: `Designed and deployed a user-state persistence service on <strong>Supabase/Postgres</strong> with 3 REST endpoints, time-based state decay, and login restore powering the app's real-time reactions.`,
};
const ECHO = {
  coord: `Helped take an AI product from idea to MVP, <strong>coordinating sprint planning and the technical roadmap</strong> with a 3-person founding team across product and engineering.`,
  build: `Built and deployed <strong>LLM-powered inference pipelines</strong> (Python, LangChain, AWS) for an initial group of beta users.`,
};

const PROJECTS = {
  agile: {
    title: 'Agile Delivery — Campus Event Registration System',
    badge: 'Project Management',
    tech: 'Jira / Trello, Scrum, Gantt, Notion',
    desc: `Acted as <strong>project manager</strong> for a team build: authored the project charter, <strong>work breakdown structure (WBS)</strong>, and risk register, and defined scope with stakeholders. Ran sprint planning, standups, and a retrospective; tracked progress with a <strong>Gantt chart and burndown</strong>, keeping the team on schedule.`,
  },
  tracker: {
    title: 'Team Task Tracker — Full-Stack Web App',
    badge: 'Full-Stack',
    tech: 'React, Node.js / Express, PostgreSQL, Render',
    desc: `Built a Kanban-style task management app with a <strong>REST API</strong>, user authentication, and drag-and-drop status tracking. Deployed to Render with environment-based configuration and input validation.`,
  },
  dash: {
    title: 'Operations Analytics Dashboard',
    badge: 'Data & BI',
    tech: 'Python, Pandas, SQL, Power BI',
    desc: `Built an <strong>ETL pipeline</strong> ingesting a public operations dataset into SQL and transforming it with Python/Pandas. Designed an interactive <strong>Power BI dashboard</strong> surfacing throughput, cycle-time, and cost KPIs with a repeatable refresh process.`,
  },
};

// ── Per-track configuration ───────────────────────────────────────────
const VARIANTS = {
  'backend-swe': {
    label: 'Backend / Software Engineer',
    summary: `Software developer with a B.Tech in Computer Science and an M.S. in Management Information Systems, shipping production backend systems in <strong>Node.js/TypeScript and Python</strong>. Built and deployed a real-time WebSocket streaming service and a Postgres-backed persistence API at an early-stage startup, and caught a critical middleware defect in code review before it reached production. Comfortable owning a service end to end — design, deploy, load-test, and monitor.`,
    competencies: ['Node.js / TypeScript', 'Python', 'REST APIs & WebSockets', 'PostgreSQL / Supabase', 'Code Review', 'AWS & Docker', 'Test & QA', 'Agile / Scrum'],
    oshi: ['tts', 'db', 'review', 'qa'],
    echo: ['build', 'coord'],
    projects: ['tracker', 'dash', 'agile'],
    skills: [
      ['Programming', 'Python, JavaScript, TypeScript, SQL'],
      ['Backend & Web', 'Node.js, Express, REST APIs, WebSockets, React'],
      ['Databases', 'PostgreSQL, Supabase, SQL'],
      ['Cloud & Tools', 'AWS, GCP, Docker, Git, Linux, Render'],
      ['Quality', 'Code Review, Test Planning, Acceptance Testing'],
      ['Practices', 'Agile/Scrum, Sprint Planning, CI/CD basics'],
    ],
  },
  'project-coordinator': {
    label: 'Project / Program Coordinator',
    summary: `Project coordinator with an <strong>M.S. in Management Information Systems (Project Management coursework)</strong> and a Computer Science engineering background. Coordinated sprint planning and technical roadmap for a 3-person founding team, and led acceptance testing across a monetization sprint — signing off <strong>9 acceptance criteria</strong> after driving fixes to closure. Fluent in the delivery toolkit (charter, WBS, risk register, Gantt, burndown) and technical enough to run a standup with engineers and understand the answers.`,
    competencies: ['Project Planning & Scheduling', 'Agile / Scrum', 'Sprint Planning', 'Stakeholder Coordination', 'Risk Management', 'WBS & Gantt Charts', 'Acceptance Testing', 'Jira / Trello / Notion'],
    oshi: ['qa', 'review', 'tts', 'db'],
    echo: ['coord', 'build'],
    projects: ['agile', 'dash', 'tracker'],
    skills: [
      ['Project Management', 'Agile/Scrum, Sprint Planning, Backlog Management, WBS, Gantt Charts, Risk Management, Stakeholder Coordination'],
      ['Tools', 'Jira, Trello, Notion, MS Project basics, Confluence'],
      ['Quality', 'Test Planning, Acceptance Testing, UAT Sign-off'],
      ['Data & Reporting', 'SQL, Excel, Power BI, Pandas'],
      ['Technical', 'Python, JavaScript, Node.js, REST APIs, Git'],
    ],
  },
  'data-analyst': {
    label: 'Data / Business Analyst',
    summary: `Analyst with an <strong>M.S. in Management Information Systems</strong> (Business Analytics, Database Management, Data Visualization coursework) and hands-on engineering experience. Built an <strong>ETL pipeline and Power BI dashboard</strong> surfacing throughput, cycle-time, and cost KPIs, and designed a Postgres-backed data service in production. Comfortable moving from raw SQL through transformation to a dashboard a stakeholder will actually use.`,
    competencies: ['SQL & Data Analysis', 'ETL Pipelines', 'Power BI', 'Python / Pandas', 'PostgreSQL', 'KPI Reporting', 'Requirements Gathering', 'Data Visualization'],
    oshi: ['db', 'qa', 'tts', 'review'],
    echo: ['build', 'coord'],
    projects: ['dash', 'agile', 'tracker'],
    skills: [
      ['Data & Analytics', 'SQL, Python, Pandas, NumPy, ETL, Power BI, Excel'],
      ['Databases', 'PostgreSQL, Supabase, Database Design'],
      ['Analysis', 'KPI Definition, Statistical Analysis, Requirements Gathering, Systems Analysis (SDLC)'],
      ['Technical', 'JavaScript, TypeScript, Node.js, REST APIs, Git'],
      ['Cloud', 'AWS, GCP, Docker, Linux'],
      ['Practices', 'Agile/Scrum, Stakeholder Coordination'],
    ],
  },
  'qa-engineer': {
    label: 'QA / Test Engineer',
    summary: `QA-focused engineer who finds the defects that matter. Led testing for a monetization sprint at an early-stage startup — <strong>33 tests across 3 sessions</strong>, uncovering a <strong>P0 exploit</strong> that allowed unlimited free in-app items — and surfaced <strong>16 bugs</strong> in a full backend code review, including a middleware-ordering defect that would have broken every Stripe webhook signature check in production. Backed by a CS engineering degree and production backend experience, so the bug reports come with root causes.`,
    competencies: ['Test Planning', 'Acceptance Testing / UAT', 'Code Review', 'Security Testing', 'API Testing', 'Regression Testing', 'Node.js / Python', 'Agile / Scrum'],
    oshi: ['qa', 'review', 'tts', 'db'],
    echo: ['build', 'coord'],
    projects: ['tracker', 'agile', 'dash'],
    skills: [
      ['Quality', 'Test Planning, Test Case Design, Acceptance Testing, UAT Sign-off, Regression Testing, Code Review, Defect Triage'],
      ['Technical', 'Python, JavaScript, TypeScript, SQL, Node.js, Express, REST APIs, WebSockets'],
      ['Tools', 'Jira, Postman, Git, Docker, Linux'],
      ['Databases', 'PostgreSQL, Supabase'],
      ['Practices', 'Agile/Scrum, Sprint Planning, Risk Management'],
    ],
  },
};

// ── Render helpers ────────────────────────────────────────────────────
const li = (arr, src) => arr.map((k) => `<li>${src[k]}</li>`).join('\n        ');

function experienceHtml(v) {
  return `
    <div class="job">
      <div class="job-header">
        <span class="job-company">Oshi</span>
        <span class="job-period">Mar 2026 – May 2026</span>
      </div>
      <div class="job-role">Backend Developer &amp; QA Intern <span class="job-location">· Remote</span></div>
      <ul>
        ${li(v.oshi, OSHI)}
      </ul>
    </div>

    <div class="job">
      <div class="job-header">
        <span class="job-company">EchoformAI (Early-Stage AI Startup)</span>
        <span class="job-period">Oct 2025 – Jan 2026</span>
      </div>
      <div class="job-role">Founding Engineer <span class="job-location">· Remote</span></div>
      <ul>
        ${li(v.echo, ECHO)}
      </ul>
    </div>`;
}

function projectsHtml(v) {
  // Two most relevant projects only — keeps the CV to a single page, which is
  // what recruiters expect at this experience level.
  return v.projects.slice(0, 2).map((k) => {
    const p = PROJECTS[k];
    return `
    <div class="project">
      <div><span class="project-title">${p.title}</span><span class="project-badge">${p.badge}</span></div>
      <div class="project-desc">${p.desc}</div>
      <div class="project-tech">${p.tech}</div>
    </div>`;
  }).join('\n');
}

const EDUCATION = `
    <div class="edu-item">
      <div class="edu-header">
        <span class="edu-title">Master of Science, Management Information Systems — <span class="edu-org">Northern Arizona University</span></span>
        <span class="edu-year">GPA 3.7/4.0</span>
      </div>
      <div class="edu-desc">Flagstaff, AZ · Relevant coursework: Project Management, Business Analytics, Database Management, Data Visualization, Systems Analysis &amp; Design (SDLC), Statistical Analysis</div>
    </div>
    <div class="edu-item">
      <div class="edu-header">
        <span class="edu-title">Bachelor of Technology, Computer Science — <span class="edu-org">Narasaraopet Engineering College</span></span>
        <span class="edu-year">GPA 8.63/10</span>
      </div>
      <div class="edu-desc">Guntur, India</div>
    </div>`;

const CERTS = `
    <div class="cert-item"><span class="cert-title">Complete Data Wrangling and Data Visualization with Python — <span class="cert-org">Udemy</span></span><span class="cert-year">2024</span></div>
    <div class="cert-item"><span class="cert-title">Introduction to Artificial Intelligence (AI) — <span class="cert-org">Coursera / IBM</span></span><span class="cert-year">2020</span></div>
    <div class="cert-item"><span class="cert-title">International Excellence Award — <span class="cert-org">Northern Arizona University</span></span><span class="cert-year"></span></div>
    <div class="cert-item"><span class="cert-title">National Silver Medalist — Taekwondo, National-level Competition, Chennai</span><span class="cert-year"></span></div>`;

// ── Build ─────────────────────────────────────────────────────────────
for (const [slug, v] of Object.entries(VARIANTS)) {
  const html = TPL
    .replaceAll('{{LANG}}', 'en')
    .replaceAll('{{PAGE_WIDTH}}', '8.5in')
    .replaceAll('{{NAME}}', 'Tarun Reddy Alla')
    .replaceAll('{{EMAIL}}', 'tarunreddy.alla1@gmail.com')
    .replaceAll('{{LOCATION}}', 'Phoenix, AZ · (470) 437-2147')
    .replaceAll('{{LINKEDIN_URL}}', 'https://linkedin.com/in/tarun-reddy-alla')
    .replaceAll('{{LINKEDIN_DISPLAY}}', 'linkedin.com/in/tarun-reddy-alla')
    .replaceAll('{{PORTFOLIO_URL}}', 'https://github.com/tarunreddy26')
    .replaceAll('{{PORTFOLIO_DISPLAY}}', 'github.com/tarunreddy26')
    .replaceAll('{{SECTION_SUMMARY}}', 'Professional Summary')
    .replaceAll('{{SECTION_COMPETENCIES}}', 'Core Competencies')
    .replaceAll('{{SECTION_EXPERIENCE}}', 'Work Experience')
    .replaceAll('{{SECTION_PROJECTS}}', 'Projects')
    .replaceAll('{{SECTION_EDUCATION}}', 'Education')
    .replaceAll('{{SECTION_CERTIFICATIONS}}', 'Certifications & Honors')
    .replaceAll('{{SECTION_SKILLS}}', 'Skills')
    .replaceAll('{{SUMMARY_TEXT}}', v.summary)
    .replaceAll('{{COMPETENCIES}}', v.competencies.map((c) => `<span class="competency-tag">${c}</span>`).join('\n      '))
    .replaceAll('{{EXPERIENCE}}', experienceHtml(v))
    .replaceAll('{{PROJECTS}}', projectsHtml(v))
    .replaceAll('{{EDUCATION}}', EDUCATION)
    .replaceAll('{{CERTIFICATIONS}}', CERTS)
    .replaceAll('{{SKILLS}}', `<div class="skills-grid">${v.skills.map(([c, s]) => `<div class="skill-item"><span class="skill-category">${c}:</span> ${s}</div>`).join('\n      ')}</div>`);

  // Compact pass: tighten vertical rhythm so everything lands on one page.
  const compact = `
<style>
  .page { padding-top: 0 !important; }
  .header { margin-bottom: 10px !important; }
  .header h1 { font-size: 26px !important; }
  .header-gradient { margin: 4px 0 !important; }
  .contact-row { font-size: 9.5px !important; }
  .section { margin-bottom: 4px !important; }
  .section-title { margin-bottom: 3px !important; }
  .competencies-grid { gap: 5px !important; }
  .skills-grid { gap: 3px 12px !important; }
  .summary-text { font-size: 9.8px !important; line-height: 1.4 !important; }
  .job { margin-bottom: 6px !important; }
  .job li { font-size: 10px !important; line-height: 1.42 !important; margin-bottom: 2px !important; }
  .job ul { margin-top: 4px !important; }
  .project { margin-bottom: 7px !important; }
  .project-desc { font-size: 10px !important; line-height: 1.4 !important; }
  .edu-item { margin-bottom: 3px !important; }
  .project { margin-bottom: 5px !important; }
  .edu-desc { font-size: 9px !important; line-height: 1.35 !important; }
  .cert-item { margin-bottom: 1px !important; }
  .cert-title { font-size: 10px !important; }
  .skill-item { font-size: 10px !important; }
  .competency-tag { font-size: 9.5px !important; padding: 3px 8px !important; }
</style>
</head>`;
  const out = html.replace('</head>', compact);

  const f = `${OUT}/Tarun_Reddy_Alla_${slug}.html`;
  writeFileSync(f, out);
  console.log('wrote', f, `(${v.label})`);
}
