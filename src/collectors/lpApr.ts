import { readJson, appendToArray, writeJson } from "../gcs";
import { VAULTS } from "../config";
import type { VaultConfig } from "../config";
import type { LpPriceSnapshot, AprSnapshot, VaultMeta } from "../types";

const MS_1D = 24 * 60 * 60 * 1000;
const MS_7D = 7 * MS_1D;
const MS_30D = 30 * MS_1D;

function findPriceAt(
  history: LpPriceSnapshot[],
  targetTime: number
): number | null {
  if (history.length === 0) return null;
  let best = history[0];
  let bestDiff = Math.abs(best.timestamp * 1000 - targetTime);
  for (const h of history) {
    const diff = Math.abs(h.timestamp * 1000 - targetTime);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = h;
    }
  }
  return best.ratio;
}

export async function collectLpApr(vault: VaultConfig): Promise<void> {
  const path = `vaults/${vault.id}/lp_price_history.json`;
  const history = await readJson<LpPriceSnapshot[]>(path);
  const now = Date.now();
  const timestamp = Math.floor(now / 1000);

  let apr1d = 0,
    apr7d = 0,
    apr30d = 0;

  if (history && history.length >= 2) {
    const priceNow = history[history.length - 1].ratio;
    const price24h = findPriceAt(history, now - MS_1D);
    const price7d = findPriceAt(history, now - MS_7D);
    const price30d = findPriceAt(history, now - MS_30D);

    if (price24h != null && price24h > 0) {
      const dailyReturn = (priceNow - price24h) / price24h;
      apr1d = dailyReturn * 365 * 100;
    }
    if (price7d != null && price7d > 0) {
      const return7d = (priceNow - price7d) / price7d;
      apr7d = (return7d / 7) * 365 * 100;
    }
    if (price30d != null && price30d > 0) {
      const return30d = (priceNow - price30d) / price30d;
      apr30d = (return30d / 30) * 365 * 100;
    }
  }

  const snapshot: AprSnapshot = { timestamp, apr1d, apr7d, apr30d };
  await appendToArray(`vaults/${vault.id}/apr_history.json`, snapshot);

  const metaPath = `vaults/${vault.id}/meta.json`;
  const existingMeta = await readJson<VaultMeta>(metaPath);
  const meta: VaultMeta = {
    ...(existingMeta || {}),
    latestPrice: existingMeta?.latestPrice ?? 0,
    latestTvlWinr: existingMeta?.latestTvlWinr ?? 0,
    latestTvlUsd: existingMeta?.latestTvlUsd ?? 0,
    apr1d,
    apr7d,
    apr30d,
    timestamp,
  };
  await writeJson(metaPath, meta);
}

export async function collectAllLpApr(): Promise<void> {
  for (const vault of VAULTS) {
    await collectLpApr(vault);
  }
}
