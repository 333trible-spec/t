'use strict';

const fs = require('fs');
const path = require('path');

const text = fs.readFileSync(path.join(__dirname, '..', 'export', 'bp-608-decoded.txt'), 'utf8');

// fieldcondition blocks with parent branch title (rough: Title before fieldcondition)
const branches = [];
const branchRe = /s:5:"Title";s:\d+:"([^"]*)".*?s:14:"fieldcondition";a:\d+:\{((?:i:\d+;a:4:\{[^}]+\};?)+)\}/gs;
let m;
while ((m = branchRe.exec(text)) !== null) {
  const title = m[1];
  const inner = m[2];
  const conds = [];
  const cRe = /i:\d+;a:4:\{i:0;s:\d+:"([^"]+)";i:1;s:\d+:"([^"]+)";i:2;s:\d+:"([^"]*)";i:3;s:\d+:"[^"]*";?\}/g;
  let c;
  while ((c = cRe.exec(inner)) !== null) {
    conds.push({ field: c[1], op: c[2], value: c[3] });
  }
  if (conds.length) branches.push({ title, conds });
}

// Template parameters
const params = [];
const paramRe = /s:5:"Name";s:\d+:"([^"]+)";s:5:"Title";s:\d+:"([^"]*)";s:4:"Type";s:\d+:"([^"]+)"/g;
while ((m = paramRe.exec(text)) !== null) {
  params.push({ name: m[1], title: m[2], type: m[3] });
}

// CrmGenerateEntityDocument - template id
const docs = [...text.matchAll(/CrmGenerateEntityDocumentActivity/g)].length;

// All SetField with more fields - broader regex
const allSet = new Map();
const setRe = /s:10:"FieldValue";a:\d+:\{((?:s:\d+:"[^"]+";s:\d+:"[^"]*";)+)\}/g;
while ((m = setRe.exec(text)) !== null) {
  const block = m[1];
  const kvRe = /s:\d+:"([^"]+)";s:\d+:"([^"]*)"/g;
  let kv;
  while ((kv = kvRe.exec(block)) !== null) {
    const field = kv[1];
    const val = kv[2];
    if (!allSet.has(field)) allSet.set(field, []);
    allSet.get(field).push(val.slice(0, 120));
  }
}

const out = { branches, params, docs, allSet: Object.fromEntries(allSet) };
const outPath = path.join(__dirname, '..', 'export', 'bp-608-conditions.json');
fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
console.log('Branches:', branches.length);
branches.forEach((b) => console.log('-', b.title, JSON.stringify(b.conds)));
console.log('Params:', params.length);
params.forEach((p) => console.log(p.name, '|', p.title, '|', p.type));
console.log('SetField keys:', allSet.size);
