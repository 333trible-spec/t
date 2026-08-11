import fs from 'fs';

const envPath =
  process.argv[2] ||
  'c:/Users/mitkinMV/Desktop/Курсор работа/Me/Me/Личное/Работа/bitrix24/.env';
const userId = process.argv[3] || '16620';

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

const wh = loadWebhook();
if (!wh) {
  console.error('NO_WEBHOOK');
  process.exit(1);
}
const base = wh.endsWith('/') ? wh : wh + '/';

const got = await b24(base, 'user.get', { ID: userId });
console.log('=== user.get ===');
console.log(JSON.stringify(got, null, 2));

const fields = await b24(base, 'user.fields', {});
if (!fields.error) {
  const keys = Object.keys(fields.result || {}).slice(0, 30);
  console.log('user.fields sample keys:', keys.join(', '));
}

const search = await b24(base, 'user.search', {
  FILTER: { ID: userId },
  ADMIN_MODE: 'Y',
});
console.log('=== user.search ADMIN ===');
console.log(JSON.stringify(search, null, 2));

const probes = [
  'user.invite.delete',
  'user.invite.revoke',
  'user.delete',
  'intranet.invitation.delete',
  'intranet.invite.delete',
];

for (const method of probes) {
  const r = await b24(base, method, { ID: userId, USER_ID: userId });
  console.log('=== probe', method, '===');
  console.log(JSON.stringify(r, null, 2));
}
