'use strict';

import fs from 'fs';
import path from 'path';

const envPath =
  process.argv[2] ||
  'c:/Users/mitkinMV/Desktop/Курсор работа/Me/Me/Личное/Работа/bitrix24/.env';

function loadWebhook() {
  const txt = fs.readFileSync(envPath, 'utf8');
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^\s*(B24_NAV_WEBHOOK|B24_WEBHOOK)\s*=\s*(.+)\s*$/);
    if (m) return m[2].trim().replace(/^["']|["']$/g, '');
  }
  return '';
}

function maskWebhook(url) {
  return url.replace(/(\/rest\/\d+\/)[^/]+(\/)/, '$1***$2');
}

async function call(base, method, params = {}) {
  const res = await fetch(base + method, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return res.json();
}

const wh = loadWebhook();
if (!wh) {
  console.error('NO_WEBHOOK in', envPath);
  process.exit(1);
}

const base = wh.endsWith('/') ? wh : wh + '/';
console.log('webhook', maskWebhook(base));

const info = await call(base, 'app.info');
if (info.error) {
  console.log('app.info ERROR', info.error, info.error_description || '');
} else {
  const r = info.result || {};
  console.log('app.info OK');
  console.log('  SCOPE', r.SCOPE);
  console.log('  LICENSE', r.LICENSE);
  const scopes = String(r.SCOPE || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  console.log('  has bizproc', scopes.includes('bizproc'));
  console.log('  has crm', scopes.includes('crm'));
  console.log('  has user', scopes.includes('user'));
}

const tests = [
  ['user.current', {}],
  ['crm.item.list', { entityTypeId: 136, filter: { categoryId: 16 }, select: ['id'], order: { id: 'DESC' }, start: 0 }],
  ['bizproc.workflow.template.list', { select: ['ID', 'NAME', 'DOCUMENT_TYPE'], order: { ID: 'DESC' }, start: 0 }],
  ['bizproc.workflow.instances', { select: ['ID'], start: 0 }],
  ['bizproc.task.list', { filter: { STATUS: 0 }, select: ['ID', 'USER_ID', 'NAME'], start: 0 }],
];

for (const [method, params] of tests) {
  const r = await call(base, method, params);
  if (r.error) {
    console.log(method, 'DENIED', r.error, (r.error_description || '').slice(0, 160));
  } else {
    const res = r.result;
    const count = Array.isArray(res) ? res.length : res ? 'object' : 'empty';
    console.log(method, 'OK', 'count=' + count);
    if (method === 'bizproc.workflow.template.list' && Array.isArray(res) && res[0]) {
      console.log('  latest template', res[0].ID, res[0].NAME);
    }
  }
}

const t2784 = await call(base, 'bizproc.workflow.template.list', {
  filter: { ID: 2784 },
  select: ['ID', 'NAME', 'DOCUMENT_TYPE', 'AUTO_EXECUTE'],
});
if (t2784.error) {
  console.log('template 2784', t2784.error);
} else {
  console.log('template 2784', JSON.stringify(t2784.result, null, 2));
}
