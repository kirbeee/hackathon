"use client";

import { address, lamports } from "@solana/kit";
import { getTransferSolInstruction } from "@solana-program/system";
import { useClient } from "@solana/react";
import { useConnectedWallet } from "@solana/kit-plugin-wallet/react";
import { useState } from "react";
import type { AppClient } from "../providers";

const LAMPORTS_PER_SOL = 1_000_000_000n;

function parseLamports(input: string) {
  const sol = Number(input);
  if (!Number.isFinite(sol) || sol <= 0) return null;
  const whole = Math.trunc(sol);
  const frac = sol - whole;
  const amount =
    BigInt(whole) * LAMPORTS_PER_SOL +
    BigInt(Math.round(frac * Number(LAMPORTS_PER_SOL)));
  return amount > 0n ? amount : null;
}

export function SolTransferCard() {
  const client = useClient<AppClient>();
  const connected = useConnectedWallet(client);
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("0.001");
  const [signature, setSignature] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const statusText = connected ? "Wallet connected" : "Wallet disconnected";

  async function sendSol() {
    if (!connected?.signer) {
      setError("Connect a wallet first.");
      return;
    }
    const amountLamports = parseLamports(amount);
    if (!amountLamports) {
      setError("Enter an amount greater than 0.");
      return;
    }
    const dest = destination.trim();
    if (!dest) {
      setError("Enter a destination address.");
      return;
    }
    setError(null);
    setIsSending(true);
    try {
      const transfer = getTransferSolInstruction({
        source: connected.signer,
        destination: address(dest),
        amount: lamports(amountLamports)
      });
      const result = await client.sendTransaction([transfer]);
      setSignature(result.context.signature);
      setAmount("0.001");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send SOL");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
          SOL Transfer
        </p>
        <h2 className="text-xl font-semibold text-slate-900">
          Send SOL with the connected wallet
        </h2>
        <p className="text-sm text-slate-600">
          Uses the connected signer as the fee payer and authorizes the
          transfer.
        </p>
      </div>
      <div className="space-y-2">
        <label
          className="text-sm font-semibold text-slate-800"
          htmlFor="destination"
        >
          Destination address
        </label>
        <input
          id="destination"
          value={destination}
          onChange={(event) => setDestination(event.target.value)}
          placeholder="Destination wallet address"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      </div>
      <div className="space-y-2">
        <label
          className="text-sm font-semibold text-slate-800"
          htmlFor="amount"
        >
          Amount (SOL)
        </label>
        <input
          id="amount"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          type="number"
          min="0"
          step="0.001"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">Status: {statusText}</p>
        <button
          type="button"
          onClick={() => void sendSol()}
          disabled={!connected?.signer || isSending}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSending ? "Sending…" : "Send SOL"}
        </button>
      </div>
      {signature ? (
        <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          <p className="font-semibold">Transfer sent</p>
          <a
            className="text-sky-700 underline"
            href={`https://explorer.solana.com/tx/${signature}?cluster=devnet`}
            target="_blank"
            rel="noreferrer"
          >
            View on Solana Explorer →
          </a>
        </div>
      ) : null}
      {error ? (
        <p className="text-sm font-semibold text-red-600">{error}</p>
      ) : null}
    </section>
  );
}