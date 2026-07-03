'use strict';

/**
 * Стабильный HTTPS-хостинг без туннеля (surge.sh).
 * Один раз: npx surge login
 * Затем: npm run publish:surge
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'app', 'public');
const DOMAIN = process.env.DEAL_CARD_BG_SURGE_DOMAIN || 'deal-card-bg-b24.surge.sh';
const OUT_STATIC = path.join(ROOT, '.static-url');
const OUT_JSON = path.join(ROOT, 'static-urls.json');

function main() {
  console.log(`Публикация на https://${DOMAIN} …\n`);

  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  execSync(`${npx} --yes surge "${PUBLIC}" --domain ${DOMAIN}`, {
    stdio: 'inherit',
    cwd: ROOT,
    env: process.env,
  });

  const installUrl = `https://${DOMAIN}/install.html`;
  const urls = {
    install: installUrl,
    fieldHandler: `https://${DOMAIN}/field-handler.html`,
    tab: `https://${DOMAIN}/tab.html`,
    publishedAt: new Date().toISOString(),
    host: 'surge',
  };

  fs.writeFileSync(OUT_STATIC, installUrl, 'utf8');
  fs.writeFileSync(OUT_JSON, JSON.stringify(urls, null, 2));

  console.log('');
  console.log('=== Стабильные URL (без туннеля и без Диска) ===');
  console.log(installUrl);
  console.log('');
  console.log('Дальше:');
  console.log('  1. Разработчикам → приложение → Обработчик и Установка = URL выше');
  console.log('  2. Сохранить → Переустановить');
  console.log('  3. npm run verify');
  console.log('  4. npm run app:stop — ПК больше не нужен');
}

main();
