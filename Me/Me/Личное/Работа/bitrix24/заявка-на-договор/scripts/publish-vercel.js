'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT_JSON = path.join(ROOT, 'static-urls.json');
const VERCEL_PROJECT = process.env.CONTRACT_REQUEST_VERCEL_PROJECT || 'b24-contract-request';

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const r = spawnSync(
  npx,
  ['--yes', 'vercel', 'deploy', '--prod', '--yes', '--name', VERCEL_PROJECT],
  { cwd: ROOT, stdio: 'pipe', encoding: 'utf8', shell: process.platform === 'win32' },
);

const out = (r.stdout || '') + (r.stderr || '');
const match = out.match(/https:\/\/[a-z0-9-]+\.vercel\.app/i);
if (!match) {
  console.error(out || `vercel failed (${r.status})`);
  console.error('\nВыполните: npx vercel login');
  process.exit(1);
}

const base = match[0];
const payload = {
  portal: 'https://ik-navigator.bitrix24.ru',
  index: `${base}/index.html`,
  install: `${base}/install.html`,
  tab: `${base}/tab.html`,
  publishedAt: new Date().toISOString(),
  host: 'vercel',
  domain: base.replace(/^https:\/\//, ''),
  b24HandlerUrl: `${base}/index.html`,
  b24InstallUrl: `${base}/install.html`,
};
fs.writeFileSync(OUT_JSON, JSON.stringify(payload, null, 2) + '\n', 'utf8');

console.log('Портал: ik-navigator.bitrix24.ru (НЕ b24-s2an91)');
console.log('Обработчик:', payload.b24HandlerUrl);
console.log('Установка:', payload.b24InstallUrl);
