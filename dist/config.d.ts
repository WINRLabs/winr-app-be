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
export declare const VAULTS: VaultConfig[];
export declare const CONTRACTS: {
    vaultAdapter: "0xa83A22D264603322Cf6E21914146d7E76EAC85d0";
    vaultEventEmitter: "0xE9d91B77cc90D6bf39e7CA2C28A3F67f14796147";
    rakeCollection: "0x18800a7D9FF90A299E979B3BAE747803a8C44b3D";
    winrStakingV2: "0x9bD5255e0E631aa8D823FA73804339D6baC4AFbA";
    winrToken: "0x149EC2d1900d0fd8a55610690Bbf21d8A35d4DCc";
    bankrollFactory: "0x3D0cbE380886C91cC24D455CA5f4e2965B3E1B03";
};
export declare const RPC_URL: string;
export declare const GCS_BUCKET: string;
export declare const GCS_PREFIX = "analytics";
export declare const CHAIN_ID = 4153;
/** DexScreener token address for WINR price (spec) */
export declare const WINR_DEXSCREENER_TOKEN = "0xD77B108d4f6cefaa0Cae9506A934e825BEccA46E";
//# sourceMappingURL=config.d.ts.map