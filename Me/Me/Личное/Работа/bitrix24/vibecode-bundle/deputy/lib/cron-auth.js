'use strict';

const crypto = require('crypto');

function getCronSecret() {
  return (
    process.env.DELEGATION_CRON_SECRET ||
    process.env.DISMISSAL_CRON_SECRET ||
    process.env.CRON_SECRET ||
    ''
  );
}

function allowInsecureCron() {
  return process.env.ALLOW_INSECURE_CRON === '1' && !process.env.VERCEL;
}

function secretsEqual(a, b) {
  const left = Buffer.from(String(a || ''), 'utf8');
  const right = Buffer.from(String(b || ''), 'utf8');
  if (left.length !== right.length) return false;
  if (!left.length) return false;
  return crypto.timingSafeEqual(left, right);
}

/**
 * Fail-closed на Vercel: без секрета — отказ.
 * Секрет только из Authorization / X-Cron-Secret (не из query).
 */
function isCronAuthorized(req) {
  const secret = getCronSecret();
  if (!secret) {
    return allowInsecureCron();
  }

  const header =
    (req.headers && (req.headers.authorization || req.headers['x-cron-secret'])) || '';
  const bearer = String(header).replace(/^Bearer\s+/i, '').trim();
  return secretsEqual(bearer, secret);
}

function cronUnauthorizedPayload() {
  const secret = getCronSecret();
  if (!secret && !allowInsecureCron()) {
    return {
      ok: false,
      error: 'Cron secret not configured',
      code: 'CRON_SECRET_MISSING',
    };
  }
  return { ok: false, error: 'Unauthorized' };
}

module.exports = {
  getCronSecret,
  isCronAuthorized,
  cronUnauthorizedPayload,
  allowInsecureCron,
};
