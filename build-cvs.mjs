#!/usr/bin/env node
/**
 * Builds ATS-optimized CV variants for Tarun Reddy Alla, one per target track.
 * Same factual content everywhere — only ordering and emphasis change.
 *
 * Content merged from four sources: Tarun_Reddy_Alla_Resumepm.pdf (authoritative
 * on the employment timeline — the only one listing Oshi), plus the CC /
 * data-scientist / updated DOCX resumes for the Sentient Notes role, the
 * data-science project set, and the fuller skills inventory.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';

const TPL = readFileSync('templates/cv-template.html', 'utf8');
const OUT = 'output';
mkdirSync(OUT, { recursive: true });

// ── Experience bullets ────────────────────────────────────────────────
const OSHI = {
  tts: `Shipped a real-time <strong>WebSocket</strong>-based text-to-speech streaming backend (<strong>Node.js/TypeScript</strong>) to Render with CORS whitelisting, rate limiting, and structured logging; load-tested across <strong>20 concurrent sessions with zero connection leaks</strong>.`,
  qa: `Led QA for an in-app purchases / virtual-currency monetization sprint — executed <strong>33 tests across 3 sessions</strong>, uncovered a <strong>P0 exploit</strong> allowing unlimited free in-app items, and signed off all <strong>9 acceptance criteria</strong> after fixes.`,
  review: `Performed a full backend code review surfacing <strong>16 bugs</strong>, including a critical Express middleware-ordering defect that would have broken <strong>every Stripe webhook signature verification</strong> in production.`,
  db: `Designed and deployed a user-state persistence service on <strong>Supabase/Postgres</strong> with 3 REST endpoints, time-based state decay, and login restore powering the app's real-time reactions.`,
};

const ECHO = {
  cofound: `Co-founded an AI startup building <strong>Generative AI</strong> tooling to automate RF design workflows, cutting manual design iteration time by an estimated <strong>60%</strong>.`,
  build: `Architected and deployed <strong>LLM-powered inference pipelines</strong> (Python, LangChain, AWS EC2/S3/Lambda) serving <strong>50+ beta users</strong> in the RF engineering community.`,
  coord: `Led product development from ideation to <strong>MVP in 8 weeks</strong>, managing a cross-functional team of 3 engineers and coordinating sprint planning and the technical roadmap.`,
  ingest: `Built data ingestion pipelines processing and normalizing <strong>10,000+</strong> proprietary RF simulation records for model fine-tuning and <strong>RAG</strong> retrieval.`,
  investor: `Presented technical demos and business projections to <strong>5+ prospective investors</strong> during early-stage funding conversations.`,
};

const SENT = {
  api: `Designed and implemented the backend API in <strong>Python (FastAPI)</strong>, handling <strong>500+ daily journal entries</strong> at <strong>sub-200ms</strong> response times.`,
  rag: `Built an LLM-powered mood journaling app using <strong>Retrieval-Augmented Generation (RAG)</strong> to deliver personalized insights from user entries.`,
  vector: `Integrated a <strong>Pinecone</strong> vector database for semantic search across journal entries, reaching <strong>94% retrieval relevance</strong> on internal benchmarks.`,
  ondevice: `Engineered an <strong>on-device NLP</strong> processing pipeline for privacy-first data handling, with cloud fallback to AWS foundation models for complex sentiment analysis.`,
  sdlc: `Managed the full <strong>SDLC</strong> from requirements gathering through deployment, following Agile with <strong>2-week sprints</strong>.`,
};

// ── Projects ──────────────────────────────────────────────────────────
const PROJECTS = {
  bi: {
    title: 'Generative AI Business Intelligence Assistant',
    badge: 'GenAI / RAG',
    tech: 'Python, LangChain, OpenAI API, SQL, Docker, GCP',
    desc: `Designed a <strong>RAG</strong> system with LangChain and the OpenAI API letting non-technical users query SQL databases in natural language, cutting report turnaround from <strong>3 days to under 5 minutes</strong>. Automated KPI summarization, modeled to remove <strong>~15 hours</strong> of manual reporting per week. Deployed in Docker on GCP for <strong>20+ concurrent users</strong>.`,
  },
  credit: {
    title: 'Predictive Credit Risk Modeling & AI Scoring',
    badge: 'ML / Analytics',
    tech: 'Python, Scikit-learn, SQL, Power BI',
    desc: `Built a credit risk tool predicting loan-default probability at <strong>92% AUC-ROC</strong> across <strong>50,000+ records</strong>. Implemented an automated feature-engineering pipeline that cut manual data prep by <strong>40%</strong>, and surfaced risk-weighted assets and portfolio health in a <strong>Power BI</strong> dashboard.`,
  },
  semi: {
    title: 'Semiconductor Demand Forecasting',
    badge: 'Time Series',
    tech: 'Python, Prophet, GCP, BigQuery',
    desc: `Architected a <strong>Prophet</strong> time-series model forecasting chip demand volatility, improving <strong>MAPE accuracy by 15%</strong>. Built an end-to-end GCP pipeline consolidating siloed inventory data into <strong>BigQuery</strong> at <strong>2M+ rows daily</strong>, and optimized reorder points for a projected <strong>$200K</strong> annual carrying-cost reduction at 99% service level.`,
  },
  spotify: {
    title: 'Spotify Data Pipeline & Market Trend Analysis',
    badge: 'Data Engineering',
    tech: 'Python, GCP, Spotify API, Pandas, Power BI',
    desc: `Engineered an automated <strong>ETL pipeline</strong> extracting and transforming <strong>100K+ track records</strong> from the Spotify API, with cleaning and transformation scripts enforcing <strong>100% schema consistency</strong> downstream. Visualized genre and artist-popularity trends in Power BI.`,
  },
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
};

// ── Per-track configuration ───────────────────────────────────────────
const VARIANTS = {
  'backend-swe': {
    label: 'Backend / Software Engineer',
    summary: `Software developer with a B.Tech in Computer Science and an M.S. in Management Information Systems, shipping production backend systems in <strong>Node.js/TypeScript and Python</strong>. Built a real-time WebSocket streaming service, a Postgres-backed persistence API, and a FastAPI backend serving 500+ daily requests at sub-200ms — and caught a critical middleware defect in code review before it reached production. Comfortable owning a service end to end: design, deploy, load-test, and monitor.`,
    competencies: ['Node.js / TypeScript', 'Python / FastAPI', 'REST APIs & WebSockets', 'PostgreSQL / Supabase', 'AWS & Docker', 'LangChain / RAG', 'Code Review', 'Agile / Scrum'],
    oshi: ['tts', 'db', 'review'],
    echo: ['build', 'coord'],
    sent: ['api', 'ondevice'],
    projects: ['tracker', 'bi'],
    skills: [
      ['Programming', 'Python, JavaScript, TypeScript, SQL, C'],
      ['Backend & Web', 'Node.js, Express, FastAPI, REST APIs, WebSockets, React'],
      ['Databases', 'PostgreSQL, Supabase, MySQL, SQL Server, Pinecone'],
      ['Cloud & DevOps', 'AWS (EC2, S3, Lambda), GCP (BigQuery, Cloud Run), Docker, Git, Linux'],
      ['AI / ML', 'LangChain, OpenAI API, RAG, NLP, Scikit-learn'],
      ['Practices', 'Agile/Scrum, SDLC, Code Review, Test Planning'],
    ],
  },
  'project-coordinator': {
    label: 'Project / Program Coordinator',
    summary: `Project coordinator with an <strong>M.S. in Management Information Systems (Project Management coursework)</strong> and a Computer Science engineering background. Led product development from ideation to <strong>MVP in 8 weeks</strong> managing a 3-engineer team, ran full SDLC on 2-week sprints, and led acceptance testing across a monetization sprint — signing off <strong>9 acceptance criteria</strong> after driving fixes to closure. Fluent in the delivery toolkit (charter, WBS, risk register, Gantt, burndown) and technical enough to run a standup with engineers and understand the answers.`,
    competencies: ['Project Planning & Scheduling', 'Agile / Scrum', 'Sprint Planning', 'Stakeholder Coordination', 'Risk Management', 'WBS & Gantt Charts', 'Acceptance Testing', 'Jira / Trello / Notion'],
    oshi: ['qa', 'review'],
    echo: ['coord', 'cofound', 'investor'],
    sent: ['sdlc', 'api'],
    projects: ['agile', 'bi'],
    skills: [
      ['Project Management', 'Agile/Scrum, Sprint Planning, Backlog Management, WBS, Gantt Charts, Risk Management, Stakeholder Coordination, SDLC'],
      ['Tools', 'Jira, Trello, Notion, Confluence, Git'],
      ['Quality', 'Test Planning, Acceptance Testing, UAT Sign-off'],
      ['Data & Reporting', 'SQL, Excel, Power BI, Tableau, Pandas'],
      ['Technical', 'Python, JavaScript, Node.js, FastAPI, REST APIs, AWS, GCP'],
    ],
  },
  'data-analyst': {
    label: 'Data / Business Analyst',
    summary: `Data analyst with an <strong>M.S. in Management Information Systems</strong> (Business Analytics, Database Management, Data Visualization) and hands-on data engineering experience. Built <strong>ETL pipelines on GCP/BigQuery processing 2M+ rows daily</strong>, a credit-risk model at <strong>92% AUC-ROC</strong> over 50,000+ records, and Power BI dashboards for portfolio-health monitoring. Comfortable moving from raw SQL through transformation and modeling to a dashboard a stakeholder will actually use.`,
    competencies: ['SQL & Data Analysis', 'ETL Pipelines', 'Power BI / Tableau', 'Python / Pandas', 'Predictive Modeling', 'BigQuery', 'KPI Reporting', 'Data Visualization'],
    oshi: ['db', 'qa'],
    echo: ['ingest', 'build'],
    sent: ['vector', 'rag'],
    projects: ['credit', 'semi', 'spotify'],
    skills: [
      ['Data & Analytics', 'SQL, Python, Pandas, NumPy, ETL, Power BI, Tableau, Excel, Seaborn, Matplotlib'],
      ['ML / Modeling', 'Scikit-learn, TensorFlow, Prophet, Regression, Classification, RAG, NLP'],
      ['Databases & Cloud', 'PostgreSQL, MySQL, SQL Server, BigQuery, Supabase, Pinecone, AWS, GCP, Docker'],
      ['Analysis', 'KPI Definition, Statistical Analysis, Forecasting, Requirements Gathering, SDLC'],
      ['Technical', 'JavaScript, TypeScript, Node.js, FastAPI, REST APIs, Git, Linux, Jupyter'],
    ],
  },
  'qa-engineer': {
    label: 'QA / Test Engineer',
    summary: `QA-focused engineer who finds the defects that matter. Led testing for a monetization sprint at an early-stage startup — <strong>33 tests across 3 sessions</strong>, uncovering a <strong>P0 exploit</strong> that allowed unlimited free in-app items — and surfaced <strong>16 bugs</strong> in a full backend code review, including a middleware-ordering defect that would have broken every Stripe webhook signature check in production. Backed by a CS degree and production backend experience, so the bug reports come with root causes.`,
    competencies: ['Test Planning', 'Acceptance Testing / UAT', 'Code Review', 'Security Testing', 'API Testing', 'Regression Testing', 'Python / Node.js', 'Agile / Scrum'],
    oshi: ['qa', 'review', 'tts'],
    echo: ['build', 'coord'],
    sent: ['api', 'sdlc'],
    projects: ['tracker', 'agile', 'bi'],
    skills: [
      ['Quality', 'Test Planning, Test Case Design, Acceptance Testing, UAT Sign-off, Regression Testing, Code Review, Defect Triage'],
      ['Technical', 'Python, JavaScript, TypeScript, SQL, Node.js, Express, FastAPI, REST APIs, WebSockets'],
      ['Tools', 'Jira, Postman, Git, Docker, Linux, Jupyter'],
      ['Databases & Cloud', 'PostgreSQL, Supabase, MySQL, AWS, GCP'],
      ['Practices', 'Agile/Scrum, SDLC, Sprint Planning, Risk Management'],
    ],
  },
};

// ── Render helpers ────────────────────────────────────────────────────
const li = (arr, src) => arr.map((k) => `<li>${src[k]}</li>`).join('\n        ');

const job = (company, period, role, bullets) => `
    <div class="job">
      <div class="job-header">
        <span class="job-company">${company}</span>
        <span class="job-period">${period}</span>
      </div>
      <div class="job-role">${role} <span class="job-location">· Remote</span></div>
      <ul>
        ${bullets}
      </ul>
    </div>`;

function experienceHtml(v) {
  return [
    job('Oshi', 'Mar 2026 – May 2026', 'Backend Developer &amp; QA Intern', li(v.oshi, OSHI)),
    job('EchoformAI', 'Oct 2025 – Jan 2026', 'Co-Founder &amp; ML Engineer', li(v.echo, ECHO)),
    job('Sentient Notes', 'Jan 2025 – Jul 2025', 'Associate Founder &amp; Backend Developer', li(v.sent, SENT)),
  ].join('\n');
}

function projectsHtml(v) {
  return v.projects.slice(0, 3).map((k) => {
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
        <span class="edu-title">M.S., Management Information Systems — <span class="edu-org">Northern Arizona University</span></span>
        <span class="edu-year">Jan 2023 – May 2026 · GPA 3.7/4.0</span>
      </div>
      <div class="edu-desc">Flagstaff, AZ · Coursework: Project Management, Business Analytics, Database Management, Data Visualization, Systems Analysis &amp; Design (SDLC), Statistical Analysis</div>
    </div>
    <div class="edu-item">
      <div class="edu-header">
        <span class="edu-title">B.Tech, Computer Science — <span class="edu-org">Narasaraopet Engineering College</span></span>
        <span class="edu-year">Jun 2018 – Jun 2022 · GPA 8.63/10</span>
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
    .replaceAll('{{LINKEDIN_URL}}', 'https://www.linkedin.com/in/tarun-reddy-alla-6a50a41a8')
    .replaceAll('{{LINKEDIN_DISPLAY}}', 'linkedin.com/in/tarun-reddy-alla-6a50a41a8')
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
  .header { margin-bottom: 8px !important; }
  .header h1 { font-size: 24px !important; }
  .header-gradient { margin: 3px 0 !important; }
  .contact-row { font-size: 9.5px !important; }
  .section { margin-bottom: 4px !important; }
  .section-title { margin-bottom: 3px !important; }
  .competencies-grid { gap: 4px !important; }
  .skills-grid { gap: 2px 12px !important; }
  .summary-text { font-size: 9.3px !important; line-height: 1.36 !important; }
  .job { margin-bottom: 5px !important; }
  .job-company { font-size: 11.5px !important; }
  .job-role { font-size: 10px !important; margin-bottom: 3px !important; }
  .job li { font-size: 9.3px !important; line-height: 1.34 !important; margin-bottom: 1px !important; }
  .job ul { margin-top: 3px !important; }
  .project { margin-bottom: 4px !important; }
  .project-title { font-size: 10.5px !important; }
  .project-desc { font-size: 9.3px !important; line-height: 1.34 !important; }
  .project-tech { font-size: 8.8px !important; }
  .edu-item { margin-bottom: 2px !important; }
  .edu-title { font-size: 10px !important; }
  .edu-desc { font-size: 8.6px !important; line-height: 1.3 !important; }
  .cert-item { margin-bottom: 0px !important; }
  .cert-title { font-size: 9.3px !important; }
  .skill-item { font-size: 9.3px !important; }
  .competency-tag { font-size: 9px !important; padding: 2px 7px !important; }
</style>
</head>`;
  const out = html.replace('</head>', compact);

  const f = `${OUT}/Tarun_Reddy_Alla_${slug}.html`;
  writeFileSync(f, out);
  console.log('wrote', f, `(${v.label})`);
}
