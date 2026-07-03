# Хостинг deal-card-bg (Vercel)

Шаблоны serverless-роутинга. Статика берётся из `../app/public/` при `npm run publish:github`.

**Install URL (прод):** https://tt-two-lime.vercel.app/install.html

GitHub Pages **не используется** — POST при установке Б24 даёт 405. Деплой: репозиторий [333trible-spec/t](https://github.com/333trible-spec/t) → Vercel project `tt`.

## Деплой из проекта deal-card-bg

```powershell
cd "Me/Me/Личное/Работа/bitrix24/deal-card-bg"
npm run deploy:stable
npm run verify
```

Сборка попадает в `.github-pages/` (не в git vault), затем push в `t` и `vercel deploy`.

## Битрикс24

1. Разработчикам → приложение → **Обработчик** и **Установка** = URL `…/install.html` на Vercel
2. **Сохранить** → **Переустановить**

Не использовать URL с Диска Б24 (`download/?token=…`) — iframe не откроет HTML.
