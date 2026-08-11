#!/usr/bin/env node
'use strict';

/**
 * cron-job.org: один job на все часы обновления фида (Тюмень).
 * 8–21 YEKT каждый час; ночью 00 и 06.
 *
 *   FEED_CRON_SECRET=... CRON_JOB_ORG_API_KEY=... node scripts/setup-feed-cron-job-org.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { FEED_HOURS_YEKT, FEED_TZ } from '../lib/schedule.js';

const ENDPOINT = 'https://api.cron-job.org';
const CRON_URL = 'https://obshchiy-json-feed.vercel.app/api/refresh';
const TIMEZONE = FEED_TZ;
const TITLE = 'общий-json-фид (YEKT schedule)';

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
  const lines = fs
    .readFileSync(desktop, 'utf8')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  let secret = '';
  let apiKey = '';
  for (const line of lines) {
    const apiMatch = line.match(/^-?\s*api\s+(.+)$/i);
    if (apiMatch) {
      apiKey = apiMatch[1].trim();
      continue;
    }
    const feedMatch = line.match(/^-?\s*feed[_-]?secret\s+(.+)$/i);
    if (feedMatch) {
      secret = feedMatch[1].trim();
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
    args.secret || process.env.FEED_CRON_SECRET || process.env.DISMISSAL_CRON_SECRET || fromFile.secret;
  if (!apiKey) {
    console.error('Missing CRON_JOB_ORG_API_KEY');
    process.exit(1);
  }
  if (!secret) {
    console.error('Missing FEED_CRON_SECRET');
    process.exit(1);
  }
  return { apiKey, secret };
}

async function api(apiKey, method, pathSuffix, body, attempt = 1) {
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
  if (res.status === 429 && attempt < 5) {
    const wait = attempt * 5000;
    console.error(`rate limited, wait ${wait}ms…`);
    await new Promise((r) => setTimeout(r, wait));
    return api(apiKey, method, pathSuffix, body, attempt + 1);
  }
  if (!res.ok) {
    throw new Error(`cron-job.org ${method} ${pathSuffix} → ${res.status}: ${text}`);
  }
  return data;
}

function buildJob(secret) {
  return {
    url: CRON_URL,
    enabled: true,
    title: TITLE,
    saveResponses: true,
    requestMethod: 1,
    requestTimeout: 120,
    schedule: {
      timezone: TIMEZONE,
      expiresAt: 0,
      hours: [...FEED_HOURS_YEKT],
      minutes: [0],
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

function hoursMatch(existing) {
  const h = existing?.schedule?.hours;
  if (!Array.isArray(h)) return false;
  const a = [...h].map(Number).sort((x, y) => x - y);
  const b = [...FEED_HOURS_YEKT].map(Number).sort((x, y) => x - y);
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

async function main() {
  const { apiKey, secret } = getConfig();
  const { jobs = [] } = await api(apiKey, 'GET', '/jobs');
  const payload = { job: buildJob(secret) };

  const existing = jobs.find(
    (j) => j.title === TITLE || String(j.url || '').startsWith(CRON_URL)
  );

  if (existing) {
    const urlOk = String(existing.url || '') === CRON_URL;
    if (urlOk && hoursMatch(existing) && existing.enabled !== false) {
      console.log(
        JSON.stringify(
          { ok: true, action: 'skipped', jobId: existing.jobId, url: CRON_URL, hours: FEED_HOURS_YEKT },
          null,
          2
        )
      );
      return;
    }
    await api(apiKey, 'PATCH', `/jobs/${existing.jobId}`, payload);
    console.log(
      JSON.stringify(
        { ok: true, action: 'updated', jobId: existing.jobId, url: CRON_URL, hours: FEED_HOURS_YEKT },
        null,
        2
      )
    );
    return;
  }

  const { jobId } = await api(apiKey, 'PUT', '/jobs', payload);
  console.log(
    JSON.stringify({ ok: true, action: 'created', jobId, url: CRON_URL, hours: FEED_HOURS_YEKT }, null, 2)
  );
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
