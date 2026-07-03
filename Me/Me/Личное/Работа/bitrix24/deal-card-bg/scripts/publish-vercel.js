'use strict';

/** Деплой на Vercel из .github-pages (после npm run publish:github). */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DEPLOY_DIR = path.join(ROOT, '.github-pages');
const OUT_STATIC = path.join(ROOT, '.static-url');
const OUT_JSON = path.join(ROOT, 'static-urls.json');
const VERCEL_PROJECT = process.env.DEAL_CARD_BG_VERCEL_PROJECT || 'tt';

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

const installUrl = `${match[0]}/install.html`;
const base = match[0];
fs.writeFileSync(OUT_STATIC, installUrl, 'utf8');
fs.writeFileSync(
  OUT_JSON,
  JSON.stringify(
    {
      install: installUrl,
      fieldHandler: `${base}/field-handler.html`,
      tab: `${base}/tab.html`,
      publishedAt: new Date().toISOString(),
      host: 'vercel',
    },
    null,
    2,
  ),
);

console.log('Vercel URL для Б24:');
console.log(installUrl);
