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

const base = (loadWebhook().endsWith('/') ? loadWebhook() : loadWebhook() + '/');

const list = await call(base, 'bizproc.workflow.template.list', {
  filter: { ID: 2784 },
  select: [
    'ID', 'NAME', 'MODIFIED', 'PARAMETERS', 'VARIABLES', 'CONSTANTS', 'TEMPLATE',
  ],
});

const t = list.result?.[0];
if (!t) {
  console.error('template not found');
  process.exit(1);
}

console.log('MODIFIED', t.MODIFIED);
console.log('PARAMETERS', JSON.stringify(t.PARAMETERS, null, 2));
console.log('VARIABLES', JSON.stringify(t.VARIABLES, null, 2));

function walk(node, depth = 0) {
  if (!node) return;
  const pad = '  '.repeat(depth);
  console.log(pad + node.Type, node.Name, JSON.stringify(node.Properties || {}, null, 0).slice(0, 500));
  for (const c of node.Children || []) walk(c, depth + 1);
}

const root = Array.isArray(t.TEMPLATE) ? t.TEMPLATE[0] : t.TEMPLATE;
console.log('\nACTIVITIES:');
walk(root);
