import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadWebhook() {
  const env = readFileSync(join(root, '.env'), 'utf8');
  const m = env.match(/^B24_KB_WEBHOOK=(.+)$/m);
  if (!m) throw new Error('B24_KB_WEBHOOK not found');
  return m[1].trim();
}

function apiUrl(webhook, method) {
  return webhook.replace('/rest/', '/rest/api/').replace(/\/?$/, '/') + method;
}

async function v3(webhook, method, body = {}) {
  const res = await fetch(apiUrl(webhook, method), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function v2(webhook, method, body = {}) {
  const url = webhook.replace(/\/?$/, '/') + method + '.json';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { status: res.status, data };
}

const TEST_MD = '## Тест\n\nПроверка доступа note.document.add';

async function main() {
  const wh = loadWebhook();

  const profile = await v2(wh, 'profile');
  const scope = await v2(wh, 'scope');
  console.log('=== Пользователь вебхука ===');
  console.log('ID:', profile.data?.result?.ID);
  console.log('Имя:', profile.data?.result?.NAME, profile.data?.result?.LAST_NAME);
  console.log('Админ:', profile.data?.result?.ADMIN);
  console.log('Scopes:', (scope.data?.result || []).join(', '));

  const parent = await v3(wh, 'note.document.get', { id: 36 });
  const item = parent.data?.result?.item;
  console.log('\n=== Родитель document/36 ===');
  if (item) {
    console.log('title:', item.title);
    console.log('collectionId:', item.collectionId);
    console.log('parentId:', item.parentId);
  } else {
    console.log('ERROR:', JSON.stringify(parent.data));
  }

  const collections = await v3(wh, 'note.collection.list', {});
  console.log('\n=== Базы знаний (policyLevel для user вебхука) ===');
  for (const c of collections.data?.result?.items || []) {
    const level =
      c.policyLevel === 'manage' ? 'редактирование OK' :
      c.policyLevel === 'moderate' ? 'админ OK' :
      c.policyLevel === 'view' ? 'только просмотр' :
      c.policyLevel === 'none' ? 'НЕТ доступа на запись' : c.policyLevel;
    console.log(`  [${c.id}] ${c.name} — policyLevel: ${c.policyLevel} (${level})`);
  }

  const tree = await v3(wh, 'note.document.tree.list', { filter: { collectionId: item?.collectionId || 16 } });
  console.log('\n=== Дерево документов (первые 3) ===');
  const nodes = tree.data?.result?.items || tree.data?.result?.tree || [];
  console.log(JSON.stringify(nodes).slice(0, 400) || JSON.stringify(tree.data?.error));

  console.log('\n=== note.document.add (тест) ===');
  const add = await v3(wh, 'note.document.add', {
    fields: {
      collectionId: item?.collectionId || 16,
      parentId: 36,
      title: 'Инцидент 2',
      markdown: TEST_MD,
    },
  });
  if (add.data?.result?.item?.id) {
    console.log('OK — создан документ id:', add.data.result.item.id);
    console.log('URL: https://dm-tmn.bitrix24.ru/note/document/' + add.data.result.item.id + '/');
    const del = await v3(wh, 'note.document.delete', { id: add.data.result.item.id });
    console.log('Тестовый документ удалён:', del.data?.result ?? del.data?.error?.code);
  } else {
    console.log('FAIL HTTP', add.status);
    console.log(JSON.stringify(add.data, null, 2));
  }

  const search = await v3(wh, 'note.document.search.list', {
    filter: { parentId: 36, title: 'Инцидент 2' },
  });
  console.log('\n=== Поиск «Инцидент 2» под document/36 ===');
  console.log(JSON.stringify(search.data?.result?.items || search.data?.error, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
