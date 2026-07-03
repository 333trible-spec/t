/**
 * Попытка выставить position через note.document.update — не поддерживается (NOTE_EMPTY_UPDATE).
 * Используйте fix-incident-order.js или публикуйте инциденты в обратном порядке (7 → 1).
import { loadWebhook, reorderIncidentsInFolder } from './lib/b24-note.js';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);

const parentId = Number(args.parent || 74);
const dryRun = Boolean(args['dry-run']);

async function main() {
  const webhook = loadWebhook();
  const result = await reorderIncidentsInFolder(webhook, parentId, 16, { dryRun });

  console.log(dryRun ? 'DRY RUN' : 'APPLIED', 'parentId=', parentId);
  for (const row of result.plan || []) {
    const mark = row.currentPosition === row.newPosition ? '=' : '→';
    console.log(
      `${row.title}: position ${row.currentPosition} ${mark} ${row.newPosition} (id ${row.id})`,
    );
  }
  if (!result.plan?.length) {
    console.log('Нет документов «Инцидент N» в папке');
  }
}

main().catch((e) => {
  console.error(e.message || e);
  if (e.payload) console.error(JSON.stringify(e.payload, null, 2));
  process.exit(1);
});
