'use strict';

const fs = require('fs');
const path = require('path');

function normalizeWebhook(url) {
  if (!url) return '';
  const s = String(url).trim();
  if (!s) return '';
  return s.endsWith('/') ? s : s + '/';
}

function readEnvFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return {};
    const out = {};
    const text = fs.readFileSync(filePath, 'utf8');
    text.split(/\r?\n/).forEach(function (line) {
      const t = line.trim();
      if (!t || t.charAt(0) === '#') return;
      const eq = t.indexOf('=');
      if (eq <= 0) return;
      const key = t.slice(0, eq).trim();
      let val = t.slice(eq + 1).trim();
      if (
        (val.charAt(0) === '"' && val.charAt(val.length - 1) === '"') ||
        (val.charAt(0) === "'" && val.charAt(val.length - 1) === "'")
      ) {
        val = val.slice(1, -1);
      }
      out[key] = val;
    });
    return out;
  } catch (_) {
    return {};
  }
}

function resolveWebhook() {
  let wh = process.env.B24_NAV_WEBHOOK || process.env.B24_WEBHOOK || '';
  if (wh) return normalizeWebhook(wh);

  const files = [
    path.join(__dirname, '..', '.env'),
    path.join(__dirname, '..', '..', '.env'),
  ];
  for (let i = 0; i < files.length; i++) {
    const env = readEnvFile(files[i]);
    wh = env.B24_NAV_WEBHOOK || env.B24_WEBHOOK || '';
    if (wh) return normalizeWebhook(wh);
  }
  return '';
}

/** Календарный день приложения — YEKT (UTC+5); cron 02:00 и 03:30 YEKT. */
const APP_TZ = 'Asia/Yekaterinburg';

function todayISO(date) {
  const d = date instanceof Date ? date : new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const map = {};
  parts.forEach(function (p) {
    if (p.type !== 'literal') map[p.type] = p.value;
  });
  return map.year + '-' + map.month + '-' + map.day;
}

function toDateOnly(raw) {
  if (raw == null || raw === '') return '';
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (m) {
    return m[3] + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0');
  }
  // Не используем Date.parse — на Vercel UTC ломает календарный день.
  return '';
}

function asUserId(raw) {
  if (raw == null || raw === '' || raw === false) return null;
  if (Array.isArray(raw)) {
    if (!raw.length) return null;
    return asUserId(raw[0]);
  }
  if (typeof raw === 'object') {
    const id = raw.id != null ? raw.id : raw.ID;
    return asUserId(id);
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return String(Math.trunc(n));
}

function isUserActive(user) {
  if (!user) return false;
  const raw = user.ACTIVE != null ? user.ACTIVE : user.active;
  if (raw === false || raw === 0 || raw === '0') return false;
  if (typeof raw === 'string') {
    const s = raw.trim().toUpperCase();
    if (s === 'N' || s === 'FALSE' || s === '0' || s === '') return false;
  }
  return true;
}

function userDisplayName(user) {
  if (!user) return '';
  const last = user.LAST_NAME || user.lastName || '';
  const first = user.NAME || user.firstName || '';
  return [last, first].filter(Boolean).join(' ').trim();
}

async function sleep(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

async function b24(webhook, method, params) {
  const maxAttempts = 3;
  let lastErr = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer =
      controller &&
      setTimeout(function () {
        controller.abort();
      }, 25000);

    try {
      const res = await fetch(webhook + method, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(params || {}),
        signal: controller ? controller.signal : undefined,
      });
      const data = await res.json().catch(function () {
        return {};
      });
      if (!res.ok && !data.error) {
        const err = new Error('HTTP ' + res.status + ' ' + method);
        err.code = 'HTTP_' + res.status;
        throw err;
      }
      if (data.error) {
        const err = new Error(data.error_description || data.error);
        err.code = data.error;
        const retryable =
          data.error === 'QUERY_LIMIT_EXCEEDED' ||
          data.error === 'TOO_MANY_REQUESTS' ||
          Number(res.status) === 503;
        if (retryable && attempt < maxAttempts) {
          lastErr = err;
          await sleep(400 * attempt);
          continue;
        }
        throw err;
      }
      return data;
    } catch (err) {
      lastErr = err;
      const aborted = err && (err.name === 'AbortError' || /aborted/i.test(String(err.message || '')));
      if (aborted && attempt < maxAttempts) {
        await sleep(400 * attempt);
        continue;
      }
      if (attempt >= maxAttempts) throw err;
      await sleep(400 * attempt);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  throw lastErr || new Error('b24 failed: ' + method);
}

function json(res, status, body) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.status(status).end(JSON.stringify(body));
}

async function readJsonBody(req) {
  if (req.body != null) {
    if (typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
    if (typeof req.body === 'string') {
      const t = req.body.trim();
      if (!t) return {};
      return JSON.parse(t);
    }
  }
  return new Promise(function (resolve, reject) {
    const chunks = [];
    req.on('data', function (chunk) {
      chunks.push(chunk);
    });
    req.on('end', function () {
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

const ALLOWED_USER_ID = 24880;

function assertAllowedCaller(requestedBy) {
  const id = Number(requestedBy);
  if (!Number.isFinite(id) || id !== ALLOWED_USER_ID) {
    const err = new Error('Доступ запрещён');
    err.status = 403;
    throw err;
  }
}

module.exports = {
  ALLOWED_USER_ID,
  normalizeWebhook,
  resolveWebhook,
  todayISO,
  toDateOnly,
  asUserId,
  isUserActive,
  userDisplayName,
  b24,
  json,
  readJsonBody,
  assertAllowedCaller,
};
