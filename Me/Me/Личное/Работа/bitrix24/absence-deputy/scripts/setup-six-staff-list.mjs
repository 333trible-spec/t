import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const envPath =
  process.argv[2] ||
  path.join(root, '..', '.env');
const configPath = path.join(root, 'data', 'six-staff-list.json');

const IBLOCK_TYPE = 'lists';
const LIST_CODE = 'SIX_STAFF_RECORDS';
const LIST_NAME = '6 кадров — записи';
const ALLOWED_USER_ID = 24880;

/** Видимые в UI списка + служебные (скрыты в форме Б24, нужны cron/API) */
const FIELD_SPECS = [
  {
    code: 'RECORD_TYPE',
    name: 'Тип',
    type: 'L',
    sort: 10,
    visible: true,
    list: {
      vacation: { VALUE: 'Отпуск', SORT: 10 },
      dismissal: { VALUE: 'Увольнение', SORT: 20 },
    },
  },
  {
    code: 'EMPLOYEE_NAME',
    name: 'ФИО',
    type: 'S',
    sort: 20,
    visible: true,
  },
  {
    code: 'STATUS',
    name: 'Статус',
    type: 'L',
    sort: 30,
    visible: true,
    list: {
      planned: { VALUE: 'Запланировано', SORT: 10 },
      done: { VALUE: 'Выполнено', SORT: 20 },
      cancelled: { VALUE: 'Отменено', SORT: 30 },
      error: { VALUE: 'Ошибка', SORT: 40 },
    },
  },
  {
    code: 'REPLACEMENT_NAME',
    name: 'Замещающий',
    type: 'S',
    sort: 40,
    visible: true,
    required: false,
  },
  {
    code: 'COMMENT',
    name: 'Комментарий',
    type: 'S',
    sort: 50,
    visible: true,
    required: false,
  },
  { code: 'EMPLOYEE_ID', name: 'ID сотрудника (служебное)', type: 'N', sort: 100, visible: false },
  { code: 'DATE_MAIN', name: 'Дата с (служебное)', type: 'S:Date', sort: 110, visible: false },
  { code: 'DATE_TO', name: 'Дата по (служебное)', type: 'S:Date', sort: 120, visible: false },
  { code: 'REPLACEMENT_ID', name: 'ID замещающего (служебное)', type: 'N', sort: 130, visible: false },
  { code: 'EXECUTED_AT', name: 'Выполнено (служебное)', type: 'S:DateTime', sort: 140, visible: false },
  { code: 'REQUESTED_BY', name: 'Создал (служебное)', type: 'N', sort: 150, visible: false },
  { code: 'META_JSON', name: 'Meta (служебное)', type: 'S', sort: 160, visible: false },
];

const LIST_RIGHTS = {
  ['U' + ALLOWED_USER_ID]: 'X',
  '*': 'D',
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

async function b24(base, method, params) {
  const res = await fetch((base.endsWith('/') ? base : base + '/') + method, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params || {}),
  });
  const data = await res.json();
  if (data.error) {
    const err = new Error(data.error_description || data.error);
    err.code = data.error;
    throw err;
  }
  return data;
}

const PROP_BY_CODE = {
  RECORD_TYPE: 'recordType',
  STATUS: 'status',
  EMPLOYEE_ID: 'employeeId',
  EMPLOYEE_NAME: 'employeeName',
  DATE_MAIN: 'dateMain',
  DATE_TO: 'dateTo',
  REPLACEMENT_ID: 'replacementId',
  REPLACEMENT_NAME: 'replacementName',
  COMMENT: 'comment',
  EXECUTED_AT: 'executedAt',
  REQUESTED_BY: 'requestedBy',
  META_JSON: 'metaJson',
};

function propName(code) {
  return PROP_BY_CODE[code] || code.toLowerCase();
}

async function findList(base) {
  const got = await b24(base, 'lists.get', {
    IBLOCK_TYPE_ID: IBLOCK_TYPE,
    IBLOCK_CODE: LIST_CODE,
  });
  let row = got.result;
  if (Array.isArray(row)) row = row[0];
  if (row && row.ID) return Number(row.ID);
  return null;
}

