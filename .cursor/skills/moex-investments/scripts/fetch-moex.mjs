#!/usr/bin/env node
/** @deprecated alias — use fetch-markets.mjs */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const dir = dirname(fileURLToPath(import.meta.url));
const r = spawnSync(process.execPath, [join(dir, "fetch-markets.mjs"), ...process.argv.slice(2)], {
  stdio: "inherit",
});
process.exit(r.status ?? 1);
