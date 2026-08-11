/**
 * 6 кадров — UI + API (УС #276), делегирование БП.
 * GlobalConst — stub (логирование ролей); запись констант — отдельный этап.
 * Доступ: user ID 24880 (сервер проверяет BX24 auth).
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'six_staff_v01';
  var TEST_MODE = false;
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

  /* Календарный день приложения — YEKT (UTC+5), как сервер и cron */
  var APP_TZ = 'Asia/Yekaterinburg';

  function todayISO() {
    var parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: APP_TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(new Date());
    var map = {};
    parts.forEach(function (p) {
      if (p.type !== 'literal') map[p.type] = p.value;
    });
    return map.year + '-' + map.month + '-' + map.day;
  }

  function formatRu(iso) {
    if (!iso) return '—';
    var p = String(iso).split('-');
    if (p.length !== 3) return iso;
    return p[2] + '.' + p[1] + '.' + p[0];
  }

  /** Фамилия + Имя без отчества */
  function shortPersonName(full) {
    var parts = String(full || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return parts[0] + ' ' + parts[1];
    return parts[0] || '';
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

  function wirePickers() {
    document.querySelectorAll('.user-picker').forEach(function (root) {
      var key = root.getAttribute('data-picker');
      var field = root.closest('.field');
      var pickerButton = root.querySelector('.picker-btn');

      pickerButton.addEventListener('click', function () {
        if (state.hasBx24 && typeof BX24.selectUser === 'function') {
          clearFieldError(field);
          selectUserBx24(key);
        } else {
          showFieldError(field, 'Выбор сотрудника доступен только внутри Битрикс24');
        }
      });

      root.querySelector('.picker-clear').addEventListener('click', function () {
        setUser(key, null);
      });
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
    } else if (!user.id) {
      showFieldError(document.getElementById('field-dis-user'), 'У пользователя нет ID — выберите через селектор Б24');
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
    return '<span class="badge badge-fixed ' + meta.cls + '">' + escapeHtml(meta.label) + '</span>';
  }

  function delegationCellHtml(row) {
    if (!row || row.status !== 'active') {
      return '<span class="muted">—</span>';
    }
    var d = row.delegation;
    if (!d || !d.checkedAt) {
      return '<span class="muted" title="Крон ещё не проверял">—</span>';
    }
    if (d.ok) {
      return '<span class="badge badge-fixed badge-success">ок</span>';
    }
    var text = d.comment || 'есть невыделенные задания';
    var short = text.length > 72 ? text.slice(0, 69) + '…' : text;
    return '<span class="delegation-issue" title="' + escapeHtml(text) + '">' + escapeHtml(short) + '</span>';
  }

  function employmentBadgeHtml(status) {
    var label = String(status || '—');
    var cls = 'badge-emp-work';
    if (label === 'Уволен') cls = 'badge-emp-fired';
    return '<span class="badge badge-fixed ' + cls + '">' + escapeHtml(label) + '</span>';
  }

  function dismissalStatusBadgeHtml(status) {
    var label = String(status || '—');
    var cls = 'badge-neutral';
    if (label === 'Уволен') cls = 'badge-emp-fired';
    else if (label === 'Запланировано') cls = 'badge-info';
    else if (label === 'Ожидает выполнения') cls = 'badge-danger';
    else if (label === 'В работе') cls = 'badge-emp-work';
    return '<span class="badge badge-fixed ' + cls + '">' + escapeHtml(label) + '</span>';
  }

  /** Белый кружок; если есть константа — чёрный кружок внутри */
  function constMarkHtml(inConst) {
    return (
      '<span class="const-mark' + (inConst ? ' is-on' : '') + '" title="' +
      (inConst ? 'Есть в глобальных константах' : 'Нет в глобальных константах') +
      '" aria-label="' + (inConst ? 'Есть в константах' : 'Нет в константах') + '">' +
      '<span class="const-mark-inner"></span>' +
      '</span>'
    );
  }

  function rolesShort(roles) {
    if (!roles || !roles.length) return '—';
    var names = roles.map(function (r) { return r.name; });
    var head = names.slice(0, 2).join(', ');
    if (names.length > 2) head += ' (+' + (names.length - 2) + ')';
    return escapeHtml(String(names.length)) + ': ' + escapeHtml(head);
  }

  function formatDelegationRunMessage(data) {
    if (!data) return 'Нет ответа сервера';
    var active = data.activeVacations != null ? data.activeVacations : 0;
    var delegated = data.totalDelegated != null ? data.totalDelegated : 0;
    if (!active) return 'Активных отпусков нет — делегировать нечего';
    if (data.totalIssues) {
      var parts = (data.results || [])
        .filter(function (r) {
          return r && r.delegationOk === false;
        })
        .map(function (r) {
          return r.comment || r.message || 'ошибка';
        });
      return 'Есть проблемы: ' + (parts.join(' · ') || 'см. колонку «Делегирование»');
    }
    if (delegated > 0) {
      return 'ок — делегировано заданий: ' + delegated;
    }
    return 'ок — открытых заданий у отпускников нет';
  }

  function confirmRunDelegationCron() {
    openModal(
      'Делегирование',
      '<p>Запустить сейчас?</p>',
      [
        { label: 'Да', cls: 'btn-primary', onClick: runDelegationCron },
        { label: 'Нет', cls: 'btn-outline' }
      ],
      MODAL_CONFIRM
    );
  }

  function runDelegationCron() {
    var btn = document.getElementById('vac-run-delegation');
    var statusEl = document.getElementById('vac-delegation-status');
    if (!btn || !statusEl) return;

    btn.disabled = true;
    statusEl.hidden = false;
    statusEl.className = 'delegation-run-status is-loading';
    statusEl.textContent = 'Запуск делегирования…';

    getRequestedBy()
      .then(function (requestedBy) {
        return apiFetch('/api/delegation-run', {
          method: 'POST',
          body: JSON.stringify(withAuthPayload({ requestedBy: requestedBy })),
        }).then(function (res) {
          return res.json().then(function (data) {
            if (!res.ok || !data) {
              throw new Error((data && data.error) || ('HTTP ' + res.status));
            }
            if (data.error) {
              throw new Error(data.error);
            }
            return data;
          });
        });
      })
      .then(function (data) {
        statusEl.className =
          'delegation-run-status ' + (data.totalIssues ? 'is-error' : 'is-ok');
        statusEl.textContent = formatDelegationRunMessage(data);
        renderVacations();
      })
      .catch(function (err) {
        statusEl.className = 'delegation-run-status is-error';
        statusEl.textContent =
          'Ошибка: ' + (err && err.message ? err.message : String(err));
      })
      .finally(function () {
        btn.disabled = false;
        fitWindow();
      });
  }

  function renderVacations() {
    var tbody = document.getElementById('vac-tbody');
    var empty = document.getElementById('vac-empty');
    var table = document.getElementById('vac-table');

    tbody.innerHTML = '';
    table.hidden = true;
    empty.hidden = false;
    empty.textContent = 'Загрузка…';

    apiFetch('/api/hr-vacations', { method: 'GET' })
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok || !data || !data.ok) {
            throw new Error((data && data.error) || ('HTTP ' + res.status));
          }
          return data;
        });
      })
      .then(function (data) {
        var items = (Array.isArray(data.items) ? data.items : []).filter(function (r) {
          return r && r.status !== 'returned';
        });
        if (!items.length) {
          empty.textContent = data.source === 'lists'
            ? 'Нет записей об отпусках'
            : 'Нет отпусков на стадии «Оформление»';
          empty.hidden = false;
          table.hidden = true;
          fitWindow();
          return;
        }

        empty.hidden = true;
        table.hidden = false;
        tbody.innerHTML = items.map(function (r) {
          var fullName = (r.employee && r.employee.name) || '';
          var empName = shortPersonName(fullName);
          var depName = shortPersonName(r.deputy && r.deputy.name ? r.deputy.name : '');
          var inConst = !!(window.SixStaffConstants && SixStaffConstants.personInConstants(fullName || empName));
          return (
            '<tr>' +
            '<td>' + escapeHtml(empName || '—') + '</td>' +
            '<td>' + formatRu(r.dateFrom) + ' – ' + formatRu(r.dateTo) + '</td>' +
            '<td>' + escapeHtml(depName || '—') + '</td>' +
            '<td>' + badgeHtml(VAC_STATUS, r.status) + '</td>' +
            '<td>' + delegationCellHtml(r) + '</td>' +
            '<td class="col-const">' + constMarkHtml(inConst) + '</td>' +
            '</tr>'
          );
        }).join('');
        fitWindow();
      })
      .catch(function (err) {
        empty.textContent =
          'Не удалось загрузить отпуска' +
          (err && err.message ? ': ' + err.message : '');
        empty.hidden = false;
        table.hidden = true;
        fitWindow();
      });
  }

  function renderDismissals() {
    var tbody = document.getElementById('dis-tbody');
    var empty = document.getElementById('dis-empty');
    var table = document.getElementById('dis-table');

    tbody.innerHTML = '';
    table.hidden = true;
    empty.hidden = false;
    empty.textContent = 'Загрузка…';

    apiFetch('/api/hr-dismissals', { method: 'GET' })
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok || !data || !data.ok) {
            throw new Error((data && data.error) || ('HTTP ' + res.status));
          }
          return data;
        });
      })
      .then(function (data) {
        var items = Array.isArray(data.items) ? data.items : [];
        if (!items.length) {
          empty.textContent = data.storageAvailable === false
            ? 'История увольнений пока не сохраняется — настройте универсальный список (scope lists) или Redis.'
            : 'Нет записей об увольнениях';
          empty.hidden = false;
          table.hidden = true;
          fitWindow();
          return;
        }

        empty.hidden = true;
        table.hidden = false;
        tbody.innerHTML = items.map(function (r) {
          var fullName = (r.employee && r.employee.name) || '';
          var empName = shortPersonName(fullName);
          var inConst = !!(window.SixStaffConstants && SixStaffConstants.personInConstants(fullName || empName));
          var cancelBtn = r.cancellable
            ? ' <button type="button" class="btn btn-plain btn-sm" data-dis-cancel="' +
              escapeHtml(r.id) + '">Отменить</button>'
            : '';
          return (
            '<tr>' +
            '<td>' + escapeHtml(empName || '—') + '</td>' +
            '<td>' + formatRu(r.date) + '</td>' +
            '<td>' + dismissalStatusBadgeHtml(r.status) + '</td>' +
            '<td class="col-const">' + constMarkHtml(inConst) + '</td>' +
            '<td class="col-actions">' + cancelBtn + '</td>' +
            '</tr>'
          );
        }).join('');
        fitWindow();
      })
      .catch(function (err) {
        empty.textContent =
          'Не удалось загрузить увольнения' +
          (err && err.message ? ': ' + err.message : '');
        empty.hidden = false;
        table.hidden = true;
        fitWindow();
      });
  }

  /* ---------- modal ---------- */

  var MODAL_CONFIRM = { actionsCenter: true, actionsEqualWidth: true };
  var MODAL_DISMISS_CANCEL = {
    actionsCenter: true,
    actionsEqualWidth: true,
    actionsClass: 'modal-actions-dismiss-cancel'
  };

  function openModal(title, bodyHtml, actions, options) {
    var backdrop = document.getElementById('modal');
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHtml;
    var act = document.getElementById('modal-actions');
    act.innerHTML = '';
    act.className = 'modal-actions';
    if (options && options.actionsCenter) {
      act.classList.add('modal-actions-center');
    }
    if (options && options.actionsEqualWidth) {
      act.classList.add('modal-actions-equal');
    }
    if (options && options.actionsClass) {
      act.classList.add(options.actionsClass);
    }
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
    var submitBtn = document.getElementById('vac-submit');
    var prevText = submitBtn.textContent;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Сохранение…';

    getRequestedBy()
      .then(function (requestedBy) {
        return apiFetch('/api/hr-vacations', {
          method: 'POST',
          body: JSON.stringify(withAuthPayload({
            requestedBy: requestedBy,
            userId: emp.id,
            userName: emp.name,
            deputyId: dep && dep.id ? dep.id : null,
            deputyName: dep && dep.name ? dep.name : '',
            dateFrom: from,
            dateTo: to,
            roles: roles
          }))
        }).then(function (res) {
          return res.json().then(function (data) {
            if (!res.ok || !data || !data.ok) {
              throw new Error((data && data.error) || ('HTTP ' + res.status));
            }
            return data;
          });
        });
      })
      .then(function () {
        if (status === 'active') {
          applyRoleSubstitution(roles, emp, dep, 'vacation-start-immediate');
        } else {
          scheduleCronStub('vacation-start', { employee: emp, deputy: dep, dateFrom: from, dateTo: to });
        }
        scheduleCronStub('vacation-end', { employee: emp, deputy: dep, dateFrom: from, dateTo: to });
        resetVacationForm();
        renderVacations();
        fitWindow();
      })
      .catch(function (err) {
        openModal(
          'Ошибка',
          '<p>' + escapeHtml(err && err.message ? err.message : String(err)) + '</p>',
          [{ label: 'OK', cls: 'btn-primary', onClick: function () {} }]
        );
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = prevText;
      });
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
    , MODAL_CONFIRM);
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
      ],
      MODAL_CONFIRM
    );
  }

  function resetVacationForm() {
    setUser('vac-employee', null);
    setUser('vac-deputy', null);
    document.getElementById('vac-from').value = '';
    document.getElementById('vac-to').value = '';
    document.getElementById('vac-today-info').hidden = true;
    clearVacationErrors();
    updateVacRoles();
  }

  /* ---------- dismissal actions ---------- */

  function getRequestedBy() {
    if (state.currentUserId) return Promise.resolve(state.currentUserId);
    if (isLocalHost()) return Promise.resolve(ALLOWED_USER_ID);
    return resolveCurrentUserId();
  }

  function getB24AuthForApi() {
    try {
      if (typeof BX24 === 'undefined' || typeof BX24.getAuth !== 'function') return null;
      var auth = BX24.getAuth();
      if (!auth || !auth.access_token || !auth.domain) return null;
      return {
        accessToken: String(auth.access_token),
        domain: String(auth.domain),
      };
    } catch (_) {
      return null;
    }
  }

  function withAuthPayload(payload) {
    var out = Object.assign({}, payload || {});
    var auth = getB24AuthForApi();
    if (auth) {
      out.accessToken = auth.accessToken;
      out.domain = auth.domain;
    }
    return out;
  }

  function authHeaders() {
    var auth = getB24AuthForApi();
    var headers = { 'Content-Type': 'application/json' };
    if (auth) {
      headers['X-B24-Auth'] = auth.accessToken;
      headers['X-B24-Domain'] = auth.domain;
    }
    return headers;
  }

  function apiFetch(url, options) {
    var opts = options || {};
    var headers = Object.assign({}, authHeaders(), opts.headers || {});
    if (opts.method && String(opts.method).toUpperCase() === 'GET') {
      delete headers['Content-Type'];
    }
    return fetch(url, Object.assign({}, opts, { headers: headers }));
  }

  function callDismissalApi(payload) {
    return getRequestedBy().then(function (requestedBy) {
      var body = withAuthPayload(payload);
      body.requestedBy = requestedBy;
      return apiFetch('/api/dismissal', {
        method: 'POST',
        body: JSON.stringify(body)
      }).then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok || !data || data.ok === false) {
            throw new Error((data && data.error) || ('HTTP ' + res.status));
          }
          return data;
        });
      });
    });
  }

  function lookupUserById(userId) {
    return getRequestedBy().then(function (requestedBy) {
      var url =
        '/api/dismissal?action=lookup&id=' +
        encodeURIComponent(String(userId).trim()) +
        '&requestedBy=' +
        encodeURIComponent(String(requestedBy));
      return apiFetch(url, { method: 'GET' }).then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok || !data || data.ok === false) {
            throw new Error((data && data.error) || ('HTTP ' + res.status));
          }
          return data.user;
        });
      });
    });
  }

  function findDismissalUserById() {
    var wrap = document.getElementById('field-dis-user-id');
    var errEl = document.getElementById('field-dis-user-id-error');
    var input = document.getElementById('dis-user-id');
    var raw = input && input.value ? String(input.value).trim() : '';
    if (wrap) wrap.classList.remove('has-error');
    if (errEl) {
      errEl.hidden = true;
      errEl.textContent = '';
    }
    if (!raw || !/^\d+$/.test(raw)) {
      if (wrap) wrap.classList.add('has-error');
      if (errEl) {
        errEl.hidden = false;
        errEl.textContent = 'Укажите числовой ID пользователя';
      }
      return;
    }
    var btn = document.getElementById('dis-user-id-find');
    var prev = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Поиск…';
    lookupUserById(raw)
      .then(function (user) {
        setUser('dis-user', {
          id: user.id,
          name: user.displayName || user.name,
          invited: !!user.invited
        });
        clearFieldError(document.getElementById('field-dis-user'));
      })
      .catch(function (err) {
        if (wrap) wrap.classList.add('has-error');
        if (errEl) {
          errEl.hidden = false;
          errEl.textContent =
            err && err.message ? err.message : 'Не удалось найти пользователя';
        }
      })
      .finally(function () {
        btn.disabled = false;
        btn.textContent = prev;
      });
  }

  function dismissalSuccessMessage(data, mode, payloadDate) {
    var d = data && data.deactivated;
    if (mode !== 'now') {
      return 'Увольнение запланировано на ' + formatRu(payloadDate) + '.';
    }
    if (d && d.inviteRevoked) {
      return 'Приглашение отменено, пользователь удалён из очереди входа.';
    }
    if (d && d.pendingInvite && d.inviteRevokeUnavailable) {
      return (
        'Пользователь деактивирован в базе, но REST не убирает из «ожидает подтверждения». ' +
        'Сотрудники → Ожидает подтверждения → «Отклонить вход».'
      );
    }
    if (d && d.alreadyInactive && d.pendingInvite) {
      return (
        'Пользователь уже деактивирован. Чтобы убрать из «ожидает подтверждения»: ' +
        'Сотрудники → Ожидает подтверждения → «Отклонить вход».'
      );
    }
    if (d && d.alreadyInactive) {
      return 'Пользователь уже был деактивирован на портале.';
    }
    return 'Сотрудник деактивирован на портале (уволен).';
  }

  function submitDismissal() {
    if (!validateDismissal()) return;

    var user = state.users['dis-user'];
    var repl = state.users['dis-replacement'];
    var mode = document.querySelector('input[name="dis-mode"]:checked').value;
    var date = document.getElementById('dis-date').value;
    var roles = rolesForName(user.name);
    var submitBtn = document.getElementById('dis-submit');

    openModal(
      mode === 'now' ? 'Уволить сотрудника?' : 'Запланировать увольнение сотрудника?',
      (mode === 'now'
        ? '<p>Сотрудник будет <strong>деактивирован на портале</strong> сразу после подтверждения.</p>'
        : '<p>Увольнение выполнится автоматически ночью выбранного дня (проверка около 02:00 и 03:30, UTC+5).</p>') +
        (user.invited
          ? '<p class="hint">Пользователь <strong>приглашён или ожидает подтверждения входа</strong>. ' +
            'REST может только деактивировать — из очереди приглашений уберите вручную, если останется.</p>'
          : ''),
      [
        { label: 'Нет', cls: 'btn-outline' },
        {
          label: 'Да',
          cls: 'btn-danger',
          onClick: function () {
            var prevText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Выполняется…';

            var payload = {
              action: mode === 'now' ? 'execute' : 'schedule',
              userId: user.id,
              date: mode === 'date' ? date : todayISO(),
              replacementId: repl && repl.id ? repl.id : null
            };

            callDismissalApi(payload)
              .then(function (data) {
                if (repl && repl.name) {
                  applyRoleSubstitution(roles, user, repl, mode === 'now' ? 'dismissal-now' : 'dismissal-plan');
                }
                var msg = dismissalSuccessMessage(data, mode, payload.date);
                if (data.plan && data.plan.id) {
                  msg += ' Запись #' + data.plan.id + '.';
                }
                openModal('Готово', '<p>' + escapeHtml(msg) + '</p>', [
                  { label: 'OK', cls: 'btn-primary', onClick: function () {} }
                ]);
                resetDismissalForm();
                renderDismissals();
                fitWindow();
              })
              .catch(function (err) {
                openModal(
                  'Ошибка',
                  '<p>' + escapeHtml(err && err.message ? err.message : String(err)) + '</p>',
                  [{ label: 'OK', cls: 'btn-primary', onClick: function () {} }]
                );
              })
              .finally(function () {
                submitBtn.disabled = false;
                submitBtn.textContent = prevText;
              });
          }
        }
      ],
      MODAL_CONFIRM
    );
  }

  function cancelDismissalPlan(planId) {
    openModal(
      '🤔',
      '<p>Отменить увольнение?</p>',
      [
        {
          label: 'Да',
          cls: 'btn-danger',
          onClick: function () {
            callDismissalApi({ action: 'cancel', planId: planId })
              .then(function () {
                renderDismissals();
              })
              .catch(function (err) {
                openModal(
                  'Ошибка',
                  '<p>' + escapeHtml(err && err.message ? err.message : String(err)) + '</p>',
                  [{ label: 'OK', cls: 'btn-primary', onClick: function () {} }]
                );
              });
          }
        },
        { label: 'нет, увольнение в силе', cls: 'btn-outline' }
      ],
      MODAL_DISMISS_CANCEL
    );
  }

  function resetDismissalForm() {
    setUser('dis-user', null);
    setUser('dis-replacement', null);
    document.querySelector('input[name="dis-mode"][value="now"]').checked = true;
    document.getElementById('dis-date').value = '';
    var disUserId = document.getElementById('dis-user-id');
    if (disUserId) disUserId.value = '';
    document.getElementById('field-dis-date').hidden = true;
    document.getElementById('dis-submit').textContent = 'Уволить';
    clearDismissalErrors();
    updateDisPreview();
  }

  /* ---------- in-app console ---------- */

  var consoleHooked = false;
  var consoleMaxLines = 200;

  function formatConsoleArg(arg) {
    if (arg == null) return String(arg);
    if (typeof arg === 'string') return arg;
    try {
      return JSON.stringify(arg);
    } catch (_) {
      return String(arg);
    }
  }

  function appendConsoleLine(level, args) {
    var body = document.getElementById('console-body');
    if (!body) return;
    var line = document.createElement('span');
    line.className = 'app-console-line' + (level ? ' is-' + level : '');
    var stamp = new Date().toLocaleTimeString('ru-RU', { hour12: false });
    var text = Array.prototype.map.call(args, formatConsoleArg).join(' ');
    line.textContent = '[' + stamp + '] ' + text;
    body.appendChild(line);
    body.appendChild(document.createTextNode('\n'));
    while (body.childNodes.length > consoleMaxLines * 2) {
      body.removeChild(body.firstChild);
    }
    body.scrollTop = body.scrollHeight;
  }

  function hookConsole() {
    if (consoleHooked) return;
    consoleHooked = true;
    var levels = ['log', 'info', 'warn', 'error'];
    levels.forEach(function (level) {
      var original = console[level];
      if (typeof original !== 'function') return;
      console[level] = function () {
        try {
          appendConsoleLine(level === 'log' ? '' : level, arguments);
        } catch (_) {}
        return original.apply(console, arguments);
      };
    });
  }

  function setConsoleOpen(open) {
    var panel = document.getElementById('app-console');
    if (!panel) return;
    panel.hidden = !open;
    if (open) {
      hookConsole();
      fitWindow();
    } else {
      fitWindow();
    }
  }

  function clearConsole() {
    var body = document.getElementById('console-body');
    if (body) body.textContent = '';
  }

  /* ---------- cron-job.org (lazy) ---------- */

  function yektParts(tsSec) {
    if (tsSec == null || !Number.isFinite(Number(tsSec)) || Number(tsSec) <= 0) return null;
    var d = new Date(Number(tsSec) * 1000);
    var parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: APP_TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).formatToParts(d);
    var map = {};
    parts.forEach(function (p) {
      if (p.type !== 'literal') map[p.type] = p.value;
    });
    return {
      ymd: map.year + '-' + map.month + '-' + map.day,
      day: map.day,
      month: map.month,
      hour: String(Number(map.hour)),
      minute: map.minute,
      second: map.second
    };
  }

  function formatCronWhen(tsSec) {
    var p = yektParts(tsSec);
    if (!p) return '—';
    var time = p.hour + ':' + p.minute + ':' + p.second;
    var today = todayISO();
    var tparts = today.split('-').map(Number);
    var tomorrowDate = new Date(Date.UTC(tparts[0], tparts[1] - 1, tparts[2] + 1));
    var tomorrow =
      tomorrowDate.getUTCFullYear() +
      '-' +
      String(tomorrowDate.getUTCMonth() + 1).padStart(2, '0') +
      '-' +
      String(tomorrowDate.getUTCDate()).padStart(2, '0');
    if (p.ymd === today) return 'Сегодня в ' + time;
    if (p.ymd === tomorrow) return 'Завтра в ' + time;
    return p.day + '.' + p.month + ' в ' + time;
  }

  function formatDurationRu(ms) {
    if (ms == null || !Number.isFinite(Number(ms)) || Number(ms) < 0) return '';
    var sec = Number(ms) / 1000;
    var text = sec.toFixed(2).replace('.', ',');
    return text + ' с';
  }

  function formatCronStatus(job) {
    var label = job.lastStatusLabel || 'Статус';
    var dur = formatDurationRu(job.lastDurationMs);
    if (job.lastStatus === 1 && dur) return label + ' (' + dur + ')';
    return label;
  }

  function cronStatusClass(job) {
    if (job.lastStatus === 1) return 'is-ok';
    if (job.lastStatus > 1) return 'is-fail';
    return '';
  }

  function setCronStatus(text, kind) {
    var el = document.getElementById('cron-status');
    if (!el) return;
    if (!text) {
      el.hidden = true;
      el.textContent = '';
      el.className = 'cron-status';
      return;
    }
    el.hidden = false;
    el.textContent = text;
    el.className = 'cron-status' + (kind ? ' is-' + kind : '');
  }

  function renderServerStatus(data) {
    var el = document.getElementById('server-status');
    if (!el) return;
    if (!data) {
      el.innerHTML = '';
      el.hidden = true;
      return;
    }
    var version = escapeHtml(data.version || window.APP_VERSION || '—');
    var host = escapeHtml(data.host || '—');
    var checks = Array.isArray(data.checks) ? data.checks : [];
    var parts =
      'Сервер<span class="cron-row-sep">/</span>v' +
      version +
      '<span class="cron-row-sep">/</span>' +
      host;
    checks.forEach(function (check) {
      var label = escapeHtml(check.label || 'Проверка');
      var detail = escapeHtml(check.detail || (check.ok ? 'OK' : 'ошибка'));
      var cls = check.ok ? 'is-ok' : 'is-fail';
      parts +=
        '<span class="cron-row-sep">/</span>' +
        '<span class="cron-row-status ' +
        cls +
        '">' +
        label +
        ' · ' +
        detail +
        '</span>';
    });
    el.innerHTML =
      '<div class="cron-row server-status-row"><span class="cron-row-parts">' +
      parts +
      '</span></div>';
    el.hidden = false;
  }

  function fetchServerStatus(requestedBy) {
    var url =
      '/api/server-status?requestedBy=' + encodeURIComponent(String(requestedBy));
    return apiFetch(url, { method: 'GET' }).then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok || !data || data.ok === false) {
          throw new Error((data && data.error) || ('HTTP ' + res.status));
        }
        return data;
      });
    });
  }

  function fetchCronJobs(requestedBy) {
    var url = '/api/cron-jobs?requestedBy=' + encodeURIComponent(String(requestedBy));
    return apiFetch(url, { method: 'GET' }).then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok || !data || data.ok === false) {
          throw new Error((data && data.error) || ('HTTP ' + res.status));
        }
        return data;
      });
    });
  }

  function renderCronJobs(jobs) {
    var list = document.getElementById('cron-list');
    if (!list) return;
    list.innerHTML = '';
    if (!jobs || !jobs.length) {
      list.innerHTML = '<div class="cron-empty">Заданий на cron-job.org пока нет</div>';
      return;
    }
    jobs.forEach(function (job) {
      var row = document.createElement('div');
      row.className = 'cron-row' + (job.enabled ? '' : ' is-disabled');
      var name = escapeHtml(job.name || 'Задание') + ' (' + escapeHtml(job.scheduleLabel || 'YEKT') + ')';
      var last = escapeHtml(formatCronWhen(job.lastExecution));
      var status = escapeHtml(formatCronStatus(job));
      var next = escapeHtml(formatCronWhen(job.nextExecution));
      var stClass = cronStatusClass(job);
      row.innerHTML =
        '<span class="cron-row-parts">' +
        name +
        '<span class="cron-row-sep">/</span>' +
        last +
        '<span class="cron-row-sep">/</span>' +
        '<span class="cron-row-status ' +
        stClass +
        '">' +
        status +
        '</span>' +
        '<span class="cron-row-sep">/</span>' +
        next +
        '</span>';
      list.appendChild(row);
    });
  }

  var cronLoadSeq = 0;

  function loadCronJobs() {
    var seq = ++cronLoadSeq;
    var list = document.getElementById('cron-list');
    var serverEl = document.getElementById('server-status');
    if (list) list.innerHTML = '';
    if (serverEl) {
      serverEl.innerHTML = '';
      serverEl.hidden = true;
    }
    setCronStatus('Загрузка…', 'loading');
    getRequestedBy()
      .then(function (requestedBy) {
        return fetchServerStatus(requestedBy)
          .then(function (serverData) {
            if (seq !== cronLoadSeq) return;
            renderServerStatus(serverData);
            fitWindow();
          })
          .catch(function (err) {
            if (seq !== cronLoadSeq) return;
            renderServerStatus({
              version: window.APP_VERSION || '—',
              host: '—',
              healthy: false,
              checks: [
                {
                  ok: false,
                  label: 'Сервер',
                  detail: err && err.message ? err.message : String(err),
                },
              ],
            });
            fitWindow();
          })
          .then(function () {
            if (seq !== cronLoadSeq) return null;
            return fetchCronJobs(requestedBy);
          });
      })
      .then(function (data) {
        if (seq !== cronLoadSeq || !data) return;
        setCronStatus('');
        renderCronJobs(data.jobs || []);
        fitWindow();
      })
      .catch(function (err) {
        if (seq !== cronLoadSeq) return;
        setCronStatus(
          'Не удалось загрузить: ' + (err && err.message ? err.message : String(err)),
          'error'
        );
        if (list) list.innerHTML = '';
        fitWindow();
      });
  }

  /* ---------- tabs / BX24 ---------- */

  function switchTab(name) {
    document.querySelectorAll('.tab[data-tab]').forEach(function (t) {
      var on = t.getAttribute('data-tab') === name;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    var vac = document.getElementById('panel-vacation');
    var dis = document.getElementById('panel-dismissal');
    var help = document.getElementById('panel-help');
    var cron = document.getElementById('panel-cron');
    if (vac) vac.hidden = name !== 'vacation';
    if (dis) dis.hidden = name !== 'dismissal';
    if (help) help.hidden = name !== 'help';
    if (cron) cron.hidden = name !== 'cron';
    if (name === 'help') {
      var hv = document.getElementById('help-version');
      if (hv) hv.textContent = '6 кадров · v' + (window.APP_VERSION || '');
    }
    if (name === 'cron') {
      loadCronJobs();
    }
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
    document.querySelectorAll('.tab[data-tab]').forEach(function (t) {
      t.addEventListener('click', function () {
        switchTab(t.getAttribute('data-tab'));
      });
    });

    document.getElementById('vac-reset').addEventListener('click', resetVacationForm);
    document.getElementById('vac-submit').addEventListener('click', submitVacation);
    document.getElementById('vac-refresh').addEventListener('click', function () {
      renderVacations();
    });
    document.getElementById('vac-run-delegation').addEventListener('click', confirmRunDelegationCron);
    document.getElementById('vac-from').addEventListener('change', onVacDatesChange);
    document.getElementById('vac-to').addEventListener('change', onVacDatesChange);

    var cronRefresh = document.getElementById('cron-refresh');
    if (cronRefresh) {
      cronRefresh.addEventListener('click', function () {
        loadCronJobs();
      });
    }

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
    document.getElementById('dis-user-id-find').addEventListener('click', findDismissalUserById);
    document.getElementById('dis-user-id').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        findDismissalUserById();
      }
    });
    document.getElementById('dis-refresh').addEventListener('click', function () {
      renderDismissals();
    });

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

    var consoleClear = document.getElementById('console-clear');
    if (consoleClear) consoleClear.addEventListener('click', clearConsole);
    var consoleClose = document.getElementById('console-close');
    if (consoleClose) {
      consoleClose.addEventListener('click', function () {
        setConsoleOpen(false);
      });
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        var panel = document.getElementById('app-console');
        if (panel && !panel.hidden) {
          setConsoleOpen(false);
          return;
        }
        closeModal();
      }
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
    hookConsole();
    renderVacations();
    renderDismissals();
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
