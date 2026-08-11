# Cron увольнений — cron-job.org

Запланированные увольнения дергают `POST /api/dismissal-cron` **снаружи** ([cron-job.org](https://cron-job.org)), не через платформенный Cron.

## Что нужно

| # | Кто | Действие |
|---|-----|----------|
| 1 | Ты | Аккаунт на https://cron-job.org (бесплатно) |
| 2 | Ты | Секрет `DISMISSAL_CRON_SECRET` в env VibeCode (mts) |
| 3 | Ты | Два job на cron-job.org (02:00 и 03:30 YEKT) |
| 4 | Код | URL job → VibeCode, не Vercel |

## 1. Секрет на VibeCode

1. Сгенерируй строку (32+ символа), например в PowerShell:
   ```powershell
   -join ((48..57 + 65..90 + 97..122) | Get-Random -Count 40 | ForEach-Object {[char]$_})
   ```
2. Env на сервере VibeCode (`mts`): `DISMISSAL_CRON_SECRET`
3. Перезапуск/деплой бандла при необходимости

Проверка (подставь секрет):

```bash
curl -X POST "https://app-d561d9d4f2bd.vibecode.bitrix24.tech/deputy/api/dismissal-cron" \
  -H "Authorization: Bearer ТВОЙ_СЕКРЕТ"
```

Ожидается `{"ok":true,...}`. Без заголовка — `401 Unauthorized`.

## 2. Два job на cron-job.org

### Автоматически (скрипт)

1. API key: https://console.cron-job.org/settings
2. В PowerShell из корня проекта:

```powershell
$env:CRON_JOB_ORG_API_KEY = "твой-api-key-cron-job-org"
npm run setup:cron
```

Секрет берётся из `Desktop\вот тут.txt` или `DISMISSAL_CRON_SECRET`. Скрипт создаёт оба job, дубликаты не плодит.

### Вручную в консоли

Войти → **Cronjobs** → **Create cronjob** (дважды).

### Job A — основной

| Поле | Значение |
|------|----------|
| Title | `6 кадров — увольнения (02:00 YEKT)` |
| URL | `https://app-d561d9d4f2bd.vibecode.bitrix24.tech/deputy/api/dismissal-cron` |
| Request method | **POST** |
| Schedule | Every day at **02:00** |
| Timezone | **Asia/Yekaterinburg** (UTC+5) |

**Headers** (раздел Advanced / Request headers):

| Name | Value |
|------|--------|
| `Authorization` | `Bearer ТВОЙ_СЕКРЕТ` |

### Job B — страховка

То же, но:

| Поле | Значение |
|------|----------|
| Title | `6 кадров — увольнения (03:30 YEKT)` |
| Schedule | Every day at **03:30** |
| Timezone | **Asia/Yekaterinburg** |

Оба job — **Enabled**.

## 3. Проверка

1. В cron-job.org у job → **Run now** (если есть тестовый план на сегодня).
2. В приложении: таблица «Увольнения» → статус «Уволен».
3. В **Execution history** cron-job.org — HTTP **200** и тело с `"ok":true`.

## Логика на сервере

- Календарный день: **YEKT** (`Asia/Yekaterinburg`).
- Берутся планы `planned` или `error`, дата `≤ сегодня`.
- Повторный вызов безопасен: уже `done` не обрабатывается.

## 4. Делегирование заданий БП (отпуска)

Отдельные job на [cron-job.org](https://cron-job.org) → `POST /api/delegation-cron`.

### Автоматически

```powershell
$env:CRON_JOB_ORG_API_KEY = "твой-api-key"
$env:DISMISSAL_CRON_SECRET = "тот же секрет что на VibeCode"
npm run setup:delegation-cron
```

### Вручную — 4 job

| Поле | Значение |
|------|----------|
| **URL** | `https://app-d561d9d4f2bd.vibecode.bitrix24.tech/deputy/api/delegation-cron` |
| **Request method** | **POST** |
| **Timezone** | **Asia/Yekaterinburg** |
| **Enabled** | ✅ |
| **Header** | `Authorization: Bearer DISMISSAL_CRON_SECRET` |

Расписание YEKT: **08:00**, **11:00**, **14:00**, **17:00**.

Проверка: без Bearer → **401** (или **503**, если секрет не задан на VibeCode). Query `?secret=` **не** принимается.

Dry-run (только с Bearer): `?dryRun=1`.

## 5. Кнопка «10/01» в приложении

В шапке кнопка **10/01** слева от «?». По нажатию (не при старте приложения):

1. **Статус сервера** — `GET /api/server-status`: версия, хост, webhook Б24, Redis, УС #276, cron-secret, ключ cron-job.org.
2. **Cron-задания** — `GET https://api.cron-job.org/jobs` через `/api/cron-jobs`:

`Делегирование (08:00 YEKT) / Сегодня в 8:00:33 / Успешно (3,02 с) / Завтра в 8:00:00`

Нужен env на VibeCode: **`CRON_JOB_ORG_API_KEY`** (тот же ключ, что для `npm run setup:cron`). История в приложении не хранится.

---

## Откат

Vercel для этого приложения снят. Cron только через cron-job.org → VibeCode.
