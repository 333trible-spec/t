'use strict';

/**
 * Стабильный хостинг: один URL навсегда, POST для Б24, ПК не нужен.
 * npm run deploy:stable
 */
const { spawnSync } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const run = (script) => {
  console.log(`\n>>> node scripts/${script}\n`);
  const r = spawnSync('node', [path.join(__dirname, script)], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: false,
  });
  if (r.status !== 0) process.exit(r.status || 1);
};

console.log('=== Стабильный деплой (Vercel) ===\n');
run('publish-github-pages.js');
run('publish-vercel.js');
console.log('\n=== Готово ===');
console.log('1. npm run verify');
console.log('2. Б24 → URL из вывода → Сохранить → Переустановить (один раз)');
console.log('3. npm run app:stop — локальный туннель больше не нужен');
