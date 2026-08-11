'use strict';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const envPath = process.argv[2] || path.join(root, '..', '.env');
const outPath = path.join(root, 'export', 'bp-delegation-scan.md');

const TASK_TYPES = new Set([
  'ApproveActivity',
  'ReviewActivity',
  'RequestInformationActivity',
  'RequestInformationOptionalActivity',
]);

const DELEGATION_LABEL = {
  0: 'только подчинённым',
  1: 'всем сотрудникам',
  2: 'никому',
  3: 'никому (строго)',
};

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

async function call(base, method, params = {}) {
  const res = await fetch(base + method, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (data.error) {
    const err = new Error(data.error_description || data.error);
    err.code = data.error;
    throw err;
  }
  return data;
}

function walk(node, pathNames, hits) {
  if (!node || typeof node !== 'object') return;

  if (Array.isArray(node)) {
    for (const item of node) walk(item, pathNames, hits);
    return;
  }

  const type = node.Type || node.type;
  const name = node.Name || node.name || node.Title || node.title || '';
  const nextPath = name ? pathNames.concat(String(name)) : pathNames;

  if (type && TASK_TYPES.has(String(type))) {
    const props = node.Properties || node.properties || {};
    let raw =
      props.DelegationType ??
      props.delegationType ??
      props.DELEGATION_TYPE ??
      node.DelegationType ??
      null;

    if (raw == null && props.Settings) {
      raw = props.Settings.DelegationType ?? props.Settings.delegationType ?? null;
    }

    // Нет поля в старых шаблонах = поведение по умолчанию портала (часто «никому»)
    let code = null;
    if (raw != null && raw !== '') {
      const n = Number(raw);
      code = Number.isFinite(n) ? n : String(raw);
    }

    const title = String(props.Title || props.Name || name || '(без имени)');
    let users = props.Users ?? props.users ?? '';
    if (Array.isArray(users)) users = users.join(', ');
    users = String(users || '').slice(0, 120);

    hits.push({
      type: String(type),
      activityName: title,
      activityCode: String(name || ''),
      users: users,
      path: nextPath.join(' → '),
      delegationRaw: raw,
      delegationCode: code,
      delegationLabel:
        code != null && DELEGATION_LABEL[code] != null
          ? DELEGATION_LABEL[code]
          : code == null
            ? 'поле пустое (часто = никому) — проверь в дизайнере'
            : String(code),
      needsChange: code !== 1,
    });
  }

  for (const key of Object.keys(node)) {
    if (key === 'Type' || key === 'type' || key === 'Name' || key === 'name') continue;
    const val = node[key];
    if (val && typeof val === 'object') walk(val, nextPath, hits);
  }
}

function extractHits(template) {
  const hits = [];
  walk(template, [], hits);
  return hits;
}

async function listAllTemplates(base) {
  const rows = [];
  let start = 0;
  while (true) {
    const page = await call(base, 'bizproc.workflow.template.list', {
      select: ['ID', 'NAME', 'MODULE_ID', 'ENTITY', 'DOCUMENT_TYPE', 'AUTO_EXECUTE', 'TEMPLATE'],
      start,
    });
    const chunk = page.result || [];
    for (const t of chunk) rows.push(t);
    if (!page.next) break;
    start = page.next;
    if (start > 2000) break;
  }
  return rows;
}

function mdEscape(s) {
  return String(s || '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

async function main() {
  const wh = loadWebhook();
  if (!wh) {
    console.error('NO_WEBHOOK');
    process.exit(1);
  }
  const base = wh.endsWith('/') ? wh : wh + '/';

  console.log('Loading templates…');
  const templates = await listAllTemplates(base);
  console.log('Templates:', templates.length);

  const report = [];
  let totalActivities = 0;
  let needChange = 0;
  let alreadyAll = 0;
  let unknown = 0;

  for (const t of templates) {
    const hits = extractHits(t.TEMPLATE);
    if (!hits.length) continue;
    totalActivities += hits.length;
    for (const h of hits) {
      if (h.delegationCode === 1) alreadyAll += 1;
      else if (h.delegationCode == null || h.delegationLabel.startsWith('не найдено')) unknown += 1;
      else needChange += 1;
    }
    report.push({
      id: t.ID,
      name: t.NAME || '(без названия)',
      module: t.MODULE_ID || '',
      entity: t.ENTITY || '',
      documentType: Array.isArray(t.DOCUMENT_TYPE)
        ? t.DOCUMENT_TYPE.join('/')
        : String(t.DOCUMENT_TYPE || ''),
      hits,
    });
  }

  report.sort(function (a, b) {
    const aBad = a.hits.filter((h) => h.needsChange).length;
    const bBad = b.hits.filter((h) => h.needsChange).length;
    return bBad - aBad || Number(a.id) - Number(b.id);
  });

  const lines = [];
  lines.push('# Скан делегирования в шаблонах БП');
  lines.push('');
  lines.push('Портал: ik-navigator · дата: ' + new Date().toISOString());
  lines.push('');
  lines.push('## Сводка');
  lines.push('');
  lines.push('| | |');
  lines.push('|---|---|');
  lines.push('| Шаблонов всего | ' + templates.length + ' |');
  lines.push('| Шаблонов с заданиями человеку | ' + report.length + ' |');
  lines.push('| Активити с заданиями | ' + totalActivities + ' |');
  lines.push('| Уже «всем сотрудникам» (`1`) | ' + alreadyAll + ' |');
  lines.push('| Нужно менять (`0`/`2`/другое) | ' + needChange + ' |');
  lines.push('| Не удалось прочитать из TEMPLATE | ' + unknown + ' |');
  lines.push('');
  lines.push('Коды (CBPTaskDelegationType): `0` = только подчинённым · `1` = всем сотрудникам · `2` = никому · `3` = никому (строго).');
  lines.push('');
  lines.push('## Где смотреть (приоритет — сначала не «всем»)');
  lines.push('');

  for (const row of report) {
    const bad = row.hits.filter((h) => h.needsChange);
    const ok = row.hits.filter((h) => !h.needsChange);
    if (!bad.length && !ok.length) continue;

    lines.push('### #' + row.id + ' — ' + mdEscape(row.name));
    lines.push('');
    lines.push(
      '- Модуль: `' +
        mdEscape(row.module) +
        '` · entity: `' +
        mdEscape(row.entity) +
        '` · doc: `' +
        mdEscape(row.documentType) +
        '`'
    );
    lines.push('- Открыть: CRM / Автоматизация → Бизнес-процессы → шаблон **' + mdEscape(row.name) + '** (ID ' + row.id + ')');
    lines.push('');
    lines.push('| Активити | Тип | Исполнители | Делегирование | Действие |');
    lines.push('|----------|-----|-------------|---------------|----------|');
    for (const h of row.hits) {
      const action =
        h.delegationCode === 1
          ? 'ок'
          : 'в дизайнере: «Кому можно делегировать» → **всем сотрудникам**';
      lines.push(
        '| ' +
          mdEscape(h.activityName) +
          ' | `' +
          h.type +
          '` | `' +
          mdEscape(h.users || '—') +
          '` | **' +
          mdEscape(h.delegationLabel) +
          '** (`' +
          (h.delegationCode == null ? '?' : h.delegationCode) +
          '`) | ' +
          action +
          ' |'
      );
    }
    lines.push('');
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
  console.log('\nOK →', outPath);
  console.log({
    templates: templates.length,
    withTasks: report.length,
    totalActivities,
    alreadyAll,
    needChange,
    unknown,
  });

  // Console short list of templates that need change
  const todo = report.filter((r) => r.hits.some((h) => h.needsChange));
  console.log('\nTemplates to check first:', todo.length);
  for (const r of todo.slice(0, 40)) {
    const labels = r.hits
      .filter((h) => h.needsChange)
      .map((h) => h.activityName + '=' + h.delegationLabel)
      .join('; ');
    console.log('#' + r.id, r.name, '→', labels);
  }
  if (todo.length > 40) console.log('… и ещё', todo.length - 40);
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
