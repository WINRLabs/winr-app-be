import express from "express";
import { getWinrUsdPrice } from "./collectors/winrPrice";
import { collectUserPositions } from "./collectors/userPositions";
import { buildUserRewardsHistory } from "./collectors/rewards";
import { runFullJob } from "./job";
import { readJson } from "./gcs";

const app = express();
const PORT = Number(process.env.PORT) || 8080;

app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/run", async (_req, res) => {
  try {
    await runFullJob();
    res.json({ success: true, message: "Job completed" });
  } catch (err) {
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
    const winrUsdPrice = await getWinrUsdPrice();
    const { lpPositions, staking } = await collectUserPositions(address, winrUsdPrice);
    res.json({ lpPositions, staking });
  } catch (err) {
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
    let history = await readJson<Array<{ timestamp: number; token: string; amount: string; type: string }>>(
      `users/${address.toLowerCase()}/rewards_history.json`
    );
    if (!history?.length) {
      history = await buildUserRewardsHistory(address);
    }
    res.json(history ?? []);
  } catch (err) {
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
    const winrUsdPrice = await getWinrUsdPrice();
    await collectUserPositions(address, winrUsdPrice);
    await buildUserRewardsHistory(address);
    res.json({ success: true, message: "User data refreshed" });
  } catch (err) {
    console.error("Refresh error:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Failed to refresh user data",
    });
  }
});

app.listen(PORT, () => {
  console.log(`JustBet Analytics listening on port ${PORT}`);
});
