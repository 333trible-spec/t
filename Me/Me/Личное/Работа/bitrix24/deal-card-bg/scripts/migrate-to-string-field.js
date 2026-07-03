'use strict';

/**
 * Строковое поле UF_CRM_DEAL_CARD_BG — хранит hex (#FFF8E1) или пусто.
 * npm run migrate:string
 */
require('../lib/load-env');
const { callRest } = require('../lib/b24');
const { UF_NAME } = require('../lib/colors');

const HEX_VALUES = {
  '': '',
  '#FFF8E1': 'Бронь',
  '#E3F2FD': 'Оформление',
  '#F3E5F5': 'Рассрочка',
  '#FFFDE7': 'VIP',
  '#FFEBEE': 'Срочно',
  '#E8F5E9': 'Успех',
  '#F5F5F5': 'Провал',
};

async function main() {
  const { result } = await callRest('crm.deal.userfield.list', {});
  const field = (result || []).find((f) => f.FIELD_NAME === UF_NAME);

  if (field?.USER_TYPE_ID === 'string') {
    console.log(`${UF_NAME} уже string — ок`);
    return;
  }

  console.log(`Было: ${field?.USER_TYPE_ID || 'нет поля'}`);

  if (field) {
    await callRest('crm.deal.userfield.delete', { id: field.ID });
    console.log('Старое поле удалено');
  }

  const { result: newId } = await callRest('crm.deal.userfield.add', {
    fields: {
      FIELD_NAME: 'DEAL_CARD_BG',
      USER_TYPE_ID: 'string',
      XML_ID: 'DEAL_CARD_BG',
      MANDATORY: 'N',
      SHOW_IN_LIST: 'Y',
      EDIT_IN_LIST: 'Y',
      SHOW_FILTER: 'N',
      SETTINGS: { DEFAULT_VALUE: '', SIZE: 20 },
      EDIT_FORM_LABEL: 'Цвет фона (hex)',
      LIST_COLUMN_LABEL: 'Фон',
    },
  });

  console.log(`Создано string-поле ${UF_NAME}, ID ${newId}`);
  console.log('Значения: пусто или #FFF8E1, #E3F2FD, …');
  console.log(Object.keys(HEX_VALUES).filter(Boolean).join(', '));
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
