#!/usr/bin/env node

/**
 * qa-cache.mjs — Q&A cache for the apply mode
 *
 * Stores polished question→answer pairs so repeat application questions
 * reuse vetted answers instead of regenerating from scratch.
 *
 * Storage: data/qa-cache.jsonl  (one JSON object per line, append-only;
 *          last entry per hash wins on read)
 *
 * Subcommands:
 *   lookup "<question>"
 *     Print top matches as JSON: { question, matches: [{score, ...}] }
 *
 *   add --question "<q>" [--answer "<a>"] [--company "<c>"] [--tags t1,t2]
 *     If --answer is omitted and stdin is piped, the answer is read from stdin.
 *     Updates existing entry if question hash matches; otherwise inserts.
 *
 *   list                  All entries as JSON.
 *   view                  Human-readable markdown of all entries.
 *   stats                 Counts and metadata.
 */

import { existsSync, readFileSync, appendFileSync, mkdirSync, readSync, fstatSync } from 'fs';
import { createHash } from 'crypto';
import { dirname } from 'path';

const CACHE_PATH = 'data/qa-cache.jsonl';
const MATCH_THRESHOLD = 0.4;
const MAX_RESULTS = 3;

const STOPWORDS = new Set([
  'a','an','the','is','are','was','were','be','been','being','have','has','had',
  'do','does','did','will','would','should','could','can','may','might','must',
  'of','at','by','for','with','about','to','from','in','on','as',
  'this','that','these','those','i','you','he','she','it','we','they',
  'my','your','our','their','and','or','but','not','if','then','so',
]);

function normalize(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function tokenize(text) {
  return normalize(text).split(' ').filter((t) => t && !STOPWORDS.has(t));
}

function hashQuestion(q) {
  return createHash('sha1').update(normalize(q)).digest('hex').slice(0, 8);
}

function jaccard(aTokens, bTokens) {
  const a = new Set(aTokens), b = new Set(bTokens);
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function readEntries() {
  if (!existsSync(CACHE_PATH)) return [];
  const text = readFileSync(CACHE_PATH, 'utf-8');
  const lines = text.split('\n').filter((l) => l.trim());
  const seen = new Map();
  for (const line of lines) {
    try {
      const entry = JSON.parse(line);
      if (entry && entry.hash) seen.set(entry.hash, entry);
    } catch { /* skip malformed */ }
  }
  return Array.from(seen.values());
}

function appendEntry(entry) {
  const dir = dirname(CACHE_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  appendFileSync(CACHE_PATH, JSON.stringify(entry) + '\n', 'utf-8');
}

function lookup(question) {
  const entries = readEntries();
  if (entries.length === 0) return [];

  const qTokens = tokenize(question);
  const qHash = hashQuestion(question);

  const scored = entries.map((e) => {
    const eTokens = tokenize(e.question);
    let score = jaccard(qTokens, eTokens);
    if (e.hash === qHash) score = 1.0;
    return { ...e, score: Math.round(score * 1000) / 1000 };
  });

  return scored
    .filter((e) => e.score >= MATCH_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RESULTS);
}

function readStdinSync() {
  if (process.stdin.isTTY) return '';
  const chunks = [];
  const buf = Buffer.alloc(65536);
  try {
    while (true) {
      const n = readSync(0, buf, 0, buf.length, null);
      if (n === 0) break;
      chunks.push(Buffer.from(buf.subarray(0, n)));
    }
  } catch { /* end of stream */ }
  return Buffer.concat(chunks).toString('utf-8');
}

function addOrUpdate({ question, answer, company, tags }) {
  if (!question) throw new Error('--question is required');
  if (!answer) {
    const piped = readStdinSync();
    if (piped.trim()) answer = piped;
  }
  if (!answer) throw new Error('--answer is required (or pipe it via stdin)');

  const today = new Date().toISOString().slice(0, 10);
  const hash = hashQuestion(question);

  const entries = readEntries();
  const existing = entries.find((e) => e.hash === hash);

  const newTags = tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : [];
  const allTags = Array.from(new Set([...(existing?.tags ?? []), ...newTags]));

  const companies = [...(existing?.companies ?? [])];
  if (company && !companies.includes(company)) companies.push(company);

  const entry = {
    hash,
    question: question.trim(),
    answer: answer.trim(),
    tags: allTags,
    companies,
    times_used: (existing?.times_used ?? 0) + 1,
    last_used: today,
    created: existing?.created ?? today,
  };

  appendEntry(entry);
  return entry;
}

function parseFlags(argv) {
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) { opts[key] = next; i++; }
      else { opts[key] = true; }
    }
  }
  return opts;
}