async function createList(base) {
  const created = await b24(base, 'lists.add', {
    IBLOCK_TYPE_ID: IBLOCK_TYPE,
    IBLOCK_CODE: LIST_CODE,
    FIELDS: {
      NAME: LIST_NAME,
      DESCRIPTION: 'Записи приложения «6 кадров». Доступ только user ' + ALLOWED_USER_ID,
      SORT: 500,
      BIZPROC: 'N',
    },
    MESSAGES: {
      ELEMENTS_NAME: 'Записи',
      ELEMENT_NAME: 'Запись',
      ELEMENT_ADD: 'Добавить запись',
      ELEMENT_EDIT: 'Изменить запись',
      ELEMENT_DELETE: 'Удалить запись',
    },
    RIGHTS: LIST_RIGHTS,
  });
  console.log('Создан список ID=', created.result);
  return Number(created.result);
}

async function applyRights(base, iblockId) {
  try {
    await b24(base, 'lists.update', {
      IBLOCK_TYPE_ID: IBLOCK_TYPE,
      IBLOCK_ID: iblockId,
      IBLOCK_CODE: LIST_CODE,
      RIGHTS: LIST_RIGHTS,
    });
    console.log('Права: только U' + ALLOWED_USER_ID + ' (X), остальные * (D)');
  } catch (err) {
    console.warn('lists.update RIGHTS:', err.message || err);
  }
}

function fieldSettings(spec) {
  const show = spec.visible !== false ? 'Y' : 'N';
  return {
    SHOW_ADD_FORM: show,
    SHOW_EDIT_FORM: show,
    SHOW_FIELD_PREVIEW: spec.visible !== false ? 'Y' : 'N',
    ADD_READ_ONLY_FIELD: 'N',
    EDIT_READ_ONLY_FIELD: 'N',
  };
}

async function loadFieldsMap(base, iblockId) {
  const fieldsData = await b24(base, 'lists.field.get', {
    IBLOCK_TYPE_ID: IBLOCK_TYPE,
    IBLOCK_ID: iblockId,
  });
  let fieldRows = fieldsData.result || [];
  if (!Array.isArray(fieldRows)) fieldRows = Object.values(fieldRows);
  const existingByCode = {};
  fieldRows.forEach(function (row) {
    const code = String(row.CODE || row.code || '');
    if (code) existingByCode[code] = row;
  });
  return existingByCode;
}

function isFieldRequired(spec) {
  if (spec.required === true) return 'Y';
  if (spec.required === false) return 'N';
  return spec.visible !== false ? 'Y' : 'N';
}

async function ensureField(base, iblockId, spec, existingByCode) {
  if (existingByCode[spec.code]) {
    const row = existingByCode[spec.code];
    console.log('Поле', spec.code, '→ ID', row.ID);
    if (spec.required === false) {
      try {
        await b24(base, 'lists.field.update', {
          IBLOCK_TYPE_ID: IBLOCK_TYPE,
          IBLOCK_ID: iblockId,
          FIELD_ID: row.ID,
          FIELDS: { IS_REQUIRED: 'N' },
        });
        console.log('  IS_REQUIRED=N для', spec.code);
      } catch (err) {
        console.warn('  lists.field.update', spec.code + ':', err.message || err);
      }
    }
    return row;
  }

  const fields = {
    NAME: spec.name,
    TYPE: spec.type,
    CODE: spec.code,
    IS_REQUIRED: isFieldRequired(spec),
    MULTIPLE: 'N',
    SORT: spec.sort || 100,
    SETTINGS: fieldSettings(spec),
  };

  if (spec.list) {
    fields.LIST = {};
    Object.keys(spec.list).forEach(function (key, idx) {
      fields.LIST['k' + idx] = spec.list[key];
    });
  }

  await b24(base, 'lists.field.add', {
    IBLOCK_TYPE_ID: IBLOCK_TYPE,
    IBLOCK_ID: iblockId,
    FIELDS: fields,
  });
  console.log('Добавлено поле', spec.code, '—', spec.name);

  const refreshed = await loadFieldsMap(base, iblockId);
  const found = refreshed[spec.code];
  if (!found) throw new Error('Не удалось прочитать поле ' + spec.code);
  return found;
}

