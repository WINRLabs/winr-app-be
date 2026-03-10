"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectStakingApr = collectStakingApr;
const chain_1 = require("../chain");
const gcs_1 = require("../gcs");
const config_1 = require("../config");
const WINR_STAKING_V2_ABI = [
    {
        name: "totalStaked",
        type: "function",
        stateMutability: "view",
        inputs: [],
        outputs: [{ name: "", type: "uint256" }],
    },
    {
        name: "rewardTokens",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "", type: "uint256" }],
        outputs: [{ name: "", type: "address" }],
    },
    {
        name: "getPendingRewards",
        type: "function",
        stateMutability: "view",
        inputs: [
            { name: "user", type: "address" },
            { name: "token", type: "address" },
        ],
        outputs: [{ name: "", type: "uint256" }],
    },
    {
        name: "getPendingRewardsAll",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "user", type: "address" }],
        outputs: [
            { name: "tokens", type: "address[]" },
            { name: "amounts", type: "uint256[]" },
        ],
    },
];
const REVENUE_DISTRIBUTED_ABI = [
    {
        type: "event",
        name: "RevenueDistributed",
        inputs: [
            { name: "token", type: "address", indexed: true },
            { name: "amount", type: "uint256", indexed: false },
        ],
    },
];
const BLOCKS_PER_DAY = 86400 / 3;
const BLOCKS_PER_7D = 7 * BLOCKS_PER_DAY;
const BLOCKS_PER_30D = 30 * BLOCKS_PER_DAY;
async function collectStakingApr() {
    const client = (0, chain_1.getPublicClient)();
    const totalStakedWei = await client.readContract({
        address: config_1.CONTRACTS.winrStakingV2,
        abi: WINR_STAKING_V2_ABI,
        functionName: "totalStaked",
    });
    const totalStakedWinr = Number(totalStakedWei) / 1e18;
    const timestamp = Math.floor(Date.now() / 1000);
    const blockNumber = await client.getBlockNumber();
    const fromBlock24h = blockNumber - BigInt(Math.floor(BLOCKS_PER_DAY));
    const fromBlock7d = blockNumber - BigInt(Math.floor(BLOCKS_PER_7D));
    const fromBlock30d = blockNumber - BigInt(Math.floor(BLOCKS_PER_30D));
    const fetchRewardsInRange = async (from, to) => {
        const logs = await client.getContractEvents({
            address: config_1.CONTRACTS.winrStakingV2,
            abi: REVENUE_DISTRIBUTED_ABI,
            eventName: "RevenueDistributed",
            fromBlock: from,
            toBlock: to,
        });
        let sum = 0n;
        for (const log of logs) {
            if (log.args?.amount != null)
                sum += log.args.amount;
        }
        return sum;
    };
    let rewards24h = 0n, rewards7d = 0n, rewards30d = 0n;
    const chunk = 2000n;
    for (let from = fromBlock24h; from <= blockNumber; from += chunk) {
        const to = from + chunk > blockNumber ? blockNumber : from + chunk - 1n;
        rewards24h += await fetchRewardsInRange(from, to);
    }
    for (let from = fromBlock7d; from <= blockNumber; from += chunk) {
        const to = from + chunk > blockNumber ? blockNumber : from + chunk - 1n;
        rewards7d += await fetchRewardsInRange(from, to);
    }
    for (let from = fromBlock30d; from <= blockNumber; from += chunk) {
        const to = from + chunk > blockNumber ? blockNumber : from + chunk - 1n;
        rewards30d += await fetchRewardsInRange(from, to);
    }
    const r24 = Number(rewards24h) / 1e18;
    const r7 = Number(rewards7d) / 1e18;
    const r30 = Number(rewards30d) / 1e18;
    let aprBps = 0;
    if (totalStakedWinr > 0) {
        const rewardsPerYear24h = r24 * 365;
        const rewardsPerYear7d = (r7 / 7) * 365;
        const rewardsPerYear30d = (r30 / 30) * 365;
        const rewardsPerYear = rewardsPerYear24h || rewardsPerYear7d || rewardsPerYear30d;
        aprBps = (rewardsPerYear / totalStakedWinr) * 10000;
    }
    await (0, gcs_1.appendToArray)("staking/apr_history.json", {
        timestamp,
        aprBps,
    });
    const existingMeta = await (0, gcs_1.readJson)("staking/meta.json");
    const totalDistributed = (existingMeta?.rewardsDistributed ?? 0) +
        r24; // approximate; events indexer will maintain exact total
    const meta = {
        totalStaked: totalStakedWei.toString(),
        totalStakedWinr,
        rewardsDistributed: totalDistributed,
        aprBps,
        timestamp,
    };
    await (0, gcs_1.writeJson)("staking/meta.json", meta);
}
//# sourceMappingURL=stakingApr.js.map