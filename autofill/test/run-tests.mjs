#!/usr/bin/env node
/**
 * Verifies autofill.user.js against a mock ATS form.
 *
 * The critical assertions are the three work-authorization questions, whose
 * polarity is easy to get backwards, and the guarantee that nothing submits.
 *
 * Run: node autofill/test/run-tests.mjs
 */
import { chromium } from 'playwright';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const here = dirname(fileURLToPath(import.meta.url));
const SCRIPT = readFileSync(resolve(here, '../autofill.user.js'), 'utf8');
const FORM = 'file://' + resolve(here, 'mock-ats.html');

const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? '  ✅' : '  ❌'} ${name}${detail ? `  — ${detail}` : ''}`);
};

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
});
const page = await browser.newPage();
await page.goto(FORM);
await page.addScriptTag({ content: SCRIPT });
await page.waitForSelector('#co-autofill');
await page.click('#co-fill');
await page.waitForTimeout(400);

const val = (sel) => page.$eval(sel, (e) => e.value);

console.log('\nWork authorization (polarity — the dangerous part)');
check('authorized to work = Yes', (await val('#auth')) === 'Yes', `got "${await val('#auth')}"`);
check('sponsorship now-or-future = Yes', (await val('#spon')) === 'Yes', `got "${await val('#spon')}"`);
const sponNow = await page.$eval('input[name=spon_now]:checked', (e) => e.value).catch(() => null);
check('sponsorship to BEGIN = No', sponNow === 'n', `got "${sponNow}"`);

console.log('\nIdentity and contact');
check('first name', (await val('#first_name')) === 'Tarun');
check('last name', (await val('#last_name')) === 'Alla');
check('email', (await val('#email')) === 'tarunreddy.alla1@gmail.com');
check('phone', (await val('#phone')).includes('470'));
check('linkedin has vanity suffix', (await val('#li')).includes('6a50a41a8'));
check('github', (await val('#gh')).includes('tarunreddy26'));

console.log('\nOther fields');
check('relocate = Yes', (await val('#relo')) === 'Yes');
check('salary', (await val('#salary')) === 'Open');
check('start date', (await val('#start')).length > 0);
check('years experience', (await val('#yrs')) === '1');
check('school', (await val('#school')).includes('Northern Arizona'));
check('heard about', (await val('#heard')).length > 0);
check('cover letter in textarea', (await val('#cover')).length > 100);

console.log('\nSafety guarantees');
check('never submitted', (await page.evaluate(() => window.__submitted)) === false);
check('consent checkbox NOT auto-checked', (await page.$eval('#consent', (e) => e.checked)) === false);
check('pre-filled field NOT overwritten', (await val('#pref')) === 'DO-NOT-OVERWRITE');
const needs = await page.evaluate(() => window.__careerOpsAutofill.results.needsYou.join(' | '));
check('resume upload flagged for manual attach', /resume|file/i.test(needs), needs.slice(0, 70));

console.log('\nReact compatibility (input events dispatched)');
const ev = await page.evaluate(() => window.__inputEvents);
check('input event fired on text field', ev.first_name === true);
check('input event fired on email', ev.email === true);
check('input event fired on textarea', ev.cover === true);

const filled = await page.evaluate(() => window.__careerOpsAutofill.results.filled.length);
console.log(`\nFields filled: ${filled}`);

await browser.close();

const failed = results.filter((r) => !r.pass);
console.log(`\n${'='.repeat(52)}`);
console.log(`${results.length - failed.length}/${results.length} passed`);
if (failed.length) {
  console.log('FAILED:'); failed.forEach((f) => console.log('  - ' + f.name));
  process.exit(1);
}
console.log('All checks passed.');
