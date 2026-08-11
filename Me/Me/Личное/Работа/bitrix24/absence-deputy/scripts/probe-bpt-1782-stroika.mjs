import fs from 'fs';
import zlib from 'zlib';

const bptPath = process.argv[2] || 'c:\\Users\\mitkinMV\\Downloads\\bp-1782.bpt';
const text = zlib.inflateSync(fs.readFileSync(bptPath)).toString('utf8');

const needle = 'Согласованием ОК (стройка)';
const idx = text.indexOf(needle);
console.log('Title index:', idx);
if (idx < 0) {
  console.log('Title not found in bpt');
  process.exit(1);
}

// Grab chunk around title - activity block is usually before title in Properties
const start = Math.max(0, idx - 4000);
const end = Math.min(text.length, idx + 4000);
const chunk = text.slice(start, end);

console.log('\n=== Delegation-related keys in chunk ===');
const patterns = [
  /s:14:"DelegationType";[^;]+;/g,
  /s:13:"AccessControl";[^;]+;/g,
  /s:5:"Title";[^;]+;/g,
  /s:4:"Name";[^;]+;/g,
  /s:4:"Type";[^;]+;/g,
];
for (const p of patterns) {
  const m = chunk.match(p);
  if (m) m.forEach((x) => console.log(x));
}

console.log('\n=== Full ApproveActivity blocks with стройка ===');
const typeNeedle = 's:4:"Type";s:16:"ApproveActivity"';
let pos = 0;
let n = 0;
while (true) {
  const tIdx = text.indexOf(typeNeedle, pos);
  if (tIdx < 0) break;
  const block = text.slice(tIdx, tIdx + 12000);
  if (block.includes('стройка')) {
    n++;
    console.log('\n--- Block', n, 'at', tIdx, '---');
    const title = (block.match(/s:5:"Title";s:\d+:"([^"]*)"/) || [])[1];
    console.log('Title:', title);
    const dtS = block.match(/s:14:"DelegationType";s:\d+:"([^"]*)"/);
    const dtI = block.match(/s:14:"DelegationType";i:(\d+)/);
    const acS = block.match(/s:13:"AccessControl";s:\d+:"([^"]*)"/);
    const acI = block.match(/s:13:"AccessControl";i:(\d+)/);
    console.log('DelegationType string:', dtS ? dtS[1] : null);
    console.log('DelegationType int:', dtI ? dtI[1] : null);
    console.log('AccessControl string:', acS ? acS[1] : null);
    console.log('AccessControl int:', acI ? acI[1] : null);
  }
  pos = tIdx + typeNeedle.length;
}
