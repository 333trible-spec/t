'use strict';

import fs from 'fs';

const envPath =
  'c:/Users/mitkinMV/Desktop/Курсор работа/Me/Me/Личное/Работа/bitrix24/.env';

function loadWebhook() {
  const txt = fs.readFileSync(envPath, 'utf8');
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^\s*(B24_NAV_WEBHOOK|B24_WEBHOOK)\s*=\s*(.+)\s*$/);
    if (m) return m[2].trim().replace(/^["']|["']$/g, '');
  }
  return '';
}

async function call(base, method, params = {}) {
  const res = await fetch(base + method, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return res.json();
}

const base = (loadWebhook().endsWith('/') ? loadWebhook() : loadWebhook() + '/');

const fields = [
  'ID', 'NAME', 'DESCRIPTION', 'AUTO_EXECUTE', 'DOCUMENT_TYPE', 'PARAMETERS',
  'VARIABLES', 'CONSTANTS', 'MODIFIED', 'USER_ID', 'USER_NAME', 'SYSTEM_CODE',
  'TEMPLATE', 'TEMPLATE_DATA', 'ACTIVE', 'IS_SYSTEM', 'SORT', 'MODULE_ID',
  'ENTITY', 'DOCUMENT_STATUS', 'TYPE', 'SETTINGS'
];

const list = await call(base, 'bizproc.workflow.template.list', {
  filter: { ID: 2784 },
  select: fields,
});
console.log('template list fields', JSON.stringify(list.result, null, 2));

const trackingMethods = [
  ['bizproc.workflow.status', { ID: 'test' }],
  ['bizproc.workflow.get', { ID: 'test' }],
  ['bizproc.workflow.instances', { select: ['ID', 'TEMPLATE_ID', 'STATUS', 'MODULE_ID', 'ENTITY', 'DOCUMENT_ID', 'STARTED', 'FINISHED'], order: { ID: 'DESC' }, start: 0 }],
];

for (const [m, p] of trackingMethods) {
  const r = await call(base, m, p);
  console.log('\n', m, r.error ? r.error : 'OK sample=' + JSON.stringify(Array.isArray(r.result) ? r.result[0] : r.result)?.slice(0, 300));
}

// Start test workflow on latest deal (template is named TЕСТОВЫЙ)
const dealId = process.argv[2] || '492950';
const start = await call(base, 'bizproc.workflow.start', {
  TEMPLATE_ID: 2784,
  DOCUMENT_ID: ['crm', 'CCrmDocumentDeal', 'DEAL_' + dealId],
  PARAMETERS: {},
});
console.log('\nworkflow.start deal', dealId, JSON.stringify(start, null, 2));

if (start.result) {
  const wfId = start.result;
  await new Promise((r) => setTimeout(r, 2000));
  for (const method of ['bizproc.workflow.status', 'bizproc.workflow.get', 'bizproc.workflow.instances']) {
    const r = await call(base, method, method.includes('instances')
      ? { select: ['ID', 'STATUS', 'TEMPLATE_ID', 'DOCUMENT_ID'], filter: { ID: wfId }, start: 0 }
      : { ID: wfId });
    console.log('after start', method, JSON.stringify(r, null, 2).slice(0, 1500));
  }
}
