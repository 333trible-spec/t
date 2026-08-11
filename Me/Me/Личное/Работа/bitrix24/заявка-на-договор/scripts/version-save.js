'use strict';

const { spawnSync } = require('child_process');
const {
  getCurrentVersion,
  snapshotExists,
  saveSnapshot,
  syncVersionJs,
} = require('./version-lib');

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
  const current = getCurrentVersion();
  syncVersionJs(current);

  if (snapshotExists(current)) {
    console.error('Версия ' + current + ' уже сохранена в versions/' + current + '/');
    console.error('Поднимите номер: npm run version:bump (шаг +0.01), затем повторите «апдейт версии».');
    process.exit(2);
  }

  const manifest = saveSnapshot(current);
  console.log('Снимок сохранён: versions/' + current + '/');
  console.log('Дата:', manifest.savedAt);
  deploy();
  console.log('Задеплоено: ' + current);
}

main();
