'use strict';

/** Установить hex-фон сделки. Пример: node scripts/set-deal-color.js 21 "#FFF8E1" */
require('../lib/load-env');
const { callRest } = require('../lib/b24');
const { UF_NAME, PALETTE } = require('../lib/colors');

function resolveHex(input) {
  const s = String(input || '').trim();
  if (!s || /^без/i.test(s)) return '';
  if (/^#[0-9a-f]{3,8}$/i.test(s)) return s.toUpperCase();
  const hit = PALETTE.find((p) => p.value.toLowerCase() === s.toLowerCase());
  if (hit) return hit.xmlId || '';
  throw new Error(`Неизвестный цвет «${input}». Пример: Бронь или #FFF8E1`);
}

async function main() {
  const dealId = process.argv[2];
  const colorArg = process.argv[3] || 'Без фона';
  if (!dealId) {
    console.error('Использование: node scripts/set-deal-color.js <ID> [цвет|#hex]');
    process.exit(1);
  }

  const hex = resolveHex(colorArg);
  await callRest('crm.deal.update', {
    id: dealId,
    fields: { [UF_NAME]: hex },
  });

  console.log(`Сделка ${dealId}: фон ${hex || '(нет)'}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
