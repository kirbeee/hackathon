"use client";

import { useEffect, useState } from "react";
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

  // The wallet-standard adapter can resolve an already-connected wallet from
  // storage before hydration finishes, which would render an address the
  // server never saw. Stay in the server's "disconnected" shape for the
  // first client render, then switch once mounted.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const address = mounted && connected ? String(connected.account.address) : null;
  const error = connect.error ?? disconnect.error;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-brand/50 sm:gap-2 sm:px-4 sm:py-2 sm:text-sm"
      >
        {address ? <span className="font-mono">{truncate(address)}</span> : <span>連接錢包</span>}
        <span className="text-xs text-foreground/40">{open ? "▲" : "▼"}</span>
      </button>

      {open ? (
        <div className="absolute right-0 z-10 mt-2 w-64 rounded-lg border border-border bg-surface p-3 shadow-md">
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
                  <p className="text-sm text-foreground/50">
                    還沒偵測到瀏覽器錢包，安裝一個 Wallet Standard 相容的錢包就能開始體驗。
                  </p>
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
