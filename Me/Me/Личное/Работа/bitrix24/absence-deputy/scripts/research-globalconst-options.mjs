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

// Full method catalog
const methods = await call(base, 'methods', { full: true });
if (methods.error) {
  console.error('methods error', methods.error);
  process.exit(1);
}

const patterns = [
  /global/i,
  /const/i,
  /globals/i,
  /bizproc/i,
  /environment/i,
  /setting/i,
];

const hits = methods.result.filter((m) => patterns.some((p) => p.test(m)));
console.log('REST methods matching global/const/bizproc/env/setting:', hits.length);
for (const h of hits.sort()) console.log(' ', h);

// Probe additional obscure methods
const obscure = [
  'bizproc.globals.set',
  'bizproc.globals.get',
  'bizproc.globals.list',
  'bizproc.environment.set',
  'bizproc.environment.get',
  'bizproc.workflow.type.set',
  'bizproc.type.globalconst.set',
  'bizproc.type.globalconst.upsert',
  'bizproc.type.globalconst.update',
  'bizproc.type.globalconst.get',
  'bizproc.type.globalconst.list',
  'bizproc.type.globalvar.set',
  'bizproc.constant.set',
  'bizproc.constants.set',
  'bizproc.settings.set',
  'bizproc.document.globalconst.set',
];

console.log('\nObscure probes:');
for (const method of obscure) {
  const r = await call(base, method, { ID: 'Constant1726726681045' });
  console.log(' ', method, '->', r.error || 'OK');
}

// Parse template 2784 for activity types in all templates sample
const tpl = await call(base, 'bizproc.workflow.template.list', {
  filter: { ID: 2784 },
  select: ['TEMPLATE'],
});
const json = JSON.stringify(tpl.result?.[0]?.TEMPLATE || []);
const actTypes = [...new Set(json.match(/"[A-Za-z]+Activity"/g) || [])].map((s) => s.replace(/"/g, ''));
console.log('\nActivity types in template 2784:', actTypes.sort().join(', '));

// Search all templates for SetGlobal* activities (first 50 templates)
const all = await call(base, 'bizproc.workflow.template.list', {
  select: ['ID', 'NAME', 'TEMPLATE'],
  start: 0,
});
const found = [];
for (const t of all.result || []) {
  const s = JSON.stringify(t.TEMPLATE || '');
  if (/SetGlobalConstant|GlobalConstantValue|ModifyGlobalConst|GlobalConst/i.test(s)) {
    found.push({ id: t.ID, name: t.NAME, snippet: s.match(/.{0,80}SetGlobal.{0,80}/)?.[0] });
  }
}
console.log('\nTemplates with SetGlobalConstant-like:', found.length);
for (const f of found.slice(0, 10)) console.log(f);
