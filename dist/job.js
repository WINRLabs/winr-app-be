"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runFullJob = runFullJob;
const gcs_1 = require("./gcs");
const config_1 = require("./config");
const winrPrice_1 = require("./collectors/winrPrice");
const lpPrice_1 = require("./collectors/lpPrice");
const vaultTvl_1 = require("./collectors/vaultTvl");
const lpApr_1 = require("./collectors/lpApr");
const stakingApr_1 = require("./collectors/stakingApr");
const events_1 = require("./collectors/events");
async function runFullJob() {
    const winrUsdPrice = await (0, winrPrice_1.getWinrUsdPrice)();
    await (0, lpPrice_1.collectAllLpPrices)(winrUsdPrice);
    await (0, vaultTvl_1.collectAllVaultTvls)(winrUsdPrice);
    await (0, lpApr_1.collectAllLpApr)();
    await (0, stakingApr_1.collectStakingApr)();
    await (0, events_1.runEventsIndexer)();
    let totalTvlUsd = 0;
    for (const vault of config_1.VAULTS) {
        const meta = await (0, gcs_1.readJson)(`vaults/${vault.id}/meta.json`);
        if (meta?.latestTvlUsd)
            totalTvlUsd += meta.latestTvlUsd;
    }
    const stakingMeta = await (0, gcs_1.readJson)("staking/meta.json");
    const totalStakedWinr = stakingMeta?.totalStakedWinr ?? 0;
    const totalRewardsDistributed = stakingMeta?.rewardsDistributed ?? 0;
    const totals = {
        totalTvlUsd,
        totalStakedWinr,
        totalRewardsDistributed,
        timestamp: Math.floor(Date.now() / 1000),
    };
    await (0, gcs_1.writeJson)("global/totals.json", totals);
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
//# sourceMappingURL=job.js.map