'use strict';

/**
 * Исправляет USER_TYPE_ID поля сделки на rest_<appId>_deal_card_bg (виджет CRM).
 * Запуск: npm run fix:field
 */
require('../lib/load-env');
const { callRest } = require('../lib/b24');

const UF = 'UF_CRM_DEAL_CARD_BG';
const USER_TYPE = 'deal_card_bg';
const APP_ID = Number(process.env.DEAL_CARD_BG_APP_ID || 1);
const CRM_TYPE = `rest_${APP_ID}_${USER_TYPE}`;

function isWidgetLike(id) {
  if (!id) return false;
  const s = String(id);
  return s === USER_TYPE || s === CRM_TYPE || s.includes('deal_card_bg');
}

async function main() {
  const { result } = await callRest('crm.deal.userfield.list', {});
  const field = (result || []).find((f) => f.FIELD_NAME === UF);
  if (!field) {
    console.log(`Поле ${UF} не найдено. Сначала переустановите приложение (install.html).`);
    return;
  }

  console.log(`Поле ID ${field.ID}, тип: ${field.USER_TYPE_ID}`);

  if (field.USER_TYPE_ID === CRM_TYPE) {
    console.log(`Уже ${CRM_TYPE} — менять не нужно.`);
    return;
  }

  console.log(`Меняем «${field.USER_TYPE_ID}» → ${CRM_TYPE}…`);

  try {
    await callRest('crm.deal.userfield.update', {
      id: field.ID,
      fields: {
        USER_TYPE_ID: CRM_TYPE,
        EDIT_FORM_LABEL: 'Цвет фона карточки',
        LIST_COLUMN_LABEL: 'Фон',
        SETTINGS: { DEFAULT_VALUE: '', HEIGHT: 56 },
      },
    });
    console.log(`Обновлено → ${CRM_TYPE}`);
  } catch (e) {
    console.log('Прямое обновление не удалось:', e.message);
    console.log('Удаляем и создаём заново (hex в сделках сохранится по FIELD_NAME)…');
    await callRest('crm.deal.userfield.delete', { id: field.ID });
    const { result: newId } = await callRest('crm.deal.userfield.add', {
      fields: {
        FIELD_NAME: 'DEAL_CARD_BG',
        USER_TYPE_ID: CRM_TYPE,
        XML_ID: 'DEAL_CARD_BG',
        MANDATORY: 'N',
        EDIT_FORM_LABEL: 'Цвет фона карточки',
        LIST_COLUMN_LABEL: 'Фон',
        SETTINGS: { DEFAULT_VALUE: '', HEIGHT: 56 },
      },
    });
    console.log(`Создано поле ${UF}, ID ${newId}, тип ${CRM_TYPE}`);
  }

  const check = await callRest('crm.deal.userfield.list', {});
  const after = (check.result || []).find((f) => f.FIELD_NAME === UF);
  console.log('Сейчас:', after?.USER_TYPE_ID);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
