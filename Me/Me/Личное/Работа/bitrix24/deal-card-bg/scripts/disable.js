'use strict';

/**
 * Временно отключить deal-card-bg на тестовом портале:
 * - деактивировать сайт и страницы install/tab
 * - остановить локальный сервер и туннель (stop-app.ps1)
 *
 * Вкладку в CRM убирает только удаление приложения на портале (см. вывод скрипта).
 */
require('../lib/load-env');
const { execSync } = require('child_process');
const path = require('path');
const { callRest } = require('../lib/b24');

const SITE_CODE = 'deal-card-bg';
const PAGE_CODES = ['install', 'tab'];

async function findSite() {
  const { result } = await callRest('landing.site.getList', {});
  return (result || []).find(
    (s) => s.CODE === `/${SITE_CODE}/` || s.CODE === SITE_CODE || (s.TITLE || '').includes('Фон карточки'),
  );
}

async function deactivateSite(site) {
  await callRest('landing.site.update', { id: site.ID, fields: { ACTIVE: 'N' } });
  console.log(`Сайт «${site.TITLE}» деактивирован (ID ${site.ID})`);

  const { result: landings } = await callRest('landing.landing.getList', { siteId: site.ID });
  for (const code of PAGE_CODES) {
    const page = (landings || []).find((l) => l.CODE === code);
    if (!page) continue;
    await callRest('landing.landing.update', { lid: page.ID, fields: { ACTIVE: 'N' } });
    console.log(`Страница ${code} деактивирована (ID ${page.ID})`);
  }
}

function stopLocal() {
  const ps1 = path.join(__dirname, 'stop-app.ps1');
  execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${ps1}"`, {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
  });
}

async function main() {
  const site = await findSite();
  if (site) await deactivateSite(site);
  else console.log('Сайт deal-card-bg не найден — пропуск REST');

  stopLocal();

  console.log('');
  console.log('Чтобы убрать вкладку «Цвет фона» в карточке сделки:');
  console.log('  Приложения → Мои приложения → «Фон карточки сделки» → Удалить');
  console.log('');
  console.log('Поле UF_CRM_DEAL_CARD_BG и цвета в сделках сохранены.');
  console.log('Включить снова: npm run site:publish → обновить URL приложения → переустановить');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
