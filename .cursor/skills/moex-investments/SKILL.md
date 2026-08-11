---
name: moex-investments
description: >-
  Инвестиции и котировки: MOEX (акции, облигации, фьючерсы, валюта, индексы) и другие
  биржи через Yahoo (US/EU акции). Use for stocks, акции, облигации, фьючерсы, MOEX,
  Мосбиржа, AAPL, тикер, котировки, инвестиции, /sheikh.
---

# Рынки: MOEX + другие биржи

Без персональных инвестрекомендаций — факты, котировки, контекст.

## Workflow

1. Определи тикер и биржу (auto по умолчанию).
2. Запусти:

```bash
node .cursor/skills/moex-investments/scripts/fetch-markets.mjs --ticker SBER --range 3mo
```

Флаги:
- `--ticker SBER,SI,SU26207RMFS9,USD000UTSTOM,AAPL`
- `--range 1mo|3mo|6mo|1y`
- `--exchange auto|moex|yahoo` (по умолчанию `auto`)

3. JSON → Canvas при графике.
4. В чате: `**شيخ**`, цена, изменение, venue, источник.

## Что умеет скрипт

| Тип | Где | Примеры |
|-----|-----|---------|
| Акции | MOEX TQBR | SBER, GAZP, LKOH |
| Индексы | MOEX SNDX | IMOEX, RTSI |
| Облигации | MOEX TQOB/TQCB | SU26207RMFS9, OFZ |
| Фьючерсы | MOEX FORTS | Si, RI, BR, SiZ6 |
| Валюта | MOEX SELT | USD000UTSTOM |
| Акции вне MOEX | Yahoo Finance | AAPL, MSFT, TSLA |

**СПБ Биржа:** публичного бесплатного API нет — для иностранных бумаг используем **Yahoo** (NASDAQ/NYSE и др.). Если нужен именно SPB-тикер — уточни у пользователя ISIN/код у брокера.

### Подсказки по тикерам

- `Si` / `RI` / `BR` — скрипт сам выберет ближайший ликвидный контракт FORTS
- Облигации — SECID/ISIN с MOEX (например `SU26207RMFS9`)
- `AAPL` при `auto` → Yahoo, если на MOEX не найдено

## Canvas

- `LineChart`: close по дням
- `valueSuffix`: ` ₽` | ` %` (облигации) | ` pts` (фьючерсы/индексы) | `$` / валюта Yahoo
- Caption: venue + источник + `priceNote` если есть

## Ответ Шейха

- Указывай **venue** (MOEX / NASDAQ / …) и **kind** (share/bond/future/currency)
- Для облигаций: цена в **% от номинала**
- Для фьючерсов: если спросили «Si» — покажи какой контракт подставлен (`resolvedFrom`)
- Без «покупай/продавай»

## Нефть

Brent/Urals → skill `oil-prices`, не этот.
