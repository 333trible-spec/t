# B24 REST — справочник для ЛК агентов

> Общая платформа (API, вебхуки, приложения, БП): [b24-platform.md](b24-platform.md)

## Scope приложения / webhook

Минимум: `crm`, `user`. Для роботов/cron — достаточно входящего webhook с правами CRM.

## Пользовательские поля (создать на портале)

### Контакт агента

| Код | Тип | Назначение |
|-----|-----|------------|
| `UF_AGENT_LK_ID` | string | UUID/id в БД ЛК |
| `UF_CONTACT_ROLE` | list | «Агент» |

### Компания (агентство)

| Код | Тип | Назначение |
|-----|-----|------------|
| `UF_AGENCY_LK_ID` | string | id в БД (если кэшируем) |
| `UF_COMPANY_TYPE` | list | «Агентство недвижимости» |

### Контакт покупателя

| Код | Тип | Назначение |
|-----|-----|------------|
| `UF_AGENT_CONTACT_ID` | crm | Привязка к контакту агента |
| `UF_AGENCY_COMPANY_ID` | crm | Привязка к компании агентства |
| `UF_FIXATION_DATE` | date | Дата закрепления |
| `UF_FIXATION_UNTIL` | date | Дата окончания (+45 дней) |
| `UF_CONTACT_SOURCE` | string | «ЛК агента» |

### Сделка закрепления

| Код | Тип | Назначение |
|-----|-----|------------|
| `UF_JK` | list | ЖК — только «ЗА» |
| `UF_OBJECT_TYPE` | list | квартира / кладовая / коммерческое помещение |
| `UF_AGENT_CONTACT_ID` | crm | Контакт агента |
| `UF_AGENCY_COMPANY_ID` | crm | Агентство |
| `UF_FIXATION_DATE` | date | Дата закрепления |
| `UF_FIXATION_UNTIL` | date | +45 дней |
| `UF_FIXATION_LK_ID` | string | id заявки в ЛК |

Значения `UF_OBJECT_TYPE` (enum):

- `apartment` → «Квартира»
- `storage` → «Кладовая»
- `commercial` → «Коммерческое помещение»

ЖК `UF_JK`: одно значение `ZA` → «ЗА».

## REST-вызовы

### Нормализация телефона

```javascript
function normalizePhone(raw) {
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length === 11 && digits[0] === '8') return '+7' + digits.slice(1);
  if (digits.length === 11 && digits[0] === '7') return '+' + digits;
  if (digits.length === 10) return '+7' + digits;
  throw new Error('INVALID_PHONE');
}
```

### Поиск дубля

```http
POST {B24_WEBHOOK_URL}crm.duplicate.findbycomm
{
  "entity_type": "CONTACT",
  "type": "PHONE",
  "values": ["+79991234567"]
}
```

Ответ: `result.CONTACT` — массив ID или пусто.

### Проверка активных лидов

```http
POST {B24_WEBHOOK_URL}crm.lead.list
{
  "filter": {
    "CONTACT_ID": 123,
    "!STATUS_ID": ["CONVERTED", "JUNK"]
  },
  "select": ["ID", "STATUS_ID", "TITLE"]
}
```

Если `total` > 0 → клиент занят.

### Проверка активных сделок

```http
POST {B24_WEBHOOK_URL}crm.deal.list
{
  "filter": {
    "CONTACT_ID": 123,
    "CATEGORY_ID": {B24_DEAL_CATEGORY_ID},
    "!STAGE_SEMANTIC_ID": ["S", "F"]
  },
  "select": ["ID", "STAGE_ID", "TITLE"]
}
```

`STAGE_SEMANTIC_ID`: `S` = success, `F` = fail. Уточнить на портале; при необходимости фильтровать по конкретным `STAGE_ID`.

Дополнительно: если сделка в стадии «Брак» — не считать активной (разрешить повторное закрепление по бизнес-правилу).

### Создание компании (агентство)

```http
POST {B24_WEBHOOK_URL}crm.company.add
{
  "fields": {
    "TITLE": "АН Вертикаль",
    "UF_COMPANY_TYPE": "agency",
    "COMMENTS": "Создано из ЛК агента"
  }
}
```

### Создание контакта агента

```http
POST {B24_WEBHOOK_URL}crm.contact.add
{
  "fields": {
    "NAME": "Иван",
    "LAST_NAME": "Петров",
    "EMAIL": [{"VALUE": "agent@mail.ru", "VALUE_TYPE": "WORK"}],
    "PHONE": [{"VALUE": "+79991234567", "VALUE_TYPE": "MOBILE"}],
    "UF_AGENT_LK_ID": "uuid-from-db",
    "UF_CONTACT_ROLE": "agent"
  }
}
```

