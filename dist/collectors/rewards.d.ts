import type { RewardRecord } from "../types";
/** Build rewards_history.json from rewards_events.json for a user. Uses blockNumber*3 as approx timestamp (Rise ~3s/block). */
export declare function buildUserRewardsHistory(userAddress: string): Promise<RewardRecord[]>;
//# sourceMappingURL=rewards.d.ts.map