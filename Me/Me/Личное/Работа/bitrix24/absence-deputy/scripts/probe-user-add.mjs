import fs from 'fs';

const envPath =
  'c:/Users/mitkinMV/Desktop/Курсор работа/Me/Me/Личное/Работа/bitrix24/.env';

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

for (const id of ['16620', '24880']) {
  const u = await b24(base, 'user.get', { ID: id });
  const x = (Array.isArray(u.result) ? u.result[0] : u.result) || {};
  console.log('USER', id, {
    ACTIVE: x.ACTIVE,
    LAST_LOGIN: x.LAST_LOGIN || '(empty)',
    IS_ONLINE: x.IS_ONLINE,
    CONFIRM_CODE: x.CONFIRM_CODE ? 'set' : '(empty)',
    USER_TYPE: x.USER_TYPE,
  });
}

const addEmpty = await b24(base, 'user.add', { EMAIL: '', UF_DEPARTMENT: [1] });
console.log('\nuser.add available:', addEmpty.error || 'OK', addEmpty.error_description || '');
console.log('(no real user created — only method probe)');
