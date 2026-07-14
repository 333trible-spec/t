'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const VERSION_JSON = path.join(ROOT, 'version.json');
const VERSIONS_DIR = path.join(ROOT, 'versions');
const VERSION_JS = path.join(ROOT, 'api', 'html', 'version.js');

const SNAPSHOT_PATHS = [
  'api/html/index.html',
  'api/html/install.html',
  'api/html/tab.html',
  'api/html/bp-form-config.js',
  'api/html/bp-form.js',
  'api/html/deal-prefill-map.js',
  'api/html/deal-prefill.js',
  'api/html/version.js',
  'api/serve.js',
  'vercel.json',
  'version.json',
];

const LEGACY_VERSION_DIRS = {
  '0.5v': 'v 0.5',
  '0.6v': 'v 0.6',
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function parseVersionNumber(input) {
  const raw = String(input || '').trim().toLowerCase()
    .replace(/^v\s*/i, '')
    .replace(/v$/i, '')
    .trim();
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : NaN;
}

const VERSION_STEP = 0.01;

function formatVersion(num) {
  const rounded = Math.round(num * 100) / 100;
  const text = rounded.toFixed(2).replace(/\.?0+$/, '');
  return 'v ' + text;
}

function normalizeVersion(input) {
  const n = parseVersionNumber(input);
  if (Number.isNaN(n)) return String(input || '').trim();
  return formatVersion(n);
}

function bumpVersion(input) {
  const n = parseVersionNumber(input);
  if (Number.isNaN(n)) throw new Error('Не удалось разобрать версию: ' + input);
  return formatVersion(n + VERSION_STEP);
}

function getCurrentVersion() {
  const data = readJson(VERSION_JSON);
  return normalizeVersion(data.version);
}

function syncPackageJsonVersion(version) {
  const pkgPath = path.join(ROOT, 'package.json');
  if (!fs.existsSync(pkgPath)) return;
  const pkg = readJson(pkgPath);
  const n = parseVersionNumber(version);
  if (Number.isNaN(n)) return;
  const semver = (Math.round(n * 100) / 100).toFixed(2) + '.0';
  if (pkg.version === semver) return;
  pkg.version = semver;
  writeJson(pkgPath, pkg);
}

function setCurrentVersion(version) {
  const v = normalizeVersion(version);
  writeJson(VERSION_JSON, {
    version: v,
    updatedAt: new Date().toISOString(),
  });
  syncVersionJs(v);
  syncPackageJsonVersion(v);
  return v;
}

function syncVersionJs(version) {
  const v = normalizeVersion(version);
  const content = `'use strict';\nwindow.BP608_APP_VERSION = '${v}';\n`;
  fs.writeFileSync(VERSION_JS, content, 'utf8');
}

function resolveVersionDirName(version) {
  const v = normalizeVersion(version);
  const direct = path.join(VERSIONS_DIR, v);
  if (fs.existsSync(direct)) return v;
  const legacy = Object.entries(LEGACY_VERSION_DIRS).find(([, canon]) => canon === v);
  if (legacy && fs.existsSync(path.join(VERSIONS_DIR, legacy[0]))) return legacy[0];
  return v;
}

function versionDir(version) {
  return path.join(VERSIONS_DIR, resolveVersionDirName(version));
}

function snapshotExists(version) {
  return fs.existsSync(path.join(versionDir(version), 'manifest.json'));
}

function hashFile(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function collectSnapshotState() {
  const files = {};
  for (const rel of SNAPSHOT_PATHS) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) {
      throw new Error('Файл для снимка не найден: ' + rel);
    }
    files[rel] = hashFile(abs);
  }
  return files;
}

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function saveSnapshot(version) {
  const v = normalizeVersion(version);
  const target = path.join(VERSIONS_DIR, v);
  if (snapshotExists(v)) {
    const err = new Error('VERSION_ALREADY_EXISTS');
    err.version = v;
    throw err;
  }

  syncVersionJs(v);
  const files = collectSnapshotState();
  fs.mkdirSync(target, { recursive: true });

  for (const rel of SNAPSHOT_PATHS) {
    copyFile(path.join(ROOT, rel), path.join(target, rel));
  }

  const manifest = {
    version: v,
    savedAt: new Date().toISOString(),
    files,
  };
  writeJson(path.join(target, 'manifest.json'), manifest);
  return manifest;
}

function restoreSnapshot(version) {
  const v = normalizeVersion(version);
  const source = versionDir(v);
  const manifestPath = path.join(source, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    const err = new Error('VERSION_NOT_FOUND');
    err.version = v;
    throw err;
  }

  for (const rel of SNAPSHOT_PATHS) {
    const src = path.join(source, rel);
    const dest = path.join(ROOT, rel);
    if (!fs.existsSync(src)) {
      throw new Error('В снимке нет файла: ' + rel);
    }
    copyFile(src, dest);
  }

  setCurrentVersion(v);
  return readJson(manifestPath);
}

function listVersions() {
  if (!fs.existsSync(VERSIONS_DIR)) return [];
  return fs.readdirSync(VERSIONS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => normalizeVersion(LEGACY_VERSION_DIRS[d.name] || d.name))
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .sort((a, b) => parseVersionNumber(a) - parseVersionNumber(b));
}

module.exports = {
  ROOT,
  SNAPSHOT_PATHS,
  VERSION_STEP,
  parseVersionNumber,
  formatVersion,
  normalizeVersion,
  bumpVersion,
  getCurrentVersion,
  setCurrentVersion,
  syncVersionJs,
  snapshotExists,
  saveSnapshot,
  restoreSnapshot,
  listVersions,
};
