'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DEPLOY_DIR = path.join(ROOT, '.github-pages');
const OUT_JSON = path.join(ROOT, 'static-urls.json');
const VERCEL_PROJECT = process.env.DUPLICATE_GUARD_VERCEL_PROJECT || 'b24-duplicate-guard';

if (!fs.existsSync(DEPLOY_DIR)) {
  console.error('Сначала: npm run publish:github');
  process.exit(1);
}

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const r = spawnSync(
  npx,
  ['--yes', 'vercel', 'deploy', '--prod', '--yes', '--name', VERCEL_PROJECT],
  { cwd: DEPLOY_DIR, stdio: 'pipe', encoding: 'utf8' },
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
  install: `${base}/install.html`,
  settings: `${base}/settings.html`,
  publishedAt: new Date().toISOString(),
  host: 'vercel',
  domain: base.replace(/^https:\/\//, ''),
  b24HandlerUrl: `${base}/settings.html`,
  b24InstallUrl: `${base}/install.html`,
};
fs.writeFileSync(OUT_JSON, JSON.stringify(payload, null, 2) + '\n', 'utf8');

console.log('Vercel URL для Б24:');
console.log(payload.b24InstallUrl);
console.log(payload.b24HandlerUrl);
