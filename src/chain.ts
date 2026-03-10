import { createPublicClient, http, type PublicClient } from "viem";
import { CHAIN_ID, RPC_URL } from "./config";

export function getPublicClient(): PublicClient {
  return createPublicClient({
    chain: {
      id: CHAIN_ID,
      name: "Rise",
      nativeCurrency: { name: "RISE", symbol: "RISE", decimals: 18 },
      rpcUrls: { default: { http: [RPC_URL] } },
    },
    transport: http(RPC_URL),
  });
}
