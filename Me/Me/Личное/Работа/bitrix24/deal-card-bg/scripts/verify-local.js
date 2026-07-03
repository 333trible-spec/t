'use strict';

/** Проверка локального сервера (без туннеля). */
const PORT = process.env.DEAL_CARD_BG_PORT || 3848;
const BASE = `http://127.0.0.1:${PORT}`;

async function check(name, url, needle) {
  const get = await fetch(url);
  const post = await fetch(url, { method: 'POST' });
  const body = await get.text();
  const ok =
    get.status === 200 &&
    post.status === 200 &&
    /text\/html/i.test(get.headers.get('content-type') || '') &&
    body.includes(needle);
  console.log(ok ? 'OK' : 'FAIL', name, `GET ${get.status}`, `POST ${post.status}`);
  return ok;
}

async function main() {
  console.log('Локальный сервер:', BASE);
  console.log('');
  let ok = true;
  ok = (await check('install.html', `${BASE}/install.html`, 'BX24')) && ok;
  ok = (await check('field-handler.html', `${BASE}/field-handler.html`, 'PALETTE')) && ok;
  ok = (await check('tab.html', `${BASE}/tab.html`, 'PALETTE')) && ok;
  const health = await fetch(`${BASE}/health`);
  console.log(health.ok ? 'OK' : 'FAIL', 'health', health.status);
  console.log('');
  if (!ok) {
    console.error('Запустите: npm run app:start');
    process.exit(1);
  }
  console.log('Локально всё OK. Для Б24: npm run start (туннель) → URL в настройках приложения.');
}

main().catch((e) => {
  console.error(e.message);
  console.error('Сервер не запущен. Выполните: npm run app:start');
  process.exit(1);
});
