'use strict';

const { SCENARIOS } = require('./defaults');

/**
 * Определяет сценарий по результатам проверки CRM.
 * @param {object} ctx
 * @param {string|number} ctx.newLeadId
 * @param {number[]} ctx.activeLeadIds — другие активные лиды
 * @param {number[]} ctx.activeDealIds — активные сделки в выбранных воронках
 * @param {number[]} ctx.contactIds — найденные контакты
 * @param {boolean} ctx.hasAnyDuplicate — findbycomm что-то нашёл
 */
function detectScenario(ctx) {
  const newId = String(ctx.newLeadId);
  const otherActiveLeads = (ctx.activeLeadIds || []).filter((id) => String(id) !== newId);

  if (otherActiveLeads.length > 0) {
    return SCENARIOS.ACTIVE_LEAD_NEW_LEAD.id;
  }
  if ((ctx.activeDealIds || []).length > 0) {
    return SCENARIOS.ACTIVE_DEAL_CONTACT_NEW_LEAD.id;
  }
  if ((ctx.contactIds || []).length > 0) {
    return SCENARIOS.CONTACT_NEW_LEAD.id;
  }
  if (ctx.hasAnyDuplicate) {
    return SCENARIOS.NO_LEAD_NO_DEAL_NEW_LEAD.id;
  }
  return SCENARIOS.NO_DEAL_NO_CONTACT_NEW_LEAD.id;
}

/**
 * Выбирает конфиг воронки: по category активной сделки или default.
 */
function resolveFunnelConfig(config, dealCategories) {
  const cats = [...new Set((dealCategories || []).map(Number))].filter((n) => n >= 0);
  for (const cat of cats) {
    const key = String(cat);
    if (config.funnels[key]?.enabled) return config.funnels[key];
  }
  return config.funnels.default || config.funnels['0'];
}

function getScenarioAction(funnelConfig, scenarioId) {
  const rule = funnelConfig?.scenarios?.[scenarioId];
  if (!rule) return { action: 'keep', rejectStatusId: 'JUNK' };
  return rule;
}

module.exports = {
  detectScenario,
  resolveFunnelConfig,
  getScenarioAction,
};
