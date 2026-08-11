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

  async function fetchAllDealUserFields(call) {
    if (window.__bp608UserFields) return window.__bp608UserFields;
    const all = [];
    const batch = window.__bp608CallBatch;
    if (typeof batch === 'function') {
      let base = 0;
      const PAGES = 4;
      for (let guard = 0; guard < 15; guard++) {
        const calls = {};
        for (let i = 0; i < PAGES; i++) {
          calls['p' + (base + i)] = ['crm.deal.userfield.list', { start: (base + i) * 50 }];
        }
        const res = await batch(calls);
        let total = 0;
        let lastFull = false;
        for (let i = 0; i < PAGES; i++) {
          const rows = res['p' + (base + i)];
          if (Array.isArray(rows) && rows.length) {
            all.push(...rows);
            total += rows.length;
            lastFull = rows.length === 50;
          } else {
            lastFull = false;
          }
        }
        if (total < PAGES * 50 || !lastFull) break;
        base += PAGES;
      }
      window.__bp608UserFields = all;
      return all;
    }
    let start = 0;
    for (let guard = 0; guard < 60; guard++) {
      const rows = await call('crm.deal.userfield.list', { start });
      if (!Array.isArray(rows) || !rows.length) break;
      all.push(...rows);
      if (rows.length < 50) break;
      start += 50;
    }
    window.__bp608UserFields = all;
    return all;
  }

  async function loadEnumMaps(call) {
    if (window.__bp608DealEnumMaps) return window.__bp608DealEnumMaps;
    const rows = await fetchAllDealUserFields(call);
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

  function buildReverseEnumMap(forwardMaps) {
    const reverse = {};
    Object.keys(forwardMaps || {}).forEach((field) => {
      reverse[field] = {};
      Object.keys(forwardMaps[field]).forEach((id) => {
        const val = forwardMaps[field][id];
        if (val != null && String(val).trim() !== '') {
          reverse[field][norm(val)] = String(id);
        }
      });
    });
    return reverse;
  }

  function lookupEnumId(fieldName, text, reverseMaps) {
    if (isEmpty(text)) return null;
    const rev = reverseMaps[fieldName];
    if (!rev) return null;
    return rev[norm(text)] || null;
  }

  async function loadUserFieldRows(call) {
    return fetchAllDealUserFields(call);
  }

  function encodeMoney(value) {
    if (isEmpty(value)) return '';
    const n = String(value).replace(/\s/g, '').replace(',', '.').trim();
    if (!n) return '';
    return n + '|RUB';
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result || '');
        const b64 = dataUrl.split(',')[1] || '';
        resolve(b64);
      };
      reader.onerror = () => reject(reader.error || new Error('Не удалось прочитать файл'));
      reader.readAsDataURL(file);
    });
  }

  async function encodeFileField(fileList, multiple) {
    const files = fileList ? [...fileList] : [];
    if (!files.length) return undefined;
    const encoded = await Promise.all(files.map(async (f) => {
      const b64 = await fileToBase64(f);
      return { fileData: [f.name, b64] };
    }));
    return multiple ? encoded : encoded[0];
  }

  function encodeYesNoForDeal(formVal, row, reverseMaps) {
    const candidates = [formVal];
    if (row.param === 'sber' && formVal === 'Да') candidates.push('Есть');
    for (let i = 0; i < candidates.length; i++) {
      const id = lookupEnumId(row.deal, candidates[i], reverseMaps);
      if (id) return id;
    }
    return formVal;
  }

  function encodeCrmContacts(val) {
    const ids = (Array.isArray(val) ? val : (val ? [val] : []))
      .map((x) => Number(x))
      .filter((id) => id > 0);
    return ids.map((id) => 'C_' + id);
  }

  async function buildDealUpdateFields(form, formValues, call) {
    const enumMaps = await loadEnumMaps(call);
    const reverseMaps = buildReverseEnumMap(enumMaps);
    const ufRows = await loadUserFieldRows(call);
    const ufByName = Object.fromEntries((ufRows || []).map((u) => [u.FIELD_NAME, u]));
    const config = window.BP608_FORM_CONFIG || [];
    const byCode = Object.fromEntries(config.map((f) => [f.code, f]));
    const fields = {};
    const report = { saved: [], files: [], skipped: [], empty: [], unresolved: [] };

    for (const row of window.BP608_DEAL_PREFILL_MAP || []) {
      const field = byCode[row.param];
      if (!field) {
        report.skipped.push({ param: row.param, reason: 'нет в форме' });
        continue;
      }

      if (row.kind === 'file') {
        const input = form.elements[row.param];
        if (input && input.files && input.files.length) {
          const encoded = await encodeFileField(input.files, !!field.multiple);
          if (encoded !== undefined) {
            fields[row.deal] = encoded;
            report.files.push({ param: row.param, deal: row.deal, count: input.files.length });
            report.saved.push(row.param);
          }
        }
        continue;
      }

      if (row.param === 'link_deal' && formValues.repid_sale !== 'Да') {
        fields[row.deal] = '';
        report.saved.push(row.param);
        continue;
      }

      let val = formValues[row.param];

      if (row.kind === 'crm') {
        fields[row.deal] = encodeCrmContacts(val);
        report.saved.push(row.param);
        continue;
      }

      if (isEmpty(val)) {
        const uf = ufByName[row.deal];
        fields[row.deal] = uf && uf.MULTIPLE === 'Y' ? [] : '';
        report.empty.push(row.param);
        report.saved.push(row.param);
        continue;
      }

      if (row.yesNo) {
        fields[row.deal] = encodeYesNoForDeal(val, row, reverseMaps);
        report.saved.push(row.param);
        continue;
      }

      const uf = ufByName[row.deal];
      const userType = uf ? uf.USER_TYPE_ID : '';

      if (userType === 'enumeration' || field.type === 'select') {
        if (field.multiple || row.multi) {
          const arr = Array.isArray(val) ? val : [val];
          const ids = [];
          arr.forEach((v) => {
            const id = lookupEnumId(row.deal, v, reverseMaps);
            if (id) ids.push(id);
            else report.unresolved.push({ param: row.param, deal: row.deal, value: v });
          });
          fields[row.deal] = ids.length ? ids : [];
        } else {
          const single = Array.isArray(val) ? val[0] : val;
          const id = lookupEnumId(row.deal, single, reverseMaps);
          if (id) {
            fields[row.deal] = id;
          } else {
            report.unresolved.push({ param: row.param, deal: row.deal, value: single });
            fields[row.deal] = String(single).trim();
          }
        }
        report.saved.push(row.param);
        continue;
      }

      if (userType === 'money' || field.type === 'UF:money') {
        fields[row.deal] = encodeMoney(val);
        report.saved.push(row.param);
        continue;
      }

      fields[row.deal] = String(val).trim();
      report.saved.push(row.param);
    }

    return { fields, report };
  }

  async function saveToDeal(form, dealId, call) {
    if (!form || !dealId || !call) throw new Error('Нет формы, сделки или REST');
    if (!window.BP608Form || !window.BP608Form.collectValues) {
      throw new Error('Модуль формы не загружен');
    }
    const formValues = window.BP608Form.collectValues(form);
    const { fields, report } = await buildDealUpdateFields(form, formValues, call);
    await call('crm.deal.update', { id: dealId, fields });
    report.dealId = dealId;
    report.fieldCount = Object.keys(fields).length;
    window.__bp608SaveReport = report;
    return report;
  }

  var DEAL_HEADER_FIELDS = [
    'STAGE_ID', 'CATEGORY_ID',
    'UF_CRM_1739347967', 'UF_CRM_1538729147', 'UF_CRM_1660535141', 'UF_CRM_1538728286642',
  ];

  function dealSelectFields(map) {
    const fields = new Set(['ID', 'CONTACT_ID']);
    DEAL_HEADER_FIELDS.forEach((f) => fields.add(f));
    (map || []).forEach((row) => {
      fields.add(row.deal);
      if (row.altDeal) fields.add(row.altDeal);
      const printable = row.deal + '_PRINTABLE';
      fields.add(printable);
    });
    return [...fields];
  }

  const CONTACT_ENTITY_TYPE_ID = 3;

  async function contactRequisitesFilled(call, contactId) {
    if (!contactId) return false;
    try {
      const rows = await call('crm.requisite.list', {
        filter: { ENTITY_TYPE_ID: CONTACT_ENTITY_TYPE_ID, ENTITY_ID: contactId },
        select: ['ID', 'PRESET_ID', 'NAME'],
      });
      const list = Array.isArray(rows) ? rows : [];
      return list.length > 0;
    } catch (_) {
      return false;
    }
  }

  async function resolveStageName(call, deal) {
    const stageId = deal.STAGE_ID;
    const categoryId = deal.CATEGORY_ID != null ? deal.CATEGORY_ID : 0;
    if (!stageId) return '';
    const entityIds = ['DEAL_STAGE_' + categoryId];
    if (categoryId !== 0) entityIds.push('DEAL_STAGE');
    for (let i = 0; i < entityIds.length; i++) {
      try {
        const rows = await call('crm.status.list', {
          filter: { ENTITY_ID: entityIds[i], STATUS_ID: stageId },
          select: ['NAME', 'STATUS_ID'],
        });
        if (rows && rows[0] && rows[0].NAME) return rows[0].NAME;
      } catch (_) {}
    }
    return '';
  }

  function isCompletedStageName(name) {
    const n = norm(name);
    return n.includes('успешно') && (n.includes('за-н') || n.includes('за н'));
  }

  function isWonStageId(stageId) {
    if (!stageId) return false;
    return /(^|:)WON$/i.test(String(stageId).trim());
  }

  async function stageSemantics(call, deal) {
    const stageId = deal.STAGE_ID;
    const categoryId = deal.CATEGORY_ID != null ? deal.CATEGORY_ID : 0;
    if (!stageId) return '';
    const entityIds = ['DEAL_STAGE_' + categoryId];
    if (categoryId !== 0) entityIds.push('DEAL_STAGE');
    for (let i = 0; i < entityIds.length; i++) {
      try {
        const rows = await call('crm.status.list', {
          filter: { ENTITY_ID: entityIds[i], STATUS_ID: stageId },
          select: ['STATUS_ID', 'SEMANTICS', 'NAME'],
        });
        if (rows && rows[0]) return rows[0].SEMANTICS || '';
      } catch (_) {}
    }
    return '';
  }

  async function isDealCompletedStage(call, deal) {
    return isWonStageId(deal.STAGE_ID);
  }

  function contactFioFilledFromParts(lastName, firstName, secondName) {
    return !!(
      String(lastName || '').trim() &&
      String(firstName || '').trim() &&
      String(secondName || '').trim()
    );
  }

  function contactRecordFromRaw(id, c, reqRows) {
    if (!c) {
      return { id: Number(id), title: 'Контакт #' + id, fioFilled: false, requisitesFilled: false };
    }
    const title = [c.LAST_NAME, c.NAME, c.SECOND_NAME].filter(Boolean).join(' ').trim();
    const list = Array.isArray(reqRows) ? reqRows : [];
    return {
      id: Number(c.ID),
      title: title || 'Контакт #' + c.ID,
      lastName: c.LAST_NAME || '',
      firstName: c.NAME || '',
      secondName: c.SECOND_NAME || '',
      fioFilled: contactFioFilledFromParts(c.LAST_NAME, c.NAME, c.SECOND_NAME),
      requisitesFilled: list.length > 0,
    };
  }

  async function fetchContactDetailsBatch(ids) {
    const batch = window.__bp608CallBatch;
    const calls = {};
    ids.forEach((id) => {
      calls['c' + id] = ['crm.contact.get', { id: id, select: ['ID', 'NAME', 'LAST_NAME', 'SECOND_NAME'] }];
      calls['r' + id] = ['crm.requisite.list', {
        filter: { ENTITY_TYPE_ID: CONTACT_ENTITY_TYPE_ID, ENTITY_ID: id },
        select: ['ID'],
      }];
    });
    const res = await batch(calls);
    return ids.map((id) => contactRecordFromRaw(id, res['c' + id], res['r' + id]));
  }

  async function fetchContactDetails(call, ids) {
    if (!ids || !ids.length) return [];
    if (typeof window.__bp608CallBatch === 'function') {
      try {
        return await fetchContactDetailsBatch(ids);
      } catch (_) {}
    }
    return Promise.all(ids.map(async (id) => {
      try {
        const c = await call('crm.contact.get', {
          id,
          select: ['ID', 'NAME', 'LAST_NAME', 'SECOND_NAME'],
        });
        const requisitesFilled = await contactRequisitesFilled(call, Number(c.ID));
        return contactRecordFromRaw(id, c, requisitesFilled ? [{ ID: 1 }] : []);
      } catch (_) {
        return {
          id: Number(id),
          title: 'Контакт #' + id,
          fioFilled: false,
          requisitesFilled: false,
        };
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
        const val = (arr && arr.length) ? arr[0] : (Array.isArray(raw) ? raw[0] : raw);
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
    const mainId = deal.CONTACT_ID ? Number(deal.CONTACT_ID) : 0;
    const p1Ids = parseCrmContactIds(deal.UF_CRM_1722231741);
    const p2Ids = parseCrmContactIds(deal.UF_CRM_1722231954);
    const allIds = [];
    [mainId].concat(p1Ids, p2Ids).forEach((id) => {
      const n = Number(id);
      if (n > 0 && allIds.indexOf(n) === -1) allIds.push(n);
    });
    const details = await fetchContactDetails(call, allIds);
    const byId = {};
    details.forEach((d) => { byId[Number(d.id)] = d; });
    const pick = (ids) => ids.map((id) => byId[Number(id)]).filter(Boolean);
    return {
      dealContact: mainId ? (byId[mainId] || null) : null,
      parameter1: pick(p1Ids),
      parameter2: pick(p2Ids),
    };
  }

  function needsContactRefresh(contact) {
    if (!contact || !contact.id) return false;
    const title = String(contact.title || '').trim();
    const badTitle = !title || /^Контакт #\d+$/i.test(title);
    return badTitle || contact.fioFilled === undefined || contact.requisitesFilled === undefined;
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
    isDealCompletedStage: isDealCompletedStage,
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
      const [enumMaps, deal] = await Promise.all([
        loadEnumMaps(call),
        call('crm.deal.get', { id: dealId, select: dealSelectFields(map) }),
      ]);
      window.__bp608Deal = deal;
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
    save: async function (form, dealId, call) {
      return saveToDeal(form, dealId, call);
    },
  };
})();
