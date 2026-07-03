'use strict';

const fs = require('fs');
const path = require('path');

const base = 'https://b24-duplicate-guard.vercel.app';
const out = path.join(__dirname, '..', 'app', 'public');

async function get(p) {
  const r = await fetch(`${base}${p}`);
  if (!r.ok) throw new Error(`${p} ${r.status}`);
  return r.text();
}

async function main() {
  fs.mkdirSync(out, { recursive: true });
  const pages = [
    '/install.html',
    '/settings.html',
    '/field-handler.html',
  ];
  const assets = new Set();

  for (const p of pages) {
    const html = await get(p);
    fs.writeFileSync(path.join(out, path.basename(p)), html, 'utf8');
    console.log('saved', p, html.length);
    const re = /(?:src|href)=["']([^"']+)["']/gi;
    let m;
    while ((m = re.exec(html))) {
      const u = m[1];
      if (u.startsWith('http') || u.startsWith('//') || u.startsWith('#') || u.startsWith('data:')) continue;
      assets.add(u.split('?')[0]);
    }
  }

  for (const a of assets) {
    const rel = a.startsWith('/') ? a : `/${a}`;
    try {
      const t = await get(rel);
      const dest = path.join(out, rel.replace(/^\//, ''));
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, t, 'utf8');
      console.log('saved asset', rel, t.length);
    } catch (e) {
      console.log('skip', rel, e.message);
    }
  }

  console.log('files:', fs.readdirSync(out));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
