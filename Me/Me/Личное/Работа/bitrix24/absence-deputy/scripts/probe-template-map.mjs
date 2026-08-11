'use strict';

/** Статусы и задания в шаблоне — для навигации в дизайнере. */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '..', '.env');
const templateId = Number(process.argv[2]) || 2538;

const TASK = new Set([
  'ApproveActivity',
  'ReviewActivity',
  'RequestInformationActivity',
  'RequestInformationOptionalActivity',
]);

function loadWebhook() {
  if (process.env.B24_NAV_WEBHOOK) return process.env.B24_NAV_WEBHOOK;
  const txt = fs.readFileSync(envPath, 'utf8');
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^\s*(B24_NAV_WEBHOOK|B24_WEBHOOK)\s*=\s*(.+)\s*$/);
    if (m) return m[2].trim().replace(/^["']|["']$/g, '');
  }
  return '';
}

function title(node) {
  const p = (node && node.Properties) || {};
  return String(p.Title || p.Name || node.Name || '').trim();
}

function walkStates(node, out) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    node.forEach((item) => walkStates(item, out));
    return;
  }
  const type = String(node.Type || '');
  if (type === 'StateActivity') {
    out.states.push(title(node));
  }
  if (type === 'ParallelActivity') {
    const kids = node.Children || [];
    const branches = kids.map((ch, i) => {
      const tasks = [];
      collectTasks(ch, tasks);
      return { index: i + 1, tasks: tasks };
    });
    out.parallels.push({
      afterState: out.states.length ? out.states[out.states.length - 1] : '?',
      branches: branches,
    });
  }
  const children = node.Children;
  if (children) walkStates(children, out);
  for (const k of Object.keys(node)) {
    if (k === 'Properties' || k === 'Children' || k === 'Type') continue;
    if (node[k] && typeof node[k] === 'object') walkStates(node[k], out);
  }
}

function collectTasks(node, tasks) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    node.forEach((item) => collectTasks(item, tasks));
    return;
  }
  const type = String(node.Type || '');
  if (TASK.has(type)) {
    const p = node.Properties || {};
    const dt = p.DelegationType;
    tasks.push({
      name: title(node),
      delegation: dt == null || dt === '' ? '?' : String(dt),
    });
  }
  const children = node.Children;
  if (children) collectTasks(children, tasks);
  for (const k of Object.keys(node)) {
    if (k === 'Properties' || k === 'Children' || k === 'Type') continue;
    if (node[k] && typeof node[k] === 'object') collectTasks(node[k], tasks);
  }
}

const base = loadWebhook().replace(/\/?$/, '/');
const data = await fetch(base + 'bizproc.workflow.template.list', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ filter: { ID: templateId }, select: ['ID', 'NAME', 'TEMPLATE'] }),
}).then((r) => r.json());

const tpl = (data.result || [])[0];
if (!tpl) {
  console.error('not found');
  process.exit(1);
}

const out = { states: [], parallels: [], allTasks: [] };
walkStates(tpl.TEMPLATE, out);
collectTasks(tpl.TEMPLATE, out.allTasks);

console.log('Шаблон', tpl.ID, tpl.NAME);
console.log('');
console.log('=== СТАТУСЫ (вкладки сверху) ===');
out.states.forEach((s, i) => console.log((i + 1) + '. «' + s + '»'));
console.log('');
console.log('=== ВСЕ ЗАДАНИЯ ===');
out.allTasks.forEach((t, i) => {
  const mark = t.delegation === '1' ? 'OK' : 'FIX';
  console.log((i + 1) + '. [' + mark + '] «' + t.name + '» DelegationType=' + t.delegation);
});
console.log('');
console.log('=== ПАРАЛЛЕЛЬНЫЕ БЛОКИ ===');
out.parallels.forEach((p, i) => {
  console.log((i + 1) + '. В статусе «' + p.afterState + '»:');
  p.branches.forEach((b) => {
    console.log('   ветка ' + b.index + ': ' + (b.tasks.map((x) => x.name).join(' | ') || '(пусто)'));
  });
});
