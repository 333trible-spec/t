'use strict';

const { resolveWebhook, json, readJsonBody } = require('../b24');
const { processVacationDelegation } = require('../delegation-core');
const { assertAppCaller } = require('../app-auth');

module.exports = async function handler(req, res) {
  try {
    const method = String((req && req.method) || 'GET').toUpperCase();
    if (method !== 'POST') {
      json(res, 405, { ok: false, error: 'Method not allowed' });
      return;
    }

    const body = await readJsonBody(req);
    await assertAppCaller(req, { body: body });

    const webhook = resolveWebhook();
    if (!webhook) {
      json(res, 500, { ok: false, error: 'B24_NAV_WEBHOOK / B24_WEBHOOK не задан' });
      return;
    }

    const result = await processVacationDelegation(webhook, { dryRun: false });
    json(res, 200, result);
  } catch (err) {
    const status = err && err.status ? err.status : 500;
    json(res, status, {
      ok: false,
      error: err && err.message ? err.message : String(err),
      code: err && err.code ? err.code : undefined,
    });
  }
};
