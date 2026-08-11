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

  const SALES_DEAL_FROM_REGISTRATION_UF = 'UF_CRM_1664792769';

  function escHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function fileNames(val) {
    return fileEntries(val).map((f) => f.name);
  }

  function fileEntries(val) {
    if (isEmpty(val)) return [];
    const arr = Array.isArray(val) ? val : [val];
    return arr.map((f) => {
      if (f && typeof f === 'object') {
        return {
          id: Number(f.id || f.ID || 0) || 0,
          name: f.name || f.NAME || f.originalName || 'файл',
          downloadUrl: String(f.downloadUrl || f.DOWNLOAD_URL || f.showUrl || f.SHOW_URL || '').trim(),
        };
      }
      const n = Number(f);
      if (n > 0) return { id: n, name: 'файл', downloadUrl: '' };
      const s = String(f || '').trim();
      return s ? { id: 0, name: s, downloadUrl: '' } : null;
    }).filter(Boolean);
  }

  function resolveSalesDealId(deal) {
    if (!deal) return 0;
    const raw = deal[SALES_DEAL_FROM_REGISTRATION_UF];
    if (raw == null || raw === '') return 0;
    if (typeof raw === 'object') {
      const id = raw.id || raw.ID || raw.value || raw.VALUE;
      if (id) return Number(id) || 0;
    }
    const m = String(raw).match(/(\d+)/);
    return m ? Number(m[1]) : 0;
  }

  function diskFileDownloadUrl(info) {
    return String(
      info.DOWNLOAD_URL || info.downloadUrl || info.DETAIL_URL || info.detailUrl || ''
    ).trim();
  }

  async function resolveFileDownloadUrls(call, entries) {
    if (!entries || !entries.length) return [];
    const out = entries.map((e) => Object.assign({}, e));
    const needFetch = out.filter((e) => e.id > 0 && !e.downloadUrl);
    if (!needFetch.length || !call) return out;

    const batch = window.__bp608CallBatch;
    const applyInfo = (entry, info) => {
      if (info) entry.downloadUrl = diskFileDownloadUrl(info);
    };

    if (typeof batch === 'function') {
      const CHUNK = 50;
      for (let offset = 0; offset < needFetch.length; offset += CHUNK) {
        const chunk = needFetch.slice(offset, offset + CHUNK);
        const calls = {};
        chunk.forEach((e) => {
          calls['f' + e.id] = ['disk.file.get', { id: e.id }];
        });
        try {
          const res = await batch(calls);
          chunk.forEach((e) => applyInfo(e, res['f' + e.id]));
        } catch (_) {
          for (let i = 0; i < chunk.length; i++) {
            const e = chunk[i];
            try {
              applyInfo(e, await call('disk.file.get', { id: e.id }));
            } catch (_) {}
          }
        }
      }
      return out;
    }

    for (let i = 0; i < needFetch.length; i++) {
      const e = needFetch[i];
      try {
        applyInfo(e, await call('disk.file.get', { id: e.id }));
      } catch (_) {}
    }
    return out;
  }

  const UF_FIELD_SELECT = ['FIELD_NAME', 'USER_TYPE_ID', 'MULTIPLE', 'LIST'];

  function collectNeededUfFieldNames() {
    const names = new Set();
    (window.BP608_DEAL_PREFILL_MAP || []).forEach((row) => {
      if (row.deal) names.add(row.deal);
      if (row.altDeal) names.add(row.altDeal);
    });
    return [...names];
  }

  async function fetchAllDealUserFieldsLegacy(call) {
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
    return all;
  }

  async function fetchNeededDealUserFields(call) {
    if (window.__bp608UserFields) return window.__bp608UserFields;
    const fieldNames = collectNeededUfFieldNames();
    const all = [];
    const batch = window.__bp608CallBatch;

    if (typeof batch === 'function' && fieldNames.length) {
      const CHUNK = 50;
      for (let offset = 0; offset < fieldNames.length; offset += CHUNK) {
        const chunk = fieldNames.slice(offset, offset + CHUNK);
        const calls = {};
        chunk.forEach((name, i) => {
          calls['uf' + i] = ['crm.deal.userfield.list', {
            filter: { FIELD_NAME: name },
            select: UF_FIELD_SELECT,
          }];
        });
        try {
          const res = await batch(calls);
          chunk.forEach((name, i) => {
            const rows = res['uf' + i];
            if (Array.isArray(rows) && rows.length) all.push(...rows);
          });
        } catch (_) {}
      }
    } else if (fieldNames.length) {
      for (let i = 0; i < fieldNames.length; i++) {
        try {
          const rows = await call('crm.deal.userfield.list', {
            filter: { FIELD_NAME: fieldNames[i] },
            select: UF_FIELD_SELECT,
          });
          if (Array.isArray(rows) && rows.length) all.push(...rows);
        } catch (_) {}
      }
    }

    if (!all.length && fieldNames.length) {
      const legacy = await fetchAllDealUserFieldsLegacy(call);
      window.__bp608UserFields = legacy;
      return legacy;
    }

    window.__bp608UserFields = all;
    return all;
  }

  async function fetchAllDealUserFields(call) {
    return fetchNeededDealUserFields(call);
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
        const wrap = form.querySelector('[data-file-field="' + row.param + '"]');
        const cleared = wrap && wrap.getAttribute('data-file-cleared') === '1';
        if (input && input.files && input.files.length) {
          const encoded = await encodeFileField(input.files, !!field.multiple);
          if (encoded !== undefined) {
            fields[row.deal] = encoded;
            report.files.push({ param: row.param, deal: row.deal, count: input.files.length });
            report.saved.push(row.param);
          }
        } else if (cleared) {
          const uf = ufByName[row.deal];
          fields[row.deal] = (field.multiple || (uf && uf.MULTIPLE === 'Y')) ? [] : '';
          report.files.push({ param: row.param, deal: row.deal, count: 0, cleared: true });
          report.saved.push(row.param);
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

  const BP608_TEMPLATE_ID = 608;

  async function fileParamFromDeal(deal, param, multiple) {
    const row = (window.BP608_DEAL_PREFILL_MAP || []).find((r) => r.param === param);
    if (!row || !deal) return undefined;
    let raw = deal[row.deal];
    if (isEmpty(raw) && row.altDeal) raw = deal[row.altDeal];
    const ids = fileEntries(raw).map((e) => e.id).filter((id) => id > 0);
    if (!ids.length) return undefined;
    return multiple ? ids : ids[0];
  }

  async function buildWorkflowParameters(form, dealId, call, options) {
    const opts = options || {};
    const config = window.BP608_FORM_CONFIG || [];
    const formValues = window.BP608Form.collectValues(form);
    const deal = await call('crm.deal.get', {
      id: dealId,
      select: dealSelectFields(window.BP608_DEAL_PREFILL_MAP || []),
    });
    window.__bp608Deal = deal;

    const parameters = {};
    for (let i = 0; i < config.length; i++) {
      const field = config[i];
      const code = field.code;

      if (code === 'Parameter3') {
        // bool в БП: Y = Да. Передаём Y, если контакты готовы (или явный флаг).
        const yes = opts.parameter3Yes === true
          || opts.parameter3Yes === 'Y'
          || opts.parameter3Yes === 'Да';
        parameters.Parameter3 = yes ? 'Y' : 'N';
        continue;
      }

      if (field.type === 'UF:crm') {
        const ids = Array.isArray(formValues[code])
          ? formValues[code]
          : (formValues[code] ? [formValues[code]] : []);
        const encoded = encodeCrmContacts(ids);
        if (field.multiple) parameters[code] = encoded;
        else if (encoded.length) parameters[code] = encoded[0];
        continue;
      }

      if (field.type === 'file') {
        const input = form.elements[code];
        const wrap = form.querySelector('[data-file-field="' + code + '"]');
        const cleared = wrap && wrap.getAttribute('data-file-cleared') === '1';
        if (input && input.files && input.files.length) {
          const encoded = await encodeFileField(input.files, !!field.multiple);
          if (encoded !== undefined) parameters[code] = encoded;
        } else if (!cleared) {
          const fromDeal = await fileParamFromDeal(deal, code, !!field.multiple);
          if (fromDeal !== undefined) parameters[code] = fromDeal;
        }
        continue;
      }

      if (field.type === 'UF:money') {
        const raw = formValues[code];
        if (field.multiple) {
          const arr = Array.isArray(raw) ? raw : (raw ? [raw] : []);
          parameters[code] = arr.map((v) => encodeMoney(v)).filter(Boolean);
        } else if (!isEmpty(raw)) {
          parameters[code] = encodeMoney(raw);
        }
        continue;
      }

      if (field.type === 'bool') {
        parameters[code] = formValues[code] ? 'Y' : 'N';
        continue;
      }

      const val = formValues[code];
      if (isEmpty(val)) continue;
      parameters[code] = val;
    }

    return { parameters, deal };
  }

  async function startBp608(form, dealId, call, options) {
    if (!form || !dealId || !call) throw new Error('Нет формы, сделки или REST');
    if (!window.BP608Form || !window.BP608Form.collectValues) {
      throw new Error('Модуль формы не загружен');
    }
    const { parameters } = await buildWorkflowParameters(form, dealId, call, options);
    const workflowId = await call('bizproc.workflow.start', {
      TEMPLATE_ID: BP608_TEMPLATE_ID,
      DOCUMENT_ID: ['crm', 'CCrmDocumentDeal', 'DEAL_' + dealId],
      PARAMETERS: parameters,
    });
    window.__bp608StartReport = {
      dealId: dealId,
      templateId: BP608_TEMPLATE_ID,
      workflowId: workflowId,
      parameters: parameters,
    };
    return window.__bp608StartReport;
  }

  var DEAL_HEADER_FIELDS = [
    'STAGE_ID', 'CATEGORY_ID', SALES_DEAL_FROM_REGISTRATION_UF,
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
    return isWonStageId(deal && deal.STAGE_ID);
  }

  async function isDealCompletedById(call, dealId) {
    if (!call || !dealId) return false;
    const deal = await call('crm.deal.get', { id: dealId, select: ['STAGE_ID'] });
    if (window.__bp608Deal && String(window.__bp608Deal.ID) === String(dealId)) {
      window.__bp608Deal.STAGE_ID = deal.STAGE_ID;
    }
    return isWonStageId(deal.STAGE_ID);
  }

  function contactEmailFilled(emails) {
    const list = Array.isArray(emails) ? emails : (emails ? [emails] : []);
    return list.some((e) => {
      if (e == null) return false;
      const v = typeof e === 'object' ? e.VALUE : e;
      return String(v || '').trim().length > 0;
    });
  }

  function contactPhoneFilled(phones) {
    const list = Array.isArray(phones) ? phones : (phones ? [phones] : []);
    return list.some((p) => {
      if (p == null) return false;
      const v = typeof p === 'object' ? p.VALUE : p;
      return String(v || '').trim().length > 0;
    });
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
      return {
        id: Number(id),
        title: 'Контакт #' + id,
        fioFilled: false,
        phoneFilled: false,
        emailFilled: false,
        requisitesFilled: false,
      };
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
      phoneFilled: contactPhoneFilled(c.PHONE),
      emailFilled: contactEmailFilled(c.EMAIL),
      requisitesFilled: list.length > 0,
    };
  }

  async function fetchContactDetailsBatch(ids) {
    const batch = window.__bp608CallBatch;
    const calls = {};
    ids.forEach((id) => {
      calls['c' + id] = ['crm.contact.get', {
        id: id,
        select: ['ID', 'NAME', 'LAST_NAME', 'SECOND_NAME', 'EMAIL', 'PHONE'],
      }];
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
          select: ['ID', 'NAME', 'LAST_NAME', 'SECOND_NAME', 'EMAIL', 'PHONE'],
        });
        const requisitesFilled = await contactRequisitesFilled(call, Number(c.ID));
        return contactRecordFromRaw(id, c, requisitesFilled ? [{ ID: 1 }] : []);
      } catch (_) {
        return {
          id: Number(id),
          title: 'Контакт #' + id,
          fioFilled: false,
          phoneFilled: false,
          emailFilled: false,
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

  function resetFileFieldsUI(form) {
    if (!form) return;
    form.querySelectorAll('input[type=file]').forEach((inp) => {
      inp.value = '';
    });
    form.querySelectorAll('.file-field').forEach((wrap) => {
      wrap.classList.remove('has-file', 'has-deal-file');
      wrap.removeAttribute('data-file-cleared');
    });
    form.querySelectorAll('.file-names').forEach((hint) => {
      hint.textContent = '';
      hint.innerHTML = '';
      hint.classList.remove('ok', 'muted');
      hint.classList.add('muted');
    });
  }

  function setFileHint(form, param, names, downloadEntries) {
    const hint = form.querySelector('[data-files-for="' + param + '"]');
    if (!hint || !names.length) return;
    hint.classList.add('ok');
    const entries = downloadEntries && downloadEntries.length
      ? downloadEntries
      : names.map((name) => ({ name: name, downloadUrl: '' }));
    if (entries.some((e) => e.downloadUrl)) {
      hint.innerHTML = entries.map((f) => {
        if (f.downloadUrl) {
          return (
            '<a class="file-download-link" href="' + escHtml(f.downloadUrl) +
            '" target="_blank" rel="noopener noreferrer" download>' + escHtml(f.name) + '</a>'
          );
        }
        return '<span>' + escHtml(f.name) + '</span>';
      }).join('<br>');
    } else {
      hint.textContent = fileCountText(names.length);
    }
    const wrap = hint.closest('.file-field');
    if (wrap) wrap.classList.add('has-deal-file');
    if (window.BP608Form && window.BP608Form.refreshState) {
      window.BP608Form.refreshState(form);
    }
  }

  async function applyDealFileDownloads(form, deal, call, map) {
    const rows = map || window.BP608_DEAL_PREFILL_MAP || [];
    const groups = [];
    const flat = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row.kind !== 'file') continue;
      let raw = deal[row.deal];
      if (isEmpty(raw) && row.altDeal) raw = deal[row.altDeal];
      const entries = fileEntries(raw);
      if (!entries.length) continue;
      groups.push({ param: row.param, start: flat.length, count: entries.length });
      flat.push.apply(flat, entries);
    }
    if (!flat.length) return;
    const resolved = await resolveFileDownloadUrls(call, flat);
    groups.forEach((g) => {
      const slice = resolved.slice(g.start, g.start + g.count);
      setFileHint(form, g.param, slice.map((e) => e.name), slice);
    });
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
    return badTitle
      || contact.fioFilled === undefined
      || contact.phoneFilled === undefined
      || contact.emailFilled === undefined
      || contact.requisitesFilled === undefined;
  }

  async function hydrateContactList(call, contacts) {
    const list = (contacts || []).filter((c) => c && c.id > 0);
    if (!list.length) return [];
    if (!list.some(needsContactRefresh)) return list;
    const fresh = await fetchContactDetails(call, list.map((c) => Number(c.id)));
    const byId = Object.fromEntries(fresh.map((c) => [c.id, c]));
    return list.map((c) => Object.assign({}, c, byId[c.id] || {}));
  }

  function phoneSearchVariants(raw) {
    const d = String(raw || '').replace(/\D/g, '');
    if (!d) return [];
    const out = [d];
    if (d.length === 11 && (d[0] === '7' || d[0] === '8')) {
      out.push(d.slice(1), '7' + d.slice(1), '8' + d.slice(1));
    } else if (d.length === 10) {
      out.push('7' + d, '8' + d);
    }
    return out.filter((v, i, arr) => arr.indexOf(v) === i);
  }

  function pushUniqueId(ids, id) {
    const n = Number(id);
    if (n > 0 && ids.indexOf(n) === -1) ids.push(n);
  }

  function normalizeSearchText(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/ё/g, 'е')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function contactMatchesQuery(record, query) {
    if (!record || !record.id) return false;
    const q = normalizeSearchText(query);
    if (!q) return false;
    const digitsQ = q.replace(/\D/g, '');

    if (/^\d{1,9}$/.test(q)) {
      return String(record.id) === q;
    }

    if (digitsQ.length >= 10) {
      // Телефонный поиск идёт через findbycomm — ID уже релевантны.
      return true;
    }

    const title = normalizeSearchText(record.title);
    if (!title) return false;
    const tokens = q.split(' ').filter(Boolean);
    if (!tokens.length) return false;
    return tokens.every((t) => title.indexOf(t) !== -1);
  }

  async function listContactsByNameFilter(call, filter) {
    if (!filter) return [];
    try {
      const rows = await call('crm.contact.list', {
        filter: filter,
        select: ['ID', 'NAME', 'LAST_NAME', 'SECOND_NAME', 'PHONE', 'EMAIL'],
        order: { LAST_NAME: 'ASC' },
        start: 0,
      });
      return Array.isArray(rows) ? rows : [];
    } catch (_) {
      return [];
    }
  }

  /** Поиск существующих контактов: ID, телефон или ФИО (без создания). */
  async function searchContacts(call, query) {
    const q = String(query || '').trim();
    if (!q || !call) return [];

    const foundIds = [];
    const digits = q.replace(/\D/g, '');
    const isNumericId = /^\d{1,9}$/.test(q);
    const isPhone = digits.length >= 10;
    const hasLetters = /[A-Za-zА-Яа-яЁё]/.test(q);
    const letterCount = (q.match(/[A-Za-zА-Яа-яЁё]/g) || []).length;

    if (isNumericId) {
      try {
        const c = await call('crm.contact.get', {
          id: Number(q),
          select: ['ID', 'NAME', 'LAST_NAME', 'SECOND_NAME', 'PHONE', 'EMAIL'],
        });
        if (c && c.ID) pushUniqueId(foundIds, c.ID);
      } catch (_) {}
    }

    if (isPhone) {
      try {
        const dup = await call('crm.duplicate.findbycomm', {
          entity_type: 'CONTACT',
          type: 'PHONE',
          values: phoneSearchVariants(digits),
        });
        const list = (dup && dup.CONTACT) || [];
        list.forEach((id) => pushUniqueId(foundIds, id));
      } catch (_) {}
    }

    // ФИО: минимум 2 буквы, без «широкого» OR — иначе Б24 отдаёт первую страницу А→Я.
    if (hasLetters && letterCount >= 2 && !isPhone) {
      const parts = q.split(/\s+/).filter(Boolean);
      let rows = [];
      if (parts.length >= 2 && !/^\d+$/.test(parts[0])) {
        rows = await listContactsByNameFilter(call, {
          '%LAST_NAME': parts[0],
          '%NAME': parts[1],
        });
      } else if (parts[0] && !/^\d+$/.test(parts[0])) {
        const term = parts[0];
        rows = await listContactsByNameFilter(call, { '%LAST_NAME': term });
        if (!rows.length) {
          rows = await listContactsByNameFilter(call, { '%NAME': term });
        }
        if (!rows.length) {
          rows = await listContactsByNameFilter(call, { '%SECOND_NAME': term });
        }
      }
      rows.forEach((c) => {
        if (c && c.ID) pushUniqueId(foundIds, c.ID);
      });
    }

    if (!foundIds.length) return [];
    const details = await fetchContactDetails(call, foundIds.slice(0, 20));
    return details.filter((c) => contactMatchesQuery(c, q));
  }

  async function applyCrmPrefill(form) {
    window.BP608Form.syncOwnershipContacts(form);
  }

  window.BP608DealPrefill = {
    warmup: function (call) {
      if (!call) return Promise.resolve();
      if (!window.__bp608EnumWarmup) {
        window.__bp608EnumWarmup = loadEnumMaps(call).catch(() => ({}));
      }
      return window.__bp608EnumWarmup;
    },
    enrichContacts: function (call, contacts) {
      return hydrateContactList(call, contacts);
    },
    searchContacts: function (call, query) {
      return searchContacts(call, query);
    },
    isDealCompletedStage: isDealCompletedStage,
    isDealCompletedById: isDealCompletedById,
    resolveSalesDealId: resolveSalesDealId,
    SALES_DEAL_FROM_REGISTRATION_UF: SALES_DEAL_FROM_REGISTRATION_UF,
    fetchPlacementMeta: async function (dealId, call) {
      return call('crm.deal.get', {
        id: dealId,
        select: ['ID', 'CATEGORY_ID', SALES_DEAL_FROM_REGISTRATION_UF],
      });
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
    load: async function (form, dealId, call, prefetchedDeal) {
      const map = window.BP608_DEAL_PREFILL_MAP || [];
      let deal = prefetchedDeal;
      if (!deal || Number(deal.ID) !== Number(dealId)) {
        deal = await call('crm.deal.get', { id: dealId, select: dealSelectFields(map) });
      }
      window.__bp608Deal = deal;
      const formEl = (form.querySelector && form.querySelector('#bp608-form')) || form;
      resetFileFieldsUI(formEl);
      const enumPromise = loadEnumMaps(call);
      const contactsPromise = buildDealContactStash(deal, call);
      const enumMaps = await enumPromise;
      const { payload, report } = await buildPayload(deal, enumMaps);
      window.BP608Form.applyValues(form, payload);
      if (window.__bp608ViewOnly) {
        await applyDealFileDownloads(formEl, deal, call, map);
      } else {
        (report.files || []).forEach((f) => setFileHint(formEl, f.param, f.names));
      }
      const contactStash = await contactsPromise;
      window.BP608Form.setDealContacts(contactStash);
      applyCrmPrefillFromStash(contactStash);
      await applyCrmPrefill(form);
      report.unmapped = window.BP608_DEAL_PREFILL_UNMAPPED || [];
      window.__bp608PrefillReport = report;
      return report;
    },
    fetchDeal: async function (dealId, call) {
      const map = window.BP608_DEAL_PREFILL_MAP || [];
      const deal = await call('crm.deal.get', { id: dealId, select: dealSelectFields(map) });
      window.__bp608Deal = deal;
      return deal;
    },
    dealSelectFields: function (map) {
      return dealSelectFields(map || window.BP608_DEAL_PREFILL_MAP || []);
    },
    save: async function (form, dealId, call) {
      return saveToDeal(form, dealId, call);
    },
    buildWorkflowParameters: async function (form, dealId, call, options) {
      return buildWorkflowParameters(form, dealId, call, options);
    },
    startWorkflow: async function (form, dealId, call, options) {
      return startBp608(form, dealId, call, options);
    },
    BP608_TEMPLATE_ID: BP608_TEMPLATE_ID,
  };
})();
