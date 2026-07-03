(function () {
  'use strict';

  const TAB_TITLE = 'Цвет фона';
  const UF = 'UF_CRM_DEAL_CARD_BG';

  function log(msg, ok) {
    const li = document.createElement('li');
    li.textContent = msg;
    li.className = ok === true ? 'ok' : ok === false ? 'err' : 'warn';
    document.getElementById('log').appendChild(li);
  }

  function call(method, params) {
    return new Promise((resolve, reject) => {
      BX24.callMethod(method, params, (r) => {
        if (r.error()) reject(new Error(r.error() + ': ' + r.error_description()));
        else resolve(r.data());
      });
    });
  }

  function tabHandlerUrl() {
    const path = location.pathname.replace(/\/+$/, '');
    if (path.endsWith('/install')) return location.origin + path.slice(0, -8) + '/tab/';
    if (path.endsWith('/install.html')) return location.origin + path.replace(/install\.html$/, 'tab.html');
    if (!path || path === '/') return location.origin + '/tab/';
    return location.origin + '/tab/';
  }

  async function ensureDealField() {
    const rows = await call('crm.deal.userfield.list');
    const exists = (rows || []).some((f) => f.FIELD_NAME === UF);
    if (exists) {
      log('Поле ' + UF + ' уже есть', true);
      return;
    }
    await call('crm.deal.userfield.add', {
      fields: {
        FIELD_NAME: 'DEAL_CARD_BG',
        USER_TYPE_ID: 'enumeration',
        XML_ID: 'DEAL_CARD_BG',
        MANDATORY: 'N',
        LIST: [
          { VALUE: 'Без фона', XML_ID: '', SORT: 100, DEF: 'Y' },
          { VALUE: 'Бронь', XML_ID: '#FFF8E1', SORT: 200 },
          { VALUE: 'Оформление', XML_ID: '#E3F2FD', SORT: 300 },
          { VALUE: 'Рассрочка', XML_ID: '#F3E5F5', SORT: 400 },
          { VALUE: 'VIP', XML_ID: '#FFFDE7', SORT: 500 },
          { VALUE: 'Срочно', XML_ID: '#FFEBEE', SORT: 600 },
          { VALUE: 'Успех', XML_ID: '#E8F5E9', SORT: 700 },
          { VALUE: 'Провал', XML_ID: '#F5F5F5', SORT: 800 },
        ],
        EDIT_FORM_LABEL: 'Цвет фона карточки',
        LIST_COLUMN_LABEL: 'Фон карточки',
      },
    });
    log('Создано поле ' + UF, true);
  }

  async function bindTab() {
    const tabHandler = tabHandlerUrl();
    try {
      await call('placement.bind', {
        PLACEMENT: 'CRM_DEAL_DETAIL_TAB',
        HANDLER: tabHandler,
        TITLE: TAB_TITLE,
        DESCRIPTION: 'Палитра фона сделки',
        LANG_ALL: { ru: { TITLE: TAB_TITLE, DESCRIPTION: 'Палитра фона' } },
      });
      log('Вкладка «' + TAB_TITLE + '» → ' + tabHandler, true);
    } catch (e) {
      const msg = e.message || '';
      if (/binded|bind/i.test(msg)) log('Вкладка уже зарегистрирована', true);
      else throw e;
    }
  }

  function start() {
    const status = document.getElementById('status');
    if (typeof BX24 === 'undefined') {
      status.textContent = 'Ошибка: BX24 SDK не загружен';
      log('Скрипт api.bitrix24.com не подключился. Переустановите приложение из портала.', false);
      return;
    }
    BX24.init(async () => {
      try {
        await ensureDealField();
        await bindTab();
        status.textContent = 'Готово. Откройте сделку → вкладка «Цвет фона».';
        BX24.installFinish();
      } catch (e) {
        status.textContent = 'Ошибка установки';
        log(e.message || String(e), false);
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