async function fetchFieldDetail(base, iblockId, fieldId) {
  const data = await b24(base, 'lists.field.get', {
    IBLOCK_TYPE_ID: IBLOCK_TYPE,
    IBLOCK_ID: iblockId,
    FIELD_ID: fieldId,
  });
  let row = data.result;
  if (Array.isArray(row)) row = row[0];
  return row || null;
}

function buildEnumMap(fieldRow, spec) {
  const out = {};
  if (!spec.list) return out;

  const display = fieldRow.DISPLAY_VALUES_FORM || fieldRow.LIST || fieldRow.displayValuesForm;
  if (!display) return out;

  const wanted = Object.keys(spec.list).map(function (key) {
    return { key: key, value: spec.list[key].VALUE };
  });

  if (!Array.isArray(display) && typeof display === 'object') {
    const keys = Object.keys(display);
    if (keys.length && typeof display[keys[0]] === 'string') {
      keys.forEach(function (enumId) {
        const label = display[enumId];
        wanted.forEach(function (w) {
          if (label === w.value) out[w.key] = String(enumId);
        });
      });
      return out;
    }
  }

  const entries = Array.isArray(display) ? display : Object.values(display);
  entries.forEach(function (entry) {
    const val = entry.VALUE != null ? entry.VALUE : entry.value;
    const id = entry.ID != null ? entry.ID : entry.id;
    wanted.forEach(function (w) {
      if (val === w.value) out[w.key] = String(id);
    });
  });
  return out;
}

async function main() {
  const wh = loadWebhook();
  if (!wh) {
    console.error('NO_WEBHOOK — задайте B24_NAV_WEBHOOK');
    process.exit(1);
  }
  const base = wh.endsWith('/') ? wh : wh + '/';

  const info = await b24(base, 'app.info', {});
  const scopes = (info.result && info.result.SCOPE) || [];
  console.log('SCOPE:', scopes.join(', '));
  if (!scopes.includes('lists')) {
    console.error('\nНужен scope lists в webhook.');
    process.exit(1);
  }

  let iblockId = await findList(base);
  if (!iblockId) {
    iblockId = await createList(base);
  } else {
    console.log('Список уже есть ID=', iblockId, '(другие списки не трогаем)');
    await applyRights(base, iblockId);
  }

  let existingByCode = await loadFieldsMap(base, iblockId);
  const properties = {};

  for (let i = 0; i < FIELD_SPECS.length; i++) {
    const spec = FIELD_SPECS[i];
    let row = await ensureField(base, iblockId, spec, existingByCode);
    existingByCode = await loadFieldsMap(base, iblockId);
    row = existingByCode[spec.code] || row;

    const fieldRow = row;

    const prop = {
      id: Number(fieldRow.ID || fieldRow.id),
      code: spec.code,
      key: 'PROPERTY_' + Number(fieldRow.ID || fieldRow.id),
      label: spec.name,
      visible: spec.visible !== false,
    };
    const enumMap = buildEnumMap(fieldRow, spec);
    if (Object.keys(enumMap).length) prop.enum = enumMap;
    properties[propName(spec.code)] = prop;
  }

  const config = {
    iblockTypeId: IBLOCK_TYPE,
    iblockId: iblockId,
    iblockCode: LIST_CODE,
    name: LIST_NAME,
    allowedUserId: ALLOWED_USER_ID,
    rights: LIST_RIGHTS,
    properties: properties,
    setupAt: new Date().toISOString(),
  };

  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
  console.log('\nOK →', configPath);
  console.log('IBLOCK_ID=', iblockId);
  console.log('Поля в списке: Тип, ФИО, Статус, Замещающий, Комментарий (+ служебные скрыты)');
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
