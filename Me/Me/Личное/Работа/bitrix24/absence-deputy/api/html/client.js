/**
 * 6 кадров v0.1 — UI + localStorage.
 * Запись GlobalConst / cron — заглушки (TODO).
 * Доступ на портале: только user ID 24880.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'six_staff_v01';
  var TEST_MODE = true;
  /** Разрешённый пользователь портала ik-navigator */
  var ALLOWED_USER_ID = 24880;

  var state = {
    users: {
      'vac-employee': null,
      'vac-deputy': null,
      'dis-user': null,
      'dis-replacement': null
    },
    /** Реальный iframe/placement Б24, не просто загруженный SDK */
    hasBx24: false,
    currentUserId: null
  };

  function isBx24Placement() {
    if (typeof BX24 === 'undefined') return false;
    var q = String(location.search || '');
    if (/[?&]DOMAIN=/i.test(q)) return true;
    if (/[?&]AUTH_ID=/i.test(q)) return true;
    if (/[?&]APP_SID=/i.test(q)) return true;
    return false;
  }

  state.hasBx24 = isBx24Placement();

  /* ---------- storage ---------- */

  function loadStore() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { vacations: [], dismissals: [] };
      var data = JSON.parse(raw);
      return {
        vacations: Array.isArray(data.vacations) ? data.vacations : [],
        dismissals: Array.isArray(data.dismissals) ? data.dismissals : []
      };
    } catch (_) {
      return { vacations: [], dismissals: [] };
    }
  }

  function saveStore(store) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }

  function uid() {
    return 'r_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  /* ---------- dates ---------- */

  function todayISO() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  }

  function formatRu(iso) {
    if (!iso) return '—';
    var p = String(iso).split('-');
    if (p.length !== 3) return iso;
    return p[2] + '.' + p[1] + '.' + p[0];
  }

  function computeVacationStatus(rec) {
    if (rec.status === 'returned' || rec.status === 'cancelled' || rec.status === 'error') {
      return rec.status;
    }
    var t = todayISO();
    if (t < rec.dateFrom) return 'planned';
    if (t >= rec.dateFrom && t < rec.dateTo) return 'active';
    return 'returned';
  }

  /* ---------- stubs: GlobalConst / cron ---------- */

  /**
   * TODO: запись GlobalConst (bizproc / REST).
   * v0.1: только логируем; в тесте — только «Проджект Б24».
   */
  function applyRoleSubstitution(roles, fromUser, toUser, reason) {
    var writable = (roles || []).filter(function (r) {
      return !TEST_MODE || r.writableInTest || r.name === (window.SixStaffConstants && SixStaffConstants.TEST_CONSTANT);
    });
    console.info('[6 кадров] TODO apply GlobalConst', {
      reason: reason,
      from: fromUser,
      to: toUser,
      roles: writable.map(function (r) { return r.name; })
    });
    return { ok: true, applied: writable };
  }

  /**
   * TODO: cron автоподмены / автовозврата / увольнений по дате.
   */
  function scheduleCronStub(kind, record) {
    console.info('[6 кадров] TODO cron', kind, record && record.id);
  }

  /* ---------- roles UI ---------- */

  function rolesForName(name) {
    if (!window.SixStaffConstants) return [];
    return SixStaffConstants.findRolesByPersonName(name);
  }

  function renderRolesList(roles, emptyText) {
    if (!roles || !roles.length) {
      return '<div class="muted">' + escapeHtml(emptyText || 'Роли не найдены') + '</div>';
    }
    var items = roles.map(function (r) {
      var badge = TEST_MODE && !r.writableInTest
        ? ' <span class="badge-viewonly">только просмотр</span>'
        : '';
      return '<li>' + escapeHtml(r.name) + badge + '</li>';
    }).join('');
    return '<ul class="roles-list">' + items + '</ul>';
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function updateVacRoles() {
    var el = document.getElementById('vac-roles');
    var body = el.querySelector('.roles-body');
    var user = state.users['vac-employee'];
    if (!user || !user.name) {
      body.innerHTML = '<span class="muted">Выберите сотрудника</span>';
      return;
    }
    var roles = rolesForName(user.name);
    if (!roles.length) {
      body.innerHTML = TEST_MODE
        ? '<span class="muted">В тестовом режиме константы не затронуты / не найдены</span>'
        : '<span class="muted">У сотрудника нет ролей в глобальных user-константах</span>';
      return;
    }
    body.innerHTML = renderRolesList(roles);
  }

  function updateDisPreview() {
    var el = document.getElementById('dis-preview');
    var body = el.querySelector('.roles-body');
    var user = state.users['dis-user'];
    var repl = state.users['dis-replacement'];

    if (!user || !user.name) {
      body.innerHTML = '<span class="muted">Выберите пользователя</span>';
      return;
    }

    var roles = rolesForName(user.name);
    if (!roles.length) {
      body.innerHTML = '<span class="muted">У сотрудника нет ролей в глобальных user-константах</span>';
      return;
    }

    var warn =
      '<div class="alert alert-warning" style="margin-bottom:10px">' +
      'После деактивации сотрудника эти роли останутся привязанными к нему и фактически станут пустыми для БП, ' +
      'пока их не назначат вручную или через замену ниже.' +
      '</div>';

    var extra = repl && repl.name
      ? '<p>При увольнении эти константы будут переведены на: <strong>' + escapeHtml(repl.name) + '</strong>. Автовозврата нет.</p>'
      : '<p class="muted">Константы автоматически не изменятся.</p>';

    body.innerHTML = warn + renderRolesList(roles) + extra;
  }

  /* ---------- user picker ---------- */

  function setUser(key, user) {
    state.users[key] = user;
    var root = document.querySelector('[data-picker="' + key + '"]');
    if (!root) return;
    var btn = root.querySelector('.picker-btn');
    var val = root.querySelector('.picker-value');
    var clear = root.querySelector('.picker-clear');
    if (user && user.name) {
      btn.hidden = true;
      val.hidden = false;
      val.textContent = user.name;
      val.title = val.textContent;
      clear.hidden = false;
    } else {
      btn.hidden = false;
      val.hidden = true;
      val.textContent = '';
      clear.hidden = true;
    }
    if (key === 'vac-employee') updateVacRoles();
    if (key === 'dis-user') {
      var bpHint = document.getElementById('dis-bp-hint');
      if (bpHint) bpHint.hidden = !(user && user.name);
    }
    if (key === 'dis-user' || key === 'dis-replacement') updateDisPreview();
    fitWindow();
  }

  function userDisplayName(user) {
    if (!user) return '';
    var name = user.name || user.fullName || '';
    if (!name) {
      var last = user.lastName || user.LAST_NAME || '';
      var first = user.firstName || user.NAME || '';
      var second = user.secondName || user.SECOND_NAME || '';
      name = [last, first, second].filter(Boolean).join(' ');
    }
    if (!name && user.NAME && typeof user.NAME === 'string' && !user.LAST_NAME) {
      name = user.NAME;
    }
    return String(name || '').trim();
  }

  function applySelectedUser(key, raw) {
    if (!raw) return;
    var id = raw.id || raw.ID || raw.USER_ID;
    var name = userDisplayName(raw);
    setUser(key, {
      id: String(id || ''),
      name: name || ('Сотрудник ' + id)
    });
  }

  function selectUserBx24(key) {
    BX24.selectUser(function (user) {
      if (!user) return;
      applySelectedUser(key, user);
    });
  }

  function resolveUserById(id) {
    return callBx24('user.get', { ID: id }, 8000).then(function (data) {
      var user = Array.isArray(data) ? data[0] : data;
      if (!user) throw new Error('Сотрудник не найден');
      return user;
    });
  }

  function wirePickers() {
    document.querySelectorAll('.user-picker').forEach(function (root) {
      var key = root.getAttribute('data-picker');
      var field = root.closest('.field');
      var fallback = field && field.querySelector('.fallback-user');
      var pickerButton = root.querySelector('.picker-btn');

      pickerButton.addEventListener('click', function () {
        if (state.hasBx24 && typeof BX24.selectUser === 'function') {
          selectUserBx24(key);
        } else if (fallback) {
          fallback.hidden = false;
          var idInput = fallback.querySelector('[data-fb-id]');
          if (idInput) idInput.focus();
        }
      });

      root.querySelector('.picker-clear').addEventListener('click', function () {
        setUser(key, null);
        if (fallback) {
          fallback.hidden = true;
          var idInput = fallback.querySelector('[data-fb-id]');
          if (idInput) idInput.value = '';
        }
      });

      if (fallback) {
        if (!state.hasBx24) fallback.hidden = false;
        fallback.querySelector('[data-fb-apply]').addEventListener('click', function () {
          var id = fallback.querySelector('[data-fb-id]').value.trim();
          if (!id || !/^\d+$/.test(id)) {
            showFieldError(field, 'Укажите числовой ID сотрудника');
            return;
          }
          clearFieldError(field);
          if (state.hasBx24) {
            resolveUserById(id).then(function (user) {
              applySelectedUser(key, user);
              fallback.hidden = true;
            }).catch(function (err) {
              showFieldError(field, err && err.message ? err.message : 'Не удалось найти сотрудника');
            });
          } else {
            setUser(key, { id: id, name: 'Сотрудник ' + id });
            fallback.hidden = true;
          }
        });
      }
    });
  }

  /* ---------- validation / errors ---------- */

  function showFieldError(field, msg) {
    if (!field) return;
    field.classList.add('has-error');
    var err = field.querySelector('.field-error');
    if (err) {
      err.hidden = false;
      err.textContent = msg;
    }
  }

  function clearFieldError(field) {
    if (!field) return;
    field.classList.remove('has-error');
    var err = field.querySelector('.field-error');
    if (err) {
      err.hidden = true;
      err.textContent = '';
    }
  }

  function clearVacationErrors() {
    ['field-vac-employee', 'field-vac-deputy', 'field-vac-from', 'field-vac-to'].forEach(function (id) {
      clearFieldError(document.getElementById(id));
    });
  }

  function clearDismissalErrors() {
    ['field-dis-user', 'field-dis-date'].forEach(function (id) {
      clearFieldError(document.getElementById(id));
    });
  }

  function validateVacation() {
    clearVacationErrors();
    var ok = true;
    var emp = state.users['vac-employee'];
    var dep = state.users['vac-deputy'];
    var from = document.getElementById('vac-from').value;
    var to = document.getElementById('vac-to').value;

    if (!emp || !emp.name) {
      showFieldError(document.getElementById('field-vac-employee'), 'Выберите сотрудника');
      ok = false;
    }
    if (!dep || !dep.name) {
      showFieldError(document.getElementById('field-vac-deputy'), 'Выберите заместителя');
      ok = false;
    }
    if (emp && dep && emp.id && dep.id && emp.id === dep.id) {
      showFieldError(document.getElementById('field-vac-deputy'), 'Сотрудник и заместитель не должны совпадать');
      ok = false;
    } else if (emp && dep && emp.name && dep.name && emp.name.trim().toLowerCase() === dep.name.trim().toLowerCase()) {
      showFieldError(document.getElementById('field-vac-deputy'), 'Сотрудник и заместитель не должны совпадать');
      ok = false;
    }
    if (!from) {
      showFieldError(document.getElementById('field-vac-from'), 'Укажите дату «С»');
      ok = false;
    }
    if (!to) {
      showFieldError(document.getElementById('field-vac-to'), 'Укажите дату «До»');
      ok = false;
    }
    if (from && to && !(to > from)) {
      showFieldError(document.getElementById('field-vac-to'), 'Дата «До» должна быть строго позже «С»');
      ok = false;
    }
    return ok;
  }

  function validateDismissal() {
    clearDismissalErrors();
    var ok = true;
    var user = state.users['dis-user'];
    var mode = document.querySelector('input[name="dis-mode"]:checked').value;
    var date = document.getElementById('dis-date').value;

    if (!user || !user.name) {
      showFieldError(document.getElementById('field-dis-user'), 'Выберите пользователя');
      ok = false;
    }
    if (mode === 'date' && !date) {
      showFieldError(document.getElementById('field-dis-date'), 'Укажите дату');
      ok = false;
    }
    return ok;
  }

  /* ---------- badges / tables ---------- */

  var VAC_STATUS = {
    planned: { label: 'Запланирован', cls: 'badge-info' },
    active: { label: 'Активен', cls: 'badge-success' },
    returned: { label: 'Возвращён', cls: 'badge-neutral' },
    cancelled: { label: 'Отменён', cls: 'badge-neutral' },
    error: { label: 'Ошибка', cls: 'badge-danger' }
  };

  var DIS_STATUS = {
    planned: { label: 'Запланировано', cls: 'badge-info' },
    done: { label: 'Выполнено', cls: 'badge-success' },
    cancelled: { label: 'Отменено', cls: 'badge-neutral' },
    error: { label: 'Ошибка', cls: 'badge-danger' }
  };

  function badgeHtml(map, status) {
    var meta = map[status] || { label: status, cls: 'badge-neutral' };
    return '<span class="badge ' + meta.cls + '">' + escapeHtml(meta.label) + '</span>';
  }

  function rolesShort(roles) {
    if (!roles || !roles.length) return '—';
    var names = roles.map(function (r) { return r.name; });
    var head = names.slice(0, 2).join(', ');
    if (names.length > 2) head += ' (+' + (names.length - 2) + ')';
    return escapeHtml(String(names.length)) + ': ' + escapeHtml(head);
  }

  function renderVacations() {
    var store = loadStore();
    var tbody = document.getElementById('vac-tbody');
    var empty = document.getElementById('vac-empty');
    var table = document.getElementById('vac-table');

    store.vacations.forEach(function (r) {
      var computed = computeVacationStatus(r);
      if (computed !== r.status && r.status !== 'error') {
        r.status = computed;
      }
    });
    saveStore(store);

    if (!store.vacations.length) {
      tbody.innerHTML = '';
      table.hidden = true;
      empty.hidden = false;
      return;
    }

    table.hidden = false;
    empty.hidden = true;
    tbody.innerHTML = store.vacations.map(function (r) {
      var actions = '';
      if (r.status === 'planned') {
        actions =
          '<button type="button" class="btn btn-outline btn-sm" data-vac-cancel="' + r.id + '">Отменить план</button>';
      } else if (r.status === 'active') {
        actions =
          '<button type="button" class="btn btn-danger btn-sm" data-vac-return="' + r.id + '">Вернуть сейчас</button>';
      }
      return (
        '<tr>' +
        '<td>' + escapeHtml(r.employee.name) + '</td>' +
        '<td>' + formatRu(r.dateFrom) + ' – ' + formatRu(r.dateTo) +
        '<span class="period-hint">подмена до даты «До», не включая её</span></td>' +
        '<td>' + escapeHtml(r.deputy.name) + '</td>' +
        '<td>' + rolesShort(r.roles) + '</td>' +
        '<td>' + badgeHtml(VAC_STATUS, r.status) + '</td>' +
        '<td class="row-actions">' + (actions || '—') + '</td>' +
        '</tr>'
      );
    }).join('');
  }

  function renderDismissals() {
    var store = loadStore();
    var tbody = document.getElementById('dis-tbody');
    var empty = document.getElementById('dis-empty');
    var table = document.getElementById('dis-table');

    if (!store.dismissals.length) {
      tbody.innerHTML = '';
      table.hidden = true;
      empty.hidden = false;
      return;
    }

    table.hidden = false;
    empty.hidden = true;
    tbody.innerHTML = store.dismissals.map(function (r) {
      var modeLabel = r.mode === 'now'
        ? 'Сейчас'
        : ('С даты ' + formatRu(r.date));
      var actions = '';
      if (r.status === 'planned') {
        actions =
          '<button type="button" class="btn btn-outline btn-sm" data-dis-cancel="' + r.id + '">Отменить план</button>';
      }
      return (
        '<tr>' +
        '<td>' + escapeHtml(r.user.name) + '</td>' +
        '<td>' + escapeHtml(modeLabel) + '</td>' +
        '<td>' + escapeHtml(r.replacement && r.replacement.name ? r.replacement.name : '—') + '</td>' +
        '<td>' + rolesShort(r.roles) + '</td>' +
        '<td>' + badgeHtml(DIS_STATUS, r.status) + '</td>' +
        '<td class="row-actions">' + (actions || '—') + '</td>' +
        '</tr>'
      );
    }).join('');
  }

  /* ---------- modal ---------- */

  function openModal(title, bodyHtml, actions) {
    var backdrop = document.getElementById('modal');
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHtml;
    var act = document.getElementById('modal-actions');
    act.innerHTML = '';
    (actions || []).forEach(function (a) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn ' + (a.cls || 'btn-outline');
      btn.textContent = a.label;
      btn.addEventListener('click', function () {
        closeModal();
        if (a.onClick) a.onClick();
      });
      act.appendChild(btn);
    });
    backdrop.hidden = false;
    fitWindow();
  }

  function closeModal() {
    document.getElementById('modal').hidden = true;
    fitWindow();
  }

  /* ---------- vacation actions ---------- */

  function submitVacation() {
    if (!validateVacation()) return;

    var emp = state.users['vac-employee'];
    var dep = state.users['vac-deputy'];
    var from = document.getElementById('vac-from').value;
    var to = document.getElementById('vac-to').value;
    var roles = rolesForName(emp.name);
    var status = from === todayISO() ? 'active' : 'planned';

    var record = {
      id: uid(),
      employee: emp,
      deputy: dep,
      dateFrom: from,
      dateTo: to,
      roles: roles,
      status: status,
      createdAt: new Date().toISOString()
    };

    if (status === 'active') {
      // TODO: реальная запись GlobalConst
      applyRoleSubstitution(roles, emp, dep, 'vacation-start-immediate');
    } else {
      scheduleCronStub('vacation-start', record);
    }
    scheduleCronStub('vacation-end', record);

    var store = loadStore();
    store.vacations.unshift(record);
    saveStore(store);
    resetVacationForm();
    renderVacations();
    fitWindow();
  }

  function cancelVacationPlan(id) {
    openModal(
      'Отменить план',
      '<p>Удалить запланированный отпуск? Подмена не начиналась.</p>',
      [
        { label: 'Отмена', cls: 'btn-outline' },
        {
          label: 'Отменить план',
          cls: 'btn-danger',
          onClick: function () {
            var store = loadStore();
            var rec = store.vacations.find(function (r) { return r.id === id; });
            if (rec && rec.status === 'planned') {
              rec.status = 'cancelled';
              saveStore(store);
              renderVacations();
            }
          }
        }
      ]
    );
  }

  function returnVacationNow(id) {
    var store = loadStore();
    var rec = store.vacations.find(function (r) { return r.id === id; });
    if (!rec) return;
    openModal(
      'Вернуть роли',
      '<p>Вернуть <strong>' + escapeHtml(rec.employee.name) +
      '</strong> во все затронутые роли сейчас? Подмена заместителя будет снята.</p>',
      [
        { label: 'Отмена', cls: 'btn-outline' },
        {
          label: 'Вернуть',
          cls: 'btn-danger',
          onClick: function () {
            // TODO: реальная запись GlobalConst (возврат)
            applyRoleSubstitution(rec.roles, rec.deputy, rec.employee, 'vacation-manual-return');
            rec.status = 'returned';
            saveStore(store);
            renderVacations();
          }
        }
      ]
    );
  }

  function resetVacationForm() {
    setUser('vac-employee', null);
    setUser('vac-deputy', null);
    document.getElementById('vac-from').value = '';
    document.getElementById('vac-to').value = '';
    document.getElementById('vac-today-info').hidden = true;
    clearVacationErrors();
    document.querySelectorAll('#panel-vacation .fallback-user').forEach(function (el) {
      el.hidden = !!state.hasBx24;
      el.querySelectorAll('input').forEach(function (i) { i.value = ''; });
    });
    updateVacRoles();
  }

  /* ---------- dismissal actions ---------- */

  function submitDismissal() {
    if (!validateDismissal()) return;

    var user = state.users['dis-user'];
    var repl = state.users['dis-replacement'];
    var mode = document.querySelector('input[name="dis-mode"]:checked').value;
    var date = document.getElementById('dis-date').value;
    var roles = rolesForName(user.name);

    openModal(
      mode === 'now' ? 'Уволить сотрудника?' : 'Запланировать увольнение сотрудника?',
      '',
      [
        { label: 'Нет', cls: 'btn-outline' },
        {
          label: 'Да',
          cls: 'btn-danger',
          onClick: function () {
            var status = mode === 'now' ? 'done' : 'planned';
            var record = {
              id: uid(),
              user: user,
              mode: mode,
              date: mode === 'date' ? date : todayISO(),
              replacement: repl && repl.name ? repl : null,
              roles: roles,
              status: status,
              createdAt: new Date().toISOString()
            };

            if (mode === 'now') {
              // TODO: деактивация пользователя + опциональная запись констант
              if (record.replacement) {
                applyRoleSubstitution(roles, user, record.replacement, 'dismissal-now');
              }
              console.info('[6 кадров] TODO deactivate user', user);
            } else {
              scheduleCronStub('dismissal', record);
            }

            var store = loadStore();
            store.dismissals.unshift(record);
            saveStore(store);
            resetDismissalForm();
            renderDismissals();
            fitWindow();
          }
        }
      ]
    );
  }

  function cancelDismissalPlan(id) {
    openModal(
      'Отменить план',
      '<p>Снять запланированное увольнение?</p>',
      [
        { label: 'Отмена', cls: 'btn-outline' },
        {
          label: 'Снять',
          cls: 'btn-danger',
          onClick: function () {
            var store = loadStore();
            var rec = store.dismissals.find(function (r) { return r.id === id; });
            if (rec && rec.status === 'planned') {
              rec.status = 'cancelled';
              saveStore(store);
              renderDismissals();
            }
          }
        }
      ]
    );
  }

  function resetDismissalForm() {
    setUser('dis-user', null);
    setUser('dis-replacement', null);
    document.querySelector('input[name="dis-mode"][value="now"]').checked = true;
    document.getElementById('dis-date').value = '';
    document.getElementById('field-dis-date').hidden = true;
    document.getElementById('dis-submit').textContent = 'Уволить';
    clearDismissalErrors();
    document.querySelectorAll('#panel-dismissal .fallback-user').forEach(function (el) {
      el.hidden = !!state.hasBx24;
      el.querySelectorAll('input').forEach(function (i) { i.value = ''; });
    });
    updateDisPreview();
  }

  /* ---------- tabs / BX24 ---------- */

  function switchTab(name) {
    document.querySelectorAll('.tab').forEach(function (t) {
      var on = t.getAttribute('data-tab') === name;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    document.getElementById('panel-vacation').hidden = name !== 'vacation';
    document.getElementById('panel-dismissal').hidden = name !== 'dismissal';
    fitWindow();
  }

  function fitWindow() {
    if (state.hasBx24 && typeof BX24.fitWindow === 'function') {
      try { BX24.fitWindow(); } catch (_) {}
    }
  }

  function setVersion() {
    var v = window.APP_VERSION || '0.1.0';
    var footer = document.getElementById('footer-version');
    if (footer) footer.textContent = '6 кадров · v' + v;
  }

  function onVacDatesChange() {
    var from = document.getElementById('vac-from').value;
    var info = document.getElementById('vac-today-info');
    info.hidden = !(from && from === todayISO());
  }

  function wireEvents() {
    document.querySelectorAll('.tab').forEach(function (t) {
      t.addEventListener('click', function () {
        switchTab(t.getAttribute('data-tab'));
      });
    });

    document.getElementById('vac-reset').addEventListener('click', resetVacationForm);
    document.getElementById('vac-submit').addEventListener('click', submitVacation);
    document.getElementById('vac-from').addEventListener('change', onVacDatesChange);
    document.getElementById('vac-to').addEventListener('change', onVacDatesChange);

    ['vac-from', 'vac-to', 'dis-date'].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      // Fallback для Firefox / без webkit-индикатора.
      el.addEventListener('click', function () {
        if (typeof el.showPicker !== 'function') return;
        try {
          el.showPicker();
        } catch (_) {}
      });
    });

    document.getElementById('dis-reset').addEventListener('click', resetDismissalForm);
    document.getElementById('dis-submit').addEventListener('click', submitDismissal);

    document.querySelectorAll('input[name="dis-mode"]').forEach(function (r) {
      r.addEventListener('change', function () {
        var mode = document.querySelector('input[name="dis-mode"]:checked').value;
        document.getElementById('field-dis-date').hidden = mode !== 'date';
        document.getElementById('dis-submit').textContent =
          mode === 'now' ? 'Уволить' : 'Запланировать увольнение';
        fitWindow();
      });
    });

    document.getElementById('vac-tbody').addEventListener('click', function (e) {
      var cancel = e.target.getAttribute('data-vac-cancel');
      var ret = e.target.getAttribute('data-vac-return');
      if (cancel) cancelVacationPlan(cancel);
      if (ret) returnVacationNow(ret);
    });

    document.getElementById('dis-tbody').addEventListener('click', function (e) {
      var cancel = e.target.getAttribute('data-dis-cancel');
      if (cancel) cancelDismissalPlan(cancel);
    });

    document.getElementById('modal').addEventListener('click', function (e) {
      if (e.target.id === 'modal') closeModal();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeModal();
    });
  }

  function showGate(message) {
    var gate = document.getElementById('access-gate');
    var app = document.getElementById('app');
    var text = document.getElementById('access-gate-text');
    var denyArt = document.getElementById('access-deny-art');
    var denied = message === 'Доступа нет';
    if (text) text.textContent = message;
    if (denyArt) denyArt.hidden = !denied;
    if (gate) {
      gate.hidden = false;
      gate.style.display = '';
      gate.classList.toggle('is-denied', denied);
    }
    if (app) {
      app.hidden = true;
      app.style.display = 'none';
    }
    fitWindow();
  }

  function showApp() {
    var gate = document.getElementById('access-gate');
    var app = document.getElementById('app');
    if (gate) {
      gate.hidden = true;
      gate.style.display = 'none';
      gate.classList.remove('is-denied');
    }
    if (app) {
      app.hidden = false;
      app.style.display = '';
    }
    fitWindow();
  }

  function isLocalHost() {
    var h = (location.hostname || '').toLowerCase();
    return h === '127.0.0.1' || h === 'localhost';
  }

  function userIdFromAuth() {
    try {
      if (typeof BX24 === 'undefined' || typeof BX24.getAuth !== 'function') return null;
      var auth = BX24.getAuth();
      if (!auth) return null;
      var id = auth.user_id != null ? auth.user_id : auth.userId;
      return id != null ? Number(id) : null;
    } catch (_) {
      return null;
    }
  }

  function callBx24(method, params, timeoutMs) {
    var ms = timeoutMs == null ? 8000 : timeoutMs;
    return new Promise(function (resolve, reject) {
      var done = false;
      var timer = setTimeout(function () {
        if (done) return;
        done = true;
        reject(new Error('таймаут ' + method));
      }, ms);
      try {
        BX24.callMethod(method, params || {}, function (result) {
          if (done) return;
          done = true;
          clearTimeout(timer);
          try {
            if (result && typeof result.error === 'function' && result.error()) {
              reject(new Error(
                (typeof result.error_description === 'function' && result.error_description()) ||
                String(result.error())
              ));
              return;
            }
            resolve(result && typeof result.data === 'function' ? result.data() : null);
          } catch (err) {
            reject(err);
          }
        });
      } catch (err) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        reject(err);
      }
    });
  }

  function resolveCurrentUserId() {
    var fromAuth = userIdFromAuth();
    if (fromAuth) return Promise.resolve(fromAuth);

    return callBx24('user.current', {}, 8000).then(function (user) {
      var id = user && (user.ID != null ? user.ID : user.id);
      if (id != null) return Number(id);
      var again = userIdFromAuth();
      if (again) return again;
      throw new Error('пустой ответ user.current');
    }).catch(function (err) {
      var again = userIdFromAuth();
      if (again) return again;
      throw err;
    });
  }

  function denyAccess(_detail) {
    showGate('Доступа нет');
  }

  /**
   * Проверка доступа: на портале — только ALLOWED_USER_ID.
   * Локальный 127.0.0.1 без BX24 — только для вёрстки UI (с предупреждением).
   */
  function ensureAccess() {
    if (!state.hasBx24) {
      if (isLocalHost()) {
        showApp();
        var banner = document.createElement('div');
        banner.className = 'alert alert-warning';
        banner.setAttribute('role', 'status');
        banner.textContent =
          'Локальный просмотр без авторизации Б24. На портале доступ только у пользователя ID ' +
          ALLOWED_USER_ID + '.';
        var appEl = document.getElementById('app');
        if (appEl && appEl.firstChild) {
          appEl.insertBefore(banner, appEl.firstChild);
        }
        return Promise.resolve(true);
      }
      denyAccess('откройте приложение из портала Битрикс24');
      return Promise.resolve(false);
    }

    showGate('Проверка доступа…');
    return resolveCurrentUserId().then(function (id) {
      state.currentUserId = id;
      if (id === ALLOWED_USER_ID) {
        showApp();
        return true;
      }
      denyAccess('сейчас: ID ' + id);
      return false;
    }).catch(function (err) {
      denyAccess('не удалось проверить пользователя: ' + (err && err.message ? err.message : String(err)));
      return false;
    });
  }

  function boot() {
    setVersion();
    wirePickers();
    wireEvents();
    renderVacations();
    renderDismissals();
    if (!state.hasBx24) {
      document.querySelectorAll('.fallback-user').forEach(function (el) {
        el.hidden = false;
      });
    }
    fitWindow();
  }

  function start() {
    // После init уточняем: есть ли реальная сессия BX24
    if (typeof BX24 !== 'undefined') {
      var authId = userIdFromAuth();
      if (authId || isBx24Placement()) state.hasBx24 = true;
    }

    ensureAccess().then(function (ok) {
      if (!ok) return;
      boot();
    }).catch(function (err) {
      showGate('Ошибка запуска: ' + (err && err.message ? err.message : String(err)));
    });
  }

  // SDK с api.bitrix24.com есть и локально — без DOMAIN= это не портал.
  // Иначе BX24.init зависает, а #app остаётся hidden → «пустая страница».
  if (state.hasBx24 || typeof BX24 !== 'undefined') {
    var initDone = false;
    var initTimer = setTimeout(function () {
      if (initDone) return;
      initDone = true;
      // Не сбрасываем hasBx24 в false на vercel-домене — иначе ложный deny
      if (!isBx24Placement() && !userIdFromAuth()) state.hasBx24 = false;
      start();
    }, 4000);
    try {
      if (typeof BX24 !== 'undefined' && typeof BX24.init === 'function') {
        BX24.init(function () {
          if (initDone) return;
          initDone = true;
          clearTimeout(initTimer);
          state.hasBx24 = true;
          start();
        });
      } else {
        clearTimeout(initTimer);
        initDone = true;
        start();
      }
    } catch (err) {
      clearTimeout(initTimer);
      initDone = true;
      state.hasBx24 = isBx24Placement();
      start();
    }
  } else {
    start();
  }
})();
