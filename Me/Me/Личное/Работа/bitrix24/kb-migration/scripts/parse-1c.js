/**
 * Парсинг export/1C.txt → markdown для БЗ 2.0.
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { parseIncidentBody } from './lib/parse-incident.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

export function parse1CExport(filePath = join(root, 'export', '1C.txt')) {
  const text = readFileSync(filePath, 'utf8');
  const blocks = text
    .split(/\n_{10,}\s*\n/)
    .map((b) => b.trim())
    .filter((b) => /Формулировки клиентов/i.test(b));

  const incidents = [];
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const lines = block.split('\n');
    const formIdx = lines.findIndex((l) => /^Формулировки клиентов/i.test(l.trim()));
    const title = lines
      .slice(0, formIdx)
      .map((l) => l.trim())
      .filter(Boolean)
      .join(' ')
      .trim();
    const body = lines.slice(formIdx).join('\n');
    if (!title || !body) continue;
    if (/шаблон/i.test(title) || /скопируйте сообщение от клиента/i.test(body)) continue;
    incidents.push(parseIncidentBody(title, body, { order: incidents.length + 1 }));
  }

  return incidents;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const inc of parse1CExport()) {
    console.log('===', inc.title, `(order ${inc.order}) ===`);
    console.log(inc.markdown.slice(0, 500) + '...\n');
  }
}
