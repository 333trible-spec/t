import { buildMergedFeed } from './merge.js';
import { readFeedCache, writeFeedCache, cacheBackend } from './feed-store.js';

export async function getFeed({ force = false } = {}) {
  if (!force) {
    const cached = await readFeedCache();
    if (cached) {
      return {
        feed: cached.feed,
        updatedAt: cached.updatedAt,
        source: 'cache',
        backend: cacheBackend(),
      };
    }
  }

  const feed = await buildMergedFeed();
  const entry = await writeFeedCache(feed);
  return {
    feed: entry.feed,
    updatedAt: entry.updatedAt,
    source: force ? 'refresh' : 'build',
    backend: cacheBackend(),
  };
}
