# Стабильный URL — один раз в Б24, больше не менять

> **2026-07-17:** проект Vercel `tt` **удалён**. URL offline. Код в vault `deal-card-bg/`. Ниже — историческая инструкция на случай повторного деплоя.

**Бывший URL:**

`https://tt-two-lime.vercel.app/install.html` — **404**

Проект: ~~vercel.com/333trible-specs-projects/tt~~ — снят

## Вариант 1 — Vercel (рекомендуется: не отваливается, ПК не нужен)

Код уже в [github.com/333trible-spec/t](https://github.com/333trible-spec/t).

### Через сайт (5 минут)

1. [vercel.com/new](https://vercel.com/new) → **Import** `333trible-spec/t`
2. **Deploy** (настройки по умолчанию)
3. Скопируй URL: `https://deal-card-bg-b24.vercel.app/install.html` (или как назовёт Vercel)
4. Б24 → **Обработчик** и **Установка** = этот URL → **Сохранить** → **Переустановить**
5. `npm run app:stop` — туннель больше не нужен

### Через CLI

```powershell
cd "Me/Me/Личное/Работа/bitrix24/deal-card-bg"
npx vercel login
npm run deploy:stable
npm run verify
```

Проверка: `npm run verify` должен показать **GET 200 POST 200**.

---

## Вариант 2 — Локально (пока нет Vercel)

Фиксированный URL (не меняется при перезапуске):

`https://b24-deal-card-bg-s2an91.loca.lt/install.html`

```powershell
npm run start
```

Автозапуск при входе в Windows (один раз):

```powershell
powershell -ExecutionPolicy Bypass -File scripts/install-autostart.ps1
```

| Плюс | Минус |
|------|-------|
| URL **не меняется** | ПК должен быть включён |
| Watchdog переподнимает туннель | Сервис localtunnel иногда лежит |

---

## Что вставить в Б24 (один раз)

| Поле | Значение |
|------|----------|
| Обработчик | `…/install.html` |
| Установка | тот же |
| Scope | crm + placement + userfieldconfig |
| Только API | выкл |

После Vercel **путь больше не трогать** — обновления кода: `npm run deploy:stable`.
