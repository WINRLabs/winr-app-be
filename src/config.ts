export interface VaultConfig {
  id: string;
  vaultIndex: number;
  vaultAddress: string;
  liquidityManager: string;
  lpToken: string;
  bankrollToken: string;
  bankrollIdentifier: string;
  label: string;
  startBlock: number;
  startTimestamp: number;
}

export const VAULTS: VaultConfig[] = [
  {
    id: "winr-v2",
    vaultIndex: 2,
    vaultAddress: "0x9152b21b1F8Ba8B42173b08b332e8D706eFdc406",
    liquidityManager: "0xF32DD682fa743e0B820C8786B63FF3CA2269d3Dc",
    lpToken: "0xa787D4681AE14ab55EfDBE932490fe33255BaB13",
    bankrollToken: "0x149EC2d1900d0fd8a55610690Bbf21d8A35d4DCc",
    bankrollIdentifier: "0x0000000000000000000000000000000000000002",
    label: "WINR Bankroll Vault",
    startBlock: 5080000,
    startTimestamp: 1741161600,
  },
  // Add future vaults here
];

export const CONTRACTS = {
  vaultAdapter: "0xa83A22D264603322Cf6E21914146d7E76EAC85d0" as const,
  vaultEventEmitter: "0xE9d91B77cc90D6bf39e7CA2C28A3F67f14796147" as const,
  rakeCollection: "0x18800a7D9FF90A299E979B3BAE747803a8C44b3D" as const,
  winrStakingV2: "0x9bD5255e0E631aa8D823FA73804339D6baC4AFbA" as const,
  winrToken: "0x149EC2d1900d0fd8a55610690Bbf21d8A35d4DCc" as const,
  bankrollFactory: "0x3D0cbE380886C91cC24D455CA5f4e2965B3E1B03" as const,
};

export const RPC_URL =
  process.env.RPC_URL ||
  "https://rpc.risechain.com/?apikey=Justbet-A9Qk7LqwEr";
export const GCS_BUCKET =
  process.env.GCS_BUCKET || "slot-optimizer-results-487314";
export const GCS_PREFIX = "analytics";

export const CHAIN_ID = 4153;

/** DexScreener token address for WINR price (spec) */
export const WINR_DEXSCREENER_TOKEN =
  "0xD77B108d4f6cefaa0Cae9506A934e825BEccA46E";
