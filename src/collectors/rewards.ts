import { readJson, writeJson } from "../gcs";
import type { RewardRecord } from "../types";

interface RewardEvent {
  type: string;
  user?: string;
  token?: string;
  amount?: string;
  blockNumber?: number;
}

/** Build rewards_history.json from rewards_events.json for a user. Uses blockNumber*3 as approx timestamp (Rise ~3s/block). */
export async function buildUserRewardsHistory(userAddress: string): Promise<RewardRecord[]> {
  const user = userAddress.toLowerCase();
  const events = await readJson<RewardEvent[]>(`users/${user}/rewards_events.json`);
  if (!Array.isArray(events)) return [];

  const history: RewardRecord[] = [];
  for (const e of events) {
    if (e.type !== "RewardClaimed" || !e.token || !e.amount) continue;
    const blockNumber = e.blockNumber ?? 0;
    const timestamp = blockNumber * 3; // approximate; could fetch getBlock for accuracy
    history.push({
      timestamp,
      token: e.token,
      amount: e.amount,
      type: "staking_reward",
    });
  }
  history.sort((a, b) => a.timestamp - b.timestamp);
  await writeJson(`users/${user}/rewards_history.json`, history);
  return history;
}
