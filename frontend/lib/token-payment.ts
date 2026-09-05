"use client";

import { address, type TransactionSigner } from "@solana/kit";
import {
  TOKEN_PROGRAM_ADDRESS,
  fetchMaybeToken,
  fetchMint,
  findAssociatedTokenPda,
  getCreateAssociatedTokenIdempotentInstructionAsync,
  getTransferCheckedInstruction,
} from "@solana-program/token";
import type { AppClient } from "@/app/providers";
import type { PaymentCurrency } from "./types";

export type { PaymentCurrency } from "./types";

const TREASURY_ADDRESS =
  process.env.NEXT_PUBLIC_PAYMENT_TREASURY_ADDRESS ??
  "9pvghMD6tK7eUb8MQrue6LZ2t1NdTkUQMuQFgVgDGPi1";

function configuredValue(value: string | undefined, label: string): string {
  const trimmed = value?.trim();
  if (!trimmed || trimmed.toLowerCase() === "none") {
    throw new Error(`${label} 尚未設定，請先更新 .env.local。`);
  }
  return trimmed;
}

function mintFor(currency: PaymentCurrency): string {
  return configuredValue(
    currency === "USDC"
      ? process.env.NEXT_PUBLIC_USDC_MINT_ADDRESS
      : process.env.NEXT_PUBLIC_TWD_MINT_ADDRESS,
    `${currency} Mint Address`
  );
}

/** Converts a positive decimal string to the mint's integer base units without float rounding. */
function parseTokenAmount(value: string, decimals: number): bigint {
  const normalized = value.trim();
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) {
    throw new Error("請輸入有效的付款金額。");
  }

  const [whole, fraction = ""] = normalized.split(".");
  if (fraction.length > decimals) {
    throw new Error(`此 Token 最多支援 ${decimals} 位小數。`);
  }

  const units = BigInt(whole) * 10n ** BigInt(decimals) + BigInt(fraction.padEnd(decimals, "0") || "0");
  if (units <= 0n) {
    throw new Error("付款金額必須大於 0。");
  }
  return units;
}

export async function sendTokenPayment({
  client,
  signer,
  currency,
  amount,
}: {
  client: AppClient;
  signer: TransactionSigner;
  currency: PaymentCurrency;
  amount: string;
}): Promise<string> {
  const mint = address(mintFor(currency));
  const treasury = address(configuredValue(TREASURY_ADDRESS, "平台收款地址"));
  const owner = signer.address;

  if (String(owner) === String(treasury)) {
    throw new Error("付款錢包不可與平台收款地址相同。");
  }

  const mintAccount = await fetchMint(client.rpc, mint);
  const baseUnits = parseTokenAmount(amount, mintAccount.data.decimals);
  const [source] = await findAssociatedTokenPda({
    owner,
    mint,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  });
  const [destination] = await findAssociatedTokenPda({
    owner: treasury,
    mint,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  });

  const sourceAccount = await fetchMaybeToken(client.rpc, source);
  if (!sourceAccount.exists) {
    throw new Error(`連接的錢包沒有 ${currency} Token Account。`);
  }
  if (sourceAccount.data.amount < baseUnits) {
    throw new Error(`${currency} 餘額不足。`);
  }

  const createDestination = await getCreateAssociatedTokenIdempotentInstructionAsync({
    payer: signer,
    owner: treasury,
    mint,
    ata: destination,
  });
  const transfer = getTransferCheckedInstruction({
    source,
    mint,
    destination,
    authority: signer,
    amount: baseUnits,
    decimals: mintAccount.data.decimals,
  });

  const result = await client.sendTransaction([createDestination, transfer]);
  return result.context.signature;
}
