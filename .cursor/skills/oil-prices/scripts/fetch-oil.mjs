#!/usr/bin/env node
/**
 * Fetch Brent (Yahoo BZ=F) + Urals spot (Trading Economics / optional OilPriceAPI).
 * Urals series = Brent − current discount (labeled estimated) unless better source exists.
 *
 * Usage:
 *   node fetch-oil.mjs [--range 1mo|3mo|6mo|1y] [--out path.json]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const RANGE = (() => {
  const i = process.argv.indexOf("--range");
  return i >= 0 ? process.argv[i + 1] : "3mo";
})();
const OUT = (() => {
  const i = process.argv.indexOf("--out");
  return i >= 0 ? process.argv[i + 1] : null;
})();

const UA = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json,text/html,*/*",
};

function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}

function ymd(tsSec) {
  const d = new Date(tsSec * 1000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function fetchBrentYahoo(range) {
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/BZ=F?interval=1d&range=${encodeURIComponent(range)}`;
  const json = await fetch(url, { headers: UA }).then((r) => {
    if (!r.ok) throw new Error(`Yahoo HTTP ${r.status}`);
    return r.json();
  });
  const res = json?.chart?.result?.[0];
  if (!res) throw new Error("Yahoo: empty chart result");
  const ts = res.timestamp || [];
  const closes = res.indicators?.quote?.[0]?.close || [];
  const points = [];
  for (let i = 0; i < ts.length; i++) {
    const v = closes[i];
    if (v == null || Number.isNaN(v)) continue;
    points.push({ date: ymd(ts[i]), brent: round2(v) });
  }
  const last = res.meta?.regularMarketPrice ?? points.at(-1)?.brent;
  return {
    last: round2(last),
    currency: res.meta?.currency || "USD",
    points,
    source: "Yahoo Finance BZ=F",
  };
}

async function fetchUralsTe() {
  const html = await fetch("https://tradingeconomics.com/commodity/urals-oil", {
    headers: UA,
  }).then((r) => {
    if (!r.ok) throw new Error(`TE HTTP ${r.status}`);
    return r.text();
  });
  const fell = html.match(
    /fell to ([0-9.]+)\s*USD\/Bbl on ([A-Za-z]+ \d+, \d{4})/i
  );
  if (fell) {
    return {
      last: round2(fell[1]),
      asOfLabel: fell[2],
      source: "Trading Economics (Urals CFD)",
    };
  }
  const actual = html.match(
    /Urals Oil[\s\S]{0,400}?Actual[\s\S]{0,120}?([0-9]{2,3}\.[0-9]{2})/i
  );
  if (actual) {
    return {
      last: round2(actual[1]),
      asOfLabel: null,
      source: "Trading Economics (Urals CFD)",
    };
  }
  throw new Error("TE: could not parse Urals spot");
}

async function fetchUralsOilPriceApi() {
  const key = process.env.OILPRICEAPI_KEY;
  if (!key) return null;
  const url =
    "https://api.oilpriceapi.com/v1/prices/latest?by_code=URALS_CRUDE_USD";
  const json = await fetch(url, {
    headers: { ...UA, Authorization: `Token ${key}` },
  }).then((r) => {
    if (!r.ok) throw new Error(`OilPriceAPI HTTP ${r.status}`);
    return r.json();
  });
  const price =
    json?.data?.price ??
    json?.data?.[0]?.price ??
    json?.price;
  if (price == null) throw new Error("OilPriceAPI: no price");
  return {
    last: round2(price),
    asOfLabel: json?.data?.created_at || json?.data?.dated || null,
    source: "OilPriceAPI URALS_CRUDE_USD",
  };
}

function buildSeries(brentPoints, brentLast, uralsLast) {
  const discount = round2(brentLast - uralsLast);
  const categories = [];
  const brent = [];
  const urals = [];
  for (const p of brentPoints) {
    categories.push(p.date);
    brent.push(p.brent);
    urals.push(round2(p.brent - discount));
  }
  // Pin last Urals to the scraped spot (avoids drift from Yahoo last vs TE)
  if (urals.length) urals[urals.length - 1] = uralsLast;
  return { categories, brent, urals, discount };
}

function downsample(categories, brent, urals, maxPoints = 60) {
  if (categories.length <= maxPoints) {
    return { categories, brent, urals };
  }
  const step = Math.ceil(categories.length / maxPoints);
  const c = [];
  const b = [];
  const u = [];
  for (let i = 0; i < categories.length; i += step) {
    c.push(categories[i]);
    b.push(brent[i]);
    u.push(urals[i]);
  }
  const last = categories.length - 1;
  if (c[c.length - 1] !== categories[last]) {
    c.push(categories[last]);
    b.push(brent[last]);
    u.push(urals[last]);
  }
  return { categories: c, brent: b, urals: u };
}

async function main() {
  const brent = await fetchBrentYahoo(RANGE);
  let urals;
  let uralsMode = "estimated_discount";
  try {
    const api = await fetchUralsOilPriceApi();
    if (api) {
      urals = api;
      uralsMode = "api_spot";
    }
  } catch (e) {
    console.error("OilPriceAPI skip:", e.message);
  }
  if (!urals) {
    urals = await fetchUralsTe();
  }

  const built = buildSeries(brent.points, brent.last, urals.last);
  const series = downsample(built.categories, built.brent, built.urals);

  const payload = {
    asOf: new Date().toISOString(),
    range: RANGE,
    unit: "USD/bbl",
    brent: {
      last: brent.last,
      source: brent.source,
    },
    urals: {
      last: urals.last,
      source: urals.source,
      asOfLabel: urals.asOfLabel,
      seriesMode: uralsMode,
      note:
        "Ряд Urals построен как Brent минус текущий дисконт (оценка). Spot Urals — из указанного источника.",
    },
    spread: {
      last: round2(urals.last - brent.last),
      discountToBrent: built.discount,
    },
    chart: {
      categories: series.categories,
      series: [
        { name: "Brent", values: series.brent },
        { name: "Urals (оценка)", values: series.urals },
      ],
    },
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
