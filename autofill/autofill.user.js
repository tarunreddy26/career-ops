// ==UserScript==
// @name         Career-Ops Autofill — Tarun Reddy Alla
// @namespace    https://github.com/tarunreddy26/career-ops
// @version      1.0.0
// @description  Fills job application forms on the major ATS platforms. Never submits.
// @author       career-ops
// @match        *://boards.greenhouse.io/*
// @match        *://job-boards.greenhouse.io/*
// @match        *://*.greenhouse.io/*
// @match        *://jobs.lever.co/*
// @match        *://jobs.ashbyhq.com/*
// @match        *://*.ashbyhq.com/*
// @match        *://*.myworkdayjobs.com/*
// @match        *://*.icims.com/*
// @match        *://jobs.smartrecruiters.com/*
// @match        *://*.oraclecloud.com/*
// @match        *://*.workable.com/*
// @match        *://*.bamboohr.com/*
// @match        *://*.jazzhr.com/*
// @match        *://*.breezy.hr/*
// @match        *://*.recruitee.com/*
// @match        *://*.teamtailor.com/*
// @match        *://*.pinpointhq.com/*
// @match        *://*.jobvite.com/*
// @match        *://*.taleo.net/*
// @match        *://*.successfactors.com/*
// @match        *://*.paylocity.com/*
// @match        *://*.dayforcehcm.com/*
// @grant        none
// ==/UserScript==

/*
 * SAFETY CONTRACT
 * ---------------
 * 1. This script NEVER clicks a submit/apply/continue button. There is no code
 *    path that calls .click() or .submit() on anything. Verified by the test
 *    suite in autofill/test/.
 * 2. Every field it touches is outlined so you can see exactly what changed.
 * 3. Anything it is not confident about is left blank and listed in the panel
 *    as needing your attention.
 * 4. File uploads (resume) cannot be automated — browsers forbid scripts from
 *    setting <input type=file>. You attach the PDF yourself. This is a browser
 *    security rule, not a limitation I can engineer around.
 */

