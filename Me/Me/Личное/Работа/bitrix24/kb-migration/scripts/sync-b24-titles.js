/**
 * Синхронизация заголовков инцидентов Б24 из Google Doc → БЗ (папка 74).
 * Сопоставление по порядку в дереве (position по убыванию).
 *
 * node scripts/sync-b24-titles.js [--dry-run]
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { b24v3, loadWebhook, listChildren } from './lib/b24-note.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PARENT_ID = 74;
const dryRun = process.argv.includes('--dry-run');

function parseB24Titles(filePath = join(root, 'export', 'B24.txt')) {
  const text = readFileSync(filePath, 'utf8');
  const afterTemplate = text.split(/\n_{10,}\s*\n/).slice(1).join('\n');
  const lines = afterTemplate.split('\n');
  const titles = [];

  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i].trim();
    const next = lines[i + 1].trim();
    if (!line) continue;
    if (/^Формулировки клиентов/i.test(next)) {
      titles.push(line);
    }
  }

  return titles;
}

async function main() {
  const driveTitles = parseB24Titles();
  const webhook = loadWebhook();
  const kbDocs = (await listChildren(webhook, 16, PARENT_ID)).sort((a, b) => b.position - a.position);

  if (driveTitles.length !== kbDocs.length) {
    console.warn(
      `Внимание: в Drive ${driveTitles.length} инцидентов, в БЗ ${kbDocs.length} документов — сопоставление по порядку`,
    );
  }

  const pairs = [];
  const n = Math.min(driveTitles.length, kbDocs.length);
  for (let i = 0; i < n; i++) {
    pairs.push({
      id: kbDocs[i].id,
      oldTitle: kbDocs[i].title,
      newTitle: driveTitles[i],
      position: kbDocs[i].position,
    });
  }

  console.log(dryRun ? 'DRY RUN' : 'SYNC', `— ${pairs.length} документов\n`);

  for (const p of pairs) {
    const mark = p.oldTitle === p.newTitle ? '=' : '→';
    console.log(`${p.oldTitle} ${mark} ${p.newTitle} (id ${p.id})`);
    if (p.oldTitle === p.newTitle) continue;
    if (!dryRun) {
      await b24v3(webhook, 'note.document.update', {
        id: p.id,
        fields: { title: p.newTitle },
      });
    }
  }
}

main().catch((e) => {
  console.error(e.message || e);
  if (e.payload) console.error(JSON.stringify(e.payload, null, 2));
  process.exit(1);
});
