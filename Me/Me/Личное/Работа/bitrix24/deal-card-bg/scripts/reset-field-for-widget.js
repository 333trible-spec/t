'use strict';

/** Удалить UF_CRM_DEAL_CARD_BG перед переустановкой приложения (enumeration → виджет). */
require('../lib/load-env');
const { callRest } = require('../lib/b24');

async function main() {
  const { result } = await callRest('crm.deal.userfield.list', {});
  const field = (result || []).find((f) => f.FIELD_NAME === 'UF_CRM_DEAL_CARD_BG');
  if (!field) {
    console.log('Поле UF_CRM_DEAL_CARD_BG не найдено — можно переустанавливать приложение.');
    return;
  }
  console.log(`Найдено: ID ${field.ID}, тип ${field.USER_TYPE_ID}`);
  await callRest('crm.deal.userfield.delete', { id: field.ID });
  console.log('Удалено. Дальше: Переустановить локальное приложение на портале.');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
