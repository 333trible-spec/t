'use strict';

const { spawnSync } = require('child_process');
const { normalizeVersion, restoreSnapshot, listVersions } = require('./version-lib');

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

function deploy() {
  const r = spawnSync(
    npx,
    ['--yes', 'vercel', 'deploy', '--prod', '--yes'],
    { cwd: require('./version-lib').ROOT, stdio: 'inherit', shell: process.platform === 'win32' },
  );
  if (r.status !== 0) process.exit(r.status || 1);
}

function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error('Укажите версию: node scripts/version-rollback.js "v 0.5"');
    console.error('Доступные:', listVersions().join(', ') || '—');
    process.exit(1);
  }

  const version = normalizeVersion(arg);
  try {
    const manifest = restoreSnapshot(version);
    console.log('Восстановлено из versions/' + version + '/');
    console.log('Снимок от:', manifest.savedAt);
    deploy();
    console.log('Задеплоен откат: ' + version);
  } catch (e) {
    if (e.message === 'VERSION_NOT_FOUND') {
      console.error('Версия ' + version + ' не найдена в versions/');
      console.error('Доступные:', listVersions().join(', ') || '—');
      process.exit(1);
    }
    throw e;
  }
}

main();
