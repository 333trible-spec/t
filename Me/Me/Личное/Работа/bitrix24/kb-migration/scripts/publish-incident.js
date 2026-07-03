/**
 * Публикация инцидента в БЗ 2.0 (note/document).
 * REST v3: /rest/api/.../note.document.add
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function loadWebhook() {
  const env = readFileSync(join(root, '.env'), 'utf8');
  const m = env.match(/^B24_KB_WEBHOOK=(.+)$/m);
  if (!m) throw new Error('B24_KB_WEBHOOK not found in .env');
  return m[1].trim();
}

function apiUrl(webhook, method) {
  return webhook.replace('/rest/', '/rest/api/').replace(/\/?$/, '/') + method;
}

async function b24v3(webhook, method, body = {}) {
  const res = await fetch(apiUrl(webhook, method), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

export const INCIDENT_2_MARKDOWN = `**Формулировки клиентов:** При изменении контакта он удаляется/ Нажимаю сохранить контакт, а он удалился/ Почему при заполнении контакта он удалился?/ Битрикс пишет, что контакт удален

**Описание сценария для повторения ошибки:** При редактировании контакта нажимаю кнопку сохранить и контакт удаляется

**Теги**: \`Б24\`, \`контакты\`, \`контроль дублей\`

**Причина:** Автоматическое объединение дублей контакта

**Решение**: (*Клиент, Интегратор, ПМ*) Сработало автоматическое объединение контактов, найденных по номеру телефона. Данные по обоим контактам были объединены в один с сохранением всей истории. Для дальнейшей работы необходимо использовать новый контакт, который можно найти по номеру телефона
`;

const PARENT_DOCUMENT_ID = 74; // папка «Битрикс24» (инциденты Б24)

export async function publishIncident2(webhook) {
  const parent = await b24v3(webhook, 'note.document.get', { id: PARENT_DOCUMENT_ID });
  const collectionId = parent?.result?.item?.collectionId;
  if (!collectionId) {
    throw new Error('Не удалось получить collectionId для document/' + PARENT_DOCUMENT_ID);
  }

  const existing = await b24v3(webhook, 'note.document.search.list', {
    filter: { parentId: PARENT_DOCUMENT_ID, title: 'Инцидент 2' },
  });
  const found = existing?.result?.items?.find((i) => i.title === 'Инцидент 2');
  if (found?.id) {
    const updated = await b24v3(webhook, 'note.document.update', {
      id: found.id,
      fields: { markdown: INCIDENT_2_MARKDOWN },
      overwrite: true,
    });
    return { action: 'updated', id: found.id, data: updated };
  }

  const created = await b24v3(webhook, 'note.document.add', {
    fields: {
      collectionId,
      parentId: PARENT_DOCUMENT_ID,
      title: 'Инцидент 2',
      markdown: INCIDENT_2_MARKDOWN,
    },
  });
  if (created?.error) throw new Error(created.error.code + ': ' + created.error.message);
  return { action: 'created', id: created.result.item.id, data: created };
}

async function main() {
  const webhook = loadWebhook();
  const result = await publishIncident2(webhook);
  console.log(result.action, 'id=', result.id);
  console.log('https://dm-tmn.bitrix24.ru/note/document/' + result.id + '/');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e.message || e);
    process.exit(1);
  });
}
