'use strict';

const fs = require('fs');
const path = require('path');
const { json, resolveWebhook, b24 } = require('../b24');
const { assertAppCaller } = require('../app-auth');
const { getCronSecret } = require('../cron-auth');
const { storageMode } = require('../plans-store');
const { isConfigured, loadConfigFromDisk } = require('../six-staff-list');

function readVersion() {
  try {
    const raw = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', '..', 'version.json'), 'utf8')
    );
    return String(raw.version || '0.0.0');
  } catch (_) {
    return '0.0.0';
  }
}

function hostLabel(req) {
  const explicit = String(process.env.APP_PUBLIC_HOST || '').trim();
  if (explicit) return explicit.replace(/^https?:\/\//, '');

  const headers = (req && req.headers) || {};
  const forwarded = String(headers['x-forwarded-host'] || '').trim();
  if (forwarded) return forwarded.split(',')[0].trim();

  const host = String(headers.host || '').trim();
  if (host) return host;

  return 'local';
}

async function checkWebhook() {
  const wh = resolveWebhook();
  if (!wh) {
    return { ok: false, label: 'Webhook Б24', detail: 'не задан' };
  }
  try {
    await b24(wh, 'user.current', {});
    return { ok: true, label: 'Webhook Б24', detail: 'OK' };
  } catch (err) {
    return {
      ok: false,
      label: 'Webhook Б24',
      detail: err && err.message ? err.message : 'ошибка',
    };
  }
}

async function checkRedis() {
  const mode = storageMode();
  if (mode === 'file') {
    return { ok: true, label: 'Redis', detail: 'файл (dev)' };
  }
  if (mode === 'unavailable') {
    return { ok: false, label: 'Redis', detail: 'не подключён' };
  }
  try {
    const { Redis } = require('@upstash/redis');
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN,
    });
    await redis.ping();
    return { ok: true, label: 'Redis', detail: 'OK' };
  } catch (err) {
    return {
      ok: false,
      label: 'Redis',
      detail: err && err.message ? err.message : 'ошибка',
    };
  }
}

function checkCronSecret() {
  const secret = String(getCronSecret() || '').trim();
  return {
    ok: !!secret,
    label: 'Cron-secret',
    detail: secret ? 'OK' : 'не задан',
  };
}

function checkCronApiKey() {
  const key = String(process.env.CRON_JOB_ORG_API_KEY || '').trim();
  return {
    ok: !!key,
    label: 'cron-job.org',
    detail: key ? 'ключ OK' : 'ключ не задан',
  };
}

function checkSixStaffList() {
  if (!isConfigured()) {
    return { ok: false, label: 'УС #276', detail: 'не настроен' };
  }
  const cfg = loadConfigFromDisk();
  const id = cfg && cfg.iblockId ? String(cfg.iblockId) : '';
  return { ok: true, label: 'УС #276', detail: id ? 'ID ' + id : 'OK' };
}

module.exports = async function handler(req, res) {
  try {
    const method = String((req && req.method) || 'GET').toUpperCase();
    if (method !== 'GET') {
      json(res, 405, { ok: false, error: 'Method not allowed' });
      return;
    }

    await assertAppCaller(req, { query: req.query || {} });

    const checks = await Promise.all([
      checkWebhook(),
      checkRedis(),
      Promise.resolve(checkSixStaffList()),
      Promise.resolve(checkCronSecret()),
      Promise.resolve(checkCronApiKey()),
    ]);

    const allOk = checks.every(function (c) {
      return c.ok;
    });

    json(res, 200, {
      ok: true,
      healthy: allOk,
      version: readVersion(),
      host: hostLabel(req),
      checks: checks,
    });
  } catch (err) {
    const status = err && err.status ? err.status : 500;
    json(res, status, {
      ok: false,
      error: err && err.message ? err.message : String(err),
      code: err && err.code ? err.code : undefined,
    });
  }
};
