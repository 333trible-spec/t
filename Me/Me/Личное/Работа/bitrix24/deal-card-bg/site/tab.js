(function () {
  'use strict';

  const PALETTE = [
    { label: 'Без фона', hex: '' },
    { label: 'Бронь', hex: '#FFF8E1' },
    { label: 'Оформление', hex: '#E3F2FD' },
    { label: 'Рассрочка', hex: '#F3E5F5' },
    { label: 'VIP', hex: '#FFFDE7' },
    { label: 'Срочно', hex: '#FFEBEE' },
    { label: 'Успех', hex: '#E8F5E9' },
    { label: 'Провал', hex: '#F5F5F5' },
  ];
  const UF = 'UF_CRM_DEAL_CARD_BG';
  const MSG_TYPE = 'b24-deal-card-bg';
  const STYLE_ID = 'b24-deal-card-bg-style';
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
  let dealId = null;
  let fieldList = [];

  function call(method, params) {
    return new Promise((resolve, reject) => {
      BX24.callMethod(method, params, (r) => {
        if (r.error()) reject(new Error(r.error_description || r.error()));
        else resolve(r.data());
      });
    });
  }

  function enumIdForLabel(label) {
    return fieldList.find((r) => r.VALUE === label)?.ID || null;
  }

  function labelForEnumId(id) {
    return fieldList.find((r) => String(r.ID) === String(id))?.VALUE || 'Без фона';
  }

  function hexForLabel(label) {
    return PALETTE.find((p) => p.label === label)?.hex || '';
  }

  function portalDocument() {
    let win = window;
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

  function applyParentCardBg(hex) {
    const doc = portalDocument();
    if (!doc || doc === document) return false;
    let style = doc.getElementById(STYLE_ID);
    if (!hex) {
      style?.remove();
      CARD_SELECTORS.forEach((sel) => {
        doc.querySelectorAll(sel).forEach((el) => { el.style.backgroundColor = ''; });
      });
      return true;
    }
    if (!style) {
      style = doc.createElement('style');
      style.id = STYLE_ID;
      doc.head.appendChild(style);
    }
    style.textContent = CARD_SELECTORS.map(
      (sel) => `${sel}{background-color:${hex}!important;transition:background-color .25s ease}`,
    ).join('');
    return true;
  }

  function setMsg(text, ok) {
    const el = document.getElementById('msg');
    el.textContent = text;
    el.className = ok ? 'ok' : 'warn';
  }

  function setPreview(label) {
    const hex = hexForLabel(label);
    document.getElementById('preview').style.background = hex || '#ffffff';
    document.getElementById('preview').textContent = label;
    document.querySelectorAll('#grid button').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.label === label);
    });
    return hex;
  }

  function broadcastPaint(hex) {
    try {
      window.top.postMessage({ type: MSG_TYPE, hex: hex || '' }, '*');
    } catch (_) {}
    return applyParentCardBg(hex);
  }

  async function saveColor(label) {
    const enumId = enumIdForLabel(label);
    if (!dealId || !enumId) return;
    await call('crm.deal.update', { id: dealId, fields: { [UF]: enumId } });
    const hex = setPreview(label);
    broadcastPaint(hex);
    setMsg('Сохранено в CRM.', true);
  }

  function renderGrid() {
    const grid = document.getElementById('grid');
    grid.innerHTML = '';
    PALETTE.forEach((item) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.label = item.label;
      btn.innerHTML = '<div class="swatch" style="background:' + (item.hex || '#fff') + '"></div>' + item.label;
      btn.onclick = () => saveColor(item.label);
      grid.appendChild(btn);
    });
  }

  function start() {
    if (typeof BX24 === 'undefined') {
      document.getElementById('preview').textContent = 'BX24 SDK не загружен';
      return;
    }
    BX24.init(async () => {
      const placement = BX24.placement.info();
      let opts = placement.options || {};
      if (typeof opts === 'string') {
        try { opts = JSON.parse(opts); } catch (_) { opts = {}; }
      }
      dealId = opts.ID || opts.id;
      if (!dealId) {
        document.getElementById('preview').textContent = 'Откройте вкладку из карточки сделки';
        return;
      }
      const fields = await call('crm.deal.userfield.list');
      fieldList = (fields || []).find((f) => f.FIELD_NAME === UF)?.LIST || [];
      const deal = await call('crm.deal.get', { id: dealId, select: [UF] });
      const label = deal[UF] ? labelForEnumId(deal[UF]) : 'Без фона';
      renderGrid();
      broadcastPaint(setPreview(label));
      BX24.fitWindow();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
