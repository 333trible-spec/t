/** Часы обновления фида, Asia/Yekaterinburg (Тюмень). */
export const FEED_TZ = 'Asia/Yekaterinburg';

/** 8–21 каждый час + ночью 00 и 06 (21 уже в дневном диапазоне). */
export const FEED_HOURS_YEKT = Object.freeze([
  0, 6, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
]);

/** Макс. пауза между обновлениями (00→06) + запас, сек. */
export const FEED_CACHE_TTL_SEC = 7 * 60 * 60;

export function isScheduledHour(hourYekt) {
  return FEED_HOURS_YEKT.includes(Number(hourYekt));
}
