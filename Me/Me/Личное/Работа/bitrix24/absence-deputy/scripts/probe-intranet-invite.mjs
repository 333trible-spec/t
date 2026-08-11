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

const methods = [
  ['intranet.invite.delete', { USER_ID: userId }],
  ['intranet.invite.delete', { ID: userId }],
  ['intranet.invite.get', { USER_ID: userId }],
  ['intranet.invite.list', {}],
  ['user.update', { ID: userId, ACTIVE: 'N' }],
];

for (const [method, params] of methods) {
  const r = await b24(base, method, params);
  console.log('\n===', method, JSON.stringify(params), '===');
  console.log(JSON.stringify(r, null, 2));
}
