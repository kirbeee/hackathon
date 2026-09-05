"use client";

import { address } from "@solana/kit";
import { useConnectedWallet } from "@solana/kit-plugin-wallet/react";
import { useClient, useTrackedData } from "@solana/react";
import { useMemo } from "react";
import type { AppClient } from "@/app/providers";
import { formatSol } from "@/lib/format";

export function useWalletBalance() {
  const client = useClient<AppClient>();
  const connected = useConnectedWallet(client);
  const walletAddress = connected ? String(connected.account.address) : null;

  const spec = useMemo(() => {
    if (!walletAddress) return null;
    const addr = address(walletAddress);
    return {
      initialValueSource: client.rpc.getBalance(addr),
      initialValueMapper: (lamports: bigint) => lamports,
      streamSource: client.rpcSubscriptions.accountNotifications(addr),
      streamValueMapper: ({ lamports }: { lamports: bigint }) => lamports,
    };
  }, [client, walletAddress]);

  const { data, error, refresh, status } = useTrackedData(spec);

  return {
    connected: !!connected,
    address: walletAddress,
    lamports: data?.value,
    slot: data?.context.slot,
    error,
    refresh,
    status: walletAddress ? status : ("disabled" as const),
  };
}

function balanceLabel(
  status: ReturnType<typeof useWalletBalance>["status"],
  lamports: bigint | undefined,
  error: unknown
): string {
  if (status === "disabled") return "尚未連接";
  if (status === "loading" && lamports === undefined) return "讀取中…";
  if (status === "error" && lamports === undefined) {
    return error instanceof Error ? error.message : "無法讀取餘額";
  }
  if (lamports !== undefined) return formatSol(lamports);
  return "讀取中…";
}

export function WalletStatusPanel({ compact = false }: { compact?: boolean }) {
  const { connected, address, lamports, slot, error, refresh, status } = useWalletBalance();

  if (!connected || !address) {
    return (
      <div className="rounded-lg bg-surface-muted px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-foreground/50">
          錢包狀態
        </p>
        <p className="mt-1 text-sm text-foreground/60">請先連接錢包以查看餘額。</p>
      </div>
    );
  }

  return (
    <div className={`rounded-lg bg-surface-muted ${compact ? "px-3 py-2" : "px-4 py-3"}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-foreground/50">
          錢包狀態
        </p>
        <button
          type="button"
          onClick={() => refresh()}
          disabled={status === "loading"}
          className="text-xs font-medium text-brand transition hover:text-brand-strong disabled:opacity-50"
        >
          重新整理
        </button>
      </div>
      <p className="mt-1 font-mono text-sm text-foreground" title={address}>
        {address.slice(0, 4)}…{address.slice(-4)}
      </p>
      <p className="mt-2 text-lg font-bold text-brand-strong">
        {balanceLabel(status, lamports, error)}
      </p>
      {!compact && slot !== undefined && (
        <p className="mt-1 text-xs text-foreground/40">區塊高度 {slot.toString()}</p>
      )}
      {status === "error" && lamports !== undefined && (
        <p className="mt-1 text-xs text-danger">更新失敗，顯示的是上次讀取的餘額。</p>
      )}
    </div>
  );
}

export function WalletBalanceBadge() {
  const { connected, lamports, status, error } = useWalletBalance();

  if (!connected) return null;

  return (
    <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand-strong">
      {balanceLabel(status, lamports, error)}
    </span>
  );
}
