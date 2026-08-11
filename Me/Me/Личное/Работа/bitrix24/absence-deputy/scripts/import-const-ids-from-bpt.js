'use strict';

const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const root = path.join(
  'c:/Users/mitkinMV/Desktop/Курсор работа/Me/Me/Личное/Работа/bitrix24/absence-deputy'
);
const src = 'c:/Users/mitkinMV/Downloads/bp-2784 (1).bpt';
const destBpt = path.join(root, 'export/bp-2784.bpt');

fs.copyFileSync(src, destBpt);

const buf = fs.readFileSync(destBpt);
let t;
try {
  t = zlib.inflateSync(buf).toString('utf8');
} catch {
  t = buf.toString('utf8');
}

const start = t.indexOf('{=GlobalConst:Constant1712814542981}');
const end = t.indexOf('";s:11:"SetVariable"', start);
if (start < 0 || end < 0) {
  console.error('LogActivity Text block not found');
  process.exit(1);
}
const block = t.slice(start, end);
const map = [];
for (const line of block.split(/\n/)) {
  const m = line.match(/^\{=GlobalConst:(Constant\d+)\}\s*(.+)$/);
  if (!m) continue;
  let name = m[2].trim();
  if (name.endsWith('}') && name !== '}') name = name.slice(0, -1);
  map.push({ id: m[1], name });
}

fs.writeFileSync(
  path.join(root, 'data/global-constant-ids.json'),
  JSON.stringify(
    {
      source: 'export/bp-2784.bpt LogActivity.Text',
      portal: 'https://ik-navigator.bitrix24.ru',
      extractedAt: '2026-07-20',
      note:
        'Имена из текста LogActivity. Опечатка «ОРБ}» → «ОРБ». IT-роли (1С/БИТ/BI/Директор IT) — never-change, id не собираем.',
      constants: map,
    },
    null,
    2
  ) + '\n',
  'utf8'
);

const g = JSON.parse(fs.readFileSync(path.join(root, 'data/global-constants.json'), 'utf8'));
const byName = Object.fromEntries(map.map((x) => [x.name, x.id]));
let filled = 0;
for (const c of g.constants) {
  if (byName[c.name]) {
    c.id = byName[c.name];
    filled++;
  }
}
g.note =
  'ID из export/bp-2784.bpt (LogActivity). userId пока null. Запись на портал — отдельно.';
g.idSource = 'export/bp-2784.bpt';
fs.writeFileSync(path.join(root, 'data/global-constants.json'), JSON.stringify(g, null, 2) + '\n', 'utf8');

console.log('mapped', map.length, 'filled', filled);
console.log('Проджект Б24', byName['Проджект Б24']);
console.log('Разраб Б24', byName['Разраб Б24']);
