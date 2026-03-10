import { getPublicClient } from "../chain";
import { readJson, writeJson } from "../gcs";
import { CONTRACTS, VAULTS } from "../config";
import type { VaultConfig } from "../config";
import type { LpPriceSnapshot } from "../types";
import type { UserLpPosition, UserStakingSnapshot } from "../types";

const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const VAULT_ADAPTER_ABI = [
  {
    name: "getLpPrice",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "vaultIndex", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const WINR_STAKING_V2_ABI = [
  { name: "totalStaked", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "rewardTokens", type: "function", stateMutability: "view", inputs: [{ name: "", type: "uint256" }], outputs: [{ name: "", type: "address" }] },
  { name: "getPendingRewards", type: "function", stateMutability: "view", inputs: [{ name: "user", type: "address" }, { name: "token", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { name: "getPendingRewardsAll", type: "function", stateMutability: "view", inputs: [{ name: "user", type: "address" }], outputs: [{ name: "tokens", type: "address[]" }, { name: "amounts", type: "uint256[]" }] },
  { name: "stakedBalances", type: "function", stateMutability: "view", inputs: [{ name: "user", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { name: "getMultiplier", type: "function", stateMutability: "view", inputs: [{ name: "user", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
] as const;

interface DepositEvent {
  type: string;
  vaultId: string;
  depositor: string;
  amount: string;
  sharesMinted: string;
  blockNumber: number;
}

/** Approximate block timestamp (Rise ~3s/block) and find closest LP price snapshot by time. */
function findClosestPrice(
  history: LpPriceSnapshot[],
  blockNumber: number,
  startBlock: number,
  startTimestamp: number
): number {
  if (!history?.length) return 1;
  const blockTimestamp = startTimestamp + (blockNumber - startBlock) * 3;
  let best = history[0];
  let bestDiff = Math.abs(best.timestamp - blockTimestamp);
  for (const h of history) {
    const diff = Math.abs(h.timestamp - blockTimestamp);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = h;
    }
  }
  return best.ratio;
}

/** Get entry ratio as weighted average: sum(depositAmount * lpPriceAtDeposit) / totalDeposited */
async function getEntryRatioForUser(
  vault: VaultConfig,
  userAddress: string
): Promise<{ entryRatio: number; totalDepositedWinr: number }> {
  const events = await readJson<DepositEvent[]>(`global/events_${vault.id}.json`);
  const history = await readJson<LpPriceSnapshot[]>(`vaults/${vault.id}/lp_price_history.json`);
  const user = userAddress.toLowerCase();
  let totalDeposited = 0;
  let weightedSum = 0;
  if (!events?.length) return { entryRatio: 1, totalDepositedWinr: 0 };
  for (const e of events) {
    if (e.depositor?.toLowerCase() !== user || e.type !== "DepositAssetToVault") continue;
    const amount = Number(e.amount) / 1e18;
    const priceAtDeposit = findClosestPrice(
      history ?? [],
      e.blockNumber,
      vault.startBlock,
      vault.startTimestamp
    );
    totalDeposited += amount;
    weightedSum += amount * priceAtDeposit;
  }
  const entryRatio = totalDeposited > 0 ? weightedSum / totalDeposited : 1;
  return { entryRatio, totalDepositedWinr: totalDeposited };
}

export async function collectUserPositions(
  userAddress: string,
  winrUsdPrice: number
): Promise<{ lpPositions: UserLpPosition[]; staking: UserStakingSnapshot }> {
  const client = getPublicClient();
  const user = userAddress.toLowerCase() as `0x${string}`;
  const timestamp = Math.floor(Date.now() / 1000);
  const lpPositions: UserLpPosition[] = [];

  for (const vault of VAULTS) {
    const lpBalanceWei = await client.readContract({
      address: vault.lpToken as `0x${string}`,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [user],
    });
    const ratioRaw = await client.readContract({
      address: CONTRACTS.vaultAdapter as `0x${string}`,
      abi: VAULT_ADAPTER_ABI,
      functionName: "getLpPrice",
      args: [BigInt(vault.vaultIndex)],
    });
    const ratio = Number(ratioRaw) / 1e18;
    const lpBalance = lpBalanceWei.toString();
    const winrValue = (Number(lpBalanceWei) / 1e18) * ratio;
    const usdValue = winrValue * winrUsdPrice;

    const { entryRatio, totalDepositedWinr } = await getEntryRatioForUser(vault, userAddress);
    let profitLoss = 0;
    let profitLossWinr: number | undefined;
    if (entryRatio > 0) {
      profitLoss = ((ratio - entryRatio) / entryRatio) * 100;
      profitLossWinr = winrValue - totalDepositedWinr;
    }

    lpPositions.push({
      vaultId: vault.id,
      lpBalance,
      winrValue,
      usdValue,
      entryPrice: entryRatio,
      profitLoss,
      profitLossWinr,
      timestamp,
    });
  }

  let stakedWinr = "0";
  let multiplier = "0";
  const pendingRewards: Array<{ token: string; amount: string }> = [];
  let totalClaimed = "0";

  try {
    stakedWinr = (
      await client.readContract({
        address: CONTRACTS.winrStakingV2 as `0x${string}`,
        abi: WINR_STAKING_V2_ABI,
        functionName: "stakedBalances",
        args: [user],
      })
    ).toString();
  } catch {
    // contract may not have stakedBalances
  }
  try {
    multiplier = (
      await client.readContract({
        address: CONTRACTS.winrStakingV2 as `0x${string}`,
        abi: WINR_STAKING_V2_ABI,
        functionName: "getMultiplier",
        args: [user],
      })
    ).toString();
  } catch {
    // ignore
  }
  try {
    const [tokens, amounts] = await client.readContract({
      address: CONTRACTS.winrStakingV2 as `0x${string}`,
      abi: WINR_STAKING_V2_ABI,
      functionName: "getPendingRewardsAll",
      args: [user],
    });
    for (let i = 0; i < (tokens?.length ?? 0); i++) {
      pendingRewards.push({
        token: (tokens as `0x${string}`[])[i],
        amount: (amounts as bigint[])[i]?.toString() ?? "0",
      });
    }
  } catch {
    // ignore
  }

  const rewardEvents = await readJson<Array<{ type?: string; amount?: string }>>(`users/${userAddress.toLowerCase()}/rewards_events.json`);
  if (Array.isArray(rewardEvents)) {
    for (const e of rewardEvents) {
      if (e.type === "RewardClaimed") {
        totalClaimed = (BigInt(totalClaimed) + BigInt(e.amount ?? "0")).toString();
      }
    }
  }
  const staking: UserStakingSnapshot = {
    stakedWinr,
    multiplier,
    pendingRewards,
    totalClaimed,
    timestamp,
  };

  await writeJson(`users/${userAddress.toLowerCase()}/lp_positions.json`, lpPositions);
  await writeJson(`users/${userAddress.toLowerCase()}/staking.json`, staking);

  return { lpPositions, staking };
}
