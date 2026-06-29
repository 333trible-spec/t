---
name: b24-rest-api
description: >-
  REST API Битрикс24: входящие/исходящие вебхуки, batch, OAuth, локальные и серверные приложения,
  placement, BX24 JS SDK, лимиты, CRM-методы, UF-поля, диагностика ошибок.
  Use when working with Bitrix24 REST, webhooks, crm.* methods, batch, OAuth, local/server apps,
  placement, BX24 SDK, or API integration code.
---

# Битрикс24 — REST API

Skill для интеграций через REST: вебхуки, приложения, CRM-методы.

## Что читать

| Задача | Файл |
|--------|------|
| Методы, вебхуки, OAuth, приложения, лимиты | [reference.md](reference.md) |
| UF-поля и вызовы проекта ЛК | `../b24-agent-lk/reference.md` |
| Платформа целиком (роботы, БП) | `../b24-agent-lk/b24-platform.md` |

## Быстрый выбор способа

```
Только вызовы REST с сервера?
  → Входящий webhook

События из B24 (сделка создана, стадия)?
  → Исходящий webhook или приложение

UI в карточке CRM?
  → Локальное приложение + placement + BX24 SDK

OAuth, мультипортал, refresh token?
  → Серверное приложение
```

## Правила (всегда)

- Webhook URL и OAuth secret — **только backend**, не в frontend/git.
- Scope минимальный (`crm`, `user`, `bizproc` — по задаче).
- Облако: ~**2 req/s** — `batch`, очередь, retry с backoff.
- ENUM/UF: передавать **ID значения списка**, не текст.
- POST вместо GET (секрет не в URL-логах).
- Всегда проверять `error` / `error_description` в ответе.

## Базовый клиент

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

## Чеклист перед деплоем

- [ ] Метод REST и формат POST
- [ ] Обработка `QUERY_LIMIT_EXCEEDED` (sleep + retry)
- [ ] UF-поля созданы, enum ID резолвятся перед `*.add`
- [ ] Стадии: `crm.status.list` по `DEAL_STAGE_{categoryId}`
- [ ] Секреты в `.env`, не в репозитории

## Ссылки

- [REST API](https://dev.1c-bitrix.ru/rest_help/)
- [Вебхуки](https://dev.1c-bitrix.ru/rest_help/general/webhooks.php)
- [Локальные приложения](https://dev.1c-bitrix.ru/rest_help/marketplace/local_apps/index.php)
