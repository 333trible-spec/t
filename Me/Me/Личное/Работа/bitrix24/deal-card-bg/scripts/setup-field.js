'use strict';

require('../lib/load-env');
const { callRest } = require('../lib/b24');
const { FIELD_NAME, UF_NAME, listItemsForUserfield } = require('../lib/colors');

async function findExistingField() {
  const { result } = await callRest('crm.deal.userfield.list', {
    filter: { FIELD_NAME },
  });
  return (result || []).find((f) => f.FIELD_NAME === FIELD_NAME);
}

async function main() {
  const existing = await findExistingField();
  if (existing) {
    console.log(`Поле уже есть: ${UF_NAME} (ID ${existing.ID})`);
    console.log('Обновляю список цветов…');
    await callRest('crm.deal.userfield.update', {
      id: existing.ID,
      fields: {
        LIST: listItemsForUserfield(),
        EDIT_FORM_LABEL: 'Цвет фона карточки',
        LIST_COLUMN_LABEL: 'Фон карточки',
        LIST_FILTER_LABEL: 'Фон карточки',
      },
    });
    console.log('Готово.');
    return;
  }

  const { result: fieldId } = await callRest('crm.deal.userfield.add', {
    fields: {
      FIELD_NAME,
      USER_TYPE_ID: 'enumeration',
      XML_ID: FIELD_NAME,
      MANDATORY: 'N',
      MULTIPLE: 'N',
      SHOW_IN_LIST: 'Y',
      EDIT_IN_LIST: 'Y',
      IS_SEARCHABLE: 'N',
      SHOW_FILTER: 'Y',
      SETTINGS: { DISPLAY: 'LIST', LIST_HEIGHT: 1 },
      LIST: listItemsForUserfield(),
      EDIT_FORM_LABEL: 'Цвет фона карточки',
      LIST_COLUMN_LABEL: 'Фон карточки',
      LIST_FILTER_LABEL: 'Фон карточки',
    },
  });

  console.log(`Создано поле ${UF_NAME}, ID ${fieldId}`);
  console.log('');
  console.log('Дальше в портале:');
  console.log('  CRM → Сделки → открыть сделку → ⚙ → Настройка вида карточки');
  console.log('  → добавить поле «Цвет фона карточки» в нужный раздел.');
  console.log('');
  console.log('Для визуального фона установите userscript: userscript/deal-card-bg.user.js');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
