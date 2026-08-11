'use strict';

const fs = require('fs');
const path = require('path');

const decoded = path.join(__dirname, '..', 'export', 'bp-608-decoded.txt');
const text = fs.readFileSync(decoded, 'utf8');

const setFields = new Map();
const setBlockRe = /s:10:"FieldValue";a:\d+:\{([^;]+(?:;[^;]+)*?)\}s:10:"ModifiedBy"/g;
let m;
while ((m = setBlockRe.exec(text)) !== null) {
  const block = m[1];
  const kvRe = /s:\d+:"(UF_CRM_[0-9]+|STAGE_ID|CATEGORY_ID|ASSIGNED_BY_ID|TITLE|OPPORTUNITY|CONTACT_ID|COMPANY_ID)";s:\d+:"([^"]*)"/g;
  let kv;
  while ((kv = kvRe.exec(block)) !== null) {
    const field = kv[1];
    if (!setFields.has(field)) setFields.set(field, new Set());
    const val = kv[2].slice(0, 80);
    if (val) setFields.get(field).add(val);
  }
}

const condFields = new Map();
const condRe = /s:14:"fieldcondition";a:\d+:\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/g;
while ((m = condRe.exec(text)) !== null) {
  const inner = m[1];
  const fRe = /i:\d+;a:4:\{i:0;s:\d+:"([^"]+)";i:1;s:\d+:"([^"]+)"/g;
  let f;
  while ((f = fRe.exec(inner)) !== null) {
    if (!condFields.has(f[1])) condFields.set(f[1], new Set());
    condFields.get(f[1]).add(f[2]);
  }
}

const docReads = new Map();
const docRe = /\{=Document:([^}]+)\}/g;
while ((m = docRe.exec(text)) !== null) {
  docReads.set(m[1], (docReads.get(m[1]) || 0) + 1);
}

const allUf = [...new Set([...text.matchAll(/UF_CRM_[0-9]+/g)].map((x) => x[0]))].sort();

const out = {
  setFieldCount: setFields.size,
  conditionFields: Object.fromEntries([...condFields].map(([k, v]) => [k, [...v]])),
  setFields: Object.fromEntries(
    [...setFields.entries()].map(([k, v]) => [k, [...v]])
  ),
  documentReads: Object.fromEntries(
    [...docReads.entries()].sort((a, b) => b[1] - a[1])
  ),
  allUfCount: allUf.length,
  allUf,
};

const outPath = path.join(__dirname, '..', 'export', 'bp-608-fields-usage.json');
fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
console.log('Wrote', outPath);
console.log('SetField:', setFields.size, 'UF total mentions:', allUf.length);
console.log('Conditions:', [...condFields.keys()].join(', '));
