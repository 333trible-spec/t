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

const probes = [
  'bizproc.globalvariable.get',
  'bizproc.globalvar.get',
  'bizproc.workflow.globalvariable.get',
  'bizproc.workflow.type.globalvar.get',
];

for (const method of probes) {
  const r = await call(base, method, { ID: 'Variable1784529983017' });
  console.log(method, r.error || JSON.stringify(r.result)?.slice(0, 300));
}

// user search Malyshev
const users = await call(base, 'user.search', { FILTER: { NAME: 'Станислав' }, SELECT: ['ID', 'NAME', 'LAST_NAME'] });
console.log('\nuser.search Станислав', JSON.stringify(users.result?.slice?.(0, 5) || users.error, null, 2));

const u18900 = await call(base, 'user.get', { ID: 18900 });
console.log('\nuser.get 18900', JSON.stringify(u18900.result?.[0] || u18900.error, null, 2));

const t = await call(base, 'bizproc.workflow.template.list', {
  filter: { ID: 2784 },
  select: ['MODIFIED', 'TEMPLATE'],
});
const log2 = t.result?.[0]?.TEMPLATE?.[0]?.Children?.[1]?.Properties;
console.log('\ntemplate 2784 modified', t.result?.[0]?.MODIFIED);
console.log('var log activity', JSON.stringify(log2, null, 2));
