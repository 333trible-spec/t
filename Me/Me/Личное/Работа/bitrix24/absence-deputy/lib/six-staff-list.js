'use strict';

const fs = require('fs');
const path = require('path');
const { b24, toDateOnly, todayISO } = require('./b24');
const { isVacationActiveRange } = require('./vacation-status');

const CONFIG_PATH = path.join(__dirname, '..', 'data', 'six-staff-list.json');
const IBLOCK_TYPE = 'lists';
const LIST_CODE = 'SIX_STAFF_RECORDS';

let cachedConfig = null;

function loadConfigFromDisk() {
  if (cachedConfig) return cachedConfig;
  const envId = process.env.SIX_STAFF_LIST_IBLOCK_ID;
  if (envId && !fs.existsSync(CONFIG_PATH)) {
    cachedConfig = {
      iblockTypeId: IBLOCK_TYPE,
      iblockId: Number(envId),
      iblockCode: LIST_CODE,
      properties: {},
    };
    return cachedConfig;
  }
  try {
    if (!fs.existsSync(CONFIG_PATH)) return null;
    const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    if (!raw || !raw.iblockId) return null;
    cachedConfig = raw;
    return cachedConfig;
  } catch (_) {
    return null;
  }
}

function isConfigured() {
  const cfg = loadConfigFromDisk();
  return !!(cfg && cfg.iblockId && cfg.properties && cfg.properties.recordType);
}

function propKey(cfg, name) {
  const p = cfg.properties[name];
  if (!p) throw new Error('six-staff-list: поле не настроено: ' + name);
  return p.key || ('PROPERTY_' + p.id);
}

function enumId(cfg, fieldName, value) {
  const p = cfg.properties[fieldName];
  if (!p || !p.enum) throw new Error('six-staff-list: enum не настроен: ' + fieldName);
  const id = p.enum[value];
  if (id == null) throw new Error('six-staff-list: неизвестное значение ' + fieldName + '=' + value);
  return String(id);
}

function enumValueById(cfg, fieldName, rawId) {
  const p = cfg.properties[fieldName];
  if (!p || !p.enum) return '';
  const id = String(rawId);
  const keys = Object.keys(p.enum);
  for (let i = 0; i < keys.length; i++) {
    if (String(p.enum[keys[i]]) === id) return keys[i];
  }
  return '';
}

function readProp(element, key) {
  if (!element) return '';
  if (element[key] != null) return element[key];
  const bare = key.replace(/^PROPERTY_/, '');
  if (element['PROPERTY_' + bare] != null) return element['PROPERTY_' + bare];
  return '';
}

function firstScalar(val) {
  if (val == null || val === '') return '';
  if (Array.isArray(val)) return firstScalar(val[0]);
  if (typeof val === 'object') {
    if (val.VALUE != null) return firstScalar(val.VALUE);
    if (val.value != null) return firstScalar(val.value);
    const vals = Object.values(val);
    if (vals.length === 1) return firstScalar(vals[0]);
    if (vals.length > 1) return firstScalar(vals[0]);
  }
  return val;
}

function toB24Date(iso) {
  const d = toDateOnly(iso);
  return d || '';
}

function toB24DateTime(iso) {
  if (!iso) return '';
  const s = String(iso).trim();
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    return s.slice(0, 19).replace('T', ' ');
  }
  return s;
}

