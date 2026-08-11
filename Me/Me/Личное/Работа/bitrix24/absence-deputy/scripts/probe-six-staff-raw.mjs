import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const require = createRequire(import.meta.url);
const { b24 } = require(path.join(root, 'lib', 'b24.js'));

const envPath = path.join(root, '..', '.env');
function loadWebhook() {
  if (process.env.B24_NAV_WEBHOOK) return process.env.B24_NAV_WEBHOOK;
  const txt = fs.readFileSync(envPath, 'utf8');
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^\s*(B24_NAV_WEBHOOK|B24_WEBHOOK)\s*=\s*(.+)\s*$/);
    if (m) return m[2].trim().replace(/^["']|["']$/g, '');
  }
  return '';
}

const webhook = loadWebhook();
const data = await b24(webhook, 'lists.element.get', {
  IBLOCK_TYPE_ID: 'lists',
  IBLOCK_ID: 276,
});
console.log(JSON.stringify(data.result, null, 2));
