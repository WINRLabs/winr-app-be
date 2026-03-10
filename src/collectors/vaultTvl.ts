import { getPublicClient } from "../chain";
import { appendToArray, readJson, writeJson } from "../gcs";
import { VAULTS } from "../config";
import type { VaultConfig } from "../config";
import type { TvlSnapshot, VaultMeta } from "../types";

const BANKROLL_VAULT_ABI = [
  {
    name: "contractBalanceAccountedFor",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export async function collectVaultTvl(
  vault: VaultConfig,
  winrUsdPrice: number
): Promise<void> {
  const client = getPublicClient();
  const balanceWei = await client.readContract({
    address: vault.vaultAddress as `0x${string}`,
    abi: BANKROLL_VAULT_ABI,
    functionName: "contractBalanceAccountedFor",
  });
  const tvlWinr = Number(balanceWei) / 1e18;
  const tvlUsd = tvlWinr * winrUsdPrice;
  const timestamp = Math.floor(Date.now() / 1000);

  const snapshot: TvlSnapshot = { timestamp, tvlWinr, tvlUsd };
  await appendToArray(`vaults/${vault.id}/tvl_history.json`, snapshot);

  const metaPath = `vaults/${vault.id}/meta.json`;
  const existingMeta = await readJson<VaultMeta>(metaPath);
  const meta: VaultMeta = {
    ...(existingMeta || {}),
    latestPrice: existingMeta?.latestPrice ?? 0,
    latestTvlWinr: tvlWinr,
    latestTvlUsd: tvlUsd,
    apr1d: existingMeta?.apr1d ?? 0,
    apr7d: existingMeta?.apr7d ?? 0,
    apr30d: existingMeta?.apr30d ?? 0,
    timestamp,
  };
  await writeJson(metaPath, meta);
}

export async function collectAllVaultTvls(winrUsdPrice: number): Promise<void> {
  for (const vault of VAULTS) {
    await collectVaultTvl(vault, winrUsdPrice);
  }
}
