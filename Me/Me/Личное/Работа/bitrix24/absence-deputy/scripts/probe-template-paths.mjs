'use strict';

/**
 * Путь в дереве шаблона до каждого задания человеку (для поиска в дизайнере).
 * Usage: node scripts/probe-template-paths.mjs <templateId>
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '..', '.env');
const templateId = Number(process.argv[2]);
const onlyBad = process.argv.includes('--bad');

const TASK = new Set([
  'ApproveActivity',
  'ReviewActivity',
  'RequestInformationActivity',
  'RequestInformationOptionalActivity',
]);

const LABEL = { 0: 'только подчинённым', 1: 'всем', 2: 'никому', 3: 'никому' };

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

function nodeLabel(node) {
  if (!node || typeof node !== 'object') return '?';
  const p = node.Properties || {};
  const type = String(node.Type || node.type || '');
  const title = String(p.Title || p.Name || node.Name || '').trim();
  if (title) return title + ' [' + type + ']';
  return type || 'блок';
}

function walk(node, trail, hits) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    node.forEach(function (item, i) {
      walk(item, trail.concat('[' + (i + 1) + ']'), hits);
    });
    return;
  }

  const type = node.Type || node.type;
  const here = nodeLabel(node);
  const nextTrail = trail.concat(here);

  if (type && TASK.has(String(type))) {
    const p = node.Properties || {};
    const raw = p.DelegationType;
    const code = raw == null || raw === '' ? null : Number(raw);
    hits.push({
      title: String(p.Title || p.Name || '(без имени)'),
      type: String(type),
      delegationCode: code,
      delegationLabel: code != null && LABEL[code] != null ? LABEL[code] : raw == null || raw === '' ? '(пусто)' : String(raw),
      path: nextTrail.join(' → '),
    });
  }

  const children = node.Children || node.children;
  if (children) walk(children, nextTrail, hits);

  for (const k of Object.keys(node)) {
    if (k === 'Properties' || k === 'Children' || k === 'Type' || k === 'type') continue;
    const v = node[k];
    if (v && typeof v === 'object') walk(v, nextTrail, hits);
  }
}

const base = loadWebhook().replace(/\/?$/, '/');
const res = await fetch(base + 'bizproc.workflow.template.list', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    filter: { ID: templateId },
    select: ['ID', 'NAME', 'TEMPLATE'],
  }),
});
const data = await res.json();
const t = (data.result || [])[0];
if (!t) {
  console.error('Template', templateId, 'not found');
  process.exit(1);
}

console.log('#', t.ID, t.NAME);
console.log('');

const hits = [];
walk(t.TEMPLATE, ['Старт'], hits);

for (let i = 0; i < hits.length; i++) {
  const h = hits[i];
  if (onlyBad && h.delegationCode === 1) continue;
  const mark = h.delegationCode === 1 ? 'OK' : 'FIX';
  console.log((i + 1) + '. [' + mark + '] «' + h.title + '» — ' + h.delegationLabel);
  console.log('   Путь: ' + h.path);
  console.log('');
}
