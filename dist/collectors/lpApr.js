"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectLpApr = collectLpApr;
exports.collectAllLpApr = collectAllLpApr;
const gcs_1 = require("../gcs");
const config_1 = require("../config");
const MS_1D = 24 * 60 * 60 * 1000;
const MS_7D = 7 * MS_1D;
const MS_30D = 30 * MS_1D;
function findPriceAt(history, targetTime) {
    if (history.length === 0)
        return null;
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
async function collectLpApr(vault) {
    const path = `vaults/${vault.id}/lp_price_history.json`;
    const history = await (0, gcs_1.readJson)(path);
    const now = Date.now();
    const timestamp = Math.floor(now / 1000);
    let apr1d = 0, apr7d = 0, apr30d = 0;
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
    const snapshot = { timestamp, apr1d, apr7d, apr30d };
    await (0, gcs_1.appendToArray)(`vaults/${vault.id}/apr_history.json`, snapshot);
    const metaPath = `vaults/${vault.id}/meta.json`;
    const existingMeta = await (0, gcs_1.readJson)(metaPath);
    const meta = {
        ...(existingMeta || {}),
        latestPrice: existingMeta?.latestPrice ?? 0,
        latestTvlWinr: existingMeta?.latestTvlWinr ?? 0,
        latestTvlUsd: existingMeta?.latestTvlUsd ?? 0,
        apr1d,
        apr7d,
        apr30d,
        timestamp,
    };
    await (0, gcs_1.writeJson)(metaPath, meta);
}
async function collectAllLpApr() {
    for (const vault of config_1.VAULTS) {
        await collectLpApr(vault);
    }
}
//# sourceMappingURL=lpApr.js.map