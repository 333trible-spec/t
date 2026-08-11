#!/usr/bin/env node
'use strict';

/**
 * Create or update cron-job.org jobs for delegation cron.
 *
 * Usage:
 *   CRON_JOB_ORG_API_KEY=... DISMISSAL_CRON_SECRET=... node scripts/setup-delegation-cron-job-org.mjs
 */

import fs from 'node:fs';
import path from 'node:path';

const ENDPOINT = 'https://api.cron-job.org';
const CRON_URL = 'https://app-d561d9d4f2bd.vibecode.bitrix24.tech/deputy/api/delegation-cron';
const TIMEZONE = 'Asia/Yekaterinburg';

const JOBS = [
  { title: '6 кадров — делегирование (08:00 YEKT)', hour: 8, minute: 0 },
  { title: '6 кадров — делегирование (11:00 YEKT)', hour: 11, minute: 0 },
  { title: '6 кадров — делегирование (14:00 YEKT)', hour: 14, minute: 0 },
  { title: '6 кадров — делегирование (17:00 YEKT)', hour: 17, minute: 0 },
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
  const secret =
    args.secret ||
    process.env.DELEGATION_CRON_SECRET ||
    process.env.DISMISSAL_CRON_SECRET ||
    fromFile.secret;
  if (!apiKey) {
    console.error('Missing CRON_JOB_ORG_API_KEY (env or --api-key=...)');
    process.exit(1);
  }
  if (!secret) {
    console.error('Missing DELEGATION_CRON_SECRET / DISMISSAL_CRON_SECRET');
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
  if (!res.ok) {
    throw new Error(`cron-job.org ${method} ${pathSuffix} → ${res.status}: ${text}`);
  }
  return text ? JSON.parse(text) : {};
}

function buildJob({ title, hour, minute }, secret) {
  return {
    url: CRON_URL,
    enabled: true,
    title,
    saveResponses: true,
    requestMethod: 1,
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
    const { jobId } = await api(apiKey, 'PUT', '/jobs', { job: buildJob(spec, secret) });
    created.push({ jobId, title: spec.title });
    await new Promise((r) => setTimeout(r, 1100));
  }

  console.log(JSON.stringify({ ok: true, url: CRON_URL, created, skipped }, null, 2));
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
