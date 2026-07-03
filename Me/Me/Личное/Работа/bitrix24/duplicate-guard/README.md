# Duplicate Guard — контроль дублей лидов в Битрикс24

Локальное приложение: настраиваемые сценарии при создании лида, проверка по телефону/email, действия «браковать» или «оставить».

**Production:** https://b24-duplicate-guard.vercel.app

Регистрация на портале: [docs/B24-APP-REGISTER.md](docs/B24-APP-REGISTER.md)

## Сценарии

| ID | Условие |
|----|---------|
| `ACTIVE_LEAD_NEW_LEAD` | Есть другой **активный лид** с тем же телефоном/email |
| `ACTIVE_DEAL_CONTACT_NEW_LEAD` | Есть **активная сделка** (в выбранных воронках) и контакт |
| `CONTACT_NEW_LEAD` | Есть **контакт**, нет активного лида/сделки по фильтрам |
| `NO_LEAD_NO_DEAL_NEW_LEAD` | Дубль в CRM есть, но нет активных лида/сделки |
| `NO_DEAL_NO_CONTACT_NEW_LEAD` | Полностью новый клиент (дублей нет) |

Для каждого сценария: **оставить активным** или **браковать** (стадия лида, напр. `JUNK`).

## Возможности UI

- Выбор **воронок сделок**, участвующих в проверке
- **Отдельные правила на воронку**: активные стадии лидов и сделок, матрица сценариев
- Вкладка **«Общие»** — правила по умолчанию, если сделка не в выбранной воронке

## Архитектура

```
Новый лид → исходящий webhook ONCRMLEADADD → /api/webhook/lead-add
  → duplicate.findbycomm
  → проверка лидов/сделок по стадиям из конфига
  → detectScenario()
  → crm.lead.update (брак) или без изменений
```

Конфиг: `app.option` → `duplicate_guard_config` (JSON).

## Установка

1. Задеплоить на Vercel (или свой HTTPS-хост).
2. В B24: **Локальное приложение**, URL установки → `https://{host}/install.html`
3. Scope: `crm`, `user`, `placement` (опционально).
4. Нажать **Установить** — привязка `ONCRMLEADADD`.
5. Открыть **settings.html** — настроить воронки и сценарии.

## Локальная разработка

```powershell
cd C:\Users\mitkinMV\Desktop\b24-duplicate-guard
npm run dev
```

Для webhook нужен **публичный HTTPS** (ngrok / Vercel).

## Env

| Переменная | Назначение |
|------------|------------|
| `OUTGOING_APP_TOKEN` | Проверка `application_token` в событии |
| `B24_WEBHOOK_URL` | Для скриптов отладки |

## Структура

```
api/
  lib/defaults.js    — схема конфига
  lib/scenarios.js   — определение сценария
  lib/engine.js      — обработка лида
  lib/b24.js         — REST
  webhook/lead-add.js
  html/install.html, settings.html
```

## Статус

MVP: движок + UI настроек + установщик. Требуется деплой и регистрация приложения на портале.
