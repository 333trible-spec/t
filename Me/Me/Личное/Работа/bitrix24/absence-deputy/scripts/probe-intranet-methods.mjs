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

const methods = [
  'intranet.invite.add',
  'intranet.invite.get',
  'intranet.invite.list',
  'intranet.invite.delete',
  'intranet.invite.decline',
  'intranet.invitation.add',
  'intranet.invitation.delete',
  'intranet.invitation.decline',
  'intranet.user.get',
  'intranet.config.get',
];

for (const method of methods) {
  const r = await b24(base, method, {});
  const err = r.error || 'OK';
  const desc = (r.error_description || '').slice(0, 100);
  console.log(method, '→', err, desc ? '| ' + desc : '');
}
