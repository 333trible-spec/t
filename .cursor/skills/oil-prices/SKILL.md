---
name: oil-prices
description: >-
  Котировки и график нефти Brent и Urals (USD/bbl), спред, Canvas LineChart.
  Use when the user asks about oil, нефть, Brent, Urals, баррель, нефтяной график,
  or when agent Sheikh (/sheikh) is invoked.
---

# Нефть: Brent и Urals

## Workflow

1. Запусти скрипт (из корня workspace):

```bash
node .cursor/skills/oil-prices/scripts/fetch-oil.mjs --range 3mo
```

Диапазоны: `1mo` | `3mo` | `6mo` | `1y` (флаг `--range`).

2. Прочитай JSON из stdout (или `--out path.json`).
3. Создай Canvas: `~/.cursor/projects/<workspace>/canvases/oil-brent-urals.canvas.tsx`
4. В чате: заголовок `**شيخ**`, цены, спред, markdown-ссылка на canvas.

## Источники (скрипт)

| Ряд | Источник | Примечание |
|-----|----------|------------|
| **Brent** | Yahoo Finance `BZ=F` (`query2`) | История + last |
| **Urals spot** | Trading Economics HTML | Парсинг «fell to …» |
| **Urals ряд** | Оценка: Brent − текущий дисконт | Подпись обязательна; опционально `OILPRICEAPI_KEY` |

Если `OILPRICEAPI_KEY` задан — Urals latest через OilPriceAPI (`URALS_CRUDE_USD`); история Urals всё равно оценка по дисконту, пока нет paid historical.

## Canvas

- Импорт только из `cursor/canvas`
- `LineChart`: серии Brent + Urals, `valueSuffix=" $/bbl"`
- `Stat`: Brent, Urals, Spread
- Caption: источники + дата `asOf` + пометка, если Urals оценён
- Без `fetch()` в canvas — только встроенные данные из JSON скрипта
- Не оставляй пустые графики

## Тон

Цифры и спред. Не давай торговых рекомендаций.
