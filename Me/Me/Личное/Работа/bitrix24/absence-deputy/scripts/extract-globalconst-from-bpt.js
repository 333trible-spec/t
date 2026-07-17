'use strict';

const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const bptPath = process.argv[2];
if (!bptPath) {
  console.error('Usage: node extract-globalconst-from-bpt.js <file.bpt>');
  process.exit(1);
}

const buf = fs.readFileSync(bptPath);
let text;
try {
  text = zlib.inflateSync(buf).toString('utf8');
} catch {
  text = buf.toString('utf8');
}

const counts = new Map();
const re = /\{=GlobalConst:([^}]+)\}/g;
let m;
while ((m = re.exec(text))) {
  const id = m[1];
  counts.set(id, (counts.get(id) || 0) + 1);
}

// Also catch bare references without braces
const re2 = /GlobalConst:([A-Za-z0-9_]+)/g;
while ((m = re2.exec(text))) {
  const id = m[1];
  counts.set(id, (counts.get(id) || 0) + 1);
}

const list = [...counts.entries()]
  .map(([id, count]) => ({ id, count }))
  .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id));

console.log(JSON.stringify({
  file: path.basename(bptPath),
  decodedBytes: text.length,
  unique: list.length,
  constants: list,
}, null, 2));
