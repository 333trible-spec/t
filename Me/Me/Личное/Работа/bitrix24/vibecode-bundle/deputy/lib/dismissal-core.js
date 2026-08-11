'use strict';

const {
  todayISO,
  toDateOnly,
  asUserId,
  isUserActive,
  userDisplayName,
  b24,
  ALLOWED_USER_ID,
} = require('./b24');

const recordsStore = require('./records-store');
const {
  neverLoggedIn,
  revokeInvitation,
} = require('./user-lookup');

function planDisplayStatus(plan, userActive) {
  if (!plan) return '—';
  if (plan.status === 'cancelled') return 'Отменено';
  if (plan.status === 'error') return 'Ошибка';
  if (plan.status === 'done' || userActive === false) return 'Уволен';
  const t = todayISO();
  if (plan.date && plan.date > t) return 'Запланировано';
  if (plan.date && plan.date <= t) return 'Ожидает выполнения';
  return 'В работе';
}

function isPlanCancellable(plan, userActive) {
  if (!plan || plan.status !== 'planned') return false;
  if (userActive === false) return false;
  return true;
}

async function getUser(webhook, userId) {
  const data = await b24(webhook, 'user.get', { ID: userId });
  let user = data.result;
  if (Array.isArray(user)) user = user[0];
  return user || null;
}

async function deactivateUser(webhook, userId) {
  const uid = asUserId(userId);
  if (!uid) throw new Error('Некорректный ID пользователя');

  if (Number(uid) === ALLOWED_USER_ID) {
    throw new Error('Нельзя уволить пользователя приложения (ID ' + ALLOWED_USER_ID + ')');
  }

  const user = await getUser(webhook, uid);
  if (!user) throw new Error('Пользователь ' + uid + ' не найден');

  const pendingInvite = neverLoggedIn(user);
  let inviteRevoked = false;
  let inviteRevokeUnavailable = false;

  if (pendingInvite) {
    const revoke = await revokeInvitation(webhook, uid);
    if (revoke.ok) {
      inviteRevoked = true;
    } else if (revoke.unavailable) {
      inviteRevokeUnavailable = true;
    }
  }

  if (!isUserActive(user)) {
    return {
      userId: uid,
      name: userDisplayName(user) || ('Сотрудник ' + uid),
      alreadyInactive: true,
      pendingInvite: pendingInvite,
      inviteRevoked: inviteRevoked,
      inviteRevokeUnavailable: inviteRevokeUnavailable,
    };
  }

  await b24(webhook, 'user.update', { ID: uid, ACTIVE: false });

  const after = await getUser(webhook, uid);
  if (after && isUserActive(after)) {
    throw new Error('Не удалось деактивировать пользователя ' + uid + ' — проверьте права webhook (user)');
  }

  return {
    userId: uid,
    name: userDisplayName(user) || ('Сотрудник ' + uid),
    alreadyInactive: false,
    pendingInvite: pendingInvite,
    inviteRevoked: inviteRevoked,
    inviteRevokeUnavailable: inviteRevokeUnavailable,
  };
}

async function resolveReplacement(webhook, payload) {
  const replacementId = asUserId(payload.replacementId);
  let replacementName = String(payload.replacementName || '').trim();
  if (replacementId && !replacementName) {
    const repl = await getUser(webhook, replacementId);
    replacementName = repl ? userDisplayName(repl) : '';
  }
  return { replacementId, replacementName };
}

async function executeDismissal(webhook, payload) {
  const userId = asUserId(payload.userId);
  const date = toDateOnly(payload.date) || todayISO();
  if (!userId) throw new Error('userId обязателен');

  const deactivated = await deactivateUser(webhook, userId);
  const replacement = await resolveReplacement(webhook, payload);
  let plan = null;
  if (recordsStore.isStorageAvailable(webhook)) {
    plan = await recordsStore.addPlan(webhook, {
      recordType: 'dismissal',
      userId: userId,
      userName: deactivated.name,
      date: date,
      replacementId: replacement.replacementId,
      replacementName: replacement.replacementName,
      status: 'done',
      executedAt: new Date().toISOString(),
      requestedBy: payload.requestedBy,
    });
  }

  return {
    ok: true,
    mode: 'now',
    deactivated: deactivated,
    plan: plan,
    replacementId: replacement.replacementId,
  };
}

