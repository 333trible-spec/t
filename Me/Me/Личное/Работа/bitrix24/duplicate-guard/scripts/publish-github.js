'use strict';

/**
 * Публикация Duplicate Guard → GitHub b24-duplicate-guard (+ опционально Vercel).
 */
const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DEPLOY_DIR = path.join(ROOT, '.github-pages');
const OUT_JSON = path.join(ROOT, 'static-urls.json');

const GH_OWNER = process.env.DUPLICATE_GUARD_GH_OWNER || '333trible-spec';
const GH_REPO = process.env.DUPLICATE_GUARD_GH_REPO || 'b24-duplicate-guard';
const GH_BRANCH = process.env.DUPLICATE_GUARD_GH_BRANCH || 'main';
const REMOTE = `https://github.com/${GH_OWNER}/${GH_REPO}.git`;
const VERCEL_PROJECT = process.env.DUPLICATE_GUARD_VERCEL_PROJECT || 'b24-duplicate-guard';

const DEPLOY_NAMES = ['api', 'docs', 'vercel.json', 'package.json', 'README.md', '.env.example'];
const DEPLOY_SCRIPTS = ['dev-server.mjs', 'register-portal.mjs'];

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const from = path.join(src, name);
    const to = path.join(dest, name);
    if (fs.statSync(from).isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

function buildDeployDir() {
  if (!fs.existsSync(path.join(ROOT, 'api', 'webhook', 'lead-add.js'))) {
    console.error('Нет api/webhook/lead-add.js — сначала: node scripts/download-deployment.js');
    process.exit(1);
  }

  const keepVercel = fs.existsSync(path.join(DEPLOY_DIR, '.vercel', 'project.json'))
    ? fs.readFileSync(path.join(DEPLOY_DIR, '.vercel', 'project.json'))
    : fs.existsSync(path.join(ROOT, '.vercel', 'project.json'))
      ? fs.readFileSync(path.join(ROOT, '.vercel', 'project.json'))
      : null;

  if (fs.existsSync(DEPLOY_DIR)) fs.rmSync(DEPLOY_DIR, { recursive: true, force: true });
  fs.mkdirSync(DEPLOY_DIR, { recursive: true });

  for (const name of DEPLOY_NAMES) {
    const src = path.join(ROOT, name);
    if (!fs.existsSync(src)) continue;
    const dest = path.join(DEPLOY_DIR, name);
    if (fs.statSync(src).isDirectory()) copyDir(src, dest);
    else fs.copyFileSync(src, dest);
  }

  const scriptsSrc = path.join(ROOT, 'scripts');
  const scriptsDest = path.join(DEPLOY_DIR, 'scripts');
  fs.mkdirSync(scriptsDest, { recursive: true });
  for (const name of DEPLOY_SCRIPTS) {
    const src = path.join(scriptsSrc, name);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(scriptsDest, name));
  }

  fs.writeFileSync(path.join(DEPLOY_DIR, '.gitignore'), '.env.local\n.vercel\n', 'utf8');

  if (keepVercel) {
    fs.mkdirSync(path.join(DEPLOY_DIR, '.vercel'), { recursive: true });
    fs.writeFileSync(path.join(DEPLOY_DIR, '.vercel', 'project.json'), keepVercel);
  }
}

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', ...opts });
  if (r.status !== 0) process.exit(r.status || 1);
}

function getGitHubToken() {
  const r = spawnSync('git', ['credential', 'fill'], {
    input: 'protocol=https\nhost=github.com\n\n',
    encoding: 'utf8',
  });
  const out = r.stdout || '';
  const m = out.match(/^password=(.+)$/m);
  return m ? m[1].trim() : '';
}

async function createGitHubRepoIfMissing() {
  const check = spawnSync('git', ['ls-remote', REMOTE], { stdio: 'pipe', encoding: 'utf8' });
  if (check.status === 0) return;

  const token = getGitHubToken();
  if (!token) {
    console.warn('Нет GitHub token. Создайте репозиторий:', `https://github.com/new?name=${GH_REPO}`);
    return;
  }

  const res = await fetch('https://api.github.com/user/repos', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: GH_REPO,
      description: 'Duplicate Guard for Bitrix24 CRM',
      private: false,
    }),
  });
  if (res.status === 422) return; // already exists
  if (!res.ok) {
    const t = await res.text();
    console.warn('GitHub API:', res.status, t.slice(0, 200));
    return;
  }
  console.log('GitHub repo создан:', `https://github.com/${GH_OWNER}/${GH_REPO}`);
}

function pushGitHub() {
  const hadRepo = fs.existsSync(path.join(DEPLOY_DIR, '.git'));
  if (!hadRepo) {
    run('git', ['init'], { cwd: DEPLOY_DIR });
    run('git', ['branch', '-M', GH_BRANCH], { cwd: DEPLOY_DIR });
    run('git', ['remote', 'add', 'origin', REMOTE], { cwd: DEPLOY_DIR });
  }
  run('git', ['add', '-A'], { cwd: DEPLOY_DIR });
  try {
    run('git', ['commit', '-m', 'Deploy duplicate-guard from vault'], { cwd: DEPLOY_DIR });
  } catch {
    /* empty */
  }
  run('git', ['push', '-u', 'origin', GH_BRANCH, '--force'], { cwd: DEPLOY_DIR });
}

function deployVercel() {
  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const r = spawnSync(
    npx,
    ['--yes', 'vercel', 'deploy', '--prod', '--yes'],
    { cwd: DEPLOY_DIR, stdio: 'pipe', encoding: 'utf8' },
  );
  const out = (r.stdout || '') + (r.stderr || '');
  const match = out.match(/https:\/\/[a-z0-9-]+\.vercel\.app/i);
  if (!match) {
    console.warn('Vercel:', out.trim() || `exit ${r.status}`);
    return null;
  }
  return match[0];
}

function updateStaticUrls(base) {
  const domain = base.replace(/^https:\/\//, '');
  const payload = {
    install: `${base}/install.html`,
    settings: `${base}/settings.html`,
    publishedAt: new Date().toISOString(),
    host: 'vercel',
    domain,
    b24HandlerUrl: `${base}/settings.html`,
    b24InstallUrl: `${base}/install.html`,
  };
  fs.writeFileSync(OUT_JSON, JSON.stringify(payload, null, 2) + '\n', 'utf8');
}

console.log('=== Duplicate Guard → GitHub ===\n');
buildDeployDir();
createGitHubRepoIfMissing().then(() => {
  pushGitHub();
  console.log(`\nGitHub: https://github.com/${GH_OWNER}/${GH_REPO}`);

  const vercelUrl = deployVercel();
  if (vercelUrl) {
    console.log('Vercel:', vercelUrl);
    updateStaticUrls(vercelUrl);
  } else {
    console.log('Vercel: подключите Git в dashboard или npm run publish:vercel');
  }
}).catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
