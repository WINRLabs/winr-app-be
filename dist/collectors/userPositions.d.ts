import type { UserLpPosition, UserStakingSnapshot } from "../types";
export declare function collectUserPositions(userAddress: string, winrUsdPrice: number): Promise<{
    lpPositions: UserLpPosition[];
    staking: UserStakingSnapshot;
}>;
//# sourceMappingURL=userPositions.d.ts.map