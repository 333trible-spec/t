---
name: b24-agent-lk
description: >-
  Эксперт по Битрикс24: REST API, входящие/исходящие вебхуки, локальные и серверные приложения,
  OAuth, placement, роботы CRM, бизнес-процессы (bizproc), UF-поля, воронки, batch, лимиты.
  Проект ЛК агентов недвижимости для застройщика (закрепление клиентов, агентства, сделки).
  Use when working with Bitrix24 integration, b24-s2an91, CRM automation, webhooks, REST methods,
  crm.deal/contact/company, robots, bizproc workflows, or agent cabinet (ЛК агента).
---

# Битрикс24 + ЛК агентов

Skill для интеграций с Битрикс24 и проекта ЛК агентов застройщика.

**Тестовый портал:** `b24-s2an91.bitrix24.ru`

## Что читать первым

| Задача | Файл |
|--------|------|
| REST API, вебхуки, OAuth, приложения | `../b24-rest-api/SKILL.md` |
| Бизнес-процессы bizproc | `../b24-bizproc/SKILL.md` |
| Платформа целиком (роботы + БП кратко) | [b24-platform.md](b24-platform.md) |
| UF-поля, методы CRM проекта | [reference.md](reference.md) |
| API личного кабинета | [api-spec.md](api-spec.md) |

## Выбор способа интеграции

```
Нужна только отправка/чтение CRM с сервера?
  → Входящий webhook (быстро, один токен, только REST)

Нужны события из B24 (создана сделка, смена стадии)?
  → Исходящий webhook ИЛИ локальное/серверное приложение

UI внутри карточки CRM (вкладка, поле, кнопка)?
  → Локальное приложение + placement + BX24 JS SDK

Сложная логика, внешний сервис, OAuth?
  → Серверное приложение (OAuth 2.0, refresh token)

Автоматизация по условиям в CRM?
  → Роботы CRM (простое) или Бизнес-процессы bizproc (сложное)
```

## Правила безопасности (всегда)

- Webhook URL и OAuth secret **только на backend**, не в frontend/git.
- Scope минимально необходимый (`crm`, `user`, `bizproc` — по задаче).
- Облако: ~**2 req/s** — `batch`, очередь, retry с backoff.
- ENUM/UF: передавать **ID значения списка**, не текст (кроме XML_ID где работает).

## Термины проекта ЛК

| Термин | Значение |
|--------|----------|
| **Застройщик** | Владелец портала B24 |
| **Агент** | Партнёр-риелтор, пользователь ЛК |
| **Агентство** | Company в B24 |
| **Покупатель** | Контакт в форме закрепления |
| **ЖК** | Сейчас только **«ЗА»** |

## Бизнес-правила ЛК (обязательные)

1. **Дубли**: `crm.duplicate.findbycomm` → активный лид/сделка → «Клиент уже существует».
2. **Закрепление**: 45 дней (`UF_FIXATION_UNTIL`), потом стадия **«Брак»** (робот или cron).
3. **Закрепление**: контакт покупателя + сделка в воронке «Закрепления агентов».
4. **Агентство**: свободное название + поиск `crm.company.list`.
5. **ЖК** только «ЗА»; тип объекта: квартира / кладовая / коммерция.

## Потоки ЛК (кратко)

### Онбординг агента
`crm.company.add|update` → `crm.contact.add|update` → `crm.contact.company.add` → сохранить ID в БД.

### Закрепление клиента
`duplicate.findbycomm` → проверка лидов/сделок → `crm.contact.add` → `crm.deal.add` (category_id=3).

### Автобраковка
Робот: `UF_FIXATION_UNTIL` < сегодня → `C3:REJECT`. Или cron + `crm.deal.update`.

## Env проекта

| Переменная | Назначение |
|------------|------------|
| `B24_WEBHOOK_URL` | `https://{portal}/rest/{user}/{token}/` |
| `B24_DEAL_CATEGORY_ID` | `3` (воронка закреплений) |
| `B24_DEAL_STAGE_NEW` | `C3:NEW` |
| `B24_DEAL_STAGE_REJECT` | `C3:REJECT` |
| `JWT_SECRET` | Сессии ЛК |

Скрипт настройки CRM: `npm run setup:b24`

## Чеклист интеграции

- [ ] Метод REST и формат POST (не GET с секретом в URL в логах)
- [ ] Обработка `error` / `error_description` в ответе
- [ ] UF-поля созданы, enum ID резолвятся перед `*.add`
- [ ] Стадии: `crm.status.list` по `DEAL_STAGE_{categoryId}`
- [ ] Секреты в `.env.local`, не в репозитории

## Статус проекта

Пауза. Реализовано: auth, profile→B24, agencies. Далее: `POST /fixations`. См. `docs/PROJECT-STATE.md`.
