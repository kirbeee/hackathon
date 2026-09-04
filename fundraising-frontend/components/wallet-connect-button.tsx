"use client";

import { useState } from "react";
import {
  useConnect,
  useConnectedWallet,
  useDisconnect,
  useWallets,
  useWalletStatus,
} from "@solana/kit-plugin-wallet/react";
import { useClient } from "@solana/react";
import type { AppClient } from "@/app/providers";

function truncate(address: string) {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

export function WalletConnectButton() {
  const client = useClient<AppClient>();
  const status = useWalletStatus(client);
  const wallets = useWallets(client);
  const connected = useConnectedWallet(client);
  const connect = useConnect(client);
  const disconnect = useDisconnect(client);
  const [open, setOpen] = useState(false);

  const address = connected ? String(connected.account.address) : null;
  const error = connect.error ?? disconnect.error;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground transition hover:border-brand/50"
      >
        {address ? <span className="font-mono">{truncate(address)}</span> : <span>連接錢包</span>}
        <span className="text-xs text-foreground/40">{open ? "▲" : "▼"}</span>
      </button>

      {open ? (
        <div className="absolute right-0 z-10 mt-2 w-64 rounded-xl border border-border bg-surface p-3 shadow-lg">
          {connected ? (
            <div className="space-y-3">
              <div className="rounded-lg bg-surface-muted px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-foreground/50">
                  已連接
                </p>
                <p className="font-mono text-sm text-foreground" title={address ?? ""}>
                  {address ? truncate(address) : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  void disconnect.dispatch();
                  setOpen(false);
                }}
                className="w-full rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:border-brand/50"
              >
                中斷連接
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground/50">
                Wallet Standard
              </p>
              <div className="space-y-1.5">
                {wallets.length === 0 ? (
                  <p className="text-sm text-foreground/50">未偵測到瀏覽器錢包。</p>
                ) : (
                  wallets.map((wallet) => (
                    <button
                      key={wallet.name}
                      type="button"
                      disabled={connect.isRunning || status === "pending"}
                      onClick={() => {
                        void connect.dispatch(wallet);
                        setOpen(false);
                      }}
                      className="flex w-full items-center justify-between rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:border-brand/50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span>{wallet.name}</span>
                      <span className="text-xs text-brand">連接</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
          {error ? (
            <p className="mt-2 text-sm font-semibold text-danger">
              {error instanceof Error ? error.message : String(error)}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