function elementToRecord(cfg, element) {
  const id = String(element.ID != null ? element.ID : element.id || '');
  const recordType = enumValueById(cfg, 'recordType', firstScalar(readProp(element, propKey(cfg, 'recordType'))));
  const status = enumValueById(cfg, 'status', firstScalar(readProp(element, propKey(cfg, 'status'))));
  const userId = String(firstScalar(readProp(element, propKey(cfg, 'employeeId'))) || '');
  const userName = String(firstScalar(readProp(element, propKey(cfg, 'employeeName'))) || '');
  const date = toDateOnly(firstScalar(readProp(element, propKey(cfg, 'dateMain'))));
  const dateTo = toDateOnly(firstScalar(readProp(element, propKey(cfg, 'dateTo'))));
  const replacementIdRaw = firstScalar(readProp(element, propKey(cfg, 'replacementId')));
  const replacementId = replacementIdRaw ? String(replacementIdRaw) : null;
  const replacementName = String(firstScalar(readProp(element, propKey(cfg, 'replacementName'))) || '');
  let comment = '';
  if (cfg.properties.comment) {
    comment = String(firstScalar(readProp(element, propKey(cfg, 'comment'))) || '');
  }
  const executedAtRaw = firstScalar(readProp(element, propKey(cfg, 'executedAt')));
  const requestedByRaw = firstScalar(readProp(element, propKey(cfg, 'requestedBy')));
  let meta = null;
  const metaRaw = firstScalar(readProp(element, propKey(cfg, 'metaJson')));
  if (metaRaw) {
    try {
      meta = JSON.parse(String(metaRaw));
    } catch (_) {
      meta = null;
    }
  }

  return {
    id: id,
    elementCode: element.CODE || element.code || '',
    recordType: recordType,
    userId: userId,
    userName: userName,
    date: date,
    dateTo: dateTo,
    replacementId: replacementId,
    replacementName: replacementName,
    comment: comment,
    status: status || 'planned',
    executedAt: executedAtRaw ? String(executedAtRaw) : null,
    requestedBy: requestedByRaw ? String(requestedByRaw) : null,
    meta: meta,
    createdAt: element.DATE_CREATE || null,
  };
}

function formatReplacementName(record) {
  const name = String(
    record.replacementName || (record.meta && record.meta.deputyName) || ''
  ).trim();
  return name || '—';
}

function recordToFields(cfg, record) {
  const fields = {
    NAME: record.name || record.title || ('Запись #' + (record.id || '')),
  };
  fields[propKey(cfg, 'recordType')] = enumId(cfg, 'recordType', record.recordType);
  fields[propKey(cfg, 'status')] = enumId(cfg, 'status', record.status || 'planned');
  if (record.userId) fields[propKey(cfg, 'employeeId')] = Number(record.userId);
  if (record.userName) fields[propKey(cfg, 'employeeName')] = record.userName;
  if (record.date) fields[propKey(cfg, 'dateMain')] = toB24Date(record.date);
  if (record.dateTo) fields[propKey(cfg, 'dateTo')] = toB24Date(record.dateTo);
  if (record.replacementId) fields[propKey(cfg, 'replacementId')] = Number(record.replacementId);
  fields[propKey(cfg, 'replacementName')] = formatReplacementName(record);
  if (record.comment != null && cfg.properties.comment) {
    fields[propKey(cfg, 'comment')] = String(record.comment);
  }
  if (record.executedAt) fields[propKey(cfg, 'executedAt')] = toB24DateTime(record.executedAt);
  if (record.requestedBy) fields[propKey(cfg, 'requestedBy')] = Number(record.requestedBy);
  if (record.meta != null) {
    fields[propKey(cfg, 'metaJson')] = JSON.stringify(record.meta);
  } else if (Object.prototype.hasOwnProperty.call(record, 'meta') && cfg.properties.metaJson) {
    fields[propKey(cfg, 'metaJson')] = '';
  }
  return fields;
}

function makeElementCode(recordType) {
  return (
    'ss_' +
    String(recordType || 'rec') +
    '_' +
    Date.now().toString(36) +
    '_' +
    Math.random().toString(36).slice(2, 8)
  );
}

async function fetchElements(webhook, cfg, filter) {
  const all = [];
  let start = 0;
  for (;;) {
    const data = await b24(webhook, 'lists.element.get', {
      IBLOCK_TYPE_ID: cfg.iblockTypeId || IBLOCK_TYPE,
      IBLOCK_ID: cfg.iblockId,
      FILTER: filter || {},
      start: start,
    });
    let rows = data.result;
    if (!rows) rows = [];
    if (!Array.isArray(rows)) rows = [rows];
    all.push.apply(all, rows);
    if (data.next == null) break;
    start = data.next;
  }
  return all;
}

