# Битрикс24 — платформа: API, вебхуки, приложения, БП

## REST API

### Базовый URL

```
POST https://{portal}.bitrix24.ru/rest/{user_id}/{token}/{method}
Content-Type: application/json
{ ...params }
```

GET-вариант: `.../method.json?param=value` — для backend предпочитать **POST**.

### Ответ

```json
{ "result": ..., "time": { "duration": 0.05 } }
{ "error": "ERROR_CODE", "error_description": "..." }
```

Всегда проверять `error`. Типичные: `QUERY_LIMIT_EXCEEDED`, `NO_AUTH_FOUND`, `ACCESS_DENIED`.

### Клиент (Node)

```javascript
async function b24(method, params = {}) {
  const res = await fetch(`${process.env.B24_WEBHOOK_URL}${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (data.error) throw new Error(`${data.error}: ${data.error_description}`);
  return data.result;
}
```

### Batch (до 50 команд, считается как 1 запрос)

```javascript
await b24('batch', {
  halt: 0,
  cmd: {
    c1: 'crm.contact.add?fields[NAME]=Иван&fields[LAST_NAME]=Петров',
    d1: 'crm.deal.add?fields[CONTACT_ID]=$result[c1]&fields[TITLE]=Закрепление',
  },
});
```

### Лимиты (облако)

| Ограничение | Значение |
|-------------|----------|
| Запросов/сек | ~2 |
| Batch команд | до 50 |
| list за раз | 50 (пагинация `start`) |

При `QUERY_LIMIT_EXCEEDED`: sleep 500ms–2s, retry до 3 раз.

### Ключевые методы CRM

| Задача | Метод |
|--------|-------|
| Контакт | `crm.contact.add`, `.update`, `.get`, `.list` |
| Компания | `crm.company.add`, `.update`, `.list` |
| Сделка | `crm.deal.add`, `.update`, `.list` |
| Лид | `crm.lead.add`, `.list` |
| Дубль по телефону | `crm.duplicate.findbycomm` |
| Связь контакт–компания | `crm.contact.company.add` |
| UF-поля | `crm.{entity}.userfield.add`, `.list` |
| Воронка | `crm.dealcategory.add`, `.list` |
| Стадии | `crm.status.add`, `crm.status.list` |
| Справочник стадий | `ENTITY_ID`: `DEAL_STAGE` или `DEAL_STAGE_{categoryId}` |
| Семантика стадии | `P` процесс, `S` успех, `F` провал |
| Таймлайн | `crm.timeline.comment.add` |
| Активности | `crm.activity.add` |

### UF-поля: типы

| USER_TYPE_ID | Назначение |
|--------------|------------|
| `string` | Строка |
| `date` | Дата |
| `enumeration` | Список (передавать ID элемента LIST) |
| `crm` | Привязка к CRM-сущности (SETTINGS: CONTACT/COMPANY) |
| `employee` | Пользователь портала |
| `money` | Деньги |

Резолв enum по XML_ID:

```javascript
const fields = await b24('crm.deal.userfield.list', {});
const uf = fields.find(f => f.FIELD_NAME === 'UF_OBJECT_TYPE');
const item = uf.LIST.find(l => l.XML_ID === 'apartment');
// fields[UF_OBJECT_TYPE] = item.ID
```

---

## Вебхуки

### Входящий webhook

**Где:** Приложения → Разработчикам → Другое → Входящий вебхук.

- Выдаёт постоянный URL с токеном.
- Права задаются при создании (scope).
- Только **исходящие** вызовы REST **в** B24.
- Подходит: сервер ЛК, cron, скрипты (`setup-b24-crm.mjs`).

```
B24_WEBHOOK_URL=https://b24-s2an91.bitrix24.ru/rest/1/{token}/
```

Проверка: `POST .../app.info` → `result.SCOPE`.

### Исходящий webhook

**Где:** тот же раздел → Исходящий вебхук.

- B24 **вызывает ваш URL** при событии (`ONCRMDEALADD`, `ONCRMDEALUPDATE`, …).
- Нужен публичный HTTPS endpoint.
- Проверка подписи: параметры `application_token`, `auth[application_token]`.
- Обработчик должен отвечать быстро (< 10s); тяжёлую работу — в очередь.

Типовые события CRM:

| Событие | Когда |
|---------|-------|
| `ONCRMDEALADD` | Создана сделка |
| `ONCRMDEALUPDATE` | Обновлена сделка |
| `ONCRMCONTACTADD` | Создан контакт |
| `ONCRMDEALSTAGECHANGE` | Смена стадии (если доступно на тарифе) |

### Отличие от приложения

| | Входящий WH | Исходящий WH | Приложение |
|--|-------------|--------------|------------|
| REST в B24 | ✓ | через REST в обработчике | ✓ |
| События из B24 | ✗ | ✓ | ✓ |
| UI в CRM | ✗ | ✗ | ✓ (placement) |
| OAuth | ✗ | ✗ | ✓ (серверное) |

---

## Приложения

### Локальное приложение

- HTML/JS хостится на вашем сервере или в B24 Disk.
- Открывается **внутри iframe** портала.
- SDK: `<script src="https://api.bitrix24.com/api/v1/"></script>`
- Инициализация: `BX24.init(() => { BX24.callMethod('crm.deal.get', ...) })`
- Placement: вкладка карточки, виджет поля, кнопка тулбара.
- Регистрация: `placement.bind` + scope `placement`, `crm`.

```javascript
BX24.callMethod('placement.bind', {
  PLACEMENT: 'CRM_DEAL_DETAIL_TAB',
  HANDLER: 'https://your-host/tab.html',
  TITLE: 'Закрепление',
});
```

Типы placement: `CRM_DEAL_DETAIL_TAB`, `CRM_CONTACT_DETAIL_TAB`, `CRM_DEAL_DETAIL_TOOLBAR`, `USERFIELD_TYPE` (виджет UF).

### Серверное приложение

- OAuth 2.0: `client_id`, `client_secret`.
- Redirect URL → code → `oauth/token/` → `access_token` + `refresh_token`.
- Токен привязан к порталу (`member_id`, `domain`).
- Хранить токены в БД, обновлять через `grant_type=refresh_token`.
- Подходит: мультипортальные SaaS, ЛК с глубокой интеграцией.

### Вебхук vs локальное приложение

- **ЛК агентов** (внешний сайт) → входящий webhook на backend.
- **Виджет в карточке сделки** → локальное приложение + placement.

---

## Роботы CRM

**Где:** CRM → Настройки → Роботы (в воронке или общие).

| Элемент | Описание |
|---------|----------|
| Триггер | Создание, смена стадии, изменение поля, по расписанию |
| Условие | Поле UF, стадия, ответственный |
| Действие | Сменить стадию, задача, уведомление, **вебхук**, запуск БП |

### Пример: автобраковка закрепления (45 дней)

- Триггер: **Регулярно** (ежедневно 09:00) или при открытии сделки.
- Условие: `UF_FIXATION_UNTIL` < `{=System:Now}` AND стадия ≠ Брак AND стадия ≠ Успех.
- Действие: Сменить стадию → `C3:REJECT`; Добавить комментарий в таймлайн.

Альтернатива: робот на стадии «Новая» с задержкой 45 дней → Брак (менее точно по дате UF).

### Робот «Вебхук»

Отправляет POST на ваш URL с данными сущности — удобно синхронизировать ЛК без исходящего WH на весь портал.

---

## Бизнес-процессы (bizproc)

**Где:** CRM → Ещё → Бизнес-процессы / Настройки → Бизнес-процессы.

| | Робот | Бизнес-процесс |
|--|-------|----------------|
| Сложность | Низкая | Высокая |
| Ветвления | Ограничены | Полные |
| Ожидание | Задержка | Пауза, ожидание действия пользователя |
| REST | Через робот-вебхук | Действие «Вебхук» / REST в активити |
| Scope | crm | `bizproc` |

### Запуск БП из REST

```javascript
await b24('bizproc.workflow.start', {
  TEMPLATE_ID: 123,
  DOCUMENT_ID: ['crm', 'CCrmDocumentDeal', 'DEAL_456'],
  PARAMETERS: { UF_FIXATION_UNTIL: '2026-08-13' },
});
```

### Когда выбирать БП

- Согласование закрепления менеджером.
- Многошаговая цепочка с таймаутами и уведомлениями.
- Интеграция с 1С, документами, подписями.

Для **автобраковки по дате** достаточно робота CRM.

---

## OAuth и токены (серверное приложение)

```
1. https://{portal}/oauth/authorize/?client_id=...&response_type=code&redirect_uri=...
2. POST https://oauth.bitrix.info/oauth/token/
   grant_type=authorization_code&client_id=...&client_secret=...&code=...
