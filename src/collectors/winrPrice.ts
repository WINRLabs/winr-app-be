import { readJson, writeJson } from "../gcs";
import { WINR_DEXSCREENER_TOKEN } from "../config";
import type { WinrPriceCache } from "../types";

const WINR_PRICE_PATH = "global/winr_price.json";
const TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function getWinrUsdPrice(): Promise<number> {
  const cached = await readJson<WinrPriceCache>(WINR_PRICE_PATH);
  if (cached && Date.now() - cached.timestamp * 1000 < TTL_MS) {
    return cached.price;
  }

  const url = `https://api.dexscreener.com/latest/dex/tokens/${WINR_DEXSCREENER_TOKEN}`;
  const res = await globalThis.fetch(url);
  if (!res.ok) throw new Error(`DexScreener error: ${res.status}`);
  const data = (await res.json()) as { pairs?: Array<{ priceUsd?: string }> };
  const priceUsd = data.pairs?.[0]?.priceUsd;
  const price = priceUsd ? parseFloat(priceUsd) : 0;

  const cache: WinrPriceCache = {
    price,
    source: "dexscreener",
    timestamp: Math.floor(Date.now() / 1000),
  };
  await writeJson(WINR_PRICE_PATH, cache);
  return price;
}
