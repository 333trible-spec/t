'use strict';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '..', '.env');
const templateId = Number(process.argv[2]);
if (!templateId) {
  console.error('Usage: node probe-template-delegation.mjs <templateId>');
  process.exit(1);
}

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

function walk(node, hits) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const item of node) walk(item, hits);
    return;
  }
  const type = node.Type || node.type;
  if (type && TASK.has(String(type))) {
    const p = node.Properties || {};
    const raw = p.DelegationType;
    const code = raw == null || raw === '' ? null : Number(raw);
    let users = p.Users || '';
    if (Array.isArray(users)) users = users.join(', ');
    hits.push({
      title: String(p.Title || p.Name || node.Name || '(без имени)'),
      type: String(type),
      delegationRaw: raw,
      delegationCode: code,
      delegationLabel:
        code != null && LABEL[code] != null ? LABEL[code] : raw == null || raw === '' ? '(пусто)' : String(raw),
      users: String(users).slice(0, 120),
    });
  }
  for (const k of Object.keys(node)) {
    if (typeof node[k] === 'object') walk(node[k], hits);
  }
}

function docUrl(documentType) {
  if (!Array.isArray(documentType) || documentType.length < 3) return '';
  const last = String(documentType[2]);
  const m = last.match(/^DYNAMIC_(\d+)$/);
  if (m) {
    return 'https://ik-navigator.bitrix24.ru/crm/configs/bp/CRM_DYNAMIC_' + m[1] + '/edit/' + templateId + '/';
  }
  return '';
}

const base = loadWebhook().replace(/\/?$/, '/');
const res = await fetch(base + 'bizproc.workflow.template.list', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    filter: { ID: templateId },
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
  console.error('Template', templateId, 'not found');
  process.exit(1);
}

console.log('Template:', t.ID, t.NAME);
console.log('MODIFIED:', t.MODIFIED);
console.log('MODULE:', t.MODULE_ID, 'ENTITY:', t.ENTITY, 'DOC:', JSON.stringify(t.DOCUMENT_TYPE));
const url = docUrl(t.DOCUMENT_TYPE);
if (url) console.log('URL:', url);
console.log('');

const hits = [];
walk(t.TEMPLATE, hits);
console.log('Task activities:', hits.length);
console.log('');

for (let i = 0; i < hits.length; i++) {
  const h = hits[i];
  const ok = h.delegationCode === 1 ? 'OK' : 'BAD';
  console.log(
    (i + 1) +
      '. [' +
      ok +
      '] ' +
      h.title +
      ' | ' +
      h.type +
      ' | DelegationType=' +
      h.delegationRaw +
      ' (' +
      h.delegationLabel +
      ')' +
      ' | users=' +
      h.users
  );
}

const bad = hits.filter((h) => h.delegationCode !== 1);
console.log('');
console.log('Summary: ok=' + (hits.length - bad.length) + ' bad=' + bad.length);
if (bad.length) {
  console.log('Need «Всем сотрудникам» (DelegationType=1):');
  for (const h of bad) {
    console.log(' - ' + h.title + ' => ' + h.delegationLabel + ' (raw ' + h.delegationRaw + ')');
  }
}
