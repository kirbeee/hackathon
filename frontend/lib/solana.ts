// Devnet-only demo treasury — see fundraising-api/.devnet-keys/treasury.json
// (gitignored). Must match fundraising-api's SOLANA_TREASURY_ADDRESS.
export const SOLANA_TREASURY_ADDRESS =
  process.env.NEXT_PUBLIC_SOLANA_TREASURY_ADDRESS ??
  "9jH94MJzG2HPmDhvra5xwD2Ens6QNtQtvJ21m4pVpQxw";

// Demo-only fixed rate: every reward-tier backing or investment share buy
// sends this many lamports (0.001 SOL) per unit, regardless of its
// TWDT-denominated price — a stand-in payment, not a real TWDT/SOL rate.
export const LAMPORTS_PER_SHARE_UNIT = 1_000_000;

// Phantom (and other Wallet Standard wallets) only advertise the network the
// user currently has selected in their wallet -- a client built for one
// fixed chain simply won't see wallets set to the other. To support both,
// the network is switchable at runtime (see app/providers.tsx) instead of
// hardcoded; this just resolves which chain/RPC pair a given choice means.
export const SOLANA_NETWORKS = ["devnet", "testnet"] as const;
export type SolanaNetwork = (typeof SOLANA_NETWORKS)[number];

function isSolanaNetwork(value: string | undefined): value is SolanaNetwork {
  return value === "devnet" || value === "testnet";
}

const envDefaultNetwork = process.env.NEXT_PUBLIC_SOLANA_NETWORK;
export const DEFAULT_SOLANA_NETWORK: SolanaNetwork = isSolanaNetwork(envDefaultNetwork)
  ? envDefaultNetwork
  : "devnet";

export function solanaChainFor(network: SolanaNetwork): `solana:${SolanaNetwork}` {
  return `solana:${network}`;
}

export function solanaRpcUrlFor(network: SolanaNetwork): string {
  return network === "testnet"
    ? (process.env.NEXT_PUBLIC_SOLANA_TESTNET_RPC_URL ?? "https://api.testnet.solana.com")
    : (process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com");
}
