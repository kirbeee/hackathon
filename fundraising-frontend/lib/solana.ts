// Devnet-only demo treasury — see fundraising-api/.devnet-keys/treasury.json
// (gitignored). Must match fundraising-api's SOLANA_TREASURY_ADDRESS.
export const SOLANA_TREASURY_ADDRESS =
  process.env.NEXT_PUBLIC_SOLANA_TREASURY_ADDRESS ??
  "9jH94MJzG2HPmDhvra5xwD2Ens6QNtQtvJ21m4pVpQxw";

// Demo-only fixed rate: every reward-tier backing or investment share buy
// sends this many lamports (0.001 SOL) per unit, regardless of its
// TWDT-denominated price — a stand-in payment, not a real TWDT/SOL rate.
export const LAMPORTS_PER_SHARE_UNIT = 1_000_000;
