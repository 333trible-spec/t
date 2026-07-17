'use strict';

const fs = require('fs');
const path = require('path');

const decodedPath = process.argv[2];
const text = fs.readFileSync(decodedPath, 'utf8');

const types = {};
for (const m of text.matchAll(/s:4:"Type";s:\d+:"([^"]+)"/g)) {
  types[m[1]] = (types[m[1]] || 0) + 1;
}

const exprs = [...text.matchAll(/\{=[^}\n\r]{1,160}\}/g)].map((m) => m[0]);
const exprFreq = {};
for (const e of exprs) exprFreq[e] = (exprFreq[e] || 0) + 1;

const needles = [
  'GlobalConst',
  'GlobalVar',
  'Constant',
  'Const',
  'A62638_89551_10304_32527',
  'Технический',
  'Директор продаж',
  'ModifyConstant',
  'SetConstant',
  'GlobalConstant',
];

const found = {};
for (const n of needles) {
  found[n] = text.includes(n) ? text.indexOf(n) : -1;
}

const users = [...text.matchAll(/user_\d+/g)];
const userFreq = {};
for (const u of users) userFreq[u[0]] = (userFreq[u[0]] || 0) + 1;

const out = {
  decodedBytes: text.length,
  activityTypes: Object.entries(types).sort((a, b) => b[1] - a[1]),
  expressionCount: exprs.length,
  topExpressions: Object.entries(exprFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 40),
  needleHits: found,
  uniqueUsers: Object.keys(userFreq).length,
  topUsers: Object.entries(userFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20),
};

const anchor = 'A62638_89551_10304_32527';
const i = text.indexOf(anchor);
if (i >= 0) {
  out.anchorSnippet = text.slice(Math.max(0, i - 250), i + 900);
}

const outPath = path.join(path.dirname(decodedPath), 'bp-2784-analysis.json');
fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
console.log(JSON.stringify(out, null, 2));
