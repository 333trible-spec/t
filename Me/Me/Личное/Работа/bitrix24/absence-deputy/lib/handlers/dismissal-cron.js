'use strict';

const { resolveWebhook, json } = require('../b24');
const { processDueDismissals } = require('../dismissal-core');
const { isCronAuthorized, cronUnauthorizedPayload } = require('../cron-auth');

module.exports = async function handler(req, res) {
  try {
    const method = String((req && req.method) || 'GET').toUpperCase();
    if (method !== 'GET' && method !== 'POST') {
      json(res, 405, { ok: false, error: 'Method not allowed' });
      return;
    }

    if (!isCronAuthorized(req)) {
      const payload = cronUnauthorizedPayload();
      json(res, payload.code === 'CRON_SECRET_MISSING' ? 503 : 401, payload);
      return;
    }

    const webhook = resolveWebhook();
    if (!webhook) {
      json(res, 500, { ok: false, error: 'B24_NAV_WEBHOOK / B24_WEBHOOK не задан' });
      return;
    }

    const result = await processDueDismissals(webhook);
    json(res, 200, result);
  } catch (err) {
    json(res, 500, {
      ok: false,
      error: err && err.message ? err.message : String(err),
      code: err && err.code ? err.code : undefined,
    });
  }
};
