'use strict';

/**
 * Переводит UF_CRM_DEAL_CARD_BG с виджета на стандартный список (enumeration).
 * Запуск: npm run migrate:enum
 */
require('../lib/load-env');
const { callRest } = require('../lib/b24');
const { UF_NAME, listItemsForUserfield } = require('../lib/colors');

async function main() {
  const { result } = await callRest('crm.deal.userfield.list', {});
  const field = (result || []).find((f) => f.FIELD_NAME === UF_NAME);
  if (!field) {
    console.log(`Поле ${UF_NAME} не найдено. Переустановите приложение (install.html).`);
    return;
  }

  console.log(`Было: ID ${field.ID}, тип ${field.USER_TYPE_ID}`);

  if (field.USER_TYPE_ID === 'enumeration') {
    await callRest('crm.deal.userfield.update', {
      id: field.ID,
      fields: {
        LIST: listItemsForUserfield(),
        EDIT_FORM_LABEL: 'Цвет фона карточки',
        LIST_COLUMN_LABEL: 'Фон карточки',
        SETTINGS: { DISPLAY: 'UI', LIST_HEIGHT: 1 },
      },
    });
    console.log('Поле уже enumeration — обновлён список цветов.');
    return;
  }

  console.log('Виджет не может управлять карточкой с Vercel (cross-origin). Пересоздаём как список…');
  await callRest('crm.deal.userfield.delete', { id: field.ID });

  const { result: newId } = await callRest('crm.deal.userfield.add', {
    fields: {
      FIELD_NAME: 'DEAL_CARD_BG',
      USER_TYPE_ID: 'enumeration',
      XML_ID: 'DEAL_CARD_BG',
      MANDATORY: 'N',
      MULTIPLE: 'N',
      SHOW_IN_LIST: 'Y',
      EDIT_IN_LIST: 'Y',
      SHOW_FILTER: 'Y',
      SETTINGS: { DISPLAY: 'UI', LIST_HEIGHT: 1 },
      LIST: listItemsForUserfield(),
      EDIT_FORM_LABEL: 'Цвет фона карточки',
      LIST_COLUMN_LABEL: 'Фон карточки',
      LIST_FILTER_LABEL: 'Фон карточки',
    },
  });

  console.log(`Готово: ${UF_NAME}, ID ${newId}, тип enumeration`);
  console.log('');
  console.log('На карточке: «Изменить» → «Цвет фона карточки» → «Сохранить»');
  console.log('F5 на портале после npm run publish:portal-worker');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
