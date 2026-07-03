'use strict';

require('../lib/load-env');

const { callRest } = require('../lib/b24');

const HANDLER_URL = process.env.B24_HANDLER_URL;
const botId = Number(process.env.B24_BOT_ID);
const botToken = process.env.B24_BOT_TOKEN;

if (!HANDLER_URL || !botId || !botToken) {
  console.error('Нужны B24_HANDLER_URL, B24_BOT_ID, B24_BOT_TOKEN в .env');
  process.exit(1);
}

callRest('imbot.v2.Bot.update', {
  botId,
  botToken,
  fields: {
    eventMode: 'webhook',
    webhookUrl: HANDLER_URL,
  },
})
  .then((res) => {
    console.log('Webhook обновлён для бота', res.result?.bot?.id || botId);
    console.log('URL:', HANDLER_URL);
  })
  .catch((err) => {
    console.error('Ошибка:', err.message);
    process.exit(1);
  });
