'use strict';

const {
  resolveWebhook,
  asUserId,
  toDateOnly,
  userDisplayName,
  b24,
  json,
  readJsonBody,
} = require('../b24');

const recordsStore = require('../records-store');
const { getUser } = require('../dismissal-core');
const { computeVacationUiStatus } = require('../vacation-status');
const { assertAppCaller } = require('../app-auth');

const ENTITY_TYPE_ID = 136;
const CATEGORY_ID = 16;
const STAGE_ID = 'DT136_16:UC_QBGMFU';

const FIELD_EMPLOYEE = 'ufCrm10_1698320343';
const FIELD_FROM = 'ufCrm10_1698320722';
const FIELD_TO = 'ufCrm10_1698320758';
const FIELD_DEPUTY = 'ufCrm10_1698320792';

function computeStatus(dateFrom, dateTo) {
  return computeVacationUiStatus(dateFrom, dateTo);
}

async function listVacationItems(webhook) {
  const items = [];
  let start = 0;
  let total = 0;
  for (;;) {
    const data = await b24(webhook, 'crm.item.list', {
      entityTypeId: ENTITY_TYPE_ID,
      select: ['id', FIELD_EMPLOYEE, FIELD_FROM, FIELD_TO, FIELD_DEPUTY],
      filter: {
        categoryId: CATEGORY_ID,
        stageId: STAGE_ID,
      },
      start: start,
    });
    const page = (data.result && data.result.items) || [];
    if (typeof data.total === 'number') total = data.total;
    items.push.apply(items, page);
    if (data.next == null) break;
    start = data.next;
  }
  if (!total) total = items.length;
  return { items: items, total: total };
}

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
    Object.keys(result).forEach(function (key) {
      let user = result[key];
      if (Array.isArray(user)) user = user[0];
      if (!user) return;
      const id = String(user.ID != null ? user.ID : user.id || '');
      if (!id) return;
      map[id] = { id: id, name: userDisplayName(user) || ('Сотрудник ' + id) };
    });
  }
  return map;
}

function mapVacationDelegation(plan, uiStatus) {
  if (uiStatus !== 'active') return null;

  const report = plan.meta && plan.meta.delegationReport;
  const comment = plan.comment != null ? String(plan.comment).trim() : '';

  if (!report && !comment) return null;

  const ok = report ? !!report.ok : comment === 'ок';
  return {
    ok: ok,
    comment: comment || (ok ? 'ок' : ''),
    checkedAt: (report && report.checkedAt) || null,
    employeeOpenCount: report && report.employeeOpenCount != null ? report.employeeOpenCount : null,
    deputyOpenCount: report && report.deputyOpenCount != null ? report.deputyOpenCount : null,
    stuckTasks: (report && report.stuckTasks) || [],
  };
}

function mapVacationPlan(p) {
  const uiStatus = computeStatus(p.date, p.dateTo);
  return {
    id: p.id,
    employee: { id: p.userId, name: p.userName },
    deputy: p.replacementId
      ? {
          id: p.replacementId,
          name: (p.meta && p.meta.deputyName) || p.replacementName || '',
        }
      : null,
    dateFrom: p.date,
    dateTo: p.dateTo,
    status: uiStatus,
    delegation: mapVacationDelegation(p, uiStatus),
  };
}

async function listFromUniversalList(webhook) {
  const plans = await recordsStore.listPlans(webhook, { recordType: 'vacation', limit: 50 });
  return plans
    .filter(function (p) {
      return p.status !== 'cancelled';
    })
    .map(mapVacationPlan)
    .filter(function (row) {
      return row.status !== 'returned';
    });
}

