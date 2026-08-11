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

const info = await b24(base, 'app.info', {});
console.log('SCOPE:', info.result && info.result.SCOPE);

const got = await b24(base, 'user.get', { ID: userId });
if (got.error) {
  console.log('user.get ERROR:', got.error, got.error_description);
} else {
  let u = got.result;
  if (Array.isArray(u)) u = u[0];
  console.log('user.get OK:', {
    ID: u.ID,
    ACTIVE: u.ACTIVE,
    NAME: u.NAME,
    LAST_NAME: u.LAST_NAME,
    EMAIL: u.EMAIL,
    LAST_LOGIN: u.LAST_LOGIN,
    DATE_REGISTER: u.DATE_REGISTER,
  });
}
