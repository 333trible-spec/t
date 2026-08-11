'use strict';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '..', '.env');
const workflowHint = process.argv[2] || '6a674f88d08b60.29798242';
const employeeId = Number(process.argv[3]) || 18900;

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

const base = loadWebhook().replace(/\/?$/, '/') ;

const tasks = await b24(base, 'bizproc.task.list', {
  filter: { USER_ID: employeeId, STATUS: 0 },
  select: ['ID', 'USER_ID', 'NAME', 'WORKFLOW_ID', 'DOCUMENT_NAME', 'DOCUMENT_URL', 'ACTIVITY', 'ACTIVITY_NAME'],
  order: { ID: 'DESC' },
  start: 0,
});

if (tasks.error) {
  console.error(tasks.error, tasks.error_description);
  process.exit(1);
}

const rows = Array.isArray(tasks.result) ? tasks.result : [];
const match = rows.filter((t) => String(t.WORKFLOW_ID || '').includes(workflowHint) || String(t.ID).includes(workflowHint));

console.log('Open tasks for user', employeeId + ':', rows.length);
if (match.length) {
  console.log('\nMatched workflow/task:');
  match.forEach((t) => console.log(JSON.stringify(t, null, 2)));
} else {
  console.log('\nNo task matched', workflowHint);
  console.log('Latest open tasks:');
  rows.slice(0, 5).forEach((t) => {
    console.log(' - #' + t.ID, t.NAME, '| WF=' + t.WORKFLOW_ID);
  });
}

if (match[0] && match[0].WORKFLOW_ID) {
  const wf = await b24(base, 'bizproc.workflow.instances', {
    select: ['ID', 'TEMPLATE_ID', 'STARTED', 'STATUS', 'DOCUMENT_ID', 'MODULE_ID', 'ENTITY', 'DOCUMENT_URL'],
    filter: { ID: match[0].WORKFLOW_ID },
  });
  console.log('\nWorkflow instance:', JSON.stringify((wf.result || [])[0] || wf.error, null, 2));
  const tplId = (wf.result || [])[0] && (wf.result[0].TEMPLATE_ID || wf.result[0].templateId);
  if (tplId) {
    const tpl = await b24(base, 'bizproc.workflow.template.list', {
      filter: { ID: Number(tplId) },
      select: ['ID', 'NAME', 'DOCUMENT_TYPE', 'MODIFIED'],
    });
    console.log('\nTemplate:', JSON.stringify((tpl.result || [])[0], null, 2));
    console.log('\nCheck delegation: node scripts/probe-template-delegation.mjs', tplId);
  }
}
