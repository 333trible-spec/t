'use strict';

/**
 * Проверка URL обработчиков: HTML должен открываться inline (не attachment).
 * Читает .static-url, иначе .tunnel-url, иначе аргумент CLI.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function readUrlFile(name) {
  const p = path.join(ROOT, name);
  if (!fs.existsSync(p)) return null;
  const raw = fs.readFileSync(p, 'utf8').trim();
  return raw || null;
}

function baseFromInstallUrl(url) {
  if (!url) return null;
  return url.replace(/\/install\.html$/i, '');
}

function resolveBase() {
  const arg = process.argv[2];
  if (arg) return baseFromInstallUrl(arg) || arg.replace(/\/$/, '');
  const staticUrl = readUrlFile('.static-url');
  if (staticUrl) return baseFromInstallUrl(staticUrl) || staticUrl.replace(/\/$/, '');
  const tunnel = readUrlFile('.tunnel-url');
  if (tunnel) return baseFromInstallUrl(tunnel);
  return null;
}

async function checkPage(label, url, mustHave) {
  const res = await fetch(url, {
    method: 'GET',
    redirect: 'follow',
    headers: { 'Bypass-Tunnel-Reminder': '1' },
  });
  const post = await fetch(url, {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Bypass-Tunnel-Reminder': '1' },
  });
  const cd = res.headers.get('content-disposition') || '';
  const ct = res.headers.get('content-type') || '';
  const body = await res.text();
  const attachment = /attachment/i.test(cd);
  const ok =
    res.status === 200 &&
    post.status === 200 &&
    !attachment &&
    /text\/html/i.test(ct) &&
    (!mustHave || body.includes(mustHave));
  return { label, url, status: res.status, postStatus: post.status, ct, cd, ok, has: mustHave ? body.includes(mustHave) : true };
}

async function main() {
  const base = resolveBase();
  if (!base) {
    console.error('Нет URL. Запустите npm run start или npm run publish:surge');
    process.exit(1);
  }

  console.log('Base:', base);
  console.log('');

  const pages = [
    ['install.html', `${base}/install.html`, 'BX24'],
    ['app.html', `${base}/app.html`, 'Фон карточки сделки'],
    ['field-handler.html', `${base}/field-handler.html`, 'PALETTE'],
    ['tab.html', `${base}/tab.html`, 'PALETTE'],
    ['worker.html', `${base}/worker.html`, 'b24-deal-card-bg'],
    ['paint-bridge.js', `${base}/paint-bridge.js`, '__b24DealCardBgBridge'],
    ['portal-worker-url.json', `${base}/portal-worker-url.json`, 'workerUrl'],
    ['version.json', `${base}/version.json`, 'builtAt'],
  ];

  let failed = 0;
  for (const [name, url, needle] of pages) {
    try {
      const r = await checkPage(name, url, needle);
      const mark = r.ok ? 'OK' : 'FAIL';
      if (!r.ok) failed += 1;
      console.log(`${mark}  ${name}  GET ${r.status}  POST ${r.postStatus}`);
      if (r.cd) console.log(`      Content-Disposition: ${r.cd}`);
      if (!r.ok && r.postStatus === 405) {
        console.log('      → POST 405: GitHub Pages не подходит, используйте Vercel (npm run publish:vercel)');
      }
    } catch (e) {
      failed += 1;
      console.log(`FAIL  ${name}  ${e.message}`);
    }
  }

  console.log('');
  if (failed) {
    console.log(`Провалено: ${failed}. Не используйте disk DOWNLOAD_URL в настройках приложения.`);
    process.exit(1);
  }
  console.log('Все проверки пройдены. Вставьте в Б24:');
  console.log(`${base}/install.html`);
}

main();
