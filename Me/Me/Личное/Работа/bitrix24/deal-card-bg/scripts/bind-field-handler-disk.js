'use strict';

/** Привязывает userfieldtype HANDLER к field-handler на Диске (same-origin → вся карточка). */
require('../lib/load-env');
const fs = require('fs');
const path = require('path');
const { callRest } = require('../lib/b24');

const USER_TYPE = 'deal_card_bg';
const JSON_PATH = path.join(__dirname, '..', 'app', 'public', 'field-handler-url.json');

async function main() {
  if (!fs.existsSync(JSON_PATH)) {
    throw new Error('Нет field-handler-url.json — сначала: npm run publish:field-handler');
  }
  const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
  const handler = String(data.handlerBindUrl || data.handlerDownloadUrl || '').trim();
  if (!handler) throw new Error('handlerBindUrl пуст в field-handler-url.json');

  const payload = {
    USER_TYPE_ID: USER_TYPE,
    HANDLER: handler,
    TITLE: 'Цвет фона карточки',
    DESCRIPTION: 'Палитра фона сделки — цвет на всю карточку',
    OPTIONS: { height: 56 },
  };

  try {
    await callRest('userfieldtype.update', payload);
    console.log('userfieldtype.update OK');
  } catch (e) {
    console.log('update:', e.message, '→ add');
    await callRest('userfieldtype.add', payload);
    console.log('userfieldtype.add OK');
  }

  console.log('HANDLER →', handler);
  console.log('Откройте сделку и Ctrl+F5. Выберите цвет — заливка на все блоки карточки.');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