3. access_token (1–2 ч), refresh_token (продлевать)
```

REST с OAuth: `https://{portal}/rest/{method}?auth={access_token}`

---

## BX24 JS SDK (локальное приложение)

```javascript
BX24.init(() => {
  BX24.callMethod('crm.deal.get', { id: 1 }, (res) => {
    if (res.error()) console.error(res.error());
    else console.log(res.data());
  });
});

// REST из placement без своего webhook:
BX24.callMethod('crm.contact.add', { fields: { NAME: 'Test' } });

// Размер iframe:
BX24.fitWindow();
```

`BX24.getAuth()` — токен текущего пользователя (короткоживущий, только в iframe).

---

## Диагностика

| Проблема | Решение |
|----------|---------|
| `NO_AUTH_FOUND` | Неверный токен / истёк OAuth |
| `ACCESS_DENIED` | Нет scope у webhook/приложения |
| `ERROR_ARGUMENT` | Неверное поле или enum ID |
| Пустой `crm.*.list` | Фильтр слишком строгий, проверить UF |
| Дубли enum | `userfield.list` → смотреть LIST[].ID |
| Медленно | batch, кэш enum, очередь |

### Полезные вызовы

```javascript
await b24('app.info');           // scope, лицензия
await b24('crm.dealcategory.list');
await b24('crm.status.list', { filter: { ENTITY_ID: 'DEAL_STAGE_3' } });
await b24('crm.deal.userfield.list', {});
await b24('profile');            // текущий пользователь webhook
```

---

## Ссылки

- [REST API (dev.1c-bitrix.ru)](https://dev.1c-bitrix.ru/rest_help/)
- [Локальные приложения](https://dev.1c-bitrix.ru/rest_help/marketplace/local_apps/index.php)
- [Вебхуки](https://dev.1c-bitrix.ru/rest_help/general/webhooks.php)
- [Бизнес-процессы REST](https://dev.1c-bitrix.ru/rest_help/bizproc/index.php)
