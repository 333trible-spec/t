'use strict';

/**
 * Роботы и триггеры CRM: смарт-процесс entityTypeId + categoryId.
 * Usage: node scripts/probe-crm-robots.mjs [entityTypeId] [categoryId]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '..', '.env');
const entityTypeId = Number(process.argv[2]) || 153;
const categoryId = Number(process.argv[3]) || 68;

function loadWebhook() {
  if (process.env.B24_NAV_WEBHOOK) return process.env.B24_NAV_WEBHOOK;
  if (process.env.B24_WEBHOOK) return process.env.B24_WEBHOOK;
  const txt = fs.readFileSync(envPath, 'utf8');
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^\s*(B24_NAV_WEBHOOK|B24_WEBHOOK)\s*=\s*(.+)\s*$/);
    if (m) return m[2].trim().replace(/^["']|["']$/g, '');
  }
  return '';
}

async function call(base, method, params) {
  const res = await fetch(base + method, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params || {}),
  });
  return res.json();
}

function tryMethod(name, data) {
  if (data.error) return { ok: false, error: data.error, desc: data.error_description || '' };
  return { ok: true, data: data.result, total: data.total };
}

const wh = loadWebhook();
if (!wh) {
  console.error('NO_WEBHOOK');
  process.exit(1);
}
const base = wh.endsWith('/') ? wh : wh + '/';
const portal = base.match(/^(https?:\/\/[^/]+)/)[1];

console.log('entityTypeId', entityTypeId, 'categoryId', categoryId);
console.log('kanban', portal + '/page/proektnaya_rabota/proekt_izmeneniya_v_proekte/type/' + entityTypeId + '/kanban/category/' + categoryId + '/');
console.log('automation designer', portal + '/crm/configs/automation/DYNAMIC_' + entityTypeId + '/category/' + categoryId + '/');
console.log('');

const typeInfo = await call(base, 'crm.type.getByEntityTypeId', { entityTypeId: entityTypeId });
if (typeInfo.error) {
  console.error('crm.type.getByEntityTypeId', typeInfo.error, typeInfo.error_description);
  process.exit(1);
}
const sp = typeInfo.result.type || typeInfo.result;
console.log('Smart process:', sp.title || sp.name, '(id', sp.id + ', entityTypeId', entityTypeId + ')');
console.log('  automation:', sp.isAutomationEnabled, 'bizproc:', sp.isBizProcEnabled);
console.log('');

const cat = await call(base, 'crm.category.get', { entityTypeId: entityTypeId, id: categoryId });
if (cat.error) {
  console.error('crm.category.get', cat.error, cat.error_description);
} else {
  const c = cat.result.category || cat.result;
  console.log('Category', categoryId + ':', c.name || c.NAME);
}
console.log('');

const entityId = 'DYNAMIC_' + entityTypeId + '_STAGE_' + categoryId;
const stages = await call(base, 'crm.status.list', {
  filter: { ENTITY_ID: entityId },
  order: { SORT: 'ASC' },
});
if (stages.error) {
  console.error('crm.status.list', stages.error, stages.error_description);
} else {
  const rows = Array.isArray(stages.result) ? stages.result : [];
  console.log('Stages (' + rows.length + '):');
  rows.forEach(function (s, i) {
    console.log(
      '  ' +
        (i + 1) +
        '. [' +
        s.STATUS_ID +
        '] ' +
        s.NAME +
        (s.SEMANTICS ? ' (' + s.SEMANTICS + ')' : '')
    );
  });
}
console.log('');

const probeMethods = [
  ['crm.automation.trigger.list', {}],
  ['bizproc.robot.list', {}],
  [
    'bizproc.workflow.template.list',
    {
      select: ['ID', 'NAME', 'AUTO_EXECUTE', 'DOCUMENT_TYPE', 'MODULE_ID', 'ENTITY'],
      filter: {
        MODULE_ID: 'crm',
        DOCUMENT_TYPE: 'DYNAMIC_' + entityTypeId,
      },
      order: { ID: 'DESC' },
      start: 0,
    },
  ],
  [
    'bizproc.workflow.template.list',
    {
      select: ['ID', 'NAME', 'AUTO_EXECUTE', 'DOCUMENT_TYPE'],
      filter: { DOCUMENT_TYPE: 'DYNAMIC_' + entityTypeId },
      order: { ID: 'DESC' },
      start: 0,
    },
  ],
];

console.log('=== REST probe ===');
for (const [method, params] of probeMethods) {
  const r = tryMethod(method, await call(base, method, params));
  if (!r.ok) {
    console.log(method, '→', r.error, (r.desc || '').slice(0, 120));
    continue;
  }
  const rows = Array.isArray(r.data) ? r.data : r.data ? [r.data] : [];
  console.log(method, '→ OK, count=' + rows.length);
  rows.slice(0, 15).forEach(function (row) {
    console.log('  ', JSON.stringify(row));
  });
  if (rows.length > 15) console.log('  ... +' + (rows.length - 15) + ' more');
}
console.log('');

console.log('Note: встроенные роботы стадий CRM часто НЕ отдаются публичным REST.');
console.log('Смотреть в UI: Роботы на стадии →', portal + '/crm/configs/automation/DYNAMIC_' + entityTypeId + '/category/' + categoryId + '/');
