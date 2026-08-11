#!/usr/bin/env node
/**
 * Котировки: MOEX (акции, облигации, фьючерсы, валюта, индексы) + Yahoo (другие биржи).
 *
 * Usage:
 *   node fetch-markets.mjs --ticker SBER [--range 3mo] [--exchange auto|moex|yahoo]
 *   node fetch-markets.mjs --ticker SU26207RMFS9,Si,USD000UTSTOM,AAPL
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const RANGE = getArg("--range", "3mo");
const OUT = getArg("--out", null);
const EXCHANGE = getArg("--exchange", "auto");
const TICKERS = parseTickers(getArg("--ticker", "SBER"));

function getArg(flag, fallback) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

function parseTickers(raw) {
  return [...new Set(raw.split(/[,\s]+/).map((t) => t.trim()).filter(Boolean))];
}

function rangeToFrom(range) {
  const d = new Date();
  const map = { "1mo": 31, "3mo": 92, "6mo": 183, "1y": 365 };
  d.setDate(d.getDate() - (map[range] ?? 92));
  return d.toISOString().slice(0, 10);
}

function round2(n) {
  if (n == null || Number.isNaN(Number(n))) return null;
  return Math.round(Number(n) * 100) / 100;
}

function cell(row, columns, name) {
  const i = columns.indexOf(name);
  return i >= 0 ? row[i] : null;
}

async function fetchJson(url, headers = {}) {
  const r = await fetch(url, {
    headers: {
      "User-Agent": "Cursor-Sheikh/1.0",
      Accept: "application/json",
      ...headers,
    },
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${url}`);
  return r.json();
}

const INDICES = new Set(["IMOEX", "RTSI", "MOEXBC", "MOEXOG", "MOEXFN", "MOEXMM"]);
const FUTURE_ASSETS = new Set([
  "SI", "RI", "BR", "GD", "MX", "SR", "GZ", "VB", "MM", "NG", "ED", "EU", "CN", "SF",
]);
const CURRENCY_TICKERS = new Set([
  "USD000UTSTOM", "EUR_RUB__TOM", "EUR000UTSTOM", "CNYRUB_TOM", "GBPRUB_TOM",
  "USDRUB_TOM", "USDRUB_TOD",
]);

function isBondTicker(t) {
  return /^(SU|RU|XS|BY|US)[A-Z0-9]{10,}$/i.test(t) || /^OFZ/i.test(t);
}

function isFutureCode(t) {
  return FUTURE_ASSETS.has(t.toUpperCase()) || /^[A-Z]{2,3}[A-Z]\d$/.test(t.toUpperCase());
}

function isLikelyYahoo(t) {
  return /^[A-Z]{1,5}$/.test(t) && !INDICES.has(t.toUpperCase()) && !isFutureCode(t);
}

function downsample(points, max = 60) {
  if (points.length <= max) return points;
  const step = Math.ceil(points.length / max);
  const out = [];
  for (let i = 0; i < points.length; i += step) out.push(points[i]);
  const last = points[points.length - 1];
  if (out[out.length - 1]?.date !== last.date) out.push(last);
  return out;
}

async function resolveFutureContract(assetCode) {
  const code = assetCode.toUpperCase();
  if (/^[A-Z]{2,3}[A-Z]\d$/.test(code)) return code;
  const url =
    "https://iss.moex.com/iss/engines/futures/markets/forts/securities.json" +
    "?iss.meta=off&securities.columns=SECID,SHORTNAME,ASSETCODE,LASTTRADEDATE,VOLTODAY" +
    "&limit=100";
  const j = await fetchJson(url);
  const cols = j.securities.columns;
  const today = new Date().toISOString().slice(0, 10);
  const rows = (j.securities.data || [])
    .filter((r) => String(cell(r, cols, "ASSETCODE")).toUpperCase() === code)
    .filter((r) => String(cell(r, cols, "LASTTRADEDATE")) >= today)
    .sort((a, b) => String(cell(a, cols, "LASTTRADEDATE")).localeCompare(String(cell(b, cols, "LASTTRADEDATE"))));
  if (!rows.length) throw new Error(`MOEX: нет активного фьючерса ${code}`);
  // ближайший ликвидный: с макс объёмом среди первых 3 экспираций
  const pick = rows
    .slice(0, 3)
    .sort((a, b) => (cell(b, cols, "VOLTODAY") || 0) - (cell(a, cols, "VOLTODAY") || 0))[0];
  return cell(pick, cols, "SECID");
}

async function moexSearchSecid(q) {
  const url =
    `https://iss.moex.com/iss/securities.json?iss.meta=off&q=${encodeURIComponent(q)}` +
    "&securities.columns=SECID,SHORTNAME,GROUP,TYPE,PRIMARY_BOARDID&limit=10";
  const j = await fetchJson(url);
  const cols = j.securities.columns;
  return (j.securities.data || [])
    .filter((r) => r.length && r[0])
    .map((r) => ({
      secid: cell(r, cols, "SECID"),
      name: cell(r, cols, "SHORTNAME"),
      group: cell(r, cols, "GROUP"),
      type: cell(r, cols, "TYPE"),
      board: cell(r, cols, "PRIMARY_BOARDID"),
    }));
}

function moexProfile(ticker, resolvedFuture = null) {
  const t = ticker.toUpperCase();
  if (INDICES.has(t)) {
    return {
      venue: "MOEX",
      kind: "index",
      engine: "stock",
      market: "index",
      board: "SNDX",
      secid: t,
      priceField: "LASTVALUE",
      changeField: "LASTCHANGEPRC",
      changeAbsField: "LASTCHANGE",
      openField: "OPENVALUE",
      unit: "pts",
      priceNote: null,
    };
  }
  if (CURRENCY_TICKERS.has(t) || t.includes("UTSTOM") || t.includes("RUB_TOM")) {
    return {
      venue: "MOEX",
      kind: "currency",
      engine: "currency",
      market: "selt",
      board: "CETS",
      secid: ticker,
      priceField: "LAST",
      changeField: "LASTCHANGEPRCNT",
      changeAbsField: "LASTCHANGE",
      openField: "OPEN",
      unit: "RUB",
      priceNote: "курс в ₽",
    };
  }
  if (resolvedFuture || isFutureCode(t)) {
    return {
      venue: "MOEX",
      kind: "future",
      engine: "futures",
      market: "forts",
      board: "RFUD",
      secid: resolvedFuture || t,
      priceField: "LAST",
      changeField: "LASTCHANGEPRCNT",
      changeAbsField: "LASTCHANGE",
      openField: "OPEN",
      fallbackPriceField: "SETTLEPRICE",
      unit: "pts",
      priceNote: "фьючерс, пункты",
    };
  }
  if (isBondTicker(t)) {
    return {
      venue: "MOEX",
      kind: "bond",
      engine: "stock",
      market: "bonds",
      board: "TQOB",
      secid: ticker,
      priceField: "LAST",
      changeField: "LASTCHANGEPRCNT",
      changeAbsField: "LASTCHANGE",
      openField: "OPEN",
      unit: "%",
      priceNote: "облигация, % от номинала",
    };
  }
  return {
    venue: "MOEX",
    kind: "share",
    engine: "stock",
    market: "shares",
    board: "TQBR",
    secid: ticker,
    priceField: "LAST",
    changeField: "LASTCHANGEPRCNT",
    changeAbsField: "LASTCHANGE",
    openField: "OPEN",
    unit: "RUB",
    priceNote: null,
  };
}

async function resolveMoexInstrument(ticker) {
  let secid = ticker;
  let resolvedFrom = null;

  if (FUTURE_ASSETS.has(ticker.toUpperCase()) && !/^[A-Z]{2,3}[A-Z]\d$/.test(ticker.toUpperCase())) {
    secid = await resolveFutureContract(ticker);
    resolvedFrom = ticker.toUpperCase();
  }

  let profile = moexProfile(ticker, secid !== ticker ? secid : null);
  profile.secid = secid;

  const tryQuote = async (p) => {
    const url =
      `https://iss.moex.com/iss/engines/${p.engine}/markets/${p.market}/boards/${p.board}/securities/${p.secid}.json` +
      "?iss.meta=off&iss.only=marketdata,securities";
    const j = await fetchJson(url);
    if (!j.marketdata?.data?.[0]) return null;
    return { j, p };
  };

  let hit = await tryQuote(profile);
  if (!hit && profile.kind === "share") {
    profile = { ...moexProfile(ticker), secid: ticker, kind: "share", board: "TQBR" };
    hit = await tryQuote(profile);
  }
  if (!hit && isBondTicker(ticker)) {
    for (const board of ["TQOB", "TQCB", "TQIR"]) {
      profile = { ...moexProfile(ticker), board, kind: "bond" };
      hit = await tryQuote(profile);
      if (hit) break;
    }
  }
  if (!hit) {
    const found = await moexSearchSecid(ticker);
    for (const row of found) {
      if (!row.board) continue;
      const engine =
        row.group === "stock_futures" ? "futures" :
        row.type === "currency" ? "currency" : "stock";
      const market =
        row.group === "stock_futures" ? "forts" :
        row.group === "stock_index" ? "index" :
        row.group === "stock_bonds" ? "bonds" :
        row.group === "currency_selt" ? "selt" : "shares";
      const p = {
        ...moexProfile(row.secid),
        engine,
        market,
        board: row.board,
        secid: row.secid,
      };
      hit = await tryQuote(p);
      if (hit) {
        profile = p;
        break;
      }
    }
  }
  if (!hit) throw new Error(`MOEX: инструмент ${ticker} не найден`);
  return { ...hit, resolvedFrom };
}

function parseMoexQuote(j, profile, ticker, resolvedFrom) {
  const md = j.marketdata.data[0];
  const sec = j.securities?.data?.[0] || [];
  const mdCols = j.marketdata.columns;
  const secCols = j.securities?.columns || [];

  let last = cell(md, mdCols, profile.priceField);
  if ((last == null || last === 0) && profile.fallbackPriceField) {
    last = cell(md, mdCols, profile.fallbackPriceField);
  }

  return {
    ticker: profile.secid,
    query: ticker,
    resolvedFrom,
    name: cell(sec, secCols, "SHORTNAME") || cell(sec, secCols, "SECNAME") || profile.secid,
    venue: profile.venue,
    kind: profile.kind,
    board: profile.board,
    market: profile.market,
    last: round2(last),
    prev: round2(cell(sec, secCols, "PREVPRICE") ?? cell(sec, secCols, "PREVSETTLEPRICE")),
    open: round2(cell(md, mdCols, profile.openField)),
    high: round2(cell(md, mdCols, "HIGH")),
    low: round2(cell(md, mdCols, "LOW")),
    changePct: round2(cell(md, mdCols, profile.changeField)),
    changeAbs: round2(cell(md, mdCols, profile.changeAbsField)),
    currency: cell(sec, secCols, "CURRENCYID") || (profile.unit === "RUB" ? "RUB" : null),
    unit: profile.unit,
    priceNote: profile.priceNote,
    updated: cell(md, mdCols, "UPDATETIME") || cell(md, mdCols, "SYSTIME"),
    isin: cell(sec, secCols, "ISIN"),
  };
}

async function fetchMoexCandles(profile, from, till) {
  const url =
    `https://iss.moex.com/iss/engines/${profile.engine}/markets/${profile.market}/boards/${profile.board}/securities/${profile.secid}/candles.json` +
    `?iss.meta=off&from=${from}&till=${till}&interval=24`;
  const j = await fetchJson(url);
  const cols = j.candles?.columns || [];
  return (j.candles?.data || [])
    .map((row) => ({
      date: String(cell(row, cols, "begin")).slice(0, 10),
      close: round2(cell(row, cols, "close")),
      open: round2(cell(row, cols, "open")),
      high: round2(cell(row, cols, "high")),
      low: round2(cell(row, cols, "low")),
      volume: cell(row, cols, "volume"),
    }))
    .filter((p) => p.close != null);
}

async function fetchMoexOne(ticker, from, till) {
  const { j, p, resolvedFrom } = await resolveMoexInstrument(ticker);
  const quote = parseMoexQuote(j, p, ticker, resolvedFrom);
  const candles = downsample(await fetchMoexCandles(p, from, till));
  return {
    quote,
    candles,
    chart: {
      categories: candles.map((pt) => pt.date.slice(5).replace("-", ".")),
      close: candles.map((pt) => pt.close),
    },
  };
}

async function fetchYahooOne(ticker, range) {
  const symbol = ticker.toUpperCase();
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=${encodeURIComponent(range)}`;
  const j = await fetchJson(url, { "User-Agent": "Mozilla/5.0" });
  const res = j?.chart?.result?.[0];
  if (!res) throw new Error(`Yahoo: нет данных для ${symbol}`);

  const ts = res.timestamp || [];
  const q = res.indicators?.quote?.[0] || {};
  const candles = [];
  for (let i = 0; i < ts.length; i++) {
    const close = q.close?.[i];
    if (close == null) continue;
    candles.push({
      date: new Date(ts[i] * 1000).toISOString().slice(0, 10),
      close: round2(close),
      open: round2(q.open?.[i]),
      high: round2(q.high?.[i]),
      low: round2(q.low?.[i]),
      volume: q.volume?.[i],
    });
  }
  const series = downsample(candles);
  const meta = res.meta || {};
  const last = round2(meta.regularMarketPrice ?? series.at(-1)?.close);
  const prev = round2(meta.chartPreviousClose ?? meta.previousClose);
  const changeAbs = last != null && prev != null ? round2(last - prev) : null;
  const changePct = changeAbs != null && prev ? round2((changeAbs / prev) * 100) : null;

  return {
    quote: {
      ticker: symbol,
      query: ticker,
      resolvedFrom: null,
      name: meta.shortName || meta.longName || symbol,
      venue: meta.fullExchangeName || meta.exchangeName || "Yahoo Finance",
      kind: "equity",
      board: null,
      market: meta.instrumentType || "stock",
      last,
      prev,
      open: round2(meta.regularMarketOpen),
      high: round2(meta.regularMarketDayHigh),
      low: round2(meta.regularMarketDayLow),
      changePct,
      changeAbs,
      currency: meta.currency || "USD",
      unit: meta.currency || "USD",
      priceNote: "биржа вне MOEX (Yahoo Finance)",
      updated: meta.regularMarketTime
        ? new Date(meta.regularMarketTime * 1000).toISOString()
        : null,
      isin: null,
    },
    candles: series,
    chart: {
      categories: series.map((pt) => pt.date.slice(5).replace("-", ".")),
      close: series.map((pt) => pt.close),
    },
  };
}

async function fetchOne(ticker, from, till, range) {
  const mode = EXCHANGE.toLowerCase();
  if (mode === "yahoo") return fetchYahooOne(ticker, range);
  if (mode === "moex") return fetchMoexOne(ticker, from, till);

  // auto: MOEX first for RU-style tickers, else try MOEX then Yahoo
  const preferMoex =
    INDICES.has(ticker.toUpperCase()) ||
    CURRENCY_TICKERS.has(ticker.toUpperCase()) ||
    isBondTicker(ticker) ||
    isFutureCode(ticker) ||
    ticker.includes("_") ||
    !isLikelyYahoo(ticker);

  if (preferMoex) {
    try {
      return await fetchMoexOne(ticker, from, till);
    } catch (e) {
      if (isLikelyYahoo(ticker)) return fetchYahooOne(ticker, range);
      throw e;
    }
  }

  try {
    return await fetchMoexOne(ticker, from, till);
  } catch {
    return fetchYahooOne(ticker, range);
  }
}

async function main() {
  const from = rangeToFrom(RANGE);
  const till = new Date().toISOString().slice(0, 10);
  const items = [];
  const errors = [];

  for (const ticker of TICKERS) {
    try {
      items.push(await fetchOne(ticker, from, till, RANGE));
    } catch (e) {
      errors.push({ ticker, error: String(e.message || e) });
    }
  }

  if (!items.length) {
    throw new Error(errors.map((e) => `${e.ticker}: ${e.error}`).join("; "));
  }

  const payload = {
    asOf: new Date().toISOString(),
    range: RANGE,
    exchange: EXCHANGE,
    from,
    till,
    sources: ["MOEX ISS (iss.moex.com)", "Yahoo Finance (query2)"],
    items,
    errors: errors.length ? errors : undefined,
  };

  const text = JSON.stringify(payload, null, 2);
  if (OUT) {
    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, text, "utf8");
  }
  process.stdout.write(text + "\n");
}

main().catch((e) => {
  console.error(String(e?.stack || e));
  process.exit(1);
});