async function handlePost(webhook, req, res) {
  recordsStore.requireStorage(webhook);
  const body = await readJsonBody(req);
  const callerId = await assertAppCaller(req, { body: body });

  const userId = asUserId(body.userId);
  const deputyId = asUserId(body.deputyId || body.replacementId);
  const dateFrom = toDateOnly(body.dateFrom || body.from);
  const dateTo = toDateOnly(body.dateTo || body.to);
  if (!userId) throw new Error('userId обязателен');
  if (!deputyId) throw new Error('deputyId обязателен');
  if (userId === deputyId) throw new Error('Заместитель не может совпадать с сотрудником');
  if (!dateFrom || !dateTo) throw new Error('dateFrom и dateTo обязательны');
  if (dateTo <= dateFrom) throw new Error('Дата «До» должна быть позже «С»');

  const user = await getUser(webhook, userId);
  if (!user) throw new Error('Сотрудник не найден');

  let deputyName = body.deputyName || '';
  if (!deputyName) {
    const dep = await getUser(webhook, deputyId);
    deputyName = dep ? userDisplayName(dep) : '';
  }

  const uiStatus = computeVacationUiStatus(dateFrom, dateTo);
  const plan = await recordsStore.addPlan(webhook, {
    recordType: 'vacation',
    userId: userId,
    userName: userDisplayName(user) || body.userName,
    date: dateFrom,
    dateTo: dateTo,
    replacementId: deputyId,
    replacementName: deputyName,
    status: 'planned',
    requestedBy: callerId,
    meta: {
      deputyName: deputyName,
      roles: body.roles || [],
      uiStatus: uiStatus,
    },
  });

  json(res, 200, { ok: true, plan: plan });
}

module.exports = async function handler(req, res) {
  try {
    const method = String((req && req.method) || 'GET').toUpperCase();
    const webhook = resolveWebhook();
    if (!webhook) {
      json(res, 500, {
        ok: false,
        error: 'B24_NAV_WEBHOOK / B24_WEBHOOK не задан',
      });
      return;
    }

    if (method === 'POST') {
      await handlePost(webhook, req, res);
      return;
    }

    if (method !== 'GET') {
      json(res, 405, { ok: false, error: 'Method not allowed' });
      return;
    }

    await assertAppCaller(req, { query: req.query || {} });

    if (recordsStore.usesList(webhook)) {
      const out = await listFromUniversalList(webhook);
      json(res, 200, {
        ok: true,
        items: out,
        total: out.length,
        source: 'lists',
        storageMode: recordsStore.storageMode(webhook),
        storageAvailable: recordsStore.isStorageAvailable(webhook),
      });
      return;
    }

    const listed = await listVacationItems(webhook);
    const userIds = [];
    listed.items.forEach(function (item) {
      const emp = asUserId(item[FIELD_EMPLOYEE]);
      const dep = asUserId(item[FIELD_DEPUTY]);
      if (emp) userIds.push(emp);
      if (dep) userIds.push(dep);
    });

    const users = await resolveUsers(webhook, userIds);

    const out = listed.items
      .map(function (item) {
        const empId = asUserId(item[FIELD_EMPLOYEE]);
        const depId = asUserId(item[FIELD_DEPUTY]);
        const dateFrom = toDateOnly(item[FIELD_FROM]);
        const dateTo = toDateOnly(item[FIELD_TO]);
        const employee = empId
          ? users[empId] || { id: empId, name: 'Сотрудник ' + empId }
          : { id: '', name: '—' };
        const deputy = depId
          ? users[depId] || { id: depId, name: 'Сотрудник ' + depId }
          : null;
        return {
          id: String(item.id != null ? item.id : ''),
          employee: employee,
          deputy: deputy,
          dateFrom: dateFrom,
          dateTo: dateTo,
          status: computeStatus(dateFrom, dateTo),
        };
      })
      .filter(function (row) {
        return row.status !== 'returned';
      });

    json(res, 200, { ok: true, items: out, total: out.length, source: 'hr-crm' });
  } catch (err) {
    const status = err && err.status ? err.status : 500;
    json(res, status, {
      ok: false,
      error: err && err.message ? err.message : String(err),
    });
  }
};
