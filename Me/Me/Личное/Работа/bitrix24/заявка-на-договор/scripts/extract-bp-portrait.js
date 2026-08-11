'use strict';

const fs = require('fs');
const path = require('path');

const text = fs.readFileSync(path.join(__dirname, '..', 'export', 'bp-608-decoded.txt'), 'utf8');

const idx = text.indexOf('Заполняем портрет покупателя');
const chunk = text.slice(idx - 500, idx + 6000);
const portrait = [...chunk.matchAll(/s:\d+:"(UF_CRM_[^"]+)";s:\d+:"([^"]*)"/g)].map((m) => ({
  field: m[1],
  value: m[2],
}));

const templates = [...new Set([...text.matchAll(/\{=Template:([^}]+)\}/g)].map((m) => m[1]))].sort();

const saveFields = [];
const saveRe = /SetFieldActivity[\s\S]*?s:5:"Title";s:\d+:"Сохраняем заявку"[\s\S]*?FieldValue";a:\d+:\{([\s\S]*?)\}s:10:"ModifiedBy"/g;
let m;
while ((m = saveRe.exec(text)) !== null) {
  const block = m[1];
  const pairs = [...block.matchAll(/s:\d+:"([^"]+)";s:\d+:"([^"]*)"/g)].map((x) => ({ field: x[1], value: x[2] }));
  saveFields.push(pairs);
}

const createDealRe = /CreateCrmDealDocumentActivity[\s\S]*?FieldValue";a:\d+:\{([\s\S]*?)\}s:/g;
const createMaps = [];
while ((m = createDealRe.exec(text)) !== null) {
  const pairs = [...m[1].matchAll(/s:\d+:"([^"]+)";s:\d+:"([^"]*)"/g)]
    .filter((x) => x[1].startsWith('UF_CRM') || ['TITLE', 'CATEGORY_ID', 'STAGE_ID', 'ASSIGNED_BY_ID', 'CONTACT_ID'].includes(x[1]))
    .map((x) => ({ field: x[1], value: x[2].slice(0, 80) }));
  createMaps.push(pairs);
}

fs.writeFileSync(
  path.join(__dirname, '..', 'export', 'bp-608-portrait.json'),
  JSON.stringify({ portrait, templates, saveFields, createMaps }, null, 2),
  'utf8'
);

console.log('Portrait fields:', portrait.length);
portrait.forEach((p) => console.log(p.field, '<-', p.value));
console.log('\nTemplates:', templates.join(', '));
console.log('\nSave заявку blocks:', saveFields.length);
console.log('Create deal maps:', createMaps.length);
