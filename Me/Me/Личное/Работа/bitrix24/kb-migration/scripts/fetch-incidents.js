import { readFileSync, writeFileSync } from 'fs';
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
  return res.json();
}

async function findByTitle(webhook, parentId, title) {
  const tree = await v3(webhook, 'note.document.tree.list', {
    filter: { parentId },
  });
  const items = tree.result?.items || [];
  const hit = items.find((i) => i.title === title);
  if (hit) return hit.id;
  // search under parent 74
  for (const item of items) {
    const child = await v3(webhook, 'note.document.get', { id: item.id });
    if (child.result?.item?.title === title) return item.id;
  }
  return null;
}

async function main() {
  const wh = loadWebhook();
  const parentId = 74;

  // list children of 74
  const tree = await v3(wh, 'note.document.tree.list', { filter: { parentId } });
  console.log('children of 74:', JSON.stringify(tree.result?.items || tree, null, 2));

  let id1 = null;
  let id2 = null;
  for (const item of tree.result?.items || []) {
    if (item.title === 'Инцидент 1') id1 = item.id;
    if (item.title === 'Инцидент 2') id2 = item.id;
  }
  if (!id2) id2 = 120;

  if (!id1) {
    // search in collection
    const search = await v3(wh, 'note.document.search.list', {
      query: 'Инцидент 1',
      filter: { parentId },
    });
    console.log('search:', JSON.stringify(search, null, 2));
    id1 = search.result?.items?.find((i) => i.title === 'Инцидент 1')?.id;
  }

  console.log('id1=', id1, 'id2=', id2);
  if (!id1 || !id2) {
    process.exit(1);
  }

  const [d1, d2] = await Promise.all([
    v3(wh, 'note.document.get', { id: id1 }),
    v3(wh, 'note.document.get', { id: id2 }),
  ]);

  writeFileSync(join(root, 'export', 'incident-1-kb.md'), d1.result?.item?.markdown || '', 'utf8');
  writeFileSync(join(root, 'export', 'incident-2-kb.md'), d2.result?.item?.markdown || '', 'utf8');
  console.log('saved export/incident-1-kb.md and incident-2-kb.md');
}

main().catch(console.error);
