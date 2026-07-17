'use strict';

const fs = require('fs');
const text = fs.readFileSync(process.argv[2], 'utf8');

function extractSection(label) {
  const needle = `s:${label.length}:"${label}"`;
  const idx = text.indexOf(needle);
  if (idx < 0) return null;
  return { idx, preview: text.slice(idx, idx + 400) };
}

const sections = ['VERSION', 'TEMPLATE', 'PARAMETERS', 'VARIABLES', 'CONSTANTS'];
const info = {};
for (const s of sections) info[s] = extractSection(s);

const actTypes = [...text.matchAll(/s:4:"Type";s:\d+:"([A-Za-z]+Activity)"/g)].map((m) => m[1]);
info.activities = actTypes;

const titles = [...text.matchAll(/s:5:"Title";s:\d+:"([^"]{1,120})"/g)].map((m) => m[1]);
info.titles = [...new Set(titles)].slice(0, 30);

const nameParam = text.match(/s:4:"NAME";s:\d+:"([^"]+)"/);
info.templateNameGuess = nameParam ? nameParam[1] : null;

// Look for NAME at template meta level
const metaName = text.match(/s:4:"NAME";N;|s:4:"NAME";s:\d+:"([^"]*)"/);
info.metaName = metaName ? (metaName[1] || null) : null;

console.log(JSON.stringify(info, null, 2));
