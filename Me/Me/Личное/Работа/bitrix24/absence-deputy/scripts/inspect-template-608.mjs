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

const tpl = await call(base, 'bizproc.workflow.template.list', {
  filter: { ID: 608 },
  select: ['ID', 'NAME', 'TEMPLATE', 'DOCUMENT_TYPE'],
});
const s = JSON.stringify(tpl.result?.[0]?.TEMPLATE || '');
const acts = [...new Set(s.match(/"Type":"[^"]+"/g) || [])];
console.log('template 608', tpl.result?.[0]?.NAME, tpl.result?.[0]?.DOCUMENT_TYPE);
console.log('activity types:', acts.join(', '));

for (const needle of ['SetGlobal', 'GlobalConst', 'GlobalConstant', 'ModifyGlobal']) {
  let pos = 0;
  let n = 0;
  while (n < 3) {
    const i = s.indexOf(needle, pos);
    if (i < 0) break;
    console.log('\n---', needle, '---');
    console.log(s.slice(Math.max(0, i - 120), i + 280));
    pos = i + needle.length;
    n++;
  }
}

function walk(node, out = []) {
  if (!node) return out;
  if (node.Type && /Global|Const|SetGlobal/i.test(node.Type + JSON.stringify(node.Properties || {}))) {
    out.push({ Type: node.Type, Name: node.Name, Properties: node.Properties });
  }
  for (const c of node.Children || []) walk(c, out);
  return out;
}

const root = tpl.result?.[0]?.TEMPLATE?.[0];
console.log('\nRelevant nodes:', JSON.stringify(walk(root), null, 2).slice(0, 4000));

for (const m of ['app.constant.get', 'app.constant.list', 'app.constant.set', 'app.constant.update', 'app.option.get']) {
  const r = await call(base, m, {});
  console.log('\n', m, r.error || JSON.stringify(r.result)?.slice(0, 300));
}
