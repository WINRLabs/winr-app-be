export interface LpPriceSnapshot {
    timestamp: number;
    ratio: number;
    usdPrice: number;
}
export interface TvlSnapshot {
    timestamp: number;
    tvlWinr: number;
    tvlUsd: number;
}
export interface AprSnapshot {
    timestamp: number;
    apr1d: number;
    apr7d: number;
    apr30d: number;
}
export interface VaultMeta {
    latestPrice: number;
    latestTvlWinr: number;
    latestTvlUsd: number;
    apr1d: number;
    apr7d: number;
    apr30d: number;
    timestamp: number;
}
export interface StakingAprSnapshot {
    timestamp: number;
    aprBps: number;
}
export interface StakingMeta {
    totalStaked: string;
    totalStakedWinr: number;
    rewardsDistributed: number;
    aprBps: number;
    timestamp: number;
}
export interface UserLpPosition {
    vaultId: string;
    lpBalance: string;
    winrValue: number;
    usdValue: number;
    entryPrice: number;
    profitLoss: number;
    profitLossWinr?: number;
    timestamp: number;
}
export interface UserStakingSnapshot {
    stakedWinr: string;
    multiplier: string;
    pendingRewards: Array<{
        token: string;
        amount: string;
    }>;
    totalClaimed: string;
    timestamp: number;
}
export interface RewardRecord {
    timestamp: number;
    token: string;
    amount: string;
    type: "lp_reward" | "staking_reward";
}
export interface TotalsSnapshot {
    totalTvlUsd: number;
    totalStakedWinr: number;
    totalRewardsDistributed: number;
    timestamp: number;
}
export interface WinrPriceCache {
    price: number;
    source: string;
    timestamp: number;
}
export interface LastIndexedBlock {
    lastBlock: number;
}
export interface DepositEvent {
    vaultId: string;
    depositor: string;
    amount: string;
    sharesMinted: string;
    blockNumber: number;
    timestamp?: number;
}
export interface WithdrawalEvent {
    vaultId: string;
    withdrawer: string;
    amount: string;
    sharesBurned: string;
    blockNumber: number;
    timestamp?: number;
}
//# sourceMappingURL=types.d.ts.map