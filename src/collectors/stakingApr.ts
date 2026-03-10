import { getPublicClient } from "../chain";
import { readJson, appendToArray, writeJson } from "../gcs";
import { CONTRACTS } from "../config";
import type { StakingAprSnapshot, StakingMeta } from "../types";

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
] as const;

const REVENUE_DISTRIBUTED_ABI = [
  {
    type: "event",
    name: "RevenueDistributed",
    inputs: [
      { name: "token", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
] as const;

const BLOCKS_PER_DAY = 86400 / 3;
const BLOCKS_PER_7D = 7 * BLOCKS_PER_DAY;
const BLOCKS_PER_30D = 30 * BLOCKS_PER_DAY;

export async function collectStakingApr(): Promise<void> {
  const client = getPublicClient();
  const totalStakedWei = await client.readContract({
    address: CONTRACTS.winrStakingV2 as `0x${string}`,
    abi: WINR_STAKING_V2_ABI,
    functionName: "totalStaked",
  });
  const totalStakedWinr = Number(totalStakedWei) / 1e18;
  const timestamp = Math.floor(Date.now() / 1000);

  const blockNumber = await client.getBlockNumber();
  const fromBlock24h = blockNumber - BigInt(Math.floor(BLOCKS_PER_DAY));
  const fromBlock7d = blockNumber - BigInt(Math.floor(BLOCKS_PER_7D));
  const fromBlock30d = blockNumber - BigInt(Math.floor(BLOCKS_PER_30D));

  const fetchRewardsInRange = async (
    from: bigint,
    to: bigint
  ): Promise<bigint> => {
    const logs = await client.getContractEvents({
      address: CONTRACTS.winrStakingV2 as `0x${string}`,
      abi: REVENUE_DISTRIBUTED_ABI,
      eventName: "RevenueDistributed",
      fromBlock: from,
      toBlock: to,
    });
    let sum = 0n;
    for (const log of logs) {
      if (log.args?.amount != null) sum += log.args.amount as bigint;
    }
    return sum;
  };

  let rewards24h = 0n,
    rewards7d = 0n,
    rewards30d = 0n;
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

  await appendToArray("staking/apr_history.json", {
    timestamp,
    aprBps,
  });

  const existingMeta = await readJson<StakingMeta>("staking/meta.json");
  const totalDistributed =
    (existingMeta?.rewardsDistributed ?? 0) +
    r24; // approximate; events indexer will maintain exact total
  const meta: StakingMeta = {
    totalStaked: totalStakedWei.toString(),
    totalStakedWinr,
    rewardsDistributed: totalDistributed,
    aprBps,
    timestamp,
  };
  await writeJson("staking/meta.json", meta);
}
