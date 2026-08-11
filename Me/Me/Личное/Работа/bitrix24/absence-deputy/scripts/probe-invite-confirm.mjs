import fs from 'fs';

const envPath =
  'c:/Users/mitkinMV/Desktop/Курсор работа/Me/Me/Личное/Работа/bitrix24/.env';
const userId = process.argv[2] || '16620';

function loadWebhook() {
  const txt = fs.readFileSync(envPath, 'utf8');
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^\s*(B24_NAV_WEBHOOK|B24_WEBHOOK)\s*=\s*(.+)\s*$/);
    if (m) return m[2].trim().replace(/^["']|["']$/g, '');
  }
  return '';
}

async function b24(base, method, params) {
  const res = await fetch(base + method, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params || {}),
  });
  return res.json();
}

const base = (loadWebhook().endsWith('/') ? loadWebhook() : loadWebhook() + '/');

const confirmMethods = [
  ['intranet.invite.confirm', { USER_ID: userId }],
  ['intranet.invite.accept', { USER_ID: userId }],
  ['intranet.invite.approve', { USER_ID: userId }],
  ['intranet.invitation.confirm', { USER_ID: userId }],
  ['user.confirm', { ID: userId }],
  ['user.register', { ID: userId }],
];

console.log('=== confirm/approve probes for user', userId, '===');
for (const [method, params] of confirmMethods) {
  const r = await b24(base, method, params);
  console.log(
    method,
    '→',
    r.error || 'OK',
    (r.error_description || '').slice(0, 120)
  );
}

const fields = await b24(base, 'user.fields', {});
const keys = Object.keys(fields.result || {}).filter(function (k) {
  return /confirm|invite|register|active|login|auth/i.test(k);
});
console.log('\nuser.fields (confirm/invite related):', keys.join(', ') || '(none)');

const u = await b24(base, 'user.get', { ID: userId });
const user = (Array.isArray(u.result) ? u.result[0] : u.result) || {};
console.log('\nuser snapshot:', {
  ID: user.ID,
  ACTIVE: user.ACTIVE,
  LAST_LOGIN: user.LAST_LOGIN || '(empty)',
  CONFIRM_CODE: user.CONFIRM_CODE ? 'set' : '(empty)',
  DATE_REGISTER: user.DATE_REGISTER,
});

// dry-run: would user.update with ACTIVE=Y + password work? Only probe error, no mutation
console.log('\n(no mutation probes — read-only)');
