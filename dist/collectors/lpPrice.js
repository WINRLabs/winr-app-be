"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectLpPrice = collectLpPrice;
exports.collectAllLpPrices = collectAllLpPrices;
const chain_1 = require("../chain");
const gcs_1 = require("../gcs");
const config_1 = require("../config");
const VAULT_ADAPTER_ABI = [
    {
        name: "getLpPrice",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "vaultIndex", type: "uint256" }],
        outputs: [{ name: "", type: "uint256" }],
    },
];
async function collectLpPrice(vault, winrUsdPrice) {
    const client = (0, chain_1.getPublicClient)();
    const ratioRaw = await client.readContract({
        address: config_1.CONTRACTS.vaultAdapter,
        abi: VAULT_ADAPTER_ABI,
        functionName: "getLpPrice",
        args: [BigInt(vault.vaultIndex)],
    });
    const ratio = Number(ratioRaw) / 1e18;
    const timestamp = Math.floor(Date.now() / 1000);
    const snapshot = {
        timestamp,
        ratio,
        usdPrice: winrUsdPrice,
    };
    const path = `vaults/${vault.id}/lp_price_history.json`;
    await (0, gcs_1.appendToArray)(path, snapshot);
    const metaPath = `vaults/${vault.id}/meta.json`;
    const existingMeta = await (0, gcs_1.readJson)(metaPath);
    const meta = {
        ...(existingMeta || {}),
        latestPrice: ratio,
        latestTvlWinr: existingMeta?.latestTvlWinr ?? 0,
        latestTvlUsd: existingMeta?.latestTvlUsd ?? 0,
        apr1d: existingMeta?.apr1d ?? 0,
        apr7d: existingMeta?.apr7d ?? 0,
        apr30d: existingMeta?.apr30d ?? 0,
        timestamp,
    };
    await (0, gcs_1.writeJson)(metaPath, meta);
}
async function collectAllLpPrices(winrUsdPrice) {
    for (const vault of config_1.VAULTS) {
        await collectLpPrice(vault, winrUsdPrice);
    }
}
//# sourceMappingURL=lpPrice.js.map