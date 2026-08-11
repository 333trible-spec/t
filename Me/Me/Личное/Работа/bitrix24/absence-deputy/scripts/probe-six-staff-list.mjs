import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const require = createRequire(import.meta.url);
const sixStaffList = require(path.join(root, 'lib', 'six-staff-list.js'));

const envPath = path.join(root, '..', '.env');

function loadWebhook() {
  if (process.env.B24_NAV_WEBHOOK) return process.env.B24_NAV_WEBHOOK;
  if (process.env.B24_WEBHOOK) return process.env.B24_WEBHOOK;
  const txt = fs.readFileSync(envPath, 'utf8');
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^\s*(B24_NAV_WEBHOOK|B24_WEBHOOK)\s*=\s*(.+)\s*$/);
    if (m) return m[2].trim().replace(/^["']|["']$/g, '');
  }
  return '';
}

const webhook = loadWebhook();
if (!webhook) {
  console.error('No webhook');
  process.exit(1);
}

const cfg = sixStaffList.loadConfigFromDisk();
console.log('iblockId', cfg && cfg.iblockId);

const all = await sixStaffList.listRecords(webhook, { limit: 20 });
console.log('listRecords (no type filter):', all.length);
all.forEach(function (r) {
  console.log(JSON.stringify(r));
});

const dismissals = await sixStaffList.listRecords(webhook, { recordType: 'dismissal', limit: 20 });
console.log('listRecords dismissal:', dismissals.length);
