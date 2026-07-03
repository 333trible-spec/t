import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { INCIDENT_2_MARKDOWN } from './publish-incident.js';

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
  return res.json();
}

const DOC_ID = 118;
const NEW_PARENT_ID = 74;

async function main() {
  const wh = loadWebhook();

  const [doc118, parent74] = await Promise.all([
    v3(wh, 'note.document.get', { id: DOC_ID }),
    v3(wh, 'note.document.get', { id: NEW_PARENT_ID }),
  ]);

  console.log('118:', doc118.result?.item?.title, 'parentId=', doc118.result?.item?.parentId);
  console.log('74:', parent74.result?.item?.title, 'collectionId=', parent74.result?.item?.collectionId);

  const collectionId = parent74.result?.item?.collectionId;
  if (!collectionId) {
    console.error('parent 74 not found');
    process.exit(1);
  }

  // try move via update parentId
  const moveTry = await v3(wh, 'note.document.update', {
    id: DOC_ID,
    fields: { parentId: NEW_PARENT_ID },
  });
  if (moveTry.result?.item?.parentId === NEW_PARENT_ID) {
    console.log('MOVED via update, parentId=', moveTry.result.item.parentId);
    return;
  }
  console.log('update parentId:', JSON.stringify(moveTry.error || moveTry.result?.item));

  // try note.document.move
  const moveMethod = await v3(wh, 'note.document.move', {
    id: DOC_ID,
    parentId: NEW_PARENT_ID,
  });
  if (moveMethod.result?.item?.parentId === NEW_PARENT_ID) {
    console.log('MOVED via note.document.move');
    return;
  }
  console.log('move method:', JSON.stringify(moveMethod.error || moveMethod.result).slice(0, 300));

  // recreate: delete + add under 74
  const markdown = doc118.result?.item?.markdown || INCIDENT_2_MARKDOWN;
  const title = doc118.result?.item?.title || 'Инцидент 2';

  await v3(wh, 'note.document.delete', { id: DOC_ID });
  console.log('deleted', DOC_ID);

  const created = await v3(wh, 'note.document.add', {
    fields: {
      collectionId,
      parentId: NEW_PARENT_ID,
      title,
      markdown,
    },
  });

  if (created.result?.item?.id) {
    console.log('CREATED', created.result.item.id, 'under parent', NEW_PARENT_ID);
    console.log('https://dm-tmn.bitrix24.ru/note/document/' + created.result.item.id + '/');
  } else {
    console.error(JSON.stringify(created, null, 2));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
