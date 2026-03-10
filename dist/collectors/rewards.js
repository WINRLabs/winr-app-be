"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildUserRewardsHistory = buildUserRewardsHistory;
const gcs_1 = require("../gcs");
/** Build rewards_history.json from rewards_events.json for a user. Uses blockNumber*3 as approx timestamp (Rise ~3s/block). */
async function buildUserRewardsHistory(userAddress) {
    const user = userAddress.toLowerCase();
    const events = await (0, gcs_1.readJson)(`users/${user}/rewards_events.json`);
    if (!Array.isArray(events))
        return [];
    const history = [];
    for (const e of events) {
        if (e.type !== "RewardClaimed" || !e.token || !e.amount)
            continue;
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
    await (0, gcs_1.writeJson)(`users/${user}/rewards_history.json`, history);
    return history;
}
//# sourceMappingURL=rewards.js.map