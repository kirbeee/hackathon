"use client";

import { address, lamports } from "@solana/kit";
import { getTransferSolInstruction } from "@solana-program/system";
import { useClient } from "@solana/react";
import { useConnectedWallet } from "@solana/kit-plugin-wallet/react";
import type { AppClient } from "@/app/providers";
import { SOLANA_TREASURY_ADDRESS } from "@/lib/solana";

/**
 * Sends a real Devnet SOL payment from the connected wallet to the
 * platform's demo treasury address, returning the transaction signature.
 * Callers pass that signature to fundraising-api so it can be recorded
 * alongside the (still mock) campaign data.
 */
export function useTreasuryPayment() {
  const client = useClient<AppClient>();
  const connected = useConnectedWallet(client);

  async function pay(amountLamports: number): Promise<string> {
    if (!connected?.signer) {
      throw new Error("請先連接錢包才能完成這筆交易。");
    }
    const transfer = getTransferSolInstruction({
      source: connected.signer,
      destination: address(SOLANA_TREASURY_ADDRESS),
      amount: lamports(BigInt(amountLamports)),
    });
    const result = await client.sendTransaction([transfer]);
    return result.context.signature;
  }

  return { pay, connected };
}
