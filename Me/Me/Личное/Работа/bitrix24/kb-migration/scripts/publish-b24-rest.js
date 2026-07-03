/**
 * Публикация инцидентов Б24 (3–7) в БЗ 2.0.
 * node scripts/publish-b24-rest.js [--from=3] [--to=7] [--dry-run]
 */
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { parseB24Export } from './parse-b24.js';
import { b24v3, loadWebhook, listChildren } from './lib/b24-note.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PARENT_ID = 74;
const COLLECTION_ID = 16;

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);

const fromN = Number(args.from || 3);
const toN = Number(args.to || 7);
const dryRun = Boolean(args['dry-run']);

async function findExisting(webhook, title) {
  const children = await listChildren(webhook, COLLECTION_ID, PARENT_ID);
  return children.find((c) => c.title === title) || null;
}

async function publishIncident(webhook, incident, { update = true } = {}) {
  const existing = await findExisting(webhook, incident.title);

  if (existing && update) {
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

  if (existing) {
    return {
      action: 'skipped',
      id: existing.id,
      title: incident.title,
      url: `https://dm-tmn.bitrix24.ru/note/document/${existing.id}/`,
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

async function main() {
  const incidents = parseB24Export();
  const selected = incidents.filter((inc) => inc.order >= fromN && inc.order <= toN);
  if (!selected.length) throw new Error(`Инциденты ${fromN}–${toN} не найдены в B24.txt`);

  mkdirSync(join(root, 'drafts'), { recursive: true });
  for (const inc of selected) {
    writeFileSync(
      join(root, 'drafts', `${inc.title.replace(/[<>:"/\\|?*]/g, '-')}.md`),
      inc.markdown + '\n',
      'utf8',
    );
  }

  if (dryRun) {
    console.log('DRY RUN — черновики в drafts/, публикация пропущена');
    for (const inc of selected) console.log(`  ${inc.order}. ${inc.title}: ${inc.markdown.length} символов`);
    return;
  }

  const webhook = loadWebhook();
  const results = [];

  for (const inc of [...selected].sort((a, b) => b.order - a.order)) {
    const result = await publishIncident(webhook, inc);
    results.push(result);
    console.log(`${result.action}: ${result.title} → ${result.url}`);
  }

  console.log('\nВыравнивание порядка 1…7…');
  const { execSync } = await import('child_process');
  execSync(`node "${join(dirname(fileURLToPath(import.meta.url)), 'fix-incident-order.js')}" --parent=${PARENT_ID}`, {
    stdio: 'inherit',
  });

  console.log('\n=== Итог ===');
  for (const r of results) {
    console.log(`${r.title}: ${r.action} ${r.url}`);
  }
}

main().catch((e) => {
  console.error(e.message || e);
  if (e.payload) console.error(JSON.stringify(e.payload, null, 2));
  process.exit(1);
});
