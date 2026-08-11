/** Порядок: квартиры → кладовые → коммерция */
export const FEED_BASE = 'https://nav.venus.xamtal.ru/export/JSON';

export const SOURCES = [
  {
    id: 'apartments',
    label: 'квартиры',
    url: `${FEED_BASE}/664d240c-e863-4920-9ded-494615ea00f9`,
    format: 'v2',
  },
  {
    id: 'storage',
    label: 'кладовые',
    url: `${FEED_BASE}/71cb1bb2-330d-463b-a65f-93a842c6161b`,
    format: 'v1',
  },
  {
    id: 'commerce',
    label: 'коммерция',
    url: `${FEED_BASE}/6c41c8a9-3d9e-4d73-bada-9502c48c50f7`,
    format: 'v1',
  },
];
