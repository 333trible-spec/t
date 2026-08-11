import { FEED_CACHE_TTL_SEC } from './schedule.js';

const REDIS_KEY = 'obshchiy-json-feed:v2';
const TMP_PATH = '/tmp/obshchiy-json-feed-v2.json';

/** @type {{ feed: object, updatedAt: string } | null} */
let memory = null;

function redisConfigured() {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

async function getRedis() {
  if (!redisConfigured()) return null;
  const { Redis } = await import('@upstash/redis');
  return Redis.fromEnv();
}

async function readTmp() {
  try {
    const fs = await import('node:fs/promises');
    const raw = await fs.readFile(TMP_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function writeTmp(entry) {
  try {
    const fs = await import('node:fs/promises');
    await fs.writeFile(TMP_PATH, JSON.stringify(entry), 'utf8');
  } catch {
    /* ignore */
  }
}

function isFresh(entry) {
  if (!entry?.feed || !entry?.updatedAt) return false;
  const ageMs = Date.now() - Date.parse(entry.updatedAt);
  if (!Number.isFinite(ageMs) || ageMs < 0) return false;
  return ageMs <= FEED_CACHE_TTL_SEC * 1000;
}

/** @returns {Promise<{ feed: object, updatedAt: string } | null>} */
export async function readFeedCache() {
  if (memory && isFresh(memory)) return memory;

  const redis = await getRedis();
  if (redis) {
    const entry = await redis.get(REDIS_KEY);
    if (entry && typeof entry === 'object' && isFresh(entry)) {
      memory = entry;
      return entry;
    }
  }

  const tmp = await readTmp();
  if (tmp && isFresh(tmp)) {
    memory = tmp;
    return tmp;
  }

  return null;
}

/** @param {object} feed */
export async function writeFeedCache(feed) {
  const entry = {
    feed,
    updatedAt: new Date().toISOString(),
  };
  memory = entry;

  const redis = await getRedis();
  if (redis) {
    await redis.set(REDIS_KEY, entry, { ex: FEED_CACHE_TTL_SEC });
  }
  await writeTmp(entry);
  return entry;
}

export function cacheBackend() {
  if (redisConfigured()) return 'redis';
  return 'memory+tmp';
}