function renderMarkdown(entries) {
  if (entries.length === 0) return '# Q&A Cache\n\n(empty)\n';
  const sorted = [...entries].sort((a, b) => (b.last_used || '').localeCompare(a.last_used || ''));
  const lines = ['# Q&A Cache', '', `_${sorted.length} entries_`, ''];
  for (const e of sorted) {
    lines.push(`## ${e.question.replace(/\n+/g, ' ')}`);
    lines.push('');
    const meta = [
      `**Hash:** \`${e.hash}\``,
      `**Used:** ${e.times_used}×`,
      `**Last:** ${e.last_used}`,
      `**Created:** ${e.created}`,
    ];
    lines.push(meta.join(' · '));
    if (e.tags?.length) lines.push(`**Tags:** ${e.tags.join(', ')}`);
    if (e.companies?.length) lines.push(`**Companies:** ${e.companies.join(', ')}`);
    lines.push('');
    lines.push(e.answer);
    lines.push('');
    lines.push('---');
    lines.push('');
  }
  return lines.join('\n');
}

function printHelp() {
  console.log(`Usage:
  node qa-cache.mjs lookup "<question>"
  node qa-cache.mjs add --question "<q>" [--answer "<a>"] [--company "<c>"] [--tags t1,t2]
  node qa-cache.mjs list
  node qa-cache.mjs view
  node qa-cache.mjs stats

Notes:
  - If --answer is omitted and stdin is piped, the answer is read from stdin.
  - Storage: ${CACHE_PATH} (JSONL, append-only, last entry per question hash wins).
`);
}

function main() {
  const [cmd, ...rest] = process.argv.slice(2);

  switch (cmd) {
    case 'lookup': {
      const question = rest.join(' ').trim();
      if (!question) { console.error('lookup requires a question'); process.exit(1); }
      const matches = lookup(question);
      console.log(JSON.stringify({ question, matches }, null, 2));
      break;
    }
    case 'add': {
      const flags = parseFlags(rest);
      try {
        const entry = addOrUpdate(flags);
        console.log(JSON.stringify({ status: 'ok', entry }, null, 2));
      } catch (err) {
        console.error(err.message);
        process.exit(1);
      }
      break;
    }
    case 'list': {
      console.log(JSON.stringify(readEntries(), null, 2));
      break;
    }
    case 'view': {
      process.stdout.write(renderMarkdown(readEntries()));
      break;
    }
    case 'stats': {
      const entries = readEntries();
      const totalUses = entries.reduce((s, e) => s + (e.times_used || 0), 0);
      const tagSet = new Set(), companySet = new Set();
      for (const e of entries) {
        (e.tags || []).forEach((t) => tagSet.add(t));
        (e.companies || []).forEach((c) => companySet.add(c));
      }
      console.log(JSON.stringify({
        entries: entries.length,
        total_uses: totalUses,
        unique_tags: tagSet.size,
        unique_companies: companySet.size,
        cache_path: CACHE_PATH,
      }, null, 2));
      break;
    }
    case '-h':
    case '--help':
    case undefined:
      printHelp();
      break;
    default:
      console.error(`Unknown command: ${cmd}`);
      printHelp();
      process.exit(1);
  }
}

main();
