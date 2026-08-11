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
const dealId = process.argv[2] || '490388';

const methods = [
  ['crm.timeline.comment.list', { filter: { ENTITY_ID: dealId, ENTITY_TYPE: 'deal' }, order: { ID: 'DESC' }, start: 0 }],
  ['crm.timeline.logmessage.list', { filter: { ENTITY_ID: dealId, ENTITY_TYPE: 'deal' }, order: { ID: 'DESC' }, start: 0 }],
  ['crm.timeline.note.list', { filter: { ENTITY_ID: dealId, ENTITY_TYPE: 'deal' }, order: { ID: 'DESC' }, start: 0 }],
  ['bizproc.workflow.instances', {
    select: ['ID', 'TEMPLATE_ID', 'DOCUMENT_ID', 'STATUS', 'STARTED', 'FINISHED'],
    filter: { MODULE_ID: 'crm', ENTITY: 'CCrmDocumentDeal', DOCUMENT_ID: 'DEAL_' + dealId },
    order: { STARTED: 'DESC' },
    start: 0,
  }],
  ['bizproc.activity.log', { WORKFLOW_ID: '6a5dc52a172127.23929807' }],
];

for (const [method, params] of methods) {
  const r = await call(base, method, params);
  console.log('\n===', method, '===');
  if (r.error) console.log('ERROR', r.error, r.error_description || '');
  else console.log(JSON.stringify(r.result, null, 2).slice(0, 2500));
}
