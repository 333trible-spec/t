'use strict';

const fs = require('fs');
const path = require('path');

const LIMIT = 20;
const REDIS_KEY = 'six-staff:dismissal-plans';

let redisClient = null;

function hasRedisEnv() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return !!(url && token);
}

function getRedis() {
  if (redisClient) return redisClient;
  if (!hasRedisEnv()) return null;

  const { Redis } = require('@upstash/redis');
  redisClient = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN,
  });
  return redisClient;
}

function resolveFilePath() {
  if (process.env.DISMISSAL_PLANS_PATH) {
    return process.env.DISMISSAL_PLANS_PATH;
  }
  return path.join(__dirname, '..', 'data', 'dismissal-plans.json');
}

function isStorageAvailable() {
  if (hasRedisEnv()) return true;
  if (process.env.VERCEL) return false;
  return true;
}

function storageMode() {
  if (hasRedisEnv()) return 'redis';
  if (process.env.VERCEL) return 'unavailable';
  return 'file';
}

function requireStorage() {
  if (!isStorageAvailable()) {
    throw new Error(
      'Планирование увольнений пока недоступно — подключите Redis на VibeCode (UPSTASH_*). «Уволить сейчас» работает без Redis.'
    );
  }
}

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function loadStore() {
  if (!isStorageAvailable()) return { plans: [] };
  const mode = storageMode();

  if (mode === 'redis') {
    const redis = getRedis();
    const data = await redis.get(REDIS_KEY);
    if (!data) return { plans: [] };
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        return { plans: Array.isArray(parsed.plans) ? parsed.plans : [] };
      } catch (_) {
        return { plans: [] };
      }
    }
    return { plans: Array.isArray(data.plans) ? data.plans : [] };
  }

  const filePath = resolveFilePath();
  try {
    if (!fs.existsSync(filePath)) return { plans: [] };
    const raw = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(raw);
    return { plans: Array.isArray(data.plans) ? data.plans : [] };
  } catch (_) {
    return { plans: [] };
  }
}

async function saveStore(data) {
  requireStorage();
  const payload = { plans: Array.isArray(data.plans) ? data.plans : [] };
  const mode = storageMode();

  if (mode === 'redis') {
    const redis = getRedis();
    await redis.set(REDIS_KEY, payload);
    return;
  }

  const filePath = resolveFilePath();
  ensureDir(filePath);
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
}

function uid() {
  return 'd_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

async function addPlan(fields) {
  const store = await loadStore();
  const plan = {
    id: uid(),
    userId: String(fields.userId || ''),
    userName: String(fields.userName || ''),
    date: String(fields.date || ''),
    replacementId: fields.replacementId ? String(fields.replacementId) : null,
    status: String(fields.status || 'planned'),
    createdAt: new Date().toISOString(),
    executedAt: fields.executedAt || null,
    requestedBy: fields.requestedBy ? String(fields.requestedBy) : null,
  };
  store.plans.unshift(plan);
  await saveStore(store);
  return plan;
}

async function getPlan(planId) {
  const store = await loadStore();
  return store.plans.find(function (p) {
    return p.id === planId;
  }) || null;
}

async function updatePlan(planId, patch) {
  const store = await loadStore();
  const idx = store.plans.findIndex(function (p) {
    return p.id === planId;
  });
  if (idx < 0) return null;
  store.plans[idx] = Object.assign({}, store.plans[idx], patch);
  await saveStore(store);
  return store.plans[idx];
}

async function listPlans(limit) {
  const store = await loadStore();
  const n = limit == null ? LIMIT : limit;
  return store.plans.slice(0, n);
}

async function listDuePlans(today) {
  const store = await loadStore();
  return store.plans.filter(function (p) {
    const dueStatus = p.status === 'planned' || p.status === 'error';
    return dueStatus && p.date && p.date <= today;
  });
}

module.exports = {
  LIMIT,
  REDIS_KEY,
  isStorageAvailable,
  storageMode,
  requireStorage,
  loadStore,
  saveStore,
  addPlan,
  getPlan,
  updatePlan,
  listPlans,
  listDuePlans,
};
