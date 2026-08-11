'use strict';

const { ALLOWED_USER_ID, assertAllowedCaller, asUserId } = require('./b24');

const DOMAIN_RE =
  /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+(?:bitrix24\.(?:ru|com|eu|de|fr|pl|es|by|kz|ua|cn)|bitrix24\.com\.br)$/i;

function allowInsecureCaller() {
  if (process.env.VERCEL) return false;
  return process.env.ALLOW_INSECURE_CALLER === '1' || process.env.NODE_ENV !== 'production';
}

function header(req, name) {
  if (!req || !req.headers) return '';
  const key = String(name).toLowerCase();
  const raw = req.headers[key] || req.headers[name];
  return raw != null ? String(raw).trim() : '';
}

function normalizeDomain(raw) {
  let d = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .split('/')[0]
    .split(':')[0];
  if (!d || !DOMAIN_RE.test(d)) {
    const err = new Error('Некорректный domain Bitrix24');
    err.status = 400;
    throw err;
  }
  return d;
}

function extractAuth(req, body, query) {
  const b = body || {};
  const q = query || (req && req.query) || {};
  const accessToken =
    b.accessToken ||
    b.access_token ||
    b.auth ||
    q.accessToken ||
    q.auth ||
    header(req, 'x-b24-auth') ||
    '';
  const domainRaw =
    b.domain || q.domain || header(req, 'x-b24-domain') || '';
  return {
    accessToken: String(accessToken || '').trim(),
    domain: domainRaw ? String(domainRaw).trim() : '',
    requestedBy: b.requestedBy != null ? b.requestedBy : q.requestedBy,
  };
}

async function fetchUserCurrent(domain, accessToken) {
  const host = normalizeDomain(domain);
  const url = 'https://' + host + '/rest/user.current.json';
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer =
    controller &&
    setTimeout(function () {
      controller.abort();
    }, 10000);

  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ auth: accessToken }),
      signal: controller ? controller.signal : undefined,
    });
  } finally {
    if (timer) clearTimeout(timer);
  }

  const data = await res.json().catch(function () {
    return {};
  });
  if (!res.ok || data.error) {
    const err = new Error(data.error_description || data.error || 'Ошибка user.current');
    err.status = 401;
    err.code = data.error || 'AUTH_FAILED';
    throw err;
  }
  return data.result || null;
}

/**
 * Проверяет, что вызов из сессии BX24 пользователя ALLOWED_USER_ID.
 * Возвращает строковый userId.
 */
async function assertAppCaller(req, options) {
  const opts = options || {};
  const auth = extractAuth(req, opts.body, opts.query);

  if (auth.accessToken && auth.domain) {
    const user = await fetchUserCurrent(auth.domain, auth.accessToken);
    const id = asUserId(user && (user.ID != null ? user.ID : user.id));
    if (!id || Number(id) !== ALLOWED_USER_ID) {
      const err = new Error('Доступ запрещён');
      err.status = 403;
      throw err;
    }
    return id;
  }

  if (allowInsecureCaller()) {
    assertAllowedCaller(auth.requestedBy != null ? auth.requestedBy : ALLOWED_USER_ID);
    return String(ALLOWED_USER_ID);
  }

  const err = new Error('Нужна авторизация Bitrix24 (accessToken + domain)');
  err.status = 401;
  err.code = 'AUTH_REQUIRED';
  throw err;
}

module.exports = {
  assertAppCaller,
  allowInsecureCaller,
  normalizeDomain,
  extractAuth,
};
