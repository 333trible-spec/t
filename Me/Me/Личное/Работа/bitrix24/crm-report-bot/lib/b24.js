'use strict';

const DEFAULT_WEBHOOK = process.env.B24_WEBHOOK || process.env.B24_TEST_WEBHOOK || '';

function normalizeWebhook(url) {
  if (!url) return '';
  return url.endsWith('/') ? url : `${url}/`;
}

async function callRest(method, params = {}, webhook = DEFAULT_WEBHOOK) {
  const base = normalizeWebhook(webhook);
  if (!base) throw new Error('B24_TEST_WEBHOOK или B24_WEBHOOK не задан в .env');

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

async function callRestWithAuth(method, params, auth) {
  if (auth?.access_token && auth?.client_endpoint) {
    const base = auth.client_endpoint.endsWith('/') ? auth.client_endpoint : `${auth.client_endpoint}/`;
    const res = await fetch(`${base}${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ ...params, auth: auth.access_token }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error_description || data.error);
    return data;
  }
  return callRest(method, params);
}

async function listAll(method, params, webhook) {
  const items = [];
  let start = 0;
  for (;;) {
    const page = await callRest(method, { ...params, start }, webhook);
    if (Array.isArray(page.result)) items.push(...page.result);
    if (!page.next) break;
    start = page.next;
  }
  return items;
}

module.exports = { callRest, callRestWithAuth, listAll, normalizeWebhook };
