'use strict';

const plansStore = require('./plans-store');
const sixStaffList = require('./six-staff-list');

function usesList(webhook) {
  return !!(webhook && sixStaffList.isConfigured());
}

function isStorageAvailable(webhook) {
  if (usesList(webhook)) return true;
  return plansStore.isStorageAvailable();
}

function storageMode(webhook) {
  if (usesList(webhook)) return 'lists';
  return plansStore.storageMode();
}

function requireStorage(webhook) {
  if (usesList(webhook)) return;
  if (plansStore.isStorageAvailable()) return;
  throw new Error(
    'Хранилище не настроено: создайте универсальный список (scripts/setup-six-staff-list.mjs, scope lists) ' +
      'или подключите Redis на VibeCode. «Уволить сейчас» работает без хранилища.'
  );
}

function planFromRecord(record) {
  if (!record) return null;
  return {
    id: String(record.id),
    userId: String(record.userId || ''),
    userName: String(record.userName || ''),
    date: String(record.date || ''),
    replacementId: record.replacementId ? String(record.replacementId) : null,
    replacementName: record.replacementName || (record.meta && record.meta.deputyName) || '',
    comment: record.comment != null ? String(record.comment) : '',
    status: String(record.status || 'planned'),
    createdAt: record.createdAt || new Date().toISOString(),
    executedAt: record.executedAt || null,
    requestedBy: record.requestedBy ? String(record.requestedBy) : null,
    recordType: record.recordType || 'dismissal',
    dateTo: record.dateTo || '',
    meta: record.meta || null,
  };
}

async function addPlan(webhook, fields) {
  const recordType = fields.recordType || 'dismissal';
  if (usesList(webhook)) {
    const record = await sixStaffList.addRecord(webhook, {
      recordType: recordType,
      userId: fields.userId,
      userName: fields.userName,
      date: fields.date,
      dateTo: fields.dateTo || '',
      replacementId: fields.replacementId,
      replacementName: fields.replacementName || '',
      status: fields.status || 'planned',
      comment: fields.comment != null ? String(fields.comment) : '',
      executedAt: fields.executedAt || null,
      requestedBy: fields.requestedBy,
      meta: fields.meta || null,
    });
    return planFromRecord(record);
  }

  return plansStore.addPlan(fields);
}

async function getPlan(webhook, planId) {
  if (usesList(webhook)) {
    const record = await sixStaffList.getRecord(webhook, planId);
    return planFromRecord(record);
  }
  return plansStore.getPlan(planId);
}

async function updatePlan(webhook, planId, patch) {
  if (usesList(webhook)) {
    const record = await sixStaffList.updateRecord(webhook, planId, patch);
    return planFromRecord(record);
  }
  return plansStore.updatePlan(planId, patch);
}

async function listPlans(webhook, options) {
  const opts = options || {};
  if (usesList(webhook)) {
    const records = await sixStaffList.listRecords(webhook, {
      recordType: opts.recordType || 'dismissal',
      limit: opts.limit == null ? plansStore.LIMIT : opts.limit,
    });
    return records.map(planFromRecord);
  }
  return plansStore.listPlans(opts.limit);
}

async function listDuePlans(webhook, today) {
  if (usesList(webhook)) {
    const records = await sixStaffList.listDueDismissals(webhook, today);
    return records.map(planFromRecord);
  }
  return plansStore.listDuePlans(today);
}

module.exports = {
  LIMIT: plansStore.LIMIT,
  usesList,
  isStorageAvailable,
  storageMode,
  requireStorage,
  addPlan,
  getPlan,
  updatePlan,
  listPlans,
  listDuePlans,
  planFromRecord,
};
