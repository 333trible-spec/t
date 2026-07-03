'use strict';

const { normalizeConfig } = require('./defaults');
const { detectScenario, resolveFunnelConfig, getScenarioAction } = require('./scenarios');
const {
  extractPhones,
  findDuplicatesByPhone,
  listActiveLeads,
  listActiveDeals,
  getAppOption,
  CONFIG_KEY,
  b24Call,
} = require('./b24');

async function processNewLead(auth, webhook, leadId) {
  const call = (m, p) => b24Call(null, m, p, auth);

  const rawConfig = await getAppOption(auth, webhook, CONFIG_KEY);
  let config = normalizeConfig(null);
  if (rawConfig) {
    const parsed = typeof rawConfig === 'string' ? JSON.parse(rawConfig) : rawConfig;
    config = normalizeConfig(parsed);
  }

  if (!config.enabled) {
    return { skipped: true, reason: 'disabled' };
  }

  const lead = await call('crm.lead.get', { id: leadId });
  const phones = extractPhones(lead);
  if (!phones.length) {
    return { skipped: true, reason: 'no_phone' };
  }

  const dup = await findDuplicatesByPhone(auth, webhook, phones);
  const participating = config.participatingCategoryIds.length
    ? config.participatingCategoryIds
    : Object.values(config.funnels)
      .filter((f) => f.enabled && f.categoryId !== 0)
      .map((f) => f.categoryId);

  const defaultFunnel = config.funnels.default || config.funnels['0'];
  const leadStatuses = defaultFunnel?.activeLeadStatuses?.length
    ? defaultFunnel.activeLeadStatuses
    : undefined;

  const allLeadIds = [...new Set([...dup.leadIds, Number(leadId)])];
  const activeLeadIds = await listActiveLeads(
    auth, webhook, allLeadIds, leadStatuses || [], leadId,
  );

  const dealStagesGlobal = [];
  const activeDeals = await listActiveDeals(
    auth,
    webhook,
    dup.contactIds,
    participating,
    dealStagesGlobal,
  );

  let activeDealIds = activeDeals.dealIds;
  let dealCategories = activeDeals.categories;

  if (participating.length) {
    const perFunnelDeals = [];
    const cats = new Set();
    for (const catId of participating) {
      const fcfg = config.funnels[String(catId)];
      const stages = fcfg?.activeDealStages?.length ? fcfg.activeDealStages : [];
      const part = await listActiveDeals(auth, webhook, dup.contactIds, [catId], stages);
      part.dealIds.forEach((id) => perFunnelDeals.push(id));
      part.categories.forEach((c) => cats.add(c));
    }
    if (perFunnelDeals.length) {
      activeDealIds = [...new Set(perFunnelDeals)];
      dealCategories = [...cats];
    }
  }

  const scenarioId = detectScenario({
    newLeadId: leadId,
    activeLeadIds,
    activeDealIds,
    contactIds: dup.contactIds,
    hasAnyDuplicate: dup.hasAnyDuplicate,
  });

  const funnelConfig = resolveFunnelConfig(config, dealCategories);
  const rule = getScenarioAction(funnelConfig, scenarioId);

  const result = {
    leadId: Number(leadId),
    scenarioId,
    scenarioTitle: scenarioId,
    funnelCategoryId: funnelConfig?.categoryId,
    action: rule.action,
    rejected: false,
  };

  if (rule.action === 'reject') {
    const statusId = rule.rejectStatusId || 'JUNK';
    await call('crm.lead.update', {
      id: leadId,
      fields: {
        STATUS_ID: statusId,
        COMMENTS: `[Duplicate Guard] Сценарий: ${scenarioId}. Автобраковка.`,
      },
    });
    await call('crm.timeline.comment.add', {
      fields: {
        ENTITY_ID: leadId,
        ENTITY_TYPE: 'lead',
        COMMENT: `Duplicate Guard: лид забракован (сценарий «${scenarioId}»)`,
      },
    });
    result.rejected = true;
    result.rejectStatusId = statusId;
  }

  return result;
}

module.exports = { processNewLead };
