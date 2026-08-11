'use strict';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '..', '.env');
const elementId = Number(process.argv[2]) || 5731536;

function loadWebhook() {
  if (process.env.B24_NAV_WEBHOOK) return process.env.B24_NAV_WEBHOOK;
  const txt = fs.readFileSync(envPath, 'utf8');
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^\s*(B24_NAV_WEBHOOK|B24_WEBHOOK)\s*=\s*(.+)\s*$/);
    if (m) return m[2].trim().replace(/^["']|["']$/g, '');
  }
  return '';
}

const base = loadWebhook().replace(/\/?$/, '/') ;
const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'six-staff-list.json'), 'utf8'));
const sixStaffList = require('../lib/six-staff-list.js');

async function b24(method, params) {
  const res = await fetch(base + method, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params || {}),
  });
  return res.json();
}

const data = await b24('lists.element.get', {
  IBLOCK_TYPE_ID: 'lists',
  IBLOCK_ID: cfg.iblockId,
  ELEMENT_ID: elementId,
});
if (data.error) {
  console.error(data.error, data.error_description);
  process.exit(1);
}
const row = Array.isArray(data.result) ? data.result[0] : data.result;
const rec = sixStaffList.elementToRecord(cfg, row);
const active = sixStaffList.isVacationActive(rec);

console.log('Element', elementId);
console.log(JSON.stringify(rec, null, 2));
console.log('');
console.log('isVacationActive (cron scope):', active);

if (rec.userId) {
  const tasks = await b24('bizproc.task.list', {
    filter: { USER_ID: Number(rec.userId), STATUS: 0 },
    select: ['ID', 'NAME', 'USER_ID'],
    start: 0,
  });
  const list = Array.isArray(tasks.result) ? tasks.result : [];
  console.log('open BP tasks on employee:', list.length);
  list.slice(0, 10).forEach((t) => console.log(' -', t.ID, t.NAME));
}

if (rec.replacementId) {
  const tasks = await b24('bizproc.task.list', {
    filter: { USER_ID: Number(rec.replacementId), STATUS: 0 },
    select: ['ID', 'NAME'],
    start: 0,
  });
  const list = Array.isArray(tasks.result) ? tasks.result : [];
  console.log('open BP tasks on deputy:', list.length);
}
