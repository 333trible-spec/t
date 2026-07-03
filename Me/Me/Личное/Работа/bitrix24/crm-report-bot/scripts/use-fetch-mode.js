'use strict';

require('../lib/load-env');
const { callRest } = require('../lib/b24');

const botId = Number(process.env.B24_BOT_ID);
const botToken = process.env.B24_BOT_TOKEN;

if (!botId || !botToken) {
  console.error('Нужны B24_BOT_ID и B24_BOT_TOKEN');
  process.exit(1);
}

callRest('imbot.v2.Bot.update', {
  botId,
  botToken,
  fields: { eventMode: 'fetch' },
})
  .then((res) => {
    console.log('Бот переведён в fetch mode (без туннеля). ID:', res.result?.bot?.id || botId);
  })
  .catch((err) => {
    console.error('Ошибка:', err.message);
    process.exit(1);
  });
