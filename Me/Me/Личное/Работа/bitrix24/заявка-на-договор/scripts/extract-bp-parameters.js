'use strict';

const fs = require('fs');
const path = require('path');

const decoded = fs.readFileSync(path.join(__dirname, '..', 'export', 'bp-608-decoded.txt'), 'utf8');
const idx = decoded.indexOf('s:10:"PARAMETERS"');
const chunk = decoded.slice(idx, idx + 80000);
fs.writeFileSync(path.join(__dirname, '..', 'export', 'bp-608-parameters-snippet.txt'), chunk.slice(0, 15000), 'utf8');

// Bitrix BP param: Name, Title, Type, Required, Multiple, Options...
const re = /s:4:"Name";s:\d+:"([^"]+)";s:5:"Title";s:\d+:"([^"]*)";s:4:"Type";s:\d+:"([^"]+)";s:8:"Required";s:\d+:"([YN])"/g;
const params = [];
let m;
while ((m = re.exec(chunk)) !== null) {
  params.push({ name: m[1], title: m[2], type: m[3], required: m[4] === 'Y' });
}

const out = path.join(__dirname, '..', 'export', 'bp-608-parameters.json');
fs.writeFileSync(out, JSON.stringify(params, null, 2), 'utf8');
console.log('Found', params.length);
params.forEach((p) => console.log(p.name, p.title, p.type, p.required ? 'ДА' : 'нет'));
