import { readJson, writeJson } from "./gcs";
import { VAULTS } from "./config";
import type { VaultMeta, StakingMeta, TotalsSnapshot } from "./types";
import { getWinrUsdPrice } from "./collectors/winrPrice";
import { collectAllLpPrices } from "./collectors/lpPrice";
import { collectAllVaultTvls } from "./collectors/vaultTvl";
import { collectAllLpApr } from "./collectors/lpApr";
import { collectStakingApr } from "./collectors/stakingApr";
import { runEventsIndexer } from "./collectors/events";

export async function runFullJob(): Promise<void> {
  const winrUsdPrice = await getWinrUsdPrice();

  await collectAllLpPrices(winrUsdPrice);
  await collectAllVaultTvls(winrUsdPrice);
  await collectAllLpApr();
  await collectStakingApr();
  await runEventsIndexer();

  let totalTvlUsd = 0;
  for (const vault of VAULTS) {
    const meta = await readJson<VaultMeta>(`vaults/${vault.id}/meta.json`);
    if (meta?.latestTvlUsd) totalTvlUsd += meta.latestTvlUsd;
  }
  const stakingMeta = await readJson<StakingMeta>("staking/meta.json");
  const totalStakedWinr = stakingMeta?.totalStakedWinr ?? 0;
  const totalRewardsDistributed = stakingMeta?.rewardsDistributed ?? 0;

  const totals: TotalsSnapshot = {
    totalTvlUsd,
    totalStakedWinr,
    totalRewardsDistributed,
    timestamp: Math.floor(Date.now() / 1000),
  };
  await writeJson("global/totals.json", totals);
}

if (require.main === module) {
  runFullJob()
    .then(() => {
      console.log("Job completed");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Job failed:", err);
      process.exit(1);
    });
}
