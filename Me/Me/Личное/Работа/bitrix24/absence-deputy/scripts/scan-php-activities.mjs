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

const base = loadWebhook().endsWith('/') ? loadWebhook() : loadWebhook() + '/';
const types = new Set();
let start = 0;

while (true) {
  const page = await call(base, 'bizproc.workflow.template.list', {
    select: ['ID', 'NAME', 'TEMPLATE'],
    start,
  });
  for (const t of page.result || []) {
    const s = JSON.stringify(t.TEMPLATE || '');
    for (const m of s.matchAll(/"Type":"([A-Za-z0-9_]+)"/g)) types.add(m[1]);
  }
  if (!page.next) break;
  start = page.next;
  if (start > 500) break;
}

const phpish = [...types].filter((x) => /php|code|Code/i.test(x)).sort();
console.log('PHP/Code activity types on portal:', phpish.length ? phpish.join(', ') : '(none)');
console.log('Total unique activity types:', types.size);
