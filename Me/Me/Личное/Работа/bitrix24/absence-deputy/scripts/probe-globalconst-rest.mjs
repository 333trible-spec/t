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

const candidates = [
  'bizproc.globalconstant.set',
  'bizproc.globalconstant.update',
  'bizproc.globalconst.set',
  'bizproc.globalconst.update',
  'bizproc.workflow.type.globalconst.set',
  'bizproc.workflow.type.globalconst.update',
  'bizproc.workflow.type.globalconst.upsert',
  'bizproc.workflow.globalconst.set',
  'bizproc.robot.add',
];

for (const method of candidates) {
  const r = await call(base, method, { ID: 'Constant1726726681045', VALUE: 'user_18900' });
  console.log(method, r.error || 'OK');
}

// methods list if exists
for (const method of ['methods', 'scope']) {
  const r = await call(base, method, method === 'scope' ? {} : { full: false });
  if (r.result && method === 'methods') {
    const hits = r.result.filter((m) => /global|const|GlobalConst/i.test(m));
    console.log('\nmethods matching global/const:', hits);
  } else if (r.result && method === 'scope') {
    const biz = r.result.filter((s) => s.startsWith('bizproc'));
    console.log('\nbizproc scopes sample:', biz.slice(0, 30));
  } else {
    console.log(method, r.error || typeof r.result);
  }
}
