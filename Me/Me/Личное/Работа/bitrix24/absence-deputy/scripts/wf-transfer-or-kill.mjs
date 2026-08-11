'use strict';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '..', '.env');

const workflowId = process.argv[2] || '';
const action = (process.argv[3] || 'transfer').toLowerCase(); // transfer | kill
const toUserId = Number(process.argv[4]) || 24880;

function loadWebhook() {
  if (process.env.B24_NAV_WEBHOOK) return process.env.B24_NAV_WEBHOOK;
  const txt = fs.readFileSync(envPath, 'utf8');
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^\s*(B24_NAV_WEBHOOK|B24_WEBHOOK)\s*=\s*(.+)\s*$/);
    if (m) return m[2].trim().replace(/^["']|["']$/g, '');
  }
  return '';
}

async function b24(base, method, params) {
  const res = await fetch(base + method, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params || {}),
  });
  return res.json();
}

const base = loadWebhook().replace(/\/?$/, '/');
if (!base || !workflowId) {
  console.error('Usage: node wf-transfer-or-kill.mjs <workflowId> [transfer|kill] [toUserId]');
  process.exit(1);
}

const wf = await b24(base, 'bizproc.workflow.instances', {
  filter: { ID: workflowId },
  select: ['ID', 'TEMPLATE_ID', 'STATUS', 'STARTED', 'DOCUMENT_ID', 'MODULE_ID', 'ENTITY'],
});
const instance = (wf.result || [])[0];
if (!instance) {
  console.error('Workflow not found:', workflowId, wf.error || '');
  process.exit(1);
}
console.log('Workflow:', JSON.stringify(instance, null, 2));

const tasksRes = await b24(base, 'bizproc.task.list', {
  filter: { WORKFLOW_ID: workflowId, STATUS: 0 },
  select: ['ID', 'USER_ID', 'NAME', 'WORKFLOW_ID', 'STATUS'],
});
const tasks = Array.isArray(tasksRes.result) ? tasksRes.result : [];
console.log('Open tasks:', tasks.length);
tasks.forEach((t) => console.log(' - #' + t.ID, t.NAME, 'user=' + t.USER_ID));

if (action === 'kill') {
  const kill = await b24(base, 'bizproc.workflow.kill', { ID: workflowId });
  console.log('bizproc.workflow.kill:', JSON.stringify(kill, null, 2));
  process.exit(kill.error ? 1 : 0);
}

if (!tasks.length) {
  console.log('No open tasks to transfer.');
  process.exit(0);
}

for (const task of tasks) {
  const fromId = Number(task.USER_ID);
  if (fromId === toUserId) {
    console.log('Task #' + task.ID + ' already on user', toUserId);
    continue;
  }
  const del = await b24(base, 'bizproc.task.delegate', {
    TASK_IDS: [Number(task.ID)],
    FROM_USER_ID: fromId,
    TO_USER_ID: toUserId,
  });
  console.log('delegate #' + task.ID, fromId, '->', toUserId, JSON.stringify(del, null, 2));
  if (del.error) process.exit(1);
}

const verify = await b24(base, 'bizproc.task.list', {
  filter: { WORKFLOW_ID: workflowId, STATUS: 0 },
  select: ['ID', 'USER_ID', 'NAME'],
});
console.log('After transfer:', JSON.stringify(verify.result, null, 2));
