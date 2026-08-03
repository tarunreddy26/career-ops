# Career-Ops Autofill

Fills job application forms in your browser. You review, you attach the resume, you hit Submit.

**Tested:** 23/23 checks pass against a mock ATS form (`test/run-tests.mjs`), including the
three work-authorization questions and the guarantee that nothing submits.

---

## Why this runs in your browser and not on the server

Application forms need your logged-in session, your cookies, and your eyes. A server-side bot
would need your credentials, would trip bot detection on Workday and iCIMS, and would be
submitting things you never saw. A userscript runs as *you*, on the page you already have open,
and stops before the last click.

---

## Install (2 minutes, one time)

1. Install **Tampermonkey** — [Chrome](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) · [Firefox](https://addons.mozilla.org/firefox/addon/tampermonkey/) · [Edge](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)
2. Click the Tampermonkey icon → **Create a new script**
3. Delete the placeholder, paste the whole of `autofill.user.js`
4. **Ctrl/Cmd + S** to save

Done. It now activates automatically on Greenhouse, Lever, Ashby, Workday, iCIMS,
SmartRecruiters, Oracle Cloud, Workable, BambooHR, JazzHR, Breezy, Recruitee, Teamtailor,
Jobvite, Taleo, SuccessFactors, Paylocity, and Dayforce.

### No-install fallback

Open DevTools (**F12**) → Console → paste the script → Enter. Works once, per page.
Some sites block console paste until you type `allow pasting` first.

---

## Use

1. Open the application form
2. A dark panel appears bottom-right → click **Fill this form**
3. Fields turn **green** (filled) or **amber** (needs your attention)
4. **Attach your resume PDF** — pick the variant from the application kit
5. Read everything, fix anything amber, then **you** hit Submit

Multi-page forms (Workday especially): click **Fill this form** again on each page.

---

## What it will not do

| | |
|---|---|
| **Submit** | No code path clicks a submit button. The only synthetic click targets a radio input. |
| **Upload your resume** | Browsers forbid scripts from setting `<input type=file>`. This is a security rule, not something I can work around. Attach it yourself — the one manual step per application. |
| **Tick consent boxes** | Never auto-agrees to a privacy policy or terms on your behalf. |
| **Overwrite** | Leaves any field that already has a value alone. |
| **Guess** | If it can't match a field confidently, it leaves it blank and lists it under "Needs you". |

---

## The work-authorization logic

Three questions that look alike and are not. Getting one backwards is a misrepresentation that
surfaces at I-9, so the matcher tests most-specific-first and each case is covered by a test:

| Question | Answer | Why |
|---|---|---|
| "Are you legally authorized to work in the US?" | **Yes** | You are, on OPT |
| "Will you now **or in the future** require sponsorship?" | **Yes** | You'll need H-1B later. Answering No here is false. |
| "Do you require sponsorship **to begin** employment?" | **No** | You can start immediately |

Where there's a free-text box next to the sponsorship question, the script fills in your
three-year / no-cost-to-employer framing. That context is what keeps a truthful "Yes" from
reading as "expensive problem starting now."

---

## Editing your details

Everything lives in the `P = { ... }` object at the top of the script. Change a value, save,
reload the form page. No other edits needed.

---

## Worth pairing with this

**[Simplify Copilot](https://simplify.jobs/copilot)** — free Chrome extension, genuinely good at
autofill across the same ATS platforms, and it's built by the people behind one of the job lists
this pipeline scrapes. It handles some Workday edge cases better than this script does. Running
both is fine; use whichever fills a given form more completely.

**Avoid mass auto-submit tools** (LazyApply and similar). They fire hundreds of applications
with no review, which is the opposite of what you asked for, and the output quality is poor
enough that it damages your odds at companies you actually want.

---

## Running the tests

```bash
node autofill/test/run-tests.mjs
# or, if the bundled Chromium mismatches:
CHROMIUM_PATH=/path/to/chrome node autofill/test/run-tests.mjs
```

Covers polarity of all three work-auth questions, React-controlled input compatibility
(direct `.value` assignment silently reverts on Greenhouse/Lever — the script uses the native
setter plus `input`/`change` events), no-submit, no-auto-consent, no-overwrite, and that the
file input is flagged for manual attachment.
