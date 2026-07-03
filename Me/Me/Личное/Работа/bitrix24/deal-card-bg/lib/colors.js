'use strict';

/** Палитра: VALUE — подпись в CRM, xmlId — hex фона (пусто = без подсветки) */
const PALETTE = [
  { value: 'Без фона', xmlId: '', sort: 100, def: true },
  { value: 'Бронь', xmlId: '#FFF8E1', sort: 200 },
  { value: 'Оформление', xmlId: '#E3F2FD', sort: 300 },
  { value: 'Рассрочка', xmlId: '#F3E5F5', sort: 400 },
  { value: 'VIP', xmlId: '#FFFDE7', sort: 500 },
  { value: 'Срочно', xmlId: '#FFEBEE', sort: 600 },
  { value: 'Успех', xmlId: '#E8F5E9', sort: 700 },
  { value: 'Провал', xmlId: '#F5F5F5', sort: 800 },
];

const FIELD_NAME = 'DEAL_CARD_BG';
const UF_NAME = `UF_CRM_${FIELD_NAME}`;

/** Стадии воронки «Продажа недвижимости» → цвет по умолчанию (xmlId) */
const STAGE_DEFAULTS = {
  NEW: '',
  PREPARATION: '#E3F2FD',
  'C1:PREPAYMENT_INVOICE': '#FFF8E1',
  'C1:EXECUTING': '#F3E5F5',
  'C1:FINAL_INVOICE': '#E8F5E9',
  WON: '#E8F5E9',
  LOSE: '#F5F5F5',
};

function listItemsForUserfield() {
  return PALETTE.map((item) => ({
    VALUE: item.value,
    XML_ID: item.xmlId,
    SORT: item.sort,
    DEF: item.def ? 'Y' : 'N',
  }));
}

function hexByListValue(valueText) {
  const item = PALETTE.find((p) => p.value === valueText);
  return item?.xmlId || '';
}

function hexByXmlId(xmlId) {
  const item = PALETTE.find((p) => p.xmlId === xmlId);
  return item?.xmlId || '';
}

function enumIdToHex(listRows, enumId) {
  if (!enumId) return '';
  const row = listRows.find((r) => String(r.ID) === String(enumId));
  return row?.XML_ID || hexByListValue(row?.VALUE) || '';
}

module.exports = {
  PALETTE,
  FIELD_NAME,
  UF_NAME,
  STAGE_DEFAULTS,
  listItemsForUserfield,
  hexByListValue,
  hexByXmlId,
  enumIdToHex,
};
