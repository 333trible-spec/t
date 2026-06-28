/**
 * Фон карточки сделки v4 — покраска слайдера CRM на портале.
 */
(function () {
  'use strict';
  const PAINTER_VERSION = '4.0.0';
  if (window.__b24DealCardBgBridgeVersion === PAINTER_VERSION) return;
  window.__b24DealCardBgBridgeVersion = PAINTER_VERSION;
  window.__b24DealCardBgBridge = true;

  const UF = 'UF_CRM_DEAL_CARD_BG';
  const STYLE_ID = 'b24-deal-card-bg-style';
  const MSG_TYPE = 'b24-deal-card-bg';
  const CACHE_KEY = 'b24-deal-card-bg-v4';
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
  const CSS_SELECTORS = [
    '.ui-page-slider-wrapper',
    '.ui-page-slider-content',
    '#ui-page-slider-content',
    '.ui-page-slider-workarea',
    '.ui-page-slider-mask',
    '.ui-side-panel-wrap',
    '.ui-side-panel-content',
    '.ui-side-panel-slider-content',
    '.ui-side-panel',
    '.ui-side-panel-container',
    '.ui-slider-page',
    '.crm-entity-card-container',
    '.crm-entity-card-widget',
    '.crm-entity-widget-content',
  ];

  let previewUntil = 0;
  let lastHex = '';
  let activeDealId = null;

  function forEachWindow(fn) {
    const visited = new Set();
    const stack = [window.top || window];
    while (stack.length) {
      const win = stack.pop();
      if (!win || visited.has(win)) continue;
      visited.add(win);
      try { fn(win); } catch (_) {}
      let doc;
      try { doc = win.document; } catch (_) { continue; }
      if (!doc) continue;
      doc.querySelectorAll('iframe').forEach((iframe) => {
        try {
          if (iframe.contentWindow) stack.push(iframe.contentWindow);
        } catch (_) {}
      });
    }
  }

  function matchDealId(str) {
    const s = String(str || '');
    const patterns = [
      /\/crm\/deal\/details\/(\d+)/i,
      /\/deal\/details\/(\d+)/i,
      /deal\/details\/(\d+)/i,
      /[#?&]id=(\d+)/i,
    ];
    for (const re of patterns) {
      const m = s.match(re);
      if (m) return m[1];
    }
    return null;
  }

  function findDealIdFromDom(doc) {
    if (!doc) return null;
    const nodes = doc.querySelectorAll('[data-entity-type-id="2"][data-entity-id], [data-entity-id]');
    for (const el of nodes) {
      const type = el.getAttribute('data-entity-type-id');
      const id = el.getAttribute('data-entity-id');
      if (id && (!type || type === '2')) return id;
    }
    const inp = doc.querySelector('input[name="ID"], input[name="id"]');
    if (inp?.value && /^\d+$/.test(inp.value)) return inp.value;
    return null;
  }

  function findDealId() {
    if (activeDealId) return activeDealId;

    let id = null;
    forEachWindow((win) => {
      if (id) return;
      id = matchDealId(win.location?.href) || matchDealId(win.location?.hash);
      if (!id) id = findDealIdFromDom(win.document);
    });

    if (id) return id;

    forEachWindow((win) => {
      if (id) return;
      try {
        const sp = win.BX?.SidePanel?.Instance;
        if (!sp) return;
        const sliders = sp.getOpenSliders?.() || [];
        const list = sliders.length ? sliders : [sp.getTopSlider?.()].filter(Boolean);
        for (const slider of list) {
          const urls = [
            slider?.getUrl?.(),
            slider?.getUri?.(),
            slider?.getFrameWindow?.()?.location?.href,
          ];
          for (const u of urls) {
            const hit = matchDealId(u);
            if (hit) { id = hit; return; }
          }
        }
      } catch (_) {}
    });

    if (id) return id;

    try {
      const all = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
      if (all.__lastDealId) return String(all.__lastDealId);
    } catch (_) {}

    return null;
  }

  function isCrmSliderOpen() {
    let open = false;
    forEachWindow((win) => {
      if (open) return;
      const doc = win.document;
      if (!doc) return;
      if (doc.querySelector(
        '.ui-side-panel.ui-side-panel-open, .ui-page-slider-wrapper, .ui-side-panel-wrap, .crm-entity-widget-content',
      )) open = true;
    });
    return open;
  }

  function getRestWindow() {
    let restWin = null;
    forEachWindow((win) => {
      if (restWin) return;
      if (win.BX?.rest?.callMethod) restWin = win;
    });
    return restWin;
  }

  function restCall(method, params) {
    const win = getRestWindow();
    return new Promise((resolve, reject) => {
      if (!win?.BX?.rest?.callMethod) {
        reject(new Error('BX.rest'));
        return;
      }
      win.BX.rest.callMethod(method, params, (res) => {
        if (res.error()) reject(new Error(res.error()));
        else resolve(res.data());
      });
    });
  }

  function normalizeHex(raw) {
    if (raw === null || raw === undefined || raw === '' || raw === '0') return '';
    const s = String(raw).trim();
    if (/^#[0-9a-f]{3,8}$/i.test(s)) return s.toUpperCase();
    if (Object.prototype.hasOwnProperty.call(LABEL_HEX, s)) return LABEL_HEX[s];
    return '';
  }

  function readCache(dealId) {
    if (!dealId) return null;
    try {
      const all = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
      if (Object.prototype.hasOwnProperty.call(all, String(dealId))) return all[String(dealId)];
    } catch (_) {}
    return null;
  }

  function writeCache(dealId, hex) {
    if (!dealId) return;
    try {
      const all = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
      all[String(dealId)] = hex || '';
      all.__lastDealId = String(dealId);
      localStorage.setItem(CACHE_KEY, JSON.stringify(all));
    } catch (_) {}
  }

  function shouldPaintDoc(doc, win) {
    const href = String(win.location?.href || '') + String(win.location?.hash || '');
    if (/crm\/deal/i.test(href)) return true;
    if (doc.querySelector('.crm-entity-widget-content, .ui-entity-editor, [data-role="entity-editor"]')) return true;
    if (doc.querySelector('.ui-side-panel-wrap, .ui-page-slider-wrapper, .ui-side-panel-content, .ui-side-panel')) return true;
    return isCrmSliderOpen();
  }

  function paintChainFromEditor(hex, doc) {
    const anchor = doc.querySelector('.ui-entity-editor, .crm-entity-widget-content, [data-role="entity-editor"]');
    if (!anchor || !hex) return;
    let el = anchor;
    for (let i = 0; i < 20 && el; i += 1) {
      const cls = el.className || '';
      if (typeof cls === 'string' && (
        cls.includes('ui-side-panel')
        || cls.includes('ui-page-slider')
        || cls.includes('ui-slider')
        || cls.includes('crm-entity-card')
      )) {
        el.style.setProperty('background-color', hex, 'important');
      }
      el = el.parentElement;
    }
  }

  function applyBackground(hex, doc) {
    if (!doc) return;

    if (!hex) {
      doc.getElementById(STYLE_ID)?.remove();
      CSS_SELECTORS.forEach((sel) => {
        doc.querySelectorAll(sel).forEach((el) => el.style.removeProperty('background-color'));
      });
      return;
    }

    let style = doc.getElementById(STYLE_ID);
    if (!style) {
      style = doc.createElement('style');
      style.id = STYLE_ID;
      (doc.head || doc.documentElement).appendChild(style);
    }
    style.textContent = CSS_SELECTORS.map((sel) => (
      `${sel}{background-color:${hex}!important;background:${hex}!important}`
    )).join('\n');

    CSS_SELECTORS.forEach((sel) => {
      doc.querySelectorAll(sel).forEach((el) => {
        el.style.setProperty('background-color', hex, 'important');
        el.style.setProperty('background', hex, 'important');
      });
    });

    paintChainFromEditor(hex, doc);
  }

  function paintEverywhere(hex, force) {
    const next = hex !== undefined ? (hex || '') : lastHex;
    if (!force && next === lastHex && next) return;
    lastHex = next;
    forEachWindow((win) => {
      try {
        const doc = win.document;
        if (!doc?.body) return;
        if (!shouldPaintDoc(doc, win) && !isCrmSliderOpen()) return;
        applyBackground(next, doc);
      } catch (_) {}
    });
  }

  async function refresh() {
    const dealId = findDealId();

    if (!dealId) {
      if (lastHex && isCrmSliderOpen()) {
        paintEverywhere(lastHex, true);
      }
      return;
    }

    activeDealId = dealId;

    if (Date.now() < previewUntil) {
      const cached = readCache(dealId);
      if (cached !== null) paintEverywhere(cached, true);
      return;
    }

    const cached = readCache(dealId);
    if (cached !== null) paintEverywhere(cached, true);

    try {
      const deal = await restCall('crm.deal.get', { id: dealId, select: [UF, 'ID'] });
      const hex = normalizeHex(deal[UF]);
      writeCache(dealId, hex);
      paintEverywhere(hex, true);
    } catch (_) {
      if (cached !== null) paintEverywhere(cached, true);
    }
  }

  function handleMessage(data) {
    if (!data || data.type !== MSG_TYPE || !('hex' in data)) return;
    previewUntil = Date.now() + 180000;
    const hex = normalizeHex(data.hex) || '';
    if (data.dealId) {
      activeDealId = String(data.dealId);
      writeCache(activeDealId, hex);
    }
    paintEverywhere(hex, true);
    setTimeout(refresh, 400);
  }

  function bindHooks() {
    forEachWindow((win) => {
      try {
        if (!win.BX?.addCustomEvent) return;
        if (win.__b24DealCardBgHooks) return;
        win.__b24DealCardBgHooks = true;
        win.BX.addCustomEvent('SidePanel.Slider:onOpenComplete', () => setTimeout(refresh, 200));
        win.BX.addCustomEvent('SidePanel.Slider:onCloseComplete', () => {
          activeDealId = null;
          setTimeout(refresh, 200);
        });
        win.BX.addCustomEvent('onAjaxSuccess', () => setTimeout(refresh, 300));
      } catch (_) {}
    });
  }

  window.addEventListener('message', (e) => handleMessage(e.data));
  window.__b24DealCardBgHandleMessage = handleMessage;
  window.__b24DealCardBgRefresh = refresh;

  refresh();
  bindHooks();
  setInterval(() => { bindHooks(); refresh(); }, 800);
  window.addEventListener('popstate', refresh);
  window.addEventListener('hashchange', refresh);
})();
