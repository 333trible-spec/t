'use strict';

(function () {
  const SECTIONS = [
    {
      id: 'contract',
      title: 'Договор',
      codes: [
        'type_doc', 'property_type', 'ownership_contact',
        'commit_deal', 'repid_sale', 'link_deal',
      ],
    },
    {
      id: 'payment',
      title: 'Регистрация и оплата',
      codes: [
        'form_payment', 'type_registr', 'bank', 'sber', 'down_payment_period',
        'summ_MSK', 'summ_sotrudnichestva', 'initial_fee',
      ],
    },
    {
      id: 'documents',
      title: 'Документы',
      codes: [
        'pasport', 'snils', 'inn', 'marriage_certificate', 'birth_certificate',
        'adress_kids', 'math_capital', 'ostatok_capital', 'sertifikat_sotrudnichestva',
        'notarised', 'other_docs',
      ],
    },
    {
      id: 'portrait',
      title: 'Портрет покупателя',
      codes: [
        'age', 'city', 'sex', 'target', 'famStatus', 'kindOfActivity',
        'kids', 'attraction', 'animals',
      ],
    },
  ];

  const DOC_FILE_CODES = new Set(SECTIONS.find((s) => s.id === 'documents').codes);

  function esc(s) {
    const d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }

  function fileCountText(n) {
    if (!n) return '';
    const mod100 = n % 100;
    const mod10 = n % 10;
    if (mod10 === 1 && mod100 !== 11) return n + ' файл прикреплён';
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return n + ' файла прикреплено';
    return n + ' файлов прикреплено';
  }

  const OWNERSHIP = {
    INDIVIDUAL: 'Индивидуальная собственность',
    SHARED: 'Долевая собственность',
    JOINT: 'Общая совместная собственность',
  };

  function contactDetailUrl(contactId) {
    const id = Number(contactId);
    if (!id) return '#';
    let domain = 'ik-navigator.bitrix24.ru';
    try {
      if (typeof BX24 !== 'undefined' && typeof BX24.getDomain === 'function') {
        const d = BX24.getDomain();
        if (d) domain = d;
      }
    } catch (_) {}
    return 'https://' + domain + '/crm/contact/details/' + id + '/';
  }

  function contactIconSvg(contactId) {
    const gid = 'ndCg' + String(contactId || '0');
    return (
      '<svg class="contact-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
      '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">' +
      '<stop offset="0" stop-color="#88c276"/><stop offset="0.5" stop-color="#4db6ab"/><stop offset="1" stop-color="#2d95d2"/>' +
      '</linearGradient></defs>' +
      '<circle cx="12" cy="8.4" r="3.9" fill="url(#' + gid + ')"/>' +
      '<path d="M4.6 20c.5-3.8 3.2-6 7.4-6s6.9 2.2 7.4 6" fill="url(#' + gid + ')"/>' +
      '</svg>'
    );
  }

  function contactAlertMessages(c) {
    const parts = [];
    if (c.fioFilled === false) parts.push('ФИО не заполнено');
    if (c.emailFilled === false) parts.push('Почта не заполнена');
    if (c.requisitesFilled !== true) parts.push('Реквизиты не заполнены');
    return parts;
  }

  function renderContactAlert(c) {
    const parts = contactAlertMessages(c);
    if (!parts.length) return '';
    const tip = parts.map((p) => '<span class="contact-alert-line">' + esc(p) + '</span>').join('');
    return (
      '<span class="contact-alert" tabindex="0" aria-label="' + esc(parts.join('. ')) + '">' +
      '<span class="contact-alert-dot" aria-hidden="true"></span>' +
      '<span class="contact-alert-tip" role="tooltip">' + tip + '</span>' +
      '</span>'
    );
  }

  function renderOwnershipCards(contacts) {
    if (!contacts || !contacts.length) {
      return '<p class="contact-empty muted">Контакты не указаны в сделке</p>';
    }
    return contacts.map((c) => {
      const title = String(c.title || '').trim() || ('Контакт #' + c.id);
      return (
      '<div class="contact-card-wrap">' +
      '<a class="contact-card contact-card-link" href="' + esc(contactDetailUrl(c.id)) + '" target="_blank" rel="noopener noreferrer" data-id="' + esc(c.id) + '" title="Открыть контакт: ' + esc(title) + '">' +
      renderContactAlert(c) +
      '<span class="contact-avatar" aria-hidden="true">' + contactIconSvg(c.id) + '</span>' +
      '<div class="contact-body">' +
      '<span class="contact-name">' + esc(title) + '</span>' +
      '</div>' +
      '</a>' +
      '</div>'
      );
    }).join('');
  }

  function renderOwnershipContactField(config) {
    const p1 = fieldByCode(config, 'Parameter1');
    const p2 = fieldByCode(config, 'Parameter2');
    let hidden = '';
    if (p1) hidden += renderField(Object.assign({}, p1, { code: 'Parameter1' })).replace('class="field', 'class="field sr-only');
    if (p2) hidden += renderField(Object.assign({}, p2, { code: 'Parameter2' })).replace('class="field', 'class="field sr-only');
    return (
      '<div class="field ownership-contact-field" data-field="ownership_contact">' +
      '<label class="lbl ownership-lbl" data-ownership-label>Контакт</label>' +
      '<div class="contact-cards" data-ownership-display aria-live="polite"></div>' +
      '<p class="hint ownership-hint" data-ownership-hint></p>' +
      '<div class="ownership-hidden">' + hidden + '</div>' +
      '</div>'
    );
  }

  function ownershipFieldLabel(type, contacts) {
    if (type === OWNERSHIP.SHARED || type === OWNERSHIP.JOINT) return 'Контакты';
    return 'Контакт';
  }

  function getActiveOwnershipContacts(form) {
    const type = propertyTypeSelected(form)[0];
    if (type === OWNERSHIP.JOINT) return getCrmField(form, 'Parameter1');
    if (type === OWNERSHIP.SHARED) return getCrmField(form, 'Parameter2');
    return [];
  }

  function ownershipHintText(type) {
    if (!type) return 'Выберите тип собственности';
    return '';
  }

  function renderOwnershipDisplay(form, contacts) {
    const box = form.querySelector('[data-ownership-display]');
    const hint = form.querySelector('[data-ownership-hint]');
    const lbl = form.querySelector('[data-ownership-label]');
    const field = form.querySelector('.ownership-contact-field');
    if (!box) return;
    const type = propertyTypeSelected(form)[0];

    if (!type) {
      if (lbl) {
        lbl.classList.remove('hidden');
        lbl.textContent = 'Контакт';
      }
      if (field) field.classList.add('ownership-awaiting-type');
      box.innerHTML = '';
      if (hint) {
        hint.classList.remove('hidden');
        hint.textContent = 'Выберите тип собственности';
      }
      return;
    }

    if (lbl) {
      lbl.classList.remove('hidden');
      lbl.textContent = ownershipFieldLabel(type, contacts);
    }
    if (field) field.classList.remove('ownership-awaiting-type');
    box.innerHTML = renderOwnershipCards(contacts);
    if (hint) {
      const text = ownershipHintText(type);
      hint.textContent = text;
      hint.classList.toggle('hidden', !text);
    }
  }

  function getDealContactStash() {
    return window.__bp608DealContacts || {};
  }

  function contactsForOwnershipType(type, stash) {
    stash = stash || getDealContactStash();
    if (type === OWNERSHIP.INDIVIDUAL) {
      return stash.dealContact ? [stash.dealContact] : [];
    }
    if (type === OWNERSHIP.SHARED) {
      return (stash.parameter2 || []).slice();
    }
    if (type === OWNERSHIP.JOINT) {
      return (stash.parameter1 || []).slice();
    }
    return [];
  }

  function syncOwnershipContacts(form, options) {
    const opts = options || {};
    const type = propertyTypeSelected(form)[0];
    let contacts = [];

    if (!type) {
      renderOwnershipDisplay(form, []);
      setCrmField(form, 'Parameter1', []);
      setCrmField(form, 'Parameter2', []);
      return;
    }

    if (opts.fromHidden) {
      if (type === OWNERSHIP.JOINT) contacts = getCrmField(form, 'Parameter1');
      else if (type === OWNERSHIP.SHARED) contacts = getCrmField(form, 'Parameter2');
      else if (type === OWNERSHIP.INDIVIDUAL) {
        const stash = getDealContactStash();
        contacts = stash.dealContact ? [stash.dealContact] : [];
      }
      if (!contacts.length) contacts = contactsForOwnershipType(type, getDealContactStash());
    } else {
      contacts = contactsForOwnershipType(type, getDealContactStash());
      if (!contacts.length && opts.fallbackHidden) {
        if (type === OWNERSHIP.JOINT) contacts = getCrmField(form, 'Parameter1');
        else if (type === OWNERSHIP.SHARED) contacts = getCrmField(form, 'Parameter2');
      }
    }

    const p1 = type === OWNERSHIP.JOINT ? contacts : [];
    const p2 = type === OWNERSHIP.SHARED ? contacts : [];
    setCrmField(form, 'Parameter1', p1);
    setCrmField(form, 'Parameter2', p2);
    const stash = getDealContactStash();
    const stashPool = [stash.dealContact]
      .concat(stash.parameter1 || [], stash.parameter2 || [])
      .filter(Boolean);
    const stashById = Object.fromEntries(stashPool.map((c) => [Number(c.id), c]));
    contacts = contacts.map((c) => {
      const s = stashById[Number(c.id)];
      if (!s) return c;
      return Object.assign({}, s, c, {
        requisitesFilled: c.requisitesFilled != null ? c.requisitesFilled : s.requisitesFilled,
        fioFilled: c.fioFilled != null ? c.fioFilled : s.fioFilled,
        emailFilled: c.emailFilled != null ? c.emailFilled : s.emailFilled,
        lastName: c.lastName != null ? c.lastName : s.lastName,
        firstName: c.firstName != null ? c.firstName : s.firstName,
        secondName: c.secondName != null ? c.secondName : s.secondName,
      });
    });
    renderOwnershipDisplay(form, contacts);
    refreshFilledState(form);
  }

  function fieldByCode(config, code) {
    return config.find((f) => f.code === code);
  }

  function renderFieldLabel(field, req) {
    if (field.code === 'initial_fee') {
      return (
        '<label class="lbl lbl-multiline">' +
        '<span class="lbl-text">' + esc('Общая сумма первоначального взноса') + req + '</span>' +
        '<span class="lbl-sub">' + esc('(с учетом всех сертификатов и собственных средств)') + '</span>' +
        '</label>'
      );
    }
    return '<label class="lbl"><span class="lbl-text">' + esc(field.label) + req + '</span></label>';
  }

  function renderField(field) {
    const req = field.required ? '&nbsp;<span class="req">*</span>' : '';
    const multi = field.multiple ? ' multiple' : '';
    const reqAttr = field.required ? ' required' : '';
    let control = '';

    switch (field.type) {
      case 'bool':
        control =
          '<label class="check-row">' +
          '<input type="checkbox" name="' + esc(field.code) + '" value="1">' +
          '<span>Да</span></label>';
        break;
      case 'select':
        if (field.code === 'property_type') {
          control =
            '<select class="inp" name="property_type" data-property-type' + reqAttr + '>' +
            '<option value="">— выберите —</option>' +
            (field.options || []).map((o) => '<option value="' + esc(o) + '">' + esc(o) + '</option>').join('') +
            '</select>';
        } else if (field.code === 'sber' || field.code === 'repid_sale') {
          control =
            '<div class="yesno-group" data-yesno-group="' + esc(field.code) + '">' +
            (field.options || ['Да', 'Нет']).map((o) =>
              '<label class="chip-option">' +
              '<input type="radio" class="chip-input yesno-radio" name="' + esc(field.code) + '" value="' + esc(o) + '"' + reqAttr + '>' +
              '<span class="chip-label">' + esc(o) + '</span></label>'
            ).join('') +
            '</div>';
        } else if (field.code === 'summ_MSK') {
          control =
            '<div class="chip-group" data-chip-group="' + esc(field.code) + '">' +
            (field.options || []).map((o) =>
              '<label class="chip-option">' +
              '<input type="checkbox" class="chip-input" name="' + esc(field.code) + '" value="' + esc(o) + '">' +
              '<span class="chip-label">' + esc(o) + '</span></label>'
            ).join('') +
            '</div>';
        } else if (field.multiple) {
          control =
            '<div class="check-group" data-check-group="' + esc(field.code) + '">' +
            (field.options || []).map((o) =>
              '<label class="check-row check-option">' +
              '<input type="checkbox" name="' + esc(field.code) + '" value="' + esc(o) + '">' +
              '<span>' + esc(o) + '</span></label>'
            ).join('') +
            '</div>';
        } else {
          control =
            '<select class="inp" name="' + esc(field.code) + '"' + reqAttr + '>' +
            '<option value="">— выберите —</option>' +
            (field.options || []).map((o) => '<option value="' + esc(o) + '">' + esc(o) + '</option>').join('') +
            '</select>';
        }
        break;
      case 'UF:money':
        control =
          '<input class="inp inp-money" type="number" step="0.01" min="0" name="' + esc(field.code) + '" placeholder="0.00"' + reqAttr + '>';
        break;
      case 'file': {
        const fid = 'file-' + esc(field.code);
        const isDocTile = DOC_FILE_CODES.has(field.code);
        const icons =
          '<svg class="file-icon-add" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>' +
          '<svg class="file-icon-done" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        const nativeInput = '<input class="file-native" id="' + fid + '" type="file" name="' + esc(field.code) + '"' + multi + reqAttr + '>';
        const namesBox = '<div class="file-names muted" data-files-for="' + esc(field.code) + '"></div>';
        if (isDocTile) {
          control =
            '<label class="doc-tile" for="' + fid + '">' +
            '<span class="doc-tile-title">' + esc(field.label) + req + '</span>' +
            '<div class="file-field" data-file-field="' + esc(field.code) + '">' +
            nativeInput +
            '<span class="file-trigger" aria-hidden="true">' + icons + '</span>' +
            namesBox +
            '</div>' +
            '</label>';
        } else {
          control =
            '<div class="file-field" data-file-field="' + esc(field.code) + '">' +
            nativeInput +
            '<label class="file-trigger" for="' + fid + '" title="Прикрепить файл" aria-label="Прикрепить файл">' + icons + '</label>' +
            namesBox +
            '</div>';
        }
        break;
      }
      case 'UF:crm':
        control =
          '<div class="crm-field" data-crm="' + esc(field.code) + '">' +
          '<input type="hidden" name="' + esc(field.code) + '" value="[]">' +
          '<button type="button" class="btn secondary crm-add">+ Контакт</button>' +
          '<ul class="crm-list"></ul>' +
          '<p class="hint crm-hint">Контакты из CRM портала (несколько — если тип поля множественный)</p>' +
          '</div>';
        break;
      default:
        if (field.code === 'commit_deal') {
          control = '<textarea class="inp inp-wide" rows="3" name="' + esc(field.code) + '"' + reqAttr + '></textarea>';
        } else {
          control = '<input class="inp" type="text" name="' + esc(field.code) + '"' + reqAttr + '>';
        }
    }

    const ownershipSlot = false;
    const repidLinkSlot = field.code === 'link_deal';
    const docTile = field.type === 'file' && DOC_FILE_CODES.has(field.code);
    return (
      '<div class="field' +
      (ownershipSlot ? ' ownership-slot' : '') +
      (repidLinkSlot ? ' repid-link-slot hidden' : '') +
      (docTile ? ' field-doc-tile' : '') +
      '" data-field="' + esc(field.code) + '">' +
      (docTile ? '' : renderFieldLabel(field, req)) +
      control +
      '</div>'
    );
  }

  function renderForm(container, config) {
    const byCode = Object.fromEntries(config.map((f) => [f.code, f]));
    let html = '<form id="bp608-form" class="bp-form" novalidate>';

    SECTIONS.forEach((sec) => {
      html +=
        '<section class="form-section" data-section-id="' + esc(sec.id) + '">' +
        '<h3>' + esc(sec.title) + '</h3>' +
        '<div class="fields' + (sec.id === 'documents' ? ' fields-docs' : '') + '">';
      sec.codes.forEach((code) => {
        if (code === 'ownership_contact') {
          html += renderOwnershipContactField(config);
          return;
        }
        const f = byCode[code] || fieldByCode(config, code);
        if (f) html += renderField(f);
      });
      html += '</div></section>';
    });

    html +=
      '</form>' +
      '<div class="form-footer">' +
      '<p id="form-msg" class="form-msg muted"></p>' +
      '<pre id="form-preview" class="preview hidden"></pre>' +
      '</div>';

    container.innerHTML = html;
    bindForm(container, config);
  }

  function parseCrmHidden(raw) {
    try {
      const v = JSON.parse(raw || '[]');
      return Array.isArray(v) ? v : [];
    } catch (_) {
      return [];
    }
  }

  function crmContactIds(contacts) {
    return (contacts || []).map((c) => Number(c.id)).filter((id) => id > 0);
  }

  function renderCrmList(wrap, contacts) {
    const list = wrap.querySelector('.crm-list');
    if (!list) return;
    if (!contacts.length) {
      list.innerHTML = '';
      return;
    }
    list.innerHTML = contacts.map((c) =>
      '<li data-id="' + esc(c.id) + '">' +
      esc(c.title || ('Контакт #' + c.id)) +
      ' <button type="button" class="btn crm-remove" data-id="' + esc(c.id) + '" title="Убрать">×</button>' +
      '</li>'
    ).join('');
  }

  function setCrmField(form, fieldCode, contacts) {
    const wrap = form.querySelector('[data-crm="' + fieldCode + '"]');
    if (!wrap) return;
    const hidden = wrap.querySelector('input[type=hidden]');
    const normalized = (contacts || []).map((c) => ({
      id: Number(c.id),
      title: c.title || '',
      requisitesFilled: c.requisitesFilled,
    })).filter((c) => c.id > 0);
    if (hidden) hidden.value = JSON.stringify(normalized);
    renderCrmList(wrap, normalized);
    refreshFilledState(form);
  }

  function getCrmField(form, fieldCode) {
    const wrap = form.querySelector('[data-crm="' + fieldCode + '"]');
    if (!wrap) return [];
    const hidden = wrap.querySelector('input[type=hidden]');
    return parseCrmHidden(hidden && hidden.value);
  }

  function openCrmPicker(form, field) {
    if (typeof BX24 === 'undefined' || typeof BX24.selectCRM !== 'function') {
      alert('Выбор контактов доступен только во вкладке сделки на портале ik-navigator.');
      return;
    }
    const current = getCrmField(form, field.code);
    const ids = crmContactIds(current);
    BX24.selectCRM(
      {
        entityType: ['contact'],
        multiple: !!field.multiple,
        value: ids.length ? { contact: ids } : undefined,
      },
      function (result) {
        if (!result || !result.contact) return;
        const picked = result.contact.map((c) => ({
          id: parseInt(String(c.id).replace(/^C_/i, ''), 10),
          title: c.title || '',
        })).filter((c) => c.id > 0);
        if (!field.multiple && picked.length > 1) picked.length = 1;
        const apply = (list) => {
          setCrmField(form, field.code, field.multiple ? list : list.slice(0, 1));
          if (field.code === 'Parameter1' || field.code === 'Parameter2') {
            const type = propertyTypeSelected(form)[0];
            const active =
              (type === OWNERSHIP.JOINT && field.code === 'Parameter1') ||
              (type === OWNERSHIP.SHARED && field.code === 'Parameter2');
            if (active) renderOwnershipDisplay(form, getCrmField(form, field.code));
          }
        };
        const call = window.__bp608Call;
        if (call && window.BP608DealPrefill && window.BP608DealPrefill.enrichContacts) {
          window.BP608DealPrefill.enrichContacts(call, picked).then(apply).catch(() => apply(picked));
        } else {
          apply(picked);
        }
      }
    );
  }

  function multiSelectValues(form, code) {
    return [...form.querySelectorAll('input[name="' + code + '"]:checked')].map((i) => i.value);
  }

  function propertyTypeSelected(form) {
    const sel = form.querySelector('select[name="property_type"]');
    return sel && sel.value ? [sel.value] : [];
  }

  function isYesNoField(code) {
    return code === 'sber' || code === 'repid_sale';
  }

  function yesNoValue(form, code) {
    const r = form.querySelector('input.yesno-radio[name="' + code + '"]:checked');
    return r ? r.value : '';
  }

  function isRepidSaleYes(form) {
    return yesNoValue(form, 'repid_sale') === 'Да';
  }

  function syncRepidSaleLink(form) {
    const wrap = form.querySelector('[data-field="link_deal"]');
    if (!wrap) return;
    const show = isRepidSaleYes(form);
    wrap.classList.toggle('hidden', !show);
    if (!show) {
      const el = form.elements.link_deal;
      if (el) el.value = '';
      wrap.classList.remove('invalid');
    }
  }

  function syncOwnershipFields(form) {
    syncOwnershipContacts(form);
  }

  function collectValues(form) {
    const data = {};
    const config = window.BP608_FORM_CONFIG || [];
    config.forEach((field) => {
      const el = form.elements[field.code];
      if (field.type === 'UF:crm') {
        const contacts = getCrmField(form, field.code);
        data[field.code] = field.multiple ? crmContactIds(contacts) : (crmContactIds(contacts)[0] || null);
        return;
      }
      if (field.code === 'property_type') {
        data[field.code] = propertyTypeSelected(form)[0] || '';
        return;
      }
      if (isYesNoField(field.code)) {
        data[field.code] = yesNoValue(form, field.code);
        return;
      }
      if (!el) return;
      if (field.type === 'bool') {
        data[field.code] = el.checked;
        return;
      }
      if (field.type === 'file') {
        const files = el.files ? [...el.files].map((f) => f.name) : [];
        data[field.code] = field.multiple ? files : files[0] || '';
        return;
      }
      if (field.type === 'select' && field.multiple) {
        data[field.code] = multiSelectValues(form, field.code);
        return;
      }
      data[field.code] = el.value;
    });
    return data;
  }

  function valuesEqual(a, b) {
    if (Array.isArray(a) || Array.isArray(b)) {
      const toArr = (v) => Array.isArray(v) ? v : (v == null || v === '' ? [] : [v]);
      const aa = toArr(a).map(String).slice().sort();
      const bb = toArr(b).map(String).slice().sort();
      if (aa.length !== bb.length) return false;
      return aa.every((v, i) => v === bb[i]);
    }
    if (typeof a === 'boolean' || typeof b === 'boolean') return !!a === !!b;
    const na = a == null ? '' : String(a).trim();
    const nb = b == null ? '' : String(b).trim();
    return na === nb;
  }

  function countChangedFields(form) {
    const base = window.__bp608Baseline || {};
    const cur = collectValues(form);
    let n = 0;
    Object.keys(cur).forEach((code) => {
      if (!valuesEqual(base[code], cur[code])) n += 1;
    });
    return n;
  }

  function fieldsWord(n) {
    const mod100 = n % 100;
    const mod10 = n % 10;
    if (mod10 === 1 && mod100 !== 11) return 'поле';
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'поля';
    return 'полей';
  }

  function normText(s) {
    return String(s == null ? '' : s).replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function setSelectValue(select, value) {
    const raw = Array.isArray(value) ? value[0] : value;
    if (raw == null || raw === '') {
      select.value = '';
      return;
    }
    const target = normText(raw);
    const opts = [...select.options];
    const hit = opts.find((o) => normText(o.value) === target)
      || opts.find((o) => normText(o.textContent) === target);
    select.value = hit ? hit.value : String(raw);
  }

  function applyValues(form, data) {
    if (!data) return;
    (window.BP608_FORM_CONFIG || []).forEach((field) => {
      if (data[field.code] === undefined) return;
      if (field.type === 'UF:crm') {
        const raw = data[field.code];
        const ids = Array.isArray(raw) ? raw : (raw ? [raw] : []);
        const stash = window.__bp608CrmPrefill || {};
        const dealStash = window.__bp608DealContacts || {};
        let titled = stash[field.code];
        if (!titled || !titled.length) {
          if (field.code === 'Parameter1') titled = dealStash.parameter1;
          else if (field.code === 'Parameter2') titled = dealStash.parameter2;
        }
        if (!titled || !titled.length) {
          titled = ids.map((id) => ({ id: Number(id), title: '' }));
        }
        setCrmField(form, field.code, titled);
        return;
      }
      if (field.code === 'property_type') {
        const v = Array.isArray(data[field.code]) ? data[field.code][0] : data[field.code];
        const sel = form.querySelector('select[name="property_type"]');
        if (sel) setSelectValue(sel, v);
        syncOwnershipContacts(form);
        return;
      }
      if (isYesNoField(field.code)) {
        let v = data[field.code];
        if (field.code === 'sber' && v === 'Есть') v = 'Да';
        form.querySelectorAll('input.yesno-radio[name="' + field.code + '"]').forEach((inp) => {
          inp.checked = inp.value === v;
        });
        if (field.code === 'repid_sale') syncRepidSaleLink(form);
        return;
      }
      const el = form.elements[field.code];
      if (!el) return;
      if (field.type === 'bool') {
        el.checked = !!data[field.code];
        return;
      }
      if (field.type === 'select' && field.multiple && Array.isArray(data[field.code])) {
        form.querySelectorAll('input[name="' + field.code + '"]').forEach((inp) => {
          inp.checked = data[field.code].includes(inp.value);
        });
        return;
      }
      if (el.tagName === 'SELECT') {
        setSelectValue(el, data[field.code]);
        return;
      }
      if (field.type !== 'file') el.value = data[field.code];
    });
    syncOwnershipContacts(form, { fromHidden: true, fallbackHidden: true });
    syncRepidSaleLink(form);
    refreshFilledState(form);
  }

  function isFieldVisible(form, field) {
    const wrap = form.querySelector('[data-field="' + field.code + '"]');
    if (!wrap || wrap.classList.contains('hidden') || wrap.classList.contains('sr-only')) return false;
    return true;
  }

  function isOwnershipFilled(form) {
    const own = form.querySelector('.ownership-contact-field');
    if (!own || own.classList.contains('hidden')) return false;
    const type = propertyTypeSelected(form)[0];
    if (!type) return false;
    if (type === OWNERSHIP.JOINT) return crmContactIds(getCrmField(form, 'Parameter1')).length > 0;
    if (type === OWNERSHIP.SHARED) return crmContactIds(getCrmField(form, 'Parameter2')).length > 0;
    return own.querySelectorAll('.contact-card').length > 0;
  }

  function isFieldFilled(form, field) {
    if (field.code === 'ownership_contact') return isOwnershipFilled(form);
    if (!isFieldVisible(form, field)) return false;
    if (field.type === 'UF:crm') {
      return crmContactIds(getCrmField(form, field.code)).length > 0;
    }
    if (field.code === 'property_type') {
      return propertyTypeSelected(form).length > 0;
    }
      if (isYesNoField(field.code)) {
        return yesNoValue(form, field.code) !== '';
      }
    if (field.type === 'bool') {
      const el = form.elements[field.code];
      return !!(el && el.checked);
    }
    if (field.type === 'select' && field.multiple) {
      return multiSelectValues(form, field.code).length > 0;
    }
    if (field.type === 'file') {
      const wrap = form.querySelector('[data-field="' + field.code + '"] .file-field');
      if (wrap && (wrap.classList.contains('has-file') || wrap.classList.contains('has-deal-file'))) return true;
      const el = form.elements[field.code];
      return !!(el && el.files && el.files.length > 0);
    }
    const el = form.elements[field.code];
    if (!el) return false;
    return String(el.value || '').trim() !== '';
  }

  function allRequiredFilled(form) {
    const config = window.BP608_FORM_CONFIG || [];
    for (let i = 0; i < config.length; i++) {
      const field = config[i];
      const wrap = form.querySelector('[data-field="' + field.code + '"]');
      if (wrap && wrap.classList.contains('hidden')) continue;

      if (field.code === 'link_deal') {
        if (isRepidSaleYes(form)) {
          const el = form.elements.link_deal;
          if (!(el && String(el.value || '').trim() !== '')) return false;
        }
        continue;
      }

      if (!field.required) continue;

      if (field.type === 'UF:crm') {
        if (field.code === 'Parameter1' || field.code === 'Parameter2') continue;
        if (crmContactIds(getCrmField(form, field.code)).length === 0) return false;
      } else if (field.code === 'property_type') {
        if (propertyTypeSelected(form).length === 0) return false;
      } else if (isYesNoField(field.code)) {
        if (yesNoValue(form, field.code) === '') return false;
      } else if (field.type === 'select' && field.multiple) {
        if (multiSelectValues(form, field.code).length === 0) return false;
      } else {
        const el = form.elements[field.code];
        if (!el) continue;
        if (field.type === 'bool') continue;
        if (field.type === 'file') {
          const fw = form.querySelector('[data-field="' + field.code + '"] .file-field');
          const hasFile = fw && (fw.classList.contains('has-file') || fw.classList.contains('has-deal-file'));
          if (!hasFile && !(el.files && el.files.length > 0)) return false;
        } else if (String(el.value || '').trim() === '') {
          return false;
        }
      }
    }
    return true;
  }

  function getSendContacts(form) {
    const type = propertyTypeSelected(form)[0];
    if (!type) return [];
    if (type === OWNERSHIP.INDIVIDUAL) {
      const stash = getDealContactStash();
      return stash.dealContact ? [stash.dealContact] : [];
    }
    if (type === OWNERSHIP.JOINT) return getCrmField(form, 'Parameter1');
    if (type === OWNERSHIP.SHARED) return getCrmField(form, 'Parameter2');
    return [];
  }

  function contactReadyForSend(c) {
    if (!c || !c.id) return false;
    return c.fioFilled === true && c.emailFilled === true && c.requisitesFilled === true;
  }

  function contactsReadyForSend(form) {
    if (!isOwnershipFilled(form)) return false;
    const contacts = getSendContacts(form);
    if (!contacts.length) return false;
    return contacts.every(contactReadyForSend);
  }

  function canSendForm(form) {
    return allRequiredFilled(form) && contactsReadyForSend(form);
  }

  function refreshSendButton(form) {
    const sendBtn = document.getElementById('btn-send');
    if (!sendBtn) return;
    const ro = form.classList.contains('form-readonly');
    sendBtn.disabled = ro || !canSendForm(form);
  }

  function refreshFilledState(form) {
    if (!form) return;
    (window.BP608_FORM_CONFIG || []).forEach((field) => {
      const wrap = form.querySelector('[data-field="' + field.code + '"]');
      if (!wrap) return;
      wrap.classList.toggle('filled', isFieldFilled(form, field));
    });
    const own = form.querySelector('.ownership-contact-field');
    if (own) own.classList.toggle('filled', isOwnershipFilled(form));
    refreshSendButton(form);
  }

  function storageKey(dealId) {
    return 'bp608-draft-deal-' + (dealId || 'preview');
  }

  function showStageBlockedOverlay() {
    const overlay = document.getElementById('stage-blocked-overlay');
    if (!overlay) return;
    overlay.classList.remove('hidden');
  }

  function hideStageBlockedOverlay() {
    const overlay = document.getElementById('stage-blocked-overlay');
    if (!overlay) return;
    overlay.classList.add('hidden');
  }

  async function isSaveBlockedByWonStage(dealId, callFn) {
    if (window.__bp608ViewOnly) return true;
    if (!dealId || !callFn || !window.BP608DealPrefill || !window.BP608DealPrefill.isDealCompletedById) {
      return false;
    }
    try {
      return await window.BP608DealPrefill.isDealCompletedById(callFn, dealId);
    } catch (e) {
      console.warn('won stage check', e);
      return false;
    }
  }

  function bindForm(container, config) {
    const form = container.querySelector('#bp608-form');
    const msg = container.querySelector('#form-msg');
    const preview = container.querySelector('#form-preview');
    const actionsRoot = document.getElementById('form-actions-bar');

    form.querySelectorAll('input[type=file]').forEach((inp) => {
      inp.addEventListener('change', () => {
        const hint = container.querySelector('[data-files-for="' + inp.name + '"]');
        const count = inp.files ? inp.files.length : 0;
        if (hint) hint.textContent = fileCountText(count);
        const wrap = inp.closest('.file-field');
        if (wrap) {
          wrap.classList.toggle('has-file', count > 0);
          if (count > 0) wrap.classList.remove('has-deal-file');
        }
        refreshFilledState(form);
      });
    });

    form.addEventListener('input', () => refreshFilledState(form));
    form.addEventListener('change', () => refreshFilledState(form));

    const byCode = Object.fromEntries(config.map((f) => [f.code, f]));
    form.querySelectorAll('.crm-add').forEach((btn) => {
      const wrap = btn.closest('[data-crm]');
      const code = wrap && wrap.getAttribute('data-crm');
      const field = code && byCode[code];
      if (!field) return;
      btn.onclick = () => openCrmPicker(form, field);
    });
    form.querySelectorAll('.crm-field').forEach((wrap) => {
      wrap.addEventListener('click', (e) => {
        const rm = e.target.closest('.crm-remove');
        if (!rm) return;
        const code = wrap.getAttribute('data-crm');
        const id = Number(rm.dataset.id);
        const next = getCrmField(form, code).filter((c) => Number(c.id) !== id);
        setCrmField(form, code, next);
        if (code === 'Parameter1' || code === 'Parameter2') {
          const type = propertyTypeSelected(form)[0];
          const active =
            (type === OWNERSHIP.JOINT && code === 'Parameter1') ||
            (type === OWNERSHIP.SHARED && code === 'Parameter2');
          if (active) renderOwnershipDisplay(form, next);
        }
      });
    });

    const propertyTypeSel = form.querySelector('select[name="property_type"]');
    if (propertyTypeSel) {
      propertyTypeSel.addEventListener('change', () => syncOwnershipContacts(form));
      syncOwnershipContacts(form);
    }

    const repidGroup = form.querySelector('[data-yesno-group="repid_sale"]');
    if (repidGroup) {
      repidGroup.addEventListener('change', () => syncRepidSaleLink(form));
      syncRepidSaleLink(form);
    }

    refreshFilledState(form);

    if (!actionsRoot) return;

    actionsRoot.querySelector('#btn-validate').onclick = () => {
      const bad = [];
      config.forEach((field) => {
        const wrap = form.querySelector('[data-field="' + field.code + '"]');
        if (wrap && wrap.classList.contains('hidden')) return;

        if (field.code === 'link_deal' && isRepidSaleYes(form)) {
          const el = form.elements.link_deal;
          const ok = el && String(el.value || '').trim() !== '';
          if (wrap) wrap.classList.toggle('invalid', !ok);
          if (!ok) bad.push(field.label);
          return;
        }

        if (!field.required) return;
        let ok = true;
        if (field.type === 'UF:crm') {
          if (field.code === 'Parameter1' || field.code === 'Parameter2') ok = true;
          else ok = crmContactIds(getCrmField(form, field.code)).length > 0;
        } else {
          if (field.code === 'property_type') {
            ok = propertyTypeSelected(form).length > 0;
          } else if (isYesNoField(field.code)) {
            ok = yesNoValue(form, field.code) !== '';
          } else if (field.type === 'select' && field.multiple) {
            ok = multiSelectValues(form, field.code).length > 0;
          } else {
            const el = form.elements[field.code];
            if (!el) return;
            if (field.type === 'bool') ok = true;
            else if (field.type === 'file') ok = isFieldFilled(form, field);
            else ok = String(el.value || '').trim() !== '';
          }
        }
        if (wrap) wrap.classList.toggle('invalid', !ok);
        if (!ok) bad.push(field.label);
      });
      if (bad.length) {
        msg.className = 'form-msg';
        msg.textContent = '';
        if (window.__bp608ShowSaveOverlay) {
          window.__bp608ShowSaveOverlay('Заполните обязательные: ' + bad.join('; '), 'error');
          setTimeout(() => {
            if (window.__bp608HideSaveOverlay) window.__bp608HideSaveOverlay();
          }, 3500);
        }
      } else {
        msg.className = 'form-msg';
        msg.textContent = '';
        if (window.__bp608ShowSaveOverlay) {
          window.__bp608ShowSaveOverlay('Обязательные поля заполнены', 'done');
          setTimeout(() => {
            if (window.__bp608HideSaveOverlay) window.__bp608HideSaveOverlay();
          }, 2200);
        }
      }
    };

    const sendBtn = actionsRoot.querySelector('#btn-send');
    if (sendBtn) {
      sendBtn.onclick = () => {
        return (async () => {
          const dealId = window.__bp608DealId;
          const callFn = window.__bp608Call;
          if (window.__bp608ViewOnly) {
            if (window.__bp608ShowSaveOverlay) {
              window.__bp608ShowSaveOverlay('В режиме просмотра отправка недоступна', 'error');
              setTimeout(() => {
                if (window.__bp608HideSaveOverlay) window.__bp608HideSaveOverlay();
              }, 2800);
            }
            return;
          }
          if (!dealId || !callFn) {
            if (window.__bp608ShowSaveOverlay) {
              window.__bp608ShowSaveOverlay('Отправка доступна только из карточки сделки на портале', 'error');
              setTimeout(() => {
                if (window.__bp608HideSaveOverlay) window.__bp608HideSaveOverlay();
              }, 2800);
            }
            return;
          }
          if (!canSendForm(form)) {
            refreshSendButton(form);
            const contactFail = !contactsReadyForSend(form);
            const text = contactFail
              ? 'Заполните обязательные поля и у контакта: ФИО, почту и реквизиты'
              : 'Заполните все обязательные поля формы';
            if (window.__bp608ShowSaveOverlay) {
              window.__bp608ShowSaveOverlay(text, 'error');
              setTimeout(() => {
                if (window.__bp608HideSaveOverlay) window.__bp608HideSaveOverlay();
              }, 3500);
            }
            return;
          }
          if (await isSaveBlockedByWonStage(dealId, callFn)) {
            showStageBlockedOverlay();
            return;
          }
          if (!window.BP608DealPrefill || !window.BP608DealPrefill.startWorkflow) {
            if (window.__bp608ShowSaveOverlay) {
              window.__bp608ShowSaveOverlay('Модуль запуска БП не загружен', 'error');
              setTimeout(() => {
                if (window.__bp608HideSaveOverlay) window.__bp608HideSaveOverlay();
              }, 2800);
            }
            return;
          }

          sendBtn.disabled = true;
          const submitBtn = actionsRoot.querySelector('#btn-submit');
          if (submitBtn) submitBtn.disabled = true;
          msg.className = 'form-msg';
          msg.textContent = '';
          preview.classList.add('hidden');

          if (window.__bp608ShowSaveOverlay) {
            window.__bp608ShowSaveOverlay('Передаю в оформление', 'progress');
          }
          try {
            if (window.BP608DealPrefill.save) {
              await window.BP608DealPrefill.save(form, dealId, callFn);
            }
            const report = await window.BP608DealPrefill.startWorkflow(form, dealId, callFn, {
              parameter3Yes: true,
            });
            try {
              localStorage.removeItem(storageKey(dealId));
            } catch (_) {}
            if (window.BP608DealPrefill.load) {
              try {
                await window.BP608DealPrefill.load(container, dealId, callFn);
              } catch (e2) {
                console.warn('refresh after send', e2);
              }
            }
            window.__bp608Baseline = collectValues(form);
            const wf = report && report.workflowId != null ? String(report.workflowId) : '';
            if (window.__bp608ShowSaveOverlay) {
              window.__bp608ShowSaveOverlay(
                wf ? ('БП 608 запущен · ' + wf) : 'БП 608 запущен',
                'done',
              );
              setTimeout(() => {
                if (window.__bp608HideSaveOverlay) window.__bp608HideSaveOverlay();
              }, 2800);
            }
          } catch (e) {
            if (window.__bp608ShowSaveOverlay) {
              window.__bp608ShowSaveOverlay(e.message || String(e), 'error');
              setTimeout(() => {
                if (window.__bp608HideSaveOverlay) window.__bp608HideSaveOverlay();
              }, 4000);
            }
          } finally {
            if (submitBtn) submitBtn.disabled = false;
            refreshSendButton(form);
          }
        })();
      };
    }

    function finishSubmit() {
      return (async () => {
        hideSaveConfirm();
        const dealId = window.__bp608DealId;
        const callFn = window.__bp608Call;
        if (!dealId || !callFn) {
          msg.className = 'form-msg err';
          msg.textContent = 'Сохранение в сделку доступно только из карточки сделки на портале';
          return;
        }
        if (await isSaveBlockedByWonStage(dealId, callFn)) {
          showStageBlockedOverlay();
          return;
        }
        if (!window.BP608DealPrefill || !window.BP608DealPrefill.save) {
          msg.className = 'form-msg err';
          msg.textContent = 'Модуль сохранения не загружен';
          return;
        }
        const submitBtn = actionsRoot.querySelector('#btn-submit');
        const yesBtn = actionsRoot.querySelector('#save-yes');
        if (submitBtn) submitBtn.disabled = true;
        if (yesBtn) yesBtn.disabled = true;
        const changed = countChangedFields(form);
        msg.className = 'form-msg';
        msg.textContent = '';
        preview.classList.add('hidden');
        if (window.__bp608ShowSaveOverlay) window.__bp608ShowSaveOverlay('идёт сохранение данных', 'progress');
        try {
          await window.BP608DealPrefill.save(form, dealId, callFn);
          try {
            localStorage.removeItem(storageKey(dealId));
          } catch (_) {}
          if (window.BP608DealPrefill.load) {
            try {
              await window.BP608DealPrefill.load(container, dealId, callFn);
            } catch (e2) {
              console.warn('refresh after save', e2);
            }
          }
          window.__bp608Baseline = collectValues(form);
          if (window.__bp608ShowSaveOverlay) {
            window.__bp608ShowSaveOverlay(
              'данные обновлены, изменено ' + changed + ' ' + fieldsWord(changed),
              'done',
            );
            setTimeout(() => {
              if (window.__bp608HideSaveOverlay) window.__bp608HideSaveOverlay();
            }, 2200);
          }
        } catch (e) {
          if (window.__bp608ShowSaveOverlay) {
            window.__bp608ShowSaveOverlay(e.message || String(e), 'error');
            setTimeout(() => {
              if (window.__bp608HideSaveOverlay) window.__bp608HideSaveOverlay();
            }, 3500);
          }
        } finally {
          if (submitBtn) submitBtn.disabled = false;
          if (yesBtn) yesBtn.disabled = false;
        }
      })();
    }

    function showSaveConfirm() {
      const main = actionsRoot.querySelector('#form-actions-main');
      const confirm = actionsRoot.querySelector('#save-confirm');
      if (main) main.classList.add('hidden');
      if (confirm) confirm.classList.remove('hidden');
    }

    function hideSaveConfirm() {
      const main = actionsRoot.querySelector('#form-actions-main');
      const confirm = actionsRoot.querySelector('#save-confirm');
      if (main) main.classList.remove('hidden');
      if (confirm) confirm.classList.add('hidden');
    }

    const stageBlockedOverlay = document.getElementById('stage-blocked-overlay');
    if (stageBlockedOverlay) {
      stageBlockedOverlay.addEventListener('click', (e) => {
        if (e.target === stageBlockedOverlay) hideStageBlockedOverlay();
      });
    }

    actionsRoot.querySelector('#btn-submit').onclick = async () => {
      const dealId = window.__bp608DealId;
      const callFn = window.__bp608Call;
      if (await isSaveBlockedByWonStage(dealId, callFn)) {
        showStageBlockedOverlay();
        return;
      }
      showSaveConfirm();
    };

    actionsRoot.querySelector('#save-yes').onclick = async () => {
      await finishSubmit();
    };

    actionsRoot.querySelector('#save-no').onclick = () => {
      hideSaveConfirm();
    };

    form.onsubmit = (e) => {
      e.preventDefault();
    };
  }

  function setReadOnly(container, readOnly, options) {
    const opts = options || {};
    const form = container && container.querySelector
      ? container.querySelector('#bp608-form')
      : (container && container.id === 'bp608-form' ? container : null);
    if (!form) return;
    const viewOnly = !!opts.viewOnly;
    form.classList.toggle('form-readonly', !!readOnly);
    form.classList.toggle('form-view-only', viewOnly);
    document.body.classList.toggle('deal-view-only', viewOnly);
    document.body.classList.toggle('deal-completed', !!readOnly && !viewOnly);
    form.querySelectorAll('input, select, textarea, button').forEach((el) => {
      if (el.type === 'hidden') return;
      el.disabled = !!readOnly;
      if (readOnly && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
        el.readOnly = true;
      } else if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.readOnly = false;
      }
    });
    form.querySelectorAll('label.doc-tile[for]').forEach((lbl) => {
      if (readOnly) lbl.dataset.fileFor = lbl.getAttribute('for') || '';
      if (readOnly) lbl.removeAttribute('for');
      else if (lbl.dataset.fileFor) lbl.setAttribute('for', lbl.dataset.fileFor);
    });
    const bar = document.getElementById('form-actions-bar');
    if (bar) {
      bar.classList.toggle('hidden', (!!readOnly && !viewOnly) || !!opts.hideActions);
      bar.classList.toggle('actions-view-only', viewOnly);
    }
  }

  function clearDraft(dealId) {
    try {
      localStorage.removeItem(storageKey(dealId));
    } catch (_) {}
  }

  window.BP608Form = {
    render: renderForm,
    collectValues: function (root) {
      let form = null;
      if (root) {
        if (root.id === 'bp608-form') form = root;
        else if (root.querySelector) form = root.querySelector('#bp608-form');
      }
      return form ? collectValues(form) : {};
    },
    applyValues: function (root, data) {
      const form = root.querySelector ? root.querySelector('#bp608-form') : null;
      if (!form || !data) return;
      applyValues(form, data);
    },
    syncOwnership: function (root) {
      const form = root.querySelector ? root.querySelector('#bp608-form') : null;
      if (form) syncOwnershipContacts(form);
    },
    setDealContacts: function (stash) {
      window.__bp608DealContacts = stash || {};
    },
    syncOwnershipContacts: function (root, options) {
      const form = root.querySelector ? root.querySelector('#bp608-form') : root;
      if (form) syncOwnershipContacts(form, options);
    },
    setCrmContacts: function (root, code, contacts) {
      const form = root.querySelector ? root.querySelector('#bp608-form') : null;
      if (form) setCrmField(form, code, contacts);
    },
    loadDraft: function (container, dealId) {
      clearDraft(dealId);
    },
    refreshState: function (form) {
      if (form) refreshFilledState(form);
    },
    setReadOnly: function (root, readOnly, options) {
      setReadOnly(root, readOnly, options);
    },
    captureBaseline: function (root) {
      let form = null;
      if (root) {
        if (root.id === 'bp608-form') form = root;
        else if (root.querySelector) form = root.querySelector('#bp608-form');
      }
      window.__bp608Baseline = form ? collectValues(form) : {};
    },
    countChanged: function (root) {
      let form = null;
      if (root) {
        if (root.id === 'bp608-form') form = root;
        else if (root.querySelector) form = root.querySelector('#bp608-form');
      }
      return form ? countChangedFields(form) : 0;
    },
  };
})();
