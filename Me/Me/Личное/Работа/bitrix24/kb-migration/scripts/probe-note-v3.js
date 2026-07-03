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

function apiWebhook(webhook) {
  return webhook.replace('/rest/', '/rest/api/');
}

async function b24v3(webhook, method, body = {}) {
  const url = apiWebhook(webhook).replace(/\/?$/, '/') + method;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { status: res.status, data };
}

const MARKDOWN = `## Формулировки клиентов

- При изменении контакта он удаляется
- Нажимаю сохранить контакт, а он удалился
- Почему при заполнении контакта он удалился?
- Битрикс пишет, что контакт удален

## Описание сценария

При редактировании контакта нажимаю кнопку сохранить и контакт удаляется

## Теги

Б24, контакты, контроль дублей

## Причина

Автоматическое объединение дублей контакта

## Решение 1

**Кто:** Клиент, Интегратор, ПМ

Сработало автоматическое объединение контактов, найденных по номеру телефона. Данные по обоим контактам были объединены в один с сохранением всей истории. Для дальнейшей работы необходимо использовать новый контакт, который можно найти по номеру телефона

## Связанные материалы

- Инцидент 1
`;

async function main() {
  const webhook = loadWebhook();
  console.log('API base:', apiWebhook(webhook).replace(/\/\d+\/[^/]+\/$/, '/***/'));

  const parent = await b24v3(webhook, 'note.document.get', { id: 36 });
  console.log('parent 36:', JSON.stringify(parent.data, null, 2).slice(0, 800));

  const collections = await b24v3(webhook, 'note.collection.list', {});
  console.log('collections:', JSON.stringify(collections.data, null, 2).slice(0, 600));

  const collectionId =
    parent.data?.result?.item?.collectionId ??
    collections.data?.result?.items?.[0]?.id;

  if (!collectionId) {
    console.error('collectionId not resolved');
    process.exit(1);
  }

  const add = await b24v3(webhook, 'note.document.add', {
    fields: {
      collectionId,
      parentId: 36,
      title: 'Инцидент 2',
      markdown: MARKDOWN,
    },
  });
  console.log('add result:', JSON.stringify(add.data, null, 2));

  if (add.data?.result?.item?.id) {
    console.log('SUCCESS document id:', add.data.result.item.id);
    console.log('URL: https://dm-tmn.bitrix24.ru/note/document/' + add.data.result.item.id + '/');
  } else {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
