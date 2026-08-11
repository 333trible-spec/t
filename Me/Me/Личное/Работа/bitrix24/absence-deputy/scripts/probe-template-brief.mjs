'use strict';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '..', '.env');
const templateId = Number(process.argv[2]) || 2694;

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
const data = await fetch(base + 'bizproc.workflow.template.list', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    filter: { ID: templateId },
    select: ['ID', 'NAME', 'AUTO_EXECUTE', 'DOCUMENT_TYPE', 'TEMPLATE', 'PARAMETERS'],
  }),
}).then((r) => r.json());

const t = (data.result || [])[0];
if (!t) {
  console.error('not found', templateId);
  process.exit(1);
}

console.log('ID', t.ID, 'NAME', t.NAME, 'AUTO_EXECUTE', t.AUTO_EXECUTE);
console.log('DOC', JSON.stringify(t.DOCUMENT_TYPE));

function walk(node, hits) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    node.forEach((x) => walk(x, hits));
    return;
  }
  const type = String(node.Type || '');
  const p = node.Properties || {};
  const title = String(p.Title || p.Name || '').trim();
  if (type && type !== 'SequenceActivity' && type !== 'EmptyBlockActivity') {
    hits.push(type + (title ? ': ' + title : ''));
  }
  const ch = node.Children;
  if (ch) walk(ch, hits);
  for (const k of Object.keys(node)) {
    if (k === 'Properties' || k === 'Children' || k === 'Type') continue;
    if (node[k] && typeof node[k] === 'object') walk(node[k], hits);
  }
}

const hits = [];
walk(t.TEMPLATE, hits);
console.log('activities:', hits.join(' | '));
