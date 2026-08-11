'use strict';

(function () {
  function isEmpty(v) {
    if (v == null || v === '') return true;
    if (Array.isArray(v) && !v.length) return true;
    return false;
  }

  function norm(s) {
    return String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function matchOption(value, options) {
    if (isEmpty(value)) return null;
    const raw = Array.isArray(value) ? value : [value];
    const opts = options || [];
    const out = [];
    raw.forEach((v) => {
      const n = norm(v);
      const hit = opts.find((o) => norm(o) === n);
      if (hit) out.push(hit);
      else if (String(v).trim()) out.push(String(v).trim());
    });
    return out;
  }

  function boolYesNo(v, yes, no) {
    if (v === true || v === 1 || v === '1' || v === 'Y' || norm(v) === norm(yes)) return yes;
    if (v === false || v === 0 || v === '0' || v === 'N' || norm(v) === norm(no)) return no;
    const n = norm(v);
    if (norm(v) === 'есть' && norm(yes) === 'да') return yes;
    if (n === norm(no)) return no;
    return null;
  }

  function parseCrmContactIds(val) {
    if (isEmpty(val)) return [];
    const arr = Array.isArray(val) ? val : [val];
    return arr.map((x) => {
      if (x && typeof x === 'object') x = x.VALUE || x.value || x.id || x.ID;
      const s = String(x).trim();
      const m = s.match(/^(?:C_)?(\d+)$/i);
      return m ? Number(m[1]) : Number(s);
    }).filter((id) => id > 0);
  }

  function fileNames(val) {
    if (isEmpty(val)) return [];
    const arr = Array.isArray(val) ? val : [val];
    return arr.map((f) => {
      if (f && typeof f === 'object') return f.name || f.NAME || f.originalName || 'файл';
      return String(f);
    }).filter(Boolean);
  }

  async function loadEnumMaps(call) {
    if (window.__bp608DealEnumMaps) return window.__bp608DealEnumMaps;
    const rows = await call('crm.deal.userfield.list', {});
    const maps = {};
    (rows || []).forEach((uf) => {
      if (!uf.FIELD_NAME || !uf.LIST) return;
      maps[uf.FIELD_NAME] = {};
      uf.LIST.forEach((item) => {
        maps[uf.FIELD_NAME][String(item.ID)] = item.VALUE;
      });
    });
    window.__bp608DealEnumMaps = maps;
    return maps;
  }

  function resolveEnum(maps, field, raw) {
    if (isEmpty(raw)) return raw;
    const map = maps[field];
    if (Array.isArray(raw)) {
      return raw.map((r) => resolveEnum(maps, field, r)).filter((x) => !isEmpty(x));
    }
    const key = String(raw);
    if (map && map[key]) return map[key];
    return raw;
  }

  function dealSelectFields(map) {
    const fields = new Set(['ID', 'CONTACT_ID']);
    (map || []).forEach((row) => {
      fields.add(row.deal);
      if (row.altDeal) fields.add(row.altDeal);
      const printable = row.deal + '_PRINTABLE';
      fields.add(printable);
    });
    return [...fields];
  }

  async function loadContactRequisitesMeta(call) {
    if (window.__bp608ContactRequisitesMeta) return window.__bp608ContactRequisitesMeta;
    const meta = { field: null, type: null };
    try {
      const fields = await call('crm.contact.userfield.list', {});
      const hit = (fields || []).find((f) => {
        const label = norm(f.EDIT_FORM_LABEL || f.LIST_COLUMN_LABEL || '');
        return label.includes('реквизит') && label.includes('паспорт');
      });
      if (hit) {
        meta.field = hit.FIELD_NAME;
        meta.type = hit.USER_TYPE_ID || null;
      }
    } catch (_) {}
    window.__bp608ContactRequisitesMeta = meta;
    return meta;
  }

  function isContactRequisitesFilled(raw, fieldType) {
    if (raw == null || raw === '') return false;
    if (fieldType === 'boolean') {
      return raw === '1' || raw === 1 || raw === true || raw === 'Y';
    }
    if (typeof raw === 'boolean') return raw;
    if (Array.isArray(raw)) return raw.length > 0;
    return String(raw).trim().length > 0;
  }

  async function fetchContactDetails(call, ids) {
    if (!ids || !ids.length) return [];
    const meta = await loadContactRequisitesMeta(call);
    const select = ['ID', 'NAME', 'LAST_NAME', 'SECOND_NAME'];
    if (meta.field) select.push(meta.field);
    return Promise.all(ids.map(async (id) => {
      try {
        const c = await call('crm.contact.get', { id, select });
        const title = [c.LAST_NAME, c.NAME, c.SECOND_NAME].filter(Boolean).join(' ').trim();
        const reqRaw = meta.field ? c[meta.field] : null;
        return {
          id: Number(c.ID),
          title: title || 'Контакт #' + c.ID,
          requisitesFilled: meta.field ? isContactRequisitesFilled(reqRaw, meta.type) : null,
        };
      } catch (_) {
        return { id: Number(id), title: 'Контакт #' + id, requisitesFilled: null };
      }
    }));
  }

  async function fetchContactTitles(call, ids) {
    return fetchContactDetails(call, ids);
  }

  function fileCountText(n) {
    if (!n) return '';
    const mod100 = n % 100;
    const mod10 = n % 10;
    if (mod10 === 1 && mod100 !== 11) return n + ' файл прикреплён';
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return n + ' файла прикреплено';
    return n + ' файлов прикреплено';
  }

  function setFileHint(form, param, names) {
    const hint = form.querySelector('[data-files-for="' + param + '"]');
    if (!hint || !names.length) return;
    hint.textContent = fileCountText(names.length);
    hint.classList.add('ok');
    const wrap = hint.closest('.file-field');
    if (wrap) wrap.classList.add('has-deal-file');
    if (window.BP608Form && window.BP608Form.refreshState) {
      window.BP608Form.refreshState(form);
    }
  }

  async function buildPayload(deal, enumMaps) {
    const config = window.BP608_FORM_CONFIG || [];
    const byCode = Object.fromEntries(config.map((f) => [f.code, f]));
    const payload = {};
    const report = { filled: [], empty: [], files: [], skipped: [] };

    for (const row of window.BP608_DEAL_PREFILL_MAP || []) {
      const field = byCode[row.param];
      if (!field) {
        report.skipped.push({ param: row.param, reason: 'нет в форме' });
        continue;
      }

      let raw = deal[row.deal];
      if (isEmpty(raw) && row.altDeal) raw = deal[row.altDeal];

      if (row.kind === 'crm') {
        const ids = parseCrmContactIds(raw);
        if (!ids.length) {
          report.empty.push({ param: row.param, label: row.label, deal: row.deal });
          continue;
        }
        payload[row.param] = ids;
        report.filled.push({ param: row.param, label: row.label, deal: row.deal, value: ids });
        continue;
      }

      const printable = deal[row.deal + '_PRINTABLE'];
      if (!isEmpty(printable)) raw = printable;

      if (row.kind === 'file') {
        const names = fileNames(raw);
        if (names.length) report.files.push({ param: row.param, label: row.label, names });
        else report.empty.push({ param: row.param, label: row.label, deal: row.deal });
        continue;
      }

      if (!isEmpty(raw)) raw = resolveEnum(enumMaps, row.deal, raw);

      if (row.yesNo) {
        const yn = boolYesNo(raw, row.yesNo[0], row.yesNo[1]);
        if (yn) {
          payload[row.param] = yn;
          report.filled.push({ param: row.param, label: row.label, deal: row.deal, value: yn });
        } else {
          report.empty.push({ param: row.param, label: row.label, deal: row.deal });
        }
        continue;
      }

      if (field.type === 'select' && field.multiple) {
        const matched = matchOption(raw, field.options);
        if (matched && matched.length) {
          payload[row.param] = matched;
          report.filled.push({ param: row.param, label: row.label, deal: row.deal, value: matched });
        } else {
          report.empty.push({ param: row.param, label: row.label, deal: row.deal });
        }
        continue;
      }

      if (field.type === 'select' || row.param === 'property_type') {
        const arr = matchOption(raw, field.options);
        const val = row.single ? (arr && arr[0]) : raw;
        if (!isEmpty(val)) {
          payload[row.param] = val;
          report.filled.push({ param: row.param, label: row.label, deal: row.deal, value: val });
        } else {
          report.empty.push({ param: row.param, label: row.label, deal: row.deal });
        }
        continue;
      }

      if (!isEmpty(raw)) {
        payload[row.param] = String(raw).trim();
        report.filled.push({ param: row.param, label: row.label, deal: row.deal, value: payload[row.param] });
      } else {
        report.empty.push({ param: row.param, label: row.label, deal: row.deal });
      }
    }

    return { payload, report };
  }

  function applyCrmPrefillFromStash(contactStash) {
    window.__bp608CrmPrefill = {
      Parameter1: (contactStash.parameter1 || []).slice(),
      Parameter2: (contactStash.parameter2 || []).slice(),
    };
  }

  async function buildDealContactStash(deal, call) {
    const p1Ids = parseCrmContactIds(deal.UF_CRM_1722231741);
    const p2Ids = parseCrmContactIds(deal.UF_CRM_1722231954);
    const [dealContacts, parameter1, parameter2] = await Promise.all([
      deal.CONTACT_ID ? fetchContactTitles(call, [deal.CONTACT_ID]) : Promise.resolve([]),
      fetchContactTitles(call, p1Ids),
      fetchContactTitles(call, p2Ids),
    ]);
    return {
      dealContact: dealContacts[0] || null,
      parameter1,
      parameter2,
    };
  }

  function needsContactRefresh(contact) {
    if (!contact || !contact.id) return false;
    const title = String(contact.title || '').trim();
    const badTitle = !title || /^Контакт #\d+$/i.test(title);
    return badTitle || contact.requisitesFilled === undefined;
  }

  async function hydrateContactList(call, contacts) {
    const list = (contacts || []).filter((c) => c && c.id > 0);
    if (!list.length) return [];
    if (!list.some(needsContactRefresh)) return list;
    const fresh = await fetchContactDetails(call, list.map((c) => Number(c.id)));
    const byId = Object.fromEntries(fresh.map((c) => [c.id, c]));
    return list.map((c) => Object.assign({}, c, byId[c.id] || {}));
  }

  async function applyCrmPrefill(form) {
    window.BP608Form.syncOwnershipContacts(form);
  }

  window.BP608DealPrefill = {
    enrichContacts: function (call, contacts) {
      return hydrateContactList(call, contacts);
    },
    hydrateContacts: async function (root, call) {
      const form = root && root.querySelector ? root.querySelector('#bp608-form') : null;
      if (!form || !call || !window.BP608Form) return;

      const stash = Object.assign({}, window.__bp608DealContacts || {});
      if (stash.dealContact && stash.dealContact.id) {
        const hydrated = await hydrateContactList(call, [stash.dealContact]);
        if (hydrated[0]) stash.dealContact = hydrated[0];
      }
      if (stash.parameter1 && stash.parameter1.length) {
        stash.parameter1 = await hydrateContactList(call, stash.parameter1);
        window.BP608Form.setCrmContacts(root, 'Parameter1', stash.parameter1);
      }
      if (stash.parameter2 && stash.parameter2.length) {
        stash.parameter2 = await hydrateContactList(call, stash.parameter2);
        window.BP608Form.setCrmContacts(root, 'Parameter2', stash.parameter2);
      }

      window.BP608Form.setDealContacts(stash);
      window.BP608Form.syncOwnershipContacts(root);
    },
    load: async function (form, dealId, call) {
      const map = window.BP608_DEAL_PREFILL_MAP || [];
      const enumMaps = await loadEnumMaps(call);
      const deal = await call('crm.deal.get', {
        id: dealId,
        select: dealSelectFields(map),
      });
      const contactStash = await buildDealContactStash(deal, call);
      window.BP608Form.setDealContacts(contactStash);
      applyCrmPrefillFromStash(contactStash);
      const { payload, report } = await buildPayload(deal, enumMaps);
      window.BP608Form.applyValues(form, payload);
      await applyCrmPrefill(form);
      const formEl = (form.querySelector && form.querySelector('#bp608-form')) || form;
      (report.files || []).forEach((f) => setFileHint(formEl, f.param, f.names));
      report.unmapped = window.BP608_DEAL_PREFILL_UNMAPPED || [];
      window.__bp608PrefillReport = report;
      return report;
    },
  };
})();
