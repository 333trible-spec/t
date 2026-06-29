# API личного кабинета агента

Base URL: `https://{vercel-domain}/api/lk`

Авторизация: `Authorization: Bearer {jwt}` или httpOnly cookie `lk_session`.

## Auth

### POST /auth/register

Только по invite-token (опционально MVP).

```json
{ "email": "agent@mail.ru", "password": "...", "inviteToken": "..." }
```

### POST /auth/login

```json
{ "email": "agent@mail.ru", "password": "..." }
```

Response: `{ "token": "...", "agent": { "id", "email", "profileComplete": false } }`

### POST /auth/forgot-password

### POST /auth/reset-password

## Профиль агента

### GET /profile

```json
{
  "id": "uuid",
  "email": "agent@mail.ru",
  "firstName": "Иван",
  "lastName": "Петров",
  "phone": "+79991234567",
  "agency": {
    "b24CompanyId": 200,
    "title": "АН Вертикаль"
  },
  "b24ContactId": 100,
  "profileComplete": true
}
```

### PUT /profile

```json
{
  "firstName": "Иван",
  "lastName": "Петров",
  "phone": "+79991234567",
  "agency": {
    "b24CompanyId": null,
    "title": "АН Вертикаль"
  }
}
```

Логика:
- `b24CompanyId` задан → привязать к существующей компании.
- `b24CompanyId` null + `title` → создать компанию в B24.
- Синхронизировать контакт агента и `crm.contact.company.add`.

Response 200: обновлённый профиль.

## Агентства (поиск)

### GET /agencies?q={строка}&limit=20

```json
{
  "items": [
    { "b24CompanyId": 200, "title": "АН Вертикаль" },
    { "b24CompanyId": 201, "title": "Вертикаль Плюс" }
  ]
}
```

Источник: `crm.company.list` с фильтром `%TITLE` и типом агентства.

## Справочники формы закрепления

### GET /dictionaries/fixation

```json
{
  "jk": [{ "id": "ZA", "title": "ЗА" }],
  "objectTypes": [
    { "id": "apartment", "title": "Квартира" },
    { "id": "storage", "title": "Кладовая" },
    { "id": "commercial", "title": "Коммерческое помещение" }
  ]
}
```

ЖК — только «ЗА». Не отдавать другие значения.

## Закрепление клиента

### POST /fixations

Headers: `Idempotency-Key: {uuid}` (рекомендуется)

```json
{
  "clientName": "Сидоров Алексей",
  "clientPhone": "8 (999) 765-43-21",
  "objectType": "apartment",
  "jk": "ZA",
  "pdConsent": true
}
```

Валидация:
- `profileComplete === true`
- `pdConsent === true`
- `jk` только `"ZA"`
- `objectType` ∈ `apartment|storage|commercial`

**409 Conflict** — `CLIENT_EXISTS`:

```json
{
  "error": "CLIENT_EXISTS",
  "message": "Клиент уже существует в базе застройщика"
}
```

**201 Created**:

```json
{
  "id": "fix-uuid",
  "b24ContactId": 301,
  "b24DealId": 500,
  "fixationDate": "2026-06-29",
  "fixationUntil": "2026-08-13",
  "status": "sent"
}
```

### GET /fixations

Список закреплений текущего агента.

Query: `?page=1&limit=20&status=sent`

```json
{
  "items": [
    {
      "id": "fix-uuid",
      "clientName": "Сидоров Алексей",
      "clientPhone": "+79997654321",
      "objectType": "apartment",
      "jk": "ЗА",
      "fixationUntil": "2026-08-13",
      "status": "sent",
      "createdAt": "2026-06-29T10:00:00Z"
    }
  ],
  "total": 1
}
```

### GET /fixations/{id}

Деталь одной заявки (только своей).

## Cron (внутренний)

### POST /cron/expire-fixations

Header: `X-Cron-Secret: {CRON_SECRET}`

Обрабатывает сделки с истёкшим `UF_FIXATION_UNTIL`, переводит в «Брак».

Response:

```json
{ "processed": 3, "dealIds": [500, 501, 502] }
```

Настроить в Vercel Cron: `0 6 * * *` (ежедневно 06:00 UTC).

## Коды ошибок

| HTTP | error | Описание |
|------|-------|----------|
| 400 | VALIDATION_ERROR | Невалидные поля |
| 401 | UNAUTHORIZED | Нет сессии |
| 403 | PROFILE_INCOMPLETE | Нет агентства/ФИО |
| 409 | CLIENT_EXISTS | Активный лид/сделка |
| 429 | RATE_LIMIT | Слишком много запросов |
| 502 | B24_ERROR | Ошибка Bitrix24 |

## Пример серверного клиента B24

```javascript
async function b24(method, params = {}) {
  const url = process.env.B24_WEBHOOK_URL + method;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (data.error) throw new B24Error(data.error, data.error_description);
  return data.result;
}
```

Размещать в `api/lk/lib/b24.js`, не экспортировать webhook URL клиенту.