async function scheduleDismissal(webhook, payload) {
  recordsStore.requireStorage(webhook);
  const userId = asUserId(payload.userId);
  const date = toDateOnly(payload.date);
  if (!userId) throw new Error('userId обязателен');
  if (Number(userId) === ALLOWED_USER_ID) {
    throw new Error('Нельзя запланировать увольнение пользователя приложения (ID ' + ALLOWED_USER_ID + ')');
  }
  if (!date) throw new Error('date обязателен для планирования');
  if (date < todayISO()) {
    throw new Error('Дата увольнения не может быть в прошлом');
  }

  const user = await getUser(webhook, userId);
  if (!user) throw new Error('Пользователь не найден');
  if (!isUserActive(user)) throw new Error('Пользователь уже деактивирован');

  const replacement = await resolveReplacement(webhook, payload);
  const plan = await recordsStore.addPlan(webhook, {
    recordType: 'dismissal',
    userId: userId,
    userName: userDisplayName(user) || ('Сотрудник ' + userId),
    date: date,
    replacementId: replacement.replacementId,
    replacementName: replacement.replacementName,
    status: 'planned',
    requestedBy: payload.requestedBy,
  });

  return {
    ok: true,
    mode: 'scheduled',
    plan: plan,
    replacementId: replacement.replacementId,
  };
}

async function cancelScheduledDismissal(webhook, planId) {
  recordsStore.requireStorage(webhook);
  const id = String(planId || '').trim();
  if (!id) throw new Error('planId обязателен');

  const plan = await recordsStore.getPlan(webhook, id);
  if (!plan) throw new Error('Запись не найдена');
  if (plan.status !== 'planned') {
    throw new Error('Можно отменить только запланированное увольнение');
  }

  const updated = await recordsStore.updatePlan(webhook, id, { status: 'cancelled' });
  return { ok: true, plan: updated, alreadyCancelled: false };
}

async function processDueDismissals(webhook) {
  recordsStore.requireStorage(webhook);
  const today = todayISO();
  const due = await recordsStore.listDuePlans(webhook, today);
  const results = [];

  for (let i = 0; i < due.length; i++) {
    const plan = due[i];
    const entry = {
      planId: plan.id,
      userId: plan.userId,
      date: plan.date,
      status: 'skipped',
      message: '',
    };

    try {
      const deactivated = await deactivateUser(webhook, plan.userId);
      const meta = Object.assign({}, plan.meta || {});
      delete meta.lastError;
      delete meta.lastErrorAt;
      await recordsStore.updatePlan(webhook, plan.id, {
        status: 'done',
        executedAt: new Date().toISOString(),
        userName: deactivated.name,
        comment: '',
        meta: Object.keys(meta).length ? meta : null,
      });
      entry.status = deactivated.alreadyInactive ? 'already_inactive' : 'done';
      entry.message = deactivated.alreadyInactive ? 'уже был деактивирован' : 'деактивирован';
    } catch (err) {
      const message = err && err.message ? err.message : String(err);
      await recordsStore.updatePlan(webhook, plan.id, {
        status: 'error',
        comment: message,
        meta: Object.assign({}, plan.meta || {}, {
          lastError: message,
          lastErrorAt: new Date().toISOString(),
        }),
      });
      entry.status = 'error';
      entry.message = message;
    }

    results.push(entry);
  }

  const failed = results.filter(function (r) {
    return r.status === 'error';
  }).length;

  return {
    ok: failed === 0,
    today: today,
    processed: results.length,
    failed: failed,
    results: results,
  };
}

module.exports = {
  planDisplayStatus,
  isPlanCancellable,
  executeDismissal,
  scheduleDismissal,
  cancelScheduledDismissal,
  processDueDismissals,
  deactivateUser,
  getUser,
};
