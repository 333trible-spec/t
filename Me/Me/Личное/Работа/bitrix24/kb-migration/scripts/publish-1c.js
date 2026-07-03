/**
 * Публикация инцидентов 1С в БЗ 2.0 (папка document/76).
 * node scripts/publish-1c.js [--dry-run]
 */
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { parse1CExport } from './parse-1c.js';
import { b24v3, loadWebhook, listChildren } from './lib/b24-note.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PARENT_ID = 76;
const COLLECTION_ID = 16;

const dryRun = process.argv.includes('--dry-run');

async function findExisting(webhook, title) {
  const children = await listChildren(webhook, COLLECTION_ID, PARENT_ID);
  return children.find((c) => c.title === title) || null;
}

async function publishIncident(webhook, incident) {
  const existing = await findExisting(webhook, incident.title);

  if (existing) {
    const updated = await b24v3(webhook, 'note.document.update', {
      id: existing.id,
      fields: { markdown: incident.markdown },
      overwrite: true,
    });
    return {
      action: 'updated',
      id: updated.result.item.id,
      title: incident.title,
      url: `https://dm-tmn.bitrix24.ru/note/document/${updated.result.item.id}/`,
    };
  }

  const created = await b24v3(webhook, 'note.document.add', {
    fields: {
      collectionId: COLLECTION_ID,
      parentId: PARENT_ID,
      title: incident.title,
      markdown: incident.markdown,
    },
  });

  return {
    action: 'created',
    id: created.result.item.id,
    title: incident.title,
    url: `https://dm-tmn.bitrix24.ru/note/document/${created.result.item.id}/`,
  };
}

/** Пересоздаёт все кроме последнего в обратном порядке — чтобы порядок в файле совпал с деревом. */
async function fixNamedOrder(webhook, incidents) {
  const children = await listChildren(webhook, COLLECTION_ID, PARENT_ID);
  const byTitle = new Map(children.map((c) => [c.title, c]));
  const ordered = [...incidents].sort((a, b) => a.order - b.order);
  const toRecreate = ordered.slice(0, -1).reverse();

  for (const inc of toRecreate) {
    const current = byTitle.get(inc.title);
    if (!current) continue;

    const doc = await b24v3(webhook, 'note.document.get', { id: current.id });
    const item = doc.result.item;
    await b24v3(webhook, 'note.document.delete', { id: current.id });
    const created = await b24v3(webhook, 'note.document.add', {
      fields: {
        collectionId: COLLECTION_ID,
        parentId: PARENT_ID,
        title: item.title,
        markdown: item.markdown,
      },
    });
    byTitle.set(inc.title, { id: created.result.item.id, title: inc.title, position: created.result.item.position });
    console.log(`  порядок: ${inc.title} → id ${created.result.item.id}`);
  }
}

function safeFileName(title) {
  return title.replace(/[<>:"/\\|?*]/g, '-').slice(0, 80);
}

async function main() {
  const incidents = parse1CExport();
  if (!incidents.length) throw new Error('Инциденты не найдены в export/1C.txt');

  mkdirSync(join(root, 'drafts', '1C'), { recursive: true });
  for (const inc of incidents) {
    writeFileSync(join(root, 'drafts', '1C', `${safeFileName(inc.title)}.md`), inc.markdown + '\n', 'utf8');
  }

  if (dryRun) {
    console.log('DRY RUN — черновики в drafts/1C/');
    for (const inc of incidents) console.log(`  ${inc.order}. ${inc.title} (${inc.markdown.length} симв.)`);
    return;
  }

  const webhook = loadWebhook();
  const results = [];

  for (const inc of [...incidents].sort((a, b) => b.order - a.order)) {
    const result = await publishIncident(webhook, inc);
    results.push(result);
    console.log(`${result.action}: ${result.title} → ${result.url}`);
  }

  console.log('\nВыравнивание порядка…');
  await fixNamedOrder(webhook, incidents);

  const verify = await listChildren(webhook, COLLECTION_ID, PARENT_ID);
  console.log(
    'Порядок в дереве:',
    verify
      .sort((a, b) => b.position - a.position)
      .map((c) => c.title)
      .join(' → '),
  );
}

main().catch((e) => {
  console.error(e.message || e);
  if (e.payload) console.error(JSON.stringify(e.payload, null, 2));
  process.exit(1);
});
