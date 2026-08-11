'use strict';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '..', '.env');
const outPath = path.join(__dirname, '..', 'export', 'bp-delegation-priority.md');

function loadWebhook() {
  const txt = fs.readFileSync(envPath, 'utf8');
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^\s*(B24_NAV_WEBHOOK|B24_WEBHOOK)\s*=\s*(.+)\s*$/);
    if (m) return m[2].trim().replace(/^["']|["']$/g, '');
  }
  return '';
}

const TASK = new Set([
  'ApproveActivity',
  'ReviewActivity',
  'RequestInformationActivity',
  'RequestInformationOptionalActivity',
]);

const LABEL = { 0: 'только подчинённым', 1: 'всем', 2: 'никому', 3: 'никому (строго)' };

function walk(node, hits) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const x of node) walk(x, hits);
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
      title: String(p.Title || p.Name || node.Name || ''),
      type: String(type),
      code,
      label: code == null ? '?' : LABEL[code] || String(code),
      users: String(users),
      usesGlobalConst: /GlobalConst/i.test(String(users)),
    });
  }
  for (const k of Object.keys(node)) {
    if (typeof node[k] === 'object') walk(node[k], hits);
  }
}

const DEMO_RE =
  /экспертная оценка|двухэтапное|простое утверждение|утверждение по первому|утверждение документа со статусами|ознакомление с документом|тест|пример автозадачи|тест активити/i;

const base = loadWebhook().replace(/\/?$/, '/');
const all = [];
let start = 0;
while (true) {
  const res = await fetch(base + 'bizproc.workflow.template.list', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      select: ['ID', 'NAME', 'MODULE_ID', 'ENTITY', 'TEMPLATE'],
      start,
    }),
  });
  const page = await res.json();
  for (const t of page.result || []) all.push(t);
  if (!page.next) break;
  start = page.next;
}

const rows = [];
for (const t of all) {
  const hits = [];
  walk(t.TEMPLATE, hits);
  if (!hits.length) continue;
  const bad = hits.filter((h) => h.code !== 1);
  const withConst = hits.filter((h) => h.usesGlobalConst);
  rows.push({
    id: t.ID,
    name: t.NAME || '',
    module: t.MODULE_ID || '',
    entity: t.ENTITY || '',
    hits,
    bad,
    withConst,
    isDemo: DEMO_RE.test(t.NAME || ''),
  });
}

rows.sort((a, b) => {
  const score = (r) =>
    (r.withConst.length ? 1000 : 0) +
    (r.isDemo ? -500 : 0) +
    r.bad.length * 10 +
    (r.bad.some((h) => h.code === 0) ? 5 : 0);
  return score(b) - score(a);
});

const lines = [];
lines.push('# Приоритетный чеклист: делегирование → «всем»');
lines.push('');
lines.push('Скан REST по ' + all.length + ' шаблонам. Где смотреть: дизайнеры БП → активити согласования/ознакомления/запроса → **«Кому можно делегировать»**.');
lines.push('');
lines.push('## A. С GlobalConst (важнее всего для «6 кадров»)');
lines.push('');
for (const r of rows.filter((x) => x.withConst.length && x.bad.length)) {
  lines.push('### #' + r.id + ' — ' + r.name);
  lines.push('');
  for (const h of r.hits) {
    const mark = h.code === 1 ? '✅' : '❌';
    lines.push(
      '- ' +
        mark +
        ' **' +
        h.title +
        '** (`' +
        h.type +
        '`) — делегирование: **' +
        h.label +
        '** · исполнители: `' +
        h.users.slice(0, 100) +
        '`'
    );
  }
  lines.push('');
}

lines.push('## B. Рабочие шаблоны без GlobalConst в Users (но есть задания)');
lines.push('');
for (const r of rows.filter((x) => !x.withConst.length && !x.isDemo && x.bad.length)) {
  lines.push('- **#' + r.id + ' — ' + r.name + '** — ' + r.bad.length + ' активити не «всем»');
  for (const h of r.bad.slice(0, 8)) {
    lines.push('  - ' + h.title + ' → **' + h.label + '**');
  }
}
lines.push('');
lines.push('## C. Уже «всем» (трогать не нужно)');
lines.push('');
for (const r of rows.filter((x) => x.hits.length && !x.bad.length)) {
  lines.push('- #' + r.id + ' — ' + r.name);
}
lines.push('');
lines.push('## D. Типовые/демо-шаблоны (низкий приоритет)');
lines.push('');
for (const r of rows.filter((x) => x.isDemo && x.bad.length)) {
  lines.push('- #' + r.id + ' — ' + r.name + ' (' + r.bad.length + ')');
}

fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
console.log('OK', outPath);
console.log(
  'A(const+bad)=',
  rows.filter((x) => x.withConst.length && x.bad.length).length,
  'B(work+bad)=',
  rows.filter((x) => !x.withConst.length && !x.isDemo && x.bad.length).length,
  'ok=',
  rows.filter((x) => x.hits.length && !x.bad.length).length
);
