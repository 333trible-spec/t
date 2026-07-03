'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const DEPLOYMENT_ID = process.env.VERCEL_DEPLOYMENT_ID || 'dpl_92zqDro5wkz9xjVzfwh7TQyHFwE4';
const OUT_ROOT = path.join(__dirname, '..');
const AUTH_PATH = path.join(os.homedir(), 'AppData', 'Roaming', 'xdg.data', 'com.vercel.cli', 'auth.json');

function getToken() {
  const auth = JSON.parse(fs.readFileSync(AUTH_PATH, 'utf8'));
  if (!auth.token) throw new Error('Vercel token not found');
  return auth.token;
}

function collectFiles(nodes, prefix = '') {
  const out = [];
  for (const node of nodes || []) {
    const rel = prefix ? `${prefix}/${node.name}` : node.name;
    if (node.type === 'directory') {
      out.push(...collectFiles(node.children, rel));
    } else if (node.type === 'file' && node.uid) {
      out.push({ path: rel, uid: node.uid });
    }
  }
  return out;
}

async function downloadUid(uid) {
  const res = await fetch(
    `https://api.vercel.com/v8/deployments/${DEPLOYMENT_ID}/files/${uid}`,
    { headers: { Authorization: `Bearer ${getToken()}` } },
  );
  const data = await res.json();
  if (!res.ok) throw new Error(`uid ${uid}: ${JSON.stringify(data).slice(0, 200)}`);
  return Buffer.from(data.data, 'base64');
}

async function main() {
  const res = await fetch(`https://api.vercel.com/v6/deployments/${DEPLOYMENT_ID}/files`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  const tree = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(tree).slice(0, 300));

  const files = collectFiles(tree);
  console.log('files:', files.length);

  for (const file of files) {
    let rel = file.path.replace(/^src\//, '');
    const dest = path.join(OUT_ROOT, rel);
    const buf = await downloadUid(file.uid);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, buf);
    console.log('saved', rel, buf.length);
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