async function addRecord(webhook, record) {
  const cfg = loadConfigFromDisk();
  if (!cfg) throw new Error('Универсальный список не настроен — запустите scripts/setup-six-staff-list.mjs');

  const elementCode = record.elementCode || makeElementCode(record.recordType);
  const title =
    record.name ||
    (record.recordType === 'vacation'
      ? 'Отпуск: ' + (record.userName || record.userId)
      : 'Увольнение: ' + (record.userName || record.userId));

  const payload = Object.assign({}, record, { name: title });
  const fields = recordToFields(cfg, payload);

  const data = await b24(webhook, 'lists.element.add', {
    IBLOCK_TYPE_ID: cfg.iblockTypeId || IBLOCK_TYPE,
    IBLOCK_ID: cfg.iblockId,
    ELEMENT_CODE: elementCode,
    FIELDS: fields,
  });

  const elementId = String(data.result);
  return Object.assign({}, record, {
    id: elementId,
    elementCode: elementCode,
    name: title,
  });
}

async function updateRecord(webhook, elementId, patch) {
  const cfg = loadConfigFromDisk();
  if (!cfg) throw new Error('Универсальный список не настроен');

  const existing = await getRecord(webhook, elementId);
  if (!existing) throw new Error('Элемент списка ' + elementId + ' не найден');

  const merged = Object.assign({}, existing, patch);
  const fields = recordToFields(cfg, merged);

  await b24(webhook, 'lists.element.update', {
    IBLOCK_TYPE_ID: cfg.iblockTypeId || IBLOCK_TYPE,
    IBLOCK_ID: cfg.iblockId,
    ELEMENT_ID: Number(elementId),
    FIELDS: fields,
  });

  return getRecord(webhook, elementId);
}

async function getRecord(webhook, elementId) {
  const cfg = loadConfigFromDisk();
  if (!cfg) return null;

  const data = await b24(webhook, 'lists.element.get', {
    IBLOCK_TYPE_ID: cfg.iblockTypeId || IBLOCK_TYPE,
    IBLOCK_ID: cfg.iblockId,
    ELEMENT_ID: Number(elementId),
  });
  let row = data.result;
  if (!row) return null;
  if (Array.isArray(row)) row = row[0];
  return elementToRecord(cfg, row);
}

async function listRecords(webhook, options) {
  const cfg = loadConfigFromDisk();
  if (!cfg) return [];

  const opts = options || {};
  const filter = {};
  if (opts.recordType) {
    filter[propKey(cfg, 'recordType')] = enumId(cfg, 'recordType', opts.recordType);
  }
  if (opts.status) {
    filter[propKey(cfg, 'status')] = enumId(cfg, 'status', opts.status);
  }

  const rows = await fetchElements(webhook, cfg, filter);
  let records = rows.map(function (row) {
    return elementToRecord(cfg, row);
  });

  if (opts.recordType && !opts.status) {
    records = records.filter(function (r) {
      return r.recordType === opts.recordType;
    });
  }

  records.sort(function (a, b) {
    const da = a.createdAt || a.date || '';
    const db = b.createdAt || b.date || '';
    return db > da ? 1 : db < da ? -1 : Number(b.id) - Number(a.id);
  });

  const limit = opts.limit == null ? 50 : opts.limit;
  return records.slice(0, limit);
}

async function listDueDismissals(webhook, today) {
  const t = today || todayISO();
  const rows = await listRecords(webhook, {
    recordType: 'dismissal',
    limit: 100,
  });
  return rows.filter(function (r) {
    const dueStatus = r.status === 'planned' || r.status === 'error';
    return dueStatus && r.date && r.date <= t;
  });
}

/** Активный отпуск: день «С» включительно, день «До» уже без подмены (dateTo exclusive). */
function isVacationActive(record, today) {
  const t = today || todayISO();
  if (!record || record.recordType !== 'vacation') return false;
  if (record.status === 'cancelled' || record.status === 'done') return false;
  if (!record.userId || !record.replacementId) return false;
  return isVacationActiveRange(record.date, record.dateTo, t);
}

async function listActiveVacations(webhook, today) {
  const rows = await listRecords(webhook, {
    recordType: 'vacation',
    limit: 100,
  });
  return rows.filter(function (r) {
    return isVacationActive(r, today);
  });
}

module.exports = {
  CONFIG_PATH,
  LIST_CODE,
  IBLOCK_TYPE,
  loadConfigFromDisk,
  isConfigured,
  addRecord,
  updateRecord,
  getRecord,
  listRecords,
  listDueDismissals,
  listActiveVacations,
  isVacationActive,
  elementToRecord,
  makeElementCode,
};
