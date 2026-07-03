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

const INCIDENT_2_FORMATTED = `**Формулировки клиентов:** При изменении контакта он удаляется/ Нажимаю сохранить контакт, а он удалился/ Почему при заполнении контакта он удалился?/ Битрикс пишет, что контакт удален

**Описание сценария для повторения ошибки:** При редактировании контакта нажимаю кнопку сохранить и контакт удаляется

**Теги**: \`Б24\`, \`контакты\`, \`контроль дублей\`

**Причина:** Автоматическое объединение дублей контакта

**Решение**: (*Клиент, Интегратор, ПМ*) Сработало автоматическое объединение контактов, найденных по номеру телефона. Данные по обоим контактам были объединены в один с сохранением всей истории. Для дальнейшей работы необходимо использовать новый контакт, который можно найти по номеру телефона
`;

async function main() {
  const wh = loadWebhook();
  const id = 120;

  const res = await fetch(apiUrl(wh, 'note.document.update'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      id,
      fields: { markdown: INCIDENT_2_FORMATTED },
      overwrite: true,
    }),
  });
  const data = await res.json();
  if (data.result?.item) {
    console.log('OK updated document', id);
    console.log(data.result.item.markdown);
  } else {
    console.error(JSON.stringify(data, null, 2));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
