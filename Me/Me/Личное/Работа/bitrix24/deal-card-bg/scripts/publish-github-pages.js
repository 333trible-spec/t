'use strict';

/**
 * Публикация на GitHub (репозиторий t) + деплой на Vercel.
 *
 * GitHub Pages отдаёт 405 на POST — Битрикс24 при установке шлёт POST.
 * Vercel serverless (api/serve.js) отвечает 200 на GET и POST.
 *
 * npm run publish:github
 * npm run publish:vercel   — только Vercel (после push)
 */
const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'app', 'public');
const TEMPLATES = path.join(ROOT, 'github-pages');
const DEPLOY_DIR = path.join(ROOT, '.github-pages');
const OUT_STATIC = path.join(ROOT, '.static-url');
const OUT_JSON = path.join(ROOT, 'static-urls.json');
const { syncPublicAssets } = require('./sync-public-assets');

const GH_OWNER = process.env.DEAL_CARD_BG_GH_OWNER || '333trible-spec';
const GH_REPO = process.env.DEAL_CARD_BG_GH_REPO || 't';
const GH_BRANCH = process.env.DEAL_CARD_BG_GH_BRANCH || 'main';
const REMOTE = `https://github.com/${GH_OWNER}/${GH_REPO}.git`;
const VERCEL_PROJECT = process.env.DEAL_CARD_BG_VERCEL_PROJECT || 'tt';

