# Битрикс24 REST API — справочник

## Базовый URL

```
POST https://{portal}.bitrix24.ru/rest/{user_id}/{token}/{method}
Content-Type: application/json
{ ...params }
```

GET: `.../method.json?param=value` — для backend предпочитать **POST**.

## Ответ

```json
{ "result": ..., "time": { "duration": 0.05 } }
{ "error": "ERROR_CODE", "error_description": "..." }
```

Типичные ошибки: `QUERY_LIMIT_EXCEEDED`, `NO_AUTH_FOUND`, `ACCESS_DENIED`, `ERROR_ARGUMENT`.

## Batch (до 50 команд = 1 запрос)

```javascript
await b24('batch', {
  halt: 0,
  cmd: {
    c1: 'crm.contact.add?fields[NAME]=Иван&fields[LAST_NAME]=Петров',
    d1: 'crm.deal.add?fields[CONTACT_ID]=$result[c1]&fields[TITLE]=Закрепление',
  },
});
```

## Лимиты (облако)

| Ограничение | Значение |
|-------------|----------|
| Запросов/сек | ~2 |
| Batch команд | до 50 |
| list за раз | 50 (пагинация `start`) |

При `QUERY_LIMIT_EXCEEDED`: sleep 500ms–2s, retry до 3 раз.

## Ключевые методы CRM

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

## UF-поля: типы

| USER_TYPE_ID | Назначение |
|--------------|------------|
| `string` | Строка |
| `date` | Дата |
| `enumeration` | Список (передавать ID элемента LIST) |
| `crm` | Привязка к CRM-сущности |
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

- Постоянный URL с токеном.
- Права задаются при создании (scope).
- Только исходящие вызовы REST **в** B24.
- Подходит: сервер, cron, скрипты.

Проверка: `POST .../app.info` → `result.SCOPE`.

### Исходящий webhook

- B24 вызывает ваш URL при событии (`ONCRMDEALADD`, `ONCRMDEALUPDATE`, …).
- Нужен публичный HTTPS endpoint.
- Обработчик < 10s; тяжёлую работу — в очередь.

| Событие | Когда |
|---------|-------|
| `ONCRMDEALADD` | Создана сделка |
| `ONCRMDEALUPDATE` | Обновлена сделка |
| `ONCRMCONTACTADD` | Создан контакт |

### Сравнение

| | Входящий WH | Исходящий WH | Приложение |
|--|-------------|--------------|------------|
| REST в B24 | ✓ | через REST в обработчике | ✓ |
| События из B24 | ✗ | ✓ | ✓ |
| UI в CRM | ✗ | ✗ | ✓ (placement) |
| OAuth | ✗ | ✗ | ✓ (серверное) |

---

## Приложения

### Локальное приложение

- HTML/JS в iframe портала.
- SDK: `<script src="https://api.bitrix24.com/api/v1/"></script>`
- `BX24.init(() => { BX24.callMethod('crm.deal.get', ...) })`
- Placement: `CRM_DEAL_DETAIL_TAB`, `CRM_CONTACT_DETAIL_TAB`, `CRM_DEAL_DETAIL_TOOLBAR`, `USERFIELD_TYPE`

```javascript
BX24.callMethod('placement.bind', {
  PLACEMENT: 'CRM_DEAL_DETAIL_TAB',
  HANDLER: 'https://your-host/tab.html',
  TITLE: 'Закрепление',
});
```

### Серверное приложение

- OAuth 2.0: `client_id`, `client_secret`.
- code → `oauth/token/` → `access_token` + `refresh_token`.
- Хранить токены в БД, обновлять через `grant_type=refresh_token`.

### OAuth flow

```
1. https://{portal}/oauth/authorize/?client_id=...&response_type=code&redirect_uri=...
2. POST https://oauth.bitrix.info/oauth/token/
   grant_type=authorization_code&client_id=...&client_secret=...&code=...
3. access_token (1–2 ч), refresh_token (продлевать)
```

REST с OAuth: `https://{portal}/rest/{method}?auth={access_token}`

---

## BX24 JS SDK

```javascript
BX24.init(() => {
  BX24.callMethod('crm.deal.get', { id: 1 }, (res) => {
    if (res.error()) console.error(res.error());
    else console.log(res.data());
  });
});
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
| Пустой `crm.*.list` | Фильтр слишком строгий |
| Медленно | batch, кэш enum, очередь |

### Полезные вызовы

```javascript
await b24('app.info');
await b24('crm.dealcategory.list');
await b24('crm.status.list', { filter: { ENTITY_ID: 'DEAL_STAGE_3' } });
await b24('crm.deal.userfield.list', {});
await b24('profile');
```
