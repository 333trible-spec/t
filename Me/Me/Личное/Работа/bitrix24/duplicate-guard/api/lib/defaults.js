'use strict';

/** Идентификаторы сценариев (порядок проверки — сверху вниз). */
const SCENARIOS = {
  ACTIVE_LEAD_NEW_LEAD: {
    id: 'ACTIVE_LEAD_NEW_LEAD',
    title: 'Есть активный лид → пришёл новый лид',
    order: 1,
  },
  ACTIVE_DEAL_CONTACT_NEW_LEAD: {
    id: 'ACTIVE_DEAL_CONTACT_NEW_LEAD',
    title: 'Есть активная сделка и контакт → пришёл новый лид',
    order: 2,
  },
  CONTACT_NEW_LEAD: {
    id: 'CONTACT_NEW_LEAD',
    title: 'Есть контакт → пришёл лид',
    order: 3,
  },
  NO_LEAD_NO_DEAL_NEW_LEAD: {
    id: 'NO_LEAD_NO_DEAL_NEW_LEAD',
    title: 'Нет активного лида и сделки → пришёл новый лид',
    order: 4,
  },
  NO_DEAL_NO_CONTACT_NEW_LEAD: {
    id: 'NO_DEAL_NO_CONTACT_NEW_LEAD',
    title: 'Нет сделки и контакта → пришёл лид',
    order: 5,
  },
};

const ACTIONS = {
  KEEP: 'keep',
  REJECT: 'reject',
};

function defaultScenarioRule() {
  return { action: ACTIONS.KEEP, rejectStatusId: 'JUNK' };
}

function defaultFunnelConfig(categoryId, categoryName) {
  const scenarios = {};
  for (const key of Object.keys(SCENARIOS)) {
    scenarios[key] = {
      ...defaultScenarioRule(),
      action: key === 'ACTIVE_LEAD_NEW_LEAD' || key === 'ACTIVE_DEAL_CONTACT_NEW_LEAD'
        ? ACTIONS.REJECT
        : ACTIONS.KEEP,
    };
  }
  return {
    categoryId: Number(categoryId),
    categoryName: categoryName || '',
    enabled: true,
    activeLeadStatuses: [],
    activeDealStages: [],
    scenarios,
  };
}

function defaultConfig() {
  const funnels = {
    default: defaultFunnelConfig(0, 'Общие правила (без привязки к воронке)'),
  };
  return {
    version: 1,
    enabled: true,
    participatingCategoryIds: [],
    funnels,
  };
}

function normalizeConfig(raw) {
  const base = defaultConfig();
  if (!raw || typeof raw !== 'object') return base;

  const cfg = {
    version: raw.version || 1,
    enabled: raw.enabled !== false,
    participatingCategoryIds: Array.isArray(raw.participatingCategoryIds)
      ? raw.participatingCategoryIds.map(Number)
      : [],
    funnels: { ...base.funnels },
  };

  if (raw.funnels && typeof raw.funnels === 'object') {
    for (const [key, funnel] of Object.entries(raw.funnels)) {
      const d = defaultFunnelConfig(funnel.categoryId ?? key, funnel.categoryName);
      cfg.funnels[key] = {
        ...d,
        ...funnel,
        categoryId: Number(funnel.categoryId ?? key),
        scenarios: { ...d.scenarios, ...(funnel.scenarios || {}) },
      };
    }
  }

  return cfg;
}

module.exports = {
  SCENARIOS,
  ACTIONS,
  defaultConfig,
  defaultFunnelConfig,
  defaultScenarioRule,
  normalizeConfig,
};
