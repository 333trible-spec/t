#!/usr/bin/env node
'use strict';

/**
 * Create or update cron-job.org jobs for dismissal cron.
 *
 * Usage:
 *   CRON_JOB_ORG_API_KEY=... DISMISSAL_CRON_SECRET=... node scripts/setup-cron-job-org.mjs
 *   node scripts/setup-cron-job-org.mjs --api-key=... --secret=...
 *
 * API key: https://console.cron-job.org/settings → API key
 */

import fs from 'node:fs';
import path from 'node:path';

const ENDPOINT = 'https://api.cron-job.org';
const CRON_URL = 'https://app-d561d9d4f2bd.vibecode.bitrix24.tech/deputy/api/dismissal-cron';
const TIMEZONE = 'Asia/Yekaterinburg';

const JOBS = [
  { title: '6 кадров — увольнения (02:00 YEKT)', hour: 2, minute: 0 },
  { title: '6 кадров — увольнения (03:30 YEKT)', hour: 3, minute: 30 },
];

function parseArgs(argv) {
  const out = {};
  for (const arg of argv) {
    const m = arg.match(/^--([^=]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

function readDesktopFile() {
  const desktop = path.join(process.env.USERPROFILE || '', 'Desktop', 'вот тут.txt');
  if (!fs.existsSync(desktop)) return { secret: '', apiKey: '' };
  const lines = fs.readFileSync(desktop, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let secret = '';
  let apiKey = '';
  for (const line of lines) {
    const apiMatch = line.match(/^-?\s*api\s+(.+)$/i);
    if (apiMatch) {
      apiKey = apiMatch[1].trim();
      continue;
    }
    if (!secret) secret = line;
  }
  return { secret, apiKey };
}

function getConfig() {
  const args = parseArgs(process.argv.slice(2));
  const fromFile = readDesktopFile();
  const apiKey = args['api-key'] || process.env.CRON_JOB_ORG_API_KEY || fromFile.apiKey;
  const secret = args.secret || process.env.DISMISSAL_CRON_SECRET || fromFile.secret;
  if (!apiKey) {
    console.error('Missing CRON_JOB_ORG_API_KEY (env or --api-key=...)');
    console.error('Get it: https://console.cron-job.org/settings');
    process.exit(1);
  }
  if (!secret) {
    console.error('Missing DISMISSAL_CRON_SECRET (env, --secret=..., or Desktop/вот тут.txt)');
    process.exit(1);
  }
  return { apiKey, secret };
}

async function api(apiKey, method, pathSuffix, body) {
  const res = await fetch(ENDPOINT + pathSuffix, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(`cron-job.org ${method} ${pathSuffix} → ${res.status}: ${text}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

function buildJob({ title, hour, minute }, secret) {
  return {
    url: CRON_URL,
    enabled: true,
    title,
    saveResponses: true,
    requestMethod: 1, // POST
    requestTimeout: 120,
    schedule: {
      timezone: TIMEZONE,
      expiresAt: 0,
      hours: [hour],
      minutes: [minute],
      mdays: [-1],
      months: [-1],
      wdays: [-1],
    },
    extendedData: {
      headers: {
        Authorization: `Bearer ${secret}`,
      },
    },
  };
}

function matchesJob(existing, spec) {
  if (!existing || !existing.url) return false;
  if (!String(existing.url).startsWith(CRON_URL)) return false;
  const h = existing.schedule && existing.schedule.hours;
  const m = existing.schedule && existing.schedule.minutes;
  return Array.isArray(h) && h[0] === spec.hour && Array.isArray(m) && m[0] === spec.minute;
}

async function main() {
  const { apiKey, secret } = getConfig();
  const { jobs = [] } = await api(apiKey, 'GET', '/jobs');
  const created = [];
  const skipped = [];

  for (const spec of JOBS) {
    const existing = jobs.find((j) => matchesJob(j, spec) || j.title === spec.title);
    if (existing) {
      skipped.push({ jobId: existing.jobId, title: existing.title || spec.title });
      continue;
    }
    const payload = { job: buildJob(spec, secret) };
    const { jobId } = await api(apiKey, 'PUT', '/jobs', payload);
    created.push({ jobId, title: spec.title });
    await new Promise((r) => setTimeout(r, 1100));
  }

  console.log(JSON.stringify({ ok: true, created, skipped }, null, 2));
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
