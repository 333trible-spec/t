'use strict';

const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const bptPath = process.argv[2] || path.join(process.env.USERPROFILE || '', 'Downloads', 'bp-608.bpt');
const outDir = path.join(__dirname, '..', 'export');
const outText = path.join(outDir, 'bp-608-decoded.txt');
const outSummary = path.join(outDir, 'bp-608-summary.md');

const raw = fs.readFileSync(bptPath);
const text = zlib.inflateSync(raw).toString('utf8');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outText, text);

const typeTitleRe = /s:4:"Type";s:\d+:"([^"]+)".*?s:5:"Title";s:\d+:"([^"]*)"/gs;
const items = [];
let m;
while ((m = typeTitleRe.exec(text)) !== null) {
  items.push({ type: m[1], title: m[2] });
}

const ufs = [...new Set([...text.matchAll(/UF_CRM_[0-9]+/g)].map((x) => x[0]))];
const stages = [...new Set([...text.matchAll(/STAGE_ID|DEAL_STAGE|CATEGORY_ID/g)].map(() => null))];

// Editor comments with useful context
const comments = [];
const commentRe = /s:13:"EditorComment";s:\d+:"([^"]*)"/g;
while ((m = commentRe.exec(text)) !== null) {
  if (m[1].trim()) comments.push(m[1]);
}

// Field conditions snippets
const conditions = [];
const condRe = /s:14:"fieldcondition";a:\d+:\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/g;
let ci = 0;
while ((m = condRe.exec(text)) !== null && ci < 30) {
  conditions.push(m[0].slice(0, 200));
  ci++;
}

// StartWorkflow / subprocess
const workflows = [...text.matchAll(/StartWorkflowActivity|ParallelWorkflowActivity/g)].map((x) => x[0]);

const lines = [
  '# BP 608 — разбор экспорта',
  '',
  `Источник: \`bp-608.bpt\` · сущность **CRM_DEAL** · ik-navigator`,
  '',
  '## Тип шаблона',
  '',
  '- **Последовательный бизнес-процесс** (`SequentialWorkflowActivity`)',
  '',
  '## Активити (порядок, Type + Title)',
  '',
  ...items.map((x, i) => `${i + 1}. **${x.type}** — ${x.title || '—'}`),
  '',
  '## UF-поля сделки в процессе',
  '',
  ...ufs.map((u) => `- \`${u}\``),
  '',
  '## Комментарии из дизайнера',
  '',
  ...([...new Set(comments)].map((c) => `- ${c}`) || ['—']),
  '',
];

fs.writeFileSync(outSummary, lines.join('\n') + '\n', 'utf8');

console.log('Wrote', outSummary);
console.log('Activities:', items.length);
items.forEach((x, i) => console.log(`${i + 1}. [${x.type}] ${x.title}`));
console.log('\nUF:', ufs.join(', '));
console.log('\nUnique comments:', [...new Set(comments)].length);
