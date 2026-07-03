'use strict';

(function () {
  const SECTIONS = [
    {
      title: 'Договор',
      codes: [
        'type_doc', 'property_type', 'ownership_contact',
        'commit_deal', 'repid_sale', 'link_deal',
      ],
    },
    {
      title: 'Регистрация и оплата',
      codes: [
        'form_payment', 'type_registr', 'bank', 'sber', 'down_payment_period',
        'summ_MSK', 'summ_sotrudnichestva', 'initial_fee',
      ],
    },
    {
      title: 'Документы',
      codes: [
        'pasport', 'snils', 'inn', 'marriage_certificate', 'birth_certificate',
        'adress_kids', 'math_capital', 'ostatok_capital', 'sertifikat_sotrudnichestva',
        'notarised', 'other_docs',
      ],
    },
    {
      title: 'Портрет покупателя',
      codes: [
        'age', 'city', 'sex', 'target', 'famStatus', 'kindOfActivity',
        'kids', 'attraction', 'animals',
      ],
    },
  ];

  function esc(s) {
    const d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }

  const OWNERSHIP = {
    INDIVIDUAL: 'Индивидуальная собственность',
    SHARED: 'Долевая собственность',
    JOINT: 'Общая совместная собственность',
  };

  function contactInitials(title) {
    const parts = String(title || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
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

  function renderOwnershipCards(contacts) {
    if (!contacts || !contacts.length) {
      return '<p class="contact-empty muted">Контакты не указаны в сделке</p>';
    }
    return contacts.map((c) => {
      const title = String(c.title || '').trim() || ('Контакт #' + c.id);
      return (
      '<div class="contact-card" data-id="' + esc(c.id) + '" title="' + esc(title) + '">' +
      '<span class="contact-avatar" aria-hidden="true">' + esc(contactInitials(title)) + '</span>' +
      '<span class="contact-name">' + esc(title) + '</span>' +
      '</div>'
      );
    }).join('');
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
    if (type === OWNERSHIP.INDIVIDUAL) return 'Клиент / контакт сделки';
    if (type === OWNERSHIP.SHARED) return 'Участники долевой собственности из сделки';
    if (type === OWNERSHIP.JOINT) return 'Участники общей собственности из сделки';
    return 'Выберите тип собственности';
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
      hint.classList.remove('hidden');
      hint.textContent = ownershipHintText(type);
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
    renderOwnershipDisplay(form, contacts);
  }

  function fieldByCode(config, code) {
    return config.find((f) => f.code === code);
  }

  function renderFieldLabel(field, req) {
    if (field.code === 'initial_fee') {
      return (
        '<label class="lbl lbl-multiline">' +
        esc('Общая сумма первоначального взноса') +
        '<span class="lbl-sub">' + esc('(с учетом всех сертификатов и собственных средств)') + '</span>' +
        req +
        '</label>'
      );
    }
    return '<label class="lbl">' + esc(field.label) + req + '</label>';
  }

  function renderField(field) {
    const req = field.required ? ' <span class="req">*</span>' : '';
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
            '<div class="radio-group" data-radio-group="property_type">' +
            (field.options || []).map((o) =>
              '<label class="check-row radio-option">' +
              '<input type="radio" name="property_type" value="' + esc(o) + '"' + reqAttr + '>' +
              '<span>' + esc(o) + '</span></label>'
            ).join('') +
            '</div>';
        } else if (field.code === 'sber' || field.code === 'repid_sale') {
          const yesVal = (field.options && field.options[0]) || 'Да';
          const noVal = (field.options && field.options[1]) || 'Нет';
          control =
            '<label class="check-row yesno-row">' +
            '<input type="checkbox" class="inp-yesno" name="' + esc(field.code) + '" data-yes="' + esc(yesVal) + '" data-no="' + esc(noVal) + '">' +
            '<span>' + esc(yesVal) + '</span></label>';
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
      case 'file':
        control =
          '<input class="inp file" type="file" name="' + esc(field.code) + '"' + multi + reqAttr + '>' +
          '<div class="file-names muted" data-files-for="' + esc(field.code) + '"></div>';
        break;
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
    return (
      '<div class="field' +
      (ownershipSlot ? ' ownership-slot' : '') +
      (repidLinkSlot ? ' repid-link-slot hidden' : '') +
      '" data-field="' + esc(field.code) + '">' +
      renderFieldLabel(field, req) +
      control +
      '</div>'
    );
  }

  function renderForm(container, config) {
    const byCode = Object.fromEntries(config.map((f) => [f.code, f]));
    let html = '<form id="bp608-form" class="bp-form" novalidate>';

    SECTIONS.forEach((sec) => {
      html += '<section class="form-section"><h3>' + esc(sec.title) + '</h3><div class="fields">';
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
    })).filter((c) => c.id > 0);
    if (hidden) hidden.value = JSON.stringify(normalized);
    renderCrmList(wrap, normalized);
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
        setCrmField(form, field.code, field.multiple ? picked : picked.slice(0, 1));
        if (field.code === 'Parameter1' || field.code === 'Parameter2') {
          const type = propertyTypeSelected(form)[0];
          const active =
            (type === OWNERSHIP.JOINT && field.code === 'Parameter1') ||
            (type === OWNERSHIP.SHARED && field.code === 'Parameter2');
          if (active) renderOwnershipDisplay(form, getCrmField(form, field.code));
        }
      }
    );
  }

  function multiSelectValues(form, code) {
    return [...form.querySelectorAll('input[name="' + code + '"]:checked')].map((i) => i.value);
  }

  function propertyTypeSelected(form) {
    const r = form.querySelector('input[name="property_type"]:checked');
    return r ? [r.value] : [];
  }

  function isYesNoField(code) {
    return code === 'sber' || code === 'repid_sale';
  }

  function yesNoValue(form, code) {
    const cb = form.querySelector('input.inp-yesno[name="' + code + '"]');
    if (!cb) return '';
    return cb.checked ? cb.dataset.yes : (cb.dataset.no || 'Нет');
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
        const r = form.querySelector('input[name="property_type"]:checked');
        data[field.code] = r ? r.value : '';
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
        form.querySelectorAll('input[name="property_type"]').forEach((inp) => {
          inp.checked = inp.value === v;
        });
        syncOwnershipContacts(form);
        return;
      }
      if (isYesNoField(field.code)) {
        const cb = form.querySelector('input.inp-yesno[name="' + field.code + '"]');
        if (cb) cb.checked = data[field.code] === cb.dataset.yes;
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
      if (field.type !== 'file') el.value = data[field.code];
    });
    syncOwnershipContacts(form, { fromHidden: true, fallbackHidden: true });
    syncRepidSaleLink(form);
  }

  function storageKey(dealId) {
    return 'bp608-draft-deal-' + (dealId || 'preview');
  }

  function bindForm(container, config) {
    const form = container.querySelector('#bp608-form');
    const msg = container.querySelector('#form-msg');
    const preview = container.querySelector('#form-preview');
    const actionsRoot = document.getElementById('form-actions-bar');

    form.querySelectorAll('input[type=file]').forEach((inp) => {
      inp.addEventListener('change', () => {
        const hint = container.querySelector('[data-files-for="' + inp.name + '"]');
        if (!hint) return;
        const names = inp.files.length ? [...inp.files].map((f) => f.name).join(', ') : '';
        hint.textContent = names;
      });
    });

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

    const propertyTypeGroup = form.querySelector('[data-radio-group="property_type"]');
    if (propertyTypeGroup) {
      propertyTypeGroup.addEventListener('change', () => syncOwnershipContacts(form));
      syncOwnershipContacts(form);
    }

    const repidCb = form.querySelector('input.inp-yesno[name="repid_sale"]');
    if (repidCb) {
      repidCb.addEventListener('change', () => syncRepidSaleLink(form));
      syncRepidSaleLink(form);
    }

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
            ok = !!form.querySelector('input[name="property_type"]:checked');
          } else if (isYesNoField(field.code)) {
            ok = true;
          } else if (field.type === 'select' && field.multiple) {
            ok = multiSelectValues(form, field.code).length > 0;
          } else {
            const el = form.elements[field.code];
            if (!el) return;
            if (field.type === 'bool') ok = true;
            else if (field.type === 'file') ok = el.files && el.files.length > 0;
            else ok = String(el.value || '').trim() !== '';
          }
        }
        if (wrap) wrap.classList.toggle('invalid', !ok);
        if (!ok) bad.push(field.label);
      });
      if (bad.length) {
        msg.className = 'form-msg err';
        msg.textContent = 'Заполните обязательные: ' + bad.join('; ');
      } else {
        msg.className = 'form-msg ok';
        msg.textContent = 'Обязательные поля заполнены';
      }
    };

    actionsRoot.querySelector('#btn-draft').onclick = () => {
      saveDraft(container, form, msg);
    };

    function finishSubmit() {
      return (async () => {
        hideSaveConfirm();
        const data = collectValues(form);
        preview.classList.remove('hidden');
        preview.textContent = JSON.stringify(data, null, 2);
        msg.className = 'form-msg muted';
        msg.textContent = 'Бэкенд не подключён — ниже JSON для проверки';
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

    actionsRoot.querySelector('#btn-submit').onclick = () => {
      showSaveConfirm();
    };

    actionsRoot.querySelector('#save-yes').onclick = async () => {
      saveDraft(container, form, msg);
      await finishSubmit();
    };

    actionsRoot.querySelector('#save-no').onclick = async () => {
      await finishSubmit();
    };

    form.onsubmit = (e) => {
      e.preventDefault();
    };
  }

  function saveDraft(container, form, msg) {
    const dealId = window.__bp608DealId;
    const data = collectValues(form);
    try {
      localStorage.setItem(storageKey(dealId), JSON.stringify(data));
      if (msg) {
        msg.className = 'form-msg ok';
        msg.textContent = 'Черновик сохранён в браузере';
      }
    } catch (e) {
      if (msg) {
        msg.className = 'form-msg err';
        msg.textContent = e.message || 'Не удалось сохранить';
      }
    }
  }

  window.BP608Form = {
    render: renderForm,
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
      const form = container.querySelector('#bp608-form');
      if (!form) return;
      try {
        const raw = localStorage.getItem(storageKey(dealId));
        if (raw) applyValues(form, JSON.parse(raw));
      } catch (_) {}
    },
  };
})();
