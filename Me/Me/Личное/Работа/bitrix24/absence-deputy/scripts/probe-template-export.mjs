'use strict';

import fs from 'fs';
import zlib from 'zlib';

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
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { _raw: text.slice(0, 500), _status: res.status };
  }
}

const base = (loadWebhook().endsWith('/') ? loadWebhook() : loadWebhook() + '/');
const templateId = 2784;

const methods = [
  ['bizproc.workflow.template.list', { filter: { ID: templateId }, select: ['*'] }],
  ['bizproc.workflow.template.export', { ID: templateId }],
  ['bizproc.workflow.template.get', { ID: templateId }],
  ['bizproc.workflow.template.get', { id: templateId }],
];

for (const [method, params] of methods) {
  const r = await call(base, method, params);
  console.log('\n===', method, JSON.stringify(params), '===');
  if (r.error) {
    console.log('ERROR', r.error, r.error_description || '');
    continue;
  }
  const result = r.result;
  if (typeof result === 'string' && result.length > 100) {
    console.log('string len', result.length, 'head', result.slice(0, 80));
  } else if (result && result.TEMPLATE && typeof result.TEMPLATE === 'string') {
    console.log('TEMPLATE len', result.TEMPLATE.length);
  } else {
    console.log(JSON.stringify(result, null, 2).slice(0, 4000));
  }
}

// Try export and save bpt if returned
const exp = await call(base, 'bizproc.workflow.template.export', { ID: templateId });
if (!exp.error && exp.result) {
  let b64 = exp.result;
  if (typeof exp.result === 'object') {
    b64 = exp.result.TEMPLATE || exp.result.template || exp.result.file;
  }
  if (typeof b64 === 'string') {
    const out =
      'c:/Users/mitkinMV/Desktop/Курсор работа/Me/Me/Личное/Работа/bitrix24/absence-deputy/export/bp-2784-live.bpt';
    const buf = Buffer.from(b64, 'base64');
    fs.writeFileSync(out, buf);
    console.log('\nSaved', out, 'bytes', buf.length);
    let text;
    try {
      text = zlib.inflateSync(buf).toString('utf8');
    } catch {
      text = buf.toString('utf8');
    }
    const gv = [...new Set(text.match(/\{=GlobalVar:[^}]+\}/g) || [])];
    const gc = [...new Set(text.match(/\{=GlobalConst:Constant\d+\}/g) || [])];
    console.log('GlobalVar expressions:', gv);
    console.log('GlobalConst count:', gc.length);
    const anchor = text.includes('A17003_79930_19981_49870');
    console.log('anchor A17003_79930_19981_49870:', anchor);
    const idx = text.indexOf('GlobalVar');
    if (idx >= 0) console.log('context', JSON.stringify(text.slice(idx - 40, idx + 200)));
  }
}
