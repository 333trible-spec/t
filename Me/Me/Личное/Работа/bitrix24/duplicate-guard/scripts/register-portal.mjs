/**
 * Регистрация на портале: event.bind + конфиг по умолчанию.
 * Run: node scripts/register-portal.mjs
 */
const WEBHOOK = process.env.B24_WEBHOOK_URL
  || 'https://b24-s2an91.bitrix24.ru/rest/1/81o68940r6flmrs4/';
const APP_URL = process.env.PUBLIC_APP_URL || 'https://b24-duplicate-guard.vercel.app';
const HANDLER = `${APP_URL}/api/webhook/lead-add`;
const CONFIG_KEY = 'duplicate_guard_config';

const defaultConfig = {
  version: 1,
  enabled: true,
  participatingCategoryIds: [1, 5, 7, 3],
  funnels: {
    default: {
      categoryId: 0,
      categoryName: 'Общие правила',
      enabled: true,
      activeLeadStatuses: [],
      activeDealStages: [],
      scenarios: {
        ACTIVE_LEAD_NEW_LEAD: { action: 'reject', rejectStatusId: 'JUNK' },
        ACTIVE_DEAL_CONTACT_NEW_LEAD: { action: 'reject', rejectStatusId: 'JUNK' },
        CONTACT_NEW_LEAD: { action: 'keep', rejectStatusId: 'JUNK' },
        NO_LEAD_NO_DEAL_NEW_LEAD: { action: 'keep', rejectStatusId: 'JUNK' },
        NO_DEAL_NO_CONTACT_NEW_LEAD: { action: 'keep', rejectStatusId: 'JUNK' },
      },
    },
  },
};

async function b24(method, params = {}) {
  const url = WEBHOOK.endsWith('/') ? WEBHOOK + method : WEBHOOK + '/' + method;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (data.error) throw new Error(`${data.error}: ${data.error_description || ''}`);
  return data.result;
}

async function main() {
  console.log('Portal: b24-s2an91.bitrix24.ru');
  console.log('App URL:', APP_URL);
  console.log('Webhook handler:', HANDLER);
  console.log('');

  const info = await b24('app.info');
  console.log('[ok] Webhook, CRM scope:', info.SCOPE?.includes('crm'));

  try {
    try {
      await b24('event.unbind', { event: 'ONCRMLEADADD', handler: HANDLER });
      console.log('[ok] Old bind removed (if any)');
    } catch {
      console.log('[—] No previous bind');
    }

    await b24('event.bind', { event: 'ONCRMLEADADD', handler: HANDLER });
    console.log('[+] event.bind ONCRMLEADADD →', HANDLER);
  } catch (e) {
    if (String(e.message).includes('WRONG_AUTH_TYPE')) {
      console.log('');
      console.log('[!] event.bind недоступен через входящий webhook.');
      console.log('    Создайте локальное приложение в B24 и нажмите «Установить» на:');
      console.log('    ' + APP_URL + '/install.html');
      console.log('    Инструкция: docs/B24-APP-REGISTER.md');
      return;
    }
    throw e;
  }

  try {
    await b24('app.option.set', {
      options: { [CONFIG_KEY]: JSON.stringify(defaultConfig) },
    });
    console.log('[+] Default config saved (app.option)');
  } catch (e) {
    console.log('[warn] app.option.set:', e.message);
    console.log('      Конфиг сохранится при установке из install.html');
  }

  try {
    const events = await b24('event.get', {});
    const bound = (events || []).filter((e) => e.event === 'ONCRMLEADADD');
    console.log('');
    console.log('Привязанные ONCRMLEADADD:', bound.length);
    bound.forEach((e) => console.log('  →', e.handler));
  } catch {
    console.log('[—] event.get недоступен для этого типа авторизации');
  }

  console.log('');
  console.log('Локальное приложение: docs/B24-APP-REGISTER.md');
}

main().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
