'use strict';

const fs = require('fs');
const zlib = require('zlib');

const bptPath = process.argv[2];
if (!bptPath) {
  console.error('Usage: node parse-bpt-delegation.js <file.bpt>');
  process.exit(1);
}

const text = zlib.inflateSync(fs.readFileSync(bptPath)).toString('utf8');
// CBPTaskDelegationType: 0=подчинённым, 1=всем, 2=никому, 3=строго никому
const LABEL = { 0: 'только подчинённым', 1: 'всем сотрудникам', 2: 'никому', 3: 'никому (строго)' };

const types = [
  'ApproveActivity',
  'ReviewActivity',
  'RequestInformationActivity',
  'RequestInformationOptionalActivity',
];

const hits = [];
for (const t of types) {
  const needle = 's:4:"Type";s:' + String(t.length) + ':"' + t + '"';
  let pos = 0;
  while (true) {
    const idx = text.indexOf(needle, pos);
    if (idx < 0) break;
    const chunk = text.slice(idx, idx + 8000);
    const title = (chunk.match(/s:5:"Title";s:\d+:"([^"]*)"/) || [])[1] || '';
    const name = (chunk.match(/s:4:"Name";s:\d+:"([^"]*)"/) || [])[1] || '';
    const dt = (chunk.match(/s:14:"DelegationType";s:\d+:"(\d+)"/) || [])[1];
    const dtInt = dt == null ? null : Number(dt);
    hits.push({
      type: t,
      title: title || name || '(без имени)',
      delegationRaw: dt,
      delegationLabel: dtInt != null && LABEL[dtInt] != null ? LABEL[dtInt] : dt == null ? '(пусто)' : String(dt),
      ok: dtInt === 1,
    });
    pos = idx + needle.length;
  }
}

console.log('File:', bptPath);
console.log('Task activities:', hits.length);
console.log('');
hits.forEach(function (h, i) {
  console.log(
    (i + 1) + '. [' + (h.ok ? 'OK' : 'BAD') + '] ' + h.title +
    ' (' + h.type + ') => ' + h.delegationLabel + ' (raw ' + h.delegationRaw + ')'
  );
});
const bad = hits.filter(function (h) { return !h.ok; });
console.log('');
console.log('Summary: ok=' + (hits.length - bad.length) + ' bad=' + bad.length);
