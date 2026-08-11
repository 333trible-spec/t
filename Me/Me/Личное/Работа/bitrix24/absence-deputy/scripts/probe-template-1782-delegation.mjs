'use strict';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '..', '.env');

const TASK = new Set([
  'ApproveActivity',
  'ReviewActivity',
  'RequestInformationActivity',
  'RequestInformationOptionalActivity',
]);

const LABEL = { 0: 'только подчинённым', 1: 'всем сотрудникам', 2: 'никому', 3: 'никому (строго)' };

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

function walk(node, pathNames, hits) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const item of node) walk(item, pathNames, hits);
    return;
  }
  const type = node.Type || node.type;
  const codeName = node.Name || node.name || '';
  const nextPath = codeName ? pathNames.concat(String(codeName)) : pathNames;
  if (type && TASK.has(String(type))) {
    const p = node.Properties || {};
    const raw = p.DelegationType;
    const code = raw == null || raw === '' ? null : Number(raw);
    let users = p.Users || '';
    if (Array.isArray(users)) users = users.join(', ');
    hits.push({
      title: String(p.Title || p.Name || codeName || '(без имени)'),
      type: String(type),
      codeName: String(codeName),
      delegationRaw: raw,
      delegationCode: code,
      delegationLabel:
        code != null && LABEL[code] != null ? LABEL[code] : raw == null || raw === '' ? '(пусто)' : String(raw),
      users: String(users).slice(0, 100),
    });
  }
  for (const k of Object.keys(node)) {
    if (typeof node[k] === 'object') walk(node[k], nextPath, hits);
  }
}

const base = loadWebhook().replace(/\/?$/, '/');
const res = await fetch(base + 'bizproc.workflow.template.list', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    filter: { ID: 1782 },
    select: ['ID', 'NAME', 'MODIFIED', 'MODULE_ID', 'ENTITY', 'DOCUMENT_TYPE', 'TEMPLATE'],
  }),
});
const data = await res.json();
if (data.error) {
  console.error('API error:', data.error, data.error_description);
  process.exit(1);
}
const t = (data.result || [])[0];
if (!t) {
  console.error('Template 1782 not found');
  process.exit(1);
}

console.log('Template:', t.ID, t.NAME);
console.log('MODIFIED:', t.MODIFIED);
console.log('MODULE:', t.MODULE_ID, 'ENTITY:', t.ENTITY, 'DOC:', JSON.stringify(t.DOCUMENT_TYPE));
console.log('');

const hits = [];
walk(t.TEMPLATE, [], hits);
console.log('Task activities:', hits.length);
console.log('');

for (let i = 0; i < hits.length; i++) {
  const h = hits[i];
  const ok = h.delegationCode === 1 ? 'OK' : 'BAD';
  console.log(
    (i + 1) + '. [' + ok + '] ' + h.title +
    ' | DelegationType=' + h.delegationRaw + ' (' + h.delegationLabel + ')' +
    ' | users=' + h.users
  );
}

const bad = hits.filter((h) => h.delegationCode !== 1);
console.log('');
console.log('Summary: ok=' + (hits.length - bad.length) + ' bad=' + bad.length);
if (bad.length) {
  console.log('Still not "всем":');
  for (const h of bad) {
    console.log(' - ' + h.title + ' => ' + h.delegationLabel + ' (raw ' + h.delegationRaw + ')');
  }
}
