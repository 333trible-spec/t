'use strict';

const fs = require('fs');
const path = require('path');

const decoded = fs.readFileSync(path.join(__dirname, '..', 'export', 'bp-608-decoded.txt'), 'utf8');
const paramIdx = decoded.indexOf('s:10:"PARAMETERS"');
const paramEnd = decoded.indexOf('s:9:"VARIABLES"', paramIdx);
const chunk = decoded.slice(paramIdx, paramEnd);

const SKIP = new Set(['Options', 'Default', 'Name', 'Type', 'Description', 'Required', 'Multiple']);

function parseOptions(block, type) {
  if (type !== 'select') return null;
  const m = block.match(/s:7:"Options";a:\d+:\{([\s\S]*?)\}s:7:"Default"/);
  if (!m) return null;
  const inner = m[1];
  const opts = [];
  const re = /s:\d+:"((?:[^"\\]|\\.)*)";s:\d+:"((?:[^"\\]|\\.)*)"/g;
  let x;
  while ((x = re.exec(inner)) !== null) {
    const v = x[1];
    if (!opts.includes(v)) opts.push(v);
  }
  return opts.length ? opts : null;
}

const rows = [];
const keyRe = /s:\d+:"([^"]+)";a:7:\{/g;
let m;
while ((m = keyRe.exec(chunk)) !== null) {
  const key = m[1];
  if (SKIP.has(key)) continue;
  const start = m.index;
  const end = chunk.indexOf('};s:', start + 5);
  const block = chunk.slice(start, end > 0 ? end + 1 : start + 12000);
  const labelM = block.match(/s:4:"Name";s:\d+:"([^"]*)"/);
  const typeM = block.match(/s:4:"Type";s:\d+:"([^"]+)"/);
  const reqM = block.match(/s:8:"Required";s:\d+:"([01])"/);
  const multM = block.match(/s:8:"Multiple";s:\d+:"([01])"/);
  const opts = parseOptions(block, typeM ? typeM[1] : 'string');
  rows.push({
    code: key,
    label: labelM ? labelM[1] : key,
    type: typeM ? typeM[1] : 'string',
    required: reqM ? reqM[1] === '1' : false,
    multiple: multM ? multM[1] === '1' : false,
    options: opts,
  });
}

const out = path.join(__dirname, '..', 'api', 'html', 'bp-form-config.js');
const js =
  '/* BP 608 PARAMETERS — из bp-608.bpt, только фронт */\n' +
  'window.BP608_FORM_CONFIG = ' +
  JSON.stringify(rows, null, 2) +
  ';\n';
fs.writeFileSync(out, js, 'utf8');
console.log('Wrote', out, 'fields:', rows.length);
