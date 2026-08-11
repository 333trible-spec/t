'use strict';

(function () {
  const STAGE_ID = 'C8:48';
  const CATEGORY_ID = 8;

  function portalDomain() {
    try {
      if (typeof BX24 !== 'undefined' && typeof BX24.getDomain === 'function') {
        const d = BX24.getDomain();
        if (d) return d;
      }
    } catch (_) {}
    return 'ik-navigator.bitrix24.ru';
  }

  function dealUrl(id) {
    return 'https://' + portalDomain() + '/crm/deal/details/' + id + '/';
  }

  function kanbanUrl() {
    return 'https://' + portalDomain() + '/crm/deal/kanban/category/' + CATEGORY_ID + '/';
  }

  function callMethod(method, params) {
    return new Promise((resolve, reject) => {
      BX24.callMethod(method, params, (r) => {
        if (r.error()) reject(new Error(r.error_description() || r.error()));
        else resolve(r);
      });
    });
  }

  async function fetchStageLabel() {
    try {
      const r = await callMethod('crm.status.list', {
        filter: { ENTITY_ID: 'DEAL_STAGE_' + CATEGORY_ID, STATUS_ID: STAGE_ID },
      });
      const row = (r.data() || [])[0];
      if (row && row.NAME) return String(row.NAME).trim();
    } catch (_) {}
    return 'Оформление документов';
  }

  async function countAssignedDeals(userId) {
    const r = await callMethod('crm.deal.list', {
      filter: {
        ASSIGNED_BY_ID: userId,
        STAGE_ID: STAGE_ID,
        CATEGORY_ID: CATEGORY_ID,
        CLOSED: 'N',
      },
      select: ['ID', 'TITLE'],
      order: { ID: 'DESC' },
    });
    const deals = r.data() || [];
    const total = typeof r.total === 'function' ? r.total() : deals.length;
    return { total: total, deals: deals };
  }

  function esc(s) {
    const d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }

  function dealsWord(n) {
    const mod100 = n % 100;
    const mod10 = n % 10;
    if (mod10 === 1 && mod100 !== 11) return 'сделка';
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'сделки';
    return 'сделок';
  }

  function renderDealList(deals, total) {
    if (!total) {
      return (
        '<div class="dash-empty-box">' +
        '<p class="dash-empty">На стадии «Оформление документов» у вас нет активных сделок.</p>' +
        '</div>'
      );
    }
    const max = 15;
    const rows = deals.slice(0, max).map((d) => {
      const title = String(d.TITLE || '').trim() || ('Сделка #' + d.ID);
      return (
        '<a class="dash-deal-card" href="' + esc(dealUrl(d.ID)) + '" target="_top" rel="noopener">' +
        '<span class="dash-deal-title">' + esc(title) + '</span>' +
        '<span class="dash-deal-id">#' + esc(d.ID) + '</span>' +
        '</a>'
      );
    }).join('');
    let more = '';
    if (total > max) {
      more = '<p class="dash-more muted">Ещё ' + (total - max) + ' — откройте канбан воронки.</p>';
    }
    return '<div class="dash-deal-grid">' + rows + '</div>' + more;
  }

  async function loadDashboard(root) {
    const statusEl = root.querySelector('#dash-status');
    const bodyEl = root.querySelector('#dash-body');
    if (statusEl) statusEl.textContent = 'Загрузка…';
    if (bodyEl) bodyEl.classList.add('hidden');

    try {
      const userRes = await callMethod('user.current', {});
      const user = userRes.data() || userRes;
      const userId = Number(user.ID || user.id);
      const userName = [user.NAME, user.LAST_NAME].filter(Boolean).join(' ').trim();
      const stageLabel = await fetchStageLabel();
      const { total, deals } = await countAssignedDeals(userId);

      if (statusEl) {
        statusEl.innerHTML = userName
          ? '<span class="dash-user">Ответственный: <strong>' + esc(userName) + '</strong></span>'
          : '<span class="dash-user">Ваши сделки на стадии оформления</span>';
      }

      if (bodyEl) {
        bodyEl.innerHTML =
          '<div class="dash-hero">' +
            '<div class="dash-stat">' +
              '<div class="dash-count">' + total + '</div>' +
              '<div class="dash-count-meta">' +
                '<span class="dash-count-label">' + esc(dealsWord(total)) + '</span>' +
                '<span class="dash-stage-badge">' + esc(stageLabel) + '</span>' +
              '</div>' +
            '</div>' +
            '<p class="dash-funnel muted">Воронка ' + CATEGORY_ID + ' · стадия ' + esc(STAGE_ID) + '</p>' +
          '</div>' +
          renderDealList(deals, total) +
          '<a class="btn-kanban" href="' + esc(kanbanUrl()) + '" target="_top">Открыть канбан воронки</a>';
        bodyEl.classList.remove('hidden');
      }
    } catch (e) {
      if (statusEl) {
        statusEl.innerHTML = '<span class="err">' + esc(e.message || String(e)) + '</span>';
      }
      if (bodyEl) bodyEl.classList.add('hidden');
    }
  }

  window.BP608AppDashboard = {
    load: loadDashboard,
    STAGE_ID: STAGE_ID,
    CATEGORY_ID: CATEGORY_ID,
  };
})();
