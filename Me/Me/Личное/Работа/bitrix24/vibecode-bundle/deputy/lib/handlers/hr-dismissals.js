'use strict';

const {
  resolveWebhook,
  asUserId,
  isUserActive,
  userDisplayName,
  b24,
  json,
} = require('../b24');

const {
  planDisplayStatus,
  isPlanCancellable,
  getUser,
} = require('../dismissal-core');

const recordsStore = require('../records-store');
const { assertAppCaller } = require('../app-auth');

async function resolveUsers(webhook, ids) {
  const map = {};
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (!unique.length) return map;

  const CHUNK = 40;
  for (let i = 0; i < unique.length; i += CHUNK) {
    const chunk = unique.slice(i, i + CHUNK);
    const cmd = {};
    chunk.forEach(function (id, idx) {
      cmd['u' + idx] = 'user.get?ID=' + encodeURIComponent(id);
    });
    const data = await b24(webhook, 'batch', { halt: 0, cmd: cmd });
    const result = (data.result && data.result.result) || {};
    chunk.forEach(function (id, idx) {
      const key = 'u' + idx;
      let user = result[key];
      if (Array.isArray(user)) user = user[0];
      if (user) {
        const uid = String(user.ID != null ? user.ID : user.id || id);
        map[uid] = {
          id: uid,
          name: userDisplayName(user) || ('Сотрудник ' + uid),
          active: isUserActive(user),
        };
      }
    });
  }

  for (let j = 0; j < unique.length; j++) {
    const id = unique[j];
    if (map[String(id)]) continue;
    try {
      const user = await getUser(webhook, id);
      if (user) {
        map[String(id)] = {
          id: String(id),
          name: userDisplayName(user) || ('Сотрудник ' + id),
          active: isUserActive(user),
        };
      }
    } catch (_) {
      map[String(id)] = {
        id: String(id),
        name: 'Сотрудник ' + id,
        active: false,
      };
    }
  }

  return map;
}

module.exports = async function handler(req, res) {
  try {
    const method = String((req && req.method) || 'GET').toUpperCase();
    if (method !== 'GET') {
      json(res, 405, { ok: false, error: 'Method not allowed' });
      return;
    }

    await assertAppCaller(req, { query: req.query || {} });

    const webhook = resolveWebhook();
    if (!webhook) {
      json(res, 500, {
        ok: false,
        error: 'B24_NAV_WEBHOOK / B24_WEBHOOK не задан',
      });
      return;
    }

    const plans = await recordsStore.listPlans(webhook, { recordType: 'dismissal' });
    const userIds = plans.map(function (plan) {
      return asUserId(plan.userId);
    });
    const users = await resolveUsers(webhook, userIds);

    const out = plans.map(function (plan) {
      const empId = asUserId(plan.userId);
      const employee = empId
        ? users[empId] || {
            id: empId,
            name: plan.userName || ('Сотрудник ' + empId),
            active: false,
          }
        : { id: '', name: plan.userName || '—', active: false };
      const userActive = employee.active !== false;
      return {
        id: plan.id,
        employee: {
          id: employee.id,
          name: employee.name || plan.userName,
        },
        date: plan.date,
        status: planDisplayStatus(plan, userActive),
        active: userActive,
        cancellable: isPlanCancellable(plan, userActive),
      };
    });

    json(res, 200, {
      ok: true,
      items: out,
      total: out.length,
      storageAvailable: recordsStore.isStorageAvailable(webhook),
      storageMode: recordsStore.storageMode(webhook),
    });
  } catch (err) {
    const status = err && err.status ? err.status : 500;
    json(res, status, {
      ok: false,
      error: err && err.message ? err.message : String(err),
    });
  }
};
