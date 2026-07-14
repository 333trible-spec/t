'use strict';

/**
 * Анализ экспорта .bpt (zlib + PHP serialize) для отладки автозапусков и SetField.
 * Использование: node analyze-bpt-export.js path/to/template.bpt
 */

const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const bptPath = process.argv[2];
if (!bptPath) {
  console.error('Usage: node analyze-bpt-export.js <file.bpt>');
  process.exit(1);
}

const text = zlib.inflateSync(fs.readFileSync(bptPath)).toString('utf8');

const auto = text.match(/s:11:"AUTO_EXECUTE";i:(\d+)/);
console.log('File:', path.basename(bptPath));
console.log('AUTO_EXECUTE:', auto ? auto[1] : '?', '(2=on update, 3=create+update)');

function collectSetFields(xml) {
  const out = [];
  const needle = 's:4:"Type";s:16:"SetFieldActivity"';
  let pos = 0;
  while (true) {
    const idx = xml.indexOf(needle, pos);
    if (idx < 0) break;
    const chunk = xml.slice(idx, idx + 6000);
    const act = (chunk.match(/s:9:"Activated";s:1:"([YN])"/) || [])[1];
    const title = (chunk.match(/s:5:"Title";s:\d+:"([^"]*)"/) || [])[1];
    const fields = {};
    const fv = chunk.match(/s:10:"FieldValue";a:\d+:\{([\s\S]*?)\}s:10:"ModifiedBy"/);
    if (fv) {
      const fr = /s:(\d+):"([^"]+)";s:\d+:"([^"]*)"/g;
      let m;
      while ((m = fr.exec(fv[1]))) fields[m[2]] = m[3].slice(0, 80);
    }
    out.push({ act, title, fields, idx });
    pos = idx + needle.length;
  }
  return out;
}

const sets = collectSetFields(text);
const active = sets.filter((s) => s.act === 'Y');
console.log('\nSetField total:', sets.length, 'active:', active.length);

const byField = {};
for (const s of active) {
  for (const f of Object.keys(s.fields)) {
    if (!byField[f]) byField[f] = new Set();
    byField[f].add(s.title || '?');
  }
}
console.log('\n=== Active SetField by field (top 15) ===');
Object.entries(byField)
  .sort((a, b) => b[1].size - a[1].size)
  .slice(0, 15)
  .forEach(([f, titles]) => {
    console.log(f + ' (' + titles.size + 'x):', [...titles].slice(0, 4).join(' | '));
  });

const swNeedle = 's:4:"Type";s:21:"StartWorkflowActivity"';
let swPos = 0;
const swList = [];
while (true) {
  const idx = text.indexOf(swNeedle, swPos);
  if (idx < 0) break;
  const ch = text.slice(idx, idx + 2000);
  const act = (ch.match(/Activated";s:1:"([YN])"/) || [])[1];
  const tid = (ch.match(/TemplateId";s:\d+:"([^"]*)"/) || [])[1];
  swList.push({ act, tid });
  swPos = idx + 10;
}
const activeSw = swList.filter((x) => x.act === 'Y');
const byTpl = {};
activeSw.forEach((x) => { byTpl[x.tid] = (byTpl[x.tid] || 0) + 1; });
console.log('\n=== StartWorkflow (active:', activeSw.length, ') ===');
console.log(byTpl);

const logs = [
  'ID объекта нет', 'ID объекта есть', 'ВЕТКА СУММЫ', 'Коммерция',
  'Новое помещение', 'стадия изменилась', 'АГЕНТСК', 'Считаем сумму',
];
console.log('\n=== Log markers ===');
logs.forEach((l) => console.log(l + ':', text.split(l).length - 1));

const sumBlock = text.indexOf('Считаем сумму');
if (sumBlock >= 0) {
  const sumChunk = text.slice(sumBlock, sumBlock + 120000);
  const sumActive = collectSetFields(sumChunk).filter((s) => s.act === 'Y');
  console.log('\nInside «Считаем сумму» chunk: active SetField =', sumActive.length);
}

const deactivated = sets.filter((s) => s.act === 'N').length;
console.log('\nDeactivated SetField:', deactivated);
