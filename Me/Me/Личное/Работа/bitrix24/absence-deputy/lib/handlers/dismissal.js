'use strict';

const {
  resolveWebhook,
  asUserId,
  json,
  readJsonBody,
} = require('../b24');

const {
  executeDismissal,
  scheduleDismissal,
  cancelScheduledDismissal,
} = require('../dismissal-core');

const { getUserById, formatUserProfile } = require('../user-lookup');
const { assertAppCaller } = require('../app-auth');

module.exports = async function handler(req, res) {
  try {
    const method = String((req && req.method) || 'GET').toUpperCase();
    const q = req.query || {};

    if (method === 'GET' && String(q.action || '').toLowerCase() === 'lookup') {
      await assertAppCaller(req, { query: q });
      const webhook = resolveWebhook();
      if (!webhook) {
        json(res, 500, { ok: false, error: 'B24_NAV_WEBHOOK / B24_WEBHOOK не задан' });
        return;
      }
      const id = asUserId(q.id);
      if (!id) {
        json(res, 400, { ok: false, error: 'id обязателен' });
        return;
      }
      const user = await getUserById(webhook, id);
      if (!user) {
        json(res, 404, { ok: false, error: 'Пользователь ' + id + ' не найден' });
        return;
      }
      json(res, 200, { ok: true, user: formatUserProfile(user) });
      return;
    }

    if (method !== 'POST') {
      json(res, 405, { ok: false, error: 'Method not allowed' });
      return;
    }

    const webhook = resolveWebhook();
    if (!webhook) {
      json(res, 500, { ok: false, error: 'B24_NAV_WEBHOOK / B24_WEBHOOK не задан' });
      return;
    }

    const body = await readJsonBody(req);
    const callerId = await assertAppCaller(req, { body: body });
    body.requestedBy = callerId;

    const action = String(body.action || '').trim().toLowerCase();
    let result;

    if (action === 'execute') {
      result = await executeDismissal(webhook, body);
    } else if (action === 'schedule') {
      result = await scheduleDismissal(webhook, body);
    } else if (action === 'cancel') {
      result = await cancelScheduledDismissal(webhook, body.planId);
    } else {
      json(res, 400, { ok: false, error: 'action: execute | schedule | cancel' });
      return;
    }

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