function hasGit() {
  try {
    execSync('git --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const from = path.join(src, name);
    const to = path.join(dest, name);
    if (fs.statSync(from).isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

function writeVersionJson() {
  const builtAt = new Date().toISOString();
  const payload = { version: '2.4.0', builtAt };
  fs.writeFileSync(
    path.join(PUBLIC, 'version.json'),
    JSON.stringify(payload, null, 2) + '\n',
  );
  return payload;
}

function copyDeploy() {
  syncPublicAssets();

  const vercelJsonPath = path.join(DEPLOY_DIR, '.vercel', 'project.json');
  const envLocalPath = path.join(DEPLOY_DIR, '.env.local');
  const keepVercel = fs.existsSync(vercelJsonPath) ? fs.readFileSync(vercelJsonPath) : null;
  const keepEnv = fs.existsSync(envLocalPath) ? fs.readFileSync(envLocalPath) : null;

  if (fs.existsSync(DEPLOY_DIR)) {
    try {
      fs.rmSync(DEPLOY_DIR, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
    } catch (e) {
      console.warn('rm .github-pages:', e.message, '— перезаписываем файлы');
      for (const name of fs.readdirSync(DEPLOY_DIR)) {
        const p = path.join(DEPLOY_DIR, name);
        try {
          fs.rmSync(p, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
        } catch (_) {}
      }
    }
  }
  fs.mkdirSync(DEPLOY_DIR, { recursive: true });

  if (keepVercel) {
    fs.mkdirSync(path.join(DEPLOY_DIR, '.vercel'), { recursive: true });
    fs.writeFileSync(path.join(DEPLOY_DIR, '.vercel', 'project.json'), keepVercel);
  }
  if (keepEnv) {
    fs.writeFileSync(path.join(DEPLOY_DIR, '.env.local'), keepEnv);
  }

  writeVersionJson();

  const htmlDir = path.join(DEPLOY_DIR, 'api', 'html');
  const assetDir = path.join(DEPLOY_DIR, 'api', 'assets');
  fs.mkdirSync(htmlDir, { recursive: true });
  fs.mkdirSync(assetDir, { recursive: true });
  for (const name of fs.readdirSync(PUBLIC)) {
    if (name.endsWith('.html')) {
      fs.copyFileSync(path.join(PUBLIC, name), path.join(htmlDir, name));
    }
    if (name === 'version.json' || name === 'paint-bridge.js' || name === 'parent-painter.js' || name === 'portal-worker-url.json' || name === 'field-handler-url.json' || name === 'deal-card-bg.user.js') {
      fs.copyFileSync(path.join(PUBLIC, name), path.join(assetDir, name));
    }
    if (name === 'portal-worker.html') {
      fs.copyFileSync(path.join(PUBLIC, name), path.join(htmlDir, name));
    }
  }

  const assetsSrc = path.join(PUBLIC, 'assets');
  if (fs.existsSync(assetsSrc)) {
    for (const name of fs.readdirSync(assetsSrc)) {
      fs.copyFileSync(path.join(assetsSrc, name), path.join(assetDir, name));
    }
  }

  copyDir(path.join(TEMPLATES, 'api'), path.join(DEPLOY_DIR, 'api'));
  // serve.js перезаписан из templates поверх html/
  fs.copyFileSync(path.join(TEMPLATES, 'api', 'serve.js'), path.join(DEPLOY_DIR, 'api', 'serve.js'));
  for (const name of fs.readdirSync(PUBLIC)) {
    if (name.endsWith('.html')) {
      fs.copyFileSync(path.join(PUBLIC, name), path.join(DEPLOY_DIR, 'api', 'html', name));
    }
    if (name === 'version.json' || name === 'paint-bridge.js' || name === 'parent-painter.js' || name === 'portal-worker-url.json' || name === 'field-handler-url.json' || name === 'deal-card-bg.user.js') {
      fs.copyFileSync(path.join(PUBLIC, name), path.join(DEPLOY_DIR, 'api', 'assets', name));
    }
  }

  fs.copyFileSync(path.join(TEMPLATES, 'vercel.json'), path.join(DEPLOY_DIR, 'vercel.json'));
  fs.copyFileSync(path.join(TEMPLATES, 'package.json'), path.join(DEPLOY_DIR, 'package.json'));
  fs.writeFileSync(
    path.join(DEPLOY_DIR, 'README.md'),
    '# B24 deal-card-bg\n\nХостинг: Vercel (POST для Битрикс24).\n',
  );
  fs.writeFileSync(
    path.join(DEPLOY_DIR, '.gitignore'),
    '.env.local\n.vercel\n',
  );
}

function gitPush() {
  const run = (cmd, args) => {
    const r = spawnSync(cmd, args, { cwd: DEPLOY_DIR, stdio: 'inherit', shell: false });
    if (r.status !== 0) throw new Error(`git ${args.join(' ')} failed (${r.status})`);
  };

  if (!fs.existsSync(path.join(DEPLOY_DIR, '.git'))) {
    run('git', ['init']);
    run('git', ['checkout', '-B', GH_BRANCH]);
    run('git', ['remote', 'add', 'origin', REMOTE]);
  }

  run('git', ['add', '-A']);
  const hasChanges = spawnSync('git', ['diff', '--cached', '--quiet'], { cwd: DEPLOY_DIR });
  if (hasChanges.status !== 0) {
    run('git', ['commit', '-m', 'Deploy deal-card-bg (Vercel + HTML)']);
  }

  run('git', ['push', '-u', 'origin', GH_BRANCH, '--force']);
}

function writeUrls(installUrl) {
  const base = installUrl.replace(/\/install\.html$/, '');
  const urls = {
    install: installUrl,
    fieldHandler: `${base}/field-handler.html`,
    tab: `${base}/tab.html`,
    worker: `${base}/worker.html`,
    app: `${base}/app.html`,
    publishedAt: new Date().toISOString(),
    host: installUrl.includes('vercel.app') ? 'vercel' : 'unknown',
    repo: `${GH_OWNER}/${GH_REPO}`,
  };
  fs.writeFileSync(OUT_STATIC, installUrl, 'utf8');
  fs.writeFileSync(OUT_JSON, JSON.stringify(urls, null, 2));
  return urls;
}

function deployVercel() {
  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const args = ['--yes', 'vercel', 'deploy', '--prod', '--yes', '--name', VERCEL_PROJECT];
  const r = spawnSync(npx, args, { cwd: DEPLOY_DIR, stdio: 'pipe', encoding: 'utf8' });
  const out = (r.stdout || '') + (r.stderr || '');
  const match = out.match(/https:\/\/[a-z0-9-]+\.vercel\.app/i);
  if (r.status !== 0 && !match) {
    throw new Error(out.trim() || `vercel exit ${r.status}`);
  }
  if (match) return `${match[0]}/install.html`;
  throw new Error('Vercel URL не найден в выводе. Запустите: npm run publish:vercel');
}

function printVercelManual() {
  console.log('');
  console.log('=== Vercel (обязательно для Б24) ===');
  console.log('');
  console.log('GitHub Pages не принимает POST → 405 при установке приложения.');
  console.log('');
  console.log('Вариант 1 — CLI:');
  console.log(`  cd "${DEPLOY_DIR}"`);
  console.log('  npx vercel login');
  console.log(`  npx vercel --prod --yes --name ${VERCEL_PROJECT}`);
  console.log('');
  console.log('Вариант 2 — сайт:');
  console.log(`  https://vercel.com/new → Import ${GH_OWNER}/${GH_REPO} → Deploy`);
  console.log('');
  console.log('URL для Б24: https://<ваш-проект>.vercel.app/install.html');
}

function main() {
  console.log(`Сборка и push → ${GH_OWNER}/${GH_REPO} (${GH_BRANCH})…\n`);
  try {
    execSync('node scripts/publish-portal-worker.js', { cwd: ROOT, stdio: 'inherit' });
  } catch (e) {
    console.warn('publish-portal-worker:', e.message || e);
  }
  try {
    execSync('node scripts/publish-field-handler.js', { cwd: ROOT, stdio: 'inherit' });
  } catch (e) {
    console.warn('publish-field-handler:', e.message || e);
  }
  copyDeploy();

  if (hasGit()) {
    try {
      gitPush();
      console.log('Git push OK');
    } catch (e) {
      console.error('Git push:', e.message);
      process.exit(1);
    }
  } else {
    console.log(`Собрано в ${DEPLOY_DIR} — git не найден, загрузите вручную.`);
  }

  let installUrl = null;
  try {
    installUrl = deployVercel();
    console.log('\nVercel deploy OK');
  } catch (e) {
    console.warn('\nVercel:', e.message);
    printVercelManual();
    process.exit(hasGit() ? 0 : 1);
  }

  writeUrls(installUrl);
  console.log('');
  console.log('=== URL для Б24 (Обработчик + Установка) ===');
  console.log(installUrl);
  console.log('');
  console.log('npm run verify');
  console.log('Б24 → Сохранить → Переустановить');
}

if (require.main === module) {
  if (process.env.DEAL_CARD_BG_BUILD_ONLY === '1') {
    syncPublicAssets();
    writeVersionJson();
    copyDeploy();
    console.log('Собрано:', DEPLOY_DIR);
  } else {
    main();
  }
}
