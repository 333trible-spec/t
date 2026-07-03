'use strict';

const DEFAULT_WEBHOOK = process.env.B24_WEBHOOK || process.env.B24_TEST_WEBHOOK || '';

function normalizeWebhook(url) {
  if (!url) return '';
  return url.endsWith('/') ? url : `${url}/`;
}

async function callRest(method, params = {}, webhook = DEFAULT_WEBHOOK) {
  const base = normalizeWebhook(webhook);
  if (!base) throw new Error('B24_TEST_WEBHOOK не задан в Личное/Работа/bitrix24/.env');

  const res = await fetch(`${base}${method}.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(params),
  });

  const data = await res.json();
  if (data.error) {
    const err = new Error(data.error_description || data.error);
    err.code = data.error;
    throw err;
  }
  return data;
}

module.exports = { callRest, normalizeWebhook };
