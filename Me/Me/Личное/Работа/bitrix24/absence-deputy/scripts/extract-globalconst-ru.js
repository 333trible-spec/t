'use strict';

const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const bptPath = process.argv[2];
const buf = fs.readFileSync(bptPath);
let text;
try {
  text = zlib.inflateSync(buf).toString('utf8');
} catch {
  text = buf.toString('utf8');
}

const patterns = [
  /\{\{Константы глобальные:\s*([^}]+)\}\}/g,
  /\{\{Global constants:\s*([^}]+)\}\}/gi,
  /Константы глобальные:\s*([^}\n\r"]+)/g,
  /\{=GlobalConst:([^}]+)\}/g,
];

const found = new Map();
for (const re of patterns) {
  let m;
  while ((m = re.exec(text))) {
    const key = m[0];
    const name = (m[1] || '').trim();
    if (!found.has(key)) found.set(key, { raw: key, name, count: 0 });
    found.get(key).count += 1;
  }
}

const needles = [
  'Константы глобальные',
  'Global constants',
  'GlobalConst',
  'МОП НДР',
  'HR кадры',
];

const hits = {};
for (const n of needles) {
  const idx = text.indexOf(n);
  hits[n] = idx;
  if (idx >= 0) {
    hits[n + '_snippet'] = text.slice(Math.max(0, idx - 80), idx + 120).replace(/\s+/g, ' ');
  }
}

const out = {
  file: path.basename(bptPath),
  decodedBytes: text.length,
  matches: [...found.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ru')),
  uniqueNames: [...new Set([...found.values()].map((x) => x.name).filter(Boolean))],
  needleHits: hits,
};

const outPath = path.join(path.dirname(bptPath), 'bp-2784-globalconst-ru.json');
fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
console.log(JSON.stringify(out, null, 2));
