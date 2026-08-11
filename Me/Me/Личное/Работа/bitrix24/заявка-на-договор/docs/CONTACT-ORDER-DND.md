# Drag-and-drop порядка контактов (отложено)

Статус: **выключено** (2026-07). Код убран из UI; методика сохранена для повторного включения.

Портал: **ik-navigator** · placement `CRM_DEAL_DETAIL_TAB` · БП 608

## Задача

При 2+ контактах (долевая / общая совместная собственность) пользователь перетаскивает карточки во вкладке «Заявка на договор» → порядок записывается в UF сделки.

## UF-поля

| Тип собственности | Параметр БП | UF сделки |
|-------------------|-------------|-----------|
| Долевая собственность | `Parameter2` | `UF_CRM_1722231954` |
| Общая совместная собственность | `Parameter1` | `UF_CRM_1722231741` |

Индивидуальная — один контакт (`CONTACT_ID`), DnD не нужен.

## UI (bp-form.js)

- Карточки `.contact-card` с `draggable="true"`, ручка `⠿`, классы `contact-draggable`, `dragging`, `drag-active`
- `bindContactDragDrop` — `dragstart` / `dragover` / `drop` / `dragend`
- На `dragend`: порядок из DOM → скрытые `Parameter1`/`Parameter2` → автосохранение в сделку
- Подсказка: «перетащите карточки для смены порядка»
- Дублирующее сохранение по **Сохранить** → **Да**/**Нет** (опционально)

## Парсинг ID из сделки

UF «Привязка к CRM» может вернуть `123`, `C_123` или объекты — парсер:

```javascript
function parseCrmContactIds(val) {
  const arr = Array.isArray(val) ? val : [val];
  return arr.map((x) => {
    if (x && typeof x === 'object') x = x.VALUE || x.value || x.id || x.ID;
    const m = String(x).trim().match(/^(?:C_)?(\d+)$/i);
    return m ? Number(m[1]) : Number(x);
  }).filter((id) => id > 0);
}
```

Для CRM-полей в prefill **не** подменять `raw` на `_PRINTABLE` (там ФИО, не ID).

## Запись порядка (deal-prefill.js → `saveContactOrder`)

1. Baseline при загрузке сделки — сравнение «грязного» порядка
2. Формат отправки: `['C_1', 'C_2']`, числовые ID, `[{ VALUE: 'C_1' }, …]`
3. Методы (по очереди, с проверкой чтением обратно):
   - `crm.item.update` + `useOriginalUfNames: 'Y'` (предпочтительно)
   - `crm.item.update` + camelCase `ufCrm_…`
   - `crm.deal.update`
   - сброс поля `[]` + `crm.item.update`
4. Проверка: `crm.item.get` / `crm.deal.get` → `idsEqualOrder(saved, wanted)`
5. Scope: **crm** у локального приложения

## Где меняется порядок в карточке сделки

| Меняется | Не меняется |
|----------|-------------|
| UF «Участники долевой / общей собственности» | Основной контакт (`CONTACT_ID`) |
| | Вкладка «Контакты» сделки (`crm.deal.contact.items.*`) |

## Ограничения (ik-navigator)

- Портал может не сохранять порядок в UF «Привязка к CRM» — тогда REST после записи возвращает другой порядок; нужна диагностика по конкретной сделке
- Интерфейс карточки иногда сортирует контакты по имени, хотя в REST порядок верный

## Файлы при включении

| Файл | Что вернуть |
|------|-------------|
| `api/html/bp-form.js` | DnD, `persistContactOrderFromForm`, автосохранение |
| `api/html/deal-prefill.js` | `saveContactOrder`, baseline, attempts |
| `api/html/tab.html` | CSS `.contact-draggable`, `.contact-drag-handle` |

## Включение обратно

1. Восстановить код из git по коммиту до отключения или по этой заметке
2. Задеплоить: `npx vercel deploy --prod`
3. Ctrl+F5 на вкладке сделки
4. Проверить на сделке с долевой/общей собственностью и 2+ контактами

← [[DEAL-PREFILL-MAP]] · [[../PROJECT]]
