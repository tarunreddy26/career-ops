#!/usr/bin/env node

/**
 * batch-verify-reports.mjs — Upgrade batch-mode reports from unverified to verified
 *
 * Batch workers (claude -p) cannot use Playwright and mark their reports
 *   **Verification:** unconfirmed (batch mode)
 *
 * This script scans reports/, extracts the URL from each unconfirmed report,
 * runs the URLs through a small Playwright pool (default concurrency 2),
 * and rewrites the verification line in place using the shared
 * classifyLiveness logic.
 *
 * Usage:
 *   node batch-verify-reports.mjs                # verify all 'unconfirmed' reports
 *   node batch-verify-reports.mjs --concurrency 3
 *   node batch-verify-reports.mjs --report 042   # verify a single report number
 *   node batch-verify-reports.mjs --all          # re-verify every report
 *   node batch-verify-reports.mjs --dry-run      # show what would be verified
 *
 * Exit code: 0 if all active, 1 if any expired.
 */

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { classifyLiveness } from './liveness-core.mjs';

const REPORTS_DIR = 'reports';
const DEFAULT_CONCURRENCY = 2;
const NAV_TIMEOUT_MS = 15000;
const HYDRATE_DELAY_MS = 2000;

function parseArgs(argv) {
  const opts = { concurrency: DEFAULT_CONCURRENCY, report: null, all: false, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--concurrency') opts.concurrency = Math.max(1, parseInt(argv[++i] || '2', 10));
    else if (a === '--report') opts.report = argv[++i];
    else if (a === '--all') opts.all = true;
    else if (a === '--dry-run') opts.dryRun = true;
    else if (a === '-h' || a === '--help') { printHelp(); process.exit(0); }
    else { console.error(`Unknown option: ${a}`); printHelp(); process.exit(1); }
  }
  return opts;
}

function printHelp() {
  console.log(`Usage: node batch-verify-reports.mjs [OPTIONS]

Options:
  --concurrency N   Parallel Playwright contexts (default: ${DEFAULT_CONCURRENCY})
  --report NUM      Verify only this report number (e.g. 042)
  --all             Re-verify all reports, not just 'unconfirmed' ones
  --dry-run         Show what would be verified, do not touch files
  -h, --help        Show this help
`);
}

function findReports({ report, all }) {
  if (!existsSync(REPORTS_DIR)) return [];

  const files = readdirSync(REPORTS_DIR)
    .filter(f => f.endsWith('.md') && /^\d{3}-/.test(f))
    .sort();

  const out = [];
  for (const file of files) {
    if (report) {
      const target = report.padStart(3, '0');
      if (!file.startsWith(target + '-')) continue;
    }

    const path = join(REPORTS_DIR, file);
    const content = readFileSync(path, 'utf-8');

    const urlMatch = content.match(/\*\*URL:\*\*\s*(\S+)/);
    if (!urlMatch) continue;
    const url = urlMatch[1].trim();
    if (!/^https?:\/\//.test(url)) continue;

    const verificationMatch = content.match(/\*\*Verification:\*\*\s*([^\n]+)/);
    const verification = verificationMatch ? verificationMatch[1].trim() : null;

    const isUnconfirmed = !verification || /unconfirmed/i.test(verification);
    if (!all && !isUnconfirmed) continue;

    out.push({ file, path, url, verification, content });
  }
  return out;
}

async function verifyOne(context, url) {
  const page = await context.newPage();
  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS });
    const status = response?.status() ?? 0;
    await page.waitForTimeout(HYDRATE_DELAY_MS);

    const finalUrl = page.url();
    const bodyText = await page.evaluate(() => document.body?.innerText ?? '');
    const applyControls = await page.evaluate(() => {
      const candidates = Array.from(
        document.querySelectorAll('a, button, input[type="submit"], input[type="button"], [role="button"]')
      );
      return candidates
        .filter((el) => {
          if (el.closest('nav, header, footer')) return false;
          if (el.closest('[aria-hidden="true"]')) return false;
          const style = window.getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden') return false;
          if (!el.getClientRects().length) return false;
          return Array.from(el.getClientRects()).some((r) => r.width > 0 && r.height > 0);
        })
        .map((el) => [
          el.innerText,
          el.value,
          el.getAttribute('aria-label'),
          el.getAttribute('title'),
        ].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim())
        .filter(Boolean);
    });

    return classifyLiveness({ status, finalUrl, bodyText, applyControls });
  } catch (err) {
    return { result: 'expired', reason: `navigation error: ${err.message.split('\n')[0]}` };
  } finally {
    await page.close().catch(() => {});
  }
}

function updateReportVerification(report, result, reason) {
  const today = new Date().toISOString().slice(0, 10);
  const suffix = result === 'active' ? '' : ` — ${reason}`;
  const newLine = `**Verification:** ${result} (verified ${today}${suffix})`;

  let updated;
  if (report.verification !== null) {
    updated = report.content.replace(/\*\*Verification:\*\*\s*[^\n]+/, newLine);
  } else {
    updated = report.content.replace(/(\*\*URL:\*\*\s*\S+[^\n]*)/, `$1\n${newLine}`);
  }

  writeFileSync(report.path, updated, 'utf-8');
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const reports = findReports(opts);

  if (reports.length === 0) {
    console.log('No reports to verify.');
    return;
  }

  console.log(`Found ${reports.length} report(s) to verify (concurrency: ${opts.concurrency})`);

  if (opts.dryRun) {
    for (const r of reports) {
      console.log(`  ${r.file}`);
      console.log(`    URL: ${r.url}`);
      console.log(`    Current: ${r.verification || '(no Verification line)'}`);
    }
    return;
  }

  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  let idx = 0;
  const counts = { active: 0, expired: 0, uncertain: 0 };

  async function worker() {
    while (true) {
      const i = idx++;
      if (i >= reports.length) return;
      const r = reports[i];
      const { result, reason } = await verifyOne(context, r.url);
      counts[result]++;
      const icon = { active: '✅', expired: '❌', uncertain: '⚠️' }[result];
      console.log(`${icon} ${result.padEnd(9)} ${r.file}`);
      if (result !== 'active') console.log(`           ${reason}`);
      updateReportVerification(r, result, reason);
    }
  }

  await Promise.all(Array.from({ length: opts.concurrency }, () => worker()));

  await context.close();
  await browser.close();

  console.log(`\nResults: ${counts.active} active  ${counts.expired} expired  ${counts.uncertain} uncertain`);
  if (counts.expired > 0) {
    console.log('Expired postings — consider updating applications.md status to "Discarded".');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
