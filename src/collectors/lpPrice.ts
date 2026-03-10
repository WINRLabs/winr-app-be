import { getPublicClient } from "../chain";
import { appendToArray, readJson, writeJson } from "../gcs";
import { CONTRACTS, VAULTS } from "../config";
import type { VaultConfig } from "../config";
import type { LpPriceSnapshot, VaultMeta } from "../types";

const VAULT_ADAPTER_ABI = [
  {
    name: "getLpPrice",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "vaultIndex", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export async function collectLpPrice(
  vault: VaultConfig,
  winrUsdPrice: number
): Promise<void> {
  const client = getPublicClient();
  const ratioRaw = await client.readContract({
    address: CONTRACTS.vaultAdapter as `0x${string}`,
    abi: VAULT_ADAPTER_ABI,
    functionName: "getLpPrice",
    args: [BigInt(vault.vaultIndex)],
  });
  const ratio = Number(ratioRaw) / 1e18;
  const timestamp = Math.floor(Date.now() / 1000);

  const snapshot: LpPriceSnapshot = {
    timestamp,
    ratio,
    usdPrice: winrUsdPrice,
  };

  const path = `vaults/${vault.id}/lp_price_history.json`;
  await appendToArray(path, snapshot);

  const metaPath = `vaults/${vault.id}/meta.json`;
  const existingMeta = await readJson<VaultMeta>(metaPath);
  const meta: VaultMeta = {
    ...(existingMeta || {}),
    latestPrice: ratio,
    latestTvlWinr: existingMeta?.latestTvlWinr ?? 0,
    latestTvlUsd: existingMeta?.latestTvlUsd ?? 0,
    apr1d: existingMeta?.apr1d ?? 0,
    apr7d: existingMeta?.apr7d ?? 0,
    apr30d: existingMeta?.apr30d ?? 0,
    timestamp,
  };
  await writeJson(metaPath, meta);
}

export async function collectAllLpPrices(winrUsdPrice: number): Promise<void> {
  for (const vault of VAULTS) {
    await collectLpPrice(vault, winrUsdPrice);
  }
}
