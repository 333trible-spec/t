# Общий JSON-фид

Объединяет три экспорта Venus в один ответ формата **v:2** (как у квартир).

| | |
|---|---|
| **Папка** | `bitrix24/общий-json-фид/` |
| **Хостинг** | Vercel |
| **Production** | https://obshchiy-json-feed.vercel.app |
| **Dashboard** | [obshchiy-json-feed](https://vercel.com/333trible-specs-projects/obshchiy-json-feed) |
| **Формат выхода** | `{ v: 2, projects: [{ id, title, stages, houses_without_stage }] }` |
| **Порядок домов** | квартиры → кладовые → коммерция (в одном `houses_without_stage`) |
| **Проект** | один: id **13**, title **«ЖК Зеленые Аллеи»** |
| **Расписание (YEKT)** | 8–21 каждый час; ночью **00**, **06**, **21** |

## Источники

1. Квартиры (уже v:2) — `664d240c-e863-4920-9ded-494615ea00f9`
2. Кладовые (v:1 → вложенная схема) — `71cb1bb2-330d-463b-a65f-93a842c6161b`
3. Коммерция (v:1 → вложенная схема) — `6c41c8a9-3d9e-4d73-bada-9502c48c50f7`

База: `https://nav.venus.xamtal.ru/export/JSON/`

## Эндпоинты

- `GET /` и `GET /api/feed` — отдать снимок (из Redis/кэша, иначе собрать)
- `POST /api/refresh` — принудительно обновить (Bearer `FEED_CRON_SECRET`)

## Расписание

Тюмень (`Asia/Yekaterinburg`): часы **0, 6, 8, 9, …, 21**.  
Job’ы на [cron-job.org](https://cron-job.org) → `POST /api/refresh`.  
(Vercel Hobby не даёт частые Cron — только внешний cron-job.org.)

Env: `FEED_CRON_SECRET`, желательно Upstash Redis (`UPSTASH_REDIS_REST_URL` / `TOKEN`) — иначе кэш только memory+/tmp на инстансе.

## Деплой

```powershell
cd "Me/Me/Личное/Работа/bitrix24/общий-json-фид"
npm run deploy
npm run setup:cron
```
