'use strict';

const { todayISO } = require('./b24');

/**
 * Канон подмены: [dateFrom; dateTo) — день «До» уже без подмены.
 * @returns {'planned'|'active'|'returned'}
 */
function computeVacationUiStatus(dateFrom, dateTo, today) {
  const t = today || todayISO();
  const from = dateFrom ? String(dateFrom).slice(0, 10) : '';
  const to = dateTo ? String(dateTo).slice(0, 10) : '';
  if (!from) return 'planned';
  if (t < from) return 'planned';
  if (to && t >= to) return 'returned';
  return 'active';
}

function isVacationActiveRange(dateFrom, dateTo, today) {
  return computeVacationUiStatus(dateFrom, dateTo, today) === 'active';
}

module.exports = {
  computeVacationUiStatus,
  isVacationActiveRange,
};
