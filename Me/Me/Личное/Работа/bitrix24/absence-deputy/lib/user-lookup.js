'use strict';

const {
  asUserId,
  isUserActive,
  userDisplayName,
  b24,
} = require('./b24');

function neverLoggedIn(user) {
  if (!user) return false;
  const lastLogin = user.LAST_LOGIN != null ? user.LAST_LOGIN : user.lastLogin;
  if (lastLogin && String(lastLogin).trim() && String(lastLogin) !== 'false') {
    return false;
  }
  return true;
}

function isInvitedPending(user) {
  return neverLoggedIn(user);
}

function inviteStatusSuffix(user) {
  if (!isInvitedPending(user)) return '';
  if (isUserActive(user)) return ' (приглашён)';
  return ' (ожидает подтверждения)';
}

function formatUserProfile(user) {
  const id = asUserId(user.ID != null ? user.ID : user.id);
  const name = userDisplayName(user) || ('Сотрудник ' + id);
  const active = isUserActive(user);
  const invited = isInvitedPending(user);
  const suffix = inviteStatusSuffix(user);
  return {
    id: id,
    name: name,
    active: active,
    invited: invited,
    displayName: name + suffix,
  };
}

async function getUserById(webhook, userId) {
  const uid = asUserId(userId);
  if (!uid) return null;

  const data = await b24(webhook, 'user.get', { ID: uid });
  let user = data.result;
  if (Array.isArray(user)) user = user[0];
  return user || null;
}

const INVITE_REVOKE_UNAVAILABLE =
  'REST-метод отмены приглашения недоступен на портале (22002). ' +
  'Уберите пользователя вручную: Сотрудники → Ожидает подтверждения → «Отклонить вход».';

function isInviteRevokeUnavailable(err) {
  if (!err || !err.code) return false;
  const code = String(err.code);
  return (
    code === '22002' ||
    code === 'ERROR_METHOD_NOT_FOUND' ||
    code === 'ERROR_CORE'
  );
}

async function revokeInvitation(webhook, userId) {
  const uid = asUserId(userId);
  if (!uid) throw new Error('Некорректный ID пользователя');

  const attempts = [{ USER_ID: uid }, { ID: uid }];
  let lastError = null;

  for (let i = 0; i < attempts.length; i++) {
    try {
      const data = await b24(webhook, 'intranet.invite.delete', attempts[i]);
      return { ok: true, result: data.result };
    } catch (err) {
      lastError = err;
      if (err.code === 'insufficient_scope') {
        throw new Error(
          'Для отмены приглашения добавьте scope intranet в webhook B24_NAV_WEBHOOK ' +
            '(Разработчикам → Входящий webhook → intranet) и обновите URL env на VibeCode.'
        );
      }
      if (isInviteRevokeUnavailable(err)) {
        return { ok: false, unavailable: true, message: INVITE_REVOKE_UNAVAILABLE };
      }
    }
  }

  if (lastError) {
    throw lastError;
  }

  return { ok: false };
}

module.exports = {
  neverLoggedIn,
  isInvitedPending,
  inviteStatusSuffix,
  formatUserProfile,
  getUserById,
  revokeInvitation,
  INVITE_REVOKE_UNAVAILABLE,
};
