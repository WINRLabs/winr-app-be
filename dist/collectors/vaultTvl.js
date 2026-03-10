"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectVaultTvl = collectVaultTvl;
exports.collectAllVaultTvls = collectAllVaultTvls;
const chain_1 = require("../chain");
const gcs_1 = require("../gcs");
const config_1 = require("../config");
const BANKROLL_VAULT_ABI = [
    {
        name: "contractBalanceAccountedFor",
        type: "function",
        stateMutability: "view",
        inputs: [],
        outputs: [{ name: "", type: "uint256" }],
    },
];
async function collectVaultTvl(vault, winrUsdPrice) {
    const client = (0, chain_1.getPublicClient)();
    const balanceWei = await client.readContract({
        address: vault.vaultAddress,
        abi: BANKROLL_VAULT_ABI,
        functionName: "contractBalanceAccountedFor",
    });
    const tvlWinr = Number(balanceWei) / 1e18;
    const tvlUsd = tvlWinr * winrUsdPrice;
    const timestamp = Math.floor(Date.now() / 1000);
    const snapshot = { timestamp, tvlWinr, tvlUsd };
    await (0, gcs_1.appendToArray)(`vaults/${vault.id}/tvl_history.json`, snapshot);
    const metaPath = `vaults/${vault.id}/meta.json`;
    const existingMeta = await (0, gcs_1.readJson)(metaPath);
    const meta = {
        ...(existingMeta || {}),
        latestPrice: existingMeta?.latestPrice ?? 0,
        latestTvlWinr: tvlWinr,
        latestTvlUsd: tvlUsd,
        apr1d: existingMeta?.apr1d ?? 0,
        apr7d: existingMeta?.apr7d ?? 0,
        apr30d: existingMeta?.apr30d ?? 0,
        timestamp,
    };
    await (0, gcs_1.writeJson)(metaPath, meta);
}
async function collectAllVaultTvls(winrUsdPrice) {
    for (const vault of config_1.VAULTS) {
        await collectVaultTvl(vault, winrUsdPrice);
    }
}
//# sourceMappingURL=vaultTvl.js.map