# Регистрация локального приложения — 6 кадров

Портал: **https://ik-navigator.bitrix24.ru/**

Production (VibeCode): см. [[../static-urls.json|static-urls.json]]

| Страница | URL |
|----------|-----|
| **Обработчик** | https://app-d561d9d4f2bd.vibecode.bitrix24.tech/app.html |
| **Установка** | https://app-d561d9d4f2bd.vibecode.bitrix24.tech/install.html |

## 1. Создать локальное приложение

1. Открой https://ik-navigator.bitrix24.ru/
2. **Разработчикам** → **Другое** → **Локальное приложение**
3. Заполни:

| Поле | Значение |
|------|----------|
| Название | **6 кадров** |
| **Путь вашего обработчика** | `https://app-d561d9d4f2bd.vibecode.bitrix24.tech/app.html` |
| **Путь для первоначальной установки** | `https://app-d561d9d4f2bd.vibecode.bitrix24.tech/install.html` |
| Использует только API | Нет |

4. **Права (scope):**

| Scope | Зачем |
|-------|--------|
| **user** | `user.current` (ACL 24880), селектор сотрудников |
| **bizproc** | позже — запись GlobalConst через служебный БП |

На старте достаточно **user**. `bizproc` добавь, когда подключим запись констант.

**Webhook `B24_NAV_WEBHOOK`** (сервер, env на VibeCode/mts) для увольнений:

| Scope | Зачем |
|-------|--------|
| **user** | деактивация сотрудника (`user.update`) |
| **intranet** | отмена приглашения (если появится в REST) |
| **lists** | универсальный список «6 кадров — записи» (`lists.element.*`) |

Смарт-процесс HR **не используется**. Планы увольнений — **Redis** (Upstash) на сервере VibeCode.

### Redis (env на VibeCode)

На сервере `mts` должны быть `UPSTASH_REDIS_REST_URL` и `UPSTASH_REDIS_REST_TOKEN` (не на Vercel).

Без Redis API увольнений вернёт ошибку с подсказкой.

Таблица «Отпуска» читает HR (смарт-процесс, стадия «Оформление») — endpoint `/api/hr-vacations`, scope **crm** нужен только webhook для отпусков. Env `B24_NAV_WEBHOOK` на VibeCode (не коммитить).

**Cron** (запланированные увольнения): внешний [cron-job.org](https://cron-job.org) → `POST /api/dismissal-cron` в **02:00** и **03:30 YEKT**. Обязательно env `DISMISSAL_CRON_SECRET` на VibeCode. Пошагово: [[CRON-JOB-ORG.md]].

5. **Сохранить** → **Установить** / **Переустановить** → дождись страницы install.

## 2. Доступ

В UI приложения доступ только у [user 24880](https://ik-navigator.bitrix24.ru/company/personal/user/24880/).

В настройках приложения Б24 список «Доступ» можно оставить пустым (всем видно пункт меню) — чужим всё равно покажется «Доступ запрещён». Или ограничь пункт меню только себе.

## 3. Проверка

1. Под 24880 открой **6 кадров** из меню → вкладки Отпуск / Увольнение.
2. Под другим сотрудником → «Доступ запрещён».
3. Селектор сотрудников — штатный BX24.

## Деплой обновлений

Production — **VibeCode** (`mts`), не Vercel. Обновляй бандл `vibecode-bundle` / деплой на `mts`.
Vercel-проект **b24-six-staff** снят.