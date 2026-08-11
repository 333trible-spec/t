'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const decoded = fs.readFileSync(path.join(root, 'export', 'bp-608-decoded.txt'), 'utf8');
const used = JSON.parse(fs.readFileSync(path.join(root, 'export', 'bp-608-fields-all.json'), 'utf8'));

const TYPE_RU = {
  string: 'Строка',
  int: 'Целое число',
  integer: 'Целое число',
  select: 'Список',
  enumeration: 'Список',
  bool: 'Да/Нет',
  boolean: 'Да/Нет',
  user: 'Пользователь',
  employee: 'Сотрудник',
  crm: 'Привязка к CRM',
  crm_category: 'Воронка',
  crm_status: 'Стадия/справочник',
  datetime: 'Дата и время',
  date: 'Дата',
  time: 'Время',
  money: 'Деньги',
  double: 'Число',
  file: 'Файл',
  url: 'Ссылка',
  text: 'Текст',
  'UF:money': 'Деньги',
  'UF:crm': 'Привязка к CRM',
  deal_stage: 'Стадия сделки',
  email: 'E-mail',
};

function typeRu(t) {
  return TYPE_RU[t] || (t && t.startsWith('UF:') ? 'Пользовательское поле' : t) || 'Строка';
}

function yesNo(v) {
  return v ? 'Да' : 'Нет';
}

function parseBlock(chunk, code) {
  const esc = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(
    `s:\\d+:"${esc}";a:\\d+:\\{[\\s\\S]*?s:4:"Name";s:\\d+:"([^"]*)"[\\s\\S]*?s:4:"Type";s:\\d+:"([^"]+)"[\\s\\S]*?s:8:"Required";(?:s:\\d+:"([01])"|b:([01]))`,
    'm'
  );
  const m = chunk.match(re);
  if (!m) return null;
  const required = m[3] === '1' || m[4] === '1';
  return { label: m[1], type: m[2], required };
}

const paramIdx = decoded.indexOf('s:10:"PARAMETERS"');
const paramEnd = decoded.indexOf('s:9:"VARIABLES"', paramIdx);
const paramChunk = decoded.slice(paramIdx, paramEnd);

const docIdx = decoded.indexOf('s:15:"DOCUMENT_FIELDS"');
const docChunk = decoded.slice(docIdx);

const bpParams = new Map();
const paramKeyRe = /s:\d+:"([^"]+)";a:7:\{/g;
let pm;
while ((pm = paramKeyRe.exec(paramChunk)) !== null) {
  const key = pm[1];
  const start = pm.index;
  const next = paramChunk.indexOf('};s:', start + 5);
  const block = paramChunk.slice(start, next > 0 ? next + 1 : start + 4000);
  const info = parseBlock(block, key);
  if (info) bpParams.set(key, info);
}

const docFields = new Map();
// pre-scan all DOCUMENT_FIELDS keys used in export
const docKeyRe = /s:\d+:"([^"]+)";a:\d+:\{s:4:"Name";s:\d+:"/g;
let dm;
let count = 0;
while ((dm = docKeyRe.exec(docChunk)) !== null && count < 5000) {
  const key = dm[1];
  if (key === 'Name' || key === 'Type') continue;
  const start = dm.index;
  const block = docChunk.slice(start, start + 2500);
  const info = parseBlock(block, key);
  if (info) {
    docFields.set(key, { ...info, requiredCrm: info.required });
    count++;
  }
}

const ENTITY_RU = { BP_PARAM: 'Параметр БП', CONTACT: 'Контакт', DEAL: 'Сделка' };

const rows = used.map((f) => {
  let label = f.label && f.label !== '—' ? f.label : '';
  let type = f.type;
  let requiredCrm = '—';
  let requiredBpStart = '—';
  let requiredBpLogic = 'Нет';

  if (f.entity === 'BP_PARAM') {
    const p = bpParams.get(f.code);
    if (p) {
      label = p.label || label;
      type = p.type;
      requiredBpStart = yesNo(p.required);
    } else {
      requiredBpStart = 'Нет';
    }
    requiredCrm = '—';
  } else {
    const d = docFields.get(f.code) || docFields.get(f.code.replace(/_PRINTABLE$/, ''));
    if (d) {
      label = d.label || label;
      type = d.type;
      requiredCrm = yesNo(d.requiredCrm);
    } else if (f.entity === 'CONTACT') {
      const d2 = docFields.get(f.code);
      if (d2) {
        label = d2.label;
        type = d2.type;
        requiredCrm = yesNo(d2.requiredCrm);
      }
    }
    requiredBpStart = '—';
  }

  if (!label) label = '—';

  if (['CONTACT.NAME', 'CONTACT.LAST_NAME', 'CONTACT.SECOND_NAME', 'CONTACT.EMAIL'].includes(f.code)) {
    requiredBpLogic = 'Уведомление, если пусто';
  }
  if (f.code === 'CONTACT_ID') requiredBpLogic = 'Да — без контакта БП останавливается';
  if (f.code === 'CATEGORY_ID') requiredBpLogic = 'Только воронки 6 или 8';
  if (f.code === 'UF_CRM_1538729147') requiredBpLogic = 'Да — ветка заявки';
  if (f.code === 'UF_CRM_1739357026') requiredBpLogic = 'Да — вызов шахматки';

  return {
    code: f.code,
    entity: ENTITY_RU[f.entity] || f.entity,
    label,
    typeRu: typeRu(type),
    requiredCrm,
    requiredBpStart,
    requiredBpLogic,
  };
});

const outMd = path.join(root, 'export', 'bp-608-fields-table.md');
const lines = [
  '# BP 608 — таблица полей',
  '',
  'Источник: `bp-608.bpt` · ik-navigator',
  '',
  '| Код | Сущность | Подпись | Тип | Обяз. в CRM | Обяз. при запуске БП | Проверка в БП |',
  '|-----|----------|---------|-----|-------------|----------------------|---------------|',
  ...rows.map(
    (r) =>
      `| \`${r.code}\` | ${r.entity} | ${r.label} | ${r.typeRu} | ${r.requiredCrm} | ${r.requiredBpStart} | ${r.requiredBpLogic} |`
  ),
  '',
  `Всего: **${rows.length}** полей.`,
  '',
];
fs.writeFileSync(outMd, lines.join('\n'), 'utf8');
fs.writeFileSync(path.join(root, 'export', 'bp-608-fields-table.json'), JSON.stringify(rows, null, 2), 'utf8');

console.log('docFields parsed:', docFields.size, 'bpParams:', bpParams.size);
console.log('BP start required:', rows.filter((r) => r.requiredBpStart === 'Да').length);
console.log('CRM required:', rows.filter((r) => r.requiredCrm === 'Да').length);