### Привязка контакта к компании

```http
POST {B24_WEBHOOK_URL}crm.contact.company.add
{
  "fields": {
    "CONTACT_ID": 100,
    "COMPANY_ID": 200,
    "IS_PRIMARY": "Y"
  }
}
```

### Поиск агентств

```http
POST {B24_WEBHOOK_URL}crm.company.list
{
  "filter": {
    "%TITLE": "Вертикаль",
    "UF_COMPANY_TYPE": "agency"
  },
  "select": ["ID", "TITLE"],
  "order": {"TITLE": "ASC"}
}
```

### Создание контакта покупателя + сделки

```http
POST {B24_WEBHOOK_URL}crm.contact.add
{
  "fields": {
    "NAME": "Алексей",
    "LAST_NAME": "Сидоров",
    "PHONE": [{"VALUE": "+79997654321", "VALUE_TYPE": "MOBILE"}],
    "UF_AGENT_CONTACT_ID": 100,
    "UF_AGENCY_COMPANY_ID": 200,
    "UF_FIXATION_DATE": "2026-06-29",
    "UF_FIXATION_UNTIL": "2026-08-13",
    "UF_CONTACT_SOURCE": "ЛК агента"
  }
}
```

```http
POST {B24_WEBHOOK_URL}crm.deal.add
{
  "fields": {
    "TITLE": "Закрепление: Сидоров А. — ЗА",
    "CONTACT_ID": 301,
    "COMPANY_ID": 200,
    "CATEGORY_ID": 0,
    "STAGE_ID": "NEW",
    "UF_JK": "ZA",
    "UF_OBJECT_TYPE": "apartment",
    "UF_AGENT_CONTACT_ID": 100,
    "UF_AGENCY_COMPANY_ID": 200,
    "UF_FIXATION_DATE": "2026-06-29",
    "UF_FIXATION_UNTIL": "2026-08-13",
    "UF_FIXATION_LK_ID": "fix-uuid"
  }
}
```

### Автобраковка (cron)

```http
POST {B24_WEBHOOK_URL}crm.deal.list
{
  "filter": {
    "<=UF_FIXATION_UNTIL": "2026-06-28",
    "CATEGORY_ID": 0,
    "!STAGE_ID": ["LOSE", "BRAK_STAGE_ID"]
  },
  "select": ["ID", "UF_FIXATION_UNTIL", "STAGE_ID"]
}
```

```http
POST {B24_WEBHOOK_URL}crm.deal.update
{
  "id": 500,
  "fields": {
    "STAGE_ID": "BRAK_STAGE_ID",
    "COMMENTS": "Автобраковка: истёк срок закрепления 45 дней"
  }
}
```

### Пакетный вызов (снижение лимита)

```http
POST {B24_WEBHOOK_URL}batch
{
  "halt": 0,
  "cmd": {
    "contact": "crm.contact.add?fields[NAME]=...",
    "deal": "crm.deal.add?fields[CONTACT_ID]=$result[contact]&fields[TITLE]=..."
  }
}
```

## Робот B24 (альтернатива cron)

Триггер: ежедневно 09:00. Условие: `UF_FIXATION_UNTIL` < `{=System:Now}` AND стадия не финальная. Действие: сменить стадию на «Брак», добавить комментарий.

## Схема БД (минимум)

```sql
-- agents
id, email, password_hash, first_name, last_name, phone,
b24_contact_id, b24_company_id, status, created_at

-- fixation_requests
id, agent_id, client_name, client_phone, object_type, jk_code,
b24_contact_id, b24_deal_id, fixation_until, status,
error_code, idempotency_key, created_at

-- agencies_cache (опционально)
b24_company_id, title, normalized_title, updated_at
```

Статусы fixation: `pending`, `sent`, `client_exists`, `error`, `expired`.

## Ошибки для агента (UI)

| Код API | Сообщение |
|---------|-----------|
| `CLIENT_EXISTS` | Клиент уже существует в базе застройщика |
| `PROFILE_INCOMPLETE` | Заполните профиль и выберите агентство |
| `INVALID_PHONE` | Некорректный номер телефона |
| `B24_ERROR` | Временная ошибка, попробуйте позже |
| `FIXATION_SENT` | Клиент закреплён до {date} |
