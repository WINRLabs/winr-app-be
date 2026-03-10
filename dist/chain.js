"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPublicClient = getPublicClient;
const viem_1 = require("viem");
const config_1 = require("./config");
function getPublicClient() {
    return (0, viem_1.createPublicClient)({
        chain: {
            id: config_1.CHAIN_ID,
            name: "Rise",
            nativeCurrency: { name: "RISE", symbol: "RISE", decimals: 18 },
            rpcUrls: { default: { http: [config_1.RPC_URL] } },
        },
        transport: (0, viem_1.http)(config_1.RPC_URL),
    });
}
//# sourceMappingURL=chain.js.map