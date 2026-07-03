'use strict';

function digitsOnly(raw) {
  return String(raw ?? '').replace(/\D/g, '');
}

/** Канонический формат E.164 для РФ: +79XXXXXXXXX */
function normalizePhone(raw) {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return null;

  const d = digitsOnly(trimmed);
  if (!d) return null;

  if (d.length === 11 && d[0] === '8') return '+7' + d.slice(1);
  if (d.length === 11 && d[0] === '7') return '+' + d;
  if (d.length === 10) return '+7' + d;
  if (trimmed.startsWith('+') && d.length === 11 && d[0] === '7') return '+' + d;
  if (d.length >= 10 && d.length <= 15) return '+' + d;

  return null;
}

function phoneSearchVariants(raw) {
  const canonical = normalizePhone(raw);
  if (!canonical) return [];

  const d = digitsOnly(canonical);
  const variants = new Set([canonical, d]);

  if (d.length === 11 && d[0] === '7') {
    const ten = d.slice(1);
    variants.add('8' + ten);
    variants.add(ten);
    variants.add('+7 ' + ten.slice(0, 3) + ' ' + ten.slice(3, 6) + '-' + ten.slice(6, 8) + '-' + ten.slice(8));
    variants.add('8 (' + ten.slice(0, 3) + ') ' + ten.slice(3, 6) + '-' + ten.slice(6, 8) + '-' + ten.slice(8));
  }

  return [...variants].filter(Boolean);
}

function extractPhonesFromCrmField(phoneField) {
  const rows = Array.isArray(phoneField) ? phoneField : [];
  const seen = new Set();
  const result = [];

  for (const row of rows) {
    const raw = row?.VALUE ?? row?.value ?? row;
    const canonical = normalizePhone(raw);
    if (canonical && !seen.has(canonical)) {
      seen.add(canonical);
      result.push(canonical);
    }
  }

  return result;
}

function uniqueCanonicalPhones(rawList) {
  const seen = new Set();
  const result = [];
  for (const raw of rawList) {
    const canonical = normalizePhone(raw);
    if (canonical && !seen.has(canonical)) {
      seen.add(canonical);
      result.push(canonical);
    }
  }
  return result;
}

function extractPhonesFromLead(lead) {
  return extractPhonesFromCrmField(lead?.PHONE);
}

module.exports = {
  digitsOnly,
  normalizePhone,
  phoneSearchVariants,
  extractPhonesFromCrmField,
  uniqueCanonicalPhones,
  extractPhonesFromLead,
};
