'use strict';

/**
 * Publish deal-card-bg pages to Bitrix24 Sites via REST.
 * Fallback: manual steps in ИНСТРУКЦИЯ-САЙТ-Б24.md
 */
require('../lib/load-env');
const fs = require('fs');
const path = require('path');
const { callRest } = require('../lib/b24');
const { uploadSiteScript } = require('../lib/disk-upload');

const SITE_CODE = 'deal-card-bg';
const SITE_TITLE = 'Фон карточки CRM';
const B24_SDK = 'https://api.bitrix24.com/api/v1/';

function readPage(name) {
  return fs.readFileSync(path.join(__dirname, '..', 'site', name), 'utf8');
}

function scriptTags(jsUrl) {
  const b24 = B24_SDK.replace(/'/g, "\\'");
  const js = jsUrl.replace(/'/g, "\\'");
  return `<img src="data:," width="1" height="1" alt="" onerror="(function(){function a(u){var e=document.createElement('scr'+'ipt');e.src=u;e.setAttribute('data-skip-moving','true');document.body.appendChild(e);}a('${b24}');a('${js}');this.remove();}).call(this);">`;
}

function buildInstallHtml(installJsUrl) {
  return readPage('install.html').replace('<!-- {{INSTALL_JS}} -->', scriptTags(installJsUrl));
}

function buildTabHtml(tabJsUrl) {
  return readPage('tab.html').replace('<!-- {{TAB_JS}} -->', scriptTags(tabJsUrl));
}

async function findSite() {
  const { result } = await callRest('landing.site.getList', {});
  return (result || []).find((s) => s.CODE === `/${SITE_CODE}/` || s.CODE === SITE_CODE || (s.TITLE || '').includes('Фон карточки'));
}

async function ensureSite() {
  let site = await findSite();
  if (site) {
    console.log(`Сайт уже есть: ID ${site.ID}, CODE ${site.CODE}`);
    return site;
  }
  const { result: siteId } = await callRest('landing.site.add', {
    fields: {
      TITLE: SITE_TITLE,
      CODE: SITE_CODE,
      TYPE: 'STORE',
      LANG: 'ru',
    },
  });
  console.log(`Создан сайт ID ${siteId}`);
  const list = await callRest('landing.site.getList', {});
  return (list.result || []).find((s) => String(s.ID) === String(siteId));
}

async function ensureLanding(siteId, code, title, html) {
  const { result: landings } = await callRest('landing.landing.getList', { siteId });
  let page = (landings || []).find((l) => l.CODE === code);
  if (!page) {
    const { result: lid } = await callRest('landing.landing.add', {
      fields: {
        SITE_ID: siteId,
        CODE: code,
        TITLE: title,
        ACTIVE: 'Y',
      },
    });
    console.log(`Страница ${code} ID ${lid}`);
    page = { ID: lid, CODE: code };
  } else {
    console.log(`Страница ${code} уже есть ID ${page.ID}`);
  }

  const { result: blocks } = await callRest('landing.block.getlist', {
    lid: page.ID,
    params: { edit_mode: 1 },
  });
  const htmlBlock = (blocks || []).find((b) => b.CODE === 'html');

  if (htmlBlock) {
    await callRest('landing.block.updatecontent', {
      block: htmlBlock.ID,
      content: html,
      lid: page.ID,
    });
    console.log(`Обновлён HTML-блок на ${code}`);
  } else {
    await callRest('landing.landing.addblock', {
      lid: page.ID,
      fields: { CODE: 'html', CONTENT: html, ACTIVE: 'Y' },
    });
    console.log(`Добавлен HTML-блок на ${code}`);
  }

  await callRest('landing.landing.publication', { lid: page.ID });
  console.log(`Страница ${code} опубликована`);

  return page;
}

async function publishSite(siteId) {
  try {
    await callRest('landing.site.publication', { id: siteId });
    console.log('Сайт опубликован');
  } catch (e) {
    console.log('publish:', e.message, '— опубликуйте вручную в редакторе сайта');
  }
}

async function main() {
  const site = await ensureSite();
  if (!site) throw new Error('Не удалось получить сайт');

  console.log('Загрузка JS на Диск портала…');
  const installJsUrl = await uploadSiteScript('install.js');
  const tabJsUrl = await uploadSiteScript('tab.js');
  console.log('install.js →', installJsUrl);
  console.log('tab.js →', tabJsUrl);

  const installPage = await ensureLanding(site.ID, 'install', 'Установка', buildInstallHtml(installJsUrl));
  const tabPage = await ensureLanding(site.ID, 'tab', 'Цвет фона', buildTabHtml(tabJsUrl));
  await publishSite(site.ID);

  const { result: installUrlRaw } = await callRest('landing.landing.getPublicUrl', { lid: installPage.ID });
  const { result: tabUrlRaw } = await callRest('landing.landing.getPublicUrl', { lid: tabPage.ID });
  const installUrl = String(installUrlRaw || '').replace(/\/$/, '') + '/';
  const tabUrl = String(tabUrlRaw || '').replace(/\/$/, '') + '/';

  console.log('');
  console.log('URL для локального приложения (оба поля):');
  console.log(installUrl);
  console.log('');
  console.log('Вкладка:');
  console.log(tabUrl);
  console.log('');
  console.log('Важно: JS на Диске + страницы на bitrix24shop.ru.');
  console.log('Подсветку всей карточки даёт userscript (userscript/deal-card-bg.user.js).');
  console.log('');
  console.log('Дальше: ИНСТРУКЦИЯ-САЙТ-Б24.md → шаг 2');
}

main().catch((err) => {
  console.error(err.message || err);
  console.error('');
  console.error('REST не сработал — сделайте вручную: ИНСТРУКЦИЯ-САЙТ-Б24.md');
  process.exit(1);
});
