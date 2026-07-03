'use strict';

const { callRest } = require('./b24');
const { handleBitrixEvent } = require('./bot-handler');

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function pollEvents() {
  const botId = Number(process.env.B24_BOT_ID);
  const botToken = process.env.B24_BOT_TOKEN;
  if (!botId || !botToken) {
    console.warn('poll: пропуск — нет B24_BOT_ID / B24_BOT_TOKEN');
    return;
  }

  let offset = 0;
  console.log(`poll: старт для бота ${botId} (fetch mode)`);

  for (;;) {
    try {
      const page = await callRest('imbot.v2.Event.get', {
        botId,
        botToken,
        offset,
        limit: 50,
      });

      const events = page.result?.events ?? [];
      for (const ev of events) {
        console.log(`poll: ${ev.type}`);
        await handleBitrixEvent({ event: ev.type, data: ev.data });
      }

      if (page.result?.nextOffset != null) {
        offset = page.result.nextOffset;
      }

      const delay = page.result?.hasMore ? 2000 : 10000;
      await sleep(delay);
    } catch (err) {
      console.error('poll error:', err.message);
      await sleep(15000);
    }
  }
}

module.exports = { pollEvents };
