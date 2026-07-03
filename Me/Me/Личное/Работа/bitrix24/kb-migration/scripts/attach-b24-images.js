/**
 * Прикрепляет изображения из Google Doc Б24 к статьям в БЗ.
 * node scripts/attach-b24-images.js [--dry-run]
 */
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { b24v3, loadWebhook, listChildren } from './lib/b24-note.js';

const GOOGLE_DOC_ID = '1_tJp3soURnrTzYmD38eQmQ73n_y_O1Nuv--HGoZdpNs';
const PARENT_ID = 74;
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dryRun = process.argv.includes('--dry-run');

const TITLES = [
  'Не сохраняется контакт',
  'Удаляется контакт',
  'Пропавшее поле',
  'Поиск звонка',
  'Пропавшее агентство',
  'Нет доступа в приложение',
  'Не создаётся контрагент',
];

function decodeHtml(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function findTitlePositions(html) {
  const positions = [];
  const h1Re = /<h1[^>]*>[\s\S]*?<\/h1>/gi;
  let m;
  while ((m = h1Re.exec(html)) !== null) {
    const text = decodeHtml(m[0].replace(/<[^>]+>/g, '')).trim();
    if (TITLES.includes(text)) {
      positions.push({ title: text, idx: m.index });
    }
  }
  return positions.sort((a, b) => a.idx - b.idx);
}

function extractImages(html) {
  const re = /<img[^>]+src="(data:image\/([^;]+);base64,([^"]+))"[^>]*>/g;
  const images = [];
  let m;
  while ((m = re.exec(html)) !== null) {
    images.push({
      index: m.index,
      mime: m[2],
      base64: m[3],
      ext: m[2] === 'png' ? 'png' : m[2] === 'jpeg' ? 'jpg' : m[2],
    });
  }
  return images;
}

function incidentForImage(imageIndex, titlePositions) {
  for (let i = titlePositions.length - 1; i >= 0; i--) {
    if (titlePositions[i].idx < imageIndex) return titlePositions[i].title;
  }
  return null;
}

function insertImageAfterFirstSolution(markdown, assetMarkdown) {
  if (markdown.includes(assetMarkdown)) return markdown;

  const lines = markdown.split('\n');
  let firstSolutionLine = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^\*\*Решение/.test(lines[i])) {
      firstSolutionLine = i;
      break;
    }
  }

  if (firstSolutionLine >= 0) {
    let end = lines.length;
    for (let i = firstSolutionLine + 1; i < lines.length; i++) {
      if (/^\*\*/.test(lines[i])) {
        end = i;
        break;
      }
    }
    const out = [...lines.slice(0, end), '', assetMarkdown, ...lines.slice(end)];
    return out.join('\n').trim();
  }

  return `${markdown.trim()}\n\n${assetMarkdown}`;
}

async function fetchHtml() {
  const url = `https://docs.google.com/document/d/${GOOGLE_DOC_ID}/export?format=html`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTML export failed: ${res.status}`);
  return res.text();
}

async function main() {
  const html = await fetchHtml();
  const titlePositions = findTitlePositions(html);
  const images = extractImages(html);

  console.log(`HTML: ${html.length} bytes, titles: ${titlePositions.length}, images: ${images.length}\n`);

  const byTitle = new Map();
  for (const img of images) {
    const title = incidentForImage(img.index, titlePositions);
    if (!title) {
      console.warn('Пропуск изображения без раздела, index', img.index);
      continue;
    }
    if (!byTitle.has(title)) byTitle.set(title, []);
    byTitle.get(title).push(img);
  }

  for (const [title, imgs] of byTitle) {
    console.log(`${title}: ${imgs.length} изображений`);
  }

  const webhook = loadWebhook();
  const kbDocs = await listChildren(webhook, 16, PARENT_ID);
  const docByTitle = new Map(kbDocs.map((d) => [d.title, d]));

  mkdirSync(join(root, 'export', 'images'), { recursive: true });

  for (const [title, imgs] of byTitle) {
    const doc = docByTitle.get(title);
    if (!doc) {
      console.error(`Нет документа в БЗ: ${title}`);
      continue;
    }

    const full = await b24v3(webhook, 'note.document.get', { id: doc.id });
    let markdown = full.result?.item?.markdown || '';
    let changed = false;

    for (let i = 0; i < imgs.length; i++) {
      const img = imgs[i];
      const fileName = `${title.replace(/[<>:"/\\|?*]/g, '-')}-${i + 1}.${img.ext}`;
      writeFileSync(join(root, 'export', 'images', fileName), Buffer.from(img.base64, 'base64'));

      if (dryRun) {
        console.log(`DRY RUN upload ${fileName} → document ${doc.id} (${title})`);
        continue;
      }

      const uploaded = await b24v3(webhook, 'note.file.add', {
        documentId: doc.id,
        fileName,
        fileContent: img.base64,
      });

      const asset = uploaded.result?.item?.assetMarkdown;
      if (!asset) throw new Error(`No assetMarkdown for ${fileName}`);

      const before = markdown;
      markdown = insertImageAfterFirstSolution(markdown, asset);
      if (markdown !== before) changed = true;
      console.log(`  + ${fileName} → ${asset}`);
    }

    if (!dryRun && changed) {
      await b24v3(webhook, 'note.document.update', {
        id: doc.id,
        fields: { markdown },
        overwrite: true,
      });
      console.log(`✓ обновлён ${title} (id ${doc.id})`);
    }
  }
}

main().catch((e) => {
  console.error(e.message || e);
  if (e.payload) console.error(JSON.stringify(e.payload, null, 2));
  process.exit(1);
});
