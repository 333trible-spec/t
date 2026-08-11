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

const activityNeedles = [
  'SetGlobalConstantActivity',
  'SetGlobalConstActivity',
  'ModifyGlobalConstantActivity',
  'GlobalConstantValue',
  'GlobalConstValue',
  'SetGlobalVariableActivity',
];

let start = 0;
const pageSize = 50;
const found = { activities: new Map(), templates: [] };

while (true) {
  const page = await call(base, 'bizproc.workflow.template.list', {
    select: ['ID', 'NAME', 'TEMPLATE'],
    start,
  });
  for (const t of page.result || []) {
    const s = JSON.stringify(t.TEMPLATE || '');
    for (const n of activityNeedles) {
      if (s.includes(n)) {
        if (!found.activities.has(n)) found.activities.set(n, []);
        found.activities.get(n).push({ id: t.ID, name: t.NAME });
      }
    }
  }
  if (!page.next) break;
  start = page.next;
  if (start > 500) break; // safety cap
}

console.log('Activity types found across templates:');
for (const [k, v] of found.activities) {
  console.log(k, v.length, v.slice(0, 5));
}

// Scan designer activity list via known B24 activity names in all templates
const allTypes = new Set();
start = 0;
while (true) {
  const page = await call(base, 'bizproc.workflow.template.list', {
    select: ['TEMPLATE'],
    start,
  });
  for (const t of page.result || []) {
    const s = JSON.stringify(t.TEMPLATE || '');
    for (const m of s.matchAll(/"Type":"([A-Za-z0-9_]+Activity)"/g)) allTypes.add(m[1]);
    for (const m of s.matchAll(/"Type":"(rest_[a-f0-9]+)"/g)) allTypes.add(m[1]);
  }
  if (!page.next) break;
  start = page.next;
  if (start > 500) break;
}
const globalish = [...allTypes].filter((x) => /global|const|Global/i.test(x)).sort();
console.log('\nAll *Activity types with global/const in name on portal:', globalish);
