'use strict';

require('../lib/load-env');

/**
 * Регистрация чат-бота (Chatbots 2.0) на портале Б24.
 * Вебхук: B24_TEST_WEBHOOK из Личное/Работа/bitrix24/.env
 */
const { callRest } = require('../lib/b24');

const CODE = process.env.B24_BOT_CODE || 'crm_report_bot';
const BOT_TOKEN = process.env.B24_BOT_TOKEN || 'crm_report_bot_tok';
const HANDLER_URL = process.env.B24_HANDLER_URL;

if (!HANDLER_URL) {
  console.error('Задайте B24_HANDLER_URL — публичный HTTPS-адрес обработчика');
  process.exit(1);
}

async function main() {
  const res = await callRest('imbot.v2.Bot.register', {
    fields: {
      code: CODE,
      botToken: BOT_TOKEN,
      type: 'bot',
      eventMode: 'webhook',
      webhookUrl: HANDLER_URL,
      properties: {
        name: 'CRM Отчёты',
        lastName: 'Бот',
        color: 'PURPLE',
        workPosition: 'Отчёты по CRM',
      },
    },
  });

  const botId = res.result?.bot?.id;
  if (!botId) {
    console.error('Неожиданный ответ:', JSON.stringify(res, null, 2));
    process.exit(1);
  }

  console.log('Бот зарегистрирован (imbot.v2).');
  console.log('BOT_ID:', botId);
  console.log('');
  console.log('Добавьте в .env:');
  console.log(`B24_BOT_ID=${botId}`);
  console.log(`B24_BOT_TOKEN=${BOT_TOKEN}`);
  console.log(`B24_HANDLER_URL=${HANDLER_URL}`);
}

main().catch((err) => {
  console.error('Ошибка регистрации:', err.message);
  if (err.code === 'insufficient_scope') {
    console.error('Проверьте права вебхука: im, imbot, crm, user');
  }
  process.exit(1);
});
