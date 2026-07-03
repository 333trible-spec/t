/**
 * Общая логика подсветки карточки сделки (userscript, bookmarklet, worker).
 * Без зависимостей — можно вставлять в браузер как есть.
 */
(function (root) {
  'use strict';

  const UF = 'UF_CRM_DEAL_CARD_BG';
  const STYLE_ID = 'b24-deal-card-bg-style';
  const HEX = {
    '': '',
    '#fff8e1': '#FFF8E1',
    '#e3f2fd': '#E3F2FD',
    '#f3e5f5': '#F3E5F5',
    '#fffde7': '#FFFDE7',
    '#ffebee': '#FFEBEE',
    '#e8f5e9': '#E8F5E9',
    '#f5f5f5': '#F5F5F5',
  };
  const MSG_TYPE = 'b24-deal-card-bg';
  const LABEL_HEX = {
    'Без фона': '',
    Бронь: '#FFF8E1',
    Оформление: '#E3F2FD',
    Рассрочка: '#F3E5F5',
    VIP: '#FFFDE7',
    Срочно: '#FFEBEE',
    Успех: '#E8F5E9',
    Провал: '#F5F5F5',
  };
  const CARD_SELECTORS = [
    '.ui-page-slider-wrapper',
    '.ui-page-slider-content',
    '#ui-page-slider-content',
    '.ui-side-panel-wrap',
    '.ui-side-panel-content',
    '.ui-side-panel',
    '.ui-slider-page',
    '.crm-entity-widget-content',
    '.crm-entity-card-container',
    '.crm-entity-card-widget',
    '.ui-entity-wrap',
    '[data-role="entity-editor"]',
    '.ui-entity-editor-column-content',
  ];

  function dealIdFromUrl(href) {
    const m = String(href || root.location.href).match(/\/crm\/deal\/details\/(\d+)/i);
    return m ? m[1] : null;
  }

  function normalizeHex(xmlId) {
    if (!xmlId) return '';
    const key = String(xmlId).trim().toLowerCase();
    return HEX[key] || (key.startsWith('#') ? key.toUpperCase() : '');
  }

  function hexFromRaw(raw, list) {
    if (raw === null || raw === undefined || raw === '') return '';
    const s = String(raw).trim();
    if (Object.prototype.hasOwnProperty.call(LABEL_HEX, s)) return LABEL_HEX[s];
    const byLabel = normalizeHex(s);
    if (byLabel) return byLabel;
    const row = (list || []).find((r) => String(r.ID) === s || r.VALUE === s);
    if (!row) return '';
    if (Object.prototype.hasOwnProperty.call(LABEL_HEX, row.VALUE)) return LABEL_HEX[row.VALUE];
    return normalizeHex(row.XML_ID || '');
  }

  function portalDocument(startWin) {
    let win = startWin || root;
    let doc = null;
    for (let i = 0; i < 12; i += 1) {
      try {
        void win.document.body;
        doc = win.document;
      } catch (_) {
        break;
      }
      if (!win.parent || win.parent === win) break;
      try {
        void win.parent.document.body;
        win = win.parent;
      } catch (_) {
        break;
      }
    }
    return doc;
  }

  function applyBackground(hex, doc) {
    const d = doc || root.document;
    let style = d.getElementById(STYLE_ID);
    if (!hex) {
      style?.remove();
      CARD_SELECTORS.forEach((sel) => {
        d.querySelectorAll(sel).forEach((el) => {
          el.style.backgroundColor = '';
        });
      });
      return;
    }
    if (!style) {
      style = d.createElement('style');
      style.id = STYLE_ID;
      d.head.appendChild(style);
    }
    style.textContent = CARD_SELECTORS.map(
      (sel) => `${sel}{background-color:${hex}!important;transition:background-color .25s ease}`,
    ).join('');
  }

  function restCall(method, params) {
    return new Promise((resolve, reject) => {
      const bx = root.BX || root.parent?.BX || root.top?.BX;
      if (!bx?.rest?.callMethod) {
        reject(new Error('BX.rest недоступен'));
        return;
      }
      bx.rest.callMethod(method, params, (res) => {
        if (res.error()) reject(new Error(res.error()));
        else resolve(res.data());
      });
    });
  }

  let fieldListCache = null;

  async function loadFieldList() {
    if (fieldListCache) return fieldListCache;
    const rows = await restCall('crm.deal.userfield.list', { filter: { FIELD_NAME: 'DEAL_CARD_BG' } });
    const field = (rows || []).find((f) => f.FIELD_NAME === 'DEAL_CARD_BG');
    fieldListCache = field?.LIST || [];
    return fieldListCache;
  }

  async function hexFromDeal(dealId) {
    const deal = await restCall('crm.deal.get', { id: dealId, select: [UF, 'ID'] });
    const raw = deal[UF];
    if (!raw) return '';
    const list = await loadFieldList();
    return hexFromRaw(raw, list);
  }

  function applyPortalBackground(hex, startWin) {
    const doc = portalDocument(startWin);
    if (!doc) return false;
    applyBackground(hex, doc);
    return true;
  }

  function broadcastPaint(hex, startWin) {
    try {
      (startWin || root).top.postMessage({ type: MSG_TYPE, hex: hex || '' }, '*');
    } catch (_) {}
    return applyPortalBackground(hex, startWin);
  }

  async function refreshDealCardBg(targetDoc) {
    const dealId = dealIdFromUrl();
    if (!dealId) {
      applyBackground('', targetDoc);
      return null;
    }
    const hex = await hexFromDeal(dealId);
    applyBackground(hex, targetDoc);
    return hex;
  }

  function listenForTabPaint() {
    if (root.__b24DealCardBgListener) return;
    root.__b24DealCardBgListener = true;
    root.addEventListener('message', (event) => {
      const data = event.data;
      if (!data || data.type !== MSG_TYPE) return;
      applyBackground(data.hex || '', root.document);
    });
  }

  root.B24DealCardBg = {
    UF,
    MSG_TYPE,
    STYLE_ID,
    LABEL_HEX,
    CARD_SELECTORS,
    dealIdFromUrl,
    normalizeHex,
    hexFromRaw,
    portalDocument,
    applyBackground,
    applyPortalBackground,
    broadcastPaint,
    restCall,
    hexFromDeal,
    refreshDealCardBg,
    listenForTabPaint,
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
