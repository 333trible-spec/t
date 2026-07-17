# Цвет карточки сделки (deal-card-bg)

Локальное приложение Битрикс24: поле и вкладка «Цвет фона» карточки сделки.

## Связи

| | |
|---|---|
| **Папка в vault** | `bitrix24/deal-card-bg/` |
| **GitHub (деплой)** | [333trible-spec/t](https://github.com/333trible-spec/t) |
| **Vercel** | **снят** (2026-07-17) — проект `tt` удалён |
| **URL** | ~~https://tt-two-lime.vercel.app~~ — offline |
| **Портал (тест)** | b24-s2an91, app **1** — URL в приложении Б24 отвязать вручную, если ещё указывает на Vercel |

## Структура (дом и работа)

| Путь | В git | Назначение |
|------|-------|------------|
| `app/public/` | да (кроме `*-url.json`, `version.json`, `deal-card-bg.user.js`) | Статика приложения |
| `userscript/deal-card-bg.user.js` | да | **Источник** userscript → копируется в `app/public/` |
| `github-pages/` | да | Шаблон Vercel (`api/serve.js`, `vercel.json`) |
| `.github-pages/` | **нет** | Сборка деплоя → push в `t` → Vercel |
| `site/` | да | Альтернатива: сайты Б24 (`npm run site:publish`) |
| `local-dev.json` | **нет** | Поддомен localtunnel — см. `local-dev.json.example` |
| `static-urls.json` | да | Кэш URL после деплоя |

**Не дублировать** `.github-pages/` в git — она пересобирается `npm run publish:github`.

## Деплой

```powershell
cd "Me/Me/Личное/Работа/bitrix24/deal-card-bg"
npm run deploy:stable
```

Локальный сервер: `npm run app:start` (перед стартом копирует userscript в `app/public/`).

Подробнее: [[СТАБИЛЬНЫЙ-URL]], [[ИНСТРУКЦИЯ]].
