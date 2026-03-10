"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const winrPrice_1 = require("./collectors/winrPrice");
const userPositions_1 = require("./collectors/userPositions");
const rewards_1 = require("./collectors/rewards");
const job_1 = require("./job");
const gcs_1 = require("./gcs");
const app = (0, express_1.default)();
const PORT = Number(process.env.PORT) || 8080;
app.use(express_1.default.json());
app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
});
app.get("/run", async (_req, res) => {
    try {
        await (0, job_1.runFullJob)();
        res.json({ success: true, message: "Job completed" });
    }
    catch (err) {
        console.error("Job error:", err);
        res.status(500).json({
            success: false,
            error: err instanceof Error ? err.message : "Job failed",
        });
    }
});
app.get("/user/:address", async (req, res) => {
    const address = req.params.address;
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
        return res.status(400).json({ error: "Invalid address" });
    }
    try {
        const winrUsdPrice = await (0, winrPrice_1.getWinrUsdPrice)();
        const { lpPositions, staking } = await (0, userPositions_1.collectUserPositions)(address, winrUsdPrice);
        res.json({ lpPositions, staking });
    }
    catch (err) {
        console.error("User position error:", err);
        res.status(500).json({
            error: err instanceof Error ? err.message : "Failed to fetch user position",
        });
    }
});
app.get("/user/:address/rewards", async (req, res) => {
    const address = req.params.address;
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
        return res.status(400).json({ error: "Invalid address" });
    }
    try {
        let history = await (0, gcs_1.readJson)(`users/${address.toLowerCase()}/rewards_history.json`);
        if (!history?.length) {
            history = await (0, rewards_1.buildUserRewardsHistory)(address);
        }
        res.json(history ?? []);
    }
    catch (err) {
        console.error("User rewards error:", err);
        res.status(500).json({
            error: err instanceof Error ? err.message : "Failed to fetch rewards",
        });
    }
});
app.post("/user/:address/refresh", async (req, res) => {
    const address = req.params.address;
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
        return res.status(400).json({ error: "Invalid address" });
    }
    try {
        const winrUsdPrice = await (0, winrPrice_1.getWinrUsdPrice)();
        await (0, userPositions_1.collectUserPositions)(address, winrUsdPrice);
        await (0, rewards_1.buildUserRewardsHistory)(address);
        res.json({ success: true, message: "User data refreshed" });
    }
    catch (err) {
        console.error("Refresh error:", err);
        res.status(500).json({
            error: err instanceof Error ? err.message : "Failed to refresh user data",
        });
    }
});
app.listen(PORT, () => {
    console.log(`JustBet Analytics listening on port ${PORT}`);
});
//# sourceMappingURL=index.js.map