'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const decoded = fs.readFileSync(path.join(root, 'export', 'bp-608-decoded.txt'), 'utf8');

const TYPE_RU = {
  string: 'Строка',
  select: 'Список',
  bool: 'Да/Нет',
  file: 'Файл',
  'UF:money': 'Деньги',
  'UF:crm': 'Привязка к CRM',
  int: 'Целое число',
  user: 'Пользователь',
  text: 'Текст',
};

function typeRu(t) {
  if (TYPE_RU[t]) return TYPE_RU[t];
  if (t && t.startsWith('UF:')) return 'Пользовательское поле';
  return t || 'Строка';
}

const paramIdx = decoded.indexOf('s:10:"PARAMETERS"');
const paramEnd = decoded.indexOf('s:9:"VARIABLES"', paramIdx);
const chunk = decoded.slice(paramIdx, paramEnd);

const rows = [];
const keyRe = /s:\d+:"([^"]+)";a:7:\{/g;
let m;
const SKIP_KEYS = new Set(['Options', 'Default', 'Name', 'Type', 'Description', 'Required', 'Multiple']);

while ((m = keyRe.exec(chunk)) !== null) {
  const key = m[1];
  if (SKIP_KEYS.has(key)) continue;
  const start = m.index;
  const end = chunk.indexOf('};s:', start + 5);
  const block = chunk.slice(start, end > 0 ? end + 1 : start + 8000);

  const nameM = block.match(/s:4:"Name";s:\d+:"([^"]*)"/);
  const typeM = block.match(/s:4:"Type";s:\d+:"([^"]+)"/);
  const reqM = block.match(/s:8:"Required";s:\d+:"([01])"/);
  const multM = block.match(/s:8:"Multiple";s:\d+:"([01])"/);

  rows.push({
    code: key,
    label: nameM ? nameM[1] : key,
    type: typeM ? typeM[1] : 'string',
    typeRu: typeRu(typeM ? typeM[1] : 'string'),
    required: reqM ? reqM[1] === '1' : false,
    multiple: multM ? multM[1] === '1' : false,
  });
}

const outMd = path.join(root, 'export', 'bp-608-parameters-table.md');
const lines = [
  '# BP 608 — параметры бизнес-процесса',
  '',
  'Только поля из блока `PARAMETERS` экспорта `bp-608.bpt` (ik-navigator).',
  '',
  '| Код параметра | Подпись | Тип | Обязательный | Множественный |',
  '|---------------|---------|-----|--------------|---------------|',
  ...rows.map(
    (r) =>
      `| \`${r.code}\` | ${r.label} | ${r.typeRu} | ${r.required ? '**Да**' : 'Нет'} | ${r.multiple ? 'Да' : 'Нет'} |`
  ),
  '',
  `Всего: **${rows.length}** параметров.`,
  '',
];
fs.writeFileSync(outMd, lines.join('\n'), 'utf8');
fs.writeFileSync(path.join(root, 'export', 'bp-608-parameters-table.json'), JSON.stringify(rows, null, 2), 'utf8');
console.log('Parameters:', rows.length);
rows.forEach((r) => console.log(r.code, '|', r.label, '|', r.typeRu, '|', r.required ? 'ДА' : 'нет'));
