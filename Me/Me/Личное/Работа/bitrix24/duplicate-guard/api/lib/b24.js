'use strict';

const {
  extractPhonesFromLead,
  uniqueCanonicalPhones,
  phoneSearchVariants,
  extractPhonesFromCrmField,
  normalizePhone,
} = require('./phone');

class B24Error extends Error {
  constructor(code, description) {
    super(description || code);
    this.code = code;
  }
}

async function b24Call(baseUrl, method, params = {}, token) {
  const base = token
    ? `https://${token.domain}/rest/`
    : (baseUrl.endsWith('/') ? baseUrl : baseUrl + '/');
  const url = token
    ? `${base}${method}?auth=${token.access_token}`
    : base + method;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (data.error) throw new B24Error(data.error, data.error_description);
  return data.result;
}

async function b24(webhookUrl, method, params) {
  return b24Call(webhookUrl, method, params, null);
}

function extractPhones(lead) {
  return extractPhonesFromLead(lead);
}

async function findDuplicatesByPhone(auth, webhook, phoneRawList) {
  const contactIds = new Set();
  const leadIds = new Set();
  let hasAny = false;

  const call = (m, p) => (auth ? b24Call(null, m, p, auth) : b24(webhook, m, p));
  const canonical = uniqueCanonicalPhones(phoneRawList);

  if (!canonical.length) {
    return { contactIds: [], leadIds: [], hasAnyDuplicate: false, phones: [] };
  }

  for (const phone of canonical) {
    const values = phoneSearchVariants(phone);
    if (!values.length) continue;

    for (const entityType of ['CONTACT', 'LEAD']) {
      const r = await call('crm.duplicate.findbycomm', {
        entity_type: entityType,
        type: 'PHONE',
        values,
      });
      (r?.[entityType] || []).forEach((id) => {
        if (entityType === 'CONTACT') contactIds.add(Number(id));
        else leadIds.add(Number(id));
        hasAny = true;
      });
    }
  }

  return {
    contactIds: [...contactIds],
    leadIds: [...leadIds],
    hasAnyDuplicate: hasAny,
    phones: canonical,
  };
}

async function listActiveLeads(auth, webhook, leadIds, activeStatuses, excludeLeadId) {
  if (!leadIds.length) return [];
  const call = (m, p) => (auth ? b24Call(null, m, p, auth) : b24(webhook, m, p));
  const filter = { ID: leadIds };
  if (activeStatuses?.length) filter.STATUS_ID = activeStatuses;
  else filter['!STATUS_ID'] = ['CONVERTED', 'JUNK'];

  const rows = await call('crm.lead.list', {
    filter,
    select: ['ID', 'STATUS_ID', 'TITLE'],
  });
  return (rows || [])
    .map((r) => Number(r.ID))
    .filter((id) => String(id) !== String(excludeLeadId));
}

async function listActiveDeals(auth, webhook, contactIds, categoryIds, activeStages) {
  if (!contactIds.length) return { dealIds: [], categories: [] };
  const call = (m, p) => (auth ? b24Call(null, m, p, auth) : b24(webhook, m, p));
  const filter = { CONTACT_ID: contactIds };
  if (categoryIds.length) filter.CATEGORY_ID = categoryIds;
  if (activeStages.length) filter.STAGE_ID = activeStages;
  else filter['!STAGE_SEMANTIC_ID'] = ['S', 'F'];

  const rows = await call('crm.deal.list', {
    filter,
    select: ['ID', 'STAGE_ID', 'CATEGORY_ID', 'CONTACT_ID'],
  });
  const deals = rows || [];
  return {
    dealIds: deals.map((d) => Number(d.ID)),
    categories: [...new Set(deals.map((d) => Number(d.CATEGORY_ID)))],
  };
}

async function getAppOption(auth, webhook, key) {
  const call = (m, p) => (auth ? b24Call(null, m, p, auth) : b24(webhook, m, p));
  try {
    return await call('app.option.get', { option: key });
  } catch {
    return null;
  }
}

async function setAppOption(auth, webhook, key, value) {
  const call = (m, p) => (auth ? b24Call(null, m, p, auth) : b24(webhook, m, p));
  return call('app.option.set', { options: { [key]: JSON.stringify(value) } });
}

const CONFIG_KEY = 'duplicate_guard_config';

module.exports = {
  B24Error,
  b24,
  b24Call,
  extractPhones,
  findDuplicatesByPhone,
  listActiveLeads,
  listActiveDeals,
  getAppOption,
  setAppOption,
  CONFIG_KEY,
  normalizePhone,
  extractPhonesFromCrmField,
};
