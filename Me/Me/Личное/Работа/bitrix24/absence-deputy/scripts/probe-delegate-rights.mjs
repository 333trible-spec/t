'use strict';

/**
 * Проверка scope и прав bizproc.task.list / bizproc.task.delegate
 * для крона «6 кадров» (делегирование заданий БП на заместителя).
 *
 * Usage:
 *   node scripts/probe-delegate-rights.mjs
 *   node scripts/probe-delegate-rights.mjs --from=12345 --to=67890
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '..', '.env');

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

function maskWebhook(url) {
  return url.replace(/(\/rest\/\d+\/)[^/]+(\/)/, '$1***$2');
}

function parseArg(name) {
  const prefix = '--' + name + '=';
  for (const a of process.argv.slice(2)) {
    if (a.startsWith(prefix)) return a.slice(prefix.length);
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

const wh = loadWebhook();
if (!wh) {
  console.error('NO_WEBHOOK — задайте B24_NAV_WEBHOOK в bitrix24/.env');
  process.exit(1);
}

const base = wh.endsWith('/') ? wh : wh + '/';
const fromUserId = parseArg('from');
const toUserId = parseArg('to');

console.log('webhook', maskWebhook(base));
console.log('');

const info = await call(base, 'app.info');
if (info.error) {
  console.log('app.info ERROR', info.error, info.error_description || '');
  process.exit(1);
}

const r = info.result || {};
const scopes = String(r.SCOPE || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

console.log('app.info OK');
console.log('  LICENSE', r.LICENSE);
console.log('  SCOPE', r.SCOPE);
console.log('  has bizproc', scopes.includes('bizproc'));
console.log('  has lists', scopes.includes('lists'));
console.log('  has user', scopes.includes('user'));
console.log('');

const cur = await call(base, 'user.current');
if (cur.error) {
  console.log('user.current ERROR', cur.error);
} else {
  const u = cur.result || {};
  console.log('webhook user', u.ID, [u.LAST_NAME, u.NAME].filter(Boolean).join(' '));
  console.log('  IS_ADMIN', u.IS_ADMIN);
}
console.log('');

const listTests = [
  ['bizproc.task.list (own, STATUS=0)', { filter: { STATUS: 0 }, select: ['ID', 'USER_ID', 'NAME'], start: 0 }],
];

if (fromUserId) {
  listTests.push([
    'bizproc.task.list (USER_ID=' + fromUserId + ')',
    {
      filter: { USER_ID: Number(fromUserId), STATUS: 0 },
      select: ['ID', 'USER_ID', 'NAME', 'WORKFLOW_ID'],
      start: 0,
    },
  ]);
}

let sampleTaskId = null;
let sampleUserId = null;

for (const [label, params] of listTests) {
  const res = await call(base, 'bizproc.task.list', params);
  if (res.error) {
    console.log(label, 'DENIED', res.error, (res.error_description || '').slice(0, 200));
  } else {
    const rows = Array.isArray(res.result) ? res.result : [];
    console.log(label, 'OK', 'count=' + rows.length, 'total=' + (res.total != null ? res.total : '?'));
    if (rows[0]) {
      console.log('  sample', JSON.stringify(rows[0]));
      if (!sampleTaskId) {
        sampleTaskId = rows[0].ID;
        sampleUserId = rows[0].USER_ID;
      }
    }
  }
}

console.log('');
console.log('--- delegate dry-run ---');

const dryFrom = fromUserId || sampleUserId;
const dryTo = toUserId;

if (!dryFrom || !dryTo) {
  console.log(
    'Пропуск delegate: укажите --from=ID_отпускника --to=ID_заместителя и открытое задание у from.'
  );
  console.log('Либо передайте --from с активным заданием БП на портале.');
  process.exit(0);
}

const tasksForFrom = await call(base, 'bizproc.task.list', {
  filter: { USER_ID: Number(dryFrom), STATUS: 0 },
  select: ['ID', 'USER_ID', 'NAME'],
  start: 0,
});

if (tasksForFrom.error) {
  console.log('task.list for delegate', 'DENIED', tasksForFrom.error);
  process.exit(1);
}

const taskRows = Array.isArray(tasksForFrom.result) ? tasksForFrom.result : [];
if (!taskRows.length) {
  console.log('Нет открытых заданий у user', dryFrom, '— delegate не тестируем');
  process.exit(0);
}

const taskId = taskRows[0].ID;
console.log('Пробуем delegate TASK_ID=' + taskId, 'FROM=' + dryFrom, 'TO=' + dryTo);

const del = await call(base, 'bizproc.task.delegate', {
  TASK_IDS: [Number(taskId)],
  FROM_USER_ID: Number(dryFrom),
  TO_USER_ID: Number(dryTo),
});

if (del.error) {
  console.log('bizproc.task.delegate', 'FAIL', del.error, del.error_description || '');
  console.log('');
  console.log('Если ERROR_DELEGATION_NOT_ALLOWED — нужен webhook от админа или DelegationType=1 в шаблоне БП.');
} else {
  console.log('bizproc.task.delegate', 'OK', JSON.stringify(del.result));
  console.log('');
  console.log('Откат вручную: делегируйте задание', taskId, 'обратно на', dryFrom, 'в UI БП.');
}
