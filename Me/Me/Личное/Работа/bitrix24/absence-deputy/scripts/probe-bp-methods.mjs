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

const base = (loadWebhook().endsWith('/') ? loadWebhook() : loadWebhook() + '/') ;

const probeMethods = [
  'bizproc.activity.log',
  'bizproc.workflow.template.export',
  'bizproc.workflow.template.download',
  'bizproc.workflow.template.get',
  'bizproc.workflow.template.list',
];

for (const method of probeMethods) {
  const r = await call(base, method, method.includes('list') ? { filter: { ID: 2784 } } : { ID: 2784 });
  console.log(method, r.error ? r.error : 'OK');
}

// Find a recent deal for dry-run start test
const deals = await call(base, 'crm.deal.list', {
  select: ['ID', 'TITLE'],
  order: { ID: 'DESC' },
  start: 0,
  filter: {},
});
console.log('\nlatest deals', JSON.stringify(deals.result?.slice?.(0, 3) || deals.error, null, 2));

// Check running/completed workflows on template 2784
const inst = await call(base, 'bizproc.workflow.instances', {
  select: ['ID', 'TEMPLATE_ID', 'STARTED', 'STATUS', 'DOCUMENT_ID'],
  filter: { TEMPLATE_ID: 2784 },
  order: { ID: 'DESC' },
  start: 0,
});
console.log('\ninstances template 2784', JSON.stringify(inst.result?.slice?.(0, 5) || inst.error, null, 2));
