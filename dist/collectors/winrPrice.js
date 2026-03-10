"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWinrUsdPrice = getWinrUsdPrice;
const node_fetch_1 = __importDefault(require("node-fetch"));
const gcs_1 = require("../gcs");
const config_1 = require("../config");
const WINR_PRICE_PATH = "global/winr_price.json";
const TTL_MS = 5 * 60 * 1000; // 5 minutes
async function getWinrUsdPrice() {
    const cached = await (0, gcs_1.readJson)(WINR_PRICE_PATH);
    if (cached && Date.now() - cached.timestamp * 1000 < TTL_MS) {
        return cached.price;
    }
    const url = `https://api.dexscreener.com/latest/dex/tokens/${config_1.WINR_DEXSCREENER_TOKEN}`;
    const res = await (0, node_fetch_1.default)(url);
    if (!res.ok)
        throw new Error(`DexScreener error: ${res.status}`);
    const data = (await res.json());
    const priceUsd = data.pairs?.[0]?.priceUsd;
    const price = priceUsd ? parseFloat(priceUsd) : 0;
    const cache = {
        price,
        source: "dexscreener",
        timestamp: Math.floor(Date.now() / 1000),
    };
    await (0, gcs_1.writeJson)(WINR_PRICE_PATH, cache);
    return price;
}
//# sourceMappingURL=winrPrice.js.map