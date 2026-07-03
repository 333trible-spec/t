/**
 * Исправляет порядок «Инцидент 1, 2, 3…» в папке БЗ.
 *
 * REST API не принимает fields.position (NOTE_EMPTY_UPDATE).
 * Обход: пересоздать документы в порядке Nmax → 1 — у более раннего номера position выше.
 *
 * node scripts/fix-incident-order.js [--parent=74] [--dry-run]
 */
import { b24v3, loadWebhook, listChildren } from './lib/b24-note.js';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);

const parentId = Number(args.parent || 74);
const dryRun = Boolean(args['dry-run']);

async function recreateDocument(webhook, { id, collectionId, parentId, title }) {
  const doc = await b24v3(webhook, 'note.document.get', { id });
  const item = doc.result?.item;
  if (!item) throw new Error(`document ${id} not found`);

  await b24v3(webhook, 'note.document.delete', { id });

  const created = await b24v3(webhook, 'note.document.add', {
    fields: {
      collectionId: collectionId || item.collectionId,
      parentId,
      title: title || item.title,
      markdown: item.markdown,
    },
  });

  return {
    oldId: id,
    newId: created.result.item.id,
    title: created.result.item.title,
    position: created.result.item.position,
    url: `https://dm-tmn.bitrix24.ru/note/document/${created.result.item.id}/`,
  };
}

async function main() {
  const webhook = loadWebhook();
  const children = await listChildren(webhook, 16, parentId);
  const incidents = children
    .filter((c) => c.incidentNumber != null)
    .sort((a, b) => a.incidentNumber - b.incidentNumber);

  if (!incidents.length) {
    console.log('Нет инцидентов в папке', parentId);
    return;
  }

  const maxN = incidents[incidents.length - 1].incidentNumber;
  const toRecreate = incidents.filter((c) => c.incidentNumber < maxN).sort((a, b) => b.incidentNumber - a.incidentNumber);

  if (!toRecreate.length) {
    console.log('Один инцидент — порядок менять не нужно');
    return;
  }

  console.log(
    dryRun ? 'DRY RUN — пересоздать:' : 'Пересоздаём:',
    toRecreate.map((i) => i.title).join(' → '),
    `(чтобы «Инцидент 1…${maxN}» шли сверху вниз)`,
  );

  const recreated = [];
  for (const doc of toRecreate) {
    if (dryRun) {
      console.log(`  ${doc.title} (id ${doc.id}) — пересоздать`);
      continue;
    }
    const result = await recreateDocument(webhook, {
      id: doc.id,
      parentId,
      title: doc.title,
    });
    recreated.push(result);
    console.log(`${result.title}: ${result.oldId} → ${result.newId} (position ${result.position})`);
    console.log(result.url);
  }

  if (!dryRun && recreated.length) {
    const verify = await listChildren(webhook, 16, parentId);
    console.log(
      'Порядок в дереве:',
      verify
        .filter((c) => c.incidentNumber != null)
        .sort((a, b) => b.position - a.position)
        .map((c) => `${c.title} (${c.position})`)
        .join(', '),
    );
  }
}

main().catch((e) => {
  console.error(e.message || e);
  if (e.payload) console.error(JSON.stringify(e.payload, null, 2));
  process.exit(1);
});
