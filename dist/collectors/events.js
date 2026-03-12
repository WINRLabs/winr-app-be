"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.indexVaultEvents = indexVaultEvents;
exports.indexStakingEvents = indexStakingEvents;
exports.runEventsIndexer = runEventsIndexer;
const chain_1 = require("../chain");
const gcs_1 = require("../gcs");
const config_1 = require("../config");
const CURSOR_PATH = "global/last_indexed_block.json";
const CHUNK_SIZE = 2000;
const VAULT_EVENT_EMITTER_ABI = [
    {
        name: "DepositAssetToVault",
        type: "event",
        inputs: [
            { name: "vaultId", type: "uint256", indexed: true },
            { name: "depositor", type: "address", indexed: true },
            { name: "amount", type: "uint256" },
            { name: "sharesMinted", type: "uint256" },
        ],
    },
    {
        name: "WithdrawalAssetFromVault",
        type: "event",
        inputs: [
            { name: "vaultId", type: "uint256", indexed: true },
            { name: "withdrawer", type: "address", indexed: true },
            { name: "amount", type: "uint256" },
            { name: "sharesBurned", type: "uint256" },
        ],
    },
];
const STAKING_ABI_EVENTS = [
    {
        type: "event",
        name: "Staked",
        inputs: [
            { name: "user", type: "address", indexed: true },
            { name: "amount", type: "uint256", indexed: false },
        ],
    },
    {
        type: "event",
        name: "Unstaked",
        inputs: [
            { name: "user", type: "address", indexed: true },
            { name: "amount", type: "uint256", indexed: false },
        ],
    },
    {
        type: "event",
        name: "RewardClaimed",
        inputs: [
            { name: "user", type: "address", indexed: true },
            { name: "token", type: "address", indexed: true },
            { name: "amount", type: "uint256", indexed: false },
        ],
    },
    {
        type: "event",
        name: "RevenueDistributed",
        inputs: [
            { name: "token", type: "address", indexed: true },
            { name: "amount", type: "uint256", indexed: false },
        ],
    },
];
function vaultIdFromIndex(index) {
    const v = config_1.VAULTS.find((v) => BigInt(v.vaultIndex) === index);
    return v?.id ?? null;
}
async function indexVaultEvents() {
    const client = (0, chain_1.getPublicClient)();
    const cursor = await (0, gcs_1.readJson)(CURSOR_PATH);
    const minStart = Math.min(...config_1.VAULTS.map((v) => v.startBlock));
    const fromBlock = cursor ? cursor.lastBlock + 1 : minStart;
    const currentBlock = Number(await client.getBlockNumber());
    if (fromBlock > currentBlock)
        return;
    const toBlock = currentBlock;
    console.log(`Indexing vault events from block ${fromBlock} to ${toBlock}...`);
    // Collect all events in memory during chunk loop; one read+write per vaultId after the loop (no per-event GCS).
    const eventsByVault = new Map();
    let cursorFrom = fromBlock;
    let chunkSize = CHUNK_SIZE;
    while (cursorFrom <= toBlock) {
        const chunkTo = Math.min(cursorFrom + chunkSize - 1, toBlock);
        try {
            const depositLogs = await client.getContractEvents({
                address: config_1.CONTRACTS.vaultEventEmitter,
                abi: VAULT_EVENT_EMITTER_ABI,
                eventName: "DepositAssetToVault",
                fromBlock: BigInt(cursorFrom),
                toBlock: BigInt(chunkTo),
            });
            const withdrawalLogs = await client.getContractEvents({
                address: config_1.CONTRACTS.vaultEventEmitter,
                abi: VAULT_EVENT_EMITTER_ABI,
                eventName: "WithdrawalAssetFromVault",
                fromBlock: BigInt(cursorFrom),
                toBlock: BigInt(chunkTo),
            });
            for (const log of depositLogs) {
                const vaultId = vaultIdFromIndex(log.args.vaultId);
                if (!vaultId)
                    continue;
                const event = {
                    type: "DepositAssetToVault",
                    vaultId,
                    depositor: log.args.depositor.toLowerCase(),
                    amount: log.args.amount.toString(),
                    sharesMinted: log.args.sharesMinted.toString(),
                    blockNumber: Number(log.blockNumber),
                };
                const arr = eventsByVault.get(vaultId) ?? [];
                arr.push(event);
                eventsByVault.set(vaultId, arr);
            }
            for (const log of withdrawalLogs) {
                const vaultId = vaultIdFromIndex(log.args.vaultId);
                if (!vaultId)
                    continue;
                const event = {
                    type: "WithdrawalAssetFromVault",
                    vaultId,
                    withdrawer: log.args.withdrawer.toLowerCase(),
                    amount: log.args.amount.toString(),
                    sharesBurned: log.args.sharesBurned.toString(),
                    blockNumber: Number(log.blockNumber),
                };
                const arr = eventsByVault.get(vaultId) ?? [];
                arr.push(event);
                eventsByVault.set(vaultId, arr);
            }
            cursorFrom = chunkTo + 1;
            chunkSize = CHUNK_SIZE; // reset after success
        }
        catch (err) {
            if (String(err).includes("range") || String(err).includes("block")) {
                chunkSize = Math.max(500, Math.floor(chunkSize / 2));
                continue; // retry same range with smaller chunk
            }
            throw err;
        }
    }
    for (const [vaultId, events] of eventsByVault) {
        if (events.length === 0)
            continue;
        const path = `global/events_${vaultId}.json`;
        const existing = await (0, gcs_1.readJson)(path);
        const arr = Array.isArray(existing) ? [...existing, ...events] : [...events];
        const trimmed = arr.length > 500000 ? arr.slice(-500000) : arr;
        await (0, gcs_1.writeJson)(path, trimmed);
    }
    await (0, gcs_1.writeJson)(CURSOR_PATH, { lastBlock: toBlock });
}
async function indexStakingEvents() {
    const client = (0, chain_1.getPublicClient)();
    const cursor = await (0, gcs_1.readJson)("global/staking_events_cursor.json");
    const fromBlock = cursor ? cursor.lastBlock + 1 : 5080000; // vault start block, avoid scanning from 0
    const currentBlock = Number(await client.getBlockNumber());
    if (fromBlock > currentBlock)
        return;
    const toBlock = currentBlock;
    console.log(`Indexing staking events from block ${fromBlock} to ${toBlock}...`);
    const stakingMeta = await (0, gcs_1.readJson)("staking/meta.json");
    let totalRevenueDistributed = typeof stakingMeta?.rewardsDistributed === "number"
        ? stakingMeta.rewardsDistributed
        : 0;
    // Collect all claimed events in memory during chunk loop; one read+write per user after the loop (no per-event GCS).
    const claimedByUser = new Map();
    let cursorFrom = fromBlock;
    let runRevenue = 0;
    while (cursorFrom <= toBlock) {
        const chunkTo = Math.min(cursorFrom + CHUNK_SIZE - 1, toBlock);
        try {
            const revenueLogs = await client.getContractEvents({
                address: config_1.CONTRACTS.winrStakingV2,
                abi: STAKING_ABI_EVENTS,
                eventName: "RevenueDistributed",
                fromBlock: BigInt(cursorFrom),
                toBlock: BigInt(chunkTo),
            });
            for (const log of revenueLogs) {
                const amount = Number(log.args.amount ?? 0n) / 1e18;
                runRevenue += amount;
            }
            const claimedLogs = await client.getContractEvents({
                address: config_1.CONTRACTS.winrStakingV2,
                abi: STAKING_ABI_EVENTS,
                eventName: "RewardClaimed",
                fromBlock: BigInt(cursorFrom),
                toBlock: BigInt(chunkTo),
            });
            for (const log of claimedLogs) {
                const args = log.args;
                const user = (args.user ?? "").toLowerCase();
                const token = (args.token ?? "");
                const amount = (args.amount ?? 0n).toString();
                const event = {
                    type: "RewardClaimed",
                    user,
                    token,
                    amount,
                    blockNumber: Number(log.blockNumber),
                };
                const arr = claimedByUser.get(user) ?? [];
                arr.push(event);
                claimedByUser.set(user, arr);
            }
            cursorFrom = chunkTo + 1;
        }
        catch (err) {
            if (String(err).includes("range") || String(err).includes("block")) {
                continue;
            }
            throw err;
        }
    }
    for (const [user, events] of claimedByUser) {
        if (events.length === 0)
            continue;
        const path = `users/${user}/rewards_events.json`;
        const existing = await (0, gcs_1.readJson)(path);
        const arr = Array.isArray(existing) ? [...existing, ...events] : [...events];
        const trimmed = arr.length > 10000 ? arr.slice(-10000) : arr;
        await (0, gcs_1.writeJson)(path, trimmed);
    }
    await (0, gcs_1.writeJson)("global/staking_events_cursor.json", { lastBlock: toBlock });
    totalRevenueDistributed += runRevenue;
    const stakingMetaPath = "staking/meta.json";
    const existing = await (0, gcs_1.readJson)(stakingMetaPath);
    if (existing) {
        existing.rewardsDistributed = totalRevenueDistributed;
        existing.timestamp = Math.floor(Date.now() / 1000);
        await (0, gcs_1.writeJson)(stakingMetaPath, existing);
    }
}
async function runEventsIndexer() {
    await indexVaultEvents();
    await indexStakingEvents();
}
//# sourceMappingURL=events.js.map