(function () {
  'use strict';

  // ─────────────────────────────────────────────────────────────────────
  // PROFILE — edit these values, everything else is machinery
  // ─────────────────────────────────────────────────────────────────────
  const P = {
    firstName: 'Tarun',
    middleName: 'Reddy',
    lastName: 'Alla',
    fullName: 'Tarun Reddy Alla',
    preferredName: 'Tarun',
    email: 'tarunreddy.alla1@gmail.com',
    phone: '4704372147',
    phoneFormatted: '(470) 437-2147',
    addressCity: 'Phoenix',
    addressState: 'Arizona',
    addressStateAbbr: 'AZ',
    addressCountry: 'United States',
    addressZip: '85001',
    location: 'Phoenix, AZ',
    linkedin: 'https://www.linkedin.com/in/tarun-reddy-alla-6a50a41a8',
    github: 'https://github.com/tarunreddy26',
    website: 'https://github.com/tarunreddy26',

    school: 'Northern Arizona University',
    degree: "Master's Degree",
    discipline: 'Management Information Systems',
    gradMonth: 'May',
    gradYear: '2026',
    gpa: '3.7',

    company: 'Oshi',
    title: 'Backend Developer & QA Intern',

    // Work authorization — see WORK_AUTH_RULES below for how these are applied.
    authorizedToWork: 'Yes',
    requiresSponsorship: 'Yes',
    requiresSponsorshipNow: 'No',
    sponsorshipDetail:
      'I am authorized to work in the U.S. on F-1 OPT and my degree is STEM-designated, ' +
      'so I am eligible for the 24-month STEM extension — approximately three years of ' +
      'authorization total, with no petition, filing fee, or cost to the employer. The only ' +
      'requirement is that the employer is enrolled in E-Verify. I would need H-1B ' +
      'sponsorship after that period.',

    salary: 'Open',
    startDate: 'Immediately',
    noticePeriod: 'None — available immediately',
    yearsExperience: '1',
    willingToRelocate: 'Yes',
    heardAbout: 'Company careers page',
    veteran: 'I am not a protected veteran',
    disability: 'No, I do not have a disability',
    gender: 'Male',
    race: 'Asian',
    hispanic: 'No',
    coverNote:
      "Hi — I'm a software developer with a CS degree and a Master's in MIS, most recently " +
      'shipping a real-time WebSocket backend in Node/TypeScript at Oshi and leading QA for ' +
      'their monetization sprint, where I found a P0 exploit and a webhook-breaking middleware ' +
      'defect before either reached customers. Before that I co-founded two early-stage AI ' +
      'products, taking one from idea to MVP in eight weeks. I am authorized to work in the ' +
      'U.S. and, with the STEM OPT extension, will be for about three years without any filing ' +
      'or cost on your side. I would welcome the chance to talk.',
  };

  // ─────────────────────────────────────────────────────────────────────
  // WORK AUTH — polarity matters. These two questions look alike and are
  // opposites; answering either one backwards is a misrepresentation.
  //
  //   "Are you authorized to work in the US?"        -> Yes
  //   "Will you require sponsorship (now or future)?" -> Yes
  //   "Do you need sponsorship to START / NOW?"       -> No
  //
  // Order is significant: the most specific pattern must be tested first.
  // ─────────────────────────────────────────────────────────────────────
  const WORK_AUTH_RULES = [
    // Most specific first: sponsorship needed *to begin / currently*.
    {
      re: /(require|need).{0,40}sponsorship.{0,40}(to (begin|start|commence)|immediately|at this time|currently|upon hire|to work now)/i,
      value: () => P.requiresSponsorshipNow,
    },
    {
      re: /(immediate|current).{0,20}sponsorship/i,
      value: () => P.requiresSponsorshipNow,
    },
    // Sponsorship now OR in the future -> Yes
    {
      re: /(require|need|request).{0,60}(sponsorship|visa sponsorship|immigration sponsorship)|sponsorship.{0,40}(now or in the future|in the future)|will you.{0,40}sponsorship/i,
      value: () => P.requiresSponsorship,
    },
    // Authorized to work -> Yes
    {
      re: /(legally )?(authorized|eligible|permitted) to work|work authorization|right to work|authorized to be employed/i,
      value: () => P.authorizedToWork,
    },
  ];

  // ─────────────────────────────────────────────────────────────────────
  // FIELD MAP
  // ─────────────────────────────────────────────────────────────────────
  const FIELDS = [
    { k: 'workauth', re: null, special: 'workauth' },

    { k: 'firstName', re: /^(first|given)\s*name|^first$|fname|legal first/i, v: () => P.firstName },
    { k: 'lastName', re: /^(last|family|sur)\s*name|^last$|lname|legal last/i, v: () => P.lastName },
    { k: 'middleName', re: /middle\s*(name|initial)/i, v: () => P.middleName },
    { k: 'preferredName', re: /preferred\s*(first\s*)?name|nickname|goes by/i, v: () => P.preferredName },
    { k: 'fullName', re: /^(full|your|candidate|applicant)?\s*name$|^name$/i, v: () => P.fullName },

    { k: 'email', re: /e-?mail/i, v: () => P.email },
    { k: 'phone', re: /phone|mobile|cell|telephone|contact number/i, v: () => P.phoneFormatted },

    { k: 'linkedin', re: /linked\s*-?in/i, v: () => P.linkedin },
    { k: 'github', re: /git\s*-?hub/i, v: () => P.github },
    { k: 'website', re: /website|portfolio|personal site|blog|other url|web address/i, v: () => P.website },

    { k: 'city', re: /^city|city name|town/i, v: () => P.addressCity },
    { k: 'state', re: /^state|province|region/i, v: () => P.addressState },
    { k: 'zip', re: /zip|postal/i, v: () => P.addressZip },
    { k: 'country', re: /country/i, v: () => P.addressCountry },
    { k: 'location', re: /location|where are you based|current (city|residence)|address/i, v: () => P.location },

    { k: 'school', re: /school|university|college|institution/i, v: () => P.school },
    { k: 'degree', re: /degree|qualification level/i, v: () => P.degree },
    { k: 'discipline', re: /discipline|major|field of study|concentration/i, v: () => P.discipline },
    { k: 'gradYear', re: /grad(uation)?\s*(year|date)|year of graduation|end date/i, v: () => P.gradYear },
    { k: 'gpa', re: /gpa|grade point/i, v: () => P.gpa },

    { k: 'company', re: /current (company|employer)|most recent (company|employer)|^company$|^employer$/i, v: () => P.company },
    { k: 'title', re: /current (title|position|role)|job title|^title$/i, v: () => P.title },
    { k: 'years', re: /years? of (relevant )?experience|experience \(years\)|how many years/i, v: () => P.yearsExperience },

    { k: 'salary', re: /salary|compensation|pay expectation|desired (pay|rate)|expected ctc/i, v: () => P.salary },
    { k: 'startDate', re: /start date|available to start|availability|when can you start|earliest/i, v: () => P.startDate },
    { k: 'notice', re: /notice period/i, v: () => P.noticePeriod },
    { k: 'relocate', re: /relocat/i, v: () => P.willingToRelocate },
    { k: 'heard', re: /how did you (hear|find)|referral source|source|where did you (hear|find)/i, v: () => P.heardAbout },

    { k: 'cover', re: /cover letter|why (do you want|are you interested)|tell us about yourself|additional information|anything else|message/i, v: () => P.coverNote, long: true },

    { k: 'gender', re: /gender/i, v: () => P.gender },
    { k: 'hispanic', re: /hispanic|latino/i, v: () => P.hispanic },
    { k: 'race', re: /race|ethnicity/i, v: () => P.race },
    { k: 'veteran', re: /veteran|protected veteran|military/i, v: () => P.veteran },
    { k: 'disability', re: /disab/i, v: () => P.disability },
  ];

  // ─────────────────────────────────────────────────────────────────────
  // React-safe value setting. Greenhouse, Lever, and Ashby are React apps;
  // assigning .value directly does not update component state, so the value
  // silently reverts on submit. Use the native setter, then fire events.
  // ─────────────────────────────────────────────────────────────────────
  function setNativeValue(el, value) {
    const proto = el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : el instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : HTMLInputElement.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, 'value');
    if (desc && desc.set) desc.set.call(el, value);
    else el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  const norm = (s) => (s || '').replace(/\s+/g, ' ').replace(/[*✱]/g, '').trim();

  // Find the human-readable label for a control.
  function labelFor(el) {
    const bits = [];
    if (el.id) {
      const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (l) bits.push(l.textContent);
    }
    const wrap = el.closest('label');
    if (wrap) bits.push(wrap.textContent);
    if (el.getAttribute('aria-label')) bits.push(el.getAttribute('aria-label'));
    const ariaBy = el.getAttribute('aria-labelledby');
    if (ariaBy) {
      ariaBy.split(/\s+/).forEach((id) => {
        const n = document.getElementById(id);
        if (n) bits.push(n.textContent);
      });
    }
    // Walk up for a nearby legend/label/heading — covers Workday and Greenhouse.
    let p = el.parentElement, hops = 0;
    while (p && hops < 4) {
      const cand = p.querySelector('legend, label, .application-label, [class*="label"], [class*="Label"]');
      if (cand && cand.textContent) { bits.push(cand.textContent); break; }
      p = p.parentElement; hops++;
    }
    bits.push(el.name, el.id, el.placeholder, el.getAttribute('data-qa'));
    return norm(bits.filter(Boolean).join(' | '));
  }

  function matchField(label) {
    for (const rule of WORK_AUTH_RULES) if (rule.re.test(label)) return { k: 'workauth', v: rule.value() };
    for (const f of FIELDS) if (f.re && f.re.test(label)) return { k: f.k, v: f.v(), long: f.long };
    return null;
  }

  // Choose the option in a <select> that best matches the desired value.
  function pickOption(sel, want) {
    const w = want.toLowerCase();
    const opts = Array.from(sel.options);
    let hit =
      opts.find((o) => norm(o.textContent).toLowerCase() === w) ||
      opts.find((o) => norm(o.textContent).toLowerCase().startsWith(w)) ||
      opts.find((o) => norm(o.textContent).toLowerCase().includes(w));
    if (!hit && (w === 'yes' || w === 'no')) {
      hit = opts.find((o) => new RegExp(`^${w}\\b`, 'i').test(norm(o.textContent)));
    }
    return hit || null;
  }

  const results = { filled: [], skipped: [], needsYou: [] };

  function outline(el, color) {
    el.style.outline = `2px solid ${color}`;
    el.style.outlineOffset = '1px';
  }

  function fillAll() {
    results.filled = []; results.skipped = []; results.needsYou = [];

    // File inputs — cannot be scripted. Report them.
    document.querySelectorAll('input[type=file]').forEach((el) => {
      outline(el, '#e0a800');
      results.needsYou.push('Attach resume PDF manually (browsers block scripted file uploads)');
    });

    const controls = document.querySelectorAll('input, textarea, select');
    const radioGroupsDone = new Set();

    controls.forEach((el) => {
      const type = (el.type || '').toLowerCase();
      if (['hidden', 'submit', 'button', 'image', 'reset', 'file', 'password'].includes(type)) return;
      if (el.disabled || el.readOnly) return;
      if (el.offsetParent === null && type !== 'radio') return; // not visible

      const label = labelFor(el);
      if (!label) return;
      const m = matchField(label);
      if (!m || m.v == null) return;

      try {
        if (type === 'radio') {
          const name = el.name;
          if (!name || radioGroupsDone.has(name)) return;
          const group = Array.from(document.querySelectorAll(`input[type=radio][name="${CSS.escape(name)}"]`));
          const want = String(m.v).toLowerCase();
          const target = group.find((r) => {
            const rl = norm(labelFor(r)).toLowerCase();
            return rl === want || rl.startsWith(want + ' ') || new RegExp(`^${want}\\b`).test(rl);
          });
          if (target) {
            target.checked = true;
            target.dispatchEvent(new Event('click', { bubbles: true }));
            target.dispatchEvent(new Event('change', { bubbles: true }));
            outline(target.closest('label') || target, '#2ea043');
            results.filled.push(`${m.k}: ${m.v}`);
            radioGroupsDone.add(name);
          } else {
            results.needsYou.push(`${m.k}: no option matched "${m.v}"`);
          }
          return;
        }

        if (type === 'checkbox') return; // never auto-consent

        if (el.tagName === 'SELECT') {
          const opt = pickOption(el, String(m.v));
          if (opt) {
            setNativeValue(el, opt.value);
            outline(el, '#2ea043');
            results.filled.push(`${m.k}: ${opt.textContent.trim()}`);
          } else {
            outline(el, '#e0a800');
            results.needsYou.push(`${m.k}: no dropdown option matched "${m.v}"`);
          }
          return;
        }

        // text / textarea / email / tel / url / number / date
        if (el.value && el.value.trim()) { results.skipped.push(`${m.k} (already filled)`); return; }
        if (m.long && el.tagName !== 'TEXTAREA') return; // don't dump a cover letter into a one-line input
        setNativeValue(el, String(m.v));
        outline(el, '#2ea043');
        results.filled.push(`${m.k}: ${String(m.v).slice(0, 60)}${String(m.v).length > 60 ? '…' : ''}`);
      } catch (e) {
        results.needsYou.push(`${m.k}: ${e.message}`);
      }
    });

    render();
  }

  // ─────────────────────────────────────────────────────────────────────
  // UI
  // ─────────────────────────────────────────────────────────────────────
  let panel;
  function render() {
    panel.querySelector('#co-body').innerHTML = `
      <div style="margin:6px 0"><b style="color:#2ea043">Filled ${results.filled.length}</b>
        ${results.needsYou.length ? `· <b style="color:#e0a800">Needs you: ${results.needsYou.length}</b>` : ''}</div>
      ${results.filled.length ? `<details><summary style="cursor:pointer">What it filled</summary>
        <ul style="margin:4px 0 0 16px;padding:0">${results.filled.map((x) => `<li>${x}</li>`).join('')}</ul></details>` : ''}
      ${results.needsYou.length ? `<details open><summary style="cursor:pointer;color:#e0a800">Needs you</summary>
        <ul style="margin:4px 0 0 16px;padding:0">${results.needsYou.map((x) => `<li>${x}</li>`).join('')}</ul></details>` : ''}
      <div style="margin-top:8px;font-size:11px;opacity:.75">Green outline = filled. Amber = check it.
      Review everything, then submit yourself — this never clicks Submit.</div>`;
  }

  function mount() {
    if (document.getElementById('co-autofill')) return;
    panel = document.createElement('div');
    panel.id = 'co-autofill';
    panel.style.cssText =
      'position:fixed;bottom:16px;right:16px;z-index:2147483647;width:320px;max-height:70vh;overflow:auto;' +
      'background:#1b1f24;color:#e6edf3;font:13px/1.45 -apple-system,Segoe UI,Roboto,sans-serif;' +
      'border:1px solid #30363d;border-radius:10px;padding:12px;box-shadow:0 8px 28px rgba(0,0,0,.45)';
    panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <b style="flex:1">Career-Ops Autofill</b>
        <span id="co-close" style="cursor:pointer;opacity:.6;font-size:16px">×</span>
      </div>
      <button id="co-fill" style="width:100%;padding:8px;border:0;border-radius:6px;background:#2ea043;color:#fff;font-weight:600;cursor:pointer">Fill this form</button>
      <div id="co-body"></div>`;
    document.body.appendChild(panel);
    panel.querySelector('#co-fill').addEventListener('click', fillAll);
    panel.querySelector('#co-close').addEventListener('click', () => panel.remove());
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
  // Re-mount on SPA navigation (Ashby/Lever swap routes without a reload).
  new MutationObserver(() => { if (!document.getElementById('co-autofill')) mount(); })
    .observe(document.documentElement, { childList: true, subtree: true });

  window.__careerOpsAutofill = { fillAll, results, P };
})();
