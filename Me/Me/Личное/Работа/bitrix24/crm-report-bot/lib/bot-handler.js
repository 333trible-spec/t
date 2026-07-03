'use strict';

const { callRest } = require('./b24');
const { buildReport } = require('./reports');

function botToken() {
  return process.env.B24_BOT_TOKEN || '';
}

async function sendBotMessageV2(botId, dialogId, text) {
  const token = botToken();
  if (!token) throw new Error('B24_BOT_TOKEN не задан');
  await callRest('imbot.v2.Chat.Message.send', {
    botId: Number(botId),
    botToken: token,
    dialogId: String(dialogId),
    fields: { message: text },
  });
}

async function handleBitrixEvent(body) {
  const event = body?.event;
  const webhook = process.env.B24_WEBHOOK || process.env.B24_TEST_WEBHOOK;
  const botId = process.env.B24_BOT_ID;

  // Chatbots 2.0
  if (event === 'ONIMBOTV2JOINCHAT') {
    const data = body?.data || {};
    const id = data.bot?.id || botId;
    const dialogId = data.chat?.dialogId;
    if (id && dialogId) {
      await sendBotMessageV2(
        id,
        dialogId,
        'Привет! Я собираю отчёты из CRM. Напишите «помощь» или «отчет».',
      );
    }
    return { status: 'ok' };
  }

  if (event === 'ONIMBOTV2MESSAGEADD') {
    const data = body?.data || {};
    const id = data.bot?.id || botId;
    const dialogId = data.chat?.dialogId;
    const message = data.message?.text || '';
    const authorId = String(
      data.message?.authorId ?? data.message?.userId ?? data.user?.id ?? '',
    );

    if (!dialogId || !id) {
      return { status: 'error', error: 'missing dialogId or botId' };
    }
    if (authorId && authorId === String(id)) {
      return { status: 'ok', skipped: 'own message' };
    }

    let reply;
    try {
      reply = await buildReport(message, webhook);
    } catch (err) {
      reply = `Ошибка отчёта: ${err.message}`;
    }

    await sendBotMessageV2(id, dialogId, reply);
    return { status: 'ok' };
  }

  // Legacy imbot (на случай старого портала)
  if (event === 'ONIMBOTJOINCHAT') {
    return { ok: true, skipped: 'legacy event — use imbot.v2' };
  }
  if (event === 'ONIMBOTMESSAGEADD') {
    return { ok: true, skipped: 'legacy event — use imbot.v2' };
  }

  if (event === 'ONAPPINSTALL') {
    return { status: 'ok', note: 'app installed' };
  }

  return { status: 'ok', skipped: event || 'unknown' };
}

module.exports = { handleBitrixEvent };
